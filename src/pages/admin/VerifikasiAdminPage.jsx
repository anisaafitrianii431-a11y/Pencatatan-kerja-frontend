import React from 'react';
import VerifikasiAbsensiAdminPage from './VerifikasiAbsensiAdminPage';
import VerifikasiPengeluaranAdminPage from './VerifikasiPengeluaranAdminPage';

/**
 * VerifikasiAdminPage (Dispatcher Wrapper)
 * Halaman verifikasi admin kini telah dipecah menjadi halaman mandiri:
 * - VerifikasiAbsensiAdminPage (Approval Jam Kerja)
 * - VerifikasiPengeluaranAdminPage (Approval Nota Belanja & Reimburse)
 */
export default function VerifikasiAdminPage({ currentUser, tab = 'absensi' }) {
  if (tab === 'pengeluaran') {
    return <VerifikasiPengeluaranAdminPage currentUser={currentUser} />;
  }
  return <VerifikasiAbsensiAdminPage currentUser={currentUser} />;
}
