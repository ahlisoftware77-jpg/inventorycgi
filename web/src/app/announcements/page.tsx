import DashboardLayout from '@/components/dashboard/layout';
import AnnouncementList from '@/components/announcements/announcement-list';

export default function AnnouncementsPage() {
  return (
    <DashboardLayout>
      <AnnouncementList />
    </DashboardLayout>
  );
}
