'use client';

import { useState, useEffect, Suspense, use } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ShieldCheck, 
  MapPin, 
  Tag, 
  Hash, 
  Info, 
  Activity, 
  ClipboardList, 
  Calendar, 
  User,
  ImageIcon,
  Handshake,
  CheckCircle2,
  Building,
  Layers,
  Box
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { cn } from '@/lib/utils';

/**
 * @fileOverview Halaman Verifikasi Aset Publik yang Elegan.
 * Menampilkan rincian identitas, status, kondisi, dan galeri dokumentasi lengkap.
 */

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

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <Skeleton className="h-64 w-full rounded-3xl" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
          <Skeleton className="h-32 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!asset) {
    return (
      <Card className="max-w-md mx-auto mt-20 border-none shadow-2xl bg-white/80 backdrop-blur-md rounded-[2.5rem]">
        <CardContent className="p-12 text-center space-y-4">
          <div className="bg-rose-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Info className="h-10 w-10 text-rose-500" />
          </div>
          <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Data Tidak Ditemukan</h2>
          <p className="text-slate-500 font-medium">Barcode atau tautan yang Anda pindai tidak terdaftar dalam sistem resmi kami.</p>
        </CardContent>
      </Card>
    );
  }

  const assetPhotos = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter(Boolean) as string[];
  const handoverPhotos = [asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4].filter(Boolean) as string[];

  const isAC = asset.name.toLowerCase().includes('ac') || asset.category === 'Elektronik';

  return (
    <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
      {/* Header "Certificate of Authenticity" */}
      <Card className="border-none shadow-2xl bg-white/90 backdrop-blur-xl rounded-[3rem] overflow-hidden relative">
        <div className="absolute top-0 right-0 p-12 opacity-[0.03] pointer-events-none">
          <Image src="/cgi.png" alt="Logo Watermark" width={300} height={300} />
        </div>
        
        <div className="bg-slate-900 px-8 py-10 text-white relative">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div className="space-y-2">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary rounded-xl">
                  <ShieldCheck className="h-6 w-6 text-white" />
                </div>
                <Badge className="bg-emerald-500/20 text-emerald-400 border-none font-black text-[10px] uppercase tracking-widest">Verified by System</Badge>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black tracking-tighter uppercase leading-none mt-2">{asset.name}</h1>
              <p className="text-primary font-mono font-bold tracking-[0.2em] text-sm sm:text-base">{asset.code}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 text-center min-w-[140px]">
              <p className="text-[10px] font-black text-white/50 uppercase tracking-widest mb-1">Tanggal Input</p>
              <p className="text-lg font-black">{asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd/MM/yyyy') : '-'}</p>
            </div>
          </div>
        </div>

        {/* Highlight Panel: Status, Kondisi, Cost Center */}
        <div className="p-8 border-b bg-slate-50/50">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-blue-50 rounded-xl"><Activity className="h-6 w-6 text-blue-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Status Sistem</p>
                <p className="text-sm font-black text-slate-900 uppercase">{asset.status.replace(/_/g, ' ')}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-emerald-50 rounded-xl"><ClipboardList className="h-6 w-6 text-emerald-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Kondisi Fisik</p>
                <p className="text-sm font-black text-slate-900 uppercase">{asset.condition}</p>
              </div>
            </div>
            <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-100 flex items-center gap-4">
              <div className="p-3 bg-indigo-50 rounded-xl"><Hash className="h-6 w-6 text-indigo-600" /></div>
              <div>
                <p className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Pusat Biaya</p>
                <p className="text-sm font-black text-slate-900 uppercase">{asset.costCenter || '-'}</p>
              </div>
            </div>
          </div>
        </div>

        <CardContent className="p-8 sm:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            {/* Column 1: Details */}
            <div className="space-y-8">
              <section>
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Info className="h-4 w-4" /> Informasi Identitas
                </h3>
                <div className="grid grid-cols-2 gap-y-6 gap-x-4">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Kategori</p>
                    <p className="text-sm font-bold text-slate-800">{asset.category}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Lokasi Unit</p>
                    <p className="text-sm font-bold text-slate-800">{asset.location}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Merek / Brand</p>
                    <p className="text-sm font-bold text-slate-800">{asset.brand || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Penanggung Jawab</p>
                    <p className="text-sm font-bold text-slate-800">{asset.user || '-'}</p>
                  </div>
                </div>
              </section>

              <section className="p-6 rounded-[2rem] bg-slate-50 border border-slate-100 shadow-inner">
                <h3 className="text-xs font-black text-primary uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Layers className="h-4 w-4" /> Technical Passport (ISO 14064)
                </h3>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAC ? "Model / Tipe" : "Spek 1"}</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{asset.accessory1 || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAC ? "Refrigeran" : "Spek 2"}</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{asset.accessory2 || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAC ? "Volume (KG)" : "Spek 3"}</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{asset.accessory3 || '-'}</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{isAC ? "Power (kW)" : "Spek 4"}</p>
                    <p className="text-xs font-black text-slate-900 uppercase">{asset.accessory4 || '-'}</p>
                  </div>
                </div>
              </section>
            </div>

            {/* Column 2: Verifikasi & Audit */}
            <div className="space-y-8">
              <section className="p-8 rounded-[2.5rem] bg-indigo-50/50 border border-indigo-100">
                <h3 className="text-[10px] font-black text-indigo-600 uppercase tracking-[0.3em] mb-6 flex items-center gap-2">
                  <Box className="h-4 w-4" /> Audit Log Verifier
                </h3>
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-3 border-b border-indigo-100">
                    <span className="text-xs font-bold text-slate-500">Nomor PR</span>
                    <span className="text-xs font-black text-indigo-700">{asset.prNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center pb-3 border-b border-indigo-100">
                    <span className="text-xs font-bold text-slate-500">No. Inspeksi Internal</span>
                    <span className="text-xs font-black text-indigo-700">{asset.inspectionNumber || '-'}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-bold text-slate-500">Kode Transaksi Terakhir</span>
                    <span className="text-xs font-black text-indigo-700">{asset.transactionCode || '-'}</span>
                  </div>
                </div>
              </section>

              <div className="p-6 rounded-3xl bg-amber-50 border border-amber-100 flex gap-4 items-start">
                <div className="p-2 bg-amber-500 rounded-lg text-white shrink-0 shadow-lg shadow-amber-500/20">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Jaminan Keaslian</p>
                  <p className="text-xs font-medium text-amber-900 leading-relaxed mt-1">Seluruh data yang ditampilkan diambil langsung dari database pusat PT. China Glaze Indonesia secara real-time.</p>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Gallery Section */}
          <div className="mt-16 space-y-12">
            {/* Asset Condition Gallery */}
            <section>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                <ImageIcon className="h-5 w-5 text-primary" /> Galeri Kondisi Aset Fisik
              </h3>
              {assetPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {assetPhotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in group">
                      <Image src={url} alt={`Aset ${idx + 1}`} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <ImageIcon className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Foto Aset</p>
                </div>
              )}
            </section>

            {/* Handover & Evidence Gallery */}
            <section>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest mb-6 flex items-center gap-3">
                <Handshake className="h-5 w-5 text-emerald-600" /> Dokumentasi Serah Terima & Bukti
              </h3>
              {handoverPhotos.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {handoverPhotos.map((url, idx) => (
                    <div key={idx} className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white shadow-xl hover:scale-[1.02] transition-transform duration-500 cursor-zoom-in group">
                      <Image src={url} alt={`Handover ${idx + 1}`} fill className="object-cover" />
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <div className="absolute bottom-4 left-4">
                        <Badge className="bg-emerald-600 text-white border-none font-black text-[8px] uppercase">Bukti Audit</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-40 rounded-[2rem] bg-slate-50 border-2 border-dashed border-slate-200 flex flex-col items-center justify-center text-slate-400">
                  <Handshake className="h-10 w-10 mb-2 opacity-20" />
                  <p className="text-[10px] font-black uppercase tracking-widest">Belum Ada Foto Bukti</p>
                </div>
              )}
            </section>
          </div>
        </CardContent>

        <div className="px-8 py-6 bg-slate-50 flex flex-col sm:flex-row items-center justify-between gap-4 border-t">
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center sm:text-left">© 2026 PT. China Glaze Indonesia. All Rights Reserved.<br />Verified Digital Passport System v1.0</p>
          <div className="flex items-center gap-2">
            <Image src="/cgi.png" alt="Logo" width={24} height={24} className="grayscale opacity-50" />
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-tighter">Secure Document Asset</span>
          </div>
        </div>
      </Card>
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
    <div className="min-h-screen bg-slate-100/50 p-4 md:p-12 font-body selection:bg-primary selection:text-white">
      <Suspense fallback={<div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-12 w-12 animate-spin text-primary opacity-20" /></div>}>
        {assetId ? (
          <AssetContent assetId={assetId} />
        ) : (
          <div className="max-w-md mx-auto text-center p-12 bg-white rounded-[3rem] shadow-2xl">
            <AlertCircle className="h-16 w-16 text-rose-500 mx-auto mb-6" />
            <h2 className="text-2xl font-black text-slate-900 uppercase">Invalid Request</h2>
            <p className="text-slate-500 mt-2">ID Aset tidak ditemukan. Mohon pindai ulang kode QR pada fisik barang.</p>
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
