import { useEffect, useMemo, useState } from 'react'
import { createKaryawan, deleteKaryawan, getKaryawan, updateKaryawan } from '../../services/karyawanApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'
import AdminPageBanner from '../../components/AdminPageBanner.jsx'
import ActionButtons from '../../components/ActionButtons.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 5
const EMPTY_FORM = { nama: '', jabatan: '', tarif_per_jam: '' }
const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  return currencyFormatter.format(value)
}

function EmployeeIcon({ name, className = 'h-5 w-5' }) {
  const paths = {
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
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
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    sort: <path d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />,
    money: (
      <>
        <rect x="3" y="5" width="18" height="14" rx="2" />
        <circle cx="12" cy="12" r="3" />
        <path d="M7 9h.01M17 15h.01" />
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
      {paths[name]}
    </svg>
  )
}

function EmployeeModal({ mode, employee, isSaving, onClose, onSave }) {
  const isDetail = mode === 'detail'
  const [values, setValues] = useState(
    employee
      ? {
          nama: employee.nama,
          jabatan: employee.jabatan,
          tarif_per_jam: String(employee.tarif_per_jam),
        }
      : EMPTY_FORM,
  )
  const [validationMessage, setValidationMessage] = useState('')

  async function handleSubmit(event) {
    event.preventDefault()
    const nama = values.nama.trim()
    const jabatan = values.jabatan.trim()
    const tarif = Number(values.tarif_per_jam)

    if (!nama || !values.tarif_per_jam || !Number.isFinite(tarif) || tarif < 0) {
      setValidationMessage('Isi nama dan masukkan tarif Rp0 atau lebih.')
      return
    }

    await onSave({ nama, jabatan, tarif_per_jam: tarif })
  }

  const title =
    mode === 'create'
      ? 'Tambah Karyawan'
      : mode === 'edit'
        ? 'Edit Karyawan'
        : 'Detail Karyawan'

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose()
      }}
    >
      <section
        aria-labelledby="employee-dialog-title"
        aria-modal="true"
        className="my-auto w-full max-w-lg rounded-2xl bg-white shadow-2xl shadow-slate-950/20"
        role="dialog"
      >
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4 sm:px-6">
          <div>
            <h2
              className="text-lg font-semibold text-slate-900"
              id="employee-dialog-title"
            >
              {title}
            </h2>
            {mode !== 'create' && (
              <p className="mt-1 text-sm text-slate-500">
                ID Karyawan: {employee.id_karyawan}
              </p>
            )}
          </div>
          <button
            aria-label="Tutup dialog"
            className="rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            onClick={onClose}
            type="button"
          >
            <EmployeeIcon className="h-5 w-5" name="close" />
          </button>
        </div>

        {isDetail ? (
          <dl className="grid gap-4 px-5 py-6 sm:grid-cols-2 sm:px-6">
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium text-slate-500">Nama</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {employee.nama}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4">
              <dt className="text-xs font-medium text-slate-500">Jabatan</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {employee.jabatan}
              </dd>
            </div>
            <div className="rounded-xl bg-slate-50 p-4 sm:col-span-2">
              <dt className="text-xs font-medium text-slate-500">
                Tarif Per Jam
              </dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {formatCurrency(employee.tarif_per_jam)}
              </dd>
            </div>
          </dl>
        ) : (
          <form className="space-y-4 px-5 py-6 sm:px-6" onSubmit={handleSubmit}>
            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Nama Karyawan <span className="text-rose-500">*</span>
              </span>
              <input
                autoFocus
                autoComplete="name"
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                maxLength={100}
                onChange={(event) =>
                  setValues((current) => ({ ...current, nama: event.target.value }))
                }
                placeholder="Masukkan nama karyawan"
                required
                value={values.nama}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Jabatan
              </span>
              <input
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                maxLength={100}
                onChange={(event) =>
                  setValues((current) => ({
                    ...current,
                    jabatan: event.target.value,
                  }))
                }
                placeholder="Contoh: Tukang"
                value={values.jabatan}
              />
            </label>

            <label className="block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Tarif Per Jam <span className="text-rose-500">*</span>
              </span>
              <div className="relative">
                <span className="absolute inset-y-0 left-3.5 flex items-center text-sm text-slate-400">
                  Rp
                </span>
                <input
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-10 pr-3.5 text-sm text-slate-800 outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                  min="0"
                  onChange={(event) =>
                    setValues((current) => ({
                      ...current,
                      tarif_per_jam: event.target.value,
                    }))
                  }
                  placeholder="0"
                  required
                  step="1"
                  type="number"
                  value={values.tarif_per_jam}
                />
              </div>
            </label>

            {validationMessage && (
              <p className="text-sm text-rose-600" role="alert">
                {validationMessage}
              </p>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-100 pt-4 sm:flex-row sm:justify-end">
              <button
                className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                disabled={isSaving}
                onClick={onClose}
                type="button"
              >
                Batal
              </button>
              <button
                className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:cursor-wait disabled:opacity-70"
                disabled={isSaving}
                type="submit"
              >
                {isSaving
                  ? 'Menyimpan...'
                  : mode === 'create'
                    ? 'Simpan Karyawan'
                    : 'Simpan Perubahan'}
              </button>
            </div>
          </form>
        )}

        {isDetail && (
          <div className="flex justify-end border-t border-slate-100 px-5 py-4 sm:px-6">
            <button
              className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              onClick={onClose}
              type="button"
            >
              Tutup
            </button>
          </div>
        )}
      </section>
    </div>
  )
}

function DataKaryawan() {
  const [store, setStore] = useState({
    employees: [],
    activeIds: [],
    isReady: false,
    isSaving: false,
    storageError: '',
  })
  const { employees, activeIds, isReady, isSaving, storageError } = store
  const [notice, setNotice] = useState('')
  const [modal, setModal] = useState(null)
  const [pendingDelete, setPendingDelete] = useState(null)
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)

  async function loadEmployees() {
    try {
      const loadedEmployees = await getKaryawan()
      setStore({
        employees: loadedEmployees,
        activeIds: loadedEmployees.map((employee) => employee.id_karyawan),
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
            activeIds: loadedEmployees.map((employee) => employee.id_karyawan),
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

  const positions = useMemo(
    () => [...new Set(employees.map((employee) => employee.jabatan))].sort(),
    [employees],
  )

  const filteredEmployees = useMemo(() => {
    const normalizedSearch = search.trim().toLocaleLowerCase('id-ID')

    return employees
      .filter((employee) => {
        const matchesSearch =
          !normalizedSearch ||
          employee.nama.toLocaleLowerCase('id-ID').includes(normalizedSearch) ||
          employee.jabatan.toLocaleLowerCase('id-ID').includes(normalizedSearch)
        const matchesPosition =
          !positionFilter || employee.jabatan === positionFilter

        return matchesSearch && matchesPosition
      })
      .sort((left, right) =>
        left.nama.localeCompare(right.nama, 'id', {
          sensitivity: 'base',
        }) * (sortOrder === 'asc' ? 1 : -1),
      )
  }, [employees, positionFilter, search, sortOrder])

  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  function showNotice(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 3500)
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
          activeIds: nextEmployees.map((employee) => employee.id_karyawan),
          isSaving: false,
        }
      })
      setModal(null)
      setPage(1)
      showNotice(
        modal.mode === 'create'
          ? 'Karyawan berhasil ditambahkan.'
          : 'Data karyawan berhasil diperbarui.',
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
        activeIds: nextEmployees.map((item) => item.id_karyawan),
        isSaving: false,
      }))
      setPendingDelete(null)
      showNotice('Karyawan berhasil dihapus.')
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
    <div className="admin-management-page admin-management-employees mx-auto w-full max-w-[1440px] space-y-6">
      <AdminPageBanner
        action={
          <button
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            disabled={!isReady}
            onClick={() => setModal({ mode: 'create' })}
            type="button"
          >
            <EmployeeIcon className="h-4 w-4" name="plus" />
            Tambah Karyawan
          </button>
        }
        description="Kelola informasi seluruh karyawan."
        icon={<EmployeeIcon className="h-6 w-6" name="people" />}
        title="Data Karyawan"
      />
      {storageError && (
        <div
          className="flex flex-col gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 sm:flex-row sm:items-center sm:justify-between"
          role="alert"
        >
          <p>{storageError}</p>
          <button
            className="shrink-0 font-semibold underline underline-offset-2"
            disabled={isSaving}
            onClick={() => {
              setStore((current) => ({
                ...current,
                isReady: false,
                storageError: '',
              }))
              loadEmployees()
            }}
            type="button"
          >
            Coba lagi
          </button>
        </div>
      )}

      {notice && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-700'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700'
          }`}
          role="status"
        >
          {notice.message}
        </div>
      )}

      <div className="admin-stat-grid grid gap-4 sm:grid-cols-2">
        <article className="admin-stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Total Karyawan
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {employees.length}
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <EmployeeIcon className="h-6 w-6" name="people" />
            </span>
          </div>
        </article>
        <article className="admin-stat-card rounded-2xl border border-slate-200 bg-white p-5 shadow-sm shadow-slate-900/[0.02]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">
                Karyawan Aktif
              </p>
              <p className="mt-2 text-3xl font-bold tracking-tight text-slate-900">
                {activeIds.filter((id) =>
                  employees.some((employee) => employee.id_karyawan === id),
                ).length}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Status simulasi lokal
              </p>
            </div>
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <EmployeeIcon className="h-6 w-6" name="people" />
            </span>
          </div>
        </article>
      </div>

      <section className="admin-data-table overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.02]">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Daftar Karyawan</h3>
            <p className="mt-1 text-sm text-slate-500">
              {filteredEmployees.length} data ditemukan
            </p>
          </div>
          <div className="grid gap-2 sm:flex">
            <label className="relative block">
              <span className="sr-only">Cari nama atau jabatan</span>
              <EmployeeIcon
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="search"
              />
              <input
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-56"
                onChange={(event) => {
                  setSearch(event.target.value)
                  setPage(1)
                }}
                placeholder="Cari karyawan..."
                value={search}
              />
            </label>
            <label className="relative block">
              <span className="sr-only">Filter jabatan</span>
              <select
                className="w-full appearance-none rounded-xl border border-slate-200 bg-white py-2.5 pl-3 pr-9 text-sm text-slate-700 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 sm:w-44"
                onChange={(event) => {
                  setPositionFilter(event.target.value)
                  setPage(1)
                }}
                value={positionFilter}
              >
                <option value="">Semua Jabatan</option>
                {positions.map((position) => (
                  <option key={position} value={position}>
                    {position}
                  </option>
                ))}
              </select>
              <EmployeeIcon
                className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                name="chevron"
              />
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3.5" scope="col">
                  No.
                </th>
                <th className="px-5 py-3.5" scope="col">
                  ID Karyawan
                </th>
                <th className="px-5 py-3.5" scope="col">
                  <button
                    className="inline-flex items-center gap-1.5 hover:text-slate-800"
                    onClick={() =>
                      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
                    }
                    type="button"
                  >
                    Nama Karyawan
                    <EmployeeIcon className="h-3.5 w-3.5" name="sort" />
                  </button>
                </th>
                <th className="px-5 py-3.5" scope="col">
                  Jabatan
                </th>
                <th className="px-5 py-3.5" scope="col">
                  Tarif Per Jam
                </th>
                <th className="px-5 py-3.5 text-right" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {!isReady ? (
                <tr>
                  <td className="px-5 py-12 text-center text-sm text-slate-500" colSpan="6">
                    Memuat data karyawan...
                  </td>
                </tr>
              ) : pageEmployees.map((employee, index) => (
                <tr
                  className="transition hover:bg-slate-50/80"
                  key={employee.id_karyawan}
                >
                  <td className="whitespace-nowrap px-5 py-4 text-slate-500">
                    {(currentPage - 1) * PAGE_SIZE + index + 1}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-600">
                    {employee.id_karyawan}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <div className="flex items-center gap-3">
                      <AdminAvatar
                        className="h-9 w-9 text-[11px]"
                        name={employee.nama}
                      />
                      <span className="font-semibold text-slate-800">
                        {employee.nama}
                      </span>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 text-slate-600">
                    <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600">
                      {employee.jabatan}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-4 font-medium text-slate-700">
                    {formatCurrency(employee.tarif_per_jam)}
                  </td>
                  <td className="whitespace-nowrap px-5 py-4">
                    <ActionButtons
                      actions={[
                        {
                          type: 'view',
                          label: `Lihat ${employee.nama}`,
                          onClick: () => setModal({ mode: 'detail', employee }),
                        },
                        {
                          type: 'edit',
                          label: `Edit ${employee.nama}`,
                          onClick: () => setModal({ mode: 'edit', employee }),
                        },
                        {
                          type: 'delete',
                          label: `Hapus ${employee.nama}`,
                          onClick: () => setPendingDelete(employee),
                        },
                      ]}
                    />
                  </td>
                </tr>
              ))}
              {isReady && pageEmployees.length === 0 && (
                <tr>
                  <td className="px-5 py-14 text-center" colSpan="6">
                    <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <EmployeeIcon className="h-6 w-6" name="search" />
                    </span>
                    <p className="mt-3 font-semibold text-slate-700">
                      Data karyawan tidak ditemukan
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      Ubah kata pencarian atau filter jabatan.
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-sm text-slate-500">
            Menampilkan{' '}
            <span className="font-medium text-slate-700">
              {filteredEmployees.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)}
            </span>{' '}
            dari {filteredEmployees.length} karyawan
          </p>
          <div className="flex items-center justify-between gap-2 sm:justify-end">
            <button
              aria-label="Halaman sebelumnya"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              type="button"
            >
              <EmployeeIcon className="h-4 w-4" name="previous" />
            </button>
            <span className="px-2 text-sm text-slate-600">
              Halaman {currentPage} dari {pageCount}
            </span>
            <button
              aria-label="Halaman berikutnya"
              className="rounded-lg border border-slate-200 p-2 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              type="button"
            >
              <EmployeeIcon className="h-4 w-4" name="next" />
            </button>
          </div>
        </div>
      </section>

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
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data karyawan ini?"
          isProcessing={isSaving}
          itemName={`${pendingDelete.nama} (${pendingDelete.id_karyawan})`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteEmployee(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataKaryawan
