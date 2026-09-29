const fs = require('fs');
let code = fs.readFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/api/cron/cleanup-expired/route.ts', 'utf8');

code = code.replace(/import \{ collection, getDocs, doc, updateDoc, getDoc \} from 'firebase\/firestore';/, "import { collection, getDocs, doc, updateDoc, getDoc, deleteDoc } from 'firebase/firestore';");

code = code.replace(/const linksSnap = await getDocs\(collection\(db, 'customer_links'\)\);\s*const allLinks = linksSnap\.docs\.map\(l => \(\{ id: l\.id, \.\.\.l\.data\(\) \}\)\);/, `const linksSnap = await getDocs(collection(db, 'customer_links'));
    const allLinks = linksSnap.docs.map(l => ({ id: l.id, ...l.data() }));

    // 3. Fetch all customer_transfers
    const transfersSnap = await getDocs(collection(db, 'customer_transfers'));
    const allTransfers = transfersSnap.docs.map(t => ({ id: t.id, ...t.data() }));`);

code = code.replace(/deletedCount\+\+;\s*\}\s*\}/, `deletedCount++;
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
              console.log(\`Berhasil menghapus folder transfer dari drive: \${transfer.folderId}\`);
            } else if (transfer.files && Array.isArray(transfer.files)) {
              for (const f of transfer.files) {
                if (f.id) {
                  await drive.files.delete({ fileId: f.id });
                }
              }
            }
          } catch (e: any) {
            console.error(\`Gagal menghapus file/folder transfer \${transfer.id}:\`, e.message);
          }
        }

        await deleteDoc(doc(db, 'customer_transfers', transfer.id));
        deletedCount++;
      }
    }`);

fs.writeFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/api/cron/cleanup-expired/route.ts', code);
console.log('done');
