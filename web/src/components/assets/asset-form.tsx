'use client';

import { useState, type ReactNode, useEffect, useRef, useCallback } from 'react';
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
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { assetSchema } from '@/lib/schemas';
import { type Asset, type AssetFormValues, type AssetStatus } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp, getDocs, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { cn } from '@/lib/utils';
import { 
  Loader2, 
  Wand2, 
  Sparkles, 
  X as XIcon, 
  UploadCloud, 
  FileImage, 
  Camera, 
  Info, 
  MapPin, 
  Wallet, 
  ClipboardList, 
  ClipboardCheck,
  Tags, 
  ImageIcon, 
  PlusCircle, 
  Pencil, 
  Calendar, 
  TrendingDown, 
  Layers,
  CheckCircle2,
  Hash
} from 'lucide-react';
import { format, parse, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { generateTransactionCode } from '../mutations/utils';

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

interface AssetFormProps {
  asset?: Asset;
  children?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialStatus?: AssetStatus;
}

const defaultCategories = [
  'Elektronik', 
  'Kendaraan', 
  'Peralatan Kantor', 
  'Furnitur', 
  'Lainnya', 
  'APAR',
  'CCTV',
  'Utilitas & Kelistrikan',
  'Infrastruktur Gedung',
  'A1-Lahan', 
  'A2-Peralatan Bangunan', 
  'A3-Peralatan Mesin', 
  'A4-Peralatan Listrik', 
  'A5-Peralatan Transportasi', 
  'A6-Peralatan Penelitian & Uji Lab', 
  'A9-Peralatan Lain-lain'
];

const defaultLocations = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'LANTAI 2', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING', 'MIXER', 'OFFICE', 'POS SECURITY', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'TINTA'];

const defaultStatuses: AssetStatus[] = ['Aktif', 'Dipinjam', 'Rusak', 'Dihapus', 'Dipindah-Aktif', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'waiting_mutasi', 'waiting_disposal', 'karyawan_approved', 'approved_mutasi', 'approved_disposal', 'waiting_edit', 'approved_edit', 'waiting_creation', 'Aktif_creation', 'Other', 'Bukan_Asset_Perusahaan'];
const defaultConditions: Asset['condition'][] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex items-center gap-2 pb-2 mb-4 border-b border-muted/50">
    <div className="p-1.5 bg-primary/10 rounded-md">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/70">{title}</h3>
  </div>
);

const NativeDateInput = ({ 
  label, 
  value, 
  onChange 
}: { 
  label: string; 
  value: Date | null | undefined; 
  onChange: (date: Date | null) => void;
}) => {
  const dateString = value && isValid(value) ? format(value, "yyyy-MM-dd") : "";

  return (
    <div className="flex flex-col space-y-2 group">
      <div className="flex items-center justify-between">
        <FormLabel className="font-bold text-xs uppercase tracking-wider text-muted-foreground group-focus-within:text-primary transition-colors">
          {label}
        </FormLabel>
        {value && (
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="h-5 px-1.5 text-destructive hover:bg-destructive/10 rounded-full"
            onClick={() => onChange(null)}
          >
            <XIcon className="w-3 3" />
          </Button>
        )}
      </div>
      <div className="relative flex items-center">
        <Input 
          type="date"
          value={dateString}
          onChange={(e) => {
            const val = e.target.value;
            if (!val) {
              onChange(null);
            } else {
              const parsed = parse(val, "yyyy-MM-dd", new Date());
              onChange(isValid(parsed) ? parsed : null);
            }
          }}
          className="bg-background h-11 border-muted-foreground/20 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm pr-10 cursor-pointer"
        />
        <div className="absolute right-3 pointer-events-none text-muted-foreground/50">
          <Calendar className="h-4 w-4" />
        </div>
      </div>
    </div>
  );
};

export default function AssetForm({ asset, children, isOpen: isOpenProp, onOpenChange: onOpenChangeProp, initialStatus }: AssetFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const [assetLocations, setAssetLocations] = useState<string[]>(defaultLocations);
  const [assetCategories, setAssetCategories] = useState<string[]>(defaultCategories);
  const [assetStatuses, setAssetStatuses] = useState<string[]>(defaultStatuses);
  const [assetConditions, setAssetConditions] = useState<string[]>(defaultConditions);
  const [categoryData, setCategoryData] = useState<{name: string, lifetime: number}[]>([]);
  const [costCenters, setCostCenters] = useState<{code: string, department: string}[]>([]);
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!asset;

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isControlled = isOpenProp !== undefined && onOpenChangeProp !== undefined;
  const isOpen = isControlled ? isOpenProp : internalOpen;
  const setIsOpen = isControlled ? onOpenChangeProp : setInternalOpen;

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.departments) setAssetLocations(data.departments);
        if (data.categories) {
            const normalized = data.categories.map((c: any) => typeof c === 'string' ? { name: c, lifetime: 5 } : c);
            setCategoryData(normalized);
            setAssetCategories(normalized.map((c: any) => c.name));
        }
        if (data.costCenters) setCostCenters(data.costCenters);
        if (data.categoryLabels) setCategoryLabels(data.categoryLabels);
        if (data.assetStatuses) setAssetStatuses(data.assetStatuses);
        if (data.assetConditions) setAssetConditions(data.assetConditions);
      }
    });
    return () => unsub();
  }, []);

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
    }
    setIsCameraOpen(false);
  }, []);

  const form = useForm<AssetFormValues>({
    resolver: zodResolver(assetSchema),
    defaultValues: {
      name: asset?.name || '',
      code: asset?.code || '',
      costCenter: asset?.costCenter || '',
      category: asset?.category || '',
      location: asset?.location || '',
      purchaseDate: asset?.purchaseDate ? asset.purchaseDate.toDate() : null,
      price: asset?.price || 0,
      priceUSD: asset?.priceUSD || 0,
      qty: asset?.qty || 1,
      condition: asset?.condition || 'Baik',
      status: initialStatus || asset?.status || 'Aktif',
      notes: asset?.notes || '',
      photoURL: asset?.photoURL || '',
      photoURL2: asset?.photoURL2 || '',
      photoURL3: asset?.photoURL3 || '',
      photoURL4: asset?.photoURL4 || '',
      brand: asset?.brand || '',
      user: asset?.user || '',
      supplier: asset?.supplier || '',
      prNumber: asset?.prNumber || '',
      inspectionNumber: asset?.inspectionNumber || '',
      inspectionDate: asset?.inspectionDate ? asset.inspectionDate.toDate() : null,
      projectInspectionNumber: asset?.projectInspectionNumber || '',
      projectInspectionDate: asset?.projectInspectionDate ? asset.projectInspectionDate.toDate() : null,
      assetLifetime: asset?.assetLifetime || 0,
      manualDepreciationPercent: asset?.manualDepreciationPercent || 0,
      accessory1: asset?.accessory1 || '',
      accessory2: asset?.accessory2 || '',
      accessory3: asset?.accessory3 || '',
      accessory4: asset?.accessory4 || '',
      transactionCode: asset?.transactionCode || '',
      midSemesterCheckDate: asset?.midSemesterCheckDate ? asset.midSemesterCheckDate.toDate() : null,
      endSemesterCheckDate: asset?.endSemesterCheckDate ? asset.endSemesterCheckDate.toDate() : null,
    },
  });

  const watchedCategory = form.watch('category');
  const watchedCostCenter = form.watch('costCenter');
  const watchedName = form.watch('name');

  useEffect(() => {
    const catObj = categoryData.find(c => c.name === watchedCategory);
    if (catObj) {
      form.setValue('assetLifetime', catObj.lifetime);
    }
  }, [watchedCategory, categoryData, form]);

  useEffect(() => {
    if (watchedCostCenter && costCenters.length > 0) {
      const selectedCC = costCenters.find(c => c.code === watchedCostCenter);
      if (selectedCC) {
        form.setValue('location', selectedCC.department);
      }
    }
  }, [watchedCostCenter, costCenters, form]);

   useEffect(() => {
    if (isOpen) {
      form.reset({
        name: asset?.name || '',
        code: asset?.code || '',
        costCenter: asset?.costCenter || '',
        category: asset?.category || '',
        location: asset?.location || '',
        purchaseDate: asset?.purchaseDate ? asset.purchaseDate.toDate() : null,
        price: asset?.price || 0,
        priceUSD: asset?.priceUSD || 0,
        qty: asset?.qty || 1,
        condition: asset?.condition || 'Baik',
        status: initialStatus || asset?.status || 'Aktif',
        notes: asset?.notes || '',
        photoURL: asset?.photoURL || '',
        photoURL2: asset?.photoURL2 || '',
        photoURL3: asset?.photoURL3 || '',
        photoURL4: asset?.photoURL4 || '',
        brand: asset?.brand || '',
        user: asset?.user || '',
        supplier: asset?.supplier || '',
        prNumber: asset?.prNumber || '',
        inspectionNumber: asset?.inspectionNumber || '',
        inspectionDate: asset?.inspectionDate ? asset.inspectionDate.toDate() : null,
        projectInspectionNumber: asset?.projectInspectionNumber || '',
        projectInspectionDate: asset?.projectInspectionDate ? asset.projectInspectionDate.toDate() : null,
        assetLifetime: asset?.assetLifetime || 0,
        manualDepreciationPercent: asset?.manualDepreciationPercent || 0,
        accessory1: asset?.accessory1 || '',
        accessory2: asset?.accessory2 || '',
        accessory3: asset?.accessory3 || '',
        accessory4: asset?.accessory4 || '',
        transactionCode: asset?.transactionCode || '',
        midSemesterCheckDate: asset?.midSemesterCheckDate ? asset.midSemesterCheckDate.toDate() : null,
        endSemesterCheckDate: asset?.endSemesterCheckDate ? asset.endSemesterCheckDate.toDate() : null,
      });
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  }, [isOpen, asset, form, initialStatus]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  async function onSubmit(values: AssetFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      const dataToSave: any = {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(values.purchaseDate) : null,
        inspectionDate: values.inspectionDate ? Timestamp.fromDate(values.inspectionDate) : null,
        projectInspectionDate: values.projectInspectionDate ? Timestamp.fromDate(values.projectInspectionDate) : null,
        midSemesterCheckDate: values.midSemesterCheckDate ? Timestamp.fromDate(values.midSemesterCheckDate) : null,
        endSemesterCheckDate: values.endSemesterCheckDate ? Timestamp.fromDate(values.endSemesterCheckDate) : null,
        updatedAt: serverTimestamp(),
      };
      
      const logCollection = collection(db, 'system_logs');

      if (isEditMode && asset) {
        const assetRef = doc(db, 'assets', asset.id);
        await setDoc(assetRef, dataToSave, { merge: true });
        
        await addDoc(logCollection, {
          type: 'ASSET',
          action: 'UPDATE',
          description: `Memperbarui data aset "${values.name}"`,
          targetId: asset.id,
          targetCode: values.code,
          targetName: values.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Berhasil', description: 'Aset berhasil diperbarui.' });
      } else {
        const isAdminUser = user.role === 'Admin';
        let finalStatus: AssetStatus;
        let toastMessage = 'Aset baru berhasil ditambahkan.';

        if (!isAdminUser) {
            finalStatus = 'waiting_creation';
            dataToSave.requestedBy = user.uid;
            dataToSave.requestedAt = serverTimestamp();
            toastMessage = 'Pengajuan penambahan aset baru telah dikirim dan menunggu persetujuan Admin.';
        } else {
            finalStatus = 'Aktif_creation';
            const transactionCode = await generateTransactionCode('CRT', values.location);
            dataToSave.transactionCode = transactionCode;
            dataToSave.requestedBy = user.uid;
            dataToSave.requestedAt = serverTimestamp();
            dataToSave.approvedBy = user.uid;
            dataToSave.approvedAt = serverTimestamp();
            const creatorName = user.displayName || 'Admin';
            dataToSave.notes = `Aset dibuat oleh ${creatorName}. Kode Transaksi: ${transactionCode}\n${values.notes || ''}`.trim();
            toastMessage = 'Aset baru berhasil ditambahkan dan tercatat di riwayat.';
        }

        dataToSave.status = finalStatus;

        const collectionRef = collection(db, 'assets');
        const newAssetDoc = await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp(), borrowingHistory: [] });
        
        await addDoc(logCollection, {
          type: 'ASSET',
          action: isAdminUser ? 'CREATE' : 'REQUEST_CREATE',
          description: isAdminUser ? `Menambahkan aset baru "${values.name}"` : `Mengajukan penambahan aset baru "${values.name}"`,
          targetId: newAssetDoc.id,
          targetCode: values.code,
          targetName: values.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Berhasil', description: toastMessage });
      }
      
      form.reset();
      setIsOpen(false);

    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: 'Terjadi kesalahan saat menyimpan aset.',
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
        form.reset();
        setSelectedFile(null);
        setPreviewUrl(null);
        stopCamera();
    }
  }
  
  const handleGenerateCodeB9 = async () => {
    const price = form.getValues('price');
    const purchaseDate = form.getValues('purchaseDate');
    if (price >= 12000000) {
        toast({ variant: 'destructive', title: 'Kondisi Tidak Terpenuhi', description: 'Harga IDR harus di bawah 12.000.000 untuk generate kode otomatis.' });
        return;
    }
    if (!purchaseDate) {
        toast({ variant: 'destructive', title: 'Tanggal Pembelian Kosong', description: 'Silakan isi tanggal pembelian terlebih dahulu.' });
        return;
    }
    setIsGeneratingCode(true);
    try {
        const datePart = format(purchaseDate, 'yyyyMMdd');
        const codePrefix = `B9-${datePart}`;
        const assetsRef = collection(db, 'assets');
        const q = query(assetsRef, where('code', '>=', codePrefix), where('code', '<', codePrefix + 'z'));
        const querySnapshot = await getDocs(q);
        const sequenceNumber = querySnapshot.size + 1;
        const sequencePart = sequenceNumber.toString().padStart(2, '0');
        const newCode = `${codePrefix}${sequencePart}`;
        form.setValue('code', newCode);
        toast({ title: 'Kode Dihasilkan', description: `Kode aset baru: ${newCode}` });
    } catch (error) {
        console.error("Error generating asset code:", error);
    } finally {
      setIsGeneratingCode(false);
    }
  };

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
                handleUpload(capturedFile).then(() => stopCamera());
            }
        }, 'image/jpeg');
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
        const photoFields: ('photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4')[] = ['photoURL', 'photoURL2', 'photoURL3', 'photoURL4'];
        let urlFilled = false;
        for (const field of photoFields) {
          if (!form.getValues(field as any)) {
            form.setValue(field as any, secureUrl);
            urlFilled = true;
            break;
          }
        }
        if (!urlFilled) {
          form.setValue('photoURL', secureUrl);
        }
        toast({ title: 'Upload Berhasil', description: 'URL gambar telah ditambahkan ke form.' });
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

  const buttonText = isEditMode ? 'Simpan Perubahan' : (user?.role !== 'Admin' ? 'Ajukan Penambahan Aset' : 'Simpan Aset');
  const inputClass = "bg-background h-11 border-muted-foreground/20 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm";

  const getAccessoryLabel = (index: 1 | 2 | 3 | 4) => {
    if (categoryLabels[watchedCategory] && categoryLabels[watchedCategory][index - 1]) {
        return categoryLabels[watchedCategory][index - 1];
    }

    const isEmissionISO = watchedCategory === 'A3-Peralatan Mesin' || watchedCategory === 'A4-Peralatan Listrik';
    if (isEmissionISO) {
      switch(index) {
        case 1: return "Sumber Emisi";
        case 2: return "Volume / Tahun";
        case 3: return "Faktor Emisi";
        case 4: return "Metodologi";
      }
    }
    const isAirConditioner = (watchedName || '').toLowerCase().includes('ac') || (watchedName || '').toLowerCase().includes('air conditioner') || watchedCategory === 'Elektronik';
    if (isAirConditioner) {
      switch(index) {
        case 1: return "Model / Tipe";
        case 2: return "Jenis Refrigeran";
        case 3: return "Volume KG";
        case 4: return "kW";
      }
    }
    if (watchedCategory === 'APAR') {
      switch(index) {
        case 1: return "Berat (kg)";
        case 2: return "Media";
        case 3: return "Exp Date";
        case 4: return "Posisi";
      }
    }
    if (watchedCategory === 'CCTV') {
      switch(index) {
        case 1: return "IP Address";
        case 2: return "Model";
        case 3: return "Resolusi";
        case 4: return "Channel";
      }
    }
    return `Kelengkapan ${index}`;
  };

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
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera:", err);
          setIsCameraOpen(false);
        }
      }
    };
    startCamera();
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraOpen]);

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!children && isControlled ? null : <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent 
        className={cn(
            "sm:max-w-5xl max-h-[85vh] my-8 overflow-y-auto p-0 border-none shadow-2xl",
            isEditMode ? "bg-slate-50 dark:bg-slate-900" : "bg-white dark:bg-slate-950 text-black"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <div className={cn(
          "sticky top-0 z-50 px-6 py-4 flex items-center justify-between border-b",
          isEditMode ? "bg-yellow-500 text-yellow-950" : "bg-green-600 text-white"
        )}>
          <div>
            <DialogTitle className="text-xl md:text-2xl font-black tracking-tight flex items-center gap-2 text-left text-black">
              {isEditMode ? <Pencil className="w-6 h-6" /> : <PlusCircle className="w-6 h-6" />}
              {isEditMode ? 'EDIT DATA ASET' : 'TAMBAH ASET BARU'}
            </DialogTitle>
            <DialogDescription className={cn("text-left font-medium", isEditMode ? "text-yellow-900/80" : "text-green-50/80")}>
              {isEditMode ? `Memperbarui informasi aset: ${asset?.code}` : 'Daftarkan aset perusahaan baru ke dalam sistem.'}
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-black/10">
              <XIcon className="w-6 h-6" />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              <section>
                <SectionHeader icon={Info} title="Informasi Dasar Aset" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Nama Aset <span className="text-destructive">*</span></FormLabel>
                      <FormControl><Input placeholder="e.g., Air Conditioner (AC) 2 PK" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="brand" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Merek (Brand)</FormLabel>
                      <FormControl><Input placeholder="e.g., Panasonic, Toyota, Sharp" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="code" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Kode Aset <span className="text-destructive">*</span></FormLabel>
                      <div className="flex items-center gap-2">
                        <FormControl><Input placeholder="e.g., A3-202401-001" {...field} className={inputClass} /></FormControl>
                        {!isEditMode && (
                          <Button type="button" variant="outline" size="icon" onClick={handleGenerateCodeB9} disabled={isGeneratingCode} className="h-11 w-11 shrink-0 bg-primary/5 border-primary/20 hover:bg-primary/10">
                            {isGeneratingCode ? <Loader2 className="h-4 w-4 animate-spin text-primary" /> : <Sparkles className="h-4 w-4 text-primary" />}
                          </Button>
                        )}
                      </div>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Kategori Aset <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih kategori" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  {/* Kolom Transaksi ditambahkan di sini */}
                  <FormField control={form.control} name="transactionCode" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <Hash className="w-3 h-3" /> Kode Transaksi
                      </FormLabel>
                      <FormControl><Input placeholder="e.g., CRT-20240101-001" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={MapPin} title="Lokasi & Tanggung Jawab" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                  <FormField control={form.control} name="costCenter" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Cost Center</FormLabel>
                      <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value || ""}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih cost center" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="none">(Tanpa Cost Center)</SelectItem>
                          {costCenters.map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.department}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="location" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Lokasi Unit <span className="text-destructive">*</span></FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih lokasi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="user" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Penanggung Jawab (User)</FormLabel>
                      <FormControl><Input placeholder="e.g., Nama Karyawan" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={Wallet} title="Detail Keuangan & Pembelian" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-black">
                  <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                    <FormItem>
                      <div className="flex justify-between items-center mb-1">
                        <FormLabel className="sr-only">Tanggal Pembelian</FormLabel>
                        <Button type="button" variant="link" size="sm" className="p-0 h-auto text-[10px] uppercase font-black text-primary hover:no-underline" onClick={() => {
                          const code = form.getValues('code');
                          if (code) {
                            const parts = code.split('-');
                            if (parts.length >= 3 && parts[1].length === 6) {
                              const y = parseInt(parts[1].substring(0, 4), 10);
                              const d = parseInt(parts[1].substring(4, 6), 10);
                              const m = parseInt(parts[2].substring(0, 3), 10);
                              if (!isNaN(y) && !isNaN(m) && !isNaN(d)) {
                                const parsed = new Date(y, m - 1, d);
                                if (isValid(parsed)) {
                                  form.setValue('purchaseDate', parsed);
                                  toast({ title: 'Berhasil', description: `Tanggal diatur ke: ${format(parsed, "PPP", { locale: id })}` });
                                }
                              }
                            }
                          }
                        }}>
                          <Wand2 className="mr-1 h-3 w-3" /> Ambil dari Kode
                        </Button>
                      </div>
                      <NativeDateInput 
                        label="Tanggal Pembelian"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="price" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Harga (IDR)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="priceUSD" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Harga (USD)</FormLabel>
                      <FormControl><Input type="number" placeholder="0" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="manualDepreciationPercent" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                        <TrendingDown className="w-3.5 h-3.5" />
                        Penyusutan Manual (%)
                      </FormLabel>
                      <FormControl>
                        <Input 
                          type="number" 
                          placeholder="0-100" 
                          min={0} 
                          max={100} 
                          {...field} 
                          className={cn(inputClass)} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="supplier" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Vendor / Supplier</FormLabel>
                      <FormControl><Input placeholder="Nama Toko atau PT" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="prNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Nomor PR</FormLabel>
                      <FormControl><Input placeholder="Purchase Request Number" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={ClipboardCheck} title="Spesifikasi & Dokumen Teknis" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-black">
                  <FormField control={form.control} name="qty" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Jumlah (Unit)</FormLabel>
                      <FormControl><Input type="number" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="condition" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Kondisi Fisik</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih kondisi" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Status Aset</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className={inputClass}>
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {assetStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="assetLifetime" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Masa Ketahanan (Thn)</FormLabel>
                      <FormControl><Input type="number" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6 text-black">
                  <FormField control={form.control} name="inspectionNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Nomor Inspeksi</FormLabel>
                      <FormControl><Input placeholder="Internal Inspection Number" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="inspectionDate" render={({ field }) => (
                    <FormItem>
                      <NativeDateInput 
                        label="Tanggal Inspeksi"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="projectInspectionNumber" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">No. Insp Proyek</FormLabel>
                      <FormControl><Input placeholder="Project Inspection Number" {...field} className={inputClass} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="projectInspectionDate" render={({ field }) => (
                    <FormItem>
                      <NativeDateInput 
                        label="Tgl Insp Proyek"
                        value={field.value}
                        onChange={field.onChange}
                      />
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section className={cn(
                "p-6 rounded-xl border-2 border-dashed transition-all duration-300 bg-slate-100 dark:bg-slate-900 border-primary/20"
              )}>
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-black text-sm uppercase flex items-center gap-2">
                    <Tags className="w-5 h-5 text-primary" />
                    Kelengkapan Rincian Teknis
                  </h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 text-black">
                  <FormField control={form.control} name="accessory1" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase text-left">
                        {getAccessoryLabel(1)}
                      </FormLabel>
                      <FormControl><Input placeholder="..." {...field} className="bg-background h-11 shadow-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accessory2" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase text-left">
                        {getAccessoryLabel(2)}
                      </FormLabel>
                      <FormControl><Input placeholder="..." {...field} className="bg-background h-11 shadow-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accessory3" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase text-left">
                        {getAccessoryLabel(3)}
                      </FormLabel>
                      <FormControl><Input placeholder="..." {...field} className="bg-background h-11 shadow-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="accessory4" render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs font-bold text-muted-foreground uppercase text-left">
                        {getAccessoryLabel(4)}
                      </FormLabel>
                      <FormControl><Input placeholder="..." {...field} className="bg-background h-11 shadow-sm" /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={ImageIcon} title="Dokumentasi Visual & Catatan" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-black">
                  <div className="space-y-4 text-left">
                    <Label className="font-bold flex items-center gap-2 text-xs uppercase text-muted-foreground">
                      <ImageIcon className="w-4 h-4" /> Daftar Foto (URL)
                    </Label>
                    {['photoURL', 'photoURL2', 'photoURL3', 'photoURL4'].map((photoField, idx) => (
                      <FormField key={photoField} control={form.control} name={photoField as any} render={({ field }) => (
                        <FormItem>
                          <div className="flex items-center gap-2">
                            <FormControl><Input placeholder={`URL Foto ${idx + 1}...`} {...field} className={inputClass} /></FormControl>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )} />
                    ))}
                    
                    <div className="p-4 bg-muted/30 rounded-lg border">
                      <p className="text-[10px] font-black uppercase mb-3 flex items-center gap-2 text-primary"><UploadCloud className="w-3.5 h-3.5" /> Quick Upload</p>
                      <div className="flex flex-wrap gap-2">
                        <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()} className="bg-blue-600 hover:bg-blue-700 text-white rounded-full">
                          <FileImage className="mr-2 h-4 w-4" /> Pilih File
                        </Button>
                        <Button type="button" size="sm" variant="secondary" onClick={() => setIsCameraOpen(true)} className="rounded-full">
                          <Camera className="mr-2 h-4 w-4" /> Kamera
                        </Button>
                        <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                      </div>
                      {previewUrl && (
                        <div className="mt-4 flex items-center gap-3 p-2 bg-background rounded-md border shadow-sm animate-in zoom-in-95">
                          <div className="relative w-12 h-12 rounded overflow-hidden border">
                            <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-[10px] font-bold truncate opacity-70">{selectedFile?.name}</p>
                            <Button type="button" variant="link" size="sm" onClick={() => handleUpload(selectedFile)} disabled={isUploading} className="p-0 h-auto text-primary text-[10px] font-black">
                              {isUploading ? "UPLOADING..." : "KLIK UNTUK UNGGAH SEKARANG"}
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <FormField control={form.control} name="notes" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground">Catatan Internal / Riwayat</FormLabel>
                        <FormControl><Textarea placeholder="Berikan informasi tambahan atau catatan teknis mengenai aset ini..." {...field} className="min-h-[280px] bg-background shadow-inner resize-none" /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>
              </section>

              <DialogFooter className="sticky bottom-0 bg-white/95 backdrop-blur-md p-6 border-t mt-10 -mx-8 z-50">
                <div className="flex w-full items-center justify-between">
                  <p className="text-[10px] font-bold text-muted-foreground hidden sm:block uppercase tracking-tighter">Pastikan semua data bertanda <span className="text-destructive">*</span> telah diisi.</p>
                  <div className="flex items-center gap-3">
                    <DialogClose asChild>
                      <Button type="button" variant="outline" disabled={isLoading} className="rounded-full">Batal</Button>
                    </DialogClose>
                    <Button type="submit" disabled={isLoading || isUploading} className={cn("px-8 h-12 font-black rounded-xl shadow-xl transition-all uppercase tracking-widest", isEditMode ? "bg-yellow-600 hover:bg-yellow-700" : "bg-green-600 hover:bg-green-700")}>
                      {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                      {buttonText}
                    </Button>
                  </div>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>

    <Dialog open={isCameraOpen} onOpenChange={(open) => {
        if (!open) stopCamera();
        else setIsCameraOpen(true);
    }}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-black rounded-3xl mx-auto" onPointerDownOutside={(e) => e.preventDefault()}>
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white">
                <DialogTitle>Kamera Identitas</DialogTitle>
                <DialogDescription className="sr-only">Ambil foto fisik aset untuk dokumentasi.</DialogDescription>
                <DialogClose asChild><Button variant="ghost" size="icon" className="hover:bg-white/10" onClick={stopCamera}><XIcon className="w-5 h-5"/></Button></DialogClose>
            </div>
            <div className="relative aspect-video bg-black">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[20px] border-black/20 pointer-events-none"></div>
            </div>
            <div className="p-6 bg-slate-900 flex justify-center">
                <Button onClick={handleCaptureAndUpload} className="h-16 w-16 rounded-full bg-primary hover:scale-105 transition-transform p-0 shadow-2xl border-4 border-white/30 text-white">
                    <Camera className="h-8 w-8" />
                </Button>
            </div>
        </DialogContent>
    </Dialog>
    </>
  );
}
