import { useState } from 'react'

const iconContent = {
  dashboard: (
    <>
      <rect x="3.5" y="3.5" width="7" height="7" rx="1.5" />
      <rect x="13.5" y="3.5" width="7" height="4" rx="1.5" />
      <rect x="13.5" y="10.5" width="7" height="10" rx="1.5" />
      <rect x="3.5" y="13.5" width="7" height="7" rx="1.5" />
    </>
  ),
  available: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="M20 20l-4-4M11 8v6M8 11h6" />
    </>
  ),
  mine: (
    <>
      <rect x="3" y="7" width="18" height="14" rx="2" />
      <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
    </>
  ),
  history: (
    <>
      <path d="M3 12a9 9 0 1 0 2.6-6.4L3 8" />
      <path d="M3 3v5h5M12 7v5l3 2" />
    </>
  ),
  receipt: (
    <>
      <path d="M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1-2-1Z" />
      <path d="M8 7h8M8 11h8M8 15h5" />
    </>
  ),
  attendance: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  profile: (
    <>
      <circle cx="12" cy="8" r="4" />
      <path d="M5 21a7 7 0 0 1 14 0" />
    </>
  ),
  settings: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="m19.4 15 .1.1 1.4 1.1-1.4 2.4-1.7-.7a8 8 0 0 1-1.5.9l-.3 1.8h-2.8l-.3-1.8a8 8 0 0 1-1.5-.9l-1.7.7-1.4-2.4L8.7 15a8 8 0 0 1 0-1.8l-1.4-1.1 1.4-2.4 1.7.7a8 8 0 0 1 1.5-.9l.3-1.8H15l.3 1.8a8 8 0 0 1 1.5.9l1.7-.7 1.4 2.4-1.4 1.1a8 8 0 0 1-.1 1.8Z" />
    </>
  ),
  menu: <path d="M4 6h16M4 12h16M4 18h16" />,
  close: <path d="m18 6-12 12M6 6l12 12" />,
}

function Icon({ name, className = 'h-5 w-5' }) {
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
      {iconContent[name]}
    </svg>
  )
}

const mainMenuItems = [
  { label: 'Dashboard', icon: 'dashboard' },
  { label: 'Pekerjaan Tersedia', icon: 'available' },
  { label: 'Pekerjaan Saya', icon: 'mine' },
  { label: 'Riwayat Pengajuan', icon: 'history' },
  { label: 'Pengeluaran Saya', icon: 'receipt' },
  { label: 'Presensi & Jam Kerja', icon: 'attendance' },
]

function SidebarPekerja({
  activeItem,
  isMobileOpen,
  onToggleSidebar,
  onSelectMenuItem,
  onClose,
  workerName = 'Budi Santoso',
}) {
  const [selectedItem, setSelectedItem] = useState('Dashboard')
  const [mobileOpen, setMobileOpen] = useState(false)
  const currentItem = activeItem ?? selectedItem
  const isOpen = isMobileOpen ?? mobileOpen

  function closeSidebar() {
    if (onClose) {
      onClose()
    } else {
      setMobileOpen(false)
    }
  }

  function toggleSidebar() {
    if (onToggleSidebar) {
      onToggleSidebar()
    } else if (isMobileOpen === undefined) {
      setMobileOpen((open) => !open)
    } else if (isOpen && onClose) {
      onClose()
    }
  }

  function selectMenuItem(label) {
    if (activeItem === undefined) {
      setSelectedItem(label)
    }
    onSelectMenuItem?.(label)
    closeSidebar()
  }

  return (
    <>
      {!onToggleSidebar && (
        <button
          aria-expanded={isOpen}
          aria-label={isOpen ? 'Tutup menu pekerja' : 'Buka menu pekerja'}
          className="fixed left-4 top-4 z-[60] inline-flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 shadow-sm transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:hidden"
          onClick={toggleSidebar}
          type="button"
        >
          <Icon name={isOpen ? 'close' : 'menu'} />
        </button>
      )}

      {isOpen && (
        <button
          aria-label="Tutup menu pekerja"
          className="fixed inset-0 z-40 bg-slate-950/40 backdrop-blur-[1px] lg:hidden"
          onClick={closeSidebar}
          type="button"
        />
      )}

      <aside
        aria-label="Navigasi pekerja"
        className={`worker-sidebar fixed inset-y-0 left-0 z-50 flex h-dvh w-72 flex-col border-r border-slate-800 bg-[#111827] text-slate-100 shadow-xl shadow-slate-900/20 transition-transform duration-300 ease-in-out lg:translate-x-0 lg:shadow-none ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="flex h-[88px] shrink-0 items-center justify-between border-b border-slate-800 px-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-emerald-600 text-white shadow-lg shadow-emerald-600/20">
              <svg
                aria-hidden="true"
                className="h-6 w-6"
                fill="none"
                stroke="currentColor"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="1.8"
                viewBox="0 0 24 24"
              >
                <rect height="14" rx="2" width="18" x="3" y="7" />
                <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18M10 12v2h4v-2" />
              </svg>
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-5 text-white">
                Sistem Pencatatan
              </p>
              <p className="text-sm font-medium leading-5 text-slate-400">
                Kerja
              </p>
            </div>
          </div>
          <button
            aria-label="Tutup menu pekerja"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-800 hover:text-white lg:hidden"
            onClick={closeSidebar}
            type="button"
          >
            <Icon className="h-5 w-5" name="close" />
          </button>
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-6">
          <p className="mb-3 px-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            Menu Pekerja
          </p>
          {mainMenuItems.map(({ label, icon }) => {
            const isActive = currentItem === label

            return (
              <button
                aria-current={isActive ? 'page' : undefined}
                className={`group flex w-full items-center gap-3 rounded-xl px-3 py-3 text-left text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm shadow-emerald-600/30'
                    : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                }`}
                key={label}
                onClick={() => selectMenuItem(label)}
                type="button"
              >
                <Icon
                  className={`h-5 w-5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 group-hover:text-white'
                  }`}
                  name={icon}
                />
                <span className="truncate">{label}</span>
                {isActive && (
                  <span className="ml-auto h-1.5 w-1.5 shrink-0 rounded-full bg-white" />
                )}
              </button>
            )
          })}
        </nav>

        <div className="shrink-0 border-t border-slate-800 p-4">
          <button
            className="flex w-full items-center gap-3 rounded-xl bg-slate-800/80 p-3 text-left transition hover:bg-slate-700/80 focus-visible:outline-2 focus-visible:outline-emerald-500"
            onClick={() => selectMenuItem('Profil Saya')}
            title="Buka Profil Saya"
            type="button"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-emerald-600 text-sm font-semibold text-white">
              {(workerName || 'P').trim().charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {workerName || 'Pekerja'}
              </p>
              <p className="text-xs text-slate-400">Pekerja</p>
            </div>
          </button>
        </div>
      </aside>
    </>
  )
}

export default SidebarPekerja
