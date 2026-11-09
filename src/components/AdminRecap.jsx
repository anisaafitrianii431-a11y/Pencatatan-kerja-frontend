import React from 'react';
import { useAdminStats } from '../hooks/useAdminStats';
/**
 * AdminRecap – displays three summary cards for the admin dashboard.
 *   • Total jam kerja (hanya yang sudah disetujui)
 *   • Absensi hari ini (jumlah masuk/pulang)
 *   • Pending approvals (status_verifikasi = 'menunggu')
 */
export default function AdminRecap() {
  const { totalJam, hariIni, pending } = useAdminStats();

  const cardStyle = {
    background: 'var(--clr-bg-surface)',
    border: '1px solid var(--clr-border)',
    borderRadius: 'var(--radius-md)',
    padding: 'var(--sp-5)',
    textAlign: 'center',
    boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
    animation: 'fadeIn 0.3s ease',
  };

  const valueStyle = { fontSize: 'var(--text-2xl)', fontWeight: 600, color: 'var(--clr-text-primary)' };
  const labelStyle = { fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px,1fr))', gap: 'var(--sp-4)' }}>
      <div style={cardStyle} id="admin-recap-total-jam">
        <div style={valueStyle}>{totalJam.label}</div>
        <div style={labelStyle}>Total Jam Kerja (disetujui)</div>
      </div>
      <div style={cardStyle} id="admin-recap-hari-ini">
        <div style={valueStyle}>{hariIni}</div>
        <div style={labelStyle}>Absensi Hari Ini</div>
      </div>
      <div style={cardStyle} id="admin-recap-pending">
        <div style={valueStyle}>{pending}</div>
        <div style={labelStyle}>Pending Approvals</div>
      </div>
    </div>
  );
}
