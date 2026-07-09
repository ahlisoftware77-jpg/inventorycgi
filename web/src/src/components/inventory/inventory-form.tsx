

'use client';

import { useState, useEffect, useRef, type ReactNode } from 'react';
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
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, UploadCloud, FileImage, Camera, Sparkles } from 'lucide-react';
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

const departmentOptions = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'Umum'];
const locationOptions = ['Gudang ATK', 'Gudang Sparepart', 'Gudang Kebersihan', 'Ruang Server', 'Umum'];

export default function InventoryForm({ item, itemType, children }: InventoryFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!item;

  const form = useForm<InventoryFormValues>({
    resolver: zodResolver(inventoryItemSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        type: itemType,
        code: item?.code || '',
        name: item?.name || '',
        category: item?.category || '',
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
            default: prefix = 'ITEM-';
        }

        const itemsRef = collection(db, 'inventory');
        const q = query(itemsRef, where('code', '>=', prefix), where('code', '<', prefix + 'z'));
        const querySnapshot = await getDocs(q);

        const sequenceNumber = querySnapshot.size + 1;
        const newCode = `${prefix}${sequenceNumber.toString().padStart(3, '0')}`;
        
        form.setValue('code', newCode);
        toast({
            title: 'Kode Dihasilkan',
            description: `Kode barang baru: ${newCode}`,
        });

    } catch (error) {
        console.error("Error generating item code:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Generate Kode',
            description: 'Terjadi kesalahan saat berkomunikasi dengan database.',
        });
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
        form.setValue('photoURL', data.secure_url);
        toast({ title: 'Upload Berhasil', description: 'URL gambar telah ditambahkan.' });
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

    try {
      const dataToSave = {
        ...values,
        lastUpdated: serverTimestamp(),
      };

      if (isEditMode) {
        const itemRef = doc(db, 'inventory', item.id);
        await setDoc(itemRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil', description: 'Stok barang berhasil diperbarui.' });
      } else {
        const collectionRef = collection(db, 'inventory');
        await addDoc(collectionRef, dataToSave);
        toast({ title: 'Berhasil', description: 'Barang baru berhasil ditambahkan.' });
      }

      setIsOpen(false);
    } catch (error: any) {
      console.error('Error saving inventory item:', error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan.' });
    } finally {
      setIsLoading(false);
    }
  }
  
  useEffect(() => {
    let stream: MediaStream;
    const startCamera = async () => {
        if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                console.error("Error accessing camera:", err);
                toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Tidak bisa mengakses kamera. Mohon periksa izin browser.' });
                setIsCameraOpen(false);
            }
        }
    };

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, toast]);

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
                setSelectedFile(capturedFile);
                setPreviewUrl(URL.createObjectURL(capturedFile));
                handleUpload(capturedFile);
            }
        }, 'image/jpeg');
    }
  };


  const inputClass = isEditMode ? 'bg-gray-100 dark:bg-gray-700' : 'bg-yellow-50 dark:bg-gray-800';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent 
        className={cn(
          "sm:max-w-2xl max-h-[90vh] overflow-y-auto",
          isEditMode ? "bg-orange-100 dark:bg-orange-900/50" : "bg-yellow-100"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Stok Barang' : `Tambah ${itemType} Baru`}</DialogTitle>
          <DialogDescription>
            Isi detail untuk barang inventaris.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid md:grid-cols-2 gap-4">
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Barang</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="e.g., ATK-001" {...field} className={inputClass} /></FormControl>
                     {!isEditMode && (
                        <Button type="button" variant="outline" size="icon" onClick={handleGenerateCode} disabled={isGeneratingCode}>
                            {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
                            <span className="sr-only">Generate Kode Otomatis</span>
                        </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem><FormLabel>Nama Barang</FormLabel><FormControl><Input placeholder="e.g., Kertas A4" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem><FormLabel>Kategori</FormLabel><FormControl><Input placeholder="e.g., Kertas" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="unit" render={({ field }) => (
                <FormItem><FormLabel>Satuan</FormLabel><FormControl><Input placeholder="e.g., Rim, Pcs, Box" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="stock" render={({ field }) => (
                <FormItem><FormLabel>Jumlah Stok</FormLabel><FormControl><Input type="number" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi Penyimpanan</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih lokasi" /></SelectTrigger></FormControl>
                    <SelectContent>{locationOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="department" render={({ field }) => (
                <FormItem>
                  <FormLabel>Departemen Terkait</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih departemen" /></SelectTrigger></FormControl>
                    <SelectContent>{departmentOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <div className="space-y-2">
              <Label>Upload Foto</Label>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-2">
                    <Button type="button" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => fileInputRef.current?.click()}>
                        <FileImage className="mr-2 h-4 w-4" />
                        Pilih Foto
                    </Button>
                     <Button type="button" className="bg-green-600 hover:bg-green-700 text-white" onClick={() => setIsCameraOpen(true)}>
                        <Camera className="mr-2 h-4 w-4" />
                        Buka Kamera
                    </Button>
                    <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                </div>
                {previewUrl && (
                  <div className="flex items-center gap-2 p-2 border rounded-md">
                    <Image src={previewUrl} alt="Preview" width={48} height={48} className="rounded-md object-cover" />
                    <Button type="button" variant="secondary" size="sm" onClick={() => handleUpload(selectedFile)} disabled={isUploading}>
                      {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />} Upload
                    </Button>
                  </div>
                )}
              </div>
            </div>

            <FormField control={form.control} name="photoURL" render={({ field }) => (
              <FormItem><FormLabel>URL Foto</FormLabel><FormControl><Input placeholder="Atau tempel URL di sini" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />

            <FormField control={form.control} name="notes" render={({ field }) => (
              <FormItem><FormLabel>Keterangan</FormLabel><FormControl><Textarea placeholder="Catatan tambahan..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading || isGeneratingCode}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Barang'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ambil Foto</DialogTitle>
            </DialogHeader>
            <div className="relative mb-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md" />
                <canvas ref={canvasRef} className="hidden" />
            </div>
             {previewUrl && (
                <div className="flex items-center justify-center gap-2 p-2 border rounded-md bg-muted">
                    <Image src={previewUrl} alt="Preview" width={60} height={60} className="rounded-md object-cover" />
                    <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                    <Button variant="secondary" onClick={() => handleUpload(selectedFile)} disabled={isUploading}>
                        {isUploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
                    </Button>
                </div>
            )}
            <DialogFooter>
                 <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>Tutup</Button>
                <Button onClick={handleCaptureAndUpload}>
                    <Camera className="mr-2 h-4 w-4" /> Ambil & Upload
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
