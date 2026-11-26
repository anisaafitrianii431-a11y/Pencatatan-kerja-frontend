import { useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { AuthProvider as LegacyAuthProvider } from './contexts/AuthContext.jsx'
import { AbsensiProvider } from './hooks/useAbsensi.jsx'
import BerandaDashboard from './components/BerandaDashboard.jsx'
import DetailJamKerjaAdmin from './pages/admin/DetailJamKerjaAdmin.jsx'
import GajiAdmin from './pages/admin/GajiAdmin.jsx'
import JamKerjaAdmin from './pages/admin/JamKerjaAdmin.jsx'
import KontribusiAdmin from './pages/admin/KontribusiAdmin.jsx'
import VerifikasiAdmin from './pages/admin/VerifikasiAdmin.jsx'
import VerifikasiAbsensiAdmin from './pages/admin/VerifikasiAbsensiAdmin.jsx'
import VerifikasiPengeluaranAdmin from './pages/admin/VerifikasiPengeluaranAdmin.jsx'
import GajiKaryawan from './pages/karyawan/GajiKaryawan.jsx'
import AbsensiKaryawan from './pages/karyawan/AbsensiKaryawan.jsx'
import PengeluaranAdmin from './pages/admin/PengeluaranAdmin'
import PemasukanKasAdmin from './pages/admin/PemasukanKasAdmin'
import PengeluaranKaryawan from './pages/karyawan/PengeluaranKaryawan'
import TataLetakAdmin from './layouts/TataLetakAdmin.jsx'
import DashboardAdmin from './pages/admin/DashboardAdmin.jsx'
import TataLetakKaryawan from './layouts/TataLetakKaryawan.jsx'
import DashboardPekerja from './pages/karyawan/DashboardPekerja.jsx'
import RekapAbsensiAdmin from './pages/admin/RekapAbsensiAdmin.jsx'
import RekapAbsensiPekerja from './pages/karyawan/RekapAbsensiPekerja.jsx'
import DataKaryawan from './pages/admin/DataKaryawan.jsx'
import MasterRole from './pages/admin/MasterRole.jsx'
import ManajemenPengguna from './pages/admin/ManajemenPengguna.jsx'
import DataPekerjaan from './pages/admin/DataPekerjaan.jsx'
import Penugasan from './pages/admin/Penugasan.jsx'
import ProfilAdmin from './pages/admin/ProfilAdmin.jsx'
import PengaturanAdmin from './pages/admin/PengaturanAdmin.jsx'
import HakAksesAdmin from './pages/admin/HakAksesAdmin.jsx'
import PekerjaanSaya from './pages/karyawan/PekerjaanSaya.jsx'
import ProfilPekerja from './pages/karyawan/ProfilPekerja.jsx'
import PengaturanPekerja from './pages/karyawan/PengaturanPekerja.jsx'
import { isAdminRole } from './utils/roles.js'

import './index.css'
import './App.css'

function roleHome(role) {
  return isAdminRole(role) ? '/admin' : '/karyawan'
}

function roleLabel(role) {
  if (role === 'super_admin') return 'Super Admin'
  if (role === 'admin') return 'Admin'
  return 'Pekerja'
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
  const [showPassword, setShowPassword] = useState(false)
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
        if (isAdminRole(authenticatedUser.role) && requestedPath.startsWith('/admin')) {
          targetPath = requestedPath
        } else if (!isAdminRole(authenticatedUser.role) && requestedPath.startsWith('/karyawan')) {
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
        <div className="brand-header">
          <div className="brand-logo-container">
            <img src="/logo.png" alt="CV. Putra Anugrah Mandiri Logo" className="brand-logo" />
          </div>
          <div className="brand-title-group">
            <span className="brand-company">CV. PUTRA ANUGRAH MANDIRI</span>
            <span className="brand-badge">Sistem Resmi</span>
          </div>
        </div>
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
            <div className="password-input-wrap">
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Masukkan password Anda"
                required
              />
              <button
                type="button"
                className="password-toggle-button"
                onClick={() => setShowPassword((prev) => !prev)}
                title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                aria-label={showPassword ? 'Sembunyikan password' : 'Lihat password'}
              >
                {showPassword ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/><line x1="1" y1="1" x2="23" y2="23"/></svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
                )}
              </button>
            </div>
            <button className="button button-primary login-submit" type="submit" disabled={submitting}>
              {submitting ? (
                <>
                  <span className="button-spinner" aria-hidden="true" />
                  <span>Memproses...</span>
                </>
              ) : (
                <>
                  <span>Masuk</span>
                  <span aria-hidden="true">→</span>
                </>
              )}
            </button>
          </form>

          <p className="login-footnote">Akses sistem disesuaikan secara otomatis berdasarkan peran akun Anda.</p>
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
        <div className="brand-header">
          <div className="brand-logo-container">
            <img src="/logo.png" alt="CV. Putra Anugrah Mandiri Logo" className="brand-logo" />
          </div>
          <div className="brand-title-group">
            <span className="brand-company">CV. PUTRA ANUGRAH MANDIRI</span>
            <span className="brand-badge">Sistem Resmi</span>
          </div>
        </div>
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
    ...(isAdminRole(user.role)
      ? [
          { to: '/admin/pengguna', label: 'Manajemen Pengguna', icon: '👥' },
          ...(user.role === 'super_admin' ? [{ to: '/admin/hak-akses', label: 'Pengaturan Hak Akses', icon: '🛡️' }] : []),
          { to: '/admin/karyawan', label: 'Data Karyawan', icon: '👔' },
          { to: '/admin/pekerjaan', label: 'Data Pekerjaan', icon: '💼' },
          { to: '/admin/penugasan', label: 'Penugasan', icon: '📋' },
          { to: '/admin/approval-absensi', label: 'Approval Presensi', icon: '◷' },
          { to: '/admin/approval-pengeluaran', label: 'Approval Reimburse & Nota', icon: '▧' },
          { to: '/admin/gaji', label: 'Penggajian Karyawan', icon: '▱' },
          { to: '/admin/kontribusi', label: 'Kontribusi Proyek', icon: '▱' },
          { to: '/admin/jam-kerja', label: 'Rekap Jam Kerja Tim', icon: '♧' },
          { to: '/admin/pemasukan', label: 'Pemasukan & Kas Kantor', icon: '💼' },
          { to: '/admin/pengeluaran', label: 'Pengeluaran & Kuitansi', icon: '🧾' },
          { to: '/admin/profil', label: 'Profil Administrator', icon: '👤' },
          { to: '/admin/pengaturan', label: 'Pengaturan', icon: '⚙' },
        ]
      : [
          { to: '/karyawan/pekerjaan-saya', label: 'List Pekerjaan', icon: '💼' },
          { to: '/karyawan/absensi', label: 'Absensi', icon: '⏱️' },
          { to: '/karyawan/gaji', label: 'Slip Gaji Pribadi', icon: '▱' },
          { to: '/karyawan/pengeluaran', label: 'Rekap Pengeluaran', icon: '🧾' },
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
    id_karyawan: user?.employeeId || user?.id_karyawan || null,
    id_user: user?.id_user || user?.id || null,
    nama: user?.nama || user?.name || 'Pengguna',
    peran: user?.role || user?.peran,
    tarif_per_jam: user?.tarif_per_jam || 50000,
  }

  return <BerandaDashboard currentUser={currentUser} onNavigate={(path) => navigate(`/${path}`)} />
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
        <p>Gunakan menu sidebar untuk mengakses <strong>Pengeluaran Saya</strong> (klaim nota) dan <strong>Absensi</strong>.</p>
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
        else if (target === 'Gaji' || target === 'Penggajian' || target === 'Penggajian Karyawan') navigate('/admin/gaji')
        else if (target === 'Pengeluaran & Kwitansi' || target === 'Pengeluaran & Kuitansi' || target === 'Pengeluaran') navigate('/admin/pengeluaran')
        else if (target === 'Pemasukan & Kas Kantor') navigate('/admin/pemasukan')
        else if (target === 'Manajemen Pengguna') navigate('/admin/pengguna')
        else if (target === 'Rekap Jam Kerja Tim') navigate('/admin/jam-kerja')
        else if (target === 'Approval Presensi') navigate('/admin/approval-absensi')
        else if (target === 'Approval Reimburse') navigate('/admin/approval-pengeluaran')
        else if (target === 'Kontribusi Proyek') navigate('/admin/kontribusi')
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
  } else if (path.startsWith('/admin/rekap-absensi') || path.startsWith('/admin/approval-absensi') || path.startsWith('/admin/verifikasi') || path.startsWith('/admin/jam-kerja')) {
    activeItem = 'Rekap Absensi'
  } else if (path.startsWith('/admin/penugasan')) {
    activeItem = 'Penugasan'
  } else if (path.startsWith('/admin/pengeluaran') || path.startsWith('/admin/pemasukan') || path.startsWith('/admin/approval-pengeluaran')) {
    activeItem = 'Pengeluaran & Kwitansi'
  } else if (path.startsWith('/admin/gaji') || path.startsWith('/admin/detail-jam') || path.startsWith('/admin/kontribusi')) {
    activeItem = 'Gaji'
  } else if (path.startsWith('/admin/pekerjaan') || path.startsWith('/admin/master-role')) {
    activeItem = 'Data Pekerjaan'
  } else if (path.startsWith('/admin/karyawan')) {
    activeItem = 'Data Karyawan'
  } else if (path.startsWith('/admin/pengguna')) {
    activeItem = 'Manajemen Pengguna'
  } else if (path.startsWith('/admin/hak-akses')) {
    activeItem = 'Pengaturan Hak Akses'
  } else if (path.startsWith('/admin/profil')) {
    activeItem = 'Profil Administrator'
  } else if (path.startsWith('/admin/pengaturan')) {
    activeItem = 'Pengaturan'
  }

  function handleSelectMenuItem(item) {
    if (item === 'Dashboard') navigate('/admin')
    else if (item === 'Rekap Absensi') navigate('/admin/rekap-absensi')
    else if (item === 'Penugasan') navigate('/admin/penugasan')
    else if (item === 'Pengeluaran & Kwitansi' || item === 'Pengeluaran & Kuitansi') navigate('/admin/pengeluaran')
    else if (item === 'Gaji' || item === 'Penggajian Karyawan' || item === 'Penggajian') navigate('/admin/gaji')
    else if (item === 'Data Pekerjaan') navigate('/admin/pekerjaan')
    else if (item === 'Data Karyawan') navigate('/admin/karyawan')
    else if (item === 'Master Role' || item === 'Master Role & Hierarki') navigate('/admin/master-role')
    else if (item === 'Manajemen Pengguna') navigate('/admin/pengguna')
    else if (item === 'Pengaturan Hak Akses') navigate('/admin/hak-akses')
    else if (item === 'Pemasukan & Kas Kantor') navigate('/admin/pemasukan')
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
    <TataLetakAdmin
      activeItem={activeItem}
      adminName={user?.name || 'Administrator'}
      isSuperAdmin={user?.role === 'super_admin'}
      onLogout={handleLogout}
      onSelectMenuItem={handleSelectMenuItem}
    >
      <Outlet />
    </TataLetakAdmin>
  )
}

function navigateWorkerTarget(navigate, target) {
  if (target === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-saya')
  else if (target === 'List Pekerjaan' || target === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
  else if (target === 'Slip Gaji Pribadi') navigate('/karyawan/gaji')
  else if (target === 'Absensi' || target === 'Rekap Absensi' || target === 'Presensi & Jam Kerja') navigate('/karyawan/absensi')
  else if (target === 'Pengeluaran Saya') navigate('/karyawan/pengeluaran')
  else if (target === 'Profil Saya') navigate('/karyawan/profil')
  else if (target === 'Pengaturan') navigate('/karyawan/pengaturan')
  else if (target === 'Dashboard') navigate('/karyawan')
  else navigate(target)
}

function ProfilPekerjaPage({ mappedUser, onUpdateProfile }) {
  const navigate = useNavigate()
  return (
    <ProfilPekerja
      worker={mappedUser}
      onUpdateWorker={onUpdateProfile}
      onNavigate={(target) => navigateWorkerTarget(navigate, target)}
    />
  )
}

function PengaturanPekerjaPage({ mappedUser, onUpdateProfile, onChangePassword }) {
  const navigate = useNavigate()
  return (
    <PengaturanPekerja
      worker={mappedUser}
      onUpdateProfile={onUpdateProfile}
      onChangePassword={onChangePassword}
      onNavigate={(target) => navigateWorkerTarget(navigate, target)}
    />
  )
}

function DashboardPekerjaPage({ mappedUser }) {
  const navigate = useNavigate()
  return (
    <DashboardPekerja
      onNavigate={(target) => navigateWorkerTarget(navigate, target)}
      workerId={mappedUser?.id_karyawan}
      workerName={mappedUser?.nama}
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
    activeItem = 'List Pekerjaan'
  } else if (path.startsWith('/karyawan/pekerjaan-saya')) {
    activeItem = 'List Pekerjaan'
  } else if (path.startsWith('/karyawan/gaji')) {
    activeItem = 'Slip Gaji Pribadi'
  } else if (path.startsWith('/karyawan/rekap-absensi') || path.startsWith('/karyawan/absensi')) {
    activeItem = 'Absensi'
  } else if (path.startsWith('/karyawan/pengeluaran')) {
    activeItem = location.state?.fromWorkList ? 'List Pekerjaan' : 'Rekap Pengeluaran'
  } else if (path.startsWith('/karyawan/profil')) {
    activeItem = 'Profil Saya'
  } else if (path.startsWith('/karyawan/pengaturan')) {
    activeItem = 'Pengaturan'
  }

  function handleSelectMenuItem(item) {
    if (item === 'Dashboard') navigate('/karyawan')
    else if (item === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-saya')
    else if (item === 'List Pekerjaan' || item === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
    else if (item === 'Slip Gaji Pribadi' || item === 'Gaji Saya' || item === 'Gaji' || item === 'Slip Gaji') navigate('/karyawan/gaji')
    else if (item === 'Absensi' || item === 'Rekap Absensi' || item === 'Presensi & Jam Kerja') navigate('/karyawan/absensi')
    else if (item === 'Pengeluaran Saya' || item === 'Rekap Pengeluaran') navigate('/karyawan/pengeluaran')
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
    <TataLetakKaryawan
      activeItem={activeItem}
      onLogout={handleLogout}
      onSelectMenuItem={handleSelectMenuItem}
      workerName={mappedUser?.nama || user?.name || 'Pekerja'}
      workerPhoto={mappedUser?.foto_profil || user?.foto_profil || ''}
    >
      <Outlet />
    </TataLetakKaryawan>
  )
}

function AppRoutes() {
  const { user, updateUserProfile, changeUserPassword } = useAuth()
  const location = useLocation()
  const mappedUser = user
    ? {
        ...user,
        id_karyawan:
          Number.isInteger(Number(user.id_karyawan)) &&
          Number(user.id_karyawan) > 0 &&
          Number(user.id_karyawan) < 100000
            ? Number(user.id_karyawan)
            : Number.isInteger(Number(user.employeeId)) &&
              Number(user.employeeId) > 0 &&
              Number(user.employeeId) < 100000
              ? Number(user.employeeId)
              : null,
        id_user: user.id_user || user.id || null,
        nama: user.nama || user.name || 'Pengguna',
        peran: user.peran || user.role,
      }
    : null

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/register" element={<Navigate to="/login" replace />} />
      <Route element={<ProtectedRoute />}>
        {/* Rute khusus Admin & Super Admin: Menggunakan TataLetakAdmin asli tanpa tabrakan AppLayout */}
        <Route element={<ProtectedRoute roles={['admin', 'super_admin']} />}>
          <Route element={<AdminLayoutWrapper />}>
            <Route path="/admin" element={<DashboardAdminPage />} />
            <Route path="/admin/dashboard" element={<DashboardAdminPage />} />
            <Route path="/admin/karyawan" element={<DataKaryawan />} />
            <Route path="/admin/master-role" element={<MasterRole />} />
            <Route path="/admin/pekerjaan" element={<DataPekerjaan />} />
            <Route path="/admin/penugasan" element={<Penugasan />} />
            <Route path="/admin/rekap-absensi" element={<RekapAbsensiAdmin />} />
            <Route path="/admin/pengguna" element={<ManajemenPengguna />} />
            <Route path="/admin/hak-akses" element={<HakAksesAdmin />} />
            <Route
              path="/admin/approval-absensi"
              element={<VerifikasiAbsensiAdmin currentUser={mappedUser} />}
            />
            <Route
              path="/admin/verifikasi"
              element={<VerifikasiAdmin currentUser={mappedUser} />}
            />
            <Route
              path="/admin/approval-pengeluaran"
              element={<VerifikasiPengeluaranAdmin currentUser={mappedUser} />}
            />
            <Route path="/admin/gaji" element={<GajiAdmin currentUser={mappedUser} />} />
            <Route path="/admin/kontribusi" element={<KontribusiAdmin currentUser={mappedUser} />} />
            <Route path="/admin/jam-kerja" element={<JamKerjaAdmin currentUser={mappedUser} />} />
            <Route
              path="/admin/detail-jam"
              element={
                <DetailJamKerjaAdmin
                  currentUser={mappedUser}
                  query={Object.fromEntries(new URLSearchParams(location.search))}
                />
              }
            />
            <Route
              path="/admin/pemasukan"
              element={<PemasukanKasAdmin currentUser={mappedUser} />}
            />
            <Route
              path="/admin/pengeluaran"
              element={<PengeluaranAdmin currentUser={mappedUser} />}
            />
            <Route path="/admin/profil" element={<ProfilAdmin />} />
            <Route path="/admin/pengaturan" element={<PengaturanAdmin />} />
          </Route>
        </Route>

        {/* Rute khusus Karyawan: Menggunakan TataLetakKaryawan asli tanpa tabrakan AppLayout */}
        <Route element={<ProtectedRoute roles={['karyawan']} />}>
          <Route element={<PekerjaLayoutWrapper mappedUser={mappedUser} />}>
            <Route path="/karyawan" element={<DashboardPekerjaPage mappedUser={mappedUser} />} />
            <Route path="/karyawan/dashboard" element={<DashboardPekerjaPage mappedUser={mappedUser} />} />
            <Route path="/karyawan/pekerjaan-tersedia" element={<Navigate to="/karyawan/pekerjaan-saya" replace />} />
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
              element={<Navigate to="/karyawan/pekerjaan-saya" replace />}
            />
            <Route
              path="/karyawan/rekap-absensi"
              element={
                <RekapAbsensiPekerja
                  workerId={mappedUser?.id_karyawan}
                  workerName={mappedUser?.nama}
                  defaultTab="rekap"
                />
              }
            />
            <Route
              path="/karyawan/profil"
              element={
                <ProfilPekerjaPage
                  mappedUser={mappedUser}
                  onUpdateProfile={updateUserProfile}
                />
              }
            />
            <Route
              path="/karyawan/pengaturan"
              element={
                <PengaturanPekerjaPage
                  mappedUser={mappedUser}
                  onUpdateProfile={updateUserProfile}
                  onChangePassword={changeUserPassword}
                />
              }
            />
            <Route path="/karyawan/presensi" element={<AbsensiKaryawan currentUser={mappedUser} />} />
            <Route path="/karyawan/gaji" element={<GajiKaryawan currentUser={mappedUser} />} />
            <Route path="/karyawan/proyek" element={<Navigate to="/karyawan/pekerjaan-saya" replace />} />
            <Route
              path="/karyawan/pemasukan"
              element={<Navigate to="/karyawan/pengeluaran?tab=uang-kantor" replace />}
            />
            <Route
              path="/karyawan/pengeluaran"
              element={<PengeluaranKaryawan currentUser={mappedUser} />}
            />
            <Route
              path="/karyawan/absensi"
              element={
                <RekapAbsensiPekerja
                  workerId={mappedUser?.id_karyawan}
                  workerName={mappedUser?.nama}
                  defaultTab="absen"
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
        <Route path="/pekerja" element={<Navigate to="/karyawan" replace />} />
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
