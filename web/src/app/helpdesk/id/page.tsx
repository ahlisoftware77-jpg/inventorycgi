'use client';

import DashboardLayout from '@/components/dashboard/layout';
import TicketDetail from '@/components/helpdesk/ticket-detail';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

/**
 * @fileOverview Halaman detail tiket helpdesk.
 * Dioptimalkan untuk navigasi query-param pada static export.
 */
function TicketDetailPageContent() {
  const searchParams = useSearchParams();
  // Memeriksa 'ticketId' atau fallback ke 'id'
  const ticketId = searchParams.get('ticketId') || searchParams.get('id');

  if (!ticketId) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        ID Tiket tidak ditemukan dalam URL. Mohon kembali ke daftar helpdesk.
      </div>
    );
  }

  return <TicketDetail ticketId={ticketId} />;
}

export default function TicketDetailPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="p-12 text-center font-bold animate-pulse text-muted-foreground uppercase tracking-widest text-xs">Membuka Tiket...</div>}>
        <TicketDetailPageContent />
      </Suspense>
    </DashboardLayout>
  );
}
