// ============================================================
// BakBak Chat - Auth State (Zustand Store)
// File: frontend/src/store/authStore.js
// ============================================================

import { create } from 'zustand'
import { persist } from 'zustand/middleware'

/**
 * Global auth state using Zustand with localStorage persistence.
 * Stores: user object, JWT token, authentication flag.
 */
const useAuthStore = create(
  persist(
    (set, get) => ({
      // ── State ───────────────────────────────────────────────
      user: null,
      token: null,
      isAuthenticated: false,
      e2eeReady: false,  // Whether the user's E2EE keys are set up

      // ── Actions ─────────────────────────────────────────────

      /** Called after successful login/register */
      setAuth: (user, token) => {
        set({ user, token, isAuthenticated: true })
      },

      /** Update user profile data without changing token */
      updateUser: (updatedFields) => {
        set((state) => ({
          user: { ...state.user, ...updatedFields },
        }))
      },

      /** Set E2EE readiness flag */
      setE2EEReady: (ready) => {
        set({ e2eeReady: ready })
      },

      /** Clear all auth state (logout) */
      clearAuth: () => {
        set({ user: null, token: null, isAuthenticated: false, e2eeReady: false })
      },

      /** Getters */
      getToken: () => get().token,
      getUser: () => get().user,
    }),
    {
      name: 'bakbak-auth', // Key in localStorage
      // Only persist essential fields (don't persist sensitive data beyond token)
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
        e2eeReady: state.e2eeReady,
      }),
    }
  )
)

export default useAuthStore
