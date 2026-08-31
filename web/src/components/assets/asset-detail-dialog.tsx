'use client';

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, Timestamp, collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetCondition, type MaintenanceSchedule } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { format, differenceInYears, addYears } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
  DialogPortal,
  DialogOverlay,
} from '../ui/dialog';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { 
  ArrowRightLeft, 
  Edit, 
  Printer, 
  Recycle, 
  ExternalLink, 
  ClipboardEdit, 
  Eye, 
  X as XIcon, 
  RotateCcw,
  Tag as TagIcon,
  MapPin as MapPinIcon,
  CircleDollarSign,
  Calendar as CalendarIcon,
  Hash,
  Info as InfoIcon,
  ShieldCheck,
  FileText as FileTextIcon,
  Layers as LayersIcon,
  Settings2,
  Share2,
  Loader2,
  Wrench as WrenchIcon,
  CheckCircle2,
  TrendingDown,
  User as UserIcon,
  Ticket,
  Image as ImageIcon,
  Building as BuildingIcon,
  Activity as ActivityIcon,
  Zap,
  Clock as ClockIcon,
  Shield as ShieldIcon,
  Package as PackageIcon,
  History as HistoryIcon
} from 'lucide-react';
import { Badge } from '../ui/badge';
import { useAuth } from '@/hooks/use-auth';
import AssetForm from './asset-form';
import MutationForm from '../mutations/mutation-form';
import AssetCardPreview from './asset-card-preview';
import { calculateDepreciation } from '@/lib/calculations';
import { Progress } from '../ui/progress';
import MaintenanceDetailCard from '@/components/maintenance/maintenance-detail-card';
import { ScrollArea } from '../ui/scroll-area';

interface AssetDetailDialogProps {
  assetId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const getDeptColor = (dept: string = '') => {
  const d = dept.toUpperCase();
  if (d.includes('IT')) return { bg: 'bg-blue-600', shadow: 'shadow-[0_8px_0_0_rgba(30,58,138,0.3)]', text: 'text-white', border: 'border-blue-400/20' };
  if (d.includes('HR') || d.includes('GA')) return { bg: 'bg-emerald-600', shadow: 'shadow-[0_8px_0_0_rgba(6,78,59,0.3)]', text: 'text-white', border: 'border-emerald-400/20' };
  if (d.includes('ACCOUNTING')) return { bg: 'bg-amber-500', shadow: 'shadow-[0_8px_0_0_rgba(120,53,15,0.3)]', text: 'text-white', border: 'border-amber-400/20' };
  if (d.includes('MIXER') || d.includes('FRIT') || d.includes('TINTA') || d.includes('PRODUCTION')) return { bg: 'bg-rose-600', shadow: 'shadow-[0_8px_0_0_rgba(159,18,57,0.3)]', text: 'text-white', border: 'border-rose-400/20' };
  if (d.includes('R&D') || d.includes('LAB') || d.includes('QC')) return { bg: 'bg-purple-600', shadow: 'shadow-[0_8px_0_0_rgba(88,28,135,0.3)]', text: 'text-white', border: 'border-purple-400/20' };
  if (d.includes('MANAGEMENT')) return { bg: 'bg-slate-900', shadow: 'shadow-[0_8px_0_0_rgba(0,0,0,0.4)]', text: 'text-white', border: 'border-slate-700' };
  if (d.includes('MARKETING')) return { bg: 'bg-pink-600', shadow: 'shadow-[0_8px_0_0_rgba(131,24,67,0.3)]', text: 'text-white', border: 'border-pink-400/20' };
  if (d.includes('PURCHASING')) return { bg: 'bg-orange-500', shadow: 'shadow-[0_8px_0_0_rgba(124,45,18,0.3)]', text: 'text-white', border: 'border-orange-400/20' };
  return { bg: 'bg-cyan-600', shadow: 'shadow-[0_8px_0_0_rgba(21,94,117,0.3)]', text: 'text-white', border: 'border-cyan-400/20' };
};

const DetailItem = ({ label, value, icon: Icon, className, dark }: { label: string; value: React.ReactNode, icon?: React.ElementType, className?: string, dark?: boolean }) => (
  <div className={cn("flex flex-col gap-1 p-3 rounded-2xl border shadow-inner transition-all group", 
    dark ? "bg-black/20 border-white/10 hover:bg-black/30" : "bg-white dark:bg-slate-900 border-primary/5",
    className
  )}>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className={cn("w-3 h-3", dark ? "text-white/60" : "text-primary/60")} />}
      <p className={cn("text-[10px] font-black uppercase tracking-widest", dark ? "text-white/80" : "text-slate-900/60 dark:text-slate-100/60")}>{label}</p>
    </div>
    <div className={cn(
        "font-black text-xs md:text-sm uppercase tracking-tight leading-tight", 
        dark ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-slate-900 dark:text-slate-100"
    )}>
        {value || '-'}
    </div>
  </div>
);

const SectionLabel = ({ title, icon: Icon, dark }: { title: string, icon: React.ElementType, dark?: boolean }) => (
    <div className="col-span-full mt-6 mb-3 first:mt-0 flex items-center gap-3">
        <Icon className={cn("w-3.5 h-3.5", dark ? "text-white/30" : "text-primary/40")} />
        <p className={cn("text-[9px] font-black uppercase tracking-[0.3em]", dark ? "text-white/50" : "text-primary/60")}>{title}</p>
        <div className={cn("h-px flex-1 bg-gradient-to-r", dark ? "from-white/10 to-transparent" : "from-primary/10 to-transparent")} />
    </div>
);

const isoRelevantCategories = [
  'A3-Peralatan Mesin',
  'A4-Peralatan Listrik',
  'A5-Peralatan Transportasi',
  'A6-Peralatan Penelitian & Uji Lab',
  'A9-Peralatan Lain-lain',
  'Kendaraan',
  'Elektronik'
];

export default function AssetDetailDialog({ assetId, isOpen, onOpenChange }: AssetDetailDialogProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSchedule[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSharing, setIsSharing] = useState(false);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});
  const { toast } = useToast();
  const { user } = useAuth();

  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [isMutationFormOpen, setIsMutationFormOpen] = useState(false);
  const [isPreviewCardOpen, setIsPreviewCardOpen] = useState(false);
  const [mutationType, setMutationType] = useState<'mutasi' | 'disposal' | 'edit'>('mutasi');
  const [selectedHistorySchedule, setSelectedHistorySchedule] = useState<MaintenanceSchedule | null>(null);

  const deptStyle = useMemo(() => asset ? getDeptColor(asset.location) : getDeptColor(''), [asset]);

  const depreciation = useMemo(() => {
    if (!asset) return null;
    return calculateDepreciation(asset.price, asset.purchaseDate, asset.assetLifetime, asset.manualDepreciationPercent);
  }, [asset]);

  const isPendingProcess = useMemo(() => {
    if (!asset) return false;
    const statusLower = asset.status.toLowerCase();
    return statusLower.includes('waiting') || statusLower.includes('submitted') || statusLower.includes('proses') || statusLower.startsWith('karyawan_approved');
  }, [asset]);

  const isDisposedAsset = useMemo(() => {
    if (!asset) return false;
    const statusLower = asset.status.toLowerCase();
    return statusLower.includes('approved_disposal') || statusLower === 'disposed';
  }, [asset]);

  const isActionDisabled = isPendingProcess || isDisposedAsset;

  useEffect(() => {
    const unsubLabels = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().categoryLabels) {
          setCategoryLabels(snap.data().categoryLabels);
        }
    });

    if (isOpen && assetId) {
      setLoading(true);
      const docRef = doc(db, 'assets', assetId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          setAsset({ id: docSnap.id, ...docSnap.data() } as Asset);
          setError(null);
        } else {
          setError('Aset tidak ditemukan.');
          setAsset(null);
        }
        setLoading(false);
      }, (err) => {
        console.error("Error fetching asset details:", err);
        setError('Gagal memuat detail aset.');
        setLoading(false);
      });

      setLoadingMaintenance(true);
      const mQuery = query(
          collection(db, 'maintenance_schedules'),
          where('assetId', '==', assetId),
          orderBy('scheduledDate', 'desc')
      );
      
      const unsubscribeM = onSnapshot(mQuery, (snapshot) => {
          const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule));
          setMaintenanceHistory(history);
          setLoadingMaintenance(false);
      });

      return () => {
          unsubLabels();
          unsubscribe();
          unsubscribeM();
      }
    }
    return () => unsubLabels();
  }, [assetId, isOpen]);

  const openMutationForm = (type: 'mutasi' | 'disposal' | 'edit') => {
    setMutationType(type);
    setTimeout(() => setIsMutationFormOpen(true), 100);
  }

  const handleShareLink = async () => {
    if (!asset) return;
    setIsSharing(true);
    try {
        let publicUrl = `${window.location.origin}/public/asset?assetId=${asset.id}`;
        
        if (asset.status === 'Bukan_Asset_Perusahaan') {
            publicUrl = `${window.location.origin}/public/personal?id=${asset.id}`;
        } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
            publicUrl = `${window.location.origin}/public/utility?id=${asset.id}`;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Verifikasi Aset: ${asset.name}`,
                    text: `Identitas resmi aset PT. CGI (${asset.code})`,
                    url: publicUrl,
                });
                toast({ title: 'Berhasil Dibagikan' });
            } catch (shareError: any) {
                if (shareError.name !== 'AbortError') {
                    await navigator.clipboard.writeText(publicUrl);
                    toast({ title: 'Link Disalin' });
                }
            }
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
        setIsSharing(false);
    }
  };
  
  const galleryImages = [
    asset?.photoURL,
    asset?.photoURL2,
    asset?.photoURL3,
    asset?.photoURL4,
  ].filter((url): url is string => !!url && url.length > 0);

  const isAdmin = user?.role === 'Admin';

  const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return null;
    try {
        return format(timestamp.toDate(), 'd MMMM yyyy', { locale: id });
    } catch (e) {
        return null;
    }
  };

  const formatCurrency = (value: number | undefined | null, currency: 'IDR' | 'USD' = 'IDR') => {
    if (typeof value !== 'number') return '-';
    if (currency === 'USD') {
        return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    }
    return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(value);
  };

  const masaPakai = asset?.purchaseDate ? `${differenceInYears(new Date(), asset.purchaseDate.toDate())} tahun` : '-';
  
  const sisaUmur = (asset?.purchaseDate && asset?.assetLifetime)
    ? asset.assetLifetime - differenceInYears(new Date(), asset.purchaseDate.toDate())
    : null;
    
  const tanggalHabis = (asset?.purchaseDate && asset?.assetLifetime)
    ? addYears(asset.purchaseDate.toDate(), asset.assetLifetime)
    : null;

  const getAccessoryLabel = (index: 1 | 2 | 3 | 4) => {
    if (!asset) return `Kelengkapan ${index}`;
    if (categoryLabels[asset.category] && categoryLabels[asset.category][index - 1]) {
        return categoryLabels[asset.category][index - 1];
    }
    const category = asset.category;
    const name = (asset.name || '').toLowerCase();
    const isEmissionISO = category === 'A3-Peralatan Mesin' || category === 'A4-Peralatan Listrik';
    if (isEmissionISO) {
      switch(index) {
        case 1: return "Sumber Emisi";
        case 2: return "Volume / Tahun";
        case 3: return "Faktor Emisi";
        case 4: return "Metodologi";
      }
    }
    const isAC = name.includes('ac') || name.includes('air conditioner') || category === 'Elektronik';
    if (isAC) {
      switch(index) {
        case 1: return "Model Unit";
        case 2: return "Jenis Refrigeran";
        case 3: return "Volume (KG)";
        case 4: return "kW";
      }
    }
    if (category === 'APAR') {
      switch(index) {
        case 1: return "Berat (kg)";
        case 2: return "Media";
        case 3: return "Exp Date";
        case 4: return "Posisi";
      }
    }
    if (isoRelevantCategories.includes(category)) {
      switch(index) {
        case 1: return "Model / S/N";
        case 2: return "Tipe Unit";
        case 3: return "Jenis Fuel / Energy";
        case 4: return "Kapasitas";
      }
    }
    return `Kelengkapan ${index}`;
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogPortal>
          <DialogOverlay className="bg-slate-950/80 backdrop-blur-md" />
          <DialogContent 
            hideCloseButton
            className="sm:max-w-5xl h-[92vh] max-h-[92vh] overflow-hidden p-0 border-none shadow-3xl text-black rounded-[2.5rem] flex flex-col"
            onPointerDownOutside={(e) => e.preventDefault()}
          >
             <div className={cn(
                 "shrink-0 px-6 py-5 flex items-center justify-between border-b transition-all duration-700",
                 deptStyle.bg, deptStyle.text, deptStyle.shadow
             )}>
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                
                {loading ? (
                  <div className="flex flex-col gap-2 relative z-10 text-left">
                    <DialogTitle className="sr-only">Memuat Detail Aset</DialogTitle>
                    <Skeleton className="h-8 w-64 bg-white/20 rounded-lg" />
                  </div>
                ) : asset ? (
                  <div className="flex flex-col min-w-0 relative z-10 text-left">
                    <DialogTitle className="text-xl md:text-3xl font-black tracking-tighter flex items-center gap-4 truncate text-left drop-shadow-xl">
                      <div className="p-2 bg-white/20 rounded-xl backdrop-blur-md shadow-inner shrink-0 border border-white/30">
                          <TagIcon className="w-5 h-5 sm:w-8 sm:h-8 text-white" />
                      </div>
                      <span className="truncate italic">{asset.name}</span>
                    </DialogTitle>
                    <div className="flex items-center gap-3 mt-3 pl-14 text-left">
                      <Badge className="bg-black/30 text-white border-none font-mono font-black tracking-wider text-xl px-4 py-0.5 shadow-2xl">{asset.code}</Badge>
                      <span className="text-[9px] font-black uppercase tracking-[0.3em] opacity-60">Verified Node</span>
                    </div>
                  </div>
                ) : (
                  <DialogTitle>Data Tidak Tersedia</DialogTitle>
                )}
                <DialogClose asChild className="relative z-10">
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white h-10 w-10 border border-white/20">
                    <XIcon className="w-6 h-6" />
                  </Button>
                </DialogClose>
             </div>

            <ScrollArea className="flex-1 min-h-0 w-full">
              <div className="p-4 sm:p-10 space-y-10 bg-slate-50 dark:bg-slate-950">
                {loading ? (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4 text-left">
                        {Array.from({length: 12}).map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-2xl" />)}
                    </div>
                ) : asset ? (
                    <>
                        <div className="flex flex-wrap items-center gap-4 p-4 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl text-left">
                          <Button 
                            size="sm" 
                            onClick={() => openMutationForm('mutasi')} 
                            disabled={isActionDisabled}
                            className={cn(
                              "rounded-xl h-10 px-8 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase text-[10px] tracking-widest transition-all flex-1 sm:flex-none",
                              isActionDisabled 
                                ? "opacity-50 pointer-events-none shadow-none translate-y-0" 
                                : "shadow-[0_5px_0_0_#1e3a8a] hover:translate-y-[1px] hover:shadow-[0_4px_0_0_#1e3a8a] active:translate-y-[5px] active:shadow-none"
                            )}
                          >
                            <ArrowRightLeft className="mr-2 h-4 w-4" /> Mutasi
                          </Button>
                          <Button 
                            size="sm" 
                            variant="destructive" 
                            onClick={() => openMutationForm('disposal')} 
                            disabled={isActionDisabled}
                            className={cn(
                              "rounded-xl h-10 px-8 bg-rose-600 hover:bg-rose-700 text-white font-black uppercase text-[10px] tracking-widest transition-all flex-1 sm:flex-none",
                              isActionDisabled 
                                ? "opacity-50 pointer-events-none shadow-none translate-y-0" 
                                : "shadow-[0_5px_0_0_#9f1239] hover:translate-y-[1px] hover:shadow-[0_4px_0_0_#9f1239] active:translate-y-[5px] active:shadow-none"
                            )}
                          >
                            <Recycle className="mr-2 h-4 w-4" /> Disposal
                          </Button>
                          <Button 
                            size="sm" 
                            variant="outline" 
                            onClick={() => openMutationForm('edit')} 
                            disabled={isActionDisabled}
                            className={cn(
                              "rounded-xl h-10 px-8 bg-white border-slate-200 text-slate-700 hover:bg-slate-50 font-black uppercase text-[10px] tracking-widest transition-all flex-1 sm:flex-none",
                              isActionDisabled 
                                ? "opacity-50 pointer-events-none shadow-none translate-y-0" 
                                : "shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:translate-y-[1px] active:translate-y-[4px] active:shadow-none"
                            )}
                          >
                              <ClipboardEdit className="mr-2 h-4 w-4 text-primary" /> Kondisi
                          </Button>

                          {isPendingProcess && (
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 animate-pulse flex-1 text-center sm:text-left">
                              Aset dalam pengajuan (Mutasi / Disposal pending)
                            </span>
                          )}
                          {isDisposedAsset && (
                            <span className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-wider bg-rose-50 dark:bg-rose-950/20 px-4 py-2.5 rounded-xl border border-rose-100 dark:border-rose-900/40 flex-1 text-center sm:text-left">
                              Aset dinonaktifkan (Disposal selesai)
                            </span>
                          )}
                          
                          <div className="h-8 w-px bg-slate-200 dark:bg-slate-800 mx-2 hidden md:block" />
                          
                          <Button size="sm" variant="outline" onClick={handleShareLink} disabled={isSharing} className="rounded-xl h-10 px-8 border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(147,51,234,0.1)] hover:translate-y-[1px] active:translate-y-[4px] active:shadow-none transition-all">
                              {isSharing ? <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin mr-2" /> : <Share2 className="mr-2 h-3.5 w-3.5" />} Share
                          </Button>

                          {isAdmin && (
                            <Button size="sm" variant="outline" onClick={() => setIsAssetFormOpen(true)} className="rounded-xl h-10 px-8 border-amber-200 text-amber-700 hover:bg-amber-600 hover:text-white font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(217,119,6,0.1)] hover:translate-y-[1px] active:translate-y-[4px] active:shadow-none transition-all">
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </Button>
                          )}
                          <Button size="sm" variant="outline" onClick={() => setIsPreviewCardOpen(true)} className="rounded-xl h-10 px-8 border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(5,150,105,0.1)] hover:translate-y-[1px] active:translate-y-[4px] active:shadow-none transition-all">
                              <Eye className="mr-2 h-4 w-4" /> Kartu
                          </Button>
                        </div>
                        
                        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                          <SectionLabel title="Penempatan & Klasifikasi" icon={MapPinIcon} />
                          <DetailItem label="Lokasi Unit" value={asset.location} icon={MapPinIcon} />
                          <DetailItem label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
                          <DetailItem label="Kategori" value={asset.category} icon={LayersIcon} />
                          <DetailItem label="Kondisi Fisik" value={asset.condition} icon={ClipboardEdit} />
                          <DetailItem label="Merek / Brand" value={asset.brand} icon={InfoIcon} />
                          <DetailItem label="PIC / User" value={asset.user} icon={UserIcon} className="col-span-2" />
                          <DetailItem label="Vendor" value={asset.supplier} icon={BuildingIcon} />
                          <DetailItem label="Jumlah Unit" value={`${asset.qty} ITEM`} icon={PackageIcon} />
                          <DetailItem label="Status Sistem" value={asset.status.replace(/_/g, ' ')} icon={HistoryIcon} />

                          <SectionLabel title="Valuasi Finansial" icon={CircleDollarSign} />
                          <DetailItem label="Harga (IDR)" value={formatCurrency(asset.price, 'IDR')} icon={CircleDollarSign} className="col-span-2 bg-primary/5 border-primary/10" />
                          <DetailItem label="Harga (USD)" value={formatCurrency(asset.priceUSD, 'USD')} icon={CircleDollarSign} />
                          <DetailItem label="Nomor PR" value={asset.prNumber} icon={FileTextIcon} />
                          <DetailItem label="Tgl Perolehan" value={formatDate(asset.purchaseDate)} icon={CalendarIcon} />

                          {depreciation && (
                            <div className="col-span-full grid grid-cols-1 md:grid-cols-3 gap-6 mt-4 p-6 rounded-[2.5rem] border-2 border-dashed border-primary/20 bg-white dark:bg-slate-900 shadow-xl text-left">
                              <div className="space-y-1 text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Akumulasi Depresiasi {depreciation.isManual && '(Manual)'}</p>
                                <p className="text-2xl font-black text-rose-600 text-left">{formatCurrency(depreciation.accumulatedDepreciation)}</p>
                              </div>
                              <div className="space-y-1 text-left">
                                <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-left">Nilai Buku Terkini {depreciation.isManual && '(Manual)'}</p>
                                <p className="text-2xl font-black text-emerald-600 text-left">{formatCurrency(depreciation.bookValue)}</p>
                              </div>
                              <div className="space-y-2">
                                <div className="flex justify-between text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">
                                  <span>Persentase Nilai Sisa</span>
                                  <span>{Math.round(depreciation.percentRemaining)}%</span>
                                </div>
                                <Progress value={depreciation.percentRemaining} className="h-2.5 bg-slate-100" />
                              </div>
                            </div>
                          )}

                          <SectionLabel title="Analisis Siklus Hidup" icon={ShieldCheck} />
                          <DetailItem label="Masa Pakai" value={masaPakai} icon={ClockIcon} />
                          <DetailItem label="Ketahanan" value={asset.assetLifetime ? `${asset.assetLifetime} tahun` : '-'} icon={ShieldCheck} />
                          <DetailItem label="Estimasi Habis" value={tanggalHabis ? format(tanggalHabis, 'd MMM yyyy') : '-'} icon={CalendarIcon} />
                          <div className="col-span-2">
                            <DetailItem label="Status Sisa Umur" value={sisaUmur !== null ? <Badge className="rounded-full px-8 py-1.5 font-black text-[10px] uppercase shadow-lg border-none">{sisaUmur > 0 ? `${sisaUmur} TAHUN LAGI` : 'SEGERA DISPOSAL'}</Badge> : '-'} className="h-full justify-center bg-slate-900 dark:bg-slate-800 text-white border-none" dark />
                          </div>
                        </div>

                        <div className={cn(
                            "mt-8 p-6 rounded-[2.5rem] border-2 border-white transition-all duration-700 shadow-xl relative overflow-hidden text-left",
                            deptStyle.bg, deptStyle.text, deptStyle.shadow
                        )}>
                          <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                          <h3 className="text-xl font-black mb-6 flex items-center gap-3 relative z-10 text-left uppercase tracking-tight">
                            <div className="p-2 bg-white/20 rounded-xl border border-white/30 shadow-inner text-left"><Settings2 className="w-6 h-6 text-white" /></div>
                            Rincian Teknis ISO 14064
                          </h3>
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 text-left">
                            <DetailItem label={getAccessoryLabel(1)} value={asset.accessory1} dark />
                            <DetailItem label={getAccessoryLabel(2)} value={asset.accessory2} dark />
                            <DetailItem label={getAccessoryLabel(3)} value={asset.accessory3} dark />
                            <DetailItem label={getAccessoryLabel(4)} value={asset.accessory4} dark />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-8 text-left">
                          <div className="space-y-4 text-left">
                            <SectionLabel title="Arsip Visual" icon={ImageIcon} />
                            {galleryImages.length > 0 ? (
                               <div className="grid grid-cols-2 gap-3 text-left">
                                 {galleryImages.map((url, index) => (
                                   <a key={index} href={url} target="_blank" rel="noopener noreferrer" className="relative aspect-square rounded-[1.5rem] overflow-hidden border-2 border-white shadow-lg hover:scale-105 transition-all text-left">
                                     <Image src={url} alt={`Foto Aset ${index+1}`} fill className="object-cover" />
                                   </a>
                                 ))}
                               </div>
                            ) : (
                                <div className="aspect-video rounded-[2rem] bg-slate-100 dark:bg-slate-900 flex items-center justify-center border-2 border-dashed border-slate-200 text-left">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-left">Tidak Ada Foto</p>
                                </div>
                            )}
                          </div>
                           <div className="space-y-4 text-left">
                            <SectionLabel title="Log & Catatan Audit" icon={FileTextIcon} />
                            <div className="p-6 rounded-[2rem] bg-white dark:bg-slate-900 shadow-inner min-h-[160px] text-xs font-bold text-slate-600 dark:text-slate-300 leading-relaxed whitespace-pre-wrap italic border border-slate-100 dark:border-slate-800 text-left">
                                {asset.notes || 'Sistem belum merekam catatan tambahan untuk aset ini.'}
                            </div>
                          </div>
                           <div className="space-y-4 text-left">
                            <SectionLabel title="Verifikasi Dokumen" icon={ShieldCheck} />
                            <div className="space-y-3 text-left">
                              <DetailItem label="No. Inspeksi" value={asset.inspectionNumber} icon={ShieldCheck} />
                              <DetailItem label="Tanggal Inspeksi" value={formatDate(asset.inspectionDate)} icon={CalendarIcon} />
                              <DetailItem label="No. Inspeksi Proyek" value={asset.projectInspectionNumber} icon={ShieldCheck} />
                              <DetailItem label="Tgl Inspeksi Proyek" value={formatDate(asset.projectInspectionDate)} icon={CalendarIcon} />
                            </div>
                          </div>
                        </div>

                        <div className="mt-12 text-left">
                            <div className="flex items-center gap-3 mb-6 px-1 text-left">
                                <WrenchIcon className="w-6 h-6 text-primary" />
                                <div className="text-left">
                                    <h3 className="text-lg font-black uppercase tracking-tight text-left">Histori Pemeliharaan</h3>
                                    <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-[0.2em] text-left">Industrial Service record</p>
                                </div>
                            </div>
                            {loadingMaintenance ? (
                                <div className="flex items-center gap-3 py-6 text-[10px] font-black text-white/40 animate-pulse text-left">
                                    <Loader2 className="h-4 w-4 animate-spin" /> Sinkronisasi data...
                                </div>
                            ) : maintenanceHistory.length > 0 ? (
                                 <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-left">
                                     {maintenanceHistory.map((m) => {
                                         const mntCode = m.code || (`MNT-${m.id.slice(0, 6).toUpperCase()}`);
                                         return (
                                             <div
                                                 key={m.id}
                                                 onClick={() => setSelectedHistorySchedule(m)}
                                                 className="p-5 rounded-[2rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-md hover:shadow-xl hover:border-emerald-500/50 cursor-pointer transition-all group text-left relative overflow-hidden"
                                             >
                                                 <div className="flex items-center justify-between mb-3 text-left">
                                                     <Badge className="text-[9px] font-black font-mono uppercase px-2.5 py-0.5 rounded-md bg-slate-900 text-emerald-400 border-none shadow-sm">
                                                         {mntCode}
                                                     </Badge>
                                                     <div className="flex items-center gap-1.5">
                                                         <Badge variant={m.status === 'Selesai' ? 'success' : (m.status === 'Ditunda' ? 'destructive' : 'warning')} className="text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-inner border-none text-left">
                                                             {m.status}
                                                         </Badge>
                                                         <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                                     </div>
                                                 </div>
                                                 <p className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tight truncate group-hover:text-primary transition-colors text-left">{m.type}</p>
                                                 <p className="mt-2 text-[10px] text-muted-foreground font-medium line-clamp-2 italic leading-relaxed text-left">"{m.notes || 'Pengerjaan rutin.'}"</p>
                                                 <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between text-[9px] font-black uppercase text-muted-foreground text-left">
                                                     <span className="flex items-center gap-1.5 text-left"><UserIcon className="h-3 w-3 text-primary" /> {m.technician || 'Staff IT/GA'}</span>
                                                     <span className="flex items-center gap-1 text-slate-400 text-left"><CalendarIcon className="w-2.5 h-2.5" /> {formatDate(m.scheduledDate)}</span>
                                                 </div>
                                             </div>
                                         );
                                     })}
                                 </div>
                            ) : (
                                <div className="p-12 rounded-[3rem] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-4 opacity-40 text-left">
                                    <CheckCircle2 className="h-10 w-10 text-emerald-500" />
                                    <div className="space-y-0.5 text-left">
                                        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white text-left">Log Pemeliharaan Bersih</p>
                                        <p className="text-[9px] font-bold text-muted-foreground uppercase text-left">Aset ini belum memiliki riwayat servis digital.</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    </>
                ) : null}
              </div>
            </ScrollArea>

            <DialogFooter className="shrink-0 bg-white/95 dark:bg-slate-950/95 p-4 border-t px-6 sm:px-10 text-left z-30 flex items-center justify-end">
                <Button type="button" variant="outline" className="rounded-full h-10 px-10 w-full sm:w-auto font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(0,0,0,0.1)] hover:translate-y-[1px] active:translate-y-[4px] active:shadow-none transition-all text-left" onClick={() => onOpenChange(false)}>Tutup Detail</Button>
            </DialogFooter>
          </DialogContent>
        </DialogPortal>
      </Dialog>
      {asset && (
        <>
          <AssetForm
              asset={asset}
              isOpen={isAssetFormOpen}
              onOpenChange={setIsAssetFormOpen}
          />
          <MutationForm
              asset={asset}
              isOpen={isMutationFormOpen}
              onOpenChange={setIsMutationFormOpen}
              mutationType={mutationType}
          />
          <AssetCardPreview
              assetId={asset.id}
              isOpen={isPreviewCardOpen}
              onOpenChange={setIsPreviewCardOpen}
          />
        </>
      )}

      {/* Modal Popup Detail Maintenance saat diklik di Histori */}
      <Dialog open={!!selectedHistorySchedule} onOpenChange={(open) => !open && setSelectedHistorySchedule(null)}>
        <DialogContent hideCloseButton className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border-none shadow-2xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-left min-w-0">
              <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <WrenchIcon className="w-5 h-5 shrink-0" />
                <span>Detail Pemeliharaan — {selectedHistorySchedule?.code || (selectedHistorySchedule?.id ? `MNT-${selectedHistorySchedule.id.slice(0, 6).toUpperCase()}` : '')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                Rincian pengerjaan, bukti foto, tanda tangan & dokumen keabsahan
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 h-9 w-9">
                <XIcon className="w-5 h-5" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="mt-2">
            {selectedHistorySchedule && (
              <MaintenanceDetailCard schedule={selectedHistorySchedule} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
