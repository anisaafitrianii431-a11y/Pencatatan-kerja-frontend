import { DUMMY_KARYAWAN, KARYAWAN_STORAGE_KEY } from '../data/karyawan.js'
import {
  DUMMY_PENUGASAN,
  PENUGASAN_STORAGE_KEY,
} from '../data/penugasan.js'
import { loadPekerjaan } from './pekerjaanStorage.js'

export const SIMULATED_WORKER_ID = 'KRY-001'

const APPLICATION_STORAGE_PREFIX = 'pencatatan-kerja:pengajuan-minat:'
const APPLICATION_STATUSES = new Set(['menunggu', 'diterima', 'ditolak'])

function readList(storageKey, fallback, isValid) {
  const saved = localStorage.getItem(storageKey)
  const value = saved === null ? fallback : JSON.parse(saved)

  if (!isValid(value)) {
    throw new Error(`Format data pada penyimpanan lokal "${storageKey}" tidak valid.`)
  }

  if (saved === null) {
    localStorage.setItem(storageKey, JSON.stringify(value))
  }

  return value
}

function readAssignments() {
  return readList(
    PENUGASAN_STORAGE_KEY,
    DUMMY_PENUGASAN,
    (value) =>
      Array.isArray(value) &&
      value.every(
        (assignment) =>
          assignment &&
          Number.isInteger(assignment.id_penugasan) &&
          Number.isInteger(assignment.id_pekerjaan) &&
          typeof assignment.id_karyawan === 'string',
      ),
  )
}

function isValidApplicationIds(value) {
  return (
    Array.isArray(value) &&
    value.every((id) => Number.isInteger(id)) &&
    new Set(value).size === value.length
  )
}

function isValidApplicationHistory(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (application) =>
        application &&
        Number.isInteger(application.id_pekerjaan) &&
        (application.tanggal_pengajuan === null ||
          typeof application.tanggal_pengajuan === 'string') &&
        APPLICATION_STATUSES.has(application.status) &&
        (application.pekerjaan === null ||
          (application.pekerjaan &&
            Number.isInteger(application.pekerjaan.id_pekerjaan) &&
            typeof application.pekerjaan.nama_pekerjaan === 'string' &&
            typeof application.pekerjaan.deskripsi === 'string' &&
            typeof application.pekerjaan.lokasi === 'string' &&
            typeof application.pekerjaan.tanggal_mulai === 'string' &&
            typeof application.pekerjaan.target_selesai === 'string')),
    ) &&
    new Set(value.map(({ id_pekerjaan }) => id_pekerjaan)).size === value.length
  )
}

function getApplicationStorageKey(workerId) {
  return `${APPLICATION_STORAGE_PREFIX}${workerId}`
}

function readApplicationHistory(workerId) {
  const storageKey = getApplicationStorageKey(workerId)
  const saved = localStorage.getItem(storageKey)
  if (saved === null) {
    localStorage.setItem(storageKey, JSON.stringify([]))
    return []
  }

  const value = JSON.parse(saved)
  if (isValidApplicationIds(value)) {
    return value.map((id_pekerjaan) => ({
      id_pekerjaan,
      tanggal_pengajuan: null,
      status: 'menunggu',
      pekerjaan: null,
    }))
  }
  if (!isValidApplicationHistory(value)) {
    throw new Error(`Format data pada penyimpanan lokal "${storageKey}" tidak valid.`)
  }

  return value
}

export async function loadPekerjaanTersedia(workerId = SIMULATED_WORKER_ID) {
  const { pekerjaan } = await loadPekerjaan()
  const employees = readList(
    KARYAWAN_STORAGE_KEY,
    DUMMY_KARYAWAN,
    (value) =>
      Array.isArray(value) &&
      value.every(
        (employee) =>
          employee &&
          typeof employee.id_karyawan === 'string' &&
          typeof employee.nama === 'string',
      ),
  )
  const worker = employees.find((employee) => employee.id_karyawan === workerId)
  if (!worker) {
    throw new Error('Identitas pekerja simulasi tidak ditemukan pada data karyawan.')
  }

  const assignments = readAssignments()
  const applicationHistory = readApplicationHistory(workerId)

  return {
    applications: applicationHistory.map(({ id_pekerjaan }) => id_pekerjaan),
    applicationHistory,
    assignedJobIds: assignments
      .filter((assignment) => assignment.id_karyawan === workerId)
      .map((assignment) => assignment.id_pekerjaan),
    jobs: pekerjaan,
    worker,
  }
}

export function savePengajuanMinat(job, workerId = SIMULATED_WORKER_ID) {
  if (!job || !Number.isInteger(job.id_pekerjaan)) {
    throw new Error('Data pengajuan minat tidak valid.')
  }

  const applications = readApplicationHistory(workerId)
  if (applications.some(({ id_pekerjaan }) => id_pekerjaan === job.id_pekerjaan)) {
    throw new Error('Minat untuk pekerjaan ini sudah pernah diajukan.')
  }

  const nextApplications = [
    ...applications,
    {
      id_pekerjaan: job.id_pekerjaan,
      tanggal_pengajuan: new Date().toISOString(),
      status: 'menunggu',
      pekerjaan: {
        id_pekerjaan: job.id_pekerjaan,
        nama_pekerjaan: job.nama_pekerjaan,
        deskripsi: job.deskripsi || '',
        lokasi: job.lokasi || '',
        tanggal_mulai: job.tanggal_mulai || '',
        target_selesai: job.target_selesai || '',
      },
    },
  ]
  localStorage.setItem(
    getApplicationStorageKey(workerId),
    JSON.stringify(nextApplications),
  )
  return nextApplications.map(({ id_pekerjaan }) => id_pekerjaan)
}
