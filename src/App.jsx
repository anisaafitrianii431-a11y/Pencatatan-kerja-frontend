import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import LoginPage from './pages/auth/LoginPage';
import PengeluaranAdminPage from './pages/admin/PengeluaranAdminPage';
import PengeluaranKaryawanPage from './pages/karyawan/PengeluaranKaryawanPage';
import { AuthService, checkBackendStatus, safeFetchJson } from './services/api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(() => AuthService.getCurrentUser());
  const [activeTab, setActiveTab] = useState('pengeluaran');
  const [isBackendLive, setIsBackendLive] = useState(false);
  const [loadingSession, setLoadingSession] = useState(true);

  useEffect(() => {
    // Sinkronkan status koneksi backend dan sesi login pengguna
    checkBackendStatus().then(async (status) => {
      setIsBackendLive(status);
      if (status) {
        try {
          const { ok, data } = await safeFetchJson('/api/auth.php?action=me');
          if (ok && data && data.success && data.data) {
            setCurrentUser(data.data);
            AuthService.setCurrentUser(data.data);
          }
        } catch (err) {
          console.warn('Gagal memverifikasi sesi login:', err);
        }
      }
      setLoadingSession(false);
    });
  }, []);

  const handleLoginSuccess = (user) => {
    setCurrentUser(user);
    AuthService.setCurrentUser(user);
    setActiveTab('pengeluaran');
  };

  const handleLogout = async () => {
    try {
      await AuthService.logout();
    } catch (err) {
      console.warn('Gagal logout backend:', err);
    }
    setCurrentUser(null);
  };

  // 1. Jika pengguna BELUM LOGIN, tampilkan Halaman Login Resmi
  if (!currentUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess} 
        isBackendLive={isBackendLive} 
      />
    );
  }

  const isAdmin = currentUser.peran === 'admin';

  // 2. Jika SUDAH LOGIN, tampilkan layout Main Fitur (Sidebar dengan menu Pengeluaran)
  return (
    <div className="min-h-screen bg-slate-100/70 text-slate-800 flex flex-col lg:flex-row font-sans">
      {/* Sidebar Navigasi Utama */}
      <Sidebar 
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        currentUser={currentUser}
        onLogout={handleLogout}
        isBackendLive={isBackendLive}
      />

      {/* Area Konten Utama Halaman Pengeluaran */}
      <div className="flex-1 flex flex-col min-w-0">
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1 w-full">
          {isAdmin ? (
            <PengeluaranAdminPage currentUser={currentUser} />
          ) : (
            <PengeluaranKaryawanPage currentUser={currentUser} />
          )}
        </main>

        {/* Footer */}
        <footer className="bg-white border-t border-slate-200 py-3.5 px-6 text-center text-xs text-slate-400">
          © 2026 Sistem Pencatatan Pengeluaran Proyek & Reimbursement — CV Putra Anugrah Mandiri
        </footer>
      </div>
    </div>
  );
}
