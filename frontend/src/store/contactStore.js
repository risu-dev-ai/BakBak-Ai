// ============================================================
// BakBak Chat - Contact State (Zustand Store)
// File: frontend/src/store/contactStore.js
// ============================================================

import { create } from 'zustand';
import contactService from '@/services/contactService';

const useContactStore = create((set, get) => ({
  // ── State ───────────────────────────────────────────────
  contacts: [],
  loadingContacts: false,
  error: null,

  // ── Actions ─────────────────────────────────────────────
  
  /** Fetch all contacts */
  fetchContacts: async () => {
    set({ loadingContacts: true, error: null });
    try {
      const res = await contactService.getContacts();
      if (res.success) {
        set({ contacts: res.data || [], loadingContacts: false });
      }
    } catch (err) {
      set({ error: err.message || 'Failed to fetch contacts', loadingContacts: false });
    }
  },

  /** Add a contact */
  addContact: async (userId, nickname = '', addedVia = 'username') => {
    try {
      const res = await contactService.addContact(userId, nickname, addedVia);
      if (res.success) {
        set((state) => ({
          contacts: [...state.contacts, res.data],
        }));
        return res.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to add contact');
    }
  },

  /** Remove a contact */
  removeContact: async (contactId) => {
    try {
      const res = await contactService.removeContact(contactId);
      if (res.success) {
        set((state) => ({
          contacts: state.contacts.filter((c) => c._id !== contactId),
        }));
        return true;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to remove contact');
    }
  },

  /** Toggle favorite status */
  toggleFavorite: async (contactId) => {
    try {
      const res = await contactService.toggleFavorite(contactId);
      if (res.success) {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c._id === contactId ? { ...c, isFavorite: res.data.isFavorite } : c
          ),
        }));
        return res.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to toggle favorite');
    }
  },

  /** Toggle block status */
  toggleBlock: async (contactId) => {
    try {
      const res = await contactService.toggleBlock(contactId);
      if (res.success) {
        set((state) => ({
          contacts: state.contacts.map((c) =>
            c._id === contactId ? { ...c, isBlocked: res.data.isBlocked } : c
          ),
        }));
        return res.data;
      }
    } catch (err) {
      throw new Error(err.response?.data?.message || err.message || 'Failed to toggle block status');
    }
  },
}));

export default useContactStore;
