'use client';

import { Suspense } from 'react';
import PublicReportViewer from '@/components/reports/public-report-viewer';
import { useSearchParams } from 'next/navigation';
import { Loader2 } from 'lucide-react';

function PublicReportViewerWrapper() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('s');

  if (!reportId) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center text-black">
        <h1 className="text-2xl font-black uppercase">Laporan Tidak Ditemukan</h1>
        <p className="text-muted-foreground mt-2">ID Laporan diperlukan untuk mengakses halaman ini.</p>
      </div>
    );
  }

  return <PublicReportViewer reportId={reportId} />;
}

export default function PublicReportPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Menyiapkan Laporan Audit...</p>
        </div>
      }>
        <PublicReportViewerWrapper />
      </Suspense>
    </div>
  );
}
