
'use client';

import DashboardLayout from '@/components/dashboard/layout';
import AssetAuditClient from '@/components/maintenance/asset-audit-client';

export default function AuditAssetPage() {
  return (
    <DashboardLayout>
      <AssetAuditClient />
    </DashboardLayout>
  );
}
