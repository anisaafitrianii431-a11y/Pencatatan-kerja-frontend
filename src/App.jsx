import React from 'react';
import { BrowserRouter, Navigate, NavLink, Route, Routes, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { AbsensiProvider } from './hooks/useAbsensi.jsx';
import AbsensiPage from './pages/pekerja_absen/AbsensiPage';
import LokasiKerjaPage from './pages/admin-absen/LokasiKerjaPage';
import AdminDashboard from './pages/admin-absen/AdminDashboard';
import WorkerDashboard from './pages/pekerja_absen/WorkerDashboard';

// Fitur Pengeluaran & Kwitansi
import PengeluaranAdminPage from './pages/admin/PengeluaranAdminPage';
import PengeluaranKaryawanPage from './pages/karyawan/PengeluaranKaryawanPage';

import './index.css';
import './App.css';

const todayLabel = new Intl.DateTimeFormat('id-ID', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
}).format(new Date());

function AppShell() {
  const { currentUser } = useAuth();

  if (currentUser.role === 'admin') return <AdminLayout />;
  if (currentUser.role === 'pekerja') return <PekerjaLayout />;

  return null;
}

function AdminLayout() {
  const { currentUser, pilihRole, users } = useAuth();
  const mappedUser = {
    ...currentUser,
    peran: 'admin',
    nama: currentUser.nama || 'Administrator'
  };

  return (
    <div className="admin-layout">
      <AppTopbar
        role="admin"
        nama={currentUser.nama}
        currentUserId={currentUser.id_user}
        users={users}
        onSelectRole={pilihRole}
      />
      <div className="admin-body">
        <AppSidebar role="admin" navLinks={[
          { to: '/admin', label: '▤  Riwayat Sesi' },
          { to: '/admin/lokasi', label: '📍 Lokasi Kerja' },
          { to: '/admin/pengeluaran', label: '🧾 Pengeluaran & Kwitansi' },
        ]} />
        <div className="admin-workspace">
          <main className="admin-content">
            <Routes>
              <Route path="/" element={<Navigate to="/admin" replace />} />
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/lokasi" element={<LokasiKerjaPage />} />
              <Route path="/admin/pengeluaran" element={<div className="p-4 sm:p-6"><PengeluaranAdminPage currentUser={mappedUser} /></div>} />
              <Route path="/admin/*" element={<Navigate to="/admin" replace />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

function PekerjaLayout() {
  const { currentUser, pilihRole, users } = useAuth();
  const mappedUser = {
    ...currentUser,
    peran: 'karyawan',
    nama: currentUser.karyawan?.nama ?? currentUser.nama,
    id_karyawan: currentUser.id_karyawan || currentUser.karyawan?.id_karyawan || 1
  };

  return (
    <div className="worker-layout">
      <AppTopbar
        role="pekerja"
        nama={currentUser.karyawan?.nama ?? currentUser.nama}
        currentUserId={currentUser.id_user}
        users={users}
        onSelectRole={pilihRole}
      />
      <div className="worker-body">
        <AppSidebar role="pekerja" navLinks={[
          { to: '/pekerja', label: '▦  Dashboard' },
          { to: '/pekerja/absensi', label: '◷  Absensi Saya' },
          { to: '/pekerja/pengeluaran', label: '🧾 Pengeluaran Saya' },
        ]} />
        <main className="worker-content">
          <Routes>
            <Route path="/" element={<Navigate to="/pekerja" replace />} />
            <Route path="/pekerja" element={<WorkerDashboard />} />
            <Route path="/pekerja/absensi" element={<AbsensiPage />} />
            <Route path="/pekerja/pengeluaran" element={<div className="p-4 sm:p-6"><PengeluaranKaryawanPage currentUser={mappedUser} /></div>} />
            <Route path="/pekerja/riwayat" element={<Navigate to="/pekerja" replace />} />
            <Route path="*" element={<Navigate to="/pekerja/absensi" replace />} />
          </Routes>
        </main>
      </div>
    </div>
  );
}

function AppSidebar({ role, navLinks }) {
  const isAdmin = role === 'admin';
  return (
    <aside className={`app-sidebar ${isAdmin ? 'admin-sidebar' : 'worker-sidebar'}`}>
      <span className="sidebar-section-label">Menu Utama</span>
      <nav className="sidebar-nav" aria-label="Navigasi halaman">
        {navLinks.map((link) => (
          <SideNavLink key={link.to} to={link.to}>
            {link.label}
          </SideNavLink>
        ))}
      </nav>
    </aside>
  );
}

function AppTopbar({ role, nama, currentUserId, users, onSelectRole }) {
  const navigate = useNavigate();
  const isAdmin = role === 'admin';
  const pekerjaUsers = users.filter((user) => user.role === 'pekerja');
  const switchRole = (nextRole, userId) => {
    onSelectRole(nextRole, userId);
    navigate(nextRole === 'admin' ? '/admin' : '/pekerja');
  };

  return (
    <header className={`admin-topbar app-topbar ${isAdmin ? 'admin-app-topbar' : 'worker-app-topbar'}`}>
      <div className="admin-topbar-title">
        <span className="sidebar-brand-mark">PK</span>
        <div>
          <strong>Sistem Pencatatan Kerja</strong>
          <span>{isAdmin ? 'Panel Administrasi' : 'Area Pekerja'}</span>
        </div>
      </div>

      <div className="admin-topbar-actions">
        <div className="role-switch" aria-label="Pindah peran">
          <button
            type="button"
            className={isAdmin ? 'role-switch-button active' : 'role-switch-button'}
            aria-pressed={isAdmin}
            onClick={() => switchRole('admin')}
          >
            Admin
          </button>
          <button
            type="button"
            className={!isAdmin ? 'role-switch-button active' : 'role-switch-button'}
            aria-pressed={!isAdmin}
            onClick={() => switchRole('pekerja', isAdmin ? undefined : currentUserId)}
          >
            Pekerja
          </button>
        </div>
        {!isAdmin && (
          <label className="topbar-worker-select-label">
            <span className="sr-only">Pilih pekerja</span>
            <select
              className="topbar-worker-select"
              value={currentUserId}
              onChange={(event) => switchRole('pekerja', Number(event.target.value))}
            >
              {pekerjaUsers.map((user) => (
                <option key={user.id_user} value={user.id_user}>{user.nama}</option>
              ))}
            </select>
          </label>
        )}
        {isAdmin && <span className="admin-today">{todayLabel}</span>}
        <span className="admin-user">
          <span className="admin-avatar">{nama?.charAt(0)?.toUpperCase() ?? (isAdmin ? 'A' : 'P')}</span>
          <span>
            <strong>{nama}</strong>
            <small>{isAdmin ? 'Administrator' : 'Pekerja'}</small>
          </span>
        </span>
      </div>
    </header>
  );
}

function SideNavLink({ to, children }) {
  return (
    <NavLink
      to={to}
      end={to === '/admin' || to === '/pekerja'}
      className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}
    >
      {children}
    </NavLink>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AbsensiProvider>
          <AppShell />
        </AbsensiProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
