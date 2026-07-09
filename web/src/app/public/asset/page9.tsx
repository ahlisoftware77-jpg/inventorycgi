'use client';

import { useState, useEffect, use, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  MapPin, 
  User, 
  Hash, 
  Layers, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  Tag, 
  Calendar,
  ExternalLink,
  ChevronRight,
  FileText,
  Clock
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import QRCode from 'qrcode';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Portal Verifikasi Publik yang Kaya Informasi.
 * Menampilkan sertifikat digital aset dengan galeri interaktif dan QR Code internal.
 */

const DetailRow = ({ label, value, icon: Icon, className }: { label: string; value: string; icon?: any; className?: string }) => (
  <tr className={cn("border-b border-slate-100 last:border-0", className)}>
    <td className="py-2.5 px-3 text-[10px] font-black uppercase tracking-widest text-slate-400 w-1/3">
      <div className="flex items-center gap-1.5">
        {Icon && <Icon className="w-3 h-3 text-primary/50" />}
        {label}
      </div>
    </td>
    <td className="py-2.5 px-3 text-xs font-bold text-slate-900">{value || '-'}</td>
  </tr>
);

const StatusStamp = ({ status }: { status: AssetStatus }) => {
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
            "relative inline-block px-4 py-1.5 text-lg font-black border-4 rounded-md shadow-sm transform rotate-[-12deg] uppercase tracking-tighter opacity-80",
            color
        )}>
            {text}
        </div>
    );
};

export default function AssetPublicPage({ searchParams }: { searchParams: Promise<{ assetId?: string }> }) {
  const params = use(searchParams);
  const assetId = params.assetId;
  
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [activeImage, setActiveImage] = useState<string | null>(null);
  const [lastVerified, setLastVerified] = useState<string>('');

  const allImages = useMemo(() => {
    if (!asset) return [];
    return [
        asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4,
        asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4
    ].filter((url): url is string => !!url && url.length > 0);
  }, [asset]);

  useEffect(() => {
    if (!assetId) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'assets', assetId), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);
        setActiveImage(data.photoURL || null);
        setLastVerified(format(new Date(), "d MMM yyyy, HH:mm", { locale: id }));
        
        const publicUrl = window.location.href;
        const qr = await QRCode.toDataURL(publicUrl, { margin: 1, scale: 4, errorCorrectionLevel: 'H' });
        setQrCodeUrl(qr);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [assetId]);

  if (!assetId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-6 text-center">
        <Card className="max-w-md p-8">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Unauthorized Access</h1>
          <p className="text-muted-foreground text-sm">Identifier aset tidak ditemukan dalam parameter permintaan.</p>
        </Card>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Skeleton className="w-full max-w-lg h-[600px] rounded-3xl" />
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="max-w-md p-8 text-center">
          <AlertCircle className="w-12 h-12 text-destructive mx-auto mb-4" />
          <h1 className="text-xl font-bold mb-2">Aset Tidak Ditemukan</h1>
          <p className="text-muted-foreground text-sm">Data aset mungkin telah dihapus atau ID tidak valid.</p>
        </Card>
      </div>
    );
  }

  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="min-h-screen bg-[#f8fafc] py-10 px-4 md:px-6">
      <div className="max-w-xl mx-auto space-y-6">
        
        {/* CERTIFICATE CARD */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] rounded-[2.5rem] overflow-hidden bg-white relative">
          {/* HEADER DECOR */}
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600"></div>
          
          <CardContent className="p-0">
            {/* CORPORATE HEADER */}
            <div className="p-8 pb-4 text-center border-b border-slate-50">
              <div className="flex justify-center mb-4">
                <div className="p-3 rounded-2xl bg-slate-50 shadow-inner">
                  <Image src="/cgi.png" alt="PT. CGI" width={48} height={48} />
                </div>
              </div>
              <h1 className="text-lg font-black tracking-tighter text-slate-900 uppercase">Verification Certificate</h1>
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mt-1">PT. China Glaze Indonesia</p>
            </div>

            {/* INTERACTIVE GALLERY */}
            <div className="p-6">
              <div className="relative aspect-square rounded-3xl overflow-hidden bg-slate-100 border-4 border-white shadow-xl group">
                {activeImage ? (
                  <Image src={activeImage} alt={asset.name} fill className="object-cover transition-transform duration-700 group-hover:scale-105" />
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-300">
                    <Tag className="w-16 h-12 opacity-20" />
                  </div>
                )}
                
                {/* FLOATING BADGE */}
                <div className="absolute top-4 left-4">
                  <Badge className="bg-white/90 backdrop-blur-md text-slate-900 font-black text-[10px] border-none px-3 py-1 shadow-sm uppercase tracking-tighter">
                    Official Identity
                  </Badge>
                </div>
              </div>

              {/* THUMBNAILS */}
              {allImages.length > 1 && (
                <div className="flex gap-2.5 mt-4 overflow-x-auto pb-2 scrollbar-none">
                  {allImages.map((img, i) => (
                    <button 
                      key={i} 
                      onClick={() => setActiveImage(img)}
                      className={cn(
                        "relative w-14 h-14 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all",
                        activeImage === img ? "border-primary scale-95" : "border-transparent opacity-60 grayscale hover:opacity-100 hover:grayscale-0"
                      )}
                    >
                      <Image src={img} alt={`Thumb ${i}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {/* STRATEGIC STATUS STAMP */}
              <div className="flex justify-center py-6">
                <StatusStamp status={asset.status} />
              </div>
            </div>

            {/* VERIFIED IDENTITY TABLE */}
            <div className="px-8 pb-8 space-y-6">
              <div className="rounded-2xl border border-slate-100 bg-slate-50/30 overflow-hidden">
                <div className="bg-slate-900 px-4 py-2 flex justify-between items-center">
                  <span className="text-[9px] font-black text-white uppercase tracking-widest flex items-center gap-2">
                    <ShieldCheck className="w-3.5 h-3.5 text-blue-400" /> Verified Identity
                  </span>
                  <span className="text-[8px] text-slate-400 font-mono">HASH: {asset.id.substring(0, 12)}...</span>
                </div>
                <table className="w-full">
                  <tbody>
                    <DetailRow label="Asset Name" value={asset.name} icon={Tag} />
                    <DetailRow label="Asset Code" value={asset.code} icon={Hash} className="bg-blue-50/30" />
                    <DetailRow label="Category" value={asset.category} icon={Layers} />
                    <DetailRow label="Department" value={asset.location} icon={MapPin} />
                    <DetailRow label="Cost Center" value={asset.costCenter || 'N/A'} icon={Hash} />
                    <tr>
                      <td colSpan={2} className="p-4 flex flex-col items-center justify-center border-t border-slate-100 bg-white/50">
                        <div className="p-2 border-2 border-slate-100 rounded-2xl bg-white shadow-sm mb-2">
                          {qrCodeUrl && <Image src={qrCodeUrl} alt="Authentication QR" width={120} height={120} />}
                        </div>
                        <p className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Internal Auth Code</p>
                      </td>
                    </tr>
                  </tbody>
                </table>
              </div>

              {/* CUSTODIAN BLOCK */}
              <div className="p-5 rounded-2xl border-2 border-dashed border-slate-200 bg-slate-50/50">
                <div className="flex items-center gap-3 mb-3">
                  <div className="p-2 rounded-lg bg-white shadow-sm">
                    <User className="w-4 h-4 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Custodian Identity</h3>
                    <p className="text-sm font-bold text-slate-900 leading-none mt-0.5">{asset.user || 'Corporate Asset'}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4 pt-3 border-t border-slate-200/50">
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Acquisition</p>
                    <p className="text-[10px] font-bold text-slate-700">{asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMM yyyy') : '-'}</p>
                  </div>
                  <div>
                    <p className="text-[8px] font-black text-slate-400 uppercase">Compliance</p>
                    <p className="text-[10px] font-bold text-slate-700">ISO 14064-3:2019</p>
                  </div>
                </div>
              </div>

              {/* ISO SPECS GRID */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-4 rounded-2xl bg-blue-600 text-white shadow-lg shadow-blue-200">
                  <p className="text-[8px] font-black uppercase opacity-70 mb-1">Technical Model</p>
                  <p className="text-xs font-bold truncate">{asset.accessory1 || '-'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Resource Type</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{asset.accessory2 || '-'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Technical Load</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{asset.accessory3 || '-'}</p>
                </div>
                <div className="p-4 rounded-2xl bg-white border border-slate-100 shadow-sm">
                  <p className="text-[8px] font-black text-slate-400 uppercase mb-1">Performance</p>
                  <p className="text-xs font-bold text-slate-900 truncate">{asset.accessory4 || '-'}</p>
                </div>
              </div>

              {/* SYSTEM REMARKS */}
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <FileText className="w-3.5 h-3.5 text-slate-400" />
                  <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">System Remarks / Logs</h3>
                </div>
                <div className="p-4 rounded-2xl bg-slate-100/50 border border-slate-200/50 italic text-[11px] text-slate-600 leading-relaxed max-h-32 overflow-y-auto scrollbar-thin">
                  {asset.notes || 'No technical logs recorded for this asset identity.'}
                </div>
              </div>

              {/* FULL VIEW REDIRECT */}
              <Button asChild className="w-full h-14 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white font-black text-xs uppercase tracking-widest shadow-xl group transition-all">
                <Link href={`/assets/id?assetId=${assetId}`}>
                  Full view
                  <ChevronRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
            </div>

            {/* SECURITY FOOTER */}
            <div className="bg-slate-50 p-6 text-center border-t border-slate-100">
              <div className="flex items-center justify-center gap-2 mb-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span className="text-[9px] font-black text-slate-900 uppercase tracking-widest">Verified by Asset_CGI Security System</span>
              </div>
              <p className="text-[8px] text-slate-400 leading-relaxed font-medium uppercase tracking-tighter">
                Verification Timestamp: {lastVerified}<br/>
                Digital authenticity guaranteed by central database verification protocols.<br/>
                &copy; {new Date().getFullYear()} PT. China Glaze Indonesia
              </p>
            </div>
          </CardContent>
        </Card>

        {/* EXTERNAL LINK INFO */}
        <div className="px-4 text-center">
          <p className="text-[10px] text-slate-400 font-medium leading-relaxed">
            Scan the QR label on the asset to verify its digital certificate.<br/>
            Contact IT Administrator if data mismatch occurs.
          </p>
        </div>
      </div>
    </div>
  );
}
