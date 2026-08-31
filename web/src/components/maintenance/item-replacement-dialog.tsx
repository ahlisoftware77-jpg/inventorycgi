'use client';

/**
 * @fileOverview Dialog untuk memilih barang inventaris sebagai pengganti (Part Replacement).
 * Terintegrasi dengan stok inventaris, pencatatan transaksi otomatis, dan log permintaan barang.
 * Penambahan: Input Nama Peminta untuk sinkronisasi kolom "Peminta" di log inventaris.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, query, getDocs, writeBatch, doc, serverTimestamp, increment, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryItem, type MaintenanceSchedule } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Search, Loader2, Package, Check, X, Box, Info, Minus, Plus, User } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';

interface ItemReplacementDialogProps {
  schedule: MaintenanceSchedule;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ItemReplacementDialog({ schedule, isOpen, onOpenChange }: ItemReplacementDialogProps) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [requesterName, setRequesterName] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchInventory();
      setSelectedItem(null);
      setQuantity(1);
      setSearchTerm('');
      setRequesterName(schedule.technician || user?.displayName || '');
    }
  }, [isOpen, schedule.technician, user?.displayName]);

  const fetchInventory = async () => {
    setIsDataLoading(true);
    try {
      const q = query(collection(db, 'inventory'));
      const snapshot = await getDocs(q);
      setItems(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem)));
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setIsDataLoading(false);
    }
  };

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.code.toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => a.name.localeCompare(b.name));
  }, [items, searchTerm]);

  const handleSaveReplacement = async () => {
    if (!selectedItem || !user || quantity <= 0) return;
    
    if (quantity > selectedItem.stock) {
        toast({ variant: 'destructive', title: 'Stok Tidak Mencukupi', description: `Sisa stok: ${selectedItem.stock} ${selectedItem.unit}` });
        return;
    }

    if (!requesterName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Peminta Wajib Diisi' });
        return;
    }

    setIsSaving(true);
    const batch = writeBatch(db);

    try {
        // 1. Update Maintenance Schedule (Add to partsUsed array)
        const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
        batch.update(scheduleRef, {
            partsUsed: arrayUnion({
                inventoryId: selectedItem.id,
                code: selectedItem.code,
                name: selectedItem.name,
                quantity: quantity,
                unit: selectedItem.unit,
                addedAt: Timestamp.now()
            })
        });

        // 2. Create Inventory Request Record (Linked to Maintenance for Admin Validation)
        const requestRef = doc(collection(db, 'inventory_requests'));
        let finalCategory = selectedItem.type || 'Lainnya';
        if (selectedItem.type === 'ATK') finalCategory = 'Logistik ATK';
        else if (selectedItem.type === 'Alat Kebersihan') finalCategory = 'Kebersihan';

        batch.set(requestRef, {
            inventoryId: selectedItem.id,
            inventoryCode: selectedItem.code,
            inventoryName: selectedItem.name,
            inventoryCategory: finalCategory,
            quantity: quantity,
            requestingUserId: user.uid,
            requestingUserName: requesterName.trim(),
            requestingDept: schedule.department,
            status: 'Menunggu Persetujuan HRGA', // Requires Admin approval & validation
            requestedAt: serverTimestamp(),
            maintenanceId: schedule.id, // THE LINK TO MAINTENANCE
            notes: `Permintaan pergantian part maintenance aset ${schedule.assetCode} (${schedule.assetName})`
        });

        await batch.commit();
        toast({ 
            title: 'Permintaan Part Terkirim', 
            description: `Permintaan ${quantity} ${selectedItem.unit} ${selectedItem.name} dikirim ke Logistik. Menunggu persetujuan Admin.` 
        });
        onOpenChange(false);
    } catch (error) {
        console.error("Error saving replacement:", error);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
        setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="sm:max-w-2xl p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] mx-auto text-black">
        <div className="px-8 py-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2 shrink-0 relative">
          <div className="p-3.5 bg-white/10 rounded-full backdrop-blur-md mb-1 shadow-lg border border-white/20">
            <Package className="w-8 h-8 text-primary" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight uppercase">Pergantian Barang / Part</DialogTitle>
          <DialogDescription className="text-white/60 font-medium text-xs">
            Pilih barang dari inventaris untuk mengganti komponen pada aset <span className="text-white font-bold">{schedule.assetName}</span>.
          </DialogDescription>
        </div>

        <div className="p-8 space-y-6">
          {!selectedItem ? (
            <div className="space-y-4">
              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                <Input 
                  placeholder="Cari nama barang atau kode..." 
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="h-14 pl-12 bg-slate-50 border-none rounded-2xl font-bold shadow-inner"
                />
              </div>

              <ScrollArea className="h-80 rounded-2xl border bg-slate-50/50 shadow-inner">
                <div className="p-4 space-y-2">
                  {isDataLoading ? (
                    Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-16 w-full rounded-xl" />)
                  ) : filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <div 
                        key={item.id} 
                        onClick={() => setSelectedItem(item)}
                        className="flex items-center gap-4 p-4 bg-white hover:bg-primary/5 rounded-2xl border border-slate-100 cursor-pointer transition-all group"
                      >
                        <div className="relative h-12 w-12 rounded-xl overflow-hidden border shrink-0 bg-slate-50">
                            <Image src={item.photoURL || 'https://placehold.co/100x100?text=Part'} alt={item.name} fill className="object-cover" />
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                            <h4 className="font-black text-slate-900 text-xs uppercase truncate group-hover:text-primary transition-colors text-left">{item.name}</h4>
                            <p className="text-[10px] font-bold text-muted-foreground uppercase text-left">{item.code} • {item.category}</p>
                        </div>
                        <div className="text-right">
                            <Badge variant={item.stock > 0 ? "outline" : "destructive"} className="font-black text-[10px] uppercase">
                                {item.stock} {item.unit}
                            </Badge>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="h-40 flex flex-col items-center justify-center opacity-20 italic text-xs uppercase font-black tracking-widest">
                        Barang tidak ditemukan
                    </div>
                  )}
                </div>
              </ScrollArea>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                <div className="p-6 rounded-[2rem] bg-slate-50 border-2 border-primary/10 flex flex-col items-center gap-4 text-center">
                    <div className="relative h-24 w-24 rounded-2xl overflow-hidden border-4 border-white shadow-xl">
                        <Image src={selectedItem.photoURL || 'https://placehold.co/200x200?text=Part'} alt={selectedItem.name} fill className="object-cover" />
                    </div>
                    <div>
                        <h4 className="font-black text-slate-900 uppercase tracking-tight text-lg">{selectedItem.name}</h4>
                        <Badge className="mt-1 font-mono tracking-tighter text-xs">{selectedItem.code}</Badge>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setSelectedItem(null)} className="text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-full font-bold uppercase text-[9px]">Ganti Pilihan</Button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jumlah Unit ({selectedItem.unit})</Label>
                        <div className="flex items-center justify-between bg-slate-50 rounded-xl p-1 border">
                            <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.max(1, q - 1))} className="h-10 w-10 rounded-lg"><Minus className="h-4 w-4" /></Button>
                            <span className="text-xl font-black text-primary">{quantity}</span>
                            <Button variant="ghost" size="icon" onClick={() => setQuantity(q => Math.min(selectedItem.stock, q + 1))} className="h-10 w-10 rounded-lg"><Plus className="h-4 w-4" /></Button>
                        </div>
                    </div>

                    <div className="space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Peminta</Label>
                        <div className="relative group">
                            <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Nama peminta..." 
                                value={requesterName}
                                onChange={(e) => setRequesterName(e.target.value)}
                                className="h-12 pl-10 bg-slate-50 border-none rounded-xl font-bold shadow-inner"
                            />
                        </div>
                    </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-start gap-3 text-left">
                    <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                    <p className="text-[10px] leading-relaxed text-blue-800 font-medium text-left">
                        Tindakan ini akan langsung mengurangi stok di gudang dan mencatat log permintaan barang di halaman Inventaris atas nama peminta yang Anda masukkan.
                    </p>
                </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
          <DialogClose asChild>
            <Button variant="ghost" className="flex-1 rounded-2xl h-12 font-bold text-black dark:text-white">Batal</Button>
          </DialogClose>
          <Button 
            disabled={!selectedItem || isSaving} 
            onClick={handleSaveReplacement}
            className="flex-[2] rounded-2xl h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20"
          >
            {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
            Simpan Pergantian
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}