<?php
// ==========================================================
// BACKEND KHUSUS KARYAWAN: CATAT PENGELUARAN, KAS KANTOR & KUITANSI
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Login
$currentUser = requireLogin();
ensureKasKantorSchema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
$kId = intval($currentUser['id_karyawan'] ?? 0);

if (!empty($_POST)) {
    $body = array_merge($body, $_POST);
}

$action = $_GET['action'] ?? $body['action'] ?? '';

// Helper validasi sumber dana kantor & penanggung jawab sebelum simpan/ubah nota
function validateKasKantorForExpense($pdo, $idKas, $idPekerjaan, $nominal, $excludePengeluaranId = 0) {
    if ($idKas <= 0) {
        jsonResponse(false, "Untuk sumber dana Uang Kantor, Anda wajib memilih penanggung jawab uang kantor.", null, 400);
    }

    $kasRows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$idKas]);
    if (empty($kasRows)) {
        jsonResponse(false, "Data penanggung jawab dana kantor tidak ditemukan.", null, 404);
    }
    $kas = $kasRows[0];

    if (($kas['status_verifikasi'] ?? 'disetujui') !== 'disetujui') {
        jsonResponse(false, "Pemasukan kas kantor pada penanggung jawab ini belum disetujui Admin.", null, 400);
    }

    if ($kas['status_lpj'] === 'selesai') {
        jsonResponse(false, "Dana kantor pada penanggung jawab ini sudah ditutup (LPJ selesai). Pilih penanggung jawab lain.", null, 400);
    }

    if ($kas['id_pekerjaan'] !== null && intval($kas['id_pekerjaan']) !== intval($idPekerjaan)) {
        jsonResponse(false, "Dana kantor pada penanggung jawab ini khusus untuk proyek lain ({$kas['nama_pekerjaan']}).", null, 400);
    }

    return $kas;
}

if ($method === 'GET') {
    // 1. DAFTAR PENANGGUNG JAWAB DANA KANTOR & TANGGUNG JAWAB LPJ SAYA
    if ($action === 'kas_tersedia') {
        $rawDaftarKas = fetchKasKantorList(
            $pdo,
            "WHERE kk.status_verifikasi = 'disetujui' AND kk.status_lpj = 'berjalan'",
            [],
            "(kk.id_karyawan = " . intval($kId) . ") DESC, k.nama ASC, kk.id_kas DESC"
        );

        // Hanya kembalikan identitas Penanggung Jawab tanpa mengekspos nominal kas ke form pengeluaran pekerja
        $daftarKas = array_map(function ($r) {
            return [
                "id_kas" => $r['id_kas'],
                "id_pekerjaan" => $r['id_pekerjaan'],
                "id_karyawan" => $r['id_karyawan'],
                "nama_penanggung_jawab" => $r['nama_penanggung_jawab'],
                "jabatan_penanggung_jawab" => $r['jabatan_penanggung_jawab'],
                "nama_pekerjaan" => $r['nama_pekerjaan'],
                "tanggal" => $r['tanggal'],
                "status_lpj" => $r['status_lpj'],
                "status_verifikasi" => $r['status_verifikasi'] ?? 'disetujui'
            ];
        }, $rawDaftarKas);

        $kasSaya = fetchKasKantorList(
            $pdo,
            "WHERE kk.id_karyawan = ? AND kk.status_verifikasi = 'disetujui'",
            [$kId],
            "kk.tanggal DESC, kk.id_kas DESC"
        );

        $stmtPk = $pdo->prepare("
            SELECT kp.*, kk.keterangan AS keterangan_kas, p.nama_pekerjaan
            FROM kas_kantor_pengembalian kp
            JOIN kas_kantor kk ON kp.id_kas = kk.id_kas
            LEFT JOIN pekerjaan p ON kk.id_pekerjaan = p.id_pekerjaan
            WHERE kk.id_karyawan = ? OR kp.id_karyawan = ?
            ORDER BY kp.tanggal DESC, kp.id_pengembalian DESC
        ");
        $stmtPk->execute([$kId, $kId]);
        $pengembalianSaya = $stmtPk->fetchAll();

        jsonResponse(true, "Data kas kantor tersedia berhasil dimuat", [
            "daftar_kas" => $daftarKas,
            "kas_tanggung_jawab_saya" => $kasSaya,
            "pengembalian_saya" => $pengembalianSaya
        ]);
    }

    // 2. DAFTAR PENGELUARAN SAYA (Opsional sertakan pengeluaran rekan yang memakai kas PJ saya)
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $jenis_dana = $_GET['jenis_dana'] ?? '';
    $includeKasPj = isset($_GET['include_kas_pj']) && $_GET['include_kas_pj'] == '1';

    $where = $includeKasPj ? ["(pg.id_karyawan = ? OR kk.id_karyawan = ?)"] : ["pg.id_karyawan = ?"];
    $params = $includeKasPj ? [$kId, $kId] : [$kId];

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
        SELECT pg.*,
               k.nama AS nama_karyawan,
               p.nama_pekerjaan,
               kk.id_karyawan AS id_penanggung_jawab,
               pj.nama AS nama_penanggung_jawab,
               kk.keterangan AS keterangan_kas,
               kk.tanggal AS tanggal_kas,
               NULL AS nominal_kas
        FROM pengeluaran pg
        JOIN karyawan k ON pg.id_karyawan = k.id_karyawan
        JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
        LEFT JOIN kas_kantor kk ON pg.id_kas = kk.id_kas
        LEFT JOIN karyawan pj ON kk.id_karyawan = pj.id_karyawan
        $whereClause
        ORDER BY pg.tanggal DESC, pg.id_pengeluaran DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    jsonResponse(true, "Daftar pengeluaran saya berhasil dimuat (Karyawan)", $data);

} elseif ($method === 'POST') {
    $id_pengeluaran = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);

    // ==========================================
    // 0A-0B. MENU PEMASUKAN & KAS KANTOR KHUSUS ADMIN
    // ==========================================
    if (in_array($action, ['create_kas', 'update_kas', 'delete_kas'])) {
        jsonResponse(false, "Menu Pemasukan & Kas Kantor hanya dapat diakses oleh Administrator.", null, 403);

    // ==========================================
    // 0C. SETOR / KEMBALIKAN SISA DANA KANTOR
    // ==========================================
    } elseif ($action === 'setor_sisa') {
        $id_kas = intval($body['id_kas'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal = floatval($body['nominal'] ?? 0);
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_kas <= 0 || $nominal <= 0) {
            jsonResponse(false, "Paket kas kantor dan nominal pengembalian sisa wajib valid (> 0).", null, 400);
        }

        $kasRows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$id_kas]);
        if (empty($kasRows)) {
            jsonResponse(false, "Data kas kantor tidak ditemukan.", null, 404);
        }
        $kas = $kasRows[0];

        if (($kas['status_verifikasi'] ?? 'disetujui') !== 'disetujui') {
            jsonResponse(false, "Pemasukan kas kantor ini belum disetujui Admin.", null, 400);
        }

        if (intval($kas['id_karyawan']) !== $kId) {
            jsonResponse(false, "Hanya penanggung jawab dana ini atau Admin yang dapat mencatat pengembalian sisa kas.", null, 403);
        }

        $maksSetor = max(0, $kas['sisa_resmi'] - $kas['menunggu_konfirmasi_kembali']);
        if ($nominal > ($maksSetor + 0.01)) {
            jsonResponse(false, "Nominal setoran sisa melebihi sisa dana yang dapat disetor (maksimal Rp " . number_format($maksSetor, 0, ',', '.') . ").", null, 400);
        }

        $bukti_foto = uploadReceiptImage(['bukti_foto', 'foto_bukti'], 'sisa_');

        $stmt = $pdo->prepare("
            INSERT INTO kas_kantor_pengembalian (id_kas, id_karyawan, tanggal, nominal, keterangan, bukti_foto, status_konfirmasi)
            VALUES (?, ?, ?, ?, ?, ?, 'menunggu')
        ");
        $stmt->execute([
            $id_kas,
            $kId,
            $tanggal,
            $nominal,
            $keterangan ?: 'Pengembalian sisa dana kantor oleh Penanggung Jawab',
            $bukti_foto
        ]);

        jsonResponse(true, "Pengajuan pengembalian sisa dana kantor berhasil dikirim! Menunggu konfirmasi Admin.", [
            "id_pengembalian" => intval($pdo->lastInsertId())
        ], 201);
    }

    // Tangani upload bukti kuitansi
    $uploadedFilePath = uploadReceiptImage(['foto_kuitansi', 'foto_kwitansi'], 'kuitansi_');
    if ($uploadedFilePath) {
        $body['foto_kwitansi'] = $uploadedFilePath;
    }

    // ==========================================
    // 1. UPDATE PENGELUARAN (EDIT)
    // ==========================================
    if ($action === 'update' || $id_pengeluaran > 0) {
        $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal = floatval($body['nominal'] ?? 0);
        $jenis_dana = $body['jenis_dana'] ?? 'pribadi';
        $id_kas = ($jenis_dana === 'kantor') ? intval($body['id_kas'] ?? 0) : null;
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_pengeluaran <= 0 || $nominal <= 0 || $id_pekerjaan <= 0) {
            jsonResponse(false, "Pekerjaan, Nominal, dan ID Pengeluaran wajib valid", null, 400);
        }
        if (!in_array($jenis_dana, ['kantor', 'pribadi'])) {
            jsonResponse(false, "Jenis dana harus 'kantor' atau 'pribadi'", null, 400);
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

        if ($existing['status_verifikasi'] === 'disetujui' || ($existing['jenis_dana'] === 'pribadi' && $existing['status_ganti'] === 'sudah')) {
            jsonResponse(false, "Pengeluaran yang telah disetujui atau sudah dikembalikan tidak dapat diubah lagi untuk mencegah risiko kecurangan.", null, 400);
        }

        if ($jenis_dana === 'kantor') {
            validateKasKantorForExpense($pdo, $id_kas, $id_pekerjaan, $nominal, $id_pengeluaran);
        } else {
            $id_kas = null;
        }

        $foto_kwitansi = !empty($uploadedFilePath) ? $uploadedFilePath : $existing['foto_kwitansi'];

        $stmt = $pdo->prepare("
            UPDATE pengeluaran 
            SET id_pekerjaan = ?, tanggal = ?, nominal = ?, jenis_dana = ?, id_kas = ?, keterangan = ?, foto_kwitansi = ?, status_verifikasi = 'menunggu'
            WHERE id_pengeluaran = ? AND id_karyawan = ?
        ");
        $stmt->execute([$id_pekerjaan, $tanggal, $nominal, $jenis_dana, $id_kas, $keterangan, $foto_kwitansi, $id_pengeluaran, $kId]);

        jsonResponse(true, "Catatan pengeluaran berhasil diperbarui dan diajukan ulang ke admin!", [
            "id_pengeluaran" => $id_pengeluaran,
            "foto_kwitansi" => $foto_kwitansi
        ]);
    }

    // ==========================================
    // 2. CREATE PENGELUARAN (BARU)
    // ==========================================
    $id_pekerjaan = intval($body['id_pekerjaan'] ?? 0);
    $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
    $nominal = floatval($body['nominal'] ?? 0);
    $jenis_dana = $body['jenis_dana'] ?? 'pribadi';
    $id_kas = ($jenis_dana === 'kantor') ? intval($body['id_kas'] ?? 0) : null;
    $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');
    $foto_kwitansi = trim($body['foto_kwitansi'] ?? '');

    if ($id_pekerjaan <= 0 || $nominal <= 0) {
        jsonResponse(false, "Pekerjaan dan Nominal pengeluaran wajib valid", null, 400);
    }

    if (!in_array($jenis_dana, ['kantor', 'pribadi'])) {
        jsonResponse(false, "Jenis dana harus 'kantor' atau 'pribadi'", null, 400);
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

    if ($jenis_dana === 'kantor') {
        validateKasKantorForExpense($pdo, $id_kas, $id_pekerjaan, $nominal, 0);
    } else {
        $id_kas = null;
    }

    // F-04: Validasi penugasan - jika belum ditugaskan secara manual oleh admin, otomatis daftarkan sebagai pelaksana proyek aktif
    $stmtPenugasan = $pdo->prepare("SELECT COUNT(*) FROM penugasan WHERE id_pekerjaan = ? AND id_karyawan = ?");
    $stmtPenugasan->execute([$id_pekerjaan, $kId]);
    if ($stmtPenugasan->fetchColumn() == 0) {
        try {
            $stmtAuto = $pdo->prepare("INSERT INTO penugasan (id_pekerjaan, id_karyawan, peran_tugas, status_baca) VALUES (?, ?, 'Pelaksana', 'sudah')");
            $stmtAuto->execute([$id_pekerjaan, $kId]);
        } catch (Exception $e) {
            jsonResponse(false, "Anda belum ditugaskan pada pekerjaan ini. Silakan hubungi Administrator.", null, 403);
        }
    }

    $stmt = $pdo->prepare("
        INSERT INTO pengeluaran (id_pekerjaan, id_karyawan, tanggal, nominal, jenis_dana, id_kas, keterangan, foto_kwitansi, status_verifikasi, status_ganti)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'menunggu', 'belum')
    ");
    $stmt->execute([$id_pekerjaan, $kId, $tanggal, $nominal, $jenis_dana, $id_kas, $keterangan, $foto_kwitansi]);

    jsonResponse(true, "Pengeluaran berhasil dicatat!", [
        "id_pengeluaran" => $pdo->lastInsertId(),
        "foto_kwitansi" => $foto_kwitansi
    ], 201);

} elseif ($method === 'DELETE') {
    $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
    $stmtCheck = $pdo->prepare("SELECT id_karyawan, jenis_dana, id_kas, status_verifikasi, status_ganti FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmtCheck->execute([$id]);
    $item = $stmtCheck->fetch();

    if (!$item) {
        jsonResponse(false, "Data pengeluaran tidak ditemukan", null, 404);
    }

    if (intval($item['id_karyawan']) !== $kId) {
        jsonResponse(false, "Anda tidak memiliki izin menghapus pengeluaran milik pekerja lain.", null, 403);
    }

    if ($item['status_verifikasi'] === 'disetujui' || ($item['jenis_dana'] === 'pribadi' && $item['status_ganti'] === 'sudah')) {
        jsonResponse(false, "Pengeluaran yang telah disetujui atau sudah dikembalikan tidak dapat dihapus oleh pekerja untuk mencegah risiko kecurangan.", null, 403);
    }

    $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmt->execute([$id]);

    if (!empty($item['id_kas'])) {
        syncKasKantorLpjStatus($pdo, $item['id_kas']);
    }
    jsonResponse(true, "Catatan pengeluaran berhasil dihapus!");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

