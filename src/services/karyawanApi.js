import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

function normalizeEmployee(employee) {
  return {
    ...employee,
    id_karyawan: Number(employee.id_karyawan),
    jabatan: employee.jabatan ?? '',
    tarif_per_jam: Number(employee.tarif_per_jam),
  }
}

export async function getKaryawan() {
  const employees = await apiGet('/karyawan')
  return employees.map(normalizeEmployee)
}

export async function getKaryawanById(id) {
  return normalizeEmployee(await apiGet(`/karyawan/${id}`))
}

export async function createKaryawan(values) {
  const employee = await apiPost('/karyawan', {
    ...values,
    jabatan: values.jabatan || null,
  })
  return normalizeEmployee(employee)
}

export async function updateKaryawan(id, values) {
  const employee = await apiPut(`/karyawan/${id}`, {
    ...values,
    jabatan: values.jabatan || null,
  })
  return normalizeEmployee(employee)
}

export function deleteKaryawan(id) {
  return apiDelete(`/karyawan/${id}`)
}
