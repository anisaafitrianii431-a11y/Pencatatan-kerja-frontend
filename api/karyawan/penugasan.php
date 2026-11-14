<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: LIHAT REKAN TIM PADA PEKERJAAN
// ==========================================================
require_once __DIR__ . '/../config/database.php';

ensurePekerjaanPenugasanSchema($pdo);

// Otorisasi: Wajib Login
$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$kId = intval($currentUser['id_karyawan'] ?? 0);

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
    $action = $_GET['action'] ?? '';

    // FITUR NOTIFIKASI TUGAS BARU: Ambil riwayat penugasan untuk karyawan ini
    if ($action === 'notifikasi') {
        $stmt = $pdo->prepare("
            SELECT pn.id_penugasan, pn.id_pekerjaan, pn.peran_tugas, pn.jenis_penugasan, pn.status_baca, pn.created_at,
                   p.nama_pekerjaan, p.deskripsi, p.lokasi, p.tanggal_mulai, p.target_selesai, p.status AS status_pekerjaan
            FROM penugasan pn
            JOIN pekerjaan p ON pn.id_pekerjaan = p.id_pekerjaan
            WHERE pn.id_karyawan = ?
            ORDER BY pn.id_penugasan DESC
        ");
        $stmt->execute([$kId]);
        $list = $stmt->fetchAll();

        $unreadCount = 0;
        foreach ($list as $item) {
            if ($item['status_baca'] === 'belum') {
                $unreadCount++;
            }
        }

        jsonResponse(true, "Daftar notifikasi penugasan karyawan berhasil dimuat", [
            "total" => count($list),
            "unread_count" => $unreadCount,
            "notifikasi" => $list
        ]);
    }

    $id_penugasan = isset($_GET['id_penugasan']) ? intval($_GET['id_penugasan']) : 0;
    if ($id_penugasan > 0) {
        $rows = fetchPenugasanRows($pdo, "WHERE pn.id_penugasan = ? AND pn.id_karyawan = ?", [$id_penugasan, $kId]);
        if (empty($rows)) {
            jsonResponse(false, "Data penugasan tidak ditemukan.", null, 404);
        }
        jsonResponse(true, "Detail penugasan berhasil dimuat (Karyawan)", $rows[0]);
    }

    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    if ($id_pekerjaan <= 0) {
        $rows = fetchPenugasanRows($pdo, "WHERE pn.id_karyawan = ?", [$kId]);
        jsonResponse(true, "Daftar penugasan saya berhasil dimuat (Karyawan)", $rows);
    }

    // RBAC: Pastikan pekerja memang ditugaskan pada pekerjaan ini
    $cek = $pdo->prepare("SELECT id_penugasan FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan = ?");
    $cek->execute([$id_pekerjaan, $kId]);
    if (!$cek->fetch()) {
        jsonResponse(false, "Anda tidak memiliki akses melihat data pekerjaan ini.", null, 403);
    }

    // 1. Total jam pekerjaan
    $stmtTot = $pdo->prepare("
        SELECT IFNULL(SUM($sqlDurasi), 0) AS total_jam
        FROM absensi a
        WHERE a.id_pekerjaan = ? AND a.status_verifikasi = 'disetujui' AND a.jam_pulang IS NOT NULL
    ");
    $stmtTot->execute([$id_pekerjaan]);
    $totalJamProyek = floatval($stmtTot->fetch()['total_jam']);

    // 2. Daftar rekan satu tim
    $stmt = $pdo->prepare("
        SELECT pn.id_penugasan, pn.id_pekerjaan, pn.id_karyawan, pn.peran_tugas,
               k.nama, k.jabatan,
               IFNULL(SUM($sqlDurasi), 0) AS total_jam_pekerja
        FROM penugasan pn
        JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
        LEFT JOIN absensi a ON a.id_pekerjaan = pn.id_pekerjaan 
                           AND a.id_karyawan = pn.id_karyawan 
                           AND a.status_verifikasi = 'disetujui'
                           AND a.jam_pulang IS NOT NULL
        WHERE pn.id_pekerjaan = ?
        GROUP BY pn.id_penugasan, pn.id_pekerjaan, pn.id_karyawan, pn.peran_tugas, k.nama, k.jabatan
        ORDER BY pn.id_penugasan DESC
    ");
    $stmt->execute([$id_pekerjaan]);
    $pekerjaList = $stmt->fetchAll();

    foreach ($pekerjaList as &$p) {
        $jamPekerja = floatval($p['total_jam_pekerja']);
        $p['total_jam_pekerja'] = round($jamPekerja, 2);
        $p['persentase_kontribusi'] = ($totalJamProyek > 0) ? round(($jamPekerja / $totalJamProyek) * 100, 1) : 0;
        $p['is_saya'] = (intval($p['id_karyawan']) === $kId);
    }

    jsonResponse(true, "Daftar rekan kerja pada pekerjaan berhasil dimuat (Karyawan)", [
        "total_jam_proyek" => round($totalJamProyek, 2),
        "pekerja" => $pekerjaList
    ]);

} elseif ($method === 'POST') {
    // FITUR NOTIFIKASI TUGAS: Tandai notifikasi tugas baru sebagai sudah dibaca
    $body = getRequestBody();
    $action = $_GET['action'] ?? $body['action'] ?? 'baca';

    if ($action === 'baca' || $action === 'mark_read') {
        $id_penugasan = intval($body['id_penugasan'] ?? 0);
        if ($id_penugasan > 0) {
            $stmt = $pdo->prepare("UPDATE penugasan SET status_baca = 'sudah' WHERE id_penugasan = ? AND id_karyawan = ?");
            $stmt->execute([$id_penugasan, $kId]);
            jsonResponse(true, "Notifikasi tugas #$id_penugasan berhasil ditandai sudah dibaca.");
        } else {
            // Tandai seluruh tugas baru karyawan ini sebagai sudah dibaca
            $stmt = $pdo->prepare("UPDATE penugasan SET status_baca = 'sudah' WHERE id_karyawan = ?");
            $stmt->execute([$kId]);
            jsonResponse(true, "Semua notifikasi tugas baru berhasil ditandai sudah dibaca.");
        }
    } else {
        jsonResponse(false, "Aksi tidak dikenal", null, 400);
    }
} else {
    jsonResponse(false, "Akses ditolak. Pengelolaan data penugasan hanya dapat diubah oleh Administrator.", null, 403);
}

