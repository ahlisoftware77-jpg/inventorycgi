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
import { useToast } from '@/hooks/use-toast';
import { type InventoryItem } from '@/lib/types';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

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
    defaultValues: {
      quantity: 1,
    },
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
      await addDoc(collection(db, 'inventory_requests'), {
        inventoryId: item.id,
        inventoryCode: item.code,
        inventoryName: item.name,
        quantity: values.quantity,
        requestingUserId: user.uid,
        requestingUserName: user.displayName || user.email,
        requestingDept: user.department || 'N/A',
        status: 'Menunggu Persetujuan HRGA',
        requestedAt: serverTimestamp(),
      });

      toast({
        title: 'Permintaan Terkirim',
        description: `Permintaan ${values.quantity} ${item.unit} ${item.name} telah dikirim.`,
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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Minta Barang: {item.name}</DialogTitle>
          <DialogDescription>
            Masukkan jumlah yang Anda butuhkan. Stok saat ini: <span className="font-bold">{item.stock} {item.unit}</span>.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="quantity"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Jumlah Permintaan</FormLabel>
                  <FormControl>
                    <Input type="number" {...field} min={1} max={item.stock} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Permintaan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
