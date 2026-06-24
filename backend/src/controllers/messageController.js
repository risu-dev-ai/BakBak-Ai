// ============================================================
// BakBak Chat - Message Controller
// File: backend/src/controllers/messageController.js
// ============================================================

const { Message, Chat } = require('../models/Chat');
const { uploadToCloudinary } = require('../config/cloudinary');

/**
 * Send a message in a chat
 * POST /api/v1/messages
 */
exports.sendMessage = async (req, res, next) => {
  try {
    const { chatId, messageType, encryptedContent, media, replyTo } = req.body;
    const senderId = req.user._id;

    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required.' });
    }

    // Verify chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: senderId
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    // Create the message
    const message = await Message.create({
      chat: chatId,
      sender: senderId,
      messageType: messageType || 'text',
      encryptedContent: encryptedContent || [],
      media: media || null,
      replyTo: replyTo || null
    });

    // Update the last message preview and updatedAt timestamp in the Chat model
    chat.lastMessage = message._id;
    await chat.save();

    // Populate sender and replyTo information
    const populatedMessage = await Message.findById(message._id)
      .populate('sender', 'username displayName avatar isOnline publicKey')
      .populate({
        path: 'replyTo',
        select: 'sender encryptedContent messageType media',
        populate: {
          path: 'sender',
          select: 'username displayName'
        }
      });

    // Emit the message via Socket.io
    const io = req.app.get('io');
    if (io) {
      // 1. Send message to the specific chat room (for open chat screens)
      io.to(chatId.toString()).emit('message:receive', populatedMessage);

      // 2. Notify all participants (to update their sidebar chat list)
      chat.participants.forEach(participantId => {
        // Don't send sidebar update to sender if they already updated locally (or let it update)
        io.to(participantId.toString()).emit('chat:update', {
          chatId: chat._id,
          lastMessage: populatedMessage,
          updatedAt: chat.updatedAt
        });
      });
    }

    res.status(201).json({ success: true, data: populatedMessage });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all messages for a specific chat (with pagination)
 * GET /api/v1/messages/:chatId
 */
exports.getChatMessages = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;
    const limit = parseInt(req.query.limit, 10) || 50;
    const before = req.query.before; // ISO timestamp or ObjectId for cursor pagination

    // Verify chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    // Build query
    const query = { chat: chatId };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    // Fetch messages sorted by creation date descending
    const messages = await Message.find(query)
      .populate('sender', 'username displayName avatar isOnline publicKey')
      .populate({
        path: 'replyTo',
        select: 'sender encryptedContent messageType media',
        populate: {
          path: 'sender',
          select: 'username displayName'
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit);

    // Reverse messages to return them in chronological order
    res.status(200).json({ success: true, count: messages.length, data: messages.reverse() });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete a message
 * DELETE /api/v1/messages/:id
 */
exports.deleteMessage = async (req, res, next) => {
  try {
    const { deleteType } = req.body; // 'everyone' or 'self'
    const messageId = req.params.id;
    const currentUserId = req.user._id;

    const message = await Message.findById(messageId);
    if (!message) {
      return res.status(404).json({ success: false, message: 'Message not found.' });
    }

    // Check if user is the sender (for "delete for everyone")
    if (deleteType === 'everyone') {
      if (message.sender.toString() !== currentUserId.toString()) {
        return res.status(403).json({ success: false, message: 'You can only delete your own messages.' });
      }

      message.isDeleted = true;
      message.deletedAt = new Date();
      message.deleteType = 'everyone';
      message.encryptedContent = []; // Clear the encrypted ciphertext for security
      message.media = undefined;      // Clear media metadata
      await message.save();

      // Emit socket event to notify clients to update UI
      const io = req.app.get('io');
      if (io) {
        io.to(message.chat.toString()).emit('message:deleted', {
          messageId: message._id,
          chatId: message.chat
        });
      }
    } else {
      // 'self' deletion (not globally deleting it, just tagging/hiding for this user)
      // For simplicity, we'll implement standard deletion here.
      // (Optional: add a 'hiddenFor' array of UserIds to schema)
      return res.status(400).json({ success: false, message: 'Delete type "self" is not implemented in this version.' });
    }

    res.status(200).json({ success: true, data: message });
  } catch (error) {
    next(error);
  }
};

/**
 * Mark all messages in a chat as read
 * PUT /api/v1/messages/read/:chatId
 */
exports.markChatAsRead = async (req, res, next) => {
  try {
    const { chatId } = req.params;
    const currentUserId = req.user._id;

    // Verify chat exists and user is a participant
    const chat = await Chat.findOne({
      _id: chatId,
      participants: currentUserId
    });

    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    // Add current user to readBy array for all messages in the chat that they haven't read
    const result = await Message.updateMany(
      {
        chat: chatId,
        sender: { $ne: currentUserId },
        'readBy.userId': { $ne: currentUserId }
      },
      {
        $push: {
          readBy: {
            userId: currentUserId,
            readAt: new Date()
          }
        }
      }
    );

    // Emit read receipt event via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(chatId.toString()).emit('messages:read', {
        chatId,
        userId: currentUserId,
        readAt: new Date()
      });
    }

    res.status(200).json({ success: true, message: 'Messages marked as read.', count: result.modifiedCount });
  } catch (error) {
    next(error);
  }
};

/**
 * Upload a media file for a chat message (to Cloudinary)
 * POST /api/v1/messages/upload-media
 */
exports.uploadMedia = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
    }

    const { chatId } = req.body;
    if (!chatId) {
      return res.status(400).json({ success: false, message: 'Chat ID is required.' });
    }

    // Verify chat access
    const chat = await Chat.findOne({ _id: chatId, participants: req.user._id });
    if (!chat) {
      return res.status(404).json({ success: false, message: 'Chat not found or access denied.' });
    }

    // Determine folder and resource type from mimetype
    let folder = 'chat-media/files';
    let resourceType = 'auto';
    if (req.file.mimetype.startsWith('image/')) {
      folder = 'chat-media/images';
      resourceType = 'image';
    } else if (req.file.mimetype.startsWith('video/')) {
      folder = 'chat-media/videos';
      resourceType = 'video';
    } else if (req.file.mimetype.startsWith('audio/')) {
      folder = 'chat-media/audio';
      resourceType = 'video'; // Cloudinary uses 'video' for audio too
    }

    const uploaded = await uploadToCloudinary(req.file.buffer, folder, resourceType);

    res.status(200).json({
      success: true,
      data: {
        url: uploaded.secure_url,
        publicId: uploaded.public_id,
        mimeType: req.file.mimetype,
        size: req.file.size,
        originalName: req.file.originalname,
      },
    });
  } catch (error) {
    next(error);
  }
};
