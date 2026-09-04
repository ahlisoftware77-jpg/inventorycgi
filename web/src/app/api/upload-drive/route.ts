import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Readable } from 'stream';

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400, headers: corsHeaders });
    }

    // Ambil setting dari Firestore
const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (!settingsDoc.exists()) {
      return NextResponse.json({ error: "Settings not found" }, { status: 500, headers: corsHeaders });
    }
    const settingsData = settingsDoc.data();
    const clientId = settingsData.googleClientId;
    const clientSecret = settingsData.googleClientSecret;
    const refreshToken = settingsData.googleRefreshToken;
    const folderId = settingsData.googleDriveFolderId;

    if (!clientId || !clientSecret || !refreshToken || !folderId) {
      return NextResponse.json({ error: "Google Drive OAuth Credentials (Client ID, Secret, Refresh Token) or Folder ID not configured" }, { status: 500, headers: corsHeaders });
    }

    const oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret
    );

    oauth2Client.setCredentials({
      refresh_token: refreshToken
    });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });

    // Ubah File (Blob) menjadi buffer stream
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const stream = new Readable();
    stream.push(buffer);
    stream.push(null);

    // Proses Upload
    const fileMetadata = {
      name: file.name,
      parents: [folderId],
    };
    
    const media = {
      mimeType: file.type,
      body: stream,
    };

    const uploadRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id, webViewLink, webContentLink',
    });

    const fileId = uploadRes.data.id;
    if (!fileId) {
      throw new Error("Gagal mendapatkan fileId dari Google Drive");
    }

    // Set permission agar public (anyone with link can view)
    await drive.permissions.create({
      fileId: fileId,
      requestBody: {
        role: 'reader',
        type: 'anyone',
      },
    });

    // Kembalikan fileId agar bisa direkayasa untuk URL hover
    return NextResponse.json({ 
      success: true, 
      fileId: fileId,
      webViewLink: uploadRes.data.webViewLink,
      webContentLink: uploadRes.data.webContentLink
    }, { headers: corsHeaders });

  } catch (error: any) {
    console.error("Upload error:", error);
    return NextResponse.json({ error: error.message || "Failed to upload" }, { status: 500, headers: corsHeaders });
  }
}
