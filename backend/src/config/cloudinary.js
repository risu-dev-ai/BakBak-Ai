// ============================================================
// BakBak Chat - Cloudinary Configuration
// File: backend/src/config/cloudinary.js
// ============================================================

const cloudinary = require('cloudinary').v2;

// Configure Cloudinary with your credentials from .env
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true, // Always use HTTPS
});

/**
 * Upload a file buffer to Cloudinary
 * @param {Buffer} fileBuffer - The file buffer from multer
 * @param {string} folder - Cloudinary folder (e.g., 'avatars', 'chat-media')
 * @param {string} resourceType - 'image' | 'video' | 'auto'
 * @returns {Promise<Object>} - Cloudinary upload result
 */
const uploadToCloudinary = (fileBuffer, folder = 'bakbak', resourceType = 'auto') => {
  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: `bakbak/${folder}`,
        resource_type: resourceType,
        transformation:
          folder === 'avatars'
            ? [{ width: 400, height: 400, crop: 'fill', gravity: 'face' }]
            : [],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(fileBuffer);
  });
};

/**
 * Delete a file from Cloudinary by its public_id
 * @param {string} publicId - The Cloudinary public_id of the file
 */
const deleteFromCloudinary = async (publicId) => {
  try {
    await cloudinary.uploader.destroy(publicId);
  } catch (error) {
    console.error('Cloudinary delete error:', error.message);
  }
};

module.exports = { cloudinary, uploadToCloudinary, deleteFromCloudinary };
