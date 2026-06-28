// ============================================================
// BakBak Chat - Chat State & Actions (Zustand Store)
// File: frontend/src/store/chatStore.js
// ============================================================

import { create } from 'zustand'
import chatService from '@/services/chatService'
import offlineService from '@/services/offlineService'

const useChatStore = create((set, get) => ({
  // ── State ─────────────────────────────────────────────────
  chats: [],               // Array of all chat objects
  activeChat: null,        // Currently open chat
  messages: {},            // Map: chatId -> messages[]
  typingUsers: {},         // Map: chatId -> [userId, ...]
  onlineUsers: new Set(),  // Set of online user IDs
  loadingChats: false,     // Loading state for chats
  loadingMessages: false,  // Loading state for messages
  socketListenersRegistered: false,

  // ── Chat Actions ──────────────────────────────────────────
  setChats: (chats) => set({ chats }),
  setActiveChat: (chat) => set({ activeChat: chat }),

  addChat: (chat) =>
    set((state) => ({
      chats: [chat, ...state.chats.filter((c) => c._id !== chat._id)],
    })),

  fetchChats: async () => {
    set({ loadingChats: true })
    try {
      const cached = await offlineService.getChats()
      if (cached && cached.length > 0) {
        set({ chats: cached })
      }
    } catch (err) {
      console.warn('Failed to load cached chats:', err)
    }

    try {
      const response = await chatService.getChats()
      if (response.success) {
        set({ chats: response.data })
        offlineService.saveChats(response.data).catch(console.error)
      }
    } catch (error) {
      console.error('Failed to fetch chats:', error)
    } finally {
      set({ loadingChats: false })
    }
  },

  createDirectChat: async (recipientId) => {
    try {
      const response = await chatService.createDirectChat(recipientId)
      if (response.success) {
        const chat = response.data
        get().addChat(chat)
        return chat
      }
    } catch (error) {
      console.error('Failed to create direct chat:', error)
      throw error
    }
  },

  createGroupChat: async ({ groupName, groupDescription, participants }) => {
    try {
      const response = await chatService.createGroupChat({ groupName, groupDescription, participants })
      if (response.success) {
        const chat = response.data
        get().addChat(chat)
        return chat
      }
    } catch (error) {
      console.error('Failed to create group chat:', error)
      throw error
    }
  },

  // ── Message Actions ───────────────────────────────────────
  fetchMessages: async (chatId) => {
    set({ loadingMessages: true })
    try {
      const cached = await offlineService.getMessages(chatId)
      if (cached && cached.length > 0) {
        set((state) => ({
          messages: { ...state.messages, [chatId]: cached },
        }))
      }
    } catch (err) {
      console.warn('Failed to load cached messages:', err)
    }

    try {
      const response = await chatService.getMessages(chatId)
      if (response.success) {
        set((state) => ({
          messages: { ...state.messages, [chatId]: response.data },
        }))
        offlineService.saveMessages(chatId, response.data).catch(console.error)
      }
    } catch (error) {
      console.error('Failed to fetch messages:', error)
    } finally {
      set({ loadingMessages: false })
    }
  },

  sendTextMessage: async (chatId, text, replyToId = null) => {
    if (!navigator.onLine) {
      const { syncQueue } = await import('@/services/syncQueue')
      await syncQueue.queueMessage(chatId, text)
      const tempId = `temp_${Date.now()}`
      const useAuthStore = (await import('@/store/authStore')).default
      const selfUser = useAuthStore.getState().user
      const tempMessage = {
        _id: tempId,
        chat: chatId,
        sender: selfUser,
        messageType: 'text',
        encryptedContent: [{ recipientId: selfUser?._id, ciphertext: text, iv: '__PLAINTEXT__' }],
        createdAt: new Date().toISOString(),
        isUnsent: true
      }
      set((state) => {
        const chatMsgs = state.messages[chatId] || []
        const updated = [...chatMsgs, tempMessage]
        offlineService.saveMessages(chatId, updated).catch(console.error)
        return {
          messages: {
            ...state.messages,
            [chatId]: updated,
          },
        }
      })
      return tempMessage
    }

    try {
      const activeChat = get().activeChat
      if (!activeChat) return

      // ── Phase 4 E2EE: Encrypt for each participant ──────────
      let encryptedContent
      try {
        const { encryptForParticipants } = await import('@/lib/crypto')
        const useAuthStore = (await import('@/store/authStore')).default
        const currentUserId = useAuthStore.getState().user?._id
        encryptedContent = await encryptForParticipants(text, activeChat.participants, currentUserId)
      } catch (cryptoErr) {
        console.warn('E2EE encryption failed, falling back to plaintext:', cryptoErr)
        // Fallback to plaintext if crypto module fails
        encryptedContent = activeChat.participants.map((p) => ({
          recipientId: p._id,
          ciphertext: text,
          iv: '__PLAINTEXT__',
        }))
      }

      const messageData = {
        chatId,
        messageType: 'text',
        encryptedContent,
        replyTo: replyToId,
      }

      const response = await chatService.sendMessage(messageData)
      if (response.success) {
        const newMessage = response.data
        
        // Optimistically update message state
        set((state) => {
          const chatMsgs = state.messages[chatId] || []
          // Avoid duplicate messages if already received via socket
          if (chatMsgs.find(m => m._id === newMessage._id)) return {}
          const updated = [...chatMsgs, newMessage]
          offlineService.saveMessages(chatId, updated).catch(console.error)
          return {
            messages: {
              ...state.messages,
              [chatId]: updated,
            },
          }
        })

        // Update lastMessage in chat list
        get().updateLastMessage(chatId, newMessage)
        return newMessage
      }
    } catch (error) {
      console.error('Failed to send message:', error)
      throw error
    }
  },
  deleteMessage: async (messageId, deleteType = 'everyone') => {
    try {
      const response = await chatService.deleteMessage(messageId, deleteType)
      if (response.success) {
        const activeChat = get().activeChat
        if (activeChat) {
          set((state) => {
            const currentMsgs = state.messages[activeChat._id] || []
            let updatedMsgs
            if (deleteType === 'self') {
              updatedMsgs = currentMsgs.filter(m => m._id !== messageId)
            } else {
              updatedMsgs = currentMsgs.map(m => 
                m._id === messageId 
                  ? { ...m, isDeleted: true, deleteType, encryptedContent: [], media: null } 
                  : m
              )
            }
            return {
              messages: {
                ...state.messages,
                [activeChat._id]: updatedMsgs
              }
            }
          })
        }
      }
    } catch (error) {
      console.error('Failed to delete message:', error)
    }
  },

  editMessage: async (messageId, encryptedContent) => {
    try {
      const response = await chatService.editMessage(messageId, encryptedContent)
      if (response.success) {
        const activeChat = get().activeChat
        if (activeChat) {
          set((state) => ({
            messages: {
              ...state.messages,
              [activeChat._id]: (state.messages[activeChat._id] || []).map((m) =>
                m._id === messageId
                  ? { ...m, isEdited: true, encryptedContent }
                  : m
              ),
            },
          }))
        }
      }
    } catch (error) {
      console.error('Failed to edit message:', error)
    }
  },

  updateLastMessage: (chatId, message) =>
    set((state) => ({
      chats: state.chats.map((c) =>
        c._id === chatId ? { ...c, lastMessage: message, updatedAt: message.updatedAt || new Date().toISOString() } : c
      ).sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt)),
    })),

  // ── Typing Indicators ─────────────────────────────────────
  setTyping: (chatId, userId, isTyping) =>
    set((state) => {
      const current = state.typingUsers[chatId] || []
      return {
        typingUsers: {
          ...state.typingUsers,
          [chatId]: isTyping
            ? [...new Set([...current, userId])]
            : current.filter((id) => id !== userId),
        },
      }
    }),

  // ── Presence ──────────────────────────────────────────────
  setUserOnline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers)
      next.add(userId)
      return { onlineUsers: next }
    }),

  setUserOffline: (userId) =>
    set((state) => {
      const next = new Set(state.onlineUsers)
      next.delete(userId)
      return { onlineUsers: next }
    }),

  isUserOnline: (userId) => get().onlineUsers.has(userId),

  // ── Socket Events Manager ─────────────────────────────────
  initializeSocketListeners: (socket) => {
    if (!socket || get().socketListenersRegistered) return

    // Socket reconnect / sync logic
    socket.on('connect', () => {
      console.log('🔌 Socket connected/reconnected. Syncing data...')
      get().fetchChats()
      const activeChat = get().activeChat
      if (activeChat) {
        get().fetchMessages(activeChat._id)
      }
    })

    // Message received (for active chat screen)
    socket.on('message:receive', async (message) => {
      const { activeChat } = get()
      const chatId = message.chat

      // Trigger Local Notification if not on this active chat
      if (!activeChat || activeChat._id !== chatId) {
        try {
          const { LocalNotifications } = await import('@capacitor/local-notifications')
          // Check permissions
          let permStatus = await LocalNotifications.checkPermissions()
          if (permStatus.display === 'prompt') {
            permStatus = await LocalNotifications.requestPermissions()
          }
          if (permStatus.display === 'granted') {
            const useAuthStore = (await import('@/store/authStore')).default
            const selfUser = useAuthStore.getState().user
            const myEnc = message.encryptedContent?.find(c => c.recipientId === selfUser?._id)
            let bodyText = 'New message'
            if (message.messageType === 'text') {
              if (myEnc) {
                if (myEnc.iv === '__PLAINTEXT__' || myEnc.iv === 'mock_iv_phase_3') {
                  bodyText = myEnc.ciphertext
                } else {
                  try {
                    const { decryptForMe } = await import('@/lib/crypto')
                    bodyText = await decryptForMe(message.encryptedContent, message.sender?.publicKey, selfUser?._id)
                  } catch {
                    bodyText = '🔐 Encrypted message'
                  }
                }
              }
            } else {
              bodyText = `New ${message.messageType} message`
            }

            await LocalNotifications.schedule({
              notifications: [
                {
                  title: message.sender?.displayName || message.sender?.username || 'BakBak Chat',
                  body: bodyText,
                  id: new Date().getTime(),
                  schedule: { at: new Date(Date.now() + 100) },
                  channelId: 'bakbak-chat-messages',
                },
              ],
            })
          }
        } catch (err) {
          console.warn('Local Notifications not available:', err)
        }
      }

      // Add message to chat list
      set((state) => {
        const chatMsgs = state.messages[chatId] || []
        if (chatMsgs.find((m) => m._id === message._id)) return {}
        const updated = [...chatMsgs, message]
        offlineService.saveMessages(chatId, updated).catch(console.error)
        return {
          messages: {
            ...state.messages,
            [chatId]: updated,
          },
        }
      })

      // Send delivery tick to server if this is the receiver
      if (message.sender._id !== socket.user?._id) {
        socket.emit('message:delivered', {
          messageId: message._id,
          chatId: chatId,
        })
      }

      // If this is the active chat and we are viewing it, auto mark as read
      if (activeChat && activeChat._id === chatId) {
        chatService.markAsRead(chatId).catch(console.error)
      }
    })

    // Chat last message update (for sidebar)
    socket.on('chat:update', ({ chatId, lastMessage }) => {
      get().updateLastMessage(chatId, lastMessage)
    })

    // Message deleted
    socket.on('message:deleted', ({ messageId, chatId }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) =>
            m._id === messageId
              ? { ...m, isDeleted: true, deleteType: 'everyone', encryptedContent: [], media: null }
              : m
          ),
        },
      }))
    })

    // Message edited
    socket.on('message:edited', (editedMessage) => {
      const chatId = editedMessage.chat
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) =>
            m._id === editedMessage._id
              ? editedMessage
              : m
          ),
        },
      }))
    })

    // Message delivered tick update
    socket.on('message:delivered', ({ messageId, chatId, userId, deliveredAt }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) => {
            if (m._id !== messageId) return m
            // Add user to deliveredTo list if not already there
            const exists = m.deliveredTo?.some(d => d.userId === userId)
            if (exists) return m
            return {
              ...m,
              deliveredTo: [...(m.deliveredTo || []), { userId, deliveredAt }],
            }
          }),
        },
      }))
    })

    // Message read tick update
    socket.on('messages:read', ({ chatId, userId, readAt }) => {
      set((state) => ({
        messages: {
          ...state.messages,
          [chatId]: (state.messages[chatId] || []).map((m) => {
            // Add to readBy if not sender
            const exists = m.readBy?.some(r => r.userId === userId)
            if (exists) return m
            return {
              ...m,
              readBy: [...(m.readBy || []), { userId, readAt }],
            }
          }),
        },
      }))
    })

    // Typing start
    socket.on('typing:start', ({ chatId, userId }) => {
      get().setTyping(chatId, userId, true)
    })

    // Typing stop
    socket.on('typing:stop', ({ chatId, userId }) => {
      get().setTyping(chatId, userId, false)
    })

    // Presence events
    socket.on('user:online', ({ userId }) => {
      get().setUserOnline(userId)
      // Update online status in chat lists
      set((state) => ({
        chats: state.chats.map((c) => {
          if (c.chatType === 'direct') {
            return {
              ...c,
              participants: c.participants.map((p) =>
                p._id === userId ? { ...p, isOnline: true } : p
              ),
            }
          }
          return c
        }),
      }))
    })

    socket.on('user:offline', ({ userId, lastSeen }) => {
      get().setUserOffline(userId)
      // Update offline status in chat lists
      set((state) => ({
        chats: state.chats.map((c) => {
          if (c.chatType === 'direct') {
            return {
              ...c,
              participants: c.participants.map((p) =>
                p._id === userId ? { ...p, isOnline: false, lastSeen } : p
              ),
            }
          }
          return c
        }),
      }))
    })

    set({ socketListenersRegistered: true })
  },

  cleanupSocketListeners: (socket) => {
    if (!socket || !get().socketListenersRegistered) return

    socket.off('connect')
    socket.off('message:receive')
    socket.off('chat:update')
    socket.off('message:deleted')
    socket.off('message:delivered')
    socket.off('messages:read')
    socket.off('typing:start')
    socket.off('typing:stop')
    socket.off('user:online')
    socket.off('user:offline')

    set({ socketListenersRegistered: false })
  },
}))

export default useChatStore
