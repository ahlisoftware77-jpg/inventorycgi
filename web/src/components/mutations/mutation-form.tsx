'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
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
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormControl,
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
import { Loader2, CalendarIcon, ArrowRightLeft, Trash2, ClipboardEdit, CheckCircle2, AlertTriangle, Image as ImageIcon, UploadCloud, FileImage, Camera, X, CircleDollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { calculateDepreciation } from '@/lib/calculations';
import Image from 'next/image';

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

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
    quantity: z.coerce.number().int().min(1, 'Jumlah harus minimal 1.'),
    disposalType: z.enum(['Dijual', 'Dibuang / Rusak', 'Disumbangkan', 'Lainnya'], { required_error: "Jenis disposal harus dipilih." }),
    disposalPrice: z.coerce.number().min(0).optional(),
    disposalBuyer: z.string().optional(),
    notes: z.string().min(10, { message: "Alasan disposal harus diisi (minimal 10 karakter)." }),
    disposalPhotoURL1: z.string().optional().or(z.literal('')),
    disposalPhotoURL2: z.string().optional().or(z.literal('')),
    disposalPhotoURL3: z.string().optional().or(z.literal('')),
    disposalPhotoURL4: z.string().optional().or(z.literal('')),
}).superRefine((data, ctx) => {
  if (data.disposalType === 'Dijual') {
    if (data.disposalPrice === undefined || data.disposalPrice <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Harga jual wajib diisi dan harus lebih dari 0 jika dijual.",
        path: ["disposalPrice"]
      });
    }
    if (!data.disposalBuyer || data.disposalBuyer.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Nama pembeli wajib diisi jika dijual.",
        path: ["disposalBuyer"]
      });
    }
  }
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

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return 'Rp 0';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export default function MutationForm({ asset, isOpen, onOpenChange, mutationType }: MutationFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [assetLocations, setAssetLocations] = useState<string[]>(defaultLocations);
  const [assetConditions, setAssetConditions] = useState<string[]>(defaultConditions);
  const { toast } = useToast();
  const { user } = useAuth();

  // Cloudinary uploading states
  const [isUploading, setIsUploading] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
        disposalType: 'Dibuang / Rusak' as any,
        disposalPrice: 0,
        disposalBuyer: '',
        disposalPhotoURL1: '',
        disposalPhotoURL2: '',
        disposalPhotoURL3: '',
        disposalPhotoURL4: '',
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
        disposalType: 'Dibuang / Rusak' as any,
        disposalPrice: 0,
        disposalBuyer: '',
        disposalPhotoURL1: '',
        disposalPhotoURL2: '',
        disposalPhotoURL3: '',
        disposalPhotoURL4: '',
      });
      setPreviewUrl(null);
      setSelectedFile(null);
    }
  }, [isOpen, asset, form, mutationType]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviewUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpload = async (fileToUpload: File | null) => {
    if (!fileToUpload) return;
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Gagal mengunggah gambar ke server.');
      
      const data = await response.json();
      const secureUrl = data.secure_url;

      const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = 
        ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
      
      let assigned = false;
      for (const fieldName of photoFields) {
        if (!form.getValues(fieldName)) {
          form.setValue(fieldName, secureUrl);
          assigned = true;
          break;
        }
      }

      if (!assigned) {
        form.setValue('disposalPhotoURL1', secureUrl);
      }

      toast({ title: 'Upload Berhasil', description: 'URL gambar bukti disposal telah ditambahkan.' });
      setSelectedFile(null);
      setPreviewUrl(null);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const removePhoto = (index: number) => {
    const fields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = 
      ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
    form.setValue(fields[index], '');
  };

  useEffect(() => {
    if (!isOpen || mutationType !== 'disposal') return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const file = new File([blob], `paste-${Date.now()}.png`, { type: blob.type });
            setSelectedFile(file);
            setPreviewUrl(URL.createObjectURL(file));
            toast({
              title: "Gambar Ditempel (Paste)",
              description: "Gambar bukti telah ditempel. Silakan klik 'KLIK UNTUK UNGGAH' di bawah preview untuk memproses."
            });
            e.preventDefault();
            break;
          }
        }
      }
    };

    window.addEventListener('paste', handleGlobalPaste);
    return () => {
      window.removeEventListener('paste', handleGlobalPaste);
    };
  }, [isOpen, mutationType, toast]);

  const quantityDisposal = form.watch('quantity') || 1;

  const depreciation = useMemo(() => {
    if (!asset.price) return null;
    
    const origDep = calculateDepreciation(
      asset.price,
      asset.purchaseDate,
      asset.assetLifetime,
      asset.manualDepreciationPercent
    );
    
    const proportion = quantityDisposal / asset.qty;
    const disposalCost = asset.price * quantityDisposal;
    const disposalAccumulatedDepreciation = origDep ? Math.round(origDep.accumulatedDepreciation * proportion) : 0;
    const disposalBookValue = Math.max(0, disposalCost - disposalAccumulatedDepreciation);

    return {
      cost: disposalCost,
      accumulatedDepreciation: disposalAccumulatedDepreciation,
      bookValue: disposalBookValue,
      originalBookValue: origDep?.bookValue || 0,
    };
  }, [asset, quantityDisposal]);

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

        const proportion = values.quantity / asset.qty;
        const disposalCost = asset.price * values.quantity;
        const origDep = calculateDepreciation(asset.price, asset.purchaseDate, asset.assetLifetime, asset.manualDepreciationPercent);
        const disposalAccumulatedDepreciation = origDep ? Math.round(origDep.accumulatedDepreciation * proportion) : 0;
        const disposalBookValue = Math.max(0, disposalCost - disposalAccumulatedDepreciation);

        updateData.status = 'waiting_disposal';
        updateData.disposalType = values.disposalType;
        updateData.disposalPrice = values.disposalType === 'Dijual' ? Number(values.disposalPrice) : null;
        updateData.disposalBuyer = values.disposalType === 'Dijual' ? values.disposalBuyer : null;
        updateData.disposalCost = disposalCost;
        updateData.disposalAccumulatedDepreciation = disposalAccumulatedDepreciation;
        updateData.disposalBookValue = disposalBookValue;
        updateData.disposalPhotoURL1 = values.disposalPhotoURL1 || null;
        updateData.disposalPhotoURL2 = values.disposalPhotoURL2 || null;
        updateData.disposalPhotoURL3 = values.disposalPhotoURL3 || null;
        updateData.disposalPhotoURL4 = values.disposalPhotoURL4 || null;

        let disposalDetails = `Jenis: ${values.disposalType}`;
        if (values.disposalType === 'Dijual') {
          disposalDetails += `\nHarga Jual: ${formatCurrency(values.disposalPrice)}\nPembeli: ${values.disposalBuyer}`;
        }
        disposalDetails += `\nFinansial (Proporsional):\n - Harga Perolehan: ${formatCurrency(disposalCost)}\n - Akumulasi Depresiasi: ${formatCurrency(disposalAccumulatedDepreciation)}\n - Nilai Buku: ${formatCurrency(disposalBookValue)}`;

        updateData.notes = `--- DISPOSAL DIAJUKAN ---\nQty: ${values.quantity}\n${disposalDetails}\nAlasan: ${values.notes}`;
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
      <DialogContent className="p-0 overflow-hidden sm:max-w-lg border-none shadow-2xl animate-in fade-in zoom-in-95 duration-200 text-black max-h-[90vh] flex flex-col">
        <div className={cn("px-6 py-6 text-white flex flex-col items-center text-center gap-2 shrink-0", theme.color)}>
          <div className="p-2.5 bg-white/20 rounded-full backdrop-blur-md border-2 border-white/30">
            <Icon className="w-6 h-6" />
          </div>
          <DialogTitle className="text-xl font-black tracking-tight">{theme.label}</DialogTitle>
          <DialogDescription className="text-white/80 text-xs font-medium">
            {asset.name} ({asset.code})
          </DialogDescription>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5 bg-background">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
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
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-left">
                    <FormField control={form.control} name="quantity" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Jumlah Unit Disposal</FormLabel>
                        <FormControl><Input type="number" {...field} className="h-11" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="disposalType" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Jenis Disposal</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl><SelectTrigger className="h-11"><SelectValue /></SelectTrigger></FormControl>
                          <SelectContent>
                            <SelectItem value="Dibuang / Rusak">Dibuang / Rusak</SelectItem>
                            <SelectItem value="Dijual">Dijual (Sale)</SelectItem>
                            <SelectItem value="Disumbangkan">Disumbangkan</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  {form.watch('disposalType') === 'Dijual' && (
                    <div className="grid grid-cols-2 gap-4 text-left animate-in fade-in duration-300">
                      <FormField control={form.control} name="disposalPrice" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Harga Jual (IDR)</FormLabel>
                          <FormControl><Input type="number" placeholder="Contoh: 1500000" {...field} className="h-11" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                      
                      <FormField control={form.control} name="disposalBuyer" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left">Nama Pembeli</FormLabel>
                          <FormControl><Input placeholder="Contoh: Bpk. Budi" {...field} className="h-11" /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  )}

                  {depreciation && (
                    <div className="p-4 rounded-xl border border-dashed border-primary/20 bg-slate-50 dark:bg-slate-900/30 text-left space-y-2 shadow-inner">
                      <p className="text-[10px] font-black uppercase text-primary tracking-widest flex items-center gap-1.5">
                        <CircleDollarSign className="w-3.5 h-3.5 text-primary" /> Depresiasi Finansial Proporsional
                      </p>
                      <div className="grid grid-cols-3 gap-3">
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider block">Perolehan</span>
                          <span className="text-[10px] font-black text-slate-800 dark:text-slate-200 block truncate">{formatCurrency(depreciation.cost)}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider block">Penyusutan</span>
                          <span className="text-[10px] font-black text-rose-600 block truncate">{formatCurrency(depreciation.accumulatedDepreciation)}</span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[8px] font-bold uppercase text-muted-foreground tracking-wider block">Nilai Buku</span>
                          <span className="text-[10px] font-black text-emerald-600 block truncate">{formatCurrency(depreciation.bookValue)}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2 text-left">
                    <FormLabel className="text-xs font-bold uppercase text-muted-foreground text-left flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5" /> Bukti Disposal / Serah Terima (Maks. 4)
                    </FormLabel>
                    
                    {(() => {
                      const photos = [
                        form.watch('disposalPhotoURL1'),
                        form.watch('disposalPhotoURL2'),
                        form.watch('disposalPhotoURL3'),
                        form.watch('disposalPhotoURL4'),
                      ].filter(Boolean);
                      
                      if (photos.length > 0) {
                        return (
                          <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-900/10 rounded-xl border">
                            {photos.map((url, idx) => (
                              <div key={`photo-${idx}`} className="relative w-14 h-14 rounded-lg overflow-hidden border shadow-sm group">
                                <Image src={url!} alt={`Bukti ${idx + 1}`} fill className="object-cover" />
                                <button
                                  type="button"
                                  onClick={() => removePhoto(idx)}
                                  className="absolute top-0.5 right-0.5 p-0.5 bg-rose-600 text-white rounded-full opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity"
                                >
                                  <X className="w-2.5 h-2.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        );
                      }
                      return null;
                    })()}

                    <div className="p-3 bg-muted/20 rounded-xl border border-dashed text-center">
                      <p className="text-[10px] font-black uppercase mb-2 flex items-center justify-center gap-2 text-primary">
                        <UploadCloud className="w-3.5 h-3.5" /> Unggah Foto Bukti
                      </p>
                      <div className="flex justify-center gap-2">
                        <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full text-xs h-8">
                          <FileImage className="mr-1.5 h-3.5 w-3.5" /> Pilih File
                        </Button>
                        <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                      <p className="text-[9px] text-muted-foreground italic mt-1.5">
                        Tips: Anda dapat menempelkan (Paste/Ctrl+V) file gambar secara langsung di jendela ini.
                      </p>

                      {previewUrl && (
                        <div className="mt-3 flex items-center gap-3 p-2 bg-background rounded-md border shadow-sm max-w-sm mx-auto">
                          <div className="relative w-10 h-10 rounded overflow-hidden border shrink-0">
                            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0 text-left">
                            <p className="text-[9px] font-bold truncate opacity-70">{selectedFile?.name}</p>
                            <Button type="button" variant="link" size="sm" onClick={() => handleUpload(selectedFile)} disabled={isUploading} className="p-0 h-auto text-primary text-[9px] font-black uppercase">
                              {isUploading ? "UPLOADING..." : "KLIK UNTUK UNGGAH"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
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
                  <FormControl><Textarea placeholder="Berikan deskripsi detail mengenai alasan pengajuan ini..." className="min-h-[80px] resize-none" {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="bg-muted/30 p-3.5 rounded-xl border border-dashed flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />
                <p className="text-[10px] leading-relaxed text-muted-foreground text-left">
                  Pengajuan ini akan melalui proses verifikasi oleh sistem dan memerlukan persetujuan dari Manager atau Admin sebelum data diperbarui secara permanen.
                </p>
              </div>

              <DialogFooter className="pt-2 gap-2 sm:gap-0 shrink-0">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="rounded-full">Batal</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading || isUploading} className={cn("rounded-full px-8 font-bold shadow-lg text-white", theme.color, "hover:opacity-90")}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Kirim Pengajuan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
