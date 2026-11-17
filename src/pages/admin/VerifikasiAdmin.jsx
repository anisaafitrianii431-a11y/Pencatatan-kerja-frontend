import React from 'react';
import VerifikasiAbsensiAdmin from './VerifikasiAbsensiAdmin';
import VerifikasiPengeluaranAdmin from './VerifikasiPengeluaranAdmin';

/**
 * VerifikasiAdmin (Dispatcher Wrapper)
 * Halaman verifikasi admin kini telah dipecah menjadi halaman mandiri:
 * - VerifikasiAbsensiAdmin (Approval Jam Kerja)
 * - VerifikasiPengeluaranAdmin (Approval Nota Belanja & Reimburse)
 */
export default function VerifikasiAdmin({ currentUser, tab = 'absensi' }) {
  if (tab === 'pengeluaran') {
    return <VerifikasiPengeluaranAdmin currentUser={currentUser} />;
  }
  return <VerifikasiAbsensiAdmin currentUser={currentUser} />;
}
