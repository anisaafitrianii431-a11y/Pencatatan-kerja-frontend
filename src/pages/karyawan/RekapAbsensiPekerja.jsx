import { useEffect, useMemo, useState } from 'react'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import {
  absenMasuk,
  absenPulang,
  getAbsensi,
  getJakartaNowFormatted,
  getJobAttendanceAvailability,
  subscribeNtpSync,
  syncNtpTime,
} from '../../services/absensiApi.js'
import { getFileUrl } from '../../services/api.js'
import CameraCapture from '../../components/CameraCapture.jsx'
import AbsensiInspectionDialog from '../../components/AbsensiInspectionDialog.jsx'
import {
  formatWeekdayAndDate,
  getGoogleMapsUrl,
  getLocationMatchMeta,
} from '../../utils/geoLocation.js'

function formatShortDate(value) {
  return formatWeekdayAndDate(value, true).fullDate
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
    camera: (
      <>
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3Z" />
        <circle cx="12" cy="13" r="3" />
      </>
    ),
    filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    lock: (
      <>
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
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
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Disetujui Admin
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Ditolak Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Menunggu Approval
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
      <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-blue-600/20">
        Selesai
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      Belum Mulai
    </span>
  )
}

export default function RekapAbsensiPekerja({
  workerId = 1,
  workerName = 'Budi Santoso',
  defaultTab = 'absen',
}) {
  const [activeTab, setActiveTab] = useState(defaultTab === 'rekap' ? 'rekap' : 'absen')

  useEffect(() => {
    setActiveTab(defaultTab === 'rekap' ? 'rekap' : 'absen')
  }, [defaultTab])

  const [jobs, setJobs] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendances, setAttendances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [todayDate, setTodayDate] = useState(() => getJakartaNowFormatted().tanggal)

  useEffect(() => {
    const refreshTodayDate = () => {
      const nextDate = getJakartaNowFormatted().tanggal
      setTodayDate((prev) => (prev === nextDate ? prev : nextDate))
    }

    const unsubNtp = subscribeNtpSync(refreshTodayDate)
    syncNtpTime().then(refreshTodayDate)

    const timer = setInterval(refreshTodayDate, 30000)
    const resyncTimer = setInterval(() => {
      syncNtpTime({ force: true })
    }, 5 * 60 * 1000)

    return () => {
      unsubNtp()
      clearInterval(timer)
      clearInterval(resyncTimer)
    }
  }, [])

  // Modal Kamera Ambil Absen & Dialog Detail Absensi
  const [cameraSession, setCameraSession] = useState(null) // { mode: 'masuk'|'pulang', job, activeAbsensi }
  const [selectedDetail, setSelectedDetail] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [feedback, setFeedback] = useState(null)

  // Filter Rekap Absen
  const [filterJob, setFilterJob] = useState('')
  const [filterMonth, setFilterMonth] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

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
      console.error('Gagal memuat data absensi pekerja:', err)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadWorkerData()
  }, [normalizedWorkerId])

  // Daftar pekerjaan yang diambil / ditugaskan ke pekerja
  const myAssignments = useMemo(() => {
    const workerAssignments = assignments.filter(
      (a) => Number(a.id_karyawan) === normalizedWorkerId,
    )
    const jobsById = new Map(jobs.map((j) => [Number(j.id_pekerjaan), j]))

    return workerAssignments.map((a) => {
      const matchedJob = jobsById.get(Number(a.id_pekerjaan))
      const job = matchedJob || {
        id_pekerjaan: Number(a.id_pekerjaan),
        nama_pekerjaan: a.nama_pekerjaan || `Pekerjaan #${a.id_pekerjaan}`,
        deskripsi: a.deskripsi || '',
        lokasi: a.lokasi || '',
        titik_lokasi: a.titik_lokasi || '',
        tanggal_mulai: a.tanggal_mulai || '',
        target_selesai: a.target_selesai || '',
        status: a.status_pekerjaan || 'belum_mulai',
      }
      return { assignment: a, job }
    })
  }, [assignments, jobs, normalizedWorkerId])

  const assignmentByJobId = useMemo(() => {
    const map = new Map()
    for (const item of myAssignments) {
      map.set(Number(item.job.id_pekerjaan), item.assignment)
    }
    return map
  }, [myAssignments])

  const attendanceByJob = useMemo(() => {
    const sessionsByJob = new Map()
    for (const att of attendances) {
      if (Number(att.id_karyawan) !== normalizedWorkerId) continue
      const jobId = Number(att.id_pekerjaan)
      const list = sessionsByJob.get(jobId) || []
      list.push(att)
      sessionsByJob.set(jobId, list)
    }

    const map = new Map()
    for (const { job } of myAssignments) {
      const jobId = Number(job.id_pekerjaan)
      const sessions = sessionsByJob.get(jobId) || []
      map.set(jobId, getJobAttendanceAvailability(job, sessions, todayDate))
    }
    return map
  }, [attendances, myAssignments, normalizedWorkerId, todayDate])

  const readyAttendanceCount = useMemo(() => {
    let count = 0
    for (const item of attendanceByJob.values()) {
      if (item.canCheckIn || item.canCheckOut) count += 1
    }
    return count
  }, [attendanceByJob])

  // Statistik Rekap Absen Personal
  const rekapStats = useMemo(() => {
    const mySessions = attendances.filter((a) => Number(a.id_karyawan) === normalizedWorkerId)
    const approvedSessions = mySessions.filter((a) => a.status_verifikasi === 'disetujui')
    const approvedCompleted = approvedSessions.filter((a) => Boolean(a.jam_pulang))

    const totalMenitDisetujui = approvedCompleted.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0)
    const jamDisetujui = Math.floor(totalMenitDisetujui / 60)
    const sisaMenitDisetujui = totalMenitDisetujui % 60

    const totalMenitSemua = mySessions.reduce((acc, curr) => acc + (curr.durasi_menit || 0), 0)
    const jamSemua = Math.floor(totalMenitSemua / 60)
    const sisaMenitSemua = totalMenitSemua % 60

    const approvedDaysCount = new Set(
      approvedSessions.map((a) => String(a.tanggal || '').slice(0, 10)).filter(Boolean),
    ).size
    const waitingCount = mySessions.filter((a) => a.status_verifikasi === 'menunggu').length
    const activeCount = mySessions.filter((a) => !a.jam_pulang).length

    const perJobMap = new Map()
    for (const session of mySessions) {
      const jobId = Number(session.id_pekerjaan)
      const matchedJob = jobs.find((j) => Number(j.id_pekerjaan) === jobId)
      const current = perJobMap.get(jobId) || {
        id_pekerjaan: jobId,
        nama_pekerjaan: matchedJob?.nama_pekerjaan || session.nama_pekerjaan || 'Proyek Lapangan',
        lokasi: matchedJob?.lokasi || session.lokasi_pekerjaan || 'Lokasi belum diisi',
        totalSesi: 0,
        sesiDisetujui: 0,
        menitDisetujui: 0,
        menitSemua: 0,
      }
      current.totalSesi += 1
      current.menitSemua += session.durasi_menit || 0
      if (session.status_verifikasi === 'disetujui') {
        current.sesiDisetujui += 1
        current.menitDisetujui += session.durasi_menit || 0
      }
      perJobMap.set(jobId, current)
    }

    const perJobList = Array.from(perJobMap.values()).map((row) => ({
      ...row,
      labelDisetujui: `${Math.floor(row.menitDisetujui / 60)}j ${row.menitDisetujui % 60}m`,
      labelSemua: `${Math.floor(row.menitSemua / 60)}j ${row.menitSemua % 60}m`,
      percentage:
        totalMenitDisetujui > 0 ? Math.round((row.menitDisetujui / totalMenitDisetujui) * 100) : 0,
    }))

    return {
      mySessions,
      approvedSessions,
      approvedDaysCount,
      activeCount,
      waitingCount,
      totalSesi: mySessions.length,
      labelDisetujui: `${jamDisetujui}j ${sisaMenitDisetujui}m`,
      labelSemua: `${jamSemua}j ${sisaMenitSemua}m`,
      perJobList,
    }
  }, [attendances, normalizedWorkerId, jobs])

  // Daftar Rekap Absen terfilter & tersusun rapi berdasarkan hari & tanggal terbaru
  const filteredRekapList = useMemo(() => {
    return rekapStats.mySessions
      .filter((a) => {
        if (filterJob && String(a.id_pekerjaan) !== String(filterJob)) return false
        if (filterMonth && !String(a.tanggal || '').startsWith(filterMonth)) return false
        if (filterStatus && a.status_verifikasi !== filterStatus) return false
        return true
      })
      .sort((a, b) => {
        const keyA = `${String(a.tanggal || '').slice(0, 10)} ${String(a.jam_masuk || '')}`
        const keyB = `${String(b.tanggal || '').slice(0, 10)} ${String(b.jam_masuk || '')}`
        if (keyA === keyB) return Number(b.id_absensi) - Number(a.id_absensi)
        return keyB.localeCompare(keyA)
      })
  }, [rekapStats.mySessions, filterJob, filterMonth, filterStatus])

  const openCameraModal = (job, mode, activeAbsensi = null) => {
    const availability =
      attendanceByJob.get(Number(job?.id_pekerjaan)) ||
      getJobAttendanceAvailability(job, [], todayDate)

    if (mode === 'masuk' && !availability.canCheckIn) {
      setFeedback({
        type: 'error',
        text:
          availability.lockDescription ||
          availability.lockLabel ||
          'Absensi masuk sedang terkunci untuk pekerjaan ini.',
      })
      return
    }
    if (mode === 'pulang' && !availability.canCheckOut && !activeAbsensi) {
      return
    }
    setSubmitError('')
    setCameraSession({ job, mode, activeAbsensi })
  }

  const openSessionDetail = (item) => {
    const job = jobs.find((j) => Number(j.id_pekerjaan) === Number(item.id_pekerjaan)) || null
    const assignment = assignmentByJobId.get(Number(item.id_pekerjaan)) || null
    setSelectedDetail({
      ...item,
      nama_karyawan: item.nama_karyawan || workerName,
      jenis_penugasan: item.jenis_penugasan || assignment?.jenis_penugasan || '',
      job,
    })
  }

  const handleCameraSubmit = async ({ foto, titik_lokasi, catatan, is_overnight }) => {
    if (!cameraSession) return
    setIsSubmitting(true)
    setSubmitError('')
    await syncNtpTime({ maxAgeMs: 15_000 })
    const { tanggal, jam } = getJakartaNowFormatted()

    try {
      if (cameraSession.mode === 'masuk') {
        const res = await absenMasuk({
          id_pekerjaan: cameraSession.job.id_pekerjaan,
          id_karyawan: normalizedWorkerId,
          tanggal,
          jam_masuk: jam,
          catatan,
          titik_lokasi,
          foto_lokasi: foto,
        })
        setFeedback({
          type: 'success',
          text:
            res?.message ||
            `Absen masuk pada "${cameraSession.job.nama_pekerjaan}" berhasil dikirim. Menunggu persetujuan Admin.`,
        })
      } else {
        const activeId = cameraSession.activeAbsensi?.id_absensi
        const res = await absenPulang(activeId, jam, is_overnight, {
          titik_pulang: titik_lokasi,
          foto_pulang: foto,
        })
        setFeedback({
          type: 'success',
          text:
            res?.message ||
            `Absen pulang pada "${cameraSession.job.nama_pekerjaan}" berhasil dikirim. Menunggu persetujuan Admin.`,
        })
      }
      setCameraSession(null)
      await loadWorkerData()
    } catch (err) {
      setSubmitError(err?.message || 'Gagal mengirim data absensi. Silakan coba lagi.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="worker-theme min-h-screen bg-slate-50 text-slate-800">
      {cameraSession && (
        <CameraCapture
          mode={cameraSession.mode}
          job={cameraSession.job}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onCapture={handleCameraSubmit}
          onCancel={() => {
            setSubmitError('')
            setCameraSession(null)
          }}
        />
      )}

      <AbsensiInspectionDialog
        attendance={selectedDetail}
        job={selectedDetail?.job}
        readOnly
        onClose={() => setSelectedDetail(null)}
      />

      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* Header Breadcrumb */}
        <div className="mb-6">
          <nav className="flex items-center gap-2 text-xs font-semibold text-slate-400">
            <span>Karyawan</span>
            <span>/</span>
            <span className="text-emerald-600">Absensi</span>
          </nav>
          <div className="mt-2 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">
                Absensi
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Halo, <strong>{workerName}</strong>. Lakukan absensi sesuai pekerjaan yang Anda ambil dengan kamera &amp; titik GPS, lalu tinjau detailnya pada Rekap Absen hingga disetujui Admin.
              </p>
            </div>
            <button
              type="button"
              onClick={loadWorkerData}
              disabled={isLoading}
              className="inline-flex items-center gap-2 self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
            >
              <Icon name="refresh" className={`h-4 w-4 text-emerald-600 ${isLoading ? 'animate-spin' : ''}`} />
              Segarkan
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            role="status"
            className={`mb-6 flex items-center justify-between gap-3 rounded-xl border px-4 py-3 text-xs sm:text-sm font-semibold shadow-sm ${feedback.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
              : 'border-rose-200 bg-rose-50 text-rose-800'
              }`}
          >
            <span>{feedback.text}</span>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              aria-label="Tutup notifikasi"
              className="rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        )}

        {/* Opsi Fitur Utama Absensi: 1. Absen Pekerjaan & 2. Rekap Absen */}
        <div className="mb-6 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => setActiveTab('absen')}
            className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-xs ${activeTab === 'absen'
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <Icon name="camera" className="h-4 w-4" />
            <span>Absen Pekerjaan</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${activeTab === 'absen' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
                }`}
            >
              {myAssignments.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('rekap')}
            className={`inline-flex items-center gap-2.5 rounded-xl px-4 py-2.5 text-sm font-bold transition shadow-xs ${activeTab === 'rekap'
              ? 'bg-emerald-600 text-white shadow-emerald-600/20'
              : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:text-slate-900'
              }`}
          >
            <Icon name="calendar" className="h-4 w-4" />
            <span>Rekap Absen</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${activeTab === 'rekap' ? 'bg-white/20 text-white' : 'bg-emerald-100 text-emerald-700'
                }`}
            >
              {rekapStats.totalSesi}
            </span>
          </button>
        </div>

        {/* ============================================================== */}
        {/* OPSI 1: ABSEN TERHADAP PEKERJAAN YANG DIAMBIL                  */}
        {/* ============================================================== */}
        {activeTab === 'absen' && (
          <div className="space-y-6">
            {/* Ringkasan Cepat */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Pekerjaan Diambil</p>
                <p className="mt-1 text-2xl font-bold text-slate-900">{myAssignments.length}</p>
                <p className="mt-1 text-xs font-medium text-emerald-600">
                  {readyAttendanceCount > 0
                    ? `${readyAttendanceCount} siap absen hari ini`
                    : 'Semua absen terkunci / selesai'}
                </p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Sedang Berjalan</p>
                <p className="mt-1 text-2xl font-bold text-emerald-600">
                  {myAssignments.filter(({ job }) => job?.status === 'berjalan').length}
                </p>
                <p className="mt-1 text-xs text-slate-500">Proyek aktif saat ini</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Sesi Kerja Aktif</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">{rekapStats.activeCount}</p>
                <p className="mt-1 text-xs text-slate-500">Belum absen pulang</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-medium text-slate-500">Menunggu Approval Admin</p>
                <p className="mt-1 text-2xl font-bold text-amber-600">{rekapStats.waitingCount}</p>
                <p className="mt-1 text-xs text-slate-500">Dicek lokasi &amp; foto</p>
              </div>
            </div>

            {/* Kartu Pekerjaan untuk Ambil Absen */}
            <div>
              <div className="mb-4 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
                <h2 className="text-base font-bold text-slate-900">
                  Pilih Pekerjaan yang Diambil untuk Absen
                </h2>
                <span className="text-xs text-slate-500">
                  Klik <strong className="text-emerald-700">Ambil Absen</strong> untuk membuka kamera langsung &amp; titik GPS lokasi proyek.
                </span>
              </div>

              {myAssignments.length === 0 ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
                  Belum ada pekerjaan yang ditugaskan kepada Anda. Hubungi Administrator untuk mendapatkan penugasan.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {myAssignments.map(({ assignment, job }) => {
                    const jobAtt =
                      attendanceByJob.get(Number(job.id_pekerjaan)) ||
                      getJobAttendanceAvailability(job, [], todayDate)
                    const activeSession = jobAtt.activeSession
                    const latestSession = jobAtt.latestSession
                    const jobMapUrl = getGoogleMapsUrl(job.titik_lokasi)

                    return (
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

                          <h3 className="mt-3 text-base font-bold text-slate-900 line-clamp-2">
                            {job.nama_pekerjaan}
                          </h3>
                          <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                            {job.deskripsi || 'Tidak ada deskripsi detail pekerjaan.'}
                          </p>

                          <div className="mt-4 space-y-2 border-t border-slate-100 pt-3 text-xs text-slate-600">
                            <p className="flex items-center gap-1.5">
                              <Icon name="location" className="h-4 w-4 text-slate-400 shrink-0" />
                              <span className="truncate">{job.lokasi || 'Lokasi proyek belum diisi'}</span>
                            </p>
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <span className="text-slate-500">Metode lokasi:</span>
                              {job.metode_lokasi === 'wfh' ? (
                                <span className="font-semibold text-emerald-700">WFH · bebas radius</span>
                              ) : job.titik_lokasi ? (
                                <a
                                  href={jobMapUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="font-mono font-semibold text-emerald-700 hover:underline truncate"
                                >
                                  GPS: {job.titik_lokasi} · {job.radius_meter || 100} m
                                </a>
                              ) : (
                                <span className="text-amber-600 font-medium">Belum disetel Admin</span>
                              )}
                            </div>
                            <p className="flex items-center gap-1.5">
                              <Icon name="calendar" className="h-4 w-4 text-slate-400 shrink-0" />
                              <span>Mulai: {formatShortDate(job.tanggal_mulai)}</span>
                            </p>
                            <p className="flex items-center gap-1.5 font-medium text-slate-900">
                              <Icon name="clock" className="h-4 w-4 text-emerald-600 shrink-0" />
                              <span>Deadline: {formatShortDate(job.target_selesai)}</span>
                            </p>
                          </div>

                          {/* Status Sesi / Verifikasi Terakhir untuk Pekerjaan Ini */}
                          {activeSession ? (
                            <div className="mt-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-2.5 text-[11px] space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <p className="font-bold text-emerald-800">
                                  Sesi Aktif • Masuk {String(activeSession.jam_masuk || '').slice(0, 5)}
                                </p>
                                <StatusBadge status={activeSession.status_verifikasi} />
                              </div>
                              <div className="flex items-center justify-between text-slate-600">
                                <span>{formatWeekdayAndDate(activeSession.tanggal, true).label}</span>
                                <button
                                  type="button"
                                  onClick={() => openSessionDetail(activeSession)}
                                  className="font-semibold text-emerald-700 hover:underline"
                                >
                                  Detail Sesi
                                </button>
                              </div>
                            </div>
                          ) : latestSession ? (
                            <div className="mt-3 rounded-xl border border-slate-200/80 bg-slate-50 p-2.5 text-[11px] space-y-1">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-semibold text-slate-700 truncate">
                                  {formatWeekdayAndDate(latestSession.tanggal, true).label}
                                </span>
                                <StatusBadge status={latestSession.status_verifikasi} />
                              </div>
                              <div className="flex items-center justify-between text-slate-500">
                                <span className="font-mono">
                                  {String(latestSession.jam_masuk || '').slice(0, 5)}–{latestSession.jam_pulang ? String(latestSession.jam_pulang).slice(0, 5) : 'Aktif'} ({latestSession.durasi_format})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => openSessionDetail(latestSession)}
                                  className="font-semibold text-emerald-700 hover:underline"
                                >
                                  Lihat Detail
                                </button>
                              </div>
                            </div>
                          ) : null}
                        </div>

                        <div className="mt-5 pt-3 border-t border-slate-100 space-y-2.5">
                          {activeSession ? (
                            <button
                              type="button"
                              onClick={() => openCameraModal(job, 'pulang', activeSession)}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-rose-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-rose-700"
                            >
                              <Icon name="camera" className="h-4 w-4" />
                              <span>Ambil Absen Pulang (Kamera &amp; GPS)</span>
                            </button>
                          ) : jobAtt.isLocked ? (
                            <div className="space-y-1.5">
                              <button
                                type="button"
                                disabled
                                aria-describedby={`lock-reason-${assignment.id_penugasan}`}
                                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 px-4 py-2.5 text-xs font-semibold text-slate-600 cursor-not-allowed"
                              >
                                <Icon name="lock" className="h-4 w-4 shrink-0" />
                                <span>{jobAtt.lockLabel}</span>
                              </button>
                              <p
                                id={`lock-reason-${assignment.id_penugasan}`}
                                className={`text-[11px] leading-snug text-center ${
                                  jobAtt.mode === 'locked_not_started'
                                    ? 'text-amber-700'
                                    : 'text-slate-500'
                                }`}
                              >
                                {jobAtt.lockDescription}
                              </p>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => openCameraModal(job, 'masuk')}
                              className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-700"
                            >
                              <Icon name="camera" className="h-4 w-4" />
                              <span>Ambil Absen Masuk (Kamera &amp; GPS)</span>
                            </button>
                          )}

                          <div className="flex items-center justify-between text-[11px] text-slate-400">
                            <span>Penugasan #{assignment.id_penugasan}</span>
                            <span>{jobAtt?.count || 0} sesi tercatat</span>
                          </div>
                        </div>
                      </article>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Banner Ajakan Membuka Opsi Rekap Absen */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/60 px-5 py-4">
              <div>
                <p className="text-sm font-bold text-slate-900">
                  Ingin melihat seluruh riwayat absen tersusun per hari, tanggal, jam kerja, &amp; status approval Admin?
                </p>
                <p className="text-xs text-slate-600 mt-0.5">
                  Terdapat {rekapStats.totalSesi} catatan absensi yang dapat Anda tinjau di tab Rekap Absen.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setActiveTab('rekap')}
                className="shrink-0 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white shadow-xs transition hover:bg-emerald-700"
              >
                Lihat Rekap Absen →
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* OPSI 2: REKAP ABSEN (TERSTRUKTUR HARI, TANGGAL, PEKERJAAN & JAM) */}
        {/* ============================================================== */}
        {activeTab === 'rekap' && (
          <div className="space-y-6">
            {/* Ringkasan Statistik Rekap */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/60 p-4 shadow-sm">
                <p className="text-xs font-semibold text-emerald-800">Total Jam Kerja Disetujui</p>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{rekapStats.labelDisetujui}</p>
                <p className="mt-1 text-[11px] text-emerald-600">Terverifikasi Admin untuk slip gaji</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Hari Hadir Disetujui</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{rekapStats.approvedDaysCount} Hari</p>
                <p className="mt-1 text-[11px] text-slate-400">
                  Dari {rekapStats.approvedSessions.length} sesi disetujui
                </p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold text-slate-500">Total Catatan Absen</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{rekapStats.totalSesi} Sesi</p>
                <p className="mt-1 text-[11px] text-slate-400">Akumulasi total: {rekapStats.labelSemua}</p>
              </div>

              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4 shadow-sm">
                <p className="text-xs font-semibold text-amber-800">Menunggu Approval Admin</p>
                <p className="mt-2 text-2xl font-bold text-amber-700">{rekapStats.waitingCount}</p>
                <p className="mt-1 text-[11px] text-amber-600">Menunggu pengecekan foto &amp; titik lokasi</p>
              </div>
            </div>

            {/* Filter Rekap Absen */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <Icon name="filter" className="h-4 w-4 text-emerald-600" />
                  <label htmlFor="rekap-filter-job" className="text-xs font-semibold text-slate-700">
                    Pekerjaan:
                  </label>
                  <select
                    id="rekap-filter-job"
                    value={filterJob}
                    onChange={(e) => setFilterJob(e.target.value)}
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
                  <label htmlFor="rekap-filter-month" className="text-xs font-semibold text-slate-700">
                    Bulan:
                  </label>
                  <input
                    id="rekap-filter-month"
                    type="month"
                    value={filterMonth}
                    onChange={(e) => setFilterMonth(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <label htmlFor="rekap-filter-status" className="text-xs font-semibold text-slate-700">
                    Status Approval:
                  </label>
                  <select
                    id="rekap-filter-status"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-emerald-500 focus:outline-none"
                  >
                    <option value="">Semua Status</option>
                    <option value="menunggu">Menunggu Approval</option>
                    <option value="disetujui">Disetujui Admin</option>
                    <option value="ditolak">Ditolak Admin</option>
                  </select>
                </div>
              </div>

              {(filterJob || filterMonth || filterStatus) && (
                <button
                  type="button"
                  onClick={() => {
                    setFilterJob('')
                    setFilterMonth('')
                    setFilterStatus('')
                  }}
                  className="text-xs font-semibold text-emerald-600 hover:text-emerald-800"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* Tabel Rinci Rekap Absen */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 bg-slate-50/70 px-6 py-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Rekap Absen Harian &amp; Rincian Pekerjaan
                  </h2>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Tersusun berdasarkan hari, tanggal, data pekerjaan yang diambil, jam kerja, bukti foto kamera, serta persetujuan Admin.
                  </p>
                </div>
                <span className="rounded-full bg-white border border-slate-200 px-3 py-1 text-xs font-semibold text-slate-600">
                  {filteredRekapList.length} Catatan
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th scope="col" className="px-4 py-3.5 w-12 text-center">No.</th>
                      <th scope="col" className="px-4 py-3.5 min-w-[160px]">Hari &amp; Tanggal</th>
                      <th scope="col" className="px-4 py-3.5 min-w-[210px]">Detail Data Pekerjaan</th>
                      <th scope="col" className="px-4 py-3.5 min-w-[155px]">Jam Kerja</th>
                      <th scope="col" className="px-4 py-3.5 min-w-[175px]">Lokasi GPS &amp; Foto</th>
                      <th scope="col" className="px-4 py-3.5 text-center">Status Approval</th>
                      <th scope="col" className="px-4 py-3.5 text-center">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredRekapList.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Belum ada data absensi sesuai kriteria filter. Silakan ambil absen di menu <strong>Absen Pekerjaan</strong>.
                        </td>
                      </tr>
                    ) : (
                      filteredRekapList.map((item, index) => {
                        const job = jobs.find((j) => Number(j.id_pekerjaan) === Number(item.id_pekerjaan))
                        const assignment = assignmentByJobId.get(Number(item.id_pekerjaan))
                        const dayMeta = formatWeekdayAndDate(item.tanggal)
                        const titikProyek = job?.titik_lokasi || item.titik_pekerjaan || ''
                        const matchMeta = getLocationMatchMeta(
                          item.jarak_masuk,
                          Boolean(titikProyek),
                          Boolean(item.titik_lokasi),
                        )
                        const jenisTugas = item.jenis_penugasan || assignment?.jenis_penugasan || ''

                        return (
                          <tr key={item.id_absensi} className="transition hover:bg-slate-50/70 align-top">
                            <td className="px-4 py-3.5 text-center text-slate-400">{index + 1}</td>
                            <td className="px-4 py-3.5">
                              <span className="inline-block rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-800 border border-emerald-200/70">
                                {dayMeta.weekday || 'Hari'}
                              </span>
                              <p className="mt-1 font-semibold text-slate-900">{dayMeta.fullDate}</p>
                            </td>
                            <td className="px-4 py-3.5 space-y-1">
                              <p className="font-bold text-slate-900">
                                {job?.nama_pekerjaan || item.nama_pekerjaan || 'Proyek Lapangan'}
                              </p>
                              <p className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Icon name="location" className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                                <span>{job?.lokasi || item.lokasi_pekerjaan || 'Lokasi Proyek'}</span>
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                                {jenisTugas && (
                                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-600">
                                    {jenisTugas === 'mandiri' ? 'Diambil Mandiri' : 'Ditetapkan Admin'}
                                  </span>
                                )}
                                {(job?.status || item.status_pekerjaan) && (
                                  <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[10px] font-semibold text-blue-700 capitalize">
                                    {String(job?.status || item.status_pekerjaan).replace('_', ' ')}
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 space-y-1">
                              <div className="font-mono text-[11px] text-slate-700">
                                <p>
                                  Masuk:{' '}
                                  <strong className="text-slate-900">
                                    {item.jam_masuk ? item.jam_masuk.slice(0, 5) : '—'}
                                  </strong>
                                </p>
                                <p>
                                  Pulang:{' '}
                                  {item.jam_pulang ? (
                                    <strong className="text-slate-900">{item.jam_pulang.slice(0, 5)}</strong>
                                  ) : (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-bold text-emerald-700">
                                      Sedang Aktif
                                    </span>
                                  )}
                                </p>
                              </div>
                              <p className="font-bold text-emerald-700">
                                Durasi: {item.durasi_format || `${item.durasi_jam || 0} jam`}
                              </p>
                            </td>
                            <td className="px-4 py-3.5 space-y-1.5">
                              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${matchMeta.toneClass}`}>
                                {matchMeta.label}
                              </span>
                              <div className="flex items-center gap-1.5">
                                {item.foto_lokasi && (
                                  <button
                                    type="button"
                                    onClick={() => openSessionDetail(item)}
                                    aria-label={`Lihat foto absen masuk ${dayMeta.label}`}
                                    className="overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                                  >
                                    <img
                                      src={getFileUrl(item.foto_lokasi)}
                                      alt="Foto masuk"
                                      className="h-9 w-12 object-cover"
                                    />
                                  </button>
                                )}
                                {item.foto_pulang && (
                                  <button
                                    type="button"
                                    onClick={() => openSessionDetail(item)}
                                    aria-label={`Lihat foto absen pulang ${dayMeta.label}`}
                                    className="overflow-hidden rounded-md border border-slate-200 bg-slate-100"
                                  >
                                    <img
                                      src={getFileUrl(item.foto_pulang)}
                                      alt="Foto pulang"
                                      className="h-9 w-12 object-cover"
                                    />
                                  </button>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3.5 text-center space-y-1">
                              <StatusBadge status={item.status_verifikasi} />
                              {item.catatan_admin && (
                                <p className="text-[10px] text-rose-700 font-semibold max-w-[160px] mx-auto">
                                  {item.catatan_admin}
                                </p>
                              )}
                            </td>
                            <td className="px-4 py-3.5 text-center">
                              <button
                                type="button"
                                onClick={() => openSessionDetail(item)}
                                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 transition hover:bg-slate-50"
                              >
                                <Icon name="eye" className="h-3.5 w-3.5 text-emerald-600" />
                                <span>Lihat Detail</span>
                              </button>
                            </td>
                          </tr>
                        )
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Ringkasan Akumulasi per Pekerjaan */}
            <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
              <h2 className="text-sm font-bold text-slate-900">
                Ringkasan Jam Kerja Disetujui per Pekerjaan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Rekap total kehadiran dan akumulasi jam kerja Anda pada masing-masing pekerjaan.
              </p>

              <div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {rekapStats.perJobList.length === 0 ? (
                  <p className="text-xs text-slate-400 col-span-full py-4 text-center">
                    Belum ada akumulasi absensi pada pekerjaan manapun.
                  </p>
                ) : (
                  rekapStats.perJobList.map((row) => (
                    <div
                      key={row.id_pekerjaan}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/60 p-4 space-y-2 text-xs"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="font-bold text-slate-900">{row.nama_pekerjaan}</p>
                          <p className="text-[11px] text-slate-500">{row.lokasi}</p>
                        </div>
                        <span className="shrink-0 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800">
                          {row.sesiDisetujui}/{row.totalSesi} Disetujui
                        </span>
                      </div>
                      <div className="flex items-center justify-between pt-1">
                        <span className="text-slate-500">Jam Disetujui:</span>
                        <span className="font-bold text-emerald-700">
                          {row.labelDisetujui} ({row.percentage}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-200">
                        <div
                          className="h-full rounded-full bg-emerald-600 transition-all duration-500"
                          style={{ width: `${row.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
