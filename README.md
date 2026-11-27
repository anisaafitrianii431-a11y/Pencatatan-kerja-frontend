# Sistem Pencatatan Kerja & Penggajian Multi-Proyek (RuangKerja)

Aplikasi enterprise-grade manajemen proyek, jam kerja, absensi geofencing berbasis foto selfie, manajemen pengeluaran kantong ganda (Uang Kas Kantor vs Talangan Pribadi), serta mesin penggajian (*payroll engine*) otomatis berbasis prorata hari kerja efektif dan versioning skema upah (*immutability*).

Dibangun khusus untuk operasional multi-proyek dinamis dengan kolaborasi multi-pekerja, pemantauan koordinat GPS lapangan, dan integrasi penuh dari perencanaan *blueprint* tim hingga cetak slip gaji resmi.

---

## 🛠️ Tech Stack & Arsitektur

Aplikasi ini menggunakan arsitektur modern **Client-Server (Decoupled REST API)**:

- **Frontend**:
  - **React 19** + **Vite 8** (Performa rendering ultra-cepat & HMR)
  - **Tailwind CSS v4** (Desain UI responsif, modern, dan mobile-friendly)
  - **Lucide React** (Koleksi icon interface)
  - **Leaflet & OpenStreetMap** (Peta interaktif penentuan titik koordinat & radius geofencing)
  - **HTML5 Canvas Video/Camera Stream** (Ambil foto selfie absensi live dengan kompresi gambar sisi klien)
- **Backend**:
  - **Node.js** + **Express 5** (RESTful API pada port `5000`)
  - **MySQL2** (Koneksi database pool dengan dukungan transaksi ACID)
  - **JWT (JSON Web Token)** & **BcryptJS** (Autentikasi stateless aman & hashing kata sandi)
  - **Multer** (Penanganan upload file selfie absensi & foto bukti nota kwitansi)
- **Database**:
  - **MySQL 8.0 / MariaDB** (Default database: `jam_kerja`, port `3306`)

---

## ✨ Fitur-Fitur Utama Sistem

### 1. 👑 Master Role & Hierarki Jabatan
- **Struktur Bertingkat**: Kelola jabatan perusahaan berbasis level hierarki (`Level 1` Teknisi/Staf, `Level 2` Supervisor/Koordinator, `Level 3` Manajer, dst.).
- **Standar Plafon Gaji**: Penetapan rentang gaji standar per role (`gaji_min_bulanan` s.d. `gaji_max_bulanan`) guna mencegah ketimpangan upah dan kesalahan input di lapangan.
- **Validasi Anti-Collision**: Pengecekan otomatis agar rentang level dan nama jabatan tidak tumpang-tindih secara tidak wajar.

### 2. 📋 Wizard Proyek 4 Tahap (*Project Creation Wizard*)
Penyusunan proyek baru terstruktur melalui 4 langkah interaktif:
1. **Tahap 1 — Info & Waktu Kerja**:
   - Nama proyek, kode proyek (otomatis `PRJ-YYYYMM-XXX` atau kustom), deskripsi, dan durasi tanggal.
   - Konfigurasi kalender kerja proyek: standar hari kerja per bulan (contoh: 22 hari untuk 5 hari kerja/minggu), standar jam kerja per hari (8 jam), tanggal cutoff penggajian, tanggal pembayaran gaji, dan kebijakan lembur (*lembur diizinkan / ditutup*).
2. **Tahap 2 — Lokasi & Geofencing GPS**:
   - Penentuan koordinat GPS (*latitude/longitude*) proyek via Leaflet Map Picker atau deteksi otomatis GPS perangkat.
   - Pengaturan batas toleransi radius presensi (*geofencing radius* dalam satuan meter).
3. **Tahap 3 — Blueprint Tim & Role Budgeting**:
   - Menentukan kuota slot pekerja per jabatan yang dibutuhkan pada proyek (misal: butuh 2 Teknisi, 1 Supervisor).
   - Menyesuaikan rentang batas gaji bulanan spesifik proyek per role.
4. **Tahap 4 — Ringkasan & Simpan**:
   - Tinjauan menyeluruh estimasi kebutuhan anggaran gaji tim dan validasi data sebelum proyek diterbitkan.

### 3. 👥 Slot-Based Workforce & Versioning Skema Gaji (*Immutability*)
- **Role Slot Board**: Visualisasi papan slot penugasan pekerja. Karyawan ditugaskan ke slot role yang sesuai kualifikasinya.
- **Prinsip Anti-Overwrite (Immutability)**:
  - Setiap perubahan nominal gaji atau jenis upah (`per_jam`, `per_hari`, `per_bulan`, `per_tahun`) tidak pernah menimpa riwayat masa lalu.
  - Sistem mencatat riwayat versi upah di tabel `penugasan_gaji_riwayat` dengan masa berlaku efektif (`effective_from` s.d. `effective_to`).
  - Rekap absensi dan slip gaji pada bulan-bulan lampau dijamin 100% konsisten dan tidak berubah.
- **Normalisasi Satuan Otomatis**: Konversi real-time antara upah per jam, per hari, dan bulanan berdasarkan standar jam kalender kerja proyek.

### 4. 📸 Absensi Geofencing GPS & Live Selfie Camera
- **Validasi Lokasi Real-Time**: Menghitung jarak pengguna ke titik proyek menggunakan rumus *Haversine*. Pekerja tidak dapat absen jika berada di luar radius geofencing.
- **Kamera Selfie Langsung**: Membuka webcam/kamera smartphone pekerja secara live (bukan upload foto galeri) untuk mencegah kecurangan absensi (*anti-fake attendance*).
- **Client-Side Image Compressor**: Foto selfie dan struk nota dikompresi otomatis di sisi browser sebelum diunggah untuk menghemat bandwidth dan penyimpanan server.
- **Verifikasi Dua Arah**: Pencatatan Jam Masuk (*Check-in*), Jam Pulang (*Check-out*), durasi kerja otomatis, serta status persetujuan oleh Admin (*menunggu*, *disetujui*, *ditolak*).

### 5. 💰 Double-Pocket Expense Tracking (Kas Kantor vs Talangan Pribadi)
Pencatatan pengeluaran lapangan dengan pemisahan kantong dana yang tegas:
1. **Uang Kas Kantor / Proyek**:
   - Dana kas operasional yang dipegang oleh Penanggung Jawab (PJ) proyek.
   - Pekerja cukup mengunggah nota kwitansi belanja untuk pertanggungjawaban kas. Sisa saldo kas proyek dapat dihitung dan dikembalikan ke kantor.
2. **Uang Pribadi (Talangan / Reimbursement)**:
   - Pekerja menalangi biaya proyek menggunakan dompet pribadi.
   - Admin memverifikasi keabsahan nota belanja.
   - Dana talangan yang disetujui dapat dicairkan via batch pembayaran khusus atau otomatis dimasukkan ke slip gaji bulanan pekerja.

### 6. 🧮 Mesin Penggajian Otomatis (*Payroll Engine*)
- **Multi-Unit Wage Support**: Mendukung perhitungan skema gaji `per_jam`, `per_hari`, `per_bulan`, hingga `per_tahun`.
- **Prorata Hari Kerja Efektif**:
  - Untuk karyawan bergaji bulanan, jika periode penugasan tidak penuh satu bulan kalender, sistem menghitung gaji secara adil:
    $$\text{Gaji Pokok Prorata} = \frac{\text{Hari Efektif Tugas}}{\text{Standar Hari Kerja Proyek}} \times \text{Gaji Bulanan}$$
- **Otomasi Lembur & Penyesuaian**:
  - Jam lembur dihitung otomatis dari sesi kerja yang melebihi batas harian dan disetujui admin.
  - Komponen penyesuaian: Tunjangan/Bonus, Potongan, dan Penggantian Uang Talangan Disetujui.
- **Cetak Slip Gaji Resmi**: Dilengkapi kop surat resmi CV. Putra Anugrah Mandiri, rincian komponen pendapatan, potongan, dan area tanda tangan yang siap dicetak/diekspor ke PDF.

### 7. 🔐 Role-Based Access Control (RBAC)
- **Super Admin**: Akses mutlak ke seluruh data, manajemen akun pengguna, pengaturan sistem, dan audit keuangan.
- **Admin**: Mengelola proyek, memverifikasi absensi & pengeluaran, menyetujui lembur, dan mengelola penggajian.
- **Karyawan / Pekerja**: Melihat penugasan proyek, melakukan absensi masuk/pulang berswafoto, mengajukan pengeluaran/reimbursement, serta melihat riwayat slip gaji pribadi.

---

## 🗄️ Struktur Database Utama

Aplikasi berjalan di atas database relational `jam_kerja`:

| Nama Tabel | Deskripsi & Peran Arsitektur |
|---|---|
| `user` | Kredensial autentikasi (`email`, `kata_sandi` Bcrypt, `peran`, `id_karyawan`, `is_active`). |
| `karyawan` | Master profil karyawan (`kode_karyawan`, `nama`, `jabatan`, `no_hp`, `status_kerja`). |
| `master_role` | Standar master jabatan perusahaan, level hierarki (1–N), dan batas gaji min/max. |
| `pekerjaan` | Data proyek, titik GPS (`latitude`, `longitude`, `radius_meter`), serta konfigurasi kalender kerja (`jam_per_hari`, `hari_kerja_per_bulan`, `tanggal_cutoff`, `lembur_diizinkan`). |
| `pekerjaan_role_budget` | Blueprint kuota slot dan batas rentang gaji bulanan per role pada setiap proyek. |
| `penugasan` | Alokasi pekerja ke proyek dan slot role tertentu. |
| `penugasan_gaji_riwayat` | Versioning riwayat skema gaji pekerja (`nominal_upah`, `jenis_upah`, `normalized_monthly`, `effective_from`, `effective_to`). |
| `absensi` | Catatan presensi masuk & pulang, durasi kerja, koordinat GPS, foto selfie, dan status verifikasi admin. |
| `pengeluaran` | Pencatatan pengeluaran proyek, jenis dana (`kantor` vs `pribadi`), foto bukti nota, status verifikasi & status reimbursement. |
| `dana_kantor` | Buku kas pencatatan modal awal kas kantor/proyek yang disalurkan ke PJ lapangan. |
| `pembayaran_reimbursement`| Riwayat pencairan dana talangan pribadi karyawan yang disetujui. |
| `gaji` | Dokumen rekapitulasi penggajian bulanan per karyawan per proyek. |
| `role_permissions` | Matriks perizinan fitur dinamis untuk otorisasi hak akses. |

---

## 🚀 Panduan Instalasi & Menjalankan Aplikasi

### 1. Prasyarat Sistem
- **Node.js** v18.0 atau lebih baru (Disarankan Node.js v20+)
- **Laragon / XAMPP** (dengan Apache dan MySQL/MariaDB aktif)
- **Git**

---

### 2. Konfigurasi Database
1. Buka Laragon dan pastikan service **MySQL** sudah berjalan (**Start All**).
2. Buat database baru bernama `jam_kerja` melalui phpMyAdmin (`http://localhost/phpmyadmin`) atau terminal MySQL:
   ```sql
   CREATE DATABASE jam_kerja CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```
3. Jalankan skrip migrasi database yang berada di folder `backend/migrations/`:
   - `backend/migrations/001_phase1_project_role_payroll_foundation.sql`
   - `backend/migrations/001_create_master_role.sql`

---

### 3. Konfigurasi Environment Backend
Masuk ke direktori `backend` dan periksa file `.env`:
```env
PORT=5000
NODE_ENV=development
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASS=
DB_NAME=jam_kerja
JWT_SECRET=rahasia_kunci_jwt_12345_pencatatan_kerja_super_aman_2026
CORS_ORIGINS=http://localhost:5173,http://127.0.0.1:5173
```

---

### 4. Menjalankan Backend API (Port 5000)
Buka terminal di root proyek atau direktori `backend`:
```bash
cd backend
npm install
npm run dev
```
> Server Express akan berjalan di `http://localhost:5000`.

---

### 5. Menjalankan Frontend React (Port 5173)
Buka terminal baru di direktori root aplikasi:
```bash
npm install
npm run dev
```
> Aplikasi web dapat diakses di browser: `http://localhost:5173`.
> Vite secara otomatis melakukan proxy permintaan `/api` ke backend Express port `5000`.

---

## 🔑 Akun Uji Coba Default (Demo Credentials)

| Peran (Role) | Email | Kata Sandi | Keterangan |
|---|---|---|---|
| **Super Admin** | `superadmin@jamkerja.com` | `admin123` | Akses penuh seluruh modul & kontrol user |
| **Admin** | `admin@jamkerja.com` | `admin123` | Manajemen proyek, absensi, kas, penggajian |
| **Pekerja 1** | `budi@jamkerja.com` | `karyawan123` | Budi Santoso (Teknisi Lapangan - Bulanan) |
| **Pekerja 2** | `nadia@jamkerja.com` | `karyawan123` | Nadia (Supervisor - Per Jam) |
| **Pekerja 3** | `andi@jamkerja.com` | `karyawan123` | Andi Putra (Software Development - Per Jam) |

---

## 📐 Logika & Rumus Penggajian (Payroll Engine)

Sistem menggunakan formula standar ketenagakerjaan yang adil dan transparan:

### 1. Normalisasi Upah ke Standar Bulanan
$$\text{Upah Bulanan (Per Jam)} = \text{Nominal Per Jam} \times \text{Jam/Hari} \times \text{Hari Kerja/Bulan}$$
*(Contoh: $\text{Rp } 35.000 \times 8 \text{ jam} \times 22 \text{ hari} = \text{Rp } 6.160.000/\text{bulan}$)*

$$\text{Upah Bulanan (Per Hari)} = \text{Nominal Per Hari} \times \text{Hari Kerja/Bulan}$$

### 2. Prorata Gaji Pokok Bulanan Berdasarkan Hari Efektif Tugas
Jika seorang pekerja ditugaskan di tengah periode (misal proyek mulai tanggal 23 s.d. 25 November = 3 hari kerja aktif dari standar 22 hari):
$$\text{Gaji Pokok Prorata} = \frac{\text{Hari Efektif Tugas}}{\text{Standar Hari Kerja}} \times \text{Tarif Bulanan}$$
*(Contoh: $\frac{3}{22} \times \text{Rp } 3.500.000 = \text{Rp } 477.273$)*

### 3. Gaji Bersih Akhir (*Take Home Pay*)
$$\text{Gaji Bersih} = (\text{Gaji Pokok Prorata / Upah Jam Kerja}) + \text{Upah Lembur} + \text{Bonus} - \text{Potongan} + \text{Reimbursement Disetujui}$$

---

## 📂 Struktur Direktori Proyek

```text
├── backend/                        # Server Backend Express 5
│   ├── config/                     # Konfigurasi database & environment
│   ├── controllers/                # Controller API (auth, pekerjaan, absensi, pengeluaran, gaji, dll.)
│   ├── middlewares/                # Middleware autentikasi JWT, role check, multer
│   ├── migrations/                 # Migrasi DDL database MySQL
│   ├── routes/                     # Definisi rute endpoint RESTful API
│   ├── uploads/                    # Direktori penyimpanan selfie & nota bukti
│   ├── utils/                      # Helper perhitungan payroll, konversi upah, dll.
│   ├── server.js                   # Entry point aplikasi backend Express
│   └── package.json
│
├── src/                            # Aplikasi Frontend React 19 + Vite
│   ├── api/ & services/            # Modul client HTTP fetch / axios API
│   ├── auth/                       # Context autentikasi, status login, & hak akses
│   ├── components/                 # Komponen UI modular
│   │   ├── pekerjaan/              # Wizard 4 Tahap, InteractiveMap, RoleSlotBoard, SalaryHistoryModal
│   │   ├── KameraAbsensi.jsx       # Komponen kamera live & kompresi canvas
│   │   ├── KopSuratCetak.jsx       # Kop surat resmi pencetakan dokumen
│   │   └── ...
│   ├── layouts/                    # Layout Tata Letak Admin & Tata Letak Karyawan
│   ├── pages/
│   │   ├── admin/                  # Dashboard, Master Role, Data Proyek, Verifikasi, Penggajian
│   │   └── karyawan/               # Dashboard Pekerja, Absensi Selfie, Pengeluaran, Gaji Saya
│   ├── utils/                      # Formatter mata uang rupiah, geolokasi, kompresor gambar
│   ├── App.jsx                     # Routing halaman aplikasi
│   └── main.jsx                    # Entry point React Vite
│
├── public/                         # Aset statis publik
├── README.md                       # Dokumentasi utama proyek
└── vite.config.js                  # Konfigurasi bundler Vite & API proxy
```

---

## 📄 Lisensi
Hak Cipta © 2026 CV. Putra Anugrah Mandiri. Dilindungi Undang-Undang.
