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

// Pastikan kolom absensi mendukung alur foto + GPS masuk/pulang dan approval admin (idempoten)
function ensureAbsensiSchema($pdo) {
    if (!$pdo) return;
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        $colStatus = $pdo->query("SHOW COLUMNS FROM absensi LIKE 'status_verifikasi'")->fetch();
        if ($colStatus && ($colStatus['Default'] ?? '') !== 'menunggu') {
            $pdo->exec("ALTER TABLE absensi MODIFY COLUMN status_verifikasi ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'menunggu'");
        }
        if (!$pdo->query("SHOW COLUMNS FROM absensi LIKE 'foto_pulang'")->fetch()) {
            $pdo->exec("ALTER TABLE absensi ADD COLUMN foto_pulang VARCHAR(255) DEFAULT NULL AFTER foto_lokasi");
        }
        if (!$pdo->query("SHOW COLUMNS FROM absensi LIKE 'titik_pulang'")->fetch()) {
            $pdo->exec("ALTER TABLE absensi ADD COLUMN titik_pulang VARCHAR(100) DEFAULT NULL AFTER titik_lokasi");
        }
        if (!$pdo->query("SHOW COLUMNS FROM absensi LIKE 'jarak_masuk'")->fetch()) {
            $pdo->exec("ALTER TABLE absensi ADD COLUMN jarak_masuk INT DEFAULT NULL AFTER titik_pulang");
        }
        if (!$pdo->query("SHOW COLUMNS FROM absensi LIKE 'jarak_pulang'")->fetch()) {
            $pdo->exec("ALTER TABLE absensi ADD COLUMN jarak_pulang INT DEFAULT NULL AFTER jarak_masuk");
        }
        if (!$pdo->query("SHOW COLUMNS FROM absensi LIKE 'catatan_admin'")->fetch()) {
            $pdo->exec("ALTER TABLE absensi ADD COLUMN catatan_admin VARCHAR(255) DEFAULT NULL AFTER catatan");
        }
    } catch (Exception $e) {
        error_log("Absensi schema migration error: " . $e->getMessage());
    }
}

// Migrasi otomatis kolom profil karyawan (kontak/WA, alamat, foto profil, kontak darurat, rekening)
function ensureKaryawanProfileSchema($pdo) {
    if (!$pdo) return;
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'no_hp'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN no_hp VARCHAR(30) DEFAULT NULL AFTER tarif_per_jam");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'alamat'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN alamat TEXT DEFAULT NULL AFTER no_hp");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'foto_profil'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN foto_profil VARCHAR(255) DEFAULT NULL AFTER alamat");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'kontak_darurat'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN kontak_darurat VARCHAR(120) DEFAULT NULL AFTER foto_profil");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'nama_bank'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN nama_bank VARCHAR(60) DEFAULT NULL AFTER kontak_darurat");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'no_rekening'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN no_rekening VARCHAR(60) DEFAULT NULL AFTER nama_bank");
        }
        if (!$pdo->query("SHOW COLUMNS FROM karyawan LIKE 'kode_karyawan'")->fetch()) {
            $pdo->exec("ALTER TABLE karyawan ADD COLUMN kode_karyawan VARCHAR(30) DEFAULT NULL AFTER jabatan");
        }
        if (!$pdo->query("SHOW COLUMNS FROM `user` LIKE 'username'")->fetch()) {
            $pdo->exec("ALTER TABLE `user` ADD COLUMN username VARCHAR(50) DEFAULT NULL AFTER email");
        }
    } catch (Exception $e) {
        error_log("Karyawan profile schema migration error: " . $e->getMessage());
    }
}

/**
 * Ambil Unix timestamp akurat dari server NTP (SNTP v4 / UDP port 123).
 * Mengembalikan null jika semua server NTP tidak dapat dijangkau atau paket tidak valid.
 */
function fetchNtpUnixTimestamp(array $hosts = null, float $timeoutSeconds = 1.2) {
    $hosts = $hosts ?? [
        'time.google.com',
        'time.cloudflare.com',
        'id.pool.ntp.org',
        'pool.ntp.org',
        'time.windows.com',
    ];
    $packet = "\x1b" . str_repeat("\0", 47);
    $startAll = microtime(true);

    foreach ($hosts as $host) {
        if ((microtime(true) - $startAll) > 2.4) {
            break;
        }
        $errno = 0;
        $errstr = '';
        $t0 = microtime(true);
        $fp = @stream_socket_client("udp://{$host}:123", $errno, $errstr, $timeoutSeconds);
        if (!$fp) {
            continue;
        }
        $sec = (int) floor($timeoutSeconds);
        $usec = (int) (($timeoutSeconds - $sec) * 1000000);
        stream_set_timeout($fp, $sec, $usec);
        $written = @fwrite($fp, $packet);
        $data = $written === 48 ? @fread($fp, 48) : '';
        @fclose($fp);
        $t1 = microtime(true);

        if (!is_string($data) || strlen($data) < 48) {
            continue;
        }

        $header = ord($data[0]);
        $leapIndicator = ($header >> 6) & 0x03;
        $mode = $header & 0x07;
        $stratum = ord($data[1]);
        if ($leapIndicator === 3 || $mode !== 4 || $stratum < 1 || $stratum > 15) {
            continue;
        }

        $parts = unpack('Nsec/Nfrac', substr($data, 40, 8));
        if (!$parts || !isset($parts['sec'], $parts['frac'])) {
            continue;
        }

        $ntpSeconds = (float) sprintf('%u', $parts['sec']);
        $ntpFraction = (float) sprintf('%u', $parts['frac']) / 4294967296.0;
        $unixFloat = ($ntpSeconds - 2208988800.0) + $ntpFraction + (($t1 - $t0) / 2.0);

        if ($unixFloat < 1700000000.0) {
            continue;
        }

        return [
            'unix'    => (int) floor($unixFloat),
            'unix_ms' => (int) round($unixFloat * 1000.0),
            'server'  => $host,
            'rtt_ms'  => round(($t1 - $t0) * 1000.0, 1),
        ];
    }

    return null;
}

/**
 * Ambil waktu otoritatif zona Asia/Jakarta (WIB, UTC+7) berbasis NTP.
 * Hanya fallback ke jam server PHP jika seluruh server NTP offline/unreachable.
 * Tidak pernah menggunakan jam device/browser klien.
 */
function getAuthoritativeJakartaTime(bool $forceFresh = false) {
    static $cached = null;
    if (!$forceFresh && $cached !== null) {
        return $cached;
    }

    $ntp = fetchNtpUnixTimestamp();
    $tz = new DateTimeZone('Asia/Jakarta');

    if ($ntp !== null) {
        $dt = (new DateTimeImmutable('@' . $ntp['unix']))->setTimezone($tz);
        $result = [
            'tanggal'    => $dt->format('Y-m-d'),
            'jam'        => $dt->format('H:i:s'),
            'iso'        => $dt->format(DateTimeInterface::ATOM),
            'epoch_ms'   => $ntp['unix_ms'],
            'timezone'   => 'Asia/Jakarta',
            'source'     => 'ntp',
            'ntp_server' => $ntp['server'],
            'rtt_ms'     => $ntp['rtt_ms'],
        ];
    } else {
        $nowFloat = microtime(true);
        $dt = (new DateTimeImmutable('@' . (int) floor($nowFloat)))->setTimezone($tz);
        $result = [
            'tanggal'    => $dt->format('Y-m-d'),
            'jam'        => $dt->format('H:i:s'),
            'iso'        => $dt->format(DateTimeInterface::ATOM),
            'epoch_ms'   => (int) round($nowFloat * 1000.0),
            'timezone'   => 'Asia/Jakarta',
            'source'     => 'server_fallback',
            'ntp_server' => null,
            'rtt_ms'     => null,
        ];
    }

    $cached = $result;
    return $result;
}

function getJakartaNow(bool $forceFresh = false) {
    $time = getAuthoritativeJakartaTime($forceFresh);
    return [$time['tanggal'], $time['jam']];
}

function parseCoordinates($coord) {
    if (!is_string($coord) && !is_numeric($coord)) return null;
    $parts = preg_split('/[,;\s]+/', trim((string) $coord));
    if (!$parts || count($parts) < 2) return null;
    if (!is_numeric($parts[0]) || !is_numeric($parts[1])) return null;

    $lat = floatval($parts[0]);
    $lng = floatval($parts[1]);
    if ($lat < -90 || $lat > 90 || $lng < -180 || $lng > 180) return null;

    return [$lat, $lng];
}

function calculateDistanceMeters($coord1, $coord2) {
    $p1 = parseCoordinates($coord1);
    $p2 = parseCoordinates($coord2);
    if (!$p1 || !$p2) return null;

    [$lat1, $lng1] = $p1;
    [$lat2, $lng2] = $p2;

    $earthRadius = 6371000;
    $dLat = deg2rad($lat2 - $lat1);
    $dLng = deg2rad($lng2 - $lng1);

    $a = sin($dLat / 2) * sin($dLat / 2) +
         cos(deg2rad($lat1)) * cos(deg2rad($lat2)) *
         sin($dLng / 2) * sin($dLng / 2);
    $c = 2 * atan2(sqrt($a), sqrt(max(0, 1 - $a)));
    return intval(round($earthRadius * $c));
}

function getAbsensiDurationSelectSql($alias = 'a') {
    return "
        CASE
            WHEN {$alias}.jam_pulang IS NOT NULL AND {$alias}.jam_pulang >= {$alias}.jam_masuk
                THEN ROUND(TIME_TO_SEC(TIMEDIFF({$alias}.jam_pulang, {$alias}.jam_masuk)) / 3600, 2)
            WHEN {$alias}.jam_pulang IS NOT NULL AND {$alias}.jam_pulang < {$alias}.jam_masuk
                THEN ROUND((TIME_TO_SEC(TIMEDIFF({$alias}.jam_pulang, {$alias}.jam_masuk)) + 86400) / 3600, 2)
            ELSE 0
        END AS durasi_jam,
        CASE
            WHEN {$alias}.jam_pulang IS NOT NULL AND {$alias}.jam_pulang >= {$alias}.jam_masuk
                THEN FLOOR(TIME_TO_SEC(TIMEDIFF({$alias}.jam_pulang, {$alias}.jam_masuk)) / 60)
            WHEN {$alias}.jam_pulang IS NOT NULL AND {$alias}.jam_pulang < {$alias}.jam_masuk
                THEN FLOOR((TIME_TO_SEC(TIMEDIFF({$alias}.jam_pulang, {$alias}.jam_masuk)) + 86400) / 60)
            ELSE 0
        END AS durasi_menit
    ";
}

function enrichAbsensiRow(array $row) {
    $titikProyek = trim($row['titik_pekerjaan'] ?? '');
    $titikMasuk = trim($row['titik_lokasi'] ?? '');
    $titikPulang = trim($row['titik_pulang'] ?? '');

    $jarakMasuk = isset($row['jarak_masuk']) && $row['jarak_masuk'] !== null
        ? intval($row['jarak_masuk'])
        : calculateDistanceMeters($titikMasuk, $titikProyek);
    $jarakPulang = isset($row['jarak_pulang']) && $row['jarak_pulang'] !== null
        ? intval($row['jarak_pulang'])
        : calculateDistanceMeters($titikPulang, $titikProyek);

    $row['id_absensi'] = intval($row['id_absensi']);
    $row['id_pekerjaan'] = intval($row['id_pekerjaan']);
    $row['id_karyawan'] = intval($row['id_karyawan']);
    $row['durasi_jam'] = round(floatval($row['durasi_jam'] ?? 0), 2);
    $row['durasi_menit'] = intval($row['durasi_menit'] ?? round($row['durasi_jam'] * 60));
    $row['jarak_masuk'] = $jarakMasuk;
    $row['jarak_pulang'] = $jarakPulang;
    $row['sesuai_titik_masuk'] = ($jarakMasuk !== null) ? ($jarakMasuk <= 150) : null;
    $row['sesuai_titik_pulang'] = ($jarakPulang !== null) ? ($jarakPulang <= 150) : null;
    return $row;
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

function fetchAuthUserRecord($pdo, int $userId) {
    if (!$pdo || $userId <= 0) return null;
    ensureKaryawanProfileSchema($pdo);
    $stmt = $pdo->prepare("
        SELECT u.id_user, u.id_karyawan, u.email, u.peran, u.aktif,
               k.nama, k.jabatan, k.tarif_per_jam,
               k.no_hp, k.alamat, k.foto_profil, k.kontak_darurat, k.nama_bank, k.no_rekening
        FROM `user` u
        LEFT JOIN karyawan k ON u.id_karyawan = k.id_karyawan
        WHERE u.id_user = ? AND u.aktif = 1
        LIMIT 1
    ");
    $stmt->execute([$userId]);
    $user = $stmt->fetch();
    return $user ?: null;
}

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
            $user = fetchAuthUserRecord($pdo, $userId);
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

// Migrasi otomatis skema Kas Kantor & Pertanggungjawaban (idempoten untuk DB lama)
function ensureKasKantorSchema($pdo) {
    if (!$pdo) return;
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kas_kantor (
                id_kas INT AUTO_INCREMENT PRIMARY KEY,
                id_pekerjaan INT DEFAULT NULL,
                id_karyawan INT NOT NULL COMMENT 'Penanggung jawab pemegang uang kantor',
                id_pelapor INT DEFAULT NULL COMMENT 'Karyawan yang mengajukan pemasukan',
                dibuat_oleh ENUM('admin', 'karyawan') NOT NULL DEFAULT 'admin',
                tanggal DATE NOT NULL,
                nominal_masuk DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                keterangan VARCHAR(255) DEFAULT NULL,
                bukti_serah VARCHAR(255) DEFAULT NULL,
                status_verifikasi ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'disetujui',
                catatan_admin VARCHAR(255) DEFAULT NULL,
                status_lpj ENUM('berjalan', 'selesai') NOT NULL DEFAULT 'berjalan',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_kas_pekerjaan FOREIGN KEY (id_pekerjaan)
                    REFERENCES pekerjaan(id_pekerjaan) ON DELETE SET NULL ON UPDATE CASCADE,
                CONSTRAINT fk_kas_karyawan FOREIGN KEY (id_karyawan)
                    REFERENCES karyawan(id_karyawan) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_kas_pelapor FOREIGN KEY (id_pelapor)
                    REFERENCES karyawan(id_karyawan) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        if (!$pdo->query("SHOW COLUMNS FROM kas_kantor LIKE 'id_pelapor'")->fetch()) {
            $pdo->exec("ALTER TABLE kas_kantor ADD COLUMN id_pelapor INT DEFAULT NULL AFTER id_karyawan");
            try {
                $pdo->exec("
                    ALTER TABLE kas_kantor
                    ADD CONSTRAINT fk_kas_pelapor FOREIGN KEY (id_pelapor)
                    REFERENCES karyawan(id_karyawan) ON DELETE SET NULL ON UPDATE CASCADE
                ");
            } catch (Exception $e) {
                // Abaikan jika constraint sudah ada
            }
        }
        if (!$pdo->query("SHOW COLUMNS FROM kas_kantor LIKE 'dibuat_oleh'")->fetch()) {
            $pdo->exec("ALTER TABLE kas_kantor ADD COLUMN dibuat_oleh ENUM('admin', 'karyawan') NOT NULL DEFAULT 'admin' AFTER id_pelapor");
        }
        if (!$pdo->query("SHOW COLUMNS FROM kas_kantor LIKE 'status_verifikasi'")->fetch()) {
            $pdo->exec("ALTER TABLE kas_kantor ADD COLUMN status_verifikasi ENUM('menunggu', 'disetujui', 'ditolak') NOT NULL DEFAULT 'disetujui' AFTER bukti_serah");
        }
        if (!$pdo->query("SHOW COLUMNS FROM kas_kantor LIKE 'catatan_admin'")->fetch()) {
            $pdo->exec("ALTER TABLE kas_kantor ADD COLUMN catatan_admin VARCHAR(255) DEFAULT NULL AFTER status_verifikasi");
        }

        $pdo->exec("
            CREATE TABLE IF NOT EXISTS kas_kantor_pengembalian (
                id_pengembalian INT AUTO_INCREMENT PRIMARY KEY,
                id_kas INT NOT NULL,
                id_karyawan INT DEFAULT NULL COMMENT 'Pekerja yang menyetor sisa dana',
                tanggal DATE NOT NULL,
                nominal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
                keterangan VARCHAR(255) DEFAULT NULL,
                bukti_foto VARCHAR(255) DEFAULT NULL,
                status_konfirmasi ENUM('menunggu', 'diterima', 'ditolak') NOT NULL DEFAULT 'menunggu',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT fk_pengembalian_kas FOREIGN KEY (id_kas)
                    REFERENCES kas_kantor(id_kas) ON DELETE CASCADE ON UPDATE CASCADE,
                CONSTRAINT fk_pengembalian_karyawan FOREIGN KEY (id_karyawan)
                    REFERENCES karyawan(id_karyawan) ON DELETE SET NULL ON UPDATE CASCADE
            ) ENGINE=InnoDB
        ");

        $colCheck = $pdo->query("SHOW COLUMNS FROM pengeluaran LIKE 'id_kas'")->fetch();
        if (!$colCheck) {
            $pdo->exec("ALTER TABLE pengeluaran ADD COLUMN id_kas INT DEFAULT NULL AFTER jenis_dana");
            try {
                $pdo->exec("
                    ALTER TABLE pengeluaran
                    ADD CONSTRAINT fk_pengeluaran_kas FOREIGN KEY (id_kas)
                    REFERENCES kas_kantor(id_kas) ON DELETE SET NULL ON UPDATE CASCADE
                ");
            } catch (Exception $e) {
                // Abaikan jika constraint sudah ada atau tipe index berbeda
            }
        }
    } catch (Exception $e) {
        error_log("Kas kantor schema migration error: " . $e->getMessage());
    }
}

// Migrasi otomatis kolom metode_penentuan (pekerjaan) & jenis_penugasan (penugasan)
function ensurePekerjaanPenugasanSchema($pdo) {
    if (!$pdo) return;
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        if (!$pdo->query("SHOW COLUMNS FROM pekerjaan LIKE 'metode_penentuan'")->fetch()) {
            $pdo->exec("ALTER TABLE pekerjaan ADD COLUMN metode_penentuan ENUM('terbuka', 'langsung') NOT NULL DEFAULT 'terbuka' AFTER status");
            // Pekerjaan eksisting yang sudah memiliki penugasan ditandai sebagai penetapan langsung admin
            $pdo->exec("UPDATE pekerjaan p SET metode_penentuan = 'langsung' WHERE EXISTS (SELECT 1 FROM penugasan pn WHERE pn.id_pekerjaan = p.id_pekerjaan)");
        }
        if (!$pdo->query("SHOW COLUMNS FROM penugasan LIKE 'jenis_penugasan'")->fetch()) {
            $pdo->exec("ALTER TABLE penugasan ADD COLUMN jenis_penugasan ENUM('admin', 'mandiri') NOT NULL DEFAULT 'admin' AFTER peran_tugas");
        }
    } catch (Exception $e) {
        error_log("Pekerjaan/penugasan schema migration error: " . $e->getMessage());
    }
}

function getJakartaTodayDate() {
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m-d');
}

// Ambil daftar pekerjaan terbuka yang tersedia untuk diambil mandiri oleh pekerja
function fetchAvailableOpenJobs($pdo) {
    $today = getJakartaTodayDate();
    $stmt = $pdo->prepare("
        SELECT p.*,
               0 AS total_pekerja,
               '' AS nama_karyawan_list,
               '' AS id_karyawan_list
        FROM pekerjaan p
        WHERE p.metode_penentuan = 'terbuka'
          AND p.status <> 'selesai'
          AND (p.target_selesai IS NULL OR p.target_selesai >= ?)
          AND NOT EXISTS (
              SELECT 1 FROM penugasan pnx WHERE pnx.id_pekerjaan = p.id_pekerjaan
          )
        ORDER BY p.id_pekerjaan DESC
    ");
    $stmt->execute([$today]);
    return $stmt->fetchAll();
}

// Ambil daftar penugasan terjoin dengan data karyawan dan pekerjaan
function fetchPenugasanRows($pdo, $whereClause = '', $params = []) {
    $sql = "
        SELECT pn.id_penugasan,
               pn.id_pekerjaan,
               pn.id_karyawan,
               pn.peran_tugas,
               pn.jenis_penugasan,
               pn.status_baca,
               DATE(pn.created_at) AS tanggal_penugasan,
               k.nama AS nama_karyawan,
               k.jabatan,
               p.nama_pekerjaan,
               p.lokasi,
               p.titik_lokasi,
               p.tanggal_mulai,
               p.target_selesai,
               p.status AS status_pekerjaan,
               p.metode_penentuan
        FROM penugasan pn
        JOIN karyawan k ON pn.id_karyawan = k.id_karyawan
        JOIN pekerjaan p ON pn.id_pekerjaan = p.id_pekerjaan
        $whereClause
        ORDER BY pn.id_penugasan DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    return $stmt->fetchAll();
}

// Helper bersama untuk upload & kompresi gambar bukti (kuitansi / serah terima kas / setor sisa)
function uploadReceiptImage(array $fieldKeys, $prefix = 'kuitansi_') {
    $uploadKey = null;
    foreach ($fieldKeys as $key) {
        if (isset($_FILES[$key]) && $_FILES[$key]['error'] === UPLOAD_ERR_OK) {
            $uploadKey = $key;
            break;
        }
    }
    if (!$uploadKey) {
        return null;
    }

    $file = $_FILES[$uploadKey];
    $maxSize = 15 * 1024 * 1024; // 15 MB
    if ($file['size'] > $maxSize) {
        jsonResponse(false, "Ukuran file bukti gambar melebihi batas maksimal 15 MB.", null, 400);
    }

    $finfo = finfo_open(FILEINFO_MIME_TYPE);
    $mimeType = finfo_file($finfo, $file['tmp_name']);
    finfo_close($finfo);

    $allowedMimes = [
        'image/jpeg' => 'jpg',
        'image/png'  => 'png',
        'image/webp' => 'webp'
    ];

    if (!array_key_exists($mimeType, $allowedMimes)) {
        jsonResponse(false, "Format file tidak valid ($mimeType). Hanya format JPG, PNG, atau WEBP yang diperbolehkan.", null, 400);
    }

    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $filename = $prefix . bin2hex(random_bytes(16)) . '.jpg';
    $targetPath = $uploadDir . $filename;
    $saved = false;

    if (extension_loaded('gd')) {
        $image = null;
        switch ($mimeType) {
            case 'image/jpeg':
                $image = @imagecreatefromjpeg($file['tmp_name']);
                break;
            case 'image/png':
                $image = @imagecreatefrompng($file['tmp_name']);
                break;
            case 'image/webp':
                $image = @imagecreatefromwebp($file['tmp_name']);
                break;
            default:
                $image = @imagecreatefromstring(file_get_contents($file['tmp_name']));
                break;
        }

        if ($image) {
            $origWidth = imagesx($image);
            $origHeight = imagesy($image);
            $maxWidth = 1600;
            $maxHeight = 1600;
            $newWidth = $origWidth;
            $newHeight = $origHeight;

            if ($origWidth > $maxWidth || $origHeight > $maxHeight) {
                if ($origWidth / $origHeight > $maxWidth / $maxHeight) {
                    $newHeight = (int) round(($origHeight * $maxWidth) / $origWidth);
                    $newWidth = $maxWidth;
                } else {
                    $newWidth = (int) round(($origWidth * $maxHeight) / $origHeight);
                    $newHeight = $maxHeight;
                }
            }

            $newImage = imagecreatetruecolor($newWidth, $newHeight);
            $white = imagecolorallocate($newImage, 255, 255, 255);
            imagefilledrectangle($newImage, 0, 0, $newWidth, $newHeight, $white);
            imagecopyresampled($newImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);

            $saved = imagejpeg($newImage, $targetPath, 80);

            imagedestroy($image);
            imagedestroy($newImage);
            @unlink($file['tmp_name']);
        }
    }

    if (!$saved) {
        $saved = move_uploaded_file($file['tmp_name'], $targetPath);
    }

    if ($saved) {
        return 'uploads/' . $filename;
    }

    jsonResponse(false, "Gagal mengunggah dan mengompresi file bukti gambar ke server.", null, 500);
    return null;
}

// Ambil daftar kas kantor beserta kalkulasi saldo & pertanggungjawaban tanpa perkalian silang JOIN
function fetchKasKantorList($pdo, $whereClause = '', $params = [], $orderBy = 'kk.tanggal DESC, kk.id_kas DESC') {
    $sql = "
        SELECT kk.*,
               k.nama AS nama_penanggung_jawab,
               k.jabatan AS jabatan_penanggung_jawab,
               pl.nama AS nama_pelapor,
               p.nama_pekerjaan,
               p.lokasi AS lokasi_pekerjaan,
               IFNULL(pg_agg.jumlah_nota, 0) AS jumlah_nota,
               IFNULL(pg_agg.total_terpakai_disetujui, 0) AS total_terpakai_disetujui,
               IFNULL(pg_agg.total_terpakai_menunggu, 0) AS total_terpakai_menunggu,
               IFNULL(kp_agg.total_dikembalikan, 0) AS total_dikembalikan,
               IFNULL(kp_agg.menunggu_konfirmasi_kembali, 0) AS menunggu_konfirmasi_kembali
        FROM kas_kantor kk
        JOIN karyawan k ON kk.id_karyawan = k.id_karyawan
        LEFT JOIN karyawan pl ON kk.id_pelapor = pl.id_karyawan
        LEFT JOIN pekerjaan p ON kk.id_pekerjaan = p.id_pekerjaan
        LEFT JOIN (
            SELECT id_kas,
                   COUNT(*) AS jumlah_nota,
                   SUM(CASE WHEN status_verifikasi = 'disetujui' THEN nominal ELSE 0 END) AS total_terpakai_disetujui,
                   SUM(CASE WHEN status_verifikasi = 'menunggu' THEN nominal ELSE 0 END) AS total_terpakai_menunggu
            FROM pengeluaran
            WHERE id_kas IS NOT NULL AND jenis_dana = 'kantor'
            GROUP BY id_kas
        ) pg_agg ON kk.id_kas = pg_agg.id_kas
        LEFT JOIN (
            SELECT id_kas,
                   SUM(CASE WHEN status_konfirmasi = 'diterima' THEN nominal ELSE 0 END) AS total_dikembalikan,
                   SUM(CASE WHEN status_konfirmasi = 'menunggu' THEN nominal ELSE 0 END) AS menunggu_konfirmasi_kembali
            FROM kas_kantor_pengembalian
            GROUP BY id_kas
        ) kp_agg ON kk.id_kas = kp_agg.id_kas
        $whereClause
        ORDER BY $orderBy
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $rows = $stmt->fetchAll();

    foreach ($rows as &$r) {
        $masuk = round(floatval($r['nominal_masuk']), 2);
        $disetujui = round(floatval($r['total_terpakai_disetujui']), 2);
        $menunggu = round(floatval($r['total_terpakai_menunggu']), 2);
        $kembali = round(floatval($r['total_dikembalikan']), 2);
        $menungguKembali = round(floatval($r['menunggu_konfirmasi_kembali']), 2);

        $r['id_kas'] = intval($r['id_kas']);
        $r['id_pekerjaan'] = $r['id_pekerjaan'] !== null ? intval($r['id_pekerjaan']) : null;
        $r['id_karyawan'] = intval($r['id_karyawan']);
        $r['jumlah_nota'] = intval($r['jumlah_nota']);
        $r['nominal_masuk'] = $masuk;
        $r['total_terpakai_disetujui'] = $disetujui;
        $r['total_terpakai_menunggu'] = $menunggu;
        $r['total_dikembalikan'] = $kembali;
        $r['menunggu_konfirmasi_kembali'] = $menungguKembali;
        $r['sisa_resmi'] = round(max(0, $masuk - $disetujui - $kembali), 2);
        $r['sisa_tersedia'] = round(max(0, $masuk - $disetujui - $menunggu - $kembali - $menungguKembali), 2);
    }
    unset($r);

    return $rows;
}

// Sinkronkan status_lpj kas_kantor secara otomatis bila saldo telah klir (0)
function syncKasKantorLpjStatus($pdo, $idKas) {
    $idKas = intval($idKas);
    if ($idKas <= 0) return;

    $rows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$idKas]);
    if (empty($rows)) return;

    $kas = $rows[0];
    $nextStatus = (
        ($kas['status_verifikasi'] ?? 'disetujui') === 'disetujui' &&
        $kas['sisa_resmi'] <= 0 &&
        $kas['total_terpakai_menunggu'] == 0 &&
        $kas['menunggu_konfirmasi_kembali'] == 0
    )
        ? 'selesai'
        : 'berjalan';

    if ($kas['status_lpj'] !== $nextStatus) {
        $pdo->prepare("UPDATE kas_kantor SET status_lpj = ? WHERE id_kas = ?")->execute([$nextStatus, $idKas]);
    }
}

function getJakartaCurrentPeriode() {
    return (new DateTimeImmutable('now', new DateTimeZone('Asia/Jakarta')))->format('Y-m');
}

// Migrasi otomatis kolom penyesuaian & bukti pembayaran pada tabel gaji (idempoten)
function ensureGajiSchema($pdo) {
    if (!$pdo) return;
    static $migrated = false;
    if ($migrated) return;
    $migrated = true;

    try {
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'bonus'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN bonus DECIMAL(14, 2) NOT NULL DEFAULT 0.00 AFTER total_ganti");
        }
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'potongan'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN potongan DECIMAL(14, 2) NOT NULL DEFAULT 0.00 AFTER bonus");
        }
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'catatan_penyesuaian'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN catatan_penyesuaian VARCHAR(255) DEFAULT NULL AFTER potongan");
        }
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'metode_bayar'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN metode_bayar VARCHAR(30) DEFAULT 'transfer' AFTER tanggal_bayar");
        }
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'catatan_bayar'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN catatan_bayar VARCHAR(255) DEFAULT NULL AFTER metode_bayar");
        }
        if (!$pdo->query("SHOW COLUMNS FROM gaji LIKE 'bukti_bayar'")->fetch()) {
            $pdo->exec("ALTER TABLE gaji ADD COLUMN bukti_bayar VARCHAR(255) DEFAULT NULL AFTER catatan_bayar");
        }
    } catch (Exception $e) {
        error_log("Gaji schema migration error: " . $e->getMessage());
    }
}

// Simpan bukti pembayaran gambar dari Data URL base64 ke folder uploads/
function saveBase64ProofImage($dataUrl, $prefix = 'bukti_gaji_') {
    if (!is_string($dataUrl) || trim($dataUrl) === '') {
        return null;
    }
    $trimmed = trim($dataUrl);
    if (str_starts_with($trimmed, 'uploads/')) {
        return $trimmed;
    }
    if (!preg_match('/^data:image\/(jpeg|jpg|png|webp);base64,(.+)$/is', $trimmed, $matches)) {
        jsonResponse(false, "Format bukti gambar tidak valid. Gunakan JPG, PNG, atau WEBP.", null, 400);
    }

    $binary = base64_decode($matches[2], true);
    if ($binary === false || strlen($binary) === 0) {
        jsonResponse(false, "Gagal membaca data gambar bukti pembayaran.", null, 400);
    }
    if (strlen($binary) > 5 * 1024 * 1024) {
        jsonResponse(false, "Ukuran foto bukti pembayaran melebihi batas maksimal 5 MB.", null, 400);
    }

    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    $ext = strtolower($matches[1]) === 'png' ? 'png' : 'jpg';
    $filename = $prefix . bin2hex(random_bytes(16)) . '.' . $ext;
    $targetPath = $uploadDir . $filename;
    $saved = false;

    if (extension_loaded('gd')) {
        $image = @imagecreatefromstring($binary);
        if ($image) {
            $origWidth = imagesx($image);
            $origHeight = imagesy($image);
            $maxDim = 1600;
            $newWidth = $origWidth;
            $newHeight = $origHeight;
            if ($origWidth > $maxDim || $origHeight > $maxDim) {
                if ($origWidth >= $origHeight) {
                    $newHeight = (int) round(($origHeight * $maxDim) / $origWidth);
                    $newWidth = $maxDim;
                } else {
                    $newWidth = (int) round(($origWidth * $maxDim) / $origHeight);
                    $newHeight = $maxDim;
                }
            }
            $canvas = imagecreatetruecolor($newWidth, $newHeight);
            $white = imagecolorallocate($canvas, 255, 255, 255);
            imagefilledrectangle($canvas, 0, 0, $newWidth, $newHeight, $white);
            imagecopyresampled($canvas, $image, 0, 0, 0, 0, $newWidth, $newHeight, $origWidth, $origHeight);
            $jpgFilename = $prefix . bin2hex(random_bytes(16)) . '.jpg';
            $saved = imagejpeg($canvas, $uploadDir . $jpgFilename, 82);
            imagedestroy($image);
            imagedestroy($canvas);
            if ($saved) {
                $filename = $jpgFilename;
            }
        }
    }

    if (!$saved) {
        $saved = (@file_put_contents($targetPath, $binary) !== false);
    }

    if ($saved) {
        return 'uploads/' . $filename;
    }

    jsonResponse(false, "Gagal menyimpan file bukti pembayaran ke server.", null, 500);
    return null;
}

// Ambil pemetaan pekerjaan per karyawan pada periode tertentu
function fetchGajiEmployeeProjectsMap($pdo, $periode, $idKaryawan = 0) {
    $params = [$periode, $periode];
    $filterK = '';
    if ($idKaryawan > 0) {
        $filterK = 'WHERE src.id_karyawan = ?';
        $params[] = $idKaryawan;
    }

    $sql = "
        SELECT src.id_karyawan,
               GROUP_CONCAT(DISTINCT src.id_pekerjaan ORDER BY src.id_pekerjaan SEPARATOR ',') AS id_pekerjaan_list,
               GROUP_CONCAT(DISTINCT src.nama_pekerjaan ORDER BY src.nama_pekerjaan SEPARATOR ', ') AS nama_pekerjaan
        FROM (
            SELECT a.id_karyawan, p.id_pekerjaan, p.nama_pekerjaan
            FROM absensi a
            JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
            WHERE DATE_FORMAT(a.tanggal, '%Y-%m') = ?
            UNION
            SELECT pg.id_karyawan, p.id_pekerjaan, p.nama_pekerjaan
            FROM pengeluaran pg
            JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
            WHERE DATE_FORMAT(pg.tanggal, '%Y-%m') = ?
        ) src
        $filterK
        GROUP BY src.id_karyawan
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $map = [];
    foreach ($stmt->fetchAll() as $row) {
        $map[intval($row['id_karyawan'])] = [
            'id_pekerjaan_list' => $row['id_pekerjaan_list'] ?? '',
            'nama_pekerjaan' => $row['nama_pekerjaan'] ?? ''
        ];
    }
    return $map;
}

// Rincian jam kerja, reimbursement, dan agregasi per data pekerjaan untuk slip gaji
function fetchGajiJobBreakdown($pdo, $idKaryawan, $periode, $tarifOverride = null, $idPekerjaanFilter = 0) {
    $idKaryawan = intval($idKaryawan);
    $idPekerjaanFilter = intval($idPekerjaanFilter);

    $stmtK = $pdo->prepare("SELECT id_karyawan, nama, jabatan, tarif_per_jam FROM karyawan WHERE id_karyawan = ?");
    $stmtK->execute([$idKaryawan]);
    $karyawan = $stmtK->fetch() ?: null;

    $tarif = ($tarifOverride !== null && floatval($tarifOverride) > 0)
        ? floatval($tarifOverride)
        : floatval($karyawan['tarif_per_jam'] ?? 0);

    $durasiSql = getAbsensiDurationSelectSql('a');

    // 1. Ambil semua absensi karyawan di periode ini (disetujui & menunggu untuk breakdown per pekerjaan)
    $stmtAbsAll = $pdo->prepare("
        SELECT a.*,
               p.nama_pekerjaan,
               p.lokasi,
               p.status AS status_pekerjaan,
               p.tanggal_mulai,
               p.target_selesai,
               $durasiSql
        FROM absensi a
        JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
        WHERE a.id_karyawan = ?
          AND DATE_FORMAT(a.tanggal, '%Y-%m') = ?
        ORDER BY a.tanggal ASC, a.jam_masuk ASC
    ");
    $stmtAbsAll->execute([$idKaryawan, $periode]);
    $allAbsensi = $stmtAbsAll->fetchAll();

    // 2. Ambil semua pengeluaran pribadi karyawan di periode ini
    $stmtPgAll = $pdo->prepare("
        SELECT pg.*,
               p.nama_pekerjaan,
               p.lokasi,
               p.status AS status_pekerjaan,
               p.tanggal_mulai,
               p.target_selesai
        FROM pengeluaran pg
        JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
        WHERE pg.id_karyawan = ?
          AND pg.jenis_dana = 'pribadi'
          AND DATE_FORMAT(pg.tanggal, '%Y-%m') = ?
        ORDER BY pg.tanggal ASC, pg.id_pengeluaran ASC
    ");
    $stmtPgAll->execute([$idKaryawan, $periode]);
    $allPengeluaran = $stmtPgAll->fetchAll();

    // 3. Ambil daftar penugasan agar proyek aktif tetap terbaca di ringkasan pekerjaan
    $stmtAssign = $pdo->prepare("
        SELECT pn.id_pekerjaan, pn.peran_tugas,
               p.nama_pekerjaan, p.lokasi, p.status AS status_pekerjaan,
               p.tanggal_mulai, p.target_selesai
        FROM penugasan pn
        JOIN pekerjaan p ON pn.id_pekerjaan = p.id_pekerjaan
        WHERE pn.id_karyawan = ?
        ORDER BY p.id_pekerjaan DESC
    ");
    $stmtAssign->execute([$idKaryawan]);
    $assignments = $stmtAssign->fetchAll();

    $jobMap = [];
    $initJob = function ($idP, $row) use (&$jobMap, $tarif) {
        $idP = intval($idP);
        if (!isset($jobMap[$idP])) {
            $jobMap[$idP] = [
                'id_pekerjaan' => $idP,
                'nama_pekerjaan' => $row['nama_pekerjaan'] ?? 'Pekerjaan',
                'lokasi' => $row['lokasi'] ?? '',
                'status_pekerjaan' => $row['status_pekerjaan'] ?? 'berjalan',
                'tanggal_mulai' => $row['tanggal_mulai'] ?? null,
                'target_selesai' => $row['target_selesai'] ?? null,
                'peran_tugas' => $row['peran_tugas'] ?? null,
                'jumlah_sesi_disetujui' => 0,
                'jumlah_sesi_menunggu' => 0,
                'total_jam_disetujui' => 0.0,
                'tarif_jam' => $tarif,
                'estimasi_upah' => 0.0,
                'jumlah_nota' => 0,
                'reimbursement_disetujui' => 0.0,
                'reimbursement_sudah_diganti' => 0.0,
                'reimbursement_menunggu' => 0.0,
                'total_kontribusi' => 0.0
            ];
        } elseif (empty($jobMap[$idP]['peran_tugas']) && !empty($row['peran_tugas'])) {
            $jobMap[$idP]['peran_tugas'] = $row['peran_tugas'];
        }
    };

    foreach ($assignments as $as) {
        $initJob($as['id_pekerjaan'], $as);
    }

    $approvedAbsensi = [];
    $pendingAbsensiCount = 0;
    $pendingJamTotal = 0.0;

    foreach ($allAbsensi as $a) {
        $a['id_absensi'] = intval($a['id_absensi']);
        $a['id_pekerjaan'] = intval($a['id_pekerjaan']);
        $a['id_karyawan'] = intval($a['id_karyawan']);
        $a['durasi_jam'] = round(floatval($a['durasi_jam'] ?? 0), 2);
        $a['durasi_menit'] = intval($a['durasi_menit'] ?? 0);
        $a['upah_sesi'] = round($a['durasi_jam'] * $tarif, 2);

        $initJob($a['id_pekerjaan'], $a);
        $idP = $a['id_pekerjaan'];

        if ($a['status_verifikasi'] === 'disetujui' && !empty($a['jam_pulang'])) {
            $jobMap[$idP]['jumlah_sesi_disetujui']++;
            $jobMap[$idP]['total_jam_disetujui'] = round($jobMap[$idP]['total_jam_disetujui'] + $a['durasi_jam'], 2);
            if ($idPekerjaanFilter <= 0 || $idP === $idPekerjaanFilter) {
                $approvedAbsensi[] = $a;
            }
        } elseif ($a['status_verifikasi'] === 'menunggu') {
            $jobMap[$idP]['jumlah_sesi_menunggu']++;
            $pendingAbsensiCount++;
            $pendingJamTotal = round($pendingJamTotal + $a['durasi_jam'], 2);
        }
    }

    $approvedPengeluaran = [];
    $pendingPengeluaranCount = 0;
    $pendingNominalTotal = 0.0;

    foreach ($allPengeluaran as $pg) {
        $pg['id_pengeluaran'] = intval($pg['id_pengeluaran']);
        $pg['id_pekerjaan'] = intval($pg['id_pekerjaan']);
        $pg['id_karyawan'] = intval($pg['id_karyawan']);
        $pg['nominal'] = round(floatval($pg['nominal'] ?? 0), 2);

        $initJob($pg['id_pekerjaan'], $pg);
        $idP = $pg['id_pekerjaan'];

        if ($pg['status_verifikasi'] === 'disetujui') {
            $jobMap[$idP]['jumlah_nota']++;
            $jobMap[$idP]['reimbursement_disetujui'] = round($jobMap[$idP]['reimbursement_disetujui'] + $pg['nominal'], 2);
            if (($pg['status_ganti'] ?? 'belum') === 'sudah') {
                $jobMap[$idP]['reimbursement_sudah_diganti'] = round($jobMap[$idP]['reimbursement_sudah_diganti'] + $pg['nominal'], 2);
            }
            if ($idPekerjaanFilter <= 0 || $idP === $idPekerjaanFilter) {
                $approvedPengeluaran[] = $pg;
            }
        } elseif ($pg['status_verifikasi'] === 'menunggu') {
            $jobMap[$idP]['reimbursement_menunggu'] = round($jobMap[$idP]['reimbursement_menunggu'] + $pg['nominal'], 2);
            $pendingPengeluaranCount++;
            $pendingNominalTotal = round($pendingNominalTotal + $pg['nominal'], 2);
        }
    }

    $pekerjaanSummary = [];
    foreach ($jobMap as $job) {
        $hasActivity = (
            $job['jumlah_sesi_disetujui'] > 0 ||
            $job['jumlah_sesi_menunggu'] > 0 ||
            $job['jumlah_nota'] > 0 ||
            $job['reimbursement_menunggu'] > 0 ||
            $job['peran_tugas'] !== null
        );
        if (!$hasActivity) continue;
        $job['estimasi_upah'] = round($job['total_jam_disetujui'] * $tarif, 2);
        $job['total_kontribusi'] = round($job['estimasi_upah'] + $job['reimbursement_disetujui'], 2);
        $pekerjaanSummary[] = $job;
    }

    usort($pekerjaanSummary, function ($a, $b) {
        $cmp = $b['total_kontribusi'] <=> $a['total_kontribusi'];
        if ($cmp !== 0) return $cmp;
        return ($b['jumlah_sesi_disetujui'] + $b['jumlah_sesi_menunggu']) <=> ($a['jumlah_sesi_disetujui'] + $a['jumlah_sesi_menunggu']);
    });

    return [
        'karyawan' => $karyawan,
        'tarif_aktif' => $tarif,
        'absensi' => $approvedAbsensi,
        'pengeluaran' => $approvedPengeluaran,
        'pekerjaan_summary' => $pekerjaanSummary,
        'pending_summary' => [
            'absensi_menunggu' => $pendingAbsensiCount,
            'jam_menunggu' => $pendingJamTotal,
            'pengeluaran_menunggu' => $pendingPengeluaranCount,
            'nominal_menunggu' => $pendingNominalTotal
        ]
    ];
}
