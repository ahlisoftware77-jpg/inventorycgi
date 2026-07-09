
'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { doc, getDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  Tag, 
  MapPin, 
  Layers, 
  Hash, 
  Calendar, 
  Info, 
  CheckCircle2, 
  AlertCircle,
  Package,
  Clock,
  ArrowLeft,
  Search
} from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Halaman verifikasi publik untuk aset perusahaan.
 * Memungkinkan pemindaian QR Code di lapangan tanpa perlu login.
 */

function PublicAssetContent({ assetId }: { assetId: string }) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [footerText, setPublicFooter] = useState('© 2026 PT. China Glaze Indonesia. Seluruh hak cipta dilindungi undang-undang.');

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        // Fetch Asset
        const docRef = doc(db, 'assets', assetId);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          setAsset({ id: docSnap.id, ...docSnap.data() } as Asset);
        } else {
          setError('Aset tidak terdaftar dalam database resmi kami.');
        }

        // Fetch General Settings for Footer
        const settingsRef = doc(db, 'settings', 'general');
        const settingsSnap = await getDoc(settingsRef);
        if (settingsSnap.exists()) {
          setPublicFooter(settingsSnap.data().publicFooter || footerText);
        }
      } catch (err) {
        console.error("Verification error:", err);
        setError('Gagal memverifikasi data. Mohon periksa koneksi internet Anda.');
      } finally {
        setLoading(false);
      }
    }

    if (assetId) fetchData();
  }, [assetId, footerText]);

  if (loading) {
    return (
      <div className="max-w-lg mx-auto space-y-6">
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-[500px] w-full rounded-3xl" />
      </div>
    );
  }

  if (error || !asset) {
    return (
      <div className="max-w-lg mx-auto text-center space-y-6 px-4">
        <div className="p-8 bg-destructive/5 rounded-full inline-block mb-4">
          <AlertCircle className="w-16 h-16 text-destructive animate-bounce" />
        </div>
        <h1 className="text-3xl font-black text-slate-900 tracking-tighter">VERIFIKASI GAGAL</h1>
        <p className="text-slate-500 font-medium leading-relaxed">{error || 'Data aset tidak ditemukan.'}</p>
        <div className="pt-8">
          <Link href="/login">
            <Button variant="outline" className="rounded-full px-8 border-primary/20 text-primary">
              <ArrowLeft className="w-4 h-4 mr-2" /> Kembali ke Portal Utama
            </Button>
          </Link>
        </div>
      </div>
    );
  }

  const isDisposed = asset.status === 'approved_disposal';
  const isDamaged = asset.condition === 'Rusak';
  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="max-w-2xl mx-auto px-4 pb-12 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      {/* Official Badge Header */}
      <div className="flex flex-col items-center mb-8">
        <div className="bg-white p-4 rounded-full shadow-xl border-4 border-slate-50 mb-4">
          <Image src="/cgi.png" alt="CGI Logo" width={60} height={60} />
        </div>
        <div className="flex items-center gap-2 bg-emerald-500 text-white px-4 py-1.5 rounded-full text-xs font-black tracking-[0.2em] shadow-lg shadow-emerald-500/20 uppercase">
          <ShieldCheck className="w-4 h-4" />
          Verified Identity
        </div>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.14)] rounded-[2.5rem] overflow-hidden bg-white relative">
        {/* Disposed Overlay Watermark */}
        {isDisposed && (
          <div className="absolute inset-0 z-20 flex items-center justify-center pointer-events-none opacity-10 rotate-12">
            <div className="border-[12px] border-red-600 rounded-2xl p-8">
              <span className="text-8xl font-black text-red-600 uppercase tracking-tighter">VOID</span>
            </div>
          </div>
        )}

        <div className="h-3 bg-gradient-to-r from-blue-600 via-primary to-purple-600" />
        
        <CardContent className="p-8 md:p-12 space-y-10">
          {/* Main Title & Code */}
          <div className="text-center space-y-2">
            <h2 className="text-3xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight uppercase">
              {asset.name}
            </h2>
            <div className="flex items-center justify-center gap-3">
              <code className="text-lg font-mono font-bold text-primary bg-primary/5 px-3 py-1 rounded-lg">
                {asset.code}
              </code>
              <Badge variant={isDisposed ? "destructive" : "default"} className="font-black tracking-tighter rounded-full">
                {asset.status.replace(/_/g, ' ')}
              </Badge>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <VerificationDetail label="Lokasi Unit" value={asset.location} icon={MapPin} />
            <VerificationDetail label="Kategori" value={asset.category} icon={Layers} />
            <VerificationDetail label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
            <VerificationDetail label="Kondisi" value={asset.condition} icon={isDamaged ? AlertCircle : CheckCircle2} valueClassName={isDamaged ? "text-destructive" : "text-emerald-600"} />
            <VerificationDetail label="Penanggung Jawab" value={asset.user} icon={Package} />
            <VerificationDetail label="Tgl Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'd MMMM yyyy', { locale: id }) : '-'} icon={Calendar} />
          </div>

          {/* Technical Specs Block */}
          <div className="bg-slate-50 rounded-3xl p-6 border border-slate-100 shadow-inner">
            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
              <Info className="w-3 h-3" /> Rincian Teknis Verifikasi
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">{isAC ? "Model | Tipe Unit" : "Model (S/N)"}</p>
                <p className="text-sm font-black text-slate-800">{asset.accessory1 || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">{isAC ? "Bahan Bakar/Ref" : "Energi/Ref"}</p>
                <p className="text-sm font-black text-slate-800">{asset.accessory2 || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">{isAC ? "Volume Ref (KG)" : "Volume/Cap"}</p>
                <p className="text-sm font-black text-slate-800">{asset.accessory3 || '-'}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] font-bold text-slate-500 uppercase">{isAC ? "Daya (kW)" : "Power/Lainnya"}</p>
                <p className="text-sm font-black text-slate-800">{asset.accessory4 || '-'}</p>
              </div>
            </div>
          </div>

          {/* Verification Log */}
          <div className="pt-6 border-t border-slate-100">
            <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-widest">
              <span className="flex items-center gap-1.5"><Clock className="w-3 h-3" /> Terakhir Diverifikasi</span>
              <span>{format(new Date(), 'dd/MM/yyyy HH:mm')}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Trust Footer */}
      <footer className="mt-12 text-center space-y-4">
        <p className="text-[10px] md:text-xs text-slate-400 font-medium px-8 leading-relaxed max-w-sm mx-auto">
          {footerText}
        </p>
        <div className="flex justify-center gap-4">
          <Link href="/login" className="text-[10px] font-black text-primary uppercase tracking-widest hover:underline">
            Staff Portal Login
          </Link>
        </div>
      </footer>
    </div>
  );
}

function VerificationDetail({ label, value, icon: Icon, valueClassName }: { label: string, value: string | undefined, icon: any, valueClassName?: string }) {
  return (
    <div className="flex flex-col gap-1.5 p-4 rounded-2xl border border-slate-50 hover:border-primary/10 transition-colors">
      <div className="flex items-center gap-2 opacity-50">
        <Icon className="w-3.5 h-3.5" />
        <span className="text-[9px] font-black uppercase tracking-widest">{label}</span>
      </div>
      <span className={cn("text-sm md:text-base font-bold text-slate-900 truncate", valueClassName)} title={value}>
        {value || '-'}
      </span>
    </div>
  );
}

export default function PublicAssetPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ assetId?: string }> 
}) {
  const params = use(searchParams);
  const assetId = params.assetId;

  return (
    <div className="min-h-screen bg-slate-50 py-12 md:py-24 font-body selection:bg-primary/10">
      <Suspense fallback={<div className="flex items-center justify-center h-screen"><Loader2 className="w-10 h-10 animate-spin text-primary" /></div>}>
        {assetId ? (
          <PublicAssetContent assetId={assetId} />
        ) : (
          <div className="text-center p-8 max-w-md mx-auto space-y-4">
            <div className="bg-amber-100 p-4 rounded-full inline-block text-amber-600 mb-2">
              <Search className="w-12 h-12" />
            </div>
            <h1 className="text-2xl font-bold">Menunggu Data...</h1>
            <p className="text-slate-500">Mohon pindai kembali QR Code resmi dari aset perusahaan untuk melakukan verifikasi identitas.</p>
          </div>
        )}
      </Suspense>
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
