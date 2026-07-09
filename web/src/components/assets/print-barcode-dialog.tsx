

'use client';

import { useState, useEffect } from 'react';
import JsBarcode from 'jsbarcode';
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
import { Loader2, Printer, Ticket } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import Image from 'next/image';

interface PrintBarcodeDialogProps {
  selectedAssets: Asset[];
  children: React.ReactNode;
}

interface BarcodeInfo {
    id: string;
    dataUrl: string;
    code: string;
    name: string;
    location: string;
}

export default function PrintBarcodeDialog({ selectedAssets, children }: PrintBarcodeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [barcodes, setBarcodes] = useState<BarcodeInfo[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && selectedAssets.length > 0) {
      setIsLoading(true);
      const generateCodes = async () => {
        try {
          const codes = await Promise.all(
            selectedAssets.map(async (asset) => {
              const canvas = document.createElement('canvas');
              return new Promise<BarcodeInfo>((resolve, reject) => {
                try {
                  JsBarcode(canvas, asset.code, {
                    format: 'CODE128',
                    width: 2.5,
                    height: 60,
                    displayValue: false,
                    margin: 0,
                  });
                  resolve({
                    id: asset.id,
                    dataUrl: canvas.toDataURL('image/png'),
                    code: asset.code,
                    name: asset.name,
                    location: asset.location,
                  });
                } catch (e) {
                  reject(e);
                }
              });
            })
          );
          setBarcodes(codes);
        } catch (error) {
          console.error("Failed to generate Barcodes: ", error);
          toast({
            variant: "destructive",
            title: "Gagal Membuat Barcode",
            description: "Terjadi kesalahan saat membuat gambar barcode."
          });
        } finally {
          setIsLoading(false);
        }
      };
      generateCodes();
    }
  }, [isOpen, selectedAssets, toast]);
  
  const handlePrint = () => {
    const printWindow = window.open('', '', 'width=220,height=113'); // approx 58mm x 30mm
    if (!printWindow) {
      toast({
        variant: 'destructive',
        title: 'Gagal Membuka Jendela Cetak',
        description: 'Mohon izinkan pop-up untuk situs ini.',
      });
      return;
    }

    printWindow.document.write('<html><head><title>Cetak Barcode Aset</title>');
    printWindow.document.write(`
      <style>
        @page {
          size: 58mm 30mm;
          margin: 0;
        }
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, sans-serif;
          -webkit-print-color-adjust: exact;
          background-color: white;
          color: black;
        }
        .barcode-label {
          width: 58mm;
          height: 30mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
          text-align: center;
          page-break-after: always;
        }
        .text-section {
          width: 100%;
          padding: 0 1mm;
          box-sizing: border-box;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: center;
        }
        .location, .name, .code {
            width: 100%;
            word-wrap: break-word;
            border-bottom: 1px solid black;
            padding: 0.5mm 0;
            box-sizing: border-box;
        }
        .location {
            font-size: 10pt;
            font-weight: bold;
        }
        .name {
            font-size: 9pt;
        }
        .code {
            font-size: 16pt;
            font-weight: bold;
            line-height: 1.1; /* Adjust line height for wrapped text */
        }
        .barcode-img-container {
            flex-grow: 1;
            display: flex;
            align-items: center;
            justify-content: center;
            width: 100%;
        }
        .barcode-img-container img {
          max-width: 95%;
          height: 10mm;
          object-fit: contain;
        }
      </style>
    `);
    printWindow.document.write('</head><body>');
    
    barcodes.forEach(item => {
      printWindow.document.write(`
        <div class="barcode-label">
            <div class="text-section">
                <div class="location">${item.location}</div>
                <div class="name">${item.name}</div>
                <div class="code">${item.code}</div>
            </div>
            <div class="barcode-img-container">
              <img src="${item.dataUrl}" alt="Barcode for ${item.code}" />
            </div>
        </div>
      `);
    });

    printWindow.document.write('</body></html>');
    printWindow.document.close();
    printWindow.focus();

    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  };


  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Cetak Barcode</DialogTitle>
          <DialogDescription>
            Pratinjau barcode untuk aset yang dipilih. Tata letak dioptimalkan untuk label ukuran 58mm x 30mm.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="flex justify-center items-center h-48">
            <Loader2 className="h-8 w-8 animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md place-items-center">
            {barcodes.map((barcode) => (
              <div key={barcode.id} className="bg-white text-black p-1 rounded-md shadow-md" style={{ width: '219px', height: '113px' }}>
                 <div className="barcode-label" style={{width: '100%', height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', textAlign: 'center'}}>
                    <div className="text-section" style={{width: '100%', padding: '0 1mm', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center'}}>
                        <div className="location" style={{fontSize: '10pt', fontWeight: 'bold', width: '100%', borderBottom: '1px solid black', padding: '0.5mm 0', boxSizing: 'border-box'}}>{barcode.location}</div>
                        <div className="name" style={{fontSize: '9pt', width: '100%', borderBottom: '1px solid black', padding: '0.5mm 0', boxSizing: 'border-box'}}>{barcode.name}</div>
                        <div className="code" style={{fontSize: '16pt', fontWeight: 'bold', width: '100%', borderBottom: '1px solid black', padding: '0.5mm 0', boxSizing: 'border-box', wordWrap: 'break-word', lineHeight: 1.1}}>{barcode.code}</div>
                    </div>
                    <div className="barcode-img-container" style={{flexGrow: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%'}}>
                      <Image
                        src={barcode.dataUrl}
                        alt={`Barcode for ${barcode.code}`}
                        width={180}
                        height={38}
                        style={{ height: '10mm', maxWidth: '95%', objectFit: 'contain' }}
                      />
                    </div>
                 </div>
              </div>
            ))}
          </div>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="secondary">
              Tutup
            </Button>
          </DialogClose>
          <Button type="button" onClick={handlePrint} disabled={isLoading || barcodes.length === 0}>
            <Printer className="mr-2 h-4 w-4" />
            Cetak Label
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
