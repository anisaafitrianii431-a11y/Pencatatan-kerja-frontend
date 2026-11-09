import React, { useState, useEffect } from 'react';
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
  RefreshCw,
  Filter,
  Layers,
  ArrowRight,
  ExternalLink,
  Calendar,
  MapPin,
  FileText,
  AlertTriangle,
  ZoomIn
} from 'lucide-react';
import { PengeluaranService, PekerjaanService, PekerjaService } from '../../services/api';
import Modal from '../../components/Modal';

export default function PengeluaranAdminPage({ currentUser }) {
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [pekerjaanList, setPekerjaanList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [rekapData, setRekapData] = useState({ daftar: [], summary: { total_uang_pribadi: 0, total_uang_kantor: 0, grand_total: 0 } });
  const [loading, setLoading] = useState(true);

  // Tab view: 'daftar' | 'rekap'
  const [activeTab, setActiveTab] = useState('daftar');

  // Filters
  const [filterDana, setFilterDana] = useState('semua');
  const [filterJob, setFilterJob] = useState('');
  const [filterWorker, setFilterWorker] = useState('');
  const [filterStatus, setFilterStatus] = useState('semua');

  // Modal Detail Pengeluaran & Bukti Nota
  const [selectedExpense, setSelectedExpense] = useState(null);

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

  const loadData = async () => {
    setLoading(true);
    try {
      const filter = {};
      if (filterDana !== 'semua') filter.jenis_dana = filterDana;
      if (filterJob) filter.id_pekerjaan = filterJob;
      if (filterWorker) filter.id_karyawan = filterWorker;

      const [expenses, jobs, workers, rekap] = await Promise.all([
        PengeluaranService.getAll(filter),
        PekerjaanService.getAll(),
        PekerjaService.getAll(),
        PengeluaranService.getRekap()
      ]);

      setPengeluaranList(expenses);
      setPekerjaanList(jobs);
      setPekerjaList(workers);
      setRekapData(rekap || { daftar: [], summary: { total_uang_pribadi: 0, total_uang_kantor: 0, grand_total: 0 } });
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterDana, filterJob, filterWorker]);

  const handleVerifikasi = async (id, status) => {
    try {
      await PengeluaranService.verifikasi(id, status);
      setSuccessMsg(`Status pengeluaran berhasil diubah ke: ${status.toUpperCase()}`);
      loadData();
      if (selectedExpense && selectedExpense.id_pengeluaran === id) {
        setSelectedExpense(prev => prev ? { ...prev, status_verifikasi: status } : null);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal verifikasi pengeluaran');
    }
  };

  const handleToggleGanti = async (id, currentStatus) => {
    const nextStatus = currentStatus === 'sudah' ? 'belum' : 'sudah';
    try {
      await PengeluaranService.toggleGanti(id, nextStatus);
      setSuccessMsg(`Status penggantian uang pribadi berhasil diubah: ${nextStatus === 'sudah' ? 'LUNAS DIGANTI' : 'BELUM DIGANTI'}`);
      loadData();
      if (selectedExpense && selectedExpense.id_pengeluaran === id) {
        setSelectedExpense(prev => prev ? { ...prev, status_ganti: nextStatus } : null);
      }
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengubah status penggantian');
    }
  };

  const filteredExpenses = pengeluaranList.filter(item => {
    if (filterStatus === 'semua') return true;
    return item.status_verifikasi === filterStatus;
  });

  const totalMenunggu = pengeluaranList.filter(p => p.status_verifikasi === 'menunggu').length;
  const totalReimbursBelum = pengeluaranList.filter(p => p.jenis_dana === 'pribadi' && p.status_verifikasi === 'disetujui' && p.status_ganti === 'belum').reduce((a, c) => a + Number(c.nominal), 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Receipt className="w-7 h-7 text-blue-600" />
            <span>Data Pengeluaran & Kwitansi</span>
          </h1>
          <p className="text-sm text-slate-500">
            Periksa nota/bukti belanja lapangan, setujui penggantian uang pribadi pekerja, dan pantau biaya proyek.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 text-slate-600 hover:text-blue-600 bg-white border border-slate-200 rounded-xl transition self-start sm:self-auto shadow-sm"
          title="Segarkan Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Alerts */}
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
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Grand Total Biaya Disetujui</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatRupiah(rekapData.summary?.grand_total || 0)}
          </div>
          <div className="text-xs text-slate-400 mt-1">Gabungan seluruh proyek</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Uang Pribadi Belum Diganti</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatRupiah(totalReimbursBelum)}
          </div>
          <div className="text-xs text-amber-700 mt-1">Dana pribadi pekerja siap bayar</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-sm">
          <div className="text-xs font-semibold text-blue-700 uppercase tracking-wider">Dana Kantor Digunakan</div>
          <div className="text-2xl font-extrabold text-blue-600 mt-1">
            {formatRupiah(rekapData.summary?.total_uang_kantor || 0)}
          </div>
          <div className="text-xs text-blue-700 mt-1">Kas operasional kantor</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Menunggu Verifikasi</div>
          <div className="text-2xl font-extrabold text-slate-700 mt-1">
            {totalMenunggu} <span className="text-xs font-normal text-slate-400">Nota</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Memerlukan persetujuan admin</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 space-x-6 text-sm font-bold">
        <button
          onClick={() => setActiveTab('daftar')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'daftar' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Receipt className="w-4 h-4" />
          <span>Daftar Bukti & Verifikasi Kwitansi ({filteredExpenses.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('rekap')}
          className={`pb-3 border-b-2 flex items-center space-x-2 transition ${
            activeTab === 'rekap' ? 'border-blue-600 text-blue-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Rekapitulasi Biaya Per Proyek ({rekapData.daftar?.length || 0})</span>
        </button>
      </div>

      {activeTab === 'daftar' ? (
        <div className="space-y-4">
          {/* Filters */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center space-x-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <Filter className="w-3.5 h-3.5 text-blue-600" />
              <span>Filter Pengeluaran</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Pilih Pekerja</label>
                <select
                  value={filterWorker}
                  onChange={(e) => setFilterWorker(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Pekerja ({pekerjaList.length})</option>
                  {pekerjaList.map(w => (
                    <option key={w.id_karyawan} value={w.id_karyawan}>{w.nama}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Pilih Pekerjaan</label>
                <select
                  value={filterJob}
                  onChange={(e) => setFilterJob(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Semua Proyek ({pekerjaanList.length})</option>
                  {pekerjaanList.map(j => (
                    <option key={j.id_pekerjaan} value={j.id_pekerjaan}>{j.nama_pekerjaan}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Sumber Dana</label>
                <select
                  value={filterDana}
                  onChange={(e) => setFilterDana(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="semua">Semua Sumber Dana</option>
                  <option value="pribadi">Uang Pribadi (Reimbursement)</option>
                  <option value="kantor">Kas Kantor</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 mb-1">Status Verifikasi</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-xs font-medium bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="semua">Semua Status</option>
                  <option value="menunggu">Menunggu Verifikasi</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="p-12 text-center text-slate-400">
                <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-600" />
                <p className="text-sm">Memuat bukti pengeluaran...</p>
              </div>
            ) : filteredExpenses.length === 0 ? (
              <div className="p-12 text-center text-slate-400">
                <Receipt className="w-10 h-10 mx-auto mb-2 text-slate-300" />
                <p className="text-sm font-medium">Tidak ada data pengeluaran yang sesuai filter.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-slate-600">
                  <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-100">
                    <tr>
                      <th className="py-3 px-4">Pekerja & Tanggal</th>
                      <th className="py-3 px-4">Pekerjaan</th>
                      <th className="py-3 px-4">Keterangan</th>
                      <th className="py-3 px-4">Sumber Dana</th>
                      <th className="py-3 px-4 text-right">Nominal</th>
                      <th className="py-3 px-4 text-center">Bukti Nota</th>
                      <th className="py-3 px-4">Verifikasi</th>
                      <th className="py-3 px-4">Status Ganti</th>
                      <th className="py-3 px-4 text-center">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredExpenses.map((p) => {
                      return (
                        <tr key={p.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                          <td className="py-3 px-4 whitespace-nowrap">
                            <div className="font-semibold text-slate-800">{p.nama_karyawan}</div>
                            <div className="text-[10px] text-slate-400">{p.tanggal}</div>
                          </td>
                          <td className="py-3 px-4 font-medium text-slate-700 max-w-[180px] truncate" title={p.nama_pekerjaan}>
                            {p.nama_pekerjaan}
                          </td>
                          <td className="py-3 px-4 max-w-[200px]">
                            <button
                              type="button"
                              onClick={() => setSelectedExpense(p)}
                              className="text-left w-full truncate text-slate-800 font-medium hover:text-blue-600 transition"
                              title={`${p.keterangan || '-'} (Klik untuk rincian lengkap)`}
                            >
                              {p.keterangan || <span className="text-slate-400 italic">Tanpa keterangan</span>}
                            </button>
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.jenis_dana === 'pribadi' ? (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-700 border border-amber-200">
                                Dana Pribadi
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                Kas Kantor
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right font-bold text-slate-800 whitespace-nowrap">
                            {formatRupiah(p.nominal)}
                          </td>
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {p.foto_kwitansi ? (
                              <button
                                onClick={() => setSelectedExpense(p)}
                                className="inline-flex items-center space-x-1.5 px-2.5 py-1 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200 text-[11px] font-semibold transition shadow-xs"
                                title="Klik untuk memeriksa bukti nota & detail"
                              >
                                <Eye className="w-3.5 h-3.5 text-blue-600" />
                                <span>Lihat Nota</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => setSelectedExpense(p)}
                                className="inline-flex items-center space-x-1.5 px-2 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 border border-amber-200 text-[11px] font-medium transition shadow-xs"
                                title="Pekerja tidak melampirkan foto. Klik untuk cek detail pengeluaran."
                              >
                                <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />
                                <span>Tanpa Foto (Cek Detail)</span>
                              </button>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.status_verifikasi === 'disetujui' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-100 text-emerald-700 flex items-center space-x-1 w-fit">
                                <CheckCircle2 className="w-3 h-3" />
                                <span>Disetujui</span>
                              </span>
                            )}
                            {p.status_verifikasi === 'menunggu' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-700 flex items-center space-x-1 w-fit">
                                <span>Menunggu</span>
                              </span>
                            )}
                            {p.status_verifikasi === 'ditolak' && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-100 text-rose-700 flex items-center space-x-1 w-fit">
                                <XCircle className="w-3 h-3" />
                                <span>Ditolak</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap">
                            {p.jenis_dana === 'pribadi' ? (
                              <button
                                onClick={() => handleToggleGanti(p.id_pengeluaran, p.status_ganti)}
                                className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition flex items-center space-x-1 ${
                                  p.status_ganti === 'sudah'
                                    ? 'bg-emerald-100 text-emerald-700 border border-emerald-300 hover:bg-emerald-200'
                                    : 'bg-rose-100 text-rose-700 border border-rose-300 hover:bg-rose-200'
                                }`}
                              >
                                <span>{p.status_ganti === 'sudah' ? '✓ Lunas Diganti' : '✕ Belum Diganti'}</span>
                              </button>
                            ) : (
                              <span className="text-slate-400 text-[11px]">-</span>
                            )}
                          </td>
                          <td className="py-3 px-4 whitespace-nowrap text-center">
                            <div className="inline-flex items-center space-x-1">
                              <button
                                onClick={() => setSelectedExpense(p)}
                                title="Buka Detail Lengkap & Nota"
                                className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition"
                              >
                                <FileText className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleVerifikasi(p.id_pengeluaran, 'disetujui')}
                                title="Setujui Pengeluaran"
                                className={`p-1.5 rounded-lg border transition ${
                                  p.status_verifikasi === 'disetujui'
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-600 hover:text-white'
                                }`}
                              >
                                <Check className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleVerifikasi(p.id_pengeluaran, 'ditolak')}
                                title="Tolak Pengeluaran"
                                className={`p-1.5 rounded-lg border transition ${
                                  p.status_verifikasi === 'ditolak'
                                    ? 'bg-rose-600 text-white border-rose-600'
                                    : 'bg-rose-50 text-rose-700 border-rose-200 hover:bg-rose-600 hover:text-white'
                                }`}
                              >
                                <XCircle className="w-3.5 h-3.5" />
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
        </div>
      ) : (
        /* Rekapitulasi Proyek Tab */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Rekapitulasi Biaya Pengeluaran Per Proyek Multi-Hari</h3>
            <p className="text-xs text-slate-500">Akumulasi pengeluaran yang telah disetujui (disaring berdasarkan Uang Pribadi yang diganti & Kas Kantor).</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-400 uppercase font-semibold border-b border-slate-100">
                <tr>
                  <th className="py-3 px-4">Nama Proyek</th>
                  <th className="py-3 px-4">Lokasi</th>
                  <th className="py-3 px-4 text-right">Uang Pribadi (Reimburs)</th>
                  <th className="py-3 px-4 text-right">Kas Kantor</th>
                  <th className="py-3 px-4 text-right font-bold text-slate-700">Total Biaya</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rekapData.daftar?.map((item) => (
                  <tr key={item.id_pekerjaan} className="hover:bg-slate-50/70 transition">
                    <td className="py-3 px-4 font-bold text-slate-800">{item.nama_pekerjaan}</td>
                    <td className="py-3 px-4 text-slate-600">{item.lokasi}</td>
                    <td className="py-3 px-4 text-right font-medium text-amber-600">{formatRupiah(item.total_uang_pribadi)}</td>
                    <td className="py-3 px-4 text-right font-medium text-blue-600">{formatRupiah(item.total_uang_kantor)}</td>
                    <td className="py-3 px-4 text-right font-bold text-slate-800">{formatRupiah(item.grand_total)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="bg-slate-50 border-t-2 border-slate-200 font-bold text-xs text-slate-800">
                <tr>
                  <td colSpan={2} className="py-3.5 px-4 text-right uppercase tracking-wider">Grand Total Keseluruhan:</td>
                  <td className="py-3.5 px-4 text-right text-amber-600">{formatRupiah(rekapData.summary?.total_uang_pribadi || 0)}</td>
                  <td className="py-3.5 px-4 text-right text-blue-600">{formatRupiah(rekapData.summary?.total_uang_kantor || 0)}</td>
                  <td className="py-3.5 px-4 text-right text-emerald-700 text-sm font-extrabold">{formatRupiah(rekapData.summary?.grand_total || 0)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>
      )}

      {/* Modal Detail Pengeluaran & Bukti Nota */}
      <Modal
        isOpen={!!selectedExpense}
        onClose={() => setSelectedExpense(null)}
        title="Detail Pengeluaran & Bukti Nota"
        maxWidth="max-w-3xl"
      >
        {selectedExpense && (
          <div className="space-y-5">
            {/* Kartu Ringkasan Atas */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Nominal */}
              <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-100 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-blue-700 uppercase tracking-wider">Total Nominal Belanja</span>
                <span className="text-xl font-black text-blue-900 mt-1">{formatRupiah(selectedExpense.nominal)}</span>
              </div>

              {/* Sumber Dana */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Sumber Dana</span>
                <div className="mt-1">
                  {selectedExpense.jenis_dana === 'pribadi' ? (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-800 border border-amber-300">
                      <span>Dana Pribadi (Reimburs)</span>
                    </span>
                  ) : (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-100 text-blue-800 border border-blue-300">
                      <span>Kas Operasional Kantor</span>
                    </span>
                  )}
                </div>
              </div>

              {/* Status Verifikasi */}
              <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Status Verifikasi</span>
                <div className="mt-1 flex items-center space-x-2">
                  {selectedExpense.status_verifikasi === 'disetujui' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-100 text-emerald-700">
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>Disetujui</span>
                    </span>
                  )}
                  {selectedExpense.status_verifikasi === 'menunggu' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-700">
                      <AlertCircle className="w-3.5 h-3.5" />
                      <span>Menunggu Audit</span>
                    </span>
                  )}
                  {selectedExpense.status_verifikasi === 'ditolak' && (
                    <span className="inline-flex items-center space-x-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-700">
                      <XCircle className="w-3.5 h-3.5" />
                      <span>Ditolak</span>
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Grid 2 Kolom: Data Rincian vs Foto Nota */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Kolom Kiri: Rincian Metadata */}
              <div className="space-y-3">
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                  <div className="flex items-start space-x-2.5">
                    <User className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Diajukan Oleh Pekerja:</div>
                      <div className="text-sm font-bold text-slate-800">{selectedExpense.nama_karyawan}</div>
                      {selectedExpense.jabatan && (
                        <div className="text-[11px] text-slate-500 font-medium">{selectedExpense.jabatan}</div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Building className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Proyek / Pekerjaan Terkait:</div>
                      <div className="text-sm font-bold text-slate-800">{selectedExpense.nama_pekerjaan}</div>
                      {selectedExpense.lokasi_pekerjaan && (
                        <div className="text-[11px] text-slate-500 font-medium flex items-center space-x-1 mt-0.5">
                          <MapPin className="w-3 h-3 text-slate-400" />
                          <span>{selectedExpense.lokasi_pekerjaan}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start space-x-2.5">
                    <Calendar className="w-4 h-4 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <div className="text-[11px] text-slate-400 font-medium">Tanggal Pembelian:</div>
                      <div className="text-sm font-bold text-slate-800">{selectedExpense.tanggal}</div>
                    </div>
                  </div>
                </div>

                {/* Keterangan Keperluan */}
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center space-x-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Keterangan Keperluan Belanja</span>
                  </div>
                  <div className="p-3 bg-white rounded-lg border border-slate-200 text-slate-800 text-xs leading-relaxed font-medium break-words">
                    {selectedExpense.keterangan || <span className="text-slate-400 italic">Tidak ada keterangan belanja yang diisi.</span>}
                  </div>
                </div>

                {/* Status Penggantian Dana Pribadi */}
                {selectedExpense.jenis_dana === 'pribadi' && (
                  <div className="p-3.5 rounded-xl bg-amber-50/70 border border-amber-200 text-amber-900 space-y-1.5">
                    <div className="flex items-center space-x-2 font-bold text-xs text-amber-800">
                      <CreditCard className="w-4 h-4 text-amber-600" />
                      <span>Status Penggantian Uang Pribadi (Reimbursement)</span>
                    </div>
                    <p className="text-[11px] text-amber-700 leading-normal">
                      Status saat ini: <strong className={selectedExpense.status_ganti === 'sudah' ? 'text-emerald-700 font-extrabold' : 'text-rose-700 font-extrabold'}>
                        {selectedExpense.status_ganti === 'sudah' ? 'SUDAH DIGANTI (LUNAS)' : 'BELUM DIGANTI'}
                      </strong>.
                      {selectedExpense.status_ganti === 'belum' 
                        ? ' Nominal ini akan otomatis digabungkan ke Slip Gaji bulanan karyawan jika disetujui.'
                        : ' Biaya ini sudah digantikan secara lunas kepada pekerja.'}
                    </p>
                  </div>
                )}
              </div>

              {/* Kolom Kanan: Bukti Kwitansi / Nota */}
              <div className="flex flex-col">
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span className="flex items-center space-x-1.5">
                    <Receipt className="w-3.5 h-3.5 text-blue-600" />
                    <span>Bukti Foto Nota / Faktur</span>
                  </span>
                  {selectedExpense.foto_kwitansi && (
                    <a
                      href={getImageUrl(selectedExpense.foto_kwitansi)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-[11px] font-semibold transition"
                    >
                      <span>Buka Layar Penuh</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                <div className="flex-1 flex flex-col items-center justify-center p-4 bg-slate-50 rounded-xl border border-slate-200 min-h-[260px]">
                  {selectedExpense.foto_kwitansi ? (
                    <div className="w-full flex flex-col items-center space-y-3">
                      <a 
                        href={getImageUrl(selectedExpense.foto_kwitansi)} 
                        target="_blank" 
                        rel="noreferrer"
                        className="group relative block overflow-hidden rounded-xl border border-slate-300 shadow-sm hover:shadow-md transition cursor-zoom-in max-h-[300px] w-full bg-slate-900/5"
                      >
                        <img
                          src={getImageUrl(selectedExpense.foto_kwitansi)}
                          alt="Bukti Nota Pengeluaran"
                          className="w-full h-auto max-h-[300px] object-contain mx-auto transition duration-200 group-hover:scale-[1.02]"
                        />
                        <div className="absolute inset-0 bg-slate-900/0 group-hover:bg-slate-900/20 transition flex items-center justify-center opacity-0 group-hover:opacity-100">
                          <span className="px-3 py-1.5 bg-slate-900/80 text-white rounded-lg text-xs font-semibold backdrop-blur-xs flex items-center space-x-1">
                            <ZoomIn className="w-3.5 h-3.5" />
                            <span>Perbesar Gambar</span>
                          </span>
                        </div>
                      </a>
                      <div className="text-[11px] text-slate-400 italic text-center">
                        Klik gambar atau tautan &apos;Buka Layar Penuh&apos; untuk melihat nota resolusi asli di tab baru.
                      </div>
                    </div>
                  ) : (
                    <div className="text-center p-6 space-y-2.5 max-w-sm">
                      <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
                        <AlertTriangle className="w-6 h-6" />
                      </div>
                      <h4 className="font-bold text-slate-800 text-sm">Tidak Ada Lampiran Foto Nota</h4>
                      <p className="text-xs text-slate-500 leading-relaxed">
                        Pekerja <strong>{selectedExpense.nama_karyawan}</strong> mencatat pengeluaran ini tanpa mengunggah foto nota/faktur fisik.
                      </p>
                      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-left text-[11px] text-amber-800 space-y-1">
                        <div className="font-bold">Saran untuk Admin:</div>
                        <ul className="list-disc list-inside space-y-0.5 text-amber-700">
                          <li>Konfirmasi langsung ke pekerja terkait struk/bon belanja fisiknya.</li>
                          <li>Jika struk wajib dan tidak dapat ditunjukkan, Anda dapat menekan tombol <strong>Tolak Pengeluaran</strong>.</li>
                        </ul>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Aksi Cepat Admin di Footer Modal */}
            <div className="pt-4 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  onClick={() => handleVerifikasi(selectedExpense.id_pengeluaran, 'disetujui')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    selectedExpense.status_verifikasi === 'disetujui'
                      ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-300'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-600 hover:text-white'
                  }`}
                >
                  <Check className="w-4 h-4" />
                  <span>{selectedExpense.status_verifikasi === 'disetujui' ? 'Telah Disetujui' : 'Setujui Pengeluaran'}</span>
                </button>

                <button
                  onClick={() => handleVerifikasi(selectedExpense.id_pengeluaran, 'ditolak')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-1.5 ${
                    selectedExpense.status_verifikasi === 'ditolak'
                      ? 'bg-rose-600 text-white shadow-sm ring-2 ring-rose-300'
                      : 'bg-rose-50 text-rose-700 border border-rose-300 hover:bg-rose-600 hover:text-white'
                  }`}
                >
                  <XCircle className="w-4 h-4" />
                  <span>{selectedExpense.status_verifikasi === 'ditolak' ? 'Telah Ditolak' : 'Tolak Pengeluaran'}</span>
                </button>

                {selectedExpense.jenis_dana === 'pribadi' && (
                  <button
                    onClick={() => handleToggleGanti(selectedExpense.id_pengeluaran, selectedExpense.status_ganti)}
                    className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center space-x-1.5 ${
                      selectedExpense.status_ganti === 'sudah'
                        ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-300 hover:bg-emerald-100'
                    }`}
                  >
                    <CreditCard className="w-4 h-4 text-amber-600" />
                    <span>
                      {selectedExpense.status_ganti === 'sudah' ? 'Ubah Jadi: Belum Diganti' : 'Tandai: Sudah Diganti'}
                    </span>
                  </button>
                )}
              </div>

              <button
                onClick={() => setSelectedExpense(null)}
                className="px-5 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl transition shadow-sm"
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

