import { useEffect, useRef, useState } from 'react'
import { changePassword, updateProfile } from '../../api/auth.js'
import WorkerAvatar from '../../components/WorkerAvatar.jsx'
import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'
import { formatCurrency } from '../../utils/formatters.js'
import { compressImage, fileToDataUrl } from '../../utils/imageCompressor.js'

const WORKER_SETTINGS_KEY = 'pam_worker_settings'

const DEFAULT_SETTINGS = {
  density: 'normal',
  dateFormat: 'long',
  notifyNewJobs: true,
  notifyDeadlines: true,
}

const TABS = [
  { id: 'akun', label: 'Akun & Profil' },
  { id: 'keamanan', label: 'Keamanan & Kata Sandi' },
  { id: 'preferensi', label: 'Tampilan & Notifikasi' },
]

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

function buildInitialProfileForm(worker) {
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

function EyeIcon({ visible }) {
  return visible ? (
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
      <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
      <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
      <line x1="1" x2="23" y1="1" y2="23" />
    </svg>
  ) : (
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
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  )
}

function validateProfileValues(values) {
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
    errors.email = 'Format email tidak valid (contoh: nama@email.com).'
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

function validatePasswordValues(values) {
  const errors = {}
  if (!values.password_lama) {
    errors.password_lama = 'Kata sandi saat ini wajib diisi.'
  }
  if (!values.password_baru) {
    errors.password_baru = 'Kata sandi baru wajib diisi.'
  } else if (values.password_baru.length < 6) {
    errors.password_baru = 'Kata sandi baru minimal 6 karakter.'
  }
  if (!values.konfirmasi_password) {
    errors.konfirmasi_password = 'Konfirmasi kata sandi baru wajib diisi.'
  } else if (values.konfirmasi_password !== values.password_baru) {
    errors.konfirmasi_password = 'Konfirmasi kata sandi tidak cocok dengan kata sandi baru.'
  }
  return errors
}

function PengaturanPekerja({
  worker,
  onNavigate = () => {},
  onUpdateProfile,
  onChangePassword,
}) {
  const [activeTab, setActiveTab] = useState('akun')
  const [settings, setSettings] = useState(loadSavedSettings)

  const [profileForm, setProfileForm] = useState(() => buildInitialProfileForm(worker))
  const [profileErrors, setProfileErrors] = useState({})
  const [photoPreviewDataUrl, setPhotoPreviewDataUrl] = useState('')
  const [removePhotoRequested, setRemovePhotoRequested] = useState(false)
  const [photoStatusHint, setPhotoStatusHint] = useState('')
  const [savingProfile, setSavingProfile] = useState(false)

  const [passwordForm, setPasswordForm] = useState({
    password_lama: '',
    password_baru: '',
    konfirmasi_password: '',
  })
  const [passwordErrors, setPasswordErrors] = useState({})
  const [showCurrentPw, setShowCurrentPw] = useState(false)
  const [showNewPw, setShowNewPw] = useState(false)
  const [showConfirmPw, setShowConfirmPw] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)

  const [feedback, setFeedback] = useState({ type: '', message: '' })

  const fileInputRef = useRef(null)
  const namaRef = useRef(null)
  const emailRef = useRef(null)
  const noHpRef = useRef(null)
  const noRekeningRef = useRef(null)
  const pwOldRef = useRef(null)
  const pwNewRef = useRef(null)
  const pwConfirmRef = useRef(null)

  useEffect(() => {
    setProfileForm(buildInitialProfileForm(worker))
    setPhotoPreviewDataUrl('')
    setRemovePhotoRequested(false)
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

  useEffect(() => {
    document.documentElement.dataset.density = settings.density
  }, [settings.density])

  function showNotice(type, message) {
    setFeedback({ type, message })
  }

  function handleProfileFieldChange(field, value) {
    setProfileForm((prev) => ({ ...prev, [field]: value }))
    if (profileErrors[field]) {
      setProfileErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  function handlePasswordFieldChange(field, value) {
    setPasswordForm((prev) => ({ ...prev, [field]: value }))
    if (passwordErrors[field]) {
      setPasswordErrors((prev) => {
        const next = { ...prev }
        delete next[field]
        return next
      })
    }
  }

  async function handleSelectPhoto(event) {
    const file = event.target.files?.[0]
    event.target.value = ''
    if (!file) return

    if (!file.type.startsWith('image/')) {
      showNotice('error', 'File foto profil harus berupa gambar (JPG, PNG, atau WebP).')
      return
    }

    try {
      setPhotoStatusHint('Mengompres gambar...')
      const compressed = await compressImage(file, {
        maxWidth: 640,
        maxHeight: 640,
        quality: 0.82,
      })
      const dataUrl = await fileToDataUrl(compressed.file)
      setPhotoPreviewDataUrl(dataUrl)
      setRemovePhotoRequested(false)
      setPhotoStatusHint('Foto siap disimpan. Klik "Simpan Profil Akun" untuk menerapkan perubahan.')
      setFeedback({ type: '', message: '' })
    } catch (error) {
      setPhotoStatusHint('')
      showNotice('error', error?.message || 'Gagal memproses file foto profil.')
    }
  }

  function handleRemovePhoto() {
    setPhotoPreviewDataUrl('')
    setRemovePhotoRequested(true)
    setPhotoStatusHint('Foto profil akan dihapus setelah Anda klik "Simpan Profil Akun".')
  }

  function focusFirstProfileError(errors) {
    if (errors.nama) namaRef.current?.focus()
    else if (errors.email) emailRef.current?.focus()
    else if (errors.no_hp) noHpRef.current?.focus()
    else if (errors.no_rekening) noRekeningRef.current?.focus()
  }

  function focusFirstPasswordError(errors) {
    if (errors.password_lama) pwOldRef.current?.focus()
    else if (errors.password_baru) pwNewRef.current?.focus()
    else if (errors.konfirmasi_password) pwConfirmRef.current?.focus()
  }

  async function handleSubmitProfile(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })

    const errors = validateProfileValues(profileForm)
    if (Object.keys(errors).length > 0) {
      setProfileErrors(errors)
      focusFirstProfileError(errors)
      showNotice('error', 'Mohon periksa kembali data profil yang masih belum valid.')
      return
    }

    const payload = {
      nama: profileForm.nama.trim(),
      email: profileForm.email.trim(),
      no_hp: profileForm.no_hp.trim(),
      kontak_darurat: profileForm.kontak_darurat.trim(),
      alamat: profileForm.alamat.trim(),
      nama_bank: profileForm.nama_bank.trim(),
      no_rekening: profileForm.no_rekening.trim(),
    }

    if (photoPreviewDataUrl) {
      payload.foto_profil = photoPreviewDataUrl
    } else if (removePhotoRequested) {
      payload.hapus_foto_profil = true
    }

    setSavingProfile(true)
    try {
      const saveFn = onUpdateProfile || updateProfile
      const res = await saveFn(payload)
      setPhotoPreviewDataUrl('')
      setRemovePhotoRequested(false)
      setPhotoStatusHint('')
      setProfileErrors({})
      showNotice('success', res?.message || 'Profil akun pekerja berhasil diperbarui dan tersimpan ke database.')
    } catch (error) {
      showNotice('error', error?.message || 'Gagal menyimpan perubahan akun pekerja.')
    } finally {
      setSavingProfile(false)
    }
  }

  async function handleSubmitPassword(event) {
    event.preventDefault()
    setFeedback({ type: '', message: '' })

    const errors = validatePasswordValues(passwordForm)
    if (Object.keys(errors).length > 0) {
      setPasswordErrors(errors)
      focusFirstPasswordError(errors)
      showNotice('error', 'Mohon periksa kolom kata sandi sebelum menyimpan.')
      return
    }

    setSavingPassword(true)
    try {
      const changeFn = onChangePassword || changePassword
      const res = await changeFn({
        password_lama: passwordForm.password_lama,
        password_baru: passwordForm.password_baru,
      })
      setPasswordForm({
        password_lama: '',
        password_baru: '',
        konfirmasi_password: '',
      })
      setPasswordErrors({})
      showNotice('success', res?.message || 'Kata sandi akun berhasil diperbarui.')
    } catch (error) {
      showNotice('error', error?.message || 'Gagal mengubah kata sandi akun.')
    } finally {
      setSavingPassword(false)
    }
  }

  function handleSaveSettings(event) {
    event.preventDefault()
    try {
      localStorage.setItem(WORKER_SETTINGS_KEY, JSON.stringify(settings))
      document.documentElement.dataset.density = settings.density
      showNotice('success', 'Preferensi tampilan & notifikasi berhasil disimpan.')
    } catch {
      showNotice('success', 'Preferensi diterapkan pada sesi ini.')
    }
  }

  const displayedPhotoPath = removePhotoRequested
    ? ''
    : photoPreviewDataUrl || worker?.foto_profil || ''
  const hasExistingOrPreviewPhoto = Boolean(displayedPhotoPath)

  return (
    <div className="worker-settings-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Pengaturan"
        description="Perbarui data akun pribadi, foto profil, kontak WhatsApp, informasi rekening gaji, kata sandi, dan preferensi aplikasi."
        title="Pengaturan Akun Pekerja"
      />

      {feedback.message && (
        <div
          className={`flex items-center justify-between gap-3 rounded-2xl border px-5 py-4 text-sm font-semibold shadow-sm ${
            feedback.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role={feedback.type === 'error' ? 'alert' : 'status'}
        >
          <div className="flex items-center gap-3">
            <span
              className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-white ${
                feedback.type === 'error' ? 'bg-rose-600' : 'bg-emerald-600'
              }`}
            >
              {feedback.type === 'error' ? '!' : '✓'}
            </span>
            <span>{feedback.message}</span>
          </div>
          <button
            aria-label="Tutup pemberitahuan"
            className="text-xs font-bold opacity-75 transition hover:opacity-100"
            onClick={() => setFeedback({ type: '', message: '' })}
            type="button"
          >
            ✕
          </button>
        </div>
      )}

      {/* Ringkasan Akun Pekerja */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
        <div className="flex flex-col gap-4 rounded-xl border border-slate-100 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <WorkerAvatar
              className="h-14 w-14 rounded-2xl text-xl shadow-md shadow-emerald-600/15"
              name={profileForm.nama || worker?.nama || 'Pekerja'}
              photoPath={displayedPhotoPath}
            />
            <div className="min-w-0">
              <p className="truncate text-base font-bold text-slate-900">
                {profileForm.nama || worker?.nama || 'Pekerja'}
              </p>
              <p className="mt-0.5 text-xs font-semibold text-emerald-700">
                {worker?.jabatan || 'Pekerja Lapangan'} · ID Karyawan #{worker?.id_karyawan || '-'}
              </p>
              <p className="mt-0.5 truncate text-xs text-slate-500">
                {profileForm.email || worker?.email || 'Email belum diatur'}
                {profileForm.no_hp ? ` · WA: ${profileForm.no_hp}` : ''}
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

      {/* Tab Navigasi Pengaturan */}
      <div
        aria-label="Bagian pengaturan akun pekerja"
        className="flex flex-wrap gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm"
        role="tablist"
      >
        {TABS.map((tab) => {
          const isSelected = activeTab === tab.id
          return (
            <button
              aria-controls={`panel-${tab.id}`}
              aria-selected={isSelected}
              className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
              id={`tab-${tab.id}`}
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id)
                setFeedback({ type: '', message: '' })
              }}
              role="tab"
              type="button"
            >
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* PANEL 1: AKUN & PROFIL */}
      {activeTab === 'akun' && (
        <section
          aria-labelledby="heading-edit-akun"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
          id="panel-akun"
          role="tabpanel"
        >
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900" id="heading-edit-akun">
              Edit Akun & Informasi Pribadi
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Perubahan yang disimpan akan langsung memperbarui akun login dan data karyawan Anda di server.
            </p>
          </div>

          <form
            aria-labelledby="heading-edit-akun"
            className="mt-6 space-y-6"
            method="POST"
            noValidate
            onSubmit={handleSubmitProfile}
          >
            {/* Upload Foto Profil */}
            <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <WorkerAvatar
                  className="h-16 w-16 rounded-2xl text-2xl shadow-sm"
                  name={profileForm.nama || worker?.nama || 'Pekerja'}
                  photoPath={displayedPhotoPath}
                />
                <div>
                  <p className="text-sm font-bold text-slate-900">Foto Profil Karyawan</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    Format JPG, PNG, atau WebP. Gambar otomatis dikompres agar cepat diunggah.
                  </p>
                  {photoStatusHint && (
                    <p className="mt-1 text-xs font-medium text-emerald-700" role="status">
                      {photoStatusHint}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <input
                  accept="image/jpeg,image/png,image/webp"
                  className="visually-hidden"
                  id="worker-photo-input"
                  onChange={handleSelectPhoto}
                  ref={fileInputRef}
                  type="file"
                />
                <button
                  className="rounded-xl border border-emerald-200 bg-white px-4 py-2 text-xs font-bold text-emerald-700 shadow-sm transition hover:bg-emerald-50"
                  onClick={() => fileInputRef.current?.click()}
                  type="button"
                >
                  {hasExistingOrPreviewPhoto ? 'Ganti Foto' : 'Unggah Foto'}
                </button>
                {hasExistingOrPreviewPhoto && (
                  <button
                    className="rounded-xl border border-rose-200 bg-white px-3.5 py-2 text-xs font-semibold text-rose-600 transition hover:bg-rose-50"
                    onClick={handleRemovePhoto}
                    type="button"
                  >
                    Hapus Foto
                  </button>
                )}
              </div>
            </div>

            {/* Data Akun Utama */}
            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-nama">
                  Nama Lengkap <span className="text-rose-600">*</span>
                </label>
                <p className="mt-1 text-xs text-slate-500" id="worker-nama-hint">
                  Digunakan pada dashboard, daftar tugas, dan slip gaji.
                </p>
                <input
                  aria-describedby={profileErrors.nama ? 'worker-nama-error worker-nama-hint' : 'worker-nama-hint'}
                  aria-invalid={Boolean(profileErrors.nama)}
                  autoComplete="name"
                  className="worker-validated-field mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="worker-nama"
                  maxLength={100}
                  minLength={3}
                  name="nama"
                  onChange={(e) => handleProfileFieldChange('nama', e.target.value)}
                  ref={namaRef}
                  required
                  type="text"
                  value={profileForm.nama}
                />
                {profileErrors.nama && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600" id="worker-nama-error" role="alert">
                    {profileErrors.nama}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-email">
                  Email Akun (Login) <span className="text-rose-600">*</span>
                </label>
                <p className="mt-1 text-xs text-slate-500" id="worker-email-hint">
                  Digunakan untuk masuk ke portal karyawan.
                </p>
                <input
                  aria-describedby={profileErrors.email ? 'worker-email-error worker-email-hint' : 'worker-email-hint'}
                  aria-invalid={Boolean(profileErrors.email)}
                  autoCapitalize="none"
                  autoComplete="email"
                  autoCorrect="off"
                  className="worker-validated-field mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="worker-email"
                  name="email"
                  onChange={(e) => handleProfileFieldChange('email', e.target.value)}
                  ref={emailRef}
                  required
                  spellCheck={false}
                  type="email"
                  value={profileForm.email}
                />
                {profileErrors.email && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600" id="worker-email-error" role="alert">
                    {profileErrors.email}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-no-hp">
                  Nomor HP / WhatsApp
                </label>
                <p className="mt-1 text-xs text-slate-500" id="worker-no-hp-hint">
                  Contoh: 081234567890 atau +6281234567890.
                </p>
                <input
                  aria-describedby={profileErrors.no_hp ? 'worker-no-hp-error worker-no-hp-hint' : 'worker-no-hp-hint'}
                  aria-invalid={Boolean(profileErrors.no_hp)}
                  autoComplete="tel"
                  className="worker-validated-field mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="worker-no-hp"
                  inputMode="tel"
                  name="no_hp"
                  onChange={(e) => handleProfileFieldChange('no_hp', e.target.value)}
                  placeholder="0812-3456-7890"
                  ref={noHpRef}
                  type="tel"
                  value={profileForm.no_hp}
                />
                {profileErrors.no_hp && (
                  <p className="mt-1.5 text-xs font-semibold text-rose-600" id="worker-no-hp-error" role="alert">
                    {profileErrors.no_hp}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-kontak-darurat">
                  Kontak Darurat
                </label>
                <p className="mt-1 text-xs text-slate-500" id="worker-darurat-hint">
                  Nama keluarga / nomor yang dapat dihubungi dalam keadaan darurat.
                </p>
                <input
                  aria-describedby="worker-darurat-hint"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="worker-kontak-darurat"
                  maxLength={120}
                  name="kontak_darurat"
                  onChange={(e) => handleProfileFieldChange('kontak_darurat', e.target.value)}
                  placeholder="Contoh: Ibu Ani — 0813xxxx"
                  type="text"
                  value={profileForm.kontak_darurat}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-alamat">
                  Alamat Domisili
                </label>
                <textarea
                  autoComplete="street-address"
                  className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="worker-alamat"
                  maxLength={500}
                  name="alamat"
                  onChange={(e) => handleProfileFieldChange('alamat', e.target.value)}
                  placeholder="Masukkan alamat tempat tinggal saat ini"
                  rows={3}
                  value={profileForm.alamat}
                />
              </div>
            </div>

            {/* Info Rekening Pembayaran Gaji */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-5">
              <h3 className="text-sm font-bold text-slate-900">Informasi Rekening Penerimaan Gaji</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Opsional — membantu admin memverifikasi tujuan transfer upah kerja.
              </p>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-nama-bank">
                    Nama Bank / E-Wallet
                  </label>
                  <input
                    className="mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    id="worker-nama-bank"
                    maxLength={60}
                    name="nama_bank"
                    onChange={(e) => handleProfileFieldChange('nama_bank', e.target.value)}
                    placeholder="Contoh: BCA, BRI, Mandiri, DANA"
                    type="text"
                    value={profileForm.nama_bank}
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="worker-no-rekening">
                    Nomor Rekening / Akun
                  </label>
                  <input
                    aria-describedby={profileErrors.no_rekening ? 'worker-rekening-error' : undefined}
                    aria-invalid={Boolean(profileErrors.no_rekening)}
                    className="worker-validated-field mt-2 w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                    id="worker-no-rekening"
                    inputMode="numeric"
                    maxLength={60}
                    name="no_rekening"
                    onChange={(e) => handleProfileFieldChange('no_rekening', e.target.value)}
                    placeholder="Masukkan nomor rekening"
                    ref={noRekeningRef}
                    type="text"
                    value={profileForm.no_rekening}
                  />
                  {profileErrors.no_rekening && (
                    <p className="mt-1.5 text-xs font-semibold text-rose-600" id="worker-rekening-error" role="alert">
                      {profileErrors.no_rekening}
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Data Kepegawaian Read-Only */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-bold text-slate-900">Informasi Kepegawaian (Dikelola Admin)</h3>
                <span className="rounded-full bg-slate-200/80 px-2.5 py-0.5 text-[11px] font-semibold text-slate-600">
                  Hanya Baca
                </span>
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div className="rounded-xl bg-white p-3.5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">ID Karyawan</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">#{worker?.id_karyawan || '-'}</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Jabatan / Keahlian</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{worker?.jabatan || 'Pekerja Lapangan'}</p>
                </div>
                <div className="rounded-xl bg-white p-3.5 shadow-xs">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Tarif Per Jam</p>
                  <p className="mt-1 text-sm font-bold text-emerald-700">
                    {worker?.tarif_per_jam ? `${formatCurrency(worker.tarif_per_jam)} / jam` : 'Mengikuti ketentuan admin'}
                  </p>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingProfile}
                type="submit"
              >
                <span>{savingProfile ? 'Menyimpan Profil...' : 'Simpan Profil Akun'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* PANEL 2: KEAMANAN & KATA SANDI */}
      {activeTab === 'keamanan' && (
        <section
          aria-labelledby="heading-keamanan-akun"
          className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7"
          id="panel-keamanan"
          role="tabpanel"
        >
          <div className="border-b border-slate-100 pb-4">
            <h2 className="text-lg font-bold text-slate-900" id="heading-keamanan-akun">
              Ubah Kata Sandi Akun
            </h2>
            <p className="mt-1 text-xs text-slate-500">
              Gunakan kata sandi yang kuat (minimal 6 karakter) dan jangan bagikan ke orang lain.
            </p>
          </div>

          <form
            aria-labelledby="heading-keamanan-akun"
            className="mt-6 max-w-xl space-y-5"
            method="POST"
            noValidate
            onSubmit={handleSubmitPassword}
          >
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="pw-current">
                Kata Sandi Saat Ini
              </label>
              <div className="relative mt-2">
                <input
                  aria-describedby={passwordErrors.password_lama ? 'pw-current-error' : undefined}
                  aria-invalid={Boolean(passwordErrors.password_lama)}
                  autoComplete="current-password"
                  className="worker-validated-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="pw-current"
                  name="password_lama"
                  onChange={(e) => handlePasswordFieldChange('password_lama', e.target.value)}
                  ref={pwOldRef}
                  required
                  type={showCurrentPw ? 'text' : 'password'}
                  value={passwordForm.password_lama}
                />
                <button
                  aria-label="Tampilkan kata sandi saat ini"
                  aria-pressed={showCurrentPw}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowCurrentPw((prev) => !prev)}
                  type="button"
                >
                  <EyeIcon visible={showCurrentPw} />
                </button>
              </div>
              {passwordErrors.password_lama && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600" id="pw-current-error" role="alert">
                  {passwordErrors.password_lama}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="pw-new">
                Kata Sandi Baru
              </label>
              <p className="mt-1 text-xs text-slate-500" id="pw-new-hint">
                Minimal 6 karakter; disarankan kombinasi huruf dan angka.
              </p>
              <div className="relative mt-2">
                <input
                  aria-describedby={passwordErrors.password_baru ? 'pw-new-error pw-new-hint' : 'pw-new-hint'}
                  aria-invalid={Boolean(passwordErrors.password_baru)}
                  autoComplete="new-password"
                  className="worker-validated-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="pw-new"
                  minLength={6}
                  name="password_baru"
                  onChange={(e) => handlePasswordFieldChange('password_baru', e.target.value)}
                  ref={pwNewRef}
                  required
                  type={showNewPw ? 'text' : 'password'}
                  value={passwordForm.password_baru}
                />
                <button
                  aria-label="Tampilkan kata sandi baru"
                  aria-pressed={showNewPw}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowNewPw((prev) => !prev)}
                  type="button"
                >
                  <EyeIcon visible={showNewPw} />
                </button>
              </div>
              {passwordErrors.password_baru && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600" id="pw-new-error" role="alert">
                  {passwordErrors.password_baru}
                </p>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700" htmlFor="pw-confirm">
                Konfirmasi Kata Sandi Baru
              </label>
              <div className="relative mt-2">
                <input
                  aria-describedby={passwordErrors.konfirmasi_password ? 'pw-confirm-error' : undefined}
                  aria-invalid={Boolean(passwordErrors.konfirmasi_password)}
                  autoComplete="new-password"
                  className="worker-validated-field w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 pr-11 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20"
                  id="pw-confirm"
                  minLength={6}
                  name="konfirmasi_password"
                  onChange={(e) => handlePasswordFieldChange('konfirmasi_password', e.target.value)}
                  ref={pwConfirmRef}
                  required
                  type={showConfirmPw ? 'text' : 'password'}
                  value={passwordForm.konfirmasi_password}
                />
                <button
                  aria-label="Tampilkan konfirmasi kata sandi baru"
                  aria-pressed={showConfirmPw}
                  className="absolute inset-y-0 right-0 flex items-center px-3.5 text-slate-500 hover:text-slate-700"
                  onClick={() => setShowConfirmPw((prev) => !prev)}
                  type="button"
                >
                  <EyeIcon visible={showConfirmPw} />
                </button>
              </div>
              {passwordErrors.konfirmasi_password && (
                <p className="mt-1.5 text-xs font-semibold text-rose-600" id="pw-confirm-error" role="alert">
                  {passwordErrors.konfirmasi_password}
                </p>
              )}
            </div>

            <div className="pt-2">
              <button
                className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={savingPassword}
                type="submit"
              >
                <span>{savingPassword ? 'Memperbarui Kata Sandi...' : 'Perbarui Kata Sandi'}</span>
              </button>
            </div>
          </form>
        </section>
      )}

      {/* PANEL 3: PREFERENSI TAMPILAN & NOTIFIKASI */}
      {activeTab === 'preferensi' && (
        <form
          aria-labelledby="heading-preferensi-tampilan"
          id="panel-preferensi"
          method="POST"
          onSubmit={handleSaveSettings}
          role="tabpanel"
        >
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Preferensi Tampilan */}
            <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div>
                <h2 className="text-base font-bold text-slate-900" id="heading-preferensi-tampilan">
                  Preferensi Tampilan
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Sesuaikan kepadatan tata letak antarmuka dan format tanggal pada perangkat ini.
                </p>

                <div className="mt-6 space-y-5">
                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                      htmlFor="worker-density"
                    >
                      Kepadatan Tampilan (Density)
                    </label>
                    <select
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      id="worker-density"
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          density: e.target.value,
                        }))
                      }
                      value={settings.density}
                    >
                      <option value="normal">Normal — Tampilan Standar & Lapang</option>
                      <option value="compact">Compact — Lebih Padat untuk Banyak Data</option>
                    </select>
                  </div>

                  <div>
                    <label
                      className="block text-xs font-bold uppercase tracking-wider text-slate-600"
                      htmlFor="worker-date-format"
                    >
                      Format Tanggal Tugas
                    </label>
                    <select
                      className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm font-medium text-slate-800 outline-none transition focus:border-emerald-500 focus:bg-white focus:ring-2 focus:ring-emerald-500/20"
                      id="worker-date-format"
                      onChange={(e) =>
                        setSettings((prev) => ({
                          ...prev,
                          dateFormat: e.target.value,
                        }))
                      }
                      value={settings.dateFormat}
                    >
                      <option value="long">Lengkap (Contoh: 12 November 2026)</option>
                      <option value="short">Ringkas (Contoh: 12/11/2026)</option>
                    </select>
                  </div>
                </div>
              </div>
            </section>

            {/* Preferensi Notifikasi */}
            <section className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-6 shadow-sm sm:p-7">
              <div>
                <h2 className="text-base font-bold text-slate-900">Preferensi Notifikasi</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Atur pengingat pekerjaan dan batas waktu penugasan.
                </p>

                <div className="mt-6 space-y-4">
                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
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

                  <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 transition hover:bg-slate-50">
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
                        Dapatkan peringatan ketika tugas pada menu List Pekerjaan mendekati target selesai.
                      </span>
                    </div>
                  </label>
                </div>
              </div>

              <div className="mt-6 flex justify-end">
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-emerald-600/20 transition hover:bg-emerald-700"
                  type="submit"
                >
                  <span>Simpan Preferensi</span>
                </button>
              </div>
            </section>
          </div>
        </form>
      )}
    </div>
  )
}

export default PengaturanPekerja
