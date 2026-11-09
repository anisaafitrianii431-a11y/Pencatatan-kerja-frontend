<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: VERIFIKASI PENGELUARAN & REKAP DANA
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

if (!empty($_POST)) {
    $body = array_merge($body, $_POST);
}

$action = $_GET['action'] ?? $body['action'] ?? '';

if ($method === 'GET') {
    // 1. REKAP PENGELUARAN SELURUH PROYEK (Tabel Sesuai Use Case)
    if ($action === 'rekap') {
        $sql = "
            SELECT p.id_pekerjaan, p.nama_pekerjaan,
                   IFNULL(SUM(CASE WHEN pg.jenis_dana = 'pribadi' AND pg.status_verifikasi = 'disetujui' THEN pg.nominal ELSE 0 END), 0) AS uang_pribadi,
                   IFNULL(SUM(CASE WHEN pg.jenis_dana = 'kantor' AND pg.status_verifikasi = 'disetujui' THEN pg.nominal ELSE 0 END), 0) AS uang_kantor,
                   IFNULL(SUM(CASE WHEN pg.status_verifikasi = 'disetujui' THEN pg.nominal ELSE 0 END), 0) AS total_pengeluaran,
                   IFNULL(SUM(CASE WHEN pg.jenis_dana = 'pribadi' AND pg.status_verifikasi = 'disetujui' AND pg.status_ganti = 'belum' THEN pg.nominal ELSE 0 END), 0) AS pribadi_belum_ganti
            FROM pekerjaan p
            LEFT JOIN pengeluaran pg ON p.id_pekerjaan = pg.id_pekerjaan
            GROUP BY p.id_pekerjaan, p.nama_pekerjaan
            ORDER BY p.id_pekerjaan ASC
        ";
        $stmt = $pdo->query($sql);
        $rekap = $stmt->fetchAll();

        $totalPribadi = 0;
        $totalKantor = 0;
        $grandTotal = 0;
        foreach ($rekap as $r) {
            $totalPribadi += floatval($r['uang_pribadi']);
            $totalKantor += floatval($r['uang_kantor']);
            $grandTotal += floatval($r['total_pengeluaran']);
        }

        jsonResponse(true, "Rekapitulasi pengeluaran seluruh proyek berhasil dimuat (Admin)", [
            "daftar" => $rekap,
            "summary" => [
                "total_uang_pribadi" => $totalPribadi,
                "total_uang_kantor" => $totalKantor,
                "grand_total" => $grandTotal
            ]
        ]);
    }

    // 2. DAFTAR SELURUH PENGELUARAN (Dengan Filter)
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $id_karyawan = isset($_GET['id_karyawan']) ? intval($_GET['id_karyawan']) : 0;
    $jenis_dana = $_GET['jenis_dana'] ?? '';

    $where = [];
    $params = [];

    if ($id_pekerjaan > 0) {
        $where[] = "pg.id_pekerjaan = ?";
        $params[] = $id_pekerjaan;
    }
    if ($id_karyawan > 0) {
        $where[] = "pg.id_karyawan = ?";
        $params[] = $id_karyawan;
    }
    if (!empty($jenis_dana) && in_array($jenis_dana, ['pribadi', 'kantor'])) {
        $where[] = "pg.jenis_dana = ?";
        $params[] = $jenis_dana;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $sql = "
        SELECT pg.*,
               k.nama AS nama_karyawan,
               k.jabatan,
               p.nama_pekerjaan,
               p.lokasi AS lokasi_pekerjaan
        FROM pengeluaran pg
        JOIN karyawan k ON pg.id_karyawan = k.id_karyawan
        JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
        $whereClause
        ORDER BY pg.tanggal DESC, pg.id_pengeluaran DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar pengeluaran seluruh proyek berhasil dimuat (Admin)", $data);

} elseif ($method === 'POST') {
    // 1. VERIFIKASI BUKTI PENGELUARAN OLEH ADMIN
    if ($action === 'verifikasi') {
        $id = intval($body['id_pengeluaran'] ?? 0);
        $status = $body['status_verifikasi'] ?? '';
        if (!in_array($status, ['disetujui', 'ditolak', 'menunggu'])) {
            jsonResponse(false, "Status verifikasi tidak valid", null, 400);
        }
        $stmt = $pdo->prepare("UPDATE pengeluaran SET status_verifikasi = ? WHERE id_pengeluaran = ?");
        $stmt->execute([$status, $id]);
        jsonResponse(true, "Status verifikasi pengeluaran diperbarui oleh Admin");

    // 2. STATUS REIMBURSEMENT UANG PRIBADI OLEH ADMIN
    } elseif ($action === 'status_ganti') {
        $id = intval($body['id_pengeluaran'] ?? 0);
        $status = $body['status_ganti'] ?? '';
        if (!in_array($status, ['sudah', 'belum'])) {
            jsonResponse(false, "Status penggantian tidak valid", null, 400);
        }
        $stmt = $pdo->prepare("UPDATE pengeluaran SET status_ganti = ? WHERE id_pengeluaran = ?");
        $stmt->execute([$status, $id]);
        jsonResponse(true, "Status penggantian dana diperbarui oleh Admin");

    // 3. HAPUS PENGELUARAN OLEH ADMIN (VIA POST ACTION)
    } elseif ($action === 'delete') {
        $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
        if ($id <= 0) {
            jsonResponse(false, "ID pengeluaran tidak valid", null, 400);
        }
        $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
        $stmt->execute([$id]);
        jsonResponse(true, "Catatan pengeluaran berhasil dihapus oleh Admin");
    } else {
        jsonResponse(false, "Aksi pengeluaran admin tidak didukung", null, 400);
    }

} elseif ($method === 'DELETE') {
    $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
    $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmt->execute([$id]);
    jsonResponse(true, "Catatan pengeluaran berhasil dihapus oleh Admin");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

