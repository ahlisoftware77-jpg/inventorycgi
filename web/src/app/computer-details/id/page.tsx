'use client';

import ComputerDetail from '@/components/computer-details/computer-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Halaman detail aset IT statis (Fallback legacy).
 */
function ComputerDetailPageContent() {
  const searchParams = useSearchParams();
  const computerId = searchParams.get('computerId');

  if (!computerId) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        ID Aset IT tidak ditemukan dalam URL.
      </div>
    );
  }

  return <ComputerDetail assetId={computerId} />;
}

export default function ComputerDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center">Memuat data aset IT...</div>}>
        <ComputerDetailPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
