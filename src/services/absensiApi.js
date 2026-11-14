import { AbsensiService, apiGet, apiPost, apiPut, hitungDurasi } from './api.js'
import {
  getNtpSyncState,
  getSyncedJakartaNow,
  getSyncedNowDate,
  subscribeNtpSync,
  syncNtpTime,
} from '../utils/ntpTime.js'
import { parseCoordinates } from '../utils/geoLocation.js'

export {
  getNtpSyncState,
  getSyncedJakartaNow,
  getSyncedNowDate,
  subscribeNtpSync,
  syncNtpTime,
}

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

  const computedHours = hitungDurasi(item.jam_masuk, item.jam_pulang, Boolean(item.is_overnight))
  return Math.round((Number(computedHours) || 0) * 60)
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
    durasi_format: item.durasi_format || `${jam}j ${sisaMenit}m`,
    jarak_masuk: item.jarak_masuk !== undefined && item.jarak_masuk !== null ? Number(item.jarak_masuk) : null,
    jarak_pulang: item.jarak_pulang !== undefined && item.jarak_pulang !== null ? Number(item.jarak_pulang) : null,
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
  return AbsensiService.absenPulang(id, jamPulang, false, extra)
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

export async function absenMasuk(payload) {
  return createAbsensi(payload)
}

export async function absenPulang(idAbsensi, jamPulang = '', isOvernight = false, extra = {}) {
  return checkoutAbsensi(idAbsensi, jamPulang, { is_overnight: isOvernight, ...extra })
}

export async function verifikasiAbsensi(id, statusVerifikasi, catatanAdmin = '') {
  try {
    await apiPut(`/absensi/${id}/verifikasi`, {
      status_verifikasi: statusVerifikasi,
      catatan_admin: catatanAdmin,
    })
  } catch {
    // fallback
  }
  return AbsensiService.verifikasi(id, statusVerifikasi, catatanAdmin)
}

export function getJakartaNowFormatted() {
  const { tanggal, jam } = getSyncedJakartaNow()
  return { tanggal, jam }
}

function compareSessionsDesc(a, b) {
  const keyA = `${String(a?.tanggal || '').slice(0, 10)} ${String(a?.jam_masuk || '')}`
  const keyB = `${String(b?.tanggal || '').slice(0, 10)} ${String(b?.jam_masuk || '')}`
  if (keyA === keyB) return Number(b?.id_absensi || 0) - Number(a?.id_absensi || 0)
  return keyB.localeCompare(keyA)
}

/**
 * Menentukan ketersediaan tombol absensi untuk satu pekerjaan:
 * - Pekerjaan 'belum_mulai' / 'selesai' terkunci untuk absen masuk baru.
 * - Jika absen masuk & pulang sudah tercatat pada tanggal hari ini (Asia/Jakarta),
 *   absen masuk terkunci sampai hari & tanggal berikutnya.
 */
export function getJobAttendanceAvailability(job, jobSessions = [], referenceDate = getJakartaNowFormatted().tanggal) {
  const sorted = [...(Array.isArray(jobSessions) ? jobSessions : [])].sort(compareSessionsDesc)
  const activeSession = sorted.find((att) => !att?.jam_pulang) || null
  const todayCompletedSession =
    sorted.find(
      (att) =>
        String(att?.tanggal || '').slice(0, 10) === referenceDate &&
        Boolean(att?.jam_masuk) &&
        Boolean(att?.jam_pulang),
    ) || null
  const latestSession = sorted[0] || null
  const status = String(job?.status || 'belum_mulai')

  let mode = 'can_check_in'
  let lockLabel = ''
  let lockDescription = ''
  if (activeSession) {
    mode = 'pulang'
  } else if (status === 'selesai') {
    mode = 'locked_finished'
    lockLabel = 'Pekerjaan Telah Selesai'
    lockDescription = 'Pekerjaan ini sudah berstatus selesai dan tidak menerima absensi baru.'
  } else if (status !== 'berjalan') {
    mode = 'locked_not_started'
    lockLabel = 'Absensi Terkunci (Belum Dimulai)'
    lockDescription =
      'Pekerjaan masih berstatus Belum Dimulai. Absensi masuk baru terbuka setelah pekerjaan berjalan.'
  } else if (job?.metode_lokasi !== 'wfh' && !parseCoordinates(job?.titik_lokasi)) {
    mode = 'locked_no_location'
    lockLabel = 'Titik Lokasi Belum Disetel'
    lockDescription = 'Absensi masuk baru terbuka setelah Admin menetapkan koordinat GPS pekerjaan.'
  } else if (todayCompletedSession) {
    mode = 'locked_today_completed'
    lockLabel = 'Absensi Hari Ini Selesai (Terkunci)'
    lockDescription =
      'Absen masuk & pulang pada hari dan tanggal ini sudah tercatat. Terbuka kembali di hari & tanggal berikutnya.'
  }

  return {
    mode,
    canCheckIn: mode === 'can_check_in',
    canCheckOut: mode === 'pulang',
    isLocked: mode.startsWith('locked_'),
    lockLabel,
    lockDescription,
    activeSession,
    todayCompletedSession,
    latestSession,
    count: sorted.length,
    referenceDate,
  }
}
