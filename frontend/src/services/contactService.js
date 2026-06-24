// ============================================================
// BakBak Chat - Contact API Service
// File: frontend/src/services/contactService.js
// ============================================================

import api from '@/lib/axios';

const contactService = {
  /** Get all contacts for the current user */
  getContacts: async () => {
    const res = await api.get('/contacts');
    return res.data;
  },

  /** Add a contact */
  addContact: async (userId, nickname = '', addedVia = 'username') => {
    const res = await api.post('/contacts', { userId, nickname, addedVia });
    return res.data;
  },

  /** Remove a contact */
  removeContact: async (contactId) => {
    const res = await api.delete(`/contacts/${contactId}`);
    return res.data;
  },

  /** Toggle favorite status */
  toggleFavorite: async (contactId) => {
    const res = await api.put(`/contacts/${contactId}/favorite`);
    return res.data;
  },

  /** Toggle block status */
  toggleBlock: async (contactId) => {
    const res = await api.put(`/contacts/${contactId}/block`);
    return res.data;
  },

  /** Check if a specific user is in contacts */
  checkContact: async (userId) => {
    const res = await api.get(`/contacts/check/${userId}`);
    return res.data;
  },
};

export default contactService;
