
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

// This is the Server Component page wrapper. It does not use 'use client'.
export default function TicketDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading ticket...</div>}>
        {/* The actual content is in a Client Component that receives the ID as a prop */}
        <TicketDetail ticketId={params.id} />
      </Suspense>
    </DashboardLayout>
  );
}
