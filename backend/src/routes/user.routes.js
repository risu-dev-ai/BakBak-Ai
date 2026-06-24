// ============================================================
// BakBak Chat - User Routes (Phase 2 - FULLY IMPLEMENTED)
// File: backend/src/routes/user.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const {
  getUserProfile,
  updateProfile,
  uploadAvatar,
  deleteAvatar,
  changePassword,
  searchUsers,
  blockUser,
  unblockUser,
  savePublicKey,
  getBlockedUsers,
  requestProfileUpdateOTP,
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadAvatar: avatarUpload } = require('../middleware/uploadMiddleware');

// All user routes require authentication
router.use(protect);

// ── Profile ───────────────────────────────────────────────────
// GET  /api/v1/users/search?q=term
router.get('/search', searchUsers);

// GET  /api/v1/users/blocked
router.get('/blocked', getBlockedUsers);

// PUT  /api/v1/users/profile  — update displayName, bio, statusText
router.put('/profile', updateProfile);

// POST /api/v1/users/profile/request-otp — request OTP for profile updates
router.post('/profile/request-otp', requestProfileUpdateOTP);

// POST /api/v1/users/avatar   — upload profile picture
router.post('/avatar', avatarUpload, uploadAvatar);

// DELETE /api/v1/users/avatar — remove profile picture
router.delete('/avatar', deleteAvatar);

// PUT  /api/v1/users/change-password
router.put('/change-password', changePassword);

// PUT  /api/v1/users/public-key  — store E2EE public key (Phase 4)
router.put('/public-key', savePublicKey);

// ── User lookup by ID ─────────────────────────────────────────
// GET  /api/v1/users/:id
router.get('/:id', getUserProfile);

// ── Block / Unblock ───────────────────────────────────────────
// POST /api/v1/users/:id/block
router.post('/:id/block', blockUser);

// POST /api/v1/users/:id/unblock
router.post('/:id/unblock', unblockUser);

module.exports = router;
