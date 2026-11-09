# RuangKerja — Frontend

Frontend React + Vite untuk autentikasi dan navigasi aplikasi pencatatan kerja.

## Menjalankan aplikasi

```sh
npm install
npm run dev
```

Buat `.env.local` jika API PHP tidak berada pada origin yang sama:

```env
VITE_API_BASE_URL=http://localhost/backend/api
```

Nilai default adalah `/api`. Setelah mengubah file environment, jalankan ulang Vite.

## Integrasi API PHP

Frontend menggunakan session cookie PHP (tidak menyimpan password atau token di `localStorage`). Endpoint harus mengembalikan JSON berikut:

| Method | Endpoint | Fungsi |
| --- | --- | --- |
| `POST` | `/auth/login` | Menerima `{"email":"...","password":"..."}`; memulai session dan mengembalikan user |
| `GET` | `/auth/me` | Mengembalikan user untuk session aktif; balas `401` bila belum login |
| `POST` | `/auth/logout` | Menghapus session dan mengembalikan `204` atau JSON |

Bentuk respons login dan profil:

```json
{
  "user": {
    "id_user": 1,
    "id_karyawan": 12,
    "email": "nama@contoh.com",
    "peran": "karyawan",
    "aktif": true,
    "nama": "Nama Karyawan"
  }
}
```

Respons mengikuti rancangan tabel `user`: `id_user` sebagai PK, `id_karyawan` sebagai FK, `email` unik, `kata_sandi` berisi hash password, `peran` bernilai `admin` atau `karyawan`, dan `aktif` sebagai status akun. Field `nama` dapat dikirim oleh backend dari hasil join ke tabel karyawan; jika tidak dikirim, frontend menampilkan email. Backend mencari akun berdasarkan email, memverifikasi `kata_sandi` dengan `password_verify()`, dan menolak akun dengan `aktif = 0`.

Untuk API beda origin, izinkan origin frontend secara spesifik dan aktifkan `Access-Control-Allow-Credentials`; jangan gunakan wildcard origin. Atur cookie session `HttpOnly`, `SameSite=Lax` (atau lebih ketat sesuai deployment), dan `Secure` di HTTPS. Validasi session dan peran juga wajib dilakukan pada setiap endpoint PHP yang dilindungi—pemeriksaan route di frontend hanya mengatur tampilan/navigation dan bukan kontrol akses backend.

## Route frontend

- `/login` — formulir email dan password.
- `/dashboard` — halaman utama untuk user yang sudah masuk.
- `/admin` — hanya untuk peran `admin`.
- `/karyawan` — hanya untuk peran `karyawan`.

Setelah login, user diarahkan ke route yang diminta atau ke halaman sesuai perannya. Menu sidebar juga ditampilkan berdasarkan role dari respons server.
