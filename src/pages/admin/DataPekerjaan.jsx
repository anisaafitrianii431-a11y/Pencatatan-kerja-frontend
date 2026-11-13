import { useEffect, useMemo, useRef, useState, useCallback } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  STATUS_PEKERJAAN,
  STATUS_PEKERJAAN_OPTIONS,
} from '../../data/pekerjaan.js'
import {
  createPekerjaan,
  deletePekerjaan,
  getPekerjaan,
  getPekerjaanById,
  updatePekerjaan,
  getPekerjaanPekerja,
  updatePekerjaanStatusPekerja,
  getPekerjaanLaporan,
  createPekerjaanLaporan,
  setujuiPekerjaanLaporan,
  tolakPekerjaanLaporan,
  togglePengambilanPekerjaan,
  batalkanPenugasanPekerja,
  tambahPekerjaKePekerjaan,
} from '../../services/pekerjaanApi.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 8

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    color: '#f59e0b',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20',
    color: '#2563eb',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    color: '#10b981',
  },
}

const WORKER_STATUS_PRESENTATION = {
  belum_hadir: {
    label: 'Belum Hadir',
    className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
    dot: 'bg-slate-400',
  },
  sedang_bekerja: {
    label: 'Sedang Bekerja',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-blue-600/20',
    dot: 'bg-blue-500 animate-pulse',
  },
  selesai_bertugas: {
    label: 'Selesai Bertugas',
    className: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    dot: 'bg-emerald-500',
  },
  tidak_hadir: {
    label: 'Tidak Hadir',
    className: 'bg-rose-50 text-rose-700 ring-1 ring-rose-600/20',
    dot: 'bg-rose-500',
  },
  meninggalkan_pekerjaan: {
    label: 'Meninggalkan Pekerjaan',
    className: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
    dot: 'bg-amber-500',
  },
}

function formatDate(value) {
  if (!value) return '—'
  return DATE_FORMATTER.format(new Date(`${value}T00:00:00`))
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function WorkIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
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
    plus: <path d="M12 5v14M5 12h14" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    sort: <path d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />,
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
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    clipboard: (
      <>
        <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2" />
        <rect x="8" y="2" width="8" height="4" rx="1" ry="1" />
        <path d="M9 14l2 2 4-4" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
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
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
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
      {paths[name] || null}
    </svg>
  )
}

function StatusBadge({ status, isOverdue }) {
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Belum Dimulai',
    className: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300',
  }

  return (
    <div className="flex flex-col items-center justify-center gap-1">
      <span
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap shadow-2xs ${presentation.className}`}
      >
        <span className="h-1.5 w-1.5 rounded-full bg-current shrink-0" />
        <span>{presentation.label}</span>
      </span>
      {isOverdue && status !== STATUS_PEKERJAAN.SELESAI && (
        <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 whitespace-nowrap">
          <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <span>Terlambat</span>
        </span>
      )}
    </div>
  )
}

// Komponen Peta Interaktif Leaflet dengan Geocoding Google Maps / OpenStreetMap
function InteractiveMapPicker({
  latitude,
  longitude,
  radiusMeter,
  onCoordinateChange,
  locationName = '',
}) {
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)

  const [searchQuery, setSearchQuery] = useState(locationName)
  const [isSearching, setIsSearching] = useState(false)
  const [geocoderStatus, setGeocoderStatus] = useState('')

  const googleMapsApiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || ''

  const currentLat = latitude ? parseFloat(latitude) : -6.2088
  const currentLng = longitude ? parseFloat(longitude) : 106.8456
  const hasCoordinates = Boolean(latitude && longitude && !isNaN(currentLat) && !isNaN(currentLng))

  // Inisialisasi Peta
  useEffect(() => {
    if (!mapContainerRef.current) return
    const L = window.L
    if (!L) return

    if (!mapInstanceRef.current) {
      const initialLat = hasCoordinates ? currentLat : -6.2088
      const initialLng = hasCoordinates ? currentLng : 106.8456
      const zoom = hasCoordinates ? 16 : 12

      const map = L.map(mapContainerRef.current, {
        center: [initialLat, initialLng],
        zoom: zoom,
        attributionControl: false,
      })

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
      }).addTo(map)

      // Klik peta untuk set titik baru
      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(7))
        const lng = Number(e.latlng.lng.toFixed(7))
        onCoordinateChange(lat, lng)
      })

      mapInstanceRef.current = map
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        circleRef.current = null
      }
    }
  }, [])

  // Update posisi Marker dan Geofence Radius
  useEffect(() => {
    const L = window.L
    if (!L || !mapInstanceRef.current) return

    if (hasCoordinates) {
      mapInstanceRef.current.setView([currentLat, currentLng], 16)

      if (markerRef.current) {
        markerRef.current.setLatLng([currentLat, currentLng])
      } else {
        markerRef.current = L.marker([currentLat, currentLng], {
          draggable: true,
        }).addTo(mapInstanceRef.current)

        markerRef.current.on('dragend', (event) => {
          const pos = event.target.getLatLng()
          onCoordinateChange(Number(pos.lat.toFixed(7)), Number(pos.lng.toFixed(7)))
        })
      }

      const radius = Number(radiusMeter) || 100
      if (circleRef.current) {
        circleRef.current.setLatLng([currentLat, currentLng])
        circleRef.current.setRadius(radius)
      } else {
        circleRef.current = L.circle([currentLat, currentLng], {
          radius: radius,
          color: '#2563eb',
          fillColor: '#3b82f6',
          fillOpacity: 0.15,
          weight: 2,
        }).addTo(mapInstanceRef.current)
      }
    } else {
      if (markerRef.current) {
        markerRef.current.remove()
        markerRef.current = null
      }
      if (circleRef.current) {
        circleRef.current.remove()
        circleRef.current = null
      }
    }
  }, [currentLat, currentLng, radiusMeter, hasCoordinates, onCoordinateChange])

  // Cari Alamat (Google Maps Geocoding atau Fallback OpenStreetMap Nominatim)
  async function handleSearchAddress(e) {
    if (e) e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setIsSearching(true)
    setGeocoderStatus('')

    try {
      if (googleMapsApiKey) {
        // Gunakan Google Maps Geocoding API
        setGeocoderStatus('Mencari via Google Maps Geocoding...')
        const response = await fetch(
          `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
            query,
          )}&key=${googleMapsApiKey}`,
        )
        const data = await response.json()
        if (data.status === 'OK' && data.results && data.results.length > 0) {
          const loc = data.results[0].geometry.location
          onCoordinateChange(Number(loc.lat.toFixed(7)), Number(loc.lng.toFixed(7)))
          setGeocoderStatus(`Lokasi ditemukan: ${data.results[0].formatted_address}`)
          setIsSearching(false)
          return
        }
      }

      // Fallback ke OpenStreetMap Nominatim Geocoding
      setGeocoderStatus('Mencari lokasi via OpenStreetMap...')
      const osmResp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=1`,
        { headers: { 'Accept-Language': 'id,en' } },
      )
      const osmData = await osmResp.json()
      if (osmData && osmData.length > 0) {
        const lat = Number(parseFloat(osmData[0].lat).toFixed(7))
        const lng = Number(parseFloat(osmData[0].lon).toFixed(7))
        onCoordinateChange(lat, lng)
        setGeocoderStatus(`Lokasi ditemukan: ${osmData[0].display_name}`)
      } else {
        setGeocoderStatus('Lokasi tidak ditemukan. Coba ketik nama kota atau klik langsung di peta.')
      }
    } catch (err) {
      setGeocoderStatus(`Pencarian gagal: ${err.message}`)
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-2">
      {/* Search Bar Lokasi */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault()
                handleSearchAddress()
              }
            }}
            placeholder="Ketik alamat / nama gedung untuk mencari lokasi..."
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          type="button"
          onClick={handleSearchAddress}
          disabled={isSearching || !searchQuery.trim()}
          className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
        >
          {isSearching ? (
            <span>Mencari...</span>
          ) : (
            <>
              <WorkIcon name="search" className="h-3.5 w-3.5" />
              <span>Cari di Peta</span>
            </>
          )}
        </button>
      </div>

      {geocoderStatus && (
        <p className="text-[11px] text-blue-700 bg-blue-50/80 px-2.5 py-1 rounded border border-blue-200/60">
          {geocoderStatus}
        </p>
      )}

      {/* Kontainer Peta */}
      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="h-48 sm:h-56 w-full z-0 bg-slate-100" />

        {/* Petunjuk Interaktif di Atas Peta */}
        <div className="absolute top-2 left-2 z-[500] pointer-events-none rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
          📍 Klik peta atau geser pin untuk menentukan titik presensi
        </div>

        {/* Indikator Google Maps API Key */}
        <div className="absolute bottom-2 left-2 z-[500] pointer-events-none rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] text-white shadow-xs backdrop-blur-xs">
          {googleMapsApiKey ? '🗺️ Google Maps API: Aktif' : '🗺️ OpenStreetMap / Nominatim'}
        </div>
      </div>

      {!googleMapsApiKey && (
        <p className="text-[11px] text-slate-500 italic">
          💡 Catatan: Google Maps API Key belum disetel di <code className="font-mono text-slate-700">.env</code> (<code className="font-mono text-slate-700">VITE_GOOGLE_MAPS_API_KEY</code>). Sistem otomatis menggunakan peta dan geocoding OpenStreetMap interaktif bawaan.
        </p>
      )}
    </div>
  )
}

// Modal Detail Data Pekerjaan & Pengelolaan Tim Multi-Worker
function JobDetailModal({ job: initialJob, employees, onClose, onRefresh }) {
  const navigate = useNavigate()
  const [job, setJob] = useState(initialJob)
  const [isLoading, setIsLoading] = useState(false)
  const [notice, setNotice] = useState(null)

  // State untuk dialog Batalkan Penugasan
  const [cancelModal, setCancelModal] = useState(null) // { worker, alasan: '', isSubmitting: false }

  // State untuk form Tambah Pekerja
  const [addWorkerOpen, setAddWorkerOpen] = useState(false)
  const [selectedAddEmpId, setSelectedAddEmpId] = useState('')
  const [isAddingWorker, setIsAddingWorker] = useState(false)

  // State untuk Toggle Pendaftaran
  const [isTogglingPengambilan, setIsTogglingPengambilan] = useState(false)

  const reload = async () => {
    setIsLoading(true)
    try {
      const refreshed = await getPekerjaanById(job.id_pekerjaan)
      setJob(refreshed)
      onRefresh?.()
    } catch (err) {
      console.error(err)
      setNotice({ type: 'error', message: `Gagal memuat ulang data pekerjaan: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }

  const workers = Array.isArray(job?.workers) ? job.workers : []
  const activeWorkers = workers.filter((w) => (w.status_penugasan || 'aktif') === 'aktif')
  const canceledWorkers = workers.filter((w) => w.status_penugasan === 'dibatalkan')

  const availableEmployeesToAdd = employees.filter(
    (emp) => !activeWorkers.some((w) => Number(w.id_karyawan) === Number(emp.id_karyawan)),
  )

  async function handleTogglePengambilan() {
    setIsTogglingPengambilan(true)
    const newStatus = job.status_pengambilan === 'terbuka' ? 'ditutup' : 'terbuka'
    try {
      await togglePengambilanPekerjaan(job.id_pekerjaan, newStatus)
      setNotice({
        type: 'success',
        message: `Status pendaftaran berhasil diubah menjadi: ${newStatus === 'terbuka' ? 'Pendaftaran Terbuka' : 'Pendaftaran Ditutup'}.`,
      })
      await reload()
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal mengubah status pendaftaran: ${err.message}` })
    } finally {
      setIsTogglingPengambilan(false)
    }
  }

  async function handleConfirmCancelWorker() {
    if (!cancelModal) return
    if (!cancelModal.alasan?.trim()) {
      setNotice({ type: 'error', message: 'Alasan pembatalan penugasan wajib diisi.' })
      return
    }

    setCancelModal((prev) => ({ ...prev, isSubmitting: true }))
    try {
      await batalkanPenugasanPekerja(
        job.id_pekerjaan,
        cancelModal.worker.id_penugasan,
        cancelModal.alasan.trim(),
      )
      setNotice({
        type: 'success',
        message: `Penugasan karyawan ${cancelModal.worker.nama} berhasil dibatalkan. Kuota pekerjaan telah dibebaskan kembali.`,
      })
      setCancelModal(null)
      await reload()
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal membatalkan penugasan: ${err.message}` })
      setCancelModal((prev) => ({ ...prev, isSubmitting: false }))
    }
  }

  async function handleConfirmAddWorker() {
    if (!selectedAddEmpId) {
      setNotice({ type: 'error', message: 'Silakan pilih karyawan yang ingin ditugaskan.' })
      return
    }

    setIsAddingWorker(true)
    try {
      await tambahPekerjaKePekerjaan(job.id_pekerjaan, Number(selectedAddEmpId))
      setNotice({
        type: 'success',
        message: 'Karyawan berhasil ditambahkan ke tim pekerjaan.',
      })
      setSelectedAddEmpId('')
      setAddWorkerOpen(false)
      await reload()
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal menambahkan karyawan: ${err.message}` })
    } finally {
      setIsAddingWorker(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !cancelModal && !isAddingWorker) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-detail-title"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6 max-h-[92vh] flex flex-col"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4 shrink-0">
          <div>
            <h2 id="job-detail-title" className="text-base sm:text-lg font-bold text-slate-900">
              Detail Data Pekerjaan
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Rincian spesifikasi pekerjaan, status kuota, dan manajemen tim pekerja.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition cursor-pointer"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <WorkIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Notice Alert */}
          {notice && (
            <div
              className={`flex items-start justify-between gap-2.5 rounded-xl border p-3.5 text-xs ${
                notice.type === 'success'
                  ? 'border-emerald-200 bg-emerald-50/90 text-emerald-800'
                  : 'border-rose-200 bg-rose-50/90 text-rose-800'
              }`}
            >
              <div className="flex items-center gap-2">
                <WorkIcon
                  name={notice.type === 'success' ? 'check' : 'alert'}
                  className="h-4 w-4 shrink-0"
                />
                <span className="font-medium">{notice.message}</span>
              </div>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 font-bold px-1"
              >
                ✕
              </button>
            </div>
          )}

          {/* Info Card Utama */}
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                ID Pekerjaan: #{job?.id_pekerjaan}
              </span>
              <StatusBadge status={job?.status} isOverdue={job?.is_overdue} />
            </div>
            <h3 className="mt-2.5 text-lg font-bold text-slate-900">{job?.nama_pekerjaan}</h3>
            <p className="mt-1 text-xs text-slate-600 flex items-center gap-1.5">
              <WorkIcon name="location" className="h-3.5 w-3.5 text-slate-400 shrink-0" />
              <span>{job?.lokasi || 'Lokasi belum disetel'}</span>
            </p>
          </div>

          {/* Tanggal & Jadwal */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 text-xs">
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <span className="text-slate-500 font-medium">Jadwal Mulai</span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(job?.tanggal_mulai)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs">
              <span className="text-slate-500 font-medium">Batas Waktu Pekerjaan</span>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {formatDate(job?.target_selesai)}
              </p>
              {job?.is_overdue && job?.status !== STATUS_PEKERJAAN.SELESAI && (
                <p className="mt-1 text-[11px] font-bold text-rose-600">
                  ⚠️ Melewati batas waktu pengerjaan
                </p>
              )}
            </div>
          </div>

          {/* Koordinat GPS & Radius Presensi */}
          <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-500 font-medium">Koordinat GPS &amp; Radius Presensi</span>
              {job?.latitude && job?.longitude ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  GPS Terpasang (Radius: {job?.radius_meter || 100}m)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-inset ring-amber-600/20">
                  Belum Ada Titik GPS
                </span>
              )}
            </div>
            {job?.latitude && job?.longitude ? (
              <div className="mt-2 space-y-1.5 border-t border-slate-100 pt-2">
                <p className="font-mono text-slate-800 text-xs">
                  Koordinat: {job.latitude}, {job.longitude}
                </p>
                <a
                  href={`https://maps.google.com/?q=${job.latitude},${job.longitude}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 font-semibold text-xs"
                >
                  Buka Titik di Google Maps ↗
                </a>
              </div>
            ) : (
              <p className="mt-2 text-slate-500 text-xs">
                Koordinat GPS belum disetel untuk lokasi pekerjaan ini.
              </p>
            )}
          </div>

          {/* Deskripsi */}
          {job?.deskripsi && (
            <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-xs text-xs">
              <span className="text-slate-500 font-medium">Deskripsi Pekerjaan</span>
              <p className="mt-1 text-slate-700 leading-relaxed whitespace-pre-line">
                {job.deskripsi}
              </p>
            </div>
          )}

          {/* Seksi: Cara Penentuan & Status Kuota */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-4 space-y-3.5">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Cara Penentuan &amp; Kuota Pekerja
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              {/* Cara Penentuan */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-slate-500 font-medium block mb-1">Metode Penentuan</span>
                {job?.metode_penentuan === 'langsung' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-sky-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-sky-500" />
                    Admin Menentukan
                  </span>
                ) : job?.metode_penentuan === 'gabungan' ? (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-indigo-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-indigo-500" />
                    Gabungan Admin &amp; Pekerja
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-purple-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-purple-500" />
                    Pekerja Memilih Sendiri
                  </span>
                )}
              </div>

              {/* Status Kuota */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs">
                <span className="text-slate-500 font-medium block mb-1">Anggota Tim / Kuota</span>
                <div className="flex flex-col gap-0.5">
                  <span className="font-bold text-slate-900 text-sm">
                    {activeWorkers.length}{' '}
                    {job?.kuota_pekerja ? `/ ${job.kuota_pekerja} orang` : 'orang'}
                  </span>
                  <span
                    className={`text-[11px] font-semibold ${
                      job?.is_kuota_penuh
                        ? 'text-rose-600'
                        : job?.is_unlimited_kuota
                        ? 'text-slate-500'
                        : 'text-emerald-600'
                    }`}
                  >
                    {job?.is_unlimited_kuota
                      ? 'Tanpa Batas Kuota'
                      : job?.is_kuota_penuh
                      ? '⚠️ Kuota Penuh'
                      : `Sisa ${job?.sisa_slot ?? 0} slot kosong`}
                  </span>
                </div>
              </div>

              {/* Status Pendaftaran & Aksi Toggle */}
              <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-2xs flex flex-col justify-between">
                <div>
                  <span className="text-slate-500 font-medium block mb-1">Pendaftaran Mandiri</span>
                  <span
                    className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-bold ${
                      job?.status_pengambilan === 'terbuka'
                        ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20'
                        : 'bg-amber-50 text-amber-700 ring-1 ring-amber-600/20'
                    }`}
                  >
                    {job?.status_pengambilan === 'terbuka' ? 'Terbuka' : 'Ditutup'}
                  </span>
                </div>
                {job?.metode_penentuan !== 'langsung' && (
                  <button
                    type="button"
                    onClick={handleTogglePengambilan}
                    disabled={isTogglingPengambilan}
                    className={`mt-2 inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-[11px] font-semibold transition cursor-pointer disabled:opacity-50 ${
                      job?.status_pengambilan === 'terbuka'
                        ? 'bg-amber-50 text-amber-700 hover:bg-amber-100 border border-amber-200'
                        : 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                    }`}
                  >
                    {isTogglingPengambilan ? (
                      'Memproses...'
                    ) : job?.status_pengambilan === 'terbuka' ? (
                      'Tutup Pendaftaran'
                    ) : (
                      'Buka Pendaftaran'
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Seksi: Anggota Tim Terlibat */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3.5 shadow-xs">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Daftar Anggota Tim ({activeWorkers.length} Aktif)
                </h4>
                <p className="text-[11px] text-slate-500">
                  Karyawan yang saat ini aktif ditugaskan atau telah mengambil pekerjaan ini.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAddWorkerOpen((prev) => !prev)}
                className="inline-flex items-center gap-1 rounded-lg bg-blue-50 px-2.5 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 border border-blue-200 transition cursor-pointer"
              >
                <WorkIcon name="plus" className="h-3.5 w-3.5" />
                <span>Tambah Pekerja ke Tim</span>
              </button>
            </div>

            {/* Inline Box Tambah Pekerja */}
            {addWorkerOpen && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-3.5 space-y-2">
                <span className="block text-xs font-bold text-blue-900">
                  Tugaskan Karyawan Tambahan
                </span>
                <div className="flex flex-col sm:flex-row items-center gap-2">
                  <select
                    value={selectedAddEmpId}
                    onChange={(e) => setSelectedAddEmpId(e.target.value)}
                    className="w-full sm:flex-1 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 cursor-pointer"
                  >
                    <option value="">-- Pilih Karyawan yang Belum Tergabung --</option>
                    {availableEmployeesToAdd.map((emp) => (
                      <option key={emp.id_karyawan} value={emp.id_karyawan}>
                        {emp.nama} ({emp.kode_karyawan || `ID:${emp.id_karyawan}`}) - {emp.jabatan || 'Teknisi'}
                      </option>
                    ))}
                  </select>
                  <div className="flex items-center gap-1.5 w-full sm:w-auto">
                    <button
                      type="button"
                      disabled={isAddingWorker || !selectedAddEmpId}
                      onClick={handleConfirmAddWorker}
                      className="flex-1 sm:flex-none inline-flex items-center justify-center rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-blue-700 transition disabled:opacity-50 cursor-pointer"
                    >
                      {isAddingWorker ? 'Menyimpan...' : 'Tambahkan'}
                    </button>
                    <button
                      type="button"
                      disabled={isAddingWorker}
                      onClick={() => {
                        setAddWorkerOpen(false)
                        setSelectedAddEmpId('')
                      }}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Tabel Pekerja Aktif */}
            {activeWorkers.length === 0 ? (
              <p className="py-6 text-center text-xs text-slate-400 italic">
                Belum ada pekerja aktif yang ditugaskan atau mengambil pekerjaan ini.
              </p>
            ) : (
              <div className="overflow-x-auto rounded-lg border border-slate-200">
                <table className="w-full text-left text-xs divide-y divide-slate-200">
                  <thead className="bg-slate-50 text-slate-600 font-semibold">
                    <tr>
                      <th className="px-3.5 py-2.5">Karyawan</th>
                      <th className="px-3.5 py-2.5">Sumber Penugasan</th>
                      <th className="px-3.5 py-2.5">Kehadiran</th>
                      <th className="px-3.5 py-2.5">Status Penugasan</th>
                      <th className="px-3.5 py-2.5 text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 bg-white">
                    {activeWorkers.map((worker) => {
                      const workerStatusKey = worker.status_pekerja || 'belum_hadir'
                      const workerPres =
                        WORKER_STATUS_PRESENTATION[workerStatusKey] ||
                        WORKER_STATUS_PRESENTATION.belum_hadir

                      return (
                        <tr key={worker.id_penugasan || worker.id_karyawan} className="hover:bg-slate-50/60">
                          <td className="px-3.5 py-2.5">
                            <div className="flex flex-col">
                              <span className="font-bold text-slate-900">{worker.nama}</span>
                              <span className="text-[11px] text-slate-400">
                                {worker.kode_karyawan || `ID:${worker.id_karyawan}`} • {worker.jabatan || 'Teknisi'}
                              </span>
                            </div>
                          </td>
                          <td className="px-3.5 py-2.5">
                            {worker.jenis_penugasan === 'mandiri' ? (
                              <span className="inline-flex items-center gap-1 rounded-md bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700 ring-1 ring-purple-600/20">
                                Diambil Mandiri
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 rounded-md bg-sky-50 px-2 py-0.5 text-[11px] font-semibold text-sky-700 ring-1 ring-sky-600/20">
                                Dipilih Admin
                              </span>
                            )}
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span
                              className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[10px] font-semibold ${workerPres.className}`}
                            >
                              <span className={`h-1.5 w-1.5 rounded-full ${workerPres.dot}`} />
                              <span>{workerPres.label}</span>
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5">
                            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 px-2 py-0.5 text-[11px] font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                              Aktif
                            </span>
                          </td>
                          <td className="px-3.5 py-2.5 text-right">
                            <button
                              type="button"
                              onClick={() => setCancelModal({ worker, alasan: '', isSubmitting: false })}
                              className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 hover:text-rose-800 hover:bg-rose-50 px-2 py-1 rounded transition cursor-pointer"
                              title="Batalkan penugasan pekerja ini"
                            >
                              <WorkIcon name="trash" className="h-3.5 w-3.5" />
                              <span>Batalkan</span>
                            </button>
                          </td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Seksi: Riwayat Penugasan yang Dibatalkan */}
          {canceledWorkers.length > 0 && (
            <div className="rounded-xl border border-rose-200 bg-rose-50/40 p-4 space-y-3">
              <div className="flex items-center gap-2 border-b border-rose-100 pb-2">
                <span className="h-2 w-2 rounded-full bg-rose-500" />
                <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                  Riwayat Penugasan Dibatalkan ({canceledWorkers.length})
                </h4>
              </div>
              <div className="space-y-2">
                {canceledWorkers.map((cw) => (
                  <div
                    key={cw.id_penugasan || cw.id_karyawan}
                    className="rounded-lg border border-rose-100 bg-white p-3 text-xs space-y-1 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-800">{cw.nama}</span>
                      <span className="rounded bg-rose-100 px-2 py-0.5 text-[10px] font-bold text-rose-700">
                        Penugasan Dibatalkan
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500">
                      Waktu Pembatalan: {formatDate(cw.dibatalkan_pada)} • Oleh: {cw.dibatalkan_oleh || 'Admin'}
                    </p>
                    <div className="rounded bg-slate-50 p-2 text-[11px] text-slate-700 border border-slate-100">
                      <strong>Alasan:</strong> {cw.alasan_batal || 'Tidak ada catatan alasan pembatalan.'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Akses Cepat Terintegrasi Modul Admin */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/40 p-4 space-y-2.5">
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider block">
              Navigasi Cepat Terintegrasi Proyek
            </span>
            <p className="text-[11px] text-slate-500">
              Lompat langsung ke modul operasional terkait proyek "{job?.nama_pekerjaan}":
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/lokasi?pekerjaan=${job.id_pekerjaan}`)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-300 transition cursor-pointer"
              >
                <WorkIcon name="location" className="h-4 w-4 text-rose-500" />
                <span>Peta Lokasi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/penugasan?pekerjaan=${job.id_pekerjaan}`)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-300 transition cursor-pointer"
              >
                <WorkIcon name="users" className="h-4 w-4 text-blue-600" />
                <span>Atur Penugasan</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/rekap-absensi?pekerjaan=${job.id_pekerjaan}`)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-300 transition cursor-pointer"
              >
                <WorkIcon name="calendar" className="h-4 w-4 text-emerald-600" />
                <span>Rekap Presensi</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/pengeluaran?pekerjaan=${job.id_pekerjaan}`)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white p-2.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:border-blue-300 transition cursor-pointer"
              >
                <WorkIcon name="clipboard" className="h-4 w-4 text-amber-600" />
                <span>Pengeluaran</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-4 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>

        {/* Sub-Dialog: Konfirmasi Pembatalan Penugasan */}
        {cancelModal && (
          <div
            className="fixed inset-0 z-[90] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs"
            onMouseDown={(e) => {
              if (e.target === e.currentTarget && !cancelModal.isSubmitting) setCancelModal(null)
            }}
          >
            <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
                  <WorkIcon name="alert" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Batalkan Penugasan Pekerja
                  </h3>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Batalkan penugasan untuk <strong className="text-slate-800">{cancelModal.worker.nama}</strong> pada pekerjaan ini.
                  </p>
                </div>
              </div>

              <div className="rounded-xl bg-amber-50 p-3 text-[11px] text-amber-800 border border-amber-200/80 leading-relaxed">
                ℹ️ Slot kuota akan dibebaskan kembali sehingga pekerja lain dapat mengambilnya. Riwayat jam kerja dan absensi sebelumnya tidak akan terhapus.
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Alasan Pembatalan <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="Contoh: Karyawan dipindahkan ke proyek mendesak lainnya..."
                  value={cancelModal.alasan}
                  onChange={(e) =>
                    setCancelModal((prev) => ({ ...prev, alasan: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none transition focus:border-rose-500 focus:ring-1 focus:ring-rose-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  disabled={cancelModal.isSubmitting}
                  onClick={() => setCancelModal(null)}
                  className="rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Kembali
                </button>
                <button
                  type="button"
                  disabled={cancelModal.isSubmitting || !cancelModal.alasan.trim()}
                  onClick={handleConfirmCancelWorker}
                  className="rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-2xs hover:bg-rose-700 transition disabled:opacity-50 cursor-pointer"
                >
                  {cancelModal.isSubmitting ? 'Membatalkan...' : 'Ya, Batalkan Penugasan'}
                </button>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  )
}

// Modal Tambah / Edit Pekerjaan (Admin)
function WorkModal({ mode, job, employees, onClose, onSave, isSaving }) {
  const isEdit = mode === 'edit'

  const initialEmployeeIds = useMemo(() => {
    if (!job) return []
    if (job.assigned_workers && job.assigned_workers.length > 0) {
      return job.assigned_workers.map((w) => Number(w.id_karyawan))
    }
    if (job.id_karyawan_list) {
      return String(job.id_karyawan_list)
        .split(',')
        .map((s) => Number(s.trim()))
        .filter((n) => Number.isInteger(n) && n > 0)
    }
    return []
  }, [job])

  const [values, setValues] = useState(
    job
      ? {
          nama_pekerjaan: job.nama_pekerjaan || '',
          deskripsi: job.deskripsi || '',
          lokasi: job.lokasi || '',
          latitude: job.latitude ? String(job.latitude) : '',
          longitude: job.longitude ? String(job.longitude) : '',
          radius_meter: job.radius_meter ? Number(job.radius_meter) : 100,
          tanggal_mulai: job.tanggal_mulai || '',
          target_selesai: job.target_selesai || '',
          status: job.status || STATUS_PEKERJAAN.BELUM_MULAI,
          metode_penentuan: job.metode_penentuan || 'terbuka',
          kuota_pekerja:
            job.kuota_pekerja !== null && job.kuota_pekerja !== undefined
              ? String(job.kuota_pekerja)
              : '',
          is_unlimited_kuota:
            job.kuota_pekerja === null ||
            job.kuota_pekerja === undefined ||
            job.kuota_pekerja === '',
          status_pengambilan: job.status_pengambilan || 'terbuka',
          id_karyawan_list: initialEmployeeIds,
        }
      : {
          nama_pekerjaan: '',
          deskripsi: '',
          lokasi: '',
          latitude: '',
          longitude: '',
          radius_meter: 100,
          tanggal_mulai: '',
          target_selesai: '',
          status: STATUS_PEKERJAAN.BELUM_MULAI,
          metode_penentuan: 'terbuka',
          kuota_pekerja: '',
          is_unlimited_kuota: true,
          status_pengambilan: 'terbuka',
          id_karyawan_list: [],
        },
  )

  const [validationMessage, setValidationMessage] = useState('')

  function updateField(field, value) {
    setValues((current) => ({ ...current, [field]: value }))
    setValidationMessage('')
  }

  function toggleEmployee(employeeId) {
    const id = Number(employeeId)
    setValues((current) => {
      const exists = current.id_karyawan_list.includes(id)
      return {
        ...current,
        id_karyawan_list: exists
          ? current.id_karyawan_list.filter((x) => x !== id)
          : [...current.id_karyawan_list, id],
      }
    })
    setValidationMessage('')
  }

  async function handleSubmit(event) {
    event.preventDefault()
    const normalized = {
      nama_pekerjaan: values.nama_pekerjaan.trim(),
      deskripsi: values.deskripsi.trim(),
      lokasi: values.lokasi.trim(),
      latitude:
        values.latitude && !isNaN(parseFloat(values.latitude))
          ? parseFloat(values.latitude)
          : null,
      longitude:
        values.longitude && !isNaN(parseFloat(values.longitude))
          ? parseFloat(values.longitude)
          : null,
      radius_meter: values.radius_meter ? Number(values.radius_meter) : 100,
      tanggal_mulai: values.tanggal_mulai || null,
      target_selesai: values.target_selesai || null,
      status: values.status || STATUS_PEKERJAAN.BELUM_MULAI,
      metode_penentuan: values.metode_penentuan,
      kuota_pekerja:
        values.is_unlimited_kuota || !values.kuota_pekerja
          ? null
          : Number(values.kuota_pekerja),
      status_pengambilan:
        values.metode_penentuan === 'langsung' ? 'ditutup' : values.status_pengambilan || 'terbuka',
      id_karyawan_list:
        values.metode_penentuan === 'langsung' || values.metode_penentuan === 'gabungan'
          ? values.id_karyawan_list
          : [],
    }

    if (!normalized.nama_pekerjaan) {
      setValidationMessage('Nama pekerjaan wajib diisi.')
      return
    }
    if (
      normalized.tanggal_mulai &&
      normalized.target_selesai &&
      normalized.target_selesai < normalized.tanggal_mulai
    ) {
      setValidationMessage('Batas waktu pekerjaan tidak boleh lebih awal dari tanggal mulai.')
      return
    }
    if (
      normalized.metode_penentuan === 'langsung' &&
      normalized.id_karyawan_list.length === 0
    ) {
      setValidationMessage('Pilih minimal satu pekerja untuk metode Admin Menentukan Pekerja.')
      return
    }
    if (normalized.metode_penentuan === 'gabungan') {
      if (normalized.id_karyawan_list.length === 0) {
        setValidationMessage(
          'Pilih minimal satu pekerja awal pilihan Admin untuk metode Gabungan.',
        )
        return
      }
      if (!values.is_unlimited_kuota) {
        const kuotaNum = Number(values.kuota_pekerja)
        if (!kuotaNum || kuotaNum <= 0) {
          setValidationMessage(
            'Masukkan jumlah kuota pekerja yang valid (angka positif) atau centang Tanpa Batas Kuota.',
          )
          return
        }
        if (kuotaNum <= normalized.id_karyawan_list.length) {
          setValidationMessage(
            `Total kuota (${kuotaNum} orang) harus lebih besar dari jumlah pekerja pilihan Admin (${normalized.id_karyawan_list.length} orang) agar tersisa slot untuk pekerja mandiri.`,
          )
          return
        }
      }
    }
    if (normalized.metode_penentuan === 'terbuka' && !values.is_unlimited_kuota) {
      const kuotaNum = Number(values.kuota_pekerja)
      if (!kuotaNum || kuotaNum <= 0) {
        setValidationMessage('Masukkan jumlah kuota pekerja yang valid atau centang Tanpa Batas Kuota.')
        return
      }
    }

    setValidationMessage('')
    await onSave(normalized)
  }

  const title = mode === 'create' ? 'Tambah Pekerjaan' : 'Edit Data Pekerjaan'
  const subtitle =
    mode === 'create'
      ? 'Masukkan rincian proyek, lokasi pada peta, tentukan cara pemilihan pekerja, dan atur kuota tim.'
      : `Perbarui rincian jadwal, lokasi, cara penentuan, atau kuota untuk proyek ${job?.nama_pekerjaan}.`

  // Kalkulasi live alokasi tim
  const adminSelectedCount = values.id_karyawan_list.length
  const totalKuotaNum = Number(values.kuota_pekerja) || 0
  const remainingOpenSlots = values.is_unlimited_kuota
    ? 'Tanpa Batas'
    : Math.max(0, totalKuotaNum - adminSelectedCount)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="job-modal-title"
        className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all my-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <h2 id="job-modal-title" className="text-base sm:text-lg font-bold text-slate-900">
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50 cursor-pointer"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <WorkIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[82vh] overflow-y-auto">
          {validationMessage && (
            <div
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
              role="alert"
            >
              <WorkIcon name="alert" className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{validationMessage}</span>
            </div>
          )}

          {/* Nama Pekerjaan */}
          <div>
            <label htmlFor="job-nama" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Nama Pekerjaan <span className="text-rose-500">*</span>
            </label>
            <input
              id="job-nama"
              type="text"
              required
              autoFocus
              maxLength={150}
              placeholder="Contoh: Instalasi Jaringan Gedung B"
              value={values.nama_pekerjaan}
              onChange={(e) => updateField('nama_pekerjaan', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {/* Lokasi Pekerjaan */}
          <div>
            <label htmlFor="job-lokasi" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Lokasi Pekerjaan
            </label>
            <div className="relative">
              <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-slate-400">
                <WorkIcon name="location" className="h-4 w-4" />
              </span>
              <input
                id="job-lokasi"
                type="text"
                maxLength={150}
                placeholder="Contoh: Kantor Cabang Sudirman, Lantai 2"
                value={values.lokasi}
                onChange={(e) => updateField('lokasi', e.target.value)}
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* Integrasi Peta Interaktif & Koordinat GPS */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <WorkIcon name="location" className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-slate-800">
                  Peta Interaktif &amp; Titik Koordinat Presensi
                </span>
              </div>
            </div>

            {/* Peta Interaktif */}
            <InteractiveMapPicker
              latitude={values.latitude}
              longitude={values.longitude}
              radiusMeter={values.radius_meter}
              locationName={values.lokasi}
              onCoordinateChange={(lat, lng) => {
                setValues((prev) => ({
                  ...prev,
                  latitude: String(lat),
                  longitude: String(lng),
                }))
              }}
            />

            {/* Input Latitude, Longitude, Radius */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-1">
              <div>
                <label htmlFor="job-latitude" className="block text-[11px] font-medium text-slate-600 mb-1">
                  Latitude
                </label>
                <input
                  id="job-latitude"
                  type="text"
                  placeholder="Contoh: -6.208800"
                  value={values.latitude}
                  onChange={(e) => updateField('latitude', e.target.value)}
                  className="w-full font-mono rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="job-longitude" className="block text-[11px] font-medium text-slate-600 mb-1">
                  Longitude
                </label>
                <input
                  id="job-longitude"
                  type="text"
                  placeholder="Contoh: 106.845600"
                  value={values.longitude}
                  onChange={(e) => updateField('longitude', e.target.value)}
                  className="w-full font-mono rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>

              <div>
                <label htmlFor="job-radius" className="block text-[11px] font-medium text-slate-600 mb-1">
                  Radius Absensi (meter)
                </label>
                <input
                  id="job-radius"
                  type="number"
                  min="10"
                  max="5000"
                  placeholder="100"
                  value={values.radius_meter}
                  onChange={(e) => updateField('radius_meter', e.target.value)}
                  className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Tanggal Mulai & Batas Waktu Pekerjaan */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label htmlFor="job-tgl-mulai" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Tanggal Mulai
              </label>
              <input
                id="job-tgl-mulai"
                type="date"
                value={values.tanggal_mulai}
                onChange={(e) => updateField('tanggal_mulai', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            <div>
              <label htmlFor="job-target-selesai" className="block text-xs font-semibold text-slate-700 mb-1.5">
                Batas Waktu Pekerjaan
              </label>
              <input
                id="job-target-selesai"
                type="date"
                value={values.target_selesai}
                onChange={(e) => updateField('target_selesai', e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs sm:text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </div>

          {/* Status Pekerjaan (Dapat Ditentukan / Diedit Admin) */}
          <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Status Pekerjaan:</span>
                <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                  values.status === STATUS_PEKERJAAN.BERJALAN
                    ? 'bg-blue-100 text-blue-700 ring-1 ring-blue-700/20'
                    : values.status === STATUS_PEKERJAAN.SELESAI
                    ? 'bg-emerald-100 text-emerald-700 ring-1 ring-emerald-600/20'
                    : 'bg-amber-100 text-amber-800 ring-1 ring-amber-600/20'
                }`}>
                  {values.status === STATUS_PEKERJAAN.BERJALAN
                    ? 'Sedang Berjalan'
                    : values.status === STATUS_PEKERJAAN.SELESAI
                    ? 'Selesai'
                    : 'Belum Dimulai'}
                </span>
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                Pilih status untuk membuka / mengunci izin absensi
              </span>
            </div>

            {/* Tombol Pilihan Status Interaktif */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {/* 1. Belum Dimulai */}
              <button
                type="button"
                onClick={() => updateField('status', STATUS_PEKERJAAN.BELUM_MULAI)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer border ${
                  values.status === STATUS_PEKERJAAN.BELUM_MULAI
                    ? 'bg-amber-500 text-white border-amber-600 shadow-sm ring-2 ring-amber-500/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${values.status === STATUS_PEKERJAAN.BELUM_MULAI ? 'bg-white' : 'bg-amber-500'}`} />
                <span>Belum Dimulai</span>
              </button>

              {/* 2. Sedang Berjalan (Absensi Aktif) */}
              <button
                type="button"
                onClick={() => updateField('status', STATUS_PEKERJAAN.BERJALAN)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer border ${
                  values.status === STATUS_PEKERJAAN.BERJALAN
                    ? 'bg-blue-600 text-white border-blue-700 shadow-sm ring-2 ring-blue-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-blue-50/50 hover:text-blue-700 hover:border-blue-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${values.status === STATUS_PEKERJAAN.BERJALAN ? 'bg-white animate-pulse' : 'bg-blue-500'}`} />
                <span>Sedang Berjalan (Absen Buka)</span>
              </button>

              {/* 3. Selesai */}
              <button
                type="button"
                onClick={() => updateField('status', STATUS_PEKERJAAN.SELESAI)}
                className={`flex items-center justify-center gap-2 rounded-xl px-3 py-2.5 text-xs font-semibold transition cursor-pointer border ${
                  values.status === STATUS_PEKERJAAN.SELESAI
                    ? 'bg-emerald-600 text-white border-emerald-700 shadow-sm ring-2 ring-emerald-600/20'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:border-slate-300'
                }`}
              >
                <span className={`h-2 w-2 rounded-full ${values.status === STATUS_PEKERJAAN.SELESAI ? 'bg-white' : 'bg-emerald-500'}`} />
                <span>Selesai</span>
              </button>
            </div>

            {/* Keterangan Status Kontekstual */}
            <div className="text-[11px] leading-relaxed pt-0.5">
              {values.status === STATUS_PEKERJAAN.BERJALAN ? (
                <div className="flex items-start gap-1.5 text-blue-700 bg-blue-50/80 px-2.5 py-1.5 rounded-lg border border-blue-200/60">
                  <span className="font-bold">✓</span>
                  <span>
                    Status <strong>Sedang Berjalan</strong>: Karyawan yang ditugaskan dapat langsung melakukan absensi masuk dan pulang pada proyek ini.
                  </span>
                </div>
              ) : values.status === STATUS_PEKERJAAN.SELESAI ? (
                <div className="flex items-start gap-1.5 text-emerald-700 bg-emerald-50/80 px-2.5 py-1.5 rounded-lg border border-emerald-200/60">
                  <span className="font-bold">✓</span>
                  <span>
                    Status <strong>Selesai</strong>: Seluruh pekerjaan telah tuntas dan absensi baru ditutup.
                  </span>
                </div>
              ) : (
                <div className="flex items-start gap-1.5 text-amber-800 bg-amber-50/80 px-2.5 py-1.5 rounded-lg border border-amber-200/60">
                  <span className="font-bold">ℹ</span>
                  <span>
                    Status <strong>Belum Dimulai</strong>: Absensi terkunci. Klik tombol <strong>"Sedang Berjalan (Absen Buka)"</strong> di atas agar karyawan bisa absen.
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Siapa yang Menentukan Pekerja? (3 Metode) */}
          <div className="space-y-2 pt-1">
            <span className="block text-xs font-semibold text-slate-700">
              Siapa yang Menentukan Pekerja? <span className="text-rose-500">*</span>
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* A. Admin Menentukan Pekerja */}
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                  values.metode_penentuan === 'langsung'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="metode_penentuan"
                    value="langsung"
                    checked={values.metode_penentuan === 'langsung'}
                    onChange={() => updateField('metode_penentuan', 'langsung')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Admin Menentukan
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                  Admin memilih satu atau beberapa karyawan. Penugasan langsung masuk ke Pekerjaan Saya.
                </p>
              </label>

              {/* B. Pekerja Memilih Sendiri */}
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                  values.metode_penentuan === 'terbuka'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="metode_penentuan"
                    value="terbuka"
                    checked={values.metode_penentuan === 'terbuka'}
                    onChange={() => updateField('metode_penentuan', 'terbuka')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Pekerja Memilih Sendiri
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                  Tampil di menu Pekerjaan Tersedia. Diambil mandiri oleh pekerja hingga kuota penuh.
                </p>
              </label>

              {/* C. Gabungan Admin dan Pekerja */}
              <label
                className={`flex cursor-pointer flex-col rounded-xl border p-3 transition ${
                  values.metode_penentuan === 'gabungan'
                    ? 'border-blue-500 bg-blue-50/50 ring-2 ring-blue-500/20'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="metode_penentuan"
                    value="gabungan"
                    checked={values.metode_penentuan === 'gabungan'}
                    onChange={() => updateField('metode_penentuan', 'gabungan')}
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="text-xs font-bold text-slate-800">
                    Gabungan Admin &amp; Pekerja
                  </span>
                </div>
                <p className="mt-1.5 text-[10px] text-slate-500 leading-relaxed">
                  Admin memilih pekerja awal, dan sisa kuota dibuka untuk diambil mandiri oleh pekerja lain.
                </p>
              </label>
            </div>
          </div>

          {/* Checklist Karyawan (Jika Admin Menentukan atau Gabungan) */}
          {(values.metode_penentuan === 'langsung' || values.metode_penentuan === 'gabungan') && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-700">
                  {values.metode_penentuan === 'gabungan'
                    ? 'Pilih Karyawan Ditentukan Admin di Awal'
                    : 'Pilih Karyawan yang Ditugaskan Langsung'}{' '}
                  <span className="text-rose-500">*</span>
                </span>
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-700">
                  {values.id_karyawan_list.length} dipilih
                </span>
              </div>

              <div className="max-h-40 overflow-y-auto rounded-lg border border-slate-200 bg-white divide-y divide-slate-100 p-1">
                {employees.length === 0 ? (
                  <p className="p-3 text-center text-xs text-slate-400">
                    Belum ada data karyawan aktif.
                  </p>
                ) : (
                  employees.map((emp) => {
                    const isChecked = values.id_karyawan_list.includes(emp.id_karyawan)
                    return (
                      <label
                        key={emp.id_karyawan}
                        className={`flex items-center gap-2.5 p-2 rounded-md cursor-pointer transition text-xs ${
                          isChecked
                            ? 'bg-blue-50/80 text-blue-900 font-semibold'
                            : 'hover:bg-slate-50 text-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleEmployee(emp.id_karyawan)}
                          className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                        <span className="flex-1 truncate">{emp.nama}</span>
                        <span className="text-[11px] text-slate-400 font-mono">
                          {emp.kode_karyawan || `ID:${emp.id_karyawan}`}
                        </span>
                        <span className="text-[11px] text-slate-500">
                          {emp.jabatan || 'Teknisi'}
                        </span>
                      </label>
                    )
                  })
                )}
              </div>
            </div>
          )}

          {/* Pengaturan Kuota Pekerja (Jika Pekerja Memilih Sendiri atau Gabungan) */}
          {(values.metode_penentuan === 'terbuka' || values.metode_penentuan === 'gabungan') && (
            <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-800">
                  Pengaturan Kuota &amp; Pendaftaran Tim
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-center">
                <div>
                  <label htmlFor="job-kuota" className="block text-[11px] font-medium text-slate-600 mb-1">
                    Jumlah Maksimal Pekerja (Kuota)
                  </label>
                  <input
                    id="job-kuota"
                    type="number"
                    min="1"
                    disabled={values.is_unlimited_kuota}
                    placeholder={values.is_unlimited_kuota ? 'Tanpa batas kuota' : 'Contoh: 5'}
                    value={values.is_unlimited_kuota ? '' : values.kuota_pekerja}
                    onChange={(e) => updateField('kuota_pekerja', e.target.value)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:bg-slate-100 disabled:text-slate-400"
                  />
                </div>

                <div className="pt-4 sm:pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="checkbox"
                      checked={values.is_unlimited_kuota}
                      onChange={(e) => updateField('is_unlimited_kuota', e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    <span>Tanpa Batas Kuota (Bebas Kuota)</span>
                  </label>
                </div>
              </div>

              {/* Pratinjau Alokasi Kuota Khusus Metode Gabungan */}
              {values.metode_penentuan === 'gabungan' && (
                <div className="rounded-xl border border-indigo-100 bg-indigo-50/70 p-3 text-xs text-indigo-950 space-y-2">
                  <p className="font-bold flex items-center gap-1.5 text-indigo-900">
                    <span>📊</span> Pratinjau Alokasi Kuota Tim Gabungan:
                  </p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div className="bg-white/90 rounded-lg p-2 border border-indigo-200/50 shadow-2xs">
                      <span className="text-slate-500 block text-[10px]">Total Kuota</span>
                      <strong className="text-indigo-700 text-xs sm:text-sm font-bold">
                        {values.is_unlimited_kuota ? 'Tanpa Batas' : `${values.kuota_pekerja || 0} Orang`}
                      </strong>
                    </div>
                    <div className="bg-white/90 rounded-lg p-2 border border-indigo-200/50 shadow-2xs">
                      <span className="text-slate-500 block text-[10px]">Dipilih Admin</span>
                      <strong className="text-blue-700 text-xs sm:text-sm font-bold">
                        {adminSelectedCount} Orang
                      </strong>
                    </div>
                    <div className="bg-white/90 rounded-lg p-2 border border-indigo-200/50 shadow-2xs">
                      <span className="text-slate-500 block text-[10px]">Slot Pekerja Mandiri</span>
                      <strong className="text-emerald-700 text-xs sm:text-sm font-bold">
                        {remainingOpenSlots} {values.is_unlimited_kuota ? '' : 'Slot'}
                      </strong>
                    </div>
                  </div>
                  {!values.is_unlimited_kuota && totalKuotaNum <= adminSelectedCount && (
                    <p className="text-[11px] font-semibold text-rose-600 pt-0.5">
                      ⚠️ Kuota harus lebih besar dari jumlah pekerja yang dipilih Admin ({adminSelectedCount} orang) agar ada slot untuk pekerja mandiri.
                    </p>
                  )}
                </div>
              )}

              {/* Status Pendaftaran Mandiri */}
              <div className="pt-1">
                <span className="block text-[11px] font-medium text-slate-600 mb-1">
                  Status Pengambilan Mandiri Saat Ini
                </span>
                <div className="flex items-center gap-4 text-xs">
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status_pengambilan"
                      value="terbuka"
                      checked={values.status_pengambilan === 'terbuka'}
                      onChange={() => updateField('status_pengambilan', 'terbuka')}
                      className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-emerald-700">Pendaftaran Terbuka</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer">
                    <input
                      type="radio"
                      name="status_pengambilan"
                      value="ditutup"
                      checked={values.status_pengambilan === 'ditutup'}
                      onChange={() => updateField('status_pengambilan', 'ditutup')}
                      className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500"
                    />
                    <span className="font-semibold text-amber-700">Pendaftaran Ditutup</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Deskripsi Pekerjaan */}
          <div>
            <label htmlFor="job-deskripsi" className="block text-xs font-semibold text-slate-700 mb-1.5">
              Deskripsi Pekerjaan
            </label>
            <textarea
              id="job-deskripsi"
              rows={3}
              placeholder="Rincian instruksi teknis dan lingkup pekerjaan..."
              value={values.deskripsi}
              onChange={(e) => updateField('deskripsi', e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          {/* Tombol Aksi */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-wait cursor-pointer"
            >
              {isSaving ? (
                <>
                  <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : mode === 'create' ? (
                'Simpan Pekerjaan'
              ) : (
                'Simpan Perubahan'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

// Modal Pemantauan Kehadiran & Status Pekerja Individual
function WorkerMonitoringModal({ job, onClose, onRefresh }) {
  const [workers, setWorkers] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [updatingId, setUpdatingId] = useState(null)
  const [overrideModal, setOverrideModal] = useState(null) // { worker, targetStatus }
  const [noteInput, setNoteInput] = useState('')
  const [notice, setNotice] = useState(null)

  const loadWorkers = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPekerjaanPekerja(job.id_pekerjaan)
      setWorkers(Array.isArray(res) ? res : [])
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal memuat status pekerja: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }, [job.id_pekerjaan])

  useEffect(() => {
    loadWorkers()
  }, [loadWorkers])

  async function handleConfirmOverride() {
    if (!overrideModal) return
    const { worker, targetStatus } = overrideModal
    setUpdatingId(worker.id_karyawan)

    try {
      await updatePekerjaanStatusPekerja(
        job.id_pekerjaan,
        worker.id_karyawan,
        targetStatus,
        noteInput.trim(),
      )
      setOverrideModal(null)
      setNoteInput('')
      await loadWorkers()
      onRefresh?.()
      setNotice({ type: 'success', message: `Status ${worker.nama_karyawan} berhasil diperbarui.` })
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal memperbarui status: ${err.message}` })
    } finally {
      setUpdatingId(null)
    }
  }

  async function handleResetToAuto(worker) {
    setUpdatingId(worker.id_karyawan)
    try {
      await updatePekerjaanStatusPekerja(
        job.id_pekerjaan,
        worker.id_karyawan,
        'otomatis',
        '',
      )
      await loadWorkers()
      onRefresh?.()
      setNotice({ type: 'success', message: `Status ${worker.nama_karyawan} dikembalikan ke otomatis berdasarkan absensi.` })
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal mengembalikan status: ${err.message}` })
    } finally {
      setUpdatingId(null)
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl my-6"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <WorkIcon name="users" className="h-5 w-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Pemantauan Status Karyawan
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Pekerjaan: <strong className="text-slate-800">{job.nama_pekerjaan}</strong> (#{job.id_pekerjaan})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition cursor-pointer"
          >
            <WorkIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {notice && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
                notice.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>{notice.message}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3 text-xs text-slate-600 space-y-1">
            <p className="font-semibold text-blue-900">
              📌 Ketentuan Pemantauan Status:
            </p>
            <p>
              • <strong>Belum Hadir</strong>: Karyawan belum melakukan absensi masuk hari ini.<br />
              • <strong>Sedang Bekerja</strong>: Karyawan sudah absensi masuk dan belum absensi pulang.<br />
              • <strong>Selesai Bertugas</strong>: Karyawan telah melakukan absensi pulang.<br />
              • <strong>Tidak Hadir</strong> &amp; <strong>Meninggalkan Pekerjaan</strong>: Memerlukan konfirmasi resmi dari Admin.
            </p>
          </div>

          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Memuat data kehadiran pekerja...
            </div>
          ) : workers.length === 0 ? (
            <div className="py-12 text-center text-slate-400 text-sm">
              Belum ada karyawan yang ditugaskan pada pekerjaan ini.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden">
              {workers.map((w) => {
                const statusMeta = WORKER_STATUS_PRESENTATION[w.computed_status] || WORKER_STATUS_PRESENTATION.belum_hadir
                const isConfirmedByAdmin = Boolean(Number(w.status_konfirmasi_admin) === 1)

                return (
                  <div
                    key={w.id_karyawan}
                    className="p-4 bg-white hover:bg-slate-50/60 transition flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900 truncate">
                          {w.nama_karyawan}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          ({w.jabatan || 'Teknisi'})
                        </span>
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusMeta.className}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${statusMeta.dot}`} />
                          {statusMeta.label}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
                        <span>
                          Masuk: <strong className="text-slate-800">{w.jam_masuk || '—'}</strong>
                        </span>
                        <span>•</span>
                        <span>
                          Pulang: <strong className="text-slate-800">{w.jam_pulang || '—'}</strong>
                        </span>
                        {w.durasi_format && w.jam_masuk && (
                          <>
                            <span>•</span>
                            <span>
                              Durasi: <strong className="text-slate-800">{w.durasi_format}</strong>
                            </span>
                          </>
                        )}
                      </div>

                      {isConfirmedByAdmin && (
                        <p className="text-[11px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded w-fit border border-amber-200/60">
                          ⚠️ Dikonfirmasi Admin: {w.catatan_admin ? `"${w.catatan_admin}"` : 'Tanpa catatan'}
                        </p>
                      )}
                    </div>

                    {/* Aksi Konfirmasi Admin */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setOverrideModal({
                            worker: w,
                            targetStatus: 'tidak_hadir',
                            title: 'Konfirmasi Tidak Hadir',
                          })
                        }
                        disabled={updatingId === w.id_karyawan}
                        className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-100 transition cursor-pointer"
                        title="Tandai pekerja ini Tidak Hadir"
                      >
                        Tidak Hadir
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          setOverrideModal({
                            worker: w,
                            targetStatus: 'meninggalkan_pekerjaan',
                            title: 'Konfirmasi Meninggalkan Pekerjaan',
                          })
                        }
                        disabled={updatingId === w.id_karyawan}
                        className="rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100 transition cursor-pointer"
                        title="Tandai pekerja Meninggalkan Pekerjaan sebelum jam selesai"
                      >
                        Meninggalkan
                      </button>

                      {isConfirmedByAdmin && (
                        <button
                          type="button"
                          onClick={() => handleResetToAuto(w)}
                          disabled={updatingId === w.id_karyawan}
                          className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                          title="Kembalikan status berdasarkan catatan absensi otomatis"
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </section>

      {/* Sub-Modal Konfirmasi Override Status */}
      {overrideModal && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {overrideModal.title}
            </h3>
            <p className="text-xs text-slate-600">
              Karyawan: <strong>{overrideModal.worker.nama_karyawan}</strong>
            </p>

            <div>
              <label htmlFor="catatan-konfirmasi" className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Alasan Admin (Wajib)
              </label>
              <textarea
                id="catatan-konfirmasi"
                rows={3}
                placeholder="Contoh: Karyawan izin mendadak sakit / meninggalkan area tugas tanpa izin..."
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setOverrideModal(null)
                  setNoteInput('')
                }}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmOverride}
                disabled={!noteInput.trim()}
                className="rounded-xl bg-blue-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 transition disabled:opacity-50"
              >
                Konfirmasi Status
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Modal Laporan & Persetujuan Penyelesaian Pekerjaan
function ReportApprovalModal({ job, employees, onClose, onRefresh }) {
  const [reports, setReports] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [actionId, setActionId] = useState(null)
  const [actionDialog, setActionDialog] = useState(null) // { report, type: 'approve' | 'reject' }
  const [noteInput, setNoteInput] = useState('')
  const [showAddReportForm, setShowAddReportForm] = useState(false)
  const [notice, setNotice] = useState(null)

  // Form Tambah Laporan
  const [newReport, setNewReport] = useState({
    id_karyawan: employees[0]?.id_karyawan || '',
    tipe_laporan: 'akhir',
    judul: 'Laporan Penyelesaian Pekerjaan',
    keterangan: '',
    foto_dokumentasi: '',
  })

  const loadReports = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await getPekerjaanLaporan(job.id_pekerjaan)
      setReports(Array.isArray(res) ? res : [])
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal memuat laporan: ${err.message}` })
    } finally {
      setIsLoading(false)
    }
  }, [job.id_pekerjaan])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function handleActionSubmit() {
    if (!actionDialog) return
    const { report, type } = actionDialog
    setActionId(report.id_laporan)

    try {
      if (type === 'approve') {
        await setujuiPekerjaanLaporan(report.id_laporan, noteInput.trim())
        setNotice({
          type: 'success',
          message: 'Laporan berhasil disetujui! Status pekerjaan kini Selesai.',
        })
      } else {
        await tolakPekerjaanLaporan(report.id_laporan, noteInput.trim())
        setNotice({
          type: 'success',
          message: 'Laporan ditolak dengan catatan evaluasi.',
        })
      }
      setActionDialog(null)
      setNoteInput('')
      await loadReports()
      onRefresh?.()
    } catch (err) {
      setNotice({ type: 'error', message: `Aksi gagal: ${err.message}` })
    } finally {
      setActionId(null)
    }
  }

  async function handleCreateReport(e) {
    e.preventDefault()
    if (!newReport.judul.trim() || !newReport.id_karyawan) {
      setNotice({ type: 'error', message: 'Judul laporan dan pelapor wajib diisi.' })
      return
    }

    try {
      await createPekerjaanLaporan(job.id_pekerjaan, {
        id_karyawan: Number(newReport.id_karyawan),
        tipe_laporan: newReport.tipe_laporan,
        judul: newReport.judul.trim(),
        keterangan: newReport.keterangan.trim(),
        foto_dokumentasi: newReport.foto_dokumentasi || null,
      })
      setShowAddReportForm(false)
      setNewReport({
        id_karyawan: employees[0]?.id_karyawan || '',
        tipe_laporan: 'akhir',
        judul: 'Laporan Penyelesaian Pekerjaan',
        keterangan: '',
        foto_dokumentasi: '',
      })
      await loadReports()
      onRefresh?.()
      setNotice({ type: 'success', message: 'Laporan penyelesaian berhasil dikirim untuk diverifikasi.' })
    } catch (err) {
      setNotice({ type: 'error', message: `Gagal mengirim laporan: ${err.message}` })
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        className="w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl my-6"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <WorkIcon name="clipboard" className="h-5 w-5 text-blue-600" />
              <h2 className="text-base sm:text-lg font-bold text-slate-900">
                Laporan & Persetujuan Penyelesaian
              </h2>
            </div>
            <p className="mt-0.5 text-xs text-slate-500">
              Pekerjaan: <strong className="text-slate-800">{job.nama_pekerjaan}</strong> (#{job.id_pekerjaan})
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition cursor-pointer"
          >
            <WorkIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
          {notice && (
            <div
              className={`p-3 rounded-xl text-xs font-medium flex items-center justify-between ${
                notice.type === 'error'
                  ? 'bg-rose-50 text-rose-800 border border-rose-200'
                  : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              }`}
            >
              <span>{notice.message}</span>
              <button
                type="button"
                onClick={() => setNotice(null)}
                className="text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            </div>
          )}

          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700">
              Daftar Laporan Pekerjaan ({reports.length})
            </span>
            <button
              type="button"
              onClick={() => setShowAddReportForm((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100 transition cursor-pointer"
            >
              <WorkIcon name="plus" className="h-3.5 w-3.5" />
              <span>{showAddReportForm ? 'Tutup Form' : 'Input Laporan Penyelesaian'}</span>
            </button>
          </div>

          {/* Form Input Laporan Baru */}
          {showAddReportForm && (
            <form onSubmit={handleCreateReport} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4 space-y-3 text-xs">
              <h4 className="font-bold text-blue-900 text-sm">
                Kirim Laporan Penyelesaian Proyek
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label htmlFor="rep-karyawan" className="block font-semibold text-slate-700 mb-1">
                    Karyawan Pelapor <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="rep-karyawan"
                    value={newReport.id_karyawan}
                    onChange={(e) => setNewReport({ ...newReport, id_karyawan: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                    required
                  >
                    {employees.map((emp) => (
                      <option key={emp.id_karyawan} value={emp.id_karyawan}>
                        {emp.nama} ({emp.jabatan || 'Teknisi'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="rep-tipe" className="block font-semibold text-slate-700 mb-1">
                    Tipe Laporan
                  </label>
                  <select
                    id="rep-tipe"
                    value={newReport.tipe_laporan}
                    onChange={(e) => setNewReport({ ...newReport, tipe_laporan: e.target.value })}
                    className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                  >
                    <option value="akhir">Laporan Akhir (Penyelesaian Pekerjaan)</option>
                    <option value="progres">Laporan Progres Berkala</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="rep-judul" className="block font-semibold text-slate-700 mb-1">
                  Judul Laporan <span className="text-rose-500">*</span>
                </label>
                <input
                  id="rep-judul"
                  type="text"
                  required
                  value={newReport.judul}
                  onChange={(e) => setNewReport({ ...newReport, judul: e.target.value })}
                  placeholder="Contoh: Pekerjaan Instalasi Kabel Selesai 100%"
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                />
              </div>

              <div>
                <label htmlFor="rep-ket" className="block font-semibold text-slate-700 mb-1">
                  Keterangan & Catatan Hasil Kerja
                </label>
                <textarea
                  id="rep-ket"
                  rows={2}
                  value={newReport.keterangan}
                  onChange={(e) => setNewReport({ ...newReport, keterangan: e.target.value })}
                  placeholder="Jelaskan hasil pekerjaan yang sudah rampung..."
                  className="w-full rounded-lg border border-slate-200 bg-white p-2 text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowAddReportForm(false)}
                  className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 font-semibold text-slate-600 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-1.5 font-semibold text-white hover:bg-blue-700"
                >
                  Kirim Laporan
                </button>
              </div>
            </form>
          )}

          {/* List Laporan */}
          {isLoading ? (
            <div className="py-12 text-center text-slate-500 text-sm">
              Memuat data laporan pekerjaan...
            </div>
          ) : reports.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-slate-400 text-xs">
              Belum ada laporan yang dikirim untuk pekerjaan ini.
            </div>
          ) : (
            <div className="space-y-3">
              {reports.map((r) => {
                const isApproved = r.status_persetujuan === 'disetujui'
                const isRejected = r.status_persetujuan === 'ditolak'
                const isPending = r.status_persetujuan === 'menunggu'

                return (
                  <div
                    key={r.id_laporan}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-2xs space-y-3"
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span
                            className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${
                              r.tipe_laporan === 'akhir'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {r.tipe_laporan === 'akhir' ? 'Laporan Akhir' : 'Laporan Progres'}
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {r.judul}
                          </h4>
                        </div>
                        <p className="mt-1 text-xs text-slate-500">
                          Pelapor: <strong className="text-slate-700">{r.nama_karyawan}</strong> ({r.jabatan || 'Teknisi'}) • Tanggal: {formatDate(r.tanggal_laporan)}
                        </p>
                      </div>

                      <div>
                        {isApproved && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            ✓ Disetujui
                          </span>
                        )}
                        {isRejected && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-700 ring-1 ring-inset ring-rose-600/20">
                            ✕ Ditolak
                          </span>
                        )}
                        {isPending && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-semibold text-amber-800 ring-1 ring-inset ring-amber-600/20">
                            Menunggu Verifikasi
                          </span>
                        )}
                      </div>
                    </div>

                    {r.keterangan && (
                      <p className="text-xs text-slate-700 bg-slate-50 p-2.5 rounded-lg border border-slate-100 leading-relaxed whitespace-pre-line">
                        {r.keterangan}
                      </p>
                    )}

                    {r.catatan_admin && (
                      <p className="text-xs text-slate-600 bg-amber-50/60 p-2 rounded-lg border border-amber-200/60">
                        <strong>Catatan Admin:</strong> {r.catatan_admin}
                      </p>
                    )}

                    {/* Tombol Aksi Verifikasi untuk Laporan Menunggu */}
                    {isPending && (
                      <div className="flex items-center justify-end gap-2 border-t border-slate-100 pt-2.5">
                        <button
                          type="button"
                          onClick={() =>
                            setActionDialog({
                              report: r,
                              type: 'reject',
                              title: 'Tolak Laporan Penyelesaian',
                            })
                          }
                          disabled={actionId === r.id_laporan}
                          className="rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-700 hover:bg-rose-50 transition cursor-pointer"
                        >
                          Tolak Laporan
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setActionDialog({
                              report: r,
                              type: 'approve',
                              title: 'Setujui Laporan & Selesaikan Pekerjaan',
                            })
                          }
                          disabled={actionId === r.id_laporan}
                          className="rounded-lg bg-emerald-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-emerald-700 transition cursor-pointer"
                        >
                          Setujui Penyelesaian
                        </button>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end border-t border-slate-100 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </section>

      {/* Dialog Catatan Persetujuan / Penolakan */}
      {actionDialog && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              {actionDialog.title}
            </h3>
            <p className="text-xs text-slate-600">
              Laporan: <strong>{actionDialog.report.judul}</strong> ({actionDialog.report.nama_karyawan})
            </p>

            <div>
              <label htmlFor="catatan-laporan-action" className="block text-xs font-semibold text-slate-700 mb-1">
                Catatan Admin {actionDialog.type === 'reject' ? '(Wajib)' : '(Opsional)'}
              </label>
              <textarea
                id="catatan-laporan-action"
                rows={3}
                placeholder={
                  actionDialog.type === 'approve'
                    ? 'Contoh: Hasil pekerjaan telah diperiksa dan disetujui...'
                    : 'Contoh: Mohon perbaiki kabel dan unggah foto dokumentasi ulang...'
                }
                value={noteInput}
                onChange={(e) => setNoteInput(e.target.value)}
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setActionDialog(null)
                  setNoteInput('')
                }}
                className="rounded-xl border border-slate-200 px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleActionSubmit}
                disabled={actionDialog.type === 'reject' && !noteInput.trim()}
                className={`rounded-xl px-4 py-1.5 text-xs font-semibold text-white transition disabled:opacity-50 ${
                  actionDialog.type === 'approve'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-rose-600 hover:bg-rose-700'
                }`}
              >
                {actionDialog.type === 'approve' ? 'Konfirmasi Setujui' : 'Konfirmasi Tolak'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function DataPekerjaan() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''
  const highlightId = searchParams.get('highlight') || searchParams.get('id') || searchParams.get('detail')

  const [store, setStore] = useState({
    pekerjaan: [],
    isLoading: true,
    isSaving: false,
    error: '',
  })
  const { pekerjaan, isLoading, isSaving, error } = store
  const [employees, setEmployees] = useState([])
  const [notice, setNotice] = useState(null)
  const [modal, setModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  // Modals tambahan untuk Pemantauan Pekerja & Laporan
  const [monitoringJob, setMonitoringJob] = useState(null)
  const [reportJob, setReportJob] = useState(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [methodFilter, setMethodFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)
  const [loadingDetailId, setLoadingDetailId] = useState(null)
  const isMounted = useRef(false)

  // Sinkronkan statusFilter jika query param URL berubah
  useEffect(() => {
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status'))
    }
  }, [searchParams])

  async function loadData() {
    try {
      const [loadedJobs, loadedEmployees] = await Promise.all([
        getPekerjaan(),
        getKaryawan(),
      ])
      if (isMounted.current) {
        setStore({
          pekerjaan: loadedJobs,
          isLoading: false,
          isSaving: false,
          error: '',
        })
        setEmployees(loadedEmployees)

        if (highlightId) {
          const found = loadedJobs.find(
            (j) => Number(j.id_pekerjaan) === Number(highlightId),
          )
          if (found) {
            getPekerjaanById(found.id_pekerjaan)
              .then((fullJob) => {
                if (isMounted.current) setModal({ mode: 'detail', job: fullJob })
              })
              .catch(() => {})
          }
        }
      }
    } catch (loadError) {
      if (isMounted.current) {
        setStore((current) => ({
          ...current,
          isLoading: false,
          error: `Data pekerjaan tidak dapat dimuat: ${loadError.message}`,
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

  function showToast(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }

  const filteredJobs = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')
    const today = getJakartaToday()

    return pekerjaan
      .filter((job) => {
        const matchesName =
          !normalizedSearch ||
          job.nama_pekerjaan.toLocaleLowerCase('id-ID').includes(normalizedSearch) ||
          String(job.id_pekerjaan).includes(normalizedSearch) ||
          (job.lokasi && job.lokasi.toLocaleLowerCase('id-ID').includes(normalizedSearch)) ||
          (job.nama_karyawan_list &&
            job.nama_karyawan_list.toLocaleLowerCase('id-ID').includes(normalizedSearch))

        let matchesStatus = true
        if (statusFilter === 'terlambat') {
          matchesStatus = Boolean(job.is_overdue && job.status !== STATUS_PEKERJAAN.SELESAI)
        } else if (statusFilter) {
          matchesStatus = job.status === statusFilter
        }

        let matchesMethod = true
        if (methodFilter === 'langsung') {
          matchesMethod = job.metode_penentuan === 'langsung'
        } else if (methodFilter === 'terbuka') {
          matchesMethod = job.metode_penentuan === 'terbuka'
        } else if (methodFilter === 'gabungan') {
          matchesMethod = job.metode_penentuan === 'gabungan'
        } else if (methodFilter === 'kuota_penuh') {
          matchesMethod = Boolean(job.is_kuota_penuh)
        } else if (methodFilter === 'expired') {
          matchesMethod =
            Boolean(job.target_selesai) &&
            job.target_selesai < today &&
            job.status !== STATUS_PEKERJAAN.SELESAI
        }

        return matchesName && matchesStatus && matchesMethod
      })
      .sort((left, right) => {
        const comparison = left.nama_pekerjaan.localeCompare(
          right.nama_pekerjaan,
          'id',
          { sensitivity: 'base' },
        )
        return comparison * (sortOrder === 'asc' ? 1 : -1)
      })
  }, [methodFilter, pekerjaan, search, sortOrder, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredJobs.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const visibleJobs = filteredJobs.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const statistics = useMemo(
    () => ({
      total: pekerjaan.length,
      belumMulai: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.BELUM_MULAI,
      ).length,
      berjalan: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.BERJALAN,
      ).length,
      selesai: pekerjaan.filter(
        (job) => job.status === STATUS_PEKERJAAN.SELESAI,
      ).length,
      terlambat: pekerjaan.filter(
        (job) => job.is_overdue && job.status !== STATUS_PEKERJAAN.SELESAI,
      ).length,
    }),
    [pekerjaan],
  )

  const hasActiveFilters = Boolean(search || statusFilter || methodFilter)

  function resetFilters() {
    setSearch('')
    setStatusFilter('')
    setMethodFilter('')
    setPage(1)
  }

  async function handleSaveJob(values) {
    setStore((current) => ({ ...current, isSaving: true, error: '' }))
    try {
      if (modal.mode === 'create') {
        await createPekerjaan(values)
        showToast('Pekerjaan berhasil ditambahkan.')
      } else {
        await updatePekerjaan(modal.job.id_pekerjaan, values)
        showToast('Data pekerjaan berhasil diperbarui.')
      }
      window.dispatchEvent(new CustomEvent('pekerjaan_updated'))
      setModal(null)
      await loadData()
    } catch (saveError) {
      setStore((current) => ({ ...current, isSaving: false }))
      showToast(`Perubahan gagal disimpan: ${saveError.message}`, 'error')
    }
  }

  async function handleDeleteJob(job) {
    setStore((current) => ({ ...current, isSaving: true, error: '' }))
    try {
      await deletePekerjaan(job.id_pekerjaan)
      window.dispatchEvent(new CustomEvent('pekerjaan_updated'))
      setStore((current) => ({
        ...current,
        pekerjaan: current.pekerjaan.filter(
          (item) => item.id_pekerjaan !== job.id_pekerjaan,
        ),
        isSaving: false,
        error: '',
      }))
      showToast('Pekerjaan berhasil dihapus.')
      setPendingDelete(null)
    } catch (deleteError) {
      setStore((current) => ({
        ...current,
        isSaving: false,
      }))
      setPendingDelete(null)
      showToast(`Pekerjaan gagal dihapus: ${deleteError.message}`, 'error')
    }
  }

  async function editJob(job) {
    setLoadingDetailId(job.id_pekerjaan)
    try {
      const currentJob = await getPekerjaanById(job.id_pekerjaan)
      setModal({ mode: 'edit', job: currentJob })
    } catch (detailError) {
      showToast(`Detail pekerjaan gagal dimuat: ${detailError.message}`, 'error')
    } finally {
      setLoadingDetailId(null)
    }
  }

  async function showJobDetail(job) {
    setLoadingDetailId(job.id_pekerjaan)
    try {
      const currentJob = await getPekerjaanById(job.id_pekerjaan)
      setModal({ mode: 'detail', job: currentJob })
    } catch (detailError) {
      showToast(`Detail pekerjaan gagal dimuat: ${detailError.message}`, 'error')
    } finally {
      setLoadingDetailId(null)
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* Header Halaman Modern */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Data Pekerjaan</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Data Pekerjaan
            </h1>
            {!isLoading && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {statistics.total} proyek
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Kelola proyek, penugasan karyawan, koordinat peta presensi, batas waktu, dan verifikasi persetujuan penyelesaian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            disabled={isLoading || Boolean(error)}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50 cursor-pointer"
          >
            <WorkIcon name="plus" className="h-4 w-4" />
            <span>Tambah Pekerjaan</span>
          </button>
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
            <WorkIcon
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
            className="rounded p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
          >
            <WorkIcon name="close" className="h-3.5 w-3.5" />
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
            <WorkIcon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
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
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900 cursor-pointer"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 4 Kartu Statistik (Interaktif & Bisa Diklik) */}
      <section
        aria-label="Statistik Pekerjaan"
        className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {[
          {
            label: 'Total Pekerjaan',
            value: statistics.total,
            statusKey: '',
            tone: 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10',
            activeClass: 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20',
            sub: 'Seluruh proyek • Klik semua',
          },
          {
            label: 'Belum Dimulai',
            value: statistics.belumMulai,
            statusKey: STATUS_PEKERJAAN.BELUM_MULAI,
            tone: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10',
            activeClass: 'border-2 border-amber-500 bg-amber-50/40 ring-2 ring-amber-500/20',
            sub: 'Menunggu absensi • Klik filter',
          },
          {
            label: 'Sedang Berjalan',
            value: statistics.berjalan,
            statusKey: STATUS_PEKERJAAN.BERJALAN,
            tone: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/10',
            activeClass: 'border-2 border-indigo-600 bg-indigo-50/40 ring-2 ring-indigo-600/20',
            sub: statistics.terlambat > 0 ? `${statistics.terlambat} terlambat` : 'Dikerjakan teknisi • Klik filter',
          },
          {
            label: 'Pekerjaan Selesai',
            value: statistics.selesai,
            statusKey: STATUS_PEKERJAAN.SELESAI,
            tone: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
            activeClass: 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20',
            sub: 'Laporan disetujui • Klik filter',
          },
        ].map((stat) => {
          const isActive = stat.statusKey === '' ? statusFilter === '' : statusFilter === stat.statusKey

          return (
            <button
              key={stat.label}
              type="button"
              onClick={() => {
                setStatusFilter((curr) => (stat.statusKey === '' ? '' : curr === stat.statusKey ? '' : stat.statusKey))
                setPage(1)
              }}
              className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
                isActive
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
                  isActive ? 'bg-slate-900 text-white shadow-xs' : stat.tone
                }`}
              >
                <WorkIcon name="work" className="h-5 w-5" />
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
            <WorkIcon
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
              placeholder="Cari nama pekerjaan, lokasi, pekerja..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded cursor-pointer"
                title="Hapus pencarian"
              >
                <WorkIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Filter Status & Siapa yang Menentukan Pekerja */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">Semua Status</option>
                <option value={STATUS_PEKERJAAN.BELUM_MULAI}>Belum Dimulai</option>
                <option value={STATUS_PEKERJAAN.BERJALAN}>Sedang Berjalan</option>
                <option value={STATUS_PEKERJAAN.SELESAI}>Selesai</option>
                <option value="terlambat">⚠️ Terlambat</option>
              </select>
              <WorkIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            <div className="relative min-w-[180px] flex-1 sm:flex-initial">
              <select
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10 cursor-pointer"
              >
                <option value="">Semua Cara Penentuan</option>
                <option value="langsung">Admin Menentukan Pekerja</option>
                <option value="terbuka">Pekerja Memilih Sendiri</option>
                <option value="gabungan">Gabungan Admin &amp; Pekerja</option>
                <option value="kuota_penuh">Kuota Penuh</option>
                <option value="expired">Melewati Batas Waktu</option>
              </select>
              <WorkIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition cursor-pointer"
                title="Reset semua filter"
              >
                <WorkIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* Tabel Data Pekerjaan */}
      <section
        aria-label="Tabel Data Pekerjaan"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full min-w-[1360px] text-left text-sm divide-y divide-slate-100">
            <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3.5 py-3.5 text-center w-14 min-w-[56px]" scope="col">
                  No.
                </th>
                <th className="px-4 py-3.5 w-[260px] min-w-[240px] max-w-[320px]" scope="col">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((order) =>
                        order === 'asc' ? 'desc' : 'asc',
                      )
                    }
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold cursor-pointer"
                  >
                    <span>Nama Pekerjaan</span>
                    <WorkIcon name="sort" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3.5 w-[220px] min-w-[200px] max-w-[260px]" scope="col">
                  Cara Penentuan Pekerja
                </th>
                <th className="px-4 py-3.5 w-[180px] min-w-[170px]" scope="col">
                  Anggota Tim / Kuota
                </th>
                <th className="px-4 py-3.5 w-[220px] min-w-[200px] max-w-[260px]" scope="col">
                  Lokasi &amp; GPS
                </th>
                <th className="px-4 py-3.5 w-[130px] min-w-[120px]" scope="col">
                  Jadwal Mulai
                </th>
                <th className="px-4 py-3.5 w-[150px] min-w-[140px]" scope="col">
                  Batas Waktu Pekerjaan
                </th>
                <th className="px-4 py-3.5 text-center w-[130px] min-w-[120px]" scope="col">
                  Status
                </th>
                <th className="px-4 py-3.5 text-right w-[210px] min-w-[210px] whitespace-nowrap" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td
                    colSpan="9"
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
                        Memuat data pekerjaan...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : visibleJobs.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <WorkIcon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Data pekerjaan tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Coba sesuaikan pencarian atau atur ulang filter Anda.'
                        : 'Belum ada data pekerjaan yang terdaftar.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={resetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                      >
                        <WorkIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                visibleJobs.map((job, index) => {
                  const today = getJakartaToday()
                  const isExpired =
                    Boolean(job.target_selesai) &&
                    job.target_selesai < today &&
                    job.status !== STATUS_PEKERJAAN.SELESAI
                  const isDueToday =
                    Boolean(job.target_selesai) &&
                    job.target_selesai === today &&
                    job.status !== STATUS_PEKERJAAN.SELESAI

                  return (
                    <tr
                      key={job.id_pekerjaan}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* No */}
                      <td className="whitespace-nowrap px-3.5 py-4 text-center text-xs font-semibold text-slate-400 align-top">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* Nama Pekerjaan & ID */}
                      <td className="px-4 py-4 align-top w-[260px] min-w-[240px] max-w-[320px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-[10px] font-bold text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200 shrink-0">
                              #{job.id_pekerjaan}
                            </span>
                            <h3 className="font-bold text-slate-900 text-sm leading-snug break-words">
                              {job.nama_pekerjaan}
                            </h3>
                          </div>
                          {job.deskripsi && (
                            <p className="text-xs text-slate-500 leading-relaxed line-clamp-2 pl-0.5 break-words">
                              {job.deskripsi}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Cara Penentuan Pekerja */}
                      <td className="px-4 py-4 align-top w-[220px] min-w-[200px] max-w-[260px]">
                        <div className="flex flex-col gap-1.5">
                          {job.metode_penentuan === 'langsung' ? (
                            <span className="inline-flex items-center gap-1.5 w-fit rounded-lg bg-sky-50 px-2.5 py-1 text-xs font-semibold text-sky-700 ring-1 ring-inset ring-sky-600/20 whitespace-nowrap shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-sky-500 shrink-0" />
                              Admin Menentukan
                            </span>
                          ) : job.metode_penentuan === 'gabungan' ? (
                            <span className="inline-flex items-center gap-1.5 w-fit rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 ring-1 ring-inset ring-indigo-600/20 whitespace-nowrap shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-indigo-500 shrink-0" />
                              Gabungan Admin &amp; Pekerja
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 w-fit rounded-lg bg-purple-50 px-2.5 py-1 text-xs font-semibold text-purple-700 ring-1 ring-inset ring-purple-600/20 whitespace-nowrap shadow-2xs">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0" />
                              Pekerja Memilih Sendiri
                            </span>
                          )}

                          <div className="flex items-start gap-1.5 text-xs text-slate-600 mt-0.5">
                            <WorkIcon name="users" className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="font-medium text-slate-800 leading-snug line-clamp-2 break-words">
                              {job.nama_karyawan_list || (
                                <span className="text-slate-400 italic">Belum ada pekerja</span>
                              )}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Anggota Tim / Kuota */}
                      <td className="px-4 py-4 align-top w-[180px] min-w-[170px]">
                        <div className="flex flex-col gap-1">
                          {job.is_unlimited_kuota || job.kuota_pekerja === null ? (
                            <>
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {job.total_pekerja_aktif} orang
                              </span>
                              <span className="inline-flex items-center gap-1 text-[11px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-medium w-fit">
                                Tanpa Batas Kuota
                              </span>
                            </>
                          ) : job.is_kuota_penuh ? (
                            <>
                              <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-1 text-xs font-bold text-rose-700 ring-1 ring-rose-600/20 w-fit">
                                {job.total_pekerja_aktif}/{job.kuota_pekerja} orang (Penuh)
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">
                                {job.total_pekerja_aktif} / {job.kuota_pekerja} orang
                              </span>
                              <span className="text-[11px] font-semibold text-emerald-600">
                                Sisa {job.sisa_slot} slot
                              </span>
                            </>
                          )}

                          {job.status_pengambilan === 'ditutup' && job.metode_penentuan !== 'langsung' && (
                            <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-600/20 w-fit mt-0.5">
                              Pendaftaran Ditutup
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Lokasi & GPS */}
                      <td className="px-4 py-4 align-top w-[220px] min-w-[200px] max-w-[260px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-start gap-1.5">
                            <WorkIcon
                              name="location"
                              className="h-4 w-4 shrink-0 text-slate-400 mt-0.5"
                            />
                            <span className="font-medium text-slate-800 text-xs leading-snug line-clamp-2 break-words">
                              {job.lokasi || <span className="text-slate-400 italic">Lokasi belum disetel</span>}
                            </span>
                          </div>
                          {job.latitude && job.longitude ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/lokasi?pekerjaan=${job.id_pekerjaan}`)}
                              className="inline-flex items-center gap-1.5 w-fit text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-md border border-emerald-200/80 transition shadow-2xs cursor-pointer whitespace-nowrap"
                              title={`GPS: ${job.latitude}, ${job.longitude}. Klik untuk membuka di Peta Lokasi.`}
                            >
                              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                              <span>GPS: {Number(job.latitude).toFixed(3)}, {Number(job.longitude).toFixed(3)}</span>
                              <span className="text-emerald-600 font-bold">({job.radius_meter || 100}m)</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/lokasi?pekerjaan=${job.id_pekerjaan}`)}
                              className="inline-flex items-center gap-1.5 w-fit text-[11px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 px-2.5 py-1 rounded-md border border-amber-200/80 transition shadow-2xs cursor-pointer whitespace-nowrap"
                              title="Titik GPS belum disetel. Klik untuk mengatur koordinat di peta."
                            >
                              <span>⚠️ Belum Ada GPS</span>
                            </button>
                          )}
                        </div>
                      </td>

                      {/* Jadwal Mulai */}
                      <td className="whitespace-nowrap px-4 py-4 align-top w-[130px] min-w-[120px]">
                        <div className="flex flex-col items-start gap-0.5">
                          <span className="font-semibold text-slate-800 text-xs sm:text-sm">
                            {formatDate(job.tanggal_mulai)}
                          </span>
                          {job.tanggal_mulai && (
                            <span className="text-[10px] text-slate-400">Jadwal mulai</span>
                          )}
                        </div>
                      </td>

                      {/* Batas Waktu Pekerjaan */}
                      <td className="whitespace-nowrap px-4 py-4 align-top w-[150px] min-w-[140px]">
                        <div className="flex flex-col items-start gap-1">
                          <span className="font-semibold text-slate-900 text-xs sm:text-sm">
                            {formatDate(job.target_selesai)}
                          </span>
                          {isExpired && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-rose-50 px-2 py-0.5 text-[10px] font-bold text-rose-700 ring-1 ring-inset ring-rose-600/20 whitespace-nowrap">
                              <span className="h-1 w-1 rounded-full bg-rose-500 animate-pulse shrink-0" />
                              Terlambat
                            </span>
                          )}
                          {isDueToday && (
                            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-[10px] font-bold text-amber-800 ring-1 ring-inset ring-amber-600/20 whitespace-nowrap">
                              <span className="h-1 w-1 rounded-full bg-amber-500 shrink-0" />
                              Tenggat Hari Ini
                            </span>
                          )}
                          {!isExpired && !isDueToday && job.target_selesai && (
                            <span className="text-[10px] text-slate-400">Batas waktu</span>
                          )}
                        </div>
                      </td>

                      {/* Status Otomatis */}
                      <td className="whitespace-nowrap px-4 py-4 align-top text-center w-[140px] min-w-[130px]">
                        <StatusBadge status={job.status} isOverdue={job.is_overdue} />
                      </td>

                      {/* Aksi Lengkap */}
                      <td className="whitespace-nowrap px-4 py-4 text-right align-top w-[210px] min-w-[210px]">
                        <div className="inline-flex items-center justify-end gap-1.5 whitespace-nowrap">
                          {/* Pantau Status Pekerja Individual */}
                          <button
                            type="button"
                            onClick={() => setMonitoringJob(job)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs shrink-0 cursor-pointer"
                            title={`Pemantauan Kehadiran & Status Pekerja #${job.id_pekerjaan}`}
                            aria-label={`Pemantauan Kehadiran & Status Pekerja #${job.id_pekerjaan}`}
                          >
                            <WorkIcon name="users" className="h-4 w-4" />
                          </button>

                          {/* Laporan & Persetujuan Penyelesaian */}
                          <button
                            type="button"
                            onClick={() => setReportJob(job)}
                            className="relative inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-600 transition shadow-2xs shrink-0 cursor-pointer"
                            title={`Laporan & Persetujuan Penyelesaian Pekerjaan #${job.id_pekerjaan}`}
                            aria-label={`Laporan & Persetujuan Penyelesaian Pekerjaan #${job.id_pekerjaan}`}
                          >
                            <WorkIcon name="clipboard" className="h-4 w-4" />
                            {Number(job.total_laporan_menunggu || 0) > 0 && (
                              <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
                                {job.total_laporan_menunggu}
                              </span>
                            )}
                          </button>

                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => showJobDetail(job)}
                            disabled={loadingDetailId === job.id_pekerjaan}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-slate-300 hover:bg-slate-100 hover:text-slate-700 transition shadow-2xs shrink-0 disabled:opacity-50 cursor-pointer"
                            title={`Lihat detail ${job.nama_pekerjaan}`}
                            aria-label={`Lihat detail ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="eye" className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => editJob(job)}
                            disabled={loadingDetailId === job.id_pekerjaan}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 transition shadow-2xs shrink-0 disabled:opacity-50 cursor-pointer"
                            title={`Edit proyek ${job.nama_pekerjaan}`}
                            aria-label={`Edit proyek ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="edit" className="h-4 w-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(job)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs shrink-0 cursor-pointer"
                            title={`Hapus proyek ${job.nama_pekerjaan}`}
                            aria-label={`Hapus proyek ${job.nama_pekerjaan}`}
                          >
                            <WorkIcon name="trash" className="h-4 w-4" />
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
              {filteredJobs.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredJobs.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredJobs.length}
            </span>{' '}
            pekerjaan
          </p>

          <div className="flex items-center justify-between gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
            >
              <WorkIcon name="previous" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {totalPages}
            </span>

            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40 cursor-pointer"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <WorkIcon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* Modal Tambah / Edit / Detail */}
      {modal && modal.mode === 'detail' ? (
        <JobDetailModal
          job={modal.job}
          employees={employees}
          onClose={() => setModal(null)}
          onRefresh={loadData}
        />
      ) : modal ? (
        <WorkModal
          job={modal.job}
          employees={employees}
          isSaving={isSaving}
          mode={modal.mode}
          onClose={() => {
            if (!isSaving) setModal(null)
          }}
          onSave={handleSaveJob}
        />
      ) : null}

      {/* Modal Pemantauan Kehadiran Pekerja */}
      {monitoringJob && (
        <WorkerMonitoringModal
          job={monitoringJob}
          onClose={() => setMonitoringJob(null)}
          onRefresh={loadData}
        />
      )}

      {/* Modal Laporan & Persetujuan Penyelesaian */}
      {reportJob && (
        <ReportApprovalModal
          job={reportJob}
          employees={employees}
          onClose={() => setReportJob(null)}
          onRefresh={loadData}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data pekerjaan ini? Penugasan yang terkait dengan pekerjaan ini juga akan dibatalkan."
          isProcessing={isSaving}
          itemName={`${pendingDelete.nama_pekerjaan} (#${pendingDelete.id_pekerjaan})`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteJob(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataPekerjaan
