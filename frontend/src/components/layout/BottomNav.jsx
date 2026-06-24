import React from 'react'
import { useLocation, useNavigate } from 'react-router-dom'

const tabs = [
  {
    id: 'chats',
    label: 'Chats',
    path: '/chat',
    icon: (active) => (
      <svg className="w-5.5 h-5.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    ),
  },
  {
    id: 'calls',
    label: 'Calls',
    path: '/calls',
    icon: (active) => (
      <svg className="w-5.5 h-5.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
      </svg>
    ),
  },
  {
    id: 'status',
    label: 'Status',
    path: '/status',
    icon: (active) => (
      <svg className="w-5.5 h-5.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <circle cx="12" cy="12" r="9" />
      </svg>
    ),
  },
  {
    id: 'more',
    label: 'More',
    path: '/settings',
    icon: (active) => (
      <svg className="w-5.5 h-5.5" fill={active ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={active ? 0 : 1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
      </svg>
    ),
  },
]

export default function BottomNav() {
  const location = useLocation()
  const navigate = useNavigate()

  const getActiveTab = () => {
    if (location.pathname.startsWith('/chat')) return 'chats'
    if (location.pathname.startsWith('/calls')) return 'calls'
    if (location.pathname.startsWith('/status')) return 'status'
    if (location.pathname.startsWith('/settings') || location.pathname.startsWith('/profile')) return 'more'
    return 'chats'
  }

  const activeTab = getActiveTab()

  return (
    <nav className="bottom-nav">
      {tabs.map((tab) => {
        const isActive = activeTab === tab.id
        return (
          <button
            key={tab.id}
            onClick={() => navigate(tab.path)}
            className={`bottom-nav-item relative ${isActive ? 'active' : ''}`}
          >
            {tab.icon(isActive)}
            <span className="text-[10px] font-semibold mt-0.5 tracking-wider">
              {tab.label}
            </span>
            {isActive && (
              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-4 h-1 rounded-full bg-primary-500 shadow-glass-glow animate-pulse" />
            )}
          </button>
        )
      })}
    </nav>
  )
}
