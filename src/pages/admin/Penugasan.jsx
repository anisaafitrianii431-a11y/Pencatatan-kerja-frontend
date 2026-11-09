import { useEffect, useMemo, useRef, useState } from 'react'
import { STATUS_PEKERJAAN_OPTIONS } from '../../data/pekerjaan.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import {
  deletePenugasan,
  getPenugasan,
  getPenugasanById,
} from '../../services/penugasanApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'
import AdminPageBanner from '../../components/AdminPageBanner.jsx'
import ActionButtons from '../../components/ActionButtons.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 5

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

function Icon({ name, className = 'h-5 w-5' }) {
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

function WorkStatusBadge({ status }) {
  const colors = {
    belum_mulai: 'admin-status-pending bg-amber-100 text-amber-700 ring-amber-600/10',
    berjalan: 'admin-status-running bg-blue-50 text-blue-700 ring-blue-600/10',
    selesai: 'admin-status-complete bg-emerald-100 text-emerald-700 ring-emerald-600/10',
  }

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset ${colors[status] ?? 'bg-slate-100 text-slate-700'}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {STATUS_LABELS[status] ?? status}
    </span>
  )
}

function AssignmentSourceBadge({ type }) {
  if (type === 'mandiri') {
    return (
      <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/15">
        <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
        Diambil Mandiri
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/15">
      <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
      Ditetapkan Admin
    </span>
  )
}

function AssignmentDetailModal({ assignment, allAssignments, employees, jobs, onClose }) {
  const [activeTab, setActiveTab] = useState('detail') // 'detail' | 'job_team' | 'worker_jobs'

  const employee = useMemo(() => {
    return (
      employees.find((e) => e.id_karyawan === assignment.id_karyawan) || {
        nama: assignment.nama_karyawan || 'Karyawan',
        jabatan: assignment.jabatan || 'Pekerja',
        id_karyawan: assignment.id_karyawan,
      }
    )
  }, [assignment, employees])

  const job = useMemo(() => {
    return (
      jobs.find((j) => j.id_pekerjaan === assignment.id_pekerjaan) || {
        nama_pekerjaan: assignment.nama_pekerjaan || 'Pekerjaan',
        lokasi: assignment.lokasi || '—',
        tanggal_mulai: assignment.tanggal_mulai || '',
        target_selesai: assignment.target_selesai || '',
        status: assignment.status_pekerjaan || 'belum_mulai',
        id_pekerjaan: assignment.id_pekerjaan,
      }
    )
  }, [assignment, jobs])

  // Rekan kerja pada pekerjaan yang sama
  const teamMembers = useMemo(() => {
    return allAssignments
      .filter((a) => a.id_pekerjaan === assignment.id_pekerjaan)
      .map((a) => {
        const emp = employees.find((e) => e.id_karyawan === a.id_karyawan)
        return {
          id_penugasan: a.id_penugasan,
          id_karyawan: a.id_karyawan,
          nama: a.nama_karyawan || emp?.nama || 'Karyawan',
          jabatan: a.jabatan || emp?.jabatan || 'Pekerja',
          jenis_penugasan: a.jenis_penugasan,
          tanggal_penugasan: a.tanggal_penugasan,
          isCurrent: a.id_penugasan === assignment.id_penugasan,
        }
      })
  }, [allAssignments, assignment, employees])

  // Pekerjaan lain milik pekerja ini
  const workerOtherJobs = useMemo(() => {
    return allAssignments
      .filter((a) => a.id_karyawan === assignment.id_karyawan)
      .map((a) => {
        const j = jobs.find((item) => item.id_pekerjaan === a.id_pekerjaan)
        return {
          id_penugasan: a.id_penugasan,
          id_pekerjaan: a.id_pekerjaan,
          nama_pekerjaan: a.nama_pekerjaan || j?.nama_pekerjaan || 'Pekerjaan',
          lokasi: a.lokasi || j?.lokasi || '—',
          status: a.status_pekerjaan || j?.status || 'belum_mulai',
          target_selesai: a.target_selesai || j?.target_selesai || '',
          jenis_penugasan: a.jenis_penugasan,
          tanggal_penugasan: a.tanggal_penugasan,
          isCurrent: a.id_penugasan === assignment.id_penugasan,
        }
      })
  }, [allAssignments, assignment, jobs])

  const today = getJakartaToday()
  const isExpired =
    Boolean(job.target_selesai) &&
    job.target_selesai < today &&
    job.status !== 'selesai'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="assignment-detail-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl rounded-2xl bg-white shadow-2xl shadow-slate-950/20 overflow-hidden"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wide text-blue-600">
              Monitoring Penugasan
            </span>
            <h2 className="mt-0.5 text-lg font-bold text-slate-900" id="assignment-detail-title">
              Detail Hubungan Penugasan #{assignment.id_penugasan}
            </h2>
          </div>
          <button
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <Icon className="h-5 w-5" name="close" />
          </button>
        </div>

        {/* Tab Navigasi */}
        <div className="flex border-b border-slate-100 bg-slate-50/70 px-5 pt-2 sm:px-6 gap-2">
          <button
            className={`border-b-2 pb-2.5 px-3 text-xs font-semibold transition ${
              activeTab === 'detail'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('detail')}
            type="button"
          >
            Rincian Penugasan
          </button>
          <button
            className={`border-b-2 pb-2.5 px-3 text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'job_team'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('job_team')}
            type="button"
          >
            Pekerja dalam Pekerjaan Ini
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
              {teamMembers.length}
            </span>
          </button>
          <button
            className={`border-b-2 pb-2.5 px-3 text-xs font-semibold transition flex items-center gap-1.5 ${
              activeTab === 'worker_jobs'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
            onClick={() => setActiveTab('worker_jobs')}
            type="button"
          >
            Pekerjaan Milik Pekerja Ini
            <span className="rounded-full bg-slate-200 px-1.5 py-0.2 text-[10px] font-bold text-slate-700">
              {workerOtherJobs.length}
            </span>
          </button>
        </div>

        <div className="p-5 sm:p-6 max-h-[65vh] overflow-y-auto space-y-5">
          {activeTab === 'detail' && (
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pekerja</p>
                  <div className="mt-2 flex items-center gap-3">
                    <AdminAvatar className="h-10 w-10 text-xs" name={employee.nama} />
                    <div>
                      <p className="font-bold text-slate-900">{employee.nama}</p>
                      <p className="text-xs text-slate-500">
                        {employee.jabatan || 'Pekerja'} · ID Karyawan: {employee.id_karyawan}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Pekerjaan</p>
                  <p className="mt-2 font-bold text-slate-900">{job.nama_pekerjaan}</p>
                  <p className="text-xs text-slate-500">
                    Lokasi: {job.lokasi || '—'} · ID: {job.id_pekerjaan}
                  </p>
                  <div className="mt-2">
                    <WorkStatusBadge status={job.status} />
                  </div>
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Metode & Sumber Penugasan</p>
                  <div className="mt-1.5">
                    <AssignmentSourceBadge type={assignment.jenis_penugasan} />
                  </div>
                  <p className="mt-1 text-xs text-slate-500">
                    {assignment.jenis_penugasan === 'mandiri'
                      ? 'Diambil secara mandiri oleh pekerja dari menu Pekerjaan Tersedia.'
                      : 'Ditetapkan secara langsung oleh Admin pada form Data Pekerjaan.'}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Tanggal Penugasan / Pengambilan</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(assignment.tanggal_penugasan)}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    Waktu resmi terbentuknya hubungan kerja ini di sistem.
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Tanggal Mulai Pekerjaan</p>
                  <p className="mt-1 text-sm font-semibold text-slate-800">
                    {formatDate(job.tanggal_mulai)}
                  </p>
                </div>

                <div className="rounded-xl bg-slate-50 p-4">
                  <p className="text-xs font-medium text-slate-500">Batas Waktu (Deadline)</p>
                  <div className="mt-1 flex items-center gap-2">
                    <span className="text-sm font-semibold text-slate-800">
                      {formatDate(job.target_selesai)}
                    </span>
                    {isExpired && (
                      <span className="rounded-full bg-rose-100 px-2 py-0.5 text-[11px] font-semibold text-rose-700">
                        Melewati Deadline
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'job_team' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Seluruh pekerja yang terhubung dengan pekerjaan <strong className="text-slate-800">{job.nama_pekerjaan}</strong>:
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {teamMembers.map((member) => (
                  <div
                    className={`flex items-center justify-between p-3.5 ${
                      member.isCurrent ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                    key={member.id_penugasan}
                  >
                    <div className="flex items-center gap-3">
                      <AdminAvatar className="h-8 w-8 text-[10px]" name={member.nama} />
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-sm font-semibold text-slate-900">{member.nama}</p>
                          {member.isCurrent && (
                            <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                              Baris Ini
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500">
                          {member.jabatan} · ID: {member.id_karyawan}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <AssignmentSourceBadge type={member.jenis_penugasan} />
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(member.tanggal_penugasan)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'worker_jobs' && (
            <div className="space-y-3">
              <p className="text-xs text-slate-500">
                Seluruh penugasan yang sedang atau pernah diemban oleh <strong className="text-slate-800">{employee.nama}</strong>:
              </p>
              <div className="divide-y divide-slate-100 rounded-xl border border-slate-200">
                {workerOtherJobs.map((item) => (
                  <div
                    className={`flex items-center justify-between p-3.5 ${
                      item.isCurrent ? 'bg-blue-50/50' : 'bg-white'
                    }`}
                    key={item.id_penugasan}
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-semibold text-slate-900">{item.nama_pekerjaan}</p>
                        {item.isCurrent && (
                          <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[10px] font-bold text-blue-700">
                            Baris Ini
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500">
                        Lokasi: {item.lokasi} · Deadline: {formatDate(item.target_selesai)}
                      </p>
                    </div>
                    <div className="text-right flex flex-col items-end gap-1">
                      <WorkStatusBadge status={item.status} />
                      <AssignmentSourceBadge type={item.jenis_penugasan} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
          <button
            className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
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

function Penugasan() {
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
  const [detailAssignment, setDetailAssignment] = useState(null)
  const [pendingCancel, setPendingCancel] = useState(null)

  // Filters
  const [search, setSearch] = useState('')
  const [employeeFilter, setEmployeeFilter] = useState('')
  const [jobFilter, setJobFilter] = useState('')
  const [methodFilter, setMethodFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [deadlineFilter, setDeadlineFilter] = useState('')
  const [page, setPage] = useState(1)

  const toastTimer = useRef(null)
  const isMounted = useRef(false)

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
      if (toastTimer.current) window.clearTimeout(toastTimer.current)
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

  const filteredAssignments = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return assignments.filter((assignment) => {
      const employee = employeeMap.get(assignment.id_karyawan)
      const job = jobMap.get(assignment.id_pekerjaan)

      const employeeName = (assignment.nama_karyawan || employee?.nama || '').toLocaleLowerCase('id-ID')
      const jobName = (assignment.nama_pekerjaan || job?.nama_pekerjaan || '').toLocaleLowerCase('id-ID')
      const location = (assignment.lokasi || job?.lokasi || '').toLocaleLowerCase('id-ID')

      const matchesSearch =
        !normalizedSearch ||
        employeeName.includes(normalizedSearch) ||
        jobName.includes(normalizedSearch) ||
        location.includes(normalizedSearch)

      const matchesEmployee = !employeeFilter || assignment.id_karyawan === Number(employeeFilter)
      const matchesJob = !jobFilter || assignment.id_pekerjaan === Number(jobFilter)
      const matchesMethod = !methodFilter || assignment.jenis_penugasan === methodFilter

      const jobStatus = assignment.status_pekerjaan || job?.status || 'belum_mulai'
      const matchesStatus = !statusFilter || jobStatus === statusFilter

      const deadline = assignment.target_selesai || job?.target_selesai || ''
      let matchesDeadline = true
      if (deadlineFilter === 'expired') {
        matchesDeadline = Boolean(deadline) && deadline < today && jobStatus !== 'selesai'
      } else if (deadlineFilter === 'active') {
        matchesDeadline = !deadline || deadline >= today || jobStatus === 'selesai'
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
    const today = getJakartaToday()
    return {
      total: assignments.length,
      adminAssigned: assignments.filter((a) => a.jenis_penugasan === 'admin').length,
      mandiriAssigned: assignments.filter((a) => a.jenis_penugasan === 'mandiri').length,
      uniqueWorkers: new Set(assignments.map((a) => a.id_karyawan)).size,
      expired: assignments.filter((a) => {
        const j = jobMap.get(a.id_pekerjaan)
        const deadline = a.target_selesai || j?.target_selesai || ''
        const status = a.status_pekerjaan || j?.status || ''
        return Boolean(deadline) && deadline < today && status !== 'selesai'
      }).length,
    }
  }, [assignments, jobMap])

  function showToast(message, type = 'success') {
    setNotice({ message, type })
    if (toastTimer.current) window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setNotice(null), 4000)
  }

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
      showToast('Penugasan berhasil dibatalkan.')
      setPendingCancel(null)
      await loadData()
    } catch (cancelError) {
      setStore((current) => ({ ...current, isSaving: false }))
      setPendingCancel(null)
      showToast(`Pembatalan gagal: ${cancelError.message}`, 'error')
    }
  }

  return (
    <div className="admin-management-page admin-management-assignments mx-auto w-full max-w-[1440px] space-y-6">
      <AdminPageBanner
        description="Pusat monitoring seluruh hubungan penugasan karyawan dan pekerjaan yang terbentuk dari penetapan Admin maupun pengambilan mandiri oleh pekerja."
        icon={<Icon className="h-6 w-6" name="assignments" />}
        title="Monitoring Data Penugasan"
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

      {/* STATISTIK MONITORING */}
      <div className="admin-stat-grid grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: 'Total Penugasan Aktif',
            value: statistics.total,
            icon: 'assignments',
            color: 'bg-blue-50 text-blue-600',
          },
          {
            label: 'Ditetapkan Admin',
            value: statistics.adminAssigned,
            icon: 'people',
            color: 'bg-sky-50 text-sky-600',
          },
          {
            label: 'Diambil Mandiri',
            value: statistics.mandiriAssigned,
            icon: 'work',
            color: 'bg-purple-50 text-purple-600',
          },
          {
            label: 'Total Pekerja Terlibat',
            value: statistics.uniqueWorkers,
            icon: 'people',
            color: 'bg-emerald-50 text-emerald-600',
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
                  <div className="mt-2 h-9 w-12 animate-pulse rounded-lg bg-slate-100" />
                ) : (
                  <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                    {stat.value}
                  </p>
                )}
              </div>
              <span className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}>
                <Icon className="h-6 w-6" name={stat.icon} />
              </span>
            </div>
          </article>
        ))}
      </div>

      {/* TABEL MONITORING & FILTER */}
      <section className="admin-data-table overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:p-5">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-slate-900">Daftar Penugasan dan Relasi Pekerja</h3>
              <p className="mt-1 text-sm text-slate-500">
                {isLoading
                  ? 'Memuat data penugasan...'
                  : `${filteredAssignments.length} relasi penugasan ditemukan`}
              </p>
            </div>
          </div>

          {/* Baris Filter Lengkap */}
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {/* Search */}
            <label className="relative block xl:col-span-2">
              <span className="sr-only">Cari pekerja / pekerjaan</span>
              <Icon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="search"
              />
              <input
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Cari pekerja / pekerjaan / lokasi..."
                value={search}
              />
            </label>

            {/* Filter Pekerja */}
            <label className="relative block">
              <span className="sr-only">Filter pekerja</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(e) => {
                  setEmployeeFilter(e.target.value)
                  setPage(1)
                }}
                value={employeeFilter}
              >
                <option value="">Semua Pekerja</option>
                {employees.map((emp) => (
                  <option key={emp.id_karyawan} value={emp.id_karyawan}>
                    {emp.nama}
                  </option>
                ))}
              </select>
              <Icon
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>

            {/* Filter Pekerjaan */}
            <label className="relative block">
              <span className="sr-only">Filter pekerjaan</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(e) => {
                  setJobFilter(e.target.value)
                  setPage(1)
                }}
                value={jobFilter}
              >
                <option value="">Semua Pekerjaan</option>
                {jobs.map((job) => (
                  <option key={job.id_pekerjaan} value={job.id_pekerjaan}>
                    {job.nama_pekerjaan}
                  </option>
                ))}
              </select>
              <Icon
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>

            {/* Filter Metode */}
            <label className="relative block">
              <span className="sr-only">Filter metode</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setPage(1)
                }}
                value={methodFilter}
              >
                <option value="">Semua Metode</option>
                <option value="admin">Ditetapkan Admin</option>
                <option value="mandiri">Diambil Mandiri</option>
              </select>
              <Icon
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>

            {/* Filter Status */}
            <label className="relative block">
              <span className="sr-only">Filter status</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-8 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                value={statusFilter}
              >
                <option value="">Semua Status</option>
                {STATUS_PEKERJAAN_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
              <Icon
                className="pointer-events-none absolute right-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
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
            <span className="sr-only">Memuat daftar penugasan</span>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1080px] text-left text-sm">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-3.5" scope="col">
                      No.
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Pekerja
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Pekerjaan
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Metode
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Tgl Penugasan
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Deadline
                    </th>
                    <th className="px-5 py-3.5" scope="col">
                      Status Pekerjaan
                    </th>
                    <th className="px-5 py-3.5 text-right" scope="col">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visibleAssignments.map((assignment, index) => {
                    const employee = employeeMap.get(assignment.id_karyawan)
                    const job = jobMap.get(assignment.id_pekerjaan)
                    const employeeName =
                      assignment.nama_karyawan || employee?.nama || 'Karyawan'
                    const jobName =
                      assignment.nama_pekerjaan || job?.nama_pekerjaan || 'Pekerjaan'
                    const deadline = assignment.target_selesai || job?.target_selesai || ''
                    const jobStatus = assignment.status_pekerjaan || job?.status || 'belum_mulai'
                    const today = getJakartaToday()
                    const isExpired =
                      Boolean(deadline) && deadline < today && jobStatus !== 'selesai'

                    return (
                      <tr
                        className="transition hover:bg-slate-50/80"
                        key={assignment.id_penugasan}
                      >
                        <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                          {(currentPage - 1) * PAGE_SIZE + index + 1}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <div className="flex items-center gap-3">
                            <AdminAvatar className="h-9 w-9 text-[11px]" name={employeeName} />
                            <span className="min-w-0">
                              <span className="block font-semibold text-slate-800">
                                {employeeName}
                              </span>
                              <span className="block text-xs text-slate-400">
                                {assignment.jabatan || employee?.jabatan || 'Pekerja'} · ID: {assignment.id_karyawan}
                              </span>
                            </span>
                          </div>
                        </td>
                        <td className="max-w-64 px-5 py-4">
                          <p className="font-semibold text-slate-800 truncate">{jobName}</p>
                          <span className="flex items-center gap-1 text-xs text-slate-400 truncate">
                            <Icon className="h-3.5 w-3.5 shrink-0" name="location" />
                            {assignment.lokasi || job?.lokasi || '—'}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <AssignmentSourceBadge type={assignment.jenis_penugasan} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                          {formatDate(assignment.tanggal_penugasan)}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <span className="text-slate-700 font-medium block">
                            {formatDate(deadline)}
                          </span>
                          {isExpired && (
                            <span className="text-[11px] font-semibold text-rose-600">
                              Melewati Deadline
                            </span>
                          )}
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <WorkStatusBadge status={jobStatus} />
                        </td>
                        <td className="whitespace-nowrap px-5 py-4">
                          <ActionButtons
                            actions={[
                              {
                                type: 'view',
                                label: `Lihat detail penugasan`,
                                onClick: () => setDetailAssignment(assignment),
                                title: `Lihat detail penugasan`,
                              },
                              {
                                type: 'delete',
                                label: `Batalkan penugasan`,
                                onClick: () => setPendingCancel(assignment),
                                title: `Batalkan penugasan`,
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    )
                  })}
                  {visibleAssignments.length === 0 && (
                    <tr>
                      <td className="px-5 py-14 text-center" colSpan="8">
                        <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                          <Icon className="h-6 w-6" name="search" />
                        </span>
                        <p className="mt-3 font-semibold text-slate-700">
                          {assignments.length === 0
                            ? 'Belum ada data penugasan'
                            : 'Penugasan tidak ditemukan'}
                        </p>
                        <p className="mt-1 text-sm text-slate-500">
                          {assignments.length === 0
                            ? 'Penugasan akan otomatis tercatat ketika Admin menetapkan pekerja di menu Data Pekerjaan atau saat pekerja mengambil pekerjaan terbuka.'
                            : 'Coba ubah kata pencarian atau bersihkan filter.'}
                        </p>
                        {(search || employeeFilter || jobFilter || methodFilter || statusFilter) && (
                          <button
                            className="mt-4 rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                            onClick={resetFilters}
                            type="button"
                          >
                            Reset Filter
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
              <p className="text-sm text-slate-500">
                Menampilkan{' '}
                <span className="font-medium text-slate-700">
                  {filteredAssignments.length === 0
                    ? 0
                    : (currentPage - 1) * PAGE_SIZE + 1}
                  –{Math.min(currentPage * PAGE_SIZE, filteredAssignments.length)}
                </span>{' '}
                dari {filteredAssignments.length} penugasan
              </p>
              <div className="flex items-center justify-between gap-2 sm:justify-end">
                <button
                  aria-label="Halaman sebelumnya"
                  className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
                  disabled={currentPage <= 1}
                  onClick={() => setPage(currentPage - 1)}
                  type="button"
                >
                  <Icon className="h-4 w-4" name="previous" />
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
                  <Icon className="h-4 w-4" name="next" />
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {/* DETAIL MODAL */}
      {detailAssignment && (
        <AssignmentDetailModal
          allAssignments={assignments}
          assignment={detailAssignment}
          employees={employees}
          jobs={jobs}
          onClose={() => setDetailAssignment(null)}
        />
      )}

      {/* CONFIRM BATALKAN PENUGASAN */}
      {pendingCancel && (
        <DeleteConfirmationDialog
          confirmButtonText="Ya, Batalkan Penugasan"
          description={`Anda yakin ingin membatalkan penugasan untuk "${employeeMap.get(pendingCancel.id_karyawan)?.nama ?? 'Karyawan'}" pada pekerjaan "${jobMap.get(pendingCancel.id_pekerjaan)?.nama_pekerjaan ?? 'Pekerjaan'}"? Sistem akan memeriksa relasi absensi dan pengeluaran terlebih dahulu.`}
          isProcessing={isSaving}
          itemName={`Penugasan #${pendingCancel.id_penugasan}`}
          onCancel={() => setPendingCancel(null)}
          onConfirm={() => handleCancelAssignment(pendingCancel)}
          title="Konfirmasi Pembatalan Penugasan"
        />
      )}
    </div>
  )
}

export default Penugasan
