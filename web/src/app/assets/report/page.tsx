
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import AssetReport from '@/components/assets/asset-report';
import { Suspense } from 'react';

/**
 * @fileOverview Halaman Laporan Inventaris Aset.
 */
export default function AssetReportPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-8 text-center">Memuat modul laporan...</div>}>
        <AssetReport />
      </Suspense>
    </DashboardLayout>
  );
}
