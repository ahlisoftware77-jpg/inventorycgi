
'use client';

/**
 * @fileOverview Halaman Verifikasi Aset Publik (Digital Asset Passport).
 * Desain: Mewah, Profesional, dan Rapi.
 * Fitur: Next.js 15 Async Params, Lightbox Gallery (8 Slot), Print Optimization.
 */

import { useState, useEffect, use } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { 
  Loader2, 
  Building, 
  MapPin, 
  User, 
  Calendar, 
  Hash, 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  Image as ImageIcon,
  Printer,
  Share2,
  X,
  ExternalLink,
  Layers,
  Tag
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';

export default function PublicAssetVerification({ 
  searchParams 
}: { 
  searchParams: Promise<{ assetId?: string }> 
}) {
  // Next.js 15: searchParams must be unwrapped using React.use()
  const params = use(searchParams);
  const assetId = params.assetId;

  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!assetId) {
      setError('ID Aset tidak ditemukan dalam tautan.');
      setLoading(false);
      return;
    }

    setLoading(true);
    const docRef = doc(db, 'assets', assetId);

    // Menggunakan 'snap' sebagai pengganti 'docSnap' sesuai instruksi
    const unsubscribe = onSnapshot(docRef, (snap) => {
      if (snap.exists()) {
        setAsset({ id: snap.id, ...snap.data() } as Asset);
        setError(null);
      } else {
        setAsset(null);
        setError('Aset tidak ditemukan atau tautan telah kedaluwarsa.');
      }
      setLoading(false);
    }, (err) => {
      console.error("Firestore error:", err);
      setError('Gagal memuat data dari server. Mohon periksa koneksi atau limit kuota.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [assetId]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="flex h-screen w-full flex-col items-center justify-center bg-slate-50 gap-4">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
        <p className="font-black text-xs uppercase tracking-[0.3em] text-slate-400">Verifikasi Sistem...</p>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="flex min-h-screen items-center justify-center p-6 bg-slate-100">
        <Card className="max-w-md w-full border-none shadow-2xl rounded-[2rem] overflow-hidden animate-in zoom-in-95 duration-300">
          <div className="bg-rose-600 p-8 text-white text-center">
            <X className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <h2 className="text-2xl font-black uppercase tracking-tight">Verifikasi Gagal</h2>
          </div>
          <CardContent className="p-8 text-center space-y-4">
            <p className="text-slate-600 font-medium leading-relaxed">{error}</p>
            <Button asChild className="w-full h-12 rounded-xl font-bold uppercase tracking-widest">
              <a href="/">Kembali ke Beranda</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const allPhotos = [
    { url: asset.photoURL, label: 'Foto Aset 1' },
    { url: asset.photoURL2, label: 'Foto Aset 2' },
    { url: asset.photoURL3, label: 'Foto Aset 3' },
    { url: asset.photoURL4, label: 'Foto Aset 4' },
    { url: asset.disposalPhotoURL1, label: 'Bukti Serah Terima 1' },
    { url: asset.disposalPhotoURL2, label: 'Bukti Serah Terima 2' },
    { url: asset.disposalPhotoURL3, label: 'Bukti Serah Terima 3' },
    { url: asset.disposalPhotoURL4, label: 'Bukti Serah Terima 4' },
  ].filter(p => !!p.url);

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 sm:px-6 lg:px-8 print:bg-white print:p-0">
      <style jsx global>{`
        @media print {
          .no-print { display: none !important; }
          .card-main { box-shadow: none !important; border: 1px solid #e2e8f0 !important; border-radius: 0 !important; width: 100% !important; margin: 0 !important; }
          .photo-grid { display: grid !important; grid-template-columns: repeat(2, 1fr) !important; gap: 10px !important; margin-top: 20px !important; }
          .print-photo { display: block !important; width: 100% !important; height: 150px !important; object-fit: cover !important; border: 1px solid #ddd !important; border-radius: 4px !important; }
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Action Bar */}
        <div className="flex justify-between items-center no-print px-2">
          <Image src="/cgi.png" alt="CGI Logo" width={40} height={40} className="drop-shadow-sm" />
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handlePrint} className="rounded-full font-bold bg-white">
              <Printer className="mr-2 h-4 w-4" /> Cetak Bukti
            </Button>
            <Button variant="outline" size="sm" className="rounded-full font-bold bg-white" onClick={() => {
              if (navigator.share) {
                navigator.share({ title: `Verifikasi Aset ${asset.code}`, url: window.location.href });
              }
            }}>
              <Share2 className="mr-2 h-4 w-4" /> Bagikan
            </Button>
          </div>
        </div>

        <Card className="card-main border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] overflow-hidden bg-white">
          {/* Passport Header */}
          <div className="bg-primary p-8 sm:p-12 text-white relative overflow-hidden">
            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-white/10 to-transparent pointer-events-none" />
            <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
              <div className="space-y-2">
                <Badge className="bg-white/20 hover:bg-white/30 text-white border-none rounded-full px-4 py-1 font-black text-[10px] uppercase tracking-[0.2em] backdrop-blur-md">
                  Official Digital Passport
                </Badge>
                <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-tight">{asset.name}</h1>
                <p className="text-white/70 font-mono text-lg tracking-widest">{asset.code}</p>
              </div>
              <div className="flex flex-col items-center md:items-end gap-3 shrink-0">
                <div className="bg-white p-2 rounded-2xl shadow-2xl">
                  {/* Placeholder for QR (Halaman verifikasi itu sendiri adalah QR-nya) */}
                  <div className="w-24 h-24 bg-slate-50 flex items-center justify-center border-2 border-dashed border-slate-200 rounded-xl">
                    <CheckCircle2 className="h-12 w-12 text-primary/20" />
                  </div>
                </div>
                <p className="text-[10px] font-black uppercase tracking-widest opacity-50">PT. China Glaze Indonesia</p>
              </div>
            </div>
          </div>

          {/* Quick Stats Panel */}
          <div className="grid grid-cols-3 divide-x border-b">
            <div className="p-6 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Status</p>
              <Badge className="rounded-full bg-emerald-100 text-emerald-700 hover:bg-emerald-100 border-none font-black text-xs uppercase px-4">
                {asset.status.replace(/_/g, ' ')}
              </Badge>
            </div>
            <div className="p-6 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Kondisi</p>
              <span className="text-sm font-black text-slate-900 uppercase">{asset.condition}</span>
            </div>
            <div className="p-6 text-center">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Cost Center</p>
              <span className="text-sm font-black text-primary font-mono">{asset.costCenter || '-'}</span>
            </div>
          </div>

          <CardContent className="p-8 sm:p-12 space-y-12">
            {/* Main Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-8">
              <div className="space-y-6">
                <SectionTitle title="Informasi Lokasi" />
                <div className="space-y-4">
                  <InfoRow icon={Building} label="Lokasi Unit" value={asset.location} />
                  <InfoRow icon={MapPin} label="Penempatan Spesifik" value={asset.accessory1} />
                  <InfoRow icon={User} label="Penanggung Jawab" value={asset.user} />
                </div>
              </div>

              <div className="space-y-6">
                <SectionTitle title="Manajemen Aset" />
                <div className="space-y-4">
                  <InfoRow icon={Calendar} label="Tanggal Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'd MMMM yyyy', { locale: id }) : '-'} />
                  <InfoRow icon={Layers} label="Kategori" value={asset.category} />
                  <InfoRow icon={Hash} label="Kuantitas" value={`${asset.qty} Unit`} />
                </div>
              </div>
            </div>

            {/* Technical Detail Card */}
            <div className="p-8 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner">
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" /> Kelengkapan & Rincian Teknis
              </h3>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-6">
                <TechItem label="Model/Type" value={asset.accessory1} />
                <TechItem label="Fuel/Ref" value={asset.accessory2} />
                <TechItem label="Volume" value={asset.accessory3} />
                <TechItem label="Power/Cap" value={asset.accessory4} />
              </div>
            </div>

            {/* Photo Gallery with Lightbox */}
            <div className="space-y-6">
              <div className="flex items-center justify-between border-b pb-4">
                <SectionTitle title="Dokumentasi Visual" />
                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{allPhotos.length} Lampiran</span>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 photo-grid">
                {allPhotos.map((photo, idx) => (
                  <Dialog key={idx}>
                    <DialogTrigger asChild>
                      <div className="group relative aspect-square rounded-2xl overflow-hidden border-4 border-white shadow-md hover:shadow-xl transition-all cursor-pointer bg-slate-100">
                        <Image src={photo.url || ''} alt={photo.label} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                        <div className="absolute inset-0 bg-primary/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
                          <ImageIcon className="text-white h-6 w-6" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 p-2 bg-black/40 text-[8px] font-black text-white uppercase text-center backdrop-blur-sm truncate">
                          {photo.label}
                        </div>
                      </div>
                    </DialogTrigger>
                    {/* Hidden from screen but visible for print if needed - handled via global CSS */}
                    <img src={photo.url || ''} className="hidden print-photo" alt={photo.label} />
                    
                    <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden border-none rounded-3xl bg-black">
                      <div className="relative aspect-video w-full">
                        <Image src={photo.url || ''} alt={photo.label} fill className="object-contain" />
                      </div>
                      <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
                        <div>
                          <p className="text-sm font-black uppercase tracking-widest">{photo.label}</p>
                          <p className="text-[10px] text-slate-400 font-mono">{asset.code}</p>
                        </div>
                        <DialogClose asChild>
                          <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10"><X className="h-5 w-5"/></Button>
                        </DialogClose>
                      </div>
                    </DialogContent>
                  </Dialog>
                ))}
                
                {allPhotos.length === 0 && (
                  <div className="col-span-full py-12 text-center bg-slate-50 rounded-3xl border-2 border-dashed border-slate-200">
                    <ImageIcon className="h-10 w-10 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tidak ada lampiran foto</p>
                  </div>
                )}
              </div>
            </div>

            {/* System Logs */}
            <div className="space-y-4">
              <SectionTitle title="Catatan & Riwayat" />
              <div className="p-6 rounded-3xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed whitespace-pre-wrap italic font-medium">
                {asset.notes || 'Tidak ada catatan tambahan untuk aset ini.'}
              </div>
            </div>
          </CardContent>

          <CardFooter className="bg-slate-50 p-8 sm:p-12 border-t flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center shrink-0">
                <CheckCircle2 className="h-6 w-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-black text-slate-900 uppercase leading-none">Terverifikasi</p>
                <p className="text-[10px] font-bold text-slate-400 mt-1 uppercase tracking-widest">Database Pusat PT. China Glaze Indonesia</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Validitas Dokumen</p>
              <p className="text-[9px] font-bold text-slate-500">Dicetak secara otomatis pada: {format(new Date(), 'PPpp', { locale: id })}</p>
            </div>
          </CardFooter>
        </Card>

        {/* Technical Guidelines Footer */}
        <div className="text-center no-print py-6 opacity-40">
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-500">© 2026 PT. China Glaze Indonesia • Asset Management System</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ title }: { title: string }) {
  return (
    <h3 className="text-[11px] font-black text-primary uppercase tracking-[0.3em]">{title}</h3>
  );
}

function InfoRow({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="flex items-start gap-4">
      <div className="p-2 bg-slate-100 rounded-xl shrink-0 mt-0.5">
        <Icon className="h-4 w-4 text-slate-500" />
      </div>
      <div>
        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">{label}</p>
        <p className="text-sm font-bold text-slate-900 leading-tight">{value || '-'}</p>
      </div>
    </div>
  );
}

function TechItem({ label, value }: { label: string, value: any }) {
  return (
    <div className="flex flex-col">
      <p className="text-[9px] font-black text-slate-400 uppercase tracking-tighter mb-1">{label}</p>
      <p className="text-xs font-black text-slate-900 break-words">{value || '-'}</p>
    </div>
  );
}
