'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, where, getDocs, Timestamp, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryItem, type InventoryTransaction, type InventoryType } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, CalendarIcon, Printer } from 'lucide-react';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import * as XLSX from 'xlsx';
import { Label } from '@/components/ui/label';

interface MonthlyReportData {
  code: string;
  name: string;
  unit: string;
  stockAwal: number;
  stockMasuk: number;
  stockKeluar: number;
  stockAkhir: number;
}

export default function InventoryReport() {
  const [reportData, setReportData] = useState<MonthlyReportData[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState<Date>(new Date());
  const [itemType, setItemType] = useState<InventoryType>('ATK');
  const { toast } = useToast();

  const handleGenerateReport = async () => {
    setLoading(true);
    setReportData([]);

    try {
      const start = startOfMonth(date);
      const end = endOfMonth(date);

      // 1. Get all relevant items
      const itemsQuery = query(collection(db, 'inventory'), where('type', '==', itemType));
      const itemsSnapshot = await getDocs(itemsQuery);
      const items = itemsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));

      // 2. Get all transactions within the month
      const transactionsQuery = query(
        collection(db, 'inventory_transactions'),
        where('createdAt', '>=', Timestamp.fromDate(start)),
        where('createdAt', '<=', Timestamp.fromDate(end))
      );
      const transactionsSnapshot = await getDocs(transactionsQuery);
      const transactions = transactionsSnapshot.docs.map(doc => doc.data() as InventoryTransaction);
      
      const transactionsByItemId = new Map<string, InventoryTransaction[]>();
      transactions.forEach(t => {
        if (!transactionsByItemId.has(t.inventoryId)) {
          transactionsByItemId.set(t.inventoryId, []);
        }
        transactionsByItemId.get(t.inventoryId)!.push(t);
      });
      
      // 3. Get all transactions before the start of the month to calculate initial stock
      const priorTransactionsQuery = query(
        collection(db, 'inventory_transactions'),
        where('createdAt', '<', Timestamp.fromDate(start))
      );
      const priorTransactionsSnapshot = await getDocs(priorTransactionsQuery);
      const priorTransactions = priorTransactionsSnapshot.docs.map(doc => doc.data() as InventoryTransaction);

      const stockAdjustments = new Map<string, number>();
      priorTransactions.forEach(t => {
        const adjustment = t.action === 'in' ? t.quantity : -t.quantity;
        stockAdjustments.set(t.inventoryId, (stockAdjustments.get(t.inventoryId) || 0) + adjustment);
      });

      // 4. Calculate report data for each item
      const data: MonthlyReportData[] = items.map(item => {
        const monthlyTransactions = transactionsByItemId.get(item.id) || [];
        const stockMasuk = monthlyTransactions.filter(t => t.action === 'in').reduce((sum, t) => sum + t.quantity, 0);
        const stockKeluar = monthlyTransactions.filter(t => t.action === 'out').reduce((sum, t) => sum + t.quantity, 0);
        
        // Stok akhir dari DB dikurangi semua transaksi setelah awal bulan, untuk mendapatkan stok awal bulan
        const totalStockChangeSinceStart = stockMasuk - stockKeluar;
        const stockAwal = item.stock - totalStockChangeSinceStart;
        
        const stockAkhir = stockAwal + stockMasuk - stockKeluar;

        return {
          code: item.code,
          name: item.name,
          unit: item.unit,
          stockAwal,
          stockMasuk,
          stockKeluar,
          stockAkhir,
        };
      });

      setReportData(data.sort((a,b) => a.code.localeCompare(b.code)));

    } catch (error) {
      console.error("Error generating report:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Laporan' });
    } finally {
      setLoading(false);
    }
  };

  const handleExportExcel = () => {
    if (reportData.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
      return;
    }
    
    const ws = XLSX.utils.json_to_sheet(reportData, {
        header: ["Kode Barang", "Nama Barang", "Satuan", "Stok Awal", "Stok Masuk", "Stok Keluar", "Stok Akhir"],
    });

    const headerMapping = {
        'code': 'Kode Barang',
        'name': 'Nama Barang',
        'unit': 'Satuan',
        'stockAwal': 'Stok Awal',
        'stockMasuk': 'Stok Masuk',
        'stockKeluar': 'Stok Keluar',
        'stockAkhir': 'Stok Akhir',
    };
    
    // Create a new worksheet with the correct headers
    const dataWithHeaders = [headerMapping, ...reportData.map(row => ({
        code: row.code,
        name: row.name,
        unit: row.unit,
        stockAwal: row.stockAwal,
        stockMasuk: row.stockMasuk,
        stockKeluar: row.stockKeluar,
        stockAkhir: row.stockAkhir,
    }))];
    
    const ws_new = XLSX.utils.json_to_sheet(dataWithHeaders, { skipHeader: true });

    ws_new['!cols'] = [
        { wch: 15 }, { wch: 35 }, { wch: 10 }, { wch: 10 },
        { wch: 10 }, { wch: 10 }, { wch: 10 },
    ];
    
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws_new, 'Laporan Stok');
    
    const monthYear = format(date, 'MMMM-yyyy', { locale: localeID });
    XLSX.writeFile(wb, `Laporan_Stok_${itemType}_${monthYear}.xlsx`);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Laporan Stok Bulanan</CardTitle>
        <CardDescription>Generate laporan pergerakan stok untuk periode bulan tertentu.</CardDescription>
        <div className="flex flex-wrap gap-4 items-end pt-4">
          <div className="grid gap-2">
            <Label>Pilih Bulan & Tahun</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {format(date, 'MMMM yyyy', { locale: localeID })}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  initialFocus
                  captionLayout="dropdown-buttons"
                  fromYear={2020}
                  toYear={new Date().getFullYear()}
                />
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid gap-2">
            <Label>Tipe Barang</Label>
            <Select value={itemType} onValueChange={(v) => setItemType(v as InventoryType)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Pilih tipe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ATK">ATK</SelectItem>
                <SelectItem value="Sparepart">Sparepart</SelectItem>
                <SelectItem value="Alat Kebersihan">Alat Kebersihan</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleGenerateReport} disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Generate Laporan
          </Button>
           <Button onClick={handleExportExcel} disabled={reportData.length === 0} variant="secondary">
            <Printer className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kode Barang</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead>Stok Awal</TableHead>
              <TableHead>Masuk</TableHead>
              <TableHead>Keluar</TableHead>
              <TableHead>Stok Akhir</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow><TableCell colSpan={7}><Skeleton className="h-24 w-full" /></TableCell></TableRow>
            ) : reportData.length > 0 ? (
              reportData.map((row) => (
                <TableRow key={row.code}>
                  <TableCell>{row.code}</TableCell>
                  <TableCell>{row.name}</TableCell>
                  <TableCell>{row.unit}</TableCell>
                  <TableCell>{row.stockAwal}</TableCell>
                  <TableCell className="text-green-600">{row.stockMasuk > 0 ? `+${row.stockMasuk}` : 0}</TableCell>
                  <TableCell className="text-red-600">{row.stockKeluar > 0 ? `-${row.stockKeluar}`: 0}</TableCell>
                  <TableCell className="font-bold">{row.stockAkhir}</TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center">
                  Silakan generate laporan untuk melihat data.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
