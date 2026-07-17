'use client';

/**
 * @fileOverview Dashboard Pemeliharaan Korporat.
 * Desain: Premium, Bersih, dan Berorientasi Data.
 * Mencakup statistik pemeliharaan dan daftar jadwal terpadu.
 * Fitur: Filter Tanggal, User, Departemen, Pencarian Cepat, dan Selection Mode.
 * Update: Fitur "Bagikan Laporan" untuk transparansi pengerjaan.
 */

import { useState, useEffect, useMemo, useCallback } from 'react';
import { collection, onSnapshot, query, orderBy, where, QueryConstraint, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type MaintenanceSchedule } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Skeleton } from '../ui/skeleton';
import { 
  PlusCircle, 
  Wrench, 
  Printer, 
  ClipboardList, 
  Calendar as CalendarIcon, 
  CheckCircle2, 
  AlertCircle,
  Activity,
  LayoutGrid,
  SmartphoneNfc,
  Clock,
  CheckSquare,
  ChevronDown,
  Search,
  Filter,
  RotateCcw,
  User as UserIcon,
  Building,
  QrCode,
  Share2,
  Loader2
} from 'lucide-react';
import { format, isPast, getMonth, getYear } from 'date-fns';
import { id } from 'date-fns/locale';
import MaintenanceScheduleForm from './maintenance-schedule-form';
import { useToast } from '@/hooks/use-toast';
import MaintenanceItem from './maintenance-item';
import MaintenanceDetailCard from './maintenance-detail-card';
import { AnimatePresence } from 'framer-motion';
import { Checkbox } from '../ui/checkbox';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { Input } from '../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import AssetDetailDialog from '@/components/assets/asset-detail-dialog';

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

const StatCard = ({ label, value, emoji, subValue }: { label: string, value: number, emoji: string, subValue?: string }) => (
    <Card className="border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-2xl overflow-hidden transition-all duration-300 shadow-[0_2px_8px_rgba(0,0,0,0.02)] hover:shadow-md">
        <CardContent className="p-4 sm:p-5 flex flex-col justify-between h-full">
            <div className="flex items-start justify-between">
                <div className="space-y-1 text-left">
                    <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">{label}</p>
                    <h3 className="text-2xl sm:text-3xl font-black text-slate-900 dark:text-white mt-1 text-left leading-none">{value}</h3>
                </div>
                <div className="text-xl sm:text-2xl select-none shrink-0 p-1 bg-slate-50 dark:bg-slate-800/80 rounded-xl">
                    {emoji}
                </div>
            </div>
            {subValue && (
                <div className="mt-3 flex">
                    <span className="text-[8px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-950/30 px-2 py-0.5 rounded uppercase tracking-wider">{subValue}</span>
                </div>
            )}
        </CardContent>
    </Card>
);

export default function MaintenanceCalendar() {
  const [schedules, setSchedules] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSharing, setIsSharing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isSelectionMode, setIsSelectionMode] = useState(false);
  
  // Filter States
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>('all');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [userSearch, setUserSearch] = useState('');

  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  // Asset Detail State
  const [viewAssetId, setViewAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  
  useEffect(() => {
    if (authLoading || !user) return;
    setLoading(true);

    const queryConstraints: QueryConstraint[] = [];
    
    if (user.role !== 'Admin' && user.department) {
        queryConstraints.push(where('department', '==', user.department));
    }
    
    queryConstraints.push(orderBy('scheduledDate', 'desc'));

    const q = query(collection(db, 'maintenance_schedules'), ...queryConstraints);
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
        const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule));
        setSchedules(data);
        setLoading(false);
    }, (error) => {
        console.error("Error fetching maintenance schedules:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);

  const uniqueDepts = useMemo(() => {
    return Array.from(new Set(schedules.map(s => s.department))).sort();
  }, [schedules]);

  const uniqueYears = useMemo(() => {
    const years = schedules.map(s => getYear(s.scheduledDate.toDate()).toString());
    return Array.from(new Set(years)).sort((a, b) => parseInt(b) - parseInt(a));
  }, [schedules]);

  const filteredSchedules = useMemo(() => {
    return schedules.filter(s => {
      const searchMatch = !searchTerm || 
        s.assetName.toLowerCase().includes(searchTerm.toLowerCase()) || 
        s.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (s.technician?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const date = s.scheduledDate.toDate();
      const monthMatch = selectedMonth === 'all' || getMonth(date).toString() === selectedMonth;
      const yearMatch = selectedYear === 'all' || getYear(date).toString() === selectedYear;
      
      const deptMatch = selectedDept === 'all' || s.department === selectedDept;
      const userMatch = !userSearch || (s.assetUser?.toLowerCase() || '').includes(userSearch.toLowerCase());

      return searchMatch && monthMatch && yearMatch && deptMatch && userMatch;
    });
  }, [schedules, searchTerm, selectedMonth, selectedYear, selectedDept, userSearch]);

  const stats = useMemo(() => {
    const now = new Date();
    return {
        total: filteredSchedules.length,
        scheduled: filteredSchedules.filter(s => s.status === 'Dijadwalkan').length,
        processing: filteredSchedules.filter(s => s.status === 'Diproses').length,
        done: filteredSchedules.filter(s => s.status === 'Selesai').length,
        overdue: filteredSchedules.filter(s => s.status === 'Dijadwalkan' && isPast(s.scheduledDate.toDate())).length
    };
  }, [filteredSchedules]);

  const handleToggle = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedIds(filteredSchedules.map(s => s.id));
    } else {
      setSelectedIds([]);
    }
  };

  const resetFilters = () => {
    setSearchTerm('');
    setSelectedMonth('all');
    setSelectedYear('all');
    setSelectedDept('all');
    setUserSearch('');
  };

  const isAllSelected = filteredSchedules.length > 0 && selectedIds.length === filteredSchedules.length;
  const isIndeterminate = selectedIds.length > 0 && !isAllSelected;
  
  const handlePrint = async () => {
    const schedulesToPrint = selectedIds.length > 0 ? filteredSchedules.filter(s => selectedIds.includes(s.id)) : filteredSchedules;
    if (schedulesToPrint.length === 0) {
        toast({ variant: "destructive", title: "Tidak Ada Data" });
        return;
    }
      
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const tableRows = schedulesToPrint.map((schedule, idx) => {
        const ticketLink = schedule.ticketNumber && schedule.ticketId 
            ? `<a href="${window.location.origin}/public/helpdesk?id=${schedule.ticketId}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${schedule.ticketNumber}</a>`
            : '-';
            
        const statusClass = {
            'Selesai': 'badge-selesai',
            'Diproses': 'badge-proses',
            'Dijadwalkan': 'badge-jadwal',
            'Ditunda': 'badge-tunda'
        }[schedule.status] || '';

        const progressPhoto = schedule.progressPhotoURL 
            ? `<img class="img-thumbnail" src="${schedule.progressPhotoURL}" />`
            : '<span style="color: #94a3b8; font-style: italic;">-</span>';

        const completionSig = schedule.completionPhotoURL 
            ? `<img class="img-signature" src="${schedule.completionPhotoURL}" />`
            : '<span style="color: #94a3b8; font-style: italic;">-</span>';

        return `
            <tr>
                <td style="text-align: center;">${idx + 1}</td>
                <td>${format(schedule.scheduledDate.toDate(), 'dd MMM yyyy', { locale: id })}</td>
                <td>
                    <div style="font-weight: bold; color: #0f172a;">${schedule.assetName}</div>
                    <div style="font-size: 8pt; font-family: monospace; color: #64748b; margin-top: 2px;">${schedule.assetCode}</div>
                    <div style="font-size: 7.5pt; color: #475569; margin-top: 1px;">Dept: ${schedule.department}</div>
                </td>
                <td style="text-align: center;">${ticketLink}</td>
                <td>${schedule.type}</td>
                <td>${schedule.technician || '-'}</td>
                <td style="text-align: center;">${progressPhoto}</td>
                <td style="text-align: center;">${completionSig}</td>
                <td style="text-align: center;"><span class="badge-status ${statusClass}">${schedule.status}</span></td>
                <td style="font-size: 8pt; color: #475569;">${schedule.notes || ''}</td>
            </tr>
        `;
    }).join('');

    const printContent = `
      <html>
        <head>
          <title>Laporan Maintenance - PT. CGI</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 25px; color: #1e293b; font-size: 9pt; }
            .header-container { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px double #334155; padding-bottom: 12px; margin-bottom: 20px; }
            .company-info { text-align: left; }
            .company-name { font-size: 14pt; font-weight: 900; color: #0f172a; text-transform: uppercase; letter-spacing: 1px; }
            .company-sub { font-size: 8pt; color: #64748b; font-weight: bold; margin-top: 2px; }
            .report-title { text-align: right; }
            .title-main { font-size: 13pt; font-weight: 900; color: #1e3a8a; text-transform: uppercase; }
            .title-sub { font-size: 8pt; color: #475569; font-weight: bold; margin-top: 2px; }
            
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #94a3b8; padding: 8px 6px; text-align: left; vertical-align: middle; }
            th { background-color: #f8fafc; font-weight: bold; font-size: 8pt; color: #1e293b; text-align: center; text-transform: uppercase; }
            .th-sub { display: block; font-weight: normal; font-size: 7.5pt; color: #475569; text-transform: capitalize; margin-top: 2px; }
            
            .text-center { text-align: center; }
            .badge-status { display: inline-block; padding: 3px 6px; border-radius: 4px; font-size: 7.5pt; font-weight: bold; text-transform: uppercase; }
            .badge-selesai { background-color: #dcfce7; color: #166534; border: 1px solid #bbf7d0; }
            .badge-proses { background-color: #fef9c3; color: #854d0e; border: 1px solid #fef08a; }
            .badge-jadwal { background-color: #dbeafe; color: #1e40af; border: 1px solid #bfdbfe; }
            .badge-tunda { background-color: #fee2e2; color: #991b1b; border: 1px solid #fecaca; }
            
            .img-thumbnail { max-height: 45px; max-width: 70px; border-radius: 4px; border: 1px solid #cbd5e1; object-fit: contain; }
            .img-signature { max-height: 35px; max-width: 80px; object-fit: contain; }
            
            .signature-section { margin-top: 45px; page-break-inside: avoid; }
            .signature-table { width: 100%; border: none; }
            .signature-table td { border: none; text-align: center; width: 33.3%; padding-top: 10px; font-size: 9pt; }
            .signature-space { height: 65px; vertical-align: middle; text-align: center; }
            .underline { text-decoration: underline; font-weight: bold; }
            
            @media print { 
              @page { size: A4 landscape; margin: 1cm; } 
              body { padding: 0; }
            }
          </style>
        </head>
        <body>
          <div class="header-container">
            <div class="company-info">
              <div class="company-name">PT. China Glaze Indonesia</div>
              <div class="company-sub">Asset Management & Corporate Maintenance Service</div>
            </div>
            <div class="report-title">
              <div class="title-main">Log Pemeliharaan Aset Terpadu</div>
              <div class="title-sub">Dicetak pada: ${format(new Date(), 'PPPP', { locale: id })}</div>
            </div>
          </div>

          <table>
            <thead>
              <tr>
                <th style="width: 4%;">No</th>
                <th style="width: 10%;">Tgl Jadwal<br><span class="th-sub">Scheduled Date</span></th>
                <th style="width: 20%;">Informasi Aset<br><span class="th-sub">Asset Details</span></th>
                <th style="width: 10%;">No. Tiket<br><span class="th-sub">Ticket No.</span></th>
                <th style="width: 12%;">Jenis Pekerjaan<br><span class="th-sub">Work Type</span></th>
                <th style="width: 10%;">Teknisi<br><span class="th-sub">Technician</span></th>
                <th style="width: 8%;">Bukti Foto<br><span class="th-sub">Evidence</span></th>
                <th style="width: 10%;">Tanda Tangan<br><span class="th-sub">Signature</span></th>
                <th style="width: 8%;">Status<br><span class="th-sub">Status</span></th>
                <th style="width: 8%;">Keterangan<br><span class="th-sub">Notes</span></th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <div class="signature-section">
            <table class="signature-table">
              <tr>
                <td>Dibuat Oleh,<br><i>(Prepared By)</i></td>
                <td>Diperiksa Oleh,<br><i>(Checked By)</i></td>
                <td>Disetujui Oleh,<br><i>(Approved By)</i></td>
              </tr>
              <tr>
                <td class="signature-space">
                  ${schedulesToPrint.length === 1 && schedulesToPrint[0].completionPhotoURL 
                      ? `<img class="img-signature" src="${schedulesToPrint[0].completionPhotoURL}" style="max-height: 60px;" />` 
                      : ''}
                </td>
                <td class="signature-space"></td>
                <td class="signature-space"></td>
              </tr>
              <tr>
                <td class="underline">${schedulesToPrint.length === 1 ? (schedulesToPrint[0].technician || 'Teknisi') : 'Teknisi / Pelaksana'}</td>
                <td class="underline">Supervisor / Head of Dept.</td>
                <td class="underline">General Affairs Manager</td>
              </tr>
            </table>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const handleShareMaintenanceReport = async () => {
    if (filteredSchedules.length === 0) return;
    setIsSharing(true);
    try {
        const reportData = {
            title: `Log Pemeliharaan Aset - ${format(new Date(), 'MMMM yyyy', {locale: id})}`,
            type: 'MAINTENANCE_LOG',
            processedBy: user?.displayName || user?.email,
            createdAt: serverTimestamp(),
            items: filteredSchedules.map(s => ({
                code: s.assetCode,
                assetName: s.assetName,
                type: s.type,
                status: s.status,
                description: s.notes,
                date: s.scheduledDate.toMillis()
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
                    toast({ title: 'Link Disalin', description: 'Gagal memanggil sistem berbagi, tautan telah disalin ke papan klip.' });
                }
            }
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
        }
    } catch (e) {
        toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
        setIsSharing(false);
    }
  };
  
  const handleViewDetail = (id: string) => {
    setViewAssetId(id);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-6 sm:space-y-8 md:space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
      {/* Header Premium */}
      <div className="relative p-5 sm:p-8 md:p-10 rounded-[1.5rem] sm:rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="space-y-2 text-left">
                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-left">
                    <div className="p-3 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5 w-max">
                        <Wrench className="h-8 w-8 text-primary animate-pulse" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black tracking-tighter uppercase italic text-left">Master Maintenance</h1>
                        <p className="text-primary/60 font-black text-[9px] uppercase tracking-[0.3em] mt-0.5 text-left">Industrial Asset Reliability System</p>
                    </div>
                </div>
                <p className="text-slate-400 font-medium text-xs sm:text-sm max-w-xl text-left">Pemeliharaan preventif, kalibrasi instrumen, dan inspeksi rutin untuk menjamin kelancaran operasional PT. China Glaze Indonesia.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-white/5 p-1.5 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <Button onClick={handleShareMaintenanceReport} variant="ghost" disabled={isSharing} className="rounded-xl h-10 px-3 text-xs font-bold text-white hover:bg-white/10">
                        {isSharing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Share2 className="mr-2 h-4 w-4 text-primary" />} Bagikan Log
                    </Button>
                </div>
                
                <Button asChild className="rounded-xl h-10 bg-amber-500 hover:bg-amber-600 text-white font-bold uppercase text-xs tracking-wider transition-all px-5 text-white">
                    <Link href="/audit-asset">
                        <span className="mr-1.5 text-sm select-none">📋</span> Audit Umum
                    </Link>
                </Button>

                {(user?.role === 'Admin' || user?.department) && (
                    <MaintenanceScheduleForm>
                        <Button className="rounded-xl h-10 bg-primary hover:bg-primary/90 text-white font-bold uppercase text-xs tracking-wider transition-all px-5 text-white">
                            <span className="mr-1.5 text-sm select-none">➕</span> Buat Jadwal
                        </Button>
                    </MaintenanceScheduleForm>
                )}
            </div>
        </div>
      </div>

      {/* Summary Section */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 sm:gap-4 md:gap-6 text-left">
        <StatCard label="Total Jadwal" value={stats.total} emoji="📋" />
        <StatCard label="Mendatang" value={stats.scheduled} emoji="📅" />
        <StatCard label="Diproses" value={stats.processing} emoji="⚙️" />
        <StatCard label="Terlambat" value={stats.overdue} emoji="🚨" subValue="BUTUH AKSI" />
        <StatCard label="Selesai" value={stats.done} emoji="✅" />
      </div>

      {/* Filter Area */}
      <Card className="border-none shadow-xl rounded-[1.5rem] sm:rounded-[2.5rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden text-black">
        <CardContent className="p-4 sm:p-6 md:p-10 space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-12 gap-4 md:gap-6 items-end">
                <div className="md:col-span-4 space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Pencarian Kata Kunci</Label>
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input 
                            placeholder="Cari aset, kode, atau teknisi..." 
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 pl-11 rounded-2xl bg-white border-slate-200 shadow-inner"
                        />
                    </div>
                </div>

                <div className="md:col-span-3 space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Bulan & Tahun</Label>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-primary ml-1 text-left">Pencarian User Aset</Label>
                    <div className="relative">
                        <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                        <Input 
                            placeholder="Nama pengguna aset..." 
                            value={userSearch}
                            onChange={(e) => setUserSearch(e.target.value)}
                            className="h-12 pl-11 rounded-2xl bg-white border-slate-200 shadow-inner"
                        />
                    </div>
                </div>

                <div className="md:col-span-2 space-y-2">
                    <Button variant="ghost" onClick={resetFilters} className="w-full h-12 rounded-2xl text-rose-600 font-black uppercase text-[10px] tracking-widest hover:bg-rose-50 transition-all">
                        <RotateCcw className="mr-2 h-4 w-4" /> Reset Filter
                    </Button>
                </div>
            </div>

            {user?.role === 'Admin' && (
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 text-left">
                    <div className="flex flex-wrap items-center gap-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mr-2">Filter Dept:</Label>
                        <button 
                            onClick={() => setSelectedDept('all')}
                            className={cn(
                                "px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all",
                                selectedDept === 'all' ? "bg-primary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
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
                                    selectedDept === dept ? "bg-primary text-white shadow-lg" : "bg-slate-100 text-slate-400 hover:bg-slate-200 dark:bg-slate-800"
                                )}
                            >
                                {dept}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </CardContent>
      </Card>

      {/* List Area */}
      <Card className="border-none shadow-2xl rounded-[1.5rem] sm:rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        <CardHeader className="p-4 sm:p-8 md:p-10 pb-6 flex flex-col sm:flex-row items-center justify-between gap-6 border-b border-primary/5">
            <div className="flex items-center gap-4 text-left w-full sm:w-auto">
                <div className="p-3 bg-primary/10 rounded-2xl">
                    <Activity className="h-6 w-6 text-primary" />
                </div>
                <div className="text-left">
                    <CardTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Timeline Pemeliharaan</CardTitle>
                    <CardDescription className="font-bold uppercase text-[9px] sm:text-[10px] tracking-[0.2em] text-muted-foreground text-left">Status Verifikasi & Pengerjaan Teknisi</CardDescription>
                </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={() => setIsSelectionMode(!isSelectionMode)} 
                    className={cn(
                        "rounded-full px-5 h-10 font-black uppercase text-[10px] tracking-widest transition-all",
                        isSelectionMode ? "bg-primary text-white border-primary shadow-lg shadow-primary/20" : "bg-white border-slate-200 hover:bg-slate-50 text-black dark:text-white"
                    )}
                >
                    <CheckSquare className="mr-2 h-4 w-4" />
                    {isSelectionMode ? 'Selesai Memilih' : 'Mode Pilih'}
                </Button>

                {isSelectionMode && (
                    <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-800/50 px-4 py-2 rounded-2xl border shadow-inner animate-in zoom-in-95 duration-200">
                        <Checkbox
                            id="select-all-maintenance"
                            checked={isAllSelected ? true : isIndeterminate ? 'indeterminate' : false}
                            onCheckedChange={handleSelectAll}
                            className="h-5 w-5 rounded-lg border-primary/30"
                        />
                        <Label htmlFor="select-all-maintenance" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground cursor-pointer text-left">Pilih Semua</Label>
                    </div>
                )}
                
                <Button variant="outline" size="sm" onClick={handlePrint} className="h-10 px-6 rounded-2xl border-slate-200 font-bold hover:bg-slate-50 transition-all bg-white shadow-sm text-black dark:text-white">
                    <Printer className="mr-2 h-4 w-4 text-primary" /> Cetak Laporan
                </Button>
            </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-8 md:p-10">
            <div className="space-y-4 pb-20">
                {loading ? (
                    Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-[1.5rem]" />)
                ) : filteredSchedules.length > 0 ? (
                    filteredSchedules.map(schedule => (
                        <div key={schedule.id} className="animate-in fade-in slide-in-from-top-2 duration-500">
                            <MaintenanceItem
                                schedule={schedule}
                                isExpanded={expandedId === schedule.id}
                                isSelected={selectedIds.includes(schedule.id)}
                                isSelectionMode={isSelectionMode}
                                onToggle={() => handleToggle(schedule.id)}
                                onSelect={(checked) => setSelectedIds(prev => checked ? [...prev, schedule.id] : prev.filter(i => i !== schedule.id))}
                            />
                            <AnimatePresence>
                                {expandedId === schedule.id && (
                                    <MaintenanceDetailCard schedule={schedule} />
                                )}
                            </AnimatePresence>
                        </div>
                    ))
                ) : (
                    <div className="flex flex-col items-center justify-center py-20 bg-slate-50/50 dark:bg-slate-800/20 rounded-[2rem] border-4 border-dashed border-slate-100 dark:border-slate-800 transition-all">
                        <Activity className="h-14 w-14 text-slate-200 mb-6" />
                        <h3 className="text-lg font-black text-slate-400 uppercase tracking-[0.3em]">Data Tidak Ditemukan</h3>
                        <p className="text-xs text-slate-400 font-medium italic mt-2">Coba ubah parameter filter atau kata kunci pencarian Anda.</p>
                    </div>
                )}
            </div>
        </CardContent>
      </Card>

      {viewAssetId && (
        <AssetDetailDialog 
            assetId={viewAssetId} 
            isOpen={isDetailOpen} 
            onOpenChange={setIsDetailOpen} 
        />
      )}
    </div>
  );
}
