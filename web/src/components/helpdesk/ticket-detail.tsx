'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { doc, onSnapshot, updateDoc, Timestamp, arrayUnion, collection, query, where, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type HelpdeskTicket, type TicketStatus, type TicketPriority, type TicketCategory, type MaintenanceSchedule } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  Loader2, 
  Send, 
  Paperclip, 
  Camera, 
  Smile, 
  User, 
  Building, 
  Calendar, 
  Hash, 
  X,
  Image as ImageIcon,
  AlertCircle,
  ShieldAlert,
  Check,
  ChevronLeft,
  Info,
  MessageSquare,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Eye,
  Share2,
  Trash2,
  Wrench,
  Clock,
  Layers
} from 'lucide-react';
import Image from 'next/image';
import { format, formatDistanceToNow } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Label } from '../ui/label';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import EmojiPicker from 'emoji-picker-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useRouter } from 'next/navigation';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';
import { recycleDocument } from '@/lib/recycle-bin-utils';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';

interface TicketDetailProps {
    ticketId: string;
    onBack?: () => void;
}

const DetailBlock = ({ label, value, icon: Icon }: { label: string, value: any, icon: any }) => (
    <div className="p-3 rounded-2xl bg-white/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center gap-3 text-left">
        <div className="p-2 bg-primary/5 rounded-xl shrink-0">
            <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-left">{label}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate text-left uppercase">{value || '-'}</p>
        </div>
    </div>
);

const SectionLabel = ({ title }: { title: string }) => (
    <div className="mb-3 mt-6 first:mt-0 text-left">
        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">{title}</p>
    </div>
);

const OfficialFormStatus = ({ hasOfficialForm, linkedReportId, onGoToOfficialForm, onViewFilledForm }: any) => (
    <div className="space-y-3">
        {hasOfficialForm ? (
            <div className="space-y-3">
                <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                    <span className="text-[10px] font-black text-emerald-800 uppercase tracking-widest leading-tight">Form Resmi (0-32-028) Telah Terisi</span>
                </div>
                <Button onClick={onViewFilledForm} variant="outline" className="w-full h-11 border-emerald-200 text-emerald-700 hover:bg-emerald-50 font-black uppercase tracking-widest text-[9px] rounded-xl shadow-sm">
                    <Eye className="mr-2 h-4 w-4" /> Lihat Form Terisi
                </Button>
            </div>
        ) : (
            <div className="space-y-3">
                <div className="p-4 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                    <span className="text-[9px] font-bold text-amber-800 uppercase leading-relaxed text-left">Form resmi 0-32-028 belum dilengkapi untuk tiket ini.</span>
                </div>
                <Button onClick={onGoToOfficialForm} className="w-full h-11 bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-[9px] rounded-xl shadow-lg shadow-blue-600/20">
                    <FileText className="mr-2 h-5 w-5" /> Lengkapi Form Resmi
                </Button>
            </div>
        )}
    </div>
);

export default function TicketDetail({ ticketId, onBack }: TicketDetailProps) {
  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [maintenanceSchedule, setMaintenanceSchedule] = useState<MaintenanceSchedule | null>(null);
  const [hasOfficialForm, setHasOfficialForm] = useState<boolean>(false);
  const [linkedReportId, setLinkedReportId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const [updateNote, setUpdateNote] = useState('');
  const [newStatus, setNewStatus] = useState<TicketStatus | ''>('');
  const [newPriority, setNewPriority] = useState<TicketPriority | ''>('');
  const [newCategory, setNewCategory] = useState<TicketCategory | ''>('');
  const [isUpdating, setIsUpdating] = useState(false);
  const [isSent, setIsSent] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const [isConfirmingDelete, setIsConfirmingDelete] = useState(false);
  
  // Chat deletion states
  const [isConfirmingUpdateDelete, setIsConfirmingUpdateDelete] = useState(false);
  const [updateIndexToDelete, setUpdateIndexToDelete] = useState<number | null>(null);

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    if (!ticketId) return;
    setLoading(true);
    const docRef = doc(db, 'helpdesk_tickets', ticketId);
    const unsubscribe = onSnapshot(docRef, (docSnap) => {
      if (docSnap.exists()) {
        const ticketData = { id: docSnap.id, ...docSnap.data() } as HelpdeskTicket;
        setTicket(ticketData);
        setNewStatus(ticketData.status);
        setNewPriority(ticketData.priority || 'Normal');
        setNewCategory(ticketData.category);
      } else {
        setTicket(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching ticket:", error);
      setLoading(false);
    });

    // Fetch Linked Maintenance
    const qMaint = query(collection(db, 'maintenance_schedules'), where('ticketId', '==', ticketId));
    const unsubMaint = onSnapshot(qMaint, (snap) => {
        if (!snap.empty) {
            setMaintenanceSchedule({ id: snap.docs[0].id, ...snap.docs[0].data() } as MaintenanceSchedule);
        } else {
            setMaintenanceSchedule(null);
        }
    });

    return () => {
        unsubscribe();
        unsubMaint();
    };
  }, [ticketId]);

  useEffect(() => {
    if (!ticketId) return;
    const q = query(
      collection(db, 'it_problem_reports'),
      where('ticketId', '==', ticketId)
    );
    const unsubscribe = onSnapshot(q, (snap) => {
      if (!snap.empty) {
        setHasOfficialForm(true);
        setLinkedReportId(snap.docs[0].id);
      } else {
        setHasOfficialForm(false);
        setLinkedReportId(null);
      }
    });
    return () => unsubscribe();
  }, [ticketId]);

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
            description: 'Screenshot berhasil dilampirkan ke balasan.',
          });
        }
      }
    }
  }, [toast]);

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
      if (response.ok) return data.secure_url;
      else throw new Error(data.error.message || 'Gagal upload.');
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal' });
      return undefined;
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateTicket = async () => {
    if (!user || !ticket) return;
    if (!updateNote && !selectedFile && newStatus === ticket.status && newPriority === ticket.priority && newCategory === ticket.category) {
        toast({ variant: 'destructive', title: 'Tidak ada perubahan' });
        return;
    }
    
    setIsUpdating(true);
    try {
        const attachmentURL = await handleUpload();
        const ticketRef = doc(db, 'helpdesk_tickets', ticketId);
        const updateData: any = {};
        
        if (updateNote || attachmentURL) {
            updateData.updates = arrayUnion({
                note: updateNote,
                attachmentURL: attachmentURL || '',
                updatedBy: user.uid,
                updaterName: user.displayName || user.email,
                updatedAt: Timestamp.now(),
            });
        }
        
        if (user.role === 'Admin') {
            updateData.status = newStatus;
            updateData.priority = newPriority;
            updateData.category = newCategory;

            // Log change if changed
            if (newStatus !== ticket.status || newPriority !== ticket.priority || newCategory !== ticket.category) {
                let description = `Memperbarui tiket ${ticket.ticketNumber}: `;
                if (newStatus !== ticket.status) description += `Status ke ${newStatus}. `;
                if (newPriority !== ticket.priority) description += `Prioritas ke ${newPriority}. `;
                if (newCategory !== ticket.category) description += `Kategori ke ${newCategory}. `;

                await addDoc(collection(db, 'system_logs'), {
                  type: 'HELPDESK',
                  action: 'UPDATE_TICKET_PROPERTIES',
                  description: description.trim(),
                  targetId: ticket.id,
                  targetCode: ticket.ticketNumber,
                  targetName: ticket.description.substring(0, 50),
                  userId: user.uid,
                  userName: user.displayName || user.email,
                  userDept: user.department || 'N/A',
                  timestamp: serverTimestamp(),
                });
            }

            // REAKSI SINKRONISASI TANGGAL SELESAI PADA FORM 0-32-028
            if (newStatus === 'Selesai' && ticket.status !== 'Selesai') {
                const qReports = query(collection(db, 'it_problem_reports'), where('ticketId', '==', ticketId));
                const reportSnap = await getDocs(qReports);
                if (!reportSnap.empty) {
                    const todayFmt = format(new Date(), 'yyyy-MM-dd');
                    for (const reportDoc of reportSnap.docs) {
                        await updateDoc(doc(db, 'it_problem_reports', reportDoc.id), {
                            solutionDate: todayFmt
                        });
                    }
                    toast({ title: 'Sinkronisasi Form', description: 'Tanggal selesai pada Form 0-32-028 telah diperbarui otomatis.' });
                }
            }
        }
        
        await updateDoc(ticketRef, updateData);
        setIsSent(true);
        setTimeout(() => setIsSent(false), 3000);
        setUpdateNote('');
        setSelectedFile(null);
        setPreviewUrl(null);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Update' });
    } finally {
        setIsUpdating(false);
    }
  };

  const handleDeleteUpdate = async () => {
    if (updateIndexToDelete === null || !ticket || !user) return;
    
    setIsUpdating(true);
    const ticketRef = doc(db, 'helpdesk_tickets', ticketId);
    
    try {
        const currentUpdates = [...(ticket.updates || [])];
        const removedUpdate = currentUpdates[updateIndexToDelete];
        currentUpdates.splice(updateIndexToDelete, 1);
        
        await updateDoc(ticketRef, { updates: currentUpdates });

        await addDoc(collection(db, 'system_logs'), {
          type: 'HELPDESK',
          action: 'DELETE_CHAT',
          description: `Menghapus satu baris chat pada tiket ${ticket.ticketNumber} (${removedUpdate.note.substring(0, 30)}...)`,
          targetId: ticket.id,
          targetCode: ticket.ticketNumber,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Pesan Dihapus' });
    } catch (error) {
        console.error("Delete update failed:", error);
        toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
        setIsUpdating(false);
        setIsConfirmingUpdateDelete(false);
        setUpdateIndexToDelete(null);
    }
  };

  const handleDeleteTicket = async () => {
    if (!ticket || !isAdmin || !user) return;
    
    const ticketNum = ticket.ticketNumber;
    
    if (onBack) onBack(); 

    setIsUpdating(true);
    try {
      await recycleDocument(db, 'helpdesk_tickets', ticketId, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({ title: 'Tiket Dihapus', description: `Tiket ${ticketNum} telah dipindahkan ke Tempat Sampah.` });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
    } finally {
      setIsUpdating(false);
      setIsConfirmingDelete(false);
    }
  };

  const handleShareLink = async () => {
    if (!ticket) return;
    setIsSharing(true);
    const publicUrl = `${window.location.origin}/public/helpdesk?id=${ticket.id}`;
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: `Riwayat Laporan IT - ${ticket.ticketNumber}`,
                text: `Pantau progres pengerjaan tiket bantuan IT PT. CGI di sini:`,
                url: publicUrl,
            });
            toast({ title: 'Berhasil Dibagikan' });
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Tautan riwayat publik telah disalin ke papan klip.' });
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

  const handleCapture = () => {
    if (videoRef.current && canvasRef.current) {
        const canvas = canvasRef.current;
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        canvas.getContext('2d')?.drawImage(videoRef.current, 0, 0);
        canvas.toBlob((blob) => {
            if (blob) {
                const file = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                setSelectedFile(file);
                setPreviewUrl(URL.createObjectURL(file));
                stopCamera();
            }
        }, 'image/jpeg');
    }
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
        streamRef.current.getTracks().forEach(track => {
            track.stop();
            track.enabled = false;
        });
        streamRef.current = null;
      }
    };
  }, [isCameraOpen]);

  const handleGoToOfficialForm = () => {
    if (!ticket) return;
    const problem = encodeURIComponent(ticket.description);
    const dept = encodeURIComponent(ticket.reporterDept || '');
    const id = ticket.id;
    router.push(`/it-problem-form?problem=${problem}&dept=${dept}&ticketId=${id}`);
  };

  const handleViewFilledForm = () => {
    if (!linkedReportId) return;
    router.push(`/it-problem-form?id=${linkedReportId}`);
  };

  const formattedReportedAt = ticket?.reportedAt ? format(ticket.reportedAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: id }) : '-';

  if (loading) return (
    <div className="flex flex-col h-full w-full bg-background p-8 gap-6 text-black">
        <Skeleton className="h-12 w-1/3 rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Skeleton className="h-64 col-span-1 rounded-3xl" />
            <Skeleton className="h-64 col-span-2 rounded-3xl" />
        </div>
    </div>
  );

  if (!ticket) return <div className="p-12 text-center text-destructive font-black uppercase tracking-tighter">EROR: Tiket Tidak Ditemukan</div>;

  return (
    <div className="flex flex-col h-full w-full bg-slate-50 dark:bg-slate-950 overflow-y-auto relative text-black">
        <div className="px-4 py-3 sm:px-8 sm:py-5 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b flex items-center justify-between shadow-sm shrink-0 z-20">
            <div className="flex items-center gap-3 sm:gap-5 min-w-0">
                <Button variant="ghost" size="icon" className="rounded-full shrink-0 h-9 w-9 sm:h-11 sm:w-11 hover:bg-slate-100 dark:hover:bg-slate-800 text-black" onClick={onBack}>
                    <ChevronLeft className="h-6 w-6" />
                </Button>
                <div className="min-w-0 text-left">
                    <div className="flex items-center gap-2 mb-0.5">
                        <Badge variant="outline" className="text-[9px] sm:text-[10px] font-black uppercase tracking-tighter bg-primary/10 border-primary/20 text-primary h-5 px-2 text-left">
                            {ticket.category}
                        </Badge>
                        <h2 className="text-sm sm:text-xl font-black tracking-tight text-slate-900 dark:text-white truncate uppercase text-left">{ticket.ticketNumber}</h2>
                    </div>
                    <p className="text-[9px] sm:text-[11px] font-bold text-muted-foreground uppercase tracking-widest truncate flex items-center gap-1.5 text-left">
                        <User className="h-3 w-3 text-primary" /> {ticket.reporterName} <span className="opacity-40">|</span> {ticket.reporterDept}
                    </p>
                </div>
            </div>
            <div className="flex items-center gap-2 sm:gap-3 shrink-0">
                {isAdmin && (
                  <div className="flex items-center">
                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          onClick={() => setIsConfirmingDelete(false)}
                          className="h-8 sm:h-10 w-8 sm:w-10 rounded-full p-0 text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="sm" 
                          onClick={handleDeleteTicket}
                          disabled={isUpdating}
                          className="h-8 sm:h-10 w-8 sm:w-10 rounded-full p-0 bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/20"
                        >
                          {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                        </Button>
                      </div>
                    ) : (
                      <Button onClick={() => setIsConfirmingDelete(true)} size="sm" variant="ghost" className="h-8 sm:h-10 text-rose-600 hover:bg-rose-50 hover:text-rose-700 rounded-full px-3 text-left">
                        <Trash2 className="h-4 w-4 mr-1.5" />
                        <span className="hidden sm:inline">Hapus</span>
                      </Button>
                    )}
                  </div>
                )}
                <Button onClick={handleShareLink} size="sm" variant="outline" disabled={isSharing} className="rounded-full h-8 sm:h-10 border-purple-200 text-purple-700 hover:bg-purple-600 hover:text-white transition-all shadow-sm font-bold px-3 sm:px-4 text-[10px] sm:text-xs">
                    {isSharing ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
                    <span className="hidden sm:inline">Bagikan Link</span><span className="sm:hidden">Share</span>
                </Button>
                <Badge className={cn(
                    "rounded-full px-3 sm:px-4 py-1 text-[10px] sm:text-[11px] font-black shadow-lg uppercase tracking-tight text-left",
                    ticket.status === 'Selesai' ? "bg-emerald-600 text-white" : 
                    ticket.status === 'Diproses' ? "bg-amber-50 text-white" : "bg-rose-600 text-white"
                )}>
                    {ticket.status}
                </Badge>
            </div>
        </div>

        <div className="flex-1 flex flex-col md:flex-row overflow-y-auto">
            <aside className="hidden md:block w-80 shrink-0 bg-white dark:bg-slate-900 border-r p-6 shadow-sm overflow-y-auto">
                <SectionLabel title="Informasi Utama" />
                <div className="space-y-3">
                    <DetailBlock label="Ticket ID" value={ticket.ticketNumber} icon={Hash} />
                    <DetailBlock label="Jenis Masalah" value={ticket.category} icon={Layers} />
                    <DetailBlock label="Urgensi" value={ticket.priority || 'Normal'} icon={ShieldAlert} />
                    <DetailBlock label="Tanggal Lapor" value={formattedReportedAt} icon={Calendar} />
                </div>

                {maintenanceSchedule && (
                  <>
                    <SectionLabel title="Integrasi Maintenance" />
                    <div className="space-y-3">
                        <DetailBlock label="Kategori Pekerjaan" value={maintenanceSchedule.type} icon={Wrench} />
                        <DetailBlock label="Teknisi PIC" value={maintenanceSchedule.technician} icon={User} />
                        <DetailBlock label="Status Jadwal" value={maintenanceSchedule.status} icon={Clock} />
                    </div>
                  </>
                )}

                <SectionLabel title="Status Dokumen" />
                <OfficialFormStatus 
                    hasOfficialForm={hasOfficialForm} 
                    linkedReportId={linkedReportId}
                    onGoToOfficialForm={handleGoToOfficialForm}
                    onViewFilledForm={handleViewFilledForm}
                />

                <SectionLabel title="Identitas Pelapor" />
                <div className="space-y-3">
                    <DetailBlock label="Nama Lengkap" value={ticket.reporterName} icon={User} />
                    <DetailBlock label="Departemen" value={ticket.reporterDept} icon={Building} />
                </div>

                {ticket.photoURL && (
                    <>
                        <SectionLabel title="Bukti Visual" />
                        <div 
                            className="relative aspect-video rounded-2xl overflow-hidden border-2 border-slate-100 dark:border-slate-800 shadow-xl group cursor-pointer" 
                            onClick={() => window.open(ticket.photoURL, '_blank')}
                        >
                            <Image src={ticket.photoURL} alt="Bukti Visual" fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                                <Button variant="secondary" size="sm" className="rounded-full font-black text-[10px] uppercase text-left">Buka Foto</Button>
                            </div>
                        </div>
                    </>
                )}
            </aside>

            <div className="flex-1 flex flex-col min-w-0 bg-slate-50 dark:bg-slate-950 relative text-black">
                <ScrollArea className="flex-1 px-4 py-6 sm:p-10">
                    <div className="max-w-5xl mx-auto space-y-10 pb-10">
                        
                        {/* Mobile Form Status & Visuals - Visible only on mobile */}
                        <div className="md:hidden space-y-6 mb-8">
                            <SectionLabel title="Status Dokumen Resmi" />
                            <OfficialFormStatus 
                                hasOfficialForm={hasOfficialForm} 
                                linkedReportId={linkedReportId}
                                onGoToOfficialForm={handleGoToOfficialForm}
                                onViewFilledForm={handleViewFilledForm}
                            />
                            
                            {ticket.photoURL && (
                                <div className="space-y-3">
                                    <SectionLabel title="Lampiran Utama" />
                                    <div 
                                        className="relative aspect-video rounded-[2.5rem] overflow-hidden border-4 border-white shadow-2xl bg-slate-200 cursor-pointer" 
                                        onClick={() => window.open(ticket.photoURL, '_blank')}
                                    >
                                        <Image src={ticket.photoURL} alt="Lampiran Utama" fill className="object-cover" />
                                        <div className="absolute bottom-4 right-6 bg-black/60 backdrop-blur-md text-white text-[8px] font-black uppercase tracking-widest px-3 py-1.5 rounded-full shadow-lg text-left">TAP UNTUK PERBESAR</div>
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="flex flex-col items-start gap-3 w-full text-left">
                            <div className="flex items-center gap-2 ml-2">
                                <Badge variant="secondary" className="rounded-full px-3 py-0 h-5 text-[9px] font-black uppercase tracking-widest bg-rose-500/10 text-rose-600 border-none ring-1 ring-rose-500/20 text-left">
                                    Masalah Utama
                                </Badge>
                            </div>
                            <div className="w-full max-w-[95%] p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border-2 border-primary/10 shadow-2xl rounded-tl-none relative overflow-hidden group text-left">
                                <p className="text-sm sm:text-base font-bold text-slate-800 dark:text-slate-100 leading-relaxed break-words overflow-wrap-anywhere whitespace-normal text-left">
                                    "{ticket.description}"
                                </p>
                                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-left">
                                    <span className="text-[10px] font-black text-muted-foreground/60 uppercase tracking-widest text-left">Dilaporkan Oleh {ticket.reporterName}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground/40 text-left">{ticket.reportedAt ? format(ticket.reportedAt.toDate(), 'HH:mm', {locale:id}) : ''}</span>
                                </div>
                            </div>
                        </div>

                        {ticket.updates?.map((update, idx) => {
                            const isMe = update.updatedBy === user?.uid;
                            const canDelete = isAdmin || isMe;
                            return (
                                <div key={idx} className={cn("flex flex-col gap-3 group animate-in fade-in slide-in-from-bottom-4 duration-500", isMe ? "items-end text-left" : "items-start text-left")}>
                                    <div className="flex items-center gap-2 px-2">
                                        {!isMe && <Avatar className="h-6 w-6 ring-2 ring-primary/10"><AvatarFallback className="text-[10px] font-black">{update.updaterName?.[0]}</AvatarFallback></Avatar>}
                                        <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tight text-left">{isMe ? 'ANDA' : update.updaterName}</span>
                                    </div>
                                    <div className="flex items-start gap-2 max-w-full">
                                        {isMe && canDelete && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => { setUpdateIndexToDelete(idx); setIsConfirmingUpdateDelete(true); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                        <div className={cn(
                                            "max-w-[95%] p-4 sm:p-5 rounded-3xl shadow-xl text-sm leading-relaxed break-words overflow-wrap-anywhere whitespace-normal transition-all text-left",
                                            isMe 
                                                ? "bg-gradient-to-br from-primary via-blue-600 to-indigo-700 text-white rounded-tr-none border-b-4 border-black/10" 
                                                : "bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-tl-none text-black dark:text-white",
                                            update.attachmentURL && "min-w-[200px] sm:min-w-[300px]"
                                        )}>
                                            {update.note && <p className="font-medium whitespace-pre-wrap text-left">{update.note}</p>}
                                            {update.attachmentURL && (
                                                <div 
                                                    className="mt-4 relative aspect-video rounded-2xl overflow-hidden border border-white/20 bg-black/20 cursor-pointer hover:opacity-90 transition-opacity shadow-inner text-left" 
                                                    onClick={() => window.open(update.attachmentURL, '_blank')}
                                                >
                                                    <Image src={update.attachmentURL} alt="update lampiran" fill className="object-cover" />
                                                    <div className="absolute bottom-2 right-3 bg-black/40 text-white text-[7px] font-black px-2 py-0.5 rounded-md text-left">TAP UNTUK PERBESAR</div>
                                                </div>
                                            )}
                                        </div>
                                        {!isMe && canDelete && (
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full text-slate-300 hover:text-rose-500 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                                onClick={() => { setUpdateIndexToDelete(idx); setIsConfirmingUpdateDelete(true); }}
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </Button>
                                        )}
                                    </div>
                                    <span className="text-[9px] text-muted-foreground font-black uppercase px-2 opacity-60 tracking-tighter text-left">
                                        {update.updatedAt ? formatDistanceToNow(update.updatedAt.toDate(), { locale: id, addSuffix: true }) : '-'}
                                    </span>
                                </div>
                            )
                        })}
                    </div>
                </ScrollArea>

                <div className="p-4 sm:p-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur-2xl border-t shadow-[0_-10px_40px_rgba(0,0,0,0.05)] shrink-0 z-20">
                    <div className="max-w-5xl mx-auto space-y-3">
                        {user?.role === 'Admin' && (
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4 bg-slate-50 dark:bg-slate-800/50 p-2 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <div className="space-y-1 text-left">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground px-1 tracking-widest text-left">Jenis Masalah</Label>
                                    <Select value={newCategory} onValueChange={(v) => setNewCategory(v as TicketCategory)}>
                                        <SelectTrigger className="h-9 bg-background rounded-xl border-slate-200 text-[10px] font-bold text-black"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl">
                                            <SelectItem value="Hardware">Hardware</SelectItem>
                                            <SelectItem value="Software">Software</SelectItem>
                                            <SelectItem value="Jaringan">Jaringan</SelectItem>
                                            <SelectItem value="Lainnya">Lainnya</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 text-left">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground px-1 tracking-widest text-left">Update Status</Label>
                                    <Select value={newStatus} onValueChange={(v) => setNewStatus(v as TicketStatus)}>
                                        <SelectTrigger className="h-9 bg-background rounded-xl border-slate-200 text-[10px] font-bold text-black"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl"><SelectItem value="Menunggu">Menunggu</SelectItem><SelectItem value="Diproses">Diproses</SelectItem><SelectItem value="Selesai">Selesai</SelectItem></SelectContent>
                                    </Select>
                                </div>
                                <div className="space-y-1 text-left">
                                    <Label className="text-[9px] font-black uppercase text-muted-foreground px-1 tracking-widest text-left">Atur Prioritas</Label>
                                    <Select value={newPriority} onValueChange={(v) => setNewPriority(v as TicketPriority)}>
                                        <SelectTrigger className="h-9 bg-background rounded-xl border-slate-200 text-[10px] font-bold text-black"><SelectValue /></SelectTrigger>
                                        <SelectContent className="rounded-xl"><SelectItem value="Rendah">Rendah</SelectItem><SelectItem value="Normal">Normal</SelectItem><SelectItem value="Tinggi">Tinggi</SelectItem><SelectItem value="Kritis">Kritis</SelectItem></SelectContent>
                                    </Select>
                                </div>
                            </div>
                        )}

                        <div className="flex flex-col gap-3 text-left">
                            <div className="relative text-left">
                                <Textarea 
                                    placeholder="Tulis balasan... (Dukungan Paste Screenshot)" 
                                    value={updateNote}
                                    onChange={(e) => setUpdateNote(e.target.value)}
                                    onPaste={handlePaste}
                                    className="min-h-[100px] sm:min-h-[130px] bg-background rounded-2xl sm:rounded-[2.5rem] p-4 sm:p-6 pr-12 sm:pr-16 border-slate-200 dark:border-slate-800 focus:ring-primary/20 shadow-inner resize-none text-sm font-medium leading-relaxed text-black text-left"
                                />
                                <div className="absolute right-3 bottom-3 sm:right-5 sm:bottom-5 text-left">
                                    <Popover>
                                        <PopoverTrigger asChild>
                                            <Button variant="ghost" size="icon" className="h-9 w-9 sm:h-11 sm:w-11 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-black"><Smile className="h-5 w-5 sm:h-6 sm:w-6 text-muted-foreground" /></Button>
                                        </PopoverTrigger>
                                        <PopoverContent className="w-auto p-0 border-none shadow-2xl text-left" side="top" align="end">
                                            <EmojiPicker onEmojiClick={(e) => setUpdateNote(p => p + e.emoji)} />
                                        </PopoverContent>
                                    </Popover>
                                </div>
                            </div>

                            <div className="flex items-center justify-between gap-3 text-left">
                                <div className="flex items-center gap-2 text-left">
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:text-primary transition-all shrink-0 text-black text-left" onClick={() => fileInputRef.current?.click()} title="Lampirkan File"><Paperclip className="h-5 w-5" /></Button>
                                    <Button variant="outline" size="icon" className="rounded-full h-10 w-10 sm:h-12 sm:w-12 border-slate-200 dark:border-slate-800 hover:bg-primary/5 hover:text-primary transition-all shrink-0 text-black text-left" onClick={() => setIsCameraOpen(true)} title="Gunakan Kamera"><Camera className="h-5 w-5" /></Button>
                                    <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                                    
                                    {previewUrl && (
                                        <div className="flex items-center gap-2 p-1.5 pl-3 border border-primary/20 rounded-full bg-primary/5 animate-in zoom-in-95 max-w-[150px] sm:max-w-none text-left">
                                            <div className="relative h-6 w-6 sm:h-8 sm:w-8 rounded-full overflow-hidden border border-primary/30 shrink-0"><Image src={previewUrl} alt="prev" fill className="object-cover" /></div>
                                            <Button size="icon" variant="ghost" className="h-6 w-6 sm:h-8 sm:w-8 rounded-full hover:bg-rose-50 hover:text-rose-600 text-black" onClick={() => { setSelectedFile(null); setPreviewUrl(null); }}><X className="h-4 w-4" /></Button>
                                        </div>
                                    )}
                                </div>

                                <Button 
                                    onClick={handleUpdateTicket} 
                                    disabled={isUpdating}
                                    className={cn(
                                        "h-12 px-8 rounded-2xl font-black uppercase tracking-widest transition-all active:scale-95 shadow-xl min-w-[160px] text-left",
                                        isSent 
                                            ? "bg-emerald-500 hover:bg-emerald-600 shadow-emerald-500/20 text-white" 
                                            : "bg-primary hover:bg-primary/90 shadow-primary/20 text-white"
                                    )}
                                >
                                    {isUpdating ? (
                                        <Loader2 className="mr-2 h-4 w-4 animate-spin text-left" />
                                    ) : isSent ? (
                                        <>
                                            <Check className="mr-2 h-5 w-5 animate-in zoom-in duration-300" />
                                            <span>Terkirim</span>
                                        </>
                                    ) : (
                                        <>
                                            <Send className="mr-2 h-5 w-5" />
                                            <span>Kirim</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <Dialog open={isCameraOpen} onOpenChange={(open) => { if (!open) stopCamera(); else setIsCameraOpen(true); }}>
            <DialogContent 
              onPointerDownOutside={(e) => e.preventDefault()}
              className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-black rounded-3xl mx-auto text-left" 
            >
                <div className="p-4 bg-slate-900/80 backdrop-blur-md flex items-center justify-between text-white border-b border-white/10 text-left">
                    <div className="flex items-center gap-2 text-left">
                        <Camera className="h-5 w-5 text-primary" />
                        <DialogTitle className="text-sm font-black uppercase tracking-widest text-left text-white">Kamera</DialogTitle>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 text-white" onClick={stopCamera}><X className="h-5 w-5 text-white"/></Button></DialogClose>
                </div>
                <div className="relative aspect-[4/3] bg-black flex items-center justify-center text-left">
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

        {/* Delete Chat Confirmation */}
        <AlertDialog open={isConfirmingUpdateDelete} onOpenChange={setIsConfirmingUpdateDelete}>
            <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white text-black">
                <AlertDialogHeader>
                    <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-2 text-left text-black"><Trash2 className="h-8 w-8 text-rose-600" /></div>
                    <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-rose-600 text-left">Hapus Pesan?</AlertDialogTitle>
                    <AlertDialogDescription className="text-sm font-medium text-left text-black">Tindakan ini akan menghapus baris chat ini secara permanen dari riwayat tiket.</AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter className="mt-6 gap-2">
                    <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
                    <AlertDialogAction onClick={handleDeleteUpdate} className="rounded-xl bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest">Ya, Hapus Chat</AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    </div>
  );
}
