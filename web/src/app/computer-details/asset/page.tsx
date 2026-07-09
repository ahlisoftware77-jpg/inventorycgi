'use client';

import ComputerDetail from '@/components/computer-details/computer-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Halaman detail aset IT.
 * Menggunakan hook useSearchParams untuk fleksibilitas pembacaan ID.
 */
function ComputerDetailPageContent() {
  const searchParams = useSearchParams();
  // Memeriksa 'computerId' atau fallback ke 'id'
  const computerId = searchParams.get('computerId') || searchParams.get('id');

  if (!computerId) {
    return (
      <div className="p-12 text-center text-muted-foreground flex flex-col items-center gap-4">
        <p className="font-bold uppercase tracking-widest text-xs">ID Aset IT tidak ditemukan dalam URL.</p>
        <p className="text-sm">Mohon kembali ke daftar inventaris IT.</p>
      </div>
    );
  }

  return <ComputerDetail assetId={computerId} />;
}

export default function ComputerDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center font-bold animate-pulse text-muted-foreground uppercase tracking-widest text-xs">Menyiapkan Spesifikasi IT...</div>}>
        <ComputerDetailPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
