import { useEffect, useMemo, useState } from 'react'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { STATUS_PEKERJAAN, STATUS_PEKERJAAN_OPTIONS } from '../../data/pekerjaan.js'
import { getPekerjaanSaya } from '../../services/workerPekerjaanApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'worker-status-pending bg-slate-100 text-slate-700',
    iconClassName: 'bg-slate-100 text-slate-600',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Berjalan',
    className: 'worker-status-running bg-blue-50 text-blue-700',
    iconClassName: 'bg-blue-50 text-blue-600',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'worker-status-complete bg-emerald-50 text-emerald-700',
    iconClassName: 'bg-emerald-50 text-emerald-600',
  },
}

function formatDate(value) {
  return value
    ? DATE_FORMATTER.format(new Date(`${value}T00:00:00`))
    : 'Belum ditentukan'
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
      label: 'Melewati Deadline',
      className: 'bg-rose-50 text-rose-700 border border-rose-200 font-semibold',
    }
  }
  if (targetSelesai === today && status !== STATUS_PEKERJAAN.SELESAI) {
    return {
      label: 'Tenggat Hari Ini',
      className: 'bg-amber-50 text-amber-800 border border-amber-300 font-semibold',
    }
  }
  return {
    label: `Tenggat: ${formatDate(targetSelesai)}`,
    className: 'bg-slate-50 text-slate-600 border border-slate-200 font-medium',
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
  if (!presentation) {
    return (
      <span className="inline-flex rounded-full bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-700">
        Status tidak tersedia
      </span>
    )
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${presentation.className}`}>
      {presentation.label}
    </span>
  )
}

function AssignmentBadge({ type }) {
  if (type === 'mandiri') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/15">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        Diambil Mandiri
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/15">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      Ditetapkan Admin
    </span>
  )
}

function DetailItem({ label, value }) {
  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-1 text-sm leading-6 text-slate-700">{value}</p>
    </div>
  )
}

function WorkDetails({ job, assignment, onClose }) {
  const deadlineBadge = getDeadlineBadge(job.target_selesai, job.status)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
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
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="pr-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-blue-600">Pekerjaan Saya</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900" id="my-work-detail-title">
              {job.nama_pekerjaan}
            </h2>
          </div>
          <button
            aria-label="Tutup detail pekerjaan"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-5 px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            <AssignmentBadge type={assignment?.jenis_penugasan} />
            {deadlineBadge && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${deadlineBadge.className}`}>
                <Icon className="h-3.5 w-3.5 shrink-0" name="calendar" />
                {deadlineBadge.label}
              </span>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Lokasi" value={job.lokasi || 'Belum ditentukan'} />
            <DetailItem label="Tanggal mulai" value={formatDate(job.tanggal_mulai)} />
            <DetailItem label="Target selesai (Deadline)" value={formatDate(job.target_selesai)} />
            <DetailItem label="ID pekerjaan" value={job.id_pekerjaan} />
            <DetailItem
              label="Metode Penugasan"
              value={assignment?.jenis_penugasan === 'mandiri' ? 'Diambil Mandiri oleh Pekerja' : 'Ditetapkan Langsung oleh Admin'}
            />
            <DetailItem label="ID Penugasan" value={assignment?.id_penugasan ?? '—'} />
          </div>

          <DetailItem label="Deskripsi" value={job.deskripsi || 'Belum ada deskripsi pekerjaan.'} />
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            className="rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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

function WorkCard({ job, assignment, onOpen }) {
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

  const presentation = STATUS_PRESENTATION[job.status]
  const deadlineBadge = getDeadlineBadge(job.target_selesai, job.status)

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-2">
        <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${presentation?.iconClassName ?? 'bg-slate-100 text-slate-600'}`}>
          <Icon name="work" />
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <StatusBadge status={job.status} />
          <AssignmentBadge type={assignment?.jenis_penugasan} />
        </div>
      </div>

      <h2 className="mt-4 text-lg font-semibold leading-6 text-slate-900">{job.nama_pekerjaan}</h2>

      {deadlineBadge && (
        <div className="mt-2.5">
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${deadlineBadge.className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" name="calendar" />
            {deadlineBadge.label}
          </span>
        </div>
      )}

      <p className="mt-3 line-clamp-2 min-h-12 text-sm leading-6 text-slate-500">
        {job.deskripsi || 'Belum ada deskripsi pekerjaan.'}
      </p>

      <div className="mt-4 space-y-2.5 border-t border-slate-100 pt-4 text-sm text-slate-600">
        <p className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" name="location" />
          <span>{job.lokasi || 'Lokasi belum ditentukan'}</span>
        </p>
        <p className="flex items-start gap-2">
          <Icon className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" name="calendar" />
          <span>
            Mulai: {formatDate(job.tanggal_mulai)}
          </span>
        </p>
      </div>

      <button
        className="mt-auto inline-flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 mt-5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
        onClick={() => onOpen(job, assignment)}
        type="button"
      >
        <Icon className="h-4 w-4" name="eye" />
        Lihat Detail
      </button>
    </article>
  )
}

function PekerjaanSaya({ workerId, workerName = '' }) {
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

  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return assignedJobs.filter(({ assignment, job }) => {
      if (!job) return !normalizedQuery && !statusFilter && !locationFilter && !assignmentFilter

      const matchesQuery =
        !normalizedQuery ||
        job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedQuery)
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

  const statistics = useMemo(
    () => ({
      total: assignedJobs.length,
      belumMulai: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.BELUM_MULAI).length,
      berjalan: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.BERJALAN).length,
      selesai: validJobs.filter(({ job }) => job.status === STATUS_PEKERJAAN.SELESAI).length,
    }),
    [assignedJobs, validJobs],
  )

  function resetFilters() {
    setQuery('')
    setStatusFilter('')
    setAssignmentFilter('')
    setLocationFilter('')
  }

  const stats = [
    { label: 'Total Pekerjaan', value: statistics.total, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Belum Dimulai', value: statistics.belumMulai, tone: 'bg-slate-100 text-slate-600' },
    { label: 'Sedang Berjalan', value: statistics.berjalan, tone: 'bg-blue-50 text-blue-600' },
    { label: 'Selesai', value: statistics.selesai, tone: 'bg-emerald-50 text-emerald-600' },
  ]

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        description="Tinjau seluruh pekerjaan yang ditugaskan kepada Anda, baik oleh Admin maupun yang diambil secara mandiri."
        icon={<Icon className="h-6 w-6" name="work" />}
        title="Pekerjaan Saya"
      />

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          {error}
        </div>
      )}

      <section aria-label="Ringkasan pekerjaan saya" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <article className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]" key={stat.label}>
            <div>
              <p className="text-sm font-medium text-slate-500">{stat.label}</p>
              <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900">
                {isLoading ? '—' : stat.value}
              </p>
            </div>
            <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${stat.tone}`}>
              <Icon name="work" />
            </div>
          </article>
        ))}
      </section>

      <section aria-label="Cari dan filter pekerjaan saya" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,1.5fr)_minmax(140px,1fr)_minmax(140px,1fr)_minmax(140px,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">Cari nama pekerjaan</span>
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="search" />
            <input
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama pekerjaan..."
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setStatusFilter(event.target.value)}
              value={statusFilter}
            >
              <option value="">Semua Status</option>
              {STATUS_PEKERJAAN_OPTIONS.map((status) => (
                <option key={status.value} value={status.value}>{status.label}</option>
              ))}
            </select>
          </label>
          <label>
            <span className="sr-only">Filter jenis penugasan</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setAssignmentFilter(event.target.value)}
              value={assignmentFilter}
            >
              <option value="">Semua Penugasan</option>
              <option value="admin">Ditetapkan Admin</option>
              <option value="mandiri">Diambil Mandiri</option>
              <option value="expired">Melewati Deadline</option>
            </select>
          </label>
          <label>
            <span className="sr-only">Filter lokasi</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
              onChange={(event) => setLocationFilter(event.target.value)}
              value={locationFilter}
            >
              <option value="">Semua Lokasi</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </label>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            onClick={resetFilters}
            type="button"
          >
            <Icon className="h-4 w-4" name="reset" />
            Reset
          </button>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {isLoading ? 'Memuat pekerjaan...' : `${filteredJobs.length} dari ${assignedJobs.length} pekerjaan ditampilkan`}
        </p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Memuat pekerjaan saya">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" key={index} />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <section aria-label="Daftar pekerjaan saya" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map(({ assignment, job }) => (
            <WorkCard
              assignment={assignment}
              job={job}
              key={assignment.id_penugasan}
              onOpen={(j, a) => setSelectedTarget({ job: j, assignment: a })}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-500">
            <Icon className="h-6 w-6" name="work" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-800">
            {assignedJobs.length === 0 ? 'Belum ada pekerjaan yang ditugaskan' : 'Pekerjaan tidak ditemukan'}
          </h2>
          <p className="mx-auto mt-1 max-w-md text-sm leading-6 text-slate-500">
            {assignedJobs.length === 0
              ? 'Pekerjaan yang ditugaskan Admin kepada Anda atau yang Anda ambil secara mandiri akan tampil di sini.'
              : 'Coba ubah kata pencarian atau filter yang dipilih.'}
          </p>
          {(query || statusFilter || locationFilter || assignmentFilter) && (
            <button
              className="mt-4 text-sm font-semibold text-blue-700 hover:text-blue-800"
              onClick={resetFilters}
              type="button"
            >
              Reset pencarian dan filter
            </button>
          )}
        </section>
      )}

      {selectedTarget && (
        <WorkDetails
          assignment={selectedTarget.assignment}
          job={selectedTarget.job}
          onClose={() => setSelectedTarget(null)}
        />
      )}
    </div>
  )
}

export default PekerjaanSaya
