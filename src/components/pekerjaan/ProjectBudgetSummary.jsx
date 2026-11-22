import { useEffect, useState } from 'react'
import { getPekerjaanBudgetSummary } from '../../services/pekerjaanApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

export default function ProjectBudgetSummary({ idPekerjaan, onOpenBlueprintEdit }) {
  const [summary, setSummary] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [showRoleDetails, setShowRoleDetails] = useState(false)
  const [showEmployeeDetails, setShowEmployeeDetails] = useState(false)

  const loadSummary = async () => {
    if (!idPekerjaan) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getPekerjaanBudgetSummary(idPekerjaan)
      setSummary(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat ringkasan budget.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSummary()
  }, [idPekerjaan])

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Memuat kalkulasi budget 3 lapis...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        <div className="flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={loadSummary}
            className="font-semibold text-rose-900 underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  if (!summary) return null

  const { status_budget, lapis_1_rencana, lapis_2_komitmen, lapis_3_realisasi, parameter_durasi } = summary

  // Evaluasi Badge Status
  const statusMeta = {
    IN_BUDGET: {
      label: 'Dalam Anggaran (In Budget)',
      badgeClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
      barClass: 'bg-emerald-500',
    },
    OVER_BUDGET: {
      label: 'Melebihi Anggaran (Over Budget)',
      badgeClass: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
      barClass: 'bg-rose-500',
    },
    UNDER_MIN: {
      label: 'Di Bawah Estimasi Minimal',
      badgeClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
      barClass: 'bg-amber-400',
    },
    BELUM_ADA_BLUEPRINT: {
      label: 'Belum Ada Blueprint Role',
      badgeClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
      barClass: 'bg-slate-300',
    },
  }[status_budget] || {
    label: status_budget,
    badgeClass: 'bg-slate-100 text-slate-700',
    barClass: 'bg-blue-500',
  }

  // Persentase Komitmen terhadap Batas Max
  const maxRef = lapis_1_rencana?.grand_total_max || lapis_1_rencana?.total_max || 1
  const percentUsed = maxRef > 0 ? Math.min(100, Math.round(((lapis_2_komitmen?.total_komitmen || 0) / maxRef) * 100)) : 0

  return (
    <div className="space-y-4">
      {/* Kartu Status Utama & Progress Bar */}
      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
              Status Efisiensi Anggaran Proyek
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-bold ${statusMeta.badgeClass}`}>
                {statusMeta.label}
              </span>
              <span className="text-xs text-slate-500">
                ({percentUsed}% dari plafon maksimal)
              </span>
            </div>
          </div>

          {status_budget === 'BELUM_ADA_BLUEPRINT' && onOpenBlueprintEdit && (
            <button
              type="button"
              onClick={onOpenBlueprintEdit}
              className="rounded-xl bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
            >
              + Atur Blueprint Role Sekarang
            </button>
          )}

          <div className="text-right text-[11px] text-slate-500">
            <span>Durasi: <strong>{parameter_durasi?.total_hari_kerja_efektif || 0} hari kerja</strong></span>
            <span className="mx-1.5">•</span>
            <span>Faktor: <strong>{parameter_durasi?.faktor_bulan || 1} bulan</strong></span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1">
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={`h-full transition-all duration-500 rounded-full ${statusMeta.barClass}`}
              style={{ width: `${percentUsed}%` }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-slate-400">
            <span>Rp 0</span>
            <span>Batas Bawah: {formatRupiah(lapis_1_rencana?.total_min || 0)}</span>
            <span>Plafon Maksimal: {formatRupiah(maxRef)}</span>
          </div>
        </div>
      </div>

      {/* 3 Kartu Indikator Lapis Budget */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5">
        {/* Lapis 1: Rencana Blueprint */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>📐</span> Lapis 1: Rencana Blueprint
            </span>
            <span className="rounded bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700">
              Plafon
            </span>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block">Rentang Anggaran (Min – Max)</span>
            <p className="text-sm font-bold text-slate-900 mt-0.5">
              {formatRupiah(lapis_1_rencana?.total_min || 0)} – {formatRupiah(lapis_1_rencana?.total_max || 0)}
            </p>
          </div>
          {lapis_1_rencana?.buffer_lembur?.lembur_diizinkan ? (
            <div className="rounded-lg bg-amber-50 p-2 text-[11px] text-amber-900 border border-amber-200/60">
              <span className="font-semibold block">Buffer Lembur ({lapis_1_rencana.buffer_lembur.buffer_lembur_persen}%):</span>
              <span className="font-mono text-xs">{formatRupiah(lapis_1_rencana.buffer_lembur.buffer_max)}</span>
              <div className="text-[10px] text-amber-800 mt-0.5 font-bold">
                Grand Max: {formatRupiah(lapis_1_rencana.grand_total_max)}
              </div>
            </div>
          ) : (
            <span className="text-[10px] text-slate-400 block">Lembur tidak diizinkan pada proyek ini</span>
          )}
        </div>

        {/* Lapis 2: Komitmen Terpakai */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>👥</span> Lapis 2: Komitmen Gaji
            </span>
            <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
              {lapis_2_komitmen?.jumlah_pekerja_assigned || 0} Pekerja
            </span>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block">Total Proyeksi Biaya Tim</span>
            <p className="text-base font-bold text-emerald-700 mt-0.5">
              {formatRupiah(lapis_2_komitmen?.total_komitmen || 0)}
            </p>
          </div>
          <div className="text-[11px] text-slate-500">
            <span>Dihitung dari skema gaji aktif seluruh pekerja yang ditugaskan selama durasi proyek.</span>
          </div>
        </div>

        {/* Lapis 3: Realisasi Sudah Dibayar */}
        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-slate-700 flex items-center gap-1.5">
              <span>💳</span> Lapis 3: Realisasi Terbayar
            </span>
            <span className="rounded bg-slate-100 px-2 py-0.5 text-[10px] font-bold text-slate-700">
              Kas Keluar
            </span>
          </div>
          <div className="pt-1">
            <span className="text-[10px] text-slate-400 block">Akumulasi Gaji Terbayar</span>
            <p className="text-base font-bold text-slate-900 mt-0.5">
              {formatRupiah(lapis_3_realisasi?.total_realisasi_dibayar || 0)}
            </p>
          </div>
          <div className="text-[11px] text-slate-500">
            <span>Sumber: <strong>{lapis_3_realisasi?.sumber_realisasi === 'pembayaran_gaji' ? 'Riwayat Pembayaran Kasir' : 'Slip Gaji Lunas'}</strong></span>
          </div>
        </div>
      </div>

      {/* Accordion Rincian Role Blueprint */}
      {lapis_1_rencana?.rincian_per_role && lapis_1_rencana.rincian_per_role.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs text-xs">
          <button
            type="button"
            onClick={() => setShowRoleDetails(!showRoleDetails)}
            className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100 transition text-left cursor-pointer"
          >
            <span className="font-bold text-slate-800">
              📋 Rincian Plafon Anggaran per Role ({lapis_1_rencana.rincian_per_role.length} Role)
            </span>
            <span className="text-slate-400">{showRoleDetails ? '▲ Sembunyikan' : '▼ Tampilkan'}</span>
          </button>

          {showRoleDetails && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="pb-2">Role & Level</th>
                    <th className="pb-2 text-center">Slot</th>
                    <th className="pb-2">Min/Bulan</th>
                    <th className="pb-2">Max/Bulan</th>
                    <th className="pb-2 text-right">Subtotal Max</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lapis_1_rencana.rincian_per_role.map((r, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-900">
                        Lvl {r.hierarchy_level}: {r.nama_role}
                      </td>
                      <td className="py-2.5 text-center">
                        <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px]">
                          {r.terisi_slot || 0} / {r.kuota_slot}
                        </span>
                      </td>
                      <td className="py-2.5">{formatRupiah(r.gaji_min_bulanan)}</td>
                      <td className="py-2.5">{formatRupiah(r.gaji_max_bulanan)}</td>
                      <td className="py-2.5 text-right font-bold text-slate-900">
                        {formatRupiah(r.subtotal_max_durasi)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Accordion Rincian Komitmen per Karyawan */}
      {lapis_2_komitmen?.rincian_komitmen && lapis_2_komitmen.rincian_komitmen.length > 0 && (
        <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-2xs text-xs">
          <button
            type="button"
            onClick={() => setShowEmployeeDetails(!showEmployeeDetails)}
            className="w-full flex items-center justify-between p-4 bg-slate-50/70 hover:bg-slate-100 transition text-left cursor-pointer"
          >
            <span className="font-bold text-slate-800">
              👥 Rincian Komitmen Gaji per Karyawan ({lapis_2_komitmen.rincian_komitmen.length} Orang)
            </span>
            <span className="text-slate-400">{showEmployeeDetails ? '▲ Sembunyikan' : '▼ Tampilkan'}</span>
          </button>

          {showEmployeeDetails && (
            <div className="p-4 overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="border-b border-slate-100 text-[11px] font-semibold text-slate-500 uppercase">
                    <th className="pb-2">Karyawan</th>
                    <th className="pb-2">Jabatan / Role</th>
                    <th className="pb-2">Skema & Tarif</th>
                    <th className="pb-2">Normalisasi/Bln</th>
                    <th className="pb-2 text-right">Proyeksi Komitmen</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {lapis_2_komitmen.rincian_komitmen.map((k, i) => (
                    <tr key={i} className="hover:bg-slate-50">
                      <td className="py-2.5 font-bold text-slate-900">{k.nama}</td>
                      <td className="py-2.5 text-slate-600">{k.nama_role || k.jabatan || '—'}</td>
                      <td className="py-2.5">
                        <span className="font-mono text-[11px]">
                          {formatRupiah(k.nominal_upah)} / {k.jenis_upah?.replace('per_', '')}
                        </span>
                      </td>
                      <td className="py-2.5 text-slate-600">{formatRupiah(k.normalisasi_bulanan)}</td>
                      <td className="py-2.5 text-right font-bold text-emerald-700">
                        {formatRupiah(k.proyeksi_komitmen)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
