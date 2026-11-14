<?php
// Router Penengah: Mengarahkan permintaan ke modul Admin atau Karyawan sesuai sesi
require_once __DIR__ . '/config/database.php';
$currentUser = requireLogin();
ensureKaryawanProfileSchema($pdo);

if ($currentUser['peran'] === 'admin') {
    require __DIR__ . '/admin/pekerja.php';
} else {
    // Karyawan hanya memiliki akses baca (GET) untuk melihat identitas diri atau rekan kerja
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        if (!empty($_GET['id_karyawan'])) {
            $stmt = $pdo->prepare("SELECT id_karyawan, nama, jabatan, tarif_per_jam, no_hp, alamat, foto_profil, kontak_darurat, nama_bank, no_rekening FROM karyawan WHERE id_karyawan = ?");
            $stmt->execute([(int)$_GET['id_karyawan']]);
            $karyawan = $stmt->fetch();
            if ($karyawan) {
                jsonResponse(true, "Data karyawan berhasil dimuat", $karyawan);
            } else {
                jsonResponse(false, "Karyawan tidak ditemukan", null, 404);
            }
        } else {
            $stmt = $pdo->query("SELECT id_karyawan, nama, jabatan, tarif_per_jam, no_hp, alamat, foto_profil, kontak_darurat, nama_bank, no_rekening FROM karyawan ORDER BY id_karyawan DESC");
            $data = $stmt->fetchAll();
            jsonResponse(true, "Daftar pekerja berhasil dimuat", $data);
        }
    } else {
        jsonResponse(false, "Akses ditolak: Menu data pekerja hanya dapat diubah oleh Administrator.", null, 403);
    }
}
