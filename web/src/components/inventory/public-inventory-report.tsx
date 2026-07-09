'use client';

/**
 * @fileOverview Komponen Laporan Inventaris Publik.
 * Dioptimalkan untuk menampilkan data departemen per item dan tanda tangan validasi yang sah.
 * Menampilkan kolom Peminta/Dept dan Kategori secara eksplisit.
 * Penambahan: Deteksi status 'isIncoming' untuk label "BARANG MASUK".
 */

import { useState, useEffect, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogClose,
  DialogFooter
} from '@/components/ui/dialog';
import { 
  Printer, 
  CheckCircle2, 
  Package, 
  User, 
  Building, 
  ShieldCheck, 
  Info,
  AlertTriangle,
  ArrowLeft,
  History,
  ShieldAlert,
  X,
  ShoppingCart,
  Pencil,
  Loader2,
  ArrowUpRight
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface PublicReportData {
  title: string;
  type: string;
  items: Array<{
    code: string;
    name: string;
    quantity: number;
    unit?: string;
    status?: string;
    requester?: string;
    dept?: string;
    signature?: string;
    inventoryCategory?: string;
    isIncoming?: boolean;
  }>;
  recipient: string;
  department: string;
  processedBy?: string;
  createdAt: any;
  signature?: string;
}

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number | string, icon: any, color: string }) => (
    <Card className={cn("relative overflow-hidden border-none shadow-lg", color)}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icon className="h-16 w-16" />
        </div>
        <CardContent className="p-4 sm:p-6">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70">{title}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1">{value}</h3>
        </CardContent>
    </Card>
);

export default function PublicInventoryReport() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('s');
  
  const [report, setReport] = useState<PublicReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [viewSignatureUrl, setViewSignatureUrl] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');

  useEffect(() => {
    // Sync company name
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) setCompanyName(snap.data().companyName);
    });
    return () => unsubGen();
  }, []);

  useEffect(() => {
    async function fetchReport() {
      if (!reportId) {
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'public_reports', reportId);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          setReport(docSnap.data() as PublicReportData);
        } else {
          setError('Dokumen tidak ditemukan atau sudah kedaluwarsa.');
        }
      } catch (err) {
        console.error("Error fetching public report:", err);
        setError('Gagal memuat dokumen. Periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    }

    fetchReport();
  }, [reportId]);

  const stats = useMemo(() => {
    if (!report) return { total: 0, waiting: 0, approved: 0, rejected: 0 };
    const items = report?.items || [];
    return {
        total: items.length,
        waiting: items.filter(r => r.status === 'Menunggu Persetujuan HRGA').length,
        approved: items.filter(r => !r.status || r.status === 'Disetujui').length,
        rejected: items.filter(r => r.status === 'Ditolak').length,
    };
  }, [report]);

  const getStatusVariant = (status?: string) => {
    switch (status) {
      case 'Menunggu Persetujuan HRGA': return 'warning';
      case 'Disetujui': return 'success';
      case 'Ditolak': return 'destructive';
      case 'Selesai': return 'outline';
      default: return 'success';
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto space-y-6 p-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 w-full rounded-2xl" />)}
        </div>
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (error || !report) {
    return (
      <div className="max-w-md mx-auto text-center space-y-6 pt-20">
        <div className="p-10 bg-white rounded-[3rem] shadow-2xl border-2 border-dashed border-slate-100 flex flex-col items-center gap-6">
            <div className="p-4 bg-rose-50 rounded-full">
                <AlertTriangle className="h-12 w-12 text-rose-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Akses Terbatas</h1>
                <p className="text-sm text-muted-foreground font-medium leading-relaxed">{error || 'ID Laporan tidak valid.'}</p>
            </div>
        </div>
        <Button asChild variant="ghost" className="rounded-full font-black uppercase text-[10px] tracking-widest text-slate-400 hover:text-slate-900">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Portal</Link>
        </Button>
      </div>
    );
  }

  const reportDate = report.createdAt?.toDate() || new Date();

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-10 space-y-8 animate-in fade-in duration-700 pb-20">
        {/* Analytics Section */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 print:hidden text-left">
            <StatCard title="Item Laporan" value={stats.total} icon={History} color="bg-slate-800" />
            <StatCard title="Status Pending" value={stats.waiting} icon={ShieldAlert} color="bg-amber-500" />
            <StatCard title="Item Valid" value={stats.approved} icon={CheckCircle2} color="bg-emerald-600" />
            <StatCard title="Item Ditolak" value={stats.rejected} icon={X} color="bg-rose-600" />
        </div>

        {/* Main Document Card */}
        <Card className="border-none shadow-2xl bg-white/80 backdrop-blur-md rounded-[2.5rem] overflow-hidden print:shadow-none print:border print:bg-white text-black">
            <CardHeader className="p-8 sm:p-12 pb-6 border-b border-slate-100">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
                    <div className="flex items-center gap-4 sm:gap-6">
                        <div className="p-4 bg-primary/10 rounded-[1.5rem] shadow-inner shrink-0">
                            <Image src="/cgi.png" alt="Logo" width={48} height={48} />
                        </div>
                        <div className="min-w-0 text-left">
                            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 uppercase leading-none mb-1">{companyName}</h1>
                            <CardDescription className="font-bold text-primary uppercase tracking-[0.2em] text-[10px] sm:text-xs text-left">Official Inventory Report</CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 print:hidden">
                        <Button onClick={handlePrint} className="rounded-2xl h-12 px-8 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-xl transition-all active:scale-95">
                            <Printer className="mr-2 h-5 w-5" /> Cetak Laporan
                        </Button>
                    </div>
                </div>

                <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50/50 p-6 rounded-3xl border border-slate-100 shadow-inner text-left">
                    <div className="space-y-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mb-1">Judul Laporan</span>
                            <span className="text-xl font-black text-slate-900 uppercase leading-tight">{report.title}</span>
                        </div>
                        <div className="flex items-center gap-6">
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Tanggal</span>
                                <span className="text-xs font-bold">{format(reportDate, 'd MMMM yyyy', { locale: localeID })}</span>
                            </div>
                            <div className="flex flex-col">
                                <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest">Nomor ID</span>
                                <span className="text-xs font-mono font-bold text-primary">#{reportId?.slice(0, 8).toUpperCase()}</span>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5"><User className="h-2.5 w-2.5" /> Penerima Utama</span>
                            <span className="text-xs font-bold text-slate-900 truncate">{report.recipient}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5"><Building className="h-2.5 w-2.5" /> Departemen Utama</span>
                            <span className="text-xs font-bold text-slate-900 truncate">{report.department}</span>
                        </div>
                        <div className="flex flex-col col-span-2 pt-2 border-t border-slate-200">
                             <span className="text-[9px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-1.5"><ShieldCheck className="h-2.5 w-2.5" /> Otoritas Pengolah</span>
                            <span className="text-xs font-bold text-emerald-600 truncate">{report.processedBy || 'Sistem Admin'}</span>
                        </div>
                    </div>
                </div>
            </CardHeader>

            <CardContent className="p-8 sm:p-12 pt-8">
                <div className="relative w-full overflow-hidden border rounded-3xl bg-white shadow-inner">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow className="h-14 border-none">
                                <TableHead className="pl-8 uppercase text-[10px] font-black tracking-widest">Detail Barang</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Kategori</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-center">Jumlah</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest">Peminta / Dept</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-center">Status</TableHead>
                                <TableHead className="text-right pr-8 uppercase text-[10px] font-black tracking-widest">Validasi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {(report?.items || []).map((item, idx) => {
                                const itemSignature = item.signature || report.signature;
                                return (
                                    <TableRow key={idx} className="h-20 hover:bg-slate-50 transition-colors border-slate-100">
                                        <TableCell className="pl-8">
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-sm text-slate-900 uppercase truncate max-w-[200px]">{item.name}</span>
                                                <span className="text-[10px] font-mono text-primary font-bold">{item.code}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className="rounded-md font-bold text-[9px] uppercase tracking-tighter border-primary/20 bg-primary/5 text-primary">
                                                {item.inventoryCategory || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <div className="flex flex-col items-center">
                                                <span className={cn("font-black text-base", item.isIncoming ? "text-emerald-600" : "text-slate-900")}>
                                                    {item.isIncoming ? '+' : ''}{item.quantity}
                                                </span>
                                                <span className="text-[10px] font-bold text-muted-foreground uppercase">{item.unit || 'UNIT'}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-xs uppercase text-slate-900 truncate max-w-[150px]">{item.requester || report.recipient}</span>
                                                <span className="text-[9px] font-black uppercase text-muted-foreground">{item.dept || report.department}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {item.isIncoming ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-full px-3 py-0.5 font-black text-[9px] uppercase shadow-sm">
                                                    <ArrowUpRight className="h-2.5 w-2.5 mr-1" /> BARANG MASUK
                                                </Badge>
                                            ) : (
                                                <Badge variant={getStatusVariant(item.status)} className="rounded-full px-3 py-0.5 font-black text-[9px] uppercase shadow-sm">
                                                    {item.status || 'Disetujui'}
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right pr-8">
                                            {itemSignature ? (
                                                <div className="flex justify-end items-center gap-3">
                                                    <div className="h-10 w-20 relative bg-slate-50 border rounded-xl p-1 opacity-70 cursor-pointer hover:opacity-100 transition-opacity hidden sm:block" onClick={() => setViewSignatureUrl(itemSignature)}>
                                                        <Image src={itemSignature} alt="Sig" fill className="object-contain" />
                                                    </div>
                                                    <button 
                                                        onClick={() => setViewSignatureUrl(itemSignature)} 
                                                        className="h-9 w-9 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm print:hidden"
                                                        title="Lihat Tanda Tangan"
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </button>
                                                </div>
                                            ) : (
                                                <div className="flex flex-col items-end opacity-40">
                                                    <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                                                    <span className="text-[7px] font-black uppercase">Verified By Admin</span>
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                )
                            })}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>

            <CardFooter className="px-8 sm:px-12 py-10 bg-slate-50 border-t flex flex-col sm:flex-row items-center justify-between gap-8">
                <div className="flex items-center gap-4 max-w-lg text-left">
                    <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100 shrink-0">
                        <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-900 tracking-tight leading-none">Dokumen Terverifikasi Digital</p>
                        <p className="text-[9px] font-medium text-slate-500 leading-tight">Laporan ini dihasilkan secara otomatis oleh sistem logistik {companyName} dan bersifat sah sebagai bukti pengambilan atau penambahan barang operasional.</p>
                    </div>
                </div>
                <div className="text-center sm:text-right shrink-0">
                    <p className="text-[10px] font-black uppercase text-slate-400 mb-1 tracking-widest">Generated On</p>
                    <p className="text-xs font-bold text-slate-700">{format(reportDate, 'PPpp', { locale: localeID })}</p>
                </div>
            </CardFooter>
        </Card>

        {/* View Signature Dialog */}
        <Dialog open={!!viewSignatureUrl} onOpenChange={(open) => !open && setViewSignatureUrl(null)}>
            <DialogContent 
                onPointerDownOutside={(e) => e.preventDefault()}
                className="sm:max-w-md p-0 overflow-hidden border-none rounded-[2.5rem] shadow-3xl bg-white text-black"
            >
                <div className="p-6 bg-slate-900 text-white border-b flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 text-left">
                        <ShieldCheck className="h-5 w-5 text-primary" />
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-left">Otentikasi Pengesahan</DialogTitle>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full h-8 w-8 hover:bg-white/10 text-white/60"><X className="h-5 w-5" /></Button></DialogClose>
                </div>
                <div className="p-12 flex flex-col items-center justify-center gap-6 text-center">
                    <div className="relative w-full aspect-video border-2 border-slate-100 rounded-[2rem] bg-slate-50 flex items-center justify-center p-8 shadow-inner overflow-hidden">
                        {viewSignatureUrl && (
                            <Image src={viewSignatureUrl} alt="Signature Proof" width={300} height={150} className="object-contain drop-shadow-md z-10" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                            <CheckCircle2 className="h-40 w-40 text-primary" />
                        </div>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[10px] font-black uppercase text-slate-900 tracking-[0.2em]">E-Authorization Approved</p>
                        <p className="text-[9px] font-bold text-muted-foreground uppercase">Verifikasi Departemen Peminta</p>
                    </div>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t flex justify-center">
                    <Button onClick={() => setViewSignatureUrl(null)} className="rounded-xl px-10 font-black uppercase text-[10px] tracking-widest h-11 text-black">Tutup Verifikasi</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    </div>
  );
}
