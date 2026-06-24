// ============================================================
// BakBak Chat - Chat Routes
// File: backend/src/routes/chat.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

// All chat routes require authentication
router.use(protect);

// 1-on-1 and General Chat endpoints
router.route('/')
  .post(chatController.createOrGetDirectChat)
  .get(chatController.getUserChats);

// Group Chat specific endpoints
router.post('/group', chatController.createGroupChat);
router.put('/:id/group', chatController.updateGroupInfo);
router.put('/:id/group/add', chatController.addGroupParticipants);
router.put('/:id/group/remove', chatController.removeGroupParticipant);

// Fetch details for single chat
router.get('/:id', chatController.getChatById);

module.exports = router;
