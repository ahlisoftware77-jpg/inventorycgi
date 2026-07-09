
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import AssetCardPreview from '@/components/assets/asset-card-preview';
import { Suspense, use, useState } from 'react';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';

/**
 * @fileOverview Halaman pratinjau kartu aset statis.
 * Menggunakan query parameter 'assetId' untuk mengambil data.
 */
export default function AssetCardPreviewPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ assetId?: string }> 
}) {
  const params = use(searchParams);
  const assetId = params.assetId;
  const [isOpen, setIsOpen] = useState(true);

  if (!assetId) {
    return (
      <DashboardLayout>
        <div className="p-8 text-center text-muted-foreground">
          ID Aset tidak ditemukan.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-4">
        <Button asChild variant="outline" size="sm">
            <Link href={`/assets/id?assetId=${assetId}`}>
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Detail
            </Link>
        </Button>
        <Suspense fallback={<div>Memuat pratinjau...</div>}>
            <AssetCardPreview 
                assetId={assetId} 
                isOpen={isOpen} 
                onOpenChange={setIsOpen} 
            />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
