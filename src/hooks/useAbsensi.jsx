import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { absensiAwal, hitungDurasi } from '../data/mockData';
import { AbsensiService } from '../services/api';
import { createAbsensi, checkoutAbsensi } from '../services/absensiApi';

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

function loadInitialAbsensiList() {
  try {
    const raw = localStorage.getItem('jam_kerja_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.absensi) && parsed.absensi.length > 0) {
        const seen = new Set(parsed.absensi.map((a) => Number(a.id_absensi)));
        const merged = [...parsed.absensi];
        absensiAwal.forEach((a) => {
          if (!seen.has(Number(a.id_absensi))) {
            merged.push(a);
          }
        });
        return merged;
      }
    }
  } catch (err) {
    console.error('Gagal membaca data absensi awal:', err);
  }
  return absensiAwal;
}

/**
 * useAbsensi — Custom hook untuk seluruh logika absensi
 *
 * Menyimpan data absensi secara permanen (localStorage & backend REST API).
 * Data langsung tersinkronisasi dengan Dashboard Admin dan Rekap Absensi Admin.
 */
function useAbsensiState() {
  const [absensiList, setAbsensiList] = useState(loadInitialAbsensiList);
  const [nextId, setNextId] = useState(() => {
    const initial = loadInitialAbsensiList();
    return initial.reduce((max, a) => Math.max(max, Number(a.id_absensi) || 0), 0) + 1;
  });

  // Sinkronisasi bila ada update dari tab/komponen lain
  useEffect(() => {
    function handleStorageSync() {
      try {
        const raw = localStorage.getItem('jam_kerja_db');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed.absensi)) {
            setAbsensiList(parsed.absensi);
          }
        }
      } catch {}
    }

    window.addEventListener('storage', handleStorageSync);
    window.addEventListener('absensi_updated', handleStorageSync);
    return () => {
      window.removeEventListener('storage', handleStorageSync);
      window.removeEventListener('absensi_updated', handleStorageSync);
    };
  }, []);

  // Ambil tanggal hari ini format YYYY-MM-DD (sesuai waktu Jakarta/lokal)
  function getTanggalHariIni() {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Asia/Jakarta',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
  }

  // Ambil jam sekarang format HH:mm
  function getJamSekarang() {
    return new Date().toLocaleTimeString('id-ID', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace('.', ':');
  }

  /**
   * Cek apakah karyawan masih punya sesi aktif (belum absen pulang)
   * untuk pekerjaan tertentu hari ini
   */
  const getSesiAktif = useCallback(
    (id_karyawan, id_pekerjaan) => {
      const kId = Number(id_karyawan);
      const pId = Number(id_pekerjaan);
      return (
        absensiList.find(
          (a) =>
            Number(a.id_karyawan) === kId &&
            Number(a.id_pekerjaan) === pId &&
            a.jam_pulang === null
        ) || null
      );
    },
    [absensiList]
  );

  /**
   * Absen Masuk — membuat baris baru di absensi & tersimpan permanen
   * @param {number} id_karyawan
   * @param {number} id_pekerjaan
   * @param {object} bukti - { foto: string (dataURL), lokasi: { lat, lng, alamat } }
   */
  const absenMasuk = useCallback(
    (id_karyawan, id_pekerjaan, bukti = {}) => {
      const kId = Number(id_karyawan);
      const pId = Number(id_pekerjaan);
      const tgl = getTanggalHariIni();

      // Cegah double absen masuk (cek sesi aktif dulu)
      const sesiAda = absensiList.find(
        (a) =>
          Number(a.id_karyawan) === kId &&
          Number(a.id_pekerjaan) === pId &&
          a.tanggal === tgl &&
          a.jam_pulang === null
      );
      if (sesiAda) return { sukses: false, pesan: 'Sudah ada sesi aktif yang belum absen pulang hari ini.' };

      const jamMasuk = getJamSekarang();
      const titikLokasi = bukti.lokasi ? `${bukti.lokasi.lat}, ${bukti.lokasi.lng}` : '';
      const fotoData = bukti.foto ?? null;

      const record = {
        id_absensi: nextId,
        id_pekerjaan: pId,
        id_karyawan: kId,
        tanggal: tgl,
        jam_masuk: jamMasuk,
        jam_pulang: null,
        status_verifikasi: 'menunggu',
        catatan: bukti.catatan || '',
        titik_lokasi: titikLokasi,
        foto_lokasi: fotoData,
        foto_masuk: fotoData,
        lokasi_masuk: bukti.lokasi ?? null,
        foto_pulang: null,
        lokasi_pulang: null,
      };

      // 1. Simpan ke React State
      setAbsensiList((prev) => [record, ...prev.filter((x) => x.id_absensi !== record.id_absensi)]);
      setNextId((id) => id + 1);

      // 2. Simpan permanen ke localStorage jam_kerja_db agar Admin langsung terbaca
      try {
        const raw = localStorage.getItem('jam_kerja_db');
        const db = raw ? JSON.parse(raw) : { absensi: [] };
        if (!Array.isArray(db.absensi)) db.absensi = [];
        db.absensi = [record, ...db.absensi.filter((x) => Number(x.id_absensi) !== Number(record.id_absensi))];
        localStorage.setItem('jam_kerja_db', JSON.stringify(db));
      } catch (err) {
        console.error('Gagal menyimpan absensi ke jam_kerja_db:', err);
      }

      // 3. Notifikasi update untuk komponen Admin & Dashboard
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('absensi_updated'));

      // 4. Sinkronisasi asinkron ke backend PHP & MySQL
      createAbsensi({
        id_pekerjaan: pId,
        id_karyawan: kId,
        tanggal: tgl,
        jam_masuk: jamMasuk,
        status_verifikasi: 'menunggu',
        latitude: bukti.lokasi?.lat ?? null,
        longitude: bukti.lokasi?.lng ?? null,
        alamat: bukti.lokasi?.alamat ?? null,
        foto_masuk: fotoData,
      }).catch((err) => {
        console.warn('Backend createAbsensi error:', err?.message || err);
      });

      AbsensiService.absenMasuk({
        id_pekerjaan: pId,
        id_karyawan: kId,
        tanggal: tgl,
        jam_masuk: jamMasuk,
        catatan: bukti.catatan || '',
        titik_lokasi: titikLokasi,
        foto_lokasi: fotoData,
      }).catch((err) => {
        console.warn('Backend sync absenMasuk:', err?.message || err);
      });

      return { sukses: true, record };
    },
    [absensiList, nextId]
  );

  /**
   * Absen Pulang — mengisi jam_pulang pada sesi aktif & tersimpan permanen
   * @param {number} id_absensi
   * @param {object} bukti - { foto: string (dataURL), lokasi: { lat, lng, alamat } }
   */
  const absenPulang = useCallback(
    (id_absensi, bukti = {}) => {
      const targetId = Number(id_absensi);
      const jamPulang = getJamSekarang();
      const fotoData = bukti.foto ?? null;
      const lokasiData = bukti.lokasi ?? null;

      // 1. Update React State
      setAbsensiList((prev) =>
        prev.map((a) =>
          Number(a.id_absensi) === targetId
            ? {
                ...a,
                jam_pulang: jamPulang,
                foto_pulang: fotoData,
                lokasi_pulang: lokasiData,
              }
            : a
        )
      );

      // 2. Update permanen di localStorage jam_kerja_db
      try {
        const raw = localStorage.getItem('jam_kerja_db');
        if (raw) {
          const db = JSON.parse(raw);
          if (Array.isArray(db.absensi)) {
            const idx = db.absensi.findIndex((a) => Number(a.id_absensi) === targetId);
            if (idx !== -1) {
              db.absensi[idx].jam_pulang = jamPulang;
              db.absensi[idx].foto_pulang = fotoData;
              db.absensi[idx].lokasi_pulang = lokasiData;
              localStorage.setItem('jam_kerja_db', JSON.stringify(db));
            }
          }
        }
      } catch (err) {
        console.error('Gagal update absenPulang di jam_kerja_db:', err);
      }

      // 3. Notifikasi update
      window.dispatchEvent(new Event('storage'));
      window.dispatchEvent(new CustomEvent('absensi_updated'));

      // 4. Sinkronisasi asinkron ke backend
      checkoutAbsensi(targetId, jamPulang, {
        latitude: lokasiData?.lat ?? null,
        longitude: lokasiData?.lng ?? null,
        alamat: lokasiData?.alamat ?? null,
        foto_pulang: fotoData,
      }).catch((err) => {
        console.warn('Backend checkoutAbsensi error:', err?.message || err);
      });

      AbsensiService.absenPulang(targetId, jamPulang).catch((err) => {
        console.warn('Backend sync absenPulang:', err?.message || err);
      });

      return { sukses: true };
    },
    []
  );

  /**
   * Filter riwayat absensi berdasarkan karyawan
   */
  const getRiwayatByKaryawan = useCallback(
    (id_karyawan) => {
      const kId = Number(id_karyawan);
      return absensiList
        .filter((a) => Number(a.id_karyawan) === kId)
        .sort((a, b) => {
          if (b.tanggal !== a.tanggal) return (b.tanggal || '').localeCompare(a.tanggal || '');
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
