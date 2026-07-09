
import DashboardLayout from '@/components/dashboard/layout';
import InventoryRequestsTable from '@/components/inventory/inventory-requests-table';
import { Suspense } from 'react';

export default function InventoryRequestsPage() {
  return (
    <DashboardLayout>
      <Suspense>
        <InventoryRequestsTable />
      </Suspense>
    </DashboardLayout>
  );
}
