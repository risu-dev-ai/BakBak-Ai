// ============================================================
// BakBak Chat - Call Log Mongoose Model
// File: backend/src/models/Call.js
// ============================================================

const mongoose = require('mongoose');

const CallSchema = new mongoose.Schema({
  caller: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receiver: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  callType: {
    type: String,
    enum: ['audio', 'video'],
    required: true,
  },
  status: {
    type: String,
    enum: ['missed', 'connected', 'rejected', 'no-answer'],
    default: 'missed',
  },
  duration: {
    type: Number, // duration in seconds
    default: 0,
  },
}, { timestamps: true });

module.exports = mongoose.model('Call', CallSchema);
