'use client';

/**
 * @fileOverview Katalog Inventaris Publik.
 * Penambahan: Pengiriman kategori terstandardisasi saat checkout.
 */

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, addDoc, serverTimestamp, writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryItem, type InventoryType } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  ShoppingCart, 
  Search, 
  Plus, 
  Minus, 
  Trash2, 
  User, 
  Building, 
  CheckCircle2, 
  Loader2, 
  X,
  Package,
  Info,
  ArrowRight
} from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const checkoutSchema = z.object({
  name: z.string().min(3, 'Nama lengkap wajib diisi.'),
  department: z.string().min(1, 'Departemen wajib dipilih.'),
});

interface CartItem {
    item: InventoryItem;
    quantity: number;
}

const departmentOptions = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];

export default function PublicInventoryContent() {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [inventoryTypes, setInventoryTypes] = useState<string[]>(['ATK', 'Sparepart', 'Alat Kebersihan', 'Obat-obatan']);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<string>('ATK');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutStep, setIsCheckoutStep] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof checkoutSchema>>({
    resolver: zodResolver(checkoutSchema),
    defaultValues: { name: '', department: '' },
  });

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
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setItems(data);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const filteredItems = useMemo(() => {
    return items.filter(item => 
      item.type === activeTab &&
      (item.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
       item.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );
  }, [items, activeTab, searchTerm]);

  const addToCart = (item: InventoryItem) => {
    if (item.stock <= 0) {
        toast({ variant: 'destructive', title: 'Stok Habis', description: 'Maaf, barang ini tidak tersedia.' });
        return;
    }
    
    setCart(prev => {
        const existing = prev.find(i => i.item.id === item.id);
        if (existing) {
            if (existing.quantity >= item.stock) {
                toast({ variant: 'warning', title: 'Batas Stok', description: 'Jumlah di troli sudah mencapai batas stok tersedia.' });
                return prev;
            }
            return prev.map(i => i.item.id === item.id ? { ...i, quantity: i.quantity + 1 } : i);
        }
        return [...prev, { item, quantity: 1 }];
    });
    toast({ title: 'Ditambahkan', description: `${item.name} masuk ke troli.` });
  };

  const updateQuantity = (itemId: string, delta: number) => {
    setCart(prev => prev.map(i => {
        if (i.item.id === itemId) {
            const newQty = Math.max(1, Math.min(i.quantity + delta, i.item.stock));
            return { ...i, quantity: newQty };
        }
        return i;
    }));
  };

  const removeFromCart = (itemId: string) => {
    setCart(prev => prev.filter(i => i.item.id !== itemId));
  };

  const handleCheckout = async (values: z.infer<typeof checkoutSchema>) => {
    if (cart.length === 0) return;
    setIsSubmitting(false);

    try {
        const batch = writeBatch(db);
        const requestsRef = collection(db, 'inventory_requests');

        for (const cartItem of cart) {
            const newRequestRef = doc(requestsRef);
            
            // Map item type to specific standard labels consistently
            let finalCategory = 'Lainnya';
            if (cartItem.item.type === 'ATK') finalCategory = 'Logistik ATK';
            else if (cartItem.item.type === 'Sparepart') finalCategory = 'Sparepart';
            else if (cartItem.item.type === 'Alat Kebersihan') finalCategory = 'Kebersihan';
            else if (cartItem.item.type === 'Obat-obatan') finalCategory = 'Obat-obatan';

            batch.set(newRequestRef, {
                inventoryId: cartItem.item.id,
                inventoryCode: cartItem.item.code,
                inventoryName: cartItem.item.name,
                inventoryCategory: finalCategory,
                quantity: cartItem.quantity,
                requestingUserId: 'PUBLIC_ACCESS',
                requestingUserName: values.name,
                requestingDept: values.department,
                status: 'Menunggu Persetujuan HRGA',
                requestedAt: serverTimestamp(),
            });
        }

        await batch.commit();
        toast({ 
            title: 'Pesanan Berhasil', 
            description: 'Permintaan Anda telah dikirim. Silakan ambil barang di gudang setelah disetujui HR & GA.' 
        });
        setCart([]);
        setIsCartOpen(false);
        setIsCheckoutStep(false);
        form.reset();
    } catch (error) {
        console.error("Checkout error:", error);
        toast({ variant: 'destructive', title: 'Gagal Checkout' });
    } finally {
        setIsSubmitting(false);
    }
  };

  const renderItemCard = (item: InventoryItem) => (
    <Card key={item.id} className="overflow-hidden group hover:shadow-xl transition-all duration-500 border-slate-100 rounded-3xl bg-white flex flex-col">
        <div className="relative aspect-square overflow-hidden bg-slate-50">
            <Image 
                src={item.photoURL || 'https://placehold.co/400x400/F1F5F9/64748B?text=Produk'} 
                alt={item.name} 
                fill 
                className="object-cover group-hover:scale-110 transition-transform duration-500" 
            />
            <div className="absolute top-3 left-3 flex flex-col gap-1.5">
                <Badge className="bg-white/90 backdrop-blur-md text-slate-900 border-none font-black text-[9px] shadow-sm uppercase tracking-widest">{item.code}</Badge>
                {item.stock <= 5 && item.stock > 0 && (
                    <Badge className="bg-rose-50 text-white border-none font-black text-[9px] shadow-sm uppercase">Stok Menipis</Badge>
                )}
            </div>
        </div>
        <CardContent className="p-5 flex-1 flex flex-col justify-between">
            <div>
                <h3 className="font-black text-slate-900 text-sm leading-tight line-clamp-2 uppercase h-10 mb-1">{item.name}</h3>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">{item.category} • {item.unit}</p>
            </div>
            
            <div className="flex items-center justify-between mt-auto">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black text-muted-foreground uppercase tracking-tighter">Tersedia</span>
                    <span className={cn("text-lg font-black leading-none", item.stock > 0 ? "text-primary" : "text-rose-500")}>
                        {item.stock} <small className="text-[10px] uppercase font-bold">{item.unit}</small>
                    </span>
                </div>
                <Button 
                    onClick={() => addToCart(item)}
                    disabled={item.stock <= 0}
                    className={cn(
                        "h-10 rounded-xl font-black uppercase tracking-widest text-[10px] px-5 shadow-lg active:scale-95 transition-all",
                        item.stock > 0 ? "bg-primary hover:bg-primary/90 text-white shadow-primary/20" : "bg-slate-100 text-slate-400 cursor-not-allowed"
                    )}
                >
                    {item.stock > 0 ? <><ShoppingCart className="mr-2 h-3.5 w-3.5" /> Ambil</> : 'Habis'}
                </Button>
            </div>
        </CardContent>
    </Card>
  );

  return (
    <div className="space-y-8 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <Badge variant="outline" className="rounded-full px-3 py-0.5 border-primary/30 text-primary font-black text-[9px] uppercase tracking-[0.2em]">Katalog Logistik</Badge>
          <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase">Pilih Kebutuhan Anda</h2>
        </div>
        <div className="relative w-full md:w-96 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
          <Input
            placeholder="Cari barang atau kode..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-14 pl-14 bg-white border-slate-200 rounded-2xl shadow-inner font-medium text-base focus:ring-2 focus:ring-primary/10"
          />
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="bg-slate-100 p-1.5 rounded-[2rem] h-auto mb-8 w-full sm:w-fit flex flex-wrap shadow-inner border border-slate-200">
          {inventoryTypes.map((type) => (
            <TabsTrigger 
                key={type} 
                value={type} 
                className="flex-1 sm:flex-none sm:px-10 rounded-[1.7rem] font-black text-xs uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-xl transition-all py-3 sm:py-2 h-auto min-h-[3rem]"
            >
              {type === 'ATK' ? 'Logistik ATK' : (type === 'Alat Kebersihan' ? 'Kebersihan' : type)}
            </TabsTrigger>
          ))}
        </TabsList>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
          {loading ? (
            Array.from({ length: 10 }).map((_, i) => <Skeleton key={i} className="h-72 w-full rounded-3xl" />)
          ) : filteredItems.length > 0 ? (
            filteredItems.map(renderItemCard)
          ) : (
            <div className="col-span-full py-20 text-center bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
                <Package className="h-16 w-16 text-slate-200 mx-auto mb-4" />
                <h3 className="text-xl font-black text-slate-400 uppercase tracking-widest">Barang Tidak Ditemukan</h3>
                <p className="text-sm text-slate-400 mt-2">Coba gunakan kata kunci pencarian yang lain.</p>
            </div>
          )}
        </div>
      </Tabs>

      {/* Floating Cart Button */}
      {cart.length > 0 && (
        <button 
            onClick={() => { setIsCartOpen(true); setIsCheckoutStep(false); }}
            className="fixed bottom-8 right-8 z-[60] group animate-in slide-in-from-bottom-10 duration-500"
        >
            <div className="relative bg-slate-900 text-white px-8 py-5 rounded-[2rem] shadow-2xl flex items-center gap-4 hover:scale-105 active:scale-95 transition-all">
                <div className="relative">
                    <ShoppingCart className="h-6 w-6" />
                    <span className="absolute -top-3 -right-3 bg-primary text-white text-[10px] font-black h-6 w-6 rounded-full flex items-center justify-center border-4 border-slate-900">
                        {cart.length}
                    </span>
                </div>
                <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Fix Pengambilan</span>
                    <span className="text-sm font-black uppercase">{cart.length} Jenis Barang</span>
                </div>
                <ArrowRight className="h-5 w-5 text-primary group-hover:translate-x-1 transition-transform" />
            </div>
        </button>
      )}

      {/* Cart & Checkout Dialog */}
      <Dialog open={isCartOpen} onOpenChange={setIsCartOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none rounded-[3rem] shadow-2xl bg-white">
            <div className={cn(
                "px-8 py-10 text-white flex flex-col items-center text-center gap-2 transition-colors duration-500",
                isCheckoutStep ? "bg-emerald-600" : "bg-slate-900"
            )}>
                <div className="p-4 bg-white/10 rounded-full backdrop-blur-md mb-2 border border-white/20">
                    {isCheckoutStep ? <CheckCircle2 className="w-8 h-8" /> : <ShoppingCart className="w-8 h-8" />}
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                    {isCheckoutStep ? 'Konfirmasi Identitas' : 'Troli Pengambilan'}
                </DialogTitle>
                <DialogDescription className="text-white/60 font-medium">
                    {isCheckoutStep ? 'Mohon lengkapi data untuk laporan logistik.' : 'Periksa kembali daftar barang yang akan Anda ambil.'}
                </DialogDescription>
                <DialogClose asChild className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors cursor-pointer">
                    <X className="h-6 w-6" />
                </DialogClose>
            </div>

            <div className="p-8">
                {!isCheckoutStep ? (
                    <div className="space-y-6">
                        <div className="max-h-[40vh] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                            {cart.map((c) => (
                                <div key={c.item.id} className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100 group">
                                    <div className="relative h-14 w-14 rounded-xl overflow-hidden border bg-white shrink-0">
                                        <Image src={c.item.photoURL || 'https://placehold.co/100x100'} alt={c.item.name} fill className="object-cover" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-black text-slate-900 text-[11px] leading-tight uppercase truncate">{c.item.name}</h4>
                                        <p className="text-[10px] font-bold text-slate-400 mt-0.5">{c.item.code} • sisa: {c.item.stock}</p>
                                        <div className="flex items-center gap-3 mt-2">
                                            <div className="flex items-center bg-white border border-slate-200 rounded-lg p-0.5 shadow-sm">
                                                <button onClick={() => updateQuantity(c.item.id, -1)} className="h-6 w-6 flex items-center justify-center hover:text-primary transition-colors"><Minus className="h-3 w-3" /></button>
                                                <span className="w-8 text-center text-xs font-black">{c.quantity}</span>
                                                <button onClick={() => updateQuantity(c.item.id, 1)} className="h-6 w-6 flex items-center justify-center hover:text-primary transition-colors"><Plus className="h-3 w-3" /></button>
                                            </div>
                                            <span className="text-[10px] font-bold text-slate-400 uppercase">{c.item.unit}</span>
                                        </div>
                                    </div>
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => removeFromCart(c.item.id)}
                                        className="h-9 w-9 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 transition-all"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            ))}
                        </div>

                        <div className="bg-primary/5 p-5 rounded-3xl border border-primary/10 flex items-start gap-4">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <p className="text-[11px] leading-relaxed text-slate-600 font-medium">
                                Jika daftar barang sudah sesuai, klik tombol di bawah untuk melanjutkan pengisian data identitas pengambil.
                            </p>
                        </div>

                        <Button 
                            onClick={() => setIsCheckoutStep(true)}
                            className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] shadow-2xl transition-all active:scale-95"
                        >
                            Lanjut Pengisian Data <ArrowRight className="ml-2 h-5 w-5" />
                        </Button>
                    </div>
                ) : (
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(handleCheckout)} className="space-y-6">
                            <FormField
                                control={form.control}
                                name="name"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Nama Lengkap Pengambil</FormLabel>
                                    <FormControl>
                                        <div className="relative group">
                                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-emerald-600 transition-colors" />
                                            <Input placeholder="Nama Anda..." className="h-12 pl-11 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-emerald-600/20 shadow-inner" {...field} />
                                        </div>
                                    </FormControl>
                                    <FormMessage className="text-[10px] font-bold pl-2" />
                                </FormItem>
                                )}
                            />

                            <FormField
                                control={form.control}
                                name="department"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Departemen</FormLabel>
                                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                                        <FormControl>
                                            <div className="relative group">
                                                <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 z-10 group-focus-within:text-emerald-600 transition-colors" />
                                                <SelectTrigger className="h-12 pl-11 bg-slate-50 border-none rounded-xl font-bold focus:ring-2 focus:ring-emerald-600/20 shadow-inner">
                                                    <SelectValue placeholder="Pilih departemen..." />
                                                </SelectTrigger>
                                            </div>
                                        </FormControl>
                                        <SelectContent className="rounded-xl border-slate-100 max-h-[300px]">
                                            {departmentOptions.map(d => <SelectItem key={d} value={d} className="font-bold text-xs">{d}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                    <FormMessage className="text-[10px] font-bold pl-2" />
                                </FormItem>
                                )}
                            />

                            <div className="pt-2 flex gap-3">
                                <Button type="button" variant="ghost" onClick={() => setIsCheckoutStep(false)} className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-slate-400">Kembali</Button>
                                <Button type="submit" disabled={isSubmitting} className="flex-[2] rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.15em] shadow-2xl shadow-emerald-600/20 transition-all active:scale-95">
                                    {isSubmitting ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                                    Konfirmasi & Kirim
                                </Button>
                            </div>
                        </form>
                    </Form>
                )}
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Skeleton({ className }: { className?: string }) {
    return <div className={cn("animate-pulse bg-slate-200", className)} />;
}
