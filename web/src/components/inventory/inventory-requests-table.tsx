'use client';

/**
 * @fileOverview Tabel Manajemen Permintaan Inventaris.
 * Fitur: Persetujuan bertanda tangan digital, Filter Kategori, Sinkronisasi Tanggal Transaksi, dan Log Terpusat.
 * Penambahan: Deteksi entri "Barang Masuk" dengan indikator visual khusus.
 */

import { useState, useEffect, useMemo, useRef } from 'react';
import { collection, onSnapshot, query, doc, writeBatch, increment, serverTimestamp, addDoc, updateDoc, Timestamp, deleteDoc, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { type InventoryRequest, type Asset, type InventoryTransaction } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Loader2, 
  Check, 
  X, 
  Search, 
  History, 
  ShieldAlert, 
  CheckCircle2, 
  ShoppingCart,
  Share2,
  Pencil,
  FileText,
  Eye,
  Filter,
  ChevronDown,
  RefreshCw,
  Calendar as CalendarIcon,
  Trash2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  User,
  Building,
  SmartphoneNfc,
  RotateCcw
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, parse, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogClose 
} from '@/components/ui/dialog';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { ScrollArea } from '@/components/ui/scroll-area';
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import { Label } from '../ui/label';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

const StatCard = ({ title, value, icon: Icon, color }: { title: string, value: number, icon: any, color: string }) => (
    <Card className={cn("relative overflow-hidden border-none shadow-lg", color)}>
        <div className="absolute top-0 right-0 p-4 opacity-10">
            <Icon className="h-16 w-16" />
        </div>
        <CardContent className="p-4 sm:p-6 text-white">
            <p className="text-[10px] font-black uppercase tracking-wider text-white/70 text-left">{title}</p>
            <h3 className="text-2xl sm:text-3xl font-black text-white mt-1 text-left">{value}</h3>
        </CardContent>
    </Card>
);

export default function InventoryRequestsTable() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [isSharing, setIsSharing] = useState(false);

  // Approval Signature States
  const [requestToApprove, setRequestToApprove] = useState<InventoryRequest | null>(null);
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  
  // Sync Date States
  const [requestToSync, setRequestToSync] = useState<InventoryRequest | null>(null);
  const [isSyncDialogOpen, setIsSyncDialogOpen] = useState(false);
  const [newTransactionDate, setNewTransactionDate] = useState<Date | undefined>();
  
  // View Signature States
  const [viewSignatureUrl, setViewSignatureUrl] = useState<string | null>(null);

  // Delete State
  const [requestToDelete, setRequestToDelete] = useState<InventoryRequest | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const isAdmin = user?.role === 'Admin';
  const isHRGA = user?.department === 'HR & GA';
  const isAuthorized = isAdmin || isHRGA;

  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);

    const q = query(collection(db, 'inventory_requests'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryRequest));
      if (!isAuthorized) {
        requestsData = requestsData.filter(req => req.requestingUserId === user?.uid);
      }
      setRequests(requestsData.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, isAuthorized]);

  const standardCategories = ['Logistik ATK', 'Sparepart', 'Kebersihan'];
  
  const availableCategories = useMemo(() => {
    const catsInDb = new Set<string>();
    requests.forEach(r => {
        if (r.inventoryCategory) catsInDb.add(r.inventoryCategory);
    });
    const allUniqueCats = Array.from(new Set([...standardCategories, ...Array.from(catsInDb)]));
    return allUniqueCats.sort((a, b) => {
        const indexA = standardCategories.indexOf(a);
        const indexB = standardCategories.indexOf(b);
        if (indexA !== -1 && indexB !== -1) return indexA - indexB;
        if (indexA !== -1) return -1;
        if (indexB !== -1) return 1;
        return a.localeCompare(b);
    });
  }, [requests]);

  const stats = useMemo(() => {
    return {
        total: requests.length,
        waiting: requests.filter(r => r.status === 'Menunggu Persetujuan HRGA').length,
        approved: requests.filter(r => r.status === 'Disetujui').length,
        rejected: requests.filter(r => r.status === 'Ditolak').length,
    };
  }, [requests]);

  const openApprovalDialog = (request: InventoryRequest) => {
    setRequestToApprove(request);
    setIsSignDialogOpen(true);
  };

  const handleApproveWithSignature = async () => {
    if (!requestToApprove || !sigPadRef.current || !user) return;
    
    if (sigPadRef.current.isEmpty()) {
        toast({ variant: 'destructive', title: 'Tanda Tangan Diperlukan', description: 'Mohon bubuhkan tanda tangan sebagai bukti persetujuan.' });
        return;
    }

    setUpdatingId(requestToApprove.id);
    const signatureData = sigPadRef.current.toDataURL('image/png');

    const requestRef = doc(db, 'inventory_requests', requestToApprove.id);
    const itemRef = doc(db, 'inventory', requestToApprove.inventoryId);
    const transactionRef = doc(collection(db, 'inventory_transactions'));
    
    const batch = writeBatch(db);
    const effectiveDate = requestToApprove.transactionDate || serverTimestamp();

    // 1. Update Request Status and Save Signature
    const requestUpdate = {
        status: 'Disetujui' as const,
        processedByUserId: user.uid,
        processedByUserName: user.displayName || user.email,
        processedAt: serverTimestamp(),
        approvalSignature: signatureData
    };
    batch.update(requestRef, requestUpdate);
    
    // 2. Reduce Stock
    batch.update(itemRef, {
        stock: increment(-requestToApprove.quantity),
        lastUpdated: serverTimestamp()
    });

    // 3. Record Transaction (History)
    const transactionData = {
        inventoryId: requestToApprove.inventoryId,
        inventoryCode: requestToApprove.inventoryCode,
        inventoryName: requestToApprove.inventoryName,
        action: 'out' as const,
        quantity: requestToApprove.quantity,
        notes: `Pengambilan barang disetujui oleh ${user.displayName || user.email}. Ref: ${requestToApprove.inventoryCode}`,
        userId: user.uid,
        userName: user.displayName || user.email,
        requesterName: requestToApprove.requestingUserName,
        requesterDept: requestToApprove.requestingDept,
        createdAt: serverTimestamp(),
        transactionDate: effectiveDate,
        requestId: requestToApprove.id, // Linked ID
    };
    batch.set(transactionRef, transactionData);

    batch.commit()
        .then(() => {
            toast({ title: 'Permintaan Disetujui', description: 'Stok telah diperbarui dan transaksi tercatat di riwayat.' });
            setIsSignDialogOpen(false);
            setRequestToApprove(null);
        })
        .catch(async (serverError) => {
            console.error("Approval error:", serverError);
            toast({ variant: 'destructive', title: 'Gagal Menyetujui' });
        })
        .finally(() => {
            setUpdatingId(null);
        });
  };

  const handleSyncDate = async () => {
    if (!requestToSync || !newTransactionDate || !user) return;
    setUpdatingId(requestToSync.id);
    
    const docRef = doc(db, 'inventory_requests', requestToSync.id);
    const updateData = {
        transactionDate: Timestamp.fromDate(newTransactionDate)
    };

    updateDoc(docRef, updateData)
      .then(() => {
          toast({ title: 'Tanggal Diperbarui' });
          setIsSyncDialogOpen(false);
          setRequestToSync(null);
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
          setUpdatingId(null);
      });
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete || !isAdmin) return;
    setUpdatingId(requestToDelete.id);
    
    try {
        const requestRef = doc(db, 'inventory_requests', requestToDelete.id);
        const batch = writeBatch(db);

        // 1. Delete Request
        batch.delete(requestRef);

        // 2. If already approved, restore stock and delete transaction
        if (requestToDelete.status === 'Disetujui') {
            const itemRef = doc(db, 'inventory', requestToDelete.inventoryId);
            
            // Jika isIncoming === true (barang masuk), menghapusnya akan mengurangi stok.
            // Jika isIncoming !== true (barang keluar), menghapusnya akan menambahkan kembali stok.
            const isIncoming = !!(requestToDelete as any).isIncoming;
            const stockChange = isIncoming ? -requestToDelete.quantity : requestToDelete.quantity;

            batch.update(itemRef, {
                stock: increment(stockChange),
                lastUpdated: serverTimestamp()
            });

            // Find matching transaction
            let transactionDocRef = null;
            
            // Try query by requestId first
            const qById = query(collection(db, 'inventory_transactions'), where('requestId', '==', requestToDelete.id));
            const snapById = await getDocs(qById);
            
            if (!snapById.empty) {
                transactionDocRef = snapById.docs[0].ref;
            } else {
                // Fallback: query by fields matching
                const qByFields = query(
                    collection(db, 'inventory_transactions'),
                    where('inventoryId', '==', requestToDelete.inventoryId),
                    where('quantity', '==', requestToDelete.quantity),
                    where('action', '==', isIncoming ? 'in' : 'out')
                );
                const snapByFields = await getDocs(qByFields);
                if (!snapByFields.empty) {
                    const reqTime = requestToDelete.requestedAt?.toMillis?.() || 0;
                    let closestDoc = snapByFields.docs[0];
                    let minDiff = Math.abs((closestDoc.data().createdAt?.toMillis?.() || 0) - reqTime);
                    
                    snapByFields.docs.forEach(docSnap => {
                        const docTime = docSnap.data().createdAt?.toMillis?.() || 0;
                        const diff = Math.abs(docTime - reqTime);
                        if (diff < minDiff) {
                            minDiff = diff;
                            closestDoc = docSnap;
                        }
                    });
                    transactionDocRef = closestDoc.ref;
                }
            }

            if (transactionDocRef) {
                batch.delete(transactionDocRef);
            }
        }
        
        await batch.commit();

        const isIncoming = !!(requestToDelete as any).isIncoming;
        toast({ 
            title: 'Berhasil Dihapus', 
            description: requestToDelete.status === 'Disetujui' 
                ? (isIncoming 
                    ? 'Log barang masuk dan catatan auditnya berhasil dihapus dari sistem.' 
                    : 'Permintaan barang dan catatan auditnya berhasil dihapus dari sistem.')
                : 'Log permintaan barang telah dihapus dari sistem.' 
        });
        setIsDeleteDialogOpen(false);
        setRequestToDelete(null);

    } catch (serverError: any) {
        console.error("Delete error:", serverError);
        toast({ variant: 'destructive', title: 'Gagal Menghapus', description: serverError.message || 'Terjadi kesalahan.' });
    } finally {
        setUpdatingId(null);
    }
  };

  const handleReject = async (request: InventoryRequest) => {
    if (!isAuthorized || !user) return;
    setUpdatingId(request.id);
    
    const docRef = doc(db, 'inventory_requests', request.id);
    const updateData = {
        status: 'Ditolak' as const,
        processedByUserId: user.uid,
        processedByUserName: user.displayName || user.email,
        processedAt: serverTimestamp(),
    };

    updateDoc(docRef, updateData)
      .then(() => {
          toast({ title: 'Permintaan Ditolak', variant: 'destructive' });
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
          setUpdatingId(null);
      });
  };

  const handleShareLogReport = async () => {
    if (filteredRequests.length === 0) {
        toast({ variant: 'destructive', title: 'Data Kosong' });
        return;
    }
    
    setIsSharing(true);
    try {
        const reportData = {
            title: 'Laporan Log Permintaan Barang',
            type: 'INVENTORY_LOG',
            recipient: 'Sistem Laporan',
            department: 'Semua Unit',
            items: filteredRequests.map(r => ({
                code: r.inventoryCode,
                name: r.inventoryName,
                quantity: r.quantity,
                status: r.status,
                requester: r.requestingUserName,
                dept: r.requestingDept,
                inventoryCategory: r.inventoryCategory,
                signature: r.approvalSignature || null,
                isIncoming: !!(r as any).isIncoming,
                date: r.transactionDate?.toMillis() || r.requestedAt?.toMillis() || null
            })),
            processedBy: user?.displayName || user?.email,
            createdAt: serverTimestamp(),
        };

        const docRef = await addDoc(collection(db, 'public_reports'), reportData);
        const publicUrl = `${window.location.origin}/public/inventory-report?s=${docRef.id}`;

        if (typeof navigator !== 'undefined' && navigator.share) {
            try {
                await navigator.share({
                    title: 'Log Permintaan Inventaris PT. CGI',
                    text: 'Silakan lihat rekapitulasi permintaan barang terbaru di sini:',
                    url: publicUrl,
                });
                toast({ title: 'Berhasil Dibagikan' });
            } catch (shareError: any) {
                if (shareError.name !== 'AbortError') {
                    await navigator.clipboard.writeText(publicUrl);
                    toast({ title: 'Link Disalin', description: 'Fitur berbagi sistem diblokir, tautan telah disalin ke papan klip.' });
                }
            }
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Tautan laporan publik telah disalin ke papan klip.' });
        }
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
        setIsSharing(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => {
      const searchMatch = req.inventoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.inventoryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          req.requestingUserName.toLowerCase().includes(searchTerm.toLowerCase());
      const categoryMatch = selectedCategories.length === 0 || 
                           (req.inventoryCategory && selectedCategories.includes(req.inventoryCategory));
      
      let dateMatch = true;
      const reqDate = req.transactionDate?.toDate() || req.requestedAt?.toDate() || null;
      if (reqDate) {
        if (startDate) {
          const start = new Date(startDate);
          start.setHours(0,0,0,0);
          if (reqDate < start) dateMatch = false;
        }
        if (endDate) {
          const end = new Date(endDate);
          end.setHours(23,59,59,999);
          if (reqDate > end) dateMatch = false;
        }
      }

      return searchMatch && categoryMatch && dateMatch;
    });
  }, [requests, searchTerm, selectedCategories, startDate, endDate]);

  const getStatusVariant = (status: InventoryRequest['status']) => {
    switch (status) {
      case 'Menunggu Persetujuan HRGA': return 'warning';
      case 'Disetujui': return 'success';
      case 'Ditolak': return 'destructive';
      default: return 'secondary';
    }
  };

  return (
    <div className="space-y-6 sm:y-8 w-full max-w-full overflow-hidden pb-10 text-black">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="Total Permintaan" value={stats.total} icon={History} color="bg-slate-800" />
            <StatCard title="Menunggu" value={stats.waiting} icon={ShieldAlert} color="bg-amber-500" />
            <StatCard title="Disetujui" value={stats.approved} icon={CheckCircle2} color="bg-emerald-600" />
            <StatCard title="Ditolak" value={stats.rejected} icon={X} color="bg-rose-600" />
        </div>

        <Card className="border-none shadow-2xl bg-white/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-8 pb-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <ShoppingCart className="h-8 w-8 text-primary" />
                        </div>
                        <div className="text-left">
                            <CardTitle className="text-2xl font-black tracking-tight uppercase text-left">Log Permintaan</CardTitle>
                            <CardDescription className="font-medium text-left">
                                {isAuthorized ? 'Manajemen persetujuan inventaris operasional.' : 'Pantau status permintaan barang Anda.'}
                            </CardDescription>
                        </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {/* Date Range Filter */}
                        <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl p-1.5 shadow-inner">
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 ml-1">Dari</span>
                                <input 
                                    type="date"
                                    value={startDate}
                                    onChange={(e) => setStartDate(e.target.value)}
                                    className="h-8 bg-transparent border-none text-[11px] font-bold w-[125px] text-black dark:text-white focus:outline-none"
                                />
                            </div>
                            <div className="h-6 w-px bg-slate-200 dark:bg-slate-700" />
                            <div className="flex items-center gap-1">
                                <span className="text-[9px] font-black uppercase text-muted-foreground/60 ml-1">S/D</span>
                                <input 
                                    type="date"
                                    value={endDate}
                                    onChange={(e) => setEndDate(e.target.value)}
                                    className="h-8 bg-transparent border-none text-[11px] font-bold w-[125px] text-black dark:text-white focus:outline-none"
                                />
                            </div>
                            {(startDate || endDate) && (
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    onClick={() => { setStartDate(''); setEndDate(''); }} 
                                    className="h-7 w-7 rounded-full text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors"
                                >
                                    <RotateCcw className="h-3.5 w-3.5" />
                                </Button>
                            )}
                        </div>

                        <Button onClick={handleShareLogReport} variant="outline" disabled={isSharing} className="rounded-2xl h-11 border-purple-200 text-purple-700 hover:bg-purple-50 font-bold">
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="mr-2 h-4 w-4" />}
                            Bagikan Log
                        </Button>
                        <div className="uiverse-search-container flex-1 max-w-sm hidden sm:flex">
                            <div className="relative w-full px-1">
                                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                <input
                                    placeholder="Cari barang atau peminta..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="uiverse-search-input pl-10"
                                />
                            </div>
                        </div>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button variant="outline" className="rounded-2xl h-11 border-slate-200 font-bold text-black">
                                    <Filter className="mr-2 h-4 w-4" /> Filter {selectedCategories.length > 0 && `(${selectedCategories.length})`}
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                                <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-widest text-muted-foreground/70 px-4 py-2 text-left">Pilih Kategori</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <ScrollArea className="h-48">
                                    {availableCategories.map((cat) => (
                                        <DropdownMenuCheckboxItem
                                            key={cat}
                                            checked={selectedCategories.includes(cat)}
                                            onCheckedChange={(checked) => {
                                                if (checked) setSelectedCategories([...selectedCategories, cat]);
                                                else setSelectedCategories(selectedCategories.filter(c => c !== cat));
                                            }}
                                            className="font-bold text-xs"
                                        >
                                            {cat}
                                        </DropdownMenuCheckboxItem>
                                    ))}
                                </ScrollArea>
                                {selectedCategories.length > 0 && (
                                    <>
                                        <DropdownMenuSeparator />
                                        <Button variant="ghost" className="w-full h-8 text-[9px] font-black uppercase text-rose-600 hover:text-rose-700 hover:bg-rose-50" onClick={() => setSelectedCategories([])}>Bersihkan Filter</Button>
                                    </>
                                )}
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>
            </CardHeader>
            <CardContent className="p-8 pt-0">
                <div className="relative w-full overflow-hidden border rounded-3xl bg-white shadow-inner">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                            <TableRow className="h-14">
                                <TableHead className="pl-6 uppercase text-[10px] font-black tracking-widest text-left">Detail Barang</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-left">Kategori</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-center">Jumlah</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-left">Peminta / PIC</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-left">Tanggal</TableHead>
                                <TableHead className="uppercase text-[10px] font-black tracking-widest text-left">Status</TableHead>
                                <TableHead className="text-right pr-6 uppercase text-[10px] font-black tracking-widest">Aksi</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading || authLoading ? (
                                Array.from({ length: 5 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={7} className="p-6"><Skeleton className="h-10 w-full rounded-xl" /></TableCell></TableRow>
                                ))
                            ) : filteredRequests.length > 0 ? (
                                filteredRequests.map((req) => (
                                <TableRow key={req.id} className="h-20 hover:bg-slate-50 transition-colors">
                                    <TableCell className="pl-6">
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-sm text-slate-900 uppercase text-left">{req.inventoryName}</span>
                                            <span className="text-[10px] font-mono text-primary font-bold">{req.inventoryCode}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="outline" className="rounded-md font-bold text-[9px] uppercase tracking-tighter border-primary/20 bg-primary/5 text-primary">
                                            {req.inventoryCategory || 'N/A'}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <div className="flex flex-col items-center">
                                            <span className={cn("font-black text-base", (req as any).isIncoming ? "text-emerald-600" : "text-slate-900")}>
                                                {(req as any).isIncoming ? '+' : ''}{req.quantity}
                                            </span>
                                            {(req as any).isIncoming && <span className="text-[7px] font-black text-emerald-500 uppercase tracking-tighter leading-none">Restok</span>}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex flex-col text-left">
                                            <span className="font-bold text-sm uppercase text-left">{req.requestingUserName}</span>
                                            <span className="text-[10px] uppercase font-black text-muted-foreground text-left">{req.requestingDept}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className="flex flex-col text-left">
                                                <span className="text-xs font-black">{req.transactionDate ? format(req.transactionDate.toDate(), 'dd/MM/yyyy') : (req.requestedAt ? format(req.requestedAt.toDate(), 'dd/MM/yyyy') : '-')}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase text-left">{req.requestedAt ? format(req.requestedAt.toDate(), 'HH:mm') : ''}</span>
                                            </div>
                                            {isAdmin && (
                                                <Button variant="ghost" size="icon" className="h-7 w-7 rounded-full text-blue-600 hover:bg-blue-50" onClick={() => { setRequestToSync(req); setNewTransactionDate(req.transactionDate?.toDate() || req.requestedAt?.toDate() || new Date()); setIsSyncDialogOpen(true); }}>
                                                    <RefreshCw className="h-3.5 w-3.5" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            {(req as any).isIncoming ? (
                                                <Badge className="bg-emerald-100 text-emerald-700 border-none rounded-full px-3 py-0.5 font-black text-[9px] uppercase shadow-sm">
                                                    BARANG MASUK
                                                </Badge>
                                            ) : (
                                                <>
                                                    <Badge variant={getStatusVariant(req.status)} className="rounded-full px-3 py-0.5 font-black text-[9px] uppercase shadow-sm">
                                                        {req.status === 'Menunggu Persetujuan HRGA' ? 'Waiting' : req.status}
                                                    </Badge>
                                                    {req.approvalSignature && (
                                                        <button onClick={() => setViewSignatureUrl(req.approvalSignature || null)} className="h-6 w-6 flex items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-100 hover:bg-emerald-100 transition-colors">
                                                            <Pencil className="h-3 w-3" />
                                                        </button>
                                                    )}
                                                </>
                                            )}
                                        </div>
                                    </TableCell>
                                    <TableCell className="text-right pr-6">
                                        <div className="flex gap-2 justify-end items-center">
                                            {(req as any).isIncoming ? (
                                                <div className="flex flex-col items-end opacity-60 text-right">
                                                    <span className="text-[9px] font-black uppercase leading-none">Admin:</span>
                                                    <span className="text-[10px] font-bold truncate max-w-[100px] text-right">{req.processedByUserName || 'System'}</span>
                                                </div>
                                            ) : (
                                                <>
                                                    {req.status === 'Menunggu Persetujuan HRGA' ? (
                                                        isAuthorized ? (
                                                            updatingId === req.id ? <Loader2 className="h-5 w-5 animate-spin ml-auto" /> : (
                                                                <>
                                                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-rose-500 border-rose-100 hover:bg-rose-500 hover:text-white transition-all shadow-sm" onClick={() => handleReject(req)} title="Tolak">
                                                                        <X className="h-4 w-4" />
                                                                    </Button>
                                                                    <Button size="icon" variant="outline" className="h-9 w-9 rounded-xl text-emerald-600 border-emerald-100 hover:bg-emerald-600 hover:text-white transition-all shadow-sm" onClick={() => openApprovalDialog(req)} title="Setujui">
                                                                        <Check className="h-4 w-4" />
                                                                    </Button>
                                                                </>
                                                            )
                                                        ) : (
                                                            <span className="text-[10px] font-black uppercase text-muted-foreground opacity-40 italic">Waiting Auth</span>
                                                        )
                                                    ) : (
                                                        <div className="flex flex-col items-end opacity-60 text-right">
                                                            <span className="text-[9px] font-black uppercase leading-none">PIC:</span>
                                                            <span className="text-[10px] font-bold truncate max-w-[100px] text-right">{req.processedByUserName}</span>
                                                        </div>
                                                    )}
                                                </>
                                            )}
                                            {isAdmin && (
                                                <Button 
                                                    size="icon" 
                                                    variant="ghost" 
                                                    className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all"
                                                    onClick={() => { setRequestToDelete(req); setIsDeleteDialogOpen(true); }}
                                                    title="Hapus Log"
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </TableCell>
                                </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-48 text-center">
                                        <div className="flex flex-col items-center gap-2 opacity-30">
                                            <ShoppingCart className="h-12 w-12" />
                                            <p className="font-bold uppercase tracking-widest text-sm italic text-center">Tidak Ada Data</p>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>

        {/* Sync Date Dialog */}
        <Dialog open={isSyncDialogOpen} onOpenChange={setIsSyncDialogOpen}>
            <DialogContent className="sm:max-w-md p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] text-black">
                <div className="p-8 bg-blue-600 text-white flex flex-col items-center text-center gap-2">
                    <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-2"><RefreshCw className="h-8 w-8" /></div>
                    <DialogTitle className="text-xl font-black uppercase tracking-tight text-white text-left">Sinkronisasi Tanggal</DialogTitle>
                    <DialogDescription className="text-white/80 font-medium text-left">Sesuaikan tanggal transaksi untuk audit laporan.</DialogDescription>
                </div>
                <div className="p-8 space-y-6">
                    <div className="space-y-2 text-left">
                        <div className="flex justify-between items-center mb-1 text-left">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-left">Pilih Tanggal Transaksi</Label>
                            <Button variant="link" size="sm" className="h-auto p-0 text-[10px] font-bold uppercase text-blue-600" onClick={() => setNewTransactionDate(requestToSync?.requestedAt?.toDate())}>
                                Gunakan Tgl Permintaan
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
                                className="h-12 bg-slate-50 border-none rounded-xl font-bold px-4 text-black"
                            />
                            <CalendarIcon className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-blue-400 pointer-events-none" />
                        </div>
                    </div>
                    <div className="pt-2 flex gap-3">
                        <Button variant="ghost" onClick={() => setIsSyncDialogOpen(false)} className="flex-1 rounded-xl h-12 font-bold text-black">Batal</Button>
                        <Button onClick={handleSyncDate} disabled={updatingId !== null || !newTransactionDate} className="flex-[2] rounded-xl h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-lg shadow-blue-600/20">
                            {updatingId !== null ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />} Simpan Tanggal
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* Signature Approval Dialog */}
        <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] text-black" onPointerDownOutside={(e) => e.preventDefault()}>
                <div className="p-8 bg-slate-900 text-white border-b border-white/5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-primary/20 rounded-xl"><Pencil className="h-5 w-5 text-primary" /></div>
                        <div className="text-left">
                            <DialogTitle className="uppercase font-black tracking-tight text-xl text-left text-white">Otoritas Persetujuan</DialogTitle>
                            <DialogDescription className="text-white/40 text-[9px] font-black tracking-[0.2em] uppercase text-left">Verifikasi Departemen Peminta</DialogDescription>
                        </div>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10 text-white"><X className="h-6 w-6 text-white"/></Button></DialogClose>
                </div>
                <div className="p-8 space-y-6">
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground mb-1 text-left">Persetujuan Untuk:</p>
                        <p className="text-sm font-bold text-slate-900 text-left">{requestToApprove?.quantity} {requestToApprove?.inventoryName} ({requestToApprove?.inventoryCode})</p>
                        <p className="text-[10px] font-medium text-slate-500 mt-1 text-left">Oleh: {requestToApprove?.requestingUserName} - {requestToApprove?.requestingDept}</p>
                    </div>

                    <div className="border-4 border-dashed border-slate-100 rounded-3xl bg-slate-50 h-64 overflow-hidden shadow-inner relative group text-black">
                        <SignatureCanvas 
                            ref={sigPadRef}
                            penColor="black"
                            canvasProps={{ className: 'w-full h-full relative z-10' }}
                        />
                    </div>
                    
                    <div className="flex gap-3">
                        <Button variant="ghost" onClick={() => sigPadRef.current?.clear()} className="flex-1 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest text-rose-600">Bersihkan</Button>
                        <Button onClick={handleApproveWithSignature} disabled={updatingId !== null} className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white">
                            {updatingId !== null ? <Loader2 className="h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />} Simpan & Setujui
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {/* View Signature Dialog */}
        <Dialog open={!!viewSignatureUrl} onOpenChange={(open) => !open && setViewSignatureUrl(null)}>
            <DialogContent 
                onPointerDownOutside={(e) => e.preventDefault()}
                className="sm:max-w-md p-0 overflow-hidden border-none rounded-3xl shadow-2xl bg-white text-black"
            >
                <div className="p-6 bg-slate-50 border-b flex items-center justify-between text-left">
                    <div className="flex items-center gap-2 text-left">
                        <FileText className="h-5 w-5 text-primary" />
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-left">Bukti Pengesahan</DialogTitle>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-black"><X className="h-5 w-5 text-black" /></Button></DialogClose>
                </div>
                <div className="p-10 flex flex-col items-center justify-center gap-6">
                    <div className="relative w-full aspect-video border-2 border-slate-100 rounded-2xl bg-slate-50 flex items-center justify-center p-4">
                        {viewSignatureUrl && (
                            <Image src={viewSignatureUrl} alt="Signature Proof" width={300} height={150} className="object-contain" />
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                            <CheckCircle2 className="h-40 w-40 text-primary" />
                        </div>
                    </div>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest text-center">Verifikasi Departemen Peminta</p>
                </div>
                <DialogFooter className="p-6 bg-slate-50 border-t">
                    <Button onClick={() => setViewSignatureUrl(null)} className="w-full rounded-xl font-bold uppercase text-xs text-black">Tutup</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white dark:bg-slate-950 text-black">
                <AlertDialogHeader>
                    <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-4 text-left text-black">
                        <AlertTriangle className="h-8 w-8 text-rose-600" />
                    </div>
                    <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-rose-600">Hapus Log Permintaan?</AlertDialogTitle>
                    <AlertDialogDescription className="text-slate-500 font-medium text-left leading-relaxed text-black">
                        Anda akan menghapus log permintaan barang <span className="font-bold text-slate-900 dark:text-white">{requestToDelete?.inventoryName}</span> secara permanen. Tindakan ini tidak akan mengembalikan stok barang yang sudah diambil.
                    </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-8 gap-3">
                    <AlertDialogCancel className="rounded-xl h-12 font-bold">Batalkan</AlertDialogCancel>
                    <AlertDialogAction 
                        onClick={handleDeleteRequest} 
                        disabled={updatingId !== null}
                        className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 text-white"
                    >
                        {updatingId !== null ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Trash2 className="mr-2 h-4 w-4" />}
                        Ya, Hapus Log
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
