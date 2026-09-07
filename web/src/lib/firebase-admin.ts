import { getApps, initializeApp, cert, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

if (!getApps().length) {
  try {
    if (process.env.FIREBASE_PRIVATE_KEY) {
      initializeApp({
        credential: cert({
          projectId: process.env.FIREBASE_PROJECT_ID,
          clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
          // Properly unescape all variations of newlines and quotes
          privateKey: process.env.FIREBASE_PRIVATE_KEY
            .replace(/\\n/g, '\n')
            .replace(/\\r/g, '\r')
            .replace(/^"|"$/g, '')
            .replace(/^'|'$/g, '')
            .trim(),
        }),
      });
    } else {
      initializeApp(); // Fallback to Application Default Credentials on Firebase
    }
    console.log('Firebase Admin initialized successfully');
  } catch (error) {
    console.error('Firebase Admin initialization error:', error);
  }
}

let authInstance;
try {
  authInstance = getAuth();
} catch (error) {
  console.warn('Firebase Auth not initialized. This is expected during build if credentials are missing.');
  authInstance = null;
}

export const auth = authInstance;
