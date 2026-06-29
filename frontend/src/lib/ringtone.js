// ============================================================
// BakBak Chat - Ringtone Synthesizer
// File: frontend/src/lib/ringtone.js
// Uses Web Audio API to generate zero-asset digital ringtones.
// ============================================================

let audioCtx = null
let ringInterval = null

/**
 * Start playing the incoming call ringtone
 */
export function startRingtone() {
  if (ringInterval) return
  console.log('🎵 [Ringtone] Starting ringtone...')

  try {
    const AudioContext = window.AudioContext || window.webkitAudioContext
    audioCtx = new AudioContext()

    const playSingleRing = () => {
      if (!audioCtx || audioCtx.state === 'closed') return

      // Resume context if suspended by browser autoplay policy
      if (audioCtx.state === 'suspended') {
        audioCtx.resume().catch(err => console.warn('Failed to resume AudioContext:', err))
      }

      const now = audioCtx.currentTime

      // Create two oscillators to blend tones for a professional phone ring
      const osc1 = audioCtx.createOscillator()
      const osc2 = audioCtx.createOscillator()
      const gainNode = audioCtx.createGain()

      osc1.type = 'sine'
      osc2.type = 'triangle'

      // Standard multi-frequency ring tone combination (e.g. 850 Hz and 440 Hz)
      osc1.frequency.setValueAtTime(850, now)
      osc2.frequency.setValueAtTime(440, now)

      osc1.connect(gainNode)
      osc2.connect(gainNode)
      gainNode.connect(audioCtx.destination)

      // Double-pulse ring envelope (ring-pause-ring-long pause)
      // Pulse 1: 0.0s to 0.45s
      gainNode.gain.setValueAtTime(0, now)
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.05)
      gainNode.gain.setValueAtTime(0.15, now + 0.4)
      gainNode.gain.linearRampToValueAtTime(0, now + 0.45)

      // Pulse 2: 0.6s to 1.05s
      gainNode.gain.setValueAtTime(0, now + 0.55)
      gainNode.gain.linearRampToValueAtTime(0.15, now + 0.6)
      gainNode.gain.setValueAtTime(0.15, now + 1.0)
      gainNode.gain.linearRampToValueAtTime(0, now + 1.05)

      osc1.start(now)
      osc2.start(now)

      osc1.stop(now + 1.15)
      osc2.stop(now + 1.15)
    }

    // Play first ring immediately, then repeat every 3 seconds
    playSingleRing()
    ringInterval = setInterval(playSingleRing, 3000)
  } catch (err) {
    console.warn('Failed to initialize AudioContext for ringtone:', err)
  }
}

/**
 * Stop the incoming call ringtone
 */
export function stopRingtone() {
  console.log('🎵 [Ringtone] Stopping ringtone...')
  if (ringInterval) {
    clearInterval(ringInterval)
    ringInterval = null
  }
  if (audioCtx) {
    try {
      audioCtx.close()
    } catch (err) {
      console.warn('Error closing AudioContext:', err)
    }
    audioCtx = null
  }
}
