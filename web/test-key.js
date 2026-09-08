require('@next/env').loadEnvConfig('.');
const { cert } = require('firebase-admin/app');
const key = process.env.FIREBASE_PRIVATE_KEY
  ? process.env.FIREBASE_PRIVATE_KEY.replace(/^["']|["']$/g, '').replace(/\\n/g, '\n')
  : undefined;

try {
  cert({ projectId: 'test', clientEmail: 'test@test.com', privateKey: key });
  console.log('SUCCESS');
} catch (e) {
  console.error(e);
}
