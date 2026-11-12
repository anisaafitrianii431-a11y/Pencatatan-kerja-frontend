import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import { getAbsensi, verifikasiAbsensi } from '../../services/absensiApi.js'

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

function formatJamMenit(totalMinutes) {
  const safe = Math.round(Number(totalMinutes) || 0)
  if (safe <= 0) return '0j 0m'
  const jam = Math.floor(safe / 60)
  const menit = safe % 60
  return `${jam}j ${menit}m`
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
    eye: (
      <>
        <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    externalLink: (
      <>
        <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
        <polyline points="15 3 21 3 21 9" />
        <line x1="10" y1="14" x2="21" y2="3" />
      </>
    ),
    chart: (
      <>
        <line x1="18" y1="20" x2="18" y2="10" />
        <line x1="12" y1="20" x2="12" y2="4" />
        <line x1="6" y1="20" x2="6" y2="14" />
      </>
    ),
    arrowUpDown: (
      <>
        <path d="m7 15 5 5 5-5" />
        <path d="m7 9 5-5 5 5" />
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
      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Disetujui
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Ditolak
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Menunggu Verifikasi
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
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const paramTab = searchParams.get('tab')
  const paramTanggal = searchParams.get('tanggal')
  const paramPekerjaan = searchParams.get('pekerjaan')
  const paramKaryawan = searchParams.get('karyawan')

  const initialTab = paramTab || (paramTanggal ? 'kehadiran' : paramPekerjaan ? 'riwayat' : 'operasional')

  const [activeTab, setActiveTab] = useState(initialTab) // 'operasional' | 'kehadiran' | 'riwayat'

  // Data states
  const [employees, setEmployees] = useState([])
  const [jobs, setJobs] = useState([])
  const [assignments, setAssignments] = useState([])
  const [attendances, setAttendances] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [notification, setNotification] = useState(null)

  // Filters for Tab A: Operasional
  const [opSearch, setOpSearch] = useState('')
  const [opStatusFilter, setOpStatusFilter] = useState('')
  const [opSort, setOpSort] = useState('terbaru') // 'terbaru' | 'nama_asc' | 'sesi_desc' | 'durasi_desc'

  // Filters for Tab B: Kehadiran
  const [kehadiranDate, setKehadiranDate] = useState(paramTanggal || '')
  const [kehadiranWorkerId, setKehadiranWorkerId] = useState(paramKaryawan || '')
  const [kehadiranCardFilter, setKehadiranCardFilter] = useState('') // '' | 'total_karyawan' | 'karyawan_hadir' | 'belum_absen' | 'menunggu_review' | 'sesi_disetujui' | 'sesi_ditolak'
  const [kehadiranSearch, setKehadiranSearch] = useState('')
  const [kehadiranStatusFilter, setKehadiranStatusFilter] = useState('')

  // Filters for Tab C: Riwayat
  const [searchWorker, setSearchWorker] = useState('')
  const [filterJobId, setFilterJobId] = useState(paramPekerjaan || '')
  const [filterDate, setFilterDate] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  useEffect(() => {
    if (searchParams.get('tanggal')) {
      setActiveTab('kehadiran')
      setKehadiranDate(searchParams.get('tanggal'))
    }
    if (searchParams.get('pekerjaan')) {
      setFilterJobId(searchParams.get('pekerjaan'))
    }
    if (searchParams.get('karyawan')) {
      setKehadiranWorkerId(searchParams.get('karyawan'))
    }
    if (searchParams.get('tab')) {
      setActiveTab(searchParams.get('tab'))
    }
  }, [searchParams])

  // Modal States
  const [selectedJobDetail, setSelectedJobDetail] = useState(null) // Modal Detail Operasional
  const [selectedJobDuration, setSelectedJobDuration] = useState(null) // Modal Detail Total Durasi
  const [selectedSummaryCard, setSelectedSummaryCard] = useState(null) // Modal Detail Kartu Kehadiran
  const [selectedAttendance, setSelectedAttendance] = useState(null) // Modal Detail & Verifikasi Absensi

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

    function handleSyncEvent() {
      loadAllData()
    }

    window.addEventListener('storage', handleSyncEvent)
    window.addEventListener('absensi_updated', handleSyncEvent)

    return () => {
      window.removeEventListener('storage', handleSyncEvent)
      window.removeEventListener('absensi_updated', handleSyncEvent)
    }
  }, [])

  const showNotice = (type, message) => {
    setNotification({ type, message })
    setTimeout(() => setNotification(null), 4000)
  }

  const handleVerify = async (id_absensi, status) => {
    try {
      await verifikasiAbsensi(id_absensi, status)
      showNotice('success', `Status presensi berhasil diubah menjadi "${status}".`)
      setAttendances((prev) =>
        prev.map((item) =>
          item.id_absensi === id_absensi ? { ...item, status_verifikasi: status } : item,
        ),
      )
      if (selectedAttendance && selectedAttendance.id_absensi === id_absensi) {
        setSelectedAttendance((prev) => ({ ...prev, status_verifikasi: status }))
      }
      // Sinkronisasi data ke Dashboard Admin & Modul Penggajian secara otomatis
      window.dispatchEvent(new CustomEvent('absensi_updated'))
      window.dispatchEvent(new CustomEvent('gaji_updated'))
    } catch (err) {
      showNotice('error', err.message || 'Gagal mengubah status verifikasi.')
    }
  }

  // =========================================================================
  // TAB A: DATA OPERASIONAL PEKERJAAN
  // =========================================================================
  const operationalData = useMemo(() => {
    const list = jobs.map((job) => {
      const jobAssignments = assignments.filter((a) => a.id_pekerjaan === job.id_pekerjaan)
      const assignedWorkerIds = new Set(jobAssignments.map((a) => a.id_karyawan))
      const assignedWorkers = employees.filter((e) => assignedWorkerIds.has(e.id_karyawan))

      // Deduplikasi sesi absensi agar sesi yang sama tidak dihitung ganda
      const seenAttIds = new Set()
      const allJobAttendances = []
      for (const att of attendances) {
        if (att.id_pekerjaan === job.id_pekerjaan && !seenAttIds.has(att.id_absensi)) {
          seenAttIds.add(att.id_absensi)
          allJobAttendances.push(att)
        }
      }

      // Sesi absensi valid yang berstatus disetujui saja
      const approvedJobAttendances = allJobAttendances.filter((att) => att.status_verifikasi === 'disetujui')

      // Total durasi merupakan akumulasi sesi absensi valid yang sudah disetujui
      // Sesi yang ditolak atau belum disetujui tidak boleh masuk dalam total durasi yang disetujui
      const totalMenitApproved = Math.round(
        approvedJobAttendances.reduce((acc, curr) => acc + (Number(curr.durasi_menit) || (Number(curr.durasi_jam) * 60) || 0), 0)
      )

      // Hitung kontribusi masing-masing karyawan untuk modal durasi & detail
      const workerContributions = assignedWorkers.map((worker) => {
        const workerApprovedAttendances = approvedJobAttendances.filter(
          (att) => att.id_karyawan === worker.id_karyawan
        )
        const workerMinutes = Math.round(
          workerApprovedAttendances.reduce((acc, curr) => acc + (Number(curr.durasi_menit) || (Number(curr.durasi_jam) * 60) || 0), 0)
        )
        const percentage = totalMenitApproved > 0 ? Math.round((workerMinutes / totalMenitApproved) * 100) : 0
        return {
          worker,
          minutes: workerMinutes,
          labelDurasi: formatJamMenit(workerMinutes),
          percentage: assignedWorkers.length === 1 && workerMinutes > 0 ? 100 : percentage,
          sessionsCount: workerApprovedAttendances.length,
        }
      })

      return {
        ...job,
        workers: assignedWorkers,
        totalWorkers: assignedWorkers.length,
        totalSessions: allJobAttendances.length,
        approvedSessionsCount: approvedJobAttendances.length,
        totalMenitApproved,
        totalDurasiLabel: formatJamMenit(totalMenitApproved),
        workerContributions,
        allJobAttendances,
        approvedJobAttendances,
      }
    })

    // Filter pencarian dan status
    let filtered = list.filter((item) => {
      if (opSearch) {
        const query = opSearch.toLowerCase().trim()
        const matchName = item.nama_pekerjaan?.toLowerCase().includes(query)
        const matchLoc = item.lokasi?.toLowerCase().includes(query)
        const matchId = String(item.id_pekerjaan).includes(query)
        if (!matchName && !matchLoc && !matchId) return false
      }
      if (opStatusFilter && item.status !== opStatusFilter) {
        return false
      }
      return true
    })

    // Pengurutan
    filtered.sort((a, b) => {
      if (opSort === 'nama_asc') return (a.nama_pekerjaan || '').localeCompare(b.nama_pekerjaan || '')
      if (opSort === 'sesi_desc') return b.totalSessions - a.totalSessions
      if (opSort === 'durasi_desc') return b.totalMenitApproved - a.totalMenitApproved
      return b.id_pekerjaan - a.id_pekerjaan // terbaru
    })

    return filtered
  }, [jobs, assignments, employees, attendances, opSearch, opStatusFilter, opSort])

  // =========================================================================
  // TAB B: STATISTIK KEHADIRAN (6 KARTU & DONUT CHART & DAFTAR)
  // =========================================================================
  const kehadiranStats = useMemo(() => {
    let dataset = attendances

    if (kehadiranDate) {
      dataset = dataset.filter((a) => a.tanggal === kehadiranDate)
    }
    if (kehadiranWorkerId) {
      dataset = dataset.filter((a) => String(a.id_karyawan) === String(kehadiranWorkerId))
    }

    // Identifikasi karyawan hadir (unik)
    const presentWorkerIds = new Set(dataset.map((a) => a.id_karyawan))
    const totalPresent = presentWorkerIds.size
    const totalEmployeesCount = employees.length
    const totalAbsent = Math.max(0, totalEmployeesCount - totalPresent)

    const waiting = dataset.filter((a) => a.status_verifikasi === 'menunggu').length
    const approved = dataset.filter((a) => a.status_verifikasi === 'disetujui').length
    const rejected = dataset.filter((a) => a.status_verifikasi === 'ditolak').length
    const totalSessions = dataset.length

    const approvalRate = totalSessions > 0 ? Math.round((approved / totalSessions) * 100) : 0
    const waitingRate = totalSessions > 0 ? Math.round((waiting / totalSessions) * 100) : 0
    const rejectedRate = totalSessions > 0 ? Math.max(0, 100 - approvalRate - waitingRate) : 0

    // SVG Circumference untuk Donut Chart (Radius = 46, Circumference = 2 * PI * 46 ≈ 289.0265)
    const CIRCUMFERENCE = 289.0265
    const approvedLen = totalSessions > 0 ? (approved / totalSessions) * CIRCUMFERENCE : 0
    const waitingLen = totalSessions > 0 ? (waiting / totalSessions) * CIRCUMFERENCE : 0
    const rejectedLen = totalSessions > 0 ? (rejected / totalSessions) * CIRCUMFERENCE : 0
    const waitingOffset = -approvedLen
    const rejectedOffset = -(approvedLen + waitingLen)

    // Data lists for clickable cards
    const presentList = employees.filter((e) => presentWorkerIds.has(e.id_karyawan))
    const absentList = employees.filter((e) => !presentWorkerIds.has(e.id_karyawan))
    const waitingList = dataset.filter((a) => a.status_verifikasi === 'menunggu')
    const approvedList = dataset.filter((a) => a.status_verifikasi === 'disetujui')
    const rejectedList = dataset.filter((a) => a.status_verifikasi === 'ditolak')

    return {
      totalEmployeesCount,
      totalPresent,
      totalAbsent,
      waiting,
      approved,
      rejected,
      totalSessions,
      approvalRate,
      waitingRate,
      rejectedRate,
      approvedLen,
      waitingLen,
      rejectedLen,
      waitingOffset,
      rejectedOffset,
      presentWorkerIds,
      presentList,
      absentList,
      waitingList,
      approvedList,
      rejectedList,
    }
  }, [attendances, employees, kehadiranDate, kehadiranWorkerId])

  // Tabel Daftar Kehadiran Karyawan (Reaktif terhadap pencarian & klik 6 kartu)
  const kehadiranTableEmployees = useMemo(() => {
    return employees.map((emp) => {
      let empAttendances = attendances.filter((a) => a.id_karyawan === emp.id_karyawan)
      if (kehadiranDate) {
        empAttendances = empAttendances.filter((a) => a.tanggal === kehadiranDate)
      }
      const isPresent = empAttendances.length > 0
      const latestAttendance = empAttendances[empAttendances.length - 1] || null
      const totalSesi = empAttendances.length
      const approvedSesi = empAttendances.filter((a) => a.status_verifikasi === 'disetujui').length
      const waitingSesi = empAttendances.filter((a) => a.status_verifikasi === 'menunggu').length
      const rejectedSesi = empAttendances.filter((a) => a.status_verifikasi === 'ditolak').length

      const totalMenitDisetujui = empAttendances
        .filter((a) => a.status_verifikasi === 'disetujui')
        .reduce((acc, curr) => acc + (Number(curr.durasi_menit) || (Number(curr.durasi_jam) * 60) || 0), 0)

      return {
        ...emp,
        isPresent,
        latestAttendance,
        totalSesi,
        approvedSesi,
        waitingSesi,
        rejectedSesi,
        totalMenitDisetujui,
        durasiLabel: formatJamMenit(totalMenitDisetujui),
        empAttendances,
      }
    }).filter((item) => {
      // 1. Filter dari klik 6 kartu
      if (kehadiranCardFilter === 'karyawan_hadir' && !item.isPresent) return false
      if (kehadiranCardFilter === 'belum_absen' && item.isPresent) return false
      if (kehadiranCardFilter === 'menunggu_review' && item.waitingSesi === 0) return false
      if (kehadiranCardFilter === 'sesi_disetujui' && item.approvedSesi === 0) return false
      if (kehadiranCardFilter === 'sesi_ditolak' && item.rejectedSesi === 0) return false

      // 2. Filter dropdown status kehadiran
      if (kehadiranStatusFilter === 'hadir' && !item.isPresent) return false
      if (kehadiranStatusFilter === 'belum_absen' && item.isPresent) return false
      if (kehadiranStatusFilter === 'menunggu' && item.waitingSesi === 0) return false
      if (kehadiranStatusFilter === 'disetujui' && item.approvedSesi === 0) return false
      if (kehadiranStatusFilter === 'ditolak' && item.rejectedSesi === 0) return false

      // 3. Filter pencarian teks
      if (kehadiranSearch) {
        const q = kehadiranSearch.toLowerCase().trim()
        const matchName = item.nama?.toLowerCase().includes(q)
        const matchCode = (item.kode_karyawan || '')?.toLowerCase().includes(q)
        const matchPos = item.jabatan?.toLowerCase().includes(q)
        if (!matchName && !matchCode && !matchPos) return false
      }

      // 4. Filter dropdown karyawan spesifik
      if (kehadiranWorkerId && String(item.id_karyawan) !== String(kehadiranWorkerId)) {
        return false
      }

      return true
    })
  }, [employees, attendances, kehadiranDate, kehadiranCardFilter, kehadiranStatusFilter, kehadiranSearch, kehadiranWorkerId])

  // =========================================================================
  // TAB C: RIWAYAT ABSENSI
  // =========================================================================
  const filteredAttendances = useMemo(() => {
    return attendances.filter((att) => {
      if (searchWorker) {
        const query = searchWorker.toLowerCase().trim()
        const worker = employees.find((e) => e.id_karyawan === att.id_karyawan)
        const job = jobs.find((j) => j.id_pekerjaan === att.id_pekerjaan)
        const matchName = (worker?.nama || att.nama_karyawan || '')?.toLowerCase().includes(query)
        const matchCode = (worker?.kode_karyawan || att.kode_karyawan || '')?.toLowerCase().includes(query)
        const matchId = String(att.id_karyawan).includes(query)
        const matchJob = (job?.nama_pekerjaan || att.nama_pekerjaan || '')?.toLowerCase().includes(query)
        if (!matchName && !matchCode && !matchId && !matchJob) return false
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
  }, [attendances, searchWorker, filterJobId, filterDate, filterStatus, employees, jobs])

  return (
    <div className="admin-theme min-h-screen bg-slate-50 text-slate-800">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ============================================================== */}
        {/* HEADER UTAMA: JUDUL, DESKRIPSI & TOMBOL SEGARKAN */}
        {/* ============================================================== */}
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

        {/* Notifikasi Alert */}
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

        {/* ============================================================== */}
        {/* TAB NAVIGASI HORIZONTAL: TEPAT DI BAWAH JUDUL & DESKRIPSI */}
        {/* ============================================================== */}
        <div className="mb-6 border-b border-slate-200">
          <div className="flex gap-2 sm:gap-4 overflow-x-auto scrollbar-none">
            <button
              type="button"
              onClick={() => setActiveTab('operasional')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'operasional'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="briefcase" className="h-4 w-4" />
              <span>A. Jam Kerja Proyek</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === 'operasional' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {jobs.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('kehadiran')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'kehadiran'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="users" className="h-4 w-4" />
              <span>B. Monitoring Kehadiran Harian</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === 'kehadiran' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {employees.length}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('riwayat')}
              className={`flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-bold whitespace-nowrap transition ${
                activeTab === 'riwayat'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Icon name="history" className="h-4 w-4" />
              <span>C. Verifikasi & Riwayat Presensi</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                activeTab === 'riwayat' ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-600'
              }`}>
                {attendances.length}
              </span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* SUBSECTION A: OPERASIONAL (TABEL PROFESIONAL PEKERJAAN) */}
        {/* ============================================================== */}
        {activeTab === 'operasional' && (
          <div className="space-y-6">
            {/* Filter & Toolbar Operasional */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm lg:flex-row lg:items-center lg:justify-between">
              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-3 lg:flex lg:flex-wrap lg:items-center">
                {/* Search */}
                <div className="relative min-w-[220px]">
                  <Icon name="search" className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={opSearch}
                    onChange={(e) => setOpSearch(e.target.value)}
                    placeholder="Cari nama / lokasi pekerjaan..."
                    className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                  />
                </div>

                {/* Filter Status */}
                <select
                  value={opStatusFilter}
                  onChange={(e) => setOpStatusFilter(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Status Pekerjaan</option>
                  <option value="belum_mulai">Belum Mulai</option>
                  <option value="berjalan">Berjalan</option>
                  <option value="selesai">Selesai</option>
                </select>

                {/* Sorting */}
                <select
                  value={opSort}
                  onChange={(e) => setOpSort(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="terbaru">Urutkan: Pekerjaan Terbaru</option>
                  <option value="nama_asc">Nama Pekerjaan (A-Z)</option>
                  <option value="sesi_desc">Sesi Terbanyak</option>
                  <option value="durasi_desc">Durasi Terpanjang</option>
                </select>
              </div>

              {(opSearch || opStatusFilter || opSort !== 'terbaru') && (
                <button
                  type="button"
                  onClick={() => {
                    setOpSearch('')
                    setOpStatusFilter('')
                    setOpSort('terbaru')
                  }}
                  className="self-start text-xs font-semibold text-blue-600 hover:text-blue-800 lg:self-auto"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* TABEL PROFESIONAL OPERASIONAL PEKERJAAN */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                    <tr>
                      <th className="px-4 py-3.5 w-12 text-center">Nomor</th>
                      <th className="px-4 py-3.5 min-w-[240px]">Nama Pekerjaan</th>
                      <th className="px-4 py-3.5 min-w-[130px] text-center">Jumlah Karyawan</th>
                      <th className="px-4 py-3.5 min-w-[140px] text-center">Jumlah Sesi Absensi</th>
                      <th className="px-4 py-3.5 min-w-[150px] text-center">Total Durasi</th>
                      <th className="px-4 py-3.5 min-w-[130px] text-center">Status Pekerjaan</th>
                      <th className="px-4 py-3.5 min-w-[110px] text-center">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {operationalData.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-10 text-center text-slate-400">
                          Tidak ditemukan data pekerjaan yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      operationalData.map((job, index) => (
                        <tr
                          key={job.id_pekerjaan}
                          className="transition hover:bg-slate-50/70 cursor-pointer"
                          onClick={() => setSelectedJobDetail(job)}
                        >
                          <td className="px-4 py-3 text-center text-slate-400 font-mono">
                            {index + 1}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col gap-0.5">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {job.nama_pekerjaan}
                                </span>
                                <span className="rounded bg-slate-100 px-1.5 py-0.2 font-mono text-[10px] text-slate-600">
                                  #{job.id_pekerjaan}
                                </span>
                              </div>
                              <span className="text-[11px] text-slate-500 flex items-center gap-1">
                                <Icon name="location" className="h-3 w-3 text-slate-400 shrink-0" />
                                {job.lokasi || 'Lokasi Belum Disetel'}
                              </span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="inline-flex items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700">
                              <Icon name="users" className="h-3.5 w-3.5" />
                              {job.totalWorkers} Orang
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="font-semibold text-slate-800">
                              {job.totalSessions} sesi
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            {/* Total durasi akumulasi sesi absensi valid yang sudah disetujui */}
                            <span
                              onClick={(e) => {
                                e.stopPropagation()
                                setSelectedJobDuration(job)
                              }}
                              title="Akumulasi sesi valid yang disetujui. Klik untuk rincian."
                              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1 text-xs font-bold text-blue-700 font-mono hover:bg-blue-100 cursor-pointer transition shadow-2xs"
                            >
                              <Icon name="clock" className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                              <span>{job.totalDurasiLabel}</span>
                            </span>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <JobStatusBadge status={job.status} />
                          </td>
                          <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                            <button
                              type="button"
                              onClick={() => setSelectedJobDetail(job)}
                              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition shadow-2xs"
                            >
                              <Icon name="eye" className="h-3.5 w-3.5 text-blue-600" />
                              Detail
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION B: KEHADIRAN (6 KARTU RINGKASAN KLIK & DIAGRAM) */}
        {/* ============================================================== */}
        {activeTab === 'kehadiran' && (
          <div className="space-y-6">
            {/* Filter Tanggal & Karyawan Kehadiran */}
            <div className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-2.5">
                <span className="text-xs font-bold text-slate-600">Filter Data:</span>
                <input
                  type="date"
                  value={kehadiranDate}
                  onChange={(e) => setKehadiranDate(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={() => setKehadiranDate(new Date().toISOString().slice(0, 10))}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
                >
                  Hari Ini
                </button>
                <select
                  value={kehadiranWorkerId}
                  onChange={(e) => setKehadiranWorkerId(e.target.value)}
                  className="rounded-xl border border-slate-200 px-3 py-1.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                >
                  <option value="">Semua Karyawan</option>
                  {employees.map((emp) => (
                    <option key={emp.id_karyawan} value={emp.id_karyawan}>
                      {emp.nama} ({emp.jabatan || 'Teknisi'})
                    </option>
                  ))}
                </select>
              </div>

              {(kehadiranDate || kehadiranWorkerId) && (
                <button
                  type="button"
                  onClick={() => {
                    setKehadiranDate('')
                    setKehadiranWorkerId('')
                  }}
                  className="self-start text-xs font-semibold text-blue-600 hover:text-blue-800 sm:self-auto"
                >
                  Reset Filter
                </button>
              )}
            </div>

            {/* 6 KARTU RINGKASAN KEHADIRAN (KLIK UNTUK FILTER DAFTAR KEHADIRAN) */}
            <div className="grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-6">
              {/* Kartu 1: Total Karyawan */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'total_karyawan' ? '' : 'total_karyawan'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'total_karyawan'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/30'
                    : 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-slate-500">Total Karyawan</p>
                  <Icon name="users" className="h-4 w-4 text-blue-500 group-hover:scale-110 transition" />
                </div>
                <p className="mt-2 text-2xl font-bold text-slate-900">{kehadiranStats.totalEmployeesCount}</p>
                <p className="mt-1 text-[11px] font-semibold text-blue-600">
                  {kehadiranCardFilter === 'total_karyawan' ? '● Filter Aktif' : 'Semua karyawan →'}
                </p>
              </div>

              {/* Kartu 2: Karyawan Hadir */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'karyawan_hadir' ? '' : 'karyawan_hadir'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'karyawan_hadir'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                    : 'border-emerald-100 bg-emerald-50/40 hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-800">Karyawan Hadir</p>
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-700">{kehadiranStats.totalPresent}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                  {kehadiranCardFilter === 'karyawan_hadir' ? '● Filter Aktif' : 'Tampilkan hadir →'}
                </p>
              </div>

              {/* Kartu 3: Belum Absen */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'belum_absen' ? '' : 'belum_absen'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'belum_absen'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30'
                    : 'border-amber-100 bg-amber-50/40 hover:border-amber-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-800">Belum Absen</p>
                  <Icon name="clock" className="h-4 w-4 text-amber-500 group-hover:scale-110 transition" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-700">{kehadiranStats.totalAbsent}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-600">
                  {kehadiranCardFilter === 'belum_absen' ? '● Filter Aktif' : 'Tampilkan absen →'}
                </p>
              </div>

              {/* Kartu 4: Menunggu Review */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'menunggu_review' ? '' : 'menunggu_review'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'menunggu_review'
                    ? 'border-amber-500 bg-amber-50/70 ring-2 ring-amber-500/30'
                    : 'border-amber-200 bg-white hover:border-amber-400 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-amber-700">Menunggu Review</p>
                  <span className="h-2 w-2 rounded-full bg-amber-500" />
                </div>
                <p className="mt-2 text-2xl font-bold text-amber-600">{kehadiranStats.waiting}</p>
                <p className="mt-1 text-[11px] font-semibold text-amber-700">
                  {kehadiranCardFilter === 'menunggu_review' ? '● Filter Aktif' : 'Perlu review →'}
                </p>
              </div>

              {/* Kartu 5: Sesi Disetujui */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'sesi_disetujui' ? '' : 'sesi_disetujui'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'sesi_disetujui'
                    ? 'border-emerald-500 bg-emerald-50/70 ring-2 ring-emerald-500/30'
                    : 'border-slate-200 bg-white hover:border-emerald-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-emerald-700">Sesi Disetujui</p>
                  <Icon name="check" className="h-4 w-4 text-emerald-500 group-hover:scale-110 transition" />
                </div>
                <p className="mt-2 text-2xl font-bold text-emerald-600">{kehadiranStats.approved}</p>
                <p className="mt-1 text-[11px] font-semibold text-emerald-600">
                  {kehadiranCardFilter === 'sesi_disetujui' ? '● Filter Aktif' : 'Sesi valid →'}
                </p>
              </div>

              {/* Kartu 6: Sesi Ditolak */}
              <div
                onClick={() => setKehadiranCardFilter((prev) => (prev === 'sesi_ditolak' ? '' : 'sesi_ditolak'))}
                className={`rounded-2xl border p-4 shadow-sm transition cursor-pointer group ${
                  kehadiranCardFilter === 'sesi_ditolak'
                    ? 'border-rose-500 bg-rose-50/70 ring-2 ring-rose-500/30'
                    : 'border-slate-200 bg-white hover:border-rose-300 hover:shadow-md'
                }`}
              >
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-rose-700">Sesi Ditolak</p>
                  <Icon name="cross" className="h-4 w-4 text-rose-500 group-hover:scale-110 transition" />
                </div>
                <p className="mt-2 text-2xl font-bold text-rose-600">{kehadiranStats.rejected}</p>
                <p className="mt-1 text-[11px] font-semibold text-rose-600">
                  {kehadiranCardFilter === 'sesi_ditolak' ? '● Filter Aktif' : 'Sesi ditolak →'}
                </p>
              </div>
            </div>

            {/* DIAGRAM DONUT RASIO STATUS VERIFIKASI & TABEL DAFTAR KEHADIRAN KARYAWAN */}
            <div className="grid gap-6 lg:grid-cols-12">
              {/* Card Rasio Donut Chart */}
              <div className="lg:col-span-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Rasio Status Verifikasi Absensi</h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {kehadiranDate
                      ? `Persentase verifikasi kehadiran tanggal ${formatDate(kehadiranDate)}.`
                      : 'Persentase persetujuan kehadiran berdasarkan data absensi yang terpilih.'}
                  </p>

                  <div className="mt-6 flex flex-col items-center justify-around gap-6 sm:flex-row">
                    {/* SVG Multi-Segment Donut Chart */}
                    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
                      <svg className="h-36 w-36" viewBox="0 0 120 120">
                        <circle
                          cx="60"
                          cy="60"
                          r="46"
                          fill="none"
                          stroke="#f1f5f9"
                          strokeWidth="11"
                        />
                        {kehadiranStats.totalSessions > 0 && (
                          <g transform="rotate(-90 60 60)">
                            {kehadiranStats.approvedLen > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="46"
                                fill="none"
                                stroke="#10b981"
                                strokeWidth="11"
                                strokeDasharray={`${kehadiranStats.approvedLen} 289.0265`}
                                strokeDashoffset={0}
                                strokeLinecap="butt"
                                className="transition-all duration-500 ease-out"
                              >
                                <title>Disetujui: {kehadiranStats.approved} sesi ({kehadiranStats.approvalRate}%)</title>
                              </circle>
                            )}
                            {kehadiranStats.waitingLen > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="46"
                                fill="none"
                                stroke="#f59e0b"
                                strokeWidth="11"
                                strokeDasharray={`${kehadiranStats.waitingLen} 289.0265`}
                                strokeDashoffset={kehadiranStats.waitingOffset}
                                strokeLinecap="butt"
                                className="transition-all duration-500 ease-out"
                              >
                                <title>Menunggu Verifikasi: {kehadiranStats.waiting} sesi ({kehadiranStats.waitingRate}%)</title>
                              </circle>
                            )}
                            {kehadiranStats.rejectedLen > 0 && (
                              <circle
                                cx="60"
                                cy="60"
                                r="46"
                                fill="none"
                                stroke="#ef4444"
                                strokeWidth="11"
                                strokeDasharray={`${kehadiranStats.rejectedLen} 289.0265`}
                                strokeDashoffset={kehadiranStats.rejectedOffset}
                                strokeLinecap="butt"
                                className="transition-all duration-500 ease-out"
                              >
                                <title>Ditolak: {kehadiranStats.rejected} sesi ({kehadiranStats.rejectedRate}%)</title>
                              </circle>
                            )}
                          </g>
                        )}
                      </svg>

                      {/* Inner text */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center select-none pointer-events-none">
                        {kehadiranStats.totalSessions === 0 ? (
                          <>
                            <span className="text-2xl font-bold text-slate-400">0%</span>
                            <span className="text-[10px] font-semibold text-slate-400">Belum Ada Sesi</span>
                          </>
                        ) : kehadiranStats.approved > 0 ? (
                          <>
                            <span className="text-3xl font-extrabold tracking-tight text-slate-900">
                              {kehadiranStats.approvalRate}%
                            </span>
                            <span className="text-xs font-bold text-emerald-600">Disetujui</span>
                          </>
                        ) : kehadiranStats.waiting > 0 ? (
                          <>
                            <span className="text-3xl font-extrabold tracking-tight text-amber-600">
                              {kehadiranStats.waitingRate}%
                            </span>
                            <span className="text-xs font-bold text-amber-700">Menunggu</span>
                          </>
                        ) : (
                          <>
                            <span className="text-3xl font-extrabold tracking-tight text-rose-600">
                              {kehadiranStats.rejectedRate}%
                            </span>
                            <span className="text-xs font-bold text-rose-700">Ditolak</span>
                          </>
                        )}
                      </div>
                    </div>

                    {/* Breakdown List */}
                    <div className="w-full space-y-1 sm:w-1/2">
                      <div
                        onClick={() => setKehadiranCardFilter((prev) => (prev === 'sesi_disetujui' ? '' : 'sesi_disetujui'))}
                        className="flex items-center justify-between border-b border-slate-100 py-2.5 text-xs sm:text-sm cursor-pointer hover:bg-slate-50/70 rounded-lg px-2 transition group"
                        title="Klik untuk filter sesi disetujui"
                      >
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 shrink-0" />
                          Disetujui
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition">
                          {kehadiranStats.approved} sesi
                        </span>
                      </div>

                      <div
                        onClick={() => setKehadiranCardFilter((prev) => (prev === 'menunggu_review' ? '' : 'menunggu_review'))}
                        className="flex items-center justify-between border-b border-slate-100 py-2.5 text-xs sm:text-sm cursor-pointer hover:bg-slate-50/70 rounded-lg px-2 transition group"
                        title="Klik untuk filter sesi menunggu review"
                      >
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-amber-500 shrink-0" />
                          Menunggu
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-amber-700 transition">
                          {kehadiranStats.waiting} sesi
                        </span>
                      </div>

                      <div
                        onClick={() => setKehadiranCardFilter((prev) => (prev === 'sesi_ditolak' ? '' : 'sesi_ditolak'))}
                        className="flex items-center justify-between border-b border-slate-100 py-2.5 text-xs sm:text-sm cursor-pointer hover:bg-slate-50/70 rounded-lg px-2 transition group"
                        title="Klik untuk filter sesi ditolak"
                      >
                        <span className="flex items-center gap-2.5 font-medium text-slate-700">
                          <span className="h-2.5 w-2.5 rounded-full bg-rose-500 shrink-0" />
                          Ditolak
                        </span>
                        <span className="font-bold text-slate-900 group-hover:text-rose-700 transition">
                          {kehadiranStats.rejected} sesi
                        </span>
                      </div>

                      <div className="flex items-center justify-between pt-3 text-xs sm:text-sm px-2">
                        <span className="font-semibold text-slate-800">Total Sesi</span>
                        <span className="font-bold text-blue-600 font-mono">
                          {kehadiranStats.totalSessions} sesi
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 mt-4 text-center">
                  <button
                    type="button"
                    onClick={() => setSelectedSummaryCard('total_karyawan')}
                    className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition"
                  >
                    Buka Rincian Dialog Kehadiran →
                  </button>
                </div>
              </div>

              {/* Card Tabel Daftar Kehadiran Karyawan */}
              <div className="lg:col-span-7 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
                <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                      <span>Daftar Kehadiran Karyawan</span>
                      <span className="rounded-full bg-blue-100 px-2 py-0.2 text-[10px] font-bold text-blue-700">
                        {kehadiranTableEmployees.length}
                      </span>
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      {kehadiranDate ? `Tanggal: ${formatDate(kehadiranDate)}` : 'Kumulatif Seluruh Tanggal'}
                      {kehadiranCardFilter && (
                        <span className="ml-1 font-semibold text-blue-600">
                          • Filter: {kehadiranCardFilter.replace('_', ' ')}
                        </span>
                      )}
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <div className="relative min-w-[150px]">
                      <Icon name="search" className="absolute left-2.5 top-2 h-3.5 w-3.5 text-slate-400" />
                      <input
                        type="text"
                        value={kehadiranSearch}
                        onChange={(e) => setKehadiranSearch(e.target.value)}
                        placeholder="Cari nama / ID..."
                        className="w-full rounded-lg border border-slate-200 py-1 pl-8 pr-2 text-xs text-slate-800 placeholder-slate-400 focus:border-blue-500 focus:outline-none"
                      />
                    </div>

                    {/* Filter Status */}
                    <select
                      value={kehadiranStatusFilter}
                      onChange={(e) => setKehadiranStatusFilter(e.target.value)}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
                    >
                      <option value="">Semua Status</option>
                      <option value="hadir">Hadir</option>
                      <option value="belum_absen">Belum Absen</option>
                      <option value="menunggu">Menunggu Review</option>
                      <option value="disetujui">Sesi Disetujui</option>
                      <option value="ditolak">Sesi Ditolak</option>
                    </select>

                    {(kehadiranSearch || kehadiranStatusFilter || kehadiranCardFilter) && (
                      <button
                        type="button"
                        onClick={() => {
                          setKehadiranSearch('')
                          setKehadiranStatusFilter('')
                          setKehadiranCardFilter('')
                        }}
                        className="text-[11px] font-semibold text-rose-600 hover:text-rose-800 shrink-0"
                        title="Reset pencarian & filter"
                      >
                        Reset
                      </button>
                    )}
                  </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto max-h-[380px] overflow-y-auto pr-1">
                  <table className="w-full text-left text-xs">
                    <thead className="sticky top-0 z-10 border-b border-slate-200 bg-slate-50 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                      <tr>
                        <th className="px-3 py-2 w-10 text-center">No</th>
                        <th className="px-3 py-2 min-w-[150px]">Karyawan</th>
                        <th className="px-3 py-2 min-w-[90px] text-center">ID</th>
                        <th className="px-3 py-2 min-w-[100px] text-center">Presensi</th>
                        <th className="px-3 py-2 min-w-[120px] text-center">Sesi & Status</th>
                        <th className="px-3 py-2 min-w-[80px] text-center">Durasi</th>
                        <th className="px-3 py-2 min-w-[70px] text-center">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                      {kehadiranTableEmployees.length === 0 ? (
                        <tr>
                          <td colSpan={7} className="py-8 text-center text-slate-400 text-xs">
                            Tidak ada karyawan yang cocok dengan kriteria filter.
                          </td>
                        </tr>
                      ) : (
                        kehadiranTableEmployees.map((emp, idx) => (
                          <tr key={emp.id_karyawan} className="hover:bg-slate-50/70 transition">
                            <td className="px-3 py-2.5 text-center text-slate-400 font-mono text-[11px]">
                              {idx + 1}
                            </td>
                            <td className="px-3 py-2.5">
                              <div className="flex items-center gap-2">
                                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-blue-100 text-[10px] font-bold text-blue-700">
                                  {emp.nama.charAt(0)}
                                </span>
                                <div className="min-w-0">
                                  <button
                                    type="button"
                                    onClick={() => navigate(`/admin/karyawan?highlight=${emp.id_karyawan}`)}
                                    className="font-bold text-slate-900 hover:text-blue-600 transition truncate cursor-pointer text-left block"
                                    title="Lihat profil karyawan"
                                  >
                                    {emp.nama}
                                  </button>
                                  <p className="text-[10px] text-slate-400">{emp.jabatan || 'Teknisi'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                                {emp.kode_karyawan || `KARY${String(emp.id_karyawan).padStart(3, '0')}`}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              <span
                                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                                  emp.isPresent
                                    ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                                    : 'bg-slate-100 text-slate-500'
                                }`}
                              >
                                <span className={`h-1.5 w-1.5 rounded-full ${emp.isPresent ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                                {emp.isPresent ? 'Hadir' : 'Belum Absen'}
                              </span>
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {emp.totalSesi === 0 ? (
                                <span className="text-slate-300 font-mono text-[11px]">—</span>
                              ) : (
                                <div className="flex items-center justify-center gap-1">
                                  {emp.approvedSesi > 0 && (
                                    <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[9px] font-bold text-emerald-700" title={`${emp.approvedSesi} sesi disetujui`}>
                                      ✓ {emp.approvedSesi}
                                    </span>
                                  )}
                                  {emp.waitingSesi > 0 && (
                                    <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[9px] font-bold text-amber-700" title={`${emp.waitingSesi} sesi menunggu`}>
                                      ⏳ {emp.waitingSesi}
                                    </span>
                                  )}
                                  {emp.rejectedSesi > 0 && (
                                    <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[9px] font-bold text-rose-700" title={`${emp.rejectedSesi} sesi ditolak`}>
                                      ✕ {emp.rejectedSesi}
                                    </span>
                                  )}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-center font-mono font-bold text-blue-600 text-[11px]">
                              {emp.durasiLabel}
                            </td>
                            <td className="px-3 py-2.5 text-center">
                              {emp.latestAttendance ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const job = jobs.find((j) => j.id_pekerjaan === emp.latestAttendance.id_pekerjaan)
                                    setSelectedAttendance({ ...emp.latestAttendance, emp, job })
                                  }}
                                  className="rounded border border-slate-200 bg-white px-2 py-0.5 text-[10px] font-semibold text-slate-700 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition shadow-2xs"
                                >
                                  Detail
                                </button>
                              ) : (
                                <span className="text-slate-300 text-[10px]">—</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* SUBSECTION C: RIWAYAT ABSENSI (TABEL DETAIL DENGAN AKSI) */}
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
                  <option value="menunggu">Menunggu Verifikasi</option>
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
                      <th className="px-4 py-3.5 w-12 text-center">Nomor</th>
                      <th className="px-4 py-3.5">Karyawan</th>
                      <th className="px-4 py-3.5">ID Karyawan</th>
                      <th className="px-4 py-3.5">Pekerjaan</th>
                      <th className="px-4 py-3.5">Tanggal</th>
                      <th className="px-4 py-3.5">Jam Masuk</th>
                      <th className="px-4 py-3.5">Jam Pulang</th>
                      <th className="px-4 py-3.5">Durasi</th>
                      <th className="px-4 py-3.5">Status Verifikasi</th>
                      <th className="px-4 py-3.5 text-center">Aksi Verifikasi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                    {filteredAttendances.length === 0 ? (
                      <tr>
                        <td colSpan={10} className="py-10 text-center text-slate-400">
                          Tidak ditemukan riwayat absensi yang cocok dengan filter.
                        </td>
                      </tr>
                    ) : (
                      filteredAttendances.map((item, index) => {
                        const emp = employees.find((e) => e.id_karyawan === item.id_karyawan)
                        const job = jobs.find((j) => j.id_pekerjaan === item.id_pekerjaan)

                        return (
                          <tr
                            key={item.id_absensi}
                            className="transition hover:bg-slate-50/70 cursor-pointer"
                            onClick={() => setSelectedAttendance({ ...item, emp, job })}
                          >
                            <td className="px-4 py-3 text-center text-slate-400 font-mono">{index + 1}</td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xs font-bold text-blue-700">
                                  {(emp?.nama || item.nama_karyawan || 'P').charAt(0)}
                                </span>
                                <div>
                                  <p
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/admin/karyawan?highlight=${item.id_karyawan}`)
                                    }}
                                    className="font-bold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                                    title="Lihat profil karyawan"
                                  >
                                    {emp?.nama || item.nama_karyawan || 'Karyawan'}
                                  </p>
                                  <p className="text-[10px] text-slate-400">{emp?.jabatan || item.jabatan || 'Teknisi'}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-3">
                              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono text-[11px] font-semibold text-blue-700 border border-blue-200">
                                {emp?.kode_karyawan || item.kode_karyawan || `KARY${String(item.id_karyawan).padStart(3, '0')}`}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <p
                                onClick={(e) => {
                                  e.stopPropagation()
                                  navigate(`/admin/pekerjaan?highlight=${item.id_pekerjaan}`)
                                }}
                                className="font-semibold text-slate-900 hover:text-blue-600 transition cursor-pointer"
                                title="Lihat detail proyek"
                              >
                                {job?.nama_pekerjaan || item.nama_pekerjaan || 'Proyek'}
                              </p>
                              <p className="text-[10px] text-slate-400">{job?.lokasi || item.lokasi || 'Lokasi Proyek'}</p>
                            </td>
                            <td className="px-4 py-3 font-semibold text-slate-900">
                              {formatDate(item.tanggal)}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono">
                              {item.jam_masuk ? item.jam_masuk.slice(0, 5) : '—'}
                            </td>
                            <td className="px-4 py-3 text-slate-600 font-mono">
                              {item.jam_pulang ? (
                                item.jam_pulang.slice(0, 5)
                              ) : (
                                <span className="rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                                  Aktif
                                </span>
                              )}
                            </td>
                            <td className="px-4 py-3 font-bold text-blue-600">
                              {item.durasi_format || formatJamMenit(Number(item.durasi_menit) || (Number(item.durasi_jam) * 60))}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={item.status_verifikasi} />
                            </td>
                            <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  title="Lihat Detail Absensi & Lokasi GPS"
                                  onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                  className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-50 transition shadow-2xs"
                                >
                                  Detail
                                </button>
                                {item.status_verifikasi === 'menunggu' ? (
                                  <>
                                    <button
                                      type="button"
                                      title="Setujui Cepat"
                                      onClick={() => handleVerify(item.id_absensi, 'disetujui')}
                                      className="rounded-lg bg-emerald-50 px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100 transition shadow-2xs"
                                    >
                                      Setujui
                                    </button>
                                    <button
                                      type="button"
                                      title="Tolak Cepat"
                                      onClick={() => handleVerify(item.id_absensi, 'ditolak')}
                                      className="rounded-lg bg-rose-50 px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100 transition shadow-2xs"
                                    >
                                      Tolak
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    type="button"
                                    title="Ubah Status Verifikasi"
                                    onClick={() => setSelectedAttendance({ ...item, emp, job })}
                                    className="rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 transition shadow-2xs"
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

        {/* ============================================================== */}
        {/* MODAL 1: DETAIL OPERASIONAL PEKERJAAN */}
        {/* ============================================================== */}
        {selectedJobDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <span>Detail Operasional Pekerjaan</span>
                    <span className="font-mono text-xs rounded bg-slate-100 px-2 py-0.5 text-slate-600">
                      #{selectedJobDetail.id_pekerjaan}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">{selectedJobDetail.nama_pekerjaan}</p>
                </div>
                <button
                  onClick={() => setSelectedJobDetail(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Icon name="cross" className="h-5 w-5" />
                </button>
              </div>

              {/* Grid Info Pekerjaan */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-slate-400 block font-medium">Lokasi Pekerjaan</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1 mt-0.5">
                    <Icon name="location" className="h-3.5 w-3.5 text-blue-600" />
                    {selectedJobDetail.lokasi || 'Belum Disetel'}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-slate-400 block font-medium">Status Pekerjaan</span>
                  <div className="mt-1">
                    <JobStatusBadge status={selectedJobDetail.status} />
                  </div>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-slate-400 block font-medium">Jadwal Tanggal Mulai</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(selectedJobDetail.tanggal_mulai)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 p-3 bg-slate-50/50">
                  <span className="text-slate-400 block font-medium">Batas Waktu / Target Selesai</span>
                  <span className="font-semibold text-slate-800 mt-0.5 block">
                    {formatDate(selectedJobDetail.target_selesai)}
                  </span>
                </div>
              </div>

              {/* Deskripsi */}
              {selectedJobDetail.deskripsi && (
                <div className="rounded-xl border border-slate-100 p-3 text-xs bg-slate-50/50">
                  <span className="text-slate-400 block font-medium">Deskripsi Pekerjaan</span>
                  <p className="mt-1 text-slate-700 leading-relaxed">{selectedJobDetail.deskripsi}</p>
                </div>
              )}

              {/* Rincian Statistik */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-400 block">Total Pekerja</span>
                  <span className="text-lg font-bold text-slate-900">{selectedJobDetail.totalWorkers} org</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-400 block">Sesi Tercatat</span>
                  <span className="text-lg font-bold text-slate-900">{selectedJobDetail.totalSessions} sesi</span>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-400 block">Total Durasi</span>
                  <span className="text-lg font-bold text-blue-600">{selectedJobDetail.totalDurasiLabel}</span>
                </div>
              </div>

              {/* Daftar Karyawan Yang Ditugaskan & Kontribusi Durasi */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Icon name="users" className="h-4 w-4 text-blue-600" />
                    Karyawan Ditugaskan & Kontribusi Durasi ({selectedJobDetail.workers.length})
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Berdasarkan Sesi Disetujui</span>
                </div>

                <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                  {selectedJobDetail.workers.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-2">Belum ada karyawan yang ditugaskan pada pekerjaan ini.</p>
                  ) : (
                    (selectedJobDetail.workerContributions || []).map((c) => {
                      const w = c.worker
                      return (
                        <div
                          key={w.id_karyawan}
                          className="rounded-xl border border-slate-200 bg-slate-50/50 p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-100 text-[11px] font-bold text-blue-700">
                                {w.nama.charAt(0)}
                              </span>
                              <div>
                                <div className="flex items-center gap-1.5">
                                  <span className="font-bold text-slate-900">{w.nama}</span>
                                  <span className="rounded bg-blue-50 px-1.5 py-0.2 font-mono text-[10px] font-semibold text-blue-700 border border-blue-200">
                                    {w.kode_karyawan || `KARY${String(w.id_karyawan).padStart(3, '0')}`}
                                  </span>
                                </div>
                                <span className="text-slate-400 text-[10px] block">{w.jabatan || 'Teknisi'} • {w.no_hp || '—'}</span>
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="font-mono font-bold text-slate-900 text-xs">
                                {c.labelDurasi}
                              </span>
                              <span className="ml-1.5 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">
                                {c.percentage}%
                              </span>
                              <span className="block text-[10px] text-slate-400 mt-0.5">
                                {c.sessionsCount} sesi valid
                              </span>
                            </div>
                          </div>
                          {/* Progress bar kontribusi */}
                          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-blue-600 transition-all duration-500"
                              style={{ width: `${c.percentage}%` }}
                            />
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                <p className="text-[10px] text-slate-400 italic">
                  * Persentase kontribusi dihitung dari: (Durasi disetujui karyawan / Total durasi disetujui proyek) × 100%.
                </p>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobDetail(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: DETAIL TOTAL DURASI KERJA (KONTRIBUSI & GRAFIK BATANG) */}
        {/* ============================================================== */}
        {selectedJobDuration && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-5">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                    <Icon name="chart" className="h-5 w-5 text-blue-600" />
                    <span>Detail Total Durasi Kerja</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {selectedJobDuration.nama_pekerjaan} (#{selectedJobDuration.id_pekerjaan})
                  </p>
                </div>
                <button
                  onClick={() => setSelectedJobDuration(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Icon name="cross" className="h-5 w-5" />
                </button>
              </div>

              {/* Ringkasan Durasi Proyek */}
              <div className="grid grid-cols-3 gap-3 text-center text-xs">
                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-3">
                  <span className="text-slate-500 block">Total Durasi Terverifikasi</span>
                  <span className="text-xl font-black text-blue-700 mt-0.5 block">
                    {formatJamMenit(selectedJobDuration.totalMenitApproved)}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-400 block">Sesi Disetujui</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {selectedJobDuration.approvedSessionsCount} sesi
                  </span>
                </div>
                <div className="rounded-xl border border-slate-200 p-3">
                  <span className="text-slate-400 block">Kontributor Pekerja</span>
                  <span className="text-xl font-bold text-slate-900 mt-0.5 block">
                    {selectedJobDuration.workers.length} orang
                  </span>
                </div>
              </div>

              {/* GRAFIK BATANG PERBANDINGAN DURASI KERJA SETIAP KARYAWAN */}
              <div className="space-y-3 rounded-2xl border border-slate-200 bg-slate-50/60 p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Icon name="users" className="h-4 w-4 text-blue-600" />
                    Perbandingan Durasi & Kontribusi Karyawan
                  </h4>
                  <span className="text-[11px] text-slate-500 font-medium">Berdasarkan Sesi Disetujui</span>
                </div>

                <div className="space-y-3 pt-1">
                  {selectedJobDuration.workerContributions.length === 0 ? (
                    <p className="text-xs text-slate-400 text-center py-4">Belum ada catatan durasi pada pekerjaan ini.</p>
                  ) : (
                    selectedJobDuration.workerContributions.map((c) => (
                      <div key={c.worker.id_karyawan} className="space-y-1">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                            <span className="h-2 w-2 rounded-full bg-blue-600" />
                            {c.worker.nama} ({c.worker.jabatan || 'Teknisi'})
                          </span>
                          <span className="font-mono text-slate-900 font-bold">
                            {c.labelDurasi}{' '}
                            <span className="text-blue-600 font-semibold">({c.percentage}%)</span>
                          </span>
                        </div>
                        {/* Bar */}
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-blue-600 transition-all duration-700"
                            style={{ width: `${c.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {/* Catatan Edukatif Sesuai Rumus Persentase */}
                <p className="text-[11px] text-slate-500 leading-relaxed border-t border-slate-200 pt-2 italic">
                  * Persentase kontribusi dihitung dengan rumus: (Durasi kerja karyawan / Total durasi seluruh karyawan pada pekerjaan yang sama) × 100%. Nilai ini merupakan perbandingan durasi kehadiran kerja, bukan ukuran tunggal produktivitas.
                </p>
              </div>

              {/* Riwayat Sesi Absensi Sebagai Dasar Perhitungan */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900">
                  Dasar Perhitungan: Sesi Absensi Terverifikasi ({selectedJobDuration.approvedJobAttendances.length})
                </h4>
                <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs">
                    <thead className="border-b border-slate-100 bg-slate-50 text-[10px] uppercase font-bold text-slate-500">
                      <tr>
                        <th className="px-3 py-2">Karyawan</th>
                        <th className="px-3 py-2">Tanggal</th>
                        <th className="px-3 py-2">Jam Masuk - Pulang</th>
                        <th className="px-3 py-2 text-right">Durasi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedJobDuration.approvedJobAttendances.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="py-4 text-center text-slate-400">
                            Belum ada sesi absensi yang disetujui untuk pekerjaan ini.
                          </td>
                        </tr>
                      ) : (
                        selectedJobDuration.approvedJobAttendances.map((item) => (
                          <tr key={item.id_absensi}>
                            <td className="px-3 py-2 font-semibold text-slate-900">
                              {item.nama_karyawan || 'Karyawan'}
                            </td>
                            <td className="px-3 py-2 text-slate-600">{formatDate(item.tanggal)}</td>
                            <td className="px-3 py-2 font-mono text-slate-600">
                              {item.jam_masuk?.slice(0, 5)} - {item.jam_pulang?.slice(0, 5) || 'Aktif'}
                            </td>
                            <td className="px-3 py-2 font-bold text-blue-600 text-right">
                              {item.durasi_format || formatJamMenit(item.durasi_menit)}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedJobDuration(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: DETAIL KARTU KEHADIRAN (KLIK 6 KARTU RINGKASAN) */}
        {/* ============================================================== */}
        {selectedSummaryCard && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {selectedSummaryCard === 'total_karyawan' && 'Daftar Seluruh Karyawan'}
                    {selectedSummaryCard === 'karyawan_hadir' && 'Daftar Karyawan Hadir'}
                    {selectedSummaryCard === 'belum_absen' && 'Daftar Karyawan Belum Absen'}
                    {selectedSummaryCard === 'menunggu_review' && 'Daftar Sesi Menunggu Review Admin'}
                    {selectedSummaryCard === 'sesi_disetujui' && 'Daftar Sesi Absensi Disetujui'}
                    {selectedSummaryCard === 'sesi_ditolak' && 'Daftar Sesi Absensi Ditolak'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {kehadiranDate ? `Filter Tanggal: ${formatDate(kehadiranDate)}` : 'Data Kumulatif Seluruh Tanggal'}
                  </p>
                </div>
                <button
                  onClick={() => setSelectedSummaryCard(null)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                >
                  <Icon name="cross" className="h-5 w-5" />
                </button>
              </div>

              {/* Konten Sesuai Kartu */}
              <div className="max-h-80 overflow-y-auto pr-1">
                {selectedSummaryCard === 'total_karyawan' && (
                  <div className="divide-y divide-slate-100">
                    {employees.map((emp, i) => (
                      <div key={emp.id_karyawan} className="py-2.5 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono text-slate-400 text-[11px] w-6">{i + 1}.</span>
                          <div>
                            <p className="font-bold text-slate-900">{emp.nama}</p>
                            <p className="text-[10px] text-slate-400">{emp.jabatan || 'Teknisi'} • {emp.no_hp || '—'}</p>
                          </div>
                        </div>
                        <span className="font-mono text-slate-500 bg-slate-100 px-2 py-0.5 rounded text-[11px]">
                          #{emp.id_karyawan}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {selectedSummaryCard === 'karyawan_hadir' && (
                  <div className="divide-y divide-slate-100">
                    {kehadiranStats.presentList.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Tidak ada karyawan yang hadir pada tanggal ini.</p>
                    ) : (
                      kehadiranStats.presentList.map((emp, i) => (
                        <div key={emp.id_karyawan} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-slate-400 text-[11px] w-6">{i + 1}.</span>
                            <div>
                              <p className="font-bold text-slate-900">{emp.nama}</p>
                              <p className="text-[10px] text-slate-400">{emp.jabatan || 'Teknisi'}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                            ● Hadir
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {selectedSummaryCard === 'belum_absen' && (
                  <div className="divide-y divide-slate-100">
                    {kehadiranStats.absentList.length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Seluruh karyawan telah hadir dan mencatatkan absensi.</p>
                    ) : (
                      kehadiranStats.absentList.map((emp, i) => (
                        <div key={emp.id_karyawan} className="py-2.5 flex items-center justify-between text-xs">
                          <div className="flex items-center gap-2.5">
                            <span className="font-mono text-slate-400 text-[11px] w-6">{i + 1}.</span>
                            <div>
                              <p className="font-bold text-slate-900">{emp.nama}</p>
                              <p className="text-[10px] text-slate-400">{emp.jabatan || 'Teknisi'}</p>
                            </div>
                          </div>
                          <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[11px] font-semibold text-slate-500">
                            Belum Ada Sesi
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}

                {(selectedSummaryCard === 'menunggu_review' ||
                  selectedSummaryCard === 'sesi_disetujui' ||
                  selectedSummaryCard === 'sesi_ditolak') && (
                  <div className="divide-y divide-slate-100">
                    {(selectedSummaryCard === 'menunggu_review'
                      ? kehadiranStats.waitingList
                      : selectedSummaryCard === 'sesi_disetujui'
                      ? kehadiranStats.approvedList
                      : kehadiranStats.rejectedList
                    ).length === 0 ? (
                      <p className="text-xs text-slate-400 text-center py-6">Tidak ada sesi dalam kategori ini.</p>
                    ) : (
                      (selectedSummaryCard === 'menunggu_review'
                        ? kehadiranStats.waitingList
                        : selectedSummaryCard === 'sesi_disetujui'
                        ? kehadiranStats.approvedList
                        : kehadiranStats.rejectedList
                      ).map((item, i) => (
                        <div key={item.id_absensi} className="py-2.5 flex items-center justify-between text-xs">
                          <div>
                            <p className="font-bold text-slate-900">
                              {item.nama_karyawan || `Karyawan #${item.id_karyawan}`}
                            </p>
                            <p className="text-[10px] text-slate-400">
                              {item.nama_pekerjaan || 'Proyek'} • {formatDate(item.tanggal)} • {item.jam_masuk?.slice(0, 5)} - {item.jam_pulang?.slice(0, 5) || 'Aktif'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-blue-600">{item.durasi_format || formatJamMenit(item.durasi_menit)}</span>
                            {selectedSummaryCard === 'menunggu_review' && (
                              <div className="flex items-center gap-1 ml-2">
                                <button
                                  type="button"
                                  title="Setujui Sesi"
                                  onClick={() => handleVerify(item.id_absensi, 'disetujui')}
                                  className="rounded bg-emerald-50 px-2 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-100"
                                >
                                  Setujui
                                </button>
                                <button
                                  type="button"
                                  title="Tolak Sesi"
                                  onClick={() => handleVerify(item.id_absensi, 'ditolak')}
                                  className="rounded bg-rose-50 px-2 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-100"
                                >
                                  Tolak
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-2">
                <button
                  type="button"
                  onClick={() => setSelectedSummaryCard(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: DETAIL & VERIFIKASI ABSENSI (LENGKAP DENGAN GPS) */}
        {/* ============================================================== */}
        {selectedAttendance && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <h3 className="text-base font-bold text-slate-900">Detail & Verifikasi Absensi</h3>
                <button
                  onClick={() => setSelectedAttendance(null)}
                  className="text-slate-400 hover:text-slate-600"
                >
                  <Icon name="cross" className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Nama Karyawan:</span>
                  <div className="text-right">
                    <span className="font-bold text-slate-900 block">
                      {selectedAttendance.emp?.nama || selectedAttendance.nama_karyawan}
                    </span>
                    <span className="font-mono text-[11px] font-semibold text-blue-600">
                      {selectedAttendance.emp?.kode_karyawan || selectedAttendance.kode_karyawan || `KARY${String(selectedAttendance.id_karyawan).padStart(3, '0')}`}
                    </span>
                  </div>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Pekerjaan:</span>
                  <span className="font-semibold text-slate-800">
                    {selectedAttendance.job?.nama_pekerjaan || selectedAttendance.nama_pekerjaan}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Tanggal:</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedAttendance.tanggal)}</span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Jam Masuk / Pulang:</span>
                  <span className="font-mono text-slate-800">
                    {selectedAttendance.jam_masuk?.slice(0, 5)} - {selectedAttendance.jam_pulang?.slice(0, 5) || 'Aktif'}
                  </span>
                </div>
                <div className="flex justify-between border-b border-slate-50 pb-2">
                  <span className="text-slate-500">Durasi Kerja:</span>
                  <span className="font-bold text-blue-600">{selectedAttendance.durasi_format || formatJamMenit(selectedAttendance.durasi_menit)}</span>
                </div>

                {/* Informasi Koordinat GPS & Jarak */}
                {(selectedAttendance.masuk_latitude || selectedAttendance.titik_lokasi) && (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-700 block font-semibold flex items-center gap-1">
                        <Icon name="location" className="h-3.5 w-3.5 text-blue-600" />
                        Titik Lokasi GPS Absensi
                      </span>
                      {selectedAttendance.masuk_latitude && selectedAttendance.masuk_longitude && (
                        <a
                          href={`https://www.google.com/maps?q=${selectedAttendance.masuk_latitude},${selectedAttendance.masuk_longitude}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                        >
                          Buka di Google Maps ↗
                        </a>
                      )}
                    </div>
                    <span className="font-mono text-[11px] text-slate-700 block bg-white p-2 rounded-lg border border-slate-200">
                      {selectedAttendance.masuk_latitude && selectedAttendance.masuk_longitude
                        ? `Lat: ${selectedAttendance.masuk_latitude}, Lng: ${selectedAttendance.masuk_longitude}`
                        : selectedAttendance.titik_lokasi}
                    </span>
                    {selectedAttendance.jarak_meter !== null && selectedAttendance.jarak_meter !== undefined && (
                      <span className="text-[11px] text-slate-600 block">
                        Jarak dari titik proyek: <strong>{selectedAttendance.jarak_meter} meter</strong>
                      </span>
                    )}
                    {selectedAttendance.masuk_alamat && (
                      <span className="text-[10px] text-slate-500 block leading-relaxed">
                        {selectedAttendance.masuk_alamat}
                      </span>
                    )}
                  </div>
                )}

                <div className="flex justify-between items-center pt-1">
                  <span className="text-slate-500">Status Saat Ini:</span>
                  <StatusBadge status={selectedAttendance.status_verifikasi} />
                </div>
              </div>

              {/* Tombol Aksi Verifikasi */}
              <div className="mt-6 flex flex-wrap items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedAttendance(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
                >
                  Tutup
                </button>
                {selectedAttendance.status_verifikasi !== 'menunggu' && (
                  <button
                    type="button"
                    onClick={() => {
                      handleVerify(selectedAttendance.id_absensi, 'menunggu')
                      setSelectedAttendance(null)
                    }}
                    className="rounded-xl border border-amber-300 bg-amber-50 px-3.5 py-2 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition"
                  >
                    Set Menunggu
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    handleVerify(selectedAttendance.id_absensi, 'ditolak')
                    setSelectedAttendance(null)
                  }}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white hover:bg-rose-700 shadow-sm transition"
                >
                  Tolak
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleVerify(selectedAttendance.id_absensi, 'disetujui')
                    setSelectedAttendance(null)
                  }}
                  className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-700 shadow-sm transition"
                >
                  Setujui
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
