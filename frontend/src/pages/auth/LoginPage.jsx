// ============================================================
// BakBak Chat - Login Page (Premium Dark Glassmorphic Theme)
// File: frontend/src/pages/auth/LoginPage.jsx
// ============================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import authService from '@/services/authService'
import userService from '@/services/userService'
import useAuthStore from '@/store/authStore'
import { connectSocket } from '@/lib/socket'
import { generateKeyPair, hasKeyPair, getStoredPublicKey } from '@/lib/crypto'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'

export default function LoginPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()

  const [form, setForm] = useState({ identifier: '', password: '' })
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  // OTP Verification flow states
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: '' }))
  }

  const validate = () => {
    const errs = {}
    if (!form.identifier.trim()) errs.identifier = 'Email, username, or phone is required.'
    if (!form.password) errs.password = 'Password is required.'
    return errs
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validate()
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const data = await authService.login({
        identifier: form.identifier.trim(),
        password: form.password,
      })

      // Check if registration/login needs OTP verification
      if (data.success && data.message?.toLowerCase().includes('verification') || data.data?.isVerified === false) {
        setOtpEmail(data.data.email);
        setShowOtpScreen(true);
        toast.success('Please verify your account with the OTP sent to your email.');
        return;
      }

      setAuth(data.data.user, data.data.token)
      connectSocket(data.data.token)

      // E2EE Key Setup
      try {
        const keysExist = await hasKeyPair()
        const localPublicKeyStr = await getStoredPublicKey()
        const serverPublicKeyStr = data.data.user.publicKey

        let keysMatch = false
        if (keysExist && localPublicKeyStr && serverPublicKeyStr) {
          try {
            const localKeyObj = JSON.parse(localPublicKeyStr)
            const serverKeyObj = JSON.parse(serverPublicKeyStr)
            keysMatch = localKeyObj.x === serverKeyObj.x && localKeyObj.y === serverKeyObj.y
          } catch {
            keysMatch = false
          }
        }

        if (!keysExist || !serverPublicKeyStr || !keysMatch) {
          console.log('🔄 E2EE key mismatch or missing. Generating new key pair...')
          const publicKeyStr = await generateKeyPair()
          await userService.savePublicKey(publicKeyStr)
          useAuthStore.getState().updateUser({ publicKey: publicKeyStr })
        }
        useAuthStore.getState().setE2EEReady(true)
      } catch (e2eeErr) {
        console.warn('E2EE key setup failed (non-blocking):', e2eeErr)
      }

      toast.success(`Welcome back, ${data.data.user.displayName}! 👋`)
      navigate('/chat', { replace: true })
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Login failed. Please try again.'
      toast.error(msg)
      if (msg.toLowerCase().includes('invalid')) {
        setErrors({ identifier: ' ', password: 'Invalid credentials.' })
      }
    } finally {
      setLoading(false)
    }
  }

  // Handle OTP entry
  const handleVerifyOtp = async (e) => {
    e.preventDefault()
    if (!otp || otp.trim().length !== 6) {
      toast.error('Please enter a valid 6-digit verification code.')
      return
    }

    setOtpLoading(true)
    try {
      const data = await authService.verifyOtp({
        emailOrPhone: otpEmail,
        otp: otp.trim()
      })

      setAuth(data.data.user, data.data.token)
      connectSocket(data.data.token)

      // Generate E2EE key pair
      try {
        const publicKeyStr = await generateKeyPair()
        await userService.savePublicKey(publicKeyStr)
        useAuthStore.getState().updateUser({ publicKey: publicKeyStr })
        useAuthStore.getState().setE2EEReady(true)
      } catch (e2eeErr) {
        console.warn('E2EE key setup failed (non-blocking):', e2eeErr)
      }

      toast.success('Account verified successfully! Welcome 🎉')
      navigate('/chat', { replace: true })
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || 'Verification failed. Try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  const handleResendOtp = async () => {
    try {
      await authService.resendOtp({ emailOrPhone: otpEmail })
      toast.success('New verification code sent!')
    } catch (err) {
      toast.error('Failed to resend code. Please try again.')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-wa-bg relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary-500/20 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-wa-blue/20 to-transparent blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md glass-panel p-8 rounded-3xl animate-bounce-in border border-white/10 shadow-wa-lg z-10">
        {/* Logo / Header */}
        <div className="text-center mb-8">
          <Logo size={64} variant="gradient" className="mb-4 filter drop-shadow-lg" />
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">BakBak Chat</h1>
          <p className="text-white/40 text-xs mt-1.5 font-medium uppercase tracking-wider">Premium E2EE Chat client</p>
        </div>

        {!showOtpScreen ? (
          /* Login Form */
          <form onSubmit={handleSubmit} noValidate className="space-y-5">
            <Input
              id="identifier"
              name="identifier"
              label="Email, Username, or Phone"
              placeholder="you@example.com"
              value={form.identifier}
              onChange={handleChange}
              error={errors.identifier}
              required
              autoComplete="username"
              autoFocus
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />

            <Input
              id="password"
              name="password"
              type="password"
              label="Password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              error={errors.password}
              required
              autoComplete="current-password"
              className="bg-white/5 border-white/10 text-white placeholder:text-white/30"
            />

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-6 py-3 px-4 bg-gradient-to-r from-primary-500 to-wa-blue hover:brightness-110 active:scale-[0.98] text-wa-teal-dark font-bold rounded-xl transition-all shadow-glass-glow disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <svg className="animate-spin h-5 w-5 text-wa-teal-dark" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Connecting...
                </>
              ) : 'Sign In'}
            </button>
          </form>
        ) : (
          /* OTP Screen */
          <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fade-in">
            <div className="text-center mb-6">
              <span className="text-3xl">📧</span>
              <h2 className="text-lg font-bold text-white mt-2">Enter Verification Code</h2>
              <p className="text-white/60 text-xs mt-1.5">
                We've sent a 6-digit OTP code to verify: <br/>
                <span className="text-primary-500 font-semibold mt-1 inline-block">{otpEmail}</span>
              </p>
            </div>

            <Input
              id="otp"
              name="otp"
              type="text"
              label="One-Time Password (OTP)"
              placeholder="123456"
              maxLength={6}
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/[^0-9]/g, ''))}
              required
              autoFocus
              className="text-center tracking-[8px] text-lg font-bold bg-white/5 border-white/10 text-white"
            />

            <div className="flex flex-col gap-3">
              <button
                type="submit"
                disabled={otpLoading}
                className="w-full py-3 px-4 bg-gradient-to-r from-primary-500 to-wa-blue hover:brightness-110 active:scale-[0.98] text-wa-teal-dark font-bold rounded-xl transition-all shadow-glass-glow disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {otpLoading ? (
                  <>
                    <svg className="animate-spin h-5 w-5 text-wa-teal-dark" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Verifying...
                  </>
                ) : 'Verify & Continue'}
              </button>

              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => setShowOtpScreen(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  ← Change Account
                </button>
                <button
                  type="button"
                  onClick={handleResendOtp}
                  className="text-primary-500 font-semibold hover:brightness-110 transition-all"
                >
                  Resend Code 🔄
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-[1px] bg-white/10" />
          <span className="text-white/30 text-xs">OR</span>
          <div className="flex-1 h-[1px] bg-white/10" />
        </div>

        {/* Register link */}
        <p className="text-center text-sm text-white/50">
          Don&apos;t have an account?{' '}
          <Link to="/register" className="text-primary-500 hover:brightness-110 font-bold transition-all ml-1">
            Create one free
          </Link>
        </p>
      </div>
    </div>
  )
}
