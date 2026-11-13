import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  UserCheck, 
  Filter
} from 'lucide-react';
import { AbsensiService } from '../../services/api';

export default function VerifikasiAbsensiAdminPage({ currentUser }) {
  const [filterStatus, setFilterStatus] = useState('menunggu'); // 'menunggu' | 'disetujui' | 'ditolak' | 'semua'
  const [absensiList, setAbsensiList] = useState([]);
  const [loading, setLoading] = useState(true);

  // Notifikasi & status proses
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const absData = await AbsensiService.getAll(
        filterStatus === 'semua' ? {} : { status: filterStatus }
      );
      setAbsensiList(absData || []);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();

    function handleSyncEvent() {
      loadData();
    }
    window.addEventListener('storage', handleSyncEvent);
    window.addEventListener('absensi_updated', handleSyncEvent);
    return () => {
      window.removeEventListener('storage', handleSyncEvent);
      window.removeEventListener('absensi_updated', handleSyncEvent);
    };
  }, [filterStatus]);

  // Aksi Verifikasi Absensi
  const handleVerifikasiAbsensi = async (id_absensi, status) => {
    setProcessingId(id_absensi);
    setErrorMsg('');
    try {
      await AbsensiService.verifikasi(id_absensi, status);
      setSuccessMsg(`Presensi jam kerja berhasil ${status === 'disetujui' ? 'DISETUJUI' : 'DITOLAK'}!`);
      loadData();
      setTimeout(() => setSuccessMsg(''), 3500);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memverifikasi presensi');
    } finally {
      setProcessingId(null);
    }
  };

  const pendingCount = absensiList.filter(a => a.status_verifikasi === 'menunggu').length;

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
            <Clock className="w-7 h-7 text-[#b81d52]" />
            <span>Approval Presensi & Jam Kerja</span>
          </h1>
          <p className="text-sm text-slate-500">
            Validasi jam masuk dan pulang pekerja di lapangan. Hanya jam kerja yang disetujui yang dihitung ke slip gaji.
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
      {/* 2. FILTER STATUS STATUS BAR                              */}
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
          Total: {absensiList.length} Catatan
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. TABEL APPROVAL ABSENSI                                */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-50 border-b border-slate-200/80 text-xs uppercase font-bold text-slate-500 tracking-wider">
              <tr>
                <th className="px-6 py-4">Pekerja</th>
                <th className="px-6 py-4">Proyek / Pekerjaan</th>
                <th className="px-6 py-4">Tanggal</th>
                <th className="px-6 py-4 text-center">Jam Masuk - Pulang</th>
                <th className="px-6 py-4 text-center">Durasi Jam</th>
                <th className="px-6 py-4 text-center">Status</th>
                <th className="px-6 py-4 text-right">Aksi Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Memuat data presensi pekerja...
                  </td>
                </tr>
              ) : absensiList.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada catatan presensi untuk status: <strong>{filterStatus}</strong>.
                  </td>
                </tr>
              ) : (
                absensiList.map((item) => (
                  <tr key={item.id_absensi} className="hover:bg-slate-50/70 transition">
                    <td className="px-6 py-4">
                      <div className="font-bold text-slate-900 text-sm">{item.nama_karyawan}</div>
                      <div className="text-[11px] text-slate-400">{item.jabatan || 'Pekerja'}</div>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-700">
                      {item.nama_pekerjaan || 'Pekerjaan Umum'}
                    </td>
                    <td className="px-6 py-4 text-slate-600 font-mono">
                      {item.tanggal}
                    </td>
                    <td className="px-6 py-4 text-center font-bold text-slate-700 font-mono">
                      <span>{item.jam_masuk?.slice(0, 5) || '-'}</span>
                      <span className="mx-1 text-slate-400">s/d</span>
                      <span>{item.jam_pulang ? item.jam_pulang.slice(0, 5) : '(Belum Pulang)'}</span>
                    </td>
                    <td className="px-6 py-4 text-center font-black text-[#b81d52] text-sm">
                      {item.durasi_jam || 0} Jam
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
                          onClick={() => handleVerifikasiAbsensi(item.id_absensi, 'disetujui')}
                          disabled={processingId === item.id_absensi || item.status_verifikasi === 'disetujui'}
                          className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          title="Setujui Jam Kerja"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Setujui</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleVerifikasiAbsensi(item.id_absensi, 'ditolak')}
                          disabled={processingId === item.id_absensi || item.status_verifikasi === 'ditolak'}
                          className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          title="Tolak Jam Kerja"
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

    </div>
  );
}
