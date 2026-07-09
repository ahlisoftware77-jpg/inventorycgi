'use client';

import PublicTicketView from '@/components/helpdesk/public-ticket-view';
import DashboardLayout from '@/components/dashboard/layout';
import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { Loader2, AlertCircle } from 'lucide-react';

/**
 * @fileOverview Halaman publik untuk memantau status tiket helpdesk.
 * Menggunakan Suspense untuk mendukung pembacaan useSearchParams pada static export.
 */
function PublicHelpdeskContent() {
  const searchParams = useSearchParams();
  // Mendukung parameter 'id' (standar publik) atau 'ticketId'
  const ticketId = searchParams.get('id') || searchParams.get('ticketId');

  if (!ticketId) {
    return (
      <div className="p-12 text-center flex flex-col items-center justify-center min-h-[60vh] gap-6 text-black">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-12 w-12 text-rose-500 opacity-40" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase text-rose-600">ID Tiket Tidak Ditemukan</h2>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto leading-relaxed">
                URL yang Anda akses tidak memiliki identitas tiket yang valid. Mohon periksa kembali tautan dari sistem.
            </p>
        </div>
      </div>
    );
  }

  return <PublicTicketView ticketId={ticketId} />;
}

export default function PublicHelpdeskPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Memuat Status Tiket...</p>
        </div>
      }>
        <PublicHelpdeskContent />
      </Suspense>
    </DashboardLayout>
  );
}
