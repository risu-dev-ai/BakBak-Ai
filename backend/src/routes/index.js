// ============================================================
// BakBak Chat - Root API Router
// File: backend/src/routes/index.js
// ============================================================

const express = require('express');
const router = express.Router();

// ── Import sub-routers ────────────────────────────────────────
// These will be fully implemented in Phase 2 onward.
// For now they return placeholder responses so the server starts cleanly.

const authRoutes = require('./auth.routes');
const userRoutes = require('./user.routes');
const chatRoutes = require('./chat.routes');
const messageRoutes = require('./message.routes');
const storyRoutes = require('./story.routes');
const contactRoutes = require('./contactRoutes');
const adminRoutes = require('./admin.routes');

// ── Mount Routes ──────────────────────────────────────────────
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/chats', chatRoutes);
router.use('/messages', messageRoutes);
router.use('/stories', storyRoutes);
router.use('/contacts', contactRoutes);
router.use('/admin', adminRoutes);

// ── API Info ──────────────────────────────────────────────────
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: '🗨️ BakBak Chat API v1',
    endpoints: {
      auth: '/api/v1/auth',
      users: '/api/v1/users',
      chats: '/api/v1/chats',
      messages: '/api/v1/messages',
      stories: '/api/v1/stories',
      admin: '/api/v1/admin',
    },
  });
});

module.exports = router;
