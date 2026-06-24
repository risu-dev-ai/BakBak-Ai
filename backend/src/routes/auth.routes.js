// ============================================================
// BakBak Chat - Auth Routes
// File: backend/src/routes/auth.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  verifyUserOTP,
  resendUserOTP,
} = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

// ── Public Routes (no auth required) ─────────────────────────
router.post('/register', register);
router.post('/login', login);
router.post('/verify-otp', verifyUserOTP);
router.post('/resend-otp', resendUserOTP);

// ── Protected Routes (JWT required) ──────────────────────────
router.get('/me', protect, getMe);
router.post('/logout', protect, logout);

module.exports = router;
