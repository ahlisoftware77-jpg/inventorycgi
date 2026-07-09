
import ComputerDetail from '@/components/computer-details/computer-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Suspense } from 'react';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const querySnapshot = await getDocs(collection(db, 'it_assets'));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for computer details:", error);
    return [];
  }
}

// This is the Server Component page wrapper. It does not use 'use client'.
export default function ComputerDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading computer details...</div>}>
        {/* The actual content is in a Client Component that receives the ID as a prop */}
        <ComputerDetail assetId={params.id} />
      </Suspense>
    </DashboardLayout>
  );
}
