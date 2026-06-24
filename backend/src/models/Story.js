// ============================================================
// BakBak Chat - Story/Status Model (24-Hour Disappearing)
// File: backend/src/models/Story.js
// ============================================================

const mongoose = require('mongoose');

const StorySchema = new mongoose.Schema(
  {
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },

    // ── Media Content ─────────────────────────────────────────
    mediaType: {
      type: String,
      enum: ['image', 'video', 'text'],
      required: true,
    },
    media: {
      url: { type: String },
      publicId: { type: String },
      mimeType: { type: String },
    },
    // For text-type stories
    textContent: {
      type: String,
      maxlength: [500, 'Story text cannot exceed 500 characters'],
    },
    backgroundColor: {
      type: String,
      default: '#1a1a2e',
    },

    // ── Views tracking ────────────────────────────────────────
    viewedBy: [
      {
        userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        viewedAt: { type: Date, default: Date.now },
      },
    ],

    // ── Auto-Expiry (TTL Index — MongoDB deletes automatically) ─
    expiresAt: {
      type: Date,
      default: () => new Date(Date.now() + 24 * 60 * 60 * 1000), // +24 hours
    },
  },
  {
    timestamps: true,
  }
);

// TTL Index: MongoDB auto-deletes documents when expiresAt is reached
StorySchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
StorySchema.index({ author: 1 });

module.exports = mongoose.model('Story', StorySchema);
