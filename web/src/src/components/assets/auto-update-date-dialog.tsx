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
import { writeBatch, doc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Zap } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { type Asset } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';

interface AutoUpdateDateDialogProps {
  selectedAssets: Asset[];
  onSuccess: () => void;
  children: React.ReactNode;
}

const CORRECT_PIN = "7327";

const parseDateFromCode = (code: string): Date | null => {
    if (!code) return null;
    
    const parts = code.split('-');
    if (parts.length < 3) return null;

    const datePart = parts[1];
    const monthPart = parts[2];

    if (datePart && datePart.length === 6 && monthPart) {
        const yearStr = datePart.substring(0, 4);
        const dayStr = datePart.substring(4, 6);
        const monthStr = monthPart.substring(0, 3);

        const year = parseInt(yearStr, 10);
        const day = parseInt(dayStr, 10);
        const month = parseInt(monthStr, 10);

        if (year > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
            const parsedDate = new Date(year, month - 1, day);
            if (parsedDate.getFullYear() === year && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
                return parsedDate;
            }
        }
    }
    return null;
};


export default function AutoUpdateDateDialog({
  selectedAssets,
  onSuccess,
  children,
}: AutoUpdateDateDialogProps) {
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
        const newDate = parseDateFromCode(asset.code);
        if (newDate) {
            const assetRef = doc(db, 'assets', asset.id);
            batch.update(assetRef, { purchaseDate: Timestamp.fromDate(newDate) });
            updatedCount++;
        } else {
            skippedCount++;
        }
      });
      
      if (updatedCount > 0) {
        await batch.commit();
      }

      let description = `${updatedCount} tanggal pembelian aset telah berhasil diperbarui.`;
      if (skippedCount > 0) {
          description += ` ${skippedCount} aset dilewati karena format tanggal tidak ditemukan pada kode.`;
      }

      toast({
        title: 'Berhasil',
        description: description,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error('Error auto-updating purchase dates:', error);
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
          <AlertDialogTitle>Update Tgl. Pembelian Otomatis</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan memperbarui tanggal pembelian untuk{' '}
            <span className="font-bold">{selectedAssets.length} aset</span> yang dipilih secara otomatis
            berdasarkan kode asetnya. Masukkan PIN untuk konfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Informasi Pembaruan</AlertTitle>
            <AlertDescription>
                Tanggal pembelian akan diisi dengan mengekstrak tanggal dari kode aset (format Kategori-YYYYDD-MMM, contoh: A3-200829-002). Aset yang kodenya tidak memiliki format ini akan dilewati.
            </AlertDescription>
        </Alert>
        <div className="space-y-2">
            <Label htmlFor="pin-auto-update-date">PIN Konfirmasi</Label>
            <Input 
                id="pin-auto-update-date"
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
