'use client';

/**
 * @fileOverview Dialog untuk memperbarui stok barang inventaris.
 * Menambahkan kolom Tanggal Transaksi dan PIC/Departemen untuk pelacakan laporan.
 * Sinkronisasi: Mencatat aksi "Masuk" ke Log Permintaan Barang (Inventory Requests).
 */

import { useState, useEffect, type ReactNode } from 'react';
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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type InventoryItem } from '@/lib/types';
import { doc, writeBatch, collection, serverTimestamp, increment, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, ArrowRightLeft, Package, History, Plus, Minus, Info, X, CheckCircle2, CalendarIcon, User, Building } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';

interface UpdateStockDialogProps {
  item: InventoryItem;
  children: ReactNode;
}

const updateStockSchema = z.object({
  action: z.enum(['in', 'out'], { required_error: 'Pilih jenis transaksi.' }),
  quantity: z.coerce.number().int().min(1, 'Jumlah harus minimal 1.'),
  transactionDate: z.date({ required_error: 'Tanggal transaksi harus diisi.' }),
  requesterName: z.string().optional(),
  requesterDept: z.string().optional(),
  notes: z.string().min(3, 'Catatan harus diisi.'),
});

type UpdateStockFormValues = z.infer<typeof updateStockSchema>;

export default function UpdateStockDialog({ item, children }: UpdateStockDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const form = useForm<UpdateStockFormValues>({
    resolver: zodResolver(updateStockSchema),
    defaultValues: {
      action: 'in',
      quantity: 1,
      transactionDate: new Date(),
      requesterName: '',
      requesterDept: '',
      notes: '',
    },
  });

  const watchedAction = form.watch('action');
  const watchedQuantity = form.watch('quantity');
  
  const quantityAsNumber = parseInt(String(watchedQuantity), 10) || 0;
  const stockChange = watchedAction === 'in' ? quantityAsNumber : -quantityAsNumber;
  const newStock = (item.stock || 0) + stockChange;

  async function onSubmit(values: UpdateStockFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Anda harus login' });
      return;
    }
    if (values.action === 'out' && values.quantity > item.stock) {
      form.setError('quantity', { message: `Stok keluar tidak boleh melebihi stok saat ini (${item.stock}).` });
      return;
    }

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      
      const itemRef = doc(db, 'inventory', item.id);
      const stockIncrement = values.action === 'in' ? values.quantity : -values.quantity;
      batch.update(itemRef, { 
        stock: increment(stockIncrement),
        lastUpdated: serverTimestamp()
      });

      const requestRef = values.action === 'in' ? doc(collection(db, 'inventory_requests')) : null;

      const transactionRef = doc(collection(db, 'inventory_transactions'));
      batch.set(transactionRef, {
        inventoryId: item.id,
        inventoryCode: item.code,
        inventoryName: item.name,
        action: values.action,
        quantity: values.quantity,
        stockBefore: item.stock,
        stockAfter: item.stock + stockIncrement,
        notes: values.notes || '',
        userId: user.uid,
        userName: user.displayName || user.email,
        requesterName: values.requesterName || '',
        requesterDept: values.requesterDept || '',
        transactionDate: Timestamp.fromDate(values.transactionDate),
        createdAt: serverTimestamp(),
        requestId: requestRef ? requestRef.id : null,
      });

      // SYNC TO INVENTORY REQUESTS LOG IF IT IS "IN" (BARANG MASUK)
      if (values.action === 'in' && requestRef) {
          let finalCategory = item.type || 'Lainnya';
          if (item.type === 'ATK') finalCategory = 'Logistik ATK';
          else if (item.type === 'Alat Kebersihan') finalCategory = 'Kebersihan';

          batch.set(requestRef, {
              inventoryId: item.id,
              inventoryCode: item.code,
              inventoryName: item.name,
              inventoryCategory: finalCategory,
              quantity: values.quantity,
              requestingUserId: user.uid,
              requestingUserName: values.requesterName || user.displayName || user.email,
              requestingDept: values.requesterDept || user.department || 'N/A',
              status: 'Disetujui',
              requestedAt: Timestamp.fromDate(values.transactionDate),
              processedByUserId: user.uid,
              processedByUserName: user.displayName || user.email,
              processedAt: serverTimestamp(),
              notes: `[BARANG MASUK] ${values.notes}`,
              isIncoming: true // Flag for special identification
          });
      }

      await batch.commit();

      toast({
        title: 'Stok Diperbarui',
        description: `Stok ${item.name} telah diperbarui menjadi ${newStock}.`,
      });
      setIsOpen(false);
      form.reset();
    } catch (error) {
      console.error('Error updating stock:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memperbarui stok.' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "bg-slate-50 border-none rounded-xl h-12 shadow-inner font-bold text-slate-900";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-md max-h-[85vh] my-8 p-0 overflow-y-auto border-none shadow-3xl bg-white rounded-[2.5rem] text-black" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className={cn(
            "px-8 py-10 text-white flex flex-col items-center text-center gap-2 shrink-0 transition-colors duration-500 sticky top-0 z-10",
            watchedAction === 'in' ? "bg-blue-600" : "bg-slate-800"
        )}>
            <div className="p-4 bg-white/10 rounded-full backdrop-blur-md mb-1 shadow-lg border border-white/20">
                <ArrowRightLeft className="w-8 h-8 text-white" />
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">Update Stok Barang</DialogTitle>
            <DialogDescription className="text-white/80 font-medium text-xs uppercase tracking-widest text-left">
                {item.name} ({item.code})
            </DialogDescription>
            <DialogClose asChild className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
                <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white"><X className="h-5 w-5" /></Button>
            </DialogClose>
        </div>

        <div className="p-8">
            <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="action"
                        render={({ field }) => (
                        <FormItem className="space-y-3">
                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Jenis Transaksi</FormLabel>
                            <FormControl>
                                <RadioGroup
                                    onValueChange={field.onChange}
                                    defaultValue={field.value}
                                    className="grid grid-cols-2 gap-4"
                                >
                                    <div className="relative">
                                        <RadioGroupItem value="in" id="in" className="peer sr-only" />
                                        <Label
                                            htmlFor="in"
                                            className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-blue-600 peer-data-[state=checked]:bg-blue-50/50 cursor-pointer transition-all shadow-sm"
                                        >
                                            <Plus className="mb-2 h-5 w-5 text-blue-600" />
                                            <span className="text-[10px] font-black uppercase">Barang Masuk</span>
                                        </Label>
                                    </div>
                                    <div className="relative">
                                        <RadioGroupItem value="out" id="out" className="peer sr-only" />
                                        <Label
                                            htmlFor="out"
                                            className="flex flex-col items-center justify-center rounded-2xl border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-slate-800 peer-data-[state=checked]:bg-slate-50 cursor-pointer transition-all shadow-sm"
                                        >
                                            <Minus className="mb-2 h-5 w-5 text-slate-800" />
                                            <span className="text-[10px] font-black uppercase">Barang Keluar</span>
                                        </Label>
                                    </div>
                                </RadioGroup>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="quantity"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Jumlah Unit</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Package className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                        <Input 
                                            type="number" 
                                            {...field} 
                                            min={1} 
                                            className={cn(inputClass, "pl-11 text-xl font-black")}
                                        />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />

                        <FormField
                            control={form.control}
                            name="transactionDate"
                            render={({ field }) => (
                            <FormItem className="flex flex-col text-left">
                                <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Tanggal Transaksi</FormLabel>
                                <FormControl>
                                    <div className="relative flex items-center">
                                        <Input 
                                            type="date"
                                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                if (!val) field.onChange(null);
                                                else {
                                                    const parsed = parse(val, "yyyy-MM-dd", new Date());
                                                    field.onChange(isValid(parsed) ? parsed : null);
                                                }
                                            }}
                                            className={cn(inputClass, "w-full pr-10 text-xs")}
                                        />
                                        <CalendarIcon className="absolute right-3 h-4 w-4 text-primary pointer-events-none" />
                                    </div>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 animate-in fade-in duration-300 text-left">
                         <FormField
                            control={form.control}
                            name="requesterName"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-left">{watchedAction === 'in' ? 'PIC Restok' : 'Nama Peminta'}</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <Input {...field} placeholder="Opsional" className={cn(inputClass, "pl-10 text-xs")} />
                                    </div>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="requesterDept"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground ml-1 text-left">Departemen</FormLabel>
                                <FormControl>
                                    <div className="relative group">
                                        <Building className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                                        <Input {...field} placeholder="Opsional" className={cn(inputClass, "pl-10 text-xs")} />
                                    </div>
                                </FormControl>
                            </FormItem>
                            )}
                        />
                    </div>

                    <div className={cn(
                        "p-5 rounded-[2rem] border flex flex-col gap-2 transition-colors duration-300 shadow-sm",
                        watchedAction === 'in' ? "bg-blue-50 border-blue-100" : "bg-slate-50 border-slate-200"
                    )}>
                        <div className="flex justify-between items-center text-[9px] font-black uppercase tracking-widest text-muted-foreground text-left">
                            <span>Simulasi Perubahan Stok</span>
                            <Info className="h-3 w-3" />
                        </div>
                        <div className="flex justify-between items-end border-b border-dashed border-slate-200 pb-2">
                            <div className="flex flex-col text-left">
                                <span className="text-[8px] font-black text-muted-foreground uppercase text-left">Stok Awal</span>
                                <span className="text-sm font-bold text-slate-900 text-left">{item.stock} {item.unit}</span>
                            </div>
                            <div className={cn(
                                "text-2xl font-black",
                                watchedAction === 'in' ? "text-blue-600" : "text-rose-600"
                            )}>
                                {watchedAction === 'in' ? '+' : '-'} {quantityAsNumber}
                            </div>
                        </div>
                        <div className="flex justify-between items-center pt-1 text-left">
                            <span className="text-[10px] font-black uppercase text-slate-400 text-left">Estimasi Saldo Akhir</span>
                            <span className={cn(
                                "text-2xl font-black",
                                newStock < 0 ? "text-rose-600 animate-pulse" : "text-primary"
                            )}>
                                {newStock} <small className="text-[10px] uppercase font-bold">{item.unit}</small>
                            </span>
                        </div>
                    </div>

                    <FormField
                        control={form.control}
                        name="notes"
                        render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-left">Justifikasi / Keterangan</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <History className="absolute left-5 top-5 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Textarea 
                                        placeholder="Berikan alasan update stok (e.g., PO baru, pengambilan teknis, retur)..." 
                                        {...field} 
                                        className="min-h-[120px] pl-14 pt-4 bg-slate-50 border-none rounded-[1.5rem] font-medium text-sm focus:ring-2 focus:ring-primary/20 shadow-inner resize-none leading-relaxed text-black"
                                    />
                                </div>
                            </FormControl>
                            <FormMessage className="text-[10px] font-bold pl-4 text-rose-500" />
                        </FormItem>
                        )}
                    />

                    <div className="flex gap-4 pt-2">
                        <DialogClose asChild>
                            <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 font-black uppercase tracking-widest text-slate-400">Batal</Button>
                        </DialogClose>
                        <Button 
                            type="submit" 
                            disabled={isLoading || newStock < 0} 
                            className={cn(
                                "flex-[2] rounded-2xl h-14 text-white font-black uppercase tracking-[0.15em] shadow-2xl transition-all active:scale-95",
                                watchedAction === 'in' ? "bg-blue-600 hover:bg-blue-700 shadow-blue-600/20" : "bg-slate-800 hover:bg-black shadow-slate-800/20"
                            )}
                        >
                            {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                            Update Stok
                        </Button>
                    </div>
                </form>
            </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
