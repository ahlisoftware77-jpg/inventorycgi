'use client';

/**
 * @fileOverview Formulir Tambah/Edit Barang Inventaris.
 * Desain: Premium Corporate, Elegan, dan Profesional.
 * Fitur: Upload foto, Generate kode otomatis, Validasi stok, dan Pencatatan Log Otomatis.
 * Sinkronisasi: Mencatat aksi restok ke Log Permintaan Barang (Inventory Requests).
 */

import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
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
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { inventoryItemSchema } from '@/lib/schemas';
import { type InventoryItem, type InventoryFormValues, type InventoryType } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, getDocs, query, where, onSnapshot, writeBatch, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, UploadCloud, FileImage, Camera, Sparkles, Box, MapPin, Info, Image as ImageIcon, X, CheckCircle2, Building } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface InventoryFormProps {
  item?: InventoryItem;
  itemType: InventoryType;
  children: ReactNode;
}

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const defaultDepartments = [
  'ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PRODUCTION', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'SECURITY', 'TINTA', 'Umum'
];

const locationOptions = ['Gudang ATK', 'Gudang Sparepart', 'Gudang Kebersihan', 'Gudang Obat', 'Ruang Server', 'Umum'];

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex items-center gap-2 pb-2 mb-4 border-b border-muted/50">
    <div className="p-1.5 bg-primary/10 rounded-md">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/70">{title}</h3>
  </div>
);

export default function InventoryForm({ item, itemType, children }: InventoryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(defaultDepartments);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!item;

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
  });

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.departments) {
          const combined = Array.from(new Set([...defaultDepartments, ...data.departments]));
          setDepartmentOptions(combined.sort());
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (isOpen) {
      const defaultCategory = item?.category || (
        itemType === 'ATK' ? 'Logistik ATK' : 
        itemType === 'Alat Kebersihan' ? 'Kebersihan' : 
        itemType === 'Obat-obatan' ? 'Kesehatan/Medis' :
        itemType
      );

      form.reset({
        type: itemType,
        code: item?.code || '',
        name: item?.name || '',
        category: defaultCategory,
        unit: item?.unit || '',
        stock: item?.stock || 0,
        location: item?.location || '',
        department: item?.department || '',
        notes: item?.notes || '',
        photoURL: item?.photoURL || '',
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen, item, itemType, form]);

  const handleGenerateCode = async () => {
    setIsGeneratingCode(true);
    try {
        let prefix = '';
        switch(itemType) {
            case 'ATK': prefix = 'ATK-'; break;
            case 'Sparepart': prefix = 'SP-'; break;
            case 'Alat Kebersihan': prefix = 'AK-'; break;
            case 'Obat-obatan': prefix = 'OBT-'; break;
            default: {
                const cleanType = itemType.replace(/[^a-zA-Z]/g, '').toUpperCase();
                prefix = (cleanType.substring(0, 3) || 'ITEM') + '-';
                break;
            }
        }
        const itemsRef = collection(db, 'inventory');
        const q = query(itemsRef, where('code', '>=', prefix), where('code', '<', prefix + 'z'));
        const querySnapshot = await getDocs(q);
        const sequenceNumber = querySnapshot.size + 1;
        const newCode = `${prefix}${sequenceNumber.toString().padStart(3, '0')}`;
        form.setValue('code', newCode);
        toast({ title: 'Kode Dihasilkan', description: `Kode barang baru: ${newCode}` });
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Generate Kode' });
    } finally {
        setIsGeneratingCode(false);
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
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
      const data = await response.json();
      if (response.ok) {
        const secureUrl = data.secure_url;
        form.setValue('photoURL', secureUrl);
        toast({ title: 'Upload Berhasil', description: 'Foto barang telah diperbarui.' });
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  async function onSubmit(values: InventoryFormValues) {
    if (!user) return;
    setIsLoading(true);
    const batch = writeBatch(db);
    
    try {
      let finalItemId = '';
      let logRestock = false;
      let restockQty = 0;

      if (isEditMode && item) {
        finalItemId = item.id;
        const itemRef = doc(db, 'inventory', item.id);
        batch.update(itemRef, { ...values, lastUpdated: serverTimestamp() });

        // Deteksi restok saat edit
        if (values.stock > item.stock) {
            logRestock = true;
            restockQty = values.stock - item.stock;
        }

        // Log internal transaction
        if (values.stock !== item.stock) {
            const stockDiff = values.stock - item.stock;
            const transactionRef = doc(collection(db, 'inventory_transactions'));
            batch.set(transactionRef, {
                inventoryId: item.id,
                inventoryCode: values.code,
                inventoryName: values.name,
                action: stockDiff > 0 ? 'in' : 'out',
                quantity: Math.abs(stockDiff),
                stockBefore: item.stock,
                stockAfter: values.stock,
                notes: `Penyesuaian stok melalui edit data oleh ${user.displayName || user.email}`,
                userId: user.uid,
                userName: user.displayName || user.email,
                transactionDate: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }
      } else {
        const itemsCollection = collection(db, 'inventory');
        const newItemRef = doc(itemsCollection);
        finalItemId = newItemRef.id;
        batch.set(newItemRef, { ...values, lastUpdated: serverTimestamp() });

        // Pendaftaran awal dengan stok > 0 dianggap restok pertama
        if (values.stock > 0) {
            logRestock = true;
            restockQty = values.stock;
            
            const transactionRef = doc(collection(db, 'inventory_transactions'));
            batch.set(transactionRef, {
                inventoryId: finalItemId,
                inventoryCode: values.code,
                inventoryName: values.name,
                action: 'in',
                quantity: values.stock,
                stockBefore: 0,
                stockAfter: values.stock,
                notes: `Stok awal pendaftaran barang oleh ${user.displayName || user.email}`,
                userId: user.uid,
                userName: user.displayName || user.email,
                transactionDate: serverTimestamp(),
                createdAt: serverTimestamp(),
            });
        }
      }

      // SYNC TO LOG PERMINTAAN (Inventory Requests) AS "BARANG MASUK"
      if (logRestock) {
        const requestRef = doc(collection(db, 'inventory_requests'));
        let finalCategory = itemType || 'Lainnya';
        if (itemType === 'ATK') finalCategory = 'Logistik ATK';
        else if (itemType === 'Alat Kebersihan') finalCategory = 'Kebersihan';

        batch.set(requestRef, {
            inventoryId: finalItemId,
            inventoryCode: values.code,
            inventoryName: values.name,
            inventoryCategory: finalCategory,
            quantity: restockQty,
            requestingUserId: user.uid,
            requestingUserName: user.displayName || user.email,
            requestingDept: user.department || 'Gudang/Admin',
            status: 'Disetujui',
            requestedAt: serverTimestamp(),
            processedByUserId: user.uid,
            processedByUserName: user.displayName || user.email,
            processedAt: serverTimestamp(),
            notes: isEditMode ? `[BARANG MASUK] Penyesuaian stok saat edit data.` : `[BARANG MASUK] Pendaftaran barang baru.`,
            isIncoming: true
        });
      }

      await batch.commit();
      toast({ title: isEditMode ? 'Berhasil Diperbarui' : 'Barang Ditambahkan' });
      setIsOpen(false);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    const startCamera = async () => {
        if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: { ideal: 'environment' },
                            width: { ideal: 1280 },
                            height: { ideal: 720 }
                        }
                    });
                } catch (e) {
                    console.warn("Retrying with fallback video constraints...", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
                console.error("Camera access failed:", err);
                setIsCameraOpen(false);
            }
        }
    };
    startCamera();
    return () => { if (streamRef.current) streamRef.current.getTracks().forEach(track => track.stop()); };
  }, [isCameraOpen]);

  const handleCaptureAndUpload = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                handleUpload(capturedFile).then(() => setIsCameraOpen(false));
            }
        }, 'image/jpeg');
    }
  };

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load();
    }
    setIsCameraOpen(false);
  }, []);

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
        form.reset();
        setSelectedFile(null);
        setPreviewUrl(null);
        stopCamera();
    }
  }

  const inputClass = "bg-background h-12 border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm rounded-xl";

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-3xl max-h-[85vh] my-8 p-0 overflow-y-auto border-none shadow-2xl bg-white dark:bg-slate-950 rounded-[3rem] text-black" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className={cn(
          "sticky top-0 z-50 px-8 py-6 flex items-center justify-between border-b",
          isEditMode ? "bg-slate-900 text-white" : "bg-primary text-white"
        )}>
          <div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">
              {isEditMode ? 'Edit Barang Inventaris' : `Tambah ${itemType} Baru`}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-medium text-left">
              Kelola stok dan logistik operasional perusahaan.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white">
              <X className="h-6 w-6" />
            </Button>
          </DialogClose>
        </div>

        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              <section>
                <SectionHeader icon={Box} title="Informasi Dasar Barang" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black">
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Kode Barang</FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="e.g., ATK-001" {...field} className={inputClass} /></FormControl>
                        {!isEditMode && (
                          <Button type="button" variant="outline" size="icon" onClick={handleGenerateCode} disabled={isGeneratingCode} className="h-12 w-12 shrink-0 bg-primary/5 border-primary/20">
                            {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Nama Barang</FormLabel>
                      <FormControl><Input placeholder="Nama lengkap barang..." {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Kategori (Auto-fill)</FormLabel>
                      <FormControl><Input placeholder="e.g., Alat Tulis, Sparepart Mesin" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="unit" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Satuan</FormLabel>
                        <FormControl><Input placeholder="Pcs, Rim, Box" {...field} className={inputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="stock" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Jumlah Stok</FormLabel>
                        <FormControl><Input type="number" {...field} className={inputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </section>

              <section>
                <SectionHeader icon={MapPin} title="Logistik & Lokasi" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-black">
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left">Gudang Penyimpanan</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih lokasi" /></SelectTrigger></FormControl>
                        <SelectContent>{locationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Departemen Terkait (Pemilik Stok)</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={cn(inputClass, "font-bold text-black")}>
                            <div className="flex items-center gap-2">
                              <Building className="h-3.5 w-3.5 text-primary/60" />
                              <SelectValue placeholder="Pilih unit penanggung jawab" />
                            </div>
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent className="rounded-2xl border-slate-100 max-h-[300px]">
                          {departmentOptions.sort().map(o => (
                            <SelectItem key={o} value={o} className="font-bold text-xs py-2.5">
                              {o}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <p className="text-[9px] text-muted-foreground italic px-1 text-left">Unit kerja yang memiliki atau mengelola barang ini.</p>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={ImageIcon} title="Dokumentasi & Catatan" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
                  <div className="space-y-4 text-left">
                    <Label className="font-bold text-xs uppercase text-muted-foreground ml-1 text-left">Identitas Visual</Label>
                    <div className="p-6 bg-slate-50 dark:bg-slate-900 rounded-[2.5rem] border border-dashed border-slate-300 dark:border-slate-700 flex flex-col items-center gap-4 group hover:border-primary transition-colors text-black">
                      {form.getValues('photoURL') ? (
                        <div className="relative w-full aspect-video rounded-2xl overflow-hidden border shadow-lg bg-white">
                          <Image src={form.getValues('photoURL') || ''} alt="Produk" fill className="object-cover" />
                          <button type="button" onClick={() => form.setValue('photoURL', '')} className="absolute top-2 right-2 p-1.5 bg-black/50 text-white rounded-full hover:bg-rose-600 transition-colors">
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="text-center py-4">
                          <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl shadow-sm mb-4 mx-auto w-fit group-hover:scale-110 transition-transform">
                            <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-primary" />
                          </div>
                          <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest text-center">Unggah Foto Barang</p>
                        </div>
                      )}
                      
                      <div className="flex gap-2 w-full">
                        <Button type="button" variant="outline" size="sm" onClick={() => fileInputRef.current?.click()} className="flex-1 rounded-xl h-10 font-bold border-slate-200">
                          <FileImage className="mr-2 h-4 w-4" /> Album
                        </Button>
                        <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraOpen(true)} className="flex-1 rounded-xl h-10 font-bold border-slate-200">
                          <Camera className="mr-2 h-4 w-4" /> Kamera
                        </Button>
                        <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>

                      {previewUrl && !form.getValues('photoURL') && (
                        <div className="flex items-center gap-3 p-2 bg-white rounded-2xl border shadow-sm w-full animate-in zoom-in-95">
                          <div className="relative h-10 w-10 rounded-xl overflow-hidden border shrink-0"><Image src={previewUrl} alt="prev" fill className="object-cover" /></div>
                          <Button type="button" variant="link" size="sm" onClick={() => handleUpload(selectedFile)} disabled={isUploading} className="p-0 h-auto text-primary text-[10px] font-black uppercase">
                            {isUploading ? "UPLOADING..." : "Klik untuk konfirmasi"}
                          </Button>
                        </div>
                      )}
                    </div>
                    <FormField control={form.control} name="photoURL" render={({ field }) => (
                      <FormItem>
                        <FormControl><Input placeholder="Atau tempel URL foto di sini..." {...field} className={inputClass} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>

                  <div className="space-y-4 text-left">
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem className="text-left">
                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground text-left ml-1">Keterangan Tambahan</FormLabel>
                        <FormControl><Textarea placeholder="Berikan catatan spesifik mengenai barang ini..." {...field} className="min-h-[200px] bg-slate-50 shadow-inner rounded-3xl resize-none p-6 text-sm font-medium leading-relaxed text-black" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </section>

              <DialogFooter className="sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-6 border-t mt-10 -mx-8 z-50">
                <div className="flex w-full items-center justify-end gap-3">
                  <DialogClose asChild><Button type="button" variant="ghost" className="rounded-xl px-8 font-bold text-black dark:text-white">Batal</Button></DialogClose>
                  <Button type="submit" disabled={isLoading || isUploading} className={cn("px-10 font-black rounded-xl shadow-xl transition-all h-12 uppercase tracking-tighter text-white", isEditMode ? "bg-slate-900 hover:bg-black" : "bg-primary hover:bg-primary/90 shadow-primary/20")}>
                    {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Box className="mr-2 h-5 w-5" />}
                    {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Barang'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-black rounded-[2.5rem]">
            <div className="bg-slate-900/80 backdrop-blur-md p-4 flex items-center justify-between text-white border-b border-white/10 text-left">
                <div className="flex items-center gap-2 text-left">
                    <Camera className="h-5 w-5 text-primary" />
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-white">Kamera Inventaris</DialogTitle>
                </div>
                <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white" onClick={stopCamera}><X className="h-5 w-5 text-white"/></Button></DialogClose>
            </div>
            <div className="relative aspect-[4/3] bg-black flex items-center justify-center">
                <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none text-left"></div>
            </div>
            <div className="p-8 bg-slate-900 flex justify-center border-t border-white/10">
                <Button onClick={handleCaptureAndUpload} className="h-20 w-20 rounded-full bg-primary hover:scale-105 active:scale-95 transition-all p-0 border-8 border-white/10 shadow-[0_0_30px_rgba(var(--primary),0.4)]">
                    <Camera className="h-10 w-10 text-white" />
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
