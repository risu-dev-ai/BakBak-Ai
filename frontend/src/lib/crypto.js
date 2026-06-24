// ============================================================
// BakBak Chat - End-to-End Encryption (E2EE) Library
// File: frontend/src/lib/crypto.js
// Uses Web Crypto API (SubtleCrypto) for:
//   - ECDH P-256 key pair generation (identity keys)
//   - AES-GCM 256-bit symmetric encryption/decryption
//   - ECDH shared secret derivation
//   - Key import/export (JWK format)
//   - IndexedDB-based private key persistence
// ============================================================

const DB_NAME = 'bakbak_e2ee'
const DB_VERSION = 1
const STORE_NAME = 'keys'

// ── IndexedDB Helpers ─────────────────────────────────────────

function openDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function idbGet(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readonly')
    const store = tx.objectStore(STORE_NAME)
    const request = store.get(key)
    request.onsuccess = () => resolve(request.result?.value ?? null)
    request.onerror = () => reject(request.error)
  })
}

async function idbPut(key, value) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.put({ id: key, value })
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

async function idbDelete(key) {
  const db = await openDB()
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, 'readwrite')
    const store = tx.objectStore(STORE_NAME)
    const request = store.delete(key)
    request.onsuccess = () => resolve()
    request.onerror = () => reject(request.error)
  })
}

// ── Key Generation ────────────────────────────────────────────

/**
 * Generate an ECDH P-256 key pair for the current user.
 * The private key is stored in IndexedDB (NEVER leaves the device).
 * Returns the public key as a JWK string for upload to the server.
 */
export async function generateKeyPair() {
  const keyPair = await crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,  // extractable (we need to export for storage)
    ['deriveKey', 'deriveBits']
  )

  // Export both keys as JWK
  const publicKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.publicKey)
  const privateKeyJwk = await crypto.subtle.exportKey('jwk', keyPair.privateKey)

  // Store private key securely in IndexedDB
  await idbPut('privateKey', JSON.stringify(privateKeyJwk))
  await idbPut('publicKey', JSON.stringify(publicKeyJwk))

  console.log('🔑 E2EE key pair generated and stored locally.')
  return JSON.stringify(publicKeyJwk)
}

/**
 * Get the stored private key from IndexedDB.
 * Returns a CryptoKey object ready for ECDH derivation.
 */
export async function getPrivateKey() {
  const privateKeyStr = await idbGet('privateKey')
  if (!privateKeyStr) return null

  const jwk = JSON.parse(privateKeyStr)
  return crypto.subtle.importKey(
    'jwk',
    jwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    ['deriveKey', 'deriveBits']
  )
}

/**
 * Get the stored public key string from IndexedDB.
 */
export async function getStoredPublicKey() {
  return idbGet('publicKey')
}

/**
 * Check if a key pair already exists in IndexedDB.
 */
export async function hasKeyPair() {
  const pk = await idbGet('privateKey')
  return pk !== null
}

/**
 * Delete the stored key pair (for logout/reset).
 */
export async function deleteKeyPair() {
  await idbDelete('privateKey')
  await idbDelete('publicKey')
  console.log('🗑️ E2EE key pair deleted from device.')
}

// ── Shared Secret Derivation ──────────────────────────────────

/**
 * Derive a shared AES-GCM-256 key from our private key and the
 * recipient's public key using ECDH key agreement.
 * This shared secret is symmetric — both sides derive the SAME key.
 */
export async function deriveSharedKey(recipientPublicKeyStr) {
  const privateKey = await getPrivateKey()
  if (!privateKey) {
    throw new Error('E2EE private key not found. Please re-generate your keys.')
  }

  const recipientPublicJwk = JSON.parse(recipientPublicKeyStr)
  const recipientPublicKey = await crypto.subtle.importKey(
    'jwk',
    recipientPublicJwk,
    { name: 'ECDH', namedCurve: 'P-256' },
    false,
    []
  )

  // Derive a 256-bit AES-GCM key from the ECDH shared secret
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: recipientPublicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  )
}

// ── Encryption ────────────────────────────────────────────────

/**
 * Encrypt a plaintext string using AES-GCM-256.
 * Returns { ciphertext: base64, iv: base64 }.
 */
export async function encryptMessage(plaintext, sharedKey) {
  const encoder = new TextEncoder()
  const data = encoder.encode(plaintext)

  // Generate a random 12-byte IV (nonce) for each message
  const iv = crypto.getRandomValues(new Uint8Array(12))

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    sharedKey,
    data
  )

  return {
    ciphertext: arrayBufferToBase64(encrypted),
    iv: arrayBufferToBase64(iv),
  }
}

// ── Decryption ────────────────────────────────────────────────

/**
 * Decrypt a ciphertext using AES-GCM-256.
 * Returns the original plaintext string.
 */
export async function decryptMessage(ciphertextB64, ivB64, sharedKey) {
  try {
    const ciphertext = base64ToArrayBuffer(ciphertextB64)
    const iv = base64ToArrayBuffer(ivB64)

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      sharedKey,
      ciphertext
    )

    const decoder = new TextDecoder()
    return decoder.decode(decrypted)
  } catch (err) {
    console.warn('⚠️ Decryption failed:', err.message)
    return '🔒 Unable to decrypt this message'
  }
}

// ── Bulk Encrypt for All Recipients ───────────────────────────

/**
 * Encrypt a message for multiple recipients.
 * Each recipient gets their own ciphertext encrypted with their shared key.
 * @param {string} plaintext - The message text
 * @param {Array<{_id: string, publicKey: string}>} participants - Chat participants with public keys
 * @param {string} currentUserId - The sender's user ID
 * @returns {Array<{recipientId, ciphertext, iv}>}
 */
export async function encryptForParticipants(plaintext, participants, currentUserId) {
  const encryptedContent = []

  for (const participant of participants) {
    try {
      if (!participant.publicKey) {
        // Participant hasn't set up E2EE yet — send plaintext fallback
        encryptedContent.push({
          recipientId: participant._id,
          ciphertext: plaintext,
          iv: '__PLAINTEXT__',
        })
        continue
      }

      const sharedKey = await deriveSharedKey(participant.publicKey)
      const { ciphertext, iv } = await encryptMessage(plaintext, sharedKey)

      encryptedContent.push({
        recipientId: participant._id,
        ciphertext,
        iv,
      })
    } catch (err) {
      console.error(`Failed to encrypt for ${participant._id}:`, err)
      // Fallback to plaintext for this participant
      encryptedContent.push({
        recipientId: participant._id,
        ciphertext: plaintext,
        iv: '__PLAINTEXT__',
      })
    }
  }

  return encryptedContent
}

/**
 * Decrypt a message meant for the current user.
 * Finds the current user's encrypted content and decrypts it.
 * @param {Array} encryptedContent - Array of {recipientId, ciphertext, iv}
 * @param {Array} participants - Chat participants with public keys
 * @param {string} currentUserId - The current user's ID
 * @param {string} senderPublicKey - The sender's public key string
 * @returns {string} - Decrypted plaintext
 */
export async function decryptForMe(encryptedContent, senderPublicKey, currentUserId) {
  if (!encryptedContent || encryptedContent.length === 0) {
    return ''
  }

  // Find the encrypted content for the current user
  const myContent = encryptedContent.find(
    (c) => c.recipientId === currentUserId || c.recipientId?.toString() === currentUserId
  )

  if (!myContent) {
    // Fallback: use first available content
    const fallback = encryptedContent[0]
    if (fallback?.iv === '__PLAINTEXT__' || fallback?.iv === 'mock_iv_phase_3') {
      return fallback.ciphertext
    }
    return '🔒 Message not available for you'
  }

  // Check for plaintext fallback markers
  if (myContent.iv === '__PLAINTEXT__' || myContent.iv === 'mock_iv_phase_3') {
    return myContent.ciphertext
  }

  // Real decryption
  if (!senderPublicKey) {
    return myContent.ciphertext // Can't decrypt without sender's key
  }

  try {
    const sharedKey = await deriveSharedKey(senderPublicKey)
    return await decryptMessage(myContent.ciphertext, myContent.iv, sharedKey)
  } catch (err) {
    console.warn('Decryption failed, returning raw:', err.message)
    return '🔒 Unable to decrypt'
  }
}

// ── Base64 Utilities ──────────────────────────────────────────

function arrayBufferToBase64(buffer) {
  const bytes = new Uint8Array(buffer)
  let binary = ''
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i])
  }
  return btoa(binary)
}

function base64ToArrayBuffer(base64) {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes.buffer
}
