import { DUMMY_KARYAWAN, KARYAWAN_STORAGE_KEY } from '../data/karyawan.js'
import {
  DUMMY_PENUGASAN,
  PENUGASAN_STORAGE_KEY,
} from '../data/penugasan.js'
import { loadPekerjaan } from './pekerjaanStorage.js'
import { SIMULATED_WORKER_ID } from './pekerjaanTersediaStorage.js'

function readAssignments() {
  const saved = localStorage.getItem(PENUGASAN_STORAGE_KEY)
  const assignments = saved === null ? DUMMY_PENUGASAN : JSON.parse(saved)

  if (
    !Array.isArray(assignments) ||
    !assignments.every(
      (assignment) =>
        assignment &&
        Number.isInteger(assignment.id_penugasan) &&
        Number.isInteger(assignment.id_pekerjaan) &&
        typeof assignment.id_karyawan === 'string',
    )
  ) {
    throw new Error('Format data penugasan pada penyimpanan lokal tidak valid.')
  }

  if (saved === null) {
    localStorage.setItem(PENUGASAN_STORAGE_KEY, JSON.stringify(assignments))
  }

  return assignments
}

function readEmployees() {
  const saved = localStorage.getItem(KARYAWAN_STORAGE_KEY)
  const employees = saved === null ? DUMMY_KARYAWAN : JSON.parse(saved)

  if (
    !Array.isArray(employees) ||
    !employees.every(
      (employee) =>
        employee &&
        typeof employee.id_karyawan === 'string' &&
        typeof employee.nama === 'string',
    )
  ) {
    throw new Error('Format data karyawan pada penyimpanan lokal tidak valid.')
  }

  if (saved === null) {
    localStorage.setItem(KARYAWAN_STORAGE_KEY, JSON.stringify(employees))
  }

  const worker = employees.find(
    (employee) => employee.id_karyawan === SIMULATED_WORKER_ID,
  )
  if (!worker) {
    throw new Error('Identitas pekerja simulasi tidak ditemukan pada data karyawan.')
  }

  return worker
}

export async function loadPekerjaanSaya() {
  const [{ pekerjaan }, worker] = await Promise.all([
    loadPekerjaan(),
    Promise.resolve(readEmployees()),
  ])
  const assignments = readAssignments().filter(
    (assignment) => assignment.id_karyawan === worker.id_karyawan,
  )
  const jobMap = new Map(
    pekerjaan.map((job) => [job.id_pekerjaan, job]),
  )

  return {
    worker,
    assignedJobs: assignments.map((assignment) => ({
      assignment,
      job: jobMap.get(assignment.id_pekerjaan) ?? null,
    })),
  }
}
