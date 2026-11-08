import { useState, useRef } from 'react';

import { pekerjaan } from '../../data/mockData';

/**
 * LokasiKerjaPage — Form Admin untuk input koordinat & foto lokasi kerja
 *
 * Menyimpan latitude, longitude, dan foto_lokasi ke data pekerjaan.
 * Karena ini frontend-only, perubahan hanya di memori (state lokal).
 * Ketika backend siap, ganti handleSimpan() dengan axios.patch/put.
 */
export default function LokasiKerjaPage() {
  const [listPekerjaan, setListPekerjaan] = useState(pekerjaan);
  const [selectedId, setSelectedId] = useState(pekerjaan[0]?.id_pekerjaan ?? null);
  const [form, setForm] = useState({
    latitude: '',
    longitude: '',
    foto_lokasi: null,     // File object
    fotoPreview: null,     // Data URL untuk preview
  });
  const [pesan, setPesan] = useState(null);
  const fileInputRef = useRef();

  const selectedPekerjaan = listPekerjaan.find(p => p.id_pekerjaan === selectedId);

  // Saat memilih pekerjaan, isi form dengan data yang sudah ada
  function handlePilihPekerjaan(id) {
    const pj = listPekerjaan.find(p => p.id_pekerjaan === id);
    setSelectedId(id);
    setForm({
      latitude:    pj?.latitude    ?? '',
      longitude:   pj?.longitude   ?? '',
      foto_lokasi: null,
      fotoPreview: pj?.foto_lokasi ?? null,
    });
  }

  function handleChange(e) {
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));
  }

  function handleFoto(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      setForm(prev => ({
        ...prev,
        foto_lokasi: file,
        fotoPreview: ev.target.result,
      }));
    };
    reader.readAsDataURL(file);
  }

  function handleHapusFoto() {
    setForm(prev => ({ ...prev, foto_lokasi: null, fotoPreview: null }));
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  function handleSimpan(e) {
    e.preventDefault();
    if (!selectedId) return;
    if (!form.latitude || !form.longitude) {
      setPesan({ type: 'error', text: 'Latitude dan Longitude wajib diisi.' });
      setTimeout(() => setPesan(null), 3000);
      return;
    }

    // Update data pekerjaan (in-memory — ganti dengan API call)
    setListPekerjaan(prev =>
      prev.map(pj =>
        pj.id_pekerjaan === selectedId
          ? {
              ...pj,
              latitude:   form.latitude,
              longitude:  form.longitude,
              foto_lokasi: form.fotoPreview ?? pj.foto_lokasi,
            }
          : pj
      )
    );
    setPesan({ type: 'success', text: '✅ Lokasi kerja berhasil disimpan!' });
    setTimeout(() => setPesan(null), 3000);
  }

  // Buka Google Maps jika koordinat valid
  function handleLihatPeta() {
    if (form.latitude && form.longitude) {
      window.open(
        `https://maps.google.com/?q=${form.latitude},${form.longitude}`,
        '_blank'
      );
    }
  }

  return (
    <div style={pageStyle}>
      {/* ── Top Bar ─────────────────────────────────────────── */}
      <div style={topBarStyle}>
        <div>
          <h2 style={{ margin: 0 }}>📍 Lokasi Kerja</h2>
          <p style={{ margin: 0, fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>
            Input koordinat &amp; foto lokasi untuk setiap pekerjaan
          </p>
        </div>
      </div>
        

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.4fr', gap: 'var(--sp-5)', alignItems: 'start' }}>
        {/* ── Panel Kiri: Daftar Pekerjaan ─────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3>🗂️ Daftar Pekerjaan</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-2)' }}>
            {listPekerjaan.map(pj => (
              <button
                key={pj.id_pekerjaan}
                id={`btn-pj-${pj.id_pekerjaan}`}
                onClick={() => handlePilihPekerjaan(pj.id_pekerjaan)}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 4,
                  padding: 'var(--sp-3) var(--sp-4)',
                  background: selectedId === pj.id_pekerjaan
                    ? 'rgba(59,130,246,0.1)'
                    : 'var(--clr-bg-surface)',
                  border: `1px solid ${selectedId === pj.id_pekerjaan ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontFamily: "'Inter', sans-serif",
                  textAlign: 'left',
                  transition: 'all var(--transition)',
                  outline: 'none',
                }}
              >
                <span style={{ fontWeight: 600, color: 'var(--clr-text-primary)', fontSize: 'var(--text-sm)' }}>
                  {pj.nama_pekerjaan}
                </span>
                <span style={{ fontSize: 'var(--text-xs)', color: pj.latitude ? 'var(--clr-success)' : 'var(--clr-text-muted)' }}>
                  {pj.latitude ? `📌 ${pj.latitude}, ${pj.longitude}` : '⚠️ Belum ada koordinat'}
                </span>
              </button>
            ))}
          </div>
        </div>

        {/* ── Panel Kanan: Form ─────────────────────────────── */}
        <div className="card">
          <div className="card-header">
            <h3>✏️ Detail Lokasi</h3>
            {selectedPekerjaan && (
              <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                {selectedPekerjaan.nama_pekerjaan}
              </span>
            )}
          </div>

          {!selectedPekerjaan ? (
            <div className="empty-state">
              <span className="icon">👈</span>
              <span>Pilih pekerjaan terlebih dahulu</span>
            </div>
          ) : (
            <form onSubmit={handleSimpan} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--sp-4)' }}>

              {/* Pesan notifikasi */}
              {pesan && (
                <div style={{
                  padding: 'var(--sp-3) var(--sp-4)',
                  borderRadius: 'var(--radius-md)',
                  background: pesan.type === 'success' ? 'var(--clr-success-bg)' : 'var(--clr-danger-bg)',
                  color: pesan.type === 'success' ? 'var(--clr-success)' : 'var(--clr-danger)',
                  fontSize: 'var(--text-sm)',
                  fontWeight: 500,
                }}>
                  {pesan.text}
                </div>
              )}

              {/* Koordinat */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--sp-3)' }}>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="latitude">Latitude *</label>
                  <input
                    id="latitude"
                    name="latitude"
                    type="text"
                    placeholder="-6.914744"
                    value={form.latitude}
                    onChange={handleChange}
                  />
                </div>
                <div className="form-group" style={{ marginBottom: 0 }}>
                  <label htmlFor="longitude">Longitude *</label>
                  <input
                    id="longitude"
                    name="longitude"
                    type="text"
                    placeholder="107.609810"
                    value={form.longitude}
                    onChange={handleChange}
                  />
                </div>
              </div>

              {/* Tombol buka peta */}
              {form.latitude && form.longitude && (
                <button
                  type="button"
                  className="btn btn-outline btn-sm"
                  onClick={handleLihatPeta}
                  id="btn-lihat-peta"
                >
                  🗺️ Lihat di Google Maps
                </button>
              )}

              {/* Upload Foto */}
              <div className="form-group" style={{ marginBottom: 0 }}>
                <label>Foto Lokasi</label>
                <div
                  style={uploadZoneStyle}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {form.fotoPreview ? (
                    <img
                      src={form.fotoPreview}
                      alt="Preview lokasi"
                      style={{ width: '100%', maxHeight: 180, objectFit: 'cover', borderRadius: 'var(--radius-sm)' }}
                    />
                  ) : (
                    <>
                      <span style={{ fontSize: '2rem' }}>📷</span>
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--clr-text-muted)' }}>
                        Klik untuk unggah foto lokasi
                      </span>
                      <span style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                        JPG, PNG, maks 5MB
                      </span>
                    </>
                  )}
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleFoto}
                  id="input-foto-lokasi"
                />
                {form.fotoPreview && (
                  <button
                    type="button"
                    className="btn btn-outline btn-sm"
                    onClick={handleHapusFoto}
                    style={{ marginTop: 'var(--sp-2)' }}
                  >
                    🗑️ Hapus Foto
                  </button>
                )}
              </div>

              {/* Info tambahan */}
              <div style={infoBoxStyle}>
                <div>🏢 <strong>Shift:</strong> {selectedPekerjaan.shift_mulai} – {selectedPekerjaan.shift_selesai}</div>
                <div>📋 <strong>Deskripsi:</strong> {selectedPekerjaan.deskripsi}</div>
              </div>

              {/* Simpan */}
              <button
                type="submit"
                className="btn btn-primary btn-block"
                id="btn-simpan-lokasi"
              >
                💾 Simpan Lokasi
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const pageStyle = {
  padding: 'var(--sp-5)',
  maxWidth: 900,
  margin: '0 auto',
  width: '100%',
};
const topBarStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  marginBottom: 'var(--sp-5)',
};
const uploadZoneStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 'var(--sp-2)',
  padding: 'var(--sp-5)',
  background: 'var(--clr-bg-surface)',
  border: '2px dashed var(--clr-border)',
  borderRadius: 'var(--radius-md)',
  cursor: 'pointer',
  transition: 'border-color var(--transition)',
  minHeight: 120,
};
const infoBoxStyle = {
  display: 'flex',
  flexDirection: 'column',
  gap: 'var(--sp-2)',
  padding: 'var(--sp-4)',
  background: 'var(--clr-bg-surface)',
  borderRadius: 'var(--radius-md)',
  fontSize: 'var(--text-sm)',
  color: 'var(--clr-text-secondary)',
  lineHeight: 1.6,
};
