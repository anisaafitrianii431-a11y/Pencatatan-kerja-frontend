import { apiGet, apiPost, apiPut } from './api.js'

export function normalizeUser(user) {
  if (!user) return null

  const idNum = Number(user.id_user)
  const isAktif = Number(user.aktif) === 1 || user.aktif === true || user.aktif === '1'
  const finalCode = user.kode_karyawan || user.kode_user || (user.peran === 'admin' ? 'ADM001' : `USER${String(idNum).padStart(3, '0')}`)

  return {
    ...user,
    id_user: idNum,
    kode_user: finalCode,
    id_karyawan: user.id_karyawan ? Number(user.id_karyawan) : null,
    username: user.kode_karyawan || user.username || user.email || finalCode,
    email: user.email || '',
    peran: user.peran || 'karyawan',
    aktif: isAktif ? 1 : 0,
    nama: user.nama || (user.peran === 'admin' ? 'Administrator' : 'Pengguna'),
    jabatan: user.jabatan || (user.peran === 'admin' ? 'Administrator Sistem' : '-'),
    kode_karyawan: user.kode_karyawan || (user.peran === 'admin' ? '' : finalCode),
    nomor_hp: user.nomor_hp || '',
    status_karyawan: user.status_karyawan || (isAktif ? 'aktif' : 'nonaktif'),
  }
}

export async function getUsers() {
  const users = await apiGet('/users')
  return (Array.isArray(users) ? users : []).map(normalizeUser)
}

export async function getUserById(id) {
  return normalizeUser(await apiGet(`/users/${id}`))
}

export async function resetUserPassword(id, kataSandi, konfirmasiKataSandi) {
  const user = await apiPost(`/users/${id}/reset-password`, {
    kata_sandi: kataSandi?.trim(),
    konfirmasi_kata_sandi: konfirmasiKataSandi?.trim(),
  })
  return normalizeUser(user)
}

export async function toggleUserStatus(id, nextStatus) {
  const isAktif = nextStatus === 'aktif' || nextStatus === 1 || nextStatus === true
  const user = await apiPut(`/users/${id}/status`, {
    status: isAktif ? 'aktif' : 'nonaktif',
    aktif: isAktif ? 1 : 0,
  })
  return normalizeUser(user)
}

