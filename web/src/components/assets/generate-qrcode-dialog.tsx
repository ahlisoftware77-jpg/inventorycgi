'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { Loader2, Printer, Bluetooth, BluetoothConnected, BluetoothSearching, Share2 } from 'lucide-react';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import html2canvas from 'html2canvas';
import { compileAssetEscPos } from '@/lib/bluetooth-printer';

interface GenerateQrCodeDialogProps {
  selectedAssets: Asset[];
  children: React.ReactNode;
}

const imageToEscPos = (imageData: ImageData): Uint8Array[] => {
    const { width, height, data } = imageData;
    const threshold = 128;
    const chunks: Uint8Array[] = [];

    // Add initialize printer command
    chunks.push(new Uint8Array([0x1B, 0x40]));
    
    // Set line spacing to 24 dots (can be adjusted)
    chunks.push(new Uint8Array([0x1B, 0x33, 24]));

    for (let y = 0; y < height; y += 24) {
        // ESC * m n1 n2 d1...dk
        // m = 33 (24-dot density)
        // n1 = widthL, n2 = widthH
        const command = new Uint8Array([0x1B, 0x2A, 33, width & 0xFF, (width >> 8) & 0xFF]);
        const slice = new Uint8Array(width * 3);

        for (let x = 0; x < width; x++) {
            for (let bit = 0; bit < 24; bit++) {
                const y_offset = y + bit;
                if (y_offset >= height) {
                    continue; // Past the end of the image
                }

                const pixel_index = (y_offset * width + x) * 4;
                const r = data[pixel_index];
                const g = data[pixel_index + 1];
                const b = data[pixel_index + 2];
                const grayscale = 0.299 * r + 0.587 * g + 0.114 * b;
                
                if (grayscale < threshold) {
                    slice[x * 3 + Math.floor(bit / 8)] |= (0x80 >> (bit % 8));
                }
            }
        }
        
        const combined = new Uint8Array(command.length + slice.length);
        combined.set(command, 0);
        combined.set(slice, command.length);
        chunks.push(combined);
        // Add a line feed
        chunks.push(new Uint8Array([0x0A]));
    }
    
    // Feed lines and cut paper
    chunks.push(new Uint8Array([0x1B, 0x64, 4])); // Feed 4 lines
    return chunks;
};

// Helper to draw Dotted QR with Logo
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
    ctx.fillStyle = 'black';

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
                const centerStart = Math.floor(moduleCount / 2) - 2;
                const centerEnd = Math.ceil(moduleCount / 2) + 1;
                if (row >= centerStart && row <= centerEnd && col >= centerStart && col <= centerEnd) {
                    continue;
                }

                const isTopLeftEye = row < 7 && col < 7;
                const isTopRightEye = row < 7 && col >= moduleCount - 7;
                const isBottomLeftEye = row >= moduleCount - 7 && col < 7;

                if (!isTopLeftEye && !isTopRightEye && !isBottomLeftEye) {
                    const dotRadius = cellSize * 0.48; 
                    ctx.beginPath();
                    ctx.arc(
                        col * cellSize + cellSize / 2,
                        row * cellSize + cellSize / 2,
                        dotRadius,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                } else {
                    const cornerRadius = cellSize * 0.2;
                    const mx = col * cellSize;
                    const my = row * cellSize;
                    ctx.beginPath();
                    ctx.moveTo(mx + cornerRadius, my);
                    ctx.lineTo(mx + cellSize - cornerRadius, my);
                    ctx.quadraticCurveTo(mx + cellSize, my, mx + cellSize, my + cornerRadius);
                    ctx.lineTo(mx + cellSize, my + cellSize - cornerRadius);
                    ctx.quadraticCurveTo(mx + cellSize, my + cellSize, mx + cellSize - cornerRadius, my + cellSize);
                    ctx.lineTo(mx + cornerRadius, my + cellSize);
                    ctx.quadraticCurveTo(mx, my + cellSize, mx, my + cellSize - cornerRadius);
                    ctx.lineTo(mx, my + cornerRadius);
                    ctx.quadraticCurveTo(mx, my, mx + cornerRadius, my);
                    ctx.fill();
                }
            }
        }
    }

    const logoSize = size * 0.22;
    const logoX = (size - logoSize) / 2;
    const logoY = (size - logoSize) / 2;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(size / 2, size / 2, (logoSize / 2) + 2, 0, Math.PI * 2);
    ctx.fill();

    return new Promise<string>((resolve) => {
        const logoImg = new window.Image();
        logoImg.src = '/cgi.png';
        logoImg.onload = () => {
            ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
            resolve(canvas.toDataURL('image/png'));
        };
        logoImg.onerror = () => resolve(canvas.toDataURL('image/png'));
    });
};

export default function GenerateQrCodeDialog({ selectedAssets, children }: GenerateQrCodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [qrCodes, setQrCodes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [isPrinting, setIsPrinting] = useState(false);
  const [useBluetooth, setUseBluetooth] = useState(false);
  const [device, setDevice] = useState<BluetoothDevice | null>(null);
  const [characteristic, setCharacteristic] = useState<BluetoothRemoteGATTCharacteristic | null>(null);
  const { toast } = useToast();
  const [canShare, setCanShare] = useState(false);

  const qrRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }
  }, []);

  useEffect(() => {
    if (isOpen && selectedAssets.length > 0) {
      const generateCodes = async () => {
        setIsLoading(true);
        qrRefs.current = [];
        try {
          const codes = await Promise.all(
            selectedAssets.map((asset) => {
              let publicUrl = `${window.location.origin}/public/asset?assetId=${asset.id}`;
              if (asset.status === 'Bukan_Asset_Perusahaan') {
                  publicUrl = `${window.location.origin}/public/personal?id=${asset.id}`;
              } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
                  publicUrl = `${window.location.origin}/public/utility?id=${asset.id}`;
              }
              return drawDottedQRCode(publicUrl, 400);
            })
          );
          setQrCodes(codes);
        } catch (err) {
          console.error('Failed to generate QR codes', err);
        } finally {
          setIsLoading(false);
        }
      };
      generateCodes();
    }
  }, [isOpen, selectedAssets]);
  
  const connectToPrinter = async () => {
    if (!navigator.bluetooth) {
      toast({ variant: 'destructive', title: 'Web Bluetooth tidak didukung', description: 'Browser Anda tidak mendukung Web Bluetooth API.' });
      return;
    }
    setIsConnecting(true);
    try {
      const targetServices = [
        '00001101-0000-1000-8000-00805f9b34fb', // SPP
        '000018f0-0000-1000-8000-00805f9b34fb', // Generic Printer
        '0000ffe0-0000-1000-8000-00805f9b34fb', // FFE0
        '0000ffe1-0000-1000-8000-00805f9b34fb', // FFE1
        '0000ae30-0000-1000-8000-00805f9b34fb', // AE30
        '0000af30-0000-1000-8000-00805f9b34fb', // AF30
        'e7e10001-ac28-433e-87ec-a4df2c5d4886', // Rongta BLE
        '49535343-fe7d-4ae5-8fa9-9fafd205e455'  // ISSC
      ];
      
      const btDevice = await navigator.bluetooth.requestDevice({
        acceptAllDevices: true,
        optionalServices: targetServices
      });
      const server = await btDevice.gatt?.connect();
      if (!server) throw new Error('Gagal menghubungkan ke GATT server.');

      let service: BluetoothRemoteGATTService | null = null;
      let char: BluetoothRemoteGATTCharacteristic | null = null;

      for (const serviceUuid of targetServices) {
        try {
          service = await server.getPrimaryService(serviceUuid);
          if (service) {
            const characteristics = await service.getCharacteristics();
            for (const c of characteristics) {
              if (c.properties.write || c.properties.writeWithoutResponse) {
                char = c;
                break;
              }
            }
            if (char) break;
          }
        } catch (e) {
          // Skip unsupported services silently
        }
      }
      
      if (!char) {
        throw new Error('No Services matching UUID found in Device.');
      }
      
      setDevice(btDevice);
      setCharacteristic(char);

      toast({ title: 'Berhasil Terhubung', description: `Terhubung dengan printer ${btDevice.name || 'Thermal'}.` });
      
      btDevice.addEventListener('gattserverdisconnected', () => {
        setDevice(null);
        setCharacteristic(null);
        toast({ variant: 'destructive', title: 'Koneksi Terputus', description: `Koneksi dengan printer ${btDevice.name} terputus.` });
      });

    } catch (error: any) {
      console.error('Gagal terhubung ke printer:', error);
      let errorMsg = error.message || 'Gagal menghubungkan ke printer.';
      const lowerMsg = errorMsg.toLowerCase();
      if (lowerMsg.includes('gatt') || lowerMsg.includes('connection attempt') || lowerMsg.includes('failed to connect') || lowerMsg.includes('networkerror')) {
        errorMsg = 'Koneksi GATT Gagal. 1) Pastikan printer Bluetooth tidak terhubung ke HP/perangkat lain. 2) Jika printer Anda menggunakan Bluetooth Classic (memerlukan PIN), harap gunakan tombol "Cetak Browser (58mm)" setelah printer ditambahkan di sistem.';
      }
      toast({ variant: 'destructive', title: 'Gagal Terhubung', description: errorMsg });
    } finally {
      setIsConnecting(false);
    }
  };

  const disconnectPrinter = () => {
    device?.gatt?.disconnect();
  };

  const handlePrint = () => {
    const printWindow = window.open('', '', 'height=265,width=220');
    if (printWindow) {
      const isSingleItem = selectedAssets.length === 1;
      const pageStyle = `
        <style>
            @media print {
              @page { size: 58mm auto; margin: 0; }
              html, body { margin: 0; padding: 0; width: 58mm; -webkit-print-color-adjust: exact; }
              .qr-code-item { ${isSingleItem ? '' : 'page-break-after: always;'} }
            }
            body { font-family: Arial, sans-serif; margin: 0; padding: 0; box-sizing: border-box; }
            .qr-code-item { display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; width: 100%; padding: 2mm; box-sizing: border-box; }
            .qr-code-item img { width: 95%; height: auto; object-fit: contain; }
            .qr-code-item p { margin: 0; font-family: Arial, sans-serif; word-wrap: break-word; }
            .asset-name { font-size: 10pt; font-weight: bold; }
            .asset-code { font-size: 17pt; font-weight: bold; margin-bottom: 1mm; white-space: nowrap; }
            .asset-detail { font-size: 10pt; }
            .public-link { font-size: 7pt; color: #666; margin-top: 1mm; font-family: monospace; }
        </style>
      `;

      const allQrHtml = selectedAssets.map((asset, index) => {
          let publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/asset?assetId=${asset.id.slice(0,6)}...`;
          if (asset.status === 'Bukan_Asset_Perusahaan') {
              publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/personal?id=${asset.id.slice(0,6)}...`;
          } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
              publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/utility?id=${asset.id.slice(0,6)}...`;
          }
          return `
          <div class="qr-code-item">
              <p class="asset-code">${asset.code}</p>
              <img src="${qrCodes[index]}" alt="QR Code for ${asset.name}" />
              <p class="asset-detail"><span class="asset-name">${asset.name}</span></p>
              <p class="asset-detail">${asset.location}</p>
              <p class="public-link">${publicUrl}</p>
          </div>
      `}).join('');

      printWindow.document.write(`<html><head><title>Cetak QR Code</title>${pageStyle}</head><body>${allQrHtml}</body></html>`);
      printWindow.document.close();
      
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    }
  };

  const handlePrintA4 = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) return;

    const pageStyle = `
      <style>
        @media print { @page { size: A4; margin: 1cm; } body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; } }
        body { font-family: Arial, sans-serif; }
        .grid-container { display: grid; grid-template-columns: repeat(4, 1fr); gap: 5mm; width: 190mm; }
        .qr-code-item-a4 { page-break-inside: avoid; text-align: center; border: 1px solid #ccc; padding: 2mm; display: flex; flex-direction: column; align-items: center; justify-content: center; width: 45mm; height: 45mm; }
        .qr-code-item-a4 img { max-width: 100%; height: 25mm; object-fit: contain; margin-bottom: 1mm; }
        .qr-code-item-a4 p { margin: 0; font-family: Arial, sans-serif; word-wrap: break-word; }
        .asset-name-a4 { font-size: 7pt; font-weight: bold; }
        .asset-code-a4 { font-size: 10pt; font-weight: bold; }
        .public-link-a4 { font-size: 5pt; color: #888; font-family: monospace; }
      </style>
    `;

    const allQrHtml = selectedAssets.map((asset, index) => {
        let publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/asset?id=${asset.id.slice(0,6)}...`;
        if (asset.status === 'Bukan_Asset_Perusahaan') {
            publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/personal?id=${asset.id.slice(0,6)}...`;
        } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
            publicUrl = `${window.location.origin.replace(/^https?:\/\//, '')}/public/utility?id=${asset.id.slice(0,6)}...`;
        }
        return `
        <div class="qr-code-item-a4">
            <p class="asset-code-a4">${asset.code}</p>
            <img src="${qrCodes[index]}" alt="QR Code for ${asset.name}" />
            <p class="asset-name-a4">${asset.name}</p>
            <p style="font-size: 7pt;">${asset.location}</p>
            <p class="public-link-a4">${publicUrl}</p>
        </div>
    `}).join('');

    printWindow.document.write(`<html><head><title>Cetak QR Code A4</title>${pageStyle}</head><body><div class="grid-container">${allQrHtml}</div></body></html>`);
    printWindow.document.close();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };

  const handleBluetoothPrint = async () => {
    if (!characteristic) {
      toast({ variant: 'destructive', title: 'Tidak ada printer terhubung', description: 'Harap hubungkan ke printer Bluetooth terlebih dahulu.' });
      return;
    }
    setIsPrinting(true);
    try {
      for (const asset of selectedAssets) {
        const bytes = compileAssetEscPos(asset);
        
        // Send bytes in chunks
        const MAX_CHUNK_SIZE = 512;
        for (let i = 0; i < bytes.length; i += MAX_CHUNK_SIZE) {
            const chunk = bytes.slice(i, i + MAX_CHUNK_SIZE);
            await characteristic.writeValueWithoutResponse(chunk);
        }
      }

      toast({ title: 'Berhasil Mencetak', description: 'Data label telah dikirim ke printer.' });
    } catch (error: any) {
      console.error('Gagal mencetak via Bluetooth:', error);
      toast({ variant: 'destructive', title: 'Gagal Mencetak', description: error.message });
    } finally {
      setIsPrinting(false);
    }
  };

  const handleShare = async () => {
    const filesToShare: File[] = [];

    for (const [index, asset] of selectedAssets.entries()) {
        const qrElement = qrRefs.current[index];
        if (qrElement) {
            try {
                const canvas = await html2canvas(qrElement, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
                const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
                if (blob) {
                    const file = new File([blob], `qrcode-${asset.code || asset.id}.png`, { type: 'image/png' });
                    filesToShare.push(file);
                }
            } catch (err) {
                console.error("Error converting element to canvas:", err);
            }
        }
    }

    if (filesToShare.length === 0) return;

    if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        try {
            await navigator.share({
                files: filesToShare,
                title: `QR Code Aset Resmi PT. CGI`,
                text: `Berikut adalah QR code verifikasi publik untuk ${selectedAssets.length > 1 ? `${selectedAssets.length} aset` : selectedAssets[0].name}.`,
            });
        } catch (error) {
            if ((error as DOMException).name !== 'AbortError') {
              toast({ variant: 'destructive', title: 'Gagal Membagikan' });
            }
        }
    }
};
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-900 text-white">
        <DialogHeader className="p-6">
          <DialogTitle className="text-white">Generate QR Code Verifikasi</DialogTitle>
          <DialogDescription className="text-slate-400">
            QR Code ini berisi tautan verifikasi publik yang dapat dipindai oleh siapa saja untuk validasi aset resmi di lapangan.
          </DialogDescription>
        </DialogHeader>
        
        <div className="p-6 space-y-4">
          <div className="bg-slate-800 p-4 rounded-lg">
            <div className="flex items-center space-x-2">
                <Switch id="bluetooth-mode" checked={useBluetooth} onCheckedChange={setUseBluetooth} />
                <Label htmlFor="bluetooth-mode" className="text-white">Gunakan Printer Bluetooth</Label>
            </div>

            {useBluetooth && (
                <Alert className="mt-4 bg-slate-700 border-slate-600 text-white">
                    <Bluetooth className="h-4 w-4 text-white" />
                    <AlertTitle>Mode Cetak Bluetooth</AlertTitle>
                    <AlertDescription className="text-slate-300 text-xs">
                        Hubungkan ke printer thermal (58mm). Pastikan printer dalam jangkauan Bluetooth.
                    </AlertDescription>
                    <div className="mt-4">
                        {device ? (
                            <div className="flex items-center gap-2">
                                <p className="text-xs text-green-400 font-medium">Terhubung: {device.name}</p>
                                <Button variant="destructive" size="sm" onClick={disconnectPrinter}>Putuskan</Button>
                            </div>
                        ) : (
                            <Button onClick={connectToPrinter} disabled={isConnecting} variant="secondary" size="sm">
                                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BluetoothSearching className="mr-2 h-4 w-4" />}
                                Cari Printer
                            </Button>
                        )}
                    </div>
                </Alert>
            )}
          </div>

          {isLoading ? (
            <div className="flex justify-center items-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 items-center justify-items-center rounded-md">
              {selectedAssets.map((asset, index) => {
                let publicUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/asset?id={asset.id.slice(0,6)}...`;
                if (asset.status === 'Bukan_Asset_Perusahaan') {
                    publicUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/personal?id=${asset.id.slice(0,6)}...`;
                } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
                    publicUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/utility?id=${asset.id.slice(0,6)}...`;
                }
                return (
                <div 
                  key={asset.id} 
                  ref={el => qrRefs.current[index] = el}
                  className="flex flex-col items-center p-2 text-center bg-white text-black"
                  style={{ width: '210px' }}
                >
                  <p className="asset-code" style={{fontSize: '17pt', fontWeight: 'bold', margin: '0', whiteSpace: 'nowrap'}}>{asset.code}</p>
                  <Image
                    src={qrCodes[index]}
                    alt={`QR Code for ${asset.name}`}
                    width={150}
                    height={150}
                    className="mt-1"
                  />
                  <p className="asset-detail" style={{fontSize: '9pt', margin: '0', fontWeight: 'bold'}}>{asset.name}</p>
                  <p style={{fontSize: '8pt', margin: '0'}}>{asset.location}</p>
                  <p style={{fontSize: '6pt', color: '#888', marginTop: '1mm', fontFamily: 'monospace'}}>{publicUrlText}</p>
                </div>
              )})}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-slate-700 flex flex-wrap justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">Tutup</Button>
          </DialogClose>
           <div className="flex gap-2 flex-wrap">
            {canShare && (
              <Button onClick={handleShare} disabled={isLoading || qrCodes.length === 0} variant="outline" className="border-purple-500 text-purple-400 hover:bg-purple-500/10">
                <Share2 className="mr-2 h-4 w-4" />
                Bagikan
              </Button>
            )}
            {useBluetooth ? (
              <Button onClick={handleBluetoothPrint} disabled={isLoading || qrCodes.length === 0 || !characteristic || isPrinting}>
                  {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BluetoothConnected className="mr-2 h-4 w-4" />}
                  Cetak Bluetooth
              </Button>
            ) : (
              <>
                <Button type="button" onClick={handlePrint} disabled={isLoading || qrCodes.length === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak 58mm
                </Button>
                <Button type="button" onClick={handlePrintA4} disabled={isLoading || qrCodes.length === 0} variant="outline">
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak A4
                </Button>
              </>
            )}
           </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
