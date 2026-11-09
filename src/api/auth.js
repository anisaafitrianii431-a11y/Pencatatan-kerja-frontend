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
  if (!['admin', 'karyawan', 'pekerja'].includes(rawRole)) {
    throw new Error('Peran akun tidak dikenali. Hubungi administrator.')
  }
  const role = rawRole === 'admin' ? 'admin' : 'karyawan'
  if ('aktif' in user && ![true, 1, '1'].includes(user.aktif)) {
    throw new Error('Akun Anda tidak aktif. Hubungi administrator.')
  }

  return {
    id: user.id_user ?? user.id,
    employeeId: user.id_karyawan ?? null,
    email: user.email || '',
    name: user.name || user.nama || user.email || 'Pengguna',
    jabatan: user.jabatan || '',
    tarif_per_jam: Number(user.tarif_per_jam) || 0,
    role,
  }
}

// Helper untuk membaca dan menyimpan user yang didaftarkan secara lokal
function getRegisteredUsers() {
  try {
    return JSON.parse(localStorage.getItem('ruangkerja_registered_users')) || []
  } catch {
    return []
  }
}

function saveRegisteredUser(user) {
  const users = getRegisteredUsers()
  users.push(user)
  localStorage.setItem('ruangkerja_registered_users', JSON.stringify(users))
}

export async function getCurrentUser() {
  try {
    const result = await request('/auth.php?action=me')
    const user = readUser(result)
    localStorage.setItem('ruangkerja_user', JSON.stringify(user))
    localStorage.setItem('jam_kerja_auth', JSON.stringify({
      id_user: user.id || (user.role === 'admin' ? 1 : 2),
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

    // Jika backend offline atau endpoint belum ada, periksa sesi demo lokal
    const stored = localStorage.getItem('ruangkerja_user')
    if (stored) {
      try {
        const u = readUser(JSON.parse(stored))
        localStorage.setItem('jam_kerja_auth', JSON.stringify({
          id_user: u.id || (u.role === 'admin' ? 1 : 2),
          id_karyawan: u.employeeId || null,
          peran: u.role,
          email: u.email,
          nama: u.name,
        }))
        return u
      } catch {
        localStorage.removeItem('ruangkerja_user')
        localStorage.removeItem('jam_kerja_auth')
      }
    }

    // Tidak ada sesi aktif -> return null dengan aman tanpa memicu crash screen
    return null
  }
}

export async function login(credentials) {
  try {
    const result = await request('/auth.php?action=login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    })
    const user = readUser(result)
    localStorage.setItem('ruangkerja_user', JSON.stringify(user))
    localStorage.setItem('jam_kerja_auth', JSON.stringify({
      id_user: user.id || (user.role === 'admin' ? 1 : 2),
      id_karyawan: user.employeeId || null,
      peran: user.role,
      email: user.email,
      nama: user.name,
    }))
    return user
  } catch (error) {
    // Jika backend merespons error kredensial spesifik (401 salah password, 403 akun nonaktif, dll)
    if (
      (error.status === 400 || error.status === 401 || error.status === 403) &&
      error.message &&
      error.message !== 'Terjadi kesalahan. Silakan coba lagi.'
    ) {
      throw error
    }

    const email = (credentials.email || '').toLowerCase().trim()
    const password = credentials.password || ''

    // Cek apakah email terdaftar di pendaftaran lokal
    const registered = getRegisteredUsers().find(
      (u) => (u.email || '').toLowerCase() === email
    )
    if (registered) {
      if (password && registered.password && registered.password !== password) {
        throw new Error('Kata sandi yang Anda masukkan salah.')
      }
      const userObj = {
        id: registered.id || Date.now(),
        employeeId: registered.employeeId || Date.now(),
        email: registered.email,
        name: registered.name || registered.nama || registered.email.split('@')[0],
        jabatan: registered.jabatan || 'Pekerja',
        role: registered.role || 'karyawan',
      }
      localStorage.setItem('ruangkerja_user', JSON.stringify(userObj))
      localStorage.setItem('jam_kerja_auth', JSON.stringify({
        id_user: userObj.id,
        id_karyawan: userObj.employeeId,
        peran: userObj.role,
        email: userObj.email,
        nama: userObj.name,
      }))
      return userObj
    }

    // Jika backend API belum aktif/offline/404, aktifkan fallback demo mode
    const isAdmin = email.includes('admin')
    const role = isAdmin ? 'admin' : 'karyawan'
    const name = isAdmin
      ? 'Administrator'
      : (email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1))

    const demoUser = {
      id: isAdmin ? 1 : 2,
      employeeId: isAdmin ? null : 1,
      email: credentials.email,
      name,
      role,
    }

    localStorage.setItem('ruangkerja_user', JSON.stringify(demoUser))
    localStorage.setItem('jam_kerja_auth', JSON.stringify({
      id_user: demoUser.id,
      id_karyawan: demoUser.employeeId,
      peran: demoUser.role,
      email: demoUser.email,
      nama: demoUser.name,
    }))
    return demoUser
  }
}

export async function registerKaryawan(data) {
  const { name, email, jabatan, password } = data
  try {
    const result = await request('/auth.php?action=register', {
      method: 'POST',
      body: JSON.stringify({
        nama: name,
        email,
        jabatan,
        kata_sandi: password,
        peran: 'karyawan',
      }),
    })
    const user = readUser(result)
    localStorage.setItem('ruangkerja_user', JSON.stringify(user))
    localStorage.setItem('jam_kerja_auth', JSON.stringify({
      id_user: user.id || 2,
      id_karyawan: user.employeeId || null,
      peran: user.role,
      email: user.email,
      nama: user.name,
    }))
    saveRegisteredUser({ email, password, name, jabatan, role: 'karyawan' })
    return user
  } catch (error) {
    if (
      (error.status === 400 || error.status === 409) &&
      error.message &&
      error.message !== 'Terjadi kesalahan. Silakan coba lagi.'
    ) {
      throw error
    }

    // Mode Offline / Fallback:
    const existing = getRegisteredUsers().find(
      (u) => (u.email || '').toLowerCase() === email.toLowerCase().trim()
    )
    if (existing) {
      throw new Error('Email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk.')
    }

    const newUser = {
      id: Date.now(),
      employeeId: Date.now(),
      email: email.trim(),
      password,
      name: name.trim(),
      jabatan: jabatan ? jabatan.trim() : 'Pekerja',
      role: 'karyawan',
    }

    saveRegisteredUser(newUser)
    localStorage.setItem('ruangkerja_user', JSON.stringify({
      id: newUser.id,
      employeeId: newUser.employeeId,
      email: newUser.email,
      name: newUser.name,
      jabatan: newUser.jabatan,
      role: newUser.role,
    }))

    return newUser
  }
}

export async function logout() {
  try {
    await request('/auth.php?action=logout', { method: 'POST' })
  } catch {
    // Abaikan error saat offline
  } finally {
    localStorage.removeItem('ruangkerja_user')
    localStorage.removeItem('jam_kerja_auth')
  }
}
