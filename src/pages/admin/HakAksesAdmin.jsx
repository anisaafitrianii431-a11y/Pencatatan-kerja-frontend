import { useEffect, useMemo, useState } from 'react'
import {
  ShieldCheck,
  Save,
  RotateCcw,
  Plus,
  Trash2,
  Search,
  User,
  Users,
  CheckCircle2,
  X,
  Sliders,
  AlertCircle,
  Shield,
  ChevronRight,
  Sparkles
} from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api.js'
import { getUsers, createUser, updateUserRole } from '../../services/userApi.js'
import { useAuth } from '../../auth/useAuth.js'
import AvatarAdmin from '../../components/AvatarAdmin.jsx'

const actions = [
  { key: 'can_create', label: 'Create' },
  { key: 'can_read', label: 'Read' },
  { key: 'can_update', label: 'Update' },
  { key: 'can_delete', label: 'Delete' },
]

function getRoleBadgeClass(roleName) {
  switch (String(roleName || '').toLowerCase()) {
    case 'super_admin':
      return 'bg-purple-100 text-purple-800 border-purple-200'
    case 'admin':
      return 'bg-blue-100 text-blue-800 border-blue-200'
    case 'karyawan':
      return 'bg-emerald-100 text-emerald-800 border-emerald-200'
    case 'bendahara':
      return 'bg-amber-100 text-amber-800 border-amber-200'
    default:
      return 'bg-violet-100 text-violet-800 border-violet-200'
  }
}

export default function HakAksesAdmin() {
  const { user: authUser, refreshUser } = useAuth()
  const isSuperAdmin = authUser?.peran === 'super_admin' || authUser?.role === 'super_admin'

  // Data State
  const [resources, setResources] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [savedPermissions, setSavedPermissions] = useState([])
  const [users, setUsers] = useState([])

  // UI State
  const [activeTab, setActiveTab] = useState('users') // 'users' | 'matrix'
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  // Search & Filter State
  const [searchName, setSearchName] = useState('')
  const [filterRole, setFilterRole] = useState('semua')

  // Modals State
  const [selectedUser, setSelectedUser] = useState(null)
  const [isCreateUserModalOpen, setIsCreateUserModalOpen] = useState(false)

  // New Role Form State (Tab Matrix)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [roleBusy, setRoleBusy] = useState(false)

  // New User Form State (Modal)
  const [newUserForm, setNewUserForm] = useState({
    username: '',
    email: '',
    password: '',
    peran: 'karyawan',
    aktif: 1
  })
  const [creatingUser, setCreatingUser] = useState(false)
  const [createUserError, setCreateUserError] = useState('')

  // User CRUD Modal State
  const [selectedUserRole, setSelectedUserRole] = useState('')
  const [savingUserCrud, setSavingUserCrud] = useState(false)
  const [userModalNotice, setUserModalNotice] = useState('')
  const [userModalError, setUserModalError] = useState('')

  const hasChanges = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(savedPermissions),
    [permissions, savedPermissions],
  )

  // Memuat data hak akses dan daftar pengguna
  async function loadData() {
    setLoading(true)
    setError('')
    try {
      const [permData, userData] = await Promise.all([
        apiGet('/role-permissions'),
        getUsers().catch(() => [])
      ])

      const roleDetails = Array.isArray(permData.roleDetails) && permData.roleDetails.length
        ? permData.roleDetails
        : (permData.roles || ['admin', 'karyawan']).map((role) => ({
          role_name: role,
          display_name: role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Karyawan' : role,
          description: '',
          is_system: 1,
        }))

      const rows = (permData.permissions || []).map((item) => ({
        ...item,
        can_create: Number(item.can_create) === 1,
        can_read: Number(item.can_read) === 1,
        can_update: Number(item.can_update) === 1,
        can_delete: Number(item.can_delete) === 1,
      }))

      setResources(permData.resources || [])
      setRoles(roleDetails)
      setPermissions(rows)
      setSavedPermissions(rows)
      setUsers(userData)
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat matriks hak akses dan pengguna.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  // Filter Pengguna berdasarkan pencarian Nama / Username / Kode dan Role
  const filteredUsers = useMemo(() => {
    const q = searchName.trim().toLowerCase()
    return users.filter((u) => {
      const matchName = !q ||
        String(u.nama || '').toLowerCase().includes(q) ||
        String(u.username || '').toLowerCase().includes(q) ||
        String(u.email || '').toLowerCase().includes(q) ||
        String(u.kode_user || '').toLowerCase().includes(q) ||
        String(u.kode_karyawan || '').toLowerCase().includes(q)

      const matchRole = filterRole === 'semua' || String(u.peran || '').toLowerCase() === filterRole.toLowerCase()
      return matchName && matchRole
    })
  }, [users, searchName, filterRole])

  // Toggle izin pada state permissions
  function togglePermission(role, resource, action) {
    setPermissions((current) => current.map((item) =>
      item.role_name === role && item.resource_key === resource
        ? { ...item, [action]: !item[action] }
        : item,
    ))
    setNotice('')
  }

  // Simpan perubahan matriks hak akses secara keseluruhan
  async function saveAllPermissions(customPerms = null) {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      const payload = customPerms || permissions
      await apiPut('/role-permissions', { permissions: payload })
      await loadData()
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setNotice('Hak akses berhasil disimpan.')
      return true
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan hak akses.')
      return false
    } finally {
      setSaving(false)
    }
  }

  // Buat role baru
  async function createRole(event) {
    event.preventDefault()
    if (!newRoleName.trim()) return
    setRoleBusy(true)
    setError('')
    setNotice('')
    try {
      await apiPost('/role-permissions/roles', {
        display_name: newRoleName.trim(),
        description: newRoleDescription.trim(),
      })
      setNewRoleName('')
      setNewRoleDescription('')
      await loadData()
      setNotice('Role baru berhasil dibuat. Atur hak aksesnya lalu simpan perubahan.')
    } catch (createError) {
      setError(createError.message || 'Gagal membuat role baru.')
    } finally {
      setRoleBusy(false)
    }
  }

  // Hapus role kustom
  async function deleteRole(role) {
    if (!window.confirm(`Hapus role ${role.display_name}? Role hanya dapat dihapus jika belum dipakai akun.`)) return
    setRoleBusy(true)
    setError('')
    setNotice('')
    try {
      await apiDelete(`/role-permissions/roles/${encodeURIComponent(role.role_name)}`)
      await loadData()
      setNotice(`Role ${role.display_name} berhasil dihapus.`)
    } catch (deleteError) {
      setError(deleteError.message || 'Gagal menghapus role.')
    } finally {
      setRoleBusy(false)
    }
  }

  // Handler saat user mengklik nama salah satu pengguna
  function handleSelectUser(user) {
    setSelectedUser(user)
    setSelectedUserRole(user.peran || 'karyawan')
    setUserModalNotice('')
    setUserModalError('')
  }

  // Handler simpan role pengguna yang diubah dari modal user
  async function handleUpdateSelectedUserRole(newRole) {
    if (!selectedUser || selectedUser.peran === newRole) return
    if (selectedUser.peran === 'super_admin') {
      setUserModalError('Peran Super Admin tidak dapat diubah.')
      return
    }

    setSavingUserCrud(true)
    setUserModalError('')
    setUserModalNotice('')
    try {
      await updateUserRole(selectedUser.id_user, newRole)
      setSelectedUserRole(newRole)
      setSelectedUser((prev) => ({ ...prev, peran: newRole }))
      setUsers((prev) => prev.map((u) => u.id_user === selectedUser.id_user ? { ...u, peran: newRole } : u))
      setUserModalNotice(`Peran pengguna berhasil diubah menjadi ${newRole}.`)
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
    } catch (err) {
      setUserModalError(err.message || 'Gagal memperbarui peran pengguna.')
    } finally {
      setSavingUserCrud(false)
    }
  }

  // Set Semua Checkbox CRUD untuk role pengguna yang aktif
  function setAllCrudForRole(targetRole, value) {
    setPermissions((current) => current.map((item) => {
      if (item.role_name === targetRole) {
        return {
          ...item,
          can_create: value,
          can_read: value,
          can_update: value,
          can_delete: value,
        }
      }
      return item
    }))
  }

  // Simpan CRUD khusus dari dalam Modal User
  async function handleSaveUserCrudModal() {
    setSavingUserCrud(true)
    setUserModalError('')
    setUserModalNotice('')
    try {
      await apiPut('/role-permissions', { permissions })
      await loadData()
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setUserModalNotice('Pengaturan CRUD hak akses berhasil disimpan.')
    } catch (err) {
      setUserModalError(err.message || 'Gagal menyimpan pengaturan CRUD.')
    } finally {
      setSavingUserCrud(false)
    }
  }

  // Jadikan Role Khusus untuk User ini (Custom Role per user)
  async function handleCreateDedicatedRoleForUser() {
    if (!selectedUser) return
    const customRoleName = `role_${selectedUser.username || selectedUser.id_user}`.toLowerCase().replace(/[^a-z0-9_]/g, '')
    const displayName = `Khusus: ${selectedUser.nama || selectedUser.username}`

    setSavingUserCrud(true)
    setUserModalError('')
    setUserModalNotice('')
    try {
      // 1. Buat role kustom
      await apiPost('/role-permissions/roles', {
        role_name: customRoleName,
        display_name: displayName,
        description: `Hak akses kustom khusus untuk ${selectedUser.nama || selectedUser.username}`,
      })

      // 2. Pasangkan ke user
      await updateUserRole(selectedUser.id_user, customRoleName)

      // 3. Muat ulang dan set state
      await loadData()
      setSelectedUserRole(customRoleName)
      setSelectedUser((prev) => ({ ...prev, peran: customRoleName }))
      setUserModalNotice(`Hak akses kustom "${displayName}" berhasil dibuat dan ditetapkan untuk user ini!`)
    } catch (err) {
      setUserModalError(err.message || 'Gagal membuat peran kustom untuk pengguna.')
    } finally {
      setSavingUserCrud(false)
    }
  }

  // Buat Akun Pengguna Baru
  async function handleCreateNewUser(e) {
    e.preventDefault()
    setCreateUserError('')
    if (!newUserForm.username.trim() || !newUserForm.email.trim() || newUserForm.password.length < 6) {
      setCreateUserError('Lengkapi username, email valid, dan kata sandi minimal 6 karakter.')
      return
    }

    setCreatingUser(true)
    try {
      const created = await createUser({
        username: newUserForm.username.trim(),
        email: newUserForm.email.trim().toLowerCase(),
        password: newUserForm.password,
        peran: newUserForm.peran,
        aktif: newUserForm.aktif ? 1 : 0
      })

      setUsers((prev) => [created, ...prev])
      setIsCreateUserModalOpen(false)
      setNewUserForm({
        username: '',
        email: '',
        password: '',
        peran: 'karyawan',
        aktif: 1
      })
      setNotice(`Akun pengguna ${created.username} (${created.email}) berhasil dibuat! Anda dapat langsung mengatur hak aksesnya.`)
      // Otomatis pilih akun baru untuk langsung diset CRUD-nya
      handleSelectUser(created)
    } catch (err) {
      setCreateUserError(err.message || 'Gagal membuat akun pengguna.')
    } finally {
      setCreatingUser(false)
    }
  }

  // Guard: Hanya Super Admin
  if (!isSuperAdmin) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-6 text-center text-rose-800 shadow-sm">
        <ShieldCheck className="mx-auto h-12 w-12 text-rose-600 mb-3" />
        <h2 className="text-lg font-bold">Akses Dibatasi</h2>
        <p className="mt-1 text-sm text-rose-700">
          Halaman Pengaturan Hak Akses dan Pengaturan Akun ini khusus disediakan untuk <strong>Super Admin</strong>.
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6 pb-12">
      {/* ================================================================ */}
      {/* 1. HEADER HALAMAN KHUSUS SUPER ADMIN                             */}
      {/* ================================================================ */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-900 via-indigo-900 to-slate-900 p-6 text-white shadow-lg shadow-violet-950/20">
        <div className="absolute right-0 top-0 -mr-16 -mt-16 h-64 w-64 rounded-full bg-violet-500/10 blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 right-1/4 -mb-12 h-40 w-40 rounded-full bg-indigo-400/10 blur-2xl pointer-events-none" />

        <div className="relative z-10 flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 rounded-full border border-violet-400/30 bg-violet-500/20 px-3 py-1 text-xs font-semibold text-violet-200 backdrop-blur-md">
              <ShieldCheck className="h-3.5 w-3.5 text-violet-300" />
              <span>KHUSUS SUPER ADMIN • KONTROL AKSES &amp; PENGGUNA</span>
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">
              Pengaturan Hak Akses &amp; Akun
            </h1>
            <p className="max-w-2xl text-xs sm:text-sm text-violet-100/90 leading-relaxed">
              Atur izin CRUD (Create, Read, Update, Delete) untuk setiap user, kelola peran sistem, serta tambahkan akun pengguna baru secara terpusat.
            </p>
          </div>

          {/* Quick Action Toolbar */}
          <div className="flex shrink-0 flex-wrap items-center gap-2.5">
            <button
              type="button"
              onClick={() => setIsCreateUserModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2.5 text-xs font-bold text-white shadow-sm transition hover:bg-violet-400 sm:text-sm cursor-pointer"
            >
              <Plus className="h-4 w-4" />
              <span>Tambah Akun Baru</span>
            </button>

            <button
              type="button"
              onClick={loadData}
              disabled={loading || saving}
              className="inline-flex items-center gap-2 rounded-xl border border-white/25 bg-white/10 px-4 py-2.5 text-xs font-semibold text-white backdrop-blur-sm transition hover:bg-white/20 sm:text-sm cursor-pointer disabled:opacity-50"
            >
              <RotateCcw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
              <span>Muat Ulang</span>
            </button>
          </div>
        </div>
      </section>

      {/* NOTIFIKASI SUKSES / ERROR */}
      {notice && (
        <div role="status" className="flex items-center gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800 shadow-xs">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-600" />
          <span className="font-medium">{notice}</span>
          <button type="button" onClick={() => setNotice('')} className="ml-auto text-emerald-600 hover:text-emerald-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <div role="alert" className="flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800 shadow-xs">
          <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
          <span className="font-medium">{error}</span>
          <button type="button" onClick={() => setError('')} className="ml-auto text-rose-600 hover:text-rose-800">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* ================================================================ */}
      {/* 2. TAB NAVIGASI: HAK AKSES PER PENGGUNA VS MATRIKS PERAN          */}
      {/* ================================================================ */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setActiveTab('users')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-violet-700 text-white shadow-sm shadow-violet-700/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <User className="h-4 w-4" />
            <span>Hak Akses Per Pengguna ({users.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('matrix')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'matrix'
                ? 'bg-violet-700 text-white shadow-sm shadow-violet-700/25'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
            }`}
          >
            <Sliders className="h-4 w-4" />
            <span>Matriks Peran Global ({roles.length} Role)</span>
          </button>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          {activeTab === 'users'
            ? 'Klik nama pengguna untuk langsung mengatur hak akses CRUD.'
            : 'Kelola template peran sistem dan peran kustom secara horizontal.'}
        </div>
      </div>

      {/* ================================================================ */}
      {/* TAB 1: DAFTAR PENGGUNA & FILTER NAMA                             */}
      {/* ================================================================ */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* FILTER TOOLBAR DENGAN PENCARIAN NAMA */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              {/* Input Cari Nama */}
              <div className="relative flex-1">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  value={searchName}
                  onChange={(e) => setSearchName(e.target.value)}
                  placeholder="Ketik nama karyawan, username, atau email untuk mencari..."
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/70 pl-10 pr-4 py-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-violet-500 focus:bg-white focus:ring-2 focus:ring-violet-500/10"
                />
                {searchName && (
                  <button
                    type="button"
                    onClick={() => setSearchName('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Filter Role */}
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-500 whitespace-nowrap">Filter Peran:</span>
                <select
                  value={filterRole}
                  onChange={(e) => setFilterRole(e.target.value)}
                  className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 outline-none transition focus:border-violet-500 focus:bg-white"
                >
                  <option value="semua">Semua Peran</option>
                  <option value="super_admin">Super Admin</option>
                  <option value="admin">Admin</option>
                  <option value="karyawan">Karyawan</option>
                  {roles.filter((r) => !['admin', 'karyawan', 'super_admin'].includes(r.role_name)).map((r) => (
                    <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
                  ))}
                </select>

                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700 border border-violet-200 hover:bg-violet-100 transition whitespace-nowrap"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>Akun Baru</span>
                </button>
              </div>
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
              <span>Menampilkan <strong>{filteredUsers.length}</strong> dari <strong>{users.length}</strong> pengguna</span>
              <span className="text-violet-600 font-semibold">💡 Klik nama pengguna untuk membuka kontrol CRUD tanpa scroll</span>
            </div>
          </div>

          {/* GRID KARTU PENGGUNA */}
          {loading ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-12 text-center text-slate-500">
              <RotateCcw className="mx-auto h-6 w-6 animate-spin text-violet-600 mb-2" />
              <span>Memuat data pengguna...</span>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-12 text-center text-slate-500">
              <Users className="mx-auto h-8 w-8 text-slate-400 mb-2" />
              <p className="font-semibold text-slate-700">Tidak ada pengguna yang cocok dengan pencarian "{searchName}"</p>
              <button
                type="button"
                onClick={() => { setSearchName(''); setFilterRole('semua') }}
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-violet-600 hover:underline"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {filteredUsers.map((u) => (
                <div
                  key={u.id_user}
                  onClick={() => handleSelectUser(u)}
                  className="group relative flex flex-col justify-between rounded-2xl border border-slate-200/90 bg-white p-4 shadow-2xs transition-all hover:border-violet-300 hover:shadow-md hover:bg-violet-50/20 cursor-pointer"
                >
                    <div className="flex items-start gap-3">
                      <AvatarAdmin name={u.nama || u.username} className="h-11 w-11 text-xs font-bold" />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-1">
                          <h3 className="text-sm font-bold text-slate-900 group-hover:text-violet-700 transition truncate">
                            {u.nama || u.username || 'Tanpa Nama'}
                          </h3>
                        </div>

                        <p className="text-xs text-slate-500 truncate mt-0.5">
                          ID: <strong className="font-mono text-slate-700">{u.kode_user || `USR${u.id_user}`}</strong>
                          {u.username && <span className="ml-2 text-slate-400">(@{u.username})</span>}
                        </p>

                        <p className="text-[11px] text-slate-400 truncate mt-0.5">
                          {u.email || 'Tanpa Email'}
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                      <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${getRoleBadgeClass(u.peran)}`}>
                        <Shield className="h-3 w-3" />
                        {u.peran === 'super_admin' ? 'Super Admin' : u.peran}
                      </span>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation()
                          handleSelectUser(u)
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 group-hover:underline"
                      >
                        <span>Atur CRUD</span>
                        <ChevronRight className="h-3.5 w-3.5 transition group-hover:translate-x-0.5" />
                      </button>
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>
      )}

      {/* ================================================================ */}
      {/* TAB 2: MATRIKS PERAN GLOBAL & TAMBAH ROLE                         */}
      {/* ================================================================ */}
      {activeTab === 'matrix' && (
        <div className="space-y-6">
          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">Matriks Hak Akses Seluruh Role</h2>
                <p className="text-xs text-slate-500">
                  Ubah izin modul per peran sistem atau tambahkan peran kustom baru.
                </p>
              </div>

              <button
                type="button"
                onClick={() => saveAllPermissions()}
                disabled={!hasChanges || loading || saving}
                className="inline-flex items-center gap-2 rounded-xl bg-violet-700 px-4 py-2 text-xs sm:text-sm font-bold text-white shadow-sm hover:bg-violet-800 transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Save className="h-4 w-4" />
                <span>{saving ? 'Menyimpan...' : 'Simpan Perubahan Matriks'}</span>
              </button>
            </div>

            {/* FORM TAMBAH ROLE BARU */}
            <form onSubmit={createRole} className="grid gap-2.5 rounded-xl border border-violet-100 bg-violet-50/50 p-3 sm:grid-cols-[1fr_1.5fr_auto]">
              <input
                value={newRoleName}
                onChange={(event) => setNewRoleName(event.target.value)}
                placeholder="Nama role baru (contoh: Supervisor, Mandor)"
                aria-label="Nama role baru"
                maxLength={100}
                required
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-violet-500"
              />
              <input
                value={newRoleDescription}
                onChange={(event) => setNewRoleDescription(event.target.value)}
                placeholder="Deskripsi tugas role (opsional)"
                aria-label="Deskripsi role"
                maxLength={255}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs sm:text-sm outline-none focus:border-violet-500"
              />
              <button
                type="submit"
                disabled={roleBusy || !newRoleName.trim()}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-xs sm:text-sm font-bold text-white hover:bg-violet-800 disabled:opacity-50 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                <span>Tambah Role</span>
              </button>
            </form>

            {/* TABEL MATRIKS HORIZONTAL */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full min-w-[820px] border-collapse text-sm">
                <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="px-5 py-4">Modul Sistem</th>
                    {roles.map((role) => (
                      <th key={role.role_name} className="min-w-56 px-5 py-4">
                        <div className="flex items-center justify-between">
                          <span>{role.display_name}</span>
                          {!Number(role.is_system) && (
                            <button
                              type="button"
                              onClick={() => deleteRole(role)}
                              disabled={roleBusy}
                              title={`Hapus role ${role.display_name}`}
                              aria-label={`Hapus role ${role.display_name}`}
                              className="inline-flex rounded p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-50"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {resources.map((resource) => (
                    <tr key={resource.key} className="align-top hover:bg-slate-50/60">
                      <th scope="row" className="whitespace-nowrap px-5 py-4 text-left font-semibold text-slate-800">
                        {resource.label}
                      </th>
                      {roles.map((role) => {
                        const permission = permissions.find((item) => item.role_name === role.role_name && item.resource_key === resource.key)
                        return (
                          <td key={role.role_name} className="px-5 py-4">
                            <div className="flex flex-wrap gap-x-4 gap-y-2">
                              {actions.map(({ key, label: actionLabel }) => (
                                <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(permission?.[key])}
                                    onChange={() => togglePermission(role.role_name, resource.key, key)}
                                    aria-label={`${role.display_name} ${actionLabel} ${resource.label}`}
                                    className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
                                  />
                                  <span>{actionLabel}</span>
                                </label>
                              ))}
                            </div>
                          </td>
                        )
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {/* ================================================================ */}
      {/* 3. MODAL DIALOG PENGATURAN CRUD SAAT NAMA USER DI-KLIK           */}
      {/*    (LANGSUNG MUNCUL TANPA PERLU SCROLL KE BAWAH)                  */}
      {/* ================================================================ */}
      {selectedUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs transition-all"
          onClick={(e) => {
            if (e.target === e.currentTarget && !savingUserCrud) setSelectedUser(null)
          }}
        >
          <div className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            {/* Header Modal */}
            <div className="flex items-start justify-between border-b border-slate-100 bg-gradient-to-r from-violet-900 to-indigo-900 p-5 text-white">
              <div className="flex items-center gap-3">
                <AvatarAdmin name={selectedUser.nama || selectedUser.username} className="h-12 w-12 text-sm font-bold bg-white/20 text-white ring-2 ring-white/30" />
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-white">
                      {selectedUser.nama || selectedUser.username}
                    </h2>
                    <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[10px] font-extrabold uppercase ${getRoleBadgeClass(selectedUserRole)}`}>
                      {selectedUserRole}
                    </span>
                  </div>
                  <p className="text-xs text-violet-200 mt-0.5">
                    ID: <strong className="font-mono">{selectedUser.kode_user || `USR${selectedUser.id_user}`}</strong> • {selectedUser.email || 'Tanpa Email'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                disabled={savingUserCrud}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition"
                title="Tutup dialog"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Content Modal */}
            <div className="p-5 max-h-[75vh] overflow-y-auto space-y-4">
              {/* Pesan Status Modal */}
              {userModalNotice && (
                <div className="flex items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                  <span>{userModalNotice}</span>
                </div>
              )}
              {userModalError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{userModalError}</span>
                </div>
              )}

              {/* Pemilih Peran Akun */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <label className="text-xs font-bold text-slate-800">Peran Pengguna Saat Ini</label>
                    <p className="text-[11px] text-slate-500">Izin CRUD di bawah ditentukan oleh peran yang aktif pada pengguna ini.</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={selectedUserRole}
                      onChange={(e) => handleUpdateSelectedUserRole(e.target.value)}
                      disabled={savingUserCrud || selectedUser.peran === 'super_admin'}
                      className="rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 shadow-2xs outline-none focus:border-violet-500"
                    >
                      <option value="karyawan">Karyawan</option>
                      <option value="admin">Admin</option>
                      {roles.filter((r) => !['admin', 'karyawan', 'super_admin'].includes(r.role_name)).map((r) => (
                        <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
                      ))}
                    </select>
                    {!selectedUserRole.startsWith('role_') && selectedUser.peran !== 'super_admin' && (
                      <button
                        type="button"
                        onClick={handleCreateDedicatedRoleForUser}
                        disabled={savingUserCrud}
                        className="inline-flex items-center gap-1 rounded-lg border border-violet-200 bg-violet-100 px-2.5 py-1.5 text-[11px] font-bold text-violet-800 hover:bg-violet-200 transition"
                        title="Buat peran khusus terpisah hanya untuk pengguna ini"
                      >
                        <Sparkles className="h-3 w-3 text-violet-600" />
                        <span>Jadikan Peran Khusus</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Peringatan jika Super Admin */}
              {selectedUser.peran === 'super_admin' ? (
                <div className="rounded-xl border border-purple-200 bg-purple-50 p-4 text-xs text-purple-900 flex items-start gap-3">
                  <ShieldCheck className="h-5 w-5 text-purple-700 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold">Akun Super Administrator</strong>
                    <span>Super Admin memiliki hak akses penuh otomatis (Full CRUD) ke seluruh modul sistem dan tidak dapat dibatasi.</span>
                  </div>
                </div>
              ) : (
                /* TABEL MATRIKS CRUD KHUSUS USER */
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Izin CRUD Per Modul ({selectedUserRole})
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAllCrudForRole(selectedUserRole, true)}
                        className="text-[11px] font-semibold text-violet-600 hover:underline"
                      >
                        Pilih Semua
                      </button>
                      <span className="text-slate-300">•</span>
                      <button
                        type="button"
                        onClick={() => setAllCrudForRole(selectedUserRole, false)}
                        className="text-[11px] font-semibold text-rose-600 hover:underline"
                      >
                        Kosongkan
                      </button>
                    </div>
                  </div>

                  <div className="rounded-xl border border-slate-200 overflow-hidden">
                    <table className="w-full text-xs">
                      <thead className="bg-slate-100 text-slate-600 font-bold border-b border-slate-200">
                        <tr>
                          <th className="px-4 py-2.5 text-left">Modul</th>
                          <th className="px-3 py-2.5 text-center">Create</th>
                          <th className="px-3 py-2.5 text-center">Read</th>
                          <th className="px-3 py-2.5 text-center">Update</th>
                          <th className="px-3 py-2.5 text-center">Delete</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {resources.map((res) => {
                          const perm = permissions.find((p) => p.role_name === selectedUserRole && p.resource_key === res.key)
                          return (
                            <tr key={res.key} className="hover:bg-slate-50/60">
                              <td className="px-4 py-2.5 font-semibold text-slate-800 whitespace-nowrap">
                                {res.label}
                              </td>
                              {actions.map(({ key }) => (
                                <td key={key} className="px-3 py-2.5 text-center">
                                  <input
                                    type="checkbox"
                                    checked={Boolean(perm?.[key])}
                                    onChange={() => togglePermission(selectedUserRole, res.key, key)}
                                    className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600 cursor-pointer"
                                  />
                                </td>
                              ))}
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Footer Modal */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5">
              <button
                type="button"
                onClick={() => setSelectedUser(null)}
                disabled={savingUserCrud}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Tutup
              </button>

              {selectedUser.peran !== 'super_admin' && (
                <button
                  type="button"
                  onClick={handleSaveUserCrudModal}
                  disabled={savingUserCrud}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-800 transition disabled:opacity-50 cursor-pointer"
                >
                  <Save className="h-4 w-4" />
                  <span>{savingUserCrud ? 'Menyimpan...' : 'Simpan Hak Akses'}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ================================================================ */}
      {/* 4. MODAL BUAT AKUN PENGGUNA BARU (SUPER ADMIN ONLY)              */}
      {/* ================================================================ */}
      {isCreateUserModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-slate-950/60 p-4 backdrop-blur-xs transition-all"
          onClick={(e) => {
            if (e.target === e.currentTarget && !creatingUser) setIsCreateUserModalOpen(false)
          }}
        >
          <div className="my-auto w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
            <div className="flex items-start justify-between border-b border-slate-100 bg-violet-900 p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/20 text-white">
                  <User className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white">Buat Akun Pengguna Baru</h2>
                  <p className="text-xs text-violet-200">Tambahkan akun login dan tetapkan hak aksesnya</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsCreateUserModalOpen(false)}
                disabled={creatingUser}
                className="rounded-lg p-1.5 text-white/70 hover:bg-white/10 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleCreateNewUser} className="p-5 space-y-4">
              {createUserError && (
                <div className="flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                  <AlertCircle className="h-4 w-4 shrink-0 text-rose-600" />
                  <span>{createUserError}</span>
                </div>
              )}

              {/* Username */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Username <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newUserForm.username}
                  onChange={(e) => setNewUserForm({ ...newUserForm, username: e.target.value })}
                  placeholder="Contoh: nadia_admin atau budi"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Email Akun <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  required
                  value={newUserForm.email}
                  onChange={(e) => setNewUserForm({ ...newUserForm, email: e.target.value })}
                  placeholder="Contoh: user@perusahaan.com"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Kata Sandi <span className="text-rose-500">*</span>
                </label>
                <input
                  type="password"
                  required
                  minLength={6}
                  value={newUserForm.password}
                  onChange={(e) => setNewUserForm({ ...newUserForm, password: e.target.value })}
                  placeholder="Minimal 6 karakter"
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-800 outline-none focus:border-violet-500 focus:bg-white"
                />
              </div>

              {/* Peran / Role */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Peran Awal
                </label>
                <select
                  value={newUserForm.peran}
                  onChange={(e) => setNewUserForm({ ...newUserForm, peran: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs font-bold text-slate-800 outline-none focus:border-violet-500 focus:bg-white"
                >
                  <option value="karyawan">Karyawan</option>
                  <option value="admin">Admin</option>
                  {roles.filter((r) => !['admin', 'karyawan', 'super_admin'].includes(r.role_name)).map((r) => (
                    <option key={r.role_name} value={r.role_name}>{r.display_name}</option>
                  ))}
                </select>
              </div>

              {/* Checkbox Aktif */}
              <label className="flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={Boolean(newUserForm.aktif)}
                  onChange={(e) => setNewUserForm({ ...newUserForm, aktif: e.target.checked ? 1 : 0 })}
                  className="h-4 w-4 rounded border-slate-300 text-violet-700 focus:ring-violet-600"
                />
                <span>Akun langsung aktif dan dapat login</span>
              </label>

              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateUserModalOpen(false)}
                  disabled={creatingUser}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={creatingUser}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-violet-700 px-5 py-2 text-xs font-bold text-white shadow-sm hover:bg-violet-800 transition disabled:opacity-50"
                >
                  {creatingUser ? 'Membuat Akun...' : 'Simpan & Buat Akun'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
