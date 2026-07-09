
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
    // chunks.push(new Uint8Array([0x1D, 0x56, 66, 0])); // Partial cut

    return chunks;
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
    if (navigator.share && /android/i.test(navigator.userAgent)) {
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
              const qrCodeData = JSON.stringify({ 
                company: "PT_China-Glaze_Indonesia",
                assetId: asset.id, 
                assetCode: asset.code 
              });
              return QRCode.toDataURL(qrCodeData, {
                width: 200,
                margin: 2,
                errorCorrectionLevel: 'H',
              });
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
      const SPP_SERVICE_UUID = '00001101-0000-1000-8000-00805f9b34fb';
      
      const btDevice = await navigator.bluetooth.requestDevice({
        filters: [{ services: [SPP_SERVICE_UUID] }],
        optionalServices: [SPP_SERVICE_UUID] // Some browsers need this
      });
      const server = await btDevice.gatt?.connect();
      const service = await server?.getPrimaryService(SPP_SERVICE_UUID);
      const char = await service?.getCharacteristic('00001101-0000-1000-8000-00805f9b34fb'); // Standard SPP characteristic
      
      setDevice(btDevice);
      if (char) {
        setCharacteristic(char);
      }

      toast({ title: 'Berhasil Terhubung', description: `Terhubung dengan printer ${btDevice.name}.` });
      
      btDevice.addEventListener('gattserverdisconnected', () => {
        setDevice(null);
        setCharacteristic(null);
        toast({ variant: 'destructive', title: 'Koneksi Terputus', description: `Koneksi dengan printer ${btDevice.name} terputus.` });
      });

    } catch (error) {
      console.error('Gagal terhubung ke printer:', error);
      toast({ variant: 'destructive', title: 'Gagal Terhubung', description: 'Gagal menghubungkan ke printer. Pastikan printer menyala dan dalam jangkauan.' });
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
              @page {
                size: 58mm 70mm;
                margin: 0;
              }
              html, body {
                margin: 0;
                padding: 0;
                width: 58mm;
                height: 70mm;
                -webkit-print-color-adjust: exact;
              }
              .qr-code-item {
                 ${isSingleItem ? '' : 'page-break-after: always;'}
              }
            }
            body {
              font-family: Arial, sans-serif;
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            .qr-code-item {
              display: flex;
              flex-direction: column;
              justify-content: center;
              align-items: center;
              text-align: center;
              width: 100%;
              height: 100%;
              padding: 2mm;
              box-sizing: border-box;
            }
            .qr-code-item img {
              width: 95%;
              height: auto;
              max-height: 75%;
              object-fit: contain;
            }
            .qr-code-item p { 
                margin: 0;
                font-family: Arial, sans-serif; 
                word-wrap: break-word; 
            }
            .asset-name { font-size: 10pt; font-weight: bold; }
            .asset-code { font-size: 17pt; font-weight: bold; margin-bottom: 1mm; word-break: break-all; white-space: nowrap; }
            .asset-detail { font-size: 10pt; }
        </style>
      `;

      const allQrHtml = selectedAssets.map((asset, index) => `
          <div class="qr-code-item">
              <p class="asset-code">${asset.code}</p>
              <img src="${qrCodes[index]}" alt="QR Code for ${asset.name}" />
              <p class="asset-detail"><span class="asset-name">${asset.name}</span>, ${asset.location} - ${asset.status.replace(/_/g, ' ')}</p>
          </div>
      `).join('');

      printWindow.document.write(`<html><head><title>Cetak QR Code</title>${pageStyle}</head><body>${allQrHtml}</body></html>`);
      
      printWindow.document.close();
      
      // More reliable print handling
      const printPromise = new Promise<void>(resolve => {
        if (printWindow.matchMedia) {
          const mediaQueryList = printWindow.matchMedia('print');
          const listener = (mql: MediaQueryListEvent) => {
            if (!mql.matches) {
              mediaQueryList.removeEventListener('change', listener);
              resolve();
            }
          };
          mediaQueryList.addEventListener('change', listener);
        } else {
          // Fallback for older browsers
          setTimeout(resolve, 1000); 
        }
        printWindow.print();
      });

      printPromise.then(() => {
        printWindow.close();
      });
      
    }
  };

  const handlePrintA4 = () => {
    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Gagal Membuka Jendela Cetak',
        description: 'Mohon izinkan pop-up untuk situs ini.',
      });
      return;
    }

    const pageStyle = `
      <style>
        @media print {
          @page {
            size: A4;
            margin: 1cm;
          }
          body {
            margin: 0;
            padding: 0;
            -webkit-print-color-adjust: exact;
          }
        }
        body {
          font-family: Arial, sans-serif;
        }
        .grid-container {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 5mm;
          width: 190mm; /* A4 width - margins */
        }
        .qr-code-item-a4 {
          page-break-inside: avoid;
          text-align: center;
          border: 1px solid #ccc;
          padding: 2mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          width: 45mm; /* Approx width for 4 columns */
          height: 38mm; /* Approx height for 7 rows */
        }
        .qr-code-item-a4 img {
          max-width: 100%;
          height: 25mm; /* Adjust as needed */
          object-fit: contain;
          margin-bottom: 1mm;
        }
        .qr-code-item-a4 p {
          margin: 0;
          font-family: Arial, sans-serif;
          word-wrap: break-word;
        }
        .asset-name-a4 { font-size: 7pt; font-weight: bold; }
        .asset-code-a4 { font-size: 10pt; font-weight: bold; }
        .asset-detail-a4 { font-size: 7pt; }
      </style>
    `;

    const allQrHtml = selectedAssets.map((asset, index) => `
        <div class="qr-code-item-a4">
            <p class="asset-code-a4">${asset.code}</p>
            <img src="${qrCodes[index]}" alt="QR Code for ${asset.name}" />
            <p class="asset-detail-a4"><span class="asset-name-a4">${asset.name}</span>, ${asset.location}</p>
        </div>
    `).join('');

    printWindow.document.write(`<html><head><title>Cetak QR Code A4</title>${pageStyle}</head><body><div class="grid-container">${allQrHtml}</div></body></html>`);
    printWindow.document.close();
    printWindow.focus();
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
      // Initialize printer for each print job
      await characteristic.writeValueWithoutResponse(new Uint8Array([0x1B, 0x40]));

      for (const [index, asset] of selectedAssets.entries()) {
        const qrElement = qrRefs.current[index];
        if (qrElement) {
            const canvas = await import('html2canvas').then(mod => mod.default(qrElement, { backgroundColor: '#ffffff', scale: 2 }));
            const context = canvas.getContext('2d');
            if (!context) continue;

            const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
            const escPosChunks = imageToEscPos(imageData);
            
            for (const chunk of escPosChunks) {
               // We need to split even these chunks if they are too large
               const MAX_CHUNK_SIZE = 512;
               for (let i = 0; i < chunk.length; i += MAX_CHUNK_SIZE) {
                   const subChunk = chunk.slice(i, i + MAX_CHUNK_SIZE);
                   await characteristic.writeValueWithoutResponse(subChunk);
               }
            }
        }
      }

      toast({ title: 'Berhasil Mencetak', description: 'Data QR code telah dikirim ke printer.' });
    } catch (error: any) {
      console.error('Gagal mencetak via Bluetooth:', error);
      toast({ variant: 'destructive', title: 'Gagal Mencetak', description: error.message || 'Terjadi kesalahan saat mengirim data ke printer.' });
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

    if (filesToShare.length === 0) {
        toast({ variant: 'destructive', title: 'Gagal', description: 'Tidak ada QR code yang bisa dibagikan.' });
        return;
    }

    if (navigator.canShare && navigator.canShare({ files: filesToShare })) {
        try {
            await navigator.share({
                files: filesToShare,
                title: `QR Code Aset`,
                text: `Berikut adalah QR code untuk ${selectedAssets.length > 1 ? `${selectedAssets.length} aset` : selectedAssets[0].name}.`,
            });
            toast({ title: 'Berhasil Dibagikan' });
        } catch (error) {
            console.error('Error sharing:', error);
            // Don't show toast for abort error
            if ((error as DOMException).name !== 'AbortError') {
              toast({ variant: 'destructive', title: 'Gagal Membagikan', description: 'Terjadi kesalahan saat mencoba berbagi.' });
            }
        }
    } else {
        toast({ variant: 'destructive', title: 'Tidak Dapat Berbagi', description: 'Browser Anda tidak mendukung fitur berbagi file ini.' });
    }
};
  
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto p-0 bg-slate-900 text-white">
        <DialogHeader className="p-6">
          <DialogTitle className="text-white">Generate QR Code</DialogTitle>
          <DialogDescription className="text-slate-400">
            Pilih metode cetak: cetak standar dengan pratinjau atau cetak langsung via printer thermal Bluetooth (untuk ukuran 58mm).
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
                    <AlertDescription className="text-slate-300">
                        Hubungkan ke printer thermal Anda. Pastikan printer mendukung profil SPP atau GAP. Cetakan dioptimalkan untuk kertas 58mm.
                    </AlertDescription>
                    <div className="mt-4">
                        {device ? (
                            <div className="flex items-center gap-2">
                                <p className="text-sm text-green-400 font-medium">Terhubung ke: {device.name}</p>
                                <Button variant="destructive" size="sm" onClick={disconnectPrinter}>Putuskan</Button>
                            </div>
                        ) : (
                            <Button onClick={connectToPrinter} disabled={isConnecting} variant="secondary">
                                {isConnecting ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <BluetoothSearching className="mr-2 h-4 w-4" />}
                                Cari & Hubungkan Printer
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
              {selectedAssets.map((asset, index) => (
                <div 
                  key={asset.id} 
                  ref={el => qrRefs.current[index] = el}
                  className="flex flex-col items-center p-2 text-center bg-white text-black"
                  style={{ width: '210px' }} // Approx 55.5mm at 96 DPI for canvas rendering
                >
                  <p className="asset-code" style={{fontSize: '17pt', fontWeight: 'bold', marginBottom: '1mm', margin: '0', wordBreak: 'break-all', whiteSpace: 'nowrap'}}>{asset.code}</p>
                  <Image
                    src={qrCodes[index]}
                    alt={`QR Code for ${asset.name}`}
                    width={150}
                    height={150}
                    className="mt-1"
                  />
                  <p className="asset-detail" style={{fontSize: '10pt', margin: '0'}}><span className="asset-name" style={{fontSize: '10pt', fontWeight: 'bold'}}>{asset.name}</span>, ${asset.location} - ${asset.status.replace(/_/g, ' ')}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        <DialogFooter className="p-6 border-t border-slate-700 flex flex-wrap justify-between">
          <DialogClose asChild>
            <Button type="button" variant="secondary">Tutup</Button>
          </DialogClose>
           <div className="flex gap-2 flex-wrap">
            {canShare && (
              <Button onClick={handleShare} disabled={isLoading || qrCodes.length === 0} variant="outline">
                <Share2 className="mr-2 h-4 w-4" />
                Bagikan
              </Button>
            )}
            {useBluetooth ? (
              <Button onClick={handleBluetoothPrint} disabled={isLoading || qrCodes.length === 0 || !characteristic || isPrinting}>
                  {isPrinting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <BluetoothConnected className="mr-2 h-4 w-4" />}
                  Cetak via Bluetooth
              </Button>
            ) : (
              <>
                <Button type="button" onClick={handlePrint} disabled={isLoading || qrCodes.length === 0}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak 58mm
                </Button>
                <Button type="button" onClick={handlePrintA4} disabled={isLoading || qrCodes.length === 0}>
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
