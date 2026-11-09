import { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { useAbsensi } from '../../hooks/useAbsensi.jsx';
import { getPekerjaanAktifByKaryawan, pekerjaan } from '../../data/mockData';
import TimerClock from '../../components/TimerClock';
import AbsenCard from '../../components/AbsenCard';
import CameraCapture from '../../components/CameraCapture';

/**
 * AbsensiPage — Halaman utama absensi untuk Pekerja
 *
 * Alur:
 * 1. Pilih pekerjaan aktif yang ditugaskan
 * 2. Tombol Absen Masuk → buka CameraCapture (foto + GPS otomatis)
 * 3. Setelah foto diambil → simpan record dengan foto & alamat
 * 4. Tombol Absen Pulang → buka CameraCapture lagi → simpan jam_pulang
 */
export default function AbsensiPage() {
  const { currentUser } = useAuth();
  const {
    absenMasuk,
    absenPulang,
    getSesiAktif,
    getRiwayatByKaryawan,
  } = useAbsensi();

  const idKaryawan    = currentUser?.karyawan?.id_karyawan;
  const pekerjaanAktif = idKaryawan ? getPekerjaanAktifByKaryawan(idKaryawan) : [];

  const [selectedPekerjaanId, setSelectedPekerjaanId] = useState(
    pekerjaanAktif.length > 0 ? pekerjaanAktif[0].id_pekerjaan : null
  );
  // 'masuk' | 'pulang' | null
  const [kameraMode, setKameraMode] = useState(null);
  const [pesan, setPesan] = useState(null);

  const selectedPekerjaan = pekerjaan.find(p => p.id_pekerjaan === selectedPekerjaanId);
  const sesiAktif = idKaryawan && selectedPekerjaanId
    ? getSesiAktif(idKaryawan, selectedPekerjaanId)
    : null;

  const riwayat = idKaryawan
    ? getRiwayatByKaryawan(idKaryawan).filter(a => a.id_pekerjaan === selectedPekerjaanId)
    : [];

  function tampilPesan(type, text) {
    setPesan({ type, text });
    setTimeout(() => setPesan(null), 4000);
  }

  // ── Callback dari CameraCapture ───────────────────────────
  function handleCapture(bukti) {
    setKameraMode(null); // tutup modal

    if (kameraMode === 'masuk') {
      const result = absenMasuk(idKaryawan, selectedPekerjaanId, bukti);
      if (result.sukses) {
        tampilPesan('success', '✅ Absen masuk berhasil disimpan dengan foto lokasi!');
      } else {
        tampilPesan('error', result.pesan);
      }
    } else if (kameraMode === 'pulang') {
      if (!sesiAktif) return;
      absenPulang(sesiAktif.id_absensi, bukti);
      tampilPesan('success', '🏠 Absen pulang berhasil disimpan dengan foto lokasi!');
    }
  }

  return (
    <>
      {/* ── Modal Kamera (overlay) ──────────────────────── */}
      {kameraMode && (
        <CameraCapture
          mode={kameraMode}
          onCapture={handleCapture}
          onCancel={() => setKameraMode(null)}
        />
      )}

      <div style={pageStyle}>
        {/* ── Top Bar ─────────────────────────────────────── */}
        <div style={topBarStyle}>
          <div>
            <h2 style={{ margin: 0 }}>📍 Absensi</h2>
            <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>
              Halo, <strong style={{ color: 'var(--clr-text-primary)' }}>
                {currentUser?.karyawan?.nama}
              </strong>
            </p>
          </div>
        </div>

        {/* ── Jam Real-Time ───────────────────────────────── */}
        <div className="card" style={{ marginBottom: 'var(--sp-5)', textAlign: 'center', padding: 'var(--sp-8)' }}>
          <TimerClock size="lg" />
        </div>

        {/* ── Pilih Pekerjaan ─────────────────────────────── */}
        <div className="card" style={{ marginBottom: 'var(--sp-5)' }}>
          <div className="card-header">
            <h3>🗂️ Pilih Pekerjaan</h3>
          </div>

          {pekerjaanAktif.length === 0 ? (
            <div className="empty-state">
              <span className="icon">📭</span>
              <span>Anda belum ditugaskan ke pekerjaan aktif manapun.</span>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
              {pekerjaanAktif.map(pj => (
                <button
                  key={pj.id_pekerjaan}
                  id={`btn-pekerjaan-${pj.id_pekerjaan}`}
                  onClick={() => setSelectedPekerjaanId(pj.id_pekerjaan)}
                  style={pekerjaanCardStyle(selectedPekerjaanId === pj.id_pekerjaan)}
                >
                  <span style={{ fontSize: '1.5rem', marginTop: 2 }}>🏗️</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: 2 }}>
                      {pj.nama_pekerjaan}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                      Shift: {pj.shift_mulai} – {pj.shift_selesai}
                    </div>
                    {pj.latitude && (
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginTop: 2 }}>
                        📌 {pj.latitude}, {pj.longitude}
                      </div>
                    )}
                  </div>
                  {selectedPekerjaanId === pj.id_pekerjaan && (
                    <span style={{ color: 'var(--clr-primary)', fontSize: '1.2rem' }}>✓</span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* ── Tombol Absen ──────────────────────────────────── */}
        {selectedPekerjaanId && (
          <div className="card animate-fadein" style={{ marginBottom: 'var(--sp-5)' }}>
            <div className="card-header">
              <h3>📸 Rekam Kehadiran</h3>
              <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>
                {selectedPekerjaan?.nama_pekerjaan}
              </span>
            </div>

            {/* Pesan notifikasi */}
            {pesan && (
              <div style={pesanStyle(pesan.type)}>
                {pesan.text}
              </div>
            )}

            {/* Info cara kerja */}
            <div style={infoFiturStyle}>
              <span style={{ fontSize: '1.1rem' }}>📸</span>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', lineHeight: 1.5 }}>
                Absensi menggunakan <strong style={{ color: 'var(--clr-text-secondary)' }}>foto + lokasi GPS otomatis</strong>.
                Pastikan izin kamera &amp; lokasi sudah diaktifkan di browser.
              </span>
            </div>

            {sesiAktif ? (
              /* ── Sesi aktif → tampilkan info masuk + tombol pulang ── */
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)', marginTop: 'var(--sp-4)' }}>
                {/* Info sesi aktif */}
                <div style={sesiAktifBoxStyle}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)' }}>
                    <span style={dotGreenStyle} />
                    <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-secondary)' }}>
                      Sesi sedang berjalan
                    </span>
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>
                    Masuk pukul
                    <strong style={{ color: 'var(--clr-success)', marginLeft: 6, fontSize: 'var(--text-lg)' }}>
                      {sesiAktif.jam_masuk}
                    </strong>
                  </div>
                  {/* Foto masuk thumbnail */}
                  {sesiAktif.foto_masuk && (
                    <div style={{ marginTop: 'var(--sp-2)' }}>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', marginBottom: 4 }}>
                        📷 Foto masuk:
                      </div>
                      <img
                        src={sesiAktif.foto_masuk}
                        alt="Foto absen masuk"
                        style={{ width: 80, height: 60, objectFit: 'cover', borderRadius: 'var(--radius-sm)', border: '1px solid var(--clr-border)' }}
                      />
                    </div>
                  )}
                  {/* Lokasi masuk */}
                  {sesiAktif.lokasi_masuk?.alamat && (
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)', display: 'flex', gap: 4, alignItems: 'flex-start' }}>
                      <span>📍</span>
                      <span>{sesiAktif.lokasi_masuk.alamat}</span>
                    </div>
                  )}
                </div>

                <button
                  id="btn-absen-pulang"
                  className="btn btn-danger btn-lg btn-block"
                  onClick={() => setKameraMode('pulang')}
                >
                  📸 Absen Pulang (Foto + Lokasi)
                </button>
              </div>
            ) : (
              /* ── Belum ada sesi → tombol absen masuk ── */
              <div style={{ marginTop: 'var(--sp-4)' }}>
                <button
                  id="btn-absen-masuk"
                  className="btn btn-success btn-lg btn-block"
                  onClick={() => setKameraMode('masuk')}
                >
                  📸 Absen Masuk (Foto + Lokasi)
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Riwayat singkat ────────────────────────────────── */}
        {selectedPekerjaanId && riwayat.length > 0 && (
          <div className="card animate-fadein">
            <div className="card-header">
              <h3>📅 Riwayat Pekerjaan Ini</h3>
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                {riwayat.length} sesi
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-3)' }}>
              {riwayat.slice(0, 5).map(a => (
                <AbsenCard
                  key={a.id_absensi}
                  absensi={a}
                  pekerjaan={selectedPekerjaan}
                  showPulang={false}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const pageStyle = {
  padding: 'var(--sp-5)',
  maxWidth: 680,
  margin: '0 auto',
  width: '100%',
};
const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 'var(--sp-5)',
};
const pekerjaanCardStyle = (isActive) => ({
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-4)',
  background: isActive ? 'rgba(59,130,246,0.1)' : 'var(--clr-bg-surface)',
  border: `1px solid ${isActive ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  fontFamily: "'Inter', sans-serif",
  textAlign: 'left',
  transition: 'all var(--transition)',
  outline: 'none',
  width: '100%',
});
const pesanStyle = (type) => ({
  padding: 'var(--sp-3) var(--sp-4)',
  borderRadius: 'var(--radius-md)',
  marginBottom: 'var(--sp-4)',
  background: type === 'success' ? 'var(--clr-success-bg)' : 'var(--clr-danger-bg)',
  color: type === 'success' ? 'var(--clr-success)' : 'var(--clr-danger)',
  fontSize: 'var(--text-sm)',
  fontWeight: 500,
});
const infoFiturStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-3) var(--sp-4)',
  background: 'rgba(59,130,246,0.06)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(59,130,246,0.15)',
};
const sesiAktifBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--sp-2)',
  padding: 'var(--sp-4)',
  background: 'var(--clr-success-bg)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid rgba(16,185,129,0.3)',
};
const dotGreenStyle = {
  width: 8,
  height: 8,
  borderRadius: '50%',
  background: 'var(--clr-success)',
  display: 'inline-block',
  animation: 'pulse 2s infinite',
};
