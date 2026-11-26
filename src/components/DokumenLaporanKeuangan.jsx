import React from 'react';
import { COMPANY_INFO, formatPeriodeIndo, formatTanggalCetak } from '../utils/printHelpers';
import { formatRupiah } from '../services/api';

/**
 * DokumenLaporanKeuangan Component
 * Model Laporan Arus Kas Standar Akuntansi Perusahaan (Sesuai Referensi HashMicro)
 * CV. PUTRA ANUGRAH MANDIRI - Kota Padang, Sumatera Barat
 */
export default function DokumenLaporanKeuangan({
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
  danaKantorList = [],
}) {
  const selectedPjObj = pekerjaList.find(
    (p) => String(p.id_karyawan) === String(rekapFilterPj)
  );

  let periodeText = 'Semua Periode Kumulatif';
  if (rekapFilterMonth) {
    periodeText = `Bulan ${formatPeriodeIndo(rekapFilterMonth)}`;
  } else if (printStartDate && printEndDate) {
    periodeText = `${formatTanggalCetak(printStartDate)} s/d ${formatTanggalCetak(printEndDate)}`;
  } else if (printStartDate) {
    periodeText = `Sejak ${formatTanggalCetak(printStartDate)}`;
  }

  const tglCetak = formatTanggalCetak();
  const yearCode = new Date().getFullYear();
  const monthCode = String(new Date().getMonth() + 1).padStart(2, '0');
  const noDokumen = `PAM/ARUS-KAS/${yearCode}${monthCode}/${rekapFilterPj ? `PJ${rekapFilterPj}` : 'ALL'}-01`;

  // Nominal data dari database
  const totalPemasukan = Number(summaryData?.total_pemasukan_perusahaan) || 0;
  const totalDisalurkan = Number(summaryData?.total_dana_disalurkan) || 0;
  const totalBelanjaDisetujui = Number(summaryData?.uang_kantor_disetujui) || 0;
  const totalPengembalian = Number(summaryData?.total_pengembalian_diverifikasi) || 0;
  const totalSaldoPj = Number(summaryData?.total_saldo_penanggung_jawab) || 0;
  const totalReimburseDibayar = Number(summaryData?.total_reimbursement_sudah_dibayar) || 0;
  const totalReimburseBelum = Number(summaryData?.total_reimbursement_belum_dibayar) || 0;

  // Sisa Kas Utama di Kantor Pusat (Brankas / Rekening)
  const sisaKasUtamaKantor = Math.max(0, totalPemasukan - totalDisalurkan - totalReimburseDibayar + totalPengembalian);
  // Total Likuiditas Kas Perusahaan (Kas Kantor + Kas Dipegang Seluruh PJ)
  const totalLikuiditasKas = sisaKasUtamaKantor + totalSaldoPj;

  // Status filter: apakah laporan mencakup seluruh perusahaan (konsolidasi) atau per penanggung jawab spesifik
  const isMenyeluruh = !rekapFilterPj;

  const primaryPjRow = filteredRekapPj.find(
    (r) => String(r.id_karyawan || r.penanggung_jawab?.id_karyawan) === String(rekapFilterPj)
  ) || filteredRekapPj[0];

  const primaryPjName = isMenyeluruh 
    ? 'Seluruh Penanggung Jawab' 
    : (selectedPjObj?.nama || primaryPjRow?.penanggung_jawab?.nama || 'Penanggung Jawab Proyek');

  const primaryProjectName = isMenyeluruh
    ? 'Semua Proyek Lapangan (Konsolidasi Perusahaan)'
    : (primaryPjRow?.daftar_pengeluaran?.[0]?.nama_pekerjaan ||
       primaryPjRow?.penanggung_jawab?.nama_pekerjaan ||
       'Proyek Operasional Lapangan');

  // Format angka ribuan standar akuntansi (tanpa embel-embel Rp agar tabel bersih dan profesional)
  const formatAngka = (val) => {
    const num = Math.abs(Number(val) || 0);
    return new Intl.NumberFormat('id-ID').format(num);
  };

  // Filter daftar penyerahan modal kerja ke PJ
  const daftarPenyaluranDana = (danaKantorList || []).filter((d) => {
    if (d.jenis_transaksi === 'pemasukan_kas') return false;
    if (rekapFilterPj && String(d.id_penanggung_jawab) !== String(rekapFilterPj)) return false;
    return true;
  });

  return (
    <div className="corporate-report-sheet bg-white text-slate-900 font-sans p-4 sm:p-8 max-w-[210mm] mx-auto print:max-w-none print:p-0 print:m-0 text-[10px] leading-normal select-text">
      
      {/* ============================================================== */}
      {/* 1. KOP SURAT RESMI CV. PUTRA ANUGRAH MANDIRI                   */}
      {/* ============================================================== */}
      <div className="official-header-section text-center pb-2 mb-3 print-avoid-break">
        {/* Banner Kop Surat Resmi */}
        <div className="w-full mb-1">
          <img 
            src="/kop-surat.png" 
            alt="Kop Surat Resmi CV. Putra Anugrah Mandiri" 
            className="w-full h-auto object-contain max-h-[125px] mx-auto block"
          />
        </div>

        {/* Info No. Dokumen */}
        <div className="flex justify-between items-center text-[8.5px] text-slate-500 px-1 mt-0.5">
          <span>Klasifikasi: <strong>{isMenyeluruh ? 'Dokumen Keuangan Konsolidasi Perusahaan' : 'Laporan Pertanggungjawaban (LPJ)'}</strong></span>
          <span>No. Dokumen: <strong className="text-slate-800 font-mono">{noDokumen}</strong></span>
        </div>

        {/* Judul Laporan & Periode */}
        <div className="mt-2 pt-2 border-t border-slate-300">
          <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-slate-900 font-serif">
            LAPORAN ARUS KAS &amp; PENGELUARAN OPERASIONAL
          </h2>
          <p className="text-[9.5px] text-slate-600 font-semibold mt-0.5">
            Periode: {periodeText} &bull; Dicetak: {tglCetak}
          </p>
          <div className="inline-block mt-1 py-0.5 px-3 bg-slate-100 border border-slate-300 rounded text-[9px] text-slate-800">
            {isMenyeluruh ? (
              <span>Cakupan Laporan: <strong className="text-slate-900">Konsolidasi Menyeluruh Seluruh Perusahaan</strong> &bull; Proyek: <strong className="text-slate-900">Semua Proyek Lapangan</strong></span>
            ) : (
              <span>Penanggung Jawab: <strong className="text-slate-900">{primaryPjName}</strong> &bull; Proyek: <strong className="text-slate-900">{primaryProjectName}</strong></span>
            )}
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* 2. TABEL ARUS KAS UTAMA (MODEL PERSIS STANDAR HASHMICRO)       */}
      {/* ============================================================== */}
      <section className="mb-5 print-avoid-break">
        <table className="w-full border-collapse border border-slate-700 text-[9.5px] table-fixed">
          {/* Header Tabel (Warna Coral / Peach Lembut) */}
          <thead>
            <tr className="bg-[#fce4ec] border border-slate-700 text-slate-900">
              <th className="border border-slate-700 p-2 text-center font-bold w-[64%]">
                Keterangan
              </th>
              <th colSpan="2" className="border border-slate-700 p-2 text-center font-bold w-[36%]">
                Nominal (Rp)
              </th>
            </tr>
          </thead>
          <tbody>
            {/* -------------------------------------------------------- */}
            {/* KATEGORI A: ARUS KAS MASUK (PENERIMAAN KAS PERUSAHAAN)   */}
            {/* -------------------------------------------------------- */}
            <tr className="bg-[#dce9ec] font-bold italic text-slate-900 border border-slate-700">
              <td colSpan="3" className="p-1.5 border border-slate-700">
                Arus kas yang berasal dari kegiatan penerimaan kas perusahaan
              </td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 border border-slate-600 pl-4 font-medium">
                Kas yang diterima dari modal masuk kas utama kantor
              </td>
              <td className="p-1.5 border border-slate-600 text-right w-[18%]"></td>
              <td className="p-1.5 border border-slate-600 text-right font-medium w-[18%]">
                {formatAngka(totalPemasukan)}
              </td>
            </tr>
            {totalPengembalian > 0 && (
              <tr className="border-b border-slate-600">
                <td className="p-1.5 border border-slate-600 pl-4">
                  Kas yang diterima dari pengembalian sisa uang kas oleh pekerja
                </td>
                <td className="p-1.5 border border-slate-600 text-right">
                  {formatAngka(totalPengembalian)}
                </td>
                <td className="p-1.5 border border-slate-600 text-right"></td>
              </tr>
            )}
            <tr className="border-b border-slate-700 font-bold bg-slate-50">
              <td className="p-1.5 border border-slate-700 font-bold">
                Total penerimaan kas perusahaan
              </td>
              <td className="p-1.5 border border-slate-700 text-right"></td>
              <td className="p-1.5 border border-slate-700 text-right font-bold">
                {formatAngka(totalPemasukan + totalPengembalian)}
              </td>
            </tr>

            {/* -------------------------------------------------------- */}
            {/* KATEGORI B: ARUS KAS KELUAR OPERASIONAL & PENYALURAN PJ  */}
            {/* -------------------------------------------------------- */}
            <tr className="bg-[#dce9ec] font-bold italic text-slate-900 border border-slate-700">
              <td colSpan="3" className="p-1.5 border border-slate-700">
                Arus kas yang berasal dari kegiatan operasional &amp; proyek lapangan
              </td>
            </tr>
            <tr className="border-b border-slate-600 font-bold">
              <td colSpan="3" className="p-1.5 border border-slate-600 font-bold">
                Dikurangi:
              </td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 border border-slate-600 pl-4">
                Kas untuk belanja material &amp; operasional proyek disetujui (Nota Kwitansi Sah)
              </td>
              <td className="p-1.5 border border-slate-600 text-right">
                ({formatAngka(totalBelanjaDisetujui)})
              </td>
              <td className="p-1.5 border border-slate-600 text-right"></td>
            </tr>
            <tr className="border-b border-slate-600">
              <td className="p-1.5 border border-slate-600 pl-4">
                Kas modal operasional masih dipegang {isMenyeluruh ? 'seluruh penanggung jawab' : `penanggung jawab (${primaryPjName})`} (Wajib LPJ)
              </td>
              <td className="p-1.5 border border-slate-600 text-right">
                ({formatAngka(totalSaldoPj)})
              </td>
              <td className="p-1.5 border border-slate-600 text-right"></td>
            </tr>
            {totalReimburseDibayar > 0 && (
              <tr className="border-b border-slate-600">
                <td className="p-1.5 border border-slate-600 pl-4">
                  Kas untuk membayar reimbursement uang pribadi karyawan
                </td>
                <td className="p-1.5 border border-slate-600 text-right">
                  ({formatAngka(totalReimburseDibayar)})
                </td>
                <td className="p-1.5 border border-slate-600 text-right"></td>
              </tr>
            )}
            <tr className="border-b border-slate-700 font-bold bg-slate-50">
              <td className="p-1.5 border border-slate-700 font-bold">
                Arus kas keluar untuk operasional yang disalurkan / dibelanjakan
              </td>
              <td className="p-1.5 border border-slate-700 text-right"></td>
              <td className="p-1.5 border border-slate-700 text-right font-bold">
                ({formatAngka(totalDisalurkan + totalReimburseDibayar)})
              </td>
            </tr>

            {/* -------------------------------------------------------- */}
            {/* KATEGORI C: ARUS KAS BERSIH DARI KEGIATAN OPERASIONAL     */}
            {/* -------------------------------------------------------- */}
            <tr className="border-b border-slate-700 font-bold bg-slate-100">
              <td className="p-1.5 border border-slate-700 font-bold">
                Arus kas bersih operasional kantor (Sisa di Kas Utama Kantor)
              </td>
              <td className="p-1.5 border border-slate-700 text-right"></td>
              <td className="p-1.5 border border-slate-700 text-right font-bold">
                {formatAngka(sisaKasUtamaKantor)}
              </td>
            </tr>

            {/* -------------------------------------------------------- */}
            {/* KATEGORI D: REKONSILIASI SALDO AKHIR (HIGHLIGHT KUNING)  */}
            {/* Persis 3 baris bawah contoh gambar HashMicro             */}
            {/* -------------------------------------------------------- */}
            <tr className="bg-[#fff3cd] border-t-2 border-slate-800 font-bold">
              <td className="p-1.5 border border-slate-700 font-bold">
                Saldo kas utama tersimpan di kantor (Brankas / Rekening Pusat)
              </td>
              <td className="p-1.5 border border-slate-700 text-right"></td>
              <td className="p-1.5 border border-slate-700 text-right font-bold">
                {formatAngka(sisaKasUtamaKantor)}
              </td>
            </tr>
            <tr className="bg-[#fff3cd] font-bold">
              <td className="p-1.5 border border-slate-700 font-bold">
                Saldo kas operasional masih dipegang {isMenyeluruh ? 'seluruh penanggung jawab' : `penanggung jawab (${primaryPjName})`}
              </td>
              <td className="p-1.5 border border-slate-700 text-right"></td>
              <td className="p-1.5 border border-slate-700 text-right font-bold">
                {formatAngka(totalSaldoPj)}
              </td>
            </tr>
            <tr className="bg-[#ffeaa7] font-black border-t-2 border-slate-900 text-[10px]">
              <td className="p-2 border border-slate-700 font-black uppercase">
                Total Saldo Kas Tersedia Perusahaan (Likuiditas Kas Kantor + PJ)
              </td>
              <td className="p-2 border border-slate-700 text-right"></td>
              <td className="p-2 border border-slate-700 text-right font-black">
                {formatAngka(totalLikuiditasKas)}
              </td>
            </tr>
          </tbody>
        </table>

        {/* Catatan Kewajiban Reimbursement jika ada */}
        {totalReimburseBelum > 0 && (
          <div className="mt-2 p-2 bg-slate-50 border border-slate-400 rounded text-[8.5px] text-slate-700 flex justify-between items-center">
            <span>
              <strong>Catatan Kewajiban / Hutang:</strong> Klaim reimbursement uang pribadi karyawan yang belum dibayarkan perusahaan
            </span>
            <span className="font-bold text-slate-900 font-mono">
              Rp {formatAngka(totalReimburseBelum)}
            </span>
          </div>
        )}
      </section>

      {/* ============================================================== */}
      {/* 3. TABEL REKAPITULASI DANA PER PENANGGUNG JAWAB               */}
      {/* ============================================================== */}
      <section className="mb-4 print-avoid-break">
        <div className="bg-slate-100 border border-slate-400 px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-900 flex justify-between items-center">
          <span>Rekapitulasi Kas &amp; Pertanggungjawaban per Penanggung Jawab</span>
          <span className="text-[8px] font-normal text-slate-600">Total: {filteredRekapPj.length} Penanggung Jawab</span>
        </div>
        <table className="w-full border-collapse border border-slate-400 text-[8.5px] mt-0.5 table-fixed">
          <thead className="bg-slate-100 font-bold text-slate-900 text-center border-b border-slate-400">
            <tr>
              <th className="border border-slate-400 p-1.5 w-[5%]">No</th>
              <th className="border border-slate-400 p-1.5 text-left w-[24%]">Nama Penanggung Jawab</th>
              <th className="border border-slate-400 p-1.5 text-left w-[25%]">Pekerjaan / Proyek</th>
              <th className="border border-slate-400 p-1.5 text-right w-[15%]">Kas Diterima</th>
              <th className="border border-slate-400 p-1.5 text-right w-[15%]">Belanja Disetujui</th>
              <th className="border border-slate-400 p-1.5 text-right w-[16%]">Sisa Saldo Kas</th>
            </tr>
          </thead>
          <tbody>
            {filteredRekapPj.length === 0 ? (
              <tr>
                <td colSpan="6" className="border border-slate-300 p-2.5 text-center text-slate-500 italic">
                  Tidak ada data penanggung jawab dana kantor untuk parameter filter ini.
                </td>
              </tr>
            ) : (
              filteredRekapPj.map((row, idx) => {
                const proyekName =
                  row.daftar_pengeluaran?.[0]?.nama_pekerjaan ||
                  row.penanggung_jawab?.nama_pekerjaan ||
                  row.nama_pekerjaan ||
                  'Operasional Lapangan';
                const saldo = Number(row.saldo_dipegang || 0);

                return (
                  <tr key={idx} className="border-b border-slate-300 even:bg-slate-50/50">
                    <td className="border border-slate-300 p-1.5 text-center font-medium">{idx + 1}</td>
                    <td className="border border-slate-300 p-1.5">
                      <div className="font-bold text-slate-900">{row.penanggung_jawab?.nama}</div>
                      <div className="text-[7.5px] text-slate-600 font-mono">
                        {row.penanggung_jawab?.kode_karyawan} &bull; {row.penanggung_jawab?.jabatan}
                      </div>
                    </td>
                    <td className="border border-slate-300 p-1.5 text-slate-800 font-medium">
                      {proyekName}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-medium">
                      Rp {formatAngka(row.total_dana_diterima)}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right font-medium">
                      Rp {formatAngka(row.total_pengeluaran)}
                    </td>
                    <td className="border border-slate-300 p-1.5 text-right">
                      <div className="font-black text-slate-900">Rp {formatAngka(saldo)}</div>
                      <div className="text-[7.5px] font-semibold text-slate-600">
                        {saldo > 0 ? 'Wajib LPJ/Disetor' : saldo < 0 ? 'Lebih Pakai' : 'Lunas'}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
            <tr>
              <td colSpan="3" className="border border-slate-400 p-1.5 text-center uppercase">Total Akumulatif</td>
              <td className="border border-slate-400 p-1.5 text-right font-black">Rp {formatAngka(totalRekapDiterima)}</td>
              <td className="border border-slate-400 p-1.5 text-right font-black">Rp {formatAngka(totalRekapBelanja)}</td>
              <td className="border border-slate-400 p-1.5 text-right font-black">Rp {formatAngka(totalRekapSaldo)}</td>
            </tr>
          </tfoot>
        </table>
      </section>

      {/* ============================================================== */}
      {/* 4. BAGIAN RINCIAN TRANSAKSI PENYERAHAN DANA & NOTA BELANJA     */}
      {/* ============================================================== */}
      {printIncludeTransactions && (
        <section className="mb-4 print-avoid-break">
          {/* A. Rincian Penyerahan Uang Kas ke PJ */}
          {daftarPenyaluranDana.length > 0 && (
            <div className="mb-3">
              <div className="bg-slate-100 border border-slate-400 px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-900 flex justify-between items-center">
                <span>Rincian Penyerahan Modal Kas Kantor kepada Penanggung Jawab</span>
                <span className="text-[8px] font-normal text-slate-600">Total: {daftarPenyaluranDana.length} Penyerahan</span>
              </div>
              <table className="w-full border-collapse border border-slate-400 text-[8px] mt-0.5 table-fixed">
                <thead className="bg-slate-100 font-bold text-slate-900 text-center border-b border-slate-400">
                  <tr>
                    <th className="border border-slate-400 p-1 w-[5%]">No</th>
                    <th className="border border-slate-400 p-1 w-[15%]">No. Transaksi</th>
                    <th className="border border-slate-400 p-1 w-[12%]">Tanggal</th>
                    <th className="border border-slate-400 p-1 text-left w-[24%]">Penerima Kas (PJ)</th>
                    <th className="border border-slate-400 p-1 text-left w-[26%]">Keperluan / Proyek</th>
                    <th className="border border-slate-400 p-1 text-right w-[18%]">Jumlah Diserahkan</th>
                  </tr>
                </thead>
                <tbody>
                  {daftarPenyaluranDana.map((d, idx) => (
                    <tr key={idx} className="border-b border-slate-300 even:bg-slate-50/50">
                      <td className="border border-slate-300 p-1 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 font-mono text-[7.5px] text-center text-slate-700">
                        {d.nomor_transaksi || `DNK-${d.id_dana}`}
                      </td>
                      <td className="border border-slate-300 p-1 text-center text-slate-700">{d.tanggal || '-'}</td>
                      <td className="border border-slate-300 p-1 font-bold text-slate-900">
                        {d.nama_penanggung_jawab || d.penerima_dana || '-'}
                      </td>
                      <td className="border border-slate-300 p-1 text-slate-800">
                        {d.nama_pekerjaan ? `${d.nama_pekerjaan} - ` : ''}{d.tujuan_penggunaan || d.keterangan || 'Modal Belanja Operasional'}
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-bold text-slate-900">
                        Rp {formatAngka(d.nominal)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* B. Rincian Realisasi Belanja Lapangan Disetujui */}
          <div>
            <div className="bg-slate-100 border border-slate-400 px-3 py-1 font-bold text-[9px] uppercase tracking-wider text-slate-900 flex justify-between items-center">
              <span>Rincian Realisasi Belanja Lapangan Disetujui (Kwitansi &amp; Nota Sah)</span>
              <span className="text-[8px] font-normal text-slate-600">Total: {filteredPrintTransactions.length} Transaksi</span>
            </div>
            <table className="w-full border-collapse border border-slate-400 text-[8px] mt-0.5 table-fixed">
              <thead className="bg-slate-100 font-bold text-slate-900 text-center border-b border-slate-400">
                <tr>
                  <th className="border border-slate-400 p-1 w-[5%]">No</th>
                  <th className="border border-slate-400 p-1 w-[15%]">No. Transaksi</th>
                  <th className="border border-slate-400 p-1 w-[12%]">Tanggal</th>
                  <th className="border border-slate-400 p-1 text-left w-[24%]">Pelaksana Belanja (PJ)</th>
                  <th className="border border-slate-400 p-1 text-left w-[26%]">Barang / Keterangan Nota</th>
                  <th className="border border-slate-400 p-1 text-right w-[18%]">Nominal Belanja</th>
                </tr>
              </thead>
              <tbody>
                {filteredPrintTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="border border-slate-300 p-2 text-center text-slate-500 italic">
                      Tidak ada transaksi pengeluaran disetujui untuk filter yang ditentukan.
                    </td>
                  </tr>
                ) : (
                  filteredPrintTransactions.map((tx, idx) => (
                    <tr key={idx} className="border-b border-slate-300 even:bg-slate-50/50">
                      <td className="border border-slate-300 p-1 text-center font-medium">{idx + 1}</td>
                      <td className="border border-slate-300 p-1 font-mono text-[7.5px] text-center text-slate-700">
                        {tx.nomor_transaksi || `TX-${tx.id_pengeluaran}`}
                      </td>
                      <td className="border border-slate-300 p-1 text-center text-slate-700">{tx.tanggal || '-'}</td>
                      <td className="border border-slate-300 p-1 font-bold text-slate-900">
                        {tx.nama_pj || tx.nama_karyawan || '-'}
                      </td>
                      <td className="border border-slate-300 p-1 text-slate-800">
                        <span className="font-semibold block">{tx.kategori || 'Operasional'}</span>
                        <span className="text-slate-600 text-[7px] block">{tx.keterangan || '-'}</span>
                      </td>
                      <td className="border border-slate-300 p-1 text-right font-bold text-slate-900">
                        Rp {formatAngka(tx.nominal_disetujui || tx.nominal || 0)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-900 text-slate-900">
                <tr>
                  <td colSpan="5" className="border border-slate-400 p-1 text-right uppercase">
                    Total Nilai Belanja Disetujui
                  </td>
                  <td className="border border-slate-400 p-1 text-right font-black">
                    Rp {formatAngka(totalFilteredPrintNominal)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </section>
      )}

      {/* ============================================================== */}
      {/* 5. LEMBAR PENGESAHAN & TANDA TANGAN RESMI (KOTA PADANG)        */}
      {/* ============================================================== */}
      <section className="print-avoid-break pt-3 mt-4 border-t-2 border-slate-900">
        <div className="text-right text-[9px] font-semibold text-slate-800 mb-2">
          Padang, {tglCetak}
        </div>
        <div className="grid grid-cols-3 gap-4 text-center text-xs">
          <div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
              {isMenyeluruh ? 'Dibuat / Dilaporkan Oleh:' : 'Yang Mempertanggungjawabkan (PJ):'}
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[9.5px]">
              {isMenyeluruh ? (currentUser?.nama || 'Administrator Keuangan') : primaryPjName}
            </div>
            <div className="text-[7.5px] text-slate-500">
              {isMenyeluruh ? 'Bagian Keuangan & Administrasi' : 'Teknisi / Penanggung Jawab Proyek'}
            </div>
            <div className="h-12 flex items-center justify-center">
              <span className="text-[7px] text-slate-300 italic">[ Tanda Tangan ]</span>
            </div>
            <div className="border-t border-slate-900 font-bold text-slate-900 pt-0.5 mx-auto max-w-[130px] text-[9px]">
              ( {isMenyeluruh ? (currentUser?.nama || 'Administrator') : primaryPjName} )
            </div>
          </div>

          <div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
              Diperiksa Oleh:
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[9.5px]">
              Bendahara Perusahaan
            </div>
            <div className="text-[7.5px] text-slate-500">
              Finance &amp; Kasir Kantor
            </div>
            <div className="h-12 flex items-center justify-center">
              <span className="text-[7px] text-slate-300 italic">[ Tanda Tangan ]</span>
            </div>
            <div className="border-t border-slate-900 font-bold text-slate-900 pt-0.5 mx-auto max-w-[130px] text-[9px]">
              ( .................................... )
            </div>
          </div>

          <div>
            <div className="text-[8px] font-bold text-slate-600 uppercase tracking-wider">
              Mengetahui &amp; Menyetujui:
            </div>
            <div className="font-bold text-slate-900 mt-0.5 text-[9.5px]">
              Direktur Utama
            </div>
            <div className="text-[7.5px] text-slate-500">
              CV. Putra Anugrah Mandiri
            </div>
            <div className="h-12 flex items-center justify-center">
              <span className="text-[7px] text-slate-300 italic">[ Tanda Tangan &amp; Cap ]</span>
            </div>
            <div className="border-t border-slate-900 font-bold text-slate-900 pt-0.5 mx-auto max-w-[130px] text-[9px]">
              ( Direktur CV. PAM )
            </div>
          </div>
        </div>
      </section>

      {/* Footer Dokumen Resmi */}
      <div className="border-t border-slate-300 mt-4 pt-1.5 flex items-center justify-between text-[7px] text-slate-500 print-avoid-break">
        <div>Sistem Pencatatan Kerja CV. Putra Anugrah Mandiri &bull; Dokumen Resmi Internal Perusahaan</div>
        <div>Ref: {noDokumen} &bull; Dicetak di Kota Padang</div>
      </div>
    </div>
  );
}
