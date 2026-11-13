<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: VERIFIKASI PENGELUARAN, KAS KANTOR & LPJ
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
ensureKasKantorSchema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();

if (!empty($_POST)) {
    $body = array_merge($body, $_POST);
}

$action = $_GET['action'] ?? $body['action'] ?? '';

if ($method === 'GET') {
    // 1. DAFTAR KAS KANTOR & PERTANGGUNGJAWABAN (LPJ)
    if ($action === 'kas_list') {
        $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
        $id_karyawan = isset($_GET['id_karyawan']) ? intval($_GET['id_karyawan']) : 0;
        $status_lpj = $_GET['status_lpj'] ?? '';
        $status_verifikasi = $_GET['status_verifikasi'] ?? '';

        $where = [];
        $params = [];

        if ($id_pekerjaan > 0) {
            $where[] = "kk.id_pekerjaan = ?";
            $params[] = $id_pekerjaan;
        }
        if ($id_karyawan > 0) {
            $where[] = "kk.id_karyawan = ?";
            $params[] = $id_karyawan;
        }
        if (!empty($status_lpj) && in_array($status_lpj, ['berjalan', 'selesai'])) {
            $where[] = "kk.status_lpj = ?";
            $params[] = $status_lpj;
        }
        if (!empty($status_verifikasi) && in_array($status_verifikasi, ['menunggu', 'disetujui', 'ditolak'])) {
            $where[] = "kk.status_verifikasi = ?";
            $params[] = $status_verifikasi;
        }

        $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";
        $daftarKas = fetchKasKantorList($pdo, $whereClause, $params);

        $sqlPengembalian = "
            SELECT kp.*,
                   k.nama AS nama_penyetor,
                   kk.id_pekerjaan,
                   kk.keterangan AS keterangan_kas,
                   kk.id_karyawan AS id_penanggung_jawab,
                   pj.nama AS nama_penanggung_jawab,
                   p.nama_pekerjaan
            FROM kas_kantor_pengembalian kp
            JOIN kas_kantor kk ON kp.id_kas = kk.id_kas
            LEFT JOIN karyawan k ON kp.id_karyawan = k.id_karyawan
            LEFT JOIN karyawan pj ON kk.id_karyawan = pj.id_karyawan
            LEFT JOIN pekerjaan p ON kk.id_pekerjaan = p.id_pekerjaan
            ORDER BY FIELD(kp.status_konfirmasi, 'menunggu', 'diterima', 'ditolak'), kp.tanggal DESC, kp.id_pengembalian DESC
        ";
        $pengembalianList = $pdo->query($sqlPengembalian)->fetchAll();

        $totalMasuk = 0;
        $totalTerpakaiDisetujui = 0;
        $totalTerpakaiMenunggu = 0;
        $totalDikembalikan = 0;
        $totalSisaTanggungan = 0;

        foreach ($daftarKas as $kas) {
            if (($kas['status_verifikasi'] ?? 'disetujui') !== 'disetujui') {
                continue;
            }
            $totalMasuk += floatval($kas['nominal_masuk']);
            $totalTerpakaiDisetujui += floatval($kas['total_terpakai_disetujui']);
            $totalTerpakaiMenunggu += floatval($kas['total_terpakai_menunggu']);
            $totalDikembalikan += floatval($kas['total_dikembalikan']);
            $totalSisaTanggungan += floatval($kas['sisa_resmi']);
        }

        $menungguKonfirmasiCount = 0;
        foreach ($pengembalianList as $pk) {
            if ($pk['status_konfirmasi'] === 'menunggu') {
                $menungguKonfirmasiCount++;
            }
        }

        $menungguVerifikasiKasCount = intval($pdo->query("SELECT COUNT(*) FROM kas_kantor WHERE status_verifikasi = 'menunggu'")->fetchColumn());

        jsonResponse(true, "Data pemasukan dan pertanggungjawaban kas kantor berhasil dimuat", [
            "daftar" => $daftarKas,
            "pengembalian" => $pengembalianList,
            "summary" => [
                "total_kas_masuk" => round($totalMasuk, 2),
                "total_terpakai_disetujui" => round($totalTerpakaiDisetujui, 2),
                "total_terpakai_menunggu" => round($totalTerpakaiMenunggu, 2),
                "total_sisa_dikembalikan" => round($totalDikembalikan, 2),
                "total_sisa_tanggungan" => round($totalSisaTanggungan, 2),
                "menunggu_konfirmasi_kembali" => $menungguKonfirmasiCount,
                "menunggu_verifikasi_kas" => $menungguVerifikasiKasCount
            ]
        ]);
    }

    // 2. REKAP PENGELUARAN SELURUH PROYEK
    if ($action === 'rekap') {
        $sql = "
            SELECT p.id_pekerjaan, p.nama_pekerjaan,
                   IFNULL(pg_agg.uang_pribadi, 0) AS uang_pribadi,
                   IFNULL(pg_agg.uang_kantor, 0) AS uang_kantor,
                   IFNULL(pg_agg.total_pengeluaran, 0) AS total_pengeluaran,
                   IFNULL(pg_agg.pribadi_belum_ganti, 0) AS pribadi_belum_ganti,
                   IFNULL(kk_agg.kas_masuk, 0) AS kas_masuk,
                   IFNULL(kp_agg.kas_dikembalikan, 0) AS kas_dikembalikan
            FROM pekerjaan p
            LEFT JOIN (
                SELECT id_pekerjaan,
                       SUM(CASE WHEN jenis_dana = 'pribadi' AND status_verifikasi = 'disetujui' THEN nominal ELSE 0 END) AS uang_pribadi,
                       SUM(CASE WHEN jenis_dana = 'kantor' AND status_verifikasi = 'disetujui' THEN nominal ELSE 0 END) AS uang_kantor,
                       SUM(CASE WHEN status_verifikasi = 'disetujui' THEN nominal ELSE 0 END) AS total_pengeluaran,
                       SUM(CASE WHEN jenis_dana = 'pribadi' AND status_verifikasi = 'disetujui' AND status_ganti = 'belum' THEN nominal ELSE 0 END) AS pribadi_belum_ganti
                FROM pengeluaran
                GROUP BY id_pekerjaan
            ) pg_agg ON p.id_pekerjaan = pg_agg.id_pekerjaan
            LEFT JOIN (
                SELECT id_pekerjaan, SUM(nominal_masuk) AS kas_masuk
                FROM kas_kantor
                WHERE id_pekerjaan IS NOT NULL AND status_verifikasi = 'disetujui'
                GROUP BY id_pekerjaan
            ) kk_agg ON p.id_pekerjaan = kk_agg.id_pekerjaan
            LEFT JOIN (
                SELECT kk.id_pekerjaan, SUM(kp.nominal) AS kas_dikembalikan
                FROM kas_kantor_pengembalian kp
                JOIN kas_kantor kk ON kp.id_kas = kk.id_kas
                WHERE kk.id_pekerjaan IS NOT NULL AND kk.status_verifikasi = 'disetujui' AND kp.status_konfirmasi = 'diterima'
                GROUP BY kk.id_pekerjaan
            ) kp_agg ON p.id_pekerjaan = kp_agg.id_pekerjaan
            ORDER BY p.id_pekerjaan ASC
        ";
        $stmt = $pdo->query($sql);
        $rekap = $stmt->fetchAll();

        $totalPribadi = 0;
        $totalKantor = 0;
        $grandTotal = 0;
        $totalKasMasukProyek = 0;
        foreach ($rekap as &$r) {
            $r['uang_pribadi'] = floatval($r['uang_pribadi']);
            $r['uang_kantor'] = floatval($r['uang_kantor']);
            $r['total_pengeluaran'] = floatval($r['total_pengeluaran']);
            $r['kas_masuk'] = floatval($r['kas_masuk']);
            $r['kas_dikembalikan'] = floatval($r['kas_dikembalikan']);
            $r['sisa_kas_proyek'] = round(max(0, $r['kas_masuk'] - $r['uang_kantor'] - $r['kas_dikembalikan']), 2);

            $totalPribadi += $r['uang_pribadi'];
            $totalKantor += $r['uang_kantor'];
            $grandTotal += $r['total_pengeluaran'];
            $totalKasMasukProyek += $r['kas_masuk'];
        }
        unset($r);

        jsonResponse(true, "Rekapitulasi pengeluaran seluruh proyek berhasil dimuat (Admin)", [
            "daftar" => $rekap,
            "summary" => [
                "total_uang_pribadi" => $totalPribadi,
                "total_uang_kantor" => $totalKantor,
                "grand_total" => $grandTotal,
                "total_kas_masuk_proyek" => $totalKasMasukProyek
            ]
        ]);
    }

    // 3. DAFTAR SELURUH PENGELUARAN (Dengan Filter)
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;
    $id_karyawan = isset($_GET['id_karyawan']) ? intval($_GET['id_karyawan']) : 0;
    $id_kas = isset($_GET['id_kas']) ? intval($_GET['id_kas']) : 0;
    $jenis_dana = $_GET['jenis_dana'] ?? '';

    $where = [];
    $params = [];

    if ($id_pekerjaan > 0) {
        $where[] = "pg.id_pekerjaan = ?";
        $params[] = $id_pekerjaan;
    }
    if ($id_karyawan > 0) {
        $where[] = "pg.id_karyawan = ?";
        $params[] = $id_karyawan;
    }
    if ($id_kas > 0) {
        $where[] = "pg.id_kas = ?";
        $params[] = $id_kas;
    }
    if (!empty($jenis_dana) && in_array($jenis_dana, ['pribadi', 'kantor'])) {
        $where[] = "pg.jenis_dana = ?";
        $params[] = $jenis_dana;
    }

    $whereClause = !empty($where) ? "WHERE " . implode(" AND ", $where) : "";

    $sql = "
        SELECT pg.*,
               k.nama AS nama_karyawan,
               k.jabatan,
               p.nama_pekerjaan,
               p.lokasi AS lokasi_pekerjaan,
               kk.id_karyawan AS id_penanggung_jawab,
               pj.nama AS nama_penanggung_jawab,
               kk.keterangan AS keterangan_kas,
               kk.tanggal AS tanggal_kas,
               kk.nominal_masuk AS nominal_kas
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

    jsonResponse(true, "Daftar pengeluaran seluruh proyek berhasil dimuat (Admin)", $data);

} elseif ($method === 'POST') {
    // 1. VERIFIKASI BUKTI PENGELUARAN OLEH ADMIN
    if ($action === 'verifikasi') {
        $id = intval($body['id_pengeluaran'] ?? 0);
        $status = $body['status_verifikasi'] ?? '';
        if (!in_array($status, ['disetujui', 'ditolak', 'menunggu'])) {
            jsonResponse(false, "Status verifikasi tidak valid", null, 400);
        }

        $stmtItem = $pdo->prepare("SELECT id_pengeluaran, jenis_dana, id_kas, nominal FROM pengeluaran WHERE id_pengeluaran = ?");
        $stmtItem->execute([$id]);
        $item = $stmtItem->fetch();
        if (!$item) {
            jsonResponse(false, "Data pengeluaran tidak ditemukan", null, 404);
        }

        // Validasi saldo kas jika menyetujui nota Uang Kantor yang terhubung ke paket kas_kantor
        if ($status === 'disetujui' && $item['jenis_dana'] === 'kantor' && !empty($item['id_kas'])) {
            $kasList = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$item['id_kas']]);
            if (!empty($kasList)) {
                $kas = $kasList[0];
                if (($kas['status_verifikasi'] ?? 'disetujui') !== 'disetujui') {
                    jsonResponse(false, "Pemasukan dana kas #{$item['id_kas']} belum disetujui Admin. Setujui pemasukan kas tersebut terlebih dahulu.", null, 400);
                }
                $stmtOther = $pdo->prepare("SELECT IFNULL(SUM(nominal), 0) FROM pengeluaran WHERE id_kas = ? AND jenis_dana = 'kantor' AND status_verifikasi = 'disetujui' AND id_pengeluaran != ?");
                $stmtOther->execute([$item['id_kas'], $id]);
                $otherApproved = floatval($stmtOther->fetchColumn());
                $sisaSetelahSetujui = $kas['nominal_masuk'] - $kas['total_dikembalikan'] - $otherApproved - floatval($item['nominal']);
                if ($sisaSetelahSetujui < -0.01) {
                    $kasMasukFmt = number_format($kas['nominal_masuk'], 0, ',', '.');
                    jsonResponse(false, "Tidak dapat menyetujui nota ini karena total belanja melebihi nominal kas masuk (Rp $kasMasukFmt) pada paket kas terkait.", null, 400);
                }
            }
        }

        $stmt = $pdo->prepare("UPDATE pengeluaran SET status_verifikasi = ? WHERE id_pengeluaran = ?");
        $stmt->execute([$status, $id]);

        if (!empty($item['id_kas'])) {
            syncKasKantorLpjStatus($pdo, $item['id_kas']);
        }
        jsonResponse(true, "Status verifikasi pengeluaran diperbarui oleh Admin");

    // 2. STATUS REIMBURSEMENT UANG PRIBADI OLEH ADMIN
    } elseif ($action === 'status_ganti') {
        $id = intval($body['id_pengeluaran'] ?? 0);
        $status = $body['status_ganti'] ?? '';
        if (!in_array($status, ['sudah', 'belum'])) {
            jsonResponse(false, "Status penggantian tidak valid", null, 400);
        }
        $stmt = $pdo->prepare("UPDATE pengeluaran SET status_ganti = ? WHERE id_pengeluaran = ?");
        $stmt->execute([$status, $id]);
        jsonResponse(true, "Status penggantian dana diperbarui oleh Admin");

    // 3. BUAT PEMASUKAN / PENYERAHAN KAS KANTOR BARU (ADMIN)
    } elseif ($action === 'create_kas') {
        $id_pekerjaan = !empty($body['id_pekerjaan']) ? intval($body['id_pekerjaan']) : null;
        $id_karyawan = intval($body['id_karyawan'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal_masuk = floatval($body['nominal_masuk'] ?? 0);
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_karyawan <= 0 || $nominal_masuk <= 0) {
            jsonResponse(false, "Penanggung jawab dan nominal pemasukan kas wajib valid (> 0).", null, 400);
        }

        $bukti_serah = uploadReceiptImage(['bukti_serah', 'foto_bukti'], 'kas_');

        $stmt = $pdo->prepare("
            INSERT INTO kas_kantor (id_pekerjaan, id_karyawan, id_pelapor, dibuat_oleh, tanggal, nominal_masuk, keterangan, bukti_serah, status_verifikasi, status_lpj)
            VALUES (?, ?, NULL, 'admin', ?, ?, ?, ?, 'disetujui', 'berjalan')
        ");
        $stmt->execute([$id_pekerjaan, $id_karyawan, $tanggal, $nominal_masuk, $keterangan, $bukti_serah]);

        jsonResponse(true, "Pemasukan dana kantor & penanggung jawab berhasil dicatat!", [
            "id_kas" => intval($pdo->lastInsertId())
        ], 201);

    // 3B. VERIFIKASI / SETUJUI ATAU TOLAK PEMASUKAN KAS DARI KARYAWAN
    } elseif ($action === 'verifikasi_kas') {
        $id_kas = intval($body['id_kas'] ?? 0);
        $status = $body['status_verifikasi'] ?? '';
        $catatan_admin = htmlspecialchars(trim($body['catatan_admin'] ?? ''), ENT_QUOTES, 'UTF-8');
        if ($id_kas <= 0 || !in_array($status, ['menunggu', 'disetujui', 'ditolak'])) {
            jsonResponse(false, "ID kas dan status verifikasi pemasukan wajib valid.", null, 400);
        }

        $stmtCheck = $pdo->prepare("SELECT id_kas FROM kas_kantor WHERE id_kas = ?");
        $stmtCheck->execute([$id_kas]);
        if (!$stmtCheck->fetch()) {
            jsonResponse(false, "Data pemasukan kas kantor tidak ditemukan.", null, 404);
        }

        $pdo->prepare("UPDATE kas_kantor SET status_verifikasi = ?, catatan_admin = ? WHERE id_kas = ?")
            ->execute([$status, $catatan_admin !== '' ? $catatan_admin : null, $id_kas]);

        syncKasKantorLpjStatus($pdo, $id_kas);
        $label = $status === 'disetujui' ? 'DISETUJUI' : ($status === 'ditolak' ? 'DITOLAK' : 'MENUNGGU');
        jsonResponse(true, "Laporan pemasukan uang kantor berhasil $label oleh Admin.");

    // 4. EDIT PEMASUKAN KAS KANTOR
    } elseif ($action === 'update_kas') {
        $id_kas = intval($body['id_kas'] ?? 0);
        $id_pekerjaan = !empty($body['id_pekerjaan']) ? intval($body['id_pekerjaan']) : null;
        $id_karyawan = intval($body['id_karyawan'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal_masuk = floatval($body['nominal_masuk'] ?? 0);
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_kas <= 0 || $id_karyawan <= 0 || $nominal_masuk <= 0) {
            jsonResponse(false, "ID kas, penanggung jawab, dan nominal wajib valid.", null, 400);
        }

        $kasRows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$id_kas]);
        if (empty($kasRows)) {
            jsonResponse(false, "Data kas kantor tidak ditemukan.", null, 404);
        }
        $existingKas = $kasRows[0];

        $minimumNominal = $existingKas['total_terpakai_disetujui'] + $existingKas['total_terpakai_menunggu'] + $existingKas['total_dikembalikan'];
        if ($nominal_masuk < $minimumNominal) {
            jsonResponse(false, "Nominal kas masuk tidak boleh lebih kecil dari total dana yang sudah dipakai/dikembalikan (Rp " . number_format($minimumNominal, 0, ',', '.') . ").", null, 400);
        }

        $newBukti = uploadReceiptImage(['bukti_serah', 'foto_bukti'], 'kas_');
        $bukti_serah = $newBukti ? $newBukti : $existingKas['bukti_serah'];

        $stmt = $pdo->prepare("
            UPDATE kas_kantor
            SET id_pekerjaan = ?, id_karyawan = ?, tanggal = ?, nominal_masuk = ?, keterangan = ?, bukti_serah = ?
            WHERE id_kas = ?
        ");
        $stmt->execute([$id_pekerjaan, $id_karyawan, $tanggal, $nominal_masuk, $keterangan, $bukti_serah, $id_kas]);

        syncKasKantorLpjStatus($pdo, $id_kas);
        jsonResponse(true, "Data pemasukan kas kantor berhasil diperbarui.");

    // 5. HAPUS PEMASUKAN KAS KANTOR
    } elseif ($action === 'delete_kas') {
        $id_kas = intval($_GET['id_kas'] ?? $body['id_kas'] ?? 0);
        $force = !empty($body['force']) || (($_GET['force'] ?? '') === '1');
        if ($id_kas <= 0) {
            jsonResponse(false, "ID kas kantor tidak valid.", null, 400);
        }

        $stmtPeng = $pdo->prepare("SELECT COUNT(*) FROM pengeluaran WHERE id_kas = ?");
        $stmtPeng->execute([$id_kas]);
        $linkedCount = intval($stmtPeng->fetchColumn());

        if ($linkedCount > 0 && !$force) {
            jsonResponse(false, "Kas kantor ini sudah memiliki $linkedCount catatan pengeluaran kuitansi terkait dan tidak dapat dihapus langsung.", [
                "linked_count" => $linkedCount
            ], 400);
        }

        $pdo->prepare("DELETE FROM kas_kantor WHERE id_kas = ?")->execute([$id_kas]);
        jsonResponse(true, "Catatan pemasukan kas kantor berhasil dihapus.");

    // 6. CATAT SETORAN / TERIMA PENGEMBALIAN SISA DANA LANGSUNG OLEH ADMIN
    } elseif ($action === 'setor_sisa') {
        $id_kas = intval($body['id_kas'] ?? 0);
        $tanggal = !empty($body['tanggal']) ? $body['tanggal'] : date('Y-m-d');
        $nominal = floatval($body['nominal'] ?? 0);
        $keterangan = htmlspecialchars(trim($body['keterangan'] ?? ''), ENT_QUOTES, 'UTF-8');

        if ($id_kas <= 0 || $nominal <= 0) {
            jsonResponse(false, "ID kas dan nominal pengembalian sisa wajib valid (> 0).", null, 400);
        }

        $kasRows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$id_kas]);
        if (empty($kasRows)) {
            jsonResponse(false, "Data kas kantor tidak ditemukan.", null, 404);
        }
        $kas = $kasRows[0];
        if (($kas['status_verifikasi'] ?? 'disetujui') !== 'disetujui') {
            jsonResponse(false, "Tidak dapat menerima setoran sisa karena pemasukan kas ini belum disetujui.", null, 400);
        }

        if ($nominal > ($kas['sisa_resmi'] + 0.01)) {
            jsonResponse(false, "Nominal pengembalian melebihi sisa dana pertanggungjawaban (Rp " . number_format($kas['sisa_resmi'], 0, ',', '.') . ").", null, 400);
        }

        $bukti_foto = uploadReceiptImage(['bukti_foto', 'foto_bukti'], 'sisa_');
        $id_karyawan = !empty($body['id_karyawan']) ? intval($body['id_karyawan']) : $kas['id_karyawan'];

        $stmt = $pdo->prepare("
            INSERT INTO kas_kantor_pengembalian (id_kas, id_karyawan, tanggal, nominal, keterangan, bukti_foto, status_konfirmasi)
            VALUES (?, ?, ?, ?, ?, ?, 'diterima')
        ");
        $stmt->execute([$id_kas, $id_karyawan, $tanggal, $nominal, $keterangan ?: 'Setoran sisa dana diterima Admin', $bukti_foto]);

        syncKasKantorLpjStatus($pdo, $id_kas);
        jsonResponse(true, "Pengembalian sisa dana kantor berhasil dicatat dan diterima!", null, 201);

    // 7. KONFIRMASI PENGEMBALIAN SISA YANG DIAJUKAN KARYAWAN
    } elseif ($action === 'konfirmasi_pengembalian') {
        $id_pengembalian = intval($body['id_pengembalian'] ?? 0);
        $status = $body['status_konfirmasi'] ?? '';
        if ($id_pengembalian <= 0 || !in_array($status, ['diterima', 'ditolak'])) {
            jsonResponse(false, "ID pengembalian atau status konfirmasi tidak valid.", null, 400);
        }

        $stmtCheck = $pdo->prepare("SELECT * FROM kas_kantor_pengembalian WHERE id_pengembalian = ?");
        $stmtCheck->execute([$id_pengembalian]);
        $pk = $stmtCheck->fetch();
        if (!$pk) {
            jsonResponse(false, "Data pengembalian sisa tidak ditemukan.", null, 404);
        }

        if ($status === 'diterima' && $pk['status_konfirmasi'] !== 'diterima') {
            $kasRows = fetchKasKantorList($pdo, "WHERE kk.id_kas = ?", [$pk['id_kas']]);
            if (!empty($kasRows) && floatval($pk['nominal']) > ($kasRows[0]['sisa_resmi'] + 0.01)) {
                jsonResponse(false, "Nominal setoran sisa melebihi sisa dana yang tersisa pada kas ini.", null, 400);
            }
        }

        $pdo->prepare("UPDATE kas_kantor_pengembalian SET status_konfirmasi = ? WHERE id_pengembalian = ?")
            ->execute([$status, $id_pengembalian]);

        syncKasKantorLpjStatus($pdo, $pk['id_kas']);
        jsonResponse(true, "Status konfirmasi pengembalian sisa berhasil diperbarui ke: " . strtoupper($status));

    // 8. HAPUS PENGELUARAN OLEH ADMIN (VIA POST ACTION)
    } elseif ($action === 'delete') {
        $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
        if ($id <= 0) {
            jsonResponse(false, "ID pengeluaran tidak valid", null, 400);
        }
        $stmtOld = $pdo->prepare("SELECT id_kas FROM pengeluaran WHERE id_pengeluaran = ?");
        $stmtOld->execute([$id]);
        $oldKasId = $stmtOld->fetchColumn();

        $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
        $stmt->execute([$id]);

        if ($oldKasId) {
            syncKasKantorLpjStatus($pdo, $oldKasId);
        }
        jsonResponse(true, "Catatan pengeluaran berhasil dihapus oleh Admin");
    } else {
        jsonResponse(false, "Aksi pengeluaran admin tidak didukung", null, 400);
    }

} elseif ($method === 'DELETE') {
    $id = intval($_GET['id_pengeluaran'] ?? $body['id_pengeluaran'] ?? 0);
    $stmtOld = $pdo->prepare("SELECT id_kas FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmtOld->execute([$id]);
    $oldKasId = $stmtOld->fetchColumn();

    $stmt = $pdo->prepare("DELETE FROM pengeluaran WHERE id_pengeluaran = ?");
    $stmt->execute([$id]);

    if ($oldKasId) {
        syncKasKantorLpjStatus($pdo, $oldKasId);
    }
    jsonResponse(true, "Catatan pengeluaran berhasil dihapus oleh Admin");
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}

