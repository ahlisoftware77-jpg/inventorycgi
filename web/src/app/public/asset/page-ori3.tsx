
'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  BadgeCheck, 
  ShieldCheck, 
  MapPin, 
  Tag, 
  User, 
  Layers, 
  Info, 
  Hash, 
  Clock, 
  FileText,
  X,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Loader2
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import QRCode from 'qrcode';
import { cn } from '@/lib/utils';

function AssetPublicContent() {
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    if (!assetId) {
      setLoading(false);
      return;
    }

    const unsub = onSnapshot(doc(db, 'assets', assetId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);
        setActivePhoto(data.photoURL || null);
        
        // Generate internal QR for the table
        const publicUrl = `${window.location.origin}/public/asset?assetId=${data.id}`;
        QRCode.toDataURL(publicUrl, { margin: 1, scale: 4 }).then(setQrCodeUrl);
      }
      setLoading(false);
    });

    return () => unsub();
  }, [assetId]);

  const allPhotos = useMemo(() => {
    if (!asset) return [];
    return [
      asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4,
      asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4
    ].filter((url): url is string => !!url);
  }, [asset]);

  const getPreviousLocation = (notes: string | undefined): string | null => {
    if (!notes) return null;
    const approvalMatch = notes.match(/Mutasi \d+ unit dari: (.*?) ke/);
    if (approvalMatch && approvalMatch[1]) return approvalMatch[1].trim();
    const requestMatch = notes.match(/Lokasi Sebelumnya: (.*?)\n/);
    if (requestMatch && requestMatch[1]) return requestMatch[1].trim();
    return null;
  };

  const getStamp = (status: AssetStatus) => {
    let text = '';
    let color = '';
    if (status === 'Aktif' || status.includes('creation')) { text = 'VERIFIED'; color = 'border-emerald-600 text-emerald-600'; }
    else if (status === 'approved_disposal') { text = 'DISPOSED'; color = 'border-rose-600 text-rose-600'; }
    else if (status === 'approved_mutasi') { text = 'MUTATED'; color = 'border-blue-600 text-blue-600'; }
    else if (status.includes('Repair') || status.includes('Perbaikan')) { text = 'MAINTENANCE'; color = 'border-amber-500 text-amber-500'; }
    else return null;

    return (
      <div className={cn(
        "relative inline-block mt-4 px-4 py-1 text-2xl font-black border-4 rounded-md shadow-sm transform rotate-[-12deg] uppercase tracking-tighter opacity-80",
        color
      )}>
        {text}
      </div>
    );
  };

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-2xl space-y-4">
        <Skeleton className="h-12 w-3/4 mx-auto" />
        <Skeleton className="h-[500px] w-full rounded-2xl" />
      </div>
    </div>
  );

  if (!asset) return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50 text-center">
      <div className="max-w-md space-y-4">
        <X className="w-16 h-16 text-destructive mx-auto" />
        <h1 className="text-2xl font-black text-slate-900">IDENTITAS TIDAK DITEMUKAN</h1>
        <p className="text-slate-500">ID aset tidak valid atau telah dihapus dari sistem keamanan pusat.</p>
      </div>
    </div>
  );

  const prevLocation = getPreviousLocation(asset.notes);
  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="min-h-screen bg-slate-100 py-10 px-4 md:px-6 font-body">
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
        
        {/* Header Resmi */}
        <div className="text-center space-y-2">
          <div className="flex justify-center items-center gap-3 mb-4">
            <Image src="/cgi.png" alt="Logo" width={50} height={50} className="drop-shadow-sm" />
            <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter uppercase">PT. CHINA GLAZE INDONESIA</h1>
          </div>
          <p className="text-xs md:text-sm font-bold text-primary tracking-[0.3em] uppercase">Digital Asset Verification Certificate</p>
          <div className="h-1 w-24 bg-primary mx-auto rounded-full" />
        </div>

        <Card className="border-none shadow-2xl overflow-hidden bg-white rounded-3xl">
          <CardContent className="p-0">
            <div className="grid grid-cols-1 lg:grid-cols-12">
              
              {/* Sisi Kiri: Galeri */}
              <div className="lg:col-span-5 bg-slate-50 p-6 flex flex-col gap-4 border-r border-slate-100">
                <div 
                  className="relative aspect-square w-full rounded-2xl overflow-hidden border-4 border-white shadow-lg cursor-zoom-in group"
                  onClick={() => setIsLightboxOpen(true)}
                >
                  {activePhoto ? (
                    <Image src={activePhoto} alt="Aset" fill className="object-cover transition-transform duration-500 group-hover:scale-105" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-slate-200 text-slate-400">
                      <FileText className="w-12 h-12" />
                    </div>
                  )}
                  <div className="absolute bottom-3 right-3 p-2 bg-black/50 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Maximize2 className="w-4 h-4" />
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2">
                  {allPhotos.map((url, idx) => (
                    <button 
                      key={idx} 
                      onClick={() => setActivePhoto(url)}
                      className={cn(
                        "relative aspect-square rounded-lg overflow-hidden border-2 transition-all",
                        activePhoto === url ? "border-primary shadow-md scale-95" : "border-transparent opacity-60 hover:opacity-100"
                      )}
                    >
                      <Image src={url} alt={`Thumb ${idx}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>

                <div className="flex justify-center pt-2">
                  {getStamp(asset.status)}
                </div>
              </div>

              {/* Sisi Kanan: Informasi */}
              <div className="lg:col-span-7 p-6 md:p-8 space-y-8">
                
                {/* Tabel Identity */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100">
                    <BadgeCheck className="w-5 h-5 text-emerald-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Verified Identity</h3>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
                    <div className="space-y-4">
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Item Name</p>
                        <p className="text-lg font-black text-slate-900 leading-tight uppercase">{asset.name}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Internal Code</p>
                        <p className="text-xl font-mono font-bold text-primary tracking-tighter">{asset.code}</p>
                      </div>
                      <div className="space-y-0.5">
                        <p className="text-[10px] font-black text-slate-400 uppercase">Transaction ID</p>
                        <p className="text-sm font-bold text-slate-700">{asset.transactionCode || 'OFFICIAL-CRT-001'}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-center md:items-end justify-center">
                      <div className="p-2 border-2 border-slate-100 rounded-xl bg-white shadow-sm">
                        {qrCodeUrl && <Image src={qrCodeUrl} alt="Internal QR" width={100} height={100} />}
                      </div>
                      <p className="text-[9px] font-black text-slate-400 mt-2 uppercase tracking-tighter text-center md:text-right leading-none">Security Seal<br/>System Authenticated</p>
                    </div>
                  </div>
                </div>

                {/* Histori Lokasi */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center gap-1.5 mb-1 opacity-60">
                      <MapPin className="w-3 h-3 text-slate-500" />
                      <p className="text-[9px] font-black uppercase text-slate-500">Original Location</p>
                    </div>
                    <p className="text-sm font-bold text-slate-600">{prevLocation || asset.location}</p>
                  </div>
                  <div className="p-3 rounded-2xl bg-blue-50 border border-blue-100">
                    <div className="flex items-center gap-1.5 mb-1">
                      <MapPin className="w-3 h-3 text-primary" />
                      <p className="text-[9px] font-black uppercase text-primary">Current Location</p>
                    </div>
                    <p className="text-sm font-bold text-primary">{asset.location}</p>
                  </div>
                </div>

                {/* Custodian Section */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b-2 border-slate-100">
                    <User className="w-5 h-5 text-primary" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-slate-400">Custodian Identity</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Responsible Person</p>
                      <p className="text-sm font-bold text-slate-900">{asset.user || '-'}</p>
                    </div>
                    <div className="space-y-0.5 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Department</p>
                      <p className="text-sm font-bold text-slate-900">{asset.location}</p>
                    </div>
                  </div>
                </div>

                {/* ISO Specs */}
                <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-slate-700">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">ISO 14064 Compliance Data</h3>
                  </div>
                  <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase">{isAC ? "Model/Type" : "Spec 1"}</p>
                      <p className="text-xs font-bold truncate">{asset.accessory1 || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase">{isAC ? "Fuel/Ref" : "Spec 2"}</p>
                      <p className="text-xs font-bold truncate">{asset.accessory2 || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase">{isAC ? "Volume" : "Spec 3"}</p>
                      <p className="text-xs font-bold truncate">{asset.accessory3 || '-'}</p>
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-[8px] font-black text-slate-500 uppercase">{isAC ? "Power/Cap" : "Spec 4"}</p>
                      <p className="text-xs font-bold truncate">{asset.accessory4 || '-'}</p>
                    </div>
                  </div>
                </div>

                {/* Remarks */}
                <div className="space-y-3">
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Info className="w-3.5 h-3.5"/> System Remarks</p>
                  <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-[11px] text-slate-500 leading-relaxed font-medium italic">
                    {asset.notes?.split('---')[1]?.trim() || asset.notes || 'No technical logs recorded for this asset.'}
                  </div>
                </div>

              </div>
            </div>
          </CardContent>
        </Card>

        {/* Footer Keamanan */}
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 py-6 border-t-2 border-slate-200">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-100 p-2 rounded-full">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-900 uppercase">Status: Secure Verified</p>
              <p className="text-[9px] text-slate-500">Verified by Asset_CGI Security System</p>
            </div>
          </div>
          <div className="text-center md:text-right">
            <p className="text-[10px] font-black text-slate-400 uppercase">Verification Date</p>
            <p className="text-[11px] font-bold text-slate-900">{format(new Date(), 'PPpp', { locale: id })}</p>
          </div>
        </div>
      </div>

      {/* Lightbox / Full Image View */}
      {isLightboxOpen && (
        <div 
          className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4 animate-in fade-in duration-300"
          onClick={() => setIsLightboxOpen(false)}
        >
          <button className="absolute top-6 right-6 p-3 bg-white/10 rounded-full text-white hover:bg-white/20 transition-all">
            <X className="w-6 h-6" />
          </button>
          
          <div 
            className="relative w-full h-full max-w-5xl max-h-[85vh]"
            onClick={(e) => e.stopPropagation()}
          >
            {activePhoto && (
              <Image 
                src={activePhoto} 
                alt="Original Size" 
                fill 
                className="object-contain"
                priority
              />
            )}
          </div>

          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 bg-black/50 px-6 py-2 rounded-full border border-white/10 text-white/70 text-xs font-bold">
            Viewing Original Image Size
          </div>
        </div>
      )}
    </div>
  );
}

export default function AssetPublicPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <AssetPublicContent />
    </Suspense>
  );
}
