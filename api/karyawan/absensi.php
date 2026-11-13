<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: ABSENSI KERJA (KAMERA LANGSUNG + GPS)
// ==========================================================
require_once __DIR__ . '/../config/database.php';

ensureAbsensiSchema($pdo);

// Otorisasi: Wajib Login
$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
$kId = intval($currentUser['id_karyawan'] ?? 0);

function storeAbsensiPhoto($base64Input, $fileField, $prefix = 'absensi_') {
    $uploadDir = __DIR__ . '/../uploads/';
    if (!is_dir($uploadDir)) {
        @mkdir($uploadDir, 0755, true);
    }

    if (!empty($base64Input) && preg_match('/^data:image\/(\w+);base64,/', $base64Input, $matches)) {
        $ext = strtolower($matches[1]);
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $ext = 'jpg';
        }
        $base64Data = substr($base64Input, strpos($base64Input, ',') + 1);
        $decoded = base64_decode($base64Data);
        if ($decoded !== false) {
            $fileName = $prefix . bin2hex(random_bytes(16)) . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
            if (@file_put_contents($uploadDir . $fileName, $decoded)) {
                return 'uploads/' . $fileName;
            }
        }
        return null;
    }

    if (isset($_FILES[$fileField]) && $_FILES[$fileField]['error'] === UPLOAD_ERR_OK) {
        $origName = $_FILES[$fileField]['name'] ?? 'foto.jpg';
        $ext = strtolower(pathinfo($origName, PATHINFO_EXTENSION)) ?: 'jpg';
        if (!in_array($ext, ['jpg', 'jpeg', 'png', 'webp'], true)) {
            $ext = 'jpg';
        }
        $fileName = $prefix . bin2hex(random_bytes(16)) . '.' . ($ext === 'jpeg' ? 'jpg' : $ext);
        if (@move_uploaded_file($_FILES[$fileField]['tmp_name'], $uploadDir . $fileName)) {
            return 'uploads/' . $fileName;
        }
    }

    return null;
}

if ($method === 'GET') {
    if (($_GET['action'] ?? '') === 'ntp_time') {
        $ntpTime = getAuthoritativeJakartaTime(true);
        jsonResponse(true, "Waktu NTP Asia/Jakarta berhasil diambil", $ntpTime);
    }

    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $id_absensi = isset($_GET['id_absensi']) ? intval($_GET['id_absensi']) : 0;
    $tanggal = $_GET['tanggal'] ?? '';
    $status_verifikasi = $_GET['status_verifikasi'] ?? '';

    $where = ["a.id_karyawan = ?"];
    $params = [$kId];

    if ($id_absensi > 0) {
        $where[] = "a.id_absensi = ?";
        $params[] = $id_absensi;
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

    $whereClause = "WHERE " . implode(" AND ", $where);
    $sqlDurasi = getAbsensiDurationSelectSql('a');

    $sql = "
        SELECT a.*,
               k.nama AS nama_karyawan, k.jabatan,
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
            jsonResponse(false, "Data absensi tidak ditemukan", null, 404);
        }
        jsonResponse(true, "Detail absensi berhasil dimuat", $rows[0]);
    }

    jsonResponse(true, "Riwayat absensi saya berhasil dimuat (Karyawan)", $rows);

} elseif ($method === 'POST') {
    $action = $_GET['action'] ?? $body['action'] ?? '';
    $ntpTime = getAuthoritativeJakartaTime(true);
    $todayJakarta = $ntpTime['tanggal'];
    $nowTimeJakarta = $ntpTime['jam'];

    // 1. ABSEN MASUK (Menunggu approval admin berdasarkan titik lokasi & foto kamera langsung)
    if ($action === 'masuk') {
        $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
        // Tanggal dan jam masuk WAJIB dari waktu NTP server (abaikan jam dari perangkat klien)
        $tanggal = $todayJakarta;
        $jam_masuk = $nowTimeJakarta;
        $catatan = htmlspecialchars(trim($body['catatan'] ?? ''), ENT_QUOTES, 'UTF-8');
        $titik_lokasi = trim($body['titik_lokasi'] ?? '');
        $fotoInput = trim($body['foto_lokasi'] ?? '');

        if ($id_pekerjaan <= 0) {
            jsonResponse(false, "Pekerjaan wajib dipilih terlebih dahulu.", null, 400);
        }

        $stmtJob = $pdo->prepare("SELECT id_pekerjaan, status, titik_lokasi, lokasi, nama_pekerjaan FROM pekerjaan WHERE id_pekerjaan = ?");
        $stmtJob->execute([$id_pekerjaan]);
        $jobData = $stmtJob->fetch();
        if (!$jobData) {
            jsonResponse(false, "Data pekerjaan tidak ditemukan dalam sistem.", null, 404);
        }
        if ($jobData['status'] === 'selesai') {
            jsonResponse(false, "Pekerjaan ini sudah berstatus selesai dan tidak dapat menerima absensi baru.", null, 422);
        }
        if ($jobData['status'] === 'belum_mulai') {
            // Aktifkan otomatis pekerjaan menjadi 'berjalan' saat karyawan ditugaskan melakukan absensi
            $pdo->prepare("UPDATE pekerjaan SET status = 'berjalan' WHERE id_pekerjaan = ?")->execute([$id_pekerjaan]);
            $jobData['status'] = 'berjalan';
        }
        if ($jobData['status'] !== 'berjalan') {
            jsonResponse(false, "Absensi terkunci: pekerjaan harus berstatus Sedang Berjalan.", null, 422);
        }

        $cekTugas = $pdo->prepare("SELECT id_penugasan FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan = ?");
        $cekTugas->execute([$id_pekerjaan, $kId]);
        if (!$cekTugas->fetch()) {
            jsonResponse(false, "Akses ditolak: Anda belum ditugaskan ke pekerjaan ini.", null, 403);
        }

        $cekAktif = $pdo->prepare("
            SELECT id_absensi FROM absensi
            WHERE id_pekerjaan = ? AND id_karyawan = ? AND jam_pulang IS NULL
        ");
        $cekAktif->execute([$id_pekerjaan, $kId]);
        if ($cekAktif->fetch()) {
            jsonResponse(false, "Anda masih memiliki sesi kerja aktif yang belum absen pulang pada pekerjaan ini.", null, 409);
        }

        $cekSelesaiHariIni = $pdo->prepare("
            SELECT id_absensi
            FROM absensi
            WHERE id_pekerjaan = ?
              AND id_karyawan = ?
              AND tanggal = ?
              AND jam_masuk IS NOT NULL
              AND jam_pulang IS NOT NULL
            LIMIT 1
        ");
        $cekSelesaiHariIni->execute([$id_pekerjaan, $kId, $tanggal]);
        if ($cekSelesaiHariIni->fetch()) {
            jsonResponse(false, "Absensi masuk dan pulang untuk pekerjaan ini sudah selesai pada hari & tanggal ini ({$tanggal}). Absensi terbuka kembali pada hari berikutnya.", null, 409);
        }

        $parsedCoord = parseCoordinates($titik_lokasi);
        if (!$parsedCoord) {
            jsonResponse(false, "Titik lokasi GPS wajib terdeteksi secara valid. Aktifkan izin lokasi di browser Anda.", null, 400);
        }
        $normalizedCoord = sprintf('%.6f, %.6f', $parsedCoord[0], $parsedCoord[1]);

        $fotoSaved = storeAbsensiPhoto($fotoInput, 'foto_lokasi', 'absensi_masuk_');
        if (!$fotoSaved) {
            jsonResponse(false, "Foto kamera langsung di lokasi pekerjaan wajib diambil untuk bukti absensi.", null, 400);
        }

        $jarakMasuk = calculateDistanceMeters($normalizedCoord, $jobData['titik_lokasi'] ?? '');

        $stmt = $pdo->prepare("
            INSERT INTO absensi (id_pekerjaan, id_karyawan, tanggal, jam_masuk, status_verifikasi, catatan, titik_lokasi, foto_lokasi, jarak_masuk)
            VALUES (?, ?, ?, ?, 'menunggu', ?, ?, ?, ?)
        ");
        $stmt->execute([$id_pekerjaan, $kId, $tanggal, $jam_masuk, $catatan, $normalizedCoord, $fotoSaved, $jarakMasuk]);
        $newId = intval($pdo->lastInsertId());

        $radiusNote = '';
        if ($jarakMasuk !== null) {
            $radiusNote = $jarakMasuk <= 150
                ? " Posisi GPS Anda sesuai titik lokasi pekerjaan ({$jarakMasuk} m)."
                : " Catatan: posisi GPS berjarak {$jarakMasuk} m dari titik pekerjaan (> 150 m) dan akan ditinjau Admin.";
        }

        jsonResponse(true, "Absen masuk berhasil dikirim dengan foto kamera langsung & GPS! Menunggu persetujuan Admin.{$radiusNote}", [
            "id_absensi" => $newId,
            "id_pekerjaan" => $id_pekerjaan,
            "id_karyawan" => $kId,
            "tanggal" => $tanggal,
            "jam_masuk" => $jam_masuk,
            "titik_lokasi" => $normalizedCoord,
            "foto_lokasi" => $fotoSaved,
            "jarak_masuk" => $jarakMasuk,
            "sesuai_titik_masuk" => $jarakMasuk !== null ? ($jarakMasuk <= 150) : null,
            "status_verifikasi" => "menunggu",
            "waktu_sumber" => $ntpTime['source'],
            "ntp_server" => $ntpTime['ntp_server'],
        ], 201);

    // 2. ABSEN PULANG (Rekam foto kamera + GPS pulang & menunggu persetujuan Admin)
    } elseif ($action === 'pulang') {
        $id_absensi = intval($body['id_absensi'] ?? 0);
        // Jam pulang WAJIB dari waktu NTP server (abaikan jam dari perangkat klien)
        $jam_pulang = $nowTimeJakarta;
        $isOvernight = !empty($body['is_overnight']);
        $titikPulang = trim($body['titik_pulang'] ?? $body['titik_lokasi'] ?? '');
        $fotoInput = trim($body['foto_pulang'] ?? $body['foto_lokasi'] ?? '');

        if ($id_absensi <= 0) {
            jsonResponse(false, "ID absensi tidak valid.", null, 400);
        }

        $parsedCoord = parseCoordinates($titikPulang);
        if (!$parsedCoord) {
            jsonResponse(false, "Titik lokasi GPS wajib terdeteksi saat absen pulang.", null, 400);
        }
        $normalizedCoord = sprintf('%.6f, %.6f', $parsedCoord[0], $parsedCoord[1]);

        $fotoSaved = storeAbsensiPhoto($fotoInput, 'foto_pulang', 'absensi_pulang_');
        if (!$fotoSaved) {
            $fotoSaved = storeAbsensiPhoto($fotoInput, 'foto_lokasi', 'absensi_pulang_');
        }
        if (!$fotoSaved) {
            jsonResponse(false, "Foto kamera langsung saat absen pulang wajib diambil.", null, 400);
        }

        $stmtCek = $pdo->prepare("
            SELECT a.*, p.titik_lokasi AS titik_pekerjaan
            FROM absensi a
            JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
            WHERE a.id_absensi = ? AND a.id_karyawan = ?
        ");
        $stmtCek->execute([$id_absensi, $kId]);
        $row = $stmtCek->fetch();

        if (!$row) {
            jsonResponse(false, "Data absensi tidak ditemukan atau bukan milik Anda.", null, 404);
        }
        if (!empty($row['jam_pulang'])) {
            jsonResponse(false, "Sesi absensi ini sudah mencatat jam pulang.", null, 409);
        }

        $jamMasukSec = strtotime($row['jam_masuk']);
        $jamPulangSec = strtotime($jam_pulang);

        if (!$isOvernight && $jamPulangSec < $jamMasukSec) {
            if (($row['tanggal'] ?? '') < $todayJakarta) {
                $isOvernight = true;
            } else {
                jsonResponse(false, "Jam pulang ({$jam_pulang}) lebih kecil dari jam masuk ({$row['jam_masuk']}). Centang 'Shift Malam' jika bekerja melewati tengah malam.", null, 400);
            }
        }

        $durasiDetik = $jamPulangSec - $jamMasukSec;
        if ($isOvernight && $jamPulangSec < $jamMasukSec) {
            $durasiDetik += 86400;
        }
        $durasiJam = round(max(0, $durasiDetik) / 3600, 2);
        $durasiMenit = intval(floor(max(0, $durasiDetik) / 60));
        $jarakPulang = calculateDistanceMeters($normalizedCoord, $row['titik_pekerjaan'] ?? '');

        $stmtUpdate = $pdo->prepare("
            UPDATE absensi
            SET jam_pulang = ?,
                foto_pulang = ?,
                titik_pulang = ?,
                jarak_pulang = ?,
                status_verifikasi = CASE WHEN status_verifikasi = 'ditolak' THEN 'ditolak' ELSE 'menunggu' END
            WHERE id_absensi = ?
        ");
        $stmtUpdate->execute([$jam_pulang, $fotoSaved, $normalizedCoord, $jarakPulang, $id_absensi]);

        jsonResponse(true, "Absen pulang berhasil dicatat dengan foto & GPS ({$durasiJam} jam)! Menunggu persetujuan Admin.", [
            "id_absensi" => $id_absensi,
            "durasi_jam" => $durasiJam,
            "durasi_menit" => $durasiMenit,
            "jam_pulang" => $jam_pulang,
            "tanggal_pulang" => $todayJakarta,
            "titik_pulang" => $normalizedCoord,
            "foto_pulang" => $fotoSaved,
            "jarak_pulang" => $jarakPulang,
            "sesuai_titik_pulang" => $jarakPulang !== null ? ($jarakPulang <= 150) : null,
            "status_verifikasi" => $row['status_verifikasi'] === 'ditolak' ? 'ditolak' : 'menunggu',
            "waktu_sumber" => $ntpTime['source'],
            "ntp_server" => $ntpTime['ntp_server'],
        ]);
    } else {
        jsonResponse(false, "Aksi absensi karyawan tidak valid", null, 400);
    }
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}
