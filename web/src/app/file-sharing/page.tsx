import { Metadata } from 'next';
import FileSharingContent from '@/components/file-sharing/file-sharing-content';

export const metadata: Metadata = {
  title: 'File Sharing Portal | Inventory System',
  description: 'Portal and Access Logs for File Sharing',
};

export default function FileSharingPage() {
  return <FileSharingContent />;
}
