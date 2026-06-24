// ============================================================
// BakBak Chat - Avatar Component (Reusable)
// File: frontend/src/components/ui/Avatar.jsx
// Shows profile picture with fallback initials + online dot
// ============================================================

import React from 'react'
import CachedImage from './CachedImage'

const sizeMap = {
  xs:  { container: 'w-7 h-7',   text: 'text-xs',  dot: 'w-2 h-2' },
  sm:  { container: 'w-9 h-9',   text: 'text-sm',  dot: 'w-2.5 h-2.5' },
  md:  { container: 'w-11 h-11', text: 'text-base', dot: 'w-3 h-3' },
  lg:  { container: 'w-16 h-16', text: 'text-xl',  dot: 'w-3.5 h-3.5' },
  xl:  { container: 'w-24 h-24', text: 'text-3xl', dot: 'w-4 h-4' },
  '2xl': { container: 'w-32 h-32', text: 'text-4xl', dot: 'w-5 h-5' },
}

// Deterministic color from username string
const getGradient = (name = '') => {
  const gradients = [
    'from-violet-500 to-indigo-600',
    'from-blue-500 to-cyan-600',
    'from-emerald-500 to-teal-600',
    'from-rose-500 to-pink-600',
    'from-amber-500 to-orange-600',
    'from-fuchsia-500 to-purple-600',
  ]
  const idx = name.charCodeAt(0) % gradients.length
  return gradients[idx]
}

export default function Avatar({
  user,
  size = 'md',
  showOnline = false,
  className = '',
  onClick,
}) {
  const { container, text, dot } = sizeMap[size] || sizeMap.md
  const initials = (user?.displayName || user?.username || '?')
    .charAt(0)
    .toUpperCase()
  const gradient = getGradient(user?.username || '')
  const isOnline = showOnline && user?.isOnline

  return (
    <div
      className={`relative flex-shrink-0 ${className} ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className={`${container} rounded-full overflow-hidden flex-shrink-0`}>
        {user?.avatar?.url ? (
          <CachedImage
            src={user.avatar.url}
            alt={user.displayName || user.username}
            className="w-full h-full object-cover"
          />
        ) : (
          <div
            className={`w-full h-full bg-gradient-to-br ${gradient} flex items-center justify-center`}
          >
            <span className={`${text} font-bold text-white select-none`}>
              {initials}
            </span>
          </div>
        )}
      </div>

      {/* Online indicator dot */}
      {showOnline && (
        <span
          className={`absolute bottom-0 right-0 ${dot} rounded-full border-2 border-white ${
            isOnline ? 'bg-green-400' : 'bg-gray-400'
          }`}
        />
      )}
    </div>
  )
}
