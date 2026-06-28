// ============================================================
// BakBak Chat - Call State (Zustand Store)
// File: frontend/src/store/callStore.js
// Manages WebRTC call state and logs call history.
// ============================================================

import { create } from 'zustand'
import api from '@/lib/axios'

/**
 * Call status lifecycle:
 * idle -> ringing -> connected -> ended -> idle
 * idle -> incoming -> connected -> ended -> idle
 */
const useCallStore = create((set, get) => ({
  // ── State ──────────────────────────────────────────────────
  callStatus: 'idle', // 'idle' | 'ringing' | 'incoming' | 'connected' | 'ended'
  callType: null,     // 'audio' | 'video'
  remoteUserId: null,
  remoteUserName: '',
  remoteUserAvatar: '',
  localStream: null,
  remoteStream: null,
  isMuted: false,
  isCameraOff: false,
  callStartTime: null,
  currentCallLogId: null,
  callHistory: [],
  loadingHistory: false,

  // ── Actions ────────────────────────────────────────────────

  /** Fetch call history logs from server */
  fetchCallHistory: async () => {
    set({ loadingHistory: true })
    try {
      const res = await api.get('/calls')
      set({ callHistory: res.data?.data || [] })
    } catch (err) {
      console.error('Failed to fetch call history:', err)
    } finally {
      set({ loadingHistory: false })
    }
  },

  /** Outgoing call initiated */
  startCall: async (remoteUserId, remoteUserName, remoteUserAvatar, callType) => {
    set({
      callStatus: 'ringing',
      callType,
      remoteUserId,
      remoteUserName,
      remoteUserAvatar,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
      currentCallLogId: null
    })

    // Log the outgoing call session as initial 'missed'
    try {
      const res = await api.post('/calls', { receiverId: remoteUserId, callType, status: 'missed' })
      set({ currentCallLogId: res.data?.data?._id })
    } catch (err) {
      console.warn('Failed to register call log on backend:', err.message)
    }
  },

  /** Incoming call received */
  receiveCall: (fromId, fromName, fromAvatar, callType) => {
    set({
      callStatus: 'incoming',
      callType,
      remoteUserId: fromId,
      remoteUserName: fromName,
      remoteUserAvatar: fromAvatar,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
      currentCallLogId: null // Callee doesn't create the log, only caller does
    })
  },

  /** Call connected (both sides have media) */
  connectCall: async () => {
    set({
      callStatus: 'connected',
      callStartTime: Date.now(),
    })

    // Caller updates call log to 'connected'
    const logId = get().currentCallLogId
    if (logId) {
      try {
        await api.patch(`/calls/${logId}`, { status: 'connected' })
      } catch (err) {
        console.warn('Failed to update call status to connected:', err.message)
      }
    }
  },

  /** Set media streams */
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  /** Toggle mute */
  setMuted: (muted) => set({ isMuted: muted }),

  /** Toggle camera */
  setCameraOff: (off) => set({ isCameraOff: off }),

  /** End/Reset call */
  resetCall: async () => {
    const logId = get().currentCallLogId
    const startTime = get().callStartTime

    // Caller updates call duration
    if (logId) {
      const duration = startTime ? Math.floor((Date.now() - startTime) / 1000) : 0
      try {
        await api.patch(`/calls/${logId}`, { duration })
      } catch (err) {
        console.warn('Failed to save call duration:', err.message)
      }
    }

    set({
      callStatus: 'idle',
      callType: null,
      remoteUserId: null,
      remoteUserName: '',
      remoteUserAvatar: '',
      localStream: null,
      remoteStream: null,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
      currentCallLogId: null
    })

    // Automatically refresh history after call reset
    get().fetchCallHistory()
  },
}))

export default useCallStore
