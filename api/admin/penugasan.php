<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: MENGELOLA SIAPA YANG BEKERJA (PENUGASAN)
// ==========================================================
require_once __DIR__ . '/../config/database.php';

ensurePekerjaanPenugasanSchema($pdo);

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

// Formula SQL Durasi Kerja (Mendukung Shift Malam - F-02)
$sqlDurasi = "
    CASE 
        WHEN a.jam_pulang IS NOT NULL AND a.jam_pulang >= a.jam_masuk 
            THEN (TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) / 3600)
        WHEN a.jam_pulang IS NOT NULL AND a.jam_pulang < a.jam_masuk 
            THEN ((TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) + 86400) / 3600)
        ELSE 0 
    END
";

if ($method === 'GET') {
    $id_penugasan = isset($_GET['id_penugasan']) ? intval($_GET['id_penugasan']) : 0;
    if ($id_penugasan > 0) {
        $rows = fetchPenugasanRows($pdo, "WHERE pn.id_penugasan = ?", [$id_penugasan]);
        if (empty($rows)) {
            jsonResponse(false, "Data penugasan tidak ditemukan", null, 404);
        }
        jsonResponse(true, "Detail penugasan berhasil dimuat (Admin)", $rows[0]);
    }

    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    if ($id_pekerjaan <= 0) {
        $rows = fetchPenugasanRows($pdo);
        jsonResponse(true, "Daftar seluruh penugasan berhasil dimuat (Admin)", $rows);
    }

    // 1. Hitung total jam disetujui pada pekerjaan ini
    $stmtTot = $pdo->prepare("
        SELECT IFNULL(SUM($sqlDurasi), 0) AS total_jam
        FROM absensi a
        WHERE a.id_pekerjaan = ? AND a.status_verifikasi = 'disetujui' AND a.jam_pulang IS NOT NULL
    ");
    $stmtTot->execute([$id_pekerjaan]);
    $totalJamProyek = floatval($stmtTot->fetch()['total_jam']);

    // 2. Ambil daftar pekerja yang ditugaskan ke pekerjaan ini beserta jam & kontribusinya
    $stmt = $pdo->prepare("
        SELECT pn.id_penugasan, pn.id_pekerjaan, pn.id_karyawan, pn.peran_tugas,
               k.nama, k.jabatan, k.tarif_per_jam,
               IFNULL(SUM($sqlDurasi), 0) AS total_jam_pekerja
        FROM penugasan pn
        JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
        LEFT JOIN absensi a ON a.id_pekerjaan = pn.id_pekerjaan 
                           AND a.id_karyawan = pn.id_karyawan 
                           AND a.status_verifikasi = 'disetujui'
                           AND a.jam_pulang IS NOT NULL
        WHERE pn.id_pekerjaan = ?
        GROUP BY pn.id_penugasan, pn.id_pekerjaan, pn.id_karyawan, pn.peran_tugas, k.nama, k.jabatan, k.tarif_per_jam
        ORDER BY pn.id_penugasan DESC
    ");
    $stmt->execute([$id_pekerjaan]);
    $pekerjaList = $stmt->fetchAll();

    foreach ($pekerjaList as &$p) {
        $jamPekerja = floatval($p['total_jam_pekerja']);
        $p['total_jam_pekerja'] = round($jamPekerja, 2);
        $p['persentase_kontribusi'] = ($totalJamProyek > 0) ? round(($jamPekerja / $totalJamProyek) * 100, 1) : 0;
    }

    jsonResponse(true, "Daftar pekerja pada proyek #$id_pekerjaan berhasil dimuat (Admin)", [
        "total_jam_proyek" => round($totalJamProyek, 2),
        "pekerja" => $pekerjaList
    ]);

} elseif ($method === 'POST') {
    // Admin menugaskan pekerja ke pekerjaan
    $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
    $id_karyawan = intval($body['id_karyawan'] ?? 0);
    $peran_tugas = htmlspecialchars(trim($body['peran_tugas'] ?? 'Anggota'), ENT_QUOTES, 'UTF-8');

    if ($id_pekerjaan <= 0 || $id_karyawan <= 0) {
        jsonResponse(false, "Pekerjaan dan Karyawan wajib dipilih", null, 400);
    }

    // Alur Alternatif A1: Cek apakah karyawan ada di sistem
    $stmtCekKaryawan = $pdo->prepare("SELECT id_karyawan FROM karyawan WHERE id_karyawan = ?");
    $stmtCekKaryawan->execute([$id_karyawan]);
    if (!$stmtCekKaryawan->fetch()) {
        jsonResponse(false, "Pekerja tidak ditemukan dalam sistem", null, 404);
    }

    // Alur Alternatif A2: Cek apakah pekerja sudah ditugaskan pada pekerjaan ini
    $stmtCek = $pdo->prepare("SELECT id_penugasan FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan = ?");
    $stmtCek->execute([$id_pekerjaan, $id_karyawan]);
    if ($stmtCek->fetch()) {
        jsonResponse(false, "Pekerja sudah ada dalam pekerjaan ini.", null, 400);
    }

    $stmt = $pdo->prepare("INSERT INTO penugasan (id_pekerjaan, id_karyawan, peran_tugas, jenis_penugasan) VALUES (?, ?, ?, 'admin')");
    $stmt->execute([$id_pekerjaan, $id_karyawan, $peran_tugas]);
    $newId = intval($pdo->lastInsertId());

    jsonResponse(true, "Pekerja berhasil ditugaskan pada pekerjaan ini (Admin)", [
        "id_penugasan" => $newId,
        "id_pekerjaan" => $id_pekerjaan,
        "id_karyawan" => $id_karyawan,
        "peran_tugas" => $peran_tugas,
        "jenis_penugasan" => "admin",
        "tanggal_penugasan" => getJakartaTodayDate(),
    ], 201);

} elseif ($method === 'PUT') {
    $id_penugasan = intval($_GET['id_penugasan'] ?? $body['id_penugasan'] ?? 0);
    $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
    $id_karyawan = intval($body['id_karyawan'] ?? 0);
    if ($id_penugasan <= 0 || $id_pekerjaan <= 0 || $id_karyawan <= 0) {
        jsonResponse(false, "Parameter penugasan tidak valid", null, 400);
    }

    $stmt = $pdo->prepare("UPDATE penugasan SET id_pekerjaan = ?, id_karyawan = ? WHERE id_penugasan = ?");
    $stmt->execute([$id_pekerjaan, $id_karyawan, $id_penugasan]);
    $rows = fetchPenugasanRows($pdo, "WHERE pn.id_penugasan = ?", [$id_penugasan]);
    jsonResponse(true, "Data penugasan berhasil diperbarui (Admin)", $rows[0] ?? null);

} elseif ($method === 'DELETE') {
    // Hapus penugasan pekerja dari pekerjaan
    $id_penugasan = intval($_GET['id_penugasan'] ?? $body['id_penugasan'] ?? 0);
    if ($id_penugasan <= 0) {
        jsonResponse(false, "ID penugasan tidak valid", null, 400);
    }

    $stmt = $pdo->prepare("DELETE FROM penugasan WHERE id_penugasan = ?");
    $stmt->execute([$id_penugasan]);

    jsonResponse(true, "Penugasan pekerja berhasil dihapus (Admin)");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

