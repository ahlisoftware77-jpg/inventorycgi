import re

with open('src/app/api/upload-drive/route.ts', 'r', encoding='utf-8') as f:
    content = f.read()

replacement = '''
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
'''

# Find the block to replace
start_str = '    const settingsDoc = await getDoc(doc(db, "settings", "general"));'
end_str = '    const drive = google.drive({ version: \'v3\', auth });'

start_idx = content.find(start_str)
end_idx = content.find(end_str) + len(end_str)

if start_idx != -1 and end_idx != -1:
    content = content[:start_idx] + replacement.strip() + content[end_idx:]

with open('src/app/api/upload-drive/route.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated upload-drive/route.ts for OAuth")
