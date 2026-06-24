// ============================================================
// BakBak Chat - Page Loader (Full-screen spinner)
// File: frontend/src/components/ui/PageLoader.jsx
// ============================================================

import React from 'react'

export default function PageLoader() {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-white z-50">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-16 h-16">
          <div className="absolute inset-0 rounded-full border-4 border-primary-500/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-wa-teal animate-spin" />
          <div className="absolute inset-2 rounded-full bg-wa-teal flex items-center justify-center">
            <span className="text-white font-display font-bold text-lg">B</span>
          </div>
        </div>
        <p className="text-gray-500 text-sm font-medium animate-pulse">Loading BakBak...</p>
      </div>
    </div>
  )
}
