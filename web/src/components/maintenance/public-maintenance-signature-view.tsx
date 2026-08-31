
'use client';

/**
 * @fileOverview Komponen Penampil Tanda Tangan Pemeliharaan Publik.
 * Memungkinkan pihak terkait mengesahkan pengerjaan maintenance melalui link share.
 * Fitur: Menampilkan bukti pengerjaan, menampilkan tanda tangan lama, dan pengesahan digital.
 * Keamanan: Tanda tangan akan terkunci otomatis jika sudah ada di database.
 */

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, updateDoc, serverTimestamp, arrayUnion, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type MaintenanceSchedule } from '@/lib/types';
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
  Wrench, 
  User, 
  Calendar, 
  Tag, 
  MapPin, 
  Pencil, 
  Trash, 
  Type, 
  X,
  History,
  Info,
  Hash,
  Image as ImageIcon
} from 'lucide-react';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';

interface PublicMaintenanceSignatureViewProps {
  scheduleId: string;
}

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

export default function PublicMaintenanceSignatureView({ scheduleId }: PublicMaintenanceSignatureViewProps) {
  const [schedule, setSchedule] = useState<MaintenanceSchedule | null>(null);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  
  // Signature states
  const [penColor, setPenColor] = useState('#000000');
  const [isTextMode, setIsTextMode] = useState(false);
  const [typedName, setTypedName] = useState('');
  const [showExistingSignature, setShowExistingSignature] = useState(true);
  
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
    if (!scheduleId) return;

    const unsubscribe = onSnapshot(doc(db, 'maintenance_schedules', scheduleId), (docSnap) => {
      if (docSnap.exists()) {
        const data = { id: docSnap.id, ...docSnap.data() } as MaintenanceSchedule;
        setSchedule(data);
        setShowExistingSignature(true);
        // Jika tanda tangan sudah ada, kunci akses pengerjaan
        if (data.completionPhotoURL) {
            setIsLocked(true);
        } else {
            setIsLocked(false);
        }
      } else {
        setSchedule(null);
      }
      setLoading(false);
    }, (error) => {
        console.error("Error fetching schedule:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [scheduleId]);

  const handleClearSignature = () => {
    if (sigPadRef.current) {
        sigPadRef.current.clear();
    }
    setShowExistingSignature(false);
    setTypedName('');
  };

  const handleSaveSignature = async () => {
    let signatureData = '';

    if (isTextMode) {
      if (!typedName.trim()) {
        toast({ variant: 'destructive', title: 'Nama Kosong' });
        return;
      }
      const tempCanvas = document.createElement('canvas');
      tempCanvas.width = 400;
      tempCanvas.height = 200;
      const ctx = tempCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = 'white';
        ctx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
        ctx.fillStyle = 'black';
        ctx.font = 'bold 30px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(typedName, tempCanvas.width / 2, tempCanvas.height / 2);
        signatureData = tempCanvas.toDataURL('image/png');
      }
    } else {
      if (sigPadRef.current) {
        const isCanvasEmpty = sigPadRef.current.isEmpty();
        if (isCanvasEmpty) {
          toast({ variant: 'destructive', title: 'Tanda Tangan Kosong', description: 'Silakan berikan tanda tangan terlebih dahulu.' });
          return;
        }
        signatureData = sigPadRef.current.toDataURL('image/png');
      }
    }

    if (!signatureData) return;

    setIsUpdating(true);
    const scheduleRef = doc(db, 'maintenance_schedules', scheduleId);
    const updateData = { 
        completionPhotoURL: signatureData,
        status: 'Selesai',
        updatedAt: serverTimestamp()
    };

    updateDoc(scheduleRef, updateData)
      .then(async () => {
          setIsLocked(true);
          toast({ title: 'Pengesahan Berhasil', description: 'Tanda tangan Anda telah disimpan secara permanen.' });

          // Update linked Helpdesk Ticket status to 'Selesai'
          if (schedule?.ticketId) {
            try {
              const ticketRef = doc(db, 'helpdesk_tickets', schedule.ticketId);
              await updateDoc(ticketRef, {
                status: 'Selesai',
                updates: arrayUnion({
                  note: `Tiket diselesaikan otomatis karena penjadwalan maintenance "${schedule.assetName}" telah selesai.`,
                  updatedBy: 'system',
                  updaterName: 'Sistem Maintenance',
                  updatedAt: Timestamp.now(),
                }),
              });
            } catch (e) {
              console.warn('Gagal update tiket helpdesk terkait:', e);
            }
          }
      })
      .catch(async (serverError) => {
          console.error("Error saving signature:", serverError);
          const permissionError = new FirestorePermissionError({
              path: scheduleRef.path,
              operation: 'update',
              requestResourceData: updateData,
          } satisfies SecurityRuleContext);
          errorEmitter.emit('permission-error', permissionError);
          toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Izin akses ditolak oleh sistem.' });
      })
      .finally(() => {
          setIsUpdating(false);
      });
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Otoritas...</p>
        </div>
    );
  }

  if (!schedule) return (
    <div className="max-w-md mx-auto p-12 text-center bg-white rounded-3xl shadow-xl mt-20 text-black">
        <X className="h-16 w-16 text-rose-500 opacity-20 mx-auto" />
        <h2 className="text-2xl font-black uppercase text-rose-600 mt-4">Jadwal Tidak Ditemukan</h2>
        <p className="text-muted-foreground mt-2 font-medium text-sm leading-relaxed">Link ini sudah tidak valid atau jadwal telah dihapus dari sistem pusat.</p>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto p-4 sm:p-10 space-y-10 pb-32 text-black">
        {/* Branding */}
        <div className="flex flex-col items-center text-center gap-4">
            <Image src="/cgi.png" alt="Logo" width={64} height={64} className="mb-2 shadow-sm rounded-xl p-1 bg-white" />
            <div className="space-y-1 text-black">
                <h1 className="text-2xl font-black tracking-tighter uppercase text-slate-900 dark:text-white italic">{companyName}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary bg-primary/5 px-6 py-1.5 rounded-full inline-block">Maintenance Authorization Portal</p>
            </div>
        </div>

        {/* Task Info */}
        <Card className="border-none shadow-2xl bg-white rounded-[2.5rem] overflow-hidden text-black">
            <CardHeader className="p-8 pb-4 bg-slate-900 text-white flex flex-row items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="p-3 bg-white/10 rounded-2xl border border-white/10"><Wrench className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <CardTitle className="text-xl font-black uppercase tracking-tight text-left">Pengerjaan Maintenance</CardTitle>
                        <CardDescription className="text-white/40 text-[9px] font-black tracking-widest text-left">ESTABLISHING DATA INTEGRITY</CardDescription>
                    </div>
                </div>
                <Badge className={cn(
                    "uppercase font-black text-[9px] px-3 transition-colors",
                    isLocked ? "bg-emerald-500/20 text-emerald-500 border-emerald-500/30" : "bg-primary/20 text-primary border-primary/30"
                )}>{isLocked ? 'Verified' : 'Official'}</Badge>
            </CardHeader>
            <CardContent className="p-8 space-y-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <DetailTile label="Objek Aset" value={schedule.assetName} icon={Tag} />
                    <DetailTile label="Kode Aset" value={schedule.assetCode} icon={Hash} />
                    <DetailTile label="Tipe Pekerjaan" value={schedule.type} icon={Wrench} />
                    <DetailTile label="Unit/Dept" value={schedule.department} icon={MapPin} />
                </div>

                <div className="p-6 rounded-3xl bg-slate-50 border border-dashed border-slate-200 text-left">
                    <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mb-2 text-left">Instruksi & Temuan Teknisi</p>
                    <p className="text-sm font-bold text-slate-800 italic leading-relaxed text-left">"{schedule.notes || 'Pengerjaan rutin sesuai standar operasional.'}"</p>
                </div>

                {/* Evidence Section */}
                {schedule.progressPhotoURL && (
                    <div className="space-y-3 text-left">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                            <ImageIcon className="h-3 w-3" /> Bukti Pengerjaan Lapangan
                        </Label>
                        <div className="relative aspect-video rounded-3xl overflow-hidden border-2 border-slate-100 shadow-xl bg-white group cursor-pointer" onClick={() => window.open(schedule.progressPhotoURL, '_blank')}>
                            <Image src={schedule.progressPhotoURL} alt="Bukti Lapangan" fill className="object-cover transition-transform group-hover:scale-105" />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="secondary" size="sm" className="rounded-full font-black text-[10px] uppercase text-black">Lihat Foto</Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Signature Section */}
                <div className="space-y-6">
                    <div className="flex items-center justify-between px-1">
                        <Label className={cn(
                            "text-[10px] font-black uppercase tracking-widest flex items-center gap-2 text-left transition-colors",
                            isLocked ? "text-emerald-600" : "text-muted-foreground"
                        )}>
                            {isLocked ? <ShieldCheck className="h-3 w-3" /> : (isTextMode ? <Type className="h-3 w-3" /> : <Pencil className="h-3 w-3" />)}
                            {isLocked ? 'Pengesahan Terverifikasi (Terkunci)' : 'Bubuhkan Pengesahan Anda'}
                        </Label>
                        
                        {!isLocked && (
                            <div className="flex items-center gap-2">
                                {!isTextMode && (
                                    <div className="flex items-center gap-1.5 px-2 py-1 bg-white rounded-full border shadow-sm">
                                        {['#000000', '#0000ff', '#ff0000'].map(hex => (
                                            <button 
                                                key={hex} 
                                                type="button" 
                                                onClick={() => setPenColor(hex)} 
                                                className={cn(
                                                    "w-3.5 h-3.5 rounded-full transition-transform hover:scale-110", 
                                                    hex === penColor ? "ring-2 ring-primary ring-offset-1" : "opacity-40"
                                                )} 
                                                style={{ backgroundColor: hex }} 
                                            />
                                        ))}
                                    </div>
                                )}
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full text-slate-400 hover:text-primary"
                                    onClick={() => setIsTextMode(!isTextMode)}
                                >
                                    {isTextMode ? <Pencil className="h-4 w-4" /> : <Type className="h-4 w-4" />}
                                </Button>
                                <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-8 w-8 rounded-full text-rose-400 hover:text-rose-600 hover:bg-rose-50"
                                    onClick={handleClearSignature}
                                >
                                    <Trash className="h-3.5 w-3.5" />
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className={cn(
                        "w-full h-64 rounded-3xl border-4 border-dashed shadow-inner relative overflow-hidden group text-black transition-all",
                        isLocked ? "border-emerald-500/20 bg-emerald-50/10" : (isTextMode ? "flex items-center justify-center border-emerald-200 bg-slate-50" : "border-slate-100 bg-slate-50")
                    )}>
                        {isLocked ? (
                            <div className="absolute inset-0 flex items-center justify-center p-8 z-10 animate-in fade-in zoom-in duration-700">
                                <Image src={schedule.completionPhotoURL!} alt="Verified Signature" fill className="object-contain" />
                            </div>
                        ) : isTextMode ? (
                            <Input 
                                placeholder="Ketik nama lengkap..." 
                                value={typedName}
                                onChange={(e) => setTypedName(e.target.value)}
                                className="bg-transparent border-none text-center font-black text-2xl uppercase tracking-tighter h-full w-full focus-visible:ring-0 text-black"
                            />
                        ) : (
                            <>
                                {showExistingSignature && schedule.completionPhotoURL && (
                                    <div className="absolute inset-0 flex items-center justify-center p-8 z-0">
                                        <Image src={schedule.completionPhotoURL} alt="Existing Signature" fill className="object-contain opacity-50" />
                                    </div>
                                )}
                                <SignatureCanvas
                                    ref={sigPadRef}
                                    penColor={penColor}
                                    onBegin={() => setShowExistingSignature(false)}
                                    canvasProps={{ className: 'w-full h-full relative z-10' }}
                                />
                            </>
                        )}
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-[0.03]">
                            <ShieldCheck className="h-40 w-40" />
                        </div>
                    </div>
                </div>

                {!isLocked ? (
                    <Button 
                        onClick={handleSaveSignature} 
                        disabled={isUpdating}
                        className="w-full h-14 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase tracking-[0.2em] shadow-2xl shadow-emerald-600/20 transition-all active:scale-95"
                    >
                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <CheckCircle2 className="h-5 w-5 mr-2" />}
                        Simpan & Sahkan Sekarang
                    </Button>
                ) : (
                    <div className="flex flex-col items-center gap-3 py-6 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 text-emerald-600">
                            <CheckCircle2 className="h-6 w-6" />
                            <span className="text-sm font-black uppercase tracking-[0.15em]">Laporan Maintenance Selesai</span>
                        </div>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase text-center px-4">Tanda tangan telah dikunci dan dokumen pengerjaan resmi ditutup di server pusat.</p>
                    </div>
                )}
            </CardContent>
            <CardFooter className="px-8 py-6 bg-slate-50 border-t flex items-center justify-center gap-3">
                <Info className="h-4 w-4 text-slate-400" />
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest text-center">Pengesahan ini bersifat permanen dan mengikat secara hukum dalam sistem audit {companyName}.</p>
            </CardFooter>
        </Card>
    </div>
  );
}

