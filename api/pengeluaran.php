<?php
// Router Penengah: Mengarahkan permintaan ke modul Admin atau Karyawan sesuai sesi
require_once __DIR__ . '/config/database.php';
ensureKaryawanProfileSchema($pdo);
$currentUser = requireLogin();

if ($currentUser['peran'] === 'admin') {
    require __DIR__ . '/admin/pengeluaran.php';
} else {
    require __DIR__ . '/karyawan/pengeluaran.php';
}
