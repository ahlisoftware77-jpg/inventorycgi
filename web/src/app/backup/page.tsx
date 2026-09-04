'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, doc, Timestamp, runTransaction, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { 
  Download, 
  Upload, 
  Loader2, 
  ShieldAlert, 
  RefreshCw, 
  Trash2, 
  Database, 
  DatabaseBackup, 
  ShieldCheck,
  History,
  AlertTriangle,
  Lock,
  FileJson,
  Info
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';

const CORRECT_PIN = "7327";

export default function BackupPage() {
  const [isLoadingBackup, setIsLoadingBackup] = useState(false);
  const [isLoadingRestore, setIsLoadingRestore] = useState(false);
  const [isLoadingResetStock, setIsLoadingResetStock] = useState(false);
  const [isLoadingClearAccounting, setIsLoadingClearAccounting] = useState(false);
  const [restoreFile, setRestoreFile] = useState<File | null>(null);
  const [actionPin, setActionPin] = useState('');
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  if (!authLoading && user?.role !== 'Admin') {
    router.push('/');
    return null;
  }
  
  const handleBackup = async () => {
    setIsLoadingBackup(true);
    try {
      const collectionsToBackup = ['assets', 'users', 'inventory', 'inventory_requests', 'helpdesk_tickets', 'inventory_transactions', 'data_fix_asset_accounting', 'it_assets', 'settings', 'announcements', 'maintenance_schedules', 'register_design', 'form_dar', 'form_app'];
      const backupData: { [key: string]: any[] } = {};

      for (const collectionName of collectionsToBackup) {
        const querySnapshot = await getDocs(collection(db, collectionName));
        const collectionData = querySnapshot.docs.map(doc => ({
          _id: doc.id,
          ...doc.data(),
        }));
        backupData[collectionName] = collectionData;
      }

      const jsonString = JSON.stringify(backupData, (key, value) => {
        if (value && typeof value === 'object' && value.hasOwnProperty('seconds') && value.hasOwnProperty('nanoseconds')) {
          return { __datatype__: 'timestamp', value: { _seconds: value.seconds, _nanoseconds: value.nanoseconds } };
        }
        return value;
      }, 2);

      const blob = new Blob([jsonString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const date = new Date().toISOString().split('T')[0];
      a.download = `CGI-ASSET-BACKUP-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Berhasil',
        description: `Arsip data perusahaan telah diunduh sebagai CGI-ASSET-BACKUP-${date}.json`,
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        variant: 'destructive',
        title: 'Backup Gagal',
        description: 'Terjadi kesalahan sistem saat mencoba mengarsipkan data.',
      });
    } finally {
      setIsLoadingBackup(false);
    }
  };

  const handleRestore = async () => {
    if (!restoreFile) {
      toast({ variant: 'destructive', title: 'File tidak ditemukan', description: 'Silakan pilih file backup untuk restore.' });
      return;
    }
    if (actionPin !== CORRECT_PIN) {
        toast({ variant: 'destructive', title: 'PIN Salah', description: 'Otentikasi gagal. Restore dibatalkan demi keamanan data.' });
        return;
    }

    setIsLoadingRestore(true);
    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const jsonString = event.target?.result as string;
          const backupData = JSON.parse(jsonString, (key, value) => {
             if (value && value.__datatype__ === 'timestamp') {
                return new Timestamp(value.value._seconds, value.value._nanoseconds);
             }
             return value;
          });
          
          // Hapus data lama dengan batasan 500 operasi per batch
          for (const collectionName in backupData) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const docs = querySnapshot.docs;
            for (let i = 0; i < docs.length; i += 500) {
              const deleteBatch = writeBatch(db);
              const chunk = docs.slice(i, i + 500);
              chunk.forEach(doc => deleteBatch.delete(doc.ref));
              await deleteBatch.commit();
            }
          }

          // Restore data baru dengan batasan 500 operasi per batch
          for (const collectionName in backupData) {
            const collectionData = backupData[collectionName];
            for (let i = 0; i < collectionData.length; i += 500) {
              const restoreBatch = writeBatch(db);
              const chunk = collectionData.slice(i, i + 500);
              chunk.forEach((item: any) => {
                const { _id, ...data } = item;
                const docRef = doc(db, collectionName, _id);
                restoreBatch.set(docRef, data);
              });
              await restoreBatch.commit();
            }
          }

          toast({
            title: 'Restore Berhasil',
            description: 'Database telah dipulihkan sepenuhnya ke kondisi sesuai arsip.',
          });
        } catch (e: any) {
          throw new Error(`Gagal memproses file backup: ${e.message}`);
        }
      };

      reader.readAsText(restoreFile);
    } catch (error: any) {
      console.error('Error restoring data:', error);
      toast({
        variant: 'destructive',
        title: 'Restore Gagal',
        description: error.message || 'Terjadi kesalahan fatal saat memulihkan data.',
      });
    } finally {
      setIsLoadingRestore(false);
      setRestoreFile(null);
      setActionPin('');
    }
  };
  
  const handleResetStock = async () => {
    if (actionPin !== CORRECT_PIN) {
        toast({ variant: 'destructive', title: 'PIN Salah' });
        return;
    }
    
    setIsLoadingResetStock(true);
    try {
      await runTransaction(db, async (transaction) => {
        const inventorySnapshot = await getDocs(collection(db, 'inventory'));
        inventorySnapshot.forEach((doc) => {
          transaction.update(doc.ref, { stock: 0 });
        });
      });

      toast({
        title: 'Reset Stok Berhasil',
        description: 'Seluruh jumlah stok inventaris telah diatur ulang menjadi 0.',
      });

    } catch (error) {
      console.error('Error resetting stock:', error);
       toast({
        variant: 'destructive',
        title: 'Gagal Reset Stok',
      });
    } finally {
      setIsLoadingResetStock(false);
      setActionPin('');
    }
  };

  const handleClearAccountingData = async () => {
    if (actionPin !== CORRECT_PIN) {
        toast({ variant: 'destructive', title: 'PIN Salah' });
        return;
    }
    
    setIsLoadingClearAccounting(true);
    try {
      const collectionRef = collection(db, 'data_fix_asset_accounting');
      const existingDocs = await getDocs(query(collectionRef));
      const deleteBatch = writeBatch(db);
      existingDocs.forEach(doc => deleteBatch.delete(doc.ref));
      await deleteBatch.commit();

      toast({
        title: 'Data Dibersihkan',
        description: `Seluruh rekaman (${existingDocs.size}) data akuntansi telah dihapus secara permanen.`,
      });

    } catch (error) {
      console.error('Error clearing accounting data:', error);
       toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Data',
      });
    } finally {
      setIsLoadingClearAccounting(false);
      setActionPin('');
    }
  };


  if (authLoading) {
    return (
        <DashboardLayout>
            <div className="flex justify-center items-center h-full">
                <Loader2 className="w-10 h-10 animate-spin text-primary" />
            </div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-32">
        {/* Header Section */}
        <div className="relative p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10">
            <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
            <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                <div className="space-y-3">
                    <div className="flex items-center gap-3">
                        <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5">
                            <DatabaseBackup className="h-10 w-10 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-4xl font-black tracking-tighter uppercase italic">Vault & Pemulihan</h1>
                            <p className="text-primary/60 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Disaster Recovery & System Integrity</p>
                        </div>
                    </div>
                    <p className="text-slate-400 font-medium text-sm max-w-xl">Pusat pencadangan data terpusat untuk menjamin kelangsungan informasi perusahaan. Pastikan arsip disimpan di lokasi yang aman.</p>
                </div>
                
                <div className="flex items-center gap-3 bg-white/5 p-2 rounded-2xl border border-white/10 backdrop-blur-sm">
                    <div className="flex items-center gap-2 px-4 py-2 border-r border-white/10">
                        <ShieldCheck className="h-4 w-4 text-emerald-500" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-emerald-500">Secured Node</span>
                    </div>
                    <div className="flex items-center gap-2 px-4 py-2">
                        <History className="h-4 w-4 text-primary" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary">Last: {new Date().toLocaleDateString('id-ID')}</span>
                    </div>
                </div>
            </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            {/* Backup Card */}
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-primary/10 rounded-lg"><Download className="h-5 w-5 text-primary" /></div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Ekspor Database</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Unduh salinan lengkap seluruh koleksi sistem.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4">
                    <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 mb-6">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-xl shadow-sm"><FileJson className="h-6 w-6 text-primary" /></div>
                            <div className="space-y-1">
                                <p className="text-sm font-bold text-slate-900 dark:text-white uppercase">Format File: JSON</p>
                                <p className="text-xs text-slate-500 leading-relaxed">Mencakup Aset, User, Inventaris, Log, dan Pengaturan Sistem. File ini dapat digunakan kembali untuk proses Restore.</p>
                            </div>
                        </div>
                    </div>
                    <Button 
                        onClick={handleBackup} 
                        disabled={isLoadingBackup}
                        className="w-full h-14 rounded-2xl bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-xl shadow-primary/20 transition-all active:scale-95"
                    >
                        {isLoadingBackup ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <Download className="mr-2 h-5 w-5" />
                        )}
                        Inisiasi Backup Sekarang
                    </Button>
                </CardContent>
            </Card>

            {/* Restore Card */}
            <Card className="rounded-[2.5rem] border-none shadow-xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                <CardHeader className="p-8 pb-4">
                    <div className="flex items-center gap-2 mb-2">
                        <div className="p-2 bg-amber-500/10 rounded-lg"><Upload className="h-5 w-5 text-amber-600" /></div>
                        <CardTitle className="text-xl font-black uppercase tracking-tight">Impor Database</CardTitle>
                    </div>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Pulihkan kondisi sistem dari arsip cadangan.</CardDescription>
                </CardHeader>
                <CardContent className="p-8 pt-4 space-y-6">
                    <Alert variant="destructive" className="rounded-2xl border-rose-200 bg-rose-50/50 dark:bg-rose-950/20">
                        <ShieldAlert className="h-5 w-5" />
                        <AlertTitle className="font-black uppercase tracking-tight text-[11px]">Peringatan Keamanan</AlertTitle>
                        <AlertDescription className="text-[10px] font-medium leading-relaxed">
                            Proses ini akan MENGHAPUS seluruh data aktif saat ini dan menggantinya dengan data dari file backup. Tindakan ini permanen.
                        </AlertDescription>
                    </Alert>

                    <div className="space-y-4">
                        <div className="grid gap-2">
                            <Label htmlFor="restore-file" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Arsip JSON</Label>
                            <div className="relative group">
                                <Input
                                    id="restore-file"
                                    type="file"
                                    accept=".json"
                                    onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pr-10 cursor-pointer"
                                />
                                <FileJson className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-hover:text-primary transition-colors" />
                            </div>
                        </div>

                        <div className="grid gap-2">
                            <Label htmlFor="action-pin" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Otentikasi PIN Admin</Label>
                            <div className="relative group">
                                <Input
                                    id="action-pin"
                                    type="password"
                                    value={actionPin}
                                    onChange={(e) => setActionPin(e.target.value)}
                                    placeholder="••••"
                                    className="h-12 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 pl-11 font-black text-xl tracking-[0.5em]"
                                />
                                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleRestore}
                        disabled={isLoadingRestore || !restoreFile || actionPin !== CORRECT_PIN}
                        variant="destructive"
                        className="w-full h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 active:scale-95 transition-all"
                    >
                        {isLoadingRestore ? (
                            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        ) : (
                            <RefreshCw className="mr-2 h-5 w-5" />
                        )}
                        Jalankan Pemulihan
                    </Button>
                </CardContent>
            </Card>
        </div>

        {/* Danger Zone Section */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-rose-50/30 dark:bg-rose-950/10 border-2 border-dashed border-rose-200 dark:border-rose-900">
          <CardHeader className="p-10 pb-4">
            <div className="flex items-center gap-3">
                <div className="p-3 bg-rose-600 rounded-2xl shadow-lg"><AlertTriangle className="h-6 w-6 text-white" /></div>
                <div>
                    <CardTitle className="text-2xl font-black uppercase tracking-tight text-rose-600">Danger Zone</CardTitle>
                    <CardDescription className="text-xs font-bold uppercase tracking-widest text-rose-400">Tindakan pembersihan data secara massal.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-10 pt-6 space-y-8">
             <div className="flex flex-col lg:flex-row items-end gap-8">
                <div className="w-full lg:w-1/3 space-y-2">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-rose-600 ml-1">PIN Konfirmasi Diperlukan</Label>
                    <div className="relative">
                        <Input
                            type="password"
                            value={actionPin}
                            onChange={(e) => setActionPin(e.target.value)}
                            placeholder="Masukkan PIN untuk konfirmasi"
                            className="h-14 rounded-2xl border-rose-200 dark:border-rose-900 bg-white dark:bg-slate-950 pl-12 font-bold tracking-[0.3em] shadow-inner"
                        />
                        <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-rose-300" />
                    </div>
                </div>
                
                <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-4 w-full">
                  <Button
                    onClick={handleResetStock}
                    disabled={isLoadingResetStock || actionPin !== CORRECT_PIN}
                    variant="destructive"
                    className="h-14 rounded-2xl font-black uppercase tracking-widest border-2 border-rose-600 bg-transparent text-rose-600 hover:bg-rose-600 hover:text-white transition-all"
                  >
                    {isLoadingResetStock ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-5 w-5" />
                    )}
                    Reset Stok Inventaris
                  </Button>
                   <Button
                    onClick={handleClearAccountingData}
                    disabled={isLoadingClearAccounting || actionPin !== CORRECT_PIN}
                    variant="destructive"
                    className="h-14 rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-rose-600/20"
                  >
                    {isLoadingClearAccounting ? (
                      <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-5 w-5" />
                    )}
                    Hapus Data Akuntansi
                  </Button>
                </div>
             </div>
          </CardContent>
          <CardFooter className="px-10 py-6 bg-rose-600 text-white flex items-center gap-3">
            <Info className="h-4 w-4" />
            <p className="text-[10px] font-black uppercase tracking-widest">Seluruh log tindakan di atas akan dicatat secara otomatis dalam audit trail sistem.</p>
          </CardFooter>
        </Card>
      </div>
    </DashboardLayout>
  );
}
