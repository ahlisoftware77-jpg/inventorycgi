'use client';

import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
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
import { Loader2, Camera, FileImage, UploadCloud, X, Send, AlertTriangle, FileText, CheckCircle2, Zap, MessageSquare, Search, User, Monitor, Info } from 'lucide-react';
import { type TicketCategory, type TicketPriority, type Asset } from '@/lib/types';
import { ticketSchema } from '@/lib/schemas';
import Image from 'next/image';
import { z } from 'zod';
import Link from 'next/link';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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

  // Asset search state
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<Asset | null>(null);

  useEffect(() => {
    async function fetchAssets() {
      try {
        const qAssets = query(collection(db, 'assets'));
        const assetSnapshot = await getDocs(qAssets);
        const assetsData = assetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAllAssets(assetsData);
      } catch (e) {
        console.error("Error fetching assets for helpdesk form:", e);
      }
    }
    fetchAssets();
  }, []);

  // Filter assets based on user unit visibility permissions
  const visibleAssets = useMemo(() => {
    if (!user) return [];
    
    // Filter out deleted / disposed assets
    const activeAssets = allAssets.filter(a => a.status !== 'approved_disposal' && a.status !== 'Dihapus');

    const isUserAdmin = user.role === 'Admin';
    const userDept = user.department || '';
    const allowedDepts = user.allowedDepartments || [];

    // Admin sees all active assets
    if (isUserAdmin) {
      return activeAssets;
    }

    // Privileged department defaults to all assets if no specific unit checklist is set
    const isPrivilegedDept = ['ACCOUNTING', 'HR & GA', 'GA', 'MANAGEMENT', 'IT'].includes(userDept.toUpperCase().trim());
    if (isPrivilegedDept && allowedDepts.length === 0) {
      return activeAssets;
    }

    let visibleDepts = [...allowedDepts];
    if (userDept && !visibleDepts.includes(userDept)) {
      visibleDepts.push(userDept);
    }

    if (visibleDepts.length === 0) {
      return activeAssets.filter(a => a.location?.toUpperCase().trim() === userDept.toUpperCase().trim());
    }

    return activeAssets.filter(a => {
      if (!a.location) return false;
      const loc = a.location.toUpperCase().trim();
      return visibleDepts.some(dept => {
        const d = dept.toUpperCase().trim();
        if (loc === d) return true;
        if (d === 'APP' && loc === 'APP-R&D') return true;
        if (d === 'R&D' && ['APP', 'APP-R&D', 'QC', 'LAB'].includes(loc)) return true;
        if (d === 'PPIC' && loc === 'MAINTENANCE') return true;
        return false;
      });
    });
  }, [allAssets, user]);

  const handleSearchChange = (term: string) => {
    setSearchTerm(term);
    if (!term.trim()) {
      setSuggestions([]);
      return;
    }
    const lower = term.toLowerCase();
    const filtered = visibleAssets.filter(a =>
      a.code?.toLowerCase().includes(lower) ||
      a.name?.toLowerCase().includes(lower) ||
      a.user?.toLowerCase().includes(lower) ||
      a.location?.toLowerCase().includes(lower)
    );
    setSuggestions(filtered);
  };

  const handleAssetSelect = (asset: Asset) => {
    setSelectedAsset(asset);
    setSearchTerm(`${asset.code} - ${asset.name}${asset.user ? ` (${asset.user})` : ''}`);
    setSuggestions([]);
    setIsSearchFocused(false);

    form.setValue('assetId', asset.id);
    form.setValue('assetCode', asset.code);
    form.setValue('assetName', asset.name);
    form.setValue('assetUser', asset.user || '');

    const currentDesc = form.getValues('description');
    if (!currentDesc) {
      form.setValue('description', `Kendala pada Aset ${asset.code} (${asset.name}): `);
    }
  };

  const handleClearAsset = () => {
    setSelectedAsset(null);
    setSearchTerm('');
    setSuggestions([]);
    form.setValue('assetId', '');
    form.setValue('assetCode', '');
    form.setValue('assetName', '');
    form.setValue('assetUser', '');
  };

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
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`, {
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

    if (!selectedAsset && !values.assetId) {
      toast({ 
        variant: 'destructive', 
        title: 'Aset Wajib Dipilih', 
        description: 'Silakan cari dan pilih aset (Ketik Kode, Nama, atau Pengguna) terlebih dahulu sebelum mengirim laporan.' 
      });
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
        assetId: selectedAsset?.id || values.assetId || '',
        assetCode: selectedAsset?.code || values.assetCode || '',
        assetName: selectedAsset?.name || values.assetName || '',
        assetUser: selectedAsset?.user || values.assetUser || '',
        assetLocation: selectedAsset?.location || '',
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

                    {/* Cari Aset (Ketik Kode, Nama, atau Pengguna) */}
                    <div className="space-y-2 relative group text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest block text-left">
                            Cari Aset (Ketik Kode, Nama, atau Pengguna) <span className="text-rose-500 font-bold">* (Wajib Diisi)</span>
                        </Label>
                        <div className="relative">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Contoh: CPU, CGI-2024-001, Laptop Asus, atau Budi..." 
                                value={searchTerm}
                                onChange={(e) => handleSearchChange(e.target.value)}
                                onFocus={() => setIsSearchFocused(true)}
                                onBlur={() => setTimeout(() => setIsSearchFocused(false), 200)}
                                className={cn(
                                    "h-12 pl-11 pr-10 bg-background border-slate-200 rounded-xl shadow-sm focus:ring-primary/20 font-bold text-slate-900 dark:text-white text-left",
                                    form.formState.errors.assetId && "border-rose-500 ring-rose-500/20"
                                )}
                            />
                            {searchTerm && (
                                <button 
                                    type="button" 
                                    onClick={handleClearAsset}
                                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-rose-500 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        {form.formState.errors.assetId && (
                            <p className="text-xs font-bold text-rose-500 mt-1 ml-1 text-left flex items-center gap-1">
                                <AlertTriangle className="h-3 w-3 inline shrink-0" />
                                {form.formState.errors.assetId.message}
                            </p>
                        )}

                        {/* Tips & Petunjuk Pemilihan Aset */}
                        <div className="p-3.5 rounded-2xl bg-blue-50/80 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50 flex items-start gap-3 text-left">
                            <Info className="w-4 h-4 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
                            <div className="text-[11px] leading-relaxed text-slate-700 dark:text-slate-300">
                                <span className="font-black text-blue-900 dark:text-blue-200 uppercase tracking-wider block mb-0.5">💡 Petunjuk Memilih Kode Aset:</span>
                                Ketik <strong>Kode Aset</strong>, <strong>Nama Perangkat/CPU</strong>, atau <strong>Pengguna</strong>. Jika pelaporan terkait <strong>masalah update Sistem Glaze</strong>, Anda disarankan memilih <strong>Aset CPU</strong> yang Anda gunakan saat ini.
                            </div>
                        </div>

                        {/* Shortcut Filter Cepat */}
                        <div className="flex flex-wrap gap-2 pt-1">
                            <Button 
                                type="button" 
                                variant="outline" 
                                size="sm" 
                                onClick={() => { handleSearchChange('CPU'); setIsSearchFocused(true); }}
                                className="text-[10px] h-7 rounded-lg font-bold uppercase border-blue-200 bg-blue-50/50 text-blue-700 hover:bg-blue-100"
                            >
                                💻 Cari CPU
                            </Button>
                            {user?.displayName && (
                                <Button 
                                    type="button" 
                                    variant="outline" 
                                    size="sm" 
                                    onClick={() => { handleSearchChange(user.displayName || ''); setIsSearchFocused(true); }}
                                    className="text-[10px] h-7 rounded-lg font-bold uppercase border-slate-200 bg-white text-slate-700 hover:bg-slate-100"
                                >
                                    👤 Aset Atas Nama Saya ({user.displayName.split(' ')[0]})
                                </Button>
                            )}
                        </div>

                        {/* Asset Suggestions Dropdown */}
                        {isSearchFocused && suggestions.length > 0 && (
                            <Card className="absolute z-[60] w-full mt-1 shadow-2xl border-slate-200 dark:border-slate-800 overflow-hidden rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
                                <div className="px-3 py-1.5 bg-slate-100 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between">
                                    <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300">
                                        Ditemukan {suggestions.length} Aset (Gulung/Scroll untuk melihat semua)
                                    </span>
                                </div>
                                <div 
                                    className="max-h-64 overflow-y-auto overscroll-contain bg-white dark:bg-slate-900 p-2 space-y-1"
                                    onWheel={(e) => e.stopPropagation()}
                                    onTouchMove={(e) => e.stopPropagation()}
                                >
                                    {suggestions.map(a => (
                                        <div 
                                            key={a.id} 
                                            className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors group text-left"
                                            onMouseDown={(e) => {
                                                e.preventDefault();
                                                handleAssetSelect(a);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <span className="font-black text-xs text-primary tracking-tighter group-hover:underline">{a.code}</span>
                                                <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 bg-slate-50 border-slate-200">{a.location || 'N/A'}</Badge>
                                            </div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1 uppercase text-left">{a.name}</p>
                                            {a.user && (
                                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                                    <User className="w-2.5 h-2.5 text-primary/60" /> Pengguna: <span className="font-bold text-slate-700 dark:text-slate-300">{a.user}</span>
                                                </p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </Card>
                        )}

                        {/* Selected Asset Card */}
                        {selectedAsset && (
                            <div className="p-3 rounded-2xl bg-primary/5 border border-primary/20 flex items-center justify-between gap-3 animate-in fade-in duration-200">
                                <div className="flex items-center gap-3 text-left min-w-0">
                                    <div className="p-2 rounded-xl bg-primary/10 text-primary">
                                        <Monitor className="h-4 w-4" />
                                    </div>
                                    <div className="min-w-0">
                                        <p className="text-xs font-black text-primary truncate">{selectedAsset.code} - {selectedAsset.name}</p>
                                        <p className="text-[10px] font-medium text-slate-500 truncate">
                                            Unit: {selectedAsset.location || '-'} {selectedAsset.user ? `| Pengguna: ${selectedAsset.user}` : ''}
                                        </p>
                                    </div>
                                </div>
                                <Badge variant="secondary" className="bg-emerald-100 text-emerald-800 font-bold text-[9px] uppercase shrink-0">Aset Terpilih</Badge>
                            </div>
                        )}
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
                        <Label className="text-[10px] font-black uppercase text-muted-foreground ml-1 tracking-widest text-left block">Lampiran Masalah (Gambar atau Dokumen - Bisa Paste Screenshot)</Label>
                        <div className="grid grid-cols-2 gap-3">
                            <Button type="button" variant="outline" className="h-12 rounded-xl font-bold border-slate-200 bg-white text-black" onClick={() => fileInputRef.current?.click()}>
                                <UploadCloud className="mr-2 h-4 w-4 text-blue-600" /> Pilih File / Dokumen
                            </Button>
                            <Button type="button" variant="outline" className="h-12 rounded-xl font-bold border-slate-200 bg-white text-black" onClick={() => setIsCameraOpen(true)}>
                                <Camera className="mr-2 h-4 w-4 text-blue-600" /> Buka Kamera
                            </Button>
                            <Input ref={fileInputRef} type="file" className="hidden" accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar" onChange={handleFileChange} />
                        </div>
                        {selectedFile && (
                            <div className="p-4 border-2 border-dashed border-primary/20 rounded-3xl bg-white dark:bg-slate-900 flex items-center gap-4 animate-in zoom-in-95 shadow-xl">
                                <div className="relative h-20 w-20 rounded-2xl overflow-hidden border-2 border-white bg-slate-100 flex items-center justify-center shrink-0">
                                    {previewUrl ? (
                                        <Image src={previewUrl} alt="Preview" fill className="object-cover" />
                                    ) : (
                                        <FileText className="h-8 w-8 text-primary" />
                                    )}
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-black truncate text-slate-900 dark:text-white uppercase leading-tight text-left">{selectedFile.name}</p>
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