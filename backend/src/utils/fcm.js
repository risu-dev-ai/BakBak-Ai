// ============================================================
// BakBak Chat - FCM HTTP v1 Dispatch Helper
// File: backend/src/utils/fcm.js
// ============================================================

const jwt = require('jsonwebtoken');

let cachedToken = null;
let tokenExpiry = 0;

/**
 * Get Google OAuth2 access token for Firebase Messaging scope
 * using service account credentials from environment variables.
 */
async function getAccessToken() {
  const projectId = process.env.FCM_PROJECT_ID;
  const clientEmail = process.env.FCM_CLIENT_EMAIL;
  // Replace escaped newlines if passed in env
  const privateKey = process.env.FCM_PRIVATE_KEY 
    ? process.env.FCM_PRIVATE_KEY.replace(/\\n/g, '\n') 
    : null;

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error('FCM credentials are not configured. Check FCM_PROJECT_ID, FCM_CLIENT_EMAIL, and FCM_PRIVATE_KEY.');
  }

  // Use cached token if still valid (with 5-minute buffer)
  if (cachedToken && Date.now() < tokenExpiry - 300000) {
    return cachedToken;
  }

  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 3600;

  const payload = {
    iss: clientEmail,
    sub: clientEmail,
    aud: 'https://oauth2.googleapis.com/token',
    iat,
    exp,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  };

  const assertion = jwt.sign(payload, privateKey, { algorithm: 'RS256' });

  const response = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Google OAuth2 token fetch failed: ${errorText}`);
  }

  const data = await response.json();
  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in * 1000);

  return cachedToken;
}

/**
 * Send high-priority FCM push notification to a specific device token.
 * @param {string} fcmToken - Target device push token
 * @param {object} payload - Notification payload { title, body, data }
 */
async function sendPushNotification(fcmToken, { title, body, data = {} }) {
  try {
    const projectId = process.env.FCM_PROJECT_ID;
    if (!projectId || !fcmToken) return;

    const accessToken = await getAccessToken();

    // Map all data fields to strings (FCM HTTP v1 requires all properties in 'data' object to be strings)
    const stringifiedData = {};
    for (const key in data) {
      if (data[key] !== undefined && data[key] !== null) {
        stringifiedData[key] = typeof data[key] === 'object' ? JSON.stringify(data[key]) : String(data[key]);
      }
    }

    const message = {
      message: {
        token: fcmToken,
        notification: {
          title,
          body,
        },
        data: stringifiedData,
        android: {
          priority: 'high',
          notification: {
            sound: 'default',
            click_action: 'FCM_PLUGIN_ACTIVITY',
            channel_id: 'bakbak-chat-messages',
          },
        },
        apns: {
          payload: {
            aps: {
              sound: 'default',
              alert: {
                title,
                body,
              },
            },
          },
        },
      },
    };

    const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`FCM push dispatch failed: ${errorText}`);
    } else {
      console.log(`📡 High-priority FCM push sent successfully to token: ${fcmToken.substring(0, 10)}...`);
    }
  } catch (err) {
    console.warn('FCM dispatch encountered a non-fatal error:', err.message);
  }
}

module.exports = {
  sendPushNotification,
};
