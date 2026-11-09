export const STATUS_PEKERJAAN = {
  BELUM_MULAI: 'belum_mulai',
  BERJALAN: 'berjalan',
  SELESAI: 'selesai',
}

export const STATUS_PEKERJAAN_OPTIONS = [
  { value: STATUS_PEKERJAAN.BELUM_MULAI, label: 'Belum Dimulai' },
  { value: STATUS_PEKERJAAN.BERJALAN, label: 'Berjalan' },
  { value: STATUS_PEKERJAAN.SELESAI, label: 'Selesai' },
]

export const DUMMY_PEKERJAAN = [
  {
    id_pekerjaan: 1001,
    nama_pekerjaan: 'Renovasi Kantor Administrasi',
    deskripsi: 'Perbaikan ruang kerja dan pembaruan fasilitas kantor.',
    lokasi: 'Jl. Merdeka No. 12, Bandung',
    tanggal_mulai: '2026-10-01',
    target_selesai: '2026-12-15',
    status: STATUS_PEKERJAAN.BERJALAN,
  },
  {
    id_pekerjaan: 1002,
    nama_pekerjaan: 'Pembangunan Gudang Utama',
    deskripsi: 'Pembangunan struktur dan atap gudang penyimpanan.',
    lokasi: 'Kawasan Industri Cibitung',
    tanggal_mulai: '2026-09-10',
    target_selesai: '2027-02-28',
    status: STATUS_PEKERJAAN.BERJALAN,
  },
  {
    id_pekerjaan: 1003,
    nama_pekerjaan: 'Pengecatan Gedung Serbaguna',
    deskripsi: 'Pengecatan ulang bagian dalam dan luar gedung.',
    lokasi: 'Jl. Melati No. 8, Cimahi',
    tanggal_mulai: '2026-11-20',
    target_selesai: '2026-12-20',
    status: STATUS_PEKERJAAN.BELUM_MULAI,
  },
  {
    id_pekerjaan: 1004,
    nama_pekerjaan: 'Perbaikan Saluran Air',
    deskripsi: 'Perbaikan saluran air dan drainase lingkungan.',
    lokasi: 'Komplek Griya Asri, Bandung',
    tanggal_mulai: '2026-08-01',
    target_selesai: '2026-10-30',
    status: STATUS_PEKERJAAN.SELESAI,
  },
  {
    id_pekerjaan: 1005,
    nama_pekerjaan: 'Pemasangan Pagar Proyek',
    deskripsi: 'Pemasangan pagar pembatas untuk area proyek.',
    lokasi: 'Jl. Raya Cikarang, Bekasi',
    tanggal_mulai: '2026-11-25',
    target_selesai: '2026-12-10',
    status: STATUS_PEKERJAAN.BELUM_MULAI,
  },
  {
    id_pekerjaan: 1006,
    nama_pekerjaan: 'Pembuatan Kanopi Area Parkir',
    deskripsi: 'Pembuatan kanopi baja ringan di area parkir.',
    lokasi: 'Jl. Anggrek No. 4, Bandung',
    tanggal_mulai: '2026-07-05',
    target_selesai: '2026-09-01',
    status: STATUS_PEKERJAAN.SELESAI,
  },
  {
    id_pekerjaan: 1007,
    nama_pekerjaan: 'Pemasangan Keramik Lobi',
    deskripsi: 'Penggantian keramik pada area lobi utama.',
    lokasi: 'Jl. Diponegoro No. 25, Bandung',
    tanggal_mulai: '2026-12-01',
    target_selesai: '2026-12-18',
    status: STATUS_PEKERJAAN.BELUM_MULAI,
  },
]

export const DUMMY_PENUGASAN_PEKERJAAN_IDS = [1002, 1004]
export const PEKERJAAN_STORAGE_KEY = 'pencatatan-kerja:pekerjaan'
export const PENUGASAN_PEKERJAAN_STORAGE_KEY =
  'pencatatan-kerja:pekerjaan-tertugaskan'
