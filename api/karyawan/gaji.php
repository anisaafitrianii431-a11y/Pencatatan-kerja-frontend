<?php
// ==========================================================
// API KARYAWAN: LIHAT SLIP GAJI BULANAN PRIBADI
// Karyawan hanya dapat melihat slip gajinya sendiri yang sudah ditetapkan
// ==========================================================

require_once __DIR__ . '/../config/database.php';
ensurePekerjaanPenugasanSchema($pdo);

$currentUser = requireLogin();
$method = $_SERVER['REQUEST_METHOD'];
$kId = intval($currentUser['id_karyawan'] ?? 0);
$action = $_GET['action'] ?? '';

// Formula SQL Durasi Kerja (Mendukung Shift Malam)
$sqlDurasi = "
    CASE 
        WHEN a.jam_pulang >= a.jam_masuk 
            THEN (TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) / 3600)
        ELSE 
            ((TIME_TO_SEC(TIMEDIFF(a.jam_pulang, a.jam_masuk)) + 86400) / 3600)
    END
";

if ($method === 'GET') {
    $periode = $_GET['periode'] ?? date('Y-m');

    if ($kId <= 0) {
        jsonResponse(false, "Akun tidak terhubung dengan data karyawan", null, 403);
    }

    // 1. Riwayat semua slip gaji bulanan milik karyawan yang sedang login
    if ($action === 'riwayat') {
        $sqlHistory = "
            SELECT g.*,
                   k.nama AS nama_karyawan,
                   k.kode_karyawan,
                   k.jabatan,
                   k.tarif_per_jam
            FROM gaji g
            JOIN karyawan k ON g.id_karyawan = k.id_karyawan
            WHERE g.id_karyawan = ?
            ORDER BY g.periode DESC, g.id_gaji DESC
        ";
        $stmtH = $pdo->prepare($sqlHistory);
        $stmtH->execute([$kId]);
        $rows = $stmtH->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(true, "Riwayat slip gaji pribadi berhasil dimuat", $rows);
    }

    // 2. Slip gaji resmi spesifik (dokumen slip cetak/unduh berdasarkan id_gaji)
    if ($action === 'slip') {
        $id_gaji = intval($_GET['id_gaji'] ?? 0);

        $whereG = "WHERE g.id_karyawan = ?";
        $paramsG = [$kId];
        if ($id_gaji > 0) {
            $whereG .= " AND g.id_gaji = ?";
            $paramsG[] = $id_gaji;
        } else {
            $whereG .= " AND g.periode = ?";
            $paramsG[] = $periode;
        }

        $stmtG = $pdo->prepare("
            SELECT g.*,
                   k.nama AS nama_karyawan, k.kode_karyawan, k.jabatan, k.nomor_hp, k.email, k.tarif_per_jam
            FROM gaji g
            JOIN karyawan k ON g.id_karyawan = k.id_karyawan
            $whereG
            LIMIT 1
        ");
        $stmtG->execute($paramsG);
        $gaji = $stmtG->fetch(PDO::FETCH_ASSOC);

        if (!$gaji) {
            jsonResponse(false, "Slip gaji tidak ditemukan", null, 404);
        }

        // Riwayat pembayaran
        $stmtPay = $pdo->prepare("
            SELECT id_pembayaran, tanggal_bayar, nominal_bayar, metode_pembayaran, nomor_referensi, bukti_pembayaran, catatan
            FROM pembayaran_gaji
            WHERE id_gaji = ?
            ORDER BY id_pembayaran DESC
        ");
        $stmtPay->execute([$gaji['id_gaji']]);
        $pembayaranList = $stmtPay->fetchAll(PDO::FETCH_ASSOC);

        // Presensi disetujui
        $stmtAbsensi = $pdo->prepare("
            SELECT a.id_absensi, a.tanggal, a.jam_masuk, a.jam_pulang,
                   p.nama_pekerjaan,
                   ROUND($sqlDurasi, 2) AS durasi_jam
            FROM absensi a
            LEFT JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
            WHERE a.id_karyawan = ?
              AND DATE_FORMAT(a.tanggal, '%Y-%m') = ?
              AND a.status_verifikasi = 'disetujui'
              AND a.jam_pulang IS NOT NULL
            ORDER BY a.tanggal DESC, a.jam_masuk DESC, a.id_absensi DESC
        ");
        $stmtAbsensi->execute([$kId, $gaji['periode']]);
        $absensiList = $stmtAbsensi->fetchAll(PDO::FETCH_ASSOC);

        jsonResponse(true, "Slip gaji berhasil dimuat", [
            'gaji' => $gaji,
            'slip' => $gaji,
            'pembayaran' => $pembayaranList,
            'absensi' => $absensiList
        ]);
    }

    // 3. Rincian jam kerja, estimasi upah, reimbursement, dan status slip periode ini (Detail Gaji)
    // Tidak boleh mengembalikan 404 jika slip belum dibuat oleh Admin, tetapi tetap mengembalikan 200 OK dengan slip = null
    if ($action === 'detail') {
        $id_gaji = intval($_GET['id_gaji'] ?? 0);

        // Ambil data profil karyawan
        $stmtK = $pdo->prepare("
            SELECT id_karyawan, kode_karyawan, nama, jabatan, nomor_hp, email,
                   jenis_upah, nominal_upah, lembur_aktif, tarif_lembur, tarif_per_jam, status
            FROM karyawan
            WHERE id_karyawan = ?
            LIMIT 1
        ");
        $stmtK->execute([$kId]);
        $karyawan = $stmtK->fetch(PDO::FETCH_ASSOC);

        if (!$karyawan) {
            jsonResponse(false, "Data karyawan tidak ditemukan", null, 404);
        }

        // Cek apakah slip gaji sudah dibuat/ditetapkan untuk periode ini
        $whereG = "WHERE g.id_karyawan = ?";
        $paramsG = [$kId];
        if ($id_gaji > 0) {
            $whereG .= " AND g.id_gaji = ?";
            $paramsG[] = $id_gaji;
        } else {
            $whereG .= " AND g.periode = ?";
            $paramsG[] = $periode;
        }

        $stmtG = $pdo->prepare("
            SELECT g.*,
                   k.nama AS nama_karyawan, k.kode_karyawan, k.jabatan, k.nomor_hp, k.email
            FROM gaji g
            JOIN karyawan k ON g.id_karyawan = k.id_karyawan
            $whereG
            LIMIT 1
        ");
        $stmtG->execute($paramsG);
        $gaji = $stmtG->fetch(PDO::FETCH_ASSOC);

        $periodeTarget = $gaji['periode'] ?? $periode;
        $tarifAktif = floatval($gaji['tarif'] ?? $karyawan['nominal_upah'] ?? $karyawan['tarif_per_jam'] ?? 0);

        // Riwayat transaksi pembayaran jika slip sudah ada
        $pembayaranList = [];
        if ($gaji && !empty($gaji['id_gaji'])) {
            $stmtPay = $pdo->prepare("
                SELECT id_pembayaran, tanggal_bayar, nominal_bayar, metode_pembayaran, nomor_referensi, bukti_pembayaran, catatan
                FROM pembayaran_gaji
                WHERE id_gaji = ?
                ORDER BY id_pembayaran DESC
            ");
            $stmtPay->execute([$gaji['id_gaji']]);
            $pembayaranList = $stmtPay->fetchAll(PDO::FETCH_ASSOC);
        }

        // Ambil semua data absensi bulan ini (baik yang disetujui maupun menunggu)
        $stmtAbs = $pdo->prepare("
            SELECT a.id_absensi, a.tanggal, a.jam_masuk, a.jam_pulang, a.id_pekerjaan, a.status_verifikasi,
                   p.nama_pekerjaan, p.lokasi, p.jenis_upah, p.nominal_upah,
                   ROUND($sqlDurasi, 2) AS durasi_jam
            FROM absensi a
            LEFT JOIN pekerjaan p ON a.id_pekerjaan = p.id_pekerjaan
            WHERE a.id_karyawan = ?
              AND DATE_FORMAT(a.tanggal, '%Y-%m') = ?
                ORDER BY a.tanggal DESC, a.jam_masuk DESC, a.id_absensi DESC
        ");
        $stmtAbs->execute([$kId, $periodeTarget]);
        $allAbs = $stmtAbs->fetchAll(PDO::FETCH_ASSOC);

        $approvedAbs = [];
        $pendingAbsCount = 0;
        $pendingAbsJam = 0.0;

        foreach ($allAbs as $a) {
            $dur = floatval($a['durasi_jam'] ?? 0);
            if ($a['status_verifikasi'] === 'disetujui' && !empty($a['jam_pulang'])) {
                $a['upah_sesi'] = round($dur * $tarifAktif, 2);
                $approvedAbs[] = $a;
            } else if ($a['status_verifikasi'] === 'menunggu') {
                $pendingAbsCount++;
                $pendingAbsJam += $dur;
            }
        }

        // Ambil semua klaim pengeluaran / reimbursement pribadi untuk periode ini
        $stmtPg = $pdo->prepare("
            SELECT pg.*, p.nama_pekerjaan, p.lokasi, p.jenis_upah, p.nominal_upah
            FROM pengeluaran pg
            LEFT JOIN pekerjaan p ON pg.id_pekerjaan = p.id_pekerjaan
            WHERE pg.id_karyawan = ?
              AND DATE_FORMAT(pg.tanggal, '%Y-%m') = ?
            ORDER BY pg.tanggal DESC, pg.id_pengeluaran DESC
        ");
        $stmtPg->execute([$kId, $periodeTarget]);
        $allPg = $stmtPg->fetchAll(PDO::FETCH_ASSOC);

        $approvedPg = [];
        $pendingPgCount = 0;
        $pendingPgNom = 0.0;

        foreach ($allPg as $pg) {
            $nom = floatval($pg['nominal'] ?? 0);
            if ($pg['status_verifikasi'] === 'disetujui') {
                $approvedPg[] = $pg;
            } else if ($pg['status_verifikasi'] === 'menunggu') {
                $pendingPgCount++;
                $pendingPgNom += $nom;
            }
        }

        // Ambil penugasan dan buat ringkasan kontribusi per pekerjaan
        $stmtPn = $pdo->prepare("
            SELECT pn.id_pekerjaan, pn.peran_tugas, p.nama_pekerjaan, p.lokasi, p.jenis_upah, p.nominal_upah, p.status AS status_pekerjaan,
                   p.tanggal_mulai, p.target_selesai
            FROM penugasan pn
            JOIN pekerjaan p ON pn.id_pekerjaan = p.id_pekerjaan
            WHERE pn.id_karyawan = ?
        ");
        $stmtPn->execute([$kId]);
        $assignments = $stmtPn->fetchAll(PDO::FETCH_ASSOC);

        $jobMap = [];
        foreach ($assignments as $as) {
            $jId = intval($as['id_pekerjaan']);
            if (!isset($jobMap[$jId])) {
                $jobMap[$jId] = [
                    'id_pekerjaan' => $jId,
                    'nama_pekerjaan' => $as['nama_pekerjaan'] ?? 'Pekerjaan',
                    'lokasi' => $as['lokasi'] ?? '',
                    'status_pekerjaan' => $as['status_pekerjaan'] ?? 'berjalan',
                    'tanggal_mulai' => $as['tanggal_mulai'] ?? null,
                    'target_selesai' => $as['target_selesai'] ?? null,
                    'peran_tugas' => $as['peran_tugas'] ?: 'Anggota',
                    'jumlah_sesi_disetujui' => 0,
                    'jumlah_sesi_menunggu' => 0,
                    'total_jam_disetujui' => 0.0,
                    'jenis_upah' => $as['jenis_upah'] ?? 'per_jam',
                    'nominal_upah' => floatval($as['nominal_upah'] ?? $tarifAktif),
                    'tarif_jam' => floatval($as['nominal_upah'] ?? $tarifAktif),
                    'estimasi_upah' => 0.0,
                    'jumlah_nota' => 0,
                    'reimbursement_disetujui' => 0.0,
                    'pengeluaran_kantor_disetujui' => 0.0,
                    'reimbursement_sudah_diganti' => 0.0,
                    'reimbursement_menunggu' => 0.0,
                    'total_kontribusi' => 0.0,
                ];
            }
        }

        foreach ($allAbs as $a) {
            $jId = intval($a['id_pekerjaan'] ?? 0);
            if ($jId > 0) {
                if (!isset($jobMap[$jId])) {
                    $jobMap[$jId] = [
                        'id_pekerjaan' => $jId,
                        'nama_pekerjaan' => $a['nama_pekerjaan'] ?? 'Pekerjaan',
                        'lokasi' => $a['lokasi'] ?? '',
                        'status_pekerjaan' => 'berjalan',
                        'tanggal_mulai' => null,
                        'target_selesai' => null,
                        'peran_tugas' => 'Anggota',
                        'jumlah_sesi_disetujui' => 0,
                        'jumlah_sesi_menunggu' => 0,
                        'total_jam_disetujui' => 0.0,
                        'jenis_upah' => $a['jenis_upah'] ?? 'per_jam',
                        'nominal_upah' => floatval($a['nominal_upah'] ?? $tarifAktif),
                        'tarif_jam' => floatval($a['nominal_upah'] ?? $tarifAktif),
                        'estimasi_upah' => 0.0,
                        'jumlah_nota' => 0,
                        'reimbursement_disetujui' => 0.0,
                        'pengeluaran_kantor_disetujui' => 0.0,
                        'reimbursement_sudah_diganti' => 0.0,
                        'reimbursement_menunggu' => 0.0,
                        'total_kontribusi' => 0.0,
                    ];
                }
                $dur = floatval($a['durasi_jam'] ?? 0);
                if ($a['status_verifikasi'] === 'disetujui' && !empty($a['jam_pulang'])) {
                    $jobMap[$jId]['jumlah_sesi_disetujui'] += 1;
                    $jobMap[$jId]['total_jam_disetujui'] = round($jobMap[$jId]['total_jam_disetujui'] + $dur, 2);
                } else if ($a['status_verifikasi'] === 'menunggu') {
                    $jobMap[$jId]['jumlah_sesi_menunggu'] += 1;
                }
            }
        }

        foreach ($allPg as $pg) {
            $jId = intval($pg['id_pekerjaan'] ?? 0);
            if ($jId > 0) {
                if (!isset($jobMap[$jId])) {
                    $jobMap[$jId] = [
                        'id_pekerjaan' => $jId,
                        'nama_pekerjaan' => $pg['nama_pekerjaan'] ?? 'Pekerjaan',
                        'lokasi' => $pg['lokasi'] ?? '',
                        'status_pekerjaan' => 'berjalan',
                        'tanggal_mulai' => null,
                        'target_selesai' => null,
                        'peran_tugas' => 'Anggota',
                        'jumlah_sesi_disetujui' => 0,
                        'jumlah_sesi_menunggu' => 0,
                        'total_jam_disetujui' => 0.0,
                        'jenis_upah' => $pg['jenis_upah'] ?? 'per_jam',
                        'nominal_upah' => floatval($pg['nominal_upah'] ?? $tarifAktif),
                        'tarif_jam' => floatval($pg['nominal_upah'] ?? $tarifAktif),
                        'estimasi_upah' => 0.0,
                        'jumlah_nota' => 0,
                        'reimbursement_disetujui' => 0.0,
                        'pengeluaran_kantor_disetujui' => 0.0,
                        'reimbursement_sudah_diganti' => 0.0,
                        'reimbursement_menunggu' => 0.0,
                        'total_kontribusi' => 0.0,
                    ];
                }
                $nom = floatval($pg['nominal'] ?? 0);
                if ($pg['status_verifikasi'] === 'disetujui') {
                    if (($pg['jenis_dana'] ?? 'pribadi') === 'kantor') {
                        $jobMap[$jId]['pengeluaran_kantor_disetujui'] = round($jobMap[$jId]['pengeluaran_kantor_disetujui'] + $nom, 2);
                    } else {
                        $jobMap[$jId]['jumlah_nota'] += 1;
                        $jobMap[$jId]['reimbursement_disetujui'] = round($jobMap[$jId]['reimbursement_disetujui'] + $nom, 2);
                        if (($pg['status_ganti'] ?? 'belum') === 'sudah') {
                            $jobMap[$jId]['reimbursement_sudah_diganti'] = round($jobMap[$jId]['reimbursement_sudah_diganti'] + $nom, 2);
                        }
                    }
                } else if ($pg['status_verifikasi'] === 'menunggu') {
                    $jobMap[$jId]['reimbursement_menunggu'] = round($jobMap[$jId]['reimbursement_menunggu'] + $nom, 2);
                }
            }
        }

        $pekerjaanSummary = [];
        $totalJobDays = 0;
        foreach ($jobMap as $jobId => $job) {
            $days = [];
            foreach ($allAbs as $attendance) {
                if (intval($attendance['id_pekerjaan']) === intval($jobId) && $attendance['status_verifikasi'] === 'disetujui' && !empty($attendance['jam_pulang'])) $days[substr($attendance['tanggal'], 0, 10)] = true;
            }
            $jobMap[$jobId]['total_hari_disetujui'] = count($days);
            $totalJobDays += count($days);
        }
        foreach ($jobMap as $job) {
            $rate = floatval($job['nominal_upah'] ?? $tarifAktif);
            if (($job['jenis_upah'] ?? 'per_jam') === 'per_hari') $job['estimasi_upah'] = round($job['total_hari_disetujui'] * $rate, 2);
            elseif (($job['jenis_upah'] ?? 'per_jam') === 'per_bulan') $job['estimasi_upah'] = $totalJobDays > 0 ? round($rate * $job['total_hari_disetujui'] / $totalJobDays, 2) : 0;
            else $job['estimasi_upah'] = round($job['total_jam_disetujui'] * $rate, 2);
            $job['total_kontribusi'] = round($job['estimasi_upah'] + $job['reimbursement_disetujui'], 2);
            $pekerjaanSummary[] = $job;
        }
        usort($pekerjaanSummary, function($a, $b) {
            return intval($b['id_pekerjaan']) <=> intval($a['id_pekerjaan']);
        });

        jsonResponse(true, "Detail slip gaji dan rincian pekerjaan berhasil dimuat", [
            'karyawan' => $karyawan,
            'slip' => $gaji ?: null,
            'gaji' => $gaji ?: null,
            'tarif_aktif' => $tarifAktif,
            'absensi' => $approvedAbs,
            'pengeluaran' => $approvedPg,
            'pekerjaan_summary' => $pekerjaanSummary,
            'pending_summary' => [
                'absensi_menunggu' => $pendingAbsCount,
                'jam_menunggu' => round($pendingAbsJam, 2),
                'pengeluaran_menunggu' => $pendingPgCount,
                'nominal_menunggu' => round($pendingPgNom, 2)
            ],
            'pembayaran' => $pembayaranList
        ]);
    }

    // Default: Slip gaji pribadi untuk periode tertentu
    $stmt = $pdo->prepare("
        SELECT g.*,
               k.nama AS nama_karyawan, k.kode_karyawan, k.jabatan
        FROM gaji g
        JOIN karyawan k ON g.id_karyawan = k.id_karyawan
        WHERE g.id_karyawan = ? AND g.periode = ?
        ORDER BY g.id_gaji DESC
    ");
    $stmt->execute([$kId, $periode]);
    $data = $stmt->fetchAll(PDO::FETCH_ASSOC);

    jsonResponse(true, "Data slip gaji periode $periode berhasil dimuat", $data);

} else {
    jsonResponse(false, "Akses ditolak. Operasi ini hanya untuk Administrator.", null, 403);
}
