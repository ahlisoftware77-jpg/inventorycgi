'use client';

/**
 * @fileOverview Komponen Laporan Aset Terpadu (Premium).
 * Fitur: 
 * 1. Laporan Valuasi: Monitoring penyusutan dan nilai buku aset.
 * 2. Laporan Riwayat (Audit Trail): Tracking detail mutasi, perbaikan (maintenance), dan perubahan status.
 * Security: Departement-based and Allowed-Depts based access control implemented.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, where, orderBy, Timestamp, limit, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type SystemLog, type MaintenanceSchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  FileText, 
  Printer, 
  FileSpreadsheet, 
  Search, 
  Filter, 
  CheckCircle2, 
  ShieldCheck, 
  Activity,
  Package,
  CircleDollarSign,
  TrendingUp,
  History,
  Wrench,
  ArrowRightLeft,
  Trash2,
  User,
  Clock,
  MapPin,
  Loader2,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Tag,
  Crown
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { calculateDepreciation } from '@/lib/calculations';
import { useAuth } from '@/hooks/use-auth';

const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

const StatCard = ({ title, value, emoji, subValue }: { title: string, value: string | number, emoji: string, subValue?: string }) => (
    <Card className="border border-slate-100 dark:border-slate-800/80 rounded-xl bg-white/40 dark:bg-slate-900/20 shadow-sm text-left transition-all duration-300 hover:scale-[1.01]">
        <CardContent className="p-4 flex flex-col justify-between h-full">
            <div className="flex items-center justify-between">
                <span className="text-lg select-none">{emoji}</span>
                {subValue && <span className="text-[8px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest bg-slate-100 dark:bg-slate-900/50 px-2 py-0.5 rounded">{subValue}</span>}
            </div>
            <div className="mt-2.5">
                <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">{title}</p>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-1 leading-none">{value}</h3>
            </div>
        </CardContent>
    </Card>
);

interface UnifiedHistoryEvent {
    id: string;
    assetId: string;
    assetCode: string;
    assetName: string;
    type: 'MUTATION' | 'MAINTENANCE' | 'DISPOSAL' | 'CREATION' | 'STATUS_CHANGE';
    date: Date;
    actor: string;
    department: string;
    description: string;
    status?: string;
}

export default function AssetReport() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [maintenanceLogs, setMaintenanceLogs] = useState<MaintenanceSchedule[]>([]);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  
  const [loading, setLoading] = useState(true);
  const [activeReportTab, setActiveReportTab] = useState('valuation');
  
  const [searchTerm, setSearchTerm] = useState('');
  const [ownershipFilter, setOwnershipFilter] = useState<string>('ALL');
  const [seriesFilter, setSeriesFilter] = useState<string>('ALL');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  
  const { toast } = useToast();
  const { user } = useAuth();

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    setLoading(true);
    
    // Listen to Company Identity
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) {
          setCompanyName(snap.data().companyName);
        }
    });

    // Listen to Assets
    const unsubAssets = onSnapshot(query(collection(db, 'assets')), (snap) => {
      setAllAssets(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset)));
    });

    // Listen to System Logs (for mutations, disposals, etc)
    const unsubLogs = onSnapshot(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(1000)), (snap) => {
      setSystemLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog)));
    });

    // Listen to Maintenance Schedules (technical history)
    const unsubMaint = onSnapshot(query(collection(db, 'maintenance_schedules'), orderBy('scheduledDate', 'desc')), (snap) => {
      setMaintenanceLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule)));
    });

    const timer = setTimeout(() => setLoading(false), 1500);

    return () => {
        unsubGen();
        unsubAssets();
        unsubLogs();
        unsubMaint();
        clearTimeout(timer);
    };
  }, []);

  const dynamicLocations = useMemo(() => {
    const locations = Array.from(new Set(allAssets.map(a => a.location))).sort();
    
    // Filter dropdown locations based on user permissions
    const isPrivilegedDept = ['MANAGEMENT', 'HR & GA', 'ACCOUNTING', 'IT'].includes(user?.department || '');
    
    if (!isAdmin && !isPrivilegedDept && user?.department) {
        let allowedDepts = user.allowedDepartments || [];
        if (user.department && !allowedDepts.includes(user.department)) {
            allowedDepts = [...allowedDepts, user.department];
        }

        // Ekspansi grup departemen standar
        if (allowedDepts.includes('APP')) allowedDepts.push('APP-R&D');
        if (allowedDepts.includes('R&D')) allowedDepts.push('APP', 'APP-R&D', 'QC', 'LAB');
        if (allowedDepts.includes('PPIC')) allowedDepts.push('MAINTENANCE');
        if (allowedDepts.includes('MIXER')) allowedDepts.push('TINTA');
        
        return locations.filter(l => allowedDepts.includes(l));
    }
    
    return locations;
  }, [allAssets, user, isAdmin]);

  const filteredAssets = useMemo(() => {
    return allAssets.filter(asset => {
      // 1. Department Access Control Logic (Hormati Allowed Departments)
      const isPrivilegedDept = ['MANAGEMENT', 'HR & GA', 'ACCOUNTING', 'IT'].includes(user?.department || '');
      
      if (!isAdmin && !isPrivilegedDept && user?.department) {
          let allowedDepts = user.allowedDepartments || [];
          if (user.department && !allowedDepts.includes(user.department)) {
              allowedDepts = [...allowedDepts, user.department];
          }

          // Ekspansi grup
          if (allowedDepts.includes('APP')) allowedDepts.push('APP-R&D');
          if (allowedDepts.includes('R&D')) allowedDepts.push('APP', 'APP-R&D', 'QC', 'LAB');
          if (allowedDepts.includes('PPIC')) allowedDepts.push('MAINTENANCE');
          if (allowedDepts.includes('MIXER')) allowedDepts.push('TINTA');

          if (!allowedDepts.includes(asset.location)) {
              return false;
          }
      }

      // 2. Search & UI Filters
      const searchMatch = !searchTerm || 
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
        asset.code.toLowerCase().includes(searchTerm.toLowerCase());
      
      const ownershipMatch = ownershipFilter === 'ALL' || 
        (ownershipFilter === 'COMPANY' && asset.status !== 'Bukan_Asset_Perusahaan') ||
        (ownershipFilter === 'PERSONAL' && asset.status === 'Bukan_Asset_Perusahaan');
      
      const isUtility = utilityCategories.includes(asset.category);

      const seriesMatch = seriesFilter === 'ALL' ||
        (seriesFilter === 'A' && asset.category.startsWith('A') && !isUtility) ||
        (seriesFilter === 'B' && !asset.category.startsWith('A') && !isUtility);
      
      const locationMatch = locationFilter === 'ALL' || asset.location === locationFilter;

      return searchMatch && ownershipMatch && seriesMatch && locationMatch;
    });
  }, [allAssets, searchTerm, ownershipFilter, seriesFilter, locationFilter, user, isAdmin]);

  // --- UNIFIED HISTORY LOGIC ---
  const detailedHistory = useMemo(() => {
    const events: UnifiedHistoryEvent[] = [];
    const assetIdSet = new Set(filteredAssets.map(a => a.id));

    // 1. Process System Logs (Creation, Mutation, Condition, etc)
    systemLogs.forEach(log => {
        if (!log.targetId || !assetIdSet.has(log.targetId)) return;

        let type: UnifiedHistoryEvent['type'] = 'STATUS_CHANGE';
        if (log.action.includes('CREATE')) type = 'CREATION';
        else if (log.action.includes('MUTATION')) type = 'MUTATION';
        else if (log.action.includes('DISPOSAL')) type = 'DISPOSAL';

        events.push({
            id: log.id,
            assetId: log.targetId,
            assetCode: log.targetCode || '-',
            assetName: log.targetName || '-',
            type,
            date: log.timestamp.toDate(),
            actor: log.userName,
            department: log.userDept,
            description: log.description
        });
    });

    // 2. Process Maintenance Logs (Service, Repair)
    maintenanceLogs.forEach(m => {
        if (!m.assetId || !assetIdSet.has(m.assetId)) return;

        events.push({
            id: m.id,
            assetId: m.assetId,
            assetCode: m.assetCode,
            assetName: m.assetName,
            type: 'MAINTENANCE',
            date: m.scheduledDate.toDate(),
            actor: m.technician || 'Staff IT/GA',
            department: m.department,
            description: `[${m.type}] ${m.notes || 'Pengerjaan rutin.'}`,
            status: m.status
        });
    });

    return events.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [filteredAssets, systemLogs, maintenanceLogs]);

  const stats = useMemo(() => {
    const totalCount = filteredAssets.length;
    const totalQty = filteredAssets.reduce((sum, a) => sum + (a.qty || 0), 0);
    const totalValIDR = filteredAssets.reduce((sum, a) => sum + (a.price || 0), 0);
    
    const totalBookValueIDR = filteredAssets.reduce((sum, a) => {
        const dep = calculateDepreciation(a.price, a.purchaseDate, a.assetLifetime);
        return sum + (dep ? dep.bookValue : a.price);
    }, 0);

    const personalCount = filteredAssets.filter(a => a.status === 'Bukan_Asset_Perusahaan').length;
    
    return {
      totalCount,
      totalQty,
      valIDR: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalValIDR),
      bookValIDR: new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(totalBookValueIDR),
      personalCount,
      historyCount: detailedHistory.length,
      readiness: totalCount > 0 ? Math.round(((totalCount - personalCount) / totalCount) * 100) : 0
    };
  }, [filteredAssets, detailedHistory]);

  const handleExportExcel = () => {
    if (activeReportTab === 'valuation') {
        if (filteredAssets.length === 0) return;
        const data = filteredAssets.map((a, idx) => {
            const dep = calculateDepreciation(a.price, a.purchaseDate, a.assetLifetime);
            return {
                'No': idx + 1,
                'Kode Aset': a.code,
                'Nama Aset': a.name,
                'Kategori': a.category,
                'Lokasi': a.location,
                'Kepemilikan': a.status === 'Bukan_Asset_Perusahaan' ? 'Personal' : 'Perusahaan',
                'Kondisi': a.condition,
                'Harga Perolehan': a.price,
                'Akumulasi Penyusutan': dep?.accumulatedDepreciation || 0,
                'Nilai Buku': dep?.bookValue || a.price,
                'User': a.user || '-',
            };
        });
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Valuasi');
        XLSX.writeFile(wb, `Valuasi_Aset_CGI_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    } else {
        if (detailedHistory.length === 0) return;
        const data = detailedHistory.map((h, idx) => ({
            'No': idx + 1,
            'Tanggal': format(h.date, 'dd/MM/yyyy HH:mm'),
            'Kode Aset': h.assetCode,
            'Nama Aset': h.assetName,
            'Tipe Aktivitas': h.type,
            'Pelaku (Actor)': h.actor,
            'Dept. Pelaku': h.department,
            'Deskripsi Histori': h.description,
            'Status': h.status || 'Selesai'
        }));
        const ws = XLSX.utils.json_to_sheet(data);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'History Detail');
        XLSX.writeFile(wb, `History_Aset_CGI_${format(new Date(), 'yyyyMMdd')}.xlsx`);
    }
    toast({ title: 'Export Berhasil' });
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    let content = '';
    const dateStr = format(new Date(), 'dd MMMM yyyy', { locale: localeID });

    if (activeReportTab === 'valuation') {
        const rows = filteredAssets.map((a, i) => {
            const dep = calculateDepreciation(a.price, a.purchaseDate, a.assetLifetime);
            return `<tr><td>${i+1}</td><td>${a.code}</td><td>${a.name}</td><td style="text-align:right;">${new Intl.NumberFormat('id-ID').format(a.price)}</td><td style="text-align:right;">${new Intl.NumberFormat('id-ID').format(dep?.bookValue || a.price)}</td><td>${a.condition}</td><td>${a.location}</td></tr>`;
        }).join('');
        content = `<h2>Laporan Valuasi & Nilai Buku Aset</h2><p>Total Aset: ${stats.totalCount} | Total Nilai Buku: ${stats.bookValIDR}</p><table><thead><tr><th>No</th><th>Kode</th><th>Nama</th><th>Perolehan</th><th>Nilai Buku</th><th>Kondisi</th><th>Lokasi</th></tr></thead><tbody>${rows}</tbody></table>`;
    } else {
        const rows = detailedHistory.map((h, i) => `<tr><td>${i+1}</td><td>${format(h.date, 'dd/MM/yy HH:mm')}</td><td><b>${h.assetCode}</b></td><td>${h.assetName}</td><td><span style="font-weight:bold; font-size:8pt;">${h.type}</span></td><td>${h.actor} (${h.department})</td><td>${h.description}</td></tr>`).join('');
        content = `<h2>Laporan Audit Trail (Histori Detail Aset)</h2><p>Total Aktivitas Tercatat: ${stats.historyCount} Kejadian</p><table><thead><tr><th>No</th><th>Waktu</th><th>Kode</th><th>Aset</th><th>Tipe</th><th>PIC</th><th>Deskripsi</th></tr></thead><tbody>${rows}</tbody></table>`;
    }

    const html = `<html><head><title>Report - CGI</title><style>body { font-family: sans-serif; padding: 30px; font-size: 10pt; } table { width: 100%; border-collapse: collapse; margin-top: 20px; } th, td { border: 1px solid #ccc; padding: 8px; text-align: left; } th { background: #f4f4f4; } h2 { text-transform: uppercase; color: #1e40af; border-bottom: 2px solid #1e40af; padding-bottom: 10px; } @media print { @page { size: landscape; margin: 1cm; } }</style></head><body><div style="display:flex; justify-content:space-between; align-items:center;"><div><h1 style="margin:0; font-size:18pt;">${companyName}</h1><p style="margin:0; opacity:0.6;">Integrated Asset Audit & Valuation System</p></div><div><p><b>Tanggal:</b> ${dateStr}</p></div></div>${content}</body></html>`;

    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="space-y-5 animate-in fade-in duration-700 pb-10 text-black">
      {/* Hero Section */}
      <div className="relative p-8 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-black tracking-tight uppercase text-white text-left">Master Reporting</h1>
                        <p className="text-primary/60 font-medium text-sm text-left">Laporan audit, valuasi, dan rekaman histori aset terpusat.</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5">
                <Button onClick={handlePrint} className="rounded-xl h-9 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                    <Printer className="mr-1.5 h-3.5 w-3.5 text-white" /> Cetak PDF
                </Button>
                <Button 
                    onClick={handleExportExcel} 
                    className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center"
                >
                    <FileSpreadsheet className="mr-1.5 h-3.5 w-3.5" /> Export Excel
                </Button>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-3 text-left">
        <StatCard title="Total Item" value={stats.totalCount} emoji="📦" />
        <StatCard title="Nilai Buku" value={stats.bookValIDR} emoji="📈" subValue="Valuation" />
        <StatCard title="Aset Personal" value={stats.personalCount} emoji="👑" />
        <StatCard title="Kejadian Log" value={stats.historyCount} emoji="⏳" subValue="Audit Trail" />
        <StatCard title="Readiness" value={`${stats.readiness}%`} emoji="🛡️" />
      </div>

      <Card className="border border-slate-100 dark:border-slate-800/80 rounded-2xl bg-white/40 dark:bg-slate-900/20 shadow-sm overflow-hidden">
        <CardHeader className="p-4 pb-0 border-b border-slate-100 dark:border-slate-800/50">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-4">
                <Tabs value={activeReportTab} onValueChange={setActiveReportTab} className="w-full sm:w-auto">
                    <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl h-auto flex w-fit shadow-inner border border-slate-200 dark:border-slate-800">
                        <TabsTrigger value="valuation" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow transition-all">
                            Valuasi Finansial
                        </TabsTrigger>
                        <TabsTrigger value="history" className="rounded-lg px-6 font-black text-[10px] uppercase tracking-widest py-2.5 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow transition-all">
                            Riwayat & Audit Trail
                        </TabsTrigger>
                    </TabsList>
                </Tabs>
                
                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 px-3.5 py-1.5 rounded-xl border">
                    <Filter className="h-3.5 w-3.5 text-primary" />
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">
                        Akses Unit: {isAdmin ? 'GLOBAL' : (user?.allowedDepartments?.length ? `${user.allowedDepartments.length} Unit` : user?.department || 'PRIVAT')}
                    </span>
                </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pb-4 text-left">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kepemilikan</Label>
                    <Select value={ownershipFilter} onValueChange={setOwnershipFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner font-bold text-black dark:text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl"><SelectItem value="ALL">Semua</SelectItem><SelectItem value="COMPANY">Aset Perusahaan</SelectItem><SelectItem value="PERSONAL">Personal</SelectItem></SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Klasifikasi Seri</Label>
                    <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner font-bold text-black dark:text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">Semua Seri</SelectItem>
                            <SelectItem value="A">Seri A</SelectItem>
                            <SelectItem value="B">Seri B</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Lokasi / Dept</Label>
                    <Select value={locationFilter} onValueChange={setLocationFilter}>
                        <SelectTrigger className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner font-bold text-black dark:text-white">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="ALL">Semua Lokasi Terizin</SelectItem>
                            {dynamicLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Pencarian Global</Label>
                    <div className="relative group">
                        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input placeholder="Kode atau Nama..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="h-11 pl-10 bg-slate-50 dark:bg-slate-950 border-none rounded-xl font-bold shadow-inner text-black dark:text-white" />
                    </div>
                </div>
            </div>
        </CardHeader>
        
        <CardContent className="p-0">
            {activeReportTab === 'valuation' ? (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-900 dark:bg-slate-950">
                            <TableRow className="h-10 border-none">
                                <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Identitas</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Nama Barang</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right text-slate-100 border-r border-white/25">Perolehan</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right text-slate-100 border-r border-white/25">Penyusutan</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-right text-emerald-400 border-r border-white/25">Nilai Buku</TableHead>
                                <TableHead className="text-center text-[9px] font-black uppercase tracking-widest text-slate-100">Kondisi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6} className="p-3"><Skeleton className="h-8 w-full rounded-xl" /></TableCell></TableRow>
                                ))
                            ) : filteredAssets.length > 0 ? (
                                filteredAssets.map((asset) => {
                                    const dep = calculateDepreciation(asset.price, asset.purchaseDate, asset.assetLifetime);
                                    return (
                                        <TableRow key={asset.id} className="h-10 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800 group">
                                            <TableCell className="py-1 pl-8 font-black font-mono text-[9px] text-primary text-left border-r border-slate-200 dark:border-slate-800">{asset.code}</TableCell>
                                            <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800">
                                                <div className="flex flex-col text-left">
                                                    <span className="font-bold text-xs text-slate-900 dark:text-white uppercase truncate max-w-[200px] text-left">{asset.name}</span>
                                                    <span className="text-[8px] font-bold text-muted-foreground uppercase text-left">{asset.category} • {asset.location}</span>
                                                </div>
                                            </TableCell>
                                            <TableCell className="py-1 text-right border-r border-slate-200 dark:border-slate-800"><span className="text-[11px] font-bold text-slate-500">{new Intl.NumberFormat('id-ID').format(asset.price)}</span></TableCell>
                                            <TableCell className="py-1 text-right border-r border-slate-200 dark:border-slate-800"><span className="text-[11px] font-bold text-rose-500">-{new Intl.NumberFormat('id-ID').format(dep ? dep.accumulatedDepreciation : 0)}</span></TableCell>
                                            <TableCell className="py-1 text-right border-r border-slate-200 dark:border-slate-800"><span className="text-[11px] font-black text-emerald-600 dark:text-emerald-400">{new Intl.NumberFormat('id-ID').format(dep ? dep.bookValue : asset.price)}</span></TableCell>
                                            <TableCell className="py-1 text-center"><Badge variant="outline" className="text-[9px] font-bold uppercase py-0 px-2 h-5">{asset.condition}</Badge></TableCell>
                                        </TableRow>
                                    );
                                })
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-48 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-20">Tidak Ada Data Unit Terizin</TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-900 dark:bg-slate-950">
                            <TableRow className="h-10 border-none">
                                <TableHead className="pl-8 text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Waktu Kejadian</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Aset</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Tipe Aktivitas</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Deskripsi Histori</TableHead>
                                <TableHead className="text-[9px] font-black uppercase tracking-widest text-left text-slate-100 border-r border-white/25">Pelaku (Actor)</TableHead>
                                <TableHead className="text-right pr-8 text-[9px] font-black uppercase tracking-widest text-slate-100">Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                    <TableRow key={i}><TableCell colSpan={6} className="p-3"><Skeleton className="h-8 w-full rounded-xl" /></TableCell></TableRow>
                                ))
                            ) : detailedHistory.length > 0 ? (
                                detailedHistory.map((event) => (
                                    <TableRow key={event.id} className="h-10 hover:bg-slate-200/50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-200 dark:border-slate-800 group">
                                        <TableCell className="py-1 pl-8 border-r border-slate-200 dark:border-slate-800">
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-black text-left">{format(event.date, 'HH:mm')}</span>
                                                <span className="text-[8px] text-muted-foreground font-bold text-left">{format(event.date, 'dd MMM yyyy')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-xs text-slate-900 dark:text-white uppercase truncate max-w-[150px] text-left">{event.assetName}</span>
                                                <span className="text-[9px] font-mono text-primary font-bold text-left">{event.assetCode}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800">
                                            <Badge variant="outline" className={cn(
                                                "text-[9px] font-black uppercase tracking-tighter py-0 px-2 h-5",
                                                event.type === 'MUTATION' ? "bg-blue-50 text-blue-700 border-blue-100" :
                                                event.type === 'MAINTENANCE' ? "bg-amber-50 text-amber-700 border-amber-100" :
                                                event.type === 'DISPOSAL' ? "bg-rose-50 text-rose-700 border-rose-100" :
                                                "bg-slate-100 text-slate-700"
                                            )}>
                                                <div className="flex items-center gap-1.5">
                                                    {event.type === 'MUTATION' && <ArrowRightLeft className="h-2.5 w-2.5" />}
                                                    {event.type === 'MAINTENANCE' && <Wrench className="h-2.5 w-2.5" />}
                                                    {event.type === 'DISPOSAL' && <Trash2 className="h-2.5 w-2.5" />}
                                                    {event.type === 'CREATION' && <Package className="h-2.5 w-2.5" />}
                                                    {event.type}
                                                </div>
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800">
                                            <p className="text-[10px] font-bold text-slate-700 dark:text-slate-200 leading-snug line-clamp-1 max-w-[300px] text-left" title={event.description}>
                                                {event.description}
                                            </p>
                                        </TableCell>
                                        <TableCell className="py-1 border-r border-slate-200 dark:border-slate-800">
                                            <div className="flex items-center gap-2 text-left">
                                                <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center shrink-0"><User className="h-2.5 w-2.5 text-slate-400" /></div>
                                                <div className="flex flex-col text-left">
                                                    <span className="text-[10px] font-black uppercase tracking-tight text-left">{event.actor}</span>
                                                    <span className="text-[8px] font-bold text-muted-foreground text-left">{event.department}</span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell className="py-1 text-right pr-8">
                                            <Badge variant="outline" className="rounded-full px-2 py-0 h-5 text-[9px] font-black uppercase bg-emerald-50 text-emerald-600 border-emerald-100">
                                                {event.status || 'Verified'}
                                            </Badge>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow><TableCell colSpan={6} className="h-48 text-center"><div className="flex flex-col items-center gap-2 opacity-20"><History className="h-16 w-16 mx-auto mb-4" /><p className="font-black uppercase tracking-[0.2em] text-sm italic">Tidak Ada Kejadian Terizin</p></div></TableCell></TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            )}
        </CardContent>
        <CardFooter className="px-10 py-6 bg-slate-50 dark:bg-slate-950/50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
                <CheckCircle2 className="text-emerald-600 h-5 w-5" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">
                    Hanya menampilkan data unit kerja yang memiliki izin visibilitas pada profil Anda.
                </p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
