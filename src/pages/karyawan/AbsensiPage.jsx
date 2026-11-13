import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import {
  absenMasuk,
  absenPulang,
  getAbsensi,
  getJakartaNowFormatted,
  getJobAttendanceAvailability,
  getSyncedNowDate,
  subscribeNtpSync,
  syncNtpTime,
} from '../../services/absensiApi.js'
import { getFileUrl, hitungDurasi } from '../../services/api.js'
import CameraCapture from '../../components/CameraCapture.jsx'
import {
  getGoogleMapsUrl,
  getLocationMatchMeta,
  safeFormatDate,
} from '../../utils/geoLocation.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  timeZone: 'Asia/Jakarta',
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
})

const SHORT_DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

function formatFullDate(date) {
  try {
    return DATE_FORMATTER.format(date)
  } catch {
    return ''
  }
}

function formatShortDate(val) {
  return safeFormatDate(val, SHORT_DATE_FORMATTER)
}

function StatusBadge({ status }) {
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Disetujui Admin
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Ditolak Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Menunggu Approval
    </span>
  )
}

export default function AbsensiPage({ workerId: propWorkerId, workerName: propWorkerName }) {
  const auth = useAuth()
  const user = auth?.user

  const idKaryawan = Number(propWorkerId || user?.id_karyawan || user?.employeeId || user?.id || 1)
  const namaKaryawan = propWorkerName || user?.nama || user?.name || 'Pekerja'

  const [currentWaktu, setCurrentWaktu] = useState(() => getSyncedNowDate())
  const [todayDate, setTodayDate] = useState(() => getJakartaNowFormatted().tanggal)

  useEffect(() => {
    const refreshClock = () => {
      setCurrentWaktu(getSyncedNowDate())
      const nextDate = getJakartaNowFormatted().tanggal
      setTodayDate((prev) => (prev === nextDate ? prev : nextDate))
    }

    const unsubNtp = subscribeNtpSync(refreshClock)
    syncNtpTime().then(refreshClock)

    const timer = setInterval(refreshClock, 1000)
    const resyncTimer = setInterval(() => {
      syncNtpTime({ force: true })
    }, 5 * 60 * 1000)

    return () => {
      unsubNtp()
      clearInterval(timer)
      clearInterval(resyncTimer)
    }
  }, [])

  const jamSekarangString = currentWaktu.toLocaleTimeString('id-ID', {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  })
  const tanggalSekarangString = formatFullDate(currentWaktu)

  const [assignedJobs, setAssignedJobs] = useState([])
  const [absensiList, setAbsensiList] = useState([])
  const [selectedPekerjaanId, setSelectedPekerjaanId] = useState(null)
  const [kameraMode, setKameraMode] = useState(null) // 'masuk' | 'pulang' | null
  const [pesan, setPesan] = useState(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')

  const loadData = useCallback(async () => {
    setIsLoadingJobs(true)
    try {
      const [jobsData, assignmentsData, attData] = await Promise.all([
        getPekerjaan(),
        getPenugasan(),
        getAbsensi({ id_karyawan: idKaryawan }),
      ])

      const allJobs = Array.isArray(jobsData) ? jobsData : []
      const allAssignments = Array.isArray(assignmentsData) ? assignmentsData : []

      const jobsById = new Map(allJobs.map((j) => [Number(j.id_pekerjaan), j]))
      const myWorkerAssignments = allAssignments.filter((a) => Number(a.id_karyawan) === idKaryawan)

      const filteredJobs = myWorkerAssignments.map((a) => {
        const matched = jobsById.get(Number(a.id_pekerjaan))
        return (
          matched || {
            id_pekerjaan: Number(a.id_pekerjaan),
            nama_pekerjaan: a.nama_pekerjaan || `Pekerjaan #${a.id_pekerjaan}`,
            lokasi: a.lokasi || '',
            titik_lokasi: a.titik_lokasi || '',
            target_selesai: a.target_selesai || '',
            status: a.status_pekerjaan || 'berjalan',
          }
        )
      })

      setAssignedJobs(filteredJobs)
      setAbsensiList(Array.isArray(attData) ? attData : [])
      setSelectedPekerjaanId((prev) => {
        if (prev && filteredJobs.some((j) => Number(j.id_pekerjaan) === Number(prev))) {
          return prev
        }
        return filteredJobs[0]?.id_pekerjaan ?? null
      })
    } catch (err) {
      console.error('Gagal memuat pekerjaan untuk absensi:', err)
    } finally {
      setIsLoadingJobs(false)
    }
  }, [idKaryawan])

  useEffect(() => {
    loadData()
  }, [loadData])

  const selectedPekerjaan = useMemo(() => {
    return assignedJobs.find((p) => Number(p.id_pekerjaan) === Number(selectedPekerjaanId)) || null
  }, [assignedJobs, selectedPekerjaanId])

  const sessionsByJob = useMemo(() => {
    const map = new Map()
    if (!idKaryawan) return map
    for (const att of absensiList) {
      if (Number(att.id_karyawan) !== idKaryawan) continue
      const jobId = Number(att.id_pekerjaan)
      const list = map.get(jobId) || []
      list.push(att)
      map.set(jobId, list)
    }
    return map
  }, [absensiList, idKaryawan])

  const availabilityByJob = useMemo(() => {
    const map = new Map()
    for (const job of assignedJobs) {
      const jobId = Number(job.id_pekerjaan)
      map.set(jobId, getJobAttendanceAvailability(job, sessionsByJob.get(jobId) || [], todayDate))
    }
    return map
  }, [assignedJobs, sessionsByJob, todayDate])

  const selectedAvailability = useMemo(() => {
    if (!selectedPekerjaan) return null
    return (
      availabilityByJob.get(Number(selectedPekerjaan.id_pekerjaan)) ||
      getJobAttendanceAvailability(selectedPekerjaan, [], todayDate)
    )
  }, [selectedPekerjaan, availabilityByJob, todayDate])

  const sesiAktif = selectedAvailability?.activeSession || null

  const riwayat = useMemo(() => {
    if (!idKaryawan || !selectedPekerjaanId) return []
    return absensiList
      .filter(
        (a) =>
          Number(a.id_karyawan) === idKaryawan &&
          Number(a.id_pekerjaan) === Number(selectedPekerjaanId),
      )
      .sort((a, b) => {
        if (b.tanggal !== a.tanggal) return String(b.tanggal || '').localeCompare(String(a.tanggal || ''))
        return String(b.jam_masuk || '').localeCompare(String(a.jam_masuk || ''))
      })
  }, [idKaryawan, selectedPekerjaanId, absensiList])

  const tampilPesan = (type, text) => {
    setPesan({ type, text })
    setTimeout(() => setPesan(null), 6000)
  }

  const handleCapture = useCallback(
    async ({ foto, titik_lokasi, catatan, is_overnight }) => {
      if (!selectedPekerjaanId) return
      setIsSubmitting(true)
      setSubmitError('')
      await syncNtpTime({ maxAgeMs: 15_000 })
      const { tanggal, jam } = getJakartaNowFormatted()

      try {
        if (kameraMode === 'masuk') {
          if (selectedAvailability && !selectedAvailability.canCheckIn) {
            setSubmitError(
              selectedAvailability.lockDescription ||
                selectedAvailability.lockLabel ||
                'Absensi masuk sedang terkunci untuk pekerjaan ini.',
            )
            return
          }
          const result = await absenMasuk({
            id_pekerjaan: selectedPekerjaanId,
            id_karyawan: idKaryawan,
            tanggal,
            jam_masuk: jam,
            catatan,
            titik_lokasi,
            foto_lokasi: foto,
          })
          tampilPesan('success', result?.message || 'Absen masuk berhasil dikirim. Menunggu persetujuan Admin.')
        } else if (kameraMode === 'pulang') {
          if (!sesiAktif) {
            setSubmitError('Tidak ditemukan sesi aktif untuk absen pulang.')
            return
          }
          const result = await absenPulang(sesiAktif.id_absensi, jam, is_overnight, {
            titik_pulang: titik_lokasi,
            foto_pulang: foto,
          })
          tampilPesan('success', result?.message || 'Absen pulang berhasil dikirim. Menunggu persetujuan Admin.')
        }
        setKameraMode(null)
        await loadData()
      } catch (err) {
        setSubmitError(err?.message || 'Gagal menyimpan data absensi.')
      } finally {
        setIsSubmitting(false)
      }
    },
    [kameraMode, idKaryawan, selectedPekerjaanId, sesiAktif, loadData],
  )

  return (
    <div className="worker-theme min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      {kameraMode && selectedPekerjaan && (
        <CameraCapture
          mode={kameraMode}
          job={selectedPekerjaan}
          isSubmitting={isSubmitting}
          submitError={submitError}
          onCapture={handleCapture}
          onCancel={() => {
            setSubmitError('')
            setKameraMode(null)
          }}
        />
      )}

      <div className="mx-auto max-w-2xl space-y-6">
        {/* ── CARD A: TIMER ABSENSI ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm text-center">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Presensi &amp; Jam Kerja
              </span>
              <h1 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                📍 Absensi Pekerjaan
              </h1>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400">Akun Pekerja:</span>
              <p className="text-sm font-bold text-slate-900">{namaKaryawan}</p>
            </div>
          </div>

          <div className="py-6">
            <div className="font-mono text-4xl sm:text-5xl font-black tracking-widest text-slate-900 drop-shadow-sm">
              {jamSekarangString}
            </div>
            <div className="mt-2 text-xs sm:text-sm font-medium text-slate-500">
              {tanggalSekarangString}
            </div>
          </div>

          <p className="text-xs text-slate-400 border-t border-slate-100 pt-3">
            Pengajuan absensi diverifikasi Admin berdasarkan titik GPS pekerjaan &amp; foto kamera langsung.
          </p>
        </section>

        {/* ── CARD B: PILIH PEKERJAAN ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🗂️</span> Pilih Pekerjaan
              </h2>
              <p className="mt-0.5 text-xs text-slate-500">
                Pilih proyek yang ditugaskan kepada Anda untuk mengambil absen:
              </p>
            </div>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
              {assignedJobs.length} Proyek
            </span>
          </div>

          <div className="mt-4 space-y-2.5">
            {isLoadingJobs ? (
              <div className="py-6 text-center text-xs text-slate-400">
                Memuat daftar pekerjaan Anda...
              </div>
            ) : assignedJobs.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 p-6 text-center text-xs text-slate-500">
                Belum ada pekerjaan aktif yang ditugaskan kepada Anda.
              </div>
            ) : (
              assignedJobs.map((job) => {
                const isSelected = Number(selectedPekerjaanId) === Number(job.id_pekerjaan)
                const availability =
                  availabilityByJob.get(Number(job.id_pekerjaan)) ||
                  getJobAttendanceAvailability(job, [], todayDate)
                return (
                  <button
                    key={job.id_pekerjaan}
                    type="button"
                    onClick={() => setSelectedPekerjaanId(job.id_pekerjaan)}
                    className={`w-full flex items-start justify-between gap-3 rounded-xl p-4 text-left transition ${
                      isSelected
                        ? 'border-2 border-emerald-500 bg-emerald-50/70 shadow-sm'
                        : 'border border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/60'
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span className="mt-0.5 text-xl">🏗️</span>
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="text-sm font-bold text-slate-900 leading-snug">
                            {job.nama_pekerjaan}
                          </p>
                          {availability.isLocked && (
                            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600">
                              🔒{' '}
                              {availability.mode === 'locked_today_completed'
                                ? 'Selesai Hari Ini'
                                : 'Terkunci'}
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                          <span>Target: {formatShortDate(job.target_selesai)}</span>
                          <span>•</span>
                          <span className="capitalize">{String(job.status || '').replace('_', ' ')}</span>
                        </p>
                        {job.lokasi && (
                          <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                            <span>📌</span>
                            <span>{job.lokasi}</span>
                          </p>
                        )}
                        {job.titik_lokasi && (
                          <p className="mt-0.5 font-mono text-[11px] text-emerald-700">
                            Titik GPS: {job.titik_lokasi}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="mt-1 shrink-0">
                      {isSelected ? (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-600 text-white font-bold text-xs shadow-sm">
                          ✓
                        </span>
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-slate-300" />
                      )}
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </section>

        {/* ── CARD C: REKAM KEHADIRAN ── */}
        {selectedPekerjaanId && selectedPekerjaan && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📸</span> Ambil Absen Pekerjaan
                </h2>
                <p className="mt-0.5 text-xs text-emerald-700 font-semibold truncate max-w-sm">
                  Pekerjaan: {selectedPekerjaan.nama_pekerjaan}
                </p>
              </div>
            </div>

            {pesan && (
              <div
                role="status"
                className={`mt-4 rounded-xl p-3 text-xs font-semibold shadow-sm ${
                  pesan.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pesan.text}
              </div>
            )}

            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <span className="text-base">📸</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Absensi direkam menggunakan <strong className="text-slate-900">foto kamera langsung + titik lokasi GPS</strong> untuk dicocokkan dan disetujui Admin sesuai lokasi pekerjaan.
              </p>
            </div>

            {sesiAktif ? (
              <div className="mt-5 space-y-4">
                <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 p-4 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                      <span className="text-xs font-bold text-emerald-800">
                        Sesi Kerja Sedang Berlangsung
                      </span>
                    </div>
                    <StatusBadge status={sesiAktif.status_verifikasi} />
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-xs text-slate-600">Masuk pukul:</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-700">
                      {sesiAktif.jam_masuk?.slice(0, 5) || sesiAktif.jam_masuk}
                    </span>
                  </div>

                  {sesiAktif.foto_lokasi && (
                    <div className="pt-2">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Foto Bukti Kamera Masuk:
                      </span>
                      <img
                        src={getFileUrl(sesiAktif.foto_lokasi)}
                        alt="Foto absen masuk"
                        className="h-16 w-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                      />
                    </div>
                  )}

                  {sesiAktif.titik_lokasi && (
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5 pt-1">
                      <span>📍</span>
                      <span className="font-mono">{sesiAktif.titik_lokasi}</span>
                    </p>
                  )}
                </div>

                <button
                  type="button"
                  id="btn-absen-pulang"
                  onClick={() => {
                    setSubmitError('')
                    setKameraMode('pulang')
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 px-4 text-sm sm:text-base font-bold text-white shadow-sm transition hover:bg-rose-700"
                >
                  <span>📸</span>
                  <span>Ambil Absen Pulang (Kamera &amp; GPS)</span>
                </button>
              </div>
            ) : selectedAvailability?.isLocked ? (
              <div className="mt-5 space-y-2">
                <button
                  type="button"
                  id="btn-absen-masuk"
                  disabled
                  aria-describedby={`lock-reason-page-${selectedPekerjaan.id_pekerjaan}`}
                  className="w-full flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-slate-100 py-3.5 px-4 text-sm sm:text-base font-bold text-slate-500 cursor-not-allowed"
                >
                  <span aria-hidden="true">🔒</span>
                  <span>{selectedAvailability.lockLabel}</span>
                </button>
                <p
                  id={`lock-reason-page-${selectedPekerjaan.id_pekerjaan}`}
                  className={`rounded-xl border px-3.5 py-2.5 text-center text-xs font-medium ${
                    selectedAvailability.mode === 'locked_not_started'
                      ? 'border-amber-200 bg-amber-50 text-amber-800'
                      : 'border-slate-200 bg-slate-50 text-slate-600'
                  }`}
                >
                  {selectedAvailability.lockDescription}
                </p>
              </div>
            ) : (
              <div className="mt-5">
                <button
                  type="button"
                  id="btn-absen-masuk"
                  onClick={() => {
                    if (selectedAvailability && !selectedAvailability.canCheckIn) return
                    setSubmitError('')
                    setKameraMode('masuk')
                  }}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm sm:text-base font-bold text-white shadow-sm transition hover:bg-emerald-700"
                >
                  <span>📸</span>
                  <span>Ambil Absen Masuk (Kamera &amp; GPS)</span>
                </button>
              </div>
            )}
          </section>
        )}

        {/* ── CARD D: RIWAYAT PEKERJAAN INI ── */}
        {selectedPekerjaanId && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📅</span> Riwayat Pekerjaan Ini
                </h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  Daftar sesi absensi Anda khusus untuk proyek ini:
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                {riwayat.length} sesi
              </span>
            </div>

            <div className="mt-4 space-y-3">
              {riwayat.length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-400">
                  Belum ada catatan absensi untuk pekerjaan ini.
                </div>
              ) : (
                riwayat.slice(0, 6).map((session) => {
                  const durasiJam = session.durasi_jam || hitungDurasi(session.jam_masuk, session.jam_pulang)
                  const isSelesai = Boolean(session.jam_pulang)
                  const matchMeta = getLocationMatchMeta(
                    session.jarak_masuk,
                    Boolean(selectedPekerjaan?.titik_lokasi || session.titik_pekerjaan),
                    Boolean(session.titik_lokasi),
                  )
                  const mapLink = getGoogleMapsUrl(session.titik_lokasi)

                  return (
                    <article
                      key={session.id_absensi}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 transition hover:bg-slate-50"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {formatShortDate(session.tanggal)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {selectedPekerjaan?.nama_pekerjaan || session.nama_pekerjaan}
                          </p>
                        </div>
                        <StatusBadge status={session.status_verifikasi} />
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center text-xs pt-1">
                        <div className="rounded-lg bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">🕐 Masuk</span>
                          <span className="font-mono font-bold text-slate-800">
                            {session.jam_masuk?.slice(0, 5) || '—'}
                          </span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">🕔 Pulang</span>
                          <span className="font-mono font-bold text-slate-800">
                            {session.jam_pulang ? session.jam_pulang.slice(0, 5) : 'Aktif'}
                          </span>
                        </div>

                        <div className="rounded-lg bg-white p-2 border border-slate-100">
                          <span className="text-[10px] text-slate-400 block font-medium">⏱ Durasi</span>
                          <span className="font-bold text-emerald-700">
                            {session.durasi_format || (isSelesai ? `${durasiJam} jam` : 'Aktif')}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 text-[11px]">
                        <div className="flex items-center gap-2">
                          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-semibold ${matchMeta.toneClass}`}>
                            {matchMeta.label}
                          </span>
                          {mapLink && (
                            <a href={mapLink} target="_blank" rel="noreferrer" className="font-mono text-emerald-700 hover:underline">
                              {session.titik_lokasi}
                            </a>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          {session.foto_lokasi && (
                            <a href={getFileUrl(session.foto_lokasi)} target="_blank" rel="noreferrer">
                              <img
                                src={getFileUrl(session.foto_lokasi)}
                                alt="Foto bukti absen masuk"
                                className="h-9 w-12 rounded border border-slate-200 object-cover"
                              />
                            </a>
                          )}
                          {session.foto_pulang && (
                            <a href={getFileUrl(session.foto_pulang)} target="_blank" rel="noreferrer">
                              <img
                                src={getFileUrl(session.foto_pulang)}
                                alt="Foto bukti absen pulang"
                                className="h-9 w-12 rounded border border-slate-200 object-cover"
                              />
                            </a>
                          )}
                        </div>
                      </div>

                      {session.catatan_admin && (
                        <p className="rounded-lg bg-rose-50 px-2.5 py-1.5 text-[11px] font-medium text-rose-700">
                          Catatan Admin: {session.catatan_admin}
                        </p>
                      )}
                    </article>
                  )
                })
              )}
            </div>
          </section>
        )}
      </div>
    </div>
  )
}
