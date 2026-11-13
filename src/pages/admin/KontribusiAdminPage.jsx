import React, { useState, useEffect } from 'react';
import { 
  Layers, 
  Building2, 
  RefreshCw, 
  Users, 
  Clock 
} from 'lucide-react';
import { RekapService } from '../../services/api';

export default function KontribusiAdminPage({ currentUser }) {
  const [kontribusiData, setKontribusiData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RekapService.getKontribusi();
      setKontribusiData(data || []);
    } catch (err) {
      console.error('Gagal memuat kontribusi proyek:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const formatRupiah = (val) => {
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(val || 0);
  };

  const totalJamSemuaProyek = kontribusiData.reduce(
    (acc, curr) => acc + (Number(curr.total_jam_proyek) || 0),
    0
  );

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA                                          */}
      {/* ======================================================== */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Analisis Eksekutif Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Layers className="w-7 h-7 text-[#b81d52]" />
            <span>Persentase Kontribusi Tim per Proyek</span>
          </h1>
          <p className="text-sm text-slate-500">
            Kalkulasi otomatis distribusi kontribusi individu di setiap proyek multi-hari berdasarkan jam kerja sah yang disetujui.
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

      {/* Summary KPI Badges */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jam Kerja Terverifikasi</div>
            <div className="text-2xl font-extrabold text-[#b81d52] mt-1">
              {totalJamSemuaProyek.toFixed(2)} <span className="text-sm font-normal text-slate-400">Jam</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-pink-50 flex items-center justify-center text-[#b81d52]">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Jumlah Proyek Lapangan</div>
            <div className="text-2xl font-extrabold text-slate-800 mt-1">
              {kontribusiData.length} <span className="text-sm font-normal text-slate-400">Proyek</span>
            </div>
          </div>
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700">
            <Building2 className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. GRID KARTU KONTRIBUSI PROYEK                         */}
      {/* ======================================================== */}
      {loading ? (
        <div className="p-16 text-center text-slate-400">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-[#b81d52]" />
          <p className="text-sm">Menghitung akumulasi data kontribusi proyek...</p>
        </div>
      ) : kontribusiData.length === 0 ? (
        <div className="p-12 text-center text-slate-400 bg-white rounded-2xl border border-slate-200 text-sm">
          Belum ada proyek lapangan yang memiliki jam kerja disetujui.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {kontribusiData.map((proyek) => {
            const totalJam = Number(proyek.total_jam_proyek) || 0;
            return (
              <div key={proyek.id_pekerjaan} className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm space-y-4">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-xs font-semibold text-[#b81d52] flex items-center space-x-1 mb-1">
                      <Building2 className="w-3.5 h-3.5" />
                      <span>{proyek.lokasi || 'Lokasi Lapangan'}</span>
                    </div>
                    <h3 className="font-bold text-slate-800 text-base">{proyek.nama_pekerjaan}</h3>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-semibold text-slate-400">Total Tim:</span>
                    <div className="text-lg font-black text-slate-800">{totalJam.toFixed(2)} Jam</div>
                  </div>
                </div>

                <div className="space-y-3 pt-2 border-t border-slate-100">
                  {(() => {
                    const members = proyek.kontribusi || proyek.kontributor || [];
                    return (
                      <>
                        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                          <span>Distribusi Kontribusi Anggota:</span>
                          <span>{members.length} Pekerja</span>
                        </div>

                        {members.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-2">
                            Belum ada jam kerja yang tercatat/disetujui pada proyek ini.
                          </div>
                        ) : (
                          members.map((item) => {
                            const persen = Number(item.persentase) || 0;
                            const durasi = Number(item.total_jam_pekerja ?? item.jam_pekerja ?? 0);
                            const upah = Number(item.estimasi_upah ?? (durasi * Number(item.tarif_per_jam || 50000)));
                            return (
                              <div key={item.id_karyawan} className="space-y-1 bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                                <div className="flex justify-between items-center text-xs">
                                  <div>
                                    <span className="font-bold text-slate-800">{item.nama}</span>
                                    <span className="text-slate-400 text-[11px] ml-1.5">({item.jabatan})</span>
                                  </div>
                                  <div className="font-black text-[#b81d52]">{persen.toFixed(1)}%</div>
                                </div>

                                {/* Progress bar */}
                                <div className="w-full bg-slate-200 rounded-full h-2 overflow-hidden">
                                  <div
                                    className="h-2 rounded-full transition-all duration-500"
                                    style={{
                                      width: `${Math.min(persen, 100)}%`,
                                      backgroundColor: '#b81d52'
                                    }}
                                  />
                                </div>

                                <div className="flex justify-between items-center text-[10px] text-slate-500 pt-0.5">
                                  <span>Durasi Disetujui: <strong>{durasi.toFixed(2)} Jam</strong></span>
                                  <span>Estimasi Upah: <strong>{formatRupiah(upah)}</strong></span>
                                </div>
                              </div>
                            );
                          })
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>
            );
          })}
        </div>
      )}

    </div>
  );
}
