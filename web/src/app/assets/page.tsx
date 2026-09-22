'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getDocs, collection, query, where, orderBy, QueryConstraint } from 'firebase/firestore';
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
  const initialConditionFilter = searchParams.get('condition') || 'ALL';

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);

    let q: any;
    const assetsCollection = collection(db, 'assets');
    const constraints: QueryConstraint[] = [];

    // --- VISIBILITY CONTROL LOGIC ---
    // Sesuai permintaan untuk menghemat kuota, semua peran (termasuk Admin & Privileged) 
    // HANYA akan menarik data aset dari lokasi yang sudah diizinkan (allowedDepartments)
    const userDept = user.department;
    const allowedDepts = user.allowedDepartments || [];
    
    let allVisibleDepts = [...allowedDepts];
    if (userDept && !allVisibleDepts.includes(userDept)) {
        allVisibleDepts.push(userDept);
    }

    // Ekspansi Lintas Dept sesuai SOP Internal
    let expandedDepts = [...allVisibleDepts];
    if (allVisibleDepts.includes('APP')) expandedDepts.push('APP-R&D');
    if (allVisibleDepts.includes('R&D')) expandedDepts.push('APP', 'APP-R&D', 'QC', 'LAB');
    if (allVisibleDepts.includes('PPIC')) expandedDepts.push('MAINTENANCE');

    const uniqueExpanded = Array.from(new Set(expandedDepts));

    // Filter khusus divisi Accounting
    if (userDept === 'ACCOUNTING') {
        constraints.push(where('category', 'in', ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain']));
    }

    // Jika bukan Admin dan tidak ada lokasi yang diizinkan, jangan tarik data
    if (user.role !== 'Admin' && uniqueExpanded.length === 0) {
        setAllAssets([]);
        setLoading(false);
        return;
    }

    const fetchAssets = async () => {
      try {
        const assetsData: Asset[] = [];

        if (user.role === 'Admin') {
           // Admin menarik seluruh data terlepas dari allowedDepartments
           const finalQuery = query(assetsCollection, ...constraints, orderBy('code', 'asc'));
           const querySnapshot = await getDocs(finalQuery);
           querySnapshot.forEach((doc) => {
             assetsData.push({ id: doc.id, ...doc.data() } as Asset);
           });
        } else {
           // Selain Admin, batasi dengan chunking location array
           const chunks = [];
           for (let i = 0; i < uniqueExpanded.length; i += 30) {
             chunks.push(uniqueExpanded.slice(i, i + 30));
           }

           for (const chunk of chunks) {
             const chunkConstraints = [...constraints, where('location', 'in', chunk)];
             const finalQuery = query(assetsCollection, ...chunkConstraints, orderBy('code', 'asc'));
             const querySnapshot = await getDocs(finalQuery);
             
             querySnapshot.forEach((doc) => {
               assetsData.push({ id: doc.id, ...doc.data() } as Asset);
             });
           }
        }

        // Hilangkan aset yang sudah disetujui pemusnahannya
        const filteredAssets = assetsData.filter(asset => asset.status !== 'approved_disposal');

        setAllAssets(filteredAssets);
        setLoading(false);
      } catch (err) {
        console.error('Error fetching assets:', err);
        setError('Gagal memuat data aset. Pastikan indeks Firestore sudah dibuat jika diperlukan.');
        setLoading(false);
      }
    };

    fetchAssets();
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
        initialConditionFilter={initialConditionFilter}
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
