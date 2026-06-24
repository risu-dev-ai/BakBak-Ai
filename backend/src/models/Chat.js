// ============================================================
// BakBak Chat - Chat & Message Models
// File: backend/src/models/Chat.js
// ============================================================

const mongoose = require('mongoose');

// ── Chat Schema ───────────────────────────────────────────────
const ChatSchema = new mongoose.Schema(
  {
    // 'direct' = 1-on-1 chat, 'group' = group chat
    chatType: {
      type: String,
      enum: ['direct', 'group'],
      required: true,
    },

    // All participants in the chat
    participants: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
      },
    ],

    // ── Group-specific fields ─────────────────────────────────
    groupName: {
      type: String,
      trim: true,
      maxlength: [100, 'Group name cannot exceed 100 characters'],
    },
    groupAvatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' },
    },
    groupDescription: {
      type: String,
      trim: true,
      maxlength: [300, 'Description cannot exceed 300 characters'],
      default: '',
    },
    admins: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },

    // ── Last Message Preview (for chat list) ──────────────────
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
    },

    // ── Muted participants (array of user IDs who muted this chat)
    mutedBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Index for fast participant lookups
ChatSchema.index({ participants: 1 });
ChatSchema.index({ chatType: 1 });
ChatSchema.index({ updatedAt: -1 }); // For sorting chat list by recent activity

// ── Message Schema ────────────────────────────────────────────
const MessageSchema = new mongoose.Schema(
  {
    chat: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Chat',
      required: true,
    },
    sender: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Encrypted Content ─────────────────────────────────────
    // For E2EE: the server ONLY stores encrypted ciphertext.
    // Each recipient gets their own encrypted copy of the message.
    encryptedContent: [
      {
        recipientId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        ciphertext: { type: String }, // Encrypted message for this recipient
        iv: { type: String },         // Initialization vector for AES-GCM
      },
    ],

    // ── Message Type ──────────────────────────────────────────
    messageType: {
      type: String,
      enum: ['text', 'image', 'video', 'audio', 'file', 'system'],
      default: 'text',
    },

    // ── Media (for image/video/audio/file messages) ───────────
    media: {
      url: { type: String },
      publicId: { type: String },
      mimeType: { type: String },
      size: { type: Number }, // bytes
      duration: { type: Number }, // seconds (for audio/video)
    },

    // ── Reply-to support ──────────────────────────────────────
    replyTo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Message',
      default: null,
    },

    // ── Delivery Status ───────────────────────────────────────
    // Tracks read status per recipient (for read receipts / ticks)
    readBy: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        readAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    deliveredTo: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User',
        },
        deliveredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],

    // ── Deletion ──────────────────────────────────────────────
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
    // 'everyone' = deleted for all, 'self' = deleted only for sender
    deleteType: {
      type: String,
      enum: ['everyone', 'self'],
    },

    // ── Starred ───────────────────────────────────────────────
    starredBy: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],
  },
  {
    timestamps: true,
  }
);

// Indexes for fast message retrieval
MessageSchema.index({ chat: 1, createdAt: -1 });
MessageSchema.index({ sender: 1 });
MessageSchema.index({ isDeleted: 1 });

const Chat = mongoose.model('Chat', ChatSchema);
const Message = mongoose.model('Message', MessageSchema);

module.exports = { Chat, Message };
