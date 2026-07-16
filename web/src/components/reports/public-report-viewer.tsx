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
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

interface PublicReportViewerProps {
  reportId: string;
}

export default function PublicReportViewer({ reportId }: PublicReportViewerProps) {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  const [deptFilter, setDeptFilter] = useState<string | null>(null);

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

  const stats = useMemo(() => {
    if (!report) return null;
    const items = report.items || report.assets || [];
    if (items.length === 0) return null;
    
    let globalStats: any = { total: items.length };

    if (report.type === 'HELPDESK_SUMMARY') {
        globalStats = {
            ...globalStats,
            done: items.filter((i: any) => i.status === 'Selesai').length,
            waiting: items.filter((i: any) => i.status === 'Menunggu' || i.status === 'Diproses').length
        };
    } else if (report.type === 'MAINTENANCE_LOG') {
        globalStats = {
            ...globalStats,
            done: items.filter((i: any) => i.status === 'Selesai').length,
            upcoming: items.filter((i: any) => i.status === 'Dijadwalkan' || i.status === 'Diproses').length
        };
    } else if (!report.type && report.assets) {
        const approvedCount = items.filter((i: any) => i.status?.toLowerCase().includes('approved') || i.status?.toLowerCase().includes('selesai')).length;
        globalStats = {
            ...globalStats,
            done: approvedCount,
            waiting: items.length - approvedCount
        };
    }

    // Hitung distribusi per departemen
    const deptMap = items.reduce((acc: Record<string, number>, item: any) => {
        const dept = item.dept || item.location || item.newLocation || 'UMUM';
        acc[dept] = (acc[dept] || 0) + 1;
        return acc;
    }, {});

    const deptCounts = Object.entries(deptMap)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => (b.count as number) - (a.count as number));

    return {
        ...globalStats,
        deptCounts
    };
  }, [report]);

  const filteredItems = useMemo(() => {
    if (!report) return [];
    const items = report.items || report.assets || [];
    if (!deptFilter) return items;
    return items.filter((item: any) => (item.dept || item.location || item.newLocation || 'UMUM') === deptFilter);
  }, [report, deptFilter]);

  const toggleDeptFilter = (name: string) => {
    setDeptFilter(prev => prev === name ? null : name);
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
                    <div className="p-6 rounded-[2rem] bg-slate-900 text-white shadow-xl flex items-center gap-5">
                        <div className="p-4 bg-white/10 rounded-2xl border border-white/5 shadow-inner"><Activity className="h-6 w-6 text-primary" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-white/40 tracking-widest mb-1 text-left">Total Entitas</p>
                            <p className="text-2xl font-black text-left">{stats.total} <small className="text-xs opacity-40">ITEM</small></p>
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xl flex items-center gap-5">
                        <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-100 shadow-inner"><CheckCircle2 className="h-6 w-6 text-emerald-600" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 text-left">Telah Selesai</p>
                            <p className="text-2xl font-black text-emerald-600 text-left">{stats.done || 0}</p>
                        </div>
                    </div>
                    <div className="p-6 rounded-[2rem] bg-white border border-slate-100 shadow-xl flex items-center gap-5">
                        <div className="p-4 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner"><Clock className="h-6 w-6 text-amber-600" /></div>
                        <div>
                            <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-1 text-left">Dalam Antrean</p>
                            <p className="text-2xl font-black text-amber-600 text-left">{(stats as any).waiting || (stats as any).upcoming || 0}</p>
                        </div>
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
                        {deptFilter && (
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => setDeptFilter(null)}
                                className="h-8 rounded-full text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50"
                            >
                                <X className="mr-2 h-3.5 w-3.5" /> Bersihkan Filter
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
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">Diterbitkan Oleh</span>
                        <p className="text-sm font-black text-slate-900 text-left uppercase">{report.processedBy || 'SYSTEM ADMIN'}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em] text-left">Status Filter</span>
                        <Badge variant={deptFilter ? "outline" : "success"} className="rounded-full px-3 py-0.5 text-[9px] font-black uppercase shadow-sm">
                            {deptFilter ? `UNIT: ${deptFilter}` : 'SEMUA UNIT'}
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
                                            <Badge variant="outline" className="text-[8px] font-black uppercase tracking-tighter bg-slate-50 border-slate-200">
                                                {report.assets ? 'MUTASI' : (item.type || item.category || 'GENERAL')}
                                            </Badge>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1 py-3 text-left">
                                                {report.assets ? (
                                                    <>
                                                        <p className="text-[11px] font-black text-slate-700 uppercase">
                                                            {item.status?.toLowerCase().includes('creation') ? (
                                                                <>Penambahan di Lokasi: <span className="text-emerald-600 font-bold">{item.prevLocation}</span></>
                                                            ) : (
                                                                <>Mutasi Lokasi: <span className="text-rose-600 font-bold">{item.prevLocation}</span> → <span className="text-emerald-600 font-bold">{item.newLocation}</span></>
                                                            )}
                                                        </p>
                                                        <span className="text-[9px] font-bold text-muted-foreground uppercase flex items-center gap-1">
                                                            <User className="h-2.5 w-2.5" /> Diajukan Oleh: {item.requester}
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
                                            <Badge className={cn(
                                                "rounded-full px-3 py-0.5 text-[9px] font-black uppercase border-none shadow-sm",
                                                item.status === 'Selesai' || item.status === 'Aktif' || item.status?.toLowerCase().includes('approved') ? "bg-emerald-600 text-white" : "bg-primary text-white"
                                            )}>
                                                {item.status || 'Verified'}
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
    </div>
  );
}
