'use client';

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
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { type InventoryItem } from '@/lib/types';
import { doc, writeBatch, collection, serverTimestamp, increment } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { cn } from '@/lib/utils';

interface UpdateStockDialogProps {
  item: InventoryItem;
  children: ReactNode;
}

const updateStockSchema = z.object({
  action: z.enum(['in', 'out'], { required_error: 'Pilih jenis transaksi.' }),
  quantity: z.coerce.number().int().min(1, 'Jumlah harus minimal 1.'),
  notes: z.string().min(3, 'Catatan harus diisi.').optional(),
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
        createdAt: serverTimestamp(),
      });

      await batch.commit();

      toast({
        title: 'Stok Diperbarui',
        description: `Stok ${item.name} telah diperbarui.`,
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

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="bg-pink-100 dark:bg-pink-900/50">
        <DialogHeader>
          <DialogTitle>Update Stok: {item.name}</DialogTitle>
          <DialogDescription>
            Pilih untuk menambah (Masuk) atau mengurangi (Keluar) stok.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="action"
              render={({ field }) => (
                <FormItem className="space-y-3">
                  <FormLabel>Jenis Transaksi</FormLabel>
                  <FormControl>
                    <RadioGroup
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                      className="flex space-x-4"
                    >
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="in" /></FormControl>
                        <FormLabel className="font-normal">Barang Masuk</FormLabel>
                      </FormItem>
                      <FormItem className="flex items-center space-x-2 space-y-0">
                        <FormControl><RadioGroupItem value="out" /></FormControl>
                        <FormLabel className="font-normal">Barang Keluar</FormLabel>
                      </FormItem>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} min={1} max={watchedAction === 'out' ? item.stock : undefined} className="bg-gray-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
             <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Catatan</FormLabel>
                  <FormControl>
                    <Textarea placeholder="Contoh: Pembelian dari Supplier X, atau Digunakan untuk Dept Y" {...field} className="bg-gray-100" />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Alert variant={watchedAction === 'out' ? 'destructive' : 'default'} className="mt-4">
                <AlertTitle>Kalkulasi Stok</AlertTitle>
                <AlertDescription>
                    <div className="flex justify-between"><span>Stok Saat Ini:</span> <span>{item.stock} {item.unit}</span></div>
                    <div className="flex justify-between">
                        <span>{watchedAction === 'in' ? 'Stok Masuk:' : 'Stok Keluar:'}</span>
                        <span className={cn(watchedAction === 'out' ? 'text-red-500' : 'text-green-500', "font-semibold")}>
                            {watchedAction === 'in' ? '+' : '-'} {quantityAsNumber} {item.unit}
                        </span>
                    </div>
                    <hr className="my-1 border-dashed" />
                    <div className="flex justify-between font-bold">
                        <span>{watchedAction === 'in' ? 'Stok Baru:' : 'Sisa Stok:'}</span>
                        <span>{newStock} {item.unit}</span>
                    </div>
                </AlertDescription>
            </Alert>

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Simpan Perubahan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
