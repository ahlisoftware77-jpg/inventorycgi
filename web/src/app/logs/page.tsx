'use client';

import DashboardLayout from '@/components/dashboard/layout';
import LogTable from '@/components/logs/log-table';
import { Suspense } from 'react';

/**
 * @fileOverview Halaman Log Aktivitas Sistem Terpusat.
 */
export default function LogsPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="space-y-6">
          <div className="h-20 w-full bg-muted animate-pulse rounded-2xl" />
          <div className="h-96 w-full bg-muted animate-pulse rounded-3xl" />
        </div>
      }>
        <LogTable />
      </Suspense>
    </DashboardLayout>
  );
}
