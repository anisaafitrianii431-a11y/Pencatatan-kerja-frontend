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

const WORK_STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'bg-amber-50 text-amber-800 border border-amber-200',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-sky-50 text-sky-800 border border-sky-200',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-800 border border-emerald-200',
  },
}

function formatDate(value) {
  if (!value) return '—'
  const clean = String(value).slice(0, 10)
  const date = new Date(`${clean}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

function formatRupiah(value) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value) || 0)
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
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 7v5l3 2" />
      </>
    ),
    receipt: (
      <>
        <path d="M4 3v18l2-1.5L8 21l2-1.5L12 21l2-1.5L16 21l2-1.5L20 21V3l-2 1.5L16 3l-2 1.5L12 3 10 4.5 8 3 6 4.5 4 3Z" />
        <path d="M8 9h8M8 13h6" />
      </>
    ),
    wallet: (
      <>
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </>
    ),
    bell: (
      <>
        <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
        <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    badgeCheck: (
      <>
        <path d="M3.85 8.62a4 4 0 0 1 4.78-4.77 4 4 0 0 1 6.74 0 4 4 0 0 1 4.78 4.78 4 4 0 0 1 0 6.74 4 4 0 0 1-4.77 4.78 4 4 0 0 1-6.75 0 4 4 0 0 1-4.78-4.77 4 4 0 0 1 0-6.76Z" />
        <path d="m9 12 2 2 4-4" />
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

function StatisticsCard({ label, sublabel, value, icon, tone, isLoading, onClick }) {
  return (
    <article
      onClick={onClick}
      className="flex cursor-pointer items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-5"
    >
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
        <p className="mt-1.5 text-2xl font-extrabold tracking-tight text-slate-900 sm:text-3xl">
          {isLoading ? '—' : value}
        </p>
        {sublabel && (
          <p className="mt-1 text-[11px] text-slate-400 truncate">{sublabel}</p>
        )}
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
        className="inline-flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-50 sm:text-sm cursor-pointer"
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

  // Key penyimpanan status notifikasi yang sudah dibaca / ditutup
  const storageKey = `pencatatan_kerja_seen_admin_jobs_${worker?.id_karyawan || workerId || workerName || 'default'}`
  const [dismissedJobIds, setDismissedJobIds] = useState(() => {
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? JSON.parse(raw) : []
    } catch {
      return []
    }
  })

  useEffect(() => {
    let isMounted = true

    Promise.all([getPekerjaanSaya(workerId, workerName), getPekerjaanTersedia(workerId)])
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

  // Filter pekerjaan yang ditugaskan oleh Admin dan belum ditandai dilihat
  const newAdminAssignments = useMemo(() => {
    return assignedJobs.filter(({ assignment, job }) => {
      if (!job) return false
      const isAdmin = assignment.jenis_penugasan === 'admin'
      const isActive = job.status !== STATUS_PEKERJAAN.SELESAI
      const idKey = Number(assignment.id_penugasan || job.id_pekerjaan)
      const isUnread = !dismissedJobIds.includes(idKey)
      return isAdmin && isActive && isUnread
    })
  }, [assignedJobs, dismissedJobIds])

  function handleDismissAllNotifs() {
    const allIds = newAdminAssignments.map(({ assignment, job }) =>
      Number(assignment.id_penugasan || job.id_pekerjaan)
    )
    setDismissedJobIds((prev) => {
      const updated = [...new Set([...prev, ...allIds])]
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }

  function handleDismissSingleNotif(id) {
    setDismissedJobIds((prev) => {
      const updated = [...new Set([...prev, Number(id)])]
      try {
        localStorage.setItem(storageKey, JSON.stringify(updated))
      } catch {
        // ignore
      }
      return updated
    })
  }

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

  const cards = [
    {
      label: 'Pekerjaan Ditugaskan',
      sublabel: 'Total proyek pada akun Anda',
      value: statistics.total,
      icon: 'work',
      tone: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/70',
    },
    {
      label: 'Sedang Berjalan',
      sublabel: 'Proyek aktif dikerjakan',
      value: statistics.berjalan,
      icon: 'activity',
      tone: 'bg-sky-50 text-sky-700 ring-1 ring-sky-200/70',
    },
    {
      label: 'Pekerjaan Selesai',
      sublabel: 'Proyek telah rampung',
      value: statistics.selesai,
      icon: 'check',
      tone: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200/70',
    },
    {
      label: 'Belum Mulai',
      sublabel: 'Menunggu jadwal mulai',
      value: statistics.belumMulai,
      icon: 'sparkles',
      tone: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200/70',
    },
  ]

  const quickMenus = [
    {
      title: 'List Pekerjaan',
      description: 'Lihat tugas & jadwal proyek',
      icon: 'work',
      tone: 'bg-emerald-50 text-emerald-700',
      target: 'List Pekerjaan',
      badge: newAdminAssignments.length > 0 ? `${newAdminAssignments.length} Baru` : null,
    },
    {
      title: 'Absensi Kerja',
      description: 'Catat jam masuk & pulang',
      icon: 'clock',
      tone: 'bg-sky-50 text-sky-700',
      target: 'Absensi',
    },
    {
      title: 'Rekap Pengeluaran',
      description: 'Ajukan nota & reimbursement',
      icon: 'receipt',
      tone: 'bg-amber-50 text-amber-700',
      target: 'Rekap Pengeluaran',
    },
    {
      title: 'Slip Gaji Pribadi',
      description: 'Cek upah, riwayat & cetak PDF',
      icon: 'wallet',
      tone: 'bg-indigo-50 text-indigo-700',
      target: 'Slip Gaji Pribadi',
    },
  ]

  const displayName = worker?.nama || workerName || 'Pekerja'
  const [todayLabel] = useState(() =>
    new Intl.DateTimeFormat('id-ID', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(new Date()),
  )

  return (
    <div className="worker-dashboard mx-auto w-full max-w-[1440px] space-y-6">
      {/* ============================================================== */}
      {/* HEADER BANNER UTAMA                                            */}
      {/* ============================================================== */}
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-br from-emerald-800 via-emerald-700 to-slate-900 p-6 text-white shadow-lg shadow-emerald-950/15 lg:flex-row lg:items-center lg:justify-between sm:p-7">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.14em] text-emerald-200">
            <span>Area Kerja Karyawan · CV. Putra Anugrah Mandiri</span>
            <span className="hidden sm:inline text-emerald-400">•</span>
            <span className="normal-case tracking-normal text-emerald-100/90">{todayLabel}</span>
          </div>
          <h1 className="mt-1.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            Selamat Datang, {displayName}!
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-emerald-100/95">
            Pantau penugasan resmi, catat absensi harian, dan cek rincian slip gaji Anda dengan mudah.
          </p>
          {(worker || workerName) && (
            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-medium text-emerald-50">
              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
                Jabatan: <strong>{worker?.jabatan || 'Pekerja'}</strong>
              </span>
              <span className="rounded-lg border border-white/10 bg-white/10 px-3 py-1 backdrop-blur-sm">
                ID Karyawan: <strong>{worker?.kode_karyawan || workerId || worker?.id_karyawan || '—'}</strong>
              </span>
            </div>
          )}
        </div>
        <nav
          aria-label="Aksi cepat pekerja"
          className="grid shrink-0 grid-cols-2 gap-2.5 sm:flex sm:flex-wrap lg:grid lg:grid-cols-2"
        >
          <button
            className="relative flex items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 text-xs font-bold text-emerald-900 shadow-sm transition hover:bg-emerald-50 sm:text-sm cursor-pointer"
            onClick={() => onNavigate('List Pekerjaan')}
            type="button"
          >
            <div className="flex items-center gap-2">
              <span>List Pekerjaan</span>
              {newAdminAssignments.length > 0 && (
                <span className="h-2 w-2 rounded-full bg-rose-500 animate-ping" />
              )}
            </div>
            <Icon className="h-4 w-4 text-emerald-700" name="arrow" />
          </button>
          <button
            className="flex items-center justify-between gap-3 rounded-xl border border-white/20 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm cursor-pointer"
            onClick={() => onNavigate('Absensi')}
            type="button"
          >
            <span>Absensi Kerja</span>
            <Icon className="h-4 w-4" name="arrow" />
          </button>
        </nav>
      </header>

      {/* ============================================================== */}
      {/* NOTIFIKASI PENUGASAN BARU DARI ADMIN                           */}
      {/* ============================================================== */}
      {newAdminAssignments.length > 0 && (
        <section
          aria-label="Notifikasi pekerjaan baru dari admin"
          className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-sky-700 p-5 text-white shadow-lg shadow-teal-950/15 transition-all"
        >
          {/* Subtle background glow effect */}
          <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex items-start gap-3.5">
              <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-white/20 text-white backdrop-blur-md shadow-inner">
                <Icon className="h-6 w-6 animate-bounce" name="bell" />
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-400 px-2.5 py-0.5 text-[11px] font-black uppercase tracking-wider text-slate-900 shadow-xs">
                    <span className="h-1.5 w-1.5 rounded-full bg-slate-900 animate-ping" />
                    Penugasan Baru dari Admin
                  </span>
                  <span className="text-xs font-medium text-emerald-100">
                    {newAdminAssignments.length === 1
                      ? 'Ada 1 pekerjaan baru ditugaskan ke Anda'
                      : `Ada ${newAdminAssignments.length} pekerjaan baru ditugaskan ke Anda`}
                  </span>
                </div>

                <h2 className="mt-1.5 text-base font-bold text-white sm:text-lg">
                  {newAdminAssignments.length === 1
                    ? `Anda resmi ditugaskan pada proyek "${newAdminAssignments[0].job?.nama_pekerjaan || 'Proyek Baru'}"`
                    : `Admin telah menetapkan ${newAdminAssignments.length} tugas proyek resmi untuk Anda`}
                </h2>

                <p className="mt-1 text-xs text-emerald-100 sm:text-sm">
                  Silakan periksa detail lokasi, jadwal kerja, dan target penyelesaian agar dapat mempersiapkan absensi serta operasional lapangan.
                </p>

                {/* Ringkasan Proyek Baru */}
                <div className="mt-3.5 flex flex-wrap gap-2">
                  {newAdminAssignments.slice(0, 3).map(({ assignment, job }) => (
                    <div
                      key={assignment.id_penugasan}
                      className="flex items-center gap-2 rounded-xl bg-white/15 px-3 py-1.5 text-xs text-white backdrop-blur-sm border border-white/20"
                    >
                      <Icon className="h-3.5 w-3.5 text-amber-300" name="work" />
                      <span className="font-bold">{job?.nama_pekerjaan}</span>
                      {job?.lokasi && (
                        <span className="text-emerald-100">• {job.lokasi}</span>
                      )}
                      {(assignment?.nominal_upah || job?.nominal_upah) && (
                        <span className="rounded bg-emerald-900/60 px-1.5 py-0.5 text-[10px] font-bold text-emerald-200">
                          {formatRupiah(assignment?.nominal_upah || job?.nominal_upah)}
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleDismissSingleNotif(assignment.id_penugasan || job.id_pekerjaan)
                        }}
                        className="ml-1 text-white/70 hover:text-white"
                        title="Tandai pekerjaan ini sudah dilihat"
                      >
                        <Icon className="h-3 w-3" name="close" />
                      </button>
                    </div>
                  ))}
                  {newAdminAssignments.length > 3 && (
                    <span className="self-center text-xs text-emerald-100 font-medium">
                      +{newAdminAssignments.length - 3} lainnya
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex shrink-0 items-center gap-2 pt-2 sm:pt-0">
              <button
                type="button"
                onClick={() => onNavigate('List Pekerjaan')}
                className="inline-flex items-center gap-1.5 rounded-xl bg-white px-4 py-2 text-xs font-bold text-emerald-800 shadow-md transition hover:bg-emerald-50 active:scale-95 cursor-pointer"
              >
                <span>Lihat di List Pekerjaan</span>
                <Icon className="h-4 w-4" name="arrow" />
              </button>
              <button
                type="button"
                onClick={handleDismissAllNotifs}
                className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 cursor-pointer"
                title="Sembunyikan notifikasi ini"
              >
                Tandai Sudah Dibaca
              </button>
            </div>
          </div>
        </section>
      )}

      {error && (
        <div
          className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
          role="alert"
        >
          {error}
        </div>
      )}

      {/* ============================================================== */}
      {/* KARTU STATISTIK PEKERJAAN                                      */}
      {/* ============================================================== */}
      <section
        aria-label="Statistik pekerjaan pekerja"
        className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"
      >
        {cards.map((card) => (
          <StatisticsCard
            {...card}
            isLoading={isLoading}
            key={card.label}
            onClick={() => onNavigate('List Pekerjaan')}
          />
        ))}
      </section>

      {/* ============================================================== */}
      {/* MENU CEPAT KARYAWAN                                            */}
      {/* ============================================================== */}
      <section aria-label="Menu cepat karyawan" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {quickMenus.map((menu) => (
          <button
            key={menu.title}
            type="button"
            onClick={() => onNavigate(menu.target)}
            className="group relative flex items-center gap-3.5 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-xs transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md cursor-pointer"
          >
            <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${menu.tone}`}>
              <Icon className="h-5 w-5" name={menu.icon} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-bold text-slate-900 group-hover:text-emerald-700 transition-colors">
                    {menu.title}
                  </p>
                  {menu.badge && (
                    <span className="inline-flex items-center gap-1 rounded-full bg-rose-500 px-2 py-0.5 text-[10px] font-black text-white shadow-xs animate-pulse">
                      <span className="h-1.5 w-1.5 rounded-full bg-white" />
                      {menu.badge}
                    </span>
                  )}
                </div>
                <Icon className="h-3.5 w-3.5 text-slate-400 group-hover:text-emerald-600 transition-transform group-hover:translate-x-0.5" name="arrow" />
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{menu.description}</p>
            </div>
          </button>
        ))}
      </section>

      {/* ============================================================== */}
      {/* DAFTAR PEKERJAAN TERBARU                                       */}
      {/* ============================================================== */}
      <section
        aria-label="Pekerjaan saya"
        className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs"
      >
        <SectionHeader
          buttonLabel="Buka Semua"
          description="Pekerjaan terbaru yang ditugaskan kepada Anda oleh Admin."
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
            {recentAssignedJobs.map(({ assignment, job }) => {
              const isAdmin = assignment.jenis_penugasan === 'admin'
              return (
                <article
                  className="group flex cursor-pointer flex-col gap-3 px-5 py-4 transition hover:bg-slate-50/80 sm:flex-row sm:items-center sm:justify-between sm:px-6"
                  key={assignment.id_penugasan}
                  onClick={() => onNavigate('List Pekerjaan')}
                >
                  <div className="flex min-w-0 flex-1 items-start gap-3.5">
                    <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200/60">
                      <Icon className="h-4.5 w-4.5" name="work" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-bold text-slate-900 transition-colors group-hover:text-emerald-700">
                          {job?.nama_pekerjaan ??
                            assignment.nama_pekerjaan ??
                            'Pekerjaan tidak tersedia'}
                        </p>
                        {isAdmin && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 border border-blue-200">
                            👑 Ditugaskan Admin
                          </span>
                        )}
                        {(assignment?.nama_role || assignment?.peran_tugas) && (
                          <span className="inline-flex rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600">
                            {assignment.nama_role || assignment.peran_tugas}
                          </span>
                        )}
                      </div>
                      <p className="mt-1 flex items-center gap-1.5 text-xs text-slate-500">
                        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" name="location" />
                        <span className="truncate">
                          {job?.lokasi || 'Lokasi belum ditentukan'}
                        </span>
                      </p>
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-3 pl-[54px] sm:flex-nowrap sm:justify-end sm:pl-4">
                    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-500 sm:min-w-[185px] sm:justify-end">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400" name="calendar" />
                      <span>
                        {formatDate(job?.tanggal_mulai)}{' '}
                        <span className="text-slate-300">—</span>{' '}
                        {formatDate(job?.target_selesai)}
                      </span>
                    </span>
                    <div className="sm:flex sm:min-w-[125px] sm:justify-end">
                      <Badge status={job?.status} />
                    </div>
                    <Icon
                      className="hidden h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5 group-hover:text-emerald-600 sm:block"
                      name="arrow"
                    />
                  </div>
                </article>
              )
            })}
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
    </div>
  )
}

export default DashboardPekerja
