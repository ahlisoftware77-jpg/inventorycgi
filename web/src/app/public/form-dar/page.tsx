'use client';

import { FormAppContent } from '@/app/form-app/page';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Halaman publik untuk Form DAR.
 * Memungkinkan pihak eksternal untuk mengisi tanda tangan tanpa login.
 */
export default function PublicFormDarPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-blue-600" />
            <p className="text-xs font-black uppercase tracking-widest text-slate-500 animate-pulse">Menyiapkan Dokumen DAR...</p>
        </div>
      }>
        <FormAppContent isPublic={true} />
      </Suspense>
    </DashboardLayout>
  );
}
