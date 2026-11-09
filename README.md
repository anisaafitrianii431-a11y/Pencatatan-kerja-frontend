# RuangKerja — Frontend

Frontend React + Vite untuk autentikasi, navigasi, dan pengelolaan pencatatan kerja CV. Putra Anugrah Mandiri.

## Menjalankan aplikasi

```sh
npm install
npm run dev
```

Buat `.env` jika API PHP tidak berada pada origin yang sama:

```env
VITE_API_BASE_URL=http://localhost/pencatatan-kerja/backend/public/api
```

Pastikan Apache dan MySQL/MariaDB Laragon berjalan. Backend dilayani oleh Apache melalui `backend/public/api`.

## Fitur & Modul

- **Autentikasi & Akun**: Login, Registrasi Karyawan, Sesi Aman.
- **Manajemen Admin**: Data Karyawan, Data Pekerjaan, Data Penugasan, Profil & Pengaturan.
- **Panel Pekerja**: Dashboard Pekerja, Pekerjaan Tersedia, Pekerjaan Saya, Riwayat Pengajuan, Profil & Pengaturan.
- **Operasional**: Absensi & Jam Kerja, Pengeluaran & Nota Kwitansi.
