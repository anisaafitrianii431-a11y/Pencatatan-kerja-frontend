const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const { headers, ...requestOptions } = options
  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(requestOptions.body ? { 'Content-Type': 'application/json' } : {}),
      ...headers,
    },
    ...requestOptions,
  })

  let result = null
  if (response.status !== 204) {
    try {
      result = await response.json()
    } catch {
      if (response.ok) throw new Error('Respons API bukan JSON yang valid.')
    }
  }

  if (!response.ok) {
    const error = new Error(result?.message || 'Terjadi kesalahan. Silakan coba lagi.')
    error.status = response.status
    throw error
  }

  return result
}

function readUser(result) {
  const user = result?.user || result?.data || result
  if (!user || typeof user !== 'object') {
    throw new Error('Respons autentikasi dari server tidak valid.')
  }

  const rawRole = String(user.peran || user.role || '').trim().toLowerCase()
  if (!['super_admin', 'admin', 'karyawan', 'pekerja'].includes(rawRole)) {
    throw new Error('Peran akun tidak dikenali. Hubungi administrator.')
  }
  const role = rawRole === 'pekerja' ? 'karyawan' : rawRole
  if ('aktif' in user && ![true, 1, '1'].includes(user.aktif)) {
    throw new Error('Akun Anda tidak aktif. Hubungi administrator.')
  }

  let effectiveName = user.nama || user.name || user.email || 'Pengguna'

  return {
    id: user.id_user ?? user.id,
    id_user: user.id_user ?? user.id,
    employeeId: user.id_karyawan ?? user.employeeId ?? null,
    id_karyawan: user.id_karyawan ?? user.employeeId ?? null,
    kode_karyawan: user.kode_karyawan || user.kode_user || '',
    username: user.username || user.kode_user || '',
    email: user.email || '',
    name: effectiveName,
    nama: effectiveName,
    jabatan: user.jabatan || '',
    tarif_per_jam: Number(user.tarif_per_jam) || 0,
    no_hp: user.no_hp || '',
    alamat: user.alamat || '',
    foto_profil: user.foto_profil || '',
    kontak_darurat: user.kontak_darurat || '',
    nama_bank: user.nama_bank || '',
    no_rekening: user.no_rekening || '',
    role,
    peran: role,
    permissions: user.permissions || {},
  }
}

export async function getCurrentUser() {
  try {
    const result = await request('/auth/me')
    const user = readUser(result)
    localStorage.setItem('ruangkerja_user', JSON.stringify(user))
    localStorage.setItem('jam_kerja_auth', JSON.stringify({
      id_user: user.id || (['admin', 'super_admin'].includes(user.role) ? 1 : 2),
      id_karyawan: user.employeeId || null,
      peran: user.role,
      email: user.email,
      nama: user.name,
    }))
    return user
  } catch (error) {
    // Sesi ditolak oleh server (belum login)
    if (error.status === 401) {
      localStorage.removeItem('ruangkerja_user')
      localStorage.removeItem('jam_kerja_auth')
      return null
    }

    localStorage.removeItem('ruangkerja_user')
    localStorage.removeItem('jam_kerja_auth')
    if (error.status) return null
    throw error
  }
}

export async function login(credentials) {
  const result = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  })
  const user = readUser(result)
  localStorage.setItem('ruangkerja_user', JSON.stringify(user))
  localStorage.setItem('jam_kerja_auth', JSON.stringify({
    id_user: user.id,
    id_karyawan: user.employeeId,
    peran: user.role,
    email: user.email,
    nama: user.name,
  }))
  return user
}

export async function registerKaryawan(data) {
  const { name, email, jabatan, password } = data
  const result = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ nama: name, email, jabatan, kata_sandi: password, peran: 'karyawan' }),
  })
  const user = readUser(result)
  localStorage.setItem('ruangkerja_user', JSON.stringify(user))
  localStorage.setItem('jam_kerja_auth', JSON.stringify({
    id_user: user.id,
    id_karyawan: user.employeeId,
    peran: user.role,
    email: user.email,
    nama: user.name,
  }))
  return user
}

export async function logout() {
  try {
    await request('/auth/logout', { method: 'POST' })
  } catch {
    // Abaikan error saat offline
  } finally {
    localStorage.removeItem('ruangkerja_user')
    localStorage.removeItem('jam_kerja_auth')
  }
}

export async function updateProfile(payload) {
  const result = await request('/auth/profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const updatedUser = readUser(result)
  localStorage.setItem('ruangkerja_user', JSON.stringify(updatedUser))
  localStorage.setItem('jam_kerja_auth', JSON.stringify({
    id_user: updatedUser.id || (['admin', 'super_admin'].includes(updatedUser.role) ? 1 : 2),
    id_karyawan: updatedUser.employeeId || null,
    peran: updatedUser.role,
    email: updatedUser.email,
    nama: updatedUser.name,
  }))
  return { user: updatedUser, message: result?.message || 'Pengaturan akun berhasil diperbarui!' }
}

export async function changePassword({ password_lama, password_baru }) {
  const result = await request('/auth/change-password', {
    method: 'POST',
    body: JSON.stringify({ password_lama, password_baru }),
  })
  return {
    success: Boolean(result?.success),
    message: result?.message || 'Kata sandi berhasil diperbarui!',
  }
}
