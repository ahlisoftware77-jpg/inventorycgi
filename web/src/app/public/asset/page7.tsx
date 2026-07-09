
'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Loader2, ShieldCheck, MapPin, Tag, Hash, User, Calendar, Info, Layers, ExternalLink, QrCode as QrIcon, FileText, Settings2, ShieldAlert } from 'lucide-react';
import Image from 'next/image';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';

function AssetPublicContent({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const params = use(searchParams);
  const assetId = params.assetId;
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (!assetId) return;

    const fetchAsset = async () => {
      try {
        const docRef = doc(db, 'assets', assetId);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = { id: docSnap.id, ...docSnap.data() } as Asset;
          setAsset(data);
          setActiveImage(data.photoURL || null);
          
          // Generate QR Code for this verification page
          const currentUrl = window.location.href;
          const qr = await QRCode.toDataURL(currentUrl, { margin: 1, width: 200 });
          setQrCodeUrl(qr);
        }
      } catch (error) {
        console.error("Error fetching public asset:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchAsset();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="font-bold tracking-widest text-slate-400 uppercase text-xs">Memverifikasi Data...</p>
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex min-h-screen items-center justify-center p-4 bg-slate-50">
        <div className="text-center space-y-4">
          <ShieldAlert className="h-16 w-16 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Data Tidak Valid</h1>
          <p className="text-muted-foreground">ID Aset tidak ditemukan atau tautan verifikasi telah kedaluwarsa.</p>
          <Button asChild><Link href="/login">Kembali ke Beranda</Link></Button>
        </div>
      </div>
    );
  }

  const allPhotos = [
    asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4,
    asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4
  ].filter((url): url is string => !!url && url.length > 0);

  const getStatusStamp = (status: AssetStatus) => {
    let text = 'VERIFIED';
    let color = 'border-emerald-600 text-emerald-600 bg-emerald-50/50';

    if (status === 'approved_disposal') {
      text = 'DISPOSED';
      color = 'border-rose-600 text-rose-600 bg-rose-50/50';
    } else if (status === 'approved_mutasi') {
      text = 'MUTATED';
      color = 'border-blue-600 text-blue-600 bg-blue-50/50';
    } else if (status.includes('Repair') || status.includes('Perbaikan')) {
      text = 'MAINTENANCE';
      color = 'border-amber-500 text-amber-600 bg-amber-50/50';
    }

    return (
      <div className={cn(
        "px-6 py-2 border-4 rounded-xl font-black text-2xl tracking-tighter transform -rotate-12 opacity-80",
        color
      )}>
        {text}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 flex items-center justify-center">
      <div className="max-w-5xl w-full">
        {/* Certificate Card */}
        <div className="bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
          
          {/* Header */}
          <div className="bg-slate-900 px-6 py-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-4 border-b-4 border-primary">
            <div className="flex items-center gap-4">
              <Image src="/cgi.png" alt="PT. CGI Logo" width={50} height={50} className="bg-white p-1 rounded-lg" />
              <div>
                <h1 className="text-white font-black text-xl md:text-2xl tracking-tight uppercase">Asset Verification Certificate</h1>
                <p className="text-primary font-bold text-[10px] md:text-xs tracking-[0.2em] uppercase">Digital Integrity System • PT. China Glaze Indonesia</p>
              </div>
            </div>
            <div className="flex items-center gap-3 bg-white/10 px-4 py-2 rounded-full border border-white/20">
              <ShieldCheck className="h-5 w-5 text-emerald-400" />
              <span className="text-white text-xs font-black tracking-widest uppercase">Verified Identity</span>
            </div>
          </div>

          <div className="p-6 md:p-10 grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
            
            {/* Left: Gallery & Stamp */}
            <div className="lg:col-span-5 space-y-6">
              <div className="relative aspect-square bg-slate-100 rounded-2xl overflow-hidden border shadow-inner flex items-center justify-center">
                {activeImage ? (
                  <Image src={activeImage} alt={asset.name} fill className="object-contain p-2" priority />
                ) : (
                  <div className="text-center p-8 space-y-2">
                    <QrIcon className="h-12 w-12 text-slate-300 mx-auto" />
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">No Unit Visual Available</p>
                  </div>
                )}
              </div>

              {allPhotos.length > 1 && (
                <div className="flex flex-wrap gap-2 justify-center">
                  {allPhotos.map((url, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActiveImage(url)}
                      className={cn(
                        "relative h-14 w-14 rounded-lg overflow-hidden border-2 transition-all",
                        activeImage === url ? "border-primary scale-105 shadow-md" : "border-slate-200 opacity-60 hover:opacity-100"
                      )}
                    >
                      <Image src={url} alt={`Thumb ${idx}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* Stamp Area */}
              <div className="flex items-center justify-center py-4 border-2 border-dashed border-slate-100 rounded-2xl min-h-[120px]">
                {getStatusStamp(asset.status)}
              </div>
            </div>

            {/* Right: Data Grid */}
            <div className="lg:col-span-7 space-y-8">
              
              {/* Verified Identity Table */}
              <div className="space-y-4">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Tag className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">Verified Identity</h3>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-4 bg-slate-50/50 p-6 rounded-2xl border">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Name</p>
                      <p className="font-bold text-slate-900 text-lg leading-tight uppercase">{asset.name}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Identification Code</p>
                      <p className="font-mono font-black text-primary text-xl">{asset.code}</p>
                    </div>
                    <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Asset Category</p>
                      <p className="font-bold text-slate-700">{asset.category}</p>
                    </div>
                  </div>
                  <div className="flex items-center justify-center md:justify-end border-t md:border-t-0 md:border-l pt-4 md:pt-0 md:pl-8">
                    {qrCodeUrl && (
                      <div className="text-center space-y-2">
                        <div className="p-2 bg-white rounded-xl border shadow-sm inline-block">
                          <Image src={qrCodeUrl} alt="Validation QR" width={100} height={100} />
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Validation QR</p>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Custodian & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <User className="h-4 w-4 text-primary" />
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">Custodian</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Responsible Person</p>
                    <p className="font-black text-slate-900">{asset.user || '-'}</p>
                  </div>
                </div>
                <div className="space-y-3">
                  <div className="flex items-center gap-2 border-b pb-2">
                    <MapPin className="h-4 w-4 text-primary" />
                    <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">Location</h3>
                  </div>
                  <div className="bg-white p-4 rounded-xl border shadow-sm">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Assigned Department</p>
                    <p className="font-black text-slate-900">{asset.location} ({asset.costCenter || 'N/A'})</p>
                  </div>
                </div>
              </div>

              {/* ISO Specs */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <Settings2 className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">Technical Details (ISO 14064)</h3>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { label: 'Model/SN', value: asset.accessory1 },
                    { label: 'Fuel/Refrig', value: asset.accessory2 },
                    { label: 'Vol/KG', value: asset.accessory3 },
                    { label: 'kW/Power', value: asset.accessory4 },
                  ].map((spec, i) => (
                    <div key={i} className="bg-slate-900 p-3 rounded-xl">
                      <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{spec.label}</p>
                      <p className="text-[10px] font-bold text-white truncate">{spec.value || '-'}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Remarks */}
              <div className="space-y-3">
                <div className="flex items-center gap-2 border-b pb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-black text-sm uppercase tracking-widest text-slate-900">Verification Logs</h3>
                </div>
                <div className="bg-slate-100 p-4 rounded-xl text-[11px] leading-relaxed text-slate-600 italic font-medium border border-slate-200">
                  {asset.notes || 'No significant system logs recorded for this asset identification sequence.'}
                </div>
              </div>

              {/* Full Detail Action */}
              <div className="pt-4">
                <Button asChild className="w-full bg-slate-900 hover:bg-slate-800 text-white font-black h-12 rounded-xl shadow-lg group">
                  <Link href={`/assets/id?assetId=${asset.id}`}>
                    <ExternalLink className="mr-2 h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    LIHAT DETAIL LENGKAP (Login Diperlukan)
                  </Link>
                </Button>
              </div>

            </div>
          </div>

          {/* Footer Security Bar */}
          <div className="bg-slate-900 py-3 px-6 md:px-10 flex flex-col md:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2">
              <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified by ASSET_CGI Security System</span>
            </div>
            <div className="text-[9px] font-bold text-slate-500">
              SECURE TIMESTAMP: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}
            </div>
          </div>

        </div>
        
        {/* Helper Footer */}
        <p className="mt-8 text-center text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">
          Official Digital Asset Integrity Document • PT. China Glaze Indonesia © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
}

export default function AssetPublicPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AssetPublicContent searchParams={searchParams} />
    </Suspense>
  );
}
