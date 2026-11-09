function DeleteConfirmationDialog({
  itemName,
  description = 'Tindakan ini tidak dapat dibatalkan.',
  confirmLabel = 'Hapus',
  isProcessing = false,
  onCancel,
  onConfirm,
}) {
  return (
    <div
      className="fixed inset-0 z-[90] flex items-center justify-center overflow-y-auto bg-slate-950/45 p-4 backdrop-blur-sm"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget && !isProcessing) onCancel()
      }}
    >
      <section
        aria-labelledby="delete-confirmation-title"
        aria-modal="true"
        className="my-auto w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl shadow-slate-950/20 sm:p-6"
        role="dialog"
      >
        <div className="flex items-start gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-rose-200 bg-rose-50 text-rose-600">
            <svg
              aria-hidden="true"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="1.8"
              viewBox="0 0 24 24"
            >
              <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" />
              <path d="M10 11v5m4-5v5" />
            </svg>
          </span>
          <div className="min-w-0">
            <h2
              className="text-base font-semibold text-slate-900"
              id="delete-confirmation-title"
            >
              Konfirmasi tindakan
            </h2>
            <p className="mt-1 text-sm leading-5 text-slate-600">
              {description}
            </p>
            <p className="mt-3 break-words rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-800">
              {itemName}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <button
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-500 disabled:cursor-wait disabled:opacity-60"
            disabled={isProcessing}
            onClick={onCancel}
            type="button"
          >
            Batal
          </button>
          <button
            className="rounded-xl border border-rose-700 bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-600 disabled:cursor-wait disabled:opacity-60"
            disabled={isProcessing}
            onClick={onConfirm}
            type="button"
          >
            {isProcessing ? 'Memproses...' : confirmLabel}
          </button>
        </div>
      </section>
    </div>
  )
}

export default DeleteConfirmationDialog
