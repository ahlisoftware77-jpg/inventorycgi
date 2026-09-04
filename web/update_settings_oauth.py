import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update State Variables
content = content.replace(
    "const [googleDriveServiceAccount, setGoogleDriveServiceAccount] = useState('');",
    "const [googleClientId, setGoogleClientId] = useState('');\n  const [googleClientSecret, setGoogleClientSecret] = useState('');\n  const [googleRefreshToken, setGoogleRefreshToken] = useState('');"
)

# 2. Update set variables on load
if "setGoogleClientId" not in content:
    content = content.replace(
        "setGoogleDriveServiceAccount(docSnap.data().googleDriveServiceAccount || '');",
        "setGoogleClientId(docSnap.data().googleClientId || '');\n          setGoogleClientSecret(docSnap.data().googleClientSecret || '');\n          setGoogleRefreshToken(docSnap.data().googleRefreshToken || '');"
    )

# 3. Update variables on save
content = content.replace(
    "googleDriveServiceAccount,",
    "googleClientId,\n        googleClientSecret,\n        googleRefreshToken,"
)

# 4. Update the Tab Content for Google Drive
new_tab_content = '''
          <TabsContent value="googledrive" className="space-y-10 mt-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="relative z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    Google Drive Integrations (OAuth)
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Pengaturan penyimpanan file menggunakan Login OAuth Pribadi.</p>
                </div>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Folder ID</Label>
                    <Input 
                      placeholder="Contoh: 1bA2c3D4e5F6g7H8i9J0kL..." 
                      value={googleDriveFolderId} 
                      onChange={(e) => setGoogleDriveFolderId(e.target.value)} 
                      className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-slate-900 dark:text-white"
                    />
                    <p className="text-[10px] text-slate-400">ID folder Google Drive tempat gambar akan disimpan.</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Client ID</Label>
                    <Input 
                      placeholder="Contoh: 123456789-abcdef.apps.googleusercontent.com" 
                      value={googleClientId} 
                      onChange={(e) => setGoogleClientId(e.target.value)} 
                      className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Client Secret</Label>
                    <Input 
                      placeholder="Contoh: GOCSPX-abcdef..." 
                      value={googleClientSecret} 
                      onChange={(e) => setGoogleClientSecret(e.target.value)} 
                      className="h-12 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-mono text-sm text-slate-900 dark:text-white"
                    />
                  </div>
                  
                  <div className="space-y-2 p-4 bg-slate-100 rounded-xl border border-slate-200">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400 block mb-2">Status Login</Label>
                    {googleRefreshToken ? (
                       <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                         <div className="text-emerald-600 font-bold text-sm flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                           Terhubung ke Google Drive
                         </div>
                         <Button variant="outline" size="sm" onClick={() => setGoogleRefreshToken('')} className="border-red-200 text-red-600 hover:bg-red-50">
                           Putuskan Sambungan
                         </Button>
                       </div>
                    ) : (
                       <div className="flex flex-col sm:flex-row sm:items-center gap-4 justify-between">
                         <div className="text-amber-600 font-bold text-sm flex items-center gap-2">
                           <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse"></span>
                           Belum Terhubung
                         </div>
                         <Button onClick={() => {
                           if (!googleClientId || !googleDriveFolderId) {
                             alert("Client ID dan Folder ID harus diisi dulu!");
                             return;
                           }
                           const redirectUri = window.location.hostname === 'localhost' ? 'http://localhost:3000/api/oauth2callback' : 'https://inventorycgi.vercel.app/api/oauth2callback';
                           const scope = 'https://www.googleapis.com/auth/drive.file';
                           const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${googleClientId}&redirect_uri=${redirectUri}&response_type=code&scope=${scope}&access_type=offline&prompt=consent`;
                           window.location.href = authUrl;
                         }} className="bg-blue-600 hover:bg-blue-700 text-white font-bold">
                           <Upload className="w-4 h-4 mr-2" /> Login ke Google Drive
                         </Button>
                       </div>
                    )}
                  </div>
                  <p className="text-[10px] text-slate-400 mt-2">Pastikan Bapak sudah menyimpan Client ID & Secret sebelum mengeklik tombol Login. Redirect URI yang diatur di GCP harus sama dengan: <b>{typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000/api/oauth2callback' : 'https://inventorycgi.vercel.app/api/oauth2callback'}</b></p>
                </div>
              </div>
            </div>
          </TabsContent>
'''

# Find the start and end of the old googledrive TabsContent
start_idx = content.find('<TabsContent value="googledrive"')
if start_idx != -1:
    end_idx = content.find('</TabsContent>', start_idx) + len('</TabsContent>')
    content = content[:start_idx] + new_tab_content + content[end_idx:]

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings/page.tsx for OAuth")
