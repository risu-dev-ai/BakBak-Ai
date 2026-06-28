// ============================================================
// BakBak Chat - Profile Page (Gemini Glassmorphic Theme Overhaul)
// File: frontend/src/pages/profile/ProfilePage.jsx
// ============================================================

import React, { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import userService from '@/services/userService'
import authService from '@/services/authService'
import { disconnectSocket } from '@/lib/socket'
import Avatar from '@/components/ui/Avatar'
import Input from '@/components/ui/Input'

export default function ProfilePage() {
  const navigate = useNavigate()
  const { user, updateUser, clearAuth } = useAuthStore()
  const fileInputRef = useRef(null)

  // ── Edit mode toggle ───────────────────────────────────────
  const [isEditing, setIsEditing] = useState(false)

  // ── Profile form state ─────────────────────────────────────
  const [form, setForm] = useState({
    displayName: user?.displayName || '',
    bio: user?.bio || '',
    statusText: user?.statusText || '',
    phone: user?.phone || '',
    email: user?.email || '',
    username: user?.username || '',
  })

  // ── Password form state ────────────────────────────────────
  const [showPasswordSection, setShowPasswordSection] = useState(false)
  const [pwdForm, setPwdForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  // ── OTP Verification Overlay State ──────────────────────────
  const [showOtpOverlay, setShowOtpOverlay] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpTarget, setOtpTarget] = useState('') // email or phone being verified
  const [otpLoading, setOtpLoading] = useState(false)

  // ── Loading states ─────────────────────────────────────────
  const [saving, setSaving] = useState(false)
  const [avatarLoading, setAvatarLoading] = useState(false)
  const [pwdLoading, setPwdLoading] = useState(false)
  const [logoutLoading, setLogoutLoading] = useState(false)

  // ── Avatar preview ─────────────────────────────────────────
  const [avatarPreview, setAvatarPreview] = useState(user?.avatar?.url || null)

  // ── Handlers ───────────────────────────────────────────────
  const handleFieldChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleToggleEdit = () => {
    if (isEditing) {
      // Cancel edit — reset form
      setForm({
        displayName: user?.displayName || '',
        bio: user?.bio || '',
        statusText: user?.statusText || '',
        phone: user?.phone || '',
        email: user?.email || '',
        username: user?.username || '',
      })
    }
    setIsEditing(!isEditing)
  }

  // ── Save Profile ───────────────────────────────────────────
  const handleSaveProfile = async () => {
    if (!form.displayName.trim()) {
      toast.error('Display name is required.')
      return
    }

    const emailChanged = form.email.toLowerCase().trim() !== user?.email
    const phoneChanged = form.phone.trim() !== (user?.phone || '')

    // If email or phone has changed, request OTP verification first!
    if (emailChanged) {
      setSaving(true)
      try {
        const targetEmail = form.email.toLowerCase().trim()
        await userService.requestProfileUpdateOTP(targetEmail)
        setOtpTarget(targetEmail)
        setShowOtpOverlay(true)
        toast.success(`Verification code sent to ${targetEmail} ✉️`)
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Verification request failed.')
      } finally {
        setSaving(false)
      }
      return
    }

    if (phoneChanged) {
      setSaving(true)
      try {
        const targetPhone = form.phone.trim()
        await userService.requestProfileUpdateOTP(targetPhone)
        setOtpTarget(targetPhone)
        setShowOtpOverlay(true)
        toast.success(`Verification code sent to ${targetPhone} 📱`)
      } catch (err) {
        toast.error(err?.response?.data?.message || err?.message || 'Verification request failed.')
      } finally {
        setSaving(false)
      }
      return
    }

    // Standard profile updates (no email/phone changes)
    setSaving(true)
    try {
      const data = await userService.updateProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        statusText: form.statusText.trim(),
      })
      updateUser(data.data?.user || data.user)
      toast.success('Profile updated! ✅')
      setIsEditing(false)
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  // Submit verified email/phone profile save
  const handleVerifyProfileOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) {
      toast.error('Please enter a 6-digit OTP code.')
      return
    }

    setOtpLoading(true)
    try {
      // Send complete update including verified field + OTP
      const emailChanged = form.email.toLowerCase().trim() !== user?.email
      const phoneChanged = form.phone.trim() !== (user?.phone || '')

      const data = await userService.updateProfile({
        displayName: form.displayName.trim(),
        bio: form.bio.trim(),
        statusText: form.statusText.trim(),
        ...(emailChanged ? { email: form.email.toLowerCase().trim() } : {}),
        ...(phoneChanged ? { phone: form.phone.trim() } : {}),
        otp: otp.trim()
      })

      updateUser(data.data?.user || data.user)
      toast.success('Profile details verified & updated! ✅')
      setShowOtpOverlay(false)
      setIsEditing(false)
      setOtp('')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'OTP Verification failed.')
    } finally {
      setOtpLoading(false)
    }
  }

  // ── Avatar Upload ──────────────────────────────────────────
  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file.')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image must be smaller than 5MB.')
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => setAvatarPreview(ev.target.result)
    reader.readAsDataURL(file)

    setAvatarLoading(true)
    try {
      const data = await userService.uploadAvatar(file)
      updateUser({ avatar: data.data?.avatar || data.avatar })
      toast.success('Profile picture updated! 📸')
    } catch (err) {
      setAvatarPreview(user?.avatar?.url || null)
      toast.error(err?.response?.data?.message || err?.message || 'Failed to upload image.')
    } finally {
      setAvatarLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  // ── Change Password ────────────────────────────────────────
  const handleChangePassword = async (e) => {
    e.preventDefault()

    if (!pwdForm.currentPassword) {
      toast.error('Current password is required.')
      return
    }
    if (!pwdForm.newPassword || pwdForm.newPassword.length < 8) {
      toast.error('New password must be at least 8 characters.')
      return
    }
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error('Passwords do not match.')
      return
    }

    setPwdLoading(true)
    try {
      await userService.changePassword({
        currentPassword: pwdForm.currentPassword,
        newPassword: pwdForm.newPassword,
      })
      setPwdForm({ currentPassword: '', newPassword: '', confirmPassword: '' })
      setShowPasswordSection(false)
      toast.success('Password changed successfully! 🔒')
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Failed to change password.')
    } finally {
      setPwdLoading(false)
    }
  }

  // ── Logout ─────────────────────────────────────────────────
  const handleLogout = async () => {
    setLogoutLoading(true)
    try {
      await authService.logout()
    } catch (_) {}
    try {
      const { deleteKeyPair } = await import('@/lib/crypto')
      await deleteKeyPair()
    } catch (_) {}
    disconnectSocket()
    clearAuth()
    toast.success('Logged out. See you soon! 👋')
    navigate('/login', { replace: true })
  }

  const displayName = user?.displayName || user?.username || 'User'
  const statusText = user?.statusText || 'Hey there! I am using BakBak Chat.'

  return (
    <div className="h-screen overflow-y-auto bg-wa-bg page-with-nav relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-primary-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-wa-blue/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="wa-header gap-3 sticky top-0 z-30">
        <button
          onClick={() => navigate(-1)}
          className="p-1 -ml-1 rounded-full text-white/80 hover:text-white transition-colors"
          aria-label="Go back"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-lg font-semibold flex-1">My Profile</h1>
        <button
          onClick={handleToggleEdit}
          className="p-2 rounded-full text-white/80 hover:text-white transition-colors"
          aria-label={isEditing ? 'Cancel editing' : 'Edit profile'}
        >
          {isEditing ? (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
          )}
        </button>
      </div>

      {/* Profile Card / Avatar */}
      <div className="flex flex-col items-center py-8 z-10 relative">
        <div className="relative">
          <div className="w-24 h-24 rounded-full overflow-hidden ring-4 ring-primary-500/20 shadow-glass-glow">
            {avatarPreview ? (
              <img
                src={avatarPreview}
                alt={displayName}
                className="w-full h-full object-cover"
              />
            ) : (
              <Avatar user={user} size="xl" />
            )}
          </div>

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={avatarLoading}
            className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-gradient-to-br from-primary-500 to-wa-blue text-wa-teal-dark flex items-center justify-center shadow-lg border-2 border-wa-bg hover:brightness-110 transition-colors"
            aria-label="Change profile photo"
          >
            {avatarLoading ? (
              <svg className="animate-spin w-4 h-4 text-wa-teal-dark" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            )}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </div>

        <h2 className="mt-4 text-xl font-bold text-white">{displayName}</h2>
        <p className="text-xs text-white/50 mt-1">@{user?.username || 'username'}</p>
      </div>

      {/* Edit Panel Form */}
      <div className="px-4 space-y-4 relative z-10">
        <div className="glass-panel p-5 rounded-3xl space-y-4">
          <div>
            <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Display Name</label>
            {isEditing ? (
              <input
                type="text"
                value={form.displayName}
                onChange={(e) => handleFieldChange('displayName', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            ) : (
              <p className="text-sm font-semibold text-white/90">{user?.displayName || 'Not Set'}</p>
            )}
          </div>

          <div className="border-t border-white/5 pt-3">
            <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">About / Bio</label>
            {isEditing ? (
              <textarea
                value={form.bio}
                onChange={(e) => handleFieldChange('bio', e.target.value)}
                maxLength={200}
                rows={2}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500 resize-none"
              />
            ) : (
              <p className="text-sm text-white/70 italic">"{user?.bio || 'Hey there! I am using BakBak Chat.'}"</p>
            )}
          </div>

          <div className="border-t border-white/5 pt-3">
            <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Email</label>
            {isEditing ? (
              <input
                type="email"
                value={form.email}
                onChange={(e) => handleFieldChange('email', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            ) : (
              <p className="text-sm font-semibold text-white/90">{user?.email || 'Not Set'}</p>
            )}
          </div>

          <div className="border-t border-white/5 pt-3">
            <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1">Phone</label>
            {isEditing ? (
              <input
                type="tel"
                value={form.phone}
                onChange={(e) => handleFieldChange('phone', e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white focus:outline-none focus:border-primary-500"
              />
            ) : (
              <p className="text-sm font-semibold text-white/90">{user?.phone ? `+91 ${user.phone}` : 'Not Set'}</p>
            )}
          </div>
        </div>

        {isEditing && (
          <button
            onClick={handleSaveProfile}
            disabled={saving}
            className="w-full py-3 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark font-bold rounded-xl active:scale-[0.98] transition-all shadow-glass-glow disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {saving ? 'Processing...' : 'Save Details'}
          </button>
        )}

        {/* Change Password Panel */}
        <div className="glass-panel rounded-3xl overflow-hidden">
          <button
            onClick={() => setShowPasswordSection(!showPasswordSection)}
            className="w-full px-5 py-4 flex items-center justify-between text-white/80 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-3">
              <span className="text-lg">🔒</span>
              <p className="text-sm font-bold uppercase tracking-wider">Change Password</p>
            </div>
            <svg
              className={`w-4 h-4 text-white/40 transition-transform duration-200 ${showPasswordSection ? 'rotate-90' : ''}`}
              fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>

          {showPasswordSection && (
            <form onSubmit={handleChangePassword} className="px-5 pb-5 space-y-4 border-t border-white/5 pt-4 animate-fade-in">
              <Input
                id="currentPassword"
                name="currentPassword"
                type="password"
                label="Current Password"
                placeholder="••••••••"
                value={pwdForm.currentPassword}
                onChange={(e) => setPwdForm(p => ({ ...p, currentPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Input
                id="newPassword"
                name="newPassword"
                type="password"
                label="New Password"
                placeholder="Min 8 characters"
                value={pwdForm.newPassword}
                onChange={(e) => setPwdForm(p => ({ ...p, newPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <Input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                label="Confirm New Password"
                placeholder="Re-enter password"
                value={pwdForm.confirmPassword}
                onChange={(e) => setPwdForm(p => ({ ...p, confirmPassword: e.target.value }))}
                required
                className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
              />
              <button
                type="submit"
                disabled={pwdLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark font-bold rounded-xl active:scale-[0.98] transition-all shadow-glass-glow disabled:opacity-50"
              >
                {pwdLoading ? 'Updating...' : 'Update Password'}
              </button>
            </form>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          disabled={logoutLoading}
          className="w-full glass-panel py-4 rounded-3xl text-red-400 font-bold hover:bg-red-500/10 hover:border-red-500/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2 mb-6"
        >
          {logoutLoading ? 'Signing out...' : '🚪 Sign Out'}
        </button>
      </div>

      {/* ── OTP VERIFICATION OVERLAY ─────────────────────────── */}
      {showOtpOverlay && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fade-in">
          <form 
            onSubmit={handleVerifyProfileOtp}
            className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/15 shadow-wa-lg space-y-5 text-center animate-bounce-in"
          >
            <span className="text-3xl">🔑</span>
            <h3 className="text-lg font-bold text-white">Profile Update Verification</h3>
            <p className="text-white/60 text-xs">
              Enter the 6-digit OTP code sent to verify your new details: <br/>
              <span className="text-primary-500 font-semibold mt-1 inline-block">{otpTarget}</span>
            </p>

            <Input
              id="updateOtp"
              name="updateOtp"
              type="text"
              label="Verification Code (OTP)"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              required
              className="text-center tracking-[6px] text-lg font-bold bg-white/5 border-white/10 text-white"
            />

            <div className="flex flex-col gap-2 pt-2">
              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-3 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark font-bold rounded-xl active:scale-[0.98] transition-all shadow-glass-glow disabled:opacity-50"
              >
                {otpLoading ? 'Verifying...' : 'Verify & Save'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowOtpOverlay(false)
                  setOtp('')
                }}
                className="text-xs text-white/40 hover:text-white py-2"
              >
                Cancel Updates
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
