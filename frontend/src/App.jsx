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
import { connectSocket, getSocket } from '@/lib/socket'
import { LocalNotifications } from '@capacitor/local-notifications'
import { initTheme } from '@/lib/theme'

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

import { App as CapApp } from '@capacitor/app'
import { useNavigate } from 'react-router-dom'

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
  const navigate = useNavigate()
  const token = useAuthStore((s) => s.token)

  // Hardware Back Button Listener (Android)
  useEffect(() => {
    const handleBackButton = () => {
      // Dispatches a custom event to let active pages handle it first
      const backEvent = new CustomEvent('appBackButton', { cancelable: true })
      window.dispatchEvent(backEvent)

      if (backEvent.defaultPrevented) {
        // Handled by active page/modal
        return
      }

      // If we are at the root or main tabs, exit the app
      if (
        location.pathname === '/' ||
        location.pathname === '/login' ||
        location.pathname === '/chat'
      ) {
        CapApp.exitApp()
      } else {
        // Otherwise, navigate back in history
        navigate(-1)
      }
    }

    const listener = CapApp.addListener('backButton', handleBackButton)

    return () => {
      listener.then((l) => l.remove())
    }
  }, [location.pathname, navigate])

  // Initialize Socket on boot if already authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const socket = connectSocket(token)

    // Reconnect socket when app returns to foreground
    const handleStateChange = ({ isActive }) => {
      if (isActive) {
        console.log('📱 App resumed, checking socket connection...')
        if (socket && !socket.connected) {
          console.log('🔄 Socket disconnected on resume, reconnecting...')
          socket.connect()
        }
      }
    }

    const listener = CapApp.addListener('appStateChange', handleStateChange)

    return () => {
      listener.then((l) => l.remove())
    }
  }, [isAuthenticated, token])

  // Register for push notifications when authenticated
  useEffect(() => {
    if (!isAuthenticated || !token) return

    let pushListeners = []

    const setupPushNotifications = async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications')
        
        let perm = await PushNotifications.checkPermissions()
        if (perm.receive === 'prompt') {
          perm = await PushNotifications.requestPermissions()
        }

        if (perm.receive === 'granted') {
          await PushNotifications.register()

          const regListener = await PushNotifications.addListener('registration', async (t) => {
            console.log('📱 Push token registered:', t.value)
            try {
              const { default: api } = await import('@/lib/axios')
              await api.post('/users/fcm-token', { fcmToken: t.value })
            } catch (err) {
              console.warn('Failed to upload FCM token to backend:', err.message)
            }
          })
          pushListeners.push(regListener)

          const regErrListener = await PushNotifications.addListener('registrationError', (err) => {
            console.error('Push registration error:', err)
          })
          pushListeners.push(regErrListener)

          const recListener = await PushNotifications.addListener('pushNotificationReceived', async (notification) => {
            console.log('📩 Push notification received:', notification)
            const { data } = notification
            if (data && data.type === 'call' && data.offer) {
              // Trigger incoming call UI
              window.__bakbak_incoming_offer = JSON.parse(data.offer)
              const useCallStore = (await import('@/store/callStore')).default
              useCallStore.getState().receiveCall(
                data.from,
                data.fromName,
                data.fromAvatar,
                data.callType
              )
            }
          })
          pushListeners.push(recListener)

          const actListener = await PushNotifications.addListener('pushNotificationActionPerformed', async (action) => {
            console.log('⚡ Push notification action performed:', action)
            const { actionId, notification } = action
            const data = notification.data

            if (data && data.type === 'call' && data.offer) {
              const offer = JSON.parse(data.offer)
              if (actionId === 'accept') {
                window.__bakbak_incoming_offer = offer
                window.__bakbak_auto_accept_call = true
                
                const useCallStore = (await import('@/store/callStore')).default
                useCallStore.getState().receiveCall(
                  data.from,
                  data.fromName,
                  data.fromAvatar,
                  data.callType
                )
              } else if (actionId === 'decline') {
                const { getSocket } = await import('@/lib/socket')
                const socket = getSocket()
                if (socket) {
                  socket.emit('call:reject', { to: data.from })
                }
                const useCallStore = (await import('@/store/callStore')).default
                useCallStore.getState().resetCall()
              }
            }
          })
          pushListeners.push(actListener)
        }
      } catch (err) {
        console.warn('Push Notifications registration failed or not supported in this client:', err)
      }
    }

    setupPushNotifications()

    return () => {
      pushListeners.forEach(listener => {
        if (listener && typeof listener.remove === 'function') {
          listener.remove()
        }
      })
    }
  }, [isAuthenticated, token])

  // Initialize notifications channel and action handlers on boot
  useEffect(() => {
    const setupNotificationChannel = async () => {
      try {
        const perm = await LocalNotifications.checkPermissions()
        if (perm.display === 'prompt') {
          await LocalNotifications.requestPermissions()
        }
        
        // Create high priority channel for heads-up banners on Android
        await LocalNotifications.createChannel({
          id: 'bakbak-chat-messages',
          name: 'Chat Messages',
          description: 'Incoming messages and call notifications',
          importance: 5, // Max importance (heads-up banner and sound)
          visibility: 1, // Public
          vibration: true,
          lights: true
        })

        // Register action buttons (Accept/Decline) for call notifications
        await LocalNotifications.registerActionTypes({
          types: [
            {
              id: 'CALL_ACTIONS',
              actions: [
                {
                  id: 'accept',
                  title: 'Accept',
                  foreground: true,
                },
                {
                  id: 'decline',
                  title: 'Decline',
                  destructive: true,
                  foreground: true,
                }
              ]
            }
          ]
        })
      } catch (err) {
        console.warn('Local notifications channel creation failed:', err)
      }
    }

    setupNotificationChannel()
    initTheme()
    import('@/services/syncQueue').then(({ syncQueue }) => syncQueue.init())

    // Listen for notification action performance (Accept/Decline button clicks)
    const actionListener = LocalNotifications.addListener(
      'localNotificationActionPerformed',
      async (notificationAction) => {
        const { actionId, notification } = notificationAction
        const extra = notification.extra

        if (!extra || !extra.from) return

        if (actionId === 'accept') {
          console.log('📞 Accept call action triggered from notification tray:', extra)
          window.__bakbak_incoming_offer = extra.offer
          window.__bakbak_auto_accept_call = true
          
          const useCallStore = (await import('@/store/callStore')).default
          useCallStore.getState().receiveCall(
            extra.from,
            extra.fromName,
            extra.fromAvatar,
            extra.callType
          )
        } else if (actionId === 'decline') {
          console.log('❌ Decline call action triggered from notification tray:', extra)
          const { getSocket } = await import('@/lib/socket')
          const socket = getSocket()
          if (socket) {
            socket.emit('call:reject', { to: extra.from })
          }
          const useCallStore = (await import('@/store/callStore')).default
          useCallStore.getState().resetCall()
        }
      }
    )

    return () => {
      actionListener.then((l) => l.remove())
    }
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
        <Route path="/" element={<GuestRoute><LandingPage /></GuestRoute>} />

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
