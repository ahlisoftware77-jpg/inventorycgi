
'use client';

import { Suspense } from 'react';
import PublicCatalog from '@/components/assets/public-catalog';

export default function PublicUtilityPage() {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950">
      <Suspense fallback={<div className="flex h-screen items-center justify-center font-black uppercase tracking-widest opacity-20">Loading Utility Catalog...</div>}>
        <PublicCatalog type="utility" />
      </Suspense>
    </div>
  );
}
