import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 200, headers: corsHeaders });
}

export async function POST(request: Request) {
  try {
    const { code, redirectUri } = await request.json();

    if (!code || !redirectUri) {
      return NextResponse.json({ error: 'No code or redirectUri provided' }, { status: 400, headers: corsHeaders });
    }

    // Ambil setting dari Firestore
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (!settingsDoc.exists()) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500, headers: corsHeaders });
    }
    const settingsData = settingsDoc.data();
    const clientId = settingsData.googleClientId;
    const clientSecret = settingsData.googleClientSecret;

    if (!clientId || !clientSecret) {
      return NextResponse.json({ error: "Client ID and Client Secret not found in Settings" }, { status: 500, headers: corsHeaders });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    );

    const { tokens } = await oauth2Client.getToken(code);
    
    if (tokens.refresh_token) {
      return NextResponse.json({ refresh_token: tokens.refresh_token }, { headers: corsHeaders });
    } else {
      if (!settingsData.googleRefreshToken) {
        return NextResponse.json({ error: "No refresh token received from Google. Please disconnect and login again." }, { status: 400, headers: corsHeaders });
      }
      return NextResponse.json({ refresh_token: settingsData.googleRefreshToken, message: "Existing token used" }, { headers: corsHeaders });
    }

  } catch (error: any) {
    console.error("Exchange token error:", error);
    return NextResponse.json({ error: error.message || "Failed to authenticate" }, { status: 500, headers: corsHeaders });
  }
}
