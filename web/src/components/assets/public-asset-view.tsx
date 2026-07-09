'use client';

/**
 * @fileOverview Komponen Penampil Aset Publik yang Elegan & Profesional.
 * Dioptimalkan untuk verifikasi lapangan via QR Code.
 */

import { useState, useEffect, useMemo } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type MaintenanceSchedule } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Tag, 
  MapPin, 
  Calendar, 
  Hash, 
  ShieldCheck, 
  CheckCircle2, 
  Wrench, 
  Info, 
  User, 
  ImageIcon,
  AlertCircle,
  Settings2,
  Activity,
  Zap,
  FileText,
  Printer,
  Shield,
  Crown,
  Verified,
  ArrowLeft,
  QrCode
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

interface PublicAssetViewProps {
  assetId: string;
}

const isoRelevantCategories = [
  'A3-Peralatan Mesin',
  'A4-Peralatan Listrik',
  'A5-Peralatan Transportasi',
  'A6-Peralatan Penelitian & Uji Lab',
  'A9-Peralatan Lain-lain',
  'Kendaraan',
  'Elektronik'
];

const DetailTile = ({ label, value, icon: Icon }: { label: string, value: any, icon: any }) => (
    <div className="p-5 rounded-[1.5rem] bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm flex items-start gap-4 hover:shadow-md transition-shadow text-left">
        <div className="p-3 bg-primary/5 rounded-xl shrink-0">
            <Icon className="h-5 w-5 text-primary" />
        </div>
        <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] leading-none mb-1.5 text-left">{label}</p>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 uppercase text-left">{value || '-'}</p>
        </div>
    </div>
);

const SectionLabel = ({ title, icon: Icon }: { title: string, icon: any }) => (
    <div className="flex items-center gap-3 mb-6 mt-12 first:mt-0 px-2 text-left">
        <div className="h-8 w-1 bg-primary rounded-full" />
        <div className="flex items-center gap-2 text-left">
            <Icon className="h-4 w-4 text-primary" />
            <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase tracking-[0.25em] text-left">{title}</p>
        </div>
        <div className="h-px flex-1 bg-gradient-to-r from-slate-200 dark:from-slate-800 to-transparent text-left" />
    </div>
);

const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return '-';
    try {
        return format(timestamp.toDate(), 'd MMMM yyyy', { locale: localeID });
    } catch (e) {
        return '-';
    }
};

export default function PublicAssetView({ assetId }: PublicAssetViewProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});

  useEffect(() => {
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
            const data = snap.data();
            if (data.companyName) setCompanyName(data.companyName);
            if (data.categoryLabels) setCategoryLabels(data.categoryLabels);
        }
    });
    return () => unsubGen();
  }, []);

  useEffect(() => {
    if (!assetId) return;

    const unsubAsset = onSnapshot(doc(db, 'assets', assetId), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);

        try {
            const url = window.location.href;
            const qr = await QRCode.toDataURL(url, { 
                margin: 1, 
                width: 400,
                color: { dark: '#0f172a', light: '#ffffff' }
            });
            setQrCodeUrl(qr);
        } catch (err) {
            console.error("QR Generation error", err);
        }
      } else {
        setAsset(null);
      }
      setLoading(false);
    });

    const mQuery = query(
        collection(db, 'maintenance_schedules'),
        where('assetId', '==', assetId),
        orderBy('scheduledDate', 'desc')
    );
    
    const unsubMaintenance = onSnapshot(mQuery, (snapshot) => {
        setMaintenanceHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule)));
    });

    return () => {
        unsubAsset();
        unsubMaintenance();
    };
  }, [assetId]);

  const getAccessoryLabel = (index: 1 | 2 | 3 | 4) => {
    if (!asset) return `Kelengkapan ${index}`;

    // Custom labels from settings
    if (categoryLabels[asset.category] && categoryLabels[asset.category][index - 1]) {
        return categoryLabels[asset.category][index - 1];
    }

    const category = asset.category;
    const name = (asset.name || '').toLowerCase();

    // Fallbacks
    const isEmissionISO = category === 'A3-Peralatan Mesin' || category === 'A4-Peralatan Listrik';
    if (isEmissionISO) {
      switch(index) {
        case 1: return "Sumber Emisi";
        case 2: return "Data Aktivitas";
        case 3: return "Faktor Emisi";
        case 4: return "Metodologi";
      }
    }

    const isAC = name.includes('ac') || name.includes('air conditioner') || category === 'Elektronik';
    if (isAC) {
      switch(index) {
        case 1: return "Model Unit";
        case 2: return "Jenis Refrigeran";
        case 3: return "Volume (KG)";
        case 4: return "kW";
      }
    }
    if (category === 'APAR') {
      switch(index) {
        case 1: return "Berat (kg)";
        case 2: return "Media";
        case 3: return "Exp Date";
        case 4: return "Posisi Titik";
      }
    }
    
    if (isoRelevantCategories.includes(category)) {
      switch(index) {
        case 1: return "Model / S/N";
        case 2: return "Tipe Unit";
        case 3: return "Jenis Energi";
        case 4: return "Kapasitas";
      }
    }
    return `Spesifikasi ${index}`;
  };

  if (loading) return (
    <div className="max-w-4xl mx-auto p-10 space-y-8">
        <Skeleton className="h-40 w-full rounded-[3.5rem]" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-24 rounded-[2rem]" />)}
        </div>
        <Skeleton className="h-64 rounded-[3rem]" />
    </div>
  );

  if (!asset) return (
    <div className="max-w-md mx-auto p-12 text-center flex flex-col items-center gap-6 mt-20 bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-100 dark:border-slate-800 animate-in zoom-in-95 duration-500">
        <div className="p-6 bg-rose-50 dark:bg-rose-900/10 rounded-full">
            <AlertCircle className="h-16 w-16 text-rose-500 opacity-40" />
        </div>
        <div className="space-y-2">
            <h2 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Data Tidak Ditemukan</h2>
            <p className="text-sm text-muted-foreground font-medium leading-relaxed text-left">Objek yang Anda cari tidak terdaftar atau sudah dihapus dari sistem manajemen aset.</p>
        </div>
        <Button asChild className="rounded-full px-8 bg-slate-900 dark:bg-primary text-white">
            <Link href="/">Kembali ke Portal</Link>
        </Button>
    </div>
  );

  const galleryImages = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter((u): u is string => !!u);

  return (
    <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        className="max-w-4xl mx-auto p-4 sm:p-10 space-y-12 pb-32"
    >
        {/* Verification & Hero Section */}
        <div className="relative p-8 sm:p-12 rounded-[3.5rem] bg-slate-900 text-white overflow-hidden shadow-2xl border border-white/10 group">
            
            {/* Prominent Verification Block */}
            <div className="absolute top-0 left-0 bg-primary px-8 py-5 rounded-br-[2.5rem] shadow-2xl z-20 flex items-center gap-4 animate-in slide-in-from-left-full duration-1000">
                <div className="p-2 bg-white/20 rounded-xl shadow-lg border border-white/30">
                    <ShieldCheck className="h-6 w-6 sm:h-7 sm:w-7 text-white" />
                </div>
                <div className="flex flex-col items-start leading-none text-left">
                    <span className="text-[10px] font-black text-white/70 uppercase tracking-[0.3em] mb-1.5">Verified Asset of</span>
                    <span className="text-sm sm:text-lg font-black text-white uppercase tracking-normal drop-shadow-md">
                        {companyName}
                    </span>
                </div>
            </div>

            <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50 pointer-events-none" />
            <div className="absolute -bottom-10 -left-10 opacity-5 group-hover:scale-110 transition-transform duration-1000 pointer-events-none">
                <Tag className="w-80 h-80 rotate-12" />
            </div>
            
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-10 mt-16 sm:mt-20">
                <div className="text-left space-y-6 flex-1 min-w-0">
                    <div className="space-y-4 text-left">
                        <h1 className="text-xl sm:text-3xl font-black tracking-tight uppercase leading-tight italic text-white drop-shadow-sm">
                            {asset.name}
                        </h1>
                        <div className="flex flex-col gap-1 text-left">
                            <p className="text-2xl font-black text-primary font-mono tracking-[0.2em]">{asset.code}</p>
                            <div className="h-1 w-24 bg-primary/40 rounded-full" />
                        </div>
                    </div>
                    
                    <div className="flex flex-wrap items-center gap-3 text-left">
                        <Badge className="bg-white text-slate-900 border-none px-6 py-2 rounded-full font-black text-[11px] uppercase shadow-lg">
                            {asset.category}
                        </Badge>
                        <Badge className={cn(
                            "rounded-full px-6 py-2 font-black text-[11px] uppercase border-none shadow-lg text-white ring-2 ring-inset ring-white/10",
                            asset.status === 'Aktif' || asset.status.includes('creation') ? "bg-emerald-600" : "bg-blue-600"
                        )}>
                            {asset.status.replace(/_/g, ' ')}
                        </Badge>
                    </div>
                </div>
                
                {qrCodeUrl && (
                    <div className="shrink-0 flex flex-col items-center gap-3 animate-in fade-in zoom-in duration-1000 delay-300">
                        <div className="p-4 bg-white rounded-[2.5rem] shadow-2xl ring-8 ring-primary/10 border border-slate-100 relative">
                            <div className="absolute -top-2 -right-2 h-8 w-8 bg-primary rounded-full flex items-center justify-center shadow-lg">
                                <ShieldCheck className="h-4 w-4 text-white" />
                            </div>
                            <Image src={qrCodeUrl} alt="Verification QR" width={160} height={160} className="object-contain" />
                        </div>
                        <span className="text-[10px] font-black uppercase tracking-[0.4em] text-white/40">SECURE ID: {assetId.slice(0,8).toUpperCase()}</span>
                    </div>
                )}
            </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            <DetailTile label="Lokasi Unit" value={asset.location} icon={MapPin} />
            <DetailTile label="Pusat Biaya" value={asset.costCenter} icon={Hash} />
            <DetailTile label="Kondisi Fisik" value={asset.condition} icon={ShieldCheck} />
            <DetailTile label="User Aktif" value={asset.user} icon={User} />
            <DetailTile label="Merk / Brand" value={asset.brand} icon={Info} />
            <DetailTile label="Tgl Perolehan" value={formatDate(asset.purchaseDate)} icon={Calendar} />
        </div>

        <section>
            <SectionLabel title="Identitas Teknis & Emisi ISO" icon={Settings2} />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <DetailTile label={getAccessoryLabel(1)} value={asset.accessory1} icon={Info} />
                <DetailTile label={getAccessoryLabel(2)} value={asset.accessory2} icon={Activity} />
                <DetailTile label={getAccessoryLabel(3)} value={asset.accessory3} icon={Zap} />
                <DetailTile label={getAccessoryLabel(4)} value={asset.accessory4} icon={ShieldCheck} />
            </div>
        </section>

        <section>
            <SectionLabel title="Histori Pemeliharaan & Servis" icon={Wrench} />
            {maintenanceHistory.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {maintenanceHistory.map((m) => (
                        <Card key={m.id} className="rounded-[2rem] border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl transition-all duration-500 overflow-hidden bg-white/50 dark:bg-slate-900/50 backdrop-blur-sm group">
                            <CardContent className="p-8 space-y-5 text-left">
                                <div className="flex items-center justify-between">
                                    <Badge variant={m.status === 'Selesai' ? 'success' : (m.status === 'Ditunda' ? 'destructive' : 'warning')} className="text-[9px] font-black uppercase px-4 py-1 rounded-full shadow-inner border-none">
                                        {m.status}
                                    </Badge>
                                    <span className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-1.5">
                                        <Calendar className="h-3.5 w-3.5 text-primary/40" /> {formatDate(m.scheduledDate)}
                                    </span>
                                </div>
                                <div className="space-y-2 text-left">
                                    <h4 className="font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm leading-tight group-hover:text-primary transition-colors">{m.type}</h4>
                                    <p className="text-xs text-muted-foreground font-medium italic leading-relaxed line-clamp-2">"{m.notes || 'Pengerjaan rutin sesuai standar operasional.'}"</p>
                                </div>
                                <div className="pt-4 border-t border-slate-50 dark:border-slate-800 flex items-center justify-between">
                                    <div className="flex items-center gap-2 text-left">
                                        <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center font-black text-[9px] text-primary">{m.technician?.[0] || 'T'}</div>
                                        <span className="text-[10px] font-black uppercase text-slate-600 dark:text-slate-300 text-left">{m.technician || 'Staff IT/GA'}</span>
                                    </div>
                                    {m.completionPhotoURL && (
                                        <span className="text-[9px] font-black text-emerald-600 uppercase flex items-center gap-1 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-lg">
                                            <CheckCircle2 className="h-3 w-3" /> Signed
                                        </span>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            ) : (
                <div className="p-16 rounded-[3rem] bg-white dark:bg-slate-900 border-2 border-dashed border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center text-center gap-5 opacity-40 text-left">
                    <div className="p-5 bg-slate-50 dark:bg-slate-800 rounded-full shadow-inner text-left">
                        <CheckCircle2 className="h-12 w-12 text-slate-300" />
                    </div>
                    <div className="space-y-1 text-left">
                        <p className="text-xs font-black uppercase tracking-[0.3em] text-slate-900 dark:text-white text-left">Zero Maintenance Logs</p>
                        <p className="text-[10px] font-bold text-muted-foreground max-w-xs leading-relaxed uppercase text-left">Aset ini belum memiliki riwayat servis digital.</p>
                    </div>
                </div>
            )}
        </section>

        <section>
            <SectionLabel title="Audit Trail & Catatan" icon={FileText} />
            <Card className="rounded-[2.5rem] border-none shadow-sm bg-white dark:bg-slate-900 overflow-hidden ring-1 ring-slate-100 dark:ring-slate-800">
                <CardContent className="p-10 flex gap-6 items-start">
                    <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl shrink-0 shadow-inner"><FileText className="h-6 w-6 text-slate-400" /></div>
                    <div className="space-y-3 text-left">
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 leading-relaxed italic whitespace-pre-wrap text-left">
                            {asset.notes || 'Tidak ada catatan tambahan yang direkam dalam sistem untuk objek ini.'}
                        </p>
                        <div className="flex items-center gap-2 pt-2 text-left">
                             <div className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                             <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-left">Integritas Data Terjamin Sistem</span>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </section>

        {galleryImages.length > 0 && (
            <section>
                <SectionLabel title="Dokumentasi Visual Resmi" icon={ImageIcon} />
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                    {galleryImages.map((url, idx) => (
                        <div 
                            key={idx} 
                            className="relative aspect-square rounded-[2rem] overflow-hidden border-4 border-white dark:border-slate-800 shadow-xl bg-slate-200 cursor-pointer hover:scale-105 transition-all duration-500 group"
                            onClick={() => window.open(url, '_blank')}
                        >
                            <Image src={url} alt={`Foto Aset ${idx + 1}`} fill className="object-cover" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="secondary" size="sm" className="rounded-full font-black text-[9px] uppercase tracking-widest h-8 text-black">Lihat</Button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>
        )}
    </motion.div>
  );
}
