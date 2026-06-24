// ============================================================
// BakBak Chat - Call State (Zustand Store)
// File: frontend/src/store/callStore.js
// Manages WebRTC call state for voice/video calls.
// ============================================================

import { create } from 'zustand'

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

  // ── Actions ────────────────────────────────────────────────

  /** Outgoing call initiated */
  startCall: (remoteUserId, remoteUserName, remoteUserAvatar, callType) => {
    set({
      callStatus: 'ringing',
      callType,
      remoteUserId,
      remoteUserName,
      remoteUserAvatar,
      isMuted: false,
      isCameraOff: false,
      callStartTime: null,
    })
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
    })
  },

  /** Call connected (both sides have media) */
  connectCall: () => {
    set({
      callStatus: 'connected',
      callStartTime: Date.now(),
    })
  },

  /** Set media streams */
  setLocalStream: (stream) => set({ localStream: stream }),
  setRemoteStream: (stream) => set({ remoteStream: stream }),

  /** Toggle mute */
  setMuted: (muted) => set({ isMuted: muted }),

  /** Toggle camera */
  setCameraOff: (off) => set({ isCameraOff: off }),

  /** End/Reset call */
  resetCall: () => {
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
    })
  },
}))

export default useCallStore
