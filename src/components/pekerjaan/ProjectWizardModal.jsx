import { useState, useMemo } from 'react'
import InteractiveMapPicker from './InteractiveMapPicker.jsx'
import RoleBlueprintStep from './RoleBlueprintStep.jsx'
import { createPekerjaan, updatePekerjaan } from '../../services/pekerjaanApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function ProjectWizardModal({
  mode = 'create',
  job = null,
  onClose,
  onSaved,
  onProceedToSlots,
}) {
  const [currentStep, setCurrentStep] = useState(1)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successJob, setSuccessJob] = useState(null)

  // Form State
  const [formData, setFormData] = useState(() => {
    return {
      nama_pekerjaan: job?.nama_pekerjaan || '',
      kode_pekerjaan: job?.kode_pekerjaan || '',
      deskripsi: job?.deskripsi || '',
      status: job?.status || 'belum_mulai',
      tanggal_mulai: job?.tanggal_mulai ? String(job.tanggal_mulai).slice(0, 10) : new Date().toISOString().slice(0, 10),
      target_selesai: job?.target_selesai ? String(job.target_selesai).slice(0, 10) : '',
      hari_kerja_per_bulan: job?.hari_kerja_per_bulan ?? 22,
      jam_kerja_per_hari: job?.jam_kerja_per_hari ?? 8,
      jam_masuk_standar: job?.jam_masuk_standar ? String(job.jam_masuk_standar).slice(0, 5) : '08:00',
      jam_pulang_standar: job?.jam_pulang_standar ? String(job.jam_pulang_standar).slice(0, 5) : '17:00',
      tanggal_cutoff: job?.tanggal_cutoff ?? 25,
      tanggal_pencairan: job?.tanggal_pencairan ?? 28,

      // Step 2: Lokasi & Aturan Absensi
      lokasi: job?.lokasi || '',
      metode_lokasi: job?.metode_lokasi === 'wfh' ? 'wfh' : 'titik',
      latitude: job?.latitude ? String(job.latitude) : '',
      longitude: job?.longitude ? String(job.longitude) : '',
      radius_meter: job?.radius_meter ?? 100,
      toleransi_terlambat_menit: job?.toleransi_terlambat_menit ?? 15,
      lembur_diizinkan: Number(job?.lembur_diizinkan) === 1 || job?.lembur_diizinkan === true,
      buffer_lembur_persen: job?.buffer_lembur_persen ?? 10,

      // Step 3: Role Blueprint
      role_budgets: Array.isArray(job?.role_budgets) ? [...job.role_budgets] : [],
    }
  })

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
  }

  // Validasi per step
  const validateStep = (step) => {
    setErrorMessage('')
    if (step === 1) {
      if (!formData.nama_pekerjaan.trim()) {
        setErrorMessage('Nama proyek / pekerjaan wajib diisi.')
        return false
      }
      if (!formData.tanggal_mulai) {
        setErrorMessage('Tanggal mulai proyek wajib ditentukan.')
        return false
      }
      if (!formData.target_selesai) {
        setErrorMessage('Target selesai proyek wajib ditentukan.')
        return false
      }
      if (formData.target_selesai < formData.tanggal_mulai) {
        setErrorMessage('Target selesai tidak boleh lebih awal dari tanggal mulai.')
        return false
      }
      if (Number(formData.hari_kerja_per_bulan) < 1 || Number(formData.hari_kerja_per_bulan) > 31) {
        setErrorMessage('Hari kerja per bulan harus antara 1 sampai 31 hari.')
        return false
      }
      if (Number(formData.jam_kerja_per_hari) < 1 || Number(formData.jam_kerja_per_hari) > 24) {
        setErrorMessage('Jam kerja per hari harus antara 1 sampai 24 jam.')
        return false
      }
    }

    if (step === 2) {
      if (formData.metode_lokasi === 'titik') {
        if (!formData.lokasi.trim()) {
          setErrorMessage('Nama / alamat lokasi presensi wajib diisi untuk absensi berbasis titik.')
          return false
        }
      }
    }

    if (step === 3) {
      if (formData.role_budgets.length > 0) {
        for (const b of formData.role_budgets) {
          if ((Number(b.kuota_slot) || 0) < 1) {
            setErrorMessage(`Kuota slot role ${b.nama_role || ''} minimal 1 pekerja.`)
            return false
          }
        }
      }
    }

    return true
  }

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep((prev) => Math.min(4, prev + 1))
    }
  }

  const handlePrev = () => {
    setErrorMessage('')
    setCurrentStep((prev) => Math.max(1, prev - 1))
  }

  const handleSubmit = async () => {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return
    }

    setIsSubmitting(true)
    setErrorMessage('')

    try {
      const payload = {
        ...(mode === 'edit' && job?.id_pekerjaan ? { id_pekerjaan: Number(job.id_pekerjaan) } : {}),
        nama_pekerjaan: formData.nama_pekerjaan.trim(),
        kode_pekerjaan: formData.kode_pekerjaan.trim() || undefined,
        deskripsi: formData.deskripsi.trim(),
        status: formData.status,
        tanggal_mulai: formData.tanggal_mulai,
        target_selesai: formData.target_selesai,
        hari_kerja_per_bulan: Number(formData.hari_kerja_per_bulan),
        jam_kerja_per_hari: Number(formData.jam_kerja_per_hari),
        jam_masuk_standar: formData.jam_masuk_standar.length === 5 ? `${formData.jam_masuk_standar}:00` : formData.jam_masuk_standar,
        jam_pulang_standar: formData.jam_pulang_standar.length === 5 ? `${formData.jam_pulang_standar}:00` : formData.jam_pulang_standar,
        tanggal_cutoff: Number(formData.tanggal_cutoff),
        tanggal_pencairan: Number(formData.tanggal_pencairan),

        lokasi: formData.lokasi.trim(),
        metode_lokasi: formData.metode_lokasi,
        latitude: formData.metode_lokasi === 'wfh' ? '' : formData.latitude,
        longitude: formData.metode_lokasi === 'wfh' ? '' : formData.longitude,
        radius_meter: Number(formData.radius_meter) || 100,
        toleransi_terlambat_menit: Number(formData.toleransi_terlambat_menit) || 15,
        lembur_diizinkan: formData.lembur_diizinkan,
        buffer_lembur_persen: Number(formData.buffer_lembur_persen) || 10,
        metode_penentuan: 'langsung',
        status_pengambilan: 'ditutup',

        role_budgets: formData.role_budgets.map((b) => ({
          id_role: Number(b.id_role),
          kuota_slot: Number(b.kuota_slot) || 1,
          gaji_min_bulanan: Number(b.gaji_min_bulanan) || 0,
          gaji_max_bulanan: Number(b.gaji_max_bulanan) || 0,
        })),
      }

      let res
      if (mode === 'edit' && job?.id_pekerjaan) {
        res = await updatePekerjaan(job.id_pekerjaan, payload)
      } else {
        res = await createPekerjaan(payload)
      }

      setSuccessJob(res || { id_pekerjaan: job?.id_pekerjaan, ...payload })
      onSaved?.(res)
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan proyek.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const stepsMeta = [
    { num: 1, label: 'Info & Waktu Kerja' },
    { num: 2, label: 'Lokasi & Absensi' },
    { num: 3, label: 'Blueprint Tim & Role' },
    { num: 4, label: 'Ringkasan & Simpan' },
  ]

  // Hitung total kuota dan estimasi budget untuk Step 4
  const summaryMeta = useMemo(() => {
    const totalSlot = formData.role_budgets.reduce((acc, r) => acc + (Number(r.kuota_slot) || 0), 0)
    let durasiBulan = 1
    if (formData.tanggal_mulai && formData.target_selesai) {
      const diff = Math.max(0, new Date(formData.target_selesai) - new Date(formData.tanggal_mulai))
      durasiBulan = Math.max(0.5, Number((Math.ceil(diff / (1000 * 60 * 60 * 24)) / 30.4375).toFixed(2)))
    }
    const minBulan = formData.role_budgets.reduce(
      (acc, r) => acc + (Number(r.gaji_min_bulanan) || 0) * (Number(r.kuota_slot) || 1),
      0,
    )
    const maxBulan = formData.role_budgets.reduce(
      (acc, r) => acc + (Number(r.gaji_max_bulanan) || 0) * (Number(r.kuota_slot) || 1),
      0,
    )
    const grandMin = Math.round(minBulan * durasiBulan)
    const grandMax = Math.round(maxBulan * durasiBulan)
    const buffer = formData.lembur_diizinkan ? Math.round(grandMax * (Number(formData.buffer_lembur_persen) / 100)) : 0

    return {
      totalSlot,
      durasiBulan,
      grandMin,
      grandMax,
      buffer,
      grandTotalWithBuffer: grandMax + buffer,
    }
  }, [formData])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-xs transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) onClose()
      }}
    >
      <div className="w-full max-w-4xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6 flex flex-col max-h-[90vh]">
        {/* Header Modal */}
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-600">
              {mode === 'edit' ? 'Perbarui Proyek' : 'Wizard Proyek 4 Tahap'}
            </span>
            <h2 className="text-base sm:text-lg font-bold text-slate-900">
              {mode === 'edit' ? `Edit Proyek: ${job?.nama_pekerjaan || ''}` : 'Buat Proyek & Standar Kerja Baru'}
            </h2>
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

        {/* Stepper Indikator (Hanya jika belum sukses) */}
        {!successJob && (
          <div className="border-b border-slate-100 bg-white px-6 py-3">
            <div className="grid grid-cols-4 gap-2">
              {stepsMeta.map((s) => {
                const isActive = currentStep === s.num
                const isPassed = currentStep > s.num
                return (
                  <button
                    key={s.num}
                    type="button"
                    onClick={() => {
                      if (s.num < currentStep) setCurrentStep(s.num)
                      else if (validateStep(currentStep)) setCurrentStep(s.num)
                    }}
                    className={`flex items-center gap-2 rounded-lg p-2 text-left transition ${
                      isActive
                        ? 'bg-blue-50 text-blue-800 ring-1 ring-blue-600/20'
                        : isPassed
                          ? 'text-emerald-700 hover:bg-slate-50'
                          : 'text-slate-400 hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold ${
                        isActive
                          ? 'bg-blue-600 text-white'
                          : isPassed
                            ? 'bg-emerald-600 text-white'
                            : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {isPassed ? '✓' : s.num}
                    </span>
                    <span className="hidden sm:inline text-xs font-semibold truncate">{s.label}</span>
                  </button>
                )
              })}
            </div>
          </div>
        )}

        {/* Error Alert */}
        {errorMessage && (
          <div className="mx-6 mt-4 flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
            <span>⚠️</span>
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="overflow-y-auto p-6 flex-1">
          {successJob ? (
            /* Layar Sukses */
            <div className="py-8 text-center space-y-4">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-emerald-600 text-2xl">
                ✓
              </div>
              <h3 className="text-lg font-bold text-slate-900">
                {mode === 'edit' ? 'Proyek Berhasil Diperbarui!' : 'Proyek Berhasil Dibuat!'}
              </h3>
              <p className="mx-auto max-w-md text-xs sm:text-sm text-slate-600">
                Proyek <strong className="text-slate-900">{successJob.nama_pekerjaan}</strong>{' '}
                {successJob.kode_pekerjaan ? `(${successJob.kode_pekerjaan}) ` : ''}telah tersimpan dengan blueprint role dan standar kerja yang lengkap.
              </p>

              <div className="pt-4 flex flex-wrap items-center justify-center gap-3">
                <button
                  type="button"
                  onClick={() => onProceedToSlots?.(successJob)}
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                >
                  👥 Lanjut Assign Pekerja ke Slot
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          ) : (
            <div>
              {/* TAHAP 1: Info Dasar & Kalender */}
              {currentStep === 1 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Proyek / Pekerjaan <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={formData.nama_pekerjaan}
                        onChange={(e) => handleChange('nama_pekerjaan', e.target.value)}
                        placeholder="Contoh: Instalasi Server Cabang Surabaya"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Kode Proyek (Opsional)
                      </label>
                      <input
                        type="text"
                        value={formData.kode_pekerjaan}
                        onChange={(e) => handleChange('kode_pekerjaan', e.target.value)}
                        placeholder="Kosongkan untuk generate otomatis PRJ-YYYYMM-XXX"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Deskripsi / Rincian Pekerjaan
                    </label>
                    <textarea
                      rows={2}
                      value={formData.deskripsi}
                      onChange={(e) => handleChange('deskripsi', e.target.value)}
                      placeholder="Tuliskan lingkup tugas atau instruksi kerja untuk karyawan..."
                      className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Status Proyek
                      </label>
                      <select
                        value={formData.status}
                        onChange={(e) => handleChange('status', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="belum_mulai">Belum Dimulai (Draft)</option>
                        <option value="berjalan">Sedang Berjalan (Aktif)</option>
                        <option value="selesai">Selesai</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Tanggal Mulai <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.tanggal_mulai}
                        onChange={(e) => handleChange('tanggal_mulai', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Target Selesai <span className="text-rose-500">*</span>
                      </label>
                      <input
                        type="date"
                        value={formData.target_selesai}
                        onChange={(e) => handleChange('target_selesai', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Standar Kalender & Jam Kerja */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block">
                      Standar Kalender Kerja & Siklus Penggajian
                    </span>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Hari Kerja/Bulan
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.hari_kerja_per_bulan}
                          onChange={(e) => handleChange('hari_kerja_per_bulan', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jam Kerja/Hari
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="24"
                          value={formData.jam_kerja_per_hari}
                          onChange={(e) => handleChange('jam_kerja_per_hari', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jam Masuk Standar
                        </label>
                        <input
                          type="time"
                          value={formData.jam_masuk_standar}
                          onChange={(e) => handleChange('jam_masuk_standar', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Jam Pulang Standar
                        </label>
                        <input
                          type="time"
                          value={formData.jam_pulang_standar}
                          onChange={(e) => handleChange('jam_pulang_standar', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 text-xs">
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tanggal Cut-off Absensi (Tiap Bulan)
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.tanggal_cutoff}
                          onChange={(e) => handleChange('tanggal_cutoff', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">Contoh: 25 (Absensi dihitung s.d. tanggal 25)</span>
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                          Tanggal Pencairan Gaji
                        </label>
                        <input
                          type="number"
                          min="1"
                          max="31"
                          value={formData.tanggal_pencairan}
                          onChange={(e) => handleChange('tanggal_pencairan', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">Contoh: 28 (Gaji dibayarkan tanggal 28)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 2: Lokasi & Aturan Absensi */}
              {currentStep === 2 && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Metode Presensi Lokasi <span className="text-rose-500">*</span>
                      </label>
                      <select
                        value={formData.metode_lokasi}
                        onChange={(e) => handleChange('metode_lokasi', e.target.value)}
                        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      >
                        <option value="titik">Presensi di Titik Lokasi Kerja (Geofence GPS)</option>
                        <option value="wfh">WFH / Fleksibel (Bisa Absen dari Mana Saja)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama / Alamat Lokasi Proyek
                      </label>
                      <input
                        type="text"
                        value={formData.lokasi}
                        onChange={(e) => handleChange('lokasi', e.target.value)}
                        placeholder="Contoh: Jl. Ahmad Yani No. 45, Gedung Cyber Lt. 3"
                        className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs sm:text-sm text-slate-800 focus:border-blue-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {formData.metode_lokasi === 'titik' && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Latitude</label>
                          <input
                            type="text"
                            value={formData.latitude}
                            onChange={(e) => handleChange('latitude', e.target.value)}
                            placeholder="-6.2088"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Longitude</label>
                          <input
                            type="text"
                            value={formData.longitude}
                            onChange={(e) => handleChange('longitude', e.target.value)}
                            placeholder="106.8456"
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-semibold text-slate-600 mb-1">Radius Validasi (Meter)</label>
                          <input
                            type="number"
                            min="10"
                            max="5000"
                            value={formData.radius_meter}
                            onChange={(e) => handleChange('radius_meter', e.target.value)}
                            className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800"
                          />
                        </div>
                      </div>

                      {/* Map Picker */}
                      <InteractiveMapPicker
                        latitude={formData.latitude}
                        longitude={formData.longitude}
                        radiusMeter={formData.radius_meter}
                        locationName={formData.lokasi}
                        onCoordinateChange={(lat, lng) => {
                          setFormData((prev) => ({
                            ...prev,
                            latitude: String(lat),
                            longitude: String(lng),
                          }))
                        }}
                      />
                    </div>
                  )}

                  {/* Aturan Keterlambatan & Lembur */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-4">
                    <span className="font-bold text-xs uppercase tracking-wider text-slate-600 block">
                      Aturan Evaluasi Presensi & Buffer Lembur
                    </span>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <label className="block font-semibold text-slate-700 mb-1">
                          Toleransi Keterlambatan (Menit)
                        </label>
                        <input
                          type="number"
                          min="0"
                          max="120"
                          value={formData.toleransi_terlambat_menit}
                          onChange={(e) => handleChange('toleransi_terlambat_menit', e.target.value)}
                          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                        />
                        <span className="text-[10px] text-slate-400">
                          Karyawan yang masuk melewati jam masuk standar + toleransi ini akan diberi tanda terlambat.
                        </span>
                      </div>

                      <div className="space-y-2">
                        <label className="flex items-center gap-2 cursor-pointer pt-1">
                          <input
                            type="checkbox"
                            checked={formData.lembur_diizinkan}
                            onChange={(e) => handleChange('lembur_diizinkan', e.target.checked)}
                            className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="font-semibold text-slate-800">
                            Izinkan Lembur untuk Proyek Ini
                          </span>
                        </label>

                        {formData.lembur_diizinkan && (
                          <div className="pl-6 pt-1">
                            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                              Buffer Anggaran Lembur (%)
                            </label>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              value={formData.buffer_lembur_persen}
                              onChange={(e) => handleChange('buffer_lembur_persen', e.target.value)}
                              className="w-32 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 focus:border-blue-500 focus:outline-none"
                            />
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              Persentase cadangan anggaran di atas batas Max untuk kebutuhan lembur pekerja.
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAHAP 3: Blueprint Tim & Role */}
              {currentStep === 3 && (
                <RoleBlueprintStep
                  roleBudgets={formData.role_budgets}
                  onChangeRoleBudgets={(updated) => handleChange('role_budgets', updated)}
                  calendarConfig={{
                    hari_kerja_per_bulan: formData.hari_kerja_per_bulan,
                    jam_kerja_per_hari: formData.jam_kerja_per_hari,
                    lembur_diizinkan: formData.lembur_diizinkan,
                    buffer_lembur_persen: formData.buffer_lembur_persen,
                    tanggal_mulai: formData.tanggal_mulai,
                    target_selesai: formData.target_selesai,
                  }}
                />
              )}

              {/* TAHAP 4: Ringkasan & Konfirmasi */}
              {currentStep === 4 && (
                <div className="space-y-4 text-xs">
                  <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                    <h4 className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">
                      Ringkasan Informasi Proyek
                    </h4>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Nama Proyek</span>
                        <span className="font-bold text-slate-800">{formData.nama_pekerjaan}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Kode Proyek</span>
                        <span className="font-bold text-slate-800">{formData.kode_pekerjaan || '(Auto PRJ-YYYYMM-XXX)'}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Periode Kerja</span>
                        <span className="font-semibold text-slate-800">
                          {formatDateIndo(formData.tanggal_mulai)} s.d. {formatDateIndo(formData.target_selesai)}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px]">Status</span>
                        <span className="font-bold text-blue-700 capitalize">{formData.status.replace('_', ' ')}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Kalender & Siklus Gaji
                      </h4>
                      <p>Hari kerja: <strong>{formData.hari_kerja_per_bulan} hari/bulan</strong> ({formData.jam_kerja_per_hari} jam/hari)</p>
                      <p>Jam Masuk/Pulang: <strong>{formData.jam_masuk_standar} – {formData.jam_pulang_standar}</strong></p>
                      <p>Siklus: Cut-off tgl <strong>{formData.tanggal_cutoff}</strong>, Cair tgl <strong>{formData.tanggal_pencairan}</strong></p>
                      <p>Toleransi Terlambat: <strong>{formData.toleransi_terlambat_menit} menit</strong></p>
                    </div>

                    <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-2">
                      <h4 className="font-bold text-slate-900 border-b border-slate-100 pb-2">
                        Lokasi & Aturan Lembur
                      </h4>
                      <p>Metode Lokasi: <strong className="capitalize">{formData.metode_lokasi}</strong></p>
                      <p>Nama Lokasi: <strong>{formData.lokasi || '—'}</strong></p>
                      <p>Lembur: <strong>{formData.lembur_diizinkan ? `Aktif (Buffer ${formData.buffer_lembur_persen}%)` : 'Tidak Diizinkan'}</strong></p>
                    </div>
                  </div>

                  {/* Ringkasan Tim & Budget */}
                  <div className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3">
                    <div className="flex items-center justify-between border-b border-blue-100 pb-2">
                      <h4 className="font-bold text-blue-950">
                        Blueprint Tim ({formData.role_budgets.length} Role, Total {summaryMeta.totalSlot} Slot)
                      </h4>
                      <span className="font-semibold text-blue-800 text-[11px]">
                        Estimasi {summaryMeta.durasiBulan} Bulan
                      </span>
                    </div>

                    {formData.role_budgets.length === 0 ? (
                      <p className="text-slate-500 italic">Belum ada role yang dikonfigurasi. Anda dapat mengaturnya nanti.</p>
                    ) : (
                      <div className="divide-y divide-blue-100">
                        {formData.role_budgets.map((b, idx) => (
                          <div key={idx} className="py-2 flex items-center justify-between">
                            <div>
                              <span className="font-bold text-slate-900">{b.nama_role}</span>
                              <span className="text-[11px] text-slate-500 ml-2">({b.kuota_slot} pekerja)</span>
                            </div>
                            <span className="text-xs text-slate-600 bg-white border border-blue-200/80 px-2.5 py-1 rounded-lg font-medium">
                              Upah fleksibel saat penugasan
                            </span>
                          </div>
                        ))}

                        <div className="pt-3 flex flex-wrap items-center justify-between text-xs font-bold text-blue-950">
                          <span>Total Kebutuhan Pekerja:</span>
                          <span className="text-blue-700 font-bold">
                            {summaryMeta.totalSlot} Slot Pekerja
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer (Navigasi Stepper) */}
        {!successJob && (
          <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50/80 px-6 py-4">
            <button
              type="button"
              onClick={currentStep === 1 ? onClose : handlePrev}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer disabled:opacity-50"
            >
              {currentStep === 1 ? 'Batal' : '← Sebelumnya'}
            </button>

            <div className="flex items-center gap-2">
              {currentStep < 4 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 transition cursor-pointer"
                >
                  Lanjut →
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={isSubmitting}
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 transition cursor-pointer disabled:opacity-50"
                >
                  {isSubmitting ? (
                    <span>Menyimpan...</span>
                  ) : (
                    <>
                      <span>💾</span>
                      <span>Simpan Proyek</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
