'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, query, onSnapshot, orderBy, doc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type RecycledItem } from '@/lib/types';
import { restoreDocument, permanentDelete } from '@/lib/recycle-bin-utils';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { 
  RotateCcw, 
  Trash2, 
  History, 
  Search, 
  AlertTriangle,
  Loader2,
  Check,
  X,
  Info,
  Layers
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function RecycleBinList() {
  const [items, setItems] = useState<RecycledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const q = query(collection(db, 'recycle_bin'), orderBy('deletedAt', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as RecycledItem));
      setItems(data);
      setLoading(false);
      
      // Auto-cleanup items older than 30 days
      const expiredItems = data.filter(item => {
        if (!item.deletedAt) return false;
        const deletedAt = item.deletedAt.toDate();
        return differenceInDays(new Date(), deletedAt) >= 30;
      });

      if (expiredItems.length > 0) {
        handleAutoCleanup(expiredItems);
      }
    });

    return () => unsubscribe();
  }, []);

  const handleAutoCleanup = async (expiredItems: RecycledItem[]) => {
    const batch = writeBatch(db);
    expiredItems.forEach(item => {
      batch.delete(doc(db, 'recycle_bin', item.id));
    });
    try {
      await batch.commit();
      toast({
        title: 'Pembersihan Otomatis',
        description: `${expiredItems.length} data yang sudah lebih dari 30 hari telah dihapus permanen.`,
      });
    } catch (e) {
      console.error("Auto-cleanup failed:", e);
    }
  };

  const handleRestore = async (item: RecycledItem) => {
    if (!user) return;
    setIsProcessing(item.id);
    try {
      await restoreDocument(db, item.id, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({ title: 'Data Dipulihkan', description: `"${item.label}" telah dikembalikan ke modul asalnya.` });
    } catch (error) {
      console.error("Restore failed:", error);
      toast({ variant: 'destructive', title: 'Gagal Memulihkan' });
    } finally {
      setIsProcessing(null);
    }
  };

  const handlePermanentDelete = async (id: string) => {
    if (!user) return;
    setIsProcessing(id);
    try {
      await permanentDelete(db, id, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({ title: 'Hapus Permanen', description: 'Data telah dibersihkan sepenuhnya dari server.' });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Permanent delete failed:", error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => {
      const matchSearch = 
        item.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.deletedByName?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchCategory = selectedFilter === 'all' || item.originalCollection === selectedFilter;

      return matchSearch && matchCategory;
    });
  }, [items, searchTerm, selectedFilter]);

  const getCollectionBadge = (col: string) => {
    switch (col) {
      case 'assets': 
        return <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">ASET</Badge>;
      case 'inventory': 
        return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">INVENTARIS</Badge>;
      case 'inventory_requests': 
        return <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">PERMINTAAN BARANG</Badge>;
      case 'maintenance_schedules': 
        return <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">MAINTENANCE</Badge>;
      case 'helpdesk_tickets': 
        return <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">HELPDESK</Badge>;
      case 'it_problem_reports': 
        return <Badge variant="outline" className="bg-rose-50 text-rose-700 border-rose-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">LAPORAN IT</Badge>;
      case 'it_assets': 
        return <Badge variant="outline" className="bg-indigo-50 text-indigo-700 border-indigo-200 text-[10px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-lg">DETAIL IT</Badge>;
      default: 
        return <Badge variant="outline" className="text-[10px] font-black uppercase">{col}</Badge>;
    }
  };

  const getItemSubDetails = (item: RecycledItem) => {
    const d = item.data || {};
    const parts: string[] = [];

    if (item.originalCollection === 'inventory_requests') {
      if (d.quantity) parts.push(`Jumlah: ${d.quantity}`);
      if (d.requestingUserName) parts.push(`Peminta: ${d.requestingUserName}${d.requestingDept ? ` (${d.requestingDept})` : ''}`);
      if (d.notes) parts.push(`Catatan: ${d.notes}`);
    } else if (item.originalCollection === 'maintenance_schedules') {
      if (d.type) parts.push(`Jenis: ${d.type}`);
      if (d.technician) parts.push(`Teknisi: ${d.technician}`);
      if (d.department) parts.push(`Dept: ${d.department}`);
      if (d.notes) parts.push(`Catatan: ${d.notes}`);
    } else if (item.originalCollection === 'assets') {
      if (d.category) parts.push(`Kategori: ${d.category}`);
      if (d.department) parts.push(`Dept: ${d.department}`);
      if (d.currentUser) parts.push(`Pengguna: ${d.currentUser}`);
    } else if (item.originalCollection === 'inventory') {
      if (d.stock !== undefined) parts.push(`Stok Terakhir: ${d.stock} ${d.unit || ''}`);
      if (d.category) parts.push(`Kategori: ${d.category}`);
    } else if (item.originalCollection === 'helpdesk_tickets') {
      if (d.reportedByName) parts.push(`Pelapor: ${d.reportedByName}`);
      if (d.department) parts.push(`Dept: ${d.department}`);
    }

    if (parts.length === 0) return null;
    return parts.join(' • ');
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Filters */}
      <div className="flex flex-col md:flex-row gap-4 items-stretch md:items-center justify-between">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <Input 
            placeholder="Cari nama data, kode, atau penghapus..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-11 h-12 rounded-2xl shadow-sm border-slate-200 bg-white font-medium text-sm focus:border-primary"
          />
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-amber-500/10 border border-amber-500/20 px-4 h-12 rounded-2xl">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span className="text-xs font-black text-amber-900 uppercase tracking-tight">Penampungan 30 Hari</span>
          </div>
        </div>
      </div>

      {/* Main Table Card */}
      <Card className="border border-slate-200/80 shadow-xl rounded-[2rem] overflow-hidden bg-white">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50/80 h-14 border-b border-slate-100">
              <TableRow className="border-none">
                <TableHead className="pl-6 uppercase text-[10px] font-black tracking-widest text-slate-500 text-left w-36">Kategori Data</TableHead>
                <TableHead className="uppercase text-[10px] font-black tracking-widest text-slate-500 text-left">Rincian Dokumen</TableHead>
                <TableHead className="uppercase text-[10px] font-black tracking-widest text-slate-500 text-left w-44">Dihapus Oleh</TableHead>
                <TableHead className="uppercase text-[10px] font-black tracking-widest text-slate-500 text-left w-36">Tanggal Hapus</TableHead>
                <TableHead className="uppercase text-[10px] font-black tracking-widest text-slate-500 text-center w-28">Sisa Waktu</TableHead>
                <TableHead className="text-right pr-6 uppercase text-[10px] font-black tracking-widest text-slate-500 w-44">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={6} className="p-5">
                      <Skeleton className="h-12 w-full rounded-2xl" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const daysLeft = 30 - differenceInDays(new Date(), item.deletedAt.toDate());
                  const isBeingDeleted = confirmDeleteId === item.id;
                  const subDetails = getItemSubDetails(item);

                  return (
                    <TableRow key={item.id} className="hover:bg-slate-50/70 transition-colors border-b border-slate-100 group py-4">
                      {/* Kategori Data */}
                      <TableCell className="pl-6 align-top pt-4">
                        {getCollectionBadge(item.originalCollection)}
                      </TableCell>

                      {/* Rincian Dokumen (Tanpa Truncate / Potong Teks) */}
                      <TableCell className="align-top pt-4 text-left">
                        <div className="flex flex-col text-left space-y-1">
                          <span className="font-bold text-sm text-slate-900 leading-snug break-words uppercase">
                            {item.label}
                          </span>
                          {subDetails && (
                            <span className="text-[11px] font-semibold text-slate-500 leading-relaxed break-words bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100 w-fit text-left">
                              {subDetails}
                            </span>
                          )}
                        </div>
                      </TableCell>

                      {/* Dihapus Oleh */}
                      <TableCell className="align-top pt-4 text-left">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center font-black text-xs text-slate-700 shrink-0">
                            {item.deletedByName?.[0]?.toUpperCase() || 'A'}
                          </div>
                          <span className="text-xs font-bold text-slate-800 uppercase tracking-tight truncate max-w-[130px]">
                            {item.deletedByName || 'Admin'}
                          </span>
                        </div>
                      </TableCell>

                      {/* Tanggal Hapus */}
                      <TableCell className="align-top pt-4 text-left">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-bold text-slate-900">
                            {format(item.deletedAt.toDate(), 'dd/MM/yyyy HH:mm')}
                          </span>
                          <span className="text-[10px] font-semibold text-muted-foreground uppercase">
                            {formatDistanceToNow(item.deletedAt.toDate(), { addSuffix: true, locale: localeID })}
                          </span>
                        </div>
                      </TableCell>

                      {/* Sisa Waktu */}
                      <TableCell className="align-top pt-4 text-center">
                        <Badge 
                          variant={daysLeft < 5 ? "destructive" : "outline"} 
                          className="font-black text-[10px] uppercase tracking-wider px-2.5 py-1 rounded-lg border-slate-200 shadow-sm"
                        >
                          {daysLeft} Hari
                        </Badge>
                      </TableCell>

                      {/* Akses Tindakan */}
                      <TableCell className="align-top pt-4 text-right pr-6">
                        <div className="flex justify-end gap-2 items-center">
                          {!isBeingDeleted ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRestore(item)}
                                disabled={!!isProcessing}
                                className="h-9 rounded-xl border-emerald-200 text-emerald-700 hover:bg-emerald-600 hover:text-white text-[10px] font-black uppercase tracking-wider px-3.5 shadow-sm transition-all"
                              >
                                {isProcessing === item.id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5 mr-1.5" />
                                )}
                                Pulihkan
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setConfirmDeleteId(item.id)}
                                disabled={!!isProcessing}
                                className="h-9 w-9 rounded-xl text-rose-500 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                                title="Hapus Permanen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in-95 duration-200">
                              <Button 
                                size="icon" 
                                variant="ghost" 
                                className="h-9 w-9 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
                                onClick={() => setConfirmDeleteId(null)}
                                disabled={!!isProcessing}
                                title="Batal"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                              <Button 
                                size="icon" 
                                className="h-9 w-9 rounded-xl bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-600/20"
                                onClick={() => handlePermanentDelete(item.id)}
                                disabled={!!isProcessing}
                                title="Konfirmasi Hapus Permanen"
                              >
                                {isProcessing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                              </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-56 text-center">
                    <div className="flex flex-col items-center justify-center gap-3 opacity-30 py-8">
                      <History className="h-14 w-14 text-slate-400" />
                      <p className="font-black uppercase tracking-[0.2em] text-xs text-slate-600">Tempat Sampah Kosong</p>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
