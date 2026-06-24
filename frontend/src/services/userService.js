// ============================================================
// BakBak Chat - User API Service
// File: frontend/src/services/userService.js
// ============================================================

import api from '@/lib/axios';

const userService = {
  /** Get a user's public profile by ID */
  getProfile: async (userId) => {
    const res = await api.get(`/users/${userId}`);
    return res.data;
  },

  /** Update displayName, bio, statusText, email, phone with verification */
  updateProfile: async (data) => {
    const res = await api.put('/users/profile', data);
    return res.data;
  },

  /**
   * Upload avatar image
   * @param {File} file - The image File object from input[type=file]
   */
  uploadAvatar: async (file) => {
    const formData = new FormData();
    formData.append('avatar', file);
    const res = await api.post('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return res.data;
  },

  /** Remove avatar */
  deleteAvatar: async () => {
    const res = await api.delete('/users/avatar');
    return res.data;
  },

  /** Change password */
  changePassword: async ({ currentPassword, newPassword }) => {
    const res = await api.put('/users/change-password', { currentPassword, newPassword });
    return res.data;
  },

  /** Search users by exact email / phone */
  searchUsers: async (query) => {
    const res = await api.get(`/users/search?q=${encodeURIComponent(query)}`);
    return res.data;
  },

  /** Block a user */
  blockUser: async (userId) => {
    const res = await api.post(`/users/${userId}/block`);
    return res.data;
  },

  /** Unblock a user */
  unblockUser: async (userId) => {
    const res = await api.post(`/users/${userId}/unblock`);
    return res.data;
  },

  /** Get list of blocked users */
  getBlockedUsers: async () => {
    const res = await api.get('/users/blocked');
    return res.data;
  },

  /** Save E2EE public key to server */
  savePublicKey: async (publicKey) => {
    const res = await api.put('/users/public-key', { publicKey });
    return res.data;
  },

  /** Request OTP for email/phone profile updates */
  requestProfileUpdateOTP: async (emailOrPhone) => {
    const res = await api.post('/users/profile/request-otp', { emailOrPhone });
    return res.data;
  },
};

export default userService;
