import { useEffect, useState } from 'react'
import { getPekerjaanBlueprint, updatePekerjaanBlueprint, batalkanPenugasanPekerja } from '../../services/pekerjaanApi.js'
import SlotAssignmentModal from './SlotAssignmentModal.jsx'
import SalaryHistoryModal from './SalaryHistoryModal.jsx'

function formatRupiah(val) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(val) || 0)
}

function formatDateIndo(dateStr) {
  if (!dateStr) return '—'
  const date = new Date(`${dateStr}T00:00:00`)
  return Number.isNaN(date.getTime())
    ? '—'
    : new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'short', year: 'numeric' }).format(date)
}

export default function RoleSlotBoard({ idPekerjaan, onRefresh }) {
  const [blueprintData, setBlueprintData] = useState(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  // State Modal Slot Assignment
  const [assigningSlot, setAssigningSlot] = useState(null) // roleBudget object

  // State Modal Salary History
  const [historyTarget, setHistoryTarget] = useState(null) // { worker, roleBudget }

  // State Edit Blueprint Modal
  const [isEditingBlueprint, setIsEditingBlueprint] = useState(false)
  const [editingRoles, setEditingRoles] = useState([])
  const [isSavingBlueprint, setIsSavingBlueprint] = useState(false)
  const [blueprintSaveError, setBlueprintSaveError] = useState('')

  // State Konfirmasi Batal Penugasan
  const [cancelTarget, setCancelTarget] = useState(null) // worker object
  const [cancelReason, setCancelReason] = useState('')
  const [isCanceling, setIsCanceling] = useState(false)

  const loadBlueprint = async () => {
    if (!idPekerjaan) return
    setIsLoading(true)
    setError('')
    try {
      const data = await getPekerjaanBlueprint(idPekerjaan)
      setBlueprintData(data)
    } catch (err) {
      setError(err.message || 'Gagal memuat blueprint role dan slot tim.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadBlueprint()
  }, [idPekerjaan])

  const handleOpenEditBlueprint = () => {
    if (!blueprintData?.role_budgets) return
    setEditingRoles(
      blueprintData.role_budgets.map((b) => ({
        id_role: b.id_role,
        nama_role: b.nama_role,
        hierarchy_level: b.hierarchy_level,
        kuota_slot: b.kuota_slot,
        gaji_min_bulanan: b.gaji_min_bulanan,
        gaji_max_bulanan: b.gaji_max_bulanan,
        terisi_slot: b.terisi_slot || 0,
      })),
    )
    setBlueprintSaveError('')
    setIsEditingBlueprint(true)
  }

  const handleSaveBlueprint = async () => {
    setIsSavingBlueprint(true)
    setBlueprintSaveError('')
    try {
      await updatePekerjaanBlueprint(idPekerjaan, editingRoles)
      setIsEditingBlueprint(false)
      await loadBlueprint()
      onRefresh?.()
    } catch (err) {
      setBlueprintSaveError(err.message || 'Gagal memperbarui blueprint role.')
    } finally {
      setIsSavingBlueprint(false)
    }
  }

  const handleConfirmCancelWorker = async () => {
    if (!cancelTarget) return
    setIsCanceling(true)
    try {
      await batalkanPenugasanPekerja(idPekerjaan, cancelTarget.id_penugasan, cancelReason.trim() || 'Dibatalkan oleh Admin')
      setCancelTarget(null)
      setCancelReason('')
      await loadBlueprint()
      onRefresh?.()
    } catch (err) {
      alert(`Gagal membatalkan penugasan: ${err.message}`)
    } finally {
      setIsCanceling(false)
    }
  }

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-xs text-slate-500 shadow-xs">
        <div className="mx-auto mb-2 h-6 w-6 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
        <span>Memuat papan slot tim dan skema gaji...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800">
        <div className="flex items-center justify-between">
          <span>⚠️ {error}</span>
          <button
            type="button"
            onClick={loadBlueprint}
            className="font-semibold text-rose-900 underline hover:no-underline"
          >
            Coba lagi
          </button>
        </div>
      </div>
    )
  }

  const roleBudgets = blueprintData?.role_budgets || []
  const jobCalendar = blueprintData?.job || {}

  return (
    <div className="space-y-4">
      {/* Header Bar Papan Slot */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
        <div>
          <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
            <span>👥</span>
            <span>Papan Slot Kuota Tim & Skema Gaji</span>
          </h3>
          <p className="mt-0.5 text-xs text-slate-500">
            Terurut berdasarkan hierarki jabatan. Kuota slot ditentukan blueprint, tarif upah ditentukan fleksibel saat penugasan pekerja.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleOpenEditBlueprint}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-2xs hover:bg-slate-50 transition cursor-pointer"
          >
            <span>⚙️</span>
            <span>Edit Blueprint Role</span>
          </button>
        </div>
      </div>

      {/* Grid Slot Role */}
      {roleBudgets.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-8 text-center text-xs text-slate-400">
          <p className="font-semibold text-slate-600">Belum ada role yang dikonfigurasi untuk proyek ini.</p>
          <p className="mt-1">Gunakan tombol "Edit Blueprint Role" untuk mulai menambahkan slot jabatan.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {roleBudgets.map((slot) => {
            const isFull = (slot.terisi_slot || 0) >= slot.kuota_slot
            const workers = slot.assigned_workers || []
            const konversi = slot.konversi_satuan || {}

            return (
              <div
                key={slot.id_role_budget}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden transition-all hover:border-slate-300"
              >
                {/* Header Slot */}
                <div className="border-b border-slate-100 bg-slate-50/70 p-4">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-800">
                        Level {slot.hierarchy_level}
                      </span>
                      <h4 className="font-bold text-sm text-slate-900">{slot.nama_role}</h4>
                    </div>

                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${
                        isFull
                          ? 'bg-rose-100 text-rose-800 ring-1 ring-rose-600/20'
                          : 'bg-emerald-100 text-emerald-800 ring-1 ring-emerald-600/20'
                      }`}
                    >
                      Terisi {slot.terisi_slot || 0} / {slot.kuota_slot} Slot
                    </span>
                  </div>

                  {/* Info Upah Fleksibel */}
                  <div className="mt-1.5 text-xs text-slate-500">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500">
                      💼 Tarif upah ditentukan fleksibel per penugasan
                    </span>
                  </div>
                </div>

                {/* Daftar Karyawan yang Mengisi Slot */}
                <div className="p-4 space-y-2 flex-1">
                  <span className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider block">
                    Pekerja Pengisi Slot ({workers.length}):
                  </span>

                  {workers.length === 0 ? (
                    <div className="py-4 text-center text-[11px] text-slate-400 italic">
                      Belum ada pekerja di slot ini.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {workers.map((w) => (
                        <div
                          key={w.id_penugasan}
                          className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/50 p-2.5 hover:bg-slate-100/60 transition"
                        >
                          <div className="space-y-0.5">
                            <span className="font-bold text-slate-900 text-xs block">{w.nama}</span>
                            <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                              <span className="font-semibold text-emerald-700">
                                {formatRupiah(w.nominal_upah)} / {w.jenis_upah?.replace('per_', '')}
                              </span>
                              <span>•</span>
                              <span>Mulai: {formatDateIndo(w.tanggal_penugasan)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => setHistoryTarget({ worker: w, roleBudget: slot })}
                              className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-[11px] font-semibold text-blue-600 hover:bg-blue-50 transition shadow-2xs cursor-pointer"
                              title="Riwayat / Ubah Skema Gaji"
                            >
                              Riwayat Gaji
                            </button>
                            <button
                              type="button"
                              onClick={() => setCancelTarget(w)}
                              className="rounded-lg p-1 text-slate-400 hover:bg-rose-50 hover:text-rose-600 transition cursor-pointer"
                              title="Batalkan penugasan"
                            >
                              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m4 4v6m6-6v6" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Tombol Action Tambah Pekerja */}
                <div className="border-t border-slate-100 p-3 bg-slate-50/40">
                  <button
                    type="button"
                    disabled={isFull}
                    onClick={() => setAssigningSlot(slot)}
                    className={`w-full inline-flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold transition ${
                      isFull
                        ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                        : 'bg-blue-600 text-white shadow-sm hover:bg-blue-700 cursor-pointer'
                    }`}
                  >
                    <span>{isFull ? '🔒 Slot Penuh' : '+ Assign Pekerja ke Slot'}</span>
                  </button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Modal Assign Pekerja ke Slot */}
      {assigningSlot && (
        <SlotAssignmentModal
          idPekerjaan={idPekerjaan}
          roleBudget={assigningSlot}
          projectCalendar={jobCalendar}
          onClose={() => setAssigningSlot(null)}
          onSuccess={() => {
            loadBlueprint()
            onRefresh?.()
          }}
        />
      )}

      {/* Modal Riwayat Gaji */}
      {historyTarget && (
        <SalaryHistoryModal
          idPenugasan={historyTarget.worker.id_penugasan}
          workerName={historyTarget.worker.nama}
          roleBudget={historyTarget.roleBudget}
          projectCalendar={jobCalendar}
          onClose={() => setHistoryTarget(null)}
          onSuccess={() => {
            loadBlueprint()
            onRefresh?.()
          }}
        />
      )}

      {/* Modal Edit Blueprint Role */}
      {isEditingBlueprint && (
        <div
          className="fixed inset-0 z-[85] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-xs transition-all"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !isSavingBlueprint) setIsEditingBlueprint(false)
          }}
        >
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl my-6">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50/80 px-6 py-4">
              <h3 className="font-bold text-base text-slate-900">Perbarui Blueprint Role Proyek</h3>
              <button
                type="button"
                onClick={() => setIsEditingBlueprint(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-200/60 transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto text-xs">
              {blueprintSaveError && (
                <div className="rounded-xl border border-rose-200 bg-rose-50 p-3 text-rose-800">
                  ⚠️ {blueprintSaveError}
                </div>
              )}

              <p className="text-slate-600">
                Sesuaikan kuota slot pekerja dan rentang gaji bulanan (Min – Max) untuk tiap role. Kuota tidak boleh diperkecil di bawah jumlah pekerja yang sudah ter-assign saat ini.
              </p>

              <div className="space-y-3">
                {editingRoles.map((r, i) => (
                  <div key={r.id_role || i} className="rounded-xl border border-slate-200 p-3 space-y-2">
                    <div className="flex items-center justify-between font-bold text-slate-900">
                      <span>
                        Level {r.hierarchy_level}: {r.nama_role}
                      </span>
                      <span className="text-[11px] text-slate-500 font-normal">
                        Terisi: {r.terisi_slot || 0} pekerja
                      </span>
                    </div>

                    <div className="pt-2">
                      <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                        Kuota Slot Pekerja (Minimal: {r.terisi_slot || 1})
                      </label>
                      <input
                        type="number"
                        min={r.terisi_slot || 1}
                        value={r.kuota_slot}
                        onChange={(e) => {
                          const val = parseInt(e.target.value) || 1
                          const updated = [...editingRoles]
                          updated[i].kuota_slot = Math.max(r.terisi_slot || 1, val)
                          setEditingRoles(updated)
                        }}
                        className="w-full max-w-xs rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-800 font-bold"
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 bg-slate-50/80 px-6 py-4">
              <button
                type="button"
                onClick={() => setIsEditingBlueprint(false)}
                disabled={isSavingBlueprint}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveBlueprint}
                disabled={isSavingBlueprint}
                className="rounded-xl bg-blue-600 px-5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-700 disabled:opacity-50"
              >
                {isSavingBlueprint ? 'Menyimpan...' : 'Simpan Blueprint'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Konfirmasi Pembatalan Penugasan */}
      {cancelTarget && (
        <div className="fixed inset-0 z-[95] flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-2xl text-xs space-y-4">
            <h3 className="font-bold text-sm text-slate-900">Batalkan Penugasan Karyawan</h3>
            <p className="text-slate-600">
              Anda yakin ingin membatalkan penugasan <strong className="text-slate-900">{cancelTarget.nama}</strong>? Slot kuota pada role ini akan dibebaskan kembali.
            </p>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Alasan Pembatalan</label>
              <input
                type="text"
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                placeholder="Contoh: Pengunduran diri / rotasi proyek"
                className="w-full rounded-xl border border-slate-200 px-3 py-2 text-xs text-slate-800"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCancelTarget(null)}
                disabled={isCanceling}
                className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-700 hover:bg-slate-50"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCancelWorker}
                disabled={isCanceling}
                className="rounded-xl bg-rose-600 px-4 py-2 font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
              >
                {isCanceling ? 'Membatalkan...' : 'Ya, Batalkan Penugasan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
