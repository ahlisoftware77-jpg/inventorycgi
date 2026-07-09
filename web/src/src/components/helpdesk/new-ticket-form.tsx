

'use client';

import { useState, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, getDocs, where } from 'firebase/firestore';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Loader2, ArrowLeft, Camera, FileImage, UploadCloud } from 'lucide-react';
import { type TicketCategory, type TicketPriority } from '@/lib/types';
import { ticketSchema } from '@/lib/schemas';
import Link from 'next/link';
import Image from 'next/image';

type TicketFormValues = z.infer<typeof ticketSchema>;

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const quickSituations = [
    { label: 'Tidak bisa print', text: 'Printer tidak bisa mencetak. Sudah coba restart printer dan komputer.' },
    { label: 'Komputer lambat', text: 'Komputer terasa sangat lambat saat membuka aplikasi.' },
    { label: 'Tidak bisa konek internet', text: 'Tidak bisa terhubung ke jaringan internet/WiFi.' },
    { label: 'Lupa password', text: 'Lupa password untuk login ke komputer.' },
    { label: 'Aplikasi error', text: 'Aplikasi [NAMA APLIKASI] error / tidak bisa dibuka.' },
    { label: 'Instal software', text: 'Minta instalasi software baru: [NAMA SOFTWARE].' },
    { label: 'Disconnect email', text: 'Email disconnect, tidak bisa mengirim atau menerima email.' },
];

export default function NewTicketForm() {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      description: '',
      priority: 'Normal',
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined;

    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', selectedFile);
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
  
  async function generateTicketNumber(): Promise<string> {
    const date = new Date();
    const prefix = `CGI-${date.getFullYear()}${(date.getMonth() + 1).toString().padStart(2, '0')}${date.getDate().toString().padStart(2, '0')}-`;
    const ticketsRef = collection(db, 'helpdesk_tickets');
    const q = query(ticketsRef, where('ticketNumber', '>=', prefix), where('ticketNumber', '<', prefix + 'z'));
    const querySnapshot = await getDocs(q);
    const sequence = querySnapshot.size + 1;
    return `${prefix}${sequence.toString().padStart(4, '0')}`;
  }

  async function onSubmit(values: TicketFormValues) {
    if (!user) {
      toast({ variant: 'destructive', title: 'Anda harus login untuk membuat tiket.' });
      return;
    }
    
    setIsLoading(true);

    try {
      const photoURL = await handleUpload();
      
      const ticketNumber = await generateTicketNumber();

      await addDoc(collection(db, 'helpdesk_tickets'), {
        ticketNumber,
        category: values.category as TicketCategory,
        priority: values.priority as TicketPriority,
        description: values.description,
        photoURL: photoURL || '',
        status: 'Menunggu',
        reportedBy: user.uid,
        reporterName: user.displayName,
        reporterDept: user.department,
        reportedAt: serverTimestamp(),
        updates: [],
      });

      toast({
        title: 'Tiket Berhasil Dibuat',
        description: `Nomor tiket Anda adalah ${ticketNumber}.`,
      });
      router.push('/helpdesk');
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Tiket', description: 'Terjadi kesalahan.' });
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
            }
        }, 'image/jpeg');
        // Do not close the dialog, let the user decide
    }
  };
  
  const handleQuickSituation = (text: string) => {
    const currentDescription = form.getValues('description');
    const newDescription = currentDescription ? `${currentDescription}\n${text}` : text;
    form.setValue('description', newDescription);
  };

  return (
    <>
      <Card className="w-full max-w-2xl mx-auto">
        <CardHeader>
          <div className="flex items-center gap-4">
              <Button asChild variant="outline" size="icon">
                  <Link href="/helpdesk"><ArrowLeft className="h-4 w-4" /></Link>
              </Button>
              <div>
                  <CardTitle>Lapor Masalah Baru</CardTitle>
                  <CardDescription>Jelaskan masalah teknis yang Anda hadapi.</CardDescription>
              </div>
          </div>
        </CardHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField
                    control={form.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Jenis Masalah</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih jenis masalah..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Hardware">Hardware (Komputer, Printer, dll)</SelectItem>
                            <SelectItem value="Software">Software (Aplikasi, OS, Error)</SelectItem>
                            <SelectItem value="Jaringan">Jaringan (Internet, Wifi, LAN)</SelectItem>
                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                   <FormField
                    control={form.control}
                    name="priority"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tingkat Situasi / Prioritas</FormLabel>
                        <Select onValueChange={field.onChange} defaultValue={field.value}>
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Pilih prioritas..." />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="Rendah">Rendah</SelectItem>
                            <SelectItem value="Normal">Normal</SelectItem>
                            <SelectItem value="Tinggi">Tinggi</SelectItem>
                            <SelectItem value="Kritis">Kritis</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
              </div>
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deskripsi Masalah</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Jelaskan masalah Anda secara detail. Sertakan pesan error jika ada."
                        className="min-h-[150px]"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="space-y-2">
                  <Label>Situasi Tambahan yang Sering Digunakan</Label>
                  <div className="flex flex-wrap gap-2">
                      {quickSituations.map(situation => (
                          <Button
                              type="button"
                              key={situation.label}
                              variant="outline"
                              size="sm"
                              onClick={() => handleQuickSituation(situation.text)}
                          >
                              {situation.label}
                          </Button>
                      ))}
                  </div>
              </div>
              <div className="space-y-2">
                  <Label>Lampirkan Foto (Opsional)</Label>
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
                      <div className="mt-2 flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                          <Image src={previewUrl} alt="Preview" width={60} height={60} className="rounded-md object-cover" />
                          <span className="text-sm truncate max-w-48">{selectedFile?.name}</span>
                      </div>
                  )}
              </div>
            </CardContent>
            <CardFooter>
              <Button type="submit" disabled={isLoading || isUploading} className="w-full">
                {(isLoading || isUploading) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kirim Laporan
              </Button>
            </CardFooter>
          </form>
        </Form>
      </Card>
      <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
          <DialogContent>
              <DialogHeader>
                  <DialogTitle>Ambil Foto Masalah</DialogTitle>
              </DialogHeader>
              <div className="relative mb-2">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md" />
                  <canvas ref={canvasRef} className="hidden" />
              </div>
               {previewUrl && (
                <div className="flex items-center justify-center gap-2 p-2 border rounded-md bg-muted">
                    <Image src={previewUrl} alt="Preview" width={60} height={60} className="rounded-md object-cover" />
                    <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                    <Button variant="secondary" onClick={() => handleUpload()} disabled={isUploading}>
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
