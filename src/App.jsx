import { useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { AuthProvider as LegacyAuthProvider } from './contexts/AuthContext.jsx'
import { AbsensiProvider } from './hooks/useAbsensi.jsx'

// Fitur Pengeluaran & Kwitansi
import PengeluaranAdminPage from './pages/admin/PengeluaranAdminPage'
import PengeluaranKaryawanPage from './pages/karyawan/PengeluaranKaryawanPage'

// Fitur Absensi & Lokasi Kerja
import LokasiKerjaPage from './pages/admin-absen/LokasiKerjaPage'
import AbsensiPage from './pages/pekerja_absen/AbsensiPage'


// Fitur Pengembang 2: Manajemen Karyawan, Pekerjaan, Penugasan & Profil
import DataKaryawan from './pages/admin/DataKaryawan.jsx'
import DataPekerjaan from './pages/admin/DataPekerjaan.jsx'
import Penugasan from './pages/admin/Penugasan.jsx'
import ProfilAdmin from './pages/admin/ProfilAdmin.jsx'
import PengaturanAdmin from './pages/admin/PengaturanAdmin.jsx'
import PekerjaLocalTest from './pages/pekerja/PekerjaLocalTest.jsx'
import PekerjaanSaya from './pages/pekerja/PekerjaanSaya.jsx'
import PekerjaanTersedia from './pages/pekerja/PekerjaanTersedia.jsx'
import RiwayatPengajuan from './pages/pekerja/RiwayatPengajuan.jsx'
import ProfilPekerja from './pages/pekerja/ProfilPekerja.jsx'
import PengaturanPekerja from './pages/pekerja/PengaturanPekerja.jsx'

import './index.css'
import './App.css'

function roleHome(role) {
  return role === 'admin' ? '/admin' : '/karyawan'
}

function LoadingScreen({ message = 'Memuat aplikasi...' }) {
  return (
    <main className="loading-screen" aria-live="polite">
      <span className="spinner" aria-hidden="true" />
      <p>{message}</p>
    </main>
  )
}

function ProtectedRoute({ roles }) {
  const { user, loading, authError, refreshUser } = useAuth()
  const location = useLocation()

  if (loading) return <LoadingScreen message="Memeriksa sesi..." />
  if (authError) {
    return (
      <main className="loading-screen">
        <div className="notice notice-error" role="alert">{authError}</div>
        <button className="button button-primary" type="button" onClick={refreshUser}>
          Coba lagi
        </button>
      </main>
    )
  }
  if (!user) return <Navigate to="/login" replace state={{ from: location }} />
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />
  return <Outlet />
}

function LoginPage() {
  const { user, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={roleHome(user.role)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const authenticatedUser = await signIn({ email: email.trim(), password })
      const requestedPath = location.state?.from?.pathname
      navigate(requestedPath || roleHome(authenticatedUser.role), { replace: true })
    } catch (loginError) {
      setError(loginError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark" aria-hidden="true">PK</div>
        <p className="eyebrow">PENCATATAN KERJA</p>
        <h1>Kerja tercatat,<br />lebih terarah.</h1>
        <p className="brand-description">
          Masuk untuk mengakses ruang kerja sesuai peran dan tanggung jawab Anda.
        </p>
        <div className="brand-decoration" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <p className="eyebrow">SELAMAT DATANG</p>
          <h2>Masuk ke akun</h2>
          <p className="muted">Gunakan akun yang terdaftar untuk melanjutkan.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="Masukkan email"
              required
            />
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Masukkan password"
              required
            />
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Masuk'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="login-footnote">Akses diberikan sesuai peran akun Anda.</p>

          <div className="auth-switch">
            Belum punya akun? <Link to="/register">Daftar sebagai Karyawan</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function RegisterPage() {
  const { user, signUp } = useAuth()
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [jabatan, setJabatan] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={roleHome(user.role)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Password minimal harus 6 karakter.')
      return
    }
    if (password !== confirmPassword) {
      setError('Konfirmasi password tidak cocok dengan password.')
      return
    }

    setSubmitting(true)
    try {
      const newUser = await signUp({
        name: name.trim(),
        email: email.trim(),
        jabatan: jabatan.trim(),
        password,
      })
      navigate(roleHome(newUser.role), { replace: true })
    } catch (regError) {
      setError(regError.message)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <main className="login-shell">
      <section className="login-brand">
        <div className="brand-mark" aria-hidden="true">PK</div>
        <p className="eyebrow">PENDAFTARAN KARYAWAN</p>
        <h1>Mulai catat kerja,<br />lebih terarah.</h1>
        <p className="brand-description">
          Daftarkan akun karyawan Anda untuk mulai mencatat absensi, jam kerja proyek, dan pengeluaran operasional.
        </p>
        <div className="brand-decoration" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <p className="eyebrow">GABUNG SEKARANG</p>
          <h2>Daftar Akun Karyawan</h2>
          <p className="muted">Isi data diri Anda untuk membuat akun baru.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            
            <label htmlFor="reg-name">Nama Lengkap</label>
            <input
              id="reg-name"
              name="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Contoh: Budi Santoso"
              required
            />

            <label htmlFor="reg-email">Email</label>
            <input
              id="reg-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Contoh: budi@absensi.com"
              required
            />

            <label htmlFor="reg-jabatan">Jabatan / Posisi</label>
            <input
              id="reg-jabatan"
              name="jabatan"
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Contoh: Teknisi Jaringan / Staff Lapangan"
              required
            />

            <label htmlFor="reg-password">Password (min. 6 karakter)</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Masukkan password baru"
              required
            />

            <label htmlFor="reg-confirm-password">Konfirmasi Password</label>
            <input
              id="reg-confirm-password"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ulangi password"
              required
            />

            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Mendaftarkan...' : 'Daftar Karyawan'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <div className="auth-switch">
            Sudah punya akun? <Link to="/login">Masuk ke akun</Link>
          </div>
        </div>
      </section>
    </main>
  )
}

function AppLayout() {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const [logoutError, setLogoutError] = useState('')
  const [loggingOut, setLoggingOut] = useState(false)
  const links = [
    { to: '/dashboard', label: 'Ringkasan', icon: '⌂' },
    ...(user.role === 'admin'
      ? [
          { to: '/admin', label: 'Manajemen pengguna', icon: '👥' },
          { to: '/admin/karyawan', label: 'Data Karyawan', icon: '👔' },
          { to: '/admin/pekerjaan', label: 'Data Pekerjaan', icon: '💼' },
          { to: '/admin/penugasan', label: 'Penugasan', icon: '📋' },
          { to: '/admin/pengeluaran', label: 'Pengeluaran & Kwitansi', icon: '🧾' },
          { to: '/admin/lokasi', label: 'Lokasi Kerja', icon: '📍' },
          { to: '/admin/profil', label: 'Profil Administrator', icon: '👤' },
          { to: '/admin/pengaturan', label: 'Pengaturan', icon: '⚙' },
        ]
      : [
          { to: '/karyawan/pekerjaan-tersedia', label: 'Pekerjaan Tersedia', icon: '🔍' },
          { to: '/karyawan/pekerjaan-saya', label: 'Pekerjaan Saya', icon: '💼' },
          { to: '/karyawan/riwayat-pengajuan', label: 'Riwayat Pengajuan', icon: '⏱' },
          { to: '/karyawan/pengeluaran', label: 'Pengeluaran Saya', icon: '🧾' },
          { to: '/karyawan/absensi', label: 'Presensi & Jam Kerja', icon: '⏱️' },
          { to: '/karyawan/profil', label: 'Profil Saya', icon: '👤' },
        ]),
  ]

  async function handleLogout() {
    setLogoutError('')
    setLoggingOut(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setLoggingOut(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" to="/dashboard">
          <span className="brand-mark brand-mark-small">PK</span>
          <span><strong>RuangKerja</strong><small>Pencatatan kerja</small></span>
        </Link>

        <p className="nav-heading">MENU UTAMA</p>
        <nav className="side-nav" aria-label="Navigasi utama">
          {links.map((link) => (
            <NavLink
              className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              key={link.to}
              to={link.to}
            >
              <span className="nav-icon" aria-hidden="true">{link.icon}</span>
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="user-chip">
            <span className="avatar">{(user.name || 'P').slice(0, 1).toUpperCase()}</span>
            <span className="user-meta">
              <strong>{user.name}</strong>
              <small>{user.role === 'admin' ? 'Administrator' : 'Karyawan'}</small>
            </span>
          </div>
          <button className="logout-button" type="button" onClick={handleLogout} disabled={loggingOut}>
            <span aria-hidden="true">↪</span>
            {loggingOut ? 'Keluar...' : 'Keluar'}
          </button>
          {logoutError && <p className="logout-error" role="alert">{logoutError}</p>}
        </div>
      </aside>

      <div className="workspace">
        <header className="topbar">
          <span>Portal internal</span>
          <span className="topbar-role">{user.role === 'admin' ? 'Administrator' : 'Karyawan'}</span>
        </header>
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const title = user.role === 'admin' ? 'Ruang kendali administrator' : 'Ruang kerja Anda'
  const destination = roleHome(user.role)
  const actionLabel = user.role === 'admin' ? 'Buka manajemen pengguna' : 'Buka pencatatan kerja'

  return (
    <section>
      <p className="eyebrow">RINGKASAN</p>
      <h1 className="page-title">{title}</h1>
      <p className="page-intro">Halo, {user.name}. Anda masuk sebagai {user.role === 'admin' ? 'Administrator' : 'Karyawan'}.</p>

      <div className="welcome-card">
        <div className="welcome-copy">
          <span className="welcome-tag">AKUN AKTIF</span>
          <h2>Selamat datang, {user.name}</h2>
          <p>
            {user.role === 'admin'
              ? 'Anda dapat mengakses fitur administrasi, mengelola akses pengguna, dan memverifikasi nota pengeluaran operasional.'
              : 'Anda dapat mencatat absensi jam kerja harian dan mengelola reimbursement nota belanja pengeluaran proyek.'}
          </p>
          <Link className="button button-primary" to={destination}>{actionLabel}<span aria-hidden="true">→</span></Link>
        </div>
        <div className="welcome-art" aria-hidden="true">
          <div className="art-sheet"><span /><span /><span /><i>✓</i></div>
          <div className="art-sparkle">✦</div>
        </div>
      </div>

      <div className="info-card">
        <span className="info-icon" aria-hidden="true">i</span>
        <div>
          <h3>Akses berdasarkan peran</h3>
          <p>Menu yang tersedia menyesuaikan peran akun. Hubungi administrator jika akses Anda perlu diperbarui.</p>
        </div>
      </div>
    </section>
  )
}

function KaryawanPage() {
  const { user } = useAuth()
  return (
    <section>
      <p className="eyebrow">RUANG KARYAWAN</p>
      <h1 className="page-title">Pencatatan kerja</h1>
      <p className="page-intro">
        Halo, <strong>{user.name}</strong> ({user.jabatan || 'Karyawan'}). Halaman ini disiapkan untuk ruang kerja pencatatan kerja.
      </p>
      <div className="empty-state">
        <span className="empty-icon" aria-hidden="true">▤</span>
        <h2>Siap untuk pencatatan kerja</h2>
        <p>Gunakan menu sidebar untuk mengakses <strong>Pengeluaran Saya</strong> (klaim nota) dan <strong>Presensi & Jam Kerja</strong>.</p>
      </div>
    </section>
  )
}

function AdminPage() {
  const { user } = useAuth()
  const [usersList, setUsersList] = useState(() => {
    try {
      const reg = JSON.parse(localStorage.getItem('ruangkerja_registered_users')) || []
      const defaultUsers = [
        { id: 1, email: 'admin@gmail.com', name: 'Administrator', role: 'admin', jabatan: 'System Admin', aktif: 1 },
        { id: 2, email: 'admin@jamkerja.com', name: 'Super Admin', role: 'admin', jabatan: 'Project Manager', aktif: 1 },
        { id: 3, email: 'budi@jamkerja.com', name: 'Budi Santoso', role: 'karyawan', jabatan: 'Teknisi Jaringan Senior', aktif: 1 },
        { id: 4, email: 'siti@jamkerja.com', name: 'Siti Rahma', role: 'karyawan', jabatan: 'Sistem Analis', aktif: 1 },
        { id: 5, email: 'karyawan@gmail.com', name: 'Karyawan Demo', role: 'karyawan', jabatan: 'Staff Lapangan', aktif: 1 },
      ]
      const merged = [...defaultUsers]
      reg.forEach((r) => {
        if (!merged.some((m) => m.email.toLowerCase() === r.email.toLowerCase())) {
          merged.push({
            id: r.id || Date.now(),
            email: r.email,
            name: r.name || r.nama || r.email.split('@')[0],
            role: r.role || 'karyawan',
            jabatan: r.jabatan || 'Karyawan',
            aktif: 1,
          })
        }
      })
      return merged
    } catch {
      return []
    }
  })

  function toggleAktif(id) {
    const updated = usersList.map((u) => (u.id === id ? { ...u, aktif: u.aktif ? 0 : 1 } : u))
    setUsersList(updated)
  }

  const adminCount = usersList.filter((u) => u.role === 'admin').length
  const karyawanCount = usersList.filter((u) => u.role === 'karyawan').length
  const totalCount = usersList.length

  return (
    <section>
      <p className="eyebrow">ADMINISTRASI SISTEM</p>
      <h1 className="page-title">Manajemen Pengguna</h1>
      <p className="page-intro">
        Kelola akun pengguna, peran akun, dan kontrol izin akses aktif/nonaktif.
      </p>

      {/* Ringkasan Statistik Pengguna */}
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-label">Total Akun Terdaftar</span>
          <div className="stat-value">{totalCount}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Administrator</span>
          <div className="stat-value" style={{ color: '#2a6cb8' }}>{adminCount}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Karyawan Terdaftar</span>
          <div className="stat-value" style={{ color: '#1e7a46' }}>{karyawanCount}</div>
        </div>
      </div>

      {/* Tabel Pengguna */}
      <div className="data-card">
        <div className="data-header">
          <h3>Daftar Pengguna Sistem</h3>
          <span className="badge badge-info">{totalCount} Pengguna</span>
        </div>

        <div className="table-responsive">
          <table className="data-table">
            <thead>
              <tr>
                <th>Nama Lengkap</th>
                <th>Email</th>
                <th>Jabatan / Posisi</th>
                <th>Peran Akun</th>
                <th>Status Akun</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {usersList.map((u) => (
                <tr key={u.id}>
                  <td><strong>{u.name}</strong></td>
                  <td>{u.email}</td>
                  <td>{u.jabatan || '-'}</td>
                  <td>
                    <span className={`badge ${u.role === 'admin' ? 'badge-info' : 'badge-warning'}`}>
                      {u.role === 'admin' ? '👑 Administrator' : '👤 Karyawan'}
                    </span>
                  </td>
                  <td>
                    <span className={`badge ${u.aktif ? 'badge-success' : 'badge-danger'}`}>
                      {u.aktif ? '● Aktif' : '○ Nonaktif'}
                    </span>
                  </td>
                  <td>
                    <button
                      className={`button button-sm ${u.aktif ? 'button-secondary' : 'button-primary'}`}
                      style={{ padding: '4px 10px', fontSize: '11px', minHeight: '28px' }}
                      type="button"
                      onClick={() => toggleAktif(u.id)}
                    >
                      {u.aktif ? 'Nonaktifkan' : 'Aktifkan'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const mappedUser = user
    ? {
        ...user,
        id_karyawan: user.employeeId || user.id || 1,
        id_user: user.id || 1,
        nama: user.name || 'Pengguna',
        peran: user.role,
      }
    : null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<RegisterPage />} />
      <Route element={<ProtectedRoute />}>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to={user ? roleHome(user.role) : '/dashboard'} replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route element={<ProtectedRoute roles={['admin']} />}>
            <Route path="/admin" element={<AdminPage />} />
            <Route path="/admin/karyawan" element={<DataKaryawan />} />
            <Route path="/admin/pekerjaan" element={<DataPekerjaan />} />
            <Route path="/admin/penugasan" element={<Penugasan />} />
            <Route path="/admin/profil" element={<ProfilAdmin />} />
            <Route path="/admin/pengaturan" element={<PengaturanAdmin />} />
            <Route
              path="/admin/pengeluaran"
              element={<PengeluaranAdminPage currentUser={mappedUser} />}
            />
            <Route path="/admin/lokasi" element={<LokasiKerjaPage />} />
          </Route>
          <Route element={<ProtectedRoute roles={['karyawan']} />}>
            <Route path="/karyawan" element={<KaryawanPage />} />
            <Route
              path="/karyawan/pekerjaan-tersedia"
              element={<PekerjaanTersedia workerId={mappedUser?.id_karyawan} workerName={mappedUser?.nama} />}
            />
            <Route
              path="/karyawan/pekerjaan-saya"
              element={<PekerjaanSaya workerId={mappedUser?.id_karyawan} />}
            />
            <Route
              path="/karyawan/riwayat-pengajuan"
              element={<RiwayatPengajuan />}
            />
            <Route
              path="/karyawan/profil"
              element={
                <ProfilPekerja
                  worker={{
                    id_karyawan: mappedUser?.id_karyawan,
                    nama: mappedUser?.nama,
                    email: mappedUser?.email,
                    jabatan: mappedUser?.jabatan,
                  }}
                />
              }
            />
            <Route
              path="/karyawan/pengaturan"
              element={
                <PengaturanPekerja
                  worker={{
                    id_karyawan: mappedUser?.id_karyawan,
                    nama: mappedUser?.nama,
                  }}
                />
              }
            />
            <Route
              path="/karyawan/pengeluaran"
              element={<PengeluaranKaryawanPage currentUser={mappedUser} />}
            />
            <Route path="/karyawan/absensi" element={<AbsensiPage />} />
          </Route>
          <Route path="/pekerja" element={<PekerjaLocalTest />} />
        </Route>
      </Route>
      <Route path="*" element={<Navigate to={user ? '/dashboard' : '/login'} replace />} />
    </Routes>
  )
}

function App() {
  return (
    <AuthProvider>
      <LegacyAuthProvider>
        <AbsensiProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AbsensiProvider>
      </LegacyAuthProvider>
    </AuthProvider>
  )
}

export default App