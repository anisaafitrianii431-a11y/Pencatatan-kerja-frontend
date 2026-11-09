import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  Clock, 
  Wallet, 
  Receipt, 
  CheckCircle2, 
  RefreshCw, 
  AlertCircle, 
  Check, 
  ArrowRight,
  Plus,
  Camera,
  Eye,
  X
} from 'lucide-react';
import { AbsensiService, PengeluaranService, PekerjaanService, getFileUrl } from '../../services/api';
import Modal from '../../components/Modal';

export default function PresensiKaryawanPage({ currentUser }) {
  const [selectedPeriode, setSelectedPeriode] = useState(new Date().toISOString().slice(0, 7));
  const [rawAbsensiList, setRawAbsensiList] = useState([]);
  const [rawPengeluaranList, setRawPengeluaranList] = useState([]);
  const [proyekList, setProyekList] = useState([]);

  const [personalStats, setPersonalStats] = useState({
    total_jam: 0,
    total_upah: 0,
    reimburs_belum: 0,
    reimburs_sudah: 0,
    total_sesi: 0
  });

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  // Modals State
  const [isMasukModalOpen, setIsMasukModalOpen] = useState(false);
  const [isPulangModalOpen, setIsPulangModalOpen] = useState(false);
  const [isKlaimModalOpen, setIsKlaimModalOpen] = useState(false);
  const [selectedFotoModal, setSelectedFotoModal] = useState(null);

  // Form Inputs: Presensi Masuk
  const [masukProyekId, setMasukProyekId] = useState('');
  const [masukJam, setMasukJam] = useState(new Date().toTimeString().slice(0, 5));
  const [masukCatatan, setMasukCatatan] = useState('');

  // Form Inputs: Presensi Pulang
  const [pulangJam, setPulangJam] = useState(new Date().toTimeString().slice(0, 5));

  // Form Inputs: Klaim Pengeluaran Material & Foto Kwitansi
  const [klaimProyekId, setKlaimProyekId] = useState('');
  const [klaimNominal, setKlaimNominal] = useState('');
  const [klaimKeterangan, setKlaimKeterangan] = useState('');
  const [klaimFotoBase64, setKlaimFotoBase64] = useState('');
  const [klaimFotoPreview, setKlaimFotoPreview] = useState('');

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const [absensiData, pengeluaranData, jobs] = await Promise.all([
        AbsensiService.getAll({ id_karyawan: currentUser?.id_karyawan }).catch(() => []),
        PengeluaranService.getAll({ id_karyawan: currentUser?.id_karyawan }).catch(() => []),
        PekerjaanService.getAll().catch(() => []),
      ]);

      setRawAbsensiList(absensiData || []);
      setRawPengeluaranList(pengeluaranData || []);
      setProyekList(jobs || []);
      if (jobs?.length > 0 && !masukProyekId) {
        setMasukProyekId(jobs[0].id_pekerjaan);
        setKlaimProyekId(jobs[0].id_pekerjaan);
      }

      // Hitung ringkasan personal bulan ini
      const monthAbsensi = (absensiData || []).filter(
        a => a.status_verifikasi === 'disetujui' && a.tanggal?.startsWith(selectedPeriode)
      );
      const totalJam = monthAbsensi.reduce((acc, curr) => acc + (Number(curr.durasi_jam) || 0), 0);
      const tarif = Number(currentUser?.tarif_per_jam) || 50000;
      const totalUpah = totalJam * tarif;

      const monthExpenses = (pengeluaranData || []).filter(
        p => p.jenis_dana === 'pribadi' && p.status_verifikasi === 'disetujui' && p.tanggal?.startsWith(selectedPeriode)
      );
      const reimbursBelum = monthExpenses
        .filter(p => p.status_ganti === 'belum')
        .reduce((acc, curr) => acc + Number(curr.nominal), 0);
      const reimbursSudah = monthExpenses
        .filter(p => p.status_ganti === 'sudah')
        .reduce((acc, curr) => acc + Number(curr.nominal), 0);

      setPersonalStats({
        total_jam: totalJam,
        total_upah: totalUpah,
        reimburs_belum: reimbursBelum,
        reimburs_sudah: reimbursSudah,
        total_sesi: monthAbsensi.length
      });
    } catch (err) {
      console.error('Gagal memuat data presensi karyawan:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [selectedPeriode, currentUser]);

  // Sesi absensi hari ini
  const todayStr = new Date().toISOString().slice(0, 10);
  const todaySession = rawAbsensiList.find(a => a.tanggal === todayStr);
  const isWorkingNow = todaySession && !todaySession.jam_pulang;
  const isFinishedToday = todaySession && todaySession.jam_pulang;

  // Aksi 1: Submit Presensi Masuk
  const handleCatatMasuk = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    try {
      await AbsensiService.absenMasuk({
        id_pekerjaan: masukProyekId || null,
        id_karyawan: currentUser?.id_karyawan,
        tanggal: todayStr,
        jam_masuk: masukJam + ':00',
        catatan: masukCatatan
      });
      setSuccessMsg('Presensi masuk berhasil dicatat! Status: Menunggu approval admin.');
      setIsMasukModalOpen(false);
      setMasukCatatan('');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat presensi masuk');
    } finally {
      setSubmitting(false);
    }
  };

  // Aksi 2: Submit Presensi Pulang
  const handleCatatPulang = async (e) => {
    e.preventDefault();
    if (!todaySession?.id_absensi) return;
    setSubmitting(true);
    setErrorMsg('');
    try {
      await AbsensiService.absenPulang(todaySession.id_absensi, pulangJam + ':00');
      setSuccessMsg('Presensi pulang berhasil dicatat! Durasi kerja hari ini selesai.');
      setIsPulangModalOpen(false);
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mencatat jam pulang');
    } finally {
      setSubmitting(false);
    }
  };

  // Handler Foto Nota Kwitansi
  const handleFotoChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran file foto maksimal 5 MB');
      return;
    }
    const reader = new FileReader();
    reader.onloadend = () => {
      setKlaimFotoBase64(reader.result);
      setKlaimFotoPreview(reader.result);
    };
    reader.readAsDataURL(file);
  };

  // Aksi 3: Submit Klaim Pengeluaran Material Pribadi
  const handleCatatKlaim = async (e) => {
    e.preventDefault();
    const nom = parseFloat(klaimNominal);
    if (!nom || nom <= 0) {
      setErrorMsg('Nominal pengeluaran harus lebih dari 0.');
      return;
    }
    setSubmitting(true);
    setErrorMsg('');
    try {
      await PengeluaranService.create({
        id_pekerjaan: klaimProyekId || null,
        id_karyawan: currentUser?.id_karyawan,
        tanggal: todayStr,
        nominal: nom,
        jenis_dana: 'pribadi',
        keterangan: klaimKeterangan,
        foto_kwitansi: klaimFotoBase64 || null
      });
      setSuccessMsg('Klaim uang pribadi & bukti nota berhasil diajukan! Akan diperiksa admin.');
      setIsKlaimModalOpen(false);
      setKlaimNominal('');
      setKlaimKeterangan('');
      setKlaimFotoBase64('');
      setKlaimFotoPreview('');
      loadData();
      setTimeout(() => setSuccessMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Gagal mengajukan klaim pengeluaran');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA & FILTER BULAN                           */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Portal Karyawan Lapangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Clock className="w-7 h-7 text-[#b81d52]" />
            <span>Presensi & Jam Kerja</span>
          </h1>
          <p className="text-sm text-slate-500">
            Catat jam kedatangan/kepulangan harian dan ajukan nota talangan belanja material.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="month"
            value={selectedPeriode}
            onChange={(e) => setSelectedPeriode(e.target.value)}
            className="text-xs font-bold bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-800 shadow-sm focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
          />
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Alert Notifikasi Sukses / Gagal */}
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
      {/* 2. STEPPER WORKFLOW ALUR KERJA HARI INI                 */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-base font-extrabold text-slate-800 flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#b81d52]" />
              <span>Alur Kerja Hari Ini ({todayStr})</span>
            </h2>
            <p className="text-xs text-slate-400">
              Ikuti tahapan kerja agar jam kerja dan klaim uang belanja Anda terekam otomatis di slip gaji.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsKlaimModalOpen(true)}
            className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-[#b81d52] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <Receipt className="w-4 h-4" />
            <span>+ Klaim Uang Material Pribadi</span>
          </button>
        </div>

        {/* Stepper 5 Kolom */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 pt-1">
          
          {/* Langkah 1 */}
          <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
            todaySession ? 'bg-emerald-50/60 border-emerald-200' : 'bg-slate-50 border-slate-200'
          }`}>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Langkah 1
              </div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                {todaySession ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px]">1</span>
                )}
                <span>Presensi Masuk</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {todaySession
                  ? `Masuk: ${todaySession.jam_masuk?.slice(0, 5)} WIB`
                  : 'Catat jam kedatangan di proyek.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60">
              {!todaySession ? (
                <button
                  type="button"
                  onClick={() => setIsMasukModalOpen(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white shadow transition cursor-pointer"
                  style={{ backgroundColor: '#b81d52' }}
                >
                  Absen Masuk
                </button>
              ) : (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                  ✓ Sudah Masuk
                </span>
              )}
            </div>
          </div>

          {/* Langkah 2 */}
          <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
            isWorkingNow ? 'bg-blue-50/60 border-blue-200 ring-2 ring-blue-400/20' : isFinishedToday ? 'bg-slate-50 border-slate-200' : 'bg-slate-50 border-slate-100 opacity-70'
          }`}>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Langkah 2
              </div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                {isWorkingNow ? (
                  <span className="w-2.5 h-2.5 rounded-full bg-blue-500 animate-pulse shrink-0" />
                ) : isFinishedToday ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px]">2</span>
                )}
                <span>Bekerja di Proyek</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {isWorkingNow ? (
                  <span className="font-semibold text-blue-700">Sedang berlangsung di {todaySession?.nama_pekerjaan || 'Proyek'}</span>
                ) : isFinishedToday ? (
                  'Shift selesai tuntas.'
                ) : (
                  'Mulai setelah absen masuk.'
                )}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 text-[10px] text-slate-400">
              {isWorkingNow ? '🕒 Sesi Berjalan' : '-'}
            </div>
          </div>

          {/* Langkah 3 */}
          <div className={`p-4 rounded-xl border transition flex flex-col justify-between ${
            isFinishedToday ? 'bg-emerald-50/60 border-emerald-200' : isWorkingNow ? 'bg-amber-50/60 border-amber-200' : 'bg-slate-50 border-slate-100 opacity-70'
          }`}>
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Langkah 3
              </div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                {isFinishedToday ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                ) : (
                  <span className="w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px]">3</span>
                )}
                <span>Presensi Pulang</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {isFinishedToday
                  ? `Pulang: ${todaySession.jam_pulang?.slice(0, 5)} WIB (${todaySession.durasi_jam || 0} Jam)`
                  : isWorkingNow
                  ? 'Klik saat selesai jam kerja.'
                  : 'Kunci jam pulang.'}
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60">
              {isWorkingNow ? (
                <button
                  type="button"
                  onClick={() => setIsPulangModalOpen(true)}
                  className="w-full py-1.5 rounded-lg text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 shadow transition cursor-pointer"
                >
                  Absen Pulang
                </button>
              ) : isFinishedToday ? (
                <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md inline-block">
                  ✓ Selesai ({todaySession.durasi_jam || 0} Jam)
                </span>
              ) : (
                <span className="text-[10px] text-slate-400">Menunggu</span>
              )}
            </div>
          </div>

          {/* Langkah 4 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Langkah 4
              </div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <span className="w-4 h-4 rounded-full bg-slate-300 text-white flex items-center justify-center text-[10px]">4</span>
                <span>Pusat Approval</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Admin memverifikasi jam kerja & nota talangan material Anda.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60 flex items-center justify-between text-[10px]">
              <span className="text-slate-400">Status Hari Ini:</span>
              <span className={`font-bold px-1.5 py-0.5 rounded ${
                todaySession?.status_verifikasi === 'disetujui'
                  ? 'bg-emerald-100 text-emerald-700'
                  : todaySession?.status_verifikasi === 'ditolak'
                  ? 'bg-rose-100 text-rose-700'
                  : 'bg-amber-100 text-amber-700'
              }`}>
                {todaySession?.status_verifikasi || 'Belum ada'}
              </span>
            </div>
          </div>

          {/* Langkah 5 */}
          <div className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex flex-col justify-between">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Langkah 5
              </div>
              <div className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                <Wallet className="w-4 h-4 text-[#b81d52] shrink-0" />
                <span>Slip Gaji Sah</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                Upah jam disetujui + reimburse uang pribadi dicairkan.
              </p>
            </div>
            <div className="mt-3 pt-2 border-t border-slate-200/60">
              <Link
                to="/karyawan/gaji"
                className="w-full py-1.5 rounded-lg text-xs font-bold text-[#b81d52] bg-pink-50 hover:bg-pink-100 border border-pink-200 transition text-center block no-underline"
              >
                Buka Slip Gaji →
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. 4 STATS CARDS REAL DARI DATABASE                     */}
      {/* ======================================================== */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Jam Disetujui ({selectedPeriode})</div>
          <div className="text-2xl sm:text-3xl font-extrabold text-[#b81d52] mt-1">
            {personalStats.total_jam.toFixed(2)} <span className="text-xs font-normal text-slate-400">Jam</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">{personalStats.total_sesi} sesi kerja tervalidasi</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs font-semibold text-emerald-700 uppercase tracking-wider">Estimasi Upah Kerja</div>
          <div className="text-2xl font-extrabold text-emerald-600 mt-1">
            {formatRupiah(personalStats.total_upah)}
          </div>
          <div className="text-xs text-emerald-700 mt-1">Tarif: {formatRupiah(currentUser?.tarif_per_jam || 50000)}/jam</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-sm">
          <div className="text-xs font-semibold text-amber-700 uppercase tracking-wider">Reimbursement Belum Cair</div>
          <div className="text-2xl font-extrabold text-amber-600 mt-1">
            {formatRupiah(personalStats.reimburs_belum)}
          </div>
          <div className="text-xs text-amber-700 mt-1">Uang talangan material pribadi</div>
        </div>

        <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Estimasi Penerimaan</div>
          <div className="text-2xl font-extrabold text-slate-800 mt-1">
            {formatRupiah(personalStats.total_upah + personalStats.reimburs_belum)}
          </div>
          <div className="text-xs text-slate-500 mt-1">Upah + Penggantian biaya</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. TABEL RIWAYAT PRESENSI & REIMBURSEMENT               */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Riwayat Presensi Jam Kerja</h3>
            <span className="text-[11px] text-slate-400">{rawAbsensiList.length} Catatan</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2 font-semibold">Tanggal</th>
                  <th className="py-2 font-semibold">Proyek</th>
                  <th className="py-2 font-semibold">Jam</th>
                  <th className="py-2 font-semibold">Durasi</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rawAbsensiList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      Belum ada catatan presensi. Klik "Absen Masuk" untuk memulai.
                    </td>
                  </tr>
                ) : (
                  rawAbsensiList.slice(0, 5).map((a) => (
                    <tr key={a.id_absensi} className="hover:bg-slate-50/70">
                      <td className="py-2.5 font-medium">{a.tanggal}</td>
                      <td className="py-2.5 font-semibold text-slate-800">{a.nama_pekerjaan || 'Umum'}</td>
                      <td className="py-2.5 text-slate-500 font-mono">
                        {a.jam_masuk?.slice(0, 5)} - {a.jam_pulang ? a.jam_pulang.slice(0, 5) : 'Bekerja...'}
                      </td>
                      <td className="py-2.5 font-bold text-[#b81d52]">{a.durasi_jam || 0} Jam</td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          a.status_verifikasi === 'disetujui'
                            ? 'bg-emerald-100 text-emerald-700'
                            : a.status_verifikasi === 'ditolak'
                            ? 'bg-rose-100 text-rose-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {a.status_verifikasi}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 shadow-sm p-5 space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h3 className="font-bold text-slate-800 text-sm">Klaim Uang Pribadi (Reimburse)</h3>
            <span className="text-[11px] text-slate-400">{rawPengeluaranList.length} Nota</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-slate-400 uppercase tracking-wider text-[10px]">
                  <th className="py-2 font-semibold">Tanggal</th>
                  <th className="py-2 font-semibold">Keterangan</th>
                  <th className="py-2 font-semibold">Nominal</th>
                  <th className="py-2 font-semibold text-center">Nota</th>
                  <th className="py-2 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {rawPengeluaranList.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-6 text-center text-slate-400">
                      Belum ada klaim nota belanja material pribadi.
                    </td>
                  </tr>
                ) : (
                  rawPengeluaranList.slice(0, 5).map((p) => (
                    <tr key={p.id_pengeluaran} className="hover:bg-slate-50/70">
                      <td className="py-2.5 text-slate-500">{p.tanggal}</td>
                      <td className="py-2.5 font-medium truncate max-w-[120px]">{p.keterangan || 'Material Proyek'}</td>
                      <td className="py-2.5 font-bold text-amber-700">{formatRupiah(p.nominal)}</td>
                      <td className="py-2.5 text-center">
                        {p.foto_kwitansi ? (
                          <button
                            type="button"
                            onClick={() => setSelectedFotoModal(getFileUrl(p.foto_kwitansi))}
                            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold bg-pink-50 text-[#b81d52] border border-pink-200 hover:bg-pink-100 transition cursor-pointer"
                            title="Lihat Foto Struk / Nota"
                          >
                            <Eye className="w-3 h-3" />
                            <span>Nota</span>
                          </button>
                        ) : (
                          <span className="text-[10px] text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          p.status_ganti === 'sudah'
                            ? 'bg-emerald-100 text-emerald-700'
                            : p.status_verifikasi === 'disetujui'
                            ? 'bg-blue-100 text-blue-700'
                            : 'bg-amber-100 text-amber-700'
                        }`}>
                          {p.status_ganti === 'sudah' ? 'Cair' : p.status_verifikasi === 'disetujui' ? 'Disetujui' : 'Menunggu'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODAL 1: FORM PRESENSI MASUK                             */}
      {/* ======================================================== */}
      <Modal
        isOpen={isMasukModalOpen}
        onClose={() => setIsMasukModalOpen(false)}
        title="Catat Presensi Masuk Kerja"
      >
        <form onSubmit={handleCatatMasuk} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Pilih Proyek Penugasan:
            </label>
            <select
              value={masukProyekId}
              onChange={(e) => setMasukProyekId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              required
            >
              {proyekList.map((p) => (
                <option key={p.id_pekerjaan} value={p.id_pekerjaan}>
                  {p.nama_pekerjaan} ({p.lokasi || 'Lapangan'})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Tanggal:</label>
              <input
                type="date"
                value={todayStr}
                disabled
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-slate-100 text-slate-600 font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Jam Masuk:</label>
              <input
                type="time"
                value={masukJam}
                onChange={(e) => setMasukJam(e.target.value)}
                className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
                required
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Catatan Pekerjaan (Opsional):
            </label>
            <textarea
              value={masukCatatan}
              onChange={(e) => setMasukCatatan(e.target.value)}
              rows="2"
              placeholder="Contoh: Pemasangan kabel UTP lantai 2"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsMasukModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-white font-bold transition shadow cursor-pointer"
              style={{ backgroundColor: '#b81d52' }}
            >
              {submitting ? 'Menyimpan...' : 'Kirim Presensi Masuk'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 2: FORM PRESENSI PULANG                            */}
      {/* ======================================================== */}
      <Modal
        isOpen={isPulangModalOpen}
        onClose={() => setIsPulangModalOpen(false)}
        title="Catat Jam Pulang Selesai Kerja"
      >
        <form onSubmit={handleCatatPulang} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-blue-50 border border-blue-200 text-blue-900 leading-relaxed">
            <div>Sesi masuk Anda tercatat pada: <strong>{todaySession?.jam_masuk?.slice(0, 5)} WIB</strong></div>
            <div className="text-[11px] text-blue-700 mt-1">
              Catat jam pulang Anda sekarang untuk menghitung total jam kerja hari ini secara otomatis.
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Jam Pulang:</label>
            <input
              type="time"
              value={pulangJam}
              onChange={(e) => setPulangJam(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-mono font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              required
            />
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsPulangModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-white font-bold bg-amber-600 hover:bg-amber-700 transition shadow cursor-pointer"
            >
              {submitting ? 'Menyimpan...' : 'Konfirmasi Jam Pulang'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 3: FORM KLAIM NOTA MATERIAL PRIBADI                */}
      {/* ======================================================== */}
      <Modal
        isOpen={isKlaimModalOpen}
        onClose={() => setIsKlaimModalOpen(false)}
        title="Klaim Pengeluaran Uang Pribadi (Reimbursement)"
      >
        <form onSubmit={handleCatatKlaim} className="space-y-4 text-xs">
          <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 leading-relaxed">
            Gunakan form ini jika Anda menalangi pembelian material mendesak dengan <strong>uang pribadi</strong>. Nominal ini akan otomatis masuk antrean Pusat Approval admin dan dicairkan pada slip gaji Anda.
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Untuk Proyek:
            </label>
            <select
              value={klaimProyekId}
              onChange={(e) => setKlaimProyekId(e.target.value)}
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              required
            >
              {proyekList.map((p) => (
                <option key={p.id_pekerjaan} value={p.id_pekerjaan}>
                  {p.nama_pekerjaan} ({p.lokasi || 'Lapangan'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nominal Pengeluaran (Rp):
            </label>
            <input
              type="number"
              value={klaimNominal}
              onChange={(e) => setKlaimNominal(e.target.value)}
              placeholder="Contoh: 150000"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              required
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Keterangan Belanja / Nota Material:
            </label>
            <textarea
              value={klaimKeterangan}
              onChange={(e) => setKlaimKeterangan(e.target.value)}
              rows="2"
              placeholder="Contoh: Beli pipa PVC 2 batang & semen instan mendesak"
              className="w-full p-2.5 rounded-xl border border-slate-200 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#b81d52]"
              required
            />
          </div>

          {/* Upload Foto Struk / Nota Fisik */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Foto Struk / Nota Fisik Belanja (Unggah Kamera/Galeri):
            </label>
            {!klaimFotoPreview ? (
              <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-slate-300 hover:border-[#b81d52] rounded-xl cursor-pointer bg-slate-50 hover:bg-pink-50/40 transition">
                <Camera className="w-6 h-6 text-slate-400 mb-1" />
                <span className="text-xs font-semibold text-slate-700">Ambil Foto atau Pilih File Nota</span>
                <span className="text-[10px] text-slate-400 mt-0.5">JPG, PNG, WEBP (Maksimal 5MB)</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFotoChange}
                  className="hidden"
                />
              </label>
            ) : (
              <div className="p-2.5 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img
                    src={klaimFotoPreview}
                    alt="Preview Nota"
                    className="w-14 h-14 object-cover rounded-lg border border-slate-200 shadow-sm"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">Foto Nota Terlampir</span>
                    <span className="text-[10px] text-emerald-600 font-semibold">✓ Siap diverifikasi oleh Admin</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setKlaimFotoBase64('');
                    setKlaimFotoPreview('');
                  }}
                  className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 text-xs font-bold cursor-pointer"
                  title="Hapus / Ganti Foto"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>

          <div className="pt-2 flex justify-end space-x-2">
            <button
              type="button"
              onClick={() => setIsKlaimModalOpen(false)}
              className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 rounded-xl text-white font-bold transition shadow cursor-pointer"
              style={{ backgroundColor: '#b81d52' }}
            >
              {submitting ? 'Mengajukan...' : 'Ajukan Klaim & Unggah Nota'}
            </button>
          </div>
        </form>
      </Modal>

      {/* ======================================================== */}
      {/* MODAL 4: LIHAT FOTO NOTA FISIK                           */}
      {/* ======================================================== */}
      <Modal
        isOpen={!!selectedFotoModal}
        onClose={() => setSelectedFotoModal(null)}
        title="Bukti Struk / Nota Fisik Belanja"
      >
        <div className="space-y-4">
          <div className="max-h-[65vh] overflow-auto flex items-center justify-center bg-slate-100 rounded-xl p-2 border border-slate-200">
            {selectedFotoModal && (
              <img
                src={selectedFotoModal}
                alt="Foto Nota Lengkap"
                className="max-h-[55vh] max-w-full rounded-lg shadow-md object-contain"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <a
              href={selectedFotoModal}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-2 text-xs font-bold bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition"
            >
              Buka Ukuran Asli ↗
            </a>
            <button
              type="button"
              onClick={() => setSelectedFotoModal(null)}
              className="px-4 py-2 text-xs font-bold bg-slate-100 text-slate-700 rounded-xl hover:bg-slate-200 transition cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </Modal>

    </div>
  );
}
