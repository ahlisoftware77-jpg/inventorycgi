
'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, getDocs, writeBatch, doc, Timestamp, deleteDoc, runTransaction, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Download, Upload, Loader2, ShieldAlert, RefreshCw, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';

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
      const collectionsToBackup = ['assets', 'users', 'inventory', 'inventory_requests', 'helpdesk_tickets', 'inventory_transactions', 'data_fix_asset_accounting', 'it_assets'];
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
        // Custom replacer to handle Timestamps
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
      a.download = `firestore-backup-${date}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: 'Backup Berhasil',
        description: `Data telah berhasil diunduh sebagai firestore-backup-${date}.json`,
      });
    } catch (error) {
      console.error('Error creating backup:', error);
      toast({
        variant: 'destructive',
        title: 'Backup Gagal',
        description: 'Terjadi kesalahan saat membuat backup data.',
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
        toast({ variant: 'destructive', title: 'PIN Salah', description: 'PIN yang Anda masukkan salah. Restore dibatalkan.' });
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
          
          // --- Deletion Phase ---
          for (const collectionName in backupData) {
            const querySnapshot = await getDocs(collection(db, collectionName));
            const deleteBatch = writeBatch(db);
            querySnapshot.docs.forEach(doc => deleteBatch.delete(doc.ref));
            await deleteBatch.commit();
          }

          // --- Restore Phase ---
          const restoreBatch = writeBatch(db);
          for (const collectionName in backupData) {
            const collectionData = backupData[collectionName];
            collectionData.forEach((item: any) => {
              const { _id, ...data } = item;
              const docRef = doc(db, collectionName, _id);
              restoreBatch.set(docRef, data);
            });
          }
          await restoreBatch.commit();

          toast({
            title: 'Restore Berhasil',
            description: 'Data berhasil dipulihkan dari file backup.',
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
        description: error.message || 'Terjadi kesalahan saat memulihkan data.',
      });
    } finally {
      setIsLoadingRestore(false);
      setRestoreFile(null);
      setActionPin('');
    }
  };
  
  const handleResetStock = async () => {
    if (actionPin !== CORRECT_PIN) {
        toast({ variant: 'destructive', title: 'PIN Salah', description: 'PIN yang Anda masukkan salah. Aksi dibatalkan.' });
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
        title: 'Berhasil',
        description: 'Semua jumlah stok item inventaris telah direset menjadi 0.',
      });

    } catch (error) {
      console.error('Error resetting stock:', error);
       toast({
        variant: 'destructive',
        title: 'Gagal Reset Stok',
        description: 'Terjadi kesalahan saat mereset stok inventaris.',
      });
    } finally {
      setIsLoadingResetStock(false);
      setActionPin('');
    }
  };

  const handleClearAccountingData = async () => {
    if (actionPin !== CORRECT_PIN) {
        toast({ variant: 'destructive', title: 'PIN Salah', description: 'PIN yang Anda masukkan salah. Aksi dibatalkan.' });
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
        title: 'Berhasil',
        description: `Semua data (${existingDocs.size}) dari koleksi 'data_fix_asset_accounting' telah dihapus.`,
      });

    } catch (error) {
      console.error('Error clearing accounting data:', error);
       toast({
        variant: 'destructive',
        title: 'Gagal Menghapus Data',
        description: 'Terjadi kesalahan saat menghapus data akuntansi.',
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
                <Loader2 className="w-8 h-8 animate-spin" />
            </div>
        </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Backup Data</CardTitle>
            <CardDescription>
              Unduh salinan lengkap dari semua koleksi utama sebagai file JSON.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={handleBackup} disabled={isLoadingBackup}>
              {isLoadingBackup ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Download className="mr-2 h-4 w-4" />
              )}
              Unduh Backup
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Restore Data</CardTitle>
            <CardDescription>
              Pulihkan data dari file backup JSON. Ini akan menghapus semua data saat ini dan menggantinya dengan data dari file.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Peringatan!</AlertTitle>
              <AlertDescription>
                Tindakan ini tidak dapat dibatalkan. Seluruh data di koleksi yang relevan akan dihapus permanen sebelum data baru diimpor. Lanjutkan dengan hati-hati.
              </AlertDescription>
            </Alert>
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="restore-file">Pilih File Backup (.json)</Label>
                <Input
                    id="restore-file"
                    type="file"
                    accept=".json"
                    onChange={(e) => setRestoreFile(e.target.files ? e.target.files[0] : null)}
                />
            </div>
             <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="action-pin">PIN Konfirmasi Aksi</Label>
                <Input
                    id="action-pin"
                    type="password"
                    value={actionPin}
                    onChange={(e) => setActionPin(e.target.value)}
                    placeholder="Masukkan PIN untuk mengonfirmasi"
                />
            </div>
            <Button
              onClick={handleRestore}
              disabled={isLoadingRestore || !restoreFile || actionPin !== CORRECT_PIN}
              variant="destructive"
            >
              {isLoadingRestore ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Restore Data
            </Button>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <CardTitle>Tindakan Berbahaya Lainnya</CardTitle>
            <CardDescription>
              Gunakan fitur di bawah ini dengan sangat hati-hati.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
             <Alert variant="destructive">
              <ShieldAlert className="h-4 w-4" />
              <AlertTitle>Peringatan!</AlertTitle>
              <AlertDescription>
                Aksi ini akan mengubah atau menghapus data secara massal dan tidak dapat dibatalkan.
              </AlertDescription>
            </Alert>
             <div className="flex items-end gap-4 p-4 border rounded-md flex-wrap">
                <div className="grid w-full max-w-sm items-center gap-1.5">
                    <Label htmlFor="action-pin-2">PIN Konfirmasi Aksi</Label>
                    <Input
                        id="action-pin-2"
                        type="password"
                        value={actionPin}
                        onChange={(e) => setActionPin(e.target.value)}
                        placeholder="Masukkan PIN untuk mengonfirmasi"
                    />
                </div>
                <div className="flex gap-2 flex-wrap">
                  <Button
                    onClick={handleResetStock}
                    disabled={isLoadingResetStock || actionPin !== CORRECT_PIN}
                    variant="destructive"
                  >
                    {isLoadingResetStock ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="mr-2 h-4 w-4" />
                    )}
                    Reset Stok Inventaris ke 0
                  </Button>
                   <Button
                    onClick={handleClearAccountingData}
                    disabled={isLoadingClearAccounting || actionPin !== CORRECT_PIN}
                    variant="destructive"
                  >
                    {isLoadingClearAccounting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Hapus Semua Data Akuntansi
                  </Button>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

    