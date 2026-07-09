'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Printer, 
  Cloud, 
  Info, 
  Calendar,
  Building,
  ArrowLeft,
  ImageIcon,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger, DialogClose } from '@/components/ui/dialog';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { cn } from '@/lib/utils';

function ISOReportContent() {
  const searchParams = useSearchParams();
  const reportId = searchParams.get('s');
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchReport() {
      if (!reportId) {
        setLoading(false);
        return;
      }
      try {
        const docRef = doc(db, 'public_reports', reportId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setReport(docSnap.data());
        }
      } catch (error) {
        console.error("Error fetching public ISO report:", error);
      } finally {
        setLoading(false);
      }
    }
    fetchReport();
  }, [reportId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black uppercase tracking-widest text-xs animate-pulse">Menyiapkan Laporan Audit...</p>
      </div>
    );
  }

  if (!report) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-6 text-center">
        <div className="p-6 bg-rose-50 rounded-full mb-6">
          <X className="h-16 w-16 text-rose-600" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">Laporan Tidak Ditemukan</h1>
        <p className="text-slate-500 mt-2 max-w-md">Tautan ini mungkin sudah kedaluwarsa atau tidak valid. Silakan hubungi administrator sistem.</p>
        <Button asChild className="mt-8 rounded-full" variant="outline">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Beranda</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-100 dark:bg-slate-950 p-4 md:p-10 font-body">
      {/* Tombol Aksi - Tersembunyi saat Cetak */}
      <div className="max-w-6xl mx-auto mb-8 flex justify-between items-center print:hidden">
        <Button asChild variant="ghost" className="rounded-full hover:bg-white/50">
          <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Beranda</Link>
        </Button>
        <Button onClick={() => window.print()} className="rounded-full bg-slate-900 hover:bg-slate-800 text-white shadow-xl">
          <Printer className="mr-2 h-4 w-4" /> Cetak Sertifikat
        </Button>
      </div>

      {/* Kontainer Sertifikat Digital */}
      <div className="max-w-6xl mx-auto bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden relative border-8 border-white dark:border-slate-800">
        
        {/* Watermark Logo */}
        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none select-none overflow-hidden p-20">
          <Image src="/cgi.png" alt="Watermark" width={800} height={800} className="grayscale" />
        </div>

        {/* Header Sertifikat */}
        <div className="relative bg-slate-900 p-8 md:p-12 text-white overflow-hidden">
          <div className="absolute top-0 right-0 w-1/2 h-full bg-primary/10 skew-x-[-20deg] translate-x-20"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-8">
            <div className="flex items-center gap-6">
              <div className="p-4 bg-white/10 rounded-[2rem] backdrop-blur-md border border-white/20">
                <Cloud className="h-10 w-10 text-primary" />
              </div>
              <div>
                <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">Laporan Inventaris Emisi</h1>
                <p className="text-primary font-black uppercase tracking-[0.3em] text-xs mt-2">ISO 14064-3:2019 Verified</p>
              </div>
            </div>
            <div className="text-right flex flex-col items-end">
              <Badge className="bg-emerald-600 text-white border-none font-black px-4 py-1 rounded-full mb-2">VERIFIED DATA</Badge>
              <p className="text-[10px] font-bold text-white/40 uppercase tracking-widest leading-none">PT. China Glaze Indonesia</p>
            </div>
          </div>
        </div>

        <CardContent className="relative z-10 p-8 md:p-12 space-y-10">
          {/* Info Utama */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Subyek Laporan</p>
              <h3 className="text-lg font-black text-slate-900 dark:text-white uppercase leading-tight">{report.title}</h3>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status Keamanan</p>
              <div className="flex items-center gap-2 text-emerald-600 font-black">
                <ShieldCheck className="h-5 w-5" />
                <span className="text-sm">DATA TERENKRIPSI</span>
              </div>
            </div>
            <div className="p-6 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tanggal Verifikasi</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">
                {report.createdAt ? format(report.createdAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: id }) : '-'}
              </p>
            </div>
          </div>

          {/* Tabel Laporan */}
          <div className="border border-slate-100 dark:border-slate-800 rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-sm">
            <Table>
              <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                <TableRow className="h-16 border-none">
                  <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest">Aset & Kode</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Lokasi</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest">Spesifikasi Teknis ISO 14064</TableHead>
                  <TableHead className="text-[10px] font-black uppercase tracking-widest text-center">Foto Fisik</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.assets?.map((asset: any, idx: number) => {
                  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';
                  const labels = isAC ? {
                    l1: 'Model | Tipe', l2: 'Refrigeran', l3: 'Vol. (KG)', l4: 'kW'
                  } : {
                    l1: 'Model (SN)', l2: 'Tipe Unit', l3: 'Fuel/Energy', l4: 'Kapasitas'
                  };

                  return (
                    <TableRow key={idx} className="h-24 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-50 dark:border-slate-800">
                      <TableCell className="pl-8">
                        <div className="flex flex-col">
                          <span className="font-black text-slate-900 dark:text-white uppercase text-sm leading-tight">{asset.name}</span>
                          <span className="text-[10px] font-mono font-bold text-primary">{asset.code}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant="outline" className="rounded-full px-3 py-0.5 border-slate-200 dark:border-slate-700 font-bold text-[10px]">{asset.location}</Badge>
                      </TableCell>
                      <TableCell>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px]">
                          <div className="flex items-center gap-1"><span className="text-muted-foreground">{labels.l1}:</span> <b className="text-slate-700 dark:text-slate-300">{asset.details?.accessory1}</b></div>
                          <div className="flex items-center gap-1"><span className="text-muted-foreground">{labels.l2}:</span> <b className="text-slate-700 dark:text-slate-300">{asset.details?.accessory2}</b></div>
                          <div className="flex items-center gap-1"><span className="text-muted-foreground">{labels.l3}:</span> <b className="text-slate-700 dark:text-slate-300">{asset.details?.accessory3}</b></div>
                          <div className="flex items-center gap-1"><span className="text-muted-foreground">{labels.l4}:</span> <b className="text-slate-700 dark:text-slate-300">{asset.details?.accessory4}</b></div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center pr-8">
                        {asset.photoURL ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <div className="relative h-14 w-14 mx-auto rounded-xl overflow-hidden border-2 border-slate-100 hover:border-primary transition-all cursor-pointer shadow-sm">
                                <Image src={asset.photoURL} alt="Aset" fill className="object-cover" />
                                <div className="absolute inset-0 bg-black/20 opacity-0 hover:opacity-100 transition-opacity flex items-center justify-center">
                                  <ImageIcon className="h-4 w-4 text-white" />
                                </div>
                              </div>
                            </DialogTrigger>
                            <DialogContent className="max-w-3xl bg-slate-900/95 backdrop-blur-md border-slate-700 p-0 overflow-hidden">
                              <DialogHeader className="sr-only">
                                <DialogTitle>{asset.name} - {asset.code}</DialogTitle>
                                <DialogDescription>Foto fisik untuk verifikasi ISO 14064.</DialogDescription>
                              </DialogHeader>
                              <div className="relative aspect-video w-full">
                                <Image src={asset.photoURL} alt={asset.name} fill className="object-contain" />
                              </div>
                              <div className="p-4 bg-black/40 flex justify-between items-center">
                                <div className="flex flex-col">
                                  <span className="text-white font-black uppercase text-sm">{asset.name}</span>
                                  <span className="text-primary font-mono text-xs">{asset.code}</span>
                                </div>
                                <DialogClose asChild>
                                  <Button variant="ghost" size="sm" className="text-white hover:bg-white/10">TUTUP</Button>
                                </DialogClose>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <span className="text-[9px] font-black text-slate-300 uppercase italic">Tidak Ada Foto</span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {/* Footer Validasi */}
          <div className="pt-10 border-t flex flex-col md:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4 p-4 bg-emerald-50 dark:bg-emerald-950/20 rounded-2xl border border-emerald-100 dark:border-emerald-900/50">
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
              <div>
                <p className="text-xs font-black text-emerald-900 dark:text-emerald-400 uppercase tracking-widest leading-none mb-1">Authenticity Guaranteed</p>
                <p className="text-[10px] text-emerald-700 dark:text-emerald-500 font-medium">Laporan ini dihasilkan secara otomatis oleh sistem Asset_CGI dan terhubung langsung dengan database pusat.</p>
              </div>
            </div>
            <div className="text-center md:text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-4">Unit Verifikasi Sistem</p>
              <div className="flex justify-center md:justify-end gap-2">
                <div className="h-12 w-12 rounded-full border-2 border-slate-100 flex items-center justify-center font-black text-slate-200 text-[10px]">CGI</div>
                <div className="h-12 w-32 rounded-xl border-2 border-slate-100 flex items-center justify-center font-black text-slate-200 text-[10px] uppercase">VERIFIED</div>
              </div>
            </div>
          </div>
        </CardContent>
        
        {/* Footer Bar */}
        <div className="bg-slate-50 dark:bg-slate-800/50 p-6 text-center border-t">
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">© 2026 PT. China Glaze Indonesia. Dokumen Digital Resmi - ISO 14064-3 Compliance.</p>
        </div>
      </div>
    </div>
  );
}

export default function PublicISOPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    }>
      <ISOReportContent />
    </Suspense>
  );
}
