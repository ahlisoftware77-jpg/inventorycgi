
'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  Tag, 
  MapPin, 
  Calendar, 
  User, 
  Hash, 
  Info, 
  Layers, 
  FileText, 
  Box,
  CircleDollarSign,
  ChevronRight,
  Image as ImageIcon
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Halaman Verifikasi Aset Publik.
 * Menampilkan rincian aset secara profesional tanpa memerlukan login.
 */

const DetailItem = ({ label, value, icon: Icon, className }: { label: string; value: React.ReactNode; icon: any; className?: string }) => (
  <div className={cn("flex flex-col gap-1 p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-primary/20 transition-all", className)}>
    <div className="flex items-center gap-1.5 opacity-60">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 leading-none">{label}</p>
    </div>
    <div className="text-sm font-bold text-slate-900 truncate leading-tight mt-1">{value || '-'}</div>
  </div>
);

const getStatusStamp = (status: AssetStatus, condition: string) => {
    let text = 'VERIFIED';
    let color = 'text-emerald-600 border-emerald-600 bg-emerald-50';

    if (status === 'approved_disposal') {
        text = 'DISPOSED';
        color = 'text-rose-600 border-rose-600 bg-rose-50';
    } else if (status === 'approved_mutasi') {
        text = 'MUTATED';
        color = 'text-blue-600 border-blue-600 bg-blue-50';
    } else if (condition === 'Rusak' || condition.includes('Perbaikan')) {
        text = 'MAINTENANCE';
        color = 'text-amber-600 border-amber-600 bg-amber-50';
    }

    return (
        <div className={cn(
            "inline-block px-4 py-1 text-xl font-black border-4 rounded-md shadow-sm transform -rotate-12 uppercase tracking-tighter transition-all animate-in zoom-in-50 duration-500",
            color
        )}>
            {text}
        </div>
    );
};

function AssetPublicView({ searchParams }: { searchParams: Promise<{ assetId?: string; s?: string }> }) {
  const params = use(searchParams);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        let assetId = params.assetId;

        // If 's' parameter is present, lookup via public_shares first
        if (params.s) {
          const shareDoc = await getDoc(doc(db, 'public_shares', params.s));
          if (shareDoc.exists()) {
            assetId = shareDoc.data().assetId;
          }
        }

        if (!assetId) {
          setError('Parameter rujukan tidak valid.');
          setLoading(false);
          return;
        }

        const assetDoc = await getDoc(doc(db, 'assets', assetId));
        if (assetDoc.exists()) {
          setAsset({ id: assetDoc.id, ...assetDoc.data() } as Asset);
        } else {
          setError('Aset tidak ditemukan dalam database.');
        }
      } catch (err) {
        console.error("Fetch Error:", err);
        setError('Gagal memuat data verifikasi.');
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, [params.assetId, params.s]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl space-y-4">
          <Skeleton className="h-12 w-48 mx-auto" />
          <Skeleton className="h-[600px] w-full rounded-2xl" />
        </div>
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="bg-white p-10 rounded-3xl shadow-xl border max-w-md w-full space-y-6">
            <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto">
                <Box className="w-10 h-10 text-rose-500" />
            </div>
            <div className="space-y-2">
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">Verifikasi Gagal</h1>
                <p className="text-slate-500">{error || 'Data yang Anda cari tidak tersedia.'}</p>
            </div>
            <div className="pt-4 border-t">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-relaxed">
                    Scan QR Code pada label fisik aset resmi PT. CGI<br/>untuk mendapatkan rincian yang valid.
                </p>
            </div>
        </div>
      </div>
    );
  }

  const galleryImages = [
    asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4,
    asset.disposalPhotoURL1, asset.disposalPhotoURL2
  ].filter((url): url is string => !!url && url.length > 0);

  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-slate-100 p-4 md:p-10 font-body">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Sekuritas */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-white rounded-2xl shadow-sm border border-slate-100">
                    <Image src="/cgi.png" alt="CGI Logo" width={48} height={48} />
                </div>
                <div>
                    <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase leading-none">Official Verification</h1>
                    <p className="text-xs font-bold text-blue-600 tracking-widest mt-1">PT. CHINA GLAZE INDONESIA</p>
                </div>
            </div>
            <div className="flex items-center gap-3">
                <Badge variant="outline" className="bg-white px-4 py-1.5 rounded-full border-blue-200 text-blue-700 font-black text-[10px] tracking-tighter uppercase shadow-sm">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> Verified Identity
                </Badge>
            </div>
        </div>

        {/* Kartu Identitas Utama */}
        <Card className="rounded-[2rem] overflow-hidden border-none shadow-2xl bg-white relative">
            <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-emerald-600" />
            
            <CardContent className="p-0">
                <div className="grid md:grid-cols-5 min-h-[500px]">
                    
                    {/* Sisi Kiri: Foto Utama & Stamp */}
                    <div className="md:col-span-2 bg-slate-50 p-8 flex flex-col items-center justify-center text-center relative border-r">
                        <div className="relative w-full aspect-square rounded-3xl overflow-hidden shadow-lg border-4 border-white mb-6">
                            <Image 
                                src={galleryImages[0] || 'https://placehold.co/400x400?text=No+Photo'} 
                                alt={asset.name} 
                                fill 
                                className="object-cover"
                            />
                        </div>
                        <div className="space-y-1">
                            <h2 className="text-2xl font-black text-slate-900 leading-tight uppercase tracking-tighter">{asset.name}</h2>
                            <p className="text-lg font-mono font-bold text-primary tracking-widest uppercase">{asset.code}</p>
                        </div>
                        
                        <div className="mt-8">
                            {getStatusStamp(asset.status, asset.condition)}
                        </div>
                    </div>

                    {/* Sisi Kanan: Rincian Data */}
                    <div className="md:col-span-3 p-8 space-y-8">
                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 border-b pb-2 flex items-center gap-2">
                                <Info className="w-3 h-3" /> Informasi Identitas & Lokasi
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label="Kategori" value={asset.category} icon={Layers} />
                                <DetailItem label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
                                <DetailItem label="Lokasi Unit" value={asset.location} icon={MapPin} className="bg-primary/5 border-primary/10" />
                                <DetailItem label="Penanggung Jawab" value={asset.user} icon={User} />
                                <DetailItem label="Kondisi Fisik" value={asset.condition} icon={ShieldCheck} />
                                <DetailItem label="Tgl Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMM yyyy', {locale: id}) : '-'} icon={Calendar} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 border-b pb-2 flex items-center gap-2">
                                <ShieldCheck className="w-3 h-3" /> Spesifikasi ISO 14064
                            </h3>
                            <div className="grid grid-cols-2 gap-3">
                                <DetailItem label={isAC ? "Model | Tipe Unit" : "Model/Type"} value={asset.accessory1} icon={Box} />
                                <DetailItem label={isAC ? "Jenis Refrigeran" : "Fuel/Energy"} value={asset.accessory2} icon={Box} />
                                <DetailItem label={isAC ? "Volume Ref (KG)" : "Volume/Cap"} value={asset.accessory3} icon={Box} />
                                <DetailItem label={isAC ? "Power (kW)" : "Power/KW"} value={asset.accessory4} icon={Box} />
                            </div>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Bagian Catatan Sistem */}
        <div className="grid md:grid-cols-2 gap-6">
            <Card className="rounded-3xl border-none shadow-xl bg-white p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-primary" /> Catatan & Riwayat Sistem
                </h3>
                <div className="bg-slate-50 p-4 rounded-2xl border border-dashed border-slate-200 text-sm text-slate-600 leading-relaxed italic whitespace-pre-wrap min-h-[120px]">
                    {asset.notes || 'Sistem tidak mencatat riwayat tambahan untuk aset ini.'}
                </div>
            </Card>

            <Card className="rounded-3xl border-none shadow-xl bg-white p-6">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-4 flex items-center gap-2">
                    <ImageIcon className="w-4 h-4 text-primary" /> Galeri Visual Fisik
                </h3>
                <div className="grid grid-cols-3 gap-2">
                    {galleryImages.length > 0 ? galleryImages.map((url, i) => (
                        <div key={i} className="relative aspect-square rounded-xl overflow-hidden border border-slate-100 hover:scale-105 transition-transform cursor-pointer">
                            <Image src={url} alt={`Preview ${i}`} fill className="object-cover" />
                        </div>
                    )) : (
                        <div className="col-span-full h-24 rounded-xl bg-slate-50 border border-dashed flex items-center justify-center text-slate-400 text-xs font-bold">
                            TIDAK ADA FOTO TERLAMPIR
                        </div>
                    )}
                </div>
            </Card>
        </div>

        {/* Footer Sertifikasi */}
        <div className="text-center pt-10 border-t border-slate-200 space-y-4">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] leading-loose">
                Sistem Manajemen Aset Terpadu<br/>
                PT. China Glaze Indonesia - 2026<br/>
                Data Validitas Terjamin Oleh Database Pusat
            </p>
            <div className="flex justify-center gap-4 opacity-30 grayscale hover:opacity-100 hover:grayscale-0 transition-all duration-500 cursor-default">
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4"/> <span className="text-[9px] font-black uppercase">Standard Audit</span></div>
                <div className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4"/> <span className="text-[9px] font-black uppercase">ISO 14064-3</span></div>
            </div>
        </div>

      </div>
    </div>
  );
}

export default function AssetPublicPage({ searchParams }: { searchParams: Promise<{ assetId?: string; s?: string }> }) {
    return (
        <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-primary" /></div>}>
            <AssetPublicView searchParams={searchParams} />
        </Suspense>
    );
}

const Loader2 = ({ className }: { className?: string }) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("animate-spin", className)}>
        <path d="M21 12a9 9 0 1 1-6.219-8.56" />
    </svg>
);
