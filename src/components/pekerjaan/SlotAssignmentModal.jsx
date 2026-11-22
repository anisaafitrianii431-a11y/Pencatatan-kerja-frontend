import { useEffect, useMemo, useState } from 'react'
import { getPekerjaanKandidatKaryawan } from '../../services/pekerjaanApi.js'
import { createPenugasan } from '../../services/penugasanApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

export default function SlotAssignmentModal({
  idPekerjaan,
  roleBudget,
  projectCalendar = {},
  onClose,
  onSuccess,
}) {
  const [candidates, setCandidates] = useState([])
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(true)
  const [loadError, setLoadError] = useState('')

  const [selectedKaryawanId, setSelectedKaryawanId] = useState('')
  const [jenisUpah, setJenisUpah] = useState('per_bulan')
  const [nominalUpah, setNominalUpah] = useState('')
  const [tanggalPenugasan, setTanggalPenugasan] = useState(() => {
    return projectCalendar.tanggal_mulai ? String(projectCalendar.tanggal_mulai).slice(0, 10) : new Date().toISOString().slice(0, 10)
  })
  const [tanggalSelesaiTugas, setTanggalSelesaiTugas] = useState(() => {
    return projectCalendar.target_selesai ? String(projectCalendar.target_selesai).slice(0, 10) : ''
  })
  const [izinkanBentrok, setIzinkanBentrok] = useState(false)
  const [filterOnlyMatching, setFilterOnlyMatching] = useState(true)

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const hariKerja = Number(projectCalendar.hari_kerja_per_bulan) || 22
  const jamKerja = Number(projectCalendar.jam_kerja_per_hari) || 8

  // Muat kandidat karyawan
  useEffect(() => {
    let isMounted = true
    setIsLoadingCandidates(true)
    getPekerjaanKandidatKaryawan(idPekerjaan)
      .then((res) => {
        if (isMounted) {
          const list = Array.isArray(res) ? res : res?.data || []
          setCandidates(list)
        }
      })
      .catch((err) => {
        if (isMounted) setLoadError(err.message || 'Gagal memuat kandidat karyawan.')
      })
      .finally(() => {
        if (isMounted) setIsLoadingCandidates(false)
      })

    return () => {
      isMounted = false
    }
  }, [idPekerjaan])

  // Inisialisasi default nominal saat jenis upah atau role berganti
  useEffect(() => {
    if (!roleBudget) return
    const minBulanan = Number(roleBudget.gaji_min_bulanan) || 0
    let defVal = minBulanan
    if (jenisUpah === 'per_hari') defVal = Math.round(minBulanan / hariKerja)
    else if (jenisUpah === 'per_jam') defVal = Math.round(minBulanan / (hariKerja * jamKerja))
    else if (jenisUpah === 'per_tahun') defVal = minBulanan * 12
    setNominalUpah(String(defVal))
  }, [roleBudget, jenisUpah, hariKerja, jamKerja])

  // Filter kandidat berdasarkan role / jabatan
  const targetRoleName = (roleBudget?.nama_role || '').trim().toLowerCase()
  const { matchingCandidates, otherCandidates } = useMemo(() => {
    if (!targetRoleName) {
      return { matchingCandidates: candidates, otherCandidates: [] }
    }
    const match = []
    const other = []
    for (const c of candidates) {
      const jab = (c.jabatan || '').trim().toLowerCase()
      if (jab === targetRoleName) {
        match.push(c)
      } else {
        other.push(c)
      }
    }
    return { matchingCandidates: match, otherCandidates: other }
  }, [candidates, targetRoleName])

  const hasMatching = matchingCandidates.length > 0

  // Data karyawan terpilih
  const selectedCandidate = useMemo(() => {
    if (!selectedKaryawanId) return null
    return candidates.find((c) => Number(c.id_karyawan) === Number(selectedKaryawanId))
  }, [candidates, selectedKaryawanId])

  // Batas role dalam satuan yang sedang dipilih
  const roleUnitLimits = useMemo(() => {
    const minBulanan = Number(roleBudget?.gaji_min_bulanan) || 0
    const maxBulanan = Number(roleBudget?.gaji_max_bulanan) || 0

    if (jenisUpah === 'per_hari') {
      return {
        min: Math.round(minBulanan / hariKerja),
        max: Math.round(maxBulanan / hariKerja),
        unitLabel: '/ hari',
      }
    }
    if (jenisUpah === 'per_jam') {
      return {
        min: Math.round(minBulanan / (hariKerja * jamKerja)),
        max: Math.round(maxBulanan / (hariKerja * jamKerja)),
        unitLabel: '/ jam',
      }
    }
    if (jenisUpah === 'per_tahun') {
      return {
        min: minBulanan * 12,
        max: maxBulanan * 12,
        unitLabel: '/ tahun',
      }
    }
    return {
      min: minBulanan,
      max: maxBulanan,
      unitLabel: '/ bulan',
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
  const isSalaryInRange = normalizedMonthly >= minBulan && normalizedMonthly <= maxBulan

  const hasConflict = selectedCandidate && !selectedCandidate.available && !selectedCandidate.sudah_di_proyek_ini

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!selectedKaryawanId) {
      setSubmitError('Pilih karyawan terlebih dahulu.')
      return
    }
    if (!nominalUpah || Number(nominalUpah) <= 0) {
      setSubmitError('Masukkan nominal upah yang valid.')
      return
    }
    if (hasConflict && !izinkanBentrok) {
      setSubmitError('Karyawan memiliki bentrok penugasan. Centang persetujuan izin bentrok untuk melanjutkan.')
      return
    }

    setIsSubmitting(true)
    setSubmitError('')

    try {
      await createPenugasan({
        id_karyawan: Number(selectedKaryawanId),
        id_pekerjaan: Number(idPekerjaan),
        id_role_budget: Number(roleBudget.id_role_budget),
        jenis_upah: jenisUpah,
        nominal_upah: Number(nominalUpah),
        tanggal_penugasan: tanggalPenugasan || undefined,
        tanggal_selesai_tugas: tanggalSelesaiTugas || undefined,
        izinkan_bentrok: izinkanBentrok,
      })

      onSuccess?.()
      onClose()
    } catch (err) {
      setSubmitError(err.message || 'Gagal menugaskan pekerja.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-xs transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              Penetapan Slot Pekerja
            </span>
            <h3 className="text-base font-bold text-slate-900">
              Assign ke Slot: {roleBudget?.nama_role} (Level {roleBudget?.hierarchy_level})
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

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {loadError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
              ⚠️ {loadError}
            </div>
          )}

          {submitError && (
            <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
              ⚠️ {submitError}
            </div>
          )}

          {/* Pilih Karyawan */}
          <div>
            <div className="flex items-center justify-between mb-1 gap-2">
              <label className="font-semibold text-slate-700">
                Pilih Karyawan Kandidat <span className="text-rose-500">*</span>
              </label>
              {hasMatching ? (
                <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={filterOnlyMatching}
                    onChange={(e) => setFilterOnlyMatching(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <span>
                    Hanya jabatan &quot;{roleBudget?.nama_role}&quot; ({matchingCandidates.length})
                  </span>
                </label>
              ) : (
                <span className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full font-medium">
                  Belum ada karyawan dengan jabatan &quot;{roleBudget?.nama_role}&quot;
                </span>
              )}
            </div>

            <select
              value={selectedKaryawanId}
              onChange={(e) => {
                setSelectedKaryawanId(e.target.value)
                setIzinkanBentrok(false)
              }}
              disabled={isLoadingCandidates}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {isLoadingCandidates ? 'Memuat kandidat...' : '-- Pilih salah satu karyawan --'}
              </option>

              {filterOnlyMatching && hasMatching ? (
                matchingCandidates.map((c) => {
                  const disabled = Boolean(c.sudah_di_proyek_ini)
                  const statusText = c.sudah_di_proyek_ini
                    ? '(Sudah di proyek ini)'
                    : !c.available
                      ? `(Bentrok: ${c.bentrok_proyek?.length || 1} proyek)`
                      : '(Tersedia)'
                  return (
                    <option key={c.id_karyawan} value={c.id_karyawan} disabled={disabled}>
                      {c.nama} — {c.jabatan || 'Staf'} {statusText}
                    </option>
                  )
                })
              ) : hasMatching ? (
                <>
                  <optgroup label={`⭐ Sesuai Role: ${roleBudget?.nama_role} (${matchingCandidates.length} orang)`}>
                    {matchingCandidates.map((c) => {
                      const disabled = Boolean(c.sudah_di_proyek_ini)
                      const statusText = c.sudah_di_proyek_ini
                        ? '(Sudah di proyek ini)'
                        : !c.available
                          ? `(Bentrok: ${c.bentrok_proyek?.length || 1} proyek)`
                          : '(Tersedia)'
                      return (
                        <option key={c.id_karyawan} value={c.id_karyawan} disabled={disabled}>
                          {c.nama} — {c.jabatan || 'Staf'} {statusText}
                        </option>
                      )
                    })}
                  </optgroup>
                  <optgroup label="Karyawan Jabatan Lain (Penugasan Fleksibel)">
                    {otherCandidates.map((c) => {
                      const disabled = Boolean(c.sudah_di_proyek_ini)
                      const statusText = c.sudah_di_proyek_ini
                        ? '(Sudah di proyek ini)'
                        : !c.available
                          ? `(Bentrok: ${c.bentrok_proyek?.length || 1} proyek)`
                          : '(Tersedia)'
                      return (
                        <option key={c.id_karyawan} value={c.id_karyawan} disabled={disabled}>
                          {c.nama} — {c.jabatan || 'Staf'} {statusText}
                        </option>
                      )
                    })}
                  </optgroup>
                </>
              ) : (
                candidates.map((c) => {
                  const disabled = Boolean(c.sudah_di_proyek_ini)
                  const statusText = c.sudah_di_proyek_ini
                    ? '(Sudah di proyek ini)'
                    : !c.available
                      ? `(Bentrok: ${c.bentrok_proyek?.length || 1} proyek)`
                      : '(Tersedia)'
                  return (
                    <option key={c.id_karyawan} value={c.id_karyawan} disabled={disabled}>
                      {c.nama} — {c.jabatan || 'Staf'} {statusText}
                    </option>
                  )
                })
              )}
            </select>
          </div>

          {/* Alert Bentrok Jadwal */}
          {hasConflict && (
            <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2 text-amber-900">
              <div className="flex items-start gap-2">
                <span className="text-base text-amber-600">⚠️</span>
                <div>
                  <span className="font-bold block">Peringatan Bentrok Jadwal Penugasan!</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Karyawan ini sedang aktif pada proyek lain dalam rentang tanggal yang bersamaan:
                  </p>
                  <ul className="mt-1 list-disc list-inside space-y-0.5 text-[11px] text-amber-950 font-medium">
                    {selectedCandidate.bentrok_proyek?.map((bp, i) => (
                      <li key={i}>
                        {bp.nama_pekerjaan} ({bp.tanggal_mulai ? String(bp.tanggal_mulai).slice(0, 10) : '—'} s.d.{' '}
                        {bp.target_selesai ? String(bp.target_selesai).slice(0, 10) : '—'})
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              <label className="flex items-center gap-2 cursor-pointer pt-2 border-t border-amber-200 font-semibold text-xs text-amber-950">
                <input
                  type="checkbox"
                  checked={izinkanBentrok}
                  onChange={(e) => setIzinkanBentrok(e.target.checked)}
                  className="h-4 w-4 rounded border-amber-400 text-amber-600 focus:ring-amber-500"
                />
                <span>Saya paham ada bentrok jadwal dan tetap mengizinkan penugasan ini</span>
              </label>
            </div>
          )}

          {/* Pemilihan Satuan & Nominal Gaji */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Satuan Skema Gaji <span className="text-rose-500">*</span>
              </label>
              <select
                value={jenisUpah}
                onChange={(e) => setJenisUpah(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              >
                <option value="per_jam">Per Jam</option>
                <option value="per_hari">Per Hari</option>
                <option value="per_bulan">Per Bulan</option>
                <option value="per_tahun">Per Tahun</option>
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Nominal Gaji ({roleUnitLimits.unitLabel}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                min="0"
                value={nominalUpah}
                onChange={(e) => setNominalUpah(e.target.value)}
                className={`w-full rounded-xl border px-3 py-2 text-xs text-slate-800 focus:outline-none ${
                  isSalaryInRange ? 'border-slate-200 focus:border-blue-500' : 'border-rose-300 focus:border-rose-500 bg-rose-50/30'
                }`}
              />
            </div>
          </div>

          {/* Kotak Panduan Batas Role & Live Normalisasi */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Batas Plafon Role ({roleBudget?.nama_role}):</span>
              <span className="font-bold text-slate-800">
                {formatRupiah(roleUnitLimits.min)} – {formatRupiah(roleUnitLimits.max)} {roleUnitLimits.unitLabel}
              </span>
            </div>

            <div className="flex items-center justify-between border-t border-slate-200/80 pt-2">
              <span className="text-slate-500 font-medium">Normalisasi Nilai Bulanan:</span>
              <span className={`font-bold ${isSalaryInRange ? 'text-emerald-700' : 'text-rose-600'}`}>
                {formatRupiah(normalizedMonthly)} / bulan
                {isSalaryInRange ? ' (Sesuai Batas)' : ' (Di Luar Batas Plafon)'}
              </span>
            </div>
          </div>

          {/* Periode Penugasan Individu */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Mulai Tugas
              </label>
              <input
                type="date"
                value={tanggalPenugasan}
                onChange={(e) => setTanggalPenugasan(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Tanggal Selesai Tugas (Opsional)
              </label>
              <input
                type="date"
                value={tanggalSelesaiTugas}
                onChange={(e) => setTanggalSelesaiTugas(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Footer Tombol */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !selectedKaryawanId || (hasConflict && !izinkanBentrok)}
              className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Menyimpan...</span>
              ) : (
                <>
                  <span>✓</span>
                  <span>Tetapkan Pekerja ke Slot</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
