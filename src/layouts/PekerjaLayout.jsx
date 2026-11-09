import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NavbarPekerja from '../components/NavbarPekerja.jsx'
import SidebarPekerja from '../components/SidebarPekerja.jsx'

function PekerjaLayout({
  activeItem = 'Dashboard',
  onSelectMenuItem = () => {},
  workerName = 'Budi Santoso',
  onLogout = () => {},
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function handleSelectMenuItem(item) {
    onSelectMenuItem(item)
    setIsSidebarOpen(false)
  }

  function toggleSidebar() {
    setIsSidebarOpen((isOpen) => !isOpen)
  }

  return (
    <div className="worker-theme min-h-screen overflow-x-hidden bg-slate-50">
      <SidebarPekerja
        activeItem={activeItem}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectMenuItem={handleSelectMenuItem}
        onToggleSidebar={toggleSidebar}
        workerName={workerName}
      />

      <div className="min-h-screen min-w-0 lg:ml-72">
        <NavbarPekerja
          isSidebarOpen={isSidebarOpen}
          onLogout={onLogout}
          onSelectMenuItem={handleSelectMenuItem}
          onToggleSidebar={toggleSidebar}
          workerName={workerName}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default PekerjaLayout
