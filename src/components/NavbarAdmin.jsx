import { useEffect, useRef, useState } from 'react'
import AdminAvatar from './AdminAvatar.jsx'

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    briefcase: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    chevron: <path d="m7 10 5 5 5-5" />,
    user: (
      <>
        <circle cx="12" cy="8" r="4" />
        <path d="M5 21a7 7 0 0 1 14 0" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4L8.7 15a8 8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8H15l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.8Z" />
      </>
    ),
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
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

const ADMIN_PROFILE_KEY = 'pam_admin_profile'
const DEFAULT_ADMIN_PROFILE = {
  nama: 'Administrator',
  identitas: 'Admin Utama Sistem',
  email: 'admin@cvputraanugrahmandiri.com',
  peran: 'Admin',
  lingkup: 'Karyawan, Pekerjaan, Penugasan',
}

const ADMIN_SETTINGS_KEY = 'pam_admin_settings'
const DEFAULT_ADMIN_SETTINGS = {
  density: 'normal',
  dateFormat: 'long',
  notifyAssignments: true,
  notifyDeadlines: true,
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

function loadAdminSettings() {
  try {
    const raw = localStorage.getItem(ADMIN_SETTINGS_KEY)
    if (raw) return { ...DEFAULT_ADMIN_SETTINGS, ...JSON.parse(raw) }
  } catch {
    // fallback
  }
  return DEFAULT_ADMIN_SETTINGS
}

function NavbarAdmin({
  onToggleSidebar,
  isSidebarOpen = false,
  onLogout = () => {},
}) {
  const [adminProfile, setAdminProfile] = useState(loadAdminProfile)
  const [isEditingAdminProfile, setIsEditingAdminProfile] = useState(false)
  const [adminForm, setAdminForm] = useState({
    nama: adminProfile.nama,
    identitas: adminProfile.identitas,
    email: adminProfile.email,
  })
  const [adminProfileError, setAdminProfileError] = useState('')
  const [adminProfileSuccess, setAdminProfileSuccess] = useState('')

  const [adminSettings, setAdminSettings] = useState(loadAdminSettings)
  const [adminSettingsSuccess, setAdminSettingsSuccess] = useState('')
  const [adminSettingsTab, setAdminSettingsTab] = useState('tampilan')

  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false)
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const [today, setToday] = useState(() => new Date())
  const profileRef = useRef(null)
  const dateLabel = new Intl.DateTimeFormat('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  }).format(today)

  useEffect(() => {
    const dateTimer = window.setInterval(() => setToday(new Date()), 60_000)

    function handlePointerDown(event) {
      if (!profileRef.current?.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      window.clearInterval(dateTimer)
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleProfileAction(action) {
    setIsProfileOpen(false)
    if (action === 'Lihat Profil') {
      setIsEditingAdminProfile(false)
      setAdminProfileError('')
      setAdminProfileSuccess('')
      setAdminForm({
        nama: adminProfile.nama,
        identitas: adminProfile.identitas,
        email: adminProfile.email,
      })
      setIsProfileModalOpen(true)
      return
    }
    if (action === 'Pengaturan') {
      setAdminSettingsSuccess('')
      setIsSettingsModalOpen(true)
      return
    }
    if (action === 'Keluar') {
      onLogout()
      return
    }
    setNotice(`${action} belum tersedia pada tahap frontend ini.`)
  }

  function handleSaveAdminProfile(e) {
    e.preventDefault()
    setAdminProfileError('')
    setAdminProfileSuccess('')

    const trimmedNama = adminForm.nama.trim()
    if (!trimmedNama || trimmedNama.length < 3) {
      setAdminProfileError('Nama Administrator minimal 3 karakter.')
      return
    }

    const trimmedEmail = adminForm.email.trim()
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(trimmedEmail)) {
      setAdminProfileError('Format email administrator tidak valid.')
      return
    }

    const updated = {
      ...adminProfile,
      nama: trimmedNama,
      identitas: adminForm.identitas.trim() || 'Admin Utama Sistem',
      email: trimmedEmail,
    }

    setAdminProfile(updated)
    try {
      localStorage.setItem(ADMIN_PROFILE_KEY, JSON.stringify(updated))
    } catch {
      // ignore
    }

    setIsEditingAdminProfile(false)
    setAdminProfileSuccess('Profil Administrator berhasil diperbarui!')
    window.setTimeout(() => setAdminProfileSuccess(''), 3500)
  }

  function handleSaveAdminSettings(e) {
    e.preventDefault()
    try {
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(adminSettings))
      document.documentElement.dataset.density = adminSettings.density
      setAdminSettingsSuccess('Pengaturan preferensi administrator berhasil disimpan!')
      window.setTimeout(() => setAdminSettingsSuccess(''), 3500)
    } catch {
      setAdminSettingsSuccess('Pengaturan diterapkan pada sesi ini.')
    }
  }

  return (
    <header className="admin-topbar relative z-[60] border-b border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] lg:z-30">
      <div className="admin-topbar-inner">
        <div className="admin-topbar-page">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={isSidebarOpen ? 'Tutup menu navigasi' : 'Buka menu navigasi'}
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 lg:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <Icon name={isSidebarOpen ? 'close' : 'menu'} />
          </button>
          <div className="admin-topbar-brand">
            <span className="admin-topbar-brand-icon">
              <Icon className="h-5 w-5" name="briefcase" />
            </span>
            <span>
              <span className="admin-topbar-brand-title">
                Sistem Pencatatan Kerja
              </span>
              <span className="admin-topbar-brand-subtitle">
                Panel Administrator
              </span>
            </span>
          </div>
        </div>

        <div className="admin-topbar-date">
          <span className="admin-topbar-date-icon">
            <Icon className="h-5 w-5" name="calendar" />
          </span>
          <div className="min-w-0">
            <span className="admin-topbar-date-label">Hari ini</span>
            <p className="admin-topbar-date-value">{dateLabel}</p>
          </div>
        </div>

        <div className="relative shrink-0" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:gap-3 sm:px-2"
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            type="button"
          >
            <AdminAvatar
              className="h-10 w-10 text-xs ring-2 ring-white"
              name={adminProfile.nama || 'Admin'}
              tone="brand"
            />
            <span className="hidden sm:block">
              <span className="block truncate max-w-36 text-sm font-semibold leading-5 text-slate-800">
                {adminProfile.nama || 'Admin'}
              </span>
              <span className="block truncate max-w-36 text-xs leading-4 text-slate-500">
                {adminProfile.identitas || 'Administrator'}
              </span>
            </span>
            <Icon
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                isProfileOpen ? 'rotate-180' : ''
              }`}
              name="chevron"
            />
          </button>

          <div
            aria-hidden={!isProfileOpen}
            className={`absolute right-0 top-full mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 transition duration-150 ${
              isProfileOpen
                ? 'visible translate-y-0 scale-100 opacity-100'
                : 'invisible -translate-y-1 scale-95 opacity-0'
            }`}
            role="menu"
          >
            <div className="border-b border-slate-100 px-3 py-2.5 sm:hidden">
              <p className="text-sm font-semibold text-slate-800">Admin</p>
              <p className="text-xs text-slate-500">Administrator</p>
            </div>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => handleProfileAction('Lihat Profil')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4 text-slate-400" name="user" />
              Lihat Profil
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => handleProfileAction('Pengaturan')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4 text-slate-400" name="settings" />
              Pengaturan
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600"
              onClick={() => handleProfileAction('Keluar')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4" name="logout" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      {isProfileModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsProfileModalOpen(false)
          }}
        >
          <div
            aria-labelledby="admin-profile-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900" id="admin-profile-title">
                Profil Administrator
              </h2>
              <button
                aria-label="Tutup dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsProfileModalOpen(false)}
                type="button"
              >
                <Icon className="h-5 w-5" name="close" />
              </button>
            </div>

            {adminProfileSuccess && (
              <div
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
                role="status"
              >
                ✓ {adminProfileSuccess}
              </div>
            )}

            {adminProfileError && (
              <div
                className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-2.5 text-xs font-semibold text-rose-800"
                role="alert"
              >
                {adminProfileError}
              </div>
            )}

            <div className="mt-5 flex items-center gap-4">
              <AdminAvatar
                className="h-14 w-14 text-sm ring-4 ring-blue-50"
                name={adminProfile.nama || 'Admin'}
                tone="brand"
              />
              <div>
                <p className="text-base font-bold text-slate-900">
                  {adminProfile.nama || 'Administrator'}
                </p>
                <p className="text-xs font-medium text-blue-600">
                  {adminProfile.identitas || 'Admin Utama Sistem'}
                </p>
                <p className="text-xs text-slate-400">CV. Putra Anugrah Mandiri</p>
              </div>
            </div>

            {isEditingAdminProfile ? (
              <form className="mt-5 space-y-4" onSubmit={handleSaveAdminProfile}>
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nama Administrator <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    onChange={(e) =>
                      setAdminForm((prev) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Nama Admin"
                    required
                    type="text"
                    value={adminForm.nama}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Identitas / Jabatan
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    onChange={(e) =>
                      setAdminForm((prev) => ({
                        ...prev,
                        identitas: e.target.value,
                      }))
                    }
                    placeholder="Admin Utama Sistem"
                    type="text"
                    value={adminForm.identitas}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Utama <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="mt-1 w-full rounded-xl border border-slate-200 px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/10"
                    onChange={(e) =>
                      setAdminForm((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="admin@cvputraanugrahmandiri.com"
                    required
                    type="email"
                    value={adminForm.email}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Peran Akun
                  </label>
                  <input
                    className="mt-1 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm text-slate-500 outline-none"
                    disabled
                    readOnly
                    value="Admin (Terkunci)"
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Peran Administrator tidak dapat diubah dari halaman profil.
                  </p>
                </div>

                <div className="mt-6 flex justify-end gap-2.5 pt-2">
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                    onClick={() => {
                      setIsEditingAdminProfile(false)
                      setAdminProfileError('')
                    }}
                    type="button"
                  >
                    Batalkan
                  </button>
                  <button
                    className="rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                    type="submit"
                  >
                    Simpan Perubahan
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-5 space-y-4">
                <dl className="space-y-3 rounded-xl bg-slate-50 p-4 text-xs">
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Peran Akun</dt>
                    <dd className="font-semibold text-slate-800">
                      {adminProfile.peran || 'Admin'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Email Utama</dt>
                    <dd className="font-semibold text-slate-800">
                      {adminProfile.email}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Lingkup Tugas</dt>
                    <dd className="font-semibold text-slate-800">
                      {adminProfile.lingkup || 'Karyawan, Pekerjaan, Penugasan'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-slate-500">Status Sesi</dt>
                    <dd className="font-semibold text-emerald-600">Mode Lokal Aktif</dd>
                  </div>
                </dl>

                <div className="mt-6 flex justify-between gap-3 pt-2">
                  <button
                    className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
                    onClick={() => setIsProfileModalOpen(false)}
                    type="button"
                  >
                    Tutup
                  </button>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm hover:bg-blue-700"
                    onClick={() => {
                      setIsEditingAdminProfile(true)
                      setAdminProfileError('')
                      setAdminProfileSuccess('')
                      setAdminForm({
                        nama: adminProfile.nama,
                        identitas: adminProfile.identitas,
                        email: adminProfile.email,
                      })
                    }}
                    type="button"
                  >
                    <svg
                      aria-hidden="true"
                      className="h-3.5 w-3.5"
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
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {isSettingsModalOpen && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center overflow-y-auto bg-slate-950/40 p-4 backdrop-blur-sm"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setIsSettingsModalOpen(false)
          }}
        >
          <div
            aria-labelledby="admin-settings-title"
            aria-modal="true"
            className="my-auto w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-7"
            role="dialog"
          >
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <h2 className="text-lg font-bold text-slate-900" id="admin-settings-title">
                Pengaturan Administrator
              </h2>
              <button
                aria-label="Tutup dialog"
                className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                onClick={() => setIsSettingsModalOpen(false)}
                type="button"
              >
                <Icon className="h-5 w-5" name="close" />
              </button>
            </div>

            {adminSettingsSuccess && (
              <div
                className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-semibold text-emerald-800"
                role="status"
              >
                ✓ {adminSettingsSuccess}
              </div>
            )}

            {/* Tab Navigasi Pengaturan */}
            <div className="mt-4 flex border-b border-slate-100">
              <button
                className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                  adminSettingsTab === 'tampilan'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setAdminSettingsTab('tampilan')}
                type="button"
              >
                Tampilan
              </button>
              <button
                className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                  adminSettingsTab === 'notifikasi'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setAdminSettingsTab('notifikasi')}
                type="button"
              >
                Notifikasi
              </button>
              <button
                className={`border-b-2 px-4 py-2 text-xs font-bold transition ${
                  adminSettingsTab === 'keamanan'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-slate-500 hover:text-slate-800'
                }`}
                onClick={() => setAdminSettingsTab('keamanan')}
                type="button"
              >
                Keamanan & Akun
              </button>
            </div>

            <form onSubmit={handleSaveAdminSettings}>
              {adminSettingsTab === 'tampilan' && (
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Kepadatan Data (Density)
                    </label>
                    <select
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-600"
                      onChange={(e) =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          density: e.target.value,
                        }))
                      }
                      value={adminSettings.density}
                    >
                      <option value="normal">Normal — Tampilan Standar</option>
                      <option value="compact">Ringkas — Kepadatan Tabel Tinggi</option>
                    </select>
                    <p className="mt-1 text-[11px] text-slate-400">
                      Mengatur spasi baris tabel data karyawan, pekerjaan, dan penugasan.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                      Format Tanggal
                    </label>
                    <select
                      className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-sm text-slate-800 outline-none focus:border-blue-600"
                      onChange={(e) =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          dateFormat: e.target.value,
                        }))
                      }
                      value={adminSettings.dateFormat}
                    >
                      <option value="long">Format Panjang (contoh: Senin, 9 November 2026)</option>
                      <option value="short">Format Singkat (contoh: 09/11/2026)</option>
                    </select>
                  </div>
                </div>
              )}

              {adminSettingsTab === 'notifikasi' && (
                <div className="mt-4 space-y-3.5">
                  <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
                    <input
                      checked={adminSettings.notifyAssignments}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          notifyAssignments: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        Pemberitahuan Klaim & Penugasan Pekerja
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Tampilkan info toast saat pekerja mengambil pekerjaan yang terbuka untuk umum.
                      </span>
                    </div>
                  </label>

                  <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
                    <input
                      checked={adminSettings.notifyDeadlines}
                      className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                      onChange={(e) =>
                        setAdminSettings((prev) => ({
                          ...prev,
                          notifyDeadlines: e.target.checked,
                        }))
                      }
                      type="checkbox"
                    />
                    <div>
                      <span className="block text-xs font-bold text-slate-800">
                        Pengingat Pekerjaan Mendekati Tenggat
                      </span>
                      <span className="block text-[11px] text-slate-500">
                        Beri tanda visual pada pekerjaan yang mendekati target selesai.
                      </span>
                    </div>
                  </label>
                </div>
              )}

              {adminSettingsTab === 'keamanan' && (
                <div className="mt-4 space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Email Akun Admin</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600 outline-none"
                      disabled
                      value={adminProfile.email}
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-500">Peran Sistem</label>
                    <input
                      className="mt-1 w-full rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs text-slate-600 outline-none"
                      disabled
                      value="Administrator Utama CV. PAM"
                    />
                  </div>
                  <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-3.5 text-xs leading-5 text-blue-800">
                    <strong>Catatan Integrasi:</strong> Area autentikasi terpusat dan reset kata sandi resmi sedang dikembangkan oleh rekan tim. Sistem saat ini berjalan dalam mode pengujian lokal.
                  </div>
                </div>
              )}

              <div className="mt-6 flex justify-between gap-2.5 pt-2 border-t border-slate-100">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
                  onClick={() => setIsSettingsModalOpen(false)}
                  type="button"
                >
                  Tutup
                </button>
                <button
                  className="rounded-xl bg-blue-600 px-5 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-blue-700"
                  type="submit"
                >
                  Simpan Pengaturan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {notice && (
        <div
          className="absolute right-4 top-full mt-2 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-lg sm:right-6 lg:right-8"
          role="status"
        >
          <div className="flex items-start gap-3">
            <p>{notice}</p>
            <button
              aria-label="Tutup pemberitahuan"
              className="font-medium text-slate-400 hover:text-slate-700"
              onClick={() => setNotice('')}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default NavbarAdmin
