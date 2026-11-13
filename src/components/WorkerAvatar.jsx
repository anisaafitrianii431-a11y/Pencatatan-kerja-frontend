import { useEffect, useState } from 'react'
import { getFileUrl } from '../services/api.js'

export default function WorkerAvatar({
  name = 'Pekerja',
  photoPath = '',
  className = 'h-10 w-10 rounded-full bg-emerald-600 text-sm font-semibold text-white',
  imgClassName = 'h-full w-full object-cover',
}) {
  const [imgError, setImgError] = useState(false)

  useEffect(() => {
    setImgError(false)
  }, [photoPath])

  const initial = (String(name || 'P').trim().charAt(0) || 'P').toUpperCase()
  const resolvedSrc = photoPath ? getFileUrl(photoPath) : ''

  if (resolvedSrc && !imgError) {
    return (
      <span className={`relative inline-flex shrink-0 overflow-hidden items-center justify-center ${className}`}>
        <img
          src={resolvedSrc}
          alt={`Foto profil ${name || 'Pekerja'}`}
          className={imgClassName}
          onError={() => setImgError(true)}
        />
      </span>
    )
  }

  return (
    <span className={`inline-flex shrink-0 items-center justify-center ${className}`}>
      {initial}
    </span>
  )
}

