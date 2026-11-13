import React, { useState, useEffect } from 'react';
import { 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertCircle, 
  Check, 
  RefreshCw, 
  UserCheck, 
  MapPin,
  Camera,
  ExternalLink,
  Eye
} from 'lucide-react';
import { getAbsensi, verifikasiAbsensi } from '../../services/absensiApi';
import { getPekerjaan } from '../../services/pekerjaanApi';
import { getFileUrl } from '../../services/api';
import { formatWeekdayAndDate, resolveAttendanceLocation } from '../../utils/geoLocation';
import AbsensiInspectionDialog from '../../components/AbsensiInspectionDialog';

export default function VerifikasiAbsensiAdminPage({ currentUser }) {
  const [filterStatus, setFilterStatus] = useState('menunggu'); // 'menunggu' | 'disetujui' | 'ditolak' | 'semua'
  const [filterJobId, setFilterJobId] = useState('');
  const [jobsList, setJobsList] = useState([]);
  const [absensiList, setAbsensiList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedAttendance, setSelectedAttendance] = useState(null);

  // Notifikasi & status proses
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [processingId, setProcessingId] = useState(null);

  const loadData = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      const params = filterStatus === 'semua' ? {} : { status: filterStatus };
      if (filterJobId) params.id_pekerjaan = filterJobId;

      const [absData, jobData] = await Promise.all([
        getAbsensi(params),
        jobsList.length === 0 ? getPekerjaan() : Promise.resolve(jobsList),
      ]);
      setAbsensiList(absData || []);
      if (jobsList.length === 0 && Array.isArray(jobData)) {
        setJobsList(jobData);
      }
    } catch (err) {
      setErrorMsg(err.message || 'Gagal memuat data presensi');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filterStatus, filterJobId]);

  // Aksi Verifikasi Absensi
  const handleVerifikasiAbsensi = async (id_absensi, status, catatanAdmin = '') => {
    setProcessingId(id_absensi);
    setErrorMsg('');
    try {
      await verifikasiAbsensi(id_absensi, status, catatanAdmin);
      setSuccessMsg(`Presensi jam kerja berhasil ${status === 'disetujui' ? 'DISETUJUI' : 'DITOLAK'}!`);
      setSelectedAttendance(null);
      await loadData();
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
          type="button"
          onClick={loadData}
          aria-label="Segarkan Data Presensi"
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
      {/* 2. FILTER STATUS & PEKERJAAN                             */}
      {/* ======================================================== */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-2">
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

        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label htmlFor="admin-approval-filter-job" className="text-xs font-bold text-slate-700">
              Pekerjaan:
            </label>
            <select
              id="admin-approval-filter-job"
              value={filterJobId}
              onChange={(e) => setFilterJobId(e.target.value)}
              className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-[#b81d52] focus:outline-none"
            >
              <option value="">Semua Pekerjaan</option>
              {jobsList.map((job) => (
                <option key={job.id_pekerjaan} value={job.id_pekerjaan}>
                  {job.nama_pekerjaan}
                </option>
              ))}
            </select>
          </div>

          <div className="text-xs font-semibold px-3 py-1.5 bg-slate-100 rounded-lg text-slate-700">
            Total: {absensiList.length} Catatan
          </div>
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
                <th className="px-5 py-4">Pekerja</th>
                <th className="px-5 py-4">Detail Pekerjaan</th>
                <th className="px-5 py-4">Hari, Tanggal &amp; Jam</th>
                <th className="px-5 py-4">Foto Kamera</th>
                <th className="px-5 py-4">Titik Lokasi &amp; Jarak</th>
                <th className="px-5 py-4 text-center">Durasi</th>
                <th className="px-5 py-4 text-center">Status</th>
                <th className="px-5 py-4 text-right">Aksi Approval</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-xs">
              {loading ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Memuat data presensi pekerja...
                  </td>
                </tr>
              ) : absensiList.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-12 text-center text-slate-400">
                    Tidak ada catatan presensi untuk status: <strong>{filterStatus}</strong>.
                  </td>
                </tr>
              ) : (
                absensiList.map((item) => {
                  const loc = resolveAttendanceLocation(item);
                  const dayMeta = formatWeekdayAndDate(item.tanggal, true);
                  const fotoMasukUrl = item.foto_lokasi ? getFileUrl(item.foto_lokasi) : '';
                  const fotoPulangUrl = item.foto_pulang ? getFileUrl(item.foto_pulang) : '';

                  return (
                    <tr key={item.id_absensi} className="hover:bg-slate-50/70 transition align-top">
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">{item.nama_karyawan}</div>
                        <div className="text-[11px] text-slate-400">{item.jabatan || 'Pekerja'}</div>
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        <div className="font-semibold text-slate-800">{item.nama_pekerjaan || 'Pekerjaan Umum'}</div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{item.lokasi_pekerjaan || item.lokasi || 'Lokasi belum diisi'}</span>
                        </div>
                        {item.jenis_penugasan && (
                          <span className="inline-block rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                            {item.jenis_penugasan === 'mandiri' ? 'Diambil Mandiri' : 'Ditetapkan Admin'}
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4 space-y-1">
                        <div className="text-slate-800 font-bold">
                          {dayMeta.label}
                        </div>
                        <div className="font-bold text-slate-600 font-mono text-[11px]">
                          <span>{item.jam_masuk?.slice(0, 5) || '-'}</span>
                          <span className="mx-1 text-slate-400">s/d</span>
                          <span>{item.jam_pulang ? item.jam_pulang.slice(0, 5) : '(Belum Pulang)'}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-2">
                          {fotoMasukUrl ? (
                            <button
                              type="button"
                              onClick={() => setSelectedAttendance(item)}
                              aria-label={`Lihat foto absen masuk ${item.nama_karyawan}`}
                              className="relative group overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                            >
                              <img
                                src={fotoMasukUrl}
                                alt={`Foto masuk ${item.nama_karyawan}`}
                                className="h-11 w-14 object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-[9px] text-white text-center py-0.5 font-semibold">
                                Masuk
                              </span>
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-200 px-2 py-1 text-[10px] text-slate-400">
                              <Camera className="w-3 h-3" /> Tidak ada foto
                            </span>
                          )}
                          {fotoPulangUrl && (
                            <button
                              type="button"
                              onClick={() => setSelectedAttendance(item)}
                              aria-label={`Lihat foto absen pulang ${item.nama_karyawan}`}
                              className="relative group overflow-hidden rounded-lg border border-slate-200 bg-slate-100 shrink-0"
                            >
                              <img
                                src={fotoPulangUrl}
                                alt={`Foto pulang ${item.nama_karyawan}`}
                                className="h-11 w-14 object-cover"
                              />
                              <span className="absolute bottom-0 inset-x-0 bg-slate-900/75 text-[9px] text-white text-center py-0.5 font-semibold">
                                Pulang
                              </span>
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 space-y-1.5 min-w-[200px]">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${loc.matchMasuk.toneClass}`}>
                          {loc.matchMasuk.label}
                        </span>
                        {loc.hasMasukCoords && (
                          <div className="text-[10px] text-slate-500 font-mono">
                            Masuk: {loc.mapsMasukUrl ? (
                              <a
                                href={loc.mapsMasukUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-blue-600 hover:underline inline-flex items-center gap-0.5"
                              >
                                {loc.titikMasuk} <ExternalLink className="w-2.5 h-2.5" />
                              </a>
                            ) : loc.titikMasuk}
                          </div>
                        )}
                        {loc.hasPulangCoords && (
                          <div className="space-y-0.5">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${loc.matchPulang.toneClass}`}>
                              Pulang: {loc.matchPulang.label}
                            </span>
                          </div>
                        )}
                        {loc.hasJobCoords ? (
                          <div className="text-[10px] text-slate-400 font-mono">
                            Target: {loc.titikProyek}
                          </div>
                        ) : (
                          <div className="text-[10px] text-amber-600 font-medium">
                            Titik GPS proyek belum disetel
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4 text-center font-black text-[#b81d52] text-sm whitespace-nowrap">
                        {item.durasi_format || `${item.durasi_jam || 0} Jam`}
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          item.status_verifikasi === 'disetujui'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : item.status_verifikasi === 'ditolak'
                            ? 'bg-rose-100 text-rose-800 border border-rose-200'
                            : 'bg-amber-100 text-amber-800 border border-amber-200'
                        }`}>
                          {item.status_verifikasi}
                        </span>
                        {item.catatan_admin && (
                          <p className="mt-1 text-[10px] text-slate-500 max-w-[150px] truncate" title={item.catatan_admin}>
                            {item.catatan_admin}
                          </p>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-1.5 flex-wrap">
                          <button
                            type="button"
                            onClick={() => setSelectedAttendance(item)}
                            className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold transition flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-blue-600" />
                            <span>Lihat Detail</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifikasiAbsensi(item.id_absensi, 'disetujui')}
                            disabled={processingId === item.id_absensi || item.status_verifikasi === 'disetujui'}
                            aria-label={`Setujui absensi ${item.nama_karyawan}`}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Setujui</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleVerifikasiAbsensi(item.id_absensi, 'ditolak')}
                            disabled={processingId === item.id_absensi || item.status_verifikasi === 'ditolak'}
                            aria-label={`Tolak absensi ${item.nama_karyawan}`}
                            className="px-3 py-1.5 rounded-lg bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition border border-rose-200 flex items-center space-x-1 disabled:opacity-40 cursor-pointer"
                          >
                            <XCircle className="w-3.5 h-3.5" />
                            <span>Tolak</span>
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

      <AbsensiInspectionDialog
        attendance={selectedAttendance}
        processing={processingId !== null && selectedAttendance?.id_absensi === processingId}
        onClose={() => setSelectedAttendance(null)}
        onVerify={handleVerifikasiAbsensi}
      />

    </div>
  );
}
