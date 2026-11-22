import { useEffect, useMemo, useState } from 'react'
import { getPenugasanGajiRiwayat, createPenugasanGajiRiwayat } from '../../services/penugasanApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

function formatDateIndo(dateStr) {
  if (!dateStr) return 'Sekarang'
  const date = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

function getFirstOfNextMonth() {
  const now = new Date()
  const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
  return nextMonth.toISOString().slice(0, 10)
}

export default function SalaryHistoryModal({
  idPenugasan,
  workerName = 'Karyawan',
  roleBudget = null,
  projectCalendar = {},
  onClose,
  onSuccess,
}) {
  const [historyList, setHistoryList] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState('')

  // Form ganti skema
  const [jenisUpah, setJenisUpah] = useState('per_bulan')
  const [nominalUpah, setNominalUpah] = useState('')
  const [effectiveFrom, setEffectiveFrom] = useState(() => getFirstOfNextMonth())
  const [catatan, setCatatan] = useState('')

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [submitNotice, setSubmitNotice] = useState('')

  const hariKerja = Number(projectCalendar.hari_kerja_per_bulan) || 22
  const jamKerja = Number(projectCalendar.jam_kerja_per_hari) || 8

  const loadHistory = async () => {
    if (!idPenugasan) return
    setIsLoading(true)
    setLoadError('')
    try {
      const res = await getPenugasanGajiRiwayat(idPenugasan)
      const list = Array.isArray(res) ? res : res?.riwayat || res?.data?.riwayat || res?.data || []
      setHistoryList(list)
    } catch (err) {
      setLoadError(err.message || 'Gagal memuat riwayat skema gaji.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadHistory()
  }, [idPenugasan])

  // Hitung batas role dalam satuan yang sedang dipilih
  const roleUnitLimits = useMemo(() => {
    const minBulan = Number(roleBudget?.gaji_min_bulanan) || 0
    const maxBulan = Number(roleBudget?.gaji_max_bulanan) || 0

    if (jenisUpah === 'per_hari') {
      return {
        min: Math.round(minBulan / hariKerja),
        max: Math.round(maxBulan / hariKerja),
        label: '/ hari',
      }
    }
    if (jenisUpah === 'per_jam') {
      return {
        min: Math.round(minBulan / (hariKerja * jamKerja)),
        max: Math.round(maxBulan / (hariKerja * jamKerja)),
        label: '/ jam',
      }
    }
    if (jenisUpah === 'per_tahun') {
      return {
        min: minBulan * 12,
        max: maxBulan * 12,
        label: '/ tahun',
      }
    }
    return {
      min: minBulan,
      max: maxBulan,
      label: '/ bulan',
    }
  }, [roleBudget, jenisUpah, hariKerja, jamKerja])

  // Normalisasi nominal input ke bulanan
  const normalizedMonthly = useMemo(() => {
    const nom = Number(nominalUpah) || 0
    if (jenisUpah === 'per_hari') return nom * hariKerja
    if (jenisUpah === 'per_jam') return nom * hariKerja * jamKerja
    if (jenisUpah === 'per_tahun') return nom / 12
    return nom
  }, [nominalUpah, jenisUpah, hariKerja, jamKerja])

  const minBulan = Number(roleBudget?.gaji_min_bulanan) || 0
  const maxBulan = Number(roleBudget?.gaji_max_bulanan) || 0
  const isSalaryInRange = !roleBudget || (normalizedMonthly >= minBulan && normalizedMonthly <= maxBulan)

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!nominalUpah || Number(nominalUpah) <= 0) {
      setSubmitError('Masukkan nominal upah yang valid.')
      return
    }
    if (!effectiveFrom) {
      setSubmitError('Pilih tanggal mulai berlaku skema baru.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')
    setSubmitNotice('')

    try {
      await createPenugasanGajiRiwayat(idPenugasan, {
        jenis_upah: jenisUpah,
        nominal_upah: Number(nominalUpah),
        effective_from: effectiveFrom,
        catatan: catatan.trim() || undefined,
      })

      setSubmitNotice('Skema gaji baru berhasil disimpan! Slip periode sebelumnya tetap aman tanpa overwrite.')
      setNominalUpah('')
      setCatatan('')
      await loadHistory()
      onSuccess?.()
    } catch (err) {
      setSubmitError(err.message || 'Gagal memperbarui skema gaji.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-xs transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Riwayat & Versioning Skema Gaji
            </span>
            <h3 className="text-base font-bold text-slate-900">
              {workerName} — {roleBudget?.nama_role ? `Slot: ${roleBudget.nama_role}` : 'Pekerja'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition cursor-pointer"
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m18 6-12 12M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto p-6 space-y-6 flex-1 text-xs">
          {/* Info Banner Ramah Admin */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 text-blue-900 space-y-1">
            <div className="flex items-center gap-1.5 font-bold">
              <span>🛡️</span>
              <span>Prinsip Anti-Overwrite / Immutability</span>
            </div>
            <p className="text-[11px] text-blue-800">
              Perubahan skema gaji hanya akan berlaku mulai tanggal efektif baru ke depan. Slip gaji dan rekap absensi pada bulan-bulan sebelumnya dijamin tetap utuh dan tidak akan tertimpa.
            </p>
          </div>

          {loadError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
              ⚠️ {loadError}
            </div>
          )}

          {/* Tabel Riwayat Versi Gaji */}
          <div className="space-y-2">
            <h4 className="font-bold uppercase tracking-wider text-slate-500 text-[11px]">
              Daftar Versi Gaji Tercatat ({historyList.length} Versi)
            </h4>

            {isLoading ? (
              <div className="py-6 text-center text-slate-400">Memuat riwayat...</div>
            ) : historyList.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-slate-400">
                Belum ada catatan riwayat gaji terpisah. Skema awal menggunakan data penugasan standar.
              </div>
            ) : (
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
                {historyList.map((ver, idx) => {
                  const isCurrent = !ver.effective_to
                  return (
                    <div
                      key={ver.id_riwayat || idx}
                      className={`p-3.5 flex flex-wrap items-center justify-between gap-2 ${
                        isCurrent ? 'bg-emerald-50/40' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                              isCurrent
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {isCurrent ? '● Versi Aktif' : 'Riwayat Lampau'}
                          </span>
                          <span className="font-semibold text-slate-800">
                            {formatDateIndo(ver.effective_from)} s.d. {formatDateIndo(ver.effective_to)}
                          </span>
                        </div>
                        {ver.catatan && (
                          <p className="text-[11px] text-slate-500 italic">
                            Catatan: {ver.catatan}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <span className="font-bold text-sm text-slate-900 block">
                          {formatRupiah(ver.nominal_upah)}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            / {ver.jenis_upah?.replace('per_', '')}
                          </span>
                        </span>
                        {ver.normalisasi_bulanan && (
                          <span className="text-[10px] text-slate-400">
                            (Ekuivalen: {formatRupiah(ver.normalisasi_bulanan)}/bln)
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          {/* Form Ganti Skema Gaji */}
          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3.5">
            <h4 className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
              <span>➕</span> Tambah Perubahan Skema Gaji Baru
            </h4>

            {submitError && (
              <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                ⚠️ {submitError}
              </div>
            )}

            {submitNotice && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-emerald-800">
                ✓ {submitNotice}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Satuan Baru <span className="text-rose-500">*</span>
                </label>
                <select
                  value={jenisUpah}
                  onChange={(e) => setJenisUpah(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                >
                  <option value="per_jam">Per Jam</option>
                  <option value="per_hari">Per Hari</option>
                  <option value="per_bulan">Per Bulan</option>
                  <option value="per_tahun">Per Tahun</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nominal Baru ({roleUnitLimits.label}) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={nominalUpah}
                  onChange={(e) => setNominalUpah(e.target.value)}
                  placeholder="Contoh: 5000000"
                  className={`w-full rounded-xl border bg-white px-3 py-1.5 text-xs text-slate-800 focus:outline-none ${
                    isSalaryInRange ? 'border-slate-200 focus:border-blue-500' : 'border-rose-300 bg-rose-50/30'
                  }`}
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Berlaku Efektif Mulai <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  value={effectiveFrom}
                  onChange={(e) => setEffectiveFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Plafon Role & Normalisasi */}
            {roleBudget && (
              <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-500 bg-white p-2.5 rounded-lg border border-slate-200">
                <span>
                  Batas Role ({roleBudget.nama_role}):{' '}
                  <strong className="text-slate-800">
                    {formatRupiah(roleUnitLimits.min)} – {formatRupiah(roleUnitLimits.max)} {roleUnitLimits.label}
                  </strong>
                </span>
                <span className={isSalaryInRange ? 'text-emerald-700 font-semibold' : 'text-rose-600 font-semibold'}>
                  Normalisasi: {formatRupiah(normalizedMonthly)}/bln {isSalaryInRange ? '✓' : '(Di Luar Plafon)'}
                </span>
              </div>
            )}

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Catatan Alasan Perubahan (Opsional)
              </label>
              <input
                type="text"
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                placeholder="Contoh: Penyesuaian skema harian ke bulanan sesuai evaluasi kinerja"
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                disabled={isSubmitting || !nominalUpah || !effectiveFrom}
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? 'Menyimpan Versi...' : '💾 Simpan Perubahan Skema'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
