import { AbsensiService, apiGet, hitungDurasi } from './api.js'
import {
  getNtpSyncState,
  getSyncedJakartaNow,
  getSyncedNowDate,
  subscribeNtpSync,
  syncNtpTime,
} from '../utils/ntpTime.js'

export {
  getNtpSyncState,
  getSyncedJakartaNow,
  getSyncedNowDate,
  subscribeNtpSync,
  syncNtpTime,
}

function normalizeAbsensi(item) {
  const computedHours = hitungDurasi(item.jam_masuk, item.jam_pulang, Boolean(item.is_overnight))
  const durasiJam = item.durasi_jam !== undefined && item.durasi_jam !== null
    ? Number(item.durasi_jam)
    : computedHours
  const rawMenit =
    item.durasi_menit !== undefined && item.durasi_menit !== null
      ? Number(item.durasi_menit)
      : Math.round((Number(durasiJam) || 0) * 60)
  const safeMenit = rawMenit > 0 ? rawMenit : 0
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
  const records = await AbsensiService.getAll(params)
  return Array.isArray(records) ? records.map(normalizeAbsensi) : []
}

export async function getAbsensiById(id) {
  const record = await apiGet(`/absensi/${id}`)
  return normalizeAbsensi(record)
}

export async function absenMasuk(payload) {
  return AbsensiService.absenMasuk(payload)
}

export async function absenPulang(idAbsensi, jamPulang = '', isOvernight = false, extra = {}) {
  return AbsensiService.absenPulang(idAbsensi, jamPulang, isOvernight, extra)
}

export async function verifikasiAbsensi(id, statusVerifikasi, catatanAdmin = '') {
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
