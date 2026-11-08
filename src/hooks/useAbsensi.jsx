import { createContext, useCallback, useContext, useState } from 'react';
import { absensiAwal, hitungDurasi } from '../data/mockData';

const AbsensiContext = createContext(null);

export function AbsensiProvider({ children }) {
  const absensi = useAbsensiState();
  return (
    <AbsensiContext.Provider value={absensi}>
      {children}
    </AbsensiContext.Provider>
  );
}

export function useAbsensi() {
  const context = useContext(AbsensiContext);
  if (!context) throw new Error('useAbsensi harus dipakai di dalam AbsensiProvider');
  return context;
}

/**
 * useAbsensi — Custom hook untuk seluruh logika absensi
 *
 * Menyimpan state absensi di memori (nanti diganti dengan API call).
 * Eksposes:
 *  - absensiList       : semua record absensi (array)
 *  - absenMasuk(...)   : tambah record baru dengan jam_masuk sekarang
 *  - absenPulang(...)  : update jam_pulang record yang masih aktif
 *  - getSesiAktif(...) : cek apakah karyawan punya sesi belum pulang
 *  - getRiwayatByKaryawan(...) : filter riwayat per karyawan
 *  - hitungDurasi      : fungsi kalkulasi durasi (re-export dari mockData)
 */
function useAbsensiState() {
  const [absensiList, setAbsensiList] = useState(absensiAwal);
  const [nextId, setNextId] = useState(
    absensiAwal.reduce((max, a) => Math.max(max, a.id_absensi), 0) + 1
  );

  // Ambil tanggal hari ini format YYYY-MM-DD
  function getTanggalHariIni() {
    return new Date().toLocaleDateString('sv-SE'); // 'sv-SE' → ISO format
  }

  // Ambil jam sekarang format HH:MM
  function getJamSekarang() {
    return new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  }

  /**
   * Cek apakah karyawan masih punya sesi aktif (belum absen pulang)
   * untuk pekerjaan tertentu hari ini
   */
  const getSesiAktif = useCallback(
    (id_karyawan, id_pekerjaan) => {
      return absensiList.find(
        a =>
          a.id_karyawan === id_karyawan &&
          a.id_pekerjaan === id_pekerjaan &&
          a.jam_pulang === null
      ) || null;
    },
    [absensiList]
  );

  /**
   * Absen Masuk — membuat baris baru di absensi
   * @param {number} id_karyawan
   * @param {number} id_pekerjaan
   * @param {object} bukti - { foto: string (dataURL), lokasi: { lat, lng, alamat } }
   */
  const absenMasuk = useCallback(
    (id_karyawan, id_pekerjaan, bukti = {}) => {
      // Cegah double absen masuk (cek sesi aktif dulu)
      const sesiAda = absensiList.find(
        a =>
          a.id_karyawan === id_karyawan &&
          a.id_pekerjaan === id_pekerjaan &&
          a.jam_pulang === null
      );
      if (sesiAda) return { sukses: false, pesan: 'Sudah ada sesi aktif yang belum absen pulang.' };

      const record = {
        id_absensi: nextId,
        id_pekerjaan,
        id_karyawan,
        tanggal: getTanggalHariIni(),
        jam_masuk: getJamSekarang(),
        jam_pulang: null,
        status_verifikasi: 'menunggu',
        foto_masuk: bukti.foto ?? null,
        lokasi_masuk: bukti.lokasi ?? null,
        foto_pulang: null,
        lokasi_pulang: null,
      };

      setAbsensiList(prev => [...prev, record]);
      setNextId(id => id + 1);
      return { sukses: true, record };
    },
    [absensiList, nextId]
  );

  /**
   * Absen Pulang — mengisi jam_pulang pada sesi aktif
   * @param {number} id_absensi
   * @param {object} bukti - { foto: string (dataURL), lokasi: { lat, lng, alamat } }
   */
  const absenPulang = useCallback(
    (id_absensi, bukti = {}) => {
      setAbsensiList(prev =>
        prev.map(a =>
          a.id_absensi === id_absensi
            ? {
                ...a,
                jam_pulang: getJamSekarang(),
                foto_pulang: bukti.foto ?? null,
                lokasi_pulang: bukti.lokasi ?? null,
              }
            : a
        )
      );
      return { sukses: true };
    },
    []
  );

  /**
   * Filter riwayat absensi berdasarkan karyawan
   */
  const getRiwayatByKaryawan = useCallback(
    (id_karyawan) => {
      return absensiList
        .filter(a => a.id_karyawan === id_karyawan)
        .sort((a, b) => {
          // Urutkan terbaru dulu
          if (b.tanggal !== a.tanggal) return b.tanggal.localeCompare(a.tanggal);
          return (b.jam_masuk || '').localeCompare(a.jam_masuk || '');
        });
    },
    [absensiList]
  );

  /**
   * Hitung total jam kerja yang sudah disetujui oleh karyawan
   * (untuk referensi Anggota 5 — tabel gaji)
   */
  const getTotalJamDisetujui = useCallback(
    (id_karyawan) => {
      const totalMenit = absensiList
        .filter(
          a =>
            a.id_karyawan === id_karyawan &&
            a.status_verifikasi === 'disetujui' &&
            a.jam_pulang !== null
        )
        .reduce((sum, a) => {
          const dur = hitungDurasi(a.jam_masuk, a.jam_pulang);
          return sum + (dur ? dur.totalMenit : 0);
        }, 0);

      const jam = Math.floor(totalMenit / 60);
      const menit = totalMenit % 60;
      return { totalMenit, label: `${jam}j ${menit}m` };
    },
    [absensiList]
  );

  return {
    absensiList,
    absenMasuk,
    absenPulang,
    getSesiAktif,
    getRiwayatByKaryawan,
    getTotalJamDisetujui,
    hitungDurasi,
  };
}
