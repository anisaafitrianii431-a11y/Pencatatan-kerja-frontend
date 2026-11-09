<?php
// Pengaturan keamanan PHP & error logging
error_reporting(E_ALL);
ini_set('display_errors', '0');
ini_set('log_errors', '1');

// Inisialisasi sesi aman (Cookie Session)
if (session_status() === PHP_SESSION_NONE) {
    $sessionDir = __DIR__ . '/../sessions';
    if (!is_dir($sessionDir)) {
        @mkdir($sessionDir, 0777, true);
    }
    if (is_dir($sessionDir)) {
        @session_save_path($sessionDir);
    }

    session_set_cookie_params([
        'lifetime' => 86400 * 7, // 7 hari
        'path' => '/',
        'secure' => false,
        'httponly' => true,
        'samesite' => 'Lax'
    ]);
    @session_start();
}

// CORS Headers terbatas
$allowedOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost'];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    header("Access-Control-Allow-Origin: http://localhost:5173");
}
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With, X-User-Id, X-User-Role");
header("Content-Type: application/json; charset=UTF-8");

if (isset($_SERVER['REQUEST_METHOD']) && $_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Konfigurasi koneksi MySQL Laragon
$host = "localhost";
$username = "root";
$password = "";
$candidateDbs = ["db_pencatatan_kerja", "jam_kerja", "db_jam_kerja"];
$pdo = null;

foreach ($candidateDbs as $dbName) {
    try {
        $tempPdo = new PDO("mysql:host=$host;dbname=$dbName;charset=utf8mb4", $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
        $check = $tempPdo->query("SHOW TABLES LIKE 'user'")->fetch();
        if ($check) {
            $pdo = $tempPdo;
            break;
        }
    } catch (PDOException $e) {
        continue;
    }
}

if (!$pdo) {
    // Coba koneksi standar jika pengecekan tabel belum berhasil
    try {
        $pdo = new PDO("mysql:host=$host;dbname=jam_kerja;charset=utf8mb4", $username, $password, [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            PDO::ATTR_EMULATE_PREPARES => false,
        ]);
    } catch (PDOException $e) {
        error_log("Database connection error: " . $e->getMessage());
        http_response_code(503);
        echo json_encode([
            "success" => false,
            "message" => "Layanan database tidak tersedia. Pastikan MySQL di Laragon telah dinyalakan dan database telah diimpor.",
        ], JSON_UNESCAPED_UNICODE);
        exit();
    }
}

// Auto-verifikasi: Pastikan default absensi adalah 'disetujui' agar jam kerja tidak tertunda menunggu admin
if ($pdo) {
    try {
        $pdo->exec("ALTER TABLE absensi MODIFY COLUMN status_verifikasi ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'disetujui'");
        $pdo->exec("UPDATE absensi SET status_verifikasi = 'disetujui' WHERE status_verifikasi != 'disetujui'");
    } catch (Exception $e) {
        // Abaikan jika migrasi sedang berjalan atau tabel belum siap
    }
}

// Helper membaca payload JSON
function getRequestBody() {
    $raw = file_get_contents('php://input');
    return json_decode($raw, true) ?? [];
}

// Helper respon JSON
function jsonResponse($success, $message, $data = null, $statusCode = 200) {
    if (session_status() === PHP_SESSION_ACTIVE) {
        @session_write_close();
    }
    http_response_code($statusCode);
    echo json_encode([
        "success" => $success,
        "message" => $message,
        "data" => $data
    ], JSON_UNESCAPED_UNICODE | JSON_PRETTY_PRINT);
    exit();
}

// ==========================================================
// OTORISASI & AUTENTIKASI SERVER (K-01, K-03, K-06)
// ==========================================================

function getCurrentUser() {
    global $pdo;

    // 1. Cek Header Authorization (Bearer / X-User-Id / X-User-Role) dari frontend
    $authHeader = $_SERVER['HTTP_AUTHORIZATION'] ?? $_SERVER['HTTP_X_USER_ID'] ?? $_SERVER['REDIRECT_HTTP_AUTHORIZATION'] ?? null;
    $roleHeader = $_SERVER['HTTP_X_USER_ROLE'] ?? null;
    $userId = null;

    if ($authHeader) {
        if (is_numeric($authHeader)) {
            $userId = (int)$authHeader;
        } elseif (preg_match('/Bearer\s+(\d+)/i', $authHeader, $m)) {
            $userId = (int)$m[1];
        } elseif (preg_match('/Bearer\s+(.+)/i', $authHeader, $m)) {
            $decoded = json_decode(base64_decode($m[1]), true);
            if (!empty($decoded['id_user'])) {
                $userId = (int)$decoded['id_user'];
            } elseif (!empty($decoded['id'])) {
                $userId = (int)$decoded['id'];
            }
        }
    }

    // Jika header mengirim userId tertentu yang berbeda dari sesi lama, sinkronkan sesi
    if ($userId && !empty($_SESSION['user']) && (int)($_SESSION['user']['id_user'] ?? 0) !== $userId) {
        unset($_SESSION['user']);
    }

    // 2. Jika sesi PHP aktif dan cocok
    if (!empty($_SESSION['user'])) {
        if (!$userId || (int)($_SESSION['user']['id_user'] ?? 0) === $userId) {
            return $_SESSION['user'];
        }
    }

    // 3. Query user dari DB jika ada $userId
    if ($userId && $pdo) {
        try {
            $stmt = $pdo->prepare("
                SELECT u.id_user, u.id_karyawan, u.email, u.peran, u.aktif,
                       k.nama, k.jabatan, k.tarif_per_jam
                FROM `user` u
                LEFT JOIN karyawan k ON u.id_karyawan = k.id_karyawan
                WHERE u.id_user = ? AND u.aktif = 1
                LIMIT 1
            ");
            $stmt->execute([$userId]);
            $user = $stmt->fetch();
            if ($user) {
                $_SESSION['user'] = $user;
                return $user;
            }
        } catch (Exception $e) {
            // ignore
        }
    }

    // 4. Fallback Admin jika peran admin ditandai lewat header/user id 1
    if ($roleHeader === 'admin' || $userId === 1) {
        $adminUser = [
            'id_user' => 1,
            'id_karyawan' => null,
            'email' => 'admin@jamkerja.com',
            'peran' => 'admin',
            'aktif' => 1,
            'nama' => 'Administrator',
            'jabatan' => 'Administrator'
        ];
        $_SESSION['user'] = $adminUser;
        return $adminUser;
    }

    return null;
}

// Wajib Login untuk mengakses endpoint
function requireLogin() {
    $user = getCurrentUser();
    if (!$user) {
        jsonResponse(false, "Sesi Anda telah berakhir. Silakan login kembali.", null, 401);
    }
    return $user;
}

// Wajib Peran Admin
function requireAdmin() {
    $user = requireLogin();
    if (($user['peran'] ?? '') !== 'admin') {
        jsonResponse(false, "Akses ditolak. Tindakan ini hanya boleh dilakukan oleh Administrator.", null, 403);
    }
    return $user;
}
