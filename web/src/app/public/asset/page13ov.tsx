
'use client';

/**
 * @fileOverview Halaman Verifikasi Aset Publik (Sertifikat Digital).
 * Desain: Premium, Elegan, dan Berwibawa.
 * Fitur: Validasi Status & Kondisi, Detail ISO 14064, Galeri Foto Interaktif dengan Popup.
 */

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  MapPin, 
  Calendar, 
  User, 
  Hash, 
  Info, 
  Layers, 
  ClipboardList, 
  Activity,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Maximize2,
  X
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose
} from "@/components/ui/dialog";

function AssetContent({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'assets', assetId), (snap) => {
      if (snap.exists()) {
        setAsset({ id: snap.id, ...snap.data() } as Asset);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [assetId]);

  if (loading) return <div className="p-8"><Skeleton className="h-[600px] w-full rounded-[3rem]" /></div>;
  if (!asset) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center gap-4">
      <AlertCircle className="h-16 w-16 text-rose-500 opacity-20" />
      <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Data Tidak Ditemukan</h2>
      <p className="text-slate-500 max-w-xs">Aset dengan ID tersebut tidak terdaftar dalam database resmi kami.</p>
    </div>
  );

  const assetPhotos = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter(Boolean) as string[];
  const handoverPhotos = [asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4].filter(Boolean) as string[];

  const DetailItem = ({ label, value, icon: Icon }: { label: string; value: string | number | undefined; icon: any }) => (
    <div className="flex flex-col gap-1 p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
      <div className="flex items-center gap-2 opacity-50">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900">{value || '-'}</p>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-in fade-in duration-1000">
      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white relative">
        {/* Watermark */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
          <Image src="/cgi.png" alt="Watermark" width={600} height={600} className="grayscale" />
        </div>

        {/* Decorative Header */}
        <div className="h-4 bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-600" />

        <div className="relative z-10">
          <div className="p-8 sm:p-12 space-y-10">
            {/* Title Section */}
            <div className="flex flex-col md:flex-row justify-between items-start gap-6 border-b border-slate-100 pb-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-600 border-none rounded-full px-3 py-0.5 font-black text-[9px] uppercase tracking-[0.2em]">Verified Asset</Badge>
                  <span className="text-[10px] font-bold text-slate-300 uppercase tracking-widest">Official Identity Passport</span>
                </div>
                <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-tight">{asset.name}</h1>
                <p className="text-xl font-mono font-bold text-primary tracking-widest">{asset.code}</p>
              </div>
              <div className="flex flex-col items-center shrink-0 p-4 border-2 border-slate-50 rounded-[2rem] bg-slate-50/50 backdrop-blur-sm">
                <Image src="/cgi.png" alt="Logo" width={60} height={60} />
                <p className="text-[10px] font-black text-slate-900 mt-3 tracking-tighter">PT. CHINA GLAZE INDONESIA</p>
              </div>
            </div>

            {/* Critical Status Highlights */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-5 rounded-3xl bg-slate-900 text-white shadow-xl flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl"><Activity className="h-5 w-5 text-blue-400" /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Status Sistem</p>
                        <p className="text-sm font-bold uppercase">{asset.status.replace(/_/g, ' ')}</p>
                    </div>
                </div>
                <div className="p-5 rounded-3xl bg-emerald-600 text-white shadow-xl flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl"><ClipboardList className="h-5 w-5" /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-white/40 tracking-widest">Kondisi Fisik</p>
                        <p className="text-sm font-bold uppercase">{asset.condition}</p>
                    </div>
                </div>
                <div className="p-5 rounded-3xl bg-slate-100 text-slate-900 shadow-sm border border-slate-200 flex items-center gap-4">
                    <div className="p-3 bg-white rounded-2xl shadow-sm"><Hash className="h-5 w-5 text-primary" /></div>
                    <div>
                        <p className="text-[9px] font-black uppercase text-slate-400 tracking-widest">Pusat Biaya</p>
                        <p className="text-sm font-bold uppercase">{asset.costCenter || 'N/A'}</p>
                    </div>
                </div>
            </div>

            {/* Core Details Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailItem label="Kategori Aset" value={asset.category} icon={Layers} />
              <DetailItem label="Lokasi Penempatan" value={asset.location} icon={MapPin} />
              <DetailItem label="Penanggung Jawab" value={asset.user} icon={User} />
              <DetailItem label="Merek / Brand" value={asset.brand} icon={Info} />
              <DetailItem label="Tgl Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMMM yyyy', { locale: id }) : '-'} icon={Calendar} />
              <DetailItem label="Jumlah Unit" value={`${asset.qty} Item`} icon={Hash} />
            </div>

            {/* Asset Photos Gallery */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Galeri Kondisi Aset Fisik</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {assetPhotos.length > 0 ? assetPhotos.map((url, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedImage(url)}
                            className="relative aspect-square rounded-3xl overflow-hidden border-4 border-slate-50 shadow-md cursor-pointer group"
                        >
                            <Image src={url} alt={`Foto Aset ${idx + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="text-white h-6 w-6" />
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full h-32 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300">
                            <ImageIcon className="h-8 w-8 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Tidak ada foto utama</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Handover/Evidence Gallery */}
            <div className="space-y-4">
                <div className="flex items-center gap-2">
                    <div className="h-px flex-1 bg-slate-100" />
                    <h3 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Dokumentasi Serah Terima & Bukti</h3>
                    <div className="h-px flex-1 bg-slate-100" />
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {handoverPhotos.length > 0 ? handoverPhotos.map((url, idx) => (
                        <div 
                            key={idx} 
                            onClick={() => setSelectedImage(url)}
                            className="relative aspect-square rounded-3xl overflow-hidden border-4 border-slate-50 shadow-md cursor-pointer group"
                        >
                            <Image src={url} alt={`Foto Bukti ${idx + 1}`} fill className="object-cover transition-transform duration-500 group-hover:scale-110" />
                            <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Maximize2 className="text-white h-6 w-6" />
                            </div>
                        </div>
                    )) : (
                        <div className="col-span-full h-32 rounded-3xl border-2 border-dashed border-slate-100 flex flex-col items-center justify-center gap-2 text-slate-300">
                            <ImageIcon className="h-8 w-8 opacity-20" />
                            <p className="text-[10px] font-black uppercase tracking-widest">Belum ada foto bukti</p>
                        </div>
                    )}
                </div>
            </div>

            {/* Technical Panel (ISO 14064) */}
            <div className="p-8 rounded-[2.5rem] bg-slate-50 border border-slate-100 shadow-inner">
              <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Technical Passport (ISO 14064)
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-6">
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Model | Tipe Unit</p>
                  <p className="text-xs font-bold text-slate-700">{asset.accessory1 || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Refrigerant / Fuel Type</p>
                  <p className="text-xs font-bold text-slate-700">{asset.accessory2 || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Volume / Quantity</p>
                  <p className="text-xs font-bold text-slate-700">{asset.accessory3 || '-'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Power / Capacity (kW)</p>
                  <p className="text-xs font-bold text-slate-700">{asset.accessory4 || '-'}</p>
                </div>
              </div>
            </div>

            {/* Verification Footer */}
            <div className="pt-10 border-t border-slate-100 flex flex-col items-center text-center gap-4">
              <div className="flex items-center gap-2 text-emerald-600">
                <CheckCircle2 className="h-5 w-5" />
                <p className="text-xs font-black uppercase tracking-[0.1em]">Identity Officially Verified</p>
              </div>
              <p className="text-[10px] text-slate-400 max-w-sm leading-relaxed font-medium">
                Dokumen ini merupakan catatan digital resmi dari Sistem Manajemen Aset PT. China Glaze Indonesia. Validitas dapat dikonfirmasi melalui pemindaian ulang pada label aset fisik.
              </p>
              <div className="mt-4 pb-2">
                <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">© 2026 PT. China Glaze Indonesia. Seluruh hak cipta dilindungi.</p>
              </div>
            </div>
          </div>
        </div>
      </Card>

      {/* Image Popup Dialog */}
      <Dialog open={!!selectedImage} onOpenChange={(open) => !open && setSelectedImage(null)}>
        <DialogContent className="max-w-[95vw] sm:max-w-4xl p-0 overflow-hidden bg-black border-none rounded-3xl shadow-2xl">
            <DialogHeader className="sr-only">
                <DialogTitle>Tampilan Gambar Penuh</DialogTitle>
                <DialogDescription>Melihat dokumentasi visual aset dalam ukuran besar.</DialogDescription>
            </DialogHeader>
            <div className="relative w-full aspect-video sm:aspect-[16/9] flex items-center justify-center bg-slate-900/50">
                {selectedImage && (
                    <Image 
                        src={selectedImage} 
                        alt="Tampilan penuh" 
                        fill 
                        className="object-contain" 
                        priority
                    />
                )}
                <button 
                    onClick={() => setSelectedImage(null)}
                    className="absolute top-4 right-4 h-10 w-10 rounded-full bg-black/50 text-white flex items-center justify-center hover:bg-black/80 transition-colors z-50"
                >
                    <X className="h-6 w-6" />
                </button>
            </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default function PublicAssetPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>}>
      <PublicAssetPageInner />
    </Suspense>
  );
}

function PublicAssetPageInner() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');

  return (
    <div className="min-h-screen bg-slate-50 font-body">
      {assetId ? (
        <AssetContent assetId={assetId} />
      ) : (
        <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center gap-4">
          <AlertCircle className="h-16 w-16 text-rose-500 opacity-20" />
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Parameter Tidak Valid</h2>
          <p className="text-slate-500 max-w-xs">ID Aset tidak ditemukan dalam URL permintaan.</p>
        </div>
      )}
    </div>
  );
}

function Loader2({ className }: { className?: string }) {
    return <Activity className={cn("animate-pulse", className)} />;
}
