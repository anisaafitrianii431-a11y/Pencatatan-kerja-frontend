import { useEffect, useMemo, useState } from 'react'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { STATUS_PEKERJAAN, STATUS_PEKERJAAN_OPTIONS } from '../../data/pekerjaan.js'
import { ambilPekerjaan, getPekerjaanTersedia } from '../../services/workerPekerjaanApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'worker-status-pending bg-slate-100 text-slate-700',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Berjalan',
    className: 'worker-status-running bg-blue-50 text-blue-700',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'worker-status-complete bg-emerald-50 text-emerald-700',
  },
}

function formatDate(value) {
  if (!value) return 'Belum ditentukan'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? 'Belum ditentukan' : DATE_FORMATTER.format(date)
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getDeadlineBadge(targetSelesai) {
  if (!targetSelesai) return null
  const today = getJakartaToday()
  if (targetSelesai === today) {
    return {
      label: 'Tenggat Hari Ini',
      className: 'bg-amber-100 text-amber-800 border border-amber-300 font-semibold',
    }
  }
  if (targetSelesai < today) {
    return {
      label: 'Melewati Deadline',
      className: 'bg-rose-100 text-rose-800 border border-rose-300 font-semibold',
    }
  }
  return {
    label: `Batas Waktu: ${formatDate(targetSelesai)}`,
    className: 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-medium',
  }
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
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
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    claim: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M19 8v6M22 11h-6" />
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
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-700',
  }

  return (
    <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${presentation.className}`}>
      {presentation.label}
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

function WorkCard({ job, onOpen, onClaim }) {
  const deadlineBadge = getDeadlineBadge(job.target_selesai)
  const isJoined = Boolean(job.already_joined)
  const isFull = Boolean(job.is_kuota_penuh)

  return (
    <article className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:border-emerald-300 hover:shadow-md sm:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
          <Icon name="work" />
        </div>
        <div className="flex flex-wrap items-center gap-1.5 justify-end">
          {job.metode_penentuan === 'gabungan' ? (
            <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
              Gabungan Admin &amp; Pekerja
            </span>
          ) : (
            <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
              Pekerja Memilih Sendiri
            </span>
          )}
          <StatusBadge status={job.status} />
        </div>
      </div>

      <h2 className="mt-4 text-lg font-semibold leading-6 text-slate-900">{job.nama_pekerjaan}</h2>

      {/* Kuota & Deadline */}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {job.is_unlimited_kuota || job.kuota_pekerja === null ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
            👥 {job.total_pekerja_aktif} Pekerja Bergabung (Tanpa Batas Kuota)
          </span>
        ) : isFull ? (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-rose-50 border border-rose-200 px-2.5 py-1 text-xs font-bold text-rose-700">
            ⚠️ {job.total_pekerja_aktif}/{job.kuota_pekerja} Pekerja (Kuota Penuh)
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-xs font-semibold text-emerald-800">
            👥 {job.total_pekerja_aktif}/{job.kuota_pekerja} Pekerja Bergabung ({job.sisa_slot} slot tersisa)
          </span>
        )}

        {deadlineBadge && (
          <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${deadlineBadge.className}`}>
            <Icon className="h-3.5 w-3.5 shrink-0" name="calendar" />
            {deadlineBadge.label}
          </span>
        )}
      </div>

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

      <div className="mt-auto grid grid-cols-2 gap-2 pt-5">
        <button
          className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
          onClick={() => onOpen(job)}
          type="button"
        >
          <Icon className="h-4 w-4" name="eye" />
          Detail
        </button>

        {isJoined ? (
          <button
            disabled
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-100 border border-slate-200 px-3 py-2.5 text-xs font-semibold text-slate-500 cursor-not-allowed"
            type="button"
            title="Anda sudah terdaftar dalam penugasan pekerjaan ini."
          >
            ✓ Sudah Diambil
          </button>
        ) : isFull ? (
          <button
            disabled
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-rose-50 border border-rose-200 px-3 py-2.5 text-xs font-semibold text-rose-600 cursor-not-allowed"
            type="button"
            title="Kuota pekerjaan ini telah terpenuhi."
          >
            Kuota Penuh
          </button>
        ) : (
          <button
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 px-3 py-2.5 text-xs font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer"
            onClick={() => onClaim(job)}
            type="button"
          >
            <Icon className="h-4 w-4" name="claim" />
            Ambil
          </button>
        )}
      </div>
    </article>
  )
}

function WorkDetails({ job, onClose, onClaim }) {
  const deadlineBadge = getDeadlineBadge(job.target_selesai)
  const isJoined = Boolean(job.already_joined)
  const isFull = Boolean(job.is_kuota_penuh)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="available-work-detail-title"
        aria-modal="true"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div className="pr-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Pekerjaan Tersedia</p>
            <h2 className="mt-1 text-lg font-bold text-slate-900" id="available-work-detail-title">
              {job.nama_pekerjaan}
            </h2>
          </div>
          <button
            aria-label="Tutup detail pekerjaan"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>
        <div className="space-y-5 px-5 py-6 sm:px-6">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge status={job.status} />
            {job.metode_penentuan === 'gabungan' ? (
              <span className="inline-flex rounded-full bg-indigo-50 px-2.5 py-0.5 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20">
                Gabungan Admin &amp; Pekerja
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20">
                Pekerja Memilih Sendiri
              </span>
            )}
            {deadlineBadge && (
              <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs ${deadlineBadge.className}`}>
                <Icon className="h-3.5 w-3.5 shrink-0" name="calendar" />
                {deadlineBadge.label}
              </span>
            )}
          </div>

          {/* Kuota Info Box */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3.5 text-xs space-y-1">
            <span className="font-bold text-slate-800 block">Status Kuota Tim:</span>
            {job.is_unlimited_kuota || job.kuota_pekerja === null ? (
              <p className="text-slate-600">
                Pekerjaan ini <strong>Tanpa Batas Kuota</strong>. Saat ini terdapat <strong>{job.total_pekerja_aktif} orang</strong> yang telah bergabung.
              </p>
            ) : (
              <p className="text-slate-600">
                Total kuota: <strong>{job.kuota_pekerja} orang</strong>. Sudah bergabung: <strong>{job.total_pekerja_aktif} orang</strong>. Sisa slot kosong:{' '}
                <strong className={isFull ? 'text-rose-600' : 'text-emerald-700'}>
                  {isFull ? 'Kuota Penuh' : `${job.sisa_slot} slot`}
                </strong>
              </p>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Lokasi" value={job.lokasi || 'Belum ditentukan'} />
            <DetailItem label="Tanggal mulai" value={formatDate(job.tanggal_mulai)} />
            <DetailItem label="Target selesai (Deadline)" value={formatDate(job.target_selesai)} />
            <DetailItem label="ID pekerjaan" value={`#${job.id_pekerjaan}`} />
          </div>
          <DetailItem label="Deskripsi" value={job.deskripsi || 'Belum ada deskripsi pekerjaan.'} />
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 cursor-pointer"
            onClick={onClose}
            type="button"
          >
            Tutup
          </button>
          {isJoined ? (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-slate-100 border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-500 cursor-not-allowed"
              type="button"
            >
              ✓ Sudah Anda Ambil
            </button>
          ) : isFull ? (
            <button
              disabled
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-rose-50 border border-rose-200 px-5 py-2.5 text-sm font-semibold text-rose-600 cursor-not-allowed"
              type="button"
            >
              Kuota Penuh
            </button>
          ) : (
            <button
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 cursor-pointer"
              onClick={() => {
                onClose()
                onClaim(job)
              }}
              type="button"
            >
              <Icon className="h-4 w-4" name="claim" />
              Ambil Pekerjaan Ini
            </button>
          )}
        </div>
      </section>
    </div>
  )
}

function ClaimConfirmModal({ job, isClaiming, onConfirm, onCancel }) {
  if (!job) return null

  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isClaiming) onCancel()
      }}
    >
      <section
        aria-labelledby="claim-confirm-title"
        aria-modal="true"
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-bold text-slate-900" id="claim-confirm-title">
              Konfirmasi Pengambilan Pekerjaan
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Apakah Anda yakin ingin mengambil pekerjaan ini?
            </p>
          </div>
          <button
            aria-label="Tutup konfirmasi"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            disabled={isClaiming}
            onClick={onCancel}
            type="button"
          >
            <Icon name="close" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5 sm:px-6">
          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Nama Pekerjaan</p>
            <p className="mt-1 text-base font-bold text-slate-900">{job.nama_pekerjaan}</p>
            <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-slate-600">
              <div>
                <span className="text-slate-400">Lokasi:</span> {job.lokasi || 'Belum ditentukan'}
              </div>
              <div>
                <span className="text-slate-400">Deadline:</span> {formatDate(job.target_selesai)}
              </div>
            </div>
          </div>

          <p className="text-xs leading-5 text-slate-500">
            Setelah diambil, pekerjaan ini akan langsung tercatat sebagai penugasan mandiri Anda dan masuk ke menu <strong className="font-semibold text-slate-700">List Pekerjaan</strong>. Pekerja lain tidak akan dapat mengambil pekerjaan ini.
          </p>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-100 px-5 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
            disabled={isClaiming}
            onClick={onCancel}
            type="button"
          >
            Batal
          </button>
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-wait disabled:opacity-70"
            disabled={isClaiming}
            onClick={onConfirm}
            type="button"
          >
            {isClaiming ? (
              <>
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
                Memproses...
              </>
            ) : (
              <>
                <Icon className="h-4 w-4" name="check" />
                Ya, Ambil Pekerjaan
              </>
            )}
          </button>
        </div>
      </section>
    </div>
  )
}

function PekerjaanTersedia({ onNavigate = () => {}, workerId, workerName }) {
  const [store, setStore] = useState({
    jobs: [],
    isLoading: true,
    error: '',
  })
  const { jobs, isLoading, error } = store
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [locationFilter, setLocationFilter] = useState('')
  const [selectedJob, setSelectedJob] = useState(null)
  const [claimTargetJob, setClaimTargetJob] = useState(null)
  const [isClaiming, setIsClaiming] = useState(false)
  const [notice, setNotice] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true
    const loadJobs = () => {
      getPekerjaanTersedia(workerId)
        .then((loadedJobs) => {
          if (isMounted) {
            setStore({
              jobs: loadedJobs,
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
              error: `Daftar pekerjaan tidak dapat dimuat: ${loadError.message}`,
            }))
          }
        })
    }

    loadJobs()
    const refreshTimer = window.setInterval(loadJobs, 30000)
    window.addEventListener('focus', loadJobs)

    return () => {
      isMounted = false
      window.clearInterval(refreshTimer)
      window.removeEventListener('focus', loadJobs)
    }
  }, [reloadKey, workerId])

  const locations = useMemo(
    () => [...new Set(jobs.map((job) => job.lokasi).filter(Boolean))].sort((a, b) => a.localeCompare(b, 'id')),
    [jobs],
  )
  const filteredJobs = useMemo(() => {
    const normalizedQuery = query.trim().toLocaleLowerCase('id-ID')

    return jobs.filter((job) => {
      return (
        (!normalizedQuery ||
          job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedQuery)) &&
        (!statusFilter || job.status === statusFilter) &&
        (!locationFilter || job.lokasi === locationFilter)
      )
    })
  }, [jobs, locationFilter, query, statusFilter])

  function resetFilters() {
    setQuery('')
    setStatusFilter('')
    setLocationFilter('')
  }

  function handleClaimRequest(job) {
    if (!workerId) {
      setNotice({
        type: 'error',
        message: 'Silakan pilih karyawan terlebih dahulu di panel mode pengujian untuk mengambil pekerjaan.',
      })
      return
    }
    if (job.already_joined) {
      setNotice({
        type: 'error',
        message: 'Anda sudah terdaftar dalam penugasan pekerjaan ini.',
      })
      return
    }
    if (job.is_kuota_penuh) {
      setNotice({
        type: 'error',
        message: 'Maaf, kuota pekerja untuk pekerjaan ini sudah terpenuhi.',
      })
      return
    }
    setClaimTargetJob(job)
  }

  async function handleConfirmClaim() {
    if (!claimTargetJob) return
    if (!workerId) {
      setNotice({
        type: 'error',
        message: 'Karyawan aktif tidak ditemukan.',
      })
      setClaimTargetJob(null)
      return
    }

    setIsClaiming(true)
    try {
      await ambilPekerjaan(claimTargetJob.id_pekerjaan, workerId)
      const jobName = claimTargetJob.nama_pekerjaan
      setClaimTargetJob(null)
      setSelectedJob(null)
      setNotice({
        type: 'success',
        message: `Selamat! Pekerjaan "${jobName}" berhasil Anda ambil. Pekerjaan kini dapat dikelola pada menu List Pekerjaan.`,
        action: {
          label: 'Buka List Pekerjaan',
          onClick: () => onNavigate('List Pekerjaan'),
        },
      })
      setReloadKey((key) => key + 1)
    } catch (claimError) {
      const msg = claimError.message || ''
      let userMsg = `Gagal mengambil pekerjaan: ${msg}`

      if (
        msg.includes('409') ||
        msg.toLowerCase().includes('sudah diambil') ||
        msg.toLowerCase().includes('tidak tersedia')
      ) {
        userMsg = 'Pekerjaan sudah tidak tersedia karena telah diambil oleh pekerja lain.'
      } else if (
        msg.includes('422') ||
        msg.toLowerCase().includes('melewati') ||
        msg.toLowerCase().includes('deadline')
      ) {
        userMsg = 'Pekerjaan telah melewati batas tenggat (deadline) dan tidak dapat diambil.'
      }

      setNotice({
        type: 'error',
        message: userMsg,
      })
      setClaimTargetJob(null)
      setReloadKey((key) => key + 1)
    } finally {
      setIsClaiming(false)
    }
  }

  const emptyTitle =
    jobs.length === 0
      ? 'Saat Ini Belum Ada Pekerjaan Baru yang Tersedia'
      : 'Pekerjaan Tidak Ditemukan'
  const emptyDescription =
    jobs.length === 0
      ? 'Pekerjaan dengan metode terbuka yang belum melewati deadline akan muncul di sini. Pekerjaan yang sudah ditugaskan kepada Anda dapat dilihat pada menu List Pekerjaan.'
      : 'Coba ubah kata pencarian atau filter yang dipilih.'

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        description="Temukan dan ambil pekerjaan terbuka yang sesuai dengan kemampuan Anda."
        icon={<Icon className="h-6 w-6" name="work" />}
        title="Pekerjaan Tersedia"
      />

      {notice && (
        <div
          className={`flex flex-col gap-3 rounded-xl border p-4 text-sm sm:flex-row sm:items-center sm:justify-between ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white ${
                notice.type === 'error' ? 'bg-rose-500' : 'bg-emerald-600'
              }`}
            >
              {notice.type === 'error' ? '!' : '✓'}
            </span>
            <p className="font-medium">{notice.message}</p>
          </div>
          <div className="flex items-center gap-3">
            {notice.action && (
              <button
                className="rounded-lg bg-emerald-700 px-3.5 py-1.5 text-xs font-bold text-white shadow-sm transition hover:bg-emerald-800"
                onClick={notice.action.onClick}
                type="button"
              >
                {notice.action.label}
              </button>
            )}
            <button
              aria-label="Tutup pesan"
              className="font-bold opacity-60 hover:opacity-100"
              onClick={() => setNotice(null)}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}

      {error && (
        <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700" role="alert">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>
            <button
              className="shrink-0 font-semibold underline underline-offset-2"
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Coba lagi
            </button>
          </div>
        </div>
      )}

      <section aria-label="Cari dan filter pekerjaan" className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] sm:p-5">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1.5fr)_minmax(170px,1fr)_minmax(170px,1fr)_auto]">
          <label className="relative block">
            <span className="sr-only">Cari nama pekerjaan</span>
            <Icon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" name="search" />
            <input
              className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Cari nama pekerjaan..."
              type="search"
              value={query}
            />
          </label>
          <label>
            <span className="sr-only">Filter status</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
            <span className="sr-only">Filter lokasi</span>
            <select
              className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-700 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
              onChange={(event) => setLocationFilter(event.target.value)}
              value={locationFilter}
            >
              <option value="">Semua Lokasi</option>
              {locations.map((location) => <option key={location} value={location}>{location}</option>)}
            </select>
          </label>
          <div className="flex gap-2">
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              onClick={resetFilters}
              type="button"
            >
              <Icon className="h-4 w-4" name="reset" />
              Reset
            </button>
            <button
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              disabled={isLoading}
              onClick={() => setReloadKey((key) => key + 1)}
              type="button"
            >
              Muat Ulang
            </button>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-400">
          {isLoading ? 'Memuat pekerjaan...' : `${filteredJobs.length} dari ${jobs.length} pekerjaan tersedia`}
        </p>
      </section>

      {isLoading ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3" role="status" aria-label="Memuat pekerjaan">
          {Array.from({ length: 3 }, (_, index) => (
            <div className="h-72 animate-pulse rounded-2xl border border-slate-200 bg-white" key={index} />
          ))}
        </div>
      ) : filteredJobs.length > 0 ? (
        <section aria-label="Daftar pekerjaan tersedia" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredJobs.map((job) => (
            <WorkCard
              job={job}
              key={job.id_pekerjaan}
              onClaim={handleClaimRequest}
              onOpen={setSelectedJob}
            />
          ))}
        </section>
      ) : (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-700">
            <Icon className="h-6 w-6" name="work" />
          </div>
          <h2 className="mt-4 text-base font-bold text-slate-900">{emptyTitle}</h2>
          <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-slate-600">{emptyDescription}</p>
          {jobs.length === 0 ? (
            <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
              <button
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700"
                onClick={() => onNavigate('List Pekerjaan')}
                type="button"
              >
                Buka List Pekerjaan
              </button>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => setReloadKey((key) => key + 1)}
                type="button"
              >
                Muat Ulang
              </button>
            </div>
          ) : (
            (query || statusFilter || locationFilter) && (
              <button
                className="mt-5 text-sm font-semibold text-emerald-700 hover:text-emerald-800"
                onClick={resetFilters}
                type="button"
              >
                Reset pencarian dan filter
              </button>
            )
          )}
        </section>
      )}

      {selectedJob && (
        <WorkDetails
          job={selectedJob}
          onClaim={handleClaimRequest}
          onClose={() => setSelectedJob(null)}
        />
      )}

      {claimTargetJob && (
        <ClaimConfirmModal
          isClaiming={isClaiming}
          job={claimTargetJob}
          onCancel={() => {
            if (!isClaiming) setClaimTargetJob(null)
          }}
          onConfirm={handleConfirmClaim}
        />
      )}
    </div>
  )
}

export default PekerjaanTersedia
