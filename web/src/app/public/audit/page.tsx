'use client';

import PublicAuditSignature from '@/components/maintenance/public-audit-signature';
import { Suspense } from 'react';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Halaman Publik untuk Tanda Tangan Audit.
 * Menggunakan Suspense untuk menangani searchParams pada proses build statis.
 */
export default function PublicAuditPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={
        <div className="flex h-screen items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      }>
        <PublicAuditSignature />
      </Suspense>
    </div>
  );
}