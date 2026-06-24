// ============================================================
// BakBak Chat - Admin Routes
// File: backend/src/routes/admin.routes.js
// ============================================================
const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/authMiddleware');

// Apply protection and role verification globally to all admin routes
router.use(protect);
router.use(adminOnly);

router.get('/status', (req, res) => {
  res.json({ success: true, message: 'Admin routes are live and secure.' });
});

module.exports = router;
