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
  Clock, 
  History, 
  Search, 
  AlertTriangle,
  Loader2,
  Check,
  X
} from 'lucide-react';
import { format, formatDistanceToNow, differenceInDays } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { Input } from '@/components/ui/input';
import { useAuth } from '@/hooks/use-auth';

export default function RecycleBinList() {
  const [items, setItems] = useState<RecycledItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
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
      toast({ title: 'Data Dipulihkan', description: `"${item.label}" telah dikembalikan ke asalnya.` });
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
      toast({ title: 'Hapus Permanen', description: 'Data telah dibersihkan dari server.' });
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Permanent delete failed:", error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.label?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.deletedByName?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [items, searchTerm]);

  const getCollectionBadge = (col: string) => {
    switch (col) {
      case 'assets': return <Badge variant="outline" className="bg-blue-50 text-blue-700 font-black border-blue-200">ASET</Badge>;
      case 'inventory': return <Badge variant="outline" className="bg-emerald-50 text-emerald-700 font-black border-emerald-200">INVENTARIS</Badge>;
      case 'helpdesk_tickets': return <Badge variant="outline" className="bg-purple-50 text-purple-700 font-black border-purple-200">HELPDESK</Badge>;
      case 'it_problem_reports': return <Badge variant="outline" className="bg-amber-50 text-amber-700 font-black border-amber-200">LAPORAN IT</Badge>;
      default: return <Badge variant="outline">{col}</Badge>;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
        <div className="relative w-full sm:w-96 group">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input 
            placeholder="Cari label atau penghapus..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 h-11 rounded-xl shadow-sm border-slate-200 bg-white"
          />
        </div>
        <div className="flex items-center gap-3 p-3 bg-amber-50 rounded-2xl border border-amber-100 shadow-inner">
            <AlertTriangle className="h-5 w-5 text-amber-600" />
            <p className="text-[10px] font-black uppercase text-amber-900 tracking-wider">Masa Aktif Penampungan: 30 Hari</p>
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[2rem] overflow-hidden bg-white/80 backdrop-blur-md">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-slate-50 h-14">
              <TableRow className="border-none">
                <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest text-left">Jenis Data</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Label Objek</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Dihapus Oleh</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Waktu Hapus</TableHead>
                <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Sisa Waktu</TableHead>
                <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={6} className="p-6"><Skeleton className="h-10 w-full rounded-2xl" /></TableCell></TableRow>
                ))
              ) : filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const daysLeft = 30 - differenceInDays(new Date(), item.deletedAt.toDate());
                  const isBeingDeleted = confirmDeleteId === item.id;

                  return (
                    <TableRow key={item.id} className="h-20 hover:bg-slate-50 transition-colors border-slate-100 group">
                      <TableCell className="pl-8 text-left">{getCollectionBadge(item.originalCollection)}</TableCell>
                      <TableCell className="text-left font-bold text-sm text-slate-900 uppercase truncate max-w-[250px]">{item.label}</TableCell>
                      <TableCell className="text-left">
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary" className="rounded-full h-6 w-6 p-0 flex items-center justify-center font-black">{item.deletedByName?.[0]}</Badge>
                          <span className="text-[11px] font-bold uppercase">{item.deletedByName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-left">
                        <div className="flex flex-col text-left">
                          <span className="text-xs font-black">{format(item.deletedAt.toDate(), 'dd/MM/yy HH:mm')}</span>
                          <span className="text-[9px] font-bold text-muted-foreground uppercase">{formatDistanceToNow(item.deletedAt.toDate(), { addSuffix: true, locale: localeID })}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={daysLeft < 5 ? "destructive" : "outline"} className="font-black text-[9px] uppercase tracking-tighter">
                          {daysLeft} Hari Lagi
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right pr-8">
                        <div className="flex justify-end gap-2 items-center">
                          {!isBeingDeleted ? (
                            <>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => handleRestore(item)}
                                disabled={!!isProcessing}
                                className="h-9 rounded-xl border-emerald-100 text-emerald-700 hover:bg-emerald-50 text-[10px] font-black uppercase tracking-widest px-4"
                              >
                                {isProcessing === item.id ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <RotateCcw className="h-3 w-3 mr-1" />}
                                Restore
                              </Button>
                              <Button 
                                variant="ghost" 
                                size="icon" 
                                onClick={() => setConfirmDeleteId(item.id)}
                                disabled={!!isProcessing}
                                className="h-9 w-9 rounded-xl text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                title="Hapus Permanen"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                <Button 
                                    size="icon" 
                                    variant="ghost" 
                                    className="h-9 w-9 rounded-full text-slate-400 hover:text-slate-600"
                                    onClick={() => setConfirmDeleteId(null)}
                                    disabled={!!isProcessing}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                                <Button 
                                    size="icon" 
                                    className="h-9 w-9 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
                                    onClick={() => handlePermanentDelete(item.id)}
                                    disabled={!!isProcessing}
                                >
                                    {isProcessing === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                </Button>
                            </div>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center">
                    <div className="flex flex-col items-center gap-3 opacity-20">
                      <History className="h-12 w-12" />
                      <p className="font-black uppercase tracking-[0.2em] text-sm">Tempat Sampah Kosong</p>
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
