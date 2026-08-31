'use client';

import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { doc, onSnapshot, Timestamp, updateDoc, serverTimestamp, addDoc, collection, query, where, getDocs, getDoc, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus, type AssetCondition, type ComputerAsset, type MaintenanceSchedule } from '@/lib/types';
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
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { 
  ArrowLeft, 
  Edit, 
  Printer, 
  Trash2, 
  Repeat, 
  Loader2, 
  Calendar as CalendarIcon, 
  Wrench as WrenchIcon, 
  ExternalLink, 
  QrCode, 
  CreditCard, 
  Ticket, 
  Laptop, 
  FileImage, 
  UploadCloud, 
  Camera, 
  PlusCircle, 
  MoreVertical, 
  ClipboardEdit, 
  ArrowRightLeft, 
  Recycle, 
  Eye, 
  X as XIcon, 
  RotateCcw, 
  CheckCircle2, 
  User as UserIcon, 
  Hash, 
  Tag as TagIcon, 
  Layers as LayersIcon, 
  CircleDollarSign, 
  Info as InfoIcon, 
  ShieldCheck, 
  FileText as FileTextIcon, 
  Clock as ClockIcon, 
  TrendingDown, 
  Building as BuildingIcon, 
  MapPin as MapPinIcon, 
  Activity as ActivityIcon, 
  Zap, 
  Package as PackageIcon,
  History as HistoryIcon,
  ImageIcon,
  Settings2
} from 'lucide-react';
import Image from 'next/image';
import { format, formatDistance, differenceInDays, addYears, formatDistanceToNowStrict, differenceInYears } from 'date-fns';
import { id } from 'date-fns/locale';
import { Badge } from '../ui/badge';
import Link from 'next/link';
import AssetForm from './asset-form';
import { useSearchParams, useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import GenerateQrCodeDialog from './generate-qrcode-dialog';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious, type CarouselApi } from '../ui/carousel';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import AssetCardPreview from './asset-card-preview';
import MaintenanceDetailCard from '@/components/maintenance/maintenance-detail-card';
import QRCode from 'qrcode';
import { calculateDepreciation } from '@/lib/calculations';
import { Progress } from '../ui/progress';

interface AssetDetailProps {
  assetId: string;
  isEmbedded?: boolean;
}

const getDeptColor = (dept: string = '') => {
  const d = dept.toUpperCase();
  if (d.includes('IT')) return { bg: 'bg-blue-600', shadow: 'shadow-[0_10px_0_0_rgba(30,58,138,0.2)]', text: 'text-white', border: 'border-blue-400/20' };
  if (d.includes('HR') || d.includes('GA')) return { bg: 'bg-emerald-600', shadow: 'shadow-[0_10px_0_0_rgba(6,78,59,0.2)]', text: 'text-white', border: 'border-emerald-400/20' };
  if (d.includes('ACCOUNTING')) return { bg: 'bg-amber-500', shadow: 'shadow-[0_10px_0_0_rgba(120,53,15,0.2)]', text: 'text-white', border: 'border-amber-400/20' };
  if (d.includes('MIXER') || d.includes('FRIT') || d.includes('TINTA') || d.includes('PRODUCTION')) return { bg: 'bg-rose-600', shadow: 'shadow-[0_10px_0_0_rgba(159,18,57,0.2)]', text: 'text-white', border: 'border-rose-400/20' };
  if (d.includes('R&D') || d.includes('LAB') || d.includes('QC')) return { bg: 'bg-purple-600', shadow: 'shadow-[0_10px_0_0_rgba(88,28,135,0.2)]', text: 'text-white', border: 'border-purple-400/20' };
  if (d.includes('MANAGEMENT')) return { bg: 'bg-slate-900', shadow: 'shadow-[0_10px_0_0_rgba(0,0,0,0.5)]', text: 'text-white', border: 'border-slate-700' };
  return { bg: 'bg-cyan-600', shadow: 'shadow-[0_10px_0_0_rgba(21,94,117,0.2)]', text: 'text-white', border: 'border-cyan-400/20' };
};

const DetailItem = ({ label, value, icon: Icon, className, dark }: { label: string; value: React.ReactNode, icon?: React.ElementType, className?: string, dark?: boolean }) => (
  <div className={cn(
    "flex flex-col space-y-1 p-3.5 rounded-[1.5rem] border shadow-inner transition-all duration-300 group",
    dark ? "bg-black/20 border-white/10 hover:bg-black/30" : "bg-white dark:bg-slate-900 border-primary/5",
    className
  )}>
    <div className="flex items-center gap-1.5">
      {Icon && <Icon className={cn("w-3 h-3", dark ? "text-white/60" : "text-primary/60")} />}
      <p className={cn("text-[10px] font-black uppercase tracking-widest", dark ? "text-white/80" : "text-slate-900/60 dark:text-slate-100/60")}>{label}</p>
    </div>
    <div className={cn(
        "text-xs sm:text-sm font-black uppercase tracking-tight leading-tight", 
        dark ? "text-white drop-shadow-[0_1px_1px_rgba(0,0,0,0.8)]" : "text-slate-900 dark:text-slate-100"
    )}>
        {value || '-'}
    </div>
  </div>
);

const SectionLabel = ({ title, icon: Icon, dark }: { title: string, icon: React.ElementType, dark?: boolean }) => (
    <div className="col-span-full mt-8 mb-3 first:mt-0 flex items-center gap-3">
        <Icon className={cn("w-3.5 h-3.5", dark ? "text-white/30" : "text-primary/40")} />
        <p className={cn("text-[9px] font-black uppercase tracking-[0.35em]", dark ? "text-white/50" : "text-primary/60")}>{title}</p>
        <div className={cn("h-px flex-1 bg-gradient-to-r", dark ? "from-white/10 to-transparent" : "from-primary/10 to-transparent")} />
    </div>
);

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';
const assetConditions: AssetCondition[] = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

const isoRelevantCategories = [
  'A3-Peralatan Mesin',
  'A4-Peralatan Listrik',
  'A5-Peralatan Transportasi',
  'A6-Peralatan Penelitian & Uji Lab',
  'A9-Peralatan Lain-lain',
  'Kendaraan',
  'Elektronik'
];

export default function AssetDetail({ assetId, isEmbedded = false }: AssetDetailProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [itAssetLink, setItAssetLink] = useState<{ id: string; name: string } | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [isPreviewCardOpen, setIsPreviewCardOpen] = useState(false);
  const [selectedHistorySchedule, setSelectedHistorySchedule] = useState<MaintenanceSchedule | null>(null);
  const [companyName, setCompanyName] = useState('PT. China Glaze Indonesia');
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});
  
  const [isDisposalDialogOpen, setIsDisposalDialogOpen] = useState(false);
  const [disposalQuantity, setDisposalQuantity] = useState(1);
  const [disposalCondition, setDisposalCondition] = useState<AssetCondition | ''>('');
  const [disposalNotes, setDisposalNotes] = useState('');
  const [isDisposalLoading, setIsDisposalLoading] = useState(false);
  
  const [isMutationDialogOpen, setIsMutationDialogOpen] = useState(false);
  const [isMutationLoading, setIsMutationLoading] = useState(false);
  const [mutationDate, setMutationDate] = useState<Date | undefined>(new Date());
  const [mutationLocation, setMutationLocation] = useState('');
  const [mutationNewUser, setMutationNewUser] = useState('');
  const [mutationReason, setMutationReason] = useState('');
  const [mutationQuantity, setMutationQuantity] = useState(1);
  const [assetLocations, setAssetLocations] = useState<string[]>([]);

  const formatDate = (timestamp: Timestamp | undefined | null, formatStr: string = "d MMMM yyyy") => {
    if (!timestamp) return '-';
    try {
      return format(timestamp.toDate(), formatStr, { locale: id });
    } catch (e) {
      return '-';
    }
  };

  const formatCurrency = (value: number | undefined | null, currency: string = 'IDR') => {
    if (value === undefined || value === null || typeof value !== 'number') return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: currency,
      maximumFractionDigits: 0
    }).format(value);
  };

  const [isConditionDialogOpen, setIsConditionDialogOpen] = useState(false);
  const [newCondition, setNewCondition] = useState<AssetCondition | ''>('');
  const [conditionChangeReason, setConditionChangeReason] = useState('');
  const [isConditionChangeLoading, setIsConditionChangeLoading] = useState(false);
  
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [carouselApi, setCarouselApi] = useState<CarouselApi>()
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  const deptStyle = useMemo(() => asset ? getDeptColor(asset.location) : getDeptColor(''), [asset]);

  const backUrl = useMemo(() => {
    const from = searchParams.get('from');
    if (from === '/mutations') {
      return '/mutations';
    }
    const params = new URLSearchParams(searchParams.toString());
    params.delete('from');
    return `/assets?${params.toString()}`;
  }, [searchParams]);

  const depreciation = useMemo(() => {
    if (!asset) return null;
    return calculateDepreciation(asset.price, asset.purchaseDate, asset.assetLifetime, asset.manualDepreciationPercent);
  }, [asset]);

  useEffect(() => {
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            if (data.companyName) setCompanyName(data.companyName);
            if (data.departments) setAssetLocations(data.departments);
            if (data.categoryLabels) setCategoryLabels(data.categoryLabels);
        }
    });
    return () => unsubGen();
  }, []);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    const docRef = doc(db, 'assets', assetId);

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const assetData = { id: docSnap.id, ...docSnap.data() } as Asset;
        setAsset(assetData);
        setMutationLocation(assetData.location); 
        setMutationQuantity(assetData.qty);
        setDisposalQuantity(assetData.qty); 
        setDisposalCondition(assetData.condition); 
        setNewCondition(assetData.condition); 
        setActiveImage(assetData.photoURL || null);
        setError(null);
        
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

    setLoadingMaintenance(true);
    const mQuery = query(
        collection(db, 'maintenance_schedules'),
        where('assetId', '==', assetId),
        orderBy('scheduledDate', 'desc')
    );
    
    const unsubscribeM = onSnapshot(mQuery, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule));
        setMaintenanceHistory(history);
        setLoadingMaintenance(false);
    });

    return () => {
        unsubscribe();
        unsubscribeM();
    };
  }, [assetId]);

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
      if (response.ok) return data.secure_url;
      else throw new Error(data.error.message || 'Gagal mengunggah gambar.');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
      return undefined;
    } finally {
      setIsUploading(false);
    }
  };
  
  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) videoRef.current.srcObject = null;
    setIsCameraOpen(false);
  }, []);

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
        if (!fieldToUpdate) fieldToUpdate = 'photoURL';
        await updateDoc(assetRef, { [fieldToUpdate]: photoURL });
        toast({ title: "Foto berhasil ditambahkan" });
        stopCamera();
        setSelectedFile(null);
    } catch (error) {
        toast({ variant: "destructive", title: "Gagal Menyimpan Foto" });
    }
  };

  const handleDisposalRequest = async () => {
    if (!user || !asset) return;
    if (disposalQuantity <= 0 || disposalQuantity > asset.qty) {
      toast({ variant: 'destructive', title: 'Jumlah Tidak Valid', description: `Jumlah disposal harus antara 1 dan ${asset.qty}.` });
      return;
    }
    if (!disposalCondition) {
      toast({ variant: 'destructive', title: 'Kondisi Belum Dipilih', description: 'Silakan pilih kondisi aset sebelum mengajukan disposal.' });
      return;
    }
    setIsDisposalLoading(true);
    try {
      const photoURL = selectedFile ? await handleFileUpload(selectedFile) : undefined;
      const assetRef = doc(db, 'assets', asset.id);
      const updateData: { [key: string]: any } = { 
        status: 'waiting_disposal', 
        condition: disposalCondition, 
        requestedBy: user.uid, 
        requestedAt: serverTimestamp(),
        updatedAt: serverTimestamp() 
      };
      let disposalNote = `Diajukan untuk disposal sebanyak ${disposalQuantity} unit. Kondisi saat pengajuan: ${disposalCondition}. Alasan: ${disposalNotes}`;
      const currentNotes = asset.notes || '';
      updateData.notes = currentNotes ? `${currentNotes}\n\n--- DISPOSAL DIAJUKAN ---\n${disposalNote}` : `--- DISPOSAL DIAJUKAN ---\n${disposalNote}`;
      if (photoURL) {
        const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
        let fieldToUpdate: string | null = null;
        for (const field of photoFields) { if (!asset[field]) { fieldToUpdate = field; break; } }
        if (fieldToUpdate) updateData[fieldToUpdate] = photoURL;
        else updateData.disposalPhotoURL1 = photoURL;
      }
      await updateDoc(assetRef, updateData);
      toast({ title: 'Pengajuan Terkirim', description: `Aset "${asset.name}" telah diajukan untuk disposal.` });
      setIsDisposalDialogOpen(false);
    } catch (error) { toast({ variant: 'destructive', title: 'Gagal Mengajukan' }); } finally { setIsDisposalLoading(false); setSelectedFile(null); }
  };

  const handleMutationRequest = async () => {
    if (!user || !asset) return;
    if (!mutationDate || !mutationLocation || !mutationReason) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Mohon isi tanggal, lokasi baru, dan alasan mutasi.' });
      return;
    }
    if (mutationQuantity <= 0 || mutationQuantity > asset.qty) {
       toast({ variant: 'destructive', title: 'Jumlah Tidak Valid', description: `Jumlah mutasi harus antara 1 dan ${asset.qty}.` });
      return;
    }
    setIsMutationLoading(true);
    try {
      const assetRef = doc(db, 'assets', asset.id);
      const mutationDetails = `--- MUTASI DIAJUKAN ---\nTanggal Rencana: ${format(mutationDate, 'd MMM yyyy', { locale: id })}\nLokasi Baru: ${mutationLocation}\nPengguna Baru: ${mutationNewUser || '(tidak ada)'}\nJumlah: ${mutationQuantity}\nAlasan: ${mutationReason}\nDiajukan oleh: ${user.displayName || user.email} pada ${format(new Date(), 'd MMM yyyy HH:mm', { locale: id })}`;
      const newNotes = `${asset.notes || ''}\n\n${mutationDetails}`;
      await updateDoc(assetRef, { 
        status: 'waiting_mutasi', 
        requestedBy: user.uid, 
        requestedAt: serverTimestamp(), 
        updatedAt: serverTimestamp(),
        mutationTargetDepartment: mutationLocation, 
        notes: newNotes 
      });
      toast({ title: 'Pengajuan Terkirim', description: `Aset "${asset.name}" telah diajukan untuk mutasi.` });
      setIsMutationDialogOpen(false);
    } catch (error) { toast({ variant: 'destructive', title: 'Gagal Mengajukan' }); } finally { setIsMutationLoading(false); }
  };

  const handleConditionChangeRequest = async () => {
    if (!user || !asset || !newCondition || !conditionChangeReason) {
        toast({ variant: 'destructive', title: 'Data Tidak Lengkap' });
        return;
    }
    if (newCondition === asset.condition) {
        toast({ variant: 'destructive', title: 'Tidak Ada Perubahan' });
        return;
    }
    setIsConditionChangeLoading(true);
    try {
        const assetRef = doc(db, 'assets', asset.id);
        const conditionChangeDetails = `--- PERUBAHAN KONDISI DIAJUKAN ---\nKondisi Baru: ${newCondition}\nAlasan: ${conditionChangeReason}\nDiajukan oleh: ${user.displayName || user.email} pada ${format(new Date(), 'd MMM yyyy HH:mm', { locale: id })}`;
        const newNotes = `${asset.notes || ''}\n\n${conditionChangeDetails}`;
        const canDirectlyChange = user.role === 'Admin' || user.permissions?.canEditAsset;
        if (canDirectlyChange) {
            await updateDoc(assetRef, { condition: newCondition, notes: newNotes, updatedAt: serverTimestamp() });
            toast({ title: 'Berhasil' });
        } else {
            await updateDoc(assetRef, { 
              status: 'waiting_edit', 
              requestedBy: user.uid, 
              requestedAt: serverTimestamp(), 
              notes: newNotes,
              updatedAt: serverTimestamp()
            });
            toast({ title: 'Pengajuan Terkirim' });
        }
        setIsConditionDialogOpen(false);
        setConditionChangeReason('');
    } catch (serverError: any) { toast({ variant: 'destructive', title: 'Gagal', description: serverError.message || 'Terjadi kesalahan.' }); } finally { setIsConditionChangeLoading(false); }
  };

  const handlePrint = async () => {
    if (!asset) return;
    setIsPrinting(true);
    try {
        let qrData = `${window.location.origin}/public/asset?assetId=${asset.id}`;
        if (asset.status === 'Bukan_Asset_Perusahaan') qrData = `${window.location.origin}/public/personal?id=${asset.id}`;
        else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) qrData = `${window.location.origin}/public/utility?id=${asset.id}`;
        const qrCodeUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 250 });
        const printWindow = window.open('', '', 'width=815,height=528'); 
        if (printWindow) {
            const today = new Date();
            const createdAtDate = asset.createdAt ? asset.createdAt.toDate() : today;
            const formattedPrice = (asset.priceUSD ?? 0) > 0 
              ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.priceUSD!)
              : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);
            const content = `<html><head><title>Form FIX ASSET</title><style>@media print { @page { size: 215.9mm 139.7mm; margin: 2mm; } body { margin: 0; padding: 0; } }</style></head><body>...</body></html>`;
            printWindow.document.write(content);
            printWindow.document.close();
            setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
        }
    } catch (e) { toast({ variant: "destructive", title: "Gagal Mencetak" }); } finally { setIsPrinting(false); }
  };

  const imageLoader = ({ src }: { src: string }) => src;
  const allImages = useMemo(() => {
    if (!asset) return [];
    return [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter((url): url is string => !!url);
  }, [asset]);

  const masaPakaiFull = asset?.purchaseDate ? `${differenceInYears(new Date(), asset.purchaseDate.toDate())} tahun` : '-';
  const sisaUmurFull = (asset?.purchaseDate && asset?.assetLifetime) ? asset.assetLifetime - differenceInYears(new Date(), asset.purchaseDate.toDate()) : null;
  const tanggalHabisFull = (asset?.purchaseDate && asset?.assetLifetime) ? addYears(asset.purchaseDate.toDate(), asset.assetLifetime) : null;

  const getAccessoryLabel = (index: 1 | 2 | 3 | 4) => {
    if (!asset) return `Kelengkapan ${index}`;
    if (categoryLabels[asset.category] && categoryLabels[asset.category][index - 1]) return categoryLabels[asset.category][index - 1];
    const category = asset.category;
    const name = (asset.name || '').toLowerCase();
    const isAC = name.includes('ac') || name.includes('air conditioner') || category === 'Elektronik';
    if (isAC) { switch(index) { case 1: return "Model Unit"; case 2: return "Jenis Refrigeran"; case 3: return "Volume (KG)"; case 4: return "kW"; } }
    if (category === 'APAR') { switch(index) { case 1: return "Berat (kg)"; case 2: return "Media"; case 3: return "Exp Date"; case 4: return "Posisi Titik"; } }
    if (isoRelevantCategories.includes(category)) { switch(index) { case 1: return "Model / S/N"; case 2: return "Tipe Unit"; case 3: return "Jenis Energi"; case 4: return "Kapasitas"; } }
    return `Spesifikasi ${index}`;
  };

  const canEdit = user?.role === 'Admin' || user?.permissions?.canEditAsset;
  const canRequest = user?.role === 'Admin' || user?.permissions?.canRequestMutation;
  const isWaiting = asset?.status.startsWith('waiting_');

  if (loading) return <div className="p-10"><Skeleton className="h-40 w-full rounded-[2rem]" /></div>;
  if (error || !asset) return <div className="text-center text-destructive p-8">{error || 'Aset tidak ditemukan.'}</div>;

  return (
    <>
      <div className="relative w-full mx-auto rounded-[2.5rem] p-6 sm:p-10 border-2 transition-all duration-700 shadow-2xl overflow-hidden mb-20">
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-start md:justify-between gap-8 text-black">
          <div className="flex-1 space-y-6 text-left">
            <div className="space-y-3 text-left">
              <h2 className="text-xl md:text-3xl font-black italic tracking-tighter leading-none uppercase drop-shadow-2xl">{asset.name}</h2>
              <div className="flex items-center gap-3 text-left">
                <Badge className="bg-black/30 text-white border-none font-mono font-black text-xl tracking-wider px-4 py-1 shadow-2xl">{asset.code}</Badge>
                {itAssetLink && (
                  <Link href={`/computer-details/asset?computerId=${itAssetLink.id}`} className="flex items-center gap-1.5 px-3 py-1 bg-blue-500/20 text-white rounded-lg border border-white/20 hover:bg-blue-500/40 transition-all font-bold text-[10px] uppercase tracking-tight">
                    <Laptop className="h-3 w-3" />({itAssetLink.name})
                  </Link>
                )}
              </div>
            </div>
            
            <div className="flex flex-wrap items-center gap-3 text-left">
               <Badge className="rounded-full px-5 py-1 font-black text-xs uppercase shadow-lg bg-white text-slate-900 border-none">{asset.category}</Badge>
               <Badge className={cn("rounded-full px-5 py-1 text-xs font-black shadow-lg uppercase border-none", asset.status === 'Aktif' ? "bg-emerald-600 text-white" : "bg-blue-600 text-white")}>{asset.status.replace(/_/g, ' ')}</Badge>
            </div>

            <div className="flex flex-wrap items-center gap-4 pt-4">
                {canRequest && (
                    <>
                    <Button size="sm" onClick={() => setIsMutationDialogOpen(true)} className="rounded-xl h-10 px-8 bg-white text-blue-700 font-black uppercase text-[10px] tracking-widest shadow-[0_6px_0_0_rgba(255,255,255,0.2)] hover:translate-y-[1px] hover:shadow-[0_4px_0_0_rgba(255,255,255,0.2)] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50" disabled={isWaiting}>
                        <ArrowRightLeft className="mr-2 h-4 w-4" />Mutasi
                    </Button>
                    <Button size="sm" variant="destructive" onClick={() => setIsDisposalDialogOpen(true)} className="rounded-xl h-10 px-8 bg-white text-rose-600 font-black uppercase text-[10px] tracking-widest shadow-[0_6px_0_0_rgba(255,255,255,0.2)] hover:translate-y-[1px] hover:shadow-[0_4px_0_0_rgba(255,255,255,0.2)] active:translate-y-[6px] active:shadow-none transition-all disabled:opacity-50" disabled={isWaiting}>
                        <Recycle className="mr-2 h-4 w-4" />Disposal
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => setIsConditionDialogOpen(true)} className="rounded-xl h-10 px-8 bg-white/10 border-white/30 text-white hover:bg-white/20 font-black uppercase text-[10px] tracking-widest shadow-[0_5px_0_0_rgba(255,255,255,0.1)] hover:translate-y-[1px] active:translate-y-[5px] active:shadow-none transition-all disabled:opacity-50" disabled={isWaiting}>
                        <ClipboardEdit className="mr-1.5 h-4 w-4" />Kondisi
                    </Button>
                    </>
                )}
                <div className="h-8 w-px bg-white/10 mx-1 hidden md:block" />
                <Button size="sm" onClick={() => setIsPreviewCardOpen(true)} variant="outline" className="rounded-xl h-10 px-8 bg-white/10 border-white/30 text-white hover:bg-white/20 font-black text-[10px] uppercase tracking-widest shadow-[0_5px_0_0_rgba(255,255,255,0.1)] hover:translate-y-[1px] active:translate-y-[5px] active:shadow-none transition-all">
                    <Eye className="mr-1.5 h-4 w-4" />Kartu
                </Button>
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-10 w-10 rounded-full text-white hover:bg-white/10 border border-white/10">
                            <MoreVertical className="h-5 w-5" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 shadow-3xl text-black">
                        <DropdownMenuLabel className="px-4 py-2 text-[10px] font-black uppercase text-muted-foreground/70 text-left">Opsi</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrint(); }} className="py-3 px-4 rounded-xl cursor-pointer font-bold text-xs uppercase text-left"><Printer className="h-4 w-4 mr-2" /> Form Fix Aset</DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
          </div>

          {allImages.length > 0 && (
             <div className="shrink-0 w-full md:w-80 space-y-4">
                <div className="relative aspect-square w-full rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-white/10 cursor-pointer group" onClick={() => setIsLightboxOpen(true)}>
                    <Image loader={imageLoader} src={activeImage || allImages[0]} alt={asset.name} fill className="object-contain p-4 transition-transform duration-700 group-hover:scale-110" />
                </div>
                {allImages.length > 1 && (
                    <div className="flex gap-2 justify-center">
                        {allImages.map((img, idx) => (
                            <div key={idx} className={cn(
                                "relative w-12 h-12 rounded-xl overflow-hidden cursor-pointer border-2 transition-all",
                                activeImage === img ? "border-white scale-110 shadow-lg" : "border-white/20 opacity-60"
                            )} onClick={() => setActiveImage(img)}>
                                <Image loader={imageLoader} src={img} alt={`Thumb ${idx + 1}`} fill className="object-cover" />
                            </div>
                        ))}
                    </div>
                )}
             </div>
          )}
        </div>

        <div className="mt-12 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 relative z-10 text-left">
            <DetailItem label="Lokasi Unit" value={asset.location} icon={MapPinIcon} dark />
            <DetailItem label="Pusat Biaya" value={asset.costCenter} icon={Hash} dark />
            <DetailItem label="User Pengguna" value={asset.user} icon={UserIcon} dark />
            <DetailItem label="Ketahanan" value={asset.assetLifetime ? `${asset.assetLifetime} Thn` : '-'} icon={ShieldCheck} dark />
            <DetailItem label="Tgl Perolehan" value={formatDate(asset.purchaseDate)} icon={CalendarIcon} dark />
            <DetailItem label="Masa Pakai" value={masaPakaiFull || '-'} icon={ClockIcon} dark />
            <DetailItem label="Estimasi Habis" value={tanggalHabisFull ? format(tanggalHabisFull, 'dd/MM/yyyy') : '-'} icon={CalendarIcon} dark />
            <DetailItem label="Sisa Umur" value={sisaUmurFull !== null ? <Badge className="bg-white/20 text-white border-none font-black text-[9px] uppercase px-3">{sisaUmurFull > 0 ? `${sisaUmurFull} Thn` : 'REPLACE'}</Badge> : '-'} dark />
            <DetailItem label="Harga Perolehan" value={formatCurrency(asset.price, 'IDR')} icon={CircleDollarSign} className="col-span-2 bg-black/30 border-white/20" dark />
        </div>
        
        {depreciation && (
            <div className="mt-6 p-6 rounded-[2.5rem] bg-black/10 border border-white/5 relative z-10 text-left shadow-inner">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center text-left">
                    <div className="space-y-1 text-left">
                        <p className="text-[9px] font-black uppercase text-white/50 tracking-widest text-left">Akumulasi Depresiasi</p>
                        <p className="text-xl font-black text-left">{formatCurrency(depreciation.accumulatedDepreciation)}</p>
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-[9px] font-black uppercase text-white/50 tracking-widest text-left">Nilai Buku Terkini</p>
                        <p className="text-xl font-black text-emerald-400 text-left">{formatCurrency(depreciation.bookValue)}</p>
                    </div>
                    <div className="space-y-2 text-left">
                        <div className="flex justify-between text-[9px] font-black uppercase text-white/60 tracking-widest text-left">
                            <span>Sisa Nilai Manfaat</span>
                            <span>{Math.round(depreciation.percentRemaining)}%</span>
                        </div>
                        <Progress value={depreciation.percentRemaining} className="h-1.5 bg-white/10" />
                    </div>
                </div>
            </div>
        )}

        <div className="mt-10 pt-10 border-t border-white/10 relative z-10 text-left">
            <SectionLabel title="Identitas Teknis ISO" icon={Settings2} dark />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <DetailItem label={getAccessoryLabel(1)} value={asset.accessory1} dark />
                <DetailItem label={getAccessoryLabel(2)} value={asset.accessory2} dark />
                <DetailItem label={getAccessoryLabel(3)} value={asset.accessory3} dark />
                <DetailItem label={getAccessoryLabel(4)} value={asset.accessory4} dark />
            </div>
        </div>

        <div className="mt-10 pt-10 border-t border-white/10 relative z-10 text-left">
            <SectionLabel title="Verifikasi Dokumen Audit" icon={ShieldCheck} dark />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-left">
                <DetailItem label="No. Inspeksi" value={asset.inspectionNumber} icon={ShieldCheck} dark />
                <DetailItem label="Tgl Inspeksi" value={formatDate(asset.inspectionDate)} icon={CalendarIcon} dark />
                <DetailItem label="No. Insp Proyek" value={asset.projectInspectionNumber} icon={ShieldCheck} dark />
                <DetailItem label="Tgl Insp Proyek" value={formatDate(asset.projectInspectionDate)} icon={CalendarIcon} dark />
            </div>
        </div>

        <div className="mt-10 pt-10 border-t border-white/10 relative z-10 text-left">
            <SectionLabel title="Histori Pemeliharaan" icon={WrenchIcon} dark />
            {loadingMaintenance ? (
                <div className="flex items-center gap-3 text-xs font-black text-white/40 animate-pulse text-left"><Loader2 className="h-4 w-4 animate-spin" /> Sinkron data...</div>
            ) : maintenanceHistory.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-left">
                    {maintenanceHistory.map((m) => {
                        const mntCode = m.code || (`MNT-${m.id.slice(0, 6).toUpperCase()}`);
                        return (
                            <div
                                key={m.id}
                                onClick={() => setSelectedHistorySchedule(m)}
                                className="p-4 rounded-[1.5rem] bg-white text-black shadow-xl hover:shadow-2xl hover:scale-[1.02] transition-all cursor-pointer relative overflow-hidden text-left group"
                            >
                                <div className="flex items-center justify-between mb-2 text-left">
                                    <Badge className="text-[9px] font-black font-mono uppercase px-2.5 py-0.5 rounded-md bg-slate-900 text-emerald-400 border-none shadow-sm">
                                        {mntCode}
                                    </Badge>
                                    <div className="flex items-center gap-1.5">
                                        <Badge className="text-[9px] font-black uppercase px-3 py-0.5 rounded-full">{m.status}</Badge>
                                        <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-emerald-600 transition-colors" />
                                    </div>
                                </div>
                                <p className="text-xs font-black text-slate-900 uppercase truncate text-left">{m.type}</p>
                                <p className="mt-2 text-[10px] text-slate-500 font-bold line-clamp-2 italic text-left">"{m.notes || 'Pengerjaan rutin.'}"</p>
                                <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[9px] font-black uppercase text-slate-400 text-left">
                                    <span>{m.technician || 'Staff IT/GA'}</span>
                                    <span className="flex items-center gap-1 text-left"><CalendarIcon className="w-2.5 h-2.5" /> {formatDate(m.scheduledDate)}</span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="p-12 rounded-[2rem] bg-black/10 border-2 border-dashed border-white/10 flex flex-col items-center justify-center opacity-40 text-left"><CheckCircle2 className="h-10 w-10 text-white" /><p className="text-[10px] font-black uppercase mt-2 text-left">Log Bersih</p></div>
            )}
        </div>
      </div>

      <Dialog open={isLightboxOpen} onOpenChange={setIsLightboxOpen}>
        <DialogContent className="h-[90vh] bg-transparent border-none shadow-none flex flex-col items-center justify-center p-0">
            <DialogHeader className="sr-only"><DialogTitle>Galeri Gambar</DialogTitle></DialogHeader>
            <Carousel setApi={setCarouselApi} className="w-full h-full">
                <CarouselContent className="h-full">
                    {allImages.map((img, idx) => (
                        <CarouselItem key={idx} className="relative h-full flex items-center justify-center">
                            <Image loader={imageLoader} src={img} alt={`G ${idx + 1}`} width={1000} height={1000} className="object-contain max-w-full max-h-full drop-shadow-2xl" />
                        </CarouselItem>
                    ))}
                </CarouselContent>
                {allImages.length > 1 && (
                    <>
                        <CarouselPrevious className="absolute left-6 top-1/2 -translate-y-1/2 text-white bg-black/40 border-none h-12 w-12" />
                        <CarouselNext className="absolute right-6 top-1/2 -translate-y-1/2 text-white bg-black/40 border-none h-12 w-12" />
                    </>
                )}
            </Carousel>
        </DialogContent>
      </Dialog>

      <AssetForm asset={asset} isOpen={isFormOpen} onOpenChange={setIsFormOpen} initialStatus={asset.status} />
      <Dialog open={isDisposalDialogOpen} onOpenChange={setIsDisposalDialogOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl rounded-[2.5rem]">
            <div className="px-6 py-8 bg-rose-600 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-1"><Recycle className="w-8 h-8" /></div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Ajukan Disposal</DialogTitle>
            </div>
            <div className="p-6 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jumlah</Label>
                        <Input type="number" value={disposalQuantity} onChange={(e) => setDisposalQuantity(Number(e.target.value))} min={1} max={asset.qty} className="h-11 rounded-xl font-black text-base" />
                    </div>
                    <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kondisi</Label>
                        <Select onValueChange={(v) => setDisposalCondition(v as AssetCondition)} value={disposalCondition}>
                            <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="Pilih" /></SelectTrigger>
                            <SelectContent className="rounded-xl">{assetConditions.map(c => <SelectItem key={c} value={c} className="font-bold">{c}</SelectItem>)}</SelectContent>
                        </Select>
                    </div>
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Alasan</Label>
                    <Textarea placeholder="Ketik alasan pengajuan..." value={disposalNotes} onChange={(e) => setDisposalNotes(e.target.value)} className="min-h-[100px] rounded-xl resize-none font-medium" />
                </div>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" onClick={() => setIsDisposalDialogOpen(false)} className="rounded-xl font-bold flex-1 h-12">Batal</Button>
                <Button onClick={handleDisposalRequest} disabled={isDisposalLoading} className="bg-rose-600 hover:bg-rose-700 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest flex-[2] shadow-[0_5px_0_0_#9f1239] active:translate-y-[5px] active:shadow-none transition-all">Kirim Pengajuan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isMutationDialogOpen} onOpenChange={setIsMutationDialogOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl rounded-[2.5rem]">
            <div className="px-6 py-8 bg-indigo-600 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-1"><ArrowRightLeft className="w-8 h-8" /></div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Mutasi Aset</DialogTitle>
            </div>
            <div className="p-6 space-y-4 text-left">
                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Jumlah</Label>
                        <Input type="number" value={mutationQuantity} onChange={(e) => setMutationQuantity(Number(e.target.value))} min={1} max={asset.qty} className="h-11 rounded-xl font-black" />
                    </div>
                    <div className="space-y-1.5 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Tgl Rencana</Label>
                        <Input type="date" value={mutationDate ? format(mutationDate, 'yyyy-MM-dd') : ''} onChange={(e) => { const v = e.target.value; if(v) setMutationDate(new Date(v)); }} className="h-11 rounded-xl font-bold" />
                    </div>
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Unit Tujuan</Label>
                    <Select onValueChange={setMutationLocation} value={mutationLocation}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue /></SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">{assetLocations.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Keterangan</Label>
                    <Textarea placeholder="Alasan mutasi..." value={mutationReason} onChange={(e) => setMutationReason(e.target.value)} className="min-h-[80px] rounded-xl resize-none font-medium" />
                </div>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" onClick={() => setIsMutationDialogOpen(false)} className="rounded-xl font-bold flex-1 h-12">Batal</Button>
                <Button onClick={handleMutationRequest} disabled={isMutationLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest flex-[2] shadow-[0_5px_0_0_#3730a3] active:translate-y-[5px] active:shadow-none transition-all">Kirim Pengajuan</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isConditionDialogOpen} onOpenChange={setIsConditionDialogOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl rounded-[2.5rem]">
            <div className="px-6 py-8 bg-slate-800 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-full backdrop-blur-md mb-1"><ClipboardEdit className="w-8 h-8" /></div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Update Kondisi</DialogTitle>
            </div>
            <div className="p-6 space-y-4">
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Kondisi Baru</Label>
                    <Select onValueChange={(v) => setNewCondition(v as AssetCondition)} value={newCondition}>
                        <SelectTrigger className="h-11 rounded-xl font-bold"><SelectValue placeholder="Pilih kondisi" /></SelectTrigger>
                        <SelectContent className="rounded-xl">{assetConditions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                    </Select>
                </div>
                <div className="space-y-1.5 text-left">
                    <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1">Justifikasi Audit</Label>
                    <Textarea placeholder="Ketik alasan..." value={conditionChangeReason} onChange={(e) => setConditionChangeReason(e.target.value)} className="min-h-[100px] rounded-xl resize-none font-medium" />
                </div>
            </div>
            <DialogFooter className="p-6 bg-slate-50 border-t flex gap-3">
                <Button variant="ghost" onClick={() => setIsConditionDialogOpen(false)} className="rounded-xl font-bold flex-1 h-12">Batal</Button>
                <Button onClick={handleConditionChangeRequest} disabled={isConditionChangeLoading} className="bg-slate-800 hover:bg-slate-900 text-white rounded-xl h-12 px-8 font-black uppercase tracking-widest flex-[2] shadow-[0_5px_0_0_#1e293b] active:translate-y-[5px] active:shadow-none transition-all">Simpan Audit</Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {asset && (
        <AssetCardPreview assetId={asset.id} isOpen={isPreviewCardOpen} onOpenChange={setIsPreviewCardOpen} />
      )}

      {/* Modal Popup Detail Maintenance saat diklik di Histori */}
      <Dialog open={!!selectedHistorySchedule} onOpenChange={(open) => !open && setSelectedHistorySchedule(null)}>
        <DialogContent hideCloseButton className="sm:max-w-5xl max-h-[92vh] overflow-y-auto p-4 sm:p-6 rounded-[2.5rem] border-none shadow-2xl bg-slate-50 dark:bg-slate-950 text-black dark:text-white">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-200 dark:border-slate-800">
            <div className="text-left min-w-0">
              <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 text-emerald-600 dark:text-emerald-400">
                <WrenchIcon className="w-5 h-5 shrink-0" />
                <span>Detail Pemeliharaan — {selectedHistorySchedule?.code || (selectedHistorySchedule?.id ? `MNT-${selectedHistorySchedule.id.slice(0, 6).toUpperCase()}` : '')}</span>
              </DialogTitle>
              <DialogDescription className="text-xs font-medium text-slate-500">
                Rincian pengerjaan, bukti foto, tanda tangan & dokumen keabsahan
              </DialogDescription>
            </div>
            <DialogClose asChild>
              <Button variant="ghost" size="icon" className="rounded-full hover:bg-slate-200 dark:hover:bg-slate-800 h-9 w-9">
                <XIcon className="w-5 h-5" />
              </Button>
            </DialogClose>
          </DialogHeader>
          <div className="mt-2">
            {selectedHistorySchedule && (
              <MaintenanceDetailCard schedule={selectedHistorySchedule} />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
