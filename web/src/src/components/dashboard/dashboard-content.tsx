
'use client';

import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, query, where, QueryConstraint, orderBy, limit, Timestamp, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type HelpdeskTicket } from '@/lib/types';
import SummaryCards from './summary-cards';
import AssetDistributionChart from './asset-distribution-chart';
import { Skeleton } from '../ui/skeleton';
import AssetStatusChart from './asset-status-chart';
import Link from 'next/link';
import { Button } from '../ui/button';
import { ArrowRight } from 'lucide-react';
import RecentActivity from './recent-activity';
import { useAuth } from '@/hooks/use-auth';

export default function DashboardContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [timelineItems, setTimelineItems] = useState<(Asset | HelpdeskTicket)[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    
    // Query for summary cards and charts
    const assetQueryConstraints: QueryConstraint[] = [];
    const unrestrictedDepts = ['HR & GA', 'MANAGEMENT'];

    if (user.department === 'ACCOUNTING') {
      assetQueryConstraints.push(where('category', 'in', ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain']));
    } else if (user.role !== 'Admin' && !unrestrictedDepts.includes(user.department || '') && user.department) {
        let userDepartments: string[];
        if (user.department === 'APP') userDepartments = ['APP', 'APP-R&D'];
        else if (['R&D', 'APP-R&D'].includes(user.department)) userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
        else if (user.department === 'PPIC') userDepartments = ['PPIC', 'MAINTENANCE'];
        else userDepartments = [user.department];
        
        if (userDepartments.length > 0) assetQueryConstraints.push(where('location', 'in', userDepartments));
        else { setLoading(false); return; }
    } else if (user.role !== 'Admin' && !unrestrictedDepts.includes(user.department || '') && !user.department) {
      setAssets([]); setLoading(false); return;
    }

    const assetQuery = query(collection(db, 'assets'), ...assetQueryConstraints);
    const unsubAssets = onSnapshot(assetQuery, (snapshot) => {
        const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const visibleAssets = (user.role === 'Admin' || user.department === 'MANAGEMENT')
            ? assetsData
            : assetsData.filter(asset => asset.status !== 'approved_disposal');
        setAssets(visibleAssets);
    }, (err) => {
        console.error('Error fetching assets:', err);
        setError('Gagal memuat data aset.');
    });

    // Unified Timeline Query
    const thirtyDaysAgo = Timestamp.fromMillis(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const creationQuery = query(collection(db, 'assets'), where('createdAt', '>=', thirtyDaysAgo), orderBy('createdAt', 'desc'), limit(10));
    const approvalQuery = query(collection(db, 'assets'), where('approvedAt', '>=', thirtyDaysAgo), orderBy('approvedAt', 'desc'), limit(10));
    const helpdeskQuery = query(collection(db, 'helpdesk_tickets'), where('reportedAt', '>=', thirtyDaysAgo), orderBy('reportedAt', 'desc'), limit(10));

    const unsubCreation = onSnapshot(creationQuery, () => {});
    const unsubApproval = onSnapshot(approvalQuery, () => {});
    const unsubHelpdesk = onSnapshot(helpdeskQuery, () => {});

    Promise.all([getDocs(creationQuery), getDocs(approvalQuery), getDocs(helpdeskQuery)]).then(([creationSnapshot, approvalSnapshot, helpdeskSnapshot]) => {
        const itemsMap = new Map<string, Asset | HelpdeskTicket>();
        
        creationSnapshot.forEach(doc => itemsMap.set(doc.id, { ...doc.data(), id: doc.id } as Asset));
        approvalSnapshot.forEach(doc => itemsMap.set(doc.id, { ...doc.data(), id: doc.id } as Asset));
        helpdeskSnapshot.forEach(doc => itemsMap.set(doc.id, { ...doc.data(), id: doc.id } as HelpdeskTicket));

        const combinedItems = Array.from(itemsMap.values());

        const sortedItems = combinedItems.sort((a, b) => {
            const timeA = (a as Asset).approvedAt || (a as Asset).createdAt || (a as HelpdeskTicket).reportedAt;
            const timeB = (b as Asset).approvedAt || (b as Asset).createdAt || (b as HelpdeskTicket).reportedAt;
            return (timeB?.toMillis() || 0) - (timeA?.toMillis() || 0);
        });
        
        setTimelineItems(sortedItems);
        setLoading(false);
    }).catch(err => {
        console.error("Error fetching timeline data:", err);
        setError('Gagal memuat linimasa aktivitas.');
        setLoading(false);
    });

    return () => {
      unsubAssets();
      unsubCreation();
      unsubApproval();
      unsubHelpdesk();
    };
  }, [user, authLoading]);

  const summaryData = useMemo(() => {
    const totalAssets = assets.reduce((sum, asset) => sum + (asset.qty || 0), 0);
    const totalValue = assets.reduce((sum, asset) => sum + (asset.price || 0) * (asset.qty || 1), 0);
    const totalValueUSD = assets.reduce((sum, asset) => sum + (asset.priceUSD || 0) * (asset.qty || 1), 0);
    const onLoan = assets.filter((asset) => asset.status === 'Dipinjam').length;
    const damaged = assets.filter((asset) => asset.condition === 'Rusak').length;
    const needsRepair = assets.filter((asset) => asset.condition === 'Perlu Perbaikan').length;
    return {
      totalAssets,
      totalValue,
      totalValueUSD,
      onLoan,
      damaged,
      needsRepair,
    };
  }, [assets]);

  if (error) {
    return <div className="text-destructive text-center">{error}</div>;
  }
  
  return (
    <div className="flex flex-col gap-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h1 className="text-xl md:text-2xl font-bold">Dasbor Ringkasan</h1>
              {user && user.role !== 'Admin' && user.department && user.department !== 'MANAGEMENT' && (
                  <p className="text-lg text-orange-500 font-bold">
                      Aset Departemen "{user.department}"
                  </p>
              )}
            </div>
            <Button asChild>
                <Link href="/assets">
                Lihat Semua Aset <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
            </Button>
        </div>
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-6">
        {loading || authLoading ? (
            Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[126px]" />)
        ) : (
            <SummaryCards data={summaryData} />
        )}
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <div className="lg:col-span-4">
          {loading || authLoading ? (
            <Skeleton className="h-[350px]" />
          ) : (
            <AssetDistributionChart assets={assets} />
          )}
        </div>
        <div className="lg:col-span-3">
          {loading || authLoading ? (
            <Skeleton className="h-[350px]" />
          ) : (
            <AssetStatusChart assets={assets} />
          )}
        </div>
      </div>
      <div>
        {loading || authLoading ? (
          <Skeleton className="h-[400px]" />
        ) : (
          <RecentActivity items={timelineItems} />
        )}
      </div>
    </div>
  );
}
