'use client';

import DashboardLayout from '@/components/dashboard/layout';
import ISO14064Content from '@/components/iso/iso-14064-content';
import { Suspense } from 'react';

export default function ISO14064Page() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Memuat Data ISO...</div>}>
        <ISO14064Content />
      </Suspense>
    </DashboardLayout>
  );
}
