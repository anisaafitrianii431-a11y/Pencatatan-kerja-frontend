import { apiGet, apiPost, apiPut, AbsensiService } from './api.js'

function calculateExactMinutes(item) {
  // Jika ada jam_masuk & jam_pulang, hitung langsung selisih menit presisi (integer)
  if (item.jam_masuk && item.jam_pulang) {
    const partsMasuk = String(item.jam_masuk).split(':')
    const partsPulang = String(item.jam_pulang).split(':')
    const h1 = parseInt(partsMasuk[0], 10) || 0
    const m1 = parseInt(partsMasuk[1], 10) || 0
    let h2 = parseInt(partsPulang[0], 10) || 0
    const m2 = parseInt(partsPulang[1], 10) || 0
    if (h2 < h1 || (h2 === h1 && m2 < m1)) {
      h2 += 24
    }
    const diff = (h2 * 60 + m2) - (h1 * 60 + m1)
    if (diff > 0) return Math.round(diff)
  }

  // Jika durasi_menit sudah ada
  if (item.durasi_menit !== undefined && item.durasi_menit !== null && !isNaN(Number(item.durasi_menit))) {
    return Math.max(0, Math.round(Number(item.durasi_menit)))
  }

  // Jika durasi_jam ada
  if (item.durasi_jam !== undefined && item.durasi_jam !== null && !isNaN(Number(item.durasi_jam))) {
    return Math.max(0, Math.round(Number(item.durasi_jam) * 60))
  }

  return 0
}

function normalizeAbsensi(item) {
  const safeMenit = calculateExactMinutes(item)
  const jam = Math.floor(safeMenit / 60)
  const sisaMenit = safeMenit % 60

  return {
    ...item,
    id_absensi: Number(item.id_absensi),
    id_karyawan: Number(item.id_karyawan),
    id_pekerjaan: Number(item.id_pekerjaan),
    durasi_menit: safeMenit,
    durasi_jam: Number((safeMenit / 60).toFixed(2)),
    durasi_format: `${jam}j ${sisaMenit}m`,
  }
}

export async function getAbsensi(params = {}) {
  const query = new URLSearchParams()
  if (params.id_karyawan) query.set('id_karyawan', String(params.id_karyawan))
  if (params.id_pekerjaan) query.set('id_pekerjaan', String(params.id_pekerjaan))
  if (params.tanggal) query.set('tanggal', params.tanggal)
  if (params.status_verifikasi) query.set('status_verifikasi', params.status_verifikasi)

  const queryString = query.toString() ? `?${query.toString()}` : ''
  let records = []

  try {
    const res = await apiGet(`/absensi${queryString}`)
    if (Array.isArray(res) && res.length > 0) {
      records = res
    }
  } catch {
    // Backend API offline / fallback
  }

  try {
    const localRecords = await AbsensiService.getAll(params)
    if (Array.isArray(localRecords) && localRecords.length > 0) {
      const serverKeys = new Set(
        records.map(
          (r) =>
            `${r.id_karyawan}-${r.id_pekerjaan}-${r.tanggal}-${(r.jam_masuk || '').slice(0, 5)}`
        )
      )
      const unsynced = localRecords.filter(
        (r) =>
          !serverKeys.has(
            `${r.id_karyawan}-${r.id_pekerjaan}-${r.tanggal}-${(r.jam_masuk || '').slice(0, 5)}`
          )
      )
      records = [...unsynced, ...records]
    }
  } catch {
    // ignore
  }

  return records.map(normalizeAbsensi)
}

export async function createAbsensi(data) {
  try {
    const res = await apiPost('/absensi', data)
    return res
  } catch (err) {
    console.warn('apiPost /absensi fallback:', err)
  }
  return AbsensiService.absenMasuk(data)
}

export async function checkoutAbsensi(id, jamPulang, extra = {}) {
  try {
    const res = await apiPut(`/absensi/${id}`, { jam_pulang: jamPulang, ...extra })
    return res
  } catch (err) {
    console.warn('apiPut /absensi checkout fallback:', err)
  }
  return AbsensiService.absenPulang(id, jamPulang)
}

export async function getAbsensiById(id) {
  try {
    const record = await apiGet(`/absensi/${id}`)
    if (record) return normalizeAbsensi(record)
  } catch {
    // fallback
  }
  const all = await AbsensiService.getAll()
  const found = all.find((a) => Number(a.id_absensi) === Number(id))
  return found ? normalizeAbsensi(found) : null
}

export async function verifikasiAbsensi(id, statusVerifikasi) {
  try {
    await apiPut(`/absensi/${id}/verifikasi`, {
      status_verifikasi: statusVerifikasi,
    })
  } catch {
    // fallback
  }
  return AbsensiService.verifikasi(id, statusVerifikasi)
}

