'use client';

/**
 * @fileOverview Laporan Stok Inventaris dengan Dukungan Rentang Waktu & Kalender yang Diperbaiki.
 * Desain: Premium Corporate Dashboard yang elegan dan profesional.
 * Fitur: Pilihan rentang bulan dengan dropdown Tahun/Bulan, Ringkasan statistik, 
 * Verifikasi sistem, Ekspor Excel, dan Cetak PDF.
 */

import { useState, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryItem, type InventoryTransaction, type InventoryType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import Image from 'next/image';
import { 
  Loader2, 
  CalendarIcon, 
  Printer, 
  FileText, 
  CheckCircle2, 
  Package, 
  ArrowUpRight, 
  ArrowDownRight, 
  Scale,
  TrendingUp,
  FileSpreadsheet,
  Filter,
  ArrowRight,
  RotateCcw,
  User,
  Building,
  Search,
  ArrowUp,
  ArrowDown
} from 'lucide-react';
import { format, startOfMonth, endOfMonth, isAfter, isBefore, startOfYear, parse, isValid } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';

interface MonthlyReportData {
  code: string;
  name: string;
  unit: string;
  stockAwal: number;
  stockMasuk: number;
  stockKeluar: number;
  stockAkhir: number;
  lastIncomingDate: Date | null;
  lastOutgoingDate: Date | null;
  lastRequesterName: string;
  lastRequesterDept: string;
}

const StatCard = ({ title, value, icon: Icon, color, subValue }: { title: string, value: number | string, icon: any, color: string, subValue?: string }) => (
    <Card className="border-none shadow-sm bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm group hover:shadow-md transition-all duration-300 rounded-2xl overflow-hidden text-black">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className={cn("p-2.5 rounded-xl shadow-lg", color)}>
                    <Icon className="h-5 w-5 text-white" />
                </div>
                {subValue && <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter bg-muted px-2 py-0.5 rounded-full">{subValue}</span>}
            </div>
            <div className="mt-4">
                <p className="text-[10px] font-black uppercase tracking-[0.1em] text-muted-foreground">{title}</p>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
        </CardContent>
    </Card>
);

export default function InventoryReport() {
  const [reportData, setReportData] = useState<MonthlyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [startDate, setStartDate] = useState<Date>(startOfMonth(new Date()));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(new Date()));
  const [itemType, setItemType] = useState<InventoryType>('ATK');
  const [activityFilter, setActivityFilter] = useState<'all' | 'incoming' | 'active'>('all');
  const [summary, setSummary] = useState({ awal: 0, masuk: 0, keluar: 0, akhir: 0 });
  const [sortField, setSortField] = useState<keyof MonthlyReportData | null>(null);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');
  const [searchTerm, setSearchTerm] = useState('');
  const { toast } = useToast();

  const handleSort = (field: keyof MonthlyReportData) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const getSortIcon = (field: keyof MonthlyReportData) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <ArrowUp className="ml-1 h-3 w-3 inline-block" /> 
      : <ArrowDown className="ml-1 h-3 w-3 inline-block" />;
  };

  const handleGenerateReport = async () => {
    const start = startOfMonth(startDate);
    const end = endOfMonth(endDate);

    if (isAfter(start, end)) {
        toast({ variant: 'destructive', title: 'Rentang Waktu Salah', description: 'Bulan mulai tidak boleh melewati bulan selesai.' });
        return;
    }

    setLoading(true);
    setReportData([]);

    try {
      // Fetch all items of this type
      const itemsQuery = query(collection(db, 'inventory'), where('type', '==', itemType));
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));

      // Fetch ALL transactions in the range
      const transactionsQuery = query(
        collection(db, 'inventory_transactions'),
        where('transactionDate', '>=', Timestamp.fromDate(start)),
        where('transactionDate', '<=', Timestamp.fromDate(end))
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactionsInRange = transactionsSnapshot.docs.map(doc => doc.data() as InventoryTransaction);
      
      const transactionsByItemCode = new Map<string, InventoryTransaction[]>();
      transactionsInRange.forEach(t => {
        const code = t.inventoryCode || t.inventoryId;
        if (code) {
          if (!transactionsByItemCode.has(code)) {
            transactionsByItemCode.set(code, []);
          }
          transactionsByItemCode.get(code)!.push(t);
        }
      });
      
      const afterRangeQuery = query(
        collection(db, 'inventory_transactions'),
        where('transactionDate', '>', Timestamp.fromDate(end))
      );
      const afterRangeSnapshot = await getDocs(afterRangeQuery);
      const transactionsAfterRange = afterRangeSnapshot.docs.map(doc => doc.data() as InventoryTransaction);
      
      const afterRangeMap = new Map<string, number>();
      transactionsAfterRange.forEach(t => {
          const change = t.action === 'in' ? t.quantity : -t.quantity;
          const code = t.inventoryCode || t.inventoryId;
          if (code) {
              afterRangeMap.set(code, (afterRangeMap.get(code) || 0) + change);
          }
      });

      let totalAwal = 0, totalMasuk = 0, totalKeluar = 0, totalAkhir = 0;

      const data: MonthlyReportData[] = items.map(item => {
        const itemTransactions = transactionsByItemCode.get(item.code) || [];
        const stockMasuk = itemTransactions.filter(t => t.action === 'in').reduce((sum, t) => sum + t.quantity, 0);
        const stockKeluar = itemTransactions.filter(t => t.action === 'out').reduce((sum, t) => sum + t.quantity, 0);
        
        let lastIncomingDate: Date | null = null;
        let lastOutgoingDate: Date | null = null;
        let lastRequesterName = '-';
        let lastRequesterDept = '-';

        itemTransactions.forEach(t => {
          const tDate = t.transactionDate?.toDate() || t.createdAt.toDate();
          if (t.action === 'in') {
            if (!lastIncomingDate || isAfter(tDate, lastIncomingDate)) lastIncomingDate = tDate;
          } else if (t.action === 'out') {
            if (!lastOutgoingDate || isAfter(tDate, lastOutgoingDate)) {
              lastOutgoingDate = tDate;
              lastRequesterName = t.requesterName || t.userName || '-';
              lastRequesterDept = t.requesterDept || '-';
            }
          }
        });

        const netChangeAfterRange = afterRangeMap.get(item.code) || 0;
        const stockAkhir = item.stock - netChangeAfterRange;
        const stockAwal = stockAkhir - (stockMasuk - stockKeluar);

        totalAwal += stockAwal;
        totalMasuk += stockMasuk;
        totalKeluar += stockKeluar;
        totalAkhir += stockAkhir;

        return {
          code: item.code,
          name: item.name,
          unit: item.unit,
          stockAwal,
          stockMasuk,
          stockKeluar,
          stockAkhir,
          lastIncomingDate,
          lastOutgoingDate,
          lastRequesterName,
          lastRequesterDept
        };
      });

      setSummary({ awal: totalAwal, masuk: totalMasuk, keluar: totalKeluar, akhir: totalAkhir });
      setReportData(data.sort((a,b) => a.code.localeCompare(b.code)));

      const startFmt = format(start, 'MMM yyyy', { locale: localeID });
      const endFmt = format(end, 'MMM yyyy', { locale: localeID });
      toast({ title: 'Laporan Dihasilkan', description: `Periode: ${startFmt} - ${endFmt}` });

    } catch (error) {
      console.error("Error generating report:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Laporan' });
    } finally {
      setLoading(false);
    }
  };

  const filteredReportData = useMemo(() => {
    let data = reportData.filter(row => {
      if (activityFilter === 'incoming') return row.stockMasuk > 0;
      if (activityFilter === 'active') return row.stockMasuk > 0 || row.stockKeluar > 0;
      return true;
    });

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      data = data.filter(row => 
        row.name.toLowerCase().includes(term) ||
        row.code.toLowerCase().includes(term)
      );
    }

    if (sortField) {
      data = [...data].sort((a, b) => {
        const aValue = a[sortField];
        const bValue = b[sortField];

        if (aValue === null || aValue === undefined) return 1;
        if (bValue === null || bValue === undefined) return -1;

        if (typeof aValue === 'number' && typeof bValue === 'number') {
          return sortDirection === 'asc' ? aValue - bValue : bValue - aValue;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortDirection === 'asc' 
            ? aValue.localeCompare(bValue) 
            : bValue.localeCompare(aValue);
        }

        return 0;
      });
    }

    return data;
  }, [reportData, activityFilter, searchTerm, sortField, sortDirection]);

  const reportRangeString = useMemo(() => {
    const startFmt = format(startDate, 'MMMM yyyy', { locale: localeID });
    const endFmt = format(endDate, 'MMMM yyyy', { locale: localeID });
    return startFmt === endFmt ? startFmt : `${startFmt} - ${endFmt}`;
  }, [startDate, endDate]);

  const handleExportExcel = () => {
    if (filteredReportData.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
      return;
    }
    const headerMapping = [
        ["PT. CHINA GLAZE INDONESIA"],
        [`LAPORAN STOK INVENTARIS - ${itemType.toUpperCase()}`],
        [`Periode: ${reportRangeString}`],
        [`Filter: ${activityFilter === 'incoming' ? 'Hanya Barang Masuk' : (activityFilter === 'active' ? 'Barang Aktif' : 'Semua Barang')}`],
        [],
        ["KODE BARANG", "NAMA BARANG", "SATUAN", "STOK AWAL", "MASUK", "KELUAR", "STOK AKHIR", "PEMINTA TERAKHIR", "UNIT PEMINTA", "TGL MASUK TERAKHIR", "TGL KELUAR TERAKHIR"]
    ];
    const body = filteredReportData.map(row => [
        row.code, row.name, row.unit, row.stockAwal, row.stockMasuk, row.stockKeluar, row.stockAkhir,
        row.lastRequesterName, row.lastRequesterDept,
        row.lastIncomingDate ? format(row.lastIncomingDate, 'dd/MM/yyyy') : '-',
        row.lastOutgoingDate ? format(row.lastOutgoingDate, 'dd/MM/yyyy') : '-'
    ]);
    const ws = XLSX.utils.aoa_to_sheet([...headerMapping, ...body]);
    ws['!cols'] = [{ wch: 15 }, { wch: 40 }, { wch: 10 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 20 }, { wch: 20 }, { wch: 20 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Stok');
    XLSX.writeFile(wb, `Laporan_Stok_${itemType.replace(/\s/g, '_')}_${reportRangeString.replace(/\s/g, '_')}.xlsx`);
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;
    const tableRows = filteredReportData.map((row, index) => `
        <tr>
            <td style="text-align: center;">${index + 1}</td>
            <td style="font-family: monospace;">${row.code}</td>
            <td>${row.name}</td>
            <td style="text-align: center;">${row.stockAwal}</td>
            <td style="text-align: center; color: green;">${row.stockMasuk > 0 ? '+' + row.stockMasuk : '0'}</td>
            <td style="text-align: center; color: red;">${row.stockKeluar > 0 ? '-' + row.stockKeluar : '0'}</td>
            <td style="text-align: center; font-weight: bold;">${row.stockAkhir}</td>
            <td>${row.lastRequesterName}<br/><small style="color: #666;">${row.lastRequesterDept}</small></td>
            <td style="text-align: center;">${row.lastIncomingDate ? format(row.lastIncomingDate, 'dd/MM/yy') : '-'}</td>
            <td style="text-align: center;">${row.lastOutgoingDate ? format(row.lastOutgoingDate, 'dd/MM/yy') : '-'}</td>
        </tr>
    `).join('');
    const html = `
        <html>
            <head>
                <title>Laporan Stok - ${itemType}</title>
                <style>
                    body { font-family: 'Inter', Arial, sans-serif; padding: 30px; color: #1a1a1a; }
                    .header { display: flex; justify-content: space-between; border-bottom: 2px solid #333; padding-bottom: 15px; margin-bottom: 25px; }
                    .title { font-size: 20px; font-weight: 900; margin: 0; color: #1e40af; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; font-size: 8.5pt; }
                    th { background: #f8fafc; border: 1px solid #cbd5e1; padding: 8px 4px; text-align: left; }
                    td { border: 1px solid #e2e8f0; padding: 6px 4px; }
                    .summary-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 20px; }
                    .summary-card { background: #f1f5f9; padding: 12px; border-radius: 8px; text-align: center; border: 1px solid #e2e8f0; }
                    .summary-card p { margin: 0; font-size: 9px; font-weight: bold; color: #64748b; text-transform: uppercase; }
                    .summary-card h2 { margin: 3px 0 0 0; font-size: 18px; }
                    @media print { @page { size: landscape; margin: 1cm; } }
                </style>
            </head>
            <body>
                <div class="header">
                    <div>
                        <h1 class="title">PT. CHINA GLAZE INDONESIA</h1>
                        <p style="margin: 5px 0; color: #666; font-size: 11px;">Inventory Report - ${itemType.toUpperCase()}</p>
                    </div>
                    <div style="text-align: right;">
                        <p style="font-weight: bold; margin: 0; font-size: 12px;">PERIODE: ${reportRangeString}</p>
                        <p style="font-size: 9px; color: #999;">Dicetak: ${format(new Date(), 'PPpp', { locale: localeID })}</p>
                    </div>
                </div>
                <div class="summary-grid">
                    <div class="summary-card"><p>Stok Awal</p><h2>${summary.awal}</h2></div>
                    <div class="summary-card"><p>Total Masuk</p><h2 style="color: green;">+${summary.masuk}</h2></div>
                    <div class="summary-card"><p>Total Keluar</p><h2 style="color: red;">-${summary.keluar}</h2></div>
                    <div class="summary-card"><p>Stok Akhir</p><h2 style="color: #1e40af;">${summary.akhir}</h2></div>
                </div>
                <table>
                    <thead><tr><th style="width: 30px;">NO</th><th>KODE</th><th>NAMA BARANG</th><th style="text-align: center;">AWAL</th><th style="text-align: center;">MASUK</th><th style="text-align: center;">KELUAR</th><th style="text-align: center;">AKHIR</th><th>PEMINTA TERAKHIR</th><th style="text-align: center;">TGL MASUK</th><th style="text-align: center;">TGL KELUAR</th></tr></thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
        </html>
    `;
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
  };

  return (
    <div className="space-y-8 max-w-full overflow-hidden pb-10 text-black">
      <div className="relative p-8 rounded-[2.5rem] bg-slate-900 text-white overflow-hidden shadow-2xl">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col xl:flex-row xl:items-end justify-between gap-6">
            <div className="space-y-2">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md">
                        <FileText className="h-8 w-8 text-primary" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-black tracking-tight uppercase text-left">Rekapitulasi Stok</h1>
                        <p className="text-white/60 font-medium text-left">Laporan inventaris per rentang waktu PT. China Glaze Indonesia.</p>
                    </div>
                </div>
            </div>
            
            <div className="flex flex-wrap items-end gap-4 p-4 bg-white/5 rounded-[2rem] border border-white/10 backdrop-blur-sm">
                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="grid gap-1.5 text-left">
                        <Label className="text-[9px] font-black uppercase text-white/40 ml-1 text-left">Dari Bulan</Label>
                        <Input 
                            type="date"
                            value={format(startDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                    const parsed = parse(val, "yyyy-MM-dd", new Date());
                                    if (isValid(parsed)) setStartDate(startOfMonth(parsed));
                                }
                            }}
                            className="h-11 bg-white/10 border-none rounded-xl w-[170px] text-white font-bold"
                        />
                    </div>
                    <div className="flex items-center pt-5"><ArrowRight className="h-4 w-4 text-white/20" /></div>
                    <div className="grid gap-1.5 text-left">
                        <Label className="text-[9px] font-black uppercase text-white/40 ml-1 text-left">Sampai Bulan</Label>
                        <Input 
                            type="date"
                            value={format(endDate, 'yyyy-MM-dd')}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val) {
                                    const parsed = parse(val, "yyyy-MM-dd", new Date());
                                    if (isValid(parsed)) setEndDate(endOfMonth(parsed));
                                }
                            }}
                            className="h-11 bg-white/10 border-none rounded-xl w-[170px] text-white font-bold"
                        />
                    </div>
                </div>

                <div className="grid gap-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-white/40 ml-1 text-left">Jenis Barang</Label>
                    <Select value={itemType} onValueChange={(v) => setItemType(v as InventoryType)}>
                        <SelectTrigger className="h-11 w-[140px] bg-white/10 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl">
                          <SelectItem value="ATK">Logistik ATK</SelectItem>
                          <SelectItem value="Sparepart">Sparepart</SelectItem>
                          <SelectItem value="Alat Kebersihan">Kebersihan</SelectItem>
                          <SelectItem value="Obat-obatan">Obat-obatan</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid gap-1.5 text-left">
                    <Label className="text-[9px] font-black uppercase text-white/40 ml-1 text-left">Filter</Label>
                    <Select value={activityFilter} onValueChange={(v) => setActivityFilter(v as any)}>
                        <SelectTrigger className="h-11 w-[160px] bg-white/10 border-none rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl"><SelectItem value="all">Semua Barang</SelectItem><SelectItem value="incoming">Barang Masuk Saja</SelectItem><SelectItem value="active">Item Aktif Saja</SelectItem></SelectContent>
                    </Select>
                </div>
                <div className="flex gap-2">
                    <Button onClick={() => { setStartDate(startOfYear(new Date())); setEndDate(endOfMonth(new Date())); }} variant="ghost" size="icon" className="h-11 w-11 rounded-xl bg-white/5 hover:bg-white/10 text-white/60"><RotateCcw className="h-4 w-4" /></Button>
                    <Button onClick={handleGenerateReport} disabled={loading} className="h-11 px-8 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tighter shadow-lg shadow-primary/20">{loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <TrendingUp className="mr-2 h-4 w-4" />}Generate</Button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard title="Stok Awal Periode" value={summary.awal} icon={Package} color="bg-slate-700" />
        <StatCard title="Masuk (Range)" value={"+ " + summary.masuk} icon={ArrowUpRight} color="bg-emerald-600" subValue="+ Total" />
        <StatCard title="Keluar (Range)" value={"- " + summary.keluar} icon={ArrowDownRight} color="bg-rose-600" subValue="- Total" />
        <StatCard title="Stok Akhir Periode" value={summary.akhir} icon={Scale} color="bg-primary" />
      </div>

      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="px-10 pt-10 pb-6 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="text-left">
                <div className="flex items-center gap-3 text-left"><Filter className="h-5 w-5 text-primary" /><CardTitle className="text-xl font-black uppercase tracking-tight text-left text-black">Detail Pergerakan Rentang Waktu</CardTitle></div>
                <CardDescription className="font-medium uppercase text-[10px] tracking-widest mt-1 text-left">Menampilkan data dari {reportRangeString}</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row items-center gap-4 w-full lg:w-auto">
                <div className="relative w-full sm:w-64 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                    <Input
                        placeholder="Cari nama/kode..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-10 pl-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-sm text-black"
                    />
                </div>
                <div className="flex gap-2 shrink-0 w-full sm:w-auto justify-end">
                    <Button onClick={handlePrint} disabled={filteredReportData.length === 0} variant="outline" className="h-10 px-6 rounded-xl border-slate-200 font-bold hover:bg-slate-50 transition-all bg-white shadow-sm text-black"><Printer className="mr-2 h-4 w-4 text-primary" /> Cetak PDF</Button>
                    <Button onClick={handleExportExcel} disabled={filteredReportData.length === 0} className="h-10 px-6 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold shadow-lg shadow-emerald-600/20"><FileSpreadsheet className="mr-2 h-4 w-4" /> Export Excel</Button>
                </div>
            </div>
        </CardHeader>
        <CardContent className="px-10 pb-10">
            <div className="border rounded-[2rem] overflow-hidden shadow-inner bg-white dark:bg-slate-950">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead onClick={() => handleSort('name')} className="pl-8 text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">
                                <div className="flex items-center gap-1">Identitas Barang {getSortIcon('name')}</div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('stockAwal')} className="text-center text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">
                                <div className="flex items-center justify-center gap-1">Awal {getSortIcon('stockAwal')}</div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('stockMasuk')} className="text-center text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">
                                <div className="flex items-center justify-center gap-1">Masuk {getSortIcon('stockMasuk')}</div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('stockKeluar')} className="text-center text-[10px] font-black uppercase tracking-widest cursor-pointer hover:text-primary transition-colors">
                                <div className="flex items-center justify-center gap-1">Keluar {getSortIcon('stockKeluar')}</div>
                            </TableHead>
                            <TableHead onClick={() => handleSort('stockAkhir')} className="text-center text-[10px] font-black uppercase tracking-widest text-primary cursor-pointer hover:text-primary transition-colors">
                                <div className="flex items-center justify-center gap-1">Saldo Akhir {getSortIcon('stockAkhir')}</div>
                            </TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Penerima Terakhir</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Tgl Masuk (Terakhir)</TableHead>
                            <TableHead className="text-center pr-8 text-[10px] font-black uppercase tracking-widest">Tgl Keluar (Terakhir)</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? Array.from({ length: 5 }).map((_, i) => (<TableRow key={i}><TableCell colSpan={8} className="p-6"><Skeleton className="h-10 w-full rounded-2xl" /></TableCell></TableRow>))
                        : filteredReportData.length > 0 ? filteredReportData.map((row) => (
                                <TableRow key={row.code} className="h-20 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-100 dark:border-slate-800">
                                    <TableCell className="pl-8 text-left"><div className="flex flex-col text-left"><span className="font-bold text-sm text-slate-900 dark:text-white uppercase truncate max-w-[200px] text-left">{row.name}</span><span className="text-[10px] font-mono text-primary font-bold uppercase text-left">{row.code} • {row.unit}</span></div></TableCell>
                                    <TableCell className="text-center font-bold text-slate-500">{row.stockAwal}</TableCell>
                                    <TableCell className="text-center"><span className="text-emerald-600 font-black text-sm">{row.stockMasuk > 0 ? `+${row.stockMasuk}` : '0'}</span></TableCell>
                                    <TableCell className="text-center"><span className="text-rose-600 font-black text-sm">{row.stockKeluar > 0 ? `-${row.stockKeluar}` : '0'}</span></TableCell>
                                    <TableCell className="text-center"><span className="text-base font-black text-slate-900 dark:text-white">{row.stockAkhir}</span></TableCell>
                                    <TableCell><div className="flex flex-col items-center min-w-[120px]">{row.stockKeluar > 0 ? <><div className="flex items-center gap-1 text-slate-900 dark:text-white"><User className="h-2.5 w-2.5 text-primary" /><span className="text-[10px] font-black uppercase truncate max-w-[100px]">{row.lastRequesterName}</span></div><div className="flex items-center gap-1 opacity-50 mt-0.5"><Building className="h-2.5 w-2.5" /><span className="text-[9px] font-bold uppercase truncate max-w-[100px]">{row.lastRequesterDept}</span></div></> : <span className="text-muted-foreground text-[10px]">-</span>}</div></TableCell>
                                    <TableCell className="text-center">{row.lastIncomingDate ? <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">{format(row.lastIncomingDate, 'dd/MM/yyyy')}</span> : <span className="text-[10px] text-muted-foreground">-</span>}</TableCell>
                                    <TableCell className="text-center pr-8">{row.lastOutgoingDate ? <span className="text-[10px] font-bold text-slate-900 dark:text-white uppercase">{format(row.lastOutgoingDate, 'dd/MM/yyyy')}</span> : <span className="text-[10px] text-muted-foreground">-</span>}</TableCell>
                                </TableRow>
                            ))
                        : <TableRow><TableCell colSpan={8} className="h-48 text-center"><div className="flex flex-col items-center gap-2 opacity-20"><Scale className="h-12 w-12" /><p className="font-black uppercase tracking-[0.2em] text-sm italic">Gunakan tombol Generate untuk memuat data laporan</p></div></TableCell></TableRow>}
                    </TableBody>
                </Table>
            </div>
        </CardContent>
        <CardFooter className="px-10 py-6 bg-slate-50 dark:bg-slate-950/50 border-t flex items-center justify-between">
            <div className="flex items-center gap-2 text-left">
                <CheckCircle2 className="text-emerald-600 h-5 w-5" />
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">Data rekapitulasi dihasilkan secara sistematis berdasarkan log transaksi yang diverifikasi.</p>
            </div>
        </CardFooter>
      </Card>
    </div>
  );
}
