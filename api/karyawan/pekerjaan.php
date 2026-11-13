<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: DAFTAR PEKERJAAN YANG DITUGASKAN
// ==========================================================
require_once __DIR__ . '/../config/database.php';

ensurePekerjaanPenugasanSchema($pdo);

// Otorisasi: Wajib Login
$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
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
    $action = $_GET['action'] ?? '';
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;

    // 1. Daftar pekerjaan terbuka yang tersedia untuk diambil mandiri oleh pekerja
    if ($action === 'tersedia') {
        $workerId = intval($_GET['worker_id'] ?? $kId);
        jsonResponse(true, "Daftar pekerjaan tersedia berhasil dimuat", fetchAvailableOpenJobs($pdo, $workerId));
    }

    // 2. Detail pekerjaan tunggal (jika diminta berdasarkan id_pekerjaan)
    if ($id_pekerjaan > 0) {
        $stmt = $pdo->prepare("
            SELECT p.*,
                   (SELECT COUNT(DISTINCT pnx.id_karyawan) FROM penugasan pnx WHERE pnx.id_pekerjaan = p.id_pekerjaan) AS total_pekerja
            FROM pekerjaan p
            WHERE p.id_pekerjaan = ?
        ");
        $stmt->execute([$id_pekerjaan]);
        $job = $stmt->fetch();
        if (!$job) {
            jsonResponse(false, "Data pekerjaan tidak ditemukan", null, 404);
        }
        jsonResponse(true, "Detail pekerjaan berhasil dimuat", $job);
    }

    // 3. RBAC: Pekerja melihat pekerjaan yang ditugaskan kepadanya (F-07)
    $sql = "
        SELECT p.*,
               pn.id_penugasan,
               pn.peran_tugas AS peran_saya,
               pn.jenis_penugasan,
               pn.status_baca,
               DATE(pn.created_at) AS tanggal_penugasan,
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

    // Jika pekerja belum memiliki penugasan spesifik, sertakan pekerjaan yang sedang berjalan agar dapat dipilih saat mencatat pengeluaran
    if (empty($data)) {
        $stmtAll = $pdo->query("
            SELECT p.*,
                   NULL AS id_penugasan,
                   'Anggota Tim' AS peran_saya,
                   'admin' AS jenis_penugasan,
                   'sudah' AS status_baca,
                   NULL AS tanggal_penugasan,
                   (SELECT COUNT(DISTINCT pnx.id_karyawan) FROM penugasan pnx WHERE pnx.id_pekerjaan = p.id_pekerjaan) AS total_pekerja,
                   0 AS jam_kerja_saya,
                   0 AS pengeluaran_saya
            FROM pekerjaan p
            WHERE p.status = 'berjalan'
            ORDER BY p.id_pekerjaan DESC
        ");
        $data = $stmtAll->fetchAll();
    }

    jsonResponse(true, "Daftar pekerjaan tugas saya berhasil dimuat (Karyawan)", $data);

} elseif ($method === 'POST' && (($_GET['action'] ?? $body['action'] ?? '') === 'ambil')) {
    // Karyawan mengambil pekerjaan terbuka secara mandiri
    $id_pekerjaan = intval($_GET['id_pekerjaan'] ?? $body['id_pekerjaan'] ?? 0);
    if ($id_pekerjaan <= 0) {
        jsonResponse(false, "ID Pekerjaan tidak valid", null, 400);
    }
    if ($kId <= 0) {
        jsonResponse(false, "Identitas karyawan aktif tidak ditemukan.", null, 403);
    }

    $today = getJakartaTodayDate();

    try {
        $pdo->beginTransaction();

        $stmtJob = $pdo->prepare("SELECT * FROM pekerjaan WHERE id_pekerjaan = ? FOR UPDATE");
        $stmtJob->execute([$id_pekerjaan]);
        $job = $stmtJob->fetch();

        if (!$job) {
            $pdo->rollBack();
            jsonResponse(false, "Data pekerjaan tidak ditemukan.", null, 404);
        }

        if (($job['metode_penentuan'] ?? 'terbuka') !== 'terbuka') {
            $pdo->rollBack();
            jsonResponse(false, "Pekerjaan ini ditetapkan langsung oleh Admin dan tidak tersedia untuk diambil mandiri.", null, 409);
        }

        if (($job['status'] ?? '') === 'selesai') {
            $pdo->rollBack();
            jsonResponse(false, "Pekerjaan ini sudah selesai dan tidak dapat diambil.", null, 422);
        }

        if (!empty($job['target_selesai']) && $job['target_selesai'] < $today) {
            $pdo->rollBack();
            jsonResponse(false, "Pekerjaan telah melewati batas tenggat (deadline) dan tidak dapat diambil.", null, 422);
        }

        $stmtExisting = $pdo->prepare("SELECT id_penugasan, id_karyawan FROM penugasan WHERE id_pekerjaan = ? FOR UPDATE");
        $stmtExisting->execute([$id_pekerjaan]);
        $existing = $stmtExisting->fetch();

        if ($existing) {
            $pdo->rollBack();
            $msg = intval($existing['id_karyawan']) === $kId
                ? "Pekerjaan ini sudah Anda ambil sebelumnya."
                : "Pekerjaan sudah tidak tersedia karena telah diambil oleh pekerja lain.";
            jsonResponse(false, $msg, null, 409);
        }

        $stmtInsert = $pdo->prepare("
            INSERT INTO penugasan (id_pekerjaan, id_karyawan, peran_tugas, jenis_penugasan, status_baca)
            VALUES (?, ?, 'Pelaksana Mandiri', 'mandiri', 'sudah')
        ");
        $stmtInsert->execute([$id_pekerjaan, $kId]);
        $idPenugasan = intval($pdo->lastInsertId());

        $pdo->commit();

        jsonResponse(true, "Pekerjaan berhasil diambil secara mandiri!", [
            "id_penugasan" => $idPenugasan,
            "id_pekerjaan" => $id_pekerjaan,
            "id_karyawan" => $kId,
            "peran_tugas" => "Pelaksana Mandiri",
            "jenis_penugasan" => "mandiri",
            "tanggal_penugasan" => $today,
        ], 201);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(false, "Gagal mengambil pekerjaan: " . $e->getMessage(), null, 500);
    }

} else {
    // Pekerja tidak diizinkan menambah, mengubah, atau menghapus pekerjaan master
    jsonResponse(false, "Akses ditolak. Pengelolaan data pekerjaan hanya dapat dilakukan oleh Administrator.", null, 403);
}

