// ============================================================
// BakBak Chat - Calls and Contacts Management Page
// File: frontend/src/pages/calls/CallsPage.jsx
// ============================================================

import React, { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useCallStore from '@/store/callStore'
import useContactStore from '@/store/contactStore'
import useChatStore from '@/store/chatStore'
import useAuthStore from '@/store/authStore'
import userService from '@/services/userService'
import Avatar from '@/components/ui/Avatar'
import { toast } from 'react-hot-toast'

export default function CallsPage() {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const { contacts, loadingContacts, fetchContacts, addContact, removeContact } = useContactStore()
  const { createDirectChat, setActiveChat } = useChatStore()
  const { startCall, callHistory, loadingHistory, fetchCallHistory } = useCallStore()

  const [activeTab, setActiveTab] = useState('all')
  const tabs = ['All', 'Missed', 'Contacts']

  // Add Contact Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [nickname, setNickname] = useState('')
  const [selectedUserToSave, setSelectedUserToSave] = useState(null)

  // Fetch contacts and call history on mount
  useEffect(() => {
    fetchContacts()
    fetchCallHistory()
  }, [])

  const handleSearchUser = async (e) => {
    e.preventDefault()
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      toast.error('Search query must be at least 2 characters')
      return
    }
    setSearching(true)
    try {
      const res = await userService.searchUsers(searchQuery)
      setSearchResults(res.data?.users || [])
      setSelectedUserToSave(null)
    } catch (err) {
      setSearchResults([])
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }

  const handleSaveContact = async () => {
    if (!selectedUserToSave) return
    try {
      await addContact(selectedUserToSave._id, nickname, 'phone')
      toast.success(`${nickname || selectedUserToSave.displayName || selectedUserToSave.username} saved to contacts!`)
      setIsAddModalOpen(false)
      setSearchQuery('')
      setSearchResults([])
      setNickname('')
      setSelectedUserToSave(null)
    } catch (err) {
      toast.error(err.message || 'Failed to save contact')
    }
  }

  const handleStartChatFromContact = async (contactUserId) => {
    try {
      const chat = await createDirectChat(contactUserId)
      setActiveChat(chat)
      navigate('/chat')
    } catch (err) {
      toast.error('Failed to start chat')
    }
  }

  // Format timestamp helper
  const formatCallTime = (dateStr) => {
    const d = new Date(dateStr)
    return d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  // Format call duration helper
  const formatDuration = (secs) => {
    if (!secs) return ''
    const m = Math.floor(secs / 60)
    const s = secs % 60
    return m > 0 ? `${m}m ${s}s` : `${s}s`
  }

  // Filter history
  const filteredHistory = callHistory.filter(call => {
    if (activeTab === 'all') return true
    if (activeTab === 'missed') {
      return call.status === 'missed' || call.status === 'rejected' || call.status === 'no-answer'
    }
    return false
  })

  return (
    <div className="h-screen overflow-y-auto bg-wa-bg text-white page-with-nav relative">
      {/* Background glow effects */}
      <div className="absolute top-[-10%] left-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-primary-500/10 to-transparent blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[55%] h-[55%] rounded-full bg-gradient-to-br from-wa-blue/10 to-transparent blur-[120px] pointer-events-none" />

      {/* Header */}
      <div className="bg-wa-teal/60 backdrop-blur-xl px-4 pt-[calc(env(safe-area-inset-top,0px)+1rem)] pb-3 border-b border-white/5 flex-shrink-0 z-10 sticky top-0 flex flex-col">
        <div className="flex items-center w-full justify-between">
          <h1 className="text-xl font-bold font-display tracking-wide">Calls & Contacts</h1>
          {activeTab === 'contacts' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-2 bg-white/5 border border-white/10 hover:bg-white/10 text-white rounded-full transition-all active:scale-95"
              title="Add Contact"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
          )}
        </div>

        {/* Tabs Capsule */}
        <div className="flex w-full mt-3.5 bg-white/5 border border-white/10 rounded-full p-1">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 py-1.5 rounded-full text-xs font-semibold tracking-wide transition-all ${
                activeTab === tab.toLowerCase()
                  ? 'bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark shadow-glass-glow'
                  : 'text-white/60 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="px-4 py-4 relative z-10">
        {activeTab !== 'contacts' && (
          <div>
            {loadingHistory ? (
              <div className="text-center py-10 text-sm text-white/40">Loading history...</div>
            ) : filteredHistory.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-white/40">
                <svg className="w-14 h-14 mb-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
                <p className="text-sm font-medium">No call logs found</p>
                <p className="text-xs mt-1 text-white/30">Start calls from Contacts or any chat screen</p>
              </div>
            ) : (
              <div className="glass-panel border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5">
                {filteredHistory.map((call) => {
                  const partner = call.caller?._id === user?._id ? call.receiver : call.caller
                  if (!partner) return null

                  const isOut = call.caller?._id === user?._id
                  const isMissed = call.status === 'missed' || call.status === 'rejected' || call.status === 'no-answer'
                  const partnerName = partner.displayName || partner.username

                  return (
                    <div key={call._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar user={partner} size="sm" />
                        <div className="min-w-0">
                          <p className={`text-[14.5px] font-semibold truncate ${isMissed ? 'text-rose-400' : 'text-white'}`}>
                            {partnerName}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {/* Direction Icon */}
                            {isOut ? (
                              <svg className="w-3.5 h-3.5 text-primary-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                              </svg>
                            ) : (
                              <svg className={`w-3.5 h-3.5 ${isMissed ? 'text-rose-500' : 'text-emerald-500'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                              </svg>
                            )}
                            
                            <p className="text-[11px] text-white/40 font-medium">
                              {formatCallTime(call.createdAt)}
                              {call.status === 'connected' && call.duration > 0 && ` • ${formatDuration(call.duration)}`}
                              {isMissed && ` • ${call.status === 'rejected' ? 'Rejected' : 'Missed'}`}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Call Back Button */}
                      <button
                        onClick={() => startCall(partner._id, partnerName, partner.avatar?.url, call.callType)}
                        className="p-2.5 rounded-full bg-white/5 border border-white/10 hover:bg-white/10 transition-all text-white/80 hover:text-white"
                        title={`Call back (${call.callType})`}
                      >
                        {call.callType === 'video' ? (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        ) : (
                          <svg className="w-4.5 h-4.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        )}
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'contacts' && (
          <div>
            {loadingContacts ? (
              <div className="text-center py-10 text-sm text-white/40">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-white/40 text-center">
                <svg className="w-14 h-14 mb-4 text-white/20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-medium">No contacts saved yet</p>
                <p className="text-xs mt-1 mb-4 text-white/30">Save contacts to sync online status updates</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-5 py-2 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark text-xs font-bold rounded-full shadow hover:brightness-110 active:scale-95 transition-all"
                >
                  + Add Contact
                </button>
              </div>
            ) : (
              <div className="glass-panel border border-white/10 rounded-3xl overflow-hidden divide-y divide-white/5">
                {contacts.map((c) => {
                  const targetUser = c.contact
                  if (!targetUser) return null
                  const displayName = c.nickname || targetUser.displayName || targetUser.username

                  return (
                    <div key={c._id} className="flex items-center justify-between p-4 hover:bg-white/5 transition-all">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <Avatar user={targetUser} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[14.5px] font-semibold text-white truncate">{displayName}</p>
                          <p className="text-xs text-white/40 truncate">
                            {targetUser.phone || targetUser.email || `@${targetUser.username}`}
                          </p>
                          {targetUser.statusText && (
                            <p className="text-[11px] text-white/30 italic truncate mt-0.5">
                              "{targetUser.statusText}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1">
                        {/* Chat Button */}
                        <button
                          onClick={() => handleStartChatFromContact(targetUser._id)}
                          className="p-2 text-primary-500 hover:bg-white/5 rounded-full transition-all"
                          title="Chat"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        
                        {/* Audio Call Button */}
                        <button
                          onClick={() => startCall(targetUser._id, displayName, targetUser.avatar?.url, 'audio')}
                          className="p-2 text-primary-500 hover:bg-white/5 rounded-full transition-all"
                          title="Audio Call"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>

                        {/* Video Call Button */}
                        <button
                          onClick={() => startCall(targetUser._id, displayName, targetUser.avatar?.url, 'video')}
                          className="p-2 text-primary-500 hover:bg-white/5 rounded-full transition-all"
                          title="Video Call"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>

                        {/* Remove Contact Button */}
                        <button
                          onClick={async () => {
                            if (window.confirm(`Remove ${displayName} from contacts?`)) {
                              try {
                                await removeContact(c._id)
                                toast.success('Contact removed')
                              } catch (err) {
                                toast.error('Failed to remove contact')
                              }
                            }
                          }}
                          className="p-2 text-rose-400 hover:bg-white/5 rounded-full transition-all"
                          title="Delete Contact"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Add Contact Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="glass-panel p-6 rounded-3xl border border-white/10 w-full max-w-md relative animate-bounce-in text-white">
            <h2 className="text-lg font-semibold mb-4">Add Contact</h2>
            
            <form onSubmit={handleSearchUser} className="space-y-4">
              <div>
                <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1.5">
                  Search by Username, Email, or Phone
                </label>
                <div className="flex gap-2.5">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter phone, email or username..."
                    className="flex-1 px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary-500 transition-all text-white placeholder:text-white/20"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark text-xs font-bold rounded-xl hover:brightness-110 transition-all shadow-glass-glow"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            {/* Search Results */}
            <div className="mt-4 max-h-60 overflow-y-auto space-y-3">
              {searching ? (
                <div className="text-center text-sm text-white/30 py-4">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div>
                  <p className="text-xs text-white/40 font-semibold mb-2">Search Results:</p>
                  {searchResults.map((u) => {
                    const isAlreadyContact = contacts.some(c => c.contact?._id === u._id)
                    
                    return (
                      <div
                        key={u._id}
                        onClick={() => !isAlreadyContact && setSelectedUserToSave(u)}
                        className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                          selectedUserToSave?._id === u._id
                            ? 'border-primary-500/50 bg-primary-500/10'
                            : 'border-white/5 hover:bg-white/5'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar user={u} size="xs" />
                          <div className="min-w-0">
                            <p className="text-sm font-semibold truncate">
                              {u.displayName || u.username}
                            </p>
                            <p className="text-xs text-white/40 truncate">
                              {u.phone || u.email || `@${u.username}`}
                            </p>
                          </div>
                        </div>
                        <div>
                          {isAlreadyContact ? (
                            <span className="text-xs text-emerald-400 font-medium">Saved</span>
                          ) : selectedUserToSave?._id === u._id ? (
                            <span className="text-xs text-primary-500 font-bold">Selected</span>
                          ) : (
                            <span className="text-xs text-white/30">Select</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : searchQuery && !searching ? (
                <div className="text-center text-sm text-white/30 py-4">No users found</div>
              ) : null}
            </div>

            {/* Save Form */}
            {selectedUserToSave && (
              <div className="mt-4 pt-4 border-t border-white/5 space-y-3.5">
                <div>
                  <label className="block text-[10px] text-white/40 font-bold uppercase tracking-wider mb-1.5">
                    Contact Nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname (e.g. Papa, Amit, Boss)..."
                    className="w-full px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-sm focus:outline-none focus:border-primary-500 transition-all text-white placeholder:text-white/20"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectedUserToSave(null)
                      setNickname('')
                    }}
                    className="px-4 py-2 border border-white/10 text-white/70 text-xs font-semibold rounded-xl hover:bg-white/5 transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContact}
                    className="px-4 py-2 bg-gradient-to-r from-primary-500 to-wa-blue text-wa-teal-dark text-xs font-bold rounded-xl hover:brightness-110 transition-all"
                  >
                    Save Contact
                  </button>
                </div>
              </div>
            )}

            {!selectedUserToSave && (
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setIsAddModalOpen(false)
                    setSearchQuery('')
                    setSearchResults([])
                    setSelectedUserToSave(null)
                  }}
                  className="px-4 py-2 border border-white/10 text-white/70 text-xs font-semibold rounded-xl hover:bg-white/5 transition-all"
                >
                  Close
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
