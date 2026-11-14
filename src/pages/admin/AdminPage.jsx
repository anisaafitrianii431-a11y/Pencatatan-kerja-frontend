import React from 'react';
import AdminRecap from '../../components/AdminRecap';
import AdminRiwayatTable from '../../components/AdminRiwayatTable';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AdminPage – wrapper for admin features with tab navigation.
 */
export default function AdminPage() {
  const { logout } = useAuth();

  return (
    <div className="app-layout">
      {/* Header with logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4)' }}>
        <h2 style={{ margin: 0 }}>🛠️ Admin Dashboard</h2>
        <button className="btn btn-outline btn-sm" onClick={logout} id="btn-logout-admin">
          🔒 Ganti Akun
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--sp-5)' }}>
        <AdminRecap />
        <div style={{ marginTop: 'var(--sp-6)' }}>
          <h3>🗂️ Riwayat Absensi Semua Pekerja</h3>
          <AdminRiwayatTable />
        </div>
      </div>
    </div>
  );
}
