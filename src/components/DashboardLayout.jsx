import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Clock,
  Wallet,
  ChevronDown,
  Menu,
  X,
  Layers,
  Receipt,
  Users,
  Crown,
  UserRound,
} from 'lucide-react';
import { useAuth } from '../auth/useAuth.js';

export default function DashboardLayout({ currentUser, currentRoute, children }) {
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [switchError, setSwitchError] = useState('');
  const [switchingUser, setSwitchingUser] = useState(false);

  const isAdmin = currentUser?.peran === 'admin';
  const { role, sub } = currentRoute;

  const handleSwitchAccount = async () => {
    setSwitchError('');
    setSwitchingUser(true);
    try {
      await signOut();
      navigate('/login', { replace: true });
    } catch (error) {
      setSwitchError(error.message || 'Tidak dapat keluar untuk mengganti akun.');
    } finally {
      setSwitchingUser(false);
    }
  };

  // Navigasi aktif
  const isDashboardActive = role === 'home' || (!role && !sub);

  const adminNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '#/',
      isActive: isDashboardActive,
    },
    {
      id: 'approval-absensi',
      label: 'Approval Presensi',
      icon: Clock,
      href: '#/admin/approval-absensi',
      isActive: sub === 'approval-absensi' || sub === 'verifikasi',
    },
    {
      id: 'approval-pengeluaran',
      label: 'Approval Reimburse & Nota',
      icon: Receipt,
      href: '#/admin/approval-pengeluaran',
      isActive: sub === 'approval-pengeluaran',
    },
    {
      id: 'gaji',
      label: 'Penggajian Karyawan',
      icon: Wallet,
      href: '#/admin/gaji',
      isActive: sub === 'gaji' || sub === 'detail-jam',
    },
    {
      id: 'kontribusi',
      label: 'Kontribusi Proyek',
      icon: Layers,
      href: '#/admin/kontribusi',
      isActive: sub === 'kontribusi' || sub === 'proyek',
    },
    {
      id: 'jam-kerja',
      label: 'Rekap Jam Kerja Tim',
      icon: Users,
      href: '#/admin/jam-kerja',
      isActive: sub === 'jam-kerja' || sub === 'rekap',
    },
  ];

  const karyawanNavItems = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
      href: '#/',
      isActive: isDashboardActive,
    },
    {
      id: 'presensi',
      label: 'Presensi & Jam Kerja',
      icon: Clock,
      href: '#/karyawan/presensi',
      isActive: sub === 'presensi',
    },
    {
      id: 'gaji',
      label: 'Slip Gaji Pribadi',
      icon: Wallet,
      href: '#/karyawan/gaji',
      isActive: sub === 'gaji',
    },
    {
      id: 'proyek',
      label: 'Progres Proyek',
      icon: Layers,
      href: '#/karyawan/proyek',
      isActive: sub === 'proyek' || sub === 'rekap',
    },
  ];

  const navItems = isAdmin ? adminNavItems : karyawanNavItems;

  return (
    <div className="min-h-screen bg-[#f3f4f8] flex font-sans text-slate-800">
      
      {/* ======================================================== */}
      {/* 1. SIDEBAR KIRI BERSIH & FOKUS FITUR AKTIF              */}
      {/* ======================================================== */}
      
      {/* Backdrop overlay untuk mobile */}
      {mobileSidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setMobileSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed lg:sticky top-0 left-0 h-screen w-64 bg-white border-r border-slate-200/80 z-50 flex flex-col justify-between p-6 transition-transform duration-300 ease-in-out ${
          mobileSidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div>
          {/* Logo Brand: Stylized Badge + PencatatanKerja */}
          <div className="flex items-center justify-between pb-6 mb-6 border-b border-slate-100">
            <a href="#/" className="flex items-center space-x-2.5 no-underline">
              <div
                className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-black text-sm shadow-sm"
                style={{ backgroundColor: '#b81d52' }}
              >
                PK
              </div>
              <div>
                <span className="text-lg font-black tracking-tight text-slate-800">
                  Pencatatan<span style={{ color: '#b81d52' }}>Kerja</span>
                </span>
                <div className="text-[9px] font-semibold tracking-wider text-slate-400 uppercase leading-none">
                  Sistem Presensi & Gaji
                </div>
              </div>
            </a>

            {/* Close button for mobile */}
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigasi: Menu Utama Aktif */}
          <div>
            <div className="text-[10px] font-bold tracking-widest text-slate-400 uppercase px-3 mb-2.5">
              MENU UTAMA
            </div>
            <nav className="space-y-1.5">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = item.isActive;
                return (
                  <a
                    key={item.id}
                    href={item.href}
                    onClick={() => setMobileSidebarOpen(false)}
                    className={`flex items-center space-x-3 px-3 py-2.5 rounded-xl text-xs font-bold transition-all relative no-underline ${
                      active
                        ? 'text-white shadow-sm'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                    }`}
                    style={
                      active
                        ? {
                            backgroundColor: '#b81d52',
                            boxShadow: '0 4px 12px -2px rgba(184, 29, 82, 0.35)',
                          }
                        : {}
                    }
                  >
                    <Icon className={`w-4 h-4 ${active ? 'text-white' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </a>
                );
              })}
            </nav>
          </div>
        </div>

        {/* Profil akun aktif */}
        <div className="pt-4 border-t border-slate-100">
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5 truncate">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold shrink-0"
                style={{ backgroundColor: isAdmin ? '#b81d52' : '#0284c7' }}
              >
                {isAdmin ? <Crown className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}
              </div>
              <div className="truncate">
                <div className="text-xs font-bold text-slate-800 truncate">{currentUser?.nama}</div>
                <div className="text-[10px] text-slate-400 truncate capitalize">{currentUser?.jabatan || currentUser?.peran}</div>
              </div>
            </div>
          </div>
        </div>
      </aside>

      {/* ======================================================== */}
      {/* 2. AREA KONTEN UTAMA                                    */}
      {/* ======================================================== */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* Top Header Bar Ringkas & Bersih */}
        <header className="sticky top-0 bg-white/95 backdrop-blur-md border-b border-slate-200/80 z-30 px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
          
          {/* Mobile hamburger menu toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileSidebarOpen(true)}
              className="lg:hidden p-2 rounded-xl text-slate-600 hover:bg-slate-100 cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="text-xs sm:text-sm font-semibold text-slate-500 hidden sm:block">
              {isAdmin ? 'Portal Administrasi & Verifikasi' : 'Portal Pekerja Lapangan'}
            </div>
          </div>

          {/* Right Header: User Profile Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowUserDropdown(!showUserDropdown)}
              className="flex items-center gap-2.5 p-1.5 sm:px-3 rounded-full hover:bg-slate-100 transition cursor-pointer border border-slate-100"
            >
              <div
                className="w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs shadow-sm"
                style={{
                  backgroundColor: isAdmin ? '#b81d52' : '#0284c7',
                }}
              >
                {isAdmin ? <Crown className="w-4 h-4" /> : <UserRound className="w-4 h-4" />}
              </div>
              <div className="hidden sm:block text-left">
                <div className="text-xs font-bold text-slate-800 leading-tight">
                  {currentUser?.nama || 'User'}
                </div>
                <div className="text-[10px] text-slate-400 font-medium leading-none mt-0.5">
                  {currentUser?.jabatan || (isAdmin ? 'Admin' : 'Pekerja')}
                </div>
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
            </button>

            {/* User Dropdown Menu */}
            {showUserDropdown && (
              <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-100 p-2 z-50">
                <div className="px-3 py-2 border-b border-slate-100 mb-1">
                  <p className="text-xs font-bold text-slate-800">{currentUser?.nama}</p>
                  <p className="text-[10px] text-slate-400 capitalize">{currentUser?.peran}</p>
                </div>
                <button
                  type="button"
                  onClick={handleSwitchAccount}
                  disabled={switchingUser}
                  className="w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 cursor-pointer"
                >
                  {switchingUser ? 'Keluar...' : 'Keluar dan masuk dengan akun lain'}
                </button>
                {switchError && (
                  <p role="alert" className="px-3 py-2 text-[11px] text-rose-600">
                    {switchError}
                  </p>
                )}
                <div className="my-1 border-t border-slate-100" />
                <a
                  href="#/"
                  onClick={() => setShowUserDropdown(false)}
                  className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                >
                  Dashboard Utama
                </a>
                {isAdmin ? (
                  <>
                    <a
                      href="#/admin/verifikasi"
                      onClick={() => setShowUserDropdown(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                    >
                      Pusat Approval
                    </a>
                    <a
                      href="#/admin/gaji"
                      onClick={() => setShowUserDropdown(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                    >
                      Penggajian Karyawan
                    </a>
                  </>
                ) : (
                  <>
                    <a
                      href="#/karyawan/presensi"
                      onClick={() => setShowUserDropdown(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                    >
                      Presensi & Jam Kerja
                    </a>
                    <a
                      href="#/karyawan/gaji"
                      onClick={() => setShowUserDropdown(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                    >
                      Slip Gaji Pribadi
                    </a>
                    <a
                      href="#/karyawan/proyek"
                      onClick={() => setShowUserDropdown(false)}
                      className="block px-3 py-2 rounded-xl text-xs font-medium text-slate-600 hover:bg-slate-50 no-underline"
                    >
                      Progres Proyek
                    </a>
                  </>
                )}
              </div>
            )}
          </div>

        </header>

        {/* Konten Halaman */}
        <main className="p-4 sm:p-6 lg:p-8 flex-1 overflow-x-hidden">
          {children}
        </main>

      </div>

    </div>
  );
}
