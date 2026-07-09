'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { onSnapshot, collection, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import DashboardLayout from '@/components/dashboard/layout';
import AssetList from '@/components/assets/asset-list';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * @fileOverview Halaman daftar aset utama dengan filtrasi visibilitas granular.
 * Akses data dibatasi berdasarkan departemen yang diizinkan (Allowed Departments) pada profil user.
 */
function AssetsPageContent() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  
  const searchParams = useSearchParams();
  const initialSearchTerm = searchParams.get('search') || '';
  const initialCategoryFilter = searchParams.get('category') || 'ALL';

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);

    let q: any;
    const assetsCollection = collection(db, 'assets');
    const constraints: QueryConstraint[] = [];

    // --- VISIBILITY CONTROL LOGIC ---
    if (user.role === 'Admin') {
        // Admin melihat semua kecuali yang disembunyikan filter lain
    } else {
        // Gabungkan Departemen Primer dan Departemen yang Diizinkan (Granular)
        const userDept = user.department;
        const allowedDepts = user.allowedDepartments || [];
        
        let allVisibleDepts = [...allowedDepts];
        if (userDept && !allVisibleDepts.includes(userDept)) {
            allVisibleDepts.push(userDept);
        }

        // Ekspansi Lintas Dept jika diperlukan (e.g., Accounting, IT, GA)
        const isPrivileged = ['ACCOUNTING', 'HR & GA', 'MANAGEMENT', 'IT'].includes(userDept || '');
        
        if (userDept === 'ACCOUNTING') {
            constraints.push(where('category', 'in', ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain']));
        } else if (!isPrivileged && allVisibleDepts.length > 0) {
            // Pemetaan Grup Departemen (SOP Internal PT CGI)
            let expandedDepts = [...allVisibleDepts];
            if (allVisibleDepts.includes('APP')) expandedDepts.push('APP-R&D');
            if (allVisibleDepts.includes('R&D')) expandedDepts.push('APP', 'APP-R&D', 'QC', 'LAB');
            if (allVisibleDepts.includes('PPIC')) expandedDepts.push('MAINTENANCE');
            
            const uniqueExpanded = Array.from(new Set(expandedDepts));
            
            // Firestore 'in' operator limited to 30 items
            if (uniqueExpanded.length > 0) {
                constraints.push(where('location', 'in', uniqueExpanded.slice(0, 30)));
            }
        } else if (!isPrivileged && allVisibleDepts.length === 0) {
            // User tanpa unit terdaftar tidak melihat apapun
            setAllAssets([]);
            setLoading(false);
            return;
        }
    }

    // Urutan default
    const finalQuery = query(assetsCollection, ...constraints, orderBy('code', 'asc'));
    
    const unsubscribe = onSnapshot(
      finalQuery,
      (querySnapshot) => {
        const assetsData: Asset[] = [];
        querySnapshot.forEach((doc) => {
          assetsData.push({ id: doc.id, ...doc.data() } as Asset);
        });
        
        const filteredAssets = assetsData.filter(asset => 
            asset.status !== 'approved_disposal'
        );

        setAllAssets(filteredAssets);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching assets:', err);
        setError('Gagal memuat data aset. Pastikan indeks Firestore sudah dibuat jika diperlukan.');
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  if (authLoading || loading) {
    return (
      <DashboardLayout>
        <div className="space-y-4">
          <Skeleton className="h-12 w-1/3 rounded-xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </div>
      </DashboardLayout>
    );
  }
  
  if (error) {
    return (
        <DashboardLayout>
            <div className="text-destructive text-center p-10 border-2 border-dashed border-destructive/20 rounded-[2rem] bg-rose-50/10">
              <h3 className="font-black uppercase tracking-tight text-xl mb-2">Gagal Memuat Data</h3>
              <p className="font-medium text-sm text-muted-foreground">{error}</p>
            </div>
        </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <AssetList 
        assets={allAssets} 
        initialSearchTerm={initialSearchTerm} 
        initialCategoryFilter={initialCategoryFilter}
      />
    </DashboardLayout>
  );
}

export default function AssetsPage() {
    return (
        <Suspense fallback={<div>Loading Assets...</div>}>
            <AssetsPageContent />
        </Suspense>
    );
}
