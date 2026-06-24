// ============================================================
// BakBak Chat - Landing Page (WhatsApp-Style)
// File: frontend/src/pages/LandingPage.jsx
// ============================================================

import React from 'react'
import { Link } from 'react-router-dom'

export default function LandingPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-white relative overflow-hidden">
      {/* Subtle background */}
      <div className="absolute top-0 left-0 right-0 h-1/2 bg-wa-teal" />

      {/* Content */}
      <div className="relative z-10 text-center max-w-md animate-fade-in">
        {/* Logo */}
        <div className="w-24 h-24 mx-auto mb-6 rounded-3xl bg-white flex items-center justify-center shadow-wa-lg">
          <span className="text-wa-teal font-display font-bold text-4xl">B</span>
        </div>

        <h1 className="text-4xl md:text-5xl font-display font-bold mb-3">
          <span className="text-white">BakBak</span>
          <span className="text-white/80"> Chat</span>
        </h1>

        <p className="text-white/80 text-base mb-3">
          Connect • Chat • Share
        </p>

        <p className="text-white/60 text-sm mb-10 leading-relaxed max-w-sm mx-auto">
          Secure, real-time messaging with{' '}
          <span className="text-white font-semibold">end-to-end encryption</span>.
          Your conversations, only yours. 🇮🇳
        </p>

        <div className="flex flex-col gap-3 max-w-xs mx-auto">
          <Link to="/register" className="py-3 px-6 bg-white text-wa-teal font-semibold rounded-full text-center shadow-wa-md hover:shadow-wa-lg transition-all">
            Get Started — It&apos;s Free
          </Link>
          <Link to="/login" className="py-3 px-6 border-2 border-white/40 text-white font-semibold rounded-full text-center hover:bg-white/10 transition-all">
            Sign In
          </Link>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2 mt-12">
          {['🔒 E2E Encrypted', '⚡ Real-time', '📹 Video Calls', '👥 Groups', '📱 Stories'].map((f) => (
            <span key={f} className="bg-white/20 backdrop-blur-sm px-3 py-1.5 text-xs text-white rounded-full border border-white/20">
              {f}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
