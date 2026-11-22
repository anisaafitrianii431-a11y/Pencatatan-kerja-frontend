import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

function normalizeJob(job) {
  const latitude = job.latitude ?? ''
  const longitude = job.longitude ?? ''
  const parsedLatitude = Number(latitude)
  const parsedLongitude = Number(longitude)
  const titikLokasi = String(job.titik_lokasi ?? '').trim() || (
    latitude !== '' && longitude !== '' && Number.isFinite(parsedLatitude) && Number.isFinite(parsedLongitude)
      ? `${parsedLatitude}, ${parsedLongitude}`
      : ''
  )
  const kuota = job.kuota_pekerja !== null && job.kuota_pekerja !== '' && Number(job.kuota_pekerja) > 0
    ? Number(job.kuota_pekerja)
    : null
  const totalPekerja = Number(job.total_pekerja ?? job.total_pekerja_aktif ?? 0)
  const isUnlimited = kuota === null

  return {
    ...job,
    id_pekerjaan: Number(job.id_pekerjaan),
    deskripsi: job.deskripsi ?? '',
    lokasi: job.lokasi ?? '',
    metode_lokasi: job.metode_lokasi === 'wfh' ? 'wfh' : 'titik',
    titik_lokasi: titikLokasi,
    latitude,
    longitude,
    radius_meter: job.radius_meter ? Number(job.radius_meter) : 100,
    foto_lokasi: job.foto_lokasi ?? '',
    alamat: job.alamat ?? '',
    tanggal_mulai: job.tanggal_mulai ?? '',
    target_selesai: job.target_selesai ?? '',
    metode_penentuan: job.metode_penentuan ?? 'terbuka',
    kuota_pekerja: kuota,
    status_pengambilan: job.status_pengambilan ?? 'terbuka',
    total_pekerja: totalPekerja,
    total_pekerja_aktif: totalPekerja,
    is_unlimited_kuota: isUnlimited,
    sisa_slot: isUnlimited ? null : Math.max(0, kuota - totalPekerja),
    is_kuota_penuh: !isUnlimited && totalPekerja >= kuota,
    nama_karyawan_list: job.nama_karyawan_list ?? '',
    id_karyawan_list: job.id_karyawan_list ?? '',
    already_joined: Boolean(job.already_joined),
    kode_pekerjaan: job.kode_pekerjaan ?? '',
    hari_kerja_per_bulan: job.hari_kerja_per_bulan !== undefined && job.hari_kerja_per_bulan !== null ? Number(job.hari_kerja_per_bulan) : 22,
    jam_kerja_per_hari: job.jam_kerja_per_hari !== undefined && job.jam_kerja_per_hari !== null ? Number(job.jam_kerja_per_hari) : 8,
    jam_masuk_standar: job.jam_masuk_standar ?? '08:00',
    jam_pulang_standar: job.jam_pulang_standar ?? '17:00',
    tanggal_cutoff: job.tanggal_cutoff !== undefined && job.tanggal_cutoff !== null ? Number(job.tanggal_cutoff) : 25,
    tanggal_pencairan: job.tanggal_pencairan !== undefined && job.tanggal_pencairan !== null ? Number(job.tanggal_pencairan) : 28,
    toleransi_terlambat_menit: job.toleransi_terlambat_menit !== undefined && job.toleransi_terlambat_menit !== null ? Number(job.toleransi_terlambat_menit) : 15,
    lembur_diizinkan: Number(job.lembur_diizinkan) === 1 || job.lembur_diizinkan === true,
    buffer_lembur_persen: job.buffer_lembur_persen !== undefined && job.buffer_lembur_persen !== null ? Number(job.buffer_lembur_persen) : 10,
    role_budgets: Array.isArray(job.role_budgets) ? job.role_budgets : [],
  }
}

export async function getPekerjaan() {
  const jobs = await apiGet('/pekerjaan')
  return jobs.map(normalizeJob)
}

export async function getPekerjaanTersedia(workerId = null) {
  const query = workerId ? `?worker_id=${encodeURIComponent(workerId)}` : ''
  const jobs = await apiGet(`/pekerjaan/tersedia${query}`)
  return jobs.map(normalizeJob)
}

export async function getPekerjaanById(id) {
  return normalizeJob(await apiGet(`/pekerjaan/${id}`))
}

export async function createPekerjaan(values) {
  return normalizeJob(await apiPost('/pekerjaan', values))
}

export async function updatePekerjaan(id, values) {
  return normalizeJob(await apiPut(`/pekerjaan/${id}`, values))
}

export function deletePekerjaan(id) {
  return apiDelete(`/pekerjaan/${id}`)
}

export async function ambilPekerjaan(id_pekerjaan, id_karyawan) {
  return apiPost(`/pekerjaan/${id_pekerjaan}/ambil`, {
    id_karyawan: Number(id_karyawan),
  })
}

export async function togglePengambilanPekerjaan(id, status = null) {
  return apiPost(`/pekerjaan/${id}/status-pengambilan`, { status })
}

export async function batalkanPenugasanPekerja(jobId, assignmentId, alasan = '') {
  return apiPost(`/pekerjaan/${jobId}/pekerja/${assignmentId}/batalkan`, { alasan })
}

export async function tambahPekerjaKePekerjaan(jobId, karyawanId) {
  return apiPost(`/pekerjaan/${jobId}/tambah-pekerja`, { id_karyawan: Number(karyawanId) })
}

export async function getPekerjaanPekerja(jobId) {
  return apiGet(`/pekerjaan/${jobId}/pekerja`)
}

export async function updatePekerjaanStatusPekerja(jobId, karyawanId, status, catatan = '') {
  return apiPost(`/pekerjaan/${jobId}/pekerja/${karyawanId}/status`, {
    status,
    catatan,
  })
}

export async function getPekerjaanLaporan(jobId) {
  return apiGet(`/pekerjaan/${jobId}/laporan`)
}

export async function createPekerjaanLaporan(jobId, values) {
  return apiPost(`/pekerjaan/${jobId}/laporan`, values)
}

export async function setujuiPekerjaanLaporan(laporanId, catatan = '') {
  return apiPost(`/pekerjaan/laporan/${laporanId}/setujui`, { catatan })
}

export async function tolakPekerjaanLaporan(laporanId, catatan = '') {
  return apiPost(`/pekerjaan/laporan/${laporanId}/tolak`, { catatan })
}

export async function getPekerjaanBlueprint(jobId) {
  return apiGet(`/pekerjaan/${jobId}/blueprint`)
}

export async function updatePekerjaanBlueprint(jobId, roleBudgets) {
  return apiPut(`/pekerjaan/${jobId}/blueprint`, { role_budgets: roleBudgets })
}

export async function getPekerjaanBudgetSummary(jobId) {
  return apiGet(`/pekerjaan/${jobId}/budget-summary`)
}

export async function getPekerjaanKandidatKaryawan(jobId) {
  return apiGet(`/pekerjaan/${jobId}/kandidat-karyawan`)
}
