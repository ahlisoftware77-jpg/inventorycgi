

'use client';

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
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { softwareSchema } from '@/lib/schemas';
import { type Software } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type SoftwareFormValues = z.infer<typeof softwareSchema>;

interface SoftwareFormProps {
  assetId: string;
  software?: Software;
  children: ReactNode;
}

export default function SoftwareForm({ assetId, software, children }: SoftwareFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!software;

  const form = useForm<SoftwareFormValues>({
    resolver: zodResolver(softwareSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        name: software?.name || '',
        licenseKey: software?.licenseKey || '',
        purchaseDate: software?.purchaseDate ? software.purchaseDate.toDate() : undefined,
        expiryDate: software?.expiryDate ? software.expiryDate.toDate() : undefined,
        notes: software?.notes || '',
      });
    }
  }, [isOpen, software, form]);

  async function onSubmit(values: SoftwareFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      const dataToSave: any = {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(values.purchaseDate) : null,
        expiryDate: values.expiryDate ? Timestamp.fromDate(values.expiryDate) : null,
      };

      const softwareCollectionRef = collection(db, 'it_assets', assetId, 'software_list');

      if (isEditMode) {
        const softwareRef = doc(softwareCollectionRef, software.id);
        await setDoc(softwareRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil', description: 'Data software berhasil diperbarui.' });
      } else {
        await addDoc(softwareCollectionRef, dataToSave);
        toast({ title: 'Berhasil', description: 'Software baru berhasil ditambahkan.' });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving software:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal menyimpan data software.' });
    } finally {
      setIsLoading(false);
    }
  }
  
  const inputClass = "bg-gray-100 dark:bg-gray-700";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Software' : 'Tambah Software Baru'}</DialogTitle>
          <DialogDescription>Isi detail software yang terinstal pada aset ini.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nama Software</FormLabel><FormControl><Input placeholder="e.g., Microsoft Office 2021" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />
            <FormField control={form.control} name="licenseKey" render={({ field }) => (
                <FormItem><FormLabel>Kunci Lisensi</FormLabel><FormControl><Input placeholder="XXXXX-XXXXX-XXXXX-XXXXX-XXXXX" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />
            <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Tanggal Pembelian</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", inputClass, !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="expiryDate" render={({ field }) => (
                    <FormItem className="flex flex-col"><FormLabel>Tanggal Kedaluwarsa</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", inputClass, !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Catatan tambahan..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button type="button" variant="secondary" disabled={isLoading}>Batal</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Software'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
