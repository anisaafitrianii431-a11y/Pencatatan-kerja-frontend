import { apiGet, apiPost, apiPut, apiDelete } from './api.js'

export function normalizeMasterRole(role) {
  if (!role) return null
  return {
    ...role,
    id_role: Number(role.id_role),
    nama_role: role.nama_role || '',
    hierarchy_level: Number(role.hierarchy_level || 1),
    default_gaji_min_bulanan: Number(role.default_gaji_min_bulanan || 0),
    default_gaji_max_bulanan: Number(role.default_gaji_max_bulanan || 0),
    deskripsi: role.deskripsi || '',
    is_active: Number(role.is_active) === 1 || role.is_active === true,
    total_penggunaan: Number(role.total_penggunaan || 0)
  }
}

export async function getMasterRoles(params = {}) {
  const query = new URLSearchParams(params).toString()
  const path = query ? `/master-role?${query}` : '/master-role'
  const response = await apiGet(path)
  const list = Array.isArray(response) ? response : (response?.data || [])
  return list.map(normalizeMasterRole)
}

export async function getMasterRoleById(id) {
  const response = await apiGet(`/master-role/${id}`)
  const role = response?.data || response
  return normalizeMasterRole(role)
}

export async function createMasterRole(data) {
  const response = await apiPost('/master-role', data)
  return response?.data ? normalizeMasterRole(response.data) : response
}

export async function updateMasterRole(id, data) {
  const response = await apiPut(`/master-role/${id}`, data)
  return response?.data ? normalizeMasterRole(response.data) : response
}

export async function deleteMasterRole(id) {
  return await apiDelete(`/master-role/${id}`)
}
