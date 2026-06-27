// ============================================================
// BakBak Chat - Story Controller
// File: backend/src/controllers/storyController.js
// ============================================================

const Story = require('../models/Story');
const Contact = require('../models/Contact');
const { uploadToCloudinary, deleteFromCloudinary } = require('../config/cloudinary');

/**
 * Create a new story (image, video, or text)
 * POST /api/v1/stories
 */
exports.createStory = async (req, res, next) => {
  try {
    const { mediaType, textContent, backgroundColor } = req.body;
    const authorId = req.user._id;

    const storyData = {
      author: authorId,
      mediaType: mediaType || 'text',
    };

    // Handle media upload (image/video)
    if (req.file) {
      const folder = mediaType === 'video' ? 'stories/videos' : 'stories/images';
      const resourceType = mediaType === 'video' ? 'video' : 'image';
      const uploaded = await uploadToCloudinary(req.file.buffer, folder, resourceType);

      storyData.mediaType = mediaType || (req.file.mimetype.startsWith('video') ? 'video' : 'image');
      storyData.media = {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        mimeType: req.file.mimetype,
      };
    } else if (mediaType === 'text') {
      if (!textContent || !textContent.trim()) {
        return res.status(400).json({ success: false, message: 'Text content is required for text stories.' });
      }
      storyData.textContent = textContent.trim();
      storyData.backgroundColor = backgroundColor || '#1a1a2e';
    } else {
      return res.status(400).json({ success: false, message: 'Media file or text content is required.' });
    }

    const story = await Story.create(storyData);
    const populated = await Story.findById(story._id).populate('author', 'username displayName avatar');

    // Emit socket event to followers/mutual contacts who have this author saved
    const io = req.app.get('io');
    if (io) {
      try {
        const followers = await Contact.find({ contact: req.user._id });
        followers.forEach(follower => {
          io.to(follower.owner.toString()).emit('story:new', populated);
        });
        // Also emit to the author's other devices
        io.to(req.user._id.toString()).emit('story:new', populated);
      } catch (err) {
        console.error('Failed to broadcast new story socket:', err.message);
      }
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all stories from users (feed)
 * GET /api/v1/stories
 */
exports.getStories = async (req, res, next) => {
  try {
    // Only return stories from the user themselves and their saved contacts
    const contacts = await Contact.find({ owner: req.user._id });
    const contactIds = contacts.map(c => c.contact);
    const allowedAuthorIds = [req.user._id, ...contactIds];

    const stories = await Story.find({ author: { $in: allowedAuthorIds } })
      .populate('author', 'username displayName avatar isOnline')
      .sort({ createdAt: -1 });

    // Group stories by author
    const grouped = {};
    stories.forEach((story) => {
      if (!story.author) return;
      const authorId = story.author._id.toString();
      if (!grouped[authorId]) {
        grouped[authorId] = {
          author: story.author,
          stories: [],
        };
      }
      grouped[authorId].stories.push(story);
    });

    const feed = Object.values(grouped);
    res.status(200).json({ success: true, count: feed.length, data: feed });
  } catch (error) {
    next(error);
  }
};

/**
 * Get stories for a specific user
 * GET /api/v1/stories/user/:userId
 */
exports.getUserStories = async (req, res, next) => {
  try {
    const stories = await Story.find({ author: req.params.userId })
      .populate('author', 'username displayName avatar')
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, count: stories.length, data: stories });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark a story as viewed
 * PUT /api/v1/stories/:id/view
 */
exports.viewStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    // Check if already viewed by this user
    const alreadyViewed = story.viewedBy.some(
      (v) => v.userId.toString() === req.user._id.toString()
    );

    if (!alreadyViewed) {
      story.viewedBy.push({ userId: req.user._id });
      await story.save();
    }

    res.status(200).json({ success: true, message: 'Story viewed.' });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a story (author only)
 * DELETE /api/v1/stories/:id
 */
exports.deleteStory = async (req, res, next) => {
  try {
    const story = await Story.findById(req.params.id);
    if (!story) {
      return res.status(404).json({ success: false, message: 'Story not found.' });
    }

    if (story.author.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only delete your own stories.' });
    }

    // Delete media from Cloudinary if exists
    if (story.media?.publicId) {
      await deleteFromCloudinary(story.media.publicId);
    }

    await Story.findByIdAndDelete(story._id);
    res.status(200).json({ success: true, message: 'Story deleted.' });
  } catch (error) {
    next(error);
  }
};
