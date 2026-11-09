import { useEffect, useMemo, useState } from 'react'
import { STATUS_PEKERJAAN, STATUS_PEKERJAAN_OPTIONS } from '../../data/pekerjaan.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})
const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'dashboard-status-pending',
    color: '#d97706',
    dot: 'dashboard-status-dot-pending',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'dashboard-status-running',
    color: '#2563eb',
    dot: 'dashboard-status-dot-running',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'dashboard-status-complete',
    color: '#059669',
    dot: 'dashboard-status-dot-complete',
  },
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

function getNumericSuffix(value) {
  const match = String(value).match(/(\d+)$/)
  return match ? Number(match[1]) : 0
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    employees: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    assignments: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5h6M8.5 11h7M8.5 15h4M16 15l1.5 1.5L20 14" />
      </>
    ),
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
    arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
    activity: (
      <>
        <path d="M3 12h4l3-8 4 16 3-8h4" />
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
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-600',
  }

  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium ${presentation.className}`}>
      {presentation.label}
    </span>
  )
}

function StatisticsCard({
  label,
  value,
  icon,
  tone,
  cardTone,
  valueTone,
  isLoading,
}) {
  return (
    <article className={`dashboard-stat-card dashboard-stat-card-${cardTone} flex items-center justify-between gap-3 rounded-2xl border bg-white p-4 shadow-sm sm:p-5`}>
      <div className="min-w-0">
        <p className="dashboard-stat-label text-sm font-medium text-slate-500">{label}</p>
        <p className={`dashboard-stat-value dashboard-stat-value-${valueTone} mt-2 text-2xl font-bold tracking-tight sm:text-3xl`}>
          {isLoading ? '—' : value}
        </p>
      </div>
      <span className={`dashboard-stat-icon flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${tone}`}>
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" name={icon} />
      </span>
    </article>
  )
}

function WorkStatusChart({ counts, total }) {
  const radius = 48
  const circumference = 2 * Math.PI * radius
  const segments = STATUS_PEKERJAAN_OPTIONS.map(({ value }) => ({
    value,
    count: counts[value],
    ...STATUS_PRESENTATION[value],
  }))
  const chartSegments = segments.reduce(
    (result, segment) => {
      const length = total > 0 ? (segment.count / total) * circumference : 0
      result.items.push({ ...segment, length, offset: result.offset })
      result.offset += length
      return result
    },
    { items: [], offset: 0 },
  ).items

  return (
    <div className="flex flex-col items-center gap-6 sm:flex-row sm:justify-center sm:gap-10">
      <div className="relative h-44 w-44 shrink-0">
        <svg
          aria-label={`Grafik status pekerjaan: ${segments.map(({ label, count }) => `${label} ${count}`).join(', ')}`}
          className="h-full w-full -rotate-90"
          role="img"
          viewBox="0 0 120 120"
        >
          <circle cx="60" cy="60" fill="none" r={radius} stroke="#f1f5f9" strokeWidth="14" />
          {total > 0 &&
            chartSegments.map((segment) => {
              return (
                <circle
                  cx="60"
                  cy="60"
                  fill="none"
                  key={segment.value}
                  r={radius}
                  stroke={segment.color}
                  strokeDasharray={`${segment.length} ${circumference - segment.length}`}
                  strokeDashoffset={-segment.offset}
                  strokeWidth="14"
                />
              )
            })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-bold tracking-tight text-slate-900">{total}</span>
          <span className="mt-1 text-xs font-medium text-slate-500">Total Pekerjaan</span>
        </div>
      </div>
      <ul className="w-full max-w-xs space-y-4">
        {segments.map((segment) => (
          <li className="flex items-center justify-between gap-4" key={segment.value}>
            <span className="flex min-w-0 items-center gap-2.5 text-sm text-slate-600">
              <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.dot}`} />
              <span>{segment.label}</span>
            </span>
            <span className="font-semibold tabular-nums text-slate-900">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function DashboardAdmin({ onNavigate = () => {} }) {
  const [store, setStore] = useState({
    employees: [],
    jobs: [],
    assignments: [],
    isLoading: true,
    error: '',
  })
  const { employees, jobs, assignments, isLoading, error } = store

  useEffect(() => {
    let isMounted = true

    Promise.all([getKaryawan(), getPekerjaan(), getPenugasan()])
      .then(([loadedEmployees, loadedJobs, loadedAssignments]) => {
          if (isMounted) {
            setStore({
              employees: loadedEmployees,
              jobs: loadedJobs,
              assignments: loadedAssignments,
              isLoading: false,
              error: '',
            })
          }
        })
        .catch((loadError) => {
          if (isMounted) {
            setStore((current) => ({
              ...current,
              isLoading: false,
              error: `Data dashboard tidak dapat dimuat: ${loadError.message}`,
            }))
          }
        })
    return () => {
      isMounted = false
    }
  }, [])

  const statistics = useMemo(() => {
    const counts = Object.fromEntries(
      STATUS_PEKERJAAN_OPTIONS.map(({ value }) => [
        value,
        jobs.filter((job) => job.status === value).length,
      ]),
    )
    return {
      counts,
      totalEmployees: employees.length,
      totalJobs: jobs.length,
      totalAssignments: assignments.length,
    }
  }, [assignments, employees, jobs])

  const latestJobs = useMemo(
    () =>
      [...jobs]
        .sort(
          (left, right) =>
            getNumericSuffix(right.id_pekerjaan) -
            getNumericSuffix(left.id_pekerjaan),
        )
        .slice(0, 5),
    [jobs],
  )

  const employeeMap = useMemo(
    () => new Map(employees.map((employee) => [employee.id_karyawan, employee])),
    [employees],
  )
  const jobMap = useMemo(
    () => new Map(jobs.map((job) => [job.id_pekerjaan, job])),
    [jobs],
  )
  const latestAssignments = useMemo(
    () =>
      [...assignments]
        .sort((left, right) => right.id_penugasan - left.id_penugasan)
        .slice(0, 5),
    [assignments],
  )
  const latestEmployees = useMemo(
    () =>
      [...employees]
        .sort(
          (left, right) =>
            getNumericSuffix(right.id_karyawan) -
            getNumericSuffix(left.id_karyawan),
        )
        .slice(0, 4),
    [employees],
  )

  const cards = [
    { label: 'Total Karyawan', value: statistics.totalEmployees, icon: 'employees', tone: 'bg-blue-50 text-blue-600', cardTone: 'employees', valueTone: 'blue' },
    { label: 'Total Pekerjaan', value: statistics.totalJobs, icon: 'work', tone: 'bg-indigo-50 text-indigo-600', cardTone: 'jobs', valueTone: 'indigo' },
    { label: 'Belum Dimulai', value: statistics.counts[STATUS_PEKERJAAN.BELUM_MULAI], icon: 'calendar', tone: 'bg-amber-50 text-amber-600', cardTone: 'pending', valueTone: 'amber' },
    { label: 'Sedang Berjalan', value: statistics.counts[STATUS_PEKERJAAN.BERJALAN], icon: 'activity', tone: 'bg-blue-50 text-blue-600', cardTone: 'running', valueTone: 'blue' },
    { label: 'Pekerjaan Selesai', value: statistics.counts[STATUS_PEKERJAAN.SELESAI], icon: 'work', tone: 'bg-emerald-50 text-emerald-600', cardTone: 'complete', valueTone: 'green' },
    { label: 'Total Penugasan', value: statistics.totalAssignments, icon: 'assignments', tone: 'bg-violet-50 text-violet-600', cardTone: 'assignments', valueTone: 'violet' },
  ]

  return (
    <div className="dashboard-admin mx-auto w-full max-w-[1440px] space-y-6">
      <header className="dashboard-welcome-banner relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-slate-800 p-5 text-white shadow-lg shadow-blue-900/10 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="dashboard-welcome-copy min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-blue-100">
            Panel Manajemen Administrator
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Selamat Datang, Administrator!
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-blue-100">
            Pantau ringkasan aktivitas, pekerjaan, dan penugasan dalam satu
            tempat.
          </p>
        </div>
        <nav
          aria-label="Quick Action"
          className="dashboard-quick-actions grid shrink-0 gap-2 sm:grid-cols-3"
        >
          {[
            { label: 'Kelola Karyawan', icon: 'employees', page: 'Data Karyawan' },
            { label: 'Kelola Pekerjaan', icon: 'work', page: 'Data Pekerjaan' },
            { label: 'Atur Penugasan', icon: 'assignments', page: 'Penugasan' },
          ].map((action) => (
            <button
              className="dashboard-quick-action"
              key={action.page}
              onClick={() => onNavigate(action.page)}
              type="button"
            >
              <Icon className="h-4 w-4" name={action.icon} />
              <span>{action.label}</span>
              <Icon className="dashboard-quick-action-arrow h-3.5 w-3.5" name="arrow" />
            </button>
          ))}
        </nav>
      </header>
      {error && (
        <div className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between" role="alert">
          <p>{error}</p>
          <button
            className="shrink-0 font-semibold underline underline-offset-2"
            onClick={() => window.location.reload()}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      )}

      <section aria-label="Statistik ringkasan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {cards.map((card) => (
          <StatisticsCard {...card} isLoading={isLoading} key={card.label} />
        ))}
      </section>

      <div className="grid gap-6 xl:grid-cols-5">
        <section aria-label="Grafik pekerjaan berdasarkan status" className="dashboard-panel rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] sm:p-6 xl:col-span-2">
          <div className="dashboard-panel-heading mb-6">
            <h2 className="text-base font-semibold text-slate-900">Status Pekerjaan</h2>
            <p className="mt-1 text-sm text-slate-500">Distribusi pekerjaan berdasarkan status saat ini.</p>
          </div>
          {isLoading ? (
            <div className="mx-auto h-44 w-44 animate-pulse rounded-full bg-slate-100" role="status" aria-label="Memuat grafik pekerjaan" />
          ) : (
            <WorkStatusChart counts={statistics.counts} total={statistics.totalJobs} />
          )}
        </section>

        <section aria-label="Pekerjaan terbaru" className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02] xl:col-span-3">
          <div className="dashboard-panel-heading flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Pekerjaan Terbaru</h2>
              <p className="mt-1 text-sm text-slate-500">Daftar pekerjaan yang terakhir ditambahkan.</p>
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:px-3 sm:text-sm"
              onClick={() => onNavigate('Data Pekerjaan')}
              type="button"
            >
              Data Pekerjaan
              <Icon className="h-4 w-4" name="arrow" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Memuat pekerjaan terbaru">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" key={index} />
              ))}
            </div>
          ) : latestJobs.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {latestJobs.map((job) => (
                <article className="dashboard-job-row flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6" key={job.id_pekerjaan}>
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-slate-800">{job.nama_pekerjaan}</p>
                    <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                      <Icon className="h-3.5 w-3.5 shrink-0" name="location" />
                      <span className="truncate">{job.lokasi || 'Lokasi belum ditentukan'}</span>
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                    <span className="text-xs text-slate-500">
                      {formatDate(job.tanggal_mulai)} <span className="text-slate-300">—</span> {formatDate(job.target_selesai)}
                    </span>
                    <StatusBadge status={job.status} />
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Belum ada data pekerjaan.</p>
          )}
        </section>
      </div>

      <div className="grid gap-6 xl:grid-cols-5">
        <section aria-label="Aktivitas penugasan terbaru" className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02] xl:col-span-3">
          <div className="dashboard-panel-heading flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Aktivitas Penugasan</h2>
              <p className="mt-1 text-sm text-slate-500">Penugasan yang terakhir tercatat.</p>
            </div>
            <button
              className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-xs font-semibold text-blue-600 transition hover:bg-blue-50 sm:px-3 sm:text-sm"
              onClick={() => onNavigate('Penugasan')}
              type="button"
            >
              Kelola Penugasan
              <Icon className="h-4 w-4" name="arrow" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Memuat aktivitas penugasan">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" key={index} />
              ))}
            </div>
          ) : latestAssignments.length > 0 ? (
            <div className="divide-y divide-slate-100">
              {latestAssignments.map((assignment) => {
                const employee = employeeMap.get(assignment.id_karyawan)
                const job = jobMap.get(assignment.id_pekerjaan)
                return (
                  <article className="flex items-start gap-3 px-5 py-4 sm:px-6" key={assignment.id_penugasan}>
                    <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                      <Icon className="h-4 w-4" name="assignments" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-slate-800">{employee?.nama ?? 'Karyawan tidak tersedia'}</p>
                      <p className="mt-1 truncate text-sm text-slate-500">
                        Ditugaskan pada {job?.nama_pekerjaan ?? `Pekerjaan #${assignment.id_pekerjaan}`}
                      </p>
                      <p className="mt-1 text-xs text-slate-400">Waktu penugasan tidak tersedia</p>
                    </div>
                  </article>
                )
              })}
            </div>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Belum ada penugasan.</p>
          )}
        </section>

        <section aria-label="Ringkasan karyawan" className="dashboard-panel overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02] xl:col-span-2">
          <div className="dashboard-panel-heading flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
            <div>
              <h2 className="text-base font-semibold text-slate-900">Ringkasan Karyawan</h2>
              <p className="mt-1 text-sm text-slate-500">{isLoading ? '—' : `${employees.length} karyawan terdaftar`}</p>
            </div>
            <button
              aria-label="Buka Data Karyawan"
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-blue-600 transition hover:bg-blue-50"
              onClick={() => onNavigate('Data Karyawan')}
              type="button"
            >
              <Icon className="h-4 w-4" name="arrow" />
            </button>
          </div>
          {isLoading ? (
            <div className="space-y-3 p-5" role="status" aria-label="Memuat ringkasan karyawan">
              {Array.from({ length: 3 }, (_, index) => (
                <div className="h-12 animate-pulse rounded-xl bg-slate-100" key={index} />
              ))}
            </div>
          ) : latestEmployees.length > 0 ? (
            <>
              <ul className="divide-y divide-slate-100">
                {latestEmployees.map((employee) => (
                  <li className="flex items-center gap-3 px-5 py-3 sm:px-6" key={employee.id_karyawan}>
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                      {employee.nama.trim().charAt(0).toUpperCase()}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold text-slate-800">{employee.nama}</span>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">{employee.jabatan} · {employee.id_karyawan}</span>
                    </span>
                  </li>
                ))}
              </ul>
              <p className="border-t border-slate-100 px-5 py-3 text-xs leading-5 text-slate-400 sm:px-6">
                Tanggal penambahan karyawan belum tersedia; daftar diurutkan berdasarkan ID.
              </p>
            </>
          ) : (
            <p className="px-6 py-10 text-center text-sm text-slate-500">Belum ada data karyawan.</p>
          )}
        </section>
      </div>
    </div>
  )
}

export default DashboardAdmin
