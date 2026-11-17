import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NavbarKaryawan from '../components/NavbarKaryawan.jsx'
import SidebarKaryawan from '../components/SidebarKaryawan.jsx'

function TataLetakKaryawan({
  activeItem = 'Dashboard',
  onSelectMenuItem = () => {},
  workerName = 'Pekerja',
  workerPhoto = '',
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
      <SidebarKaryawan
        activeItem={activeItem}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectMenuItem={handleSelectMenuItem}
        onToggleSidebar={toggleSidebar}
        onLogout={onLogout}
        workerName={workerName}
        workerPhoto={workerPhoto}
      />

      <div className="min-h-screen min-w-0 lg:ml-72">
        <NavbarKaryawan
          isSidebarOpen={isSidebarOpen}
          onLogout={onLogout}
          onSelectMenuItem={handleSelectMenuItem}
          onToggleSidebar={toggleSidebar}
          workerName={workerName}
          workerPhoto={workerPhoto}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default TataLetakKaryawan
