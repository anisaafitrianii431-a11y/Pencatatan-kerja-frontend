import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Wallet, 
  Calculator, 
  CheckCircle2, 
  Printer, 
  Calendar, 
  Check, 
  AlertCircle,
  Filter,
  Building2,
  Briefcase,
  Search,
  RotateCcw,
  Sliders,
  CreditCard,
  Banknote,
  Upload,
  Eye,
  FileText,
  Clock,
  Receipt,
  X,
  PlusCircle,
  MinusCircle,
  ChevronDown,
  ChevronUp,
  ExternalLink
} from 'lucide-react';
import { GajiService, PekerjaanService, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import { 
  angkaTerbilang, 
  formatPeriodeIndo, 
  generateNoDokumen 
} from '../../utils/printHelpers';

export default function GajiAdminPage({ currentUser }) {
  const navigate = useNavigate();
  const isAdmin = true;
  const [periode, setPeriode] = useState(new Date().toISOString().slice(0, 7)); // 'YYYY-MM'
  const [gajiList, setGajiList] = useState([]);
  const [proyekList, setProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter States
  const [selectedProyek, setSelectedProyek] = useState('semua');
  const [selectedJabatan, setSelectedJabatan] = useState('semua');
  const [searchKeyword, setSearchKeyword] = useState('');

  // 1. Modal Slip Gaji & Detail Breakdown
  const [selectedSlip, setSelectedSlip] = useState(null);
  const [slipDetail, setSlipDetail] = useState({ absensi: [], pengeluaran: [] });
  const [loadingDetail, setLoadingDetail] = useState(false);

  // 1b. Accordion Detail Jam Kerja Langsung pada Baris Tabel
  const [expandedRowId, setExpandedRowId] = useState(null);
  const [rowDetailsCache, setRowDetailsCache] = useState({});
  const [loadingRowDetail, setLoadingRowDetail] = useState({});

  // 2. Modal Penyesuaian (Bonus & Potongan Kasbon)
  const [penyesuaianModal, setPenyesuaianModal] = useState(null);
  const [bonusInput, setBonusInput] = useState(0);
  const [potonganInput, setPotonganInput] = useState(0);
  const [catatanPenyesuaianInput, setCatatanPenyesuaianInput] = useState('');
  const [savingPenyesuaian, setSavingPenyesuaian] = useState(false);

  // 3. Modal Konfirmasi Pembayaran (Metode & Bukti Transfer)
  const [bayarModal, setBayarModal] = useState(null);
  const [metodeBayar, setMetodeBayar] = useState('transfer');
  const [catatanBayar, setCatatanBayar] = useState('');
  const [fotoBukti, setFotoBukti] = useState('');
  const [fotoBuktiPreview, setFotoBuktiPreview] = useState('');
  const [paying, setPaying] = useState(false);

  // Modal Preview Foto / Struk Bukti
  const [previewImage, setPreviewImage] = useState(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [calculating, setCalculating] = useState(false);

  const loadData = async (targetPeriode) => {
    setLoading(true);
    try {
      const [dataGaji, dataProyek] = await Promise.all([
        GajiService.getByPeriode(targetPeriode || periode),
        PekerjaanService.getAll().catch(() => [])
      ]);
      setGajiList(dataGaji || []);
      setProyekList(dataProyek || []);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData(periode);
  }, [periode]);

  // Handler Hitung Otomatis Seluruh Karyawan
  const handleHitungOtomatis = async () => {
    setCalculating(true);
    setErrorMsg('');
    try {
      const res = await GajiService.hitungGaji(periode);
      setSuccessMsg(res.message);
      loadData(periode);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghitung gaji');
    } finally {
      setCalculating(false);
    }
  };

  // Handler Buka Modal Slip & Ambil Rincian Presensi / Reimbursement
  const handleOpenSlip = async (g) => {
    setSelectedSlip(g);
    setLoadingDetail(true);
    try {
      const res = await GajiService.getDetail({
        id_karyawan: g.id_karyawan,
        periode: g.periode,
        id_gaji: g.id_gaji
      });
      setSlipDetail(res || { absensi: [], pengeluaran: [] });
    } catch (err) {
      console.error(err);
      setSlipDetail({ absensi: [], pengeluaran: [] });
    } finally {
      setLoadingDetail(false);
    }
  };

  // Handler Buka / Tutup Accordion Detail Jam Kerja Langsung di Menu Gaji
  const toggleExpandRow = async (g) => {
    if (expandedRowId === g.id_gaji) {
      setExpandedRowId(null);
      return;
    }
    setExpandedRowId(g.id_gaji);

    if (!rowDetailsCache[g.id_gaji]) {
      setLoadingRowDetail(prev => ({ ...prev, [g.id_gaji]: true }));
      try {
        const res = await GajiService.getDetail({
          id_karyawan: g.id_karyawan,
          periode: g.periode,
          id_gaji: g.id_gaji
        });
        setRowDetailsCache(prev => ({
          ...prev,
          [g.id_gaji]: res || { absensi: [], pengeluaran: [] }
        }));
      } catch (err) {
        console.error('Gagal memuat detail jam kerja:', err);
      } finally {
        setLoadingRowDetail(prev => ({ ...prev, [g.id_gaji]: false }));
      }
    }
  };

  // Handler Menuju ke Halaman Baru Khusus Detail Jam Kerja
  const handleGoToDetailJam = (g) => {
    navigate(`/admin/detail-jam?id_karyawan=${g.id_karyawan}&periode=${g.periode}&id_gaji=${g.id_gaji}`);
  };

  // Handler Buka Modal Penyesuaian (Bonus & Kasbon)
  const handleOpenPenyesuaian = (g) => {
    setPenyesuaianModal(g);
    setBonusInput(Number(g.bonus || 0));
    setPotonganInput(Number(g.potongan || 0));
    setCatatanPenyesuaianInput(g.catatan_penyesuaian || '');
  };

  const handleSavePenyesuaian = async (e) => {
    e.preventDefault();
    if (!penyesuaianModal) return;
    setSavingPenyesuaian(true);
    try {
      await GajiService.updatePenyesuaian(
        penyesuaianModal.id_gaji,
        bonusInput,
        potonganInput,
        catatanPenyesuaianInput
      );
      setSuccessMsg(`Penyesuaian gaji untuk ${penyesuaianModal.nama_karyawan} berhasil disimpan!`);
      setPenyesuaianModal(null);
      loadData(periode);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setSavingPenyesuaian(false);
    }
  };

  // Handler Buka Modal Pembayaran Gaji
  const handleOpenBayar = (g) => {
    setBayarModal(g);
    setMetodeBayar(g.metode_bayar || 'transfer');
    setCatatanBayar(g.catatan_bayar || '');
    setFotoBukti('');
    setFotoBuktiPreview('');
  };

  const handleFotoBuktiChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        alert('Ukuran file maksimal 5MB');
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setFotoBukti(reader.result);
        setFotoBuktiPreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmitBayar = async (e) => {
    e.preventDefault();
    if (!bayarModal) return;
    setPaying(true);
    try {
      await GajiService.bayar(bayarModal.id_gaji, {
        metode_bayar: metodeBayar,
        catatan_bayar: catatanBayar,
        foto_bukti: fotoBukti
      });
      setSuccessMsg(`Gaji untuk ${bayarModal.nama_karyawan} berhasil dicatat LUNAS!`);
      setBayarModal(null);
      loadData(periode);
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message);
    } finally {
      setPaying(false);
    }
  };

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  // Daftar unik jabatan untuk dropdown filter
  const jabatanList = Array.from(new Set(gajiList.map(g => g.jabatan).filter(Boolean)));

  // Filter List Berdasarkan Proyek, Jabatan, dan Pencarian
  const filteredGajiList = gajiList.filter((g) => {
    const matchProyek =
      selectedProyek === 'semua' ||
      (g.nama_pekerjaan && g.nama_pekerjaan.toLowerCase().includes(selectedProyek.toLowerCase())) ||
      (g.id_pekerjaan_list && g.id_pekerjaan_list.split(',').includes(String(selectedProyek)));

    const matchJabatan =
      selectedJabatan === 'semua' || g.jabatan === selectedJabatan;

    const q = searchKeyword.toLowerCase().trim();
    const matchSearch =
      !q ||
      g.nama_karyawan.toLowerCase().includes(q) ||
      (g.jabatan && g.jabatan.toLowerCase().includes(q)) ||
      (g.nama_pekerjaan && g.nama_pekerjaan.toLowerCase().includes(q));

    return matchProyek && matchJabatan && matchSearch;
  });

  // Grand totals dinamis berdasarkan hasil filter
  const totalUpahKeseluruhan = filteredGajiList.reduce((sum, g) => sum + Number(g.total_upah || 0), 0);
  const totalGantiKeseluruhan = filteredGajiList.reduce((sum, g) => sum + Number(g.total_ganti || 0), 0);
  const totalBonusKeseluruhan = filteredGajiList.reduce((sum, g) => sum + Number(g.bonus || 0), 0);
  const totalPotonganKeseluruhan = filteredGajiList.reduce((sum, g) => sum + Number(g.potongan || 0), 0);
  const grandTotalBayar = filteredGajiList.reduce((sum, g) => sum + Number(g.total_dibayar || 0), 0);

  const isFiltered = selectedProyek !== 'semua' || selectedJabatan !== 'semua' || searchKeyword !== '';

  const resetFilter = () => {
    setSelectedProyek('semua');
    setSelectedJabatan('semua');
    setSearchKeyword('');
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Manajemen Penggajian</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Wallet className="w-6 h-6 text-[#b81d52]" />
            <span>Penggajian Karyawan & Slip Gaji</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Perhitungan otomatis upah jam kerja terverifikasi, reimbursement dana pribadi, bonus insentif, dan potongan kasbon.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              document.body.classList.remove('printing-modal');
              window.print();
            }}
            className="no-print px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 cursor-pointer"
            title="Cetak Laporan Rekapitulasi Gaji Bulanan Seluruh Karyawan (A4 PDF)"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Bulanan (PDF)</span>
          </button>

          <button
            onClick={handleHitungOtomatis}
            disabled={calculating}
            className="no-print px-4 py-2.5 rounded-xl text-white font-bold text-sm shadow-md transition flex items-center justify-center space-x-2 disabled:opacity-50 cursor-pointer"
            style={{ backgroundColor: '#b81d52' }}
          >
            <Calculator className="w-4 h-4" />
            <span>{calculating ? 'Menghitung...' : 'Hitung Gaji Periode Ini'}</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Periode Selector & Summary Cards */}
      <div className="no-print bg-white p-5 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">
            Pilih Periode Penggajian (Bulan & Tahun):
          </label>
          <div className="flex items-center space-x-2">
            <Calendar className="w-5 h-5 text-slate-400" />
            <input
              type="month"
              value={periode}
              onChange={(e) => setPeriode(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 font-bold text-slate-800 text-sm focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-center lg:border-l lg:border-slate-100 lg:pl-6 text-xs">
          <div>
            <div className="text-slate-400 font-medium">Total Upah Kerja</div>
            <div className="font-extrabold text-slate-800 text-sm mt-0.5">{formatRupiah(totalUpahKeseluruhan)}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Reimbursement</div>
            <div className="font-extrabold text-amber-600 text-sm mt-0.5">{formatRupiah(totalGantiKeseluruhan)}</div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Bonus / Kasbon</div>
            <div className="font-bold text-xs mt-0.5">
              <span className="text-emerald-600">+{formatRupiah(totalBonusKeseluruhan)}</span>
              <span className="text-slate-400 mx-1">/</span>
              <span className="text-rose-600">-{formatRupiah(totalPotonganKeseluruhan)}</span>
            </div>
          </div>
          <div>
            <div className="text-slate-400 font-medium">Total Yang Harus Dibayar</div>
            <div className="font-black text-[#b81d52] text-base mt-0.5">{formatRupiah(grandTotalBayar)}</div>
          </div>
        </div>
      </div>

      {/* Filter Toolbar: Proyek / Pekerjaan, Jabatan, & Pencarian */}
      <div className="no-print bg-white p-4 rounded-2xl border border-slate-200/80 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Filter 1: Proyek / Pekerjaan Lapangan */}
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[#b81d52]" />
            <span className="text-xs font-bold text-slate-700">Pekerjaan/Proyek:</span>
            <select
              value={selectedProyek}
              onChange={(e) => setSelectedProyek(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
            >
              <option value="semua">Semua Pekerjaan / Proyek</option>
              {proyekList.map((p) => (
                <option key={p.id_pekerjaan} value={p.nama_pekerjaan}>
                  {p.nama_pekerjaan}
                </option>
              ))}
            </select>
          </div>

          {/* Filter 2: Jabatan / Profesi */}
          <div className="flex items-center gap-2">
            <Briefcase className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-700">Jabatan:</span>
            <select
              value={selectedJabatan}
              onChange={(e) => setSelectedJabatan(e.target.value)}
              className="px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
            >
              <option value="semua">Semua Jabatan</option>
              {jabatanList.map((jbt) => (
                <option key={jbt} value={jbt}>
                  {jbt}
                </option>
              ))}
            </select>
          </div>

          {/* Tombol Reset Filter */}
          {isFiltered && (
            <button
              type="button"
              onClick={resetFilter}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
              title="Reset Semua Filter"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          )}
        </div>

        {/* Pencarian Nama Pekerja */}
        <div className="relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
          <input
            type="text"
            placeholder="Cari nama pekerja / proyek..."
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
            className="pl-9 pr-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52] w-full lg:w-60"
          />
        </div>
      </div>

      {/* KOP SURAT PRINT ONLY (KETIKA CETAK REKAPITULASI BULANAN) */}
      <div className="print-only">
        <PrintHeader 
          title="LAPORAN REKAPITULASI PENGGAJIAN BULANAN SELURUH KARYAWAN"
          subtitle="Akumulasi Jam Kerja Efektif, Beban Upah Pokok, Penggantian Biaya Operasional & Realisasi Pembayaran"
          noDokumen={generateNoDokumen('REKAP', periode, 'ALL')}
          periode={periode}
        />
      </div>

      {/* Table Data Gaji */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden print-avoid-break">
        <div className="no-print px-6 py-4 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Rekapitulasi Gaji Periode {periode}</h3>
            <p className="text-xs text-slate-500">
              Rumus: (Jam × Tarif) + Reimbursement + Bonus - Potongan Kasbon = Total Dibayar
            </p>
          </div>
          <div className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
            {filteredGajiList.length} Pekerja {isFiltered && `(dari total ${gajiList.length})`}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Pekerja</th>
                <th className="px-6 py-4 text-center">Total Jam</th>
                <th className="px-6 py-4 text-right">Tarif / Jam</th>
                <th className="px-6 py-4 text-right">Upah Pokok</th>
                <th className="px-6 py-4 text-right">Reimbursement</th>
                <th className="px-6 py-4 text-right">Bonus / Kasbon</th>
                <th className="px-6 py-4 text-right">Total Dibayar</th>
                <th className="px-6 py-4 text-center">Status Bayar</th>
                <th className="px-6 py-4 text-right no-print">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-6 py-8 text-center text-slate-400">Memuat data gaji...</td>
                </tr>
              ) : filteredGajiList.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-6 py-12 text-center text-slate-400">
                    <div>
                      {isFiltered 
                        ? 'Tidak ada pekerja yang sesuai dengan filter yang dipilih.'
                        : `Belum ada data hitungan gaji untuk periode ${periode}.`}
                    </div>
                    {isFiltered ? (
                      <button
                        onClick={resetFilter}
                        className="mt-3 px-4 py-2 rounded-xl bg-pink-50 text-[#b81d52] font-bold text-xs hover:bg-pink-100 transition inline-flex items-center space-x-1 cursor-pointer"
                      >
                        <RotateCcw className="w-3.5 h-3.5" />
                        <span>Tampilkan Semua Pekerja</span>
                      </button>
                    ) : (
                      <button
                        onClick={handleHitungOtomatis}
                        className="mt-3 px-4 py-2 rounded-xl text-white font-bold text-xs transition inline-flex items-center space-x-1 cursor-pointer"
                        style={{ backgroundColor: '#b81d52' }}
                      >
                        <Calculator className="w-4 h-4" />
                        <span>Hitung Gaji Otomatis Sekarang</span>
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                filteredGajiList.map((g) => (
                  <React.Fragment key={g.id_gaji}>
                    <tr className={`transition ${expandedRowId === g.id_gaji ? 'bg-pink-50/40 border-l-4 border-l-[#b81d52]' : 'hover:bg-slate-50/70'}`}>
                      <td className="px-6 py-4">
                        <div className="font-bold text-slate-900">{g.nama_karyawan}</div>
                        <div className="text-xs text-slate-400">{g.jabatan || 'Pekerja'}</div>
                        <div className="mt-1">
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-[#b81d52] bg-pink-50 border border-pink-200/80 px-2 py-0.5 rounded-md">
                            <Building2 className="w-3 h-3 text-[#b81d52] shrink-0" />
                            <span className="truncate max-w-[200px]">{g.nama_pekerjaan || 'Operasional Lapangan'}</span>
                          </span>
                        </div>
                      </td>

                      <td className="px-6 py-4 text-center">
                        <button
                          type="button"
                          onClick={() => handleGoToDetailJam(g)}
                          className="inline-flex items-center gap-1 font-bold text-[#b81d52] hover:text-[#9a1844] bg-pink-50 hover:bg-pink-100 border border-pink-200/80 px-2.5 py-1 rounded-lg text-xs transition cursor-pointer shadow-2xs"
                          title="Buka Halaman Baru Detail Sesi Jam Kerja"
                        >
                          <span>{g.total_jam} Jam</span>
                          <ExternalLink className="w-3 h-3 text-[#b81d52]" />
                        </button>
                      </td>

                      <td className="px-6 py-4 text-right text-xs text-slate-600">
                        {formatRupiah(g.tarif)}
                      </td>

                      <td className="px-6 py-4 text-right font-bold text-slate-900">
                        {formatRupiah(g.total_upah)}
                      </td>

                      <td className="px-6 py-4 text-right text-amber-700 font-semibold text-xs">
                        {formatRupiah(g.total_ganti)}
                      </td>

                      <td className="px-6 py-4 text-right text-xs">
                        {Number(g.bonus || 0) > 0 && (
                          <div className="text-emerald-600 font-semibold">
                            +{formatRupiah(g.bonus)}
                          </div>
                        )}
                        {Number(g.potongan || 0) > 0 && (
                          <div className="text-rose-600 font-semibold">
                            -{formatRupiah(g.potongan)}
                          </div>
                        )}
                        {Number(g.bonus || 0) === 0 && Number(g.potongan || 0) === 0 && (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>

                      <td className="px-6 py-4 text-right font-black text-[#b81d52] text-sm">
                        {formatRupiah(g.total_dibayar)}
                      </td>

                      <td className="px-6 py-4 text-center">
                        <div>
                          <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                            g.status_bayar === 'sudah'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {g.status_bayar === 'sudah' ? 'Sudah Dibayar' : 'Belum Bayar'}
                          </span>
                          {g.status_bayar === 'sudah' && (
                            <div className="text-[10px] text-slate-400 mt-1 capitalize">
                              {g.metode_bayar === 'tunai' ? '💵 Tunai' : '🏦 Transfer'}
                            </div>
                          )}
                        </div>
                      </td>

                      <td className="px-6 py-4 text-right no-print">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Tombol Menuju ke Halaman Baru Detail Jam Kerja */}
                          <button
                            type="button"
                            onClick={() => handleGoToDetailJam(g)}
                            className="px-2.5 py-1.5 rounded-lg text-xs font-semibold flex items-center space-x-1.5 transition cursor-pointer bg-pink-50 hover:bg-pink-100 text-[#b81d52] border border-pink-200"
                            title="Buka Halaman Baru Detail Jam Kerja & Reimbursement"
                          >
                            <Clock className="w-3.5 h-3.5" />
                            <span>Detail Jam</span>
                            <ExternalLink className="w-3 h-3 text-[#b81d52]" />
                          </button>

                          {/* Tombol Lihat Slip Gaji & Breakdown */}
                          <button
                            type="button"
                            onClick={() => handleOpenSlip(g)}
                            className="px-2.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center space-x-1 transition cursor-pointer"
                            title="Lihat & Cetak Slip Gaji Resmi"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>Slip</span>
                          </button>

                          {/* Tombol Atur Bonus & Kasbon (hanya bila belum bayar) */}
                          {g.status_bayar === 'belum' && (
                            <button
                              type="button"
                              onClick={() => handleOpenPenyesuaian(g)}
                              className="px-2.5 py-1.5 rounded-lg bg-pink-50 hover:bg-pink-100 text-[#b81d52] text-xs font-semibold flex items-center space-x-1 transition border border-pink-200 cursor-pointer"
                              title="Atur Bonus & Potongan Kasbon"
                            >
                              <Sliders className="w-3.5 h-3.5" />
                              <span>Penyesuaian</span>
                            </button>
                          )}

                          {/* Tombol Bayar (Buka Modal Metode Bayar & Upload Bukti) */}
                          {g.status_bayar === 'belum' && (
                            <button
                              type="button"
                              onClick={() => handleOpenBayar(g)}
                              className="px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1 cursor-pointer"
                              title="Catat Pembayaran Gaji"
                            >
                              <CreditCard className="w-3.5 h-3.5" />
                              <span>Bayar</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>

                    {/* ACCORDION BARIS DETAIL JAM KERJA & REIMBURSEMENT */}
                    {expandedRowId === g.id_gaji && (
                      <tr className="bg-slate-50/60 border-b-2 border-pink-200">
                        <td colSpan="9" className="px-6 py-5">
                          <div className="bg-white rounded-2xl border border-slate-200/90 p-5 shadow-xs space-y-6">
                            
                            {/* Header Mini Rincian */}
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2">
                              <div className="flex items-center space-x-2.5">
                                <div className="p-2 rounded-xl bg-pink-50 text-[#b81d52]">
                                  <Clock className="w-5 h-5" />
                                </div>
                                <div>
                                  <h4 className="font-bold text-slate-800 text-sm">
                                    Detail Jam Kerja & Reimbursement: <span className="text-[#b81d52]">{g.nama_karyawan}</span>
                                  </h4>
                                  <p className="text-xs text-slate-500">
                                    Periode {g.periode} • Tarif {formatRupiah(g.tarif)}/Jam • Total Jam Disetujui: <strong className="text-slate-800 font-bold">{g.total_jam} Jam</strong>
                                  </p>
                                </div>
                              </div>

                              <button
                                type="button"
                                onClick={() => setExpandedRowId(null)}
                                className="self-end sm:self-auto text-xs font-semibold text-slate-400 hover:text-slate-700 px-3 py-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer flex items-center space-x-1"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Tutup Rincian</span>
                              </button>
                            </div>

                            {loadingRowDetail[g.id_gaji] ? (
                              <div className="py-8 text-center text-xs text-slate-400">
                                Memuat rincian sesi kerja dan nota reimbursement...
                              </div>
                            ) : (
                              <div className="space-y-6">
                                
                                {/* 1. DAFTAR SESI KERJA SAH PERIODE INI */}
                                <div>
                                  <div className="font-bold text-[#b81d52] text-xs uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                                    <Clock className="w-4 h-4 text-[#b81d52]" />
                                    <span>
                                      DAFTAR SESI KERJA SAH PERIODE INI ({(rowDetailsCache[g.id_gaji]?.absensi || []).length} HARI):
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto border border-slate-200/90 rounded-xl shadow-xs">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-slate-50 border-b border-slate-200/90 text-slate-500 uppercase tracking-wider text-[10px]">
                                        <tr>
                                          <th className="px-4 py-3 font-bold">Tanggal</th>
                                          <th className="px-4 py-3 font-bold">Proyek Lapangan</th>
                                          <th className="px-4 py-3 font-bold text-center">Jam Kerja</th>
                                          <th className="px-4 py-3 font-bold text-center">Durasi</th>
                                          <th className="px-4 py-3 font-bold text-right">Gaji Yang Diterima</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {(rowDetailsCache[g.id_gaji]?.absensi || []).length === 0 ? (
                                          <tr>
                                            <td colSpan="5" className="py-6 text-center text-slate-400">
                                              Belum ada sesi kerja yang disetujui untuk periode ini.
                                            </td>
                                          </tr>
                                        ) : (
                                          rowDetailsCache[g.id_gaji].absensi.map((ab) => (
                                            <tr key={ab.id_absensi} className="hover:bg-slate-50/70 transition">
                                              <td className="px-4 py-3 font-medium text-slate-800">{ab.tanggal}</td>
                                              <td className="px-4 py-3 font-semibold text-slate-800">
                                                {ab.nama_pekerjaan || 'Operasional Lapangan'}
                                                {ab.catatan && (
                                                  <span className="text-[10px] text-slate-400 font-normal block mt-0.5">
                                                    {ab.catatan}
                                                  </span>
                                                )}
                                              </td>
                                              <td className="px-4 py-3 text-center text-slate-500 font-mono text-[11px]">
                                                {ab.jam_masuk?.slice(0, 5)} - {ab.jam_pulang?.slice(0, 5)}
                                              </td>
                                              <td className="px-4 py-3 text-center font-bold text-[#b81d52]">
                                                {ab.durasi_jam} Jam
                                              </td>
                                              <td className="px-4 py-3 text-right font-extrabold text-emerald-700 text-xs">
                                                {formatRupiah(ab.gaji_diterima || Number(ab.durasi_jam || 0) * Number(g.tarif || 50000))}
                                              </td>
                                            </tr>
                                          ))
                                        )}
                                      </tbody>
                                    </table>
                                  </div>
                                </div>

                                {/* 2. DAFTAR NOTA REIMBURSEMENT SAH PERIODE INI */}
                                <div>
                                  <div className="font-bold text-amber-700 text-xs uppercase tracking-wider mb-2.5 flex items-center space-x-1.5">
                                    <Receipt className="w-4 h-4 text-amber-600" />
                                    <span>
                                      DAFTAR NOTA REIMBURSEMENT SAH PERIODE INI ({(rowDetailsCache[g.id_gaji]?.pengeluaran || []).length} NOTA):
                                    </span>
                                  </div>

                                  <div className="overflow-x-auto border border-amber-200/80 rounded-xl shadow-xs">
                                    <table className="w-full text-left text-xs">
                                      <thead className="bg-amber-50/50 border-b border-amber-200/80 text-amber-900 uppercase tracking-wider text-[10px]">
                                        <tr>
                                          <th className="px-4 py-3 font-bold">Tanggal</th>
                                          <th className="px-4 py-3 font-bold">Proyek</th>
                                          <th className="px-4 py-3 font-bold">Keterangan</th>
                                          <th className="px-4 py-3 font-bold text-right">Nominal</th>
                                          <th className="px-4 py-3 font-bold text-center">Bukti Nota</th>
                                        </tr>
                                      </thead>
                                      <tbody className="divide-y divide-slate-100 text-slate-700">
                                        {(rowDetailsCache[g.id_gaji]?.pengeluaran || []).length === 0 ? (
                                          <tr>
                                            <td colSpan="5" className="py-5 text-center text-slate-400">
                                              Tidak ada nota reimbursement yang disetujui pada periode ini.
                                            </td>
                                          </tr>
                                        ) : (
                                          rowDetailsCache[g.id_gaji].pengeluaran.map((pe) => (
                                            <tr key={pe.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                                              <td className="px-4 py-3 font-medium text-slate-800">{pe.tanggal}</td>
                                              <td className="px-4 py-3 font-semibold text-slate-800">
                                                {pe.nama_pekerjaan || 'Operasional Lapangan'}
                                              </td>
                                              <td className="px-4 py-3 text-slate-600">{pe.keterangan || '-'}</td>
                                              <td className="px-4 py-3 text-right font-bold text-amber-700">
                                                {formatRupiah(pe.nominal)}
                                              </td>
                                              <td className="px-4 py-3 text-center">
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
                                    </table>
                                  </div>
                                </div>

                              </div>
                            )}

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
            {filteredGajiList.length > 0 && (
              <tfoot>
                <tr className="bg-slate-100 font-bold text-xs">
                  <td className="px-6 py-3 font-extrabold uppercase text-slate-800">
                    GRAND TOTAL ({filteredGajiList.length} PEKERJA):
                  </td>
                  <td className="px-6 py-3 text-center font-black text-[#b81d52]">
                    {filteredGajiList.reduce((acc, curr) => acc + (Number(curr.total_jam) || 0), 0).toFixed(2)} Jam
                  </td>
                  <td className="px-6 py-3 text-right text-slate-400">-</td>
                  <td className="px-6 py-3 text-right font-black text-slate-900">
                    {formatRupiah(filteredGajiList.reduce((acc, curr) => acc + (Number(curr.total_upah) || 0), 0))}
                  </td>
                  <td className="px-6 py-3 text-right font-black text-amber-700">
                    +{formatRupiah(filteredGajiList.reduce((acc, curr) => acc + (Number(curr.total_ganti) || 0), 0))}
                  </td>
                  <td className="px-6 py-3 text-right font-bold text-slate-700">
                    {formatRupiah(filteredGajiList.reduce((acc, curr) => acc + (Number(curr.bonus || 0) - Number(curr.potongan || 0)), 0))}
                  </td>
                  <td className="px-6 py-3 text-right font-black text-[#b81d52] text-sm">
                    {formatRupiah(filteredGajiList.reduce((acc, curr) => acc + (Number(curr.total_dibayar) || 0), 0))}
                  </td>
                  <td className="px-6 py-3 text-center text-xs">
                    {filteredGajiList.filter(g => g.status_bayar === 'sudah').length}/{filteredGajiList.length} Lunas
                  </td>
                  <td className="no-print"></td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>

      {/* Pengesahan Rekapitulasi Penggajian Bulanan (Khusus Cetak Rekap) */}
      <div className="print-only">
        <PrintSignatures 
          namaKaryawan="Pimpinan PAM-TECHNO (CV. Putra Anugrah Mandiri)"
          jabatanKaryawan="Direktur Operasional & Keuangan"
          type="3-col"
        />
      </div>

      {/* ======================================================== */}
      {/* 1. MODAL DETAIL SLIP GAJI & BREAKDOWN PRESENSI/REIMBURSE */}
      {/* ======================================================== */}
      {selectedSlip && (
        <Modal
          isOpen={!!selectedSlip}
          onClose={() => setSelectedSlip(null)}
          title="Slip Gaji Karyawan & Rincian Hari Kerja"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-5 p-2" id="printable-slip">
            
            {/* Header Slip Kop Surat Resmi */}
            <PrintHeader 
              title="SLIP GAJI KARYAWAN & RINCIAN OPERASIONAL"
              subtitle="Bukti Sah Pembayaran Hak Upah Kerja & Penggantian Dana Operasional Lapangan"
              noDokumen={generateNoDokumen('SLIP', selectedSlip.periode, selectedSlip.id_karyawan)}
              periode={selectedSlip.periode}
            />

            {/* Identitas Karyawan Metadata Table */}
            <div className="border border-slate-300 rounded-xl overflow-hidden print-avoid-break">
              <table className="w-full text-xs">
                <tbody>
                  <tr>
                    <td className="bg-slate-100 font-bold w-1/4">Nama Pekerja</td>
                    <td className="font-extrabold text-slate-900 w-1/4">{selectedSlip.nama_karyawan}</td>
                    <td className="bg-slate-100 font-bold w-1/4">Periode Penggajian</td>
                    <td className="font-bold text-slate-900 w-1/4">{formatPeriodeIndo(selectedSlip.periode)}</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold">Jabatan Pekerja</td>
                    <td>{selectedSlip.jabatan || 'Pekerja Lapangan'}</td>
                    <td className="bg-slate-100 font-bold">Tarif Dasar / Jam</td>
                    <td className="font-bold text-slate-900">{formatRupiah(selectedSlip.tarif)} / Jam</td>
                  </tr>
                  <tr>
                    <td className="bg-slate-100 font-bold">Proyek Utama Lapangan</td>
                    <td>{selectedSlip.nama_pekerjaan || 'Operasional Lapangan'}</td>
                    <td className="bg-slate-100 font-bold">Status Pembayaran</td>
                    <td className="font-extrabold uppercase">
                      {selectedSlip.status_bayar === 'sudah' 
                        ? `✓ LUNAS (${selectedSlip.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer Bank'})` 
                        : '⏳ DALAM PROSES'}
                    </td>
                  </tr>
                  {selectedSlip.status_bayar === 'sudah' && (
                    <tr>
                      <td className="bg-slate-100 font-bold">Waktu Pembayaran</td>
                      <td>{selectedSlip.tanggal_bayar || '-'}</td>
                      <td className="bg-slate-100 font-bold">No. Ref / Catatan</td>
                      <td>{selectedSlip.catatan_bayar || 'Transfer Valid'}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Rincian Komponen Gaji Bersih */}
            <div className="border border-slate-300 rounded-xl overflow-hidden text-xs print-avoid-break">
              <div className="flex justify-between p-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-slate-700 font-medium">1. Upah Pokok Kerja ({selectedSlip.total_jam} Jam × {formatRupiah(selectedSlip.tarif)}):</span>
                <span className="font-bold text-slate-900">{formatRupiah(selectedSlip.total_upah)}</span>
              </div>

              <div className="flex justify-between p-2.5 border-b border-slate-200">
                <span className="text-slate-700 font-medium">2. Penggantian Uang Pribadi (Reimbursement Disetujui):</span>
                <span className="font-bold text-amber-700">+{formatRupiah(selectedSlip.total_ganti)}</span>
              </div>

              {Number(selectedSlip.bonus || 0) > 0 && (
                <div className="flex justify-between p-2.5 border-b border-slate-200 bg-emerald-50/50">
                  <div>
                    <span className="font-bold text-emerald-800">3. Bonus / Insentif Proyek:</span>
                    {selectedSlip.catatan_penyesuaian && (
                      <span className="text-[10px] text-slate-500 italic block">{selectedSlip.catatan_penyesuaian}</span>
                    )}
                  </div>
                  <span className="font-bold text-emerald-700">+{formatRupiah(selectedSlip.bonus)}</span>
                </div>
              )}

              {Number(selectedSlip.potongan || 0) > 0 && (
                <div className="flex justify-between p-2.5 border-b border-slate-200 bg-rose-50/50">
                  <div>
                    <span className="font-bold text-rose-800">4. Potongan Pinjaman / Kasbon:</span>
                    {selectedSlip.catatan_penyesuaian && (
                      <span className="text-[10px] text-slate-500 italic block">{selectedSlip.catatan_penyesuaian}</span>
                    )}
                  </div>
                  <span className="font-bold text-rose-700">-{formatRupiah(selectedSlip.potongan)}</span>
                </div>
              )}

              <div className="flex justify-between p-3.5 bg-pink-50 border-t-2 border-slate-900 font-bold text-sm">
                <div>
                  <span className="text-slate-900 uppercase font-black block">TOTAL DITERIMA (TAKE HOME PAY):</span>
                  <span className="text-[10px] text-slate-500 font-normal">
                    Upah Pokok + Reimburse {Number(selectedSlip.bonus || 0) > 0 ? '+ Bonus' : ''} {Number(selectedSlip.potongan || 0) > 0 ? '- Kasbon' : ''}
                  </span>
                </div>
                <span className="text-base font-black text-[#b81d52]">{formatRupiah(selectedSlip.total_dibayar)}</span>
              </div>

              {/* Terbilang Resmi */}
              <div className="p-2.5 bg-slate-50 border-t border-slate-200 text-xs">
                <span className="font-bold text-slate-700">Jumlah Terbilang: </span>
                <span className="italic font-bold text-slate-900 capitalize">
                  # {angkaTerbilang(selectedSlip.total_dibayar)} #
                </span>
              </div>
            </div>

            {/* TABEL BREAKDOWN 1: RINCIAN PRESENSI HARIAN */}
            <div className="pt-1 print-avoid-break">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                <Clock className="w-3.5 h-3.5 text-[#b81d52]" />
                <span>Rincian Jam Kerja Harian Sah ({slipDetail.absensi?.length || 0} Hari)</span>
              </div>

              {loadingDetail ? (
                <div className="text-center py-4 text-xs text-slate-400">Memuat rincian hari kerja...</div>
              ) : (slipDetail.absensi || []).length === 0 ? (
                <div className="text-center py-3 text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  Tidak ada catatan presensi disetujui pada periode ini.
                </div>
              ) : (
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-600 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-center w-8">No</th>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">Proyek Lapangan</th>
                        <th className="px-3 py-2 text-center">Jam Kerja</th>
                        <th className="px-3 py-2 text-center">Durasi</th>
                        <th className="px-3 py-2 text-right">Gaji Diterima</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slipDetail.absensi.map((ab, idx) => (
                        <tr key={ab.id_absensi} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{ab.tanggal}</td>
                          <td className="px-3 py-1.5 text-slate-700">{ab.nama_pekerjaan || 'Operasional'}</td>
                          <td className="px-3 py-1.5 text-center font-mono text-slate-500">
                            {ab.jam_masuk?.slice(0, 5)} - {ab.jam_pulang?.slice(0, 5)}
                          </td>
                          <td className="px-3 py-1.5 text-center font-bold text-[#b81d52]">{ab.durasi_jam} Jam</td>
                          <td className="px-3 py-1.5 text-right font-bold text-emerald-800">
                            {formatRupiah(ab.gaji_diterima || Number(ab.durasi_jam || 0) * Number(selectedSlip.tarif || 50000))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-slate-100 font-bold">
                        <td colSpan="4" className="px-3 py-2 text-right font-extrabold uppercase">Total Jam Kerja:</td>
                        <td className="px-3 py-2 text-center font-black text-[#b81d52]">{selectedSlip.total_jam} Jam</td>
                        <td className="px-3 py-2 text-right font-black text-emerald-800">{formatRupiah(selectedSlip.total_upah)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>

            {/* TABEL BREAKDOWN 2: RINCIAN REIMBURSEMENT PRIBADI */}
            {(slipDetail.pengeluaran || []).length > 0 && (
              <div className="pt-1 print-avoid-break">
                <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center space-x-1.5 mb-2">
                  <Receipt className="w-3.5 h-3.5 text-amber-600" />
                  <span>Rincian Nota Reimbursement ({slipDetail.pengeluaran.length} Nota)</span>
                </div>
                <div className="overflow-x-auto border border-amber-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-amber-50/70 text-amber-900 font-bold">
                      <tr>
                        <th className="px-3 py-2 text-center w-8">No</th>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">Proyek / Keterangan</th>
                        <th className="px-3 py-2 text-right">Nominal</th>
                        <th className="px-3 py-2 text-center no-print">Nota</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {slipDetail.pengeluaran.map((pe, idx) => (
                        <tr key={pe.id_pengeluaran} className="hover:bg-slate-50">
                          <td className="px-3 py-1.5 text-center font-bold text-slate-400">{idx + 1}</td>
                          <td className="px-3 py-1.5 font-medium">{pe.tanggal}</td>
                          <td className="px-3 py-1.5 text-slate-700">
                            <span className="font-semibold block">{pe.nama_pekerjaan}</span>
                            <span className="text-[10px] text-slate-400">{pe.keterangan || '-'}</span>
                          </td>
                          <td className="px-3 py-1.5 text-right font-bold text-amber-700">{formatRupiah(pe.nominal)}</td>
                          <td className="px-3 py-1.5 text-center no-print">
                            {pe.foto_kwitansi ? (
                              <button
                                type="button"
                                onClick={() => setPreviewImage(getFileUrl(pe.foto_kwitansi))}
                                className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 hover:bg-amber-200 cursor-pointer"
                              >
                                Lihat
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
                        <td colSpan="3" className="px-3 py-2 text-right font-extrabold uppercase">Total Reimbursement:</td>
                        <td className="px-3 py-2 text-right font-black text-amber-800">+{formatRupiah(selectedSlip.total_ganti)}</td>
                        <td className="no-print"></td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            )}

            {/* Bukti Pembayaran / Transfer Bila Sudah Lunas (Tampilan Layar Saja) */}
            {selectedSlip.status_bayar === 'sudah' && (
              <div className="no-print bg-emerald-50 border border-emerald-200 p-3.5 rounded-xl text-xs space-y-1.5">
                <div className="font-bold text-emerald-900 flex items-center justify-between">
                  <span>Bukti Pembayaran Gaji (Lunas)</span>
                  <span className="text-[10px] uppercase bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-black">
                    {selectedSlip.metode_bayar === 'tunai' ? 'Tunai' : 'Transfer'}
                  </span>
                </div>
                {selectedSlip.catatan_bayar && (
                  <div className="text-slate-600 text-[11px]">
                    <span className="font-medium text-slate-400">Catatan/Ref: </span>
                    {selectedSlip.catatan_bayar}
                  </div>
                )}
                {selectedSlip.bukti_bayar && (
                  <button
                    type="button"
                    onClick={() => setPreviewImage(getFileUrl(selectedSlip.bukti_bayar))}
                    className="inline-flex items-center space-x-1 text-xs font-bold text-emerald-800 hover:underline pt-1 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Lihat Foto Struk / Bukti Transfer</span>
                  </button>
                )}
              </div>
            )}

            {/* Pengesahan Tanda Tangan Resmi */}
            <PrintSignatures 
              namaKaryawan={selectedSlip.nama_karyawan}
              jabatanKaryawan={selectedSlip.jabatan || 'Pekerja Lapangan'}
              type="3-col"
            />

            {/* Tombol Cetak & Tutup Modal (Tidak Ikut Dicetak) */}
            <div className="no-print flex items-center justify-between pt-4 border-t border-slate-200">
              <div className="text-[10px] text-slate-400 italic">
                * Dokumen sah hasil generate otomatis sistem.
              </div>
              <div className="flex space-x-2">
                <button
                  type="button"
                  onClick={() => {
                    document.body.classList.add('printing-modal');
                    const cleanup = () => {
                      document.body.classList.remove('printing-modal');
                      window.removeEventListener('afterprint', cleanup);
                    };
                    window.addEventListener('afterprint', cleanup);
                    window.print();
                    setTimeout(cleanup, 2000);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition flex items-center space-x-1.5 cursor-pointer shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak Slip Gaji (PDF)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedSlip(null)}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-100 text-xs font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>

          </div>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 2. MODAL PENYESUAIAN: BONUS & POTONGAN KASBON             */}
      {/* ======================================================== */}
      {penyesuaianModal && (
        <Modal
          isOpen={!!penyesuaianModal}
          onClose={() => setPenyesuaianModal(null)}
          title={`Penyesuaian Gaji: ${penyesuaianModal.nama_karyawan}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSavePenyesuaian} className="space-y-4 p-1">
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Upah Pokok Kerja:</span>
                <span className="font-bold text-slate-800">{formatRupiah(penyesuaianModal.total_upah)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Reimbursement Disetujui:</span>
                <span className="font-bold text-amber-700">+{formatRupiah(penyesuaianModal.total_ganti)}</span>
              </div>
            </div>

            {/* Input Bonus / Insentif */}
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1 flex items-center gap-1">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                <span>Bonus / Insentif Tambahan (Rp):</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={bonusInput}
                onChange={(e) => setBonusInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                placeholder="Contoh: 150000"
              />
              <span className="text-[10px] text-slate-400">Bonus target proyek selesai, lembur hari libur, dll.</span>
            </div>

            {/* Input Potongan Kasbon */}
            <div>
              <label className="block text-xs font-bold text-rose-800 mb-1 flex items-center gap-1">
                <MinusCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Potongan Kasbon / Pinjaman (Rp):</span>
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={potonganInput}
                onChange={(e) => setPotonganInput(Number(e.target.value))}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm font-bold text-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500"
                placeholder="Contoh: 100000"
              />
              <span className="text-[10px] text-slate-400">Potongan uang muka/kasbon yang pernah dipinjam karyawan.</span>
            </div>

            {/* Catatan Keterangan Penyesuaian */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / Keterangan Penyesuaian:
              </label>
              <input
                type="text"
                value={catatanPenyesuaianInput}
                onChange={(e) => setCatatanPenyesuaianInput(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
                placeholder="Misal: Kasbon tgl 12 Nov Rp 100rb, Bonus target Rp 50rb"
              />
            </div>

            {/* Kalkulasi Baru Realtime */}
            <div className="bg-pink-50 p-3.5 rounded-xl border border-pink-200 flex items-center justify-between">
              <div>
                <span className="text-[11px] font-bold text-[#b81d52] uppercase block">Total Baru Dibayar:</span>
                <span className="text-[10px] text-slate-500">Upah + Reimburse + Bonus - Kasbon</span>
              </div>
              <span className="text-base font-black text-[#b81d52]">
                {formatRupiah(
                  Math.max(
                    0,
                    Number(penyesuaianModal.total_upah) +
                    Number(penyesuaianModal.total_ganti) +
                    Number(bonusInput || 0) -
                    Number(potonganInput || 0)
                  )
                )}
              </span>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setPenyesuaianModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingPenyesuaian}
                className="px-4 py-2 rounded-xl bg-[#b81d52] hover:bg-[#9a1844] text-white text-xs font-bold transition shadow disabled:opacity-50 cursor-pointer"
              >
                {savingPenyesuaian ? 'Menyimpan...' : 'Simpan Penyesuaian'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* 3. MODAL KONFIRMASI BAYAR: METODE & BUKTI TRANSFER        */}
      {/* ======================================================== */}
      {bayarModal && (
        <Modal
          isOpen={!!bayarModal}
          onClose={() => setBayarModal(null)}
          title={`Konfirmasi Pembayaran Gaji: ${bayarModal.nama_karyawan}`}
          maxWidth="max-w-md"
        >
          <form onSubmit={handleSubmitBayar} className="space-y-4 p-1">
            <div className="bg-pink-50 p-3.5 rounded-xl border border-pink-200 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold text-[#b81d52] uppercase tracking-wider block">
                  Total Yang Harus Dibayarkan:
                </span>
                <span className="text-xs text-slate-600 font-medium">
                  Periode {bayarModal.periode} • {bayarModal.nama_karyawan}
                </span>
              </div>
              <span className="text-lg font-black text-[#b81d52]">
                {formatRupiah(bayarModal.total_dibayar)}
              </span>
            </div>

            {/* Pilihan Metode Bayar */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Pilih Metode Pembayaran:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setMetodeBayar('transfer')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                    metodeBayar === 'transfer'
                      ? 'border-[#b81d52] bg-pink-50 text-[#b81d52]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Transfer Bank</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMetodeBayar('tunai')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center space-x-2 transition cursor-pointer ${
                    metodeBayar === 'tunai'
                      ? 'border-[#b81d52] bg-pink-50 text-[#b81d52]'
                      : 'border-slate-200 hover:bg-slate-50 text-slate-700'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  <span>Tunai (Cash)</span>
                </button>
              </div>
            </div>

            {/* Catatan / Nomor Referensi Transfer */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan / No. Referensi Transfer:
              </label>
              <input
                type="text"
                value={catatanBayar}
                onChange={(e) => setCatatanBayar(e.target.value)}
                placeholder={metodeBayar === 'transfer' ? 'Contoh: BCA Ref #8492039 an Budi' : 'Contoh: Diserahkan tunai di kasir kantor'}
                className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              />
            </div>

            {/* Upload Foto Bukti Transfer / Kwitansi */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                <span>Unggah Foto Bukti Transfer (Opsional):</span>
                {fotoBuktiPreview && (
                  <button
                    type="button"
                    onClick={() => { setFotoBukti(''); setFotoBuktiPreview(''); }}
                    className="text-[10px] text-rose-600 hover:underline cursor-pointer"
                  >
                    Hapus Foto
                  </button>
                )}
              </label>

              {fotoBuktiPreview ? (
                <div className="relative border border-slate-200 rounded-xl overflow-hidden bg-slate-50 flex items-center justify-center p-2">
                  <img
                    src={fotoBuktiPreview}
                    alt="Preview Bukti"
                    className="max-h-36 object-contain rounded-lg"
                  />
                </div>
              ) : (
                <label className="border-2 border-dashed border-slate-200 hover:border-[#b81d52] rounded-xl p-4 flex flex-col items-center justify-center cursor-pointer transition bg-slate-50/50 hover:bg-pink-50/20">
                  <Upload className="w-6 h-6 text-slate-400 mb-1" />
                  <span className="text-xs font-semibold text-slate-600">Klik untuk upload struk / bukti m-banking</span>
                  <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG atau WebP (Maks 5MB)</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleFotoBuktiChange}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                type="button"
                onClick={() => setBayarModal(null)}
                className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={paying}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow disabled:opacity-50 flex items-center space-x-1 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>{paying ? 'Memproses...' : 'Konfirmasi & Tandai Lunas'}</span>
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* ======================================================== */}
      {/* MODAL PREVIEW FOTO STRUK / BUKTI PEMBAYARAN               */}
      {/* ======================================================== */}
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
