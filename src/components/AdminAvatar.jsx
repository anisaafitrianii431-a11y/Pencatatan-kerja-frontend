const AVATAR_COLORS = [
  'bg-blue-100 text-blue-700',
  'bg-indigo-100 text-indigo-700',
  'bg-violet-100 text-violet-700',
  'bg-slate-200 text-slate-700',
]

function getInitials(name) {
  const words = String(name ?? '').trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return 'AD'
  if (words.length === 1) return words[0].slice(0, 2).toLocaleUpperCase('id-ID')
  return `${words[0][0]}${words[1][0]}`.toLocaleUpperCase('id-ID')
}

function getColor(name) {
  const normalizedName = String(name ?? '').trim().toLocaleLowerCase('id-ID')
  const hash = [...normalizedName].reduce(
    (value, character) => (value * 31 + character.charCodeAt(0)) >>> 0,
    0,
  )
  return AVATAR_COLORS[hash % AVATAR_COLORS.length]
}

function AdminAvatar({ name, className = 'h-10 w-10', tone }) {
  const color = tone === 'brand' ? 'bg-blue-600 text-white' : getColor(name)

  return (
    <span
      aria-label={`Avatar ${name || 'Admin'}`}
      className={`inline-flex shrink-0 items-center justify-center rounded-full text-xs font-bold tracking-wide ${color} ${className}`}
      role="img"
    >
      {getInitials(name)}
    </span>
  )
}

export default AdminAvatar
