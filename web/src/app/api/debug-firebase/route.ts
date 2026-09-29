import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  const envStatus = {
    projectId: process.env.FIREBASE_PROJECT_ID ? 'SET' : 'MISSING',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL ? 'SET' : 'MISSING',
    privateKey: process.env.FIREBASE_PRIVATE_KEY ? 'SET (Length: ' + process.env.FIREBASE_PRIVATE_KEY.length + ')' : 'MISSING',
    isProduction: process.env.NODE_ENV === 'production',
  };

  let initResult = 'Not Attempted';
  let dbStatus = 'Not Attempted';

  try {
    const { db } = await import('@/lib/firebase-admin-db');
    if (db) {
      dbStatus = 'DB Initialized Successfully';
      try {
        const snap = await db.collection('settings').doc('email').get();
        initResult = snap.exists ? 'Email Settings Found' : 'Email Settings Not Found';
      } catch (dbError: any) {
        initResult = 'DB Fetch Error: ' + dbError.message;
      }
    } else {
      dbStatus = 'DB is null. Initialization must have failed.';
    }
  } catch (err: any) {
    dbStatus = 'Import Error: ' + err.message;
  }

  return NextResponse.json({ envStatus, dbStatus, initResult });
}
