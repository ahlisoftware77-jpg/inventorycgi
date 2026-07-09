
import DashboardLayout from '@/components/dashboard/layout';
import WaitingListTable from '@/components/waiting-list/waiting-list-table';

export default function WaitingListPage() {
  return (
    <DashboardLayout>
      <WaitingListTable />
    </DashboardLayout>
  );
}
