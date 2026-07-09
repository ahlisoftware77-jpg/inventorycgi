import DashboardLayout from '@/components/dashboard/layout';
import HelpdeskTable from '@/components/helpdesk/helpdesk-table';
import { Suspense } from 'react';

export default function HelpdeskPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <div key={i} className="h-24 rounded-2xl bg-muted animate-pulse" />)}
          </div>
          <div className="h-96 rounded-3xl bg-muted animate-pulse" />
        </div>
      }>
        <HelpdeskTable />
      </Suspense>
    </DashboardLayout>
  );
}
