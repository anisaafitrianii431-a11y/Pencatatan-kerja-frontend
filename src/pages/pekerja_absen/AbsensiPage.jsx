import { useState, useEffect, useMemo, useCallback } from 'react'
import { useAuth } from '../../auth/useAuth.js'
import { useAbsensi } from '../../hooks/useAbsensi.jsx'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import CameraCapture from '../../components/CameraCapture'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
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
  if (!val) return '—'
  const d = new Date(`${val}T00:00:00`)
  return Number.isNaN(d.getTime()) ? val : SHORT_DATE_FORMATTER.format(d)
}

function StatusBadge({ status }) {
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-emerald-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
        Disetujui
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-600/20">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        Ditolak
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700 ring-1 ring-amber-600/20">
      <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
      Menunggu
    </span>
  )
}

export default function AbsensiPage({ workerId: propWorkerId, workerName: propWorkerName }) {
  const auth = useAuth()
  const user = auth?.user

  // Resolve worker identity
  const idKaryawan = Number(propWorkerId || user?.employeeId || user?.id || 1)
  const namaKaryawan = propWorkerName || user?.name || 'Budi Santoso'

  const {
    absensiList,
    absenMasuk,
    absenPulang,
    getSesiAktif,
    getRiwayatByKaryawan,
    hitungDurasi,
  } = useAbsensi()

  // Real-time clock state
  const [currentWaktu, setCurrentWaktu] = useState(new Date())
  useEffect(() => {
    const timer = setInterval(() => setCurrentWaktu(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const jamSekarangString = currentWaktu.toLocaleTimeString('id-ID', { hour12: false })
  const tanggalSekarangString = formatFullDate(currentWaktu)

  // Pekerjaan dari API / Database
  const [assignedJobs, setAssignedJobs] = useState([])
  const [selectedPekerjaanId, setSelectedPekerjaanId] = useState(null)
  const [kameraMode, setKameraMode] = useState(null) // 'masuk' | 'pulang' | null
  const [pesan, setPesan] = useState(null)
  const [isLoadingJobs, setIsLoadingJobs] = useState(true)

  // Load real assigned jobs for this employee
  useEffect(() => {
    let isMounted = true
    setIsLoadingJobs(true)

    Promise.all([getPekerjaan(), getPenugasan()])
      .then(([jobsData, assignmentsData]) => {
        if (!isMounted) return

        const allJobs = Array.isArray(jobsData) ? jobsData : []
        const allAssignments = Array.isArray(assignmentsData) ? assignmentsData : []

        // Filter assignments for current worker
        const myJobIds = new Set(
          allAssignments
            .filter((a) => Number(a.id_karyawan) === idKaryawan)
            .map((a) => a.id_pekerjaan),
        )

        let filteredJobs = allJobs.filter((j) => myJobIds.has(j.id_pekerjaan))

        // Fallback jika belum ada penugasan eksplisit di tabel penugasan
        if (filteredJobs.length === 0 && allJobs.length > 0) {
          filteredJobs = allJobs.filter((j) => j.status === 'berjalan')
          if (filteredJobs.length === 0) filteredJobs = [allJobs[0]]
        }

        setAssignedJobs(filteredJobs)
        if (filteredJobs.length > 0) {
          setSelectedPekerjaanId(filteredJobs[0].id_pekerjaan)
        }
      })
      .catch((err) => {
        console.error('Gagal memuat pekerjaan untuk absensi:', err)
      })
      .finally(() => {
        if (isMounted) setIsLoadingJobs(false)
      })

    return () => {
      isMounted = false
    }
  }, [idKaryawan])

  const selectedPekerjaan = useMemo(() => {
    return assignedJobs.find((p) => p.id_pekerjaan === selectedPekerjaanId) || null
  }, [assignedJobs, selectedPekerjaanId])

  // Cari sesi aktif (masuk tapi belum pulang)
  const sesiAktif = useMemo(() => {
    if (!idKaryawan || !selectedPekerjaanId) return null
    return (
      getSesiAktif(idKaryawan, selectedPekerjaanId) ||
      absensiList.find(
        (a) =>
          Number(a.id_karyawan) === idKaryawan &&
          Number(a.id_pekerjaan) === Number(selectedPekerjaanId) &&
          !a.jam_pulang,
      ) ||
      null
    )
  }, [idKaryawan, selectedPekerjaanId, getSesiAktif, absensiList])

  // Riwayat absensi pekerjaan yang dipilih
  const riwayat = useMemo(() => {
    if (!idKaryawan || !selectedPekerjaanId) return []
    return absensiList
      .filter(
        (a) =>
          Number(a.id_karyawan) === idKaryawan &&
          Number(a.id_pekerjaan) === Number(selectedPekerjaanId),
      )
      .sort((a, b) => {
        if (b.tanggal !== a.tanggal) return (b.tanggal || '').localeCompare(a.tanggal || '')
        return (b.jam_masuk || '').localeCompare(a.jam_masuk || '')
      })
  }, [idKaryawan, selectedPekerjaanId, absensiList])

  const tampilPesan = (type, text) => {
    setPesan({ type, text })
    setTimeout(() => setPesan(null), 5000)
  }

  // Handle capture dari CameraCapture (Live Camera + GPS)
  const handleCapture = useCallback(
    (bukti) => {
      setKameraMode(null)

      if (kameraMode === 'masuk') {
        const result = absenMasuk(idKaryawan, selectedPekerjaanId, bukti)
        if (result && result.sukses) {
          tampilPesan('success', '✅ Absen masuk berhasil dicatat dengan foto dan lokasi GPS!')
        } else {
          tampilPesan('error', result?.pesan || 'Gagal menyimpan absen masuk.')
        }
      } else if (kameraMode === 'pulang') {
        if (!sesiAktif) {
          tampilPesan('error', 'Tidak ditemukan sesi aktif untuk absen pulang.')
          return
        }
        absenPulang(sesiAktif.id_absensi, bukti)
        tampilPesan('success', '🏠 Absen pulang berhasil disimpan dengan foto dan lokasi GPS!')
      }
    },
    [kameraMode, absenMasuk, absenPulang, idKaryawan, selectedPekerjaanId, sesiAktif],
  )

  return (
    <div className="worker-theme min-h-screen bg-slate-50 py-6 px-4 sm:px-6 lg:px-8">
      {/* ── Modal Kamera Live & GPS (Overlay) ── */}
      {kameraMode && (
        <CameraCapture
          mode={kameraMode}
          onCapture={handleCapture}
          onCancel={() => setKameraMode(null)}
        />
      )}

      {/* ── Container Utama Proporsional Sesuai Screenshot Kedua ── */}
      <div className="mx-auto max-w-2xl space-y-6">

        {/* ── CARD A: TIMER ABSENSI ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm text-center">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 text-left">
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-600">
                Presensi & Jam Kerja
              </span>
              <h2 className="text-xl font-extrabold text-slate-900 sm:text-2xl">
                📍 Absensi
              </h2>
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
            Waktu terverifikasi otomatis mengikuti zona waktu resmi sistem.
          </p>
        </section>

        {/* ── CARD B: PILIH PEKERJAAN ── */}
        <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <span>🗂️</span> Pilih Pekerjaan
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Pilih proyek aktif yang sedang ditugaskan kepada Anda:
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
                const isSelected = selectedPekerjaanId === job.id_pekerjaan
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
                        <p className="text-sm font-bold text-slate-900 leading-snug">
                          {job.nama_pekerjaan}
                        </p>
                        <p className="mt-1 text-xs text-slate-500 flex items-center gap-1.5">
                          <span>Shift: 08:00 – 17:00</span>
                          <span>•</span>
                          <span>Target: {formatShortDate(job.target_selesai)}</span>
                        </p>
                        {job.lokasi && (
                          <p className="mt-1 text-xs text-slate-600 flex items-center gap-1">
                            <span>📌</span>
                            <span>{job.lokasi}</span>
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
        {selectedPekerjaanId && (
          <section className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📸</span> Rekam Kehadiran
                </h3>
                <p className="mt-0.5 text-xs text-emerald-700 font-semibold truncate max-w-sm">
                  Pekerjaan: {selectedPekerjaan?.nama_pekerjaan}
                </p>
              </div>
            </div>

            {/* Notifikasi feedback */}
            {pesan && (
              <div
                className={`mt-4 rounded-xl p-3 text-xs font-semibold shadow-sm ${
                  pesan.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-rose-50 text-rose-800 border border-rose-200'
                }`}
              >
                {pesan.text}
              </div>
            )}

            {/* Kotak Petunjuk Kamera + GPS */}
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-emerald-200/80 bg-emerald-50/50 p-3.5">
              <span className="text-base">📸</span>
              <p className="text-xs text-slate-600 leading-relaxed">
                Absensi menggunakan <strong className="text-slate-900">foto + lokasi GPS otomatis</strong>.
                Pastikan izin akses kamera dan lokasi GPS telah diaktifkan pada browser Anda.
              </p>
            </div>

            {/* Sesi Sedang Berjalan vs Tombol Absen */}
            {sesiAktif ? (
              <div className="mt-5 space-y-4">
                {/* Kotak info sesi aktif */}
                <div className="rounded-xl border border-emerald-300/80 bg-emerald-50/80 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-bold text-emerald-800">
                      Sesi Kerja Sedang Berlangsung
                    </span>
                  </div>

                  <div className="flex items-baseline gap-2 pt-1">
                    <span className="text-xs text-slate-600">Masuk pukul:</span>
                    <span className="text-xl font-mono font-extrabold text-emerald-700">
                      {sesiAktif.jam_masuk?.slice(0, 5) || sesiAktif.jam_masuk}
                    </span>
                  </div>

                  {sesiAktif.foto_masuk && (
                    <div className="pt-2">
                      <span className="text-[10px] font-semibold text-slate-500 block mb-1">
                        Foto Bukti Masuk:
                      </span>
                      <img
                        src={sesiAktif.foto_masuk}
                        alt="Foto absen masuk"
                        className="h-16 w-24 object-cover rounded-lg border border-slate-200 shadow-xs"
                      />
                    </div>
                  )}

                  {sesiAktif.lokasi_masuk?.alamat && (
                    <p className="text-[11px] text-slate-600 flex items-start gap-1 pt-1">
                      <span>📍</span>
                      <span className="line-clamp-2">{sesiAktif.lokasi_masuk.alamat}</span>
                    </p>
                  )}
                </div>

                {/* Tombol Absen Pulang */}
                <button
                  type="button"
                  id="btn-absen-pulang"
                  onClick={() => setKameraMode('pulang')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-rose-600 py-3.5 px-4 text-sm sm:text-base font-bold text-white shadow-sm transition hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500 focus:ring-offset-2"
                >
                  <span>📸</span>
                  <span>Absen Pulang (Foto + Lokasi)</span>
                </button>
              </div>
            ) : (
              <div className="mt-5">
                {/* Tombol Absen Masuk */}
                <button
                  type="button"
                  id="btn-absen-masuk"
                  onClick={() => setKameraMode('masuk')}
                  className="w-full flex items-center justify-center gap-2 rounded-xl bg-emerald-600 py-3.5 px-4 text-sm sm:text-base font-bold text-white shadow-sm transition hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:ring-offset-2"
                >
                  <span>📸</span>
                  <span>Absen Masuk (Foto + Lokasi)</span>
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
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <span>📅</span> Riwayat Pekerjaan Ini
                </h3>
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
                riwayat.slice(0, 5).map((session) => {
                  const durasi = hitungDurasi(session.jam_masuk, session.jam_pulang)
                  const isSelesai = Boolean(session.jam_pulang)

                  return (
                    <article
                      key={session.id_absensi}
                      className="rounded-xl border border-slate-200/80 bg-slate-50/50 p-4 space-y-3 transition hover:bg-slate-50"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <p className="text-xs font-bold text-slate-900">
                            {formatShortDate(session.tanggal)}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {selectedPekerjaan?.nama_pekerjaan}
                          </p>
                        </div>
                        <StatusBadge status={session.status_verifikasi} />
                      </div>

                      {/* 3 Metric Box */}
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
                            {durasi ? durasi.label : isSelesai ? '—' : '...'}
                          </span>
                        </div>
                      </div>
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
