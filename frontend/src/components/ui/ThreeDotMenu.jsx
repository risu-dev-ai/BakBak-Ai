// ============================================================
// BakBak Chat - Three-Dot Menu (WhatsApp-style)
// File: frontend/src/components/ui/ThreeDotMenu.jsx
// Appears in the chat sidebar header with all granular options
// ============================================================

import React, { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import authService from '@/services/authService'
import { disconnectSocket } from '@/lib/socket'

const MenuItem = ({ icon, label, onClick, danger = false, divider = false }) => (
  <>
    <button
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm transition-all duration-150 hover:bg-white/10 active:scale-95 ${
        danger ? 'text-red-400 hover:bg-red-500/10' : 'text-white/80 hover:text-white'
      }`}
    >
      <span className="text-base">{icon}</span>
      <span>{label}</span>
    </button>
    {divider && <div className="h-px bg-white/10 mx-4 my-1" />}
  </>
)

export default function ThreeDotMenu({ onCreateGroup, onStarredMessages }) {
  const [isOpen, setIsOpen] = useState(false)
  const menuRef = useRef(null)
  const navigate = useNavigate()
  const { clearAuth } = useAuthStore()

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e) => { if (e.key === 'Escape') setIsOpen(false) }
    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  const handleLogout = async () => {
    setIsOpen(false)
    try {
      await authService.logout()
    } catch (_) {}
    disconnectSocket()
    clearAuth()
    toast.success('Logged out. See you soon! 👋')
    navigate('/login', { replace: true })
  }

  const menuItems = [
    {
      icon: '👤', label: 'My Profile',
      onClick: () => { setIsOpen(false); navigate('/profile') },
    },
    {
      icon: '⚙️', label: 'Settings',
      onClick: () => { setIsOpen(false); toast('Settings coming soon!', { icon: '🔧' }) },
    },
    {
      icon: '👥', label: 'New Group',
      onClick: () => { setIsOpen(false); onCreateGroup?.() },
      divider: true,
    },
    {
      icon: '⭐', label: 'Starred Messages',
      onClick: () => { setIsOpen(false); onStarredMessages?.() },
    },
    {
      icon: '🔒', label: 'Privacy & Security',
      onClick: () => { setIsOpen(false); toast('Privacy settings coming soon!', { icon: '🔒' }) },
      divider: true,
    },
    {
      icon: '🚪', label: 'Log Out',
      onClick: handleLogout,
      danger: true,
    },
  ]

  return (
    <div className="relative" ref={menuRef}>
      {/* Trigger button — 3 vertical dots */}
      <button
        id="three-dot-menu-btn"
        onClick={() => setIsOpen((p) => !p)}
        className={`p-2 rounded-xl transition-all duration-200 hover:bg-white/10 active:scale-95 ${
          isOpen ? 'bg-white/10' : ''
        }`}
        title="More options"
        aria-haspopup="true"
        aria-expanded={isOpen}
      >
        <svg className="w-5 h-5 text-white/70" viewBox="0 0 24 24" fill="currentColor">
          <circle cx="12" cy="5" r="1.5" />
          <circle cx="12" cy="12" r="1.5" />
          <circle cx="12" cy="19" r="1.5" />
        </svg>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-52 glass-card py-2 z-50 animate-fade-in"
          style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.5)' }}
          role="menu"
          aria-label="Main menu"
        >
          {menuItems.map((item) => (
            <MenuItem key={item.label} {...item} />
          ))}
        </div>
      )}
    </div>
  )
}
