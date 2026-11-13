<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: MANAJEMEN DATA PEKERJA (CRUD)
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
ensureKaryawanProfileSchema($pdo);
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

function fetchKaryawanAdminSql($whereClause = '') {
    return "
        SELECT k.*, 
               u.id_user, u.email, u.peran, IFNULL(u.aktif, 1) AS aktif,
               (SELECT COUNT(*) FROM penugasan pn WHERE pn.id_karyawan = k.id_karyawan) AS total_pekerjaan_aktif,
               (
                   SELECT GROUP_CONCAT(CONCAT(p.id_pekerjaan, '::', p.nama_pekerjaan, '::', IFNULL(p.lokasi, ''), '::', IFNULL(pn.catatan_admin, 'Pelaksana')) SEPARATOR '||')
                   FROM penugasan pn
                   JOIN pekerjaan p ON pn.id_pekerjaan = p.id_pekerjaan
                   WHERE pn.id_karyawan = k.id_karyawan
               ) AS daftar_proyek
        FROM karyawan k
        LEFT JOIN `user` u ON k.id_karyawan = u.id_karyawan
        {$whereClause}
        ORDER BY k.id_karyawan ASC
    ";
}

function fetchSingleKaryawanAdmin(PDO $pdo, int $idKaryawan) {
    $stmt = $pdo->prepare(fetchKaryawanAdminSql('WHERE k.id_karyawan = ?'));
    $stmt->execute([$idKaryawan]);
    return $stmt->fetch() ?: null;
}

if ($method === 'GET') {
    $id_karyawan = intval($_GET['id_karyawan'] ?? 0);
    if ($id_karyawan > 0) {
        $row = fetchSingleKaryawanAdmin($pdo, $id_karyawan);
        if (!$row) {
            jsonResponse(false, "Data karyawan tidak ditemukan.", null, 404);
        }
        jsonResponse(true, "Detail pekerja berhasil dimuat (Admin)", $row);
    }

    // 1. Ambil semua pekerja beserta info akun dan jumlah penugasan aktif
    $stmt = $pdo->query(fetchKaryawanAdminSql());
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar pekerja berhasil dimuat (Admin)", $data);

} elseif ($method === 'POST') {
    // 2. Tambah Pekerja Baru (+ Akun Login bila email diisi)
    $nama = htmlspecialchars(trim($body['nama'] ?? ''), ENT_QUOTES, 'UTF-8');
    $jabatanRaw = trim((string)($body['jabatan'] ?? ''));
    $jabatan = $jabatanRaw !== '' ? htmlspecialchars($jabatanRaw, ENT_QUOTES, 'UTF-8') : null;
    $tarif_per_jam = floatval($body['tarif_per_jam'] ?? 0);
    $rawEmail = trim((string)($body['email'] ?? ''));
    $email = $rawEmail !== '' ? filter_var($rawEmail, FILTER_VALIDATE_EMAIL) : null;
    $kata_sandi_raw = trim((string)($body['kata_sandi'] ?? ''));
    $kata_sandi = $kata_sandi_raw !== '' ? $kata_sandi_raw : 'karyawan123';
    $peran = $body['peran'] ?? 'karyawan';

    // Validasi whitelist peran
    if (!in_array($peran, ['admin', 'karyawan'], true)) {
        jsonResponse(false, "Peran akun tidak valid.", null, 400);
    }

    if (empty($nama)) {
        jsonResponse(false, "Nama lengkap karyawan wajib diisi.", null, 400);
    }

    if ($tarif_per_jam < 0) {
        jsonResponse(false, "Tarif per jam tidak boleh bernilai negatif.", null, 400);
    }

    if ($rawEmail !== '' && !$email) {
        jsonResponse(false, "Format email tidak valid.", null, 400);
    }

    if ($email && $kata_sandi_raw !== '' && strlen($kata_sandi_raw) < 6) {
        jsonResponse(false, "Kata sandi minimal 6 karakter.", null, 400);
    }

    if ($email) {
        // Cek apakah email sudah terdaftar
        $stmtCheck = $pdo->prepare("SELECT id_user FROM `user` WHERE email = ?");
        $stmtCheck->execute([$email]);
        if ($stmtCheck->fetch()) {
            jsonResponse(false, "Email '$email' sudah digunakan oleh akun lain.", null, 400);
        }
    }

    try {
        $pdo->beginTransaction();

        // Insert ke tabel karyawan
        $stmtKaryawan = $pdo->prepare("INSERT INTO karyawan (nama, jabatan, tarif_per_jam) VALUES (?, ?, ?)");
        $stmtKaryawan->execute([$nama, $jabatan, $tarif_per_jam]);
        $id_karyawan = intval($pdo->lastInsertId());

        // Insert ke tabel user bila email akun login diisi
        if ($email) {
            $hashPassword = password_hash($kata_sandi, PASSWORD_BCRYPT);
            $stmtUser = $pdo->prepare("INSERT INTO `user` (id_karyawan, email, kata_sandi, peran, aktif) VALUES (?, ?, ?, ?, 1)");
            $stmtUser->execute([$id_karyawan, $email, $hashPassword, $peran]);
        }

        $pdo->commit();

        $created = fetchSingleKaryawanAdmin($pdo, $id_karyawan) ?: [
            "id_karyawan" => $id_karyawan,
            "nama" => $nama,
            "jabatan" => $jabatan,
            "tarif_per_jam" => $tarif_per_jam,
            "email" => $email,
            "peran" => $peran,
            "aktif" => 1,
        ];

        jsonResponse(true, "Pekerja '$nama' berhasil ditambahkan oleh Admin!", $created, 201);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, "Gagal menambahkan pekerja: " . $e->getMessage(), null, 500);
    }

} elseif ($method === 'PUT') {
    // 3. Ubah Data Pekerja & Status Akun
    $id_karyawan = intval($_GET['id_karyawan'] ?? $body['id_karyawan'] ?? 0);
    if ($id_karyawan <= 0) {
        jsonResponse(false, "ID Karyawan tidak valid.", null, 400);
    }

    $existing = fetchSingleKaryawanAdmin($pdo, $id_karyawan);
    if (!$existing) {
        jsonResponse(false, "Data karyawan tidak ditemukan.", null, 404);
    }

    $nama = array_key_exists('nama', $body)
        ? htmlspecialchars(trim((string)($body['nama'] ?? '')), ENT_QUOTES, 'UTF-8')
        : $existing['nama'];
    if ($nama === '') {
        jsonResponse(false, "Nama karyawan wajib diisi.", null, 400);
    }

    $jabatan = $existing['jabatan'];
    if (array_key_exists('jabatan', $body)) {
        $jabatanTrimmed = trim((string)($body['jabatan'] ?? ''));
        $jabatan = $jabatanTrimmed !== '' ? htmlspecialchars($jabatanTrimmed, ENT_QUOTES, 'UTF-8') : null;
    }

    $tarif_per_jam = array_key_exists('tarif_per_jam', $body)
        ? floatval($body['tarif_per_jam'])
        : floatval($existing['tarif_per_jam']);
    if ($tarif_per_jam < 0) {
        jsonResponse(false, "Tarif per jam tidak boleh bernilai negatif.", null, 400);
    }

    $aktif = isset($body['aktif']) ? (intval($body['aktif']) ? 1 : 0) : null;
    $kata_sandi = trim((string)($body['kata_sandi'] ?? ''));

    try {
        $pdo->beginTransaction();

        $stmt = $pdo->prepare("UPDATE karyawan SET nama = ?, jabatan = ?, tarif_per_jam = ? WHERE id_karyawan = ?");
        $stmt->execute([$nama, $jabatan, $tarif_per_jam, $id_karyawan]);

        if ($aktif !== null) {
            $stmtAktif = $pdo->prepare("UPDATE `user` SET aktif = ? WHERE id_karyawan = ?");
            $stmtAktif->execute([$aktif, $id_karyawan]);
        }

        if (!empty($kata_sandi)) {
            if (strlen($kata_sandi) < 6) {
                $pdo->rollBack();
                jsonResponse(false, "Kata sandi baru minimal 6 karakter.", null, 400);
            }
            $hash = password_hash($kata_sandi, PASSWORD_BCRYPT);
            $stmtPass = $pdo->prepare("UPDATE `user` SET kata_sandi = ? WHERE id_karyawan = ?");
            $stmtPass->execute([$hash, $id_karyawan]);
        }

        $pdo->commit();
        $updated = fetchSingleKaryawanAdmin($pdo, $id_karyawan);
        jsonResponse(true, "Data pekerja berhasil diperbarui.", $updated);
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, "Gagal memperbarui data: " . $e->getMessage(), null, 500);
    }

} elseif ($method === 'DELETE') {
    // 4. Hapus Pekerja (dengan proteksi integritas F-06 & opsi Force Delete)
    $id_karyawan = intval($_GET['id_karyawan'] ?? $body['id_karyawan'] ?? 0);
    $force = (isset($_GET['force']) && $_GET['force'] == '1') || (!empty($body['force']));

    if ($id_karyawan <= 0) {
        jsonResponse(false, "ID Karyawan tidak valid.", null, 400);
    }

    $stmtAbs = $pdo->prepare("SELECT COUNT(*) FROM absensi WHERE id_karyawan = ?");
    $stmtAbs->execute([$id_karyawan]);
    $totalAbsensi = (int)$stmtAbs->fetchColumn();

    $stmtPeng = $pdo->prepare("SELECT COUNT(*) FROM pengeluaran WHERE id_karyawan = ?");
    $stmtPeng->execute([$id_karyawan]);
    $totalPengeluaran = (int)$stmtPeng->fetchColumn();

    if (($totalAbsensi > 0 || $totalPengeluaran > 0) && !$force) {
        jsonResponse(false, "Pekerja ini tidak dapat dihapus biasa karena memiliki riwayat $totalAbsensi sesi absensi dan $totalPengeluaran pengeluaran. Disarankan nonaktifkan status login pekerja, atau pilih Hapus Paksa jika ingin membersihkannya.", [
            "has_history" => true,
            "total_absensi" => $totalAbsensi,
            "total_pengeluaran" => $totalPengeluaran
        ], 400);
    }

    try {
        $pdo->beginTransaction();

        // Bersihkan data relasi
        if ($force) {
            $pdo->prepare("DELETE FROM gaji WHERE id_karyawan = ?")->execute([$id_karyawan]);
            $pdo->prepare("DELETE FROM absensi WHERE id_karyawan = ?")->execute([$id_karyawan]);
            $pdo->prepare("DELETE FROM pengeluaran WHERE id_karyawan = ?")->execute([$id_karyawan]);
        }
        $pdo->prepare("DELETE FROM penugasan WHERE id_karyawan = ?")->execute([$id_karyawan]);
        $pdo->prepare("DELETE FROM `user` WHERE id_karyawan = ?")->execute([$id_karyawan]);
        $pdo->prepare("DELETE FROM karyawan WHERE id_karyawan = ?")->execute([$id_karyawan]);

        $pdo->commit();
        jsonResponse(true, "Data pekerja beserta seluruh relasinya berhasil dihapus.");
    } catch (Exception $e) {
        $pdo->rollBack();
        jsonResponse(false, "Gagal menghapus data pekerja: " . $e->getMessage(), null, 500);
    }

} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

