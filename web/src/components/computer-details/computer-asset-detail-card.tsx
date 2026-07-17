'use client';

import { type ComputerAsset, type Asset } from '@/lib/types';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Cpu, 
  MemoryStick, 
  HardDrive, 
  Monitor, 
  Info, 
  Calendar as CalendarIcon, 
  Building as BuildingIcon, 
  Settings2, 
  Key, 
  ShieldCheck,
  Hash,
  User as UserIcon,
  Wrench,
  ExternalLink,
  Package as PackageIcon,
  Printer
} from 'lucide-react';
import QRCode from 'qrcode';
import { Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import ComputerAssetForm from './computer-asset-form';
import { useState, useEffect, useMemo } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { printCanvasBluetooth } from '@/lib/bluetooth-printer';
import html2canvas from 'html2canvas';

interface ComputerAssetDetailCardProps {
  asset: ComputerAsset;
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

export default function ComputerAssetDetailCard({ asset }: ComputerAssetDetailCardProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [mainAsset, setMainAsset] = useState<Asset | null>(null);
  const canEdit = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Section Head';

  const deptStyle = useMemo(() => getDeptColor(mainAsset?.location || 'IT'), [mainAsset?.location]);

  useEffect(() => {
    async function fetchMainAsset() {
        if (asset.assetCode) {
            const mainQuery = query(collection(db, 'assets'), where('code', '==', asset.assetCode));
            const mainSnap = await getDocs(mainQuery);
            if (!mainSnap.empty) {
                setMainAsset({ id: mainSnap.docs[0].id, ...mainSnap.docs[0].data() } as Asset);
            }
        }
    }
    fetchMainAsset();
  }, [asset.assetCode]);

  const handlePrintLabel = async () => {
    try {
      const qrData = `${window.location.origin}/public/asset?assetId=${mainAsset?.id || asset.id}`;
      const qrUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
      
      const printWindow = window.open('', '', 'width=400,height=600');
      if (!printWindow) return;

      const html = `
        <html>
          <head>
            <title>Label Workstation ${asset.computerName}</title>
            <style>
              @page { size: 58mm auto; margin: 2mm; }
              body { font-family: monospace; font-size: 8pt; margin: 0; padding: 0; color: black; background: white; text-align: center; }
              .container { width: 48mm; margin: 0 auto; box-sizing: border-box; padding: 2px; }
              .header { font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 4px; margin-bottom: 6px; font-size: 7.5pt; text-transform: uppercase; }
              .title { font-weight: bold; font-size: 10pt; text-transform: uppercase; margin: 2px 0; letter-spacing: 0.5px; }
              .code { font-weight: bold; font-size: 11pt; border: 1px solid black; display: inline-block; padding: 2px 6px; margin: 4px 0; }
              
              .specs-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 7.5pt; text-align: left; }
              .specs-table td { padding: 1.5px 0; vertical-align: top; }
              .label { font-weight: bold; width: 32%; }
              .colon { width: 5%; text-align: center; }
              .val { width: 63%; word-break: break-all; }
              
              .qr-container { margin: 8px 0; display: flex; justify-content: center; align-items: center; flex-direction: column; }
              .qr-img { width: 35mm; height: 35mm; }
              .footer { border-top: 1px dashed black; padding-top: 4px; margin-top: 6px; font-size: 7pt; color: #555; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                PT. China Glaze Indonesia<br>IT DEPARTMENT
              </div>
              <div class="title">${asset.computerName}</div>
              <div class="code">${asset.assetCode}</div>
              
              <table class="specs-table">
                <tr><td class="label">User</td><td class="colon">:</td><td class="val">${asset.currentUser || '-'}</td></tr>
                <tr><td class="label">Dept</td><td class="colon">:</td><td class="val">${asset.department}</td></tr>
                <tr><td class="label">CPU</td><td class="colon">:</td><td class="val">${asset.cpu}</td></tr>
                <tr><td class="label">RAM</td><td class="colon">:</td><td class="val">${asset.ram}</td></tr>
                <tr><td class="label">Disk</td><td class="colon">:</td><td class="val">${asset.storage}${asset.storage2 ? ` + ${asset.storage2}` : ''}</td></tr>
                <tr><td class="label">OS</td><td class="colon">:</td><td class="val">${asset.os || '-'}</td></tr>
                <tr><td class="label">IP</td><td class="colon">:</td><td class="val">${asset.ipAddress || '-'}</td></tr>
              </table>
              
              <div class="qr-container">
                <img class="qr-img" src="${qrUrl}" />
                <div style="font-size: 6pt; margin-top: 2px;">SCAN UNTUK VERIFIKASI</div>
              </div>
              
              <div class="footer">
                ASSET LABELLING SYSTEM
              </div>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

    } catch (error) {
      console.error("Error generating QR Code label:", error);
    }
  };

  const handlePrintLabelBluetooth = async () => {
    try {
      const qrData = `${window.location.origin}/public/asset?assetId=${mainAsset?.id || asset.id}`;
      const qrUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });

      const tempDiv = document.createElement('div');
      tempDiv.style.cssText = `
        position: absolute;
        top: -9999px;
        left: -9999px;
        width: 384px;
        background: white;
        color: black;
        font-family: monospace;
        text-align: center;
        padding: 12px;
        box-sizing: border-box;
      `;

      tempDiv.innerHTML = `
        <div style="border-bottom: 2px dashed black; padding-bottom: 6px; margin-bottom: 10px; font-size: 15px; font-weight: bold; text-transform: uppercase;">
          PT. China Glaze Indonesia<br>IT DEPARTMENT
        </div>
        <div style="font-weight: bold; font-size: 22px; text-transform: uppercase; margin: 4px 0;">${asset.computerName}</div>
        <div style="font-weight: bold; font-size: 24px; border: 2px solid black; display: inline-block; padding: 4px 12px; margin: 8px 0;">${asset.assetCode}</div>
        
        <table style="width: 100%; border-collapse: collapse; margin: 12px 0; font-size: 14px; text-align: left;">
          <tr><td style="font-weight: bold; width: 30%; padding: 4px 0;">User</td><td style="width: 5%;">:</td><td>${asset.currentUser || '-'}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">Dept</td><td>:</td><td>${asset.department}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">CPU</td><td>:</td><td>${asset.cpu}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">RAM</td><td>:</td><td>${asset.ram}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">Disk</td><td>:</td><td>${asset.storage}${asset.storage2 ? ` + ${asset.storage2}` : ''}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">OS</td><td>:</td><td>${asset.os || '-'}</td></tr>
          <tr><td style="font-weight: bold; padding: 4px 0;">IP</td><td>:</td><td>${asset.ipAddress || '-'}</td></tr>
        </table>
        
        <div style="margin: 15px 0; display: flex; flex-direction: column; align-items: center; justify-content: center;">
          <img src="${qrUrl}" style="width: 180px; height: 180px;" />
          <div style="font-size: 11px; margin-top: 4px; font-weight: bold;">SCAN UNTUK VERIFIKASI</div>
        </div>
        
        <div style="border-top: 2px dashed black; padding-top: 6px; margin-top: 10px; font-size: 12px; font-weight: bold; color: #555;">
          ASSET LABELLING SYSTEM
        </div>
      `;

      document.body.appendChild(tempDiv);
      const canvas = await html2canvas(tempDiv, { backgroundColor: '#ffffff', scale: 1 });
      document.body.removeChild(tempDiv);

      await printCanvasBluetooth(canvas, toast);

    } catch (error: any) {
      console.error("Error generating label for bluetooth:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyiapkan Label', description: error.message });
    }
  };

  return (
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
        
        {/* Watermark Logo Background */}
        <div className="absolute top-0 right-0 p-8 opacity-[0.05] pointer-events-none">
            <Monitor className="w-80 h-80 rotate-12" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 relative z-10 text-left">
          
          <SectionLabel title="Spesifikasi Hardware" emoji="💻" dark />
          <DetailRow label="Processor (CPU)" value={asset.cpu} emoji="🧠" className="col-span-2 bg-black/15 border-white/5" dark />
          <DetailRow label="RAM" value={asset.ram} emoji="⚡" dark />
          <DetailRow label="Penyimpanan 1" value={asset.storage} emoji="💾" dark />
          <DetailRow label="Penyimpanan 2" value={asset.storage2} emoji="💾" dark />
          <DetailRow label="Kartu Grafis (GPU)" value={asset.gpu} emoji="🖥️" className="col-span-2" dark />
          <DetailRow label="Merk / Model" value={asset.brandModel} emoji="ℹ️" className="col-span-2" dark />

          <SectionLabel title="Software & Konektivitas" emoji="🌐" dark />
          <DetailRow label="Sistem Operasi" value={asset.os} emoji="🖥️" className="col-span-2" dark />
          <DetailRow label="Antivirus" value={asset.antivirus} emoji="🛡️" dark />
          <DetailRow label="IP Address" value={asset.ipAddress} emoji="🌐" dark />
          <DetailRow label="MAC Address" value={asset.macAddress} emoji="🏷️" dark />
          <DetailRow label="Lisensi Windows" value={asset.windowsLicense} emoji="🔑" dark />
          <DetailRow label="Lisensi Office" value={asset.officeLicense} emoji="🔑" dark />

          <SectionLabel title="Administrasi & Pengadaan" emoji="🏢" dark />
          <DetailRow label="Serial Number" value={asset.serialNumber} emoji="🔢" className="col-span-2" dark />
          <DetailRow label="Tanggal Pembelian" value={formatDate(asset.purchaseDate)} emoji="📅" dark />
          <DetailRow label="Penyedia (Vendor)" value={asset.supplier} emoji="🏢" className="col-span-2" dark />
          <DetailRow label="Catatan Teknis" value={asset.notes} emoji="📝" className="col-span-full bg-black/10 border-white/5 border-dashed" dark />
        </div>

        <div className="mt-6 pt-5 border-t border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4 text-left">
            <div className="flex flex-wrap gap-2 text-left w-full md:w-auto">
                {mainAsset && (
                  <Link href={`/assets/asset?assetId=${mainAsset.id}`} className="h-8 px-4 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-1.5 shadow-sm">
                      <PackageIcon className="w-3.5 h-3.5" /> Profile Aset Utama
                  </Link>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                <button 
                    onClick={handlePrintLabelBluetooth} 
                    className="rounded-lg h-8 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-indigo-800 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-1.5"
                >
                    <Printer className="h-3.5 w-3.5" /> Cetak Bluetooth (58mm)
                </button>

                <button 
                    onClick={handlePrintLabel} 
                    className="rounded-lg h-8 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-1.5"
                >
                    <Printer className="h-3.5 w-3.5" /> Cetak Browser (58mm)
                </button>

                <Link href={`/computer-details/asset?computerId=${asset.id}`} className="rounded-lg h-8 bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-sky-800 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-1.5">
                    <ExternalLink className="h-3.5 w-3.5" /> IT Detail
                </Link>

                {canEdit && (
                    <ComputerAssetForm asset={asset}>
                        <button className="rounded-lg h-8 bg-slate-700 hover:bg-slate-800 text-white font-bold text-[10px] uppercase tracking-wider px-3.5 border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-1.5">
                            <Edit className="h-3.5 w-3.5" /> Edit Spesifikasi
                        </button>
                    </ComputerAssetForm>
                )}
            </div>
        </div>
      </div>
    </motion.div>
  );
}