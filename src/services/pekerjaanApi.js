import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

function normalizeJob(job) {
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
    latitude: job.latitude ?? '',
    longitude: job.longitude ?? '',
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
