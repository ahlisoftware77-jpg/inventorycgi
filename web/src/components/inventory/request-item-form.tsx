'use client';

/**
 * @fileOverview Formulir Permintaan Barang Inventaris (Internal).
 * Desain: Premium Corporate, Elegan, dan Rapi.
 * Menampilkan ringkasan barang sebelum konfirmasi.
 * Penambahan: Pengiriman data kategori yang terstandardisasi.
 */

import { useState, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { type InventoryItem } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, ShoppingCart, Info, Package, MapPin, X, CheckCircle2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface RequestItemFormProps {
  item: InventoryItem;
  children: ReactNode;
}

const requestSchema = z.object({
  quantity: z.coerce.number().int().min(1, 'Jumlah permintaan minimal 1.'),
});

type RequestFormValues = z.infer<typeof requestSchema>;

export default function RequestItemForm({ item, children }: RequestItemFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<RequestFormValues>({
    resolver: zodResolver(requestSchema),
    defaultValues: { quantity: 1 },
  });

  async function onSubmit(values: RequestFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Anda harus login' });
      return;
    }
    if (values.quantity > item.stock) {
      form.setError('quantity', { message: `Stok tidak mencukupi. Sisa stok: ${item.stock}` });
      return;
    }

    setIsLoading(true);
    try {
      // Map item type to specific standard labels consistently
      let finalCategory = item.type || 'Lainnya';
      if (item.type === 'ATK') finalCategory = 'Logistik ATK';
      else if (item.type === 'Alat Kebersihan') finalCategory = 'Kebersihan';

      await addDoc(collection(db, 'inventory_requests'), {
        inventoryId: item.id,
        inventoryCode: item.code,
        inventoryName: item.name,
        inventoryCategory: finalCategory,
        quantity: values.quantity,
        requestingUserId: user.uid,
        requestingUserName: user.displayName || user.email,
        requestingDept: user.department || 'N/A',
        status: 'Menunggu Persetujuan HRGA',
        requestedAt: serverTimestamp(),
      });

      toast({
        title: 'Permintaan Terkirim',
        description: `Permintaan ${values.quantity} ${item.unit} ${item.name} telah dikirim ke HR & GA.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error creating request:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mengirim permintaan.' });
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] my-8 p-0 overflow-hidden border-none shadow-2xl bg-white dark:bg-slate-950 rounded-[2.5rem]" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="px-8 py-8 bg-primary text-white flex flex-col items-center text-center gap-2 shrink-0 relative">
            <div className="p-3.5 bg-white/20 rounded-full backdrop-blur-md mb-1 shadow-lg border border-white/30">
                <ShoppingCart className="w-7 h-7 text-white" />
            </div>
            <DialogTitle className="text-xl font-black tracking-tight uppercase">Minta Barang</DialogTitle>
            <DialogDescription className="text-white/80 font-medium text-xs">
                Sampaikan permintaan logistik ke departemen HR & GA.
            </DialogDescription>
            <DialogClose asChild className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8"><X className="h-5 w-5" /></Button>
            </DialogClose>
        </div>

        <div className="p-6 space-y-6 overflow-y-auto">
            {/* Item Summary Card */}
            <div className="flex items-center gap-4 p-4 bg-slate-50 dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner group">
                <div className="relative h-16 w-16 rounded-2xl overflow-hidden border-2 border-white dark:border-slate-800 shadow-sm shrink-0 group-hover:scale-105 transition-transform">
                    <Image 
                        src={item.photoURL || 'https://placehold.co/100x100?text=Produk'} 
                        alt={item.name} 
                        fill 
                        className="object-cover" 
                    />
                </div>
                <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-900 dark:text-white text-sm leading-tight truncate uppercase">{item.name}</h4>
                    <p className="text-[9px] font-black uppercase text-muted-foreground tracking-widest mt-0.5">{item.code} • {item.unit}</p>
                    <div className="flex items-center gap-1.5 mt-1.5 text-primary">
                        <Info className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase">Tersedia: {item.stock} {item.unit}</span>
                    </div>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 max-w-sm mx-auto">
                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Jumlah Permintaan</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <Package className="absolute left-5 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        type="number" 
                                        {...field} 
                                        min={1} 
                                        max={item.stock} 
                                        className="h-14 pl-14 bg-slate-50 border-none rounded-2xl font-black text-xl focus:ring-2 focus:ring-primary/20 shadow-inner"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold pl-4 text-rose-500" />
                        </FormItem>
                        )}
                    />

                    <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800 flex items-start gap-3">
                        <div className="p-1.5 bg-white dark:bg-slate-800 rounded-lg shadow-sm shrink-0">
                            <MapPin className="w-4 h-4 text-primary" />
                        </div>
                        <p className="text-[10px] leading-relaxed text-blue-900 dark:text-blue-200 font-medium">
                            Barang dapat diambil di <strong>{item.location}</strong> setelah disetujui oleh admin departemen HR & GA.
                        </p>
                    </div>

                    <div className="flex gap-3 pt-2">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-12 font-black uppercase tracking-widest text-slate-400 text-[10px]">Batal</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading} className="flex-[2] rounded-2xl h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.15em] shadow-xl shadow-primary/20 transition-all active:scale-95 text-[10px]">
                            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Konfirmasi
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
