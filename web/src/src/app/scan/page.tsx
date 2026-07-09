
'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader, NotFoundException, ChecksumException, FormatException } from '@zxing/library';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { Loader2, Video, VideoOff, ScanLine } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const router = useRouter();
  const { toast } = useToast();
  const codeReader = useRef(new BrowserMultiFormatReader());

  const handleScanResult = useCallback(async (result: string) => {
    // 1. Try to parse as JSON (for QR Codes from this app)
    try {
      const data = JSON.parse(result);
      if (data.assetId && data.assetCode) {
        toast({
          title: 'QR Code Terdeteksi',
          description: `Mengarahkan ke detail aset: ${data.assetCode}`,
        });
        router.push(`/assets/${data.assetId}`);
        return;
      }
    } catch (e) {
      // Not a JSON QR code, proceed to treat as a simple string (barcode)
    }

    // 2. Treat as a plain string (from a barcode) and query Firestore
    try {
      toast({
          title: 'Barcode Terdeteksi',
          description: `Mencari aset dengan kode: ${result}`,
      });

      const q = query(collection(db, "assets"), where("code", "==", result));
      const querySnapshot = await getDocs(q);

      if (!querySnapshot.empty) {
        const assetDoc = querySnapshot.docs[0];
        router.push(`/assets/${assetDoc.id}`);
      } else {
        toast({
          variant: 'destructive',
          title: 'Aset Tidak Ditemukan',
          description: `Tidak ada aset yang ditemukan dengan kode barcode "${result}".`,
        });
        resetScanner();
      }
    } catch (error) {
      console.error('Error querying asset by barcode:', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Terjadi kesalahan saat mencari aset. Silakan coba lagi.',
      });
      resetScanner();
    }
  }, [router, toast]);

  useEffect(() => {
    let controls: any;
    if (hasCameraPermission && isScanning && videoRef.current) {
        codeReader.current.decodeFromVideoDevice(undefined, videoRef.current, (result, error, ctrls) => {
          controls = ctrls;
          if (result) {
            setIsScanning(false);
            setScanResult(result.getText());
            handleScanResult(result.getText());
          }
          if (error && !(error instanceof NotFoundException || error instanceof ChecksumException || error instanceof FormatException)) {
            console.error('ZXing error:', error);
          }
        }).catch(err => console.error("Failed to start decoding", err));
    }
    
    return () => {
      // Stop the scanner when component unmounts or deps change
      if (controls) {
        controls.stop();
      }
    };
  }, [hasCameraPermission, isScanning, handleScanResult]);
  
  useEffect(() => {
     // Request camera permission on mount
    navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        .then(stream => {
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
            setHasCameraPermission(true);
        })
        .catch(error => {
            console.error('Error accessing camera:', error);
            setHasCameraPermission(false);
            toast({
              variant: 'destructive',
              title: 'Akses Kamera Ditolak',
              description: 'Mohon izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur ini.',
            });
        });
    
    return () => {
      // Clean up camera stream
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject as MediaStream;
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [toast]);


  const resetScanner = () => {
    setScanResult(null);
    setIsScanning(true);
  }

  return (
    <DashboardLayout>
       <style jsx>{`
        .scan-line {
          position: absolute;
          left: 0;
          right: 0;
          top: 50%;
          height: 3px;
          background: #ef4444; /* red-500 */
          box-shadow: 0 0 10px #ef4444;
          animation: scan 2s linear infinite;
        }
        @keyframes scan {
          0% { top: 0%; }
          50% { top: 100%; }
          100% { top: 0%; }
        }
      `}</style>
      <Card className="w-full h-full">
        <CardHeader>
          <CardTitle>Pindai Barcode / QR Code</CardTitle>
          <CardDescription>
            Arahkan kamera ke barcode atau QR code pada label aset untuk melihat detailnya.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="relative w-full aspect-video bg-muted rounded-md overflow-hidden flex items-center justify-center">
            {hasCameraPermission === null && (
              <div className="flex flex-col items-center gap-2 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p>Meminta izin kamera...</p>
              </div>
            )}
            {hasCameraPermission === false && (
              <div className="flex flex-col items-center gap-4 text-destructive p-4 text-center">
                <VideoOff className="h-12 w-12" />
                <Alert variant="destructive">
                  <AlertTitle>Kamera Tidak Dapat Diakses</AlertTitle>
                  <AlertDescription>
                    Kami tidak dapat mengakses kamera Anda. Pastikan Anda telah memberikan izin di pengaturan browser Anda dan tidak ada aplikasi lain yang sedang menggunakan kamera.
                  </AlertDescription>
                </Alert>
                <Button onClick={() => window.location.reload()}>Coba Lagi</Button>
              </div>
            )}
            {hasCameraPermission === true && (
                <>
                    <video ref={videoRef} className="w-full h-full object-cover" />
                    {isScanning && <div className="scan-line"></div>}
                </>
            )}
            {scanResult && !isScanning && (
                <div className="absolute inset-0 bg-background/90 flex flex-col items-center justify-center gap-4 p-4">
                     <Alert>
                        <ScanLine className="h-4 w-4"/>
                        <AlertTitle>Hasil Pindaian</AlertTitle>
                        <AlertDescription className="break-all">
                            {scanResult}
                        </AlertDescription>
                    </Alert>
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-muted-foreground">Memproses data...</p>
                </div>
            )}
          </div>
          <div className="mt-4 text-center">
            <Button onClick={resetScanner} disabled={isScanning}>
              Pindai Lagi
            </Button>
          </div>
        </CardContent>
      </Card>
    </DashboardLayout>
  );
}
