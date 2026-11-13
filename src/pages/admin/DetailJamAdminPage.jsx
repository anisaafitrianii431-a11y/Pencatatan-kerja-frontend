import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  Receipt,
  Printer,
  Calendar,
  Building2,
  Briefcase,
  User,
  CreditCard,
  Banknote,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
  PlusCircle,
  MinusCircle
} from 'lucide-react';
import { GajiService, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import { 
  angkaTerbilang, 
  formatPeriodeIndo, 
  generateNoDokumen,
  formatTanggalCetak,
  getJakartaCurrentPeriode
} from '../../utils/printHelpers';

export default function DetailJamAdminPage({ currentUser, query = {} }) {
  const navigate = useNavigate();
  // Ambil parameter dari query URL hash (#/admin/detail-jam?id_karyawan=1&periode=2026-11&id_gaji=4)
  const initialKaryawanId = query.id_karyawan ? Number(query.id_karyawan) : 0;
  const initialPeriode = query.periode || getJakartaCurrentPeriode();
  const initialGajiId = query.id_gaji ? Number(query.id_gaji) : 0;

  const [periode, setPeriode] = useState(initialPeriode);
  const [idKaryawan, setIdKaryawan] = useState(initialKaryawanId);
  const [idGaji, setIdGaji] = useState(initialGajiId);

  // Data gaji karyawan terkait & daftar seluruh pekerja periode ini
  const [allGajiList, setAllGajiList] = useState([]);
  const [gajiInfo, setGajiInfo] = useState(null);
  const [absensiList, setAbsensiList] = useState([]);
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');

  // Modal Preview Foto / Struk
  const [previewImage, setPreviewImage] = useState(null);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0
    }).format(val || 0);
  };

  const loadDetailData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      // 1. Ambil daftar rekap gaji periode ini untuk dropdown switcher
      const gajiData = await GajiService.getByPeriode(periode);
      const list = Array.isArray(gajiData) ? gajiData : [];
      setAllGajiList(list);

      let targetKaryawanId = idKaryawan;
      let targetGajiId = idGaji;

      if ((targetKaryawanId <= 0 || !list.some(g => Number(g.id_karyawan) === targetKaryawanId)) && list.length > 0) {
        targetKaryawanId = Number(list[0].id_karyawan);
        targetGajiId = Number(list[0].id_gaji);
        setIdKaryawan(targetKaryawanId);
        setIdGaji(targetGajiId);
      }

      const currentGaji = list.find(g => Number(g.id_karyawan) === targetKaryawanId);
      setGajiInfo(currentGaji || null);

      if (targetKaryawanId > 0) {
        // 2. Ambil data rincian absensi harian & pengeluaran yang disetujui
        const detailRes = await GajiService.getDetail({
          id_karyawan: targetKaryawanId,
          periode: periode,
          id_gaji: targetGajiId
        });

        setAbsensiList(detailRes?.absensi || []);
        setPengeluaranList(detailRes?.pengeluaran || []);
      } else {
        setAbsensiList([]);
        setPengeluaranList([]);
      }
    } catch (err) {
      console.error('Gagal memuat detail:', err);
      setErrorMsg(err.message || 'Gagal memuat data rincian jam kerja');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDetailData();
  }, [periode, idKaryawan, idGaji]);

  const totalJamSah = absensiList.reduce((acc, curr) => acc + (Number(curr.durasi_jam) || 0), 0);
  const totalReimburseSah = pengeluaranList.reduce((acc, curr) => acc + (Number(curr.nominal) || 0), 0);
  const tarif = Number(gajiInfo?.tarif || 50000);
  const upahPokok = totalJamSah * tarif;
  const bonus = Number(gajiInfo?.bonus || 0);
  const potongan = Number(gajiInfo?.potongan || 0);
  const totalGajiKeseluruhan = gajiInfo?.total_dibayar 
    ? Number(gajiInfo.total_dibayar) 
    : Math.max(0, upahPokok + totalReimburseSah + bonus - potongan);

  const noDokumen = generateNoDokumen('AUDIT-JAM', periode, gajiInfo?.id_karyawan || idKaryawan);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. TOP HEADER & NAVIGASI KEMBALI (HANYA LAYAR WEB)       */}
      {/* ======================================================== */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={() => navigate('/admin/gaji')}
            className="p-2.5 rounded-xl border border-slate-200 hover:border-[#b81d52] hover:bg-pink-50 text-slate-600 hover:text-[#b81d52] transition cursor-pointer flex items-center justify-center shadow-xs"
            title="Kembali ke Halaman Penggajian"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <div className="inline-flex items-center space-x-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-pink-100 text-[#b81d52] mb-1">
              <span>Halaman Khusus Detail Jam Kerja</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center space-x-2">
              <Clock className="w-6 h-6 text-[#b81d52]" />
              <span>Detail Sesi Kerja & Reimbursement</span>
            </h1>
            <p className="text-xs text-slate-500">
              Audit rincian harian jam kerja disetujui dan nota belanja material untuk dasar penggajian.
            </p>
          </div>
        </div>

        {/* Action Buttons: Periode, Segarkan & Cetak */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Switcher Karyawan */}
          {allGajiList.length > 0 && (
            <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
              <User className="w-4 h-4 text-slate-400" />
              <select
                value={idKaryawan}
                onChange={(e) => {
                  const newId = Number(e.target.value);
                  setIdKaryawan(newId);
                  const found = allGajiList.find(g => Number(g.id_karyawan) === newId);
                  setIdGaji(found ? Number(found.id_gaji) : 0);
                  navigate(`/admin/detail-jam?id_karyawan=${newId}&periode=${periode}&id_gaji=${found ? found.id_gaji : ''}`);
                }}
                className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none cursor-pointer"
              >
                {allGajiList.map((g) => (
                  <option key={g.id_karyawan} value={g.id_karyawan}>
                    {g.nama_karyawan} ({g.total_jam} Jam)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center space-x-1.5 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
            <Calendar className="w-4 h-4 text-slate-400" />
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="text-xs font-bold text-slate-800 bg-transparent focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={loadDetailData}
            className="p-2 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 hover:bg-slate-50 rounded-xl transition shadow-xs cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-xs transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rincian (PDF)</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KOP SURAT RESMI PERUSAHAAN (PRINT ONLY - KHUSUS CETAK)   */}
      {/* ======================================================== */}
      <div className="print-only">
        <PrintHeader 
          title="REKAPITULASI AUDIT JAM KERJA & PENGGAJIAN LAPANGAN"
          subtitle="Dokumen Resmi Verifikasi Absensi Harian, Tarif Efektif & Penggantian Biaya Operasional"
          noDokumen={noDokumen}
          periode={periode}
        />
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="no-print p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center space-x-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. SUMMARY CARD: IDENTITAS & KOMPONEN GAJI (WEB SCREEN)  */}
      {/* ======================================================== */}
      <div className="no-print bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Pekerja Lapangan</span>
            <div className="font-extrabold text-slate-900 text-sm mt-0.5">
              {gajiInfo?.nama_karyawan || 'Karyawan'}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-slate-400" />
              <span>{gajiInfo?.jabatan || 'Pekerja'}</span>
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-pink-50/60 border border-pink-100">
            <span className="text-[#b81d52] text-[10px] font-bold uppercase tracking-wider block">Total Jam Kerja Sah</span>
            <div className="font-black text-[#b81d52] text-lg mt-0.5">
              {totalJamSah.toFixed(2)} Jam
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              Tarif: {formatRupiah(gajiInfo?.tarif || 50000)}/Jam
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-pink-50/70 border border-pink-200">
            <span className="text-[#b81d52] text-[10px] font-bold uppercase tracking-wider block">Total Gaji Keseluruhan</span>
            <div className="font-black text-[#b81d52] text-lg mt-0.5">
              {formatRupiah(totalGajiKeseluruhan)}
            </div>
            <div className="text-[11px] text-slate-500 mt-0.5">
              {totalReimburseSah > 0 
                ? `Termasuk reimburse ${formatRupiah(totalReimburseSah)}`
                : 'Take Home Pay Periode Ini'}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
            <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Status Gaji Periode Ini</span>
            <div className="mt-1">
              <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider inline-block ${
                gajiInfo?.status_bayar === 'sudah'
                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                  : 'bg-amber-100 text-amber-800 border border-amber-200'
              }`}>
                {gajiInfo?.status_bayar === 'sudah' ? '✓ Sudah Dibayar' : '⏳ Belum Bayar'}
              </span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 capitalize">
              {gajiInfo?.metode_bayar === 'tunai' ? '💵 Tunai (Cash)' : '🏦 Transfer Bank'}
            </div>
          </div>
        </div>

        {/* Rincian Penyesuaian (Bonus & Kasbon) Jika Ada */}
        {(Number(gajiInfo?.bonus || 0) > 0 || Number(gajiInfo?.potongan || 0) > 0) && (
          <div className="bg-slate-50 border border-slate-200 p-3.5 rounded-xl text-xs flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-700">Penyesuaian Gaji:</span>
              {Number(gajiInfo?.bonus || 0) > 0 && (
                <span className="text-emerald-700 font-bold bg-emerald-100 border border-emerald-200 px-2.5 py-0.5 rounded-md">
                  + Bonus: {formatRupiah(gajiInfo.bonus)}
                </span>
              )}
              {Number(gajiInfo?.potongan || 0) > 0 && (
                <span className="text-rose-700 font-bold bg-rose-100 border border-rose-200 px-2.5 py-0.5 rounded-md">
                  - Kasbon: {formatRupiah(gajiInfo.potongan)}
                </span>
              )}
            </div>
            {gajiInfo?.catatan_penyesuaian && (
              <span className="text-slate-500 italic text-[11px]">
                Keterangan: "{gajiInfo.catatan_penyesuaian}"
              </span>
            )}
          </div>
        )}

        {/* Informasi Pembayaran Resmi Bila Sudah Lunas */}
        {gajiInfo?.status_bayar === 'sudah' && (
          <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl text-xs space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="font-bold text-emerald-900 flex items-center space-x-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Pembayaran Gaji Periode Ini Telah Lunas Diberikan</span>
              </div>
              <div className="inline-flex items-center space-x-1 text-[11px] font-bold px-2.5 py-0.5 rounded-md bg-emerald-200 text-emerald-900 capitalize">
                {gajiInfo.metode_bayar === 'tunai' ? <Banknote className="w-3.5 h-3.5" /> : <CreditCard className="w-3.5 h-3.5" />}
                <span>Metode: {gajiInfo.metode_bayar === 'tunai' ? 'Tunai (Cash)' : 'Transfer Bank'}</span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-700 text-[11px]">
              {gajiInfo.tanggal_bayar && (
                <div>
                  <span className="text-slate-400">Waktu Pembayaran: </span>
                  <span className="font-semibold">{gajiInfo.tanggal_bayar}</span>
                </div>
              )}
              {gajiInfo.catatan_bayar && (
                <div>
                  <span className="text-slate-400">Catatan / No. Referensi: </span>
                  <span className="font-semibold text-slate-800">{gajiInfo.catatan_bayar}</span>
                </div>
              )}
            </div>

            {gajiInfo.bukti_bayar && (
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => setPreviewImage(getFileUrl(gajiInfo.bukti_bayar))}
                  className="inline-flex items-center space-x-1 px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs transition shadow-xs cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Lihat Foto Struk / Bukti Transfer</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* ======================================================== */}
      {/* 2B. TABEL METADATA DOKUMEN RESMI (PRINT ONLY - A4 SHEET) */}
      {/* ======================================================== */}
      <div className="print-only print-avoid-break mb-4">
        <table className="w-full text-xs">
          <tbody>
            <tr>
              <td className="bg-slate-100 font-bold w-1/4">Nama Pekerja Lapangan</td>
              <td className="font-extrabold text-slate-900 w-1/4">{gajiInfo?.nama_karyawan || 'Karyawan'}</td>
              <td className="bg-slate-100 font-bold w-1/4">Periode Penggajian</td>
              <td className="font-bold text-slate-900 w-1/4">{formatPeriodeIndo(periode)}</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-bold">Jabatan Pekerja</td>
              <td>{gajiInfo?.jabatan || 'Tenaga Kerja Lapangan'}</td>
              <td className="bg-slate-100 font-bold">Tarif Dasar / Jam</td>
              <td className="font-bold text-slate-900">{formatRupiah(gajiInfo?.tarif || 50000)} / Jam</td>
            </tr>
            <tr>
              <td className="bg-slate-100 font-bold">Proyek Utama Lapangan</td>
              <td>{gajiInfo?.nama_pekerjaan || 'Operasional Lapangan'}</td>
              <td className="bg-slate-100 font-bold">Status Pembayaran</td>
              <td className="font-extrabold uppercase">
                {gajiInfo?.status_bayar === 'sudah' 
                  ? `✓ LUNAS (${gajiInfo.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer Bank'})` 
                  : '⏳ BELUM DIBAYARKAN'}
              </td>
            </tr>
            {gajiInfo?.status_bayar === 'sudah' && (
              <tr>
                <td className="bg-slate-100 font-bold">Waktu Pembayaran</td>
                <td>{gajiInfo?.tanggal_bayar || '-'}</td>
                <td className="bg-slate-100 font-bold">No. Referensi / Bukti</td>
                <td>{gajiInfo?.catatan_bayar || 'Transfer Valid'}</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ======================================================== */}
      {/* 3. TABEL 1: DAFTAR SESI KERJA SAH                        */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3 print-avoid-break">
        <div className="font-bold text-[#b81d52] text-xs uppercase tracking-wider flex items-center space-x-1.5">
          <Clock className="w-4 h-4 text-[#b81d52]" />
          <span>DAFTAR SESI KERJA SAH PERIODE INI ({absensiList.length} HARI):</span>
        </div>

        <div className="overflow-x-auto border border-slate-200/90 rounded-xl shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-200/90 text-slate-500 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2.5 font-bold text-center w-10">NO</th>
                <th className="px-4 py-2.5 font-bold">TANGGAL</th>
                <th className="px-4 py-2.5 font-bold">PROYEK LAPANGAN</th>
                <th className="px-4 py-2.5 font-bold text-center">JAM KERJA</th>
                <th className="px-4 py-2.5 font-bold text-center">DURASI</th>
                <th className="px-4 py-2.5 font-bold text-right">GAJI YANG DITERIMA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Memuat data sesi kerja...
                  </td>
                </tr>
              ) : absensiList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-slate-400">
                    Tidak ada sesi kerja yang disetujui pada periode {periode}.
                  </td>
                </tr>
              ) : (
                absensiList.map((ab, idx) => (
                  <tr key={ab.id_absensi} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{ab.tanggal}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      <div>{ab.nama_pekerjaan || 'Instalasi Jaringan'}</div>
                      {ab.catatan && (
                        <div className="text-[10px] text-slate-400 font-normal mt-0.5">
                          {ab.catatan}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-2.5 text-center text-slate-600 font-mono text-[11px]">
                      {ab.jam_masuk?.slice(0, 5)} - {ab.jam_pulang?.slice(0, 5)}
                    </td>
                    <td className="px-4 py-2.5 text-center font-bold text-[#b81d52]">
                      {ab.durasi_jam} Jam
                    </td>
                    <td className="px-4 py-2.5 text-right font-extrabold text-emerald-700 text-xs">
                      {formatRupiah(ab.gaji_diterima || Number(ab.durasi_jam || 0) * Number(gajiInfo?.tarif || ab.tarif || 50000))}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {absensiList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold">
                  <td colSpan="4" className="px-4 py-2.5 text-right font-extrabold text-slate-800 uppercase">
                    TOTAL JAM KERJA SAH & UPAH POKOK:
                  </td>
                  <td className="px-4 py-2.5 text-center font-black text-[#b81d52]">
                    {totalJamSah.toFixed(2)} Jam
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-emerald-800">
                    {formatRupiah(upahPokok)}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TABEL 2: DAFTAR NOTA REIMBURSEMENT                    */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 space-y-3 print-avoid-break">
        <div className="font-bold text-amber-700 text-xs uppercase tracking-wider flex items-center space-x-1.5">
          <Receipt className="w-4 h-4 text-amber-600" />
          <span>DAFTAR NOTA REIMBURSEMENT SAH PERIODE INI ({pengeluaranList.length} NOTA):</span>
        </div>

        <div className="overflow-x-auto border border-amber-200/80 rounded-xl shadow-xs">
          <table className="w-full text-left text-xs">
            <thead className="bg-amber-50/50 border-b border-amber-200/80 text-amber-900 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-3 py-2.5 font-bold text-center w-10">NO</th>
                <th className="px-4 py-2.5 font-bold">TANGGAL</th>
                <th className="px-4 py-2.5 font-bold">PROYEK</th>
                <th className="px-4 py-2.5 font-bold">KETERANGAN PENGELUARAN</th>
                <th className="px-4 py-2.5 font-bold text-right">NOMINAL BIAYA</th>
                <th className="px-4 py-2.5 font-bold text-center no-print">BUKTI NOTA</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    Memuat data nota...
                  </td>
                </tr>
              ) : pengeluaranList.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400">
                    Tidak ada nota reimbursement yang disetujui pada periode {periode}.
                  </td>
                </tr>
              ) : (
                pengeluaranList.map((pe, idx) => (
                  <tr key={pe.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                    <td className="px-3 py-2.5 text-center font-bold text-slate-500">{idx + 1}</td>
                    <td className="px-4 py-2.5 font-medium text-slate-800">{pe.tanggal}</td>
                    <td className="px-4 py-2.5 font-semibold text-slate-800">
                      {pe.nama_pekerjaan || 'Operasional Lapangan'}
                    </td>
                    <td className="px-4 py-2.5 text-slate-600">{pe.keterangan || '-'}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-amber-700">
                      {formatRupiah(pe.nominal)}
                    </td>
                    <td className="px-4 py-2.5 text-center no-print">
                      {pe.foto_kwitansi ? (
                        <button
                          type="button"
                          onClick={() => setPreviewImage(getFileUrl(pe.foto_kwitansi))}
                          className="px-2.5 py-1 rounded-md text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 border border-amber-200 transition cursor-pointer"
                        >
                          Lihat Foto
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            {pengeluaranList.length > 0 && (
              <tfoot>
                <tr className="bg-amber-100/70 font-bold">
                  <td colSpan="4" className="px-4 py-2.5 text-right font-extrabold text-slate-800 uppercase">
                    TOTAL PENGGANTIAN BIAYA REIMBURSEMENT:
                  </td>
                  <td className="px-4 py-2.5 text-right font-black text-amber-800">
                    +{formatRupiah(totalReimburseSah)}
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 5. REKAPITULASI KOMPONEN GAJI AKHIR (RINGKASAN AKUNTANSI) */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 sm:p-6 print-avoid-break">
        <h3 className="font-bold text-slate-800 text-xs uppercase tracking-wider mb-3">
          Ringkasan Komponen Penggajian:
        </h3>

        <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
          <div className="flex justify-between p-3 border-b border-slate-200 bg-slate-50/70">
            <span className="text-slate-700 font-medium">Upah Pokok Kerja ({totalJamSah.toFixed(2)} Jam × {formatRupiah(gajiInfo?.tarif || 50000)}):</span>
            <span className="font-bold text-slate-900">{formatRupiah(upahPokok)}</span>
          </div>

          <div className="flex justify-between p-3 border-b border-slate-200">
            <span className="text-slate-700 font-medium">Reimbursement Biaya Belanja Material ({pengeluaranList.length} Nota Sah):</span>
            <span className="font-bold text-amber-700">+{formatRupiah(totalReimburseSah)}</span>
          </div>

          {bonus > 0 && (
            <div className="flex justify-between p-3 border-b border-slate-200 bg-emerald-50/40">
              <div>
                <span className="text-emerald-800 font-bold block">Bonus / Insentif Tambahan:</span>
                {gajiInfo?.catatan_penyesuaian && (
                  <span className="text-[10px] text-slate-500 italic block">{gajiInfo.catatan_penyesuaian}</span>
                )}
              </div>
              <span className="font-bold text-emerald-700">+{formatRupiah(bonus)}</span>
            </div>
          )}

          {potongan > 0 && (
            <div className="flex justify-between p-3 border-b border-slate-200 bg-rose-50/40">
              <div>
                <span className="text-rose-800 font-bold block">Potongan Kasbon / Pinjaman:</span>
                {gajiInfo?.catatan_penyesuaian && (
                  <span className="text-[10px] text-slate-500 italic block">{gajiInfo.catatan_penyesuaian}</span>
                )}
              </div>
              <span className="font-bold text-rose-700">-{formatRupiah(potongan)}</span>
            </div>
          )}

          <div className="flex justify-between p-3.5 bg-pink-50/70 border-t-2 border-slate-900 font-bold text-sm">
            <div>
              <span className="text-slate-900 uppercase font-black block">TOTAL GAJI KESELURUHAN (TAKE HOME PAY):</span>
              <span className="text-[10px] text-slate-500 font-normal">Upah Pokok + Reimburse {bonus > 0 ? '+ Bonus' : ''} {potongan > 0 ? '- Kasbon' : ''}</span>
            </div>
            <span className="text-base font-black text-[#b81d52]">{formatRupiah(totalGajiKeseluruhan)}</span>
          </div>

          {/* JUMLAH TERBILANG RESMI */}
          <div className="p-3 bg-slate-50 border-t border-slate-200 text-xs">
            <span className="font-bold text-slate-700">Jumlah Terbilang: </span>
            <span className="italic font-bold text-slate-900 capitalize">
              # {angkaTerbilang(totalGajiKeseluruhan)} #
            </span>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 6. KOLOM PENGESAHAN / TANDA TANGAN (PRINT ONLY)          */}
      {/* ======================================================== */}
      <div className="print-only">
        <PrintSignatures 
          namaKaryawan={gajiInfo?.nama_karyawan || 'Pekerja Lapangan'} 
          jabatanKaryawan={gajiInfo?.jabatan || 'Tenaga Kerja Lapangan'} 
          type="3-col"
        />
      </div>

      {/* Modal Preview Gambar (Nota / Transfer) */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Pratinjau Foto Bukti / Kuitansi"
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
