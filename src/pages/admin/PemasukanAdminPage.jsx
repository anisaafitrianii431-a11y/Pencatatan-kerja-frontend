import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  CheckCircle2,
  XCircle,
  AlertCircle,
  AlertTriangle,
  Eye,
  Check,
  RefreshCw,
  Filter,
  Search,
  RotateCcw,
  Trash2,
  Plus,
  Edit3,
  Printer,
  Send,
  ExternalLink,
  Receipt,
  Clock,
  ShieldCheck,
  UserCheck
} from 'lucide-react';
import { PengeluaranService, PekerjaanService, PekerjaService } from '../../services/api';
import { compressImage } from '../../utils/imageCompressor';
import Modal from '../../components/Modal';

export default function PemasukanAdminPage() {
  const [kasData, setKasData] = useState({
    daftar: [],
    pengembalian: [],
    summary: {
      total_kas_masuk: 0,
      total_terpakai_disetujui: 0,
      total_terpakai_menunggu: 0,
      total_sisa_dikembalikan: 0,
      total_sisa_tanggungan: 0,
      menunggu_konfirmasi_kembali: 0,
      menunggu_verifikasi_kas: 0
    }
  });
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filter controls
  const [filterWorker, setFilterWorker] = useState('');
  const [filterVerifikasi, setFilterVerifikasi] = useState('semua');
  const [filterLpj, setFilterLpj] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal Catat / Edit Pemasukan Kas Kantor
  const [isKasModalOpen, setIsKasModalOpen] = useState(false);
  const [editingKasId, setEditingKasId] = useState(null);
  const [kasFormJobId, setKasFormJobId] = useState('');
  const [kasFormPjId, setKasFormPjId] = useState('');
  const [kasFormTanggal, setKasFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [kasFormNominal, setKasFormNominal] = useState('');
  const [kasFormKeterangan, setKasFormKeterangan] = useState('');
  const [kasFormFile, setKasFormFile] = useState(null);
  const [kasFormPreview, setKasFormPreview] = useState('');
  const [kasSubmitting, setKasSubmitting] = useState(false);
  const [kasModalError, setKasModalError] = useState('');

  // Modal Verifikasi / Persetujuan Pemasukan Kas dari Karyawan
  const [verifikasiTarget, setVerifikasiTarget] = useState(null);
  const [catatanAdmin, setCatatanAdmin] = useState('');
  const [verifikasiSubmitting, setVerifikasiSubmitting] = useState(false);

  // Modal Terima Setoran Sisa Dana Kantor
  const [terimaSisaKas, setTerimaSisaKas] = useState(null);
  const [sisaFormTanggal, setSisaFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [sisaFormNominal, setSisaFormNominal] = useState('');
  const [sisaFormKeterangan, setSisaFormKeterangan] = useState('');
  const [sisaFormFile, setSisaFormFile] = useState(null);
  const [sisaFormPreview, setSisaFormPreview] = useState('');
  const [sisaSubmitting, setSisaSubmitting] = useState(false);
  const [sisaModalError, setSisaModalError] = useState('');

  // Modal Detail Mutasi & LPJ Kas
  const [selectedKasDetail, setSelectedKasDetail] = useState(null);
  const [selectedNotaPreview, setSelectedNotaPreview] = useState(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const getImageUrl = (path) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
      return path;
    }
    return `/api/${path.replace(/^\/+/, '')}`;
  };

  const showSuccess = (msg) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 4500);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [kasRes, expenses, jobs, workers] = await Promise.all([
        PengeluaranService.getKasList(),
        PengeluaranService.getAll({ jenis_dana: 'kantor' }),
        PekerjaanService.getAll(),
        PekerjaService.getAll()
      ]);

      setKasData(kasRes || { daftar: [], pengembalian: [], summary: {} });
      setPengeluaranList(expenses || []);
      setPekerjaanList(jobs || []);
      setPekerjaList(workers || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data pemasukan & kas kantor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derived lists
  const pendingKasApprovalList = useMemo(() => {
    return (kasData?.daftar || []).filter(kk => (kk.status_verifikasi || 'disetujui') === 'menunggu');
  }, [kasData]);

  const pendingPengembalianList = useMemo(() => {
    return (kasData?.pengembalian || []).filter(pk => pk.status_konfirmasi === 'menunggu');
  }, [kasData]);

  const filteredKasList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return (kasData?.daftar || []).filter(kk => {
      const statusVerif = kk.status_verifikasi || 'disetujui';
      if (filterWorker && String(kk.id_karyawan) !== String(filterWorker)) return false;
      if (filterVerifikasi !== 'semua' && statusVerif !== filterVerifikasi) return false;
      if (filterLpj !== 'semua' && kk.status_lpj !== filterLpj) return false;
      if (q) {
        const matchText =
          (kk.nama_penanggung_jawab || '').toLowerCase().includes(q) ||
          (kk.nama_pelapor || '').toLowerCase().includes(q) ||
          (kk.nama_pekerjaan || '').toLowerCase().includes(q) ||
          (kk.keterangan || '').toLowerCase().includes(q) ||
          `kas #${kk.id_kas}`.includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [kasData, filterWorker, filterVerifikasi, filterLpj, searchQuery]);

  // Handlers Modal Catat / Edit Pemasukan Kas Kantor
  const handleOpenCreateKas = () => {
    setEditingKasId(null);
    setKasFormJobId(pekerjaanList[0]?.id_pekerjaan ? String(pekerjaanList[0].id_pekerjaan) : '');
    setKasFormPjId('');
    setKasFormTanggal(new Date().toISOString().slice(0, 10));
    setKasFormNominal('');
    setKasFormKeterangan('');
    setKasFormFile(null);
    setKasFormPreview('');
    setKasModalError('');
    setKasSubmitting(false);
    setIsKasModalOpen(true);
  };

  const handleOpenEditKas = (kas) => {
    setEditingKasId(kas.id_kas);
    setKasFormJobId(kas.id_pekerjaan ? String(kas.id_pekerjaan) : '');
    setKasFormPjId(String(kas.id_karyawan));
    setKasFormTanggal(kas.tanggal);
    setKasFormNominal(String(kas.nominal_masuk));
    setKasFormKeterangan(kas.keterangan || '');
    setKasFormFile(null);
    setKasFormPreview(kas.bukti_serah ? getImageUrl(kas.bukti_serah) : '');
    setKasModalError('');
    setKasSubmitting(false);
    setIsKasModalOpen(true);
  };

  const handleKasFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setKasModalError('Format file bukti harus berupa gambar.');
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setKasFormFile(compressed.file);
      setKasFormPreview(URL.createObjectURL(compressed.file));
    } catch {
      setKasFormFile(file);
      setKasFormPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmitKas = async (e) => {
    e.preventDefault();
    setKasModalError('');
    if (!kasFormPjId) {
      setKasModalError('Pilih Penanggung Jawab (Pekerja) yang menerima dana kantor.');
      document.getElementById('admin-kas-pj')?.focus();
      return;
    }
    if (!kasFormNominal || Number(kasFormNominal) <= 0) {
      setKasModalError('Nominal kas masuk wajib lebih dari Rp 0.');
      document.getElementById('admin-kas-nominal')?.focus();
      return;
    }

    setKasSubmitting(true);
    try {
      const fd = new FormData();
      if (kasFormJobId) fd.append('id_pekerjaan', kasFormJobId);
      fd.append('id_karyawan', kasFormPjId);
      fd.append('tanggal', kasFormTanggal);
      fd.append('nominal_masuk', kasFormNominal);
      fd.append('keterangan', kasFormKeterangan);
      if (kasFormFile) {
        fd.append('bukti_serah', kasFormFile);
      }

      if (editingKasId) {
        fd.append('id_kas', editingKasId);
        await PengeluaranService.updateKas(editingKasId, fd);
        showSuccess('Data pemasukan kas kantor berhasil diperbarui!');
      } else {
        await PengeluaranService.createKas(fd);
        showSuccess('Pemasukan dana kantor & penanggung jawab berhasil dicatat!');
      }
      setIsKasModalOpen(false);
      loadData();
    } catch (err) {
      setKasModalError(err.message || 'Gagal menyimpan data pemasukan kas.');
    } finally {
      setKasSubmitting(false);
    }
  };

  // Handlers Verifikasi Pemasukan Kas dari Karyawan
  const handleOpenVerifikasiModal = (kas) => {
    setVerifikasiTarget(kas);
    setCatatanAdmin(kas.catatan_admin || '');
    setVerifikasiSubmitting(false);
  };

  const handleVerifikasiKas = async (id_kas, status_verifikasi, noteOverride = null) => {
    setVerifikasiSubmitting(true);
    setErrorMsg('');
    try {
      const finalNote = noteOverride !== null ? noteOverride : catatanAdmin;
      await PengeluaranService.verifikasiKas(id_kas, status_verifikasi, finalNote);
      showSuccess(
        status_verifikasi === 'disetujui'
          ? 'Pemasukan kas kantor disetujui! Penanggung jawab sekarang aktif dipilih saat pengeluaran Uang Kantor.'
          : status_verifikasi === 'ditolak'
          ? 'Laporan pemasukan kas kantor telah ditolak.'
          : 'Status pemasukan dikembalikan ke Menunggu Pengecekan.'
      );
      setVerifikasiTarget(null);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui status persetujuan pemasukan kas.');
    } finally {
      setVerifikasiSubmitting(false);
    }
  };

  const handleDeleteKas = async (kas) => {
    if (!window.confirm(`Hapus catatan pemasukan kas #${kas.id_kas} (PJ: ${kas.nama_penanggung_jawab}, ${formatRupiah(kas.nominal_masuk)})?`)) {
      return;
    }
    try {
      await PengeluaranService.deleteKas(kas.id_kas, false);
      showSuccess('Catatan pemasukan kas kantor berhasil dihapus.');
      loadData();
    } catch (err) {
      if (window.confirm(`${err.message}\n\nApakah Anda tetap ingin menghapus paksa data kas ini? (Catatan nota terkait akan dilepas dari relasi kas).`)) {
        try {
          await PengeluaranService.deleteKas(kas.id_kas, true);
          showSuccess('Catatan kas kantor berhasil dihapus.');
          loadData();
        } catch (errForce) {
          setErrorMsg(errForce.message || 'Gagal menghapus data kas.');
        }
      }
    }
  };

  // Handler Terima Pengembalian Sisa Dana
  const handleOpenTerimaSisa = (kas) => {
    setTerimaSisaKas(kas);
    setSisaFormTanggal(new Date().toISOString().slice(0, 10));
    setSisaFormNominal(String(kas.sisa_resmi || 0));
    setSisaFormKeterangan(`Penerimaan sisa dana dari ${kas.nama_penanggung_jawab}`);
    setSisaFormFile(null);
    setSisaFormPreview('');
    setSisaModalError('');
    setSisaSubmitting(false);
  };

  const handleSisaFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSisaModalError('Format file harus berupa gambar.');
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setSisaFormFile(compressed.file);
      setSisaFormPreview(URL.createObjectURL(compressed.file));
    } catch {
      setSisaFormFile(file);
      setSisaFormPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmitTerimaSisa = async (e) => {
    e.preventDefault();
    if (!terimaSisaKas) return;
    setSisaModalError('');

    const nom = Number(sisaFormNominal);
    if (!nom || nom <= 0) {
      setSisaModalError('Nominal sisa yang diterima harus lebih dari Rp 0.');
      document.getElementById('admin-sisa-nominal')?.focus();
      return;
    }
    if (nom > Number(terimaSisaKas.sisa_resmi) + 0.01) {
      setSisaModalError(`Nominal melebihi sisa tanggungan kas ini (${formatRupiah(terimaSisaKas.sisa_resmi)}).`);
      document.getElementById('admin-sisa-nominal')?.focus();
      return;
    }

    setSisaSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('id_kas', terimaSisaKas.id_kas);
      fd.append('id_karyawan', terimaSisaKas.id_karyawan);
      fd.append('tanggal', sisaFormTanggal);
      fd.append('nominal', nom);
      fd.append('keterangan', sisaFormKeterangan);
      if (sisaFormFile) {
        fd.append('bukti_foto', sisaFormFile);
      }
      await PengeluaranService.setorSisaKas(fd);
      showSuccess('Pengembalian sisa dana kantor berhasil diterima & dicatat!');
      setTerimaSisaKas(null);
      loadData();
    } catch (err) {
      setSisaModalError(err.message || 'Gagal mencatat pengembalian sisa dana.');
    } finally {
      setSisaSubmitting(false);
    }
  };

  const handleKonfirmasiPengembalian = async (id_pengembalian, status) => {
    try {
      await PengeluaranService.konfirmasiPengembalian(id_pengembalian, status);
      showSuccess(`Setoran sisa dana berhasil ${status === 'diterima' ? 'DITERIMA' : 'DITOLAK'}!`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memproses konfirmasi pengembalian sisa.');
    }
  };

  const handleVerifikasiNota = async (id_pengeluaran, status) => {
    try {
      await PengeluaranService.verifikasi(id_pengeluaran, status);
      showSuccess(`Status nota pengeluaran diubah ke ${status.toUpperCase()}.`);
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memperbarui verifikasi nota.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Wallet className="w-7 h-7 text-blue-600" />
            <span>Pemasukan &amp; Kas Kantor</span>
          </h1>
          <p className="text-sm text-slate-500">
            Kelola pemasukan dana kantor, verifikasi laporan pemasukan dari karyawan, tetapkan penanggung jawab, dan pantau LPJ kas.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center space-x-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4 text-slate-500" />
            <span>Cetak LPJ</span>
          </button>
          <button
            type="button"
            onClick={handleOpenCreateKas}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-sm transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Catat Pemasukan Kas Kantor</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {errorMsg && (
        <div role="alert" className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div role="status" className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* 3 KPI Ringkasan Kas Kantor (Hanya Menghitung Pemasukan Disetujui) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Total Kas Masuk (Disetujui)</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1">
            {formatRupiah(kasData?.summary?.total_kas_masuk)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Akumulasi kas aktif &amp; selesai</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Belanja Kas Disetujui</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatRupiah(kasData?.summary?.total_terpakai_disetujui)}
          </div>
          <div className="text-xs text-slate-500 mt-1">
            {Number(kasData?.summary?.total_terpakai_menunggu) > 0
              ? `Antre nota: ${formatRupiah(kasData.summary.total_terpakai_menunggu)}`
              : `Sisa dikembalikan: ${formatRupiah(kasData?.summary?.total_sisa_dikembalikan)}`}
          </div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Sisa Di Tangan PJ</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatRupiah(kasData?.summary?.total_sisa_tanggungan)}
          </div>
          <div className="text-xs text-amber-700 mt-1">Wajib dipertanggungjawabkan</div>
        </div>
      </div>

      {/* Antrean Persetujuan Laporan Pemasukan Kas dari Karyawan */}
      {pendingKasApprovalList.length > 0 && (
        <div className="bg-amber-50/70 border border-amber-300 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-amber-200 flex flex-wrap items-center justify-between gap-2 bg-amber-100/60">
            <div className="flex items-center space-x-2">
              <Clock className="w-4 h-4 text-amber-700" />
              <h2 className="text-xs font-extrabold text-amber-950 uppercase tracking-wider">
                Pemasukan Kas Menunggu Pengecekan &amp; Persetujuan Admin ({pendingKasApprovalList.length})
              </h2>
            </div>
            <span className="text-[11px] font-semibold text-amber-800">
              Baru muncul sebagai pilihan Uang Kantor setelah disetujui Admin
            </span>
          </div>
          <div className="divide-y divide-amber-200/70">
            {pendingKasApprovalList.map((kas) => (
              <div
                key={kas.id_kas}
                className="p-4 bg-white/90 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 font-mono font-bold text-[11px]">
                      Kas #{kas.id_kas}
                    </span>
                    <strong className="text-slate-900 text-sm">{formatRupiah(kas.nominal_masuk)}</strong>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700">{kas.tanggal}</span>
                  </div>
                  <div className="text-slate-700 flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span>
                      Penanggung Jawab: <strong className="text-blue-700">{kas.nama_penanggung_jawab}</strong>
                    </span>
                    {kas.nama_pelapor && (
                      <span>
                        Pelapor: <strong className="text-slate-900">{kas.nama_pelapor}</strong>
                      </span>
                    )}
                    <span>
                      Proyek: <strong>{kas.nama_pekerjaan || 'Dana Kantor Umum'}</strong>
                    </span>
                  </div>
                  {kas.keterangan && (
                    <p className="text-[11px] text-slate-500 italic">&quot;{kas.keterangan}&quot;</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  {kas.bukti_serah && (
                    <a
                      href={getImageUrl(kas.bukti_serah)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 font-semibold text-[11px] inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lihat Bukti</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleOpenVerifikasiModal(kas)}
                    className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-900 text-white font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Periksa &amp; Putuskan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleVerifikasiKas(kas.id_kas, 'disetujui', '')}
                    disabled={verifikasiSubmitting}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Setujui</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleOpenVerifikasiModal(kas)}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Antrean Konfirmasi Setoran Sisa dari Karyawan */}
      {pendingPengembalianList.length > 0 && (
        <div className="bg-sky-50/70 border border-sky-200 rounded-2xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-sky-200 flex items-center justify-between bg-sky-100/50">
            <div className="flex items-center space-x-2">
              <Send className="w-4 h-4 text-sky-700" />
              <h2 className="text-xs font-extrabold text-sky-900 uppercase tracking-wider">
                Konfirmasi Pengembalian Sisa Dana dari Karyawan ({pendingPengembalianList.length})
              </h2>
            </div>
          </div>
          <div className="divide-y divide-sky-200/60">
            {pendingPengembalianList.map((pk) => (
              <div key={pk.id_pengembalian} className="p-3.5 bg-white/90 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div className="space-y-0.5">
                  <div className="font-bold text-slate-800">
                    {pk.nama_penyetor || pk.nama_penanggung_jawab} • <span className="text-sky-700">{formatRupiah(pk.nominal)}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    {pk.nama_pekerjaan || 'Dana Umum Kantor'} — {pk.keterangan || 'Setoran sisa kas'} ({pk.tanggal})
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {pk.bukti_foto && (
                    <a
                      href={getImageUrl(pk.bukti_foto)}
                      target="_blank"
                      rel="noreferrer"
                      className="px-2.5 py-1.5 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px] inline-flex items-center space-x-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Bukti</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={() => handleKonfirmasiPengembalian(pk.id_pengembalian, 'diterima')}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Terima Sisa</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleKonfirmasiPengembalian(pk.id_pengembalian, 'ditolak')}
                    className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-[11px] inline-flex items-center space-x-1 cursor-pointer"
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Tolak</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filter Bar (<search> element per Modern Web Guidance) */}
      <search className="block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
        <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5 text-blue-600" />
          <span>Filter &amp; Pencarian Pemasukan Kas</span>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label htmlFor="kas-filter-search" className="block text-xs font-semibold text-slate-500 mb-1">
              Cari PJ / Pelapor / Proyek
            </label>
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                id="kas-filter-search"
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Nama PJ, pelapor, proyek..."
                className="w-full min-h-[40px] pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label htmlFor="kas-filter-pj" className="block text-xs font-semibold text-slate-500 mb-1">
              Penanggung Jawab
            </label>
            <select
              id="kas-filter-pj"
              value={filterWorker}
              onChange={(e) => setFilterWorker(e.target.value)}
              className="w-full min-h-[40px] text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Semua Penanggung Jawab ({pekerjaList.length})</option>
              {pekerjaList.map((w) => (
                <option key={w.id_karyawan} value={w.id_karyawan}>{w.nama}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="kas-filter-verifikasi" className="block text-xs font-semibold text-slate-500 mb-1">
              Persetujuan Admin
            </label>
            <select
              id="kas-filter-verifikasi"
              value={filterVerifikasi}
              onChange={(e) => setFilterVerifikasi(e.target.value)}
              className="w-full min-h-[40px] text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="semua">Semua Status Persetujuan</option>
              <option value="menunggu">Menunggu Pengecekan</option>
              <option value="disetujui">Disetujui Admin</option>
              <option value="ditolak">Ditolak</option>
            </select>
          </div>

          <div>
            <label htmlFor="kas-filter-lpj" className="block text-xs font-semibold text-slate-500 mb-1">
              Status Pertanggungjawaban (LPJ)
            </label>
            <select
              id="kas-filter-lpj"
              value={filterLpj}
              onChange={(e) => setFilterLpj(e.target.value)}
              className="w-full min-h-[40px] text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="semua">Semua Status LPJ</option>
              <option value="berjalan">Berjalan (Aktif / Ada Sisa)</option>
              <option value="selesai">Selesai / Klir (Rp 0)</option>
            </select>
          </div>
        </div>
      </search>

      {/* Tabel Buku Kas & LPJ */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 id="tabel-buku-kas-heading" className="font-bold text-slate-800 text-sm">
              Buku Pemasukan Kas &amp; Pertanggungjawaban Dana Kantor ({filteredKasList.length})
            </h2>
            <p className="text-xs text-slate-500">
              Pelacakan pemasukan kas (input Admin maupun ajuan Karyawan), penanggung jawab, realisasi nota, dan pelunasan sisa dana.
            </p>
          </div>
        </div>

        {loading ? (
          <div className="p-10 text-center text-slate-400 text-xs">Memuat data pemasukan &amp; kas kantor...</div>
        ) : filteredKasList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium text-slate-600">Tidak ada data pemasukan kas kantor yang sesuai.</p>
            <p className="text-xs text-slate-400 mt-1">
              Klik tombol &quot;+ Catat Pemasukan Kas Kantor&quot; untuk menambahkan pemasukan dan menetapkan penanggung jawab.
            </p>
          </div>
        ) : (
          <div
            role="region"
            tabIndex={0}
            aria-labelledby="tabel-buku-kas-heading"
            className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500/30"
          >
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Tanggal &amp; ID</th>
                  <th className="py-3 px-3">Penanggung Jawab</th>
                  <th className="py-3 px-3">Proyek &amp; Keterangan</th>
                  <th className="py-3 px-3 text-right">Dana Masuk</th>
                  <th className="py-3 px-3 text-right">Terpakai</th>
                  <th className="py-3 px-3 text-right">Sisa Disetor</th>
                  <th className="py-3 px-3 text-right">Sisa Tanggungan</th>
                  <th className="py-3 px-3 text-center">Persetujuan</th>
                  <th className="py-3 px-3 text-center">Status LPJ</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredKasList.map((kas) => {
                  const statusVerif = kas.status_verifikasi || 'disetujui';
                  const isApproved = statusVerif === 'disetujui';
                  return (
                    <tr key={kas.id_kas} className="hover:bg-slate-50/70 transition">
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800">Kas #{kas.id_kas}</div>
                        <div className="text-[10px] text-slate-400">{kas.tanggal}</div>
                        <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                          kas.dibuat_oleh === 'karyawan'
                            ? 'bg-sky-50 text-sky-700 border border-sky-200'
                            : 'bg-slate-100 text-slate-600'
                        }`}>
                          {kas.dibuat_oleh === 'karyawan' ? 'Ajuan Karyawan' : 'Input Admin'}
                        </span>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        <div className="font-bold text-slate-800 flex items-center space-x-1">
                          <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span>{kas.nama_penanggung_jawab}</span>
                        </div>
                        {kas.jabatan_penanggung_jawab && (
                          <div className="text-[10px] text-slate-400">{kas.jabatan_penanggung_jawab}</div>
                        )}
                        {kas.nama_pelapor && (
                          <div className="text-[10px] text-sky-700 mt-0.5">Pelapor: {kas.nama_pelapor}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 min-w-[190px] max-w-[270px]">
                        <div className="font-semibold text-slate-800">{kas.nama_pekerjaan || 'Dana Operasional Umum Kantor'}</div>
                        <div className="text-[11px] text-slate-500 leading-snug">{kas.keterangan || '-'}</div>
                        {kas.catatan_admin && (
                          <div className="text-[10px] text-slate-600 bg-slate-100 px-2 py-0.5 rounded mt-1 italic">
                            Catatan Admin: {kas.catatan_admin}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-blue-700 whitespace-nowrap">
                        {formatRupiah(kas.nominal_masuk)}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <div className="font-bold text-emerald-700">{formatRupiah(kas.total_terpakai_disetujui)}</div>
                        {kas.total_terpakai_menunggu > 0 && (
                          <div className="text-[10px] text-amber-600">Antre: {formatRupiah(kas.total_terpakai_menunggu)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-medium text-slate-700 whitespace-nowrap">
                        {formatRupiah(kas.total_dikembalikan)}
                        {kas.menunggu_konfirmasi_kembali > 0 && (
                          <div className="text-[10px] text-sky-600">Antre: {formatRupiah(kas.menunggu_konfirmasi_kembali)}</div>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right whitespace-nowrap">
                        <span className={`font-extrabold ${isApproved ? (kas.sisa_resmi > 0 ? 'text-amber-600' : 'text-emerald-600') : 'text-slate-400'}`}>
                          {isApproved ? formatRupiah(kas.sisa_resmi) : '-'}
                        </span>
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {statusVerif === 'disetujui' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            Disetujui
                          </span>
                        ) : statusVerif === 'ditolak' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200">
                            Ditolak
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            Menunggu Cek
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {!isApproved ? (
                          <span className="text-[11px] text-slate-400">-</span>
                        ) : kas.status_lpj === 'selesai' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200">
                            ✓ Selesai (Klir)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                            Berjalan
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center space-x-1">
                          {statusVerif !== 'disetujui' && (
                            <button
                              type="button"
                              onClick={() => handleOpenVerifikasiModal(kas)}
                              title="Cek & Setujui / Tolak Pemasukan Kas"
                              className="px-2 py-1 rounded-lg border border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-600 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            >
                              Verifikasi
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setSelectedKasDetail(kas)}
                            title="Lihat Rincian Mutasi & Kuitansi LPJ"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isApproved && kas.sisa_resmi > 0 && (
                            <button
                              type="button"
                              onClick={() => handleOpenTerimaSisa(kas)}
                              title="Catat Penerimaan Pengembalian Sisa Dana"
                              className="px-2 py-1 rounded-lg border border-emerald-300 bg-emerald-50 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[10px] font-bold transition cursor-pointer"
                            >
                              Terima Sisa
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleOpenEditKas(kas)}
                            title="Edit Pemasukan Kas"
                            className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteKas(kas)}
                            title="Hapus Catatan Kas"
                            className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal Verifikasi Pemasukan Kas Karyawan */}
      <Modal
        isOpen={!!verifikasiTarget}
        onClose={() => setVerifikasiTarget(null)}
        title={verifikasiTarget ? `Verifikasi Pemasukan Kas #${verifikasiTarget.id_kas}` : 'Verifikasi Pemasukan'}
        maxWidth="max-w-lg"
      >
        {verifikasiTarget && (
          <div className="space-y-4">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Nominal Pemasukan</span>
                <strong className="text-base font-extrabold text-blue-700">{formatRupiah(verifikasiTarget.nominal_masuk)}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Penanggung Jawab</span>
                <strong className="text-slate-900">{verifikasiTarget.nama_penanggung_jawab}</strong>
              </div>
              {verifikasiTarget.nama_pelapor && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Pelapor</span>
                  <span className="font-semibold text-slate-800">{verifikasiTarget.nama_pelapor}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Proyek</span>
                <span className="font-semibold text-slate-800">{verifikasiTarget.nama_pekerjaan || 'Dana Kantor Umum'}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Tanggal</span>
                <span className="font-semibold text-slate-800">{verifikasiTarget.tanggal}</span>
              </div>
              {verifikasiTarget.keterangan && (
                <div className="pt-1.5 border-t border-slate-200 text-slate-600">
                  <span className="font-semibold text-slate-500 block">Keterangan:</span>
                  {verifikasiTarget.keterangan}
                </div>
              )}
            </div>

            {verifikasiTarget.bukti_serah ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-1.5">
                <div className="text-[11px] font-bold text-slate-600 px-1">Foto Bukti Transfer / Penyerahan:</div>
                <img
                  src={getImageUrl(verifikasiTarget.bukti_serah)}
                  alt="Bukti Pemasukan Kas Kantor"
                  className="w-full max-h-56 object-contain rounded-lg bg-white border border-slate-100"
                />
                <a
                  href={getImageUrl(verifikasiTarget.bukti_serah)}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center space-x-1 text-[11px] font-bold text-blue-600 hover:underline px-1"
                >
                  <ExternalLink className="w-3 h-3" />
                  <span>Buka ukuran penuh</span>
                </a>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center text-xs text-slate-400">
                Tidak ada lampiran foto bukti serah terima.
              </div>
            )}

            <div>
              <label htmlFor="admin-verifikasi-kas-catatan" className="block text-xs font-bold text-slate-700 mb-1.5">
                Catatan Admin (Opsional / Alasan Jika Ditolak)
              </label>
              <textarea
                id="admin-verifikasi-kas-catatan"
                rows={2}
                value={catatanAdmin}
                onChange={(e) => setCatatanAdmin(e.target.value)}
                placeholder="Contoh: Dana terverifikasi masuk / Lampiran bukti kurang jelas..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setVerifikasiTarget(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Tutup
              </button>
              <div className="flex items-center space-x-2">
                <button
                  type="button"
                  disabled={verifikasiSubmitting}
                  onClick={() => handleVerifikasiKas(verifikasiTarget.id_kas, 'ditolak')}
                  className="px-4 py-2 rounded-xl bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 disabled:opacity-60 text-xs font-bold transition inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Tolak Pemasukan</span>
                </button>
                <button
                  type="button"
                  disabled={verifikasiSubmitting}
                  onClick={() => handleVerifikasiKas(verifikasiTarget.id_kas, 'disetujui')}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition shadow-sm inline-flex items-center space-x-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>{verifikasiSubmitting ? 'Memproses...' : 'Setujui Pemasukan'}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Modal Catat / Edit Penyerahan Dana Kantor (Kas) */}
      <Modal
        isOpen={isKasModalOpen}
        onClose={() => setIsKasModalOpen(false)}
        title={editingKasId ? 'Edit Penyerahan Dana Kantor & PJ' : 'Catat Pemasukan Kas Kantor & PJ'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmitKas} noValidate className="space-y-4">
          {kasModalError && (
            <div
              id="admin-kas-error"
              role="alert"
              className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{kasModalError}</span>
            </div>
          )}

          <div>
            <label htmlFor="admin-kas-pj" className="block text-xs font-bold text-slate-700 mb-1.5">
              Penanggung Jawab Dana Kantor *
            </label>
            <select
              id="admin-kas-pj"
              required
              value={kasFormPjId}
              onChange={(e) => {
                setKasFormPjId(e.target.value);
                if (kasModalError) setKasModalError('');
              }}
              aria-invalid={Boolean(kasModalError && !kasFormPjId)}
              aria-describedby={kasModalError && !kasFormPjId ? 'admin-kas-error' : undefined}
              className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                kasModalError && !kasFormPjId
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:ring-blue-500/20'
              }`}
            >
              <option value="" disabled>-- Pilih Penanggung Jawab --</option>
              {pekerjaList.map((w) => (
                <option key={w.id_karyawan} value={String(w.id_karyawan)}>
                  {w.nama}{w.jabatan ? ` (${w.jabatan})` : ''}
                </option>
              ))}
            </select>
            <p className="text-[11px] text-slate-500 mt-1">
              Hanya nama penanggung jawab ini yang akan muncul sebagai pilihan saat karyawan memakai Uang Kantor.
            </p>
          </div>

          <div>
            <label htmlFor="admin-kas-job" className="block text-xs font-bold text-slate-700 mb-1.5">
              Alokasi Proyek (Opsional)
            </label>
            <select
              id="admin-kas-job"
              value={kasFormJobId}
              onChange={(e) => setKasFormJobId(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Dana Kantor Umum (Lintas Proyek)</option>
              {pekerjaanList.map((j) => (
                <option key={j.id_pekerjaan} value={String(j.id_pekerjaan)}>
                  {j.nama_pekerjaan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="admin-kas-tanggal" className="block text-xs font-bold text-slate-700 mb-1.5">
                Tanggal Penyerahan *
              </label>
              <input
                id="admin-kas-tanggal"
                type="date"
                required
                value={kasFormTanggal}
                onChange={(e) => setKasFormTanggal(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="admin-kas-nominal" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nominal Dana Masuk (Rp) *
              </label>
              <input
                id="admin-kas-nominal"
                type="number"
                min="1"
                required
                value={kasFormNominal}
                onChange={(e) => {
                  setKasFormNominal(e.target.value);
                  if (kasModalError) setKasModalError('');
                }}
                aria-invalid={Boolean(kasModalError && (!kasFormNominal || Number(kasFormNominal) <= 0))}
                aria-describedby={kasModalError && (!kasFormNominal || Number(kasFormNominal) <= 0) ? 'admin-kas-error' : undefined}
                placeholder="Contoh: 500000"
                className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                  kasModalError && (!kasFormNominal || Number(kasFormNominal) <= 0)
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-blue-500/20'
                }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="admin-kas-keterangan" className="block text-xs font-bold text-slate-700 mb-1.5">
              Keperluan / Catatan Penyerahan
            </label>
            <textarea
              id="admin-kas-keterangan"
              rows={2}
              value={kasFormKeterangan}
              onChange={(e) => setKasFormKeterangan(e.target.value)}
              placeholder="Contoh: Panjar operasional pembelian kabel & material jaringan"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="admin-kas-bukti" className="block text-xs font-bold text-slate-700 mb-1.5">
              Foto Bukti Transfer / Kwitansi Penyerahan (Opsional)
            </label>
            <input
              id="admin-kas-bukti"
              type="file"
              accept="image/*"
              onChange={handleKasFileChange}
              className="hidden"
            />
            {kasFormPreview ? (
              <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
                <img
                  src={kasFormPreview}
                  alt="Preview Bukti Penyerahan Dana"
                  className="w-full max-h-48 object-contain rounded-lg"
                />
                <div className="mt-2 flex items-center justify-between gap-2">
                  <label
                    htmlFor="admin-kas-bukti"
                    className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition"
                  >
                    Ganti Foto
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setKasFormFile(null);
                      setKasFormPreview('');
                    }}
                    className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                  >
                    Hapus Foto
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="admin-kas-bukti"
                className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl bg-slate-50 hover:bg-blue-50/40 cursor-pointer transition text-center"
              >
                <Wallet className="w-6 h-6 text-slate-400 mb-1.5" />
                <span className="text-xs font-bold text-slate-700">Klik untuk pilih foto bukti penyerahan</span>
                <span className="text-[11px] text-slate-400 mt-0.5">JPG, PNG, atau WebP (kompres otomatis)</span>
              </label>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsKasModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={kasSubmitting}
              className="px-5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-xs font-bold transition shadow-sm cursor-pointer"
            >
              {kasSubmitting ? 'Menyimpan...' : editingKasId ? 'Simpan Perubahan' : 'Simpan Pemasukan Kas'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Catat Penerimaan Sisa Dana Kantor oleh Admin */}
      <Modal
        isOpen={!!terimaSisaKas}
        onClose={() => setTerimaSisaKas(null)}
        title="Catat Penerimaan Pengembalian Sisa Dana"
        maxWidth="max-w-lg"
      >
        {terimaSisaKas && (
          <form onSubmit={handleSubmitTerimaSisa} noValidate className="space-y-4">
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold">Penanggung Jawab</span>
                <strong className="text-emerald-950 font-extrabold">{terimaSisaKas.nama_penanggung_jawab}</strong>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold">Dana Diserahkan</span>
                <span className="font-bold text-emerald-950">{formatRupiah(terimaSisaKas.nominal_masuk)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold">Realisasi Disetujui</span>
                <span className="font-bold text-emerald-950">{formatRupiah(terimaSisaKas.total_terpakai_disetujui)}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-emerald-800 font-semibold">Sudah Dikembalikan</span>
                <span className="font-bold text-emerald-950">{formatRupiah(terimaSisaKas.total_dikembalikan)}</span>
              </div>
              <div className="flex items-center justify-between pt-1.5 border-t border-emerald-200">
                <span className="text-emerald-900 font-bold">Sisa Tanggungan LPJ</span>
                <strong className="text-emerald-700 font-black text-sm">{formatRupiah(terimaSisaKas.sisa_resmi)}</strong>
              </div>
            </div>

            {sisaModalError && (
              <div
                id="admin-sisa-error"
                role="alert"
                className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold flex items-center space-x-2"
              >
                <AlertTriangle className="w-4 h-4 shrink-0" />
                <span>{sisaModalError}</span>
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div>
                <label htmlFor="admin-sisa-tanggal" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Tanggal Diterima *
                </label>
                <input
                  id="admin-sisa-tanggal"
                  type="date"
                  required
                  value={sisaFormTanggal}
                  onChange={(e) => setSisaFormTanggal(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>
              <div>
                <label htmlFor="admin-sisa-nominal" className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nominal Sisa Diterima (Rp) *
                </label>
                <input
                  id="admin-sisa-nominal"
                  type="number"
                  min="1"
                  required
                  value={sisaFormNominal}
                  onChange={(e) => {
                    setSisaFormNominal(e.target.value);
                    if (sisaModalError) setSisaModalError('');
                  }}
                  aria-invalid={Boolean(sisaModalError)}
                  aria-describedby={sisaModalError ? 'admin-sisa-error' : undefined}
                  className={`w-full px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                    sisaModalError
                      ? 'border-rose-400 focus:ring-rose-500/20'
                      : 'border-slate-200 focus:ring-emerald-500/20'
                  }`}
                />
              </div>
            </div>

            <div>
              <label htmlFor="admin-sisa-keterangan" className="block text-xs font-bold text-slate-700 mb-1.5">
                Catatan Penerimaan Sisa
              </label>
              <textarea
                id="admin-sisa-keterangan"
                rows={2}
                value={sisaFormKeterangan}
                onChange={(e) => setSisaFormKeterangan(e.target.value)}
                placeholder="Contoh: Diterima tunai sisa uang operasional lapangan"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
              />
            </div>

            <div>
              <label htmlFor="admin-sisa-bukti" className="block text-xs font-bold text-slate-700 mb-1.5">
                Foto Bukti Pengembalian / Transfer (Opsional)
              </label>
              <input
                id="admin-sisa-bukti"
                type="file"
                accept="image/*"
                onChange={handleSisaFileChange}
                className="hidden"
              />
              {sisaFormPreview ? (
                <div className="relative rounded-xl border border-slate-200 bg-slate-50 p-2">
                  <img
                    src={sisaFormPreview}
                    alt="Preview Bukti Sisa Dana"
                    className="w-full max-h-44 object-contain rounded-lg"
                  />
                  <div className="mt-2 flex items-center justify-between gap-2">
                    <label
                      htmlFor="admin-sisa-bukti"
                      className="cursor-pointer px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 rounded-lg text-xs font-bold text-slate-700 transition"
                    >
                      Ganti Foto
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setSisaFormFile(null);
                        setSisaFormPreview('');
                      }}
                      className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded-lg text-xs font-bold transition"
                    >
                      Hapus Foto
                    </button>
                  </div>
                </div>
              ) : (
                <label
                  htmlFor="admin-sisa-bukti"
                  className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-emerald-400 rounded-xl bg-slate-50 hover:bg-emerald-50/40 cursor-pointer transition text-center"
                >
                  <RotateCcw className="w-5 h-5 text-slate-400 mb-1" />
                  <span className="text-xs font-bold text-slate-700">Pilih foto bukti pengembalian (jika ada)</span>
                </label>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setTerimaSisaKas(null)}
                className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={sisaSubmitting}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold transition shadow-sm cursor-pointer"
              >
                {sisaSubmitting ? 'Memproses...' : 'Konfirmasi & Terima Sisa'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Detail Mutasi & LPJ Dana Kantor */}
      <Modal
        isOpen={!!selectedKasDetail}
        onClose={() => setSelectedKasDetail(null)}
        title={selectedKasDetail ? `Laporan Pertanggungjawaban (LPJ) Kas #${selectedKasDetail.id_kas}` : 'Detail LPJ Kas'}
        maxWidth="max-w-4xl"
      >
        {selectedKasDetail && (() => {
          const liveKasDetail = kasData.daftar.find((k) => Number(k.id_kas) === Number(selectedKasDetail.id_kas)) || selectedKasDetail;
          const kasExpensesDetail = pengeluaranList.filter((p) => Number(p.id_kas) === Number(liveKasDetail.id_kas));
          const kasReturnsDetail = (kasData.pengembalian || []).filter((pk) => Number(pk.id_kas) === Number(liveKasDetail.id_kas));
          const isApproved = (liveKasDetail.status_verifikasi || 'disetujui') === 'disetujui';

          return (
            <div className="space-y-5">
              {/* Header Identitas Dana & PJ */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center flex-wrap gap-2">
                    <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-800 font-mono text-xs font-extrabold">
                      Kas #{liveKasDetail.id_kas}
                    </span>
                    <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                      (liveKasDetail.status_verifikasi || 'disetujui') === 'disetujui'
                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                        : liveKasDetail.status_verifikasi === 'ditolak'
                        ? 'bg-rose-100 text-rose-800 border border-rose-200'
                        : 'bg-amber-100 text-amber-800 border border-amber-200'
                    }`}>
                      {(liveKasDetail.status_verifikasi || 'disetujui') === 'disetujui'
                        ? 'DISETUJUI'
                        : liveKasDetail.status_verifikasi === 'ditolak'
                        ? 'DITOLAK'
                        : 'MENUNGGU PERSETUJUAN'}
                    </span>
                    {isApproved && (
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-extrabold ${
                        liveKasDetail.status_lpj === 'selesai'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-sky-100 text-sky-800 border border-sky-200'
                      }`}>
                        {liveKasDetail.status_lpj === 'selesai' ? 'LPJ SELESAI (KLOP)' : 'LPJ BERJALAN'}
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-extrabold text-slate-900">
                    Penanggung Jawab: {liveKasDetail.nama_penanggung_jawab}
                  </h3>
                  <p className="text-xs text-slate-600">
                    {liveKasDetail.nama_pekerjaan || 'Dana Kantor Umum (Lintas Proyek)'} • Tgl: {liveKasDetail.tanggal}
                    {liveKasDetail.nama_pelapor ? ` • Dilaporkan oleh ${liveKasDetail.nama_pelapor}` : ''}
                  </p>
                  {liveKasDetail.keterangan && (
                    <p className="text-xs text-slate-500 italic">&quot;{liveKasDetail.keterangan}&quot;</p>
                  )}
                </div>

                {liveKasDetail.bukti_serah && (
                  <a
                    href={getImageUrl(liveKasDetail.bukti_serah)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center space-x-1.5 px-3 py-2 bg-white hover:bg-blue-50 border border-blue-200 text-blue-700 rounded-xl text-xs font-bold transition shrink-0 shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Lihat Bukti Serah Dana</span>
                  </a>
                )}
              </div>

              {/* 4 KPI LPJ */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="p-3 rounded-xl bg-blue-50/70 border border-blue-200">
                  <div className="text-[10px] font-bold uppercase text-blue-700">Dana Diserahkan</div>
                  <div className="text-base font-black text-blue-950 mt-0.5">{formatRupiah(liveKasDetail.nominal_masuk)}</div>
                </div>
                <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                  <div className="text-[10px] font-bold uppercase text-slate-500">Terpakai (Disetujui)</div>
                  <div className="text-base font-black text-slate-900 mt-0.5">{formatRupiah(liveKasDetail.total_terpakai_disetujui)}</div>
                  {Number(liveKasDetail.total_terpakai_menunggu) > 0 && (
                    <div className="text-[10px] text-amber-700 font-semibold mt-0.5">
                      +{formatRupiah(liveKasDetail.total_terpakai_menunggu)} menunggu
                    </div>
                  )}
                </div>
                <div className="p-3 rounded-xl bg-emerald-50/70 border border-emerald-200">
                  <div className="text-[10px] font-bold uppercase text-emerald-700">Sisa Dikembalikan</div>
                  <div className="text-base font-black text-emerald-900 mt-0.5">{formatRupiah(liveKasDetail.total_dikembalikan)}</div>
                </div>
                <div className={`p-3 rounded-xl border ${
                  Number(liveKasDetail.sisa_resmi) > 0
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-emerald-50 border-emerald-200'
                }`}>
                  <div className="text-[10px] font-bold uppercase text-slate-600">Sisa Tanggungan</div>
                  <div className={`text-base font-black mt-0.5 ${
                    Number(liveKasDetail.sisa_resmi) > 0 ? 'text-amber-700' : 'text-emerald-700'
                  }`}>
                    {formatRupiah(liveKasDetail.sisa_resmi)}
                  </div>
                </div>
              </div>

              {/* Daftar Nota Pengeluaran dari Kas Ini */}
              <div className="space-y-2">
                <h4 id="lpj-detail-nota-heading" className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <Receipt className="w-4 h-4 text-blue-600" />
                  <span>Rincian Pengeluaran ({kasExpensesDetail.length} Nota)</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {kasExpensesDetail.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-500 bg-slate-50/50">
                      Belum ada nota pengeluaran yang menggunakan alokasi dana kas ini.
                    </div>
                  ) : (
                    <div
                      role="region"
                      tabIndex={0}
                      aria-labelledby="lpj-detail-nota-heading"
                      className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                    >
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 text-slate-600 uppercase text-[10px] font-bold border-b border-slate-200">
                          <tr>
                            <th className="px-3.5 py-2.5">Tgl &amp; Pembelanja</th>
                            <th className="px-3.5 py-2.5">Proyek</th>
                            <th className="px-3.5 py-2.5">Keterangan</th>
                            <th className="px-3.5 py-2.5 text-right">Nominal</th>
                            <th className="px-3.5 py-2.5 text-center">Status</th>
                            <th className="px-3.5 py-2.5 text-center">Aksi</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {kasExpensesDetail.map((p) => (
                            <tr key={p.id_pengeluaran} className="hover:bg-slate-50/80">
                              <td className="px-3.5 py-2.5 whitespace-nowrap">
                                <div className="font-bold text-slate-800">{p.nama_karyawan}</div>
                                <div className="text-[10px] text-slate-500">{p.tanggal}</div>
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-700 font-medium">
                                {p.nama_pekerjaan || '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-slate-600 max-w-xs">
                                {p.keterangan || '-'}
                              </td>
                              <td className="px-3.5 py-2.5 text-right font-extrabold text-slate-900 whitespace-nowrap">
                                {formatRupiah(p.nominal)}
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  p.status_verifikasi === 'disetujui'
                                    ? 'bg-emerald-100 text-emerald-700'
                                    : p.status_verifikasi === 'ditolak'
                                    ? 'bg-rose-100 text-rose-700'
                                    : 'bg-amber-100 text-amber-700'
                                }`}>
                                  {p.status_verifikasi}
                                </span>
                              </td>
                              <td className="px-3.5 py-2.5 text-center whitespace-nowrap">
                                <div className="inline-flex items-center space-x-1">
                                  <button
                                    type="button"
                                    onClick={() => setSelectedNotaPreview(p)}
                                    className="px-2 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] transition cursor-pointer"
                                  >
                                    Nota
                                  </button>
                                  {p.status_verifikasi === 'menunggu' && (
                                    <>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifikasiNota(p.id_pengeluaran, 'disetujui')}
                                        title="Setujui Nota"
                                        className="p-1 rounded-lg bg-emerald-100 hover:bg-emerald-200 text-emerald-700 transition cursor-pointer"
                                      >
                                        <Check className="w-3.5 h-3.5" />
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => handleVerifikasiNota(p.id_pengeluaran, 'ditolak')}
                                        title="Tolak Nota"
                                        className="p-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 transition cursor-pointer"
                                      >
                                        <XCircle className="w-3.5 h-3.5" />
                                      </button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>

              {/* Riwayat Setoran Sisa Dana */}
              <div className="space-y-2">
                <h4 className="text-xs font-extrabold text-slate-800 uppercase tracking-wider flex items-center space-x-1.5">
                  <RotateCcw className="w-4 h-4 text-emerald-600" />
                  <span>Riwayat Pengembalian Sisa Dana ({kasReturnsDetail.length})</span>
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  {kasReturnsDetail.length === 0 ? (
                    <div className="p-4 text-center text-xs text-slate-500 bg-slate-50/50">
                      Belum ada riwayat pengembalian sisa dana untuk kas ini.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100">
                      {kasReturnsDetail.map((pk) => (
                        <div key={pk.id_pengembalian} className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs bg-white">
                          <div className="space-y-0.5">
                            <div className="flex items-center space-x-2">
                              <strong className="text-slate-900 font-extrabold">{formatRupiah(pk.nominal)}</strong>
                              <span className="text-slate-400">•</span>
                              <span className="text-slate-600">{pk.tanggal}</span>
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                pk.status_konfirmasi === 'diterima'
                                  ? 'bg-emerald-100 text-emerald-700'
                                  : pk.status_konfirmasi === 'ditolak'
                                  ? 'bg-rose-100 text-rose-700'
                                  : 'bg-amber-100 text-amber-700'
                              }`}>
                                {pk.status_konfirmasi}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500">
                              Pelapor: {pk.nama_penyetor || liveKasDetail.nama_penanggung_jawab}
                              {pk.keterangan ? ` — ${pk.keterangan}` : ''}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            {pk.bukti_foto && (
                              <a
                                href={getImageUrl(pk.bukti_foto)}
                                target="_blank"
                                rel="noreferrer"
                                className="px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[11px] transition"
                              >
                                Bukti
                              </a>
                            )}
                            {pk.status_konfirmasi === 'menunggu' && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleKonfirmasiPengembalian(pk.id_pengembalian, 'diterima')}
                                  className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[11px] transition cursor-pointer"
                                >
                                  Terima
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleKonfirmasiPengembalian(pk.id_pengembalian, 'ditolak')}
                                  className="px-2.5 py-1 rounded-lg bg-rose-100 hover:bg-rose-200 text-rose-700 font-bold text-[11px] transition cursor-pointer"
                                >
                                  Tolak
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Footer Modal Mutasi LPJ */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-slate-200">
                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold transition shadow-xs cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Cetak LPJ</span>
                  </button>
                  {isApproved && Number(liveKasDetail.sisa_resmi) > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = liveKasDetail;
                        setSelectedKasDetail(null);
                        handleOpenTerimaSisa(target);
                      }}
                      className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm cursor-pointer"
                    >
                      <RotateCcw className="w-3.5 h-3.5" />
                      <span>Terima Setoran Sisa</span>
                    </button>
                  )}
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedKasDetail(null)}
                  className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>

      {/* Modal Preview Foto Nota dari LPJ */}
      <Modal
        isOpen={!!selectedNotaPreview}
        onClose={() => setSelectedNotaPreview(null)}
        title="Foto Nota Pengeluaran Terkait"
        maxWidth="max-w-lg"
      >
        {selectedNotaPreview && (
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="font-bold text-slate-800">{selectedNotaPreview.nama_karyawan}</div>
                <div className="text-slate-500">{selectedNotaPreview.tanggal} • {selectedNotaPreview.nama_pekerjaan}</div>
              </div>
              <strong className="text-sm text-slate-900">{formatRupiah(selectedNotaPreview.nominal)}</strong>
            </div>
            <p className="text-slate-600">{selectedNotaPreview.keterangan || '-'}</p>
            {selectedNotaPreview.foto_kwitansi ? (
              <img
                src={getImageUrl(selectedNotaPreview.foto_kwitansi)}
                alt="Bukti Kuitansi"
                className="w-full max-h-96 object-contain rounded-xl border border-slate-200 bg-slate-50"
              />
            ) : (
              <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                Tidak ada foto bukti kuitansi.
              </div>
            )}
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedNotaPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

