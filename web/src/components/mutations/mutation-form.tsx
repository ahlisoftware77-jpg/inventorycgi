'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { type Asset, type AssetCondition } from '@/lib/types';
import { doc, onSnapshot, serverTimestamp, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CalendarIcon, ArrowRightLeft, Trash2, ClipboardEdit, CheckCircle2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';

const defaultLocations = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING', 'MIXER', 'OFFICE', 'POS SECURITY', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'TINTA'];
const defaultConditions: AssetCondition[] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

const mutasiSchema = z.object({
  newLocation: z.string().min(1, "Lokasi baru harus dipilih."),
  newUser: z.string().optional(),
  notes: z.string().min(10, { message: "Alasan harus diisi (minimal 10 karakter)." }),
  quantity: z.coerce.number().int().min(1, 'Jumlah harus minimal 1.'),
  plannedDate: z.date().optional(),
});

const disposalSchema = z.object({
    notes: z.string().min(10, { message: "Alasan disposal harus diisi (minimal 10 karakter)." }),
    quantity: z.coerce.number().int().min(1, 'Jumlah harus minimal 1.'),
});

const editSchema = z.object({
  newCondition: z.string().min(1, "Kondisi baru harus dipilih."),
  notes: z.string().min(10, { message: "Alasan perubahan kondisi harus diisi (minimal 10 karakter)." }),
});

type MutationFormProps = {
  asset: Asset;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  mutationType: 'mutasi' | 'disposal' | 'edit';
};

export default function MutationForm({ asset, isOpen, onOpenChange, mutationType }: MutationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assetLocations, setAssetLocations] = useState<string[]>(defaultLocations);
  const [assetConditions, setAssetConditions] = useState<string[]>(defaultConditions);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.departments) setAssetLocations(data.departments);
        if (data.assetConditions) setAssetConditions(data.assetConditions);
      }
    });
    return () => unsub();
  }, []);

  const currentSchema = mutationType === 'mutasi' ? mutasiSchema : (mutationType === 'disposal' ? disposalSchema : editSchema);

  const form = useForm({
    resolver: zodResolver(currentSchema),
    defaultValues: {
        newLocation: asset.location,
        newUser: '',
        notes: '',
        quantity: 1,
        newCondition: asset.condition,
        plannedDate: new Date(),
    }
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        newLocation: asset.location,
        newUser: '',
        notes: '',
        quantity: 1,
        newCondition: asset.condition,
        plannedDate: new Date(),
      });
    }
  }, [isOpen, asset, form, mutationType]);

  async function onSubmit(values: any) {
    if (!user) return;
    setIsLoading(true);
    const assetRef = doc(db, 'assets', asset.id);
    
    try {
      let updateData: any = {
        updatedAt: serverTimestamp(),
        requestedBy: user.uid,
        requestedAt: serverTimestamp(),
      };

      if (mutationType === 'mutasi') {
        if (values.quantity > asset.qty) {
            form.setError('quantity', { message: `Maksimal ${asset.qty} unit.`});
            setIsLoading(false);
            return;
        }
        updateData.status = 'waiting_mutasi';
        updateData.mutationTargetDepartment = values.newLocation;
        updateData.notes = `--- MUTASI DIAJUKAN ---\nLokasi: ${asset.location} -> ${values.newLocation}\nQty: ${values.quantity}\nAlasan: ${values.notes}`;
      } else if (mutationType === 'disposal') {
        if (values.quantity > asset.qty) {
            form.setError('quantity', { message: `Maksimal ${asset.qty} unit.`});
            setIsLoading(false);
            return;
        }
        updateData.status = 'waiting_disposal';
        updateData.notes = `--- DISPOSAL DIAJUKAN ---\nQty: ${values.quantity}\nAlasan: ${values.notes}`;
      } else {
        updateData.status = 'waiting_edit';
        updateData.notes = `--- KONDISI DIAJUKAN ---\nKe: ${values.newCondition}\nAlasan: ${values.notes}`;
      }

      await updateDoc(assetRef, updateData);
      toast({ title: 'Pengajuan Terkirim', description: 'Menunggu persetujuan Admin.' });
      onOpenChange(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Terjadi kesalahan sistem.' });
    } finally {
      setIsLoading(false);
    }
  }

  const theme = {
    mutasi: { color: 'bg-indigo-600', icon: ArrowRightLeft, label: 'MUTASI ASET' },
    disposal: { color: 'bg-rose-600', icon: Trash2, label: 'DISPOSAL ASET' },
    edit: { color: 'bg-slate-800', icon: ClipboardEdit, label: 'UBAH KONDISI' }
  }[mutationType];

  const Icon = theme.icon;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-black">
        <div className={cn("px-6 py-8 text-white flex flex-col items-center text-center gap-2", theme.color)}>
          <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-2 border-2 border-white/30">
            <Icon className="w-8 h-8" />
          </div>
          <DialogTitle className="text-2xl font-black tracking-tight">{theme.label}</DialogTitle>
          <DialogDescription className="text-white/80 font-medium text-left">
            {asset.name} ({asset.code})
          </DialogDescription>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="p-6 space-y-5 bg-background">
            {mutationType === 'mutasi' && (
              <div className="grid grid-cols-2 gap-4 text-left">
                <FormField control={form.control} name="quantity" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Jumlah Unit</FormLabel>
                    <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="newLocation" render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Lokasi Tujuan</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                      <SelectContent>{assetLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )} />
              </div>
            )}

            {mutationType === 'disposal' && (
              <FormField control={form.control} name="quantity" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Jumlah Unit Disposal</FormLabel>
                  <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            {mutationType === 'edit' && (
              <FormField control={form.control} name="newCondition" render={({ field }) => (
                <FormItem>
                  <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Kondisi Baru</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
                    <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                    <SelectContent>
                        {assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            )}

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem>
                <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Alasan & Catatan</FormLabel>
                <FormControl><Textarea placeholder="Berikan deskripsi detail mengenai alasan pengajuan ini..." className="min-h-[100px] resize-none" {...field} /></FormControl>
                <FormMessage />
              </FormItem>
            )} />

            <div className="bg-muted/30 p-4 rounded-xl border border-dashed flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-orange-500 shrink-0 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-muted-foreground text-left">
                Pengajuan ini akan melalui proses verifikasi oleh sistem dan memerlukan persetujuan dari Manager atau Admin sebelum data diperbarui secara permanen.
              </p>
            </div>

            <DialogFooter className="pt-2 gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button type="button" variant="ghost" className="rounded-full">Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading} className={cn("rounded-full px-8 font-bold shadow-lg text-white", theme.color, "hover:opacity-90")}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                Kirim Pengajuan
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
