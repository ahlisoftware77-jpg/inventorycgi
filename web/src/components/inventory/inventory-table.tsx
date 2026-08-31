'use client';

/**
 * @fileOverview Tabel Manajemen Inventaris (Internal).
 * Dioptimalkan untuk transparansi stok: Stok Fisik vs Sisa Tersedia.
 * Fitur: Menghitung "Booking" dari permintaan yang sedang menunggu persetujuan.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, Timestamp, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type InventoryItem, type InventoryType, type InventoryRequest } from '@/lib/types';
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
import { Skeleton } from '../ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { PlusCircle, Search, ShoppingCart, Edit, ArrowUp, ArrowDown, FileText, Share2, Loader2, Trash2, ArrowRightLeft, History, Info, AlertCircle, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import InventoryForm from './inventory-form';
import RequestItemForm from './request-item-form';
import DeleteInventoryItemDialog from './delete-inventory-item-dialog';
import UpdateStockDialog from './update-stock-dialog';
import ImportInventoryDialog from './import-inventory-dialog';
import ExportInventoryButton from './export-inventory-button';
import InventoryHistoryDialog from './inventory-history-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import InventoryTip from './inventory-tip';

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: keyof InventoryItem | 'remainingStock';
  direction: SortDirection;
}

interface EnrichedInventoryItem extends InventoryItem {
    outgoingRequests: number;
    remainingStock: number;
}

export default function InventoryTable() {
  const [allItems, setAllItems] = useState<InventoryItem[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<string[]>(['ATK', 'Sparepart', 'Alat Kebersihan', 'Obat-obatan']);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ATK');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  // History Dialog State
  const [historyItem, setHistoryItem] = useState<InventoryItem | null>(null);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [previewPhoto, setPreviewPhoto] = useState<{ url: string; name: string } | null>(null);

  useEffect(() => {
    const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.inventoryTypes && Array.isArray(data.inventoryTypes) && data.inventoryTypes.length > 0) {
          setInventoryTypes(data.inventoryTypes);
          setActiveTab(prev => data.inventoryTypes.includes(prev) ? prev : (data.inventoryTypes[0] || 'ATK'));
        }
      }
    });
    return () => unsubSettings();
  }, []);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);

    const inventoryQuery = query(collection(db, 'inventory'));
    const requestsQuery = query(collection(db, 'inventory_requests'), where('status', '==', 'Menunggu Persetujuan HRGA'));

    const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setAllItems(itemsData);
    }, (error) => {
      console.error("Error fetching inventory items:", error);
    });

    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryRequest));
        setRequests(requestsData);
    });
    
    const timer = setTimeout(() => setLoading(false), 1000);

    return () => {
      unsubInventory();
      unsubRequests();
      clearTimeout(timer);
    };
  }, [authLoading]);
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

  const enrichedItems = useMemo(() => {
    const itemsToProcess = allItems.filter(item => item.type === activeTab);

    const requestMap = new Map<string, number>();
    requests.forEach(r => {
        // Hanya hitung permintaan keluar (isIncoming != true)
        if (!(r as any).isIncoming) {
            requestMap.set(r.inventoryId, (requestMap.get(r.inventoryId) || 0) + r.quantity);
        }
    });

    return itemsToProcess.map(item => {
        const outgoingRequests = requestMap.get(item.id) || 0;
        return {
            ...item,
            outgoingRequests,
            remainingStock: Math.max(0, (item.stock || 0) - outgoingRequests),
        };
    });
  }, [activeTab, allItems, requests]);


  const filteredAndSortedItems = useMemo(() => {
    let itemsToFilter: EnrichedInventoryItem[] = enrichedItems;
    
    if (searchTerm) {
      itemsToFilter = itemsToFilter.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    if (sortConfig !== null) {
      itemsToFilter.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof EnrichedInventoryItem];
        const bValue = b[sortConfig.key as keyof EnrichedInventoryItem];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return (aValue - bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }

        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            return (aValue.toMillis() - bValue.toMillis()) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        
        return 0;
      });
    }

    return itemsToFilter;
  }, [enrichedItems, searchTerm, sortConfig]);
  
  const canManageInventory = user?.role === 'Admin' || user?.permissions?.canManageInventory;
  const canDeleteInventory = user?.role === 'Admin' || user?.permissions?.canDeleteInventory;

  const handleSharePublicLink = async () => {
    setIsSharing(true);
    const publicUrl = `${window.location.origin}/public/inventory`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Portal Inventaris Publik PT. China Glaze Indonesia',
                text: 'Silakan klik tautan di bawah ini untuk melihat katalog dan meminta pengambilan barang tanpa login:',
                url: publicUrl,
            });
            toast({ title: 'Berhasil Dibagikan' });
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Tautan portal publik telah disalin ke papan klip.' });
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Gagal memanggil API Share, tautan disalin secara manual.' });
        }
    } finally {
        setIsSharing(false);
    }
  };

  const handleOpenHistory = (item: InventoryItem) => {
    setHistoryItem(item);
    setIsHistoryOpen(true);
  };

  const renderTable = (items: EnrichedInventoryItem[]) => (
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-[0_2px_8px_rgba(0,0,0,0.01)]">
        <div className="overflow-x-auto">
            <Table>
                <TableHeader className="bg-slate-50/50 dark:bg-slate-800/20">
                    <TableRow className="h-11">
                        <TableHead className="w-[60px] pl-4 text-[9px] font-black uppercase tracking-widest text-muted-foreground">Foto</TableHead>
                        <TableHead onClick={() => requestSort('code')} className="cursor-pointer hover:text-primary transition-colors">
                            <div className="flex items-center gap-1 uppercase text-[9px] font-black tracking-widest">Kode {getSortIcon('code')}</div>
                        </TableHead>
                        <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:text-primary transition-colors min-w-[200px]">
                            <div className="flex items-center gap-1 uppercase text-[9px] font-black tracking-widest">Nama {getSortIcon('name')}</div>
                        </TableHead>
                        <TableHead className="text-center px-2 w-[120px]">
                            <div className="flex flex-col items-center">
                                <span className="uppercase text-[9px] font-black tracking-widest">Stok Fisik</span>
                            </div>
                        </TableHead>
                        <TableHead className="text-center px-2 w-[120px]">
                            <div className="flex flex-col items-center">
                                <span className="uppercase text-[9px] font-black tracking-widest text-primary">Sisa Tersedia</span>
                            </div>
                        </TableHead>
                        <TableHead className="text-right pr-6 uppercase text-[9px] font-black tracking-widest min-w-[120px]">Aksi</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {loading || authLoading ? (
                        Array.from({ length: 5 }).map((_, i) => (
                            <TableRow key={i}>
                                <TableCell colSpan={6} className="px-6"><Skeleton className="h-10 w-full rounded-xl" /></TableCell>
                            </TableRow>
                        ))
                    ) : items.length > 0 ? (
                        items.map((item) => (
                            <TableRow key={item.id} className="group h-16 hover:bg-slate-50/80 dark:hover:bg-slate-850/30 transition-colors border-slate-50 dark:border-slate-800">
                                <TableCell className="pl-4">
                                    <div 
                                        className="relative h-9 w-9 rounded-lg overflow-hidden border border-slate-100 dark:border-slate-800 shadow-sm bg-white cursor-zoom-in hover:scale-105 transition-transform active:scale-95"
                                        onClick={() => setPreviewPhoto({ url: item.photoURL || 'https://placehold.co/300x300/F1F5F9/64748B?text=No+Image', name: item.name })}
                                    >
                                        <Image
                                            src={item.photoURL || 'https://placehold.co/100x100/F1F5F9/64748B?text=Produk'}
                                            alt={item.name}
                                            fill
                                            className="object-cover"
                                        />
                                    </div>
                                </TableCell>
                                <TableCell className="font-mono font-bold text-[10px] text-primary whitespace-nowrap">{item.code}</TableCell>
                                <TableCell>
                                    <div className="flex flex-col max-w-[250px] text-left">
                                        <span className="font-bold text-xs text-slate-800 dark:text-slate-100 line-clamp-1 text-left" title={item.name}>{item.name}</span>
                                        <span className="text-[9px] text-muted-foreground uppercase font-bold tracking-tight text-left">{item.category} • {item.unit}</span>
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <div className="flex flex-col items-center">
                                        <span className="text-xs font-bold text-slate-600 dark:text-slate-400">{item.stock}</span>
                                        {item.outgoingRequests > 0 && (
                                            <TooltipProvider>
                                                <Tooltip>
                                                    <TooltipTrigger asChild>
                                                        <div className="flex items-center gap-1 mt-0.5 px-1.5 py-0.5 bg-amber-50 rounded border border-amber-100 cursor-help">
                                                            <Clock className="h-2.5 w-2.5 text-amber-600" />
                                                            <span className="text-[7px] font-black text-amber-700">-{item.outgoingRequests} BOOKING</span>
                                                        </div>
                                                    </TooltipTrigger>
                                                    <TooltipContent className="bg-slate-900 text-white border-none rounded-xl p-3">
                                                        <p className="text-[10px] font-bold leading-relaxed">
                                                            Ada {item.outgoingRequests} unit yang sedang <br/> menunggu persetujuan HRGA.
                                                        </p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </TooltipProvider>
                                        )}
                                    </div>
                                </TableCell>
                                <TableCell className="text-center">
                                    <Badge 
                                        variant={item.remainingStock > 0 ? "success" : "destructive"} 
                                        className={cn(
                                            "rounded-lg font-bold text-xs min-w-[32px] justify-center h-6 shadow-none border-none ring-1 ring-inset",
                                            item.remainingStock > 0 ? "bg-emerald-500/10 text-emerald-600 ring-emerald-500/20" : "bg-rose-500/10 text-rose-600 ring-rose-500/20"
                                        )}
                                    >
                                        {item.remainingStock}
                                    </Badge>
                                </TableCell>
                                <TableCell className="text-right pr-6">
                                <div className="flex justify-end items-center gap-2">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                                        onClick={() => handleOpenHistory(item)}
                                        title="Riwayat Pengambilan"
                                    >
                                        <History className="h-4 w-4" />
                                    </Button>
                                    <RequestItemForm item={item}>
                                        <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-slate-200 bg-white hover:bg-primary hover:text-white hover:border-primary transition-all font-black uppercase text-[10px] tracking-widest shadow-[0_3px_0_0_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-none text-left">
                                            <ShoppingCart className="mr-1.5 h-3.5 w-3.5" /> Minta
                                        </Button>
                                    </RequestItemForm>
                                    {canManageInventory && (
                                        <div className="flex items-center gap-1.5 ml-1 pl-1 border-l border-slate-100 dark:border-slate-800">
                                            <UpdateStockDialog item={item}>
                                                <Button variant="outline" size="sm" className="h-9 px-4 rounded-xl border-blue-200 bg-white text-blue-700 hover:bg-blue-600 hover:text-white transition-all font-black uppercase text-[10px] tracking-widest shadow-[0_3px_0_0_rgba(29,78,216,0.1)] active:translate-y-[2px] active:shadow-none text-left">
                                                    <ArrowRightLeft className="mr-1.5 h-3.5 w-3.5" /> Stok
                                                </Button>
                                            </UpdateStockDialog>
                                            <InventoryForm item={item} itemType={item.type}>
                                                <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-amber-50 hover:text-amber-600">
                                                    <Edit className="h-4 w-4" />
                                                </Button>
                                            </InventoryForm>
                                            {canDeleteInventory && (
                                              <DeleteInventoryItemDialog itemId={item.id} itemName={item.name}>
                                                  <Button variant="ghost" size="icon" className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600">
                                                      <Trash2 className="h-4 w-4" />
                                                  </Button>
                                              </DeleteInventoryItemDialog>
                                            )}
                                        </div>
                                    )}
                                </div>
                                </TableCell>
                            </TableRow>
                        ))
                    ) : (
                        <TableRow>
                            <TableCell colSpan={6} className="h-40 text-center">
                                <div className="flex flex-col items-center gap-2 opacity-20">
                                    <AlertCircle className="h-12 w-12" />
                                    <p className="text-xs font-black uppercase tracking-widest">Tidak ada barang ditemukan</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </div>
    </div>
  );

  return (
    <div className="space-y-6 max-w-full overflow-hidden pb-10 text-black">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 px-1">
        <div className="text-left">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase text-left">Inventaris Perusahaan</h1>
          <p className="text-xs text-slate-500 font-medium text-left">Pantau pergerakan stok ATK, Sparepart, dan perlengkapan lainnya.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button onClick={handleSharePublicLink} variant="outline" disabled={isSharing} className="rounded-xl h-10 px-4 bg-white border-indigo-100 text-indigo-700 hover:bg-indigo-50 font-bold uppercase text-[9px] tracking-wider transition-all">
              {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} 
              Link Publik
          </Button>
          <div className="flex items-center gap-1.5 bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-100 dark:border-slate-800">
            {user?.role === 'Admin' && <ImportInventoryDialog itemType={activeTab} />}
            <ExportInventoryButton items={filteredAndSortedItems} itemType={activeTab} />
          </div>
          {canManageInventory && (
              <InventoryForm itemType={activeTab}>
                  <Button className="rounded-xl h-10 px-6 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[9px] tracking-wider transition-all text-white">
                      <PlusCircle className="mr-2 h-4 w-4" /> Tambah Barang
                  </Button>
              </InventoryForm>
          )}
        </div>
      </div>

      <InventoryTip />

      <Card className="border border-slate-100 dark:border-slate-800 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md rounded-2xl overflow-hidden text-black shadow-[0_2px_12px_rgba(0,0,0,0.01)]">
        <CardHeader className="p-4 sm:p-6 pb-2 text-left">
          <div className="flex flex-col lg:flex-row gap-3 mb-6 text-left">
              <div className="relative flex-1 group text-left">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                  <Input
                      placeholder="Cari berdasarkan nama atau kode barang..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="h-11 pl-11 bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-xl shadow-inner font-bold text-sm text-black"
                  />
              </div>
              <Button asChild variant="outline" className="h-11 rounded-xl bg-white dark:bg-slate-950 px-6 border-slate-200 transition-all font-black uppercase text-[9px] tracking-wider">
                  <Link href="/inventory/report">
                      <FileText className="mr-2 h-4.5 w-4.5 text-primary" /> Laporan Stok
                  </Link>
              </Button>
          </div>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="bg-slate-100/50 dark:bg-slate-800/50 p-1 rounded-xl border border-slate-200/50 dark:border-slate-700/50 mb-6 h-auto min-h-[2.75rem] w-full sm:w-fit flex flex-wrap gap-1">
                  {inventoryTypes.map(type => (
                      <TabsTrigger key={type} value={type} className="flex-1 sm:flex-none sm:px-6 rounded-lg font-bold text-[10px] uppercase tracking-wider data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-sm transition-all py-2 h-auto">
                          {type === 'ATK' ? 'Logistik ATK' : (type === 'Alat Kebersihan' ? 'Kebersihan' : type)}
                      </TabsTrigger>
                  ))}
              </TabsList>
              
              <div className="pb-4">
                  {inventoryTypes.map(type => (
                      <TabsContent key={type} value={type} className="mt-0 focus-visible:ring-0">
                          {renderTable(filteredAndSortedItems)}
                      </TabsContent>
                  ))}
              </div>
          </Tabs>
        </CardHeader>
      </Card>
      
      {historyItem && (
        <InventoryHistoryDialog 
            item={historyItem}
            isOpen={isHistoryOpen}
            onOpenChange={setIsHistoryOpen}
        />
      )}

      {previewPhoto && (
        <Dialog open={!!previewPhoto} onOpenChange={(open) => !open && setPreviewPhoto(null)}>
            <DialogContent className="max-w-md sm:max-w-lg p-0 bg-transparent border-none overflow-hidden flex flex-col items-center justify-center">
                <DialogTitle className="sr-only">Pratinjau Foto {previewPhoto.name}</DialogTitle>
                <div className="relative w-full aspect-square rounded-2xl overflow-hidden shadow-2xl border border-white/10">
                    <Image
                        src={previewPhoto.url}
                        alt={previewPhoto.name}
                        fill
                        className="object-cover"
                    />
                </div>
                <div className="mt-4 px-4 py-2 bg-slate-900/90 backdrop-blur-md rounded-full text-white text-xs font-bold uppercase tracking-widest text-center shadow-lg border border-white/10 max-w-[90%] truncate">
                    {previewPhoto.name}
                </div>
            </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
