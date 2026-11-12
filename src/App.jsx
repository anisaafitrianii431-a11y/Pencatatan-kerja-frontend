import { useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { AuthProvider as LegacyAuthProvider } from './contexts/AuthContext.jsx'
import { AbsensiProvider } from './hooks/useAbsensi.jsx'
import DashboardHome from './components/DashboardHome.jsx'
import DetailJamAdminPage from './pages/admin-gaji/DetailJamAdminPage.jsx'
import GajiAdminPage from './pages/admin-gaji/GajiAdminPage.jsx'
import JamKerjaAdminPage from './pages/admin-gaji/JamKerjaAdminPage.jsx'
import KontribusiAdminPage from './pages/admin-gaji/KontribusiAdminPage.jsx'
import VerifikasiAdminPage from './pages/admin-gaji/VerifikasiAdminPage.jsx'
import VerifikasiAbsensiAdminPage from './pages/admin-gaji/VerifikasiAbsensiAdminPage.jsx'
import VerifikasiPengeluaranAdminPage from './pages/admin-gaji/VerifikasiPengeluaranAdminPage.jsx'
import GajiKaryawanPage from './pages/karyawan-gaji/GajiKaryawanPage.jsx'
import PresensiKaryawanGajiPage from './pages/karyawan-gaji/PresensiKaryawanPage.jsx'
import ProyekKaryawanPage from './pages/karyawan-gaji/ProyekKaryawanPage.jsx'

// Fitur Pengeluaran & Kwitansi
import PengeluaranAdminPage from './pages/admin/PengeluaranAdminPage'
import PengeluaranKaryawanPage from './pages/karyawan/PengeluaranKaryawanPage'

// Fitur Absensi & Lokasi Kerja
import LokasiKerjaPage from './pages/admin-absen/LokasiKerjaPage'
import AbsensiPage from './pages/pekerja_absen/AbsensiPage'


// Fitur Pengembang 2: Layout & Dashboard Admin & Pekerja Asli
import AdminLayout from './layouts/AdminLayout.jsx'
import DashboardAdmin from './pages/admin/DashboardAdmin.jsx'
import PekerjaLayout from './layouts/PekerjaLayout.jsx'
import DashboardPekerja from './pages/pekerja/DashboardPekerja.jsx'

// Fitur Pengembang 2: Rekap Absensi Admin & Pekerja
import RekapAbsensiAdmin from './pages/admin/RekapAbsensiAdmin.jsx'
import RekapAbsensiPekerja from './pages/pekerja/RekapAbsensiPekerja.jsx'

// Fitur Pengembang 2: Manajemen Karyawan, Pekerjaan, Penugasan & Profil
import DataKaryawan from './pages/admin/DataKaryawan.jsx'
import ManajemenPengguna from './pages/admin/ManajemenPengguna.jsx'
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

function roleLabel(role) {
  return role === 'admin' ? 'Admin' : 'Pekerja'
}

function isWorkerRole(role) {
  return role === 'karyawan' || role === 'pekerja'
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
  if (roles && !roles.includes(user.role)) return <Navigate to={roleHome(user.role)} replace />
  return <Outlet />
}

function LoginPage() {
  const { user, signIn } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()
  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [submitting, setSubmitting] = useState(false)

  if (user) return <Navigate to={roleHome(user.role)} replace />

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')
    setSubmitting(true)
    try {
      const cleanId = identifier.trim()
      const authenticatedUser = await signIn({
        identifier: cleanId,
        email: cleanId,
        username: cleanId,
        password,
      })
      const requestedPath = location.state?.from?.pathname
      let targetPath = roleHome(authenticatedUser.role)
      if (requestedPath && !requestedPath.startsWith('/login') && !requestedPath.startsWith('/register')) {
        if (authenticatedUser.role === 'admin' && requestedPath.startsWith('/admin')) {
          targetPath = requestedPath
        } else if (authenticatedUser.role !== 'admin' && requestedPath.startsWith('/karyawan')) {
          targetPath = requestedPath
        }
      }
      navigate(targetPath, { replace: true })
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
        <h1>Kelola pekerjaan,<br />lebih mudah dan terarah.</h1>
        <p className="brand-description">
          Sistem pencatatan kerja untuk membantu pengelolaan data karyawan, pekerjaan, penugasan, absensi, pengeluaran, dan penggajian secara terintegrasi.
        </p>
        <div className="brand-decoration" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <p className="eyebrow">SELAMAT DATANG</p>
          <h2>Masuk ke akun Anda</h2>
          <p className="muted">Silakan masuk menggunakan akun yang telah terdaftar untuk mengakses sistem sesuai dengan hak akses Anda.</p>

          <form className="login-form" onSubmit={handleSubmit}>
            {error && <div className="notice notice-error" role="alert">{error}</div>}
            <label htmlFor="identifier">Email atau ID Karyawan</label>
            <input
              id="identifier"
              name="identifier"
              type="text"
              autoComplete="username"
              value={identifier}
              onChange={(event) => setIdentifier(event.target.value)}
              placeholder="Masukkan email atau ID Karyawan"
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
              placeholder="Masukkan password Anda"
              required
            />
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? 'Memproses...' : 'Masuk'}
              {!submitting && <span aria-hidden="true">→</span>}
            </button>
          </form>

          <p className="login-footnote">Akses sistem akan disesuaikan secara otomatis berdasarkan peran akun Anda.</p>
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
          Daftarkan akun pekerja Anda untuk mulai mencatat absensi, jam kerja proyek, dan pengeluaran operasional.
        </p>
        <div className="brand-decoration" aria-hidden="true">
          <span /><span /><span />
        </div>
      </section>

      <section className="login-panel">
        <div className="login-form-wrap">
          <p className="eyebrow">GABUNG SEKARANG</p>
          <h2>Daftar Akun Pekerja</h2>
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
              {submitting ? 'Mendaftarkan...' : 'Daftar Pekerja'}
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
  const [switchingAccount, setSwitchingAccount] = useState(false)
  const links = [
    { to: roleHome(user.role), label: 'Dashboard', icon: '▦' },
    ...(user.role === 'admin'
      ? [
          { to: '/admin/pengguna', label: 'Manajemen Pengguna', icon: '👥' },
          { to: '/admin/karyawan', label: 'Data Karyawan', icon: '👔' },
          { to: '/admin/pekerjaan', label: 'Data Pekerjaan', icon: '💼' },
          { to: '/admin/penugasan', label: 'Penugasan', icon: '📋' },
          { to: '/admin/approval-absensi', label: 'Approval Presensi', icon: '◷' },
          { to: '/admin/approval-pengeluaran', label: 'Approval Reimburse & Nota', icon: '▧' },
          { to: '/admin/gaji', label: 'Penggajian Karyawan', icon: '▱' },
          { to: '/admin/kontribusi', label: 'Kontribusi Proyek', icon: '▱' },
          { to: '/admin/jam-kerja', label: 'Rekap Jam Kerja Tim', icon: '♧' },
          { to: '/admin/pengeluaran', label: 'Pengeluaran & Kwitansi', icon: '🧾' },
          { to: '/admin/lokasi', label: 'Lokasi Kerja', icon: '📍' },
          { to: '/admin/profil', label: 'Profil Administrator', icon: '👤' },
          { to: '/admin/pengaturan', label: 'Pengaturan', icon: '⚙' },
        ]
      : [
          { to: '/karyawan/pekerjaan-tersedia', label: 'Pekerjaan Tersedia', icon: '🔍' },
          { to: '/karyawan/pekerjaan-saya', label: 'Pekerjaan Saya', icon: '💼' },
          { to: '/karyawan/riwayat-pengajuan', label: 'Riwayat Pengajuan', icon: '⏱' },
          { to: '/karyawan/absensi', label: 'Presensi & Jam Kerja', icon: '⏱️' },
          { to: '/karyawan/gaji', label: 'Slip Gaji Pribadi', icon: '▱' },
          { to: '/karyawan/proyek', label: 'Progres Proyek', icon: '▱' },
          { to: '/karyawan/pengeluaran', label: 'Pengeluaran Saya', icon: '🧾' },
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

  async function handleSwitchAccount() {
    setLogoutError('')
    setSwitchingAccount(true)
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      setLogoutError(error.message)
    } finally {
      setSwitchingAccount(false)
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="sidebar-brand" to={roleHome(user.role)}>
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
              <small>{roleLabel(user.role)}</small>
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
          <div className="topbar-actions">
            <span className="topbar-role">{roleLabel(user.role)}</span>
            <button
              className="account-switch-button"
              type="button"
              onClick={handleSwitchAccount}
              disabled={switchingAccount}
            >
              {switchingAccount ? 'Memproses...' : 'Ganti akun'}
            </button>
          </div>
        </header>
        <div className="page-content"><Outlet /></div>
      </div>
    </div>
  )
}

function DashboardPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const currentUser = {
    ...user,
    id_karyawan: user.employeeId || user.id || 1,
    id_user: user.id || 1,
    nama: user.name || 'Pengguna',
    peran: user.role,
    tarif_per_jam: user.tarif_per_jam || 50000,
  }

  return <DashboardHome currentUser={currentUser} onNavigate={(path) => navigate(`/${path}`)} />
}

function KaryawanPage() {
  const { user } = useAuth()
  return (
    <section>
      <p className="eyebrow">RUANG PEKERJA</p>
      <h1 className="page-title">Pencatatan kerja</h1>
      <p className="page-intro">
        Halo, <strong>{user.name}</strong> ({user.jabatan || 'Pekerja'}). Halaman ini disiapkan untuk ruang kerja pencatatan kerja.
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
  return <ManajemenPengguna />
}

function DashboardAdminPage() {
  const navigate = useNavigate()
  return (
    <DashboardAdmin
      onNavigate={(target) => {
        if (target === 'Data Karyawan') navigate('/admin/karyawan')
        else if (target === 'Data Pekerjaan') navigate('/admin/pekerjaan')
        else if (target === 'Penugasan') navigate('/admin/penugasan')
        else if (target === 'Rekap Absensi') navigate('/admin/rekap-absensi')
        else if (target === 'Gaji' || target === 'Penggajian') navigate('/admin/gaji')
        else if (target === 'Pengeluaran & Kwitansi' || target === 'Pengeluaran') navigate('/admin/pengeluaran')
        else if (target === 'Manajemen Pengguna') navigate('/admin/pengguna')
        else if (target === 'Lokasi Kerja') navigate('/admin/lokasi')
        else if (target === 'Dashboard') navigate('/admin')
        else navigate(target)
      }}
    />
  )
}

function AdminLayoutWrapper() {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  let activeItem = 'Dashboard'
  const path = location.pathname
  if (path === '/admin' || path === '/admin/dashboard' || path === '/dashboard') {
    activeItem = 'Dashboard'
  } else if (path.startsWith('/admin/karyawan')) {
    activeItem = 'Data Karyawan'
  } else if (path.startsWith('/admin/pekerjaan')) {
    activeItem = 'Data Pekerjaan'
  } else if (path.startsWith('/admin/penugasan')) {
    activeItem = 'Penugasan'
  } else if (path.startsWith('/admin/rekap-absensi')) {
    activeItem = 'Rekap Absensi'
  } else if (path.startsWith('/admin/gaji')) {
    activeItem = 'Gaji'
  } else if (path.startsWith('/admin/pengguna')) {
    activeItem = 'Manajemen Pengguna'
  } else if (path.startsWith('/admin/pengeluaran')) {
    activeItem = 'Pengeluaran & Kwitansi'
  } else if (path.startsWith('/admin/lokasi')) {
    activeItem = 'Lokasi Kerja'
  } else if (path.startsWith('/admin/profil')) {
    activeItem = 'Profil Administrator'
  } else if (path.startsWith('/admin/pengaturan')) {
    activeItem = 'Pengaturan'
  }

  function handleSelectMenuItem(item) {
    if (item === 'Dashboard') navigate('/admin')
    else if (item === 'Data Karyawan') navigate('/admin/karyawan')
    else if (item === 'Data Pekerjaan') navigate('/admin/pekerjaan')
    else if (item === 'Penugasan') navigate('/admin/penugasan')
    else if (item === 'Rekap Absensi') navigate('/admin/rekap-absensi')
    else if (item === 'Gaji' || item === 'Penggajian') navigate('/admin/gaji')
    else if (item === 'Manajemen Pengguna') navigate('/admin/pengguna')
    else if (item === 'Pengeluaran & Kwitansi') navigate('/admin/pengeluaran')
    else if (item === 'Lokasi Kerja') navigate('/admin/lokasi')
    else if (item === 'Profil Administrator') navigate('/admin/profil')
    else if (item === 'Pengaturan') navigate('/admin/pengaturan')
  }

  async function handleLogout() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <AdminLayout
      activeItem={activeItem}
      adminName={user?.name || 'Administrator'}
      onLogout={handleLogout}
      onSelectMenuItem={handleSelectMenuItem}
    >
      <Outlet />
    </AdminLayout>
  )
}

function DashboardPekerjaPage({ mappedUser }) {
  const navigate = useNavigate()
  return (
    <DashboardPekerja
      onNavigate={(target) => {
        if (target === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-tersedia')
        else if (target === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
        else if (target === 'Riwayat Pengajuan') navigate('/karyawan/riwayat-pengajuan')
        else if (target === 'Rekap Absensi') navigate('/karyawan/rekap-absensi')
        else if (target === 'Gaji Saya' || target === 'Gaji' || target === 'Slip Gaji') navigate('/karyawan/gaji')
        else if (target === 'Dashboard') navigate('/karyawan')
        else navigate(target)
      }}
      workerId={mappedUser?.id_karyawan}
      workerName={mappedUser?.nama}
    />
  )
}

function RiwayatPengajuanPage({ mappedUser }) {
  const navigate = useNavigate()
  return (
    <RiwayatPengajuan
      workerId={mappedUser?.id_karyawan}
      workerName={mappedUser?.nama}
      onNavigate={(target) => {
        if (target === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
        else if (target === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-tersedia')
      }}
    />
  )
}

function PekerjaLayoutWrapper({ mappedUser }) {
  const { user, signOut } = useAuth()
  const location = useLocation()
  const navigate = useNavigate()

  let activeItem = 'Dashboard'
  const path = location.pathname
  if (path === '/karyawan' || path === '/karyawan/dashboard') {
    activeItem = 'Dashboard'
  } else if (path.startsWith('/karyawan/pekerjaan-tersedia')) {
    activeItem = 'Pekerjaan Tersedia'
  } else if (path.startsWith('/karyawan/pekerjaan-saya')) {
    activeItem = 'Pekerjaan Saya'
  } else if (path.startsWith('/karyawan/riwayat-pengajuan')) {
    activeItem = 'Riwayat Pengajuan'
  } else if (path.startsWith('/karyawan/rekap-absensi')) {
    activeItem = 'Rekap Absensi'
  } else if (path.startsWith('/karyawan/gaji')) {
    activeItem = 'Gaji Saya'
  } else if (path.startsWith('/karyawan/pengeluaran')) {
    activeItem = 'Pengeluaran Saya'
  } else if (path.startsWith('/karyawan/absensi')) {
    activeItem = 'Presensi & Jam Kerja'
  } else if (path.startsWith('/karyawan/profil')) {
    activeItem = 'Profil Saya'
  } else if (path.startsWith('/karyawan/pengaturan')) {
    activeItem = 'Pengaturan'
  }

  function handleSelectMenuItem(item) {
    if (item === 'Dashboard') navigate('/karyawan')
    else if (item === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-tersedia')
    else if (item === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
    else if (item === 'Riwayat Pengajuan') navigate('/karyawan/riwayat-pengajuan')
    else if (item === 'Rekap Absensi') navigate('/karyawan/rekap-absensi')
    else if (item === 'Gaji Saya' || item === 'Gaji' || item === 'Slip Gaji') navigate('/karyawan/gaji')
    else if (item === 'Pengeluaran Saya') navigate('/karyawan/pengeluaran')
    else if (item === 'Presensi & Jam Kerja') navigate('/karyawan/absensi')
    else if (item === 'Profil Saya') navigate('/karyawan/profil')
    else if (item === 'Pengaturan') navigate('/karyawan/pengaturan')
  }

  async function handleLogout() {
    try {
      await signOut()
      navigate('/login', { replace: true })
    } catch (error) {
      console.error('Logout error:', error)
    }
  }

  return (
    <PekerjaLayout
      activeItem={activeItem}
      onLogout={handleLogout}
      onSelectMenuItem={handleSelectMenuItem}
      workerName={mappedUser?.nama || user?.name || 'Pekerja'}
    >
      <Outlet />
    </PekerjaLayout>
  )
}

function AppRoutes() {
  const { user } = useAuth()
  const location = useLocation()
  const mappedUser = user
    ? {
        ...user,
        id_karyawan:
          Number.isInteger(Number(user.employeeId)) &&
          Number(user.employeeId) > 0 &&
          Number(user.employeeId) < 100000
            ? Number(user.employeeId)
            : Number.isInteger(Number(user.id)) &&
              Number(user.id) > 0 &&
              Number(user.id) < 100000
              ? Number(user.id)
              : 1,
        id_user: user.id || 1,
        nama: user.name || 'Pengguna',
        peran: user.role,
      }
    : null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<ProtectedRoute />}>
        {/* Rute khusus Admin: Menggunakan AdminLayout asli tanpa tabrakan AppLayout */}
        <Route element={<ProtectedRoute roles={['admin']} />}>
          <Route element={<AdminLayoutWrapper />}>
            <Route path="/admin" element={<DashboardAdminPage />} />
            <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
            <Route path="/admin/karyawan" element={<DataKaryawan />} />
            <Route path="/admin/pekerjaan" element={<DataPekerjaan />} />
            <Route path="/admin/penugasan" element={<Penugasan />} />
            <Route path="/admin/rekap-absensi" element={<RekapAbsensiAdmin />} />
            <Route path="/admin/pengguna" element={<ManajemenPengguna />} />
            <Route
              path="/admin/approval-absensi"
              element={<VerifikasiAbsensiAdminPage currentUser={mappedUser} />}
            />
            <Route
              path="/admin/verifikasi"
              element={<VerifikasiAdminPage currentUser={mappedUser} />}
            />
            <Route
              path="/admin/approval-pengeluaran"
              element={<VerifikasiPengeluaranAdminPage currentUser={mappedUser} />}
            />
            <Route path="/admin/gaji" element={<GajiAdminPage currentUser={mappedUser} />} />
            <Route path="/admin/kontribusi" element={<KontribusiAdminPage currentUser={mappedUser} />} />
            <Route path="/admin/jam-kerja" element={<JamKerjaAdminPage currentUser={mappedUser} />} />
            <Route
              path="/admin/detail-jam"
              element={
                <DetailJamAdminPage
                  currentUser={mappedUser}
                  query={Object.fromEntries(new URLSearchParams(location.search))}
                />
              }
            />
            <Route
              path="/admin/pengeluaran"
              element={<PengeluaranAdminPage currentUser={mappedUser} />}
            />
            <Route path="/admin/lokasi" element={<LokasiKerjaPage />} />
            <Route path="/admin/profil" element={<ProfilAdmin />} />
            <Route path="/admin/pengaturan" element={<PengaturanAdmin />} />
          </Route>
        </Route>

        {/* Rute khusus Karyawan: Menggunakan PekerjaLayout asli tanpa tabrakan AppLayout */}
        <Route element={<ProtectedRoute roles={['karyawan']} />}>
          <Route element={<PekerjaLayoutWrapper mappedUser={mappedUser} />}>
            <Route path="/karyawan" element={<DashboardPekerjaPage mappedUser={mappedUser} />} />
            <Route path="/karyawan/dashboard" element={<DashboardPekerjaPage mappedUser={mappedUser} />} />
            <Route
              path="/karyawan/pekerjaan-tersedia"
              element={<PekerjaanTersedia workerId={mappedUser?.id_karyawan} workerName={mappedUser?.nama} />}
            />
            <Route
              path="/karyawan/pekerjaan-saya"
              element={
                <PekerjaanSaya
                  workerId={mappedUser?.id_karyawan}
                  workerName={mappedUser?.nama}
                />
              }
            />
            <Route
              path="/karyawan/riwayat-pengajuan"
              element={<RiwayatPengajuanPage mappedUser={mappedUser} />}
            />
            <Route
              path="/karyawan/rekap-absensi"
              element={
                <RekapAbsensiPekerja
                  workerId={mappedUser?.id_karyawan}
                  workerName={mappedUser?.nama}
                />
              }
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
            <Route path="/karyawan/presensi" element={<PresensiKaryawanGajiPage currentUser={mappedUser} />} />
            <Route path="/karyawan/gaji" element={<GajiKaryawanPage currentUser={mappedUser} />} />
            <Route path="/karyawan/proyek" element={<ProyekKaryawanPage currentUser={mappedUser} />} />
            <Route
              path="/karyawan/pengeluaran"
              element={<PengeluaranKaryawanPage currentUser={mappedUser} />}
            />
            <Route
              path="/karyawan/absensi"
              element={
                <AbsensiPage
                  workerId={mappedUser?.id_karyawan}
                  workerName={mappedUser?.nama}
                />
              }
            />
          </Route>
        </Route>

        {/* Rute Navigasi Global & Testing */}
        <Route path="/" element={<Navigate to={user ? roleHome(user.role) : '/login'} replace />} />
        <Route
          path="/dashboard"
          element={<Navigate to={user ? roleHome(user.role) : '/login'} replace />}
        />
        <Route path="/pekerja" element={<PekerjaLocalTest />} />
      </Route>
      <Route path="*" element={<Navigate to={user ? roleHome(user.role) : '/login'} replace />} />
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