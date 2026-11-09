import React, { useState, useEffect } from 'react';
import { 
  Wallet, 
  Printer, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  Receipt, 
  Clock, 
  CheckCircle2, 
  Building2, 
  CreditCard, 
  Banknote, 
  Eye, 
  PlusCircle, 
  MinusCircle 
} from 'lucide-react';
import { GajiService, AbsensiService, PengeluaranService, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import { 
  angkaTerbilang, 
  formatPeriodeIndo, 
  generateNoDokumen 
} from '../../utils/printHelpers';

export default function GajiKaryawanPage({ currentUser }) {
  const [selectedPeriode, setSelectedPeriode] = useState(new Date().toISOString().slice(0, 7));
  const [slipGaji, setSlipGaji] = useState(null);
  const [monthAbsensi, setMonthAbsensi] = useState([]);
  const [monthExpenses, setMonthExpenses] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Preview Struk / Bukti Transfer
  const [previewImage, setPreviewImage] = useState(null);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [gajiData, absensiData, pengeluaranData] = await Promise.all([
        GajiService.getByPeriode(selectedPeriode).catch(() => null),
        AbsensiService.getAll({ id_karyawan: currentUser?.id_karyawan }).catch(() => []),
        PengeluaranService.getAll({ id_karyawan: currentUser?.id_karyawan }).catch(() => []),
      ]);

      // Filter slip gaji milik karyawan yang sedang login
      const mySlip = Array.isArray(gajiData) 
        ? gajiData.find(g => Number(g.id_karyawan) === Number(currentUser?.id_karyawan))
        : (gajiData && Number(gajiData.id_karyawan) === Number(currentUser?.id_karyawan) ? gajiData : null);
      setSlipGaji(mySlip);

      // Data absensi & pengeluaran yang sudah disetujui di periode ini
      const validAbsensi = (absensiData || []).filter(
        a => a.status_verifikasi === 'disetujui' && a.tanggal?.startsWith(selectedPeriode)
      );
      setMonthAbsensi(validAbsensi);

      const validExpenses = (pengeluaranData || []).filter(
        p => p.jenis_dana === 'pribadi' && p.status_verifikasi === 'disetujui' && p.tanggal?.startsWith(selectedPeriode)
      );
      setMonthExpenses(validExpenses);

    } catch (err) {
      console.error('Gagal memuat slip gaji:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriode, currentUser]);

  const totalJamDisetujui = monthAbsensi.reduce((acc, curr) => acc + (Number(curr.durasi_jam) || 0), 0);
  const tarif = Number(currentUser?.tarif_per_jam) || 50000;
  const upahKerja = slipGaji?.total_upah ? Number(slipGaji.total_upah) : (totalJamDisetujui * tarif);
  const totalReimburse = slipGaji?.total_ganti ? Number(slipGaji.total_ganti) : monthExpenses.reduce((acc, curr) => acc + Number(curr.nominal), 0);
  const bonus = Number(slipGaji?.bonus || 0);
  const potongan = Number(slipGaji?.potongan || 0);
  const totalDibayar = slipGaji?.total_dibayar 
    ? Number(slipGaji.total_dibayar) 
    : Math.max(0, upahKerja + totalReimburse + bonus - potongan);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA & FILTER BULAN (HANYA LAYAR WEB)         */}
      {/* ======================================================== */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Portal Karyawan Lapangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Wallet className="w-7 h-7 text-[#b81d52]" />
            <span>Slip Gaji Pribadi</span>
          </h1>
          <p className="text-sm text-slate-500">
            Rincian resmi pembayaran upah jam kerja terverifikasi, penggantian dana pribadi, bonus insentif, dan potongan kasbon.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="month"
            value={selectedPeriode}
            onChange={(e) => setSelectedPeriode(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
          />
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. CARD SLIP GAJI RESMI & TOMBOL CETAK                  */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6 print-avoid-break" id="printable-karyawan-slip">
        
        {/* Kop Surat Resmi (Print Only) */}
        <div className="print-only">
          <PrintHeader 
            title="SLIP GAJI RESMI KARYAWAN"
            subtitle="Bukti Sah Penerimaan Upah Jam Kerja Lapangan & Penggantian Dana Operasional"
            noDokumen={generateNoDokumen('SLIP-KARYAWAN', selectedPeriode, currentUser?.id_karyawan)}
            periode={selectedPeriode}
          />
        </div>

        {/* Web Top Header (Hanya di Layar) */}
        <div className="no-print border-b border-slate-200 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold tracking-widest text-[#b81d52] uppercase bg-pink-50 px-2.5 py-1 rounded-md">
              SLIP GAJI RESMI KARYAWAN
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-2">
              Penghasilan Periode {selectedPeriode}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Rincian pembayaran upah jam kerja lapangan dan penggantian dana pribadi (reimbursement).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => window.print()}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-2 cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Slip Gaji (PDF)</span>
            </button>
          </div>
        </div>

        {/* Metadata Karyawan Tabel Resmi (Print Only) */}
        <div className="print-only print-avoid-break mb-3">
          <table className="w-full text-xs">
            <tbody>
              <tr>
                <td className="bg-slate-100 font-bold w-1/4">Nama Karyawan</td>
                <td className="font-extrabold text-slate-900 w-1/4">{currentUser?.nama}</td>
                <td className="bg-slate-100 font-bold w-1/4">Periode Penggajian</td>
                <td className="font-bold text-slate-900 w-1/4">{formatPeriodeIndo(selectedPeriode)}</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold">Jabatan / Profesi</td>
                <td>{currentUser?.jabatan || 'Tenaga Kerja Lapangan'}</td>
                <td className="bg-slate-100 font-bold">Tarif Upah Per Jam</td>
                <td className="font-bold text-slate-900">{formatRupiah(tarif)} / Jam</td>
              </tr>
              <tr>
                <td className="bg-slate-100 font-bold">Status Pembayaran</td>
                <td className="font-extrabold uppercase">
                  {slipGaji?.status_bayar === 'sudah' 
                    ? `✓ LUNAS (${slipGaji.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer Bank'})` 
                    : '⏳ DALAM PROSES'}
                </td>
                <td className="bg-slate-100 font-bold">Waktu Pembayaran</td>
                <td>{slipGaji?.tanggal_bayar || (slipGaji?.status_bayar === 'sudah' ? 'Telah Dibayarkan' : 'Menunggu Jadwal')}</td>
              </tr>
              {slipGaji?.catatan_bayar && (
                <tr>
                  <td className="bg-slate-100 font-bold">No. Ref / Catatan</td>
                  <td colSpan="3">{slipGaji.catatan_bayar}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Info Karyawan & Status Bayar (Layar Web Saja) */}
        <div className="no-print grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Nama Karyawan</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{currentUser?.nama}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Jabatan</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{currentUser?.jabatan}</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Tarif Jam</span>
            <div className="font-extrabold text-slate-900 mt-0.5">{formatRupiah(tarif)} / Jam</div>
          </div>
          <div>
            <span className="text-slate-400 text-[10px] uppercase font-semibold">Status Pembayaran</span>
            <div className="mt-0.5">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold inline-block ${
                slipGaji?.status_bayar === 'sudah'
                  ? 'bg-emerald-100 text-emerald-800'
                  : 'bg-amber-100 text-amber-800'
              }`}>
                {slipGaji?.status_bayar === 'sudah' ? '✓ LUNAS DIBAYARKAN' : '⏳ DALAM PROSES'}
              </span>
            </div>
          </div>
        </div>

        {/* Informasi Pembayaran Resmi Bila Sudah Lunas (Layar Web Saja) */}
        {slipGaji?.status_bayar === 'sudah' && (
          <div className="no-print bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-emerald-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Gaji Periode Ini Telah Ditransfer / Dibayarkan</span>
              </div>
              <div className="inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900 capitalize">
                {slipGaji.metode_bayar === 'tunai' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                <span>Metode: {slipGaji.metode_bayar === 'tunai' ? 'Tunai (Cash)' : 'Transfer Bank'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-[11px] pt-1">
              {slipGaji.tanggal_bayar && (
                <div>
                  <span className="text-slate-400">Waktu Pembayaran: </span>
                  <span className="font-semibold">{slipGaji.tanggal_bayar}</span>
                </div>
              )}
              {slipGaji.catatan_bayar && (
                <div>
                  <span className="text-slate-400">Catatan / No. Ref: </span>
                  <span className="font-semibold text-slate-800">{slipGaji.catatan_bayar}</span>
                </div>
              )}
            </div>

            {slipGaji.bukti_bayar && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewImage(getFileUrl(slipGaji.bukti_bayar))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-sm cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Foto Struk / Bukti Transfer</span>
                </button>
              </div>
            )}
          </div>
        )}

        {/* Rincian Komponen Perhitungan Upah, Reimbursement, Bonus & Kasbon */}
        <div className="space-y-3 pt-2 print-avoid-break">
          <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider">
            Rincian Komponen Penghasilan:
          </h3>

          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-slate-50">
              <div>
                <div className="font-bold text-slate-800">1. Upah Jam Kerja Disetujui</div>
                <div className="text-[10.5px] text-slate-500 mt-0.5">
                  {totalJamDisetujui.toFixed(2)} Jam kerja sah × {formatRupiah(tarif)}
                </div>
              </div>
              <div className="font-extrabold text-slate-900 text-sm">
                {formatRupiah(upahKerja)}
              </div>
            </div>

            <div className="flex items-center justify-between p-3 border-b border-slate-200">
              <div>
                <div className="font-bold text-slate-800">2. Penggantian Uang Material (Reimbursement)</div>
                <div className="text-[10.5px] text-slate-500 mt-0.5">
                  Nota belanja material/operasional pribadi yang disetujui Admin ({monthExpenses.length} Nota)
                </div>
              </div>
              <div className="font-extrabold text-amber-700 text-sm">
                + {formatRupiah(totalReimburse)}
              </div>
            </div>

            {/* Bonus jika ada */}
            {bonus > 0 && (
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-emerald-50/50">
                <div>
                  <div className="font-bold text-emerald-800 flex items-center space-x-1">
                    <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                    <span>3. Bonus & Insentif Lapangan</span>
                  </div>
                  {slipGaji?.catatan_penyesuaian && (
                    <div className="text-[10.5px] text-slate-500 mt-0.5 italic">
                      {slipGaji.catatan_penyesuaian}
                    </div>
                  )}
                </div>
                <div className="font-extrabold text-emerald-700 text-sm">
                  + {formatRupiah(bonus)}
                </div>
              </div>
            )}

            {/* Potongan kasbon jika ada */}
            {potongan > 0 && (
              <div className="flex items-center justify-between p-3 border-b border-slate-200 bg-rose-50/50">
                <div>
                  <div className="font-bold text-rose-800 flex items-center space-x-1">
                    <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                    <span>4. Potongan Pinjaman / Kasbon</span>
                  </div>
                  {slipGaji?.catatan_penyesuaian && (
                    <div className="text-[10.5px] text-slate-500 mt-0.5 italic">
                      {slipGaji.catatan_penyesuaian}
                    </div>
                  )}
                </div>
                <div className="font-extrabold text-rose-700 text-sm">
                  - {formatRupiah(potongan)}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3.5 bg-pink-50 border-t-2 border-slate-900">
              <div>
                <div className="text-xs font-black text-slate-900 uppercase tracking-wider">
                  TOTAL DITERIMA (TAKE HOME PAY)
                </div>
                <div className="text-[10px] text-slate-500 mt-0.5">
                  Upah Kerja + Reimburse {bonus > 0 ? '+ Bonus' : ''} {potongan > 0 ? '- Kasbon' : ''}
                </div>
              </div>
              <div className="text-xl font-black text-[#b81d52]">
                {formatRupiah(totalDibayar)}
              </div>
            </div>

            {/* Terbilang Resmi */}
            <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-xs">
              <span className="font-bold text-slate-700">Jumlah Terbilang: </span>
              <span className="italic font-bold text-slate-900 capitalize">
                # {angkaTerbilang(totalDibayar)} #
              </span>
            </div>
          </div>
        </div>

        {/* TABEL 1: DAFTAR SESI KERJA SAH */}
        <div className="pt-2 print-avoid-break">
          <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
            <Clock className="w-4 h-4 text-[#b81d52]" />
            <span>Daftar Sesi Kerja Sah Periode Ini ({monthAbsensi.length} Hari):</span>
          </h4>
          <div className="overflow-x-auto border border-slate-200 rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50">
                <tr className="border-b border-slate-200/80 text-slate-500 uppercase tracking-wider text-[10px]">
                  <th className="px-3 py-2 text-center w-8">No</th>
                  <th className="px-3 py-2 font-bold">Tanggal</th>
                  <th className="px-3 py-2 font-bold">Proyek Lapangan</th>
                  <th className="px-3 py-2 font-bold text-center">Jam Kerja</th>
                  <th className="px-3 py-2 font-bold text-center">Durasi</th>
                  <th className="px-3 py-2 font-bold text-right">Gaji Yang Diterima</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {monthAbsensi.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">
                      Belum ada sesi kerja yang disetujui untuk periode {selectedPeriode}.
                    </td>
                  </tr>
                ) : (
                  monthAbsensi.map((a, idx) => (
                    <tr key={a.id_absensi} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{a.tanggal}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{a.nama_pekerjaan || 'Proyek Umum'}</td>
                      <td className="px-3 py-2 text-center text-slate-500 font-mono">
                        {a.jam_masuk?.slice(0, 5)} - {a.jam_pulang?.slice(0, 5)}
                      </td>
                      <td className="px-3 py-2 text-center font-bold text-[#b81d52]">{a.durasi_jam || 0} Jam</td>
                      <td className="px-3 py-2 text-right font-extrabold text-emerald-800 text-xs">
                        {formatRupiah(a.gaji_diterima || Number(a.durasi_jam || 0) * tarif)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
              {monthAbsensi.length > 0 && (
                <tfoot>
                  <tr className="bg-slate-100 font-bold">
                    <td colSpan="4" className="px-3 py-2 text-right font-extrabold uppercase">Total Jam Kerja Sah:</td>
                    <td className="px-3 py-2 text-center font-black text-[#b81d52]">{totalJamDisetujui.toFixed(2)} Jam</td>
                    <td className="px-3 py-2 text-right font-black text-emerald-800">{formatRupiah(upahKerja)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>

        {/* TABEL 2: DAFTAR NOTA REIMBURSEMENT SAH */}
        {monthExpenses.length > 0 && (
          <div className="pt-2 print-avoid-break">
            <h4 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-2 flex items-center space-x-1.5">
              <Receipt className="w-4 h-4 text-amber-600" />
              <span>Daftar Nota Reimbursement Sah Periode Ini ({monthExpenses.length} Nota):</span>
            </h4>
            <div className="overflow-x-auto border border-amber-200 rounded-xl">
              <table className="w-full text-left text-xs">
                <thead className="bg-amber-50/50">
                  <tr className="border-b border-amber-200/60 text-amber-900 uppercase tracking-wider text-[10px]">
                    <th className="px-3 py-2 text-center w-8">No</th>
                    <th className="px-3 py-2 font-bold">Tanggal</th>
                    <th className="px-3 py-2 font-bold">Proyek</th>
                    <th className="px-3 py-2 font-bold">Keterangan</th>
                    <th className="px-3 py-2 font-bold text-right">Nominal</th>
                    <th className="px-3 py-2 font-bold text-center no-print">Bukti Nota</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {monthExpenses.map((p, idx) => (
                    <tr key={p.id_pengeluaran} className="hover:bg-slate-50/70">
                      <td className="px-3 py-2 text-center font-bold text-slate-400">{idx + 1}</td>
                      <td className="px-3 py-2 font-medium">{p.tanggal}</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{p.nama_pekerjaan || 'Operasional'}</td>
                      <td className="px-3 py-2 text-slate-600">{p.keterangan || '-'}</td>
                      <td className="px-3 py-2 text-right font-bold text-amber-700">{formatRupiah(p.nominal)}</td>
                      <td className="px-3 py-2 text-center no-print">
                        {p.foto_kwitansi ? (
                          <button
                            type="button"
                            onClick={() => setPreviewImage(getFileUrl(p.foto_kwitansi))}
                            className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                          >
                            Lihat Foto
                          </button>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-amber-100/70 font-bold">
                    <td colSpan="4" className="px-3 py-2 text-right font-extrabold uppercase">Total Reimbursement:</td>
                    <td className="px-3 py-2 text-right font-black text-amber-800">+{formatRupiah(totalReimburse)}</td>
                    <td className="no-print"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>
        )}

        {/* Pengesahan Tanda Tangan Resmi (Print Only) */}
        <div className="print-only">
          <PrintSignatures 
            namaKaryawan={currentUser?.nama || 'Karyawan'}
            jabatanKaryawan={currentUser?.jabatan || 'Tenaga Kerja Lapangan'}
            type="2-col"
          />
        </div>

      </div>

      {/* Modal Preview Gambar (Struk / Transfer) */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Pratinjau Foto Bukti / Kwitansi"
          maxWidth="max-w-xl"
        >
          <div className="p-2 flex flex-col items-center justify-center space-y-4">
            <img
              src={previewImage}
              alt="Pratinjau Bukti"
              className="max-h-[70vh] w-auto rounded-xl shadow border border-slate-200 object-contain"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="px-4 py-2 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition cursor-pointer"
            >
              Tutup Pratinjau
            </button>
          </div>
        </Modal>
      )}

    </div>
  );
}
