import { useEffect, useMemo, useRef, useState } from 'react'
import {
  STATUS_PEKERJAAN,
  STATUS_PEKERJAAN_OPTIONS,
} from '../../data/pekerjaan.js'
import {
  createPekerjaan,
  deletePekerjaan,
  getPekerjaan,
  getPekerjaanById,
  updatePekerjaan,
} from '../../services/pekerjaanApi.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 8
const EMPTY_FORM = {
  nama_pekerjaan: '',
  deskripsi: '',
  lokasi: '',
  tanggal_mulai: '',
  target_selesai: '',
  status: STATUS_PEKERJAAN.BELUM_MULAI,
  metode_penentuan: 'terbuka',
  id_karyawan_list: [],
}

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Mulai',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    color: '#f59e0b',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20',
    color: '#2563eb',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    color: '#10b981',
  },
}

function formatDate(value) {
  if (!value) return '—'
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00`))
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function WorkIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
    work: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    sort: <path d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />,
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    'rotate-ccw': (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name] || null}
    </svg>
  )
}

function StatusBadge({ status }) {
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold ${presentation.className}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {presentation.label}
    </span>
  )
}

function WorkModal({ mode, job, employees, onClose, onSave, isSaving }) {
  const isDetail = mode === 'detail'
  const isEdit = mode === 'edit'

  const initialEmployeeIds = useMemo(() => {
    if (!job) return []
    if (job.assigned_workers && job.assigned_workers.length > 0) {
      return job.assigned_workers.map((w) => Number(w.id_karyawan))
    }
    if (job.id_karyawan_list) {
      return String(job.id_karyawan_list)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    }
    return []
  }, [job])

  const [values, setValues] = useState(
    job
      ? {
          nama_pekerjaan: job.nama_pekerjaan || '',
          deskripsi: job.deskripsi || '',
          lokasi: job.lokasi || '',
          tanggal_mulai: job.tanggal_mulai || '',
          target_selesai: job.target_selesai || '',
          status: job.status || STATUS_PEKERJAAN.BELUM_MULAI,
          metode_penentuan: job.metode_penentuan || 'terbuka',
          id_karyawan_list: initialEmployeeIds,
        }
      : {
          ...EMPTY_FORM,
          id_karyawan_list: [],
        },
  )
  const [validationMessage, setValidationMessage] = useState('')

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setValidationMessage('')
  }

  function toggleEmployee(employeeId) {
    const id = Number(employeeId)
    setValues((current) => {
      const exists = current.id_karyawan_list.includes(id)
      return {
        ...current,
        id_karyawan_list: exists
          ? current.id_karyawan_list.filter((x) => x !== id)
          : [...current.id_karyawan_list, id],
      }
    })
    setValidationMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const normalized = {
      nama_pekerjaan: values.nama_pekerjaan.trim(),
      deskripsi: values.deskripsi.trim(),
      lokasi: values.lokasi.trim(),
      tanggal_mulai: values.tanggal_mulai || null,
      target_selesai: values.target_selesai || null,
      status: values.status,
      metode_penentuan: values.metode_penentuan,
      id_karyawan_list:
        values.metode_penentuan === 'langsung' ? values.id_karyawan_list : [],
    }

    if (!normalized.nama_pekerjaan) {
      setValidationMessage('Nama pekerjaan wajib diisi.')
      return
    }
    if (
      normalized.tanggal_mulai &&
      normalized.target_selesai &&
      normalized.target_selesai < normalized.tanggal_mulai
    ) {
      setValidationMessage(
        'Target selesai tidak boleh lebih awal dari tanggal mulai.',
      )
      return
    }
    if (
      normalized.metode_penentuan === 'langsung' &&
      normalized.id_karyawan_list.length === 0
    ) {
      setValidationMessage(
        'Pilih minimal satu pekerja untuk metode penetapan langsung.',
      )
      return
    }

    setValidationMessage('')
    await onSave(normalized)
  }

  const title =
    mode === 'create'
      ? 'Tambah Pekerjaan Baru'
      : isEdit
        ? 'Edit Data Pekerjaan'
        : 'Detail Pekerjaan'
  const subtitle =
    mode === 'create'
      ? 'Masukkan informasi proyek dan tentukan metode penugasan kerja.'
      : isEdit
        ? `Perbarui rincian jadwal atau penugasan untuk proyek ${job?.nama_pekerjaan}.`
        : `Rincian lengkap spesifikasi proyek dan pekerja yang bertugas.`

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <h2
              id="job-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <WorkIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {isDetail ? (
          <div className="p-6 space-y-5">
            <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <span className="font-mono text-xs font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                  ID: {job?.id_pekerjaan}
                </span>
                <StatusBadge status={job?.status} />
              </div>
              <h3 className="mt-2 text-lg font-bold text-slate-900">
                {job?.nama_pekerjaan}
              </h3>
              <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                <WorkIcon name="location" className="h-3.5 w-3.5 text-slate-400" />
                {job?.lokasi || 'Lokasi belum ditentukan'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="text-slate-500 font-medium">Tanggal Mulai</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(job?.tanggal_mulai)}
                </p>
              </div>
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="text-slate-500 font-medium">Target Selesai (Deadline)</span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {formatDate(job?.target_selesai)}
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm text-xs">
              <span className="text-slate-500 font-medium">Metode Penugasan</span>
              <div className="mt-1.5 flex items-center gap-2">
                <span
                  className={`inline-flex items-center rounded-md px-2.5 py-1 font-semibold ${
                    job?.metode_penentuan === 'langsung'
                      ? 'bg-sky-50 text-sky-700 ring-1 ring-sky-600/10'
                      : 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/10'
                  }`}
                >
                  {job?.metode_penentuan === 'langsung'
                    ? 'Penetapan Langsung oleh Admin'
                    : 'Terbuka (Bisa Diambil Mandiri)'}
                </span>
              </div>
              <p className="mt-2 text-slate-600">
                Pekerja Terlibat:{' '}
                <strong className="text-slate-900">
                  {job?.nama_karyawan_list || 'Belum ada pekerja'}
                </strong>
              </p>
            </div>

            {job?.deskripsi && (
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm text-xs">
                <span className="text-slate-500 font-medium">Deskripsi Pekerjaan</span>
                <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">
                  {job.deskripsi}
                </p>
              </div>
            )}

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {validationMessage && (
              <div
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                role="alert"
              >
                <WorkIcon name="alert" className="h-4 w-4 shrink-0 text-rose-600" />
                <span>{validationMessage}</span>
              </div>
            )}

            {/* Nama Pekerjaan */}
            <div>
              <label
                htmlFor="job-nama"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Pekerjaan / Proyek <span className="text-rose-500">*</span>
              </label>
              <input
                id="job-nama"
                type="text"
                required
                autoFocus
                maxLength={150}
                placeholder="Contoh: Instalasi Jaringan Gedung B"
                value={values.nama_pekerjaan}
                onChange={(e) => updateField('nama_pekerjaan', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Lokasi */}
            <div>
              <label
                htmlFor="job-lokasi"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Lokasi Pekerjaan
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                  <WorkIcon name="location" className="h-4 w-4" />
                </span>
                <input
                  id="job-lokasi"
                  type="text"
                  maxLength={150}
                  placeholder="Contoh: Kantor Cabang Sudirman, Lantai 2"
                  value={values.lokasi}
                  onChange={(e) => updateField('lokasi', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
            </div>

            {/* Tanggal & Status */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div>
                <label
                  htmlFor="job-tgl-mulai"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Tanggal Mulai
                </label>
                <input
                  id="job-tgl-mulai"
                  type="date"
                  value={values.tanggal_mulai}
                  onChange={(e) => updateField('tanggal_mulai', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="job-target-selesai"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Target Selesai (Deadline)
                </label>
                <input
                  id="job-target-selesai"
                  type="date"
                  value={values.target_selesai}
                  onChange={(e) => updateField('target_selesai', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>

              <div>
                <label
                  htmlFor="job-status"
                  className="block text-xs font-semibold text-slate-700 mb-1.5"
                >
                  Status Pekerjaan
                </label>
                <select
                  id="job-status"
                  value={values.status}
                  onChange={(e) => updateField('status', e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                >
                  <option value={STATUS_PEKERJAAN.BELUM_MULAI}>Belum Mulai</option>
                  <option value={STATUS_PEKERJAAN.BERJALAN}>Sedang Berjalan</option>
                  <option value={STATUS_PEKERJAAN.SELESAI}>Selesai</option>
                </select>
              </div>
            </div>

            {/* Metode Penentuan Pekerja */}
            <div className="space-y-2 pt-1">
              <span className="block text-xs font-semibold text-slate-700">
                Metode Penentuan Pekerja <span className="text-rose-500">*</span>
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                    values.metode_penentuan === 'terbuka'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="metode_penentuan"
                      value="terbuka"
                      checked={values.metode_penentuan === 'terbuka'}
                      onChange={() => updateField('metode_penentuan', 'terbuka')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Buka untuk Pekerja
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Muncul di halaman Pekerjaan Tersedia dan dapat diambil mandiri oleh teknisi.
                  </p>
                </label>

                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                    values.metode_penentuan === 'langsung'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="metode_penentuan"
                      value="langsung"
                      checked={values.metode_penentuan === 'langsung'}
                      onChange={() => updateField('metode_penentuan', 'langsung')}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="text-xs sm:text-sm font-bold text-slate-800">
                      Tetapkan Langsung
                    </span>
                  </div>
                  <p className="mt-1 text-[11px] text-slate-500 leading-relaxed">
                    Admin menunjuk teknisi secara spesifik. Tidak dapat diambil oleh pekerja lain.
                  </p>
                </label>
              </div>
            </div>

            {/* Checkbox Karyawan jika Penetapan Langsung */}
            {values.metode_penentuan === 'langsung' && (
              <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-700">
                    Pilih Pekerja yang Ditugaskan <span className="text-rose-500">*</span>
                  </span>
                  <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                    {values.id_karyawan_list.length} dipilih
                  </span>
                </div>

                <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 p-1">
                  {employees.length === 0 ? (
                    <p className="p-3 text-center text-xs text-slate-400">
                      Belum ada data karyawan.
                    </p>
                  ) : (
                    employees.map((emp) => {
                      const isChecked = values.id_karyawan_list.includes(emp.id_karyawan)
                      return (
                        <label
                          key={emp.id_karyawan}
                          className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition text-xs ${
                            isChecked
                              ? 'bg-blue-50/80 text-blue-900 font-semibold'
                              : 'hover:bg-slate-50 text-slate-700'
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => toggleEmployee(emp.id_karyawan)}
                            className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                          />
                          <span className="flex-1 truncate">{emp.nama}</span>
                          <span className="text-[11px] text-slate-400">
                            {emp.jabatan || 'Teknisi'}
                          </span>
                        </label>
                      )
                    })
                  )}
                </div>
              </div>
            )}

            {/* Deskripsi */}
            <div>
              <label
                htmlFor="job-deskripsi"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Deskripsi Pekerjaan
              </label>
              <textarea
                id="job-deskripsi"
                rows={3}
                placeholder="Rincian instruksi teknis dan lingkup pekerjaan..."
                value={values.deskripsi}
                onChange={(e) => updateField('deskripsi', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-wait"
              >
                {isSaving ? (
                  <>
                    <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : mode === 'create' ? (
                  'Simpan Pekerjaan'
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function DataPekerjaan() {
  const [store, setStore] = useState({
    pekerjaan: [],
    isLoading: true,
    isSaving: false,
    error: '',
  })
  const { pekerjaan, isLoading, isSaving, error } = store
  const [employees, setEmployees] = useState([])
  const [notice, setNotice] = useState(null)
  const [modal, setModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const isMounted = useRef(false)

  async function loadData() {
    try {
      const [loadedJobs, loadedEmployees] = await Promise.all([
        getPekerjaan(),
        getKaryawan(),
      ])
      if (isMounted.current) {
        setStore({
          pekerjaan: loadedJobs,
          isLoading: false,
          isSaving: false,
          error: '',
        })
        setEmployees(loadedEmployees)
      }
    } catch (loadError) {
      if (isMounted.current) {
        setStore((current) => ({
          ...current,
          isLoading: false,
          error: `Data pekerjaan tidak dapat dimuat: ${loadError.message}`,
        }))
      }
    }
  }

  useEffect(() => {
    isMounted.current = true
    loadData()
    return () => {
      isMounted.current = false
    }
  }, [])

  function showToast(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return pekerjaan
      .filter((job) => {
        const matchesName =
          !normalizedSearch ||
          job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedSearch) ||
          String(job.id_pekerjaan).includes(normalizedSearch) ||
          (job.lokasi && job.lokasi.toLocaleLowerCase('id-ID').includes(normalizedSearch)) ||
          (job.nama_karyawan_list &&
            job.nama_karyawan_list.toLocaleLowerCase('id-ID').includes(normalizedSearch))

        const matchesStatus = !statusFilter || job.status === statusFilter

        let matchesMethod = true
        if (methodFilter === 'langsung') {
          matchesMethod = job.metode_penentuan === 'langsung'
        } else if (methodFilter === 'terbuka_tersedia') {
          matchesMethod =
            job.metode_penentuan === 'terbuka' &&
            Number(job.total_pekerja || 0) === 0 &&
            (!job.target_selesai || job.target_selesai >= today) &&
            job.status !== STATUS_PEKERJAAN.SELESAI
        } else if (methodFilter === 'terbuka_diambil') {
          matchesMethod =
            job.metode_penentuan === 'terbuka' && Number(job.total_pekerja || 0) > 0
        } else if (methodFilter === 'expired') {
          matchesMethod =
            Boolean(job.target_selesai) &&
            job.target_selesai < today &&
            job.status !== STATUS_PEKERJAAN.SELESAI
        }

        return matchesName && matchesStatus && matchesMethod
      })
      .sort((left, right) => {
        const comparison = left.nama_pekerjaan.localeCompare(
          right.nama_pekerjaan,
          'id',
          { sensitivity: 'base' },
        )
        return comparison * (sortOrder === 'asc' ? 1 : -1)
      })
  }, [methodFilter, pekerjaan, search, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleJobs = filteredJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const statistics = useMemo(
    () => ({
      total: pekerjaan.length,
      belumMulai: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.BELUM_MULAI,
      ).length,
      berjalan: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.BERJALAN,
      ).length,
      selesai: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.SELESAI,
      ).length,
    }),
    [pekerjaan],
  )

  const hasActiveFilters = Boolean(search || statusFilter || methodFilter)

  function resetFilters() {
    setSearch('')
    setStatusFilter('')
    setMethodFilter('')
    setPage(1)
  }

  async function handleSaveJob(values) {
    setStore((current) => ({ ...current, isSaving: true, error: '' }))
    try {
      if (modal.mode === 'create') {
        await createPekerjaan(values)
        showToast('Pekerjaan berhasil ditambahkan.')
      } else {
        await updatePekerjaan(modal.job.id_pekerjaan, values)
        showToast('Data pekerjaan berhasil diperbarui.')
      }
      setModal(null)
      await loadData()
    } catch (saveError) {
      setStore((current) => ({ ...current, isSaving: false }))
      showToast(`Perubahan gagal disimpan: ${saveError.message}`, 'error')
    }
  }

  async function handleDeleteJob(job) {
    setStore((current) => ({ ...current, isSaving: true, error: '' }))
    try {
      await deletePekerjaan(job.id_pekerjaan)
      setStore((current) => ({
        ...current,
        pekerjaan: current.pekerjaan.filter(
          (item) => item.id_pekerjaan !== job.id_pekerjaan,
        ),
        isSaving: false,
        error: '',
      }))
      showToast('Pekerjaan berhasil dihapus.')
      setPendingDelete(null)
    } catch (deleteError) {
      setStore((current) => ({
        ...current,
        isSaving: false,
      }))
      setPendingDelete(null)
      showToast(`Pekerjaan gagal dihapus: ${deleteError.message}`, 'error')
    }
  }

  async function editJob(job) {
    setLoadingDetailId(job.id_pekerjaan)
    try {
      const currentJob = await getPekerjaanById(job.id_pekerjaan)
      setModal({ mode: 'edit', job: currentJob })
    } catch (detailError) {
      showToast(`Detail pekerjaan gagal dimuat: ${detailError.message}`, 'error')
    } finally {
      setLoadingDetailId(null)
    }
  }

  async function showJobDetail(job) {
    setLoadingDetailId(job.id_pekerjaan)
    try {
      const currentJob = await getPekerjaanById(job.id_pekerjaan)
      setModal({ mode: 'detail', job: currentJob })
    } catch (detailError) {
      showToast(`Detail pekerjaan gagal dimuat: ${detailError.message}`, 'error')
    } finally {
      setLoadingDetailId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* Header Halaman Modern */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Data Pekerjaan</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Data Pekerjaan
            </h1>
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {statistics.total} proyek
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Kelola seluruh proyek pekerjaan, metode penentuan penugasan, lokasi,
            dan batas waktu target selesai.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            disabled={isLoading || Boolean(error)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <WorkIcon name="plus" className="h-4 w-4" />
            <span>Tambah Pekerjaan</span>
          </button>
        </div>
      </header>

      {/* Toast Alert */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-sm shadow-sm transition-all ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <WorkIcon
              name={notice.type === 'error' ? 'alert' : 'check'}
              className={`h-4 w-4 shrink-0 ${
                notice.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            />
            <span className="font-medium text-xs sm:text-sm">{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 transition"
          >
            <WorkIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Server */}
      {error && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <WorkIcon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => {
              setStore((current) => ({
                ...current,
                isLoading: true,
                error: '',
              }))
              loadData()
            }}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 4 Kartu Statistik */}
      <section
        aria-label="Statistik Pekerjaan"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {[
          {
            label: 'Total Pekerjaan',
            value: statistics.total,
            tone: 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10',
            sub: 'Seluruh proyek',
          },
          {
            label: 'Belum Mulai',
            value: statistics.belumMulai,
            tone: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10',
            sub: 'Menunggu jadwal',
          },
          {
            label: 'Sedang Berjalan',
            value: statistics.berjalan,
            tone: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/10',
            sub: 'Dikerjakan teknisi',
          },
          {
            label: 'Pekerjaan Selesai',
            value: statistics.selesai,
            tone: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
            sub: 'Telah rampung',
          },
        ].map((stat) => (
          <article
            key={stat.label}
            className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                {stat.label}
              </p>
              <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
                {isLoading ? '—' : stat.value}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-400">{stat.sub}</p>
            </div>
            <div
              className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${stat.tone}`}
            >
              <WorkIcon name="work" className="h-5 w-5" />
            </div>
          </article>
        ))}
      </section>

      {/* Toolbar Pencarian & Filter Satu Baris */}
      <section
        aria-label="Pencarian dan Filter"
        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Pencarian */}
          <div className="relative flex-1 min-w-[220px]">
            <WorkIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari nama pekerjaan, lokasi, pekerja..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                title="Hapus pencarian"
              >
                <WorkIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status, Metode & Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Status */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Status</option>
                {STATUS_PEKERJAAN_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.value === STATUS_PEKERJAAN.BELUM_MULAI
                      ? 'Belum Mulai'
                      : status.label}
                  </option>
                ))}
              </select>
              <WorkIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Metode */}
            <div className="relative min-w-[160px] flex-1 sm:flex-initial">
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Metode</option>
                <option value="langsung">Penetapan Langsung</option>
                <option value="terbuka_tersedia">Terbuka (Tersedia)</option>
                <option value="terbuka_diambil">Terbuka (Sudah Diambil)</option>
                <option value="expired">Melewati Deadline</option>
              </select>
              <WorkIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Reset Filter Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Reset semua filter"
              >
                <WorkIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabel Data Pekerjaan */}
      <section
        aria-label="Tabel Data Pekerjaan"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 text-center w-14" scope="col">
                  No.
                </th>
                <th className="px-4 py-3.5" scope="col">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((order) =>
                        order === 'asc' ? 'desc' : 'asc',
                      )
                    }
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold"
                  >
                    <span>Nama Pekerjaan</span>
                    <WorkIcon name="sort" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Metode & Pekerja
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Lokasi
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Jadwal Mulai
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Target Selesai
                </th>
                <th className="px-4 py-3.5 text-center" scope="col">
                  Status
                </th>
                <th className="px-4 py-3.5 text-right w-36" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="h-6 w-6 animate-spin text-blue-600"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <p className="font-medium text-slate-600">
                        Memuat data pekerjaan...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleJobs.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <WorkIcon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Data pekerjaan tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Coba sesuaikan pencarian atau atur ulang filter Anda.'
                        : 'Belum ada data pekerjaan yang terdaftar.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <WorkIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleJobs.map((job, index) => {
                  const today = getJakartaToday()
                  const isExpired =
                    Boolean(job.target_selesai) &&
                    job.target_selesai < today &&
                    job.status !== STATUS_PEKERJAAN.SELESAI
                  const isDueToday =
                    Boolean(job.target_selesai) &&
                    job.target_selesai === today &&
                    job.status !== STATUS_PEKERJAAN.SELESAI

                  return (
                    <tr
                      key={job.id_pekerjaan}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* No */}
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium text-slate-400">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* Nama Pekerjaan & ID */}
                      <td className="px-4 py-3 max-w-64">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-[10px] font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            #{job.id_pekerjaan}
                          </span>
                          <p className="truncate font-semibold text-slate-900">
                            {job.nama_pekerjaan}
                          </p>
                        </div>
                        {job.deskripsi && (
                          <p className="mt-0.5 text-xs text-slate-400 truncate max-w-xs">
                            {job.deskripsi}
                          </p>
                        )}
                      </td>

                      {/* Metode & Pekerja */}
                      <td className="px-4 py-3">
                        {job.metode_penentuan === 'langsung' ? (
                          <div>
                            <span className="inline-flex items-center rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/10">
                              Penetapan Langsung
                            </span>
                            <p className="mt-1 text-xs text-slate-600 font-medium truncate max-w-44">
                              {job.nama_karyawan_list
                                ? job.nama_karyawan_list
                                : 'Belum ditetapkan'}
                            </p>
                          </div>
                        ) : (
                          <div>
                            {job.nama_karyawan_list ? (
                              <>
                                <span className="inline-flex items-center rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/10">
                                  Diambil Mandiri
                                </span>
                                <p className="mt-1 text-xs text-slate-600 font-medium truncate max-w-44">
                                  {job.nama_karyawan_list}
                                </p>
                              </>
                            ) : isExpired ? (
                              <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/10">
                                Terbuka (Expired)
                              </span>
                            ) : (
                              <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/10">
                                Terbuka (Tersedia)
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Lokasi */}
                      <td className="px-4 py-3 max-w-44">
                        <span className="flex items-center gap-1.5 truncate text-slate-600 text-xs">
                          <WorkIcon
                            name="location"
                            className="h-3.5 w-3.5 shrink-0 text-slate-400"
                          />
                          <span className="truncate">{job.lokasi || '—'}</span>
                        </span>
                      </td>

                      {/* Mulai */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatDate(job.tanggal_mulai)}
                      </td>

                      {/* Target Selesai (Deadline) */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className="font-semibold text-slate-800 block">
                          {formatDate(job.target_selesai)}
                        </span>
                        {isExpired && (
                          <span className="mt-0.5 inline-block text-[10px] font-bold text-rose-600">
                            Lewat Deadline
                          </span>
                        )}
                        {isDueToday && (
                          <span className="mt-0.5 inline-block text-[10px] font-bold text-amber-600">
                            Tenggat Hari Ini
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <StatusBadge status={job.status} />
                      </td>

                      {/* Aksi */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => showJobDetail(job)}
                            disabled={loadingDetailId === job.id_pekerjaan}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs disabled:opacity-50"
                            title={`Lihat detail ${job.nama_pekerjaan}`}
                            aria-label={`Lihat detail ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="eye" className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => editJob(job)}
                            disabled={loadingDetailId === job.id_pekerjaan}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 transition shadow-2xs disabled:opacity-50"
                            title={`Edit proyek ${job.nama_pekerjaan}`}
                            aria-label={`Edit proyek ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="edit" className="h-4 w-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(job)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs"
                            title={`Hapus proyek ${job.nama_pekerjaan}`}
                            aria-label={`Hapus proyek ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer & Paginasi */}
        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {filteredJobs.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredJobs.length}
            </span>{' '}
            pekerjaan
          </p>

          <div className="flex items-center justify-between gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
            >
              <WorkIcon name="previous" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <WorkIcon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Tambah / Edit / Detail */}
      {modal && (
        <WorkModal
          job={modal.job}
          employees={employees}
          isSaving={isSaving}
          mode={modal.mode}
          onClose={() => {
            if (!isSaving) setModal(null)
          }}
          onSave={handleSaveJob}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data pekerjaan ini? Penugasan yang terkait dengan pekerjaan ini juga akan dibatalkan."
          isProcessing={isSaving}
          itemName={`${pendingDelete.nama_pekerjaan} (#${pendingDelete.id_pekerjaan})`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteJob(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataPekerjaan
