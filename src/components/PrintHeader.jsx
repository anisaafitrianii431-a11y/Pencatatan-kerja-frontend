import React from 'react';
import { COMPANY_INFO, formatPeriodeIndo, formatTanggalCetak } from '../utils/printHelpers';

/**
 * PrintHeader Component
 * Menampilkan Kop Surat Resmi Perusahaan & Judul Dokumen Cetak
 */
export default function PrintHeader({ 
  title = 'DOKUMEN RESMI PENGGAJIAN', 
  subtitle = 'Sistem Pencatatan Kerja Lapangan & Penggajian Terintegrasi',
  noDokumen = '',
  periode = '',
  tanggalCetak = ''
}) {
  const tgl = tanggalCetak || formatTanggalCetak();
  const companyDetails = [COMPANY_INFO.address, COMPANY_INFO.contact].filter(Boolean).join(' | ');

  return (
    <div className="print-header-kop mb-5 print-avoid-break">
      {/* 1. KOP SURAT PERUSAHAAN */}
      <div className="flex items-start justify-between pb-3">
        <div className="flex items-center space-x-3.5">
          <div className="w-12 h-12 rounded-xl bg-slate-900 text-white flex items-center justify-center font-black text-lg tracking-wider border-2 border-slate-700 shadow-sm print:border-slate-800">
            PAM
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-tight uppercase">
              {COMPANY_INFO.name}
            </h1>
            <p className="text-[10px] sm:text-[11px] text-slate-600 font-medium tracking-wide">
              {COMPANY_INFO.tagline}
            </p>
            {companyDetails && (
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                {companyDetails}
              </p>
            )}
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
            DOKUMEN RESMI
          </div>
          <div className="text-xs font-black text-slate-900 uppercase mt-0.5">
            {formatPeriodeIndo(periode)}
          </div>
          <div className="text-[9.5px] text-slate-500 mt-0.5">
            Tgl Cetak: {tgl}
          </div>
        </div>
      </div>

      {/* 2. GARIS PEMBATAS GANDA (OFFICIAL DOUBLE RULE) */}
      <div className="border-t-2 border-slate-900 mt-1"></div>
      <div className="border-t border-slate-400 mt-[1.5px] mb-4"></div>

      {/* 3. JUDUL DOKUMEN & NOMOR REFERENSI */}
      <div className="text-center my-3">
        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wider uppercase underline underline-offset-4 decoration-2 decoration-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10.5px] text-slate-600 font-medium mt-1">
            {subtitle}
          </p>
        )}
        {noDokumen && (
          <p className="text-[10px] font-mono font-bold text-slate-700 mt-0.5 tracking-wide">
            Nomor: {noDokumen}
          </p>
        )}
      </div>
    </div>
  );
}
