<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: MANAJEMEN PENGGUNA (USERS)
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
ensureKaryawanProfileSchema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? '';

function formatUserRecord(array $u) {
    $idNum = (int)$u['id_user'];
    $isAktif = (int)($u['aktif'] ?? 1) === 1;
    $finalCode = !empty($u['kode_karyawan']) 
        ? $u['kode_karyawan'] 
        : (!empty($u['kode_user']) ? $u['kode_user'] : ($u['peran'] === 'admin' ? 'ADM001' : 'USER' . str_pad($idNum, 3, '0', STR_PAD_LEFT)));

    return [
        'id_user' => $idNum,
        'kode_user' => $finalCode,
        'id_karyawan' => !empty($u['id_karyawan']) ? (int)$u['id_karyawan'] : null,
        'username' => !empty($u['username']) ? $u['username'] : (!empty($u['kode_karyawan']) ? $u['kode_karyawan'] : $finalCode),
        'email' => $u['email'] ?? '',
        'peran' => $u['peran'] ?? 'karyawan',
        'aktif' => $isAktif ? 1 : 0,
        'nama' => !empty($u['nama']) ? $u['nama'] : ($u['peran'] === 'admin' ? 'Administrator' : 'Pengguna'),
        'jabatan' => !empty($u['jabatan']) ? $u['jabatan'] : ($u['peran'] === 'admin' ? 'Administrator Sistem' : '-'),
        'kode_karyawan' => $u['peran'] === 'admin' ? '' : ($u['kode_karyawan'] ?? $finalCode),
        'nomor_hp' => $u['nomor_hp'] ?? ($u['no_hp'] ?? ''),
        'status_karyawan' => $u['status_karyawan'] ?? ($isAktif ? 'aktif' : 'nonaktif'),
        'created_at' => $u['created_at'] ?? null,
    ];
}

function fetchUserById(PDO $pdo, int $idUser) {
    $stmt = $pdo->prepare("
        SELECT u.id_user, u.id_karyawan, u.email, u.username, u.peran, u.aktif, u.created_at,
               k.nama, k.jabatan, k.kode_karyawan, k.no_hp AS nomor_hp,
               CASE WHEN u.aktif = 1 THEN 'aktif' ELSE 'nonaktif' END AS status_karyawan
        FROM `user` u
        LEFT JOIN karyawan k ON u.id_karyawan = k.id_karyawan
        WHERE u.id_user = ?
        LIMIT 1
    ");
    $stmt->execute([$idUser]);
    $row = $stmt->fetch(PDO::FETCH_ASSOC);
    return $row ? formatUserRecord($row) : null;
}

// ----------------------------------------------------------
// 1. TOGGLE STATUS AKTIF / NONAKTIF PENGGUNA
// ----------------------------------------------------------
if ($action === 'status' || ($method === 'PUT' && isset($_GET['id_user']))) {
    $idUser = intval($_GET['id_user'] ?? $body['id_user'] ?? 0);
    if ($idUser <= 0) {
        jsonResponse(false, "ID Pengguna tidak valid.", null, 400);
    }

    if ($idUser === (int)$currentUser['id_user'] && (isset($body['aktif']) && !$body['aktif'] || ($body['status'] ?? '') === 'nonaktif')) {
        jsonResponse(false, "Anda tidak dapat menonaktifkan akun Administrator Anda sendiri.", null, 400);
    }

    $isAktif = 1;
    if (isset($body['aktif'])) {
        $isAktif = ($body['aktif'] === 1 || $body['aktif'] === true || $body['aktif'] === '1') ? 1 : 0;
    } elseif (isset($body['status'])) {
        $isAktif = strtolower(trim((string)$body['status'])) === 'aktif' ? 1 : 0;
    }

    $stmt = $pdo->prepare("UPDATE `user` SET aktif = ? WHERE id_user = ?");
    $stmt->execute([$isAktif, $idUser]);

    $updated = fetchUserById($pdo, $idUser);
    if (!$updated) {
        jsonResponse(false, "Pengguna tidak ditemukan.", null, 404);
    }

    $statusLabel = $isAktif ? 'diaktifkan' : 'dinonaktifkan';
    jsonResponse(true, "Akun pengguna {$updated['nama']} berhasil {$statusLabel}.", $updated);
}

// ----------------------------------------------------------
// 2. RESET KATA SANDI PENGGUNA OLEH ADMIN
// ----------------------------------------------------------
if ($action === 'reset_password') {
    $idUser = intval($_GET['id_user'] ?? $body['id_user'] ?? 0);
    if ($idUser <= 0) {
        jsonResponse(false, "ID Pengguna tidak valid.", null, 400);
    }

    $kataSandi = trim((string)($body['kata_sandi'] ?? ''));
    $konfirmasi = trim((string)($body['konfirmasi_kata_sandi'] ?? ''));

    if ($kataSandi === '') {
        jsonResponse(false, "Kata sandi baru wajib diisi.", null, 400);
    }
    if (strlen($kataSandi) < 6) {
        jsonResponse(false, "Kata sandi minimal terdiri dari 6 karakter.", null, 400);
    }
    if ($kataSandi !== $konfirmasi) {
        jsonResponse(false, "Konfirmasi kata sandi tidak cocok dengan kata sandi baru.", null, 400);
    }

    $hash = password_hash($kataSandi, PASSWORD_BCRYPT);
    $stmt = $pdo->prepare("UPDATE `user` SET kata_sandi = ? WHERE id_user = ?");
    $stmt->execute([$hash, $idUser]);

    $updated = fetchUserById($pdo, $idUser);
    if (!$updated) {
        jsonResponse(false, "Pengguna tidak ditemukan.", null, 404);
    }

    jsonResponse(true, "Kata sandi untuk {$updated['nama']} berhasil direset.", $updated);
}

// ----------------------------------------------------------
// 3. GET: DETAIL ATAU DAFTAR SEMUA PENGGUNA
// ----------------------------------------------------------
if ($method === 'GET') {
    $idUser = intval($_GET['id_user'] ?? 0);
    if ($idUser > 0) {
        $user = fetchUserById($pdo, $idUser);
        if (!$user) {
            jsonResponse(false, "Pengguna tidak ditemukan.", null, 404);
        }
        jsonResponse(true, "Detail pengguna berhasil dimuat.", $user);
    }

    // Auto-generate akun user untuk karyawan yang belum memiliki akun login
    try {
        $missing = $pdo->query("
            SELECT k.id_karyawan, k.nama, k.kode_karyawan, k.no_hp
            FROM karyawan k
            LEFT JOIN `user` u ON k.id_karyawan = u.id_karyawan
            WHERE u.id_user IS NULL
        ")->fetchAll(PDO::FETCH_ASSOC);

        if (!empty($missing)) {
            $defaultHash = password_hash('karyawan123', PASSWORD_BCRYPT);
            $insStmt = $pdo->prepare("
                INSERT INTO `user` (id_karyawan, email, username, kata_sandi, peran, aktif)
                VALUES (?, ?, ?, ?, 'karyawan', 1)
            ");
            foreach ($missing as $m) {
                $slug = strtolower(preg_replace('/[^a-zA-Z0-9]/', '', $m['nama'])) ?: 'pekerja';
                $genEmail = $slug . $m['id_karyawan'] . '@jamkerja.com';
                $genUsername = !empty($m['kode_karyawan']) ? $m['kode_karyawan'] : ('KRY' . str_pad($m['id_karyawan'], 3, '0', STR_PAD_LEFT));
                try {
                    $insStmt->execute([$m['id_karyawan'], $genEmail, $genUsername, $defaultHash]);
                } catch (Exception $e) {
                    // Abaikan bila duplikat email/username
                }
            }
        }
    } catch (Exception $e) {
        // Lewati jika terjadi kendala pada sinkronisasi otomatis
    }

    $stmt = $pdo->query("
        SELECT u.id_user, u.id_karyawan, u.email, u.username, u.peran, u.aktif, u.created_at,
               k.nama, k.jabatan, k.kode_karyawan, k.no_hp AS nomor_hp,
               CASE WHEN u.aktif = 1 THEN 'aktif' ELSE 'nonaktif' END AS status_karyawan
        FROM `user` u
        LEFT JOIN karyawan k ON u.id_karyawan = k.id_karyawan
        ORDER BY u.id_user DESC
    ");
    $rows = $stmt->fetchAll(PDO::FETCH_ASSOC);
    $result = array_map('formatUserRecord', $rows);

    jsonResponse(true, "Daftar pengguna berhasil dimuat.", $result);
}

jsonResponse(false, "Metode HTTP tidak didukung.", null, 405);

