import { useEffect, useState } from 'react'
import PekerjaLayout from '../../layouts/PekerjaLayout.jsx'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { getKaryawan } from '../../services/karyawanApi.js'
import DashboardPekerja from './DashboardPekerja.jsx'
import PekerjaanSaya from './PekerjaanSaya.jsx'
import PekerjaanTersedia from './PekerjaanTersedia.jsx'
import RiwayatPengajuan from './RiwayatPengajuan.jsx'
import ProfilPekerja from './ProfilPekerja.jsx'
import PengaturanPekerja from './PengaturanPekerja.jsx'

const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  return Number.isNaN(numeric) ? '—' : CURRENCY_FORMATTER.format(numeric)
}

function PekerjaLocalTest() {
  const [employees, setEmployees] = useState([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')
  const [selectedEmployeeId, setSelectedEmployeeId] = useState('')
  const [activeEmployeeId, setActiveEmployeeId] = useState('')
  const [currentPage, setCurrentPage] = useState('Dashboard')
  const [reloadKey, setReloadKey] = useState(0)

  useEffect(() => {
    let isMounted = true

    setIsLoading(true)
    getKaryawan()
      .then((loadedEmployees) => {
        if (isMounted) {
          setEmployees(loadedEmployees)
          setIsLoading(false)
          setError('')
        }
      })
      .catch((err) => {
        if (isMounted) {
          setIsLoading(false)
          setError(`Data karyawan tidak dapat dimuat: ${err.message}`)
        }
      })

    return () => {
      isMounted = false
    }
  }, [reloadKey])

  const activeEmployee = employees.find(
    (employee) => String(employee.id_karyawan) === String(activeEmployeeId),
  )

  function handleChooseEmployee(event) {
    event.preventDefault()
    if (!selectedEmployeeId) return
    setActiveEmployeeId(String(selectedEmployeeId))
    setCurrentPage('Dashboard')
  }

  function handleExitWorker() {
    setActiveEmployeeId('')
    setCurrentPage('Dashboard')
  }

  function handleReloadData() {
    setReloadKey((key) => key + 1)
  }

  function handleUpdateActiveWorker(updatedWorker) {
    setEmployees((prev) =>
      prev.map((emp) =>
        Number(emp.id_karyawan) === Number(updatedWorker.id_karyawan)
          ? updatedWorker
          : emp,
      ),
    )
  }

  // Layar 1: Jika belum ada pekerja yang dipilih
  if (!activeEmployee) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl">
          <header className="mb-6 rounded-2xl bg-slate-900 p-6 text-white sm:p-8">
            <span className="inline-flex rounded-full border border-amber-300/40 bg-amber-300/10 px-3 py-1 text-xs font-semibold tracking-wide text-amber-200">
              MODE PENGUJIAN SEMENTARA · LOKAL
            </span>
            <h1 className="mt-4 text-2xl font-bold sm:text-3xl">
              Pilih Identitas Pekerja untuk Pengujian
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Pilih data karyawan dari database untuk melihat halaman Area Pekerja.
              Data penugasan dan pekerjaan akan disesuaikan otomatis dengan ID
              karyawan yang dipilih.
            </p>
          </header>

          <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Daftar Karyawan di Database
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Data diambil langsung dari tabel <code>karyawan</code> melalui API backend.
                </p>
              </div>
              <button
                className="self-start rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50 sm:self-auto"
                disabled={isLoading}
                onClick={handleReloadData}
                type="button"
              >
                {isLoading ? 'Memuat...' : 'Muat Ulang Data'}
              </button>
            </div>

            {error && (
              <div
                className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700"
                role="alert"
              >
                {error}
              </div>
            )}

            <form
              className="flex flex-col gap-3 sm:flex-row sm:items-end"
              onSubmit={handleChooseEmployee}
            >
              <label className="block min-w-0 flex-1">
                <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-600">
                  Pilih Karyawan
                </span>
                <select
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 disabled:bg-slate-50"
                  disabled={isLoading || employees.length === 0}
                  onChange={(e) => setSelectedEmployeeId(e.target.value)}
                  required
                  value={selectedEmployeeId}
                >
                  <option value="">
                    {isLoading
                      ? 'Memuat daftar karyawan...'
                      : employees.length
                        ? '-- Pilih Karyawan --'
                        : 'Belum ada karyawan di database'}
                  </option>
                  {employees.map((employee) => (
                    <option
                      key={employee.id_karyawan}
                      value={employee.id_karyawan}
                    >
                      {employee.nama} — {employee.jabatan || 'Pekerja'} (ID: {employee.id_karyawan})
                    </option>
                  ))}
                </select>
              </label>

              <button
                className="rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={isLoading || !selectedEmployeeId}
                type="submit"
              >
                Mulai Pengujian
              </button>
            </form>

            {!isLoading && !error && employees.length === 0 && (
              <p className="mt-4 rounded-xl bg-slate-50 p-4 text-center text-sm text-slate-500">
                Belum ada data karyawan di database. Buka panel Admin untuk menambahkan karyawan baru.
              </p>
            )}
          </section>

          <a
            className="inline-flex rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
            href="/"
          >
            ← Kembali ke Panel Admin
          </a>
        </div>
      </main>
    )
  }

  // Layar 2: Konten Halaman Pekerja sesuai currentPage
  let pageContent = null

  if (currentPage === 'Dashboard') {
    pageContent = (
      <DashboardPekerja
        key={activeEmployee.id_karyawan}
        onNavigate={setCurrentPage}
        workerId={activeEmployee.id_karyawan}
      />
    )
  } else if (currentPage === 'Pekerjaan Saya') {
    pageContent = (
      <PekerjaanSaya
        key={activeEmployee.id_karyawan}
        workerId={activeEmployee.id_karyawan}
      />
    )
  } else if (currentPage === 'Pekerjaan Tersedia') {
    pageContent = (
      <PekerjaanTersedia
        key={activeEmployee.id_karyawan}
        onNavigate={setCurrentPage}
        workerId={activeEmployee.id_karyawan}
        workerName={activeEmployee.nama}
      />
    )
  } else if (currentPage === 'Riwayat Pengajuan') {
    pageContent = (
      <RiwayatPengajuan
        onNavigate={setCurrentPage}
      />
    )
  } else if (currentPage === 'Profil Saya') {
    pageContent = (
      <ProfilPekerja
        key={activeEmployee.id_karyawan}
        onBackToDashboard={() => setCurrentPage('Dashboard')}
        onSwitchEmployee={handleExitWorker}
        onUpdateWorker={handleUpdateActiveWorker}
        worker={activeEmployee}
      />
    )
  } else if (currentPage === 'Pengaturan') {
    pageContent = (
      <PengaturanPekerja
        key={activeEmployee.id_karyawan}
        onNavigate={setCurrentPage}
        worker={activeEmployee}
      />
    )
  }

  return (
    <PekerjaLayout
      activeItem={currentPage}
      onLogout={handleExitWorker}
      onSelectMenuItem={setCurrentPage}
      workerName={activeEmployee.nama}
    >
      <div className="mx-auto w-full max-w-[1440px] space-y-6">
        {/* Banner Mode Pengujian Sementara */}
        <section
          aria-label="Mode Pengujian Sementara"
          className="flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 p-4 text-amber-900 shadow-sm sm:flex-row sm:items-center sm:justify-between sm:px-5"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-amber-200/80 text-xs font-bold text-amber-900">
              TEST
            </span>
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wider text-amber-800">
                Mode Pengujian Sementara (Lokal)
              </p>
              <p className="text-sm font-semibold text-amber-950">
                Aktif sebagai: <span className="underline">{activeEmployee.nama}</span> · ID {activeEmployee.id_karyawan} ({activeEmployee.jabatan || 'Pekerja'})
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100/60"
              onClick={handleReloadData}
              type="button"
            >
              Muat Ulang Data
            </button>
            <button
              className="rounded-xl border border-amber-300 bg-white px-3 py-1.5 text-xs font-semibold text-amber-900 transition hover:bg-amber-100/60"
              onClick={handleExitWorker}
              type="button"
            >
              Ganti Karyawan
            </button>
            <a
              className="rounded-xl bg-amber-700 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-amber-800"
              href="/"
            >
              Kembali ke Admin
            </a>
          </div>
        </section>

        {pageContent}
      </div>
    </PekerjaLayout>
  )
}

export default PekerjaLocalTest
