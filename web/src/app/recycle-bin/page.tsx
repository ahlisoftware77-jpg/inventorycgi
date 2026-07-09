'use client';

import DashboardLayout from '@/components/dashboard/layout';
import RecycleBinList from '@/components/recycle-bin/recycle-bin-list';
import { Suspense } from 'react';

/**
 * @fileOverview Halaman Tempat Sampah (Recycle Bin) Terpusat.
 * Khusus akses Admin.
 */
export default function RecycleBinPage() {
  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-black tracking-tight uppercase">Tempat Sampah</h1>
          <p className="text-muted-foreground font-medium">Data yang dihapus akan ditampung di sini selama 30 hari sebelum dihapus permanen oleh sistem.</p>
        </div>
        
        <Suspense fallback={
          <div className="space-y-4">
            <div className="h-12 w-full bg-muted animate-pulse rounded-xl" />
            <div className="h-96 w-full bg-muted animate-pulse rounded-3xl" />
          </div>
        }>
          <RecycleBinList />
        </Suspense>
      </div>
    </DashboardLayout>
  );
}
