import React, { useState, useEffect, useMemo } from 'react';
import {
  Wallet,
  Plus,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
  AlertTriangle,
  Send,
  RotateCcw,
  Edit3,
  Trash2,
  Eye,
  Upload,
  UserCheck,
  Receipt,
  Search
} from 'lucide-react';
import { PengeluaranService, PekerjaanService, PekerjaService } from '../../services/api';
import { compressImage } from '../../utils/imageCompressor';
import Modal from '../../components/Modal';

export default function PemasukanKaryawanPage({ currentUser }) {
  const [kasSayaList, setKasSayaList] = useState([]);
  const [pengembalianSaya, setPengembalianSaya] = useState([]);
  const [pengeluaranTimList, setPengeluaranTimList] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Single-row tab view: 'ajuan' | 'lpj'
  const [activeTab, setActiveTab] = useState('ajuan');
  const [filterStatus, setFilterStatus] = useState('semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Modal Ajukan / Edit Pemasukan Kas Kantor
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingKasId, setEditingKasId] = useState(null);
  const [formPjId, setFormPjId] = useState('');
  const [formJobId, setFormJobId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formNominal, setFormNominal] = useState('');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [formFile, setFormFile] = useState(null);
  const [formPreview, setFormPreview] = useState('');
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Modal Setor Sisa Dana Kantor (LPJ)
  const [setorModalKas, setSetorModalKas] = useState(null);
  const [setorNominal, setSetorNominal] = useState('');
  const [setorTanggal, setSetorTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [setorKeterangan, setSetorKeterangan] = useState('');
  const [setorFile, setSetorFile] = useState(null);
  const [setorPreview, setSetorPreview] = useState('');
  const [setorError, setSetorError] = useState('');
  const [setorSubmitting, setSetorSubmitting] = useState(false);

  // Modal Detail Rincian Belanja Tim untuk Kas PJ saya
  const [detailKasPj, setDetailKasPj] = useState(null);

  const kId = Number(currentUser?.id_karyawan || 0);

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
      const [kasRes, jobs, workers, expenses] = await Promise.all([
        PengeluaranService.getKasTersedia(kId),
        PekerjaanService.getAll(),
        PekerjaService.getAll(),
        PengeluaranService.getAll({ jenis_dana: 'kantor', include_kas_pj: 1 })
      ]);

      setKasSayaList(kasRes?.kas_tanggung_jawab_saya || []);
      setPengembalianSaya(kasRes?.pengembalian_saya || []);
      setPekerjaanList(jobs || []);
      setPekerjaList(workers || []);
      setPengeluaranTimList(expenses || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data pemasukan & kas kantor.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Derived data
  const pendingCount = useMemo(
    () => kasSayaList.filter((k) => (k.status_verifikasi || 'disetujui') === 'menunggu').length,
    [kasSayaList]
  );

  const approvedPjList = useMemo(
    () => kasSayaList.filter((k) => Number(k.id_karyawan) === kId && (k.status_verifikasi || 'disetujui') === 'disetujui'),
    [kasSayaList, kId]
  );

  const activeLpjList = useMemo(
    () => approvedPjList.filter((k) => k.status_lpj === 'berjalan'),
    [approvedPjList]
  );

  const totalSisaTanggungJawab = useMemo(
    () => approvedPjList.reduce((sum, k) => sum + (Number(k.sisa_resmi) || 0), 0),
    [approvedPjList]
  );

  const filteredAjuanList = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return kasSayaList.filter((k) => {
      const st = k.status_verifikasi || 'disetujui';
      if (filterStatus !== 'semua' && st !== filterStatus) return false;
      if (q) {
        const match =
          (k.nama_penanggung_jawab || '').toLowerCase().includes(q) ||
          (k.nama_pekerjaan || '').toLowerCase().includes(q) ||
          (k.keterangan || '').toLowerCase().includes(q) ||
          `kas #${k.id_kas}`.includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [kasSayaList, filterStatus, searchQuery]);

  // Modal Create / Edit handlers
  const handleOpenCreate = () => {
    setEditingKasId(null);
    setFormPjId(kId ? String(kId) : '');
    setFormJobId('');
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setFormNominal('');
    setFormKeterangan('');
    setFormFile(null);
    setFormPreview('');
    setFormError('');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (kas) => {
    setEditingKasId(kas.id_kas);
    setFormPjId(String(kas.id_karyawan));
    setFormJobId(kas.id_pekerjaan ? String(kas.id_pekerjaan) : '');
    setFormTanggal(kas.tanggal);
    setFormNominal(String(kas.nominal_masuk));
    setFormKeterangan(kas.keterangan || '');
    setFormFile(null);
    setFormPreview(kas.bukti_serah ? getImageUrl(kas.bukti_serah) : '');
    setFormError('');
    setSubmitting(false);
    setIsModalOpen(true);
  };

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setFormError('Format file bukti harus berupa gambar (JPG, PNG, atau WebP).');
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setFormFile(compressed);
      setFormPreview(URL.createObjectURL(compressed));
    } catch {
      setFormFile(file);
      setFormPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmitPemasukan = async (e) => {
    e.preventDefault();
    setFormError('');

    if (!formPjId) {
      setFormError('Wajib memilih Penanggung Jawab dana kantor.');
      document.getElementById('emp-kas-pj')?.focus();
      return;
    }
    if (!formNominal || Number(formNominal) <= 0) {
      setFormError('Nominal pemasukan wajib lebih dari Rp 0.');
      document.getElementById('emp-kas-nominal')?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      if (formJobId) fd.append('id_pekerjaan', formJobId);
      fd.append('id_karyawan', formPjId);
      fd.append('tanggal', formTanggal);
      fd.append('nominal_masuk', formNominal);
      fd.append('keterangan', formKeterangan);
      if (formFile) {
        fd.append('bukti_serah', formFile);
      }

      if (editingKasId) {
        fd.append('id_kas', editingKasId);
        await PengeluaranService.updateKas(editingKasId, fd);
        showSuccess('Pengajuan pemasukan kas diperbarui & dikirim ulang untuk persetujuan Admin.');
      } else {
        await PengeluaranService.createKas(fd);
        showSuccess('Laporan pemasukan uang kantor berhasil diajukan! Menunggu pengecekan & persetujuan Admin.');
      }
      setIsModalOpen(false);
      setActiveTab('ajuan');
      loadData();
    } catch (err) {
      setFormError(err.message || 'Gagal mengirim pengajuan pemasukan kas.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteAjuan = async (kas) => {
    if (!window.confirm(`Hapus pengajuan pemasukan Kas #${kas.id_kas} (${formatRupiah(kas.nominal_masuk)})?`)) {
      return;
    }
    try {
      await PengeluaranService.deleteKas(kas.id_kas, false);
      showSuccess('Pengajuan pemasukan kas berhasil dihapus.');
      loadData();
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus pengajuan pemasukan kas.');
    }
  };

  // Handler Setor / Kembalikan Sisa Dana Kantor
  const handleOpenSetorModal = (kas) => {
    const maks = Math.max(0, Number(kas.sisa_resmi || 0) - Number(kas.menunggu_konfirmasi_kembali || 0));
    setSetorModalKas({ ...kas, maksSetor: maks });
    setSetorNominal(maks > 0 ? String(maks) : '');
    setSetorTanggal(new Date().toISOString().slice(0, 10));
    setSetorKeterangan(`Pengembalian sisa dana ${kas.nama_pekerjaan || 'operasional'}`);
    setSetorFile(null);
    setSetorPreview('');
    setSetorError('');
    setSetorSubmitting(false);
  };

  const handleSetorFileChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setSetorError('File bukti pengembalian harus berupa gambar.');
      return;
    }
    try {
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setSetorFile(compressed);
      setSetorPreview(URL.createObjectURL(compressed));
    } catch {
      setSetorFile(file);
      setSetorPreview(URL.createObjectURL(file));
    }
    e.target.value = '';
  };

  const handleSubmitSetorSisa = async (e) => {
    e.preventDefault();
    if (!setorModalKas) return;
    setSetorError('');

    const nom = Number(setorNominal);
    if (!nom || nom <= 0) {
      setSetorError('Nominal pengembalian sisa harus lebih dari Rp 0.');
      document.getElementById('emp-setor-nominal')?.focus();
      return;
    }
    if (nom > setorModalKas.maksSetor + 0.01) {
      setSetorError(`Nominal melebihi batas sisa yang dapat disetor (${formatRupiah(setorModalKas.maksSetor)}).`);
      document.getElementById('emp-setor-nominal')?.focus();
      return;
    }

    setSetorSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('id_kas', setorModalKas.id_kas);
      fd.append('tanggal', setorTanggal);
      fd.append('nominal', nom);
      fd.append('keterangan', setorKeterangan);
      if (setorFile) {
        fd.append('bukti_foto', setorFile);
      }
      await PengeluaranService.setorSisaKas(fd);
      showSuccess('Pengajuan pengembalian sisa dana dikirim ke Admin untuk dikonfirmasi!');
      setSetorModalKas(null);
      loadData();
    } catch (err) {
      setSetorError(err.message || 'Gagal mengirim pengajuan pengembalian sisa dana.');
    } finally {
      setSetorSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
            <span>Kas Operasional &amp; LPJ</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Wallet className="w-7 h-7 text-blue-600" />
            <span>Pemasukan &amp; Kas Kantor</span>
          </h1>
          <p className="text-sm text-slate-500">
            Ajukan laporan penerimaan dana kantor untuk disetujui Admin dan kelola pertanggungjawaban sisa dana Anda.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
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
            onClick={handleOpenCreate}
            className="flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-xs shadow-md transition cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Ajukan Pemasukan Kas</span>
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

      {/* 3 KPI Cards Khusus Akun Karyawan */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Menunggu Cek Admin</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {pendingCount} <span className="text-xs font-normal text-amber-700">Laporan</span>
          </div>
          <div className="text-[11px] text-amber-700 mt-1">Pemasukan aktif di Uang Kantor setelah disetujui Admin</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Kas Aktif Saya (LPJ)</div>
          <div className="text-2xl font-extrabold text-blue-700 mt-1">
            {activeLpjList.length} <span className="text-xs font-normal text-blue-600">Paket Berjalan</span>
          </div>
          <div className="text-[11px] text-blue-600 mt-1">Dari total {approvedPjList.length} pemasukan yang disetujui</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sisa Tanggung Jawab Saya</div>
          <div className="text-2xl font-extrabold text-emerald-700 mt-1">
            {formatRupiah(totalSisaTanggungJawab)}
          </div>
          <div className="text-[11px] text-emerald-700 mt-1">Saldo LPJ resmi yang belum disetor/dipakai</div>
        </div>
      </div>

      {/* Single-row Tablist */}
      <div role="tablist" aria-label="Menu Pemasukan dan Kas Karyawan" className="flex flex-nowrap overflow-x-auto border-b border-slate-200 gap-x-6 text-sm font-bold">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ajuan'}
          onClick={() => setActiveTab('ajuan')}
          className={`pb-3 border-b-2 flex items-center space-x-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'ajuan' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Pengajuan &amp; Status Pemasukan ({kasSayaList.length})</span>
          {pendingCount > 0 && (
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-800">
              {pendingCount}
            </span>
          )}
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'lpj'}
          onClick={() => setActiveTab('lpj')}
          className={`pb-3 border-b-2 flex items-center space-x-2 whitespace-nowrap shrink-0 transition cursor-pointer ${
            activeTab === 'lpj' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Wallet className="w-4 h-4" />
          <span>Pertanggungjawaban Saya &amp; Setor Sisa ({approvedPjList.length})</span>
        </button>
      </div>

      {activeTab === 'ajuan' ? (
        <div className="space-y-4">
          {/* Filter Bar */}
          <search className="block bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label htmlFor="emp-kas-search" className="block text-xs font-semibold text-slate-500 mb-1">
                  Cari Penanggung Jawab / Proyek
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    id="emp-kas-search"
                    type="search"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Nama PJ, proyek, atau keterangan..."
                    className="w-full min-h-[40px] pl-8 pr-3 py-2 text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="emp-kas-filter-status" className="block text-xs font-semibold text-slate-500 mb-1">
                  Status Persetujuan Admin
                </label>
                <select
                  id="emp-kas-filter-status"
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full min-h-[40px] text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="semua">Semua Status</option>
                  <option value="menunggu">Menunggu Cek Admin</option>
                  <option value="disetujui">Disetujui Admin</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
            </div>
          </search>

          {/* Tabel Daftar Pengajuan & Pemasukan Kas */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-slate-100">
              <h2 id="emp-ajuan-kas-heading" className="text-sm font-bold text-slate-800">
                Daftar Laporan Pemasukan Kas Kantor ({filteredAjuanList.length})
              </h2>
              <p className="text-xs text-slate-500">
                Ajuan pemasukan yang telah disetujui Admin otomatis mengaktifkan nama Penanggung Jawab di menu Pengeluaran.
              </p>
            </div>

            {loading ? (
              <div className="p-10 text-center text-slate-400 text-xs">Memuat data pemasukan kas kantor...</div>
            ) : filteredAjuanList.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium text-slate-600">Belum ada laporan pemasukan kas kantor.</p>
                <p className="text-xs text-slate-400 mt-1">Klik tombol &quot;+ Ajukan Pemasukan Kas&quot; jika Anda menerima atau melaporkan dana operasional kantor.</p>
              </div>
            ) : (
              <div
                role="region"
                tabIndex={0}
                aria-labelledby="emp-ajuan-kas-heading"
                className="overflow-x-auto focus:outline-none focus:ring-2 focus:ring-blue-500/30"
              >
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-500 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Tanggal &amp; ID</th>
                      <th className="py-3 px-4">Penanggung Jawab</th>
                      <th className="py-3 px-4">Proyek &amp; Keterangan</th>
                      <th className="py-3 px-4 text-right">Nominal Masuk</th>
                      <th className="py-3 px-4 text-center">Bukti</th>
                      <th className="py-3 px-4 text-center">Persetujuan Admin</th>
                      <th className="py-3 px-4 text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredAjuanList.map((kas) => {
                      const statusVerif = kas.status_verifikasi || 'disetujui';
                      const canModify =
                        kas.dibuat_oleh === 'karyawan' &&
                        Number(kas.id_pelapor) === kId &&
                        statusVerif !== 'disetujui';
                      return (
                        <tr key={kas.id_kas} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800">Kas #{kas.id_kas}</div>
                            <div className="text-[10px] text-slate-400">{kas.tanggal}</div>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-bold text-slate-800 flex items-center space-x-1">
                              <UserCheck className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                              <span>{kas.nama_penanggung_jawab}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">
                              {kas.dibuat_oleh === 'admin' ? 'Ditugaskan Admin' : `Dilaporkan ${kas.nama_pelapor || 'Karyawan'}`}
                            </span>
                          </td>
                          <td className="py-3 px-4 min-w-[200px] max-w-[300px]">
                            <div className="font-semibold text-slate-800">{kas.nama_pekerjaan || 'Dana Kantor Umum'}</div>
                            <div className="text-[11px] text-slate-500">{kas.keterangan || '-'}</div>
                            {kas.catatan_admin && (
                              <div className="text-[10px] text-slate-700 bg-slate-100 px-2 py-0.5 rounded mt-1 italic">
                                Catatan Admin: {kas.catatan_admin}
                              </div>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-extrabold text-blue-700 whitespace-nowrap">
                            {formatRupiah(kas.nominal_masuk)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {kas.bukti_serah ? (
                              <a
                                href={getImageUrl(kas.bukti_serah)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 text-blue-700 border border-blue-200 font-semibold text-[11px]"
                              >
                                <Eye className="w-3 h-3" />
                                <span>Lihat</span>
                              </a>
                            ) : (
                              <span className="text-[11px] text-slate-400">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {statusVerif === 'disetujui' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-700 border border-emerald-200 inline-flex items-center space-x-1">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Disetujui Admin</span>
                              </span>
                            ) : statusVerif === 'ditolak' ? (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-700 border border-rose-200 inline-flex items-center space-x-1">
                                <XCircle className="w-3 h-3" />
                                <span>Ditolak</span>
                              </span>
                            ) : (
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 inline-flex items-center space-x-1">
                                <Clock className="w-3 h-3" />
                                <span>Menunggu Cek Admin</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {canModify ? (
                              <div className="inline-flex items-center space-x-1">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEdit(kas)}
                                  title="Edit / Ajukan Ulang"
                                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 transition cursor-pointer"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAjuan(kas)}
                                  title="Hapus Pengajuan"
                                  className="p-1.5 rounded-lg border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-600 hover:text-white transition cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <span className="text-[11px] text-slate-400">
                                {statusVerif === 'disetujui' ? 'Terkunci' : '-'}
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        /* Tab Pertanggungjawaban Saya (LPJ) & Setor Sisa */
        <div className="space-y-4">
          {approvedPjList.length === 0 ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center text-slate-400 shadow-sm">
              <Wallet className="w-10 h-10 mx-auto mb-2 text-slate-300" />
              <p className="text-sm font-semibold text-slate-600">Belum ada kas kantor disetujui yang Anda pertanggungjawabkan.</p>
              <p className="text-xs text-slate-400 mt-1">
                Kas akan muncul di sini setelah pemasukan uang kantor disetujui oleh Admin dengan Anda sebagai Penanggung Jawab.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {approvedPjList.map((kas) => {
                const maksSetor = Math.max(0, Number(kas.sisa_resmi || 0) - Number(kas.menunggu_konfirmasi_kembali || 0));
                return (
                  <div key={kas.id_kas} className="bg-white rounded-2xl border border-slate-200 p-4 sm:p-5 space-y-3 shadow-sm">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[11px] font-bold text-blue-700 uppercase">
                          Kas #{kas.id_kas} • {kas.tanggal}
                        </span>
                        <h3 className="font-bold text-slate-800 text-sm">
                          {kas.nama_pekerjaan || 'Dana Operasional Umum Kantor'}
                        </h3>
                        <p className="text-xs text-slate-500">{kas.keterangan || '-'}</p>
                      </div>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold shrink-0 ${
                        kas.status_lpj === 'selesai'
                          ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {kas.status_lpj === 'selesai' ? '✓ LPJ Selesai' : 'Berjalan'}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Dana Diterima</div>
                        <div className="font-bold text-slate-800 mt-0.5">{formatRupiah(kas.nominal_masuk)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Terpakai (Tim)</div>
                        <div className="font-bold text-emerald-700 mt-0.5">{formatRupiah(kas.total_terpakai_disetujui)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="text-[10px] text-slate-500">Sudah Disetor</div>
                        <div className="font-bold text-slate-800 mt-0.5">{formatRupiah(kas.total_dikembalikan)}</div>
                      </div>
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200">
                        <div className="text-[10px] text-amber-700 font-semibold">Sisa Resmi</div>
                        <div className="font-extrabold text-amber-800 mt-0.5">{formatRupiah(kas.sisa_resmi)}</div>
                      </div>
                    </div>

                    {Number(kas.menunggu_konfirmasi_kembali) > 0 && (
                      <div className="text-[11px] text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                        Setoran sisa senilai <strong>{formatRupiah(kas.menunggu_konfirmasi_kembali)}</strong> sedang menunggu konfirmasi Admin.
                      </div>
                    )}

                    <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => setDetailKasPj(kas)}
                        className="px-3 py-1.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold inline-flex items-center space-x-1.5 cursor-pointer"
                      >
                        <Receipt className="w-3.5 h-3.5 text-blue-600" />
                        <span>Rincian Nota Tim</span>
                      </button>

                      {maksSetor > 0 && (
                        <button
                          type="button"
                          onClick={() => handleOpenSetorModal(kas)}
                          className="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold inline-flex items-center space-x-1.5 transition cursor-pointer shadow-sm"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span>Kembalikan Sisa Dana</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Riwayat Setoran Sisa Saya */}
          {pengembalianSaya.length > 0 && (
            <div className="bg-white rounded-2xl border border-slate-200 p-4 space-y-2.5 shadow-sm">
              <h3 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider flex items-center space-x-1.5">
                <RotateCcw className="w-4 h-4 text-emerald-600" />
                <span>Riwayat Setoran Sisa Dana Saya ({pengembalianSaya.length})</span>
              </h3>
              <div className="divide-y divide-slate-100 text-xs">
                {pengembalianSaya.map((pk) => (
                  <div key={pk.id_pengembalian} className="py-2.5 flex items-center justify-between gap-2">
                    <div>
                      <span className="font-bold text-slate-800">{pk.nama_pekerjaan || pk.keterangan_kas || `Kas #${pk.id_kas}`}</span>
                      <span className="text-slate-400 mx-1.5">•</span>
                      <span className="font-bold text-amber-700">{formatRupiah(pk.nominal)}</span>
                      <span className="text-[11px] text-slate-400 ml-2">({pk.tanggal})</span>
                    </div>
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
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal Ajukan / Edit Pemasukan Kas Kantor */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingKasId ? 'Edit Ajuan Pemasukan Kas Kantor' : 'Ajukan Pemasukan Uang Kantor'}
      >
        <form onSubmit={handleSubmitPemasukan} noValidate className="space-y-4">
          {formError && (
            <div
              id="emp-kas-form-error"
              role="alert"
              className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2"
            >
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-[11px] text-blue-800">
            Laporan pemasukan ini akan diperiksa dan disetujui Admin terlebih dahulu sebelum masuk ke saldo kas kantor &amp; pilihan Uang Kantor.
          </div>

          <div>
            <label htmlFor="emp-kas-pj" className="block text-xs font-bold text-slate-700 mb-1.5">
              Penanggung Jawab Dana Kantor *
            </label>
            <select
              id="emp-kas-pj"
              required
              value={formPjId}
              onChange={(e) => {
                setFormPjId(e.target.value);
                if (formError) setFormError('');
              }}
              aria-invalid={Boolean(formError && !formPjId)}
              aria-describedby={formError && !formPjId ? 'emp-kas-form-error' : undefined}
              className={`w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                formError && !formPjId
                  ? 'border-rose-400 focus:ring-rose-500/20'
                  : 'border-slate-200 focus:ring-blue-500/20'
              }`}
            >
              <option value="" disabled>-- Pilih Penanggung Jawab --</option>
              {pekerjaList.map((w) => (
                <option key={w.id_karyawan} value={String(w.id_karyawan)}>
                  {w.nama}{Number(w.id_karyawan) === kId ? ' (Saya Sendiri)' : ''}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="emp-kas-job" className="block text-xs font-bold text-slate-700 mb-1.5">
              Alokasi Proyek (Opsional)
            </label>
            <select
              id="emp-kas-job"
              value={formJobId}
              onChange={(e) => setFormJobId(e.target.value)}
              className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            >
              <option value="">Dana Operasional Umum Kantor</option>
              {pekerjaanList.map((j) => (
                <option key={j.id_pekerjaan} value={String(j.id_pekerjaan)}>
                  {j.nama_pekerjaan}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="emp-kas-tanggal" className="block text-xs font-bold text-slate-700 mb-1.5">
                Tanggal Diterima / Masuk *
              </label>
              <input
                id="emp-kas-tanggal"
                type="date"
                required
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
              />
            </div>
            <div>
              <label htmlFor="emp-kas-nominal" className="block text-xs font-bold text-slate-700 mb-1.5">
                Nominal Pemasukan (Rp) *
              </label>
              <input
                id="emp-kas-nominal"
                type="number"
                min="1"
                required
                value={formNominal}
                onChange={(e) => {
                  setFormNominal(e.target.value);
                  if (formError) setFormError('');
                }}
                aria-invalid={Boolean(formError && (!formNominal || Number(formNominal) <= 0))}
                aria-describedby={formError && (!formNominal || Number(formNominal) <= 0) ? 'emp-kas-form-error' : undefined}
                placeholder="Contoh: 500000"
                className={`w-full min-h-[44px] px-3.5 py-2.5 bg-slate-50 border rounded-xl text-sm text-slate-800 font-semibold focus:outline-none focus:ring-2 ${
                  formError && (!formNominal || Number(formNominal) <= 0)
                    ? 'border-rose-400 focus:ring-rose-500/20'
                    : 'border-slate-200 focus:ring-blue-500/20'
                }`}
              />
            </div>
          </div>

          <div>
            <label htmlFor="emp-kas-keterangan" className="block text-xs font-bold text-slate-700 mb-1.5">
              Keterangan / Sumber Pemasukan
            </label>
            <textarea
              id="emp-kas-keterangan"
              rows={2}
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              placeholder="Misal: Transfer panjar operasional lapangan dari bendahara"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
            />
          </div>

          <div>
            <label htmlFor="emp-kas-bukti" className="block text-xs font-bold text-slate-700 mb-1.5">
              Foto Bukti Transfer / Penerimaan Dana (Opsional)
            </label>
            <input
              id="emp-kas-bukti"
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
            {formPreview ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 space-y-2">
                <img src={formPreview} alt="Preview Bukti Pemasukan" className="w-full max-h-44 object-contain rounded-lg" />
                <div className="flex justify-between items-center">
                  <label
                    htmlFor="emp-kas-bukti"
                    className="cursor-pointer px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-bold text-slate-700"
                  >
                    Ganti Foto
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setFormFile(null);
                      setFormPreview('');
                    }}
                    className="px-3 py-1.5 bg-rose-50 text-rose-700 rounded-lg text-xs font-bold"
                  >
                    Hapus Foto
                  </button>
                </div>
              </div>
            ) : (
              <label
                htmlFor="emp-kas-bukti"
                className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-blue-400 rounded-xl bg-slate-50 hover:bg-blue-50/40 cursor-pointer transition text-center"
              >
                <Upload className="w-5 h-5 text-slate-400 mb-1" />
                <span className="text-xs font-bold text-slate-700">Pilih foto bukti penerimaan dana</span>
                <span className="text-[11px] text-slate-400">JPG, PNG, atau WebP</span>
              </label>
            )}
          </div>

          <div className="flex justify-end space-x-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              {submitting ? 'Mengirim...' : editingKasId ? 'Simpan & Ajukan Ulang' : 'Kirim ke Admin'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Setor / Kembalikan Sisa Dana Kantor */}
      <Modal
        isOpen={!!setorModalKas}
        onClose={() => setSetorModalKas(null)}
        title="Kembalikan Sisa Dana Kantor (LPJ)"
      >
        {setorModalKas && (
          <form onSubmit={handleSubmitSetorSisa} noValidate className="space-y-4">
            {setorError && (
              <div role="alert" className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{setorError}</span>
              </div>
            )}

            <div className="p-3.5 rounded-xl bg-blue-50/60 border border-blue-200 text-xs space-y-1">
              <div className="font-bold text-slate-800">{setorModalKas.nama_pekerjaan || 'Dana Operasional Umum Kantor'}</div>
              <div className="text-slate-600">{setorModalKas.keterangan || `Kas #${setorModalKas.id_kas}`}</div>
              <div className="pt-1 text-[11px] text-blue-800">
                Maksimal sisa dapat disetor: <strong className="font-extrabold">{formatRupiah(setorModalKas.maksSetor)}</strong>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="emp-setor-tanggal" className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Setor *</label>
                <input
                  id="emp-setor-tanggal"
                  type="date"
                  value={setorTanggal}
                  onChange={(e) => setSetorTanggal(e.target.value)}
                  className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                  required
                />
              </div>
              <div>
                <label htmlFor="emp-setor-nominal" className="block text-xs font-semibold text-slate-700 mb-1">Nominal Dikembalikan (Rp) *</label>
                <input
                  id="emp-setor-nominal"
                  type="number"
                  min="1"
                  max={setorModalKas.maksSetor}
                  value={setorNominal}
                  onChange={(e) => setSetorNominal(e.target.value)}
                  className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="emp-setor-keterangan" className="block text-xs font-semibold text-slate-700 mb-1">Keterangan Pengembalian</label>
              <input
                id="emp-setor-keterangan"
                type="text"
                value={setorKeterangan}
                onChange={(e) => setSetorKeterangan(e.target.value)}
                placeholder="Misal: Transfer BCA ke kas kantor / serah tunai ke admin"
                className="w-full min-h-[44px] text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label htmlFor="emp-setor-bukti" className="block text-xs font-semibold text-slate-700 mb-1">Bukti Transfer / Serah Terima (Opsional)</label>
              <input
                id="emp-setor-bukti"
                type="file"
                accept="image/*"
                onChange={handleSetorFileChange}
                className="block w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
              />
              {setorPreview && (
                <img src={setorPreview} alt="Preview Bukti Pengembalian" className="mt-2 max-h-32 rounded-xl border border-slate-200 object-contain" />
              )}
            </div>

            <div className="pt-2 flex justify-end space-x-2">
              <button
                type="button"
                onClick={() => setSetorModalKas(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={setorSubmitting}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition cursor-pointer"
              >
                {setorSubmitting ? 'Mengirim...' : 'Kirim Pengembalian Sisa'}
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Modal Rincian Belanja Tim untuk Paket Kas Tanggung Jawab Saya */}
      <Modal
        isOpen={!!detailKasPj}
        onClose={() => setDetailKasPj(null)}
        title={detailKasPj ? `Rincian Penggunaan Dana Kas #${detailKasPj.id_kas}` : 'Rincian Kas'}
        maxWidth="max-w-2xl"
      >
        {detailKasPj && (() => {
          const items = pengeluaranTimList.filter((pg) => Number(pg.id_kas) === Number(detailKasPj.id_kas));
          return (
            <div className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap justify-between gap-2">
                <div>
                  <div className="font-bold text-slate-800">{detailKasPj.nama_pekerjaan || 'Dana Kantor Umum'}</div>
                  <div className="text-slate-500">{detailKasPj.keterangan || '-'}</div>
                </div>
                <div className="text-right">
                  <div className="text-[11px] text-slate-500">Sisa Tanggung Jawab</div>
                  <strong className="text-sm text-amber-700">{formatRupiah(detailKasPj.sisa_resmi)}</strong>
                </div>
              </div>

              {items.length === 0 ? (
                <div className="p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl">
                  Belum ada nota pengeluaran yang memakai paket kas ini.
                </div>
              ) : (
                <div
                  role="region"
                  tabIndex={0}
                  aria-label="Tabel Nota Pengeluaran Tim"
                  className="overflow-x-auto border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500/30"
                >
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-bold border-b border-slate-200">
                      <tr>
                        <th className="px-3 py-2">Pembelanja</th>
                        <th className="px-3 py-2">Keterangan</th>
                        <th className="px-3 py-2 text-right">Nominal</th>
                        <th className="px-3 py-2 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {items.map((pg) => (
                        <tr key={pg.id_pengeluaran}>
                          <td className="px-3 py-2">
                            <div className="font-bold text-slate-800">{pg.nama_karyawan}</div>
                            <div className="text-[10px] text-slate-400">{pg.tanggal}</div>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{pg.keterangan || '-'}</td>
                          <td className="px-3 py-2 text-right font-bold text-slate-800">{formatRupiah(pg.nominal)}</td>
                          <td className="px-3 py-2 text-center">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                              pg.status_verifikasi === 'disetujui'
                                ? 'bg-emerald-100 text-emerald-700'
                                : pg.status_verifikasi === 'ditolak'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-amber-100 text-amber-700'
                            }`}>
                              {pg.status_verifikasi}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setDetailKasPj(null)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-white font-bold cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          );
        })()}
      </Modal>
    </div>
  );
}

