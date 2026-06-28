// ============================================================
// BakBak Chat - Settings & Theme Personalization Page
// File: frontend/src/pages/settings/SettingsPage.jsx
// ============================================================

import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '@/store/authStore'
import { disconnectSocket } from '@/lib/socket'
import Avatar from '@/components/ui/Avatar'
import { applyTheme, THEME_PRESETS } from '@/lib/theme'
import { syncAddressBook } from '@/lib/contactsSync'

export default function SettingsPage() {
  const navigate = useNavigate()
  const { user, clearAuth } = useAuthStore()
  const [syncing, setSyncing] = useState(false)
  const [syncResult, setSyncResult] = useState(null) // { success: boolean, msg: string }

  const currentTheme = localStorage.getItem('bakbak_theme_key') || 'cyberpunk'

  const handleLogout = () => {
    disconnectSocket()
    clearAuth()
    navigate('/login')
  }

  const handleThemeChange = (themeKey) => {
    applyTheme(themeKey)
    // Force a re-render to update selected indicators
    navigate('/settings')
  }

  const handleContactsSync = async () => {
    setSyncing(true)
    setSyncResult(null)
    try {
      const res = await syncAddressBook()
      setSyncResult({
        success: true,
        msg: res.count > 0 
          ? `Synced ${res.count} contacts successfully!` 
          : 'Sync complete. No new contacts found.'
      })
    } catch (err) {
      setSyncResult({
        success: false,
        msg: err.message || 'Sync failed. Native access required.'
      })
    } finally {
      setSyncing(false)
      setTimeout(() => setSyncResult(null), 5000)
    }
  }

  return (
    <div className="h-screen overflow-y-auto bg-wa-bg text-white page-with-nav relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-wa-blue/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="bg-wa-teal/60 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-3 border-b border-white/5 flex-shrink-0 z-10 sticky top-0">
        <h1 className="text-xl font-bold font-display tracking-wide">Settings</h1>
      </div>

      {/* Profile Card */}
      <div className="px-4 py-6 mt-4">
        <div
          onClick={() => navigate('/profile')}
          className="flex items-center gap-4 p-5 glass-panel rounded-3xl cursor-pointer hover:bg-white/10 transition-all border border-white/10 active:scale-[0.99]"
        >
          <Avatar user={user} size="lg" showOnline className="ring-4 ring-primary-500/20" />
          <div className="flex-1 min-w-0">
            <p className="text-[17px] font-bold text-white truncate">{user?.displayName || user?.username}</p>
            <p className="text-xs text-white/50 truncate mt-0.5">{user?.statusText || 'Hey there! I am using BakBak.'}</p>
          </div>
          <svg className="w-5 h-5 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </div>
      </div>

      {/* Personalization Section */}
      <div className="px-4 py-2 space-y-4">
        <h2 className="text-xs text-primary-500 font-bold uppercase tracking-wider px-2">Chats & Themes</h2>
        
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
          <p className="text-sm font-semibold text-white/80">Choose Theme Preset</p>
          
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(THEME_PRESETS).map(([key, preset]) => (
              <button
                key={key}
                onClick={() => handleThemeChange(key)}
                className={`p-3.5 rounded-2xl border text-left flex flex-col justify-between transition-all duration-300 ${
                  currentTheme === key
                    ? 'border-primary-500 bg-primary-500/10 shadow-glass-glow'
                    : 'border-white/5 bg-white/5 hover:bg-white/10'
                }`}
              >
                <span className="text-xs font-bold text-white">{preset.name}</span>
                <div className="flex gap-1.5 mt-3">
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors['--wa-green'] }} />
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors['--wa-blue'] }} />
                  <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: preset.colors['--wa-teal'] }} />
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Contacts Sync Section */}
      <div className="px-4 py-4 space-y-4">
        <h2 className="text-xs text-primary-500 font-bold uppercase tracking-wider px-2">Address Book Sync</h2>
        
        <div className="glass-panel p-5 rounded-3xl border border-white/10 space-y-4">
          <div className="flex items-start gap-3">
            <span className="text-2xl mt-0.5">🔄</span>
            <div>
              <p className="text-sm font-semibold text-white">Automated Local Contacts Sync</p>
              <p className="text-xs text-white/50 mt-1 leading-relaxed">
                Scan your local mobile address book to automatically find and add your friends registered on BakBak Chat.
              </p>
            </div>
          </div>

          {syncResult && (
            <div className={`p-3 rounded-2xl text-xs font-semibold animate-fade-in border ${
              syncResult.success 
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' 
                : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
            }`}>
              {syncResult.msg}
            </div>
          )}

          <button
            onClick={handleContactsSync}
            disabled={syncing}
            className="w-full glass-button bg-primary-500 text-wa-teal-dark hover:brightness-110 font-bold py-3.5 rounded-2xl flex items-center justify-center gap-2.5 transition-all shadow-glass-glow disabled:opacity-50"
          >
            {syncing ? (
              <>
                <svg className="animate-spin h-5 w-5 text-wa-teal-dark" viewBox="0 0 24 24" fill="none">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Syncing Address Book...
              </>
            ) : (
              <>
                <span>📲</span>
                Sync Local Contacts
              </>
            )}
          </button>
        </div>
      </div>

      {/* Account Settings Menu */}
      <div className="px-4 py-2 space-y-4">
        <h2 className="text-xs text-primary-500 font-bold uppercase tracking-wider px-2">Account</h2>
        
        <div className="glass-panel rounded-3xl border border-white/10 overflow-hidden divide-y divide-white/5">
          <div
            onClick={() => navigate('/profile')}
            className="flex items-center justify-between p-4 cursor-pointer hover:bg-white/5 transition-all"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">👤</span>
              <div>
                <p className="text-sm font-semibold">Edit Profile</p>
                <p className="text-[11px] text-white/40 mt-0.5">Avatar, display name, status text, and E2EE keys</p>
              </div>
            </div>
            <svg className="w-4 h-4 text-white/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </div>
        </div>
      </div>

      {/* Logout Button */}
      <div className="px-4 py-8">
        <button
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-2 p-4 bg-rose-500/10 hover:bg-rose-500/20 active:scale-[0.99] border border-rose-500/20 rounded-3xl text-rose-500 font-semibold text-sm transition-all"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          Log Out Account
        </button>
      </div>
    </div>
  )
}
