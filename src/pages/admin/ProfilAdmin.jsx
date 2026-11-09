import { useState, useEffect } from 'react'
import AdminPageBanner from '../../components/AdminPageBanner.jsx'
import AdminAvatar from '../../components/AdminAvatar.jsx'

const ADMIN_PROFILE_KEY = 'pam_admin_profile'
const DEFAULT_ADMIN_PROFILE = {
  nama: 'Administrator',
  identitas: 'Admin Utama Sistem',
  email: 'admin@cvputraanugrahmandiri.com',
  peran: 'Admin',
  lingkup: 'Karyawan, Pekerjaan, Penugasan',
}

function loadAdminProfile() {
  try {
    const raw = localStorage.getItem(ADMIN_PROFILE_KEY)
    if (raw) return { ...DEFAULT_ADMIN_PROFILE, ...JSON.parse(raw) }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_PROFILE
}

function ProfilAdmin({ onNavigate = () => {} }) {
  const [profile, setProfile] = useState(loadAdminProfile)
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nama: profile.nama,
    identitas: profile.identitas,
    email: profile.email,
  })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    setFormData({
      nama: profile.nama,
      identitas: profile.identitas,
      email: profile.email,
    })
  }, [profile])

  function handleStartEdit() {
    setFormData({
      nama: profile.nama,
      identitas: profile.identitas,
      email: profile.email,
    })
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setFormData({
      nama: profile.nama,
      identitas: profile.identitas,
      email: profile.email,
    })
    setErrorMessage('')
    setIsEditing(false)
  }

  function handleSubmit(e) {
    e.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const trimmedNama = formData.nama.trim()
    if (!trimmedNama || trimmedNama.length < 3) {
      setErrorMessage('Nama Administrator minimal 3 karakter.')
      return
    }

    const trimmedEmail = formData.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setErrorMessage('Format email administrator tidak valid.')
      return
    }

    const updated = {
      ...profile,
      nama: trimmedNama,
      identitas: formData.identitas.trim() || 'Admin Utama Sistem',
      email: trimmedEmail,
    }

    try {
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(updated))
    } catch {
      // fallback
    }

    setProfile(updated)
    setIsEditing(false)
    setSuccessMessage('Profil Administrator berhasil diperbarui!')
    window.setTimeout(() => setSuccessMessage(''), 4000)
  }

  return (
    <div className="admin-profile-page mx-auto w-full max-w-[1440px] space-y-6">
      <AdminPageBanner
        description="Kelola informasi identitas akun utama administrator sistem CV. Putra Anugrah Mandiri."
        icon={
          <svg
            aria-hidden="true"
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <circle cx="12" cy="8" r="4" />
            <path d="M5 21a7 7 0 0 1 14 0" />
          </svg>
        }
        title="Profil Administrator"
      />

      {successMessage && (
        <div
          className="flex items-center justify-between rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-800 shadow-sm"
          role="status"
        >
          <div className="flex items-center gap-3">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white">
              ✓
            </span>
            <span>{successMessage}</span>
          </div>
          <button
            className="text-xs font-bold text-emerald-700 hover:text-emerald-900"
            onClick={() => setSuccessMessage('')}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {errorMessage && (
        <div
          className="rounded-2xl border border-rose-200 bg-rose-50 px-5 py-4 text-sm font-semibold text-rose-800 shadow-sm"
          role="alert"
        >
          {errorMessage}
        </div>
      )}

      <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-blue-50/60 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <AdminAvatar
                className="h-16 w-16 text-lg ring-4 ring-blue-100"
                name={profile.nama || 'Admin'}
                tone="brand"
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {profile.nama}
                  </h2>
                  <span className="inline-flex items-center rounded-lg bg-blue-100 px-2.5 py-0.5 text-xs font-semibold text-blue-800">
                    Administrator
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-blue-700">
                  {profile.identitas || 'Admin Utama Sistem'}
                </p>
                <p className="text-xs text-slate-400">
                  CV. Putra Anugrah Mandiri
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
                onClick={handleStartEdit}
                type="button"
              >
                <svg
                  aria-hidden="true"
                  className="h-4 w-4"
                  fill="none"
                  stroke="currentColor"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  viewBox="0 0 24 24"
                >
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                </svg>
                <span>Edit Profil</span>
              </button>
            )}
          </div>
        </div>

        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nama Administrator <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Nama Admin"
                    required
                    type="text"
                    value={formData.nama}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Minimal 3 karakter.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Identitas / Jabatan
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        identitas: e.target.value,
                      }))
                    }
                    placeholder="Admin Utama Sistem"
                    type="text"
                    value={formData.identitas}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Utama <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10"
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        email: e.target.value,
                      }))
                    }
                    placeholder="admin@cvputraanugrahmandiri.com"
                    required
                    type="email"
                    value={formData.email}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Peran Akun
                  </label>
                  <input
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none"
                    disabled
                    readOnly
                    value="Admin Utama (Terkunci)"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Peran akun tidak dapat diubah dari halaman profil.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={handleCancelEdit}
                  type="button"
                >
                  Batalkan
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
                  type="submit"
                >
                  Simpan Perubahan
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Peran Akun
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {profile.peran || 'Admin'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Jabatan Sistem
                  </dt>
                  <dd className="mt-1 text-base font-bold text-blue-700">
                    {profile.identitas || 'Admin Utama Sistem'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email Utama
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {profile.email}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Lingkup Tugas
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {profile.lingkup || 'Karyawan, Pekerjaan, Penugasan'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nama Perusahaan
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    CV. Putra Anugrah Mandiri
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status Sesi & Sistem
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Aktif · Mode Pengujian Lokal
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-blue-800">
                <strong>Catatan Integrasi:</strong> Autentikasi multi-user dan keamanan kata sandi terpusat sedang disiapkan oleh rekan tim. Profil Administrator saat ini mengelola preferensi identitas lokal secara persisten.
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                  onClick={() => onNavigate('Dashboard')}
                  type="button"
                >
                  Kembali ke Dashboard
                </button>
              </div>
            </div>
          )}
        </div>
      </article>
    </div>
  )
}

export default ProfilAdmin

