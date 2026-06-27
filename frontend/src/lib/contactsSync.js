// ============================================================
// BakBak Chat - Native Contacts Sync Utility
// File: frontend/src/lib/contactsSync.js
// ============================================================

import { Contacts } from '@capacitor-community/contacts';
import { Capacitor } from '@capacitor/core';
import useContactStore from '@/store/contactStore';

/**
 * Retrieve contacts from local address book and trigger sync with backend.
 */
export async function syncAddressBook() {
  // If not on mobile/native platform, throw mock error or warning
  if (!Capacitor.isNativePlatform()) {
    console.warn('Contacts Sync is only supported on native Android/iOS devices.');
    throw new Error('Address book sync is only supported on native mobile devices.');
  }

  try {
    // 1. Check permissions
    const permission = await Contacts.getPermissions();
    if (!permission.granted) {
      const request = await Contacts.requestPermissions();
      if (!request.granted) {
        throw new Error('Permission denied. Cannot access device contacts.');
      }
    }

    // 2. Read local contacts
    const res = await Contacts.getContacts({
      projection: {
        name: true,
        phones: true,
      }
    });

    const localList = [];
    if (res && res.contacts) {
      res.contacts.forEach((c) => {
        if (!c.phones || c.phones.length === 0) return;
        
        // Build contact full name
        const given = c.name?.given || '';
        const family = c.name?.family || '';
        const name = [given, family].filter(Boolean).join(' ') || c.displayName || 'Unknown';

        c.phones.forEach((p) => {
          if (p.number) {
            localList.push({
              name,
              phone: p.number
            });
          }
        });
      });
    }

    if (localList.length === 0) {
      return { success: true, count: 0, message: 'No contacts found on device.' };
    }

    // 3. Sync with backend database
    const synced = await useContactStore.getState().syncContacts(localList);

    return {
      success: true,
      count: synced.length,
      data: synced
    };
  } catch (err) {
    console.error('Failed to sync address book:', err);
    throw err;
  }
}
