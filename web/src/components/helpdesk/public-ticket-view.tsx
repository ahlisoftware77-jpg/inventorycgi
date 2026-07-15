'use client';

/**
 * @fileOverview Komponen Penampil Tiket Helpdesk Publik.
 * Memungkinkan atasan atau pihak ketiga memantau progres masalah IT secara transparan.
 * Update: Membuat bagian Status Dokumen dapat diklik ke Form Resmi 0-32-028.
 */

import { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type HelpdeskTicket } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  User, 
  Building, 
  Calendar, 
  Hash, 
  ShieldAlert, 
  CheckCircle2, 
  Clock, 
  MessageSquare, 
  FileText, 
  AlertTriangle,
  ImageIcon,
  LifeBuoy,
  ChevronRight,
  ShieldCheck,
  Printer,
  AlertCircle,
  Layers
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const isImageUrl = (url: string) => {
  if (!url) return false;
  if (url.startsWith('data:image/')) return true;
  if (url.includes('/raw/upload/')) return false;
  
  const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
  return cleanUrl.endsWith('.jpg') || 
         cleanUrl.endsWith('.jpeg') || 
         cleanUrl.endsWith('.png') || 
         cleanUrl.endsWith('.webp') || 
         cleanUrl.endsWith('.gif') || 
         cleanUrl.endsWith('.svg');
};

interface PublicTicketViewProps {
  ticketId: string;
}

const DetailTile = ({ label, value, icon: Icon }: { label: string, value: any, icon: any }) => (
    <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3 text-left">
        <div className="p-2 bg-primary/5 rounded-xl shrink-0">
            <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-left">{label}</p>
            <p className="text-xs font-bold text-slate-900 truncate uppercase text-left">{value || '-'}</p>
        </div>
    </div>
);

export default function PublicTicketView({ ticketId }: PublicTicketViewProps) {
  const [ticket, setTicket] = useState<HelpdeskTicket | null>(null);
  const [loading, setLoading] = useState(true);
  const [hasOfficialForm, setHasOfficialForm] = useState(false);
  const [reportId, setReportId] = useState<string | null>(null);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');

  useEffect(() => {
    onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) setCompanyName(snap.data().companyName);
    });

    const unsubscribe = onSnapshot(doc(db, 'helpdesk_tickets', ticketId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as HelpdeskTicket;
        setTicket(data);
        
        const q = query(collection(db, 'it_problem_reports'), where('ticketId', '==', ticketId));
        onSnapshot(q, (snap) => {
            if (!snap.empty) {
                setHasOfficialForm(true);
                setReportId(snap.docs[0].id);
            } else {
                setHasOfficialForm(false);
                setReportId(null);
            }
        });
      } else {
        setTicket(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [ticketId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-8 space-y-6">
        <Skeleton className="h-12 w-1/3 rounded-xl" />
        <Skeleton className="h-96 w-full rounded-[2.5rem]" />
      </div>
    );
  }

  if (!ticket) return (
    <div className="max-w-md mx-auto p-12 text-center flex flex-col items-center gap-6 mt-20 bg-white rounded-3xl shadow-xl">
        <AlertTriangle className="h-16 w-16 text-rose-500 opacity-20 mx-auto" />
        <h2 className="text-2xl font-black uppercase text-rose-600 mt-4">Tiket Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2 font-medium text-sm leading-relaxed">ID Tiket yang Anda gunakan tidak valid atau sudah dihapus.</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-10 space-y-10 pb-32 text-black">
        {/* Branding Header */}
        <div className="flex flex-col items-center text-center gap-4">
            <Image src="/cgi.png" alt="Logo" width={64} height={64} className="mb-2 shadow-sm rounded-xl p-1 bg-white" />
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 italic">{companyName}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary bg-primary/5 px-6 py-1.5 rounded-full inline-block">Riwayat Laporan IT Helpdesk</p>
            </div>
        </div>

        {/* Main Info Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-950 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Hash className="h-24 w-24" /></div>
                <CardContent className="p-6 flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 shadow-lg"><LifeBuoy className="h-7 w-7 text-white" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1 text-left">Nomor Tiket</p>
                        <p className="text-xl font-black uppercase tracking-tight text-left">{ticket.ticketNumber}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className={cn(
                "rounded-[2.5rem] border-none shadow-xl text-white overflow-hidden relative transition-colors duration-500",
                ticket.status === 'Selesai' ? "bg-emerald-600" : "bg-primary"
            )}>
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><ShieldCheck className="h-24 w-24" /></div>
                <CardContent className="p-6 flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 shadow-lg">
                        {ticket.status === 'Selesai' ? <CheckCircle2 className="h-7 w-7 text-white" /> : <Clock className="h-7 w-7 text-white" />}
                    </div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1 text-left">Status Progres</p>
                        <p className="text-xl font-black uppercase tracking-tight text-left">{ticket.status}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Details Section */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
            <div className="md:col-span-4 space-y-6">
                <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">Identitas Pelapor</p>
                    <div className="space-y-3">
                        <DetailTile label="Nama Lengkap" value={ticket.reporterName} icon={User} />
                        <DetailTile label="Unit Kerja" value={ticket.reporterDept} icon={Building} />
                        <DetailTile label="Kategori Masalah" value={ticket.category} icon={Layers} />
                        <DetailTile label="Urgensi" value={ticket.priority || 'Normal'} icon={ShieldAlert} />
                        <DetailTile label="Tanggal Lapor" value={ticket.reportedAt ? format(ticket.reportedAt.toDate(), 'd MMM yyyy', { locale: localeID }) : '-'} icon={Calendar} />
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">Status Dokumen</p>
                    <Link 
                        href={hasOfficialForm 
                            ? `/public/it-report?id=${reportId}` 
                            : `/public/it-report?ticketId=${ticket.id}&problem=${encodeURIComponent(ticket.description)}&dept=${encodeURIComponent(ticket.reporterDept || '')}`
                        }
                        className="block group"
                    >
                    {hasOfficialForm ? (
                        <div className="p-5 rounded-3xl bg-emerald-50 border border-emerald-100 flex items-center gap-3 shadow-sm group-hover:bg-emerald-100 transition-colors">
                            <CheckCircle2 className="h-6 w-6 text-emerald-600" />
                            <div className="space-y-0.5 text-left">
                                <p className="text-[10px] font-black text-emerald-900 uppercase">Form Resmi Terisi</p>
                                <p className="text-[9px] font-bold text-emerald-700/60 uppercase">DOKUMEN 0-32-028 VALID</p>
                            </div>
                            <ChevronRight className="ml-auto h-4 w-4 text-emerald-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    ) : (
                        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-100 flex items-center gap-3 shadow-sm group-hover:bg-amber-100 transition-colors">
                            <AlertTriangle className="h-6 w-6 text-amber-600" />
                            <div className="space-y-0.5 text-left">
                                <p className="text-[10px] font-black text-amber-900 uppercase">Menunggu Form</p>
                                <p className="text-[9px] font-bold text-amber-700/60 uppercase">ADMINISTRASI PENDING</p>
                            </div>
                            <ChevronRight className="ml-auto h-4 w-4 text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                    )}
                    </Link>
                </div>

                {ticket.photoURL && (
                    <div className="space-y-4">
                        <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">Dokumen / Lampiran</p>
                        {isImageUrl(ticket.photoURL) ? (
                            <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-white shadow-xl bg-slate-200">
                                <Image src={ticket.photoURL} alt="Bukti Kendala" fill className="object-cover" />
                            </div>
                        ) : (
                            <div 
                                className="p-4 border border-slate-200 rounded-3xl bg-white hover:bg-slate-50 flex items-center gap-3 cursor-pointer shadow-xl transition-all group"
                                onClick={() => window.open(ticket.photoURL, '_blank')}
                            >
                                <div className="p-3 bg-blue-50 rounded-xl text-blue-600 group-hover:scale-105 transition-transform">
                                    <FileText className="h-6 w-6" />
                                </div>
                                <div className="min-w-0 flex-1 text-left">
                                    <p className="text-xs font-black text-slate-950 uppercase leading-tight truncate text-left">Dokumen Lampiran</p>
                                    <p className="text-[9px] text-slate-400 font-bold tracking-widest mt-1 uppercase text-left">Klik untuk buka/unduh</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>

            <div className="md:col-span-8 space-y-8">
                {/* Deskripsi Masalah */}
                <div className="space-y-4 text-left">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">Deskripsi Kendala</p>
                    <Card className="rounded-[2rem] border-none shadow-2xl bg-white overflow-hidden text-black">
                        <CardContent className="p-8 text-left">
                            <div className="flex gap-4 text-left">
                                <div className="p-2 bg-rose-50 rounded-xl h-fit shrink-0"><AlertCircle className="h-5 w-5 text-rose-500" /></div>
                                <p className="text-base font-bold text-slate-800 leading-relaxed italic text-left">
                                    "{ticket.description}"
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Timeline Balasan */}
                <div className="space-y-6 text-left">
                    <p className="text-[10px] font-black text-primary uppercase tracking-[0.3em] pl-1 border-l-2 border-primary text-left">Riwayat Progres & Solusi</p>
                    <div className="space-y-6 relative pl-6 before:absolute before:left-0 before:top-0 before:bottom-0 before:w-1 before:bg-slate-200 before:rounded-full">
                        {ticket.updates && ticket.updates.length > 0 ? (
                            ticket.updates.map((update, idx) => (
                                <div key={idx} className="relative group text-left">
                                    <div className="absolute -left-[30px] top-4 h-4 w-4 rounded-full bg-white border-4 border-primary shadow-sm" />
                                    <Card className="rounded-3xl border-slate-100 shadow-sm hover:shadow-md transition-all group-hover:border-primary/20 text-black">
                                        <CardContent className="p-6 text-left">
                                            <div className="flex items-center justify-between mb-4">
                                                <div className="flex items-center gap-2">
                                                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center font-black text-[10px] text-primary uppercase tracking-tighter shrink-0">
                                                        {update.updaterName?.[0]}
                                                    </div>
                                                    <div className="text-left">
                                                        <p className="text-[10px] font-black uppercase text-slate-900">{update.updaterName}</p>
                                                        <p className="text-[8px] font-bold text-muted-foreground uppercase">{update.updatedAt ? format(update.updatedAt.toDate(), 'd MMM yyyy, HH:mm', { locale: localeID }) : '-'}</p>
                                                    </div>
                                                </div>
                                                <Badge variant="outline" className="text-[8px] font-black uppercase tracking-widest bg-slate-50 text-slate-400 border-none">Response</Badge>
                                            </div>
                                            <p className="text-sm font-medium text-slate-700 leading-relaxed whitespace-pre-wrap text-left">{update.note}</p>
                                            {update.attachmentURL && (
                                                <div className="mt-4 relative aspect-video rounded-2xl overflow-hidden border bg-slate-50 max-w-sm cursor-pointer" onClick={() => window.open(update.attachmentURL, '_blank')}>
                                                    <Image src={update.attachmentURL} alt="Update lampiran" fill className="object-contain" />
                                                </div>
                                            )}
                                        </CardContent>
                                    </Card>
                                </div>
                            ))
                        ) : (
                            <div className="py-20 text-center opacity-20">
                                <MessageSquare className="h-16 w-16 mx-auto mb-4" />
                                <p className="text-xs font-black uppercase tracking-widest">Belum ada pembaruan dari tim IT</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>

        {/* Footer Dokumen */}
        <div className="pt-20 border-t flex flex-col items-center gap-6 opacity-30 grayscale text-center pointer-events-none">
            <Image src="/cgi.png" alt="CGI Logo" width={32} height={32} />
            <div className="space-y-1">
                <p className="text-[9px] font-black uppercase tracking-[0.5em]">{companyName} - IT DEPARTMENT</p>
                <p className="text-[8px] font-bold uppercase tracking-tight">Generated from Industrial Helpdesk System • {format(new Date(), 'PPpp', { locale: localeID })}</p>
            </div>
        </div>

        {/* Print Button for Browser */}
        <div className="fixed bottom-8 right-8 print:hidden">
            <Button onClick={() => window.print()} className="h-14 w-14 rounded-full bg-slate-900 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all p-0">
                <Printer className="h-6 w-6" />
            </Button>
        </div>
    </div>
  );
}
