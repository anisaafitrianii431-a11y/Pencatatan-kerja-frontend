import { useAuth } from '../contexts/AuthContext';

/**
 * RoleSwitcher — Pengganti halaman login
 * Menampilkan dua pilihan: Admin atau Pekerja
 * Jika role Pekerja dipilih, tampilkan dropdown pilih nama karyawan
 */
export default function RoleSwitcher() {
  const { pilihRole, users } = useAuth();
  const listPekerja = users.filter(u => u.role === 'pekerja');

  return (
    <div style={containerStyle}>
      {/* Branding */}
      <div style={{ textAlign: 'center', marginBottom: 'var(--sp-10)' }}>
        <div style={iconStyle}>📋</div>
        <h1 style={{ marginBottom: 'var(--sp-2)', fontSize: 'var(--text-2xl)' }}>
          Sistem Pencatatan Kerja
        </h1>
        <p style={{ color: 'var(--clr-text-muted)' }}>
          Pilih akses untuk melanjutkan
        </p>
      </div>

      {/* Kartu pilih role */}
      <div style={cardsWrapperStyle}>
        {/* Admin Card */}
        <button
          id="btn-role-admin"
          style={roleCardStyle('#3b82f6')}
          onClick={() => pilihRole('admin')}
        >
          <span style={{ fontSize: '2.5rem' }}>🛠️</span>
          <span style={{ fontWeight: 700, fontSize: 'var(--text-xl)' }}>Admin</span>
          <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)', textAlign: 'center' }}>
            Kelola lokasi kerja, pekerjaan,<br />persetujuan &amp; laporan
          </span>
        </button>

        {/* Pekerja Cards — satu per pekerja */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', flex: 1 }}>
          <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)', fontWeight: 500 }}>
            👷 Masuk sebagai Pekerja:
          </div>
          {listPekerja.map(u => (
            <button
              key={u.id_user}
              id={`btn-pekerja-${u.id_user}`}
              style={workerCardStyle}
              onClick={() => pilihRole('pekerja', u.id_user)}
            >
              <span style={{ fontSize: '1.5rem' }}>👤</span>
              <div style={{ textAlign: 'left' }}>
                <div style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontSize: 'var(--text-sm)' }}>
                  {u.nama}
                </div>
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                  Pekerja
                </div>
              </div>
              <span style={{ marginLeft: 'auto', color: 'var(--clr-text-muted)' }}>→</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const containerStyle = {
  minHeight: '100vh',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--sp-6)',
  background: 'radial-gradient(ellipse at top, rgba(59,130,246,0.08) 0%, var(--clr-bg-base) 70%)',
};

const iconStyle = {
  fontSize: '3.5rem',
  marginBottom: 'var(--sp-4)',
  filter: 'drop-shadow(0 0 20px rgba(59,130,246,0.5))',
};

const cardsWrapperStyle = {
  display: 'flex',
  gap: 'var(--sp-5)',
  width: '100%',
  maxWidth: 640,
  alignItems: 'flex-start',
};

const roleCardStyle = (accentColor) => ({
  flex: 1,
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-8) var(--sp-6)',
  background: `linear-gradient(135deg, ${accentColor}18, var(--clr-bg-card))`,
  border: `1px solid ${accentColor}40`,
  borderRadius: 'var(--radius-xl)',
  cursor: 'pointer',
  transition: 'all var(--transition)',
  fontFamily: "'Inter', sans-serif",
  color: 'var(--clr-text-primary)',
  outline: 'none',
  boxShadow: 'var(--shadow-sm)',
  minHeight: 180,
  justifyContent: 'center',
  /* hover via JS → pakai CSS pseudo class sebagai gantinya */
});

const workerCardStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-3) var(--sp-4)',
  background: 'var(--clr-bg-card)',
  border: '1px solid var(--clr-border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'all var(--transition)',
  fontFamily: "'Inter', sans-serif",
  color: 'var(--clr-text-primary)',
  outline: 'none',
  width: '100%',
};
