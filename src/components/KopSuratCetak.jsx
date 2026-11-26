import React from 'react';
import { COMPANY_INFO, formatPeriodeIndo, formatTanggalCetak } from '../utils/printHelpers';

/**
 * KopSuratCetak Component
 * Menampilkan Kop Surat Resmi Perusahaan & Judul Dokumen Cetak
 */
export default function KopSuratCetak({ 
  title = 'DOKUMEN RESMI PENGGAJIAN', 
  subtitle = 'Sistem Pencatatan Kerja Lapangan & Penggajian Terintegrasi',
  noDokumen = '',
  periode = '',
  tanggalCetak = ''
}) {
  const tgl = tanggalCetak || formatTanggalCetak();
  const companyDetails = [COMPANY_INFO.address, COMPANY_INFO.contact].filter(Boolean).join(' | ');

  return (
    <div className="print-header-kop mb-4 print-avoid-break">
      {/* 1. KOP SURAT PERUSAHAAN (BANNER RESMI) */}
      <div className="w-full mb-1">
        <img 
          src="/kop-surat.png" 
          alt="Kop Surat Resmi CV. Putra Anugrah Mandiri" 
          className="w-full h-auto object-contain max-h-[125px] mx-auto block"
        />
      </div>

      <div className="flex items-center justify-between text-[8.5px] text-slate-500 px-1 mb-2">
        <div>
          {noDokumen && (
            <span>No. Dokumen: <strong className="font-mono text-slate-800">{noDokumen}</strong></span>
          )}
        </div>
        <div className="text-right">
          {periode && <span className="font-bold text-slate-800 mr-2">PERIODE: {formatPeriodeIndo(periode)}</span>}
          <span>Tgl Cetak: {tgl}</span>
        </div>
      </div>

      {/* 2. JUDUL DOKUMEN & NOMOR REFERENSI */}
      <div className="text-center my-2 pt-2 border-t border-slate-300">
        <h2 className="text-sm sm:text-base font-black text-slate-900 tracking-wider uppercase underline underline-offset-4 decoration-2 decoration-slate-900">
          {title}
        </h2>
        {subtitle && (
          <p className="text-[10.5px] text-slate-600 font-medium mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
