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
    lokasi: assignment.lokasi ?? '',
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

export async function getPenugasanById(id) {
  return normalizeAssignment(await apiGet(`/penugasan/${id}`))
}

export async function createPenugasan(values) {
  return normalizeAssignment(await apiPost('/penugasan', {
    id_karyawan: Number(values.id_karyawan),
    id_pekerjaan: Number(values.id_pekerjaan),
  }))
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
