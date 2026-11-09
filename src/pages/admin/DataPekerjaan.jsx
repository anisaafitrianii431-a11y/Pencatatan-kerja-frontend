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
import AdminPageBanner from '../../components/AdminPageBanner.jsx'
import ActionButtons from '../../components/ActionButtons.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 5
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
    className:
      'admin-status-pending bg-amber-100 text-amber-700 ring-amber-600/10',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Berjalan',
    className: 'admin-status-running bg-blue-50 text-blue-700 ring-blue-600/10',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className:
      'admin-status-complete bg-emerald-100 text-emerald-700 ring-emerald-600/10',
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

function WorkIcon({ name, className = 'h-5 w-5' }) {
  const paths = {
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
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
      {paths[name]}
    </svg>
  )
}

function StatusBadge({ status }) {
  const presentation = STATUS_PRESENTATION[status]

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${presentation?.className ?? 'bg-slate-100 text-slate-700'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {presentation?.label ?? status}
    </span>
  )
}

function WorkModal({ mode, job, employees, onClose, onSave, isSaving }) {
  const isDetail = mode === 'detail'

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
          nama_pekerjaan: job.nama_pekerjaan,
          deskripsi: job.deskripsi,
          lokasi: job.lokasi,
          tanggal_mulai: job.tanggal_mulai,
          target_selesai: job.target_selesai,
          status: job.status,
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
      tanggal_mulai: values.tanggal_mulai,
      target_selesai: values.target_selesai,
      status: values.status,
      metode_penentuan: values.metode_penentuan,
      id_karyawan_list:
        values.metode_penentuan === 'langsung' ? values.id_karyawan_list : [],
    }

    if (!normalized.nama_pekerjaan) {
      setValidationMessage('Nama pekerjaan wajib diisi.')
      return
    }
    if (normalized.nama_pekerjaan.length > 150) {
      setValidationMessage('Nama pekerjaan maksimal 150 karakter.')
      return
    }
    if (normalized.lokasi.length > 150) {
      setValidationMessage('Lokasi maksimal 150 karakter.')
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
    if (!Object.values(STATUS_PEKERJAAN).includes(normalized.status)) {
      setValidationMessage('Status pekerjaan tidak valid.')
      return
    }
    if (
      normalized.metode_penentuan === 'langsung' &&
      normalized.id_karyawan_list.length === 0
    ) {
      setValidationMessage(
        'Silakan pilih minimal satu pekerja dari database untuk metode penetapan langsung.',
      )
      return
    }

    await onSave(normalized)
  }

  const title =
    mode === 'create'
      ? 'Tambah Pekerjaan'
      : mode === 'edit'
        ? 'Edit Pekerjaan'
        : 'Detail Pekerjaan'

  const assignedWorkerDisplay = useMemo(() => {
    if (!job) return null
    if (job.assigned_workers && job.assigned_workers.length > 0) {
      return job.assigned_workers
        .map(
          (w) =>
            `${w.nama} (${w.jabatan || 'Pekerja'}) [${w.jenis_penugasan === 'mandiri' ? 'Diambil Mandiri' : 'Ditetapkan Admin'}]`,
        )
        .join(', ')
    }
    if (job.nama_karyawan_list) {
      return job.nama_karyawan_list
    }
    return null
  }, [job])

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        aria-labelledby="work-dialog-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-lg font-semibold text-slate-900"
              id="work-dialog-title"
            >
              {title}
            </h2>
            {job && (
              <p className="mt-1 text-sm text-slate-500">
                ID Pekerjaan: {job.id_pekerjaan}
              </p>
            )}
          </div>
          <button
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            disabled={isSaving}
            onClick={onClose}
            type="button"
          >
            <WorkIcon className="h-5 w-5" name="close" />
          </button>
        </div>

        {isDetail ? (
          <div className="space-y-5 px-5 py-6 sm:px-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-slate-400">
                  Nama Pekerjaan
                </p>
                <p className="mt-1 text-lg font-semibold text-slate-900">
                  {job.nama_pekerjaan}
                </p>
              </div>
              <StatusBadge status={job.status} />
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Metode Penentuan</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {job.metode_penentuan === 'langsung'
                    ? 'Tetapkan Pekerja Secara Langsung'
                    : 'Buka Pekerjaan untuk Dipilih Pekerja'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Pekerja yang Mengerjakan</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {assignedWorkerDisplay ||
                    (job.metode_penentuan === 'terbuka'
                      ? 'Belum diambil oleh pekerja (Tersedia)'
                      : 'Belum ditetapkan')}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Lokasi</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {job.lokasi || 'Belum ditentukan'}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-medium text-slate-500">Tanggal Mulai</p>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {formatDate(job.tanggal_mulai)}
                </p>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-medium text-slate-500">Target Selesai (Deadline)</p>
                <div className="mt-1 flex items-center gap-2">
                  <span className="text-sm font-semibold text-slate-800">
                    {formatDate(job.target_selesai)}
                  </span>
                  {job.target_selesai && (
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                        job.target_selesai < getJakartaToday() && job.status !== STATUS_PEKERJAAN.SELESAI
                          ? 'bg-rose-100 text-rose-700'
                          : job.target_selesai === getJakartaToday() && job.status !== STATUS_PEKERJAAN.SELESAI
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-emerald-100 text-emerald-700'
                      }`}
                    >
                      {job.target_selesai < getJakartaToday() && job.status !== STATUS_PEKERJAAN.SELESAI
                        ? 'Melewati Deadline'
                        : job.target_selesai === getJakartaToday() && job.status !== STATUS_PEKERJAAN.SELESAI
                          ? 'Tenggat Hari Ini'
                          : 'Aktif'}
                    </span>
                  )}
                </div>
              </div>

              <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
                <p className="text-xs font-medium text-slate-500">Deskripsi</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-800">
                  {job.deskripsi || 'Tidak ada deskripsi.'}
                </p>
              </div>
            </div>
          </div>
        ) : (
          <form className="space-y-4 px-5 py-6 sm:px-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Pekerjaan <span className="text-rose-500">*</span>
              </span>
              <input
                autoFocus
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                maxLength={150}
                onChange={(event) =>
                  updateField('nama_pekerjaan', event.target.value)
                }
                placeholder="Masukkan nama pekerjaan"
                required
                value={values.nama_pekerjaan}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Deskripsi
              </span>
              <textarea
                className="min-h-24 w-full resize-y rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(event) =>
                  updateField('deskripsi', event.target.value)
                }
                placeholder="Tambahkan deskripsi singkat (opsional)"
                rows="3"
                value={values.deskripsi}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Lokasi
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                maxLength={150}
                onChange={(event) => updateField('lokasi', event.target.value)}
                placeholder="Masukkan lokasi pekerjaan"
                value={values.lokasi}
              />
            </label>

            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Tanggal Mulai
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  onChange={(event) =>
                    updateField('tanggal_mulai', event.target.value)
                  }
                  type="date"
                  value={values.tanggal_mulai}
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Target Selesai (Deadline)
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  min={values.tanggal_mulai || undefined}
                  onChange={(event) =>
                    updateField('target_selesai', event.target.value)
                  }
                  type="date"
                  value={values.target_selesai}
                />
              </label>
            </div>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Status Pekerjaan <span className="text-rose-500">*</span>
              </span>
              <select
                className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(event) => updateField('status', event.target.value)}
                required
                value={values.status}
              >
                {STATUS_PEKERJAAN_OPTIONS.map((status) => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </label>

            {/* METODE PENENTUAN PEKERJA */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4 space-y-3">
              <label className="block text-sm font-semibold text-slate-900">
                Metode Penentuan Pekerja <span className="text-rose-500">*</span>
              </label>

              <div className="grid gap-3 sm:grid-cols-2">
                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                    values.metode_penentuan === 'terbuka'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      checked={values.metode_penentuan === 'terbuka'}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      name="metode_penentuan"
                      onChange={() => updateField('metode_penentuan', 'terbuka')}
                      type="radio"
                      value="terbuka"
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      Buka untuk Pekerja
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Pekerjaan muncul di menu Pekerjaan Tersedia bagi seluruh pekerja dan dapat diambil secara mandiri.
                  </p>
                </label>

                <label
                  className={`flex cursor-pointer flex-col rounded-xl border p-3.5 transition ${
                    values.metode_penentuan === 'langsung'
                      ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                      : 'border-slate-200 bg-white hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      checked={values.metode_penentuan === 'langsung'}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                      name="metode_penentuan"
                      onChange={() => updateField('metode_penentuan', 'langsung')}
                      type="radio"
                      value="langsung"
                    />
                    <span className="text-sm font-semibold text-slate-800">
                      Tetapkan Langsung
                    </span>
                  </div>
                  <p className="mt-1.5 text-xs text-slate-500 leading-relaxed">
                    Admin menentukan pekerja tertentu. Pekerja lain tidak dapat melihat atau mengambil pekerjaan ini.
                  </p>
                </label>
              </div>

              {values.metode_penentuan === 'langsung' ? (
                <div className="pt-2 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="block text-xs font-semibold uppercase tracking-wide text-slate-700">
                      Pilih Pekerja yang Ditetapkan <span className="text-rose-500">*</span>
                    </span>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                      {values.id_karyawan_list.length} pekerja dipilih
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white p-2 divide-y divide-slate-100">
                    {employees.length === 0 ? (
                      <p className="p-3 text-center text-xs text-slate-500">
                        Belum ada data karyawan di database.
                      </p>
                    ) : (
                      employees.map((employee) => {
                        const isChecked = values.id_karyawan_list.includes(employee.id_karyawan)
                        return (
                          <label
                            className={`flex items-center gap-3 p-2.5 rounded-lg cursor-pointer transition ${
                              isChecked
                                ? 'bg-blue-50/80 text-blue-900 font-medium'
                                : 'hover:bg-slate-50 text-slate-700'
                            }`}
                            key={employee.id_karyawan}
                          >
                            <input
                              checked={isChecked}
                              className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                              onChange={() => toggleEmployee(employee.id_karyawan)}
                              type="checkbox"
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">{employee.nama}</p>
                              <p className="text-xs text-slate-500">
                                {employee.jabatan || 'Pekerja'} · ID: {employee.id_karyawan}
                              </p>
                            </div>
                          </label>
                        )
                      })
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Centang satu atau beberapa pekerja yang akan secara otomatis mendapatkan pekerjaan ini.
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 text-xs text-emerald-800">
                  Pekerjaan ini akan otomatis masuk ke daftar <strong>Pekerjaan Tersedia</strong> milik seluruh pekerja.
                </div>
              )}

              {mode === 'edit' && job?.nama_karyawan_list && (
                <p className="text-xs text-amber-700 bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                  Perhatian: Saat ini pekerjaan sudah memiliki penugasan (pekerja: <strong>{job.nama_karyawan_list}</strong>). Memperbarui metode atau pekerja akan memperbarui relasi penugasan tanpa menghapus data riwayat absensi atau pengeluaran.
                </p>
              )}
            </div>

            {validationMessage && (
              <p className="text-sm text-rose-600" role="alert">
                {validationMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={isSaving}
                onClick={onClose}
                type="button"
              >
                Batal
              </button>
              <button
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : mode === 'create'
                    ? 'Simpan Pekerjaan'
                    : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        )}

        {isDetail && (
          <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={onClose}
              type="button"
            >
              Tutup
            </button>
          </div>
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
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const toastTimer = useRef(null)
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
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
    }
  }, [])

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return pekerjaan
      .filter((job) => {
        const matchesName =
          !normalizedSearch ||
          job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedSearch) ||
          (job.lokasi && job.lokasi.toLocaleLowerCase('id-ID').includes(normalizedSearch)) ||
          (job.nama_karyawan_list && job.nama_karyawan_list.toLocaleLowerCase('id-ID').includes(normalizedSearch))

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

  function showToast(message, type = 'success') {
    setNotice({ message, type })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setNotice(null), 4000)
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

  function requestDeleteJob(job) {
    setPendingDelete(job)
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

  function createJob() {
    setModal({ mode: 'create' })
  }

  return (
    <div className="admin-management-page admin-management-jobs mx-auto w-full max-w-[1440px] space-y-6">
      <AdminPageBanner
        action={
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isLoading || Boolean(error)}
            onClick={createJob}
            type="button"
          >
            <WorkIcon className="h-4 w-4" name="plus" />
            Tambah Pekerjaan
          </button>
        }
        description="Kelola seluruh pekerjaan, penentuan pekerja langsung maupun terbuka, serta batas waktu (deadline)."
        icon={<WorkIcon className="h-6 w-6" name="work" />}
        title="Data Pekerjaan"
      />

      {error && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{error}</p>
          <button
            className="shrink-0 font-semibold underline underline-offset-2"
            onClick={() => {
              setStore((current) => ({
                ...current,
                isLoading: true,
                error: '',
              }))
              loadData()
            }}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      )}

      {notice && (
        <div
          className={`flex items-start justify-between gap-3 rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          <p>{notice.message}</p>
          <button
            aria-label="Tutup notifikasi"
            className="font-semibold opacity-60 hover:opacity-100"
            onClick={() => setNotice(null)}
            type="button"
          >
            ×
          </button>
        </div>
      )}

      <div className="admin-stat-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Pekerjaan',
            value: statistics.total,
            iconColor: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Belum Mulai',
            value: statistics.belumMulai,
            iconColor: 'bg-amber-50 text-amber-600',
          },
          {
            label: 'Sedang Berjalan',
            value: statistics.berjalan,
            iconColor: 'bg-indigo-50 text-indigo-600',
          },
          {
            label: 'Pekerjaan Selesai',
            value: statistics.selesai,
            iconColor: 'bg-emerald-50 text-emerald-600',
          },
        ].map((stat) => (
          <article
            className="admin-stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]"
            key={stat.label}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-slate-500">{stat.label}</p>
                {isLoading ? (
                  <div
                    aria-label="Memuat statistik"
                    className="mt-2 h-9 w-12 animate-pulse rounded-lg bg-slate-100"
                  />
                ) : (
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                )}
              </div>
              <span
                className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.iconColor}`}
              >
                <WorkIcon className="h-6 w-6" name="work" />
              </span>
            </div>
          </article>
        ))}
      </div>

      <section className="admin-data-table overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Daftar Pekerjaan</h3>
            <p className="mt-1 text-sm text-slate-500">
              {isLoading ? 'Memuat data pekerjaan...' : `${filteredJobs.length} data ditemukan`}
            </p>
          </div>
          <div className="grid gap-2 sm:flex">
            <label className="relative block">
              <span className="sr-only">Cari nama pekerjaan</span>
              <WorkIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="search"
              />
              <input
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-56"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Cari pekerjaan / pekerja..."
                value={search}
              />
            </label>

            <label className="relative block">
              <span className="sr-only">Filter status</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-44"
                onChange={(event) => {
                  setStatusFilter(event.target.value)
                  setPage(1)
                }}
                value={statusFilter}
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
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>

            <label className="relative block">
              <span className="sr-only">Filter metode penentuan</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-48"
                onChange={(event) => {
                  setMethodFilter(event.target.value)
                  setPage(1)
                }}
                value={methodFilter}
              >
                <option value="">Semua Metode</option>
                <option value="langsung">Penetapan Langsung</option>
                <option value="terbuka_tersedia">Terbuka (Tersedia)</option>
                <option value="terbuka_diambil">Terbuka (Sudah Diambil)</option>
                <option value="expired">Melewati Deadline</option>
              </select>
              <WorkIcon
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-3 p-5" role="status">
            <div className="h-10 animate-pulse rounded-lg bg-slate-100" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
            <div className="h-12 animate-pulse rounded-lg bg-slate-50" />
            <span className="sr-only">Memuat daftar pekerjaan</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1040px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5" scope="col">
                      No.
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      <button
                        className="inline-flex items-center gap-1.5 hover:text-slate-800"
                        onClick={() =>
                          setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
                        }
                        type="button"
                      >
                        Nama Pekerjaan
                        <WorkIcon className="h-3.5 w-3.5" name="sort" />
                      </button>
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Metode & Pekerja
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Lokasi
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Mulai
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Deadline
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Status
                    </th>
                    <th className="px-5 py-3.5 text-right" scope="col">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleJobs.map((job, index) => {
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
                        className="transition hover:bg-slate-50/80"
                        key={job.id_pekerjaan}
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="max-w-64 px-5 py-4">
                          <p className="truncate font-semibold text-slate-800">
                            {job.nama_pekerjaan}
                          </p>
                          <p className="text-xs text-slate-400">ID: {job.id_pekerjaan}</p>
                        </td>
                        <td className="px-5 py-4">
                          {job.metode_penentuan === 'langsung' ? (
                            <div>
                              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/10">
                                Penetapan Langsung
                              </span>
                              <p className="mt-1 text-xs font-medium text-slate-700 truncate max-w-48">
                                {job.nama_karyawan_list ? `Pekerja: ${job.nama_karyawan_list}` : 'Belum ditetapkan'}
                              </p>
                            </div>
                          ) : (
                            <div>
                              {job.nama_karyawan_list ? (
                                <>
                                  <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/10">
                                    Diambil Mandiri
                                  </span>
                                  <p className="mt-1 text-xs font-medium text-slate-700 truncate max-w-48">
                                    Oleh: {job.nama_karyawan_list}
                                  </p>
                                </>
                              ) : isExpired ? (
                                <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/10">
                                  Terbuka (Expired)
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/10">
                                  Terbuka (Tersedia)
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="max-w-48 px-5 py-4">
                          <span className="flex items-center gap-1.5 truncate text-slate-600">
                            <WorkIcon
                              className="h-4 w-4 shrink-0 text-slate-400"
                              name="location"
                            />
                            {job.lokasi || '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(job.tanggal_mulai)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="text-slate-700 font-medium block">
                            {formatDate(job.target_selesai)}
                          </span>
                          {isExpired && (
                            <span className="mt-0.5 inline-block text-[11px] font-semibold text-rose-600">
                              Lewat Deadline
                            </span>
                          )}
                          {isDueToday && (
                            <span className="mt-0.5 inline-block text-[11px] font-semibold text-amber-600">
                              Tenggat Hari Ini
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <StatusBadge status={job.status} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <ActionButtons
                            actions={[
                              {
                                type: 'view',
                                label: `Lihat ${job.nama_pekerjaan}`,
                                onClick: () => showJobDetail(job),
                                disabled: loadingDetailId === job.id_pekerjaan,
                              },
                              {
                                type: 'edit',
                                label: `Edit ${job.nama_pekerjaan}`,
                                onClick: () => editJob(job),
                                disabled: loadingDetailId === job.id_pekerjaan,
                                title:
                                  loadingDetailId === job.id_pekerjaan
                                    ? 'Memuat detail pekerjaan...'
                                    : `Edit ${job.nama_pekerjaan}`,
                              },
                              {
                                type: 'delete',
                                label: `Hapus ${job.nama_pekerjaan}`,
                                onClick: () => requestDeleteJob(job),
                                title: `Hapus ${job.nama_pekerjaan}`,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {visibleJobs.length === 0 && (
                    <tr>
                      <td className="px-5 py-14 text-center" colSpan="8">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <WorkIcon className="h-6 w-6" name="search" />
                        </span>
                        <p className="mt-3 font-semibold text-slate-700">
                          {pekerjaan.length === 0
                            ? 'Belum ada data pekerjaan'
                            : 'Pekerjaan tidak ditemukan'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {pekerjaan.length === 0
                            ? 'Tambahkan pekerjaan pertama untuk mulai mengelola proyek.'
                            : 'Ubah kata pencarian atau filter status dan metode.'}
                        </p>
                        {pekerjaan.length === 0 && (
                          <button
                            className="mt-4 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-blue-700"
                            onClick={createJob}
                            type="button"
                          >
                            Tambah Pekerjaan
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-slate-500">
                Menampilkan{' '}
                <span className="font-medium text-slate-700">
                  {filteredJobs.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}
                  –{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)}
                </span>{' '}
                dari {filteredJobs.length} pekerjaan
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  aria-label="Halaman sebelumnya"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  type="button"
                >
                  <WorkIcon className="h-4 w-4" name="previous" />
                </button>
                <span className="px-2 text-sm text-slate-600">
                  Halaman {currentPage} dari {totalPages}
                </span>
                <button
                  aria-label="Halaman berikutnya"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage >= totalPages}
                  onClick={() => setPage(currentPage + 1)}
                  type="button"
                >
                  <WorkIcon className="h-4 w-4" name="next" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {modal && (
        <WorkModal
          employees={employees}
          isSaving={isSaving}
          job={modal.job}
          mode={modal.mode}
          onClose={() => {
            if (!isSaving) setModal(null)
          }}
          onSave={handleSaveJob}
        />
      )}
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data pekerjaan ini?"
          isProcessing={isSaving}
          itemName={pendingDelete.nama_pekerjaan}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteJob(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataPekerjaan
