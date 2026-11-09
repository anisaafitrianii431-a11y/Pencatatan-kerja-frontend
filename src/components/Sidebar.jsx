import React, { useState } from 'react';
import { 
  Receipt, 
  Building2, 
  Shield, 
  User, 
  LogOut, 
  Menu, 
  X, 
  ChevronRight
} from 'lucide-react';

export default function Sidebar({ activeTab, setActiveTab, currentUser, onLogout, isBackendLive }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const isAdmin = currentUser?.peran === 'admin';

  // Daftar Fitur Utama yang Aktif
  // Catatan: Jika nanti fitur lain sudah selesai dibuat, cukup tambahkan objek baru ke dalam menuItems ini.
  const menuItems = [
    { 
      id: 'pengeluaran', 
      label: 'Pengeluaran', 
      icon: Receipt,
      badge: 'Aktif'
    }
  ];

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileOpen(false);
  };

  return (
    <>
      {/* ======================================================== */}
      {/* 1. TOP BAR KHUSUS LAYAR HP & TABLET (< lg)              */}
      {/* ======================================================== */}
      <header className="lg:hidden bg-slate-900 text-white border-b border-slate-800 px-4 py-3 sticky top-0 z-40 flex items-center justify-between shadow-md">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="p-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition focus:outline-none cursor-pointer"
            aria-label="Toggle Menu"
          >
            {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6 text-white" />}
          </button>

          <div className="flex items-center space-x-2">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              isAdmin ? 'bg-blue-600' : 'bg-emerald-600'
            }`}>
              <Receipt className="w-4 h-4 text-white" />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight text-white">CV Putra Anugrah</div>
              <div className="text-[10px] text-slate-400 flex items-center space-x-1">
                <span className={`w-1.5 h-1.5 rounded-full ${isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                <span>{isBackendLive ? 'Live Laragon' : 'Mode Lokal'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* User Role Badge Mobile */}
        <div className="flex items-center space-x-2">
          <div className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
            isAdmin ? 'bg-blue-900/80 text-blue-300 border border-blue-700/60' : 'bg-emerald-900/80 text-emerald-300 border border-emerald-700/60'
          }`}>
            {currentUser?.peran}
          </div>
          <button
            onClick={onLogout}
            title="Keluar"
            className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-800 rounded-lg transition"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Backdrop Gelap untuk Mobile Drawer */}
      {mobileOpen && (
        <div 
          onClick={() => setMobileOpen(false)}
          className="lg:hidden fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-40 transition-opacity"
        />
      )}

      {/* ======================================================== */}
      {/* 2. SIDEBAR VERTIKAL UTAMA (DESKTOP & DRAWER MOBILE)      */}
      {/* ======================================================== */}
      <aside className={`
        fixed lg:sticky top-0 left-0 z-50 h-screen w-64 sm:w-72 bg-slate-900 text-white flex flex-col justify-between border-r border-slate-800/80 shadow-2xl transition-transform duration-300 ease-in-out
        ${mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        
        {/* Bagian Atas: Brand & Identitas */}
        <div>
          <div className="p-5 border-b border-slate-800/80 flex items-center justify-between">
            <div className="flex items-center space-x-3 group">
              <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-lg transition-transform group-hover:scale-105 ${
                isAdmin 
                  ? 'bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-600/30 ring-2 ring-blue-500/20' 
                  : 'bg-gradient-to-tr from-emerald-600 to-teal-600 shadow-emerald-600/30 ring-2 ring-emerald-500/20'
              }`}>
                <Receipt className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-sm tracking-tight text-white leading-tight">
                  CV Putra Anugrah
                </h1>
                <div className="text-[11px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                  <span className={`inline-block w-2 h-2 rounded-full ${isBackendLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
                  <span>{isBackendLive ? 'MySQL Live (Laragon)' : 'Mode Lokal'}</span>
                </div>
              </div>
            </div>

            {/* Tombol Close Mobile */}
            <button
              onClick={() => setMobileOpen(false)}
              className="lg:hidden p-1.5 text-slate-400 hover:text-white rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Label Navigasi Fitur */}
          <div className="px-5 pt-5 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest flex items-center justify-between">
            <span>NAVIGASI FITUR</span>
          </div>

          {/* Daftar Menu Vertikal (Hanya menampilkan Pengeluaran) */}
          <nav className="px-3.5 space-y-1.5 overflow-y-auto max-h-[calc(100vh-210px)]">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;

              return (
                <button
                  key={item.id}
                  onClick={() => handleSelectTab(item.id)}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl font-medium text-xs sm:text-sm transition-all text-left group cursor-pointer ${
                    isActive
                      ? isAdmin
                        ? 'bg-blue-600 text-white font-bold shadow-lg shadow-blue-600/30'
                        : 'bg-emerald-600 text-white font-bold shadow-lg shadow-emerald-600/30'
                      : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                  }`}
                >
                  <div className="flex items-center space-x-3 truncate">
                    <Icon className={`w-4 h-4 flex-shrink-0 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-white' : 'text-emerald-400'
                    }`} />
                    <span className="truncate">{item.label}</span>
                  </div>

                  <div className="flex items-center space-x-1.5 flex-shrink-0">
                    {item.badge && (
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      }`}>
                        {item.badge}
                      </span>
                    )}
                    {isActive && (
                      <ChevronRight className="w-4 h-4 text-white/80 flex-shrink-0" />
                    )}
                  </div>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Bagian Bawah: Profil Pengguna & Logout */}
        <div className="p-4 border-t border-slate-800/80 bg-slate-950/60">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center space-x-3 truncate">
              {/* Avatar User */}
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-xs text-white flex-shrink-0 shadow-md ${
                isAdmin 
                  ? 'bg-blue-600 ring-2 ring-blue-500/30' 
                  : 'bg-emerald-600 ring-2 ring-emerald-500/30'
              }`}>
                {currentUser?.nama?.charAt(0).toUpperCase() || 'U'}
              </div>

              {/* Identitas User */}
              <div className="truncate">
                <div className="text-xs font-bold text-white truncate" title={currentUser?.nama}>
                  {currentUser?.nama || (isAdmin ? 'Administrator' : 'Karyawan')}
                </div>
                <div className="text-[10px] text-slate-400 flex items-center space-x-1.5 mt-0.5">
                  <span className={`inline-flex items-center px-1.5 py-0.2 rounded text-[9px] font-extrabold uppercase tracking-wider ${
                    isAdmin ? 'bg-blue-900/90 text-blue-300' : 'bg-emerald-900/90 text-emerald-300'
                  }`}>
                    {isAdmin ? <Shield className="w-2.5 h-2.5 mr-0.5" /> : <User className="w-2.5 h-2.5 mr-0.5" />}
                    <span>{currentUser?.peran}</span>
                  </span>
                  <span className="truncate text-slate-400">{currentUser?.jabatan}</span>
                </div>
              </div>
            </div>

            {/* Tombol Logout */}
            <button
              onClick={onLogout}
              title="Keluar dari Akun"
              className="p-2 text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-xl transition flex-shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>

      </aside>
    </>
  );
}

