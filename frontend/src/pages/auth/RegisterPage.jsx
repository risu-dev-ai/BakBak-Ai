// ============================================================
// BakBak Chat - Register Page (Premium Dark Glassmorphic Theme)
// File: frontend/src/pages/auth/RegisterPage.jsx
// ============================================================

import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import authService from '@/services/authService'
import userService from '@/services/userService'
import useAuthStore from '@/store/authStore'
import { connectSocket } from '@/lib/socket'
import { generateKeyPair } from '@/lib/crypto'
import Input from '@/components/ui/Input'
import Logo from '@/components/ui/Logo'

const steps = ['Account', 'Profile', 'Security']

export default function RegisterPage() {
  const navigate = useNavigate()
  const { setAuth } = useAuthStore()
  const [currentStep, setCurrentStep] = useState(0)
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    username: '', email: '', phone: '',
    displayName: '', password: '', confirmPassword: '',
  })
  const [errors, setErrors] = useState({})

  // OTP Verification states
  const [showOtpScreen, setShowOtpScreen] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpEmail, setOtpEmail] = useState('')
  const [otpLoading, setOtpLoading] = useState(false)

  const handleChange = (e) => {
    const { name, value } = e.target
    setForm((p) => ({ ...p, [name]: value }))
    if (errors[name]) setErrors((p) => ({ ...p, [name]: '' }))
  }

  const validateStep = (step) => {
    const errs = {}
    if (step === 0) {
      if (!form.username.trim()) errs.username = 'Username is required.'
      else if (form.username.length < 3) errs.username = 'Username must be at least 3 characters.'
      else if (!/^[a-z0-9._]+$/i.test(form.username)) errs.username = 'Only letters, numbers, dots, underscores.'

      if (!form.email.trim()) errs.email = 'Email is required.'
      else if (!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Please enter a valid email.'

      if (form.phone && !/^\+?[0-9]{10,15}$/.test(form.phone.replace(/\s/g, ''))) {
        errs.phone = 'Enter a valid phone number (e.g. +919876543210).'
      }
    }
    if (step === 1) {
      if (form.displayName && form.displayName.length > 50) {
        errs.displayName = 'Display name max 50 characters.'
      }
    }
    if (step === 2) {
      if (!form.password) errs.password = 'Password is required.'
      else if (form.password.length < 8) errs.password = 'Minimum 8 characters.'
      else if (!/[A-Z]/.test(form.password)) errs.password = 'Include at least one uppercase letter.'
      else if (!/[0-9]/.test(form.password)) errs.password = 'Include at least one number.'

      if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password.'
      else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match.'
    }
    return errs
  }

  const handleNext = () => {
    const errs = validateStep(currentStep)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }
    setCurrentStep((s) => s + 1)
  }

  const handleBack = () => setCurrentStep((s) => s - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const errs = validateStep(2)
    if (Object.keys(errs).length > 0) { setErrors(errs); return }

    setLoading(true)
    try {
      const payload = {
        username: form.username.toLowerCase().trim(),
        email: form.email.toLowerCase().trim(),
        password: form.password,
        displayName: form.displayName.trim() || form.username,
        ...(form.phone.trim() ? { phone: form.phone.trim() } : {}),
      }

      const data = await authService.register(payload)
      setOtpEmail(payload.email)
      setShowOtpScreen(true)
      toast.success('Registration pending verification. Verification code sent to email.')
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || 'Registration failed. Please try again.'
      toast.error(msg)
      if (msg.toLowerCase().includes('email') || msg.toLowerCase().includes('username')) {
        setCurrentStep(0)
      }
    } finally {
      setLoading(false)
    }
  }

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

      // E2EE key setup
      try {
        const publicKeyStr = await generateKeyPair()
        await userService.savePublicKey(publicKeyStr)
        useAuthStore.getState().updateUser({ publicKey: publicKeyStr })
        useAuthStore.getState().setE2EEReady(true)
      } catch (e2eeErr) {
        console.warn('E2EE key setup failed (non-blocking):', e2eeErr)
      }

      toast.success('Account created and verified successfully! 🎉')
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
      toast.success('Verification code resent!')
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
        <div className="text-center mb-6">
          <Logo size={56} variant="gradient" className="mb-3 filter drop-shadow-lg" />
          <h1 className="text-2xl font-display font-bold text-white tracking-tight">Create Account</h1>
          <p className="text-white/40 text-xs mt-1.5 font-medium uppercase tracking-wider">Premium E2EE Chat client</p>
        </div>

        {!showOtpScreen ? (
          <>
            {/* Step Indicator */}
            <div className="flex items-center justify-between mb-8 px-2">
              {steps.map((step, i) => (
                <React.Fragment key={step}>
                  <div className="flex flex-col items-center gap-1">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-300 ${
                      i < currentStep ? 'bg-primary-500 text-wa-teal-dark' :
                      i === currentStep ? 'bg-primary-500/20 border-2 border-primary-500 text-primary-500' :
                      'bg-white/5 text-white/40'
                    }`}>
                      {i < currentStep ? (
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : i + 1}
                    </div>
                    <span className={`text-[10px] uppercase font-bold tracking-wider ${i === currentStep ? 'text-primary-500' : 'text-white/30'}`}>{step}</span>
                  </div>
                  {i < steps.length - 1 && (
                    <div className={`flex-1 h-[1px] mx-2 transition-all duration-300 ${i < currentStep ? 'bg-primary-500' : 'bg-white/10'}`} />
                  )}
                </React.Fragment>
              ))}
            </div>

            {/* Step Forms */}
            <form onSubmit={handleSubmit} noValidate>
              {currentStep === 0 && (
                <div className="space-y-4 animate-fade-in">
                  <Input id="username" name="username" label="Username" placeholder="bakbak_user" value={form.username} onChange={handleChange} error={errors.username} hint="Letters, numbers, dots, underscores only" className="bg-white/5 border-white/10 text-white" />
                  <Input id="email" name="email" type="email" label="Email Address" placeholder="you@example.com" value={form.email} onChange={handleChange} error={errors.email} className="bg-white/5 border-white/10 text-white" required />
                  <Input id="phone" name="phone" type="tel" label="Phone Number" placeholder="+91 98765 43210" value={form.phone} onChange={handleChange} error={errors.phone} hint="Optional — for recovery" className="bg-white/5 border-white/10 text-white" />
                </div>
              )}

              {currentStep === 1 && (
                <div className="space-y-4 animate-fade-in">
                  <div className="text-center py-2">
                    <div className="w-20 h-20 mx-auto rounded-full bg-gradient-to-br from-primary-500 to-wa-blue flex items-center justify-center mb-3 shadow-glass-glow">
                      <span className="text-3xl font-bold text-white">
                        {(form.displayName || form.username || '?').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <p className="text-white/40 text-xs">You can upload a photo after signup</p>
                  </div>
                  <Input id="displayName" name="displayName" label="Display Name" placeholder={form.username || 'Your name'} value={form.displayName} onChange={handleChange} error={errors.displayName} hint="This is how others see you" className="bg-white/5 border-white/10 text-white" />
                </div>
              )}

              {currentStep === 2 && (
                <div className="space-y-4 animate-fade-in">
                  <Input id="password" name="password" type="password" label="Password" placeholder="Min 8 chars, uppercase + number" value={form.password} onChange={handleChange} error={errors.password} className="bg-white/5 border-white/10 text-white" required />
                  <Input id="confirmPassword" name="confirmPassword" type="password" label="Confirm Password" placeholder="Re-enter your password" value={form.confirmPassword} onChange={handleChange} error={errors.confirmPassword} className="bg-white/5 border-white/10 text-white" required />
                </div>
              )}

              {/* Navigation Buttons */}
              <div className={`flex gap-3 mt-7 ${currentStep > 0 ? 'justify-between' : 'justify-end'}`}>
                {currentStep > 0 && (
                  <button type="button" onClick={handleBack} className="flex-1 py-3 px-4 border border-white/10 text-white/70 font-semibold rounded-xl hover:bg-white/5 active:scale-[0.98] transition-all">
                    ← Back
                  </button>
                )}

                {currentStep < steps.length - 1 ? (
                  <button type="button" onClick={handleNext} className="flex-1 py-3 px-4 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark font-bold rounded-xl active:scale-[0.98] transition-all shadow-glass-glow">
                    Continue →
                  </button>
                ) : (
                  <button type="submit" disabled={loading} className="flex-1 py-3 px-4 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark font-bold rounded-xl active:scale-[0.98] transition-all shadow-glass-glow disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? (
                      <>
                        <svg className="animate-spin h-5 w-5 text-wa-teal-dark" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creating...
                      </>
                    ) : 'Register Account'}
                  </button>
                )}
              </div>
            </form>
          </>
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
                ) : 'Verify & Register'}
              </button>

              <div className="flex items-center justify-between text-xs px-1">
                <button
                  type="button"
                  onClick={() => setShowOtpScreen(false)}
                  className="text-white/40 hover:text-white transition-colors"
                >
                  ← Edit Details
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

        {/* Login link */}
        <p className="text-center text-sm text-white/50">
          Already have an account?{' '}
          <Link to="/login" className="text-primary-500 hover:brightness-110 font-bold transition-all ml-1">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
