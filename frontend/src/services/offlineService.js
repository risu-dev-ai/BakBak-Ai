// ============================================================
// BakBak Chat - Modular Offline Storage Service (IndexedDB)
// File: frontend/src/services/offlineService.js
// ============================================================

const DB_NAME = 'bakbak_offline_db';
const DB_VERSION = 1;

let dbPromise = null;

const getDB = () => {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains('chats')) {
        db.createObjectStore('chats', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('messages')) {
        db.createObjectStore('messages', { keyPath: 'chatId' });
      }
      if (!db.objectStoreNames.contains('profile')) {
        db.createObjectStore('profile', { keyPath: '_id' });
      }
      if (!db.objectStoreNames.contains('sync_queue')) {
        db.createObjectStore('sync_queue', { keyPath: 'id', autoIncrement: true });
      }
    };

    request.onsuccess = (e) => resolve(e.target.result);
    request.onerror = (e) => reject(e.target.error);
  });

  return dbPromise;
};

const offlineService = {
  // ── CHATS ──────────────────────────────────────────────────
  async getChats() {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('chats', 'readonly');
        const store = tx.objectStore('chats');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('OfflineDB error fetching chats:', err);
      return [];
    }
  },

  async saveChats(chats) {
    if (!chats || !Array.isArray(chats)) return;
    try {
      const db = await getDB();
      const tx = db.transaction('chats', 'readwrite');
      const store = tx.objectStore('chats');
      store.clear(); // Clear old list to avoid stales
      chats.forEach(chat => {
        if (chat && chat._id) {
          store.put(chat);
        }
      });
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('OfflineDB error saving chats:', err);
    }
  },

  // ── MESSAGES ───────────────────────────────────────────────
  async getMessages(chatId) {
    if (!chatId) return [];
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('messages', 'readonly');
        const store = tx.objectStore('messages');
        const req = store.get(chatId);
        req.onsuccess = () => resolve(req.result ? req.result.messages : []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`OfflineDB error fetching messages for ${chatId}:`, err);
      return [];
    }
  },

  async saveMessages(chatId, messages) {
    if (!chatId || !messages) return;
    try {
      const db = await getDB();
      const tx = db.transaction('messages', 'readwrite');
      const store = tx.objectStore('messages');
      store.put({ chatId, messages });
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(`OfflineDB error saving messages for ${chatId}:`, err);
    }
  },

  // ── USER PROFILE ───────────────────────────────────────────
  async getProfile(userId) {
    if (!userId) return null;
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('profile', 'readonly');
        const store = tx.objectStore('profile');
        const req = store.get(userId);
        req.onsuccess = () => resolve(req.result || null);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error(`OfflineDB error fetching profile:`, err);
      return null;
    }
  },

  async saveProfile(profile) {
    if (!profile || !profile._id) return;
    try {
      const db = await getDB();
      const tx = db.transaction('profile', 'readwrite');
      const store = tx.objectStore('profile');
      store.put(profile);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error(`OfflineDB error saving profile:`, err);
    }
  },

  // ── SYNC QUEUE ─────────────────────────────────────────────
  async getQueuedMessages() {
    try {
      const db = await getDB();
      return new Promise((resolve, reject) => {
        const tx = db.transaction('sync_queue', 'readonly');
        const store = tx.objectStore('sync_queue');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result || []);
        req.onerror = () => reject(req.error);
      });
    } catch (err) {
      console.error('OfflineDB error fetching queued messages:', err);
      return [];
    }
  },

  async addQueuedMessage(msg) {
    try {
      const db = await getDB();
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.add(msg);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('OfflineDB error adding queued message:', err);
    }
  },

  async removeQueuedMessage(id) {
    try {
      const db = await getDB();
      const tx = db.transaction('sync_queue', 'readwrite');
      const store = tx.objectStore('sync_queue');
      store.delete(id);
      return new Promise((resolve, reject) => {
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch (err) {
      console.error('OfflineDB error deleting queued message:', err);
    }
  }
};

export default offlineService;
