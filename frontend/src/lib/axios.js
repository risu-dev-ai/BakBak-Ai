// ============================================================
// BakBak Chat - Axios API Client
// File: frontend/src/lib/axios.js
// ============================================================

import axios from 'axios'
import useAuthStore from '@/store/authStore'

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api/v1',
  headers: { 'Content-Type': 'application/json' },
  timeout: 10000, // 10 second timeout
})

// ── Request Interceptor ────────────────────────────────────
// Automatically attach JWT token to every request
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// ── Response Interceptor ───────────────────────────────────
// Handle token expiry globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status

    // Token expired or invalid — force logout
    if (status === 401) {
      useAuthStore.getState().clearAuth()
      // Redirect to login without breaking the router
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }

    return Promise.reject(error.response?.data || error)
  }
)

export default api
