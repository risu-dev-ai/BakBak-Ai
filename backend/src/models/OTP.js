// ============================================================
// BakBak Chat - OTP Model for Authentication & Verification
// File: backend/src/models/OTP.js
// ============================================================

const mongoose = require('mongoose');

const OTPSchema = new mongoose.Schema({
  emailOrPhone: {
    type: String,
    required: true,
    trim: true,
  },
  otp: {
    type: String,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 600, // Expires automatically after 10 minutes (600 seconds)
  },
});

// Index for fast lookups
OTPSchema.index({ emailOrPhone: 1, otp: 1 });

module.exports = mongoose.model('OTP', OTPSchema);
