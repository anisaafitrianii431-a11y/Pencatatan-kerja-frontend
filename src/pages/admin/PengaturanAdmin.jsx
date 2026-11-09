import { useState, useEffect } from 'react'
import AdminPageBanner from '../../components/AdminPageBanner.jsx'

const ADMIN_SETTINGS_KEY = 'pam_admin_settings'
const DEFAULT_ADMIN_SETTINGS = {
  density: 'normal',
  dateFormat: 'long',
  notifyAssignments: true,
  notifyDeadlines: true,
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

function PengaturanAdmin({ onNavigate = () => {} }) {
  const [settings, setSettings] = useState(loadAdminSettings)
  const [activeTab, setActiveTab] = useState('tampilan')
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  function handleSaveSettings(e) {
    e.preventDefault()
    try {
      localStorage.setItem(ADMIN_SETTINGS_KEY, JSON.stringify(settings))
      document.documentElement.dataset.density = settings.density
      setSuccessMessage('Pengaturan preferensi administrator berhasil disimpan!')
      window.setTimeout(() => setSuccessMessage(''), 3500)
    } catch {
      setSuccessMessage('Pengaturan diterapkan pada sesi ini.')
    }
  }

  return (
    <div className="admin-settings-page mx-auto w-full max-w-[1440px] space-y-6">
      <AdminPageBanner
        description="Kelola preferensi antarmuka sistem, notifikasi aktivitas penugasan, dan status keamanan akun administrator."
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
            <circle cx="12" cy="12" r="3" />
            <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4L8.7 15a8 8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8H15l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.8Z" />
          </svg>
        }
        title="Pengaturan Administrator"
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

      {/* Navigasi Tab Pengaturan */}
      <div className="flex border-b border-slate-200 bg-white px-6 pt-3 rounded-2xl shadow-sm">
        <button
          className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'tampilan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('tampilan')}
          type="button"
        >
          Preferensi Tampilan
        </button>
        <button
          className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'notifikasi'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('notifikasi')}
          type="button"
        >
          Notifikasi Sistem
        </button>
        <button
          className={`border-b-2 px-5 py-3 text-sm font-bold transition ${
            activeTab === 'keamanan'
              ? 'border-blue-600 text-blue-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
          onClick={() => setActiveTab('keamanan')}
          type="button"
        >
          Keamanan & Akun
        </button>
      </div>

      <form onSubmit={handleSaveSettings}>
        {activeTab === 'tampilan' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Tata Letak & Kepadatan Antarmuka
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Atur kerapatan informasi pada tabel master karyawan, pekerjaan, dan penugasan.
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Kepadatan Tampilan Tabel
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      density: e.target.value,
                    }))
                  }
                  value={settings.density}
                >
                  <option value="normal">Normal — Tampilan Standar Lapang</option>
                  <option value="compact">Ringkas — Kepadatan Baris Tinggi</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                  Format Tampilan Tanggal
                </label>
                <select
                  className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-blue-600 focus:ring-4 focus:ring-blue-500/10"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      dateFormat: e.target.value,
                    }))
                  }
                  value={settings.dateFormat}
                >
                  <option value="long">Format Panjang (contoh: Senin, 9 November 2026)</option>
                  <option value="short">Format Singkat (contoh: 09/11/2026)</option>
                </select>
              </div>
            </div>
          </section>
        )}

        {activeTab === 'notifikasi' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Peringatan & Pemberitahuan Sistem
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Kelola notifikasi pop-up toast dan peringatan visual batas waktu pekerjaan.
              </p>
            </div>

            <div className="space-y-4">
              <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-slate-50 cursor-pointer">
                <input
                  checked={settings.notifyAssignments}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifyAssignments: e.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <div>
                  <span className="block text-sm font-semibold text-slate-800">
                    Pemberitahuan Klaim & Penugasan Pekerja
                  </span>
                  <span className="block text-xs text-slate-500">
                    Tampilkan alert saat pekerja mengambil pekerjaan yang terbuka untuk umum di panel pekerja.
                  </span>
                </div>
              </label>

              <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-4 transition hover:bg-slate-50 cursor-pointer">
                <input
                  checked={settings.notifyDeadlines}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                  onChange={(e) =>
                    setSettings((prev) => ({
                      ...prev,
                      notifyDeadlines: e.target.checked,
                    }))
                  }
                  type="checkbox"
                />
                <div>
                  <span className="block text-sm font-semibold text-slate-800">
                    Pengingat Pekerjaan Mendekati Tenggat
                  </span>
                  <span className="block text-xs text-slate-500">
                    Beri penanda visual dan kartu peringatan pada pekerjaan yang mendekati target selesai.
                  </span>
                </div>
              </label>
            </div>
          </section>
        )}

        {activeTab === 'keamanan' && (
          <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7 space-y-6">
            <div>
              <h2 className="text-base font-bold text-slate-900">
                Status Keamanan & Integrasi Sistem
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Status sistem autentikasi dan manajemen akun administrator.
              </p>
            </div>

            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Akun Administrator
                  </span>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    admin@cvputraanugrahmandiri.com
                  </p>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status Hak Akses
                  </span>
                  <p className="mt-1 text-sm font-bold text-blue-700">
                    Administrator Utama (Akses Penuh)
                  </p>
                </div>
              </div>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                    Status Sistem: Mode Pengujian Lokal CV. PAM
                  </p>
                </div>
                <p className="mt-1.5 text-xs leading-5 text-blue-800">
                  Modul autentikasi terpusat (login dan keamanan kata sandi) saat ini sedang dikembangkan oleh rekan tim. Manajemen akun administrator saat ini berjalan pada sesi lokal terlindungi.
                </p>
              </div>
            </div>
          </section>
        )}

        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
            type="submit"
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
              <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z" />
              <polyline points="17 21 17 13 7 13 7 21" />
              <polyline points="7 3 7 8 15 8" />
            </svg>
            <span>Simpan Pengaturan</span>
          </button>
        </div>
      </form>
    </div>
  )
}

export default PengaturanAdmin

