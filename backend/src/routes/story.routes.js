// ============================================================
// BakBak Chat - Story Routes
// File: backend/src/routes/story.routes.js
// ============================================================

const express = require('express');
const router = express.Router();
const storyController = require('../controllers/storyController');
const { protect } = require('../middleware/authMiddleware');
const { uploadStory } = require('../middleware/uploadMiddleware');

// All story routes require authentication
router.use(protect);

// Story CRUD
router.post('/', uploadStory, storyController.createStory);
router.get('/', storyController.getStories);
router.get('/user/:userId', storyController.getUserStories);
router.put('/:id/view', storyController.viewStory);
router.delete('/:id', storyController.deleteStory);

module.exports = router;
