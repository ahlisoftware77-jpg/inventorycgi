
import DashboardLayout from '@/components/dashboard/layout';
import HelpdeskTable from '@/components/helpdesk/helpdesk-table';
import { Suspense } from 'react';

export default function HelpdeskPage() {
  return (
    <DashboardLayout>
      <Suspense>
        <HelpdeskTable />
      </Suspense>
    </DashboardLayout>
  );
}
