// ============================================================
// BakBak Chat - Call Overlay Component
// File: frontend/src/components/call/CallOverlay.jsx
// Full-screen overlay for incoming, outgoing, and active calls.
// ============================================================

import React, { useEffect, useRef, useState } from 'react'
import useCallStore from '@/store/callStore'
import { getSocket, connectSocket } from '@/lib/socket'
import useAuthStore from '@/store/authStore'
import api from '@/lib/axios'
import { Capacitor } from '@capacitor/core'
import {
  getUserMedia,
  createPeerConnection,
  createOffer,
  createAnswer,
  setRemoteAnswer,
  addIceCandidate,
  toggleMute,
  toggleCamera,
  endCall as endWebRTC,
} from '@/lib/webrtc'
import { startRingtone, stopRingtone } from '@/lib/ringtone'

export default function CallOverlay() {
  const {
    callStatus,
    callType,
    remoteUserId,
    remoteUserName,
    remoteUserAvatar,
    localStream,
    remoteStream,
    isMuted,
    isCameraOff,
    callStartTime,
    startCall,
    receiveCall,
    connectCall,
    setLocalStream,
    setRemoteStream,
    setMuted,
    setCameraOff,
    resetCall,
  } = useCallStore()

  const { isAuthenticated, token } = useAuthStore()

  const localVideoRef = useRef(null)
  const remoteVideoRef = useRef(null)
  const [elapsed, setElapsed] = useState('00:00')

  // Log callStatus transitions for diagnostic tracing
  useEffect(() => {
    console.log('🔄 [CallOverlay] callStatus transitioned to:', callStatus, 'with callType:', callType, 'and remoteUserId:', remoteUserId)
  }, [callStatus, callType, remoteUserId])

  // Play ringtone on incoming call
  useEffect(() => {
    if (callStatus === 'incoming') {
      startRingtone()
    } else {
      stopRingtone()
    }

    return () => {
      stopRingtone()
    }
  }, [callStatus])

  // Timer for call duration
  useEffect(() => {
    if (callStatus !== 'connected' || !callStartTime) return
    const interval = setInterval(() => {
      const secs = Math.floor((Date.now() - callStartTime) / 1000)
      const m = String(Math.floor(secs / 60)).padStart(2, '0')
      const s = String(secs % 60).padStart(2, '0')
      setElapsed(`${m}:${s}`)
    }, 1000)
    return () => clearInterval(interval)
  }, [callStatus, callStartTime])

  // Listen for socket events
  useEffect(() => {
    if (!isAuthenticated || !token) return

    const socket = getSocket() || connectSocket(token)
    if (!socket) return

    // Incoming call
    const handleIncoming = async ({ from, fromName, fromAvatar, offer, callType: ct }) => {
      console.log('📞 [CallOverlay] Socket call:incoming received from:', from, 'name:', fromName, 'type:', ct)
      // Store the offer for later use when accepting
      window.__bakbak_incoming_offer = offer
      receiveCall(from, fromName, fromAvatar, ct)
      
      if (Capacitor.isNativePlatform()) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          let permStatus = await LocalNotifications.checkPermissions()
          if (permStatus.display !== 'granted') {
            permStatus = await LocalNotifications.requestPermissions()
          }
          if (permStatus.display === 'granted') {
            console.log('📞 [CallOverlay] Scheduling local notification for incoming call')
            await LocalNotifications.schedule({
              notifications: [
                {
                  title: 'Incoming Call',
                  body: `${fromName || 'Someone'} is calling you`,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 100) },
                  channelId: 'bakbak-chat-messages',
                  actionTypeId: 'CALL_ACTIONS',
                  extra: {
                    from,
                    fromName,
                    fromAvatar,
                    callType: ct,
                    offer
                  }
                },
              ],
            })
          }
        } catch (err) {
          console.warn('Local Notifications not available:', err)
        }
      }
    }

    // Remote answered our call
    const handleAnswer = async ({ answer }) => {
      console.log('📞 [CallOverlay] Socket call:answer received')
      try {
        await setRemoteAnswer(answer)
        console.log('📞 [CallOverlay] Remote description set successfully, calling connectCall()')
        connectCall()
      } catch (err) {
        console.error('📞 [CallOverlay] Failed to set remote answer:', err)
      }
    }

    // ICE candidate from remote
    const handleIce = async ({ candidate }) => {
      console.log('📞 [CallOverlay] Socket call:ice-candidate received')
      try {
        await addIceCandidate(candidate)
      } catch (err) {
        console.error('📞 [CallOverlay] Failed to add ICE candidate:', err)
      }
    }

    // Remote ended the call
    const handleEnded = () => {
      console.log('📞 [CallOverlay] Socket call:ended received')
      handleEndCall()
    }

    // Remote rejected the call
    const handleRejected = () => {
      console.log('📞 [CallOverlay] Socket call:rejected received')
      const logId = useCallStore.getState().currentCallLogId
      if (logId) {
        api.patch(`/calls/${logId}`, { status: 'rejected' }).catch(err => console.warn(err))
      }
      handleEndCall()
    }

    socket.on('call:incoming', handleIncoming)
    socket.on('call:answer', handleAnswer)
    socket.on('call:ice-candidate', handleIce)
    socket.on('call:ended', handleEnded)
    socket.on('call:rejected', handleRejected)

    return () => {
      socket.off('call:incoming', handleIncoming)
      socket.off('call:answer', handleAnswer)
      socket.off('call:ice-candidate', handleIce)
      socket.off('call:ended', handleEnded)
      socket.off('call:rejected', handleRejected)
    }
  }, [isAuthenticated, token])

  // Attach local stream to video element
  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream
    }
  }, [callStatus, localStream])

  // Attach remote stream to video/audio element
  useEffect(() => {
    if (remoteVideoRef.current && remoteStream) {
      remoteVideoRef.current.srcObject = remoteStream
    }
  }, [callStatus, remoteStream])

  // Auto-accept call if triggered from notification tray action
  useEffect(() => {
    if (callStatus === 'incoming' && window.__bakbak_auto_accept_call) {
      window.__bakbak_auto_accept_call = false
      console.log('🔄 Auto-accepting call from notification tray action...')
      handleAccept()
    }
  }, [callStatus])

  // ── NAT Traversal (TURN Server) helper ─────────────────────
  const iceServersRef = useRef(null)

  const getIceServers = async () => {
    if (iceServersRef.current) return iceServersRef.current
    try {
      const res = await api.get('/calls/ice-servers')
      if (res.data?.success) {
        iceServersRef.current = res.data.iceServers
        return res.data.iceServers
      }
    } catch (err) {
      console.warn('Failed to fetch ICE servers:', err)
    }
    return null
  }

  // ── Initiate outgoing call ──────────────────────────────────
  useEffect(() => {
    if (callStatus !== 'ringing') return

    const initCall = async () => {
      try {
        const socket = getSocket()
        const stream = await getUserMedia(callType)
        setLocalStream(stream)

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream
        }

        const iceServers = await getIceServers()

        createPeerConnection(
          (candidate) => socket.emit('call:ice-candidate', { to: remoteUserId, candidate }),
          (remStream) => {
            setRemoteStream(remStream)
            if (remoteVideoRef.current) {
              remoteVideoRef.current.srcObject = remStream
            }
            connectCall()
          },
          iceServers
        )

        const offer = await createOffer()
        socket.emit('call:offer', { to: remoteUserId, offer, callType })
      } catch (err) {
        console.error('Failed to start call:', err)
        handleEndCall()
      }
    }

    initCall()
  }, [callStatus === 'ringing'])

  // ── Accept incoming call ───────────────────────────────────
  const handleAccept = async () => {
    try {
      const { requestCallPermissions } = await import('@/lib/webrtc')
      const hasPerms = await requestCallPermissions(callType)
      if (!hasPerms) {
        alert('Microphone and Camera permissions are required to accept calls.')
        handleEndCall()
        return
      }

      const socket = getSocket()
      const stream = await getUserMedia(callType)
      setLocalStream(stream)

      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream
      }

      const iceServers = await getIceServers()

      createPeerConnection(
        (candidate) => socket.emit('call:ice-candidate', { to: remoteUserId, candidate }),
        (remStream) => {
          setRemoteStream(remStream)
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = remStream
          }
        },
        iceServers
      )

      const offer = window.__bakbak_incoming_offer
      const answer = await createAnswer(offer)
      socket.emit('call:answer', { to: remoteUserId, answer })
      connectCall()
      window.__bakbak_incoming_offer = null
    } catch (err) {
      console.error('Failed to accept call:', err)
      handleEndCall()
    }
  }

  // ── Reject incoming call ───────────────────────────────────
  const handleReject = () => {
    const socket = getSocket()
    socket?.emit('call:reject', { to: remoteUserId })
    handleEndCall()
  }

  // ── End call ───────────────────────────────────────────────
  const handleEndCall = () => {
    const socket = getSocket()
    if (remoteUserId && callStatus !== 'idle') {
      socket?.emit('call:end', { to: remoteUserId })
    }
    endWebRTC()
    resetCall()
    setElapsed('00:00')
  }

  // ── Toggle controls ────────────────────────────────────────
  const handleToggleMute = () => {
    const muted = toggleMute()
    setMuted(muted)
  }

  const handleToggleCamera = () => {
    const off = toggleCamera()
    setCameraOff(off)
  }

  // Don't render if idle
  if (callStatus === 'idle') return null

  return (
    <div className="fixed inset-0 flex items-center justify-center" style={{ zIndex: 9999 }}>
      {/* Background */}
      <div className="absolute inset-0 bg-gradient-to-b from-[#0A0516] via-[#0f0a2e] to-[#0A0516]" style={{ zIndex: -1 }} />

      {/* Remote video (full background for video calls) */}
      {callType === 'video' && callStatus === 'connected' && (
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className="absolute inset-0 w-full h-full object-cover"
          style={{ zIndex: 1 }}
        />
      )}

      {/* Content overlay */}
      <div className="relative flex flex-col items-center justify-center w-full h-full" style={{ zIndex: 10 }}>

        {/* ── Incoming Call Screen ─────────────────────────── */}
        {callStatus === 'incoming' && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in">
            {/* Pulsing ring */}
            <div className="relative">
              <div className="absolute inset-0 w-28 h-28 rounded-full bg-primary-500/20 animate-ping" />
              <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-glow overflow-hidden">
                {remoteUserAvatar ? (
                  <img src={remoteUserAvatar} alt="" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-white text-4xl font-display font-bold">
                    {remoteUserName?.[0]?.toUpperCase() || '?'}
                  </span>
                )}
              </div>
            </div>

            <div className="text-center">
              <p className="text-white text-xl font-display font-bold">{remoteUserName}</p>
              <p className="text-white/50 text-sm mt-1">
                Incoming {callType} call...
              </p>
            </div>

            {/* Accept / Reject buttons */}
            <div className="flex items-center gap-8 mt-4">
              <button
                onClick={handleReject}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
              <button
                onClick={handleAccept}
                className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-600 flex items-center justify-center shadow-lg transition-all hover:scale-110 animate-pulse"
              >
                <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* ── Ringing / Outgoing Screen ────────────────────── */}
        {callStatus === 'ringing' && (
          <div className="flex flex-col items-center gap-6 animate-bounce-in">
            <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-glow overflow-hidden">
              {remoteUserAvatar ? (
                <img src={remoteUserAvatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-white text-4xl font-display font-bold">
                  {remoteUserName?.[0]?.toUpperCase() || '?'}
                </span>
              )}
            </div>
            <div className="text-center">
              <p className="text-white text-xl font-display font-bold">{remoteUserName}</p>
              <p className="text-white/50 text-sm mt-1 animate-pulse">Calling...</p>
            </div>
            <button
              onClick={handleEndCall}
              className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg mt-8 transition-all hover:scale-110"
            >
              <svg className="w-7 h-7 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* ── Connected Call Screen ────────────────────────── */}
        {callStatus === 'connected' && (
          <>
            {/* Audio call: show avatar + timer */}
            {callType === 'audio' && (
              <div className="flex flex-col items-center gap-4">
                <div className="w-28 h-28 rounded-full bg-gradient-to-br from-primary-500 to-purple-600 flex items-center justify-center shadow-glow overflow-hidden">
                  {remoteUserAvatar ? (
                    <img src={remoteUserAvatar} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-white text-4xl font-display font-bold">
                      {remoteUserName?.[0]?.toUpperCase() || '?'}
                    </span>
                  )}
                </div>
                <p className="text-white text-lg font-display font-bold">{remoteUserName}</p>
                <p className="text-emerald-400 text-sm font-mono">{elapsed}</p>
              </div>
            )}

            {/* Video call: local preview PiP */}
            {callType === 'video' && (
              <div className="absolute top-4 right-4 w-32 h-44 rounded-2xl overflow-hidden border-2 border-white/20 shadow-glow-sm bg-black">
                <video
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover mirror"
                />
              </div>
            )}

            {/* Timer for video call */}
            {callType === 'video' && (
              <div className="absolute top-6 left-1/2 -translate-x-1/2">
                <div className="px-4 py-1.5 rounded-full bg-black/40 backdrop-blur-sm">
                  <p className="text-emerald-400 text-sm font-mono">{elapsed}</p>
                </div>
              </div>
            )}

            {/* Control buttons */}
            <div className="absolute bottom-12 left-1/2 -translate-x-1/2 flex items-center gap-5">
              {/* Mute */}
              <button
                onClick={handleToggleMute}
                className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                  isMuted ? 'bg-red-500/80' : 'bg-white/10 hover:bg-white/20'
                }`}
              >
                {isMuted ? (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                  </svg>
                ) : (
                  <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                )}
              </button>

              {/* End Call */}
              <button
                onClick={handleEndCall}
                className="w-16 h-16 rounded-full bg-red-500 hover:bg-red-600 flex items-center justify-center shadow-lg transition-all hover:scale-110"
              >
                <svg className="w-7 h-7 text-white transform rotate-135" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>

              {/* Camera toggle (video only) */}
              {callType === 'video' && (
                <button
                  onClick={handleToggleCamera}
                  className={`w-14 h-14 rounded-full flex items-center justify-center transition-all ${
                    isCameraOff ? 'bg-red-500/80' : 'bg-white/10 hover:bg-white/20'
                  }`}
                >
                  {isCameraOff ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  )}
                </button>
              )}
            </div>
          </>
        )}
      </div>

      {/* Hidden audio element for audio-only calls */}
      {callType === 'audio' && (
        <audio ref={remoteVideoRef} autoPlay playsInline className="hidden" />
      )}
    </div>
  )
}
