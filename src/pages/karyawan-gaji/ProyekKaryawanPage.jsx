import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Building2, 
  RefreshCw, 
  Clock, 
  Users, 
  CheckCircle2 
} from 'lucide-react';
import { RekapService } from '../../services/api';

export default function ProyekKaryawanPage({ currentUser }) {
  const [proyekList, setProyekList] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const allKontribusi = await RekapService.getKontribusi().catch(() => []);
      setProyekList(allKontribusi || []);
    } catch (err) {
      console.error('Gagal memuat data progres proyek:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [currentUser]);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA & REFRESH                                */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Portal Karyawan Lapangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="w-7 h-7 text-[#b81d52]" />
            <span>Progres Proyek & Kontribusi Tim</span>
          </h1>
          <p className="text-sm text-slate-500">
            Perbandingan jam kerja yang telah Anda selesaikan terhadap total jam seluruh tim di setiap proyek lapangan.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. DAFTAR KARTU KONTRIBUSI PROYEK                       */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6 space-y-4">
        <div className="border-b border-slate-100 pb-3 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-base">Alokasi & Progres Proyek Lapangan</h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Dihitung berdasarkan jam kerja presensi yang telah disetujui (approval) oleh admin.
            </p>
          </div>
          <span className="text-xs font-bold text-slate-500 bg-slate-100 px-3 py-1 rounded-lg">
            {proyekList.length} Proyek Aktif
          </span>
        </div>

        {loading ? (
          <div className="p-12 text-center text-slate-400">
            <RefreshCw className="w-6 h-6 animate-spin mx-auto mb-2 text-[#b81d52]" />
            <p className="text-xs">Menghitung akumulasi kontribusi proyek...</p>
          </div>
        ) : proyekList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Belum ada proyek aktif atau riwayat jam kerja yang disetujui.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
            {proyekList.map((proyek) => {
              const members = proyek.kontributor || proyek.kontribusi || [];
              const myData = members.find(
                (m) => Number(m.id_karyawan) === Number(currentUser?.id_karyawan)
              );
              const myHours = Number(myData?.jam_pekerja || myData?.total_jam_pekerja || 0);
              const totalHours = Number(proyek.total_jam_proyek || 0);
              const myPersen = totalHours > 0 ? (myHours / totalHours) * 100 : 0;
              const hasContributed = myHours > 0;

              return (
                <div
                  key={proyek.id_pekerjaan}
                  className={`p-5 rounded-2xl border transition space-y-3.5 ${
                    hasContributed
                      ? 'bg-white border-slate-200 shadow-sm hover:border-[#b81d52]'
                      : 'bg-slate-50/70 border-slate-200'
                  }`}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="text-[10px] font-bold text-[#b81d52] flex items-center space-x-1 uppercase tracking-wider">
                        <Building2 className="w-3.5 h-3.5" />
                        <span>{proyek.lokasi || 'Lokasi Lapangan'}</span>
                      </div>
                      <h4 className="font-extrabold text-slate-900 text-base mt-1">
                        {proyek.nama_pekerjaan}
                      </h4>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-slate-400 uppercase font-semibold">Kontribusi Anda</span>
                      <div className="text-lg font-black text-[#b81d52]">
                        {myPersen.toFixed(1)}%
                      </div>
                    </div>
                  </div>

                  {/* Visual Progress Bar */}
                  <div className="space-y-1">
                    <div className="w-full bg-slate-100 rounded-full h-3 overflow-hidden p-0.5 border border-slate-200/60">
                      <div
                        className="h-full rounded-full transition-all duration-500 shadow-sm"
                        style={{
                          width: `${Math.max(myPersen, 3)}%`,
                          backgroundColor: '#b81d52',
                        }}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[11px] text-slate-500 pt-1">
                      <span>Jam Anda: <strong className="text-slate-800">{myHours.toFixed(1)} Jam</strong></span>
                      <span>Total Proyek: <strong className="text-slate-800">{totalHours.toFixed(1)} Jam</strong></span>
                    </div>
                  </div>

                  {/* Team Members List */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center gap-1">
                      <Users className="w-3 h-3 text-slate-400" />
                      <span>Rekan Tim Terlibat:</span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {members.length > 0 ? (
                        members.map((k) => {
                          const isMe = Number(k.id_karyawan) === Number(currentUser?.id_karyawan);
                          return (
                            <span
                              key={k.id_karyawan}
                              className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 ${
                                isMe
                                  ? 'bg-pink-50 text-[#b81d52] border border-pink-200 font-bold'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              <span>{k.nama}</span>
                              <span className="text-[10px] opacity-75">({k.jam_pekerja || 0}j)</span>
                              {isMe && <span className="text-[9px] bg-[#b81d52] text-white px-1 rounded">Saya</span>}
                            </span>
                          );
                        })
                      ) : (
                        <span className="text-xs text-slate-400">Belum ada tim tercatat</span>
                      )}
                    </div>
                  </div>

                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
}
