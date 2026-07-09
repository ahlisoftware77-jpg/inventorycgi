
'use client';

import { useState, useEffect, Suspense, useMemo, useRef } from 'react';
import { onSnapshot, collection, query, QueryConstraint, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import DashboardLayout from '@/components/dashboard/layout';
import AssetTable from '@/components/assets/asset-table';
import AssetDetail from '@/components/assets/asset-detail';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { X, MousePointerClick } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useIsMobile } from '@/hooks/use-mobile';


function AssetsPageContent() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { user, loading: authLoading } = useAuth();
  
  const searchParams = useSearchParams();
  const initialSelectedId = searchParams.get('selectedAssetId');
  const [selectedAssetId, setSelectedAssetId] = useState<string | null>(initialSelectedId);
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const isMobile = useIsMobile();


  useEffect(() => {
    if (authLoading || !user) return; // Wait for user and auth to be loaded
    
    setLoading(true);

    const queryConstraints: QueryConstraint[] = [];
    const unrestrictedDepts = ['HR & GA', 'MANAGEMENT'];

    // Accounting can see all A-series assets.
    if (user.department === 'ACCOUNTING') {
      queryConstraints.push(where('category', 'in', ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain']));
    } else if (user.role !== 'Admin' && !unrestrictedDepts.includes(user.department || '') && user.department) {
        let userDepartments: string[];
        if (user.department === 'APP') {
          userDepartments = ['APP', 'APP-R&D'];
        } else if (['R&D', 'APP-R&D'].includes(user.department)) {
          userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
        } else if (user.department === 'PPIC') {
            userDepartments = ['PPIC', 'MAINTENANCE'];
        } else {
            userDepartments = [user.department];
        }
        
        if (userDepartments.length > 0) {
            queryConstraints.push(where('location', 'in', userDepartments));
        } else {
            setAllAssets([]);
            setLoading(false);
            return;
        }

    } else if (user.role !== 'Admin' && !unrestrictedDepts.includes(user.department || '') && !user.department) {
        setAllAssets([]);
        setLoading(false);
        return;
    }
    
    const q = query(collection(db, 'assets'), ...queryConstraints);

    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const assetsData: Asset[] = [];
        querySnapshot.forEach((doc) => {
          assetsData.push({ id: doc.id, ...doc.data() } as Asset);
        });
        
        const visibleAssets = (user.role === 'Admin' || user.department === 'MANAGEMENT')
            ? assetsData
            : assetsData.filter(asset => asset.status !== 'approved_disposal');

        setAllAssets(visibleAssets);
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

  // This is passed to AssetTable so it can report back the filtered/sorted assets
  const [displayedAssets, setDisplayedAssets] = useState<Asset[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      if (displayedAssets.length === 0) return;

      e.preventDefault();

      const currentIndex = selectedAssetId ? displayedAssets.findIndex(a => a.id === selectedAssetId) : -1;
      let nextIndex = -1;

      if (e.key === 'ArrowDown') {
        nextIndex = currentIndex < displayedAssets.length - 1 ? currentIndex + 1 : 0;
      } else { // ArrowUp
        nextIndex = currentIndex > 0 ? currentIndex - 1 : displayedAssets.length - 1;
      }

      if (nextIndex !== -1) {
        const nextAsset = displayedAssets[nextIndex];
        setSelectedAssetId(nextAsset.id);
        
        // Scroll the item into view in the table
        const rowId = `asset-row-${nextAsset.id}`;
        const rowElement = tableContainerRef.current?.querySelector(`#${rowId}`);
        rowElement?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedAssetId, displayedAssets]);
  
  if (error) {
    return (
        <DashboardLayout>
            <div className="text-destructive text-center p-4 border border-destructive/50 rounded-md">
              <h3 className="font-bold">Gagal Memuat Data</h3>
              <p>{error}</p>
              <p className="text-sm text-muted-foreground mt-2">Ini bisa terjadi jika query Firestore memerlukan indeks yang belum dibuat. Silakan periksa log error untuk link pembuatan indeks.</p>
            </div>
        </DashboardLayout>
    );
  }

  const detailView = selectedAssetId ? (
    <ScrollArea className="h-full">
      <div className="p-1">
        <AssetDetail assetId={selectedAssetId} isEmbedded={true}/>
      </div>
    </ScrollArea>
  ) : (
    <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
      <MousePointerClick className="h-12 w-12 mb-4" />
      <h3 className="text-lg font-semibold">Belum Ada Aset yang Dipilih</h3>
      <p className="text-sm">Klik salah satu baris dari tabel di sebelah kiri untuk menampilkan detailnya di sini.</p>
      <p className="text-xs mt-2">(Anda juga bisa menggunakan tombol panah atas/bawah)</p>
    </div>
  );


  return (
    <DashboardLayout>
      <div className="flex flex-col lg:flex-row gap-4 h-[calc(100vh-10rem)]">
        <div ref={tableContainerRef} className={cn("flex flex-col h-full", isMobile ? "w-full" : "w-[65%]")}>
          <AssetTable 
            assets={allAssets} 
            loading={loading || authLoading} 
            onRowClick={(assetId) => setSelectedAssetId(assetId)}
            selectedAssetId={selectedAssetId}
            onDisplayedAssetsChange={setDisplayedAssets}
          />
        </div>
        
        {!isMobile && (
          <div className="w-full lg:w-[35%] flex flex-col">
             <Card className="flex-1 flex flex-col min-h-0">
                <CardContent className="p-0 relative flex-1">
                    {selectedAssetId && (
                         <Button
                            variant="ghost"
                            size="icon"
                            className="absolute top-4 right-4 z-10 bg-background/50 rounded-full"
                            onClick={() => setSelectedAssetId(null)}
                          >
                            <X className="h-4 w-4" />
                            <span className="sr-only">Tutup Detail</span>
                          </Button>
                    )}
                   {selectedAssetId ? (
                      <ScrollArea className="h-full">
                        <div className="p-6">
                          <AssetDetail assetId={selectedAssetId} isEmbedded={true}/>
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-full text-center text-muted-foreground p-8">
                        <MousePointerClick className="h-12 w-12 mb-4" />
                        <h3 className="text-lg font-semibold">Belum Ada Aset yang Dipilih</h3>
                        <p className="text-sm">Klik salah satu baris dari tabel untuk menampilkan detailnya.</p>
                         <p className="text-xs mt-2">(Anda juga bisa menggunakan tombol panah atas/bawah)</p>
                      </div>
                    )}
                </CardContent>
            </Card>
          </div>
        )}
      </div>

      {isMobile && (
        <Dialog open={!!selectedAssetId} onOpenChange={(open) => { if (!open) setSelectedAssetId(null); }}>
          <DialogContent className="max-w-[95vw] h-[85vh] flex flex-col p-0">
            <DialogHeader className="p-4 border-b">
              <DialogTitle>Detail Aset</DialogTitle>
              <DialogDescription>Rincian lengkap untuk aset yang dipilih.</DialogDescription>
            </DialogHeader>
            <div className="flex-1 min-h-0 p-4">
              {detailView}
            </div>
          </DialogContent>
        </Dialog>
      )}

    </DashboardLayout>
  );
}

export default function AssetsPage() {
    return (
        <Suspense>
            <AssetsPageContent />
        </Suspense>
    )
}
