import WorkerPageHeader from '../../components/WorkerPageHeader.jsx'

function RiwayatPengajuan({ onNavigate = () => {} }) {
  return (
    <div className="worker-management-page mx-auto w-full max-w-[1440px] space-y-6">
      <WorkerPageHeader
        breadcrumbText="Riwayat Pengajuan"
        description="Informasi status pengajuan minat pada pekerjaan yang tersedia."
        title="Riwayat Pengajuan"
      />

      <section
        aria-labelledby="riwayat-pengajuan-status-title"
        className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-8"
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-5">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-amber-100 text-amber-700">
            <svg
              aria-hidden="true"
              className="h-6 w-6"
              fill="none"
              stroke="currentColor"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth="2"
              viewBox="0 0 24 24"
            >
              <circle cx="12" cy="12" r="10" />
              <path d="M12 8v4m0 4h.01" />
            </svg>
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-full bg-amber-200/80 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                Menunggu Pengembangan Backend & Database
              </span>
            </div>
            <h2
              className="mt-2 text-lg font-bold text-slate-900 sm:text-xl"
              id="riwayat-pengajuan-status-title"
            >
              Fitur Pengajuan Minat Belum Tersedia di Basis Data
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-700">
              Sistem saat ini belum menyediakan tabel penyimpanan data pengajuan
              minat (tabel <code>pengajuan</code> / <code>lamaran</code>) maupun
              endpoint API resmi di server backend.
            </p>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Sesuai dengan ketentuan pembagian tugas <strong>Pengembang 2</strong>,
              kami tidak menambahkan tabel atau kolom sepihak dan tidak membuat
              data pengajuan palsu. Seluruh penugasan kerja yang aktif saat ini
              dikelola secara resmi oleh Administrator melalui menu <strong>Penugasan</strong>.
            </p>

            <div className="mt-6 flex flex-wrap gap-3">
              <button
                className="rounded-xl bg-emerald-700 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-800"
                onClick={() => onNavigate('Pekerjaan Saya')}
                type="button"
              >
                Lihat Pekerjaan Saya
              </button>
              <button
                className="rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50"
                onClick={() => onNavigate('Pekerjaan Tersedia')}
                type="button"
              >
                Lihat Pekerjaan Tersedia
              </button>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}

export default RiwayatPengajuan
