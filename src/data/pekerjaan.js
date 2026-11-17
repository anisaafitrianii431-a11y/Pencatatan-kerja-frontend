export const STATUS_PEKERJAAN = {
  BELUM_MULAI: 'belum_mulai',
  BERJALAN: 'berjalan',
  SELESAI: 'selesai',
}

export const STATUS_PEKERJAAN_OPTIONS = [
  { value: 'belum_mulai', label: 'Belum Dimulai' },
  { value: 'berjalan', label: 'Sedang Berjalan' },
  { value: 'selesai', label: 'Selesai' },
]

export const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'bg-amber-100 text-amber-800',
    color: '#d97706',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-blue-100 text-blue-800',
    color: '#2563eb',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-100 text-emerald-800',
    color: '#059669',
  },
}
