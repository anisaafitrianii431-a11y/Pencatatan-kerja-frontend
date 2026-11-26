import { useEffect, useMemo, useState } from 'react'
import { getMasterRoles } from '../../services/masterRoleApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

export default function RoleBlueprintStep({
  roleBudgets = [],
  onChangeRoleBudgets,
  calendarConfig = {
    hari_kerja_per_bulan: 22,
    jam_kerja_per_hari: 8,
    lembur_diizinkan: false,
    buffer_lembur_persen: 10,
    tanggal_mulai: '',
    target_selesai: '',
  },
}) {
  const [availableRoles, setAvailableRoles] = useState([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [roleLoadError, setRoleLoadError] = useState('')

  const hariKerja = Number(calendarConfig.hari_kerja_per_bulan) || 22
  const jamKerja = Number(calendarConfig.jam_kerja_per_hari) || 8
  const lemburAktif = Boolean(calendarConfig.lembur_diizinkan)
  const bufferLembur = Number(calendarConfig.buffer_lembur_persen) || 10

  useEffect(() => {
    let isMounted = true
    setIsLoadingRoles(true)
    getMasterRoles({ is_active: 1 })
      .then((roles) => {
        if (isMounted) {
          setAvailableRoles(roles.sort((a, b) => a.hierarchy_level - b.hierarchy_level))
        }
      })
      .catch((err) => {
        if (isMounted) setRoleLoadError(err.message || 'Gagal memuat master role.')
      })
      .finally(() => {
        if (isMounted) setIsLoadingRoles(false)
      })
    return () => {
      isMounted = false
    }
  }, [])

  // Cari role yang belum dipilih
  const unselectedRoles = useMemo(() => {
    const selectedIds = new Set(roleBudgets.map((b) => Number(b.id_role)))
    return availableRoles.filter((r) => !selectedIds.has(Number(r.id_role)))
  }, [availableRoles, roleBudgets])

  // Validasi Hirarki Real-Time
  const hierarchyValidation = useMemo(() => {
    if (!roleBudgets || roleBudgets.length < 2) return { isValid: true, errors: [] }

    // Map roleBudgets dengan data master_role untuk hierarchy_level
    const enriched = roleBudgets
      .map((b) => {
        const master = availableRoles.find((r) => Number(r.id_role) === Number(b.id_role))
        return {
          ...b,
          hierarchy_level: master ? master.hierarchy_level : 1,
          nama_role: master ? master.nama_role : (b.nama_role || 'Role'),
          min: Number(b.gaji_min_bulanan) || 0,
          max: Number(b.gaji_max_bulanan) || 0,
        }
      })
      .sort((a, b) => a.hierarchy_level - b.hierarchy_level)

    const errors = []
    // Sesuai Prompt Final: Hapus ketergantungan pada gaji minimum, maksimum, dan validasi rentang gaji hirarki
    return {
      isValid: true,
      errors: [],
    }
  }, [roleBudgets, availableRoles])

  // Estimasi Live Budget
  const budgetEstimation = useMemo(() => {
    if (!roleBudgets || roleBudgets.length === 0) {
      return { totalMin: 0, totalMid: 0, totalMax: 0, grandTotalMax: 0, bufferNominal: 0, durasiBulan: 1 }
    }

    // Hitung durasi bulan perkiraan
    let durasiBulan = 1
    if (calendarConfig.tanggal_mulai && calendarConfig.target_selesai) {
      const start = new Date(calendarConfig.tanggal_mulai)
      const end = new Date(calendarConfig.target_selesai)
      const diffTime = Math.max(0, end - start)
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1
      durasiBulan = Math.max(0.5, Number((diffDays / 30.4375).toFixed(2)))
    }

    let sumMin = 0
    let sumMax = 0

    roleBudgets.forEach((b) => {
      const slot = Number(b.kuota_slot) || 1
      const minBulan = Number(b.gaji_min_bulanan) || 0
      const maxBulan = Number(b.gaji_max_bulanan) || 0
      sumMin += minBulan * slot * durasiBulan
      sumMax += maxBulan * slot * durasiBulan
    })

    const sumMid = (sumMin + sumMax) / 2
    const bufferNominal = lemburAktif ? sumMax * (bufferLembur / 100) : 0
    const grandTotalMax = sumMax + bufferNominal

    return {
      totalMin: Math.round(sumMin),
      totalMid: Math.round(sumMid),
      totalMax: Math.round(sumMax),
      bufferNominal: Math.round(bufferNominal),
      grandTotalMax: Math.round(grandTotalMax),
      durasiBulan,
    }
  }, [roleBudgets, calendarConfig, hariKerja, lemburAktif, bufferLembur])

  function handleAddRoleRow(roleId) {
    if (!roleId) return
    const master = availableRoles.find((r) => Number(r.id_role) === Number(roleId))
    if (!master) return

    const newRow = {
      id_role: master.id_role,
      nama_role: master.nama_role,
      hierarchy_level: master.hierarchy_level,
      kuota_slot: 1,
      gaji_min_bulanan: 0,
      gaji_max_bulanan: 0,
    }

    const updated = [...roleBudgets, newRow].sort((a, b) => {
      const rA = availableRoles.find((r) => Number(r.id_role) === Number(a.id_role))
      const rB = availableRoles.find((r) => Number(r.id_role) === Number(b.id_role))
      return (rA?.hierarchy_level || 1) - (rB?.hierarchy_level || 1)
    })

    onChangeRoleBudgets(updated)
  }

  function handleRemoveRoleRow(index) {
    const updated = roleBudgets.filter((_, i) => i !== index)
    onChangeRoleBudgets(updated)
  }

  function handleFieldChange(index, field, value) {
    const updated = [...roleBudgets]
    updated[index] = {
      ...updated[index],
      [field]: value,
    }
    onChangeRoleBudgets(updated)
  }

  return (
    <div className="space-y-6">
      {/* Intro Blueprint */}
      <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-4 text-xs text-blue-900">
        <div className="flex items-start gap-2.5">
          <span className="text-base">📐</span>
          <div>
            <h4 className="font-bold text-blue-950">Blueprint Struktur Tim & Kuota Pekerja</h4>
            <p className="mt-1 text-blue-800">
              Tentukan kebutuhan jabatan dan kuota jumlah pekerja pada proyek ini. Besaran tarif upah (per jam atau per hari) tidak mengikat tingkatan jabatan dan akan ditentukan secara manual dan fleksibel oleh Direktur saat penugasan pekerja di lapangan.
            </p>
          </div>
        </div>
      </div>

      {roleLoadError && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700">
          ⚠️ {roleLoadError}
        </div>
      )}

      {/* Peringatan Validasi Hirarki */}
      {!hierarchyValidation.isValid && (
        <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-xs text-amber-900 shadow-xs">
          <div className="flex items-start gap-2">
            <span className="text-amber-600 font-bold text-sm">⚠️</span>
            <div className="space-y-1">
              <span className="font-bold text-amber-950 block">Peringatan Validasi Hierarki Gaji:</span>
              <ul className="list-disc list-inside space-y-0.5 text-amber-800">
                {hierarchyValidation.errors.map((err, idx) => (
                  <li key={idx}>{err}</li>
                ))}
              </ul>
              <p className="text-[11px] text-amber-700 mt-1">
                Aturan hierarki: Batas Maksimal jabatan lebih rendah harus &lt; Batas Minimal jabatan di atasnya agar tidak tumpang tindih.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Daftar Baris Role */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
            Daftar Role Proyek ({roleBudgets.length} Role)
          </h4>

          {/* Dropdown Tambah Role */}
          <div className="flex items-center gap-2">
            <select
              value=""
              onChange={(e) => {
                if (e.target.value) handleAddRoleRow(e.target.value)
              }}
              disabled={isLoadingRoles || availableRoles.length === 0 || unselectedRoles.length === 0}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs focus:border-blue-500 focus:outline-none disabled:opacity-50"
            >
              <option value="">
                {isLoadingRoles
                  ? 'Memuat role...'
                  : availableRoles.length === 0
                    ? 'Belum ada Master Role di sistem'
                    : unselectedRoles.length === 0
                      ? 'Semua role terpilih'
                      : '+ Tambah Role ke Proyek'}
              </option>
              {unselectedRoles.map((r) => (
                <option key={r.id_role} value={r.id_role}>
                  Lvl {r.hierarchy_level}: {r.nama_role}
                </option>
              ))}
            </select>
          </div>
        </div>

        {availableRoles.length === 0 && !isLoadingRoles ? (
          <div className="rounded-xl border border-amber-200 bg-amber-50/70 p-6 text-center text-xs text-amber-900 space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-amber-100 text-amber-700 text-lg">
              🏷️
            </div>
            <div>
              <h5 className="font-bold text-amber-950 text-sm">Master Role / Jabatan Belum Tersedia di Database</h5>
              <p className="mt-1 text-amber-800 max-w-md mx-auto">
                Tabel master role saat ini masih kosong. Sebelum menyusun blueprint tim proyek, Anda perlu mendaftarkan master jabatan (misal: Helper, Teknisi, Supervisor, Manajer) beserta hierarki dan standar gaji defaultnya.
              </p>
            </div>
            <div className="flex items-center justify-center gap-2 pt-1">
              <a
                href="/admin/master-role"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2 font-semibold text-white shadow-xs hover:bg-blue-700 transition"
              >
                <span>🏷️ Buka Menu Master Role (Tab Baru)</span>
                <span>↗</span>
              </a>
              <button
                type="button"
                onClick={() => {
                  setIsLoadingRoles(true)
                  getMasterRoles({ is_active: 1 })
                    .then((roles) => setAvailableRoles(roles.sort((a, b) => a.hierarchy_level - b.hierarchy_level)))
                    .catch(() => {})
                    .finally(() => setIsLoadingRoles(false))
                }}
                className="inline-flex items-center gap-1 rounded-xl border border-slate-300 bg-white px-3 py-2 font-semibold text-slate-700 hover:bg-slate-50 transition"
              >
                <span>🔄 Segarkan Daftar Role</span>
              </button>
            </div>
          </div>
        ) : roleBudgets.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
            <p className="font-medium text-slate-600">Belum ada role yang ditambahkan ke blueprint proyek ini.</p>
            <p className="mt-1">Pilih role dari menu dropdown di atas untuk mulai menyusun tim dan anggaran.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {roleBudgets.map((b, idx) => {
              const master = availableRoles.find((r) => Number(r.id_role) === Number(b.id_role))
              const level = master?.hierarchy_level || b.hierarchy_level || 1
              const minVal = Number(b.gaji_min_bulanan) || 0
              const maxVal = Number(b.gaji_max_bulanan) || 0
              const kuota = Number(b.kuota_slot) || 1

              // Konversi 4 satuan
              const harianMin = hariKerja > 0 ? minVal / hariKerja : 0
              const harianMax = hariKerja > 0 ? maxVal / hariKerja : 0
              const jamMin = hariKerja * jamKerja > 0 ? minVal / (hariKerja * jamKerja) : 0
              const jamMax = hariKerja * jamKerja > 0 ? maxVal / (hariKerja * jamKerja) : 0
              const tahunMin = minVal * 12
              const tahunMax = maxVal * 12

              return (
                <div
                  key={b.id_role || idx}
                  className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-[11px] font-bold text-blue-700 ring-1 ring-inset ring-blue-700/20">
                        Level {level}
                      </span>
                      <span className="font-bold text-sm text-slate-900">
                        {master?.nama_role || b.nama_role}
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveRoleRow(idx)}
                      className="text-xs font-semibold text-rose-600 hover:text-rose-800 p-1 rounded hover:bg-rose-50 transition cursor-pointer"
                      title="Hapus role ini dari proyek"
                    >
                      Hapus Baris
                    </button>
                  </div>

                  {/* Input Kuota Slot & Info Upah */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-3 items-center">
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kuota Slot Pekerja <span className="text-rose-500">*</span>
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="1"
                          value={b.kuota_slot}
                          onChange={(e) => handleFieldChange(idx, 'kuota_slot', Math.max(1, parseInt(e.target.value) || 1))}
                          className="w-32 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-xs text-slate-500 font-medium">Orang / Pekerja</span>
                      </div>
                    </div>
                    <div className="rounded-lg bg-slate-50 border border-slate-200/70 p-2.5 text-xs text-slate-600">
                      <span className="font-semibold text-slate-700 block text-[11px]">💡 Skema Penetapan Upah:</span>
                      <span className="text-[11px] text-slate-500">
                        Tarif upah (Per Jam / Per Hari) diinput fleksibel dan manual oleh Direktur saat penugasan pekerja.
                      </span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Ringkasan Tim Proyek */}
      {roleBudgets.length > 0 && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-br from-blue-50/50 to-slate-50 p-4 shadow-xs">
          <div className="flex items-center justify-between border-b border-blue-200/80 pb-2 mb-3">
            <span className="font-bold text-xs uppercase tracking-wider text-blue-900">
              Ringkasan Kebutuhan Tim Proyek
            </span>
            <span className="text-[11px] font-semibold text-blue-700 bg-blue-100 px-2.5 py-0.5 rounded-full">
              Estimasi {budgetEstimation.durasiBulan} Bulan Kerja
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium text-[11px]">Total Role Dibutuhkan</span>
              <p className="font-bold text-slate-900 text-base mt-0.5">{roleBudgets.length} Role</p>
              <span className="text-[10px] text-slate-400">Variasi jabatan dalam tim</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-blue-200 shadow-2xs">
              <span className="text-blue-700 font-medium text-[11px]">Total Kuota Pekerja</span>
              <p className="font-bold text-blue-950 text-base mt-0.5">
                {roleBudgets.reduce((acc, r) => acc + (Number(r.kuota_slot) || 0), 0)} Pekerja
              </p>
              <span className="text-[10px] text-blue-600/80">Total slot yang siap ditugaskan</span>
            </div>

            <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <span className="text-slate-500 font-medium text-[11px]">Skema Upah</span>
              <p className="font-bold text-slate-900 text-xs mt-1">Manual Per Pekerja</p>
              <span className="text-[10px] text-slate-400">Ditetapkan fleksibel saat penugasan</span>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
