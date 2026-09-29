import { NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    // Vercel Cron Authentication Check (Optional, but recommended for security)
    // const authHeader = request.headers.get('authorization');
    // if (process.env.CRON_SECRET && authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    //   return new NextResponse('Unauthorized', { status: 401 });
    // }

    // 1. Fetch all register_design
    const designsSnap = await getDocs(collection(db, 'register_design'));
    const designs = designsSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    // 2. Fetch all customer_links
    const linksSnap = await getDocs(collection(db, 'customer_links'));
    const allLinks = linksSnap.docs.map(l => ({ id: l.id, ...l.data() }));

    // 3. Fetch all customer_transfers
    const transfersSnap = await getDocs(collection(db, 'customer_transfers'));
    const allTransfers = transfersSnap.docs.map(t => ({ id: t.id, ...t.data() }));

    const now = new Date();
    let deletedCount = 0;
    let drive: any = null;

    for (const design of designs as any[]) {
      // Lewati jika tidak ada file yang disimpan
      if (!design.originalFileId) continue;

      // Cari semua link untuk desain ini
      const designLinks = allLinks.filter(l => (l as any).designId === design.id);
      
      // Jika belum pernah dibuatkan link sama sekali, jangan hapus file-nya
      if (designLinks.length === 0) continue;

      // Cek apakah SEMUA link untuk desain ini sudah kedaluwarsa
      const allExpired = designLinks.every(link => {
        if (!(link as any).expiresAt) return false;
        const expiresAt = new Date((link as any).expiresAt.seconds * 1000);
        return expiresAt < now;
      });

      if (allExpired) {
        // Inisialisasi Google Drive API (hanya sekali jika diperlukan)
        if (!drive) {
          const settingsDoc = await getDoc(doc(db, "settings", "general"));
          if (settingsDoc.exists()) {
            const { googleClientId, googleClientSecret, googleRefreshToken } = settingsDoc.data();
            if (googleClientId && googleClientSecret && googleRefreshToken) {
              const oauth2Client = new google.auth.OAuth2(googleClientId, googleClientSecret);
              oauth2Client.setCredentials({ refresh_token: googleRefreshToken });
              drive = google.drive({ version: 'v3', auth: oauth2Client });
            }
          }
        }

        // Hapus dari Google Drive
        if (drive) {
          try {
            await drive.files.delete({ fileId: design.originalFileId });
            console.log(`Berhasil menghapus file dari drive: ${design.originalFileId}`);
          } catch (e: any) {
            console.error(`Gagal menghapus file drive ${design.originalFileId}:`, e.message);
          }
        }

        // Hapus data file dari Firestore desain agar statusnya kembali seperti awal
        await updateDoc(doc(db, 'register_design', design.id), {
          originalFileId: null,
          originalFileName: null
        });

        deletedCount++;
      }
    }

    for (const transfer of allTransfers as any[]) {
      if (!transfer.expiresAt) continue;
      const expiresAt = new Date(transfer.expiresAt.seconds * 1000);
      if (expiresAt < now) {
        if (!drive) {
          const settingsDoc = await getDoc(doc(db, "settings", "general"));
          if (settingsDoc.exists()) {
            const { googleClientId, googleClientSecret, googleRefreshToken } = settingsDoc.data();
            if (googleClientId && googleClientSecret && googleRefreshToken) {
              const oauth2Client = new google.auth.OAuth2(googleClientId, googleClientSecret);
              oauth2Client.setCredentials({ refresh_token: googleRefreshToken });
              drive = google.drive({ version: 'v3', auth: oauth2Client });
            }
          }
        }

        if (drive) {
          try {
            if (transfer.folderId) {
              await drive.files.delete({ fileId: transfer.folderId });
              console.log(`Berhasil menghapus folder transfer dari drive: ${transfer.folderId}`);
            } else if (transfer.files && Array.isArray(transfer.files)) {
              for (const f of transfer.files) {
                if (f.id) {
                  await drive.files.delete({ fileId: f.id });
                }
              }
            }
          } catch (e: any) {
            console.error(`Gagal menghapus file/folder transfer ${transfer.id}:`, e.message);
          }
        }

        await deleteDoc(doc(db, 'customer_transfers', transfer.id));
        deletedCount++;
      }
    }

    return NextResponse.json({ success: true, deletedCount, message: `Pembersihan berhasil. ${deletedCount} file dihapus.` });
  } catch (error: any) {
    console.error("Cron Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
