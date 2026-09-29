import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');

  if (!id) {
    return new NextResponse('Missing id', { status: 400 });
  }

  try {
    const settingsDoc = await getDoc(doc(db, "settings", "general"));
    if (!settingsDoc.exists()) throw new Error("Settings not found");
    const settingsData = settingsDoc.data();

    const oauth2Client = new google.auth.OAuth2(settingsData.googleClientId, settingsData.googleClientSecret);
    oauth2Client.setCredentials({ refresh_token: settingsData.googleRefreshToken });

    const drive = google.drive({ version: 'v3', auth: oauth2Client });
    const res = await drive.files.get({ fileId: id, fields: 'thumbnailLink' });

    if (res.data.thumbnailLink) {
      // Use higher resolution thumbnail (replace =s220 with =s500)
      let highResThumb = res.data.thumbnailLink;
      if (highResThumb.endsWith('=s220')) {
        highResThumb = highResThumb.replace('=s220', '=s500');
      }

      return new Response(null, {
        status: 302,
        headers: {
          Location: highResThumb,
          'Cache-Control': 'public, max-age=86400'
        }
      });
    } else {
      return new NextResponse('No thumbnail available', { status: 404 });
    }
  } catch (error) {
    console.error("Thumbnail proxy error:", error);
    return new NextResponse('Error fetching thumbnail', { status: 500 });
  }
}
