
import DashboardLayout from '@/components/dashboard/layout';
import InventoryTable from '@/components/inventory/inventory-table';
import { Suspense } from 'react';

export default function InventoryPage() {
  return (
    <DashboardLayout>
      <Suspense>
        <InventoryTable />
      </Suspense>
    </DashboardLayout>
  );
}
