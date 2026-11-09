import { useEffect, useMemo, useState } from 'react'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import { getAbsensi } from '../../services/absensiApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M12 6v6l4 2" />
      </>
    ),
    checkCircle: (
      <>
        <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
        <polyline points="22 4 12 14.01 9 11.01" />
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
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 15-6.7L21 8M21 3v5h-5M21 12a9 9 0 0 1-15 6.7L3 16M3 21v-5h5" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
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
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Sedang Berjalan
      </span>
    )
  }
  if (status === 'selesai') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-slate-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
        Selesai
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
      Belum Mulai
    </span>
  )
}

export default function RekapAbsensiPekerja({ workerId = 1, workerName = 'Budi Santoso' }) {
  const [activeTab, setActiveTab] = useState('penugasan') // 'penugasan' | 'durasi' | 'disetujui'

  const [jobs, setJobs] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendances, setAttendances] = useState([])
  const [isLoading, setIsLoading] = useState(true)

  // Filters for Disetujui tab
  const [filterApprovedJob, setFilterApprovedJob] = useState('')
  const [filterApprovedMonth, setFilterApprovedMonth] = useState('')

  const normalizedWorkerId = Number(workerId) || 1

  const loadWorkerData = async () => {
    setIsLoading(true)
    try {
      const [jobData, assignData, attData] = await Promise.all([
        getPekerjaan(),
        getPenugasan(),
        getAbsensi({ id_karyawan: normalizedWorkerId }),
      ])
      setJobs(jobData || [])
      setAssignments(assignData || [])
      setAttendances(attData || [])
    } catch (err) {
      console.error('Gagal memuat rekap absensi pekerja:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkerData()
  }, [normalizedWorkerId])

  // A. Penugasan milik worker yang login
  const myAssignments = useMemo(() => {
    const workerAssignments = assignments.filter((a) => a.id_karyawan === normalizedWorkerId)
    const jobsById = new Map(jobs.map((j) => [j.id_pekerjaan, j]))

    return workerAssignments.map((a) => {
      const job = jobsById.get(a.id_pekerjaan) || null
      return {
        assignment: a,
        job,
      }
    }).filter((item) => item.job !== null)
  }, [assignments, jobs, normalizedWorkerId])

  // B. Durasi kerja kalkulasi
  const durasiStats = useMemo(() => {
    // Sesi milik worker
    const mySessions = attendances.filter((a) => a.id_karyawan === normalizedWorkerId)

    // Jam disetujui HANYA status_verifikasi === 'disetujui'
    const approvedSessions = mySessions.filter(
      (a) => a.status_verifikasi === 'disetujui' && a.jam_pulang !== null,
    )
    const totalMenitDisetujui = approvedSessions.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0)
    const jamDisetujui = Math.floor(totalMenitDisetujui / 60)
    const sisaMenitDisetujui = totalMenitDisetujui % 60

    // Jam keseluruhan (termasuk yang menunggu)
    const totalMenitSemua = mySessions.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0)
    const jamSemua = Math.floor(totalMenitSemua / 60)
    const sisaMenitSemua = totalMenitSemua % 60

    const waitingSessions = mySessions.filter((a) => a.status_verifikasi === 'menunggu')

    // Kontribusi durasi per pekerjaan
    const contributionMap = new Map()
    for (const session of approvedSessions) {
      const job = jobs.find((j) => j.id_pekerjaan === session.id_pekerjaan)
      const jobName = job?.nama_pekerjaan || session.nama_pekerjaan || 'Proyek Lapangan'
      const currentMenit = contributionMap.get(jobName) || 0
      contributionMap.set(jobName, currentMenit + (session.durasi_menit || 0))
    }

    const contributions = Array.from(contributionMap.entries()).map(([jobName, menit]) => {
      const percentage = totalMenitDisetujui > 0 ? Math.round((menit / totalMenitDisetujui) * 100) : 0
      const j = Math.floor(menit / 60)
      const m = menit % 60
      return {
        jobName,
        menit,
        label: `${j}j ${m}m`,
        percentage,
      }
    })

    return {
      mySessions,
      approvedSessions,
      totalMenitDisetujui,
      labelDisetujui: `${jamDisetujui}j ${sisaMenitDisetujui}m`,
      labelSemua: `${jamSemua}j ${sisaMenitSemua}m`,
      totalSesi: mySessions.length,
      totalMenunggu: waitingSessions.length,
      contributions,
    }
  }, [attendances, normalizedWorkerId, jobs])

  // C. Daftar absensi yang DISETUJUI milik pekerja
  const approvedList = useMemo(() => {
    return attendances
      .filter((a) => a.id_karyawan === normalizedWorkerId && a.status_verifikasi === 'disetujui')
      .filter((a) => {
        if (filterApprovedJob && String(a.id_pekerjaan) !== String(filterApprovedJob)) {
          return false
        }
        if (filterApprovedMonth && !a.tanggal.startsWith(filterApprovedMonth)) {
          return false
        }
        return true
      })
  }, [attendances, normalizedWorkerId, filterApprovedJob, filterApprovedMonth])

  return (
    <div className="worker-theme min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Karyawan</span>
            <span>/</span>
            <span className="text-emerald-600">Rekap Absensi</span>
          </nav>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Rekap Absensi Personal
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Halo, <strong>{workerName}</strong>. Pantau tugas proyek, akumulasi jam kerja disetujui, dan riwayat absensi Anda.
              </p>
            </div>
            <button
              onClick={loadWorkerData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
            >
              <Icon name="refresh" className={`h-4 w-4 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </div>

        {/* Tab Navigation Navigation (Single Menu with 3 Subsections) */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-2 sm:gap-4">
            <button
              type="button"
              onClick={() => setActiveTab('penugasan')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'penugasan'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="briefcase" className="h-4 w-4" />
              <span>A. Penugasan Saya</span>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                {myAssignments.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('durasi')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'durasi'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="clock" className="h-4 w-4" />
              <span>B. Durasi Kerja</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {durasiStats.labelDisetujui}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('disetujui')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold transition ${
                activeTab === 'disetujui'
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="checkCircle" className="h-4 w-4" />
              <span>C. Absensi Disetujui</span>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {durasiStats.approvedSessions.length}
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUBSECTION A: PENUGASAN SAYA */}
        {/* ============================================================== */}
        {activeTab === 'penugasan' && (
          <div className="space-y-6">
            {/* Stat Row */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Tugas Saya</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{myAssignments.length}</p>
                <p className="mt-1 text-xs text-emerald-600 font-medium">Tanggung jawab aktif</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Sedang Berjalan</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {myAssignments.filter(({ job }) => job?.status === 'berjalan').length}
                </p>
                <p className="mt-1 text-xs text-slate-500">Proyek aktif saat ini</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Pekerjaan Selesai</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">
                  {myAssignments.filter(({ job }) => job?.status === 'selesai').length}
                </p>
                <p className="mt-1 text-xs text-slate-500">Telah rampung</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Total Sesi Kehadiran</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{durasiStats.totalSesi}</p>
                <p className="mt-1 text-xs text-slate-500">Presensi tercatat</p>
              </div>
            </div>

            {/* Grid of Assigned Jobs */}
            <div>
              <h3 className="mb-4 text-base font-bold text-slate-900">
                Daftar Pekerjaan yang Ditugaskan Kepada Saya
              </h3>

              {myAssignments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                  Belum ada pekerjaan yang ditugaskan kepada Anda. Silakan cek menu "Pekerjaan Tersedia" untuk mengambil tugas baru.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myAssignments.map(({ assignment, job }) => (
                    <article
                      key={assignment.id_penugasan}
                      className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:shadow-md"
                    >
                      <div>
                        <div className="flex items-center justify-between gap-2">
                          <JobStatusBadge status={job.status} />
                          <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                            {assignment.jenis_penugasan === 'mandiri' ? 'Diambil Mandiri' : 'Ditetapkan Admin'}
                          </span>
                        </div>

                        <h4 className="mt-3 text-base font-bold text-slate-900 line-clamp-2">
                          {job.nama_pekerjaan}
                        </h4>
                        <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                          {job.deskripsi || 'Tidak ada deskripsi detail pekerjaan.'}
                        </p>

                        <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                          <p className="flex items-center gap-1.5">
                            <Icon name="location" className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="truncate">{job.lokasi || 'Lokasi fleksibel'}</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <Icon name="calendar" className="h-4 w-4 text-slate-400 shrink-0" />
                            <span>Mulai: {formatDate(job.tanggal_mulai)}</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-medium text-slate-900">
                            <Icon name="clock" className="h-4 w-4 text-emerald-600 shrink-0" />
                            <span>Batas Deadline: {formatDate(job.target_selesai)}</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-between text-xs">
                        <span className="text-slate-400">Penugasan #{assignment.id_penugasan}</span>
                        <span className="font-semibold text-emerald-700">Tanggung Jawab Anda</span>
                      </div>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION B: DURASI KERJA */}
        {/* ============================================================== */}
        {activeTab === 'durasi' && (
          <div className="space-y-6">
            {/* Stat Cards */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-800">Total Jam Disetujui</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{durasiStats.labelDisetujui}</p>
                <p className="mt-1 text-[11px] text-emerald-600">Resmi diverifikasi admin</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Durasi Keseluruhan</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{durasiStats.labelSemua}</p>
                <p className="mt-1 text-[11px] text-slate-400">Termasuk yang menunggu</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Sesi Absensi</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{durasiStats.totalSesi}</p>
                <p className="mt-1 text-[11px] text-slate-400">Presensi masuk & pulang</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-800">Menunggu Review</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{durasiStats.totalMenunggu}</p>
                <p className="mt-1 text-[11px] text-amber-600">Belum diverifikasi</p>
              </div>
            </div>

            {/* Distribution per Job & Recent Hours */}
            <div className="grid gap-6 md:grid-cols-2">
              {/* Contributions */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
                <h3 className="text-sm font-bold text-slate-900">Distribusi Jam Kerja per Pekerjaan</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Total waktu kerja disetujui yang Anda dedikasikan pada tiap proyek.
                </p>

                <div className="mt-6 space-y-4">
                  {durasiStats.contributions.length === 0 ? (
                    <p className="text-xs text-slate-400 py-4 text-center">
                      Belum ada durasi kerja yang disetujui admin.
                    </p>
                  ) : (
                    durasiStats.contributions.map((c, i) => (
                      <div key={i} className="space-y-1 text-xs">
                        <div className="flex justify-between font-semibold">
                          <span className="text-slate-800 line-clamp-1">{c.jobName}</span>
                          <span className="text-emerald-700 shrink-0">{c.label} ({c.percentage}%)</span>
                        </div>
                        <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                          <div
                            className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Attendance Log History */}
              <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Riwayat Jam Masuk & Pulang Anda</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Catatan waktu kedatangan dan kepulangan pada proyek.
                  </p>

                  <div className="mt-4 max-h-64 space-y-2.5 overflow-y-auto pr-1">
                    {durasiStats.mySessions.length === 0 ? (
                      <p className="text-xs text-slate-400 py-4 text-center">Belum ada riwayat absensi.</p>
                    ) : (
                      durasiStats.mySessions.map((session) => (
                        <div
                          key={session.id_absensi}
                          className="flex items-center justify-between rounded-xl border border-slate-100 p-3 text-xs transition hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-bold text-slate-900">{formatDate(session.tanggal)}</p>
                            <p className="text-[11px] text-slate-500">
                              {session.nama_pekerjaan || 'Pekerjaan Lapangan'}
                            </p>
                          </div>

                          <div className="text-right">
                            <p className="font-mono font-semibold text-slate-800">
                              {session.jam_masuk?.slice(0, 5)} – {session.jam_pulang?.slice(0, 5) || 'Aktif'}
                            </p>
                            <p className="font-bold text-emerald-600 text-[11px]">
                              {session.durasi_format || `${session.durasi_jam || 0} jam`}
                            </p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION C: ABSENSI DISETUJUI */}
        {/* ============================================================== */}
        {activeTab === 'disetujui' && (
          <div className="space-y-6">
            {/* Filter toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="filter" className="h-4 w-4 text-emerald-600" />
                  <label htmlFor="filter-app-job" className="text-xs font-semibold text-slate-700">
                    Filter Pekerjaan:
                  </label>
                  <select
                    id="filter-app-job"
                    value={filterApprovedJob}
                    onChange={(e) => setFilterApprovedJob(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Semua Pekerjaan</option>
                    {jobs.map((job) => (
                      <option key={job.id_pekerjaan} value={job.id_pekerjaan}>
                        {job.nama_pekerjaan}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <Icon name="calendar" className="h-4 w-4 text-emerald-600" />
                  <label htmlFor="filter-app-month" className="text-xs font-semibold text-slate-700">
                    Bulan:
                  </label>
                  <input
                    id="filter-app-month"
                    type="month"
                    value={filterApprovedMonth}
                    onChange={(e) => setFilterApprovedMonth(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              {(filterApprovedJob || filterApprovedMonth) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterApprovedJob('')
                    setFilterApprovedMonth('')
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Approved Attendance Table */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="border-b border-slate-100 bg-emerald-50/30 px-6 py-4">
                <h3 className="text-base font-bold text-slate-900">
                  Daftar Absensi yang Telah Disetujui Admin
                </h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Hanya menampilkan catatan kehadiran personal Anda yang status verifikasinya telah resmi disetujui.
                </p>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">No.</th>
                      <th className="px-4 py-3.5">Nama Pekerjaan</th>
                      <th className="px-4 py-3.5">Tanggal</th>
                      <th className="px-4 py-3.5">Jam Masuk</th>
                      <th className="px-4 py-3.5">Jam Pulang</th>
                      <th className="px-4 py-3.5">Durasi Kerja</th>
                      <th className="px-4 py-3.5 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {approvedList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Belum ada catatan absensi yang disetujui sesuai kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      approvedList.map((item, index) => {
                        const job = jobs.find((j) => j.id_pekerjaan === item.id_pekerjaan)
                        return (
                          <tr key={item.id_absensi} className="transition hover:bg-slate-50/60">
                            <td className="px-4 py-3 text-center text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3">
                              <p className="font-bold text-slate-900">{job?.nama_pekerjaan || item.nama_pekerjaan || 'Proyek Lapangan'}</p>
                              <p className="text-[10px] text-slate-400">{job?.lokasi || item.lokasi || 'Lokasi Proyek'}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatDate(item.tanggal)}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {item.jam_masuk ? item.jam_masuk.slice(0, 5) : '—'}
                            </td>
                            <td className="px-4 py-3 font-mono text-slate-600">
                              {item.jam_pulang ? item.jam_pulang.slice(0, 5) : '—'}
                            </td>
                            <td className="px-4 py-3 font-bold text-emerald-600">
                              {item.durasi_format || `${item.durasi_jam || 0} jam`}
                            </td>
                            <td className="px-4 py-3 text-center">
                              <StatusBadge status="disetujui" />
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
      </div>
    </div>
  )
}

