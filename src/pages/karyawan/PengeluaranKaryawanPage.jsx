import React, { useState, useEffect } from 'react';
import {
  Receipt,
  Plus,
  Upload,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  DollarSign,
  CreditCard,
  Building,
  Sparkles,
  RefreshCw,
  FileText,
  Edit3,
  Trash2,
  Lock
} from 'lucide-react';
import { PengeluaranService, PekerjaanService } from '../../services/api';
import { compressImage, formatBytes } from '../../utils/imageCompressor';
import Modal from '../../components/Modal';

export default function PengeluaranKaryawanPage({ currentUser }) {
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Input Pengeluaran
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formJobId, setFormJobId] = useState('');
  const [formTanggal, setFormTanggal] = useState(new Date().toISOString().slice(0, 10));
  const [formNominal, setFormNominal] = useState('');
  const [formJenisDana, setFormJenisDana] = useState('pribadi');
  const [formKeterangan, setFormKeterangan] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [filePreview, setFilePreview] = useState('');
  const [compressing, setCompressing] = useState(false);
  const [compressionStats, setCompressionStats] = useState(null);

  // Preview Modal
  const [previewImage, setPreviewImage] = useState(null);

  // Notifications
  const [errorMsg, setErrorMsg] = useState('');
  const [modalError, setModalError] = useState('');
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

  const loadData = async () => {
    setLoading(true);
    try {
      const [expenses, jobs] = await Promise.all([
        PengeluaranService.getAll({ id_karyawan: currentUser?.id_karyawan }),
        PekerjaanService.getAll(currentUser?.id_karyawan)
      ]);

      setPengeluaranList(expenses);
      setPekerjaanList(jobs);
      if (jobs.length > 0 && !formJobId) {
        setFormJobId(jobs[0].id_pekerjaan);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat catatan pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  // Handler Upload File dengan Kompresi Otomatis
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setModalError('Format file harus berupa gambar (JPG, PNG, WebP).');
      return;
    }

    setModalError('');
    setCompressing(true);
    try {
      // Kompres otomatis gambar kwitansi menggunakan Canvas API
      const compressed = await compressImage(file, { maxWidth: 1600, quality: 0.78 });
      setSelectedFile(compressed);
      setFilePreview(URL.createObjectURL(compressed));

      const savedPercent = Math.round(((file.size - compressed.size) / file.size) * 100);
      setCompressionStats({
        originalSize: formatBytes(file.size),
        compressedSize: formatBytes(compressed.size),
        savedPercent: savedPercent > 0 ? savedPercent : 0
      });
    } catch (err) {
      console.warn('Gagal kompres gambar di browser, menggunakan file asli:', err);
      setSelectedFile(file);
      setFilePreview(URL.createObjectURL(file));
      setCompressionStats(null);
    } finally {
      setCompressing(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormNominal('');
    setFormKeterangan('');
    setFormJenisDana('pribadi');
    setFormTanggal(new Date().toISOString().slice(0, 10));
    setSelectedFile(null);
    setFilePreview('');
    setCompressionStats(null);
    setModalError('');
  };

  const handleOpenCreateModal = () => {
    resetForm();
    if (pekerjaanList.length > 0) {
      setFormJobId(pekerjaanList[0].id_pekerjaan);
    }
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (p) => {
    if (p.status_verifikasi === 'disetujui' || p.status_ganti === 'sudah') {
      alert('Pengeluaran yang telah diverifikasi (disetujui) atau sudah diganti tidak dapat diubah untuk mencegah risiko kecurangan.');
      return;
    }
    setEditingId(p.id_pengeluaran);
    setFormJobId(p.id_pekerjaan);
    setFormTanggal(p.tanggal);
    setFormNominal(p.nominal);
    setFormJenisDana(p.jenis_dana);
    setFormKeterangan(p.keterangan || '');
    setSelectedFile(null);
    setFilePreview(p.foto_kwitansi ? getImageUrl(p.foto_kwitansi) : '');
    setCompressionStats(null);
    setModalError('');
    setIsModalOpen(true);
  };

  const handleDelete = async (p) => {
    if (p.status_verifikasi === 'disetujui' || p.status_ganti === 'sudah') {
      alert('Pengeluaran yang telah diverifikasi (disetujui) atau sudah diganti tidak dapat dihapus.');
      return;
    }
    if (!window.confirm('Apakah Anda yakin ingin menghapus catatan pengeluaran ini?')) {
      return;
    }
    try {
      await PengeluaranService.delete(p.id_pengeluaran);
      setSuccessMsg('Catatan pengeluaran berhasil dihapus!');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal menghapus catatan pengeluaran');
      setTimeout(() => setErrorMsg(''), 4000);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setModalError('');

    if (!formNominal || Number(formNominal) <= 0) {
      setModalError('Nominal pengeluaran harus lebih besar dari 0');
      return;
    }

    if (!formJobId) {
      setModalError('Pilih proyek pekerjaan terkait');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('id_pekerjaan', formJobId);
      formData.append('id_karyawan', currentUser?.id_karyawan);
      formData.append('tanggal', formTanggal);
      formData.append('nominal', formNominal);
      formData.append('jenis_dana', formJenisDana);
      formData.append('keterangan', formKeterangan);
      if (selectedFile) {
        formData.append('foto_kwitansi', selectedFile);
      }

      if (editingId) {
        formData.append('id_pengeluaran', editingId);
        await PengeluaranService.update(editingId, formData);
        setSuccessMsg('Catatan pengeluaran berhasil diperbarui dan diajukan ulang ke admin!');
      } else {
        await PengeluaranService.create(formData);
        setSuccessMsg('Pengeluaran berhasil dicatat dan diajukan ke admin!');
      }

      setIsModalOpen(false);
      resetForm();
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setModalError(err.message || 'Gagal menyimpan pengeluaran');
    }
  };

  // Kalkulasi statistik pribadi
  const pribadiExpenses = pengeluaranList.filter(p => p.jenis_dana === 'pribadi');
  const totalReimbursDisetujui = pribadiExpenses.filter(p => p.status_verifikasi === 'disetujui').reduce((a, c) => a + Number(c.nominal), 0);
  const totalSudahDiganti = pribadiExpenses.filter(p => p.status_ganti === 'sudah').reduce((a, c) => a + Number(c.nominal), 0);
  const totalBelumDiganti = pribadiExpenses.filter(p => p.status_verifikasi === 'disetujui' && p.status_ganti === 'belum').reduce((a, c) => a + Number(c.nominal), 0);
  const totalMenunggu = pengeluaranList.filter(p => p.status_verifikasi === 'menunggu').length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 mb-1">
            <span>Pengeluaran Pribadi & Kantor</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Receipt className="w-7 h-7 text-blue-600" />
            <span>Pencatatan Pengeluaran & Kwitansi</span>
          </h1>
          <p className="text-sm text-slate-500">
            Catat nota belanja material atau operasional proyek. Lampirkan foto kwitansi dengan kompresi otomatis.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition shadow-sm"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenCreateModal}
            disabled={pekerjaanList.length === 0}
            className="inline-flex items-center space-x-2 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl font-semibold text-sm shadow-md transition"
          >
            <Plus className="w-4 h-4" />
            <span>+ Catat Pengeluaran Baru</span>
          </button>
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 rounded-2xl flex items-center space-x-3 text-sm">
          <AlertCircle className="w-5 h-5 flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}
      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-2xl flex items-center space-x-3 text-sm">
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Uang Pribadi Disetujui</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatRupiah(totalReimbursDisetujui)}
          </div>
          <div className="text-xs text-slate-400 mt-1">{pribadiExpenses.length} transaksi dana pribadi</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Belum Diganti (Siap Cair)</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatRupiah(totalBelumDiganti)}
          </div>
          <div className="text-xs text-amber-700 mt-1">Akan dibayar pada slip gaji / kasir</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Sudah Diganti (Lunas)</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {formatRupiah(totalSudahDiganti)}
          </div>
          <div className="text-xs text-emerald-700 mt-1">Telah diterima oleh Anda</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menunggu Verifikasi</div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">
            {totalMenunggu} <span className="text-xs font-normal text-slate-400">Nota</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Dalam proses audit admin</div>
        </div>
      </div>

      {/* Table Records */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Pengeluaran Pribadi</h3>
            <p className="text-xs text-slate-400">Daftar nota belanja yang Anda ajukan</p>
          </div>
          <div className="text-xs text-slate-500 font-semibold">
            {pengeluaranList.length} Transaksi
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
            <p className="text-sm">Memuat catatan pengeluaran...</p>
          </div>
        ) : pengeluaranList.length === 0 ? (
          <div className="p-12 text-center text-slate-400">
            <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
            <p className="text-sm font-medium">Belum ada catatan pengeluaran.</p>
            <p className="text-xs text-slate-400 mt-1">Gunakan tombol "+ Catat Pengeluaran Baru" untuk mengajukan klaim nota belanja.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 border-collapse">
              <thead className="bg-slate-50/80 text-slate-400 uppercase font-semibold text-[11px] tracking-wider border-b border-slate-100">
                <tr>
                  <th className="py-3 px-3">Tanggal</th>
                  <th className="py-3 px-3">Proyek</th>
                  <th className="py-3 px-3">Keterangan</th>
                  <th className="py-3 px-3">Sumber Dana</th>
                  <th className="py-3 px-3 text-right">Nominal</th>
                  <th className="py-3 px-3 text-center">Bukti Nota</th>
                  <th className="py-3 px-3">Status Audit</th>
                  <th className="py-3 px-3">Status Penggantian</th>
                  <th className="py-3 px-3 text-center">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pengeluaranList.map((p) => {
                  return (
                    <tr key={p.id_pengeluaran} className="hover:bg-slate-50/80 transition">
                      <td className="py-3 px-3 font-semibold text-slate-700 whitespace-nowrap">
                        {p.tanggal}
                      </td>
                      <td className="py-3 px-3 font-semibold text-slate-800 max-w-[160px] truncate" title={p.nama_pekerjaan}>
                        {p.nama_pekerjaan}
                      </td>
                      <td className="py-3 px-3 max-w-[180px]">
                        <div className="truncate text-slate-700 font-medium" title={p.keterangan}>
                          {p.keterangan}
                        </div>
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.jenis_dana === 'pribadi' ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            Dana Pribadi (Reimburs)
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                            Dana Kantor
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right font-bold text-slate-800 whitespace-nowrap">
                        {formatRupiah(p.nominal)}
                      </td>
                      <td className="py-3 px-3 text-center whitespace-nowrap">
                        {p.foto_kwitansi ? (
                          <button
                            onClick={() => setPreviewImage(getImageUrl(p.foto_kwitansi))}
                            className="inline-flex items-center space-x-1 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 text-[11px] font-semibold transition"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lihat Nota</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 italic text-[11px]">Tanpa Foto</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.status_verifikasi === 'disetujui' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center space-x-1 w-fit">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Disetujui</span>
                          </span>
                        )}
                        {p.status_verifikasi === 'menunggu' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 flex items-center space-x-1 w-fit">
                            <span>Menunggu</span>
                          </span>
                        )}
                        {p.status_verifikasi === 'ditolak' && (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 border border-rose-200 flex items-center space-x-1 w-fit">
                            <XCircle className="w-3 h-3" />
                            <span>Ditolak</span>
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap">
                        {p.jenis_dana === 'pribadi' ? (
                          p.status_ganti === 'sudah' ? (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              ✓ Sudah Diganti
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              Belum Diganti
                            </span>
                          )
                        ) : (
                          <span className="text-slate-400 text-[11px]">-</span>
                        )}
                      </td>
                      <td className="py-3 px-3 whitespace-nowrap text-center">
                        {p.status_verifikasi === 'disetujui' || p.status_ganti === 'sudah' ? (
                          <span 
                            className="inline-flex items-center space-x-1 px-2 py-1 rounded-lg bg-slate-100 text-slate-400 text-[11px] font-medium cursor-not-allowed border border-slate-200"
                            title="Terkunci: Pengeluaran yang sudah disetujui / diganti tidak dapat diubah atau dihapus untuk mencegah kecurangan."
                          >
                            <Lock className="w-3 h-3 text-slate-400" />
                            <span>Terkunci</span>
                          </span>
                        ) : (
                          <div className="inline-flex items-center space-x-1.5">
                            <button
                              onClick={() => handleOpenEditModal(p)}
                              title="Edit Catatan Pengeluaran"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-blue-600 hover:bg-blue-50 hover:border-blue-300 transition cursor-pointer shadow-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p)}
                              title="Hapus Catatan Pengeluaran"
                              className="p-1.5 rounded-lg border border-slate-200 bg-white text-rose-600 hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer shadow-xs"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
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

      {/* Modal Tambah / Edit Pengeluaran */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingId ? 'Edit Catatan Pengeluaran' : 'Form Catat Pengeluaran & Bukti Nota'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span>{modalError}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Proyek Pekerjaan *</label>
            <select
              value={formJobId}
              onChange={(e) => setFormJobId(e.target.value)}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
              required
            >
              {pekerjaanList.map(j => (
                <option key={j.id_pekerjaan} value={j.id_pekerjaan}>
                  {j.nama_pekerjaan} ({j.lokasi})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Tanggal Belanja *</label>
              <input
                type="date"
                value={formTanggal}
                onChange={(e) => setFormTanggal(e.target.value)}
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Nominal (Rp) *</label>
              <input
                type="number"
                min="0"
                value={formNominal}
                onChange={(e) => setFormNominal(e.target.value)}
                placeholder="Contoh: 150000"
                className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500 font-bold"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Sumber Pendanaan *</label>
            <div className="grid grid-cols-2 gap-2">
              <label className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${formJenisDana === 'pribadi' ? 'border-amber-500 bg-amber-50/50 text-amber-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}>
                <input
                  type="radio"
                  name="jenis_dana"
                  value="pribadi"
                  checked={formJenisDana === 'pribadi'}
                  onChange={() => setFormJenisDana('pribadi')}
                  className="text-amber-600 focus:ring-amber-500"
                />
                <span className="text-xs">Uang Pribadi</span>
              </label>

              <label className={`flex items-center space-x-2 p-2.5 rounded-xl border cursor-pointer transition ${formJenisDana === 'kantor' ? 'border-blue-500 bg-blue-50/50 text-blue-900 font-bold' : 'border-slate-200 hover:bg-slate-50 text-slate-700 text-xs'
                }`}>
                <input
                  type="radio"
                  name="jenis_dana"
                  value="kantor"
                  checked={formJenisDana === 'kantor'}
                  onChange={() => setFormJenisDana('kantor')}
                  className="text-blue-600 focus:ring-blue-500"
                />
                <span className="text-xs">Uang Kantor</span>
              </label>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Keterangan / Rincian Barang *</label>
            <textarea
              value={formKeterangan}
              onChange={(e) => setFormKeterangan(e.target.value)}
              placeholder="Contoh: Beli kabel ducting 10 meter dan paku klem instalasi lantai 2"
              rows={2}
              className="w-full text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>

          {/* Upload File dengan Auto Kompresi */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Foto Bukti Kwitansi / Struk <span className="text-blue-600 font-normal">(Sangat disarankan dilampirkan untuk verifikasi admin)</span>
            </label>
            <div className="border-2 border-dashed border-slate-200 hover:border-blue-400 rounded-2xl p-4 text-center transition bg-slate-50/50">
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="hidden"
                id="file-receipt-upload"
              />
              <label htmlFor="file-receipt-upload" className="cursor-pointer block">
                <Upload className="w-6 h-6 mx-auto mb-1 text-slate-400" />
                <span className="text-xs font-bold text-blue-600 hover:underline">
                  Klik untuk pilih foto nota
                </span>
                <p className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, atau WebP (Otomatis dikompres agar hemat kuota & cepat upload)</p>
              </label>

              {compressing && (
                <div className="mt-2 text-xs text-blue-600 font-semibold flex items-center justify-center space-x-1.5">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Mengompres ukuran gambar otomatis...</span>
                </div>
              )}

              {/* Compression Badge */}
              {compressionStats && (
                <div className="mt-2 p-2 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-[11px] inline-flex items-center space-x-2">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                  <span>
                    Kompresi Berhasil: {compressionStats.originalSize} → <strong>{compressionStats.compressedSize}</strong> (Hemat {compressionStats.savedPercent}%)
                  </span>
                </div>
              )}

              {filePreview && (
                <div className="mt-3 relative inline-block">
                  <img
                    src={filePreview}
                    alt="Preview Struk"
                    className="max-h-32 rounded-xl shadow-sm border border-slate-200 object-cover"
                  />
                </div>
              )}
            </div>
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="px-4 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={compressing}
              className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-bold shadow-md transition"
            >
              {editingId ? (compressing ? 'Menyimpan Perubahan...' : 'Simpan Perubahan') : (compressing ? 'Mengompresi & Menyimpan...' : 'Simpan & Ajukan Nota')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Preview Kwitansi */}
      <Modal
        isOpen={!!previewImage}
        onClose={() => setPreviewImage(null)}
        title="Pratinjau Bukti / Kwitansi Pengeluaran"
      >
        <div className="flex flex-col items-center justify-center p-2">
          {previewImage && (
            <img
              src={previewImage}
              alt="Bukti Nota"
              className="max-h-[75vh] w-auto object-contain rounded-xl shadow-lg border border-slate-200"
            />
          )}
          <div className="mt-4 flex justify-end w-full">
            <button
              onClick={() => setPreviewImage(null)}
              className="px-4 py-2 bg-slate-800 text-white text-xs font-semibold rounded-xl hover:bg-slate-900 transition"
            >
              Tutup Pratinjau
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

