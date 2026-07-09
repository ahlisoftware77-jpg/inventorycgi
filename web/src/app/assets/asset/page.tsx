'use client';

import AssetDetail from '@/components/assets/asset-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Halaman detail aset utama.
 * Menggunakan hook useSearchParams dengan fallback kunci 'id' untuk kompatibilitas tautan.
 */
function AssetDetailPageContent() {
  const searchParams = useSearchParams();
  // Memeriksa 'assetId' (standar baru) atau 'id' (legacy/fallback)
  const assetId = searchParams.get('assetId') || searchParams.get('id');

  if (!assetId) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
        <div className="p-4 bg-muted rounded-full">
          <svg className="w-8 h-8 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
        </div>
        <p className="font-bold uppercase tracking-widest text-xs">ID Aset tidak ditemukan dalam URL.</p>
        <p className="text-sm">Mohon kembali ke daftar aset dan pilih item yang ingin dilihat.</p>
      </div>
    );
  }

  return <AssetDetail assetId={assetId} />;
}

export default function AssetDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center font-bold animate-pulse text-muted-foreground uppercase tracking-widest text-xs">Menyiapkan Data Aset...</div>}>
        <AssetDetailPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
