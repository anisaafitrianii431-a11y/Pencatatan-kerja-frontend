import { useState, useRef, useEffect, useCallback } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import {
  MapPin,
  Navigation,
  ExternalLink,
  UploadCloud,
  Trash2,
  Clock,
  FileText,
  Save,
  CheckCircle2,
  AlertCircle,
  Briefcase,
  Search,
  Crosshair,
  Compass,
  ArrowLeft,
  Check,
  Banknote,
} from 'lucide-react'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getLokasiKerja, saveLokasiKerja } from '../../services/lokasiApi.js'

export default function LokasiKerjaPage() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  const [listPekerjaan, setListPekerjaan] = useState([])
  const [selectedId, setSelectedId] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [gpsFilter, setGpsFilter] = useState('all') // 'all' | 'has_gps' | 'no_gps'
  const [isLoading, setIsLoading] = useState(true)

  // Map state
  const mapContainerRef = useRef(null)
  const mapInstanceRef = useRef(null)
  const markerRef = useRef(null)
  const circleRef = useRef(null)
  const otherMarkersLayerRef = useRef(null)
  const [mapLoaded, setMapLoaded] = useState(false)
  const [searchAddress, setSearchAddress] = useState('')
  const [isSearchingAddress, setIsSearchingAddress] = useState(false)

  // Form state
  const [form, setForm] = useState({
    nama_lokasi: '',
    alamat: '',
    latitude: '',
    longitude: '',
    radius_meter: 100,
    foto_lokasi: null,
    fotoPreview: null,
  })

  const [pesan, setPesan] = useState(null)
  const [isSaving, setIsSaving] = useState(false)
  const [isLocating, setIsLocating] = useState(false)
  const fileInputRef = useRef()

  // Muat data pekerjaan dan lokasi dari database
  const loadData = useCallback(async () => {
    setIsLoading(true)
    try {
      const [jobsData, locationsData] = await Promise.all([
        getPekerjaan().catch(() => []),
        getLokasiKerja().catch(() => []),
      ])

      const jobs = Array.isArray(jobsData) ? jobsData : []
      const locations = Array.isArray(locationsData) ? locationsData : []

      // Gabungkan data pekerjaan dengan koordinat lokasi
      const merged = jobs.map((job) => {
        const loc = locations.find((l) => Number(l.id_pekerjaan) === Number(job.id_pekerjaan))
        return {
          ...job,
          latitude: loc?.latitude ?? job.latitude ?? '',
          longitude: loc?.longitude ?? job.longitude ?? '',
          radius_meter: loc?.radius_meter ?? job.radius_meter ?? 100,
          nama_lokasi: loc?.nama_lokasi || job.lokasi || job.nama_pekerjaan,
          alamat: loc?.alamat ?? job.alamat ?? '',
          foto_lokasi: loc?.foto_lokasi ?? job.foto_lokasi ?? null,
        }
      })

      setListPekerjaan(merged)

      // Cek parameter URL: ?pekerjaan=... atau ?id=...
      const paramId = searchParams.get('pekerjaan') || searchParams.get('id')
      if (paramId && merged.some((p) => Number(p.id_pekerjaan) === Number(paramId))) {
        pilihPekerjaan(Number(paramId), merged)
      } else if (merged.length > 0) {
        pilihPekerjaan(merged[0].id_pekerjaan, merged)
      }
    } catch (err) {
      console.error('Gagal memuat data lokasi:', err)
    } finally {
      setIsLoading(false)
    }
  }, [searchParams])

  useEffect(() => {
    loadData()
  }, [loadData])

  function pilihPekerjaan(id, currentList = listPekerjaan) {
    const pj = currentList.find((p) => Number(p.id_pekerjaan) === Number(id))
    setSelectedId(Number(id))
    if (pj) {
      const lat = pj.latitude ? String(pj.latitude) : ''
      const lng = pj.longitude ? String(pj.longitude) : ''
      const radius = pj.radius_meter ? Number(pj.radius_meter) : 100

      setForm({
        nama_lokasi: pj.nama_lokasi || pj.lokasi || pj.nama_pekerjaan || '',
        alamat: pj.alamat || '',
        latitude: lat,
        longitude: lng,
        radius_meter: radius,
        foto_lokasi: null,
        fotoPreview: pj.foto_lokasi || null,
      })

      // Update map jika sudah terinisialisasi
      if (mapInstanceRef.current) {
        if (lat && lng) {
          updateMapLocation(parseFloat(lat), parseFloat(lng), radius)
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
      }
    }
  }

  // Update posisi Marker dan Geofence Radius di Peta Leaflet
  const updateMapLocation = useCallback((lat, lng, radius = form.radius_meter) => {
    if (!mapInstanceRef.current || isNaN(lat) || isNaN(lng)) return

    const L = window.L
    if (!L) return

    mapInstanceRef.current.setView([lat, lng], 16)

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng])
    } else {
      markerRef.current = L.marker([lat, lng], { draggable: true }).addTo(mapInstanceRef.current)
      markerRef.current.on('dragend', (event) => {
        const position = event.target.getLatLng()
        handleMapCoordinateChange(position.lat, position.lng)
      })
    }

    if (circleRef.current) {
      circleRef.current.setLatLng([lat, lng])
      circleRef.current.setRadius(Number(radius) || 100)
    } else {
      circleRef.current = L.circle([lat, lng], {
        radius: Number(radius) || 100,
        color: '#2563eb',
        fillColor: '#3b82f6',
        fillOpacity: 0.15,
        weight: 2,
      }).addTo(mapInstanceRef.current)
    }
  }, [form.radius_meter])

  // Inisialisasi Peta Leaflet OpenStreetMap
  useEffect(() => {
    if (!mapContainerRef.current) return

    const L = window.L
    if (!L) {
      const timer = setTimeout(() => setMapLoaded((prev) => !prev), 600)
      return () => clearTimeout(timer)
    }

    if (!mapInstanceRef.current) {
      // Default ke Indonesia / Jakarta atau Padang jika belum ada koordinat
      const defaultLat = form.latitude ? parseFloat(form.latitude) : -6.2088
      const defaultLng = form.longitude ? parseFloat(form.longitude) : 106.8456

      const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], form.latitude ? 16 : 13)

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap kontributor',
        maxZoom: 19,
      }).addTo(map)

      // Event klik di peta untuk memindahkan titik pin
      map.on('click', (e) => {
        handleMapCoordinateChange(e.latlng.lat, e.latlng.lng)
      })

      mapInstanceRef.current = map

      if (form.latitude && form.longitude) {
        updateMapLocation(parseFloat(form.latitude), parseFloat(form.longitude), form.radius_meter)
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove()
        mapInstanceRef.current = null
        markerRef.current = null
        circleRef.current = null
        otherMarkersLayerRef.current = null
      }
    }
  }, [updateMapLocation])

  // Multi-marker untuk seluruh pekerjaan dengan koordinat GPS
  useEffect(() => {
    if (!mapInstanceRef.current || !window.L) return

    const L = window.L

    if (!otherMarkersLayerRef.current) {
      otherMarkersLayerRef.current = L.layerGroup().addTo(mapInstanceRef.current)
    } else {
      otherMarkersLayerRef.current.clearLayers()
    }

    listPekerjaan.forEach((pj) => {
      if (pj.latitude && pj.longitude && Number(pj.id_pekerjaan) !== Number(selectedId)) {
        const pLat = parseFloat(pj.latitude)
        const pLng = parseFloat(pj.longitude)
        if (!isNaN(pLat) && !isNaN(pLng)) {
          const marker = L.marker([pLat, pLng], {
            opacity: 0.85,
            title: pj.nama_pekerjaan,
          })

          const popupContent = document.createElement('div')
          popupContent.className = 'p-1 text-xs'
          popupContent.innerHTML = `
            <div class="font-bold text-slate-900">${pj.nama_pekerjaan}</div>
            <div class="text-[11px] text-slate-500 mt-0.5">${pj.nama_lokasi || pj.lokasi || ''}</div>
            <div class="text-[10px] text-blue-600 font-semibold mt-1">Radius: ${pj.radius_meter || 100}m</div>
            <button class="mt-2 w-full px-2 py-1 bg-blue-600 text-white rounded text-[11px] font-semibold hover:bg-blue-700">Pilih & Kelola</button>
          `
          const btn = popupContent.querySelector('button')
          if (btn) {
            btn.onclick = () => {
              pilihPekerjaan(pj.id_pekerjaan)
            }
          }

          marker.bindPopup(popupContent)
          marker.addTo(otherMarkersLayerRef.current)
        }
      }
    })
  }, [listPekerjaan, selectedId])

  function handleMapCoordinateChange(lat, lng) {
    const latFixed = Number(lat.toFixed(7))
    const lngFixed = Number(lng.toFixed(7))

    setForm((prev) => ({
      ...prev,
      latitude: String(latFixed),
      longitude: String(lngFixed),
    }))

    updateMapLocation(latFixed, lngFixed)
  }

  function handleFormChange(e) {
    const { name, value } = e.target
    setForm((prev) => {
      const next = { ...prev, [name]: value }
      if ((name === 'latitude' || name === 'longitude' || name === 'radius_meter') && next.latitude && next.longitude) {
        const lat = parseFloat(next.latitude)
        const lng = parseFloat(next.longitude)
        if (!isNaN(lat) && !isNaN(lng)) {
          updateMapLocation(lat, lng, next.radius_meter)
        }
      }
      return next
    })
  }

  // Ambil lokasi GPS saat ini dari perangkat Admin
  function handleAmbilGPS() {
    if (!navigator.geolocation) {
      setPesan({ type: 'error', text: 'Peramban Anda tidak mendukung sensor Geolocation.' })
      return
    }

    setIsLocating(true)
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = Number(pos.coords.latitude.toFixed(7))
        const lng = Number(pos.coords.longitude.toFixed(7))
        setForm((prev) => ({
          ...prev,
          latitude: String(lat),
          longitude: String(lng),
        }))
        updateMapLocation(lat, lng)
        setIsLocating(false)
        setPesan({
          type: 'success',
          text: `Koordinat GPS berhasil dideteksi (Akurasi: ±${Math.round(pos.coords.accuracy)}m)!`,
        })
        setTimeout(() => setPesan(null), 3500)
      },
      (err) => {
        setIsLocating(false)
        setPesan({
          type: 'error',
          text: `Gagal membaca GPS: ${err.message}. Pastikan izin lokasi aktif di peramban.`,
        })
        setTimeout(() => setPesan(null), 4000)
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
    )
  }

  // Pencarian alamat di OpenStreetMap Nominatim
  async function handleCariAlamat(e) {
    e.preventDefault()
    if (!searchAddress.trim()) return

    setIsSearchingAddress(true)
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          searchAddress.trim(),
        )}&limit=1`,
      )
      const data = await res.json()
      if (Array.isArray(data) && data.length > 0) {
        const lat = parseFloat(data[0].lat)
        const lon = parseFloat(data[0].lon)
        handleMapCoordinateChange(lat, lon)
        setForm((prev) => ({
          ...prev,
          alamat: prev.alamat || data[0].display_name,
        }))
        setPesan({ type: 'success', text: `Ditemukan: ${data[0].display_name.slice(0, 60)}...` })
        setTimeout(() => setPesan(null), 4000)
      } else {
        setPesan({ type: 'error', text: 'Alamat tidak ditemukan. Coba gunakan kata kunci kota atau jalan.' })
        setTimeout(() => setPesan(null), 3000)
      }
    } catch (err) {
      console.error('Nominatim error:', err)
      setPesan({ type: 'error', text: 'Gagal mencari alamat pada server peta.' })
    } finally {
      setIsSearchingAddress(false)
    }
  }

  function handleFoto(e) {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      setForm((prev) => ({
        ...prev,
        foto_lokasi: file,
        fotoPreview: ev.target.result,
      }))
    }
    reader.readAsDataURL(file)
  }

  function handleHapusFoto() {
    setForm((prev) => ({ ...prev, foto_lokasi: null, fotoPreview: null }))
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  async function handleSimpan(e) {
    e.preventDefault()
    if (!selectedId) return

    const latNum = parseFloat(form.latitude)
    const lngNum = parseFloat(form.longitude)

    if (isNaN(latNum) || isNaN(lngNum)) {
      setPesan({ type: 'error', text: 'Latitude dan Longitude wajib diisi dengan koordinat valid.' })
      setTimeout(() => setPesan(null), 4000)
      return
    }

    setIsSaving(true)
    try {
      const payload = {
        id_pekerjaan: selectedId,
        nama_lokasi: form.nama_lokasi.trim() || selectedPekerjaan?.nama_pekerjaan,
        alamat: form.alamat.trim(),
        latitude: latNum,
        longitude: lngNum,
        radius_meter: Number(form.radius_meter) || 100,
        foto_lokasi: form.fotoPreview,
      }

      await saveLokasiKerja(payload)

      // Perbarui list lokal
      setListPekerjaan((prev) =>
        prev.map((pj) =>
          Number(pj.id_pekerjaan) === Number(selectedId)
            ? {
                ...pj,
                latitude: latNum,
                longitude: lngNum,
                radius_meter: payload.radius_meter,
                nama_lokasi: payload.nama_lokasi,
                alamat: payload.alamat,
                foto_lokasi: payload.foto_lokasi,
              }
            : pj,
        ),
      )

      setPesan({
        type: 'success',
        text: '✅ Titik lokasi kerja & GPS berhasil disimpan dan terhubung ke Pekerjaan!',
      })
      setTimeout(() => setPesan(null), 4000)
    } catch (err) {
      console.error('Error simpan lokasi:', err)
      setPesan({ type: 'error', text: err.message || 'Gagal menyimpan data lokasi.' })
      setTimeout(() => setPesan(null), 4000)
    } finally {
      setIsSaving(false)
    }
  }

  function handleLihatPeta() {
    if (form.latitude && form.longitude) {
      window.open(`https://maps.google.com/?q=${form.latitude},${form.longitude}`, '_blank')
    }
  }

  const selectedPekerjaan = listPekerjaan.find((p) => Number(p.id_pekerjaan) === Number(selectedId))

  const totalJobs = listPekerjaan.length
  const totalHasGps = listPekerjaan.filter((p) => p.latitude && p.longitude).length
  const totalNoGps = totalJobs - totalHasGps

  const filteredPekerjaan = listPekerjaan.filter((p) => {
    const q = searchTerm.toLowerCase()
    const matchesSearch =
      (p.nama_pekerjaan || '').toLowerCase().includes(q) ||
      (p.lokasi || '').toLowerCase().includes(q) ||
      String(p.id_pekerjaan).includes(q)
    if (!matchesSearch) return false

    if (gpsFilter === 'has_gps') return Boolean(p.latitude && p.longitude)
    if (gpsFilter === 'no_gps') return !p.latitude || !p.longitude
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="inline-flex items-center space-x-2 px-2.5 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-700 mb-1">
            <span>Manajemen Presensi & GPS Lapangan</span>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center space-x-2">
            <MapPin className="w-7 h-7 text-blue-600" />
            <span>Lokasi Kerja & Titik Presensi</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-500">
            Hubungkan setiap data pekerjaan dengan koordinat GPS akurat dan radius geofence presensi di peta.
          </p>
        </div>

        <button
          type="button"
          onClick={() => navigate('/admin/pekerjaan')}
          className="inline-flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 transition shadow-xs self-start sm:self-auto"
        >
          <Briefcase className="w-4 h-4 text-slate-500" />
          <span>Kelola Data Pekerjaan</span>
        </button>
      </div>

      {/* 3 Kartu Statistik Lokasi (Interaktif & Bisa Diklik) */}
      <section
        aria-label="Statistik Lokasi Kerja"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4"
      >
        <button
          type="button"
          onClick={() => {
            setGpsFilter('all')
            setSearchTerm('')
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            gpsFilter === 'all' && !searchTerm
              ? 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Proyek Pekerjaan
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {isLoading ? '—' : totalJobs}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Terdaftar di sistem • Klik reset
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            gpsFilter === 'all' && !searchTerm
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10'
          }`}>
            <Briefcase className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setGpsFilter((curr) => (curr === 'has_gps' ? 'all' : 'has_gps'))
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            gpsFilter === 'has_gps'
              ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
              : 'border border-slate-200/90 bg-white hover:border-emerald-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Titik GPS Terverifikasi
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-700">
              {isLoading ? '—' : totalHasGps}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Radius geofence aktif • Klik filter
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            gpsFilter === 'has_gps'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10'
          }`}>
            <CheckCircle2 className="h-5 w-5" />
          </div>
        </button>

        <button
          type="button"
          onClick={() => {
            setGpsFilter((curr) => (curr === 'no_gps' ? 'all' : 'no_gps'))
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            gpsFilter === 'no_gps'
              ? 'border-2 border-amber-500 bg-amber-50/50 ring-2 ring-amber-500/20'
              : 'border border-slate-200/90 bg-white hover:border-amber-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Belum Disetel Koordinat
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-amber-700">
              {isLoading ? '—' : totalNoGps}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Perlu penetapan lokasi • Klik filter
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            gpsFilter === 'no_gps'
              ? 'bg-amber-600 text-white shadow-xs'
              : 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10'
          }`}>
            <AlertCircle className="h-5 w-5" />
          </div>
        </button>
      </section>

      {/* Grid Utama: Daftar Pekerjaan (Kiri) & Peta GPS (Kanan) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Panel Kiri: Daftar Pekerjaan */}
        <div className="lg:col-span-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 sm:p-5">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100 mb-3">
            <h3 className="font-bold text-slate-800 text-sm flex items-center space-x-2">
              <Briefcase className="w-4 h-4 text-blue-600" />
              <span>Pilih Data Pekerjaan</span>
            </h3>
            <span className="text-xs bg-slate-100 text-slate-600 px-2.5 py-0.5 rounded-full font-semibold">
              {listPekerjaan.length} Proyek
            </span>
          </div>

          {/* Kotak Pencarian Pekerjaan */}
          <div className="relative mb-3">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari nama atau ID pekerjaan..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {isLoading ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Memuat data pekerjaan dari sistem...
              </div>
            ) : filteredPekerjaan.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Tidak ada pekerjaan yang cocok.
              </div>
            ) : (
              filteredPekerjaan.map((pj) => {
                const isSelected = Number(selectedId) === Number(pj.id_pekerjaan)
                const hasGps = pj.latitude && pj.longitude

                return (
                  <button
                    key={pj.id_pekerjaan}
                    type="button"
                    onClick={() => pilihPekerjaan(pj.id_pekerjaan)}
                    className={`w-full text-left p-3.5 rounded-xl border transition flex flex-col space-y-1.5 ${
                      isSelected
                        ? 'bg-blue-50/90 border-blue-500 shadow-xs ring-1 ring-blue-500'
                        : 'bg-white border-slate-200 hover:bg-slate-50/80 hover:border-slate-300'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">
                          #{pj.id_pekerjaan}
                        </span>
                        <span className={`text-xs font-bold leading-tight line-clamp-1 ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {pj.nama_pekerjaan}
                        </span>
                      </div>
                      {hasGps ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                          GPS Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-800 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                          Belum Ada
                        </span>
                      )}
                    </div>

                    <div className="flex items-center space-x-1 text-[11px] text-slate-500 truncate">
                      <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                      <span className="truncate">
                        {hasGps
                          ? `${Number(pj.latitude).toFixed(4)}, ${Number(pj.longitude).toFixed(4)}`
                          : pj.lokasi || 'Koordinat belum disetel'}
                      </span>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>

        {/* Panel Kanan: Peta Interaktif & Form Titik Presensi */}
        <div className="lg:col-span-8 space-y-4">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
                    <Navigation className="w-4 h-4 text-blue-600" />
                    <span>Penentuan Titik GPS & Peta Akurat</span>
                  </h3>
                  {selectedPekerjaan && (
                    <span className="text-xs font-mono font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      ID #{selectedPekerjaan.id_pekerjaan}
                    </span>
                  )}
                </div>
                {selectedPekerjaan && (
                  <p className="text-xs text-slate-500 mt-1">
                    Proyek Pekerjaan Terhubung:{' '}
                    <strong className="text-slate-800">{selectedPekerjaan.nama_pekerjaan}</strong>
                    {selectedPekerjaan.lokasi && (
                      <span className="text-slate-400 ml-1">({selectedPekerjaan.lokasi})</span>
                    )}
                  </p>
                )}
              </div>

              {form.latitude && form.longitude && (
                <button
                  type="button"
                  onClick={handleLihatPeta}
                  className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-medium transition shrink-0"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-blue-600" />
                  <span>Google Maps</span>
                </button>
              )}
            </div>

            {!selectedPekerjaan ? (
              <div className="p-12 text-center text-slate-400">
                <Briefcase className="w-12 h-12 mx-auto mb-3 text-slate-300" />
                <p className="text-sm font-semibold text-slate-600">Pilih Pekerjaan Terlebih Dahulu</p>
                <p className="text-xs text-slate-400 mt-1">
                  Pilih pekerjaan dari panel sebelah kiri untuk menambahkan titik GPS dan radius presensi.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Notifikasi Feedback */}
                {pesan && (
                  <div
                    className={`p-3.5 rounded-xl border flex items-center space-x-2 text-xs font-semibold ${
                      pesan.type === 'success'
                        ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                        : 'bg-rose-50 border-rose-200 text-rose-800'
                    }`}
                  >
                    {pesan.type === 'success' ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                    )}
                    <span>{pesan.text}</span>
                  </div>
                )}

                {/* Navigasi Cepat Terintegrasi Proyek */}
                <div className="p-3 bg-slate-50/90 rounded-xl border border-slate-200/80 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <span className="font-semibold text-slate-600 flex items-center gap-1.5">
                    <Compass className="w-3.5 h-3.5 text-blue-600" />
                    Navigasi Cepat Proyek:
                  </span>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/pekerjaan?highlight=${selectedPekerjaan.id_pekerjaan}`)}
                      className="px-2.5 py-1 bg-white hover:bg-blue-50 hover:text-blue-700 text-slate-700 rounded-lg border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <FileText className="w-3 h-3 text-slate-400" />
                      <span>Detail Proyek</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/penugasan?pekerjaan=${selectedPekerjaan.id_pekerjaan}`)}
                      className="px-2.5 py-1 bg-white hover:bg-violet-50 hover:text-violet-700 text-slate-700 rounded-lg border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Briefcase className="w-3 h-3 text-slate-400" />
                      <span>Atur Penugasan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/rekap-absensi?pekerjaan=${selectedPekerjaan.id_pekerjaan}`)}
                      className="px-2.5 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-700 rounded-lg border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span>Rekap Presensi</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => navigate(`/admin/pengeluaran?pekerjaan=${selectedPekerjaan.id_pekerjaan}`)}
                      className="px-2.5 py-1 bg-white hover:bg-amber-50 hover:text-amber-700 text-slate-700 rounded-lg border border-slate-200 font-medium transition cursor-pointer flex items-center gap-1 shadow-2xs"
                    >
                      <Banknote className="w-3 h-3 text-slate-400" />
                      <span>Pengeluaran Proyek</span>
                    </button>
                  </div>
                </div>

                {/* Bar Kontrol Peta: Pencarian Alamat & Tombol GPS */}
                <div className="flex flex-col sm:flex-row gap-2">
                  <form onSubmit={handleCariAlamat} className="flex-1 flex gap-2">
                    <div className="relative flex-1">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5 pointer-events-none" />
                      <input
                        type="text"
                        placeholder="Ketik alamat atau nama gedung untuk melompat di peta..."
                        value={searchAddress}
                        onChange={(e) => setSearchAddress(e.target.value)}
                        className="w-full pl-9 pr-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={isSearchingAddress}
                      className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold transition shrink-0 disabled:opacity-50"
                    >
                      {isSearchingAddress ? 'Mencari...' : 'Cari di Peta'}
                    </button>
                  </form>

                  <button
                    type="button"
                    onClick={handleAmbilGPS}
                    disabled={isLocating}
                    className="inline-flex items-center justify-center space-x-1.5 px-3.5 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 text-xs font-semibold transition shrink-0 shadow-xs"
                  >
                    <Crosshair className={`w-4 h-4 text-blue-600 ${isLocating ? 'animate-spin' : ''}`} />
                    <span>{isLocating ? 'Mendeteksi...' : 'Deteksi GPS Saya Saat Ini'}</span>
                  </button>
                </div>

                {/* Wadah Peta OpenStreetMap (Leaflet) */}
                <div className="relative rounded-2xl overflow-hidden border border-slate-200 shadow-inner">
                  <div
                    ref={mapContainerRef}
                    id="map-container"
                    className="w-full h-[320px] sm:h-[380px] bg-slate-100 z-10"
                  />
                  <div className="absolute bottom-2 left-2 z-20 bg-white/90 backdrop-blur-sm px-2.5 py-1 rounded-lg border border-slate-200 text-[11px] text-slate-600 shadow-sm pointer-events-none">
                    💡 <strong>Tips:</strong> Klik peta atau geser pin merah untuk menentukan titik lokasi presisi.
                  </div>
                </div>

                {/* Form Input Detail Titik & Parameter Presensi */}
                <form onSubmit={handleSimpan} className="space-y-4 pt-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Nama Lokasi */}
                    <div>
                      <label htmlFor="nama_lokasi" className="block text-xs font-semibold text-slate-700 mb-1">
                        Nama Lokasi / Kantor Proyek
                      </label>
                      <input
                        id="nama_lokasi"
                        name="nama_lokasi"
                        type="text"
                        placeholder="Contoh: Gedung B Kantor Cabang Sudirman"
                        value={form.nama_lokasi}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>

                    {/* Radius Geofence Presensi */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label htmlFor="radius_meter" className="block text-xs font-semibold text-slate-700">
                          Radius Toleransi Absensi (Meter)
                        </label>
                        <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                          {form.radius_meter} meter
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          id="radius_meter"
                          name="radius_meter"
                          type="range"
                          min="20"
                          max="1000"
                          step="10"
                          value={form.radius_meter}
                          onChange={handleFormChange}
                          className="w-full accent-blue-600 h-2 bg-slate-200 rounded-lg cursor-pointer"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Koordinat GPS: Latitude & Longitude */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    <div>
                      <label htmlFor="latitude" className="block text-xs font-semibold text-slate-700 mb-1">
                        Latitude (Garis Lintang) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="latitude"
                        name="latitude"
                        type="text"
                        required
                        placeholder="-6.208800"
                        value={form.latitude}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                    <div>
                      <label htmlFor="longitude" className="block text-xs font-semibold text-slate-700 mb-1">
                        Longitude (Garis Bujur) <span className="text-rose-500">*</span>
                      </label>
                      <input
                        id="longitude"
                        name="longitude"
                        type="text"
                        required
                        placeholder="106.845600"
                        value={form.longitude}
                        onChange={handleFormChange}
                        className="w-full px-3 py-2 text-xs font-mono text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
                      />
                    </div>
                  </div>

                  {/* Alamat Lengkap / Keterangan Patokan */}
                  <div>
                    <label htmlFor="alamat" className="block text-xs font-semibold text-slate-700 mb-1">
                      Alamat Lengkap / Petunjuk Patokan Area
                    </label>
                    <textarea
                      id="alamat"
                      name="alamat"
                      rows={2}
                      placeholder="Contoh: Masuk gerbang timur, dekat tower antena, lantai 2 ruangan NOC."
                      value={form.alamat}
                      onChange={handleFormChange}
                      className="w-full px-3 py-2 text-xs text-slate-800 bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition resize-none"
                    />
                  </div>

                  {/* Foto Patokan Lokasi */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Foto Patokan Lapangan / Tampak Depan
                    </label>
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-200 hover:border-blue-400 bg-slate-50/60 hover:bg-blue-50/20 rounded-2xl p-4 flex flex-col items-center justify-center cursor-pointer transition min-h-[120px]"
                    >
                      {form.fotoPreview ? (
                        <div className="w-full relative">
                          <img
                            src={form.fotoPreview}
                            alt="Preview lokasi"
                            className="w-full max-h-48 object-cover rounded-xl border border-slate-200"
                          />
                        </div>
                      ) : (
                        <div className="text-center space-y-1">
                          <UploadCloud className="w-7 h-7 text-slate-400 mx-auto" />
                          <p className="text-xs font-semibold text-slate-700">Unggah foto fisik lokasi kerja</p>
                          <p className="text-[11px] text-slate-400">JPG, PNG atau WebP (maksimal 5MB)</p>
                        </div>
                      )}
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={handleFoto}
                      id="input-foto-lokasi"
                    />
                    {form.fotoPreview && (
                      <button
                        type="button"
                        onClick={handleHapusFoto}
                        className="mt-2 inline-flex items-center space-x-1 px-2.5 py-1 text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus Foto Lokasi</span>
                      </button>
                    )}
                  </div>

                  {/* Tombol Simpan Terhubung ke Pekerjaan */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={isSaving}
                      className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl text-xs sm:text-sm shadow-md hover:shadow-lg transition flex items-center justify-center space-x-2 disabled:opacity-50"
                    >
                      <Save className="w-4 h-4" />
                      <span>
                        {isSaving
                          ? 'Menyimpan Titik GPS...'
                          : `Simpan Titik Lokasi Kerja (Terhubung ke Proyek #${selectedPekerjaan.id_pekerjaan})`}
                      </span>
                    </button>
                  </div>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Tabel Ringkasan Seluruh Titik Lokasi & Radius Proyek */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between pb-4 border-b border-slate-100 mb-4 gap-2">
          <div>
            <h3 className="font-bold text-slate-900 text-base flex items-center space-x-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              <span>Daftar Seluruh Titik Presensi & Geofence Pekerjaan</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Tinjauan status GPS dan radius toleransi absensi karyawan untuk setiap penugasan proyek.
            </p>
          </div>
          <span className="text-xs bg-slate-100 text-slate-600 px-3 py-1 rounded-full font-semibold self-start sm:self-auto">
            Total {listPekerjaan.length} Pekerjaan
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-slate-600 uppercase tracking-wider text-[11px] font-bold">
                <th className="px-4 py-3">ID & Nama Proyek</th>
                <th className="px-4 py-3">Alamat / Petunjuk Lapangan</th>
                <th className="px-4 py-3">Koordinat GPS</th>
                <th className="px-4 py-3 text-center">Radius Geofence</th>
                <th className="px-4 py-3 text-center">Status GPS</th>
                <th className="px-4 py-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {listPekerjaan.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-400">
                    Belum ada data pekerjaan.
                  </td>
                </tr>
              ) : (
                listPekerjaan.map((item) => {
                  const hasGps = item.latitude && item.longitude
                  const isSelected = Number(item.id_pekerjaan) === Number(selectedId)

                  return (
                    <tr
                      key={item.id_pekerjaan}
                      className={`transition ${isSelected ? 'bg-blue-50/60' : 'hover:bg-slate-50'}`}
                    >
                      <td className="px-4 py-3.5">
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">
                          #{item.id_pekerjaan}
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            pilihPekerjaan(item.id_pekerjaan)
                            window.scrollTo({ top: 300, behavior: 'smooth' })
                          }}
                          className="font-bold text-slate-900 text-xs sm:text-sm hover:text-blue-600 hover:underline text-left cursor-pointer transition flex items-center gap-1 group"
                          title="Pilih dan tentukan titik GPS pekerjaan ini"
                        >
                          <span>{item.nama_pekerjaan}</span>
                          <ExternalLink className="w-3 h-3 text-slate-400 opacity-0 group-hover:opacity-100 transition" />
                        </button>
                        {item.nama_lokasi && (
                          <span className="block text-[11px] text-slate-500 mt-0.5">
                            {item.nama_lokasi}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600 max-w-xs">
                        <p className="line-clamp-2">{item.alamat || item.lokasi || '—'}</p>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-[11px] text-slate-700">
                        {hasGps ? (
                          <span>
                            {Number(item.latitude).toFixed(6)}, {Number(item.longitude).toFixed(6)}
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum disetel</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <span className="inline-block px-2 py-0.5 rounded font-mono font-bold text-xs bg-slate-100 text-slate-700">
                          {item.radius_meter || 100} m
                        </span>
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        {hasGps ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            GPS Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 ring-1 ring-amber-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                            Belum Disetel
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              pilihPekerjaan(item.id_pekerjaan)
                              window.scrollTo({ top: 0, behavior: 'smooth' })
                            }}
                            className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                              isSelected
                                ? 'bg-blue-600 text-white shadow-sm'
                                : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            {isSelected ? 'Sedang Dipilih' : 'Fokus Peta & Edit'}
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
      </div>
    </div>
  )
}
