// ============================================================
// BakBak Chat - Multer File Upload Middleware
// File: backend/src/middleware/uploadMiddleware.js
// ============================================================

const multer = require('multer');

// Store files in memory (buffer) — we then upload to Cloudinary
const storage = multer.memoryStorage();

// File type validator
const fileFilter = (req, file, cb) => {
  const allowedMimeTypes = [
    'image/jpeg',
    'image/jpg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'audio/ogg',
    'application/pdf',
  ];

  if (allowedMimeTypes.includes(file.mimetype)) {
    cb(null, true); // Accept file
  } else {
    cb(new Error(`File type not allowed: ${file.mimetype}`), false);
  }
};

// Avatar upload (images only, max 5MB)
const uploadAvatar = multer({
  storage,
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed for avatars'), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
}).single('avatar');

// Chat media upload (images, videos, audio, max 50MB)
const uploadMedia = multer({
  storage,
  fileFilter,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
}).single('media');

// Story upload (image or video, max 30MB)
const uploadStory = multer({
  storage,
  fileFilter,
  limits: { fileSize: 30 * 1024 * 1024 }, // 30MB
}).single('story');

module.exports = { uploadAvatar, uploadMedia, uploadStory };
