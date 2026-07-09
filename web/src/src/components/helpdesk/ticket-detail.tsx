

'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type HelpdeskTicket, type TicketStatus, type TicketPriority } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ArrowLeft, Loader2, Send, Paperclip, Camera, Smile, UploadCloud } from 'lucide-react';
import Link from 'next/link';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '../ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker, { type EmojiClickData } from 'emoji-picker-react';


const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
    <div>
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value || '-'}</p>
    </div>
);

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

export default function TicketDetail({ ticketId }: { ticketId: string }) {
  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const [updateNote, setUpdateNote] = useState('');
  const [newStatus, setNewStatus] = useState<TicketStatus | ''>('');
  const [newPriority, setNewPriority] = useState<TicketPriority | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'helpdesk_tickets', ticketId);

    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const ticketData = { id: docSnap.id, ...docSnap.data() } as HelpdeskTicket;
        setTicket(ticketData);
        setNewStatus(ticketData.status);
        setNewPriority(ticketData.priority || 'Normal');
      } else {
        toast({ variant: 'destructive', title: 'Tiket tidak ditemukan' });
        setTicket(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ticket:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId, toast, user?.uid]);
  
  useEffect(() => {
    if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
    }
  }, [ticket?.updates]);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleUpload = async (): Promise<string | undefined> => {
    if (!selectedFile) return undefined;

    setIsUpdating(true);
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
      setIsUpdating(false);
    }
  };


  const handleUpdateTicket = async () => {
    if (!user || !ticket) return;
    const hasStatusChanged = newStatus !== ticket.status;
    const hasPriorityChanged = newPriority !== (ticket.priority || 'Normal');
    
    if (!updateNote && !selectedFile && !hasStatusChanged && !hasPriorityChanged) {
        toast({ variant: 'destructive', title: 'Tidak ada perubahan', description: 'Mohon isi catatan, lampirkan file, atau ubah status/prioritas.' });
        return;
    }
    
    setIsUpdating(true);

    try {
        const attachmentURL = await handleUpload();

        const ticketRef = doc(db, 'helpdesk_tickets', ticketId);
        
        const updateData: any = {};
        
        if (updateNote || attachmentURL) {
            const newUpdate = {
                note: updateNote,
                attachmentURL: attachmentURL || '',
                updatedBy: user.uid,
                updaterName: user.displayName || user.email,
                updatedAt: Timestamp.now(),
            };
            updateData.updates = arrayUnion(newUpdate);
        }
        
        if (isAdmin) {
            if (hasStatusChanged) updateData.status = newStatus;
            if (hasPriorityChanged) updateData.priority = newPriority;
        }
        
        if (Object.keys(updateData).length > 0) {
            await updateDoc(ticketRef, updateData);
            toast({ title: 'Update Terkirim', description: 'Informasi tiket telah diperbarui.' });
        }

        setUpdateNote('');
        setSelectedFile(null);
        setPreviewUrl(null);
    } catch (error: any) {
        console.error("Error updating ticket:", error);
        toast({ variant: 'destructive', title: 'Gagal Memperbarui', description: error.message || 'Terjadi kesalahan.' });
    } finally {
        setIsUpdating(false);
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
    }
  };

  const onEmojiClick = (emojiObject: EmojiClickData) => {
    setUpdateNote(prevInput => prevInput + emojiObject.emoji);
  };


  if (loading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (!ticket) {
    return (
      <div className="text-center">
        <p className="text-destructive">Tiket tidak dapat ditemukan.</p>
        <Button asChild variant="link" className="mt-4"><Link href="/helpdesk">Kembali ke Daftar</Link></Button>
      </div>
    );
  }
  
  const getStatusVariant = (status: TicketStatus) => {
    switch (status) {
      case 'Menunggu': return 'destructive';
      case 'Diproses': return 'default';
      case 'Selesai': return 'outline';
      default: return 'secondary';
    }
  };

  const getPriorityClass = (priority?: TicketPriority) => {
    switch (priority) {
      case 'Kritis': return 'bg-red-600 text-white font-bold';
      case 'Tinggi': return 'bg-orange-500 text-white font-bold';
      case 'Normal': return 'bg-yellow-400 text-yellow-900';
      case 'Rendah': return 'bg-blue-200 text-blue-900';
      default: return 'bg-gray-200 text-gray-800';
    }
  };
  
  const isAdmin = user?.role === 'Admin';
  const isOwner = user?.uid === ticket.reportedBy;

  return (
    <>
    <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2">
            <Card>
                <CardHeader>
                    <div className="flex items-center gap-4">
                        <Button asChild variant="outline" size="icon">
                            <Link href="/helpdesk"><ArrowLeft className="h-4 w-4" /></Link>
                        </Button>
                        <div>
                            <CardTitle className="text-2xl">{ticket.ticketNumber}</CardTitle>
                            <CardDescription>Detail laporan masalah teknis.</CardDescription>
                        </div>
                         <Badge variant={getStatusVariant(ticket.status)} className="ml-auto text-base">{ticket.status}</Badge>
                    </div>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <DetailItem label="Pelapor" value={`${ticket.reporterName} (${ticket.reporterDept})`} />
                        <DetailItem label="Kategori" value={ticket.category} />
                        <DetailItem label="Tanggal Laporan" value={format(ticket.reportedAt.toDate(), 'd MMM yyyy, HH:mm', { locale: id })} />
                    </div>
                     <div>
                        <Label>Tingkat Prioritas</Label>
                        <Badge className={cn("text-base mt-1", getPriorityClass(ticket.priority))}>
                            {ticket.priority || 'Normal'}
                        </Badge>
                     </div>
                    <div>
                        <h3 className="text-lg font-semibold">Deskripsi Masalah</h3>
                        <p className="mt-1 text-base text-muted-foreground whitespace-pre-wrap">{ticket.description}</p>
                    </div>
                    {ticket.photoURL && (
                        <div>
                             <h3 className="text-lg font-semibold">Lampiran Foto</h3>
                             <div className="mt-2">
                                <a href={ticket.photoURL} target="_blank" rel="noopener noreferrer">
                                <Image
                                    src={ticket.photoURL}
                                    alt="Lampiran masalah"
                                    width={300}
                                    height={300}
                                    className="rounded-lg border object-cover cursor-pointer hover:opacity-80 transition-opacity"
                                />
                                </a>
                             </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {isAdmin && (
                <Card className="mt-6">
                    <CardHeader>
                        <CardTitle>Panel Admin</CardTitle>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4">
                         <div>
                            <Label htmlFor="status">Ubah Status</Label>
                            <Select onValueChange={(v) => setNewStatus(v as TicketStatus)} value={newStatus}>
                                <SelectTrigger id="status" className="mt-1">
                                    <SelectValue placeholder="Pilih status baru" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Menunggu">Menunggu</SelectItem>
                                    <SelectItem value="Diproses">Diproses</SelectItem>
                                    <SelectItem value="Selesai">Selesai</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                         <div>
                            <Label htmlFor="priority">Ubah Prioritas</Label>
                            <Select onValueChange={(v) => setNewPriority(v as TicketPriority)} value={newPriority}>
                                <SelectTrigger id="priority" className="mt-1">
                                    <SelectValue placeholder="Pilih prioritas baru" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Rendah">Rendah</SelectItem>
                                    <SelectItem value="Normal">Normal</SelectItem>
                                    <SelectItem value="Tinggi">Tinggi</SelectItem>
                                    <SelectItem value="Kritis">Kritis</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </CardContent>
                </Card>
            )}
        </div>

        <div className="md:col-span-1">
             <Card>
                <CardHeader>
                    <CardTitle>Diskusi Tiket</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div ref={chatContainerRef} className="h-[400px] overflow-y-auto space-y-4 pr-2">
                        {ticket.updates && ticket.updates.length > 0 ? (
                            [...ticket.updates].map((update, index) => {
                                const isCurrentUser = update.updatedBy === user?.uid;
                                return (
                                <div key={index} className={cn("flex items-start gap-3", isCurrentUser ? "justify-end" : "justify-start")}>
                                    {!isCurrentUser && (
                                         <Avatar className="h-8 w-8 border">
                                            <AvatarFallback>{update.updaterName?.charAt(0) || 'A'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                    <div className={cn(
                                        "max-w-[80%] rounded-lg p-3 text-sm", 
                                        isCurrentUser 
                                            ? "bg-primary text-primary-foreground" 
                                            : "bg-muted"
                                    )}>
                                        <p className="font-semibold">{isCurrentUser ? 'Anda' : update.updaterName}</p>
                                        {update.note && <p className="mt-1 whitespace-pre-wrap">{update.note}</p>}
                                        {update.attachmentURL && (
                                            <a href={update.attachmentURL} target="_blank" rel="noopener noreferrer" className="mt-2 block">
                                                <Image src={update.attachmentURL} alt="lampiran chat" width={150} height={150} className="rounded-md border object-cover" />
                                            </a>
                                        )}
                                        <p className="mt-2 text-xs opacity-70 text-right">{formatDistanceToNow(update.updatedAt.toDate(), { locale: id, addSuffix: true })}</p>
                                    </div>
                                     {isCurrentUser && (
                                         <Avatar className="h-8 w-8 border">
                                            <AvatarFallback>{update.updaterName?.charAt(0) || 'U'}</AvatarFallback>
                                        </Avatar>
                                    )}
                                </div>
                            )})
                        ) : (
                            <p className="text-sm text-muted-foreground text-center">Belum ada diskusi untuk tiket ini. Mulai percakapan di bawah.</p>
                        )}
                    </div>
                </CardContent>
                {(isAdmin || isOwner) && (
                     <CardFooter className="flex-col items-stretch gap-2 border-t pt-4">
                        <Textarea
                            placeholder="Ketik pesan atau update di sini..."
                            value={updateNote}
                            onChange={(e) => setUpdateNote(e.target.value)}
                        />
                         {previewUrl && (
                            <div className="flex items-center gap-2 p-2 border rounded-md bg-muted/50">
                                <Image src={previewUrl} alt="Preview" width={40} height={40} className="rounded-md object-cover" />
                                <span className="text-sm truncate max-w-48">{selectedFile?.name}</span>
                                <Button size="sm" variant="ghost" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}>X</Button>
                            </div>
                        )}
                        <div className="flex justify-between items-center">
                            <div className="flex items-center gap-1">
                                <Input ref={fileInputRef} type="file" className="hidden" accept="image/*,video/*" onChange={handleFileChange} />
                                <Button size="icon" variant="ghost" onClick={() => fileInputRef.current?.click()}><Paperclip className="h-5 w-5" /></Button>
                                <Button size="icon" variant="ghost" onClick={() => setIsCameraOpen(true)}><Camera className="h-5 w-5" /></Button>
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Button size="icon" variant="ghost"><Smile className="h-5 w-5" /></Button>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-auto p-0 border-0">
                                        <EmojiPicker onEmojiClick={onEmojiClick} />
                                    </PopoverContent>
                                </Popover>
                            </div>
                            <Button onClick={handleUpdateTicket} disabled={isUpdating}>
                                {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                                Kirim
                            </Button>
                        </div>
                    </CardFooter>
                )}
             </Card>
        </div>
    </div>
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
                    <Button variant="secondary" onClick={() => handleUpload()} disabled={isUpdating}>
                        {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <UploadCloud className="h-4 w-4" />}
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
