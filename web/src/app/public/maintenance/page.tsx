
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import PublicMaintenanceSignature from '@/components/maintenance/public-maintenance-signature-view';
import { Loader2, AlertCircle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

function MaintenancePublicPageContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  if (!id) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-6 bg-slate-50">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-16 w-16 text-rose-500 opacity-20" />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Link Tidak Valid</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">ID Jadwal Pemeliharaan tidak ditemukan dalam tautan ini.</p>
        </div>
        <Button asChild variant="ghost" className="rounded-full font-bold uppercase text-[10px] tracking-widest text-slate-400">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Portal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4">
      <PublicMaintenanceSignature scheduleId={id} />
    </div>
  );
}

export default function MaintenancePublicPage() {
  return (
    <Suspense fallback={
        <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Lembar Pengesahan...</p>
        </div>
    }>
      <MaintenancePublicPageContent />
    </Suspense>
  );
}
