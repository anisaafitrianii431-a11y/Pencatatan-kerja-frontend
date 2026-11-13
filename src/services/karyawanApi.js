import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

export function normalizeEmployee(employee) {
  if (!employee) return null
  const jenisUpah = employee.jenis_upah || 'per_jam'
  const nominalUpah = Number(employee.nominal_upah ?? employee.tarif_per_jam ?? 0)
  const tarifPerJam = Number(employee.tarif_per_jam ?? nominalUpah ?? 0)
  const isOvertimeActive = Boolean(
    Number(employee.lembur_aktif) === 1 || employee.lembur_aktif === true,
  )
  const statusStr =
    employee.status ||
    (employee.user_aktif === 0 || employee.aktif === 0 ? 'nonaktif' : 'aktif')

  const idNum = Number(employee.id_karyawan)
  const fallbackCode = `KARY${String(idNum).padStart(3, '0')}`

  return {
    ...employee,
    id_karyawan: idNum,
    kode_karyawan: employee.kode_karyawan || fallbackCode,
    username: employee.username || employee.kode_karyawan || fallbackCode,
    nama: employee.nama || '',
    jabatan: employee.jabatan ?? '',
    nomor_hp: employee.nomor_hp ?? '',
    jenis_upah: jenisUpah,
    nominal_upah: nominalUpah,
    lembur_aktif: isOvertimeActive,
    tarif_lembur: Number(employee.tarif_lembur ?? 0),
    catatan_admin: employee.catatan_admin ?? '',
    status: statusStr,
    aktif: employee.aktif ?? (statusStr === 'nonaktif' ? 0 : 1),
    tarif_per_jam: tarifPerJam,
    created_at: employee.created_at ?? null,
    updated_at: employee.updated_at ?? null,
  }
}

export async function getKaryawan() {
  const employees = await apiGet('/karyawan')
  return (Array.isArray(employees) ? employees : []).map(normalizeEmployee)
}

export async function getKaryawanById(id) {
  return normalizeEmployee(await apiGet(`/karyawan/${id}`))
}

export async function createKaryawan(values) {
  const employee = await apiPost('/karyawan', {
    nama: values.nama?.trim(),
    jabatan: values.jabatan?.trim() || null,
    nomor_hp: values.nomor_hp?.trim() || null,
    jenis_upah: values.jenis_upah || 'per_jam',
    nominal_upah: Number(values.nominal_upah ?? values.tarif_per_jam ?? 0),
    lembur_aktif: Boolean(values.lembur_aktif),
    tarif_lembur: values.lembur_aktif ? Number(values.tarif_lembur || 0) : 0,
    catatan_admin: values.catatan_admin?.trim() || null,
    status: values.status || 'aktif',
    tarif_per_jam: Number(values.nominal_upah ?? values.tarif_per_jam ?? 0),
    kata_sandi: values.kata_sandi?.trim(),
    konfirmasi_kata_sandi: values.konfirmasi_kata_sandi?.trim(),
  })
  return normalizeEmployee(employee)
}

export async function updateKaryawan(id, values) {
  const employee = await apiPut(`/karyawan/${id}`, {
    nama: values.nama?.trim(),
    jabatan: values.jabatan?.trim() || null,
    nomor_hp: values.nomor_hp?.trim() || null,
    jenis_upah: values.jenis_upah || 'per_jam',
    nominal_upah: Number(values.nominal_upah ?? values.tarif_per_jam ?? 0),
    lembur_aktif: Boolean(values.lembur_aktif),
    tarif_lembur: values.lembur_aktif ? Number(values.tarif_lembur || 0) : 0,
    catatan_admin: values.catatan_admin?.trim() || null,
    status: values.status || 'aktif',
    tarif_per_jam: Number(values.nominal_upah ?? values.tarif_per_jam ?? 0),
  })
  return normalizeEmployee(employee)
}

export async function resetPasswordKaryawan(id, kataSandi, konfirmasiKataSandi) {
  const employee = await apiPost(`/karyawan/${id}/reset-password`, {
    kata_sandi: kataSandi?.trim(),
    konfirmasi_kata_sandi: konfirmasiKataSandi?.trim(),
  })
  return normalizeEmployee(employee)
}

export async function toggleStatusKaryawan(id, nextStatus) {
  const employee = await apiPut(`/karyawan/${id}`, {
    status: nextStatus,
  })
  return normalizeEmployee(employee)
}

export function deleteKaryawan(id) {
  return apiDelete(`/karyawan/${id}`)
}
