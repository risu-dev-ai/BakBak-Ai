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
  const { startCall } = useCallStore()

  const [activeTab, setActiveTab] = useState('all')
  const tabs = ['All', 'Missed', 'Contacts']

  // Add Contact Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [nickname, setNickname] = useState('')
  const [selectedUserToSave, setSelectedUserToSave] = useState(null)

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts()
  }, [])

  // Call history mock (retrieve from call history if available, else empty)
  const mockCallHistory = []

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

  return (
    <div className="min-h-screen bg-gray-50 page-with-nav">
      {/* Header */}
      <div className="wa-header flex-col">
        <div className="flex items-center w-full justify-between">
          <h1 className="text-lg font-semibold text-white">Calls & Contacts</h1>
          {activeTab === 'contacts' && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="p-1.5 bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors"
              title="Add Contact"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            </button>
          )}
        </div>
        {/* Tabs */}
        <div className="flex w-full mt-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab.toLowerCase())}
              className={`flex-1 py-2 text-sm font-medium border-b-2 transition-colors ${
                activeTab === tab.toLowerCase()
                  ? 'border-white text-white font-semibold'
                  : 'border-transparent text-white/60 hover:text-white'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-white min-h-[calc(100vh-112px)] shadow-inner">
        {activeTab === 'all' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm font-medium">No call history yet</p>
            <p className="text-xs mt-1">Start a call from your Contacts list or any active chat</p>
          </div>
        )}

        {activeTab === 'missed' && (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400">
            <svg className="w-16 h-16 mb-4 text-red-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
            </svg>
            <p className="text-sm font-medium">No missed calls</p>
          </div>
        )}

        {activeTab === 'contacts' && (
          <div>
            {loadingContacts ? (
              <div className="text-center py-10 text-sm text-gray-400">Loading contacts...</div>
            ) : contacts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 px-4 text-gray-400 text-center">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <p className="text-sm font-medium">No contacts saved yet</p>
                <p className="text-xs mt-1 mb-4">Save contacts by phone, email, or username to sync status updates</p>
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="px-4 py-2 bg-wa-teal text-white text-xs font-semibold rounded-full shadow hover:bg-wa-teal-dark transition-colors"
                >
                  + Add Contact
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {contacts.map((c) => {
                  const targetUser = c.contact
                  if (!targetUser) return null
                  const displayName = c.nickname || targetUser.displayName || targetUser.username

                  return (
                    <div key={c._id} className="flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center gap-3 min-w-0">
                        <Avatar user={targetUser} size="sm" />
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-gray-900 truncate">{displayName}</p>
                          <p className="text-xs text-gray-500 truncate">
                            {targetUser.phone || targetUser.email || `@${targetUser.username}`}
                          </p>
                          {targetUser.statusText && (
                            <p className="text-[11px] text-gray-400 italic truncate mt-0.5">
                              "{targetUser.statusText}"
                            </p>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        {/* Chat Button */}
                        <button
                          onClick={() => handleStartChatFromContact(targetUser._id)}
                          className="p-2 text-wa-teal hover:bg-wa-teal/5 rounded-full transition-colors"
                          title="Chat"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                          </svg>
                        </button>
                        
                        {/* Audio Call Button */}
                        <button
                          onClick={() => startCall(targetUser._id, displayName, targetUser.avatar?.url, 'audio')}
                          className="p-2 text-wa-teal hover:bg-wa-teal/5 rounded-full transition-colors"
                          title="Audio Call"
                        >
                          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                          </svg>
                        </button>

                        {/* Video Call Button */}
                        <button
                          onClick={() => startCall(targetUser._id, displayName, targetUser.avatar?.url, 'video')}
                          className="p-2 text-wa-teal hover:bg-wa-teal/5 rounded-full transition-colors"
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
                          className="p-2 text-red-500 hover:bg-red-50 rounded-full transition-colors"
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
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-lg w-full max-w-md p-6 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Add Contact</h2>
            
            <form onSubmit={handleSearchUser} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Search by Username, Email, or Phone Number
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter phone, email or username..."
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-wa-teal focus:border-wa-teal"
                  />
                  <button
                    type="submit"
                    className="px-4 py-2 bg-wa-teal text-white text-sm font-semibold rounded-lg hover:bg-wa-teal-dark transition-colors"
                  >
                    Search
                  </button>
                </div>
              </div>
            </form>

            {/* Search Results */}
            <div className="mt-4 max-h-60 overflow-y-auto space-y-3">
              {searching ? (
                <div className="text-center text-sm text-gray-400 py-4">Searching...</div>
              ) : searchResults.length > 0 ? (
                <div>
                  <p className="text-xs text-gray-400 font-semibold mb-2">Search Results:</p>
                  {searchResults.map((u) => {
                    // Check if already in contacts
                    const isAlreadyContact = contacts.some(c => c.contact?._id === u._id)
                    
                    return (
                      <div
                        key={u._id}
                        onClick={() => !isAlreadyContact && setSelectedUserToSave(u)}
                        className={`flex items-center justify-between p-3 rounded-lg border transition-all cursor-pointer ${
                          selectedUserToSave?._id === u._id
                            ? 'border-wa-teal bg-wa-teal/5'
                            : 'border-gray-100 hover:bg-gray-50'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <Avatar user={u} size="xs" />
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {u.displayName || u.username}
                            </p>
                            <p className="text-xs text-gray-500 truncate">
                              {u.phone || u.email || `@${u.username}`}
                            </p>
                          </div>
                        </div>
                        <div>
                          {isAlreadyContact ? (
                            <span className="text-xs text-green-600 font-medium">Saved</span>
                          ) : selectedUserToSave?._id === u._id ? (
                            <span className="text-xs text-wa-teal font-bold">Selected</span>
                          ) : (
                            <span className="text-xs text-gray-400">Select</span>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              ) : searchQuery && !searching ? (
                <div className="text-center text-sm text-gray-400 py-4">No users found</div>
              ) : null}
            </div>

            {/* Save Form */}
            {selectedUserToSave && (
              <div className="mt-4 pt-4 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">
                    Contact Nickname
                  </label>
                  <input
                    type="text"
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    placeholder="Enter nickname (e.g. Papa, Amit, Boss)..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-wa-teal focus:border-wa-teal"
                  />
                </div>

                <div className="flex gap-3 justify-end">
                  <button
                    onClick={() => {
                      setSelectedUserToSave(null)
                      setNickname('')
                    }}
                    className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSaveContact}
                    className="px-4 py-2 bg-wa-teal text-white text-sm font-semibold rounded-lg hover:bg-wa-teal-dark transition-colors"
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
                  className="px-4 py-2 border border-gray-300 text-gray-700 text-sm font-semibold rounded-lg hover:bg-gray-50 transition-colors"
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
