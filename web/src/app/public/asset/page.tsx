'use client';

import PublicAssetView from '@/components/assets/public-asset-view';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * @fileOverview Halaman publik untuk verifikasi identitas aset via QR Code.
 */
function PublicAssetContent() {
  const searchParams = useSearchParams();
  // Mendukung 'id' atau 'assetId'
  const assetId = searchParams.get('id') || searchParams.get('assetId');

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
