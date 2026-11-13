import React from 'react';
import { COMPANY_INFO, formatPeriodeIndo, formatTanggalCetak } from '../utils/printHelpers';
import { formatRupiah } from '../services/api';

/**
 * CorporateFinancialReportDocument Component
 * Dokumen Resmi Laporan Keuangan & Pertanggungjawaban Saldo Kas Operasional
 * CV. PUTRA ANUGRAH MANDIRI
 */
export default function CorporateFinancialReportDocument({
  summaryData = {},
  filteredRekapPj = [],
  totalRekapDiterima = 0,
  totalRekapBelanja = 0,
  totalRekapPengembalian = 0,
  totalRekapSaldo = 0,
  filteredPrintTransactions = [],
  totalFilteredPrintNominal = 0,
  printIncludeTransactions = true,
  rekapFilterMonth = '',
  rekapFilterPj = '',
  printStartDate = '',
  printEndDate = '',
  pekerjaList = [],
  currentUser = null,
}) {
  const selectedPjObj = pekerjaList.find(
    (p) => String(p.id_karyawan) === String(rekapFilterPj)
  );

  let periodeText = 'Semua Periode Kumulatif';
  if (rekapFilterMonth) {
    periodeText = formatPeriodeIndo(rekapFilterMonth);
  } else if (printStartDate && printEndDate) {
    periodeText = `${formatTanggalCetak(printStartDate)} s/d ${formatTanggalCetak(printEndDate)}`;
  } else if (printStartDate) {
    periodeText = `Sejak ${formatTanggalCetak(printStartDate)}`;
  }

  const tglCetak = formatTanggalCetak();
  const yearCode = new Date().getFullYear();
  const monthCode = String(new Date().getMonth() + 1).padStart(2, '0');
  const noDokumen = `PK/KEU-EXP/${yearCode}${monthCode}/${rekapFilterPj ? `PJ${rekapFilterPj}` : 'ALL'}-01`;

  return (
    <div className="corporate-report-sheet bg-white text-slate-900 font-sans p-6 sm:p-10 max-w-[210mm] mx-auto print:max-w-none print:p-0 print:m-0 text-[11px] leading-normal select-text">
      {/* 1. KOP SURAT RESMI PERUSAHAAN */}
      <header className="border-b-2 border-slate-900 pb-3 mb-1 print-avoid-break">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-14 h-14 rounded-xl bg-blue-700 text-white font-black text-2xl flex items-center justify-center border-2 border-slate-900 shrink-0 shadow-xs print:border-slate-900">
              PK
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-black tracking-tight text-slate-900 uppercase">
                {COMPANY_INFO.name}
              </h1>
              <p className="text-[10px] sm:text-[11px] font-semibold text-slate-700 tracking-wide">
                {COMPANY_INFO.tagline}
              </p>
              <p className="text-[9px] sm:text-[10px] text-slate-500 mt-0.5">
                {COMPANY_INFO.address} • {COMPANY_INFO.contact}
              </p>
            </div>
          </div>

          <div className="text-right shrink-0">
            <div className="text-[9.5px] font-bold text-slate-400 uppercase tracking-widest">
              DOKUMEN RESMI KEUANGAN
            </div>
            <div className="text-xs font-black text-slate-900 font-mono mt-0.5">
              {noDokumen}
            </div>
            <div className="text-[9.5px] text-slate-600 mt-0.5">
              Tgl Cetak: {tglCetak}
            </div>
          </div>
        </div>
      </header>

      {/* Garis ganda kop resmi */}
      <div className="border-t border-slate-400 mb-5"></div>

      {/* 2. JUDUL DOKUMEN & PARAMETER LAPORAN */}
      <section className="text-center mb-6 print-avoid-break">
        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider text-slate-900 underline underline-offset-4 decoration-2 decoration-slate-900">
          LAPORAN KEUANGAN OPERASIONAL & PERTANGGUNGJAWABAN DANA KAS
        </h2>
        <p className="text-[10px] text-slate-500 font-medium mt-1">
          Rekapitulasi Penyaluran Kas Kantor, Belanja Disetujui, Pengembalian Sisa Dana, dan Kewajiban Reimbursement
        </p>

        <div className="flex flex-wrap items-center justify-center gap-4 sm:gap-8 mt-3 py-1.5 px-3 bg-slate-50 border border-slate-200 rounded-lg text-[10.5px] text-slate-700">
          <div>
            <span className="text-slate-400 font-medium">Periode:</span>{' '}
            <strong className="text-slate-900">{periodeText}</strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Penanggung Jawab:</span>{' '}
            <strong className="text-slate-900">
              {selectedPjObj ? selectedPjObj.nama : 'Seluruh Penanggung Jawab'}
            </strong>
          </div>
          <div>
            <span className="text-slate-400 font-medium">Status Audit:</span>{' '}
            <strong className="text-emerald-700 font-bold uppercase">Terverifikasi Database</strong>
          </div>
        </div>
      </section>

      {/* 3. BAGIAN I: RINGKASAN EKSEKUTIF FINANSIAL */}
      <section className="mb-6 print-avoid-break">
        <div className="bg-slate-100 border border-slate-300 px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider text-slate-800">
          I. Ringkasan Eksekutif Finansial & Alokasi Kas Operasional
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[10.5px] mt-1">
          <tbody>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 w-3/5 border-r border-slate-200">
                1. Total Pemasukan Kas Baru Perusahaan (Modal Masuk Perusahaan)
              </td>
              <td className="p-2 text-right font-bold text-slate-900">
                {formatRupiah(summaryData?.total_pemasukan_perusahaan || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 border-r border-slate-200">
                2. Total Alokasi Dana Kantor Disalurkan ke Seluruh Penanggung Jawab (PJ)
              </td>
              <td className="p-2 text-right font-bold text-indigo-900">
                {formatRupiah(summaryData?.total_dana_disalurkan || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 border-r border-slate-200">
                3. Total Pengeluaran Uang Kantor Disetujui (Realisasi Belanja)
              </td>
              <td className="p-2 text-right font-bold text-emerald-800">
                {formatRupiah(summaryData?.uang_kantor_disetujui || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 border-r border-slate-200">
                4. Total Pengembalian Sisa Uang Kantor (Diverifikasi Kasir)
              </td>
              <td className="p-2 text-right font-bold text-teal-800">
                {formatRupiah(summaryData?.total_pengembalian_diverifikasi || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-300 bg-amber-50/60">
              <td className="p-2 font-bold text-amber-950 border-r border-slate-300">
                5. Total Saldo Dana Uang Kantor Beredar (Masih Dipegang Seluruh PJ)
                <span className="block text-[9px] font-normal text-amber-800 italic mt-0.5">
                  Formula: Total Dana Disalurkan - Pengeluaran Kantor Disetujui - Pengembalian Kasir
                </span>
              </td>
              <td className="p-2 text-right font-black text-amber-900 text-xs">
                {formatRupiah(summaryData?.total_saldo_penanggung_jawab || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 border-r border-slate-200">
                6. Total Pengajuan Reimbursement Uang Pribadi Karyawan (Disetujui)
              </td>
              <td className="p-2 text-right font-bold text-slate-900">
                {formatRupiah(summaryData?.uang_pribadi_disetujui || 0)}
              </td>
            </tr>
            <tr className="border-b border-slate-200">
              <td className="p-2 font-medium bg-slate-50/60 border-r border-slate-200">
                7. Total Reimbursement yang Sudah Dibayar Perusahaan (Kas Keluar)
              </td>
              <td className="p-2 text-right font-bold text-purple-900">
                {formatRupiah(summaryData?.total_reimbursement_sudah_dibayar || 0)}
              </td>
            </tr>
            <tr className="bg-rose-50/40">
              <td className="p-2 font-bold text-rose-950 border-r border-slate-300">
                8. Sisa Kewajiban Hutang Reimbursement Perusahaan Belum Dibayar
              </td>
              <td className="p-2 text-right font-black text-rose-700 text-xs">
                {formatRupiah(summaryData?.total_reimbursement_belum_dibayar || 0)}
              </td>
            </tr>
          </tbody>
        </table>
      </section>

      {/* 4. BAGIAN II: TABEL REKAPITULASI DANA PER PENANGGUNG JAWAB */}
      <section className="mb-6 print-avoid-break">
        <div className="bg-slate-100 border border-slate-300 px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider text-slate-800 flex justify-between items-center">
          <span>II. Rekapitulasi Saldo & Pertanggungjawaban per Penanggung Jawab</span>
          <span className="text-[9.5px] font-normal text-slate-600">Total: {filteredRekapPj.length} PJ</span>
        </div>
        <table className="w-full border-collapse border border-slate-300 text-[10px] mt-1">
          <thead className="bg-slate-100 font-bold text-slate-800 text-center border-b border-slate-300">
            <tr>
              <th className="border border-slate-300 p-1.5 w-7">No</th>
              <th className="border border-slate-300 p-1.5 text-left">Nama Penanggung Jawab</th>
              <th className="border border-slate-300 p-1.5 text-left w-36">ID & Jabatan</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Dana Diterima</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Belanja Disetujui</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Pengembalian</th>
              <th className="border border-slate-300 p-1.5 text-right w-24">Saldo Dipegang</th>
              <th className="border border-slate-300 p-1.5 text-center w-28">Status Pertanggungjawaban</th>
            </tr>
          </thead>
          <tbody>
            {filteredRekapPj.length === 0 ? (
              <tr>
                <td colSpan="8" className="border border-slate-300 p-4 text-center text-slate-400 italic">
                  Tidak ada data penanggung jawab dana kantor untuk parameter filter ini.
                </td>
              </tr>
            ) : (
              filteredRekapPj.map((row, idx) => (
                <tr key={idx} className="border-b border-slate-200">
                  <td className="border border-slate-300 p-1.5 text-center font-medium">{idx + 1}</td>
                  <td className="border border-slate-300 p-1.5 font-bold text-slate-900">{row.penanggung_jawab?.nama}</td>
                  <td className="border border-slate-300 p-1.5 text-slate-600 font-mono text-[9px]">
                    {row.penanggung_jawab?.kode_karyawan} - {row.penanggung_jawab?.jabatan}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-right font-medium">{formatRupiah(row.total_dana_diterima)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-medium">{formatRupiah(row.total_pengeluaran)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-medium">{formatRupiah(row.total_pengembalian)}</td>
                  <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">
                    {formatRupiah(row.saldo_dipegang)}
                  </td>
                  <td className="border border-slate-300 p-1.5 text-center font-bold text-[9px]">
                    {row.status_pertanggungjawaban}
                  </td>
                </tr>
              ))
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
            <tr>
              <td colSpan="3" className="border border-slate-300 p-1.5 text-center uppercase">Total Akumulatif</td>
              <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(totalRekapDiterima)}</td>
              <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(totalRekapBelanja)}</td>
              <td className="border border-slate-300 p-1.5 text-right font-black">{formatRupiah(totalRekapPengembalian)}</td>
              <td className="border border-slate-300 p-1.5 text-right font-black text-amber-900">{formatRupiah(totalRekapSaldo)}</td>
              <td className="border border-slate-300 p-1.5 text-center text-[9px] text-slate-600 font-semibold">Tervalidasi</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* 5. BAGIAN III: TABEL RINCIAN TRANSAKSI DISPOSISI PENGELUARAN (JIKA DIPILIH) */}
      {printIncludeTransactions && (
        <section className="mb-6 print-avoid-break">
          <div className="bg-slate-100 border border-slate-300 px-3 py-1.5 font-bold text-[10.5px] uppercase tracking-wider text-slate-800 flex justify-between items-center">
            <span>III. Rincian Transaksi Pengeluaran Operasional Disetujui</span>
            <span className="text-[9.5px] font-normal text-slate-600">Total: {filteredPrintTransactions.length} Transaksi</span>
          </div>
          <table className="w-full border-collapse border border-slate-300 text-[9.5px] mt-1">
            <thead className="bg-slate-100 font-bold text-slate-800 text-center border-b border-slate-300">
              <tr>
                <th className="border border-slate-300 p-1.5 w-6">No</th>
                <th className="border border-slate-300 p-1.5 text-left w-24">No. Transaksi</th>
                <th className="border border-slate-300 p-1.5 text-center w-16">Tanggal</th>
                <th className="border border-slate-300 p-1.5 text-left">Pekerjaan</th>
                <th className="border border-slate-300 p-1.5 text-left">Kategori & Keterangan</th>
                <th className="border border-slate-300 p-1.5 text-center w-16">Sumber</th>
                <th className="border border-slate-300 p-1.5 text-left w-24">Pelaksana / PJ</th>
                <th className="border border-slate-300 p-1.5 text-right w-20">Nominal</th>
              </tr>
            </thead>
            <tbody>
              {filteredPrintTransactions.length === 0 ? (
                <tr>
                  <td colSpan="8" className="border border-slate-300 p-3 text-center text-slate-400 italic">
                    Tidak ada transaksi pengeluaran disetujui untuk filter yang ditentukan.
                  </td>
                </tr>
              ) : (
                filteredPrintTransactions.map((tx, idx) => (
                  <tr key={idx} className="border-b border-slate-200">
                    <td className="border border-slate-300 p-1.5 text-center font-medium">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5 font-mono text-[8.5px] text-slate-700">
                      {tx.nomor_transaksi || `TX-${tx.id_pengeluaran}`}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center text-slate-600">{tx.tanggal || '-'}</td>
                    <td className="border border-slate-300 p-1.5 font-medium text-slate-900">{tx.nama_pekerjaan || '-'}</td>
                    <td className="border border-slate-300 p-1.5 text-slate-700">
                      <span className="font-semibold block">{tx.kategori || 'Operasional'}</span>
                      <span className="text-slate-500 text-[8.5px] block">{tx.keterangan || '-'}</span>
                    </td>
                    <td className="border border-slate-300 p-1.5 text-center font-bold text-[8.5px] uppercase">
                      {tx.jenis_dana === 'kantor' ? 'Uang Kantor' : 'Uang Pribadi'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-slate-800 text-[9px]">
                      {tx.nama_pj || tx.nama_karyawan || '-'}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-bold text-slate-900">
                      {formatRupiah(tx.nominal_disetujui || tx.nominal || 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-400">
              <tr>
                <td colSpan="7" className="border border-slate-300 p-1.5 text-right uppercase">
                  Total Nilai Transaksi Disetujui
                </td>
                <td className="border border-slate-300 p-1.5 text-right font-black text-slate-900">
                  {formatRupiah(totalFilteredPrintNominal)}
                </td>
              </tr>
            </tfoot>
          </table>
        </section>
      )}

      {/* 6. BAGIAN IV: CATATAN & PERNYATAAN AUDIT */}
      <section className="mb-6 print-avoid-break bg-slate-50 border border-slate-200 p-2.5 rounded text-[9.5px] text-slate-600">
        <div className="font-bold text-slate-800 mb-0.5">CATATAN & PERNYATAAN AUDIT FINANSIAL:</div>
        <ol className="list-decimal pl-3.5 space-y-0.5">
          <li>
            Seluruh data transaksi dan posisi saldo di atas bersumber langsung dari sistem terintegrasi CV. Putra Anugrah Mandiri dan telah diverifikasi oleh Administrator.
          </li>
          <li>
            Bukti nota fisik dan foto kwitansi digital tersimpan dalam arsip database keuangan perusahaan.
          </li>
          <li>
            Penanggung jawab yang memegang sisa saldo wajib melakukan pengembalian atau melengkapi bukti pertanggungjawaban dalam jangka waktu operasional yang ditetapkan.
          </li>
        </ol>
      </section>

      {/* 7. BAGIAN V: PENGESAHAN & TANDA TANGAN RESMI (3 KOLOM) */}
      <section className="print-avoid-break pt-2">
        <div className="text-right text-[10.5px] font-medium text-slate-700 mb-3">
          Yogyakarta, {tglCetak}
        </div>
        <div className="grid grid-cols-3 gap-6 text-center text-xs">
          <div>
            <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Dibuat Oleh:
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[11px]">
              Admin Keuangan / Kasir
            </div>
            <div className="h-14 flex items-center justify-center">
              <span className="text-[8.5px] text-slate-300 italic">[ Tanda Tangan ]</span>
            </div>
            <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[160px] text-[10.5px]">
              ( {currentUser?.name || 'Administrator'} )
            </div>
          </div>

          <div>
            <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Diperiksa Oleh:
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[11px]">
              Supervisor / Finance
            </div>
            <div className="h-14 flex items-center justify-center">
              <span className="text-[8.5px] text-slate-300 italic">[ Tanda Tangan ]</span>
            </div>
            <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[160px] text-[10.5px]">
              ( .................................... )
            </div>
          </div>

          <div>
            <div className="text-[9.5px] font-bold text-slate-500 uppercase tracking-wider">
              Mengetahui & Menyetujui:
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[11px]">
              Direktur Utama
            </div>
            <div className="h-14 flex items-center justify-center">
              <span className="text-[8.5px] text-slate-300 italic">[ Tanda Tangan & Cap ]</span>
            </div>
            <div className="border-t border-slate-800 font-bold text-slate-900 pt-1 mx-auto max-w-[160px] text-[10.5px]">
              ( Direktur CV. Putra Anugrah Mandiri )
            </div>
          </div>
        </div>
      </section>

      {/* 8. FOOTER DOKUMEN RESMI */}
      <footer className="border-t border-slate-300 mt-6 pt-2 flex items-center justify-between text-[8.5px] text-slate-400">
        <div>Sistem Pencatatan Kerja CV. Putra Anugrah Mandiri • Dokumen Resmi Internal Perusahaan</div>
        <div>Halaman 1 dari 1 (Dokumen Bersambung Otomatis) • Ref: {noDokumen}</div>
      </footer>
    </div>
  );
}

