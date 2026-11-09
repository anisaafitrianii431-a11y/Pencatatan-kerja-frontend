import { DUMMY_KARYAWAN, KARYAWAN_STORAGE_KEY } from '../data/karyawan.js'
import {
  DUMMY_PENUGASAN,
  PENUGASAN_STORAGE_KEY,
} from '../data/penugasan.js'
import {
  PENUGASAN_PEKERJAAN_STORAGE_KEY,
} from '../data/pekerjaan.js'
import { loadPekerjaan } from './pekerjaanStorage.js'

function isValidAssignments(value) {
  return (
    Array.isArray(value) &&
    value.every(
      (assignment) =>
        assignment &&
        Number.isInteger(assignment.id_penugasan) &&
        Number.isInteger(assignment.id_pekerjaan) &&
        typeof assignment.id_karyawan === 'string',
    ) &&
    new Set(value.map((item) => item.id_penugasan)).size === value.length &&
    new Set(
      value.map(
        (item) => `${item.id_karyawan}\u0000${item.id_pekerjaan}`,
      ),
    ).size === value.length
  )
}

function readEmployees() {
  const savedEmployees = localStorage.getItem(KARYAWAN_STORAGE_KEY)
  const employees =
    savedEmployees === null ? DUMMY_KARYAWAN : JSON.parse(savedEmployees)

  if (
    !Array.isArray(employees) ||
    !employees.every(
      (employee) =>
        employee &&
        typeof employee.id_karyawan === 'string' &&
        typeof employee.nama === 'string' &&
        typeof employee.jabatan === 'string',
    )
  ) {
    throw new Error('Data karyawan lokal tidak valid.')
  }

  if (savedEmployees === null) {
    localStorage.setItem(KARYAWAN_STORAGE_KEY, JSON.stringify(employees))
  }

  return employees
}

export async function loadPenugasan() {
  const employees = readEmployees()
  const { pekerjaan } = await loadPekerjaan()
  const savedAssignments = localStorage.getItem(PENUGASAN_STORAGE_KEY)
  const assignments =
    savedAssignments === null ? DUMMY_PENUGASAN : JSON.parse(savedAssignments)

  if (!isValidAssignments(assignments)) {
    throw new Error('Format data penugasan pada penyimpanan lokal tidak valid.')
  }

  const employeeIds = new Set(
    employees.map((employee) => employee.id_karyawan),
  )
  const jobIds = new Set(pekerjaan.map((job) => job.id_pekerjaan))
  const invalidAssignment = assignments.find(
    (assignment) =>
      !employeeIds.has(assignment.id_karyawan) ||
      !jobIds.has(assignment.id_pekerjaan),
  )

  if (invalidAssignment) {
    throw new Error(
      `Penugasan ${invalidAssignment.id_penugasan} merujuk ke karyawan atau pekerjaan yang sudah tidak tersedia.`,
    )
  }

  const assignedJobIds = [...new Set(assignments.map((item) => item.id_pekerjaan))]
  const savedAssignedJobIds = localStorage.getItem(
    PENUGASAN_PEKERJAAN_STORAGE_KEY,
  )
  const currentAssignedJobIds =
    savedAssignedJobIds === null
      ? [...new Set(DUMMY_PENUGASAN.map((item) => item.id_pekerjaan))]
      : JSON.parse(savedAssignedJobIds)

  if (
    !Array.isArray(currentAssignedJobIds) ||
    !currentAssignedJobIds.every((id) => Number.isInteger(id))
  ) {
    throw new Error('Format relasi penugasan pekerjaan tidak valid.')
  }

  if (savedAssignments === null) {
    localStorage.setItem(PENUGASAN_STORAGE_KEY, JSON.stringify(assignments))
  }
  if (
    savedAssignedJobIds === null ||
    JSON.stringify([...currentAssignedJobIds].sort()) !==
      JSON.stringify([...assignedJobIds].sort())
  ) {
    localStorage.setItem(
      PENUGASAN_PEKERJAAN_STORAGE_KEY,
      JSON.stringify(assignedJobIds),
    )
  }

  return { assignments, employees, jobs: pekerjaan }
}

export async function savePenugasan(assignments) {
  if (!isValidAssignments(assignments)) {
    throw new Error('Data penugasan tidak valid atau terdapat pasangan ganda.')
  }

  const employees = readEmployees()
  const { pekerjaan } = await loadPekerjaan()
  const employeeIds = new Set(
    employees.map((employee) => employee.id_karyawan),
  )
  const jobIds = new Set(pekerjaan.map((job) => job.id_pekerjaan))
  const invalidAssignment = assignments.find(
    (assignment) =>
      !employeeIds.has(assignment.id_karyawan) ||
      !jobIds.has(assignment.id_pekerjaan),
  )

  if (invalidAssignment) {
    throw new Error('Karyawan atau pekerjaan pada penugasan tidak ditemukan.')
  }

  const assignedJobIds = [...new Set(assignments.map((item) => item.id_pekerjaan))]
  const previousAssignments = localStorage.getItem(PENUGASAN_STORAGE_KEY)
  const previousAssignedJobIds = localStorage.getItem(
    PENUGASAN_PEKERJAAN_STORAGE_KEY,
  )

  try {
    localStorage.setItem(PENUGASAN_STORAGE_KEY, JSON.stringify(assignments))
    localStorage.setItem(
      PENUGASAN_PEKERJAAN_STORAGE_KEY,
      JSON.stringify(assignedJobIds),
    )
  } catch (error) {
    if (previousAssignments === null) {
      localStorage.removeItem(PENUGASAN_STORAGE_KEY)
    } else {
      localStorage.setItem(PENUGASAN_STORAGE_KEY, previousAssignments)
    }

    if (previousAssignedJobIds === null) {
      localStorage.setItem(PENUGASAN_PEKERJAAN_STORAGE_KEY, JSON.stringify([]))
    } else {
      localStorage.setItem(
        PENUGASAN_PEKERJAAN_STORAGE_KEY,
        previousAssignedJobIds,
      )
    }
    throw error
  }
}
