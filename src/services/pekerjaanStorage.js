import {
  DUMMY_PENUGASAN_PEKERJAAN_IDS,
  DUMMY_PEKERJAAN,
  PENUGASAN_PEKERJAAN_STORAGE_KEY,
  PEKERJAAN_STORAGE_KEY,
  STATUS_PEKERJAAN,
} from '../data/pekerjaan.js'

const VALID_STATUSES = new Set(Object.values(STATUS_PEKERJAAN))

function isValidPekerjaanList(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (item) =>
        item &&
        Number.isInteger(item.id_pekerjaan) &&
        typeof item.nama_pekerjaan === 'string' &&
        typeof item.deskripsi === 'string' &&
        typeof item.lokasi === 'string' &&
        (item.tanggal_mulai === '' || typeof item.tanggal_mulai === 'string') &&
        (item.target_selesai === '' ||
          typeof item.target_selesai === 'string') &&
        VALID_STATUSES.has(item.status),
    )
  )
}

export async function loadPekerjaan() {
  const savedPekerjaan = localStorage.getItem(PEKERJAAN_STORAGE_KEY)
  const pekerjaan =
    savedPekerjaan === null ? DUMMY_PEKERJAAN : JSON.parse(savedPekerjaan)

  if (!isValidPekerjaanList(pekerjaan)) {
    throw new Error('Format data pekerjaan pada penyimpanan lokal tidak valid.')
  }

  const savedAssignments = localStorage.getItem(
    PENUGASAN_PEKERJAAN_STORAGE_KEY,
  )
  const assignedIds =
    savedAssignments === null
      ? DUMMY_PENUGASAN_PEKERJAAN_IDS
      : JSON.parse(savedAssignments)

  if (
    !Array.isArray(assignedIds) ||
    !assignedIds.every((id) => Number.isInteger(id))
  ) {
    throw new Error('Format relasi penugasan lokal tidak valid.')
  }

  if (savedPekerjaan === null) {
    localStorage.setItem(PEKERJAAN_STORAGE_KEY, JSON.stringify(pekerjaan))
  }
  if (savedAssignments === null) {
    localStorage.setItem(
      PENUGASAN_PEKERJAAN_STORAGE_KEY,
      JSON.stringify(assignedIds),
    )
  }

  return { pekerjaan, assignedIds }
}

export async function savePekerjaan(pekerjaan) {
  if (!isValidPekerjaanList(pekerjaan)) {
    throw new Error('Data pekerjaan tidak valid dan tidak dapat disimpan.')
  }
  localStorage.setItem(PEKERJAAN_STORAGE_KEY, JSON.stringify(pekerjaan))
}
