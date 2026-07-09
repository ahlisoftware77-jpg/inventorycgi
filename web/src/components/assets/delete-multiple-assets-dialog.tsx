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
import { db } from '@/lib/firebase/config';
import { Loader2 } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';
import { recycleDocument } from '@/lib/recycle-bin-utils';

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
  const { user } = useAuth();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setPin('');
    }
    setIsOpen(open);
  }

  const handleDelete = async () => {
    if (assetIds.length === 0 || !user) return;
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
      // Loop recycle process
      for (const id of assetIds) {
        await recycleDocument(db, 'assets', id, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      }

      toast({
        title: 'Berhasil',
        description: `${assetIds.length} aset telah dipindahkan ke Tempat Sampah.`,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error('Error deleting multiple assets:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus aset.',
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
      <AlertDialogContent className="bg-blue-900 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
          <AlertDialogDescription className="text-blue-200">
            Tindakan ini akan memindahkan <span className="font-bold">{assetIds.length} aset</span> yang dipilih ke Tempat Sampah. Masukkan PIN untuk konfirmasi.
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
