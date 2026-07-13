'use client';

/**
 * @fileOverview Formulir Penjadwalan Maintenance Korporat.
 * Terintegrasi dengan IT Helpdesk: Bisa membuat tiket baru atau menautkan ke tiket yang sudah ada (status Menunggu).
 * Dukungan penuh untuk mode EDIT dengan sinkronisasi helpdesk.
 * Dinamis: Mengambil daftar kategori pekerjaan dari pengaturan sistem.
 */

import { useState, useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { maintenanceScheduleSchema } from '@/lib/schemas';
import { type MaintenanceSchedule, type Asset, type HelpdeskTicket } from '@/lib/types';
import { collection, doc, serverTimestamp, Timestamp, getDocs, query, where, QueryConstraint, writeBatch, arrayUnion, addDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Loader2, 
  CalendarIcon, 
  Info, 
  X, 
  ClipboardCheck, 
  User, 
  Hammer, 
  Tag, 
  CheckCircle2, 
  MapPin, 
  Search, 
  Hash, 
  LifeBuoy,
  PlusCircle,
  Ticket,
  Wrench
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { ScrollArea, ScrollBar } from '../ui/scroll-area';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

type ScheduleFormValues = z.infer<typeof maintenanceScheduleSchema>;

interface MaintenanceScheduleFormProps {
  schedule?: MaintenanceSchedule;
  prefilledTicketId?: string;
  prefilledTicket?: HelpdeskTicket;
  children: ReactNode;
}

const defaultMaintTypes = [
    'Pemeriksaan Rutin (Preventive)',
    'Pembersihan PC / Laptop / Server',
    'Instalasi OS & Software Standar',
    'Update Software / Firmware',
    'Report Update Glaze System',
    'Perbaikan Jaringan (LAN/WiFi)',
    'Maintenance Server & Storage',
    'Troubleshooting Hardware',
    'Ganti Komponen (Part Replacement)',
    'Instalasi & Perbaikan Printer/Scanner',
    'Pemeriksaan CCTV & Security System',
    'Kalibrasi Sensor & Instrumen Lab',
    'Servis Berkala Kendaraan',
    'Pengecekan Listrik / AC Gedung',
    'Maintenance Preventif Mesin Produksi',
    'Audit Fisik Tahunan (Stock Opname)',
    'Lainnya'
];

const DetailTileMini = ({ label, value, icon: Icon }: { label: string, value: string | undefined, icon: any }) => (
    <div className="p-3 rounded-xl bg-background border shadow-sm flex items-center gap-3">
        <div className="p-1.5 bg-primary/5 rounded-lg shrink-0">
            <Icon className="h-3.5 w-3.5 text-primary" />
        </div>
        <div className="min-w-0">
            <p className="text-[9px] font-black uppercase text-muted-foreground tracking-tighter leading-none mb-1 text-left">{label}</p>
            <p className="text-xs font-bold truncate text-left">{value || '-'}</p>
        </div>
    </div>
);

export default function MaintenanceScheduleForm({ schedule, prefilledTicketId, prefilledTicket, children }: MaintenanceScheduleFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const [waitingTickets, setWaitingTickets] = useState<HelpdeskTicket[]>([]);
  const [maintenanceTypes, setMaintenanceTypes] = useState<string[]>(defaultMaintTypes);
  const [selectedTicketId, setSelectedTicketId] = useState<string>('NEW');
  const [selectedAssetDetails, setSelectedAssetDetails] = useState<Asset | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const [isSearchFocused, setIsSearchFocused] = useState(false);
  
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!schedule;

  const form = useForm<ScheduleFormValues>({
    resolver: zodResolver(maintenanceScheduleSchema),
  });
  
  // Listen for Maintenance Types from settings
  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.maintenanceTypes && data.maintenanceTypes.length > 0) {
          setMaintenanceTypes(data.maintenanceTypes);
        }
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    async function fetchData() {
        if (!user || authLoading || !isOpen) return;
        
        // 1. Fetch Assets
        const assetConstraints: QueryConstraint[] = [];
        if (user.role !== 'Admin' && user.department) {
            assetConstraints.push(where('location', '==', user.department));
        }
        const qAssets = query(collection(db, 'assets'), ...assetConstraints);
        const assetSnapshot = await getDocs(qAssets);
        const assetsData = assetSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAssets(assetsData.sort((a,b) => a.name.localeCompare(b.name)));

        // 2. Fetch Waiting Tickets (Status Menunggu atau Diproses)
        if (user.role === 'Admin' || user.permissions?.canApproveMutation) {
            const qTickets = query(collection(db, 'helpdesk_tickets'), where('status', 'in', ['Menunggu', 'Diproses']));
            const ticketSnapshot = await getDocs(qTickets);
            let ticketsData = ticketSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpdeskTicket));
            if (prefilledTicket && !ticketsData.some(t => t.id === prefilledTicket.id)) {
                ticketsData = [prefilledTicket, ...ticketsData];
            }
            setWaitingTickets(ticketsData);
        }
    }
    fetchData();
  }, [user, authLoading, isOpen]);

  useEffect(() => {
    if (isOpen) {
      form.reset({
        assetId: schedule?.assetId || '',
        assetName: schedule?.assetName || '',
        assetCode: schedule?.assetCode || '',
        assetUser: schedule?.assetUser || '',
        department: schedule?.department || prefilledTicket?.reporterDept || user?.department || '',
        scheduledDate: schedule?.scheduledDate?.toDate() || new Date(),
        type: schedule?.type || undefined,
        status: schedule?.status || 'Dijadwalkan',
        technician: schedule?.technician || '',
        notes: schedule?.notes || '',
      });
      if (schedule) {
        setSearchTerm(schedule.assetCode || '');
        const existingAsset = assets.find(a => a.id === schedule.assetId);
        setSelectedAssetDetails(existingAsset || null);
        setSelectedTicketId(schedule.ticketId || 'NEW');
      } else {
        setSearchTerm('');
        setSelectedAssetDetails(null);
        setSelectedTicketId(prefilledTicketId || 'NEW');
      }
    }
  }, [isOpen, schedule, form, assets, user, prefilledTicketId, prefilledTicket]);

  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    if (value.trim()) {
        const filtered = assets.filter(a => 
            a.code.toLowerCase().includes(value.toLowerCase()) ||
            a.name.toLowerCase().includes(value.toLowerCase()) ||
            (a.user && a.user.toLowerCase().includes(value.toLowerCase()))
        );
        setSuggestions(filtered);
    } else {
        setSuggestions([]);
    }
  };

  const handleAssetSelect = (selectedAsset: Asset) => {
    form.setValue('assetId', selectedAsset.id);
    form.setValue('assetName', selectedAsset.name);
    form.setValue('assetCode', selectedAsset.code);
    form.setValue('assetUser', selectedAsset.user || '');
    form.setValue('department', selectedAsset.location);
    setSelectedAssetDetails(selectedAsset);
    setSearchTerm(selectedAsset.code);
    setSuggestions([]);
    setIsSearchFocused(false);
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

  async function onSubmit(values: ScheduleFormValues) {
    if (!user) return;
    if (!values.assetId) {
        toast({ variant: 'destructive', title: 'Aset Belum Pilih', description: 'Silakan cari dan pilih aset terlebih dahulu.' });
        return;
    }
    setIsLoading(true);

    try {
      const batch = writeBatch(db);
      const dataToSave: any = {
        ...values,
        scheduledDate: Timestamp.fromDate(values.scheduledDate),
        updatedAt: serverTimestamp(),
      };

      // Ticket Logic
      let finalTicketId = schedule?.ticketId || '';
      let finalTicketNumber = schedule?.ticketNumber || '';
      
      const isTicketLinkedOrChanged = !isEditMode || (selectedTicketId !== schedule?.ticketId);

      if (isTicketLinkedOrChanged) {
        if (selectedTicketId !== 'NEW') {
          // Tautkan ke tiket yang sudah ada
          const existingTicket = waitingTickets.find(t => t.id === selectedTicketId);
          if (existingTicket) {
            finalTicketId = existingTicket.id;
            finalTicketNumber = existingTicket.ticketNumber;

            const ticketRef = doc(db, 'helpdesk_tickets', finalTicketId);
            batch.update(ticketRef, {
              updates: arrayUnion({
                note: `[SISTEM] Jadwal pemeliharaan ${isEditMode ? 'diperbarui' : 'baru'} ditautkan ke tiket ini oleh ${user.displayName}. Tipe: ${values.type}.`,
                updatedBy: user.uid,
                updaterName: 'SYSTEM (MAINTENANCE)',
                updatedAt: Timestamp.now(),
              })
            });
          }
        } else if (!isEditMode || (isEditMode && selectedTicketId === 'NEW' && !schedule?.ticketId)) {
          // Buat tiket baru (hanya jika baru atau jika edit tapi sebelumnya tidak ada tiket)
          const ticketRef = doc(collection(db, 'helpdesk_tickets'));
          const ticketNumber = await generateTicketNumber();
          finalTicketId = ticketRef.id;
          finalTicketNumber = ticketNumber;

          const ticketData = {
            ticketNumber,
            category: 'Hardware',
            priority: 'Normal',
            description: `[MAINTENANCE] ${values.type} - ${values.assetName} (${values.assetCode}) pada lokasi ${values.department}.`,
            status: 'Menunggu',
            reportedBy: user.uid,
            reporterName: user.displayName || user.email,
            reporterDept: values.department,
            reportedAt: serverTimestamp(),
            updates: [{
              note: `Tiket dibuat otomatis melalui sistem Penjadwalan Maintenance untuk aset ${values.assetCode}.`,
              updatedBy: user.uid,
              updaterName: 'SYSTEM',
              updatedAt: Timestamp.now(),
            }],
          };
          batch.set(ticketRef, ticketData);
        }
        
        dataToSave.ticketId = finalTicketId;
        dataToSave.ticketNumber = finalTicketNumber;
      }

      if (isEditMode && schedule) {
        const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
        batch.update(scheduleRef, dataToSave);
        
        // Log Update
        batch.set(doc(collection(db, 'system_logs')), {
            type: 'MAINTENANCE',
            action: 'UPDATE_SCHEDULE',
            description: `Memperbarui jadwal maintenance "${values.type}" untuk aset ${values.assetCode}`,
            targetId: schedule.id,
            targetCode: values.assetCode,
            targetName: values.assetName,
            userId: user.uid,
            userName: user.displayName || user.email,
            userDept: user.department || 'N/A',
            timestamp: serverTimestamp(),
        });
      } else {
        dataToSave.createdAt = serverTimestamp();
        const scheduleRef = doc(collection(db, 'maintenance_schedules'));
        batch.set(scheduleRef, dataToSave);
        
        // Log Create
        batch.set(doc(collection(db, 'system_logs')), {
            type: 'MAINTENANCE',
            action: 'CREATE_SCHEDULE',
            description: `Menetapkan jadwal maintenance baru "${values.type}" untuk aset ${values.assetCode}`,
            targetId: scheduleRef.id,
            targetCode: values.assetCode,
            targetName: values.assetName,
            userId: user.uid,
            userName: user.displayName || user.email,
            userDept: user.department || 'N/A',
            timestamp: serverTimestamp(),
        });
      }

      await batch.commit();
      toast({ 
        title: isEditMode ? 'Jadwal Diperbarui' : 'Jadwal Berhasil Dibuat', 
        description: `Informasi pemeliharaan dan sinkronisasi IT Helpdesk telah disimpan.` 
      });
      setIsOpen(false);
      
    } catch (error) {
      console.error("Error in maintenance submission:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "bg-background h-11 border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-sm font-semibold";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 border border-slate-100 dark:border-slate-800 shadow-2xl bg-white dark:bg-slate-950 rounded-2xl" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className="sticky top-0 z-50 px-6 sm:px-8 pt-6 sm:pt-8 pb-4 flex items-start justify-between bg-white/95 dark:bg-slate-950/95 backdrop-blur-md border-b border-slate-100 dark:border-slate-800">
          <div className="space-y-1">
            <DialogTitle className="text-lg font-black tracking-wider uppercase text-slate-800 dark:text-slate-100 flex items-center gap-2 text-left">
              <span className="text-lg select-none">{isEditMode ? '⚙️' : '📅'}</span>
              {isEditMode ? 'Edit Jadwal Pemeliharaan' : 'Penjadwalan Maintenance'}
            </DialogTitle>
            <DialogDescription className="text-[11px] text-muted-foreground font-medium text-left">
              Tetapkan jadwal pemeriksaan preventif dan sinkronisasikan dengan sistem Helpdesk.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-xl h-8 w-8 hover:bg-slate-100 text-slate-400 hover:text-slate-900 shrink-0">
              <X className="h-5 w-5" />
            </Button>
          </DialogClose>
        </div>

        <div className="p-6 sm:p-8 pt-4">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
                      <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                    <span className="text-sm select-none">🔍</span>
                    <h3 className="font-black text-[10px] uppercase tracking-wider text-foreground/70">Pemilihan Objek Aset</h3>
                </div>
                
                <div className="space-y-3 relative group">
                    <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1">Ketik Kode, Nama, atau Pengguna/Penanggung Jawab</Label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input 
                            placeholder="Contoh: A3-2024 atau Pompa Air..." 
                            value={searchTerm}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            onFocus={() => setIsSearchFocused(true)}
                            className={cn(inputClass, "pl-11 font-bold text-black dark:text-white")}
                        />
                        {searchTerm && (
                            <button 
                                type="button" 
                                onClick={() => { setSearchTerm(''); setSuggestions([]); setSelectedAssetDetails(null); form.setValue('assetId', ''); }}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-300 hover:text-rose-500 transition-colors"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        )}
                    </div>

                    {isSearchFocused && suggestions.length > 0 && (
                        <Card className="absolute z-[60] w-full mt-1 shadow-2xl border-slate-100 dark:border-slate-800 overflow-hidden rounded-xl animate-in fade-in slide-in-from-top-2 duration-200">
                            <ScrollArea className="h-80 bg-white dark:bg-slate-900">
                                <div className="p-2 space-y-1">
                                    {suggestions.map(a => (
                                        <div 
                                            key={a.id} 
                                            className="p-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl border-b last:border-0 border-slate-100 dark:border-slate-800 transition-colors group"
                                            onPointerDown={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                handleAssetSelect(a);
                                            }}
                                        >
                                            <div className="flex justify-between items-center mb-1">
                                                <p className="font-black text-xs text-primary tracking-tighter group-hover:underline">{a.code}</p>
                                                <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 bg-slate-50 border-slate-200">{a.location}</Badge>
                                            </div>
                                            <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1 uppercase text-left">{a.name}</p>
                                            <div className="flex items-center gap-2 text-[10px] text-muted-foreground font-medium">
                                                <div className="flex items-center gap-1">
                                                    <User className="w-2.5 h-2.5 text-primary/40" />
                                                    <span className="truncate max-w-[120px]">{a.user || 'Tanpa User'}</span>
                                                </div>
                                                <span className="opacity-30">|</span>
                                                <div className="flex items-center gap-1">
                                                    <MapPin className="w-2.5 h-2.5 text-primary/40" />
                                                    <span className="truncate">{a.location}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                <ScrollBar orientation="vertical" className="z-[70]" />
                            </ScrollArea>
                        </Card>
                    )}
                    <FormMessage />
                </div>

                {selectedAssetDetails && (
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 animate-in fade-in slide-in-from-top-2 duration-500">
                        <DetailTileMini label="Nama Barang" value={selectedAssetDetails.name} icon={Tag} />
                        <DetailTileMini label="Kode Aset" value={selectedAssetDetails.code} icon={Hash} />
                        <DetailTileMini label="User Pengguna" value={selectedAssetDetails.user} icon={User} />
                        <DetailTileMini label="Lokasi" value={selectedAssetDetails.location} icon={MapPin} />
                    </div>
                )}
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                  <span className="text-sm select-none">🎫</span>
                  <h3 className="font-black text-[10px] uppercase tracking-wider text-foreground/70">Integrasi IT Helpdesk</h3>
                </div>

                <div className="space-y-3 text-left">
                  <Label className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Tautkan ke Tiket Helpdesk</Label>
                  <Select value={selectedTicketId} onValueChange={setSelectedTicketId}>
                    <SelectTrigger className={cn(inputClass, "font-bold text-black dark:text-white")}>
                      <SelectValue placeholder="Pilih tiket atau buat baru" />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl max-h-[250px] overflow-y-auto">
                      <SelectItem value="NEW" className="font-black text-xs text-primary uppercase tracking-wider py-2.5">
                        <div className="flex items-center gap-2">
                            <PlusCircle className="h-3.5 w-3.5" /> Buat Tiket Baru Otomatis
                        </div>
                      </SelectItem>
                      {waitingTickets.map(t => (
                        <SelectItem key={t.id} value={t.id} className="text-xs py-2.5 cursor-pointer">
                            <div className="flex flex-col text-left py-0.5">
                              <span className="font-black text-slate-900 dark:text-white">{t.ticketNumber} - {t.reporterName}</span>
                              <span className="text-[9px] text-muted-foreground truncate max-w-[220px] sm:max-w-[300px]">{t.description}</span>
                            </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-[9px] text-muted-foreground italic px-1 text-left">
                    {selectedTicketId === 'NEW' 
                      ? "Tiket bantuan baru akan dibuat secara otomatis untuk menjamin transparansi progres pengerjaan."
                      : "Jadwal ini akan menyinkronkan progres dengan tiket bantuan yang dipilih."}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm select-none">📅</span>
                        <h3 className="font-black text-[10px] uppercase tracking-wider text-foreground/70">Waktu & Jenis</h3>
                    </div>

                    <FormField control={form.control} name="scheduledDate" render={({ field }) => (
                        <FormItem className="flex flex-col text-left">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Tanggal Eksekusi</FormLabel>
                            <FormControl>
                                <div className="relative flex items-center">
                                    <Input 
                                        type="date"
                                        value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            if (!val) {
                                                field.onChange(null);
                                            } else {
                                                const parsed = parse(val, "yyyy-MM-dd", new Date());
                                                field.onChange(isValid(parsed) ? parsed : null);
                                            }
                                        }}
                                        className={cn(inputClass, "pr-10 text-black dark:text-white")}
                                    />
                                    <div className="absolute right-3 pointer-events-none text-primary">
                                        <CalendarIcon className="h-4 w-4" />
                                    </div>
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="type" render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Kategori Pekerjaan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={cn(inputClass, "text-black dark:text-white")}>
                                        <SelectValue placeholder="Pilih jenis pekerjaan" />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    {maintenanceTypes.map(t => <SelectItem key={t} value={t} className="font-bold text-xs">{t}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="status" render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Status Penjadwalan</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value} value={field.value}>
                                <FormControl>
                                    <SelectTrigger className={cn(inputClass, "text-black dark:text-white")}>
                                        <SelectValue />
                                    </SelectTrigger>
                                </FormControl>
                                <SelectContent className="rounded-xl">
                                    <SelectItem value="Dijadwalkan" className="font-bold text-xs">Dijadwalkan (Planned)</SelectItem>
                                    <SelectItem value="Diproses" className="font-bold text-xs">Diproses (In Progress)</SelectItem>
                                    <SelectItem value="Selesai" className="font-bold text-xs">Selesai (Completed)</SelectItem>
                                    <SelectItem value="Ditunda" className="font-bold text-xs">Ditunda (Postponed)</SelectItem>
                                </SelectContent>
                            </Select>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-100 dark:border-slate-800">
                        <span className="text-sm select-none">📝</span>
                        <h3 className="font-black text-[10px] uppercase tracking-wider text-foreground/70">Pelaksana & Catatan</h3>
                    </div>

                    <FormField control={form.control} name="technician" render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Nama Teknisi / Vendor</FormLabel>
                            <FormControl>
                                <div className="relative group">
                                    <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                                    <Input placeholder="Nama penanggung jawab..." {...field} className={cn(inputClass, "pl-11 font-bold text-black dark:text-white")} />
                                </div>
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />

                    <FormField control={form.control} name="notes" render={({ field }) => (
                        <FormItem className="text-left">
                            <FormLabel className="font-bold text-xs uppercase tracking-widest text-muted-foreground ml-1 text-left">Keterangan Teknis</FormLabel>
                            <FormControl>
                                <Textarea 
                                    placeholder="Jelaskan detail lingkup pekerjaan atau temuan awal..." 
                                    {...field} 
                                    className="min-h-[150px] bg-slate-50 dark:bg-slate-900 border-none rounded-xl p-4 shadow-inner resize-none font-medium leading-relaxed text-black dark:text-white" 
                                />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
              </div>

              <DialogFooter className="flex items-center justify-end gap-3 pt-6 border-t border-slate-100 dark:border-slate-800 mt-8 z-50">
                <DialogClose asChild>
                  <Button type="button" variant="ghost" className="rounded-xl px-6 font-bold text-black dark:text-white h-11">Batal</Button>
                </DialogClose>
                <Button type="submit" disabled={isLoading} className={cn("px-8 font-black rounded-xl transition-all h-11 uppercase text-[10px] tracking-wider text-white", isEditMode ? "bg-slate-900 hover:bg-black" : "bg-primary hover:bg-primary/90")}>
                  {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle2 className="mr-2 h-3.5 w-3.5" />}
                  {isEditMode ? 'Simpan Perubahan' : (selectedTicketId === 'NEW' ? 'Buat Tiket & Jadwal' : 'Simpan Jadwal')}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}
