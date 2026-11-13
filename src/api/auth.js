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
    id_user: user.id_user ?? user.id,
    employeeId: user.id_karyawan ?? user.employeeId ?? null,
    id_karyawan: user.id_karyawan ?? user.employeeId ?? null,
    email: user.email || '',
    name: user.name || user.nama || user.email || 'Pengguna',
    nama: user.nama || user.name || user.email || 'Pengguna',
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
        const parsed = JSON.parse(stored)
        // Perbaiki jika employeeId tersimpan sebagai timestamp (misal > 100000)
        if (parsed.employeeId && Number(parsed.employeeId) > 100000) {
          parsed.employeeId = 1
          localStorage.setItem('ruangkerja_user', JSON.stringify(parsed))
        }
        const u = readUser({ ...parsed, id_karyawan: parsed.employeeId || parsed.id_karyawan })
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

    const rawId = (credentials.identifier || credentials.username || credentials.email || '').trim()
    const email = rawId.toLowerCase()
    const password = credentials.password || ''

    // Cek apakah identifier terdaftar di pendaftaran lokal
    const registered = getRegisteredUsers().find(
      (u) =>
        (u.email || '').toLowerCase() === email ||
        (u.kode_karyawan || '').toUpperCase() === rawId.toUpperCase() ||
        (u.username || '').toUpperCase() === rawId.toUpperCase()
    )
    if (registered) {
      if (password && registered.password && registered.password !== password) {
        throw new Error('Kata sandi yang Anda masukkan salah.')
      }
      const safeEmployeeId =
        Number(registered.employeeId) > 0 && Number(registered.employeeId) < 100000
          ? Number(registered.employeeId)
          : 1
      const userObj = {
        id: registered.id || 2,
        employeeId: safeEmployeeId,
        email: registered.email,
        name: registered.name || registered.nama || registered.email?.split('@')[0] || rawId,
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
    const isAdmin = rawId.toLowerCase().includes('admin')
    const role = isAdmin ? 'admin' : 'karyawan'
    const name = isAdmin
      ? 'Administrator'
      : (rawId.includes('@')
          ? (rawId.split('@')[0].charAt(0).toUpperCase() + rawId.split('@')[0].slice(1))
          : rawId.toUpperCase())

    const demoUser = {
      id: isAdmin ? 1 : 2,
      employeeId: isAdmin ? null : 1,
      email: credentials.email || (isAdmin ? 'admin@jamkerja.com' : `${rawId.toLowerCase()}@jamkerja.com`),
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
    saveRegisteredUser({ email, password, name, jabatan, role: 'karyawan', employeeId: user.employeeId || 1 })
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

    // Sambungkan ke tabel karyawan MySQL jika API backend tersedia
    let assignedEmployeeId = 1
    try {
      const res = await fetch(`${API_BASE_URL}/pekerja.php`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          nama: name.trim(),
          jabatan: jabatan ? jabatan.trim() : 'Teknisi Lapangan',
          tarif_per_jam: 35000,
        }),
      })
      const resData = await res.json()
      if (resData?.data?.id_karyawan) {
        assignedEmployeeId = Number(resData.data.id_karyawan)
      }
    } catch {
      // Fallback ke ID 1 jika backend offline
    }

    const newUser = {
      id: assignedEmployeeId,
      employeeId: assignedEmployeeId,
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

export async function updateProfile(payload) {
  const result = await request('/auth.php?action=update_profile', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
  const updatedUser = readUser(result)
  localStorage.setItem('ruangkerja_user', JSON.stringify(updatedUser))
  localStorage.setItem('jam_kerja_auth', JSON.stringify({
    id_user: updatedUser.id || (updatedUser.role === 'admin' ? 1 : 2),
    id_karyawan: updatedUser.employeeId || null,
    peran: updatedUser.role,
    email: updatedUser.email,
    nama: updatedUser.name,
  }))
  return { user: updatedUser, message: result?.message || 'Pengaturan akun berhasil diperbarui!' }
}

export async function changePassword({ password_lama, password_baru }) {
  const result = await request('/auth.php?action=change_password', {
    method: 'POST',
    body: JSON.stringify({ password_lama, password_baru }),
  })
  return {
    success: Boolean(result?.success),
    message: result?.message || 'Kata sandi berhasil diperbarui!',
  }
}
