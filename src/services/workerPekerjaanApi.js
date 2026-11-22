import { getKaryawanMe } from './karyawanApi.js'
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

function getActiveUserFromStorage() {
  try {
    const raw = localStorage.getItem('ruangkerja_user')
    if (raw) return JSON.parse(raw)
  } catch {}
  return null
}

export async function getPekerjaanSaya(employeeId, employeeName = '') {
  const activeUser = getActiveUserFromStorage()
  const rawEmpId = Number(employeeId)
  const normalizedEmployeeId =
    Number.isInteger(rawEmpId) && rawEmpId > 0 && rawEmpId < 1000000
      ? rawEmpId
      : Number(activeUser?.id_karyawan || activeUser?.employeeId) || 0

  const effectiveName = employeeName || activeUser?.nama || activeUser?.name || ''
  const effectiveCode = activeUser?.kode_karyawan || activeUser?.username || ''

  const [currentEmployee, jobs, assignments] = await Promise.all([
    getKaryawanMe(),
    getPekerjaan(),
    getPenugasan(),
  ])
  const employees = currentEmployee ? [currentEmployee] : []

  // 1. Cocokkan berdasarkan kode_karyawan atau username terlebih dahulu (identitas paling unik dan akurat)
  let worker = null
  if (effectiveCode) {
    const targetCode = effectiveCode.trim().toUpperCase()
    worker =
      employees.find((emp) => {
        const code = (emp.kode_karyawan || '').toUpperCase()
        const uName = (emp.username || '').toUpperCase()
        return (
          code === targetCode ||
          uName === targetCode ||
          (code && targetCode.startsWith(code)) ||
          (targetCode && code.startsWith(targetCode))
        )
      }) || null
  }

  // 2. Cocokkan berdasarkan nama pekerja jika belum ditemukan
  if (!worker && effectiveName) {
    const searchName = effectiveName.trim().toLowerCase()
    const firstName = searchName.split(/\s+/)[0]
    worker =
      employees.find((emp) => (emp.nama || '').trim().toLowerCase() === searchName) ||
      employees.find((emp) => {
        const empName = (emp.nama || '').trim().toLowerCase()
        const empFirst = empName.split(/\s+/)[0]
        const code = (emp.kode_karyawan || '').toLowerCase()
        return (
          empName === searchName ||
          code === searchName ||
          empFirst === firstName ||
          empName.includes(searchName) ||
          searchName.includes(empName)
        )
      }) ||
      null
  }

  // 3. Cocokkan berdasarkan id_karyawan numerik (HANYA jika tidak berkonflik dengan nama/kode user login)
  if (!worker && normalizedEmployeeId > 0) {
    const candidate = employees.find((emp) => Number(emp.id_karyawan) === normalizedEmployeeId)
    if (candidate) {
      if (candidate.id_karyawan === 1) {
        // Jangan pernah ambil Budi Santoso jika user yang login jelas bukan Budi
        const isBudi =
          effectiveCode.toUpperCase().includes('BUDI') ||
          effectiveName.toLowerCase().includes('budi')
        if (isBudi) worker = candidate
      } else {
        worker = candidate
      }
    }
  }

  // 4. Fallback aman: gunakan identitas user yang login jika belum terdaftar di master karyawan (BUKAN Budi Santoso)
  if (!worker) {
    worker = {
      id_karyawan: normalizedEmployeeId || 0,
      kode_karyawan: effectiveCode || '—',
      nama: effectiveName || 'Pekerja',
      jabatan: activeUser?.jabatan || 'Staff Lapangan',
      tarif_per_jam: Number(activeUser?.tarif_per_jam) || 0,
    }
  }

  // 5. Self-Healing: Jika worker ditemukan dari master karyawan dan berbeda dari storage lama, sinkronkan storage
  if (
    worker &&
    activeUser &&
    (Number(activeUser.id_karyawan) !== Number(worker.id_karyawan) ||
      activeUser.nama !== worker.nama ||
      activeUser.name !== worker.nama)
  ) {
    try {
      activeUser.id_karyawan = Number(worker.id_karyawan)
      activeUser.employeeId = Number(worker.id_karyawan)
      activeUser.nama = worker.nama
      activeUser.name = worker.nama
      activeUser.kode_karyawan = worker.kode_karyawan
      activeUser.jabatan = worker.jabatan || activeUser.jabatan
      activeUser.tarif_per_jam = worker.tarif_per_jam ?? activeUser.tarif_per_jam
      localStorage.setItem('ruangkerja_user', JSON.stringify(activeUser))
      localStorage.setItem(
        'jam_kerja_auth',
        JSON.stringify({
          id_user: activeUser.id_user || activeUser.id || 2,
          id_karyawan: Number(worker.id_karyawan),
          peran: 'karyawan',
          email: activeUser.email || worker.email,
          nama: worker.nama,
        }),
      )
    } catch {
      // ignore
    }
  }

  const targetWorkerId = Number(worker.id_karyawan)
  const jobsById = new Map(
    jobs.map((job) => [job.id_pekerjaan, job]),
  )

  // Filter penugasan aktif
  let rawAssigned = assignments.filter((assignment) => {
    if ((assignment.status_penugasan ?? 'aktif') === 'dibatalkan') return false
    if (targetWorkerId > 0 && assignment.id_karyawan) {
      return Number(assignment.id_karyawan) === targetWorkerId
    }
    return true
  })

  // Jika worker belum memiliki id_karyawan tetapi penugasan dari backend sudah difilter per karyawan yang login
  if (targetWorkerId <= 0 && rawAssigned.length === 0 && assignments.length > 0) {
    const activeAssignments = assignments.filter(
      (a) => (a.status_penugasan ?? 'aktif') !== 'dibatalkan',
    )
    if (activeAssignments.length > 0) {
      rawAssigned = activeAssignments
      if ((!worker.id_karyawan || worker.id_karyawan <= 0) && activeAssignments[0].id_karyawan) {
        worker.id_karyawan = Number(activeAssignments[0].id_karyawan)
      }
    }
  }

  const assignedJobs = rawAssigned
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
    .sort((left, right) => {
      const leftCreated = Date.parse(left.assignment.created_at || '')
      const rightCreated = Date.parse(right.assignment.created_at || '')
      if (Number.isFinite(leftCreated) && Number.isFinite(rightCreated) && leftCreated !== rightCreated) return rightCreated - leftCreated
      return Number(right.assignment.id_penugasan || right.job?.id_pekerjaan || 0) - Number(left.assignment.id_penugasan || left.job?.id_pekerjaan || 0)
    })

  return { worker, assignedJobs }
}

export async function getRiwayatPekerjaanSaya(employeeId, employeeName = '') {
  const activeUser = getActiveUserFromStorage()
  const rawEmpId = Number(employeeId)
  const normalizedEmployeeId =
    Number.isInteger(rawEmpId) && rawEmpId > 0 && rawEmpId < 1000000
      ? rawEmpId
      : Number(activeUser?.id_karyawan || activeUser?.employeeId) || 0

  const effectiveName = employeeName || activeUser?.nama || activeUser?.name || ''
  const effectiveCode = activeUser?.kode_karyawan || activeUser?.username || ''

  const [currentEmployee, jobs, assignments] = await Promise.all([
    getKaryawanMe(),
    getPekerjaan(),
    getPenugasan(),
  ])
  const employees = currentEmployee ? [currentEmployee] : []

  let worker = null
  if (normalizedEmployeeId > 0) {
    worker = employees.find((emp) => Number(emp.id_karyawan) === normalizedEmployeeId) || null
  }

  if (!worker && effectiveCode) {
    const targetCode = effectiveCode.trim().toUpperCase()
    worker =
      employees.find(
        (emp) =>
          (emp.kode_karyawan || '').toUpperCase() === targetCode ||
          (emp.username || '').toUpperCase() === targetCode,
      ) || null
  }

  if (!worker && effectiveName) {
    const searchName = effectiveName.trim().toLowerCase()
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

  if (!worker) {
    worker = {
      id_karyawan: normalizedEmployeeId || 0,
      kode_karyawan: effectiveCode || '—',
      nama: effectiveName || 'Pekerja',
      jabatan: activeUser?.jabatan || 'Staff Lapangan',
      tarif_per_jam: Number(activeUser?.tarif_per_jam) || 0,
    }
  }

  const targetWorkerId = Number(worker.id_karyawan)
  const jobsById = new Map(
    jobs.map((job) => [job.id_pekerjaan, job]),
  )

  const historyJobs = assignments
    .filter((assignment) => {
      if (targetWorkerId > 0 && assignment.id_karyawan) {
        return Number(assignment.id_karyawan) === targetWorkerId
      }
      return true
    })
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
    .sort((left, right) => {
      const leftCreated = Date.parse(left.assignment.created_at || '')
      const rightCreated = Date.parse(right.assignment.created_at || '')
      if (Number.isFinite(leftCreated) && Number.isFinite(rightCreated) && leftCreated !== rightCreated) return rightCreated - leftCreated
      return Number(right.assignment.id_penugasan || right.job?.id_pekerjaan || 0) - Number(left.assignment.id_penugasan || left.job?.id_pekerjaan || 0)
    })

  return { worker, historyJobs }
}
