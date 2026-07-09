
'use client';

import { useState, useMemo, useEffect } from 'react';
import { useFormStatus } from 'react-dom';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
    DropdownMenu,
    DropdownMenuCheckboxItem,
    DropdownMenuContent,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
  } from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { type Asset, type AssetCondition } from '@/lib/types';
import { PlusCircle, Search, Lightbulb, Loader2, Trash2, QrCode, X, ChevronDown, CalendarCheck, ArrowUp, ArrowDown, Clock, Zap, Eraser, Printer as PrinterIcon, Sigma } from 'lucide-react';
import { Skeleton } from '../ui/skeleton';
import { AssetActions } from './asset-actions';
import Image from 'next/image';
import AssetForm from './asset-form';
import ImportAssetsDialog from './import-assets-dialog';
import ExportAssetsButton from './export-assets-button';
import { Checkbox } from '../ui/checkbox';
import DeleteMultipleAssetsDialog from './delete-multiple-assets-dialog';
import { format, formatDistance, differenceInDays, addYears, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import GenerateQrCodeDialog from './generate-qrcode-dialog';
import PrintAssetsButton from './print-assets-button';
import PrintAssetsButtonA from './print-assets-button-a';
import { collection, getDocs, writeBatch, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { Badge } from '../ui/badge';
import AutoUpdateLifetimeDialog from './auto-update-lifetime-dialog';
import AutoUpdateDateDialog from './auto-update-date-dialog';
import ClearFieldsDialog from './clear-fields-dialog';
import AutoUpdateDateDialogB from './auto-update-date-dialog-b';
import Link from 'next/link';
import ExportAssetsButtonA from './export-assets-button-a';
import { useAuth } from '@/hooks/use-auth';
import PrintBarcodeDialog from './print-barcode-dialog';
import { cn } from '@/lib/utils';
import ExportAssetsButtonB9 from './export-assets-button-b9';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '../ui/carousel';

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: keyof Asset | 'purchaseDate' | 'price' | 'assetAge';
  direction: SortDirection;
}


const assetCategories = ['Aset Seri A', 'Aset Seri B'];
const assetStatuses = ['Aktif', 'Aktif_creation', 'Dipinjam', 'Perlu Perbaikan', 'Rusak', 'Dihapus', 'Dipindah-Aktif', 'waiting_mutasi', 'waiting_disposal', 'approved_mutasi', 'approved_disposal', 'approved_edit'];
const assetConditions: AssetCondition[] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

interface AssetTableProps {
  assets: Asset[];
  loading: boolean;
  onRowClick: (assetId: string) => void;
  selectedAssetId: string | null;
  onDisplayedAssetsChange: (assets: Asset[]) => void;
}

export default function AssetTable({ 
    assets, 
    loading, 
    onRowClick,
    selectedAssetId,
    onDisplayedAssetsChange
}: AssetTableProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [searchTerm, setSearchTerm] = useState(searchParams.get('search') || '');
  const [categoryFilters, setCategoryFilters] = useState<string[]>(searchParams.get('category')?.split(',') || []);
  const [statusFilters, setStatusFilters] = useState<string[]>(searchParams.get('status')?.split(',') || []);
  const [conditionFilters, setConditionFilters] = useState<string[]>(searchParams.get('condition')?.split(',') || []);
  const [locationFilters, setLocationFilters] = useState<string[]>(searchParams.get('location')?.split(',') || []);
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'code', direction: 'ascending' });
  const { user } = useAuth();
  
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  
  useEffect(() => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (searchTerm) params.set('search', searchTerm); else params.delete('search');
    if (categoryFilters.length > 0) params.set('category', categoryFilters.join(',')); else params.delete('category');
    if (statusFilters.length > 0) params.set('status', statusFilters.join(',')); else params.delete('status');
    if (conditionFilters.length > 0) params.set('condition', conditionFilters.join(',')); else params.delete('condition');
    if (locationFilters.length > 0) params.set('location', locationFilters.join(',')); else params.delete('location');

    // use router.replace to update URL without adding to history
    router.replace(`/assets?${params.toString()}`);
  }, [searchTerm, categoryFilters, statusFilters, conditionFilters, locationFilters, router, searchParams]);


  const dynamicLocations = useMemo(() => {
    const locations = new Set(assets.map(asset => asset.location));
    return Array.from(locations).sort();
  }, [assets]);

  const requestSort = (key: SortConfig['key']) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const sortedAndFilteredAssets = useMemo(() => {
    let sortableAssets = [...assets];
    
    // Filtering logic
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (searchTerm) {
      sortableAssets = sortableAssets.filter(asset => 
        (asset.name?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
        (asset.code?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
        (asset.prNumber?.toLowerCase() || '').includes(lowerCaseSearchTerm)
      );
    }
    
    const filterByAseries = categoryFilters.includes('Aset Seri A');
    const filterByBseries = categoryFilters.includes('Aset Seri B');

    if (categoryFilters.length > 0) {
        sortableAssets = sortableAssets.filter(asset => {
            if (filterByAseries && filterByBseries) {
                 return asset.code.toUpperCase().startsWith('A') || asset.code.toUpperCase().startsWith('B');
            }
            if (filterByAseries) {
                return asset.code.toUpperCase().startsWith('A');
            }
            if (filterByBseries) {
                return asset.code.toUpperCase().startsWith('B');
            }
            return categoryFilters.includes(asset.category)
        });
    }

    sortableAssets = sortableAssets.filter(asset => {
        const statusMatch = () => {
            if (statusFilters.length === 0 || statusFilters[0] === '') return true;
            
            const activeLikeStatuses = ['Aktif', 'waiting_mutasi', 'approved_mutasi', 'waiting_edit', 'approved_edit', 'Aktif_creation'];
            
            if (statusFilters.includes('Aktif')) {
                const combinedFilters = new Set([...statusFilters, ...activeLikeStatuses]);
                return combinedFilters.has(asset.status);
            }
            
            return statusFilters.includes(asset.status);
        };

        const conditionMatch = conditionFilters.length === 0 || conditionFilters[0] === '' || conditionFilters.includes(asset.condition);
        const locationMatch = locationFilters.length === 0 || locationFilters[0] === '' || locationFilters.includes(asset.location);
        
        return statusMatch() && conditionMatch && locationMatch;
    });

    // Sorting logic
    if (sortConfig !== null) {
      sortableAssets.sort((a, b) => {
        if (sortConfig.key === 'assetAge') {
            const aAge = a.purchaseDate ? a.purchaseDate.toMillis() : 0;
            const bAge = b.purchaseDate ? b.purchaseDate.toMillis() : 0;
            if (aAge < bAge) return sortConfig.direction === 'ascending' ? -1 : 1;
            if (aAge > bAge) return sortConfig.direction === 'ascending' ? 1 : -1;
            return 0;
        }

        const aValue = a[sortConfig.key as keyof Asset];
        const bValue = b[sortConfig.key as keyof Asset];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;

        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            if (aValue.toMillis() < bValue.toMillis()) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue.toMillis() > bValue.toMillis()) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        }

        if (typeof aValue === 'number' && typeof bValue === 'number') {
            if (aValue < bValue) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue > bValue) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
            if (aValue.toLowerCase() < bValue.toLowerCase()) {
                return sortConfig.direction === 'ascending' ? -1 : 1;
            }
            if (aValue.toLowerCase() > bValue.toLowerCase()) {
                return sortConfig.direction === 'ascending' ? 1 : -1;
            }
            return 0;
        }
        
        return 0;
      });
    }

    return sortableAssets;
  }, [assets, searchTerm, categoryFilters, statusFilters, conditionFilters, locationFilters, sortConfig]);
  
  useEffect(() => {
    onDisplayedAssetsChange(sortedAndFilteredAssets);
  }, [sortedAndFilteredAssets, onDisplayedAssetsChange]);

  const summary = useMemo(() => {
    return sortedAndFilteredAssets.reduce((acc, asset) => {
      acc.count += 1;
      acc.totalQty += asset.qty || 0;
      acc.totalPriceIDR += asset.price || 0;
      acc.totalPriceUSD += asset.priceUSD || 0;
      return acc;
    }, {
      count: 0,
      totalQty: 0,
      totalPriceIDR: 0,
      totalPriceUSD: 0,
    });
  }, [sortedAndFilteredAssets]);

  const handleFilterChange = (setter: React.Dispatch<React.SetStateAction<string[]>>) => (item: string) => {
    setter(prev => 
        prev.includes(item) 
            ? prev.filter(i => i !== item) 
            : [...prev, item]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setCategoryFilters([]);
    setStatusFilters([]);
    setConditionFilters([]);
    setLocationFilters([]);
    setSortConfig(null);
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedAssetIds(sortedAndFilteredAssets.map((asset) => asset.id));
    } else {
        setSelectedAssetIds([]);
    }
  };

  const handleSelectOne = (assetId: string, checked: boolean) => {
    if (checked) {
        setSelectedAssetIds((prev) => [...prev, assetId]);
    } else {
        setSelectedAssetIds((prev) => prev.filter((id) => id !== assetId));
    }
  };

  const isAllSelected = sortedAndFilteredAssets.length > 0 && selectedAssetIds.length === sortedAndFilteredAssets.length;
  const isIndeterminate = selectedAssetIds.length > 0 && selectedAssetIds.length < sortedAndFilteredAssets.length;

  const formatDate = (timestamp: any) => {
    if (!timestamp) return '-';
    try {
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return format(date, "d MMM yyyy", { locale: id });
    } catch (error) {
        return '-'
    }
  }

  const formatCurrency = (value: number | undefined, currency: 'IDR' | 'USD' = 'IDR') => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat(currency === 'IDR' ? 'id-ID' : 'en-US', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: currency === 'USD' ? 2 : 0,
    }).format(value);
  }

  const selectedAssets = useMemo(() => {
    const selectedSet = new Set(selectedAssetIds);
    return sortedAndFilteredAssets.filter(asset => selectedSet.has(asset.id));
  }, [sortedAndFilteredAssets, selectedAssetIds]);
  
  const selectedAssetsSummary = useMemo(() => {
    if (selectedAssets.length === 0) {
      return null;
    }
    return selectedAssets.reduce((acc, asset) => {
      acc.totalQty += asset.qty || 0;
      acc.totalPriceIDR += (asset.price || 0);
      acc.totalPriceUSD += (asset.priceUSD || 0);
      return acc;
    }, {
      totalQty: 0,
      totalPriceIDR: 0,
      totalPriceUSD: 0,
    });
  }, [selectedAssets]);

  const handleUpdateAllMidSemester = async () => {
    setIsUpdating(true);
    try {
      const assetsCollection = collection(db, 'assets');
      const assetSnapshot = await getDocs(assetsCollection);
      const batch = writeBatch(db);
      const newDate = Timestamp.fromDate(new Date('2025-06-30'));
      
      assetSnapshot.docs.forEach((doc) => {
        batch.update(doc.ref, { midSemesterCheckDate: newDate });
      });

      await batch.commit();

      toast({
        title: 'Berhasil',
        description: 'Semua "Tgl Cek Mid Semester" aset telah diperbarui.',
      });
    } catch (error) {
      console.error('Error updating all assets:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui',
        description: 'Terjadi kesalahan saat memperbarui data aset.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) {
        return null;
    }
    if (sortConfig.direction === 'ascending') {
        return <ArrowUp className="ml-2 h-3 w-3" />;
    }
    return <ArrowDown className="ml-2 h-3 w-3" />;
  };
  
  const getStatusClass = (status: Asset['status']) => {
    switch (status) {
        case 'Aktif': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'Dipinjam': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'Rusak':
        case 'waiting_disposal':
             return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'Perlu Perbaiki': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        case 'Dipindah-Aktif': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'waiting_mutasi':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'approved_mutasi':
        case 'approved_disposal':
        case 'approved_edit':
        case 'Aktif_creation':
            return 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200';
        case 'Dihapus':
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  const getConditionClass = (condition?: AssetCondition) => {
    if (!condition) return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    switch (condition) {
        case 'Baru': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'Baik': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'Perlu Perbaikan': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'Sedang Dalam Perbaikan': return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        case 'Rusak': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'Tidak Terpakai': return 'bg-gray-400 text-white dark:bg-gray-600';
        case 'Upgrade': return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'Sold': return 'bg-gray-500 text-white dark:bg-gray-700';
        default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  const canAddAsset = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Section Head';
  const isAdmin = user?.role === 'Admin';
  
  const showCetakA = categoryFilters.length === 1 && categoryFilters.includes('Aset Seri A');
  const showCetakB9 = categoryFilters.length === 1 && categoryFilters.includes('Aset Seri B');
  const assetsForSpecialtyPrint = selectedAssetIds.length > 0 ? selectedAssets : sortedAndFilteredAssets;


  return (
    <>
    <Card className="shadow-sm h-full flex flex-col">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
                <CardTitle>Daftar Aset</CardTitle>
                <CardDescription>Lihat, cari, dan kelola semua aset perusahaan.</CardDescription>
            </div>
            <div className="flex flex-wrap items-center gap-2">
                <ImportAssetsDialog />
                <Button asChild variant="outline">
                  <Link href="/scan">
                    <QrCode className="mr-2 h-4 w-4" />
                    Scan QR
                  </Link>
                </Button>
                {canAddAsset && (
                  <AssetForm>
                      <Button>
                          <PlusCircle className="mr-2 h-4 w-4" />
                          Tambah Aset
                      </Button>
                  </AssetForm>
                )}
            </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow-0 sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari nama, kode, atau No. PR..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            <div className="flex gap-2 flex-wrap sm:flex-grow">
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <span className="flex-1">Kategori ({categoryFilters.length > 0 ? categoryFilters.length : 'Semua'})</span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Pilih Kategori</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {assetCategories.map((category) => (
                            <DropdownMenuCheckboxItem
                                key={category}
                                checked={categoryFilters.includes(category)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => handleFilterChange(setCategoryFilters)(category)}
                            >
                                {category}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <span className="flex-1">Status ({statusFilters.length > 0 ? statusFilters.length : 'Semua'})</span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Pilih Status</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {assetStatuses.map((status) => (
                            <DropdownMenuCheckboxItem
                                key={status}
                                checked={statusFilters.includes(status)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => handleFilterChange(setStatusFilters)(status)}
                            >
                                {status.replace('_', ' ')}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <span className="flex-1">Kondisi ({conditionFilters.length > 0 ? conditionFilters.length : 'Semua'})</span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56">
                        <DropdownMenuLabel>Pilih Kondisi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {assetConditions.map((condition) => (
                            <DropdownMenuCheckboxItem
                                key={condition}
                                checked={conditionFilters.includes(condition)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => handleFilterChange(setConditionFilters)(condition)}
                            >
                                {condition}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="outline" className="w-full sm:w-auto justify-start text-left font-normal">
                            <span className="flex-1">Lokasi ({locationFilters.length > 0 ? locationFilters.length : 'Semua'})</span>
                            <ChevronDown className="ml-2 h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent className="w-56 max-h-60 overflow-y-auto">
                        <DropdownMenuLabel>Pilih Lokasi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        {dynamicLocations.map((location) => (
                            <DropdownMenuCheckboxItem
                                key={location}
                                checked={locationFilters.includes(location)}
                                onSelect={(e) => e.preventDefault()}
                                onCheckedChange={() => handleFilterChange(setLocationFilters)(location)}
                            >
                                {location}
                            </DropdownMenuCheckboxItem>
                        ))}
                    </DropdownMenuContent>
                </DropdownMenu>

                <Button variant="ghost" onClick={resetFilters}>
                    <X className="mr-2 h-4 w-4" /> Reset
                </Button>
            </div>
        </div>
         {selectedAssetIds.length > 0 && (
            <Card className="mt-4 p-4 bg-muted/50">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h4 className="font-semibold flex items-center gap-2">
                    <Sigma className="h-5 w-5 text-primary"/>
                    Ringkasan Aset Terpilih
                  </h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAssetIds.length} dari {sortedAndFilteredAssets.length} aset terpilih.
                  </p>
                </div>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm">
                    <div>
                        <span className="text-muted-foreground">Total Qty: </span>
                        <span className="font-bold">{selectedAssetsSummary?.totalQty}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Total IDR: </span>
                        <span className="font-bold">{formatCurrency(selectedAssetsSummary?.totalPriceIDR, 'IDR')}</span>
                    </div>
                    <div>
                        <span className="text-muted-foreground">Total USD: </span>
                        <span className="font-bold">{formatCurrency(selectedAssetsSummary?.totalPriceUSD, 'USD')}</span>
                    </div>
                </div>
              </div>
              <div className="mt-4 flex items-center gap-2 flex-wrap border-t pt-4">
                  {isAdmin && (
                    <>
                      <AutoUpdateDateDialog
                        selectedAssets={selectedAssets}
                        onSuccess={() => setSelectedAssetIds([])}
                      >
                        <Button variant="outline" size="sm">
                          upTgl1 ({selectedAssetIds.length})
                        </Button>
                      </AutoUpdateDateDialog>
                      <AutoUpdateDateDialogB
                        selectedAssets={selectedAssets}
                        onSuccess={() => setSelectedAssetIds([])}
                      >
                        <Button variant="outline" size="sm">
                          upTgl2 ({selectedAssetIds.length})
                        </Button>
                      </AutoUpdateDateDialogB>
                      <Button onClick={handleUpdateAllMidSemester} disabled={isUpdating} variant="outline" size="sm">
                        {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CalendarCheck className="mr-2 h-4 w-4" />}
                        Update Tgl Mid Semester (Global)
                      </Button>
                      <AutoUpdateLifetimeDialog
                        selectedAssets={selectedAssets}
                        onSuccess={() => setSelectedAssetIds([])}
                      >
                          <Button variant="outline" size="sm">
                              <Zap className="mr-2 h-4 w-4" />
                              Update Masa ({selectedAssetIds.length})
                          </Button>
                      </AutoUpdateLifetimeDialog>
                      <ClearFieldsDialog
                          selectedAssets={selectedAssets}
                          onSuccess={() => setSelectedAssetIds([])}
                      >
                          <Button variant="outline" size="sm">
                              <Eraser className="mr-2 h-4 w-4" />
                              Kosongkan ({selectedAssetIds.length})
                          </Button>
                      </ClearFieldsDialog>
                      <DeleteMultipleAssetsDialog
                          assetIds={selectedAssetIds}
                          onSuccess={() => setSelectedAssetIds([])}
                      >
                          <Button variant="destructive" size="sm">
                              <Trash2 className="mr-2 h-4 w-4" />
                              Hapus ({selectedAssetIds.length})
                          </Button>
                      </DeleteMultipleAssetsDialog>
                    </>
                  )}
                  <PrintBarcodeDialog selectedAssets={selectedAssets}>
                    <Button variant="outline" size="sm">
                      <QrCode className="mr-2 h-4 w-4" />
                      Cetak Barcode ({selectedAssetIds.length})
                    </Button>
                  </PrintBarcodeDialog>
                  {showCetakA && <PrintAssetsButtonA selectedAssets={assetsForSpecialtyPrint} />}
                  {showCetakB9 && <PrintAssetsButton selectedAssets={assetsForSpecialtyPrint} />}
                  {showCetakB9 && <ExportAssetsButtonB9 assetsToExport={assetsForSpecialtyPrint} />}
                  {showCetakA && <ExportAssetsButtonA assetsToExport={assetsForSpecialtyPrint} />}
                  <GenerateQrCodeDialog selectedAssets={selectedAssets}>
                      <Button variant="outline" size="sm">
                          <QrCode className="mr-2 h-4 w-4" />
                          Generate QR Code ({selectedAssetIds.length})
                      </Button>
                  </GenerateQrCodeDialog>
                  <ExportAssetsButton 
                      assetsToExport={selectedAssets}
                  />
              </div>
            </Card>
        )}
      </CardHeader>
      <CardContent className="flex-grow flex flex-col h-0">
        <div className="relative w-full overflow-auto flex-grow">
          <table className="w-full text-xs">
            <TableHeader className="sticky top-0 z-10 bg-gray-300 dark:bg-gray-700 shadow-sm">
              <TableRow>
                <TableHead className="w-auto sticky left-0 z-20 bg-card border p-1 border-gray-300 dark:border-gray-600">
                  <Checkbox
                    checked={isAllSelected || isIndeterminate}
                    onCheckedChange={handleSelectAll}
                    aria-label="Select all"
                  />
                </TableHead>
                <TableHead className="border p-1 border-gray-300 dark:border-gray-600 w-auto">Foto</TableHead>
                <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Nama Aset {getSortIcon('name')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('code')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Kode Aset {getSortIcon('code')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('prNumber')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Nomor PR {getSortIcon('prNumber')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('location')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Lokasi {getSortIcon('location')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('qty')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center justify-center">Qty {getSortIcon('qty')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('condition')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Kondisi {getSortIcon('condition')}</div>
                </TableHead>
                <TableHead className="border p-1 border-gray-300 dark:border-gray-600 max-w-[200px]">Catatan</TableHead>
                <TableHead onClick={() => requestSort('user')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600">
                  <div className="flex items-center">User {getSortIcon('user')}</div>
                </TableHead>
                <TableHead onClick={() => requestSort('status')} className="cursor-pointer hover:bg-muted/80 border p-1 border-gray-300 dark:border-gray-600 w-auto">
                  <div className="flex items-center">Status {getSortIcon('status')}</div>
                </TableHead>
                <TableHead className="sticky top-0 right-0 z-20 bg-card border p-1 border-gray-300 dark:border-gray-600 w-auto">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody className="table-row-hover">
              {loading ? (
                Array.from({ length: 10 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={13}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : sortedAndFilteredAssets.length > 0 ? (
                sortedAndFilteredAssets.map((asset) => {
                  const allImages = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter(Boolean);
                  return (
                  <TableRow 
                    id={`asset-row-${asset.id}`}
                    key={asset.id} 
                    data-state={selectedAssetId === asset.id ? "selected" : (selectedAssetIds.includes(asset.id) ? "selected" : "unselected")}
                    className="cursor-pointer"
                    onClick={() => onRowClick(asset.id)}
                  >
                    <TableCell className="sticky left-0 z-10 bg-card border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 whitespace-nowrap">
                      <Checkbox
                        checked={selectedAssetIds.includes(asset.id)}
                        onCheckedChange={(checked) => handleSelectOne(asset.id, !!checked)}
                        onClick={(e) => e.stopPropagation()}
                        aria-label={`Select asset ${asset.name}`}
                      />
                    </TableCell>
                    <TableCell className="border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 whitespace-nowrap">
                        <Dialog>
                            <DialogTrigger asChild onClick={(e) => e.stopPropagation()}>
                                <Image
                                    alt={asset.name}
                                    className="aspect-square rounded-md object-cover cursor-pointer"
                                    height="48"
                                    src={asset.photoURL || "https://picsum.photos/id/20/64/64"}
                                    width="48"
                                    data-ai-hint="asset image"
                                />
                            </DialogTrigger>
                             <DialogContent className="max-w-md sm:max-w-lg p-0 bg-transparent border-none overflow-hidden flex flex-col items-center justify-center">
                                 <DialogTitle className="sr-only">Pratinjau Foto {asset.name}</DialogTitle>
                                 <Carousel className="w-full">
                                   <CarouselContent>
                                     {allImages.length > 0 ? allImages.map((imgUrl, index) => (
                                       <CarouselItem key={index}>
                                         <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                           <Image
                                               alt={`${asset.name} - Foto ${index + 1}`}
                                               className="object-cover"
                                               fill
                                               src={imgUrl!}
                                           />
                                         </div>
                                       </CarouselItem>
                                     )) : (
                                        <CarouselItem>
                                         <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                                           <Image
                                               alt={asset.name}
                                               className="object-cover"
                                               fill
                                               src="https://picsum.photos/id/20/500/500"
                                           />
                                         </div>
                                       </CarouselItem>
                                     )}
                                   </CarouselContent>
                                   {allImages.length > 1 && (
                                     <>
                                       <CarouselPrevious className="left-4 bg-slate-900/60 hover:bg-slate-900/80 border-none text-white h-10 w-10 rounded-full" />
                                       <CarouselNext className="right-4 bg-slate-900/60 hover:bg-slate-900/80 border-none text-white h-10 w-10 rounded-full" />
                                     </>
                                   )}
                                 </Carousel>
                                 <div className="mt-4 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest text-center shadow-lg border border-white/10 max-w-[90%] truncate">
                                     {asset.name}
                                 </div>
                             </DialogContent>
                        </Dialog>
                    </TableCell>
                    <TableCell className="font-medium text-left hover:underline border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 max-w-[150px] truncate hover:whitespace-normal hover:max-w-none hover:z-20">
                          {asset.name}
                    </TableCell>
                    <TableCell className="border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800">{asset.code}</TableCell>
                    <TableCell className="max-w-[150px] truncate hover:whitespace-normal hover:max-w-none hover:z-20 border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800">{asset.prNumber || '-'}</TableCell>
                    <TableCell className="border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 whitespace-nowrap">{asset.location}</TableCell>
                    <TableCell className="border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 whitespace-nowrap">{asset.qty}</TableCell>
                    <TableCell className="whitespace-nowrap border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800">
                      <div className={cn('text-xs font-semibold py-1 px-2 rounded-full text-center inline-block whitespace-nowrap', getConditionClass(asset.condition))}>
                          {asset.condition}
                      </div>
                    </TableCell>
                    <TableCell className="max-w-[200px] truncate border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 hover:whitespace-normal hover:max-w-none hover:z-20">{asset.notes}</TableCell>
                    <TableCell className="whitespace-nowrap border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800">{asset.user || '-'}</TableCell>
                    <TableCell className="whitespace-nowrap border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800">
                       <div className={cn('text-xs font-semibold py-1 px-2 rounded-full text-center inline-block capitalize', getStatusClass(asset.status))}>
                          {asset.status.replace(/_/g, ' ')}
                      </div>
                    </TableCell>
                    <TableCell className="sticky right-0 z-10 bg-card border p-1 border-gray-300 dark:border-gray-600 hover:bg-yellow-200 dark:hover:bg-yellow-800 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                      <AssetActions asset={asset} />
                    </TableCell>
                  </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={13} className="h-24 text-center text-base border">
                    Tidak ada hasil.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </table>
        </div>
      </CardContent>
    </Card>
    </>
  );
}
