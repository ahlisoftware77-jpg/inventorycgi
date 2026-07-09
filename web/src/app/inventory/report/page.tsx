
import DashboardLayout from '@/components/dashboard/layout';
import InventoryReport from '@/components/inventory/inventory-report';
import { Suspense } from 'react';

export default function InventoryReportPage() {
  return (
    <DashboardLayout>
      <Suspense>
        <InventoryReport />
      </Suspense>
    </DashboardLayout>
  );
}
