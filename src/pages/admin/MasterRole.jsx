import { useEffect, useMemo, useState } from 'react'
import {
  getMasterRoles,
  createMasterRole,
  updateMasterRole,
  deleteMasterRole
} from '../../services/masterRoleApi.js'

function RoleIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
    hierarchy: (
      <>
        <rect x="9" y="3" width="6" height="4" rx="1" />
        <rect x="3" y="15" width="6" height="4" rx="1" />
        <rect x="15" y="15" width="6" height="4" rx="1" />
        <path d="M12 7v4M6 15v-2a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v2" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    edit: <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />,
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    close: <path d="m18 6-12 12M6 6l12 12" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    info: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="16" x2="12" y2="12" />
        <line x1="12" y1="8" x2="12.01" y2="8" />
      </>
    ),
    layers: (
      <>
        <polygon points="12 2 2 7 12 12 22 7 12 2" />
        <polyline points="2 17 12 22 22 17" />
        <polyline points="2 12 12 17 22 12" />
      </>
    ),
    grid: (
      <>
        <rect x="3" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="3" width="7" height="7" rx="1" />
        <rect x="14" y="14" width="7" height="7" rx="1" />
        <rect x="3" y="14" width="7" height="7" rx="1" />
      </>
    ),
    list: (
      <>
        <line x1="8" y1="6" x2="21" y2="6" />
        <line x1="8" y1="12" x2="21" y2="12" />
        <line x1="8" y1="18" x2="21" y2="18" />
        <line x1="3" y1="6" x2="3.01" y2="6" />
        <line x1="3" y1="12" x2="3.01" y2="12" />
        <line x1="3" y1="18" x2="3.01" y2="18" />
      </>
    ),
    shield: (
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    ),
    award: (
      <>
        <circle cx="12" cy="8" r="7" />
        <polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88" />
      </>
    ),
    briefcase: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
      </>
    ),
    users: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    sparkles: (
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z" />
    )
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
      {paths[name] || paths.hierarchy}
    </svg>
  )
}

function getHierarchyBadge(level) {
  const lvl = Number(level)
  if (lvl === 1) {
    return {
      bg: 'bg-slate-100 text-slate-700 ring-slate-200 border-slate-200',
      tagBg: 'bg-slate-50 text-slate-600',
      label: 'Level 1',
      title: 'Helper / Pekerja Lapangan',
      dotColor: 'bg-slate-400'
    }
  }
  if (lvl === 2) {
    return {
      bg: 'bg-blue-50 text-blue-700 ring-blue-200 border-blue-200',
      tagBg: 'bg-blue-50 text-blue-700',
      label: 'Level 2',
      title: 'Staf / Teknisi / Operator',
      dotColor: 'bg-blue-500'
    }
  }
  if (lvl === 3) {
    return {
      bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200 border-emerald-200',
      tagBg: 'bg-emerald-50 text-emerald-700',
      label: 'Level 3',
      title: 'Senior / Mandor / Spv',
      dotColor: 'bg-emerald-500'
    }
  }
  if (lvl === 4) {
    return {
      bg: 'bg-purple-50 text-purple-700 ring-purple-200 border-purple-200',
      tagBg: 'bg-purple-50 text-purple-700',
      label: 'Level 4',
      title: 'Manajer Proyek / Koordinator',
      dotColor: 'bg-purple-500'
    }
  }
  return {
    bg: 'bg-amber-50 text-amber-800 ring-amber-300 border-amber-300',
    tagBg: 'bg-amber-50 text-amber-800',
    label: `Level ${lvl}`,
    title: 'Eksekutif / Direktur',
    dotColor: 'bg-amber-500'
  }
}

export default function MasterRole() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorNotice, setErrorNotice] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua') // semua, aktif, nonaktif
  const [sortByLevel, setSortByLevel] = useState('asc') // asc, desc
  const [viewMode, setViewMode] = useState('table') // table, grid

  // Modal State
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingRole, setEditingRole] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')

  // Form Fields
  const [formData, setFormData] = useState({
    nama_role: '',
    hierarchy_level: 1,
    deskripsi: '',
    is_active: true
  })

  const loadData = async () => {
    setLoading(true)
    setErrorNotice('')
    try {
      const data = await getMasterRoles({ include_inactive: 'true' })
      setRoles(data || [])
    } catch (err) {
      setErrorNotice(err.message || 'Gagal memuat daftar master role')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // KPI Ringkasan
  const stats = useMemo(() => {
    const total = roles.length
    const active = roles.filter(r => r.is_active).length
    const usedInProjects = roles.reduce((sum, r) => sum + (Number(r.total_penggunaan) || 0), 0)
    const maxLevel = roles.length > 0 ? Math.max(...roles.map(r => Number(r.hierarchy_level) || 1)) : 1
    return { total, active, usedInProjects, maxLevel }
  }, [roles])

  const filteredRoles = useMemo(() => {
    const list = roles.filter(r => {
      const matchSearch = r.nama_role.toLowerCase().includes(search.toLowerCase()) ||
        (r.deskripsi && r.deskripsi.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = filterStatus === 'semua' ? true :
        filterStatus === 'aktif' ? r.is_active : !r.is_active
      return matchSearch && matchStatus
    })

    return list.sort((a, b) => {
      if (sortByLevel === 'asc') return a.hierarchy_level - b.hierarchy_level
      return b.hierarchy_level - a.hierarchy_level
    })
  }, [roles, search, filterStatus, sortByLevel])

  const openCreateModal = () => {
    setEditingRole(null)
    setFormData({
      nama_role: '',
      hierarchy_level: roles.length > 0 ? Math.max(...roles.map(r => r.hierarchy_level)) + 1 : 1,
      deskripsi: '',
      is_active: true
    })
    setFormError('')
    setIsFormOpen(true)
  }

  const openEditModal = (role) => {
    setEditingRole(role)
    setFormData({
      nama_role: role.nama_role,
      hierarchy_level: role.hierarchy_level,
      deskripsi: role.deskripsi || '',
      is_active: role.is_active
    })
    setFormError('')
    setIsFormOpen(true)
  }

  const handleSubmitForm = async (e) => {
    e.preventDefault()
    setFormError('')
    setSubmitting(true)

    try {
      const payload = {
        nama_role: formData.nama_role.trim(),
        hierarchy_level: parseInt(formData.hierarchy_level, 10),
        default_gaji_min_bulanan: 0,
        default_gaji_max_bulanan: 0,
        deskripsi: formData.deskripsi.trim(),
        is_active: formData.is_active ? 1 : 0
      }

      if (editingRole) {
        await updateMasterRole(editingRole.id_role, payload)
        setSuccessNotice(`Role "${payload.nama_role}" berhasil diperbarui.`)
      } else {
        await createMasterRole(payload)
        setSuccessNotice(`Role "${payload.nama_role}" (Level ${payload.hierarchy_level}) berhasil dibuat!`)
      }

      setIsFormOpen(false)
      loadData()
      setTimeout(() => setSuccessNotice(''), 4000)
    } catch (err) {
      setFormError(err.message || 'Gagal menyimpan role')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setSubmitting(true)
    setErrorNotice('')
    try {
      const res = await deleteMasterRole(deleteTarget.id_role)
      setSuccessNotice(res?.message || `Role "${deleteTarget.nama_role}" berhasil diproses.`)
      setDeleteTarget(null)
      loadData()
      setTimeout(() => setSuccessNotice(''), 4000)
    } catch (err) {
      setErrorNotice(err.message || 'Gagal memproses role')
    } finally {
      setSubmitting(false)
    }
  }

  const liveBadge = getHierarchyBadge(formData.hierarchy_level)

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header Utama Modern */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 p-6 sm:p-8 text-white shadow-xl border border-slate-800">
        <div className="absolute right-0 top-0 -mt-6 -mr-6 h-56 w-56 rounded-full bg-blue-500/10 blur-3xl pointer-events-none" />
        <div className="absolute left-1/3 bottom-0 -mb-8 h-40 w-40 rounded-full bg-indigo-500/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-400/30">
              <RoleIcon name="layers" className="h-3.5 w-3.5" />
              <span>Katalog Jabatan &amp; Blueprint Tim</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              Master Role &amp; Hierarki Jabatan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Pusat kelola jabatan resmi perusahaan, jenjang urutan pangkat, dan kualifikasi tugas. Tarif upah ditentukan fleksibel oleh Direktur saat penugasan proyek.
            </p>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={openCreateModal}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-5 py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 transition-all cursor-pointer active:scale-95"
            >
              <RoleIcon name="plus" className="h-4 w-4" />
              <span>Tambah Role Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Kartu Ringkasan KPI (4 Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total Role */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Jabatan</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
              <RoleIcon name="hierarchy" className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-slate-900">{stats.total}</span>
            <span className="text-xs font-semibold text-slate-500">Jabatan</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Tersedia di sistem perusahaan</p>
        </div>

        {/* Card 2: Role Aktif */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Role Aktif</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <RoleIcon name="check" className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-700">{stats.active}</span>
            <span className="text-xs font-semibold text-slate-500">Siap Pakai</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Dapat dipilih pada blueprint proyek</p>
        </div>

        {/* Card 3: Terhubung ke Proyek */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pemetaan Proyek</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <RoleIcon name="briefcase" className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-indigo-900">{stats.usedInProjects}</span>
            <span className="text-xs font-semibold text-slate-500">Penugasan</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Slot blueprint proyek terhubung</p>
        </div>

        {/* Card 4: Jenjang Tertinggi */}
        <div className="rounded-2xl border border-slate-200/80 bg-white p-4 shadow-2xs hover:shadow-xs transition">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Level Tertinggi</span>
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
              <RoleIcon name="award" className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-amber-900">Lvl {stats.maxLevel}</span>
            <span className="text-xs font-semibold text-slate-500">Pangkat</span>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">Tingkat tanggung jawab teratas</p>
        </div>
      </div>

      {/* Notifikasi Global */}
      {successNotice && (
        <div className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-xs sm:text-sm font-semibold text-emerald-800 shadow-sm animate-fade-in">
          <RoleIcon name="check" className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-xs sm:text-sm font-semibold text-rose-800 shadow-sm animate-fade-in">
          <RoleIcon name="alert" className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Filter & Toolbar Kontrol */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-2xs">
        {/* Kolom Pencarian */}
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <RoleIcon name="search" className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama jabatan atau kualifikasi..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/60 pl-10 pr-9 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-slate-400 hover:text-slate-600"
            >
              <RoleIcon name="close" className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Pengaturan Filter & Switch View */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Filter Status */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="semua">Semua Role</option>
              <option value="aktif">Hanya Aktif</option>
              <option value="nonaktif">Hanya Nonaktif</option>
            </select>
          </div>

          {/* Sort Level */}
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1">
            <span className="text-[11px] font-semibold text-slate-500">Urut:</span>
            <select
              value={sortByLevel}
              onChange={(e) => setSortByLevel(e.target.value)}
              className="bg-transparent text-xs font-bold text-slate-700 outline-none cursor-pointer"
            >
              <option value="asc">Level Rendah → Tinggi</option>
              <option value="desc">Level Tinggi → Rendah</option>
            </select>
          </div>

          {/* Toggle Tampilan (Table vs Grid) */}
          <div className="flex items-center rounded-xl bg-slate-100 p-1 border border-slate-200">
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Tabel"
            >
              <RoleIcon name="list" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Tabel</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-bold transition cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white text-blue-700 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Tampilan Kartu"
            >
              <RoleIcon name="grid" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Kartu</span>
            </button>
          </div>
        </div>
      </div>

      {/* Konten Utama (Tabel atau Grid Card) */}
      {viewMode === 'table' ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs sm:text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                  <th className="px-5 py-4 w-44">Jenjang &amp; Level</th>
                  <th className="px-5 py-4">Nama Role / Jabatan</th>
                  <th className="px-5 py-4 w-48 text-center">Blueprint Proyek</th>
                  <th className="px-5 py-4 w-52">Skema Penggajian</th>
                  <th className="px-5 py-4 w-32 text-center">Status</th>
                  <th className="px-5 py-4 text-right w-44">Tindakan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center text-slate-400 font-medium">
                      <div className="flex flex-col items-center justify-center gap-2">
                        <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
                        <span>Memuat data master role...</span>
                      </div>
                    </td>
                  </tr>
                ) : filteredRoles.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="p-12 text-center">
                      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 mb-3">
                        <RoleIcon name="hierarchy" className="h-6 w-6" />
                      </div>
                      <p className="font-bold text-slate-800 text-sm">Tidak ada master role ditemukan</p>
                      <p className="mt-1 text-xs text-slate-400">
                        {search ? 'Coba ubah kata kunci pencarian atau reset filter status.' : 'Belum ada jabatan terdaftar. Klik tombol "Tambah Role Baru" di atas.'}
                      </p>
                    </td>
                  </tr>
                ) : (
                  filteredRoles.map((role) => {
                    const badge = getHierarchyBadge(role.hierarchy_level)

                    return (
                      <tr
                        key={role.id_role}
                        className={`hover:bg-blue-50/30 transition-colors ${!role.is_active ? 'bg-slate-50/50 opacity-75' : ''}`}
                      >
                        {/* 1. Jenjang & Level */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-center gap-2.5">
                            <span className={`inline-flex items-center justify-center rounded-xl px-3 py-1.5 text-xs font-black ring-1 ring-inset shadow-2xs ${badge.bg}`}>
                              Lvl {role.hierarchy_level}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-500 hidden sm:inline">
                              {badge.title.split('/')[0]}
                            </span>
                          </div>
                        </td>

                        {/* 2. Nama Role & Deskripsi */}
                        <td className="px-5 py-4 align-middle">
                          <div className="flex items-start gap-3">
                            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 text-blue-700 font-extrabold text-xs shadow-2xs mt-0.5">
                              {role.nama_role.slice(0, 2).toUpperCase()}
                            </div>
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 text-sm">
                                  {role.nama_role}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono font-medium">
                                  #ID-{role.id_role}
                                </span>
                              </div>
                              {role.deskripsi ? (
                                <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">
                                  {role.deskripsi}
                                </p>
                              ) : (
                                <span className="text-[11px] text-slate-400 italic">
                                  Tanpa keterangan kualifikasi
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* 3. Penggunaan Blueprint Proyek */}
                        <td className="px-5 py-4 align-middle text-center whitespace-nowrap">
                          {role.total_penggunaan > 0 ? (
                            <span className="inline-flex items-center gap-1.5 rounded-xl bg-blue-50 border border-blue-200/80 px-3 py-1 text-xs font-bold text-blue-700">
                              <RoleIcon name="briefcase" className="h-3.5 w-3.5 text-blue-600" />
                              <span>{role.total_penggunaan} Proyek</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center rounded-xl bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-400">
                              0 Proyek
                            </span>
                          )}
                        </td>

                        {/* 4. Skema Penggajian (Informatif) */}
                        <td className="px-5 py-4 align-middle whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 text-xs font-semibold text-emerald-800">
                              <span>💼</span>
                              <span>Fleksibel per Proyek</span>
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5 ml-1">
                            Ditetapkan manual saat penugasan
                          </span>
                        </td>

                        {/* 5. Status Keaktifan */}
                        <td className="px-5 py-4 align-middle text-center whitespace-nowrap">
                          {role.is_active ? (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                              Aktif
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600 ring-1 ring-inset ring-slate-300">
                              <span className="h-2 w-2 rounded-full bg-slate-400" />
                              Nonaktif
                            </span>
                          )}
                        </td>

                        {/* 6. Aksi */}
                        <td className="px-5 py-4 align-middle text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => openEditModal(role)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-2xs hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition cursor-pointer active:scale-95"
                            >
                              <RoleIcon name="edit" className="h-3.5 w-3.5 text-blue-600" />
                              <span>Edit</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => setDeleteTarget(role)}
                              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-300 transition cursor-pointer active:scale-95"
                            >
                              <RoleIcon name="trash" className="h-3.5 w-3.5 text-rose-600" />
                              <span>{role.total_penggunaan > 0 ? 'Nonaktifkan' : 'Hapus'}</span>
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
        </div>
      ) : (
        /* Mode Tampilan Kartu (Grid) */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {loading ? (
            <div className="col-span-full p-12 text-center text-slate-400">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent mx-auto mb-2" />
              <span>Memuat data master role...</span>
            </div>
          ) : filteredRoles.length === 0 ? (
            <div className="col-span-full p-12 text-center bg-white rounded-3xl border border-slate-200">
              <p className="font-bold text-slate-800 text-sm">Tidak ada master role ditemukan</p>
            </div>
          ) : (
            filteredRoles.map((role) => {
              const badge = getHierarchyBadge(role.hierarchy_level)

              return (
                <div
                  key={role.id_role}
                  className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-2xs hover:shadow-md transition-all ${
                    role.is_active ? 'border-slate-200' : 'border-slate-200 bg-slate-50/50 opacity-75'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Top Row: Level Badge & Status */}
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center rounded-xl px-2.5 py-1 text-xs font-black ring-1 ring-inset ${badge.bg}`}>
                        Level {role.hierarchy_level} • {badge.title.split('/')[0]}
                      </span>

                      {role.is_active ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-700 ring-1 ring-emerald-600/20">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                          Aktif
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-bold text-slate-600 ring-1 ring-slate-300">
                          Nonaktif
                        </span>
                      )}
                    </div>

                    {/* Role Title & ID */}
                    <div className="pt-1">
                      <h3 className="text-base font-bold text-slate-900 flex items-center justify-between">
                        <span>{role.nama_role}</span>
                        <span className="text-[10px] text-slate-400 font-mono">#ID-{role.id_role}</span>
                      </h3>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-2 leading-relaxed">
                        {role.deskripsi || 'Tidak ada catatan deskripsi atau kualifikasi khusus untuk jabatan ini.'}
                      </p>
                    </div>

                    {/* Info Card: Penggunaan Proyek & Upah */}
                    <div className="rounded-2xl bg-slate-50 border border-slate-100 p-3 space-y-1.5 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Penggunaan:</span>
                        <span className="font-bold text-blue-700">
                          {role.total_penggunaan > 0 ? `${role.total_penggunaan} Blueprint Proyek` : 'Belum Digunakan'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 font-medium">Penetapan Upah:</span>
                        <span className="font-semibold text-emerald-700">Manual per Proyek</span>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(role)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition cursor-pointer"
                    >
                      <RoleIcon name="edit" className="h-3.5 w-3.5 text-blue-600" />
                      <span>Edit</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setDeleteTarget(role)}
                      className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                    >
                      <RoleIcon name="trash" className="h-3.5 w-3.5" />
                      <span>{role.total_penggunaan > 0 ? 'Nonaktifkan' : 'Hapus'}</span>
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>
      )}

      {/* Modal Tambah / Edit Role Modern */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-3xl bg-white p-6 sm:p-7 shadow-2xl border border-slate-200 my-8 animate-fade-in">
            {/* Header Modal */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-50 text-blue-600 border border-blue-100 shadow-2xs">
                  <RoleIcon name="hierarchy" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-extrabold text-slate-900">
                    {editingRole ? 'Edit Master Role' : 'Tambah Master Role Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingRole ? `Perbarui parameter jabatan #${editingRole.id_role}` : 'Tentukan nama role dan tingkat urutan hierarki pangkat'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-xl p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <RoleIcon name="close" className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-2xl border border-rose-200 bg-rose-50 p-3.5 text-xs font-medium text-rose-800">
                <RoleIcon name="alert" className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-5 space-y-4">
              {/* Nama Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Nama Role / Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_role}
                  onChange={(e) => setFormData({ ...formData, nama_role: e.target.value })}
                  placeholder="Contoh: Senior Project Manager, Teknisi Listrik, Helper"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                />
              </div>

              {/* Hierarchy Level & Live Preview */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Level Hierarki Pangkat <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData({ ...formData, hierarchy_level: e.target.value })}
                    className="w-24 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-black text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none text-center"
                  />
                  <div className="flex-1 rounded-xl bg-slate-50 border border-slate-200/80 p-2 text-xs flex items-center justify-between">
                    <div>
                      <span className="font-bold text-slate-800">{liveBadge.title}</span>
                      <span className="text-[10px] text-slate-500 block">Jenjang Tanggung Jawab</span>
                    </div>
                    <span className={`inline-flex items-center rounded-lg px-2 py-0.5 text-[11px] font-black ring-1 ring-inset ${liveBadge.bg}`}>
                      Lvl {formData.hierarchy_level || 1}
                    </span>
                  </div>
                </div>

                {/* Quick Selection Chips */}
                <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-semibold text-slate-400">Pilih Cepat:</span>
                  {[
                    { lvl: 1, label: 'Lvl 1 - Helper' },
                    { lvl: 2, label: 'Lvl 2 - Teknisi' },
                    { lvl: 3, label: 'Lvl 3 - Senior/Spv' },
                    { lvl: 4, label: 'Lvl 4 - Manajer' },
                    { lvl: 5, label: 'Lvl 5 - Direktur' }
                  ].map((chip) => (
                    <button
                      key={chip.lvl}
                      type="button"
                      onClick={() => setFormData({ ...formData, hierarchy_level: chip.lvl })}
                      className={`text-[11px] font-bold px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                        Number(formData.hierarchy_level) === chip.lvl
                          ? 'bg-blue-600 text-white border-blue-600 shadow-2xs'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      {chip.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Deskripsi / Kualifikasi Jabatan (Opsional)
                </label>
                <textarea
                  rows="3"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Kualifikasi keahlian, cakupan tugas, sertifikasi yang disyaratkan..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                />
              </div>

              {/* Info Upah Fleksibel */}
              <div className="rounded-2xl bg-blue-50/70 border border-blue-200/80 p-3 text-xs text-blue-900 flex items-start gap-2.5">
                <span className="text-base shrink-0">💡</span>
                <p className="leading-relaxed">
                  <strong>Penetapan Tarif Upah:</strong> Master Role tidak membatasi gaji min/max. Tarif upah ditentukan fleksibel dan manual oleh Direktur pada saat menugaskan pekerja ke slot proyek.
                </p>
              </div>

              {/* Toggle Status Aktif (Saat Edit) */}
              {editingRole && (
                <div className="flex items-center gap-3 pt-1">
                  <input
                    type="checkbox"
                    id="is_active_toggle"
                    checked={formData.is_active}
                    onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500 cursor-pointer"
                  />
                  <label htmlFor="is_active_toggle" className="text-xs font-bold text-slate-700 cursor-pointer">
                    Role Berstatus Aktif (Dapat dipilih saat membuat blueprint proyek)
                  </label>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-2.5 text-xs sm:text-sm font-bold text-white shadow-md shadow-blue-500/25 hover:from-blue-500 hover:to-indigo-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 transition cursor-pointer active:scale-95"
                >
                  <RoleIcon name="check" className="h-4 w-4" />
                  <span>{submitting ? 'Menyimpan...' : (editingRole ? 'Simpan Perubahan' : 'Buat Role Baru')}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Hapus / Nonaktifkan */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl border border-slate-200 animate-fade-in">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-rose-50 border border-rose-100">
                <RoleIcon name="alert" className="h-5 w-5 text-rose-600" />
              </div>
              <div>
                <h3 className="text-base font-extrabold text-slate-900">
                  {deleteTarget.total_penggunaan > 0 ? 'Nonaktifkan Master Role' : 'Hapus Master Role'}
                </h3>
                <p className="text-xs text-slate-500">Konfirmasi tindakan keamanan</p>
              </div>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed mt-2">
              {deleteTarget.total_penggunaan > 0 ? (
                <>
                  Role <strong>{deleteTarget.nama_role}</strong> saat ini sedang digunakan dalam{' '}
                  <strong className="text-blue-700">{deleteTarget.total_penggunaan} blueprint proyek</strong>. Role tidak akan dihapus permanen melainkan dinonaktifkan (soft delete) agar riwayat proyek dan penggajian masa lalu tetap aman.
                </>
              ) : (
                <>
                  Apakah Anda yakin ingin menghapus role <strong>{deleteTarget.nama_role}</strong>? Role ini belum pernah digunakan pada proyek mana pun sehingga akan dihapus permanen.
                </>
              )}
            </p>

            <div className="mt-6 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-bold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-5 py-2 text-xs sm:text-sm font-bold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500 disabled:opacity-50 transition cursor-pointer active:scale-95"
              >
                <span>{submitting ? 'Memproses...' : (deleteTarget.total_penggunaan > 0 ? 'Nonaktifkan Role' : 'Hapus Permanen')}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
