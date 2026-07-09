
'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  CheckCircle2, 
  Info, 
  User, 
  Building, 
  MapPin, 
  Hash, 
  Tag, 
  Calendar, 
  Layers, 
  Shield, 
  FileText, 
  Check,
  Loader2,
  AlertCircle
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
  const [activePhoto, setActivePhoto] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (!assetId) {
      setLoading(false);
      return;
    }

    const unsubscribe = onSnapshot(doc(db, 'assets', assetId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as Asset;
        setAsset(data);
        setActivePhoto(data.photoURL || null);
        
        // Generate internal QR for the table
        const publicUrl = window.location.href;
        const qr = await QRCode.toDataURL(publicUrl, { margin: 1, width: 200 });
        setQrCodeUrl(qr);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [assetId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <Card className="w-full max-w-3xl">
          <CardHeader className="space-y-4">
            <Skeleton className="h-12 w-3/4 mx-auto" />
            <Skeleton className="h-4 w-1/2 mx-auto" />
          </CardHeader>
          <CardContent className="space-y-6">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="grid grid-cols-2 gap-4">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
        <Card className="w-full max-w-md text-center p-8">
          <AlertCircle className="w-16 h-16 text-destructive mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-slate-900 mb-2">Akses Ditolak</h2>
          <p className="text-slate-500">Identifier aset tidak ditemukan dalam parameter permintaan.</p>
        </Card>
      </div>
    );
  }

  const galleryImages = [
    asset.photoURL,
    asset.photoURL2,
    asset.photoURL3,
    asset.photoURL4,
    asset.disposalPhotoURL1,
    asset.disposalPhotoURL2,
  ].filter((url): url is string => !!url && url.length > 0);

  const getStatusBadge = (status: AssetStatus) => {
    const s = status.toLowerCase();
    if (s.includes('disposal')) return { text: 'DISPOSED', color: 'bg-rose-600' };
    if (s.includes('mutasi')) return { text: 'MUTATED', color: 'bg-blue-600' };
    if (s.includes('repair') || s.includes('perbaikan')) return { text: 'MAINTENANCE', color: 'bg-amber-500' };
    return { text: 'VERIFIED', color: 'bg-emerald-600' };
  };

  const statusInfo = getStatusBadge(asset.status);
  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="min-h-screen bg-slate-100 py-12 px-4 flex justify-center items-start overflow-x-hidden">
      <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
        
        {/* Certificate Layout */}
        <Card className="bg-white border-none shadow-2xl rounded-[2.5rem] overflow-hidden relative">
          <div className="absolute top-0 left-0 w-full h-3 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
          
          <CardHeader className="pt-10 pb-6 px-8 sm:px-12 text-center border-b border-slate-50 bg-slate-50/30">
            <div className="flex flex-col items-center gap-4">
              <div className="flex items-center gap-3">
                <Image src="/cgi.png" alt="Logo" width={45} height={45} className="drop-shadow-sm" />
                <div className="text-left">
                  <h1 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tighter uppercase leading-none">Digital Verification Certificate</h1>
                  <p className="text-[10px] sm:text-xs font-bold text-slate-500 uppercase tracking-[0.3em] mt-1">PT. China Glaze Indonesia • Asset Management System</p>
                </div>
              </div>
            </div>
          </CardHeader>

          <CardContent className="p-8 sm:p-12 space-y-10">
            
            {/* Top Info Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              
              {/* Left Side: Visuals */}
              <div className="lg:col-span-5 space-y-6">
                <div className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-slate-50 shadow-inner bg-slate-100 group">
                  {activePhoto ? (
                    <Image src={activePhoto} alt={asset.name} fill className="object-cover transition-transform duration-700 group-hover:scale-110" />
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-slate-300">
                      <ImageIcon className="w-16 h-16 mb-2" />
                      <p className="text-xs font-bold uppercase tracking-widest">No Unit Photo</p>
                    </div>
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent pointer-events-none" />
                </div>

                {/* Status Stamp */}
                <div className="flex justify-center">
                  <div className={cn(
                    "px-6 py-1.5 rounded-lg border-4 border-white shadow-xl text-white font-black text-lg tracking-tighter transform -rotate-2 uppercase",
                    statusInfo.color
                  )}>
                    {statusInfo.text}
                  </div>
                </div>

                {/* Gallery Thumbnails */}
                {galleryImages.length > 1 && (
                  <div className="grid grid-cols-4 gap-2 px-2">
                    {galleryImages.slice(0, 4).map((url, i) => (
                      <button 
                        key={i} 
                        onClick={() => setActivePhoto(url)}
                        className={cn(
                          "relative aspect-square rounded-xl overflow-hidden border-2 transition-all",
                          activePhoto === url ? "border-blue-600 scale-95 shadow-md" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                      >
                        <Image src={url} alt={`Unit ${i+1}`} fill className="object-cover" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Right Side: Identity Data */}
              <div className="lg:col-span-7 space-y-8">
                <div>
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight leading-tight mb-1 uppercase">{asset.name}</h2>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="font-mono text-lg px-3 py-0.5 border-blue-200 bg-blue-50 text-blue-700 font-bold">{asset.code}</Badge>
                    {asset.transactionCode && <Badge className="bg-slate-900 text-white font-mono">{asset.transactionCode}</Badge>}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Layers className="w-3 h-3"/> Category</p>
                    <p className="font-bold text-slate-800">{asset.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><MapPin className="w-3 h-3"/> Location</p>
                    <p className="font-bold text-slate-800">{asset.location}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Hash className="w-3 h-3"/> Cost Center</p>
                    <p className="font-bold text-slate-800">{asset.costCenter || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-1.5"><Calendar className="w-3 h-3"/> Purchase Date</p>
                    <p className="font-bold text-slate-800">{asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMM yyyy') : '-'}</p>
                  </div>
                </div>

                {/* Verified Identity Table with QR */}
                <div className="rounded-2xl border border-slate-100 bg-slate-50/50 p-5 overflow-hidden relative">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-4 flex-1">
                      <h3 className="text-[11px] font-black text-blue-600 uppercase tracking-widest flex items-center gap-2"><ShieldCheck className="w-4 h-4"/> Verified Identity</h3>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs pb-1 border-b border-slate-200">
                          <span className="text-slate-500 font-medium">System Status</span>
                          <span className="font-bold text-emerald-600 flex items-center gap-1"><Check className="w-3 h-3"/> SECURE</span>
                        </div>
                        <div className="flex justify-between text-xs pb-1 border-b border-slate-200">
                          <span className="text-slate-500 font-medium">Audit Readiness</span>
                          <span className="font-bold text-slate-800">ISO 14064-3 COMPLIANT</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-slate-500 font-medium">Data Authenticity</span>
                          <span className="font-bold text-slate-800">100% VERIFIED</span>
                        </div>
                      </div>
                    </div>
                    <div className="shrink-0 p-2 bg-white rounded-xl border border-slate-100 shadow-sm">
                      {qrCodeUrl && <Image src={qrCodeUrl} alt="Auth QR" width={85} height={85} className="opacity-90" />}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Middle Section: Custodian & ISO */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              
              {/* Custodian Block */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <User className="w-4 h-4 text-blue-600" /> Custodian Identity
                </h3>
                <div className="p-5 rounded-[1.5rem] bg-gradient-to-br from-slate-900 to-slate-800 text-white shadow-xl relative overflow-hidden group">
                  <Building className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 group-hover:scale-110 transition-transform duration-500" />
                  <div className="relative z-10 space-y-3">
                    <div>
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Person in Charge</p>
                      <p className="text-lg font-bold tracking-tight">{asset.user || 'UNASSIGNED'}</p>
                    </div>
                    <div className="pt-2 border-t border-white/10">
                      <p className="text-[9px] font-black text-blue-400 uppercase tracking-[0.2em] mb-1">Management Unit</p>
                      <p className="text-sm font-medium opacity-90">{asset.location}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Technical ISO Specs */}
              <div className="space-y-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <Shield className="w-4 h-4 text-blue-600" /> Technical Spec (ISO 14064)
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{isAC ? 'Model/Type' : 'Spec 1'}</p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{asset.accessory1 || '-'}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{isAC ? 'Refrigerant' : 'Spec 2'}</p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{asset.accessory2 || '-'}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{isAC ? 'Volume (KG)' : 'Spec 3'}</p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{asset.accessory3 || '-'}</p>
                  </div>
                  <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <p className="text-[8px] font-black text-slate-400 uppercase mb-1">{isAC ? 'Power (kW)' : 'Spec 4'}</p>
                    <p className="text-[11px] font-bold text-slate-800 truncate">{asset.accessory4 || '-'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Bottom Section: Remarks/Log */}
            <div className="space-y-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText className="w-4 h-4 text-blue-600" /> System Remarks & Log
              </h3>
              <div className="p-6 rounded-[1.5rem] bg-slate-50 border-2 border-dashed border-slate-200 min-h-[100px] relative">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap italic font-medium">
                  {asset.notes || 'No additional system remarks recorded for this asset identity.'}
                </p>
              </div>
            </div>

          </CardContent>

          {/* Security Footer */}
          <div className="bg-slate-900 py-4 px-8 sm:px-12 flex flex-col sm:flex-row justify-between items-center gap-2">
            <div className="flex items-center gap-2 text-[10px] font-black text-blue-400 uppercase tracking-widest">
              <CheckCircle2 className="w-3.5 h-3.5" /> Verified by Asset_CGI Security System
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase">Verification Date: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')}</p>
          </div>
        </Card>

        {/* Support Text */}
        <div className="text-center space-y-2">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">© 2026 PT. China Glaze Indonesia • All Rights Reserved</p>
          <p className="text-[10px] text-slate-400 max-w-lg mx-auto">This is a system-generated document. The information presented is valid as per the central database record at the time of verification.</p>
        </div>
      </div>
    </div>
  );
}

const ImageIcon = ({ className }: { className?: string }) => (
  <svg className={className} xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
);

export default function AssetPublicPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
      <AssetPublicContent />
    </Suspense>
  );
}
