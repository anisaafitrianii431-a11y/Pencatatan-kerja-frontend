import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Receipt, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  UserCheck,
  Eye,
  Camera,
  X,
  ExternalLink
} from 'lucide-react';
import { PengeluaranService, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';

export default function VerifikasiPengeluaranAdminPage({ currentUser }) {
  const [filterStatus, setFilterStatus] = useState('menunggu'); // 'menunggu' | 'disetujui' | 'ditolak' | 'semua'
  const [pengeluaranList, setPengeluaranList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal Pemeriksaan Foto Nota
  const [selectedItemModal, setSelectedItemModal] = useState(null);

  // Notifikasi & status proses
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const pengData = await PengeluaranService.getAll(
        filterStatus === 'semua' ? {} : { status_verifikasi: filterStatus }
      );
      setPengeluaranList(pengData || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data pengeluaran');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [filterStatus]);

  // Aksi Verifikasi Pengeluaran
  const handleVerifikasiPengeluaran = async (id_pengeluaran, status) => {
    setProcessingId(id_pengeluaran);
    setErrorMsg('');
    try {
      await PengeluaranService.verifikasi(id_pengeluaran, status);
      setSuccessMsg(`Nota pengeluaran berhasil ${status === 'disetujui' ? 'DISETUJUI' : 'DITOLAK'}!`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memverifikasi pengeluaran');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = pengeluaranList.filter(p => p.status_verifikasi === 'menunggu').length;

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA                                          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <UserCheck className="w-3.5 h-3.5" />
            <span>Pusat Approval Lapangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Receipt className="w-7 h-7 text-[#b81d52]" />
            <span>Approval Nota Belanja & Reimbursement</span>
          </h1>
          <p className="text-sm text-slate-500">
            Validasi nota pembelian material & operasional. Pengeluaran dengan uang pribadi yang disetujui otomatis masuk ke slip gaji pekerja.
          </p>
        </div>

        <button
          onClick={loadData}
          className="p-2.5 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 rounded-xl transition shadow-sm self-start sm:self-auto cursor-pointer"
          title="Segarkan Data"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Notifications */}
      {successMsg && (
        <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-sm flex items-center space-x-2 animate-fadeIn">
          <Check className="w-5 h-5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-sm flex items-center space-x-2 animate-fadeIn">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* ======================================================== */}
      {/* 2. FILTER STATUS BAR                                     */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-bold text-slate-700">Filter Status:</span>
          {['menunggu', 'disetujui', 'ditolak', 'semua'].map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setFilterStatus(st)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                filterStatus === st
                  ? 'text-white shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
              style={filterStatus === st ? { backgroundColor: '#b81d52' } : {}}
            >
              {st}
              {st === 'menunggu' && pendingCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 rounded-full text-[10px] bg-white text-[#b81d52]">
                  {pendingCount}
                </span>
              )}
            </button>
          ))}
        </div>

        <div className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-700 self-start sm:self-auto">
          Total: {pengeluaranList.length} Catatan Nota
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TABEL APPROVAL PENGELUARAN                            */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Pekerja</th>
                <th className="px-6 py-4">Keterangan / Keperluan</th>
                <th className="px-6 py-4 text-center">Bukti Nota</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-center">Sumber Dana</th>
                <th className="px-6 py-4 text-right">Nominal (Rp)</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Memuat data nota pengeluaran...
                  </td>
                </tr>
              ) : pengeluaranList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada catatan nota pengeluaran untuk status: <strong>{filterStatus}</strong>.
                  </td>
                </tr>
              ) : (
                pengeluaranList.map((item) => (
                  <tr key={item.id_pengeluaran} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{item.nama_karyawan}</div>
                      <div className="text-[11px] text-slate-400">{item.nama_pekerjaan || 'Operasional Lapangan'}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700 max-w-xs">
                      {item.keterangan || '-'}
                    </td>
                    <td className="px-6 py-4 text-center">
                      {item.foto_kwitansi ? (
                        <div className="inline-flex items-center gap-2">
                          <img
                            src={getFileUrl(item.foto_kwitansi)}
                            alt="Nota"
                            className="w-9 h-9 object-cover rounded-lg border border-slate-200 cursor-pointer shadow-sm hover:scale-105 transition"
                            onClick={() => setSelectedItemModal(item)}
                          />
                          <button
                            type="button"
                            onClick={() => setSelectedItemModal(item)}
                            className="px-2 py-1 bg-pink-50 text-[#b81d52] hover:bg-pink-100 border border-pink-200 text-[10px] font-bold rounded-lg flex items-center gap-1 cursor-pointer"
                            title="Buka & Periksa Nota Fisik"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Lihat</span>
                          </button>
                        </div>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">Tanpa Foto</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {item.tanggal}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-extrabold uppercase ${
                        item.jenis_dana === 'pribadi'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-blue-100 text-blue-800'
                      }`}>
                        {item.jenis_dana === 'pribadi' ? 'Dana Pribadi (Reimburse)' : 'Kas Kantor'}
                      </span>
                      {item.jenis_dana !== 'pribadi' && item.nama_penanggung_jawab && (
                        <div className="mt-1 text-[10px] font-bold text-blue-700">
                          PJ: {item.nama_penanggung_jawab}
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right font-black text-slate-900 text-sm">
                      {formatRupiah(item.nominal)}
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        item.status_verifikasi === 'disetujui'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : item.status_verifikasi === 'ditolak'
                          ? 'bg-rose-100 text-rose-800 border border-rose-200'
                          : 'bg-amber-100 text-amber-800 border border-amber-200'
                      }`}>
                        {item.status_verifikasi}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end space-x-2">
                        <button
                          type="button"
                          onClick={() => handleVerifikasiPengeluaran(item.id_pengeluaran, 'disetujui')}
                          disabled={processingId === item.id_pengeluaran || item.status_verifikasi === 'disetujui'}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          title="Setujui Pengeluaran"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifikasiPengeluaran(item.id_pengeluaran, 'ditolak')}
                          disabled={processingId === item.id_pengeluaran || item.status_verifikasi === 'ditolak'}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          title="Tolak Pengeluaran"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                          <span>Tolak</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL AUDIT BUKTI NOTA FISIK                             */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedItemModal}
        onClose={() => setSelectedItemModal(null)}
        title="Audit Bukti Fisik Struk / Nota Belanja"
      >
        {selectedItemModal && (
          <div className="space-y-4">
            {/* Rincian Singkat Nota */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Pekerja</span>
                <div className="font-bold text-slate-900 mt-0.5">{selectedItemModal.nama_karyawan}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Nominal Klaim</span>
                <div className="font-extrabold text-[#b81d52] mt-0.5">{formatRupiah(selectedItemModal.nominal)}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Tanggal</span>
                <div className="font-medium text-slate-700 mt-0.5">{selectedItemModal.tanggal}</div>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] uppercase font-semibold">Jenis Dana</span>
                <div className="font-bold text-slate-800 mt-0.5">
                  {selectedItemModal.jenis_dana === 'pribadi' ? 'Dana Pribadi (Reimburse)' : 'Kas Kantor'}
                </div>
                {selectedItemModal.jenis_dana !== 'pribadi' && selectedItemModal.nama_penanggung_jawab && (
                  <div className="text-[11px] font-semibold text-blue-700 mt-1">
                    PJ: {selectedItemModal.nama_penanggung_jawab}
                    {selectedItemModal.keterangan_kas ? ` • ${selectedItemModal.keterangan_kas}` : ''}
                  </div>
                )}
              </div>
            </div>

            {selectedItemModal.keterangan && (
              <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs">
                <span className="text-slate-400 text-[10px] uppercase font-semibold block mb-0.5">Keterangan Barang:</span>
                <p className="text-slate-800 font-medium">{selectedItemModal.keterangan}</p>
              </div>
            )}

            {/* Gambar Struk / Kuitansi */}
            <div className="max-h-[55vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-xl p-3 border border-slate-200">
              {selectedItemModal.foto_kwitansi ? (
                <img
                  src={getFileUrl(selectedItemModal.foto_kwitansi)}
                  alt="Bukti Nota Fisik"
                  className="max-h-[48vh] max-w-full rounded-lg shadow-md object-contain"
                />
              ) : (
                <div className="py-12 text-center text-slate-400 text-xs">
                  Tidak ada foto bukti nota terlampir pada pengeluaran ini.
                </div>
              )}
            </div>

            {/* Tombol Aksi di dalam Modal */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-slate-100">
              <div>
                {selectedItemModal.foto_kwitansi && (
                  <a
                    href={getFileUrl(selectedItemModal.foto_kwitansi)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-slate-900 transition"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Buka Foto Ukuran Asli</span>
                  </a>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleVerifikasiPengeluaran(selectedItemModal.id_pengeluaran, 'ditolak');
                    setSelectedItemModal(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 transition cursor-pointer"
                >
                  Tolak Pengeluaran
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleVerifikasiPengeluaran(selectedItemModal.id_pengeluaran, 'disetujui');
                    setSelectedItemModal(null);
                  }}
                  className="px-5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow cursor-pointer"
                >
                  Setujui Pengeluaran
                </button>
              </div>
            </div>
          </div>
        )}
      </Modal>

    </div>
  );
}
