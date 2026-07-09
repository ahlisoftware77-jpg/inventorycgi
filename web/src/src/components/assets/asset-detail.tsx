

'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { doc, onSnapshot, Timestamp, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus, type AssetCondition, type ComputerAsset } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { ArrowLeft, Edit, Printer, Trash2, Repeat, Loader2, CalendarIcon, Wrench, ExternalLink, QrCode, CreditCard, Ticket, Laptop, FileImage, UploadCloud, Camera, PlusCircle, MoreVertical } from 'lucide-react';
import Image from 'next/image';
import { format, formatDistance, differenceInDays, addYears, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import AssetForm from './asset-form';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import GenerateQrCodeDialog from './generate-qrcode-dialog';
import PrintBarcodeDialog from './print-barcode-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';


interface AssetDetailProps {
  assetId: string;
  isEmbedded?: boolean;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div className="flex flex-col space-y-0.5">
    <p className="text-xs font-medium text-primary">{label}</p>
    <div className="text-sm font-semibold">{value || '-'}</div>
  </div>
);

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';
const assetLocations = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'LANTAI 2', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING', 'MIXER', 'OFFICE', 'POS SECURITY', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'TINTA'];
const assetConditions: AssetCondition[] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];


export default function AssetDetail({ assetId, isEmbedded = false }: AssetDetailProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [itAssetLink, setItAssetLink] = useState<{ id: string; name: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [disposalQuantity, setDisposalQuantity] = useState(1);
  const [disposalCondition, setDisposalCondition] = useState<AssetCondition | ''>('');
  const [isDisposalLoading, setIsDisposalLoading] = useState(false);
  
  const [isMutationDialogOpen, setIsMutationDialogOpen] = useState(false);
  const [isMutationLoading, setIsMutationLoading] = useState(false);
  const [mutationDate, setMutationDate] = useState<Date | undefined>(new Date());
  const [mutationLocation, setMutationLocation] = useState('');
  const [mutationNewUser, setMutationNewUser] = useState('');
  const [mutationReason, setMutationReason] = useState('');
  const [mutationQuantity, setMutationQuantity] = useState(1);

  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  const [newCondition, setNewCondition] = useState<AssetCondition | ''>('');
  const [conditionChangeReason, setConditionChangeReason] = useState('');
  const [isConditionChangeLoading, setIsConditionChangeLoading] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);


  const [initialStatus, setInitialStatus] = useState<AssetStatus | undefined>(undefined);
  const cardRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);
  const [isDisposalPhotoLightboxOpen, setIsDisposalPhotoLightboxOpen] = useState(false);

  const backUrl = useMemo(() => {
    const from = searchParams.get('from');
    if (from === '/mutations') {
      return '/mutations';
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('from'); // Clean up the 'from' param
    return `/assets?${params.toString()}`;
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'assets', assetId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const assetData = { id: docSnap.id, ...docSnap.data() } as Asset;
        setAsset(assetData);
        setMutationLocation(assetData.location); // Set default location
        setMutationQuantity(assetData.qty); // Set default quantity
        setDisposalQuantity(assetData.qty); // Set default disposal qty
        setDisposalCondition(assetData.condition); // Set default disposal condition
        setNewCondition(assetData.condition); // Set default condition
        setActiveImage(assetData.photoURL || null);
        setError(null);
        
        // Find matching IT asset
        if (assetData.code) {
          const itAssetsQuery = query(collection(db, 'it_assets'), where('assetCode', '==', assetData.code));
          const itAssetsSnapshot = await getDocs(itAssetsQuery);
          if (!itAssetsSnapshot.empty) {
            const itAssetDoc = itAssetsSnapshot.docs[0];
            const itAssetData = itAssetDoc.data() as ComputerAsset;
            setItAssetLink({ id: itAssetDoc.id, name: itAssetData.computerName });
          } else {
            setItAssetLink(null);
          }
        } else {
            setItAssetLink(null);
        }

      } else {
        setError('Aset tidak ditemukan.');
        setAsset(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching asset details:", err);
      setError('Gagal memuat detail aset.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [assetId]);
  
  const openFormRegular = () => {
    setInitialStatus(undefined); // No initial status
    setIsFormOpen(true);
  }

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };
  
  const handleFileUpload = async (fileToUpload: File): Promise<string | undefined> => {
    if (!fileToUpload) return undefined;

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
        toast({ title: 'Upload Berhasil' });
        return data.secure_url;
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };
  
  const handlePhotoUpload = async () => {
    if (!selectedFile || !asset) return;

    const photoURL = await handleFileUpload(selectedFile);
    if (!photoURL) return;

    try {
        const assetRef = doc(db, "assets", asset.id);
        
        const currentAssetSnap = await getDoc(assetRef);
        const currentAssetData = currentAssetSnap.data() as Asset;

        const photoFields: ('photoURL' | 'photoURL2' | 'photoURL3' | 'photoURL4')[] = ['photoURL', 'photoURL2', 'photoURL3', 'photoURL4'];
        let fieldToUpdate: string | null = null;
        for (const field of photoFields) {
            if (!currentAssetData[field]) {
                fieldToUpdate = field;
                break;
            }
        }
        
        if (!fieldToUpdate) {
            fieldToUpdate = 'photoURL';
        }

        await updateDoc(assetRef, {
            [fieldToUpdate]: photoURL
        });
        
        toast({ title: "Foto berhasil ditambahkan", description: `Foto baru telah disimpan untuk aset ${asset.name}.` });
        setIsCameraOpen(false);
        setSelectedFile(null);
        setPreviewUrl(null);
    } catch (error) {
        console.error("Error saving photo URL to asset:", error);
        toast({ variant: "destructive", title: "Gagal Menyimpan Foto", description: "Terjadi kesalahan saat menyimpan URL foto." });
    }
};

  
  const handleDisposalRequest = async () => {
    if (!user || !asset) return;

     if (disposalQuantity <= 0 || disposalQuantity > asset.qty) {
       toast({
        variant: 'destructive',
        title: 'Jumlah Tidak Valid',
        description: `Jumlah disposal harus antara 1 dan ${asset.qty}.`,
      });
      return;
    }

    if (!disposalCondition) {
      toast({
        variant: 'destructive',
        title: 'Kondisi Belum Dipilih',
        description: 'Silakan pilih kondisi aset sebelum mengajukan disposal.',
      });
      return;
    }

    setIsDisposalLoading(true);
    try {
      const photoURL = selectedFile ? await handleFileUpload(selectedFile) : undefined;
      const assetRef = doc(db, 'assets', asset.id);
      
      const updateData: { [key: string]: any } = {
        status: 'waiting_disposal',
        condition: disposalCondition, // Update condition on submission
        requestedBy: user.uid,
        requestedAt: serverTimestamp(),
      };
      
      let disposalNote = `Diajukan untuk disposal sebanyak ${disposalQuantity} unit. Kondisi saat pengajuan: ${disposalCondition}.`;
      const currentNotes = asset.notes || '';
      updateData.notes = currentNotes ? `${currentNotes}\n\n--- DISPOSAL DIAJUKAN ---\n${disposalNote}` : `--- DISPOSAL DIAJUKAN ---\n${disposalNote}`;

      if (photoURL) {
        const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
        let fieldToUpdate: string | null = null;
        for (const field of photoFields) {
          if (!asset[field]) {
            fieldToUpdate = field;
            break;
          }
        }
        if (fieldToUpdate) {
            updateData[fieldToUpdate] = photoURL;
        } else {
            updateData.disposalPhotoURL1 = photoURL;
        }
      }

      await updateDoc(assetRef, updateData);

      toast({
        title: 'Pengajuan Terkirim',
        description: `Aset "${asset.name}" telah diajukan untuk disposal sebanyak ${disposalQuantity} unit dan menunggu persetujuan.`,
      });
      setIsDisposalDialogOpen(false);
    } catch (error) {
      console.error('Error requesting disposal:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengajukan',
        description: 'Terjadi kesalahan saat mengajukan disposal.',
      });
    } finally {
      setIsDisposalLoading(false);
      setSelectedFile(null);
      setPreviewUrl(null);
    }
  };

  const handleMutationRequest = async () => {
    if (!user || !asset) return;
    if (!mutationDate || !mutationLocation || !mutationReason) {
      toast({
        variant: 'destructive',
        title: 'Data Tidak Lengkap',
        description: 'Mohon isi tanggal, lokasi baru, dan alasan mutasi.',
      });
      return;
    }
    
    if (mutationQuantity <= 0 || mutationQuantity > asset.qty) {
       toast({
        variant: 'destructive',
        title: 'Jumlah Tidak Valid',
        description: `Jumlah mutasi harus antara 1 dan ${asset.qty}.`,
      });
      return;
    }


    setIsMutationLoading(true);
    try {
      const assetRef = doc(db, 'assets', asset.id);
      const mutationDetails = `
--- MUTASI DIAJUKAN ---
Tanggal Rencana: ${format(mutationDate, 'd MMM yyyy', { locale: id })}
Lokasi Baru: ${mutationLocation}
Pengguna Baru: ${mutationNewUser || '(tidak ada)'}
Jumlah: ${mutationQuantity}
Alasan: ${mutationReason}
Diajukan oleh: ${user.displayName || user.email} pada ${format(new Date(), 'd MMM yyyy HH:mm', { locale: id })}
      `.trim();
      
      const newNotes = `${asset.notes || ''}\n\n${mutationDetails}`;

      await updateDoc(assetRef, {
        status: 'waiting_mutasi',
        requestedBy: user.uid,
        requestedAt: serverTimestamp(),
        mutationTargetDepartment: mutationLocation, // Add target department
        notes: newNotes,
      });

      toast({
        title: 'Pengajuan Terkirim',
        description: `Aset "${asset.name}" telah diajukan untuk mutasi dan menunggu persetujuan.`,
      });
      setIsMutationDialogOpen(false);
      // Reset form
      setMutationDate(new Date());
      setMutationLocation(asset.location);
      setMutationNewUser('');
      setMutationReason('');
      setMutationQuantity(asset.qty);
    } catch (error) {
      console.error('Error requesting mutation:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengajukan',
        description: 'Terjadi kesalahan saat mengajukan mutasi.',
      });
    } finally {
      setIsMutationLoading(false);
    }
  };

  const handleConditionChangeRequest = async () => {
    if (!user || !asset || !newCondition || !conditionChangeReason) {
        toast({
            variant: 'destructive',
            title: 'Data Tidak Lengkap',
            description: 'Mohon pilih kondisi baru dan isi alasan perubahan.',
        });
        return;
    }

    if (newCondition === asset.condition) {
        toast({
            variant: 'destructive',
            title: 'Tidak Ada Perubahan',
            description: 'Kondisi baru tidak boleh sama dengan kondisi saat ini.',
        });
        return;
    }

    setIsConditionChangeLoading(true);

    try {
        const assetRef = doc(db, 'assets', asset.id);
        const conditionChangeDetails = `
--- PERUBAHAN KONDISI DIAJUKAN ---
Kondisi Baru: ${newCondition}
Alasan: ${conditionChangeReason}
Diajukan oleh: ${user.displayName || user.email} pada ${format(new Date(), 'd MMM yyyy HH:mm', { locale: id })}
        `.trim();

        const newNotes = `${asset.notes || ''}\n\n${conditionChangeDetails}`;
        const canDirectlyChange = user.role === 'Admin';

        if (canDirectlyChange) {
            await updateDoc(assetRef, {
                condition: newCondition,
                notes: newNotes,
                updatedAt: serverTimestamp(),
            });
            toast({ title: 'Berhasil', description: 'Kondisi aset berhasil diperbarui.' });
        } else {
            await updateDoc(assetRef, {
                status: 'waiting_edit',
                requestedBy: user.uid,
                requestedAt: serverTimestamp(),
                notes: newNotes,
            });
            toast({
                title: 'Pengajuan Terkirim',
                description: 'Perubahan kondisi aset telah dikirim dan menunggu persetujuan.',
            });
        }
        
        setIsConditionDialogOpen(false);
        setConditionChangeReason('');

    } catch (serverError: any) {
        toast({
            variant: 'destructive',
            title: 'Gagal',
            description: serverError.message || 'Terjadi kesalahan saat memproses permintaan.',
        });
    } finally {
        setIsConditionChangeLoading(false);
    }
  };


  const formatDate = (timestamp: Timestamp | undefined | null, formatStr: string = "d MMMM yyyy") => {
    if (!timestamp) return ('-');
    try {
      return format(timestamp.toDate(), formatStr, { locale: id });
    } catch (e) {
      return '-';
    }
  };

  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };
  
  const getStatusVariant = (status: Asset['status'] | undefined) => {
    switch (status) {
      case 'Aktif': return 'default';
      case 'Dipinjam': return 'secondary';
      case 'Rusak': return 'destructive';
      case 'Perlu Diperbaiki': return 'destructive';
      default: return 'outline';
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
          toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Tidak bisa mengakses kamera.' });
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
        
        canvas.toBlob(async (blob) => {
            if (blob) {
                const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                setSelectedFile(capturedFile);
                setPreviewUrl(URL.createObjectURL(capturedFile));
                await handlePhotoUpload();
            }
        }, 'image/jpeg');
    }
  };

  const handlePrint = () => {
    if (!asset) return;

    const printWindow = window.open('', '', 'width=815,height=528'); // approx 8.5in x 5.5in in pixels
    if (printWindow) {
        const today = new Date();
        const createdAtDate = asset.createdAt ? asset.createdAt.toDate() : today;
        const tglInput = createdAtDate.getDate();
        const bulanInput = createdAtDate.getMonth() + 1;
        const tahunInput = createdAtDate.getFullYear();
        
        const purchaseDate = asset.purchaseDate ? formatDate(asset.purchaseDate, 'dd-MM-yyyy') : '';
        const inspProyekDate = asset.projectInspectionDate ? formatDate(asset.projectInspectionDate, 'dd-MM-yyyy') : '';

        // Conditional price formatting
        const formattedPrice = (asset.priceUSD ?? 0) > 0 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.priceUSD!)
          : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);

        const content = `
            <!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Form FIX ASSET - ${asset.code}</title>
<style>
  @media print {
    @page {
      size: 215.9mm 139.7mm;
      margin: 2mm;
    }
    body {
      margin: 0;
      padding: 0;
      -webkit-print-color-adjust: exact;
    }
    .page {
      border: none !important;
      page-break-after: always;
    }
  }
  body {
    font-family: 'BiauKai', Arial, sans-serif;
    margin: 0;
    padding: 0;
  }
  .page {
    width: 215.9mm;
    height: 139.7mm;
    margin: auto;
    padding: 8mm;
    box-sizing: border-box;
    border: 1px solid #000;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    table-layout: fixed;
  }
  td {
    border: 1px solid #000;
    vertical-align: middle;
    font-size: 11px;
    padding: 2px 4px;
    text-align: center;
    height: 15px;
  }
  .title { text-align: center; font-weight: bold; font-size: 16px; }
  .subtitle { text-align: center; font-size: 12px; }
  .formtitle { text-align: center; font-weight: bold; font-size: 14px; }
  .input { 
    text-align: center; 
    font-size: 11px; 
    vertical-align: middle; 
    font-weight: bold;
  }
  .spec { height: 15mm; }
  .no-border td { border: none !important; }
  .label-cell {
    border: none;
    text-align: left;
    vertical-align: bottom;
  }
</style>
</head>
<body>
<div class="page">
  <!-- Header -->
  <table class="no-border" style="width:100%; margin-bottom:4px;">
    <tr>
      <td class="title" style="font-weight:bold; font-size:16px;">PT. CHINA GLAZE INDONESIA</td>
    </tr>
    <tr>
      <td style="text-align:center; font-size:12px;">
        不動產、廠房及設備保管卡 <span style="font-weight:bold; font-size:14px;">FORM FIX ASSET</span>
      </td>
    </tr>
  </table>
  <!-- Main Table -->
  <table>
    <!-- Baris 1 -->
    <tr class="no-border">
      <td class="label-cell">財產類別<br>Item Fix Asset</td>
      <td colspan="2" class="input" style="font-weight: normal; text-align:left; padding-left: 5px;">${asset.category || ''}</td>
      <td class="label-cell">建卡日期<br>Tgl Input</td>
      <td class="label-cell" style="font-weight:bold;">日 Tgl: ${tglInput}</td>
      <td class="label-cell" style="font-weight:bold;">月 Bln: ${bulanInput}</td>
      <td class="label-cell" style="font-weight:bold;">年 Thn: ${tahunInput}</td>
      <td colspan="2" class="input" style="border-bottom: none !important; font-size:10px; vertical-align: bottom;">
        □ 正本 / Asli &nbsp;&nbsp; □ 副本 / Copy <br>
        □ 列帳 / FixA &nbsp;&nbsp; □ 列管 / FixB
      </td>
    </tr>
    <!-- Baris 2 -->
    <tr>
      <td>財產編號<br><br>No. Fix Asset</td>
      <td class="input" style="font-size: 10px;">${asset.code || ''}</td>
      <td>財產名稱<br><br>Nama Barang</td>
      <td colspan="2" class="input">${asset.name || ''}</td>
      <td>單位<br><br>Satuan</td>
      <td class="input">${asset.qty ? `${asset.qty} Unit` : ''}</td>
      <td>耐用年限<br><br>Ketahanan</td>
      <td class="input">${asset.assetLifetime ? `${asset.assetLifetime} Tahun` : ''}</td>
    </tr>
    <!-- Baris 3,4,5 (Spec Barang gabungan) -->
    <tr>
      <td rowspan="3">規格<br><br>Spec Barang</td>
      <td rowspan="3" colspan="3" class="input" style="text-align: center; vertical-align: middle;">${asset.name || ''}</td>
      <td colspan="5">憑單編號 No. Dokument</td>
    </tr>
    <tr>
      <td>工程單號<br><br><span style="font-size:10px;">No.Insp Proyek</span></td>
      <td class="input">${asset.projectInspectionNumber || ''}</td>
      <td>工程驗收單<br><br><span style="font-size:9px;">Tgl Insp Proyek</span></td>
      <td colspan="2" class="input">${inspProyekDate}</td>
    </tr>
    <tr>
      <td>請購單號<br><br><span style="font-size:10px;">No.PR</span></td>
      <td class="input">${asset.prNumber || ''}</td>
      <td>物料驗收單<br><br><span style="font-size:10px;">No.Insp</span></td>
      <td colspan="2" class="input">${asset.inspectionNumber || ''}</td>
    </tr>
    <!-- Baris 6 -->
    <tr>
      <td>購入金額<br><br>Harga Barang</td>
      <td class="input">${formattedPrice}</td>
      <td>購入日期<br><br>Tgl Diterima</td>
      <td class="input">${purchaseDate}</td>
      <td>供應商<br><br>Supplier</td>
      <td class="input" style="font-size: 8px;">${asset.supplier || ''}</td>
      <td>存放地點<br><br>Ditempatkan</td>
      <td colspan="2" class="input">${asset.location || ''}</td>
    </tr>
    <!-- New Row -->
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">附屬設備</td>
      <td colspan="4" class="input">${asset.accessory1 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <!-- Baris 7 -->
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Kelengkapan</td>
      <td colspan="4" class="input">${asset.accessory2 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <!-- Baris 8 -->
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Barang</td>
      <td colspan="4" class="input">${asset.accessory3 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <!-- Baris 9 -->
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Lainnya</td>
      <td colspan="4" class="input">${asset.accessory4 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <!-- Baris 10 -->
    <tr>
      <td>主管<br><br>Atasan</td>
      <td colspan="2" class="input"></td>
      <td>保管人<br><br>Yg Merawat</td>
      <td class="input"></td>
      <td>主管<br><br>Atasan</td>
      <td class="input"></td>
      <td>建卡人<br><br>Dibuat</td>
      <td class="input"></td>
    </tr>
  </table>
  <div style="display: flex; justify-content: space-between; align-items: center; font-size:10px; margin-top:2mm;">
    <span style="font-weight: bold;">Kode Transaksi: ${asset.transactionCode || ''}</span>
    <span>表號:0-32-024</span>
  </div>
</div>
</body>
</html>
          `;

      printWindow.document.write(content);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const imageLoader = ({ src }: { src: string }) => {
    if (src.includes('drive.google.com/file/d/')) {
        const fileId = src.split('/d/')[1].split('/')[0];
        return `https://drive.google.com/uc?export=view&id=${fileId}`;
    }
    if (src.includes('drive.google.com/uc?export=view&id=')) {
        return src;
    }
    if (src.includes('photos.app.goo.gl')) {
        return src.replace('photos.app.goo.gl', 'photos.google.com/share') + '/direct';
    }
    return src;
  };

  const disposalPhotos = useMemo(() => {
    if (!asset) return [];
    return [
      asset.disposalPhotoURL1,
      asset.disposalPhotoURL2,
      asset.disposalPhotoURL3,
      asset.disposalPhotoURL4,
    ].filter((url): url is string => !!url);
  }, [asset]);

  const allImages = useMemo(() => {
    if (!asset) return [];
    return [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter((url): url is string => !!url);
  }, [asset]);
  
  useEffect(() => {
    if (isLightboxOpen && carouselApi && activeImage) {
      const activeImageIndex = allImages.findIndex(img => img === activeImage);
      if (activeImageIndex !== -1) {
        carouselApi.scrollTo(activeImageIndex, true);
      }
    }
  }, [isLightboxOpen, carouselApi, activeImage, allImages]);

  const openDisposalDialog = () => {
    setDisposalCondition('Rusak');
    setIsDisposalDialogOpen(true);
  };
  
  const calculateAssetAge = (purchaseDate: Timestamp | null | undefined) => {
    if (!purchaseDate) return null;
    return formatDistanceToNowStrict(purchaseDate.toDate(), { locale: id, unit: 'year' });
  };
  
  const getRemainingLifetime = (asset: Asset | null) => {
    if (!asset?.purchaseDate || typeof asset.assetLifetime !== 'number' || asset.assetLifetime <= 0) {
        return {
            expiryDate: null,
            remainingString: null,
            badgeVariant: 'secondary' as const,
        };
    }

    const purchaseDate = asset.purchaseDate.toDate();
    const expiryDate = addYears(purchaseDate, asset.assetLifetime);
    const today = new Date();
    const remainingDays = differenceInDays(expiryDate, today);
    
    let badgeVariant: 'destructive' | 'secondary' | 'default' = 'default';
    if (remainingDays <= 0) {
        badgeVariant = 'destructive';
    } else if (remainingDays <= 365) {
        badgeVariant = 'secondary';
    }

    const remainingString = remainingDays > 0 
        ? formatDistance(expiryDate, today, { addSuffix: false, locale: id })
        : 'Habis';

    return {
        expiryDate,
        remainingString,
        badgeVariant,
    };
  }

  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Card>
          <CardHeader>
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid md:grid-cols-2 gap-6">
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </div>
            <Skeleton className="h-48 w-full" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center text-destructive">
        <p>{error}</p>
        {!isEmbedded && (
            <Button asChild variant="link" className="mt-4">
                <Link href="/assets">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Aset
                </Link>
            </Button>
        )}
      </div>
    );
  }

  if (!asset) {
    return null; // Should not happen if error is handled
  }

  const canEdit = user?.role === 'Admin';
  const canManage = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Section Head' || user?.role === 'Karyawan';
  const isWaiting = asset.status.startsWith('waiting_');
  
  const assetAge = calculateAssetAge(asset.purchaseDate);
  const lifetimeInfo = getRemainingLifetime(asset);
  
  return (
    <>
      {!isEmbedded && (
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <Button asChild size="sm" className="bg-gray-800 text-white hover:bg-gray-700">
            <Link href={backUrl}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali
            </Link>
            </Button>
        </div>
      )}
      <Card ref={cardRef} className="relative w-full mx-auto shadow-lg animate-in fade-in-50 duration-300 overflow-hidden">
        {asset.status === 'approved_disposal' && (
            <div className="absolute top-8 right-8 z-10">
                <div className="pointer-events-none select-none flex items-center justify-center border-4 border-red-600 text-red-600 opacity-70 rounded-md w-48 h-16 transform rotate-12">
                    <span className="text-3xl font-bold tracking-wider">DISPOSAL</span>
                </div>
            </div>
        )}
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-xl md:text-2xl font-bold">{asset.name}</CardTitle>
              <div className="flex items-center gap-2">
                <CardDescription className="text-sm text-muted-foreground">{asset.code}</CardDescription>
                {itAssetLink && (
                  <Link href={`/computer-details/${itAssetLink.id}`} className="flex items-center gap-1 text-xs text-blue-600 hover:underline">
                    <Laptop className="h-3 w-3" />
                    ({itAssetLink.name})
                  </Link>
                )}
              </div>
            </div>
            <Badge variant={getStatusVariant(asset.status)} className="mt-2 sm:mt-0 text-sm">{asset.status.replace(/_/g, ' ')}</Badge>
          </div>
           <div className="flex flex-wrap items-center gap-2 pt-4">
               <Button size="sm" onClick={() => setIsMutationDialogOpen(true)} className="bg-blue-600 hover:bg-blue-700 text-white" disabled={isWaiting}>
                  <Repeat className="mr-2 h-3 w-3" />
                  Mutasi
              </Button>
              <Button size="sm" variant="destructive" onClick={openDisposalDialog} disabled={isWaiting}>
                  <Trash2 className="mr-2 h-3 w-3" />
                  Disposal
              </Button>
               {canEdit && (
                <Button size="sm" onClick={openFormRegular} variant="secondary">
                    <Edit className="mr-2 h-3 w-3" />
                    Edit
                </Button>
              )}
               <DropdownMenu>
                <DropdownMenuTrigger asChild>
                    <Button variant="outline" size="sm">
                        <MoreVertical className="mr-2 h-3 w-3" />
                        Aksi Lainnya
                    </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Opsi Cetak & Lainnya</DropdownMenuLabel>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={() => router.push(`/assets/${assetId}/preview`)}>
                        <CreditCard className="mr-2 h-3 w-3" />
                        <span>Preview Kartu</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={handlePrint}>
                        <Printer className="mr-2 h-3 w-3" />
                        <span>Cetak Form FixAset</span>
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => router.push(`/thermal-print-58?assetId=${asset.id}`)}>
                        <Printer className="mr-2 h-3 w-3" />
                        <span>Cetak Label Thermal</span>
                    </DropdownMenuItem>
                    <GenerateQrCodeDialog selectedAssets={asset ? [asset] : []}>
                        <DropdownMenuItem onSelect={(e) => e.preventDefault()}>
                            <QrCode className="mr-2 h-3 w-3" />
                            <span>Generate QR Code</span>
                        </DropdownMenuItem>
                    </GenerateQrCodeDialog>
                    {canManage && (
                         <DropdownMenuItem onSelect={() => setIsConditionDialogOpen(true)} disabled={isWaiting}>
                            <Wrench className="mr-2 h-3 w-3" />
                            <span>Ubah Kondisi</span>
                        </DropdownMenuItem>
                    )}
                </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="mt-4 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-x-6 gap-y-5">
            <DetailItem label="Kategori" value={asset.category} />
            <DetailItem label="Lokasi" value={asset.location} />
            <DetailItem label="Pusat Biaya" value={asset.costCenter} />
            <DetailItem label="Tanggal Pembelian" value={formatDate(asset.purchaseDate)} />
            <DetailItem label="Harga (IDR)" value={formatCurrency(asset.price)} />
            <DetailItem label="Harga (USD)" value={asset.priceUSD ? `$${asset.priceUSD.toLocaleString()}` : '-'} />
            <DetailItem label="Kuantitas" value={asset.qty} />
            <DetailItem label="Kondisi" value={asset.condition} />
            <DetailItem label="Brand" value={asset.brand} />
            <DetailItem label="User" value={asset.user} />
            <DetailItem label="Supplier" value={asset.supplier} />
            <DetailItem label="Nomor PR" value={asset.prNumber} />
            <DetailItem label="Masa Ketahanan" value={asset.assetLifetime ? `${asset.assetLifetime} tahun` : '-'} />
            <DetailItem label="Masa Pakai" value={assetAge || '-'} />
            <DetailItem label="Tanggal Habis" value={lifetimeInfo.expiryDate ? formatDate(lifetimeInfo.expiryDate) : '-'} />
            <DetailItem label="Sisa Umur" value={lifetimeInfo.remainingString ? <Badge variant={lifetimeInfo.badgeVariant}>{lifetimeInfo.remainingString}</Badge> : '-'} />

            {asset.status === 'approved_mutasi' && (
              <DetailItem label="Tanggal Mutasi" value={formatDate(asset.approvedAt)} />
            )}
            {asset.status === 'approved_disposal' && (
              <DetailItem label="Tanggal Disposal" value={formatDate(asset.approvedAt)} />
            )}
            {asset.status === 'approved_edit' && (
              <DetailItem label="Tanggal Edit" value={formatDate(asset.approvedAt)} />
            )}
          </div>
          
          <div className="pt-4 border-t">
              <h3 className="text-base font-semibold mb-2">Kelengkapan</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-x-6 gap-y-4">
                <DetailItem label="Kelengkapan 1" value={asset.accessory1} />
                <DetailItem label="Kelengkapan 2" value={asset.accessory2} />
                <DetailItem label="Kelengkapan 3" value={asset.accessory3} />
                <DetailItem label="Kelengkapan 4" value={asset.accessory4} />
              </div>
          </div>

          <div className="grid md:grid-cols-3 gap-6 pt-4 border-t">
            <div className="space-y-4">
                <div className="flex items-center gap-4">
                    <h3 className="text-base font-semibold">Galeri Foto Aset</h3>
                    {canManage && (
                        <Button size="sm" variant="outline" onClick={() => setIsCameraOpen(true)}>
                            <PlusCircle className="mr-2 h-4 w-4" /> Tambah
                        </Button>
                    )}
                </div>
                {activeImage ? (
                    <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
                        <DialogTrigger asChild>
                            <div className="relative group cursor-pointer">
                                <Image
                                    loader={imageLoader}
                                    src={activeImage}
                                    alt={`Foto ${asset.name}`}
                                    width={150}
                                    height={150}
                                    className="rounded-lg object-contain aspect-square border transition-all duration-300"
                                />
                            </div>
                        </DialogTrigger>
                         <DialogContent className="h-[90vh] bg-transparent border-none shadow-none flex flex-col items-center justify-center p-0">
                             <DialogHeader className="sr-only">
                                <DialogTitle>Galeri Gambar: {asset.name}</DialogTitle>
                                <DialogDescription>Melihat semua gambar untuk aset {asset.name}.</DialogDescription>
                            </DialogHeader>
                            <Carousel setApi={setCarouselApi} className="w-full h-full">
                                <CarouselContent className="h-full">
                                    {allImages.map((img, idx) => (
                                        <CarouselItem key={idx} className="relative h-full flex items-center justify-center">
                                            <Image
                                                loader={imageLoader}
                                                src={img}
                                                alt={`Galeri ${asset.name} ${idx + 1}`}
                                                width={800}
                                                height={800}
                                                className="object-contain max-w-full max-h-full"
                                            />
                                        </CarouselItem>
                                    ))}
                                </CarouselContent>
                                {allImages.length > 1 && (
                                    <>
                                        <CarouselPrevious className="absolute left-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 hover:text-white" />
                                        <CarouselNext className="absolute right-2 top-1/2 -translate-y-1/2 text-white bg-black/50 hover:bg-black/80 hover:text-white" />
                                    </>
                                )}
                            </Carousel>
                        </DialogContent>
                    </Dialog>
                ) : (
                    <div className="w-full aspect-square bg-muted rounded-lg flex items-center justify-center">
                        <p className="text-muted-foreground text-xs">Tidak ada foto</p>
                    </div>
                )}
                {allImages.length > 1 && (
                  <div className="flex gap-2 mt-2">
                    {allImages.map((img, idx) => (
                      <div key={idx} className="relative cursor-pointer" onClick={() => setActiveImage(img)}>
                        <Image
                          loader={imageLoader}
                          src={img}
                          alt={`Thumbnail ${idx + 1}`}
                          width={150}
                          height={150}
                          className={cn(
                            "rounded-md object-cover aspect-square border-2",
                            activeImage === img ? "border-primary" : "border-transparent"
                          )}
                        />
                      </div>
                    ))}
                  </div>
                )}
                {disposalPhotos.length > 0 && (
                  <div className="mt-4">
                      <h3 className="text-base font-semibold text-red-600">Foto Bukti Disposal</h3>
                      <Dialog open={isDisposalPhotoLightboxOpen} onOpenChange={setIsDisposalPhotoLightboxOpen}>
                        <DialogTrigger asChild>
                           <div className="flex flex-wrap gap-2 mt-2 cursor-pointer">
                              {disposalPhotos.map((photoUrl, index) => (
                                  <Image
                                      key={index}
                                      src={photoUrl}
                                      alt={`Foto bukti disposal ${index + 1}`}
                                      width={80}
                                      height={80}
                                      className="rounded-md object-cover border-2 border-red-500"
                                  />
                              ))}
                          </div>
                        </DialogTrigger>
                        <DialogContent className="h-auto bg-transparent border-none shadow-none flex items-center justify-center">
                             <DialogHeader className="sr-only">
                                <DialogTitle>Foto Bukti Disposal: {asset.name}</DialogTitle>
                                <DialogDescription>Melihat foto bukti disposal untuk aset {asset.name}.</DialogDescription>
                            </DialogHeader>
                            <Image src={disposalPhotos[0]} alt="Foto bukti disposal" width={800} height={800} className="object-contain max-w-[80vw] max-h-[80vh]" />
                        </DialogContent>
                      </Dialog>
                  </div>
                )}
            </div>
            <div className="space-y-4">
                <h3 className="text-base font-semibold">Catatan</h3>
                <p className="text-muted-foreground mt-1 text-sm leading-relaxed whitespace-pre-wrap">
                    {asset.notes || 'Tidak ada catatan.'}
                </p>
            </div>
            <div className="space-y-4">
                <h3 className="text-base font-semibold">Info Dokumen</h3>
                <div className="mt-2 space-y-3">
                    <DetailItem label="No. Inspeksi" value={asset.inspectionNumber} />
                    <DetailItem label="No. Inspeksi Proyek" value={asset.projectInspectionNumber} />
                    <DetailItem label="Tgl Inspeksi Proyek" value={formatDate(asset.projectInspectionDate)} />
                </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <AssetForm 
        asset={asset} 
        isOpen={isFormOpen} 
        onOpenChange={setIsFormOpen} 
        initialStatus={initialStatus}
      />

       <Dialog open={isDisposalDialogOpen} onOpenChange={setIsDisposalDialogOpen}>
        <DialogContent className="bg-slate-900 text-slate-50">
            <DialogHeader>
                <DialogTitle>Ajukan Disposal Aset</DialogTitle>
                <DialogDescription>
                    Masukkan jumlah, pilih kondisi, dan lampirkan foto bukti untuk aset <span className="font-bold">"{asset.name}"</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="disposal-qty" className="text-right">Jumlah</Label>
                    <Input
                      id="disposal-qty"
                      type="number"
                      value={disposalQuantity}
                      onChange={(e) => setDisposalQuantity(Number(e.target.value))}
                      min={1}
                      max={asset.qty}
                      className="col-span-3 bg-slate-800"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="disposal-condition" className="text-right">Kondisi</Label>
                     <Select onValueChange={(v) => setDisposalCondition(v as AssetCondition)} value={disposalCondition}>
                        <SelectTrigger className="col-span-3 bg-slate-800">
                            <SelectValue placeholder="Pilih kondisi aset" />
                        </SelectTrigger>
                        <SelectContent>
                            {assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                 <div className="grid grid-cols-4 items-start gap-4">
                    <Label className="text-right pt-2">Foto Bukti</Label>
                    <div className="col-span-3 space-y-2">
                         <div className="flex items-center gap-2">
                           <Button type="button" size="sm" onClick={() => fileInputRef.current?.click()}><FileImage className="mr-2 h-4 w-4"/>Pilih File</Button>
                           <Button type="button" size="sm" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4"/>Ambil Foto</Button>
                           <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                        {previewUrl && (
                          <div className="flex items-center gap-2 p-2 border rounded-md bg-slate-800">
                            <Image src={previewUrl} alt="Preview" width={48} height={48} className="rounded-md object-cover" />
                            <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                          </div>
                        )}
                    </div>
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsDisposalDialogOpen(false)}>Batal</Button>
                <Button onClick={handleDisposalRequest} disabled={isDisposalLoading || isUploading} variant="destructive">
                    {(isDisposalLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ya, Ajukan Disposal
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMutationDialogOpen} onOpenChange={setIsMutationDialogOpen}>
        <DialogContent className="bg-slate-900 text-slate-50">
            <DialogHeader>
                <DialogTitle>Ajukan Mutasi Aset</DialogTitle>
                <DialogDescription>
                    Isi detail untuk pengajuan mutasi aset <span className="font-bold">"{asset.name}"</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mutation-qty" className="text-right">Jumlah</Label>
                    <Input
                      id="mutation-qty"
                      type="number"
                      value={mutationQuantity}
                      onChange={(e) => setMutationQuantity(Number(e.target.value))}
                      min={1}
                      max={asset.qty}
                      className="col-span-3 bg-slate-800"
                    />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mutation-date" className="text-right">Tgl Rencana</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button
                                variant={"outline"}
                                className={cn("col-span-3", !mutationDate && "text-muted-foreground")}
                            >
                                {mutationDate ? format(mutationDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                                <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                            <Calendar
                                mode="single"
                                selected={mutationDate}
                                onSelect={setMutationDate}
                                initialFocus
                            />
                        </PopoverContent>
                    </Popover>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mutation-location" className="text-right">Lokasi Baru</Label>
                    <Select onValueChange={setMutationLocation} defaultValue={mutationLocation}>
                        <SelectTrigger className="col-span-3 bg-slate-800">
                            <SelectValue placeholder="Pilih lokasi baru" />
                        </SelectTrigger>
                        <SelectContent>
                            {assetLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mutation-user" className="text-right">Pengguna Baru</Label>
                    <Input id="mutation-user" value={mutationNewUser} onChange={(e) => setMutationNewUser(e.target.value)} className="col-span-3 bg-slate-800" placeholder="(Opsional)" />
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="mutation-reason" className="text-right">Alasan</Label>
                    <Textarea id="mutation-reason" value={mutationReason} onChange={(e) => setMutationReason(e.target.value)} className="col-span-3 bg-slate-800" placeholder="Alasan pemindahan aset..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsMutationDialogOpen(false)}>Batal</Button>
                <Button onClick={handleMutationRequest} disabled={isMutationLoading} className="bg-yellow-700 hover:bg-yellow-800 text-white">
                    {isMutationLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ajukan Mutasi
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConditionDialogOpen} onOpenChange={setIsConditionDialogOpen}>
        <DialogContent className="bg-slate-900 text-slate-50">
            <DialogHeader>
                <DialogTitle>Ubah Kondisi Aset</DialogTitle>
                <DialogDescription>
                    Pilih kondisi baru untuk aset <span className="font-bold">"{asset.name}"</span>.
                </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="new-condition" className="text-right">Kondisi Baru</Label>
                    <Select onValueChange={(v) => setNewCondition(v as AssetCondition)} value={newCondition}>
                        <SelectTrigger className="col-span-3 bg-slate-800">
                            <SelectValue placeholder="Pilih kondisi baru" />
                        </SelectTrigger>
                        <SelectContent>
                            {assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="condition-reason" className="text-right">Alasan</Label>
                    <Textarea id="condition-reason" value={conditionChangeReason} onChange={(e) => setConditionChangeReason(e.target.value)} className="col-span-3 bg-slate-800" placeholder="Alasan perubahan kondisi..." />
                </div>
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => setIsConditionDialogOpen(false)}>Batal</Button>
                <Button onClick={handleConditionChangeRequest} disabled={isConditionChangeLoading}>
                    {isConditionChangeLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {user?.role === 'Admin' ? 'Simpan Perubahan' : 'Ajukan Perubahan'}
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader>
              <DialogTitle>Ambil Foto Bukti</DialogTitle>
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



