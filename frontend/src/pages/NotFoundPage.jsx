// ============================================================
// BakBak Chat - 404 Not Found Page
// File: frontend/src/pages/NotFoundPage.jsx
// ============================================================

import React from 'react'
import { Link } from 'react-router-dom'

export default function NotFoundPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-gray-50">
      <div className="text-center animate-fade-in">
        <p className="text-8xl font-display font-bold text-wa-teal">404</p>
        <h1 className="text-3xl font-display font-bold text-gray-900 mt-4 mb-2">Page Not Found</h1>
        <p className="text-gray-500 mb-8">Oops! The page you're looking for doesn't exist.</p>
        <Link to="/" className="inline-block py-3 px-8 bg-wa-teal text-white font-semibold rounded-full hover:bg-wa-teal-dark transition-colors shadow-wa-md">
          Go Home
        </Link>
      </div>
    </div>
  )
}
