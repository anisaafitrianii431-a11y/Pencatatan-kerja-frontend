import { apiGet, apiPut } from './api.js'

function normalizeAbsensi(item) {
  const durasiMenit = Number(item.durasi_menit ?? 0)
  const safeMenit = durasiMenit > 0 ? durasiMenit : 0
  const jam = Math.floor(safeMenit / 60)
  const sisaMenit = safeMenit % 60

  return {
    ...item,
    id_absensi: Number(item.id_absensi),
    id_karyawan: Number(item.id_karyawan),
    id_pekerjaan: Number(item.id_pekerjaan),
    durasi_menit: safeMenit,
    durasi_jam: Number((safeMenit / 60).toFixed(2)),
    durasi_format: item.durasi_format || `${jam}j ${sisaMenit}m`,
  }
}

export async function getAbsensi(params = {}) {
  const query = new URLSearchParams()
  if (params.id_karyawan) query.set('id_karyawan', String(params.id_karyawan))
  if (params.id_pekerjaan) query.set('id_pekerjaan', String(params.id_pekerjaan))
  if (params.tanggal) query.set('tanggal', params.tanggal)
  if (params.status_verifikasi) query.set('status_verifikasi', params.status_verifikasi)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  const records = await apiGet(`/absensi${queryString}`)
  return Array.isArray(records) ? records.map(normalizeAbsensi) : []
}

export async function getAbsensiById(id) {
  const record = await apiGet(`/absensi/${id}`)
  return normalizeAbsensi(record)
}

export async function verifikasiAbsensi(id, statusVerifikasi) {
  return apiPut(`/absensi/${id}/verifikasi`, {
    status_verifikasi: statusVerifikasi,
  })
}

