import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

function normalizeAssignment(assignment) {
  return {
    ...assignment,
    id_penugasan: Number(assignment.id_penugasan),
    id_karyawan: Number(assignment.id_karyawan),
    id_pekerjaan: Number(assignment.id_pekerjaan),
    jenis_penugasan: assignment.jenis_penugasan ?? 'admin',
    tanggal_penugasan: assignment.tanggal_penugasan ?? '',
    jabatan: assignment.jabatan ?? '',
    deskripsi: assignment.deskripsi ?? '',
    lokasi: assignment.lokasi ?? '',
    titik_lokasi: assignment.titik_lokasi ?? '',
    metode_lokasi: assignment.metode_lokasi ?? 'titik',
    latitude: assignment.latitude ?? '',
    longitude: assignment.longitude ?? '',
    radius_meter: assignment.radius_meter ? Number(assignment.radius_meter) : 100,
    tanggal_mulai: assignment.tanggal_mulai ?? '',
    target_selesai: assignment.target_selesai ?? '',
    status_pekerjaan: assignment.status_pekerjaan ?? '',
    metode_penentuan: assignment.metode_penentuan ?? 'terbuka',
  }
}

export async function getPenugasan() {
  const assignments = await apiGet('/penugasan')
  return assignments.map(normalizeAssignment)
}

export async function getPenugasanByKaryawan(idKaryawan) {
  const assignments = await apiGet(`/penugasan?id_karyawan=${idKaryawan}`)
  return Array.isArray(assignments) ? assignments.map(normalizeAssignment) : []
}

export async function getPenugasanById(id) {
  const res = await apiGet(`/penugasan/${id}`)
  const raw = Array.isArray(res) ? (res.find((a) => Number(a.id_penugasan) === Number(id)) || res[0]) : res
  return normalizeAssignment(raw || {})
}

export async function createPenugasan(values) {
  const payload = {
    id_karyawan: Number(values.id_karyawan),
    id_pekerjaan: Number(values.id_pekerjaan),
  }
  if (values.id_role_budget) payload.id_role_budget = Number(values.id_role_budget)
  if (values.jenis_upah) payload.jenis_upah = values.jenis_upah
  if (values.nominal_upah !== undefined && values.nominal_upah !== '') payload.nominal_upah = Number(values.nominal_upah)
  if (values.tanggal_penugasan) payload.tanggal_penugasan = values.tanggal_penugasan
  if (values.tanggal_selesai_tugas) payload.tanggal_selesai_tugas = values.tanggal_selesai_tugas
  if (values.izinkan_bentrok !== undefined) payload.izinkan_bentrok = Boolean(values.izinkan_bentrok)

  return normalizeAssignment(await apiPost('/penugasan', payload))
}

export async function updatePenugasan(id, values) {
  return normalizeAssignment(await apiPut(`/penugasan/${id}`, {
    id_karyawan: Number(values.id_karyawan),
    id_pekerjaan: Number(values.id_pekerjaan),
  }))
}

export function deletePenugasan(id) {
  return apiDelete(`/penugasan/${id}`)
}

export async function cekKetersediaanKaryawan(params = {}) {
  const query = new URLSearchParams(params).toString()
  return apiGet(query ? `/penugasan/cek-ketersediaan?${query}` : '/penugasan/cek-ketersediaan')
}

export async function getPenugasanGajiRiwayat(idPenugasan) {
  return apiGet(`/penugasan/${idPenugasan}/gaji-riwayat`)
}

export async function createPenugasanGajiRiwayat(idPenugasan, payload) {
  return apiPost(`/penugasan/${idPenugasan}/gaji-riwayat`, payload)
}
