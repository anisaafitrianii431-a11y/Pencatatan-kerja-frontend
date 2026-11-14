<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: CATAT PENGELUARAN & UPLOAD KWITANSI
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Login
$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
$kId = intval($currentUser['id_karyawan'] ?? 0);

if (!empty($_POST)) {
    $body = array_merge($body, $_POST);
}

// Tangani upload file bukti faktur kwitansi + kompresi server otomatis
$uploadedFilePath = null;
if (isset($_FILES['foto_kwitansi']) && $_FILES['foto_kwitansi']['error'] === UPLOAD_ERR_OK) {
    $file = $_FILES['foto_kwitansi'];
    $maxSize = 15 * 1024 * 1024; // 15 MB

    if ($file['size'] > $maxSize) {
        jsonResponse(false, "Ukuran file bukti faktur melebihi batas maksimal 15 MB.", null, 400);
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

    $filename = 'kwitansi_' . bin2hex(random_bytes(16)) . '.jpg';
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
        $uploadedFilePath = 'uploads/' . $filename;
        $body['foto_kwitansi'] = $uploadedFilePath;
    } else {
        jsonResponse(false, "Gagal mengunggah dan mengompresi file bukti faktur ke server.", null, 500);
    }
}

if ($method === 'GET') {
    $action = $_GET['action'] ?? '';

    // ==========================================
    // DANA KANTOR TERSEDIA UNTUK PEKERJA
    // ==========================================
    if (in_array($action, ['dana_tersedia', 'kas_tersedia'], true)) {
        $stmt = $pdo->query("
            SELECT d.*, 
                   k.nama AS nama_penanggung_jawab,
                   k.kode_karyawan AS kode_pj,
                   k.jabatan AS jabatan_pj,
                   p.nama_pekerjaan
            FROM dana_kantor d
            JOIN karyawan k ON d.id_penanggung_jawab = k.id_karyawan
            LEFT JOIN pekerjaan p ON d.id_pekerjaan = p.id_pekerjaan
            ORDER BY d.tanggal DESC, d.id_dana DESC
        ");
        $allDana = $stmt->fetchAll();
        $result = [];
        foreach ($allDana as $d) {
            $idDana = (int)$d['id_dana'];
            $idPj = (int)$d['id_penanggung_jawab'];

            $qUsed = $pdo->prepare("
                SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran 
                WHERE jenis_dana = 'kantor' AND status_verifikasi = 'disetujui'
                  AND (id_dana = ? OR (id_dana IS NULL AND id_penanggung_jawab = ? AND id_pekerjaan <=> ?))
            ");
            $qUsed->execute([$idDana, $idPj, $d['id_pekerjaan']]);
            $used = floatval($qUsed->fetchColumn());

            $qPending = $pdo->prepare("
                SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran
                WHERE jenis_dana = 'kantor' AND status_verifikasi = 'menunggu'
                  AND (id_dana = ? OR (id_dana IS NULL AND id_penanggung_jawab = ? AND id_pekerjaan <=> ?))
            ");
            $qPending->execute([$idDana, $idPj, $d['id_pekerjaan']]);
            $pending = floatval($qPending->fetchColumn());

            $qReturned = $pdo->prepare("
                SELECT IFNULL(SUM(nominal), 0) FROM pengembalian_dana 
                WHERE status_verifikasi = 'disetujui' AND id_dana = ?
            ");
            $qReturned->execute([$idDana]);
            $returned = floatval($qReturned->fetchColumn());

            $qPendingReturn = $pdo->prepare("
                SELECT IFNULL(SUM(nominal), 0) FROM pengembalian_dana
                WHERE status_verifikasi = 'menunggu' AND id_dana = ? AND id_penanggung_jawab = ?
            ");
            $qPendingReturn->execute([$idDana, $idPj]);
            $pendingReturn = floatval($qPendingReturn->fetchColumn());

            $sisa = max(0, floatval($d['nominal']) - $used - $returned);
            $result[] = array_merge($d, [
                'id_kas'     => $idDana,
                'id_karyawan'=> $idPj,
                'nominal_masuk' => floatval($d['nominal']),
                'nominal'    => floatval($d['nominal']),
                'terpakai'   => $used,
                'dikembalikan'=> $returned,
                'sisa_dana'  => $sisa,
                'total_terpakai_disetujui' => $used,
                'total_terpakai_menunggu' => $pending,
                'total_dikembalikan' => $returned,
                'menunggu_konfirmasi_kembali' => $pendingReturn,
                'sisa_resmi' => $sisa,
                'sisa_tersedia' => max(0, floatval($d['nominal']) - $used - $pending - $returned - $pendingReturn),
                'status_verifikasi' => 'disetujui',
                'status_lpj' => ($sisa <= 0 && $pending <= 0 && $pendingReturn <= 0) ? 'selesai' : 'berjalan',
                'nama_pekerjaan' => $d['nama_pekerjaan'] ?: 'Dana Umum'
            ]);
        }
        $kasSaya = array_values(array_filter($result, function ($item) use ($kId) {
            return (int)$item['id_karyawan'] === $kId;
        }));
        $stmtReturns = $pdo->prepare("SELECT pd.*, pd.id_dana AS id_kas FROM pengembalian_dana pd WHERE pd.id_penanggung_jawab = ? ORDER BY pd.tanggal DESC, pd.id_pengembalian DESC");
        $stmtReturns->execute([$kId]);
        $pengembalianSaya = $stmtReturns->fetchAll(PDO::FETCH_ASSOC);
        jsonResponse(true, "Daftar dana kantor tersedia", [
            'daftar_kas' => array_values(array_filter($result, function ($item) { return $item['sisa_dana'] > 0; })),
            'kas_tanggung_jawab_saya' => $kasSaya,
            'pengembalian_saya' => $pengembalianSaya
        ]);
    }

    // K-06: Pekerja hanya melihat pengeluaran pada proyek yang ditugaskan & dicatat dirinya
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $jenis_dana = $_GET['jenis_dana'] ?? '';

    $includeKasPj = ($_GET['include_kas_pj'] ?? '') === '1' && $jenis_dana === 'kantor';
    if ($includeKasPj) {
        $where = ["(pg.id_karyawan = ? OR pg.id_penanggung_jawab = ?)"];
        $params = [$kId, $kId];
    } else {
        $where = ["pg.id_karyawan = ?"];
        $params = [$kId];
    }

    if ($id_pekerjaan > 0) {
        $where[] = "pg.id_pekerjaan = ?";
        $params[] = $id_pekerjaan;
    }
    if (!empty($jenis_dana) && in_array($jenis_dana, ['pribadi', 'kantor'])) {
        $where[] = "pg.jenis_dana = ?";
        $params[] = $jenis_dana;
    }

    $whereClause = "WHERE " . implode(" AND ", $where);

    $sql = "
        SELECT pg.*, pg.id_dana AS id_kas,
               k.nama AS nama_karyawan,
               p.nama_pekerjaan,
               pj.nama AS nama_penanggung_jawab,
               pj.kode_karyawan AS kode_pj,
               d.sumber_dana
        FROM pengeluaran pg
        JOIN karyawan k ON pg.id_karyawan = k.id_karyawan
        JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
        LEFT JOIN karyawan pj ON pg.id_penanggung_jawab = pj.id_karyawan
        LEFT JOIN dana_kantor d ON pg.id_dana = d.id_dana
        $whereClause
        ORDER BY pg.tanggal DESC, pg.id_pengeluaran DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar pengeluaran saya berhasil dimuat (Karyawan)", $data);

} elseif ($method === 'POST') {
    $action = $_GET['action'] ?? $body['action'] ?? '';
    $id_pengeluaran = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);

    // ==========================================
    // 1. UPDATE PENGELUARAN (EDIT)
    // ==========================================
    if ($action === 'update' || $id_pengeluaran > 0) {
        $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal = floatval($body['nominal'] ?? 0);
        $jenis_dana = $body['jenis_dana'] ?? 'pribadi';
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_pengeluaran <= 0 || $nominal <= 0 || $id_pekerjaan <= 0) {
            jsonResponse(false, "Pekerjaan, Nominal, dan ID Pengeluaran wajib valid", null, 400);
        }

        // Cek data lama
        $stmtCheck = $pdo->prepare("SELECT * FROM pengeluaran WHERE id_pengeluaran = ?");
        $stmtCheck->execute([$id_pengeluaran]);
        $existing = $stmtCheck->fetch();

        if (!$existing) {
            jsonResponse(false, "Data pengeluaran tidak ditemukan", null, 404);
        }

        if (intval($existing['id_karyawan']) !== $kId) {
            jsonResponse(false, "Anda tidak memiliki izin mengedit pengeluaran milik pekerja lain.", null, 403);
        }

        if ($existing['status_verifikasi'] === 'disetujui' || $existing['status_ganti'] === 'sudah') {
            jsonResponse(false, "Pengeluaran yang telah disetujui atau sudah diganti tidak dapat diubah lagi untuk mencegah risiko kecurangan.", null, 400);
        }

        // Jika ada foto baru gunakan foto baru, jika tidak gunakan foto lama
        $foto_kwitansi = !empty($uploadedFilePath) ? $uploadedFilePath : $existing['foto_kwitansi'];

        $stmt = $pdo->prepare("
            UPDATE pengeluaran 
            SET id_pekerjaan = ?, tanggal = ?, nominal = ?, jenis_dana = ?, keterangan = ?, foto_kwitansi = ?, status_verifikasi = 'menunggu'
            WHERE id_pengeluaran = ? AND id_karyawan = ?
        ");
        $stmt->execute([$id_pekerjaan, $tanggal, $nominal, $jenis_dana, $keterangan, $foto_kwitansi, $id_pengeluaran, $kId]);

        jsonResponse(true, "Catatan pengeluaran berhasil diperbarui dan diajukan ulang ke admin!", [
            "id_pengeluaran" => $id_pengeluaran,
            "foto_kwitansi" => $foto_kwitansi
        ]);
    }

    // ==========================================
    // 2. FORM PENGEMBALIAN DANA OLEH PEKERJA
    // ==========================================
    if ($action === 'pengembalian') {
        $id_dana = intval($body['id_dana'] ?? $body['id_kas'] ?? 0);
        $id_penanggung_jawab = intval($body['id_penanggung_jawab'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal = floatval($body['nominal'] ?? 0);
        $penerima = trim($body['penerima_pengembalian'] ?? 'Administrator');
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');
        $bukti = trim($body['bukti_pengembalian'] ?? '');

        if (!empty($uploadedFilePath)) {
            $bukti = $uploadedFilePath;
        }

        if ($id_dana <= 0 || $nominal <= 0) {
            jsonResponse(false, "Paket dana dan nominal pengembalian wajib diisi dengan benar.", null, 400);
        }

        $stmtD = $pdo->prepare("SELECT id_penanggung_jawab, id_pekerjaan, nominal FROM dana_kantor WHERE id_dana = ?");
        $stmtD->execute([$id_dana]);
        $dana = $stmtD->fetch(PDO::FETCH_ASSOC);
        if (!$dana) {
            jsonResponse(false, "Paket dana kantor tidak ditemukan.", null, 404);
        }
        $id_penanggung_jawab = intval($dana['id_penanggung_jawab'] ?? 0);
        if ($id_penanggung_jawab !== $kId) {
            jsonResponse(false, "Hanya penanggung jawab paket yang dapat mengajukan pengembalian dana ini.", null, 403);
        }

        $stmtUsed = $pdo->prepare("SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran WHERE jenis_dana = 'kantor' AND status_verifikasi = 'disetujui' AND (id_dana = ? OR (id_dana IS NULL AND id_penanggung_jawab = ? AND id_pekerjaan <=> ?))");
        $stmtUsed->execute([$id_dana, $id_penanggung_jawab, $dana['id_pekerjaan']]);
        $used = floatval($stmtUsed->fetchColumn());
        $stmtReturned = $pdo->prepare("SELECT IFNULL(SUM(nominal), 0) FROM pengembalian_dana WHERE id_dana = ? AND status_verifikasi = 'disetujui'");
        $stmtReturned->execute([$id_dana]);
        $returned = floatval($stmtReturned->fetchColumn());
        $stmtPending = $pdo->prepare("SELECT IFNULL(SUM(nominal), 0) FROM pengembalian_dana WHERE id_dana = ? AND status_verifikasi = 'menunggu'");
        $stmtPending->execute([$id_dana]);
        $pendingReturn = floatval($stmtPending->fetchColumn());
        $sisaBisaDisetor = max(0, floatval($dana['nominal']) - $used - $returned - $pendingReturn);
        if ($nominal > $sisaBisaDisetor + 0.01) {
            jsonResponse(false, "Nominal pengembalian melebihi sisa dana yang tersedia (Rp " . number_format($sisaBisaDisetor, 0, ',', '.') . ").", null, 400);
        }

        $stmt = $pdo->prepare("
            INSERT INTO pengembalian_dana (id_dana, id_karyawan, id_penanggung_jawab, tanggal, nominal, penerima_pengembalian, keterangan, bukti_pengembalian, status_verifikasi)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu')
        ");
        $stmt->execute([$id_dana, $kId, $id_penanggung_jawab, $tanggal, $nominal, $penerima, $keterangan, $bukti]);

        jsonResponse(true, "Pengembalian dana berhasil diajukan dan menunggu verifikasi Admin!", [
            'id_pengembalian' => $pdo->lastInsertId()
        ], 201);
    }

    // ==========================================
    // 3. CREATE PENGELUARAN (BARU)
    // ==========================================
    $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
    $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
    $nominal = floatval($body['nominal'] ?? 0);
    $kategori = trim($body['kategori'] ?? 'operasional');
    $jenis_dana = $body['jenis_dana'] ?? 'pribadi';
    $id_dana = !empty($body['id_dana']) ? intval($body['id_dana']) : null;
    $id_penanggung_jawab = !empty($body['id_penanggung_jawab']) ? intval($body['id_penanggung_jawab']) : null;
    $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');
    $foto_kwitansi = trim($body['foto_kwitansi'] ?? '');

    if (!empty($uploadedFilePath)) {
        $foto_kwitansi = $uploadedFilePath;
    }

    if ($id_pekerjaan <= 0 || $nominal <= 0) {
        jsonResponse(false, "Pekerjaan dan Nominal pengeluaran wajib valid", null, 400);
    }

    if (!in_array($jenis_dana, ['kantor', 'pribadi'])) {
        jsonResponse(false, "Jenis dana harus 'kantor' atau 'pribadi'", null, 400);
    }

    // Jika dana kantor, validasi relasi dana kantor & penanggung jawab
    if ($jenis_dana === 'kantor') {
        if (!$id_dana) {
            jsonResponse(false, "Pilih penanggung jawab atau kas kantor yang sudah ditetapkan Admin.", null, 400);
        }
        if ($id_dana) {
            $stmtD = $pdo->prepare("SELECT id_penanggung_jawab, id_pekerjaan FROM dana_kantor WHERE id_dana = ?");
            $stmtD->execute([$id_dana]);
            $danaTerpilih = $stmtD->fetch(PDO::FETCH_ASSOC);
            if (!$danaTerpilih) {
                jsonResponse(false, "Data kas kantor yang dipilih tidak ditemukan.", null, 400);
            }
            if (!empty($danaTerpilih['id_pekerjaan']) && (int)$danaTerpilih['id_pekerjaan'] !== $id_pekerjaan) {
                jsonResponse(false, "Kas kantor yang dipilih bukan untuk pekerjaan ini.", null, 400);
            }
            $id_penanggung_jawab = intval($danaTerpilih['id_penanggung_jawab'] ?: 0);
        }
    } else {
        $id_dana = null;
        $id_penanggung_jawab = null;
    }

    // F-04: Cek status pekerjaan tidak boleh 'selesai'
    $stmtJob = $pdo->prepare("SELECT status FROM pekerjaan WHERE id_pekerjaan = ?");
    $stmtJob->execute([$id_pekerjaan]);
    $job = $stmtJob->fetch();
    if (!$job) {
        jsonResponse(false, "Pekerjaan tidak ditemukan", null, 404);
    }
    if ($job['status'] === 'selesai') {
        jsonResponse(false, "Pekerjaan ini sudah selesai. Tidak dapat menambah catatan pengeluaran.", null, 400);
    }

    // F-04: Validasi bahwa pekerja ditugaskan pada pekerjaan ini
    $stmtPenugasan = $pdo->prepare("SELECT COUNT(*) FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan = ?");
    $stmtPenugasan->execute([$id_pekerjaan, $kId]);
    if ($stmtPenugasan->fetchColumn() == 0) {
        jsonResponse(false, "Anda tidak ditugaskan pada pekerjaan ini, sehingga tidak dapat mencatat pengeluaran.", null, 403);
    }

    $stmt = $pdo->prepare("
        INSERT INTO pengeluaran (id_pekerjaan, id_karyawan, tanggal, nominal, kategori, jenis_dana, id_dana, id_penanggung_jawab, keterangan, foto_kwitansi, status_verifikasi, status_ganti)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', 'belum')
    ");
    $stmt->execute([$id_pekerjaan, $kId, $tanggal, $nominal, $kategori, $jenis_dana, $id_dana, $id_penanggung_jawab, $keterangan, $foto_kwitansi]);

    jsonResponse(true, "Pengeluaran berhasil dicatat!", [
        "id_pengeluaran" => $pdo->lastInsertId(),
        "foto_kwitansi" => $foto_kwitansi
    ], 201);

} elseif ($method === 'DELETE') {
    $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
    $stmtCheck = $pdo->prepare("SELECT id_karyawan, status_verifikasi, status_ganti FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmtCheck->execute([$id]);
    $item = $stmtCheck->fetch();

    if (!$item) {
        jsonResponse(false, "Data pengeluaran tidak ditemukan", null, 404);
    }

    if (intval($item['id_karyawan']) !== $kId) {
        jsonResponse(false, "Anda tidak memiliki izin menghapus pengeluaran milik pekerja lain.", null, 403);
    }

    if ($item['status_verifikasi'] === 'disetujui' || $item['status_ganti'] === 'sudah') {
        jsonResponse(false, "Pengeluaran yang telah disetujui atau sudah diganti tidak dapat dihapus oleh pekerja untuk mencegah risiko kecurangan.", null, 403);
    }

    $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmt->execute([$id]);
    jsonResponse(true, "Catatan pengeluaran berhasil dihapus!");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

