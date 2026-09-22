'use client';

import { useState, useMemo, useEffect, useCallback } from 'react';
import { type Asset, type AssetStatus, type AssetCondition } from '@/lib/types';
import AssetDetailCard from './asset-detail-card';
import { AnimatePresence, motion } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
  List,
  ChevronLeft,
  HeartPulse
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

const CheckboxFilterGroup = ({
    label,
    options,
    selectedValues,
    onChange,
    namePrefix,
    icon: Icon
}: {
    label: string;
    options: { label: string; value: string }[];
    selectedValues: string[];
    onChange: (values: string[]) => void;
    namePrefix: string;
    icon?: React.ElementType;
}) => {
    return (
        <div className="space-y-2 flex flex-col text-left">
            <Label className="text-[11px] font-black uppercase tracking-[0.2em] text-primary/70 ml-1 flex items-center gap-2 text-left">
                {Icon && <Icon className="h-3.5 w-3.5" />}
                {label}
            </Label>
            <div className="flex flex-row flex-wrap gap-2 text-left">
                <div className="relative">
                    <input
                        type="checkbox"
                        id={`${namePrefix}-all`}
                        name={`${namePrefix}-all`}
                        className="radio-input peer"
                        checked={selectedValues.includes('ALL')}
                        onChange={() => onChange(['ALL'])}
                        style={{ position: 'absolute', opacity: 0 }}
                    />
                    <label
                        htmlFor={`${namePrefix}-all`}
                        className="radio-label flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:shadow-sm"
                    >
                        <span className="radio-inner-circle inline-block w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-[4px] mr-2 relative transition-all peer-checked:border-primary">
                             {selectedValues.includes('ALL') && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-[2px]" />}
                        </span>
                        <span className="text-xs font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">Semua</span>
                    </label>
                </div>

                {options.map((option) => (
                    <div key={option.value} className="relative">
                        <input
                            type="checkbox"
                            id={`${namePrefix}-${option.value}`}
                            name={`${namePrefix}-${option.value}`}
                            className="radio-input peer"
                            checked={selectedValues.includes(option.value)}
                            onChange={() => {
                                let newSelected = [...selectedValues];
                                if (newSelected.includes('ALL')) newSelected = [];
                                if (newSelected.includes(option.value)) {
                                    newSelected = newSelected.filter(v => v !== option.value);
                                } else {
                                    newSelected.push(option.value);
                                }
                                if (newSelected.length === 0) newSelected = ['ALL'];
                                onChange(newSelected);
                            }}
                            style={{ position: 'absolute', opacity: 0 }}
                        />
                        <label
                            htmlFor={`${namePrefix}-${option.value}`}
                            className="radio-label flex items-center px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg cursor-pointer transition-all hover:bg-slate-50 dark:hover:bg-slate-800 peer-checked:bg-primary/10 peer-checked:border-primary peer-checked:shadow-sm"
                        >
                            <span className="radio-inner-circle inline-block w-3.5 h-3.5 border-2 border-slate-300 dark:border-slate-600 rounded-[4px] mr-2 relative transition-all peer-checked:border-primary">
                                 {selectedValues.includes(option.value) && <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-1.5 h-1.5 bg-primary rounded-[2px]" />}
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
  
  const [locationFilter, setLocationFilter] = useState<string[]>(['ALL']);
  const [statusFilter, setStatusFilter] = useState<string[]>(['ALL']);
  const [conditionFilter, setConditionFilter] = useState<string[]>([initialConditionFilter]);
  const [categoryFilter, setCategoryFilter] = useState<string[]>([initialCategoryFilter]);
  const [ownershipFilter, setOwnershipFilter] = useState<string[]>(['ALL']);
  
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'code', direction: 'ascending' });

  useEffect(() => {
    setCategoryFilter([initialCategoryFilter]);
    if (initialCategoryFilter !== 'ALL') setShowFilters(true);
  }, [initialCategoryFilter]);

  useEffect(() => {
    setConditionFilter([initialConditionFilter]);
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
        if (categoryFilter.includes('ALL')) return true;
        return categoryFilter.some(cat => {
            if (cat === 'A') return asset.category.startsWith('A') && !isUtility;
            if (cat === 'B') return !asset.category.startsWith('A') && !isUtility;
            if (cat === 'UTILITY') return isUtility;
            return asset.category === cat;
        });
      })();
      const ownershipMatch = (() => {
        if (ownershipFilter.includes('ALL')) return true;
        return ownershipFilter.some(own => {
            if (own === 'COMPANY') return asset.status !== 'Bukan_Asset_Perusahaan';
            if (own === 'PERSONAL') return asset.status === 'Bukan_Asset_Perusahaan';
            return true;
        });
      })();
      const conditionMatch = conditionFilter.includes('ALL') || conditionFilter.includes(asset.condition);
      const locationMatch = locationFilter.includes('ALL') || locationFilter.includes(asset.location);
      const statusMatch = statusFilter.includes('ALL') || statusFilter.includes(asset.status);
      return searchMatch && categoryMatch && statusMatch && conditionMatch && locationMatch && ownershipMatch;
    });
  }, [assets, searchTerm, categoryFilter, statusFilter, conditionFilter, locationFilter, ownershipFilter, sortConfig]);
  
  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (!locationFilter.includes('ALL')) count += locationFilter.length;
    if (!statusFilter.includes('ALL')) count += statusFilter.length;
    if (!conditionFilter.includes('ALL')) count += conditionFilter.length;
    if (!categoryFilter.includes('ALL')) count += categoryFilter.length;
    if (!ownershipFilter.includes('ALL')) count += ownershipFilter.length;
    return count;
  }, [locationFilter, statusFilter, conditionFilter, categoryFilter, ownershipFilter]);

  const isAllSelected = filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length;
  const isIndeterminate = selectedAssetIds.length > 0 && selectedAssetIds.length < filteredAssets.length;

  const resetFilters = () => {
    setSearchTerm('');
    setLocationFilter(['ALL']);
    setStatusFilter(['ALL']);
    setConditionFilter(['ALL']);
    setCategoryFilter(['ALL']);
    setOwnershipFilter(['ALL']);
    setSortConfig(null);
    setCurrentPage(1);
  }

  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, categoryFilter, statusFilter, conditionFilter, locationFilter, ownershipFilter, sortConfig, itemsPerPage]);

  const isSplitScreen = !locationFilter.includes('ALL') && locationFilter.length > 1;

  const assetsByLocation = useMemo(() => {
    if (!isSplitScreen) return null;
    const grouped: Record<string, Asset[]> = {};
    locationFilter.forEach(loc => { grouped[loc] = []; });
    filteredAssets.forEach(asset => {
       if (grouped[asset.location]) {
           grouped[asset.location].push(asset);
       }
    });
    return grouped;
  }, [filteredAssets, locationFilter, isSplitScreen]);

  const paginatedAssets = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return filteredAssets.slice(startIndex, startIndex + itemsPerPage);
  }, [filteredAssets, currentPage, itemsPerPage]);

  const paginatedAssetsByLocation = useMemo(() => {
    if (!assetsByLocation) return null;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const result: Record<string, Asset[]> = {};
    Object.keys(assetsByLocation).forEach(loc => {
      result[loc] = assetsByLocation[loc].slice(startIndex, startIndex + itemsPerPage);
    });
    return result;
  }, [assetsByLocation, currentPage, itemsPerPage]);

  const totalPages = useMemo(() => {
    if (isSplitScreen && assetsByLocation) {
        let maxLen = 0;
        Object.values(assetsByLocation).forEach(arr => {
           if (arr.length > maxLen) maxLen = arr.length;
        });
        return Math.max(1, Math.ceil(maxLen / itemsPerPage));
    }
    return Math.max(1, Math.ceil(filteredAssets.length / itemsPerPage));
  }, [filteredAssets.length, itemsPerPage, isSplitScreen, assetsByLocation]);

  const handleToggle = useCallback((id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  }, []);

  const handleSelectOne = useCallback((assetId: string, checked: boolean) => {
    setSelectedAssetIds(prev => 
      checked ? [...prev, assetId] : prev.filter(id => id !== assetId)
    );
  }, []);

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
    <div className="w-full space-y-4 animate-in fade-in duration-700 pb-10 text-black">
      <CardHeader className="bg-transparent px-0 space-y-4">
        {/* Modern Header Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 to-indigo-950 dark:from-slate-950 dark:to-slate-900 text-white rounded-[2rem] p-5 md:p-6 shadow-xl border border-white/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(99,102,241,0.15),transparent_50%)]" />
            <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="space-y-1.5 text-left">
                    <span className="text-[9px] font-black tracking-[0.25em] text-indigo-400 uppercase">Master Database</span>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight uppercase flex items-center gap-2.5">
                        <Package className="h-7 w-7 text-indigo-400" /> Asset Inventory
                    </h1>
                    <p className="text-[11px] text-slate-300 font-medium tracking-wide">
                        Sistem Manajemen & Pelacakan Inventaris Aset PT. China Glaze Indonesia
                    </p>
                </div>
                <div className="flex items-center gap-2 bg-white/5 border border-white/10 rounded-2xl px-4 py-2.5 backdrop-blur-md self-start md:self-auto shadow-inner">
                    <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-300">{summaryData.totalAssets} Total Unit Terdaftar</span>
                </div>
            </div>
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6 mt-6 pt-6 border-t border-white/10">
                 <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                     <div className="relative w-full md:w-80 h-10 group">
                         <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-white transition-colors" />
                         <input
                             placeholder="Cari nama atau kode aset..."
                             value={searchTerm}
                             onChange={(e) => setSearchTerm(e.target.value)}
                             className="w-full h-full pl-10 pr-4 bg-white/10 backdrop-blur-md border border-white/20 rounded-xl text-xs font-bold uppercase tracking-widest text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-white/20 focus:border-white/30 transition-all shadow-[0_2px_10px_rgba(0,0,0,0.02)]"
                         />
                     </div>

                     <div className="flex items-center gap-1.5 bg-white/10 backdrop-blur-md p-1 rounded-xl border border-white/20 shadow-[0_2px_10px_rgba(0,0,0,0.02)]">
                          <Button asChild variant="ghost" className="rounded-lg h-8 px-3 text-xs font-bold uppercase tracking-wider hover:bg-white/20 transition-all text-white hover:text-white">
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
                              "h-10 px-4 rounded-xl border font-bold uppercase tracking-wider transition-all duration-300 text-xs shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md hover:-translate-y-0.5 backdrop-blur-md text-white hover:text-white",
                              showFilters 
                                 ? "bg-white/20 border-white/40" 
                                 : "bg-white/10 border-white/20 hover:bg-white/20",
                              activeFiltersCount > 0 && "border-indigo-400 bg-white/20 text-indigo-100 hover:bg-white/30"
                          )}
                      >
                          <Filter className={cn("mr-2 h-4 w-4 transition-transform", showFilters && "text-indigo-200")} />
                          Filter {activeFiltersCount > 0 && `(${activeFiltersCount})`}
                      </Button>

                      {canAdd && (
                        <AssetForm>
                            <Button className="rounded-xl h-10 px-5 bg-white text-indigo-900 hover:bg-slate-100 font-black uppercase text-xs tracking-wider transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 border border-white/20">
                                <span className="mr-1.5 text-sm select-none">➕</span>
                                Tambah Aset
                            </Button>
                        </AssetForm>
                      )}
                 </div>
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
                     <div className="space-y-4 p-5 mt-2 border-2 border-dashed rounded-[2rem] bg-white/40 dark:bg-slate-900/40 backdrop-blur-md border-primary/10 text-left">
                        <div className="flex flex-col gap-4">
                            <CheckboxFilterGroup 
                                label="Kepemilikan" 
                                icon={ShieldCheck}
                                options={[{ label: 'Perusahaan', value: 'COMPANY' }, { label: 'Personal', value: 'PERSONAL' }]} 
                                selectedValues={ownershipFilter} 
                                onChange={setOwnershipFilter} 
                                namePrefix="ownership" 
                            />
                            
                            <CheckboxFilterGroup 
                                label="Klasifikasi" 
                                icon={Layers}
                                options={[{ label: 'Seri A', value: 'A' }, { label: 'Seri B', value: 'B' }, { label: 'Utilitas', value: 'UTILITY' }]} 
                                selectedValues={categoryFilter} 
                                onChange={setCategoryFilter} 
                                namePrefix="series" 
                            />

                            <CheckboxFilterGroup 
                                label="Status Operasional" 
                                icon={ActivityIcon}
                                options={dynamicStatuses.map(s => ({ label: s.replace(/_/g, ' '), value: s }))} 
                                selectedValues={statusFilter} 
                                onChange={setStatusFilter} 
                                namePrefix="status" 
                            />
                            
                            <CheckboxFilterGroup 
                                label="Kondisi Fisik" 
                                icon={HeartPulse}
                                options={dynamicConditions.map(c => ({ label: c, value: c }))} 
                                selectedValues={conditionFilter} 
                                onChange={setConditionFilter} 
                                namePrefix="condition" 
                            />
                            
                            <CheckboxFilterGroup 
                                label="Lokasi Penyimpanan" 
                                icon={MapPin}
                                options={dynamicLocations.map(l => ({ label: l, value: l }))} 
                                selectedValues={locationFilter} 
                                onChange={setLocationFilter} 
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
      </CardHeader>      <CardContent className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2rem] p-3 sm:p-5 border-none shadow-2xl">
        <div className="flex items-center justify-between py-2 px-3 border-b border-primary/5 mb-4">
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
              disabled={isSplitScreen}
              className={cn("h-8 w-8 rounded-lg transition-all", viewMode === 'list' && !isSplitScreen ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600", isSplitScreen && "opacity-50 cursor-not-allowed")}
            >
              <List className="h-4 w-4" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setViewMode('grid')}
              disabled={isSplitScreen}
              className={cn("h-8 w-8 rounded-lg transition-all", viewMode === 'grid' && !isSplitScreen ? "bg-white dark:bg-slate-900 shadow-sm text-primary" : "text-slate-400 hover:text-slate-600", isSplitScreen && "opacity-50 cursor-not-allowed")}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {isSplitScreen && paginatedAssetsByLocation ? (
          <div className="flex gap-4 overflow-x-auto pb-6 snap-x pt-2">
             {Object.keys(paginatedAssetsByLocation).map(loc => (
               <div key={loc} className="min-w-[320px] max-w-[400px] flex-1 flex flex-col gap-2 snap-center">
                 <div className="bg-gradient-to-r from-slate-100 to-white dark:from-slate-800 dark:to-slate-900 px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm flex items-center justify-between sticky top-0 z-10">
                    <span className="font-black text-sm text-slate-700 dark:text-slate-300 uppercase tracking-widest">{loc}</span>
                    <Badge variant="secondary" className="bg-white dark:bg-slate-950 font-bold">{paginatedAssetsByLocation[loc].length}</Badge>
                 </div>
                 {paginatedAssetsByLocation[loc].length > 0 ? (
                    <div className="space-y-2">
                        {paginatedAssetsByLocation[loc].map(asset => (
                           <React.Fragment key={asset.id}>
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
                           </React.Fragment>
                        ))}
                    </div>
                 ) : (
                    <div className="flex-1 min-h-[200px] flex items-center justify-center bg-slate-50/50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 text-xs text-slate-400 italic">
                       Kosong
                    </div>
                 )}
               </div>
             ))}
          </div>
        ) : (
          <div className={cn(
            viewMode === 'grid'
              ? "grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4"
              : "space-y-2"
          )}>
            {paginatedAssets.length > 0 ? (
              paginatedAssets.map(asset => (
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
        )}

        {(totalPages > 1 || filteredAssets.length > 20) && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-slate-100 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    Halaman {currentPage} dari {totalPages > 0 ? totalPages : 1}
                </div>
                <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 hidden sm:flex">
                        <span className="text-xs text-slate-500">Tampilkan:</span>
                        <Select value={itemsPerPage.toString()} onValueChange={(val) => setItemsPerPage(parseInt(val))}>
                            <SelectTrigger className="h-8 text-xs w-[70px]">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="20">20</SelectItem>
                                <SelectItem value="50">50</SelectItem>
                                <SelectItem value="100">100</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex items-center gap-2">
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="h-8 px-3 rounded-lg text-xs"
                    >
                        <ChevronLeft className="h-4 w-4 mr-1" />
                        Prev
                    </Button>
                    <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="h-8 px-3 rounded-lg text-xs"
                    >
                        Next
                        <ChevronRight className="h-4 w-4 ml-1" />
                    </Button>
                </div>
                </div>
            </div>
        )}
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

