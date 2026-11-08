import { useEffect, useState } from 'react';

/**
 * TimerClock — Menampilkan jam real-time (HH:MM:SS)
 */
export default function TimerClock({ size = 'md' }) {
  const [waktu, setWaktu] = useState(new Date());

  useEffect(() => {
    const interval = setInterval(() => setWaktu(new Date()), 1000);
    return () => clearInterval(interval);
  }, []);

  const jam = waktu.toLocaleTimeString('id-ID', { hour12: false });
  const tanggal = waktu.toLocaleDateString('id-ID', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  const styles = {
    sm: { fontSize: '1.1rem', dateFontSize: '0.75rem' },
    md: { fontSize: '2rem',   dateFontSize: '0.85rem' },
    lg: { fontSize: '3rem',   dateFontSize: '1rem' },
  };

  const s = styles[size] || styles.md;

  return (
    <div style={{ textAlign: 'center', lineHeight: 1.3 }}>
      <div
        style={{
          fontFamily: "'Inter', monospace",
          fontSize: s.fontSize,
          fontWeight: 700,
          color: 'var(--clr-primary)',
          letterSpacing: '0.05em',
          textShadow: '0 0 20px var(--clr-primary-glow)',
        }}
      >
        {jam}
      </div>
      <div style={{ fontSize: s.dateFontSize, color: 'var(--clr-text-muted)', marginTop: 4 }}>
        {tanggal}
      </div>
    </div>
  );
}
