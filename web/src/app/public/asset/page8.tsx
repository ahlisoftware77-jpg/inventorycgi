
'use client';

import { useState, useEffect, use } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  ShieldCheck, 
  MapPin, 
  User, 
  Layers, 
  Hash, 
  Calendar, 
  Info, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRightLeft,
  Loader2,
  FileText,
  Clock,
  ExternalLink,
  ChevronRight
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

const DetailRow = ({ label, value, icon: Icon }: { label: string; value: React.ReactNode; icon: any }) => (
  <div className="flex flex-col gap-1 p-3 rounded-xl border border-slate-100 bg-slate-50/50 hover:border-primary/20 transition-all group">
    <div className="flex items-center gap-1.5 opacity-60 group-hover:opacity-100">
      <Icon className="w-3.5 h-3.5 text-primary" />
      <div className="text-[10px] font-black uppercase tracking-widest text-slate-500">{label}</div>
    </div>
    <div className="text-sm font-bold text-slate-900 leading-tight break-words">{value || '-'}</div>
  </div>
);

const getStamp = (status: AssetStatus) => {
    let text = '';
    let colorClass = '';

    if (status === 'Aktif' || status.includes('creation')) {
        text = 'VERIFIED';
        colorClass = 'bg-emerald-600';
    } else if (status === 'approved_disposal') {
        text = 'DISPOSED';
        colorClass = 'bg-rose-600';
    } else if (status === 'approved_mutasi') {
        text = 'MUTATED';
        colorClass = 'bg-blue-600';
    } else if (status.includes('Repair') || status.includes('Rusak')) {
        text = 'MAINTENANCE';
        colorClass = 'bg-amber-500';
    } else { return null; }

    return (
        <div className={cn(
            "relative inline-flex items-center justify-center px-6 py-1.5 text-xl font-black text-white border-4 border-white rounded-md shadow-xl transform rotate-[-12deg] uppercase tracking-tighter select-none",
            colorClass
        )}>
            {text}
        </div>
    );
};

function AssetPublicContent({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeImage, setActiveImage] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'assets', assetId), (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);
        setActiveImage(data.photoURL || null);
      }
      setLoading(false);
    });
    return () => unsub();
  }, [assetId]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
        <Loader2 className="w-12 h-12 animate-spin text-primary opacity-20" />
        <p className="text-muted-foreground font-black tracking-widest uppercase text-[10px]">Memverifikasi Identitas Aset...</p>
      </div>
    );
  }

  if (!asset) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center p-6">
        <div className="bg-rose-50 p-6 rounded-full">
            <AlertCircle className="w-16 h-16 text-rose-500" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight">Data Tidak Ditemukan</h2>
            <p className="text-muted-foreground max-w-xs mx-auto">ID Aset tidak valid atau data telah dihapus dari sistem keamanan kami.</p>
        </div>
        <Button variant="outline" onClick={() => window.location.href = '/'} className="rounded-full px-8">Ke Halaman Utama</Button>
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
    asset.disposalPhotoURL3,
    asset.disposalPhotoURL4,
  ].filter((url): url is string => !!url && url.length > 0);

  const isAC = asset.name.toLowerCase().includes('ac') || asset.name.toLowerCase().includes('air conditioner') || asset.category === 'Elektronik';

  return (
    <div className="space-y-8 animate-in fade-in zoom-in duration-500">
      {/* interactive Gallery Section */}
      <section className="relative rounded-3xl overflow-hidden shadow-2xl border-8 border-white bg-slate-100">
        <div className="relative aspect-[16/10] sm:aspect-video w-full bg-slate-900 flex items-center justify-center overflow-hidden">
            {activeImage ? (
                <Image src={activeImage} alt="Asset Main" fill className="object-contain" priority />
            ) : (
                <div className="flex flex-col items-center text-slate-500 gap-2">
                    <Info className="w-12 h-12" />
                    <p className="font-bold text-xs uppercase">No Photo Available</p>
                </div>
            )}
            
            {/* Stamp Overlay */}
            <div className="absolute bottom-6 right-6 z-20">
                {getStamp(asset.status)}
            </div>
        </div>

        {/* Thumbnails */}
        {galleryImages.length > 1 && (
            <div className="p-4 bg-white/80 backdrop-blur-md border-t flex gap-3 overflow-x-auto scrollbar-hide">
                {galleryImages.map((img, idx) => (
                    <button 
                        key={idx} 
                        onClick={() => setActiveImage(img)}
                        className={cn(
                            "relative w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden border-4 transition-all shrink-0",
                            activeImage === img ? "border-primary shadow-lg scale-105" : "border-transparent opacity-60 hover:opacity-100"
                        )}
                    >
                        <Image src={img} alt={`Thumb ${idx}`} fill className="object-cover" />
                    </button>
                ))}
            </div>
        )}
      </section>

      {/* Main Info Card */}
      <Card className="border-none shadow-2xl overflow-hidden rounded-3xl">
        <div className="bg-primary p-6 md:p-8 text-white">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <Badge variant="outline" className="text-[10px] font-black uppercase tracking-[0.2em] bg-white/10 text-white border-white/20 mb-2">Verified Identity</Badge>
                    <h1 className="text-2xl md:text-4xl font-black tracking-tighter uppercase leading-none">{asset.name}</h1>
                    <p className="text-primary-foreground/80 font-mono font-bold mt-2 flex items-center gap-2">
                        <Hash className="w-4 h-4" /> {asset.code}
                    </p>
                </div>
                <div className="p-3 bg-white rounded-2xl shadow-xl hidden md:block">
                    <Image src="/cgi.png" alt="Logo" width={40} height={40} />
                </div>
            </div>
        </div>

        <CardContent className="p-6 md:p-8 space-y-8 bg-white">
            {/* Grid Data */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="col-span-full border-b pb-2 mb-2 flex items-center gap-2">
                    <Info className="w-4 h-4 text-primary" />
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Spesifikasi Identitas</h3>
                </div>
                <DetailRow label="Kategori" value={asset.category} icon={Layers} />
                <DetailRow label="Lokasi Unit" value={asset.location} icon={MapPin} />
                <DetailRow label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
                <DetailRow label="Brand / Merek" value={asset.brand} icon={ShieldCheck} />
                <DetailRow label="Tgl Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMMM yyyy', { locale: id }) : '-'} icon={Calendar} />
                <DetailRow label="Status Sistem" value={asset.status.replace(/_/g, ' ')} icon={Clock} />
                <DetailRow label="Kondisi Fisik" value={asset.condition} icon={Info} />
                <DetailRow label="Unit" value={`${asset.qty} Item`} icon={Layers} />
            </div>

            {/* Custodian Identity Block */}
            <div className="p-6 rounded-2xl bg-slate-900 text-white relative overflow-hidden group">
                <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:rotate-12 transition-transform duration-700">
                    <User className="w-40 h-40" />
                </div>
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <ShieldCheck className="w-5 h-5 text-emerald-400" />
                            <h3 className="text-sm font-black uppercase tracking-widest">Custodian Identity</h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mb-1">Penanggung Jawab Utama</p>
                                <p className="text-xl font-bold">{asset.user || 'UNASSIGNED'}</p>
                            </div>
                            <div>
                                <p className="text-[10px] text-slate-400 uppercase font-black tracking-tighter mb-1">Departemen Operasional</p>
                                <p className="text-xl font-bold">{asset.location}</p>
                            </div>
                        </div>
                    </div>
                    <div className="hidden lg:block text-right">
                        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Digital Auth ID</p>
                        <p className="text-xs font-mono opacity-50">{asset.id}</p>
                    </div>
                </div>
            </div>

            {/* ISO 14064 Section */}
            <div className="p-6 rounded-2xl border-2 border-dashed border-primary/20 bg-primary/5">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-2 text-primary">
                        <ShieldCheck className="w-5 h-5" />
                        <h3 className="text-sm font-black uppercase tracking-widest">Rincian Teknis ISO 14064</h3>
                    </div>
                    <Badge className="bg-primary/10 text-primary border-primary/20">Standard Verifier</Badge>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{isAC ? "Model | Tipe Unit" : "Model / SN"}</p>
                        <p className="text-sm font-bold text-slate-800">{asset.accessory1 || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{isAC ? "Jenis refrigeran" : "Tipe Jenis"}</p>
                        <p className="text-sm font-bold text-slate-800">{asset.accessory2 || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{isAC ? "Volume (KG)" : "Bahan Bakar"}</p>
                        <p className="text-sm font-bold text-slate-800">{asset.accessory3 || '-'}</p>
                    </div>
                    <div className="space-y-1">
                        <p className="text-[9px] font-black text-slate-400 uppercase">{isAC ? "kW" : "Volume/Cap"}</p>
                        <p className="text-sm font-bold text-slate-800">{asset.accessory4 || '-'}</p>
                    </div>
                </div>
            </div>

            {/* System Notes / Handover Details */}
            {asset.notes && (
                <div className="space-y-3">
                    <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <div className="w-1 h-1 bg-slate-400 rounded-full" /> Keterangan & Riwayat Serah Terima
                    </div>
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-100 text-sm text-slate-600 leading-relaxed font-medium italic whitespace-pre-wrap">
                        {asset.notes}
                    </div>
                </div>
            )}
        </CardContent>

        {/* Security Footer */}
        <div className="bg-slate-900 p-4 border-t border-white/5">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4 text-center sm:text-left">
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    <p className="text-[10px] font-black text-white tracking-widest uppercase">Secured by Asset_CGI Verification System</p>
                </div>
                <div className="text-[9px] text-slate-500 font-bold uppercase tracking-tighter">
                    Verified on: {format(new Date(), 'dd/MM/yyyy HH:mm:ss')} • Valid Database Entry
                </div>
            </div>
        </div>
      </Card>
    </div>
  );
}

export default function AssetPublicPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ assetId?: string }> 
}) {
  const params = use(searchParams);
  const assetId = params.assetId;

  return (
    <div className="min-h-screen bg-[#f8fafc] p-4 md:p-12 selection:bg-primary/10">
      <div className="max-w-5xl mx-auto">
        <header className="mb-12 text-center space-y-2">
            <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-sm border mb-4">
                <Image src="/cgi.png" alt="CGI" width={24} height={24} />
                <span className="font-black tracking-tighter text-sm">PT. China Glaze Indonesia</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-slate-900 uppercase">Sertifikat Verifikasi Aset</h1>
            <p className="text-slate-500 font-bold text-sm md:text-base uppercase tracking-widest">Portal Validasi Identitas & Status Inventaris Perusahaan</p>
        </header>

        {assetId ? (
            <AssetPublicContent assetId={assetId} />
        ) : (
            <Card className="p-12 text-center rounded-3xl shadow-xl border-none">
                <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Hash className="w-10 h-10 text-slate-300" />
                </div>
                <h3 className="text-xl font-black mb-2">Scan QR Code Diperlukan</h3>
                <p className="text-muted-foreground mb-8">Mohon pindai label QR resmi pada fisik aset untuk mengakses halaman verifikasi ini.</p>
                <Button asChild className="rounded-full px-8 h-12 font-black shadow-lg">
                    <a href="/scan">Buka Scanner Sekarang <ChevronRight className="ml-2 w-4 h-4" /></a>
                </Button>
            </Card>
        )}

        <footer className="mt-20 pb-12 text-center border-t pt-8 border-slate-200">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">© 2026 PT. China Glaze Indonesia • Departemen IT & GA</p>
            <div className="flex justify-center gap-6 mt-4">
                <Badge variant="outline" className="text-[8px] font-bold border-slate-200 text-slate-400">ISO 14064-3:2019</Badge>
                <Badge variant="outline" className="text-[8px] font-bold border-slate-200 text-slate-400">Standard HSE Verifier</Badge>
            </div>
        </footer>
      </div>
    </div>
  );
}
