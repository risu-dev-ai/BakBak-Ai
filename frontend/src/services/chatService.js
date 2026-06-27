// ============================================================
// BakBak Chat - Chat & Message API Service
// File: frontend/src/services/chatService.js
// ============================================================

import api from '@/lib/axios'

const chatService = {
  /**
   * Fetch all chats for current user
   */
  getChats: async () => {
    const response = await api.get('/chats')
    return response.data
  },

  /**
   * Get single chat by ID
   */
  getChat: async (chatId) => {
    const response = await api.get(`/chats/${chatId}`)
    return response.data
  },

  /**
   * Create or fetch a 1-on-1 direct chat
   */
  createDirectChat: async (recipientId) => {
    const response = await api.post('/chats', { recipientId })
    return response.data
  },

  /**
   * Create a new group chat
   */
  createGroupChat: async ({ groupName, groupDescription, participants }) => {
    const response = await api.post('/chats/group', {
      groupName,
      groupDescription,
      participants,
    })
    return response.data
  },

  /**
   * Get messages for a specific chat with optional before cursor
   */
  getMessages: async (chatId, before = null) => {
    let url = `/messages/${chatId}`
    if (before) {
      url += `?before=${before}`
    }
    const response = await api.get(url)
    return response.data
  },

  /**
   * Send a message
   */
  sendMessage: async (messageData) => {
    const response = await api.post('/messages', messageData)
    return response.data
  },

  /**
   * Delete a message
   */
  deleteMessage: async (messageId, deleteType = 'everyone') => {
    const response = await api.delete(`/messages/${messageId}`, {
      data: { deleteType }
    })
    return response.data
  },

  /**
   * Edit a message
   */
  editMessage: async (messageId, encryptedContent) => {
    const response = await api.put(`/messages/edit/${messageId}`, {
      encryptedContent
    })
    return response.data
  },

  /**
   * Mark all messages in a chat as read
   */
  markAsRead: async (chatId) => {
    const response = await api.put(`/messages/read/${chatId}`)
    return response.data
  }
}

export default chatService
