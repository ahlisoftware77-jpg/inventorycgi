import DashboardLayout from '@/components/dashboard/layout';
import CompareTable from '@/components/compare-excel/compare-table';
import { Suspense } from 'react';

export default function CompareExcelPage() {
  return (
    <DashboardLayout>
      <Suspense>
        <CompareTable />
      </Suspense>
    </DashboardLayout>
  );
}
