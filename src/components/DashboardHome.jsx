import React, { useState, useEffect } from 'react';
import {
  Clock,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  Users,
  Wallet,
  ArrowUpRight,
  Layers,
  ChevronRight,
  Check,
  TrendingUp
} from 'lucide-react';
import { RekapService } from '../services/api';

export default function DashboardHome({ currentUser, onNavigate }) {
  const isAdmin = currentUser?.peran === 'admin';
  const [stats, setStats] = useState({
    total_pekerja: 0,
    pekerjaan_aktif: 0,
    total_pekerjaan: 0,
    absensi_menunggu: 0,
    pengeluaran_menunggu: 0,
    total_jam_bulan_ini: 0,
    total_pengeluaran_bulan_ini: 0,
  });
  const [proyekList, setProyekList] = useState([]);
  const [pekerjaList, setPekerjaList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const [dashData, kontribusiData, jamKerjaData] = await Promise.all([
        RekapService.getDashboardStats().catch(() => null),
        RekapService.getKontribusi().catch(() => []),
        isAdmin ? RekapService.getRekapJamKerja().catch(() => []) : Promise.resolve([]),
      ]);

      if (dashData) setStats(dashData);
      if (kontribusiData) setProyekList(kontribusiData);
      if (jamKerjaData) setPekerjaList(jamKerjaData);
    } catch (err) {
      console.error('Gagal memuat data dashboard:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      maximumFractionDigits: 0,
    }).format(val || 0);
  };

  const totalPending = (stats.absensi_menunggu || 0) + (stats.pengeluaran_menunggu || 0);

  return (
    <div className="space-y-6 pb-8">
      
      {/* ======================================================== */}
      {/* 1. DASHBOARD HEADER & QUICK ACTION BUTTONS              */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 mt-1">
            Ringkasan kehadiran kerja, alokasi proyek lapangan, dan status penggajian tim.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {isAdmin ? (
            <>
              <button
                type="button"
                onClick={() => onNavigate('admin/verifikasi')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition transform hover:brightness-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
                style={{ backgroundColor: '#b81d52' }}
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Pusat Approval {totalPending > 0 && `(${totalPending})`}</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('admin/gaji')}
                className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 transition shadow-sm cursor-pointer"
              >
                Hitung Gaji
              </button>
            </>
          ) : (
            <button
              type="button"
              onClick={() => onNavigate('karyawan/gaji')}
              className="px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white shadow-md transition transform hover:brightness-105 active:scale-95 flex items-center gap-1.5 cursor-pointer"
              style={{ backgroundColor: '#b81d52' }}
            >
              <Wallet className="w-4 h-4" />
              <span>Lihat Slip Gaji Saya</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. 4 KARTU STATISTIK UTAMA (KPI CARDS DARI DATABASE)    */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
        
        {/* Card 1: Total Jam Kerja (Highlight Berry Magenta) */}
        <div
          className="rounded-2xl p-5 text-white relative overflow-hidden shadow-lg transition-transform hover:-translate-y-1 cursor-pointer"
          style={{
            background: 'linear-gradient(135deg, #b81d52 0%, #981240 100%)',
          }}
          onClick={() => onNavigate(isAdmin ? 'admin/jam-kerja' : 'karyawan/presensi')}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-white/85 tracking-wide">
              {isAdmin ? 'Total Jam Terverifikasi' : 'Jam Kerja Disetujui'}
            </span>
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center text-white backdrop-blur-sm">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold mt-3 tracking-tight">
            {stats.total_jam_bulan_ini || 0} <span className="text-sm font-medium text-white/80">Jam</span>
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-white/80 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-white/20">Bulan Ini</span>
            <span>Data absensi sah</span>
          </div>
        </div>

        {/* Card 2: Pekerjaan Aktif */}
        <div
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-transform hover:-translate-y-1 cursor-pointer"
          onClick={() => onNavigate(isAdmin ? 'admin/jam-kerja' : 'karyawan/proyek')}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wide">
              Proyek Lapangan
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 mt-3 tracking-tight">
            {stats.pekerjaan_aktif || 0}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-emerald-600 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-emerald-50">Berjalan</span>
            <span className="text-slate-400">Dari total {stats.total_pekerjaan || 0} proyek</span>
          </div>
        </div>

        {/* Card 3: Menunggu Verifikasi */}
        <div
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-transform hover:-translate-y-1 cursor-pointer"
          onClick={() => onNavigate(isAdmin ? 'admin/verifikasi' : 'karyawan/presensi')}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wide">
              Menunggu Approval
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-3xl sm:text-4xl font-extrabold text-slate-800 mt-3 tracking-tight">
            {totalPending}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-amber-600 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-amber-50">
              {stats.absensi_menunggu || 0} Presensi, {stats.pengeluaran_menunggu || 0} Nota
            </span>
          </div>
        </div>

        {/* Card 4: Estimasi Upah / Beban Gaji */}
        <div
          className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm transition-transform hover:-translate-y-1 cursor-pointer"
          onClick={() => onNavigate(isAdmin ? 'admin/approval-pengeluaran' : 'karyawan/gaji')}
        >
          <div className="flex items-start justify-between">
            <span className="text-xs font-semibold text-slate-500 tracking-wide">
              {isAdmin ? 'Reimbursement Disetujui' : 'Tarif Jam Kerja'}
            </span>
            <div className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
              <ArrowUpRight className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-extrabold text-slate-800 mt-3 tracking-tight truncate">
            {formatRupiah(
              isAdmin
                ? stats.total_pengeluaran_bulan_ini || 0
                : currentUser?.tarif_per_jam || 50000
            )}
          </div>
          <div className="flex items-center gap-1.5 mt-3 text-[11px] text-slate-500 font-medium">
            <span className="px-1.5 py-0.5 rounded bg-slate-100">
              {isAdmin ? 'Uang Talangan' : 'Per Jam'}
            </span>
            <span className="text-slate-400">Bulan Ini</span>
          </div>
        </div>

      </div>

      {/* ======================================================== */}
      {/* 3. PROYEK NYATA DARI DATABASE & KONTRIBUSI TIM           */}
      {/* ======================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

        {/* Daftar Proyek Nyata dari Database */}
        <div className="lg:col-span-7 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                Proyek Lapangan Aktif
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Akumulasi durasi jam kerja terverifikasi per proyek
              </p>
            </div>
            {isAdmin && (
              <button
                type="button"
                onClick={() => onNavigate('admin/kontribusi')}
                className="text-xs font-semibold text-[#b81d52] hover:underline cursor-pointer"
              >
                Lihat Semua →
              </button>
            )}
          </div>

          <div className="space-y-4 mt-4">
            {proyekList.length === 0 ? (
              <div className="text-center py-8 text-xs text-slate-400">
                Memuat data proyek lapangan...
              </div>
            ) : (
              proyekList.slice(0, 4).map((p) => {
                const totalJam = Number(p.total_jam_proyek) || 0;
                return (
                  <div
                    key={p.id_pekerjaan}
                    className="p-4 rounded-xl border border-slate-100 hover:border-slate-200 transition bg-slate-50/40"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500" />
                        <span className="text-xs font-bold text-slate-800">
                          {p.nama_pekerjaan}
                        </span>
                      </div>
                      <span className="text-xs font-bold text-slate-700 bg-white px-2.5 py-0.5 rounded-lg border border-slate-100 shadow-sm">
                        {totalJam.toFixed(1)} Jam
                      </span>
                    </div>

                    {/* Breakdown Kontributor Singkat */}
                    <div className="flex flex-wrap items-center gap-2 mt-2 pt-2 border-t border-slate-100 text-[11px] text-slate-500">
                      <span className="font-semibold text-slate-400">Tim:</span>
                      {p.kontributor && p.kontributor.length > 0 ? (
                        p.kontributor.map((k) => (
                          <span
                            key={k.id_karyawan}
                            className="bg-white px-2 py-0.5 rounded border border-slate-100 text-slate-600 font-medium"
                          >
                            {k.nama} ({k.jam_pekerja || 0}j)
                          </span>
                        ))
                      ) : (
                        <span className="text-slate-400">Belum ada catatan jam</span>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Daftar Pekerja / Ringkasan Karyawan Real */}
        <div className="lg:col-span-5 bg-white rounded-2xl p-6 border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm font-bold text-slate-800 tracking-wide">
                  {isAdmin ? 'Rekap Jam Kerja Tim' : 'Ringkasan Pekerja Anda'}
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Jam disetujui & tarif aktif
                </p>
              </div>
              <span className="text-[11px] font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                Bulan Ini
              </span>
            </div>

            <div className="space-y-3.5 mt-3">
              {isAdmin && pekerjaList.length > 0 ? (
                pekerjaList.map((k) => (
                  <div
                    key={k.id_karyawan}
                    className="flex items-center justify-between py-2 border-b border-slate-50 last:border-none"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-xs font-bold text-slate-700">
                        👷
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-800">{k.nama}</div>
                        <div className="text-[10px] text-slate-400">{k.jabatan}</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-extrabold text-[#b81d52]">
                        {k.jam_disetujui || 0} Jam
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatRupiah(k.estimasi_upah || 0)}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 rounded-xl bg-slate-50 border border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Nama Pekerja:</span>
                    <span className="font-bold text-slate-800">{currentUser?.nama}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Jabatan:</span>
                    <span className="font-bold text-slate-800">{currentUser?.jabatan}</span>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Tarif per Jam:</span>
                    <span className="font-extrabold text-emerald-600">
                      {formatRupiah(currentUser?.tarif_per_jam || 50000)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-xs pt-2 border-t border-slate-200/80">
                    <span className="text-slate-500">Total Jam Disetujui:</span>
                    <span className="font-extrabold text-[#b81d52]">
                      {stats.total_jam_bulan_ini || 0} Jam
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Tombol Akses Cepat Modul */}
          <div className="mt-5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={() => onNavigate(isAdmin ? 'admin/jam-kerja' : 'karyawan/gaji')}
              className="w-full py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-white bg-slate-100 hover:bg-[#b81d52] transition flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <span>{isAdmin ? 'Buka Rekap Jam Kerja Seluruh Pekerja' : 'Buka Rincian Slip Gaji'}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

      </div>

    </div>
  );
}
