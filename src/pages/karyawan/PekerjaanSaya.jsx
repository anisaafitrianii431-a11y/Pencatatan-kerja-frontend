import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { STATUS_PEKERJAAN } from '../../data/pekerjaan.js'
import { getPekerjaanSaya } from '../../services/workerPekerjaanApi.js'
import { useAuth } from '../../auth/useAuth.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Mulai',
    className: 'bg-amber-50 text-amber-800 border border-amber-200/80',
    dotClassName: 'bg-amber-500',
    iconBg: 'bg-amber-100/70 text-amber-700',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-sky-50 text-sky-800 border border-sky-200/80',
    dotClassName: 'bg-sky-500 animate-pulse',
    iconBg: 'bg-sky-100/70 text-sky-700',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-800 border border-emerald-200/80',
    dotClassName: 'bg-emerald-500',
    iconBg: 'bg-emerald-100/70 text-emerald-700',
  },
}

function formatDate(value) {
  if (!value) return 'Belum ditentukan'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? 'Belum ditentukan' : DATE_FORMATTER.format(date)
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDeadlineBadge(targetSelesai, status) {
  if (!targetSelesai) return null
  const today = getJakartaToday()

  if (targetSelesai < today && status !== STATUS_PEKERJAAN.SELESAI) {
    return {
      label: `Lewat Tenggat (${formatDate(targetSelesai)})`,
      className: 'bg-rose-50 text-rose-700 border border-rose-200 font-bold',
      isOverdue: true,
    }
  }
  if (targetSelesai === today && status !== STATUS_PEKERJAAN.SELESAI) {
    return {
      label: 'Tenggat Hari Ini',
      className: 'bg-amber-50 text-amber-800 border border-amber-300 font-bold',
      isToday: true,
    }
  }
  return {
    label: `Tenggat: ${formatDate(targetSelesai)}`,
    className: 'bg-slate-100 text-slate-600 border border-slate-200 font-medium',
    isFuture: true,
  }
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    user: (
      <>
        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="12" cy="7" r="4" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    reset: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    receipt: (
      <>
        <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z" />
        <path d="M16 8h-6M16 12H8M10 16H8" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    sparkles: (
      <>
        <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
      </>
    ),
    arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
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
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-700 border border-slate-200',
    dotClassName: 'bg-slate-400',
  }

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${presentation.className}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${presentation.dotClassName}`} />
      {presentation.label}
    </span>
  )
}

function AssignmentBadge({ type }) {
  if (type === 'mandiri') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-1 text-xs font-bold text-purple-700 border border-purple-200/80">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        Diambil Mandiri
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 border border-blue-200/80">
      <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
      👑 Ditugaskan Admin
    </span>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="rounded-xl bg-slate-50 p-3 border border-slate-100">
      <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-semibold text-slate-800">{value}</p>
    </div>
  )
}

function WorkDetails({ job, assignment, onClose, onAbsen, onRecordExpense }) {
  const deadlineBadge = getDeadlineBadge(job.target_selesai, job.status)
  const wageAmount = assignment?.nominal_upah ?? job.nominal_upah
  const wageUnit = assignment?.jenis_upah || job.jenis_upah
  const wageUnitLabel =
    wageUnit === 'per_hari'
      ? 'hari'
      : wageUnit === 'per_bulan'
        ? 'bulan'
        : wageUnit === 'borongan'
          ? 'proyek'
          : 'jam'
  const wageLabel =
    Number(wageAmount) > 0 ? `${formatRupiah(wageAmount)} / ${wageUnitLabel}` : 'Belum ditetapkan'
  const isCompleted = job.status === STATUS_PEKERJAAN.SELESAI

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="my-work-detail-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5 bg-gradient-to-r from-slate-50 to-white">
          <div className="pr-4">
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200">
              Rincian Penugasan Proyek
            </span>
            <h2 className="mt-2 text-xl font-extrabold text-slate-900" id="my-work-detail-title">
              {job.nama_pekerjaan}
            </h2>
          </div>
          <button
            aria-label="Tutup detail pekerjaan"
            className="rounded-xl p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto space-y-5 px-6 py-5">
          {/* Status Badges Header */}
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <AssignmentBadge type={assignment?.jenis_penugasan} />
            {deadlineBadge && (
              <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs ${deadlineBadge.className}`}>
                <Icon className="h-3.5 w-3.5 shrink-0" name="calendar" />
                {deadlineBadge.label}
              </span>
            )}
          </div>

          {/* Deskripsi Proyek */}
          <div className="rounded-2xl border border-slate-100 bg-slate-50/70 p-4">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-1">
              Deskripsi & Catatan Proyek
            </h4>
            <p className="text-sm leading-relaxed text-slate-700">
              {job.deskripsi || 'Belum ada catatan deskripsi khusus dari Admin untuk proyek ini.'}
            </p>
          </div>

          {/* Grid Informasi Detail */}
          <div className="grid gap-3 sm:grid-cols-2">
            <DetailItem label="Upah Kerja Sesuai Penugasan" value={wageLabel} />
            <DetailItem label="Peran / Posisi" value={assignment?.peran_tugas || assignment?.peran_saya || 'Pelaksana'} />
            <DetailItem label="Lokasi Proyek" value={job.lokasi || 'Belum ditentukan'} />
            <DetailItem label="Tanggal Mulai" value={formatDate(job.tanggal_mulai)} />
            <DetailItem label="Target Selesai (Deadline)" value={formatDate(job.target_selesai)} />
            <DetailItem
              label="Kebijakan Lembur"
              value={
                Number(job.lembur_diizinkan) === 1
                  ? '⚡ Diizinkan (Upah lembur berlaku)'
                  : '✕ Tidak diizinkan oleh Admin'
              }
            />
            <DetailItem
              label="Metode Penugasan"
              value={
                assignment?.jenis_penugasan === 'mandiri'
                  ? 'Diambil Mandiri oleh Pekerja'
                  : 'Ditetapkan Langsung oleh Admin'
              }
            />
            <DetailItem
              label="Jumlah Tim"
              value={`${job.total_pekerja_aktif || job.total_pekerja || 1} orang`}
            />
            <DetailItem label="Radius Absensi GPS" value={`${job.radius_meter || 100} meter`} />
            <DetailItem
              label="Koordinat Titik Lokasi"
              value={
                job.latitude && job.longitude
                  ? `${job.latitude}, ${job.longitude}`
                  : 'Belum ditentukan'
              }
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-6 py-4 bg-slate-50/50">
          <div className="flex items-center gap-2">
            {!isCompleted && onAbsen && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onAbsen(job)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700 cursor-pointer"
              >
                <Icon className="h-4 w-4" name="clock" />
                <span>Absensi Proyek Ini</span>
              </button>
            )}
            {!isCompleted && onRecordExpense && (
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onRecordExpense(job)
                }}
                className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs font-bold text-slate-700 shadow-xs transition hover:bg-slate-50 cursor-pointer"
              >
                <Icon className="h-4 w-4" name="receipt" />
                <span>Catat Pengeluaran</span>
              </button>
            )}
          </div>
          <button
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-xs font-bold text-white transition hover:bg-slate-800 cursor-pointer ml-auto"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  )
}

function WorkCard({ job, assignment, onOpen, onRecordExpense, onAbsen }) {
  const { canCreate } = useAuth()
  if (!job) {
    return (
      <article className="rounded-2xl border border-amber-200 bg-amber-50/60 p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <Icon name="work" />
          </div>
          <StatusBadge />
        </div>
        <h2 className="mt-4 text-lg font-semibold text-slate-900">Pekerjaan tidak tersedia</h2>
        <p className="mt-2 text-sm leading-6 text-slate-600">
          Data pekerjaan terkait penugasan ini tidak ditemukan. Hubungi Admin untuk memeriksa penugasan.
        </p>
      </article>
    )
  }

  const presentation = STATUS_PRESENTATION[job.status] ?? STATUS_PRESENTATION[STATUS_PEKERJAAN.BELUM_MULAI]
  const deadlineBadge = getDeadlineBadge(job.target_selesai, job.status)
  const isCompleted = job.status === STATUS_PEKERJAAN.SELESAI
  const isRunning = job.status === STATUS_PEKERJAAN.BERJALAN

  const wageAmount = assignment?.nominal_upah ?? job.nominal_upah
  const wageUnit = assignment?.jenis_upah || job.jenis_upah
  const wageUnitLabel =
    wageUnit === 'per_hari'
      ? 'hari'
      : wageUnit === 'per_bulan'
        ? 'bulan'
        : wageUnit === 'borongan'
          ? 'proyek'
          : 'jam'
  const wageLabel =
    Number(wageAmount) > 0 ? `${formatRupiah(wageAmount)} / ${wageUnitLabel}` : null

  return (
    <article className="group relative flex h-full flex-col rounded-2xl border border-slate-200/90 bg-white p-5 shadow-xs transition-all duration-200 hover:-translate-y-1 hover:border-emerald-300 hover:shadow-lg sm:p-6">
      {/* Top Header: Icon, Badges */}
      <div className="flex items-start justify-between gap-2">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl shadow-xs transition-transform group-hover:scale-105 ${presentation.iconBg}`}
        >
          <Icon name="work" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={job.status} />
          <AssignmentBadge type={assignment?.jenis_penugasan} />
        </div>
      </div>

      {/* Title */}
      <h3 className="mt-4 text-base sm:text-lg font-extrabold leading-tight text-slate-900 transition-colors group-hover:text-emerald-700">
        {job.nama_pekerjaan}
      </h3>

      {/* Info Pills (Upah, Peran, Lembur, Tim) */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        {wageLabel && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1 text-xs font-extrabold text-emerald-800 border border-emerald-200/80">
            💰 {wageLabel}
          </span>
        )}

        <span className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 border border-indigo-200/80">
          🎯 {assignment?.peran_tugas || 'Pelaksana'}
        </span>

        {Number(job.lembur_diizinkan) === 1 ? (
          <span className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-0.5 text-xs font-bold text-amber-800 border border-amber-200/80">
            ⚡ Lembur Diizinkan
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500 border border-slate-200">
            Lembur Ditutup
          </span>
        )}

        {Number(job.total_pekerja_aktif || job.total_pekerja || 1) > 1 && (
          <span className="inline-flex items-center gap-1 rounded-lg bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700 border border-slate-200">
            👥 {job.total_pekerja_aktif || job.total_pekerja} Anggota
          </span>
        )}
      </div>

      {/* Description Snippet */}
      <p className="mt-3 line-clamp-2 min-h-[38px] text-xs leading-relaxed text-slate-500">
        {job.deskripsi || 'Tidak ada catatan tambahan untuk pekerjaan ini.'}
      </p>

      {/* Structured Meta Box (Lokasi & Jadwal) */}
      <div className="mt-4 rounded-xl border border-slate-100 bg-slate-50/70 p-3 space-y-2 text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Icon className="h-4 w-4 shrink-0 text-slate-400" name="location" />
          <span className="truncate font-medium">{job.lokasi || 'Lokasi belum ditentukan'}</span>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-slate-200/50 pt-2">
          <div className="flex items-center gap-2">
            <Icon className="h-4 w-4 shrink-0 text-slate-400" name="calendar" />
            <span>
              Mulai: <strong className="text-slate-800">{formatDate(job.tanggal_mulai)}</strong>
            </span>
          </div>
          {deadlineBadge && (
            <span
              className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] ${deadlineBadge.className}`}
            >
              {deadlineBadge.label}
            </span>
          )}
        </div>
      </div>

      {/* Card Action Buttons */}
      <div className="mt-auto pt-4 flex flex-wrap items-center gap-2">
        <button
          className="flex-1 min-w-[100px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
          onClick={() => onOpen(job, assignment)}
          type="button"
        >
          <Icon className="h-4 w-4 text-slate-400" name="eye" />
          <span>Lihat Detail</span>
        </button>

        {isRunning && onAbsen && (
          <button
            className="flex-1 min-w-[110px] inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700 active:scale-95 cursor-pointer"
            onClick={() => onAbsen(job)}
            type="button"
            title="Catat absensi untuk pekerjaan ini"
          >
            <Icon className="h-4 w-4" name="clock" />
            <span>Catat Absen</span>
          </button>
        )}

        {canCreate('pengeluaran') && !isCompleted && onRecordExpense && (
          <button
            className="flex-1 min-w-[130px] inline-flex items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-xs font-bold text-emerald-800 transition hover:bg-emerald-100 active:scale-95 cursor-pointer"
            onClick={() => onRecordExpense(job)}
            type="button"
            title="Catat nota pengeluaran atau reimbursement untuk proyek ini"
          >
            <Icon className="h-4 w-4 text-emerald-700" name="receipt" />
            <span>Catat Pengeluaran</span>
          </button>
        )}
      </div>
    </article>
  )
}

function PekerjaanSaya({ workerId, workerName = '' }) {
  const navigate = useNavigate()
  const [store, setStore] = useState({
    worker: null,
    assignedJobs: [],
    isLoading: true,
    error: '',
  })
  const { assignedJobs, isLoading, error } = store
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [assignmentFilter, setAssignmentFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [selectedTarget, setSelectedTarget] = useState(null)

  useEffect(() => {
    let isMounted = true
    const loadAssignments = () => {
      getPekerjaanSaya(workerId, workerName)
        .then((data) => {
          if (isMounted) {
            setStore({ ...data, isLoading: false, error: '' })
          }
        })
        .catch((loadError) => {
          if (isMounted) {
            setStore((current) => ({
              ...current,
              isLoading: false,
              error: `Daftar pekerjaan tidak dapat dimuat: ${loadError.message}`,
            }))
          }
        })
    }

    loadAssignments()
    const refreshTimer = window.setInterval(loadAssignments, 30000)
    window.addEventListener('focus', loadAssignments)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadAssignments)
    }
  }, [workerId, workerName])

  const validJobs = useMemo(
    () => assignedJobs.filter(({ job }) => job),
    [assignedJobs],
  )

  const locations = useMemo(
    () =>
      [...new Set(validJobs.map(({ job }) => job.lokasi).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'id'),
      ),
    [validJobs],
  )

  const statistics = useMemo(
    () => ({
      total: assignedJobs.length,
      belumMulai: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.BELUM_MULAI).length,
      berjalan: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.BERJALAN).length,
      selesai: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.SELESAI).length,
    }),
    [assignedJobs, validJobs],
  )

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return assignedJobs.filter(({ assignment, job }) => {
      if (!job) return !normalizedQuery && !statusFilter && !locationFilter && !assignmentFilter

      const matchesQuery =
        !normalizedQuery ||
        job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedQuery) ||
        (job.lokasi && job.lokasi.toLocaleLowerCase('id-ID').includes(normalizedQuery)) ||
        (assignment?.peran_tugas && assignment.peran_tugas.toLocaleLowerCase('id-ID').includes(normalizedQuery))

      const matchesStatus = !statusFilter || job.status === statusFilter
      const matchesLocation = !locationFilter || job.lokasi === locationFilter

      let matchesAssignment = true
      if (assignmentFilter === 'admin') {
        matchesAssignment = assignment.jenis_penugasan === 'admin'
      } else if (assignmentFilter === 'mandiri') {
        matchesAssignment = assignment.jenis_penugasan === 'mandiri'
      } else if (assignmentFilter === 'expired') {
        matchesAssignment =
          Boolean(job.target_selesai) &&
          job.target_selesai < today &&
          job.status !== STATUS_PEKERJAAN.SELESAI
      }

      return matchesQuery && matchesStatus && matchesLocation && matchesAssignment
    })
  }, [assignedJobs, assignmentFilter, locationFilter, query, statusFilter])

  function resetFilters() {
    setQuery('')
    setStatusFilter('')
    setAssignmentFilter('')
    setLocationFilter('')
  }

  function toggleStatusFilter(targetStatus) {
    if (statusFilter === targetStatus) {
      setStatusFilter('')
    } else {
      setStatusFilter(targetStatus)
    }
  }

  const statCards = [
    {
      key: '',
      label: 'Total Pekerjaan',
      value: statistics.total,
      sublabel: 'Seluruh proyek pada akun Anda',
      icon: 'work',
      tone: 'bg-blue-50 text-blue-700 border-blue-200/80',
      activeRing: statusFilter === '' ? 'ring-2 ring-blue-500 shadow-md' : '',
    },
    {
      key: STATUS_PEKERJAAN.BERJALAN,
      label: 'Sedang Berjalan',
      value: statistics.berjalan,
      sublabel: 'Aktif dikerjakan saat ini',
      icon: 'activity',
      tone: 'bg-sky-50 text-sky-700 border-sky-200/80',
      activeRing: statusFilter === STATUS_PEKERJAAN.BERJALAN ? 'ring-2 ring-sky-500 shadow-md' : '',
    },
    {
      key: STATUS_PEKERJAAN.BELUM_MULAI,
      label: 'Belum Dimulai',
      value: statistics.belumMulai,
      sublabel: 'Menunggu tanggal mulai',
      icon: 'clock',
      tone: 'bg-amber-50 text-amber-700 border-amber-200/80',
      activeRing: statusFilter === STATUS_PEKERJAAN.BELUM_MULAI ? 'ring-2 ring-amber-500 shadow-md' : '',
    },
    {
      key: STATUS_PEKERJAAN.SELESAI,
      label: 'Selesai',
      value: statistics.selesai,
      sublabel: 'Proyek telah rampung',
      icon: 'check',
      tone: 'bg-emerald-50 text-emerald-700 border-emerald-200/80',
      activeRing: statusFilter === STATUS_PEKERJAAN.SELESAI ? 'ring-2 ring-emerald-500 shadow-md' : '',
    },
  ]

  const isAnyFilterActive = Boolean(query || statusFilter || assignmentFilter || locationFilter)

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      {/* ============================================================== */}
      {/* MODERN HERO BANNER                                             */}
      {/* ============================================================== */}
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-teal-800 to-slate-900 p-6 text-white shadow-lg shadow-emerald-950/15 lg:flex-row lg:items-center lg:justify-between sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            <span>Portal Karyawan</span>
            <span className="text-emerald-400">•</span>
            <span>Penugasan Resmi CV. Putra Anugrah Mandiri</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-extrabold tracking-tight text-white sm:text-3xl">
            List Pekerjaan & Proyek
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-emerald-100/95 leading-relaxed">
            Tinjau seluruh proyek yang ditugaskan resmi oleh Admin, pantau target tenggat waktu, dan kelola aktivitas lapangan Anda.
          </p>
        </div>

        <nav
          aria-label="Aksi cepat list pekerjaan"
          className="flex shrink-0 flex-wrap items-center gap-2.5"
        >
          <button
            className="flex items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 sm:text-sm cursor-pointer"
            onClick={() => navigate('/karyawan/absensi')}
            type="button"
          >
            <Icon className="h-4 w-4 text-emerald-700" name="clock" />
            <span>Absensi Kerja</span>
          </button>
          <button
            className="flex items-center gap-2 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm cursor-pointer"
            onClick={() => navigate('/karyawan/gaji')}
            type="button"
          >
            <span>Slip Gaji</span>
            <Icon className="h-4 w-4" name="arrow" />
          </button>
        </nav>
      </header>

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}

      {/* ============================================================== */}
      {/* STATISTIK CARDS (INTERAKTIF FILTER)                            */}
      {/* ============================================================== */}
      <section aria-label="Ringkasan pekerjaan saya" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {statCards.map((stat) => (
          <article
            key={stat.label}
            onClick={() => toggleStatusFilter(stat.key)}
            className={`group flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition-all hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-5 ${stat.activeRing}`}
          >
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-slate-500 group-hover:text-emerald-700 transition-colors">
                {stat.label}
              </p>
              <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
                {isLoading ? '—' : stat.value}
              </p>
              <p className="mt-1 text-[11px] text-slate-400 truncate">{stat.sublabel}</p>
            </div>
            <div
              className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${stat.tone} transition-transform group-hover:scale-105`}
            >
              <Icon className="h-6 w-6" name={stat.icon} />
            </div>
          </article>
        ))}
      </section>

      {/* ============================================================== */}
      {/* FILTER & PENCARIAN MODERN                                      */}
      {/* ============================================================== */}
      <section
        aria-label="Cari dan filter pekerjaan saya"
        className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs sm:p-5 space-y-4"
      >
        {/* Quick Status Tabs */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === ''
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua ({statistics.total})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(STATUS_PEKERJAAN.BERJALAN)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === STATUS_PEKERJAAN.BERJALAN
                  ? 'bg-sky-600 text-white shadow-xs'
                  : 'bg-sky-50 text-sky-800 hover:bg-sky-100'
              }`}
            >
              Sedang Berjalan ({statistics.berjalan})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(STATUS_PEKERJAAN.BELUM_MULAI)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === STATUS_PEKERJAAN.BELUM_MULAI
                  ? 'bg-amber-600 text-white shadow-xs'
                  : 'bg-amber-50 text-amber-800 hover:bg-amber-100'
              }`}
            >
              Belum Mulai ({statistics.belumMulai})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter(STATUS_PEKERJAAN.SELESAI)}
              className={`rounded-xl px-3.5 py-1.5 text-xs font-bold transition cursor-pointer ${
                statusFilter === STATUS_PEKERJAAN.SELESAI
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
              }`}
            >
              Selesai ({statistics.selesai})
            </button>
          </div>

          <span className="text-xs font-semibold text-slate-500">
            {isLoading
              ? 'Memuat pekerjaan...'
              : `Menampilkan ${filteredJobs.length} dari ${assignedJobs.length} pekerjaan`}
          </span>
        </div>

        {/* Search & Dropdown Controls */}
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.8fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]">
          <div className="relative">
            <Icon
              className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              name="search"
            />
            <input
              className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-9 text-xs sm:text-sm font-medium outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari proyek, lokasi, atau peran..."
              type="search"
              value={query}
            />
            {query && (
              <button
                type="button"
                onClick={() => setQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <Icon className="h-4 w-4" name="close" />
              </button>
            )}
          </div>

          <div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
              onChange={(event) => setAssignmentFilter(event.target.value)}
              value={assignmentFilter}
            >
              <option value="">Semua Penugasan</option>
              <option value="admin">👑 Ditugaskan Admin</option>
              <option value="mandiri">👤 Diambil Mandiri</option>
              <option value="expired">⚠️ Melewati Deadline</option>
            </select>
          </div>

          <div>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-xs sm:text-sm font-semibold text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 cursor-pointer"
              onChange={(event) => setLocationFilter(event.target.value)}
              value={locationFilter}
            >
              <option value="">Semua Lokasi</option>
              {locations.map((location) => (
                <option key={location} value={location}>
                  📍 {location}
                </option>
              ))}
            </select>
          </div>

          {isAnyFilterActive ? (
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 cursor-pointer"
              onClick={resetFilters}
              type="button"
            >
              <Icon className="h-4 w-4" name="reset" />
              <span>Reset Filter</span>
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold text-slate-400 cursor-not-allowed"
              disabled
              type="button"
            >
              <Icon className="h-4 w-4" name="reset" />
              <span>Reset</span>
            </button>
          )}
        </div>
      </section>

      {/* ============================================================== */}
      {/* GRID KARTU DAFTAR PEKERJAAN                                    */}
      {/* ============================================================== */}
      {isLoading ? (
        <div
          className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3"
          role="status"
          aria-label="Memuat pekerjaan saya"
        >
          {Array.from({ length: 3 }, (_, index) => (
            <div
              className="h-80 animate-pulse rounded-2xl border border-slate-200 bg-white"
              key={index}
            />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <section aria-label="Daftar pekerjaan saya" className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map(({ assignment, job }) => (
            <WorkCard
              assignment={assignment}
              job={job}
              key={assignment.id_penugasan}
              onOpen={(j, a) => setSelectedTarget({ job: j, assignment: a })}
              onAbsen={() => navigate('/karyawan/absensi')}
              onRecordExpense={(j) =>
                navigate(`/karyawan/pengeluaran?pekerjaan=${j.id_pekerjaan}`, {
                  state: { fromWorkList: true },
                })
              }
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center shadow-xs">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
            <Icon className="h-7 w-7" name="work" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">
            {assignedJobs.length === 0
              ? 'Belum Ada Pekerjaan yang Ditugaskan'
              : 'Pekerjaan Tidak Ditemukan'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-xs sm:text-sm leading-relaxed text-slate-500">
            {assignedJobs.length === 0
              ? 'Pekerjaan yang ditugaskan resmi oleh Admin kepada Anda akan tampil otomatis pada halaman ini.'
              : 'Tidak ada proyek yang sesuai dengan kriteria pencarian atau filter yang dipilih.'}
          </p>
          {isAnyFilterActive && (
            <button
              className="mt-4 inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-bold text-white hover:bg-slate-800 cursor-pointer"
              onClick={resetFilters}
              type="button"
            >
              <Icon className="h-3.5 w-3.5" name="reset" />
              <span>Bersihkan Filter & Pencarian</span>
            </button>
          )}
        </section>
      )}

      {/* ============================================================== */}
      {/* MODAL DETAIL PEKERJAAN                                         */}
      {/* ============================================================== */}
      {selectedTarget && (
        <WorkDetails
          assignment={selectedTarget.assignment}
          job={selectedTarget.job}
          onClose={() => setSelectedTarget(null)}
          onAbsen={() => navigate('/karyawan/absensi')}
          onRecordExpense={(j) =>
            navigate(`/karyawan/pengeluaran?pekerjaan=${j.id_pekerjaan}`, {
              state: { fromWorkList: true },
            })
          }
        />
      )}
    </div>
  )
}

export default PekerjaanSaya
