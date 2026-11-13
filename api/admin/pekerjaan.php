<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: MANAJEMEN PEKERJAAN / PROYEK (CRUD)
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
            THEN ROUND(TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) / 3600, 2)
        WHEN a.jam_pulang IS NOT NULL AND a.jam_pulang < a.jam_masuk 
            THEN ROUND((TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) + 86400) / 3600, 2)
        ELSE 0 
    END
";

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';
    $id = intval($_GET['id_pekerjaan'] ?? 0);

    if ($action === 'tersedia') {
        $workerId = intval($_GET['worker_id'] ?? 0);
        jsonResponse(true, "Daftar pekerjaan tersedia berhasil dimuat", fetchAvailableOpenJobs($pdo, $workerId));
    }

    if ($id > 0) {
        $stmt = $pdo->prepare("
            SELECT p.*,
                   (SELECT COUNT(DISTINCT pn.id_karyawan) FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan) AS total_pekerja,
                   (SELECT GROUP_CONCAT(k.nama ORDER BY pn.id_penugasan ASC SEPARATOR ', ')
                    FROM penugasan pn JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
                    WHERE pn.id_pekerjaan = p.id_pekerjaan) AS nama_karyawan_list,
                   (SELECT GROUP_CONCAT(pn.id_karyawan ORDER BY pn.id_penugasan ASC SEPARATOR ',')
                    FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan) AS id_karyawan_list,
                   (SELECT IFNULL(SUM($sqlDurasi), 0) FROM absensi a WHERE a.id_pekerjaan = p.id_pekerjaan AND a.status_verifikasi = 'disetujui' AND a.jam_pulang IS NOT NULL) AS total_jam_kerja,
                   (SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran pg WHERE pg.id_pekerjaan = p.id_pekerjaan AND pg.status_verifikasi = 'disetujui') AS total_pengeluaran
            FROM pekerjaan p
            WHERE p.id_pekerjaan = ?
        ");
        $stmt->execute([$id]);
        $job = $stmt->fetch();
        if (!$job) {
            jsonResponse(false, "Data pekerjaan tidak ditemukan", null, 404);
        }

        $stmtWorkers = $pdo->prepare("
            SELECT pn.id_penugasan, pn.id_karyawan, pn.peran_tugas, pn.jenis_penugasan, k.nama, k.jabatan
            FROM penugasan pn
            JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
            WHERE pn.id_pekerjaan = ?
            ORDER BY pn.id_penugasan ASC
        ");
        $stmtWorkers->execute([$id]);
        $job['assigned_workers'] = $stmtWorkers->fetchAll();

        jsonResponse(true, "Detail pekerjaan berhasil dimuat (Admin)", $job);
    }

    // Admin melihat semua pekerjaan beserta daftar pekerja terassign
    $sql = "
        SELECT p.*,
               (SELECT COUNT(DISTINCT pn.id_karyawan) FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan) AS total_pekerja,
               (SELECT GROUP_CONCAT(k.nama ORDER BY pn.id_penugasan ASC SEPARATOR ', ')
                FROM penugasan pn JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
                WHERE pn.id_pekerjaan = p.id_pekerjaan) AS nama_karyawan_list,
               (SELECT GROUP_CONCAT(pn.id_karyawan ORDER BY pn.id_penugasan ASC SEPARATOR ',')
                FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan) AS id_karyawan_list,
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
    $status = in_array($body['status'] ?? '', ['belum_mulai', 'berjalan', 'selesai'], true)
        ? $body['status']
        : 'belum_mulai';
    $metode = ($body['metode_penentuan'] ?? 'terbuka') === 'langsung' ? 'langsung' : 'terbuka';
    $employeeIds = array_values(array_unique(array_filter(
        array_map('intval', is_array($body['id_karyawan_list'] ?? null) ? $body['id_karyawan_list'] : []),
        fn($v) => $v > 0
    )));

    if (empty($nama)) {
        jsonResponse(false, "Nama pekerjaan wajib diisi", null, 400);
    }
    if ($metode === 'langsung' && empty($employeeIds)) {
        jsonResponse(false, "Pilih minimal satu pekerja untuk metode penetapan langsung.", null, 400);
    }

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("
            INSERT INTO pekerjaan (nama_pekerjaan, deskripsi, lokasi, titik_lokasi, tanggal_mulai, target_selesai, status, metode_penentuan)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        ");
        $stmt->execute([$nama, $deskripsi, $lokasi, $titik_lokasi, $tanggal_mulai, $target_selesai, $status, $metode]);
        $newId = intval($pdo->lastInsertId());

        if ($metode === 'langsung' && !empty($employeeIds)) {
            $stmtAssign = $pdo->prepare("
                INSERT INTO penugasan (id_pekerjaan, id_karyawan, peran_tugas, jenis_penugasan, status_baca)
                VALUES (?, ?, 'Anggota Tim Pelaksana', 'admin', 'belum')
            ");
            foreach ($employeeIds as $empId) {
                $stmtAssign->execute([$newId, $empId]);
            }
        }

        $pdo->commit();

        jsonResponse(true, "Pekerjaan '$nama' berhasil ditambahkan oleh Admin!", [
            "id_pekerjaan" => $newId,
            "nama_pekerjaan" => $nama,
            "deskripsi" => $deskripsi,
            "lokasi" => $lokasi,
            "titik_lokasi" => $titik_lokasi,
            "tanggal_mulai" => $tanggal_mulai,
            "target_selesai" => $target_selesai,
            "status" => $status,
            "metode_penentuan" => $metode,
        ], 201);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(false, "Gagal menambahkan pekerjaan: " . $e->getMessage(), null, 500);
    }

} elseif ($method === 'PUT') {
    // Ubah Data Pekerjaan
    $id = intval($_GET['id_pekerjaan'] ?? $body['id_pekerjaan'] ?? 0);
    if ($id <= 0) {
        jsonResponse(false, "ID Pekerjaan tidak valid", null, 400);
    }

    $nama = htmlspecialchars(trim($body['nama_pekerjaan'] ?? ''), ENT_QUOTES, 'UTF-8');
    $deskripsi = htmlspecialchars(trim($body['deskripsi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $lokasi = htmlspecialchars(trim($body['lokasi'] ?? ''), ENT_QUOTES, 'UTF-8');
    $titik_lokasi = trim($body['titik_lokasi'] ?? '');
    $tanggal_mulai = !empty($body['tanggal_mulai']) ? $body['tanggal_mulai'] : null;
    $target_selesai = !empty($body['target_selesai']) ? $body['target_selesai'] : null;
    $status = in_array($body['status'] ?? '', ['belum_mulai', 'berjalan', 'selesai'], true)
        ? $body['status']
        : 'berjalan';
    $metode = ($body['metode_penentuan'] ?? 'terbuka') === 'langsung' ? 'langsung' : 'terbuka';
    $employeeIds = array_values(array_unique(array_filter(
        array_map('intval', is_array($body['id_karyawan_list'] ?? null) ? $body['id_karyawan_list'] : []),
        fn($v) => $v > 0
    )));

    if (empty($nama)) {
        jsonResponse(false, "Nama pekerjaan wajib diisi", null, 400);
    }
    if ($metode === 'langsung' && empty($employeeIds)) {
        jsonResponse(false, "Pilih minimal satu pekerja untuk metode penetapan langsung.", null, 400);
    }

    try {
        $pdo->beginTransaction();

        $stmtPrev = $pdo->prepare("SELECT metode_penentuan, titik_lokasi FROM pekerjaan WHERE id_pekerjaan = ? FOR UPDATE");
        $stmtPrev->execute([$id]);
        $prev = $stmtPrev->fetch();
        if (!$prev) {
            $pdo->rollBack();
            jsonResponse(false, "Data pekerjaan tidak ditemukan", null, 404);
        }

        $nextTitik = array_key_exists('titik_lokasi', $body)
            ? trim((string) ($body['titik_lokasi'] ?? ''))
            : ($prev['titik_lokasi'] ?? '');

        $stmt = $pdo->prepare("
            UPDATE pekerjaan 
            SET nama_pekerjaan = ?, deskripsi = ?, lokasi = ?, titik_lokasi = ?, 
                tanggal_mulai = ?, target_selesai = ?, status = ?, metode_penentuan = ?
            WHERE id_pekerjaan = ?
        ");
        $stmt->execute([$nama, $deskripsi, $lokasi, $nextTitik, $tanggal_mulai, $target_selesai, $status, $metode, $id]);
        $titik_lokasi = $nextTitik;

        if ($metode === 'langsung') {
            $stmtExisting = $pdo->prepare("SELECT id_karyawan FROM penugasan WHERE id_pekerjaan = ?");
            $stmtExisting->execute([$id]);
            $existingIds = array_map('intval', $stmtExisting->fetchAll(PDO::FETCH_COLUMN));

            $toDelete = array_diff($existingIds, $employeeIds);
            if (!empty($toDelete)) {
                $placeholders = implode(',', array_fill(0, count($toDelete), '?'));
                $stmtDel = $pdo->prepare("DELETE FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan IN ($placeholders)");
                $stmtDel->execute(array_merge([$id], array_values($toDelete)));
            }

            $toInsert = array_diff($employeeIds, $existingIds);
            if (!empty($toInsert)) {
                $stmtIns = $pdo->prepare("
                    INSERT INTO penugasan (id_pekerjaan, id_karyawan, peran_tugas, jenis_penugasan, status_baca)
                    VALUES (?, ?, 'Anggota Tim Pelaksana', 'admin', 'belum')
                ");
                foreach ($toInsert as $empId) {
                    $stmtIns->execute([$id, $empId]);
                }
            }
        } elseif ($prev['metode_penentuan'] === 'langsung' && $metode === 'terbuka') {
            // Jika diubah dari langsung ke terbuka, bersihkan penugasan admin agar terbuka kembali
            $pdo->prepare("DELETE FROM penugasan WHERE id_pekerjaan = ? AND jenis_penugasan = 'admin'")->execute([$id]);
        }

        $pdo->commit();
        jsonResponse(true, "Data pekerjaan berhasil diperbarui (Admin)", [
            "id_pekerjaan" => $id,
            "nama_pekerjaan" => $nama,
            "deskripsi" => $deskripsi,
            "lokasi" => $lokasi,
            "titik_lokasi" => $titik_lokasi,
            "tanggal_mulai" => $tanggal_mulai,
            "target_selesai" => $target_selesai,
            "status" => $status,
            "metode_penentuan" => $metode,
        ]);
    } catch (Exception $e) {
        if ($pdo->inTransaction()) {
            $pdo->rollBack();
        }
        jsonResponse(false, "Gagal memperbarui pekerjaan: " . $e->getMessage(), null, 500);
    }

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

