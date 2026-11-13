import React from 'react';
import { COMPANY_INFO, formatTanggalCetak } from '../utils/printHelpers';

/**
 * PrintSignatures Component
 * Menampilkan Blok Tanda Tangan & Pengesahan Resmi (2 atau 3 Kolom)
 */
export default function PrintSignatures({
  namaKaryawan = 'Karyawan',
  jabatanKaryawan = 'Tenaga Kerja Lapangan',
  type = '3-col', // '3-col' atau '2-col'
  tanggal = ''
}) {
  const tglFormatted = tanggal || [COMPANY_INFO.city, formatTanggalCetak()].filter(Boolean).join(', ');

  if (type === '2-col') {
    return (
      <div className="print-signatures-block print-avoid-break mt-6 pt-4 border-t border-slate-300">
        <div className="text-right text-[10.5px] font-medium text-slate-700 mb-3">
          {tglFormatted}
        </div>
        <div className="grid grid-cols-2 gap-8 text-center text-xs">
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Mengetahui / Disetujui Oleh:
            </div>
            <div className="font-extrabold text-slate-900 mt-0.5">
              Admin Keuangan & HRD
            </div>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-slate-300 italic">[ Tanda Tangan & Cap ]</span>
            </div>
            <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[200px]">
              ( ........................................ )
            </div>
          </div>

          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Diterima Oleh (Pekerja):
            </div>
            <div className="font-extrabold text-slate-900 mt-0.5">
              {namaKaryawan}
            </div>
            <div className="h-16 flex items-center justify-center">
              <span className="text-[9px] text-slate-300 italic">[ Tanda Tangan Penerima ]</span>
            </div>
            <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[200px]">
              ( {namaKaryawan} )
            </div>
            <div className="text-[9.5px] text-slate-500 mt-0.5">
              {jabatanKaryawan}
            </div>
          </div>
        </div>

        <div className="text-[9px] text-slate-400 text-center italic mt-5">
          * Dokumen slip gaji ini merupakan bukti sah pembayaran hak kerja yang diterbitkan secara resmi oleh sistem komputerisasi {COMPANY_INFO.name}.
        </div>
      </div>
    );
  }

  // Default: 3-column signature block
  return (
    <div className="print-signatures-block print-avoid-break mt-6 pt-4 border-t border-slate-300">
      <div className="text-right text-[10.5px] font-medium text-slate-700 mb-3">
        {tglFormatted}
      </div>
      <div className="grid grid-cols-3 gap-6 text-center text-xs">
        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Dibuat Oleh:
          </div>
          <div className="font-extrabold text-slate-900 mt-0.5">
            Admin Keuangan & HRD
          </div>
          <div className="h-16 flex items-center justify-center">
            <span className="text-[9px] text-slate-300 italic">[ Tanda Tangan ]</span>
          </div>
          <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[170px]">
            ( .................................... )
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Disetujui Oleh:
          </div>
          <div className="font-extrabold text-slate-900 mt-0.5">
            Project Manager / Direksi
          </div>
          <div className="h-16 flex items-center justify-center">
            <span className="text-[9px] text-slate-300 italic">[ Tanda Tangan & Cap ]</span>
          </div>
          <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[170px]">
            ( .................................... )
          </div>
        </div>

        <div>
          <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
            Diterima Oleh:
          </div>
          <div className="font-extrabold text-slate-900 mt-0.5 truncate">
            {namaKaryawan}
          </div>
          <div className="h-16 flex items-center justify-center">
            <span className="text-[9px] text-slate-300 italic">[ Tanda Tangan Penerima ]</span>
          </div>
          <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[170px] truncate">
            ( {namaKaryawan} )
          </div>
          <div className="text-[9.5px] text-slate-500 mt-0.5 truncate">
            {jabatanKaryawan}
          </div>
        </div>
      </div>

      <div className="text-[9px] text-slate-400 text-center italic mt-5">
        * Dokumen ini sah dan diterbitkan secara resmi oleh Sistem Penggajian & Rekapitulasi Operasional {COMPANY_INFO.name}.
      </div>
    </div>
  );
}
