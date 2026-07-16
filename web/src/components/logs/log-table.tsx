'use client';

/**
 * @fileOverview Komponen Tabel Log Aktivitas (Sesi LOG).
 * Menampilkan gabungan log sistem dan transaksi inventaris.
 * Menampilkan Tanggal Transaksi khusus untuk log inventaris.
 * Fitur: Pembersihan otomatis data yang berusia lebih dari 30 hari.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, orderBy, limit, getDocs, where, writeBatch, doc, Timestamp, startAfter } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type SystemLog, type InventoryTransaction } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { 
  Search, 
  History, 
  Package, 
  Archive, 
  User, 
  Clock, 
  Filter, 
  ArrowUpRight, 
  ArrowDownRight, 
  Info,
  ShieldCheck,
  Calendar,
  Trash2,
  Loader2
} from 'lucide-react';
import { format, subDays } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Skeleton } from '../ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function LogTable() {
  const [systemLogs, setSystemLogs] = useState<SystemLog[]>([]);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('system');
  const { toast } = useToast();
  const { user } = useAuth();

  // Pagination states
  const [lastSystemDoc, setLastSystemDoc] = useState<any>(null);
  const [lastInventoryDoc, setLastInventoryDoc] = useState<any>(null);
  const [hasMoreSystem, setHasMoreSystem] = useState(true);
  const [hasMoreInventory, setHasMoreInventory] = useState(true);

  const PAGE_SIZE = 25;

  const fetchLogs = async (tab: string, loadMore = false) => {
    if (loadMore) {
      setLoadingMore(true);
    } else {
      setLoading(true);
    }

    try {
      if (tab === 'system') {
        let q = query(
          collection(db, 'system_logs'),
          orderBy('timestamp', 'desc'),
          limit(PAGE_SIZE)
        );

        if (loadMore && lastSystemDoc) {
          q = query(
            collection(db, 'system_logs'),
            orderBy('timestamp', 'desc'),
            startAfter(lastSystemDoc),
            limit(PAGE_SIZE)
          );
        }

        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as SystemLog));
        
        if (loadMore) {
          setSystemLogs(prev => [...prev, ...docs]);
        } else {
          setSystemLogs(docs);
        }

        if (snap.docs.length < PAGE_SIZE) {
          setHasMoreSystem(false);
        } else {
          setHasMoreSystem(true);
          setLastSystemDoc(snap.docs[snap.docs.length - 1]);
        }
      } else {
        let q = query(
          collection(db, 'inventory_transactions'),
          orderBy('createdAt', 'desc'),
          limit(PAGE_SIZE)
        );

        if (loadMore && lastInventoryDoc) {
          q = query(
            collection(db, 'inventory_transactions'),
            orderBy('createdAt', 'desc'),
            startAfter(lastInventoryDoc),
            limit(PAGE_SIZE)
          );
        }

        const snap = await getDocs(q);
        const docs = snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryTransaction));

        if (loadMore) {
          setInventoryLogs(prev => [...prev, ...docs]);
        } else {
          setInventoryLogs(docs);
        }

        if (snap.docs.length < PAGE_SIZE) {
          setHasMoreInventory(false);
        } else {
          setHasMoreInventory(true);
          setLastInventoryDoc(snap.docs[snap.docs.length - 1]);
        }
      }
    } catch (error) {
      console.error("Error fetching logs:", error);
      toast({ variant: 'destructive', title: 'Gagal Memuat Log' });
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  };

  useEffect(() => {
    setLastSystemDoc(null);
    setLastInventoryDoc(null);
    setHasMoreSystem(true);
    setHasMoreInventory(true);
    fetchLogs(activeTab, false);
  }, [activeTab]);

  useEffect(() => {
    if (user?.role === 'Admin') {
      handleAutoCleanup();
    }
  }, [user]);

  const handleAutoCleanup = async () => {
    const thirtyDaysAgo = subDays(new Date(), 30);
    const batch = writeBatch(db);
    let deletedCount = 0;

    try {
      // Cleanup system_logs
      const systemLogsQuery = query(
        collection(db, 'system_logs'),
        where('timestamp', '<', Timestamp.fromDate(thirtyDaysAgo)),
        limit(100)
      );
      const systemLogsSnap = await getDocs(systemLogsQuery);
      systemLogsSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedCount++;
      });

      // Cleanup inventory_transactions
      const inventoryTransQuery = query(
        collection(db, 'inventory_transactions'),
        where('createdAt', '<', Timestamp.fromDate(thirtyDaysAgo)),
        limit(100)
      );
      const inventoryTransSnap = await getDocs(inventoryTransQuery);
      inventoryTransSnap.forEach((d) => {
        batch.delete(d.ref);
        deletedCount++;
      });

      if (deletedCount > 0) {
        await batch.commit();
        toast({
          title: 'Pembersihan Otomatis',
          description: `${deletedCount} catatan log lama (>30 hari) telah dihapus untuk optimasi sistem.`,
        });
      }
    } catch (error) {
      console.error("Auto-cleanup logs failed:", error);
    }
  };

  const filteredSystemLogs = useMemo(() => {
    return systemLogs.filter(log => 
      log.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.targetCode?.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [systemLogs, searchTerm]);

  const filteredInventoryLogs = useMemo(() => {
    return inventoryLogs.filter(log => 
      log.inventoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.inventoryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.userName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [inventoryLogs, searchTerm]);

  const getLogTypeVariant = (type: SystemLog['type']) => {
    switch (type) {
      case 'ASSET': return 'default';
      case 'INVENTORY': return 'secondary';
      case 'USER': return 'outline';
      case 'MAINTENANCE': return 'warning';
      default: return 'outline';
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
        <div className="space-y-1 text-left">
          <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase italic text-left">Audit Session Log</h1>
          <p className="text-sm text-muted-foreground font-medium text-left">Rekaman riwayat aktivitas dan transaksi sistem terpusat.</p>
        </div>
        <div className="relative w-full md:w-80">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
          <Input 
            placeholder="Cari log atau user..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-12 pl-11 rounded-2xl border-slate-200 shadow-inner bg-white font-medium text-black"
          />
        </div>
      </div>

      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
        <CardHeader className="p-8 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
              <TabsList className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-[2rem] h-auto flex w-fit shadow-inner border border-slate-200">
                <TabsTrigger value="system" className="rounded-[1.7rem] px-10 font-black text-xs uppercase tracking-widest py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary transition-all">
                  System Activity
                </TabsTrigger>
                <TabsTrigger value="inventory" className="rounded-[1.7rem] px-10 font-black text-xs uppercase tracking-widest py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary transition-all">
                  Inventory Trans
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-950/20 px-4 py-2 rounded-2xl border border-amber-100 dark:border-amber-900/50">
              <Clock className="h-4 w-4 text-amber-600" />
              <p className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200 tracking-wider">Auto-Delete: 30 Hari</p>
            </div>
          </div>
        </CardHeader>
        
        <CardContent className="p-8 pt-4">
          {activeTab === 'system' ? (
            <div className="border rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow className="h-14 border-none">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest">Waktu</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Tipe</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Deskripsi</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">User</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Target</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={5} className="p-6"><Skeleton className="h-10 w-full rounded-2xl" /></TableCell></TableRow>
                    ))
                  ) : filteredSystemLogs.length > 0 ? (
                    filteredSystemLogs.map((log) => (
                      <TableRow key={log.id} className="h-16 hover:bg-slate-50 transition-colors border-slate-50 dark:border-slate-800">
                        <TableCell className="pl-8">
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-left">{format(log.timestamp.toDate(), 'HH:mm')}</span>
                            <span className="text-[9px] text-muted-foreground font-bold text-left">{format(log.timestamp.toDate(), 'dd MMM yyyy')}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant={getLogTypeVariant(log.type)} className="text-[9px] font-black uppercase tracking-tighter">
                            {log.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <p className="text-xs font-bold text-slate-700 dark:text-slate-200 text-left">{log.description}</p>
                          <p className="text-[9px] font-medium text-muted-foreground uppercase text-left">{log.action}</p>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2 text-left">
                            <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center shrink-0"><User className="h-3 w-3 text-primary" /></div>
                            <div className="flex flex-col text-left">
                              <span className="text-xs font-black uppercase tracking-tight text-left">{log.userName}</span>
                              <span className="text-[9px] font-bold text-muted-foreground text-left">{log.userDept}</span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="text-right pr-8 font-mono font-bold text-[10px] text-primary">
                          {log.targetCode || '-'}
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={5} className="h-40 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-30">Belum ada catatan aktivitas sistem.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {hasMoreSystem && (
                <div className="p-4 border-t flex justify-center bg-slate-50/50 dark:bg-slate-900/50">
                  <Button 
                    onClick={() => fetchLogs('system', true)} 
                    disabled={loading || loadingMore}
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
                  >
                    {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Muat Lebih Banyak
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <div className="border rounded-[2rem] overflow-hidden bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                  <TableRow className="h-14 border-none">
                    <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest">Tgl Transaksi</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">Barang</TableHead>
                    <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Qty</TableHead>
                    <TableHead className="text-[10px] font-black uppercase tracking-widest">User</TableHead>
                    <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Keterangan</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading && !loadingMore ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <TableRow key={i}><TableCell colSpan={6} className="p-6"><Skeleton className="h-10 w-full rounded-2xl" /></TableCell></TableRow>
                    ))
                  ) : filteredInventoryLogs.length > 0 ? (
                    filteredInventoryLogs.map((log) => (
                      <TableRow key={log.id} className="h-16 hover:bg-slate-50 transition-colors border-slate-50 dark:border-slate-800">
                        <TableCell className="pl-8">
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black text-left">{log.transactionDate ? format(log.transactionDate.toDate(), 'dd/MM/yy') : '-'}</span>
                            <span className="text-[8px] text-muted-foreground font-bold uppercase tracking-tighter flex items-center gap-1 text-left">
                                <Clock className="h-2 w-2" /> Log: {format(log.createdAt.toDate(), 'HH:mm')}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {log.action === 'in' ? (
                            <Badge className="bg-emerald-50 text-emerald-700 border-emerald-100 font-black text-[9px] uppercase"><ArrowUpRight className="h-2 w-2 mr-1" /> Masuk</Badge>
                          ) : (
                            <Badge className="bg-rose-50 text-rose-700 border-rose-100 font-black text-[9px] uppercase"><ArrowDownRight className="h-2 w-2 mr-1" /> Keluar</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col text-left">
                            <span className="text-xs font-black uppercase truncate max-w-[150px] text-left">{log.inventoryName}</span>
                            <span className="text-[9px] font-mono text-primary font-bold text-left">{log.inventoryCode}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center font-black text-sm">{log.quantity}</TableCell>
                        <TableCell>
                          <span className="text-[10px] font-bold uppercase text-left">{log.userName}</span>
                        </TableCell>
                        <TableCell className="text-right pr-8">
                          <span className="text-[10px] font-medium italic text-muted-foreground line-clamp-1 max-w-[200px] text-right" title={log.notes}>
                            {log.notes || '-'}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow><TableCell colSpan={6} className="h-40 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-30">Belum ada transaksi inventaris tercatat.</TableCell></TableRow>
                  )}
                </TableBody>
              </Table>
              {hasMoreInventory && (
                <div className="p-4 border-t flex justify-center bg-slate-50/50 dark:bg-slate-900/50">
                  <Button 
                    onClick={() => fetchLogs('inventory', true)} 
                    disabled={loading || loadingMore}
                    variant="outline" 
                    size="sm" 
                    className="rounded-xl font-black text-[10px] uppercase tracking-widest px-6"
                  >
                    {loadingMore ? <Loader2 className="h-3 w-3 animate-spin mr-2" /> : null}
                    Muat Lebih Banyak
                  </Button>
                </div>
              )}
            </div>
          )}
        </CardContent>
        <CardFooter className="px-10 py-6 bg-slate-50 dark:bg-slate-950/50 border-t flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="text-emerald-600 h-4 w-4" />
            <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Database log dibersihkan secara berkala setiap 30 hari untuk efisiensi penyimpanan.</p>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
