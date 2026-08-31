'use client';

/**
 * @fileOverview Dialog Berbagi Label Thermal Aset IT (58mm).
 * Mengonversi format cetak browser/thermal menjadi gambar bitmap PNG yang sama persis (384px / 58mm),
 * sehingga dapat dibagikan via WhatsApp, diunduh, disalin, atau dicetak langsung ke printer thermal.
 */

import { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { type ComputerAsset } from '@/lib/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Share2, Download, Copy, Check, Printer, Image as ImageIcon, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { sendRawBluetooth, compileComputerEscPos } from '@/lib/bluetooth-printer';

interface ShareComputerQrDialogProps {
  asset: ComputerAsset | null;
  mainAssetId?: string | null;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function ShareComputerQrDialog({ asset, mainAssetId, isOpen, onOpenChange }: ShareComputerQrDialogProps) {
  const { toast } = useToast();
  const [labelImageUrl, setLabelImageUrl] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isCopyingImage, setIsCopyingImage] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [isPrintingBt, setIsPrintingBt] = useState(false);

  const host = typeof window !== 'undefined' ? window.location.origin : '';
  const publicUrl = asset ? `${host}/public/asset?assetId=${mainAssetId || asset.id}` : '';

  useEffect(() => {
    if (isOpen && asset) {
      const renderThermalLabelImage = async () => {
        setIsGenerating(true);
        try {
          // 1. Generate DataURL QR Code
          const qrDataUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 140 });

          // 2. Buat kontainer off-screen dengan lebar persis 58mm (384px)
          const container = document.createElement('div');
          container.style.position = 'absolute';
          container.style.left = '-9999px';
          container.style.top = '-9999px';
          container.style.width = '384px'; // 384px = 58mm standard width
          container.style.backgroundColor = '#ffffff';
          container.style.color = '#000000';
          container.style.padding = '16px 12px';
          container.style.fontFamily = 'monospace, Courier, monospace';
          container.style.boxSizing = 'border-box';

          const userVal = asset.currentUser || asset.user || '-';
          const deptVal = asset.department || '-';
          const brandVal = asset.brandModel || '-';
          const cpuVal = asset.cpu || '-';
          const ramVal = asset.ram || '-';
          const diskVal = `${asset.storage || '-'}${asset.storage2 ? ` + ${asset.storage2}` : ''}`;
          const gpuVal = asset.gpu || '-';
          const osVal = asset.os || '-';
          const ipVal = asset.ipAddress || '-';
          const snVal = asset.serialNumber || '-';

          container.innerHTML = `
            <div style="text-align: center; font-weight: 900; font-size: 15px; font-family: monospace; letter-spacing: -0.5px;">PT. CHINA GLAZE INDONESIA</div>
            <div style="text-align: center; font-size: 11px; font-weight: 700; margin-top: 2px;">IT WORKSTATION SYSTEM</div>
            <div style="border-bottom: 2px dashed #000; margin: 8px 0;"></div>
            
            <div style="text-align: center; font-weight: 900; font-size: 19px; margin-top: 2px;">${asset.computerName || asset.assetCode || '-'}</div>
            <div style="text-align: center; font-weight: 800; font-size: 13px; margin-top: 2px;">CODE: ${asset.assetCode || '-'}</div>
            <div style="border-bottom: 2px dashed #000; margin: 8px 0;"></div>

            <table style="width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; font-weight: 700;">
              <tr><td style="width: 55px; padding: 2px 0;">User</td><td style="width: 10px;">:</td><td>${userVal}</td></tr>
              <tr><td style="padding: 2px 0;">Dept</td><td>:</td><td>${deptVal}</td></tr>
              ${brandVal !== '-' ? `<tr><td style="padding: 2px 0;">Brand</td><td>:</td><td>${brandVal}</td></tr>` : ''}
              ${cpuVal !== '-' ? `<tr><td style="padding: 2px 0;">CPU</td><td>:</td><td>${cpuVal}</td></tr>` : ''}
              ${ramVal !== '-' ? `<tr><td style="padding: 2px 0;">RAM</td><td>:</td><td>${ramVal}</td></tr>` : ''}
              ${diskVal !== '-' ? `<tr><td style="padding: 2px 0;">Disk</td><td>:</td><td>${diskVal}</td></tr>` : ''}
              ${gpuVal !== '-' ? `<tr><td style="padding: 2px 0;">GPU</td><td>:</td><td>${gpuVal}</td></tr>` : ''}
              ${osVal !== '-' ? `<tr><td style="padding: 2px 0;">OS</td><td>:</td><td>${osVal}</td></tr>` : ''}
              ${ipVal !== '-' ? `<tr><td style="padding: 2px 0;">IP</td><td>:</td><td>${ipVal}</td></tr>` : ''}
              ${snVal !== '-' ? `<tr><td style="padding: 2px 0;">S/N</td><td>:</td><td>${snVal}</td></tr>` : ''}
            </table>

            <div style="border-bottom: 2px dashed #000; margin: 8px 0;"></div>

            <div style="text-align: center; margin-top: 6px;">
              <img src="${qrDataUrl}" style="width: 140px; height: 140px; display: block; margin: 0 auto;" />
              <div style="font-size: 11px; font-weight: 900; margin-top: 4px;">SCAN UNTUK VERIFIKASI</div>
              <div style="font-size: 9px; font-weight: 600; color: #222; word-break: break-all; margin-top: 2px;">${publicUrl.replace(/^https?:\/\//, '')}</div>
            </div>

            <div style="border-bottom: 2px dashed #000; margin: 8px 0;"></div>
            <div style="text-align: center; font-size: 10px; font-weight: 900; letter-spacing: 0.5px;">ASSET LABELLING SYSTEM</div>
          `;

          document.body.appendChild(container);

          const canvas = await html2canvas(container, {
            backgroundColor: '#ffffff',
            scale: 2,
            useCORS: true,
            logging: false
          });

          document.body.removeChild(container);

          setLabelImageUrl(canvas.toDataURL('image/png'));
        } catch (e) {
          console.error('Failed to generate thermal label image:', e);
        } finally {
          setIsGenerating(false);
        }
      };
      renderThermalLabelImage();
    } else {
      setLabelImageUrl(null);
    }
  }, [isOpen, asset, publicUrl]);

  if (!asset) return null;

  const handleShareLabelImage = async () => {
    if (!labelImageUrl) return;

    try {
      const response = await fetch(labelImageUrl);
      const blob = await response.blob();
      const labelFile = new File([blob], `label-thermal-${asset.assetCode || asset.computerName}.png`, { type: 'image/png' });

      if (navigator.canShare && navigator.canShare({ files: [labelFile] })) {
        await navigator.share({
          title: `Label Thermal Aset IT: ${asset.computerName}`,
          text: `Gambar Label Thermal 58mm Aset IT ${asset.computerName} (${asset.assetCode}). Siap dicetak pada printer thermal Bluetooth!`,
          files: [labelFile]
        });
        toast({ title: 'Berhasil Dibagikan', description: 'Gambar label thermal 58mm berhasil dikirim.' });
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: `Label Thermal Aset IT: ${asset.computerName}`,
          text: `Label Thermal 58mm: ${asset.computerName} (${asset.assetCode})\n🔗 ${publicUrl}`,
          url: publicUrl
        });
        toast({ title: 'Berhasil Dibagikan' });
        return;
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        console.error('Error sharing label image:', err);
      }
    }
  };

  const handleDownloadLabelImage = () => {
    if (!labelImageUrl) return;
    const a = document.createElement('a');
    a.href = labelImageUrl;
    a.download = `label-thermal-${asset.assetCode || asset.computerName}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    toast({ title: 'Gambar Label Diunduh', description: 'File gambar label thermal 58mm berhasil disimpan.' });
  };

  const handleCopyLabelImage = async () => {
    if (!labelImageUrl) return;
    setIsCopyingImage(true);
    try {
      const response = await fetch(labelImageUrl);
      const blob = await response.blob();
      if (navigator.clipboard && window.ClipboardItem) {
        const item = new window.ClipboardItem({ 'image/png': blob });
        await navigator.clipboard.write([item]);
        setCopiedText(true);
        toast({ title: 'Gambar Label Disalin', description: 'Gambar label thermal 58mm telah disalin ke papan klip.' });
        setTimeout(() => setCopiedText(false), 2000);
      } else {
        toast({ variant: 'destructive', title: 'Fitur Tidak Didukung', description: 'Gunakan tombol Unduh untuk menyimpan gambar.' });
      }
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal Menyalin Gambar' });
    } finally {
      setIsCopyingImage(false);
    }
  };

  const handlePrintBluetoothDirect = async () => {
    setIsPrintingBt(true);
    try {
      const bytes = await compileComputerEscPos(asset, mainAssetId || null);
      await sendRawBluetooth(bytes, toast);
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Cetak Bluetooth', description: err.message });
    } finally {
      setIsPrintingBt(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md rounded-[2.5rem] bg-slate-900 border-slate-800 text-white p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="text-left space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-2.5 bg-purple-500/20 text-purple-400 rounded-xl border border-purple-500/30">
                <ImageIcon className="w-5 h-5" />
              </div>
              <DialogTitle className="text-base font-black uppercase tracking-wider text-white">Bagikan Label Thermal (58mm)</DialogTitle>
            </div>
            <Badge className="bg-purple-500/20 text-purple-300 border-purple-500/30 text-[9px] uppercase font-bold">
              Exact Thermal Layout
            </Badge>
          </div>
          <DialogDescription className="text-slate-400 text-xs">
            Gambar label 58mm ini dibuat sama persis seperti hasil cetak browser & thermal printer.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 my-2">
          {/* Pratinjau Gambar Label Thermal 58mm */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 flex flex-col items-center justify-center min-h-[280px]">
            {isGenerating ? (
              <div className="flex flex-col items-center gap-3 py-12 text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin text-purple-400" />
                <p className="text-xs font-bold uppercase tracking-wider">Membentuk Gambar Label Thermal...</p>
              </div>
            ) : labelImageUrl ? (
              <div className="bg-white p-2 rounded-xl shadow-2xl border border-slate-700">
                <img 
                  src={labelImageUrl} 
                  alt={`Label Thermal ${asset.computerName}`} 
                  className="max-w-[240px] h-auto object-contain mx-auto shadow-md rounded-lg" 
                />
              </div>
            ) : (
              <p className="text-xs text-rose-400 italic">Gagal membuat gambar label.</p>
            )}
          </div>
        </div>

        <DialogFooter className="flex flex-col gap-2 sm:flex-col">
          <Button 
            onClick={handleShareLabelImage} 
            disabled={!labelImageUrl || isGenerating}
            className="w-full bg-purple-600 hover:bg-purple-500 text-white font-bold h-11 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-purple-600/30"
          >
            <Share2 className="w-4 h-4 mr-2" /> Bagikan Gambar Label Thermal
          </Button>

          <div className="grid grid-cols-2 gap-2 w-full">
            <Button 
              onClick={handleDownloadLabelImage} 
              disabled={!labelImageUrl || isGenerating}
              variant="outline" 
              className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white font-bold h-10 rounded-xl text-[11px] uppercase"
            >
              <Download className="w-3.5 h-3.5 mr-1.5 text-purple-400" /> Unduh Gambar (.PNG)
            </Button>
            <Button 
              onClick={handleCopyLabelImage} 
              disabled={!labelImageUrl || isGenerating || isCopyingImage}
              variant="outline" 
              className="border-slate-700 text-slate-200 hover:bg-slate-800 hover:text-white font-bold h-10 rounded-xl text-[11px] uppercase"
            >
              {copiedText ? <Check className="w-3.5 h-3.5 mr-1.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5 mr-1.5 text-indigo-400" />}
              {copiedText ? 'Gambar Disalin' : 'Salin Gambar'}
            </Button>
          </div>

          <Button 
            onClick={handlePrintBluetoothDirect} 
            disabled={isPrintingBt}
            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 rounded-xl text-xs uppercase tracking-wider mt-1"
          >
            {isPrintingBt ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Printer className="w-4 h-4 mr-2" />}
            Cetak Bluetooth Langsung (58mm)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
