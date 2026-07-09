'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, getDocs, where } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Loader2, Camera, FileImage, UploadCloud, X, Send, AlertTriangle, FileText, CheckCircle2, Zap, MessageSquare } from 'lucide-react';
import { type TicketCategory, type TicketPriority } from '@/lib/types';
import { ticketSchema } from '@/lib/schemas';
import Image from 'next/image';
import { z } from 'zod';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';

type TicketFormValues = z.infer<typeof ticketSchema>;

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

const quickSituations = [
    { label: 'Tidak bisa print', text: 'Printer tidak bisa mencetak. Sudah coba restart printer dan komputer.' },
    { label: 'Komputer lambat', text: 'Komputer terasa sangat lambat saat membuka aplikasi.' },
    { label: 'Internet Putus', text: 'Tidak bisa terhubung ke jaringan internet/WiFi.' },
    { label: 'Error Aplikasi', text: 'Aplikasi [NAMA APLIKASI] error / tidak bisa dibuka.' },
];

interface NewTicketFormProps {
    onComplete?: () => void;
}

export default function NewTicketForm({ onComplete }: NewTicketFormProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [lastTicket, setLastTicket] = useState<{ id: string, number: string, description: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const form = useForm<TicketFormValues>({
    resolver: zodResolver(ticketSchema),
    defaultValues: {
      description: '',
      priority: 'Normal',
    },
  });

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

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      if (file.type.startsWith('image/')) {
        setPreviewUrl(URL.createObjectURL(file));
      } else {
        setPreviewUrl(null);
      }
    }
  };

  const handlePaste = useCallback((event: React.ClipboardEvent) => {
    const items = event.clipboardData.items;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const blob = items[i].getAsFile();
        if (blob) {
          const pastedFile = new File([blob], `reply-pasted-${Date.now()}.png`, { type: blob.type });
          setSelectedFile(pastedFile);
          setPreviewUrl(URL.createObjectURL(pastedFile));
          toast({ 
            title: 'Gambar Ditempel', 
            description: 'Screenshot berhasil dilampirkan dari clipboard.',
          });
        }
      }
    }
  }, [toast]);

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
      if (response.ok) return data.secure_url;
      else throw new Error(data.error.message || 'Gagal upload.');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal' });
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
      toast({ variant: 'destructive', title: 'Anda harus login.' });
      return;
    }
    
    setIsLoading(true);
    try {
      const photoURL = await handleUpload();
      const ticketNumber = await generateTicketNumber();

      const newDoc = await addDoc(collection(db, 'helpdesk_tickets'), {
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

      await addDoc(collection(db, 'system_logs'), {
        type: 'HELPDESK',
        action: 'CREATE_TICKET',
        description: `Melaporkan kendala IT baru: "${values.description.substring(0, 50)}..."`,
        targetId: newDoc.id,
        targetCode: ticketNumber,
        targetName: values.description.substring(0, 50),
        userId: user.uid,
        userName: user.displayName || user.email,
        userDept: user.department || 'N/A',
        timestamp: serverTimestamp(),
      });

      setLastTicket({ id: newDoc.id, number: ticketNumber, description: values.description });
      setIsSuccess(true);
      toast({ title: 'Tiket Berhasil Dibuat', description: `Nomor tiket Anda: ${ticketNumber}` });
    } catch (error) {
      console.error("Error creating ticket:", error);
      toast({ variant: 'destructive', title: 'Gagal Membuat Tiket' });
    } finally {
      setIsLoading(false);
    }
  }

  const handleGoToOfficialForm = () => {
    if (!lastTicket) return;
    const problem = encodeURIComponent(lastTicket.description);
    const dept = encodeURIComponent(user?.department || '');
    const ticketId = lastTicket.id;
    router.push(`/it-problem-form?problem=${problem}&dept=${dept}&ticketId=${ticketId}`);
    if (onComplete) onComplete();
  };

  useEffect(() => {
    const startCamera = async () => {
        if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                streamRef.current = stream;
                if (videoRef.current) videoRef.current.srcObject = stream;
            } catch (err) {
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

  const handleCapture = () => {
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
                stopCamera();
            }
        }, 'image/jpeg');
    }
  };

  if (isSuccess) {
    return (
        <div className="flex flex-col h-full w-full bg-white dark:bg-slate-950 p-10 items-center justify-center text-center gap-6 animate-in zoom-in-95 duration-500">
            <div className="p-6 bg-emerald-50 rounded-full">
                <CheckCircle2 className="h-20 w-20 text-emerald-600" />
            </div>
            <div className="space-y-2">
                <h2 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Laporan Terkirim!</h2>
                <p className="text-muted-foreground font-medium">Tiket bantuan Anda dengan nomor <span className="text-primary font-black">{lastTicket?.number}</span> telah berhasil dibuat.</p>
            </div>
            
            <div className="bg-blue-50 border border-blue-100 p-6 rounded-3xl max-w-sm space-y-4">
                <p className="text-xs font-bold text-blue-800 leading-relaxed uppercase text-left">
                    Mohon lengkapi juga formulir resmi 0-32-028 untuk keperluan arsip administrasi & tanda tangan digital.
                </p>
                <Button onClick={handleGoToOfficialForm} className="w-full h-12 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest shadow-xl shadow-blue-600/20">
                    <FileText className="mr-2 h-5 w-5" /> Isi Form Resmi (0-32-028)
                </Button>
            </div>

            <Button variant="ghost" onClick={onComplete} className="rounded-xl font-bold uppercase text-[10px] tracking-[0.2em] text-muted-foreground hover:text-slate-900">Tutup & Kembali</Button>
        </div>
    );
  }

  return (
    <Form {...form}>
        <form 
          onPaste={handlePaste}
          onSubmit={form.handleSubmit(onSubmit)} 
          className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-hidden relative"
        >
            <ScrollArea className="flex-1">
                <div className="p-6 space-y-8 max-w-2xl mx-auto pb-20">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <FormField
                            control={form.control}
                            name="category"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-left">Jenis Masalah</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 bg-background border-slate-200 rounded-xl shadow-sm focus:ring-primary/20">
                                        <SelectValue placeholder="Pilih jenis..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Hardware">Hardware</SelectItem>
                                    <SelectItem value="Software">Software</SelectItem>
                                    <SelectItem value="Jaringan">Jaringan</SelectItem>
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
                                <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-left">Tingkat Situasi</FormLabel>
                                <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                    <SelectTrigger className="h-12 bg-background border-slate-200 rounded-xl shadow-sm focus:ring-primary/20">
                                        <SelectValue placeholder="Pilih prioritas..." />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Rendah" className="text-slate-500 font-bold text-left">Rendah (Low)</SelectItem>
                                    <SelectItem value="Normal" className="text-blue-600 font-bold text-left">Normal</SelectItem>
                                    <SelectItem value="Tinggi" className="text-orange-600 font-bold text-left">Tinggi (High)</SelectItem>
                                    <SelectItem value="Kritis" className="text-rose-600 font-black text-left">Kritis (Critical)</SelectItem>
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
                            <FormLabel className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1 text-left">Deskripsi Masalah</FormLabel>
                            <FormControl>
                            <div className="relative">
                                <Textarea
                                    placeholder="Jelaskan masalah Anda secara detail agar tim IT dapat memahami situasi dengan cepat..."
                                    className="min-h-[160px] bg-background border-slate-200 rounded-2xl p-6 resize-none leading-relaxed shadow-inner focus:ring-primary/20 text-black dark:text-white text-left"
                                    {...field}
                                />
                                <div className="absolute bottom-3 right-4 opacity-20 pointer-events-none">
                                    <MessageSquare className="h-5 w-5" />
                                </div>
                            </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest flex items-center gap-2 text-left">
                            <Zap className="h-3 w-3 text-primary" /> Template Cepat
                        </Label>
                        <div className="flex flex-wrap gap-2">
                            {quickSituations.map(situation => (
                                <Button
                                    key={situation.label}
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={() => form.setValue('description', situation.text)}
                                    className="text-[10px] h-8 rounded-xl font-bold uppercase border-slate-100 bg-white hover:bg-primary/5 hover:text-primary transition-all shadow-sm text-black"
                                >
                                    {situation.label}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-4">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left block">Lampiran Visual (Bisa Paste Screenshot)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button type="button" variant="outline" className="h-12 rounded-xl font-bold border-slate-200 bg-white text-black" onClick={() => fileInputRef.current?.click()}>
                                <FileImage className="mr-2 h-4 w-4 text-blue-600" /> Pilih File
                            </Button>
                            <Button type="button" variant="outline" className="h-12 rounded-xl font-bold border-slate-200 bg-white text-black" onClick={() => setIsCameraOpen(true)}>
                                <Camera className="mr-2 h-4 w-4 text-blue-600" /> Buka Kamera
                            </Button>
                            <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                        </div>
                        {previewUrl && (
                            <div className="p-4 border-2 border-dashed border-primary/20 rounded-3xl bg-white dark:bg-slate-900 flex items-center gap-4 animate-in zoom-in-95 shadow-xl">
                                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-white shadow-md shrink-0">
                                    <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-black truncate text-slate-900 dark:text-white uppercase leading-tight text-left">{selectedFile?.name || 'Lampiran Gambar'}</p>
                                    <p className="text-[10px] text-emerald-600 font-black tracking-widest mt-1 uppercase text-left">✓ SIAP UNTUK DIKIRIM</p>
                                </div>
                                <Button size="icon" variant="ghost" className="h-10 w-10 rounded-full hover:bg-rose-50 hover:text-rose-600 shrink-0 text-black" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}><X className="h-5 w-5" /></Button>
                            </div>
                        )}
                    </div>

                    <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-3xl border border-amber-200 dark:border-amber-900/50 flex items-start gap-4">
                        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                        <p className="text-xs leading-relaxed text-amber-900 dark:text-amber-200 font-medium text-left">
                            Laporan akan diproses sesuai antrean dan prioritas. Gunakan fitur <strong>Chat</strong> di dalam tiket setelah terkirim untuk berdiskusi dengan teknisi IT.
                        </p>
                    </div>
                </div>
                <ScrollBar orientation="vertical" />
            </ScrollArea>

            {/* Footer - Fixed */}
            <div className="p-6 bg-white dark:bg-slate-950 border-t flex gap-3 shrink-0 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
                <Button type="button" variant="ghost" className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest text-slate-400" onClick={onComplete}>Batal</Button>
                <Button type="submit" disabled={isLoading || isUploading} className="flex-[2] rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-primary/20 transition-all active:scale-95">
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Send className="mr-2 h-5 w-5" />}
                    Kirim Laporan
                </Button>
            </div>
        </form>

        <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); else setIsCameraOpen(true); }}>
            <DialogContent 
              onPointerDownOutside={(e) => e.preventDefault()}
              className="p-0 overflow-hidden sm:max-w-md border-none shadow-3xl bg-black rounded-3xl mx-auto text-left" 
            >
                <div className="p-4 bg-slate-900/80 backdrop-blur-md flex items-center justify-between text-white border-b border-white/10 text-left">
                    <div className="flex items-center gap-2 text-left">
                        <Camera className="h-5 w-5 text-primary" />
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-left text-white">Kamera</DialogTitle>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white" onClick={stopCamera}><X className="h-5 w-5 text-white"/></Button></DialogClose>
                </div>
                <div className="relative aspect-video bg-black flex items-center justify-center text-left">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="hidden" />
                    <div className="absolute inset-0 border-[30px] border-black/20 pointer-events-none text-left"></div>
                </div>
                <div className="p-8 bg-slate-900 flex justify-center border-t border-white/10 text-left">
                    <Button onClick={handleCapture} className="h-20 w-20 rounded-full bg-primary hover:scale-105 active:scale-95 transition-all p-0 border-8 border-white/10 shadow-[0_0_30px_rgba(var(--primary),0.4)] text-left">
                        <div className="h-full w-full rounded-full border-2 border-white/30 flex items-center justify-center text-left">
                            <Camera className="h-10 w-10 text-white" />
                        </div>
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    </Form>
  );
}