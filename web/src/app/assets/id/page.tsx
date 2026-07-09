'use client';

import AssetDetail from '@/components/assets/asset-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Halaman detail aset (Fallback legacy).
 */
function AssetDetailPageContent() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId') || searchParams.get('id');

  if (!assetId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        ID Aset tidak ditemukan dalam URL.
      </div>
    );
  }

  return <AssetDetail assetId={assetId} />;
}

export default function AssetDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center">Memuat data...</div>}>
        <AssetDetailPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
