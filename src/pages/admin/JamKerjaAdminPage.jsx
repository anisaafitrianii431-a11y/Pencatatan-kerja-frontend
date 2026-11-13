import React, { useState, useEffect } from 'react';
import { 
  Users, 
  Clock, 
  RefreshCw, 
  Wallet,
  Briefcase,
  Printer
} from 'lucide-react';
import { RekapService } from '../../services/api';
import PrintHeader from '../../components/PrintHeader';
import PrintSignatures from '../../components/PrintSignatures';
import { generateNoDokumen, formatTanggalCetak } from '../../utils/printHelpers';

export default function JamKerjaAdminPage({ currentUser }) {
  const [jamKerjaData, setJamKerjaData] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const data = await RekapService.getRekapJamKerja();
      setJamKerjaData(data || []);
    } catch (err) {
      console.error('Gagal memuat rekap jam kerja:', err);
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

  const grandTotalJam = jamKerjaData.reduce((acc, curr) => acc + (Number(curr.total_jam ?? curr.jam_disetujui) || 0), 0);
  const grandTotalUpah = jamKerjaData.reduce((acc, curr) => acc + (Number(curr.total_upah ?? curr.estimasi_upah) || 0), 0);

  return (
    <div className="space-y-6">
      
      {/* ======================================================== */}
      {/* 1. HEADER UTAMA (LAYAR WEB SAJA)                         */}
      {/* ======================================================== */}
      <div className="no-print flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-pink-100 text-[#b81d52] mb-1">
            <span>Analisis Eksekutif Admin</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-800 flex items-center space-x-2">
            <Users className="w-7 h-7 text-[#b81d52]" />
            <span>Rekapitulasi Jam Kerja Seluruh Pekerja</span>
          </h1>
          <p className="text-sm text-slate-500">
            Akumulasi total jam kerja tervalidasi dan estimasi upah seluruh tenaga kerja lapangan.
          </p>
        </div>

        <div className="flex items-center space-x-2 self-start sm:self-auto">
          <button
            onClick={loadData}
            className="p-2.5 text-slate-600 hover:text-[#b81d52] bg-white border border-slate-200 rounded-xl transition shadow-sm cursor-pointer"
            title="Segarkan Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl shadow-sm transition flex items-center space-x-1.5 cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Cetak Rekap Jam (PDF)</span>
          </button>
        </div>
      </div>

      {/* KPI Cards (Layar Web Saja) */}
      <div className="no-print grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Jam Kerja Terverifikasi</div>
          <div className="text-2xl font-black text-[#b81d52] mt-1">
            {grandTotalJam.toFixed(2)} <span className="text-sm font-normal text-slate-400">Jam</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Akumulasi seluruh pekerja</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-sm">
          <div className="text-xs font-bold text-emerald-700 uppercase tracking-wider">Total Akumulasi Upah Jam</div>
          <div className="text-2xl font-black text-emerald-600 mt-1">
            {formatRupiah(grandTotalUpah)}
          </div>
          <div className="text-xs text-emerald-700 mt-1">Berdasarkan tarif jam pekerja</div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenaga Kerja Aktif</div>
          <div className="text-2xl font-black text-slate-800 mt-1">
            {jamKerjaData.length} <span className="text-sm font-normal text-slate-400">Pekerja</span>
          </div>
          <div className="text-xs text-slate-500 mt-1">Tercatat dalam sistem</div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KOP SURAT PRINT ONLY (KETIKA DICETAK)                    */}
      {/* ======================================================== */}
      <div className="print-only">
        <PrintHeader 
          title="LAPORAN REKAPITULASI TOTAL JAM KERJA SELURUH PEKERJA"
          subtitle="Audit Verifikasi Akumulasi Jam Kerja Mandor Lapangan & Perhitungan Nilai Hak Upah Pokok"
          noDokumen={generateNoDokumen('REKAP-JAM', new Date().toISOString().slice(0, 7), 'TIM')}
          periode={new Date().toISOString().slice(0, 7)}
        />
      </div>

      {/* ======================================================== */}
      {/* 2. TABEL REKAP JAM KERJA TIM                             */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden print-avoid-break">
        <div className="no-print p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Akumulasi Jam Kerja Seluruh Tenaga Kerja</h3>
            <p className="text-xs text-slate-500">Dasar perhitungan penggajian bulanan dari jam kerja yang telah diaudit & disetujui admin.</p>
          </div>
          <span className="text-xs font-semibold px-3 py-1 bg-slate-100 rounded-lg text-slate-700">
            {jamKerjaData.length} Pekerja
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 text-slate-600 uppercase font-bold border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-3 text-center w-8">No</th>
                <th className="py-2.5 px-4">Nama Pekerja</th>
                <th className="py-2.5 px-4">Jabatan</th>
                <th className="py-2.5 px-4 text-right">Tarif / Jam</th>
                <th className="py-2.5 px-4 text-center">Jumlah Sesi Disetujui</th>
                <th className="py-2.5 px-4 text-center">Total Jam Kerja</th>
                <th className="py-2.5 px-4 text-right font-bold text-slate-700">Total Akumulasi Upah</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Memuat data rekap jam kerja...
                  </td>
                </tr>
              ) : jamKerjaData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-12 text-center text-slate-400">
                    Belum ada catatan jam kerja yang disetujui.
                  </td>
                </tr>
              ) : (
                jamKerjaData.map((worker, idx) => (
                  <tr key={worker.id_karyawan} className="hover:bg-slate-50/70 transition">
                    <td className="py-2.5 px-3 text-center font-bold text-slate-400">{idx + 1}</td>
                    <td className="py-2.5 px-4 font-bold text-slate-800 whitespace-nowrap">
                      <span>{worker.nama}</span>
                    </td>
                    <td className="py-2.5 px-4 text-slate-600">{worker.jabatan || 'Pekerja Lapangan'}</td>
                    <td className="py-2.5 px-4 text-right font-medium text-slate-700">
                      {formatRupiah(worker.tarif_per_jam)}
                    </td>
                    <td className="py-2.5 px-4 text-center font-semibold text-slate-700">
                      {worker.jumlah_sesi_disetujui ?? worker.total_sesi_kerja ?? 0} Sesi
                    </td>
                    <td className="py-2.5 px-4 text-center font-black text-[#b81d52]">
                      {Number(worker.total_jam ?? worker.jam_disetujui ?? 0).toFixed(2)} Jam
                    </td>
                    <td className="py-2.5 px-4 text-right font-extrabold text-emerald-800">
                      {formatRupiah(worker.total_upah ?? worker.estimasi_upah ?? 0)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
            <tfoot className="bg-slate-100 border-t-2 border-slate-900 font-bold text-xs text-slate-900">
              <tr>
                <td colSpan={5} className="py-3 px-4 text-right uppercase tracking-wider font-extrabold">
                  Grand Total Keseluruhan:
                </td>
                <td className="py-3 px-4 text-center text-[#b81d52] text-sm font-black">
                  {grandTotalJam.toFixed(2)} Jam
                </td>
                <td className="py-3 px-4 text-right text-emerald-800 text-sm font-black">
                  {formatRupiah(grandTotalUpah)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* Pengesahan Rekapitulasi Jam Kerja Tim (Print Only) */}
      <div className="print-only">
        <PrintSignatures 
          namaKaryawan="Pimpinan PAM-TECHNO (CV. Putra Anugrah Mandiri)"
          jabatanKaryawan="Direktur Operasional"
          type="3-col"
        />
      </div>

    </div>
  );
}
