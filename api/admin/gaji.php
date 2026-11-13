<?php
// ==========================================================
// BACKEND KHUSUS ADMIN: PERHITUNGAN & PEMBAYARAN GAJI BULANAN
// ==========================================================
require_once __DIR__ . '/../config/database.php';

// Otorisasi: Wajib Admin
$currentUser = requireAdmin();
ensureGajiSchema($pdo);
ensureAbsensiSchema($pdo);
ensurePekerjaanPenugasanSchema($pdo);

$method = $_SERVER['REQUEST_METHOD'];
$body = getRequestBody();
$action = $_GET['action'] ?? $body['action'] ?? $_POST['action'] ?? '';

// Formula SQL Durasi Kerja (Mendukung Shift Malam - F-02)
$sqlDurasi = "
    CASE 
        WHEN a.jam_pulang >= a.jam_masuk 
            THEN (TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) / 3600)
        ELSE 
            ((TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) + 86400) / 3600)
    END
";

if ($method === 'GET') {
    $periode = $_GET['periode'] ?? getJakartaCurrentPeriode();
    $id_karyawan = isset($_GET['id_karyawan']) ? intval($_GET['id_karyawan']) : 0;
    $id_gaji = isset($_GET['id_gaji']) ? intval($_GET['id_gaji']) : 0;
    $id_pekerjaan = isset($_GET['id_pekerjaan']) ? intval($_GET['id_pekerjaan']) : 0;

    // Rincian absensi, reimbursement & breakdown per pekerjaan untuk modal/detail Admin
    if ($action === 'detail') {
        $slipRow = null;
        if ($id_gaji > 0) {
            $stmtG = $pdo->prepare("
                SELECT g.*, k.nama AS nama_karyawan, k.jabatan, k.tarif_per_jam
                FROM gaji g
                JOIN karyawan k ON g.id_karyawan = k.id_karyawan
                WHERE g.id_gaji = ?
            ");
            $stmtG->execute([$id_gaji]);
            $slipRow = $stmtG->fetch() ?: null;
            if ($slipRow) {
                $id_karyawan = intval($slipRow['id_karyawan']);
                $periode = $slipRow['periode'];
            }
        } elseif ($id_karyawan > 0) {
            $stmtG = $pdo->prepare("
                SELECT g.*, k.nama AS nama_karyawan, k.jabatan, k.tarif_per_jam
                FROM gaji g
                JOIN karyawan k ON g.id_karyawan = k.id_karyawan
                WHERE g.id_karyawan = ? AND g.periode = ?
                LIMIT 1
            ");
            $stmtG->execute([$id_karyawan, $periode]);
            $slipRow = $stmtG->fetch() ?: null;
        }

        if ($id_karyawan <= 0) {
            jsonResponse(false, "ID Karyawan tidak valid untuk memuat detail gaji.", null, 400);
        }

        $tarifOverride = $slipRow ? floatval($slipRow['tarif']) : null;
        $breakdown = fetchGajiJobBreakdown($pdo, $id_karyawan, $periode, $tarifOverride, $id_pekerjaan);
        $breakdown['slip'] = $slipRow;

        jsonResponse(true, "Detail jam kerja & reimbursement berhasil dimuat (Admin)", $breakdown);
    }

    $where = ["g.periode = ?"];
    $params = [$periode];

    if ($id_karyawan > 0) {
        $where[] = "g.id_karyawan = ?";
        $params[] = $id_karyawan;
    }

    $whereClause = "WHERE " . implode(" AND ", $where);

    $sql = "
        SELECT g.*,
               k.nama AS nama_karyawan,
               k.jabatan,
               k.tarif_per_jam
        FROM gaji g
        JOIN karyawan k ON g.id_karyawan = k.id_karyawan
        $whereClause
        ORDER BY g.id_gaji DESC
    ";
    $stmt = $pdo->prepare($sql);
    $stmt->execute($params);
    $data = $stmt->fetchAll();

    $projectsMap = fetchGajiEmployeeProjectsMap($pdo, $periode, $id_karyawan);
    foreach ($data as &$row) {
        $kid = intval($row['id_karyawan']);
        $row['id_pekerjaan_list'] = $projectsMap[$kid]['id_pekerjaan_list'] ?? '';
        $row['nama_pekerjaan'] = $projectsMap[$kid]['nama_pekerjaan'] ?? '';
    }
    unset($row);

    jsonResponse(true, "Data gaji periode $periode berhasil dimuat (Admin)", $data);

} elseif ($method === 'POST') {
    // 1. HITUNG GAJI OTOMATIS BULANAN OLEH ADMIN
    if ($action === 'hitung') {
        $periode = $body['periode'] ?? getJakartaCurrentPeriode();

        $karyawanList = $pdo->query("SELECT id_karyawan, nama, tarif_per_jam FROM karyawan")->fetchAll();

        $dihitung = 0;
        $dilewati = 0;

        foreach ($karyawanList as $k) {
            $id_k = $k['id_karyawan'];
            $tarif = floatval($k['tarif_per_jam']);

            // F-03: Lindungi data gaji yang sudah berstatus 'sudah' dibayar agar tidak tertimpa
            $stmtCheck = $pdo->prepare("SELECT status_bayar, bonus, potongan FROM gaji WHERE id_karyawan = ? AND periode = ?");
            $stmtCheck->execute([$id_k, $periode]);
            $existing = $stmtCheck->fetch();

            if ($existing && $existing['status_bayar'] === 'sudah') {
                $dilewati++;
                continue;
            }

            // Hitung jam disetujui periode ini (dukungan shift malam)
            $stmtJam = $pdo->prepare("
                SELECT IFNULL(SUM($sqlDurasi), 0) AS total_jam
                FROM absensi a
                WHERE a.id_karyawan = ? 
                  AND a.status_verifikasi = 'disetujui' 
                  AND a.jam_pulang IS NOT NULL
                  AND DATE_FORMAT(a.tanggal, '%Y-%m') = ?
            ");
            $stmtJam->execute([$id_k, $periode]);
            $totalJam = round(floatval($stmtJam->fetch()['total_jam']), 2);

            $totalUpah = round($totalJam * $tarif, 2);

            // F-05: Hitung talangan uang pribadi yang belum diganti
            $stmtGanti = $pdo->prepare("
                SELECT IFNULL(SUM(nominal), 0) AS total_ganti
                FROM pengeluaran
                WHERE id_karyawan = ? 
                  AND jenis_dana = 'pribadi' 
                  AND status_verifikasi = 'disetujui'
                  AND status_ganti = 'belum'
                  AND DATE_FORMAT(tanggal, '%Y-%m') = ?
            ");
            $stmtGanti->execute([$id_k, $periode]);
            $totalGanti = round(floatval($stmtGanti->fetch()['total_ganti']), 2);

            $bonus = $existing ? round(floatval($existing['bonus'] ?? 0), 2) : 0;
            $potongan = $existing ? round(floatval($existing['potongan'] ?? 0), 2) : 0;
            $totalDibayar = round(max(0, $totalUpah + $totalGanti + $bonus - $potongan), 2);

            $stmtSave = $pdo->prepare("
                INSERT INTO gaji (id_karyawan, periode, total_jam, tarif, total_upah, total_ganti, bonus, potongan, total_dibayar, status_bayar)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'belum')
                ON DUPLICATE KEY UPDATE
                    total_jam = VALUES(total_jam),
                    tarif = VALUES(tarif),
                    total_upah = VALUES(total_upah),
                    total_ganti = VALUES(total_ganti),
                    total_dibayar = GREATEST(0, VALUES(total_upah) + VALUES(total_ganti) + COALESCE(bonus, 0) - COALESCE(potongan, 0))
            ");
            $stmtSave->execute([$id_k, $periode, $totalJam, $tarif, $totalUpah, $totalGanti, $bonus, $potongan, $totalDibayar]);
            $dihitung++;
        }

        $pesan = "Perhitungan gaji periode $periode berhasil diproses untuk $dihitung pekerja.";
        if ($dilewati > 0) {
            $pesan .= " ($dilewati catatan dilewati karena sudah dibayar/final).";
        }

        jsonResponse(true, $pesan, [
            "dihitung" => $dihitung,
            "dilewati" => $dilewati
        ]);

    // 2. ATUR BONUS & POTONGAN KASBON OLEH ADMIN
    } elseif ($action === 'penyesuaian') {
        $id_gaji = intval($body['id_gaji'] ?? 0);
        $bonus = max(0, round(floatval($body['bonus'] ?? 0), 2));
        $potongan = max(0, round(floatval($body['potongan'] ?? 0), 2));
        $catatan = trim($body['catatan_penyesuaian'] ?? '');

        if ($id_gaji <= 0) {
            jsonResponse(false, "ID Gaji tidak valid.", null, 400);
        }

        $stmtGet = $pdo->prepare("SELECT * FROM gaji WHERE id_gaji = ?");
        $stmtGet->execute([$id_gaji]);
        $g = $stmtGet->fetch();

        if (!$g) {
            jsonResponse(false, "Data gaji tidak ditemukan.", null, 404);
        }
        if ($g['status_bayar'] === 'sudah') {
            jsonResponse(false, "Gaji yang sudah dibayar tidak dapat diubah penyesuaiannya.", null, 400);
        }

        $totalDibayarBaru = round(max(0, floatval($g['total_upah']) + floatval($g['total_ganti']) + $bonus - $potongan), 2);

        $stmtUpd = $pdo->prepare("
            UPDATE gaji
            SET bonus = ?, potongan = ?, catatan_penyesuaian = ?, total_dibayar = ?
            WHERE id_gaji = ?
        ");
        $stmtUpd->execute([$bonus, $potongan, $catatan !== '' ? $catatan : null, $totalDibayarBaru, $id_gaji]);

        jsonResponse(true, "Penyesuaian bonus & potongan berhasil disimpan.", [
            "id_gaji" => $id_gaji,
            "bonus" => $bonus,
            "potongan" => $potongan,
            "catatan_penyesuaian" => $catatan,
            "total_dibayar" => $totalDibayarBaru
        ]);

    // 3. TANDAI GAJI SUDAH DIBAYAR OLEH ADMIN
    } elseif ($action === 'bayar') {
        $id_gaji = intval($body['id_gaji'] ?? $_POST['id_gaji'] ?? 0);
        if ($id_gaji <= 0) {
            jsonResponse(false, "ID Gaji tidak valid", null, 400);
        }

        $stmtGet = $pdo->prepare("SELECT id_karyawan, periode, status_bayar FROM gaji WHERE id_gaji = ?");
        $stmtGet->execute([$id_gaji]);
        $g = $stmtGet->fetch();

        if (!$g) {
            jsonResponse(false, "Data gaji tidak ditemukan", null, 404);
        }

        if ($g['status_bayar'] === 'sudah') {
            jsonResponse(false, "Gaji ini sudah berstatus dibayar.", null, 400);
        }

        $metodeRaw = strtolower(trim($body['metode_bayar'] ?? $_POST['metode_bayar'] ?? 'transfer'));
        $metodeBayar = in_array($metodeRaw, ['transfer', 'tunai'], true) ? $metodeRaw : 'transfer';
        $catatanBayar = trim($body['catatan_bayar'] ?? $_POST['catatan_bayar'] ?? '');

        $buktiPath = null;
        if (!empty($_FILES)) {
            $buktiPath = uploadReceiptImage(['bukti_bayar', 'foto_bukti'], 'bukti_gaji_');
        }
        if (!$buktiPath && !empty($body['foto_bukti'])) {
            $buktiPath = saveBase64ProofImage($body['foto_bukti'], 'bukti_gaji_');
        }

        $stmt = $pdo->prepare("
            UPDATE gaji 
            SET status_bayar = 'sudah',
                tanggal_bayar = NOW(),
                metode_bayar = ?,
                catatan_bayar = ?,
                bukti_bayar = COALESCE(?, bukti_bayar)
            WHERE id_gaji = ?
        ");
        $stmt->execute([
            $metodeBayar,
            $catatanBayar !== '' ? $catatanBayar : null,
            $buktiPath,
            $id_gaji
        ]);

        // F-05: Update reimbursement uang pribadi menjadi sudah diganti
        $stmtReimburse = $pdo->prepare("
            UPDATE pengeluaran 
            SET status_ganti = 'sudah' 
            WHERE id_karyawan = ? 
              AND jenis_dana = 'pribadi' 
              AND status_verifikasi = 'disetujui'
              AND status_ganti = 'belum'
              AND DATE_FORMAT(tanggal, '%Y-%m') = ?
        ");
        $stmtReimburse->execute([$g['id_karyawan'], $g['periode']]);

        jsonResponse(true, "Status gaji berhasil diperbarui menjadi SUDAH DIBAYAR! (Admin)");
    } else {
        jsonResponse(false, "Aksi tidak dikenal", null, 400);
    }
} else {
    jsonResponse(false, "Metode HTTP tidak didukung", null, 405);
}
