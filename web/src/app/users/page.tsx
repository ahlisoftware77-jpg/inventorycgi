
import DashboardLayout from '@/components/dashboard/layout';
import UserTable from '@/components/users/user-table';

export default function UsersPage() {
  return (
    <DashboardLayout>
      <UserTable />
    </DashboardLayout>
  );
}
