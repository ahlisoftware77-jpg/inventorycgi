'use client';

import React, { useState } from 'react';
import { Turnstile } from '@marsidev/react-turnstile';
import { Loader2, ShieldCheck } from 'lucide-react';

interface TurnstileGateProps {
  children: React.ReactNode;
}

export default function TurnstileGate({ children }: TurnstileGateProps) {
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (isVerified) {
    return <>{children}</>;
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
      <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center max-w-md w-full space-y-6">
        <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
          <ShieldCheck className="w-8 h-8" />
        </div>
        <div className="space-y-2">
          <h2 className="text-xl font-bold tracking-tight text-slate-900">Verifikasi Keamanan</h2>
          <p className="text-sm text-slate-500">
            Sistem kami perlu memastikan bahwa Anda adalah manusia, bukan robot otomatis (scraper), sebelum menampilkan akses dokumen publik ini.
          </p>
        </div>
        
        <div className="flex justify-center py-4 min-h-[80px]">
          <Turnstile
            siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
            onSuccess={async (token) => {
              setIsVerifying(true);
              setError(null);
              try {
                const apiUrl = (typeof window !== 'undefined' && window.location.hostname !== 'localhost') 
                  ? 'https://inventorycgi.vercel.app/api/verify-turnstile' 
                  : '/api/verify-turnstile';
                  
                const res = await fetch(apiUrl, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ token })
                });
                const data = await res.json();
                if (data.success) {
                  setIsVerified(true);
                } else {
                  setError("Verifikasi gagal. Silakan coba lagi.");
                }
              } catch (e) {
                setError("Terjadi kesalahan koneksi saat memverifikasi.");
              } finally {
                setIsVerifying(false);
              }
            }}
            onError={() => setError("Gagal memuat widget keamanan. Coba muat ulang halaman.")}
            options={{
              theme: 'light',
            }}
          />
        </div>

        {isVerifying && (
          <div className="flex items-center justify-center gap-2 text-sm text-blue-600 font-medium">
            <Loader2 className="w-4 h-4 animate-spin" /> Sedang memvalidasi akses...
          </div>
        )}

        {error && (
          <div className="text-sm text-red-500 font-medium p-3 bg-red-50 rounded-lg">
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
