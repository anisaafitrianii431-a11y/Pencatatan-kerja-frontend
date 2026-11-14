import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  getUsers,
  resetUserPassword,
  toggleUserStatus,
} from '../../services/userApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'

const PAGE_SIZE = 8

function UserIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
    users: (
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
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
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
    power: (
      <>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </>
    ),
    key: (
      <>
        <path d="m21 2-2 2m-1.5 1.5L16 7m-1.5 1.5L13 10m-2.5-3.5a6 6 0 1 0 7.07 7.07L22 9l-2-2-2 2-2-2-2 2-1.5-1.5" />
        <circle cx="7.5" cy="15.5" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    idBadge: (
      <>
        <rect width="18" height="14" x="3" y="5" rx="2" />
        <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
        <circle cx="9" cy="9" r="1.5" />
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
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
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

/**
 * MODAL RESET / UBAH KATA SANDI PENGGUNA
 */
function UserResetPasswordModal({ user, isSaving, onClose, onReset }) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  if (!user) return null

  async function handleSubmit(e) {
    e.preventDefault()
    setError('')

    const p = password.trim()
    const cp = confirmPassword.trim()

    if (!p) {
      setError('Kata sandi baru wajib diisi.')
      return
    }

    if (p.length < 6) {
      setError('Kata sandi baru minimal 6 karakter.')
      return
    }

    if (p !== cp) {
      setError('Konfirmasi kata sandi tidak cocok dengan kata sandi baru.')
      return
    }

    try {
      await onReset(user.id_user, p, cp)
    } catch (err) {
      setError(err.message || 'Gagal mengubah kata sandi.')
    }
  }

  return (
    <div
      className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-slate-950/50 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="reset-user-modal-title"
        className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
              <UserIcon name="key" className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="reset-user-modal-title"
                className="text-base font-bold text-slate-900"
              >
                Ubah Kata Sandi Pengguna
              </h2>
              <p className="text-xs text-slate-500">
                Kelola keamanan akun login pengguna sistem
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <UserIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800"
              role="alert"
            >
              <UserIcon name="alert" className="h-4 w-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Banner Info Pengguna */}
          <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-2">
            <div className="flex items-center gap-3">
              <AdminAvatar name={user.nama} className="h-10 w-10 text-xs font-bold" />
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 truncate">
                  {user.nama}
                </p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="font-mono text-[11px] font-bold text-blue-700 bg-white px-2 py-0.5 rounded border border-blue-200">
                    {user.kode_user}
                  </span>
                  <span className="text-[11px] text-slate-500 truncate">
                    Login ID: <strong className="text-slate-700 font-mono">{user.username}</strong>
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Input Password Baru */}
          <div>
            <label
              htmlFor="user-new-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                id="user-new-password"
                type={showPassword ? 'text' : 'password'}
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                tabIndex={-1}
                title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
              >
                <UserIcon name="eye" className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Konfirmasi Password Baru */}
          <div>
            <label
              htmlFor="user-confirm-password"
              className="block text-xs font-semibold text-slate-700 mb-1"
            >
              Ulangi Kata Sandi Baru <span className="text-rose-500">*</span>
            </label>
            <input
              id="user-confirm-password"
              type={showPassword ? 'text' : 'password'}
              required
              minLength={6}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Ketik ulang kata sandi di atas"
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
          </div>

          <div className="rounded-lg bg-slate-50 p-3 border border-slate-100 flex items-start gap-2 text-[11px] text-slate-500 leading-relaxed">
            <UserIcon name="shield" className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            <span>
              Kata sandi akan disimpan dalam bentuk hash terenkripsi Bcrypt (password_hash). Sistem tidak pernah menyimpan atau menampilkan password teks biasa.
            </span>
          </div>

          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition disabled:opacity-70 disabled:cursor-wait"
            >
              {isSaving ? 'Menyimpan...' : 'Simpan Kata Sandi'}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

/**
 * KOMPONEN UTAMA: ManajemenPengguna
 */
function ManajemenPengguna() {
  const navigate = useNavigate()
  const [users, setUsers] = useState([])
  const [isReady, setIsReady] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState(null)
  const [resetModalUser, setResetModalUser] = useState(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortOrder, setSortOrder] = useState('terbaru')
  const [page, setPage] = useState(1)

  async function loadUsers() {
    try {
      const data = await getUsers()
      setUsers(data)
      setIsReady(true)
      setErrorMsg('')
    } catch (err) {
      setIsReady(false)
      setErrorMsg(`Data pengguna tidak dapat dimuat: ${err.message}`)
    }
  }

  useEffect(() => {
    loadUsers()
  }, [])

  function showNotice(message, type = 'success') {
    setNotice({ message, type })
    window.setTimeout(() => setNotice(null), 4000)
  }

  // Filter & Search
  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase()

    return users
      .filter((u) => {
        const matchesSearch =
          !q ||
          u.nama.toLowerCase().includes(q) ||
          u.kode_user.toLowerCase().includes(q) ||
          u.username.toLowerCase().includes(q) ||
          (u.kode_karyawan && u.kode_karyawan.toLowerCase().includes(q)) ||
          (u.jabatan && u.jabatan.toLowerCase().includes(q))

        const matchesRole = !roleFilter || u.peran === roleFilter
        const isUserActive = Number(u.aktif) === 1
        const matchesStatus =
          !statusFilter ||
          (statusFilter === 'aktif' ? isUserActive : !isUserActive)

        return matchesSearch && matchesRole && matchesStatus
      })
      .sort((a, b) => sortOrder === 'terbaru'
        ? Number(b.id_user) - Number(a.id_user)
        : a.nama.localeCompare(b.nama, 'id', { sensitivity: 'base' }) * (sortOrder === 'asc' ? 1 : -1))
  }, [users, search, roleFilter, statusFilter, sortOrder])

  // Statistics
  const totalCount = users.length
  const activeCount = users.filter((u) => Number(u.aktif) === 1).length
  const inactiveCount = totalCount - activeCount
  const adminCount = users.filter((u) => u.peran === 'admin').length
  const karyawanCount = users.filter((u) => u.peran === 'karyawan').length

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredUsers.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageUsers = filteredUsers.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const hasActiveFilters = Boolean(search || roleFilter || statusFilter)

  function handleResetFilters() {
    setSearch('')
    setRoleFilter('')
    setStatusFilter('')
    setPage(1)
  }

  async function handleToggleStatus(user) {
    const nextStatus = Number(user.aktif) === 1 ? 'nonaktif' : 'aktif'
    setIsSaving(true)
    try {
      const updated = await toggleUserStatus(user.id_user, nextStatus)
      setUsers((prev) =>
        prev.map((item) => (item.id_user === user.id_user ? updated : item)),
      )
      setIsSaving(false)
      const label = nextStatus === 'aktif' ? 'diaktifkan' : 'dinonaktifkan'
      showNotice(`Akun ${user.nama} (${user.kode_user}) berhasil ${label}.`, 'success')
    } catch (err) {
      setIsSaving(false)
      showNotice(`Gagal mengubah status: ${err.message}`, 'error')
    }
  }

  async function handleResetPassword(idUser, password, confirmPassword) {
    setIsSaving(true)
    try {
      const updated = await resetUserPassword(idUser, password, confirmPassword)
      setUsers((prev) =>
        prev.map((item) => (item.id_user === idUser ? updated : item)),
      )
      setIsSaving(false)
      setResetModalUser(null)
      showNotice(`Kata sandi untuk ${updated.nama} (${updated.kode_user}) berhasil diperbarui!`, 'success')
    } catch (err) {
      setIsSaving(false)
      throw err
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* 1. HEADER HALAMAN */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Manajemen Pengguna</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Manajemen Pengguna
            </h1>
            {isReady && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {totalCount} akun terdaftar
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Seluruh karyawan yang ditambahkan di Data Karyawan otomatis memiliki akun login di sini dengan ID Pengguna berurutan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-xl border border-blue-200 bg-blue-50/70 px-3.5 py-2 text-xs font-semibold text-blue-800 shadow-2xs">
            <UserIcon name="shield" className="h-4 w-4 text-blue-600" />
            <span>Terintegrasi Data Karyawan</span>
          </div>
        </div>
      </header>

      {/* NOTIFIKASI TOAST */}
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
            <UserIcon
              name={notice.type === 'error' ? 'alert' : 'check'}
              className={`h-4 w-4 shrink-0 ${
                notice.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            />
            <span className="font-medium text-xs sm:text-sm leading-relaxed">
              {notice.message}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setNotice(null)}
            className="rounded p-1 text-slate-400 hover:text-slate-600 transition"
            title="Tutup pemberitahuan"
          >
            <UserIcon name="close" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}

      {/* ERROR SERVER */}
      {errorMsg && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <UserIcon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="font-medium">{errorMsg}</p>
          </div>
          <button
            type="button"
            onClick={loadUsers}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 2. STATISTIK PENGGUNA (INTERAKTIF & BISA DIKLIK) */}
      <section
        aria-label="Statistik Pengguna"
        className="grid grid-cols-1 sm:grid-cols-4 gap-3.5 sm:gap-4"
      >
        {/* Total Akun */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('')
            setRoleFilter('')
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === '' && roleFilter === ''
              ? 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Klik untuk menampilkan seluruh pengguna"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Pengguna
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {isReady ? totalCount : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              {adminCount} Admin &bull; {karyawanCount} Pekerja &bull; Klik semua
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
            <UserIcon name="users" className="h-5 w-5" />
          </div>
        </button>

        {/* Akun Aktif */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((curr) => (curr === 'aktif' ? '' : 'aktif'))
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === 'aktif'
              ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Klik untuk memfilter pengguna aktif"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pengguna Aktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
              {isReady ? activeCount : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600/90 font-medium">
              Akses login aktif &bull; Klik filter
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10">
            <UserIcon name="check-circle" className="h-5 w-5" />
          </div>
        </button>

        {/* Akun Nonaktif */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((curr) => (curr === 'nonaktif' ? '' : 'nonaktif'))
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === 'nonaktif'
              ? 'border-2 border-slate-700 bg-slate-100 ring-2 ring-slate-700/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Klik untuk memfilter pengguna nonaktif"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Pengguna Nonaktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-700">
              {isReady ? inactiveCount : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Akses dinonaktifkan &bull; Klik filter
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 ring-1 ring-slate-200">
            <UserIcon name="user-x" className="h-5 w-5" />
          </div>
        </button>

        {/* Administrator */}
        <button
          type="button"
          onClick={() => {
            setRoleFilter((curr) => (curr === 'admin' ? '' : 'admin'))
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            roleFilter === 'admin'
              ? 'border-2 border-purple-600 bg-purple-50/40 ring-2 ring-purple-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
          title="Klik untuk memfilter akun Administrator"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Administrator
            </p>
            <p className="mt-1 font-mono text-2xl font-bold text-purple-700">
              {isReady ? adminCount : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Hak akses sistem penuh &bull; Klik filter
            </p>
          </div>
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-purple-50 text-purple-600 ring-1 ring-purple-600/10">
            <UserIcon name="idBadge" className="h-5 w-5" />
          </div>
        </button>
      </section>

      {/* 3. TOOLBAR PENCARIAN & FILTER */}
      <section
        aria-label="Pencarian dan Filter Pengguna"
        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 min-w-[240px]">
            <UserIcon
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
              placeholder="Cari berdasarkan nama, ID Pengguna (USER001), ID Login (ANDI001), jabatan..."
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
                <UserIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Role */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Peran</option>
                <option value="admin">Administrator</option>
                <option value="karyawan">Pekerja / Karyawan</option>
              </select>
              <UserIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Status */}
            <div className="relative min-w-[120px] flex-1 sm:flex-initial">
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
              <UserIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Reset filter"
              >
                <UserIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. TABEL PENGGUNA SISTEM */}
      <section
        aria-label="Tabel Pengguna Sistem"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="px-3.5 py-3.5 text-center w-12" scope="col">
                  No.
                </th>
                <th className="px-3.5 py-3.5 w-28" scope="col">
                  ID Pengguna
                </th>
                <th className="px-3.5 py-3.5" scope="col">
                  <button
                    type="button"
                    onClick={() => setSortOrder((order) => order === 'terbaru' ? 'asc' : order === 'asc' ? 'desc' : 'terbaru')}
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold"
                  >
                    <span>Nama Pengguna</span>
                    <UserIcon name="sort" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>
                <th className="px-3.5 py-3.5" scope="col">
                  Username / ID Login
                </th>
                <th className="px-3.5 py-3.5" scope="col">
                  ID Karyawan
                </th>
                <th className="px-3.5 py-3.5" scope="col">
                  Jabatan
                </th>
                <th className="px-3.5 py-3.5 text-center w-28" scope="col">
                  Role
                </th>
                <th className="px-3.5 py-3.5 text-center w-28" scope="col">
                  Status Akun
                </th>
                <th className="px-3.5 py-3.5 text-right w-44" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!isReady ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">
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
                        Memuat data pengguna sistem...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pageUsers.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <UserIcon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Pengguna tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Sesuaikan kata kunci pencarian atau reset filter Anda.'
                        : 'Belum ada pengguna terdaftar.'}
                    </p>
                  </td>
                </tr>
              ) : (
                pageUsers.map((u, index) => {
                  const isUserActive = Number(u.aktif) === 1

                  return (
                    <tr
                      key={u.id_user}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* 1. No */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center text-xs font-medium text-slate-400">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* 2. ID Pengguna (USER001, USER002, ...) */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span className="inline-flex items-center font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-purple-50 text-purple-700 border border-purple-200/70 shadow-2xs">
                          {u.kode_user}
                        </span>
                      </td>

                      {/* 3. Nama Pengguna */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={u.nama}
                            className="h-8 w-8 text-xs font-bold shadow-2xs"
                          />
                          {u.id_karyawan ? (
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/karyawan?highlight=${u.id_karyawan}`)}
                              className="font-semibold text-slate-900 hover:text-blue-600 hover:underline block truncate text-left cursor-pointer transition"
                              title="Buka profil karyawan ini di Data Karyawan"
                            >
                              {u.nama}
                            </button>
                          ) : (
                            <span className="font-semibold text-slate-900 block truncate">
                              {u.nama}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* 4. Username / ID Login */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span className="font-mono text-xs font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          {u.username}
                        </span>
                      </td>

                      {/* 5. ID Karyawan */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        {u.kode_karyawan ? (
                          <button
                            type="button"
                            onClick={() => navigate(`/admin/karyawan?highlight=${u.id_karyawan}`)}
                            className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200 hover:bg-blue-100 hover:border-blue-300 transition cursor-pointer flex items-center gap-1 group"
                            title="Buka profil karyawan ini di Data Karyawan"
                          >
                            <span>{u.kode_karyawan}</span>
                            <span className="text-[10px] text-blue-400 group-hover:text-blue-600">↗</span>
                          </button>
                        ) : (
                          <span className="text-slate-300 font-sans text-xs">—</span>
                        )}
                      </td>

                      {/* 6. Jabatan */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span className="text-xs font-medium text-slate-600">
                          {u.jabatan}
                        </span>
                      </td>

                      {/* 7. Role */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center">
                        {u.peran === 'admin' ? (
                          <span className="inline-flex items-center gap-1 rounded-md bg-blue-50 px-2.5 py-0.5 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                            👑 Admin
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                            👤 Pekerja
                          </span>
                        )}
                      </td>

                      {/* 8. Status Akun */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center">
                        {isUserActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* 9. Aksi: Ubah Password & Toggle Status */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1.5">
                          {/* Ubah Password */}
                          <button
                            type="button"
                            onClick={() => setResetModalUser(u)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs"
                            title={`Ubah kata sandi untuk ${u.nama}`}
                          >
                            <UserIcon name="key" className="h-3.5 w-3.5 text-blue-600" />
                            <span>Ubah Sandi</span>
                          </button>

                          {/* Toggle Status Aktif/Nonaktif */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(u)}
                            disabled={isSaving}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition shadow-2xs ${
                              isUserActive
                                ? 'border-slate-200 bg-white text-emerald-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={
                              isUserActive
                                ? `Nonaktifkan akun ${u.nama}`
                                : `Aktifkan kembali akun ${u.nama}`
                            }
                            aria-label={
                              isUserActive
                                ? `Nonaktifkan akun ${u.nama}`
                                : `Aktifkan kembali akun ${u.nama}`
                            }
                          >
                            <UserIcon name="power" className="h-3.5 w-3.5" />
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

        {/* Footer & Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {filteredUsers.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredUsers.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredUsers.length}
            </span>{' '}
            pengguna
          </p>

          <div className="flex items-center justify-between gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <UserIcon name="previous" className="h-3.5 w-3.5" />
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
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <UserIcon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. MODAL UBAH / RESET KATA SANDI */}
      {resetModalUser && (
        <UserResetPasswordModal
          user={resetModalUser}
          isSaving={isSaving}
          onClose={() => setResetModalUser(null)}
          onReset={handleResetPassword}
        />
      )}
    </div>
  )
}

export default ManajemenPengguna

