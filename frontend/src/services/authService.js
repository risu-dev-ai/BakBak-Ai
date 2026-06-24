// ============================================================
// BakBak Chat - Auth API Service
// File: frontend/src/services/authService.js
// Wraps all auth-related API calls
// ============================================================

import api from '@/lib/axios';

const authService = {
  /**
   * Register a new user
   * @param {{ username, email, phone, password, displayName }} data
   */
  register: async (data) => {
    const res = await api.post('/auth/register', data);
    return res.data;
  },

  /**
   * Login with email, username, or phone
   * @param {{ identifier, password }} data
   */
  login: async (data) => {
    const res = await api.post('/auth/login', data);
    return res.data;
  },

  /**
   * Get current logged-in user
   */
  getMe: async () => {
    const res = await api.get('/auth/me');
    return res.data;
  },

  /**
   * Logout — marks user offline on server
   */
  logout: async () => {
    const res = await api.post('/auth/logout');
    return res.data;
  },

  /**
   * Verify registration or login OTP
   * @param {{ emailOrPhone, otp }} data
   */
  verifyOtp: async (data) => {
    const res = await api.post('/auth/verify-otp', data);
    return res.data;
  },

  /**
   * Resend OTP verification code
   * @param {{ emailOrPhone }} data
   */
  resendOtp: async (data) => {
    const res = await api.post('/auth/resend-otp', data);
    return res.data;
  },
};

export default authService;
