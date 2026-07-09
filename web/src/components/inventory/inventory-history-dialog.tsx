
'use client';

/**
 * @fileOverview Dialog Riwayat Transaksi Inventaris.
 * Fitur: Log Masuk/Keluar, Penyesuaian Tanggal (Admin), dan Indikator Status Transparan.
 * Update: Menggunakan createdAt sebagai pengurutan utama untuk menjamin seluruh data tampil.
 */

import { useState, useEffect } from 'react';
import { collection, query, where, orderBy, onSnapshot, limit, doc, updateDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryItem, type InventoryTransaction } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
  DialogFooter,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { History, User, Building, Clock, X, Package, ArrowUpRight, ArrowDownRight, RefreshCw, Calendar as CalendarIcon, CheckCircle2 } from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { Skeleton } from '../ui/skeleton';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

interface InventoryHistoryDialogProps {
  item: InventoryItem;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function InventoryHistoryDialog({ item, isOpen, onOpenChange }: InventoryHistoryDialogProps) {
  const [logs, setLogs] = useState<InventoryTransaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'Admin';

  // Sync Date States
  const [logToSync, setLogToSync] = useState<InventoryTransaction | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [newTransactionDate, setNewTransactionDate] = useState<Date | undefined>();

  useEffect(() => {
    if (!isOpen) return;

    setLoading(true);
    // Menggunakan createdAt sebagai pengurutan utama untuk menjamin data tampil meskipun transactionDate kosong
    const q = query(
      collection(db, 'inventory_transactions'),
      where('inventoryCode', '==', item.code)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const logsData = snapshot.docs.map(doc => {
          const data = doc.data();
          return { 
              id: doc.id, 
              ...data,
              // Fallback jika transactionDate kosong (transaksi lama)
              transactionDate: data.transactionDate || data.createdAt || Timestamp.now()
          } as InventoryTransaction;
      });

      // Sort client-side by createdAt/transactionDate descending to avoid requiring composite indexes
      logsData.sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() || a.transactionDate?.toMillis?.() || 0;
          const timeB = b.createdAt?.toMillis?.() || b.transactionDate?.toMillis?.() || 0;
          return timeB - timeA;
      });

      // Limit to latest 200 items
      setLogs(logsData.slice(0, 200));
      setLoading(false);
    }, async (serverError) => {
      console.error("Error fetching item history:", serverError);
      
      const permissionError = new FirestorePermissionError({
          path: `inventory_transactions`,
          operation: 'list',
      } satisfies SecurityRuleContext);
      
      errorEmitter.emit('permission-error', permissionError);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [isOpen, item.id]);

  const handleSyncDate = async () => {
    if (!logToSync || !newTransactionDate || !user) return;
    setIsUpdating(logToSync.id);
    
    const docRef = doc(db, 'inventory_transactions', logToSync.id);
    const updateData = {
        transactionDate: Timestamp.fromDate(newTransactionDate)
    };

    updateDoc(docRef, updateData)
      .then(() => {
          toast({ title: 'Tanggal Diperbarui' });
          setIsSyncDialogOpen(false);
          setLogToSync(null);
      })
      .catch(async (serverError) => {
          const permissionError = new FirestorePermissionError({
              path: docRef.path,
              operation: 'update',
              requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
      })
      .finally(() => {
          setIsUpdating(null);
      });
  };

  return (
    <>
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl w-[95vw] max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2rem] sm:rounded-[2.5rem] mx-auto text-black">
        <div className="px-6 py-6 sm:px-8 sm:py-10 bg-slate-900 text-white flex flex-col items-center text-center gap-2 shrink-0 relative">
          <div className="p-3 sm:p-4 bg-white/10 rounded-full backdrop-blur-md mb-1 sm:mb-2 shadow-2xl border border-white/20">
            <History className="w-6 h-6 sm:w-8 sm:h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl sm:text-2xl font-black tracking-tight uppercase">Audit Transaksi Inventaris</DialogTitle>
          <DialogDescription className="text-white/60 font-medium text-[10px] sm:text-xs tracking-widest">
            Log lengkap pergerakan barang untuk <span className="text-white font-bold">{item.name}</span>.
          </DialogDescription>
          <DialogClose asChild className="absolute top-4 right-4 sm:top-6 sm:right-6 text-white/40 hover:text-white transition-colors cursor-pointer">
            <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 sm:h-10 sm:w-10 text-white"><X className="h-5 w-5 sm:h-6 sm:w-6" /></Button>
          </DialogClose>
        </div>

        <div className="flex-1 overflow-y-auto p-4 sm:p-8">
          <div className="mb-4 sm:mb-8 p-4 sm:p-6 bg-slate-50 border border-slate-100 rounded-[1.5rem] sm:rounded-[2rem] flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 shadow-inner text-left">
             <div className="flex flex-col sm:flex-row items-center gap-4 text-center sm:text-left w-full sm:w-auto">
                <div className="h-12 w-12 sm:h-14 sm:w-14 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary font-black text-lg sm:text-xl uppercase shadow-sm shrink-0">
                    {item.unit?.[0] || 'U'}
                </div>
                <div className="min-w-0 flex-1 text-center sm:text-left">
                    <p className="text-[8px] sm:text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em] leading-none mb-1.5">Master Object</p>
                    <h4 className="text-base sm:text-lg font-black text-slate-900 uppercase truncate">{item.name}</h4>
                    <p className="text-[9px] sm:text-[10px] font-mono font-bold text-primary tracking-widest mt-1">{item.code}</p>
                </div>
             </div>
             
             <div className="flex items-center justify-center sm:justify-end gap-6 sm:gap-8 w-full sm:w-auto border-t sm:border-t-0 pt-4 sm:pt-0 border-slate-200/60">
                <div className="text-center sm:text-right">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Satuan</p>
                    <p className="text-xs sm:text-sm font-black text-slate-700">{item.unit}</p>
                </div>
                <div className="h-8 sm:h-10 w-px bg-slate-200" />
                <div className="text-center sm:text-right">
                    <p className="text-[8px] sm:text-[9px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Stok Fisik Saat Ini</p>
                    <p className="text-2xl sm:text-3xl font-black text-primary">{item.stock}</p>
                </div>
             </div>
          </div>

          <div className="rounded-[1.5rem] sm:rounded-[2rem] border overflow-hidden bg-white shadow-xl">
            <ScrollArea className="h-[250px] sm:h-[350px] md:h-[400px]">
                <div className="min-w-[600px]">
                <Table>
                <TableHeader className="bg-slate-50 sticky top-0 z-10">
                    <TableRow className="h-12 border-none">
                    <TableHead className="pl-6 sm:pl-8 uppercase text-[9px] sm:text-[10px] font-black tracking-widest text-left">Waktu Transaksi</TableHead>
                    <TableHead className="uppercase text-[9px] sm:text-[10px] font-black tracking-widest text-left">Aksi</TableHead>
                    <TableHead className="uppercase text-[9px] sm:text-[10px] font-black tracking-widest text-center">Volume</TableHead>
                    <TableHead className="uppercase text-[9px] sm:text-[10px] font-black tracking-widest text-left">PIC / Departemen</TableHead>
                    <TableHead className="pr-6 sm:pr-8 uppercase text-[9px] sm:text-[10px] font-black tracking-widest text-left">Keterangan Justifikasi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading ? (
                    Array.from({ length: 4 }).map((_, i) => (
                        <TableRow key={i}><TableCell colSpan={5} className="p-6"><Skeleton className="h-12 w-full rounded-2xl" /></TableCell></TableRow>
                    ))
                    ) : logs.length > 0 ? (
                    logs.map((log) => {
                        const isIn = log.action === 'in';
                        const displayDate = log.transactionDate?.toDate?.() || log.createdAt?.toDate?.() || new Date();
                        
                        return (
                        <TableRow key={log.id} className="h-20 hover:bg-slate-50/80 transition-colors border-slate-100">
                            <TableCell className="pl-6 sm:pl-8">
                            <div className="flex items-center gap-3">
                                <div className="flex flex-col text-left">
                                    <span className="text-sm font-black text-slate-900 text-left">{format(displayDate, 'dd/MM/yyyy')}</span>
                                    <span className="text-[10px] font-bold text-muted-foreground uppercase flex items-center gap-1.5 text-left">
                                        <Clock className="h-3 w-3 text-primary/40" /> {format(displayDate, 'HH:mm')}
                                    </span>
                                </div>
                                {isAdmin && (
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100" 
                                        onClick={() => { setLogToSync(log); setNewTransactionDate(displayDate); setIsSyncDialogOpen(true); }}
                                    >
                                        <RefreshCw className="h-4 w-4" />
                                    </Button>
                                )}
                            </div>
                            </TableCell>
                            <TableCell>
                                <Badge 
                                    variant="outline" 
                                    className={cn(
                                        "rounded-xl font-black text-[10px] uppercase tracking-tighter px-4 py-1 border-none ring-1 ring-inset",
                                        isIn ? "bg-emerald-50 text-emerald-700 ring-emerald-500/20" : "bg-rose-50 text-rose-700 ring-rose-500/20"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {isIn ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownRight className="h-3 w-3" />}
                                        {isIn ? 'Masuk' : 'Keluar'}
                                    </div>
                                </Badge>
                            </TableCell>
                            <TableCell className="text-center">
                            <div className="flex flex-col items-center">
                                <span className={cn(
                                    "font-black text-lg leading-none",
                                    isIn ? "text-emerald-600" : "text-rose-600"
                                )}>
                                    {isIn ? '+' : '-'}{log.quantity}
                                </span>
                                <span className="text-[9px] font-black uppercase text-muted-foreground mt-1 opacity-60">{item.unit}</span>
                            </div>
                            </TableCell>
                            <TableCell>
                            <div className="flex flex-col text-left">
                                <div className="flex items-center gap-2 text-left">
                                <div className="h-6 w-6 rounded-full bg-slate-100 flex items-center justify-center font-black text-[10px] uppercase shrink-0">{(log.requesterName || log.userName)?.[0]}</div>
                                <span className="text-xs font-black text-slate-900 uppercase truncate max-w-[150px] text-left">{log.requesterName || log.userName}</span>
                                </div>
                                <div className="flex items-center gap-2 opacity-60 mt-1 pl-8 text-left">
                                  <Building className="h-3 w-3 shrink-0" />
                                  <span className="text-[9px] font-black uppercase truncate max-w-[120px] text-left">{log.requesterDept || 'N/A'}</span>
                                </div>
                            </div>
                            </TableCell>
                            <TableCell className="pr-6 sm:pr-8">
                            <div className="p-3 rounded-xl bg-slate-50/50 border border-slate-100 max-w-[250px] text-left">
                                <p className="text-[10px] font-bold text-slate-600 italic leading-relaxed line-clamp-2 text-left" title={log.notes}>
                                    "{log.notes || 'Transaksi tercatat sistem.'}"
                                </p>
                            </div>
                            </TableCell>
                        </TableRow>
                        );
                    })
                    ) : (
                    <TableRow>
                        <TableCell colSpan={5} className="h-64 text-center">
                        <div className="flex flex-col items-center gap-4 opacity-10">
                            <Package className="h-20 w-20" />
                            <p className="text-sm font-black uppercase tracking-[0.3em]">Belum Ada Rekaman Data</p>
                        </div>
                        </TableCell>
                    </TableRow>
                    )}
                </TableBody>
                </Table>
                </div>
            </ScrollArea>
          </div>
        </div>

        <DialogFooter className="p-4 sm:p-6 bg-slate-50 border-t flex flex-col sm:flex-row gap-3 sm:gap-0 justify-between items-center text-center sm:text-left shrink-0">
            <div className="flex items-center gap-3 text-left">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest text-left">Jejak Audit Real-time Terverifikasi</p>
            </div>
            <p className="text-[10px] font-bold text-slate-400 italic sm:text-right">Data historis permanen di server PT. China Glaze Indonesia.</p>
        </DialogFooter>
      </DialogContent>
    </Dialog>

    {/* Sync Date Dialog */}
    <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
        <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] mx-auto text-black">
            <div className="p-8 bg-blue-600 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-2 border border-white/30"><RefreshCw className="h-8 w-8" /></div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight text-white">Sinkronisasi Audit</DialogTitle>
                <DialogDescription className="text-white/80 font-medium">Sesuaikan tanggal transaksi untuk kebutuhan laporan akuntansi.</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2 text-left">
                    <div className="flex justify-between items-center mb-1 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-left">Pilih Tanggal Transaksi Baru</Label>
                        <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-black uppercase text-blue-600" onClick={() => setNewTransactionDate(logToSync?.createdAt?.toDate())}>
                            Gunakan Waktu Server
                        </Button>
                    </div>
                    <div className="relative group">
                        <Input 
                            type="date" 
                            value={newTransactionDate ? format(newTransactionDate, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (!val) setNewTransactionDate(undefined);
                                else {
                                    const parsed = parse(val, "yyyy-MM-dd", new Date());
                                    if (isValid(parsed)) setNewTransactionDate(parsed);
                                }
                            }}
                            className="h-14 bg-slate-50 border-none rounded-2xl font-black text-xl px-6 text-black shadow-inner"
                        />
                        <CalendarIcon className="absolute right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-blue-400 pointer-events-none" />
                    </div>
                </div>
                <div className="pt-2 flex gap-3">
                    <Button variant="ghost" onClick={() => setIsSyncDialogOpen(false)} className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest text-slate-400">Batal</Button>
                    <Button onClick={handleSyncDate} disabled={isUpdating !== null || !newTransactionDate} className="flex-[2] rounded-2xl h-14 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-600/20 transition-all active:scale-95">
                        {isUpdating !== null ? <Loader2 className="h-5 w-5 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />} Simpan
                    </Button>
                </div>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
