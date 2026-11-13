import { useEffect, useMemo, useState } from 'react'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import { getAbsensi, verifikasiAbsensi } from '../../services/absensiApi.js'
import { getFileUrl } from '../../services/api.js'
import { formatWeekdayAndDate, resolveAttendanceLocation, safeFormatDate } from '../../utils/geoLocation.js'
import AbsensiInspectionDialog from '../../components/AbsensiInspectionDialog.jsx'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatDate(value) {
  return safeFormatDate(value, DATE_FORMATTER)
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    history: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    cross: <path d="m18 6-12 12M6 6l12 12" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    filter: (
      <>
        <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
        <circle cx="12" cy="10" r="3" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="4" width="18" height="18" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
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
      {paths[name] ?? null}
    </svg>
  )
}

function StatusBadge({ status }) {
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Disetujui
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Ditolak
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Menunggu
    </span>
  )
}

function JobStatusBadge({ status }) {
  if (status === 'berjalan') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-blue-500" />
        Berjalan
      </span>
    )
  }
  if (status === 'selesai') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Selesai
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
      Belum Mulai
    </span>
  )
}

export default function RekapAbsensiAdmin() {
  const [activeTab, setActiveTab] = useState('operasional') // 'operasional' | 'kehadiran' | 'riwayat'

  // Data states
  const [employees, setEmployees] = useState([])
  const [jobs, setJobs] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendances, setAttendances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Filters for Riwayat
  const [searchWorker, setSearchWorker] = useState('')
  const [filterJobId, setFilterJobId] = useState('')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  // Filters for Kehadiran
  const [kehadiranDate, setKehadiranDate] = useState('')
  const [kehadiranWorkerId, setKehadiranWorkerId] = useState('')

  // Detail Modal
  const [selectedAttendance, setSelectedAttendance] = useState(null)

  const loadAllData = async () => {
    setIsLoading(true)
    try {
      const [empData, jobData, assignData, attData] = await Promise.all([
        getKaryawan(),
        getPekerjaan(),
        getPenugasan(),
        getAbsensi(),
      ])
      setEmployees(empData || [])
      setJobs(jobData || [])
      setAssignments(assignData || [])
      setAttendances(attData || [])
    } catch (err) {
      console.error('Gagal memuat data rekap absensi admin:', err)
      setNotification({ type: 'error', message: 'Gagal menyinkronkan data dengan database.' })
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAllData()
  }, [])

  const showNotice = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleVerify = async (id_absensi, status, catatanAdmin = '') => {
    try {
      await verifikasiAbsensi(id_absensi, status, catatanAdmin)
      showNotice('success', `Status absensi berhasil diubah menjadi "${status}".`)
      setAttendances((prev) =>
        prev.map((item) =>
          item.id_absensi === id_absensi
            ? {
                ...item,
                status_verifikasi: status,
                catatan_admin: catatanAdmin !== '' ? catatanAdmin : item.catatan_admin,
              }
            : item,
        ),
      )
      setSelectedAttendance((prev) =>
        prev && prev.id_absensi === id_absensi
          ? {
              ...prev,
              status_verifikasi: status,
              catatan_admin: catatanAdmin !== '' ? catatanAdmin : prev.catatan_admin,
            }
          : prev,
      )
    } catch (err) {
      showNotice('error', err.message || 'Gagal mengubah status verifikasi.')
    }
  }

  // Map jobs with assigned workers and attendance count
  const operationalData = useMemo(() => {
    return jobs.map((job) => {
      const jobAssignments = assignments.filter((a) => a.id_pekerjaan === job.id_pekerjaan)
      const assignedWorkerIds = new Set(jobAssignments.map((a) => a.id_karyawan))
      const assignedWorkers = employees.filter((e) => assignedWorkerIds.has(e.id_karyawan))

      const jobAttendances = attendances.filter((att) => att.id_pekerjaan === job.id_pekerjaan)
      const totalMenit = jobAttendances.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0)
      const jam = Math.floor(totalMenit / 60)
      const menit = totalMenit % 60

      return {
        ...job,
        workers: assignedWorkers,
        totalWorkers: assignedWorkers.length,
        totalSessions: jobAttendances.length,
        totalDurasiLabel: `${jam}j ${menit}m`,
      }
    })
  }, [jobs, assignments, employees, attendances])

  // Filtered attendance for Riwayat
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      if (searchWorker) {
        const query = searchWorker.toLowerCase().trim()
        const worker = employees.find((e) => e.id_karyawan === att.id_karyawan)
        const matchName = worker?.nama?.toLowerCase().includes(query)
        const matchId = String(att.id_karyawan).includes(query)
        if (!matchName && !matchId) return false
      }
      if (filterJobId && String(att.id_pekerjaan) !== String(filterJobId)) {
        return false
      }
      if (filterDate && att.tanggal !== filterDate) {
        return false
      }
      if (filterStatus && att.status_verifikasi !== filterStatus) {
        return false
      }
      return true
    })
  }, [attendances, searchWorker, filterJobId, filterDate, filterStatus, employees])

  // Statistics for Kehadiran
  const kehadiranStats = useMemo(() => {
    let dataset = attendances

    if (kehadiranDate) {
      dataset = dataset.filter((a) => a.tanggal === kehadiranDate)
    }
    if (kehadiranWorkerId) {
      dataset = dataset.filter((a) => String(a.id_karyawan) === String(kehadiranWorkerId))
    }

    // Unique employees present
    const presentWorkerIds = new Set(dataset.map((a) => a.id_karyawan))
    const totalPresent = presentWorkerIds.size
    const totalEmployeesCount = employees.length
    const totalAbsent = Math.max(0, totalEmployeesCount - totalPresent)

    const waiting = dataset.filter((a) => a.status_verifikasi === 'menunggu').length
    const approved = dataset.filter((a) => a.status_verifikasi === 'disetujui').length
    const rejected = dataset.filter((a) => a.status_verifikasi === 'ditolak').length
    const totalSessions = dataset.length

    const approvalRate = totalSessions > 0 ? Math.round((approved / totalSessions) * 100) : 0

    return {
      totalEmployeesCount,
      totalPresent,
      totalAbsent,
      waiting,
      approved,
      rejected,
      totalSessions,
      approvalRate,
      presentWorkerIds,
    }
  }, [attendances, employees, kehadiranDate, kehadiranWorkerId])

  return (
    <div className="admin-theme min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Admin</span>
            <span>/</span>
            <span className="text-blue-600">Rekap Absensi</span>
          </nav>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Rekap Absensi Karyawan
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Pantau operasional pekerjaan, ringkasan kehadiran seluruh tim, dan riwayat verifikasi absensi.
              </p>
            </div>
            <button
              onClick={loadAllData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
            >
              <Icon name="refresh" className={`h-4 w-4 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan Data
            </button>
          </div>
        </div>

        {/* Notification Alert */}
        {notification && (
          <div
            className={`mb-6 flex items-center justify-between rounded-xl px-4 py-3 text-sm font-medium shadow-sm ${
              notification.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                : 'bg-rose-50 text-rose-800 border border-rose-200'
            }`}
          >
            <span>{notification.message}</span>
            <button onClick={() => setNotification(null)} className="text-slate-400 hover:text-slate-600">
              <Icon name="cross" className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Tab Navigation Navigation (Single Menu with 3 Subsections) */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('operasional')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'operasional'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="briefcase" className="h-4 w-4" />
              <span>A. Operasional</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {jobs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kehadiran')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'kehadiran'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="users" className="h-4 w-4" />
              <span>B. Kehadiran</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {employees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'riwayat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="history" className="h-4 w-4" />
              <span>C. Riwayat Absensi</span>
              <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                {attendances.length}
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUBSECTION A: OPERASIONAL */}
        {/* ============================================================== */}
        {activeTab === 'operasional' && (
          <div className="space-y-6">
            {/* Stat Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Proyek</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{jobs.length}</p>
                <p className="mt-1 text-xs text-blue-600 font-medium">Tercatat di sistem</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Pekerjaan Berjalan</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {jobs.filter((j) => j.status === 'berjalan').length}
                </p>
                <p className="mt-1 text-xs text-slate-500">Sedang aktif di lapangan</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Penugasan</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{assignments.length}</p>
                <p className="mt-1 text-xs text-slate-500">Pekerja terhubung tugas</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Sesi Kerja</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{attendances.length}</p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">Rekaman kehadiran</p>
              </div>
            </div>

            {/* List of Operational Jobs */}
            <div className="rounded-2xl border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="border-b border-slate-100 px-6 py-4">
                <h3 className="text-base font-bold text-slate-900">Pemantauan Operasional Proyek Lapangan</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Daftar seluruh pekerjaan yang sedang dan telah berjalan beserta jumlah pekerja & sesi absensi tercatat.
                </p>
              </div>

              <div className="divide-y divide-slate-100">
                {operationalData.length === 0 ? (
                  <div className="p-8 text-center text-sm text-slate-500">
                    Belum ada data pekerjaan di database.
                  </div>
                ) : (
                  operationalData.map((job) => (
                    <div key={job.id_pekerjaan} className="p-5 transition hover:bg-slate-50/70">
                      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-900">{job.nama_pekerjaan}</span>
                            <JobStatusBadge status={job.status} />
                          </div>
                          <p className="flex items-center gap-1.5 text-xs text-slate-500">
                            <Icon name="location" className="h-3.5 w-3.5 text-slate-400" />
                            <span>{job.lokasi || 'Lokasi belum ditentukan'}</span>
                            <span className="mx-1">•</span>
                            <Icon name="calendar" className="h-3.5 w-3.5 text-slate-400" />
                            <span>Mulai: {formatDate(job.tanggal_mulai)}</span>
                            <span>– Target: {formatDate(job.target_selesai)}</span>
                          </p>
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-xs text-slate-600">
                          <div className="text-right">
                            <span className="font-semibold text-slate-900 block text-sm">
                              {job.totalWorkers} Pekerja
                            </span>
                            <span className="text-slate-400">Tim ditugaskan</span>
                          </div>

                          <div className="text-right">
                            <span className="font-semibold text-blue-600 block text-sm">
                              {job.totalSessions} Sesi
                            </span>
                            <span className="text-slate-400">Absensi tercatat</span>
                          </div>

                          <div className="text-right">
                            <span className="font-semibold text-emerald-600 block text-sm">
                              {job.totalDurasiLabel}
                            </span>
                            <span className="text-slate-400">Total durasi kerja</span>
                          </div>
                        </div>
                      </div>

                      {/* Assigned Workers Avatars preview */}
                      {job.workers.length > 0 && (
                        <div className="mt-3 flex items-center gap-2 pt-2 border-t border-slate-50 text-xs text-slate-500">
                          <span className="font-medium text-slate-600">Pekerja terlibat:</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            {job.workers.map((w) => (
                              <span
                                key={w.id_karyawan}
                                className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-slate-700"
                              >
                                <span className="font-semibold text-blue-600">{w.nama}</span>
                                <span className="text-[10px] text-slate-400">({w.jabatan || 'Staff'})</span>
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION B: KEHADIRAN */}
        {/* ============================================================== */}
        {activeTab === 'kehadiran' && (
          <div className="space-y-6">
            {/* Filter Bar for Kehadiran */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-blue-600" />
                  <label htmlFor="filter-kehadiran-date" className="text-xs font-semibold text-slate-700">
                    Filter Tanggal:
                  </label>
                  <input
                    id="filter-kehadiran-date"
                    type="date"
                    value={kehadiranDate}
                    onChange={(e) => setKehadiranDate(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="users" className="h-4 w-4 text-blue-600" />
                  <label htmlFor="filter-kehadiran-worker" className="text-xs font-semibold text-slate-700">
                    Karyawan:
                  </label>
                  <select
                    id="filter-kehadiran-worker"
                    value={kehadiranWorkerId}
                    onChange={(e) => setKehadiranWorkerId(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                  >
                    <option value="">Semua Karyawan</option>
                    {employees.map((emp) => (
                      <option key={emp.id_karyawan} value={emp.id_karyawan}>
                        {emp.nama} ({emp.jabatan || 'Staff'})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {(kehadiranDate || kehadiranWorkerId) && (
                <button
                  type="button"
                  onClick={() => {
                    setKehadiranDate('')
                    setKehadiranWorkerId('')
                  }}
                  className="text-xs font-semibold text-blue-600 hover:text-blue-800"
                >
                  Reset Filter Kehadiran
                </button>
              )}
            </div>

            {/* 6 Metric Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Karyawan</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{kehadiranStats.totalEmployeesCount}</p>
                <p className="mt-1 text-[11px] text-slate-400">Terdaftar di database</p>
              </div>

              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-800">Karyawan Hadir</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{kehadiranStats.totalPresent}</p>
                <p className="mt-1 text-[11px] text-emerald-600">Dihitung unik tanpa dobel</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-800">Belum Absen</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{kehadiranStats.totalAbsent}</p>
                <p className="mt-1 text-[11px] text-amber-600">Belum ada sesi hari ini</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-600">Menunggu Review</p>
                <p className="mt-2 text-2xl font-bold text-amber-600">{kehadiranStats.waiting}</p>
                <p className="mt-1 text-[11px] text-slate-400">Perlu verifikasi admin</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-600">Sesi Disetujui</p>
                <p className="mt-2 text-2xl font-bold text-emerald-600">{kehadiranStats.approved}</p>
                <p className="mt-1 text-[11px] text-slate-400">Absensi valid & terdata</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-rose-600">Sesi Ditolak</p>
                <p className="mt-2 text-2xl font-bold text-rose-600">{kehadiranStats.rejected}</p>
                <p className="mt-1 text-[11px] text-slate-400">Tidak memenuhi syarat</p>
              </div>
            </div>

            {/* Attendance & Verification Breakdown Cards */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Verification Progress Ring / Chart */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Rasio Status Verifikasi Absensi</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Persentase persetujuan kehadiran berdasarkan data absensi yang terpilih.
                </p>

                <div className="mt-6 flex flex-col items-center justify-around gap-6 sm:flex-row">
                  <div className="relative flex h-32 w-32 items-center justify-center rounded-full border-8 border-emerald-500 bg-slate-50 shadow-inner">
                    <div className="text-center">
                      <span className="text-2xl font-extrabold text-slate-900">{kehadiranStats.approvalRate}%</span>
                      <span className="block text-[10px] font-semibold text-emerald-600">Disetujui</span>
                    </div>
                  </div>

                  <div className="space-y-3 text-xs w-full sm:w-1/2">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
                        Disetujui
                      </span>
                      <span className="font-bold text-slate-900">{kehadiranStats.approved} sesi</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-amber-500" />
                        Menunggu Verifikasi
                      </span>
                      <span className="font-bold text-slate-900">{kehadiranStats.waiting} sesi</span>
                    </div>

                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="flex items-center gap-2 text-slate-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-rose-500" />
                        Ditolak
                      </span>
                      <span className="font-bold text-slate-900">{kehadiranStats.rejected} sesi</span>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <span className="font-semibold text-slate-700">Total Sesi Kerja</span>
                      <span className="font-bold text-blue-600">{kehadiranStats.totalSessions} sesi</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Attendance Status Per Employee */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Daftar Kehadiran Karyawan</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Status presensi karyawan secara individu ({kehadiranDate ? formatDate(kehadiranDate) : 'Kumulatif'}).
                  </p>

                  <div className="mt-4 max-h-60 space-y-2 overflow-y-auto pr-1">
                    {employees.map((emp) => {
                      const isPresent = kehadiranStats.presentWorkerIds.has(emp.id_karyawan)
                      return (
                        <div
                          key={emp.id_karyawan}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-2.5 text-xs transition hover:bg-slate-50"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                              {emp.nama.charAt(0)}
                            </span>
                            <div>
                              <p className="font-semibold text-slate-900">{emp.nama}</p>
                              <p className="text-[10px] text-slate-400">{emp.jabatan || 'Teknisi'}</p>
                            </div>
                          </div>

                          <span
                            className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                              isPresent
                                ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {isPresent ? '● Hadir' : '○ Belum Absen'}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION C: RIWAYAT ABSENSI */}
        {/* ============================================================== */}
        {activeTab === 'riwayat' && (
          <div className="space-y-6">
            {/* Filter Toolbar Single Line */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:flex lg:flex-wrap lg:items-center">
                {/* Search */}
                <div className="relative min-w-[200px]">
                  <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={searchWorker}
                    onChange={(e) => setSearchWorker(e.target.value)}
                    placeholder="Cari nama / ID karyawan..."
                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filter Project */}
                <select
                  value={filterJobId}
                  onChange={(e) => setFilterJobId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Pekerjaan</option>
                  {jobs.map((job) => (
                    <option key={job.id_pekerjaan} value={job.id_pekerjaan}>
                      {job.nama_pekerjaan}
                    </option>
                  ))}
                </select>

                {/* Filter Status */}
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Status Verifikasi</option>
                  <option value="menunggu">Menunggu</option>
                  <option value="disetujui">Disetujui</option>
                  <option value="ditolak">Ditolak</option>
                </select>

                {/* Filter Date */}
                <input
                  type="date"
                  value={filterDate}
                  onChange={(e) => setFilterDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                />
              </div>

              {(searchWorker || filterJobId || filterDate || filterStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setSearchWorker('')
                    setFilterJobId('')
                    setFilterDate('')
                    setFilterStatus('')
                  }}
                  className="self-start text-xs font-semibold text-blue-600 hover:text-blue-800 lg:self-auto"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Attendance Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">No.</th>
                      <th className="px-4 py-3.5">Karyawan</th>
                      <th className="px-4 py-3.5">ID</th>
                      <th className="px-4 py-3.5">Pekerjaan</th>
                      <th className="px-4 py-3.5">Hari &amp; Tanggal</th>
                      <th className="px-4 py-3.5">Jam Masuk</th>
                      <th className="px-4 py-3.5">Jam Pulang</th>
                      <th className="px-4 py-3.5">Durasi</th>
                      <th className="px-4 py-3.5">Foto &amp; Titik Lokasi</th>
                      <th className="px-4 py-3.5">Status</th>
                      <th className="px-4 py-3.5 text-center">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={11} className="py-8 text-center text-slate-400">
                          Tidak ditemukan riwayat absensi yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendances.map((item, index) => {
                        const emp = employees.find((e) => e.id_karyawan === item.id_karyawan)
                        const job = jobs.find((j) => j.id_pekerjaan === item.id_pekerjaan)
                        const loc = resolveAttendanceLocation(item, job?.titik_lokasi || '')
                        const fotoMasukUrl = item.foto_lokasi ? getFileUrl(item.foto_lokasi) : ''
                        const fotoPulangUrl = item.foto_pulang ? getFileUrl(item.foto_pulang) : ''

                        return (
                          <tr key={item.id_absensi} className="transition hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-center text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                  {(emp?.nama || item.nama_karyawan || 'P').charAt(0)}
                                </span>
                                <div>
                                  <p className="font-bold text-slate-900">{emp?.nama || item.nama_karyawan || 'Karyawan'}</p>
                                  <p className="text-[10px] text-slate-400">{emp?.jabatan || item.jabatan || 'Teknisi'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600">
                                #{item.id_karyawan}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p className="font-semibold text-slate-900">{job?.nama_pekerjaan || item.nama_pekerjaan || 'Proyek'}</p>
                              <p className="text-[10px] text-slate-400">{job?.lokasi || item.lokasi_pekerjaan || item.lokasi || 'Lokasi belum diisi'}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              <span className="block text-[10px] font-bold text-blue-700">
                                {formatWeekdayAndDate(item.tanggal, true).weekday}
                              </span>
                              <span>{formatDate(item.tanggal)}</span>
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {item.jam_masuk ? item.jam_masuk.slice(0, 5) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600">
                              {item.jam_pulang ? (
                                item.jam_pulang.slice(0, 5)
                              ) : (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Aktif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-600">
                              {item.durasi_format || `${item.durasi_jam || 0} jam`}
                            </td>
                            <td className="px-4 py-3 min-w-[180px]">
                              <div className="space-y-1.5">
                                <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-bold ${loc.matchMasuk.toneClass}`}>
                                  {loc.matchMasuk.label}
                                </span>
                                <div className="flex items-center gap-1.5">
                                  {fotoMasukUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                      aria-label={`Periksa foto masuk ${emp?.nama || item.nama_karyawan}`}
                                      className="overflow-hidden rounded border border-slate-200 bg-slate-100"
                                    >
                                      <img
                                        src={fotoMasukUrl}
                                        alt={`Foto masuk ${emp?.nama || item.nama_karyawan}`}
                                        className="h-8 w-10 object-cover"
                                      />
                                    </button>
                                  )}
                                  {fotoPulangUrl && (
                                    <button
                                      type="button"
                                      onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                      aria-label={`Periksa foto pulang ${emp?.nama || item.nama_karyawan}`}
                                      className="overflow-hidden rounded border border-slate-200 bg-slate-100"
                                    >
                                      <img
                                        src={fotoPulangUrl}
                                        alt={`Foto pulang ${emp?.nama || item.nama_karyawan}`}
                                        className="h-8 w-10 object-cover"
                                      />
                                    </button>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                    className="rounded-md border border-blue-200 bg-blue-50 px-2 py-1 text-[10px] font-semibold text-blue-700 hover:bg-blue-100"
                                  >
                                    Lihat Detail
                                  </button>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status_verifikasi} />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                {item.status_verifikasi === 'menunggu' ? (
                                  <>
                                    <button
                                      type="button"
                                      aria-label={`Setujui absensi ${emp?.nama || item.nama_karyawan}`}
                                      title="Setujui Absensi"
                                      onClick={() => handleVerify(item.id_absensi, 'disetujui')}
                                      className="rounded-lg bg-emerald-50 p-1.5 text-emerald-700 transition hover:bg-emerald-100 hover:text-emerald-800"
                                    >
                                      <Icon name="check" className="h-4 w-4" />
                                    </button>
                                    <button
                                      type="button"
                                      aria-label={`Tolak absensi ${emp?.nama || item.nama_karyawan}`}
                                      title="Tolak Absensi"
                                      onClick={() => handleVerify(item.id_absensi, 'ditolak')}
                                      className="rounded-lg bg-rose-50 p-1.5 text-rose-700 transition hover:bg-rose-100 hover:text-rose-800"
                                    >
                                      <Icon name="cross" className="h-4 w-4" />
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    aria-label={`Ubah verifikasi absensi ${emp?.nama || item.nama_karyawan}`}
                                    title="Ubah Verifikasi"
                                    onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                    className="rounded-lg border border-slate-200 px-2 py-1 text-[11px] font-semibold text-slate-600 hover:bg-slate-50"
                                  >
                                    Ubah
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        <AbsensiInspectionDialog
          attendance={selectedAttendance}
          employee={selectedAttendance?.emp}
          job={selectedAttendance?.job}
          onClose={() => setSelectedAttendance(null)}
          onVerify={(id, status, catatanAdmin) => {
            handleVerify(id, status, catatanAdmin)
            setSelectedAttendance(null)
          }}
        />
      </div>
    </div>
  )
}

