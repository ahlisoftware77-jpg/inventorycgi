import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Update Imports
if "import { useRouter, useSearchParams } from 'next/navigation';" not in content:
    content = content.replace(
        "import { useRouter } from 'next/navigation';",
        "import { useRouter, useSearchParams } from 'next/navigation';"
    )

# 2. Add useSearchParams hook
if "const searchParams = useSearchParams();" not in content:
    content = content.replace(
        "export default function SettingsPage() {\n  const [",
        "export default function SettingsPage() {\n  const searchParams = useSearchParams();\n  const ["
    )

# 3. Add useEffect to catch the query params
effect_logic = '''
  useEffect(() => {
    const errorParam = searchParams.get('error');
    const refreshParam = searchParams.get('refresh_token');

    if (errorParam) {
      toast({ variant: 'destructive', title: 'Login Gagal', description: errorParam });
      router.replace('/settings');
    } else if (refreshParam) {
      setGoogleRefreshToken(refreshParam);
      toast({ title: 'Login Berhasil', description: 'Tersambung ke Google Drive! Jangan lupa klik Simpan Pengaturan.' });
      router.replace('/settings');
    }
  }, [searchParams, router, toast]);
'''

if "const refreshParam = searchParams.get('refresh_token');" not in content:
    content = content.replace(
        "const router = useRouter();",
        "const router = useRouter();\n" + effect_logic
    )

# Now, we also need to wrap SettingsPage inside a Suspense component because useSearchParams throws errors if not wrapped in Suspense in static generation.
# Actually, since output='export', maybe it's fine, but Next.js 13+ requires Suspense for useSearchParams on client.
# To be safe and simple, let's just use window.location.search instead of useSearchParams to avoid the Suspense wrapper requirement which is annoying in Next.js page files.

# Let's rewrite it to use standard window.location.search to avoid Suspense errors.
'''
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
  }, []);
'''
