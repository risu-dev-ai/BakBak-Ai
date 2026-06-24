// ============================================================
// BakBak Chat - Root App Component with Routing
// File: frontend/src/App.jsx
// ============================================================

import React, { Suspense, lazy, useEffect } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import userService from '@/services/userService'
import { hasKeyPair, getStoredPublicKey, generateKeyPair } from '@/lib/crypto'
import useAuthStore from '@/store/authStore'
import useChatStore from '@/store/chatStore'
import PageLoader from '@/components/ui/PageLoader'
import CallOverlay from '@/components/call/CallOverlay'
import BottomNav from '@/components/layout/BottomNav'

// ── Lazy-load pages ───────────────────────────────────────────
const LandingPage    = lazy(() => import('@/pages/LandingPage'))
const LoginPage      = lazy(() => import('@/pages/auth/LoginPage'))
const RegisterPage   = lazy(() => import('@/pages/auth/RegisterPage'))
const ChatPage       = lazy(() => import('@/pages/chat/ChatPage'))
const CallsPage      = lazy(() => import('@/pages/calls/CallsPage'))
const SettingsPage   = lazy(() => import('@/pages/settings/SettingsPage'))
const ProfilePage    = lazy(() => import('@/pages/profile/ProfilePage'))
const AdminPage      = lazy(() => import('@/pages/admin/AdminPage'))
const NotFoundPage   = lazy(() => import('@/pages/NotFoundPage'))

// ── Route Guards ─────────────────────────────────────────────
const ProtectedRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? children : <Navigate to="/login" replace />
}

const AdminRoute = ({ children }) => {
  const { isAuthenticated, user } = useAuthStore()
  if (!isAuthenticated) return <Navigate to="/login" replace />
  if (user?.role !== 'admin') return <Navigate to="/chat" replace />
  return children
}

const GuestRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()
  return isAuthenticated ? <Navigate to="/chat" replace /> : children
}

// ── Bottom Nav Wrapper ───────────────────────────────────────
function BottomNavWrapper() {
  const location = useLocation()
  const { isAuthenticated } = useAuthStore()
  const activeChat = useChatStore((s) => s.activeChat)

  // Show bottom nav on authenticated pages, but NOT when viewing an active chat
  const isAuthPage = ['/chat', '/calls', '/status', '/settings', '/profile'].some(
    path => location.pathname === path || (location.pathname.startsWith(path + '/'))
  )
  const showNav = isAuthenticated && isAuthPage && !activeChat

  return showNav ? <BottomNav /> : null
}

export default function App() {
  const { isAuthenticated, user, updateUser, setE2EEReady } = useAuthStore()

  useEffect(() => {
    import('@/services/syncQueue').then(({ syncQueue }) => syncQueue.init())
  }, [])

  useEffect(() => {
    if (!isAuthenticated || !user) return

    const verifyE2EEKeys = async () => {
      try {
        const profileRes = await userService.getProfile(user._id)
        const serverPublicKeyStr = profileRes.data?.user?.publicKey || ''

        const keysExist = await hasKeyPair()
        const localPublicKeyStr = await getStoredPublicKey()

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
          console.log('🔄 E2EE keys missing or mismatching. Regenerating key pair...')
          const newPublicKeyStr = await generateKeyPair()
          await userService.savePublicKey(newPublicKeyStr)
          updateUser({ publicKey: newPublicKeyStr })
        }
        setE2EEReady(true)
      } catch (err) {
        console.warn('Failed to verify E2EE keys on boot:', err)
      }
    }

    verifyE2EEKeys()
  }, [isAuthenticated, user?._id])

  return (
    <Suspense fallback={<PageLoader />}>
      {/* Global Call Overlay */}
      <CallOverlay />

      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />

        {/* Auth */}
        <Route path="/login"    element={<GuestRoute><LoginPage /></GuestRoute>} />
        <Route path="/register" element={<GuestRoute><RegisterPage /></GuestRoute>} />

        {/* Protected */}
        <Route path="/chat"       element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/chat/:chatId" element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />
        <Route path="/calls"      element={<ProtectedRoute><CallsPage /></ProtectedRoute>} />
        <Route path="/settings"   element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/profile"    element={<ProtectedRoute><ProfilePage /></ProtectedRoute>} />
        <Route path="/status"     element={<ProtectedRoute><ChatPage /></ProtectedRoute>} />

        {/* Admin (Dynamic secret route for extra security) */}
        <Route path={import.meta.env.VITE_ADMIN_PATH || "/secret-admin-gate-9988"} element={<AdminRoute><AdminPage /></AdminRoute>} />

        {/* 404 */}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>

      {/* Bottom Navigation */}
      <BottomNavWrapper />
    </Suspense>
  )
}
