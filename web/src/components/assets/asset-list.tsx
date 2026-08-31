'use client';

import { useState, useMemo, useEffect } from 'react';
import { type Asset, type AssetStatus, type AssetCondition } from '@/lib/types';
import AssetDetailCard from './asset-detail-card';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { 
  Search, 
  X, 
  ChevronDown, 
  PlusCircle, 
  ArrowUp, 
  ArrowDown, 
  CheckSquare, 
  MoreVertical, 
  FileText, 
  Printer as PrinterIcon, 
  QrCode, 
  SmartphoneNfc, 
  Eraser, 
  Zap, 
  CalendarCheck2, 
  FileSymlink, 
  Recycle, 
  ArrowRightLeft, 
  ClipboardEdit, 
  Package, 
  Trash2, 
  Filter, 
  ChevronUp, 
  Tag, 
  ShieldCheck, 
  User as UserIcon, 
  Crown, 
  MapPin, 
  Share2, 
  Loader2, 
  ChevronRight, 
  Layers,
  Activity as ActivityIcon,
  ClipboardCheck,
  Check,
  LayoutGrid,
  List
} from 'lucide-react';
import { Button } from '../ui/button';
import { Checkbox } from '../ui/checkbox';
import { Badge } from '@/components/ui/badge';
import PrintBarcodeDialog from './print-barcode-dialog';
import GenerateQrCodeDialog from './generate-qrcode-dialog';
import ExportAssetsButton from './export-assets-button';
import DeleteMultipleAssetsDialog from './delete-multiple-assets-dialog';
import AutoUpdateLifetimeDialog from './auto-update-lifetime-dialog';
import AutoUpdateDateDialog from './auto-update-date-dialog';
import PrintAssetsButton from './print-assets-button';
import ClearFieldsDialog from './clear-fields-dialog';
import AutoUpdateDateDialogB from './auto-update-date-dialog-b';
import PrintAssetsButtonA from './print-assets-button-a';
import ExportAssetsButtonA from './export-assets-button-a';
import ExportAssetsButtonB9 from './export-assets-button-b9';
import BulkUpdateLocationPanel from './bulk-update-location-dialog';
import BulkUpdateStatusPanel from './bulk-update-status-dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuLabel, DropdownMenuSeparator } from '../ui/dropdown-menu';
import AssetItem, { getAlertStyles } from './asset-item';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from '@/components/ui/carousel';
import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import AssetForm from './asset-form';
import { Timestamp, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { ScrollArea } from '../ui/scroll-area';
import { Label } from '../ui/label';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import ImportAssetsDialog from './import-assets-dialog';
import SummaryCards from '@/components/dashboard/summary-cards';
import { useAuth } from '@/hooks/use-auth';

interface AssetListProps {
  assets: Asset[];
  initialSearchTerm?: string;
  initialCategoryFilter?: string;
  initialConditionFilter?: string;
}

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: keyof Asset;
  direction: SortDirection;
}

const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

const RadioFilterGroup = ({
    label,
    options,
    selectedValue,
    onChange,
    namePrefix,
    icon: Icon
}: {
    label: string;
    options: { label: string, value: string }[];
    selectedValue: string;
    onChange: (value: string) => void;
    namePrefix: string;
    icon?: React.ElementType;
}) => {
    return (
        <div className="space-y-2 flex flex-col text-left">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1 flex items-center gap-2 text-left">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </Label>
            <div className="flex flex-row flex-wrap gap-2.5 text-left">
                <div className="relative">
                    <input 
                        type="radio" 
                        id={`${namePrefix}-all`} 
                        name={namePrefix} 
                        className="radio-input peer"
                        checked={selectedValue === 'ALL'}
                        onChange={() => onChange('ALL')}
                        style={{ position: 'absolute', opacity: 0 }}
                    />
                    <label 
                        htmlFor={`${namePrefix}-all`}
                        className="radio-label flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:shadow-sm"
                    >
                        <span className="radio-inner-circle inline-block w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-full mr-2 relative transition-all peer-checked:border-primary">
                             {selectedValue === 'ALL' && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />}
                        </span>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Semua</span>
                    </label>
                </div>

                {options.map((option) => (
                    <div key={option.value} className="relative">
                        <input 
                            type="radio" 
                            id={`${namePrefix}-${option.value}`} 
                            name={namePrefix} 
                            className="radio-input peer"
                            checked={selectedValue === option.value}
                            onChange={() => onChange(option.value)}
                            style={{ position: 'absolute', opacity: 0 }}
                        />
                        <label 
                            htmlFor={`${namePrefix}-${option.value}`}
                            className="radio-label flex items-center px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:shadow-sm"
                        >
                            <span className="radio-inner-circle inline-block w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-full mr-2 relative transition-all peer-checked:border-primary">
                                 {selectedValue === option.value && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-full" />}
                            </span>
                            <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100 truncate max-w-[180px]">{option.label}</span>
                        </label>
                    </div>
                ))}
            </div>
        </div>
    );
};

const AssetGridCard = ({ asset, isSelected, onSelect, isSelectionMode }: {
  asset: Asset;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  isSelectionMode: boolean;
}) => {
  const galleryImages = [
    asset.photoURL,
    asset.photoURL2,
    asset.photoURL3,
    asset.photoURL4,
  ].filter((url): url is string => !!url && url.length > 0);

  if (galleryImages.length === 0) {
    galleryImages.push('https://placehold.co/200x200/F1F5F9/64748B?text=No+Photo');
  }

  const styles = getAlertStyles(asset.status, asset.condition);

  return (
    <Dialog>
      <div 
        className={cn(
          "bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] overflow-hidden flex flex-col hover:-translate-y-1.5 hover:shadow-xl transition-all duration-300 relative group cursor-pointer border-t-4",
          styles.container.includes("border-l-rose-500") ? "border-t-rose-500" :
          styles.container.includes("border-l-amber-500") ? "border-t-amber-500" :
          styles.container.includes("border-l-sky-500") ? "border-t-sky-500" : "border-t-emerald-500"
        )}
      >
        {/* Top Image Preview (Nested Dialog for Lightbox) */}
        <Dialog>
          <DialogTrigger asChild>
            <div className="h-40 w-full relative bg-slate-50 dark:bg-slate-950 overflow-hidden cursor-zoom-in">
              <Image 
                src={galleryImages[0]} 
                alt={asset.name}
                fill
                sizes="(max-w-768px) 100vw, 300px"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-60" />
              
              {/* Top Left: Checkbox */}
              {isSelectionMode && (
                <div className="absolute top-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                  <Checkbox 
                    checked={isSelected}
                    onCheckedChange={(checked) => onSelect(!!checked)}
                    className="h-5 w-5 rounded-lg border-white/60 bg-white/10 backdrop-blur-md"
                  />
                </div>
              )}
    
              {/* Top Right: Status Badge */}
              <div className="absolute top-3 right-3 z-10" onClick={(e) => e.stopPropagation()}>
                <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border-none", styles.badgeClass)}>
                  {asset.status.replace(/_/g, ' ')}
                </Badge>
              </div>
    
              {/* Bottom Left: Code */}
              <div className="absolute bottom-3 left-3 z-10" onClick={(e) => e.stopPropagation()}>
                <span className="font-mono text-[9px] font-bold text-white bg-slate-900/60 backdrop-blur-md px-2 py-0.5 rounded border border-white/10 uppercase tracking-widest">
                  {asset.code}
                </span>
              </div>
            </div>
          </DialogTrigger>
          <DialogContent className="max-w-md sm:max-w-lg p-0 bg-transparent border-none overflow-hidden flex flex-col items-center justify-center">
              <DialogTitle className="sr-only">Pratinjau Foto {asset.name}</DialogTitle>
              <Carousel className="w-full">
                <CarouselContent>
                  {galleryImages.map((url, index) => (
                    <CarouselItem key={index}>
                      <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                        <Image
                            src={url}
                            alt={`${asset.name} - Foto ${index + 1}`}
                            fill
                            className="object-cover"
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                {galleryImages.length > 1 && (
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
  
        {/* Card Body (Triggers Asset Details Dialog) */}
        <DialogTrigger asChild>
          <div className="p-4 flex-grow flex flex-col justify-between text-left">
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-800 dark:text-slate-100 uppercase tracking-tight line-clamp-2 leading-tight group-hover:text-primary transition-colors">
                {asset.name}
              </h3>
            </div>
  
            <div className="mt-4 pt-3 border-t border-slate-50 dark:border-slate-850 space-y-1">
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <MapPin className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{asset.location}</span>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                <UserIcon className="h-3.5 w-3.5 text-slate-400" />
                <span className="truncate">{asset.user || '-'}</span>
              </div>
            </div>
          </div>
        </DialogTrigger>
      </div>

      <DialogContent className="max-w-4xl max-h-[85vh] overflow-y-auto bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-3xl p-6 shadow-2xl">
        <DialogHeader className="border-b border-slate-100 pb-4 mb-4">
          <DialogTitle className="text-xl font-black uppercase text-slate-900 dark:text-white flex items-center gap-3">
            <Package className="h-6 w-6 text-primary" /> {asset.name}
          </DialogTitle>
          <DialogDescription className="text-xs font-mono uppercase tracking-widest text-slate-400">
            {asset.code} • {asset.location}
          </DialogDescription>
        </DialogHeader>
        <AssetDetailCard asset={asset} />
      </DialogContent>
    </Dialog>
  );
};

export default function AssetList({ assets, initialSearchTerm = '', initialCategoryFilter = 'ALL', initialConditionFilter = 'ALL' }: AssetListProps) {
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState(initialSearchTerm);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [showFilters, setShowFilters] = useState(initialCategoryFilter !== 'ALL' || initialConditionFilter !== 'ALL');
  const [isSharing, setIsSharing] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const [activeBulkAction, setActiveBulkAction] = useState<'status' | 'location' | null>(null);
  
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>(initialConditionFilter);
  const [categoryFilter, setCategoryFilter] = useState<string>(initialCategoryFilter);
  const [ownershipFilter, setOwnershipFilter] = useState<string>('ALL');
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'code', direction: 'ascending' });

  useEffect(() => {
    setCategoryFilter(initialCategoryFilter);
    if (initialCategoryFilter !== 'ALL') setShowFilters(true);
  }, [initialCategoryFilter]);

  useEffect(() => {
    setConditionFilter(initialConditionFilter);
    if (initialConditionFilter !== 'ALL') setShowFilters(true);
  }, [initialConditionFilter]);

  useEffect(() => {
    setSearchTerm(initialSearchTerm);
  }, [initialSearchTerm]);

  const dynamicStatuses = useMemo(() => [...new Set(assets.map(a => a.status))].sort(), [assets]);
  const dynamicConditions = useMemo(() => [...new Set(assets.map(a => a.condition))].sort(), [assets]);
  const dynamicLocations = useMemo(() => [...new Set(assets.map(a => a.location))].sort(), [assets]);
  
  const filteredAssets = useMemo(() => {
    let sortableAssets = [...assets];
    
    if (sortConfig !== null) {
      sortableAssets.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return (aValue - bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            return (aValue.toMillis() - bValue.toMillis()) * (sortConfig.direction === 'ascending' ? 1 : -1);
         }
        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        return 0;
      });
    }

    return sortableAssets.filter(asset => {
      const searchMatch = searchTerm === '' ||
                          (asset.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
                          (asset.code?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const isUtility = utilityCategories.includes(asset.category);

      const categoryMatch = (() => {
        if (categoryFilter === 'ALL') return true;
        if (categoryFilter === 'A') return asset.category.startsWith('A') && !isUtility;
        if (categoryFilter === 'B') return !asset.category.startsWith('A') && !isUtility;
        if (categoryFilter === 'UTILITY') return isUtility;
        return asset.category === categoryFilter;
      })();
      const ownershipMatch = (() => {
        if (ownershipFilter === 'ALL') return true;
        if (ownershipFilter === 'COMPANY') return asset.status !== 'Bukan_Asset_Perusahaan';
        if (ownershipFilter === 'PERSONAL') return asset.status === 'Bukan_Asset_Perusahaan';
        return true;
      })();
      const conditionMatch = conditionFilter === 'ALL' || asset.condition === conditionFilter;
      const locationMatch = locationFilter === 'ALL' || asset.location === locationFilter;
      const statusMatch = statusFilter === 'ALL' || asset.status === statusFilter;
      return searchMatch && categoryMatch && statusMatch && conditionMatch && locationMatch && ownershipMatch;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter, conditionFilter, locationFilter, ownershipFilter, sortConfig]);
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (locationFilter !== 'ALL') count++;
    if (statusFilter !== 'ALL') count++;
    if (conditionFilter !== 'ALL') count++;
    if (categoryFilter !== 'ALL') count++;
    if (ownershipFilter !== 'ALL') count++;
    return count;
  }, [locationFilter, statusFilter, conditionFilter, categoryFilter, ownershipFilter]);

  const isAllSelected = filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length;
  const isIndeterminate = selectedAssetIds.length > 0 && selectedAssetIds.length < filteredAssets.length;

  const resetFilters = () => {
    setSearchTerm('');
    setLocationFilter('ALL');
    setStatusFilter('ALL');
    setConditionFilter('ALL');
    setCategoryFilter('ALL');
    setOwnershipFilter('ALL');
  }

  const handleToggle = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };

  const handleSelectOne = (assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => 
      checked ? [...prev, assetId] : prev.filter(id => id !== assetId)
    );
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAssetIds(filteredAssets.map(asset => asset.id));
    } else {
      setSelectedAssetIds([]);
    }
  };

  const selectedAssets = useMemo(() => assets.filter(asset => selectedAssetIds.includes(asset.id)), [assets, selectedAssetIds]);

  const summaryData = useMemo(() => {
    const totalAssets = filteredAssets.length;
    const totalQuantity = filteredAssets.reduce((sum, asset) => sum + (asset.qty || 0), 0);
    const totalValue = filteredAssets.reduce((sum, asset) => sum + (asset.price || 0) * (asset.qty || 1), 0);
    const totalValueUSD = filteredAssets.reduce((sum, asset) => sum + (asset.priceUSD || 0) * (asset.qty || 1), 0);
    const onLoan = filteredAssets.filter((asset) => asset.status === 'Dipinjam').length;
    const damaged = filteredAssets.filter((asset) => asset.condition === 'Rusak').length;
    const needsRepair = filteredAssets.filter((asset) => asset.condition === 'Perlu Perbaikan').length;
    return { totalAssets, totalQuantity, totalValue, totalValueUSD, onLoan, damaged, needsRepair };
  }, [filteredAssets]);

  const canAdd = user?.role === 'Admin' || user?.permissions?.canAddAsset;
  const isAdmin = user?.role === 'Admin';

  return (
    <div className="w-full space-y-8 animate-in fade-in duration-700 pb-20 text-black">
      <CardHeader className="bg-transparent px-0 space-y-8">
        {/* Modern Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-slate-900 text-white rounded-[2rem] p-8 md:p-10 shadow-xl border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-2 text-left">
                    <span className="text-[10px] font-black tracking-[0.25em] text-indigo-400 uppercase">Master Database</span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight uppercase flex items-center gap-3">
                        <Package className="h-9 w-9 text-indigo-400" /> Asset Inventory
                    </h1>
                    <p className="text-xs text-slate-300 font-medium tracking-wide">
                        Sistem Manajemen & Pelacakan Inventaris Aset PT. China Glaze Indonesia
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md self-start md:self-auto shadow-inner">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{summaryData.totalAssets} Total Unit Terdaftar</span>
                </div>
            </div>
        </div>

        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 px-1">
             <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                 <div className="uiverse-search-container !h-12 w-full md:w-80">
                     <div className="relative w-full px-2">
                         <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300" />
                         <input
                             placeholder="Cari nama atau kode aset..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="uiverse-search-input pl-12 h-10 font-black text-xs uppercase tracking-widest"
                         />
                     </div>
                 </div>

                 <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
                      <Button asChild variant="ghost" className="rounded-lg h-9 px-3 text-xs font-bold uppercase tracking-wider hover:bg-slate-50 transition-all text-black dark:text-white">
                        <Link href="/scan">
                          <span className="mr-1.5 text-sm select-none">📷</span>
                          Scan QR
                        </Link>
                      </Button>
                      {user?.role === 'Admin' && <ImportAssetsDialog />}
                  </div>

                  <Button 
                      variant="outline" 
                      onClick={() => setShowFilters(!showFilters)}
                      className={cn(
                          "h-10 px-4 rounded-xl border font-bold uppercase tracking-wider transition-all duration-300 text-xs shadow-sm hover:shadow-md hover:-translate-y-0.5",
                          showFilters 
                             ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-900 dark:text-white" 
                             : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50",
                          activeFiltersCount > 0 && "border-primary/50 bg-primary/5 text-primary hover:bg-primary/10 hover:text-primary"
                      )}
                  >
                      <Filter className={cn("mr-2 h-4 w-4 transition-transform", showFilters && "text-primary")} />
                      Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                  </Button>

                  {canAdd && (
                    <AssetForm>
                        <Button className="rounded-xl h-10 px-5 bg-primary hover:bg-primary/90 text-white font-black uppercase text-xs tracking-wider transition-all text-white">
                            <span className="mr-1.5 text-sm select-none">➕</span>
                            Tambah Aset
                        </Button>
                    </AssetForm>
                  )}
             </div>
        </div>

        <div className="grid gap-4 sm:gap-6 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 mt-2">
            <SummaryCards data={summaryData} />
        </div>

        <AnimatePresence>
            {showFilters && (
                <motion.div 
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                >
                     <div className="space-y-8 p-8 mt-2 border-2 border-dashed rounded-[3rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-primary/10 text-left">
                        <div className="flex flex-col gap-8">
                            <RadioFilterGroup 
                                label="Kepemilikan" 
                                icon={ShieldCheck}
                                options={[{ label: 'Perusahaan', value: 'COMPANY' }, { label: 'Personal', value: 'PERSONAL' }]} 
                                selectedValue={ownershipFilter} 
                                onChange={setOwnershipFilter} 
                                namePrefix="ownership" 
                            />
                            
                            <RadioFilterGroup 
                                label="Klasifikasi" 
                                icon={Layers}
                                options={[{ label: 'Seri A', value: 'A' }, { label: 'Seri B', value: 'B' }, { label: 'Utilitas', value: 'UTILITY' }]} 
                                selectedValue={categoryFilter} 
                                onChange={setCategoryFilter} 
                                namePrefix="series" 
                            />

                            <RadioFilterGroup 
                                label="Status Operasional" 
                                icon={ActivityIcon}
                                options={dynamicStatuses.map(s => ({ label: s.replace(/_/g, ' '), value: s }))} 
                                selectedValue={statusFilter} 
                                onChange={setStatusFilter} 
                                namePrefix="status" 
                            />
                            
                            <RadioFilterGroup 
                                label="Kondisi Fisik" 
                                icon={ClipboardCheck}
                                options={dynamicConditions.map(c => ({ label: c, value: c }))} 
                                selectedValue={conditionFilter} 
                                onChange={conditionFilter => setConditionFilter(conditionFilter)} 
                                namePrefix="condition" 
                            />
                            
                            <RadioFilterGroup 
                                label="Lokasi Unit" 
                                icon={MapPin}
                                options={dynamicLocations.map(l => ({ label: l, value: l }))} 
                                selectedValue={locationFilter} 
                                onChange={locationFilter => setLocationFilter(locationFilter)} 
                                namePrefix="location" 
                            />
                        </div>
                        
                        <div className="pt-6 border-t border-primary/5 flex justify-end">
                             <Button variant="ghost" size="sm" onClick={resetFilters} className="text-rose-600 hover:text-rose-700 h-10 px-6 rounded-xl font-black uppercase text-[10px] tracking-widest">
                                <X className="mr-2 h-4 w-4" /> Reset Filter
                             </Button>
                        </div>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
      </CardHeader>      <CardContent className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[3rem] p-4 sm:p-8 border-none shadow-2xl">
        <div className="flex items-center justify-between py-3 px-6 border-b border-primary/5 mb-6">
          <div className="flex items-center gap-5">
             {isSelectionMode && (
              <Checkbox
                  checked={isAllSelected ? true : (isIndeterminate ? 'indeterminate' : false)}
                  onCheckedChange={handleSelectAll}
                  className="h-5 w-5 rounded-lg border-primary/30"
              />
            )}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => {
                setIsSelectionMode(!isSelectionMode);
                if (isSelectionMode) setSelectedAssetIds([]);
              }} 
              className={cn(
                  "rounded-full px-6 h-9 font-black uppercase text-[10px] tracking-widest transition-all text-black shadow-[0_4px_0_0_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-none",
                  isSelectionMode ? "bg-primary text-white border-primary shadow-lg" : "bg-white border-slate-200 hover:bg-slate-50"
              )}
             >
                  <CheckSquare className="mr-2 h-4 w-4" />
                  {isSelectionMode ? 'Selesai' : 'Mode Pilih'}
            </Button>
  
            {isSelectionMode && selectedAssetIds.length > 0 && (
               <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-300">
                  <div className="h-4 w-px bg-slate-200 mx-2" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-primary">{selectedAssetIds.length} Aset Terpilih</span>
               </div>
            )}
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex items-center gap-1 bg-slate-100/80 dark:bg-slate-950/80 p-1 rounded-xl border border-slate-200/20">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('list')} 
              className={cn("h-8 w-8 rounded-lg transition-all", viewMode === 'list' ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={() => setViewMode('grid')} 
              className={cn("h-8 w-8 rounded-lg transition-all", viewMode === 'grid' ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className={cn(
          viewMode === 'grid' 
            ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6" 
            : "space-y-3"
        )}>
          {filteredAssets.length > 0 ? (
            filteredAssets.map(asset => (
              <React.Fragment key={asset.id}>
                {viewMode === 'grid' ? (
                  <AssetGridCard 
                    asset={asset}
                    isSelected={selectedAssetIds.includes(asset.id)}
                    onSelect={(checked) => handleSelectOne(asset.id, checked)}
                    isSelectionMode={isSelectionMode}
                  />
                ) : (
                  <>
                    <AssetItem
                      asset={asset}
                      isExpanded={expandedId === asset.id}
                      onToggle={() => handleToggle(asset.id)}
                      isSelected={selectedAssetIds.includes(asset.id)}
                      onSelect={(checked) => handleSelectOne(asset.id, checked)}
                      isSelectionMode={isSelectionMode}
                    />
                    <AnimatePresence>
                      {expandedId === asset.id && (
                        <AssetDetailCard asset={asset} />
                      )}
                    </AnimatePresence>
                  </>
                )}
              </React.Fragment>
            ))
          ) : (
            <div className="col-span-full flex flex-col items-center justify-center py-32 bg-slate-50/50 rounded-[3rem] border-2 border-dashed border-slate-200">
                <Search className="h-16 w-16 text-slate-200 mb-6" />
                <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest">Aset Tidak Ditemukan</h3>
                <p className="text-sm text-slate-400 italic mt-2">Coba ubah kata kunci atau bersihkan filter pencarian.</p>
             </div>
          )}
        </div>
      </CardContent>
      
      {/* Floating Action Bar for Selections */}
      <AnimatePresence>
        {isSelectionMode && selectedAssetIds.length > 0 && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="fixed bottom-10 left-0 right-0 z-[60] px-4 flex justify-center pointer-events-none"
          >
            <div className="bg-slate-900/90 dark:bg-slate-950/90 backdrop-blur-2xl px-6 py-4 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10 flex flex-wrap items-center justify-center gap-3 sm:gap-6 pointer-events-auto ring-8 ring-slate-900/20">
                <div className="flex flex-col items-start pr-6 border-r border-white/10 hidden sm:flex">
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none mb-1">Batch Actions</span>
                    <span className="text-sm font-black text-white">{selectedAssetIds.length} Selected</span>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                    <GenerateQrCodeDialog selectedAssets={selectedAssets}>
                        <Button size="sm" className="h-10 rounded-xl bg-white text-slate-900 hover:bg-slate-100 font-black uppercase text-[10px] tracking-widest px-4 shadow-lg shadow-black/20">
                            <QrCode className="mr-2 h-4 w-4" /> QR Code
                        </Button>
                    </GenerateQrCodeDialog>

                    <PrintBarcodeDialog selectedAssets={selectedAssets}>
                        <Button size="sm" variant="outline" className="h-10 rounded-xl bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest px-4">
                            <PrinterIcon className="mr-2 h-4 w-4 text-primary" /> Barcode
                        </Button>
                    </PrintBarcodeDialog>

                    {isAdmin && (
                        <>
                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-10 rounded-xl bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest px-4"
                              onClick={() => setActiveBulkAction('status')}
                            >
                                <ActivityIcon className="mr-2 h-4 w-4 text-emerald-500" /> Status
                            </Button>

                            <Button 
                              size="sm" 
                              variant="outline" 
                              className="h-10 rounded-xl bg-white/5 border-white/20 text-white hover:bg-white/10 font-bold text-[10px] uppercase tracking-widest px-4"
                              onClick={() => setActiveBulkAction('location')}
                            >
                                <MapPin className="mr-2 h-4 w-4 text-blue-500" /> Lokasi
                            </Button>

                            <DeleteMultipleAssetsDialog assetIds={selectedAssetIds} onSuccess={() => setSelectedAssetIds([])}>
                                <Button size="sm" variant="destructive" className="h-10 rounded-xl bg-rose-600 hover:bg-rose-700 font-black uppercase text-[10px] tracking-widest px-6 shadow-xl shadow-rose-600/20">
                                    <Trash2 className="mr-2 h-4 w-4" /> Delete
                                </Button>
                            </DeleteMultipleAssetsDialog>
                        </>
                    )}
                </div>

                <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => setSelectedAssetIds([])} 
                    className="h-10 w-10 rounded-full text-white/40 hover:text-white hover:bg-white/10 ml-2"
                >
                    <X className="h-5 w-5" />
                </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {activeBulkAction === 'status' && (
          <BulkUpdateStatusPanel 
            selectedAssets={selectedAssets} 
            isOpen={true}
            onClose={() => setActiveBulkAction(null)}
            onSuccess={() => { setSelectedAssetIds([]); setActiveBulkAction(null); }} 
          />
        )}
        {activeBulkAction === 'location' && (
          <BulkUpdateLocationPanel 
            selectedAssets={selectedAssets} 
            isOpen={true}
            onClose={() => setActiveBulkAction(null)}
            onSuccess={() => { setSelectedAssetIds([]); setActiveBulkAction(null); }} 
          />
        )}
      </AnimatePresence>
    </div>
  );
}

