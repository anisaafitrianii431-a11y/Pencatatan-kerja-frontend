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
import KopSuratCetak from '../../components/KopSuratCetak';
import TandaTanganCetak from '../../components/TandaTanganCetak';
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

export default function GajiKaryawan({ currentUser }) {
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
  const [detailModalJob, setDetailModalJob] = useState(null);
  const [projectSearch, setProjectSearch] = useState('');
  const [paymentSlipRow, setPaymentSlipRow] = useState(null);
  const [paymentSlipDetail, setPaymentSlipDetail] = useState(null);
  const [paymentSlipLoading, setPaymentSlipLoading] = useState(false);

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
    setDetailModalJob(null);
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
  const printableProjects = isFilteredByJob && activeJob ? [activeJob] : pekerjaanSummary;
  const jenisUpahEfektif = activeJob?.jenis_upah || jenisUpah;
  const tarifEfektif = Number(activeJob ? activeJob.nominal_upah : tarif);
  const labelJenisUpahEfektif = jenisUpahEfektif === 'per_hari'
    ? 'Hari'
    : jenisUpahEfektif === 'per_bulan'
      ? 'Bulan'
      : jenisUpahEfektif === 'per_tahun'
        ? 'Tahun'
        : jenisUpahEfektif === 'borongan'
          ? 'Proyek'
          : 'Jam';
  const tarifDisplay = isFilteredByJob
    ? activeJob
      ? `${formatRupiah(activeJob.nominal_upah)} / ${labelJenisUpahEfektif}`
      : 'Tarif proyek tidak tersedia'
    : pekerjaanSummary.length > 0
      ? 'Berbeda per proyek'
      : 'Belum ada tarif proyek';

  const visibleAbsensi = useMemo(() => {
    if (!isFilteredByJob) return allAbsensi;
    return allAbsensi.filter((item) => String(item.id_pekerjaan) === String(selectedPekerjaanId));
  }, [allAbsensi, isFilteredByJob, selectedPekerjaanId]);

  // Hitung upah sesi dengan tarif dari pekerjaan terkait, bukan tarif umum karyawan.
  // Untuk tarif harian/bulanan, upah per hari dibagi rata ke sesi pada hari itu
  // agar jumlah rincian sesi tetap sama dengan estimasi upah pekerjaan.
  const sessionWages = useMemo(() => {
    const sessionsByJobDay = new Map();
    const daysByJob = new Map();
    visibleAbsensi.forEach((item) => {
      const jobId = String(item.id_pekerjaan);
      const date = String(item.tanggal || '').slice(0, 10);
      const key = `${jobId}:${date}`;
      sessionsByJobDay.set(key, (sessionsByJobDay.get(key) || 0) + 1);
      if (!daysByJob.has(jobId)) daysByJob.set(jobId, new Set());
      daysByJob.get(jobId).add(date);
    });

    return new Map(visibleAbsensi.map((item) => {
      const job = pekerjaanSummary.find((row) => String(row.id_pekerjaan) === String(item.id_pekerjaan));
      const type = job?.jenis_upah || item.jenis_upah || 'per_jam';
      const rate = Number(job?.nominal_upah ?? item.nominal_upah ?? tarif ?? 0);
      const duration = Number(item.durasi_jam || 0);
      let wage = duration * rate;

      if (type !== 'per_jam') {
        const jobId = String(item.id_pekerjaan);
        const days = daysByJob.get(jobId)?.size || 0;
        const dailyWage = type === 'per_hari'
          ? rate
          : days > 0
            ? Number(job?.estimasi_upah || 0) / days
            : 0;
        const key = `${jobId}:${String(item.tanggal || '').slice(0, 10)}`;
        wage = dailyWage / Math.max(1, sessionsByJobDay.get(key) || 1);
      }

      return [String(item.id_absensi), Number(wage.toFixed(2))];
    }));
  }, [visibleAbsensi, pekerjaanSummary, tarif]);

  const visibleExpenses = useMemo(() => {
    if (!isFilteredByJob) return allExpenses;
    return allExpenses.filter((item) => String(item.id_pekerjaan) === String(selectedPekerjaanId));
  }, [allExpenses, isFilteredByJob, selectedPekerjaanId]);
  const personalExpenses = visibleExpenses.filter((item) => !item.jenis_dana || item.jenis_dana === 'pribadi');
  const officeExpenses = visibleExpenses.filter((item) => item.jenis_dana === 'kantor');

  // Agregasi angka seluruh periode
  const approvedHoursAll = useMemo(
    () => Number(allAbsensi.reduce((sum, item) => sum + (Number(item.durasi_jam) || 0), 0).toFixed(2)),
    [allAbsensi]
  );
  const approvedReimburseAll = useMemo(
    () => Number(allExpenses.filter((item) => !item.jenis_dana || item.jenis_dana === 'pribadi').reduce((sum, item) => sum + (Number(item.nominal) || 0), 0).toFixed(2)),
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
    ? Number(activeJob?.estimasi_upah ?? wageForHoursAndDays(visibleHours, visibleDays, totalJobAttendanceDays))
    : Number(pekerjaanSummary.reduce((sum, job) => sum + Number(job.estimasi_upah || 0), 0).toFixed(2));

  const totalReimburse = isFilteredByJob
    ? Number(personalExpenses.reduce((sum, item) => sum + (Number(item.nominal) || 0), 0).toFixed(2))
    : approvedReimburseAll;

  const bonus = isFilteredByJob ? 0 : Number(slipGaji?.bonus || 0);
  const potongan = isFilteredByJob ? 0 : Number(slipGaji?.potongan || 0);

  const isPaid = slipGaji?.status_bayar === 'sudah';
  const totalUpahLembur = isFilteredByJob
    ? Number(activeJob?.upah_lembur || 0)
    : pekerjaanSummary.reduce((sum, job) => sum + Number(job.upah_lembur || 0), 0);
  const totalJamLembur = isFilteredByJob
    ? Number(activeJob?.jam_lembur || 0)
    : pekerjaanSummary.reduce((sum, job) => sum + Number(job.jam_lembur || 0), 0);
  const lemburDiizinkan = isFilteredByJob
    ? Number(activeJob?.lembur_diizinkan) === 1
    : pekerjaanSummary.some((job) => Number(job.lembur_diizinkan) === 1);
  const totalUpahPokok = Math.max(0, Number((upahKerja - totalUpahLembur).toFixed(2)));
  const totalDibayar = isFilteredByJob
    ? Math.max(0, Number((upahKerja + totalReimburse).toFixed(2)))
    : (isPaid && slipGaji?.total_dibayar !== undefined
        ? Number(slipGaji.total_dibayar)
        : Math.max(0, Number((upahKerja + totalReimburse + bonus - potongan).toFixed(2))));

  const porsiJamPersen = approvedHoursAll > 0
    ? Math.round((visibleHours / approvedHoursAll) * 100)
    : 0;

  const isCalculated = Boolean(
    slipGaji && (isPaid || slipGaji.sudah_ditetapkan || slipGaji.status_penetapan === 'ditetapkan')
  );
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
    setSelectedPekerjaanId('semua');
    if (activeTab !== 'slip') {
      setActiveTab('slip');
    }
    window.setTimeout(() => window.print(), 140);
  };

  const handlePrintProjectSlip = (jobId) => {
    document.body.classList.remove('printing-modal');
    setSelectedPekerjaanId(String(jobId));
    if (activeTab !== 'slip') {
      setActiveTab('slip');
    }
    window.setTimeout(() => window.print(), 150);
  };

  const filteredProjects = useMemo(() => {
    const q = projectSearch.trim().toLowerCase();
    if (!q) return pekerjaanSummary;
    return pekerjaanSummary.filter((job) =>
      String(job.nama_pekerjaan || '').toLowerCase().includes(q) ||
      String(job.lokasi || '').toLowerCase().includes(q) ||
      String(job.nama_role || job.peran_tugas || '').toLowerCase().includes(q),
    );
  }, [pekerjaanSummary, projectSearch]);

  const handleSelectHistorySlip = async (row) => {
    setPaymentSlipRow(row);
    setPaymentSlipDetail(null);
    if (!row?.id_gaji) return;
    setPaymentSlipLoading(true);
    try {
      const slipRes = await GajiService.getSlip(row.id_gaji);
      setPaymentSlipDetail(slipRes || null);
    } catch {
      try {
        const hist = await GajiService.getPembayaranHistory(row.id_gaji);
        setPaymentSlipDetail({ ...row, pembayaran_list: Array.isArray(hist) ? hist : [] });
      } catch {
        setPaymentSlipDetail(row);
      }
    } finally {
      setPaymentSlipLoading(false);
    }
  };

  const isPartialPaid = slipGaji?.status_bayar === 'sebagian';
  const statusBadgeText = isPaid
    ? 'Lunas Dibayarkan'
    : isPartialPaid
      ? 'Dibayar Sebagian'
      : isCalculated
        ? 'Menunggu Pembayaran Admin'
        : 'Estimasi Berjalan (Belum Ditetapkan)';

  return (
    <div className="space-y-6">
      {/* ========================================================
          1. PAGE HEADER & FILTER TOOLBAR (LAYAR WEB ONLY)
      ======================================================== */}
      <header className="no-print relative overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-6 text-white shadow-lg shadow-emerald-950/15">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-emerald-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 h-40 w-40 rounded-full bg-teal-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-200 backdrop-blur-md">
              <Wallet className="h-3.5 w-3.5 text-emerald-300" />
              <span>AREA KERJA KARYAWAN • PORTAL PENGGAJIAN RESMI</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Slip Gaji Pribadi
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-emerald-100/90 leading-relaxed">
              Pantau rincian upah per pekerjaan dari absensi yang disetujui, klaim reimbursement, dan status pembayaran resmi dari Admin.
            </p>

            {/* Quick Status Pill Chips */}
            <div className="mt-3 flex flex-wrap items-center gap-2 pt-1 text-xs">
              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1 font-medium text-emerald-100 backdrop-blur-sm">
                <Calendar className="h-3.5 w-3.5 text-emerald-300" />
                Periode: <strong className="text-white font-bold">{formatPeriodeIndo(selectedPeriode)}</strong>
              </span>

              <span className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1 font-semibold backdrop-blur-sm ${
                isPaid
                  ? 'border-emerald-400/40 bg-emerald-500/20 text-emerald-200'
                  : isPartialPaid
                    ? 'border-amber-400/40 bg-amber-500/20 text-amber-200'
                    : isCalculated
                      ? 'border-blue-400/40 bg-blue-500/20 text-blue-200'
                      : 'border-white/20 bg-white/10 text-slate-200'
              }`}>
                {isPaid ? (
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                ) : isPartialPaid ? (
                  <Clock className="h-3.5 w-3.5 text-amber-300" />
                ) : (
                  <CreditCard className="h-3.5 w-3.5 text-blue-300" />
                )}
                <span>Status: <strong>{statusBadgeText}</strong></span>
              </span>

              <span className="inline-flex items-center gap-1.5 rounded-lg border border-white/15 bg-white/10 px-3 py-1 font-medium text-emerald-100 backdrop-blur-sm">
                <span>💰 Total Bersih:</span>
                <strong className="text-amber-300 font-extrabold">{formatRupiah(totalDibayar)}</strong>
              </span>
            </div>
          </div>

          {/* Quick Action Toolbar inside Hero */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => loadData(selectedPeriode)}
              disabled={loading}
              className="inline-flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-950 shadow-sm transition hover:bg-emerald-50 sm:text-sm cursor-pointer disabled:opacity-50"
              aria-label="Segarkan data slip gaji"
              title="Segarkan Data"
            >
              <RefreshCw className={`h-4 w-4 text-emerald-700 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
              <span>{loading ? 'Memuat...' : 'Segarkan'}</span>
            </button>

            <button
              type="button"
              onClick={handlePrintSlip}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-2.5 text-xs font-bold text-white shadow-sm backdrop-blur-sm transition hover:bg-white/25 sm:text-sm cursor-pointer"
            >
              <Printer className="h-4 w-4 text-emerald-200" aria-hidden="true" />
              <span>Cetak Semua Proyek (PDF)</span>
            </button>
          </div>
        </div>
      </header>

      {/* FILTER PERIODE & NAVIGATION TABS */}
      <div className="no-print rounded-2xl border border-slate-200/90 bg-white p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          {/* Pill Tabs */}
          <div
            role="tablist"
            aria-label="Navigasi fitur gaji"
            className="flex flex-wrap items-center gap-2"
          >
            <button
              type="button"
              id="tab-slip"
              role="tab"
              aria-selected={activeTab === 'slip'}
              onClick={() => setActiveTab('slip')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'slip'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <FileSpreadsheet className="h-4 w-4" aria-hidden="true" />
              <span>Slip &amp; Rincian Pekerjaan</span>
            </button>

            <button
              type="button"
              id="tab-riwayat"
              role="tab"
              aria-selected={activeTab === 'riwayat'}
              onClick={() => setActiveTab('riwayat')}
              className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                activeTab === 'riwayat'
                  ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/25'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
              }`}
            >
              <History className="h-4 w-4" aria-hidden="true" />
              <span>Riwayat Pembayaran Gaji</span>
              <span className={`rounded-full px-2 py-0.5 text-[11px] font-extrabold ${
                activeTab === 'riwayat'
                  ? 'bg-white/20 text-white'
                  : 'bg-slate-200 text-slate-700'
              }`}>
                {historyList.length}
              </span>
            </button>
          </div>

          {/* Periode Month Picker */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">
              Pilih Periode:
            </span>
            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-800 shadow-2xs transition focus-within:border-emerald-500 focus-within:bg-white focus-within:ring-2 focus-within:ring-emerald-500/20">
              <Calendar className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden="true" />
              <input
                id="gaji-periode"
                type="month"
                value={selectedPeriode}
                onChange={(e) => handleChangePeriode(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
                aria-label="Pilih Periode Bulan"
              />
            </div>
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
            <KopSuratCetak
              title={
                isFilteredByJob && activeJob
                  ? 'SLIP RINCIAN UPAH & PENGELUARAN PROYEK'
                  : 'RINCIAN SLIP GAJI PER PROYEK'
              }
              subtitle={
                isFilteredByJob && activeJob
                  ? `Proyek: ${activeJob.nama_pekerjaan}${activeJob.lokasi && activeJob.lokasi !== activeJob.nama_pekerjaan ? ` (${activeJob.lokasi})` : ''}`
                  : 'Rincian upah, absensi, dan reimbursement untuk setiap proyek pada periode ini'
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
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Jabatan &amp; Master Role</td>
                    <td className="px-3 py-2">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold">
                          {isFilteredByJob && activeJob ? (activeJob.nama_role || activeJob.peran_tugas || jabatanKaryawan) : 'Beragam peran proyek'}
                        </span>
                        <span className="inline-flex items-center gap-1 rounded bg-indigo-50 px-1.5 py-0.2 text-[10px] font-bold text-indigo-700 border border-indigo-200">
                          {isFilteredByJob && activeJob
                            ? `Level ${activeJob.hierarchy_level || 1} · Master Role`
                            : `${printableProjects.length} proyek`}
                        </span>
                      </div>
                    </td>
                    <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Skema Tarif</td>
                    <td className="px-3 py-2 font-bold text-slate-900">{tarifDisplay}</td>
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
                  {(isPaid || isPartialPaid) && (
                    <tr>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Tanggal Pembayaran Terakhir</td>
                      <td className="px-3 py-2">{slipGaji?.tanggal_bayar ? formatTanggalIndo(slipGaji.tanggal_bayar) : '-'}</td>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Sudah Dibayar / Sisa</td>
                      <td className="px-3 py-2 font-semibold">
                        {formatRupiah(Number(slipGaji?.total_dibayar || 0))}
                        {isPartialPaid && (
                          <span className="ml-1.5 text-red-700">
                            (Sisa: {formatRupiah(Math.max(0, Number(slipGaji?.gaji_bersih || totalDibayar) - Number(slipGaji?.total_dibayar || 0)))})
                          </span>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="salary-print-projects">
              {printableProjects.length === 0 ? (
                <p className="py-8 text-center text-sm text-slate-500">
                  Belum ada data proyek atau absensi untuk periode ini.
                </p>
              ) : printableProjects.map((job, index) => {
                const jobId = String(job.id_pekerjaan);
                const jobAbsensi = allAbsensi.filter((item) => String(item.id_pekerjaan) === jobId);
                const jobExpenses = personalExpenses.filter((item) => String(item.id_pekerjaan) === jobId);
                const jobSegments = (detailData.slip?.rincian_segmen_gaji || []).filter(
                  (segment) => Number(segment.id_pekerjaan) === Number(job.id_pekerjaan),
                );
                const jobRate = Number(job.nominal_upah || 0);
                const jobRateUnit = job.jenis_upah === 'per_hari'
                  ? 'hari'
                  : job.jenis_upah === 'per_bulan'
                    ? 'bulan'
                    : job.jenis_upah === 'per_tahun'
                      ? 'tahun'
                      : job.jenis_upah === 'borongan'
                        ? 'proyek'
                        : 'jam';
                const jobWage = Number(job.estimasi_upah || 0);
                const jobOvertime = Number(job.upah_lembur || 0);
                const jobBaseWage = Number(job.upah_pokok || Math.max(0, jobWage - jobOvertime));
                const jobReimburse = jobExpenses.reduce((sum, item) => sum + Number(item.nominal || 0), 0);
                const jobTotal = jobWage + jobReimburse;

                return (
                  <section className="salary-print-project" key={job.id_pekerjaan}>
                    <div className="salary-print-project-heading">
                      <div>
                        <p className="salary-print-overline">Proyek {index + 1}</p>
                        <h2>{job.nama_pekerjaan || `Proyek #${job.id_pekerjaan}`}</h2>
                        <p>{job.lokasi || 'Lokasi tidak dicantumkan'} · {job.nama_role || job.peran_tugas || 'Anggota tim'}</p>
                      </div>
                      <div className="salary-print-rate">
                        {jobSegments.length > 1 ? 'Skema tarif periode ini' : 'Tarif penugasan'}<br />
                        <strong>{jobSegments.length > 1 ? `${jobSegments.length} skema` : `${formatRupiah(jobRate)} / ${jobRateUnit}`}</strong>
                      </div>
                    </div>

                    <div className="salary-print-meta">
                      <span>{jobAbsensi.length} sesi disetujui</span>
                      <span>{Number(job.total_jam_disetujui || 0).toFixed(2)} jam kerja</span>
                      <span>{countWorkDays(jobAbsensi)} hari hadir</span>
                    </div>

                    {jobSegments.length > 0 && (
                      <table className="salary-print-table salary-print-rates">
                        <thead>
                          <tr>
                            <th colSpan={2}>Skema tarif berlaku</th>
                            <th className="text-right">Tarif</th>
                            <th className="text-right">Upah segmen</th>
                          </tr>
                        </thead>
                        <tbody>
                          {jobSegments.map((segment, segmentIndex) => {
                            const unit = segment.jenis_upah === 'per_hari'
                              ? 'hari'
                              : segment.jenis_upah === 'per_bulan'
                                ? 'bulan'
                                : segment.jenis_upah === 'per_tahun'
                                  ? 'tahun'
                                  : segment.jenis_upah === 'borongan'
                                    ? 'proyek'
                                    : 'jam';
                            return (
                              <tr key={`${segment.id_riwayat_gaji || segmentIndex}-${segment.segmen_mulai}`}>
                                <td colSpan={2}>{formatTanggalIndo(segment.segmen_mulai)} – {formatTanggalIndo(segment.segmen_selesai)}</td>
                                <td className="text-right">{formatRupiah(segment.nominal_upah)} / {unit}</td>
                                <td className="text-right">{formatRupiah(segment.subtotal_upah)}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}

                    <h4 className="salary-print-section-title">A. Rincian Sesi Kerja Disetujui</h4>
                    <table className="salary-print-table">
                      <thead>
                        <tr>
                          <th style={{ width: '34%' }}>Tanggal</th>
                          <th style={{ width: '38%' }}>Jam Kerja</th>
                          <th className="text-right" style={{ width: '28%' }}>Durasi</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobAbsensi.length === 0 ? (
                          <tr><td colSpan={3} className="text-center text-slate-500">Belum ada absensi disetujui pada proyek ini.</td></tr>
                        ) : jobAbsensi.map((item) => (
                          <tr key={item.id_absensi}>
                            <td>{formatTanggalIndo(item.tanggal, true)}</td>
                            <td>{formatClockRange(item.jam_masuk, item.jam_pulang)} WIB</td>
                            <td className="text-right">{Number(item.durasi_jam || 0).toFixed(2)} jam</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <h4 className="salary-print-section-title">B. Rincian Pengeluaran &amp; Reimbursement Pribadi</h4>
                    <table className="salary-print-table salary-print-expenses">
                      <thead>
                        <tr>
                          <th style={{ width: '28%' }}>Tanggal</th>
                          <th style={{ width: '48%' }}>Keterangan Pengeluaran</th>
                          <th className="text-right" style={{ width: '24%' }}>Nominal</th>
                        </tr>
                      </thead>
                      <tbody>
                        {jobExpenses.length === 0 ? (
                          <tr><td colSpan={3} className="text-center text-slate-500">Tidak ada klaim reimbursement pada proyek ini.</td></tr>
                        ) : jobExpenses.map((item) => (
                          <tr key={item.id_pengeluaran}>
                            <td>{formatTanggalIndo(item.tanggal)}</td>
                            <td>{item.keterangan || 'Pengeluaran proyek'}</td>
                            <td className="text-right">{formatRupiah(item.nominal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>

                    <div className="salary-print-subtotal">
                      <div><span>Upah kerja</span><strong>{formatRupiah(jobBaseWage)}</strong></div>
                      {jobOvertime > 0 && <div><span>Upah lembur</span><strong>{formatRupiah(jobOvertime)}</strong></div>}
                      <div><span>Reimbursement disetujui</span><strong>{formatRupiah(jobReimburse)}</strong></div>
                      <div className="salary-print-project-total"><span>Total proyek</span><strong>{formatRupiah(jobTotal)}</strong></div>
                    </div>
                  </section>
                );
              })}

              {!isFilteredByJob && (bonus > 0 || potongan > 0) && (
                <div className="salary-print-adjustments">
                  {bonus > 0 && <div><span>Bonus / insentif</span><strong>+{formatRupiah(bonus)}</strong></div>}
                  {potongan > 0 && <div><span>Potongan</span><strong>-{formatRupiah(potongan)}</strong></div>}
                </div>
              )}

              <div className="salary-print-grand-total">
                <span>{isPaid ? 'Total dibayarkan' : isCalculated ? 'Total gaji ditetapkan' : 'Total estimasi penghasilan'}</span>
                <strong>{formatRupiah(totalDibayar)}</strong>
              </div>
              {!isFilteredByJob && isPartialPaid && slipGaji && (
                <div className="salary-print-adjustments" style={{ marginTop: '6px' }}>
                  <div>
                    <span>Sudah dibayar</span>
                    <strong>{formatRupiah(Number(slipGaji.total_dibayar || 0))}</strong>
                  </div>
                  <div>
                    <span>Sisa pembayaran</span>
                    <strong>
                      {formatRupiah(
                        Math.max(0, Number(slipGaji.gaji_bersih || totalDibayar) - Number(slipGaji.total_dibayar || 0))
                      )}
                    </strong>
                  </div>
                </div>
              )}
              <p className="salary-print-spelled">Terbilang: #{angkaTerbilang(totalDibayar)}#</p>
            </div>
          </div>

          {/* BANNER STATUS PEMBAYARAN GAJI */}
          {slipGaji && (slipGaji.status_bayar === 'sudah' || slipGaji.status_bayar === 'sebagian') && (
            <div className={`no-print flex items-start gap-3 rounded-2xl border px-5 py-4 ${
              slipGaji.status_bayar === 'sudah'
                ? 'border-emerald-200 bg-emerald-50'
                : 'border-amber-200 bg-amber-50'
            }`}>
              <div className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-lg ${
                slipGaji.status_bayar === 'sudah' ? 'bg-emerald-100' : 'bg-amber-100'
              }`}>
                {slipGaji.status_bayar === 'sudah' ? '✓' : '◑'}
              </div>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-bold ${
                  slipGaji.status_bayar === 'sudah' ? 'text-emerald-800' : 'text-amber-800'
                }`}>
                  {slipGaji.status_bayar === 'sudah'
                    ? 'Gaji Sudah Dibayar Lunas'
                    : 'Gaji Dibayar Sebagian'}
                </p>
                <p className={`mt-0.5 text-xs ${
                  slipGaji.status_bayar === 'sudah' ? 'text-emerald-700' : 'text-amber-700'
                }`}>
                  {slipGaji.status_bayar === 'sudah'
                    ? `Admin telah melunasi pembayaran gaji periode ${formatPeriodeIndo(selectedPeriode)} sebesar ${formatRupiah(Number(slipGaji.total_dibayar || 0))}. Lihat rincian di tab Riwayat Pembayaran Gaji.`
                    : `Admin telah membayar ${formatRupiah(Number(slipGaji.total_dibayar || 0))} dari total ${formatRupiah(Number(slipGaji.gaji_bersih || 0))}. Sisa pembayaran: ${formatRupiah(Math.max(0, Number(slipGaji.gaji_bersih || 0) - Number(slipGaji.total_dibayar || 0)))}.`}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('riwayat')}
                className={`shrink-0 rounded-lg border px-3 py-1.5 text-[11px] font-bold transition ${
                  slipGaji.status_bayar === 'sudah'
                    ? 'border-emerald-300 bg-white text-emerald-700 hover:bg-emerald-100'
                    : 'border-amber-300 bg-white text-amber-700 hover:bg-amber-100'
                }`}
              >
                Lihat Riwayat
              </button>
            </div>
          )}

          {/* DAFTAR PROJECT PEKERJAAN + TOMBOL RINCIAN SLIP & CETAK PDF PER PROYEK */}
          <section className="no-print space-y-4" aria-labelledby="daftar-proyek-slip">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 id="daftar-proyek-slip" className="text-lg font-bold text-slate-900">
                  Data Project Pekerjaan &amp; Slip Gaji
                </h2>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  Pilih proyek untuk melihat rincian slip gaji beserta pengeluaran/reimbursement, atau langsung cetak PDF per proyek.
                </p>
              </div>
              {pekerjaanSummary.length > 2 && (
                <div className="w-full sm:w-64">
                  <input
                    type="text"
                    value={projectSearch}
                    onChange={(e) => setProjectSearch(e.target.value)}
                    placeholder="Cari nama proyek atau lokasi..."
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-800 outline-none focus:border-emerald-500"
                  />
                </div>
              )}
            </div>

            {loading ? (
              <div className="rounded-2xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">
                Memuat data project pekerjaan dan rincian gaji…
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">
                {pekerjaanSummary.length === 0
                  ? `Belum ada project pekerjaan yang ditugaskan pada periode ${formatPeriodeIndo(selectedPeriode)}.`
                  : 'Tidak ada project pekerjaan yang cocok dengan pencarian Anda.'}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                {filteredProjects.map((job) => {
                  const jobId = String(job.id_pekerjaan);
                  const jobRows = allAbsensi.filter((item) => String(item.id_pekerjaan) === jobId);
                  const jobReimburseRows = allExpenses.filter((item) => String(item.id_pekerjaan) === jobId && (!item.jenis_dana || item.jenis_dana === 'pribadi'));
                  const jobOfficeRows = allExpenses.filter((item) => String(item.id_pekerjaan) === jobId && item.jenis_dana === 'kantor');
                  const jobDaysCount = countWorkDays(jobRows);
                  const wage = Number(job.estimasi_upah || 0);
                  const reimburse = Number(job.reimbursement_disetujui || 0);
                  const officeTotal = Number(job.pengeluaran_kantor_disetujui || jobOfficeRows.reduce((s, e) => s + Number(e.nominal || 0), 0));
                  const totalProyek = wage + reimburse;
                  const rateUnit = job.jenis_upah === 'per_hari'
                    ? 'hari'
                    : job.jenis_upah === 'per_bulan'
                      ? 'bulan'
                      : job.jenis_upah === 'per_tahun'
                        ? 'tahun'
                        : job.jenis_upah === 'borongan'
                          ? 'proyek'
                          : 'jam';
                  const statusMeta = JOB_STATUS_META[job.status_pekerjaan] || JOB_STATUS_META.berjalan;

                  return (
                    <article
                      key={jobId}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-emerald-300 hover:shadow-md"
                    >
                      <div className="space-y-4">
                        {/* Header Proyek */}
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <h3 className="text-base font-bold text-slate-900">
                                {job.nama_pekerjaan || `Pekerjaan #${jobId}`}
                              </h3>
                              <span className={`inline-flex rounded-full border px-2.5 py-0.5 text-[11px] font-semibold ${statusMeta.badgeClass}`}>
                                {statusMeta.label}
                              </span>
                            </div>
                            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                              <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-bold text-indigo-700 border border-indigo-200">
                                {job.nama_role || job.peran_tugas || 'Anggota Tim'}
                              </span>
                              <span>·</span>
                              <span className="font-semibold text-slate-700">
                                Tarif {formatRupiah(job.nominal_upah)} / {rateUnit}
                              </span>
                              {job.lokasi && (
                                <>
                                  <span>·</span>
                                  <span className="inline-flex items-center gap-1">
                                    <MapPin className="h-3 w-3 text-slate-400" aria-hidden="true" />
                                    {job.lokasi}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 3 Metrik Ringkas Proyek */}
                        <div className="grid grid-cols-3 gap-2.5">
                          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                            <span className="block text-[11px] font-medium text-slate-500">Kehadiran</span>
                            <strong className="mt-1 block text-sm font-bold text-slate-900">
                              {jobRows.length} sesi
                            </strong>
                            <span className="block text-[11px] text-slate-500">
                              {jobDaysCount} hari · {Number(job.total_jam_disetujui || 0).toFixed(1)} jam
                            </span>
                          </div>

                          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3">
                            <span className="block text-[11px] font-medium text-emerald-800">Upah Kerja</span>
                            <strong className="mt-1 block text-sm font-bold text-emerald-900">
                              {formatRupiah(wage)}
                            </strong>
                            <span className="block text-[11px] text-emerald-700">
                              {Number(job.upah_lembur || 0) > 0
                                ? `+Lembur ${formatRupiah(job.upah_lembur)}`
                                : 'Termasuk tarif aktif'}
                            </span>
                          </div>

                          <div className="rounded-xl border border-amber-100 bg-amber-50/60 p-3">
                            <span className="block text-[11px] font-medium text-amber-800">Reimbursement</span>
                            <strong className="mt-1 block text-sm font-bold text-amber-900">
                              {formatRupiah(reimburse)}
                            </strong>
                            <span className="block text-[11px] text-amber-700">
                              {jobReimburseRows.length} nota pribadi
                            </span>
                          </div>
                        </div>

                        {officeTotal > 0 && (
                          <div className="flex items-center justify-between rounded-xl border border-blue-100 bg-blue-50/60 px-3 py-2 text-xs text-blue-800">
                            <span>Pengeluaran Uang Kantor pada proyek ini ({jobOfficeRows.length} nota)</span>
                            <strong>{formatRupiah(officeTotal)}</strong>
                          </div>
                        )}
                      </div>

                      {/* Footer Total & Tombol Aksi */}
                      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
                        <div>
                          <span className="block text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Total Slip Proyek
                          </span>
                          <strong className="text-lg font-black text-slate-900">
                            {formatRupiah(totalProyek)}
                          </strong>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setDetailModalJob(job)}
                            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-2xs transition hover:border-emerald-300 hover:bg-emerald-50 hover:text-emerald-800 cursor-pointer"
                          >
                            <Eye className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Lihat Rincian Slip</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handlePrintProjectSlip(jobId)}
                            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 cursor-pointer"
                          >
                            <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                            <span>Cetak PDF</span>
                          </button>
                        </div>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* TANDA TANGAN PENGESAHAN (PRINT ONLY) */}
          <div className="print-only">
            <TandaTanganCetak
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
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                            row.status_bayar === 'sudah'
                              ? 'bg-emerald-100 text-emerald-800'
                              : row.status_bayar === 'sebagian'
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-slate-100 text-slate-600'
                          }`}>
                            {row.status_bayar === 'sudah'
                              ? '✓ Lunas'
                              : row.status_bayar === 'sebagian'
                                ? '◑ Dibayar Sebagian'
                                : '○ Belum Dibayar'}
                          </span>
                          {row.status_bayar === 'sebagian' && (
                            <div className="mt-1 text-[10px] text-amber-700 font-semibold">
                              Dibayar: {formatRupiah(row.total_dibayar)}
                              {Number(row.sisa_pembayaran || 0) > 0 && (
                                <span className="ml-1 text-red-600">· Sisa {formatRupiah(Number(row.sisa_pembayaran))}</span>
                              )}
                            </div>
                          )}
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
          4. MODAL RINCIAN SLIP GAJI & PENGELUARAN PER PROYEK
      ======================================================== */}
      {detailModalJob && (() => {
        const job = detailModalJob;
        const jobId = String(job.id_pekerjaan);
        const jobAbsensi = allAbsensi.filter((item) => String(item.id_pekerjaan) === jobId);
        const jobPersonalExpenses = allExpenses.filter((item) => String(item.id_pekerjaan) === jobId && (!item.jenis_dana || item.jenis_dana === 'pribadi'));
        const jobOfficeExpenses = allExpenses.filter((item) => String(item.id_pekerjaan) === jobId && item.jenis_dana === 'kantor');
        const jobSegments = (detailData.slip?.rincian_segmen_gaji || []).filter(
          (segment) => Number(segment.id_pekerjaan) === Number(job.id_pekerjaan),
        );
        const jobWage = Number(job.estimasi_upah || 0);
        const jobOvertime = Number(job.upah_lembur || 0);
        const jobBaseWage = Number(job.upah_pokok || Math.max(0, jobWage - jobOvertime));
        const jobReimburse = jobPersonalExpenses.reduce((sum, item) => sum + Number(item.nominal || 0), 0);
        const jobOfficeTotal = jobOfficeExpenses.reduce((sum, item) => sum + Number(item.nominal || 0), 0);
        const jobTotal = jobWage + jobReimburse;
        const rateUnit = job.jenis_upah === 'per_hari'
          ? 'hari'
          : job.jenis_upah === 'per_bulan'
            ? 'bulan'
            : job.jenis_upah === 'per_tahun'
              ? 'tahun'
              : job.jenis_upah === 'borongan'
                ? 'proyek'
                : 'jam';

        return (
          <Modal
            isOpen={!!detailModalJob}
            onClose={() => setDetailModalJob(null)}
            title={`Rincian Slip Gaji — ${job.nama_pekerjaan || `Proyek #${jobId}`}`}
            maxWidth="max-w-4xl"
          >
            <div className="space-y-5 text-xs sm:text-sm">
              {/* Info Proyek & Ringkasan Upah */}
              <div className="rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-200/80">
                  <div>
                    <div className="font-bold text-slate-900 text-base">{job.nama_pekerjaan}</div>
                    <div className="text-xs text-slate-500 mt-0.5">
                      Role: <strong>{job.nama_role || job.peran_tugas || 'Anggota Tim'}</strong> · Tarif{' '}
                      <strong>{formatRupiah(job.nominal_upah)} / {rateUnit}</strong>
                      {job.lokasi ? ` · ${job.lokasi}` : ''}
                    </div>
                  </div>
                  <span className="rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-800">
                    {formatPeriodeIndo(selectedPeriode)}
                  </span>
                </div>

                <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="rounded-xl bg-white p-3 border border-slate-200/70">
                    <span className="text-[11px] text-slate-500 block">Upah Pokok</span>
                    <strong className="text-sm text-slate-900">{formatRupiah(jobBaseWage)}</strong>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-slate-200/70">
                    <span className="text-[11px] text-slate-500 block">Upah Lembur</span>
                    <strong className="text-sm text-amber-700">{jobOvertime > 0 ? `+${formatRupiah(jobOvertime)}` : 'Rp 0'}</strong>
                  </div>
                  <div className="rounded-xl bg-white p-3 border border-amber-200/70">
                    <span className="text-[11px] text-amber-800 block">Reimbursement</span>
                    <strong className="text-sm text-amber-700">+{formatRupiah(jobReimburse)}</strong>
                  </div>
                  <div className="rounded-xl bg-emerald-600 p-3 text-white">
                    <span className="text-[11px] text-emerald-100 block">Total Hak Proyek</span>
                    <strong className="text-sm font-black">{formatRupiah(jobTotal)}</strong>
                  </div>
                </div>

                <p className="mt-3 text-xs text-slate-600">
                  <strong>Terbilang:</strong> <span className="italic"># {angkaTerbilang(jobTotal)} #</span>
                </p>
              </div>

              {/* Segmen Perubahan Tarif jika ada */}
              {jobSegments.length > 0 && (
                <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 space-y-2">
                  <h4 className="text-xs font-bold text-blue-950">Rincian Segmen Tarif &amp; Prorata</h4>
                  <div className="space-y-1.5">
                    {jobSegments.map((seg, idx) => (
                      <div key={idx} className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-white px-3 py-2 border border-blue-100 text-xs">
                        <span>{seg.segmen_mulai} s/d {seg.segmen_selesai}</span>
                        <span className="font-mono text-blue-900">{seg.rumus_teks}</span>
                        <strong className="text-slate-900">{formatRupiah(seg.subtotal_upah)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Sesi Kerja / Absensi Disetujui */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h4 className="text-xs font-bold text-slate-800">Rincian Sesi Kerja Disetujui ({jobAbsensi.length})</h4>
                  <span className="text-xs font-bold text-emerald-700">{Number(job.total_jam_disetujui || 0).toFixed(2)} Jam</span>
                </div>
                {jobAbsensi.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">Belum ada sesi absensi disetujui pada proyek ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">Jam Kerja</th>
                          <th className="px-4 py-2 text-center">Durasi</th>
                          <th className="px-4 py-2">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobAbsensi.map((row) => (
                          <tr key={row.id_absensi}>
                            <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">{formatTanggalIndo(row.tanggal, true)}</td>
                            <td className="px-4 py-2 whitespace-nowrap">{formatClockRange(row.jam_masuk, row.jam_pulang)} WIB</td>
                            <td className="px-4 py-2 text-center font-bold text-emerald-700 whitespace-nowrap">{Number(row.durasi_jam || 0).toFixed(2)} jam</td>
                            <td className="px-4 py-2 text-slate-500">{row.catatan || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pengeluaran / Reimbursement Pribadi */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-amber-50/70 px-4 py-2.5">
                  <h4 className="text-xs font-bold text-amber-950">Pengeluaran Pribadi / Reimbursement ({jobPersonalExpenses.length})</h4>
                  <span className="text-xs font-bold text-amber-700">+{formatRupiah(jobReimburse)}</span>
                </div>
                {jobPersonalExpenses.length === 0 ? (
                  <p className="p-4 text-xs text-slate-500">Tidak ada pengeluaran pribadi / reimbursement pada proyek ini.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-50 text-[10px] uppercase text-slate-500 border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2">Tanggal</th>
                          <th className="px-4 py-2">Keterangan</th>
                          <th className="px-4 py-2 text-right">Nominal</th>
                          <th className="px-4 py-2 text-center">Status</th>
                          <th className="px-4 py-2 text-center">Nota</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {jobPersonalExpenses.map((item) => (
                          <tr key={item.id_pengeluaran}>
                            <td className="px-4 py-2 font-semibold text-slate-900 whitespace-nowrap">{formatTanggalIndo(item.tanggal)}</td>
                            <td className="px-4 py-2 text-slate-700">{item.keterangan || '-'}</td>
                            <td className="px-4 py-2 text-right font-bold text-amber-700 whitespace-nowrap">{formatRupiah(item.nominal)}</td>
                            <td className="px-4 py-2 text-center">
                              <div className="inline-flex flex-col items-center gap-0.5">
                                <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                                  ✓ Disetujui
                                </span>
                                <span className={`text-[10px] font-semibold ${
                                  item.status_ganti === 'sudah' || isPaid ? 'text-emerald-700' : 'text-amber-700'
                                }`}>
                                  {item.status_ganti === 'sudah' || isPaid ? 'Sudah Diganti' : 'Menunggu Bayar/Slip'}
                                </span>
                              </div>
                            </td>
                            <td className="px-4 py-2 text-center">
                              {item.foto_kwitansi ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(getFileUrl(item.foto_kwitansi))}
                                  className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-1 text-[10px] font-bold text-amber-800 hover:bg-amber-100 cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" /> Lihat
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Pengeluaran Uang Kantor Terpisah */}
              {jobOfficeExpenses.length > 0 && (
                <div className="overflow-hidden rounded-2xl border border-blue-200">
                  <div className="flex items-center justify-between border-b border-blue-200 bg-blue-50/70 px-4 py-2.5">
                    <h4 className="text-xs font-bold text-blue-950">Pengeluaran Uang Kantor Proyek ({jobOfficeExpenses.length})</h4>
                    <span className="text-xs font-bold text-blue-700">{formatRupiah(jobOfficeTotal)}</span>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {jobOfficeExpenses.map((item) => (
                      <div key={item.id_pengeluaran} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs">
                        <span>{formatTanggalIndo(item.tanggal)} · {item.keterangan || 'Tanpa keterangan'}</span>
                        <strong className="text-blue-700">{formatRupiah(item.nominal)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer Modal */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => setDetailModalJob(null)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDetailModalJob(null);
                    handlePrintProjectSlip(jobId);
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cetak PDF Proyek Ini</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ========================================================
          4B. MODAL RINCIAN PEMBAYARAN GAJI & SISA (DARI RIWAYAT)
      ======================================================== */}
      {paymentSlipRow && (() => {
        const slipObj = paymentSlipDetail?.gaji || paymentSlipDetail || paymentSlipRow;
        const pembayaranList = Array.isArray(paymentSlipDetail?.pembayaran_list)
          ? paymentSlipDetail.pembayaran_list
          : Array.isArray(paymentSlipDetail?.pembayaran)
            ? paymentSlipDetail.pembayaran
            : [];

        const upahKerja = Number(slipObj.total_upah || 0);
        const reimburse = Number(slipObj.total_ganti || 0);
        const rowBonus = Number(slipObj.bonus || 0);
        const rowPotongan = Number(slipObj.potongan || 0);
        const gajiBersih = Number(
          slipObj.gaji_bersih !== undefined
            ? slipObj.gaji_bersih
            : Math.max(0, upahKerja + reimburse + rowBonus - rowPotongan)
        );
        const sudahDibayar = Number(slipObj.total_dibayar || 0);
        const sisaBayar = Math.max(
          0,
          slipObj.sisa_pembayaran !== undefined
            ? Number(slipObj.sisa_pembayaran)
            : gajiBersih - sudahDibayar
        );
        const statusBayar = slipObj.status_bayar || (sisaBayar <= 0 && sudahDibayar > 0 ? 'sudah' : sudahDibayar > 0 ? 'sebagian' : 'belum');
        const slipPeriode = slipObj.periode || paymentSlipRow.periode;
        const noDokumenBayar = generateNoDokumen(
          'SLIP-BAYAR',
          slipPeriode,
          slipObj.id_gaji || currentUser?.id_karyawan || '01'
        );

        const handlePrintPaymentSlip = () => {
          document.body.classList.add('printing-modal');
          const cleanup = () => {
            document.body.classList.remove('printing-modal');
            window.removeEventListener('afterprint', cleanup);
          };
          window.addEventListener('afterprint', cleanup);
          window.setTimeout(() => {
            window.print();
          }, 120);
        };

        return (
          <Modal
            isOpen={!!paymentSlipRow}
            onClose={() => {
              document.body.classList.remove('printing-modal');
              setPaymentSlipRow(null);
              setPaymentSlipDetail(null);
            }}
            title={`Rincian Pembayaran Gaji — ${formatPeriodeIndo(slipPeriode)}`}
            maxWidth="max-w-3xl"
          >
            {/* VERSI CETAK PDF FORMAL (SESUAI RINCIAN PEMBAYARAN GAJI) */}
            <div id="printable-slip" className="print-only">
              <KopSuratCetak />

              <div className="mb-4 text-center">
                <h2 className="text-[14pt] font-extrabold uppercase tracking-wider text-slate-900 underline underline-offset-4">
                  SLIP RINCIAN PEMBAYARAN GAJI
                </h2>
                <p className="mt-1 text-[9.5pt] font-medium text-slate-600">
                  Proyek: {slipObj.nama_pekerjaan || paymentSlipRow.nama_pekerjaan || 'Operasional Lapangan'}
                </p>
                <p className="text-[9pt] text-slate-500">Nomor: {noDokumenBayar}</p>
              </div>

              <div className="mb-4 overflow-hidden rounded-md border border-slate-300">
                <table className="w-full border-collapse text-[9.5pt] text-slate-800">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="w-[22%] bg-slate-100 px-3 py-2 font-bold text-slate-600">Nama Karyawan</td>
                      <td className="w-[28%] px-3 py-2 font-bold text-slate-900">{slipObj.nama_karyawan || namaKaryawan}</td>
                      <td className="w-[22%] bg-slate-100 px-3 py-2 font-bold text-slate-600">Periode Penggajian</td>
                      <td className="w-[28%] px-3 py-2 font-bold text-slate-900">{formatPeriodeIndo(slipPeriode)}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Proyek</td>
                      <td className="px-3 py-2 font-semibold">{slipObj.nama_pekerjaan || paymentSlipRow.nama_pekerjaan || 'Operasional Lapangan'}</td>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Jabatan</td>
                      <td className="px-3 py-2 font-semibold">{slipObj.jabatan || jabatanKaryawan}</td>
                    </tr>
                    <tr>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Status Pembayaran</td>
                      <td className="px-3 py-2 font-extrabold uppercase">
                        {statusBayar === 'sudah'
                          ? 'LUNAS DIBAYARKAN'
                          : statusBayar === 'sebagian'
                            ? 'DIBAYAR SEBAGIAN'
                            : 'BELUM DIBAYAR'}
                      </td>
                      <td className="bg-slate-100 px-3 py-2 font-bold text-slate-600">Total Jam Kerja</td>
                      <td className="px-3 py-2 font-semibold">{Number(slipObj.total_jam || 0).toFixed(2)} jam</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="salary-print-section-title">Ringkasan Perhitungan &amp; Status Pembayaran</div>
              <table className="salary-print-table">
                <thead>
                  <tr>
                    <th>Komponen</th>
                    <th className="text-right">Nominal</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Upah Kerja</td>
                    <td className="text-right">{formatRupiah(upahKerja)}</td>
                  </tr>
                  <tr>
                    <td>Reimbursement Disetujui</td>
                    <td className="text-right">+{formatRupiah(reimburse)}</td>
                  </tr>
                  {rowBonus > 0 && (
                    <tr>
                      <td>Bonus / Insentif</td>
                      <td className="text-right">+{formatRupiah(rowBonus)}</td>
                    </tr>
                  )}
                  {rowPotongan > 0 && (
                    <tr>
                      <td>Potongan</td>
                      <td className="text-right">-{formatRupiah(rowPotongan)}</td>
                    </tr>
                  )}
                  <tr>
                    <td><strong>Total Gaji Bersih</strong></td>
                    <td className="text-right"><strong>{formatRupiah(gajiBersih)}</strong></td>
                  </tr>
                  <tr>
                    <td><strong>Sudah Dibayar</strong></td>
                    <td className="text-right"><strong>{formatRupiah(sudahDibayar)}</strong></td>
                  </tr>
                </tbody>
              </table>

              <div className="salary-print-grand-total">
                <span>Sisa Pembayaran</span>
                <strong>{formatRupiah(sisaBayar)}</strong>
              </div>
              <p className="salary-print-spelled">
                Terbilang Sudah Dibayar: #{angkaTerbilang(sudahDibayar)}#
                {sisaBayar > 0 ? ` · Sisa: #${angkaTerbilang(sisaBayar)}#` : ''}
              </p>

              <div className="salary-print-section-title" style={{ marginTop: '14px' }}>
                Riwayat Transaksi Pembayaran ({pembayaranList.length})
              </div>
              {pembayaranList.length === 0 ? (
                <p className="py-3 text-[9pt] text-slate-500">
                  Belum ada transaksi pembayaran yang dicatat oleh Admin.
                </p>
              ) : (
                <table className="salary-print-table">
                  <thead>
                    <tr>
                      <th>No</th>
                      <th>Tanggal Bayar</th>
                      <th>Metode</th>
                      <th>No. Referensi / Catatan</th>
                      <th className="text-right">Nominal Dibayar</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pembayaranList.map((p, idx) => (
                      <tr key={p.id_pembayaran || idx}>
                        <td className="text-center">{idx + 1}</td>
                        <td>{p.tanggal_bayar ? formatTanggalIndo(p.tanggal_bayar) : '-'}</td>
                        <td>{p.metode_pembayaran === 'tunai' ? 'Tunai' : (p.metode_pembayaran || 'Transfer')}</td>
                        <td>
                          {p.nomor_referensi || ''}
                          {p.nomor_referensi && p.catatan ? ' · ' : ''}
                          {p.catatan || (!p.nomor_referensi ? '-' : '')}
                        </td>
                        <td className="text-right font-bold">{formatRupiah(Number(p.nominal_bayar || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              <TandaTanganCetak
                namaKaryawan={slipObj.nama_karyawan || namaKaryawan}
                jabatanKaryawan={slipObj.jabatan || jabatanKaryawan}
                type="2-col"
              />
            </div>

            <div className="no-print space-y-5 text-xs sm:text-sm">
              {/* Header Proyek & Status */}
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50/80 p-4">
                <div>
                  <div className="font-bold text-slate-900 text-base">
                    {slipObj.nama_pekerjaan || paymentSlipRow.nama_pekerjaan || 'Operasional Lapangan'}
                  </div>
                  <div className="text-xs text-slate-500 mt-0.5">
                    Periode: <strong>{formatPeriodeIndo(slipObj.periode || paymentSlipRow.periode)}</strong>
                    {slipObj.jabatan ? ` · Jabatan: ${slipObj.jabatan}` : ''}
                  </div>
                </div>
                <span className={`inline-flex items-center gap-1 rounded-full px-3 py-1 text-xs font-bold ${
                  statusBayar === 'sudah'
                    ? 'bg-emerald-100 text-emerald-800'
                    : statusBayar === 'sebagian'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-slate-100 text-slate-700'
                }`}>
                  {statusBayar === 'sudah'
                    ? '✓ Lunas Dibayarkan'
                    : statusBayar === 'sebagian'
                      ? '◑ Dibayar Sebagian'
                      : '○ Belum Dibayar'}
                </span>
              </div>

              {/* Ringkasan Gaji Bersih, Sudah Dibayar, Sisa */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] text-slate-500 block">Upah &amp; Reimburse</span>
                  <strong className="text-sm text-slate-900">{formatRupiah(upahKerja + reimburse)}</strong>
                  <span className="block text-[10px] text-slate-400 mt-0.5">
                    Upah {formatRupiah(upahKerja)} + Reimb. {formatRupiah(reimburse)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 bg-white p-3">
                  <span className="text-[11px] text-slate-500 block">Total Gaji Bersih</span>
                  <strong className="text-sm text-slate-900">{formatRupiah(gajiBersih)}</strong>
                  {(rowBonus > 0 || rowPotongan > 0) && (
                    <span className="block text-[10px] text-slate-400 mt-0.5">
                      {rowBonus > 0 ? `+${formatRupiah(rowBonus)} ` : ''}
                      {rowPotongan > 0 ? `-${formatRupiah(rowPotongan)}` : ''}
                    </span>
                  )}
                </div>
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3">
                  <span className="text-[11px] text-emerald-800 block">Sudah Dibayar</span>
                  <strong className="text-sm font-extrabold text-emerald-700">{formatRupiah(sudahDibayar)}</strong>
                </div>
                <div className={`rounded-xl border p-3 ${
                  sisaBayar > 0 ? 'border-red-200 bg-red-50/70' : 'border-emerald-200 bg-emerald-600 text-white'
                }`}>
                  <span className={`text-[11px] block ${sisaBayar > 0 ? 'text-red-700' : 'text-emerald-100'}`}>
                    Sisa Pembayaran
                  </span>
                  <strong className={`text-sm font-black ${sisaBayar > 0 ? 'text-red-700' : 'text-white'}`}>
                    {formatRupiah(sisaBayar)}
                  </strong>
                </div>
              </div>

              {/* Tabel Riwayat Transaksi Pembayaran */}
              <div className="overflow-hidden rounded-2xl border border-slate-200">
                <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5">
                  <h4 className="text-xs font-bold text-slate-800">
                    Riwayat Transaksi Pembayaran ({pembayaranList.length})
                  </h4>
                  <span className="text-[11px] font-semibold text-slate-500">
                    Total Masuk: {formatRupiah(sudahDibayar)}
                  </span>
                </div>
                {paymentSlipLoading ? (
                  <p className="p-6 text-center text-xs text-slate-500">Memuat rincian transaksi pembayaran...</p>
                ) : pembayaranList.length === 0 ? (
                  <p className="p-6 text-center text-xs text-slate-500">
                    Belum ada transaksi pembayaran yang dicatat oleh Admin untuk slip ini.
                  </p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-slate-200 bg-slate-50 text-[10px] uppercase text-slate-500">
                        <tr>
                          <th className="px-4 py-2">Tanggal Bayar</th>
                          <th className="px-4 py-2">Metode</th>
                          <th className="px-4 py-2">No. Referensi / Catatan</th>
                          <th className="px-4 py-2 text-right">Nominal Dibayar</th>
                          <th className="px-4 py-2 text-center">Bukti</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {pembayaranList.map((p, idx) => (
                          <tr key={p.id_pembayaran || idx}>
                            <td className="px-4 py-2.5 font-semibold text-slate-900 whitespace-nowrap">
                              {p.tanggal_bayar ? formatTanggalIndo(p.tanggal_bayar) : '-'}
                            </td>
                            <td className="px-4 py-2.5 whitespace-nowrap capitalize">
                              {p.metode_pembayaran === 'tunai' ? 'Tunai' : (p.metode_pembayaran || 'Transfer')}
                            </td>
                            <td className="px-4 py-2.5 text-slate-600">
                              {p.nomor_referensi ? <span className="font-mono text-[11px]">{p.nomor_referensi}</span> : null}
                              {p.nomor_referensi && p.catatan ? ' · ' : ''}
                              {p.catatan || (!p.nomor_referensi ? '-' : '')}
                            </td>
                            <td className="px-4 py-2.5 text-right font-bold text-emerald-700 whitespace-nowrap">
                              {formatRupiah(Number(p.nominal_bayar || 0))}
                            </td>
                            <td className="px-4 py-2.5 text-center">
                              {p.bukti_pembayaran ? (
                                <button
                                  type="button"
                                  onClick={() => setPreviewImage(getFileUrl(p.bukti_pembayaran))}
                                  className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                                >
                                  <Eye className="h-3 w-3" /> Lihat
                                </button>
                              ) : (
                                <span className="text-slate-300">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Footer Modal */}
              <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setPaymentSlipRow(null);
                    setPaymentSlipDetail(null);
                  }}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50 cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={handlePrintPaymentSlip}
                  disabled={paymentSlipLoading}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Cetak Slip PDF</span>
                </button>
              </div>
            </div>
          </Modal>
        );
      })()}

      {/* ========================================================
          5. MODAL PRATINJAU BUKTI TRANSFER / KUITANSI
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
