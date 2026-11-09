<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: MANAJEMEN PEKERJAAN / PROYEK (CRUD)
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

// Formula SQL Durasi Kerja (Mendukung Shift Malam - F-02)
$sqlDurasi = "
    CASE 
        WHEN a.jam_pulang IS NOT NULL AND a.jam_pulang >= a.jam_masuk 
            THEN ROUND(TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) / 3600, 2)
        WHEN a.jam_pulang IS NOT NULL AND a.jam_pulang < a.jam_masuk 
            THEN ROUND((TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) + 86400) / 3600, 2)
        ELSE 0 
    END
";

if ($method === 'GET') {
    // Admin melihat semua pekerjaan
    $sql = "
        SELECT p.*,
               (SELECT COUNT(DISTINCT pn.id_karyawan) FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan) AS total_pekerja,
               (SELECT IFNULL(SUM($sqlDurasi), 0) FROM absensi a WHERE a.id_pekerjaan = p.id_pekerjaan AND a.status_verifikasi = 'disetujui' AND a.jam_pulang IS NOT NULL) AS total_jam_kerja,
               (SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran pg WHERE pg.id_pekerjaan = p.id_pekerjaan AND pg.status_verifikasi = 'disetujui') AS total_pengeluaran
        FROM pekerjaan p
        ORDER BY p.id_pekerjaan DESC
    ";
    $stmt = $pdo->query($sql);
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar seluruh pekerjaan berhasil dimuat (Admin)", $data);

} elseif ($method === 'POST') {
    // Tambah Pekerjaan Baru
    $nama = htmlspecialchars(trim($body['nama_pekerjaan'] ?? ''), ENT_QUOTES, 'UTF-8');
    $deskripsi = htmlspecialchars(trim($body['deskripsi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $lokasi = htmlspecialchars(trim($body['lokasi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $titik_lokasi = trim($body['titik_lokasi'] ?? '');
    $tanggal_mulai = !empty($body['tanggal_mulai']) ? $body['tanggal_mulai'] : null;
    $target_selesai = !empty($body['target_selesai']) ? $body['target_selesai'] : null;
    $status = $body['status'] ?? 'belum_mulai';

    if (empty($nama)) {
        jsonResponse(false, "Nama pekerjaan wajib diisi", null, 400);
    }

    $stmt = $pdo->prepare("
        INSERT INTO pekerjaan (nama_pekerjaan, deskripsi, lokasi, titik_lokasi, tanggal_mulai, target_selesai, status)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$nama, $deskripsi, $lokasi, $titik_lokasi, $tanggal_mulai, $target_selesai, $status]);

    jsonResponse(true, "Pekerjaan '$nama' berhasil ditambahkan oleh Admin!", [
        "id_pekerjaan" => $pdo->lastInsertId()
    ], 201);

} elseif ($method === 'PUT') {
    // Ubah Data Pekerjaan
    $id = intval($body['id_pekerjaan'] ?? 0);
    if ($id <= 0) {
        jsonResponse(false, "ID Pekerjaan tidak valid", null, 400);
    }

    $nama = htmlspecialchars(trim($body['nama_pekerjaan'] ?? ''), ENT_QUOTES, 'UTF-8');
    $deskripsi = htmlspecialchars(trim($body['deskripsi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $lokasi = htmlspecialchars(trim($body['lokasi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $titik_lokasi = trim($body['titik_lokasi'] ?? '');
    $tanggal_mulai = !empty($body['tanggal_mulai']) ? $body['tanggal_mulai'] : null;
    $target_selesai = !empty($body['target_selesai']) ? $body['target_selesai'] : null;
    $status = $body['status'] ?? 'berjalan';

    $stmt = $pdo->prepare("
        UPDATE pekerjaan 
        SET nama_pekerjaan = ?, deskripsi = ?, lokasi = ?, titik_lokasi = ?, 
            tanggal_mulai = ?, target_selesai = ?, status = ?
        WHERE id_pekerjaan = ?
    ");
    $stmt->execute([$nama, $deskripsi, $lokasi, $titik_lokasi, $tanggal_mulai, $target_selesai, $status, $id]);

    jsonResponse(true, "Data pekerjaan berhasil diperbarui (Admin)");

} elseif ($method === 'DELETE') {
    // Hapus Pekerjaan (dengan pengecekan integritas data relasi F-06)
    $id = intval($_GET['id_pekerjaan'] ?? $body['id_pekerjaan'] ?? 0);
    $force = (isset($_GET['force']) && $_GET['force'] == '1') || (!empty($body['force']));

    if ($id <= 0) {
        jsonResponse(false, "ID Pekerjaan tidak valid", null, 400);
    }

    $stmtAbs = $pdo->prepare("SELECT COUNT(*) FROM absensi WHERE id_pekerjaan = ?");
    $stmtAbs->execute([$id]);
    $totalAbsensi = (int)$stmtAbs->fetchColumn();

    $stmtPeng = $pdo->prepare("SELECT COUNT(*) FROM pengeluaran WHERE id_pekerjaan = ?");
    $stmtPeng->execute([$id]);
    $totalPengeluaran = (int)$stmtPeng->fetchColumn();

    if (($totalAbsensi > 0 || $totalPengeluaran > 0) && !$force) {
        jsonResponse(false, "Pekerjaan ini tidak dapat dihapus biasa karena memiliki riwayat $totalAbsensi sesi absensi dan $totalPengeluaran pengeluaran. Ubah status jadi 'Selesai' atau hapus paksa jika ingin membersihkannya.", [
            "has_history" => true,
            "total_absensi" => $totalAbsensi,
            "total_pengeluaran" => $totalPengeluaran
        ], 400);
    }

    // Jika force=true atau tidak ada riwayat absensi/pengeluaran
    if ($force) {
        $pdo->prepare("DELETE FROM absensi WHERE id_pekerjaan = ?")->execute([$id]);
        $pdo->prepare("DELETE FROM pengeluaran WHERE id_pekerjaan = ?")->execute([$id]);
    }
    $pdo->prepare("DELETE FROM penugasan WHERE id_pekerjaan = ?")->execute([$id]);

    $stmt = $pdo->prepare("DELETE FROM pekerjaan WHERE id_pekerjaan = ?");
    $stmt->execute([$id]);
    jsonResponse(true, "Pekerjaan berhasil dihapus dari database.");

} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

