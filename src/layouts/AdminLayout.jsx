import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import NavbarAdmin from '../components/NavbarAdmin.jsx'
import SidebarAdmin from '../components/SidebarAdmin.jsx'

function AdminLayout({
  activeItem = 'Dashboard',
  onSelectMenuItem = () => {},
  onLogout = () => {},
  adminName = 'Admin',
  children,
}) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)

  function handleSelectMenuItem(item) {
    onSelectMenuItem(item)
    setIsSidebarOpen(false)
  }

  return (
    <div className="admin-theme min-h-screen overflow-x-hidden bg-slate-50">
      <SidebarAdmin
        activeItem={activeItem}
        adminName={adminName}
        isMobileOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        onSelectMenuItem={handleSelectMenuItem}
        onLogout={onLogout}
      />

      <div className="min-h-screen min-w-0 lg:ml-72">
        <NavbarAdmin
          isSidebarOpen={isSidebarOpen}
          onLogout={onLogout}
          onToggleSidebar={() => setIsSidebarOpen((isOpen) => !isOpen)}
        />
        <main className="min-w-0 px-4 py-6 sm:px-6 lg:px-8 lg:py-8">
          {children || <Outlet />}
        </main>
      </div>
    </div>
  )
}

export default AdminLayout
