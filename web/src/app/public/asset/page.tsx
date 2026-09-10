'use client';

import PublicAssetView from '@/components/assets/public-asset-view';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle, ShieldCheck } from 'lucide-react';
import { Turnstile } from '@marsidev/react-turnstile';

/**
 * @fileOverview Halaman publik untuk verifikasi identitas aset via QR Code.
 */
function PublicAssetContent() {
  const searchParams = useSearchParams();
  // Mendukung 'id' atau 'assetId'
  const assetId = searchParams.get('id') || searchParams.get('assetId');
  
  const [isVerified, setIsVerified] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!assetId) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh] gap-6 text-black">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-12 w-12 text-rose-500 opacity-40" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase text-rose-600">ID Aset Tidak Ditemukan</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                Tautan verifikasi tidak memiliki ID Aset yang valid. Mohon pindai ulang kode QR pada label fisik aset.
            </p>
        </div>
      </div>
    );
  }

  if (!isVerified) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 p-4">
        <div className="p-6 bg-white border border-slate-200 rounded-2xl shadow-sm text-center max-w-md w-full space-y-6">
          <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-full flex items-center justify-center mx-auto shadow-inner">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <div className="space-y-2">
            <h2 className="text-xl font-bold tracking-tight text-slate-900">Verifikasi Keamanan</h2>
            <p className="text-sm text-slate-500">
              Sistem kami perlu memastikan bahwa Anda adalah manusia, bukan robot otomatis (scraper), sebelum menampilkan data aset internal perusahaan.
            </p>
          </div>
          
          <div className="flex justify-center py-4 min-h-[80px]">
            <Turnstile
              siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY || '1x00000000000000000000AA'}
              onSuccess={async (token) => {
                setIsVerifying(true);
                setError(null);
                try {
                  const res = await fetch('/api/verify-turnstile', {
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

  return <PublicAssetView assetId={assetId} />;
}

export default function PublicAssetPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Memverifikasi Aset...</p>
        </div>
      }>
        <PublicAssetContent />
      </Suspense>
    </DashboardLayout>
  );
}
