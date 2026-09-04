import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove the standalone useEffect for URL params
standalone_effect = '''  useEffect(() => {
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
  }, [toast]);'''

content = content.replace(standalone_effect, "")

# 2. Add the logic to fetchSettings
fetch_replacement = '''
            if (typeof window !== 'undefined') {
              const urlParams = new URLSearchParams(window.location.search);
              const rToken = urlParams.get('refresh_token');
              const err = urlParams.get('error');
              if (rToken) {
                setGoogleRefreshToken(rToken);
                toast({ title: 'Login Berhasil', description: 'Tersambung! Wajib klik Simpan Pengaturan di bawah.' });
                window.history.replaceState(null, '', '/settings');
              } else if (err) {
                setGoogleRefreshToken(data.googleRefreshToken || '');
                toast({ variant: 'destructive', title: 'Login Gagal', description: err });
                window.history.replaceState(null, '', '/settings');
              } else {
                setGoogleRefreshToken(data.googleRefreshToken || '');
              }
            } else {
              setGoogleRefreshToken(data.googleRefreshToken || '');
            }
'''

content = content.replace('''            if (typeof window !== 'undefined' && new URLSearchParams(window.location.search).get('refresh_token')) {
              setGoogleRefreshToken(new URLSearchParams(window.location.search).get('refresh_token') as string);
            } else {
              setGoogleRefreshToken(data.googleRefreshToken || '');
            }''', fetch_replacement)

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings to avoid race condition")
