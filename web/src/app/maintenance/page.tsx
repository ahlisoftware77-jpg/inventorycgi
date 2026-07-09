
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import MaintenanceCalendar from '@/components/maintenance/maintenance-calendar';
import { Suspense } from 'react';

export default function MaintenancePage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading calendar...</div>}>
        <MaintenanceCalendar />
      </Suspense>
    </DashboardLayout>
  );
}
