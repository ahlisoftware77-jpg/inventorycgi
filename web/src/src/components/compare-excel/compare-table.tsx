

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { collection, onSnapshot, query, where, doc, updateDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type DataFixAssetAccounting, type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Upload, FileDown, Search, Pencil, RefreshCw, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Timestamp } from 'firebase/firestore';
import ImportFixAssetDialog from './import-fix-asset-dialog';
import { Input } from '../ui/input';
import { useAuth } from '@/hooks/use-auth';


type CompareResult = {
  match: 'both' | 'left-only' | 'right-only';
  dataAset?: Partial<Asset & { id: string; }>;
  dataFixAsset?: Partial<DataFixAssetAccounting>;
  isDifferent: boolean;
};

const DataTable = ({ 
    title, 
    data, 
    headers, 
    isEditable, 
    editingCell, 
    onCellClick, 
    onCellChange, 
    onCellBlur,
    onSyncClick,
    updatingSyncId,
    onDeleteClick,
    deletingId
}: { 
    title: string; 
    data: (any)[]; 
    headers: string[];
    isEditable?: boolean;
    editingCell?: { id: string; field: string; value: string; } | null;
    onCellClick?: (id: string, field: string, value: string) => void;
    onCellChange?: (e: React.ChangeEvent<HTMLInputElement>) => void;
    onCellBlur?: () => void;
    onSyncClick?: (id: string) => void;
    updatingSyncId?: string | null;
    onDeleteClick?: (id: string, code: string) => void;
    deletingId?: string | null;
}) => {
  return (
    <div className="w-full lg:w-1/2 flex flex-col h-full">
      <div className="p-2 bg-gray-100 dark:bg-gray-800 rounded-t-lg">
        <h3 className="font-semibold text-center">{title}</h3>
      </div>
      <div className="flex-grow overflow-auto border-l border-r border-b rounded-b-lg">
        <table className="w-full text-xs excel-table">
          <thead className="sticky top-0 bg-gray-200 dark:bg-gray-700 z-10">
            <tr>
              {headers.map(header => (
                <th key={header} className="p-1 border border-gray-300 dark:border-gray-600 font-semibold uppercase">{header.replace(/_/g, ' ')}</th>
              ))}
              {onSyncClick && <th className="p-1 border border-gray-300 dark:border-gray-600 font-semibold">SYNC</th>}
              {onDeleteClick && <th className="p-1 border border-gray-300 dark:border-gray-600 font-semibold">HAPUS</th>}
            </tr>
          </thead>
          <tbody>
            {data.length > 0 ? data.map((item, index) => (
              <tr key={item.key || index} className={cn(item.highlight, "hover:bg-accent/50")}>
                {headers.map(header => {
                  const isEditingThisCell = isEditable && (header === 'kode_aset' || header === 'nama_aset') && editingCell?.id === item.id && editingCell?.field === header;
                  return (
                    <td 
                      key={header} 
                      className={cn(
                        "p-1 border border-gray-300 dark:border-gray-600 truncate max-w-[150px] relative group hover:whitespace-normal hover:max-w-none hover:z-20 hover:bg-yellow-200 dark:hover:bg-yellow-800",
                        isEditable && (header === 'kode_aset' || header === 'nama_aset') && "cursor-pointer",
                        isEditingThisCell ? "p-0" : ""
                      )}
                      onClick={() => isEditable && (header === 'kode_aset' || header === 'nama_aset') && onCellClick && item.id && onCellClick(item.id, header, item[header] || '')}
                    >
                      {isEditingThisCell ? (
                        <Input
                          type="text"
                          value={editingCell.value}
                          onChange={onCellChange}
                          onBlur={onCellBlur}
                          onKeyDown={(e) => e.key === 'Enter' && onCellBlur && onCellBlur()}
                          autoFocus
                          className="h-full w-full text-xs p-1 bg-background"
                        />
                      ) : (
                        <>
                          {item[header] instanceof Timestamp ? item[header].toDate().toLocaleDateString('id-ID') : (item[header] !== undefined ? String(item[header]) : '')}
                           {isEditable && (header === 'kode_aset' || header === 'nama_aset') && item.id && (
                            <Pencil className="h-3 w-3 absolute top-1 right-1 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                          )}
                        </>
                      )}
                    </td>
                  )
                })}
                {onSyncClick && (
                    <td className="p-1 border border-gray-300 dark:border-gray-600 text-center">
                        {item.showSync && (
                            <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0"
                                onClick={() => onSyncClick(item.id)}
                                disabled={updatingSyncId === item.id}
                            >
                                {updatingSyncId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <RefreshCw className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </td>
                )}
                 {onDeleteClick && (
                    <td className="p-1 border border-gray-300 dark:border-gray-600 text-center">
                        {item.id && (
                             <Button
                                size="sm"
                                variant="ghost"
                                className="h-6 w-6 p-0 text-destructive"
                                onClick={() => onDeleteClick(item.id, item.kode_aset)}
                                disabled={deletingId === item.id}
                            >
                                {deletingId === item.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                    <Trash2 className="h-4 w-4" />
                                )}
                            </Button>
                        )}
                    </td>
                )}
              </tr>
            )) : (
              <tr>
                <td colSpan={headers.length + (onSyncClick ? 1 : 0) + (onDeleteClick ? 1 : 0)} className="text-center p-4 text-muted-foreground">Tidak ada data.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};


export default function CompareTable() {
  const [dataAset, setDataAset] = useState<Asset[]>([]);
  const [dataFixAsset, setDataFixAsset] = useState<DataFixAssetAccounting[]>([]);
  const [loading, setLoading] = useState(true);
  const [isComparing, setIsComparing] = useState(false);
  const [compareResult, setCompareResult] = useState<CompareResult[]>([]);
  const [showOnlyDifferent, setShowOnlyDifferent] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingCell, setEditingCell] = useState<{ id: string; field: string; value: string; type: 'internal' | 'accounting' } | null>(null);
  const [updatingSyncId, setUpdatingSyncId] = useState<string | null>(null);
  const [deletingInfo, setDeletingInfo] = useState<{ id: string; code: string; } | null>(null);
  const [isSyncingAll, setIsSyncingAll] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!authLoading && user?.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Halaman ini hanya untuk Admin.',
      });
      router.push('/');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user?.role !== 'Admin') {
      setLoading(false);
      return;
    }
    
    setLoading(true);
    const aSeriesCategories = ['A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain'];
    const asetQuery = query(collection(db, 'assets'), where('category', 'in', aSeriesCategories));

    const unsubAset = onSnapshot(asetQuery, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setDataAset(data);
    }, (error) => console.error("Error fetching assets:", error));

    const unsubFixAsset = onSnapshot(query(collection(db, 'data_fix_asset_accounting')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as DataFixAssetAccounting));
      setDataFixAsset(data);
    }, (error) => console.error("Error fetching data_fix_asset_accounting:", error));

    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
      unsubAset();
      unsubFixAsset();
      clearTimeout(timer);
    };
  }, [user]);

  const handleCompare = () => {
    setIsComparing(true);
    const results: CompareResult[] = [];
    const mapAset = new Map(dataAset.map(item => [item.code.trim().toLowerCase(), item]));
    const mapFixAsset = new Map(dataFixAsset.map(item => [(item.kode_aset || '').toString().trim().toLowerCase(), item]));

    for (const [kode, aset] of mapAset.entries()) {
      if (mapFixAsset.has(kode)) {
        const fixAsset = mapFixAsset.get(kode)!;
        const isNameDifferent = aset.name.trim().toLowerCase() !== fixAsset.nama_aset.trim().toLowerCase();
        const isQtyDifferent = (!fixAsset.jumlah || fixAsset.jumlah === 0) && (aset.qty || 0) > 0;
        const isDifferent = isNameDifferent || isQtyDifferent;
        results.push({ match: 'both', dataAset: aset, dataFixAsset: fixAsset, isDifferent });
        mapFixAsset.delete(kode);
      } else {
        results.push({ match: 'left-only', dataAset: aset, isDifferent: true });
      }
    }

    for (const [, fixAsset] of mapFixAsset.entries()) {
      results.push({ match: 'right-only', dataFixAsset: fixAsset, isDifferent: true });
    }
    
    setCompareResult(results.sort((a, b) => ((a.dataAset?.code || a.dataFixAsset?.kode_aset) ?? '').localeCompare(b.dataAset?.code || b.dataFixAsset?.kode_aset || '')));
    setIsComparing(false);
    toast({ title: 'Perbandingan Selesai', description: `${results.length} total baris data dianalisis.` });
  };

  const handleExport = () => {
    if (compareResult.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
      return;
    }

    const dataToExport = compareResult.map(res => ({
      'KODE_ASET_INTERNAL': res.dataAset?.code,
      'NAMA_ASET_INTERNAL': res.dataAset?.name,
      'JUMLAH_INTERNAL': res.dataAset?.qty,
      'KODE_ASET_AKUNTANSI': res.dataFixAsset?.kode_aset,
      'NAMA_ASET_ACC': res.dataFixAsset?.nama_aset,
      'JUMLAH_ACC': res.dataFixAsset?.jumlah,
      'STATUS': res.match === 'both' ? (res.isDifferent ? 'BERBEDA' : 'COCOK') : (res.match === 'left-only' ? 'HANYA DI INTERNAL' : 'HANYA DI AKUNTANSI'),
    }));

    const ws = XLSX.utils.json_to_sheet(dataToExport);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Hasil Perbandingan');
    XLSX.writeFile(wb, 'Hasil_Perbandingan_Aset.xlsx');
  };
  
  const handleCellBlur = () => {
    if (!editingCell) return;

    if (editingCell.type === 'internal') {
        if(editingCell.field === 'kode_aset') {
            handleUpdateInternalKodeAset();
        } else if (editingCell.field === 'nama_aset') {
            handleUpdateInternalNamaAset();
        }
    } else {
        if(editingCell.field === 'kode_aset') {
            handleUpdateAccountingKodeAset();
        } else if (editingCell.field === 'nama_aset') {
            handleUpdateAccountingNamaAset();
        }
    }
  };

  const handleUpdateAccountingKodeAset = async () => {
    if (!editingCell || editingCell.type !== 'accounting' || editingCell.field !== 'kode_aset') return;

    const originalItem = dataFixAsset.find(item => item.id === editingCell.id);
    if (!originalItem || originalItem.kode_aset === editingCell.value) {
        setEditingCell(null);
        return;
    }

    const docRef = doc(db, "data_fix_asset_accounting", editingCell.id);
    try {
        await updateDoc(docRef, { kode_aset: editingCell.value });
        toast({ title: "Berhasil", description: `Kode aset akuntansi telah diperbarui.` });
    } catch (error) {
        console.error("Error updating accounting kode aset:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Gagal memperbarui kode aset akuntansi." });
    } finally {
        setEditingCell(null);
    }
  };
  
  const handleUpdateAccountingNamaAset = async () => {
    if (!editingCell || editingCell.type !== 'accounting' || editingCell.field !== 'nama_aset') return;

    const originalItem = dataFixAsset.find(item => item.id === editingCell.id);
    if (!originalItem || originalItem.nama_aset === editingCell.value) {
        setEditingCell(null);
        return;
    }

    const docRef = doc(db, "data_fix_asset_accounting", editingCell.id);
    try {
        await updateDoc(docRef, { nama_aset: editingCell.value });
        toast({ title: "Berhasil", description: `Nama aset akuntansi telah diperbarui.` });
    } catch (error) {
        console.error("Error updating accounting nama aset:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Gagal memperbarui nama aset akuntansi." });
    } finally {
        setEditingCell(null);
    }
  };

  const handleUpdateInternalKodeAset = async () => {
    if (!editingCell || editingCell.type !== 'internal' || editingCell.field !== 'kode_aset') return;

    const originalItem = dataAset.find(item => item.id === editingCell.id);
    if (!originalItem || originalItem.code === editingCell.value) {
        setEditingCell(null);
        return;
    }

    const docRef = doc(db, "assets", editingCell.id);
    try {
        await updateDoc(docRef, { code: editingCell.value });
        
        setDataAset(prev => prev.map(item => item.id === editingCell.id ? { ...item, code: editingCell.value } : item));

        toast({ title: "Berhasil", description: `Kode aset internal telah diperbarui.` });
    } catch (error) {
        console.error("Error updating internal kode aset:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Gagal memperbarui kode aset internal." });
    } finally {
        setEditingCell(null);
    }
  };
  
  const handleUpdateInternalNamaAset = async () => {
    if (!editingCell || editingCell.type !== 'internal' || editingCell.field !== 'nama_aset') return;

    const originalItem = dataAset.find(item => item.id === editingCell.id);
    if (!originalItem || originalItem.name === editingCell.value) {
        setEditingCell(null);
        return;
    }

    const docRef = doc(db, "assets", editingCell.id);
    try {
        await updateDoc(docRef, { name: editingCell.value });

        setDataAset(prev => prev.map(item => item.id === editingCell.id ? { ...item, name: editingCell.value } : item));

        toast({ title: "Berhasil", description: `Nama aset internal telah diperbarui.` });
    } catch (error) {
        console.error("Error updating internal nama aset:", error);
        toast({ variant: "destructive", title: "Gagal", description: "Gagal memperbarui nama aset internal." });
    } finally {
        setEditingCell(null);
    }
  };

  const handleSyncData = async (fixAssetId: string) => {
    setUpdatingSyncId(fixAssetId);
    
    const compareItem = compareResult.find(res => res.dataFixAsset?.id === fixAssetId);
    if (!compareItem || !compareItem.dataAset || !compareItem.dataFixAsset) {
        toast({ variant: "destructive", title: "Gagal", description: "Tidak dapat menemukan data internal yang sesuai." });
        setUpdatingSyncId(null);
        return;
    }

    const docRef = doc(db, "data_fix_asset_accounting", fixAssetId);
    try {
        await updateDoc(docRef, {
            kode_aset: compareItem.dataAset.code,
            nama_aset: compareItem.dataAset.name,
            jumlah: compareItem.dataAset.qty,
        });
        toast({
            title: "Sinkronisasi Berhasil",
            description: `Data untuk kode ${compareItem.dataAset.code} telah disamakan.`,
        });
        
        setCompareResult(prev => prev.map(res => 
            res.dataFixAsset?.id === fixAssetId
            ? { ...res, isDifferent: false, dataFixAsset: {...res.dataFixAsset, kode_aset: compareItem.dataAset!.code, nama_aset: compareItem.dataAset!.name, jumlah: compareItem.dataAset!.qty} }
            : res
        ));

    } catch (error) {
        console.error("Error syncing data:", error);
        toast({
            variant: "destructive",
            title: "Gagal Sinkronisasi",
            description: "Terjadi kesalahan saat memperbarui data.",
        });
    } finally {
        setUpdatingSyncId(null);
    }
  };
  
  const handleSyncAll = async () => {
    const itemsToSync = compareResult.filter(res => res.isDifferent && res.match === 'both' && res.dataFixAsset?.id);
    if (itemsToSync.length === 0) {
        toast({ title: 'Tidak Ada Data untuk Disinkronkan' });
        return;
    }

    setIsSyncingAll(true);
    const batch = writeBatch(db);
    itemsToSync.forEach(item => {
        const docRef = doc(db, "data_fix_asset_accounting", item.dataFixAsset!.id!);
        batch.update(docRef, {
            kode_aset: item.dataAset!.code,
            nama_aset: item.dataAset!.name,
            jumlah: item.dataAset!.qty,
        });
    });

    try {
        await batch.commit();
        toast({
            title: "Sinkronisasi Massal Berhasil",
            description: `${itemsToSync.length} data aset telah berhasil disinkronkan.`,
        });
        // Refresh the comparison to reflect changes
        handleCompare();
    } catch (error) {
        console.error("Error during bulk sync:", error);
        toast({
            variant: "destructive",
            title: "Gagal Sinkronisasi Massal",
            description: "Terjadi kesalahan saat memperbarui data secara massal.",
        });
    } finally {
        setIsSyncingAll(false);
    }
  };

  const confirmDelete = async () => {
    if (!deletingInfo) return;

    try {
        await deleteDoc(doc(db, "data_fix_asset_accounting", deletingInfo.id));
        toast({
            title: "Berhasil Dihapus",
            description: `Data dengan kode ${deletingInfo.code} telah dihapus.`,
        });
        setDeletingInfo(null);
    } catch (error) {
        console.error("Error deleting document:", error);
        toast({
            variant: "destructive",
            title: "Gagal Menghapus",
            description: "Terjadi kesalahan saat menghapus data.",
        });
    } finally {
        setDeletingInfo(null);
    }
  };


  const filteredCompareResult = useMemo(() => {
    if (!searchTerm && !showOnlyDifferent) return compareResult;
    
    return compareResult.filter(item => {
        const differentMatch = !showOnlyDifferent || item.isDifferent;
        if (!searchTerm) return differentMatch;

        const lowerSearch = searchTerm.toLowerCase();
        const codeMatch = ((item.dataAset?.code || item.dataFixAsset?.kode_aset)?.toString() || '').toLowerCase().includes(lowerSearch);
        const nameMatch = ((item.dataAset?.name || item.dataFixAsset?.nama_aset)?.toString() || '').toLowerCase().includes(lowerSearch);

        return differentMatch && (codeMatch || nameMatch);
    });
  }, [compareResult, showOnlyDifferent, searchTerm]);


  const displayData = useMemo(() => {
    const data = filteredCompareResult;

    const alignedLeft: any[] = [];
    const alignedRight: any[] = [];
    
    data.forEach((item) => {
        const highlight = !item.isDifferent
            ? 'bg-green-100 dark:bg-green-900/50'
            : (item.match === 'both' ? 'bg-yellow-100 dark:bg-yellow-900/50' : 'bg-red-100 dark:bg-red-900/50');
      const key = item.dataAset?.id || item.dataFixAsset?.id;
      const dataAset = { id: item.dataAset?.id, kode_aset: item.dataAset?.code, nama_aset: item.dataAset?.name, jumlah: item.dataAset?.qty, costCenter: item.dataAset?.costCenter, lokasi: item.dataAset?.location, highlight, key };
      const dataFixAsset = { id: item.dataFixAsset?.id, kode_aset: item.dataFixAsset?.kode_aset, nama_aset: item.dataFixAsset?.nama_aset, jumlah: item.dataFixAsset?.jumlah, harga: item.dataFixAsset?.harga, tanggal_perolehan: item.dataFixAsset?.tanggal_perolehan, penyusutan: item.dataFixAsset?.penyusutan, highlight, key, showSync: item.match === 'both' && item.isDifferent };

      if (item.match === 'both') {
          alignedLeft.push(dataAset);
          alignedRight.push(dataFixAsset);
      } else if (item.match === 'left-only') {
          alignedLeft.push(dataAset);
          alignedRight.push({ highlight: 'bg-red-100 dark:bg-red-900/50', key: `r-empty-${key}` });
      } else { // 'right-only'
          alignedLeft.push({ highlight: 'bg-red-100 dark:bg-red-900/50', key: `l-empty-${key}` });
          alignedRight.push(dataFixAsset);
      }
    });

    return { leftData: alignedLeft, rightData: alignedRight };
  }, [filteredCompareResult]);

  const headersAset = ["kode_aset", "nama_aset", "jumlah", "costCenter", "lokasi"];
  const headersFixAsset = ["kode_aset", "nama_aset", "jumlah", "harga", "tanggal_perolehan", "penyusutan"];
  
  const filteredInitialLeftData = useMemo(() => {
      if (!searchTerm) return dataAset;
      const lowerSearch = searchTerm.toLowerCase();
      return dataAset.filter(item => 
          (item.code || '').toLowerCase().includes(lowerSearch) ||
          (item.name || '').toLowerCase().includes(lowerSearch)
      );
  }, [dataAset, searchTerm]);

  const filteredInitialRightData = useMemo(() => {
      if (!searchTerm) return dataFixAsset;
      const lowerSearch = searchTerm.toLowerCase();
      return dataFixAsset.filter(item => 
          (item.kode_aset || '').toString().toLowerCase().includes(lowerSearch) ||
          (item.nama_aset || '').toLowerCase().includes(lowerSearch)
      );
  }, [dataFixAsset, searchTerm]);

  const initialLeftData = filteredInitialLeftData.map(item => ({
    id: item.id,
    kode_aset: item.code,
    nama_aset: item.name,
    jumlah: item.qty,
    costCenter: item.costCenter,
    lokasi: item.location,
    highlight: '', 
    key: item.id
  }));
  
  const initialRightData = filteredInitialRightData.map(item => ({...item, highlight: '', key: item.id}));

  if (authLoading || loading) {
    return (
      <Card className="h-full flex flex-col">
        <CardHeader>
          <Skeleton className="h-8 w-1/2" />
          <Skeleton className="h-4 w-3/4" />
        </CardHeader>
        <CardContent className="flex-grow">
          <Skeleton className="h-full w-full" />
        </CardContent>
      </Card>
    );
  }
  
  if (user?.role !== 'Admin') {
    return null; // Render nothing if not an admin, useEffect will handle redirect
  }

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Bandingkan Data Aset</CardTitle>
        <CardDescription>Bandingkan data aset dari sistem internal dengan data dari departemen akuntansi. Klik pada kode atau nama aset untuk mengeditnya.</CardDescription>
        <div className="flex flex-wrap items-center gap-4 pt-4">
            <div className="relative flex-grow sm:flex-grow-0">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari kode atau nama aset..."
                    className="pl-8 w-full sm:w-80"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <Button onClick={handleCompare} disabled={isComparing}>
                {isComparing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Bandingkan Data
            </Button>
            <Button 
                onClick={handleSyncAll} 
                disabled={isSyncingAll || compareResult.filter(res => res.isDifferent).length === 0}
                variant="destructive"
            >
                {isSyncingAll ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />}
                Sinkronkan Semua
            </Button>
            <Button onClick={handleExport} variant="outline" disabled={compareResult.length === 0}>
                <FileDown className="mr-2 h-4 w-4" />
                Export Hasil
            </Button>
             <div className="flex items-center space-x-2">
                <Switch id="show-different" checked={showOnlyDifferent} onCheckedChange={setShowOnlyDifferent} disabled={compareResult.length === 0}/>
                <Label htmlFor="show-different">Hanya Perbedaan</Label>
            </div>
            <ImportFixAssetDialog />
        </div>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col lg:flex-row gap-4 h-[calc(100vh-250px)]">
        <DataTable 
          title="Data Aset Internal (Sistem Utama)" 
          data={compareResult.length > 0 ? displayData.leftData : initialLeftData} 
          headers={headersAset}
          isEditable={true}
          editingCell={editingCell && editingCell.type === 'internal' ? editingCell : null}
          onCellClick={(id, field, value) => setEditingCell({ id, field, value, type: 'internal' })}
          onCellChange={(e) => editingCell && setEditingCell({ ...editingCell, value: e.target.value })}
          onCellBlur={handleCellBlur}
        />
        <DataTable 
          title="Data Aset Akuntansi (data_fix_asset_accounting)" 
          data={compareResult.length > 0 ? displayData.rightData : initialRightData} 
          headers={headersFixAsset}
          isEditable={true}
          editingCell={editingCell && editingCell.type === 'accounting' ? editingCell : null}
          onCellClick={(id, field, value) => (field === 'kode_aset' || field === 'nama_aset') && setEditingCell({ id, field, value, type: 'accounting' })}
          onCellChange={(e) => editingCell && setEditingCell({ ...editingCell, value: e.target.value })}
          onCellBlur={handleCellBlur}
          onSyncClick={handleSyncData}
          updatingSyncId={updatingSyncId}
          onDeleteClick={(id, code) => setDeletingInfo({ id, code })}
          deletingId={deletingInfo?.id}
        />
      </CardContent>
    </Card>
    <AlertDialog open={!!deletingInfo} onOpenChange={(open) => !open && setDeletingInfo(null)}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Penghapusan</AlertDialogTitle>
                <AlertDialogDescription>
                    Apakah Anda yakin ingin menghapus baris data akuntansi dengan kode aset <strong>{deletingInfo?.code}</strong> secara permanen? Tindakan ini tidak dapat dibatalkan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => setDeletingInfo(null)}>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmDelete} className="bg-destructive hover:bg-destructive/90">Hapus</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
