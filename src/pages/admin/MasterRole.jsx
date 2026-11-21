import { useEffect, useMemo, useState } from 'react'
import {
  getMasterRoles,
  createMasterRole,
  updateMasterRole,
  deleteMasterRole
} from '../../services/masterRoleApi.js'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
  }).format(Number(val) || 0)
}

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
  if (lvl === 1) return { bg: 'bg-slate-100 text-slate-700 ring-slate-200', label: 'Level 1 (Entry/Helper)' }
  if (lvl === 2) return { bg: 'bg-blue-50 text-blue-700 ring-blue-200', label: 'Level 2 (Staf/Teknisi)' }
  if (lvl === 3) return { bg: 'bg-emerald-50 text-emerald-700 ring-emerald-200', label: 'Level 3 (Senior/Spv)' }
  if (lvl === 4) return { bg: 'bg-purple-50 text-purple-700 ring-purple-200', label: 'Level 4 (Manajer)' }
  return { bg: 'bg-amber-50 text-amber-800 ring-amber-300', label: `Level ${lvl} (Eksekutif/Direktur)` }
}

export default function MasterRole() {
  const [roles, setRoles] = useState([])
  const [loading, setLoading] = useState(true)
  const [errorNotice, setErrorNotice] = useState('')
  const [successNotice, setSuccessNotice] = useState('')
  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('semua') // semua, aktif, nonaktif

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
    default_gaji_min_bulanan: '',
    default_gaji_max_bulanan: '',
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

  const filteredRoles = useMemo(() => {
    return roles.filter(r => {
      const matchSearch = r.nama_role.toLowerCase().includes(search.toLowerCase()) ||
        (r.deskripsi && r.deskripsi.toLowerCase().includes(search.toLowerCase()))
      const matchStatus = filterStatus === 'semua' ? true :
        filterStatus === 'aktif' ? r.is_active : !r.is_active
      return matchSearch && matchStatus
    })
  }, [roles, search, filterStatus])

  const openCreateModal = () => {
    setEditingRole(null)
    setFormData({
      nama_role: '',
      hierarchy_level: roles.length > 0 ? Math.max(...roles.map(r => r.hierarchy_level)) + 1 : 1,
      default_gaji_min_bulanan: '',
      default_gaji_max_bulanan: '',
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
      default_gaji_min_bulanan: role.default_gaji_min_bulanan,
      default_gaji_max_bulanan: role.default_gaji_max_bulanan,
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
      const minVal = parseFloat(formData.default_gaji_min_bulanan)
      const maxVal = parseFloat(formData.default_gaji_max_bulanan)

      if (isNaN(minVal) || minVal <= 0) {
        throw new Error('Gaji minimal harus lebih dari 0')
      }
      if (isNaN(maxVal) || maxVal <= minVal) {
        throw new Error('Gaji maksimal harus lebih besar dari gaji minimal')
      }

      const payload = {
        nama_role: formData.nama_role.trim(),
        hierarchy_level: parseInt(formData.hierarchy_level, 10),
        default_gaji_min_bulanan: minVal,
        default_gaji_max_bulanan: maxVal,
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
      setErrorNotice(err.message || 'Gagal menghapus role')
    } finally {
      setSubmitting(false)
    }
  }

  // Live conversion calculations for preview
  const liveMin = parseFloat(formData.default_gaji_min_bulanan) || 0
  const liveMax = parseFloat(formData.default_gaji_max_bulanan) || 0
  const dailyMin = Math.round(liveMin / 22)
  const dailyMax = Math.round(liveMax / 22)
  const hourlyMin = Math.round(liveMin / 173)
  const hourlyMax = Math.round(liveMax / 173)

  return (
    <div className="space-y-6">
      {/* Banner / Header Halaman */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-slate-900 via-blue-950 to-slate-900 p-6 text-white shadow-xl">
        <div className="relative z-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 rounded-lg bg-blue-500/20 px-3 py-1 text-xs font-semibold text-blue-300 ring-1 ring-blue-400/30">
              <RoleIcon name="layers" className="h-3.5 w-3.5" />
              <span>Fase 1: Fondasi Blueprint Role & Hierarki</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
              Master Role &amp; Hierarki Jabatan
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Atur urutan hierarki pangkat, batas rentang gaji bulanan (Min–Max), serta standar referensi biaya tenaga kerja di tingkat perusahaan.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-blue-600/30 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 transition cursor-pointer"
          >
            <RoleIcon name="plus" className="h-4 w-4" />
            <span>Tambah Role Baru</span>
          </button>
        </div>
      </div>

      {/* Notifikasi Global */}
      {successNotice && (
        <div className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-fade-in">
          <RoleIcon name="check" className="h-5 w-5 text-emerald-600 shrink-0" />
          <span>{successNotice}</span>
        </div>
      )}
      {errorNotice && (
        <div className="flex items-center gap-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-800 shadow-sm animate-fade-in">
          <RoleIcon name="alert" className="h-5 w-5 text-rose-600 shrink-0" />
          <span>{errorNotice}</span>
        </div>
      )}

      {/* Filter & Kontrol Pencarian */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div className="relative flex-1 max-w-md">
          <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 pointer-events-none text-slate-400">
            <RoleIcon name="search" className="h-4 w-4" />
          </span>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Cari nama role atau deskripsi..."
            className="w-full rounded-xl border border-slate-200 bg-slate-50/50 pl-10 pr-4 py-2 text-xs sm:text-sm text-slate-800 placeholder-slate-400 focus:bg-white focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500">Status:</span>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm font-medium text-slate-700 outline-none focus:border-blue-500 transition cursor-pointer"
          >
            <option value="semua">Semua Role</option>
            <option value="aktif">Hanya Aktif</option>
            <option value="nonaktif">Hanya Nonaktif</option>
          </select>
        </div>
      </div>

      {/* Tabel Master Role */}
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs sm:text-sm">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-bold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3.5 text-center w-20">Level</th>
                <th className="px-5 py-3.5">Nama Role / Jabatan</th>
                <th className="px-4 py-3.5">Rentang Gaji Bulanan</th>
                <th className="px-4 py-3.5">Estimasi Harian (÷22)</th>
                <th className="px-4 py-3.5">Estimasi Jam (÷173)</th>
                <th className="px-4 py-3.5 text-center">Digunakan</th>
                <th className="px-4 py-3.5 text-center">Status</th>
                <th className="px-4 py-3.5 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-400 font-medium">
                    Memuat data master role...
                  </td>
                </tr>
              ) : filteredRoles.length === 0 ? (
                <tr>
                  <td colSpan="8" className="p-8 text-center text-slate-500">
                    {search ? 'Tidak ada role yang cocok dengan pencarian.' : 'Belum ada data master role yang terdaftar. Klik tombol "Tambah Role Baru" di atas.'}
                  </td>
                </tr>
              ) : (
                filteredRoles.map((role) => {
                  const badge = getHierarchyBadge(role.hierarchy_level)
                  const daily1 = Math.round(role.default_gaji_min_bulanan / 22)
                  const daily2 = Math.round(role.default_gaji_max_bulanan / 22)
                  const hourly1 = Math.round(role.default_gaji_min_bulanan / 173)
                  const hourly2 = Math.round(role.default_gaji_max_bulanan / 173)

                  return (
                    <tr
                      key={role.id_role}
                      className={`hover:bg-slate-50/70 transition-colors ${!role.is_active ? 'bg-slate-50/40 opacity-75' : ''}`}
                    >
                      {/* Level Hierarki */}
                      <td className="px-4 py-4 text-center">
                        <span className={`inline-flex items-center justify-center rounded-lg px-2.5 py-1 text-xs font-bold ring-1 ring-inset ${badge.bg}`}>
                          Lvl {role.hierarchy_level}
                        </span>
                      </td>

                      {/* Nama Role & Deskripsi */}
                      <td className="px-5 py-4">
                        <div className="font-bold text-slate-900 text-sm">
                          {role.nama_role}
                        </div>
                        {role.deskripsi ? (
                          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{role.deskripsi}</p>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Tanpa keterangan tambahan</span>
                        )}
                      </td>

                      {/* Rentang Gaji Bulanan */}
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {formatRupiah(role.default_gaji_min_bulanan)}
                        </div>
                        <div className="text-xs text-slate-500">
                          s/d {formatRupiah(role.default_gaji_max_bulanan)}
                        </div>
                      </td>

                      {/* Estimasi Harian */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600 text-xs">
                        <div>{formatRupiah(daily1)}</div>
                        <div className="text-slate-400">s/d {formatRupiah(daily2)}</div>
                      </td>

                      {/* Estimasi Jam */}
                      <td className="px-4 py-4 whitespace-nowrap text-slate-600 text-xs">
                        <div>{formatRupiah(hourly1)} / jam</div>
                        <div className="text-slate-400">s/d {formatRupiah(hourly2)} / jam</div>
                      </td>

                      {/* Penggunaan Blueprint */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {role.total_penggunaan > 0 ? (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[11px] font-semibold text-blue-700 ring-1 ring-blue-600/20">
                            {role.total_penggunaan} Proyek
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">0 Proyek</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4 text-center whitespace-nowrap">
                        {role.is_active ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-slate-300">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="px-4 py-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openEditModal(role)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 hover:text-blue-600 transition cursor-pointer"
                          >
                            <RoleIcon name="edit" className="h-3.5 w-3.5" />
                            <span>Edit</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTarget(role)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-semibold text-rose-600 shadow-2xs hover:bg-rose-50 hover:border-rose-200 transition cursor-pointer"
                          >
                            <RoleIcon name="trash" className="h-3.5 w-3.5" />
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

      {/* Modal Tambah / Edit Role */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl border border-slate-200 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2.5">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <RoleIcon name="hierarchy" className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    {editingRole ? 'Edit Master Role' : 'Tambah Master Role Baru'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    {editingRole ? `Perbarui batas gaji & parameter role #${editingRole.id_role}` : 'Tentukan level hierarki dan batas rentang gaji default'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition cursor-pointer"
              >
                <RoleIcon name="close" className="h-5 w-5" />
              </button>
            </div>

            {formError && (
              <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs font-medium text-rose-800">
                <RoleIcon name="alert" className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleSubmitForm} className="mt-4 space-y-4">
              {/* Nama Role */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Nama Role / Jabatan <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.nama_role}
                  onChange={(e) => setFormData({ ...formData, nama_role: e.target.value })}
                  placeholder="Contoh: Senior Project Manager, Teknisi Listrik, Helper"
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                />
              </div>

              {/* Hierarchy Level */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Level Hierarki (Urutan Pangkat) <span className="text-rose-500">*</span>
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    min="1"
                    max="99"
                    required
                    value={formData.hierarchy_level}
                    onChange={(e) => setFormData({ ...formData, hierarchy_level: e.target.value })}
                    className="w-28 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-bold text-slate-900 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                  />
                  <div className="text-xs text-slate-500">
                    <span className="font-semibold text-slate-700">1</span> = Terendah (Helper), makin tinggi angka = makin tinggi jabatan (Spv, Manajer, Direktur).
                  </div>
                </div>
              </div>

              {/* Rentang Gaji Min & Max */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gaji Min Bulanan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10000"
                    required
                    value={formData.default_gaji_min_bulanan}
                    onChange={(e) => setFormData({ ...formData, default_gaji_min_bulanan: e.target.value })}
                    placeholder="Contoh: 3500000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Gaji Max Bulanan (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="number"
                    min="1"
                    step="10000"
                    required
                    value={formData.default_gaji_max_bulanan}
                    onChange={(e) => setFormData({ ...formData, default_gaji_max_bulanan: e.target.value })}
                    placeholder="Contoh: 5000000"
                    className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                  />
                </div>
              </div>

              {/* Live Preview Konversi Standar Kerja */}
              {(liveMin > 0 || liveMax > 0) && (
                <div className="rounded-xl border border-blue-100 bg-blue-50/60 p-3.5 space-y-2">
                  <div className="flex items-center justify-between text-xs font-bold text-blue-900">
                    <span>💡 Live Preview Konversi Standar Kerja:</span>
                    <span className="text-[11px] font-normal text-blue-700">Basis Standar Depnaker</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="rounded-lg bg-white p-2 border border-blue-100/80">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Estimasi Harian (÷ 22 Hari)</div>
                      <div className="font-bold text-slate-900 text-xs mt-0.5">
                        {formatRupiah(dailyMin)} – {formatRupiah(dailyMax)}
                      </div>
                    </div>
                    <div className="rounded-lg bg-white p-2 border border-blue-100/80">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Estimasi Jam (÷ 173 Jam)</div>
                      <div className="font-bold text-slate-900 text-xs mt-0.5">
                        {formatRupiah(hourlyMin)} – {formatRupiah(hourlyMax)}
                      </div>
                    </div>
                  </div>
                  <p className="text-[10px] leading-relaxed text-blue-800">
                    * Catatan: Angka harian (÷22) & per jam (÷173) di atas adalah estimasi standar Depnaker/referensi. Angka final pada proyek nanti dihitung presisi mengikuti standar kalender kerja masing-masing proyek.
                  </p>
                </div>
              )}

              {/* Deskripsi */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Deskripsi / Kualifikasi (Opsional)
                </label>
                <textarea
                  rows="2"
                  value={formData.deskripsi}
                  onChange={(e) => setFormData({ ...formData, deskripsi: e.target.value })}
                  placeholder="Kualifikasi keahlian, tugas umum, atau kriteria jabatan..."
                  className="w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs sm:text-sm text-slate-900 placeholder-slate-400 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition outline-none"
                />
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
                  <label htmlFor="is_active_toggle" className="text-xs font-semibold text-slate-700 cursor-pointer">
                    Role Berstatus Aktif (Dapat dipilih saat membuat blueprint proyek)
                  </label>
                </div>
              )}

              {/* Tombol Aksi */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-5 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-blue-600/20 hover:bg-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-400 disabled:opacity-50 transition cursor-pointer"
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
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl border border-slate-200">
            <div className="flex items-center gap-3 text-rose-600 mb-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-50">
                <RoleIcon name="alert" className="h-5 w-5 text-rose-600" />
              </div>
              <h3 className="text-base font-bold text-slate-900">
                {deleteTarget.total_penggunaan > 0 ? 'Konfirmasi Nonaktifkan Role' : 'Konfirmasi Hapus Role'}
              </h3>
            </div>

            <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
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

            <div className="mt-5 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs sm:text-sm font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={submitting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs sm:text-sm font-semibold text-white shadow-md shadow-rose-600/20 hover:bg-rose-500 disabled:opacity-50 transition cursor-pointer"
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
