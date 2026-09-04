import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const error = url.searchParams.get('error');

    if (error) {
      return NextResponse.redirect(new URL(`/settings?error=${error}`, request.url));
    }

    if (!code) {
      return NextResponse.json({ error: 'No code provided' }, { status: 400 });
    }

    // Ambil setting dari Firestore
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (!settingsDoc.exists()) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500 });
    }
    const settingsData = settingsDoc.data();
    const clientId = settingsData.googleClientId;
    const clientSecret = settingsData.googleClientSecret;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Client ID and Client Secret not found in Settings" }, { status: 500 });
    }

    const redirectUri = url.hostname === 'localhost' ? `${url.origin}/api/oauth2callback` : 'https://inventorycgi.vercel.app/api/oauth2callback';

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    // Karena Next.js server tidak terotentikasi di Firestore Client SDK,
    // kita lempar refresh_token ke client (browser) agar client yang menyimpannya.
    if (tokens.refresh_token) {
      console.log('Refresh token received, sending to client');
      return NextResponse.redirect(new URL(`/settings?refresh_token=${encodeURIComponent(tokens.refresh_token)}`, request.url));
    } else {
      console.log('No refresh token received.');
      if (!settingsData.googleRefreshToken) {
        return NextResponse.redirect(new URL(`/settings?error=${encodeURIComponent("No refresh token received from Google. Please disconnect and login again.")}`, request.url));
      }
    }

    // Redirect kembali ke halaman Settings
    return NextResponse.redirect(new URL('/settings', request.url));

  } catch (error: any) {
    console.error("OAuth callback error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate" }, { status: 500 });
  }
}
