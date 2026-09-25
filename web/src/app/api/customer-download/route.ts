import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, deleteDoc, increment, serverTimestamp } from 'firebase/firestore';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const linkId = searchParams.get('id');

    if (!linkId) {
      return new NextResponse('Invalid Link ID', { status: 400 });
    }

    const linkRef = doc(db, 'customer_links', linkId);
    const linkSnap = await getDoc(linkRef);

    if (!linkSnap.exists()) {
      return new NextResponse(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Tautan Tidak Ditemukan / Sudah Dihapus</h1>
          <p>Maaf, tautan ini sudah tidak tersedia atau telah dicabut oleh pengirim.</p>
        </body></html>`,
        { status: 404, headers: { 'Content-Type': 'text/html' } }
      );
    }

    const linkData = linkSnap.data();
    const expiresAt = linkData.expiresAt?.seconds ? linkData.expiresAt.seconds * 1000 : 0;
    const isExpired = expiresAt < Date.now();

    if (isExpired) {
      // LAZY DELETION LOGIC
      try {
        const settingsDoc = await getDoc(doc(db, "settings", "general"));
        const settingsData = settingsDoc.data();
        
        if (settingsData && settingsData.googleClientId && settingsData.googleClientSecret && settingsData.googleRefreshToken) {
          const oauth2Client = new google.auth.OAuth2(
            settingsData.googleClientId,
            settingsData.googleClientSecret
          );
          oauth2Client.setCredentials({ refresh_token: settingsData.googleRefreshToken });
          const drive = google.drive({ version: 'v3', auth: oauth2Client });
          
          // Delete from Drive
          try {
            await drive.files.delete({ fileId: linkData.originalFileId });
          } catch (driveErr) {
            console.error("Drive delete error during lazy cleanup:", driveErr);
            // Ignore drive error if file already deleted
          }
        }
      } catch (e) {
        console.error("Error during lazy deletion:", e);
      }

      // Remove originalFileId from design
      if (linkData.designId) {
         try {
            await updateDoc(doc(db, 'register_design', linkData.designId), {
               originalFileId: null,
               originalFileName: null
            });
         } catch (e) { console.error("Error unlinking design:", e); }
      }

      // Delete the link
      try {
         await deleteDoc(linkRef);
      } catch (e) { console.error("Error deleting link:", e); }

      return new NextResponse(
        `<html><body style="font-family: sans-serif; text-align: center; padding: 50px;">
          <h1 style="color: #ef4444;">Tautan Kedaluwarsa</h1>
          <p>Maaf, masa aktif tautan ini telah habis. File original telah dihapus secara otomatis dari sistem kami demi keamanan.</p>
        </body></html>`,
        { status: 410, headers: { 'Content-Type': 'text/html' } }
      );
    }

    // GET CLIENT IP
    const ip = request.headers.get('x-forwarded-for') || request.headers.get('x-real-ip') || 'Unknown IP';
    const cleanIp = ip.split(',')[0].trim(); // In case of multiple IPs, get the first one

    // IF VALID: Update Tracking
    const { arrayUnion } = await import('firebase/firestore');
    await updateDoc(linkRef, {
      downloadCount: increment(1),
      downloadedAt: serverTimestamp(),
      downloadIps: arrayUnion(cleanIp)
    });

    // REDIRECT TO DOWNLOAD
    const driveDownloadUrl = `https://drive.google.com/uc?export=download&id=${linkData.originalFileId}`;
    return NextResponse.redirect(driveDownloadUrl);

  } catch (error: any) {
    console.error("Download link error:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
