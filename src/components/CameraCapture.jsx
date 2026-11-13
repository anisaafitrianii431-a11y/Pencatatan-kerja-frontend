import { useRef, useState, useEffect, useCallback, useId } from 'react'
import {
  calculateDistanceMeters,
  formatCoordPair,
  getGoogleMapsUrl,
  getLocationMatchMeta,
} from '../utils/geoLocation.js'
import { getSyncedJakartaNow, syncNtpTime } from '../utils/ntpTime.js'

/**
 * CameraCapture — Dialog kamera langsung (<dialog> native) + GPS untuk absensi pekerjaan.
 * Menampilkan perbandingan real-time antara koordinat GPS pekerja dan titik lokasi pekerjaan.
 */
export default function CameraCapture({
  mode = 'masuk',
  job = null,
  onCapture,
  onCancel,
  isSubmitting = false,
  submitError = '',
}) {
  const dialogRef = useRef(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const pointerStartedOutsideRef = useRef(false)
  const titleId = useId()
  const noteInputId = useId()

  const [fase, setFase] = useState('loading') // 'loading' | 'kamera' | 'preview' | 'error'
  const [errorMsg, setErrorMsg] = useState('')
  const [snapshot, setSnapshot] = useState(null)
  const [lokasi, setLokasi] = useState(null) // { lat, lng, coordText, alamat }
  const [lokasiError, setLokasiError] = useState('')
  const [loadingLokasi, setLoadingLokasi] = useState(true)
  const [facingMode, setFacingMode] = useState('user')
  const [catatan, setCatatan] = useState('')
  const [isOvernight, setIsOvernight] = useState(false)
  const [capturedNtp, setCapturedNtp] = useState(null)

  const stopCameraStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const fetchCurrentLocation = useCallback(async () => {
    setLoadingLokasi(true)
    setLokasiError('')

    if (!navigator.geolocation) {
      setLokasiError('Browser atau perangkat tidak mendukung GPS / geolokasi.')
      setLoadingLokasi(false)
      return null
    }

    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        async (pos) => {
          const lat = Number(pos.coords.latitude)
          const lng = Number(pos.coords.longitude)
          const coordText = formatCoordPair(lat, lng)
          let alamat = coordText

          try {
            const res = await fetch(
              `https://nominatim.openstreetmap.org/reverse?lat=${lat.toFixed(6)}&lon=${lng.toFixed(6)}&format=json&accept-language=id`,
              { headers: { 'Accept-Language': 'id' } },
            )
            if (res.ok) {
              const data = await res.json()
              if (data?.display_name) alamat = data.display_name
            }
          } catch {
            // Fallback ke string koordinat jika reverse geocoding gagal/offline
          }

          const resolved = { lat, lng, coordText, alamat }
          setLokasi(resolved)
          setLoadingLokasi(false)
          resolve(resolved)
        },
        (err) => {
          const message =
            err.code === 1
              ? 'Izin akses lokasi GPS ditolak. Aktifkan izin lokasi browser lalu klik Deteksi Ulang GPS.'
              : 'Gagal mendeteksi titik GPS. Pastikan layanan lokasi aktif lalu coba lagi.'
          setLokasiError(message)
          setLoadingLokasi(false)
          resolve(null)
        },
        { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 },
      )
    })
  }, [])

  const startCamera = useCallback(
    async (facing = facingMode) => {
      stopCameraStream()
      setFase('loading')
      setErrorMsg('')

      if (!navigator.mediaDevices?.getUserMedia) {
        setErrorMsg('Browser tidak mendukung akses kamera langsung (getUserMedia).')
        setFase('error')
        return
      }

      try {
        let stream
        try {
          stream = await navigator.mediaDevices.getUserMedia({
            video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 720 } },
            audio: false,
          })
        } catch {
          // Fallback otomatis ke kamera apa pun yang tersedia (mis. webcam laptop)
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          })
        }

        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
        }
        setFase('kamera')
      } catch (err) {
        setErrorMsg(
          err?.name === 'NotAllowedError'
            ? 'Izin kamera ditolak. Mohon izinkan akses kamera di pengaturan browser Anda.'
            : `Kamera langsung tidak dapat diakses: ${err?.message || 'Perangkat tidak ditemukan'}`,
        )
        setFase('error')
      }
    },
    [facingMode, stopCameraStream],
  )

  useEffect(() => {
    const dialog = dialogRef.current
    if (dialog && !dialog.open) {
      dialog.showModal()
    }
    syncNtpTime({ force: true })
    startCamera('user')
    fetchCurrentLocation()

    return () => {
      stopCameraStream()
      if (dialog?.open) {
        dialog.close()
      }
    }
  }, [fetchCurrentLocation, startCamera, stopCameraStream])

  const handleCancelEvent = (event) => {
    event.preventDefault()
    if (isSubmitting) return
    stopCameraStream()
    onCancel?.()
  }

  const handleDialogPointerDown = (event) => {
    const dialog = dialogRef.current
    if (!dialog) return
    const rect = dialog.getBoundingClientRect()
    pointerStartedOutsideRef.current =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
  }

  const handleDialogPointerUp = (event) => {
    if (isSubmitting) return
    const dialog = dialogRef.current
    if (!dialog || !pointerStartedOutsideRef.current) return
    const rect = dialog.getBoundingClientRect()
    const releasedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    if (releasedOutside) {
      stopCameraStream()
      onCancel?.()
    }
  }

  const handleAmbilFoto = () => {
    if (!videoRef.current || !canvasRef.current) return
    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth || 1280
    canvas.height = video.videoHeight || 720

    const ctx = canvas.getContext('2d')
    ctx.save()
    if (facingMode === 'user') {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    ctx.restore()

    const dataURL = canvas.toDataURL('image/jpeg', 0.82)
    setCapturedNtp(getSyncedJakartaNow())
    setSnapshot(dataURL)
    stopCameraStream()
    setFase('preview')
    if (!lokasi?.coordText && !loadingLokasi) {
      fetchCurrentLocation()
    }
  }

  const handleUlangi = () => {
    setSnapshot(null)
    setCapturedNtp(null)
    startCamera(facingMode)
  }

  const handleFlip = () => {
    const nextFacing = facingMode === 'user' ? 'environment' : 'user'
    setFacingMode(nextFacing)
    startCamera(nextFacing)
  }

  const handleSubmitFoto = async () => {
    if (!snapshot || !lokasi?.coordText || isSubmitting) return
    await onCapture?.({
      foto: snapshot,
      titik_lokasi: lokasi.coordText,
      lokasi,
      catatan: catatan.trim(),
      is_overnight: isOvernight,
    })
  }

  const distanceMeters = calculateDistanceMeters(lokasi?.coordText, job?.titik_lokasi)
  const locationMeta = getLocationMatchMeta(
    distanceMeters,
    Boolean(job?.titik_lokasi && String(job.titik_lokasi).trim()),
    Boolean(lokasi?.coordText),
  )
  const isMasuk = mode === 'masuk'
  const headerAccent = isMasuk ? 'text-emerald-700' : 'text-rose-700'
  const jobMapUrl = getGoogleMapsUrl(job?.titik_lokasi)
  const workerMapUrl = getGoogleMapsUrl(lokasi?.coordText)

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={titleId}
      onCancel={handleCancelEvent}
      onPointerDown={handleDialogPointerDown}
      onPointerUp={handleDialogPointerUp}
      className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-slate-50/80 px-5 py-4">
        <div className="min-w-0">
          <h2 id={titleId} className={`text-base font-bold ${headerAccent}`}>
            {isMasuk ? '📸 Ambil Absen Masuk' : '🏠 Ambil Absen Pulang'}
          </h2>
          {job?.nama_pekerjaan && (
            <p className="mt-0.5 truncate text-xs font-semibold text-slate-800">
              Pekerjaan: {job.nama_pekerjaan}
            </p>
          )}
          <p className="mt-0.5 text-[11px] text-slate-500">
            Foto kamera langsung &amp; titik GPS akan dikirim untuk persetujuan Admin.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            if (isSubmitting) return
            stopCameraStream()
            onCancel?.()
          }}
          disabled={isSubmitting}
          aria-label="Tutup dialog kamera"
          className="rounded-lg border border-slate-200 bg-white p-1.5 text-slate-500 transition hover:bg-slate-100 hover:text-slate-800 disabled:opacity-50"
        >
          ✕
        </button>
      </div>

      {/* Body */}
      <div className="max-h-[75vh] space-y-4 overflow-y-auto p-5">
        {/* Ringkasan Titik Lokasi Pekerjaan vs GPS Anda */}
        <div className="rounded-xl border border-slate-200 bg-slate-50/80 p-3.5 text-xs space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="font-bold text-slate-800">Verifikasi Titik GPS Lokasi</span>
            <div className="flex items-center gap-2">
              {!loadingLokasi && (
                <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${locationMeta.toneClass}`}>
                  {locationMeta.label}
                </span>
              )}
              <button
                type="button"
                onClick={fetchCurrentLocation}
                disabled={loadingLokasi || isSubmitting}
                className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
              >
                {loadingLokasi ? 'Mendeteksi...' : 'Deteksi Ulang GPS'}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Titik Lokasi Pekerjaan
              </p>
              <p className="mt-0.5 font-semibold text-slate-800">
                {job?.lokasi || 'Lokasi belum diisi'}
              </p>
              {job?.titik_lokasi ? (
                <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-slate-600">
                  <span className="truncate">{job.titik_lokasi}</span>
                  {jobMapUrl && (
                    <a
                      href={jobMapUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 font-sans font-semibold text-emerald-700 hover:underline"
                    >
                      Peta
                    </a>
                  )}
                </div>
              ) : (
                <p className="mt-1 text-[11px] text-slate-400">Koordinat target belum disetel</p>
              )}
            </div>

            <div className="rounded-lg border border-slate-200/80 bg-white p-2.5">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Titik GPS Anda Sekarang
              </p>
              {loadingLokasi ? (
                <p className="mt-1 text-[11px] font-medium text-slate-500">
                  Mengambil koordinat satelit GPS...
                </p>
              ) : lokasi ? (
                <>
                  <p className="mt-0.5 line-clamp-2 text-[11px] text-slate-700">{lokasi.alamat}</p>
                  <div className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-emerald-700">
                    <span className="truncate">{lokasi.coordText}</span>
                    {workerMapUrl && (
                      <a
                        href={workerMapUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 font-sans font-semibold text-emerald-700 hover:underline"
                      >
                        Peta
                      </a>
                    )}
                  </div>
                </>
              ) : (
                <p className="mt-1 text-[11px] font-medium text-rose-600">
                  {lokasiError || 'Koordinat GPS belum tersedia.'}
                </p>
              )}
            </div>
          </div>
        </div>

        {/* Status Error Submit dari Parent */}
        {submitError && (
          <div
            role="alert"
            className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-semibold text-rose-800"
          >
            {submitError}
          </div>
        )}

        {/* Kamera View */}
        {fase === 'loading' && (
          <div className="flex flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 py-14">
            <div className="h-9 w-9 animate-spin rounded-full border-3 border-slate-200 border-t-emerald-600" />
            <p className="mt-3 text-xs font-medium text-slate-500">Menyiapkan kamera langsung...</p>
          </div>
        )}

        {fase === 'error' && (
          <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-rose-200 bg-rose-50/70 p-8 text-center">
            <p className="text-sm font-bold text-rose-800">Kamera Tidak Tersedia</p>
            <p className="text-xs text-rose-700">{errorMsg}</p>
            <button
              type="button"
              onClick={() => startCamera(facingMode)}
              className="rounded-xl border border-rose-300 bg-white px-4 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
            >
              Coba Aktifkan Kamera Lagi
            </button>
          </div>
        )}

        {fase === 'kamera' && (
          <div className="relative overflow-hidden rounded-xl bg-slate-950">
            <video
              ref={videoRef}
              playsInline
              muted
              style={{ transform: facingMode === 'user' ? 'scaleX(-1)' : 'none' }}
              className="block max-h-80 w-full object-cover"
            />
            <div className="pointer-events-none absolute inset-0 border-2 border-white/15" />
            <span
              className={`absolute top-3 left-3 rounded-full px-3 py-1 text-[11px] font-bold text-white shadow ${
                isMasuk ? 'bg-emerald-600/90' : 'bg-rose-600/90'
              }`}
            >
              {isMasuk ? 'Kamera Absen Masuk' : 'Kamera Absen Pulang'}
            </span>
            <button
              type="button"
              onClick={handleFlip}
              aria-label="Ganti kamera depan atau belakang"
              className="absolute top-3 right-3 rounded-lg bg-slate-900/70 px-2.5 py-1.5 text-xs font-semibold text-white backdrop-blur-xs hover:bg-slate-900"
            >
              Ganti Kamera
            </button>
          </div>
        )}

        {fase === 'preview' && snapshot && (
          <div className="space-y-3">
            <div className="relative overflow-hidden rounded-xl border border-slate-200 bg-slate-950">
              <img
                src={snapshot}
                alt={`Hasil foto absen ${isMasuk ? 'masuk' : 'pulang'} di lokasi pekerjaan`}
                className="block max-h-72 w-full object-cover"
              />
              <span className="absolute right-2.5 bottom-2.5 rounded-md bg-slate-950/75 px-2.5 py-1 font-mono text-[11px] text-white">
                {(capturedNtp || getSyncedJakartaNow()).previewLabel} WIB
                {lokasi?.coordText ? ` • ${lokasi.coordText}` : ''}
              </span>
            </div>

            {isMasuk ? (
              <div>
                <label htmlFor={noteInputId} className="mb-1 block text-xs font-semibold text-slate-700">
                  Catatan Pekerjaan Saat Absen (Opsional)
                </label>
                <input
                  id={noteInputId}
                  type="text"
                  maxLength={200}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Tiba di lokasi, mulai pengecekan instalasi"
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2 text-xs text-slate-800 focus:border-emerald-500 focus:outline-none"
                />
              </div>
            ) : (
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-700">
                <input
                  type="checkbox"
                  checked={isOvernight}
                  onChange={(e) => setIsOvernight(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
                />
                <span>Shift malam (pekerjaan melewati pukul 00:00)</span>
              </label>
            )}
          </div>
        )}

        <canvas ref={canvasRef} className="hidden" />
      </div>

      {/* Footer Actions */}
      <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/70 px-5 py-3.5">
        {fase === 'kamera' && (
          <>
            <button
              type="button"
              onClick={() => {
                stopCameraStream()
                onCancel?.()
              }}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
            >
              Batal
            </button>
            <button
              type="button"
              id="btn-ambil-foto"
              onClick={handleAmbilFoto}
              className="flex-1 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white shadow-sm hover:bg-emerald-700"
            >
              📸 Ambil Foto Langsung
            </button>
          </>
        )}

        {fase === 'preview' && (
          <>
            <button
              type="button"
              onClick={handleUlangi}
              disabled={isSubmitting}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              Foto Ulang
            </button>
            <button
              type="button"
              id="btn-gunakan-foto"
              onClick={handleSubmitFoto}
              disabled={loadingLokasi || !lokasi?.coordText || isSubmitting}
              className={`flex-1 rounded-xl px-4 py-2.5 text-xs font-bold text-white shadow-sm transition disabled:cursor-not-allowed disabled:opacity-50 ${
                isMasuk ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              }`}
            >
              {isSubmitting
                ? 'Mengirim Absen ke Admin...'
                : loadingLokasi
                  ? 'Menunggu Titik GPS...'
                  : !lokasi?.coordText
                    ? 'Aktifkan GPS Terlebih Dahulu'
                    : isMasuk
                      ? '✅ Kirim Absen Masuk'
                      : '✅ Kirim Absen Pulang'}
            </button>
          </>
        )}

        {(fase === 'error' || fase === 'loading') && (
          <button
            type="button"
            onClick={() => {
              stopCameraStream()
              onCancel?.()
            }}
            className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
          >
            Tutup
          </button>
        )}
      </div>
    </dialog>
  )
}
