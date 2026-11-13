import { useEffect, useMemo, useState } from 'react'
import { STATUS_PEKERJAAN } from '../../data/pekerjaan.js'
import {
  getPekerjaanSaya,
  getPekerjaanTersedia,
} from '../../services/workerPekerjaanApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

const WORK_STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'bg-amber-100 text-amber-800',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-blue-100 text-blue-800',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-100 text-emerald-800',
  },
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
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
    check: <path d="M20 6 9 17l-5-5" />,
    sparkles: (
      <>
        <path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" />
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

function Badge({ status }) {
  const badge = WORK_STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-700',
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-semibold ${badge.className}`}
    >
      {badge.label}
    </span>
  )
}

function StatisticsCard({ label, value, icon, tone, isLoading }) {
  return (
    <article className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="min-w-0">
        <p className="text-sm font-medium leading-5 text-slate-500">{label}</p>
        <p className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
          {isLoading ? '—' : value}
        </p>
      </div>
      <span
        className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl sm:h-12 sm:w-12 ${tone}`}
      >
        <Icon className="h-5 w-5 sm:h-6 sm:w-6" name={icon} />
      </span>
    </article>
  )
}

function SectionHeader({ title, description, onClick, buttonLabel }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-5 py-4 sm:px-6">
      <div className="min-w-0">
        <h2 className="text-base font-semibold text-slate-900">{title}</h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      <button
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:text-sm"
        onClick={onClick}
        type="button"
      >
        {buttonLabel}
        <Icon className="h-4 w-4" name="arrow" />
      </button>
    </div>
  )
}

function DashboardPekerja({ workerId, workerName = '', onNavigate = () => {} }) {
  const [store, setStore] = useState({
    worker: null,
    assignedJobs: [],
    availableJobs: [],
    isLoading: true,
    error: '',
  })
  const { worker, assignedJobs, availableJobs, isLoading, error } = store

  useEffect(() => {
    let isMounted = true

    Promise.all([getPekerjaanSaya(workerId, workerName), getPekerjaanTersedia()])
      .then(([myWork, unassignedJobs]) => {
        if (isMounted) {
          setStore({
            worker: myWork.worker,
            assignedJobs: myWork.assignedJobs,
            availableJobs: unassignedJobs,
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
            error: `Dashboard tidak dapat dimuat: ${loadError.message}`,
          }))
        }
      })

    return () => {
      isMounted = false
    }
  }, [workerId, workerName])

  const statistics = useMemo(() => {
    const total = assignedJobs.length
    const berjalan = assignedJobs.filter(
      ({ job }) => job?.status === STATUS_PEKERJAAN.BERJALAN,
    ).length
    const selesai = assignedJobs.filter(
      ({ job }) => job?.status === STATUS_PEKERJAAN.SELESAI,
    ).length
    const belumMulai = assignedJobs.filter(
      ({ job }) => job?.status === STATUS_PEKERJAAN.BELUM_MULAI,
    ).length

    return {
      total,
      berjalan,
      selesai,
      belumMulai,
      tersedia: availableJobs.length,
    }
  }, [assignedJobs, availableJobs])

  const recentAssignedJobs = useMemo(
    () =>
      [...assignedJobs]
        .sort(
          (left, right) =>
            right.assignment.id_penugasan - left.assignment.id_penugasan,
        )
        .slice(0, 5),
    [assignedJobs],
  )

  const recentAvailableJobs = useMemo(
    () =>
      [...availableJobs]
        .sort((left, right) => right.id_pekerjaan - left.id_pekerjaan)
        .slice(0, 5),
    [availableJobs],
  )

  const cards = [
    {
      label: 'Pekerjaan Ditugaskan',
      value: statistics.total,
      icon: 'work',
      tone: 'bg-emerald-50 text-emerald-700',
    },
    {
      label: 'Sedang Berjalan',
      value: statistics.berjalan,
      icon: 'activity',
      tone: 'bg-blue-50 text-blue-700',
    },
    {
      label: 'Pekerjaan Selesai',
      value: statistics.selesai,
      icon: 'check',
      tone: 'bg-emerald-50 text-emerald-600',
    },
    {
      label: 'Pekerjaan Tersedia',
      value: statistics.tersedia,
      icon: 'sparkles',
      tone: 'bg-indigo-50 text-indigo-700',
    },
  ]

  return (
    <div className="worker-dashboard mx-auto w-full max-w-[1440px] space-y-6">
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-800 via-emerald-700 to-slate-900 p-5 text-white shadow-lg shadow-emerald-950/15 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-emerald-200">
            Area Kerja Karyawan · CV. Putra Anugrah Mandiri
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Selamat Datang, {worker?.nama || workerName || 'Pekerja'}!
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-emerald-100">
            Pantau penugasan resmi dan daftar pekerjaan terkini langsung dari
            database perusahaan.
          </p>
          {(worker || workerName) && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-100">
              <span className="rounded-lg bg-emerald-900/60 px-2.5 py-1 backdrop-blur-sm">
                Jabatan: {worker?.jabatan || 'Pekerja'}
              </span>
              <span className="rounded-lg bg-emerald-900/60 px-2.5 py-1 backdrop-blur-sm">
                Tarif: {CURRENCY_FORMATTER.format(worker?.tarif_per_jam || 0)} / jam
              </span>
              <span className="rounded-lg bg-emerald-900/60 px-2.5 py-1 backdrop-blur-sm">
                ID Karyawan: {worker?.id_karyawan || workerId || '—'}
              </span>
            </div>
          )}
        </div>
        <nav
          aria-label="Aksi cepat pekerja"
          className="grid shrink-0 gap-2 sm:grid-cols-2"
        >
          <button
            className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm"
            onClick={() => onNavigate('List Pekerjaan')}
            type="button"
          >
            <span>List Pekerjaan</span>
            <Icon className="h-4 w-4" name="arrow" />
          </button>
          <button
            className="flex items-center justify-between gap-3 rounded-xl bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm"
            onClick={() => onNavigate('Pekerjaan Tersedia')}
            type="button"
          >
            <span>Pekerjaan Tersedia</span>
            <Icon className="h-4 w-4" name="arrow" />
          </button>
        </nav>
      </header>

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </div>
      )}

      <section
        aria-label="Statistik pekerjaan pekerja"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <StatisticsCard {...card} isLoading={isLoading} key={card.label} />
        ))}
      </section>

      <section
        aria-label="Pekerjaan saya"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]"
      >
        <SectionHeader
          buttonLabel="Buka Semua"
          description="Pekerjaan yang ditugaskan kepada Anda oleh Admin."
          onClick={() => onNavigate('List Pekerjaan')}
          title="List Pekerjaan (Terbaru)"
        />
        {isLoading ? (
          <div
            aria-label="Memuat pekerjaan saya"
            className="space-y-3 p-5"
            role="status"
          >
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="h-16 animate-pulse rounded-xl bg-slate-100"
                key={index}
              />
            ))}
          </div>
        ) : recentAssignedJobs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentAssignedJobs.map(({ assignment, job }) => (
              <article
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                key={assignment.id_penugasan}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {job?.nama_pekerjaan ??
                      assignment.nama_pekerjaan ??
                      'Pekerjaan tidak tersedia'}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className="h-3.5 w-3.5 shrink-0" name="location" />
                    <span className="truncate">
                      {job?.lokasi || 'Lokasi belum ditentukan'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    {formatDate(job?.tanggal_mulai)}{' '}
                    <span className="text-slate-300">—</span>{' '}
                    {formatDate(job?.target_selesai)}
                  </span>
                  <Badge status={job?.status} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Belum ada pekerjaan yang ditugaskan kepada Anda.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Penugasan resmi dari Admin akan tampil otomatis pada bagian ini.
            </p>
          </div>
        )}
      </section>

      <section
        aria-label="Pekerjaan tersedia di perusahaan"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]"
      >
        <SectionHeader
          buttonLabel="Lihat Semua Pekerjaan"
          description="Pekerjaan di perusahaan yang belum ditugaskan dan belum selesai."
          onClick={() => onNavigate('Pekerjaan Tersedia')}
          title="Pekerjaan Tersedia"
        />
        {isLoading ? (
          <div
            aria-label="Memuat pekerjaan tersedia"
            className="space-y-3 p-5"
            role="status"
          >
            {Array.from({ length: 2 }, (_, index) => (
              <div
                className="h-14 animate-pulse rounded-xl bg-slate-100"
                key={index}
              />
            ))}
          </div>
        ) : recentAvailableJobs.length > 0 ? (
          <div className="divide-y divide-slate-100">
            {recentAvailableJobs.map((job) => (
              <article
                className="flex items-center justify-between gap-3 px-5 py-4 sm:px-6"
                key={job.id_pekerjaan}
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-800">
                    {job.nama_pekerjaan}
                  </p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon className="h-3.5 w-3.5 shrink-0" name="location" />
                    <span className="truncate">
                      {job.lokasi || 'Lokasi belum ditentukan'}
                    </span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 sm:justify-end">
                  <span className="text-xs text-slate-500">
                    {formatDate(job.tanggal_mulai)}{' '}
                    <span className="text-slate-300">—</span>{' '}
                    {formatDate(job.target_selesai)}
                  </span>
                  <Badge status={job.status} />
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="px-6 py-10 text-center">
            <p className="text-sm font-semibold text-slate-800">
              Tidak ada pekerjaan baru yang tersedia saat ini.
            </p>
            <p className="mt-1 text-sm text-slate-500">
              Semua pekerjaan sudah ditugaskan atau telah selesai.
            </p>
          </div>
        )}
      </section>
    </div>
  )
}

export default DashboardPekerja
