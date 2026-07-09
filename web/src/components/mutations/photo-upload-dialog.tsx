
'use client';

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
import { Loader2, FileImage, Camera, UploadCloud, X } from 'lucide-react';
import Image from 'next/image';
import { type EnrichedAsset } from './mutation-table';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { cn } from '@/lib/utils';

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


interface PhotoUploadDialogProps {
  asset: EnrichedAsset | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function PhotoUploadDialog({ asset, isOpen, onOpenChange }: PhotoUploadDialogProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [currentPhotos, setCurrentPhotos] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && asset) {
        setCurrentPhotos(getAllDisposalPhotoUrls(asset));
    }
  }, [isOpen, asset]);

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
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handlePhotoUpload = async (fileToUpload: File | null) => {
    if (!fileToUpload || !asset) return;

    setIsUploadingPhoto(true);
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
        const photoURL = data.secure_url;
        const assetRef = doc(db, 'assets', asset.id);
        
        const updateData: { [key: string]: any } = {};
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
        if (fieldToUpdate) {
            updateData[fieldToUpdate] = photoURL;
        } else {
            updateData.disposalPhotoURL1 = photoURL;
        }

        await updateDoc(assetRef, updateData);
        
        toast({ title: 'Upload Berhasil', description: 'Foto bukti telah ditambahkan.' });
        setCurrentPhotos(prev => [...prev, photoURL]);
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploadingPhoto(false);
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
  
  return (
    <>
      <Dialog open={isOpen} onOpenChange={onOpenChange}>
        <DialogContent 
          className="dialog-upload-photo"
          onPointerDownOutside={(e) => e.preventDefault()}
        >
          <DialogHeader>
            <DialogTitle>Upload Foto Bukti Disposal</DialogTitle>
            <DialogDescription>
              Upload foto bukti serah terima untuk aset <span className="font-bold">{asset?.name}</span>.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-2">
              <Button type="button" onClick={() => fileInputRef.current?.click()}><FileImage className="mr-2 h-4 w-4" /> Pilih File</Button>
              <Button type="button" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4" /> Buka Kamera</Button>
              <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
            </div>
            {previewUrl && (
              <div className="p-2 border rounded-md bg-muted flex items-center justify-center flex-col gap-2">
                <Image src={previewUrl} alt="Preview" width={200} height={200} className="rounded-md object-contain" />
                <Button size="sm" onClick={() => handlePhotoUpload(selectedFile)} disabled={isUploadingPhoto}>
                  {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <UploadCloud className="mr-2 h-4 w-4" />}
                  Upload Foto Ini
                </Button>
              </div>
            )}
            <div className="mt-4">
              <p className="font-medium text-sm mb-2">Foto yang sudah diupload:</p>
              <div className="flex flex-wrap gap-2">
                {currentPhotos.map((url, index) => (
                  <div key={index} className="relative w-24 h-24">
                    <Image src={url} alt={`Bukti ${index + 1}`} fill className="object-cover rounded-md border" />
                  </div>
                ))}
                {currentPhotos.length === 0 && (
                  <p className="text-xs text-muted-foreground">Belum ada foto.</p>
                )}
              </div>
            </div>
          </div>
           <DialogFooter>
                <DialogClose asChild><Button variant="secondary">Tutup</Button></DialogClose>
           </DialogFooter>
        </DialogContent>
      </Dialog>
      
      <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); else setIsCameraOpen(true); }}>
        <DialogContent onPointerDownOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>Ambil Foto</DialogTitle>
            <DialogDescription>Arahkan kamera ke bukti fisik aset.</DialogDescription>
          </DialogHeader>
          <div className="relative mb-2">
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-auto rounded-md" />
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <DialogFooter>
            <Button variant="secondary" onClick={stopCamera}>Tutup</Button>
            <Button onClick={handleCaptureAndUpload} disabled={isUploadingPhoto}>
              {isUploadingPhoto ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Camera className="mr-2 h-4 w-4" />}
              Ambil & Upload
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
