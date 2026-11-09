const ACTION_ICONS = {
  view: (
    <>
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  edit: (
    <>
      <path d="m15 5 4 4M4 20l4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z" />
    </>
  ),
  delete: (
    <>
      <path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6" />
      <path d="M10 11v5m4-5v5" />
    </>
  ),
}

function ActionButtons({ actions, label = 'Aksi' }) {
  return (
    <div aria-label={label} className="action-buttons">
      {actions.map(({ type, label: actionLabel, onClick, disabled, title }) => (
        <button
          aria-label={actionLabel}
          className={`action-button action-button-${type}`}
          disabled={disabled}
          key={`${type}-${actionLabel}`}
          onClick={onClick}
          title={title ?? actionLabel}
          type="button"
        >
          <svg
            aria-hidden="true"
            className="h-[17px] w-[17px]"
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="1.8"
            viewBox="0 0 24 24"
          >
            {ACTION_ICONS[type]}
          </svg>
        </button>
      ))}
    </div>
  )
}

export default ActionButtons
