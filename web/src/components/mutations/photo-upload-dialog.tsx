'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
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
import { Badge } from '@/components/ui/badge';
import { Loader2, FileImage, Camera, UploadCloud, X, Trash2, Eye, EyeOff, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
import Image from 'next/image';
import { type EnrichedAsset } from './mutation-table';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';
import { DocumentViewerModal } from '@/components/maintenance/document-viewer-modal';

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const getAllDisposalPhotoUrls = (asset: Asset | null): string[] => {
    if (!asset) return [];
    return [
        asset.disposalPhotoURL1,
        asset.disposalPhotoURL2,
        asset.disposalPhotoURL3,
        asset.disposalPhotoURL4,
    ].filter((url): url is string => !!url);
};

const checkIfPdf = (url: string) => {
    if (!url) return false;
    const lower = url.toLowerCase();
    return lower.includes('.pdf') || lower.includes('/raw/') || lower.includes('/files/');
};

interface PhotoUploadDialogProps {
  asset: EnrichedAsset | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhotoUploadDialog({ asset, isOpen, onOpenChange }: PhotoUploadDialogProps) {
  const { user } = useAuth();
  const isAdmin = user?.role === 'Admin';

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isDeletingIndex, setIsDeletingIndex] = useState<number | null>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const [isPhotoPublic, setIsPhotoPublic] = useState<boolean>(true);
  const [isTogglingVisibility, setIsTogglingVisibility] = useState(false);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && asset) {
        setCurrentPhotos(getAllDisposalPhotoUrls(asset));
        setIsPhotoPublic(asset.isDisposalPhotoPublic !== false);
    }
  }, [isOpen, asset]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;

    const handleGlobalPaste = (e: ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.indexOf('image') !== -1 || items[i].type.indexOf('pdf') !== -1) {
          const blob = items[i].getAsFile();
          if (blob) {
            const ext = blob.type.includes('pdf') ? 'pdf' : 'png';
            const file = new File([blob], `paste-${Date.now()}.${ext}`, { type: blob.type });
            setSelectedFile(file);
            setPreviewUrl(blob.type.includes('pdf') ? 'pdf' : URL.createObjectURL(file));
            toast({
              title: "File Ditempel (Paste)",
              description: "File bukti telah ditempel. Klik 'Upload File Ini' untuk mengunggah."
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
  }, [isOpen, isAdmin, toast]);

  const stopCamera = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setIsCameraOpen(false);
  }, []);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf')) {
        setPreviewUrl('pdf');
      } else {
        setPreviewUrl(URL.createObjectURL(file));
      }
    }
  };

  const handleToggleVisibility = async () => {
    if (!isAdmin || !asset) return;
    setIsTogglingVisibility(true);
    const nextPublicState = !isPhotoPublic;
    try {
      const assetRef = doc(db, 'assets', asset.id);
      await updateDoc(assetRef, { isDisposalPhotoPublic: nextPublicState });
      setIsPhotoPublic(nextPublicState);
      toast({
        title: nextPublicState ? 'Visibilitas Terbuka' : 'Visibilitas Dibatasi (Privat)',
        description: nextPublicState 
          ? 'Bukti lampiran disposal kini dapat dilihat oleh seluruh karyawan / publik.' 
          : 'Bukti lampiran disposal hanya dapat dilihat oleh Admin.'
      });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Mengubah Visibilitas', description: error.message });
    } finally {
      setIsTogglingVisibility(false);
    }
  };

  const handlePhotoUpload = async (fileToUpload: File | null) => {
    if (!isAdmin) {
      toast({ variant: 'destructive', title: 'Akses Ditolak', description: 'Hanya Admin yang berwenang mengunggah bukti disposal.' });
      return;
    }
    if (!fileToUpload || !asset) return;

    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      // Gunakan auto/upload agar Cloudinary otomatis menangani gambar dan PDF
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const photoURL = data.secure_url;
        const assetRef = doc(db, 'assets', asset.id);
        
        const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
        
        const currentAssetSnap = await getDoc(assetRef);
        const currentAssetData = currentAssetSnap.data() as Asset;

        let fieldToUpdate: string | null = null;
        for (const field of photoFields) {
          if (!currentAssetData[field]) {
            fieldToUpdate = field;
            break;
          }
        }
        
        const updateData: { [key: string]: any } = {};
        if (fieldToUpdate) {
            updateData[fieldToUpdate] = photoURL;
        } else {
            updateData.disposalPhotoURL1 = photoURL;
        }

        await updateDoc(assetRef, updateData);
        
        toast({ title: 'Upload Berhasil', description: 'Lampiran bukti disposal telah ditambahkan.' });
        setCurrentPhotos(prev => [...prev, photoURL]);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah file.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const handleDeletePhoto = async (indexToDelete: number) => {
    if (!isAdmin || !asset) {
      toast({ variant: 'destructive', title: 'Akses Ditolak', description: 'Hanya Admin yang dapat menghapus lampiran disposal.' });
      return;
    }

    setIsDeletingIndex(indexToDelete);
    try {
      const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
      
      const newPhotos = currentPhotos.filter((_, idx) => idx !== indexToDelete);
      const assetRef = doc(db, 'assets', asset.id);
      
      const updateData: Record<string, any> = {};
      for (let i = 0; i < photoFields.length; i++) {
        updateData[photoFields[i]] = newPhotos[i] || null;
      }
      
      await updateDoc(assetRef, updateData);
      setCurrentPhotos(newPhotos);
      toast({ title: 'Lampiran Dihapus', description: 'Bukti lampiran disposal telah berhasil dihapus.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus Lampiran', description: error.message });
    } finally {
      setIsDeletingIndex(null);
    }
  };

  useEffect(() => {
    const startCamera = async () => {
        if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
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
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
        streamRef.current = null;
      }
    };
  }, [isCameraOpen, toast]);

  const handleCaptureAndUpload = async () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        
        const blob = await new Promise<Blob|null>(resolve => canvas.toBlob(resolve, 'image/jpeg'));
        if (blob) {
            const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
            await handlePhotoUpload(capturedFile);
        }
        stopCamera();
    }
  };
  
  const isSelectedFilePdf = selectedFile?.type === 'application/pdf' || selectedFile?.name.toLowerCase().endsWith('.pdf') || previewUrl === 'pdf';

  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
          hideCloseButton
          className="sm:max-w-xl rounded-[2.5rem] p-0 border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-950 text-black dark:text-white"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader className="p-6 sm:p-8 bg-slate-900 text-white shrink-0 relative flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-black uppercase tracking-tight flex items-center gap-2">
                <FileImage className="w-5 h-5 text-emerald-400" />
                <span>Lampiran Bukti Disposal (Foto / PDF)</span>
              </DialogTitle>
              <DialogClose asChild>
                <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white h-8 w-8">
                  <X className="w-5 h-5" />
                </Button>
              </DialogClose>
            </div>

            <DialogDescription className="text-white/60 text-xs font-medium">
              Dokumentasi bukti serah terima, foto fisik & berkas PDF aset <span className="text-white font-bold">{asset?.name}</span> ({asset?.code})
            </DialogDescription>

            {/* Admin Visibilitas Control Toggle */}
            {isAdmin && (
              <div className="mt-2 pt-3 border-t border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge className={cn("text-[9px] font-black uppercase px-2.5 py-0.5 rounded-full border-none", isPhotoPublic ? "bg-emerald-500 text-white" : "bg-amber-500 text-white")}>
                    {isPhotoPublic ? '👁️ Visibilitas Terbuka' : '🔒 Dibatasi Admin'}
                  </Badge>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={handleToggleVisibility} 
                  disabled={isTogglingVisibility}
                  className="h-7 px-3 rounded-full text-[9px] font-black uppercase tracking-wider bg-white/10 text-white border-white/20 hover:bg-white/20 transition-all"
                >
                  {isTogglingVisibility ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : (isPhotoPublic ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />)}
                  {isPhotoPublic ? 'Batasi (Privat)' : 'Buka ke Publik'}
                </Button>
              </div>
            )}
          </DialogHeader>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Hanya Admin yang Bisa Upload / Edit */}
            {isAdmin ? (
              <div className="space-y-3 p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Tambah Lampiran Bukti Baru (Foto / PDF):</p>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" variant="default" size="sm" onClick={() => fileInputRef.current?.click()} className="rounded-xl font-bold text-xs bg-slate-900 hover:bg-black text-white">
                    <FileImage className="mr-2 h-4 w-4" /> Pilih File (Foto / PDF)
                  </Button>
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCameraOpen(true)} className="rounded-xl font-bold text-xs">
                    <Camera className="mr-2 h-4 w-4" /> Ambil Kamera
                  </Button>
                  <Input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,application/pdf" onChange={handleFileChange} />
                </div>
                <p className="text-[10px] text-muted-foreground italic text-left">
                  Tips: Anda dapat memilih berkas PDF atau menempelkan gambar langsung dari clipboard (Ctrl+V).
                </p>
              </div>
            ) : (
              <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900 flex items-center gap-3 text-amber-800 dark:text-amber-300">
                <ShieldAlert className="w-5 h-5 shrink-0 text-amber-600" />
                <p className="text-xs font-bold text-left">
                  Hanya Admin yang berwenang mengunggah, mengedit, atau menghapus berkas bukti disposal.
                </p>
              </div>
            )}

            {/* Preview sebelum upload */}
            {selectedFile && isAdmin && (
              <div className="p-4 border rounded-2xl bg-slate-100 dark:bg-slate-900 flex flex-col items-center gap-3 text-center">
                {isSelectedFilePdf ? (
                  <div className="p-4 flex flex-col items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-2xl w-full max-w-sm">
                    <FileText className="w-12 h-12 text-rose-500" />
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate max-w-full">{selectedFile.name}</p>
                    <Badge variant="outline" className="text-[9px] font-black uppercase text-rose-600 border-rose-300 bg-white">Dokumen PDF</Badge>
                  </div>
                ) : (
                  previewUrl && (
                    <div className="relative w-48 h-48 rounded-xl overflow-hidden border shadow-md">
                      <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                    </div>
                  )
                )}
                <div className="flex gap-2 mt-1">
                  <Button size="sm" variant="ghost" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>Batal</Button>
                  <Button size="sm" onClick={() => handlePhotoUpload(selectedFile)} disabled={isUploadingPhoto} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
                    {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                    Upload File Ini
                  </Button>
                </div>
              </div>
            )}

            {/* Galeri Lampiran Disposal */}
            <div className="space-y-3 text-left">
              <div className="flex items-center justify-between">
                <p className="font-black text-xs uppercase tracking-wider text-slate-700 dark:text-slate-300">
                  Daftar Lampiran Bukti ({currentPhotos.length} / 4):
                </p>
                {!isPhotoPublic && !isAdmin && (
                  <Badge variant="outline" className="text-[9px] font-bold text-amber-600 border-amber-300 bg-amber-50">Privat</Badge>
                )}
              </div>

              {!isPhotoPublic && !isAdmin ? (
                <div className="p-8 text-center rounded-2xl bg-slate-100 dark:bg-slate-900 border border-dashed border-slate-300 dark:border-slate-800">
                  <EyeOff className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs font-bold text-slate-500 uppercase">Visibilitas Dokumen Dibatasi</p>
                  <p className="text-[10px] text-muted-foreground mt-1">Berkas bukti disposal ini diatur privat dan hanya dapat diakses oleh Admin.</p>
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {currentPhotos.map((url, index) => {
                    const isPdf = checkIfPdf(url);
                    return isPdf ? (
                      <div 
                        key={index} 
                        onClick={() => setPreviewDoc({ title: `Bukti Lampiran PDF ${index + 1}`, url })}
                        className="relative group aspect-square rounded-2xl overflow-hidden border border-rose-200 dark:border-rose-900/60 bg-rose-50/60 dark:bg-rose-950/30 shadow-sm flex flex-col items-center justify-center p-2 text-center cursor-pointer hover:border-rose-400 transition-all"
                      >
                        <FileText className="w-8 h-8 text-rose-500 mb-1 group-hover:scale-110 transition-transform" />
                        <span className="text-[9px] font-black uppercase text-rose-600 tracking-wider">PDF</span>
                        <span className="text-[8px] font-bold text-slate-400 uppercase truncate max-w-[80px]">Bukti {index + 1}</span>
                        
                        <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-rose-700 text-[10px] font-black uppercase tracking-wider">
                          Pratinjau PDF
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(index); }}
                            disabled={isDeletingIndex === index}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-transform active:scale-90 z-10"
                            title="Hapus PDF Ini"
                          >
                            {isDeletingIndex === index ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    ) : (
                      <div 
                        key={index} 
                        onClick={() => setPreviewDoc({ title: `Bukti Lampiran Foto ${index + 1}`, url })}
                        className="relative group aspect-square rounded-2xl overflow-hidden border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900 shadow-sm cursor-pointer hover:border-slate-400 transition-all"
                      >
                        <Image src={url} alt={`Bukti ${index + 1}`} fill className="object-cover transition-transform duration-300 group-hover:scale-105" />
                        
                        <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[10px] font-bold uppercase tracking-wider">
                          Pratinjau Foto
                        </div>

                        {isAdmin && (
                          <button
                            type="button"
                            onClick={(e) => { e.stopPropagation(); handleDeletePhoto(index); }}
                            disabled={isDeletingIndex === index}
                            className="absolute top-1.5 right-1.5 p-1.5 rounded-full bg-rose-600 text-white shadow-md hover:bg-rose-700 transition-transform active:scale-90 z-10"
                            title="Hapus Foto Ini"
                          >
                            {isDeletingIndex === index ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="w-3.5 h-3.5" />
                            )}
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {currentPhotos.length === 0 && (
                    <div className="col-span-full p-8 text-center rounded-2xl bg-slate-50 dark:bg-slate-900/40 border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <FileImage className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                      <p className="text-xs font-bold text-slate-400 uppercase">Belum ada lampiran bukti disposal</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-100 dark:border-slate-800 flex justify-end">
            <DialogClose asChild>
              <Button variant="outline" className="rounded-full px-8 font-bold text-xs">Tutup</Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Kamera Popup */}
      <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); else setIsCameraOpen(true); }}>
        <DialogContent hideCloseButton onPointerDownOutside={(e) => e.preventDefault()} className="sm:max-w-lg rounded-[2.5rem] p-6 text-black dark:text-white">
          <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b">
            <DialogTitle className="text-base font-black uppercase">Ambil Foto Bukti</DialogTitle>
            <Button variant="ghost" size="icon" onClick={stopCamera} className="rounded-full h-8 w-8"><X className="w-4 h-4" /></Button>
          </DialogHeader>
          <div className="relative my-4 rounded-2xl overflow-hidden bg-black aspect-video flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter className="flex gap-2">
            <Button variant="outline" onClick={stopCamera} className="rounded-full flex-1 font-bold">Batal</Button>
            <Button onClick={handleCaptureAndUpload} disabled={isUploadingPhoto} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-full flex-1 font-bold">
              {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Ambil & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Preview PDF / Dokumen Popup */}
      {previewDoc && (
        <DocumentViewerModal
          isOpen={!!previewDoc}
          onOpenChange={(open) => !open && setPreviewDoc(null)}
          title={previewDoc.title}
          url={previewDoc.url}
        />
      )}
    </>
  );
}
