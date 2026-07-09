
import AssetDetail from '@/components/assets/asset-detail';
import DashboardLayout from '@/components/dashboard/layout';
import { db } from '@/lib/firebase/config';
import { collection, getDocs } from 'firebase/firestore';
import { Suspense } from 'react';

export const dynamicParams = false;

export async function generateStaticParams() {
  try {
    const querySnapshot = await getDocs(collection(db, 'assets'));
    return querySnapshot.docs.map((doc) => ({
      id: doc.id,
    }));
  } catch (error) {
    console.error("Failed to generate static params for assets:", error);
    return [];
  }
}

// This is the Server Component page wrapper. It does not use 'use client'.
export default function AssetDetailPage({ params }: { params: { id: string } }) {
  return (
    <DashboardLayout>
      <Suspense fallback={<div>Loading asset...</div>}>
        {/* The actual content is in a Client Component that receives the ID as a prop */}
        <AssetDetail assetId={params.id} />
      </Suspense>
    </DashboardLayout>
  );
}
