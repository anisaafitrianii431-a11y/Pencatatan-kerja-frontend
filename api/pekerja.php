<?php
// Router Penengah: Mengarahkan permintaan ke modul Admin atau Karyawan sesuai sesi
require_once __DIR__ . '/config/database.php';
$currentUser = requireLogin();

if ($currentUser['peran'] === 'admin') {
    require __DIR__ . '/admin/pekerja.php';
} else {
    jsonResponse(false, "Akses ditolak: Menu data pekerja hanya dapat diakses oleh Administrator.", null, 403);
}
