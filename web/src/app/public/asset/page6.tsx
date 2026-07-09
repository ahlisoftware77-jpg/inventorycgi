'use client';

/**
 * @fileOverview Halaman Verifikasi Aset Publik.
 * Didesain profesional untuk akses tanpa login melalui scan QR Code.
 */

import { useState, useEffect, Suspense, use } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tag, 
  MapPin, 
  Calendar, 
  Hash, 
  Info, 
  Layers, 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  AlertCircle,
  Image as ImageIcon,
  Building2,
  Package,
  History
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

function AssetPublicContent({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [mainPhoto, setMainPhoto] = useState<string | null>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'assets', assetId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);
        // Set main photo to first available image
        const photos = [
          data.photoURL, data.photoURL2, data.photoURL3, data.photoURL4,
          data.disposalPhotoURL1, data.disposalPhotoURL2
        ].filter((url): url is string => !!url);
        if (photos.length > 0) setMainPhoto(photos[0]);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [assetId]);

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-8 animate-pulse">
        <Skeleton className="h-16 w-3/4 rounded-xl" />
        <Skeleton className="h-[400px] w-full rounded-2xl" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
          <Skeleton className="h-24 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-4">
        <div className="p-4 bg-red-100 rounded-full text-red-600">
          <AlertCircle className="w-12 h-12" />
        </div>
        <h1 className="text-2xl font-black text-slate-900 uppercase">Data Tidak Ditemukan</h1>
        <p className="text-slate-500 max-w-xs">QR Code tidak valid atau aset telah dihapus dari sistem pusat.</p>
      </div>
    );
  }

  const getStatusStamp = (status: AssetStatus) => {
    let text = 'VERIFIED';
    let color = 'text-emerald-600 border-emerald-600 bg-emerald-50/50';

    if (status === 'approved_disposal') {
      text = 'DISPOSED';
      color = 'text-rose-600 border-rose-600 bg-rose-50/50';
    } else if (status === 'approved_mutasi') {
      text = 'MUTATED';
      color = 'text-blue-600 border-blue-600 bg-blue-50/50';
    } else if (['Rusak', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan'].includes(status)) {
      text = 'MAINTENANCE';
      color = 'text-amber-600 border-amber-600 bg-amber-50/50';
    }

    return (
      <div className={cn(
        "px-6 py-2 border-4 rounded-xl text-2xl font-black tracking-tighter transform rotate-[-8deg] shadow-lg uppercase",
        color
      )}>
        {text}
      </div>
    );
  };

  const allPhotos = [
    asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4,
    asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4
  ].filter((url): url is string => !!url && url.length > 0);

  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="min-h-screen bg-slate-50 py-8 px-4 md:px-8">
      <div className="max-w-5xl mx-auto">
        {/* Official Header */}
        <div className="flex flex-col md:flex-row items-center justify-between mb-8 pb-6 border-b border-slate-200 gap-6">
          <div className="flex items-center gap-4">
            <div className="relative w-16 h-16 bg-white rounded-2xl shadow-sm border p-2">
              <Image src="/cgi.png" alt="CGI Logo" fill className="object-contain p-2" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 leading-none">PT. CHINA GLAZE INDONESIA</h1>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-1">Official Asset Verification Identity</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="bg-white px-4 py-1.5 rounded-full border-blue-200 text-blue-700 font-bold shadow-sm">
              <CheckCircle2 className="w-3.5 h-3.5 mr-2" />
              DATABASE VERIFIED
            </Badge>
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Photo Gallery - Left Section */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-[4/3] rounded-3xl overflow-hidden bg-black border-4 border-white shadow-2xl group">
              {mainPhoto ? (
                <Image src={mainPhoto} alt="Full view" fill className="object-contain" priority />
              ) : (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-600 bg-slate-100">
                  <ImageIcon className="w-12 h-12 mb-2 opacity-20" />
                  <p className="text-[10px] font-bold uppercase tracking-widest opacity-40">No Image Available</p>
                </div>
              )}
              {/* Overlay Status Stamp */}
              <div className="absolute bottom-6 right-6 z-20">
                {getStatusStamp(asset.status)}
              </div>
            </div>

            {/* Thumbnails */}
            {allPhotos.length > 1 && (
              <div className="grid grid-cols-4 gap-2">
                {allPhotos.map((url, i) => (
                  <button 
                    key={i} 
                    onClick={() => setMainPhoto(url)}
                    className={cn(
                      "relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105",
                      mainPhoto === url ? "border-primary shadow-md" : "border-transparent opacity-60"
                    )}
                  >
                    <Image src={url} alt={`Thumbnail ${i+1}`} fill className="object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Asset Info - Right Section */}
          <div className="lg:col-span-7 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-xl border border-slate-100 relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-[0.03] pointer-events-none">
                <Package className="w-32 h-32" />
              </div>
              
              <div className="space-y-1 mb-6">
                <h2 className="text-3xl font-black text-slate-900 tracking-tighter uppercase leading-tight">{asset.name}</h2>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-mono text-primary font-bold">{asset.code}</span>
                  <div className="h-4 w-px bg-slate-200" />
                  <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{asset.category}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <DataBlock icon={MapPin} label="LOKASI UNIT" value={asset.location} />
                <DataBlock icon={Building2} label="COST CENTER" value={asset.costCenter} />
                <DataBlock icon={ImageIcon} label="BRAND / MERK" value={asset.brand} />
                <DataBlock icon={Layers} label="JUMLAH UNIT" value={`${asset.qty} Item`} />
                <DataBlock icon={Calendar} label="TGL PEROLEHAN" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd/MM/yyyy') : '-'} />
                <DataBlock icon={Info} label="STATUS SISTEM" value={asset.status.replace(/_/g, ' ')} />
              </div>
            </div>

            {/* ISO Technical Section */}
            <div className="bg-blue-600 p-6 rounded-3xl shadow-xl text-white">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Rincian Spesifikasi ISO 14064
              </h3>
              <div className="grid grid-cols-2 gap-x-8 gap-y-4">
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold opacity-60 uppercase">{isAC ? 'Model | Tipe / Jenis' : 'Spec 1'}</p>
                  <p className="text-sm font-bold truncate">{asset.accessory1 || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold opacity-60 uppercase">{isAC ? 'Jenis Refrigeran' : 'Spec 2'}</p>
                  <p className="text-sm font-bold truncate">{asset.accessory2 || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold opacity-60 uppercase">{isAC ? 'Volume Refrig (KG)' : 'Spec 3'}</p>
                  <p className="text-sm font-bold truncate">{asset.accessory3 || '-'}</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-[9px] font-bold opacity-60 uppercase">{isAC ? 'Power (kW)' : 'Spec 4'}</p>
                  <p className="text-sm font-bold truncate">{asset.accessory4 || '-'}</p>
                </div>
              </div>
            </div>

            {/* System Notes */}
            <div className="bg-slate-100 p-6 rounded-3xl border border-slate-200">
              <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-3 flex items-center gap-2">
                <History className="w-4 h-4" /> Log & Catatan Sistem
              </h3>
              <p className="text-xs font-medium text-slate-600 leading-relaxed italic whitespace-pre-wrap">
                {asset.notes || 'Sistem belum mencatat riwayat tambahan untuk aset ini.'}
              </p>
            </div>
          </div>
        </div>

        {/* Footer Guarantee */}
        <div className="mt-12 text-center space-y-2 pb-8">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Verification Token: {asset.id}</p>
          <p className="text-xs font-bold text-slate-500">© 2026 PT. China Glaze Indonesia. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}

function DataBlock({ icon: Icon, label, value }: { icon: any, label: string, value: any }) {
  return (
    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-100">
      <div className="flex items-center gap-1.5 opacity-50 mb-1">
        <Icon className="w-3 h-3" />
        <p className="text-[8px] font-black uppercase tracking-widest">{label}</p>
      </div>
      <p className="text-sm font-bold text-slate-900 truncate">{value || '-'}</p>
    </div>
  );
}

export default function AssetPublicPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const params = use(searchParams);
  const assetId = params.assetId;

  if (!assetId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <h1 className="text-2xl font-black text-slate-900">IDENTITAS TIDAK VALID</h1>
        <p className="text-slate-500">Scan QR Code pada label aset resmi PT. China Glaze Indonesia.</p>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center font-black animate-pulse">MEMVERIFIKASI...</div>}>
      <AssetPublicContent assetId={assetId} />
    </Suspense>
  );
}
