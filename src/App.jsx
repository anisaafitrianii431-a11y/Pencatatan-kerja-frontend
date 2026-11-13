import { useState } from 'react'
import { BrowserRouter, Link, Navigate, NavLink, Outlet, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { AuthProvider } from './auth/AuthContext.jsx'
import { useAuth } from './auth/useAuth.js'
import { AuthProvider as LegacyAuthProvider } from './contexts/AuthContext.jsx'
import { AbsensiProvider } from './hooks/useAbsensi.jsx'
import DashboardHome from './components/DashboardHome.jsx'
import DetailJamAdminPage from './pages/admin/DetailJamAdminPage.jsx'
import GajiAdminPage from './pages/admin/GajiAdminPage.jsx'
import JamKerjaAdminPage from './pages/admin/JamKerjaAdminPage.jsx'
import KontribusiAdminPage from './pages/admin/KontribusiAdminPage.jsx'
import VerifikasiAdminPage from './pages/admin/VerifikasiAdminPage.jsx'
import VerifikasiAbsensiAdminPage from './pages/admin/VerifikasiAbsensiAdminPage.jsx'
import VerifikasiPengeluaranAdminPage from './pages/admin/VerifikasiPengeluaranAdminPage.jsx'
import GajiKaryawanPage from './pages/karyawan/GajiKaryawanPage.jsx'
import PresensiKaryawanGajiPage from './pages/karyawan/PresensiKaryawanPage.jsx'
import PengeluaranAdminPage from './pages/admin/PengeluaranAdminPage'
import PemasukanAdminPage from './pages/admin/PemasukanAdminPage'
import PengeluaranKaryawanPage from './pages/karyawan/PengeluaranKaryawanPage'
import LokasiKerjaPage from './pages/admin/LokasiKerjaPage'
import AdminLayout from './layouts/AdminLayout.jsx'
import DashboardAdmin from './pages/admin/DashboardAdmin.jsx'
import PekerjaLayout from './layouts/PekerjaLayout.jsx'
import DashboardPekerja from './pages/karyawan/DashboardPekerja.jsx'
import RekapAbsensiAdmin from './pages/admin/RekapAbsensiAdmin.jsx'
import RekapAbsensiPekerja from './pages/karyawan/RekapAbsensiPekerja.jsx'
import DataKaryawan from './pages/admin/DataKaryawan.jsx'
import DataPekerjaan from './pages/admin/DataPekerjaan.jsx'
import Penugasan from './pages/admin/Penugasan.jsx'
import ProfilAdmin from './pages/admin/ProfilAdmin.jsx'
import PengaturanAdmin from './pages/admin/PengaturanAdmin.jsx'
import PekerjaLocalTest from './pages/karyawan/PekerjaLocalTest.jsx'
import PekerjaanSaya from './pages/karyawan/PekerjaanSaya.jsx'
import PekerjaanTersedia from './pages/karyawan/PekerjaanTersedia.jsx'
import ProfilPekerja from './pages/karyawan/ProfilPekerja.jsx'
import PengaturanPekerja from './pages/karyawan/PengaturanPekerja.jsx'

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
    { to: '/dashboard', label: 'Dashboard', icon: '▦' },
    ...(user.role === 'admin'
      ? [
          { to: '/admin', label: 'Manajemen Pengguna', icon: '👥' },
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
          { to: '/admin/lokasi', label: 'Lokasi Kerja', icon: '📍' },
          { to: '/admin/profil', label: 'Profil Administrator', icon: '👤' },
          { to: '/admin/pengaturan', label: 'Pengaturan', icon: '⚙' },
        ]
      : [
          { to: '/karyawan/pekerjaan-tersedia', label: 'Pekerjaan Tersedia', icon: '🔍' },
          { to: '/karyawan/pekerjaan-saya', label: 'List Pekerjaan', icon: '💼' },
          { to: '/karyawan/absensi', label: 'Absensi', icon: '⏱️' },
          { to: '/karyawan/gaji', label: 'Slip Gaji Pribadi', icon: '▱' },
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
        <p>Gunakan menu sidebar untuk mengakses <strong>Pengeluaran Saya</strong> (klaim nota) dan <strong>Absensi</strong>.</p>
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
  const karyawanCount = usersList.filter((u) => isWorkerRole(u.role)).length
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
          <span className="stat-label">Admin Terdaftar</span>
          <div className="stat-value" style={{ color: '#2a6cb8' }}>{adminCount}</div>
        </div>
        <div className="stat-card">
          <span className="stat-label">Pekerja Terdaftar</span>
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
                      {u.role === 'admin' ? '👑 Admin' : '👤 Pekerja'}
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

function DashboardAdminPage() {
  const navigate = useNavigate()
  return (
    <DashboardAdmin
      onNavigate={(target) => {
        if (target === 'Data Karyawan') navigate('/admin/karyawan')
        else if (target === 'Data Pekerjaan') navigate('/admin/pekerjaan')
        else if (target === 'Penugasan') navigate('/admin/penugasan')
        else if (target === 'Penggajian Karyawan' || target === 'Gaji') navigate('/admin/gaji')
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
  } else if (path.startsWith('/admin/karyawan')) {
    activeItem = 'Data Karyawan'
  } else if (path.startsWith('/admin/pekerjaan')) {
    activeItem = 'Data Pekerjaan'
  } else if (path.startsWith('/admin/penugasan')) {
    activeItem = 'Penugasan'
  } else if (path.startsWith('/admin/gaji') || path.startsWith('/admin/detail-jam')) {
    activeItem = 'Penggajian Karyawan'
  } else if (path.startsWith('/admin/jam-kerja')) {
    activeItem = 'Rekap Jam Kerja Tim'
  } else if (path.startsWith('/admin/approval-absensi') || path.startsWith('/admin/verifikasi')) {
    activeItem = 'Approval Presensi'
  } else if (path.startsWith('/admin/approval-pengeluaran')) {
    activeItem = 'Approval Reimburse'
  } else if (path.startsWith('/admin/kontribusi')) {
    activeItem = 'Kontribusi Proyek'
  } else if (path.startsWith('/admin/rekap-absensi')) {
    activeItem = 'Rekap Absensi'
  } else if (path.startsWith('/admin/pengguna')) {
    activeItem = 'Manajemen Pengguna'
  } else if (path.startsWith('/admin/pemasukan')) {
    activeItem = 'Pemasukan & Kas Kantor'
  } else if (path.startsWith('/admin/pengeluaran')) {
    activeItem = 'Pengeluaran & Kuitansi'
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
    else if (item === 'Penggajian Karyawan') navigate('/admin/gaji')
    else if (item === 'Rekap Jam Kerja Tim') navigate('/admin/jam-kerja')
    else if (item === 'Approval Presensi') navigate('/admin/approval-absensi')
    else if (item === 'Approval Reimburse') navigate('/admin/approval-pengeluaran')
    else if (item === 'Kontribusi Proyek') navigate('/admin/kontribusi')
    else if (item === 'Rekap Absensi') navigate('/admin/rekap-absensi')
    else if (item === 'Manajemen Pengguna') navigate('/admin/pengguna')
    else if (item === 'Pemasukan & Kas Kantor') navigate('/admin/pemasukan')
    else if (item === 'Pengeluaran & Kuitansi' || item === 'Pengeluaran & Kwitansi') navigate('/admin/pengeluaran')
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

function navigateWorkerTarget(navigate, target) {
  if (target === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-tersedia')
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

function PekerjaanTersediaPage({ mappedUser }) {
  const navigate = useNavigate()
  return (
    <PekerjaanTersedia
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
    activeItem = 'Pekerjaan Tersedia'
  } else if (path.startsWith('/karyawan/pekerjaan-saya')) {
    activeItem = 'List Pekerjaan'
  } else if (path.startsWith('/karyawan/gaji')) {
    activeItem = 'Slip Gaji Pribadi'
  } else if (path.startsWith('/karyawan/rekap-absensi') || path.startsWith('/karyawan/absensi')) {
    activeItem = 'Absensi'
  } else if (path.startsWith('/karyawan/pengeluaran')) {
    activeItem = 'Pengeluaran Saya'
  } else if (path.startsWith('/karyawan/profil')) {
    activeItem = 'Profil Saya'
  } else if (path.startsWith('/karyawan/pengaturan')) {
    activeItem = 'Pengaturan'
  }

  function handleSelectMenuItem(item) {
    if (item === 'Dashboard') navigate('/karyawan')
    else if (item === 'Pekerjaan Tersedia') navigate('/karyawan/pekerjaan-tersedia')
    else if (item === 'List Pekerjaan' || item === 'Pekerjaan Saya') navigate('/karyawan/pekerjaan-saya')
    else if (item === 'Slip Gaji Pribadi') navigate('/karyawan/gaji')
    else if (item === 'Absensi' || item === 'Rekap Absensi' || item === 'Presensi & Jam Kerja') navigate('/karyawan/absensi')
    else if (item === 'Pengeluaran Saya') navigate('/karyawan/pengeluaran')
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
      workerPhoto={mappedUser?.foto_profil || user?.foto_profil || ''}
    >
      <Outlet />
    </PekerjaLayout>
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
              : Number.isInteger(Number(user.id)) &&
                Number(user.id) > 0 &&
                Number(user.id) < 100000
                ? Number(user.id)
                : 1,
        id_user: user.id_user || user.id || 1,
        nama: user.nama || user.name || 'Pengguna',
        peran: user.peran || user.role,
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
            <Route path="/admin/pengguna" element={<AdminPage />} />
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
              path="/admin/pemasukan"
              element={<PemasukanAdminPage currentUser={mappedUser} />}
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
              element={<PekerjaanTersediaPage mappedUser={mappedUser} />}
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
            <Route path="/karyawan/presensi" element={<PresensiKaryawanGajiPage currentUser={mappedUser} />} />
            <Route path="/karyawan/gaji" element={<GajiKaryawanPage currentUser={mappedUser} />} />
            <Route path="/karyawan/proyek" element={<Navigate to="/karyawan/pekerjaan-saya" replace />} />
            <Route
              path="/karyawan/pemasukan"
              element={<Navigate to="/karyawan/pengeluaran?tab=uang-kantor" replace />}
            />
            <Route
              path="/karyawan/pengeluaran"
              element={<PengeluaranKaryawanPage currentUser={mappedUser} />}
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