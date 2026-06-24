// ============================================================
// BakBak Chat - Isolated Offline Message Queue Manager
// File: frontend/src/services/syncQueue.js
// ============================================================

import offlineService from './offlineService';
import toast from 'react-hot-toast';

let isProcessing = false;

export const syncQueue = {
  /**
   * Queue a text message to be sent when internet connectivity is restored
   */
  async queueMessage(chatId, text) {
    const tempMsg = {
      chatId,
      text,
      queuedAt: new Date().toISOString()
    };
    await offlineService.addQueuedMessage(tempMsg);
    toast.success('Message queued! Will sync when online. ⏳');
  },

  /**
   * Drain the queue by sending all queued messages
   */
  async processQueue() {
    if (isProcessing) return;
    if (!navigator.onLine) return;

    try {
      const queued = await offlineService.getQueuedMessages();
      if (queued.length === 0) return;

      isProcessing = true;
      console.log(`📡 Online detected! Syncing ${queued.length} offline message(s)...`);
      toast.loading(`Syncing ${queued.length} offline message(s)...`, { id: 'sync-toast' });

      // Dynamically import chatStore to avoid circular references at boot time
      const chatStoreModule = await import('@/store/chatStore');
      const sendTextMessage = chatStoreModule.default.getState().sendTextMessage;

      for (const msg of queued) {
        try {
          await sendTextMessage(msg.chatId, msg.text);
          await offlineService.removeQueuedMessage(msg.id);
        } catch (err) {
          console.error(`Failed to sync message ${msg.id}:`, err);
        }
      }

      toast.success('All offline messages synced! 🎉', { id: 'sync-toast' });
    } catch (error) {
      console.error('Error during sync queue execution:', error);
    } finally {
      isProcessing = false;
    }
  },

  /**
   * Initialize browser event listeners for online connectivity changes
   */
  init() {
    window.addEventListener('online', () => {
      this.processQueue();
    });
    // Check immediately on startup
    if (navigator.onLine) {
      this.processQueue();
    }
  }
};
