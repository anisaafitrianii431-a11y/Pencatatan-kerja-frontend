import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

function normalizeJob(job) {
  return {
    ...job,
    id_pekerjaan: Number(job.id_pekerjaan),
    deskripsi: job.deskripsi ?? '',
    lokasi: job.lokasi ?? '',
    titik_lokasi: job.titik_lokasi ?? '',
    tanggal_mulai: job.tanggal_mulai ?? '',
    target_selesai: job.target_selesai ?? '',
    metode_penentuan: job.metode_penentuan ?? 'terbuka',
    total_pekerja: Number(job.total_pekerja ?? 0),
    nama_karyawan_list: job.nama_karyawan_list ?? '',
    id_karyawan_list: job.id_karyawan_list ?? '',
  }
}

export async function getPekerjaan() {
  const jobs = await apiGet('/pekerjaan')
  return jobs.map(normalizeJob)
}

export async function getPekerjaanTersedia() {
  const jobs = await apiGet('/pekerjaan/tersedia')
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
