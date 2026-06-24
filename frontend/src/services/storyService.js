// ============================================================
// BakBak Chat - Story API Service
// File: frontend/src/services/storyService.js
// ============================================================

import api from '@/lib/axios'

const storyService = {
  /**
   * Fetch all stories feed (grouped by author)
   */
  getStories: async () => {
    const response = await api.get('/stories')
    return response.data
  },

  /**
   * Get stories for a specific user
   */
  getUserStories: async (userId) => {
    const response = await api.get(`/stories/user/${userId}`)
    return response.data
  },

  /**
   * Create a media story (image/video)
   */
  createMediaStory: async (file, mediaType) => {
    const formData = new FormData()
    formData.append('story', file)
    formData.append('mediaType', mediaType)
    const response = await api.post('/stories', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000, // 60s for large uploads
    })
    return response.data
  },

  /**
   * Create a text story
   */
  createTextStory: async (textContent, backgroundColor = '#1a1a2e') => {
    const response = await api.post('/stories', {
      mediaType: 'text',
      textContent,
      backgroundColor,
    })
    return response.data
  },

  /**
   * Mark a story as viewed
   */
  viewStory: async (storyId) => {
    const response = await api.put(`/stories/${storyId}/view`)
    return response.data
  },

  /**
   * Delete a story
   */
  deleteStory: async (storyId) => {
    const response = await api.delete(`/stories/${storyId}`)
    return response.data
  },
}

export default storyService
