'use client';

/**
 * @fileOverview Komponen Konten ISO 14064.
 * Fitur: Cascading Filters, Multi-select, Sortir, Sinkronisasi, 
 * dan Integrasi kategori Utilitas & Personal.
 * Security: Allowed-Departments based access control.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, getDocs, addDoc, serverTimestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { 
  Popover, 
  PopoverTrigger, 
  PopoverContent 
} from '@/components/ui/popover';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger 
} from '@/components/ui/dialog';
import { 
  Cloud, 
  Factory, 
  Zap, 
  Leaf, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Search, 
  RefreshCw,
  ClipboardCheck,
  Printer,
  X,
  Filter,
  Edit as EditIcon,
  Eye,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  Share2,
  Loader2,
  FileSpreadsheet,
  ChevronDown,
  ShieldCheck,
  Crown
} from 'lucide-react';
import AssetForm from '@/components/assets/asset-form';
import AssetDetailDialog from '@/components/assets/asset-detail-dialog';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import * as XLSX from 'xlsx';

type SortKey = 'code' | 'name' | 'location' | 'scope';

interface MultiSelectFilterProps {
  label: string;
  options: string[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

const MultiSelectFilter = ({ label, options, selectedValues, onChange, placeholder }: MultiSelectFilterProps) => {
  return (
    <div className="space-y-1.5 flex flex-col">
      <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">{label}</label>
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="outline" className="h-10 justify-between bg-background border-slate-200 text-xs font-bold hover:bg-slate-50 overflow-hidden text-left">
            <span className="truncate">
              {selectedValues.length === 0 
                ? (placeholder || `Semua ${label}`) 
                : `${selectedValues.length} ${label} dipilih`}
            </span>
            <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-[250px] p-0 shadow-2xl border-primary/10" align="start">
          <div className="p-2 border-b bg-slate-50 flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih {label}</span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => onChange([])}
              className="h-6 px-2 text-[9px] font-black uppercase text-rose-600 hover:text-rose-700 hover:bg-rose-50"
            >
              Reset
            </Button>
          </div>
          <ScrollArea className="h-64">
            <div className="p-3 space-y-2.5 text-left">
              {options.length > 0 ? options.map((option) => (
                <div key={option} className="flex items-center space-x-2 group">
                  <Checkbox 
                    id={`${label}-${option}`} 
                    checked={selectedValues.includes(option)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        onChange([...selectedValues, option]);
                      } else {
                        onChange(selectedValues.filter(v => v !== option));
                      }
                    }}
                  />
                  <label 
                    htmlFor={`${label}-${option}`} 
                    className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer group-hover:text-primary transition-colors truncate text-left"
                  >
                    {option}
                  </label>
                </div>
              )) : (
                <div className="py-10 text-center text-[10px] font-bold text-muted-foreground uppercase italic opacity-50">
                  Tidak ada opsi tersedia
                </div>
              )}
            </div>
          </ScrollArea>
        </PopoverContent>
      </Popover>
    </div>
  );
};

const isoRelevantCategories = [
  'A3-Peralatan Mesin',
  'A4-Peralatan Listrik',
  'A5-Peralatan Transportasi',
  'A6-Peralatan Penelitian & Uji Lab',
  'A9-Peralatan Lain-lain',
  'Kendaraan',
  'Elektronik'
];

export default function ISO14064Content() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [activeTab, setActiveTab] = useState('all');
  const [companyName, setCompanyName] = useState('PT. China Glaze Indonesia');
  const { user, loading: authLoading } = useAuth();
  
  // Multi-Select Filters
  const [nameFilters, setNameFilters] = useState<string[]>([]);
  const [codeFilter, setCodeFilter] = useState('');
  const [deptFilters, setDeptFilters] = useState<string[]>([]);
  const [categoryFilters, setCategoryFilters] = useState<string[]>([]);
  
  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' | null }>({
    key: 'code',
    direction: 'asc'
  });
  
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [viewDetailId, setViewDetailId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const { toast } = useToast();

  const isoCategories = [
    'A3-Peralatan Mesin',
    'A4-Peralatan Listrik',
    'A5-Peralatan Transportasi',
    'A6-Peralatan Penelitian & Uji Lab',
    'A9-Peralatan Lain-lain',
    'Kendaraan',
    'Elektronik',
    'APAR',
    'CCTV',
    'Utilitas & Kelistrikan',
    'Infrastruktur Gedung'
  ];

  const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

  useEffect(() => {
    if (authLoading || !user) return;

    const constraints = [];
    if (user.role !== 'Admin') {
        const allowed = user.allowedDepartments || [];
        const baseDept = user.department;
        let visible = [...allowed];
        if (baseDept && !visible.includes(baseDept)) visible.push(baseDept);

        const isPrivileged = ['MANAGEMENT', 'ACCOUNTING', 'IT', 'HR & GA'].includes(baseDept || '');
        
        if (!isPrivileged && visible.length > 0) {
            constraints.push(where('location', 'in', visible.slice(0, 30)));
        } else if (!isPrivileged && visible.length === 0) {
            setAssets([]); setLoading(false); return;
        }
    }

    const q = query(
      collection(db, 'assets'),
      where('category', 'in', isoCategories),
      ...constraints
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      const relevantAssets = data.filter(asset => 
        asset.status === 'Aktif' || 
        asset.status === 'Aktif_creation' || 
        asset.status === 'waiting_creation' ||
        asset.status === 'Bukan_Asset_Perusahaan' ||
        (asset.status.startsWith('approved_') && asset.status !== 'approved_disposal')
      );
      setAssets(relevantAssets);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const handleSync = async () => {
    setIsSyncing(true);
    try {
      const snapshot = await getDocs(collection(db, 'assets'));
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      // Re-apply visibility filtering logic here manually if needed, but snapshots handle it.
      toast({ title: 'Sinkronisasi Berhasil' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Sinkronisasi' });
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(prev => {
      if (prev.key === key) {
        if (prev.direction === 'asc') return { key, direction: 'desc' };
        if (prev.direction === 'desc') return { key, direction: null };
        return { key, direction: 'asc' };
      }
      return { key, direction: 'asc' };
    });
  };

  // --- CASCADING FILTERS LOGIC ---
  const dynamicDepartments = useMemo(() => {
    const base = assets.filter(asset => {
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(asset.category);
      const matchName = nameFilters.length === 0 || nameFilters.includes(asset.name);
      return matchCategory && matchName;
    });
    return Array.from(new Set(base.map(a => a.location))).sort();
  }, [assets, categoryFilters, nameFilters]);

  const dynamicCategories = useMemo(() => {
    const base = assets.filter(asset => {
      const matchDept = deptFilters.length === 0 || deptFilters.includes(asset.location);
      const matchName = nameFilters.length === 0 || nameFilters.includes(asset.name);
      return matchDept && matchName;
    });
    return Array.from(new Set(base.map(a => a.category))).sort();
  }, [assets, deptFilters, nameFilters]);

  const dynamicNames = useMemo(() => {
    const base = assets.filter(asset => {
      const matchDept = deptFilters.length === 0 || deptFilters.includes(asset.location);
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(asset.category);
      return matchDept && matchCategory;
    });
    return Array.from(new Set(base.map(a => a.name))).sort();
  }, [assets, deptFilters, categoryFilters]);

  const isScope1 = (asset: Asset) => 
    asset.status !== 'Bukan_Asset_Perusahaan' && 
    (asset.category.includes('Mesin') || asset.category.includes('Transportasi') || asset.category === 'Kendaraan' || asset.category === 'APAR' || asset.category.includes('Penelitian') || asset.category.includes('Lain-lain'));

  const getDynamicLabels = (asset: Asset) => {
    const category = asset.category;
    const name = (asset.name || '').toLowerCase();
    
    const isEmissionISO = category === 'A3-Peralatan Mesin' || category === 'A4-Peralatan Listrik';
    if (isEmissionISO) return { 
      l1: 'Kategori Sumber / Barang (Sumber Emisi)', 
      l2: 'Data aktivitas (volume/tahun)/keterangan', 
      l3: 'Faktor Emisi', 
      l4: 'Sumber Data & Metodologi' 
    };

    const isAC = name.includes('ac') || name.includes('air conditioner') || category === 'Elektronik';
    const isAPAR = category === 'APAR';
    const isCCTV = category === 'CCTV';
    const isUtility = category === 'Utilitas & Kelistrikan' || category === 'Infrastruktur Gedung';

    if (isAC) return { l1: 'Model Unit', l2: 'Refrigeran', l3: 'Volume (KG)', l4: 'kW' };
    if (isAPAR) return { l1: 'Berat (kg)', l2: 'Media', l3: 'Exp Date', l4: 'Posisi' };
    if (isCCTV) return { l1: 'IP Address', l2: 'Model', l3: 'Resolusi', l4: 'Channel' };
    if (isUtility) return { l1: 'Daya (W/VA)', l2: 'Spesifikasi', l3: 'Tgl Pasang', l4: 'Area' };
    if (isoRelevantCategories.includes(category)) return { l1: 'Model / Serial Number', l2: 'Tipe / Jenis Unit', l3: 'Jenis Fuel / Energy', l4: 'Volume / Kapasitas' };
    
    return { l1: 'Model (SN)', l2: 'Tipe Unit', l3: 'Fuel/Refrig', l4: 'Volume/Cap' };
  };

  const filteredAssets = useMemo(() => {
    let result = assets.filter(asset => {
      const matchName = nameFilters.length === 0 || nameFilters.includes(asset.name);
      const matchCode = asset.code.toLowerCase().includes(codeFilter.toLowerCase());
      const matchDept = deptFilters.length === 0 || deptFilters.includes(asset.location);
      const matchCategory = categoryFilters.length === 0 || categoryFilters.includes(asset.category);
      
      return matchName && matchCode && matchDept && matchCategory;
    });

    if (sortConfig.direction) {
      result.sort((a, b) => {
        let valA: any = '';
        let valB: any = '';

        switch (sortConfig.key) {
          case 'code': valA = a.code; valB = b.code; break;
          case 'name': valA = a.name; valB = b.name; break;
          case 'location': valA = a.location; valB = b.location; break;
          case 'scope': valA = isScope1(a) ? 1 : 2; valB = isScope1(b) ? 1 : 2; break;
        }

        if (typeof valA === 'string') {
          return sortConfig.direction === 'asc' ? valA.localeCompare(valB) : valB.localeCompare(valA);
        } else {
          return sortConfig.direction === 'asc' ? (valA - valB) : (valB - valA);
        }
      });
    }

    return result;
  }, [assets, nameFilters, codeFilter, deptFilters, categoryFilters, sortConfig]);

  const categorizedAssets = useMemo(() => {
    return {
      scope1: filteredAssets.filter(a => isScope1(a)),
      scope2: filteredAssets.filter(a => !isScope1(a) && a.status !== 'Bukan_Asset_Perusahaan' && !utilityCategories.includes(a.category)),
      utility: filteredAssets.filter(a => utilityCategories.includes(a.category) && a.status !== 'Bukan_Asset_Perusahaan'),
      personal: filteredAssets.filter(a => a.status === 'Bukan_Asset_Perusahaan'),
    };
  }, [filteredAssets]);

  const handleEditClick = (asset: Asset) => {
    setSelectedAsset(asset);
    setIsEditOpen(true);
  };

  const handleViewDetail = (asset: Asset) => {
    setViewDetailId(asset.id);
    setIsDetailOpen(true);
  };

  const resetFilters = () => {
    setNameFilters([]);
    setCodeFilter('');
    setDeptFilters([]);
    setCategoryFilters([]);
    setSortConfig({ key: 'code', direction: 'asc' });
  };

  const handleExportExcel = () => {
    let assetsToExport: Asset[] = [];
    let scopeTitle = "Semua Inventaris";

    if (activeTab === 'scope1') { assetsToExport = categorizedAssets.scope1; scopeTitle = "Scope 1"; }
    else if (activeTab === 'scope2') { assetsToExport = categorizedAssets.scope2; scopeTitle = "Scope 2"; }
    else if (activeTab === 'utility') { assetsToExport = categorizedAssets.utility; scopeTitle = "Utilitas"; }
    else if (activeTab === 'personal') { assetsToExport = categorizedAssets.personal; scopeTitle = "Personal"; }
    else { assetsToExport = filteredAssets; }

    if (assetsToExport.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
      return;
    }

    const dataToExport = assetsToExport.map((asset, index) => {
      const scope = asset.status === 'Bukan_Asset_Perusahaan' ? 'Personal' : (isScope1(asset) ? 'Scope 1' : 'Scope 2');
      const labels = getDynamicLabels(asset);

      return {
        'No': index + 1,
        'Kode Aset': asset.code,
        'Nama Barang': asset.name,
        'Kategori': asset.category,
        'Lokasi': asset.location,
        'Scope / Status': scope,
        'Merek': asset.brand || '-',
        [labels.l1]: asset.accessory1 || '-',
        [labels.l2]: asset.accessory2 || '-',
        [labels.l3]: asset.accessory3 || '-',
        [labels.l4]: asset.accessory4 || '-',
        'Tautan Verifikasi': `${window.location.origin}/public/asset?assetId=${asset.id}`,
        'URL Foto Fisik': asset.photoURL || '',
        'Catatan': asset.notes || '-',
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(dataToExport);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Inventaris ISO');

    worksheet['!cols'] = [
        { wch: 5 }, { wch: 15 }, { wch: 35 }, { wch: 20 }, { wch: 20 }, { wch: 15 }, 
        { wch: 15 }, { wch: 25 }, { wch: 25 }, { wch: 25 }, { wch: 20 }, { wch: 50 }, 
        { wch: 50 }, { wch: 40 },
    ];

    XLSX.writeFile(workbook, `Laporan_ISO_14064_${scopeTitle.replace(/\s/g, '_')}_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    toast({ title: 'Ekspor Berhasil', description: `Data ${scopeTitle} telah diekspor ke Excel.` });
  };

  const handleShareReport = async () => {
    let assetsToShare: Asset[] = [];
    let scopeTitle = "Semua Inventaris";

    if (activeTab === 'scope1') { assetsToShare = categorizedAssets.scope1; scopeTitle = "Scope 1"; }
    else if (activeTab === 'scope2') { assetsToShare = categorizedAssets.scope2; scopeTitle = "Scope 2"; }
    else if (activeTab === 'utility') { assetsToShare = categorizedAssets.utility; scopeTitle = "Utilitas"; }
    else if (activeTab === 'personal') { assetsToShare = categorizedAssets.personal; scopeTitle = "Personal"; }
    else { assetsToShare = filteredAssets; }

    if (assetsToShare.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data" });
      return;
    }

    setIsSharing(true);
    try {
      const reportData = {
        title: `Laporan Inventaris ISO 14064 - ${scopeTitle}`,
        type: 'ISO_EMISSION',
        assets: assetsToShare.map(a => ({
          code: a.code,
          name: a.name,
          category: a.category,
          location: a.location,
          photoURL: a.photoURL || '',
          details: {
            brand: a.brand || '-',
            accessory1: a.accessory1 || '-',
            accessory2: a.accessory2 || '-',
            accessory3: a.accessory3 || '-',
            accessory4: a.accessory4 || '-'
          }
        })),
        createdAt: serverTimestamp(),
      };

      const reportRef = await addDoc(collection(db, 'public_reports'), reportData);
      const publicUrl = `${window.location.origin}/public/iso?s=${reportRef.id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({ title: reportData.title, text: `Lihat laporan inventaris resmi ${companyName}:`, url: publicUrl });
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

  const getSortIcon = (key: SortKey) => {
    if (sortConfig.key !== key) return <ArrowUpDown className="h-3 w-3 opacity-50" />;
    if (sortConfig.direction === 'asc') return <ArrowUp className="h-3 w-3 text-primary" />;
    if (sortConfig.direction === 'desc') return <ArrowDown className="h-3 w-3 text-primary" />;
    return <ArrowUpDown className="h-3 w-3 opacity-50" />;
  };

  const renderTable = (data: Asset[]) => (
    <div className="rounded-xl border border-slate-100 dark:border-slate-800 overflow-hidden bg-background shadow-[0_2px_8px_rgba(0,0,0,0.01)] text-black">
      <Table>
        <TableHeader className="bg-slate-50/50 dark:bg-slate-900/20 h-11">
          <TableRow>
            <TableHead className="pl-6 w-[110px] cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('code')}><div className="flex items-center gap-1 font-black uppercase text-[9px] tracking-widest text-left">Kode{getSortIcon('code')}</div></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('name')}><div className="flex items-center gap-1 font-black uppercase text-[9px] tracking-widest text-left">Nama Barang{getSortIcon('name')}</div></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('location')}><div className="flex items-center gap-1 font-black uppercase text-[9px] tracking-widest text-left">Lokasi{getSortIcon('location')}</div></TableHead>
            <TableHead className="cursor-pointer hover:bg-muted/80 transition-colors" onClick={() => handleSort('scope')}><div className="flex items-center gap-1 font-black uppercase text-[9px] tracking-widest text-left">Scope{getSortIcon('scope')}</div></TableHead>
            <TableHead className="w-[420px] font-black uppercase text-[9px] tracking-widest text-left">Detail Kelengkapan Standar</TableHead>
            <TableHead className="font-black uppercase text-[9px] tracking-widest text-left">Foto</TableHead>
            <TableHead className="text-right pr-6 font-black uppercase text-[9px] tracking-widest">Aksi</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length > 0 ? data.map((asset) => {
            const scope1 = isScope1(asset);
            const isPersonal = asset.status === 'Bukan_Asset_Perusahaan';
            const isUtility = utilityCategories.includes(asset.category);
            const labels = getDynamicLabels(asset);
            
            let rowColorClass = "";
            if (isPersonal) {
                rowColorClass = "bg-violet-50/40 dark:bg-violet-950/10 hover:bg-violet-100/50 dark:hover:bg-violet-900/20 text-violet-950 dark:text-violet-100 border-violet-100/30";
            } else if (isUtility) {
                rowColorClass = "bg-emerald-50/40 dark:bg-emerald-950/10 hover:bg-emerald-100/50 dark:hover:bg-emerald-900/20 text-emerald-950 dark:text-emerald-100 border-emerald-100/30";
            } else if (scope1) {
                rowColorClass = "bg-blue-50/40 dark:bg-blue-950/10 hover:bg-blue-100/50 dark:hover:bg-blue-900/20 text-blue-950 dark:text-blue-100 border-blue-100/30";
            } else {
                rowColorClass = "bg-amber-50/40 dark:bg-amber-950/10 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 text-amber-950 dark:text-amber-100 border-amber-100/30";
            }

            return (
              <TableRow key={asset.id} className={cn("transition-colors h-16", rowColorClass)}>
                <TableCell className="pl-6 font-mono font-bold text-[10px] text-primary text-left">{asset.code}</TableCell>
                <TableCell><div className="flex flex-col text-left"><span className="font-bold text-xs uppercase text-left">{asset.name}</span><span className="text-[9px] opacity-70 uppercase font-bold text-left">{asset.category}</span></div></TableCell>
                <TableCell className="text-[10px] font-bold uppercase opacity-85 text-left">{asset.location}</TableCell>
                <TableCell>
                    <div className="flex items-center justify-start text-left">
                        {isPersonal ? (
                            <Badge variant="outline" className="bg-violet-500/20 text-violet-700 dark:text-violet-300 border-none font-bold text-[9px] uppercase"><Crown className="h-2.5 w-2.5 mr-1" /> Personal</Badge>
                        ) : isUtility ? (
                            <Badge variant="outline" className="bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none font-bold text-[9px] uppercase"><Leaf className="h-2.5 w-2.5 mr-1" /> Utilitas</Badge>
                        ) : scope1 ? (
                            <Badge variant="default" className="bg-blue-600 text-white font-bold text-[9px] uppercase">Scope 1</Badge>
                        ) : (
                            <Badge variant="outline" className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-none font-bold text-[9px] uppercase">Scope 2</Badge>
                        )}
                    </div>
                </TableCell>
                <TableCell>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-[9px] text-left">
                        <div className="flex gap-2 min-w-0 text-left"><span className="text-muted-foreground uppercase tracking-tighter shrink-0">Merek:</span><span className="font-bold truncate">{asset.brand || '-'}</span></div>
                        <div className="flex gap-2 min-w-0 text-left"><span className="text-muted-foreground uppercase tracking-tighter shrink-0">{labels.l1}:</span><span className="font-bold truncate">{asset.accessory1 || '-'}</span></div>
                        <div className="flex gap-2 min-w-0 text-left"><span className="text-muted-foreground uppercase tracking-tighter shrink-0">{labels.l2}:</span><span className="font-bold truncate">{asset.accessory2 || '-'}</span></div>
                        <div className="flex gap-2 min-w-0 text-left"><span className="text-muted-foreground uppercase tracking-tighter shrink-0">{labels.l3}:</span><span className="font-bold truncate">{asset.accessory3 || '-'}</span></div>
                    </div>
                </TableCell>
                <TableCell>
                    <div className="flex justify-start text-left">
                        {asset.photoURL ? (
                            <Dialog>
                                <DialogTrigger asChild>
                                    <div className="relative h-10 w-10 rounded-lg border overflow-hidden cursor-pointer hover:ring-2 hover:ring-primary transition-all shadow-sm bg-white">
                                        <Image src={asset.photoURL} alt="Thumbnail" fill className="object-cover" />
                                    </div>
                                </DialogTrigger>
                                <DialogContent className="max-w-3xl bg-slate-900 border-slate-800">
                                    <DialogHeader className="sr-only">
                                        <DialogTitle>Foto Aset: {asset.name}</DialogTitle>
                                        <DialogDescription>Tampilan diperbesar dari foto fisik aset {asset.name}.</DialogDescription>
                                    </DialogHeader>
                                    <div className="relative aspect-video w-full rounded-2xl overflow-hidden">
                                        <Image src={asset.photoURL} alt={asset.name} fill className="object-contain" />
                                    </div>
                                </DialogContent>
                            </Dialog>
                        ) : <div className="h-10 w-10 rounded-lg border bg-muted flex items-center justify-center text-[8px] text-muted-foreground uppercase font-bold text-center">NO PIC</div>}
                    </div>
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="flex justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => handleViewDetail(asset)} className="h-8 w-8 rounded-lg text-blue-600 hover:text-blue-700 hover:bg-blue-50"><Eye className="h-3.5 w-3.5" /></Button>
                    <Button variant="ghost" size="icon" onClick={() => handleEditClick(asset)} className="h-8 w-8 rounded-lg"><EditIcon className="h-3.5 w-3.5" /></Button>
                  </div>
                </TableCell>
              </TableRow>
            );
          }) : <TableRow><TableCell colSpan={7} className="h-40 text-center"><Info className="h-8 w-8 mx-auto text-muted-foreground opacity-20 mb-2" /><p className="font-bold uppercase tracking-widest text-xs opacity-30">Tidak ada data terizin ditemukan</p></TableCell></TableRow>}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10 text-black">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1 text-left">
          <div className="flex items-center gap-2 mb-1 text-left">
            <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 font-black text-[9px] uppercase tracking-widest px-3 h-5">
                <ShieldCheck className="h-2.5 w-2.5 mr-1" /> Standard ISO Verified
            </Badge>
            <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 font-black text-[9px] uppercase tracking-widest px-3 h-5">
                Akses Terkendali
            </Badge>
          </div>
          <h1 className="text-3xl font-black tracking-tight flex items-center gap-2 text-slate-900 dark:text-white uppercase italic text-left">ISO 14064 Compliance</h1>
          <p className="text-sm text-muted-foreground font-medium text-left">Monitoring & Verifikasi Inventaris GRK untuk unit kerja yang Anda kelola.</p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button variant="outline" onClick={handleSync} disabled={isSyncing} className="rounded-xl h-11 border-slate-200 font-bold bg-white text-black">{isSyncing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <RefreshCw className="mr-2 h-4 w-4" />} Sinkron</Button>
          <Button onClick={handleShareReport} variant="outline" disabled={isSharing} className="rounded-xl h-11 border-indigo-200 text-indigo-700 hover:bg-indigo-50 font-bold">{isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Bagikan</Button>
          <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 rounded-xl border border-slate-100 shadow-sm">
            <Button 
                onClick={handleExportExcel} 
                className="h-10 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-emerald-600/20 active:translate-y-[1px] active:shadow-none transition-all px-6"
            >
                <FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel
            </Button>
            <Button onClick={() => window.print()} className="bg-blue-600 hover:bg-blue-700 text-white shadow-lg h-10 px-6 font-black uppercase text-[10px] tracking-widest"><Printer className="mr-2 h-4 w-4" /> PDF</Button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
        <Card className="border border-blue-100 dark:border-blue-900/30 bg-blue-50/50 dark:bg-blue-950/10 text-blue-900 dark:text-blue-100 rounded-2xl border-b-4 border-b-blue-500/70 dark:border-b-blue-800/80 shadow-md"><CardHeader className="pb-1 p-4"><CardTitle className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-70 text-left"><Factory className="w-3.5 h-3.5" /> Scope 1</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-left"><div className="text-2xl font-black text-left">{categorizedAssets.scope1.length} <span className="text-[10px] font-bold opacity-60 ml-1">ITEM</span></div></CardContent></Card>
        <Card className="border border-amber-100 dark:border-amber-900/30 bg-amber-50/50 dark:bg-amber-950/10 text-amber-900 dark:text-amber-100 rounded-2xl border-b-4 border-b-amber-500/70 dark:border-b-amber-800/80 shadow-md"><CardHeader className="pb-1 p-4"><CardTitle className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-70 text-left"><Zap className="w-3.5 h-3.5" /> Scope 2</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-left"><div className="text-2xl font-black text-left">{categorizedAssets.scope2.length} <span className="text-[10px] font-bold opacity-60 ml-1">ITEM</span></div></CardContent></Card>
        <Card className="border border-emerald-100 dark:border-emerald-900/30 bg-emerald-50/50 dark:bg-emerald-950/10 text-emerald-900 dark:text-emerald-100 rounded-2xl border-b-4 border-b-emerald-500/70 dark:border-b-emerald-800/80 shadow-md"><CardHeader className="pb-1 p-4"><CardTitle className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-70 text-left"><Leaf className="w-3.5 h-3.5" /> Utilitas</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-left"><div className="text-2xl font-black text-left">{categorizedAssets.utility.length} <span className="text-[10px] font-bold opacity-60 ml-1">FASILITAS</span></div></CardContent></Card>
        <Card className="border border-violet-100 dark:border-violet-900/30 bg-violet-50/50 dark:bg-violet-950/10 text-violet-900 dark:text-violet-100 rounded-2xl border-b-4 border-b-violet-500/70 dark:border-b-violet-800/80 shadow-md"><CardHeader className="pb-1 p-4"><CardTitle className="text-[9px] font-black uppercase tracking-wider flex items-center gap-1.5 opacity-70 text-left"><Crown className="w-3.5 h-3.5" /> Personal</CardTitle></CardHeader><CardContent className="p-4 pt-0 text-left"><div className="text-2xl font-black text-violet-900 dark:text-violet-100 text-left">{categorizedAssets.personal.length} <span className="text-[10px] font-bold opacity-60 ml-1">PRIVAT</span></div></CardContent></Card>
      </div>

      <Card className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white/40 dark:bg-slate-900/40 backdrop-blur-md shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <CardHeader className="p-5 sm:p-6 pb-4 border-b border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-5">
            <div className="flex items-center gap-2 text-left">
                <Filter className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-black uppercase tracking-wider text-left text-black dark:text-white">Audit Matrix</h3>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
              <MultiSelectFilter label="Departemen Unit" options={dynamicDepartments} selectedValues={deptFilters} onChange={setDeptFilters} />
              <MultiSelectFilter label="Kategori Standar" options={dynamicCategories} selectedValues={categoryFilters} onChange={setCategoryFilters} />
              <MultiSelectFilter label="Nama Aset" options={dynamicNames} selectedValues={nameFilters} onChange={setNameFilters} />
              <div className="space-y-1.5 text-left"><Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Identitas Kode</Label><div className="relative"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" /><Input placeholder="Cari..." value={codeFilter} onChange={(e) => setCodeFilter(e.target.value)} className="h-10 pl-9 bg-background border-slate-200 rounded-xl font-bold text-xs text-black" /></div></div>
              <div className="flex items-end pb-0.5"><Button variant="ghost" onClick={resetFilters} className="text-rose-600 hover:text-rose-700 h-10 w-full font-black uppercase text-[10px] tracking-widest"><X className="w-4 h-4 mr-2" /> Reset Matrix</Button></div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-5 sm:p-6 text-black">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-xl mb-6 h-auto flex flex-wrap gap-1 shadow-inner">
              <TabsTrigger value="all" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-wider py-2">Semua ({filteredAssets.length})</TabsTrigger>
              <TabsTrigger value="scope1" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-wider py-2">Scope 1 ({categorizedAssets.scope1.length})</TabsTrigger>
              <TabsTrigger value="scope2" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-wider py-2">Scope 2 ({categorizedAssets.scope2.length})</TabsTrigger>
              <TabsTrigger value="utility" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-wider py-2">Utilitas ({categorizedAssets.utility.length})</TabsTrigger>
              <TabsTrigger value="personal" className="flex-1 rounded-lg font-bold text-[10px] uppercase tracking-wider py-2">Personal ({categorizedAssets.personal.length})</TabsTrigger>
            </TabsList>
            <TabsContent value="all" className="mt-0">{renderTable(filteredAssets)}</TabsContent>
            <TabsContent value="scope1" className="mt-0">{renderTable(categorizedAssets.scope1)}</TabsContent>
            <TabsContent value="scope2" className="mt-0">{renderTable(categorizedAssets.scope2)}</TabsContent>
            <TabsContent value="utility" className="mt-0">{renderTable(categorizedAssets.utility)}</TabsContent>
            <TabsContent value="personal" className="mt-0">{renderTable(categorizedAssets.personal)}</TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {selectedAsset && <AssetForm asset={selectedAsset} isOpen={isEditOpen} onOpenChange={setIsEditOpen} />}
      {viewDetailId && <AssetDetailDialog assetId={viewDetailId} isOpen={isDetailOpen} onOpenChange={setIsDetailOpen} />}
    </div>
  );
}
