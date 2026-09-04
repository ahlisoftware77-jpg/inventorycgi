import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

effect_logic = '''
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const errorParam = urlParams.get('error');
      const refreshParam = urlParams.get('refresh_token');

      if (errorParam) {
        toast({ variant: 'destructive', title: 'Login Gagal', description: errorParam });
        window.history.replaceState(null, '', '/settings');
      } else if (refreshParam) {
        setGoogleRefreshToken(refreshParam);
        toast({ title: 'Login Berhasil', description: 'Tersambung ke Google Drive! Jangan lupa klik Simpan Pengaturan di bawah.' });
        window.history.replaceState(null, '', '/settings');
      }
    }
  }, [toast]);
'''

if "const urlParams = new URLSearchParams(window.location.search);" not in content:
    content = content.replace(
        "const router = useRouter();",
        "const router = useRouter();\n" + effect_logic
    )

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings/page.tsx for URL params")
