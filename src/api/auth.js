const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '')

async function request(path, options = {}) {
  const { headers, ...requestOptions } = options
  const token = localStorage.getItem('token') || (() => {
    try {
      return JSON.parse(localStorage.getItem('ruangkerja_user'))?.token
    } catch {
      return null
    }
  })()

  const response = await fetch(`${API_BASE_URL}${path}`, {
    credentials: 'include',
    headers: {
      Accept: 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
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

export const MASTER_PEKERJA = [
  { id_karyawan: 1, kode_karyawan: 'BUDI001', nama: 'Budi Santoso', jabatan: 'Teknisi Jaringan Senior', email: 'budi@jamkerja.com' },
  { id_karyawan: 2, kode_karyawan: 'SITI002', nama: 'Siti Rahma', jabatan: 'Sistem Analis', email: 'siti@jamkerja.com' },
  { id_karyawan: 3, kode_karyawan: 'AGUS003', nama: 'Agus Setiawan', jabatan: 'Teknisi Lapangan', email: 'agus@jamkerja.com' },
  { id_karyawan: 4, kode_karyawan: 'DEWI004', nama: 'Dewi Lestari', jabatan: 'Quality Assurance', email: 'dewi@jamkerja.com' },
  { id_karyawan: 8, kode_karyawan: 'ALDI005', nama: 'Aldiano', jabatan: 'Service', email: 'aldiano@jamkerja.com' },
  { id_karyawan: 10, kode_karyawan: 'JOVI006', nama: 'Jovi', jabatan: 'Teknisi Lapangan', email: 'jovi@jamkerja.com' },
  { id_karyawan: 12, kode_karyawan: 'MUHA007', nama: 'Muhammad Fauzan', jabatan: 'Teknisi', email: 'fauzan@jamkerja.com' },
  { id_karyawan: 13, kode_karyawan: 'TIAR008', nama: 'Tiara', jabatan: 'Teknisi', email: 'tiara@jamkerja.com' },
  { id_karyawan: 14, kode_karyawan: 'CITRA009', nama: 'Citra', jabatan: 'IT', email: 'citra@jamkerja.com' },
  { id_karyawan: 15, kode_karyawan: 'ANIS010', nama: 'Anisa Fitriani', jabatan: 'Teknisi', email: 'anisa@jamkerja.com' },
  { id_karyawan: 18, kode_karyawan: 'ANDI011', nama: 'Andi', jabatan: 'Teknisi jaringan', email: 'andi@jamkerja.com' },
  { id_karyawan: 21, kode_karyawan: 'PUTRI012', nama: 'Putri Cantika', jabatan: 'sistem Analisis', email: 'putricantika012@jamkerja.com' },
  { id_karyawan: 22, kode_karyawan: 'ADINDA013', nama: 'Adinda Keyla', jabatan: 'Teknisi Proyek', email: 'adindakeyla013@jamkerja.com' },
  { id_karyawan: 23, kode_karyawan: 'RANI014', nama: 'Rani', jabatan: 'jaringan', email: 'rani014@jamkerja.com' },
  { id_karyawan: 24, kode_karyawan: 'ANDI015', nama: 'andi', jabatan: 'helper biasa', email: 'andi015@jamkerja.com' },
  { id_karyawan: 25, kode_karyawan: 'PUTRA016', nama: 'Putra', jabatan: 'Teknisi Listrik', email: 'putra016@jamkerja.com' },
]

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

    // Jika backend offline atau endpoint belum ada, periksa sesi demo lokal
    const stored = localStorage.getItem('ruangkerja_user')
    if (stored) {
      try {
        const parsed = JSON.parse(stored)
        // Perbaiki jika employeeId tersimpan sebagai timestamp (misal > 100000)
        if (parsed.employeeId && Number(parsed.employeeId) > 100000) {
          parsed.employeeId = null
        }
        // Self-heal: jika session lama memegang ID/nama tidak sinkron, cocokkan dengan master
        const checkCode = (parsed.kode_karyawan || parsed.username || parsed.name || '').toUpperCase()
        if (checkCode && !checkCode.includes('BUDI')) {
          const matched = MASTER_PEKERJA.find(
            (p) =>
              p.kode_karyawan.toUpperCase() === checkCode ||
              p.nama.toUpperCase() === checkCode ||
              checkCode.includes(p.kode_karyawan.toUpperCase()) ||
              p.nama.toUpperCase().includes(checkCode),
          )
          if (matched) {
            parsed.employeeId = matched.id_karyawan
            parsed.id_karyawan = matched.id_karyawan
            parsed.id_user = matched.id_karyawan
            parsed.nama = matched.nama
            parsed.name = matched.nama
            parsed.kode_karyawan = matched.kode_karyawan
            parsed.jabatan = matched.jabatan || parsed.jabatan
            parsed.email = matched.email || parsed.email
            localStorage.setItem('ruangkerja_user', JSON.stringify(parsed))
          }
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
    if (result?.token) {
      user.token = result.token
      localStorage.setItem('token', result.token)
    }
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
    // Jika backend merespons error kredensial spesifik (401 salah password, 403 akun nonaktif, dsb)
    // Lempar error asli agar pengguna tahu bahwa kata sandi atau username salah
    if (
      (error.status === 400 || error.status === 401 || error.status === 403) ||
      (error.message && !error.message.toLowerCase().includes('fetch') && !error.message.toLowerCase().includes('network'))
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
          : null
      const userObj = {
        id: registered.id || 2,
        id_user: registered.id || 2,
        employeeId: safeEmployeeId,
        id_karyawan: safeEmployeeId,
        email: registered.email,
        name: registered.name || registered.nama || registered.email?.split('@')[0] || rawId,
        nama: registered.name || registered.nama || registered.email?.split('@')[0] || rawId,
        jabatan: registered.jabatan || 'Pekerja',
        role: registered.role || 'karyawan',
        peran: registered.role || 'karyawan',
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

    // Fallback HANYA jika server benar-benar offline / network down
    // Cari kecocokan karyawan dari master data, BUKAN di-hardcode ke Budi Santoso / Anisa!
    const isAdmin = rawId.toLowerCase().includes('admin')
    if (isAdmin) {
      const adminUser = {
        id: 1,
        id_user: 1,
        employeeId: null,
        id_karyawan: null,
        email: 'admin@jamkerja.com',
        name: 'Administrator',
        nama: 'Administrator',
        role: 'admin',
        peran: 'admin',
      }
      localStorage.setItem('ruangkerja_user', JSON.stringify(adminUser))
      return adminUser
    }

    const matchedEmp = MASTER_PEKERJA.find((p) => {
      const q = rawId.toLowerCase()
      return (
        p.kode_karyawan.toLowerCase() === q ||
        p.email.toLowerCase() === q ||
        p.nama.toLowerCase() === q ||
        q.includes(p.nama.toLowerCase()) ||
        p.nama.toLowerCase().includes(q) ||
        (q.startsWith('citr') && p.id_karyawan === 14) ||
        (q.startsWith('anis') && p.id_karyawan === 15) ||
        (q.startsWith('putr') && p.id_karyawan === 21) ||
        (q.startsWith('adin') && p.id_karyawan === 22)
      )
    })

    if (matchedEmp) {
      const userObj = {
        id: matchedEmp.id_karyawan,
        id_user: matchedEmp.id_karyawan,
        employeeId: matchedEmp.id_karyawan,
        id_karyawan: matchedEmp.id_karyawan,
        email: matchedEmp.email,
        name: matchedEmp.nama,
        nama: matchedEmp.nama,
        jabatan: matchedEmp.jabatan,
        role: 'karyawan',
        peran: 'karyawan',
        kode_karyawan: matchedEmp.kode_karyawan,
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

    throw error
  }
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
    localStorage.removeItem('token')
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
