const mongoose = require('mongoose');

const ContactSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  contact: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  // Custom name the owner gave this contact (like saving a phone number with a name)
  nickname: {
    type: String,
    trim: true,
    maxlength: 50,
    default: '',
  },
  // How they added: phone, email, username, qr
  addedVia: {
    type: String,
    enum: ['phone', 'email', 'username', 'qr', 'group'],
    default: 'username',
  },
  isBlocked: {
    type: Boolean,
    default: false,
  },
  isFavorite: {
    type: Boolean,
    default: false,
  },
}, { timestamps: true });

// Compound unique index: one owner can save a contact only once
ContactSchema.index({ owner: 1, contact: 1 }, { unique: true });
ContactSchema.index({ owner: 1 });

module.exports = mongoose.model('Contact', ContactSchema);
