<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: LIHAT SLIP GAJI & RINCIAN PER PEKERJAAN
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Login Karyawan & Hanya Akses Data Milik Sendiri
$currentUser = requireLogin();
ensureGajiSchema($pdo);
ensureAbsensiSchema($pdo);
ensurePekerjaanPenugasanSchema($pdo);

$kId = intval($currentUser['id_karyawan'] ?? 0);
if ($kId <= 0) {
    jsonResponse(false, "Profil pekerja untuk akun ini belum terhubung.", null, 403);
}

$method = $_SERVER['REQUEST_METHOD'];
$action = $_GET['action'] ?? '';

if ($method === 'GET') {
    $periode = $_GET['periode'] ?? getJakartaCurrentPeriode();
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;

    // 1. Riwayat semua slip gaji bulanan milik karyawan yang sedang login
    if ($action === 'riwayat') {
        $sqlHistory = "
            SELECT g.*,
                   k.nama AS nama_karyawan,
                   k.jabatan,
                   k.tarif_per_jam
            FROM gaji g
            JOIN karyawan k ON g.id_karyawan = k.id_karyawan
            WHERE g.id_karyawan = ?
            ORDER BY g.periode DESC, g.id_gaji DESC
        ";
        $stmtH = $pdo->prepare($sqlHistory);
        $stmtH->execute([$kId]);
        $rows = $stmtH->fetchAll();

        foreach ($rows as &$r) {
            $projectsMap = fetchGajiEmployeeProjectsMap($pdo, $r['periode'], $kId);
            $r['id_pekerjaan_list'] = $projectsMap[$kId]['id_pekerjaan_list'] ?? '';
            $r['nama_pekerjaan'] = $projectsMap[$kId]['nama_pekerjaan'] ?? '';
        }
        unset($r);

        jsonResponse(true, "Riwayat slip gaji pribadi berhasil dimuat", $rows);
    }

    // 2. Detail slip gaji & rincian per data pekerjaan (absensi sah + reimbursement pribadi)
    if ($action === 'detail') {
        $stmtSlip = $pdo->prepare("
            SELECT g.*,
                   k.nama AS nama_karyawan,
                   k.jabatan,
                   k.tarif_per_jam
            FROM gaji g
            JOIN karyawan k ON g.id_karyawan = k.id_karyawan
            WHERE g.id_karyawan = ? AND g.periode = ?
            ORDER BY g.id_gaji DESC
            LIMIT 1
        ");
        $stmtSlip->execute([$kId, $periode]);
        $slipRow = $stmtSlip->fetch() ?: null;

        $tarifOverride = $slipRow ? floatval($slipRow['tarif']) : null;
        $breakdown = fetchGajiJobBreakdown($pdo, $kId, $periode, $tarifOverride, $id_pekerjaan);

        $projectsMap = fetchGajiEmployeeProjectsMap($pdo, $periode, $kId);
        if ($slipRow) {
            $slipRow['id_pekerjaan_list'] = $projectsMap[$kId]['id_pekerjaan_list'] ?? '';
            $slipRow['nama_pekerjaan'] = $projectsMap[$kId]['nama_pekerjaan'] ?? '';
        }

        $breakdown['slip'] = $slipRow;
        $breakdown['periode'] = $periode;

        jsonResponse(true, "Rincian slip gaji berdasarkan data pekerjaan berhasil dimuat", $breakdown);
    }

    // 3. Default GET: slip gaji periode tertentu milik karyawan yang sedang login
    $sql = "
        SELECT g.*,
               k.nama AS nama_karyawan,
               k.jabatan,
               k.tarif_per_jam
        FROM gaji g
        JOIN karyawan k ON g.id_karyawan = k.id_karyawan
        WHERE g.id_karyawan = ? AND g.periode = ?
        ORDER BY g.id_gaji DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute([$kId, $periode]);
    $data = $stmt->fetchAll();

    $projectsMap = fetchGajiEmployeeProjectsMap($pdo, $periode, $kId);
    foreach ($data as &$row) {
        $row['id_pekerjaan_list'] = $projectsMap[$kId]['id_pekerjaan_list'] ?? '';
        $row['nama_pekerjaan'] = $projectsMap[$kId]['nama_pekerjaan'] ?? '';
    }
    unset($row);

    jsonResponse(true, "Data slip gaji periode $periode berhasil dimuat (Karyawan)", $data);

} else {
    // Karyawan tidak diizinkan menghitung atau mengubah status bayar gaji
    jsonResponse(false, "Akses ditolak. Perhitungan dan pembayaran gaji hanya dapat dilakukan oleh Administrator.", null, 403);
}
