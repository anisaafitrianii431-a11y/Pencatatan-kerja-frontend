import StatusBadge from './StatusBadge';
import { hitungDurasi } from '../data/mockData';

/**
 * AbsenCard — Kartu satu sesi absensi
 * Props:
 *   absensi   : object record absensi
 *   pekerjaan : object data pekerjaan (untuk nama)
 *   onPulang  : callback() dipanggil ketika tombol Absen Pulang ditekan
 *   showPulang: boolean — tampilkan tombol Absen Pulang atau tidak
 */
export default function AbsenCard({ absensi, pekerjaan, onPulang, showPulang = false }) {
  const durasi = hitungDurasi(absensi.jam_masuk, absensi.jam_pulang);
  const masihAktif = absensi.jam_pulang === null;

  return (
    <div
      style={{
        background: masihAktif
          ? 'linear-gradient(135deg, rgba(16,185,129,0.08), var(--clr-bg-card))'
          : 'var(--clr-bg-card)',
        border: `1px solid ${masihAktif ? 'rgba(16,185,129,0.4)' : 'var(--clr-border)'}`,
        borderRadius: 'var(--radius-lg)',
        padding: 'var(--sp-5)',
        display: 'flex',
        flexDirection: 'column',
        gap: 'var(--sp-3)',
        transition: 'all var(--transition)',
      }}
    >
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 2 }}>
            {absensi.tanggal}
          </div>
          <div style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontSize: 'var(--text-base)' }}>
            {pekerjaan?.nama_pekerjaan ?? '—'}
          </div>
        </div>
        <StatusBadge status={absensi.status_verifikasi} />
      </div>

      {/* Jam Masuk / Pulang */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 'var(--sp-3)' }}>
        <div style={statBoxStyle}>
          <span style={statLabel}>🕐 Masuk</span>
          <span style={statValue}>{absensi.jam_masuk ?? '—'}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabel}>🕔 Pulang</span>
          <span style={statValue}>{absensi.jam_pulang ?? (masihAktif ? '...' : '—')}</span>
        </div>
        <div style={statBoxStyle}>
          <span style={statLabel}>⏱ Durasi</span>
          <span style={statValue}>{durasi ? durasi.label : (masihAktif ? '...' : '—')}</span>
        </div>
      </div>

      {/* Tombol Absen Pulang */}
      {showPulang && masihAktif && onPulang && (
        <button
          className="btn btn-danger btn-block"
          onClick={onPulang}
        >
          🏠 Absen Pulang Sekarang
        </button>
      )}

      {/* Indikator aktif */}
      {masihAktif && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          fontSize: 'var(--text-xs)',
          color: 'var(--clr-success)',
        }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--clr-success)', display: 'inline-block', animation: 'pulse 2s infinite' }} />
          Sesi sedang berlangsung
        </div>
      )}
    </div>
  );
}

const statBoxStyle = {
  background: 'var(--clr-bg-surface)',
  borderRadius: 'var(--radius-md)',
  padding: '10px 12px',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
const statLabel = { fontSize: '0.7rem', color: 'var(--clr-text-muted)' };
const statValue = { fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--clr-text-primary)' };
