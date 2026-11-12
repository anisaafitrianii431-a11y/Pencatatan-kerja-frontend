import { useEffect, useMemo, useState } from 'react'
import {
  STATUS_PEKERJAAN,
  STATUS_PEKERJAAN_OPTIONS,
} from '../../data/pekerjaan.js'
import { getKaryawan } from '../../services/karyawanApi.js'
import { getPekerjaan } from '../../services/pekerjaanApi.js'
import { getPenugasan } from '../../services/penugasanApi.js'
import {
  AbsensiService,
  GajiService,
  PengeluaranService,
  formatRupiah,
} from '../../services/api.js'

const DATE_FORMATTER = new Intl.DateTimeFormat('id-ID', {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

const STATUS_PRESENTATION = {
  [STATUS_PEKERJAAN.BELUM_MULAI]: {
    label: 'Belum Dimulai',
    className: 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-600/20',
    color: '#f59e0b',
    dot: 'bg-amber-500',
  },
  [STATUS_PEKERJAAN.BERJALAN]: {
    label: 'Sedang Berjalan',
    className: 'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20',
    color: '#2563eb',
    dot: 'bg-blue-600',
  },
  [STATUS_PEKERJAAN.SELESAI]: {
    label: 'Selesai',
    className:
      'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-600/20',
    color: '#10b981',
    dot: 'bg-emerald-500',
  },
}

function formatDate(value) {
  if (!value) return '—'
  const date = new Date(`${value}T00:00:00`)
  return Number.isNaN(date.getTime()) ? '—' : DATE_FORMATTER.format(date)
}

function getJakartaToday() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function formatCurrency(val) {
  if (val === null || val === undefined || Number.isNaN(Number(val))) {
    return 'Rp 0'
  }
  return formatRupiah(val)
}

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    employees: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    work: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
    assignments: (
      <>
        <rect x="5" y="4" width="14" height="17" rx="2" />
        <path d="M9 4.5h6M8.5 11h7M8.5 15h4M16 15l1.5 1.5L20 14" />
      </>
    ),
    calendar: (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18" />
      </>
    ),
    'calendar-check': (
      <>
        <rect x="3" y="5" width="18" height="16" rx="2" />
        <path d="M16 3v4M8 3v4M3 10h18M9 14l2 2 4-4" />
      </>
    ),
    banknote: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </>
    ),
    wallet: (
      <>
        <path d="M21 12V7H5a2 2 0 0 1 0-4h14v4" />
        <path d="M3 5v14a2 2 0 0 0 2 2h16v-5" />
        <path d="M18 12a2 2 0 0 0 0 4h4v-4Z" />
      </>
    ),
    location: (
      <>
        <path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0Z" />
        <circle cx="12" cy="10" r="2.5" />
      </>
    ),
    arrow: <path d="M5 12h14m-7-7 7 7-7 7" />,
    activity: <path d="M3 12h4l3-8 4 16 3-8h4" />,
    alert: (
      <>
        <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
        <line x1="12" y1="9" x2="12" y2="13" />
        <line x1="12" y1="17" x2="12.01" y2="17" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    refresh: (
      <>
        <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
        <path d="M21 3v5h-5" />
        <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
        <path d="M3 21v-5h5" />
      </>
    ),
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
      {paths[name] || null}
    </svg>
  )
}

function StatusBadge({ status }) {
  const presentation = STATUS_PRESENTATION[status] ?? {
    label: status || 'Tidak tersedia',
    className: 'bg-slate-100 text-slate-600',
  }

  return (
    <span
      className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${presentation.className}`}
    >
      {presentation.label}
    </span>
  )
}

function StatisticsCard({
  label,
  value,
  sublabel,
  icon,
  tone,
  isLoading,
  onClick,
  extra,
}) {
  return (
    <article
      onClick={onClick}
      className={`flex flex-col justify-between rounded-xl border border-slate-200/90 bg-white p-4 shadow-sm transition ${
        onClick
          ? 'cursor-pointer hover:border-blue-400 hover:shadow-md active:scale-[0.99]'
          : 'hover:border-slate-300'
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        <span
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${tone}`}
        >
          <Icon className="h-5 w-5" name={icon} />
        </span>
      </div>
      <div className="mt-2">
        <p className="text-2xl font-bold tracking-tight text-slate-900">
          {isLoading ? '—' : value}
        </p>
        {sublabel && (
          <p className="mt-1 text-[11px] text-slate-400 truncate">{sublabel}</p>
        )}
        {extra && (
          <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] space-y-0.5 text-slate-500">
            {extra}
          </div>
        )}
      </div>
    </article>
  )
}

function WorkStatusDonutChart({ counts, total, onSelectStatus }) {
  const radius = 48
  const strokeWidth = 14
  const circumference = 2 * Math.PI * radius

  const statusConfig = [
    {
      key: STATUS_PEKERJAAN.BERJALAN,
      label: 'Sedang Berjalan',
      count: counts[STATUS_PEKERJAAN.BERJALAN] || 0,
      color: '#2563eb',
      dotClass: 'bg-blue-600',
    },
    {
      key: STATUS_PEKERJAAN.BELUM_MULAI,
      label: 'Belum Dimulai',
      count: counts[STATUS_PEKERJAAN.BELUM_MULAI] || 0,
      color: '#f59e0b',
      dotClass: 'bg-amber-500',
    },
    {
      key: STATUS_PEKERJAAN.SELESAI,
      label: 'Selesai',
      count: counts[STATUS_PEKERJAAN.SELESAI] || 0,
      color: '#10b981',
      dotClass: 'bg-emerald-500',
    },
  ]

  let accumulatedLength = 0
  const segments = statusConfig.map((item) => {
    const length = total > 0 ? (item.count / total) * circumference : 0
    const offset = accumulatedLength
    accumulatedLength += length
    const percent = total > 0 ? Math.round((item.count / total) * 100) : 0
    return { ...item, length, offset, percent }
  })

  return (
    <div className="flex flex-col items-center justify-center gap-6 sm:flex-row sm:gap-8">
      {/* Donut Chart SVG */}
      <div className="relative h-40 w-40 shrink-0">
        <svg
          aria-label="Distribusi status pekerjaan"
          className="h-full w-full -rotate-90"
          viewBox="0 0 120 120"
        >
          <circle
            cx="60"
            cy="60"
            fill="none"
            r={radius}
            stroke="#f1f5f9"
            strokeWidth={strokeWidth}
          />
          {total > 0 &&
            segments.map((segment) => (
              <circle
                key={segment.key}
                cx="60"
                cy="60"
                fill="none"
                r={radius}
                stroke={segment.color}
                strokeDasharray={`${segment.length} ${
                  circumference - segment.length
                }`}
                strokeDashoffset={-segment.offset}
                strokeWidth={strokeWidth}
                onClick={() => onSelectStatus && onSelectStatus(segment.key)}
                className="transition-all duration-500 ease-out cursor-pointer hover:opacity-80"
              />
            ))}
        </svg>
        <button
          type="button"
          onClick={() => onSelectStatus && onSelectStatus('')}
          className="absolute inset-0 flex flex-col items-center justify-center text-center cursor-pointer hover:scale-105 transition rounded-full"
          title="Klik untuk melihat semua status pekerjaan"
        >
          <span className="text-2xl font-bold tracking-tight text-slate-900">
            {total}
          </span>
          <span className="text-[11px] font-medium text-slate-400">
            Total Proyek
          </span>
        </button>
      </div>

      {/* Legend */}
      <ul className="w-full max-w-xs space-y-2">
        {segments.map((segment) => (
          <li
            key={segment.key}
            onClick={() => onSelectStatus && onSelectStatus(segment.key)}
            className={`flex items-center justify-between gap-3 text-xs p-1.5 rounded-lg transition ${
              onSelectStatus
                ? 'cursor-pointer hover:bg-slate-100/80 active:scale-[0.99]'
                : ''
            }`}
            title={`Klik untuk memfilter proyek status ${segment.label}`}
          >
            <span className="flex items-center gap-2 text-slate-600 font-medium">
              <span
                className={`h-2.5 w-2.5 shrink-0 rounded-full ${segment.dotClass}`}
              />
              <span>{segment.label}</span>
            </span>
            <span className="tabular-nums font-bold text-slate-900">
              {segment.count}{' '}
              <span className="font-normal text-slate-400">
                ({segment.percent}%)
              </span>
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function WeeklyAttendanceBarChart({ attendanceList = [], onSelectDate }) {
  const days = useMemo(() => {
    const result = []
    const dayNames = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab']

    for (let i = 6; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const dateString = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Asia/Jakarta',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(d)

      const dayName = dayNames[d.getDay()]
      const shortDate = new Intl.DateTimeFormat('id-ID', {
        day: 'numeric',
        month: 'short',
      }).format(d)

      const dayAttendances = attendanceList.filter(
        (a) => a.tanggal === dateString,
      )
      const count = dayAttendances.length

      result.push({
        date: dateString,
        dayName,
        shortDate,
        isToday: i === 0,
        count,
      })
    }
    return result
  }, [attendanceList])

  const maxCount = Math.max(1, ...days.map((d) => d.count))
  const totalWeekly = days.reduce((sum, d) => sum + d.count, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between text-xs text-slate-500">
        <span>Kehadiran per Hari (7 Hari Terakhir)</span>
        <span className="font-semibold text-slate-800">
          Total: {totalWeekly} kehadiran
        </span>
      </div>

      <div className="flex h-36 items-end justify-between gap-2 pt-6">
        {days.map((day) => {
          const heightPercent =
            day.count > 0 ? Math.max(16, (day.count / maxCount) * 100) : 6

          return (
            <div
              key={day.date}
              onClick={() => onSelectDate && onSelectDate(day.date)}
              className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end cursor-pointer group"
              title={`${day.shortDate} (${day.dayName}): ${day.count} presensi • Klik untuk buka Rekap Absensi`}
            >
              <span
                className={`text-[11px] font-bold transition group-hover:scale-110 ${
                  day.count > 0 ? 'text-slate-700' : 'text-slate-300'
                }`}
              >
                {day.count}
              </span>

              <div className="w-full max-w-[28px] rounded-t-md bg-slate-100 h-24 flex items-end">
                <div
                  style={{ height: `${heightPercent}%` }}
                  className={`w-full rounded-t-md transition-all duration-300 group-hover:opacity-80 ${
                    day.isToday
                      ? 'bg-blue-600 shadow-sm shadow-blue-500/20 ring-2 ring-blue-400/30'
                      : day.count > 0
                        ? 'bg-blue-400'
                        : 'bg-slate-200'
                  }`}
                />
              </div>

              <div className="text-center">
                <span
                  className={`block text-[11px] font-semibold ${
                    day.isToday ? 'text-blue-600' : 'text-slate-600'
                  }`}
                >
                  {day.dayName}
                </span>
                <span className="block text-[9px] text-slate-400">
                  {day.shortDate.split(' ')[0]}
                </span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function DeadlineWarningSection({ jobs = [], onNavigate }) {
  const today = useMemo(() => getJakartaToday(), [])

  const criticalJobs = useMemo(() => {
    return jobs
      .filter((job) => job.status !== 'selesai' && Boolean(job.target_selesai))
      .map((job) => {
        const target = new Date(`${job.target_selesai}T00:00:00`)
        const curr = new Date(`${today}T00:00:00`)
        const diffDays = Math.round((target - curr) / (1000 * 60 * 60 * 24))
        return { ...job, diffDays }
      })
      .filter((job) => job.diffDays <= 3)
      .sort((a, b) => a.diffDays - b.diffDays)
  }, [jobs, today])

  return (
    <div className="space-y-3">
      {criticalJobs.length === 0 ? (
        <div className="rounded-xl border border-slate-100 bg-slate-50/60 p-6 text-center">
          <span className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <Icon name="check" className="h-5 w-5" />
          </span>
          <p className="mt-2 text-sm font-semibold text-slate-800">
            Semua Proyek Sesuai Jadwal
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            Tidak ada pekerjaan yang terlambat atau mendekati tenggat (H-3).
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100">
          {criticalJobs.map((job) => {
            let badgeStyle = ''
            let badgeLabel = ''

            if (job.diffDays < 0) {
              badgeStyle =
                'bg-rose-50 text-rose-700 ring-1 ring-inset ring-rose-600/20'
              badgeLabel = `Terlambat ${Math.abs(job.diffDays)} hari`
            } else if (job.diffDays === 0) {
              badgeStyle =
                'bg-amber-50 text-amber-800 ring-1 ring-inset ring-amber-600/20'
              badgeLabel = 'Tenggat Hari Ini'
            } else if (job.diffDays === 1) {
              badgeStyle =
                'bg-yellow-50 text-yellow-800 ring-1 ring-inset ring-yellow-600/20'
              badgeLabel = 'Tenggat Besok (H-1)'
            } else {
              badgeStyle =
                'bg-blue-50 text-blue-700 ring-1 ring-inset ring-blue-700/20'
              badgeLabel = `Tenggat H-${job.diffDays}`
            }

            return (
              <div
                key={job.id_pekerjaan}
                onClick={() =>
                  onNavigate &&
                  onNavigate(`/admin/pekerjaan?highlight=${job.id_pekerjaan}`)
                }
                className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition"
                title={`Klik untuk membuka detail proyek: ${job.nama_pekerjaan}`}
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-slate-900 hover:text-blue-600">
                    {job.nama_pekerjaan}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                    <Icon name="location" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                    <span className="truncate">
                      {job.lokasi || 'Lokasi belum ditentukan'}
                    </span>
                    <span className="text-slate-300">·</span>
                    <span>Target: {formatDate(job.target_selesai)}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold ${badgeStyle}`}
                  >
                    {badgeLabel}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function FinancialSummaryCard({ expenses = [], payrolls = [], summaryData = null, onNavigate }) {
  const stats = useMemo(() => {
    let uangKantor = 0
    let uangPribadi = 0
    let pendingExpenses = 0
    let totalPengeluaran = 0

    if (summaryData && typeof summaryData.total_pengeluaran_disetujui === 'number') {
      totalPengeluaran = summaryData.total_pengeluaran_disetujui
      uangKantor = summaryData.uang_kantor_disetujui || 0
      uangPribadi = summaryData.uang_pribadi_disetujui || 0
      pendingExpenses = summaryData.pending_count || 0
    } else {
      uangKantor = expenses
        .filter(
          (p) =>
            p.jenis_dana === 'kantor' && p.status_verifikasi === 'disetujui',
        )
        .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0)

      uangPribadi = expenses
        .filter(
          (p) =>
            p.jenis_dana === 'pribadi' && p.status_verifikasi === 'disetujui',
        )
        .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0)

      pendingExpenses = expenses.filter(
        (p) => p.status_verifikasi === 'menunggu',
      ).length

      totalPengeluaran = uangKantor + uangPribadi
    }

    const gajiDibayar = payrolls.reduce(
      (sum, g) => sum + (Number(g.total_dibayar) || (g.status_bayar === 'sudah' ? Number(g.gaji_bersih || g.total_upah || 0) : 0)),
      0,
    )

    const gajiBelumDibayar = payrolls.reduce(
      (sum, g) => sum + (Number(g.sisa_pembayaran !== undefined ? g.sisa_pembayaran : (g.status_bayar !== 'sudah' ? (g.gaji_bersih || g.total_upah || 0) : 0))),
      0,
    )

    const totalGaji = payrolls.reduce(
      (sum, g) => sum + (Number(g.gaji_bersih || g.total_upah || 0)),
      0,
    )
    const activePeriod = payrolls[0]?.periode || 'Periode Aktif'

    return {
      uangKantor,
      uangPribadi,
      pendingExpenses,
      totalPengeluaran,
      gajiDibayar,
      gajiBelumDibayar,
      totalGaji,
      activePeriod,
    }
  }, [expenses, payrolls, summaryData])

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {/* Kolom Pengeluaran Operasional */}
        <div
          onClick={() => onNavigate && onNavigate('Pengeluaran & Kwitansi')}
          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5 cursor-pointer hover:border-amber-300 hover:bg-amber-50/30 transition group"
          title="Klik untuk membuka menu Pengeluaran & Kwitansi"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 group-hover:text-amber-700">
              <Icon name="banknote" className="h-4 w-4 text-amber-600" />
              Operasional Proyek
            </span>
            <span className="text-[11px] font-semibold text-blue-600 group-hover:underline">
              Kelola →
            </span>
          </div>

          <div>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(stats.totalPengeluaran)}
            </p>
          </div>

          <div className="border-t border-slate-200/60 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Dana Kantor:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(stats.uangKantor)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Reimburse Pribadi:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(stats.uangPribadi)}
              </span>
            </div>
            {stats.pendingExpenses > 0 && (
              <div className="flex justify-between text-amber-700 font-medium">
                <span>Nota Menunggu:</span>
                <span>{stats.pendingExpenses} nota</span>
              </div>
            )}
          </div>
        </div>

        {/* Kolom Penggajian */}
        <div
          onClick={() => onNavigate && onNavigate('Gaji')}
          className="rounded-xl border border-slate-100 bg-slate-50/70 p-3.5 space-y-2.5 cursor-pointer hover:border-purple-300 hover:bg-purple-50/30 transition group"
          title="Klik untuk membuka menu Penggajian Karyawan"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5 group-hover:text-purple-700">
              <Icon name="wallet" className="h-4 w-4 text-purple-600" />
              Penggajian Karyawan
            </span>
            <span className="text-[11px] font-semibold text-blue-600 group-hover:underline">
              Kelola →
            </span>
          </div>

          <div>
            <p className="text-lg font-bold text-slate-900">
              {formatCurrency(stats.totalGaji)}
            </p>
          </div>

          <div className="border-t border-slate-200/60 pt-2 space-y-1 text-xs">
            <div className="flex justify-between text-slate-600">
              <span>Sudah Dibayarkan:</span>
              <span className="font-semibold text-emerald-700">
                {formatCurrency(stats.gajiDibayar)}
              </span>
            </div>
            <div className="flex justify-between text-slate-600">
              <span>Belum Dibayarkan:</span>
              <span className="font-semibold text-slate-800">
                {formatCurrency(stats.gajiBelumDibayar)}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
function DashboardAdmin({ onNavigate = () => {} }) {
  const [store, setStore] = useState({
    employees: [],
    jobs: [],
    assignments: [],
    expenses: [],
    summaryExpenses: null,
    attendances: [],
    payrolls: [],
    kalkulasiGaji: [],
    isLoading: true,
    error: '',
  })

  const {
    employees,
    jobs,
    assignments,
    expenses,
    summaryExpenses,
    attendances,
    payrolls,
    kalkulasiGaji,
    isLoading,
    error,
  } = store

  const today = useMemo(() => getJakartaToday(), [])

  useEffect(() => {
    let isMounted = true

    async function loadDashboardData() {
      try {
        const currentPeriod = today.slice(0, 7) // '2026-11'

        const [
          loadedEmployees,
          loadedJobs,
          loadedAssignments,
          loadedExpenses,
          loadedSummaryExpenses,
          loadedAttendances,
          loadedPayrolls,
          loadedKalkulasiGaji,
        ] = await Promise.all([
          getKaryawan().catch(() => []),
          getPekerjaan().catch(() => []),
          getPenugasan().catch(() => []),
          PengeluaranService.getAll().catch(() => []),
          PengeluaranService.getSummary().catch(() => null),
          AbsensiService.getAll().catch(() => []),
          GajiService.getByPeriode(currentPeriod).catch(() => []),
          GajiService.getKalkulasi(currentPeriod).catch(() => []),
        ])

        if (isMounted) {
          setStore({
            employees: Array.isArray(loadedEmployees) ? loadedEmployees : [],
            jobs: Array.isArray(loadedJobs) ? loadedJobs : [],
            assignments: Array.isArray(loadedAssignments)
              ? loadedAssignments
              : [],
            expenses: Array.isArray(loadedExpenses) ? loadedExpenses : [],
            summaryExpenses: loadedSummaryExpenses,
            attendances: Array.isArray(loadedAttendances)
              ? loadedAttendances
              : [],
            payrolls: Array.isArray(loadedPayrolls) ? loadedPayrolls : [],
            kalkulasiGaji: Array.isArray(loadedKalkulasiGaji) ? loadedKalkulasiGaji : [],
            isLoading: false,
            error: '',
          })
        }
      } catch (loadError) {
        if (isMounted) {
          setStore((current) => ({
            ...current,
            isLoading: false,
            error: `Data dashboard tidak dapat dimuat: ${loadError.message}`,
          }))
        }
      }
    }

    loadDashboardData()

    function handleSyncEvent() {
      loadDashboardData()
    }

    window.addEventListener('storage', handleSyncEvent)
    window.addEventListener('absensi_updated', handleSyncEvent)
    window.addEventListener('pengeluaran_updated', handleSyncEvent)
    window.addEventListener('gaji_updated', handleSyncEvent)
    window.addEventListener('pekerjaan_updated', handleSyncEvent)
    window.addEventListener('karyawan_updated', handleSyncEvent)
    window.addEventListener('penugasan_updated', handleSyncEvent)

    return () => {
      isMounted = false
      window.removeEventListener('storage', handleSyncEvent)
      window.removeEventListener('absensi_updated', handleSyncEvent)
      window.removeEventListener('pengeluaran_updated', handleSyncEvent)
      window.removeEventListener('gaji_updated', handleSyncEvent)
      window.removeEventListener('pekerjaan_updated', handleSyncEvent)
      window.removeEventListener('karyawan_updated', handleSyncEvent)
      window.removeEventListener('penugasan_updated', handleSyncEvent)
    }
  }, [today])

  // Lookup maps
  const employeeMap = useMemo(
    () =>
      new Map(employees.map((emp) => [Number(emp.id_karyawan), emp])),
    [employees],
  )

  const jobMap = useMemo(
    () => new Map(jobs.map((job) => [Number(job.id_pekerjaan), job])),
    [jobs],
  )

  // Status counts for Pekerjaan
  const jobStatusCounts = useMemo(() => {
    return Object.fromEntries(
      STATUS_PEKERJAAN_OPTIONS.map(({ value }) => [
        value,
        jobs.filter((job) => job.status === value).length,
      ]),
    )
  }, [jobs])

  // Presensi hari ini
  const todayAttendanceCount = useMemo(() => {
    return attendances.filter((a) => a.tanggal === today).length
  }, [attendances, today])

  // Financial summary: Pengeluaran
  const totalExpensesAmount = useMemo(() => {
    if (summaryExpenses && typeof summaryExpenses.total_pengeluaran_disetujui === 'number') {
      return summaryExpenses.total_pengeluaran_disetujui
    }
    return expenses
      .filter((p) => p.status_verifikasi === 'disetujui')
      .reduce((sum, p) => sum + (Number(p.nominal_disetujui || p.nominal) || 0), 0)
  }, [expenses, summaryExpenses])

  const expensesKantorAmount = useMemo(() => {
    if (summaryExpenses && typeof summaryExpenses.uang_kantor_disetujui === 'number') {
      return summaryExpenses.uang_kantor_disetujui
    }
    return expenses
      .filter((p) => p.jenis_dana === 'kantor' && p.status_verifikasi === 'disetujui')
      .reduce((sum, p) => sum + (Number(p.nominal) || 0), 0)
  }, [expenses, summaryExpenses])

  const expensesPribadiAmount = useMemo(() => {
    if (summaryExpenses && typeof summaryExpenses.uang_pribadi_disetujui === 'number') {
      return summaryExpenses.uang_pribadi_disetujui
    }
    return expenses
      .filter((p) => p.jenis_dana === 'pribadi' && p.status_verifikasi === 'disetujui')
      .reduce((sum, p) => sum + (Number(p.nominal_disetujui || p.nominal) || 0), 0)
  }, [expenses, summaryExpenses])

  const pendingExpensesCount = useMemo(() => {
    if (summaryExpenses && typeof summaryExpenses.pending_count === 'number') {
      return summaryExpenses.pending_count
    }
    return expenses.filter((p) => p.status_verifikasi === 'menunggu').length
  }, [expenses, summaryExpenses])

  // Financial summary: Penggajian
  const payrollStats = useMemo(() => {
    const listToUse = payrolls.length > 0 ? payrolls : kalkulasiGaji

    const totalGaji = listToUse.reduce(
      (sum, g) => sum + (Number(g.gaji_bersih !== undefined ? g.gaji_bersih : g.total_upah) || 0),
      0,
    )
    const sudahDibayar = listToUse.reduce(
      (sum, g) => sum + (Number(g.total_dibayar) || (g.status_bayar === 'sudah' ? Number(g.gaji_bersih || g.total_upah || 0) : 0)),
      0,
    )
    const belumDibayar = listToUse.reduce(
      (sum, g) => sum + (Number(g.sisa_pembayaran !== undefined ? g.sisa_pembayaran : (g.status_bayar !== 'sudah' ? (g.gaji_bersih || g.total_upah || 0) : 0))),
      0,
    )
    const activePeriod = listToUse[0]?.periode || today.slice(0, 7)

    return { totalGaji, sudahDibayar, belumDibayar, activePeriod }
  }, [payrolls, kalkulasiGaji, today])

  // 6 Kartu Statistik Utama
  const statCards = [
    {
      label: 'Total Karyawan',
      value: employees.length,
      sublabel: `${employees.filter((e) => e.status !== 'nonaktif').length} aktif • Klik kelola`,
      icon: 'employees',
      tone: 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10',
      onClick: () => onNavigate('Data Karyawan'),
    },
    {
      label: 'Total Pekerjaan',
      value: jobs.length,
      sublabel: `${jobStatusCounts[STATUS_PEKERJAAN.BERJALAN] || 0} sedang berjalan • Klik kelola`,
      icon: 'work',
      tone: 'bg-indigo-50 text-indigo-600 ring-1 ring-indigo-600/10',
      onClick: () => onNavigate('Data Pekerjaan'),
    },
    {
      label: 'Total Penugasan',
      value: assignments.length,
      sublabel: `${assignments.length} penugasan teknisi • Klik kelola`,
      icon: 'assignments',
      tone: 'bg-violet-50 text-violet-600 ring-1 ring-violet-600/10',
      onClick: () => onNavigate('Penugasan'),
    },
    {
      label: 'Kehadiran Hari Ini',
      value: todayAttendanceCount,
      sublabel:
        todayAttendanceCount > 0
          ? `${todayAttendanceCount} hadir hari ini • Klik rekap`
          : 'Belum ada presensi • Klik rekap',
      icon: 'calendar-check',
      tone: 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10',
      onClick: () => onNavigate('Rekap Absensi'),
    },
    {
      label: 'Total Pengeluaran',
      value: formatCurrency(totalExpensesAmount),
      sublabel: 'Biaya disetujui • Klik kelola',
      icon: 'banknote',
      tone: 'bg-amber-50 text-amber-600 ring-1 ring-amber-600/10',
      onClick: () => onNavigate('Pengeluaran & Kwitansi'),
      extra: (
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Uang Kantor:</span>
            <span className="font-semibold text-slate-700">{formatCurrency(expensesKantorAmount)}</span>
          </div>
          <div className="flex justify-between">
            <span>Uang Pribadi:</span>
            <span className="font-semibold text-slate-700">{formatCurrency(expensesPribadiAmount)}</span>
          </div>
          {pendingExpensesCount > 0 && (
            <div className="flex justify-between text-amber-600 font-semibold">
              <span>Menunggu:</span>
              <span>{pendingExpensesCount} nota</span>
            </div>
          )}
        </div>
      ),
    },
    {
      label: 'Total Gaji',
      value: formatCurrency(payrollStats.totalGaji),
      sublabel: `Periode ${payrollStats.activePeriod} • Klik kelola`,
      icon: 'wallet',
      tone: 'bg-purple-50 text-purple-600 ring-1 ring-purple-600/10',
      onClick: () => onNavigate('Gaji'),
      extra: (
        <div className="space-y-0.5">
          <div className="flex justify-between">
            <span>Sudah Dibayar:</span>
            <span className="font-semibold text-emerald-600">{formatCurrency(payrollStats.sudahDibayar)}</span>
          </div>
          <div className="flex justify-between">
            <span>Sisa Kewajiban:</span>
            <span className="font-semibold text-slate-700">{formatCurrency(payrollStats.belumDibayar)}</span>
          </div>
        </div>
      ),
    },
  ]

  // Aktivitas Terbaru (Aktual dari sistem)
  const recentActivities = useMemo(() => {
    const list = []

    // Penugasan
    assignments.forEach((a) => {
      const emp = employeeMap.get(Number(a.id_karyawan))
      const job = jobMap.get(Number(a.id_pekerjaan))
      list.push({
        id: `assign-${a.id_penugasan}`,
        title: 'Penugasan Teknisi',
        description: `${emp?.nama || 'Karyawan'} ditugaskan pada "${
          job?.nama_pekerjaan || `Proyek #${a.id_pekerjaan}`
        }"`,
        date: a.tanggal_penugasan || '',
        timestamp: Number(a.id_penugasan) || 0,
        badge: 'Penugasan',
        badgeColor: 'bg-blue-50 text-blue-700 ring-blue-700/10',
        icon: 'assignments',
        target: 'Penugasan',
      })
    })

    // Pekerjaan
    jobs.forEach((j) => {
      list.push({
        id: `job-${j.id_pekerjaan}`,
        title: 'Pendaftaran Proyek',
        description: `Proyek "${j.nama_pekerjaan}" (${
          j.lokasi || 'Lokasi belum diatur'
        })`,
        date: j.tanggal_mulai || '',
        timestamp: Number(j.id_pekerjaan) || 0,
        badge: 'Pekerjaan',
        badgeColor: 'bg-indigo-50 text-indigo-700 ring-indigo-700/10',
        icon: 'work',
        target: `/admin/pekerjaan?highlight=${j.id_pekerjaan}`,
      })
    })

    // Pengeluaran
    expenses.slice(0, 6).forEach((e) => {
      list.push({
        id: `exp-${e.id_pengeluaran}`,
        title: 'Pengajuan Biaya Operasional',
        description: `${e.keterangan || 'Nota operasional'} (${formatCurrency(
          e.nominal_disetujui || e.nominal,
        )})`,
        date: e.tanggal || '',
        timestamp: Number(e.id_pengeluaran) || 0,
        badge: 'Pengeluaran',
        badgeColor: 'bg-amber-50 text-amber-700 ring-amber-700/10',
        icon: 'banknote',
        target: 'Pengeluaran & Kwitansi',
      })
    })

    // Absensi
    attendances.slice(0, 6).forEach((att) => {
      list.push({
        id: `att-${att.id_absensi}`,
        title: 'Presensi Kerja Karyawan',
        description: `${att.nama_karyawan || 'Pekerja'} mencatat kehadiran (Jam: ${
          att.jam_masuk || '—'
        })`,
        date: att.tanggal || '',
        timestamp: Number(att.id_absensi) || 0,
        badge: 'Presensi',
        badgeColor: 'bg-emerald-50 text-emerald-700 ring-emerald-700/10',
        icon: 'calendar',
        target: `/admin/rekap-absensi?tanggal=${att.tanggal}`,
      })
    })

    return list
      .sort((left, right) => {
        if (left.date && right.date && left.date !== right.date) {
          return right.date.localeCompare(left.date)
        }
        return right.timestamp - left.timestamp
      })
      .slice(0, 5)
  }, [assignments, employeeMap, expenses, attendances, jobMap, jobs])

  // 5 Pekerjaan Terbaru
  const latestJobs = useMemo(() => {
    return [...jobs]
      .sort((a, b) => Number(b.id_pekerjaan) - Number(a.id_pekerjaan))
      .slice(0, 5)
  }, [jobs])

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-6 pb-10">
      {/* 2. Banner Sambutan Gradasi Biru-Ungu */}
      <header className="relative flex flex-col gap-5 overflow-hidden rounded-2xl bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-800 p-6 sm:p-7 text-white shadow-lg shadow-blue-900/10">
        <div className="relative z-10 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
          <div className="min-w-0 max-w-2xl">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold tracking-wider uppercase text-blue-100 backdrop-blur-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-300 animate-pulse" />
              Panel Manajemen Administrator
            </span>
            <h1 className="mt-2 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Selamat Datang, Administrator!
            </h1>
            <p className="mt-1.5 text-xs sm:text-sm leading-relaxed text-blue-100/90">
              Pantau performa proyek, penetapan penugasan teknisi, presensi
              harian, dan pergerakan anggaran operasional perusahaan CV. Putra
              Anugrah Mandiri secara terpadu.
            </p>
          </div>

          {/* Quick Actions */}
          <nav
            aria-label="Aksi Cepat Admin"
            className="flex flex-wrap items-center gap-2.5 shrink-0"
          >
            {[
              {
                label: 'Kelola Karyawan',
                icon: 'employees',
                target: 'Data Karyawan',
              },
              {
                label: 'Kelola Pekerjaan',
                icon: 'work',
                target: 'Data Pekerjaan',
              },
              {
                label: 'Atur Penugasan',
                icon: 'assignments',
                target: 'Penugasan',
              },
            ].map((action) => (
              <button
                key={action.target}
                type="button"
                onClick={() => onNavigate(action.target)}
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-3.5 py-2 text-xs font-semibold text-white backdrop-blur-sm border border-white/15 transition hover:bg-white/20 active:scale-95"
              >
                <Icon name={action.icon} className="h-4 w-4" />
                <span>{action.label}</span>
                <Icon name="arrow" className="h-3 w-3 opacity-70" />
              </button>
            ))}
          </nav>
        </div>

        {/* Dekorasi Visual Halus */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-10 -bottom-10 h-64 w-64 rounded-full bg-white/5 blur-2xl"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-40 top-0 h-40 w-40 rounded-full bg-purple-500/10 blur-xl"
        />
      </header>

      {/* Error Notice */}
      {error && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <Icon name="alert" className="h-5 w-5 shrink-0 text-rose-600" />
            <p className="font-medium">{error}</p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 3. Enam Kartu Statistik Utama */}
      <section
        aria-label="Statistik Utama"
        className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3.5 sm:gap-4"
      >
        {statCards.map((card) => (
          <StatisticsCard
            key={card.label}
            label={card.label}
            value={card.value}
            sublabel={card.sublabel}
            icon={card.icon}
            tone={card.tone}
            isLoading={isLoading}
            onClick={card.onClick}
            extra={card.extra}
          />
        ))}
      </section>

      {/* 4 & 7. Baris Grafik: Status Pekerjaan (Donut) & Rekap Absensi Mingguan (Bar) */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Donut Chart Status Pekerjaan */}
        <section
          aria-label="Distribusi status pekerjaan"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Status Pekerjaan
                </h2>
                <p className="text-xs text-slate-500">
                  Distribusi proyek berdasarkan status penyelesaian.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('Data Pekerjaan')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Lihat Proyek →
              </button>
            </div>

            {isLoading ? (
              <div className="flex h-44 items-center justify-center">
                <div className="h-32 w-32 animate-pulse rounded-full bg-slate-100" />
              </div>
            ) : (
              <WorkStatusDonutChart
                counts={jobStatusCounts}
                total={jobs.length}
                onSelectStatus={(status) => {
                  if (status) {
                    onNavigate(`/admin/pekerjaan?status=${status}`)
                  } else {
                    onNavigate('Data Pekerjaan')
                  }
                }}
              />
            )}
          </div>
        </section>

        {/* Rekap Absensi Mingguan Bar Chart */}
        <section
          aria-label="Rekap absensi mingguan"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Rekap Presensi Mingguan
                </h2>
                <p className="text-xs text-slate-500">
                  Aktivitas kehadiran karyawan dalam 7 hari kalender terakhir.
                </p>
              </div>
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">
                Minggu Ini
              </span>
            </div>

            {isLoading ? (
              <div className="h-44 flex items-center justify-center">
                <p className="text-xs text-slate-400">Memuat data presensi...</p>
              </div>
            ) : (
              <WeeklyAttendanceBarChart
                attendanceList={attendances}
                onSelectDate={(date) => onNavigate(`/admin/rekap-absensi?tanggal=${date}`)}
              />
            )}
          </div>
        </section>
      </div>

      {/* 6 & 8. Baris Operasional: Pekerjaan Mendekati Tenggat & Ringkasan Keuangan */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Pekerjaan Mendekati Tenggat (H-3 / Terlambat) */}
        <section
          aria-label="Pekerjaan mendekati tenggat"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                  <Icon name="clock" className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm sm:text-base font-bold text-slate-900">
                    Pekerjaan Mendekati Tenggat
                  </h2>
                  <p className="text-xs text-slate-500">
                    Peringatan deadline kritis (H-3) dan proyek yang melewati
                    target.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('Data Pekerjaan')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Semua Proyek →
              </button>
            </div>

            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <p className="text-xs text-slate-400">Memeriksa jadwal proyek...</p>
              </div>
            ) : (
              <DeadlineWarningSection jobs={jobs} onNavigate={onNavigate} />
            )}
          </div>
        </section>

        {/* Ringkasan Finansial Operasional */}
        <section
          aria-label="Ringkasan finansial operasional"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Ringkasan Keuangan
                </h2>
                <p className="text-xs text-slate-500">
                  Anggaran pengeluaran dan status upah gaji.
                </p>
              </div>
              <span className="font-mono text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded">
                Aktif
              </span>
            </div>

            {isLoading ? (
              <div className="h-32 flex items-center justify-center">
                <p className="text-xs text-slate-400">Menghitung rincian dana...</p>
              </div>
            ) : (
              <FinancialSummaryCard
                expenses={expenses}
                payrolls={payrolls.length > 0 ? payrolls : kalkulasiGaji}
                summaryData={summaryExpenses}
                onNavigate={onNavigate}
              />
            )}
          </div>
        </section>
      </div>

      {/* 5. Baris Aktivitas Aktual & Pekerjaan Terbaru */}
      <div className="grid gap-6 xl:grid-cols-5">
        {/* Aktivitas Terbaru Aktual */}
        <section
          aria-label="Aktivitas operasional terbaru"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-3 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Aktivitas Terbaru
                </h2>
                <p className="text-xs text-slate-500">
                  Catatan transaksi penugasan, proyek, dan kehadiran terkini.
                </p>
              </div>
              <span className="text-[11px] font-medium text-slate-400">
                Real-time
              </span>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-12 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : recentActivities.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Belum ada rekaman aktivitas.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {recentActivities.map((act) => (
                  <article
                    key={act.id}
                    onClick={() => onNavigate && onNavigate(act.target || 'Dashboard')}
                    className="flex items-start gap-3 py-3 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition"
                    title={`Klik untuk membuka menu ${act.badge}`}
                  >
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                      <Icon name={act.icon} className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs font-bold text-slate-900">
                          {act.title}
                        </p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${act.badgeColor}`}
                        >
                          {act.badge}
                        </span>
                      </div>
                      <p className="mt-0.5 truncate text-xs text-slate-600">
                        {act.description}
                      </p>
                      {act.date && (
                        <p className="mt-1 text-[10px] text-slate-400">
                          Tanggal: {formatDate(act.date)}
                        </p>
                      )}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
            Aktivitas dihimpun langsung dari entri terbaru tabel database operasional.
          </p>
        </section>

        {/* Pekerjaan Terbaru */}
        <section
          aria-label="Pekerjaan terbaru terdaftar"
          className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm xl:col-span-2 flex flex-col justify-between"
        >
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div>
                <h2 className="text-sm sm:text-base font-bold text-slate-900">
                  Pekerjaan Terkini
                </h2>
                <p className="text-xs text-slate-500">
                  Daftar proyek yang baru ditambahkan.
                </p>
              </div>
              <button
                type="button"
                onClick={() => onNavigate('Data Pekerjaan')}
                className="text-xs font-semibold text-blue-600 hover:text-blue-700 transition"
              >
                Semua →
              </button>
            </div>

            {isLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, idx) => (
                  <div
                    key={idx}
                    className="h-12 animate-pulse rounded-lg bg-slate-100"
                  />
                ))}
              </div>
            ) : latestJobs.length === 0 ? (
              <p className="py-8 text-center text-xs text-slate-400">
                Belum ada data pekerjaan.
              </p>
            ) : (
              <div className="divide-y divide-slate-100">
                {latestJobs.map((job) => (
                  <div
                    key={job.id_pekerjaan}
                    onClick={() => onNavigate && onNavigate(`/admin/pekerjaan?highlight=${job.id_pekerjaan}`)}
                    className="py-2.5 first:pt-0 last:pb-0 cursor-pointer hover:bg-slate-50/80 p-2 rounded-xl transition"
                    title={`Klik untuk membuka detail proyek: ${job.nama_pekerjaan}`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-xs font-bold text-slate-900 hover:text-blue-600">
                        {job.nama_pekerjaan}
                      </p>
                      <StatusBadge status={job.status} />
                    </div>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 truncate">
                      <Icon name="location" className="h-3 w-3 shrink-0 text-slate-400" />
                      <span className="truncate">
                        {job.lokasi || 'Lokasi belum diatur'}
                      </span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          <p className="mt-3 border-t border-slate-100 pt-2 text-[10px] text-slate-400">
            {jobs.length} total proyek tercatat di sistem.
          </p>
        </section>
      </div>
    </div>
  )
}

export default DashboardAdmin
