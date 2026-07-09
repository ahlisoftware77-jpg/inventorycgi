'use client';

/**
 * @fileOverview Halaman Verifikasi Aset Publik yang profesional dan elegan.
 * Menampilkan Status, Kondisi, dan Pusat Biaya secara menonjol sesuai permintaan.
 */

import { useState, useEffect, Suspense, use } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  Tag, 
  MapPin, 
  Calendar, 
  User, 
  Info, 
  Layers, 
  Hash, 
  CheckCircle2, 
  Activity,
  ClipboardList
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function AssetContent({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'assets', assetId), (snap) => {
      if (snap.exists()) {
        setAsset({ id: snap.id, ...snap.data() } as Asset);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [assetId]);

  if (loading) return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <Skeleton className="h-12 w-3/4 mx-auto rounded-xl" />
      <Skeleton className="h-[500px] w-full rounded-[3rem]" />
    </div>
  );

  if (!asset) return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="p-4 bg-rose-50 rounded-full mb-4">
        <Info className="h-12 w-12 text-rose-500" />
      </div>
      <h2 className="text-2xl font-bold text-slate-900 uppercase tracking-tight">Aset Tidak Ditemukan</h2>
      <p className="text-slate-500 mt-2 font-medium">Data verifikasi tidak tersedia atau telah dihapus dari sistem pusat.</p>
    </div>
  );

  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-8 animate-in fade-in zoom-in duration-500">
      {/* Official Header */}
      <div className="text-center mb-10 space-y-3">
        <div className="inline-flex items-center gap-2 px-4 py-1 bg-primary/10 text-primary rounded-full border border-primary/20 mb-2">
          <ShieldCheck className="h-4 w-4" />
          <span className="text-[10px] font-black uppercase tracking-[0.2em]">Verified Digital Certificate</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">Verifikasi Identitas Aset</h1>
        <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.3em]">PT. China Glaze Indonesia - Database Pusat</p>
      </div>

      <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/80 backdrop-blur-sm relative">
        {/* Security Watermark */}
        <div className="absolute inset-0 opacity-[0.03] pointer-events-none flex items-center justify-center overflow-hidden">
            <div className="transform -rotate-45 scale-150">
                {Array.from({length: 15}).map((_, i) => (
                    <div key={i} className="whitespace-nowrap text-5xl font-black uppercase tracking-[1em] mb-12">VERIFIED DATABASE PT CGI OFFICIAL</div>
                ))}
            </div>
        </div>

        <CardHeader className="p-8 sm:p-12 border-b bg-slate-50/50 relative z-10">
          <div className="flex flex-col lg:flex-row justify-between items-start gap-10">
            <div className="space-y-6 flex-1 w-full">
              <div>
                <Badge className="bg-primary text-white hover:bg-primary font-black text-[10px] px-4 py-1 rounded-full mb-3 uppercase tracking-widest shadow-lg shadow-primary/20 border-none">Official Record</Badge>
                <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight leading-tight uppercase">{asset.name}</h2>
                <p className="text-xl font-mono text-primary font-bold mt-1 tracking-tighter flex items-center gap-2">
                    <span className="opacity-30">#</span>{asset.code}
                </p>
              </div>
              
              {/* Highlight Row: Status, Kondisi, Pusat Biaya */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1.5 group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                        <Activity className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Status</span>
                    </div>
                    <Badge variant={asset.status === 'Aktif' ? 'success' : 'secondary'} className="w-fit rounded-lg font-black text-[10px] uppercase px-3">
                        {asset.status.replace(/_/g, ' ')}
                    </Badge>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1.5 group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                        <ClipboardList className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Kondisi</span>
                    </div>
                    <Badge variant={asset.condition === 'Baik' || asset.condition === 'Baru' ? 'success' : 'warning'} className="w-fit rounded-lg font-black text-[10px] uppercase px-3">
                        {asset.condition}
                    </Badge>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm flex flex-col gap-1.5 group hover:border-primary/30 transition-colors">
                    <div className="flex items-center gap-1.5 text-muted-foreground opacity-60">
                        <Hash className="h-3 w-3 text-primary" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Cost Center</span>
                    </div>
                    <span className="text-sm font-black text-slate-900">{asset.costCenter || 'N/A'}</span>
                </div>
              </div>
            </div>

            <div className="shrink-0 flex flex-col items-center gap-4 self-center lg:self-start">
                <div className="relative h-40 w-40 sm:h-48 sm:w-48 rounded-[2.5rem] overflow-hidden border-8 border-white shadow-2xl bg-white group">
                    <Image 
                        src={asset.photoURL || 'https://placehold.co/400x400/F1F5F9/64748B?text=Aset'} 
                        alt={asset.name} 
                        fill 
                        className="object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                </div>
                <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Identitas Visual Fisik</p>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-8 sm:p-12 space-y-12 relative z-10">
          {/* Main Details Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-x-8 gap-y-10">
            <DetailItem label="Kategori Aset" value={asset.category} icon={Layers} />
            <DetailItem label="Lokasi Penempatan" value={asset.location} icon={MapPin} />
            <DetailItem label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
            <DetailItem label="Kondisi Saat Ini" value={asset.condition} icon={ClipboardList} />
            <DetailItem label="Status Sistem" value={asset.status.replace(/_/g, ' ')} icon={Activity} />
            <DetailItem label="Tgl Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'd MMMM yyyy', {locale: id}) : '-'} icon={Calendar} />
            <DetailItem label="Penanggung Jawab" value={asset.user} icon={User} />
            <DetailItem label="Merek / Brand" value={asset.brand} icon={Tag} />
            <DetailItem label="Kuantitas Unit" value={`${asset.qty} Unit`} icon={Hash} />
          </div>

          {/* Technical Passport (ISO 14064) */}
          <div className="p-10 rounded-[3rem] bg-slate-900 text-white shadow-2xl relative overflow-hidden border border-white/5">
            <div className="absolute top-0 right-0 w-40 h-40 bg-primary/20 blur-[100px] rounded-full" />
            <div className="absolute bottom-0 left-0 w-24 h-24 bg-blue-500/10 blur-[60px] rounded-full" />
            
            <h3 className="text-xl font-black mb-8 flex items-center gap-4 uppercase tracking-tighter">
                <div className="p-2.5 bg-white/10 rounded-2xl backdrop-blur-md">
                    <ShieldCheck className="h-6 w-6 text-primary" />
                </div>
                Technical Passport (ISO 14064)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-8 gap-x-12">
                <TechItem label={isAC ? "Model | Tipe / Jenis Unit" : "Model / Serial Number"} value={asset.accessory1} />
                <TechItem label={isAC ? "Jenis refrigeran" : "Tipe / Jenis Unit"} value={asset.accessory2} />
                <TechItem label={isAC ? "Volume pengisi refrigeran" : "Bahan Bakar / Energi"} value={asset.accessory3} />
                <TechItem label={isAC ? "kW / Kapasitas" : "Kapasitas / Volume"} value={asset.accessory4} />
            </div>
          </div>

          {/* Document Verification Footer */}
          <div className="pt-10 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-8">
            <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-50 rounded-2xl">
                    <CheckCircle2 className="h-8 w-8 text-emerald-500" />
                </div>
                <div className="text-left">
                    <p className="text-[11px] font-black text-slate-900 uppercase tracking-widest">Data Terautentikasi</p>
                    <p className="text-[10px] font-bold text-slate-400 uppercase leading-tight">Sertifikat ini divalidasi oleh database terpusat<br/>Logistik & HSE PT. China Glaze Indonesia</p>
                </div>
            </div>
            <div className="text-center sm:text-right space-y-1">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Timestamp Verifikasi</p>
                <p className="text-sm font-black text-slate-900">{asset.updatedAt ? format(asset.updatedAt.toDate(), 'd MMMM yyyy, HH:mm', {locale: id}) : format(new Date(), 'd MMMM yyyy, HH:mm', {locale: id})}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <footer className="mt-12 text-center pb-8">
        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.4em] mb-2">© 2026 PT. CHINA GLAZE INDONESIA</p>
        <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">Asset Lifecycle Management System - Internal HSE Protocol</p>
      </footer>
    </div>
  );
}

function DetailItem({ label, value, icon: Icon }: { label: string, value: string | undefined, icon: any }) {
    return (
        <div className="space-y-2 group">
            <div className="flex items-center gap-2 text-slate-400">
                <Icon className="h-3.5 w-3.5 text-primary/60 group-hover:text-primary transition-colors" />
                <span className="text-[10px] font-black uppercase tracking-widest leading-none">{label}</span>
            </div>
            <p className="text-sm sm:text-base font-black text-slate-900 leading-tight border-l-2 border-slate-100 pl-3 group-hover:border-primary/30 transition-all">{value || '-'}</p>
        </div>
    );
}

function TechItem({ label, value }: { label: string, value: string | undefined }) {
    return (
        <div className="space-y-1.5 border-l border-white/10 pl-5">
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.15em] opacity-80">{label}</p>
            <p className="text-sm sm:text-base font-bold text-white tracking-tight leading-snug">{value || '-'}</p>
        </div>
    );
}

function Loader2({ className }: { className?: string }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={cn("animate-spin", className)}
        >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
    );
}

export default function PublicAssetPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const params = use(searchParams);
  const assetId = params.assetId;

  return (
    <div className="min-h-screen bg-[#f8fafc] text-slate-900 font-body">
      <Suspense fallback={<div className="flex items-center justify-center min-h-screen flex-col gap-4">
          <Loader2 className="h-10 w-10 text-primary" />
          <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400">Menghubungkan ke Database...</p>
      </div>}>
        {assetId ? <AssetContent assetId={assetId} /> : (
            <div className="flex flex-col items-center justify-center min-h-screen p-8 text-center">
                <div className="p-6 bg-slate-100 rounded-full mb-6">
                    <Info className="h-16 w-16 text-slate-400" />
                </div>
                <h2 className="text-3xl font-black text-slate-900 uppercase tracking-tighter">Parameter Tidak Valid</h2>
                <p className="text-slate-500 mt-2 font-medium">Mohon pindai ulang Kode QR resmi pada fisik aset.</p>
            </div>
        )}
      </Suspense>
    </div>
  );
}
