<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: VERIFIKASI & MONITORING ABSENSI
// ==========================================================
require_once __DIR__ . '/../config/database.php';

ensureAbsensiSchema($pdo);

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

if ($method === 'GET') {
    $id_absensi = isset($_GET['id_absensi']) ? intval($_GET['id_absensi']) : 0;
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $id_karyawan = isset($_GET['id_karyawan']) ? intval($_GET['id_karyawan']) : 0;
    $tanggal = $_GET['tanggal'] ?? '';
    $status_verifikasi = $_GET['status_verifikasi'] ?? '';

    $where = [];
    $params = [];

    if ($id_absensi > 0) {
        $where[] = "a.id_absensi = ?";
        $params[] = $id_absensi;
    }
    if ($id_karyawan > 0) {
        $where[] = "a.id_karyawan = ?";
        $params[] = $id_karyawan;
    }
    if ($id_pekerjaan > 0) {
        $where[] = "a.id_pekerjaan = ?";
        $params[] = $id_pekerjaan;
    }
    if (!empty($tanggal)) {
        $where[] = "a.tanggal = ?";
        $params[] = $tanggal;
    }
    if (in_array($status_verifikasi, ['menunggu', 'disetujui', 'ditolak'], true)) {
        $where[] = "a.status_verifikasi = ?";
        $params[] = $status_verifikasi;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
    $sqlDurasi = getAbsensiDurationSelectSql('a');

    $sql = "
        SELECT a.*,
               k.nama AS nama_karyawan, k.jabatan, k.tarif_per_jam,
               p.nama_pekerjaan,
               p.deskripsi AS deskripsi_pekerjaan,
               p.lokasi AS lokasi_pekerjaan,
               p.titik_lokasi AS titik_pekerjaan,
               p.tanggal_mulai AS tanggal_mulai_pekerjaan,
               p.target_selesai AS target_selesai_pekerjaan,
               p.status AS status_pekerjaan,
               (SELECT pn.jenis_penugasan
                FROM penugasan pn
                WHERE pn.id_pekerjaan = a.id_pekerjaan AND pn.id_karyawan = a.id_karyawan
                LIMIT 1) AS jenis_penugasan,
               $sqlDurasi
        FROM absensi a
        JOIN karyawan k ON a.id_karyawan = k.id_karyawan
        JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
        $whereClause
        ORDER BY a.tanggal DESC, a.jam_masuk DESC, a.id_absensi DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = array_map('enrichAbsensiRow', $stmt->fetchAll());

    if ($id_absensi > 0) {
        if (empty($rows)) {
            jsonResponse(false, "Catatan absensi tidak ditemukan", null, 404);
        }
        jsonResponse(true, "Detail absensi berhasil dimuat (Admin)", $rows[0]);
    }

    jsonResponse(true, "Data absensi seluruh pekerja berhasil dimuat (Admin)", $rows);

} elseif ($method === 'POST' || $method === 'PUT') {
    $action = $_GET['action'] ?? $body['action'] ?? ($method === 'PUT' ? 'verifikasi' : '');

    if ($action === 'verifikasi') {
        $id_absensi = intval($_GET['id_absensi'] ?? $body['id_absensi'] ?? 0);
        $status = $body['status_verifikasi'] ?? '';
        $catatan_admin = htmlspecialchars(trim($body['catatan_admin'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_absensi <= 0) {
            jsonResponse(false, "ID absensi wajib disertakan.", null, 400);
        }
        if (!in_array($status, ['disetujui', 'ditolak', 'menunggu'], true)) {
            jsonResponse(false, "Status verifikasi tidak valid.", null, 400);
        }

        $cek = $pdo->prepare("SELECT id_absensi FROM absensi WHERE id_absensi = ?");
        $cek->execute([$id_absensi]);
        if (!$cek->fetch()) {
            jsonResponse(false, "Data absensi tidak ditemukan.", null, 404);
        }

        $stmt = $pdo->prepare("UPDATE absensi SET status_verifikasi = ?, catatan_admin = ? WHERE id_absensi = ?");
        $stmt->execute([$status, $catatan_admin !== '' ? $catatan_admin : null, $id_absensi]);

        jsonResponse(true, "Status absensi berhasil diubah menjadi: $status (Admin)", [
            "id_absensi" => $id_absensi,
            "status_verifikasi" => $status,
            "catatan_admin" => $catatan_admin !== '' ? $catatan_admin : null,
        ]);
    } else {
        jsonResponse(false, "Aksi absensi tidak didukung untuk admin", null, 400);
    }

} elseif ($method === 'DELETE') {
    $id = intval($_GET['id_absensi'] ?? $body['id_absensi'] ?? 0);
    $stmt = $pdo->prepare("DELETE FROM absensi WHERE id_absensi = ?");
    $stmt->execute([$id]);
    jsonResponse(true, "Catatan absensi berhasil dihapus (Admin)");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}
