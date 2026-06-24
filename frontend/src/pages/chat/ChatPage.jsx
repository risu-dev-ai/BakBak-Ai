// ============================================================
// BakBak Chat - Chat Page (Gemini Glassmorphic Overhaul)
// File: frontend/src/pages/chat/ChatPage.jsx
// ============================================================

import React, { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'
import useAuthStore from '@/store/authStore'
import useChatStore from '@/store/chatStore'
import useContactStore from '@/store/contactStore'
import useCallStore from '@/store/callStore'
import storyService from '@/services/storyService'
import mediaService from '@/services/mediaService'
import userService from '@/services/userService'
import Avatar from '@/components/ui/Avatar'
import CachedImage from '@/components/ui/CachedImage'
import { getSocket } from '@/lib/socket'
import { decryptForMe } from '@/lib/crypto'

const desiTemplates = {
  Festivals: [
    "✨ आपको और आपके परिवार को होली की हार्दिक शुभकामनाएं! 🎨",
    "✨ दिवाली के इस पावन पर्व पर आपके जीवन में सुख और समृद्धि आए! 🪔",
    "✨ ईद मुबारक! यह दिन आपके जीवन में खुशियां और अमन लाए। 🌙",
    "✨ Merry Christmas! May your home be filled with joy and peace! 🎄"
  ],
  Shayari: [
    "✍️ हर दिन नया है, हर रात हसीं है, जब तक हमारे पास आप जैसे दोस्त का यकीन है। ✨",
    "✍️ लफ़्ज़ों में क्या तारीफ करूँ आपकी, आप तो दिल में धड़कन बन कर रहते हैं। ❤️",
    "✍️ वक्त तो रेत की तरह फिसल जाता है, पर सच्ची दोस्ती का साया हमेशा साथ रहता है। 🤝",
    "✍️ दिल से दिल की बात करते हैं हम, आपकी दोस्ती पर नाज़ करते हैं हम। 👑"
  ],
  'Morning/Night': [
    "☀️ सुप्रभात! एक नई सुबह, एक नई उमंग। आपका दिन शुभ हो! 😊",
    "☀️ Good Morning! Have a productive and positive day ahead! 🚀",
    "🌙 शुभ रात्रि! मीठे सपनों के साथ सो जाइए, कल फिर नई उम्मीद जगानी है। 😴",
    "🌙 Good Night! Rest well and dream big. 💤"
  ],
  'Desi Jokes': [
    "😂 पप्पू: यार मेरी पत्नी बहुत खर्चीली है, रोज़ 1000 रुपये मांगती है।\nगप्पू: इतने रुपयों का क्या करती है?\nपप्पू: पता नहीं, कभी दिए ही नहीं! 😜",
    "😂 टीचर: 'मूर्ख' शब्द का स्त्रीलिंग बताओ।\nछात्र: 'मूर्ख' का कोई स्त्रीलिंग नहीं होता सर, क्योंकि बेवकूफी में दोनों बराबर हैं! 👑",
    "😂 गोलू: डॉक्टर साहब, मुझे नींद में चलने की बीमारी है।\nडॉक्टर: रात को जेब में गेहूं के दाने डाल लिया करो, जहाँ जहाँ जाओगे, वापस ढूंढने में आसानी होगी! 🤪"
  ]
}

const popularEmojis = [
  '😊','😂','😭','🥺','❤️','👍','🔥','🙌','😎','😍','😘','💀','🎉','✨','🙏','🤣','🤔','😅','👀','✔️',
  '🤩','🥳','🥱','😴','🤤','😋','😜','🤪','🤫','🤭','💡','🚀','💻','📱','🔋','👑','💥','🌟','🍕','🍻',
  '🇮🇳','💯','👏','🤝','💔','💖','💙','💚','💛','💜','🖤','🤍','🙄','😡','😢','😮','🤐','🤡','👽','🤖'
]

export default function ChatPage() {
  const navigate = useNavigate()
  const { user, token } = useAuthStore()
  const {
    chats, activeChat, messages, typingUsers,
    loadingChats, loadingMessages,
    fetchChats, fetchMessages, setActiveChat,
    createDirectChat, createGroupChat,
    sendTextMessage, deleteMessage,
    initializeSocketListeners, cleanupSocketListeners
  } = useChatStore()
  const { contacts, fetchContacts, addContact } = useContactStore()

  // UI States
  const [isDesiDrawerOpen, setIsDesiDrawerOpen] = useState(false)
  const [desiCategory, setDesiCategory] = useState('Festivals')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState('') // Exact search feedback state
  const [messageText, setMessageText] = useState('')
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false)
  const [groupName, setGroupName] = useState('')
  const [groupDescription, setGroupDescription] = useState('')
  const [selectedUsersForGroup, setSelectedUsersForGroup] = useState([])
  const [uploadingMedia, setUploadingMedia] = useState(false)

  // Status/Story States
  const [storyFeed, setStoryFeed] = useState([])
  const [viewingStory, setViewingStory] = useState(null)
  const [storyIndex, setStoryIndex] = useState(0)

  // Decryption Cache
  const [decryptedTexts, setDecryptedTexts] = useState({})

  // Emoji Picker Drawer State
  const [showEmojiPicker, setShowEmojiPicker] = useState(false)

  // Dialog/Overlay States
  const [selectedContactForPopUp, setSelectedContactForPopUp] = useState(null) // Conditional Bottom Sheet
  const [selectedFriendProfile, setSelectedFriendProfile] = useState(null)   // Friend Profile modal

  // Pagination / Performance sliding window
  const [visibleCount, setVisibleCount] = useState(50)

  const handleScroll = (e) => {
    const { scrollTop, scrollHeight } = e.currentTarget
    if (scrollTop === 0) {
      const chatMsgs = messages[activeChat?._id] || []
      if (visibleCount < chatMsgs.length) {
        const oldScrollHeight = scrollHeight
        setVisibleCount((prev) => Math.min(prev + 50, chatMsgs.length))
        setTimeout(() => {
          if (e.target) {
            e.target.scrollTop = e.target.scrollHeight - oldScrollHeight
          }
        }, 0)
      }
    }
  }

  const messageEndRef = useRef(null)
  const mediaInputRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const storyProgressTimer = useRef(null)

  // ── Initialize Chat/Socket ─────────────────────────────────
  useEffect(() => {
    if (!token) return
    fetchChats()
    const socket = getSocket()
    if (socket) initializeSocketListeners(socket)
    return () => cleanupSocketListeners()
  }, [token])

  // ── Load active chat history ──────────────────────────────
  useEffect(() => {
    if (activeChat?._id) {
      setVisibleCount(50)
      fetchMessages(activeChat._id)
      const socket = getSocket()
      if (socket) socket.emit('chat:join', activeChat._id)
    }
  }, [activeChat?._id])

  // ── Auto-scroll to bottom ──────────────────────────────────
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages[activeChat?._id]])

  // ── Exact Match Search Logic ─────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(async () => {
      if (searchQuery.trim().length > 0) {
        setSearching(true)
        setSearchError('')
        try {
          const res = await userService.searchUsers(searchQuery)
          setSearchResults(res.data?.users || [])
        } catch (err) {
          setSearchResults([])
          setSearchError(err?.response?.data?.message || 'User Not Found')
        } finally {
          setSearching(false)
        }
      } else {
        setSearchResults([])
        setSearchError('')
      }
    }, 400)
    return () => clearTimeout(timer)
  }, [searchQuery])

  // ── Decrypt messages ──────────────────────────────────────────
  useEffect(() => {
    if (!activeChat?._id) return
    const msgs = messages[activeChat._id] || []
    msgs.forEach(async (msg) => {
      if (decryptedTexts[msg._id] || msg.isDeleted) return
      if (!msg.encryptedContent || msg.encryptedContent.length === 0) return

      const myEnc = msg.encryptedContent.find(c => c.recipientId === user?._id)
      if (!myEnc) return
      if (myEnc.iv === '__PLAINTEXT__' || myEnc.iv === 'mock_iv_phase_3') {
        setDecryptedTexts(prev => ({ ...prev, [msg._id]: myEnc.ciphertext }))
        return
      }

      try {
        const senderPublicKey = msg.sender?.publicKey || null
        const plain = await decryptForMe(msg.encryptedContent, senderPublicKey, user?._id)
        setDecryptedTexts(prev => ({ ...prev, [msg._id]: plain }))
      } catch {
        setDecryptedTexts(prev => ({ ...prev, [msg._id]: '🔒 Unable to decrypt' }))
      }
    })
  }, [messages, activeChat?._id, user?._id])

  // ── Decrypt last messages for all chats ────────────────────────
  useEffect(() => {
    if (!chats || chats.length === 0) return
    chats.forEach(async (chat) => {
      const lm = chat.lastMessage
      if (!lm || decryptedTexts[lm._id] || lm.isDeleted) return
      if (!lm.encryptedContent || lm.encryptedContent.length === 0) return

      const myEnc = lm.encryptedContent.find(c => c.recipientId === user?._id)
      if (!myEnc) return
      if (myEnc.iv === '__PLAINTEXT__' || myEnc.iv === 'mock_iv_phase_3') {
        setDecryptedTexts(prev => ({ ...prev, [lm._id]: myEnc.ciphertext }))
        return
      }

      try {
        const senderPublicKey = lm.sender?.publicKey || null
        const plain = await decryptForMe(lm.encryptedContent, senderPublicKey, user?._id)
        setDecryptedTexts(prev => ({ ...prev, [lm._id]: plain }))
      } catch {
        setDecryptedTexts(prev => ({ ...prev, [lm._id]: '🔐 Encrypted' }))
      }
    })
  }, [chats, user?._id])

  // ── Typing handler ───────────────────────────────────────────
  const handleTyping = (e) => {
    setMessageText(e.target.value)
    if (!activeChat) return
    const socket = getSocket()
    if (socket) socket.emit('typing:start', { chatId: activeChat._id })
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      socket?.emit('typing:stop', { chatId: activeChat._id })
    }, 2000)
  }

  // ── Emoji Click handler ───────────────────────────────────────
  const handleEmojiClick = (emoji) => {
    setMessageText(prev => prev + emoji)
  }

  // ── Send Message ─────────────────────────────────────────────
  const handleSendMessage = async (e) => {
    e.preventDefault()
    if (!messageText.trim() || !activeChat) return
    try {
      const text = messageText
      setMessageText('')
      setShowEmojiPicker(false)
      const socket = getSocket()
      socket?.emit('typing:stop', { chatId: activeChat._id })
      await sendTextMessage(activeChat._id, text)
    } catch (err) { console.error('Send failed:', err) }
  }

  // ── Media Upload ─────────────────────────────────────────────
  const handleMediaAttach = () => mediaInputRef.current?.click()

  const handleMediaUpload = async (e) => {
    const file = e.target.files?.[0]
    if (!file || !activeChat) return
    setUploadingMedia(true)
    try {
      const res = await mediaService.uploadChatMedia(file, activeChat._id)
      if (!res.success) throw new Error('Upload failed')
      let messageType = 'file'
      if (file.type.startsWith('image/')) messageType = 'image'
      else if (file.type.startsWith('video/')) messageType = 'video'
      else if (file.type.startsWith('audio/')) messageType = 'audio'

      const { encryptForParticipants } = await import('@/lib/crypto')
      const currentUserId = useAuthStore.getState().user?._id
      const caption = messageText.trim() || file.name
      let encryptedContent
      try {
        encryptedContent = await encryptForParticipants(caption, activeChat.participants, currentUserId)
      } catch {
        encryptedContent = activeChat.participants.map(p => ({
          recipientId: p._id, ciphertext: caption, iv: '__PLAINTEXT__',
        }))
      }
      const chatService = (await import('@/services/chatService')).default
      await chatService.sendMessage({
        chatId: activeChat._id, messageType, encryptedContent,
        media: { url: res.data.url, publicId: res.data.publicId, mimeType: res.data.mimeType, originalName: res.data.originalName },
      })
      setMessageText('')
    } catch (err) { console.error('Media upload failed:', err) }
    finally {
      setUploadingMedia(false)
      if (mediaInputRef.current) mediaInputRef.current.value = ''
    }
  }

  // ── Stories ───────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return
    storyService.getStories().then(r => { if (r.success) setStoryFeed(r.data) }).catch(() => {})
  }, [token])

  const handleStoryUpload = () => {
    const input = document.createElement('input')
    input.type = 'file'; input.accept = 'image/*,video/*'
    input.onchange = async (e) => {
      const file = e.target.files?.[0]
      if (!file) return
      const mediaType = file.type.startsWith('video') ? 'video' : 'image'
      toast.loading('Uploading Status...', { id: 'storyUpload' })
      try {
        await storyService.createMediaStory(file, mediaType)
        toast.success('Status uploaded! 🌟', { id: 'storyUpload' })
        const r = await storyService.getStories()
        if (r.success) setStoryFeed(r.data)
      } catch {
        toast.error('Upload failed.', { id: 'storyUpload' })
      }
    }
    input.click()
  }

  // Story autoplay logic
  useEffect(() => {
    if (viewingStory) {
      if (storyProgressTimer.current) clearTimeout(storyProgressTimer.current)
      
      const currentStoryObj = viewingStory.stories[storyIndex]
      if (currentStoryObj) {
        // Automatically mark status as viewed
        storyService.viewStory(currentStoryObj._id).catch(() => {})
      }

      storyProgressTimer.current = setTimeout(() => {
        if (storyIndex < viewingStory.stories.length - 1) {
          setStoryIndex(prev => prev + 1)
        } else {
          setViewingStory(null)
        }
      }, 5000) // 5 seconds per story
    }
    return () => clearTimeout(storyProgressTimer.current)
  }, [viewingStory, storyIndex])

  // ── Chat/Group Helpers ───────────────────────────────────────
  const handleStartDirectChat = async (recipientId) => {
    try {
      const chat = await createDirectChat(recipientId)
      setActiveChat(chat)
      setSearchQuery('')
      setSearchResults([])
    } catch (err) { console.error('Failed:', err) }
  }

  const openGroupModal = async () => {
    setIsGroupModalOpen(true)
    try {
      await fetchContacts()
    } catch { }
  }

  const toggleGroupUser = (userId) => {
    setSelectedUsersForGroup(prev =>
      prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]
    )
  }

  const handleCreateGroup = async (e) => {
    e.preventDefault()
    if (!groupName.trim() || selectedUsersForGroup.length === 0) return
    try {
      const chat = await createGroupChat({ groupName: groupName.trim(), groupDescription: groupDescription.trim(), participants: selectedUsersForGroup })
      setActiveChat(chat)
      setIsGroupModalOpen(false)
      setGroupName(''); setGroupDescription(''); setSelectedUsersForGroup([])
    } catch (err) { console.error('Group creation failed:', err) }
  }

  // ── Conditional Pop-up & Profile Modal Handlers ──────────────────
  const handleAvatarClick = (contactUser) => {
    const statusGroup = storyFeed.find(feed => feed.author._id === contactUser._id)
    if (statusGroup && statusGroup.stories.length > 0) {
      setSelectedContactForPopUp({ contactUser, statusGroup })
    } else {
      setSelectedFriendProfile(contactUser)
    }
  }

  // ── Display Helpers ──────────────────────────────────────────
  const formatTime = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    const now = new Date()
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1)
    if (d.toDateString() === yesterday.toDateString()) return 'Yesterday'
    return d.toLocaleDateString([], { day: '2-digit', month: '2-digit', year: '2-digit' })
  }

  const getChatDisplayName = (chat) => {
    if (chat.chatType === 'group') return chat.groupName
    const other = chat.participants.find(p => p._id !== user?._id)
    return other?.displayName || other?.username || 'Unknown'
  }

  const getChatAvatar = (chat) => {
    if (chat.chatType === 'group') return { url: chat.groupAvatar?.url || '', displayName: chat.groupName }
    return chat.participants.find(p => p._id !== user?._id)
  }

  const getOtherParticipant = (chat) => {
    if (chat.chatType === 'group') return null
    return chat.participants.find(p => p._id !== user?._id)
  }

  const getLastMessagePreview = (chat) => {
    const lm = chat.lastMessage
    if (!lm) return 'Tap to start chatting...'
    if (lm.isDeleted) return '🚫 This message was deleted'
    if (lm.messageType === 'image') return '📷 Photo'
    if (lm.messageType === 'video') return '🎬 Video'
    if (lm.messageType === 'audio') return '🎵 Audio'
    
    if (decryptedTexts[lm._id]) return decryptedTexts[lm._id].substring(0, 30)
    
    const enc = lm.encryptedContent?.find(c => c.recipientId === user?._id)
    if (enc?.iv === '__PLAINTEXT__') return enc.ciphertext.substring(0, 30)
    return '🔐 Encrypted'
  }

  // Render Thumbnail for story ring
  const renderStoryThumbnail = (group) => {
    const latestStory = group.stories[0]
    if (!latestStory) return null

    if (latestStory.mediaType === 'image') {
      return (
        <div 
          className="w-full h-full rounded-full overflow-hidden bg-cover bg-center" 
          style={{ backgroundImage: `url(${latestStory.media.url})` }}
        />
      )
    }

    if (latestStory.mediaType === 'video') {
      return (
        <div className="w-full h-full rounded-full overflow-hidden relative bg-black">
          <video src={latestStory.media.url} muted loop autoPlay className="w-full h-full object-cover opacity-80" />
          <div className="absolute inset-0 bg-cyan-500/10 flex items-center justify-center">
            <span className="text-[8px]">▶️</span>
          </div>
        </div>
      )
    }

    // Text status
    return (
      <div 
        className="w-full h-full rounded-full flex items-center justify-center text-center p-1" 
        style={{ backgroundColor: latestStory.backgroundColor || '#1a1a2e' }}
      >
        <span className="text-[7px] font-bold text-white leading-tight truncate w-full">
          {latestStory.textContent}
        </span>
      </div>
    )
  }

  const renderTicks = (msg) => {
    if (msg.sender._id !== user?._id) return null
    const readCount = msg.readBy?.length || 0
    const deliveredCount = msg.deliveredTo?.length || 0

    if (readCount > 0) {
      return (
        <span className="inline-flex ml-1">
          <svg className="w-4 h-3" viewBox="0 0 16 11" fill="none">
            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L6.044 6.36 3.614 3.98a.457.457 0 0 0-.33-.14.493.493 0 0 0-.381.178.529.529 0 0 0 .025.736l2.766 2.74c.2.2.48.178.68-.025L11.071 1.39a.529.529 0 0 0 0-.736z" fill="#00e5ff"/>
            <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L10.044 6.36 9.3 5.64l-.685.736 1.13 1.1c.2.2.48.178.68-.025L15.071 1.39a.529.529 0 0 0 0-.736z" fill="#00e5ff"/>
          </svg>
        </span>
      )
    }
    if (deliveredCount > 0) {
      return (
        <span className="inline-flex ml-1">
          <svg className="w-4 h-3" viewBox="0 0 16 11" fill="none">
            <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L6.044 6.36 3.614 3.98a.457.457 0 0 0-.33-.14.493.493 0 0 0-.381.178.529.529 0 0 0 .025.736l2.766 2.74c.2.2.48.178.68-.025L11.071 1.39a.529.529 0 0 0 0-.736z" fill="#ffffff70"/>
            <path d="M15.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L10.044 6.36 9.3 5.64l-.685.736 1.13 1.1c.2.2.48.178.68-.025L15.071 1.39a.529.529 0 0 0 0-.736z" fill="#ffffff70"/>
          </svg>
        </span>
      )
    }
    return (
      <span className="inline-flex ml-1">
        <svg className="w-3 h-3" viewBox="0 0 12 11" fill="none">
          <path d="M11.071.653a.457.457 0 0 0-.304-.102.493.493 0 0 0-.381.178L6.044 6.36 3.614 3.98a.457.457 0 0 0-.33-.14.493.493 0 0 0-.381.178.529.529 0 0 0 .025.736l2.766 2.74c.2.2.48.178.68-.025L11.071 1.39a.529.529 0 0 0 0-.736z" fill="#ffffff40"/>
        </svg>
      </span>
    )
  }

  // ── Active Chat View ─────────────────────────────────────────
  if (activeChat) {
    const otherUser = getOtherParticipant(activeChat)
    return (
      <div className="flex flex-col h-screen bg-wa-bg relative">
        {/* Chat Header */}
        <header className="wa-header gap-3 flex-shrink-0 z-10">
          <button onClick={() => setActiveChat(null)} className="p-1 -ml-1 text-white/80 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <div 
            className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
            onClick={() => handleAvatarClick(otherUser)}
          >
            <Avatar user={getChatAvatar(activeChat)} size="sm" />
            <div className="min-w-0">
              <p className="text-white font-semibold text-[15px] truncate">{getChatDisplayName(activeChat)}</p>
              <p className="text-white/50 text-xs truncate">
                {typingUsers[activeChat._id]?.length > 0 ? (
                  <span className="text-primary-500 animate-pulse">typing...</span>
                ) : activeChat.chatType === 'direct' ? (
                  otherUser?.isOnline ? 'Online' : 'Offline'
                ) : `${activeChat.participants.length} members`}
              </p>
            </div>
          </div>
          {activeChat.chatType === 'direct' && (
            <div className="flex items-center gap-2">
              <button onClick={() => {
                if (otherUser) useCallStore.getState().startCall(otherUser._id, otherUser.displayName || otherUser.username, otherUser.avatar?.url, 'audio')
              }} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </button>
              <button onClick={() => {
                if (otherUser) useCallStore.getState().startCall(otherUser._id, otherUser.displayName || otherUser.username, otherUser.avatar?.url, 'video')
              }} className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-full transition-all">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          )}
        </header>

        {/* E2E Notice */}
        <div className="bg-primary-500/10 text-center py-1.5 px-4 flex-shrink-0 border-b border-white/5">
          <p className="text-[10px] text-primary-500 flex items-center justify-center gap-1 font-medium tracking-wide uppercase">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
            Messages and calls are end-to-end encrypted.
          </p>
        </div>

        {/* Messages Area */}
        <div onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-4 space-y-2 wa-chat-bg">
          {loadingMessages ? (
            <div className="flex justify-center py-10 text-white/30 text-sm font-medium">Loading history...</div>
          ) : (messages[activeChat._id] || []).slice(-visibleCount).map(msg => {
            const isSent = msg.sender._id === user?._id
            const text = msg.isDeleted
              ? '🚫 This message was deleted'
              : decryptedTexts[msg._id] || msg.encryptedContent?.find(c => c.recipientId === user?._id)?.ciphertext || '🔐 Decrypting...'

            return (
              <div key={msg._id} className={`flex ${isSent ? 'justify-end' : 'justify-start'} animate-fade-in`}>
                <div className={isSent ? 'bubble-sent' : 'bubble-received'}>
                  {activeChat.chatType === 'group' && !isSent && (
                    <p className="text-[11px] font-bold text-primary-500 mb-0.5">
                      {msg.sender.displayName || msg.sender.username}
                    </p>
                  )}
                  {msg.media?.url && (
                    <div className="mb-1.5 -mx-1.5 -mt-1 overflow-hidden rounded-xl border border-white/10">
                      {msg.messageType === 'video' ? (
                        <video src={msg.media.url} controls className="max-w-full max-h-48 rounded-xl" />
                      ) : msg.messageType === 'image' ? (
                        <CachedImage src={msg.media.url} alt="" className="max-w-full max-h-48 rounded-xl object-cover" />
                      ) : msg.messageType === 'audio' ? (
                        <audio src={msg.media.url} controls className="w-48 bg-wa-teal rounded-lg scale-90" />
                      ) : (
                        <a href={msg.media.url} target="_blank" rel="noopener noreferrer" className="text-xs text-primary-500 underline p-2 block bg-white/5">
                          📎 {msg.media.originalName || 'Download File'}
                        </a>
                      )}
                    </div>
                  )}
                  <p className={`text-[13.5px] leading-relaxed ${msg.isDeleted ? 'italic text-white/40' : ''}`}>
                    {text}
                  </p>
                  <div className="flex items-center justify-end gap-0.5 -mb-1 mt-1">
                    <span className="text-[9px] text-white/40">{formatTime(msg.createdAt)}</span>
                    {renderTicks(msg)}
                  </div>
                </div>
              </div>
            )
          })}
          <div ref={messageEndRef} />
        </div>

        {/* EMOJI PICKER DRAWER */}
        {showEmojiPicker && (
          <div className="bg-wa-teal/90 backdrop-blur-2xl border-t border-white/10 p-3 h-52 z-30 flex-shrink-0 animate-in slide-in-from-bottom duration-200">
            <div className="flex justify-between items-center pb-2 mb-2 border-b border-white/5">
              <span className="text-xs text-white/50 font-bold uppercase tracking-wider">Emoji Picker</span>
              <button 
                type="button" 
                onClick={() => setShowEmojiPicker(false)}
                className="text-xs text-primary-500 font-bold"
              >
                CLOSE
              </button>
            </div>
            <div className="grid grid-cols-8 gap-2 overflow-y-auto h-36 pr-1 justify-items-center">
              {popularEmojis.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => handleEmojiClick(emoji)}
                  className="text-2xl hover:scale-125 transition-transform duration-100 p-1"
                >
                  {emoji}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Desi Greetings Drawer */}
        {isDesiDrawerOpen && (
          <div className="bg-wa-teal/95 backdrop-blur-2xl border-t border-white/10 px-3 py-3 flex flex-col h-60 z-30 flex-shrink-0 animate-in slide-in-from-bottom duration-200">
            <div className="flex gap-2 overflow-x-auto pb-2 border-b border-white/5 scrollbar-hide">
              {['Festivals', 'Shayari', 'Morning/Night', 'Desi Jokes'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setDesiCategory(cat)}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-full whitespace-nowrap transition-all ${
                    desiCategory === cat
                      ? 'bg-primary-500 text-wa-teal-dark shadow-glass-glow'
                      : 'bg-white/5 text-white/60 border border-white/10 hover:bg-white/10'
                  }`}
                >
                  {cat === 'Festivals' ? '🎉 Festivals' : cat === 'Shayari' ? '✍️ Shayari' : cat === 'Morning/Night' ? '☀️ Morning/Night' : '😂 Desi Jokes'}
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-2">
              {desiTemplates[desiCategory]?.map((tmpl, idx) => (
                <div
                  key={idx}
                  onClick={() => {
                    setMessageText(tmpl)
                    setIsDesiDrawerOpen(false)
                  }}
                  className="bg-white/5 border border-white/10 p-3 rounded-xl hover:border-primary-500 cursor-pointer hover:bg-white/10 transition-all text-sm text-white/90 shadow-sm"
                >
                  {tmpl}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Chat Input */}
        <form onSubmit={handleSendMessage} className="flex items-center gap-2 px-3 py-3 bg-wa-teal/50 backdrop-blur-md border-t border-white/5 flex-shrink-0">
          <input type="file" ref={mediaInputRef} onChange={handleMediaUpload} accept="image/*,video/*,audio/*,.pdf" className="hidden" />
          <div className="flex-1 flex items-center bg-white/5 border border-white/10 rounded-full px-3 gap-2">
            <button 
              type="button" 
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker)
                setIsDesiDrawerOpen(false)
              }}
              className={`p-1.5 hover:scale-110 transition-transform ${showEmojiPicker ? 'text-primary-500' : 'text-white/40 hover:text-white'}`}
            >
              😊
            </button>
            <button
              type="button"
              onClick={() => {
                setIsDesiDrawerOpen(!isDesiDrawerOpen)
                setShowEmojiPicker(false)
              }}
              className={`p-1.5 hover:scale-110 transition-transform ${isDesiDrawerOpen ? 'text-primary-500' : 'text-white/40 hover:text-white'}`}
              title="Desi Greetings & Shayari"
            >
              🙏
            </button>
            <input
              type="text"
              value={messageText}
              onChange={handleTyping}
              placeholder="Type a message..."
              className="flex-1 py-2.5 text-sm bg-transparent outline-none text-white placeholder:text-white/30"
            />
            <button type="button" onClick={handleMediaAttach} disabled={uploadingMedia} className="p-1 text-white/40 hover:text-white transition-all">
              {uploadingMedia ? (
                <svg className="animate-spin w-5 h-5 text-primary-500" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
              ) : (
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                </svg>
              )}
            </button>
          </div>
          <button 
            type="submit" 
            disabled={!messageText.trim()}
            className="w-11 h-11 rounded-full bg-gradient-to-r from-primary-500 to-wa-blue flex items-center justify-center text-wa-teal-dark shadow-glass-glow flex-shrink-0 disabled:opacity-40 transition-all active:scale-95"
          >
            <svg className="w-5 h-5 transform rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          </button>
        </form>

        {/* ── CONDITIONAL BOTTOM SHEET DIALOG ─────────────────────── */}
        {selectedContactForPopUp && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end justify-center animate-fade-in" onClick={() => setSelectedContactForPopUp(null)}>
            <div 
              className="w-full max-w-md glass-panel p-6 rounded-t-3xl border-t border-white/15 space-y-4 animate-slide-up"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="w-12 h-1 bg-white/20 rounded-full mx-auto mb-2" />
              <div className="flex items-center gap-3">
                <Avatar user={selectedContactForPopUp.contactUser} size="md" />
                <div>
                  <h3 className="font-bold text-white text-[16px]">{selectedContactForPopUp.contactUser.displayName || selectedContactForPopUp.contactUser.username}</h3>
                  <p className="text-white/40 text-xs font-medium">Status active • Choose an action</p>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  onClick={() => {
                    setViewingStory(selectedContactForPopUp.statusGroup)
                    setStoryIndex(0)
                    setSelectedContactForPopUp(null)
                  }}
                  className="glass-button py-3 text-sm font-semibold bg-primary-500 text-wa-teal-dark hover:brightness-110"
                >
                  🟢 View Status
                </button>
                <button
                  onClick={() => {
                    setSelectedFriendProfile(selectedContactForPopUp.contactUser)
                    setSelectedContactForPopUp(null)
                  }}
                  className="glass-button py-3 text-sm font-semibold border-white/10 text-white hover:bg-white/10"
                >
                  👤 View Profile
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── FRIEND PROFILE MODAL DRAWER ─────────────────────────── */}
        {selectedFriendProfile && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in" onClick={() => setSelectedFriendProfile(null)}>
            <div 
              className="w-full max-w-sm glass-panel p-6 rounded-3xl border border-white/10 space-y-6 animate-bounce-in max-h-[85vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex justify-between items-center border-b border-white/5 pb-2">
                <span className="text-xs text-white/40 font-bold uppercase tracking-wider">Contact Card</span>
                <button 
                  onClick={() => setSelectedFriendProfile(null)}
                  className="text-white/60 hover:text-white text-xs font-bold"
                >
                  CLOSE
                </button>
              </div>

              <div className="flex flex-col items-center text-center">
                <Avatar user={selectedFriendProfile} size="xl" className="ring-4 ring-primary-500/20" />
                <h2 className="mt-3 text-xl font-bold text-white">{selectedFriendProfile.displayName || selectedFriendProfile.username}</h2>
                <p className="text-xs text-primary-500 font-semibold mt-0.5">@{selectedFriendProfile.username}</p>
                <p className="text-white/60 text-sm mt-3.5 px-4 italic border-l-2 border-primary-500/50">
                  "{selectedFriendProfile.bio || 'Hey there! I am using Anti-Gravity.'}"
                </p>
              </div>

              <div className="space-y-3.5 pt-2">
                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-lg">✉️</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Email</p>
                    <p className="text-sm text-white/95 truncate font-medium">{selectedFriendProfile.email || 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-lg">📱</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">Phone</p>
                    <p className="text-sm text-white/95 font-medium">{selectedFriendProfile.phone ? `+91 ${selectedFriendProfile.phone.replace(/^\+91\s?/, '')}` : 'Not provided'}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl border border-white/5">
                  <span className="text-lg">🔑</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] text-white/40 font-bold uppercase tracking-wider">E2EE PublicKey</p>
                    <p className="text-xs text-primary-500 font-mono truncate">
                      {selectedFriendProfile.publicKey ? selectedFriendProfile.publicKey : 'Inactive'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── Chats List View (Home) ───────────────────────────────────
  return (
    <div className="flex flex-col h-screen bg-wa-bg page-with-nav relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-primary-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-gradient-to-br from-wa-blue/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="bg-wa-teal/60 backdrop-blur-xl text-white px-4 pt-4 pb-3 border-b border-white/5 flex-shrink-0 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-primary-500 to-wa-blue flex items-center justify-center shadow-glass-glow">
              <span className="text-sm font-bold text-wa-teal-dark">💬</span>
            </div>
            <h1 className="text-lg font-display font-bold tracking-tight">Anti-Gravity</h1>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => navigate('/settings')} className="p-2 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 active:scale-95 transition-all">
              <svg className="w-5 h-5 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-2.5 mt-2">
          <button onClick={() => navigate('/profile')} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl border border-white/10 bg-white/5 text-xs font-semibold hover:bg-white/10 active:scale-[0.98] transition-all">
            👤 Profile
          </button>
          <button onClick={openGroupModal} className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark text-xs font-bold hover:brightness-110 active:scale-[0.98] transition-all shadow-glass-glow">
            👥 New Group
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="px-3 py-2.5 bg-wa-teal/40 backdrop-blur-md border-b border-white/5 z-10">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="search"
              placeholder="Search exact email or phone number..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="wa-input pl-9"
            />
          </div>
        </div>
      </div>

      {/* Story Bar - Redesigned with Media Thumbnails */}
      <div className="px-3 py-3 bg-wa-teal/30 backdrop-blur-md border-b border-white/5 flex-shrink-0 z-10">
        <div className="flex gap-4 overflow-x-auto scrollbar-hide">
          <button onClick={handleStoryUpload} className="flex flex-col items-center gap-1.5 flex-shrink-0">
            <div className="w-14 h-14 story-ring-empty flex items-center justify-center">
              <div className="w-full h-full rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-all">
                <span className="text-lg">➕</span>
              </div>
            </div>
            <span className="text-[10px] text-white/50 w-14 text-center truncate font-medium">Your Status</span>
          </button>
          {storyFeed.map(group => (
            <button 
              key={group.author._id} 
              onClick={() => { setViewingStory(group); setStoryIndex(0) }} 
              className="flex flex-col items-center gap-1.5 flex-shrink-0"
            >
              <div className="story-ring w-[58px] h-[58px] p-[2.5px] rounded-full">
                <div className="w-full h-full rounded-full overflow-hidden bg-wa-teal-dark border-2 border-wa-teal-dark">
                  {renderStoryThumbnail(group)}
                </div>
              </div>
              <span className="text-[10px] text-white/70 w-14 text-center truncate font-medium">
                {group.author._id === user?._id ? 'You' : group.author.displayName?.split(' ')[0]}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Chat List or Search Results */}
      <div className="flex-1 overflow-y-auto bg-transparent z-10 pr-1">
        {searchQuery.trim().length > 0 ? (
          <div className="animate-fade-in">
            <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider px-4 py-3">Search Results</p>
            {searching ? (
              <div className="text-center py-8 text-sm text-white/30">Searching...</div>
            ) : searchResults.length > 0 ? (
              searchResults.map(u => {
                const isAlreadyContact = contacts.some(c => c.contact?._id === u._id)
                return (
                  <div key={u._id} className="wa-list-item">
                    <div onClick={() => handleStartDirectChat(u._id)} className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer">
                      <Avatar user={u} size="sm" />
                      <div className="min-w-0">
                        <p className="text-[15px] font-semibold text-white truncate">{u.displayName || u.username}</p>
                        <p className="text-xs text-white/40 truncate">{u.statusText || u.email || ''}</p>
                      </div>
                    </div>
                    <div>
                      {!isAlreadyContact ? (
                        <button
                          onClick={async (e) => {
                            e.stopPropagation()
                            try {
                              await addContact(u._id, u.displayName || u.username, 'email')
                              toast.success('Saved to contacts!')
                            } catch (err) {
                              toast.error('Failed to save contact')
                            }
                          }}
                          className="px-3 py-1.5 bg-primary-500/10 hover:bg-primary-500/20 text-primary-500 text-xs font-bold rounded-xl transition-all mr-2 flex items-center gap-1 border border-primary-500/20"
                        >
                          Save
                        </button>
                      ) : (
                        <span className="text-xs text-primary-500 font-bold mr-3 flex items-center gap-0.5" title="Saved Contact">
                          ✓ Saved
                        </span>
                      )}
                    </div>
                  </div>
                )
              })
            ) : (
              <div className="text-center py-8 text-sm text-white/30 font-semibold">{searchError || 'User Not Found'}</div>
            )}
          </div>
        ) : loadingChats ? (
          <div className="text-center py-10 text-sm text-white/30 font-medium">Loading conversation list...</div>
        ) : chats.length > 0 ? (
          chats.map(chat => {
            const unreadCount = chat.unreadCount || 0
            const isTyping = typingUsers[chat._id]?.length > 0
            const otherParticipant = getOtherParticipant(chat)
            return (
              <div 
                key={chat._id} 
                onClick={() => setActiveChat(chat)} 
                className="wa-list-item"
              >
                <div 
                  className="relative cursor-pointer"
                  onClick={(e) => {
                    if (otherParticipant) {
                      e.stopPropagation()
                      handleAvatarClick(otherParticipant)
                    }
                  }}
                >
                  <Avatar user={getChatAvatar(chat)} size="sm" />
                  {chat.chatType === 'direct' && otherParticipant?.isOnline && (
                    <div className="absolute bottom-0 right-0 status-online shadow-glass-glow" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-[15px] font-semibold text-white truncate">{getChatDisplayName(chat)}</p>
                    <span className={`text-[10px] flex-shrink-0 ${unreadCount > 0 ? 'text-primary-500 font-bold' : 'text-white/40'}`}>
                      {formatTime(chat.updatedAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <p className={`text-[13px] truncate ${isTyping ? 'text-primary-500 font-bold' : 'text-white/45'}`}>
                      {isTyping ? 'Typing...' : getLastMessagePreview(chat)}
                    </p>
                    {unreadCount > 0 && <span className="wa-badge">{unreadCount}</span>}
                  </div>
                </div>
              </div>
            )
          })
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-white/30">
            <div className="w-20 h-20 rounded-full bg-white/5 border border-white/10 flex items-center justify-center mb-4">
              <span className="text-3xl">👋</span>
            </div>
            <p className="text-sm font-semibold text-white/60">No active chats found</p>
            <p className="text-xs mt-1 text-white/30">Search complete email or phone to start</p>
          </div>
        )}
      </div>

      {/* ═══ GROUP CREATION MODAL ═══ */}
      {isGroupModalOpen && (
        <div className="fixed inset-0 z-50 bg-wa-bg animate-slide-in-right flex flex-col relative">
          <header className="wa-header gap-3 flex-shrink-0">
            <button onClick={() => setIsGroupModalOpen(false)} className="p-1 -ml-1 text-white/80 hover:text-white">
              <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <h2 className="text-lg font-semibold flex-1">New Group</h2>
            <button
              onClick={handleCreateGroup}
              disabled={!groupName.trim() || selectedUsersForGroup.length === 0}
              className="text-xs font-bold bg-primary-500 hover:brightness-110 text-wa-teal-dark px-3 py-1.5 rounded-full disabled:opacity-40"
            >
              NEXT
            </button>
          </header>

          <form onSubmit={handleCreateGroup} className="flex-1 overflow-y-auto p-4 space-y-6">
            <div className="flex flex-col items-center py-6 bg-white/5 rounded-2xl border border-white/5">
              <div className="w-20 h-20 rounded-full bg-primary-500/20 border border-primary-500/30 flex items-center justify-center mb-4">
                <svg className="w-10 h-10 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                placeholder="Enter group name"
                className="text-center text-lg font-medium text-white outline-none placeholder:text-white/20 border-b-2 border-primary-500 pb-1 w-56 bg-transparent"
              />
            </div>

            <div className="space-y-2">
              <p className="text-[11px] text-white/40 font-bold uppercase tracking-wider px-1">Select Contacts</p>
              {contacts.length > 0 ? (
                contacts.map(c => {
                  const isChecked = selectedUsersForGroup.includes(c.contact?._id)
                  return (
                    <div 
                      key={c._id}
                      onClick={() => toggleGroupUser(c.contact?._id)}
                      className="flex items-center justify-between p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 cursor-pointer"
                    >
                      <div className="flex items-center gap-3">
                        <Avatar user={c.contact} size="sm" />
                        <span className="text-sm font-semibold">{c.nickname || c.contact?.displayName}</span>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={isChecked}
                        onChange={() => {}} // handled by div
                        className="w-4 h-4 rounded border-white/20 text-primary-500 focus:ring-0"
                      />
                    </div>
                  )
                })
              ) : (
                <div className="text-center py-6 text-xs text-white/30">No saved contacts found. Add friends first!</div>
              )}
            </div>
          </form>
        </div>
      )}

      {/* Fullscreen Story Viewer */}
      {viewingStory && (
        <div className="fixed inset-0 z-70 bg-black flex flex-col justify-between">
          {/* Progress Bars */}
          <div className="flex gap-1 px-2 pt-3">
            {viewingStory.stories.map((s, idx) => (
              <div key={s._id} className="h-1 flex-1 bg-white/20 rounded-full overflow-hidden">
                <div 
                  className={`h-full bg-white transition-all duration-[5000ms] linear ${
                    idx < storyIndex ? 'w-full' : idx === storyIndex ? 'w-full' : 'w-0'
                  }`}
                />
              </div>
            ))}
          </div>

          {/* Viewer Header */}
          <div className="flex justify-between items-center px-4 py-3 bg-gradient-to-b from-black/60 to-transparent">
            <div className="flex items-center gap-2">
              <Avatar user={viewingStory.author} size="sm" />
              <div>
                <p className="text-white text-xs font-semibold">{viewingStory.author.displayName}</p>
                <p className="text-white/40 text-[9px]">{formatTime(viewingStory.stories[storyIndex]?.createdAt)}</p>
              </div>
            </div>
            <button onClick={() => setViewingStory(null)} className="text-white/60 hover:text-white p-2">
              ✕
            </button>
          </div>

          {/* Story Content */}
          <div className="flex-1 flex items-center justify-center relative px-4">
            {/* Left 1/3 tap area */}
            <div 
              className="absolute left-0 top-0 bottom-0 w-1/3 z-20 cursor-pointer"
              onClick={() => {
                if (storyIndex > 0) setStoryIndex(prev => prev - 1)
              }}
            />
            {/* Right 2/3 tap area */}
            <div 
              className="absolute right-0 top-0 bottom-0 w-2/3 z-20 cursor-pointer"
              onClick={() => {
                if (storyIndex < viewingStory.stories.length - 1) {
                  setStoryIndex(prev => prev + 1)
                } else {
                  setViewingStory(null)
                }
              }}
            />

            {viewingStory.stories[storyIndex]?.mediaType === 'image' ? (
              <CachedImage 
                src={viewingStory.stories[storyIndex].media.url} 
                alt="" 
                className="max-h-[70vh] max-w-full rounded-2xl object-contain shadow-2xl z-10" 
              />
            ) : viewingStory.stories[storyIndex]?.mediaType === 'video' ? (
              <video 
                src={viewingStory.stories[storyIndex].media.url} 
                autoPlay 
                playsInline
                className="max-h-[70vh] max-w-full rounded-2xl object-contain z-10" 
              />
            ) : (
              <div 
                className="w-full max-w-sm aspect-square rounded-3xl flex items-center justify-center p-6 text-center text-xl font-bold text-white z-10 shadow-2xl"
                style={{ backgroundColor: viewingStory.stories[storyIndex].backgroundColor }}
              >
                {viewingStory.stories[storyIndex].textContent}
              </div>
            )}
          </div>

          {/* Footer (Views count) */}
          <div className="text-center pb-8 pt-3 text-white/50 text-xs">
            👁️ {viewingStory.stories[storyIndex]?.viewedBy?.length || 0} views
          </div>
        </div>
      )}
    </div>
  )
}
