'use client';

import { useState } from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { writeBatch, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { type Asset } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Info } from 'lucide-react';

interface AutoUpdateLifetimeDialogProps {
  selectedAssets: Asset[];
  onSuccess: () => void;
  children: React.ReactNode;
}

const CORRECT_PIN = "7327";

const lifetimeMap: Record<string, number> = {
    'Elektronik': 5,
    'A9-Peralatan Lain-lain': 5,
    'Kendaraan': 10,
    'A5-Peralatan Transportasi': 10,
    'Furnitur': 10,
    'Peralatan Kantor': 7,
    'A2-Peralatan Bangunan': 30,
    'A3-Peralatan Mesin': 15,
    'A4-Peralatan Listrik': 10,
    'A6-Peralatan Penelitian & Uji Lab': 7,
    'A1-Lahan': 99, // Represents a very long time
};

export default function AutoUpdateLifetimeDialog({
  selectedAssets,
  onSuccess,
  children,
}: AutoUpdateLifetimeDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setPin('');
    }
    setIsOpen(open);
  }

  const handleUpdate = async () => {
    if (selectedAssets.length === 0) return;

    if (pin !== CORRECT_PIN) {
        toast({
            variant: 'destructive',
            title: 'PIN Salah',
            description: 'PIN yang Anda masukkan salah. Pembaruan dibatalkan.',
        });
        return;
    }
    
    setIsLoading(true);
    let updatedCount = 0;
    let skippedCount = 0;
    try {
      const batch = writeBatch(db);
      selectedAssets.forEach((asset) => {
        const lifetimeValue = lifetimeMap[asset.category];
        if (typeof lifetimeValue === 'number') {
            const assetRef = doc(db, 'assets', asset.id);
            batch.update(assetRef, { assetLifetime: lifetimeValue });
            updatedCount++;
        } else {
            skippedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
      }

      let description = `${updatedCount} aset telah berhasil diperbarui.`;
      if (skippedCount > 0) {
          description += ` ${skippedCount} aset dilewati karena tidak ada pemetaan kategori.`;
      }

      toast({
        title: 'Berhasil',
        description: description,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error('Error auto-updating asset lifetimes:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui',
        description: 'Terjadi kesalahan saat memperbarui data aset.',
      });
    } finally {
      setIsLoading(false);
      setPin('');
    }
  };

  const isPinValid = pin === CORRECT_PIN;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Update Masa Ketahanan Otomatis</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan memperbarui masa ketahanan untuk{' '}
            <span className="font-bold">{selectedAssets.length} aset</span> yang dipilih secara otomatis
            berdasarkan kategorinya. Masukkan PIN untuk konfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert>
            <Info className="h-4 w-4" />
            <AlertTitle>Informasi Pembaruan</AlertTitle>
            <AlertDescription>
                Masa ketahanan akan diisi sesuai standar kategori. Aset dengan kategori yang tidak memiliki standar akan dilewati.
            </AlertDescription>
        </Alert>
        <div className="space-y-2">
            <Label htmlFor="pin-auto-update-lifetime">PIN Konfirmasi</Label>
            <Input 
                id="pin-auto-update-lifetime"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                autoComplete='off'
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUpdate}
            disabled={isLoading || !isPinValid}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Jalankan Pembaruan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
