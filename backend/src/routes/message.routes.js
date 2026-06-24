// ============================================================
// BakBak Chat - Message Routes
// File: backend/src/routes/message.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const messageController = require('../controllers/messageController');
const { protect } = require('../middleware/authMiddleware');
const { uploadMedia } = require('../middleware/uploadMiddleware');

// All message routes require authentication
router.use(protect);

// Media upload (must come before parameterized routes)
router.post('/upload-media', uploadMedia, messageController.uploadMedia);

// Message operations
router.post('/', messageController.sendMessage);
router.get('/:chatId', messageController.getChatMessages);
router.delete('/:id', messageController.deleteMessage);
router.put('/read/:chatId', messageController.markChatAsRead);

module.exports = router;
