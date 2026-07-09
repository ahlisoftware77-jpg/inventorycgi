

'use client';

import { useState, type ReactNode, useEffect, useRef } from 'react';
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
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogCancel,
    AlertDialogAction,
} from '@/components/ui/alert-dialog';
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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { assetSchema } from '@/lib/schemas';
import { type Asset, type AssetFormValues, type AssetStatus } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp, updateDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { cn } from '@/lib/utils';
import { CalendarIcon, Loader2, Wand2, Link as LinkIcon, Sparkles, XIcon, UploadCloud, FileImage, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import Image from 'next/image';

interface AssetFormProps {
  asset?: Asset;
  children?: ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  initialStatus?: AssetStatus;
}

const assetCategories = ['Elektronik', 'Kendaraan', 'Peralatan Kantor', 'Furnitur', 'Lainnya', 'A1-Lahan', 'A2-Peralatan Bangunan', 'A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'A6-Peralatan Penelitian & Uji Lab', 'A9-Peralatan Lain-lain'];
const assetLocations = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'LANTAI 2', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING', 'MIXER', 'OFFICE', 'POS SECURITY', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'TINTA'];
const costCenters = [
    { code: 'F1313', department: 'MIXER' },
    { code: 'F1323', department: 'PPIC' },
    { code: 'F1312', department: 'FRIT' },
    { code: 'F0210', department: 'GA' },
    { code: 'F1325', department: 'APP-R&D' },
    { code: 'F1324', department: 'LAB' },
    { code: 'F1321', department: 'QC' },
    { code: 'F1322', department: 'MAINTENANCE' },
    { code: 'F0220', department: 'ACCOUNTING' },
    { code: 'F1314', department: 'TINTA' },
    { code: 'F0100', department: 'IT' },
    { code: 'F1325-A', department: 'APP' },
    { code: 'F1325-R', department: 'R&D' },
    { code: 'F0230', department: 'MARKETING' },
    { code: 'F0300', department: 'PURCHASING' },
];
const assetStatuses: AssetStatus[] = ['Aktif', 'Dipinjam', 'Perlu Perbaikan', 'Rusak', 'Dihapus', 'Dipindah-Aktif', 'waiting_mutasi', 'waiting_disposal', 'waiting_edit', 'waiting_creation', 'Aktif_creation', 'approved_mutasi', 'approved_disposal', 'approved_edit'];
const assetConditions: Asset['condition'][] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

const categoryLifetimeMap: Record<string, number | undefined> = {
    'A1-Lahan': 99,
    'A2-Peralatan Bangunan': 30,
    'A3-Peralatan Mesin': 15,
    'A4-Peralatan Listrik': 10,
    'A5-Peralatan Transportasi': 10,
    'A6-Peralatan Penelitian & Uji Lab': 7,
    'A9-Peralatan Lain-lain': 5,
    'Elektronik': 5,
    'Kendaraan': 10,
    'Furnitur': 10,
    'Peralatan Kantor': 7,
    'Lainnya': 0,
};

const departmentCostCenterMap: Record<string, string> = {
    'ACCOUNTING': 'F0220',
    'APP': 'F1325-A',
    'APP-R&D': 'F1325',
    'FRIT': 'F1312',
    'GA': 'F0210',
    'IT': 'F0100',
    'LAB': 'F1324',
    'MAINTENANCE': 'F1322',
    'MARKETING': 'F0230',
    'MIXER': 'F1313',
    'PPIC': 'F1323',
    'PURCHASING': 'F0300',
    'QC': 'F1321',
    'R&D': 'F1325-R',
    'TINTA': 'F1314',
};

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const generateTransactionCode = async (type: 'MUT' | 'DIS' | 'EDT' | 'CRT', location?: string): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const locationPrefix = location ? `${location}-` : '';
    const prefix = `${locationPrefix}${type}-${year}${month}${day}-`;

    const assetsRef = collection(db, 'assets');
    // We query based on the full prefix to ensure uniqueness per location and type
    const q = query(assetsRef, where('transactionCode', '>=', prefix), where('transactionCode', '<', prefix + 'z'));
    const querySnapshot = await getDocs(q);

    const sequence = querySnapshot.size + 1;
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
};

export default function AssetForm({ asset, children, isOpen: isOpenProp, onOpenChange: onOpenChangeProp, initialStatus }: AssetFormProps) {
  const [internalOpen, setInternalOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingCode, setIsGeneratingCode] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!asset;

  const [newUser, setNewUser] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const isControlled = isOpenProp !== undefined && onOpenChangeProp !== undefined;
  const isOpen = isControlled ? isOpenProp : internalOpen;
  const setIsOpen = isControlled ? onOpenChangeProp : setInternalOpen;


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
      disposalPhotoURL1: asset?.disposalPhotoURL1 || '',
      disposalPhotoURL2: asset?.disposalPhotoURL2 || '',
      disposalPhotoURL3: asset?.disposalPhotoURL3 || '',
      disposalPhotoURL4: asset?.disposalPhotoURL4 || '',
      brand: asset?.brand || '',
      user: asset?.user || '',
      supplier: asset?.supplier || '',
      prNumber: asset?.prNumber || '',
      inspectionNumber: asset?.inspectionNumber || '',
      projectInspectionNumber: asset?.projectInspectionNumber || '',
      projectInspectionDate: asset?.projectInspectionDate ? asset.projectInspectionDate.toDate() : undefined,
      mutationDate: asset?.mutationDate ? asset.mutationDate.toDate() : undefined,
      disposalDate: asset?.disposalDate ? asset.disposalDate.toDate() : undefined,
      midSemesterCheckDate: asset?.midSemesterCheckDate ? asset.midSemesterCheckDate.toDate() : undefined,
      endSemesterCheckDate: asset?.endSemesterCheckDate ? asset.endSemesterCheckDate.toDate() : undefined,
      assetLifetime: asset?.assetLifetime || 0,
      accessory1: asset?.accessory1 || '',
      accessory2: asset?.accessory2 || '',
      accessory3: asset?.accessory3 || '',
      accessory4: asset?.accessory4 || '',
      transactionCode: asset?.transactionCode || '',
    },
  });

  const watchedCategory = form.watch('category');
  const watchedStatus = form.watch('status');
  const watchedCostCenter = form.watch('costCenter');

  useEffect(() => {
    const lifetime = categoryLifetimeMap[watchedCategory];
    if (lifetime !== undefined) {
      form.setValue('assetLifetime', lifetime);
    } else {
      // Optional: reset if category is not in the map
      form.setValue('assetLifetime', 0);
    }
  }, [watchedCategory, form]);

  useEffect(() => {
    if (watchedCostCenter) {
      const selectedCostCenter = costCenters.find(c => c.code === watchedCostCenter);
      if (selectedCostCenter) {
        form.setValue('location', selectedCostCenter.department);
      }
    }
  }, [watchedCostCenter, form]);

   useEffect(() => {
    if (isOpen) {
      const isAdding = !isEditMode;
      const defaultValues = {
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
        disposalPhotoURL1: asset?.disposalPhotoURL1 || '',
        disposalPhotoURL2: asset?.disposalPhotoURL2 || '',
        disposalPhotoURL3: asset?.disposalPhotoURL3 || '',
        disposalPhotoURL4: asset?.disposalPhotoURL4 || '',
        brand: asset?.brand || '',
        user: asset?.user || '',
        supplier: asset?.supplier || '',
        prNumber: asset?.prNumber || '',
        inspectionNumber: asset?.inspectionNumber || '',
        projectInspectionNumber: asset?.projectInspectionNumber || '',
        projectInspectionDate: asset?.projectInspectionDate ? asset.projectInspectionDate.toDate() : null,
        mutationDate: asset?.mutationDate ? asset.mutationDate.toDate() : null,
        disposalDate: asset?.disposalDate ? asset.disposalDate.toDate() : null,
        midSemesterCheckDate: asset?.midSemesterCheckDate ? asset.midSemesterCheckDate.toDate() : null,
        endSemesterCheckDate: asset?.endSemesterCheckDate ? asset.endSemesterCheckDate.toDate() : null,
        assetLifetime: asset?.assetLifetime || 0,
        accessory1: asset?.accessory1 || '',
        accessory2: asset?.accessory2 || '',
        accessory3: asset?.accessory3 || '',
        accessory4: asset?.accessory4 || '',
        transactionCode: asset?.transactionCode || '',
      };
      
      if (isAdding && user?.department && user.role !== 'Admin') {
        defaultValues.location = user.department;
        const mappedCostCenter = departmentCostCenterMap[user.department];
        if (mappedCostCenter) {
            defaultValues.costCenter = mappedCostCenter;
        }
      }

      form.reset(defaultValues);
      setNewUser('');
      setSelectedFile(null);
      setPreviewUrl(null);

    }
  }, [isOpen, asset, form, initialStatus, isEditMode, user]);

  async function onSubmit(values: AssetFormValues) {
    if (!user) return;

    setIsLoading(true);

    try {
      const dataToSave: any = {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(values.purchaseDate) : null,
        projectInspectionDate: values.projectInspectionDate ? Timestamp.fromDate(values.projectInspectionDate) : null,
        mutationDate: values.mutationDate ? Timestamp.fromDate(values.mutationDate) : null,
        disposalDate: values.disposalDate ? Timestamp.fromDate(values.disposalDate) : null,
        midSemesterCheckDate: values.midSemesterCheckDate ? Timestamp.fromDate(values.midSemesterCheckDate) : null,
        endSemesterCheckDate: values.endSemesterCheckDate ? Timestamp.fromDate(values.endSemesterCheckDate) : null,
        updatedAt: serverTimestamp(),
      };
      
      if (isEditMode) {
        const assetRef = doc(db, 'assets', asset.id);
        await setDoc(assetRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil', description: 'Aset berhasil diperbarui.' });
      } else {
        const isAdmin = user.role === 'Admin';
        let finalStatus: AssetStatus;
        let toastMessage = 'Aset baru berhasil ditambahkan.';

        if (!isAdmin) {
            finalStatus = 'waiting_creation';
            dataToSave.requestedBy = user.uid;
            dataToSave.requestedAt = serverTimestamp();
            toastMessage = 'Pengajuan penambahan aset baru telah dikirim dan menunggu persetujuan Admin.';
        } else {
            // Generate transaction code only for direct admin creation
            finalStatus = 'Aktif_creation';
            dataToSave.transactionCode = await generateTransactionCode('CRT', values.location);
            dataToSave.approvedBy = user.uid;
            dataToSave.approvedAt = serverTimestamp();
            toastMessage = 'Aset baru berhasil ditambahkan dan tercatat di riwayat.';
        }

        dataToSave.status = finalStatus;

        const collectionRef = collection(db, 'assets');
        await addDoc(collectionRef, { ...dataToSave, createdAt: serverTimestamp(), borrowingHistory: [] });
        toast({ title: 'Berhasil', description: toastMessage });
      }
      
      form.reset();
      setIsOpen(false);

    } catch (error: any) {
      console.error('Error saving asset:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menyimpan',
        description: typeof error === 'string' ? error : 'Terjadi kesalahan saat menyimpan aset.',
      });
    } finally {
      setIsLoading(false);
    }
  }

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
        const photoFields: ('photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4')[] = ['photoURL', 'photoURL2', 'photoURL3', 'photoURL4'];
        let urlFilled = false;
        for (const field of photoFields) {
          if (!form.getValues(field)) {
            form.setValue(field, secureUrl);
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

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open);
    if (!open) {
        form.reset();
        setNewUser('');
        setSelectedFile(null);
        setPreviewUrl(null);
    }
  }
  
  const parseDateFromCode = (code: string): Date | null => {
    if (!code) return null;
    
    const parts = code.split('-');
    if (parts.length < 3) return null;

    const datePart = parts[1];
    const monthPart = parts[2];

    if (datePart && datePart.length === 6 && monthPart) {
        const yearStr = datePart.substring(0, 4);
        const dayStr = datePart.substring(4, 6);
        const monthStr = monthPart.substring(0, 3);

        const year = parseInt(yearStr, 10);
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);

        if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const parsedDate = new Date(year, month - 1, day);
            if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
                return parsedDate;
            }
        }
    }
    return null;
  };

  const setDateFromCode = () => {
    const code = form.getValues('code');
    if (!code) {
      toast({ variant: 'destructive', title: 'Kode Aset Kosong', description: 'Silakan isi Kode Aset terlebih dahulu.' });
      return;
    }
  
    const parsedDate = parseDateFromCode(code);
    
    if (parsedDate) {
      form.setValue('purchaseDate', parsedDate);
      toast({ title: 'Berhasil', description: `Tanggal pembelian diatur ke: ${format(parsedDate, "PPP", { locale: id })}` });
    } else {
      toast({ variant: 'destructive', title: 'Gagal', description: 'Format tanggal (misal: A3-200829-002) tidak ditemukan atau tidak valid dalam kode aset.' });
    }
  };

  const convertImgurLink = (field: 'photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4') => {
    const link = form.getValues(field) || '';
    const regex = /imgur\.com\/(?:gallery\/|a\/)?([a-zA-Z0-9]+)(?:\..*)?$/;
    const match = link.match(regex);

    if (match && match[1]) {
        const imgId = match[1];
        const directUrl = `https://i.imgur.com/${imgId}.jpg`;
        form.setValue(field, directUrl);
        toast({
            title: 'Link Dikonversi',
            description: 'URL Imgur berhasil diubah ke link .jpg langsung.',
        });
    } else {
        toast({
            variant: 'destructive',
            title: 'Gagal Konversi',
            description: 'URL Imgur tidak valid atau format tidak dikenali.',
        });
    }
  };
  
  const handleGenerateCode = async () => {
    const price = form.getValues('price');
    const purchaseDate = form.getValues('purchaseDate');

    if (price >= 12000000) {
        toast({
            variant: 'destructive',
            title: 'Kondisi Tidak Terpenuhi',
            description: 'Harga IDR harus di bawah 12.000.000 untuk generate kode otomatis.',
        });
        return;
    }
    if (!purchaseDate) {
        toast({
            variant: 'destructive',
            title: 'Tanggal Pembelian Kosong',
            description: 'Silakan isi tanggal pembelian terlebih dahulu.',
        });
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

        toast({
            title: 'Kode Dihasilkan',
            description: `Kode aset baru: ${newCode}`,
        });

    } catch (error) {
        console.error("Error generating asset code:", error);
        toast({
            variant: 'destructive',
            title: 'Gagal Generate Kode',
            description: 'Terjadi kesalahan saat berkomunikasi dengan database.',
        });
    } finally {
      setIsGeneratingCode(false);
    }
  };

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
      // Clean up stream on component unmount or when dialog closes
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
                handleUpload(capturedFile).then(() => {
                    setIsCameraOpen(false);
                });
            }
        }, 'image/jpeg');
    }
};


  const buttonText = isEditMode ? 'Simpan Perubahan' : (user?.role !== 'Admin' ? 'Ajukan Penambahan Aset' : 'Simpan Aset');
  const inputClass = !isEditMode ? 'bg-slate-800' : '';

  return (
    <>
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      {!isControlled && <DialogTrigger asChild>{children}</DialogTrigger>}
      <DialogContent 
        className={cn(
            "sm:max-w-4xl max-h-[90vh] overflow-y-auto",
            isEditMode ? "bg-yellow-50" : "bg-green-900 text-green-50"
        )}
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Aset' : 'Tambah Aset Baru'}</DialogTitle>
          <DialogDescription className={cn(!isEditMode && "text-green-200")}>
            {isEditMode ? 'Perbarui detail aset di bawah ini.' : 'Isi formulir di bawah ini untuk menambahkan aset baru.'}
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-2 py-4 border-y border-dashed">
            <Label>Upload Foto Aset</Label>
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
                    <Input
                        ref={fileInputRef}
                        type="file"
                        className="hidden"
                        accept="image/*"
                        onChange={handleFileChange}
                    />
                </div>
                {previewUrl && (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-background/50">
                        <Image src={previewUrl} alt="Preview" width={48} height={48} className="rounded-md object-cover" />
                        <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                        <Button type="button" variant="destructive" size="sm" onClick={() => handleUpload(selectedFile)} disabled={isUploading}>
                            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                            Upload
                        </Button>
                    </div>
                )}
            </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <FormField control={form.control} name="name" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nama Aset</FormLabel>
                  <FormControl><Input placeholder="e.g., Laptop Dell XPS 15" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="code" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kode Aset</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                      <Input placeholder="e.g., LPT-001 atau generate otomatis" {...field} className={inputClass} />
                    </FormControl>
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
               <FormField control={form.control} name="costCenter" render={({ field }) => (
                <FormItem>
                  <FormLabel>Pusat Biaya</FormLabel>
                  <Select onValueChange={(value) => field.onChange(value === "none" ? "" : value)} value={field.value || ""}>
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Pilih pusat biaya" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="none">(Kosong)</SelectItem>
                      {costCenters.map(c => <SelectItem key={c.code} value={c.code}>{c.code} - {c.department}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="category" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kategori</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Pilih kategori aset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetCategories.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="location" render={({ field }) => (
                <FormItem>
                  <FormLabel>Lokasi</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                    <FormControl>
                      <SelectTrigger className={inputClass}>
                        <SelectValue placeholder="Pilih lokasi aset" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {assetLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <div className="flex justify-between items-center">
                    <FormLabel>Tanggal Pembelian</FormLabel>
                    <Button type="button" variant="link" size="sm" className="p-0 h-auto" onClick={setDateFromCode}>
                      <Wand2 className="mr-1 h-3 w-3" />
                      Ambil Tgl dari Kode
                    </Button>
                  </div>
                  <div className="flex items-center">
                    <Popover>
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            variant={"outline"}
                            className={cn(
                              "w-full pl-3 text-left font-normal rounded-r-none",
                              inputClass,
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value ? (
                              format(field.value as Date, "PPP", { locale: id })
                            ) : (
                              <span>Pilih tanggal</span>
                            )}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <Calendar
                          mode="single"
                          captionLayout="dropdown-buttons"
                          fromYear={1960}
                          toYear={new Date().getFullYear() + 5}
                          selected={field.value as Date}
                          onSelect={field.onChange}
                          disabled={(date) =>
                            date > new Date() || date < new Date("1900-01-01")
                          }
                          initialFocus
                        />
                      </PopoverContent>
                    </Popover>
                    {field.value && (
                      <Button
                          size="icon"
                          variant="ghost"
                          className={cn("h-10 w-10 border border-l-0 rounded-l-none", inputClass)}
                          onClick={(e) => {
                              e.preventDefault();
                              field.onChange(null);
                          }}
                          type="button"
                      >
                          <XIcon className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="price" render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga (IDR)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 25000000" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="priceUSD" render={({ field }) => (
                <FormItem>
                  <FormLabel>Harga (USD)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 1500" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="qty" render={({ field }) => (
                <FormItem>
                  <FormLabel>Kuantitas</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 1" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="condition" render={({ field }) => (
                <FormItem>
                    <FormLabel>Kondisi</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                        <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih kondisi aset" />
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
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                        <SelectTrigger className={inputClass}>
                            <SelectValue placeholder="Pilih status aset" />
                        </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                        {assetStatuses.map(s => <SelectItem key={s} value={s}>{s.replace(/_/g, ' ')}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <FormMessage />
                </FormItem>
               )} />
               {watchedStatus === 'waiting_mutasi' && (
                <div className="space-y-2">
                  <Label htmlFor="new-user">Pengguna Baru</Label>
                  <Input 
                    id="new-user"
                    placeholder="Nama pengguna baru" 
                    value={newUser}
                    onChange={(e) => setNewUser(e.target.value)}
                    className={inputClass}
                  />
                </div>
               )}
              <FormField control={form.control} name="brand" render={({ field }) => (
                <FormItem>
                  <FormLabel>Brand</FormLabel>
                  <FormControl><Input placeholder="e.g., Dell" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="user" render={({ field }) => (
                <FormItem>
                  <FormLabel>User</FormLabel>
                  <FormControl><Input placeholder="e.g., Budi" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="supplier" render={({ field }) => (
                <FormItem>
                  <FormLabel>Supplier</FormLabel>
                  <FormControl><Input placeholder="e.g., PT. Supplier" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="prNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor PR</FormLabel>
                  <FormControl><Input placeholder="e.g., PR-123" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="inspectionNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>Nomor Inspeksi</FormLabel>
                  <FormControl><Input placeholder="e.g., INSP-456" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="projectInspectionNumber" render={({ field }) => (
                <FormItem>
                  <FormLabel>No. Insp Proyek</FormLabel>
                  <FormControl><Input placeholder="e.g., PROJ-789" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="projectInspectionDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Insp Proyek</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            inputClass,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1960}
                        toYear={new Date().getFullYear() + 5}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="mutationDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Mutasi</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            inputClass,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1960}
                        toYear={new Date().getFullYear() + 5}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="disposalDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tanggal Disposal</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            inputClass,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1960}
                        toYear={new Date().getFullYear() + 5}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="midSemesterCheckDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tgl Cek Mid Semester</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            inputClass,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1960}
                        toYear={new Date().getFullYear() + 5}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="endSemesterCheckDate" render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Tgl Cek Akhir Semester</FormLabel>
                   <Popover>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant={"outline"}
                          className={cn(
                            "w-full pl-3 text-left font-normal",
                            inputClass,
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value ? (
                            format(field.value, "PPP", { locale: id })
                          ) : (
                            <span>Pilih tanggal</span>
                          )}
                          <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="single"
                        captionLayout="dropdown-buttons"
                        fromYear={1960}
                        toYear={new Date().getFullYear() + 5}
                        selected={field.value}
                        onSelect={field.onChange}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="assetLifetime" render={({ field }) => (
                <FormItem>
                  <FormLabel>Masa Ketahanan Aset (Tahun)</FormLabel>
                  <FormControl><Input type="number" placeholder="e.g., 5" {...field} className={inputClass} /></FormControl>
                  <FormMessage />
                </FormItem>
              )} />
              {isEditMode && user?.role === 'Admin' && (
                <FormField control={form.control} name="transactionCode" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Kode Transaksi (Admin Only)</FormLabel>
                    <FormControl><Input placeholder="e.g., MUT-240101-001" {...field} className={inputClass} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t">
                 <FormField control={form.control} name="accessory1" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kelengkapan 1</FormLabel>
                    <FormControl><Input placeholder="e.g., Charger" {...field} className={inputClass} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="accessory2" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kelengkapan 2</FormLabel>
                    <FormControl><Input placeholder="e.g., Mouse" {...field} className={inputClass} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="accessory3" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kelengkapan 3</FormLabel>
                    <FormControl><Input placeholder="e.g., Keyboard" {...field} className={inputClass} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
                <FormField control={form.control} name="accessory4" render={({ field }) => (
                    <FormItem>
                    <FormLabel>Kelengkapan 4</FormLabel>
                    <FormControl><Input placeholder="e.g., Tas" {...field} className={inputClass} /></FormControl>
                    <FormMessage />
                    </FormItem>
                )} />
            </div>
            
            <div className="space-y-4 pt-4 border-t">
              <FormField control={form.control} name="photoURL" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Foto Aset 1</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl>
                        <Input placeholder="https://example.com/image.jpg" {...field} className={inputClass} />
                    </FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={() => convertImgurLink('photoURL')}>Imgur</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="photoURL2" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Foto Aset 2</FormLabel>
                  <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="https://example.com/image2.jpg" {...field} className={inputClass} /></FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={() => convertImgurLink('photoURL2')}>Imgur</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="photoURL3" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Foto Aset 3</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="https://example.com/image3.jpg" {...field} className={inputClass} /></FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={() => convertImgurLink('photoURL3')}>Imgur</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />
               <FormField control={form.control} name="photoURL4" render={({ field }) => (
                <FormItem>
                  <FormLabel>URL Foto Aset 4</FormLabel>
                   <div className="flex items-center gap-2">
                    <FormControl><Input placeholder="https://example.com/image4.jpg" {...field} className={inputClass} /></FormControl>
                    <Button type="button" variant="outline" size="sm" onClick={() => convertImgurLink('photoURL4')}>Imgur</Button>
                  </div>
                  <FormMessage />
                </FormItem>
              )} />

              <div className="space-y-4 pt-4 border-t border-dashed border-red-500">
                <h3 className="font-semibold text-red-600">Foto Bukti Disposal</h3>
                 <FormField control={form.control} name="disposalPhotoURL1" render={({ field }) => (
                    <FormItem><FormLabel>URL Foto Bukti 1</FormLabel><FormControl><Input placeholder="URL foto bukti disposal..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="disposalPhotoURL2" render={({ field }) => (
                    <FormItem><FormLabel>URL Foto Bukti 2</FormLabel><FormControl><Input placeholder="URL foto bukti disposal..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="disposalPhotoURL3" render={({ field }) => (
                    <FormItem><FormLabel>URL Foto Bukti 3</FormLabel><FormControl><Input placeholder="URL foto bukti disposal..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="disposalPhotoURL4" render={({ field }) => (
                    <FormItem><FormLabel>URL Foto Bukti 4</FormLabel><FormControl><Input placeholder="URL foto bukti disposal..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
              </div>

              <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem>
                  <FormLabel>Catatan / Alasan Mutasi</FormLabel>
                  <FormControl><Textarea placeholder="Catatan tambahan tentang aset..." {...field} className={cn("min-h-[150px] text-base", inputClass)} /></FormControl>
                  <FormMessage />
                  </FormItem>
              )} />
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>
                  Batal
                </Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {buttonText}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ambil Foto Aset</DialogTitle>
            </DialogHeader>
            <div className="relative mb-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md" />
                <canvas ref={canvasRef} className="hidden" />
            </div>
             {previewUrl && (
                <div className="flex items-center justify-center gap-2 p-2 border rounded-md bg-muted">
                    <Image src={previewUrl} alt="Preview" width={60} height={60} className="rounded-md object-cover" />
                    <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                </div>
            )}
            <DialogFooter>
                 <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>Tutup</Button>
                <Button onClick={handleCaptureAndUpload} disabled={isUploading}>
                    {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    Ambil & Upload
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
