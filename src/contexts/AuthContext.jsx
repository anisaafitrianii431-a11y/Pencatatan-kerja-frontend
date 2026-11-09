import { createContext, useContext, useState } from 'react';
import { users, karyawan } from '../data/mockData';

// ── Context ──────────────────────────────────────────────────
const AuthContext = createContext(null);

// ── Provider ─────────────────────────────────────────────────
export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(() => {
    const defaultWorker = users.find(user => user.role === 'pekerja');
    if (!defaultWorker) throw new Error('Tidak ada akun pekerja untuk membuka aplikasi.');

    return {
      ...defaultWorker,
      karyawan: karyawan.find(employee => employee.id_karyawan === defaultWorker.id_karyawan) ?? null,
    };
  });

  /**
   * Pilih role langsung (pengganti login)
   * role: 'admin' | 'pekerja'
   * Untuk pekerja, secara default pakai user pertama dengan role pekerja.
   * Nanti bisa diganti dengan pilihan nama pekerja.
   */
  function pilihRole(role, userId = null) {
    let user;
    if (userId) {
      user = users.find(u => u.id_user === userId);
    } else if (role === 'admin') {
      user = users.find(u => u.role === 'admin');
    } else {
      user = users.find(u => u.role === 'pekerja');
    }

    if (!user) return;

    // Tambahkan data karyawan jika role pekerja
    const dataKaryawan = user.id_karyawan
      ? karyawan.find(k => k.id_karyawan === user.id_karyawan)
      : null;

    setCurrentUser({ ...user, karyawan: dataKaryawan });
  }

  function logout() {
    setCurrentUser(null);
  }

  return (
    <AuthContext.Provider value={{ currentUser, pilihRole, logout, users, karyawan }}>
      {children}
    </AuthContext.Provider>
  );
}

// ── Hook ─────────────────────────────────────────────────────
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth harus dipakai di dalam AuthProvider');
  return ctx;
}
