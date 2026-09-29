const fs = require('fs');
let code = fs.readFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/settings/page.tsx', 'utf8');

code = code.replace(
  /const \[isLoading, setIsLoading\] = useState\(true\);/,
  "const [isLoading, setIsLoading] = useState(true);\n  const [isCleaningUp, setIsCleaningUp] = useState(false);"
);

code = code.replace(
  /const handleSaveGeneral = async \(\) => \{/,
  `const handleCleanupExpired = async () => {
    if (!confirm('Anda yakin ingin membersihkan semua file/folder yang sudah kedaluwarsa? Proses ini tidak dapat dibatalkan.')) return;
    setIsCleaningUp(true);
    try {
      const res = await fetch('/api/cron/cleanup-expired');
      const data = await res.json();
      if (res.ok) {
        toast({ title: 'Berhasil', description: data.message });
      } else {
        throw new Error(data.error || 'Gagal membersihkan file.');
      }
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsCleaningUp(false);
    }
  };

  const handleSaveGeneral = async () => {`
);

code = code.replace(
  /<\/div>\n\s*<p className="text-\[10px\] text-slate-400 mt-2">Pastikan Bapak sudah menyimpan Client ID & Secret sebelum mengeklik tombol Login\. Redirect URI yang diatur di GCP harus sama dengan: <b>\{typeof window !== 'undefined' \? window\.location\.origin \+ '\/oauth-callback' : ''\}<\/b><\/p>\n\s*<\/div>/,
  `</div>
                  <p className="text-[10px] text-slate-400 mt-2">Pastikan Bapak sudah menyimpan Client ID & Secret sebelum mengeklik tombol Login. Redirect URI yang diatur di GCP harus sama dengan: <b>{typeof window !== 'undefined' ? window.location.origin + '/oauth-callback' : ''}</b></p>
                  
                  <div className="mt-8 p-6 bg-red-50 dark:bg-red-950/20 rounded-2xl border border-red-200 dark:border-red-900/50">
                    <h4 className="text-sm font-bold text-red-700 dark:text-red-400 mb-2">Pembersihan File Kedaluwarsa</h4>
                    <p className="text-xs text-red-600/80 dark:text-red-400/80 mb-4">Fitur ini akan mengecek dan menghapus semua file & folder di Google Drive yang batas waktu (expired) aksesnya sudah habis, sesuai pengaturan saat pengiriman.</p>
                    <Button 
                      onClick={handleCleanupExpired} 
                      disabled={isCleaningUp}
                      className="bg-red-600 hover:bg-red-700 text-white font-bold h-11 px-6 rounded-xl shadow-lg shadow-red-500/20"
                    >
                      {isCleaningUp ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Trash2 className="w-4 h-4 mr-2" />}
                      {isCleaningUp ? 'Membersihkan...' : 'Bersihkan File Kedaluwarsa Sekarang'}
                    </Button>
                  </div>
                </div>`
);

fs.writeFileSync('e:/yadiapp-project/inventory - Copy/web/src/app/settings/page.tsx', code);
console.log('done');
