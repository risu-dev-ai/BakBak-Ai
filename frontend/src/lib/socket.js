// ============================================================
// BakBak Chat - Socket.io Client
// File: frontend/src/lib/socket.js
// ============================================================

import { io } from 'socket.io-client'

let socket = null

/**
 * Initialize and return a Socket.io connection.
 * Call this ONCE after the user is authenticated.
 * @param {string} token - JWT token
 */
export const connectSocket = (token) => {
  if (socket) {
    if (socket.auth) {
      socket.auth.token = token
    } else {
      socket.auth = { token }
    }
    if (!socket.connected) {
      socket.connect()
    }
    return socket
  }

  socket = io(import.meta.env.VITE_SOCKET_URL || '/', {
    auth: { token },
    transports: ['websocket'],
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1000,
    reconnectionDelayMax: 5000,
  })

  let heartbeatInterval = null

  socket.on('connect', () => {
    console.log('🔌 Socket connected:', socket.id)
    if (heartbeatInterval) clearInterval(heartbeatInterval)
    heartbeatInterval = setInterval(() => {
      if (socket?.connected) {
        socket.emit('heartbeat', { ts: Date.now() })
      }
    }, 15000)
  })

  socket.on('connect_error', (err) => {
    console.error('Socket connection error:', err.message)
  })

  socket.on('disconnect', (reason) => {
    console.log('❌ Socket disconnected:', reason)
    if (heartbeatInterval) {
      clearInterval(heartbeatInterval)
      heartbeatInterval = null
    }
  })

  return socket
}

/**
 * Disconnect the socket (called on logout)
 */
export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect()
    socket = null
  }
}

/**
 * Get the current socket instance.
 * Returns null if not connected.
 */
export const getSocket = () => socket

export default socket
