
'use client';

/**
 * @fileOverview Formulir Permintaan Barang Publik (Tanpa Login).
 * Desain: Bright, Mewah, dan Akuntabel.
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
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type InventoryItem } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, ShoppingCart, User, Building, Package, X, CheckCircle2, Info, MapPin } from 'lucide-react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface PublicRequestFormProps {
  item: InventoryItem & { remainingStock: number };
  children: ReactNode;
}

const publicRequestSchema = z.object({
  name: z.string().min(3, 'Mohon isi nama lengkap Anda.'),
  department: z.string().min(2, 'Mohon isi departemen Anda.'),
  quantity: z.coerce.number().int().min(1, 'Jumlah minimal 1.'),
});

type PublicRequestFormValues = z.infer<typeof publicRequestSchema>;

export default function PublicRequestForm({ item, children }: PublicRequestFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const form = useForm<PublicRequestFormValues>({
    resolver: zodResolver(publicRequestSchema),
    defaultValues: { name: '', department: '', quantity: 1 },
  });

  async function onSubmit(values: PublicRequestFormValues) {
    if (values.quantity > item.remainingStock) {
      form.setError('quantity', { message: `Stok tidak mencukupi. Sisa: ${item.remainingStock}` });
      return;
    }

    setIsLoading(true);
    try {
      await addDoc(collection(db, 'inventory_requests'), {
        inventoryId: item.id,
        inventoryCode: item.code,
        inventoryName: item.name,
        quantity: values.quantity,
        requestingUserId: 'PUBLIC_GUEST',
        requestingUserName: values.name,
        requestingDept: values.department,
        status: 'Menunggu Persetujuan HRGA',
        requestedAt: serverTimestamp(),
      });

      toast({
        title: 'Permintaan Terkirim',
        description: `Halo ${values.name}, permintaan ${item.name} telah masuk ke sistem.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mengirim permintaan.' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "h-14 bg-slate-50 border-none rounded-2xl font-bold text-slate-900 focus:ring-2 focus:ring-primary/20 shadow-inner";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-lg p-0 overflow-hidden border-none shadow-2xl bg-white rounded-[3rem]" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="px-8 py-10 bg-slate-900 text-white flex flex-col items-center text-center gap-2 shrink-0 relative">
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-md mb-2 border border-white/10 shadow-xl">
                <ShoppingCart className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Konfirmasi Pengambilan</DialogTitle>
            <DialogDescription className="text-white/50 font-medium">
                Identitas diperlukan untuk memvalidasi stok gudang.
            </DialogDescription>
            <DialogClose asChild className="absolute top-6 right-6 text-white/20 hover:text-white transition-colors">
                <Button variant="ghost" size="icon" className="rounded-full"><X className="h-6 w-6" /></Button>
            </DialogClose>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto">
            <div className="flex items-center gap-5 p-5 bg-slate-50 rounded-[2rem] border border-slate-100 shadow-inner">
                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-white shadow-sm shrink-0">
                    <Image src={item.photoURL || 'https://placehold.co/100x100?text=Item'} alt={item.name} fill className="object-cover" />
                </div>
                <div className="min-w-0">
                    <h4 className="font-black text-slate-900 text-lg leading-tight truncate">{item.name}</h4>
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">{item.code} • {item.unit}</p>
                    <div className="flex items-center gap-1.5 mt-2 text-primary">
                        <Info className="w-3.5 h-3.5" />
                        <span className="text-[10px] font-black uppercase">Sisa Stok: {item.remainingStock}</span>
                    </div>
                </div>
            </div>

            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Nama Lengkap</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input {...field} className={cn(inputClass, "pl-12")} placeholder="Nama Anda" />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold text-rose-500" />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="department"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Departemen</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input {...field} className={cn(inputClass, "pl-12")} placeholder="e.g., HR & GA" />
                                    </div>
                                </FormControl>
                                <FormMessage className="text-[10px] font-bold text-rose-500" />
                            </FormItem>
                            )}
                        />
                    </div>

                    <FormField
                        control={form.control}
                        name="quantity"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-400 ml-1">Jumlah Pengambilan</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <Package className="absolute left-5 top-1/2 -translate-y-1/2 h-6 w-6 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input 
                                        type="number" 
                                        {...field} 
                                        min={1} 
                                        max={item.remainingStock} 
                                        className="h-20 pl-16 bg-slate-50 border-none rounded-3xl font-black text-3xl focus:ring-4 focus:ring-primary/10 shadow-inner"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold text-rose-500" />
                        </FormItem>
                        )}
                    />

                    <div className="bg-blue-50 p-5 rounded-[2rem] border border-blue-100 flex items-start gap-4">
                        <div className="p-2 bg-white rounded-xl shadow-sm">
                            <MapPin className="w-5 h-5 text-primary shrink-0" />
                        </div>
                        <p className="text-[11px] leading-relaxed text-blue-900 font-medium">
                            Barang dapat langsung diambil di <strong>{item.location}</strong> setelah Anda menekan tombol kirim. Data akan divalidasi oleh admin HR & GA.
                        </p>
                    </div>

                    <DialogFooter className="pt-4 gap-3 sm:flex-row">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-slate-400">Batal</Button>
                        </DialogClose>
                        <Button type="submit" disabled={isLoading} className="flex-[2] rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.15em] shadow-2xl shadow-primary/20 transition-all active:scale-95">
                            {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                            Konfirmasi Ambil
                        </Button>
                    </DialogFooter>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
