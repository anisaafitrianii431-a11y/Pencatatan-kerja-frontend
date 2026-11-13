import { useEffect, useRef, useState } from 'react'
import { updateProfile } from '../../api/auth.js'
import WorkerAvatar from '../../components/WorkerAvatar.jsx'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { formatCurrency } from '../../utils/formatters.js'

function buildFormFromWorker(worker) {
  return {
    nama: worker?.nama || '',
    email: worker?.email || '',
    no_hp: worker?.no_hp || '',
    kontak_darurat: worker?.kontak_darurat || '',
    alamat: worker?.alamat || '',
    nama_bank: worker?.nama_bank || '',
    no_rekening: worker?.no_rekening || '',
  }
}

function validateProfilForm(values) {
  const errors = {}
  const nama = values.nama.trim()
  const email = values.email.trim()
  const noHp = values.no_hp.trim()
  const noRekening = values.no_rekening.trim()

  if (!nama) {
    errors.nama = 'Nama lengkap wajib diisi.'
  } else if (nama.length < 3 || nama.length > 100) {
    errors.nama = 'Nama lengkap harus antara 3 hingga 100 karakter.'
  }

  if (!email) {
    errors.email = 'Alamat email akun wajib diisi.'
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    errors.email = 'Format email tidak valid.'
  }

  if (noHp) {
    const digitsOnly = noHp.replace(/\D+/g, '')
    if (!/^[0-9+\-\s()]{8,25}$/.test(noHp) || digitsOnly.length < 8 || digitsOnly.length > 16) {
      errors.no_hp = 'Nomor HP/WhatsApp harus terdiri dari 8–16 digit angka.'
    }
  }

  if (noRekening && !/^[0-9\-\s]{4,40}$/.test(noRekening)) {
    errors.no_rekening = 'Nomor rekening hanya boleh berisi angka, spasi, atau tanda hubung (minimal 4 digit).'
  }

  return errors
}

function ProfilPekerja({
  worker,
  onUpdateWorker,
  onNavigate = () => {},
  onBackToDashboard,
}) {
  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState(() => buildFormFromWorker(worker))
  const [fieldErrors, setFieldErrors] = useState({})
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  const namaRef = useRef(null)
  const emailRef = useRef(null)
  const noHpRef = useRef(null)
  const noRekeningRef = useRef(null)

  useEffect(() => {
    if (worker) {
      setFormData(buildFormFromWorker(worker))
      setFieldErrors({})
      setIsEditing(false)
      setErrorMessage('')
    }
  }, [
    worker?.id_karyawan,
    worker?.nama,
    worker?.email,
    worker?.no_hp,
    worker?.kontak_darurat,
    worker?.alamat,
    worker?.nama_bank,
    worker?.no_rekening,
    worker?.foto_profil,
  ])

  if (!worker) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
        Data pekerja belum tersedia.
      </div>
    )
  }

  function handleFieldChange(field, value) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (fieldErrors[field]) {
      setFieldErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handleStartEdit() {
    setFormData(buildFormFromWorker(worker))
    setFieldErrors({})
    setErrorMessage('')
    setSuccessMessage('')
    setIsEditing(true)
  }

  function handleCancelEdit() {
    setFormData(buildFormFromWorker(worker))
    setFieldErrors({})
    setErrorMessage('')
    setIsEditing(false)
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    const errors = validateProfilForm(formData)
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors)
      if (errors.nama) namaRef.current?.focus()
      else if (errors.email) emailRef.current?.focus()
      else if (errors.no_hp) noHpRef.current?.focus()
      else if (errors.no_rekening) noRekeningRef.current?.focus()
      setErrorMessage('Mohon periksa kembali kolom yang masih belum valid.')
      return
    }

    setIsSubmitting(true)
    try {
      const saveFn = onUpdateWorker || updateProfile
      const res = await saveFn({
        nama: formData.nama.trim(),
        email: formData.email.trim(),
        no_hp: formData.no_hp.trim(),
        kontak_darurat: formData.kontak_darurat.trim(),
        alamat: formData.alamat.trim(),
        nama_bank: formData.nama_bank.trim(),
        no_rekening: formData.no_rekening.trim(),
      })

      setIsEditing(false)
      setFieldErrors({})
      setSuccessMessage(res?.message || 'Profil pekerja berhasil diperbarui!')
    } catch (err) {
      setErrorMessage(err?.message || 'Gagal menyimpan pembaruan profil pekerja.')
    } finally {
      setIsSubmitting(false)
    }
  }

  function handleGoDashboard() {
    if (onBackToDashboard) {
      onBackToDashboard()
    } else {
      onNavigate('Dashboard')
    }
  }

  const rekeningText =
    worker.nama_bank || worker.no_rekening
      ? `${worker.nama_bank || 'Bank/E-Wallet'} · ${worker.no_rekening || 'Belum diisi'}`
      : '—'

  return (
    <div className="worker-profile-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Profil Saya"
        description="Informasi identitas akun, kontak WhatsApp, alamat, dan detail kepegawaian CV. Putra Anugrah Mandiri."
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
            aria-label="Tutup pemberitahuan"
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
              <WorkerAvatar
                className="h-16 w-16 rounded-2xl text-2xl shadow-lg shadow-emerald-600/20 ring-4 ring-emerald-100"
                name={worker.nama || 'Pekerja'}
                photoPath={worker.foto_profil || ''}
              />
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900 sm:text-2xl">
                    {worker.nama}
                  </h2>
                  <span className="inline-flex items-center rounded-lg bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                    Pekerja Aktif
                  </span>
                </div>
                <p className="mt-0.5 text-sm font-semibold text-emerald-700">
                  {worker.jabatan || 'Pekerja Lapangan'}
                </p>
                <p className="text-xs text-slate-500">
                  {worker.email || 'CV. Putra Anugrah Mandiri'}
                </p>
              </div>
            </div>

            {!isEditing && (
              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  className="inline-flex items-center justify-center gap-2 rounded-xl border border-emerald-200 bg-white px-4 py-2.5 text-sm font-semibold text-emerald-700 shadow-xs transition hover:bg-emerald-50"
                  onClick={() => onNavigate('Pengaturan')}
                  type="button"
                >
                  <span>Kelola Foto &amp; Sandi →</span>
                </button>
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
              </div>
            )}
          </div>
        </div>

        {/* Konten Profil (View Mode vs Edit Mode) */}
        <div className="p-6 sm:p-8">
          {isEditing ? (
            <form
              aria-label="Edit profil pekerja"
              className="space-y-5"
              method="POST"
              noValidate
              onSubmit={handleSubmit}
            >
              <div className="rounded-xl border border-emerald-100 bg-emerald-50/70 p-4 text-xs leading-5 text-emerald-900">
                <strong>Ketentuan Hak Akses Profil:</strong> Pekerja dapat memperbarui nama, email login, nomor WhatsApp, kontak darurat, alamat domisili, dan rekening pembayaran. Untuk mengganti foto profil atau kata sandi, gunakan menu{' '}
                <button
                  className="font-bold underline hover:text-emerald-700"
                  onClick={() => onNavigate('Pengaturan')}
                  type="button"
                >
                  Pengaturan
                </button>
                .
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-nama">
                    Nama Lengkap <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-describedby={fieldErrors.nama ? 'profil-nama-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.nama)}
                    autoComplete="name"
                    className="worker-validated-field mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-nama"
                    maxLength={100}
                    minLength={3}
                    name="nama"
                    onChange={(e) => handleFieldChange('nama', e.target.value)}
                    placeholder="Nama Lengkap Pekerja"
                    ref={namaRef}
                    required
                    type="text"
                    value={formData.nama}
                  />
                  {fieldErrors.nama && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" id="profil-nama-error" role="alert">
                      {fieldErrors.nama}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-email">
                    Email Akun <span className="text-rose-500">*</span>
                  </label>
                  <input
                    aria-describedby={fieldErrors.email ? 'profil-email-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.email)}
                    autoCapitalize="none"
                    autoComplete="email"
                    autoCorrect="off"
                    className="worker-validated-field mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-email"
                    name="email"
                    onChange={(e) => handleFieldChange('email', e.target.value)}
                    placeholder="nama@email.com"
                    ref={emailRef}
                    required
                    spellCheck={false}
                    type="email"
                    value={formData.email}
                  />
                  {fieldErrors.email && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" id="profil-email-error" role="alert">
                      {fieldErrors.email}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-no-hp">
                    Nomor HP / WhatsApp
                  </label>
                  <input
                    aria-describedby={fieldErrors.no_hp ? 'profil-no-hp-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.no_hp)}
                    autoComplete="tel"
                    className="worker-validated-field mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-no-hp"
                    inputMode="tel"
                    name="no_hp"
                    onChange={(e) => handleFieldChange('no_hp', e.target.value)}
                    placeholder="0812-3456-7890"
                    ref={noHpRef}
                    type="tel"
                    value={formData.no_hp}
                  />
                  {fieldErrors.no_hp && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" id="profil-no-hp-error" role="alert">
                      {fieldErrors.no_hp}
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-kontak-darurat">
                    Kontak Darurat
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-kontak-darurat"
                    maxLength={120}
                    name="kontak_darurat"
                    onChange={(e) => handleFieldChange('kontak_darurat', e.target.value)}
                    placeholder="Nama keluarga &amp; nomor darurat"
                    type="text"
                    value={formData.kontak_darurat}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-nama-bank">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-nama-bank"
                    maxLength={60}
                    name="nama_bank"
                    onChange={(e) => handleFieldChange('nama_bank', e.target.value)}
                    placeholder="Contoh: BCA, BRI, DANA"
                    type="text"
                    value={formData.nama_bank}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-no-rekening">
                    Nomor Rekening
                  </label>
                  <input
                    aria-describedby={fieldErrors.no_rekening ? 'profil-rekening-error' : undefined}
                    aria-invalid={Boolean(fieldErrors.no_rekening)}
                    className="worker-validated-field mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-no-rekening"
                    inputMode="numeric"
                    maxLength={60}
                    name="no_rekening"
                    onChange={(e) => handleFieldChange('no_rekening', e.target.value)}
                    placeholder="Nomor rekening penerima gaji"
                    ref={noRekeningRef}
                    type="text"
                    value={formData.no_rekening}
                  />
                  {fieldErrors.no_rekening && (
                    <p className="mt-1 text-xs font-semibold text-rose-600" id="profil-rekening-error" role="alert">
                      {fieldErrors.no_rekening}
                    </p>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-600" htmlFor="profil-alamat">
                    Alamat Domisili
                  </label>
                  <textarea
                    autoComplete="street-address"
                    className="mt-1.5 w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10"
                    id="profil-alamat"
                    maxLength={500}
                    name="alamat"
                    onChange={(e) => handleFieldChange('alamat', e.target.value)}
                    placeholder="Alamat domisili saat ini"
                    rows={3}
                    value={formData.alamat}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-slate-100 pt-5">
                <button
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
                  disabled={isSubmitting}
                  onClick={handleCancelEdit}
                  type="button"
                >
                  Batal
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={isSubmitting}
                  type="submit"
                >
                  <span>{isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <dl className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    ID Karyawan
                  </dt>
                  <dd className="mt-1 text-base font-bold text-slate-800">
                    #{worker.id_karyawan}
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
                  <dd className="mt-1 text-base font-bold text-emerald-700">
                    {worker.tarif_per_jam ? formatCurrency(worker.tarif_per_jam) : '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Email Akun
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700 break-all">
                    {worker.email || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Nomor HP / WhatsApp
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {worker.no_hp || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Kontak Darurat
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {worker.kontak_darurat || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:col-span-2">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Alamat Domisili
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {worker.alamat || '—'}
                  </dd>
                </div>

                <div className="rounded-xl border border-slate-100 bg-slate-50/70 p-4">
                  <dt className="text-xs font-semibold uppercase tracking-wider text-slate-400">
                    Rekening Gaji
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-slate-700">
                    {rekeningText}
                  </dd>
                </div>
              </dl>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <button
                  className="rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-slate-900"
                  onClick={handleGoDashboard}
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
