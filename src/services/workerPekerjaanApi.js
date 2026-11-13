import { getKaryawan } from './karyawanApi.js'
import {
  ambilPekerjaan,
  getPekerjaan,
  getPekerjaanTersedia as fetchPekerjaanTersedia,
} from './pekerjaanApi.js'
import { getPenugasan } from './penugasanApi.js'

export async function getPekerjaanTersedia(workerId = null) {
  return fetchPekerjaanTersedia(workerId)
}

export { ambilPekerjaan }

export async function getPekerjaanSaya(employeeId, employeeName = '') {
  const normalizedEmployeeId = Number(employeeId)

  const [employees, jobs, assignments] = await Promise.all([
    getKaryawan(),
    getPekerjaan(),
    getPenugasan(),
  ])

  // 1. Cocokkan berdasarkan id_karyawan numerik terlebih dahulu agar identitas worker selalu akurat
  let worker = null
  if (
    Number.isInteger(normalizedEmployeeId) &&
    normalizedEmployeeId > 0 &&
    normalizedEmployeeId < 1000000
  ) {
    worker = employees.find((emp) => emp.id_karyawan === normalizedEmployeeId) || null
  }

  // 2. Jika belum ditemukan via ID, cari berdasarkan kecocokan nama pekerja
  if (!worker && employeeName) {
    const searchName = employeeName.trim().toLowerCase()
    const firstName = searchName.split(/\s+/)[0]
    worker =
      employees.find((emp) => (emp.nama || '').trim().toLowerCase() === searchName) ||
      employees.find((emp) => {
        const empName = (emp.nama || '').trim().toLowerCase()
        const empFirst = empName.split(/\s+/)[0]
        return (
          empName.includes(searchName) ||
          searchName.includes(empName) ||
          (firstName.length >= 3 && empFirst === firstName)
        )
      }) ||
      null
  }

  // 3. Fallback aman: jika data karyawan belum terdaftar di tabel, tetap gunakan identitas user yang login
  if (!worker) {
    worker = {
      id_karyawan: normalizedEmployeeId || (employees[0]?.id_karyawan ?? 1),
      nama: employeeName || (employees[0]?.nama ?? 'Pekerja'),
      jabatan: employees[0]?.jabatan || 'Staff Lapangan',
      tarif_per_jam: employees[0]?.tarif_per_jam || 0,
    }
  }

  const targetWorkerId = worker.id_karyawan
  const jobsById = new Map(
    jobs.map((job) => [job.id_pekerjaan, job]),
  )

  // Hanya penugasan aktif (bukan yang dibatalkan) untuk Pekerjaan Saya
  const assignedJobs = assignments
    .filter(
      (assignment) =>
        Number(assignment.id_karyawan) === targetWorkerId &&
        (assignment.status_penugasan ?? 'aktif') !== 'dibatalkan',
    )
    .map((assignment) => {
      const matchedJob = jobsById.get(assignment.id_pekerjaan) ?? null
      const fallbackJob =
        !matchedJob && assignment.nama_pekerjaan
          ? {
              id_pekerjaan: Number(assignment.id_pekerjaan),
              nama_pekerjaan: assignment.nama_pekerjaan,
              deskripsi: assignment.deskripsi ?? '',
              lokasi: assignment.lokasi ?? '',
              tanggal_mulai: assignment.tanggal_mulai ?? '',
              target_selesai: assignment.target_selesai ?? '',
              status: assignment.status_pekerjaan || 'belum_mulai',
              metode_penentuan: assignment.metode_penentuan ?? 'terbuka',
            }
          : null

      return {
        assignment,
        job: matchedJob ?? fallbackJob,
      }
    })

  return { worker, assignedJobs }
}

export async function getRiwayatPekerjaanSaya(employeeId, employeeName = '') {
  const normalizedEmployeeId = Number(employeeId)

  const [employees, jobs, assignments] = await Promise.all([
    getKaryawan(),
    getPekerjaan(),
    getPenugasan(),
  ])

  let worker =
    Number.isInteger(normalizedEmployeeId) &&
    normalizedEmployeeId > 0 &&
    normalizedEmployeeId < 1000000
      ? employees.find((emp) => emp.id_karyawan === normalizedEmployeeId)
      : null

  if (!worker && employeeName) {
    const searchName = employeeName.trim().toLowerCase()
    const firstName = searchName.split(/\s+/)[0]
    worker =
      employees.find((emp) => {
        const empName = emp.nama.toLowerCase()
        const empFirst = empName.split(/\s+/)[0]
        return (
          empName.includes(searchName) ||
          searchName.includes(empName) ||
          (firstName.length > 2 && empFirst === firstName)
        )
      }) || null
  }

  if (!worker && employees.length > 0) {
    worker = employees[0]
  }

  const targetWorkerId = worker?.id_karyawan ?? 1
  const jobsById = new Map(
    jobs.map((job) => [job.id_pekerjaan, job]),
  )

  // Riwayat mencakup:
  // 1. Penugasan yang dibatalkan
  // 2. Pekerjaan yang sudah selesai
  const historyJobs = assignments
    .filter(
      (assignment) => Number(assignment.id_karyawan) === targetWorkerId,
    )
    .map((assignment) => {
      const job = jobsById.get(assignment.id_pekerjaan) ?? null
      const isCanceled = (assignment.status_penugasan ?? 'aktif') === 'dibatalkan'
      const isJobCompleted = job?.status === 'selesai'

      return {
        assignment,
        job,
        isCanceled,
        isJobCompleted,
      }
    })
    .filter((item) => item.isCanceled || item.isJobCompleted)

  return { worker, historyJobs }
}
