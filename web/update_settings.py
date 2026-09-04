import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add state variables
if "const [googleDriveServiceAccount" not in content:
    content = content.replace(
        "const [geminiApiKey, setGeminiApiKey] = useState('');",
        "const [geminiApiKey, setGeminiApiKey] = useState('');\n  const [googleDriveServiceAccount, setGoogleDriveServiceAccount] = useState('');\n  const [googleDriveFolderId, setGoogleDriveFolderId] = useState('');"
    )

# 2. Add to loadSettings
if "googleDriveFolderId: docSnap.data().googleDriveFolderId || ''" not in content:
    content = content.replace(
        "setGeminiApiKey(docSnap.data().geminiApiKey || '');",
        "setGeminiApiKey(docSnap.data().geminiApiKey || '');\n          setGoogleDriveServiceAccount(docSnap.data().googleDriveServiceAccount || '');\n          setGoogleDriveFolderId(docSnap.data().googleDriveFolderId || '');"
    )

# 3. Add to handleSaveSettings
if "googleDriveServiceAccount: googleDriveServiceAccount" not in content:
    content = content.replace(
        "geminiApiKey,",
        "geminiApiKey,\n        googleDriveServiceAccount,\n        googleDriveFolderId,"
    )

# 4. Add TabsTrigger
if 'value="googledrive"' not in content:
    content = content.replace(
        '<TabsTrigger value="integrasi" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Integrasi AI</TabsTrigger>',
        '<TabsTrigger value="integrasi" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Integrasi AI</TabsTrigger>\n            <TabsTrigger value="googledrive" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Google Drive</TabsTrigger>'
    )
    content = content.replace("lg:grid-cols-4", "lg:grid-cols-5")

# 5. Add TabsContent
tab_content = '''
          <TabsContent value="googledrive" className="space-y-10 mt-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl p-8 border border-slate-200 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3 pointer-events-none"></div>
              <div className="relative z-10 space-y-6">
                <div>
                  <h3 className="text-xl font-black text-slate-800 dark:text-white flex items-center gap-2">
                    Google Drive Integrations
                  </h3>
                  <p className="text-sm text-slate-500 font-medium">Pengaturan penyimpanan file terpusat menggunakan Google Service Account.</p>
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
                    <p className="text-[10px] text-slate-400">Folder ID adalah kumpulan acak huruf di URL Google Drive (contoh: https://drive.google.com/drive/folders/<span className="text-emerald-500 font-bold">1bA...</span>)</p>
                  </div>
                  <div className="space-y-2">
                    <Label className="text-xs font-bold uppercase tracking-widest text-slate-400">Service Account JSON (Kredensial Robot)</Label>
                    <textarea 
                      placeholder='{"type": "service_account", "project_id": "...", "private_key": "..."}' 
                      value={googleDriveServiceAccount} 
                      onChange={(e) => setGoogleDriveServiceAccount(e.target.value)} 
                      className="w-full h-40 p-4 rounded-xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-mono text-xs text-slate-900 dark:text-white resize-y outline-none focus:ring-2 focus:ring-primary/50"
                    />
                    <p className="text-[10px] text-slate-400">Buka file .json yang diunduh dari Google Cloud Console dengan Notepad, *Copy* seluruh isinya, lalu *Paste* ke kotak di atas. Jangan lupa *Share* folder Drive Bapak ke email `client_email` yang ada di dalam JSON tersebut!</p>
                  </div>
                </div>
              </div>
            </div>
          </TabsContent>
'''

if 'value="googledrive"' not in content: # double check
    pass # Already replaced trigger, but wait, the check above only adds the trigger.
    
if 'value="googledrive"' in content and '<TabsContent value="googledrive"' not in content:
    content = content.replace(
        '</TabsContent>\n        </Tabs>',
        '</TabsContent>\n' + tab_content + '        </Tabs>'
    )

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings/page.tsx")
