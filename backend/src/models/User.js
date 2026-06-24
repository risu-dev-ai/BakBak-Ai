// ============================================================
// BakBak Chat - User Model (MongoDB Schema)
// File: backend/src/models/User.js
// ============================================================

const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const UserSchema = new mongoose.Schema(
  {
    // ── Identity ────────────────────────────────────────────
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      match: [/^[a-z0-9._]+$/, 'Username can only contain letters, numbers, dots, and underscores'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    phone: {
      type: String,
      unique: true,
      sparse: true, // Allows multiple null values (phone is optional)
      trim: true,
      match: [/^\+?[1-9]\d{9,14}$/, 'Please enter a valid phone number'],
    },

    // ── Authentication ───────────────────────────────────────
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false, // NEVER return password in queries by default
    },

    // ── Profile ──────────────────────────────────────────────
    displayName: {
      type: String,
      trim: true,
      maxlength: [50, 'Display name cannot exceed 50 characters'],
      default: function () {
        return this.username;
      },
    },
    avatar: {
      url: { type: String, default: '' },
      publicId: { type: String, default: '' }, // Cloudinary public_id for deletion
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: '',
    },
    statusText: {
      type: String,
      trim: true,
      maxlength: [100, 'Status text cannot exceed 100 characters'],
      default: 'Hey there! I am using BakBak.',
    },

    // ── E2EE Public Key Storage ──────────────────────────────
    // The client generates a key pair; only the PUBLIC key is stored here.
    // The private key NEVER leaves the user's device.
    publicKey: {
      type: String,
      default: '',
    },
    isVerified: {
      type: Boolean,
      default: false,
    },

    // ── Presence & Status ────────────────────────────────────
    isOnline: {
      type: Boolean,
      default: false,
    },
    lastSeen: {
      type: Date,
      default: Date.now,
    },

    // ── Social / Privacy ─────────────────────────────────────
    blockedUsers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
      },
    ],

    // ── Admin / Moderation ───────────────────────────────────
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    isBanned: {
      type: Boolean,
      default: false,
    },
    banReason: {
      type: String,
      default: '',
    },

    // ── Starred Messages ─────────────────────────────────────
    starredMessages: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
  },
  {
    timestamps: true, // Adds createdAt and updatedAt automatically
  }
);

// ── Indexes for Performance ───────────────────────────────────
// Note: email, username, phone already have indexes via unique:true above.
// Only add indexes for non-unique query fields:
UserSchema.index({ isOnline: 1 });

// ── Pre-Save Hook: Hash Password ──────────────────────────────
// Runs automatically before .save() is called
UserSchema.pre('save', async function (next) {
  // Only hash the password if it's new or was modified
  if (!this.isModified('password')) return next();

  try {
    const salt = await bcrypt.genSalt(12); // Cost factor 12 = very secure
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// ── Instance Method: Compare Passwords ───────────────────────
// Usage: const isMatch = await user.comparePassword(inputPassword)
UserSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// ── Instance Method: Get Public Profile ───────────────────────
// Returns safe user data (no password, no sensitive fields)
UserSchema.methods.toPublicProfile = function () {
  return {
    _id: this._id,
    username: this.username,
    displayName: this.displayName,
    avatar: this.avatar,
    bio: this.bio,
    statusText: this.statusText,
    isOnline: this.isOnline,
    lastSeen: this.lastSeen,
    publicKey: this.publicKey,
    email: this.email,
    phone: this.phone,
    isVerified: this.isVerified,
  };
};

module.exports = mongoose.model('User', UserSchema);
