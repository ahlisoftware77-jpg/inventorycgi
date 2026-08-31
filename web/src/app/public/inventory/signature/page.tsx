'use client';

/**
 * @fileOverview Halaman Pengesahan Publik Permintaan Inventaris.
 * Memungkinkan Otoritas Persetujuan Verifikasi Departemen Peminta untuk memberikan tanda tangan digital.
 * Mendukung verifikasi batch (sekaligus) untuk beberapa item yang diajukan oleh peminta yang sama.
 */

import { Suspense, useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot, updateDoc, serverTimestamp, query, collection, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type InventoryRequest } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Loader2, 
  ShieldCheck, 
  CheckCircle2, 
  Package, 
  User, 
  Calendar, 
  Tag, 
  Building, 
  Pencil, 
  X,
  AlertCircle,
  ArrowLeft,
  Info,
  Hash
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import Image from 'next/image';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

const DetailTile = ({ label, value, icon: Icon }: { label: string, value: any, icon: any }) => (
    <div className="p-3 rounded-2xl bg-white border border-slate-100 shadow-sm flex items-center gap-3 text-left">
        <div className="p-2 bg-primary/5 rounded-xl shrink-0">
            <Icon className="h-4 w-4 text-primary" />
        </div>
        <div className="min-w-0 flex-1 text-left">
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest leading-none mb-1 text-left">{label}</p>
            <p className="text-xs font-bold text-slate-900 truncate uppercase text-left">{value || '-'}</p>
        </div>
    </div>
);

function PublicInventorySignatureContent() {
  const searchParams = useSearchParams();
  const requestId = searchParams.get('id');
  
  const [request, setRequest] = useState<InventoryRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [verifierName, setVerifierName] = useState('');
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  
  // Batch verification states
  const [relatedRequests, setRelatedRequests] = useState<InventoryRequest[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    // Listen to company name settings
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) setCompanyName(snap.data().companyName);
    });
    return () => unsubGen();
  }, []);

  useEffect(() => {
    if (!requestId) return;

    const unsubscribe = onSnapshot(doc(db, 'inventory_requests', requestId), async (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as InventoryRequest;
        setRequest(data);
        setVerifierName(data.verifierDeptName || '');

        if (data.verifierDeptSignature) {
            setIsLocked(true);
            // Fetch other requests signed with this exact signature
            try {
              const q = query(
                collection(db, 'inventory_requests'),
                where('verifierDeptSignature', '==', data.verifierDeptSignature)
              );
              const querySnap = await getDocs(q);
              const signedItems = querySnap.docs.map(d => ({ id: d.id, ...d.data() } as InventoryRequest));
              setRelatedRequests(signedItems);
              setSelectedIds(signedItems.map(item => item.id));
            } catch (err) {
              console.error("Error fetching signed requests:", err);
              setRelatedRequests([data]);
              setSelectedIds([data.id]);
            }
        } else {
            setIsLocked(false);
            // Fetch other pending requests from the same user & department that do not have a signature
            try {
              const q = query(
                collection(db, 'inventory_requests'),
                where('requestingDept', '==', data.requestingDept),
                where('requestingUserName', '==', data.requestingUserName),
                where('status', '==', 'Menunggu Persetujuan HRGA')
              );
              const querySnap = await getDocs(q);
              const otherItems = querySnap.docs
                .map(d => ({ id: d.id, ...d.data() } as InventoryRequest))
                .filter(item => !item.verifierDeptSignature); // Filter out already verified items
              
              setRelatedRequests(otherItems);
              setSelectedIds(otherItems.map(item => item.id));
            } catch (err) {
              console.error("Error fetching related requests:", err);
              setRelatedRequests([data]);
              setSelectedIds([data.id]);
            }
        }
      } else {
        setRequest(null);
      }
      setLoading(false);
    }, (error) => {
      console.error("Error fetching request details:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [requestId]);

  const handleClearSignature = () => {
    if (sigPadRef.current) {
      sigPadRef.current.clear();
    }
  };

  const handleSaveSignature = async () => {
    if (!request || isLocked) return;

    if (!verifierName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Diperlukan', description: 'Mohon isi nama Otoritas Persetujuan/Verifikator.' });
        return;
    }

    if (!sigPadRef.current || sigPadRef.current.isEmpty()) {
        toast({ variant: 'destructive', title: 'Tanda Tangan Diperlukan', description: 'Mohon bubuhkan tanda tangan pada area yang tersedia.' });
        return;
    }

    if (selectedIds.length === 0) {
        toast({ variant: 'destructive', title: 'Pilih Barang', description: 'Mohon pilih minimal satu barang untuk diverifikasi.' });
        return;
    }

    setIsUpdating(true);
    try {
        const signatureData = sigPadRef.current.toDataURL('image/png');
        const batch = writeBatch(db);

        selectedIds.forEach((id) => {
            const docRef = doc(db, 'inventory_requests', id);
            batch.update(docRef, {
                verifierDeptSignature: signatureData,
                verifierDeptName: verifierName.trim(),
                verifierDeptSignedAt: serverTimestamp()
            });
        });

        await batch.commit();

        toast({ 
            title: 'Verifikasi Berhasil', 
            description: `${selectedIds.length} permintaan barang telah berhasil diverifikasi oleh departemen peminta.` 
        });
    } catch (err) {
        console.error("Failed to save verifier signatures:", err);
        toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Terjadi kesalahan saat menyimpan tanda tangan.' });
    } finally {
        setIsUpdating(false);
    }
  };

  if (!requestId) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-6 bg-slate-50">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-16 w-16 text-rose-500 opacity-20" />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Link Tidak Valid</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">ID Permintaan Inventaris tidak ditemukan dalam tautan ini.</p>
        </div>
        <Button asChild variant="ghost" className="rounded-full font-bold uppercase text-[10px] tracking-widest text-slate-400">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Portal</Link>
        </Button>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-4 sm:p-6 space-y-6">
        <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden p-6 sm:p-8 space-y-6">
            <div className="space-y-2">
                <Skeleton className="h-8 w-2/3 rounded-xl" />
                <Skeleton className="h-4 w-1/2 rounded-xl" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
                <Skeleton className="h-14 rounded-2xl" />
            </div>
            <Skeleton className="h-64 rounded-[2rem]" />
        </Card>
      </div>
    );
  }

  if (!request) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center gap-6 bg-slate-50">
        <div className="p-6 bg-rose-50 rounded-full">
            <AlertCircle className="h-16 w-16 text-rose-500 opacity-20" />
        </div>
        <div className="space-y-2">
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900">Data Tidak Ditemukan</h1>
            <p className="text-muted-foreground text-sm max-w-xs mx-auto">Data permintaan inventaris mungkin telah dihapus atau link kedaluwarsa.</p>
        </div>
        <Button asChild variant="ghost" className="rounded-full font-bold uppercase text-[10px] tracking-widest text-slate-400">
            <Link href="/"><ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Portal</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-6">
      <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white/70 backdrop-blur-xl">
        <CardHeader className="p-6 sm:p-8 pb-4 text-left">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-primary rounded-2xl shadow-lg shadow-primary/20">
                <Package className="h-5 w-5 text-white" />
              </div>
              <div className="text-left">
                <CardTitle className="text-lg font-black uppercase tracking-tight text-slate-900">Verifikasi Departemen</CardTitle>
                <CardDescription className="text-[10px] font-bold text-primary uppercase tracking-[0.2em]">{companyName}</CardDescription>
              </div>
            </div>
            <Badge className={cn(
              "rounded-full font-black uppercase text-[9px] tracking-widest px-3 py-1 border-none shadow-md",
              isLocked ? "bg-emerald-50 text-emerald-700 shadow-emerald-100" : "bg-amber-50 text-amber-700 shadow-amber-100"
            )}>
              {isLocked ? 'Sudah Verifikasi' : 'Menunggu Verifikasi'}
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent className="p-6 sm:p-8 space-y-6">
          {/* Detail Informasi Permintaan Utama */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <DetailTile label="Barang / Item Utama" value={request.inventoryName} icon={Package} />
            <DetailTile label="Kode Barang" value={request.inventoryCode} icon={Hash} />
            <DetailTile label="Jumlah" value={`${request.quantity} Unit`} icon={Tag} />
            <DetailTile label="Departemen Peminta" value={request.requestingDept} icon={Building} />
            <DetailTile label="Peminta (Requester)" value={request.requestingUserName} icon={User} />
            <DetailTile 
              label="Tanggal Pengajuan" 
              value={request.requestedAt ? format(request.requestedAt.toDate(), 'd MMMM yyyy, HH:mm', { locale: localeID }) : '-'} 
              icon={Calendar} 
            />
          </div>

          {/* Checklist Multi-Item */}
          {relatedRequests.length > 1 && (
            <div className="p-5 rounded-3xl bg-slate-50 border border-slate-100 space-y-3 text-left">
              <p className="text-xs font-black uppercase tracking-wider text-slate-800">
                {isLocked ? 'Barang yang Diverifikasi Bersama' : 'Verifikasi Beberapa Barang Sekaligus'}
              </p>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {relatedRequests.map((item) => (
                  <label 
                    key={item.id} 
                    className={cn(
                        "flex items-center gap-3 p-3 rounded-2xl bg-white border border-slate-100 transition-colors",
                        isLocked ? "" : "hover:bg-slate-50 cursor-pointer"
                    )}
                  >
                    {!isLocked ? (
                      <input 
                        type="checkbox" 
                        checked={selectedIds.includes(item.id)}
                        disabled={item.id === request.id} // The primary item must always be checked
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedIds(prev => [...prev, item.id]);
                          } else {
                            setSelectedIds(prev => prev.filter(id => id !== item.id));
                          }
                        }}
                        className="rounded text-primary focus:ring-primary h-4 w-4"
                      />
                    ) : (
                      <div className="p-1 bg-emerald-50 rounded-lg">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-slate-900 truncate uppercase">{item.inventoryName}</p>
                      <p className="text-[9px] font-bold text-muted-foreground uppercase">{item.inventoryCode} • {item.quantity} Unit</p>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          )}

          {/* Area Tanda Tangan */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className="font-bold text-xs uppercase tracking-wider text-muted-foreground text-left block">
                Tanda Tangan Otoritas Verifikasi Departemen
              </Label>
              {!isLocked && (
                <Button 
                  onClick={handleClearSignature} 
                  variant="ghost" 
                  size="sm" 
                  className="h-8 rounded-xl font-bold uppercase text-[9px] tracking-widest text-rose-500 hover:bg-rose-50"
                >
                  <X className="mr-1.5 h-3.5 w-3.5" /> Bersihkan
                </Button>
              )}
            </div>

            {isLocked ? (
              <div className="rounded-[2rem] border-2 border-dashed border-slate-200 bg-slate-50 p-6 flex flex-col items-center justify-center min-h-[220px]">
                <div className="relative w-64 h-32">
                  <Image 
                    src={request.verifierDeptSignature!} 
                    alt="Tanda Tangan Verifikator" 
                    fill 
                    style={{ objectFit: 'contain' }}
                  />
                </div>
                <div className="mt-4 text-center">
                  <p className="text-[10px] font-black uppercase tracking-wider text-emerald-600 flex items-center justify-center gap-1.5">
                    <CheckCircle2 className="h-4 w-4" /> Terverifikasi Secara Digital
                  </p>
                  <p className="text-xs font-bold text-slate-800 uppercase mt-1">Oleh: {request.verifierDeptName}</p>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2 text-left">
                  <Label htmlFor="verifier-name" className="font-black text-[10px] uppercase tracking-wider text-slate-500">Nama Otoritas / Penyetuju</Label>
                  <Input 
                    id="verifier-name"
                    placeholder="Masukkan nama lengkap verifikator..."
                    value={verifierName}
                    onChange={(e) => setVerifierName(e.target.value)}
                    className="h-12 rounded-xl bg-slate-50 border-slate-200 font-bold px-4 text-slate-800 w-full focus:bg-white transition-all shadow-inner"
                  />
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-slate-50/50 shadow-inner overflow-hidden flex flex-col">
                  <div className="flex-1 min-h-[220px] bg-white relative">
                    <SignatureCanvas 
                      ref={(ref) => { sigPadRef.current = ref; }}
                      penColor="#0f172a"
                      canvasProps={{ className: 'w-full h-[220px] cursor-crosshair' }}
                    />
                  </div>
                  <div className="bg-slate-50 border-t border-slate-100 px-6 py-3 flex items-center gap-2">
                    <Info className="h-4 w-4 text-slate-400 shrink-0" />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-left">Bubuhkan tanda tangan Anda di area putih di atas</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>

        {!isLocked && (
          <CardFooter className="p-6 sm:p-8 bg-slate-50/80 border-t border-slate-100 flex flex-col gap-3">
            <Button 
              onClick={handleSaveSignature} 
              disabled={isUpdating}
              className="w-full rounded-2xl h-12 bg-primary hover:bg-primary/95 text-white font-black uppercase tracking-wider text-xs border-b-[3px] border-b-primary/70 active:translate-y-[1px] active:border-b-[1px] transition-all flex items-center justify-center gap-2"
            >
              {isUpdating ? <Loader2 className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
              Kirim Verifikasi ({selectedIds.length} Barang)
            </Button>
            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-center leading-normal">
              Dengan mengirimkan verifikasi ini, Anda menyatakan bahwa data permintaan barang di atas adalah benar dan disetujui oleh departemen Anda.
            </p>
          </CardFooter>
        )}
      </Card>
    </div>
  );
}

export default function PublicInventorySignaturePage() {
  return (
    <div className="min-h-screen bg-slate-50 py-10 px-4 flex items-center justify-center font-body">
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center gap-4">
          <Loader2 className="h-10 w-10 animate-spin text-primary" />
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Lembar Pengesahan...</p>
        </div>
      }>
        <PublicInventorySignatureContent />
      </Suspense>
    </div>
  );
}
