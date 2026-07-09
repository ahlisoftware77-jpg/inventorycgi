'use client';

/**
 * @fileOverview Halaman Pemindaian NFC untuk Verifikasi Aset.
 * Fitur: Deteksi tag NDEF, parsing URL verifikasi, dan menu aksi terpadu.
 */

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { 
  Loader2, 
  Wifi, 
  ShieldCheck, 
  Zap, 
  Info, 
  Eye, 
  ArrowRightLeft, 
  Recycle, 
  ClipboardEdit,
  X,
  SmartphoneNfc,
  AlertTriangle
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

export default function ScanNFCPage() {
  const [isSupported, setIsSupported] = useState<boolean | null>(null);
  const [isReading, setIsReading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [nfcError, setNfcError] = useState<string | null>(null);
  
  // Scanned Asset Actions
  const [scannedAsset, setScannedAsset] = useState<Asset | null>(null);
  const [isActionDialogOpen, setIsActionDialogOpen] = useState(false);
  const [isMutationFormOpen, setIsMutationFormOpen] = useState(false);
  const [mutationType, setMutationType] = useState<'mutasi' | 'disposal' | 'edit'>('mutasi');

  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if ('NDEFReader' in window) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const handleNfcReading = useCallback(async (event: any) => {
    const { message, serialNumber } = event;
    console.log(`> Serial Number: ${serialNumber}`);
    
    for (const record of message.records) {
      if (record.recordType === "url") {
        const decoder = new TextDecoder();
        const url = decoder.decode(record.data);
        processScannedUrl(url);
        return;
      }
    }
    
    toast({ variant: 'destructive', title: 'Data Tidak Valid', description: 'Tag NFC tidak berisi tautan verifikasi aset.' });
  }, [toast]);

  const startNfcScan = async () => {
    try {
      setNfcError(null);
      // @ts-ignore
      const ndef = new NDEFReader();
      await ndef.scan();
      setIsReading(true);
      
      ndef.addEventListener("readingerror", () => {
        toast({ variant: 'destructive', title: 'Gagal Membaca', description: 'Gagal membaca tag NFC. Dekatkan perangkat ke chip.' });
      });

      ndef.addEventListener("reading", handleNfcReading);

    } catch (error: any) {
      console.error("NFC Scan Error:", error);
      setNfcError(error.message || 'Gagal memulai pemindaian NFC.');
      setIsReading(false);
    }
  };

  const processScannedUrl = async (url: string) => {
    setIsVerifying(true);
    let assetId = '';

    try {
        const urlObj = new URL(url);
        assetId = urlObj.searchParams.get('assetId') || '';
    } catch (e) {
        const match = url.match(/assetId=([^&]+)/);
        if (match) assetId = match[1];
    }

    if (!assetId) {
        toast({ variant: 'destructive', title: 'Format Salah', description: 'URL NFC tidak mengandung ID Aset yang valid.' });
        setIsVerifying(false);
        return;
    }

    try {
      const assetDoc = await getDoc(doc(db, "assets", assetId));
      if (assetDoc.exists()) {
        const assetData = { id: assetDoc.id, ...assetDoc.data() } as Asset;
        setScannedAsset(assetData);
        setIsActionDialogOpen(true);
        toast({ title: 'Aset Dideteksi', description: assetData.name });
      } else {
        toast({ variant: 'destructive', title: 'Data Tidak Ditemukan', description: 'Aset tidak terdaftar di database.' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Error', description: 'Kesalahan saat mengambil data aset.' });
    } finally {
      setIsVerifying(false);
    }
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
      <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-700">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Sistem Deteksi NFC</h1>
                <p className="text-sm text-slate-500 font-medium">Verifikasi identitas aset melalui protokol NDEF Nirkabel.</p>
            </div>
            <div className="flex items-center gap-3 bg-white dark:bg-slate-900 p-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <Badge variant="outline" className="h-8 px-4 font-black uppercase text-[10px] tracking-widest text-primary border-primary/20 bg-primary/5">
                    <ShieldCheck className="w-3 h-3 mr-1.5" /> NDEF Security
                </Badge>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            <div className="lg:col-span-7">
                <Card className="border-none shadow-2xl bg-slate-900 overflow-hidden rounded-[3rem] relative ring-8 ring-white dark:ring-slate-900">
                    <div className="relative aspect-[3/4] flex flex-col items-center justify-center p-12 text-center overflow-hidden">
                        
                        {/* Background Effect */}
                        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(37,99,235,0.1),transparent_70%)]" />
                        
                        {!isReading && !isVerifying && (
                            <div className="relative z-10 space-y-8 animate-in zoom-in-95">
                                <div className="p-10 bg-primary/10 rounded-full border-2 border-primary/20 shadow-2xl animate-pulse">
                                    <SmartphoneNfc className="h-20 w-20 text-primary" />
                                </div>
                                <div className="space-y-3">
                                    <h3 className="text-2xl font-black text-white uppercase">Siap Memindai</h3>
                                    <p className="text-slate-400 text-sm leading-relaxed max-w-xs mx-auto">Dekatkan bagian belakang ponsel Anda ke tag NFC aset untuk memulai proses verifikasi.</p>
                                </div>
                                {isSupported === false ? (
                                    <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl flex items-start gap-3 text-left">
                                        <AlertTriangle className="h-5 w-5 text-rose-500 shrink-0 mt-0.5" />
                                        <p className="text-[10px] font-bold text-rose-200 uppercase leading-relaxed">Browser atau perangkat Anda tidak mendukung fitur Web NFC. Gunakan Google Chrome pada Android.</p>
                                    </div>
                                ) : (
                                    <Button 
                                        size="lg" 
                                        onClick={startNfcScan}
                                        className="rounded-full px-12 h-16 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-2xl shadow-primary/20"
                                    >
                                        AKTIFKAN ANTENA
                                    </Button>
                                )}
                            </div>
                        )}

                        {isReading && !isVerifying && (
                            <div className="relative z-10 space-y-8 text-white animate-in fade-in">
                                <div className="relative">
                                    <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-20" />
                                    <div className="p-10 bg-primary/20 rounded-full border-2 border-primary/40 relative z-10">
                                        <Wifi className="h-20 w-20 text-primary rotate-90" />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <Badge className="bg-emerald-500 text-white border-none px-4 py-1 rounded-full text-[10px] font-black tracking-widest">LISTENING...</Badge>
                                    <h3 className="text-2xl font-black uppercase">Mencari Sinyal Tag</h3>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Dekatkan Perangkat Ke Chip</p>
                                </div>
                                <Button variant="ghost" onClick={() => setIsReading(false)} className="text-slate-500 font-bold uppercase text-xs tracking-widest hover:text-white">Batalkan</Button>
                            </div>
                        )}

                        {isVerifying && (
                            <div className="relative z-10 flex flex-col items-center gap-6 text-white animate-in fade-in">
                                <Loader2 className="h-16 w-16 animate-spin text-primary" />
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black uppercase">Otentikasi</h3>
                                    <p className="text-slate-400 text-[10px] uppercase font-black tracking-widest">Validasi Data Aset Terdeteksi</p>
                                </div>
                            </div>
                        )}

                        {nfcError && (
                            <div className="relative z-10 space-y-6 text-center animate-in zoom-in-95">
                                <div className="p-6 bg-rose-500/10 rounded-full border-2 border-rose-500/20 inline-block">
                                    <X className="h-12 w-12 text-rose-500" />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-black text-white uppercase">Error Deteksi</h3>
                                    <p className="text-slate-400 text-xs">{nfcError}</p>
                                </div>
                                <Button onClick={startNfcScan} variant="outline" className="rounded-full px-8 font-black uppercase text-xs tracking-widest text-white border-white/20">Coba Lagi</Button>
                            </div>
                        )}
                    </div>
                </Card>
            </div>

            <div className="lg:col-span-5 space-y-6">
                <Card className="border-none shadow-xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] p-8">
                    <CardHeader className="p-0 mb-6">
                        <div className="flex items-center gap-3 mb-2">
                            <Zap className="h-5 w-5 text-amber-500 fill-amber-500" />
                            <CardTitle className="text-lg font-black uppercase tracking-tight">Panduan NFC</CardTitle>
                        </div>
                        <CardDescription className="text-xs font-medium">Langkah optimal pemindaian chip.</CardDescription>
                    </CardHeader>
                    <CardContent className="p-0 space-y-6">
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">1</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Aktifkan fitur NFC pada pengaturan sistem ponsel Anda.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">2</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tempelkan bagian antena NFC (biasanya dekat kamera) ke label aset.</p>
                        </div>
                        <div className="flex items-start gap-4">
                            <div className="h-8 w-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-black text-xs shrink-0 mt-1">3</div>
                            <p className="text-sm font-medium text-slate-600 dark:text-slate-300">Tunggu hingga menu opsi verifikasi muncul secara otomatis.</p>
                        </div>
                    </CardContent>
                </Card>

                <Card className="border-none shadow-xl bg-emerald-600 rounded-[2.5rem] p-8 text-white">
                    <div className="flex items-start gap-4">
                        <div className="p-3 bg-white/20 rounded-2xl shrink-0">
                            <Info className="h-6 w-6 text-white" />
                        </div>
                        <div className="space-y-2">
                            <h4 className="font-black uppercase tracking-tight">Kelebihan NFC</h4>
                            <p className="text-xs leading-relaxed text-emerald-50 font-medium">Pemindaian NFC lebih cepat dan tahan terhadap kondisi cahaya minim dibandingkan barcode optik, sangat ideal untuk area gudang yang gelap.</p>
                        </div>
                    </div>
                </Card>
            </div>
        </div>
      </div>

      {/* Action Selection Dialog (Identik dengan QR Scan) */}
      <Dialog open={isActionDialogOpen} onOpenChange={setIsActionDialogOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-md border-none shadow-2xl bg-white dark:bg-slate-950 rounded-[2.5rem]">
            <div className="px-8 py-10 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                <div className="p-4 bg-primary/20 rounded-full backdrop-blur-md mb-2 border border-primary/30">
                    <SmartphoneNfc className="w-10 h-10 text-primary" />
                </div>
                <DialogTitle className="text-2xl font-black tracking-tight uppercase">Aset Terdeteksi via NFC</DialogTitle>
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
                <Button variant="ghost" onClick={() => setIsActionDialogOpen(false)} className="rounded-full font-bold text-slate-400">
                    Tutup Menu
                </Button>
            </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reusable Mutation Form */}
      {scannedAsset && (
        <MutationForm
            asset={scannedAsset}
            isOpen={isMutationFormOpen}
            onOpenChange={setIsMutationFormOpen}
            mutationType={mutationType}
        />
      )}
    </DashboardLayout>
  );
}
