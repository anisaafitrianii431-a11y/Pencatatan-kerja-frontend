import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { STATUS_PEKERJAAN_OPTIONS } from '../../data/pekerjaan.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import {
  deletePenugasan,
  getPenugasan,
  getPenugasanById,
} from '../../services/penugasanApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 8

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_LABELS = Object.fromEntries(
  STATUS_PEKERJAAN_OPTIONS.map(({ value, label }) => [value, label]),
)

function formatDate(value) {
  return value ? DATE_FORMATTER.format(new Date(`${value}T00:00:00`)) : '—'
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function Icon({ name, className = 'h-4 w-4' }) {
  const paths = {
    assignments: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5h6M8.5 11h7M8.5 15h4M16 15l1.5 1.5L20 14" />
      </>
    ),
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
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
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
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
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
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
      {paths[name] || null}
    </svg>
  )
}

function AssignmentDetailModal({ assignment, employee, job, onClose }) {
  if (!assignment) return null

  const assignmentTypeBadge =
    assignment.jenis_penugasan === 'mandiri' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/15">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        Diambil Mandiri oleh Pekerja
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/15">
        <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
        Ditetapkan Langsung oleh Admin
      </span>
    )

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="assignment-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <h2
              id="assignment-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              Detail Penugasan Kerja
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Informasi lengkap relasi penugasan teknisi dan proyek kerja.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            title="Tutup dialog"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4">
          {/* Status & ID */}
          <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
            <span className="font-mono text-xs font-semibold text-slate-500 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
              ID Penugasan: #{assignment.id_penugasan}
            </span>
            {assignmentTypeBadge}
          </div>

          {/* Karyawan */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Teknisi / Karyawan
            </span>
            <div className="mt-2 flex items-center gap-3">
              <AdminAvatar
                name={assignment.nama_karyawan || employee?.nama}
                className="h-10 w-10 text-xs font-bold shadow-sm"
              />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {assignment.nama_karyawan || employee?.nama || '—'}
                </p>
                <p className="text-xs text-slate-500">
                  {assignment.jabatan || employee?.jabatan || 'Teknisi'} · ID:{' '}
                  {assignment.id_karyawan}
                </p>
              </div>
            </div>
          </div>

          {/* Pekerjaan */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4 space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
              Proyek Pekerjaan Terkait
            </span>
            <p className="text-sm font-bold text-slate-900">
              {assignment.nama_pekerjaan || job?.nama_pekerjaan || '—'}
            </p>
            <p className="flex items-center gap-1.5 text-xs text-slate-600">
              <Icon name="location" className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{assignment.lokasi || job?.lokasi || 'Lokasi belum diatur'}</span>
            </p>
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60 text-xs">
              <div>
                <span className="text-slate-400 block">Tanggal Penugasan</span>
                <span className="font-semibold text-slate-700">
                  {formatDate(assignment.tanggal_penugasan)}
                </span>
              </div>
              <div>
                <span className="text-slate-400 block">Target Selesai</span>
                <span className="font-semibold text-slate-700">
                  {formatDate(assignment.target_selesai || job?.target_selesai)}
                </span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
            >
              Tutup
            </button>
          </div>
        </div>
      </section>
    </div>
  )
}

function Penugasan() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialJobFilter = searchParams.get('pekerjaan') || ''
  const initialEmpFilter = searchParams.get('karyawan') || ''

  const [store, setStore] = useState({
    assignments: [],
    employees: [],
    jobs: [],
    isLoading: true,
    isSaving: false,
    error: '',
  })
  const { assignments, employees, jobs, isLoading, isSaving, error } = store

  const [notice, setNotice] = useState(null)
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)
  const [loadingDetailId, setLoadingDetailId] = useState(null)

  // Filters & Pagination
  const [search, setSearch] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState(initialEmpFilter)
  const [jobFilter, setJobFilter] = useState(initialJobFilter)
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState('')
  const [page, setPage] = useState(1)
  const isMounted = useRef(false)

  useEffect(() => {
    if (searchParams.get('pekerjaan')) {
      setJobFilter(searchParams.get('pekerjaan'))
    }
    if (searchParams.get('karyawan')) {
      setEmployeeFilter(searchParams.get('karyawan'))
    }
  }, [searchParams])

  async function loadData() {
    try {
      const [loadedAssignments, loadedEmployees, loadedJobs] = await Promise.all([
        getPenugasan(),
        getKaryawan(),
        getPekerjaan(),
      ])

      if (isMounted.current) {
        setStore({
          assignments: loadedAssignments,
          employees: loadedEmployees,
          jobs: loadedJobs,
          isLoading: false,
          isSaving: false,
          error: '',
        })
      }
    } catch (loadError) {
      if (isMounted.current) {
        setStore((current) => ({
          ...current,
          isLoading: false,
          error: `Data penugasan tidak dapat dimuat: ${loadError.message}`,
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

  const employeeMap = useMemo(
    () => new Map(employees.map((e) => [e.id_karyawan, e])),
    [employees],
  )
  const jobMap = useMemo(
    () => new Map(jobs.map((j) => [j.id_pekerjaan, j])),
    [jobs],
  )

  function showToast(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return assignments.filter((assignment) => {
      const employee = employeeMap.get(assignment.id_karyawan)
      const job = jobMap.get(assignment.id_pekerjaan)

      const employeeName = (
        assignment.nama_karyawan ||
        employee?.nama ||
        ''
      ).toLocaleLowerCase('id-ID')
      const jobName = (
        assignment.nama_pekerjaan ||
        job?.nama_pekerjaan ||
        ''
      ).toLocaleLowerCase('id-ID')
      const location = (
        assignment.lokasi ||
        job?.lokasi ||
        ''
      ).toLocaleLowerCase('id-ID')

      const matchesSearch =
        !normalizedSearch ||
        employeeName.includes(normalizedSearch) ||
        jobName.includes(normalizedSearch) ||
        location.includes(normalizedSearch) ||
        String(assignment.id_penugasan).includes(normalizedSearch)

      const matchesEmployee =
        !employeeFilter || assignment.id_karyawan === Number(employeeFilter)
      const matchesJob =
        !jobFilter || assignment.id_pekerjaan === Number(jobFilter)
      const matchesMethod =
        !methodFilter || assignment.jenis_penugasan === methodFilter

      const jobStatus =
        assignment.status_pekerjaan || job?.status || 'belum_mulai'
      const matchesStatus = !statusFilter || jobStatus === statusFilter

      const deadline = assignment.target_selesai || job?.target_selesai || ''
      let matchesDeadline = true
      if (deadlineFilter === 'expired') {
        matchesDeadline =
          Boolean(deadline) && deadline < today && jobStatus !== 'selesai'
      } else if (deadlineFilter === 'active') {
        matchesDeadline =
          !deadline || deadline >= today || jobStatus === 'selesai'
      }

      return (
        matchesSearch &&
        matchesEmployee &&
        matchesJob &&
        matchesMethod &&
        matchesStatus &&
        matchesDeadline
      )
    })
  }, [
    assignments,
    deadlineFilter,
    employeeFilter,
    employeeMap,
    jobFilter,
    jobMap,
    methodFilter,
    search,
    statusFilter,
  ])

  const totalPages = Math.max(1, Math.ceil(filteredAssignments.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleAssignments = filteredAssignments.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const statistics = useMemo(() => {
    return {
      total: assignments.length,
      adminAssigned: assignments.filter((a) => a.jenis_penugasan === 'admin')
        .length,
      mandiriAssigned: assignments.filter((a) => a.jenis_penugasan === 'mandiri')
        .length,
      uniqueWorkers: new Set(assignments.map((a) => a.id_karyawan)).size,
    }
  }, [assignments])

  const hasActiveFilters = Boolean(
    search ||
      employeeFilter ||
      jobFilter ||
      methodFilter ||
      statusFilter ||
      deadlineFilter,
  )

  function resetFilters() {
    setSearch('')
    setEmployeeFilter('')
    setJobFilter('')
    setMethodFilter('')
    setStatusFilter('')
    setDeadlineFilter('')
    setPage(1)
  }

  async function handleCancelAssignment(assignment) {
    setStore((current) => ({ ...current, isSaving: true, error: '' }))
    try {
      await deletePenugasan(assignment.id_penugasan)
      window.dispatchEvent(new CustomEvent('penugasan_updated'))
      showToast('Penugasan berhasil dibatalkan.')
      setPendingCancel(null)
      await loadData()
    } catch (cancelError) {
      setStore((current) => ({ ...current, isSaving: false }))
      setPendingCancel(null)
      showToast(`Pembatalan gagal: ${cancelError.message}`, 'error')
    }
  }

  async function showAssignmentDetail(assignment) {
    setLoadingDetailId(assignment.id_penugasan)
    try {
      const detailed = await getPenugasanById(assignment.id_penugasan)
      setSelectedDetail({
        assignment: detailed,
        employee: employeeMap.get(detailed.id_karyawan),
        job: jobMap.get(detailed.id_pekerjaan),
      })
    } catch {
      setSelectedDetail({
        assignment,
        employee: employeeMap.get(assignment.id_karyawan),
        job: jobMap.get(assignment.id_pekerjaan),
      })
    } finally {
      setLoadingDetailId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* Header Halaman */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Penugasan</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Monitoring Data Penugasan
            </h1>
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {statistics.total} penugasan
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Pantau seluruh relasi penugasan kerja teknisi pada proyek perusahaan,
            metode penetapan tugas, dan tenggat waktu kerja.
          </p>
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
            <Icon
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
            <Icon name="close" className="h-3.5 w-3.5" />
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
            <Icon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
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

      {/* 4 Kartu Statistik Monitoring (Interaktif & Bisa Diklik) */}
      <section
        aria-label="Statistik Monitoring"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {[
          {
            label: 'Total Penugasan Aktif',
            value: statistics.total,
            methodKey: '',
            tone: 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10',
            activeClass: 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20',
            sub: 'Relasi kerja tercatat • Klik semua',
          },
          {
            label: 'Ditetapkan Admin',
            value: statistics.adminAssigned,
            methodKey: 'admin',
            tone: 'bg-sky-50 text-sky-600 ring-1 ring-sky-600/10',
            activeClass: 'border-2 border-sky-600 bg-sky-50/40 ring-2 ring-sky-600/20',
            sub: 'Penetapan langsung • Klik filter',
          },
          {
            label: 'Diambil Mandiri',
            value: statistics.mandiriAssigned,
            methodKey: 'mandiri',
            tone: 'bg-purple-50 text-purple-600 ring-1 ring-purple-600/10',
            activeClass: 'border-2 border-purple-600 bg-purple-50/40 ring-2 ring-purple-600/20',
            sub: 'Pekerjaan terbuka • Klik filter',
          },
          {
            label: 'Total Pekerja Terlibat',
            value: statistics.uniqueWorkers,
            methodKey: 'all_workers',
            tone: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
            activeClass: 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20',
            sub: 'Teknisi aktif di proyek',
          },
        ].map((stat) => {
          const isActive = stat.methodKey === '' ? methodFilter === '' : methodFilter === stat.methodKey

          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => {
                if (stat.methodKey === 'all_workers') {
                  resetFilters()
                } else {
                  setMethodFilter((curr) => (stat.methodKey === '' ? '' : curr === stat.methodKey ? '' : stat.methodKey))
                  setPage(1)
                }
              }}
              className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
                isActive && stat.methodKey !== 'all_workers'
                  ? stat.activeClass
                  : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
              }`}
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
                className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                  isActive && stat.methodKey !== 'all_workers' ? 'bg-slate-900 text-white shadow-xs' : stat.tone
                }`}
              >
                <Icon name="assignments" className="h-5 w-5" />
              </div>
            </button>
          )
        })}
      </section>

      {/* Toolbar Pencarian & Filter */}
      <section
        aria-label="Pencarian dan Filter"
        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Pencarian */}
          <div className="relative flex-1 min-w-[220px]">
            <Icon
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
              placeholder="Cari nama pekerja, proyek, atau lokasi..."
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
                <Icon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter & Reset */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Pekerja */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={employeeFilter}
                onChange={(e) => {
                  setEmployeeFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Pekerja</option>
                {employees.map((emp) => (
                  <option key={emp.id_karyawan} value={emp.id_karyawan}>
                    {emp.nama}
                  </option>
                ))}
              </select>
              <Icon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Metode */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Metode</option>
                <option value="admin">Ditetapkan Admin</option>
                <option value="mandiri">Diambil Mandiri</option>
              </select>
              <Icon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Status Proyek */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Status Proyek</option>
                <option value="belum_mulai">Belum Mulai</option>
                <option value="berjalan">Sedang Berjalan</option>
                <option value="selesai">Selesai</option>
              </select>
              <Icon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Reset Button */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Reset semua filter"
              >
                <Icon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabel Monitoring Penugasan */}
      <section
        aria-label="Tabel Data Penugasan"
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
                  Pekerja
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Pekerjaan Terkait
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Metode Penugasan
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Tgl Penugasan
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Target Selesai
                </th>
                <th className="px-4 py-3.5 text-center" scope="col">
                  Status
                </th>
                <th className="px-4 py-3.5 text-right w-28" scope="col">
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
                        Memuat data penugasan...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleAssignments.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <Icon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Data penugasan tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Coba sesuaikan kata pencarian atau atur ulang filter Anda.'
                        : 'Belum ada relasi penugasan aktif saat ini.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <Icon name="rotate-ccw" className="h-3.5 w-3.5" />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleAssignments.map((assignment, index) => {
                  const employee = employeeMap.get(assignment.id_karyawan)
                  const job = jobMap.get(assignment.id_pekerjaan)
                  const status =
                    assignment.status_pekerjaan || job?.status || 'belum_mulai'
                  const deadline =
                    assignment.target_selesai || job?.target_selesai
                  const today = getJakartaToday()
                  const isExpired =
                    Boolean(deadline) && deadline < today && status !== 'selesai'

                  return (
                    <tr
                      key={assignment.id_penugasan}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* No */}
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium text-slate-400">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* Pekerja */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={assignment.nama_karyawan || employee?.nama}
                            className="h-8 w-8 text-xs font-bold shadow-sm"
                          />
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                navigate(
                                  `/admin/karyawan?highlight=${assignment.id_karyawan}`,
                                )
                              }
                              className="text-left text-sm font-semibold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                              title="Buka data karyawan"
                            >
                              {assignment.nama_karyawan || employee?.nama}
                            </button>
                            <p className="text-[11px] text-slate-500">
                              {assignment.jabatan || employee?.jabatan || 'Teknisi'}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Pekerjaan Terkait */}
                      <td className="px-4 py-3 max-w-64">
                        <button
                          type="button"
                          onClick={() =>
                            navigate(
                              `/admin/pekerjaan?highlight=${assignment.id_pekerjaan}`,
                            )
                          }
                          className="truncate text-left text-sm font-semibold text-slate-900 hover:text-blue-600 transition cursor-pointer max-w-full block"
                          title="Buka detail proyek"
                        >
                          {assignment.nama_pekerjaan || job?.nama_pekerjaan}
                        </button>
                        <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                          <Icon name="location" className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">
                            {assignment.lokasi || job?.lokasi || 'Lokasi belum diatur'}
                          </span>
                        </p>
                      </td>

                      {/* Metode Penugasan */}
                      <td className="whitespace-nowrap px-4 py-3">
                        {assignment.jenis_penugasan === 'mandiri' ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                            Diambil Mandiri
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/15">
                            <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                            Ditetapkan Admin
                          </span>
                        )}
                      </td>

                      {/* Tgl Penugasan */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-600">
                        {formatDate(assignment.tanggal_penugasan)}
                      </td>

                      {/* Target Selesai */}
                      <td className="whitespace-nowrap px-4 py-3 text-xs">
                        <span className="font-semibold text-slate-800 block">
                          {formatDate(deadline)}
                        </span>
                        {isExpired && (
                          <span className="mt-0.5 inline-block text-[10px] font-bold text-rose-600">
                            Lewat Deadline
                          </span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        <span
                          className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            status === 'selesai'
                              ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20'
                              : status === 'berjalan'
                                ? 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20'
                                : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20'
                          }`}
                        >
                          {STATUS_LABELS[status] || status}
                        </span>
                      </td>

                      {/* Aksi */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => showAssignmentDetail(assignment)}
                            disabled={loadingDetailId === assignment.id_penugasan}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs disabled:opacity-50"
                            title="Lihat detail penugasan"
                            aria-label="Lihat detail penugasan"
                          >
                            <Icon name="eye" className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            onClick={() => setPendingCancel(assignment)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs"
                            title="Batalkan penugasan"
                            aria-label="Batalkan penugasan"
                          >
                            <Icon name="trash" className="h-4 w-4" />
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
              {filteredAssignments.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredAssignments.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredAssignments.length}
            </span>{' '}
            penugasan
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
              <Icon name="previous" className="h-3.5 w-3.5" />
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
              <Icon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Detail */}
      {selectedDetail && (
        <AssignmentDetailModal
          assignment={selectedDetail.assignment}
          employee={selectedDetail.employee}
          job={selectedDetail.job}
          onClose={() => setSelectedDetail(null)}
        />
      )}

      {/* Dialog Konfirmasi Batal Penugasan */}
      {pendingCancel && (
        <DeleteConfirmationDialog
          confirmLabel="Batalkan Penugasan"
          description="Anda yakin ingin membatalkan relasi penugasan ini? Pekerja tidak lagi ditugaskan pada pekerjaan tersebut."
          isProcessing={isSaving}
          itemName={`Penugasan: ${pendingCancel.nama_karyawan || 'Pekerja'} → ${pendingCancel.nama_pekerjaan || 'Proyek'}`}
          onCancel={() => setPendingCancel(null)}
          onConfirm={() => handleCancelAssignment(pendingCancel)}
        />
      )}
    </div>
  )
}

export default Penugasan
