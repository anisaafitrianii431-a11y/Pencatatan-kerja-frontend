// ============================================================
// MOCK DATA — Sistem Pencatatan Kerja
// Anggota 3: Modul Absensi
// Ganti dengan API call (axios) ketika backend siap
// ============================================================

// ── USERS ────────────────────────────────────────────────────
export const users = [
  { id_user: 1, nama: 'Admin Utama',    role: 'admin',   id_karyawan: null },
  { id_user: 2, nama: 'Budi Santoso',   role: 'pekerja', id_karyawan: 1 },
  { id_user: 3, nama: 'Citra Dewi',     role: 'pekerja', id_karyawan: 2 },
  { id_user: 4, nama: 'Dani Firmansyah',role: 'pekerja', id_karyawan: 3 },
];

// ── KARYAWAN ─────────────────────────────────────────────────
export const karyawan = [
  { id_karyawan: 1, nama: 'Budi Santoso',    jabatan: 'Teknisi', no_hp: '08111000001' },
  { id_karyawan: 2, nama: 'Citra Dewi',      jabatan: 'Surveyor', no_hp: '08111000002' },
  { id_karyawan: 3, nama: 'Dani Firmansyah', jabatan: 'Operator', no_hp: '08111000003' },
];

// ── PEKERJAAN ─────────────────────────────────────────────────
// latitude & longitude ditambahkan di sini (keputusan Anggota 3)
// sesuai kesepakatan: lokasi adalah atribut pekerjaan, bukan per-sesi
export const pekerjaan = [
  {
    id_pekerjaan: 1,
    nama_pekerjaan: 'Pemasangan Jaringan Fiber Optik',
    deskripsi: 'Pemasangan kabel FO dari titik distribusi ke rumah pelanggan di perumahan Griya Asri.',
    shift_mulai: '07:00',
    shift_selesai: '16:00',
    status: 'aktif',
    latitude: '-6.914744',
    longitude: '107.609810',
    foto_lokasi: null,
  },
  {
    id_pekerjaan: 2,
    nama_pekerjaan: 'Survei Lahan Proyek B',
    deskripsi: 'Pengukuran dan dokumentasi lahan untuk proyek pembangunan gudang logistik.',
    shift_mulai: '08:00',
    shift_selesai: '17:00',
    status: 'aktif',
    latitude: '-6.920100',
    longitude: '107.618200',
    foto_lokasi: null,
  },
  {
    id_pekerjaan: 3,
    nama_pekerjaan: 'Pemeliharaan Generator Cadangan',
    deskripsi: 'Pengecekan rutin dan perbaikan genset cadangan di kantor pusat.',
    shift_mulai: '09:00',
    shift_selesai: '15:00',
    status: 'selesai',
    latitude: null,
    longitude: null,
    foto_lokasi: null,
  },
];

// ── PENUGASAN ─────────────────────────────────────────────────
// Menghubungkan karyawan ke pekerjaan (dibaca saja oleh Anggota 3)
export const penugasan = [
  { id_penugasan: 1, id_pekerjaan: 1, id_karyawan: 1 }, // Budi → Fiber Optik
  { id_penugasan: 2, id_pekerjaan: 1, id_karyawan: 2 }, // Citra → Fiber Optik
  { id_penugasan: 3, id_pekerjaan: 2, id_karyawan: 2 }, // Citra → Survei
  { id_penugasan: 4, id_pekerjaan: 2, id_karyawan: 3 }, // Dani → Survei
  { id_penugasan: 5, id_pekerjaan: 3, id_karyawan: 1 }, // Budi → Generator
];

// ── ABSENSI ───────────────────────────────────────────────────
// Kolom: id_absensi, id_pekerjaan, id_karyawan, tanggal,
//        jam_masuk, jam_pulang (null = belum pulang),
//        status_verifikasi
export const absensiAwal = [
  {
    id_absensi: 1,
    id_pekerjaan: 1,
    id_karyawan: 1,
    tanggal: '2026-11-01',
    jam_masuk: '07:05',
    jam_pulang: '16:10',
    status_verifikasi: 'disetujui',
    foto_masuk: null,
    lokasi_masuk: { lat: -6.9147, lng: 107.6098, alamat: 'Jl. Griya Asri No.1, Bandung' },
    foto_pulang: null,
    lokasi_pulang: { lat: -6.9147, lng: 107.6098, alamat: 'Jl. Griya Asri No.1, Bandung' },
  },
  {
    id_absensi: 2,
    id_pekerjaan: 1,
    id_karyawan: 1,
    tanggal: '2026-11-02',
    jam_masuk: '07:00',
    jam_pulang: '15:45',
    status_verifikasi: 'disetujui',
    foto_masuk: null,
    lokasi_masuk: { lat: -6.9147, lng: 107.6098, alamat: 'Jl. Griya Asri No.1, Bandung' },
    foto_pulang: null,
    lokasi_pulang: null,
  },
  {
    id_absensi: 3,
    id_pekerjaan: 3,
    id_karyawan: 1,
    tanggal: '2026-11-03',
    jam_masuk: '09:00',
    jam_pulang: '14:30',
    status_verifikasi: 'menunggu',
    foto_masuk: null,
    lokasi_masuk: null,
    foto_pulang: null,
    lokasi_pulang: null,
  },
  {
    id_absensi: 4,
    id_pekerjaan: 1,
    id_karyawan: 2,
    tanggal: '2026-11-01',
    jam_masuk: '07:15',
    jam_pulang: '16:00',
    status_verifikasi: 'disetujui',
    foto_masuk: null,
    lokasi_masuk: { lat: -6.9201, lng: 107.6182, alamat: 'Jl. Proyek B, Bandung' },
    foto_pulang: null,
    lokasi_pulang: null,
  },
  {
    id_absensi: 5,
    id_pekerjaan: 2,
    id_karyawan: 2,
    tanggal: '2026-11-04',
    jam_masuk: '08:05',
    jam_pulang: null,
    status_verifikasi: 'menunggu',
    foto_masuk: null,
    lokasi_masuk: null,
    foto_pulang: null,
    lokasi_pulang: null,
  },
];

// ── HELPER: query penugasan aktif milik satu karyawan ─────────
export function getPekerjaanAktifByKaryawan(id_karyawan) {
  const idPekerjaanList = penugasan
    .filter(p => p.id_karyawan === id_karyawan)
    .map(p => p.id_pekerjaan);

  return pekerjaan.filter(
    pj => idPekerjaanList.includes(pj.id_pekerjaan) && pj.status === 'aktif'
  );
}

// ── HELPER: hitung durasi (menit) dari jam_masuk & jam_pulang ─
export function hitungDurasi(jam_masuk, jam_pulang) {
  if (!jam_masuk || !jam_pulang) return null;
  const [hM, mM] = jam_masuk.split(':').map(Number);
  const [hP, mP] = jam_pulang.split(':').map(Number);
  const totalMenit = (hP * 60 + mP) - (hM * 60 + mM);
  if (totalMenit <= 0) return null;
  const jam  = Math.floor(totalMenit / 60);
  const menit = totalMenit % 60;
  return { totalMenit, label: `${jam}j ${menit}m` };
}
