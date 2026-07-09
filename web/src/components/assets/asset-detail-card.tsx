'use client';

import { type Asset, type AssetCondition, type MaintenanceSchedule } from '@/lib/types';
import { motion } from 'framer-motion';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { 
  ExternalLink, 
  Recycle, 
  ArrowRightLeft, 
  Edit, 
  Printer, 
  ClipboardEdit, 
  Eye, 
  Hash, 
  MapPin as MapPinIcon, 
  Tag as TagIcon, 
  CircleDollarSign, 
  Calendar as CalendarIcon, 
  Info as InfoIcon,
  Layers as LayersIcon,
  Settings2,
  MoreVertical,
  Share2,
  Loader2,
  Check,
  User as UserIcon,
  Building as BuildingIcon,
  History as HistoryIcon,
  FileText as FileTextIcon,
  Laptop,
  Wrench as WrenchIcon,
  CheckCircle2,
  TrendingDown,
  Ticket,
  Clock as ClockIcon,
  Package as PackageIcon,
  Shield as ShieldIcon,
  ImageIcon,
  ShieldCheck
} from 'lucide-react';
import { Timestamp, addDoc, collection, doc, serverTimestamp, setDoc, query, where, getDocs, onSnapshot, orderBy, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import AssetForm from './asset-form';
import MutationForm from '../mutations/mutation-form';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import AssetDetailDialog from './asset-detail-dialog';
import AssetCardPreview from './asset-card-preview';
import { cn } from '@/lib/utils';
import QRCode from 'qrcode';
import { calculateDepreciation } from '@/lib/calculations';
import { Progress } from '../ui/progress';
import Image from 'next/image';

interface AssetDetailCardProps {
  asset: Asset;
}

const getDeptColor = (dept: string = '') => {
  const d = dept.toUpperCase();
  if (d.includes('IT')) return { bg: 'bg-blue-600', shadow: 'border-b-[5px] border-b-blue-800 shadow-md', text: 'text-white', border: 'border border-blue-500' };
  if (d.includes('HR') || d.includes('GA')) return { bg: 'bg-emerald-600', shadow: 'border-b-[5px] border-b-emerald-800 shadow-md', text: 'text-white', border: 'border border-emerald-500' };
  if (d.includes('ACCOUNTING')) return { bg: 'bg-amber-500', shadow: 'border-b-[5px] border-b-amber-750 shadow-md', text: 'text-white', border: 'border border-amber-400' };
  if (d.includes('MIXER') || d.includes('FRIT') || d.includes('TINTA') || d.includes('PRODUCTION')) return { bg: 'bg-rose-600', shadow: 'border-b-[5px] border-b-rose-800 shadow-md', text: 'text-white', border: 'border border-rose-500' };
  if (d.includes('R&D') || d.includes('LAB') || d.includes('QC')) return { bg: 'bg-purple-600', shadow: 'border-b-[5px] border-b-purple-800 shadow-md', text: 'text-white', border: 'border border-purple-500' };
  if (d.includes('MANAGEMENT')) return { bg: 'bg-slate-900', shadow: 'border-b-[5px] border-b-black shadow-md', text: 'text-white', border: 'border border-slate-800' };
  if (d.includes('MARKETING')) return { bg: 'bg-pink-600', shadow: 'border-b-[5px] border-b-pink-800 shadow-md', text: 'text-white', border: 'border border-pink-500' };
  if (d.includes('PURCHASING')) return { bg: 'bg-orange-500', shadow: 'border-b-[5px] border-b-orange-700 shadow-md', text: 'text-white', border: 'border border-orange-400' };
  return { bg: 'bg-cyan-600', shadow: 'border-b-[5px] border-b-cyan-800 shadow-md', text: 'text-white', border: 'border border-cyan-500' };
};

const DetailRow = ({ label, value, emoji, className, dark }: { label: string; value: React.ReactNode, emoji?: string, className?: string, dark?: boolean }) => (
  <div className={cn(
    "p-3 rounded-lg border text-left transition-all duration-300", 
    dark 
      ? "bg-black/15 border-white/10 border-b-2 border-b-black/30 text-white" 
      : "bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 border-b-2 border-b-slate-300 dark:border-b-slate-800/60 shadow-sm",
    className
  )}>
    <div className="flex items-center gap-1.5 mb-1 text-left">
      {emoji && <span className="text-xs select-none">{emoji}</span>}
      <div className={cn("text-[9px] uppercase font-bold tracking-wider leading-none text-left", dark ? "text-white/80" : "text-slate-500")}>{label}</div>
    </div>
    <div className={cn(
        "font-bold text-xs truncate text-left", 
        dark ? "text-white" : "text-slate-800 dark:text-slate-200"
    )} title={typeof value === 'string' ? value : undefined}>
        {value || '-'}
    </div>
  </div>
);

const SectionLabel = ({ title, emoji, dark }: { title: string, emoji: string, dark?: boolean }) => (
    <div className="col-span-full mt-5 mb-2 first:mt-0 flex items-center gap-2 text-left">
        <span className="text-sm select-none">{emoji}</span>
        <p className={cn("text-[10px] font-black uppercase tracking-[0.15em] text-left", dark ? "text-white/60" : "text-slate-500/85")}>{title}</p>
        <div className={cn("h-[1px] flex-1 ml-3 bg-gradient-to-r", dark ? "from-white/15 to-transparent" : "from-slate-150 to-transparent dark:from-slate-800")} />
    </div>
);

const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return '-';
    try {
        return format(timestamp.toDate(), 'd MMM yyyy', { locale: id });
    } catch (e) {
        return '-';
    }
};

const formatCurrency = (value: number | undefined) => {
  if (typeof value !== 'number') return '-';
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(value);
};

const calculateAssetAge = (purchaseDate: Timestamp | null | undefined): string | null => {
    if (!purchaseDate) return null;
    try {
        return formatDistanceToNowStrict(purchaseDate.toDate(), { locale: id });
    } catch (e) {
        return null;
    }
};

export default function AssetDetailCard({ asset }: AssetDetailCardProps) {
  const [isMutationFormOpen, setIsMutationFormOpen] = useState(false);
  const [isAssetFormOpen, setIsAssetFormOpen] = useState(false);
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
  const [isPreviewCardOpen, setIsPreviewCardOpen] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [itAssetId, setItAssetId] = useState<string | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSchedule[]>([]);
  const [loadingMaintenance, setLoadingMaintenance] = useState(true);
  const [mutationType, setMutationType] = useState<'mutasi' | 'disposal' | 'edit'>('mutasi');
  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});
  const { user } = useAuth();
  const { toast } = useToast();

  const deptStyle = useMemo(() => getDeptColor(asset.location), [asset.location]);

  const depreciation = useMemo(() => {
    return calculateDepreciation(asset.price, asset.purchaseDate, asset.assetLifetime, asset.manualDepreciationPercent);
  }, [asset.price, asset.purchaseDate, asset.assetLifetime, asset.manualDepreciationPercent]);

  useEffect(() => {
    const unsubLabels = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists() && snap.data().categoryLabels) {
        setCategoryLabels(snap.data().categoryLabels);
      }
    });

    const checkITLink = async () => {
        if (!asset.code) return;
        const q = query(collection(db, 'it_assets'), where('assetCode', '==', asset.code));
        const snap = await getDocs(q);
        if (!snap.empty) {
            setItAssetId(snap.docs[0].id);
        }
    };
    checkITLink();

    setLoadingMaintenance(true);
    const mQuery = query(
        collection(db, 'maintenance_schedules'),
        where('assetId', '==', asset.id),
        orderBy('scheduledDate', 'desc')
    );
    
    const unsubscribeM = onSnapshot(mQuery, (snapshot) => {
        const history = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceSchedule));
        setMaintenanceHistory(history);
        setLoadingMaintenance(false);
    });

    return () => {
        unsubLabels();
        unsubscribeM();
    };
  }, [asset.id, asset.code]);

  const openMutationForm = (type: 'mutasi' | 'disposal' | 'edit') => {
    setMutationType(type);
    setTimeout(() => setIsMutationFormOpen(true), 100);
  }

  const handleShareLink = async () => {
    setIsSharing(true);
    try {
        let publicUrl = `${window.location.origin}/public/asset?assetId=${asset.id}`;
        
        if (asset.status === 'Bukan_Asset_Perusahaan') {
            publicUrl = `${window.location.origin}/public/personal?id=${asset.id}`;
        } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
            publicUrl = `${window.location.origin}/public/utility?id=${asset.id}`;
        }

        if (navigator.share) {
            try {
                await navigator.share({
                    title: `Verifikasi Aset: ${asset.name}`,
                    text: `Detail verifikasi aset resmi PT. CGI (${asset.code})`,
                    url: publicUrl,
                });
                toast({ title: 'Berhasil Dibagikan' });
            } catch (shareError: any) {
                if (shareError.name !== 'AbortError') {
                    await navigator.clipboard.writeText(publicUrl);
                    toast({ title: 'Link Disalin', description: 'Tautan verifikasi publik telah disalin.' });
                }
            }
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin', description: 'Tautan verifikasi publik telah disalin.' });
        }
    } catch (error) {
        console.error("Error sharing asset:", error);
        toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
        setIsSharing(false);
    }
  };

  const handlePrintFixAssetForm = async (asset: Asset) => {
    setIsPrinting(true);
    try {
        const purchaseDateStr = asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd-MM-yyyy') : '';
        const projectDate = asset.projectInspectionDate ? asset.projectInspectionDate.toDate() : null;
        const inspProyekDate = projectDate ? format(projectDate, 'dd-MM-yyyy') : '';
        const createdAtDate = asset.createdAt ? asset.createdAt.toDate() : new Date();

        const tglInput = format(createdAtDate, 'dd');
        const bulanInput = format(createdAtDate, 'MM');
        const tahunInput = format(createdAtDate, 'yyyy');

        const formattedPrice = (asset.priceUSD ?? 0) > 0 
          ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.priceUSD!)
          : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);
        
        let qrData = `${window.location.origin}/public/asset?assetId=${asset.id}`;
        if (asset.status === 'Bukan_Asset_Perusahaan') {
            qrData = `${window.location.origin}/public/personal?id=${asset.id}`;
        } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
            qrData = `${window.location.origin}/public/utility?id=${asset.id}`;
        }

        const qrCodeUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 250 });

        const formHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>Form FIX ASSET - ${asset.code}</title>
    <style>
      @media print {
        @page { size: 215.9mm 139.7mm; margin: 2mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; page-break-after: always; }
      }
      body { font-family: 'BiauKai', Arial, sans-serif; margin: 0; padding: 0; }
      .page { width: 215.9mm; height: 139.7mm; margin: auto; padding: 8mm; box-sizing: border-box; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td { border: 1px solid #000; vertical-align: middle; font-size: 11px; padding: 2px 4px; text-align: center; height: 15px; }
      .title { text-align: center; font-weight: bold; font-size: 16px; }
      .subtitle { text-align: center; font-size: 12px; }
      .formtitle { text-align: center; font-weight: bold; font-size: 14px; }
      .input { text-align: center; font-size: 11px; vertical-align: middle; font-weight: bold; }
      .no-border td { border: none !important; }
      .label-cell { border: none; text-align: left; vertical-align: bottom; }
      .qr-container { width: 115px; height: 115px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
      .qr-container img { width: 100%; height: 100%; object-fit: contain; display: block; }
    </style>
    </head>
    <body>
    <div class="page">
      <table class="no-border" style="width:100%; margin-bottom:4px;">
        <tr><td class="title">PT. CHINA GLAZE INDONESIA</td></tr>
        <tr><td style="text-align:center; font-size:12px;">不動產、廠房及設備保管卡 <span style="font-weight:bold; font-size:14px;">FORM FIX ASSET</span></td></tr>
      </table>
      <table>
        <tr class="no-border">
          <td class="label-cell">財產類別<br>Item Fix Asset</td>
          <td colspan="2" class="input" style="font-weight: normal; text-align:left; padding-left: 5px;">${asset.category || ''}</td>
          <td class="label-cell">建卡日期<br>Tgl Input</td>
          <td class="label-cell" style="font-weight:bold;">日 Tgl: ${tglInput}</td>
          <td class="label-cell" style="font-weight:bold;">月 Bln: ${bulanInput}</td>
          <td class="label-cell" style="font-weight:bold;">年 Thn: ${tahunInput}</td>
          <td colspan="2" class="input" style="border-bottom: none !important; font-size:10px; vertical-align: bottom;">
            □ 正本 / Asli &nbsp;&nbsp; □ 副本 / Copy <br>
            □ 列帳 / FixA &nbsp;&nbsp; □ 列管 / FixB
          </td>
        </tr>
        <tr>
          <td>財產編號<br><br>No. Fix Asset</td>
          <td class="input" style="font-size: 10px;">${asset.code || ''}</td>
          <td>財產名稱<br><br>Nama Barang</td>
          <td colspan="2" class="input">${asset.name || ''}</td>
          <td>單位<br><br>Satuan</td>
          <td class="input">${asset.qty ? `${asset.qty} Unit` : ''}</td>
          <td>耐用年限<br><br>Ketahanan</td>
          <td class="input">${asset.assetLifetime ? `${asset.assetLifetime} Tahun` : ''}</td>
        </tr>
        <tr>
          <td rowspan="3">規格<br><br>Spec Barang</td>
          <td rowspan="3" colspan="3" class="input">
            <div class="qr-container">
                <img src="${qrCodeUrl}" alt="QR Code" />
            </div>
          </td>
          <td colspan="5">憑單編號 No. Dokument</td>
        </tr>
        <tr>
          <td>工程單號<br><br><span style="font-size:11px;">No.Insp Proyek</span></td>
          <td class="input">${asset.projectInspectionNumber || ''}</td>
          <td>工程驗送單<br><br><span style="font-size:10px;">Tgl Insp Proyek</span></td>
          <td colspan="2" class="input">${inspProyekDate}</td>
        </tr>
        <tr>
          <td>請購單號<br><br><span style="font-size:11px;">No.PR</span></td>
          <td class="input">${asset.prNumber || ''}</td>
          <td>物料驗送單<br><br><span style="font-size:11px;">No.Insp</span></td>
          <td colspan="2" class="input">${asset.inspectionNumber || ''}</td>
        </tr>
        <tr>
          <td>購入金額<br><br>Harga Barang</td>
          <td class="input">${formattedPrice}</td>
          <td>購入日期<br><br>Tgl Diterima</td>
          <td class="input">${purchaseDateStr}</td>
          <td>供應商<br><br>Supplier</td>
          <td class="input" style="font-size: 8px;">${asset.supplier || ''}</td>
          <td>存放地點<br><br>Ditempatkan</td>
          <td colspan="2" class="input">${asset.location || ''}</td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">附屬設備</td>
          <td colspan="4" class="input">${asset.accessory1 || ''}</td>
          <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td style="text-align: center; vertical-align: middle; height: 25px;">Kelengkapan</td>
          <td colspan="4" class="input">${asset.accessory2 || ''}</td>
          <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td>Barang</td>
          <td colspan="4" class="input">${asset.accessory3 || ''}</td>
          <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td>Lainnya</td>
          <td colspan="4" class="input">${asset.accessory4 || ''}</td>
          <td colspan="4" class="input"></td>
        </tr>
        <tr>
          <td>主管<br><br>Atasan</td>
          <td colspan="2" class="input"></td>
          <td>保管人<br><br>Yg Merawat</td>
          <td class="input"></td>
          <td>主管<br><br>Atasan</td>
          <td class="input"></td>
          <td>建卡人<br><br>Dibuat</td>
          <td class="input"></td>
        </tr>
      </table>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size:10px; margin-top:2mm;">
        <span style="font-weight: bold;">Kode Transaksi: ${asset.transactionCode || ''}</span>
        <span>表號:0-32-024</span>
      </div>
    </div>
    </body>
    </html>
              `;
        
        const printWindow = window.open('', '', 'width=815,height=528'); 
        if (printWindow) {
          printWindow.document.write(formHtml);
          printWindow.document.close();
          setTimeout(() => {
            printWindow.focus();
            printWindow.print();
            printWindow.close();
          }, 500);
        } else {
            toast({ variant: "destructive", title: "Gagal Mencetak", description: "Tidak dapat membuka jendela cetak." });
        }
    } catch (e) {
        console.error("Print error:", e);
        toast({ variant: "destructive", title: "Gagal Mencetak" });
    } finally {
        setIsPrinting(false);
    }
  };

  const getAccessoryLabel = (index: 1 | 2 | 3 | 4) => {
    if (categoryLabels[asset.category] && categoryLabels[asset.category][index - 1]) {
        return categoryLabels[asset.category][index - 1];
    }

    const isEmissionISO = asset.category === 'A3-Peralatan Mesin' || asset.category === 'A4-Peralatan Listrik';
    if (isEmissionISO) {
      switch(index) {
        case 1: return "Sumber Emisi";
        case 2: return "Volume / Tahun";
        case 3: return "Faktor Emisi";
        case 4: return "Metodologi";
      }
    }
    const isAirConditioner = (asset.name || '').toLowerCase().includes('ac') || (asset.name || '').toLowerCase().includes('air conditioner') || asset.category === 'Elektronik';
    if (isAirConditioner) {
      switch(index) {
        case 1: return "Model / Tipe";
        case 2: return "Jenis Refrigeran";
        case 3: return "Volume KG";
        case 4: return "kW";
      }
    }
    if (asset.category === 'APAR') {
      switch(index) {
        case 1: return "Berat (kg)";
        case 2: return "Media";
        case 3: return "Exp Date";
        case 4: return "Posisi";
      }
    }
    if (asset.category === 'CCTV') {
      switch(index) {
        case 1: return "IP Address";
        case 2: return "Model";
        case 3: return "Resolusi";
        case 4: return "Channel";
      }
    }
    return `Kelengkapan ${index}`;
  };

  const canEdit = user?.role === 'Admin' || user?.permissions?.canEditAsset;
  const canRequest = user?.role === 'Admin' || user?.permissions?.canRequestMutation;
  const isWaiting = asset.status.startsWith('waiting_');

  const allPhotos = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter((u): u is string => !!u);

  return (
    <>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className={cn(
          "mx-1 mt-1 mb-8 p-6 sm:p-8 rounded-2xl border transition-all duration-700 relative overflow-hidden text-left",
          deptStyle.bg, deptStyle.shadow, deptStyle.border, deptStyle.text
      )}>
        <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
        
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <TagIcon className="w-80 h-80 rotate-12" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 relative z-10 text-left">
          
          <SectionLabel title="Identitas & Klasifikasi" emoji="🔑" dark />
          <DetailRow label="Nama Aset" value={asset.name} emoji="🏷️" className="col-span-2 bg-black/15 border-white/5" dark />
          <DetailRow label="Kode Aset" value={asset.code} emoji="🔑" className="font-mono bg-white/20 border-white/20 text-white" dark />
          <DetailRow label="Kategori" value={asset.category} emoji="📁" dark />
          <DetailRow label="Merek / Brand" value={asset.brand} emoji="ℹ️" dark />
          <DetailRow label="Kuantitas" value={`${asset.qty} UNIT`} emoji="⚙️" dark />

          <SectionLabel title="Lokasi & PIC" emoji="📍" dark />
          <DetailRow label="Lokasi Unit" value={asset.location} emoji="📍" dark />
          <DetailRow label="Pusat Biaya" value={asset.costCenter} emoji="🔢" dark />
          <DetailRow label="PIC / User" value={asset.user} emoji="👤" className="col-span-2" dark />
          <DetailRow label="Kondisi Fisik" value={asset.condition} emoji="📝" dark />
          <DetailRow label="Status Sistem" value={asset.status.replace(/_/g, ' ')} emoji="🔄" dark />

          <SectionLabel title="Finansial" emoji="💰" dark />
          <DetailRow label="Harga Perolehan" value={formatCurrency(asset.price)} emoji="💰" className="col-span-2 bg-black/15 border-white/5" dark />
          <DetailRow label="Tgl Perolehan" value={formatDate(asset.purchaseDate)} emoji="📅" dark />
          <DetailRow label="Umur Aset" value={calculateAssetAge(asset.purchaseDate) || '-'} emoji="⏳" dark />
          <DetailRow label="Vendor" value={asset.supplier} emoji="🏢" className="col-span-2" dark />

          {depreciation && (
            <>
              <SectionLabel title="Analisis Nilai Buku" emoji="📈" dark />
              <DetailRow label="Penyusutan / Bulan" value={depreciation.isManual ? 'Manual' : formatCurrency(depreciation.depreciationPerMonth)} emoji="📉" dark />
              <DetailRow 
                label="Akumulasi Penyusutan" 
                value={formatCurrency(depreciation.accumulatedDepreciation)}
                emoji="📉" 
                className="col-span-2 bg-rose-500/20 border-white/10" 
                dark 
              />
              <DetailRow 
                label="Nilai Buku Saat Ini" 
                value={formatCurrency(depreciation.bookValue)}
                emoji="💵" 
                className="col-span-2 bg-emerald-500/20 border-white/10" 
                dark 
              />
              <div className="col-span-full space-y-2 mt-2 px-1 text-left">
                <div className="flex justify-between text-xs font-black uppercase tracking-widest text-white/60 text-left">
                  <span>Sisa Nilai Manfaat</span>
                  <span>{Math.round(depreciation.percentRemaining)}%</span>
                </div>
                <Progress value={depreciation.percentRemaining} className="h-2 bg-black/20" />
              </div>
            </>
          )}

          <SectionLabel title="Identitas Teknis ISO" emoji="⚙️" dark />
          <div className="col-span-full grid grid-cols-2 sm:grid-cols-4 gap-4 relative z-10 text-left">
            <DetailRow label={getAccessoryLabel(1)} value={asset.accessory1} dark />
            <DetailRow label={getAccessoryLabel(2)} value={asset.accessory2} dark />
            <DetailRow label={getAccessoryLabel(3)} value={asset.accessory3} dark />
            <DetailRow label={getAccessoryLabel(4)} value={asset.accessory4} dark />
          </div>

          <SectionLabel title="Dokumentasi Foto" emoji="📷" dark />
          <div className="col-span-full text-left">
              {allPhotos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-left">
                      {allPhotos.map((url, idx) => (
                          <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border-2 border-white/10 shadow-lg group cursor-pointer" onClick={() => window.open(url, '_blank')}>
                              <Image src={url} alt={`Photo ${idx+1}`} fill className="object-cover group-hover:scale-105 transition-transform" />
                          </div>
                      ))}
                  </div>
              ) : (
                  <div className="p-8 rounded-2xl bg-black/10 border border-dashed border-white/10 flex flex-col items-center justify-center opacity-40 text-left">
                      <ImageIcon className="h-6 w-6 text-white mb-2" />
                      <p className="text-xs font-black uppercase tracking-wider text-white text-left">Belum Ada Foto</p>
                  </div>
              )}
          </div>

          <SectionLabel title="Log Maintenance & Kalibrasi" emoji="🔧" dark />
          <div className="col-span-full text-left">
            {loadingMaintenance ? (
              <div className="p-8 flex items-center justify-center gap-2 text-white/50">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Memuat Log...</span>
              </div>
            ) : maintenanceHistory.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {maintenanceHistory.map(m => (
                  <div key={m.id} className="p-4 rounded-2xl bg-black/20 border border-white/10 shadow-sm relative overflow-hidden group">
                    {/* Status Ribbon/Badge */}
                    <div className="absolute top-0 right-0 h-16 w-16 pointer-events-none overflow-hidden">
                      <div className={cn(
                        "absolute transform rotate-45 text-center text-[7px] font-black uppercase tracking-widest py-1 w-24 -right-6 top-3 text-white shadow-sm",
                        m.status === 'Selesai' ? "bg-emerald-500" :
                        m.status === 'Diproses' ? "bg-amber-500" : "bg-blue-500"
                      )}>
                        {m.status}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 mb-2 text-left">
                      <span className="text-[10px] font-bold text-white/50 uppercase flex items-center gap-1 text-left">
                        <CalendarIcon className="w-3.5 h-3.5" /> 
                        {formatDate(m.scheduledDate)}
                      </span>
                    </div>
                    <p className="text-xs font-black text-white uppercase truncate text-left">{m.type}</p>
                    <p className="mt-2 text-[10px] text-white/60 font-bold line-clamp-2 italic text-left">"{m.notes || 'Pengerjaan rutin.'}"</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 rounded-[2rem] bg-black/10 border-2 border-dashed border-white/10 flex flex-col items-center justify-center opacity-40 text-left">
                <CheckCircle2 className="h-10 w-10 text-white" />
                <p className="text-[10px] font-black uppercase mt-2 text-left">Log Bersih</p>
              </div>
            )}
          </div>
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="flex flex-wrap gap-2 text-left w-full md:w-auto">
                {canRequest && (
                  <>
                    <button onClick={() => openMutationForm('mutasi')} className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5" disabled={isWaiting}>
                        <ArrowRightLeft className="w-3.5 h-3.5" /> Mutasi
                    </button>
                    <button onClick={() => openMutationForm('disposal')} className="h-8 px-4 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-rose-800 active:translate-y-[1px] active:border-b-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5" disabled={isWaiting}>
                        <Recycle className="w-3.5 h-3.5" /> Disposal
                    </button>
                    <button onClick={() => openMutationForm('edit')} className="h-8 px-4 rounded-lg bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] transition-all disabled:opacity-50 flex items-center justify-center gap-1.5" disabled={isWaiting}>
                        <ClipboardEdit className="w-3.5 h-3.5" /> Kondisi
                    </button>
                  </>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <Button onClick={handleShareLink} size="sm" disabled={isSharing} className="rounded-lg h-8 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-sky-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                    {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
                    Share
                </Button>

                {canEdit && (
                <Button onClick={() => setIsAssetFormOpen(true)} size="sm" className="rounded-lg h-8 bg-amber-500 hover:bg-amber-600 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-amber-700 active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                </Button>
                )}

                <Button onClick={() => setIsPreviewCardOpen(true)} size="sm" className="rounded-lg h-8 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-purple-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Kartu
                </Button>

                <Button onClick={() => setIsDetailDialogOpen(true)} size="sm" className="rounded-lg h-8 bg-blue-600 hover:bg-blue-700 text-white font-bold uppercase text-[10px] tracking-wider px-4 border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Detail Full
                </Button>
                
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="rounded-lg bg-slate-700 hover:bg-slate-800 h-8 w-8 text-white border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] transition-all">
                            <MoreVertical className="h-4 w-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-60 rounded-2xl p-2 shadow-3xl text-black">
                        <DropdownMenuLabel className="text-xs font-black uppercase tracking-widest text-muted-foreground/70 px-4 py-2 text-left">Opsi Dokumen</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handlePrintFixAssetForm(asset); }} className="cursor-pointer gap-2 py-3 rounded-xl text-xs font-black uppercase">
                            {isPrinting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Printer className="h-4 w-4 text-slate-400" />}
                            Cetak Form Fix Aset
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild className="cursor-pointer gap-2 py-3 rounded-xl text-xs font-black uppercase">
                            <Link href={`/thermal-print-58?assetId=${asset.id}`}>
                                <Printer className="h-4 w-4 text-slate-400" />
                                Label Thermal (58mm)
                            </Link>
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </div>
      </div>
    </motion.div>
    <MutationForm 
      asset={asset}
      isOpen={isMutationFormOpen}
      onOpenChange={setIsMutationFormOpen}
      mutationType={mutationType}
    />
    <AssetForm
        asset={asset}
        isOpen={isAssetFormOpen}
        onOpenChange={setIsAssetFormOpen}
    />
     <AssetDetailDialog
        assetId={asset.id}
        isOpen={isDetailDialogOpen}
        onOpenChange={setIsDetailDialogOpen}
    />
    <AssetCardPreview
        assetId={asset.id}
        isOpen={isPreviewCardOpen}
        onOpenChange={setIsPreviewCardOpen}
    />
    </>
  );
}

function DetailBlockSimple({ label, value, icon: Icon, className }: { label: string, value: any, icon?: any, className?: string }) {
    return (
        <div className={cn("p-3 rounded-xl border text-left", className)}>
            <div className="flex items-center gap-2 mb-1 opacity-60">
                {Icon && <Icon className="w-3.5 h-3.5 text-primary" />}
                <p className="text-[9px] font-black uppercase tracking-widest text-left">{label}</p>
            </div>
            <div className="text-xs font-bold leading-relaxed line-clamp-3 text-left">{value || '-'}</div>
        </div>
    );
}
