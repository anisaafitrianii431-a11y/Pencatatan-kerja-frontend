import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { 
  Receipt, 
  CheckCircle2, 
  XCircle, 
  AlertCircle, 
  Eye, 
  Check, 
  DollarSign, 
  CreditCard,
  Building,
  User,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  ZoomIn,
  Search,
  RotateCcw,
  Trash2,
  Plus,
  Printer,
  Download,
  Clock,
  ArrowUpRight,
  ArrowDownLeft,
  ChevronDown,
  X,
  Banknote,
  ShieldCheck,
  History,
  Info
} from 'lucide-react';
import { 
  PengeluaranService, 
  PekerjaanService, 
  PekerjaService, 
  getFileUrl, 
  formatRupiah 
} from '../../services/api';
import Modal from '../../components/Modal';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import CorporateFinancialReportDocument from '../../components/CorporateFinancialReportDocument';
import { 
  formatPeriodeIndo, 
  formatTanggalCetak, 
  generateNoDokumen,
  COMPANY_INFO 
} from '../../utils/printHelpers';

export default function PengeluaranAdminPage({ currentUser }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();

  // =========================================================================
  // 3 TAB UTAMA PENGELOLAAN (HORIZONTAL)
  // 1. Data Pengeluaran
  // 2. Pengelolaan Dana (Subtab: A. Dana Uang Kantor | B. Pengembalian & Reimbursement)
  // 3. Rekap & Laporan
  // =========================================================================
  const [activeTab, setActiveTab] = useState(() => {
    const t = searchParams.get('tab');
    return t && ['data_pengeluaran', 'pengelolaan_dana', 'rekap_laporan'].includes(t) ? t : 'data_pengeluaran';
  });

  // Subtab untuk Tab 2 (Pengelolaan Dana)
  // 'dana_kantor' -> Subtab A: Dana Uang Kantor
  // 'pengembalian_reimburse' -> Subtab B: Pengembalian Dana & Reimbursement
  const [activeSubTab, setActiveSubTab] = useState(() => {
    const st = searchParams.get('subtab');
    return st && ['dana_kantor', 'pengembalian_reimburse'].includes(st) ? st : 'dana_kantor';
  });

  // Sub-section di dalam Subtab B: 'pengembalian' vs 'reimbursement'
  const [subSectionB, setSubSectionB] = useState('reimbursement');

  // Master Data State
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [danaKantorList, setDanaKantorList] = useState([]);
  const [pengembalianList, setPengembalianList] = useState([]);
  const [reimbursementList, setReimbursementList] = useState([]);
  const [rekapUangKantor, setRekapUangKantor] = useState({ ringkasan_global: {}, rekap_per_pj: [] });
  const [summaryData, setSummaryData] = useState(null);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [karyawanList, setKaryawanList] = useState([]);
  const pekerjaList = karyawanList;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // -------------------------------------------------------------------------
  // Filters: Tab 1 (Data Pengeluaran)
  // -------------------------------------------------------------------------
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [filterMonth, setFilterMonth] = useState('');
  const [filterWorker, setFilterWorker] = useState(() => searchParams.get('karyawan') || '');
  const [filterJob, setFilterJob] = useState(() => searchParams.get('pekerjaan') || '');
  const [filterSource, setFilterSource] = useState(''); // 'kantor' | 'pribadi'
  const [filterStatus, setFilterStatus] = useState(() => searchParams.get('status') || ''); // 'menunggu' | 'disetujui' | 'ditolak'
  const [filterCategory, setFilterCategory] = useState('');

  // -------------------------------------------------------------------------
  // Filters: Tab 2 (Dana Kantor)
  // -------------------------------------------------------------------------
  const [filterJenisDanaTrans, setFilterJenisDanaTrans] = useState('semua');
  const [searchDanaKantor, setSearchDanaKantor] = useState('');

  // -------------------------------------------------------------------------
  // Filters: Tab 2B (Reimbursement)
  // -------------------------------------------------------------------------
  const [filterStatusReimburse, setFilterStatusReimburse] = useState('semua');
  const [searchReimburse, setSearchReimburse] = useState('');

  // -------------------------------------------------------------------------
  // Filters: Tab 3 (Rekap & Laporan)
  // -------------------------------------------------------------------------
  const [rekapFilterPj, setRekapFilterPj] = useState('');
  const [rekapFilterJob, setRekapFilterJob] = useState('');
  const [rekapFilterMonth, setRekapFilterMonth] = useState('');
  const [rekapFilterYear, setRekapFilterYear] = useState('');
  const [printStartDate, setPrintStartDate] = useState('');
  const [printEndDate, setPrintEndDate] = useState('');
  const [printIncludeTransactions, setPrintIncludeTransactions] = useState(true);
  const [showPrintPreviewModal, setShowPrintPreviewModal] = useState(false);

  // -------------------------------------------------------------------------
  // Modals State
  // -------------------------------------------------------------------------
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [selectedDanaDetail, setSelectedDanaDetail] = useState(null);
  const [selectedPengembalianDetail, setSelectedPengembalianDetail] = useState(null);
  const [selectedPjMutasi, setSelectedPjMutasi] = useState(null);
  const [previewImage, setPreviewImage] = useState(null);

  // Modal Penolakan Pengeluaran (Catatan Alasan)
  const [rejectModal, setRejectModal] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [savingReject, setSavingReject] = useState(false);

  // Modal Verifikasi Reimbursement (Setujui dengan Nominal Disetujui atau Tolak)
  const [verifyReimburseModal, setVerifyReimburseModal] = useState(null);
  const [approvedNominalInput, setApprovedNominalInput] = useState('');
  const [verifyReimburseNote, setVerifyReimburseNote] = useState('');
  const [savingVerifyReimburse, setSavingVerifyReimburse] = useState(false);

  // Modal Bayar Reimbursement
  const [bayarReimburseModal, setBayarReimburseModal] = useState(null);
  const [nominalBayarReimburse, setNominalBayarReimburse] = useState('');
  const [tanggalBayarReimburse, setTanggalBayarReimburse] = useState(() => new Date().toISOString().slice(0, 10));
  const [metodeBayarReimburse, setMetodeBayarReimburse] = useState('transfer');
  const [nomorRefReimburse, setNomorRefReimburse] = useState('');
  const [namaPenerimaReimburse, setNamaPenerimaReimburse] = useState('');
  const [catatanBayarReimburse, setCatatanBayarReimburse] = useState('');
  const [buktiBayarReimburseFile, setBuktiBayarReimburseFile] = useState(null);
  const [buktiBayarReimbursePreview, setBuktiBayarReimbursePreview] = useState('');
  const [savingBayarReimburse, setSavingBayarReimburse] = useState(false);

  // Modal Riwayat Transaksi Bayar Reimbursement
  const [riwayatReimburseModal, setRiwayatReimburseModal] = useState(null);
  const [transaksiReimburseList, setTransaksiReimburseList] = useState([]);
  const [loadingTransaksiReimburse, setLoadingTransaksiReimburse] = useState(false);

  // Modal Tambah Pengeluaran Baru
  const [showAddExpenseModal, setShowAddExpenseModal] = useState(false);
  const [formExpense, setFormExpense] = useState({
    id_pekerjaan: '',
    id_karyawan: '',
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: '',
    kategori: 'operasional',
    jenis_dana: 'kantor',
    id_dana: '',
    id_penanggung_jawab: '',
    keterangan: '',
    foto_kwitansi: null,
    foto_kwitansi_preview: '',
  });

  // Modal Tambah Dana Kantor (Pemasukan Kas vs Penyaluran PJ)
  const [showAddDanaModal, setShowAddDanaModal] = useState(false);
  const [formDana, setFormDana] = useState({
    jenis_transaksi: 'penyaluran_dana', // 'pemasukan_kas' | 'penyaluran_dana'
    tanggal: new Date().toISOString().slice(0, 10),
    sumber_dana: 'Kas Utama Perusahaan',
    pemberi_dana: 'Bendahara Kantor',
    penerima_dana: '',
    id_penanggung_jawab: '',
    id_pekerjaan: '',
    nominal: '',
    tujuan_penggunaan: '',
    keterangan: '',
    bukti_transaksi: null,
    bukti_transaksi_preview: '',
  });

  // Modal Catat Pengembalian Uang Kantor
  const [showAddPengembalianModal, setShowAddPengembalianModal] = useState(false);
  const [formPengembalian, setFormPengembalian] = useState({
    id_dana: '',
    id_karyawan: '',
    id_penanggung_jawab: '',
    tanggal: new Date().toISOString().slice(0, 10),
    nominal: '',
    penerima_pengembalian: 'Administrator',
    keterangan: '',
    bukti_pengembalian: null,
    bukti_pengembalian_preview: '',
  });

  // Print Ref
  const printLaporanRef = useRef(null);

  // -------------------------------------------------------------------------
  // DATA FETCHING
  // -------------------------------------------------------------------------
  const fetchData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const [
        summaryRes,
        pengeluaranRes,
        danaRes,
        pengembalianRes,
        reimburseRes,
        rekapRes,
        pekerjaanRes,
        karyawanRes
      ] = await Promise.all([
        PengeluaranService.getSummary().catch(() => null),
        PengeluaranService.getAll().catch(() => []),
        PengeluaranService.getDanaKantor().catch(() => []),
        PengeluaranService.getPengembalianDana().catch(() => []),
        PengeluaranService.getReimbursementList().catch(() => []),
        PengeluaranService.getRekapUangKantor().catch(() => ({ ringkasan_global: {}, rekap_per_pj: [] })),
        PekerjaanService.getAll().catch(() => []),
        PekerjaService.getAll().catch(() => [])
      ]);

      setSummaryData(summaryRes);
      setPengeluaranList(pengeluaranRes || []);
      setDanaKantorList(danaRes || []);
      setPengembalianList(pengembalianRes || []);
      setReimbursementList(reimburseRes || []);
      setRekapUangKantor(rekapRes || { ringkasan_global: {}, rekap_per_pj: [] });
      setPekerjaanList(pekerjaanRes || []);
      setKaryawanList(karyawanRes || []);
      window.dispatchEvent(new CustomEvent('pengeluaran_updated'));
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data pengeluaran & kwitansi');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Sinkronisasi parameter URL untuk cross-navigation antar modul Admin
  useEffect(() => {
    const tabParam = searchParams.get('tab');
    if (tabParam && ['data_pengeluaran', 'pengelolaan_dana', 'rekap_laporan'].includes(tabParam)) {
      setActiveTab(tabParam);
    }
    const jobParam = searchParams.get('pekerjaan') || searchParams.get('id_pekerjaan');
    if (jobParam) {
      setFilterJob(jobParam);
      setRekapFilterJob(jobParam);
    }
    const workerParam = searchParams.get('karyawan') || searchParams.get('id_karyawan');
    if (workerParam) {
      setFilterWorker(workerParam);
      setRekapFilterPj(workerParam);
    }
    const statusParam = searchParams.get('status');
    if (statusParam && ['menunggu', 'disetujui', 'ditolak'].includes(statusParam)) {
      setFilterStatus(statusParam);
    }
  }, [searchParams]);

  // -------------------------------------------------------------------------
  // TAB 1 ACTIONS (DATA PENGELUARAN)
  // -------------------------------------------------------------------------
  const handleApproveExpense = async (id_pengeluaran) => {
    try {
      await PengeluaranService.verifikasi(id_pengeluaran, 'disetujui');
      setSuccessMsg('Transaksi pengeluaran berhasil disetujui!');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menyetujui pengeluaran');
    }
  };

  const handleOpenRejectModal = (expense) => {
    setRejectModal(expense);
    setRejectReason('');
  };

  const handleConfirmReject = async () => {
    if (!rejectModal) return;
    if (!rejectReason.trim()) {
      setErrorMsg('Alasan penolakan wajib diisi.');
      return;
    }
    setSavingReject(true);
    setErrorMsg('');
    try {
      await PengeluaranService.verifikasi(rejectModal.id_pengeluaran, 'ditolak', rejectReason.trim());
      setSuccessMsg('Transaksi pengeluaran berhasil ditolak dengan alasan tercatat.');
      setRejectModal(null);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menolak pengeluaran');
    } finally {
      setSavingReject(false);
    }
  };

  const handleDeleteExpense = async (id_pengeluaran) => {
    if (!window.confirm('Hapus transaksi pengeluaran ini secara permanen?')) return;
    try {
      await PengeluaranService.delete(id_pengeluaran);
      setSuccessMsg('Transaksi pengeluaran berhasil dihapus.');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus pengeluaran');
    }
  };

  // Submit Tambah Pengeluaran Baru
  const handleAddExpenseSubmit = async (e) => {
    e.preventDefault();
    if (!formExpense.id_pekerjaan || !formExpense.id_karyawan || !formExpense.nominal) {
      setErrorMsg('Pekerjaan, Karyawan, dan Nominal wajib diisi.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id_pekerjaan', formExpense.id_pekerjaan);
      formData.append('id_karyawan', formExpense.id_karyawan);
      formData.append('tanggal', formExpense.tanggal);
      formData.append('nominal', formExpense.nominal);
      formData.append('kategori', formExpense.kategori);
      formData.append('jenis_dana', formExpense.jenis_dana);
      if (formExpense.id_dana) formData.append('id_dana', formExpense.id_dana);
      if (formExpense.id_penanggung_jawab) formData.append('id_penanggung_jawab', formExpense.id_penanggung_jawab);
      formData.append('keterangan', formExpense.keterangan);
      formData.append('status_verifikasi', 'disetujui'); // Admin catat langsung disetujui

      if (formExpense.foto_kwitansi) {
        formData.append('foto_kwitansi', formExpense.foto_kwitansi);
      }

      await PengeluaranService.create(formData);
      setSuccessMsg('Transaksi pengeluaran berhasil dicatat!');
      setShowAddExpenseModal(false);
      setFormExpense({
        id_pekerjaan: '',
        id_karyawan: '',
        tanggal: new Date().toISOString().slice(0, 10),
        nominal: '',
        kategori: 'operasional',
        jenis_dana: 'kantor',
        id_dana: '',
        id_penanggung_jawab: '',
        keterangan: '',
        foto_kwitansi: null,
        foto_kwitansi_preview: '',
      });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat pengeluaran');
    }
  };

  // -------------------------------------------------------------------------
  // TAB 2A ACTIONS (DANA UANG KANTOR)
  // -------------------------------------------------------------------------
  const handleAddDanaSubmit = async (e) => {
    e.preventDefault();
    if (!formDana.nominal || !formDana.penerima_dana) {
      setErrorMsg('Nominal dan Nama Penerima dana wajib diisi.');
      return;
    }
    if (formDana.jenis_transaksi === 'penyaluran_dana' && !formDana.id_penanggung_jawab) {
      setErrorMsg('Penyaluran dana internal wajib menentukan penanggung jawab dana.');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('jenis_transaksi', formDana.jenis_transaksi);
      formData.append('tanggal', formDana.tanggal);
      formData.append('sumber_dana', formDana.sumber_dana);
      formData.append('pemberi_dana', formDana.pemberi_dana);
      formData.append('penerima_dana', formDana.penerima_dana);
      if (formDana.id_penanggung_jawab) formData.append('id_penanggung_jawab', formDana.id_penanggung_jawab);
      if (formDana.id_pekerjaan) formData.append('id_pekerjaan', formDana.id_pekerjaan);
      formData.append('nominal', formDana.nominal);
      formData.append('tujuan_penggunaan', formDana.tujuan_penggunaan);
      formData.append('keterangan', formDana.keterangan);

      if (formDana.bukti_transaksi) {
        formData.append('bukti_transaksi', formDana.bukti_transaksi);
      }

      await PengeluaranService.createDanaKantor(formData);
      setSuccessMsg(formDana.jenis_transaksi === 'pemasukan_kas' ? 'Pemasukan kas perusahaan berhasil dicatat!' : 'Penyaluran dana kepada penanggung jawab berhasil dicatat!');
      setShowAddDanaModal(false);
      setFormDana({
        jenis_transaksi: 'penyaluran_dana',
        tanggal: new Date().toISOString().slice(0, 10),
        sumber_dana: 'Kas Utama Perusahaan',
        pemberi_dana: 'Bendahara Kantor',
        penerima_dana: '',
        id_penanggung_jawab: '',
        id_pekerjaan: '',
        nominal: '',
        tujuan_penggunaan: '',
        keterangan: '',
        bukti_transaksi: null,
        bukti_transaksi_preview: '',
      });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat transaksi dana kantor');
    }
  };

  const handleDeleteDana = async (id_dana) => {
    if (!window.confirm('Hapus catatan dana kantor ini?')) return;
    try {
      await PengeluaranService.deleteDanaKantor(id_dana);
      setSuccessMsg('Catatan dana kantor berhasil dihapus.');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus dana kantor');
    }
  };

  // -------------------------------------------------------------------------
  // TAB 2B ACTIONS (PENGEMBALIAN & REIMBURSEMENT)
  // -------------------------------------------------------------------------
  // Pengembalian Uang Kantor
  const handleAddPengembalianSubmit = async (e) => {
    e.preventDefault();
    if (!formPengembalian.id_karyawan || !formPengembalian.id_penanggung_jawab || !formPengembalian.nominal) {
      setErrorMsg('Karyawan, Penanggung Jawab, dan Nominal wajib diisi.');
      return;
    }

    try {
      const formData = new FormData();
      if (formPengembalian.id_dana) formData.append('id_dana', formPengembalian.id_dana);
      formData.append('id_karyawan', formPengembalian.id_karyawan);
      formData.append('id_penanggung_jawab', formPengembalian.id_penanggung_jawab);
      formData.append('tanggal', formPengembalian.tanggal);
      formData.append('nominal', formPengembalian.nominal);
      formData.append('penerima_pengembalian', formPengembalian.penerima_pengembalian);
      formData.append('keterangan', formPengembalian.keterangan);
      formData.append('status_verifikasi', 'disetujui'); // Admin catat langsung disetujui

      if (formPengembalian.bukti_pengembalian) {
        formData.append('bukti_pengembalian', formPengembalian.bukti_pengembalian);
      }

      await PengeluaranService.createPengembalianDana(formData);
      setSuccessMsg('Pengembalian uang kantor berhasil dicatat dan diverifikasi!');
      setShowAddPengembalianModal(false);
      setFormPengembalian({
        id_dana: '',
        id_karyawan: '',
        id_penanggung_jawab: '',
        tanggal: new Date().toISOString().slice(0, 10),
        nominal: '',
        penerima_pengembalian: 'Administrator',
        keterangan: '',
        bukti_pengembalian: null,
        bukti_pengembalian_preview: '',
      });
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat pengembalian dana');
    }
  };

  const handleVerifyPengembalian = async (id_pengembalian, status) => {
    try {
      await PengeluaranService.verifikasiPengembalianDana(id_pengembalian, status);
      setSuccessMsg(`Status pengembalian dana diperbarui (${status}).`);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memverifikasi pengembalian');
    }
  };

  const handleDeletePengembalian = async (id_pengembalian) => {
    if (!window.confirm('Hapus catatan pengembalian dana ini?')) return;
    try {
      await PengeluaranService.deletePengembalianDana(id_pengembalian);
      setSuccessMsg('Catatan pengembalian dana berhasil dihapus.');
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus pengembalian dana');
    }
  };

  // Reimbursement Actions
  const handleOpenVerifyReimburse = (item) => {
    setVerifyReimburseModal(item);
    setApprovedNominalInput(item.nominal_disetujui || item.nominal || '');
    setVerifyReimburseNote('');
  };

  const handleConfirmVerifyReimburse = async (status) => {
    if (!verifyReimburseModal) return;
    setSavingVerifyReimburse(true);
    setErrorMsg('');
    try {
      await PengeluaranService.verifikasi(
        verifyReimburseModal.id_pengeluaran,
        status,
        verifyReimburseNote.trim(),
        status === 'disetujui' ? Number(approvedNominalInput) : 0
      );
      setSuccessMsg(`Pengajuan reimbursement ${verifyReimburseModal.nama_karyawan} berhasil ${status === 'disetujui' ? 'disetujui' : 'ditolak'}!`);
      setVerifyReimburseModal(null);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memverifikasi reimbursement');
    } finally {
      setSavingVerifyReimburse(false);
    }
  };

  const handleOpenBayarReimburse = (item) => {
    setBayarReimburseModal(item);
    const sisa = Number(item.sisa_pembayaran ?? (item.nominal_disetujui || item.nominal) ?? 0);
    setNominalBayarReimburse(sisa > 0 ? sisa : '');
    setTanggalBayarReimburse(new Date().toISOString().slice(0, 10));
    setMetodeBayarReimburse('transfer');
    setNomorRefReimburse('');
    setNamaPenerimaReimburse(item.nama_karyawan || '');
    setCatatanBayarReimburse('');
    setBuktiBayarReimburseFile(null);
    setBuktiBayarReimbursePreview('');
  };

  const handleSubmitBayarReimburse = async (e) => {
    e.preventDefault();
    if (!bayarReimburseModal) return;
    const nominal = Number(nominalBayarReimburse);
    if (!nominal || nominal <= 0) {
      setErrorMsg('Nominal pembayaran harus lebih besar dari Rp 0.');
      return;
    }

    const sisaTagihan = Number(bayarReimburseModal.sisa_pembayaran ?? (bayarReimburseModal.nominal_disetujui || bayarReimburseModal.nominal) ?? 0);
    if (nominal > (sisaTagihan + 0.01)) {
      setErrorMsg(`Nominal pembayaran (Rp ${nominal.toLocaleString('id-ID')}) melebihi sisa tagihan (Rp ${sisaTagihan.toLocaleString('id-ID')}).`);
      return;
    }

    setSavingBayarReimburse(true);
    setErrorMsg('');
    try {
      const formData = new FormData();
      formData.append('id_pengeluaran', bayarReimburseModal.id_pengeluaran);
      formData.append('nominal_bayar', nominal);
      formData.append('tanggal_bayar', tanggalBayarReimburse);
      formData.append('metode_pembayaran', metodeBayarReimburse);
      formData.append('nomor_referensi', nomorRefReimburse.trim());
      formData.append('nama_penerima', namaPenerimaReimburse.trim() || bayarReimburseModal.nama_karyawan);
      formData.append('catatan', catatanBayarReimburse.trim());

      if (buktiBayarReimburseFile) {
        formData.append('bukti_pembayaran', buktiBayarReimburseFile);
      }

      await PengeluaranService.bayarReimbursement(formData);
      setSuccessMsg(`Pembayaran reimbursement sebesar Rp ${nominal.toLocaleString('id-ID')} berhasil dicatat!`);
      setBayarReimburseModal(null);
      fetchData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat pembayaran reimbursement');
    } finally {
      setSavingBayarReimburse(false);
    }
  };

  const handleOpenRiwayatReimburse = async (item) => {
    setRiwayatReimburseModal(item);
    setLoadingTransaksiReimburse(true);
    try {
      const res = await PengeluaranService.getRiwayatBayarReimbursement(item.id_pengeluaran);
      setTransaksiReimburseList(res || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat riwayat pembayaran reimbursement');
    } finally {
      setLoadingTransaksiReimburse(false);
    }
  };

  // -------------------------------------------------------------------------
  // FILTERED LISTS
  // -------------------------------------------------------------------------
  // Tab 1 Filtered List
  const filteredPengeluaran = useMemo(() => {
    return pengeluaranList.filter((item) => {
      const q = searchQuery.toLowerCase();
      const matchSearch = searchQuery === '' ||
        item.nama_karyawan?.toLowerCase().includes(q) ||
        item.kode_karyawan?.toLowerCase().includes(q) ||
        item.nama_pekerjaan?.toLowerCase().includes(q) ||
        item.nomor_transaksi?.toLowerCase().includes(q) ||
        item.keterangan?.toLowerCase().includes(q);

      const matchWorker = filterWorker === '' || String(item.id_karyawan) === String(filterWorker);
      const matchJob = filterJob === '' || String(item.id_pekerjaan) === String(filterJob);
      const matchSource = filterSource === '' || item.jenis_dana === filterSource;
      const matchStatus = filterStatus === '' || item.status_verifikasi === filterStatus;
      const matchCategory = filterCategory === '' || item.kategori === filterCategory;
      const matchStart = filterStartDate === '' || item.tanggal >= filterStartDate;
      const matchEnd = filterEndDate === '' || item.tanggal <= filterEndDate;
      const matchMonth = filterMonth === '' || item.tanggal?.startsWith(filterMonth);

      return matchSearch && matchWorker && matchJob && matchSource && matchStatus && matchCategory && matchStart && matchEnd && matchMonth;
    });
  }, [pengeluaranList, searchQuery, filterWorker, filterJob, filterSource, filterStatus, filterCategory, filterStartDate, filterEndDate, filterMonth]);

  // Tab 2A Filtered Dana Kantor List
  const filteredDanaKantor = useMemo(() => {
    return danaKantorList.filter((d) => {
      const matchJenis = filterJenisDanaTrans === 'semua' || 
        (filterJenisDanaTrans === 'pemasukan_kas' && d.jenis_transaksi === 'pemasukan_kas') ||
        (filterJenisDanaTrans === 'penyaluran_dana' && (d.jenis_transaksi === 'penyaluran_dana' || !d.jenis_transaksi));

      const q = searchDanaKantor.toLowerCase();
      const matchSearch = searchDanaKantor === '' ||
        d.sumber_dana?.toLowerCase().includes(q) ||
        d.pemberi_dana?.toLowerCase().includes(q) ||
        d.penerima_dana?.toLowerCase().includes(q) ||
        d.nama_penanggung_jawab?.toLowerCase().includes(q) ||
        d.nomor_transaksi?.toLowerCase().includes(q) ||
        d.tujuan_penggunaan?.toLowerCase().includes(q);

      return matchJenis && matchSearch;
    });
  }, [danaKantorList, filterJenisDanaTrans, searchDanaKantor]);

  // Tab 2B Filtered Reimbursement List
  const filteredReimbursement = useMemo(() => {
    return reimbursementList.filter((item) => {
      const matchStatus = filterStatusReimburse === 'semua' || item.status_reimbursement === filterStatusReimburse;
      const q = searchReimburse.toLowerCase();
      const matchSearch = searchReimburse === '' ||
        item.nama_karyawan?.toLowerCase().includes(q) ||
        item.kode_karyawan?.toLowerCase().includes(q) ||
        item.nama_pekerjaan?.toLowerCase().includes(q) ||
        item.nomor_transaksi?.toLowerCase().includes(q);

      return matchStatus && matchSearch;
    });
  }, [reimbursementList, filterStatusReimburse, searchReimburse]);

  // Tab 3 Filtered Rekap PJ List
  const filteredRekapPj = useMemo(() => {
    let list = rekapUangKantor?.rekap_per_pj || [];
    if (rekapFilterPj) {
      list = list.filter(
        (item) => String(item.penanggung_jawab?.id_karyawan) === String(rekapFilterPj)
      );
    }
    return list;
  }, [rekapUangKantor, rekapFilterPj]);

  const totalRekapDiterima = filteredRekapPj.reduce(
    (acc, cur) => acc + Number(cur.total_dana_diterima || 0),
    0
  );
  const totalRekapBelanja = filteredRekapPj.reduce(
    (acc, cur) => acc + Number(cur.total_pengeluaran || 0),
    0
  );
  const totalRekapPengembalian = filteredRekapPj.reduce(
    (acc, cur) => acc + Number(cur.total_pengembalian || 0),
    0
  );
  const totalRekapSaldo = filteredRekapPj.reduce(
    (acc, cur) => acc + Number(cur.saldo_dipegang || 0),
    0
  );

  // Filtered Transaksi untuk Dicetak / Diekspor
  const filteredPrintTransactions = useMemo(() => {
    return pengeluaranList.filter((item) => {
      if (item.status_verifikasi !== 'disetujui') return false;
      if (
        rekapFilterPj &&
        String(item.id_penanggung_jawab || item.id_karyawan) !== String(rekapFilterPj)
      ) {
        return false;
      }
      if (rekapFilterMonth && item.tanggal && !item.tanggal.startsWith(rekapFilterMonth)) {
        return false;
      }
      if (printStartDate && item.tanggal && item.tanggal < printStartDate) {
        return false;
      }
      if (printEndDate && item.tanggal && item.tanggal > printEndDate) {
        return false;
      }
      return true;
    });
  }, [pengeluaranList, rekapFilterPj, rekapFilterMonth, printStartDate, printEndDate]);

  const totalFilteredPrintNominal = filteredPrintTransactions.reduce(
    (acc, cur) => acc + Number(cur.nominal_disetujui || cur.nominal || 0),
    0
  );

  // Helper Badge Renderers
  const renderStatusBadge = (status) => {
    if (status === 'disetujui') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Disetujui
        </span>
      );
    }
    if (status === 'ditolak') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
        <Clock className="w-3.5 h-3.5 text-amber-600" /> Menunggu Verifikasi
      </span>
    );
  };

  const renderReimburseStatusBadge = (status) => {
    if (status === 'sudah') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> Sudah Dibayar (Lunas)
        </span>
      );
    }
    if (status === 'sebagian') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600" /> Dibayar Sebagian
        </span>
      );
    }
    if (status === 'disetujui') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-200">
          <Check className="w-3.5 h-3.5 text-blue-600" /> Menunggu Pembayaran
        </span>
      );
    }
    if (status === 'ditolak') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-rose-100 text-rose-800 border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Ditolak
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
        <Clock className="w-3.5 h-3.5 text-slate-500" /> Menunggu Verifikasi
      </span>
    );
  };

  const renderSourceBadge = (source) => {
    if (source === 'kantor') {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
          <Building className="w-3 h-3 text-blue-600" /> Uang Kantor
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
        <User className="w-3 h-3 text-purple-600" /> Uang Pribadi
      </span>
    );
  };

  return (
    <div className="space-y-6 pb-16">
      {/* ============================================================== */}
      {/* 1. HEADER HALAMAN & TAB NAVIGASI HORIZONTAL                     */}
      {/* ============================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm print:hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-md shadow-blue-500/20">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">
                Pengeluaran & Kwitansi
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Pengelolaan transaksi biaya operasional, kas kantor, pengembalian uang, dan reimbursement CV. Putra Anugrah Mandiri.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end md:self-center">
            <button
              onClick={() => {
                setRefreshing(true);
                fetchData();
              }}
              disabled={loading || refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition duration-150 disabled:opacity-50 cursor-pointer shadow-xs"
              title="Segarkan Seluruh Data"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin text-blue-600' : ''}`} />
              <span>Segarkan Data</span>
            </button>
          </div>
        </div>

        {/* ============================================================ */}
        {/* TAB NAVIGASI HORISONTAL (3 MAIN TABS)                         */}
        {/* ============================================================ */}
        <div className="mt-5 border-b border-slate-200 flex space-x-1 sm:space-x-3 overflow-x-auto">
          <button
            onClick={() => setActiveTab('data_pengeluaran')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'data_pengeluaran'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <Receipt className={`w-4 h-4 ${activeTab === 'data_pengeluaran' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>1. Data Pengeluaran</span>
            {Number(summaryData?.pending_count || 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] bg-amber-100 text-amber-800 rounded-full font-bold">
                {summaryData.pending_count} Review
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('pengelolaan_dana')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'pengelolaan_dana'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <CreditCard className={`w-4 h-4 ${activeTab === 'pengelolaan_dana' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>2. Pengelolaan Dana</span>
          </button>

          <button
            onClick={() => setActiveTab('rekap_laporan')}
            className={`flex items-center gap-2 py-3 px-4 font-bold text-xs sm:text-sm border-b-2 transition duration-150 whitespace-nowrap cursor-pointer rounded-t-lg ${
              activeTab === 'rekap_laporan'
                ? 'border-blue-600 text-blue-600 bg-blue-50/60'
                : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
            }`}
          >
            <FileText className={`w-4 h-4 ${activeTab === 'rekap_laporan' ? 'text-blue-600' : 'text-slate-400'}`} />
            <span>3. Rekap & Laporan</span>
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
      {/* TAB 1: DATA PENGELUARAN                                        */}
      {/* ============================================================== */}
      {activeTab === 'data_pengeluaran' && (
        <div className="space-y-6">
          {/* Quick Metrics Bar (Interaktif & Bisa Diklik) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => {
                setFilterStatus((curr) => (curr === 'disetujui' ? '' : 'disetujui'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatus === 'disetujui'
                  ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
                  : 'bg-white border border-slate-200/80 hover:border-emerald-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Pengeluaran Disetujui</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-slate-900">
                {formatRupiah(summaryData?.total_pengeluaran_disetujui || 0)}
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Kantor: {formatRupiah(summaryData?.uang_kantor_disetujui || 0)} • Pribadi: {formatRupiah(summaryData?.uang_pribadi_disetujui || 0)} • Klik filter
              </div>
            </button>

            <button
              type="button"
              onClick={() => {
                setFilterStatus((curr) => (curr === 'menunggu' ? '' : 'menunggu'));
              }}
              className={`p-4 rounded-xl text-left transition shadow-xs cursor-pointer ${
                filterStatus === 'menunggu'
                  ? 'border-2 border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
                  : 'bg-white border border-slate-200/80 hover:border-amber-300 hover:bg-slate-50/50'
              }`}
            >
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Menunggu Verifikasi</span>
                <Clock className="w-4 h-4 text-amber-600" />
              </div>
              <div className="mt-2 text-xl font-bold text-amber-700">
                {summaryData?.pending_count || 0} Nota
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                Total nominal: {formatRupiah(summaryData?.pending_nominal || 0)} • Klik filter
              </div>
            </button>

            <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex items-center justify-between">
              <div>
                <div className="text-xs text-slate-500 font-medium">Input Transaksi Langsung</div>
                <div className="text-sm font-bold text-slate-900 mt-0.5">Catat Pengeluaran Baru</div>
                <div className="text-[11px] text-slate-400">Sebagai Administrator</div>
              </div>
              <button
                onClick={() => setShowAddExpenseModal(true)}
                className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md shadow-blue-500/20 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Data</span>
              </button>
            </div>
          </div>

          {/* Filter & Search Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs space-y-3">
            <div className="flex flex-col md:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text"
                  placeholder="Cari nomor transaksi, nama karyawan, pekerjaan, atau keterangan nota..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <select
                  value={filterSource}
                  onChange={(e) => setFilterSource(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Sumber Dana</option>
                  <option value="kantor">Uang Kantor</option>
                  <option value="pribadi">Uang Pribadi</option>
                </select>

                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Status</option>
                  <option value="menunggu">Menunggu Verifikasi</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                </select>

                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-2 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Kategori</option>
                  <option value="operasional">Operasional</option>
                  <option value="material">Material</option>
                  <option value="konsumsi">Konsumsi</option>
                  <option value="akomodasi">Akomodasi</option>
                  <option value="transportasi">Transportasi</option>
                  <option value="lain_lain">Lain-lain</option>
                </select>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
              <div className="flex flex-wrap items-center gap-2 text-slate-600">
                <span className="font-semibold text-slate-500">Filter Relasi:</span>
                <select
                  value={filterWorker}
                  onChange={(e) => setFilterWorker(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Karyawan</option>
                  {karyawanList.map(k => (
                    <option key={k.id_karyawan} value={k.id_karyawan}>
                      {k.nama} ({k.kode_karyawan || `KRY-${k.id_karyawan}`})
                    </option>
                  ))}
                </select>

                <select
                  value={filterJob}
                  onChange={(e) => setFilterJob(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="">Semua Pekerjaan</option>
                  {pekerjaanList.map(p => (
                    <option key={p.id_pekerjaan} value={p.id_pekerjaan}>
                      {p.nama_pekerjaan}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-500">Rentang Tanggal:</span>
                <input
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
                />
                <span>-</span>
                <input
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Table Data Pengeluaran */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">No. Transaksi</th>
                    <th className="px-4 py-3.5">Tanggal</th>
                    <th className="px-4 py-3.5">Karyawan</th>
                    <th className="px-4 py-3.5">Pekerjaan</th>
                    <th className="px-4 py-3.5">Kategori</th>
                    <th className="px-4 py-3.5">Sumber Dana</th>
                    <th className="px-4 py-3.5">Penanggung Jawab</th>
                    <th className="px-4 py-3.5 text-right">Nominal</th>
                    <th className="px-4 py-3.5 text-center">Status</th>
                    <th className="px-4 py-3.5 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="10" className="text-center py-12 text-slate-400">
                        <div className="inline-flex items-center gap-2">
                          <RotateCcw className="w-4 h-4 animate-spin text-blue-600" />
                          <span>Memuat seluruh transaksi pengeluaran...</span>
                        </div>
                      </td>
                    </tr>
                  ) : filteredPengeluaran.length === 0 ? (
                    <tr>
                      <td colSpan="10" className="text-center py-12 text-slate-400">
                        Tidak ada transaksi pengeluaran yang sesuai dengan filter pencarian.
                      </td>
                    </tr>
                  ) : (
                    filteredPengeluaran.map((row) => {
                      const isPending = row.status_verifikasi === 'menunggu';

                      return (
                        <tr key={row.id_pengeluaran} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[11px]">
                            {row.nomor_transaksi || `EXP-${String(row.id_pengeluaran).padStart(4, '0')}`}
                          </td>

                          <td className="px-4 py-3 font-medium text-slate-800">
                            {row.tanggal}
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
                            <div className="text-[11px] text-slate-400 font-mono">
                              {row.kode_karyawan || `KRY-${row.id_karyawan}`}
                            </div>
                          </td>

                          <td className="px-4 py-3">
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/pekerjaan?highlight=${row.id_pekerjaan}`)}
                              className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                              title="Buka detail proyek ini di Data Pekerjaan"
                            >
                              <span>{row.nama_pekerjaan}</span>
                              <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                            </button>
                            {row.lokasi_pekerjaan && (
                              <div className="text-[10px] text-slate-400 flex items-center gap-1">
                                <MapPin className="w-2.5 h-2.5 text-slate-400" />
                                <span>{row.lokasi_pekerjaan}</span>
                              </div>
                            )}
                          </td>

                          <td className="px-4 py-3 capitalize font-medium text-slate-700">
                            {row.kategori}
                          </td>

                          <td className="px-4 py-3">
                            {renderSourceBadge(row.jenis_dana)}
                          </td>

                          <td className="px-4 py-3">
                            {row.jenis_dana === 'kantor' ? (
                              row.nama_penanggung_jawab ? (
                                <div>
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/admin/karyawan?highlight=${row.id_penanggung_jawab || row.id_karyawan}`)}
                                    className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                    title="Buka profil penanggung jawab di Data Karyawan"
                                  >
                                    <span>{row.nama_penanggung_jawab}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                  </button>
                                  <div className="text-[10px] text-blue-600 font-mono">{row.kode_pj}</div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic">Kas Kantor Langsung</span>
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                            {formatRupiah(row.nominal)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            {renderStatusBadge(row.status_verifikasi)}
                          </td>

                          <td className="px-4 py-3 text-center">
                            <div className="inline-flex items-center gap-1">
                              {/* Tombol Detail & Nota */}
                              <button
                                onClick={() => setSelectedExpense(row)}
                                className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition duration-150 cursor-pointer"
                                title="Lihat Detail & Nota Kwitansi"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-600" />
                              </button>

                              {/* Aksi Persetujuan / Penolakan jika Menunggu */}
                              {isPending && (
                                <>
                                  <button
                                    onClick={() => handleApproveExpense(row.id_pengeluaran)}
                                    className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition duration-150 cursor-pointer border border-emerald-200"
                                    title="Setujui Pengeluaran"
                                  >
                                    <Check className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => handleOpenRejectModal(row)}
                                    className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg transition duration-150 cursor-pointer border border-rose-200"
                                    title="Tolak Pengeluaran dengan Alasan"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}

                              {/* Hapus */}
                              <button
                                onClick={() => handleDeleteExpense(row.id_pengeluaran)}
                                className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition duration-150 cursor-pointer"
                                title="Hapus Transaksi"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
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

      {/* ============================================================== */}
      {/* TAB 2: PENGELOLAAN DANA                                        */}
      {/* ============================================================== */}
      {activeTab === 'pengelolaan_dana' && (
        <div className="space-y-6">
          {/* Subtab Switcher: Subtab A vs Subtab B */}
          <div className="bg-white p-2 rounded-2xl border border-slate-200/80 shadow-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveSubTab('dana_kantor')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'dana_kantor'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Building className="w-4 h-4" />
                <span>Subtab A: Dana Uang Kantor</span>
              </button>

              <button
                onClick={() => setActiveSubTab('pengembalian_reimburse')}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition duration-150 flex items-center gap-2 cursor-pointer ${
                  activeSubTab === 'pengembalian_reimburse'
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
              >
                <ArrowRight className="w-4 h-4" />
                <span>Subtab B: Pengembalian Dana & Reimbursement</span>
              </button>
            </div>
          </div>

          {/* ------------------------------------------------------------ */}
          {/* SUBTAB A: DANA UANG KANTOR                                   */}
          {/* ------------------------------------------------------------ */}
          {activeSubTab === 'dana_kantor' && (
            <div className="space-y-6">
              {/* Summary Cards Subtab A */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Pemasukan Kas Perusahaan</span>
                    <ArrowDownLeft className="w-4 h-4 text-blue-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-blue-900">
                    {formatRupiah(summaryData?.total_pemasukan_perusahaan || 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Dana masuk ke kas utama</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Penyaluran Dana ke PJ</span>
                    <ArrowUpRight className="w-4 h-4 text-indigo-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-indigo-900">
                    {formatRupiah(summaryData?.total_dana_disalurkan || 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Dana operasional ke penanggung jawab</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Pengeluaran Disetujui</span>
                    <Receipt className="w-4 h-4 text-emerald-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-emerald-700">
                    {formatRupiah(summaryData?.uang_kantor_disetujui || 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Belanja operasional terverifikasi</div>
                </div>

                <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                  <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                    <span>Saldo Dipegang Seluruh PJ</span>
                    <CreditCard className="w-4 h-4 text-amber-600" />
                  </div>
                  <div className="mt-2 text-xl font-bold text-amber-700">
                    {formatRupiah(summaryData?.total_saldo_penanggung_jawab || 0)}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5">Sisa dana di tangan penanggung jawab</div>
                </div>
              </div>

              {/* Action Buttons & Filter Bar */}
              <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input 
                      type="text"
                      placeholder="Cari transaksi kas atau penanggung jawab..."
                      value={searchDanaKantor}
                      onChange={(e) => setSearchDanaKantor(e.target.value)}
                      className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500 w-64"
                    />
                  </div>

                  <select
                    value={filterJenisDanaTrans}
                    onChange={(e) => setFilterJenisDanaTrans(e.target.value)}
                    className="bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:outline-none cursor-pointer"
                  >
                    <option value="semua">Semua Transaksi Dana</option>
                    <option value="pemasukan_kas">Pemasukan Kas Perusahaan</option>
                    <option value="penyaluran_dana">Penyaluran Dana ke Penanggung Jawab</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => {
                      setFormDana(prev => ({ ...prev, jenis_transaksi: 'pemasukan_kas' }));
                      setShowAddDanaModal(true);
                    }}
                    className="px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Catat Pemasukan Kas</span>
                  </button>

                  <button
                    onClick={() => {
                      setFormDana(prev => ({ ...prev, jenis_transaksi: 'penyaluran_dana' }));
                      setShowAddDanaModal(true);
                    }}
                    className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Salurkan Dana ke PJ</span>
                  </button>
                </div>
              </div>

              {/* Tabel Dana Kantor */}
              <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="px-4 py-3.5">No. Transaksi</th>
                        <th className="px-4 py-3.5">Tanggal</th>
                        <th className="px-4 py-3.5">Jenis Transaksi</th>
                        <th className="px-4 py-3.5">Sumber & Pemberi</th>
                        <th className="px-4 py-3.5">Penerima & PJ</th>
                        <th className="px-4 py-3.5">Pekerjaan & Tujuan</th>
                        <th className="px-4 py-3.5 text-right">Nominal</th>
                        <th className="px-4 py-3.5 text-right">Terpakai</th>
                        <th className="px-4 py-3.5 text-right">Sisa Dana</th>
                        <th className="px-4 py-3.5 text-center">Bukti</th>
                        <th className="px-4 py-3.5 text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {loading ? (
                        <tr>
                          <td colSpan="11" className="text-center py-12 text-slate-400">
                            Memuat data transaksi dana kantor...
                          </td>
                        </tr>
                      ) : filteredDanaKantor.length === 0 ? (
                        <tr>
                          <td colSpan="11" className="text-center py-12 text-slate-400">
                            Belum ada catatan dana uang kantor.
                          </td>
                        </tr>
                      ) : (
                        filteredDanaKantor.map((row) => {
                          const isPemasukan = row.jenis_transaksi === 'pemasukan_kas';

                          return (
                            <tr key={row.id_dana} className="hover:bg-slate-50/70 transition-colors">
                              <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[11px]">
                                {row.nomor_transaksi || `DNK-${String(row.id_dana).padStart(4, '0')}`}
                              </td>

                              <td className="px-4 py-3 font-medium text-slate-800">
                                {row.tanggal}
                              </td>

                              <td className="px-4 py-3">
                                {isPemasukan ? (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-800 border border-blue-200">
                                    <ArrowDownLeft className="w-3 h-3 text-blue-600" /> Pemasukan Kas
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-800 border border-indigo-200">
                                    <ArrowUpRight className="w-3 h-3 text-indigo-600" /> Penyaluran ke PJ
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                <div className="font-semibold text-slate-800">{row.sumber_dana}</div>
                                <div className="text-[10px] text-slate-400">Pemberi: {row.pemberi_dana}</div>
                              </td>

                              <td className="px-4 py-3">
                                {isPemasukan ? (
                                  <div className="font-medium text-slate-800">{row.penerima_dana}</div>
                                ) : (
                                  <div>
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/karyawan?highlight=${row.id_penanggung_jawab}`)}
                                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                      title="Buka profil penanggung jawab di Data Karyawan"
                                    >
                                      <span>{row.nama_penanggung_jawab || row.penerima_dana}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                    <div className="text-[10px] text-blue-600 font-mono">{row.kode_pj}</div>
                                  </div>
                                )}
                              </td>

                              <td className="px-4 py-3">
                                {row.nama_pekerjaan && (
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/admin/pekerjaan?highlight=${row.id_pekerjaan}`)}
                                    className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                    title="Buka detail proyek ini di Data Pekerjaan"
                                  >
                                    <span>{row.nama_pekerjaan}</span>
                                    <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                  </button>
                                )}
                                <div className="text-[11px] text-slate-500">
                                  {row.tujuan_penggunaan || row.keterangan || '-'}
                                </div>
                              </td>

                              <td className="px-4 py-3 text-right font-bold text-slate-900 text-sm">
                                {formatRupiah(row.nominal)}
                              </td>

                              <td className="px-4 py-3 text-right font-semibold text-slate-600">
                                {isPemasukan ? '-' : formatRupiah(row.terpakai)}
                              </td>

                              <td className="px-4 py-3 text-right font-bold">
                                {isPemasukan ? (
                                  <span className="text-slate-400">-</span>
                                ) : (
                                  <span className={Number(row.sisa_dana || 0) > 0 ? 'text-amber-700' : 'text-slate-500'}>
                                    {formatRupiah(row.sisa_dana)}
                                  </span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                {row.bukti_transaksi ? (
                                  <button
                                    onClick={() => setPreviewImage(getFileUrl(row.bukti_transaksi))}
                                    className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 font-semibold text-[10px] hover:bg-blue-100 cursor-pointer"
                                  >
                                    Lihat
                                  </button>
                                ) : (
                                  <span className="text-slate-400">-</span>
                                )}
                              </td>

                              <td className="px-4 py-3 text-center">
                                <button
                                  onClick={() => handleDeleteDana(row.id_dana)}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                  title="Hapus Catatan Dana"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
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

          {/* ------------------------------------------------------------ */}
          {/* SUBTAB B: PENGEMBALIAN DANA & REIMBURSEMENT                  */}
          {/* ------------------------------------------------------------ */}
          {activeSubTab === 'pengembalian_reimburse' && (
            <div className="space-y-6">
              {/* Internal Switch: Reimbursement vs Pengembalian Uang Kantor */}
              <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSubSectionB('reimbursement')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subSectionB === 'reimbursement'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    1. Reimbursement / Penggantian Uang Pribadi ({reimbursementList.length})
                  </button>

                  <button
                    onClick={() => setSubSectionB('pengembalian')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                      subSectionB === 'pengembalian'
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    2. Pengembalian Sisa Uang Kantor ({pengembalianList.length})
                  </button>
                </div>

                {subSectionB === 'pengembalian' && (
                  <button
                    onClick={() => setShowAddPengembalianModal(true)}
                    className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-xs"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Catat Pengembalian Dana</span>
                  </button>
                )}
              </div>

              {/* SECTION REIMBURSEMENT */}
              {subSectionB === 'reimbursement' && (
                <div className="space-y-4">
                  {/* Summary Reimbursement */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="text-slate-500 text-xs font-medium">Total Diajukan Karyawan</div>
                      <div className="mt-1 text-lg font-bold text-slate-900">
                        {formatRupiah(reimbursementList.reduce((acc, cur) => acc + Number(cur.nominal || 0), 0))}
                      </div>
                      <div className="text-[11px] text-slate-400">{reimbursementList.length} pengajuan</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="text-slate-500 text-xs font-medium">Total Disetujui Admin</div>
                      <div className="mt-1 text-lg font-bold text-blue-700">
                        {formatRupiah(reimbursementList.filter(r => r.status_verifikasi === 'disetujui').reduce((acc, cur) => acc + Number(cur.nominal_disetujui || cur.nominal || 0), 0))}
                      </div>
                      <div className="text-[11px] text-slate-400">Siap diproses bayar</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="text-slate-500 text-xs font-medium">Telah Dibayarkan</div>
                      <div className="mt-1 text-lg font-bold text-emerald-700">
                        {formatRupiah(reimbursementList.reduce((acc, cur) => acc + Number(cur.total_dibayar || 0), 0))}
                      </div>
                      <div className="text-[11px] text-slate-400">Dana telah cair ke pekerja</div>
                    </div>

                    <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-xs">
                      <div className="text-slate-500 text-xs font-medium">Sisa Kewajiban Kantor</div>
                      <div className="mt-1 text-lg font-bold text-rose-700">
                        {formatRupiah(reimbursementList.filter(r => r.status_verifikasi === 'disetujui').reduce((acc, cur) => acc + Number(cur.sisa_pembayaran || 0), 0))}
                      </div>
                      <div className="text-[11px] text-slate-400">Belum dibayar/lunas</div>
                    </div>
                  </div>

                  {/* Filter Reimbursement */}
                  <div className="bg-white p-3 rounded-xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-3">
                    <div className="relative flex-1 w-full sm:max-w-xs">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input 
                        type="text"
                        placeholder="Cari karyawan atau no. transaksi..."
                        value={searchReimburse}
                        onChange={(e) => setSearchReimburse(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-slate-500">Status Reimburse:</span>
                      <select
                        value={filterStatusReimburse}
                        onChange={(e) => setFilterStatusReimburse(e.target.value)}
                        className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 font-medium focus:outline-none cursor-pointer"
                      >
                        <option value="semua">Semua Status</option>
                        <option value="menunggu">Menunggu Verifikasi</option>
                        <option value="disetujui">Menunggu Pembayaran</option>
                        <option value="sebagian">Dibayar Sebagian</option>
                        <option value="sudah">Sudah Dibayar (Lunas)</option>
                        <option value="ditolak">Ditolak</option>
                      </select>
                    </div>
                  </div>

                  {/* Table Reimbursement */}
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3.5">No. Transaksi</th>
                            <th className="px-4 py-3.5">Tanggal</th>
                            <th className="px-4 py-3.5">Karyawan</th>
                            <th className="px-4 py-3.5">Pekerjaan</th>
                            <th className="px-4 py-3.5 text-right">Diajukan</th>
                            <th className="px-4 py-3.5 text-right">Disetujui</th>
                            <th className="px-4 py-3.5 text-right">Sudah Dibayar</th>
                            <th className="px-4 py-3.5 text-right">Sisa Tagihan</th>
                            <th className="px-4 py-3.5 text-center">Status</th>
                            <th className="px-4 py-3.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loading ? (
                            <tr>
                              <td colSpan="10" className="text-center py-12 text-slate-400">
                                Memuat pengajuan reimbursement...
                              </td>
                            </tr>
                          ) : filteredReimbursement.length === 0 ? (
                            <tr>
                              <td colSpan="10" className="text-center py-12 text-slate-400">
                                Belum ada data pengajuan reimbursement uang pribadi.
                              </td>
                            </tr>
                          ) : (
                            filteredReimbursement.map((row) => {
                              const sisa = Number(row.sisa_pembayaran ?? 0);
                              const isApproved = row.status_verifikasi === 'disetujui';
                              const isLunas = row.status_reimbursement === 'sudah' || (isApproved && sisa <= 0 && Number(row.total_dibayar || 0) > 0);

                              return (
                                <tr key={row.id_pengeluaran} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[11px]">
                                    {row.nomor_transaksi || `RMB-${String(row.id_pengeluaran).padStart(4, '0')}`}
                                  </td>

                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {row.tanggal}
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
                                    <div className="text-[10px] text-slate-400">{row.kode_karyawan}</div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/pekerjaan?highlight=${row.id_pekerjaan}`)}
                                      className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                      title="Buka detail proyek ini di Data Pekerjaan"
                                    >
                                      <span>{row.nama_pekerjaan}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                  </td>

                                  <td className="px-4 py-3 text-right font-medium text-slate-600">
                                    {formatRupiah(row.nominal)}
                                  </td>

                                  <td className="px-4 py-3 text-right font-bold text-blue-700">
                                    {isApproved ? formatRupiah(row.nominal_disetujui || row.nominal) : '-'}
                                  </td>

                                  <td className="px-4 py-3 text-right font-semibold text-emerald-700">
                                    {formatRupiah(row.total_dibayar)}
                                  </td>

                                  <td className="px-4 py-3 text-right font-bold">
                                    <span className={sisa > 0 && isApproved ? 'text-rose-600' : 'text-slate-400'}>
                                      {isApproved ? formatRupiah(sisa) : '-'}
                                    </span>
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    {renderReimburseStatusBadge(row.status_reimbursement)}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1.5">
                                      {/* Lihat Bukti Nota */}
                                      <button
                                        onClick={() => setSelectedExpense(row)}
                                        className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                        title="Periksa Nota Kwitansi"
                                      >
                                        <Eye className="w-3.5 h-3.5 text-slate-600" />
                                      </button>

                                      {/* Verifikasi jika masih Menunggu */}
                                      {row.status_verifikasi === 'menunggu' && (
                                        <button
                                          onClick={() => handleOpenVerifyReimburse(row)}
                                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-lg font-bold text-[11px] cursor-pointer"
                                        >
                                          Verifikasi
                                        </button>
                                      )}

                                      {/* Bayar jika Disetujui & Belum Lunas */}
                                      {isApproved && !isLunas && (
                                        <button
                                          onClick={() => handleOpenBayarReimburse(row)}
                                          className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-[11px] flex items-center gap-1 shadow-xs cursor-pointer"
                                          title="Bayar Reimbursement"
                                        >
                                          <CreditCard className="w-3 h-3" />
                                          <span>Bayar</span>
                                        </button>
                                      )}

                                      {/* Riwayat Pembayaran */}
                                      {Number(row.total_transaksi_bayar || 0) > 0 && (
                                        <button
                                          onClick={() => handleOpenRiwayatReimburse(row)}
                                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg cursor-pointer"
                                          title="Lihat Riwayat Termin Pembayaran"
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

              {/* SECTION PENGEMBALIAN UANG KANTOR */}
              {subSectionB === 'pengembalian' && (
                <div className="space-y-4">
                  <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                          <tr>
                            <th className="px-4 py-3.5">No. Transaksi</th>
                            <th className="px-4 py-3.5">Tanggal</th>
                            <th className="px-4 py-3.5">Karyawan Pengembali</th>
                            <th className="px-4 py-3.5">Penanggung Jawab Dana</th>
                            <th className="px-4 py-3.5">Penerima Kas (Admin)</th>
                            <th className="px-4 py-3.5 text-right">Nominal Kembali</th>
                            <th className="px-4 py-3.5 text-center">Bukti</th>
                            <th className="px-4 py-3.5 text-center">Status Verifikasi</th>
                            <th className="px-4 py-3.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {loading ? (
                            <tr>
                              <td colSpan="9" className="text-center py-12 text-slate-400">
                                Memuat data pengembalian dana...
                              </td>
                            </tr>
                          ) : pengembalianList.length === 0 ? (
                            <tr>
                              <td colSpan="9" className="text-center py-12 text-slate-400">
                                Belum ada catatan pengembalian uang kantor.
                              </td>
                            </tr>
                          ) : (
                            pengembalianList.map((row) => {
                              const isPending = row.status_verifikasi === 'menunggu';

                              return (
                                <tr key={row.id_pengembalian} className="hover:bg-slate-50/70 transition-colors">
                                  <td className="px-4 py-3 font-mono font-bold text-slate-900 text-[11px]">
                                    {row.nomor_transaksi || `RTN-${String(row.id_pengembalian).padStart(4, '0')}`}
                                  </td>

                                  <td className="px-4 py-3 font-medium text-slate-800">
                                    {row.tanggal}
                                  </td>

                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/karyawan?highlight=${row.id_karyawan}`)}
                                      className="font-bold text-slate-900 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                      title="Buka profil karyawan di Data Karyawan"
                                    >
                                      <span>{row.nama_karyawan}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                    <div className="text-[10px] text-slate-400">{row.kode_karyawan}</div>
                                  </td>

                                  <td className="px-4 py-3">
                                    <button
                                      type="button"
                                      onClick={() => navigate(`/admin/karyawan?highlight=${row.id_penanggung_jawab || row.id_karyawan}`)}
                                      className="font-semibold text-slate-800 hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                                      title="Buka profil penanggung jawab di Data Karyawan"
                                    >
                                      <span>{row.nama_penanggung_jawab}</span>
                                      <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                                    </button>
                                    <div className="text-[10px] text-blue-600 font-mono">{row.kode_pj}</div>
                                  </td>

                                  <td className="px-4 py-3 font-medium text-slate-700">
                                    {row.penerima_pengembalian}
                                  </td>

                                  <td className="px-4 py-3 text-right font-bold text-emerald-700 text-sm">
                                    {formatRupiah(row.nominal)}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    {row.bukti_pengembalian ? (
                                      <button
                                        onClick={() => setPreviewImage(getFileUrl(row.bukti_pengembalian))}
                                        className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded border border-blue-200 font-semibold text-[10px] hover:bg-blue-100 cursor-pointer"
                                      >
                                        Lihat
                                      </button>
                                    ) : (
                                      <span className="text-slate-400">-</span>
                                    )}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    {renderStatusBadge(row.status_verifikasi)}
                                  </td>

                                  <td className="px-4 py-3 text-center">
                                    <div className="inline-flex items-center gap-1">
                                      {isPending && (
                                        <>
                                          <button
                                            onClick={() => handleVerifyPengembalian(row.id_pengembalian, 'disetujui')}
                                            className="p-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg cursor-pointer"
                                            title="Verifikasi Pengembalian Diterima"
                                          >
                                            <Check className="w-3.5 h-3.5" />
                                          </button>
                                          <button
                                            onClick={() => handleVerifyPengembalian(row.id_pengembalian, 'ditolak')}
                                            className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg cursor-pointer"
                                            title="Tolak Pengembalian"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </>
                                      )}

                                      <button
                                        onClick={() => handleDeletePengembalian(row.id_pengembalian)}
                                        className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg cursor-pointer"
                                        title="Hapus"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
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
            </div>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: REKAP & LAPORAN                                         */}
      {/* ============================================================== */}
      {activeTab === 'rekap_laporan' && (
        <div className="space-y-6">
          {/* Header Bar & Kontrol Cetak Laporan Resmi */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-800 border border-blue-200">
                    Dokumen Resmi
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    A4 Formal Layout
                  </span>
                </div>
                <h2 className="text-base sm:text-lg font-bold text-slate-900 mt-1">
                  Rekap & Laporan Pertanggungjawaban Saldo Penanggung Jawab
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Pemantauan komprehensif atas penyaluran uang kantor, realisasi belanja disetujui, dan pengembalian kas per penanggung jawab.
                </p>
              </div>

              {/* Action Buttons: Pratinjau & Cetak Resmi */}
              <div className="flex flex-wrap items-center gap-2.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowPrintPreviewModal(true)}
                  className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold flex items-center gap-2 border border-slate-300 transition shadow-xs cursor-pointer"
                >
                  <Eye className="w-4 h-4 text-slate-600" />
                  <span>Pratinjau Dokumen Cetak (A4)</span>
                </button>

                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak / Ekspor Laporan Resmi (PDF)</span>
                </button>
              </div>
            </div>

            {/* Filter Toolbar Parameter Laporan Resmi */}
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center gap-3 text-xs">
              <div className="flex items-center gap-1.5 font-bold text-slate-700">
                <Filter className="w-3.5 h-3.5 text-blue-600" />
                <span>Parameter Laporan:</span>
              </div>

              {/* Filter Bulan */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Bulan:</span>
                <input
                  type="month"
                  value={rekapFilterMonth}
                  onChange={(e) => setRekapFilterMonth(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer"
                />
              </div>

              {/* Filter Penanggung Jawab */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Penanggung Jawab:</span>
                <select
                  value={rekapFilterPj}
                  onChange={(e) => setRekapFilterPj(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 text-xs text-slate-700 font-medium focus:outline-none focus:border-blue-500 cursor-pointer max-w-[180px]"
                >
                  <option value="">Semua Penanggung Jawab</option>
                  {pekerjaList.map((p) => (
                    <option key={p.id_karyawan} value={p.id_karyawan}>
                      {p.nama} ({p.kode_karyawan})
                    </option>
                  ))}
                </select>
              </div>

              {/* Filter Rentang Tanggal */}
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] text-slate-500">Rentang:</span>
                <input
                  type="date"
                  value={printStartDate}
                  onChange={(e) => setPrintStartDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  title="Tanggal Mulai"
                />
                <span className="text-slate-400 font-bold">-</span>
                <input
                  type="date"
                  value={printEndDate}
                  onChange={(e) => setPrintEndDate(e.target.value)}
                  className="bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 text-xs text-slate-700 focus:outline-none focus:border-blue-500 cursor-pointer"
                  title="Tanggal Selesai"
                />
              </div>

              {/* Checkbox Sertakan Rincian Transaksi */}
              <label className="flex items-center gap-1.5 cursor-pointer select-none text-slate-700 ml-auto font-medium">
                <input
                  type="checkbox"
                  checked={printIncludeTransactions}
                  onChange={(e) => setPrintIncludeTransactions(e.target.checked)}
                  className="rounded text-blue-600 focus:ring-blue-500 cursor-pointer"
                />
                <span>Sertakan Rincian Transaksi ({filteredPrintTransactions.length})</span>
              </label>

              {/* Tombol Reset Filter */}
              {(rekapFilterMonth || rekapFilterPj || printStartDate || printEndDate) && (
                <button
                  type="button"
                  onClick={() => {
                    setRekapFilterMonth('');
                    setRekapFilterPj('');
                    setPrintStartDate('');
                    setPrintEndDate('');
                  }}
                  className="text-xs text-rose-600 hover:text-rose-800 font-bold underline cursor-pointer"
                >
                  Reset Filter
                </button>
              )}
            </div>
          </div>

          {/* 7 KARTU RINGKASAN FINANSIAL UTAMA */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">1. Pemasukan Kas Perusahaan</span>
              <span className="text-base font-bold text-blue-900 mt-1 block">
                {formatRupiah(summaryData?.total_pemasukan_perusahaan || 0)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">2. Total Dana Disalurkan</span>
              <span className="text-base font-bold text-indigo-900 mt-1 block">
                {formatRupiah(summaryData?.total_dana_disalurkan || 0)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">3. Pengeluaran Kantor Disetujui</span>
              <span className="text-base font-bold text-emerald-800 mt-1 block">
                {formatRupiah(summaryData?.uang_kantor_disetujui || 0)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">4. Pengembalian Diverifikasi</span>
              <span className="text-base font-bold text-teal-800 mt-1 block">
                {formatRupiah(summaryData?.total_pengembalian_diverifikasi || 0)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">5. Reimbursement Dibayar</span>
              <span className="text-base font-bold text-purple-900 mt-1 block">
                {formatRupiah(summaryData?.total_reimbursement_sudah_dibayar || 0)}
              </span>
            </div>

            <div className="bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
              <span className="text-[11px] font-semibold text-slate-500 block">6. Kewajiban Reimburse Belum</span>
              <span className="text-base font-bold text-rose-700 mt-1 block">
                {formatRupiah(summaryData?.total_reimbursement_belum_dibayar || 0)}
              </span>
            </div>

            <div className="bg-gradient-to-br from-amber-50 to-orange-50 p-3.5 rounded-xl border border-amber-300 shadow-xs col-span-2 sm:col-span-1 lg:col-span-2">
              <span className="text-[11px] font-bold text-amber-900 block">7. Saldo Masih Dipegang Seluruh Penanggung Jawab</span>
              <span className="text-lg font-black text-amber-800 mt-1 block">
                {formatRupiah(summaryData?.total_saldo_penanggung_jawab || 0)}
              </span>
              <span className="text-[10px] text-amber-700 mt-0.5 block">Formula: Penyaluran - Belanja Disetujui - Pengembalian Kas</span>
            </div>
          </div>

          {/* Tabel Rekap Uang Kantor per Penanggung Jawab */}
          <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div className="font-bold text-slate-900 text-sm">
                Rekapitulasi Saldo & Pertanggungjawaban per Penanggung Jawab
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider text-[11px]">
                  <tr>
                    <th className="px-4 py-3.5">Nama Penanggung Jawab</th>
                    <th className="px-4 py-3.5 text-right">Total Dana Diterima</th>
                    <th className="px-4 py-3.5 text-right">Total Belanja Disetujui</th>
                    <th className="px-4 py-3.5 text-right">Total Pengembalian</th>
                    <th className="px-4 py-3.5 text-right">Saldo Dipegang</th>
                    <th className="px-4 py-3.5 text-center">Status Pertanggungjawaban</th>
                    <th className="px-4 py-3.5 text-center">Aksi Detail</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        Menghitung rekapitulasi mutasi kas...
                      </td>
                    </tr>
                  ) : filteredRekapPj.length === 0 ? (
                    <tr>
                      <td colSpan="7" className="text-center py-12 text-slate-400">
                        Belum ada data penanggung jawab yang sesuai dengan parameter.
                      </td>
                    </tr>
                  ) : (
                    filteredRekapPj.map((item, idx) => {
                      const pj = item.penanggung_jawab;
                      const saldo = Number(item.saldo_dipegang || 0);

                      return (
                        <tr key={idx} className="hover:bg-slate-50/70 transition-colors">
                          <td className="px-4 py-3">
                            <div className="font-bold text-slate-900">{pj.nama}</div>
                            <div className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                              <span className="font-mono text-blue-600 bg-blue-50 px-1 rounded">{pj.kode_karyawan}</span>
                              <span>•</span>
                              <span>{pj.jabatan}</span>
                            </div>
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatRupiah(item.total_dana_diterima)}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatRupiah(item.total_pengeluaran)}
                          </td>

                          <td className="px-4 py-3 text-right font-semibold text-slate-800">
                            {formatRupiah(item.total_pengembalian)}
                          </td>

                          <td className="px-4 py-3 text-right font-bold text-sm">
                            <span className={saldo > 0 ? 'text-amber-700' : (saldo < 0 ? 'text-rose-600' : 'text-emerald-700')}>
                              {formatRupiah(saldo)}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                              saldo === 0 
                                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                : (saldo > 0 
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200' 
                                  : 'bg-rose-50 text-rose-800 border border-rose-200')
                            }`}>
                              {item.status_pertanggungjawaban}
                            </span>
                          </td>

                          <td className="px-4 py-3 text-center">
                            <button
                              onClick={() => setSelectedPjMutasi(item)}
                              className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 rounded-xl font-bold text-xs flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              <span>Detail Mutasi</span>
                            </button>
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
      {/* MODALS SECTION                                                 */}
      {/* ============================================================== */}

      {/* MODAL DETAIL PENGELUARAN */}
      {selectedExpense && (
        <Modal
          isOpen={!!selectedExpense}
          onClose={() => setSelectedExpense(null)}
          title={`Detail Pengeluaran - ${selectedExpense.nomor_transaksi || `EXP-${selectedExpense.id_pengeluaran}`}`}
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
              <div>
                <span className="text-slate-500 block">Karyawan Pelaksana</span>
                <span className="font-bold text-slate-900 block">{selectedExpense.nama_karyawan} ({selectedExpense.kode_karyawan})</span>
              </div>
              <div>
                <span className="text-slate-500 block">Tanggal Transaksi</span>
                <span className="font-bold text-slate-900 block">{selectedExpense.tanggal}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Pekerjaan Terkait</span>
                <span className="font-bold text-slate-900 block">{selectedExpense.nama_pekerjaan}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Sumber Dana</span>
                <span className="font-bold text-slate-900 block">{selectedExpense.jenis_dana === 'kantor' ? 'Uang Kantor' : 'Uang Pribadi'}</span>
              </div>
              {selectedExpense.nama_penanggung_jawab && (
                <div className="col-span-2">
                  <span className="text-slate-500 block">Penanggung Jawab Dana</span>
                  <span className="font-bold text-blue-700 block">{selectedExpense.nama_penanggung_jawab} ({selectedExpense.kode_pj})</span>
                </div>
              )}
            </div>

            <div className="flex justify-between items-center p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <span className="font-bold text-blue-900">Total Nominal Biaya:</span>
              <span className="text-base font-extrabold text-blue-700">{formatRupiah(selectedExpense.nominal)}</span>
            </div>

            <div>
              <span className="font-bold text-slate-700 block mb-1">Keterangan / Alasan Pengeluaran:</span>
              <p className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-800 leading-relaxed">
                {selectedExpense.keterangan || 'Tidak ada keterangan tambahan.'}
              </p>
            </div>

            {selectedExpense.catatan_penolakan && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800">
                <span className="font-bold block mb-0.5">Alasan Penolakan:</span>
                <span>{selectedExpense.catatan_penolakan}</span>
              </div>
            )}

            {/* Bukti Nota Kwitansi */}
            <div>
              <span className="font-bold text-slate-700 block mb-1.5">Foto Nota / Bukti Kwitansi:</span>
              {selectedExpense.foto_kwitansi ? (
                <div 
                  onClick={() => setPreviewImage(getFileUrl(selectedExpense.foto_kwitansi))}
                  className="relative group cursor-pointer border border-slate-200 rounded-xl overflow-hidden max-h-64 flex items-center justify-center bg-slate-900"
                >
                  <img 
                    src={getFileUrl(selectedExpense.foto_kwitansi)} 
                    alt="Nota Kwitansi" 
                    className="max-h-64 w-auto object-contain"
                  />
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-bold gap-1 text-xs">
                    <ZoomIn className="w-4 h-4" /> Klik untuk Perbesar
                  </div>
                </div>
              ) : (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Tidak ada foto bukti nota kwitansi yang dilampirkan.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedExpense(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL PENOLAKAN PENGELUARAN */}
      {rejectModal && (
        <Modal
          isOpen={!!rejectModal}
          onClose={() => setRejectModal(null)}
          title={`Tolak Pengeluaran - ${rejectModal.nama_karyawan}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900">
              <p>Anda akan menolak pengeluaran sebesar <strong>{formatRupiah(rejectModal.nominal)}</strong> untuk pekerjaan <strong>{rejectModal.nama_pekerjaan}</strong>.</p>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Alasan Penolakan <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows="3"
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Contoh: Nota tidak jelas / foto blur, biaya tidak sesuai RAB, barang tidak terverifikasi..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-rose-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setRejectModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                onClick={handleConfirmReject}
                disabled={savingReject}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
              >
                {savingReject ? 'Menyimpan...' : 'Konfirmasi Penolakan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL VERIFIKASI REIMBURSEMENT (SETUJUI DENGAN NOMINAL ATAU TOLAK) */}
      {verifyReimburseModal && (
        <Modal
          isOpen={!!verifyReimburseModal}
          onClose={() => setVerifyReimburseModal(null)}
          title={`Verifikasi Reimbursement - ${verifyReimburseModal.nama_karyawan}`}
          maxWidth="max-w-md"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Karyawan Pengaju:</span>
                <span className="font-bold text-slate-900">{verifyReimburseModal.nama_karyawan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Pekerjaan Terkait:</span>
                <span className="font-bold text-slate-900">{verifyReimburseModal.nama_pekerjaan}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nominal Diajukan:</span>
                <span className="font-bold text-blue-700">{formatRupiah(verifyReimburseModal.nominal)}</span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Nominal yang Disetujui (Rp) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                value={approvedNominalInput}
                onChange={(e) => setApprovedNominalInput(e.target.value)}
                placeholder="Masukkan nominal disetujui..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <span className="text-[11px] text-slate-400 mt-0.5 block">
                Default sama dengan nominal yang diajukan oleh karyawan.
              </span>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">
                Catatan Verifikasi (Opsional jika disetujui, Wajib jika ditolak)
              </label>
              <textarea
                rows="2"
                value={verifyReimburseNote}
                onChange={(e) => setVerifyReimburseNote(e.target.value)}
                placeholder="Catatan penyesuaian nominal atau alasan jika ditolak..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => handleConfirmVerifyReimburse('ditolak')}
                disabled={savingVerifyReimburse}
                className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl font-bold cursor-pointer"
              >
                Tolak Pengajuan
              </button>
              <button
                type="button"
                onClick={() => handleConfirmVerifyReimburse('disetujui')}
                disabled={savingVerifyReimburse}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
              >
                {savingVerifyReimburse ? 'Menyimpan...' : 'Setujui Pengajuan'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL BAYAR REIMBURSEMENT (PARSIAL ATAU PENUH) */}
      {bayarReimburseModal && (
        <Modal
          isOpen={!!bayarReimburseModal}
          onClose={() => setBayarReimburseModal(null)}
          title={`Bayar Reimbursement - ${bayarReimburseModal.nama_karyawan}`}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleSubmitBayarReimburse} className="space-y-4 text-xs">
            <div className="p-3.5 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-2xl space-y-1.5">
              <div className="flex justify-between items-center text-slate-700">
                <span>Nominal Disetujui:</span>
                <span className="font-bold text-slate-900">{formatRupiah(bayarReimburseModal.nominal_disetujui || bayarReimburseModal.nominal)}</span>
              </div>
              <div className="flex justify-between items-center text-slate-700">
                <span>Sudah Dibayarkan:</span>
                <span className="font-bold text-emerald-700">{formatRupiah(bayarReimburseModal.total_dibayar)}</span>
              </div>
              <div className="border-t border-blue-200/60 pt-1.5 flex justify-between items-center text-sm">
                <span className="font-bold text-blue-900">Sisa yang Harus Dibayar:</span>
                <span className="font-extrabold text-rose-600">
                  {formatRupiah(bayarReimburseModal.sisa_pembayaran ?? (bayarReimburseModal.nominal_disetujui || bayarReimburseModal.nominal))}
                </span>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tanggal Pembayaran</label>
              <input
                type="date"
                required
                value={tanggalBayarReimburse}
                onChange={(e) => setTanggalBayarReimburse(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none"
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="font-bold text-slate-700">Nominal Pembayaran (Rp) <span className="text-rose-500">*</span></label>
                <button
                  type="button"
                  onClick={() => setNominalBayarReimburse(Number(bayarReimburseModal.sisa_pembayaran ?? (bayarReimburseModal.nominal_disetujui || bayarReimburseModal.nominal) ?? 0))}
                  className="text-blue-600 font-bold hover:underline text-[11px] cursor-pointer"
                >
                  Bayar Lunas Penuh
                </button>
              </div>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={nominalBayarReimburse}
                onChange={(e) => setNominalBayarReimburse(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1.5">Metode Pembayaran</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  metodeBayarReimburse === 'transfer' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="metode_bayar_reimburse"
                    checked={metodeBayarReimburse === 'transfer'}
                    onChange={() => setMetodeBayarReimburse('transfer')}
                  />
                  <span>Transfer Bank</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  metodeBayarReimburse === 'tunai' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="metode_bayar_reimburse"
                    checked={metodeBayarReimburse === 'tunai'}
                    onChange={() => setMetodeBayarReimburse('tunai')}
                  />
                  <span>Tunai (Cash)</span>
                </label>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nomor Referensi Transaksi</label>
              <input
                type="text"
                value={nomorRefReimburse}
                onChange={(e) => setNomorRefReimburse(e.target.value)}
                placeholder="Contoh: TRF-BCA-99812 atau No. Kwitansi Kasir"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nama Penerima Pembayaran</label>
              <input
                type="text"
                required
                value={namaPenerimaReimburse}
                onChange={(e) => setNamaPenerimaReimburse(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Catatan Pembayaran</label>
              <textarea
                rows="2"
                value={catatanBayarReimburse}
                onChange={(e) => setCatatanBayarReimburse(e.target.value)}
                placeholder="Keterangan tambahan..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Unggah Bukti Transfer / Kwitansi Pembayaran</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setBuktiBayarReimburseFile(f);
                    const r = new FileReader();
                    r.onload = () => setBuktiBayarReimbursePreview(r.result);
                    r.readAsDataURL(f);
                  }
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setBayarReimburseModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={savingBayarReimburse}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer disabled:opacity-50"
              >
                {savingBayarReimburse ? 'Menyimpan...' : 'Konfirmasi Pembayaran'}
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL RIWAYAT TRANSAKSI REIMBURSEMENT */}
      {riwayatReimburseModal && (
        <Modal
          isOpen={!!riwayatReimburseModal}
          onClose={() => setRiwayatReimburseModal(null)}
          title={`Riwayat Termin Reimbursement - ${riwayatReimburseModal.nama_karyawan}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex justify-between items-center">
              <div>
                <span className="font-bold text-blue-900 block">{riwayatReimburseModal.nama_karyawan}</span>
                <span className="text-blue-700">Pekerjaan: {riwayatReimburseModal.nama_pekerjaan}</span>
              </div>
              <div className="text-right">
                <span className="text-slate-500 block">Total Disetujui:</span>
                <span className="font-extrabold text-blue-900 text-sm">{formatRupiah(riwayatReimburseModal.nominal_disetujui || riwayatReimburseModal.nominal)}</span>
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
                  {loadingTransaksiReimburse ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        Memuat riwayat transaksi...
                      </td>
                    </tr>
                  ) : transaksiReimburseList.length === 0 ? (
                    <tr>
                      <td colSpan="5" className="text-center py-6 text-slate-400">
                        Belum ada termin pembayaran yang dicatat.
                      </td>
                    </tr>
                  ) : (
                    transaksiReimburseList.map((t) => (
                      <tr key={t.id_pembayaran_reimburse} className="hover:bg-slate-50">
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
                              Lihat
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
                onClick={() => setRiwayatReimburseModal(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL DETAIL MUTASI PENANGGUNG JAWAB (TAB 3) */}
      {selectedPjMutasi && (
        <Modal
          isOpen={!!selectedPjMutasi}
          onClose={() => setSelectedPjMutasi(null)}
          title={`Buku Mutasi Kas - ${selectedPjMutasi.penanggung_jawab.nama}`}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl grid grid-cols-4 gap-3 text-center">
              <div>
                <span className="text-slate-500 block">Dana Diterima:</span>
                <span className="font-bold text-indigo-700 text-sm">{formatRupiah(selectedPjMutasi.total_dana_diterima)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Belanja Disetujui:</span>
                <span className="font-bold text-slate-800 text-sm">{formatRupiah(selectedPjMutasi.total_pengeluaran)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Kas Dikembalikan:</span>
                <span className="font-bold text-slate-800 text-sm">{formatRupiah(selectedPjMutasi.total_pengembalian)}</span>
              </div>
              <div>
                <span className="text-slate-500 block">Saldo Akhir Dipegang:</span>
                <span className="font-black text-amber-700 text-sm">{formatRupiah(selectedPjMutasi.saldo_dipegang)}</span>
              </div>
            </div>

            {/* Riwayat Penyaluran Dana Masuk ke PJ */}
            <div>
              <span className="font-bold text-slate-800 block mb-1.5 uppercase text-[11px] tracking-wide">
                1. Riwayat Penyaluran Dana Diterima dari Kantor
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">No. Transaksi</th>
                      <th className="px-3 py-2">Sumber Dana</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPjMutasi.daftar_penerimaan || []).map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{m.tanggal}</td>
                        <td className="px-3 py-1.5 font-mono text-slate-500">{m.nomor_transaksi || `DNK-${m.id_ref}`}</td>
                        <td className="px-3 py-1.5">{m.keterangan || 'Kas Perusahaan'}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-indigo-700">{formatRupiah(m.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Belanja Lapangan */}
            <div>
              <span className="font-bold text-slate-800 block mb-1.5 uppercase text-[11px] tracking-wide">
                2. Realisasi Pengeluaran Lapangan Terverifikasi
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Pekerjaan</th>
                      <th className="px-3 py-2">Pelaksana</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPjMutasi.daftar_pengeluaran || []).map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{m.tanggal}</td>
                        <td className="px-3 py-1.5 font-semibold text-slate-800">{m.nama_pekerjaan}</td>
                        <td className="px-3 py-1.5">{m.nama_pelaksana}</td>
                        <td className="px-3 py-1.5 capitalize">{m.status_verifikasi}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-slate-900">{formatRupiah(m.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Pengembalian Kas */}
            <div>
              <span className="font-bold text-slate-800 block mb-1.5 uppercase text-[11px] tracking-wide">
                3. Riwayat Pengembalian Sisa Uang Kantor
              </span>
              <div className="border border-slate-200 rounded-xl overflow-hidden max-h-48 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-bold sticky top-0">
                    <tr>
                      <th className="px-3 py-2">Tanggal</th>
                      <th className="px-3 py-2">Penerima Kasir</th>
                      <th className="px-3 py-2">Status</th>
                      <th className="px-3 py-2 text-right">Nominal</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(selectedPjMutasi.daftar_pengembalian || []).map((m, i) => (
                      <tr key={i}>
                        <td className="px-3 py-1.5">{m.tanggal}</td>
                        <td className="px-3 py-1.5">{m.penerima_pengembalian}</td>
                        <td className="px-3 py-1.5 capitalize">{m.status_verifikasi}</td>
                        <td className="px-3 py-1.5 text-right font-bold text-teal-700">{formatRupiah(m.nominal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedPjMutasi(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* MODAL TAMBAH PENGELUARAN BARU */}
      {showAddExpenseModal && (
        <Modal
          isOpen={showAddExpenseModal}
          onClose={() => setShowAddExpenseModal(false)}
          title="Catat Pengeluaran Operasional Baru"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleAddExpenseSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Transaksi</label>
                <input
                  type="date"
                  required
                  value={formExpense.tanggal}
                  onChange={(e) => setFormExpense(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Kategori Biaya</label>
                <select
                  value={formExpense.kategori}
                  onChange={(e) => setFormExpense(prev => ({ ...prev, kategori: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="operasional">Operasional</option>
                  <option value="material">Material</option>
                  <option value="konsumsi">Konsumsi</option>
                  <option value="akomodasi">Akomodasi</option>
                  <option value="transportasi">Transportasi</option>
                  <option value="lain_lain">Lain-lain</option>
                </select>
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Pekerjaan / Proyek Terkait</label>
              <select
                required
                value={formExpense.id_pekerjaan}
                onChange={(e) => setFormExpense(prev => ({ ...prev, id_pekerjaan: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="">-- Pilih Pekerjaan --</option>
                {pekerjaanList.map(p => (
                  <option key={p.id_pekerjaan} value={p.id_pekerjaan}>
                    {p.nama_pekerjaan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Karyawan Pelaksana / Pembeli</label>
              <select
                required
                value={formExpense.id_karyawan}
                onChange={(e) => setFormExpense(prev => ({ ...prev, id_karyawan: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="">-- Pilih Karyawan --</option>
                {karyawanList.map(k => (
                  <option key={k.id_karyawan} value={k.id_karyawan}>
                    {k.nama} ({k.kode_karyawan || `KRY-${k.id_karyawan}`})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Sumber Dana Pengeluaran</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  formExpense.jenis_dana === 'kantor' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="jenis_dana_add"
                    checked={formExpense.jenis_dana === 'kantor'}
                    onChange={() => setFormExpense(prev => ({ ...prev, jenis_dana: 'kantor' }))}
                  />
                  <span>Uang Kantor</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  formExpense.jenis_dana === 'pribadi' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="jenis_dana_add"
                    checked={formExpense.jenis_dana === 'pribadi'}
                    onChange={() => setFormExpense(prev => ({ ...prev, jenis_dana: 'pribadi' }))}
                  />
                  <span>Uang Pribadi (Reimburse)</span>
                </label>
              </div>
            </div>

            {formExpense.jenis_dana === 'kantor' && (
              <div>
                <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab Dana Kantor</label>
                <select
                  value={formExpense.id_penanggung_jawab}
                  onChange={(e) => setFormExpense(prev => ({ ...prev, id_penanggung_jawab: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                >
                  <option value="">Kas Kantor Langsung / Pilih PJ</option>
                  {karyawanList.map(k => (
                    <option key={k.id_karyawan} value={k.id_karyawan}>
                      {k.nama} ({k.kode_karyawan}) - {k.jabatan}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Nominal Biaya (Rp)</label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={formExpense.nominal}
                onChange={(e) => setFormExpense(prev => ({ ...prev, nominal: e.target.value }))}
                placeholder="0"
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Keterangan Nota / Belanja</label>
              <textarea
                rows="2"
                value={formExpense.keterangan}
                onChange={(e) => setFormExpense(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Rincian barang atau jasa yang dibeli..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Foto Bukti Kwitansi / Struk</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) {
                    setFormExpense(prev => ({ ...prev, foto_kwitansi: f }));
                  }
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddExpenseModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Simpan Transaksi
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL TAMBAH DANA KANTOR (PEMASUKAN KAS ATAU PENYALURAN) */}
      {showAddDanaModal && (
        <Modal
          isOpen={showAddDanaModal}
          onClose={() => setShowAddDanaModal(false)}
          title={formDana.jenis_transaksi === 'pemasukan_kas' ? 'Catat Pemasukan Kas Perusahaan' : 'Salurkan Dana ke Penanggung Jawab'}
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleAddDanaSubmit} className="space-y-3.5 text-xs">
            <div>
              <label className="font-bold text-slate-700 block mb-1">Jenis Transaksi Kas</label>
              <div className="grid grid-cols-2 gap-3">
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  formDana.jenis_transaksi === 'pemasukan_kas' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="jenis_dana_type"
                    checked={formDana.jenis_transaksi === 'pemasukan_kas'}
                    onChange={() => setFormDana(prev => ({ ...prev, jenis_transaksi: 'pemasukan_kas' }))}
                  />
                  <span>Pemasukan Kas Perusahaan</span>
                </label>
                <label className={`flex items-center gap-2 p-2.5 rounded-xl border cursor-pointer ${
                  formDana.jenis_transaksi === 'penyaluran_dana' ? 'border-blue-600 bg-blue-50/50 font-bold text-blue-900' : 'border-slate-200'
                }`}>
                  <input
                    type="radio"
                    name="jenis_dana_type"
                    checked={formDana.jenis_transaksi === 'penyaluran_dana'}
                    onChange={() => setFormDana(prev => ({ ...prev, jenis_transaksi: 'penyaluran_dana' }))}
                  />
                  <span>Penyaluran ke PJ</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal</label>
                <input
                  type="date"
                  required
                  value={formDana.tanggal}
                  onChange={(e) => setFormDana(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal (Rp)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={formDana.nominal}
                  onChange={(e) => setFormDana(prev => ({ ...prev, nominal: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Sumber Dana</label>
              <input
                type="text"
                required
                value={formDana.sumber_dana}
                onChange={(e) => setFormDana(prev => ({ ...prev, sumber_dana: e.target.value }))}
                placeholder="Contoh: Kas Utama, Rekening Operasional BCA, Modal Owner..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Pemberi Uang</label>
                <input
                  type="text"
                  required
                  value={formDana.pemberi_dana}
                  onChange={(e) => setFormDana(prev => ({ ...prev, pemberi_dana: e.target.value }))}
                  placeholder="Nama pemberi..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Penerima Uang</label>
                <input
                  type="text"
                  required
                  value={formDana.penerima_dana}
                  onChange={(e) => setFormDana(prev => ({ ...prev, penerima_dana: e.target.value }))}
                  placeholder="Nama penerima..."
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>
            </div>

            {formDana.jenis_transaksi === 'penyaluran_dana' && (
              <>
                <div>
                  <label className="font-bold text-slate-700 block mb-1">
                    Penanggung Jawab Dana (Karyawan) <span className="text-rose-500">*</span>
                  </label>
                  <select
                    required
                    value={formDana.id_penanggung_jawab}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selK = karyawanList.find(k => String(k.id_karyawan) === String(selId));
                      setFormDana(prev => ({
                        ...prev,
                        id_penanggung_jawab: selId,
                        penerima_dana: selK ? selK.nama : prev.penerima_dana
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                  >
                    <option value="">-- Pilih Penanggung Jawab --</option>
                    {karyawanList.map(k => (
                      <option key={k.id_karyawan} value={k.id_karyawan}>
                        {k.nama} ({k.kode_karyawan}) - {k.jabatan}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-bold text-slate-700 block mb-1">Pekerjaan Terkait (Opsional)</label>
                  <select
                    value={formDana.id_pekerjaan}
                    onChange={(e) => setFormDana(prev => ({ ...prev, id_pekerjaan: e.target.value }))}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
                  >
                    <option value="">-- Operasional Umum / Pilih Pekerjaan --</option>
                    {pekerjaanList.map(p => (
                      <option key={p.id_pekerjaan} value={p.id_pekerjaan}>
                        {p.nama_pekerjaan}
                      </option>
                    ))}
                  </select>
                </div>
              </>
            )}

            <div>
              <label className="font-bold text-slate-700 block mb-1">Tujuan Penggunaan / Keterangan</label>
              <textarea
                rows="2"
                value={formDana.tujuan_penggunaan}
                onChange={(e) => setFormDana(prev => ({ ...prev, tujuan_penggunaan: e.target.value }))}
                placeholder="Contoh: Modal operasional lapangan pengerjaan jaringan fiber..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Bukti Transaksi (Slip Transfer / Tanda Terima)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFormDana(prev => ({ ...prev, bukti_transaksi: f }));
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddDanaModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Simpan Catatan Dana
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL CATAT PENGEMBALIAN UANG KANTOR */}
      {showAddPengembalianModal && (
        <Modal
          isOpen={showAddPengembalianModal}
          onClose={() => setShowAddPengembalianModal(false)}
          title="Catat Pengembalian Sisa Uang Kantor"
          maxWidth="max-w-lg"
        >
          <form onSubmit={handleAddPengembalianSubmit} className="space-y-3.5 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Tanggal Pengembalian</label>
                <input
                  type="date"
                  required
                  value={formPengembalian.tanggal}
                  onChange={(e) => setFormPengembalian(prev => ({ ...prev, tanggal: e.target.value }))}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Nominal Dikembalikan (Rp)</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={formPengembalian.nominal}
                  onChange={(e) => setFormPengembalian(prev => ({ ...prev, nominal: e.target.value }))}
                  placeholder="0"
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900"
                />
              </div>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Karyawan yang Menyerahkan Uang</label>
              <select
                required
                value={formPengembalian.id_karyawan}
                onChange={(e) => setFormPengembalian(prev => ({ ...prev, id_karyawan: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="">-- Pilih Karyawan Pengembali --</option>
                {karyawanList.map(k => (
                  <option key={k.id_karyawan} value={k.id_karyawan}>
                    {k.nama} ({k.kode_karyawan})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Penanggung Jawab Dana Asal</label>
              <select
                required
                value={formPengembalian.id_penanggung_jawab}
                onChange={(e) => setFormPengembalian(prev => ({ ...prev, id_penanggung_jawab: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl cursor-pointer"
              >
                <option value="">-- Pilih Penanggung Jawab --</option>
                {karyawanList.map(k => (
                  <option key={k.id_karyawan} value={k.id_karyawan}>
                    {k.nama} ({k.kode_karyawan}) - {k.jabatan}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Penerima Kas Pengembalian (Admin / Bendahara)</label>
              <input
                type="text"
                required
                value={formPengembalian.penerima_pengembalian}
                onChange={(e) => setFormPengembalian(prev => ({ ...prev, penerima_pengembalian: e.target.value }))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Keterangan Pengembalian</label>
              <textarea
                rows="2"
                value={formPengembalian.keterangan}
                onChange={(e) => setFormPengembalian(prev => ({ ...prev, keterangan: e.target.value }))}
                placeholder="Contoh: Pengembalian sisa uang operasional proyek..."
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl"
              />
            </div>

            <div>
              <label className="font-bold text-slate-700 block mb-1">Bukti Pengembalian (Struk / Tanda Terima)</label>
              <input
                type="file"
                accept="image/*,application/pdf"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setFormPengembalian(prev => ({ ...prev, bukti_pengembalian: f }));
                }}
                className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:bg-blue-50 file:text-blue-700"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowAddPengembalianModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold cursor-pointer shadow-xs"
              >
                Simpan & Verifikasi Pengembalian
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* MODAL PREVIEW GAMBAR / FOTO NOTA */}
      {previewImage && (
        <Modal
          isOpen={!!previewImage}
          onClose={() => setPreviewImage(null)}
          title="Pratinjau Foto Bukti / Kwitansi"
          maxWidth="max-w-xl"
        >
          <div className="space-y-3 text-center">
            <div className="max-h-[75vh] overflow-auto rounded-xl border border-slate-200 p-1 bg-slate-900">
              <img 
                src={previewImage} 
                alt="Bukti Nota" 
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

      {/* ============================================================== */}
      {/* PRINT-ONLY CORPORATE FINANCIAL REPORT (DOKUMEN RESMI A4)       */}
      {/* Hanya terlihat saat dialog Print / Save as PDF aktif           */}
      {/* ============================================================== */}
      <div className="print-only">
        <CorporateFinancialReportDocument
          summaryData={summaryData}
          filteredRekapPj={filteredRekapPj}
          totalRekapDiterima={totalRekapDiterima}
          totalRekapBelanja={totalRekapBelanja}
          totalRekapPengembalian={totalRekapPengembalian}
          totalRekapSaldo={totalRekapSaldo}
          filteredPrintTransactions={filteredPrintTransactions}
          totalFilteredPrintNominal={totalFilteredPrintNominal}
          printIncludeTransactions={printIncludeTransactions}
          rekapFilterMonth={rekapFilterMonth}
          rekapFilterPj={rekapFilterPj}
          printStartDate={printStartDate}
          printEndDate={printEndDate}
          pekerjaList={pekerjaList}
          currentUser={currentUser}
        />
      </div>

      {/* ============================================================== */}
      {/* MODAL PRATINJAU DOKUMEN CETAK RESMI (SIMULASI A4 DI LAYAR)     */}
      {/* ============================================================== */}
      {showPrintPreviewModal && (
        <Modal
          isOpen={showPrintPreviewModal}
          onClose={() => setShowPrintPreviewModal(false)}
          title="Pratinjau Dokumen Resmi Laporan Keuangan (A4)"
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {/* Top Toolbar in Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3 bg-blue-50/80 border border-blue-200 rounded-xl text-xs">
              <div className="flex items-center gap-2 text-blue-900 font-medium">
                <Printer className="w-4 h-4 text-blue-600 shrink-0" />
                <span>
                  Pratinjau dokumen resmi siap dicetak pada kertas A4 atau disimpan sebagai PDF.
                </span>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold flex items-center gap-1.5 shadow-sm transition active:scale-95 cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Cetak / Simpan PDF</span>
                </button>
              </div>
            </div>

            {/* Scrollable A4 Document Paper Simulation */}
            <div className="max-h-[70vh] overflow-y-auto bg-slate-200/70 p-3 sm:p-6 rounded-xl border border-slate-300">
              <div className="bg-white shadow-xl rounded-lg border border-slate-300 overflow-hidden">
                <CorporateFinancialReportDocument
                  summaryData={summaryData}
                  filteredRekapPj={filteredRekapPj}
                  totalRekapDiterima={totalRekapDiterima}
                  totalRekapBelanja={totalRekapBelanja}
                  totalRekapPengembalian={totalRekapPengembalian}
                  totalRekapSaldo={totalRekapSaldo}
                  filteredPrintTransactions={filteredPrintTransactions}
                  totalFilteredPrintNominal={totalFilteredPrintNominal}
                  printIncludeTransactions={printIncludeTransactions}
                  rekapFilterMonth={rekapFilterMonth}
                  rekapFilterPj={rekapFilterPj}
                  printStartDate={printStartDate}
                  printEndDate={printEndDate}
                  pekerjaList={pekerjaList}
                  currentUser={currentUser}
                />
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowPrintPreviewModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl font-bold text-xs cursor-pointer"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
