import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Save, RotateCcw, Plus, Trash2 } from 'lucide-react'
import { apiGet, apiPost, apiPut, apiDelete } from '../../services/api.js'
import { useAuth } from '../../auth/useAuth.js'

const actions = [
  { key: 'can_create', label: 'Create' },
  { key: 'can_read', label: 'Read' },
  { key: 'can_update', label: 'Update' },
  { key: 'can_delete', label: 'Delete' },
]

export default function HakAksesAdmin() {
  const { refreshUser } = useAuth()
  const [resources, setResources] = useState([])
  const [roles, setRoles] = useState([])
  const [permissions, setPermissions] = useState([])
  const [savedPermissions, setSavedPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [roleBusy, setRoleBusy] = useState(false)

  const hasChanges = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(savedPermissions),
    [permissions, savedPermissions],
  )

  async function loadPermissions() {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet('/role-permissions')
      const roleDetails = Array.isArray(data.roleDetails) && data.roleDetails.length
        ? data.roleDetails
        : (data.roles || ['admin', 'karyawan']).map((role) => ({
          role_name: role,
          display_name: role === 'admin' ? 'Admin' : role === 'karyawan' ? 'Karyawan' : role,
          description: '',
          is_system: 1,
        }))
      const rows = (data.permissions || []).map((item) => ({
        ...item,
        can_create: Number(item.can_create) === 1,
        can_read: Number(item.can_read) === 1,
        can_update: Number(item.can_update) === 1,
        can_delete: Number(item.can_delete) === 1,
      }))
      setResources(data.resources || [])
      setRoles(roleDetails)
      setPermissions(rows)
      setSavedPermissions(rows)
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat matriks hak akses.')
    } finally {
      setLoading(false)
    }
  }

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
      await loadPermissions()
      setNotice('Role baru berhasil dibuat. Atur hak aksesnya lalu simpan perubahan.')
    } catch (createError) {
      setError(createError.message || 'Gagal membuat role baru.')
    } finally {
      setRoleBusy(false)
    }
  }

  async function deleteRole(role) {
    if (!window.confirm(`Hapus role ${role.display_name}? Role hanya dapat dihapus jika belum dipakai akun.`)) return
    setRoleBusy(true)
    setError('')
    setNotice('')
    try {
      await apiDelete(`/role-permissions/roles/${encodeURIComponent(role.role_name)}`)
      await loadPermissions()
      setNotice(`Role ${role.display_name} berhasil dihapus.`)
    } catch (deleteError) {
      setError(deleteError.message || 'Gagal menghapus role.')
    } finally {
      setRoleBusy(false)
    }
  }

  useEffect(() => { loadPermissions() }, [])

  function togglePermission(role, resource, action) {
    setPermissions((current) => current.map((item) =>
      item.role_name === role && item.resource_key === resource
        ? { ...item, [action]: !item[action] }
        : item,
    ))
    setNotice('')
  }

  async function savePermissions() {
    setSaving(true)
    setError('')
    setNotice('')
    try {
      await apiPut('/role-permissions', { permissions })
      await loadPermissions()
      if (typeof refreshUser === 'function') {
        await refreshUser()
      }
      setNotice('Hak akses berhasil disimpan.')
    } catch (saveError) {
      setError(saveError.message || 'Gagal menyimpan hak akses.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <span className="rounded-xl bg-violet-50 p-3 text-violet-700"><ShieldCheck className="h-6 w-6" /></span>
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-violet-700">Khusus Super Admin</p>
              <h1 className="mt-1 text-2xl font-bold text-slate-900">Pengaturan Hak Akses</h1>
              <p className="mt-1 max-w-3xl text-sm text-slate-600">Atur izin Create, Read, Update, dan Delete untuk role sistem maupun role khusus.</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button type="button" onClick={loadPermissions} disabled={loading || saving} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50">
              <RotateCcw className="h-4 w-4" /> Muat Ulang
            </button>
            <button type="button" onClick={savePermissions} disabled={!hasChanges || loading || saving} className="inline-flex items-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:cursor-not-allowed disabled:opacity-50">
              <Save className="h-4 w-4" /> {saving ? 'Menyimpan…' : 'Simpan Perubahan'}
            </button>
          </div>
        </div>
        <div className="mt-5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
          Super Admin selalu memiliki akses penuh. Hak akses role lain dapat disesuaikan di bawah; akses data pribadi karyawan tetap dibatasi oleh backend.
        </div>
        <form onSubmit={createRole} className="mt-4 grid gap-2 rounded-xl border border-violet-100 bg-violet-50/50 p-3 sm:grid-cols-[1fr_1.5fr_auto]">
          <input value={newRoleName} onChange={(event) => setNewRoleName(event.target.value)} placeholder="Nama role baru" aria-label="Nama role baru" maxLength={100} required className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" />
          <input value={newRoleDescription} onChange={(event) => setNewRoleDescription(event.target.value)} placeholder="Deskripsi (opsional)" aria-label="Deskripsi role" maxLength={255} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-violet-500" />
          <button type="submit" disabled={roleBusy || !newRoleName.trim()} className="inline-flex items-center justify-center gap-2 rounded-lg bg-violet-700 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-800 disabled:opacity-50"><Plus className="h-4 w-4" />Tambah Role</button>
        </form>
        {error && <p role="alert" className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{error}</p>}
        {notice && <p role="status" className="mt-4 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</p>}
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? (
          <div className="p-10 text-center text-sm text-slate-500">Memuat matriks hak akses…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] border-collapse text-sm">
              <thead className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-4">Modul</th>
                  {roles.map((role) => (
                    <th key={role.role_name} className="min-w-56 px-5 py-4">
                      <span>{role.display_name}</span>
                      {!Number(role.is_system) && <button type="button" onClick={() => deleteRole(role)} disabled={roleBusy} title={`Hapus role ${role.display_name}`} aria-label={`Hapus role ${role.display_name}`} className="ml-2 inline-flex rounded p-1 text-rose-500 hover:bg-rose-50 disabled:opacity-50"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((resource) => (
                  <tr key={resource.key} className="align-top hover:bg-slate-50/60">
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-left font-semibold text-slate-800">{resource.label}</th>
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
                                {actionLabel}
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
        )}
      </section>
    </div>
  )
}
