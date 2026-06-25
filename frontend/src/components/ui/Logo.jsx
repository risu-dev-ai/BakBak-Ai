import React from 'react'

export default function Logo({
  size = 'md',
  variant = 'gradient',
  showText = false,
  showTagline = false,
  className = '',
  textColor = 'text-white'
}) {
  // Define pixel sizes
  const sizes = {
    xs: 24,
    sm: 32,
    md: 48,
    lg: 64,
    xl: 96,
    xxl: 128
  }

  const pixelSize = typeof size === 'number' ? size : (sizes[size] || sizes.md)

  // Color mapping
  const fillColors = {
    gradient: 'url(#bakbak-gradient)',
    white: '#FFFFFF',
    dark: '#0B0F19'
  }

  const fillColor = fillColors[variant] || fillColors.gradient

  return (
    <div className={`flex flex-col items-center justify-center ${className}`}>
      <div 
        style={{ width: pixelSize, height: pixelSize }} 
        className="flex items-center justify-center select-none"
      >
        <svg 
          viewBox="0 0 100 100" 
          width="100%" 
          height="100%" 
          xmlns="http://www.w3.org/2000/svg"
        >
          <defs>
            {/* Linear gradient matching the logo artwork */}
            <linearGradient id="bakbak-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#D946EF" /> {/* Pink / Fuchsia */}
              <stop offset="50%" stopColor="#8B5CF6" /> {/* Indigo / Violet */}
              <stop offset="100%" stopColor="#06B6D4" /> {/* Cyan / Blue */}
            </linearGradient>

            {/* Mask to punch eyes and smile holes into the shape */}
            <mask id="bakbak-mask">
              {/* White background: draw everything */}
              <rect x="0" y="0" width="100" height="100" fill="white" />
              
              {/* Black: cut out eyes */}
              <circle cx="50" cy="49" r="4.5" fill="black" />
              <circle cx="66" cy="49" r="4.5" fill="black" />
              
              {/* Black: cut out smile */}
              <path 
                d="M 47 59 A 11 11 0 0 0 69 59" 
                stroke="black" 
                strokeWidth="4.5" 
                strokeLinecap="round" 
                fill="none" 
              />
            </mask>
          </defs>

          {/* Masked Group containing the custom shape parts */}
          <g mask="url(#bakbak-mask)">
            {/* Left stem of the lowercase "b" */}
            <path 
              d="M 30 15 A 6 6 0 0 1 42 15 L 42 55 L 30 55 Z" 
              fill={fillColor} 
            />
            {/* Round body of the bubble */}
            <circle 
              cx="58" 
              cy="55" 
              r="23" 
              fill={fillColor} 
            />
            {/* Speech bubble tail/pointer at the bottom-left */}
            <path 
              d="M 35 68 L 28 78 A 3.5 3.5 0 0 0 34 83 L 45 76 Z" 
              fill={fillColor} 
            />
          </g>
        </svg>
      </div>

      {showText && (
        <div className="text-center mt-3 animate-fade-in select-none">
          <h2 
            className={`font-display font-bold tracking-tight ${textColor}`}
            style={{ fontSize: pixelSize > 64 ? '1.75rem' : '1.25rem' }}
          >
            bakbak
          </h2>
          {showTagline && (
            <p 
              className="text-[9px] uppercase tracking-[0.2em] font-bold mt-1 bg-gradient-to-r from-pink-400 to-cyan-400 bg-clip-text text-transparent"
            >
              Chat. Connect. Explore.
            </p>
          )}
        </div>
      )}
    </div>
  )
}
