import { useEffect, useMemo, useState } from 'react'
import {
  createKaryawan,
  deleteKaryawan,
  getKaryawan,
  updateKaryawan,
} from '../../services/karyawanApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 8
const EMPTY_FORM = { nama: '', jabatan: '', tarif_per_jam: '' }

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

function EmployeeIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    'check-circle': (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    'user-x': (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="m17 8 5 5M22 8l-5 5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    'rotate-ccw': (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    sort: <path d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    briefcase: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
    banknote: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
  }

  return (
    <svg
      aria-hidden="true"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="1.8"
      viewBox="0 0 24 24"
    >
      {paths[name] || null}
    </svg>
  )
}

function EmployeeModal({ mode, employee, isSaving, onClose, onSave }) {
  const isDetail = mode === 'detail'
  const isEdit = mode === 'edit'
  const [values, setValues] = useState(
    employee
      ? {
          nama: employee.nama || '',
          jabatan: employee.jabatan || '',
          tarif_per_jam:
            employee.tarif_per_jam != null ? String(employee.tarif_per_jam) : '',
        }
      : EMPTY_FORM,
  )
  const [validationMessage, setValidationMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const nama = values.nama.trim()
    const jabatan = values.jabatan.trim()
    const tarif = Number(values.tarif_per_jam)

    if (!nama) {
      setValidationMessage('Nama karyawan wajib diisi.')
      return
    }

    if (!values.tarif_per_jam || !Number.isFinite(tarif) || tarif < 0) {
      setValidationMessage(
        'Tarif per jam harus berupa angka valid (Rp0 atau lebih).',
      )
      return
    }

    setValidationMessage('')
    await onSave({ nama, jabatan, tarif_per_jam: tarif })
  }

  const title =
    mode === 'create'
      ? 'Tambah Karyawan Baru'
      : isEdit
        ? 'Edit Data Karyawan'
        : 'Detail Karyawan'
  const subtitle =
    mode === 'create'
      ? 'Masukkan informasi karyawan baru ke dalam sistem perusahaan.'
      : isEdit
        ? `Perbarui profil atau penetapan tarif untuk ${employee?.nama}.`
        : `Rincian data identitas dan tarif per jam karyawan.`

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/70 px-6 py-4">
          <div>
            <h2
              id="employee-modal-title"
              className="text-base sm:text-lg font-bold text-slate-900"
            >
              {title}
            </h2>
            <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <EmployeeIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {isDetail ? (
          <div className="space-y-5 p-6">
            {/* Header Profil in Detail */}
            <div className="flex items-center gap-3.5 rounded-xl border border-slate-100 bg-slate-50/80 p-4">
              <AdminAvatar
                name={employee?.nama}
                className="h-12 w-12 text-sm font-bold shadow-sm"
              />
              <div className="min-w-0">
                <h3 className="text-base font-bold text-slate-900 truncate">
                  {employee?.nama}
                </h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                    ID: {employee?.id_karyawan}
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[11px] font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    Aktif
                  </span>
                </div>
              </div>
            </div>

            {/* Grid Information */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <EmployeeIcon
                    name="briefcase"
                    className="h-3.5 w-3.5 text-blue-600"
                  />
                  Jabatan / Posisi
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-900">
                  {employee?.jabatan || 'Belum diatur'}
                </p>
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3.5 shadow-sm">
                <span className="text-xs font-medium text-slate-500 flex items-center gap-1.5">
                  <EmployeeIcon
                    name="banknote"
                    className="h-3.5 w-3.5 text-emerald-600"
                  />
                  Tarif Upah Per Jam
                </span>
                <p className="mt-1 text-sm font-semibold text-emerald-700">
                  {formatCurrency(employee?.tarif_per_jam)}{' '}
                  <span className="text-xs font-normal text-slate-400">/ jam</span>
                </p>
              </div>
            </div>

            <div className="flex justify-end border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
              >
                Tutup
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {validationMessage && (
              <div
                className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-medium text-rose-700"
                role="alert"
              >
                <EmployeeIcon
                  name="alert"
                  className="h-4 w-4 shrink-0 text-rose-600"
                />
                <span>{validationMessage}</span>
              </div>
            )}

            {/* Nama Field */}
            <div>
              <label
                htmlFor="emp-nama"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Nama Lengkap <span className="text-rose-500">*</span>
              </label>
              <input
                id="emp-nama"
                type="text"
                required
                autoFocus
                maxLength={100}
                placeholder="Contoh: Budi Santoso"
                value={values.nama}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, nama: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>

            {/* Jabatan Field */}
            <div>
              <label
                htmlFor="emp-jabatan"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Jabatan / Posisi
              </label>
              <input
                id="emp-jabatan"
                type="text"
                maxLength={100}
                placeholder="Contoh: Teknisi Jaringan Senior"
                value={values.jabatan}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, jabatan: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                Deskripsikan posisi atau keahlian pekerjaan karyawan.
              </p>
            </div>

            {/* Tarif Field */}
            <div>
              <label
                htmlFor="emp-tarif"
                className="block text-xs font-semibold text-slate-700 mb-1.5"
              >
                Tarif Upah Per Jam (IDR) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-3.5 flex items-center text-xs font-semibold text-slate-500">
                  Rp
                </span>
                <input
                  id="emp-tarif"
                  type="number"
                  min="0"
                  step="1"
                  required
                  placeholder="50000"
                  value={values.tarif_per_jam}
                  onChange={(e) =>
                    setValues((prev) => ({
                      ...prev,
                      tarif_per_jam: e.target.value,
                    }))
                  }
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
              </div>
              {values.tarif_per_jam !== '' &&
                Number(values.tarif_per_jam) >= 0 && (
                  <p className="mt-1.5 text-xs text-blue-600 font-medium">
                    Estimasi:{' '}
                    {formatCurrency(Number(values.tarif_per_jam))} / jam kerja
                  </p>
                )}
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={onClose}
                disabled={isSaving}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-wait"
              >
                {isSaving ? (
                  <>
                    <svg
                      className="h-4 w-4 animate-spin"
                      viewBox="0 0 24 24"
                      fill="none"
                    >
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    <span>Menyimpan...</span>
                  </>
                ) : mode === 'create' ? (
                  'Simpan Karyawan'
                ) : (
                  'Simpan Perubahan'
                )}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  )
}

function DataKaryawan() {
  const [store, setStore] = useState({
    employees: [],
    isReady: false,
    isSaving: false,
    storageError: '',
  })
  const { employees, isReady, isSaving, storageError } = store
  const [notice, setNotice] = useState(null)
  const [modal, setModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)

  async function loadEmployees() {
    try {
      const loadedEmployees = await getKaryawan()
      setStore({
        employees: loadedEmployees,
        isReady: true,
        isSaving: false,
        storageError: '',
      })
    } catch (error) {
      setStore((current) => ({
        ...current,
        isReady: false,
        storageError: `Data karyawan tidak dapat dimuat: ${error.message}`,
      }))
    }
  }

  useEffect(() => {
    let isMounted = true
    getKaryawan()
      .then((loadedEmployees) => {
        if (isMounted) {
          setStore({
            employees: loadedEmployees,
            isReady: true,
            isSaving: false,
            storageError: '',
          })
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStore((current) => ({
            ...current,
            isReady: false,
            storageError: `Data karyawan tidak dapat dimuat: ${error.message}`,
          }))
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  function showNotice(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
  }

  // Position options
  const positions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.jabatan).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'id'),
      ),
    [employees],
  )

  // Filtered and sorted employees
  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')

    return employees
      .filter((employee) => {
        const isEmployeeActive =
          employee.status !== 'nonaktif' &&
          employee.aktif !== 0 &&
          employee.aktif !== false

        const matchesSearch =
          !normalizedSearch ||
          employee.nama.toLocaleLowerCase('id-ID').includes(normalizedSearch) ||
          String(employee.id_karyawan).includes(normalizedSearch) ||
          (employee.jabatan &&
            employee.jabatan.toLocaleLowerCase('id-ID').includes(normalizedSearch))

        const matchesPosition =
          !positionFilter || employee.jabatan === positionFilter

        const matchesStatus =
          !statusFilter ||
          (statusFilter === 'aktif' ? isEmployeeActive : !isEmployeeActive)

        return matchesSearch && matchesPosition && matchesStatus
      })
      .sort((left, right) =>
        left.nama.localeCompare(right.nama, 'id', {
          sensitivity: 'base',
        }) * (sortOrder === 'asc' ? 1 : -1),
      )
  }, [employees, positionFilter, search, sortOrder, statusFilter])

  // Statistics
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(
    (e) =>
      e.status !== 'nonaktif' && e.aktif !== 0 && e.aktif !== false,
  ).length
  const inactiveEmployees = totalEmployees - activeEmployees

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const hasActiveFilters = Boolean(search || positionFilter || statusFilter)

  function handleResetFilters() {
    setSearch('')
    setPositionFilter('')
    setStatusFilter('')
    setPage(1)
  }

  async function handleSaveEmployee(values) {
    setStore((current) => ({ ...current, isSaving: true, storageError: '' }))
    try {
      const savedEmployee =
        modal.mode === 'create'
          ? await createKaryawan(values)
          : await updateKaryawan(modal.employee.id_karyawan, values)

      setStore((current) => {
        const nextEmployees =
          modal.mode === 'create'
            ? [...current.employees, savedEmployee]
            : current.employees.map((employee) =>
                employee.id_karyawan === savedEmployee.id_karyawan
                  ? savedEmployee
                  : employee,
              )
        return {
          ...current,
          employees: nextEmployees,
          isSaving: false,
        }
      })
      setModal(null)
      setPage(1)
      showNotice(
        modal.mode === 'create'
          ? `Karyawan ${savedEmployee.nama} berhasil ditambahkan.`
          : `Data karyawan ${savedEmployee.nama} berhasil diperbarui.`,
        'success',
      )
    } catch (error) {
      setStore((current) => ({
        ...current,
        isSaving: false,
        storageError: error.message,
      }))
      showNotice(`Perubahan gagal disimpan: ${error.message}`, 'error')
    }
  }

  async function handleDeleteEmployee(employee) {
    setStore((current) => ({ ...current, isSaving: true, storageError: '' }))
    try {
      await deleteKaryawan(employee.id_karyawan)
      const nextEmployees = employees.filter(
        (item) => item.id_karyawan !== employee.id_karyawan,
      )
      setStore((current) => ({
        ...current,
        employees: nextEmployees,
        isSaving: false,
      }))
      setPendingDelete(null)
      showNotice(`Karyawan ${employee.nama} berhasil dihapus.`, 'success')
    } catch (error) {
      setStore((current) => ({
        ...current,
        isSaving: false,
        storageError: error.message,
      }))
      setPendingDelete(null)
      showNotice(`Karyawan gagal dihapus: ${error.message}`, 'error')
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* 1. Header Halaman Ringkas & Proporsional */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Data Karyawan</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Data Karyawan
            </h1>
            {isReady && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {totalEmployees} orang
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Kelola data karyawan, jabatan spesialisasi, dan penentuan tarif upah
            per jam kerja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            disabled={!isReady}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <EmployeeIcon name="plus" className="h-4 w-4" />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </header>

      {/* Notifikasi Toast / Alert */}
      {notice && (
        <div
          className={`flex items-center justify-between gap-3 rounded-xl border p-3.5 text-sm shadow-sm transition-all ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <EmployeeIcon
              name={notice.type === 'error' ? 'alert' : 'check'}
              className={`h-4 w-4 shrink-0 ${
                notice.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            />
            <span className="font-medium text-xs sm:text-sm">{notice.message}</span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 transition"
            title="Tutup pemberitahuan"
          >
            <EmployeeIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* Error Server / Storage */}
      {storageError && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <EmployeeIcon
              name="alert"
              className="h-5 w-5 shrink-0 text-rose-600"
            />
            <p className="font-medium">{storageError}</p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setStore((current) => ({
                ...current,
                isReady: false,
                storageError: '',
              }))
              loadEmployees()
            }}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 2. Kartu Statistik Kecil & Proporsional */}
      <section
        aria-label="Statistik Karyawan"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4"
      >
        {/* Total Karyawan */}
        <article className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Karyawan
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {isReady ? totalEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Terdaftar di database
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
            <EmployeeIcon name="people" className="h-5 w-5" />
          </div>
        </article>

        {/* Karyawan Aktif */}
        <article className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Karyawan Aktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
              {isReady ? activeEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600/90 font-medium">
              Siap ditugaskan pekerjaan
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
            <EmployeeIcon name="check-circle" className="h-5 w-5" />
          </div>
        </article>

        {/* Karyawan Nonaktif */}
        <article className="flex items-center justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm">
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Karyawan Nonaktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-700">
              {isReady ? inactiveEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Tidak aktif sementara
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <EmployeeIcon name="user-x" className="h-5 w-5" />
          </div>
        </article>
      </section>

      {/* 3. Toolbar Pencarian & Filter Satu Baris */}
      <section
        aria-label="Pencarian dan Filter"
        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-2.5 md:flex-row md:items-center md:justify-between">
          {/* Kolom Pencarian */}
          <div className="relative flex-1 min-w-[220px]">
            <EmployeeIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari berdasarkan nama, ID, atau jabatan..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                title="Hapus pencarian"
              >
                <EmployeeIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Kolom Filter & Reset dalam Satu Baris */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Jabatan */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Jabatan</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <EmployeeIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Status */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              <EmployeeIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Tombol Reset Filter */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Reset semua filter"
              >
                <EmployeeIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. Tabel Karyawan Modern & Bersih */}
      <section
        aria-label="Tabel Data Karyawan"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-4 py-3.5 text-center w-14" scope="col">
                  No.
                </th>
                <th className="px-4 py-3.5" scope="col">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((order) =>
                        order === 'asc' ? 'desc' : 'asc',
                      )
                    }
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold"
                    title={`Urutkan nama ${
                      sortOrder === 'asc' ? 'Z-A' : 'A-Z'
                    }`}
                  >
                    <span>Karyawan</span>
                    <EmployeeIcon name="sort" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="px-4 py-3.5" scope="col">
                  ID Karyawan
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Jabatan
                </th>
                <th className="px-4 py-3.5" scope="col">
                  Tarif/Jam
                </th>
                <th className="px-4 py-3.5 text-center" scope="col">
                  Status
                </th>
                <th className="px-4 py-3.5 text-right w-36" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!isReady ? (
                <tr>
                  <td
                    colSpan="7"
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="h-6 w-6 animate-spin text-blue-600"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <p className="font-medium text-slate-600">
                        Memuat data karyawan...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pageEmployees.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <EmployeeIcon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Data karyawan tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Coba sesuaikan pencarian atau atur ulang filter Anda.'
                        : 'Belum ada data karyawan terdaftar.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <EmployeeIcon
                          name="rotate-ccw"
                          className="h-3.5 w-3.5"
                        />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageEmployees.map((employee, index) => {
                  const isEmployeeActive =
                    employee.status !== 'nonaktif' &&
                    employee.aktif !== 0 &&
                    employee.aktif !== false

                  return (
                    <tr
                      key={employee.id_karyawan}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* 1. No */}
                      <td className="whitespace-nowrap px-4 py-3 text-center text-xs font-medium text-slate-400">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* 2. Karyawan (Avatar + Nama) */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <div className="flex items-center gap-3">
                          <AdminAvatar
                            name={employee.nama}
                            className="h-8 w-8 text-xs font-bold shadow-sm"
                          />
                          <span className="font-semibold text-slate-900">
                            {employee.nama}
                          </span>
                        </div>
                      </td>

                      {/* 3. ID Karyawan */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200/80">
                          ID: {employee.id_karyawan}
                        </span>
                      </td>

                      {/* 4. Jabatan */}
                      <td className="whitespace-nowrap px-4 py-3">
                        <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                          {employee.jabatan || 'Belum diatur'}
                        </span>
                      </td>

                      {/* 5. Tarif/Jam */}
                      <td className="whitespace-nowrap px-4 py-3 font-semibold text-slate-700 tabular-nums">
                        {formatCurrency(employee.tarif_per_jam)}
                        <span className="ml-1 text-[11px] font-normal text-slate-400">
                          / jam
                        </span>
                      </td>

                      {/* 6. Status */}
                      <td className="whitespace-nowrap px-4 py-3 text-center">
                        {isEmployeeActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-medium text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* 7. Aksi (Detail, Edit, Hapus) */}
                      <td className="whitespace-nowrap px-4 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ mode: 'detail', employee })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs"
                            title={`Lihat detail ${employee.nama}`}
                            aria-label={`Lihat detail ${employee.nama}`}
                          >
                            <EmployeeIcon name="eye" className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() =>
                              setModal({ mode: 'edit', employee })
                            }
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 transition shadow-2xs"
                            title={`Edit data ${employee.nama}`}
                            aria-label={`Edit data ${employee.nama}`}
                          >
                            <EmployeeIcon name="edit" className="h-4 w-4" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(employee)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs"
                            title={`Hapus karyawan ${employee.nama}`}
                            aria-label={`Hapus karyawan ${employee.nama}`}
                          >
                            <EmployeeIcon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel & Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {filteredEmployees.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredEmployees.length}
            </span>{' '}
            karyawan
          </p>

          <div className="flex items-center justify-between gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
            >
              <EmployeeIcon name="previous" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {pageCount}
            </span>

            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <EmployeeIcon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. Modal Tambah / Edit / Detail */}
      {modal && (
        <EmployeeModal
          employee={modal.employee}
          isSaving={isSaving}
          mode={modal.mode}
          onClose={() => {
            if (!isSaving) setModal(null)
          }}
          onSave={handleSaveEmployee}
        />
      )}

      {/* Dialog Konfirmasi Hapus */}
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data karyawan ini dari database perusahaan? Tindakan ini tidak dapat dibatalkan."
          isProcessing={isSaving}
          itemName={`${pendingDelete.nama} (ID: ${pendingDelete.id_karyawan})`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteEmployee(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataKaryawan
