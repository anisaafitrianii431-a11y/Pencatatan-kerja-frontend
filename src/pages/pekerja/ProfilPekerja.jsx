import { useState, useEffect } from 'react'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { updateKaryawan } from '../../services/karyawanApi.js'

const CURRENCY_FORMATTER = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  if (value == null || value === '') return '—'
  const numeric = Number(value)
  return Number.isNaN(numeric) ? '—' : CURRENCY_FORMATTER.format(numeric)
}

function getWorkerStorageKey(id) {
  return `pam_worker_profile_${id}`
}

function loadWorkerExtra(worker) {
  if (!worker) return { email: '', telepon: '' }
  try {
    const raw = localStorage.getItem(getWorkerStorageKey(worker.id_karyawan))
    if (raw) return JSON.parse(raw)
  } catch {
    // fallback
  }

  // Format email default berbasis nama pekerja
  const cleanName = (worker.nama || 'pekerja')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]/g, '.')
  return {
    email: `${cleanName}@cvputraanugrahmandiri.com`,
    telepon: '0812-3456-7890',
  }
}

function ProfilPekerja({
  worker,
  onUpdateWorker = () => {},
  onBackToDashboard = () => {},
  onSwitchEmployee = () => {},
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState({
    nama: '',
    email: '',
    telepon: '',
  })
  const [extraData, setExtraData] = useState({ email: '', telepon: '' })
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Sinkronisasi data saat berganti pekerja
  useEffect(() => {
    if (worker) {
      const extra = loadWorkerExtra(worker)
      setExtraData(extra)
      setFormData({
        nama: worker.nama || '',
        email: extra.email || '',
        telepon: extra.telepon || '',
      })
      setIsEditing(false)
      setErrorMessage('')
      setSuccessMessage('')
    }
  }, [worker?.id_karyawan])

  if (!worker) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Pekerja belum dipilih. Silakan pilih pekerja terlebih dahulu.
      </div>
    )
  }

  const avatarInitial = (worker.nama || 'P').trim().charAt(0).toUpperCase()

  function handleStartEdit() {
    setFormData({
      nama: worker.nama || '',
      email: extraData.email || '',
      telepon: extraData.telepon || '',
    })
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setFormData({
      nama: worker.nama || '',
      email: extraData.email || '',
      telepon: extraData.telepon || '',
    })
    setErrorMessage('')
    setIsEditing(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const trimmedNama = formData.nama.trim()
    if (!trimmedNama) {
      setErrorMessage('Nama lengkap wajib diisi.')
      return
    }

    if (trimmedNama.length < 3) {
      setErrorMessage('Nama lengkap minimal harus terdiri dari 3 karakter.')
      return
    }

    const trimmedEmail = formData.email.trim()
    if (trimmedEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
      if (!emailRegex.test(trimmedEmail)) {
        setErrorMessage('Format email tidak valid.')
        return
      }
    }

    setIsSubmitting(true)
    try {
      // Perbarui nama di database melalui API master karyawan
      // Jabatan dan tarif_per_jam tidak diubah oleh pekerja
      const updated = await updateKaryawan(worker.id_karyawan, {
        nama: trimmedNama,
        jabatan: worker.jabatan || null,
        tarif_per_jam: worker.tarif_per_jam ?? 0,
      })

      // Simpan kontak tambahan pekerja secara persisten terisolasi per id_karyawan
      const newExtra = {
        email: trimmedEmail || extraData.email,
        telepon: formData.telepon.trim(),
      }
      try {
        localStorage.setItem(
          getWorkerStorageKey(worker.id_karyawan),
          JSON.stringify(newExtra),
        )
      } catch {
        // fallback
      }

      setExtraData(newExtra)
      onUpdateWorker(updated)
      setIsEditing(false)
      setSuccessMessage('Profil pekerja berhasil diperbarui!')
      window.setTimeout(() => setSuccessMessage(''), 4000)
    } catch (err) {
      setErrorMessage(err.message || 'Gagal menyimpan pembaruan profil pekerja.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="worker-profile-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Profil Saya"
        description="Informasi identitas dan rincian profil pekerja CV. Putra Anugrah Mandiri."
        title="Profil Pekerja"
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
        {/* Header Profil */}
        <div className="border-b border-slate-100 bg-gradient-to-r from-emerald-50/60 to-transparent p-6 sm:p-8">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-4 sm:gap-5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-2xl font-bold text-white shadow-lg shadow-emerald-600/20 ring-4 ring-emerald-100">
                {avatarInitial}
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {worker.nama}
                  </h2>
                  <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Pekerja
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                  {worker.jabatan || 'Pekerja Lapangan'}
                </p>
                <p className="text-xs text-slate-400">
                  CV. Putra Anugrah Mandiri
                </p>
              </div>
            </div>

            {!isEditing && (
              <button
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600"
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

        {/* Konten Profil (View Mode vs Edit Mode) */}
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-900">
                <strong>Ketentuan Hak Akses Profil:</strong> Pekerja dapat memperbarui nama lengkap, email kontak, dan nomor telepon. Jabatan, tarif upah, dan ID karyawan ditetapkan secara terpusat oleh Admin.
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, nama: e.target.value }))
                    }
                    placeholder="Nama Lengkap Pekerja"
                    required
                    type="text"
                    value={formData.nama}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Minimal 3 karakter, maksimal 100 karakter.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Email Kontak
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, email: e.target.value }))
                    }
                    placeholder="nama@cvputraanugrahmandiri.com"
                    type="email"
                    value={formData.email}
                  />
                  <p className="mt-1 text-[11px] text-slate-400">
                    Alamat email kontak pekerja.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nomor Telepon / WhatsApp
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    disabled={isSubmitting}
                    onChange={(e) =>
                      setFormData((prev) => ({
                        ...prev,
                        telepon: e.target.value,
                      }))
                    }
                    placeholder="Contoh: 0812-3456-7890"
                    type="text"
                    value={formData.telepon}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    ID Karyawan
                  </label>
                  <input
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none"
                    disabled
                    readOnly
                    value={`ID: ${worker.id_karyawan} (Terkunci oleh sistem)`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Jabatan / Posisi
                  </label>
                  <input
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none"
                    disabled
                    readOnly
                    value={`${worker.jabatan || 'Pekerja Lapangan'} (Ditetapkan oleh Admin)`}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Tarif Per Jam
                  </label>
                  <input
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none"
                    disabled
                    readOnly
                    value={`${formatCurrency(worker.tarif_per_jam)} (Ditetapkan oleh Admin)`}
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
                    value="Pekerja (Terkunci)"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600">
                    Nama Perusahaan
                  </label>
                  <input
                    className="mt-1.5 w-full cursor-not-allowed rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm font-medium text-slate-500 outline-none"
                    disabled
                    readOnly
                    value="CV. Putra Anugrah Mandiri"
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50"
                  disabled={isSubmitting}
                  onClick={handleCancelEdit}
                  type="button"
                >
                  Batalkan
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-50"
                  disabled={isSubmitting}
                  type="submit"
                >
                  {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nama Lengkap
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {worker.nama}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ID Karyawan
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {worker.id_karyawan}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Jabatan / Posisi
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {worker.jabatan || 'Pekerja Lapangan'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Tarif Per Jam
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    {formatCurrency(worker.tarif_per_jam)}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email Kontak
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {extraData.email || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nomor Telepon
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {extraData.telepon || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nama Perusahaan
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-800">
                    CV. Putra Anugrah Mandiri
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Status Akun & Sesi
                  </dt>
                  <dd className="mt-1 inline-flex items-center gap-1.5 text-sm font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Aktif · Mode Pengujian Lokal
                  </dd>
                </div>
              </dl>

              <div className="rounded-xl border border-blue-100 bg-blue-50/70 p-4 text-xs leading-5 text-blue-800">
                <strong>Catatan Integrasi:</strong> Sistem autentikasi terpusat (login dan pengelolaan kata sandi) sedang dikembangkan oleh anggota tim lain. Profil saat ini menampilkan data langsung dari basis data pekerja CV. Putra Anugrah Mandiri.
              </div>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                  onClick={onSwitchEmployee}
                  type="button"
                >
                  Ganti Identitas Pengujian
                </button>
                <button
                  className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                  onClick={onBackToDashboard}
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

export default ProfilPekerja
