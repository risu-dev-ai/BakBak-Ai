// ============================================================
// BakBak Chat - WebRTC Utility
// File: frontend/src/lib/webrtc.js
// Manages RTCPeerConnection for voice/video calls.
// ============================================================

const ICE_SERVERS = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
]

let peerConnection = null
let localStream = null
let remoteStream = null

/**
 * Get user media (camera and/or microphone)
 * @param {'audio' | 'video'} callType
 * @returns {MediaStream}
 */
export async function getUserMedia(callType = 'audio') {
  const constraints = {
    audio: {
      echoCancellation: true,
      noiseSuppression: true,
      autoGainControl: true,
    },
    video: callType === 'video' ? {
      width: { ideal: 1280 },
      height: { ideal: 720 },
      facingMode: 'user',
    } : false,
  }

  localStream = await navigator.mediaDevices.getUserMedia(constraints)
  return localStream
}

/**
 * Create a new RTCPeerConnection
 * @param {Function} onIceCandidate - Called with each ICE candidate
 * @param {Function} onTrack - Called when remote track is received
 * @returns {RTCPeerConnection}
 */
export function createPeerConnection(onIceCandidate, onTrack, iceServers = ICE_SERVERS) {
  peerConnection = new RTCPeerConnection({
    iceServers: iceServers || ICE_SERVERS,
  })

  // Send ICE candidates to the remote peer via signaling
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      onIceCandidate(event.candidate)
    }
  }

  // Receive remote media tracks
  peerConnection.ontrack = (event) => {
    remoteStream = event.streams[0]
    onTrack(remoteStream)
  }

  // Connection state logging
  peerConnection.oniceconnectionstatechange = () => {
    console.log('ICE state:', peerConnection.iceConnectionState)
  }

  peerConnection.onconnectionstatechange = () => {
    console.log('Connection state:', peerConnection.connectionState)
  }

  // Add local tracks to the connection
  if (localStream) {
    localStream.getTracks().forEach((track) => {
      peerConnection.addTrack(track, localStream)
    })
  }

  return peerConnection
}

/**
 * Create an SDP offer (caller side)
 * @returns {RTCSessionDescriptionInit}
 */
export async function createOffer() {
  if (!peerConnection) throw new Error('No peer connection')
  const offer = await peerConnection.createOffer()
  await peerConnection.setLocalDescription(offer)
  return offer
}

/**
 * Create an SDP answer (callee side)
 * @param {RTCSessionDescriptionInit} offer
 * @returns {RTCSessionDescriptionInit}
 */
export async function createAnswer(offer) {
  if (!peerConnection) throw new Error('No peer connection')
  await peerConnection.setRemoteDescription(new RTCSessionDescription(offer))
  const answer = await peerConnection.createAnswer()
  await peerConnection.setLocalDescription(answer)
  return answer
}

/**
 * Set the remote SDP answer (caller side, after receiving answer)
 * @param {RTCSessionDescriptionInit} answer
 */
export async function setRemoteAnswer(answer) {
  if (!peerConnection) return
  await peerConnection.setRemoteDescription(new RTCSessionDescription(answer))
}

/**
 * Add a received ICE candidate
 * @param {RTCIceCandidateInit} candidate
 */
export async function addIceCandidate(candidate) {
  if (!peerConnection) return
  try {
    await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
  } catch (err) {
    console.warn('Failed to add ICE candidate:', err)
  }
}

/**
 * Toggle microphone mute/unmute
 * @returns {boolean} New muted state
 */
export function toggleMute() {
  if (!localStream) return false
  const audioTrack = localStream.getAudioTracks()[0]
  if (audioTrack) {
    audioTrack.enabled = !audioTrack.enabled
    return !audioTrack.enabled // true = muted
  }
  return false
}

/**
 * Toggle camera on/off
 * @returns {boolean} New camera-off state
 */
export function toggleCamera() {
  if (!localStream) return false
  const videoTrack = localStream.getVideoTracks()[0]
  if (videoTrack) {
    videoTrack.enabled = !videoTrack.enabled
    return !videoTrack.enabled // true = camera off
  }
  return false
}

/**
 * End the call — cleanup everything
 */
export function endCall() {
  if (localStream) {
    localStream.getTracks().forEach((track) => track.stop())
    localStream = null
  }
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  remoteStream = null
}

/**
 * Get current streams
 */
export function getLocalStream() {
  return localStream
}

export function getRemoteStream() {
  return remoteStream
}

export function getPeerConnection() {
  return peerConnection
}
