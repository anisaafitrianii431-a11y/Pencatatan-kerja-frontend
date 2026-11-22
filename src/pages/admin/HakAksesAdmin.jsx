import { useEffect, useMemo, useState } from 'react'
import { ShieldCheck, Save, RotateCcw } from 'lucide-react'
import { apiGet, apiPut } from '../../services/api.js'
import { useAuth } from '../../auth/useAuth.js'

const actions = [
  { key: 'can_create', label: 'Create' },
  { key: 'can_read', label: 'Read' },
  { key: 'can_update', label: 'Update' },
  { key: 'can_delete', label: 'Delete' },
]

const roleLabels = { admin: 'Admin', karyawan: 'Karyawan' }

export default function HakAksesAdmin() {
  const { refreshUser } = useAuth()
  const [resources, setResources] = useState([])
  const [permissions, setPermissions] = useState([])
  const [savedPermissions, setSavedPermissions] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')

  const hasChanges = useMemo(
    () => JSON.stringify(permissions) !== JSON.stringify(savedPermissions),
    [permissions, savedPermissions],
  )

  async function loadPermissions() {
    setLoading(true)
    setError('')
    try {
      const data = await apiGet('/role-permissions')
      const rows = (data.permissions || []).map((item) => ({
        ...item,
        can_create: Number(item.can_create) === 1,
        can_read: Number(item.can_read) === 1,
        can_update: Number(item.can_update) === 1,
        can_delete: Number(item.can_delete) === 1,
      }))
      setResources(data.resources || [])
      setPermissions(rows)
      setSavedPermissions(rows)
    } catch (loadError) {
      setError(loadError.message || 'Gagal memuat matriks hak akses.')
    } finally {
      setLoading(false)
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
              <p className="mt-1 max-w-3xl text-sm text-slate-600">Atur izin Create, Read, Update, dan Delete untuk role Admin dan Karyawan. Perubahan diperiksa oleh backend.</p>
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
          Super Admin selalu memiliki akses penuh. Matriks ini mengatur role Admin dan Karyawan; batasan data pribadi karyawan tetap diberlakukan.
        </div>
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
                  {Object.entries(roleLabels).map(([role, label]) => (
                    <th key={role} className="px-5 py-4">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {resources.map((resource) => (
                  <tr key={resource.key} className="align-top hover:bg-slate-50/60">
                    <th scope="row" className="whitespace-nowrap px-5 py-5 text-left font-semibold text-slate-800">{resource.label}</th>
                    {Object.entries(roleLabels).map(([role, label]) => {
                      const permission = permissions.find((item) => item.role_name === role && item.resource_key === resource.key)
                      return (
                        <td key={role} className="px-5 py-4">
                          <div className="flex flex-wrap gap-x-4 gap-y-2">
                            {actions.map(({ key, label: actionLabel }) => (
                              <label key={key} className="inline-flex cursor-pointer items-center gap-1.5 text-xs text-slate-600">
                                <input
                                  type="checkbox"
                                  checked={Boolean(permission?.[key])}
                                  onChange={() => togglePermission(role, resource.key, key)}
                                  aria-label={`${label} ${actionLabel} ${resource.label}`}
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
