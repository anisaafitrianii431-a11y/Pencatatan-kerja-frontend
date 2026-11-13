import React, { useState } from 'react';
import LokasiKerjaPage from './LokasiKerjaPage';
import AdminRecap from '../../components/AdminRecap';
import AdminRiwayatTable from '../../components/AdminRiwayatTable';
import { useAuth } from '../../contexts/AuthContext';

/**
 * AdminPage – wrapper for admin features with tab navigation.
 * Tabs: "Lokasi Kerja" (existing) and "Recap & Riwayat" (new).
 */
export default function AdminPage() {
  const { logout } = useAuth();
  const [activeTab, setActiveTab] = useState('lokasi'); // 'lokasi' | 'rekap'

  return (
    <div className="app-layout">
      {/* Header with logout */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--sp-4)' }}>
        <h2 style={{ margin: 0 }}>🛠️ Admin Dashboard</h2>
        <button className="btn btn-outline btn-sm" onClick={logout} id="btn-logout-admin">
          🔒 Ganti Akun
        </button>
      </div>

      {/* Tab navigation */}
      <div style={{ display: 'flex', gap: 'var(--sp-2)', padding: '0 var(--sp-4)' }}>
        <button
          className={`btn ${activeTab === 'lokasi' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('lokasi')}
        >
          📍 Lokasi Kerja
        </button>
        <button
          className={`btn ${activeTab === 'rekap' ? 'btn-primary' : 'btn-outline'}`}
          onClick={() => setActiveTab('rekap')}
        >
          📊 Recap & Riwayat
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: 'var(--sp-5)' }}>
        {activeTab === 'lokasi' && <LokasiKerjaPage />}
        {activeTab === 'rekap' && (
          <>
            <AdminRecap />
            <div style={{ marginTop: 'var(--sp-6)' }}>
              <h3>🗂️ Riwayat Absensi Semua Pekerja</h3>
              <AdminRiwayatTable />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
