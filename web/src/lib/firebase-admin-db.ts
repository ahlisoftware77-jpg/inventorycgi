import { getApps, initializeApp, cert } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';

if (!getApps().length) {
  try {
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Handle escaped newlines in the private key and remove any carriage returns
        privateKey: process.env.FIREBASE_PRIVATE_KEY
          ? process.env.FIREBASE_PRIVATE_KEY.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n').replace(/\r/g, '')
          : undefined,
      }),
    });
    console.log('Firebase Admin DB initialized successfully');
  } catch (error) {
    console.error('Firebase Admin DB initialization error:', error);
  }
}

export const db = getApps().length ? getFirestore() : null;
