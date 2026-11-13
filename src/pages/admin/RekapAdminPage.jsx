import React from 'react';
import KontribusiAdminPage from './KontribusiAdminPage';
import JamKerjaAdminPage from './JamKerjaAdminPage';

/**
 * RekapAdminPage (Dispatcher Wrapper)
 * Halaman rekapitulasi admin kini telah dipecah menjadi halaman mandiri:
 * - KontribusiAdminPage (Persentase Kontribusi Tim per Proyek)
 * - JamKerjaAdminPage (Rekap Jam Kerja Seluruh Pekerja)
 */
export default function RekapAdminPage({ currentUser, tab = 'kontribusi' }) {
  if (tab === 'jam_kerja' || tab === 'jam-kerja') {
    return <JamKerjaAdminPage currentUser={currentUser} />;
  }
  return <KontribusiAdminPage currentUser={currentUser} />;
}
