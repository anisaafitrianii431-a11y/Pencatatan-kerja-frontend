import { useEffect, useMemo, useState } from 'react'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { getRiwayatPekerjaanSaya } from '../../services/workerPekerjaanApi.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})

const DATETIME_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
})

function formatDate(value) {
  if (!value) return '—'
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00`))
}

function formatDateTime(value) {
  if (!value) return '—'
  return DATETIME_FORMATTER.format(new Date(value))
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
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
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    refresh: (
      <>
        <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    alert: (
      <>
        <circle cx="12" cy="12" r="10" />
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

function HistoryDetailModal({ item, onClose }) {
  if (!item) return null
  const { job, assignment, isCanceled } = item

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-detail-title"
        className="my-auto w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-700">
              Detail Riwayat Pekerjaan
            </span>
            <h2 id="history-detail-title" className="mt-1 text-base sm:text-lg font-bold text-slate-900">
              {job?.nama_pekerjaan || 'Pekerjaan'}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
            aria-label="Tutup detail riwayat"
          >
            <Icon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 sm:p-6 space-y-4 text-xs sm:text-sm">
          {/* Status Badge */}
          <div className="flex flex-wrap items-center gap-2">
            {isCanceled ? (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-rose-50 px-3 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                Penugasan Dibatalkan
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                Pekerjaan Selesai
              </span>
            )}

            {assignment?.jenis_penugasan === 'mandiri' ? (
              <span className="inline-flex rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/15">
                Diambil Mandiri
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-sky-50 px-2.5 py-0.5 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/15">
                Dipilih Admin
              </span>
            )}
          </div>

          {/* Cancellation Alert */}
          {isCanceled && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-3.5 space-y-1.5 text-xs text-rose-950">
              <div className="flex items-center gap-2 font-bold text-rose-800">
                <Icon name="alert" className="h-4 w-4 shrink-0 text-rose-600" />
                <span>Rincian Pembatalan Penugasan</span>
              </div>
              <p>
                <strong>Dibatalkan Oleh:</strong> {assignment?.dibatalkan_oleh || 'Administrator'}
              </p>
              <p>
                <strong>Waktu Pembatalan:</strong> {formatDateTime(assignment?.dibatalkan_pada)}
              </p>
              <div className="rounded bg-white p-2.5 border border-rose-200 text-rose-900 mt-1">
                <strong>Alasan Pembatalan:</strong>{' '}
                <span className="italic">{assignment?.alasan_batal || 'Tidak ada catatan alasan khusus.'}</span>
              </div>
            </div>
          )}

          {/* Specifications */}
          <div className="grid grid-cols-2 gap-3 text-xs border-t border-slate-100 pt-3">
            <div>
              <span className="text-slate-400 font-medium block">Lokasi</span>
              <strong className="text-slate-800 text-xs sm:text-sm">{job?.lokasi || 'Belum ditentukan'}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">ID Pekerjaan</span>
              <strong className="text-slate-800 font-mono">#{job?.id_pekerjaan}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Tanggal Mulai</span>
              <strong className="text-slate-800">{formatDate(job?.tanggal_mulai)}</strong>
            </div>
            <div>
              <span className="text-slate-400 font-medium block">Batas Waktu / Selesai</span>
              <strong className="text-slate-800">{formatDate(job?.target_selesai)}</strong>
            </div>
          </div>

          {job?.deskripsi && (
            <div className="border-t border-slate-100 pt-3">
              <span className="text-slate-400 font-medium text-xs block mb-1">Deskripsi</span>
              <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-line">{job.deskripsi}</p>
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-5 py-3.5 sm:px-6 bg-slate-50/50">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-200 px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-300 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  )
}

function RiwayatPengajuan({ onNavigate = () => {}, workerId, workerName = '' }) {
  const [store, setStore] = useState({
    historyJobs: [],
    isLoading: true,
    error: '',
  })
  const { historyJobs, isLoading, error } = store
  const [activeTab, setActiveTab] = useState('semua') // 'semua' | 'selesai' | 'dibatalkan'
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedDetailItem, setSelectedDetailItem] = useState(null)
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true
    setStore((prev) => ({ ...prev, isLoading: true, error: '' }))

    getRiwayatPekerjaanSaya(workerId, workerName)
      .then((res) => {
        if (isMounted) {
          setStore({
            historyJobs: res.historyJobs || [],
            isLoading: false,
            error: '',
          })
        }
      })
      .catch((err) => {
        if (isMounted) {
          setStore({
            historyJobs: [],
            isLoading: false,
            error: `Gagal memuat riwayat pekerjaan: ${err.message}`,
          })
        }
      })

    return () => {
      isMounted = false
    }
  }, [workerId, workerName, reloadKey])

  const counts = useMemo(() => {
    const total = historyJobs.length
    const selesai = historyJobs.filter((item) => item.isJobCompleted).length
    const dibatalkan = historyJobs.filter((item) => item.isCanceled).length
    return { total, selesai, dibatalkan }
  }, [historyJobs])

  const filteredHistory = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    return historyJobs.filter((item) => {
      if (activeTab === 'selesai' && !item.isJobCompleted) return false
      if (activeTab === 'dibatalkan' && !item.isCanceled) return false

      if (query) {
        const title = (item.job?.nama_pekerjaan || '').toLowerCase()
        const loc = (item.job?.lokasi || '').toLowerCase()
        return title.includes(query) || loc.includes(query)
      }
      return true
    })
  }, [activeTab, historyJobs, searchQuery])

  return (
    <div className="worker-management-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Riwayat Pekerjaan"
        description="Daftar pekerjaan yang telah selesai dikerjakan atau penugasan yang pernah dibatalkan oleh Admin."
        title="Riwayat Pekerjaan"
      />

      {/* Filter Tabs & Toolbar */}
      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm shadow-slate-900/[0.02] space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Tabs */}
          <div className="flex flex-wrap items-center gap-1.5">
            <button
              type="button"
              onClick={() => setActiveTab('semua')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'semua'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Semua Riwayat ({counts.total})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('selesai')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'selesai'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Pekerjaan Selesai ({counts.selesai})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('dibatalkan')}
              className={`rounded-xl px-3.5 py-2 text-xs font-bold transition cursor-pointer ${
                activeTab === 'dibatalkan'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              Penugasan Dibatalkan ({counts.dibatalkan})
            </button>
          </div>

          {/* Search & Refresh */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-slate-400">
                <Icon name="search" className="h-4 w-4" />
              </span>
              <input
                type="text"
                placeholder="Cari riwayat pekerjaan..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-1.5 pl-9 pr-3 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <button
              type="button"
              onClick={() => setReloadKey((k) => k + 1)}
              className="rounded-xl border border-slate-200 bg-white p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-700 transition cursor-pointer"
              title="Segarkan riwayat"
            >
              <Icon name="refresh" className="h-4 w-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Content */}
      {isLoading ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
          <div className="flex flex-col items-center justify-center gap-2">
            <span className="h-6 w-6 animate-spin rounded-full border-2 border-emerald-600 border-t-transparent" />
            <p className="text-sm font-medium text-slate-600">Memuat riwayat pekerjaan...</p>
          </div>
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-700">
          <p className="text-sm font-semibold">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((k) => k + 1)}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-rose-600 px-3 py-1.5 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition cursor-pointer"
          >
            Coba Lagi
          </button>
        </div>
      ) : filteredHistory.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
            <Icon name="work" className="h-6 w-6" />
          </div>
          <h3 className="mt-3 text-sm font-bold text-slate-800">
            {searchQuery ? 'Riwayat pekerjaan tidak ditemukan' : 'Belum Ada Riwayat Pekerjaan'}
          </h3>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            {searchQuery
              ? 'Coba sesuaikan kata kunci pencarian Anda.'
              : 'Pekerjaan yang telah selesai atau penugasan yang dibatalkan oleh Admin akan dicatat di halaman ini.'}
          </p>
          <div className="mt-5 flex justify-center gap-2.5">
            <button
              type="button"
              onClick={() => onNavigate('Pekerjaan Saya')}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-emerald-700 transition cursor-pointer"
            >
              Lihat Pekerjaan Saya
            </button>
            <button
              type="button"
              onClick={() => onNavigate('List Pekerjaan')}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
            >
              Lihat List Pekerjaan
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredHistory.map((item) => {
            const { job, assignment, isCanceled } = item

            return (
              <article
                key={assignment?.id_penugasan || job?.id_pekerjaan}
                className="flex flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02] transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
                    <Icon name="work" className="h-5 w-5" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {isCanceled ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-700 ring-1 ring-rose-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
                        Dibatalkan
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Selesai
                      </span>
                    )}
                    {assignment?.jenis_penugasan === 'mandiri' ? (
                      <span className="text-[10px] text-purple-700 font-semibold bg-purple-50 px-2 py-0.5 rounded">
                        Diambil Mandiri
                      </span>
                    ) : (
                      <span className="text-[10px] text-sky-700 font-semibold bg-sky-50 px-2 py-0.5 rounded">
                        Dipilih Admin
                      </span>
                    )}
                  </div>
                </div>

                <h3 className="mt-3.5 text-base font-bold text-slate-900 line-clamp-1">
                  {job?.nama_pekerjaan || 'Pekerjaan'}
                </h3>

                <p className="mt-1.5 text-xs text-slate-500 line-clamp-2 min-h-8">
                  {job?.deskripsi || 'Tidak ada deskripsi pekerjaan.'}
                </p>

                {/* If canceled, display summary reason */}
                {isCanceled && (
                  <div className="mt-3 rounded-lg border border-rose-100 bg-rose-50/70 p-2.5 text-xs text-rose-900 space-y-0.5">
                    <span className="block font-bold text-[11px] text-rose-800">
                      Alasan Pembatalan:
                    </span>
                    <p className="text-[11px] text-rose-700 line-clamp-2 italic">
                      "{assignment?.alasan_batal || 'Tidak ada catatan alasan.'}"
                    </p>
                    <span className="block text-[10px] text-rose-500 pt-0.5">
                      Oleh: {assignment?.dibatalkan_oleh || 'Admin'} • {formatDateTime(assignment?.dibatalkan_pada)}
                    </span>
                  </div>
                )}

                <div className="mt-4 space-y-1.5 border-t border-slate-100 pt-3 text-xs text-slate-600">
                  <p className="flex items-start gap-1.5">
                    <Icon name="location" className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span className="line-clamp-1">{job?.lokasi || 'Lokasi belum disetel'}</span>
                  </p>
                  <p className="flex items-start gap-1.5">
                    <Icon name="calendar" className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>Jadwal: {formatDate(job?.tanggal_mulai)} - {formatDate(job?.target_selesai)}</span>
                  </p>
                </div>

                <div className="mt-auto pt-4">
                  <button
                    type="button"
                    onClick={() => setSelectedDetailItem(item)}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <Icon name="eye" className="h-3.5 w-3.5" />
                    Lihat Rincian Riwayat
                  </button>
                </div>
              </article>
            )
          })}
        </div>
      )}

      {/* Modal Detail Riwayat */}
      {selectedDetailItem && (
        <HistoryDetailModal
          item={selectedDetailItem}
          onClose={() => setSelectedDetailItem(null)}
        />
      )}
    </div>
  )
}

export default RiwayatPengajuan
