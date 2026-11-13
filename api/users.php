<?php
// ==========================================================
// ROUTER PENGGUNA (USERS API)
// Mengarahkan ke admin/users.php untuk pengelolaan akun
// ==========================================================
require_once __DIR__ . '/config/database.php';

$currentUser = requireLogin();

if ($currentUser['peran'] === 'admin') {
    require __DIR__ . '/admin/users.php';
} else {
    // Karyawan hanya dapat melihat profil akunnya sendiri
    if ($_SERVER['REQUEST_METHOD'] === 'GET') {
        $idUser = (int)($currentUser['id_user'] ?? 0);
        $stmt = $pdo->prepare("
            SELECT u.id_user, u.id_karyawan, u.email, u.username, u.peran, u.aktif, u.created_at,
                   k.nama, k.jabatan, k.kode_karyawan, k.no_hp AS nomor_hp,
                   CASE WHEN u.aktif = 1 THEN 'aktif' ELSE 'nonaktif' END AS status_karyawan
            FROM `user` u
            LEFT JOIN karyawan k ON u.id_karyawan = k.id_karyawan
            WHERE u.id_user = ?
            LIMIT 1
        ");
        $stmt->execute([$idUser]);
        $row = $stmt->fetch(PDO::FETCH_ASSOC);
        if ($row) {
            jsonResponse(true, "Data akun berhasil dimuat.", $row);
        } else {
            jsonResponse(false, "Akun tidak ditemukan.", null, 404);
        }
    } else {
        jsonResponse(false, "Akses ditolak: Hanya Administrator yang dapat mengelola akun pengguna.", null, 403);
    }
}

