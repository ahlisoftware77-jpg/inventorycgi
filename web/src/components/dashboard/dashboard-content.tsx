'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query, where, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import SummaryCards from './summary-cards';
import { Skeleton } from '../ui/skeleton';
import { useAuth } from '@/hooks/use-auth';
import AssetDistributionChart from './asset-distribution-chart';
import AssetStatusChart from './asset-status-chart';
import DisposalActivityChart from './disposal-activity-chart';
import MutationActivityChart from './mutation-activity-chart';
import RecentActivity from './recent-activity';
import AnalogClock from './analog-clock';
import QuickActions from './quick-actions';
import TopLocations from './top-locations';
import AIInsights from './ai-insights';
import DailyTip from './daily-tip';
import TodoList from './todo-list';
import DashboardGallery from './dashboard-gallery';
import { Search, Info, ShieldCheck, Activity } from 'lucide-react';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';

/**
 * @fileOverview Konten Dashboard Utama dengan pembatasan visibilitas berdasarkan izin unit.
 */
export default function DashboardContent() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const canViewTimeline = user?.role === 'Admin' || !!user?.permissions?.canViewTimeline;

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    
    const constraints: QueryConstraint[] = [];

    // --- VISIBILITY CONTROL LOGIC (Consistent with Assets Page) ---
    if (user.role !== 'Admin') {
        const userDept = user.department;
        const allowedDepts = user.allowedDepartments || [];
        let allVisibleDepts = [...allowedDepts];
        if (userDept && !allVisibleDepts.includes(userDept)) {
            allVisibleDepts.push(userDept);
        }

        const isPrivileged = ['ACCOUNTING', 'HR & GA', 'GA', 'MANAGEMENT', 'IT'].includes(userDept || '');

        if (userDept === 'ACCOUNTING') {
            constraints.push(where('category', 'in', ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain']));
        } else if (!isPrivileged && allVisibleDepts.length > 0) {
            let expandedDepts = [...allVisibleDepts];
            if (allVisibleDepts.includes('APP')) expandedDepts.push('APP-R&D');
            if (allVisibleDepts.includes('R&D')) expandedDepts.push('APP', 'APP-R&D', 'QC', 'LAB');
            if (allVisibleDepts.includes('PPIC')) expandedDepts.push('MAINTENANCE');
            
            const uniqueExpanded = Array.from(new Set(expandedDepts));
            if (uniqueExpanded.length > 0) {
                constraints.push(where('location', 'in', uniqueExpanded.slice(0, 30)));
            }
        } else if (!isPrivileged && allVisibleDepts.length === 0) {
            setAssets([]);
            setLoading(false);
            return;
        }
    }

    const assetQuery = query(collection(db, 'assets'), ...constraints);
    const unsubAssets = onSnapshot(assetQuery, (snapshot) => {
        const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        const visibleAssets = (user.role === 'Admin' || user.department === 'MANAGEMENT')
            ? assetsData
            : assetsData.filter(asset => asset.status !== 'approved_disposal');
        setAssets(visibleAssets);
        setLoading(false);
    }, (err) => {
        console.error('Error fetching assets:', err);
        setError('Gagal memuat data dashboard.');
        setLoading(false);
    });

    return () => unsubAssets();
  }, [user, authLoading]);

  const summaryData = useMemo(() => {
    const totalAssets = assets.length;
    const totalQuantity = assets.reduce((sum, asset) => sum + (asset.qty || 0), 0);
    const totalValue = assets.reduce((sum, asset) => sum + (asset.price || 0) * (asset.qty || 1), 0);
    const totalValueUSD = assets.reduce((sum, asset) => sum + (asset.priceUSD || 0) * (asset.qty || 1), 0);
    const onLoan = assets.filter((asset) => asset.status === 'Dipinjam').length;
    const damaged = assets.filter((asset) => asset.condition === 'Rusak').length;
    const needsRepair = assets.filter((asset) => asset.condition === 'Perlu Perbaikan').length;
    return {
      totalAssets,
      totalQuantity,
      totalValue,
      totalValueUSD,
      onLoan,
      damaged,
      needsRepair,
    };
  }, [assets]);
  
  const recentActivityAssets = useMemo(() => {
    return [...assets]
      .sort((a, b) => (b.createdAt?.toMillis() ?? 0) - (a.createdAt?.toMillis() ?? 0))
      .slice(0, 5);
  }, [assets]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchTerm.trim()) {
      router.push(`/assets?search=${encodeURIComponent(searchTerm.trim())}`);
    }
  };

  if (error) {
    return <div className="text-destructive text-center p-10 font-bold border-2 border-dashed rounded-3xl bg-rose-50/10 uppercase tracking-tight">{error}</div>;
  }

  if (loading || authLoading) {
      return (
          <div className="space-y-6">
              <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
                  {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
              </div>
              <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
                  <Skeleton className="h-80 rounded-3xl" />
                  <Skeleton className="h-80 rounded-3xl" />
              </div>
              <Skeleton className="h-96 rounded-[3rem]" />
          </div>
      )
  }

  return (
    <div className="space-y-8 max-w-[100vw] overflow-hidden pb-10">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-4 px-1">
            <div className="space-y-1">
                <div className="flex items-center gap-2 mb-1">
                    <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] uppercase tracking-widest px-3 h-5">
                        <Activity className="h-2.5 w-2.5 mr-1" /> Sistem Aktif
                    </Badge>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-black text-[9px] uppercase tracking-widest px-3 h-5">
                        <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Visibilitas Terkontrol
                    </Badge>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase text-left">
                    Halo, {user?.displayName?.split(' ')[0] || 'Admin'}
                </h1>
                <p className="text-sm text-muted-foreground font-medium text-left">Monitoring terpusat aset unit kerja yang Anda kelola.</p>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-3">
                <form onSubmit={handleSearchSubmit} className="relative w-full md:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Cari aset di unit Anda..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-11 h-12 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl shadow-sm font-medium"
                    />
                </form>
            </div>
        </div>
        
        <div className="grid gap-4 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6">
            <SummaryCards data={summaryData} />
        </div>

        <DailyTip />

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-12">
            <div className="lg:col-span-8 grid gap-6 grid-cols-1 md:grid-cols-2">
                <QuickActions />
                <TopLocations assets={assets} />
            </div>
            <div className="lg:col-span-4">
                <AIInsights />
            </div>
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">
            <div className="lg:col-span-1">
                <AssetDistributionChart assets={assets} />
            </div>
            <div className="lg:col-span-1">
                <AnalogClock />
            </div>
            <div className="lg:col-span-1">
                <AssetStatusChart assets={assets} />
            </div>
        </div>

        <div className="grid gap-6 grid-cols-1">
            <DashboardGallery assets={assets} />
            <TodoList />
        </div>

        <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
            <MutationActivityChart assets={assets} />
            <DisposalActivityChart assets={assets} />
        </div>
        
        {canViewTimeline && (
          <RecentActivity assets={recentActivityAssets} />
        )}
        
        <div className="flex items-center justify-center gap-6 pt-10 opacity-30 grayscale pointer-events-none">
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <ShieldCheck className="h-4 w-4" /> Data Integrity Guaranteed
            </div>
            <div className="h-4 w-px bg-slate-300 dark:bg-slate-700" />
            <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <Info className="h-4 w-4" /> Allowed Unit Control Active
            </div>
        </div>
    </div>
  );
}
