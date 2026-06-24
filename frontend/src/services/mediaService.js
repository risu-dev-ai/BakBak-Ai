// ============================================================
// BakBak Chat - Media Upload Service (for chat attachments)
// File: frontend/src/services/mediaService.js
// ============================================================

import api from '@/lib/axios'

const mediaService = {
  /**
   * Upload a media file for a chat message.
   * Sends the file to the backend which uploads to Cloudinary.
   * @param {File} file - The file to upload
   * @param {string} chatId - The chat this media belongs to
   * @returns {Object} - { url, publicId, mimeType, size }
   */
  uploadChatMedia: async (file, chatId) => {
    const formData = new FormData()
    formData.append('media', file)
    formData.append('chatId', chatId)

    const response = await api.post('/messages/upload-media', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s for large uploads
    })
    return response.data
  },
}

export default mediaService
