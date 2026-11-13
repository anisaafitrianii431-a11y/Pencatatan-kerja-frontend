import { useEffect, useRef, useState } from 'react'
import {
  Briefcase,
  Calendar,
  Camera,
  CheckCircle2,
  Clock,
  ExternalLink,
  MapPin,
  X,
  XCircle,
} from 'lucide-react'
import { getFileUrl } from '../services/api'
import {
  formatWeekdayAndDate,
  resolveAttendanceLocation,
} from '../utils/geoLocation'

function StatusPill({ status }) {
  if (status === 'disetujui') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-emerald-800 border border-emerald-200">
        Disetujui Admin
      </span>
    )
  }
  if (status === 'ditolak') {
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-rose-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-rose-800 border border-rose-200">
        Ditolak Admin
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider text-amber-800 border border-amber-200">
      Menunggu Approval
    </span>
  )
}

function JobStatusText(status) {
  if (status === 'berjalan') return 'Sedang Berjalan'
  if (status === 'selesai') return 'Selesai'
  if (status === 'belum_mulai') return 'Belum Dimulai'
  return status || '—'
}

function PhotoEvidenceCard({ title, timeLabel, photoPath, coords, mapsUrl, matchMeta, emptyText }) {
  const resolvedUrl = photoPath ? getFileUrl(photoPath) : ''

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/60 p-3.5 space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
          <Camera className="h-3.5 w-3.5 text-blue-600" />
          <span>{title}</span>
        </div>
        {timeLabel && (
          <span className="font-mono text-[11px] font-semibold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
            {timeLabel}
          </span>
        )}
      </div>

      {resolvedUrl ? (
        <div className="space-y-2">
          <a
            href={resolvedUrl}
            target="_blank"
            rel="noreferrer"
            className="block overflow-hidden rounded-lg border border-slate-200 bg-slate-900 group"
          >
            <img
              src={resolvedUrl}
              alt={title}
              className="h-44 w-full object-cover transition group-hover:scale-[1.02]"
            />
          </a>
          <div className="flex items-center justify-between gap-2 text-[11px]">
            <span className={`inline-flex items-center rounded-full px-2 py-0.5 font-semibold ${matchMeta.toneClass}`}>
              {matchMeta.label}
            </span>
            <a
              href={resolvedUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-semibold text-blue-600 hover:text-blue-700"
            >
              <span>Buka Foto</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      ) : (
        <div className="flex h-44 flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 bg-white text-center text-xs text-slate-400 px-3">
          <Camera className="h-6 w-6 mb-1.5 text-slate-300" />
          <span>{emptyText}</span>
        </div>
      )}

      <div className="rounded-lg border border-slate-200 bg-white px-2.5 py-2 text-[11px] space-y-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-slate-500">Titik GPS Pekerja:</span>
          {mapsUrl ? (
            <a
              href={mapsUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1 font-mono font-semibold text-blue-600 hover:underline"
            >
              <span>{coords}</span>
              <ExternalLink className="h-3 w-3" />
            </a>
          ) : (
            <span className="font-mono text-slate-400">{coords || 'Tidak tersedia'}</span>
          )}
        </div>
      </div>
    </div>
  )
}

export default function AbsensiInspectionDialog({
  attendance,
  employee = null,
  job = null,
  processing = false,
  readOnly = false,
  onClose,
  onVerify,
}) {
  const dialogRef = useRef(null)
  const [catatanAdmin, setCatatanAdmin] = useState('')

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (attendance) {
      setCatatanAdmin(attendance.catatan_admin || '')
      if (!dialog.open) {
        dialog.showModal()
      }
    } else if (dialog.open) {
      dialog.close()
    }
  }, [attendance])

  const handleCancel = (event) => {
    event.preventDefault()
    if (!processing) {
      onClose()
    }
  }

  const handleDialogMouseDown = (event) => {
    const dialog = dialogRef.current
    if (!dialog || processing) return
    const rect = dialog.getBoundingClientRect()
    const clickedOutside =
      event.clientX < rect.left ||
      event.clientX > rect.right ||
      event.clientY < rect.top ||
      event.clientY > rect.bottom
    if (clickedOutside) {
      onClose()
    }
  }

  const loc = resolveAttendanceLocation(attendance, job?.titik_lokasi || '')
  const workerName = employee?.nama || attendance?.nama_karyawan || 'Karyawan'
  const workerRole = employee?.jabatan || attendance?.jabatan || 'Teknisi Lapangan'
  const jobName = job?.nama_pekerjaan || attendance?.nama_pekerjaan || 'Pekerjaan'
  const jobDesc = job?.deskripsi || attendance?.deskripsi_pekerjaan || ''
  const jobArea = job?.lokasi || attendance?.lokasi_pekerjaan || attendance?.lokasi || 'Lokasi belum ditentukan'
  const jobStatus = job?.status || attendance?.status_pekerjaan || ''
  const jobDeadline = job?.target_selesai || attendance?.target_selesai_pekerjaan || ''
  const assignmentType = attendance?.jenis_penugasan || attendance?.assignment_type || ''

  const dayMeta = formatWeekdayAndDate(attendance?.tanggal)
  const deadlineMeta = jobDeadline ? formatWeekdayAndDate(jobDeadline, true) : null
  const jamMasuk = attendance?.jam_masuk ? String(attendance.jam_masuk).slice(0, 5) : '—'
  const jamPulang = attendance?.jam_pulang ? String(attendance.jam_pulang).slice(0, 5) : 'Aktif / Belum Pulang'
  const durasiText =
    attendance?.durasi_format ||
    (attendance?.durasi_menit
      ? `${Math.floor(attendance.durasi_menit / 60)}j ${attendance.durasi_menit % 60}m`
      : `${attendance?.durasi_jam || 0} jam`)

  return (
    <dialog
      ref={dialogRef}
      onCancel={handleCancel}
      onMouseDown={handleDialogMouseDown}
      aria-labelledby="absensi-inspection-title"
      className="m-auto w-[min(94vw,50rem)] max-h-[90vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white p-0 text-slate-800 shadow-2xl backdrop:bg-slate-950/60 backdrop:backdrop-blur-xs"
    >
      {attendance && (
        <div className="flex flex-col">
          {/* Header */}
          <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-slate-50/95 px-5 py-4 backdrop-blur-xs">
            <div>
              <h3 id="absensi-inspection-title" className="text-base font-bold text-slate-900">
                {readOnly
                  ? 'Detail Absensi Pekerjaan & Jam Kerja'
                  : 'Detail & Persetujuan Absensi Pekerjaan'}
              </h3>
              <p className="mt-0.5 text-xs text-slate-500">
                {readOnly
                  ? 'Rincian lengkap data pekerjaan, hari & tanggal, jam kerja, foto kamera, serta titik lokasi.'
                  : 'Periksa kesesuaian data pekerjaan, foto kamera langsung, dan titik GPS pekerja sebelum menyetujui.'}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              aria-label="Tutup dialog detail absensi"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-200/70 hover:text-slate-700 disabled:opacity-50"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="p-5 space-y-4">
            {/* Ringkasan Identitas, Hari/Tanggal, & Jam Kerja */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-slate-700 font-bold">
                    <Briefcase className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>Detail Data Pekerjaan</span>
                  </div>
                  {jobStatus && (
                    <span className="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold text-slate-700 border border-slate-200">
                      {JobStatusText(jobStatus)}
                    </span>
                  )}
                </div>

                <div>
                  <p className="text-sm font-bold text-slate-900">{jobName}</p>
                  {jobDesc && (
                    <p className="mt-1 text-[11px] text-slate-600 leading-relaxed">{jobDesc}</p>
                  )}
                </div>

                <div className="space-y-1 pt-2 border-t border-slate-200/80 text-[11px]">
                  <p className="flex items-start gap-1.5 text-slate-600">
                    <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0 mt-0.5" />
                    <span>{jobArea}</span>
                  </p>
                  {assignmentType && (
                    <p className="text-slate-500">
                      Penugasan:{' '}
                      <strong className="text-slate-700">
                        {assignmentType === 'mandiri' ? 'Diambil Mandiri' : 'Ditetapkan Admin'}
                      </strong>
                    </p>
                  )}
                  {deadlineMeta && (
                    <p className="text-slate-500">
                      Deadline Proyek: <strong className="text-slate-700">{deadlineMeta.fullDate}</strong>
                    </p>
                  )}
                </div>
              </div>

              <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-bold text-slate-900">{workerName}</p>
                    <p className="text-[11px] text-slate-500">
                      {workerRole} • ID #{attendance.id_karyawan}
                    </p>
                  </div>
                  <StatusPill status={attendance.status_verifikasi} />
                </div>

                <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Calendar className="h-3.5 w-3.5 text-slate-400" /> Hari &amp; Tanggal:
                    </span>
                    <span className="font-bold text-slate-900 text-right">{dayMeta.label}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Jam Masuk:</span>
                    <span className="font-mono font-bold text-slate-800">{jamMasuk}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500">Jam Pulang:</span>
                    <span className="font-mono font-bold text-slate-800">{jamPulang}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-slate-500 flex items-center gap-1">
                      <Clock className="h-3.5 w-3.5 text-slate-400" /> Total Jam Kerja:
                    </span>
                    <span className="font-bold text-blue-700 text-sm">{durasiText}</span>
                  </div>
                </div>

                {attendance.catatan && (
                  <div className="pt-2 border-t border-slate-200/80 text-[11px] text-slate-600">
                    <span className="font-semibold text-slate-700">Catatan Pekerja: </span>
                    {attendance.catatan}
                  </div>
                )}
              </div>
            </div>

            {/* Perbandingan Titik Target Proyek */}
            <div className="rounded-xl border border-blue-200 bg-blue-50/60 p-3.5 text-xs flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-blue-600 shrink-0" />
                <div>
                  <p className="font-bold text-slate-900">Titik GPS Target Pekerjaan (Batas toleransi 150 m)</p>
                  <p className="font-mono text-[11px] text-slate-600">
                    {loc.hasJobCoords
                      ? loc.titikProyek
                      : 'Titik koordinat proyek belum disetel di Data Pekerjaan / Lokasi Kerja.'}
                  </p>
                </div>
              </div>
              {loc.mapsProyekUrl && (
                <a
                  href={loc.mapsProyekUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 border border-blue-200 hover:bg-blue-50"
                >
                  <span>Peta Lokasi Proyek</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {/* Foto Kamera Masuk & Pulang */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <PhotoEvidenceCard
                title="Foto Kamera Absen Masuk"
                timeLabel={`Masuk ${jamMasuk}`}
                photoPath={attendance.foto_lokasi}
                coords={loc.titikMasuk}
                mapsUrl={loc.mapsMasukUrl}
                matchMeta={loc.matchMasuk}
                emptyText="Belum ada foto kamera absen masuk"
              />
              <PhotoEvidenceCard
                title="Foto Kamera Absen Pulang"
                timeLabel={attendance.jam_pulang ? `Pulang ${jamPulang}` : 'Belum Pulang'}
                photoPath={attendance.foto_pulang}
                coords={loc.titikPulang}
                mapsUrl={loc.mapsPulangUrl}
                matchMeta={loc.matchPulang}
                emptyText={
                  attendance.jam_pulang
                    ? 'Foto kamera pulang tidak tersedia'
                    : 'Pekerja belum melakukan absen pulang'
                }
              />
            </div>

            {/* Catatan Verifikasi Admin */}
            {readOnly ? (
              attendance.catatan_admin && (
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-3.5 text-xs">
                  <p className="font-bold text-slate-800">Catatan Verifikasi Admin</p>
                  <p className="mt-1 text-slate-600">{attendance.catatan_admin}</p>
                </div>
              )
            ) : (
              <div className="space-y-1.5">
                <label
                  htmlFor="inspection-catatan-admin"
                  className="block text-xs font-semibold text-slate-700"
                >
                  Catatan Admin (opsional, akan terlihat oleh pekerja)
                </label>
                <textarea
                  id="inspection-catatan-admin"
                  rows={2}
                  value={catatanAdmin}
                  onChange={(e) => setCatatanAdmin(e.target.value)}
                  placeholder="Contoh: Foto di lokasi sesuai titik, atau alasan penolakan jika tidak sesuai..."
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/15"
                />
              </div>
            )}
          </div>

          {/* Footer Aksi */}
          <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-100 bg-slate-50/80 px-5 py-3.5">
            <button
              type="button"
              onClick={onClose}
              disabled={processing}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-50"
            >
              Tutup
            </button>
            {!readOnly && onVerify && (
              <>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => onVerify(attendance.id_absensi, 'ditolak', catatanAdmin)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-rose-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-rose-700 disabled:opacity-50"
                >
                  <XCircle className="h-3.5 w-3.5" />
                  <span>Tolak Absensi</span>
                </button>
                <button
                  type="button"
                  disabled={processing}
                  onClick={() => onVerify(attendance.id_absensi, 'disetujui', catatanAdmin)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-700 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-3.5 w-3.5" />
                  <span>Setujui Absensi</span>
                </button>
              </>
            )}
          </div>
        </div>
      )}
    </dialog>
  )
}
