import { apiDelete, apiGet, apiPost, apiPut } from './api.js'

const LOCAL_STORAGE_KEY = 'ruangkerja_lokasi_kerja'

// Data default awal jika backend / database belum memiliki entri
const DEFAULT_LOCATIONS = [
  {
    id_lokasi: 1,
    id_pekerjaan: 1,
    nama_lokasi: 'Kantor Cabang Sudirman',
    alamat: 'Jl. Jenderal Sudirman No. 45, Jakarta Pusat',
    latitude: -6.20880000,
    longitude: 106.84560000,
    radius_meter: 100,
    foto_lokasi: null,
  },
  {
    id_lokasi: 2,
    id_pekerjaan: 2,
    nama_lokasi: 'Data Center Gedung Utama',
    alamat: 'Jl. Medan Merdeka Barat No. 8, Jakarta Pusat',
    latitude: -6.17540000,
    longitude: 106.82720000,
    radius_meter: 100,
    foto_lokasi: null,
  },
  {
    id_lokasi: 3,
    id_pekerjaan: 3,
    nama_lokasi: 'Gudang Logistik Cakung',
    alamat: 'Kawasan Industri Pulogadung - Cakung, Jakarta Timur',
    latitude: -6.19320000,
    longitude: 106.94820000,
    radius_meter: 150,
    foto_lokasi: null,
  },
  {
    id_lokasi: 4,
    id_pekerjaan: 21,
    nama_lokasi: 'Ampang Padang',
    alamat: 'Kec. Kuranji, Kota Padang, Sumatera Barat',
    latitude: -0.92345000,
    longitude: 100.38421000,
    radius_meter: 100,
    foto_lokasi: null,
  },
]

function getLocalLocations() {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      if (Array.isArray(parsed) && parsed.length > 0) return parsed
    }
  } catch (e) {
    console.error('Error reading local locations:', e)
  }
  return DEFAULT_LOCATIONS
}

function saveLocalLocations(list) {
  try {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(list))
  } catch (e) {
    console.error('Error saving local locations:', e)
  }
}

export async function getLokasiKerja() {
  try {
    const data = await apiGet('/lokasi')
    if (Array.isArray(data) && data.length > 0) {
      // Sync ke local storage
      saveLocalLocations(data)
      return data
    }
  } catch (error) {
    console.warn('Backend /api/lokasi belum dapat diakses, menggunakan data lokal:', error.message)
  }
  return getLocalLocations()
}

export async function getLokasiByPekerjaanId(idPekerjaan) {
  const numId = Number(idPekerjaan)
  try {
    const data = await apiGet(`/lokasi/${numId}`)
    if (data) return data
  } catch (error) {
    console.warn(`Gagal memuat lokasi pekerjaan ${numId} dari API:`, error.message)
  }

  const locals = getLocalLocations()
  return locals.find((item) => Number(item.id_pekerjaan) === numId) || null
}

export async function saveLokasiKerja(payload) {
  const normalized = {
    id_pekerjaan: Number(payload.id_pekerjaan),
    nama_lokasi: payload.nama_lokasi || '',
    alamat: payload.alamat || '',
    latitude: Number(payload.latitude),
    longitude: Number(payload.longitude),
    radius_meter: payload.radius_meter ? Number(payload.radius_meter) : 100,
    foto_lokasi: payload.foto_lokasi || null,
  }

  // Simpan ke LocalStorage terlebih dahulu agar respons instan
  const locals = getLocalLocations()
  const existingIdx = locals.findIndex((x) => Number(x.id_pekerjaan) === normalized.id_pekerjaan)
  let updatedList
  if (existingIdx >= 0) {
    updatedList = locals.map((item, idx) =>
      idx === existingIdx ? { ...item, ...normalized, updated_at: new Date().toISOString() } : item,
    )
  } else {
    updatedList = [
      ...locals,
      {
        ...normalized,
        id_lokasi: Date.now(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
    ]
  }
  saveLocalLocations(updatedList)

  // Kirim ke backend API
  try {
    const result = await apiPost('/lokasi', normalized)
    return result || normalized
  } catch (error) {
    console.warn('API /api/lokasi gagal merespons, data tetap tersimpan di lokal:', error.message)
    return normalized
  }
}

export async function deleteLokasiKerja(idPekerjaan) {
  const numId = Number(idPekerjaan)
  const locals = getLocalLocations().filter((x) => Number(x.id_pekerjaan) !== numId)
  saveLocalLocations(locals)

  try {
    await apiDelete(`/lokasi/${numId}`)
  } catch (error) {
    console.warn('Gagal menghapus lokasi di API:', error.message)
  }
  return true
}

