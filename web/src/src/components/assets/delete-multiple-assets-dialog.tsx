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

interface DeleteMultipleAssetsDialogProps {
  assetIds: string[];
  onSuccess: () => void;
  children: React.ReactNode;
}

const CORRECT_PIN = "7327";

export default function DeleteMultipleAssetsDialog({
  assetIds,
  onSuccess,
  children,
}: DeleteMultipleAssetsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        // Reset PIN when dialog is closed
        setPin('');
    }
    setIsOpen(open);
  }

  const handleDelete = async () => {
    if (assetIds.length === 0) return;
    if (pin !== CORRECT_PIN) {
        toast({
            variant: 'destructive',
            title: 'PIN Salah',
            description: 'PIN yang Anda masukkan salah. Penghapusan dibatalkan.',
        });
        return;
    }

    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      assetIds.forEach((id) => {
        const assetRef = doc(db, 'assets', id);
        batch.delete(assetRef);
      });
      await batch.commit();

      toast({
        title: 'Berhasil',
        description: `${assetIds.length} aset telah berhasil dihapus.`,
      });
      onSuccess();
      setIsOpen(false); // Close dialog on success
    } catch (error) {
      console.error('Error deleting multiple assets:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus aset.',
      });
    } finally {
      setIsLoading(false);
      setPin(''); // Reset PIN after action
    }
  };

  const isPinValid = pin === CORRECT_PIN;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="bg-blue-900 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
          <AlertDialogDescription className="text-blue-200">
            Tindakan ini tidak dapat dibatalkan. Ini akan menghapus{' '}
            <span className="font-bold">{assetIds.length} aset</span> yang dipilih secara permanen
            dari server. Masukkan PIN untuk konfirmasi.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <div className="space-y-2">
            <Label htmlFor="pin-delete" className="text-blue-200">PIN Konfirmasi</Label>
            <Input 
                id="pin-delete"
                type="password"
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                placeholder="Masukkan PIN"
                autoComplete='off'
                className="bg-blue-800 border-blue-600 text-white"
            />
        </div>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading || !isPinValid}
            className="bg-white text-blue-900 hover:bg-blue-100"
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
