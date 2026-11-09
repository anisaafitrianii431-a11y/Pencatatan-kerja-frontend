function AdminPageBanner({
  title,
  description,
  icon,
  action,
}) {
  return (
    <header className="admin-page-banner">
      <div className="admin-page-banner-content">
        <span className="admin-page-banner-icon">{icon}</span>
        <div className="min-w-0">
          <p className="admin-page-banner-label">Panel Manajemen</p>
          <nav aria-label="Breadcrumb" className="admin-page-banner-breadcrumb">
            <span>Dashboard</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 className="admin-page-banner-title">{title}</h1>
          <p className="admin-page-banner-description">{description}</p>
        </div>
      </div>
      {action && <div className="admin-page-banner-action">{action}</div>}
    </header>
  )
}

export default AdminPageBanner
