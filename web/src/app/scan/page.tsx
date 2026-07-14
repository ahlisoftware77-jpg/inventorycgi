'use client';

/**
 * @fileOverview Halaman Scanner Verifikasi Aset dengan manajemen resource yang ketat.
 * Fitur: Deteksi QR otomatis, penghentian kamera instan saat navigasi, dan pelepasan hardware total.
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/library';
import { collection, query, where, getDocs, doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, 
  VideoOff, 
  QrCode, 
  ShieldCheck, 
  Zap, 
  Info, 
  Eye, 
  ArrowRightLeft, 
  Recycle, 
  ClipboardEdit,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from '@/components/ui/dialog';
import { type Asset } from '@/lib/types';
import MutationForm from '@/components/mutations/mutation-form';

export default function ScanPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const controlsRef = useRef<IScannerControls | null>(null);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [scanResult, setScanResult] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(true);
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Scanned Asset Actions
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isMutationFormOpen, setIsMutationFormOpen] = useState(false);
  const [mutationType, setMutationType] = useState<'mutasi' | 'disposal' | 'edit'>('mutasi');

  const router = useRouter();
  const { toast } = useToast();
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Fungsi untuk mematikan kamera secara total dan cermat
  const stopCamera = useCallback(() => {
    // 1. Hentikan kontrol ZXing
    if (controlsRef.current) {
      controlsRef.current.stop();
      controlsRef.current = null;
    }
    
    // 2. Reset reader
    codeReader.current.reset();

    // 3. Matikan semua track media
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        track.stop();
        track.enabled = false;
      });
      streamRef.current = null;
    }

    // 4. Bersihkan elemen video
    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.load(); // Paksa browser melepaskan hardware
    }
  }, []);

  const handleScanResult = useCallback(async (result: string) => {
    // Matikan kamera SEGERA setelah kode terbaca
    stopCamera();
    setIsScanning(false);
    setIsVerifying(true);
    setScanResult(result);

    let assetId = '';
    
    if (result.includes('assetId=')) {
        try {
            const url = new URL(result);
            assetId = url.searchParams.get('assetId') || '';
        } catch (e) { 
            const match = result.match(/assetId=([^&]+)/);
            if (match) assetId = match[1];
        }
    }

    try {
      let foundAsset: Asset | null = null;

      if (assetId) {
        const assetDoc = await getDoc(doc(db, "assets", assetId));
        if (assetDoc.exists()) {
            foundAsset = { id: assetDoc.id, ...assetDoc.data() } as Asset;
        }
      }

      if (!foundAsset) {
        const q = query(collection(db, "assets"), where("code", "==", result));
        const querySnapshot = await getDocs(q);
        if (!querySnapshot.empty) {
            foundAsset = { id: querySnapshot.docs[0].id, ...querySnapshot.docs[0].data() } as Asset;
        }
      }

      if (foundAsset) {
        setScannedAsset(foundAsset);
        setIsActionDialogOpen(true);
        toast({ title: 'Aset Ditemukan', description: foundAsset.name });
      } else {
        toast({ 
            variant: 'destructive', 
            title: 'Data Tidak Ditemukan', 
            description: `Aset dengan kode/ID tersebut tidak terdaftar.` 
        });
        setIsScanning(true); // Izinkan scan lagi jika tidak ditemukan
      }
    } catch (error) {
      console.error('Error querying asset:', error);
      toast({ variant: 'destructive', title: 'Error', description: 'Terjadi kesalahan saat memproses data.' });
      setIsScanning(true);
    } finally {
      setIsVerifying(false);
    }
  }, [toast, stopCamera]);

  // Hook utama untuk inisialisasi dan pembersihan kamera
  useEffect(() => {
    if (isScanning) {
        const startCamera = async () => {
            const constraints = {
                video: {
                    facingMode: { ideal: 'environment' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
                }
            };
            try {
                let stream;
                try {
                    stream = await navigator.mediaDevices.getUserMedia(constraints);
                } catch (e) {
                    console.warn("Retrying with fallback video constraints...", e);
                    stream = await navigator.mediaDevices.getUserMedia({ video: true });
                }
                streamRef.current = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    
                    // Mulai proses decode zxing menggunakan stream aktif untuk mencegah bentrok kamera
                    codeReader.current.decodeFromStream(stream, videoRef.current, (result, error) => {
                        if (result) {
                            handleScanResult(result.getText());
                        }
                    }).then(ctrls => {
                        if (ctrls) controlsRef.current = ctrls;
                    }).catch(err => console.error("Decoding failure", err));
                }
                setHasCameraPermission(true);
            } catch (err) {
                console.error("All camera accesses failed:", err);
                setHasCameraPermission(false);
            }
        };
        startCamera();
    } else {
        stopCamera();
    }

    // Cleanup mutlak saat komponen dilepas atau navigasi berpindah
    return () => {
        stopCamera();
    };
  }, [isScanning, stopCamera, handleScanResult]);

  const resetScanner = () => { 
    setScanResult(null); 
    setScannedAsset(null);
    setIsActionDialogOpen(false);
    setIsScanning(true); 
  };

  const handleAction = (type: 'detail' | 'mutasi' | 'disposal' | 'edit') => {
    if (!scannedAsset) return;

    if (type === 'detail') {
        router.push(`/public/asset?assetId=${scannedAsset.id}`);
    } else {
        setMutationType(type as any);
        setIsMutationFormOpen(true);
        setIsActionDialogOpen(false);
    }
  };

  return (
    <DashboardLayout>
       <style jsx>{`
        .scan-laser {
          position: absolute; left: 0; right: 0; top: 0%; height: 2px;
          background: linear-gradient(to right, transparent, #2563eb, transparent);
          box-shadow: 0 0 15px 2px #2563eb;
          animation: scan-move 2.5s ease-in-out infinite;
          z-index: 10;
        }
        @keyframes scan-move { 
            0% { top: 10%; opacity: 0; } 
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { top: 90%; opacity: 0; } 
        }
        .corner-brkt {
            position: absolute; width: 30px; height: 30px; border: 4px solid #2563eb;
        }
      `}</style>

      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Sistem Verifikasi QR</h1>
                <p className="text-sm text-slate-500 font-medium">Validasi identitas aset secara real-time melalui pemindaian optik.</p>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> Secured Channel
                </Badge>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Main Scanner Column */}
            <div className="lg:col-span-7">
                <Card className="border-none shadow-2xl bg-slate-950 overflow-hidden rounded-[3rem] relative ring-8 ring-white dark:ring-slate-900">
                    <div className="relative aspect-[3/4] sm:aspect-[4/5] bg-black">
                        {hasCameraPermission === null && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-slate-900 gap-4">
                                <Loader2 className="h-10 w-10 animate-spin text-primary" />
                                <p className="font-bold tracking-widest uppercase text-[10px] opacity-50">Menyiapkan Lensa...</p>
                            </div>
                        )}
                        {hasCameraPermission === false && (
                            <div className="absolute inset-0 flex flex-col items-center justify-center p-12 bg-slate-900 text-center gap-8 animate-in zoom-in-95">
                                <div className="p-6 bg-rose-500/10 rounded-full">
                                    <VideoOff className="h-16 w-16 text-rose-500" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">Kamera Terkunci</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed">Mohon izinkan akses kamera pada pengaturan browser untuk dapat memverifikasi label aset.</p>
                                </div>
                                <Button onClick={() => window.location.reload()} className="rounded-full px-10 h-12 font-black uppercase tracking-widest bg-white text-slate-900 hover:bg-slate-200">Muat Ulang</Button>
                            </div>
                        )}
                        {hasCameraPermission === true && (
                            <>
                                <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay playsInline muted />
                                
                                {isScanning && (
                                    <>
                                        <div className="scan-laser"></div>
                                        
                                        {/* Corner Brackets */}
                                        <div className="corner-brkt top-10 left-10 border-r-0 border-b-0 rounded-tl-2xl"></div>
                                        <div className="corner-brkt top-10 right-10 border-l-0 border-b-0 rounded-tr-2xl"></div>
                                        <div className="corner-brkt bottom-10 left-10 border-r-0 border-t-0 rounded-bl-2xl"></div>
                                        <div className="corner-brkt bottom-10 right-10 border-l-0 border-t-0 rounded-br-2xl"></div>

                                        <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none"></div>
                                        
                                        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-white/10 rounded-3xl pointer-events-none"></div>

                                        <div className="absolute top-8 left-0 right-0 flex justify-center">
                                            <Badge className="bg-primary/90 backdrop-blur-xl px-6 py-2 rounded-full font-black tracking-[0.2em] text-white border-none shadow-2xl animate-pulse text-[10px]">SIAP MEMINDAI</Badge>
                                        </div>
                                    </>
                                )}
                            </>
                        )}

                        {/* Verifying Overlay */}
                        {isVerifying && (
                            <div className="absolute inset-0 bg-slate-950/95 backdrop-blur-2xl flex flex-col items-center justify-center gap-8 p-12 text-center animate-in fade-in duration-500">
                                <div className="p-8 bg-primary/10 rounded-[2.5rem] border-2 border-primary/20 shadow-2xl relative">
                                    <div className="absolute -top-4 -right-4 h-12 w-12 bg-primary rounded-full flex items-center justify-center shadow-lg animate-bounce">
                                        <ShieldCheck className="h-6 w-6 text-white" />
                                    </div>
                                    <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-3xl font-black text-white uppercase tracking-tighter">Memverifikasi</h3>
                                    <p className="text-slate-400 text-[10px] font-mono break-all opacity-40 leading-relaxed max-w-[200px] mx-auto uppercase tracking-widest">{scanResult}</p>
                                </div>
                            </div>
                        )}
                    </div>
                </Card>
                
                <div className="mt-8 flex justify-center">
                    <Button 
                        size="lg" 
                        onClick={resetScanner} 
                        disabled={isScanning || isVerifying} 
                        className="rounded-full px-16 h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/20 active:scale-95 transition-all"
                    >
                        MULAI PEMINDAIAN
                    </Button>
                </div>
            </div>

            {/* Info Column */}
            <div className="lg:col-span-5 space-y-6">
                <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-8">
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Petunjuk Cepat</CardTitle>
                        </div>
                        <CardDescription className="text-xs font-medium">Ikuti langkah berikut untuk hasil optimal.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">1</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Posisikan kode QR tepat di tengah kotak bingkai yang tersedia.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">2</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Sistem akan memverifikasi keaslian data secara otomatis.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">3</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Pilih tindakan audit yang diperlukan (Detail, Mutasi, Disposal, atau Kondisi).</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-blue-600 rounded-[2.5rem] p-8 text-white">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                            <Info className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-black uppercase tracking-tight">Opsi Pasca-Scan</h4>
                            <p className="text-xs leading-relaxed text-blue-50 font-medium">Setelah aset teridentifikasi, Anda dapat langsung melakukan pengajuan mutasi atau perubahan kondisi aset tanpa harus mencari data secara manual.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
      </div>

      {/* Action Selection Dialog */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-white dark:bg-slate-950 rounded-[2.5rem]">
            <div className="px-8 py-10 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                <div className="p-4 bg-primary/20 rounded-full backdrop-blur-md mb-2 border border-primary/30">
                    <QrCode className="w-10 h-10 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Aset Terverifikasi</DialogTitle>
                <DialogDescription className="text-white/60 font-medium">
                    {scannedAsset?.name} ({scannedAsset?.code})
                </DialogDescription>
            </div>
            
            <div className="p-8 space-y-3">
                <Button 
                    onClick={() => handleAction('detail')}
                    variant="outline" 
                    className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border-slate-200 hover:bg-slate-50 font-black uppercase text-xs tracking-widest transition-all group"
                >
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg group-hover:bg-blue-100"><Eye className="w-5 h-5" /></div>
                    1. Lihat Detail Public
                </Button>
                
                <Button 
                    onClick={() => handleAction('edit')}
                    variant="outline" 
                    className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border-slate-200 hover:bg-slate-50 font-black uppercase text-xs tracking-widest transition-all group"
                >
                    <div className="p-2 bg-amber-50 text-amber-600 rounded-lg group-hover:bg-amber-100"><ClipboardEdit className="w-5 h-5" /></div>
                    2. Ubah Kondisi
                </Button>

                <Button 
                    onClick={() => handleAction('mutasi')}
                    variant="outline" 
                    className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border-slate-200 hover:bg-slate-50 font-black uppercase text-xs tracking-widest transition-all group"
                >
                    <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg group-hover:bg-indigo-100"><ArrowRightLeft className="w-5 h-5" /></div>
                    3. Mutasi Aset
                </Button>

                <Button 
                    onClick={() => handleAction('disposal')}
                    variant="outline" 
                    className="w-full h-14 rounded-2xl justify-start px-6 gap-4 border-slate-200 hover:bg-slate-50 font-black uppercase text-xs tracking-widest transition-all group text-rose-600 border-rose-50"
                >
                    <div className="p-2 bg-rose-50 text-rose-600 rounded-lg group-hover:bg-rose-100"><Recycle className="w-5 h-5" /></div>
                    4. Disposal Aset
                </Button>
            </div>

            <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex items-center justify-center">
                <Button variant="ghost" onClick={resetScanner} className="rounded-full font-bold text-slate-400 text-black">
                    Batal & Pindai Ulang
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Mutation Form for Scan Actions */}
      {scannedAsset && (
        <MutationForm
            asset={scannedAsset}
            isOpen={isMutationFormOpen}
            onOpenChange={(open) => {
                setIsMutationFormOpen(open);
                if (!open) resetScanner();
            }}
            mutationType={mutationType}
        />
      )}
    </DashboardLayout>
  );
}
