import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Wallet,
  Printer,
  Calendar,
  Clock,
  Receipt,
  CheckCircle2,
  Hourglass,
  Briefcase,
  Building2,
  MapPin,
  RefreshCw,
  Eye,
  CreditCard,
  Banknote,
  PlusCircle,
  MinusCircle,
  History,
  FileSpreadsheet,
  ArrowUpRight,
  Info,
  RotateCcw
} from 'lucide-react';
import { GajiService, formatRupiah, getFileUrl } from '../../services/api';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import Modal from '../../components/Modal';
import {
  angkaTerbilang,
  formatPeriodeIndo,
  generateNoDokumen,
  getJakartaCurrentPeriode,
  formatTanggalIndo
} from '../../utils/printHelpers';

const JOB_STATUS_META = {
  belum_mulai: {
    label: 'Belum Mulai',
    badgeClass: 'bg-amber-50 text-amber-700 border-amber-200'
  },
  berjalan: {
    label: 'Sedang Berjalan',
    badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200'
  },
  selesai: {
    label: 'Selesai',
    badgeClass: 'bg-slate-100 text-slate-700 border-slate-200'
  }
};

function formatClockRange(jamMasuk, jamPulang) {
  const start = jamMasuk ? String(jamMasuk).slice(0, 5) : '--:--';
  const end = jamPulang ? String(jamPulang).slice(0, 5) : '--:--';
  return `${start} - ${end}`;
}

export default function GajiKaryawanPage({ currentUser }) {
  const [selectedPeriode, setSelectedPeriode] = useState(() => getJakartaCurrentPeriode());
  const [selectedPekerjaanId, setSelectedPekerjaanId] = useState('semua');
  const [activeTab, setActiveTab] = useState('slip');

  const [detailData, setDetailData] = useState({
    karyawan: null,
    slip: null,
    tarif_aktif: 0,
    absensi: [],
    pengeluaran: [],
    pekerjaan_summary: [],
    pending_summary: {
      absensi_menunggu: 0,
      jam_menunggu: 0,
      pengeluaran_menunggu: 0,
      nominal_menunggu: 0
    }
  });
  const [historyList, setHistoryList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState('');
  const [previewImage, setPreviewImage] = useState(null);

  const loadData = useCallback(async (periodeToLoad) => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [detailRes, riwayatRes] = await Promise.all([
        GajiService.getDetail({
          id_karyawan: currentUser?.id_karyawan,
          periode: periodeToLoad
        }),
        GajiService.getHistory().catch(() => [])
      ]);

      setDetailData({
        karyawan: detailRes?.karyawan || null,
        slip: detailRes?.slip || null,
        tarif_aktif: Number(detailRes?.tarif_aktif || 0),
        absensi: Array.isArray(detailRes?.absensi) ? detailRes.absensi : [],
        pengeluaran: Array.isArray(detailRes?.pengeluaran) ? detailRes.pengeluaran : [],
        pekerjaan_summary: Array.isArray(detailRes?.pekerjaan_summary) ? detailRes.pekerjaan_summary : [],
        pending_summary: detailRes?.pending_summary || {
          absensi_menunggu: 0,
          jam_menunggu: 0,
          pengeluaran_menunggu: 0,
          nominal_menunggu: 0
        }
      });
      setHistoryList(Array.isArray(riwayatRes) ? riwayatRes : []);
    } catch (err) {
      setErrorMsg(err?.message || 'Gagal memuat data slip gaji dan rincian pekerjaan.');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.id_karyawan]);

  useEffect(() => {
    loadData(selectedPeriode);
  }, [selectedPeriode, loadData]);

  const handleChangePeriode = (nextPeriode) => {
    setSelectedPeriode(nextPeriode);
    setSelectedPekerjaanId('semua');
  };

  const slipGaji = detailData.slip;
  const karyawanInfo = detailData.karyawan || {};
  const namaKaryawan = slipGaji?.nama_karyawan || karyawanInfo.nama || currentUser?.nama || 'Pekerja';
  const jabatanKaryawan = slipGaji?.jabatan || karyawanInfo.jabatan || currentUser?.jabatan || 'Pekerja Lapangan';

  const tarif = Number(
    slipGaji?.tarif ??
    detailData.tarif_aktif ??
    karyawanInfo.tarif_per_jam ??
    currentUser?.tarif_per_jam ??
    0
  );
  const jenisUpah = slipGaji?.jenis_upah || karyawanInfo.jenis_upah || 'per_jam';
  const labelJenisUpah = jenisUpah === 'per_hari' ? 'Hari' : jenisUpah === 'per_bulan' ? 'Bulan' : 'Jam';

  const allAbsensi = detailData.absensi;
  const allExpenses = detailData.pengeluaran;
  const pekerjaanSummary = detailData.pekerjaan_summary;
  const pendingSummary = detailData.pending_summary;

  const isFilteredByJob = selectedPekerjaanId !== 'semua';
  const activeJob = useMemo(() => {
    if (!isFilteredByJob) return null;
    return pekerjaanSummary.find(
      (item) => String(item.id_pekerjaan) === String(selectedPekerjaanId)
    ) || null;
  }, [isFilteredByJob, pekerjaanSummary, selectedPekerjaanId]);
  const jenisUpahEfektif = activeJob?.jenis_upah || jenisUpah;
  const tarifEfektif = Number(activeJob?.nominal_upah || tarif);
  const labelJenisUpahEfektif = jenisUpahEfektif === 'per_hari' ? 'Hari' : jenisUpahEfektif === 'per_bulan' ? 'Bulan' : 'Jam';

  const visibleAbsensi = useMemo(() => {
    if (!isFilteredByJob) return allAbsensi;
    return allAbsensi.filter((item) => String(item.id_pekerjaan) === String(selectedPekerjaanId));
  }, [allAbsensi, isFilteredByJob, selectedPekerjaanId]);

  // Hitung upah sesi dengan tarif dari pekerjaan terkait, bukan tarif umum karyawan.
  // Untuk tarif harian/bulanan, upah per hari dibagi rata ke sesi pada hari itu
  // agar jumlah rincian sesi tetap sama dengan estimasi upah pekerjaan.
  const sessionWages = useMemo(() => {
    const sessionsByJobDay = new Map();
    visibleAbsensi.forEach((item) => {
      const key = `${item.id_pekerjaan}:${String(item.tanggal || '').slice(0, 10)}`;
      sessionsByJobDay.set(key, (sessionsByJobDay.get(key) || 0) + 1);
    });

    return new Map(visibleAbsensi.map((item) => {
      const job = pekerjaanSummary.find((row) => String(row.id_pekerjaan) === String(item.id_pekerjaan));
      const type = job?.jenis_upah || item.jenis_upah || 'per_jam';
      const rate = Number(job?.nominal_upah ?? item.nominal_upah ?? tarif ?? 0);
      const duration = Number(item.durasi_jam || 0);
      let wage = duration * rate;

      if (type !== 'per_jam') {
        const days = Number(job?.total_hari_disetujui || 0);
        const dailyWage = days > 0 ? Number(job?.estimasi_upah || 0) / days : 0;
        const key = `${item.id_pekerjaan}:${String(item.tanggal || '').slice(0, 10)}`;
        wage = dailyWage / Math.max(1, sessionsByJobDay.get(key) || 1);
      }

      return [String(item.id_absensi), Number(wage.toFixed(2))];
    }));
  }, [visibleAbsensi, pekerjaanSummary, tarif]);

  const visibleExpenses = useMemo(() => {
    if (!isFilteredByJob) return allExpenses;
    return allExpenses.filter((item) => String(item.id_pekerjaan) === String(selectedPekerjaanId));
  }, [allExpenses, isFilteredByJob, selectedPekerjaanId]);
  const personalExpenses = visibleExpenses.filter((item) => item.jenis_dana === 'pribadi');
  const officeExpenses = visibleExpenses.filter((item) => item.jenis_dana === 'kantor');

  // Agregasi angka seluruh periode
  const approvedHoursAll = useMemo(
    () => Number(allAbsensi.reduce((sum, item) => sum + (Number(item.durasi_jam) || 0), 0).toFixed(2)),
    [allAbsensi]
  );
  const approvedReimburseAll = useMemo(
    () => Number(allExpenses.filter((item) => item.jenis_dana === 'pribadi').reduce((sum, item) => sum + (Number(item.nominal) || 0), 0).toFixed(2)),
    [allExpenses]
  );

  // Angka tampilan sesuai mode (Semua Pekerjaan vs Pekerjaan Tertentu)
  const visibleHours = isFilteredByJob
    ? Number(visibleAbsensi.reduce((sum, item) => sum + (Number(item.durasi_jam) || 0), 0).toFixed(2))
    : (slipGaji ? Number(slipGaji.total_jam || 0) : approvedHoursAll);

  const countWorkDays = (rows) => new Set(rows.map((row) => String(row.tanggal || '').slice(0, 10)).filter(Boolean)).size;
  const visibleDays = countWorkDays(visibleAbsensi);
  const approvedDaysAll = countWorkDays(allAbsensi);
  const totalJobAttendanceDays = pekerjaanSummary.reduce((total, job) => {
    const rows = allAbsensi.filter((item) => String(item.id_pekerjaan) === String(job.id_pekerjaan));
    return total + countWorkDays(rows);
  }, 0);
  const wageForHoursAndDays = (hours, days, totalDays) => {
    if (jenisUpahEfektif === 'per_hari') return Number((days * tarifEfektif).toFixed(2));
    if (jenisUpahEfektif === 'per_bulan') return totalDays > 0 ? Number((tarifEfektif * days / totalDays).toFixed(2)) : 0;
    return Number((hours * tarifEfektif).toFixed(2));
  };

  const upahKerja = isFilteredByJob
    ? wageForHoursAndDays(visibleHours, visibleDays, totalJobAttendanceDays)
    : Number(pekerjaanSummary.reduce((sum, job) => sum + Number(job.estimasi_upah || 0), 0).toFixed(2));

  const totalReimburse = isFilteredByJob
    ? Number(personalExpenses.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0).toFixed(2))
    : (slipGaji ? Number(slipGaji.total_ganti || 0) : approvedReimburseAll);

  const bonus = isFilteredByJob ? 0 : Number(slipGaji?.bonus || 0);
  const potongan = isFilteredByJob ? 0 : Number(slipGaji?.potongan || 0);

  const totalDibayar = isFilteredByJob
    ? Math.max(0, Number((upahKerja + totalReimburse).toFixed(2)))
    : (slipGaji && slipGaji.total_dibayar !== undefined
        ? Number(slipGaji.total_dibayar)
        : Math.max(0, Number((upahKerja + totalReimburse + bonus - potongan).toFixed(2))));

  const porsiJamPersen = approvedHoursAll > 0
    ? Math.round((visibleHours / approvedHoursAll) * 100)
    : 0;

  const isPaid = slipGaji?.status_bayar === 'sudah';
  const isCalculated = Boolean(slipGaji);
  const hasHoursOutOfSync = Boolean(
    slipGaji &&
    !isPaid &&
    Math.abs(approvedHoursAll - Number(slipGaji.total_jam || 0)) >= 0.01
  );

  const noDokumen = generateNoDokumen(
    isFilteredByJob ? `SLIP-PROYEK-${selectedPekerjaanId}` : 'SLIP-KARYAWAN',
    selectedPeriode,
    currentUser?.id_karyawan || karyawanInfo.id_karyawan || '01'
  );

  const handlePrintSlip = () => {
    document.body.classList.remove('printing-modal');
    if (activeTab !== 'slip') {
      setActiveTab('slip');
      setTimeout(() => window.print(), 120);
      return;
    }
    window.print();
  };

  const handleSelectHistorySlip = (row) => {
    setSelectedPeriode(row.periode);
    setSelectedPekerjaanId('semua');
    setActiveTab('slip');
  };

  const statusBadgeText = isPaid
    ? 'Lunas Dibayarkan'
    : isCalculated
      ? 'Menunggu Pembayaran Admin'
      : 'Estimasi Berjalan (Belum Final)';

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. PAGE HEADER, FILTER TOOLBAR & TABS (LAYAR WEB ONLY)
      ======================================================== */}
      <section className="worker-page-header no-print">
        <div className="worker-page-header-content">
          <div className="worker-page-header-label">PANEL PEKERJA</div>
          <nav aria-label="Breadcrumb" className="worker-page-header-breadcrumb">
            <span>Dashboard</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">Slip Gaji Pribadi</span>
          </nav>
          <h1 className="worker-page-header-title">
            Slip Gaji Pribadi
          </h1>
          <p className="worker-page-header-description">
            Gaji dihitung per pekerjaan dari absensi yang disetujui, ditambah pengeluaran pribadi yang disetujui.
          </p>
        </div>

        <div className="worker-page-header-icon" aria-hidden="true">
          <Wallet className="h-6 w-6" />
        </div>
      </section>

      <div className="no-print rounded-2xl border border-slate-200 bg-white px-5 pt-4 shadow-xs">
        <div className="flex flex-col gap-3 pb-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label htmlFor="gaji-periode" className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                Periode Bulan
              </label>
              <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50/60 px-3 py-2 shadow-2xs focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
                <Calendar className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
                <input
                  id="gaji-periode"
                  type="month"
                  value={selectedPeriode}
                  onChange={(e) => handleChangePeriode(e.target.value)}
                  className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
                />
              </div>
            </div>

          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => loadData(selectedPeriode)}
              className="inline-flex h-[38px] items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-700"
              aria-label="Segarkan data slip gaji"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>Segarkan</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex h-[38px] shrink-0 items-center gap-2 rounded-xl bg-emerald-600 px-4 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
            >
              <Printer className="h-4 w-4" aria-hidden="true" />
              <span>{isFilteredByJob ? 'Cetak Slip Pekerjaan Ini' : 'Cetak Slip Gaji (PDF)'}</span>
            </button>
          </div>
        </div>

        {/* Single-row accessible tabs */}
        <div className="border-t border-slate-100">
          <div
            role="tablist"
            aria-label="Navigasi fitur gaji"
            className="flex flex-nowrap items-center gap-2 overflow-x-auto"
          >
            <button
              type="button"
              id="tab-slip"
              role="tab"
              aria-selected={activeTab === 'slip'}
              onClick={() => setActiveTab('slip')}
              className={`slip-tab-btn inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'slip'
                  ? 'text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Slip & Rincian Pekerjaan</span>
            </button>

            <button
              type="button"
              id="tab-riwayat"
              role="tab"
              aria-selected={activeTab === 'riwayat'}
              onClick={() => setActiveTab('riwayat')}
              className={`slip-tab-btn inline-flex shrink-0 items-center gap-2 px-3 py-3 text-sm font-semibold whitespace-nowrap transition-colors ${
                activeTab === 'riwayat'
                  ? 'text-emerald-700'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span>Riwayat Pembayaran Gaji</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-bold text-slate-700">
                {historyList.length}
              </span>
            </button>
          </div>
        </div>
      </div>

      {errorMsg && (
        <div className="no-print rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800">
          {errorMsg}
        </div>
      )}

      {/* ========================================================
          2. PANEL TAB 1: SLIP & RINCIAN PER PEKERJAAN + PRINT DOCUMENT
      ======================================================== */}
      <div
        role="tabpanel"
        id="panel-slip"
        aria-labelledby="tab-slip"
        hidden={activeTab !== 'slip'}
      >
        <div id="printable-karyawan-slip" className="space-y-6">
          {/* KOP SURAT & IDENTITAS SLIP (KHUSUS CETAK / PDF SAJA) */}
          <div className="print-only">
            <PrintHeader
              title={
                isFilteredByJob && activeJob
                  ? 'SLIP RINCIAN UPAH & BIAYA PER PEKERJAAN'
                  : 'SLIP GAJI RESMI KARYAWAN'
              }
              subtitle={
                isFilteredByJob && activeJob
                  ? `Lingkup Proyek: ${activeJob.nama_pekerjaan}${activeJob.lokasi ? ` (${activeJob.lokasi})` : ''}`
                  : 'Rincian penghasilan berdasarkan absensi dan tarif yang ditetapkan Admin'
              }
              noDokumen={noDokumen}
              periode={selectedPeriode}
            />

            <div className="mb-5 overflow-hidden rounded-xl border border-slate-300 print-avoid-break">
              <table className="w-full text-xs text-slate-800">
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="w-1/4 bg-slate-100 px-3 py-2 font-bold text-slate-600">Nama Karyawan</td>
                    <td className="w-1/4 px-3 py-2 font-extrabold text-slate-900">{namaKaryawan}</td>
                    <td className="w-1/4 bg-slate-100 px-3 py-2 font-bold text-slate-600">Periode Penggajian</td>
                    <td className="w-1/4 px-3 py-2 font-bold text-slate-900">{formatPeriodeIndo(selectedPeriode)}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Jabatan / Profesi</td>
                    <td className="px-3 py-2">{jabatanKaryawan}</td>
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Tarif Upah / {labelJenisUpahEfektif}</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{formatRupiah(tarifEfektif)} / {labelJenisUpahEfektif}</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Lingkup Data</td>
                    <td className="px-3 py-2 font-semibold">
                      {isFilteredByJob && activeJob ? activeJob.nama_pekerjaan : 'Semua Pekerjaan Periode Ini'}
                    </td>
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Status Pembayaran</td>
                    <td className="px-3 py-2 font-extrabold uppercase">
                      {isPaid
                        ? `LUNAS (${slipGaji?.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer Bank'})`
                        : statusBadgeText}
                    </td>
                  </tr>
                  {isPaid && (
                    <tr>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Tanggal Pembayaran</td>
                      <td className="px-3 py-2">{slipGaji?.tanggal_bayar ? formatTanggalIndo(slipGaji.tanggal_bayar) : '-'}</td>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">No. Referensi</td>
                      <td className="px-3 py-2">{slipGaji?.catatan_bayar || 'Valid'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* KARTU IDENTITAS & STATUS PEMBAYARAN (LAYAR WEB ONLY) */}
          <div className="no-print hidden rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="grid min-w-0 flex-1 grid-cols-2 gap-4 sm:grid-cols-4">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Nama Pekerja</div>
                  <div className="mt-1 truncate text-sm font-bold text-slate-900">{namaKaryawan}</div>
                  <div className="truncate text-xs text-slate-500">{jabatanKaryawan}</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Tarif Dasar</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{formatRupiah(tarifEfektif)}</div>
                  <div className="text-xs text-slate-500">per {labelJenisUpahEfektif.toLowerCase()} sesuai tarif pekerjaan</div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Periode Slip</div>
                  <div className="mt-1 text-sm font-bold text-slate-900">{formatPeriodeIndo(selectedPeriode)}</div>
                  <div className="truncate text-xs text-slate-500">
                    {isFilteredByJob && activeJob ? `Proyek: ${activeJob.nama_pekerjaan}` : 'Seluruh Proyek'}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Status Gaji</div>
                  <div className="mt-1">
                    {isPaid ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                        Lunas
                      </span>
                    ) : isCalculated ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1 text-xs font-bold text-sky-700">
                        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                        Menunggu Bayar
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                        <Hourglass className="h-3.5 w-3.5" aria-hidden="true" />
                        Estimasi Berjalan
                      </span>
                    )}
                  </div>
                  <div className="mt-1 text-[11px] text-slate-500">
                    {isPaid && slipGaji?.tanggal_bayar
                      ? `Dibayar ${formatTanggalIndo(slipGaji.tanggal_bayar)}`
                      : isCalculated
                        ? 'Sudah dihitung Admin'
                        : 'Dari jam & nota disetujui'}
                  </div>
                </div>
              </div>

              {isPaid && (
                <div className="flex shrink-0 flex-wrap items-center gap-2 border-t border-slate-100 pt-3 md:border-t-0 md:border-l md:pt-0 md:pl-5">
                  <div className="rounded-xl bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
                    <div className="flex items-center gap-1.5 font-bold">
                      {slipGaji?.metode_bayar === 'tunai'
                        ? <Banknote className="h-3.5 w-3.5" aria-hidden="true" />
                        : <CreditCard className="h-3.5 w-3.5" aria-hidden="true" />}
                      <span>{slipGaji?.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer Bank'}</span>
                    </div>
                    {slipGaji?.catatan_bayar && (
                      <div className="mt-0.5 text-[11px] text-emerald-700">Ref: {slipGaji.catatan_bayar}</div>
                    )}
                  </div>

                  {slipGaji?.bukti_bayar && (
                    <button
                      type="button"
                      onClick={() => setPreviewImage(getFileUrl(slipGaji.bukti_bayar))}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-white px-3 py-2 text-xs font-bold text-emerald-700 shadow-2xs transition hover:bg-emerald-50"
                    >
                      <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Lihat Bukti Transfer</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* BANNER MODE FILTER PEKERJAAN TERTENTU */}
          {isFilteredByJob && activeJob && (
            <div className="no-print flex flex-col justify-between gap-3 rounded-2xl border border-emerald-200 bg-emerald-50/70 px-5 py-3.5 sm:flex-row sm:items-center">
              <div className="flex items-start gap-2.5 text-xs text-emerald-900">
                <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700" aria-hidden="true" />
                <div>
                  <span className="font-bold">Menampilkan Slip Berdasarkan Pekerjaan: {activeJob.nama_pekerjaan}</span>
                  <p className="mt-0.5 text-emerald-800/90">
                    Angka di bawah menghitung upah jam kerja disetujui dan reimbursement pribadi khusus dari proyek ini ({porsiJamPersen}% dari total jam periode). Bonus & potongan kasbon hanya dihitung pada slip bulanan keseluruhan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPekerjaanId('semua')}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-xl border border-emerald-300 bg-white px-3 py-1.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100"
              >
                <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Lihat Semua Pekerjaan</span>
              </button>
            </div>
          )}

          {/* BANNER INFORMASI JAM/PENGELUARAN MENUNGGU APPROVAL OR SYNC */}
          {(pendingSummary.absensi_menunggu > 0 || pendingSummary.pengeluaran_menunggu > 0 || hasHoursOutOfSync) && (
            <div className="no-print hidden flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-xs text-amber-900">
              <Info className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
              <div className="space-y-0.5">
                {pendingSummary.absensi_menunggu > 0 && (
                  <p>
                    Terdapat <strong>{pendingSummary.absensi_menunggu} sesi absensi</strong> ({pendingSummary.jam_menunggu} jam) yang masih menunggu persetujuan Admin dan belum masuk perhitungan upah resmi.
                  </p>
                )}
                {pendingSummary.pengeluaran_menunggu > 0 && (
                  <p>
                    Terdapat <strong>{pendingSummary.pengeluaran_menunggu} nota talangan pribadi</strong> senilai <strong>{formatRupiah(pendingSummary.nominal_menunggu)}</strong> yang menunggu verifikasi Admin.
                  </p>
                )}
                {hasHoursOutOfSync && (
                  <p>
                    Rekap absensi disetujui saat ini berjumlah <strong>{approvedHoursAll} jam</strong> (hitungan draf terakhir Admin: {Number(slipGaji.total_jam).toFixed(2)} jam) dan akan diperbarui saat Admin menghitung ulang periode ini.
                  </p>
                )}
              </div>
            </div>
          )}

          {/* 4 KARTU RINGKASAN PENGHASILAN */}
          <div className="no-print hidden grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Upah Jam Kerja</span>
                <Clock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-slate-900">{formatRupiah(upahKerja)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {Number(visibleHours).toFixed(2)} jam ({visibleAbsensi.length} sesi disetujui)
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">Reimbursement Pribadi</span>
                <Receipt className="h-4 w-4 text-amber-600" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-extrabold text-amber-700">+{formatRupiah(totalReimburse)}</div>
              <div className="mt-1 text-xs text-slate-500">
                {visibleExpenses.length} nota disetujui • {isPaid ? 'Sudah diganti' : 'Ikut pencairan gaji'}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  {isFilteredByJob ? 'Porsi Pekerjaan Ini' : 'Bonus / Potongan Kasbon'}
                </span>
                <Briefcase className="h-4 w-4 text-slate-500" aria-hidden="true" />
              </div>
              {isFilteredByJob ? (
                <>
                  <div className="mt-2 text-2xl font-extrabold text-slate-900">{porsiJamPersen}%</div>
                  <div className="mt-1 text-xs text-slate-500">
                    {visibleHours.toFixed(2)} dari {approvedHoursAll.toFixed(2)} jam bulan ini
                  </div>
                </>
              ) : (
                <>
                  <div className="mt-2 flex flex-wrap items-baseline gap-2 text-lg font-extrabold">
                    <span className="text-emerald-700">+{formatRupiah(bonus)}</span>
                    <span className="text-slate-300">/</span>
                    <span className="text-rose-600">-{formatRupiah(potongan)}</span>
                  </div>
                  <div className="mt-1 truncate text-xs text-slate-500">
                    {slipGaji?.catatan_penyesuaian || 'Tidak ada catatan tambahan'}
                  </div>
                </>
              )}
            </div>

            <div className="rounded-2xl border border-emerald-200 bg-emerald-600 p-5 text-white shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-emerald-100">
                  {isFilteredByJob ? 'Total Penghasilan Proyek' : isPaid ? 'Total Gaji Diterima' : 'Total Estimasi Diterima'}
                </span>
                <Wallet className="h-4 w-4 text-emerald-100" aria-hidden="true" />
              </div>
              <div className="mt-2 text-2xl font-black tracking-tight">{formatRupiah(totalDibayar)}</div>
              <div className="mt-1 text-xs text-emerald-100">
                {isFilteredByJob
                  ? 'Upah kerja + reimbursement proyek'
                  : isPaid
                    ? 'Lunas sesuai slip periode'
                    : 'Upah + Reimburse + Bonus - Potongan'}
              </div>
            </div>
          </div>

          <section aria-labelledby="pilih-pekerjaan-gaji" className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 id="pilih-pekerjaan-gaji" className="text-lg font-bold text-slate-900">1. Pilih pekerjaan</h2>
              <p className="text-sm text-slate-500">Tarif dan gaji dihitung dari data pekerjaan dan absensi bulan ini · {pekerjaanSummary.length} pekerjaan</p>
            </div>
            {loading ? <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm text-slate-500">Memuat daftar pekerjaan dan absensi…</div> : pekerjaanSummary.length === 0 ? <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Belum ada pekerjaan atau absensi pada periode ini.</div> : (
              <div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-3">
                {pekerjaanSummary.map((job) => {
                  const jobSelected = String(job.id_pekerjaan) === String(selectedPekerjaanId);
                  const jobRows = allAbsensi.filter((item) => String(item.id_pekerjaan) === String(job.id_pekerjaan));
                  const jobDaysCount = countWorkDays(jobRows);
                  const jobPay = wageForHoursAndDays(Number(job.total_jam_disetujui || 0), jobDaysCount, totalJobAttendanceDays);
                  const jobRate = Number(job.nominal_upah || 0);
                  const jobRateType = job.jenis_upah === 'per_hari' ? 'hari' : job.jenis_upah === 'per_bulan' ? 'bulan' : 'jam';
                  return (
                    <button key={job.id_pekerjaan} type="button" aria-pressed={jobSelected} onClick={() => { setSelectedPekerjaanId(jobSelected ? 'semua' : String(job.id_pekerjaan)); setActiveTab('slip'); }} className={`rounded-xl border-2 bg-white p-4 text-left shadow-sm transition hover:border-emerald-400 ${jobSelected ? 'border-emerald-600 ring-2 ring-emerald-100' : 'border-slate-200'}`}>
                      <div className="flex flex-wrap items-start justify-between gap-2"><h3 className="text-base font-bold text-slate-900">{job.nama_pekerjaan}</h3><span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${jobSelected ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'}`}>{jobSelected ? 'Sedang dilihat' : 'Lihat rincian'}</span></div>
                      <p className="mt-1.5 text-xs text-slate-600">Tarif {formatRupiah(jobRate)} / {jobRateType} · {job.jenis_upah === 'per_hari' ? `${jobDaysCount} hari kerja` : `${Number(job.total_jam_disetujui || 0).toFixed(2)} jam kerja`}</p>
                      <div className="mt-3 grid grid-cols-2 gap-3 border-b border-slate-200 pb-3 text-sm"><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Upah absensi</p><p className="mt-0.5 font-bold text-slate-900">{formatRupiah(jobPay)}</p></div><div><p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Reimbursement disetujui</p><p className="mt-0.5 font-bold text-amber-700">{formatRupiah(job.reimbursement_disetujui)}</p>{Number(job.reimbursement_menunggu || 0) > 0 && <p className="text-[11px] text-amber-700">Menunggu {formatRupiah(job.reimbursement_menunggu)}</p>}</div></div>
                      <div className="mt-2.5 flex items-center justify-between gap-2"><span className="text-xs font-semibold text-slate-700">Total gaji proyek</span><strong className="text-lg text-slate-900">{formatRupiah(jobPay + Number(job.reimbursement_disetujui || 0))}</strong></div>
                      {Number(job.pengeluaran_kantor_disetujui || 0) > 0 && <p className="mt-1.5 text-[11px] text-blue-700">Pengeluaran uang kantor terpisah: {formatRupiah(job.pengeluaran_kantor_disetujui)}</p>}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          {/* ========================================================
              RINGKASAN GAJI BERDASARKAN DATA PEKERJAAN / PROYEK
          ======================================================== */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs print-avoid-break">
            <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="caption-rekap-pekerjaan" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Building2 className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>Penghasilan Berdasarkan Data Pekerjaan ({formatPeriodeIndo(selectedPeriode)})</span>
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Pilih salah satu pekerjaan untuk melihat rincian absensi, reimbursement, dan mencetak slip khusus proyek tersebut.
                </p>
              </div>
              <span className="no-print self-start rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 sm:self-center">
                {pekerjaanSummary.length} Pekerjaan Terkait
              </span>
            </div>

            <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="caption-rekap-pekerjaan">
              <table className="w-full min-w-[700px] border-collapse text-left text-xs text-slate-700">
                <caption className="sr-only">
                  Ringkasan upah jam kerja dan reimbursement berdasarkan data pekerjaan pada periode {formatPeriodeIndo(selectedPeriode)}
                </caption>
                <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <tr>
                    <th scope="col" className="px-5 py-3">Data Pekerjaan & Lokasi</th>
                    <th scope="col" className="px-4 py-3">Status</th>
                    <th scope="col" className="px-4 py-3 text-center">Sesi Kerja</th>
                    <th scope="col" className="px-4 py-3 text-center">Jam Kerja</th>
                    <th scope="col" className="px-4 py-3 text-right">Upah Kerja</th>
                    <th scope="col" className="px-4 py-3 text-right">Reimbursement</th>
                    <th scope="col" className="px-4 py-3 text-right">Pengeluaran Kantor</th>
                    <th scope="col" className="px-4 py-3 text-right">Total Penghasilan &amp; Reimburse</th>
                    <th scope="col" className="no-print px-5 py-3 text-right">Fokus Slip</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                        Memuat data pekerjaan dan gaji...
                      </td>
                    </tr>
                  ) : pekerjaanSummary.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-5 py-8 text-center text-slate-400">
                        Belum ada aktivitas pekerjaan atau penugasan tercatat pada periode {formatPeriodeIndo(selectedPeriode)}.
                      </td>
                    </tr>
                  ) : (
                    pekerjaanSummary.map((job) => {
                      const isSelected = String(job.id_pekerjaan) === String(selectedPekerjaanId);
                      const statusMeta = JOB_STATUS_META[job.status_pekerjaan] || JOB_STATUS_META.berjalan;
                      const jobAbsensi = allAbsensi.filter((item) => String(item.id_pekerjaan) === String(job.id_pekerjaan));
                      const jobDays = countWorkDays(jobAbsensi);
                      const jobWage = wageForHoursAndDays(Number(job.total_jam_disetujui || 0), jobDays, totalJobAttendanceDays);
                      return (
                        <tr
                          key={job.id_pekerjaan}
                          className={isSelected ? 'bg-emerald-50/70' : 'hover:bg-slate-50/80'}
                        >
                          <th scope="row" className="px-5 py-3.5 text-left font-normal">
                            <div className="font-bold text-slate-900">{job.nama_pekerjaan}</div>
                            <div className="mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-500">
                              {job.lokasi && (
                                <span className="inline-flex items-center gap-1">
                                  <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                  {job.lokasi}
                                </span>
                              )}
                              {job.peran_tugas && (
                                <span className="text-emerald-700 font-medium">Peran: {job.peran_tugas}</span>
                              )}
                            </div>
                          </th>
                          <td className="px-4 py-3.5">
                            <span className={`inline-flex rounded-full border px-2 py-0.5 text-[10px] font-bold ${statusMeta.badgeClass}`}>
                              {statusMeta.label}
                            </span>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="font-bold text-slate-800">{job.jumlah_sesi_disetujui} sesi</span>
                            {job.jumlah_sesi_menunggu > 0 && (
                              <span className="block text-[10px] text-amber-600">
                                +{job.jumlah_sesi_menunggu} pending
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-center font-bold text-emerald-700">
                            {Number(job.total_jam_disetujui).toFixed(2)} jam
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-slate-900">
                            {formatRupiah(jobWage)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-amber-700">
                            {formatRupiah(job.reimbursement_disetujui)}
                            {job.jumlah_nota > 0 && (
                              <span className="block text-[10px] font-normal text-slate-400">
                                ({job.jumlah_nota} nota)
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3.5 text-right font-bold text-blue-700">
                            {formatRupiah(job.pengeluaran_kantor_disetujui || 0)}
                          </td>
                          <td className="px-4 py-3.5 text-right font-extrabold text-slate-900">
                            {formatRupiah(job.total_kontribusi)}
                          </td>
                          <td className="no-print px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                setSelectedPekerjaanId(isSelected ? 'semua' : String(job.id_pekerjaan))
                              }
                              className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-[11px] font-bold transition ${
                                isSelected
                                  ? 'bg-emerald-600 text-white shadow-2xs hover:bg-emerald-700'
                                  : 'border border-slate-200 bg-white text-slate-700 hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800'
                              }`}
                            >
                              <span>{isSelected ? 'Tampilkan Semua' : 'Lihat Slip Ini'}</span>
                              {!isSelected && <ArrowUpRight className="h-3 w-3" aria-hidden="true" />}
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* ========================================================
              LEDGER PERHITUNGAN SLIP GAJI RESMI + TERBILANG
          ======================================================== */}
          <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs print-avoid-break">
            <div className="border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
              <h2 className="text-sm font-bold text-slate-900">
                {isFilteredByJob && activeJob
                  ? `Perhitungan Slip Penghasilan — ${activeJob.nama_pekerjaan}`
                  : `Rincian Komponen Gaji Periode ${formatPeriodeIndo(selectedPeriode)}`}
              </h2>
            </div>

            <div className="divide-y divide-slate-100 text-xs sm:text-sm">
              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <span className="font-semibold text-slate-800">
                    1. Upah Berdasarkan {jenisUpah === 'per_jam' ? 'Jam' : jenisUpah === 'per_hari' ? 'Hari' : 'Bulan'} Kerja Terverifikasi
                  </span>
                  <span className="block text-xs text-slate-500">
                    {jenisUpahEfektif === 'per_jam'
                      ? `${Number(visibleHours).toFixed(2)} Jam × ${formatRupiah(tarifEfektif)} / Jam`
                      : jenisUpahEfektif === 'per_hari'
                        ? `${visibleDays} Hari hadir × ${formatRupiah(tarifEfektif)} / Hari`
                        : `${visibleDays} dari ${totalJobAttendanceDays} hari kerja proyek × ${formatRupiah(tarifEfektif)} / Bulan`}
                  </span>
                </div>
                <span className="font-bold text-slate-900">{formatRupiah(upahKerja)}</span>
              </div>

              <div className="flex items-center justify-between gap-4 px-5 py-3">
                <div>
                  <span className="font-semibold text-slate-800">
                    2. Penggantian Uang Pribadi (Reimbursement Disetujui)
                  </span>
                  <span className="block text-xs text-slate-500">
                    {visibleExpenses.length} nota pembelian disetujui Admin
                  </span>
                </div>
                <span className="font-bold text-amber-700">+{formatRupiah(totalReimburse)}</span>
              </div>

              {!isFilteredByJob && bonus > 0 && (
                <div className="flex items-center justify-between gap-4 bg-emerald-50/40 px-5 py-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-emerald-800">
                      <PlusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      3. Bonus / Insentif Tambahan
                    </span>
                    {slipGaji?.catatan_penyesuaian && (
                      <span className="block text-xs italic text-slate-500">
                        {slipGaji.catatan_penyesuaian}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700">+{formatRupiah(bonus)}</span>
                </div>
              )}

              {!isFilteredByJob && potongan > 0 && (
                <div className="flex items-center justify-between gap-4 bg-rose-50/40 px-5 py-3">
                  <div>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-rose-800">
                      <MinusCircle className="h-3.5 w-3.5" aria-hidden="true" />
                      Potongan Kasbon / Pinjaman
                    </span>
                    {bonus === 0 && slipGaji?.catatan_penyesuaian && (
                      <span className="block text-xs italic text-slate-500">
                        {slipGaji.catatan_penyesuaian}
                      </span>
                    )}
                  </div>
                  <span className="font-bold text-rose-700">-{formatRupiah(potongan)}</span>
                </div>
              )}

              <div className="flex items-center justify-between gap-4 bg-slate-900 px-5 py-4 text-white">
                <span className="font-extrabold uppercase tracking-wide">
                  {isFilteredByJob
                    ? 'Total Penghasilan Pekerjaan Ini'
                    : isPaid
                      ? 'Total Gaji Dibayarkan'
                      : 'Total Take Home Pay'}
                </span>
                <span className="text-lg font-black text-emerald-400 sm:text-xl">
                  {formatRupiah(totalDibayar)}
                </span>
              </div>

              <div className="bg-slate-50 px-5 py-2.5 text-xs text-slate-600">
                <span className="font-bold text-slate-800">Terbilang: </span>
                <span className="italic"># {angkaTerbilang(totalDibayar)} #</span>
              </div>
            </div>
          </section>

          {/* ========================================================
              TABEL SESI KERJA & REIMBURSEMENT (TERFILTER PER PEKERJAAN)
          ======================================================== */}
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
            {/* Tabel Sesi Absensi Disetujui */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                <h2 id="caption-sesi-absensi" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Clock className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                  <span>Rincian Sesi Kerja ({visibleAbsensi.length})</span>
                </h2>
                <span className="text-xs font-bold text-emerald-700">
                  {visibleHours.toFixed(2)} Jam
                </span>
              </div>

              <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="caption-sesi-absensi">
                <table className="w-full min-w-[460px] border-collapse text-left text-xs text-slate-700">
                  <caption className="sr-only">Daftar sesi absensi yang telah disetujui Admin</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Tanggal</th>
                      <th scope="col" className="px-4 py-2.5">Pekerjaan & Jam</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Durasi</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Upah Sesi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">Memuat data...</td>
                      </tr>
                    ) : visibleAbsensi.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-6 text-center text-slate-400">
                          Belum ada absensi disetujui pada {isFilteredByJob ? 'pekerjaan' : 'periode'} ini.
                        </td>
                      </tr>
                    ) : (
                      visibleAbsensi.map((item) => (
                        <tr key={item.id_absensi} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                            {formatTanggalIndo(item.tanggal, true)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-800">{item.nama_pekerjaan}</div>
                            <div className="text-[10px] text-slate-500">
                              {formatClockRange(item.jam_masuk, item.jam_pulang)} WIB
                              {item.catatan ? ` • ${item.catatan}` : ''}
                            </div>
                          </td>
                          <td className="px-4 py-2.5 text-center font-bold text-emerald-700 whitespace-nowrap">
                            {Number(item.durasi_jam || 0).toFixed(2)} jam
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-slate-900 whitespace-nowrap">
                            {formatRupiah(sessionWages.get(String(item.id_absensi)) || 0)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {visibleAbsensi.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-right text-slate-600 uppercase">Subtotal Upah:</td>
                        <td className="px-4 py-2.5 text-center text-emerald-700">{visibleHours.toFixed(2)} jam</td>
                        <td className="px-4 py-2.5 text-right text-slate-900">{formatRupiah(upahKerja)}</td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>

            {/* Tabel Reimbursement Pribadi Disetujui */}
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                <h2 id="caption-nota-reimburse" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                  <Receipt className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  <span>Rincian Nota Uang Pribadi ({personalExpenses.length})</span>
                </h2>
                <span className="text-xs font-bold text-amber-700">
                  {formatRupiah(totalReimburse)}
                </span>
              </div>

              <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="caption-nota-reimburse">
                <table className="w-full min-w-[460px] border-collapse text-left text-xs text-slate-700">
                  <caption className="sr-only">Daftar nota belanja pribadi yang disetujui untuk penggantian</caption>
                  <thead className="border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Tanggal</th>
                      <th scope="col" className="px-4 py-2.5">Pekerjaan & Keterangan</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Nominal</th>
                      <th scope="col" className="px-4 py-2.5 text-center">Status</th>
                      <th scope="col" className="no-print px-4 py-2.5 text-center">Nota</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {loading ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">Memuat data...</td>
                      </tr>
                    ) : personalExpenses.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-4 py-6 text-center text-slate-400">
                          Tidak ada klaim reimbursement disetujui pada {isFilteredByJob ? 'pekerjaan' : 'periode'} ini.
                        </td>
                      </tr>
                    ) : (
                      personalExpenses.map((item) => (
                        <tr key={item.id_pengeluaran} className="hover:bg-slate-50">
                          <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                            {formatTanggalIndo(item.tanggal)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="font-semibold text-slate-800">{item.nama_pekerjaan}</div>
                            <div className="text-[10px] text-slate-500">{item.keterangan || '-'}</div>
                          </td>
                          <td className="px-4 py-2.5 text-right font-bold text-amber-700 whitespace-nowrap">
                            {formatRupiah(item.nominal)}
                          </td>
                          <td className="px-4 py-2.5 text-center">
                            <span className={`inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              item.status_ganti === 'sudah'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {item.status_ganti === 'sudah' ? 'Sudah Diganti' : 'Menunggu'}
                            </span>
                          </td>
                          <td className="no-print px-4 py-2.5 text-center">
                            {item.foto_kwitansi ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(getFileUrl(item.foto_kwitansi))}
                                className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 transition hover:bg-amber-100"
                              >
                                <Eye className="h-3 w-3" aria-hidden="true" />
                                <span>Lihat</span>
                              </button>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                  {personalExpenses.length > 0 && (
                    <tfoot className="border-t border-slate-200 bg-slate-50 font-bold">
                      <tr>
                        <td colSpan={2} className="px-4 py-2.5 text-right text-slate-600 uppercase">Subtotal Reimbursement:</td>
                        <td className="px-4 py-2.5 text-right text-amber-700">+{formatRupiah(totalReimburse)}</td>
                        <td colSpan={2}></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            </section>
            <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/70 px-5 py-3.5">
                <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900"><Building2 className="h-4 w-4 text-blue-600" />Pengeluaran Uang Kantor ({officeExpenses.length})</h2>
                <span className="text-xs font-bold text-blue-700">{formatRupiah(officeExpenses.reduce((sum, item) => sum + Number(item.nominal || 0), 0))}</span>
              </div>
              {officeExpenses.length === 0 ? <p className="p-5 text-sm text-slate-500">Tidak ada pengeluaran uang kantor pada pekerjaan atau periode ini.</p> : (
                <div className="divide-y divide-slate-100">
                  {officeExpenses.map((item) => <div key={item.id_pengeluaran} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3 text-xs"><span><strong className="text-slate-800">{item.nama_pekerjaan}</strong><span className="ml-2 text-slate-500">{formatTanggalIndo(item.tanggal)} · {item.keterangan || 'Tanpa keterangan'}</span></span><strong className="text-blue-700">{formatRupiah(item.nominal)}</strong></div>)}
                </div>
              )}
            </section>
          </div>

          {/* TANDA TANGAN PENGESAHAN (PRINT ONLY) */}
          <div className="print-only">
            <PrintSignatures
              namaKaryawan={namaKaryawan}
              jabatanKaryawan={jabatanKaryawan}
              type="2-col"
            />
          </div>
        </div>
      </div>

      {/* ========================================================
          3. PANEL TAB 2: RIWAYAT PEMBAYARAN GAJI BULANAN
      ======================================================== */}
      <div
        role="tabpanel"
        id="panel-riwayat"
        aria-labelledby="tab-riwayat"
        hidden={activeTab !== 'riwayat'}
      >
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="flex flex-col gap-2 border-b border-slate-200 bg-slate-50/70 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 id="caption-riwayat-gaji" className="flex items-center gap-2 text-sm font-bold text-slate-900">
                <History className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                <span>Arsip & Riwayat Slip Gaji Bulanan</span>
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Daftar seluruh perhitungan gaji resmi dari Admin beserta metode pembayaran, bukti transfer, dan akses cepat cetak ulang.
              </p>
            </div>
            <span className="self-start rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200 sm:self-center">
              Total {historyList.length} Periode
            </span>
          </div>

          <div className="table-wrapper" role="region" tabIndex={0} aria-labelledby="caption-riwayat-gaji">
            <table className="w-full min-w-[720px] border-collapse text-left text-xs text-slate-700">
              <caption className="sr-only">Riwayat slip gaji bulanan karyawan</caption>
              <thead className="border-b border-slate-200 bg-slate-50 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <tr>
                  <th scope="col" className="px-5 py-3">Periode</th>
                  <th scope="col" className="px-4 py-3">Pekerjaan Terlibat</th>
                  <th scope="col" className="px-4 py-3 text-center">Jam Kerja</th>
                  <th scope="col" className="px-4 py-3 text-right">Upah Kerja</th>
                  <th scope="col" className="px-4 py-3 text-right">Reimburse & Penyesuaian</th>
                  <th scope="col" className="px-4 py-3 text-right">Total Dibayar</th>
                  <th scope="col" className="px-4 py-3 text-center">Status & Bukti</th>
                  <th scope="col" className="px-5 py-3 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">Memuat riwayat gaji...</td>
                  </tr>
                ) : historyList.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-400">
                      Belum ada catatan perhitungan gaji resmi dari Admin untuk akun Anda.
                    </td>
                  </tr>
                ) : (
                  historyList.map((row) => {
                    const rowBonus = Number(row.bonus || 0);
                    const rowPotongan = Number(row.potongan || 0);
                    return (
                      <tr key={row.id_gaji} className="hover:bg-slate-50/80">
                        <th scope="row" className="px-5 py-3.5 text-left font-bold text-slate-900 whitespace-nowrap">
                          {formatPeriodeIndo(row.periode)}
                          <span className="block text-[10px] font-normal text-slate-400">{row.periode}</span>
                        </th>
                        <td className="px-4 py-3.5 max-w-[240px]">
                          <span className="text-xs font-medium text-slate-700">
                            {row.nama_pekerjaan || 'Operasional Lapangan'}
                          </span>
                        </td>
                        <td className="px-4 py-3.5 text-center font-bold text-emerald-700 whitespace-nowrap">
                          {Number(row.total_jam || 0).toFixed(2)} jam
                        </td>
                        <td className="px-4 py-3.5 text-right font-bold text-slate-900 whitespace-nowrap">
                          {formatRupiah(row.total_upah)}
                        </td>
                        <td className="px-4 py-3.5 text-right whitespace-nowrap">
                          <div className="font-semibold text-amber-700">+{formatRupiah(row.total_ganti)}</div>
                          {(rowBonus > 0 || rowPotongan > 0) && (
                            <div className="text-[10px] text-slate-500">
                              {rowBonus > 0 ? `+${formatRupiah(rowBonus)} ` : ''}
                              {rowPotongan > 0 ? `-${formatRupiah(rowPotongan)}` : ''}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                          {formatRupiah(row.total_dibayar)}
                        </td>
                        <td className="px-4 py-3.5 text-center">
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            row.status_bayar === 'sudah'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-sky-100 text-sky-800'
                          }`}>
                            {row.status_bayar === 'sudah' ? 'Lunas' : 'Menunggu Bayar'}
                          </span>
                          {row.status_bayar === 'sudah' && (
                            <div className="mt-1 flex items-center justify-center gap-2 text-[10px] text-slate-500">
                              <span>{row.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer'}</span>
                              {row.bukti_bayar && (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(getFileUrl(row.bukti_bayar))}
                                  className="font-bold text-emerald-700 hover:underline"
                                >
                                  Bukti
                                </button>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleSelectHistorySlip(row)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-[11px] font-bold text-emerald-800 transition hover:bg-emerald-100"
                          >
                            <span>Buka & Cetak Slip</span>
                            <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>

      {/* ========================================================
          4. MODAL PRATINJAU BUKTI TRANSFER / KUITANSI
      ======================================================== */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Pratinjau Bukti Pembayaran / Kuitansi"
          maxWidth="max-w-lg"
        >
          <div className="flex flex-col items-center gap-4 p-2">
            <img
              src={previewImage}
              alt="Bukti pembayaran atau kuitansi"
              className="max-h-[70vh] w-auto rounded-xl border border-slate-200 object-contain shadow-xs"
            />
            <button
              type="button"
              onClick={() => setPreviewImage(null)}
              className="rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white transition hover:bg-slate-800"
            >
              Tutup Pratinjau
            </button>
          </div>
        </Modal>
      )}
    </div>
  );
}
