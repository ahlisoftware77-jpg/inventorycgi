'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, collection, query, where, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type MaintenanceSchedule } from '@/lib/types';
import { Button } from '../ui/button';
import { Skeleton } from '../ui/skeleton';
import { ScrollArea } from '../ui/scroll-area';
import { 
  X as XIcon, 
  Tag, 
  MapPin, 
  Calendar, 
  User, 
  Building, 
  ShieldCheck, 
  Info,
  Layers,
  Hash,
  ImageIcon,
  Printer,
  Maximize2,
  Minimize2,
  CheckCircle2,
  Wrench,
  Shield,
  QrCode,
  FileCheck,
  FileText
} from 'lucide-react';
import Image from 'next/image';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogPortal, DialogOverlay, DialogClose } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';

interface AssetCardPreviewProps {
  assetId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

type LayoutType = '4x6' | 'A4';

const DetailItem = ({ label, value, icon: Icon, size = 'sm' }: { label: string; value: string | number | undefined; icon: any, size?: 'sm' | 'lg' }) => (
  <div className={cn(
    "flex flex-col border-b border-slate-100 dark:border-slate-800/60 text-left",
    size === 'sm' ? "gap-0.5 pb-1.5" : "gap-1.5 pb-2.5"
  )}>
    <div className="flex items-center gap-1.5 opacity-70">
      <Icon className={cn("text-primary shrink-0", size === 'sm' ? "w-3 h-3" : "w-4 h-4")} />
      <p className={cn(
        "font-black uppercase tracking-tighter text-slate-500",
        size === 'sm' ? "text-[7.5px]" : "text-[9.5px]"
      )}>{label}</p>
    </div>
    <p className={cn(
      "font-bold text-slate-900 leading-tight truncate uppercase text-left ml-4.5",
      size === 'sm' ? "text-[10.5px]" : "text-sm"
    )}>{value || '-'}</p>
  </div>
);

const PhotoGrid = ({ title, urls, size = 'sm' }: { title: string; urls: string[]; size?: 'sm' | 'lg' }) => (
  <div className="space-y-1.5 text-left">
    <p className={cn(
      "font-black text-primary uppercase tracking-widest flex items-center gap-1.5",
      size === 'sm' ? "text-[7.5px]" : "text-[10px]"
    )}>
      <ImageIcon className={cn(size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5")} /> {title}
    </p>
    <div className={cn("grid gap-2", size === 'sm' ? "grid-cols-4" : "grid-cols-4")}>
      {urls.length > 0 ? urls.map((url, i) => {
        const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/') || url.toLowerCase().includes('/files/') || url.toLowerCase().includes('format=pdf');
        
        if (isPdf) {
          return (
            <a 
              key={i} 
              href={url} 
              target="_blank" 
              rel="noreferrer"
              className={cn(
                "relative aspect-square overflow-hidden border border-rose-300 dark:border-rose-800 bg-rose-50/90 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 transition-all shadow-sm flex flex-col items-center justify-center p-1 text-center group text-rose-700 dark:text-rose-300",
                size === 'sm' ? "rounded-lg" : "rounded-xl"
              )}
              title="Buka Dokumen PDF Arsip Serah Terima"
            >
              <FileText className={cn("text-rose-600 dark:text-rose-400 group-hover:scale-110 transition-transform", size === 'sm' ? "w-5 h-5 mb-0.5" : "w-8 h-8 mb-1")} />
              <span className={cn("font-black uppercase text-rose-700 dark:text-rose-300 tracking-tighter leading-tight", size === 'sm' ? "text-[6px]" : "text-[8px]")}>
                PDF Dokumen
              </span>
            </a>
          );
        }

        return (
          <div key={i} className={cn(
            "relative aspect-square overflow-hidden border border-slate-200 bg-slate-50 shadow-sm",
            size === 'sm' ? "rounded-lg" : "rounded-xl"
          )}>
            <Image 
              src={url} 
              alt={`${title}-${i}`} 
              fill 
              className="object-cover" 
            />
          </div>
        );
      }) : (
        <div className={cn(
          "col-span-full rounded-xl bg-slate-50/80 border border-dashed border-slate-200 flex items-center justify-center",
          size === 'sm' ? "h-10" : "h-16"
        )}>
          <p className={cn("font-bold text-slate-300 uppercase tracking-wider", size === 'sm' ? "text-[6.5px]" : "text-[9px]")}>Dokumentasi Tidak Tersedia</p>
        </div>
      )}
    </div>
  </div>
);

export default function AssetCardPreview({ assetId, isOpen, onOpenChange }: AssetCardPreviewProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceSchedule[]>([]);
  const [loading, setLoading] = useState(true);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [layout, setLayout] = useState<LayoutType>('4x6');
  const [companyName, setCompanyName] = useState('PT. China Glaze Indonesia');
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubGeneral = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().companyName) {
        setCompanyName(docSnap.data().companyName);
      }
    });
    return () => unsubGeneral();
  }, []);
  
  const drawDottedQRCode = async (text: string, size: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const cellSize = size / moduleCount;

    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, size, size);
    ctx.fillStyle = '#0f172a';

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
                const centerStart = Math.floor(moduleCount / 2) - 2;
                const centerEnd = Math.ceil(moduleCount / 2) + 1;
                if (row >= centerStart && row <= centerEnd && col >= centerStart && col <= centerEnd) continue;

                const isTopLeftEye = row < 7 && col < 7;
                const isTopRightEye = row < 7 && col >= moduleCount - 7;
                const isBottomLeftEye = row >= moduleCount - 7 && col < 7;

                if (!isTopLeftEye && !isTopRightEye && !isBottomLeftEye) {
                    const dotRadius = cellSize * 0.48; 
                    ctx.beginPath();
                    ctx.arc(col * cellSize + cellSize / 2, row * cellSize + cellSize / 2, dotRadius, 0, Math.PI * 2);
                    ctx.fill();
                } else {
                    const cornerRadius = cellSize * 0.2;
                    const mx = col * cellSize; const my = row * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(mx + cornerRadius, my); ctx.lineTo(mx + cellSize - cornerRadius, my);
                    ctx.quadraticCurveTo(mx + cellSize, my, mx + cellSize, my + cornerRadius);
                    ctx.lineTo(mx + cellSize, my + cellSize - cornerRadius);
                    ctx.quadraticCurveTo(mx + cellSize, my + cellSize, mx + cellSize - cornerRadius, my + cellSize);
                    ctx.lineTo(mx + cornerRadius, my + cellSize);
                    ctx.quadraticCurveTo(mx, my + cellSize, mx, my + cellSize - cornerRadius);
                    ctx.lineTo(mx, my + cornerRadius); ctx.quadraticCurveTo(mx, my, mx + cornerRadius, my);
                    ctx.fill();
                }
            }
        }
    }

    const logoSize = size * 0.22;
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (logoSize / 2) + 2, 0, Math.PI * 2);
    ctx.fill();

    return new Promise<string>((resolve) => {
        const logoImg = new window.Image();
        logoImg.src = '/cgi.png';
        logoImg.onload = () => {
            ctx.drawImage(logoImg, (size - logoSize)/2, (size - logoSize)/2, logoSize, logoSize);
            resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => resolve(canvas.toDataURL('image/png'));
    });
  };

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    const unsub = onSnapshot(doc(db, 'assets', assetId), async (snap) => {
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() } as Asset;
        setAsset(data);
        
        let publicUrl = `${window.location.origin}/public/asset?assetId=${data.id}`;
        if (data.status === 'Bukan_Asset_Perusahaan') {
            publicUrl = `${window.location.origin}/public/personal?id=${data.id}`;
        } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(data.category)) {
            publicUrl = `${window.location.origin}/public/utility?id=${data.id}`;
        }
        
        const qr = await drawDottedQRCode(publicUrl, 400);
        setQrCodeUrl(qr);
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

    return () => { unsub(); unsubMaintenance(); };
  }, [assetId, isOpen]);

  const handlePrint = () => {
    const el = cardRef.current;
    if (!el) return;
    const win = window.open('', '', 'height=842,width=595');
    if (win) {
      win.document.write('<!DOCTYPE html><html><head><title>Asset Identity Card - ' + (asset?.code || '') + '</title>');
      const styles = Array.from(document.styleSheets).map(s => s.href ? `<link rel="stylesheet" href="${s.href}">` : '').join('');
      win.document.head.innerHTML += styles;
      
      const is4x6 = layout === '4x6';
      const pageSize = is4x6 ? '4in 6in' : 'A4 portrait';

      win.document.write(`
        <style>
          @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
          * { box-sizing: border-box; }
          html, body { 
            width: 100% !important; 
            height: 100% !important; 
            margin: 0 !important; 
            padding: 0 !important; 
            background: #ffffff !important; 
            color: #000000 !important;
            font-family: 'Inter', sans-serif !important;
            -webkit-print-color-adjust: exact !important; 
            print-color-adjust: exact !important; 
          }
          .print-outer-container {
            width: 100% !important;
            min-height: 100vh !important;
            display: flex !important;
            align-items: center !important;
            justify-content: center !important;
            margin: 0 auto !important;
            padding: 0 !important;
          }
          .card-area { 
            margin: auto !important; 
            border: none !important; 
            border-radius: 0 !important; 
            box-shadow: none !important; 
            transform: none !important; 
            page-break-inside: avoid !important;
            page-break-after: avoid !important;
          } 
          @media print { 
            @page { 
              size: ${pageSize}; 
              margin: 0; 
            } 
            html, body { 
              width: 100% !important; 
              height: 100% !important; 
              margin: 0 !important; 
              padding: 0 !important; 
              display: flex !important; 
              align-items: center !important; 
              justify-content: center !important; 
              background: #ffffff !important; 
            } 
            .print-outer-container {
              width: 100% !important;
              height: 100vh !important;
              display: flex !important;
              align-items: center !important;
              justify-content: center !important;
              margin: 0 auto !important;
            }
            .card-area { 
              margin: auto !important; 
              ${is4x6 ? 'width: 4in !important; height: 6in !important; max-width: 4in !important; max-height: 6in !important;' : 'width: 210mm !important; min-height: 297mm !important;'}
            } 
          }
        </style>
      `);
      win.document.write('</head><body><div class="print-outer-container">');
      win.document.write(el.outerHTML);
      win.document.write('</div></body></html>');
      win.document.close();
      setTimeout(() => { win.focus(); win.print(); win.close(); }, 800);
    }
  };

  const handleSavePNG = async () => {
    if (!cardRef.current || !asset) return;
    try {
      const canvas = await html2canvas(cardRef.current, { 
        useCORS: true, 
        scale: 3, 
        backgroundColor: '#ffffff',
        logging: false,
        scrollX: 0,
        scrollY: 0, 
        windowWidth: cardRef.current.scrollWidth,
        windowHeight: cardRef.current.scrollHeight
      });
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `Card_CGI_${asset.code}.png`;
      link.click();
      toast({ title: 'Berhasil', description: 'Kartu telah diunduh sebagai PNG resolusi tinggi.' });
    } catch (e) { 
        console.error("Save PNG Error:", e);
        toast({ variant: 'destructive', title: 'Gagal Simpan PNG' }); 
    }
  };

  if (!isOpen) return null;

  const assetPhotos = asset ? [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter((u): u is string => !!u) : [];
  const handoverPhotos = asset ? [asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4].filter((u): u is string => !!u) : [];

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-slate-950/85 backdrop-blur-xl" />
        <DialogContent hideCloseButton className="max-w-[98vw] sm:max-w-5xl p-0 border-none bg-slate-900 text-slate-50 overflow-hidden shadow-3xl rounded-[2rem] sm:rounded-[3rem]">
          {/* Top Bar Header Controls */}
          <div className="sticky top-0 z-40 px-6 sm:px-8 py-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 bg-slate-900/95 backdrop-blur-2xl">
            <div className="text-left">
              <DialogTitle className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white text-left flex items-center gap-2">
                <FileCheck className="w-6 h-6 text-primary" /> Preview Identity Card
              </DialogTitle>
              <DialogDescription className="text-slate-400 font-medium text-xs uppercase tracking-widest text-left">
                Digital Asset Certification & Printable Identity Label
              </DialogDescription>
            </div>
            
            <div className="flex items-center gap-3 self-end sm:self-auto">
                <div className="bg-white/5 p-1 rounded-2xl flex items-center gap-1 border border-white/10 shadow-inner">
                    <Button 
                        size="sm" 
                        variant={layout === '4x6' ? 'default' : 'ghost'} 
                        className={cn("h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-3", layout === '4x6' && "bg-primary text-white shadow-lg shadow-primary/30")}
                        onClick={() => setLayout('4x6')}
                    >
                        <Minimize2 className="w-3.5 h-3.5 mr-1.5" /> 4x6 Card
                    </Button>
                    <Button 
                        size="sm" 
                        variant={layout === 'A4' ? 'default' : 'ghost'} 
                        className={cn("h-9 rounded-xl text-[10px] font-black uppercase tracking-widest px-3", layout === 'A4' && "bg-primary text-white shadow-lg shadow-primary/30")}
                        onClick={() => setLayout('A4')}
                    >
                        <Maximize2 className="w-3.5 h-3.5 mr-1.5" /> A4 Paper
                    </Button>
                </div>
                <div className="h-8 w-px bg-white/10 mx-1 hidden sm:block" />
                <Button size="sm" variant="outline" className="h-9 rounded-xl bg-white/10 border-white/20 text-white font-black uppercase text-[10px] tracking-widest px-4 hover:bg-white/20 transition-all" onClick={handlePrint}>
                  <Printer className="mr-1.5 h-3.5 w-3.5"/> Cetak / Print
                </Button>
                <Button size="sm" className="h-9 rounded-xl bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest px-5 shadow-lg shadow-primary/20 transition-all" onClick={handleSavePNG}>
                  <ImageIcon className="mr-1.5 h-3.5 w-3.5"/> Unduh PNG
                </Button>
                <DialogClose asChild>
                  <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-9 w-9 text-white">
                    <XIcon className="w-5 h-5"/>
                  </Button>
                </DialogClose>
            </div>
          </div>

          {/* Scroll Area Preview Container (Always Centered) */}
          <ScrollArea className="max-h-[82vh] bg-slate-950 p-4 sm:p-8 md:p-10">
            <div className="flex items-center justify-center min-h-[70vh] w-full py-4 pb-16">
              {loading ? (
                <Skeleton className={cn("rounded-3xl bg-slate-800 animate-pulse mx-auto", layout === '4x6' ? "w-[4in] h-[6in]" : "w-[210mm] min-h-[297mm]")} />
              ) : asset && (
                <div 
                    ref={cardRef} 
                    className={cn(
                        "card-area bg-white text-slate-950 shadow-2xl relative overflow-hidden transition-all duration-300 flex flex-col justify-between border border-slate-200/80 mx-auto",
                        layout === '4x6' 
                          ? "w-[4in] h-[6in] max-w-[4in] max-h-[6in] p-5 rounded-[2rem]" 
                          : "w-[210mm] min-h-[297mm] h-auto p-10 rounded-none"
                    )}
                >
                    {/* Top Company Brand Header */}
                    <div className={cn(
                        "relative z-10 flex flex-col items-center text-center",
                        layout === '4x6' ? "gap-1 mb-2.5" : "gap-2 mb-5"
                    )}>
                        <Image src="/cgi.png" alt="Logo" width={layout === '4x6' ? 32 : 48} height={layout === '4x6' ? 32 : 48} className="drop-shadow-sm" />
                        <div className="space-y-0.5">
                            <h1 className={cn("font-black tracking-tighter text-primary uppercase leading-none italic", layout === '4x6' ? "text-sm" : "text-xl")}>
                                {companyName}
                            </h1>
                            <p className={cn("font-black text-slate-400 uppercase tracking-[0.3em]", layout === '4x6' ? "text-[6px]" : "text-[8px]")}>
                                Official Asset Identity Document
                            </p>
                        </div>
                    </div>

                    {/* Verification Corner Ribbon */}
                    <div className="absolute top-9 -right-12 bg-gradient-to-r from-emerald-600 to-teal-500 text-white py-1 px-14 rotate-45 shadow-md z-20 flex items-center gap-1">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span className="text-[6.5px] font-black uppercase tracking-widest">VERIFIED</span>
                    </div>

                    {/* Main Identity Banner Block */}
                    <div className={cn(
                        "relative z-10 flex justify-between items-end border-y-2 border-slate-900 bg-slate-50/90 shadow-sm rounded-xl",
                        layout === '4x6' ? "mx-[-12px] px-4 py-2.5 mb-3" : "mx-[-24px] px-8 py-5 mb-5"
                    )}>
                        <div className="space-y-1 text-left">
                            <Badge className={cn("bg-primary text-white border-none font-black uppercase shadow-sm", layout === '4x6' ? "text-[6px] px-2 py-0.5" : "text-[8px] px-3 py-1")}>
                                {asset.category}
                            </Badge>
                            <h2 className={cn("font-black text-slate-950 tracking-tighter leading-tight uppercase italic text-left", layout === '4x6' ? "text-base max-w-[190px]" : "text-3xl max-w-[450px]")}>
                                {asset.name}
                            </h2>
                            <p className={cn("font-black text-primary font-mono tracking-wider text-left", layout === '4x6' ? "text-xs mt-0.5" : "text-xl mt-1.5")}>
                                {asset.code}
                            </p>
                        </div>
                        <div className="flex flex-col items-center gap-1 shrink-0">
                            <div className={cn(
                                "p-1.5 bg-white rounded-xl shadow-md ring-2 ring-slate-200 border border-slate-300 flex items-center justify-center",
                                layout === '4x6' ? "w-18 h-20" : "w-32 h-32 p-3"
                            )}>
                                {qrCodeUrl && <Image src={qrCodeUrl} alt="QR" width={layout === '4x6' ? 68 : 118} height={layout === '4x6' ? 68 : 118} className="object-contain" />}
                            </div>
                            <span className={cn("font-black text-slate-400 uppercase tracking-widest", layout === '4x6' ? "text-[5px]" : "text-[7px]")}>
                                <QrCode className="inline w-2 h-2 mr-0.5" /> Scan QR Code
                            </span>
                        </div>
                    </div>

                    {/* Details & Specs Grid Container */}
                    <div className={cn("relative z-10 flex-grow text-left", layout === '4x6' ? "space-y-2.5" : "space-y-5")}>
                        {/* 6 Key Details Grid */}
                        <div className={cn("grid gap-x-4 gap-y-2", layout === '4x6' ? "grid-cols-2" : "grid-cols-3")}>
                            <DetailItem label="Status Operasional" value={asset.status.replace(/_/g, ' ')} icon={Shield} size={layout === '4x6' ? 'sm' : 'lg'} />
                            <DetailItem label="Lokasi Penempatan" value={asset.location} icon={MapPin} size={layout === '4x6' ? 'sm' : 'lg'} />
                            <DetailItem label="Pusat Biaya (Cost Center)" value={asset.costCenter} icon={Hash} size={layout === '4x6' ? 'sm' : 'lg'} />
                            <DetailItem label="Kondisi Fisik" value={asset.condition} icon={CheckCircle2} size={layout === '4x6' ? 'sm' : 'lg'} />
                            <DetailItem label="Penanggung Jawab" value={asset.user} icon={User} size={layout === '4x6' ? 'sm' : 'lg'} />
                            <DetailItem label="Tanggal Perolehan" value={asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd MMMM yyyy', { locale: id }) : '-'} icon={Calendar} size={layout === '4x6' ? 'sm' : 'lg'} />
                        </div>

                        {/* Photo Documentation Section */}
                        <div className={cn("space-y-2", layout === 'A4' && "space-y-4")}>
                            <PhotoGrid title="Dokumentasi Fisik Aset" urls={assetPhotos} size={layout === '4x6' ? 'sm' : 'lg'} />
                            {handoverPhotos.length > 0 && (
                              <PhotoGrid title="Arsip Serah Terima / Disposal" urls={handoverPhotos} size={layout === '4x6' ? 'sm' : 'lg'} />
                            )}
                        </div>

                        {/* ISO 14064 Technical Section */}
                        <div className={cn(
                            "relative z-10 rounded-xl overflow-hidden text-left",
                            layout === '4x6' ? "p-2.5 bg-slate-50 border border-slate-200 mt-auto" : "p-5 my-4 bg-slate-900 text-white shadow-xl"
                        )}>
                            <p className={cn(
                                "font-black uppercase tracking-widest flex items-center gap-1 mb-1.5 text-left",
                                layout === '4x6' ? "text-[7px] text-primary" : "text-[9px] text-primary"
                            )}>
                                <Info className="w-2.5 h-2.5" /> Spesifikasi Teknis ISO 14064
                            </p>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-left">
                                <div className="space-y-0.5 text-left">
                                    <p className={cn("font-black uppercase opacity-50 text-left", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>Model/S.N</p>
                                    <p className={cn("font-bold truncate text-left", layout === '4x6' ? "text-[8.5px]" : "text-xs")}>{asset.accessory1 || '-'}</p>
                                </div>
                                <div className="space-y-0.5 text-left">
                                    <p className={cn("font-black uppercase opacity-50 text-left", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>Tipe/Jenis</p>
                                    <p className={cn("font-bold truncate text-left", layout === '4x6' ? "text-[8.5px]" : "text-xs")}>{asset.accessory2 || '-'}</p>
                                </div>
                                <div className="space-y-0.5 text-left">
                                    <p className={cn("font-black uppercase opacity-50 text-left", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>Fuel/Ref</p>
                                    <p className={cn("font-bold truncate text-left", layout === '4x6' ? "text-[8.5px]" : "text-xs")}>{asset.accessory3 || '-'}</p>
                                </div>
                                <div className="space-y-0.5 text-left">
                                    <p className={cn("font-black uppercase opacity-50 text-left", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>Volume/Cap</p>
                                    <p className={cn("font-bold truncate text-left", layout === '4x6' ? "text-[8.5px]" : "text-xs")}>{asset.accessory4 || '-'}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Footer Authority & Timestamp Block */}
                    <div className={cn(
                        "relative z-10 pt-2 border-t border-slate-200 flex justify-between items-end",
                        layout === '4x6' ? "mt-2" : "mt-6 pb-2"
                    )}>
                        <div className="space-y-0.5 max-w-[260px] text-left">
                            <p className={cn("font-bold text-slate-400 uppercase text-left leading-tight", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>
                                Dokumen ini secara otomatis disahihkan oleh sistem inventaris perusahaan.
                            </p>
                            <p className={cn("font-mono font-bold text-slate-300 uppercase text-left", layout === '4x6' ? "text-[4.5px]" : "text-[7px]")}>
                                DOC ID: {asset.id.toUpperCase()}
                            </p>
                        </div>
                        <div className="text-right flex flex-col items-end gap-0.5">
                             <div className={cn("font-black bg-slate-900 text-white rounded-md px-2 py-0.5", layout === '4x6' ? "text-[6.5px]" : "text-[10px] px-3 py-1")}>
                                AUTHORIZED IT DEPT
                             </div>
                             <p className={cn("font-bold text-slate-400 uppercase", layout === '4x6' ? "text-[5.5px]" : "text-[8px]")}>
                                Dicetak: {format(new Date(), 'dd/MM/yyyy HH:mm')}
                             </p>
                        </div>
                    </div>
                </div>
              )}
            </div>
          </ScrollArea>
        </DialogContent>
      </DialogPortal>
    </Dialog>
  );
}