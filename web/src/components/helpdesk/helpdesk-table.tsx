'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint, addDoc, serverTimestamp, doc, getDocs, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type HelpdeskTicket, type TicketStatus, type TicketPriority, type TicketCategory } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '../ui/skeleton';
import { 
  PlusCircle, 
  Search, 
  ChevronRight, 
  Clock, 
  MessageSquare, 
  Filter, 
  Activity,
  History,
  LifeBuoy,
  User,
  ShieldAlert,
  CheckCircle2,
  X,
  AlertTriangle,
  Building,
  Calendar as CalendarIcon,
  RotateCcw,
  FileDown,
  Info,
  AlertCircle,
  ShieldCheck,
  Layers,
  Hash,
  Wrench,
  Paperclip,
  Share2,
  Loader2
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { format, getMonth, getYear } from 'date-fns';
import { id } from 'date-fns/locale';
import { 
  DropdownMenu, 
  DropdownMenuCheckboxItem, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuLabel, 
  DropdownMenuSeparator, 
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import ExportHelpdeskButton from './export-helpdesk-button';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import TicketDetail from './ticket-detail';
import NewTicketForm from './new-ticket-form';
import React from 'react';
import { useToast } from '@/hooks/use-toast';

const months = [
  { value: 'all', label: 'Semua Bulan' },
  { value: '0', label: 'Januari' },
  { value: '1', label: 'Februari' },
  { value: '2', label: 'Maret' },
  { value: '3', label: 'April' },
  { value: '4', label: 'Mei' },
  { value: '5', label: 'Juni' },
  { value: '6', label: 'Juli' },
  { value: '7', label: 'Agustus' },
  { value: '8', label: 'September' },
  { value: '9', label: 'Oktober' },
  { value: '10', label: 'November' },
  { value: '11', label: 'Desember' },
];

const ticketCategories: TicketCategory[] = ['Hardware', 'Software', 'Jaringan', 'Lainnya'];

const getAlertStyles = (status: TicketStatus) => {
    switch (status) {
      case 'Selesai':
        return {
          container: "bg-emerald-50 dark:bg-emerald-950/20 border-emerald-500 dark:border-emerald-700 text-emerald-900 dark:text-emerald-100 hover:bg-emerald-100/70 dark:hover:bg-emerald-900/40 hover:shadow-md hover:shadow-emerald-500/5",
          icon: CheckCircle2,
          iconClass: "text-emerald-600",
          badgeClass: "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border-none"
        };
      case 'Diproses':
        return {
          container: "bg-sky-50 dark:bg-sky-950/20 border-sky-500 dark:border-sky-700 text-sky-900 dark:text-sky-100 hover:bg-sky-100/70 dark:hover:bg-sky-900/40 hover:shadow-md hover:shadow-sky-500/5",
          icon: Info,
          iconClass: "text-sky-600",
          badgeClass: "bg-sky-500/20 text-sky-700 dark:text-sky-300 border-none"
        };
      case 'Menunggu':
      default:
        return {
          container: "bg-rose-50 dark:bg-rose-950/20 border-rose-500 dark:border-rose-700 text-rose-900 dark:text-rose-100 hover:bg-rose-100/70 dark:hover:bg-rose-900/40 hover:shadow-md hover:shadow-rose-500/5",
          icon: AlertCircle,
          iconClass: "text-rose-600",
          badgeClass: "bg-rose-500/20 text-rose-700 dark:text-rose-300 border-none"
        };
    }
};

const getPriorityBadge = (priority?: TicketPriority) => {
    switch (priority) {
      case 'Kritis': return 'bg-red-600 text-white';
      case 'Tinggi': return 'bg-orange-500 text-white';
      case 'Normal': return 'bg-blue-600 text-white';
      case 'Rendah': return 'bg-slate-500 text-white';
      default: return 'bg-slate-500 text-white';
    }
};

const StatCard = ({ title, value, emoji, colorClass }: { title: string, value: number, emoji: string, colorClass: string }) => (
    <Card className={cn("border transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md rounded-2xl overflow-hidden", colorClass)}>
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider opacity-60">{title}</p>
                    <h3 className="text-2xl sm:text-3xl font-black mt-1 text-left leading-none">{value}</h3>
                </div>
                <div className="text-xl sm:text-2xl select-none shrink-0 p-1 bg-white/60 dark:bg-slate-800/60 rounded-xl shadow-inner">
                    {emoji}
                </div>
            </div>
        </CardContent>
    </Card>
);

const TicketItem = ({ ticket, maintenanceInfo }: { ticket: HelpdeskTicket, maintenanceInfo?: { type: string; code: string } }) => {
    const styles = getAlertStyles(ticket.status);
    const StatusIcon = styles.icon;
    const [isOpen, setIsOpen] = useState(false);

    const hasAttachment = !!ticket.photoURL || (ticket.updates?.some(u => !!u.attachmentURL) ?? false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <div 
                    role="alert" 
                    className={cn(
                        "p-4 rounded-[1.25rem] border border-l-4 flex items-center gap-4 transition duration-300 ease-in-out hover:-translate-y-[2px] cursor-pointer shadow-[0_4px_20px_-4px_rgba(0,0,0,0.05)] hover:shadow-[0_10px_30px_-5px_rgba(0,0,0,0.1)] relative overflow-hidden",
                        styles.container,
                        ticket.status === 'Menunggu' && "blinking-destructive-border",
                        ticket.status === 'Diproses' && "blinking-info-border"
                    )}
                >
                    <div className="p-2 bg-slate-50 dark:bg-slate-800/50 rounded-full shrink-0 shadow-inner">
                        <StatusIcon className={cn("h-5 w-5", styles.iconClass)} />
                    </div>
                    
                    <div className="flex-1 min-w-0 text-left">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{ticket.ticketNumber}</span>
                            <Badge className={cn("text-[8px] font-black px-2 py-0 h-4 uppercase border-none shadow-sm", getPriorityBadge(ticket.priority))}>
                                {ticket.priority || 'NORMAL'}
                            </Badge>
                            {hasAttachment && (
                                <Badge variant="outline" className="text-[8px] font-black px-2 py-0 h-4 uppercase border-slate-200 text-slate-500 bg-white/50 dark:bg-slate-900/50 flex items-center gap-1 shadow-sm">
                                    <Paperclip className="h-2.5 w-2.5" /> Ada Lampiran
                                </Badge>
                            )}
                            {maintenanceInfo && (
                                <div className="flex flex-wrap items-center gap-1.5">
                                    <Badge className="text-[8px] font-black font-mono px-2 py-0 h-4 uppercase bg-slate-900 text-emerald-400 border-none shadow-sm">
                                        {maintenanceInfo.code}
                                    </Badge>
                                    <Badge variant="outline" className="text-[8px] font-black px-2 py-0 h-4 uppercase border-primary/30 text-primary bg-primary/5 flex items-center gap-1">
                                        <Wrench className="h-2.5 w-2.5" /> Maintenance: {maintenanceInfo.type}
                                    </Badge>
                                </div>
                            )}
                        </div>
                        <h3 className="text-sm sm:text-base font-black uppercase tracking-tight truncate leading-tight text-slate-800 dark:text-slate-100 text-left">
                            {ticket.description}
                        </h3>
                        <div className="flex flex-wrap items-center gap-x-3 mt-1.5 text-[10px] font-bold opacity-75 uppercase tracking-widest text-slate-500 dark:text-slate-400 text-left">
                            <span className="flex items-center gap-1.5"><User className="h-3 w-3 text-primary" /> {ticket.reporterName}</span>
                            <span className="flex items-center gap-1.5"><Building className="h-3 w-3 text-primary" /> {ticket.reporterDept}</span>
                            <span className="flex items-center gap-1.5 text-left"><Clock className="h-3 w-3 text-primary" /> {ticket.reportedAt ? format(ticket.reportedAt.toDate(), 'dd/MM/yyyy HH:mm', { locale: id }) : ''}</span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 ml-4">
                        <div className="hidden sm:flex flex-col items-end">
                            <span className="text-[8px] font-black uppercase opacity-40 tracking-[0.2em]">{ticket.status === 'Selesai' ? 'SUCCESS' : (ticket.status === 'Diproses' ? 'PROGRESS' : 'WAITING')}</span>
                            <Badge className={cn("text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full", styles.badgeClass)}>
                                {ticket.status}
                            </Badge>
                        </div>
                        <ChevronRight className="h-5 w-5 text-slate-400 opacity-40 group-hover:opacity-100 transition-opacity" />
                    </div>
                </div>
            </DialogTrigger>
            <DialogContent 
              onPointerDownOutside={(e) => e.preventDefault()}
              className="w-[98%] max-w-5xl h-[95vh] sm:h-[90vh] overflow-hidden p-0 border-none bg-slate-50 dark:bg-slate-950 shadow-3xl rounded-[2.5rem] mx-auto text-black flex flex-col"
            >
                <DialogHeader className="p-8 bg-white dark:bg-slate-900 border-b shrink-0">
                    <DialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Detail Tiket {ticket.ticketNumber}</DialogTitle>
                    <DialogDescription className="text-left font-medium">Melihat rincian dan progres pengerjaan tiket bantuan IT.</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-hidden">
                    <TicketDetail ticketId={ticket.id} onBack={() => setIsOpen(false)} />
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default function HelpdeskTable() {
  const [tickets, setTickets] = useState<HelpdeskTicket[]>([]);
  const [maintenanceMap, setMaintenanceMap] = useState<Record<string, { type: string; code: string }>>({});
  const [reportMap, setReportMap] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaintenanceType, setSelectedMaintenanceType] = useState<string>('all');
  const [reporterSearch, setReporterSearch] = useState('');
  const [statusFilters, setStatusFilters] = useState<TicketStatus[]>([]);
  
  const [isNewTicketOpen, setIsNewTicketOpen] = useState(false);

  const fetchHelpdeskData = async (isManual = false) => {
    if (!user) return;
    try {
      setLoading(true);
      const qMaint = query(collection(db, 'maintenance_schedules'));
      const snapMaint = await getDocs(qMaint);
      const mappingMaint: Record<string, { type: string; code: string }> = {};
      snapMaint.forEach(doc => {
          const data = doc.data();
          const code = data.code || (`MNT-${doc.id.slice(0, 6).toUpperCase()}`);
          if (data.ticketId) mappingMaint[data.ticketId] = { type: data.type || 'Maintenance', code };
      });
      setMaintenanceMap(mappingMaint);

      const qReports = query(collection(db, 'it_problem_reports'));
      const snapReports = await getDocs(qReports);
      const mappingReports: Record<string, string> = {};
      snapReports.forEach(doc => {
          const data = doc.data();
          if (data.ticketId) mappingReports[data.ticketId] = doc.id;
      });
      setReportMap(mappingReports);

      let q: QueryConstraint[] = [];
      if (user.role !== 'Admin') {
        q.push(where('reportedBy', '==', user.uid));
      }
      const finalQuery = query(collection(db, 'helpdesk_tickets'), ...q, limit(500));
      const snapTickets = await getDocs(finalQuery);
      const ticketsData = snapTickets.docs.map(doc => ({ id: doc.id, ...doc.data() } as HelpdeskTicket));
      setTickets(ticketsData.sort((a, b) => (b.reportedAt?.toMillis() || 0) - (a.reportedAt?.toMillis() || 0)));
      
      if (isManual) {
        toast({ title: 'Sinkronisasi Berhasil', description: 'Data helpdesk terbaru telah dimuat ulang.' });
      }
    } catch (error) {
      console.error("Error loading helpdesk data:", error);
      if (isManual) {
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memuat ulang data.' });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading || !user) return;
    fetchHelpdeskData();
  }, [user, authLoading]);

  const uniqueDepts = useMemo(() => {
    return Array.from(new Set(tickets.map(t => t.reporterDept).filter((d): d is string => !!d))).sort();
  }, [tickets]);

  const uniqueYears = useMemo(() => {
    const years = tickets
        .filter(t => t.reportedAt) // Pastikan data reportedAt ada
        .map(t => getYear(t.reportedAt.toDate()).toString());
    return Array.from(new Set(years)).sort((a, b) => parseInt(b) - parseInt(a));
  }, [tickets]);

  const maintenanceCategoriesList = useMemo(() => {
    return Array.from(new Set(Object.values(maintenanceMap).map(m => m.type))).sort();
  }, [maintenanceMap]);

  const filteredTickets = useMemo(() => {
    return tickets.filter(ticket => {
      const maintInfo = maintenanceMap[ticket.id];
      const searchMatch = !searchTerm || 
        (ticket.ticketNumber?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ticket.description?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (maintInfo?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (maintInfo?.type?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const reportedAt = ticket.reportedAt;
      if (!reportedAt) return false; // Abaikan data tanpa tanggal untuk filter waktu

      const date = reportedAt.toDate();
      const monthMatch = selectedMonth === 'all' || getMonth(date).toString() === selectedMonth;
      const yearMatch = selectedYear === 'all' || getYear(date).toString() === selectedYear;
      
      const deptMatch = selectedDept === 'all' || ticket.reporterDept === selectedDept;
      const categoryMatch = selectedCategory === 'all' || ticket.category === selectedCategory;
      const reporterMatch = !reporterSearch || (ticket.reporterName?.toLowerCase() || '').includes(reporterSearch.toLowerCase());
      
      const statusMatch = statusFilters.length === 0 || statusFilters.includes(ticket.status);

      const ticketMaintType = maintInfo?.type || 'None';
      const maintenanceMatch = selectedMaintenanceType === 'all' || ticketMaintType === selectedMaintenanceType;

      return searchMatch && monthMatch && yearMatch && deptMatch && categoryMatch && reporterMatch && statusMatch && maintenanceMatch;
    });
  }, [tickets, searchTerm, selectedMonth, selectedYear, selectedDept, selectedCategory, reporterSearch, statusFilters, selectedMaintenanceType, maintenanceMap]);

  const stats = useMemo(() => ({
    total: tickets.length,
    waiting: tickets.filter(t => t.status === 'Menunggu').length,
    processing: tickets.filter(t => t.status === 'Diproses').length,
    done: tickets.filter(t => t.status === 'Selesai').length,
  }), [tickets]);

  const handleShareSummaryReport = async () => {
    if (filteredTickets.length === 0) return;
    setIsSharing(true);
    try {
        const reportData = {
            title: `Laporan Ringkasan Helpdesk IT - ${format(new Date(), 'MMMM yyyy', {locale: id})}`,
            type: 'HELPDESK_SUMMARY',
            processedBy: user?.displayName || user?.email,
            createdAt: serverTimestamp(),
            items: filteredTickets.map(t => ({
                id: t.id,
                reportId: reportMap[t.id] || null,
                code: t.ticketNumber,
                name: t.reporterName,
                dept: t.reporterDept,
                category: t.category,
                description: t.description,
                status: t.status,
                date: t.reportedAt?.toMillis() || null
            }))
        };

        const docRef = await addDoc(collection(db, 'public_reports'), reportData);
        const publicUrl = `${window.location.origin}/public/report?s=${docRef.id}`;

        if (navigator.share) {
            try {
                await navigator.share({ title: reportData.title, url: publicUrl });
                toast({ title: 'Laporan Dibagikan' });
            } catch (shareError: any) {
                if (shareError.name !== 'AbortError') {
                    await navigator.clipboard.writeText(publicUrl);
                    toast({ title: 'Link Disalin', description: 'Fitur berbagi sistem diblokir, tautan telah disalin ke papan klip.' });
                }
            }
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
        }
    } catch (e) {
        console.error(e);
        toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
        setIsSharing(false);
    }
  };

  const toggleStatusFilter = (status: TicketStatus) => {
    setStatusFilters(prev => 
      prev.includes(status) ? prev.filter(s => s !== status) : [...prev, status]
    );
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedDept('all');
    setSelectedCategory('all');
    setSelectedMaintenanceType('all');
    setReporterSearch('');
    setStatusFilters([]);
  };

  const activeFiltersCount = useMemo(() => {
    let count = 0;
    if (selectedMonth !== 'all') count++;
    if (selectedYear !== 'all') count++;
    if (selectedDept !== 'all') count++;
    if (selectedCategory !== 'all') count++;
    if (selectedMaintenanceType !== 'all') count++;
    if (reporterSearch) count++;
    if (statusFilters.length > 0) count++;
    return count;
  }, [selectedMonth, selectedYear, selectedDept, selectedCategory, selectedMaintenanceType, reporterSearch, statusFilters]);

  return (
    <div className="space-y-6 sm:space-y-8 w-full max-w-full overflow-hidden pb-10 text-black">
        {/* Hero & Stats */}
        <div className="relative p-5 sm:p-8 rounded-[1.5rem] sm:rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="space-y-2 text-left">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5">
                            <LifeBuoy className="h-8 w-8 text-primary animate-pulse" />
                        </div>
                        <div className="text-left">
                            <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-left">IT Helpdesk</h1>
                            <p className="text-primary/60 font-black text-[9px] uppercase tracking-[0.3em] mt-0.5 text-left">Corporate Support Center</p>
                        </div>
                    </div>
                    <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl text-left">Pusat pelaporan kendala IT terpadu PT. China Glaze Indonesia untuk respon cepat dan solusi terverifikasi.</p>
                </div>
                
                <div className="flex flex-wrap items-center gap-2.5">
                    <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm shadow-inner gap-2">
                        <Button onClick={() => fetchHelpdeskData(true)} variant="ghost" disabled={loading} className="h-10 w-10 p-0 rounded-xl text-white hover:bg-white/10" title="Refresh Data">
                            <RotateCcw className={cn("h-4 w-4", loading && "animate-spin")} />
                        </Button>
                        <ExportHelpdeskButton tickets={filteredTickets} reportMap={reportMap} />
                        <Button onClick={handleShareSummaryReport} variant="ghost" disabled={isSharing} className="h-10 rounded-xl text-xs font-bold text-white hover:bg-white/10">
                            {isSharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="mr-2 h-4 w-4" />} Bagikan Laporan
                        </Button>
                    </div>
                    <Dialog open={isNewTicketOpen} onOpenChange={setIsNewTicketOpen}>
                        <DialogTrigger asChild>
                            <Button className="rounded-2xl h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 px-6 transition-all hover:scale-102 active:scale-95 group text-xs text-white">
                                <PlusCircle className="mr-2 h-4.5 w-4.5 group-hover:rotate-90 transition-transform duration-300" />
                                Lapor Masalah
                            </Button>
                        </DialogTrigger>
                        <DialogContent 
                            onPointerDownOutside={(e) => e.preventDefault()}
                            className="sm:max-w-2xl h-[90vh] p-0 border-none shadow-3xl bg-white dark:bg-slate-950 rounded-[2.5rem] text-black overflow-hidden flex flex-col"
                        >
                            <DialogHeader className="p-8 bg-white dark:bg-slate-900 border-b shrink-0">
                                <DialogTitle className="text-2xl font-black uppercase tracking-tight text-left">Laporan Masalah IT Baru</DialogTitle>
                                <DialogDescription className="text-left font-medium">Silakan isi detail kendala IT yang Anda hadapi untuk segera diproses.</DialogDescription>
                            </DialogHeader>
                            <div className="flex-1 overflow-hidden">
                                <NewTicketForm onComplete={() => setIsNewTicketOpen(false)} />
                            </div>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
            <StatCard title="Total Riwayat" value={stats.total} emoji="📋" colorClass="bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-800 dark:text-slate-100" />
            <StatCard title="Menunggu Review" value={stats.waiting} emoji="⏳" colorClass="bg-rose-50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/30 text-rose-900 dark:text-rose-100" />
            <StatCard title="Sedang Diproses" value={stats.processing} emoji="⚙️" colorClass="bg-sky-50 dark:bg-sky-950/20 border-sky-100 dark:border-sky-900/30 text-sky-900 dark:text-sky-100" />
            <StatCard title="Telah Selesai" value={stats.done} emoji="✅" colorClass="bg-emerald-50 dark:bg-emerald-950/20 border-emerald-100 dark:border-emerald-900/30 text-emerald-900 dark:text-emerald-100" />
        </div>

        {/* Filter Area */}
        <Card className="border-none shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden text-black">
            <CardHeader className="p-4 sm:p-6 md:p-8 pb-4 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-3 mb-6 text-left">
                    <Filter className="h-5 w-5 text-primary" />
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Audit Matrix Filter</h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 md:gap-6 items-end">
                    <div className="md:col-span-4 space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Cari Nomor Tiket / Deskripsi</Label>
                        <div className="relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Cari..." 
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="h-12 pl-11 rounded-2xl bg-white border-slate-200 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Waktu Kejadian</Label>
                        <div className="flex gap-2">
                            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-slate-200 shadow-inner">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    {months.map(m => <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>)}
                                </SelectContent>
                            </Select>
                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                <SelectTrigger className="h-12 rounded-2xl bg-white border-slate-200 shadow-inner w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent className="rounded-2xl">
                                    <SelectItem value="all">Semua</SelectItem>
                                    {uniqueYears.map(y => <SelectItem key={y} value={y}>{y}</SelectItem>)}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="md:col-span-3 space-y-2 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Cari Nama Pelapor</Label>
                        <div className="relative group">
                            <User className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            <Input 
                                placeholder="Nama karyawan..." 
                                value={reporterSearch}
                                onChange={(e) => setReporterSearch(e.target.value)}
                                className="h-12 pl-11 rounded-2xl bg-white border-slate-200 shadow-inner"
                            />
                        </div>
                    </div>

                    <div className="md:col-span-2">
                        <Button variant="ghost" onClick={resetFilters} className="w-full h-12 rounded-2xl text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all active:scale-95">
                            <RotateCcw className="mr-2 h-4 w-4" /> Reset Filter
                        </Button>
                    </div>
                </div>

                <div className="pt-6 grid grid-cols-1 lg:grid-cols-3 gap-6 text-left border-t border-slate-100 dark:border-slate-800 mt-6">
                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
                            <Building className="h-3 w-3" /> Filter Departemen Unit
                        </Label>
                        <div className="flex flex-wrap gap-2 text-left">
                            <button 
                                onClick={() => setSelectedDept('all')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                    selectedDept === 'all' ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                Semua Dept
                            </button>
                            {uniqueDepts.map(dept => (
                                <button 
                                    key={dept}
                                    onClick={() => setSelectedDept(dept)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedDept === dept ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                    )}
                                >
                                    {dept}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
                            <Layers className="h-3 w-3" /> Kategori Kendala IT
                        </Label>
                        <div className="flex flex-wrap gap-2 text-left">
                            <button 
                                onClick={() => setSelectedCategory('all')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                    selectedCategory === 'all' ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                Semua Kategori
                            </button>
                            {ticketCategories.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedCategory === cat ? "bg-violet-600 text-white shadow-lg shadow-violet-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2 text-left">
                            <Wrench className="h-3 w-3" /> Filter Kategori Maintenance
                        </Label>
                        <div className="flex flex-wrap gap-2 text-left">
                            <button 
                                onClick={() => setSelectedMaintenanceType('all')}
                                className={cn(
                                    "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                    selectedMaintenanceType === 'all' ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                Semua
                            </button>
                            {maintenanceCategoriesList.map(cat => (
                                <button 
                                    key={cat}
                                    onClick={() => setSelectedMaintenanceType(cat)}
                                    className={cn(
                                        "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                        selectedMaintenanceType === cat ? "bg-amber-500 text-white shadow-lg shadow-amber-500/20" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                    )}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            </CardHeader>
        </Card>

        {/* Helpdesk Log Area */}
        <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
            <CardHeader className="p-4 sm:p-8 md:p-12 pb-4 border-b border-primary/5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 w-full">
                    <div className="flex items-center gap-4 text-left w-full sm:w-auto">
                        <div className="p-3 bg-primary/10 rounded-2xl">
                            <History className="h-6 w-6 text-primary" />
                        </div>
                        <div className="text-left">
                            <CardTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Pusat Log Helpdesk</CardTitle>
                            <CardDescription className="font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] text-muted-foreground text-left">Daftar Tiket Dukungan Teknis</CardDescription>
                        </div>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="p-4 sm:p-8 md:p-12 text-black dark:text-white">
                <div className="flex items-center justify-between mb-6 px-1 text-left">
                    <div className="flex items-center gap-2 text-left">
                        <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
                            Ditemukan: {filteredTickets.length} Laporan
                        </Badge>
                        {activeFiltersCount > 0 && (
                            <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest border-rose-200 bg-rose-50 text-rose-600 animate-in zoom-in-95">
                                Filter Aktif: {activeFiltersCount}
                            </Badge>
                        )}
                    </div>
                    
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button 
                                variant="outline" 
                                className={cn(
                                    "h-10 px-6 rounded-xl bg-white border-slate-200 font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(0,0,0,0.05)] active:translate-y-[2px] active:shadow-none transition-all text-black dark:text-white",
                                    statusFilters.length > 0 && "border-primary text-primary"
                                )}
                            >
                                <Activity className="mr-2 h-3.5 w-3.5" /> 
                                Filter Progres {statusFilters.length > 0 && `(${statusFilters.length})`}
                            </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-56 rounded-2xl p-2 shadow-2xl text-black bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800">
                            <DropdownMenuLabel className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/70 px-4 py-2 text-left">Urutan Penyelesaian</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuCheckboxItem
                                checked={statusFilters.includes('Menunggu')}
                                onCheckedChange={() => toggleStatusFilter('Menunggu')}
                                className="rounded-xl font-bold text-xs py-2.5"
                            >
                                Menunggu Review
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={statusFilters.includes('Diproses')}
                                onCheckedChange={() => toggleStatusFilter('Diproses')}
                                className="rounded-xl font-bold text-xs py-2.5"
                            >
                                Sedang Diproses
                            </DropdownMenuCheckboxItem>
                            <DropdownMenuCheckboxItem
                                checked={statusFilters.includes('Selesai')}
                                onCheckedChange={() => toggleStatusFilter('Selesai')}
                                className="rounded-xl font-bold text-xs py-2.5"
                            >
                                Telah Selesai
                            </DropdownMenuCheckboxItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                </div>

                <div className="space-y-3 pb-10">
                    {loading || authLoading ? (
                        Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[1.5rem]" />)
                    ) : filteredTickets.length > 0 ? (
                        filteredTickets.map(ticket => (
                            <TicketItem 
                                key={ticket.id} 
                                ticket={ticket} 
                                maintenanceInfo={maintenanceMap[ticket.id]} 
                            />
                        ))
                    ) : (
                        <div className="text-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] border-4 border-dashed border-slate-100 dark:border-slate-800 transition-all">
                            <MessageSquare className="h-14 w-14 text-slate-200 mb-6 mx-auto" />
                            <h3 className="text-lg font-black text-slate-400 uppercase tracking-widest text-center">Data Tidak Ditemukan</h3>
                            <p className="text-xs text-slate-400 font-medium italic mt-2 text-center">Coba ubah kriteria filter atau kata kunci pencarian Anda.</p>
                        </div>
                    )}
                </div>
            </CardContent>

            <CardFooter className="p-4 sm:p-6 md:p-8 bg-slate-50 dark:bg-slate-900/50 border-t flex items-center justify-between">
                <div className="flex items-center gap-2 text-left">
                    <ShieldCheck className="text-emerald-600 h-5 w-5" />
                    <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-left">
                        Seluruh log pengerjaan tiket helpdesk tersinkronisasi secara otomatis untuk integritas audit korporat.
                    </p>
                </div>
            </CardFooter>
        </Card>
    </div>
  );
}
