"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';

export default function OAuthCallbackPage() {
  const router = useRouter();
  const [status, setStatus] = useState('Mengotentikasi dengan Google...');

  useEffect(() => {
    const handleCallback = async () => {
      const url = new URL(window.location.href);
      const code = url.searchParams.get('code');
      const error = url.searchParams.get('error');

      if (error) {
        router.push(`/settings?error=${error}`);
        return;
      }

      if (!code) {
        setStatus('Kode otentikasi tidak ditemukan. Mengalihkan...');
        setTimeout(() => router.push('/settings'), 2000);
        return;
      }

      try {
        const apiUrl = window.location.hostname === 'localhost' 
          ? '/api/exchange-token' 
          : 'https://inventorycgi.vercel.app/api/exchange-token';
          
        // Redirect URI must match exactly what was sent during the auth request
        const redirectUri = window.location.origin + '/oauth-callback';

        const res = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ code, redirectUri }),
        });

        const data = await res.json();

        if (!res.ok) {
          throw new Error(data.error || 'Gagal menukar token');
        }

        if (data.refresh_token) {
          router.push(`/settings?refresh_token=${encodeURIComponent(data.refresh_token)}`);
        } else {
          router.push('/settings');
        }
      } catch (err: any) {
        console.error(err);
        router.push(`/settings?error=${encodeURIComponent(err.message)}`);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-slate-50">
      <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-4" />
      <p className="text-slate-600 font-medium">{status}</p>
    </div>
  );
}
