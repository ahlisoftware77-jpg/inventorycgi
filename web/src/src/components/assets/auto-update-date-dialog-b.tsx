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

interface AutoUpdateDateDialogBProps {
  selectedAssets: Asset[];
  onSuccess: () => void;
  children: React.ReactNode;
}

const CORRECT_PIN = "7327";

const parseDateFromCodeB = (code: string): Date | null => {
    if (!code) return null;
    
    // Regex for (Category)(YY)(DD)(MM)(Suffix) format
    // Example: A214010040 -> A2, 14, 01, 004, 0
    const match = code.match(/^(\D+)(\d{2})(\d{2})(\d{2})(\d*)$/);
    if (!match) return null;

    const [, , yearStr, dayStr, monthStr] = match;

    const year = parseInt(yearStr, 10);
    const day = parseInt(dayStr, 10);
    const month = parseInt(monthStr, 10);

    // Assuming '14' means 2014, '99' means 1999.
    // This logic handles years from 1950 to 2049. Adjust if needed.
    const fullYear = year + (year < 50 ? 2000 : 1900);

    if (fullYear > 1900 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        try {
            const parsedDate = new Date(fullYear, month - 1, day);
            // Verify if the created date is valid (e.g., avoids Feb 30).
            if (parsedDate.getFullYear() === fullYear && parsedDate.getMonth() === month - 1 && parsedDate.getDate() === day) {
                return parsedDate;
            }
        } catch (e) {
            // Invalid date arguments
            return null;
        }
    }
    return null;
};


export default function AutoUpdateDateDialogB({
  selectedAssets,
  onSuccess,
  children,
}: AutoUpdateDateDialogBProps) {
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
        const newDate = parseDateFromCodeB(asset.code);
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
          description += ` ${skippedCount} aset dilewati karena format kode tidak sesuai.`;
      }

      toast({
        title: 'Berhasil',
        description: description,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error('Error auto-updating purchase dates (Type B):', error);
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
          <AlertDialogTitle>Update Tgl. Pembelian Otomatis (Tipe 2)</AlertDialogTitle>
          <AlertDialogDescription>
            Tindakan ini akan memperbarui tanggal pembelian untuk{' '}
            <span className="font-bold">{selectedAssets.length} aset</span> yang dipilih berdasarkan format kode `A214010040`. Masukkan PIN untuk konfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Alert>
            <Zap className="h-4 w-4" />
            <AlertTitle>Informasi Pembaruan</AlertTitle>
            <AlertDescription>
                Tanggal pembelian akan diurai dari kode aset dengan format `(Kategori)(YY)(DD)(MM)`. Contoh: `A214010040` menjadi 1 April 2014.
            </AlertDescription>
        </Alert>
        <div className="space-y-2">
            <Label htmlFor="pin-auto-update-date-b">PIN Konfirmasi</Label>
            <Input 
                id="pin-auto-update-date-b"
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
