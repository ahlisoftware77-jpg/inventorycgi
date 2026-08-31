'use client';

/**
 * @fileOverview Komponen Viewer Laporan Publik Universal.
 * Mendukung berbagai tipe laporan: HELPDESK_SUMMARY, MAINTENANCE_LOG, dan ISO_EMISSION.
 * Fitur: Ringkasan statistik global, distribusi per departemen dengan filter interaktif.
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Info, 
  Calendar, 
  User, 
  Building, 
  Hash, 
  Activity,
  Wrench,
  LifeBuoy,
  FileText,
  Clock,
  ChevronRight,
  TrendingUp,
  AlertTriangle,
  ExternalLink,
  LayoutGrid,
  MapPin,
  X,
  Loader2,
  CircleDollarSign,
  ImageIcon,
  Filter
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { DocumentViewerModal } from '@/components/maintenance/document-viewer-modal';
import { type Asset } from '@/lib/types';

interface PublicReportViewerProps {
  reportId: string;
}

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export default function PublicReportViewer({ reportId }: PublicReportViewerProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  const [deptFilter, setDeptFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [typeFilter, setTypeFilter] = useState<string>('ALL');
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<any | null>(null);
  const [fetchedAssetDetail, setFetchedAssetDetail] = useState<Asset | null>(null);
  const [loadingAssetDetail, setLoadingAssetDetail] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const handleOpenItemDetail = async (item: any) => {
    setSelectedItemForDetail(item);
    if (item.id) {
      setLoadingAssetDetail(true);
      try {
        const snap = await getDoc(doc(db, 'assets', item.id));
        if (snap.exists()) {
          setFetchedAssetDetail({ id: snap.id, ...snap.data() } as Asset);
        } else {
          setFetchedAssetDetail(null);
        }
      } catch (e) {
        console.error("Error fetching asset detail:", e);
        setFetchedAssetDetail(null);
      } finally {
        setLoadingAssetDetail(false);
      }
    } else {
      setFetchedAssetDetail(null);
    }
  };

  useEffect(() => {
    onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) setCompanyName(snap.data().companyName);
    });

    async function fetchReport() {
      try {
        const docRef = doc(db, 'public_reports', reportId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport(docSnap.data());
        }
      } catch (err) {
        console.error("Error fetching report:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  const uniqueStatuses = useMemo(() => {
    if (!report) return [];
    const items = report.items || report.assets || [];
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      const st = item.status || 'Verified';
      map.set(st, (map.get(st) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [report]);

  const uniqueUnits = useMemo(() => {
    if (!report) return [];
    const items = report.items || report.assets || [];
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      const dept = item.dept || item.location || item.newLocation || 'UMUM';
      map.set(dept, (map.get(dept) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [report]);

  const uniqueTypes = useMemo(() => {
    if (!report) return [];
    const items = report.items || report.assets || [];
    const map = new Map<string, number>();
    items.forEach((item: any) => {
      const rawTitle = (report.title || '').toLowerCase();
      const rawType = item.type || (
        rawTitle.includes('disposal') ? 'DISPOSAL' :
        rawTitle.includes('creation') ? 'CREATION' :
        rawTitle.includes('edit') ? 'EDIT' :
        (item.status?.toLowerCase().includes('disposal') ? 'DISPOSAL' :
         item.status?.toLowerCase().includes('creation') ? 'CREATION' :
         item.status?.toLowerCase().includes('edit') ? 'EDIT' :
         item.status?.toLowerCase().includes('mutasi') ? 'MUTASI' :
         (report.type || item.category || 'MUTASI'))
      );
      const displayType = String(rawType).toUpperCase();
      map.set(displayType, (map.get(displayType) || 0) + 1);
    });
    return Array.from(map.entries()).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count);
  }, [report]);

  const stats = useMemo(() => {
    if (!report) return null;
    const items = report.items || report.assets || [];
    if (items.length === 0) return null;
    
    const approvedCount = items.filter((i: any) => {
        const st = (i.status || '').toLowerCase();
        return st === 'selesai' || st === 'aktif' || st.includes('approved');
    }).length;

    const globalStats = {
        total: items.length,
        done: approvedCount,
        waiting: items.length - approvedCount
    };

    const deptCounts = uniqueUnits;

    return {
        ...globalStats,
        deptCounts
    };
  }, [report, uniqueUnits]);

  const filteredItems = useMemo(() => {
    if (!report) return [];
    let items = report.items || report.assets || [];

    if (deptFilter !== 'ALL') {
      items = items.filter((item: any) => (item.dept || item.location || item.newLocation || 'UMUM') === deptFilter);
    }

    if (statusFilter !== 'ALL') {
      if (statusFilter === 'PRESET_DONE') {
        items = items.filter((item: any) => {
          const st = (item.status || '').toLowerCase();
          return st === 'selesai' || st === 'aktif' || st.includes('approved');
        });
      } else if (statusFilter === 'PRESET_WAITING') {
        items = items.filter((item: any) => {
          const st = (item.status || '').toLowerCase();
          return st !== 'selesai' && st !== 'aktif' && !st.includes('approved');
        });
      } else {
        items = items.filter((item: any) => item.status === statusFilter);
      }
    }

    if (typeFilter !== 'ALL') {
      items = items.filter((item: any) => {
        const rawTitle = (report.title || '').toLowerCase();
        const rawType = item.type || (
          rawTitle.includes('disposal') ? 'DISPOSAL' :
          rawTitle.includes('creation') ? 'CREATION' :
          rawTitle.includes('edit') ? 'EDIT' :
          (item.status?.toLowerCase().includes('disposal') ? 'DISPOSAL' :
           item.status?.toLowerCase().includes('creation') ? 'CREATION' :
           item.status?.toLowerCase().includes('edit') ? 'EDIT' :
           item.status?.toLowerCase().includes('mutasi') ? 'MUTASI' :
           (report.type || item.category || 'MUTASI'))
        );
        return String(rawType).toUpperCase() === typeFilter;
      });
    }

    return items;
  }, [report, deptFilter, statusFilter, typeFilter]);

  const toggleDeptFilter = (name: string) => {
    setDeptFilter(prev => prev === name ? 'ALL' : name);
  };

  if (loading) return (
    <div className="max-w-5xl mx-auto p-10 space-y-8 text-black">
      <div className="flex justify-between items-center mb-10">
          <div className="flex items-center gap-4 text-left">
              <Skeleton className="h-14 w-14 rounded-2xl" />
              <div className="space-y-2 text-left">
                  <Skeleton className="h-6 w-48 rounded-lg" />
                  <Skeleton className="h-4 w-32 rounded-md" />
              </div>
          </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-28 rounded-[2rem]" />
        <Skeleton className="h-28 rounded-[2rem]" />
      </div>
      <Skeleton className="h-96 w-full rounded-[3rem]" />
    </div>
  );

  if (!report) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-black">
        <AlertTriangle className="h-16 w-16 text-rose-500 opacity-20" />
        <div className="text-center space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight">Laporan Tidak Ditemukan</h2>
            <p className="text-sm text-muted-foreground font-medium">Link mungkin sudah kedaluwarsa atau laporan telah dihapus.</p>
        </div>
    </div>
  );

  const reportDate = report.createdAt?.toDate() || new Date();
  const IconHeader = report.type === 'HELPDESK_SUMMARY' ? LifeBuoy : (report.type === 'MAINTENANCE_LOG' ? Wrench : FileText);
  const accentColor = report.type === 'HELPDESK_SUMMARY' ? 'bg-blue-600' : (report.type === 'MAINTENANCE_LOG' ? 'bg-amber-500' : 'bg-primary');

  const isHelpdeskSummary = report.type === 'HELPDESK_SUMMARY';

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-10 space-y-10 pb-32 text-black print:p-0">
        {/* Document Header */}
        <div className="flex flex-col items-center text-center gap-5 pt-6">
            <div className="relative">
                <Image src="/cgi.png" alt="Logo" width={64} height={64} className="shadow-sm rounded-2xl p-1 bg-white" />
                <div className="absolute -bottom-2 -right-2 bg-emerald-500 text-white rounded-full p-1 shadow-lg ring-2 ring-white">
                    <ShieldCheck className="h-4 w-4" />
                </div>
            </div>
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 italic">{companyName}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary bg-primary/5 px-8 py-2 rounded-full inline-block">Official Information Disclosure</p>
            </div>
        </div>

        {/* Stats Section */}
        {stats && (
            <div className="space-y-8 print:hidden">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                    <div 
                        onClick={() => setStatusFilter('ALL')}
                        className={cn(
                            "p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl flex items-center gap-5 cursor-pointer transition-all hover:scale-[1.02]",
                            statusFilter === 'ALL' ? "ring-4 ring-primary/50 scale-[1.02]" : "opacity-80 hover:opacity-100"
                        )}
                    >
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/5 shadow-inner"><Activity className="h-6 w-6 text-primary" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 text-left">Total Entitas</p>
                            <p className="text-2xl font-black text-left">{stats.total} <small className="text-xs opacity-40">ITEM</small></p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setStatusFilter(prev => prev === 'DONE' ? 'ALL' : 'DONE')}
                        className={cn(
                            "p-6 rounded-[2rem] bg-white border shadow-xl flex items-center gap-5 cursor-pointer transition-all hover:scale-[1.02]",
                            statusFilter === 'DONE' ? "border-emerald-500 ring-4 ring-emerald-500/20 bg-emerald-50/20 scale-[1.02]" : "border-slate-100 hover:border-emerald-300"
                        )}
                    >
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 text-left">Telah Selesai / Disetujui</p>
                            <p className="text-2xl font-black text-emerald-600 text-left">{stats.done || 0}</p>
                        </div>
                    </div>
                    <div 
                        onClick={() => setStatusFilter(prev => prev === 'WAITING' ? 'ALL' : 'WAITING')}
                        className={cn(
                            "p-6 rounded-[2rem] bg-white border shadow-xl flex items-center gap-5 cursor-pointer transition-all hover:scale-[1.02]",
                            statusFilter === 'WAITING' ? "border-amber-500 ring-4 ring-amber-500/20 bg-amber-50/20 scale-[1.02]" : "border-slate-100 hover:border-amber-300"
                        )}
                    >
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner"><Clock className="h-6 w-6 text-amber-600" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 text-left">Dalam Antrean / Menunggu</p>
                            <p className="text-2xl font-black text-amber-600 text-left">{stats.waiting || 0}</p>
                        </div>
                    </div>
                </div>

                {/* Interactive Filter Control Panel */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50/70 p-5 rounded-3xl border border-slate-200/80 shadow-sm print:hidden">
                    {/* Filter Select Status */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                            <Filter className="w-3.5 h-3.5 text-primary" /> Filter Status ({uniqueStatuses.length} Opsi):
                        </label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger className="h-10 rounded-2xl text-xs font-extrabold uppercase border-slate-200 bg-white">
                                <SelectValue placeholder="PILIH STATUS" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase">SEMUA STATUS ({stats?.total || 0})</SelectItem>
                                <SelectItem value="PRESET_DONE" className="text-xs font-bold uppercase text-emerald-600">✓ SELESAI / APPROVED ({stats?.done || 0})</SelectItem>
                                <SelectItem value="PRESET_WAITING" className="text-xs font-bold uppercase text-amber-600">⏳ DALAM ANTREAN ({stats?.waiting || 0})</SelectItem>
                                {uniqueStatuses.map((st) => (
                                    <SelectItem key={st.name} value={st.name} className="text-xs font-bold uppercase">
                                        • {st.name} ({st.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Select Unit */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                            <Building className="w-3.5 h-3.5 text-primary" /> Filter Unit ({uniqueUnits.length} Opsi):
                        </label>
                        <Select value={deptFilter} onValueChange={setDeptFilter}>
                            <SelectTrigger className="h-10 rounded-2xl text-xs font-extrabold uppercase border-slate-200 bg-white">
                                <SelectValue placeholder="PILIH UNIT" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase">SEMUA UNIT ({stats?.total || 0})</SelectItem>
                                {uniqueUnits.map((u) => (
                                    <SelectItem key={u.name} value={u.name} className="text-xs font-bold uppercase">
                                        🏢 {u.name} ({u.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {/* Filter Select Tipe Transaksi */}
                    <div className="space-y-1.5 text-left">
                        <label className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-primary" /> Filter Tipe ({uniqueTypes.length} Opsi):
                        </label>
                        <Select value={typeFilter} onValueChange={setTypeFilter}>
                            <SelectTrigger className="h-10 rounded-2xl text-xs font-extrabold uppercase border-slate-200 bg-white">
                                <SelectValue placeholder="PILIH TIPE" />
                            </SelectTrigger>
                            <SelectContent className="rounded-2xl">
                                <SelectItem value="ALL" className="text-xs font-bold uppercase">SEMUA TIPE ({stats?.total || 0})</SelectItem>
                                {uniqueTypes.map((t) => (
                                    <SelectItem key={t.name} value={t.name} className="text-xs font-bold uppercase">
                                        📁 {t.name} ({t.count})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                {/* Summary per Departemen */}
                <div className="space-y-4">
                    <div className="flex items-center justify-between px-2">
                        <div className="flex items-center gap-3 text-left">
                            <div className="p-2 bg-primary/10 rounded-xl"><LayoutGrid className="h-4 w-4 text-primary" /></div>
                            <div>
                                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">Distribusi per Unit</h3>
                                <p className="text-[9px] font-bold text-muted-foreground uppercase">Klik kartu untuk menyaring data laporan</p>
                            </div>
                        </div>
                        {(deptFilter !== 'ALL' || statusFilter !== 'ALL' || typeFilter !== 'ALL') && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => { setDeptFilter('ALL'); setStatusFilter('ALL'); setTypeFilter('ALL'); }}
                                className="h-8 rounded-full text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50"
                            >
                                <X className="mr-2 h-3.5 w-3.5" /> Bersihkan Semua Filter
                            </Button>
                        )}
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                        {stats.deptCounts.map((dept: any) => (
                            <div 
                                key={dept.name} 
                                onClick={() => toggleDeptFilter(dept.name)}
                                className={cn(
                                    "p-4 rounded-2xl bg-white border shadow-sm transition-all group text-left cursor-pointer",
                                    deptFilter === dept.name 
                                        ? "border-primary ring-2 ring-primary/20 bg-primary/[0.03] scale-[1.02]" 
                                        : "border-slate-100 hover:border-primary/30 hover:shadow-md"
                                )}
                            >
                                <div className="flex items-center justify-between mb-2">
                                    <Building className={cn(
                                        "h-3.5 w-3.5 transition-colors",
                                        deptFilter === dept.name ? "text-primary" : "text-primary/40 group-hover:text-primary"
                                    )} />
                                    <Badge variant={deptFilter === dept.name ? "default" : "secondary"} className="text-[10px] font-black h-5 px-2">
                                        {dept.count}
                                    </Badge>
                                </div>
                                <p className="text-[11px] font-black text-slate-900 uppercase truncate leading-none" title={dept.name}>
                                    {dept.name}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        )}

        {/* Main Report Card */}
        <Card className="border-none shadow-3xl rounded-[3rem] bg-white overflow-hidden print:shadow-none print:border text-black">
            <CardHeader className="p-8 sm:p-12 pb-6 border-b border-slate-100">
                <div className="flex flex-col md:flex-row md:items-start justify-between gap-8 mb-10">
                    <div className="flex items-center gap-5">
                        <div className={cn("p-4 rounded-3xl shadow-xl flex items-center justify-center", accentColor)}>
                            <IconHeader className="h-8 w-8 text-white" />
                        </div>
                        <div className="text-left">
                            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-slate-900 leading-none mb-1">{report.title}</h2>
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest flex items-center gap-1.5 text-left">
                                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" /> Dokumentasi Terverifikasi Sistem
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 print:hidden">
                        <Button onClick={() => window.print()} className="rounded-2xl h-12 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase text-[11px] tracking-widest shadow-xl transition-all">
                            <Printer className="mr-2 h-4 w-4" /> Cetak Dokumen
                        </Button>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 bg-slate-50/50 p-8 rounded-[2.5rem] border border-slate-100 shadow-inner text-left">
                    <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">Tanggal Laporan</span>
                        <p className="text-sm font-black text-slate-900 text-left">{format(reportDate, 'd MMMM yyyy', { locale: localeID })}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">ID Autentikasi</span>
                        <p className="text-sm font-mono font-bold text-primary text-left">#{reportId.slice(0, 12).toUpperCase()}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">Filter Status</span>
                        <Badge variant={statusFilter !== 'ALL' ? "default" : "outline"} className="rounded-full px-3 py-0.5 text-[9px] font-black uppercase shadow-sm">
                            {statusFilter === 'ALL' ? 'SEMUA STATUS' : (statusFilter === 'PRESET_DONE' ? 'SELESAI / APPROVED' : (statusFilter === 'PRESET_WAITING' ? 'DALAM ANTREAN' : statusFilter))}
                        </Badge>
                    </div>
                    <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">Filter Unit</span>
                        <Badge variant={deptFilter !== 'ALL' ? "default" : "outline"} className="rounded-full px-3 py-0.5 text-[9px] font-black uppercase shadow-sm">
                            {deptFilter !== 'ALL' ? `UNIT: ${deptFilter}` : 'SEMUA UNIT'}
                        </Badge>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 sm:p-12">
                <div className="border rounded-[2.5rem] overflow-hidden bg-white shadow-xl">
                    <Table>
                        <TableHeader className="bg-slate-50 h-14 border-b">
                            <TableRow className="border-none">
                                <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest">Waktu / Tgl</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Identitas Objek</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipe / Kategori</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Ringkasan Aktivitas & Deskripsi</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Status</TableHead>
                                {isHelpdeskSummary && <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Tautan Dokumen</TableHead>}
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredItems.length > 0 ? filteredItems.map((item: any, idx: number) => {
                                const itemDate = item.date ? (typeof item.date === 'number' ? new Date(item.date) : item.date.toDate()) : reportDate;
                                return (
                                    <TableRow key={idx} className="h-20 hover:bg-slate-50 transition-colors border-slate-100">
                                        <TableCell className="pl-10">
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-black text-slate-900">{format(itemDate, 'dd/MM/yy')}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase">{format(itemDate, 'HH:mm')}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-xs uppercase text-slate-900 truncate max-w-[150px]">{item.name || item.assetName}</span>
                                                <span className="text-[10px] font-mono text-primary font-bold">{item.code || item.assetCode}</span>
                                            </div>
                                        </TableCell>
                                         <TableCell>
                                             {(() => {
                                               const rawTitle = (report.title || '').toLowerCase();
                                               const rawType = item.type || (
                                                 rawTitle.includes('disposal') ? 'DISPOSAL' :
                                                 rawTitle.includes('creation') ? 'CREATION' :
                                                 rawTitle.includes('edit') ? 'EDIT' :
                                                 (item.status?.toLowerCase().includes('disposal') ? 'DISPOSAL' :
                                                  item.status?.toLowerCase().includes('creation') ? 'CREATION' :
                                                  item.status?.toLowerCase().includes('edit') ? 'EDIT' :
                                                  item.status?.toLowerCase().includes('mutasi') ? 'MUTASI' :
                                                  (report.type || item.category || 'MUTASI'))
                                               );
                                               const displayType = String(rawType).toUpperCase();
                                               const badgeStyle = displayType.includes('DISPOSAL') 
                                                 ? "bg-rose-50 text-rose-700 border-rose-200" 
                                                 : displayType.includes('CREATION') 
                                                 ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                                                 : displayType.includes('EDIT') 
                                                 ? "bg-purple-50 text-purple-700 border-purple-200" 
                                                 : "bg-blue-50 text-blue-700 border-blue-200";
                                               return (
                                                 <Badge variant="outline" className={cn("text-[8px] font-black uppercase tracking-wider px-2 py-0.5", badgeStyle)}>
                                                     {displayType}
                                                 </Badge>
                                               );
                                             })()}
                                         </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 py-3 text-left">
                                                {report.assets ? (
                                                    <>
                                                        <p className="text-[11px] font-black text-slate-700 uppercase">
                                                            {item.status?.toLowerCase().includes('creation') ? (
                                                                <>Penambahan di Lokasi: <span className="text-emerald-600 font-bold">{item.prevLocation}</span></>
                                                            ) : item.status?.toLowerCase().includes('disposal') ? (
                                                                <>Disposal di Lokasi: <span className="text-rose-600 font-bold">{item.prevLocation}</span></>
                                                            ) : (
                                                                <>Mutasi Lokasi: <span className="text-rose-600 font-bold">{item.prevLocation}</span> → <span className="text-emerald-600 font-bold">{item.newLocation}</span></>
                                                            )}
                                                        </p>
                                                         <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                             <User className="h-2.5 w-2.5" /> Diajukan Oleh: {item.requesterName || item.requester || item.userName || item.user || item.createdByName || item.createdBy || item.reportedBy || item.requestedBy || '-'}
                                                         </span>
                                                    </>
                                                ) : (
                                                    <>
                                                        <p className="text-[11px] font-bold text-slate-700 leading-relaxed max-w-sm line-clamp-2 text-left">
                                                            {item.description || item.descriptionSummary || item.notes || '-'}
                                                        </p>
                                                        {(item.dept || item.location) && (
                                                            <span className="text-[9px] font-black text-muted-foreground uppercase flex items-center gap-1">
                                                                <Building className="h-2.5 w-2.5" /> {item.dept || item.location}
                                                            </span>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                             <Badge 
                                                 onClick={() => handleOpenItemDetail(item)}
                                                 className={cn(
                                                     "rounded-full px-3 py-1 text-[9px] font-black uppercase border-none shadow-sm cursor-pointer hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-1 mx-auto group",
                                                     item.status === 'Selesai' || item.status === 'Aktif' || item.status?.toLowerCase().includes('approved') ? "bg-emerald-600 hover:bg-emerald-700 text-white" : "bg-primary hover:bg-primary/90 text-white"
                                                 )}
                                                 title="Klik untuk menampilkan popup detail disposal / aset"
                                             >
                                                 <span>{item.status || 'Verified'}</span>
                                                 <ExternalLink className="w-2.5 h-2.5 opacity-70 group-hover:opacity-100 transition-opacity" />
                                             </Badge>
                                         </TableCell>
                                        {isHelpdeskSummary && (
                                            <TableCell className="text-right pr-10">
                                                <div className="flex flex-col sm:flex-row gap-2 justify-end print:hidden">
                                                    <Button asChild size="sm" variant="outline" className="h-7 rounded-lg text-[8px] font-black uppercase tracking-widest border-blue-100 text-blue-700 bg-blue-50">
                                                        <Link href={`/public/helpdesk?id=${item.id}`} target="_blank">
                                                            Status Tiket <ExternalLink className="ml-1 h-2.5 w-2.5" />
                                                        </Link>
                                                    </Button>
                                                    <Button asChild size="sm" variant="outline" className="h-7 rounded-lg text-[8px] font-black uppercase tracking-widest border-emerald-100 text-emerald-700 bg-emerald-50">
                                                        <Link 
                                                            href={item.reportId 
                                                                ? `/public/it-report?id=${item.reportId}` 
                                                                : `/public/it-report?ticketId=${item.id}&problem=${encodeURIComponent(item.description)}&dept=${encodeURIComponent(item.dept || '')}`} 
                                                            target="_blank"
                                                        >
                                                            Form Resmi <ExternalLink className="ml-1 h-2.5 w-2.5" />
                                                        </Link>
                                                    </Button>
                                                </div>
                                                <div className="hidden print:block text-[8px] font-mono text-muted-foreground/60 text-right">
                                                    Link: /public/helpdesk?id=${item.id?.slice(0,6)}
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={isHelpdeskSummary ? 6 : 5} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-20">
                                            <Search className="h-12 w-12" />
                                            <p className="font-black uppercase tracking-[0.2em] text-sm">Tidak ada data untuk unit ini</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <CardFooter className="px-8 sm:px-12 py-10 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-5 max-w-xl text-left">
                    <div className="p-4 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
                        <ShieldCheck className="h-10 w-10 text-emerald-500" />
                    </div>
                    <div className="space-y-2 text-left">
                        <p className="text-xs font-black uppercase text-slate-900 tracking-tight leading-none">Integritas Dokumen Terjamin</p>
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed text-left">Laporan ini dihasilkan secara otomatis oleh sistem manajemen terpadu {companyName}. Segala perubahan yang dilakukan setelah penerbitan laporan akan tercatat dalam log audit trail sistem pusat.</p>
                    </div>
                </div>
                <div className="text-center sm:text-right shrink-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-[0.2em]">Generated Final Report</p>
                    <p className="text-xs font-black text-slate-700">{format(new Date(), 'PPpp', { locale: localeID })}</p>
                </div>
            </CardFooter>
        </Card>

        {/* Branding Watermark */}
        <div className="text-center pt-10 opacity-30 grayscale pointer-events-none flex flex-col items-center gap-4">
            <Image src="/cgi.png" alt="Logo" width={32} height={32} />
            <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.5em]">{companyName.toUpperCase()}</p>
                <p className="text-[8px] font-bold uppercase tracking-tight italic">Corporate Industrial Asset Reliability System</p>
            </div>
        </div>

        {/* Modal Popup Detail Item / Transaksi / Disposal */}
        {selectedItemForDetail && (() => {
          const currentItem = { ...selectedItemForDetail, ...(fetchedAssetDetail || {}) };
          const rawTitle = (report?.title || '').toLowerCase();
          const st = (currentItem.status || '').toLowerCase();
          const rawType = (currentItem.type || '').toString().toUpperCase();

          let itemType = 'GENERAL';
          if (rawType.includes('DISPOSAL') || st.includes('disposal') || rawTitle.includes('disposal')) {
            itemType = 'DISPOSAL';
          } else if (rawType.includes('CREATION') || st.includes('creation') || rawTitle.includes('creation')) {
            itemType = 'CREATION';
          } else if (rawType.includes('EDIT') || st.includes('edit') || rawTitle.includes('edit')) {
            itemType = 'EDIT';
          } else if (rawType.includes('MUTASI') || st.includes('mutasi') || rawTitle.includes('mutasi')) {
            itemType = 'MUTASI';
          } else if (report?.type === 'HELPDESK_SUMMARY') {
            itemType = 'HELPDESK';
          } else if (report?.type === 'MAINTENANCE_LOG') {
            itemType = 'MAINTENANCE';
          }

          const photos = Array.from(new Set([
            currentItem.disposalPhotoURL1,
            currentItem.disposalPhotoURL2,
            currentItem.disposalPhotoURL3,
            currentItem.disposalPhotoURL4,
            currentItem.photoURL,
            currentItem.photoURL2,
            currentItem.photoURL3,
            currentItem.photoURL4,
          ].filter(Boolean))) as string[];

          const isPublicVisible = currentItem.isDisposalPhotoPublic !== false;

          return (
            <Dialog open={!!selectedItemForDetail} onOpenChange={(open) => !open && setSelectedItemForDetail(null)}>
              <DialogContent hideCloseButton className="sm:max-w-xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950 text-black dark:text-white">
                <DialogHeader className={cn(
                  "p-6 sm:p-8 shrink-0 relative flex flex-col gap-2 text-white",
                  itemType === 'DISPOSAL' ? "bg-rose-950" :
                  itemType === 'CREATION' ? "bg-emerald-950" :
                  itemType === 'EDIT' ? "bg-purple-950" :
                  itemType === 'MUTASI' ? "bg-indigo-950" :
                  "bg-slate-900"
                )}>
                  <div className="flex items-center justify-between">
                    <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                      {itemType === 'DISPOSAL' && <CircleDollarSign className="w-5 h-5 text-rose-400" />}
                      {itemType === 'CREATION' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
                      {itemType === 'EDIT' && <FileText className="w-5 h-5 text-purple-400" />}
                      {itemType === 'MUTASI' && <Activity className="w-5 h-5 text-indigo-400" />}
                      {itemType === 'HELPDESK' && <LifeBuoy className="w-5 h-5 text-blue-400" />}
                      {itemType === 'MAINTENANCE' && <Wrench className="w-5 h-5 text-amber-400" />}
                      {itemType === 'GENERAL' && <ShieldCheck className="w-5 h-5 text-emerald-400" />}

                      <span>
                        {itemType === 'DISPOSAL' ? 'Detail Disposal Aset' :
                         itemType === 'CREATION' ? 'Detail Penambahan Aset' :
                         itemType === 'EDIT' ? 'Detail Perubahan Data Aset' :
                         itemType === 'MUTASI' ? 'Detail Mutasi Aset' :
                         itemType === 'HELPDESK' ? 'Detail Tiket Helpdesk' :
                         itemType === 'MAINTENANCE' ? 'Detail Pemeliharaan Aset' :
                         'Detail Objek Aset'}
                      </span>
                    </DialogTitle>
                    <DialogClose asChild>
                      <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white h-8 w-8">
                        <X className="w-5 h-5" />
                      </Button>
                    </DialogClose>
                  </div>

                  <DialogDescription className="text-white/70 text-xs font-bold flex flex-col gap-1 text-left">
                    <span className="text-white font-extrabold text-sm">{currentItem.name || currentItem.assetName || '-'}</span>
                    {(currentItem.code || currentItem.assetCode) && (
                      <span className="text-emerald-400 font-mono tracking-wider">Kode: {currentItem.code || currentItem.assetCode}</span>
                    )}
                    {currentItem.transactionCode && (
                      <span className="text-sky-300 text-[10px] uppercase font-mono">Kode Transaksi: {currentItem.transactionCode}</span>
                    )}
                  </DialogDescription>
                </DialogHeader>

                <div className="p-6 sm:p-8 space-y-6 text-left max-h-[70vh] overflow-y-auto">
                  {loadingAssetDetail && (
                    <div className="flex items-center justify-center p-4 gap-2 text-xs font-bold text-muted-foreground">
                      <Loader2 className="w-4 h-4 animate-spin text-primary" /> Memuat detail data...
                    </div>
                  )}

                  {/* Rincian Khusus Berdasarkan Tipe Transaksi */}
                  {itemType === 'DISPOSAL' && (
                    <div className="p-4 rounded-2xl border border-rose-200 dark:border-rose-900/50 bg-rose-50/40 dark:bg-rose-950/20 space-y-3">
                      <h4 className="text-xs font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5">
                        <CircleDollarSign className="w-4 h-4 text-rose-600" /> Detail Nilai & Finansial Disposal
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Jenis Disposal</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{currentItem.disposalType || 'Disposal Resmi'}</p>
                        </div>
                        {currentItem.disposalType === 'Dijual' && (
                          <>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                              <p className="text-[9px] font-bold uppercase text-slate-400">Harga Jual</p>
                              <p className="font-bold text-emerald-600">{formatCurrency(currentItem.disposalPrice)}</p>
                            </div>
                            <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border col-span-2">
                              <p className="text-[9px] font-bold uppercase text-slate-400">Pembeli</p>
                              <p className="font-bold text-slate-800 dark:text-slate-200">{currentItem.disposalBuyer || '-'}</p>
                            </div>
                          </>
                        )}
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Harga Perolehan</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(currentItem.disposalCost ?? currentItem.price)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Akumulasi Depresiasi</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(currentItem.disposalAccumulatedDepreciation)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border col-span-2">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Nilai Buku Sisa</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{formatCurrency(currentItem.disposalBookValue)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {itemType === 'MUTASI' && (
                    <div className="p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900/50 bg-indigo-50/40 dark:bg-indigo-950/20 space-y-3">
                      <h4 className="text-xs font-black uppercase text-indigo-600 tracking-wider flex items-center gap-1.5">
                        <Activity className="w-4 h-4 text-indigo-600" /> Detail Perpindahan / Mutasi Lokasi
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Lokasi Asal</p>
                          <p className="font-bold text-rose-600">{currentItem.prevLocation || '-'}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Lokasi Tujuan</p>
                          <p className="font-bold text-emerald-600">{currentItem.newLocation || currentItem.location || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {itemType === 'CREATION' && (
                    <div className="p-4 rounded-2xl border border-emerald-200 dark:border-emerald-900/50 bg-emerald-50/40 dark:bg-emerald-950/20 space-y-3">
                      <h4 className="text-xs font-black uppercase text-emerald-600 tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Detail Penambahan Aset Baru
                      </h4>
                      <div className="grid grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Kategori</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{currentItem.category || '-'}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Harga Perolehan</p>
                          <p className="font-bold text-emerald-600">{formatCurrency(currentItem.price)}</p>
                        </div>
                        <div className="p-2.5 rounded-xl bg-white dark:bg-slate-900 border col-span-2">
                          <p className="text-[9px] font-bold uppercase text-slate-400">Lokasi Penempatan</p>
                          <p className="font-bold text-slate-800 dark:text-slate-200">{currentItem.newLocation || currentItem.location || currentItem.prevLocation || '-'}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Informasi Umum & Requester */}
                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Pemohon / Requester</p>
                      <p className="font-bold text-slate-800 dark:text-slate-200">{currentItem.requesterName || currentItem.requester || currentItem.userName || currentItem.user || currentItem.createdByName || currentItem.createdBy || currentItem.reportedBy || currentItem.requestedBy || '-'}</p>
                    </div>
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border">
                      <p className="text-[9px] font-bold uppercase text-slate-400">Status Transaksi</p>
                      <p className="font-bold text-primary uppercase">{currentItem.status || 'Aktif'}</p>
                    </div>
                    {(currentItem.notes || currentItem.description || currentItem.descriptionSummary) && (
                      <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-900 border col-span-2">
                        <p className="text-[9px] font-bold uppercase text-slate-400">Catatan / Deskripsi</p>
                        <p className="font-medium text-slate-700 dark:text-slate-300 leading-relaxed mt-0.5">
                          {currentItem.notes || currentItem.description || currentItem.descriptionSummary}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Bukti Lampiran (Foto / PDF) */}
                  {photos.length > 0 && (
                    <div className="space-y-3">
                      <p className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5">
                        <ImageIcon className="w-3.5 h-3.5" /> Bukti Lampiran ({photos.length}):
                      </p>

                      {!isPublicVisible ? (
                        <p className="text-[10px] text-amber-600 font-bold italic p-3 rounded-xl bg-amber-50 border border-amber-200">
                          Visibilitas bukti lampiran ini dibatasi oleh Admin.
                        </p>
                      ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {photos.map((url, idx) => {
                            const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/') || url.toLowerCase().includes('/files/');
                            return isPdf ? (
                              <div
                                key={idx}
                                onClick={() => setPreviewDoc({ title: `Bukti Lampiran ${idx + 1}`, url })}
                                className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-sm flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:scale-105 transition-all group"
                              >
                                <FileText className="w-7 h-7 text-primary mb-1 group-hover:scale-110 transition-transform" />
                                <span className="text-[8px] font-black uppercase text-primary">PDF {idx + 1}</span>
                                <div className="absolute inset-0 bg-primary/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-primary text-[9px] font-bold uppercase">
                                  Preview
                                </div>
                              </div>
                            ) : (
                              <div
                                key={idx}
                                onClick={() => setPreviewDoc({ title: `Bukti Lampiran ${idx + 1}`, url })}
                                className="relative aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm cursor-pointer hover:scale-105 transition-all group"
                              >
                                <Image src={url} alt={`Bukti ${idx + 1}`} fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[9px] font-bold uppercase">
                                  Preview
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex items-center justify-end">
                  <DialogClose asChild>
                    <Button variant="default" className="rounded-full px-8 font-bold text-xs bg-slate-900 hover:bg-black text-white w-full sm:w-auto">
                      Tutup
                    </Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          );
        })()}

        {/* Modal Viewer Dokumen Popup */}
        {previewDoc && (
          <DocumentViewerModal
            isOpen={!!previewDoc}
            onOpenChange={(open) => !open && setPreviewDoc(null)}
            title={previewDoc.title}
            url={previewDoc.url}
          />
        )}
    </div>
  );
}
