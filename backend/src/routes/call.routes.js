// ============================================================
// BakBak Chat - Call & NAT Traversal Routes
// File: backend/src/routes/call.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const crypto = require('crypto');

/**
 * Fetch ICE servers list with TURN credentials dynamically.
 * GET /api/v1/calls/ice-servers
 */
router.get('/ice-servers', protect, (req, res) => {
  const iceServers = [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ];

  const turnUrl = process.env.TURN_URL;
  const turnSecret = process.env.TURN_SECRET;
  const turnUsername = process.env.TURN_USERNAME;
  const turnPassword = process.env.TURN_PASSWORD;

  if (turnUrl) {
    const urls = turnUrl.split(',').map(u => u.trim());
    if (turnSecret) {
      // Dynamic coturn credentials using time-limited token algorithm
      const expiry = Math.floor(Date.now() / 1000) + 24 * 3600; // 24 hours expiry
      const username = `${expiry}:${req.user.username}`;
      const hmac = crypto.createHmac('sha1', turnSecret);
      hmac.update(username);
      const credential = hmac.digest('base64');

      iceServers.push({
        urls,
        username,
        credential
      });
    } else if (turnUsername && turnPassword) {
      // Static turn credentials fallback
      iceServers.push({
        urls,
        username: turnUsername,
        credential: turnPassword
      });
    }
  }

  res.status(200).json({
    success: true,
    iceServers
  });
});

module.exports = router;
