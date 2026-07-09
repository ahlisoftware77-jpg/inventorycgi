'use client';

/**
 * @fileOverview Formulir Tambah/Edit Riwayat Perawatan IT.
 * Menggunakan Native Date Picker untuk konsistensi.
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
import { useToast } from '@/hooks/use-toast';
import { maintenanceHistorySchema } from '@/lib/schemas';
import { type MaintenanceHistory } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';

type MaintenanceFormValues = z.infer<typeof maintenanceHistorySchema>;

interface MaintenanceFormProps {
  assetId: string;
  maintenanceEntry?: MaintenanceHistory;
  children: ReactNode;
}

const maintenanceTypes: MaintenanceHistory['type'][] = ['Perbaikan', 'Penggantian', 'Pembaruan', 'Lainnya'];

export default function MaintenanceForm({ assetId, maintenanceEntry, children }: MaintenanceFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!maintenanceEntry;

  const form = useForm<MaintenanceFormValues>({
    resolver: zodResolver(maintenanceHistorySchema),
    defaultValues: {
        date: new Date(),
    }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        date: maintenanceEntry?.date ? maintenanceEntry.date.toDate() : new Date(),
        type: maintenanceEntry?.type || undefined,
        description: maintenanceEntry?.description || '',
        technician: maintenanceEntry?.technician || user?.displayName || '',
        notes: maintenanceEntry?.notes || '',
      });
    }
  }, [isOpen, maintenanceEntry, form, user]);

  async function onSubmit(values: MaintenanceFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      const dataToSave: any = {
        ...values,
        date: Timestamp.fromDate(values.date),
        updatedAt: serverTimestamp(),
      };

      const maintenanceCollectionRef = collection(db, 'it_assets', assetId, 'maintenance_history');

      if (isEditMode) {
        const maintenanceRef = doc(maintenanceCollectionRef, maintenanceEntry.id);
        await setDoc(maintenanceRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil', description: 'Riwayat perawatan berhasil diperbarui.' });
      } else {
        dataToSave.createdAt = serverTimestamp();
        await addDoc(maintenanceCollectionRef, dataToSave);
        toast({ title: 'Berhasil', description: 'Riwayat perawatan baru berhasil ditambahkan.' });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving maintenance history:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal menyimpan data perawatan.' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "bg-gray-100 dark:bg-gray-700 h-11 border-slate-300 rounded-xl";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Riwayat Perawatan' : 'Tambah Riwayat Perawatan'}</DialogTitle>
          <DialogDescription>Catat detail pekerjaan perbaikan atau pemeliharaan yang dilakukan.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
                 <FormField control={form.control} name="date" render={({ field }) => (
                    <FormItem className="flex flex-col">
                        <FormLabel>Tanggal Pengerjaan</FormLabel>
                        <FormControl>
                            <div className="relative flex items-center">
                                <Input 
                                    type="date"
                                    value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (!val) {
                                            field.onChange(null);
                                        } else {
                                            const parsed = parse(val, "yyyy-MM-dd", new Date());
                                            field.onChange(isValid(parsed) ? parsed : null);
                                        }
                                    }}
                                    className={cn(inputClass, "w-full pr-10")}
                                />
                                <div className="absolute right-3 pointer-events-none text-muted-foreground">
                                    <CalendarIcon className="h-4 w-4" />
                                </div>
                            </div>
                        </FormControl>
                        <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="type" render={({ field }) => (
                    <FormItem><FormLabel>Jenis Perawatan</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih jenis" /></SelectTrigger></FormControl><SelectContent>{maintenanceTypes.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
            </div>
             <FormField control={form.control} name="description" render={({ field }) => (
                <FormItem><FormLabel>Deskripsi Pekerjaan</FormLabel><FormControl><Textarea placeholder="Contoh: Ganti RAM, instal ulang OS, bersihkan debu" {...field} className={cn(inputClass, "h-auto")} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="technician" render={({ field }) => (
                <FormItem><FormLabel>Nama Teknisi</FormLabel><FormControl><Input placeholder="Nama yang mengerjakan" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />
             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Catatan Tambahan</FormLabel><FormControl><Textarea placeholder="Catatan tambahan (opsional)" {...field} className={cn(inputClass, "h-auto")} /></FormControl><FormMessage /></FormItem>
            )} />
            <DialogFooter>
              <DialogClose asChild><Button variant="secondary" disabled={isLoading}>Batal</Button></DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Riwayat'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
