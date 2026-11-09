import { getKaryawan } from './karyawanApi.js'
import {
  ambilPekerjaan,
  getPekerjaan,
  getPekerjaanTersedia as fetchPekerjaanTersedia,
} from './pekerjaanApi.js'
import { getPenugasan } from './penugasanApi.js'

export async function getPekerjaanTersedia() {
  return fetchPekerjaanTersedia()
}

export { ambilPekerjaan }

export async function getPekerjaanSaya(employeeId) {
  const normalizedEmployeeId = Number(employeeId)
  if (!Number.isInteger(normalizedEmployeeId) || normalizedEmployeeId < 1) {
    throw new Error('ID karyawan tidak valid.')
  }

  const [employees, jobs, assignments] = await Promise.all([
    getKaryawan(),
    getPekerjaan(),
    getPenugasan(),
  ])
  const worker = employees.find(
    (employee) => employee.id_karyawan === normalizedEmployeeId,
  )

  if (!worker) {
    throw new Error('Karyawan yang dipilih tidak ditemukan di database.')
  }

  const jobsById = new Map(
    jobs.map((job) => [job.id_pekerjaan, job]),
  )
  const assignedJobs = assignments
    .filter(
      (assignment) => assignment.id_karyawan === normalizedEmployeeId,
    )
    .map((assignment) => ({
      assignment,
      job: jobsById.get(assignment.id_pekerjaan) ?? null,
    }))

  return { worker, assignedJobs }
}
