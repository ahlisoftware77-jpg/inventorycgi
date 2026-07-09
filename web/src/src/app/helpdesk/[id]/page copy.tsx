import DashboardLayout from '@/components/dashboard/layout';
import TicketDetail from '@/components/helpdesk/ticket-detail';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Suspense } from 'react';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const querySnapshot = await getDocs(collection(db, 'helpdesk_tickets'));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for helpdesk tickets:", error);
    return [];
  }
}

export default async function TicketDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  // ⬅️ FIX: params harus di-await di Next.js terbaru
  const { id } = await params;

  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading ticket...</div>}>
        <TicketDetail ticketId={id} />
      </Suspense>
    </DashboardLayout>
  );
}
