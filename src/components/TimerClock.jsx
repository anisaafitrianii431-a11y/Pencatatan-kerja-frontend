import { useEffect, useState } from 'react';
import { getSyncedNowDate, subscribeNtpSync, syncNtpTime } from '../utils/ntpTime.js';

/**
 * TimerClock — Menampilkan jam real-time berbasis waktu NTP (Asia/Jakarta, HH:MM:SS)
 */
export default function TimerClock({ size = 'md' }) {
  const [waktu, setWaktu] = useState(() => getSyncedNowDate());

  useEffect(() => {
    const unsubNtp = subscribeNtpSync(() => setWaktu(getSyncedNowDate()));
    syncNtpTime().then(() => setWaktu(getSyncedNowDate()));
    const interval = setInterval(() => setWaktu(getSyncedNowDate()), 1000);
    return () => {
      unsubNtp();
      clearInterval(interval);
    };
  }, []);

  const jam = waktu.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  });
  const tanggal = waktu.toLocaleDateString('id-ID', {
    timeZone: 'Asia/Jakarta',
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
