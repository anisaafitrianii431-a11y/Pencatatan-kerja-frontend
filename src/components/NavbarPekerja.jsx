import { useEffect, useRef, useState } from 'react'

function Icon({ name, className = 'h-5 w-5' }) {
  const paths = {
    chevron: <path d="m7 10 5 5 5-5" />,
    user: (
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
    logout: (
      <>
        <path d="M10 17l5-5-5-5M15 12H3" />
        <path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" />
      </>
    ),
    menu: <path d="M4 6h16M4 12h16M4 18h16" />,
    close: <path d="m18 6-12 12M6 6l12 12" />,
    work: (
      <>
        <rect x="3" y="7" width="18" height="14" rx="2" />
        <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
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
      {paths[name]}
    </svg>
  )
}

function NavbarPekerja({
  onToggleSidebar,
  isSidebarOpen = false,
  workerName = 'Budi Santoso',
  onSelectMenuItem = () => {},
  onLogout = () => {},
}) {
  const [isProfileOpen, setIsProfileOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const profileRef = useRef(null)
  const avatarInitial = workerName.trim().charAt(0).toUpperCase()

  useEffect(() => {
    function handlePointerDown(event) {
      if (!profileRef.current?.contains(event.target)) {
        setIsProfileOpen(false)
      }
    }

    function handleKeyDown(event) {
      if (event.key === 'Escape') {
        setIsProfileOpen(false)
      }
    }

    document.addEventListener('pointerdown', handlePointerDown)
    document.addEventListener('keydown', handleKeyDown)

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  function handleProfileAction(action) {
    setIsProfileOpen(false)
    if (action === 'Lihat Profil') {
      onSelectMenuItem('Profil Saya')
      return
    }
    if (action === 'Pengaturan') {
      onSelectMenuItem('Pengaturan')
      return
    }
    if (action === 'Keluar') {
      onLogout()
      return
    }
    setNotice(`${action} belum tersedia pada tahap frontend ini.`)
    window.setTimeout(() => setNotice(''), 3500)
  }

  return (
    <header className="relative z-[60] border-b border-slate-200 bg-white lg:z-30">
      <div className="flex min-h-[88px] items-center justify-between gap-3 px-4 py-4 sm:gap-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 items-center gap-3">
          <button
            aria-expanded={isSidebarOpen}
            aria-label={
              isSidebarOpen ? 'Tutup menu pekerja' : 'Buka menu pekerja'
            }
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-200 text-emerald-700 transition hover:bg-emerald-50 hover:text-emerald-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-emerald-600 lg:hidden"
            onClick={onToggleSidebar}
            type="button"
          >
            <Icon name={isSidebarOpen ? 'close' : 'menu'} />
          </button>
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700">
              <Icon name="work" />
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold leading-5 text-slate-900">
                Sistem Pencatatan Kerja
              </p>
              <p className="text-xs leading-4 text-slate-500">Area Pekerja</p>
            </div>
          </div>
        </div>

        <div className="relative shrink-0" ref={profileRef}>
          <button
            aria-expanded={isProfileOpen}
            aria-haspopup="menu"
            className="flex items-center gap-2 rounded-xl p-1.5 text-left transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:gap-3 sm:px-2"
            onClick={() => setIsProfileOpen((isOpen) => !isOpen)}
            type="button"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-sm font-semibold text-emerald-800 ring-2 ring-white">
              {avatarInitial}
            </span>
            <span className="hidden max-w-36 sm:block">
              <span className="block truncate text-sm font-semibold leading-5 text-slate-800">
                {workerName}
              </span>
              <span className="block text-xs leading-4 text-slate-500">
                Pekerja
              </span>
            </span>
            <Icon
              className={`hidden h-4 w-4 text-slate-400 transition-transform sm:block ${
                isProfileOpen ? 'rotate-180' : ''
              }`}
              name="chevron"
            />
          </button>

          <div
            aria-hidden={!isProfileOpen}
            className={`absolute right-0 top-full mt-2 w-56 origin-top-right rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg shadow-slate-900/10 transition duration-150 ${
              isProfileOpen
                ? 'visible translate-y-0 scale-100 opacity-100'
                : 'invisible -translate-y-1 scale-95 opacity-0'
            }`}
            role="menu"
          >
            <div className="border-b border-slate-100 px-3 py-2.5 sm:hidden">
              <p className="text-sm font-semibold text-slate-800">{workerName}</p>
              <p className="text-xs text-slate-500">Pekerja</p>
            </div>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => handleProfileAction('Lihat Profil')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4 text-slate-400" name="user" />
              Lihat Profil
            </button>
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-slate-700 transition hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => handleProfileAction('Pengaturan')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4 text-slate-400" name="settings" />
              Pengaturan
            </button>
            <div className="my-1 border-t border-slate-100" />
            <button
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-rose-600 transition hover:bg-rose-50 focus-visible:outline-2 focus-visible:outline-rose-600"
              onClick={() => handleProfileAction('Keluar')}
              role="menuitem"
              type="button"
            >
              <Icon className="h-4 w-4" name="logout" />
              Keluar
            </button>
          </div>
        </div>
      </div>

      {notice && (
        <div
          className="absolute right-4 top-full mt-2 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600 shadow-lg sm:right-6 lg:right-8"
          role="status"
        >
          <div className="flex items-start gap-3">
            <p>{notice}</p>
            <button
              aria-label="Tutup pemberitahuan"
              className="font-medium text-slate-400 hover:text-slate-700"
              onClick={() => setNotice('')}
              type="button"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </header>
  )
}

export default NavbarPekerja
