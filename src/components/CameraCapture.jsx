import { useRef, useState, useEffect, useCallback } from 'react';

/**
 * CameraCapture — Modal kamera + GPS untuk absensi foto
 *
 * Alur:
 *  1. Minta izin kamera & lokasi secara bersamaan
 *  2. Tampilkan preview video live
 *  3. Ambil foto (snapshot dari video)
 *  4. Reverse geocoding → alamat teks (via Nominatim/OpenStreetMap, gratis)
 *  5. Tampilkan overlay: foto + alamat + koordinat
 *  6. Tombol "Gunakan Foto" → kirim { foto, lokasi } ke parent
 *
 * Props:
 *   mode       : 'masuk' | 'pulang'
 *   onCapture  : function({ foto: string, lokasi: { lat, lng, alamat } })
 *   onCancel   : function()
 */
export default function CameraCapture({ mode = 'masuk', onCapture, onCancel }) {
  const videoRef   = useRef(null);
  const canvasRef  = useRef(null);
  const streamRef  = useRef(null);

  const [fase, setFase]         = useState('loading');  // loading | kamera | preview | error
  const [errorMsg, setErrorMsg] = useState('');
  const [snapshot, setSnapshot] = useState(null);       // dataURL
  const [lokasi, setLokasi]     = useState(null);       // { lat, lng, alamat }
  const [loadingLokasi, setLoadingLokasi] = useState(false);
  const [facingMode, setFacingMode] = useState('user'); // 'user' = depan, 'environment' = belakang

  // ── Mulai kamera ───────────────────────────────────────────
  const startCamera = useCallback(async (facing = facingMode) => {
    // Hentikan stream lama jika ada
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setFase('loading');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setFase('kamera');
    } catch (err) {
      console.error('Camera error:', err);
      setErrorMsg(
        err.name === 'NotAllowedError'
          ? 'Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser.'
          : `Kamera tidak dapat diakses: ${err.message}`
      );
      setFase('error');
    }
  }, [facingMode]);

  useEffect(() => {
    startCamera(facingMode);
    // Cleanup saat unmount
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // ── Ambil lokasi GPS + reverse geocoding ──────────────────
  async function ambilLokasi() {
    if (!navigator.geolocation) {
      return { lat: null, lng: null, alamat: 'Geolokasi tidak didukung perangkat ini' };
    }
    return new Promise(resolve => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = pos.coords.latitude.toFixed(6);
          const lng = pos.coords.longitude.toFixed(6);
          // Reverse geocoding via Nominatim (OpenStreetMap) — gratis, tanpa API key
          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&accept-language=id`,
              { headers: { 'Accept-Language': 'id' } }
            );
            const data = await res.json();
            const alamat = data.display_name ?? `${lat}, ${lng}`;
            resolve({ lat: parseFloat(lat), lng: parseFloat(lng), alamat });
          } catch {
            resolve({ lat: parseFloat(lat), lng: parseFloat(lng), alamat: `${lat}, ${lng}` });
          }
        },
        (err) => {
          resolve({ lat: null, lng: null, alamat: 'Lokasi tidak dapat diakses' });
        },
        { enableHighAccuracy: true, timeout: 10000 }
      );
    });
  }

  // ── Ambil foto (snapshot dari video) ─────────────────────
  async function handleAmbilFoto() {
    if (!videoRef.current || !canvasRef.current) return;
    const video  = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width  = video.videoWidth  || 1280;
    canvas.height = video.videoHeight || 720;

    const ctx = canvas.getContext('2d');

    // Flip horizontal jika pakai kamera depan
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }
    ctx.drawImage(video, 0, 0);

    const dataURL = canvas.toDataURL('image/jpeg', 0.8);
    setSnapshot(dataURL);

    // Hentikan kamera setelah foto
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    setFase('preview');
    setLoadingLokasi(true);

    // Ambil lokasi secara paralel
    const lokasiData = await ambilLokasi();
    setLokasi(lokasiData);
    setLoadingLokasi(false);
  }

  // ── Ulangi (kembali ke kamera) ────────────────────────────
  function handleUlangi() {
    setSnapshot(null);
    setLokasi(null);
    startCamera(facingMode);
  }

  // ── Flip kamera ───────────────────────────────────────────
  function handleFlip() {
    const newFacing = facingMode === 'user' ? 'environment' : 'user';
    setFacingMode(newFacing);
    startCamera(newFacing);
  }

  // ── Gunakan foto ──────────────────────────────────────────
  function handleGunakan() {
    if (!snapshot) return;
    onCapture({ foto: snapshot, lokasi });
  }

  const labelMode = mode === 'masuk' ? '🏢 Absen Masuk' : '🏠 Absen Pulang';
  const colorMode = mode === 'masuk' ? 'var(--clr-success)' : 'var(--clr-danger)';

  return (
    <div style={overlayStyle} onClick={e => { if (e.target === e.currentTarget) onCancel(); }}>
      <div style={modalStyle}>
        {/* ── Header ───────────────────────────────────────── */}
        <div style={modalHeaderStyle}>
          <div>
            <div style={{ fontWeight: 700, color: colorMode, fontSize: 'var(--text-lg)' }}>
              {labelMode}
            </div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
              Ambil foto untuk merekam kehadiran Anda
            </div>
          </div>
          <button
            onClick={onCancel}
            style={closeBtnStyle}
            id="btn-camera-cancel"
            aria-label="Tutup"
          >✕</button>
        </div>

        {/* ── Loading ──────────────────────────────────────── */}
        {fase === 'loading' && (
          <div style={centerStyle}>
            <div style={spinnerStyle} />
            <p style={{ color: 'var(--clr-text-muted)', marginTop: 'var(--sp-4)' }}>
              Memulai kamera…
            </p>
          </div>
        )}

        {/* ── Error ────────────────────────────────────────── */}
        {fase === 'error' && (
          <div style={{ ...centerStyle, gap: 'var(--sp-4)', padding: 'var(--sp-8)' }}>
            <span style={{ fontSize: '3rem' }}>📵</span>
            <p style={{ color: 'var(--clr-danger)', textAlign: 'center', fontSize: 'var(--text-sm)' }}>
              {errorMsg}
            </p>
            <button className="btn btn-outline btn-sm" onClick={() => startCamera(facingMode)}>
              🔄 Coba Lagi
            </button>
          </div>
        )}

        {/* ── Video Preview (kamera aktif) ──────────────────── */}
        {fase === 'kamera' && (
          <div style={{ position: 'relative' }}>
            <video
              ref={videoRef}
              style={{
                width: '100%',
                borderRadius: 'var(--radius-md)',
                display: 'block',
                maxHeight: 340,
                objectFit: 'cover',
                transform: facingMode === 'user' ? 'scaleX(-1)' : 'none',
                background: '#000',
              }}
              playsInline
              muted
            />
            {/* Overlay grid panduan */}
            <div style={gridOverlayStyle} />

            {/* Tombol flip kamera */}
            <button
              onClick={handleFlip}
              style={flipBtnStyle}
              id="btn-flip-camera"
              title="Ganti kamera"
            >
              🔄
            </button>

            {/* Label mode di atas video */}
            <div style={videoLabelStyle(colorMode)}>
              {labelMode}
            </div>
          </div>
        )}

        {/* ── Foto Hasil + Lokasi ──────────────────────────── */}
        {fase === 'preview' && snapshot && (
          <div>
            {/* Foto */}
            <div style={{ position: 'relative' }}>
              <img
                src={snapshot}
                alt="Foto absensi"
                style={{
                  width: '100%',
                  borderRadius: 'var(--radius-md)',
                  display: 'block',
                  maxHeight: 300,
                  objectFit: 'cover',
                }}
              />
              <div style={photoStampStyle(colorMode)}>
                {new Date().toLocaleString('id-ID', {
                  day: '2-digit', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit', hour12: false,
                })}
              </div>
            </div>

            {/* Lokasi */}
            <div style={lokasiBoxStyle}>
              {loadingLokasi ? (
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--sp-2)', color: 'var(--clr-text-muted)' }}>
                  <div style={{ ...spinnerStyle, width: 16, height: 16, borderWidth: 2 }} />
                  <span style={{ fontSize: 'var(--text-xs)' }}>Mendeteksi lokasi…</span>
                </div>
              ) : lokasi ? (
                <>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 'var(--sp-2)' }}>
                    <span style={{ fontSize: '1rem', flexShrink: 0 }}>📍</span>
                    <div>
                      <div style={{ fontSize: 'var(--text-xs)', fontWeight: 600, color: 'var(--clr-text-primary)', marginBottom: 2 }}>
                        Lokasi Anda Saat Ini
                      </div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-secondary)', lineHeight: 1.5 }}>
                        {lokasi.alamat}
                      </div>
                      {lokasi.lat && (
                        <div style={{ fontSize: '0.68rem', color: 'var(--clr-text-muted)', marginTop: 3 }}>
                          {lokasi.lat}, {lokasi.lng}
                        </div>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--clr-text-muted)' }}>
                  ⚠️ Lokasi tidak tersedia
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Canvas tersembunyi untuk capture ─────────────── */}
        <canvas ref={canvasRef} style={{ display: 'none' }} />

        {/* ── Action Buttons ────────────────────────────────── */}
        <div style={actionBarStyle}>
          {fase === 'kamera' && (
            <>
              <button className="btn btn-outline" onClick={onCancel} id="btn-camera-batal">
                Batal
              </button>
              <button
                className="btn btn-primary"
                onClick={handleAmbilFoto}
                id="btn-ambil-foto"
                style={{ flex: 1 }}
              >
                📸 Ambil Foto
              </button>
            </>
          )}

          {fase === 'preview' && (
            <>
              <button className="btn btn-outline" onClick={handleUlangi} id="btn-ulangi-foto">
                🔄 Ulangi
              </button>
              <button
                className="btn"
                onClick={handleGunakan}
                id="btn-gunakan-foto"
                disabled={loadingLokasi}
                style={{
                  flex: 1,
                  background: colorMode,
                  color: '#fff',
                  opacity: loadingLokasi ? 0.6 : 1,
                }}
              >
                {loadingLokasi ? '⏳ Mendeteksi lokasi…' : `✅ Gunakan Foto`}
              </button>
            </>
          )}

          {fase === 'error' && (
            <button className="btn btn-outline btn-block" onClick={onCancel}>
              Kembali
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Styles ─────────────────────────────────────────────────── */
const overlayStyle = {
  position: 'fixed',
  inset: 0,
  background: 'rgba(0,0,0,0.75)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  zIndex: 1000,
  padding: 'var(--sp-4)',
  backdropFilter: 'blur(4px)',
};

const modalStyle = {
  background: 'var(--clr-bg-card)',
  border: '1px solid var(--clr-border)',
  borderRadius: 'var(--radius-xl)',
  width: '100%',
  maxWidth: 440,
  overflow: 'hidden',
  boxShadow: 'var(--shadow-lg)',
  display: 'flex',
  flexDirection: 'column',
  gap: 0,
};

const modalHeaderStyle = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: 'var(--sp-5)',
  borderBottom: '1px solid var(--clr-border)',
};

const closeBtnStyle = {
  background: 'var(--clr-bg-surface)',
  border: '1px solid var(--clr-border)',
  borderRadius: 'var(--radius-md)',
  color: 'var(--clr-text-muted)',
  cursor: 'pointer',
  width: 32,
  height: 32,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontFamily: 'inherit',
  fontSize: 'var(--text-sm)',
};

const centerStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  padding: 'var(--sp-10)',
};

const spinnerStyle = {
  width: 36,
  height: 36,
  border: '3px solid var(--clr-border)',
  borderTop: '3px solid var(--clr-primary)',
  borderRadius: '50%',
  animation: 'spin 0.8s linear infinite',
};

const gridOverlayStyle = {
  position: 'absolute',
  inset: 0,
  borderRadius: 'var(--radius-md)',
  pointerEvents: 'none',
  backgroundImage: `
    linear-gradient(rgba(255,255,255,0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.05) 1px, transparent 1px)
  `,
  backgroundSize: '33.33% 33.33%',
};

const flipBtnStyle = {
  position: 'absolute',
  top: 10,
  right: 10,
  background: 'rgba(0,0,0,0.5)',
  border: 'none',
  borderRadius: 'var(--radius-md)',
  color: '#fff',
  cursor: 'pointer',
  padding: '6px 10px',
  fontSize: '1rem',
  backdropFilter: 'blur(4px)',
};

const videoLabelStyle = (color) => ({
  position: 'absolute',
  top: 10,
  left: 10,
  background: `${color}cc`,
  color: '#fff',
  fontSize: 'var(--text-xs)',
  fontWeight: 700,
  padding: '4px 10px',
  borderRadius: 'var(--radius-full)',
  backdropFilter: 'blur(4px)',
});

const photoStampStyle = (color) => ({
  position: 'absolute',
  bottom: 8,
  right: 10,
  background: 'rgba(0,0,0,0.65)',
  color: '#fff',
  fontSize: '0.65rem',
  padding: '3px 8px',
  borderRadius: 'var(--radius-sm)',
  fontFamily: 'monospace',
  letterSpacing: '0.03em',
});

const lokasiBoxStyle = {
  margin: 'var(--sp-3) var(--sp-5) 0',
  background: 'var(--clr-bg-surface)',
  border: '1px solid var(--clr-border)',
  borderRadius: 'var(--radius-md)',
  padding: 'var(--sp-3) var(--sp-4)',
};

const actionBarStyle = {
  display: 'flex',
  gap: 'var(--sp-3)',
  padding: 'var(--sp-5)',
  borderTop: '1px solid var(--clr-border)',
  marginTop: 'var(--sp-3)',
};
