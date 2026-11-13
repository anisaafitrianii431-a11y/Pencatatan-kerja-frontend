const MAX_RADIUS_METERS = 150

export function parseCoordinates(coord) {
  if (coord === null || coord === undefined) return null
  const parts = String(coord).trim().split(/[,;\s]+/).filter(Boolean)
  if (parts.length < 2) return null

  const lat = Number(parts[0])
  const lng = Number(parts[1])
  if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null
  if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null

  return { lat, lng }
}

export function formatCoordPair(lat, lng) {
  if (!Number.isFinite(Number(lat)) || !Number.isFinite(Number(lng))) return ''
  return `${Number(lat).toFixed(6)}, ${Number(lng).toFixed(6)}`
}

export function calculateDistanceMeters(coord1, coord2) {
  const p1 = typeof coord1 === 'object' && coord1?.lat !== undefined ? coord1 : parseCoordinates(coord1)
  const p2 = typeof coord2 === 'object' && coord2?.lat !== undefined ? coord2 : parseCoordinates(coord2)
  if (!p1 || !p2) return null

  const earthRadius = 6371000
  const toRad = (deg) => (deg * Math.PI) / 180
  const dLat = toRad(p2.lat - p1.lat)
  const dLng = toRad(p2.lng - p1.lng)

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(p1.lat)) *
    Math.cos(toRad(p2.lat)) *
    Math.sin(dLng / 2) *
    Math.sin(dLng / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(Math.max(0, 1 - a)))
  return Math.round(earthRadius * c)
}

export function formatDistanceLabel(meters) {
  if (meters === null || meters === undefined || Number.isNaN(Number(meters))) return null
  const value = Number(meters)
  return value < 1000 ? `${value} m` : `${(value / 1000).toFixed(2)} km`
}

export function getLocationMatchMeta(distanceMeters, hasJobCoords, hasWorkerCoords = true) {
  if (!hasWorkerCoords) {
    return {
      status: 'gps_kosong',
      label: 'GPS belum tercatat',
      toneClass: 'bg-slate-100 text-slate-600 ring-1 ring-slate-300/60',
    }
  }
  if (!hasJobCoords || distanceMeters === null || distanceMeters === undefined) {
    return {
      status: 'titik_proyek_kosong',
      label: 'Titik proyek belum disetel',
      toneClass: 'bg-slate-100 text-slate-700 ring-1 ring-slate-300/60',
    }
  }
  if (Number(distanceMeters) <= MAX_RADIUS_METERS) {
    return {
      status: 'sesuai',
      label: `Sesuai Titik (${formatDistanceLabel(distanceMeters)})`,
      toneClass: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-600/20',
    }
  }
  return {
    status: 'di_luar_radius',
    label: `Di Luar Radius (${formatDistanceLabel(distanceMeters)})`,
    toneClass: 'bg-amber-50 text-amber-800 ring-1 ring-amber-600/20',
  }
}

export function getGoogleMapsUrl(coord) {
  const parsed = parseCoordinates(coord)
  if (!parsed) return ''
  return `https://www.google.com/maps?q=${parsed.lat},${parsed.lng}`
}

export function resolveAttendanceLocation(item, fallbackJobCoords = '') {
  const titikProyek = String(item?.titik_pekerjaan || fallbackJobCoords || '').trim()
  const titikMasuk = String(item?.titik_lokasi || '').trim()
  const titikPulang = String(item?.titik_pulang || '').trim()

  const hasJobCoords = Boolean(parseCoordinates(titikProyek))
  const hasMasukCoords = Boolean(parseCoordinates(titikMasuk))
  const hasPulangCoords = Boolean(parseCoordinates(titikPulang))

  const jarakMasuk =
    item?.jarak_masuk !== null && item?.jarak_masuk !== undefined
      ? Number(item.jarak_masuk)
      : calculateDistanceMeters(titikMasuk, titikProyek)

  const jarakPulang =
    item?.jarak_pulang !== null && item?.jarak_pulang !== undefined
      ? Number(item.jarak_pulang)
      : calculateDistanceMeters(titikPulang, titikProyek)

  return {
    titikProyek,
    titikMasuk,
    titikPulang,
    hasJobCoords,
    hasMasukCoords,
    hasPulangCoords,
    jarakMasuk,
    jarakPulang,
    matchMasuk: getLocationMatchMeta(jarakMasuk, hasJobCoords, hasMasukCoords),
    matchPulang: getLocationMatchMeta(jarakPulang, hasJobCoords, hasPulangCoords),
    mapsProyekUrl: getGoogleMapsUrl(titikProyek),
    mapsMasukUrl: getGoogleMapsUrl(titikMasuk),
    mapsPulangUrl: getGoogleMapsUrl(titikPulang),
  }
}

export function safeFormatDate(value, formatter) {
  if (!value) return '—'
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : formatter.format(date)
}

const WEEKDAY_FORMATTER = new Intl.DateTimeFormat('id-ID', { weekday: 'long' })
const FULL_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'long',
  year: 'numeric',
})
const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

export function formatWeekdayAndDate(value, shortMonth = false) {
  if (!value) return { weekday: '', fullDate: '—', label: '—' }
  const date = new Date(`${String(value).slice(0, 10)}T00:00:00`)
  if (Number.isNaN(date.getTime())) {
    return { weekday: '', fullDate: '—', label: '—' }
  }
  const weekday = WEEKDAY_FORMATTER.format(date)
  const fullDate = (shortMonth ? SHORT_DATE_FORMATTER : FULL_DATE_FORMATTER).format(date)
  return {
    weekday,
    fullDate,
    label: `${weekday}, ${fullDate}`,
  }
}

export { MAX_RADIUS_METERS }
