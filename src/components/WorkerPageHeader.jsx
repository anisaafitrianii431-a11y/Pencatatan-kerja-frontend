function WorkerPageHeader({ title, description, icon }) {
  return (
    <header className="worker-page-header">
      <div className="worker-page-header-content">
        <div className="min-w-0">
          <p className="worker-page-header-label">Panel Pekerja</p>
          <nav aria-label="Breadcrumb" className="worker-page-header-breadcrumb">
            <span>Dashboard</span>
            <span aria-hidden="true">/</span>
            <span aria-current="page">{title}</span>
          </nav>
          <h1 className="worker-page-header-title">{title}</h1>
          <p className="worker-page-header-description">{description}</p>
        </div>
      </div>
      <span aria-hidden="true" className="worker-page-header-icon">
        {icon ?? (
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            <rect height="14" rx="2" width="18" x="3" y="7" />
            <path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18" />
          </svg>
        )}
      </span>
    </header>
  )
}

export default WorkerPageHeader
