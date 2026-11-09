import { useCallback } from 'react';
import { useAbsensi } from './useAbsensi.jsx';
import { hitungDurasi } from '../data/mockData';

/**
 * useAdminStats – aggregates attendance data for the admin recap.
 * Returns:
 *   totalJam   : { totalMenit, label }
 *   hariIni    : number (records for today)
 *   pending    : number (records with status_verifikasi === 'menunggu')
 */
export function useAdminStats() {
  const { absensiList } = useAbsensi();

  const totalJam = useCallback(() => {
    const totalMenit = absensiList
      .filter(a => a.status_verifikasi === 'disetujui' && a.jam_pulang !== null)
      .reduce((sum, a) => {
        const dur = hitungDurasi(a.jam_masuk, a.jam_pulang);
        return sum + (dur ? dur.totalMenit : 0);
      }, 0);
    const jam = Math.floor(totalMenit / 60);
    const menit = totalMenit % 60;
    return { totalMenit, label: `${jam}j ${menit}m` };
  }, [absensiList]);

  const hariIni = useCallback(() => {
    const today = new Date().toLocaleDateString('sv-SE');
    return absensiList.filter(a => a.tanggal === today).length;
  }, [absensiList]);

  const pending = useCallback(() => {
    return absensiList.filter(a => a.status_verifikasi === 'menunggu').length;
  }, [absensiList]);

  return {
    totalJam: totalJam(),
    hariIni: hariIni(),
    pending: pending(),
  };
}
