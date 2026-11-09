import React from 'react';
import PresensiKaryawanPage from './PresensiKaryawanPage';
import GajiKaryawanPage from './GajiKaryawanPage';
import ProyekKaryawanPage from './ProyekKaryawanPage';

/**
 * RekapKaryawanPage (Dispatcher Wrapper)
 * Halaman karyawan kini telah dipecah menjadi komponen mandiri:
 * - PresensiKaryawanPage (Presensi & Alur Kerja)
 * - GajiKaryawanPage (Slip Gaji & Cetak)
 * - ProyekKaryawanPage (Progres & Kontribusi Proyek)
 */
export default function RekapKaryawanPage({ currentUser, initialTab = 'presensi' }) {
  if (initialTab === 'gaji') {
    return <GajiKaryawanPage currentUser={currentUser} />;
  }
  if (initialTab === 'proyek' || initialTab === 'rekap') {
    return <ProyekKaryawanPage currentUser={currentUser} />;
  }
  return <PresensiKaryawanPage currentUser={currentUser} />;
}
