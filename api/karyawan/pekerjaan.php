<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: DAFTAR PEKERJAAN YANG DITUGASKAN
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Login
$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$kId = intval($currentUser['id_karyawan'] ?? 0);

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
    // RBAC: Pekerja hanya melihat pekerjaan yang ditugaskan kepadanya (F-07)
    $sql = "
        SELECT p.*,
               pn.id_penugasan,
               pn.peran_tugas AS peran_saya,
               pn.status_baca,
               pn.created_at AS tanggal_penugasan,
               (SELECT COUNT(DISTINCT pnx.id_karyawan) FROM penugasan pnx WHERE pnx.id_pekerjaan = p.id_pekerjaan) AS total_pekerja,
               (SELECT IFNULL(SUM($sqlDurasi), 0) FROM absensi a WHERE a.id_pekerjaan = p.id_pekerjaan AND a.id_karyawan = ? AND a.status_verifikasi = 'disetujui' AND a.jam_pulang IS NOT NULL) AS jam_kerja_saya,
               (SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran pg WHERE pg.id_pekerjaan = p.id_pekerjaan AND pg.id_karyawan = ?) AS pengeluaran_saya
        FROM pekerjaan p
        JOIN penugasan pn ON p.id_pekerjaan = pn.id_pekerjaan AND pn.id_karyawan = ?
        ORDER BY p.id_pekerjaan DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$kId, $kId, $kId]);
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar pekerjaan tugas saya berhasil dimuat (Karyawan)", $data);

} else {
    // Pekerja tidak diizinkan menambah, mengubah, atau menghapus pekerjaan master
    jsonResponse(false, "Akses ditolak. Pengelolaan data pekerjaan hanya dapat dilakukan oleh Administrator.", null, 403);
}

