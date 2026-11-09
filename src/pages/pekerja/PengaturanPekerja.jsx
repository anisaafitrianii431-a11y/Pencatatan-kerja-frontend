import { useState, useEffect } from 'react'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'

const WORKER_SETTINGS_KEY = 'pam_worker_settings'

const DEFAULT_SETTINGS = {
  density: 'normal',
  dateFormat: 'long',
  notifyNewJobs: true,
  notifyDeadlines: true,
}

function loadSavedSettings() {
  try {
    const raw = localStorage.getItem(WORKER_SETTINGS_KEY)
    if (raw) {
      return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
    }
  } catch {
    // fallback
  }
  return DEFAULT_SETTINGS
}

function PengaturanPekerja({
  worker,
  onNavigate = () => {},
}) {
  const [settings, setSettings] = useState(loadSavedSettings)
  const [successMessage, setSuccessMessage] = useState('')

  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  function handleSaveSettings(e) {
    e.preventDefault()
    try {
      localStorage.setItem(WORKER_SETTINGS_KEY, JSON.stringify(settings))
      document.documentElement.dataset.density = settings.density
      setSuccessMessage('Pengaturan preferensi pekerja berhasil disimpan!')
      window.setTimeout(() => setSuccessMessage(''), 3500)
    } catch {
      setSuccessMessage('Pengaturan diterapkan pada sesi ini.')
    }
  }

  const avatarInitial = (worker?.nama || 'P').trim().charAt(0).toUpperCase()

  return (
    <div className="worker-settings-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Pengaturan"
        description="Kelola preferensi antarmuka tampilan, notifikasi penugasan pekerjaan, dan status akun pekerja."
        title="Pengaturan Akun Pekerja"
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

      {/* Ringkasan Akun Pekerja */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <h2 className="text-base font-bold text-slate-900">
          Ringkasan Akun Pekerja Aktif
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">
          Identitas pekerja yang saat ini digunakan pada mode pengujian aplikasi.
        </p>

        <div className="mt-5 flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-lg font-bold text-white shadow-md shadow-emerald-600/20">
              {avatarInitial}
            </div>
            <div>
              <p className="text-sm font-bold text-slate-900">
                {worker?.nama || 'Pekerja'}
              </p>
              <p className="text-xs font-semibold text-emerald-700">
                {worker?.jabatan || 'Pekerja Lapangan'} · ID: {worker?.id_karyawan}
              </p>
            </div>
          </div>

          <button
            className="self-start rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:self-auto"
            onClick={() => onNavigate('Profil Saya')}
            type="button"
          >
            Buka Profil Lengkap →
          </button>
        </div>
      </section>

      {/* Formulir Pengaturan Preferensi */}
      <form onSubmit={handleSaveSettings}>
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Preferensi Tampilan */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <rect height="14" rx="2" width="20" x="2" y="3" />
                    <line x1="8" x2="16" y1="21" y2="21" />
                    <line x1="12" x2="12" y1="17" y2="21" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Preferensi Tampilan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sesuaikan kepadatan tata letak antarmuka aplikasi.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Kepadatan Tampilan (Density)
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        density: e.target.value,
                      }))
                    }
                    value={settings.density}
                  >
                    <option value="normal">Normal — Tampilan Standar & Lapang</option>
                    <option value="compact">Ringkas — Kepadatan Tinggi (Compact)</option>
                  </select>
                  <p className="mt-1 text-[11px] text-slate-400">
                    Pengaturan ringkas cocok untuk melihat lebih banyak pekerjaan sekaligus di layar.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Format Tampilan Tanggal
                  </label>
                  <select
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
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
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              Preferensi tampilan disimpan persisten di browser lokal Anda.
            </div>
          </section>

          {/* Preferensi Notifikasi */}
          <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
            <div>
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
                  <svg
                    aria-hidden="true"
                    className="h-5 w-5"
                    fill="none"
                    stroke="currentColor"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="1.8"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                  </svg>
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Preferensi Notifikasi
                  </h3>
                  <p className="text-xs text-slate-500">
                    Atur pengingat pekerjaan dan pembaruan sistem.
                  </p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 cursor-pointer">
                  <input
                    checked={settings.notifyNewJobs}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                    onChange={(e) =>
                      setSettings((prev) => ({
                        ...prev,
                        notifyNewJobs: e.target.checked,
                      }))
                    }
                    type="checkbox"
                  />
                  <div>
                    <span className="block text-sm font-semibold text-slate-800">
                      Pemberitahuan Pekerjaan Baru Terbuka
                    </span>
                    <span className="block text-xs text-slate-500">
                      Dapatkan info saat Admin membuka pekerjaan baru untuk umum di menu Pekerjaan Tersedia.
                    </span>
                  </div>
                </label>

                <label className="flex items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50 cursor-pointer">
                  <input
                    checked={settings.notifyDeadlines}
                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
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
                      Pengingat Batas Waktu Pekerjaan
                    </span>
                    <span className="block text-xs text-slate-500">
                      Dapatkan peringatan ketika tugas pada menu Pekerjaan Saya mendekati target selesai.
                    </span>
                  </div>
                </label>
              </div>
            </div>

            <div className="mt-6 rounded-xl bg-slate-50 p-3 text-[11px] text-slate-500">
              Notifikasi aktif pada sesi aplikasi frontend Anda.
            </div>
          </section>
        </div>

        {/* Keamanan Akun & Status Autentikasi */}
        <section className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-700">
              <svg
                aria-hidden="true"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect height="11" rx="2" ry="2" width="18" x="3" y="11" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </span>
            <div>
              <h3 className="text-base font-bold text-slate-900">
                Keamanan Akun & Status Autentikasi
              </h3>
              <p className="text-xs text-slate-500">
                Informasi status keamanan dan pengelolaan akun pekerja.
              </p>
            </div>
          </div>

          <div className="mt-5">
            <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                <p className="text-xs font-bold uppercase tracking-wider text-blue-900">
                  Status Sistem: Mode Pengujian Lokal CV. PAM
                </p>
              </div>
              <p className="mt-1.5 text-xs leading-5 text-blue-800">
                Modul autentikasi terpusat (login dan keamanan kata sandi) saat ini sedang dikembangkan oleh anggota tim lain. Fitur perubahan kata sandi akan dihubungkan secara otomatis dan aman ke tabel <code>user</code> setelah modul autentikasi resmi selesai diintegrasikan.
              </p>
            </div>
          </div>
        </section>

        {/* Tombol Simpan Pengaturan */}
        <div className="mt-6 flex justify-end">
          <button
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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

export default PengaturanPekerja
