import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Calculator, 
  CreditCard, 
  Receipt, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  Search, 
  RotateCcw, 
  Filter, 
  Printer, 
  Eye, 
  FileText, 
  Clock, 
  Upload, 
  Check, 
  X, 
  PlusCircle, 
  MinusCircle, 
  Banknote, 
  ArrowRight, 
  Building2, 
  Lock, 
  Unlock, 
  History, 
  User, 
  Layers, 
  ChevronRight,
  ExternalLink,
  Info
} from 'lucide-react';
import { GajiService, KaryawanService, formatRupiah, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import { 
  angkaTerbilang, 
  formatPeriodeIndo, 
  formatTanggalCetak,
  generateNoDokumen,
  COMPANY_INFO
} from '../../utils/printHelpers';

export default function GajiAdminPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // Navigation & Tabs
  // Tab 1: 'perhitungan' -> Data dan Perhitungan Gaji
  // Tab 2: 'pembayaran'  -> Pembayaran Gaji
  // Tab 3: 'riwayat'     -> Riwayat dan Slip Gaji
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return t && ['perhitungan', 'pembayaran', 'riwayat'].includes(t) ? t : 'perhitungan';
  });

  // Shared Periode Filter
  const [periode, setPeriode] = useState(() => {
    const p = searchParams.get('periode');
    return p && /^\d{4}-\d{2}$/.test(p) ? p : new Date().toISOString().slice(0, 7);
  });

  // Master Data
  const [karyawanMaster, setKaryawanMaster] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // -------------------------------------------------------------
  // TAB 1: DATA DAN PERHITUNGAN GAJI
  // -------------------------------------------------------------
  const [kalkulasiList, setKalkulasiList] = useState([]);
  const [searchKalkulasi, setSearchKalkulasi] = useState('');
  const [filterJenisUpah, setFilterJenisUpah] = useState('semua');
  const [filterPenetapan, setFilterPenetapan] = useState('semua');
  const [savingTetapkan, setSavingTetapkan] = useState(false);

  // Modal Rincian Presensi / Jam Kerja
  const [detailModal, setDetailModal] = useState(null);
  const [detailPresensi, setDetailPresensi] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // Modal Penyesuaian (Bonus & Potongan Kasbon)
  const [penyesuaianModal, setPenyesuaianModal] = useState(null);
  const [bonusInput, setBonusInput] = useState(0);
  const [potonganInput, setPotonganInput] = useState(0);
  const [catatanPenyesuaianInput, setCatatanPenyesuaianInput] = useState('');
  const [savingPenyesuaian, setSavingPenyesuaian] = useState(false);

  // -------------------------------------------------------------
  // TAB 2: PEMBAYARAN GAJI
  // -------------------------------------------------------------
  const [pembayaranList, setPembayaranList] = useState([]);
  const [searchPembayaran, setSearchPembayaran] = useState('');
  const [filterStatusBayar, setFilterStatusBayar] = useState('semua');

  // Modal Form Bayar
  const [bayarModal, setBayarModal] = useState(null);
  const [nominalBayarInput, setNominalBayarInput] = useState('');
  const [tanggalBayarInput, setTanggalBayarInput] = useState(() => new Date().toISOString().slice(0, 10));
  const [metodeBayarInput, setMetodeBayarInput] = useState('transfer');
  const [nomorRefInput, setNomorRefInput] = useState('');
  const [namaPenerimaInput, setNamaPenerimaInput] = useState('');
  const [catatanBayarInput, setCatatanBayarInput] = useState('');
  const [buktiBayarFile, setBuktiBayarFile] = useState(null);
  const [buktiBayarPreview, setBuktiBayarPreview] = useState('');
  const [savingBayar, setSavingBayar] = useState(false);

  // Modal Riwayat Transaksi Bayar
  const [riwayatBayarModal, setRiwayatBayarModal] = useState(null);
  const [transaksiBayarList, setTransaksiBayarList] = useState([]);
  const [loadingTransaksi, setLoadingTransaksi] = useState(false);

  // -------------------------------------------------------------
  // TAB 3: RIWAYAT DAN SLIP GAJI
  // -------------------------------------------------------------
  const [riwayatList, setRiwayatList] = useState([]);
  const [searchRiwayat, setSearchRiwayat] = useState('');
  const [filterRiwayatKaryawan, setFilterRiwayatKaryawan] = useState('semua');
  const [filterRiwayatPeriode, setFilterRiwayatPeriode] = useState('semua');
  const [filterRiwayatStatus, setFilterRiwayatStatus] = useState('semua');

  // Modal Slip Gaji
  const [slipModal, setSlipModal] = useState(null);
  const [slipData, setSlipData] = useState(null);
  const [loadingSlip, setLoadingSlip] = useState(false);

  // Modal Preview Foto Bukti Transfer
  const [previewImage, setPreviewImage] = useState(null);

  // Ref untuk Cetak
  const slipPrintRef = useRef(null);

  // -------------------------------------------------------------
  // FETCHERS
  // -------------------------------------------------------------
  const loadKaryawan = async () => {
    try {
      const data = await KaryawanService.getAll();
      setKaryawanMaster(data || []);
    } catch {
      // Ignore
    }
  };

  const loadKalkulasi = async (targetPeriode) => {
    try {
      const p = targetPeriode || periode;
      const data = await GajiService.getKalkulasi(p);
      setKalkulasiList(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data kalkulasi gaji');
    }
  };

  const loadPembayaran = async (targetPeriode) => {
    try {
      const p = targetPeriode !== undefined ? targetPeriode : periode;
      const data = await GajiService.getPembayaranList({ periode: p });
      setPembayaranList(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat daftar pembayaran');
    }
  };

  const loadRiwayat = async () => {
    try {
      const data = await GajiService.getRiwayat();
      setRiwayatList(data || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat riwayat penggajian');
    }
  };

  const refreshAllData = async (targetPeriode) => {
    setLoading(true);
    setErrorMsg('');
    try {
      await Promise.all([
        loadKaryawan(),
        loadKalkulasi(targetPeriode),
        loadPembayaran(targetPeriode),
        loadRiwayat()
      ]);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    refreshAllData(periode);
  }, [periode]);

  // Sinkronisasi parameter URL jika ada navigasi dari modul lain
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['perhitungan', 'pembayaran', 'riwayat'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const periodeParam = searchParams.get('periode');
    if (periodeParam && /^\d{4}-\d{2}$/.test(periodeParam)) {
      setPeriode(periodeParam);
    }
    const karyawanParam = searchParams.get('karyawan');
    if (karyawanParam) {
      setSearchKalkulasi(karyawanParam);
      setSearchPembayaran(karyawanParam);
      setFilterRiwayatKaryawan(karyawanParam);
    }
  }, [searchParams]);

  // Handle Tab Switch
  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('tab', tab);
      return next;
    }, { replace: true });
    setErrorMsg('');
    setSuccessMsg('');
    if (tab === 'perhitungan') {
      loadKalkulasi(periode);
    } else if (tab === 'pembayaran') {
      loadPembayaran(periode);
    } else if (tab === 'riwayat') {
      loadRiwayat();
    }
  };

  // -------------------------------------------------------------
  // TAB 1 ACTIONS: PERHITUNGAN & PENETAPAN
  // -------------------------------------------------------------
  const handleOpenDetailPresensi = async (row) => {
    setDetailModal(row);
    setLoadingDetail(true);
    try {
      const res = await GajiService.getDetail({
        id_karyawan: row.id_karyawan,
        periode: row.periode,
        id_gaji: row.id_gaji
      });
      setDetailPresensi(res?.absensi || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat rincian presensi');
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleOpenPenyesuaian = (row) => {
    setPenyesuaianModal(row);
    setBonusInput(row.bonus || 0);
    setPotonganInput(row.potongan || 0);
    setCatatanPenyesuaianInput(row.catatan_penyesuaian || '');
  };

  const handleSavePenyesuaian = async () => {
    if (!penyesuaianModal) return;
    setSavingPenyesuaian(true);
    setErrorMsg('');
    try {
      // Jika sudah ada record di tabel gaji (is_saved)
      if (penyesuaianModal.id_gaji) {
        await GajiService.updatePenyesuaian(
          penyesuaianModal.id_gaji,
          bonusInput,
          potonganInput,
          catatanPenyesuaianInput
        );
      } else {
        // Jika belum ada, otomatis tetapkan bersamaan dengan penyesuaiannya
        await GajiService.tetapkanGaji({
          periode,
          id_karyawan: penyesuaianModal.id_karyawan,
          bonus: bonusInput,
          potongan: potonganInput,
          catatan_penyesuaian: catatanPenyesuaianInput
        });
      }

      setSuccessMsg(`Penyesuaian gaji ${penyesuaianModal.nama_karyawan} berhasil disimpan!`);
      setPenyesuaianModal(null);
      await loadKalkulasi(periode);
      await loadPembayaran(periode);
      window.dispatchEvent(new CustomEvent('gaji_updated'));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyimpan penyesuaian gaji');
    } finally {
      setSavingPenyesuaian(false);
    }
  };

  const handleTetapkanSingle = async (row) => {
    setSavingTetapkan(true);
    setErrorMsg('');
    try {
      await GajiService.tetapkanGaji({
        periode: row.periode,
        id_karyawan: row.id_karyawan,
        bonus: row.bonus,
        potongan: row.potongan,
        catatan_penyesuaian: row.catatan_penyesuaian
      });
      setSuccessMsg(`Hasil perhitungan gaji ${row.nama_karyawan} periode ${row.periode} berhasil ditetapkan & dikunci sebagai snapshot!`);
      await loadKalkulasi(periode);
      await loadPembayaran(periode);
      await loadRiwayat();
      window.dispatchEvent(new CustomEvent('gaji_updated'));
      window.dispatchEvent(new CustomEvent('gaji_updated'));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menetapkan gaji karyawan');
    } finally {
      setSavingTetapkan(false);
    }
  };

  const handleTetapkanSemua = async () => {
    if (!window.confirm(`Tetapkan dan kunci seluruh hasil perhitungan gaji periode ${formatPeriodeIndo(periode)} untuk semua karyawan? Snapshot tarif dan jam kerja akan disimpan secara permanen.`)) {
      return;
    }
    setSavingTetapkan(true);
    setErrorMsg('');
    try {
      const res = await GajiService.tetapkanGaji({ periode });
      setSuccessMsg(res.message || `Seluruh gaji periode ${formatPeriodeIndo(periode)} berhasil ditetapkan!`);
      await loadKalkulasi(periode);
      await loadPembayaran(periode);
      await loadRiwayat();
      window.dispatchEvent(new CustomEvent('gaji_updated'));
      window.dispatchEvent(new CustomEvent('gaji_updated'));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menetapkan seluruh gaji');
    } finally {
      setSavingTetapkan(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 2 ACTIONS: PEMBAYARAN GAJI
  // -------------------------------------------------------------
  const handleOpenBayarModal = (row) => {
    setBayarModal(row);
    const sisa = Number(row.sisa_pembayaran ?? row.gaji_bersih ?? 0);
    setNominalBayarInput(sisa > 0 ? sisa : '');
    setTanggalBayarInput(new Date().toISOString().slice(0, 10));
    setMetodeBayarInput('transfer');
    setNomorRefInput('');
    setNamaPenerimaInput(row.nama_karyawan || '');
    setCatatanBayarInput('');
    setBuktiBayarFile(null);
    setBuktiBayarPreview('');
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBuktiBayarFile(file);

    const reader = new FileReader();
    reader.onload = () => {
      setBuktiBayarPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const handleSubmitBayar = async (e) => {
    e.preventDefault();
    if (!bayarModal) return;

    const nominal = Number(nominalBayarInput);
    if (!nominal || nominal <= 0) {
      setErrorMsg('Nominal pembayaran wajib diisi dan harus lebih dari Rp 0.');
      return;
    }

    const sisaTagihan = Number(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih ?? 0);
    if (nominal > (sisaTagihan + 0.01)) {
      setErrorMsg(`Nominal pembayaran (Rp ${nominal.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${sisaTagihan.toLocaleString('id-ID')}).`);
      return;
    }

    setSavingBayar(true);
    setErrorMsg('');

    try {
      const payload = {
        id_gaji: bayarModal.id_gaji,
        nominal_bayar: nominal,
        tanggal_bayar: tanggalBayarInput,
        metode_pembayaran: metodeBayarInput,
        nomor_referensi: nomorRefInput.trim(),
        nama_penerima: namaPenerimaInput.trim() || bayarModal.nama_karyawan,
        catatan: catatanBayarInput.trim(),
        bukti_pembayaran: buktiBayarPreview || '' // Base64 or empty
      };

      await GajiService.catatPembayaran(payload);
      setSuccessMsg(`Pembayaran sebesar Rp ${nominal.toLocaleString('id-ID')} untuk ${bayarModal.nama_karyawan} berhasil dicatat!`);
      setBayarModal(null);
      await loadPembayaran(periode);
      await loadKalkulasi(periode);
      await loadRiwayat();
      window.dispatchEvent(new CustomEvent('gaji_updated'));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses pembayaran gaji');
    } finally {
      setSavingBayar(false);
    }
  };

  const handleOpenRiwayatBayar = async (row) => {
    setRiwayatBayarModal(row);
    setLoadingTransaksi(true);
    try {
      const res = await GajiService.getPembayaranHistory(row.id_gaji);
      setTransaksiBayarList(res || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat riwayat pembayaran');
    } finally {
      setLoadingTransaksi(false);
    }
  };

  // -------------------------------------------------------------
  // TAB 3 ACTIONS: RIWAYAT & SLIP GAJI
  // -------------------------------------------------------------
  const handleOpenSlipModal = async (id_gaji) => {
    setLoadingSlip(true);
    setErrorMsg('');
    try {
      const res = await GajiService.getSlip(id_gaji);
      setSlipData(res);
      setSlipModal(res?.gaji || {});
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat rincian slip gaji');
    } finally {
      setLoadingSlip(false);
    }
  };

  const handlePrintSlip = () => {
    window.print();
  };

  // -------------------------------------------------------------
  // COMPUTED STATS & FILTERED DATA
  // -------------------------------------------------------------
  // Tab 1 Filters
  const filteredKalkulasi = useMemo(() => {
    return kalkulasiList.filter((item) => {
      const matchSearch = searchKalkulasi === '' || 
        item.nama_karyawan?.toLowerCase().includes(searchKalkulasi.toLowerCase()) ||
        item.kode_karyawan?.toLowerCase().includes(searchKalkulasi.toLowerCase()) ||
        item.jabatan?.toLowerCase().includes(searchKalkulasi.toLowerCase());

      const matchUpah = filterJenisUpah === 'semua' || item.jenis_upah === filterJenisUpah;
      const matchStatus = filterPenetapan === 'semua' || 
        (filterPenetapan === 'draft' && !item.sudah_ditetapkan) ||
        (filterPenetapan === 'ditetapkan' && item.sudah_ditetapkan);

      return matchSearch && matchUpah && matchStatus;
    });
  }, [kalkulasiList, searchKalkulasi, filterJenisUpah, filterPenetapan]);

  // Tab 1 Stats
  const statsKalkulasi = useMemo(() => {
    const totalKaryawan = kalkulasiList.length;
    const totalUpahDihitung = kalkulasiList.reduce((acc, cur) => acc + Number(cur.gaji_bersih || cur.total_upah || 0), 0);
    const countDraft = kalkulasiList.filter(k => !k.sudah_ditetapkan).length;
    const countDitetapkan = kalkulasiList.filter(k => k.sudah_ditetapkan).length;
    return { totalKaryawan, totalUpahDihitung, countDraft, countDitetapkan };
  }, [kalkulasiList]);

  // Tab 2 Filters
  const filteredPembayaran = useMemo(() => {
    return pembayaranList.filter((item) => {
      const matchSearch = searchPembayaran === '' || 
        item.nama_karyawan?.toLowerCase().includes(searchPembayaran.toLowerCase()) ||
        item.kode_karyawan?.toLowerCase().includes(searchPembayaran.toLowerCase()) ||
        item.jabatan?.toLowerCase().includes(searchPembayaran.toLowerCase());

      const matchStatus = filterStatusBayar === 'semua' || item.status_bayar === filterStatusBayar;
      return matchSearch && matchStatus;
    });
  }, [pembayaranList, searchPembayaran, filterStatusBayar]);

  // Tab 2 Stats
  const statsPembayaran = useMemo(() => {
    const totalGajiBersih = pembayaranList.reduce((acc, cur) => acc + Number(cur.gaji_bersih || cur.total_upah || 0), 0);
    const totalSudahDibayar = pembayaranList.reduce((acc, cur) => acc + Number(cur.total_dibayar || 0), 0);
    const totalSisaTagihan = pembayaranList.reduce((acc, cur) => acc + Number(cur.sisa_pembayaran || 0), 0);
    const countBelumLunas = pembayaranList.filter(p => p.status_bayar !== 'sudah').length;
    const countLunas = pembayaranList.filter(p => p.status_bayar === 'sudah').length;
    return { totalGajiBersih, totalSudahDibayar, totalSisaTagihan, countBelumLunas, countLunas };
  }, [pembayaranList]);

  // Tab 3 Filters
  const filteredRiwayat = useMemo(() => {
    return riwayatList.filter((item) => {
      const matchSearch = searchRiwayat === '' || 
        item.nama_karyawan?.toLowerCase().includes(searchRiwayat.toLowerCase()) ||
        item.kode_karyawan?.toLowerCase().includes(searchRiwayat.toLowerCase()) ||
        item.jabatan?.toLowerCase().includes(searchRiwayat.toLowerCase());

      const matchKaryawan = filterRiwayatKaryawan === 'semua' || String(item.id_karyawan) === String(filterRiwayatKaryawan);
      const matchPeriode = filterRiwayatPeriode === 'semua' || item.periode === filterRiwayatPeriode;
      const matchStatus = filterRiwayatStatus === 'semua' || item.status_bayar === filterRiwayatStatus;

      return matchSearch && matchKaryawan && matchPeriode && matchStatus;
    });
  }, [riwayatList, searchRiwayat, filterRiwayatKaryawan, filterRiwayatPeriode, filterRiwayatStatus]);

  // Helper Periode Lists for Filter
  const availablePeriodes = useMemo(() => {
    const setP = new Set(riwayatList.map(r => r.periode).filter(Boolean));
    return Array.from(setP).sort().reverse();
  }, [riwayatList]);

  // Helper Badge Colors
  const renderBadgeUpah = (jenis) => {
    if (jenis === 'per_jam') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          Per Jam
        </span>
      );
    }
    if (jenis === 'per_hari') {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
          Per Hari
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
        Per Bulan
      </span>
    );
  };

  const renderBadgeStatusBayar = (status) => {
    if (status === 'sudah') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sudah Dibayar
        </span>
      );
    }
    if (status === 'sebagian') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Dibayar Sebagian
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-300">
        <AlertCircle className="w-3.5 h-3.5 text-rose-600" /> Belum Dibayar
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ============================================================== */}
      {/* 1. HEADER HALAMAN & SELECTOR PERIODE                           */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
                <Wallet className="w-5 h-5" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                  Penggajian Karyawan
                </h1>
                <p className="text-xs text-slate-500 mt-0.5">
                  Sistem perhitungan upah presensi, pembayaran transaksi bertahap, dan pengelolaan slip gaji resmi.
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 self-end md:self-center">
            {/* Periode Month Selector */}
            <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-xs">
              <Calendar className="w-4 h-4 text-blue-600 mr-2 shrink-0" />
              <label htmlFor="periode-select" className="text-xs font-semibold text-slate-600 mr-2">Periode:</label>
              <input 
                id="periode-select"
                type="month" 
                value={periode}
                onChange={(e) => setPeriode(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-800 focus:outline-none cursor-pointer"
              />
            </div>

            {/* Tombol Segarkan Data */}
            <button
              onClick={() => {
                setRefreshing(true);
                refreshAllData(periode);
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition duration-150 disabled:opacity-50 shadow-xs cursor-pointer"
              title="Segarkan Seluruh Data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Segarkan</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB NAVIGASI HORISONTAL (3 MAIN MENU)                         */}
        {/* ============================================================ */}
        <div className="mt-5 border-b border-slate-200 flex space-x-1 sm:space-x-3 overflow-x-auto">
          <button
            onClick={() => handleTabChange('perhitungan')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'perhitungan'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Calculator className={`w-4 h-4 ${activeTab === 'perhitungan' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>1. Data dan Perhitungan Gaji</span>
            {statsKalkulasi.countDraft > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                {statsKalkulasi.countDraft} Draft
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('pembayaran')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'pembayaran'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <CreditCard className={`w-4 h-4 ${activeTab === 'pembayaran' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>2. Pembayaran Gaji</span>
            {statsPembayaran.countBelumLunas > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-rose-100 text-rose-800 rounded-full font-bold">
                {statsPembayaran.countBelumLunas} Belum Lunas
              </span>
            )}
          </button>

          <button
            onClick={() => handleTabChange('riwayat')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'riwayat'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'riwayat' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>3. Riwayat dan Slip Gaji</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg('')} className="text-rose-500 hover:text-rose-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl flex items-center justify-between text-xs font-medium shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMsg}</span>
          </div>
          <button onClick={() => setSuccessMsg('')} className="text-emerald-500 hover:text-emerald-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 1: DATA DAN PERHITUNGAN GAJI                                */}
      {/* ============================================================== */}
      {activeTab === 'perhitungan' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="bg-gradient-to-r from-blue-900 to-indigo-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-500/30 text-blue-200 border border-blue-400/30">
                  Otomatisasi Upah
                </span>
                <span className="text-xs text-blue-200 font-medium">
                  Periode: {formatPeriodeIndo(periode)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Kalkulasi Jam Kerja Disetujui & Penetapan Snapshot
              </h2>
              <p className="text-xs text-blue-200 max-w-2xl leading-relaxed">
                Jam kerja diambil secara eksklusif dari presensi valid yang telah disetujui Admin. Sesi presensi yang masih menunggu verifikasi atau ditolak tidak dihitung. Setelah diperiksa, tetapkan perhitungan untuk mengunci tarif dan nominal snapshot.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => loadKalkulasi(periode)}
                disabled={loading}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Hitung Ulang</span>
              </button>
              <button
                onClick={handleTetapkanSemua}
                disabled={savingTetapkan || loading}
                className="px-4 py-2.5 bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold rounded-xl shadow-md transition duration-150 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Tetapkan Seluruh Gaji Periode Ini</span>
              </button>
            </div>
          </div>

          {/* 4 Kartu Statistik Ringkasan Perhitungan (Interaktif & Bisa Diklik) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => {
                setFilterPenetapan('semua');
                setFilterJenisUpah('semua');
                setSearchKalkulasi('');
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterPenetapan === 'semua' && filterJenisUpah === 'semua' && !searchKalkulasi
                  ? 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Karyawan Aktif</span>
                <User className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {statsKalkulasi.totalKaryawan}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Seluruh tenaga kerja • Klik reset</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPenetapan('semua');
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterPenetapan === 'semua'
                  ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Upah Terhitung</span>
                <Wallet className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatRupiah(statsKalkulasi.totalUpahDihitung)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Akumulasi {formatPeriodeIndo(periode)}</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPenetapan((curr) => (curr === 'draft' ? 'semua' : 'draft'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterPenetapan === 'draft'
                  ? 'border-2 border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                  : 'bg-white border border-slate-200/80 hover:border-amber-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Status Draft / Pratinjau</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-amber-700">
                {statsKalkulasi.countDraft} Karyawan
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Menunggu konfirmasi • Klik filter</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterPenetapan((curr) => (curr === 'ditetapkan' ? 'semua' : 'ditetapkan'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterPenetapan === 'ditetapkan'
                  ? 'border-2 border-indigo-600 bg-indigo-50/50 ring-2 ring-indigo-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-indigo-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Gaji Ditetapkan (Snapshot)</span>
                <Lock className="w-4 h-4 text-indigo-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-indigo-700">
                {statsKalkulasi.countDitetapkan} Karyawan
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Terkunci & siap bayar • Klik filter</div>
            </button>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Cari nama, ID karyawan, atau jabatan..."
                value={searchKalkulasi}
                onChange={(e) => setSearchKalkulasi(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Skema:</span>
                <select 
                  value={filterJenisUpah}
                  onChange={(e) => setFilterJenisUpah(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Skema</option>
                  <option value="per_jam">Per Jam</option>
                  <option value="per_hari">Per Hari</option>
                  <option value="per_bulan">Per Bulan</option>
                </select>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <span className="font-semibold">Status:</span>
                <select 
                  value={filterPenetapan}
                  onChange={(e) => setFilterPenetapan(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Status</option>
                  <option value="draft">Draft (Belum Ditetapkan)</option>
                  <option value="ditetapkan">Ditetapkan (Snapshot)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Perhitungan Gaji */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Karyawan</th>
                    <th className="px-4 py-3.5">Jenis Upah</th>
                    <th className="px-4 py-3.5">Tarif Upah</th>
                    <th className="px-4 py-3.5">Presensi Disetujui</th>
                    <th className="px-4 py-3.5 text-right">Gaji Pokok</th>
                    <th className="px-4 py-3.5 text-right">Penyesuaian</th>
                    <th className="px-4 py-3.5 text-right">Gaji Bersih</th>
                    <th className="px-4 py-3.5 text-center">Status Penetapan</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Mengkalkulasi jam kerja & upah karyawan...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredKalkulasi.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-400">
                        Tidak ada data karyawan yang cocok dengan kriteria pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredKalkulasi.map((row) => {
                      const isDitetapkan = row.sudah_ditetapkan;
                      return (
                        <tr key={row.id_karyawan} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/karyawan?highlight=${row.id_karyawan}`)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                              title="Buka profil karyawan ini di Data Karyawan"
                            >
                              <span>{row.nama_karyawan}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">{row.kode_karyawan}</span>
                              <span>•</span>
                              <span>{row.jabatan}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            {renderBadgeUpah(row.jenis_upah)}
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {formatRupiah(row.tarif)}
                            <span className="text-[10px] text-slate-400 ml-1">
                              {row.jenis_upah === 'per_jam' ? '/jam' : row.jenis_upah === 'per_hari' ? '/hari' : '/bln'}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="font-semibold text-slate-800">
                              {row.jenis_upah === 'per_jam' ? `${row.total_jam} Jam` : `${row.total_hari} Hari Kerja`}
                            </div>
                            <div className="text-[10px] text-slate-400">
                              {row.total_sesi} sesi presensi valid
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-medium text-slate-700">
                            {formatRupiah(row.total_upah)}
                          </td>

                          <td className="px-4 py-3 text-right">
                            {row.bonus > 0 && (
                              <div className="text-[11px] text-emerald-600 font-semibold">
                                +{formatRupiah(row.bonus)}
                              </div>
                            )}
                            {row.potongan > 0 && (
                              <div className="text-[11px] text-rose-600 font-semibold">
                                -{formatRupiah(row.potongan)}
                              </div>
                            )}
                            {(!row.bonus && !row.potongan) && (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                            {formatRupiah(row.gaji_bersih)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {isDitetapkan ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                                <Lock className="w-3 h-3 text-indigo-600" /> Ditetapkan
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                                <Clock className="w-3 h-3 text-amber-600" /> Draft
                              </span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              {/* Tombol Periksa Rincian Jam Kerja */}
                              <button
                                onClick={() => handleOpenDetailPresensi(row)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-semibold text-[11px] transition duration-150 flex items-center gap-1 cursor-pointer"
                                title="Periksa Rincian Sesi Presensi"
                              >
                                <Eye className="w-3 h-3 text-slate-500" />
                                <span>Rincian</span>
                              </button>

                              {/* Tombol Penyesuaian (Bonus & Kasbon) */}
                              <button
                                onClick={() => handleOpenPenyesuaian(row)}
                                className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg font-semibold text-[11px] transition duration-150 flex items-center gap-1 cursor-pointer border border-blue-200/70"
                                title="Sesuaikan Bonus / Potongan"
                              >
                                <PlusCircle className="w-3 h-3 text-blue-600" />
                                <span>Sesuaikan</span>
                              </button>

                              {/* Tombol Tetapkan Hasil Perhitungan */}
                              <button
                                onClick={() => handleTetapkanSingle(row)}
                                disabled={savingTetapkan}
                                className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition duration-150 flex items-center gap-1 cursor-pointer ${
                                  isDitetapkan
                                    ? 'bg-slate-100 text-slate-600 hover:bg-slate-200 border border-slate-200'
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs'
                                }`}
                                title={isDitetapkan ? 'Perbarui Snapshot Penetapan' : 'Kunci & Tetapkan Snapshot Gaji'}
                              >
                                {isDitetapkan ? <Lock className="w-3 h-3" /> : <Check className="w-3 h-3" />}
                                <span>{isDitetapkan ? 'Kunci Ulang' : 'Tetapkan'}</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Pengesahan Rekapitulasi Penggajian Bulanan (Khusus Cetak Rekap) */}
      <div className="print-only">
        <PrintSignatures 
          namaKaryawan="Pimpinan PAM-TECHNO (CV. Putra Anugrah Mandiri)"
          jabatanKaryawan="Direktur Operasional & Keuangan"
          type="3-col"
        />
      </div>

      {/* ============================================================== */}
      {/* TAB 2: PEMBAYARAN GAJI                                         */}
      {/* ============================================================== */}
      {activeTab === 'pembayaran' && (
        <div className="space-y-6">
          {/* Info Banner Pembayaran */}
          <div className="bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 rounded-2xl p-4 sm:p-5 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                  Pembayaran Bertahap & Lunas
                </span>
                <span className="text-xs text-slate-300 font-medium">
                  Periode: {formatPeriodeIndo(periode)}
                </span>
              </div>
              <h2 className="text-base sm:text-lg font-bold">
                Pencatatan Pembayaran Gaji Karyawan
              </h2>
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                Hanya menampilkan gaji yang telah berstatus Ditetapkan oleh Admin. Pembayaran dapat dilakukan penuh atau sebagian (bertahap). Status gaji tidak akan berubah menjadi Sudah Dibayar sampai seluruh sisa pembayaran lunas dan transaksi dicatat.
              </p>
            </div>

            <div className="flex items-center gap-2.5 shrink-0">
              <button
                onClick={() => loadPembayaran(periode)}
                disabled={loading}
                className="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-xs font-bold rounded-xl transition duration-150 flex items-center gap-1.5 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Segarkan Pembayaran</span>
              </button>
            </div>
          </div>

          {/* 4 Kartu Ringkasan Pembayaran (Interaktif & Bisa Diklik) */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              type="button"
              onClick={() => {
                setFilterStatusBayar('semua');
                setSearchPembayaran('');
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatusBayar === 'semua' && !searchPembayaran
                  ? 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-slate-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Gaji Ditetapkan</span>
                <Building2 className="w-4 h-4 text-blue-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatRupiah(statsPembayaran.totalGajiBersih)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{pembayaranList.length} karyawan • Klik reset</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatusBayar((curr) => (curr === 'sudah' ? 'semua' : 'sudah'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatusBayar === 'sudah'
                  ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Sudah Dibayar</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-emerald-700">
                {formatRupiah(statsPembayaran.totalSudahDibayar)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{statsPembayaran.countLunas} lunas • Klik filter</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatusBayar((curr) => (curr === 'sebagian' ? 'semua' : 'sebagian'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatusBayar === 'sebagian'
                  ? 'border-2 border-rose-500 bg-rose-50/40 ring-2 ring-rose-500/20'
                  : 'bg-white border border-slate-200/80 hover:border-rose-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Sisa Pembayaran</span>
                <AlertCircle className="w-4 h-4 text-rose-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-rose-700">
                {formatRupiah(statsPembayaran.totalSisaTagihan)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Kewajiban upah • Klik filter</div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatusBayar((curr) => (curr === 'belum' ? 'semua' : 'belum'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatusBayar === 'belum'
                  ? 'border-2 border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20'
                  : 'bg-white border border-slate-200/80 hover:border-amber-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Karyawan Belum Lunas</span>
                <CreditCard className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-amber-700">
                {statsPembayaran.countBelumLunas} Orang
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">Belum dibayar • Klik filter</div>
            </button>
          </div>

          {/* Filter & Search Bar Pembayaran */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Cari karyawan siap bayar..."
                value={searchPembayaran}
                onChange={(e) => setSearchPembayaran(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex items-center gap-2.5">
              <div className="flex items-center gap-1.5 text-xs text-slate-600">
                <Filter className="w-3.5 h-3.5 text-slate-400" />
                <span className="font-semibold">Status Bayar:</span>
                <select 
                  value={filterStatusBayar}
                  onChange={(e) => setFilterStatusBayar(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="semua">Semua Status</option>
                  <option value="belum">Belum Dibayar</option>
                  <option value="sebagian">Dibayar Sebagian</option>
                  <option value="sudah">Sudah Dibayar</option>
                </select>
              </div>
            </div>
          </div>

          {/* Tabel Pembayaran Gaji */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Karyawan</th>
                    <th className="px-4 py-3.5">Periode</th>
                    <th className="px-4 py-3.5">Jenis & Tarif</th>
                    <th className="px-4 py-3.5 text-right">Total Gaji Bersih</th>
                    <th className="px-4 py-3.5 text-right">Sudah Dibayar</th>
                    <th className="px-4 py-3.5 text-right">Sisa Pembayaran</th>
                    <th className="px-4 py-3.5 text-center">Status Pembayaran</th>
                    <th className="px-4 py-3.5 text-center">Aksi Pembayaran</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Memuat daftar pembayaran gaji...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPembayaran.length === 0 ? (
                    <tr>
                      <td colSpan="8" className="text-center py-12 text-slate-400">
                        Belum ada data gaji yang ditetapkan untuk periode ini. Silakan tetapkan gaji di Tab 1 terlebih dahulu.
                      </td>
                    </tr>
                  ) : (
                    filteredPembayaran.map((row) => {
                      const sisa = Number(row.sisa_pembayaran ?? 0);
                      const isLunas = row.status_bayar === 'sudah' || sisa <= 0;

                      return (
                        <tr key={row.id_gaji} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/karyawan?highlight=${row.id_karyawan}`)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                              title="Buka profil karyawan ini di Data Karyawan"
                            >
                              <span>{row.nama_karyawan}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono font-semibold text-blue-600 bg-blue-50 px-1 py-0.2 rounded border border-blue-100">{row.kode_karyawan}</span>
                              <span>•</span>
                              <span>{row.jabatan}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-700">
                            {formatPeriodeIndo(row.periode)}
                          </td>

                          <td className="px-4 py-3">
                            <div>{renderBadgeUpah(row.jenis_upah)}</div>
                            <div className="text-[11px] text-slate-500 font-medium mt-1">
                              {formatRupiah(row.tarif)}
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                            {formatRupiah(row.gaji_bersih)}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {formatRupiah(row.total_dibayar)}
                            {Number(row.jumlah_transaksi_bayar || 0) > 0 && (
                              <div className="text-[10px] text-slate-400 font-normal">
                                {row.jumlah_transaksi_bayar}x transaksi
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-bold">
                            <span className={sisa > 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {formatRupiah(sisa)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {renderBadgeStatusBayar(row.status_bayar)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-2">
                              {/* Tombol Bayar Gaji */}
                              <button
                                onClick={() => handleOpenBayarModal(row)}
                                disabled={isLunas}
                                className={`px-3 py-1.5 rounded-xl font-bold text-xs transition duration-150 flex items-center gap-1.5 shadow-xs cursor-pointer ${
                                  isLunas
                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                    : 'bg-blue-600 hover:bg-blue-700 text-white'
                                }`}
                                title={isLunas ? 'Gaji sudah lunas' : 'Catat Pembayaran Gaji'}
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Bayar Gaji</span>
                              </button>

                              {/* Tombol Lihat Riwayat Transaksi */}
                              {Number(row.jumlah_transaksi_bayar || 0) > 0 && (
                                <button
                                  onClick={() => handleOpenRiwayatBayar(row)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150 cursor-pointer"
                                  title="Lihat Riwayat Transaksi Pembayaran"
                                >
                                  <History className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: RIWAYAT DAN SLIP GAJI                                   */}
      {/* ============================================================== */}
      {activeTab === 'riwayat' && (
        <div className="space-y-6">
          {/* Header Riwayat */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Riwayat Penggajian & Cetak Slip Gaji Resmi
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Arsip seluruh penggajian karyawan lintas periode. Klik pada baris atau tombol untuk memeriksa rincian slip dan mencetak dokumen resmi.
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                onClick={loadRiwayat}
                className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Segarkan Riwayat</span>
              </button>
            </div>
          </div>

          {/* Filter Bar Tab 3 */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text"
                placeholder="Cari karyawan..."
                value={searchRiwayat}
                onChange={(e) => setSearchRiwayat(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Filter Karyawan */}
            <div>
              <select
                value={filterRiwayatKaryawan}
                onChange={(e) => setFilterRiwayatKaryawan(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Karyawan</option>
                {karyawanMaster.map(k => (
                  <option key={k.id_karyawan} value={k.id_karyawan}>
                    {k.nama} ({k.kode_karyawan || `KRY-${k.id_karyawan}`})
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Periode */}
            <div>
              <select
                value={filterRiwayatPeriode}
                onChange={(e) => setFilterRiwayatPeriode(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Periode</option>
                {availablePeriodes.map(p => (
                  <option key={p} value={p}>
                    {formatPeriodeIndo(p)}
                  </option>
                ))}
              </select>
            </div>

            {/* Filter Status Bayar */}
            <div>
              <select
                value={filterRiwayatStatus}
                onChange={(e) => setFilterRiwayatStatus(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="semua">Semua Status Bayar</option>
                <option value="belum">Belum Dibayar</option>
                <option value="sebagian">Dibayar Sebagian</option>
                <option value="sudah">Sudah Dibayar</option>
              </select>
            </div>
          </div>

          {/* Tabel Riwayat Gaji */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">No. Dokumen & Periode</th>
                    <th className="px-4 py-3.5">Karyawan</th>
                    <th className="px-4 py-3.5">Skema Upah</th>
                    <th className="px-4 py-3.5">Total Jam / Hari</th>
                    <th className="px-4 py-3.5 text-right">Gaji Bersih</th>
                    <th className="px-4 py-3.5 text-right">Telah Dibayar</th>
                    <th className="px-4 py-3.5 text-right">Sisa Tagihan</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Memuat riwayat arsip penggajian...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredRiwayat.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="text-center py-12 text-slate-400">
                        Belum ada data riwayat penggajian yang tersimpan.
                      </td>
                    </tr>
                  ) : (
                    filteredRiwayat.map((row) => {
                      const docNo = generateNoDokumen('SLIP', row.periode, row.id_gaji);
                      const sisa = Number(row.sisa_pembayaran ?? 0);

                      return (
                        <tr key={row.id_gaji} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-mono font-bold text-slate-900 text-[11px]">
                              {docNo}
                            </div>
                            <div className="text-[11px] text-blue-600 font-semibold mt-0.5">
                              {formatPeriodeIndo(row.periode)}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/karyawan?highlight=${row.id_karyawan}`)}
                              className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                              title="Buka profil karyawan ini di Data Karyawan"
                            >
                              <span>{row.nama_karyawan}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">{row.kode_karyawan}</span>
                              <span>•</span>
                              <span>{row.jabatan}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <div>{renderBadgeUpah(row.jenis_upah)}</div>
                            <div className="text-[10px] text-slate-500 font-medium mt-0.5">
                              Tarif: {formatRupiah(row.tarif)}
                            </div>
                          </td>

                          <td className="px-4 py-3 font-semibold text-slate-800">
                            {row.jenis_upah === 'per_jam' ? `${row.total_jam} Jam` : `${row.total_hari} Hari`}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                            {formatRupiah(row.gaji_bersih)}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                            {formatRupiah(row.total_dibayar)}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold">
                            <span className={sisa > 0 ? 'text-rose-600' : 'text-slate-400'}>
                              {formatRupiah(sisa)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            {renderBadgeStatusBayar(row.status_bayar)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1.5">
                              <button
                                onClick={() => handleOpenSlipModal(row.id_gaji)}
                                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs transition duration-150 flex items-center gap-1 shadow-xs cursor-pointer"
                                title="Lihat & Cetak Slip Gaji"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                <span>Slip Gaji</span>
                              </button>

                              {Number(row.total_transaksi_pembayaran || 0) > 0 && (
                                <button
                                  onClick={() => handleOpenRiwayatBayar(row)}
                                  className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150 cursor-pointer"
                                  title="Lihat Riwayat Transaksi Pembayaran"
                                >
                                  <History className="w-3.5 h-3.5 text-slate-600" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* MODAL 1: RINCIAN PRESENSI / JAM KERJA DISETUJUI                 */}
      {/* ============================================================== */}
      {detailModal && (
        <Modal
          isOpen={!!detailModal}
          onClose={() => setDetailModal(null)}
          title={`Rincian Jam Kerja Presensi - ${detailModal.nama_karyawan}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between text-xs">
              <div>
                <span className="text-blue-900 font-bold block">{detailModal.nama_karyawan} ({detailModal.kode_karyawan})</span>
                <span className="text-blue-700">Periode: {formatPeriodeIndo(detailModal.periode)}</span>
              </div>
              <div className="text-right">
                <span className="text-blue-900 font-bold block">{renderBadgeUpah(detailModal.jenis_upah)}</span>
                <span className="text-blue-700 font-semibold">{formatRupiah(detailModal.tarif)} / {detailModal.jenis_upah === 'per_jam' ? 'jam' : detailModal.jenis_upah === 'per_hari' ? 'hari' : 'bulan'}</span>
              </div>
            </div>

            <div className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0" />
              <span>Hanya presensi yang berstatus <strong>Disetujui</strong> yang masuk dalam akumulasi durasi & upah.</span>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden max-h-80 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                  <tr>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">Pekerjaan</th>
                    <th className="px-3 py-2.5 text-center">Masuk - Pulang</th>
                    <th className="px-3 py-2.5 text-right">Durasi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingDetail ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-400">
                        Memuat data presensi...
                      </td>
                    </tr>
                  ) : detailPresensi.length === 0 ? (
                    <tr>
                      <td colSpan="4" className="text-center py-8 text-slate-400">
                        Tidak ada sesi presensi yang disetujui pada periode ini.
                      </td>
                    </tr>
                  ) : (
                    detailPresensi.map((s, idx) => (
                      <tr key={idx} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{s.tanggal}</td>
                        <td className="px-3 py-2 text-slate-700">{s.nama_pekerjaan || 'Operasional Lapangan'}</td>
                        <td className="px-3 py-2 text-center font-mono text-slate-600">
                          {s.jam_masuk?.slice(0, 5)} - {s.jam_pulang?.slice(0, 5)}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-blue-700">
                          {s.durasi_jam} Jam
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setDetailModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 2: PENYESUAIAN (BONUS & POTONGAN KASBON)                  */}
      {/* ============================================================== */}
      {penyesuaianModal && (
        <Modal
          isOpen={!!penyesuaianModal}
          onClose={() => setPenyesuaianModal(null)}
          title={`Penyesuaian Gaji - ${penyesuaianModal.nama_karyawan}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between font-bold text-slate-900">
                <span>Gaji Pokok Terhitung:</span>
                <span>{formatRupiah(penyesuaianModal.total_upah)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Skema & Periode:</span>
                <span>{renderBadgeUpah(penyesuaianModal.jenis_upah)} • {formatPeriodeIndo(periode)}</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Bonus / Tunjangan Tambahan (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={bonusInput}
                onChange={(e) => setBonusInput(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Insentif prestasi, lembur khusus, atau tunjangan transport.</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Potongan Kasbon / Denda (Rp)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={potonganInput}
                onChange={(e) => setPotonganInput(Number(e.target.value))}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">Pengurangan pinjaman kasbon atau potongan keterlambatan.</span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Catatan Penyesuaian
              </label>
              <textarea
                rows="2"
                value={catatanPenyesuaianInput}
                onChange={(e) => setCatatanPenyesuaianInput(e.target.value)}
                placeholder="Contoh: Bonus lembur proyek jaringan, cicilan kasbon ke-2"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Simulasi Gaji Bersih */}
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between font-bold">
              <span className="text-blue-900">Total Gaji Bersih Baru:</span>
              <span className="text-blue-700 text-sm">
                {formatRupiah(Math.max(0, Number(penyesuaianModal.total_upah || 0) + Number(bonusInput) - Number(potonganInput)))}
              </span>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setPenyesuaianModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSavePenyesuaian}
                disabled={savingPenyesuaian}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingPenyesuaian ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 3: CATAT PEMBAYARAN GAJI                                 */}
      {/* ============================================================== */}
      {bayarModal && (
        <Modal
          isOpen={!!bayarModal}
          onClose={() => setBayarModal(null)}
          title={`Catat Pembayaran Gaji - ${bayarModal.nama_karyawan}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSubmitBayar} className="space-y-4 text-xs">
            {/* Box Ringkasan Sisa Tagihan */}
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span>Total Gaji Bersih:</span>
                <span className="font-bold text-slate-900">{formatRupiah(bayarModal.gaji_bersih)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Telah Dibayar Sebelumnya:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(bayarModal.total_dibayar)}</span>
              </div>
              <div className="border-t border-blue-200/60 pt-1.5 flex justify-between items-center text-sm">
                <span className="font-bold text-blue-900">Sisa Tagihan Saat Ini:</span>
                <span className="font-extrabold text-rose-600">
                  {formatRupiah(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih)}
                </span>
              </div>
            </div>

            {/* Input Tanggal Bayar */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Tanggal Pembayaran <span className="text-rose-500">*</span>
              </label>
              <input 
                type="date"
                required
                value={tanggalBayarInput}
                onChange={(e) => setTanggalBayarInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Input Nominal Pembayaran (Mendukung Pembayaran Sebagian / Penuh) */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="font-bold text-slate-700">
                  Nominal Pembayaran (Rp) <span className="text-rose-500">*</span>
                </label>
                <button
                  type="button"
                  onClick={() => setNominalBayarInput(Number(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih ?? 0))}
                  className="text-blue-600 font-bold hover:underline text-[11px] cursor-pointer"
                >
                  Bayar Penuh (Lunas)
                </button>
              </div>
              <input 
                type="number"
                min="1000"
                max={Number(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih ?? 0)}
                step="1000"
                required
                value={nominalBayarInput}
                onChange={(e) => setNominalBayarInput(e.target.value)}
                placeholder="Masukkan nominal yang dibayarkan..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Anda dapat membayar sebagian atau melunasi seluruh sisa upah.
              </span>
            </div>

            {/* Metode Pembayaran */}
            <div>
              <label className="font-bold text-slate-700 block mb-1.5">
                Metode Pembayaran <span className="text-rose-500">*</span>
              </label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  metodeBayarInput === 'transfer' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 text-slate-700'
                }`}>
                  <input 
                    type="radio"
                    name="metode_bayar"
                    value="transfer"
                    checked={metodeBayarInput === 'transfer'}
                    onChange={() => setMetodeBayarInput('transfer')}
                    className="accent-blue-600"
                  />
                  <CreditCard className="w-4 h-4 text-blue-600" />
                  <span>Transfer Bank</span>
                </label>

                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer transition ${
                  metodeBayarInput === 'tunai' ? 'border-blue-600 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 text-slate-700'
                }`}>
                  <input 
                    type="radio"
                    name="metode_bayar"
                    value="tunai"
                    checked={metodeBayarInput === 'tunai'}
                    onChange={() => setMetodeBayarInput('tunai')}
                    className="accent-blue-600"
                  />
                  <Banknote className="w-4 h-4 text-emerald-600" />
                  <span>Tunai (Cash)</span>
                </label>
              </div>
            </div>

            {/* Nomor Referensi / Struk */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nomor Referensi Transaksi
              </label>
              <input 
                type="text"
                value={nomorRefInput}
                onChange={(e) => setNomorRefInput(e.target.value)}
                placeholder="Contoh: TRF-BCA-88912839 atau No. Kwitansi Tunai"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Nama Penerima */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nama Penerima <span className="text-rose-500">*</span>
              </label>
              <input 
                type="text"
                required
                value={namaPenerimaInput}
                onChange={(e) => setNamaPenerimaInput(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Catatan Pembayaran */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Catatan / Keterangan Pembayaran
              </label>
              <textarea 
                rows="2"
                value={catatanBayarInput}
                onChange={(e) => setCatatanBayarInput(e.target.value)}
                placeholder="Contoh: Pembayaran termin 1 via m-Banking BCA, sisa dibayarkan minggu depan"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            {/* Upload Bukti Pembayaran */}
            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Unggah Bukti Pembayaran (Struk / Resi Transfer)
              </label>
              <div className="flex items-center gap-3">
                <input 
                  type="file"
                  accept="image/png, image/jpeg, image/jpg, image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />
              </div>
              {buktiBayarPreview && (
                <div className="mt-2 relative w-24 h-24 rounded-lg overflow-hidden border border-slate-200">
                  <img src={buktiBayarPreview} alt="Preview Bukti" className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => {
                      setBuktiBayarFile(null);
                      setBuktiBayarPreview('');
                    }}
                    className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-0.5 hover:bg-black"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              )}
            </div>

            {/* Preview Status Pasca Bayar */}
            {Number(nominalBayarInput) > 0 && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-600">Sisa Tagihan Pasca Bayar:</span>
                  <span className="font-bold text-slate-900">
                    {formatRupiah(Math.max(0, Number(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih ?? 0) - Number(nominalBayarInput)))}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-600">Status Berikutnya:</span>
                  <span>
                    {(Number(bayarModal.sisa_pembayaran ?? bayarModal.gaji_bersih ?? 0) - Number(nominalBayarInput)) <= 0 ? (
                      <span className="text-emerald-700 font-bold">LUNAS (Sudah Dibayar)</span>
                    ) : (
                      <span className="text-amber-700 font-bold">DIBAYAR SEBAGIAN</span>
                    )}
                  </span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBayarModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingBayar}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {savingBayar ? 'Menyimpan...' : 'Konfirmasi & Catat Pembayaran'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 4: RIWAYAT TRANSAKSI PEMBAYARAN PER GAJI                 */}
      {/* ============================================================== */}
      {riwayatBayarModal && (
        <Modal
          isOpen={!!riwayatBayarModal}
          onClose={() => setRiwayatBayarModal(null)}
          title={`Riwayat Pembayaran - ${riwayatBayarModal.nama_karyawan}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-center justify-between">
              <div>
                <span className="font-bold text-blue-900 block">{riwayatBayarModal.nama_karyawan} ({riwayatBayarModal.kode_karyawan})</span>
                <span className="text-blue-700">Periode Gaji: {formatPeriodeIndo(riwayatBayarModal.periode)}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Total Gaji Bersih:</span>
                <span className="font-extrabold text-blue-900 text-sm">{formatRupiah(riwayatBayarModal.gaji_bersih)}</span>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold">
                  <tr>
                    <th className="px-3 py-2.5">Tanggal</th>
                    <th className="px-3 py-2.5">Metode & Ref</th>
                    <th className="px-3 py-2.5 text-right">Nominal Bayar</th>
                    <th className="px-3 py-2.5">Penerima & Catatan</th>
                    <th className="px-3 py-2.5 text-center">Bukti</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loadingTransaksi ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        Memuat riwayat transaksi...
                      </td>
                    </tr>
                  ) : transaksiBayarList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        Belum ada transaksi pembayaran yang tercatat untuk gaji ini.
                      </td>
                    </tr>
                  ) : (
                    transaksiBayarList.map((t) => (
                      <tr key={t.id_pembayaran} className="hover:bg-slate-50">
                        <td className="px-3 py-2 font-medium text-slate-900">{t.tanggal_bayar}</td>
                        <td className="px-3 py-2">
                          <span className="font-semibold text-slate-800 uppercase">{t.metode_pembayaran}</span>
                          {t.nomor_referensi && (
                            <div className="text-[10px] text-slate-400 font-mono">{t.nomor_referensi}</div>
                          )}
                        </td>
                        <td className="px-3 py-2 text-right font-bold text-emerald-700">
                          {formatRupiah(t.nominal_bayar)}
                        </td>
                        <td className="px-3 py-2">
                          <div className="font-medium text-slate-800">{t.nama_penerima}</div>
                          {t.catatan && <div className="text-[10px] text-slate-400 italic">{t.catatan}</div>}
                        </td>
                        <td className="px-3 py-2 text-center">
                          {t.bukti_pembayaran ? (
                            <button
                              onClick={() => setPreviewImage(getFileUrl(t.bukti_pembayaran))}
                              className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 font-semibold text-[10px] hover:bg-blue-100 cursor-pointer"
                            >
                              Lihat Foto
                            </button>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setRiwayatBayarModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 5: SLIP GAJI KARYAWAN RESMI (PRINT READY)                */}
      {/* ============================================================== */}
      {slipModal && (
        <Modal
          isOpen={!!slipModal}
          onClose={() => setSlipModal(null)}
          title={`Slip Gaji Resmi - ${slipModal.nama_karyawan}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            {/* Action Bar Modal */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 print:hidden">
              <div className="text-xs text-slate-500">
                Dokumen resmi penggajian CV. Putra Anugrah Mandiri.
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrintSlip}
                  className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Unduh PDF</span>
                </button>
                <button
                  onClick={() => setSlipModal(null)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

            {/* AREA CETAK SLIP GAJI */}
            <div ref={slipPrintRef} className="p-4 sm:p-6 bg-white border border-slate-300 rounded-xl shadow-xs print:border-0 print:shadow-none print:p-0">
              {/* Kop Surat Resmi */}
              <PrintHeader 
                title="SLIP GAJI KARYAWAN"
                subtitle="Bukti Pembayaran Upah & Jam Kerja CV. Putra Anugrah Mandiri"
                noDokumen={generateNoDokumen('SLIP', slipModal.periode, slipModal.id_gaji)}
                periode={slipModal.periode}
                tanggalCetak={formatTanggalCetak()}
              />

              {/* Data Identitas Karyawan */}
              <div className="border border-slate-300 rounded-xl overflow-hidden mb-4">
                <table className="w-full text-xs">
                  <tbody>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600 w-1/4">Nama Karyawan</td>
                      <td className="px-3 py-2 font-bold text-slate-900 w-1/4">{slipModal.nama_karyawan}</td>
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600 w-1/4">ID / Kode Karyawan</td>
                      <td className="px-3 py-2 font-mono font-bold text-blue-700 w-1/4">{slipModal.kode_karyawan}</td>
                    </tr>
                    <tr className="border-b border-slate-200">
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600">Jabatan</td>
                      <td className="px-3 py-2 text-slate-800">{slipModal.jabatan}</td>
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600">Skema Upah</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">
                        {slipModal.jenis_upah === 'per_jam' ? 'Upah Per Jam' : slipModal.jenis_upah === 'per_hari' ? 'Upah Per Hari' : 'Gaji Bulanan Tetap'}
                      </td>
                    </tr>
                    <tr>
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600">Periode Gaji</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{formatPeriodeIndo(slipModal.periode)}</td>
                      <td className="px-3 py-2 bg-slate-50 font-bold text-slate-600">Tarif Snapshot</td>
                      <td className="px-3 py-2 font-semibold text-slate-800">{formatRupiah(slipModal.tarif)}</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* Rincian Komponen Gaji: 2 Kolom (Penerimaan vs Potongan) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4 text-xs">
                {/* Kolom Penerimaan */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>KOMPONEN PENERIMAAN</span>
                    <span>JUMLAH</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1">
                    <div className="flex justify-between py-1">
                      <div>
                        <span className="font-semibold text-slate-800 block">Upah Pokok</span>
                        <span className="text-[10px] text-slate-400">
                          {slipModal.jenis_upah === 'per_jam' ? `${slipModal.total_jam} jam × ${formatRupiah(slipModal.tarif)}` : slipModal.jenis_upah === 'per_hari' ? `${slipModal.total_hari} hari × ${formatRupiah(slipModal.tarif)}` : 'Gaji Bulanan'}
                        </span>
                      </div>
                      <span className="font-bold text-slate-900">{formatRupiah(slipModal.total_upah)}</span>
                    </div>

                    {Number(slipModal.bonus || 0) > 0 && (
                      <div className="flex justify-between py-1">
                        <div>
                          <span className="font-semibold text-slate-800 block">Bonus / Tunjangan</span>
                          {slipModal.catatan_penyesuaian && (
                            <span className="text-[10px] text-slate-400">{slipModal.catatan_penyesuaian}</span>
                          )}
                        </div>
                        <span className="font-bold text-emerald-700">+{formatRupiah(slipModal.bonus)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Kolom Potongan */}
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <div className="bg-slate-100 px-3 py-2 font-bold text-slate-800 border-b border-slate-200 flex justify-between">
                    <span>KOMPONEN POTONGAN</span>
                    <span>JUMLAH</span>
                  </div>
                  <div className="divide-y divide-slate-100 p-2 space-y-1">
                    {Number(slipModal.potongan || 0) > 0 ? (
                      <div className="flex justify-between py-1">
                        <div>
                          <span className="font-semibold text-slate-800 block">Potongan Kasbon / Lainnya</span>
                          {slipModal.catatan_penyesuaian && (
                            <span className="text-[10px] text-slate-400">{slipModal.catatan_penyesuaian}</span>
                          )}
                        </div>
                        <span className="font-bold text-rose-600">-{formatRupiah(slipModal.potongan)}</span>
                      </div>
                    ) : (
                      <div className="py-4 text-center text-slate-400">
                        Tidak ada potongan gaji pada periode ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Total Take Home Pay & Terbilang */}
              <div className="p-4 bg-slate-50 border border-slate-300 rounded-xl space-y-2 mb-4">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wide">
                    TOTAL PENERIMAAN BERSIH (TAKE HOME PAY)
                  </span>
                  <span className="text-lg font-black text-blue-900">
                    {formatRupiah(slipModal.gaji_bersih)}
                  </span>
                </div>
                <div className="text-xs text-slate-600 italic border-t border-slate-200 pt-1.5">
                  Terbilang: <strong>{angkaTerbilang(slipModal.gaji_bersih)}</strong>
                </div>
              </div>

              {/* Status & Riwayat Transaksi Pembayaran */}
              <div className="border border-slate-200 rounded-xl p-3 mb-5 text-xs">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-slate-800">STATUS PEMBAYARAN KANTOR:</span>
                  <div>{renderBadgeStatusBayar(slipModal.status_bayar)}</div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-[11px] mb-2">
                  <div>
                    <span className="text-slate-500">Total Telah Dibayar:</span>{' '}
                    <strong className="text-emerald-700">{formatRupiah(slipModal.total_dibayar)}</strong>
                  </div>
                  <div>
                    <span className="text-slate-500">Sisa Pembayaran:</span>{' '}
                    <strong className={Number(slipModal.sisa_pembayaran || 0) > 0 ? 'text-rose-600' : 'text-slate-700'}>
                      {formatRupiah(slipModal.sisa_pembayaran)}
                    </strong>
                  </div>
                </div>

                {slipData?.pembayaran && slipData.pembayaran.length > 0 && (
                  <div className="border-t border-slate-200 pt-2">
                    <span className="text-[10px] font-bold text-slate-500 uppercase block mb-1">
                      Catatan Transaksi:
                    </span>
                    <ul className="space-y-1">
                      {slipData.pembayaran.map((pb, pidx) => (
                        <li key={pidx} className="flex justify-between text-[10px] text-slate-600">
                          <span>{pb.tanggal_bayar} • {pb.metode_pembayaran?.toUpperCase()} {pb.nomor_referensi ? `(${pb.nomor_referensi})` : ''} - Penerima: {pb.nama_penerima}</span>
                          <span className="font-bold text-slate-900">{formatRupiah(pb.nominal_bayar)}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* Tanda Tangan */}
              <PrintSignatures 
                leftTitle="Penerima Upah,"
                leftName={slipModal.nama_karyawan}
                leftRole={slipModal.jabatan || 'Karyawan'}
                rightTitle="Ditetapkan & Disetujui Oleh,"
                rightName={slipModal.ditetapkan_oleh || currentUser?.nama || 'Administrator'}
                rightRole="Admin Keuangan CV. Putra Anugrah Mandiri"
              />
            </div>
          </div>
        </Modal>
      )}

      {/* ============================================================== */}
      {/* MODAL 6: PREVIEW FOTO STRUK / BUKTI PEMBAYARAN                  */}
      {/* ============================================================== */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Bukti Pembayaran / Struk Transfer"
          maxWidth="max-w-lg"
        >
          <div className="space-y-3 text-center">
            <div className="max-h-[70vh] overflow-auto rounded-xl border border-slate-200 p-1 bg-slate-900">
              <img 
                src={previewImage} 
                alt="Bukti Transfer" 
                className="w-full h-auto object-contain mx-auto rounded"
              />
            </div>
            <div className="flex justify-end pt-2">
              <button
                onClick={() => setPreviewImage(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
