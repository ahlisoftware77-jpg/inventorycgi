import { NextResponse } from 'next/server';
import { authenticateRequest, getCorsHeaders } from '@/lib/api-security';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';



export async function OPTIONS(request: Request) {
  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });
}

export async function POST(request: Request) {
  try {
    await authenticateRequest(request);
    const { fileId } = await request.json();
    
    if (!fileId) {
      return NextResponse.json({ error: "No fileId provided" }, { status: 400, headers: getCorsHeaders(request) });
    }

    // Ambil setting dari Firestore
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (!settingsDoc.exists()) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500, headers: getCorsHeaders(request) });
    }
    const settingsData = settingsDoc.data();
    const clientId = settingsData.googleClientId;
    const clientSecret = settingsData.googleClientSecret;
    const refreshToken = settingsData.googleRefreshToken;

    if (!clientId || !clientSecret || !refreshToken) {
      return NextResponse.json({ error: "Google Drive OAuth Credentials not configured" }, { status: 500, headers: getCorsHeaders(request) });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Proses Delete
    await drive.files.delete({
      fileId: fileId,
    });

    return NextResponse.json({ 
      success: true, 
      deletedFileId: fileId
    }, { headers: getCorsHeaders(request) });

  } catch (error: any) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: error.message || "Failed to delete" }, { status: 500, headers: getCorsHeaders(request) });
  }
}
