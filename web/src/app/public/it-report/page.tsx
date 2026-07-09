'use client';

import { ITProblemFormContent } from '@/app/it-problem-form/page';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Halaman publik untuk Form IT Problem (0-32-028).
 * Memungkinkan pengisian dan tanda tangan tanpa login.
 */
export default function PublicITReportPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Formulir Resmi...</p>
        </div>
      }>
        <ITProblemFormContent isPublic={true} />
      </Suspense>
    </DashboardLayout>
  );
}
