import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  createKaryawan,
  deleteKaryawan,
  getKaryawan,
  toggleStatusKaryawan,
  updateKaryawan,
} from '../../services/karyawanApi.js'
import AdminAvatar from '../../components/AdminAvatar.jsx'
import DeleteConfirmationDialog from '../../components/DeleteConfirmationDialog.jsx'

const PAGE_SIZE = 8

const INITIAL_FORM = {
  nama: '',
  jabatan: '',
  nomor_hp: '',
  jenis_upah: 'per_jam',
  nominal_upah: '',
  lembur_aktif: false,
  tarif_lembur: '',
  catatan_admin: '',
  status: 'aktif',
  kata_sandi: '',
  konfirmasi_kata_sandi: '',
}

const currencyFormatter = new Intl.NumberFormat('id-ID', {
  style: 'currency',
  currency: 'IDR',
  maximumFractionDigits: 0,
})

function formatCurrency(value) {
  return currencyFormatter.format(Number(value) || 0)
}

function formatWageType(type) {
  switch (type) {
    case 'per_hari':
      return {
        label: 'Gaji Per Hari',
        inputLabel: 'Besar Gaji Per Hari (Rp)',
        unit: '/ hari',
        desc: 'Dibayarkan berdasarkan jumlah hari kerja.',
        color: 'bg-amber-50 text-amber-700 ring-amber-600/20',
      }
    case 'per_bulan':
      return {
        label: 'Gaji Bulanan',
        inputLabel: 'Besar Gaji Per Bulan (Rp)',
        unit: '/ bulan',
        desc: 'Dibayarkan dengan jumlah tetap setiap bulan.',
        color: 'bg-purple-50 text-purple-700 ring-purple-600/20',
      }
    case 'per_jam':
    default:
      return {
        label: 'Gaji Per Jam',
        inputLabel: 'Besar Gaji Per Jam (Rp)',
        unit: '/ jam',
        desc: 'Dihitung berdasarkan jumlah jam kerja yang disetujui Admin.',
        color: 'bg-blue-50 text-blue-700 ring-blue-600/20',
      }
  }
}

/**
 * Menghitung estimasi ID Karyawan secara otomatis di frontend untuk live preview:
 * - 4 huruf nama depan (uppercase, stripped, pad with X if < 4)
 * - Nomor urut 3 digit berurutan secara global berdasarkan ID yang sudah pernah digunakan di sistem
 */
function computePredictedKode(fullName, existingEmployees = []) {
  if (!fullName || !fullName.trim()) return ''
  const firstWord = fullName.trim().split(/\s+/)[0] || ''
  const clean = firstWord.replace(/[^a-zA-Z]/g, '').toUpperCase()
  let prefix = clean.slice(0, 4)
  if (prefix.length < 4) {
    prefix = prefix.padEnd(4, 'X')
  }
  if (!prefix) prefix = 'KARY'

  let maxSeq = 0
  for (const emp of existingEmployees) {
    const code = emp.kode_karyawan || ''
    const match = code.match(/(\d{3,})$/)
    if (match) {
      const num = parseInt(match[1], 10)
      if (num > maxSeq) {
        maxSeq = num
      }
    }
  }

  const nextSeq = maxSeq + 1
  return `${prefix}${String(nextSeq).padStart(3, '0')}`
}

function EmployeeIcon({ name, className = 'h-4 w-4' }) {
  const paths = {
    people: (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
      </>
    ),
    'check-circle': (
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="m9 12 2 2 4-4" />
      </>
    ),
    'user-x': (
      <>
        <path d="M16 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
        <circle cx="10" cy="7" r="4" />
        <path d="m17 8 5 5M22 8l-5 5" />
      </>
    ),
    search: (
      <>
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </>
    ),
    plus: <path d="M12 5v14M5 12h14" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    chevron: <path d="m7 10 5 5 5-5" />,
    'rotate-ccw': (
      <>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </>
    ),
    sort: <path d="m8 7 4-4 4 4M16 17l-4 4-4-4M12 3v18" />,
    eye: (
      <>
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
        <circle cx="12" cy="12" r="3" />
      </>
    ),
    edit: (
      <>
        <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
      </>
    ),
    trash: (
      <>
        <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
      </>
    ),
    previous: <path d="m15 18-6-6 6-6" />,
    next: <path d="m9 18 6-6-6-6" />,
    briefcase: (
      <>
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
        <path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2" />
      </>
    ),
    banknote: (
      <>
        <rect x="2" y="6" width="20" height="12" rx="2" />
        <circle cx="12" cy="12" r="2" />
        <path d="M6 12h.01M18 12h.01" />
      </>
    ),
    check: <path d="M20 6 9 17l-5-5" />,
    alert: (
      <>
        <circle cx="12" cy="12" r="9" />
        <line x1="12" y1="8" x2="12" y2="12" />
        <line x1="12" y1="16" x2="12.01" y2="16" />
      </>
    ),
    phone: (
      <>
        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
      </>
    ),
    clock: (
      <>
        <circle cx="12" cy="12" r="10" />
        <polyline points="12 6 12 12 16 14" />
      </>
    ),
    fileText: (
      <>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="16" y1="13" x2="8" y2="13" />
        <line x1="16" y1="17" x2="8" y2="17" />
        <polyline points="10 9 9 9 8 9" />
      </>
    ),
    power: (
      <>
        <path d="M18.36 6.64a9 9 0 1 1-12.73 0" />
        <line x1="12" y1="2" x2="12" y2="12" />
      </>
    ),
    key: (
      <>
        <path d="m21 2-2 2m-1.5 1.5L16 7m-1.5 1.5L13 10m-2.5-3.5a6 6 0 1 0 7.07 7.07L22 9l-2-2-2 2-2-2-2 2-1.5-1.5" />
        <circle cx="7.5" cy="15.5" r="2.5" />
      </>
    ),
    lock: (
      <>
        <rect width="18" height="11" x="3" y="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0 1 10 0v4" />
      </>
    ),
    shield: (
      <>
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </>
    ),
    idBadge: (
      <>
        <rect width="18" height="14" x="3" y="5" rx="2" />
        <path d="M7 15h4M15 15h2M7 11h2M13 11h4" />
        <circle cx="9" cy="9" r="1.5" />
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

/**
 * MODAL DETAIL KARYAWAN (Bahasa Sederhana, 3 Panel Jelas, Tanpa Email)
 */
function EmployeeDetailModal({ employee, onClose, onEdit, onResetPassword }) {
  const navigate = useNavigate()
  if (!employee) return null

  const isEmployeeActive =
    employee.status !== 'nonaktif' &&
    employee.user_aktif !== 0 &&
    employee.aktif !== 0 &&
    employee.aktif !== false

  const wageInfo = formatWageType(employee.jenis_upah)
  const employeeCode = employee.kode_karyawan || `KARY${String(employee.id_karyawan).padStart(3, '0')}`

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-detail-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
              <EmployeeIcon name="eye" className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="employee-detail-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                Detail Data Karyawan
              </h2>
              <p className="text-xs text-slate-500">
                Informasi identitas kerja, ID karyawan, pengaturan gaji, dan catatan khusus admin.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <EmployeeIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        <div className="max-h-[75vh] overflow-y-auto p-6 space-y-5">
          {/* Hero Banner Profil Karyawan */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-slate-200/80 bg-gradient-to-r from-slate-50 via-white to-blue-50/30 p-4 shadow-2xs">
            <div className="flex items-center gap-3.5">
              <AdminAvatar
                name={employee.nama}
                className="h-14 w-14 text-base font-bold shadow-sm ring-2 ring-white"
              />
              <div className="min-w-0">
                <h3 className="text-lg font-bold text-slate-900 truncate">
                  {employee.nama}
                </h3>
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="font-mono text-xs font-bold px-2.5 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200 shadow-2xs">
                    ID: {employeeCode}
                  </span>
                  <span className="inline-flex items-center rounded-md bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-700 ring-1 ring-inset ring-slate-200">
                    {employee.jabatan || 'Belum diatur'}
                  </span>
                  {isEmployeeActive ? (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      Aktif Bekerja
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                      <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                      Status Nonaktif
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  onEdit(employee)
                }}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 transition shadow-2xs"
              >
                <EmployeeIcon name="edit" className="h-3.5 w-3.5" />
                <span>Edit Data</span>
              </button>
            </div>
          </div>

          {/* 1. DATA IDENTITAS & AKUN LOGIN */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
              <EmployeeIcon name="people" className="h-4 w-4 text-blue-600" />
              <span>1. Identitas & Akun Login</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              {/* ID Karyawan */}
              <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <EmployeeIcon name="idBadge" className="h-3.5 w-3.5 text-blue-500" />
                  ID Karyawan (Login)
                </span>
                <p className="mt-1 font-mono text-sm font-bold text-blue-700">
                  {employeeCode}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Digunakan untuk login ke sistem
                </span>
              </div>

              {/* Jabatan */}
              <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <EmployeeIcon name="briefcase" className="h-3.5 w-3.5 text-slate-400" />
                  Jabatan Pekerjaan
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {employee.jabatan || 'Belum diatur'}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Spesialisasi tugas
                </span>
              </div>

              {/* Nomor HP */}
              <div className="rounded-lg bg-slate-50/70 p-3 border border-slate-100">
                <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
                  <EmployeeIcon name="phone" className="h-3.5 w-3.5 text-slate-400" />
                  Nomor HP
                </span>
                <p className="mt-1 text-sm font-semibold text-slate-800">
                  {employee.nomor_hp ? (
                    <a
                      href={`tel:${employee.nomor_hp}`}
                      className="text-blue-600 hover:underline font-mono"
                    >
                      {employee.nomor_hp}
                    </a>
                  ) : (
                    <span className="text-slate-400 font-normal italic">Belum dicantumkan</span>
                  )}
                </p>
                <span className="text-[10px] text-slate-400 block mt-0.5">
                  Kontak kerja langsung
                </span>
              </div>
            </div>
          </div>

          {/* 2. PENGATURAN GAJI & LEMBUR */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2 mb-3">
              <EmployeeIcon name="banknote" className="h-4 w-4 text-emerald-600" />
              <span>2. Pengaturan Gaji & Lembur</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {/* Cara Pembayaran Gaji */}
              <div className="rounded-lg bg-emerald-50/40 p-3.5 border border-emerald-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-emerald-800">
                    Cara Pembayaran Gaji
                  </span>
                  <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-bold ${wageInfo.color}`}>
                    {wageInfo.label}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-emerald-700">
                    {formatCurrency(employee.nominal_upah)}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    {wageInfo.unit}
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {wageInfo.desc}
                </p>
              </div>

              {/* Gaji Tambahan Lembur */}
              <div className="rounded-lg bg-blue-50/40 p-3.5 border border-blue-100">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-blue-800">
                    Gaji Tambahan untuk Lembur
                  </span>
                  {employee.lembur_aktif ? (
                    <span className="inline-flex items-center gap-1 rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-bold text-blue-800">
                      <span className="h-1.5 w-1.5 rounded-full bg-blue-600" />
                      Aktif
                    </span>
                  ) : (
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                      Tidak Aktif
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-baseline gap-1.5">
                  <span className="text-xl font-bold tracking-tight text-blue-700">
                    {employee.lembur_aktif ? formatCurrency(employee.tarif_lembur) : 'Rp0'}
                  </span>
                  <span className="text-xs font-medium text-slate-500">
                    / jam
                  </span>
                </div>
                <p className="mt-1.5 text-[11px] text-slate-500">
                  {employee.lembur_aktif
                    ? 'Karyawan mendapatkan bayaran tambahan saat bekerja melebihi jam kerja.'
                    : 'Karyawan tidak memiliki perhitungan gaji lembur.'}
                </p>
              </div>
            </div>
          </div>

          {/* 3. CATATAN KHUSUS ADMIN */}
          <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-2xs">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-2">
                <EmployeeIcon name="fileText" className="h-4 w-4 text-amber-600" />
                <span>3. Catatan Khusus Admin</span>
              </h4>
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200/70">
                Hanya Terlihat Oleh Admin
              </span>
            </div>
            <div className="rounded-lg bg-amber-50/30 p-3.5 border border-amber-100 text-sm leading-relaxed">
              {employee.catatan_admin && employee.catatan_admin.trim() !== '' ? (
                <p className="text-slate-800 whitespace-pre-wrap">
                  {employee.catatan_admin}
                </p>
              ) : (
                <p className="text-slate-400 italic">
                  Belum ada catatan khusus untuk karyawan ini.
                </p>
              )}
            </div>
            <p className="mt-2 text-[11px] text-slate-400">
              * Catatan ini hanya dapat dilihat oleh Admin dan tidak ditampilkan kepada karyawan.
            </p>
          </div>

          {/* 4. TAUTAN TERINTEGRASI */}
          <div className="rounded-xl border border-slate-200/80 bg-slate-50/70 p-4 shadow-2xs space-y-2.5">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-2">
              <EmployeeIcon name="briefcase" className="h-4 w-4 text-blue-600" />
              <span>4. Akses Cepat Terintegrasi</span>
            </h4>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/penugasan?karyawan=${employee.id_karyawan}`)
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-blue-400 hover:bg-blue-50/50 text-slate-700 hover:text-blue-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>📋 Buka Penugasan Karyawan</span>
                <span className="text-[10px] text-blue-500">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/rekap-absensi?karyawan=${employee.id_karyawan}`)
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/50 text-slate-700 hover:text-emerald-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>⏱️ Buka Rekap Presensi Karyawan</span>
                <span className="text-[10px] text-emerald-500">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/gaji?karyawan=${employee.id_karyawan}`)
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-purple-400 hover:bg-purple-50/50 text-slate-700 hover:text-purple-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>💵 Buka Penggajian Karyawan</span>
                <span className="text-[10px] text-purple-500">→</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onClose()
                  navigate(`/admin/pengeluaran?karyawan=${employee.id_karyawan}`)
                }}
                className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-slate-700 hover:text-amber-700 font-semibold text-xs transition flex items-center gap-1.5 shadow-2xs cursor-pointer"
              >
                <span>🧾 Pengeluaran & Reimburse Karyawan</span>
                <span className="text-[10px] text-amber-500">→</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer Modal */}
        <div className="flex items-center justify-end border-t border-slate-100 bg-slate-50/50 px-6 py-3.5">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-200 transition"
          >
            Tutup
          </button>
        </div>
      </section>
    </div>
  )
}



/**
 * MODAL TAMBAH & EDIT KARYAWAN
 * - Otomatis ID Karyawan (ANDI001, BUDI002, dll)
 * - Pembuatan Akun Login Karyawan (ID + Kata Sandi)
 * - Tanpa Email
 * - Pengaturan Gaji (Per Jam / Per Hari / Bulanan)
 */
function EmployeeFormModal({ mode, employee, existingEmployees, isSaving, onClose, onSave }) {
  const isEdit = mode === 'edit'

  const [values, setValues] = useState(() => {
    if (employee && isEdit) {
      return {
        nama: employee.nama || '',
        jabatan: employee.jabatan || '',
        nomor_hp: employee.nomor_hp || '',
        jenis_upah: employee.jenis_upah || 'per_jam',
        nominal_upah: employee.nominal_upah != null ? String(employee.nominal_upah) : '',
        lembur_aktif: Boolean(employee.lembur_aktif),
        tarif_lembur: employee.tarif_lembur != null ? String(employee.tarif_lembur) : '',
        catatan_admin: employee.catatan_admin || '',
        status: employee.status || 'aktif',
        kata_sandi: '',
        konfirmasi_kata_sandi: '',
      }
    }
    return INITIAL_FORM
  })

  const [showPassword, setShowPassword] = useState(false)
  const [validationMessage, setValidationMessage] = useState('')

  // Estimasi ID Karyawan otomatis berdasarkan nama
  const predictedKode = useMemo(() => {
    if (isEdit && employee) {
      return employee.kode_karyawan || `KARY${String(employee.id_karyawan).padStart(3, '0')}`
    }
    return computePredictedKode(values.nama, existingEmployees)
  }, [isEdit, employee, values.nama, existingEmployees])

  function handleWageTypeChange(type) {
    setValues((prev) => ({
      ...prev,
      jenis_upah: type,
    }))
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setValidationMessage('')

    const nama = values.nama.trim()
    const jabatan = values.jabatan.trim()
    const nomorHp = values.nomor_hp.trim()
    const nominal = Number(values.nominal_upah)
    const lemburAktif = values.lembur_aktif
    const tarifLembur = Number(values.tarif_lembur)

    // Validasi Nama
    if (!nama) {
      setValidationMessage('Nama lengkap karyawan wajib diisi.')
      return
    }
    if (nama.length < 2) {
      setValidationMessage('Nama karyawan minimal 2 karakter.')
      return
    }
    if (nama.length > 100) {
      setValidationMessage('Nama karyawan maksimal 100 karakter.')
      return
    }

    // Validasi Nomor HP
    if (nomorHp) {
      const phoneClean = nomorHp.replace(/[\s\-]/g, '')
      if (!/^\+?[0-9]{8,20}$/.test(phoneClean)) {
        setValidationMessage('Format nomor HP tidak valid (minimal 8 digit angka, contoh: 081234567890).')
        return
      }
    }

    // Validasi Besar Gaji
    if (values.nominal_upah === '' || !Number.isFinite(nominal) || nominal < 0) {
      setValidationMessage('Besar gaji harus diisi dengan angka yang benar (Rp0 atau lebih).')
      return
    }

    // Validasi Gaji Lembur
    if (lemburAktif) {
      if (values.tarif_lembur === '' || !Number.isFinite(tarifLembur) || tarifLembur < 0) {
        setValidationMessage('Besar gaji lembur per jam wajib diisi saat lembur diaktifkan.')
        return
      }
    }

    // Validasi Password khusus saat Tambah Karyawan Baru
    if (!isEdit) {
      const pass = values.kata_sandi.trim()
      const confirmPass = values.konfirmasi_kata_sandi.trim()

      if (!pass) {
        setValidationMessage('Kata sandi login karyawan wajib diisi.')
        return
      }
      if (pass.length < 6) {
        setValidationMessage('Kata sandi login karyawan minimal 6 karakter.')
        return
      }
      if (!confirmPass) {
        setValidationMessage('Konfirmasi kata sandi wajib diisi.')
        return
      }
      if (pass !== confirmPass) {
        setValidationMessage('Konfirmasi kata sandi tidak cocok dengan kata sandi yang dimasukkan.')
        return
      }
    }

    try {
      await onSave({
        nama,
        jabatan: jabatan || null,
        nomor_hp: nomorHp || null,
        jenis_upah: values.jenis_upah,
        nominal_upah: nominal,
        lembur_aktif: lemburAktif,
        tarif_lembur: lemburAktif ? tarifLembur : 0,
        catatan_admin: values.catatan_admin.trim() || null,
        status: values.status,
        kata_sandi: values.kata_sandi.trim(),
        konfirmasi_kata_sandi: values.konfirmasi_kata_sandi.trim(),
      })
    } catch (error) {
      setValidationMessage(error.message || 'Gagal menyimpan data karyawan.')
    }
  }

  const currentWageConfig = formatWageType(values.jenis_upah)

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm transition-all"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget && !isSaving) onClose()
      }}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-labelledby="employee-modal-title"
        className="my-auto w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all"
      >
        {/* Header Modal */}
        <div className="flex items-start justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600 ring-1 ring-blue-600/10">
              <EmployeeIcon name={isEdit ? 'edit' : 'plus'} className="h-5 w-5" />
            </div>
            <div>
              <h2
                id="employee-modal-title"
                className="text-base sm:text-lg font-bold text-slate-900"
              >
                {isEdit ? 'Edit Data Karyawan' : 'Tambah Karyawan'}
              </h2>
              <p className="text-xs text-slate-500">
                {isEdit
                  ? 'Perbarui informasi karyawan, sistem gaji, dan catatan khusus admin.'
                  : 'Lengkapi data identitas, pengaturan gaji, dan buat akun login karyawan.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isSaving}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50"
            title="Tutup dialog"
            aria-label="Tutup dialog"
          >
            <EmployeeIcon name="close" className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="max-h-[75vh] overflow-y-auto p-6 space-y-6">
          {validationMessage && (
            <div
              className="flex items-center gap-2.5 rounded-xl border border-rose-200 bg-rose-50 p-3.5 text-xs sm:text-sm text-rose-800"
              role="alert"
            >
              <EmployeeIcon name="alert" className="h-4 w-4 shrink-0 text-rose-600" />
              <p className="font-medium leading-relaxed">{validationMessage}</p>
            </div>
          )}

          {/* BAGIAN A: INFORMASI IDENTITAS & ID KARYAWAN */}
          <fieldset className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <EmployeeIcon name="people" className="h-3.5 w-3.5 text-blue-600" />
              <span>A. Identitas Karyawan & ID Unik</span>
            </legend>

            {/* Field ID Karyawan Otomatis */}
            <div className="rounded-xl border border-blue-200/80 bg-blue-50/60 p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <label className="block text-xs font-bold text-blue-950 flex items-center gap-1.5">
                  <EmployeeIcon name="idBadge" className="h-4 w-4 text-blue-600" />
                  <span>ID Karyawan {isEdit ? '(Permanen)' : '(Dibuat Otomatis)'}</span>
                </label>
                <p className="text-[11px] text-blue-800/80 mt-0.5">
                  {isEdit
                    ? 'ID Karyawan bersifat permanen dan tidak dapat diubah meskipun nama karyawan diedit.'
                    : 'ID dibuat otomatis dari 4 huruf awal nama depan + 3 digit nomor urut unik di database.'}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm sm:text-base font-extrabold tracking-wider px-3.5 py-1.5 rounded-lg bg-white text-blue-700 border border-blue-300 shadow-xs">
                  {predictedKode || '----001'}
                </span>
              </div>
            </div>

            {/* Nama Lengkap & Nomor HP */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="form-nama"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  id="form-nama"
                  type="text"
                  required
                  placeholder="contoh: Andi Pratama"
                  value={values.nama}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, nama: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  {isEdit ? 'Nama lengkap karyawan' : 'Nama depan akan digunakan sebagai 4 huruf awalan ID'}
                </p>
              </div>

              <div>
                <label
                  htmlFor="form-hp"
                  className="block text-xs font-semibold text-slate-700 mb-1"
                >
                  Nomor HP
                </label>
                <input
                  id="form-hp"
                  type="tel"
                  placeholder="contoh: 081234567890"
                  value={values.nomor_hp}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, nomor_hp: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Nomor kontak untuk koordinasi tugas
                </p>
              </div>
            </div>

            {/* Jabatan */}
            <div>
              <label
                htmlFor="form-jabatan"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                Jabatan
              </label>
              <input
                id="form-jabatan"
                type="text"
                placeholder="contoh: Teknisi Jaringan, Sistem Analis, IT Support"
                value={values.jabatan}
                onChange={(e) =>
                  setValues((prev) => ({ ...prev, jabatan: e.target.value }))
                }
                className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
              />
            </div>
          </fieldset>

          {/* BAGIAN B: PENGATURAN GAJI KARYAWAN */}
          <fieldset className="space-y-4 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
            <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
              <EmployeeIcon name="banknote" className="h-3.5 w-3.5 text-emerald-600" />
              <span>B. Pengaturan Gaji Karyawan</span>
            </legend>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Pilih cara pembayaran gaji untuk karyawan ini:
              </label>

              {/* 3 Card Pilihan Cara Pembayaran Gaji */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {[
                  {
                    type: 'per_jam',
                    title: 'Gaji Per Jam',
                    desc: 'Dihitung berdasarkan jumlah jam kerja yang disetujui Admin.',
                    unit: 'per jam',
                  },
                  {
                    type: 'per_hari',
                    title: 'Gaji Per Hari',
                    desc: 'Dibayarkan berdasarkan jumlah hari kerja.',
                    unit: 'per hari',
                  },
                  {
                    type: 'per_bulan',
                    title: 'Gaji Bulanan',
                    desc: 'Dibayarkan dengan jumlah tetap setiap bulan.',
                    unit: 'per bulan',
                  },
                ].map((item) => {
                  const isSelected = values.jenis_upah === item.type
                  return (
                    <button
                      key={item.type}
                      type="button"
                      onClick={() => handleWageTypeChange(item.type)}
                      className={`flex flex-col text-left p-3 rounded-xl border transition-all ${
                        isSelected
                          ? 'border-blue-600 bg-blue-50/60 ring-2 ring-blue-500/20 shadow-xs'
                          : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50/70'
                      }`}
                    >
                      <div className="flex items-center justify-between w-full">
                        <span className={`text-xs font-bold ${isSelected ? 'text-blue-900' : 'text-slate-800'}`}>
                          {item.title}
                        </span>
                        <span
                          className={`h-4 w-4 rounded-full border flex items-center justify-center ${
                            isSelected
                              ? 'border-blue-600 bg-blue-600 text-white'
                              : 'border-slate-300 bg-white'
                          }`}
                        >
                          {isSelected && <span className="h-1.5 w-1.5 rounded-full bg-white" />}
                        </span>
                      </div>
                      <p className="mt-1 text-[11px] text-slate-500 leading-snug">
                        {item.desc}
                      </p>
                    </button>
                  )
                })}
              </div>
            </div>

            {/* Input Nominal Sesuai Pilihan */}
            <div>
              <label
                htmlFor="form-nominal"
                className="block text-xs font-semibold text-slate-700 mb-1"
              >
                {currentWageConfig.inputLabel} <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  Rp
                </span>
                <input
                  id="form-nominal"
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="contoh: 50000"
                  value={values.nominal_upah}
                  onChange={(e) =>
                    setValues((prev) => ({ ...prev, nominal_upah: e.target.value }))
                  }
                  className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-24 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                  {currentWageConfig.unit}
                </span>
              </div>
              <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                <span>Format tampilan:</span>
                <span className="font-bold text-blue-600">
                  {values.nominal_upah ? formatCurrency(values.nominal_upah) : 'Rp0'}{' '}
                  {currentWageConfig.unit}
                </span>
              </div>
            </div>

            {/* Gaji Tambahan Lembur (Opsional) */}
            <div className="rounded-xl border border-slate-200/90 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Gaji Tambahan untuk Lembur (Opsional)
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Aktifkan jika karyawan mendapatkan bayaran tambahan saat bekerja melebihi jam kerja.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
                  <input
                    type="checkbox"
                    checked={values.lembur_aktif}
                    onChange={(e) =>
                      setValues((prev) => ({
                        ...prev,
                        lembur_aktif: e.target.checked,
                      }))
                    }
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>

              {values.lembur_aktif && (
                <div className="pt-2 border-t border-slate-100">
                  <label
                    htmlFor="form-tarif-lembur"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Besar Gaji Lembur Per Jam (Rp) <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                      Rp
                    </span>
                    <input
                      id="form-tarif-lembur"
                      type="number"
                      min="0"
                      step="1000"
                      required={values.lembur_aktif}
                      placeholder="contoh: 25000"
                      value={values.tarif_lembur}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, tarif_lembur: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white py-2.5 pl-10 pr-20 text-xs sm:text-sm font-semibold text-slate-800 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                      / jam
                    </span>
                  </div>
                  <div className="mt-1 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Format lembur:</span>
                    <span className="font-bold text-blue-600">
                      {values.tarif_lembur ? formatCurrency(values.tarif_lembur) : 'Rp0'} / jam
                    </span>
                  </div>
                </div>
              )}
            </div>
          </fieldset>

          {/* BAGIAN C: AKUN LOGIN KARYAWAN ATAU STATUS */}
          {!isEdit ? (
            <fieldset className="space-y-4 rounded-xl border border-blue-200/90 bg-blue-50/30 p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-blue-800 flex items-center gap-1.5">
                <EmployeeIcon name="lock" className="h-3.5 w-3.5 text-blue-600" />
                <span>C. Akun Login Karyawan</span>
              </legend>

              <div className="rounded-lg bg-white p-3 border border-blue-100 flex items-start gap-2.5 text-xs text-slate-600">
                <EmployeeIcon name="shield" className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold text-slate-800">
                    Karyawan login menggunakan ID Karyawan &amp; Kata Sandi:
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Username Login:{' '}
                    <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                      {predictedKode || '----001'}
                    </span>
                    . Kata sandi di bawah akan dienkripsi dengan algoritma aman (Bcrypt hash).
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Kata Sandi */}
                <div>
                  <label
                    htmlFor="form-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <input
                      id="form-password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Minimal 6 karakter"
                      value={values.kata_sandi}
                      onChange={(e) =>
                        setValues((prev) => ({ ...prev, kata_sandi: e.target.value }))
                      }
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 pr-10 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                      tabIndex={-1}
                      title={showPassword ? 'Sembunyikan sandi' : 'Tampilkan sandi'}
                    >
                      <EmployeeIcon name="eye" className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                {/* Konfirmasi Kata Sandi */}
                <div>
                  <label
                    htmlFor="form-confirm-password"
                    className="block text-xs font-semibold text-slate-700 mb-1"
                  >
                    Konfirmasi Kata Sandi <span className="text-rose-500">*</span>
                  </label>
                  <input
                    id="form-confirm-password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    placeholder="Ulangi kata sandi di atas"
                    value={values.konfirmasi_kata_sandi}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, konfirmasi_kata_sandi: e.target.value }))
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
                  />
                </div>
              </div>
            </fieldset>
          ) : (
            <fieldset className="space-y-3 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <EmployeeIcon name="power" className="h-3.5 w-3.5 text-blue-600" />
                <span>C. Status Karyawan &amp; Keamanan Akun</span>
              </legend>

              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80">
                <div>
                  <span className="block text-xs font-bold text-slate-800">
                    Status Keaktifan Karyawan
                  </span>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Karyawan aktif dapat login dan diberikan penugasan pekerjaan operasional.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setValues((prev) => ({ ...prev, status: 'aktif' }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      values.status === 'aktif'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Aktif
                  </button>
                  <button
                    type="button"
                    onClick={() => setValues((prev) => ({ ...prev, status: 'nonaktif' }))}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      values.status === 'nonaktif'
                        ? 'bg-slate-700 text-white shadow-xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Nonaktif
                  </button>
                </div>
              </div>

              {/* Pemberitahuan Pengelolaan Kata Sandi */}
              <div className="flex items-center gap-2.5 bg-blue-50/60 p-3.5 rounded-xl border border-blue-100 text-xs text-blue-900">
                <EmployeeIcon name="shield" className="h-4 w-4 text-blue-600 shrink-0" />
                <span>
                  Pengelolaan dan reset kata sandi akun karyawan ini dilakukan melalui menu <strong>Manajemen Pengguna</strong>.
                </span>
              </div>
            </fieldset>
          )}

          {/* BAGIAN D: CATATAN KHUSUS ADMIN */}
          <fieldset className="space-y-2 rounded-xl border border-slate-200/80 bg-slate-50/40 p-4">
            <div className="flex items-center justify-between">
              <legend className="px-2 text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                <EmployeeIcon name="fileText" className="h-3.5 w-3.5 text-amber-600" />
                <span>D. Catatan Khusus Admin</span>
              </legend>
              <span className="text-[10px] font-semibold bg-amber-50 text-amber-700 px-2 py-0.5 rounded border border-amber-200/70">
                Hanya Terlihat Oleh Admin
              </span>
            </div>

            <textarea
              id="form-catatan"
              rows={3}
              placeholder="Tulis catatan khusus untuk karyawan ini jika diperlukan (contoh: evaluasi disiplin, berkas SIM, dsb)..."
              value={values.catatan_admin}
              onChange={(e) =>
                setValues((prev) => ({ ...prev, catatan_admin: e.target.value }))
              }
              className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10"
            />
            <p className="text-[11px] text-slate-400">
              * Catatan ini hanya dapat dilihat oleh Admin dan tidak ditampilkan kepada karyawan.
            </p>
          </fieldset>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
            <button
              type="button"
              onClick={onClose}
              disabled={isSaving}
              className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center gap-2 rounded-xl bg-blue-600 px-5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-700 transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-70 disabled:cursor-wait"
            >
              {isSaving ? (
                <>
                  <svg
                    className="h-4 w-4 animate-spin"
                    viewBox="0 0 24 24"
                    fill="none"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8v8H4z"
                    />
                  </svg>
                  <span>Menyimpan...</span>
                </>
              ) : isEdit ? (
                'Simpan Perubahan'
              ) : (
                'Simpan Karyawan'
              )}
            </button>
          </div>
        </form>
      </section>
    </div>
  )
}

/**
 * KOMPONEN UTAMA: DataKaryawan
 */
function DataKaryawan() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialStatus = searchParams.get('status') || ''
  const highlightId = searchParams.get('highlight') || searchParams.get('id') || searchParams.get('detail')

  const [store, setStore] = useState({
    employees: [],
    isReady: false,
    isSaving: false,
    storageError: '',
  })
  const { employees, isReady, isSaving, storageError } = store
  const [notice, setNotice] = useState(null)
  const [modal, setModal] = useState(null) // { mode: 'create'|'edit'|'detail'|'reset_password', employee }
  const [pendingDelete, setPendingDelete] = useState(null)

  // Filters & Sorting
  const [search, setSearch] = useState('')
  const [positionFilter, setPositionFilter] = useState('')
  const [wageTypeFilter, setWageTypeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState(initialStatus)
  const [sortOrder, setSortOrder] = useState('asc')
  const [page, setPage] = useState(1)

  useEffect(() => {
    if (searchParams.get('status')) {
      setStatusFilter(searchParams.get('status'))
    }
  }, [searchParams])

  async function loadEmployees() {
    try {
      const loadedEmployees = await getKaryawan()
      setStore({
        employees: loadedEmployees,
        isReady: true,
        isSaving: false,
        storageError: '',
      })
      if (highlightId) {
        const found = loadedEmployees.find(
          (e) => Number(e.id_karyawan) === Number(highlightId),
        )
        if (found) {
          setModal({ mode: 'detail', employee: found })
        }
      }
    } catch (error) {
      setStore((current) => ({
        ...current,
        isReady: false,
        storageError: `Data karyawan tidak dapat dimuat: ${error.message}`,
      }))
    }
  }

  useEffect(() => {
    let isMounted = true
    getKaryawan()
      .then((loadedEmployees) => {
        if (isMounted) {
          setStore({
            employees: loadedEmployees,
            isReady: true,
            isSaving: false,
            storageError: '',
          })
          if (highlightId) {
            const found = loadedEmployees.find(
              (e) => Number(e.id_karyawan) === Number(highlightId),
            )
            if (found) {
              setModal({ mode: 'detail', employee: found })
            }
          }
        }
      })
      .catch((error) => {
        if (isMounted) {
          setStore((current) => ({
            ...current,
            isReady: false,
            storageError: `Data karyawan tidak dapat dimuat: ${error.message}`,
          }))
        }
      })
    return () => {
      isMounted = false
    }
  }, [])

  function showNotice(message, type = 'success', action = null) {
    setNotice({ message, type, action })
    if (!action) {
      window.setTimeout(() => setNotice(null), 4000)
    }
  }

  // Filter list jabatan unik
  const positions = useMemo(
    () =>
      [...new Set(employees.map((e) => e.jabatan).filter(Boolean))].sort(
        (a, b) => a.localeCompare(b, 'id'),
      ),
    [employees],
  )

  // Filtered & Sorted Employees (Search by Nama, ID Karyawan, Jabatan, Nomor HP)
  const filteredEmployees = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('id-ID')

    return employees
      .filter((employee) => {
        const isEmployeeActive =
          employee.status !== 'nonaktif' &&
          employee.user_aktif !== 0 &&
          employee.aktif !== 0 &&
          employee.aktif !== false

        const kode = (employee.kode_karyawan || '').toLowerCase()
        const matchesSearch =
          !query ||
          employee.nama.toLocaleLowerCase('id-ID').includes(query) ||
          kode.includes(query) ||
          String(employee.id_karyawan).includes(query) ||
          (employee.jabatan && employee.jabatan.toLocaleLowerCase('id-ID').includes(query)) ||
          (employee.nomor_hp && employee.nomor_hp.toLowerCase().includes(query))

        const matchesPosition =
          !positionFilter || employee.jabatan === positionFilter

        const matchesWageType =
          !wageTypeFilter || employee.jenis_upah === wageTypeFilter

        const matchesStatus =
          !statusFilter ||
          (statusFilter === 'aktif' ? isEmployeeActive : !isEmployeeActive)

        return matchesSearch && matchesPosition && matchesWageType && matchesStatus
      })
      .sort((left, right) =>
        left.nama.localeCompare(right.nama, 'id', {
          sensitivity: 'base',
        }) * (sortOrder === 'asc' ? 1 : -1),
      )
  }, [employees, positionFilter, search, sortOrder, statusFilter, wageTypeFilter])

  // Statistics
  const totalEmployees = employees.length
  const activeEmployees = employees.filter(
    (e) =>
      e.status !== 'nonaktif' &&
      e.user_aktif !== 0 &&
      e.aktif !== 0 &&
      e.aktif !== false,
  ).length
  const inactiveEmployees = totalEmployees - activeEmployees

  // Pagination
  const pageCount = Math.max(1, Math.ceil(filteredEmployees.length / PAGE_SIZE))
  const currentPage = Math.min(page, pageCount)
  const pageEmployees = filteredEmployees.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
  )

  const hasActiveFilters = Boolean(search || positionFilter || wageTypeFilter || statusFilter)

  function handleResetFilters() {
    setSearch('')
    setPositionFilter('')
    setWageTypeFilter('')
    setStatusFilter('')
    setPage(1)
  }

  async function handleSaveEmployee(values) {
    setStore((current) => ({ ...current, isSaving: true, storageError: '' }))
    try {
      const savedEmployee =
        modal.mode === 'create'
          ? await createKaryawan(values)
          : await updateKaryawan(modal.employee.id_karyawan, values)

      setStore((current) => {
        const nextEmployees =
          modal.mode === 'create'
            ? [...current.employees, savedEmployee]
            : current.employees.map((employee) =>
                employee.id_karyawan === savedEmployee.id_karyawan
                  ? savedEmployee
                  : employee,
              )
        return {
          ...current,
          employees: nextEmployees,
          isSaving: false,
        }
      })
      setModal(null)
      window.dispatchEvent(new CustomEvent('karyawan_updated'))
      showNotice(
        modal.mode === 'create'
          ? `Karyawan ${savedEmployee.nama} berhasil ditambahkan dengan ID ${savedEmployee.kode_karyawan}.`
          : `Data karyawan ${savedEmployee.nama} berhasil diperbarui.`,
        'success',
      )
    } catch (error) {
      setStore((current) => ({
        ...current,
        isSaving: false,
      }))
      throw error
    }
  }


  async function handleToggleStatus(employee) {
    const isCurrentlyActive =
      employee.status !== 'nonaktif' &&
      employee.user_aktif !== 0 &&
      employee.aktif !== 0 &&
      employee.aktif !== false
    const nextStatus = isCurrentlyActive ? 'nonaktif' : 'aktif'

    setStore((current) => ({ ...current, isSaving: true }))
    try {
      const updated = await toggleStatusKaryawan(employee.id_karyawan, nextStatus)
      setStore((current) => ({
        ...current,
        employees: current.employees.map((item) =>
          item.id_karyawan === employee.id_karyawan ? updated : item,
        ),
        isSaving: false,
      }))
      window.dispatchEvent(new CustomEvent('karyawan_updated'))
      showNotice(
        `Status karyawan ${employee.nama} berhasil diubah menjadi ${nextStatus}.`,
        'success',
      )
    } catch (error) {
      setStore((current) => ({ ...current, isSaving: false }))
      showNotice(`Gagal mengubah status: ${error.message}`, 'error')
    }
  }

  async function handleDeleteEmployee(employee) {
    setStore((current) => ({ ...current, isSaving: true, storageError: '' }))
    try {
      await deleteKaryawan(employee.id_karyawan)
      const nextEmployees = employees.filter(
        (item) => item.id_karyawan !== employee.id_karyawan,
      )
      setStore((current) => ({
        ...current,
        employees: nextEmployees,
        isSaving: false,
      }))
      setPendingDelete(null)
      window.dispatchEvent(new CustomEvent('karyawan_updated'))
      showNotice(`Karyawan ${employee.nama} berhasil dihapus dari sistem.`, 'success')
    } catch (error) {
      setStore((current) => ({
        ...current,
        isSaving: false,
      }))
      setPendingDelete(null)

      const isReferenced =
        error.status === 409 ||
        error.message?.toLowerCase().includes('terkait') ||
        error.message?.toLowerCase().includes('digunakan')

      if (isReferenced) {
        showNotice(
          `Karyawan ${employee.nama} memiliki riwayat data (absensi/tugas/gaji) sehingga tidak dapat dihapus permanen. Disarankan untuk menonaktifkan statusnya.`,
          'error',
          {
            label: 'Nonaktifkan Sekarang',
            onClick: () => handleToggleStatus(employee),
          },
        )
      } else {
        showNotice(`Karyawan gagal dihapus: ${error.message}`, 'error')
      }
    }
  }

  return (
    <div className="mx-auto w-full max-w-[1440px] space-y-5 pb-8">
      {/* 1. HEADER HALAMAN */}
      <header className="flex flex-col gap-3.5 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200/80 pb-4">
        <div>
          <nav
            aria-label="Breadcrumb"
            className="flex items-center gap-1.5 text-xs font-medium text-slate-500 mb-1"
          >
            <span className="text-slate-400">Admin</span>
            <span className="text-slate-300">/</span>
            <span className="font-semibold text-blue-600">Data Karyawan</span>
          </nav>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-slate-900">
              Data Karyawan
            </h1>
            {isReady && (
              <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                {totalEmployees} orang
              </span>
            )}
          </div>
          <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
            Kelola data karyawan, ID unik otomatis, akun login sistem, pengaturan gaji, dan catatan khusus admin.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setModal({ mode: 'create' })}
            disabled={!isReady}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm shadow-blue-600/20 transition hover:bg-blue-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 disabled:opacity-50"
          >
            <EmployeeIcon name="plus" className="h-4 w-4" />
            <span>Tambah Karyawan</span>
          </button>
        </div>
      </header>

      {/* NOTIFIKASI TOAST / ALERT */}
      {notice && (
        <div
          className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border p-3.5 text-sm shadow-sm transition-all ${
            notice.type === 'error'
              ? 'border-rose-200 bg-rose-50 text-rose-800'
              : 'border-emerald-200 bg-emerald-50 text-emerald-800'
          }`}
          role="status"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <EmployeeIcon
              name={notice.type === 'error' ? 'alert' : 'check'}
              className={`h-4 w-4 shrink-0 ${
                notice.type === 'error' ? 'text-rose-600' : 'text-emerald-600'
              }`}
            />
            <span className="font-medium text-xs sm:text-sm leading-relaxed">
              {notice.message}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {notice.action && (
              <button
                type="button"
                onClick={() => {
                  notice.action.onClick()
                  setNotice(null)
                }}
                className="rounded-lg bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 transition"
              >
                {notice.action.label}
              </button>
            )}
            <button
              type="button"
              onClick={() => setNotice(null)}
              className="rounded p-1 text-slate-400 hover:text-slate-600 transition"
              title="Tutup pemberitahuan"
            >
              <EmployeeIcon name="close" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* ERROR SERVER */}
      {storageError && (
        <div
          className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-800"
          role="alert"
        >
          <div className="flex items-center gap-2.5">
            <EmployeeIcon
              name="alert"
              className="h-5 w-5 shrink-0 text-rose-600"
            />
            <p className="font-medium">{storageError}</p>
          </div>
          <button
            type="button"
            disabled={isSaving}
            onClick={() => {
              setStore((current) => ({
                ...current,
                isReady: false,
                storageError: '',
              }))
              loadEmployees()
            }}
            className="inline-flex items-center gap-1 font-semibold text-rose-700 underline underline-offset-2 hover:text-rose-900"
          >
            Coba lagi
          </button>
        </div>
      )}

      {/* 2. KARTU STATISTIK KARYAWAN (INTERAKTIF & BISA DIKLIK) */}
      <section
        aria-label="Statistik Karyawan"
        className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 sm:gap-4"
      >
        {/* Total Karyawan */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter('')
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === ''
              ? 'border-2 border-blue-600 bg-blue-50/40 ring-2 ring-blue-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Total Karyawan
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
              {isReady ? totalEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Terdaftar di basis data • Klik untuk semua
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            statusFilter === ''
              ? 'bg-blue-600 text-white shadow-xs'
              : 'bg-blue-50 text-blue-600 ring-1 ring-blue-600/10'
          }`}>
            <EmployeeIcon name="people" className="h-5 w-5" />
          </div>
        </button>

        {/* Karyawan Aktif */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((curr) => (curr === 'aktif' ? '' : 'aktif'))
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === 'aktif'
              ? 'border-2 border-emerald-600 bg-emerald-50/40 ring-2 ring-emerald-600/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Karyawan Aktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-emerald-600">
              {isReady ? activeEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-emerald-600/90 font-medium">
              Siap ditugaskan pekerjaan • Klik untuk filter
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            statusFilter === 'aktif'
              ? 'bg-emerald-600 text-white shadow-xs'
              : 'bg-emerald-50 text-emerald-600 ring-1 ring-emerald-600/10'
          }`}>
            <EmployeeIcon name="check-circle" className="h-5 w-5" />
          </div>
        </button>

        {/* Karyawan Nonaktif */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter((curr) => (curr === 'nonaktif' ? '' : 'nonaktif'))
            setPage(1)
          }}
          className={`flex items-center justify-between rounded-xl p-4 text-left transition shadow-xs cursor-pointer ${
            statusFilter === 'nonaktif'
              ? 'border-2 border-slate-700 bg-slate-100 ring-2 ring-slate-700/20'
              : 'border border-slate-200/90 bg-white hover:border-slate-300 hover:bg-slate-50/50'
          }`}
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Karyawan Nonaktif
            </p>
            <p className="mt-1 text-2xl font-bold tracking-tight text-slate-700">
              {isReady ? inactiveEmployees : '—'}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">
              Tidak aktif sementara • Klik untuk filter
            </p>
          </div>
          <div className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
            statusFilter === 'nonaktif'
              ? 'bg-slate-800 text-white shadow-xs'
              : 'bg-slate-100 text-slate-500 ring-1 ring-slate-200'
          }`}>
            <EmployeeIcon name="user-x" className="h-5 w-5" />
          </div>
        </button>
      </section>

      {/* 3. TOOLBAR PENCARIAN & FILTER TERPADU */}
      <section
        aria-label="Pencarian dan Filter"
        className="rounded-xl border border-slate-200/90 bg-white p-3 shadow-sm"
      >
        <div className="flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between">
          {/* Input Pencarian */}
          <div className="relative flex-1 min-w-[240px]">
            <EmployeeIcon
              name="search"
              className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            />
            <input
              type="text"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value)
                setPage(1)
              }}
              placeholder="Cari berdasarkan nama, ID (ANDI001), jabatan, no. HP..."
              className="w-full rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-9 pr-8 text-sm text-slate-800 placeholder:text-slate-400 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
            />
            {search && (
              <button
                type="button"
                onClick={() => {
                  setSearch('')
                  setPage(1)
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-slate-400 hover:text-slate-600 rounded"
                title="Hapus pencarian"
              >
                <EmployeeIcon name="close" className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          {/* Deretan Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter Jabatan */}
            <div className="relative min-w-[130px] flex-1 sm:flex-initial">
              <select
                value={positionFilter}
                onChange={(e) => {
                  setPositionFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Jabatan</option>
                {positions.map((pos) => (
                  <option key={pos} value={pos}>
                    {pos}
                  </option>
                ))}
              </select>
              <EmployeeIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Jenis Gaji */}
            <div className="relative min-w-[140px] flex-1 sm:flex-initial">
              <select
                value={wageTypeFilter}
                onChange={(e) => {
                  setWageTypeFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Cara Pembayaran</option>
                <option value="per_jam">Gaji Per Jam</option>
                <option value="per_hari">Gaji Per Hari</option>
                <option value="per_bulan">Gaji Bulanan</option>
              </select>
              <EmployeeIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Filter Status */}
            <div className="relative min-w-[120px] flex-1 sm:flex-initial">
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value)
                  setPage(1)
                }}
                className="w-full appearance-none rounded-lg border border-slate-200 bg-slate-50/60 py-2 pl-3 pr-8 text-xs sm:text-sm font-medium text-slate-700 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-500/10"
              >
                <option value="">Semua Status</option>
                <option value="aktif">Aktif</option>
                <option value="nonaktif">Nonaktif</option>
              </select>
              <EmployeeIcon
                name="chevron"
                className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
              />
            </div>

            {/* Tombol Reset Filter */}
            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleResetFilters}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition"
                title="Reset semua filter"
              >
                <EmployeeIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                <span>Reset</span>
              </button>
            )}
          </div>
        </div>
      </section>

      {/* 4. TABEL UTAMA DATA KARYAWAN (9 KOLOM LENGKAP) */}
      <section
        aria-label="Tabel Data Karyawan"
        className="overflow-hidden rounded-xl border border-slate-200/90 bg-white shadow-sm"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px] text-left text-sm">
            <thead className="border-b border-slate-200/80 bg-slate-50/90 text-[11px] font-bold uppercase tracking-wider text-slate-500">
              <tr>
                {/* 1. No */}
                <th className="px-3.5 py-3.5 text-center w-12" scope="col">
                  No.
                </th>

                {/* 2. ID Karyawan */}
                <th className="px-3.5 py-3.5 w-28" scope="col">
                  ID Karyawan
                </th>

                {/* 3. Nama Karyawan */}
                <th className="px-3.5 py-3.5" scope="col">
                  <button
                    type="button"
                    onClick={() =>
                      setSortOrder((order) => (order === 'asc' ? 'desc' : 'asc'))
                    }
                    className="inline-flex items-center gap-1.5 hover:text-slate-900 transition font-bold"
                    title={`Urutkan nama ${sortOrder === 'asc' ? 'Z-A' : 'A-Z'}`}
                  >
                    <span>Nama Karyawan</span>
                    <EmployeeIcon name="sort" className="h-3.5 w-3.5 text-slate-400" />
                  </button>
                </th>

                {/* 4. Jabatan */}
                <th className="px-3.5 py-3.5" scope="col">
                  Jabatan
                </th>

                {/* 5. Nomor HP */}
                <th className="px-3.5 py-3.5" scope="col">
                  Nomor HP
                </th>

                {/* 6. Jenis Gaji */}
                <th className="px-3.5 py-3.5" scope="col">
                  Jenis Gaji
                </th>

                {/* 7. Nominal Gaji */}
                <th className="px-3.5 py-3.5" scope="col">
                  Nominal Gaji
                </th>

                {/* 8. Status */}
                <th className="px-3.5 py-3.5 text-center w-28" scope="col">
                  Status
                </th>

                {/* 9. Aksi */}
                <th className="px-3.5 py-3.5 text-right w-48" scope="col">
                  Aksi
                </th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {!isReady ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center text-sm text-slate-500">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <svg
                        className="h-6 w-6 animate-spin text-blue-600"
                        viewBox="0 0 24 24"
                        fill="none"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        />
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8v8H4z"
                        />
                      </svg>
                      <p className="font-medium text-slate-600">
                        Memuat data karyawan...
                      </p>
                    </div>
                  </td>
                </tr>
              ) : pageEmployees.length === 0 ? (
                <tr>
                  <td colSpan="9" className="px-4 py-12 text-center">
                    <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 text-slate-400">
                      <EmployeeIcon name="search" className="h-6 w-6" />
                    </div>
                    <p className="mt-3 text-sm font-semibold text-slate-800">
                      Data karyawan tidak ditemukan
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {hasActiveFilters
                        ? 'Coba sesuaikan kata kunci pencarian atau atur ulang filter Anda.'
                        : 'Belum ada data karyawan terdaftar di sistem.'}
                    </p>
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleResetFilters}
                        className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                      >
                        <EmployeeIcon name="rotate-ccw" className="h-3.5 w-3.5" />
                        Reset Filter
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                pageEmployees.map((employee, index) => {
                  const isEmployeeActive =
                    employee.status !== 'nonaktif' &&
                    employee.user_aktif !== 0 &&
                    employee.aktif !== 0 &&
                    employee.aktif !== false

                  const wageInfo = formatWageType(employee.jenis_upah)
                  const employeeCode =
                    employee.kode_karyawan || `KARY${String(employee.id_karyawan).padStart(3, '0')}`

                  return (
                    <tr
                      key={employee.id_karyawan}
                      className="transition-colors hover:bg-slate-50/80"
                    >
                      {/* 1. Nomor */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center text-xs font-medium text-slate-400">
                        {(currentPage - 1) * PAGE_SIZE + index + 1}
                      </td>

                      {/* 2. ID Karyawan (Kode Unik e.g. ANDI001, BUDI002) */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span className="inline-flex items-center font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-blue-50 text-blue-700 border border-blue-200/70 shadow-2xs">
                          {employeeCode}
                        </span>
                      </td>

                      {/* 3. Informasi Karyawan (Avatar + Nama Lengkap) */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="flex items-center gap-2.5">
                          <AdminAvatar
                            name={employee.nama}
                            className="h-8 w-8 text-xs font-bold shadow-2xs"
                          />
                          <div className="min-w-0">
                            <span className="font-semibold text-slate-900 block truncate">
                              {employee.nama}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* 4. Jabatan */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 ring-1 ring-inset ring-slate-200">
                          {employee.jabatan || 'Belum diatur'}
                        </span>
                      </td>

                      {/* 5. Nomor HP */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-xs text-slate-600 font-mono">
                        {employee.nomor_hp || <span className="text-slate-300 font-sans">—</span>}
                      </td>

                      {/* 6. Jenis Gaji */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <span
                          className={`inline-flex items-center rounded-md px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${wageInfo.color}`}
                        >
                          {wageInfo.label}
                        </span>
                      </td>

                      {/* 7. Nominal Gaji */}
                      <td className="whitespace-nowrap px-3.5 py-3">
                        <div className="flex items-baseline gap-1 font-semibold text-slate-800 tabular-nums">
                          <span>{formatCurrency(employee.nominal_upah)}</span>
                          <span className="text-[11px] font-normal text-slate-400">
                            {wageInfo.unit}
                          </span>
                        </div>
                        {employee.lembur_aktif && (
                          <span className="text-[10px] text-blue-600 font-medium block">
                            + Lembur {formatCurrency(employee.tarif_lembur)}/jam
                          </span>
                        )}
                      </td>

                      {/* 8. Status */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-center">
                        {isEmployeeActive ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700 ring-1 ring-inset ring-emerald-600/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                            Aktif
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20">
                            <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
                            Nonaktif
                          </span>
                        )}
                      </td>

                      {/* 9. Aksi (Detail, Edit, Reset Password, Toggle Status, Hapus) */}
                      <td className="whitespace-nowrap px-3.5 py-3 text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          {/* Detail */}
                          <button
                            type="button"
                            onClick={() => setModal({ mode: 'detail', employee })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600 transition shadow-2xs"
                            title={`Lihat detail ${employee.nama}`}
                            aria-label={`Lihat detail ${employee.nama}`}
                          >
                            <EmployeeIcon name="eye" className="h-4 w-4" />
                          </button>

                          {/* Edit */}
                          <button
                            type="button"
                            onClick={() => setModal({ mode: 'edit', employee })}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:border-amber-300 hover:bg-amber-50 hover:text-amber-600 transition shadow-2xs"
                            title={`Edit data ${employee.nama}`}
                            aria-label={`Edit data ${employee.nama}`}
                          >
                            <EmployeeIcon name="edit" className="h-4 w-4" />
                          </button>

                          {/* Toggle Status (Aktif / Nonaktif) */}
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(employee)}
                            disabled={isSaving}
                            className={`inline-flex h-8 w-8 items-center justify-center rounded-lg border transition shadow-2xs ${
                              isEmployeeActive
                                ? 'border-slate-200 bg-white text-emerald-600 hover:border-slate-300 hover:bg-slate-50 hover:text-slate-600'
                                : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                            }`}
                            title={
                              isEmployeeActive
                                ? `Nonaktifkan karyawan ${employee.nama}`
                                : `Aktifkan kembali karyawan ${employee.nama}`
                            }
                            aria-label={
                              isEmployeeActive
                                ? `Nonaktifkan karyawan ${employee.nama}`
                                : `Aktifkan kembali karyawan ${employee.nama}`
                            }
                          >
                            <EmployeeIcon name="power" className="h-3.5 w-3.5" />
                          </button>

                          {/* Hapus */}
                          <button
                            type="button"
                            onClick={() => setPendingDelete(employee)}
                            disabled={isSaving}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 hover:border-rose-300 hover:bg-rose-50 hover:text-rose-600 transition shadow-2xs disabled:opacity-50"
                            title={`Hapus data ${employee.nama}`}
                            aria-label={`Hapus data ${employee.nama}`}
                          >
                            <EmployeeIcon name="trash" className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Footer Tabel & Pagination */}
        <div className="flex flex-col gap-3 border-t border-slate-200/80 bg-slate-50/50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-5">
          <p className="text-xs text-slate-500">
            Menampilkan{' '}
            <span className="font-semibold text-slate-800">
              {filteredEmployees.length === 0
                ? 0
                : (currentPage - 1) * PAGE_SIZE + 1}
              –{Math.min(currentPage * PAGE_SIZE, filteredEmployees.length)}
            </span>{' '}
            dari{' '}
            <span className="font-semibold text-slate-800">
              {filteredEmployees.length}
            </span>{' '}
            karyawan
          </p>

          <div className="flex items-center justify-between gap-1.5 sm:justify-end">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setPage(currentPage - 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman sebelumnya"
              title="Halaman sebelumnya"
            >
              <EmployeeIcon name="previous" className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Sebelumnya</span>
            </button>

            <span className="px-2 text-xs font-medium text-slate-600">
              Hal. {currentPage} dari {pageCount}
            </span>

            <button
              type="button"
              disabled={currentPage >= pageCount}
              onClick={() => setPage(currentPage + 1)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              aria-label="Halaman berikutnya"
              title="Halaman berikutnya"
            >
              <span className="hidden sm:inline">Berikutnya</span>
              <EmployeeIcon name="next" className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </section>

      {/* 5. MODAL FORM TAMBAH / EDIT KARYAWAN */}
      {modal && (modal.mode === 'create' || modal.mode === 'edit') && (
        <EmployeeFormModal
          mode={modal.mode}
          employee={modal.employee}
          existingEmployees={employees}
          isSaving={isSaving}
          onClose={() => {
            if (!isSaving) setModal(null)
          }}
          onSave={handleSaveEmployee}
        />
      )}

      {/* 6. MODAL DETAIL KARYAWAN */}
      {modal && modal.mode === 'detail' && (
        <EmployeeDetailModal
          employee={modal.employee}
          onClose={() => setModal(null)}
          onEdit={(emp) => setModal({ mode: 'edit', employee: emp })}
        />
      )}

      {/* 8. DIALOG KONFIRMASI HAPUS */}
      {pendingDelete && (
        <DeleteConfirmationDialog
          description="Anda yakin ingin menghapus data karyawan ini dari database perusahaan? Jika karyawan memiliki riwayat operasional (absensi/penugasan/gaji), data tidak dapat dihapus dan disarankan untuk dinonaktifkan."
          isProcessing={isSaving}
          itemName={`${pendingDelete.nama} (ID: ${pendingDelete.kode_karyawan || pendingDelete.id_karyawan})`}
          onCancel={() => setPendingDelete(null)}
          onConfirm={() => handleDeleteEmployee(pendingDelete)}
        />
      )}
    </div>
  )
}

export default DataKaryawan
