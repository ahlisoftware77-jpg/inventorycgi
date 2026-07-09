'use client';

import { Suspense } from 'react';
import PublicInventoryReport from '@/components/inventory/public-inventory-report';
import { Loader2 } from 'lucide-react';

export default function PublicInventoryReportPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Memuat Dokumen Logistik...</p>
        </div>
      }>
        <PublicInventoryReport />
      </Suspense>
    </div>
  );
}
