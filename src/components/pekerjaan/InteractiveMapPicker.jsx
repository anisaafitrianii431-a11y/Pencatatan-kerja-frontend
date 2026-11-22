import { useEffect, useRef, useState } from 'react'

export default function InteractiveMapPicker({
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

  // Inisialisasi Peta Leaflet
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

      map.on('click', (e) => {
        const lat = Number(e.latlng.lat.toFixed(7))
        const lng = Number(e.latlng.lng.toFixed(7))
        onCoordinateChange(lat, lng)
      })

      mapInstanceRef.current = map

      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 250)
      setTimeout(() => {
        if (mapInstanceRef.current) {
          mapInstanceRef.current.invalidateSize()
        }
      }, 600)
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

  // Cari Alamat (Google Geocoding / Fallback OpenStreetMap Nominatim)
  async function handleSearchAddress(e) {
    if (e) e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setIsSearching(true)
    setGeocoderStatus('')

    try {
      if (googleMapsApiKey) {
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

      setGeocoderStatus('Mencari lokasi via OpenStreetMap...')
      let osmResp = await fetch(
        `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query,
        )}&limit=1`,
        { headers: { 'Accept-Language': 'id,en' } },
      )
      let osmData = await osmResp.json()
      if ((!osmData || osmData.length === 0) && !query.toLowerCase().includes('indonesia')) {
        const osmResp2 = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
            query + ', Indonesia',
          )}&limit=1`,
          { headers: { 'Accept-Language': 'id,en' } },
        )
        osmData = await osmResp2.json()
      }

      if (osmData && osmData.length > 0) {
        const lat = Number(parseFloat(osmData[0].lat).toFixed(7))
        const lng = Number(parseFloat(osmData[0].lon).toFixed(7))
        onCoordinateChange(lat, lng)
        setGeocoderStatus(`Lokasi ditemukan: ${osmData[0].display_name}`)
      } else {
        setGeocoderStatus(
          'Lokasi spesifik belum ditemukan di peta global. Anda dapat langsung mengklik atau menggeser pin di peta untuk menetapkan titik presensi.',
        )
      }
    } catch (err) {
      setGeocoderStatus(
        `Pencarian gagal: ${err.message}. Anda tetap bisa mengklik atau menggeser pin langsung di peta.`,
      )
    } finally {
      setIsSearching(false)
    }
  }

  return (
    <div className="space-y-2">
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
            placeholder="Ketik alamat / nama kota / jalan untuk mencari..."
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
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="7" />
                <path d="m20 20-4-4" />
              </svg>
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

      <div className="relative overflow-hidden rounded-xl border border-slate-200 shadow-inner">
        <div ref={mapContainerRef} className="h-48 sm:h-56 w-full z-0 bg-slate-100" />
        <div className="absolute top-2 left-2 z-[500] pointer-events-none rounded-md bg-white/90 px-2 py-1 text-[10px] font-semibold text-slate-700 shadow-xs backdrop-blur-xs">
          📍 Klik peta atau geser pin untuk menentukan titik presensi
        </div>
        <div className="absolute bottom-2 left-2 z-[500] pointer-events-none rounded-md bg-slate-900/80 px-2 py-0.5 text-[10px] text-white shadow-xs backdrop-blur-xs">
          🗺️ Peta Interaktif Presensi
        </div>
      </div>
    </div>
  )
}
