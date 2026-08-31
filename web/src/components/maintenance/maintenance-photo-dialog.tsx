'use client';

/**
 * @fileOverview Dialog untuk mengunggah foto bukti pengerjaan, tanda tangan penyelesaian, dan bukti diskusi email.
 * Fitur: Upload foto/file Cloudinary, Tanda Tangan Base64, dan Sinkronisasi Tanda Tangan ke Log Inventory Requests.
 * Update: Manajemen kamera yang ketat dengan pelepasan hardware total saat ditutup.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Loader2, 
  FileImage, 
  Camera, 
  UploadCloud, 
  X, 
  CheckCircle2, 
  User, 
  Pencil, 
  Trash, 
  Type, 
  ShieldCheck,
  Share2,
  Mail,
  FileText,
  FileArchive,
  RefreshCw,
  CircleDollarSign,
  Search
} from 'lucide-react';
import Image from 'next/image';
import { type MaintenanceSchedule } from '@/lib/types';
import { doc, updateDoc, serverTimestamp, writeBatch, query, collection, where, getDocs, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import SignatureCanvas from 'react-signature-canvas';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { DocumentViewerModal } from './document-viewer-modal';

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

interface MaintenancePhotoDialogProps {
  schedule: MaintenanceSchedule;
  photoType: 'progress' | 'completion' | 'email';
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

// Fungsi helper untuk memaksa PDF dibuka sebagai tipe JPG langsung dari Cloudinary (menghindari plugin Adobe)
const openDocumentPreview = (url: string) => {
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/') || url.toLowerCase().includes('/files/');
  
  if (url.toLowerCase().includes('/image/upload/')) {
    // Menghapus query params jika ada
    const cleanUrl = url.split('?')[0];
    let imageUrl = cleanUrl;
    if (cleanUrl.toLowerCase().endsWith('.pdf')) {
      imageUrl = cleanUrl.replace(/\.pdf$/i, '.jpg');
    } else {
      imageUrl = cleanUrl + '.jpg';
    }
    window.open(imageUrl, '_blank');
  } else if (isPdf) {
    // Fallback ke Google Docs Viewer jika berupa raw upload
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    window.open(viewerUrl, '_blank');
  } else {
    window.open(url, '_blank');
  }
};

// Komponen pembantu untuk menampilkan preview & tombol hapus pada dokumen terunggah (Invoice, SPK, BAST)
const DocPreviewItem = ({ 
  label, 
  url, 
  onClear, 
  onUploadClick, 
  onPreviewClick,
  isUploading 
}: { 
  label: string; 
  url: string; 
  onClear: () => void; 
  onUploadClick: () => void; 
  onPreviewClick: () => void;
  isUploading: boolean; 
}) => {
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/') || url.toLowerCase().includes('/files/');
  const isCloudinaryImagePdf = url.toLowerCase().includes('/image/upload/');
  
  let previewThumbnailUrl = url;
  if (isCloudinaryImagePdf) {
    const cleanUrl = url.split('?')[0];
    previewThumbnailUrl = cleanUrl.toLowerCase().endsWith('.pdf') 
      ? cleanUrl.replace(/\.pdf$/i, '.jpg') 
      : cleanUrl + '.jpg';
  }
  
  const inputClass = "bg-background h-11 border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm font-semibold";
  
  return (
    <div className="space-y-1.5 text-left">
      <Label className="text-[9px] font-black uppercase text-muted-foreground flex items-center gap-1">
        {label}
      </Label>
      
      {url ? (
        <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm min-w-0">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            {!isPdf || isCloudinaryImagePdf ? (
              <div className="relative h-9 w-9 rounded-lg overflow-hidden border bg-white dark:bg-slate-800 shrink-0">
                <Image src={previewThumbnailUrl} alt={label} fill className="object-cover" />
              </div>
            ) : (
              <div className="h-9 w-9 bg-rose-50 dark:bg-rose-950/30 rounded-lg flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/50">
                <FileText className="h-4.5 w-4.5 text-rose-600" />
              </div>
            )}
            <div className="min-w-0 flex-1">
              <p className="text-[10px] font-black text-slate-800 dark:text-slate-200 uppercase truncate text-left">{label}</p>
              <p className="text-[8px] font-bold text-muted-foreground/60 uppercase text-left">{isPdf ? 'PDF Dokumen' : 'Gambar'}</p>
            </div>
          </div>
          <div className="flex items-center gap-1 ml-2">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onPreviewClick}
              className="h-7 w-7 rounded-lg text-slate-600 hover:text-slate-800 hover:bg-slate-100"
              title="Lihat / Preview"
            >
              <Search className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 rounded-lg text-rose-600 hover:text-rose-700 hover:bg-rose-50"
              title="Hapus"
            >
              <X className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>
      ) : (
        <div className="relative">
          <Button 
            type="button" 
            variant="outline" 
            onClick={onUploadClick}
            className="w-full h-10 rounded-xl text-[10px] font-black uppercase border-slate-200 dark:border-slate-800 border-dashed text-slate-700 dark:text-slate-300 bg-white dark:bg-slate-900"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <UploadCloud className="h-3.5 w-3.5 mr-1.5" />}
            Upload File
          </Button>
        </div>
      )}
    </div>
  );
};

export default function MaintenancePhotoDialog({ schedule, photoType, isOpen, onOpenChange }: MaintenancePhotoDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [photos, setPhotos] = useState<{ url: string; file?: File; isExisting?: boolean }[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [facingMode, setFacingMode] = useState<'user' | 'environment'>('environment');
  
  // Signature specific states
  const [penColor, setPenColor] = useState('#000000');
  const [isTextMode, setIsTextMode] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [showExistingSignature, setShowExistingSignature] = useState(true);
  
  // Service validation states
  const [vendorName, setVendorName] = useState('');
  const [repairCost, setRepairCost] = useState<number>(0);
  const [repairInvoicePhotoURL, setRepairInvoicePhotoURL] = useState('');
  const [spkPhotoURL, setSpkPhotoURL] = useState('');
  const [bastPhotoURL, setBastPhotoURL] = useState('');

  const docInputRef = useRef<HTMLInputElement>(null);
  const [activeUploadDocType, setActiveUploadDocType] = useState<'invoice' | 'spk' | 'bast' | null>(null);
  const [isUploadingDoc, setIsUploadingDoc] = useState<'invoice' | 'spk' | 'bast' | null>(null);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const { toast } = useToast();
  const { user } = useAuth();
  
  const dialogTitle = {
    progress: 'Upload Bukti Pengerjaan',
    completion: 'Otoritas Penyelesaian',
    email: 'Lampirkan Diskusi Email (.msg)'
  }[photoType];

  const fieldToUpdate = {
    progress: 'progressPhotoURL',
    completion: 'completionPhotoURL',
    email: 'emailProofURL'
  }[photoType];

  const existingPhoto = {
    progress: schedule.progressPhotoURL,
    completion: schedule.completionPhotoURL,
    email: schedule.emailProofURL
  }[photoType];

  useEffect(() => {
    if (isOpen) {
      const defaultName = schedule?.vendorName || schedule?.technician || user?.displayName || (user?.email ? user.email.split('@')[0] : '');
      setSelectedFile(null);
      setPreviewUrl(existingPhoto || null);
      setTypedName(defaultName);
      setIsTextMode(false);
      setShowExistingSignature(true);
      if (sigPadRef.current) {
        sigPadRef.current.clear();
      }
      setVendorName(defaultName);
      setRepairCost(schedule?.repairCost || 0);
      setRepairInvoicePhotoURL(schedule?.repairInvoicePhotoURL || '');
      setSpkPhotoURL(schedule?.spkPhotoURL || '');
      setBastPhotoURL(schedule?.bastPhotoURL || '');

      if (photoType === 'progress') {
        const existing = schedule?.progressPhotoURLs || (schedule?.progressPhotoURL ? [schedule.progressPhotoURL] : []);
        setPhotos(existing.map(url => ({ url, isExisting: true })));
      } else {
        setPhotos([]);
      }
    }
  }, [isOpen, existingPhoto, schedule, photoType, user]);

  // Fungsi mematikan kamera dengan cermat dan efektif
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
      videoRef.current.load(); // Paksa pelepasan hardware
    }
    setIsCameraOpen(false);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (photoType === 'progress') {
      const files = Array.from(event.target.files || []);
      const remainingSlots = 5 - photos.length;
      if (remainingSlots <= 0) {
        toast({ variant: 'destructive', title: 'Batas Maksimal Gambar', description: 'Maksimal 5 gambar diperbolehkan.' });
        return;
      }
      
      const newItems = files.slice(0, remainingSlots).map(file => ({
        url: URL.createObjectURL(file),
        file
      }));
      
      setPhotos(prev => [...prev, ...newItems]);
      if (files.length > remainingSlots) {
        toast({ variant: 'destructive', title: 'Sebagian Gambar Diabaikan', description: `Hanya menambahkan ${remainingSlots} gambar (maksimal 5).` });
      }
    } else {
      const file = event.target.files?.[0];
      if (file) {
        setSelectedFile(file);
        if (file.type.startsWith('image/')) {
          setPreviewUrl(URL.createObjectURL(file));
        } else {
          setPreviewUrl(null);
        }
      }
    }
  };

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    if (photoType !== 'progress') return;
    
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          setPhotos(prev => {
            if (prev.length >= 5) {
              toast({ variant: 'destructive', title: 'Batas Maksimal Gambar', description: 'Maksimal 5 gambar diperbolehkan.' });
              return prev;
            }
            const pastedFile = new File([blob], `pasted-evidence-${Date.now()}.png`, { type: blob.type });
            toast({ 
              title: 'Gambar Ditempel', 
              description: 'Foto bukti berhasil dilampirkan dari clipboard.',
            });
            return [...prev, { url: URL.createObjectURL(pastedFile), file: pastedFile }];
          });
        }
      }
    }
  }, [photoType, toast]);

  const handleUpload = async (fileToUpload: File | null) => {
    if (photoType === 'progress') {
      if (photos.length === 0) {
        toast({ variant: 'destructive', title: 'Gambar Kosong', description: 'Silakan pilih, tempel, atau ambil gambar terlebih dahulu.' });
        return;
      }
      setIsUploading(true);

      try {
        const uploadPromises = photos.map(async (photo) => {
          if (photo.file) {
            const formData = new FormData();
            formData.append('file', photo.file);
            formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);
            const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
              method: 'POST',
              body: formData,
            });
            const data = await response.json();
            if (response.ok) {
              return data.secure_url as string;
            } else {
              throw new Error(data.error.message || 'Gagal mengunggah beberapa gambar.');
            }
          } else {
            return photo.url;
          }
        });

        const uploadedUrls = await Promise.all(uploadPromises);
        
        const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
        await updateDoc(scheduleRef, {
          progressPhotoURL: uploadedUrls[0] || '',
          progressPhotoURLs: uploadedUrls,
          updatedAt: serverTimestamp()
        });

        toast({ title: 'Berhasil Disimpan', description: `${uploadedUrls.length} foto bukti pengerjaan berhasil disimpan.` });
        onOpenChange(false);
      } catch (error: any) {
        console.error("Progress upload error:", error);
        toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
      } finally {
        setIsUploading(false);
      }
      return;
    }

    if (!fileToUpload || !schedule) return;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const fileURL = data.secure_url;
        const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
        
        const updateData: any = { 
          [fieldToUpdate]: fileURL,
          updatedAt: serverTimestamp() 
        };

        if (photoType === 'email') {
          updateData.emailProofName = fileToUpload.name;
        }

        await updateDoc(scheduleRef, updateData);

        // SYNC TO HELPDESK TICKET
        if (photoType === 'email' && schedule.ticketId) {
            const ticketRef = doc(db, 'helpdesk_tickets', schedule.ticketId);
            await updateDoc(ticketRef, {
                updates: arrayUnion({
                    note: `[SISTEM] Bukti diskusi email (${fileToUpload.name}) telah diunggah melalui modul maintenance.`,
                    attachmentURL: fileURL,
                    updatedBy: 'SYSTEM',
                    updaterName: 'MODUL MAINTENANCE',
                    updatedAt: Timestamp.now(),
                })
            });
            toast({ title: 'Tersinkronisasi', description: 'Bukti email telah diteruskan ke Tiket Helpdesk.' });
        }

        toast({ title: 'Berhasil Disimpan', description: 'File telah disimpan di server.' });
        onOpenChange(false);
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah file.');
      }
    } catch (error: any) {
      console.error("Upload error:", error);
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleSaveSignature = async () => {
    if (!vendorName.trim()) {
      toast({ variant: 'destructive', title: 'Vendor Wajib Diisi', description: 'Silakan isi nama vendor / pelaksana.' });
      return;
    }

    let signatureData = '';

    if (isTextMode) {
      if (!typedName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Kosong' });
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, tempCanvas.width / 2, tempCanvas.height / 2);
        signatureData = tempCanvas.toDataURL('image/png');
      }
    } else {
      if (sigPadRef.current) {
        const isCanvasEmpty = sigPadRef.current.isEmpty();
        if (isCanvasEmpty && (!showExistingSignature || !existingPhoto)) {
          toast({ variant: 'destructive', title: 'Tanda Tangan Kosong', description: 'Silakan berikan tanda tangan terlebih dahulu.' });
          return;
        }
        
        if (isCanvasEmpty && showExistingSignature && existingPhoto) {
          signatureData = existingPhoto;
        } else {
          signatureData = sigPadRef.current.toDataURL('image/png');
        }
      }
    }

    if (!signatureData) return;

    setIsUploading(true);
    try {
      // 1. Update Maintenance Schedule
      const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
      const updateData: any = { 
        [fieldToUpdate]: signatureData,
        status: 'Selesai',
        vendorName,
        repairCost: Number(repairCost),
        repairInvoicePhotoURL,
        spkPhotoURL: spkPhotoURL || null,
        bastPhotoURL: bastPhotoURL || null,
        updatedAt: serverTimestamp()
      };
      await updateDoc(scheduleRef, updateData);

      // 2. Sync Signature to Inventory Requests linked to this maintenance
      const q = query(collection(db, 'inventory_requests'), where('maintenanceId', '==', schedule.id));
      const querySnapshot = await getDocs(q);
      
      if (!querySnapshot.empty) {
          const reqBatch = writeBatch(db);
          // Determine the name of the signer (from typed name or vendor name)
          const signerName = typedName.trim() || vendorName.trim();
          querySnapshot.forEach((d) => {
              reqBatch.update(d.ref, { 
                  approvalSignature: signatureData,
                  // Sync also as verifierDeptSignature so it appears in public report and signature page
                  verifierDeptSignature: signatureData,
                  verifierDeptName: `${signerName} (via Maintenance)`,
                  verifierDeptSignedAt: Timestamp.now(),
              });
          });
          await reqBatch.commit();
      }

      // 3. Update linked Helpdesk Ticket status to 'Selesai'
      if (schedule.ticketId) {
        try {
          const ticketRef = doc(db, 'helpdesk_tickets', schedule.ticketId);
          await updateDoc(ticketRef, {
            status: 'Selesai',
            updates: arrayUnion({
              note: `Tiket diselesaikan otomatis karena penjadwalan maintenance "${schedule.assetName}" telah selesai.`,
              updatedBy: 'system',
              updaterName: 'Sistem Maintenance',
              updatedAt: Timestamp.now(),
            }),
          });
        } catch (e) {
          console.warn('Gagal update tiket helpdesk terkait:', e);
        }
      }

      toast({ title: 'Pengerjaan Selesai', description: 'Tanda tangan telah disimpan dan disinkronkan ke log inventaris.' });
      onOpenChange(false);
    } catch (error) {
      console.error("Error saving signature:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsUploading(false);
    }
  };

  const handleClearSignature = () => {
    if (sigPadRef.current) {
        sigPadRef.current.clear();
    }
    setShowExistingSignature(false);
    setTypedName('');
  };

  const handleShareSignature = async () => {
    setIsSharing(true);
    const publicUrl = `${window.location.origin}/public/maintenance?id=${schedule.id}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: 'Pengesahan Pengerjaan Maintenance',
                text: `Mohon berikan tanda tangan pengesahan pengerjaan aset ${schedule.assetName} di sini:`,
                url: publicUrl,
            });
            toast({ title: 'Berhasil Dibagikan' });
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Tautan pengesahan publik telah disalin.' });
        }
    } catch (error: any) {
        if (error.name !== 'AbortError') {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
        }
    } finally {
        setIsSharing(false);
    }
  };

  const handleDeleteSignatureFromDialog = async () => {
    setIsUploading(true);
    try {
      const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
      await updateDoc(scheduleRef, {
        completionPhotoURL: null,
        updatedAt: serverTimestamp()
      });
      toast({ title: 'Tanda Tangan Dihapus', description: 'Bukti tanda tangan penyelesaian telah dihapus.' });
      handleClearSignature();
      onOpenChange(false);
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus Tanda Tangan' });
    } finally {
      setIsUploading(false);
    }
  };

  const triggerDocUpload = (type: 'invoice' | 'spk' | 'bast') => {
    setActiveUploadDocType(type);
    setTimeout(() => {
      docInputRef.current?.click();
    }, 100);
  };

  const handleDocUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !activeUploadDocType) return;

    setIsUploadingDoc(activeUploadDocType);
    const formData = new FormData();
    formData.append('file', file);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const fileURL = data.secure_url;
        if (activeUploadDocType === 'invoice') {
          setRepairInvoicePhotoURL(fileURL);
        } else if (activeUploadDocType === 'spk') {
          setSpkPhotoURL(fileURL);
        } else if (activeUploadDocType === 'bast') {
          setBastPhotoURL(fileURL);
        }
        toast({ title: 'Upload Berhasil', description: `Dokumen ${activeUploadDocType.toUpperCase()} berhasil diunggah.` });
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah dokumen.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploadingDoc(null);
      setActiveUploadDocType(null);
      if (docInputRef.current) docInputRef.current.value = '';
    }
  };

  useEffect(() => {
    const startCamera = async () => {
      if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          if (streamRef.current) {
              streamRef.current.getTracks().forEach(track => track.stop());
          }
          let stream;
          try {
            stream = await navigator.mediaDevices.getUserMedia({ 
                video: { 
                    facingMode: { ideal: facingMode },
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
          toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Tidak bisa mengakses kamera.' });
          setIsCameraOpen(false);
        }
      }
    };
    startCamera();
    return () => {
      // Cleanup mutlak saat navigasi berpindah atau dialog tertutup
      stopCamera();
    };
  }, [isCameraOpen, facingMode, toast, stopCamera]);

  const handleCaptureAndSetFile = () => {
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
          if (photoType === 'progress') {
            setPhotos(prev => {
              if (prev.length >= 5) {
                toast({ variant: 'destructive', title: 'Batas Maksimal Gambar', description: 'Maksimal 5 gambar diperbolehkan.' });
                return prev;
              }
              return [...prev, { url: URL.createObjectURL(capturedFile), file: capturedFile }];
            });
          } else {
            setSelectedFile(capturedFile);
            setPreviewUrl(URL.createObjectURL(capturedFile));
          }
          stopCamera();
        }
      }, 'image/jpeg');
    }
  };

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
            hideCloseButton
            className="sm:max-w-xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden outline-none bg-white dark:bg-slate-950 text-black"
            onPaste={handlePaste}
        >
          <div className={cn(
              "px-8 py-8 text-white flex flex-col items-center text-center gap-2 shrink-0 relative",
              photoType === 'progress' ? "bg-blue-600" : (photoType === 'email' ? "bg-slate-800" : "bg-emerald-600")
          )}>
            <div className="p-3.5 bg-white/10 rounded-full backdrop-blur-md mb-1 shadow-lg border border-white/30">
                {photoType === 'progress' ? <FileImage className="w-7 h-7" /> : (photoType === 'email' ? <Mail className="w-7 h-7" /> : <ShieldCheck className="w-7 h-7" />)}
            </div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase">
                {dialogTitle}
            </DialogTitle>
            <DialogDescription className="text-white/80 font-medium text-xs uppercase tracking-widest">
              Aset: {schedule.assetName} ({schedule.assetCode})
            </DialogDescription>
            <DialogClose asChild className="absolute top-4 right-4 text-white/40 hover:text-white transition-colors">
              <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 text-white"><X className="h-5 w-5" /></Button>
            </DialogClose>
          </div>

          <div className="p-8">
            {photoType === 'progress' ? (
                <div className="space-y-6 text-left">
                    <div className="flex items-center gap-3">
                        <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold border-slate-200" onClick={() => fileInputRef.current?.click()}>
                            <FileImage className="mr-2 h-4 w-4 text-blue-600" /> Pilih File
                        </Button>
                        <Button type="button" variant="outline" className="flex-1 h-12 rounded-xl font-bold border-slate-200" onClick={() => setIsCameraOpen(true)}>
                            <Camera className="mr-2 h-4 w-4 text-blue-600" /> Buka Kamera
                        </Button>
                        <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} multiple />
                    </div>

                    <div className="text-center">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-[0.2em]">Tips: Anda bisa langsung menempelkan (Ctrl+V) Screenshot di sini (Maks 5).</p>
                    </div>

                    {photos.length > 0 && (
                        <div className="grid grid-cols-2 gap-3 mt-4">
                            {photos.map((p, idx) => (
                                <div key={idx} className="relative aspect-video rounded-2xl overflow-hidden border bg-white dark:bg-slate-900 group shadow-sm">
                                    <Image src={p.url} alt={`Preview ${idx + 1}`} fill className="object-contain p-2" />
                                    <button
                                        type="button"
                                        onClick={() => {
                                            setPhotos(prev => prev.filter((_, i) => i !== idx));
                                            if (p.url.startsWith('blob:')) {
                                                URL.revokeObjectURL(p.url);
                                            }
                                        }}
                                        className="absolute top-1.5 right-1.5 p-1 rounded-full bg-rose-600 hover:bg-rose-700 text-white shadow-md hover:scale-105 active:scale-95 transition-all z-20"
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                    <div className="absolute bottom-1 left-2 bg-black/60 px-2 py-0.5 rounded-md text-[8px] font-bold text-white uppercase tracking-wider z-20">
                                        {p.isExisting ? 'Tersimpan' : 'Baru'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            ) : photoType === 'email' ? (
                <div className="space-y-6 text-left">
                    <div className="p-6 bg-slate-50 dark:bg-slate-900/50 rounded-3xl border border-dashed border-slate-300 flex flex-col items-center gap-4 text-center">
                        <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm">
                            <Mail className="h-10 w-10 text-primary" />
                        </div>
                        <div className="space-y-1">
                            <h4 className="font-black text-sm uppercase tracking-tight">Impor Diskusi Outlook</h4>
                            <p className="text-[10px] font-medium text-muted-foreground leading-relaxed">Pilih file berformat .msg atau .eml hasil ekspor dari Outlook sebagai bukti diskusi teknis.</p>
                        </div>
                        <Button type="button" onClick={() => fileInputRef.current?.click()} className="rounded-xl h-11 bg-primary px-8 font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20 text-white">
                            <FileArchive className="mr-2 h-4 w-4" /> Pilih Dokumen Email
                        </Button>
                        <Input ref={fileInputRef} type="file" className="hidden" accept=".msg,.eml" onChange={handleFileChange} />
                    </div>

                    {existingPhoto && !selectedFile && (
                        <div className="p-5 bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/50 rounded-2xl flex items-center justify-between gap-4 animate-in slide-in-from-bottom-2">
                            <div className="flex items-center gap-3 min-w-0 flex-1">
                                <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shrink-0">
                                    <Mail className="h-5 w-5" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-[11px] font-black text-emerald-900 dark:text-emerald-100 uppercase truncate text-left">{schedule.emailProofName || 'diskusi_email.msg'}</p>
                                    <p className="text-[9px] font-bold text-emerald-700/60 uppercase text-left">File Tersimpan</p>
                                </div>
                            </div>
                            <Button
                                type="button"
                                variant="ghost"
                                onClick={() => window.open(existingPhoto, '_blank')}
                                className="h-9 px-4 rounded-xl text-emerald-700 hover:text-emerald-800 hover:bg-emerald-100 font-bold text-xs uppercase shrink-0"
                            >
                                Unduh / Lihat
                            </Button>
                        </div>
                    )}

                    {selectedFile && (
                        <div className="p-5 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/50 rounded-2xl flex items-center gap-4 animate-in slide-in-from-bottom-2">
                            <div className="p-2.5 bg-blue-600 text-white rounded-xl shadow-lg">
                                <FileText className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <p className="text-[11px] font-black text-blue-900 dark:text-blue-100 uppercase truncate text-left">{selectedFile.name}</p>
                                <p className="text-[9px] font-bold text-blue-700/60 uppercase text-left">Tipe: {selectedFile.name.split('.').pop()?.toUpperCase()}</p>
                            </div>
                            <Button variant="ghost" size="icon" onClick={() => setSelectedFile(null)} className="rounded-full hover:bg-rose-50 hover:text-rose-600 text-black">
                                <X className="h-4 w-4" />
                            </Button>
                        </div>
                    )}
                </div>
            ) : (
                <div className="space-y-6 text-left">
                    <Input ref={docInputRef} type="file" className="hidden" onChange={handleDocUpload} accept="image/*,application/pdf" />

                    <div className="space-y-4 p-5 bg-slate-50 dark:bg-slate-900/40 rounded-[2rem] border border-slate-200 dark:border-slate-800 text-black dark:text-white">
                      <div className="flex items-center gap-2 mb-2">
                        <CircleDollarSign className="w-4 h-4 text-emerald-600" />
                        <h4 className="text-[10px] font-black uppercase text-emerald-700 dark:text-emerald-400 tracking-wider">Rincian Biaya & Bukti Otentik Servis</h4>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5 text-left">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Vendor / Pelaksana</Label>
                          <Input 
                            placeholder="Contoh: CV. Tri Bakti AC" 
                            value={vendorName}
                            onChange={(e) => setVendorName(e.target.value)}
                            className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                          />
                        </div>

                        <div className="space-y-1.5 text-left">
                          <Label className="text-[9px] font-black uppercase text-muted-foreground">Biaya Perbaikan (IDR)</Label>
                          <Input 
                            type="number"
                            placeholder="Biaya perbaikan..." 
                            value={repairCost || ''}
                            onChange={(e) => setRepairCost(Number(e.target.value))}
                            className="h-10 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 rounded-xl font-bold text-xs"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                        <DocPreviewItem
                          label="Kuitansi / Invoice"
                          url={repairInvoicePhotoURL}
                          onClear={() => setRepairInvoicePhotoURL('')}
                          onUploadClick={() => triggerDocUpload('invoice')}
                          onPreviewClick={() => setPreviewDoc({ title: 'Kuitansi / Invoice', url: repairInvoicePhotoURL })}
                          isUploading={isUploadingDoc === 'invoice'}
                        />

                        <DocPreviewItem
                          label="Surat Kerja (SPK)"
                          url={spkPhotoURL}
                          onClear={() => setSpkPhotoURL('')}
                          onUploadClick={() => triggerDocUpload('spk')}
                          onPreviewClick={() => setPreviewDoc({ title: 'Surat Kerja (SPK)', url: spkPhotoURL })}
                          isUploading={isUploadingDoc === 'spk'}
                        />

                        <DocPreviewItem
                          label="BAST Perbaikan"
                          url={bastPhotoURL}
                          onClear={() => setBastPhotoURL('')}
                          onUploadClick={() => triggerDocUpload('bast')}
                          onPreviewClick={() => setPreviewDoc({ title: 'BAST Perbaikan', url: bastPhotoURL })}
                          isUploading={isUploadingDoc === 'bast'}
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between px-1 text-black">
                        <Label className={cn(
                            "text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-left transition-colors",
                            showExistingSignature && existingPhoto ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                            {isTextMode ? <Type className="h-3 w-3" /> : <Pencil className="h-3 w-3" />}
                            Bukti Pengesahan Teknisi
                        </Label>
                        <div className="flex items-center gap-2">
                            <Button 
                                variant="outline" 
                                size="sm" 
                                disabled={isSharing}
                                onClick={handleShareSignature}
                                className="h-8 rounded-full border-purple-100 text-purple-700 hover:bg-purple-50 font-black uppercase text-[9px] tracking-widest px-4"
                            >
                                {isSharing ? <Loader2 className="h-3 w-3 animate-spin mr-1.5" /> : <Share2 className="h-3 w-3 mr-1.5" />}
                                Bagikan Link
                            </Button>
                            <div className="h-4 w-px bg-slate-200 mx-1" />
                            {!isTextMode && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 dark:bg-slate-900 rounded-full border border-slate-100 dark:border-slate-800">
                                    {['#000000', '#0000ff', '#ff0000'].map(hex => (
                                        <button 
                                            key={hex} 
                                            type="button" 
                                            onClick={() => setPenColor(hex)} 
                                            className={cn(
                                                "w-3.5 h-3.5 rounded-full transition-transform hover:scale-110", 
                                                hex === penColor ? "ring-2 ring-primary ring-offset-1" : "opacity-40"
                                            )} 
                                            style={{ backgroundColor: hex }} 
                                        />
                                    ))}
                                </div>
                            )}
                            <div className="h-4 w-px bg-slate-200 mx-1" />
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-slate-400 hover:text-primary"
                                onClick={() => setIsTextMode(!isTextMode)}
                                title={isTextMode ? "Mode Tulis" : "Mode Teks"}
                            >
                                {isTextMode ? <Pencil className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                onClick={handleClearSignature}
                            >
                                <Trash className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    </div>

                    <div className={cn(
                        "w-full h-64 rounded-3xl border-4 border-dashed bg-slate-50 dark:bg-slate-900 shadow-inner relative overflow-hidden group text-black",
                        isTextMode ? "flex items-center justify-center border-emerald-200" : "border-slate-100 dark:border-slate-800"
                    )}>
                        {isTextMode ? (
                            <Input 
                                placeholder="Ketik nama lengkap..." 
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="bg-transparent border-none text-center font-black text-2xl uppercase tracking-tighter h-full w-full focus-visible:ring-0 text-black dark:text-white"
                            />
                        ) : (
                            <>
                                {showExistingSignature && existingPhoto && (
                                    <div className="absolute inset-0 flex items-center justify-center p-8 z-0">
                                        <Image src={existingPhoto} alt="Existing Signature" fill className="object-contain opacity-50" />
                                    </div>
                                )}
                                <SignatureCanvas
                                    ref={sigPadRef}
                                    penColor={penColor}
                                    onBegin={() => setShowExistingSignature(false)}
                                    canvasProps={{ className: 'w-full h-full relative z-10' }}
                                />
                            </>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                            <ShieldCheck className="h-40 w-40" />
                        </div>
                    </div>
                </div>
            )}
          </div>

          <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex gap-3">
            <DialogClose asChild><Button variant="ghost" className="flex-1 rounded-xl h-12 font-bold text-black dark:text-white">Batal</Button></DialogClose>
            {photoType === 'completion' && schedule.completionPhotoURL && (
              <Button 
                type="button" 
                variant="outline" 
                onClick={handleDeleteSignatureFromDialog} 
                disabled={isUploading} 
                className="rounded-xl h-12 border-rose-200 text-rose-600 hover:bg-rose-50 font-bold uppercase text-xs px-4"
              >
                Hapus Tanda Tangan
              </Button>
            )}
            {photoType === 'progress' || photoType === 'email' ? (
                <Button onClick={() => handleUpload(selectedFile)} disabled={isUploading || (photoType === 'email' && !selectedFile) || (photoType === 'progress' && photos.length === 0)} className={cn("flex-[2] rounded-xl h-12 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20", photoType === 'progress' ? "bg-blue-600 hover:bg-blue-700" : "bg-slate-800 hover:bg-black")}>
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  {photoType === 'progress' ? 'Simpan Foto' : 'Unggah Email'}
                </Button>
            ) : (
                 <Button onClick={handleSaveSignature} disabled={isUploading} className="flex-[2] rounded-xl h-12 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20">
                  {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-4 w-4" />}
                  Kunci & Selesaikan
                </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); else setIsCameraOpen(true); }}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()} className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-black rounded-[2.5rem]">
            <div className="bg-slate-900 p-4 flex items-center justify-between text-white border-b border-white/10 text-left">
                <div className="flex items-center gap-2 text-left">
                    <Camera className="h-5 w-5 text-primary" />
                    <DialogTitle className="text-sm font-black uppercase tracking-widest text-white">Kamera Audit</DialogTitle>
                </div>
                <div className="flex items-center gap-2">
                    <Button 
                        variant="ghost" 
                        size="icon" 
                        className="rounded-full hover:bg-white/10 text-white"
                        onClick={() => setFacingMode(prev => prev === 'user' ? 'environment' : 'user')}
                        title="Ganti Kamera"
                    >
                        <RefreshCw className="h-4 w-4" />
                    </Button>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white" onClick={stopCamera}><X className="h-5 w-5 text-white"/></Button></DialogClose>
                </div>
            </div>
            <div className="relative aspect-video bg-black flex items-center justify-center text-left">
                <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none text-left"></div>
            </div>
            <div className="p-8 bg-slate-900 flex justify-center border-t border-white/10 text-left">
                <Button onClick={handleCaptureAndSetFile} className="h-20 w-20 rounded-full bg-primary hover:scale-105 active:scale-95 transition-all p-0 border-8 border-white/10 shadow-[0_0_30px_rgba(var(--primary),0.4)] text-left">
                    <div className="h-full w-full rounded-full border-2 border-white/30 flex items-center justify-center text-left">
                        <Camera className="h-10 w-10 text-white" />
                    </div>
                </Button>
            </div>
        </DialogContent>
      </Dialog>

      <DocumentViewerModal
        isOpen={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title || ''}
        url={previewDoc?.url || ''}
      />
    </>
  );
}
