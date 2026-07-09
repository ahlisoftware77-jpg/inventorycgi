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
import { useAuth } from '@/hooks/use-auth';
import { recycleDocument } from '@/lib/recycle-bin-utils';

interface DeleteAssetDialogProps {
  assetId: string;
  assetName: string;
  children: React.ReactNode;
}

export default function DeleteAssetDialog({
  assetId,
  assetName,
  children,
}: DeleteAssetDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleDelete = async () => {
    if (!user) return;
    setIsLoading(true);
    try {
      await recycleDocument(db, 'assets', assetId, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({
        title: 'Berhasil Dihapus',
        description: `Aset "${assetName}" telah dipindahkan ke Tempat Sampah.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error deleting asset:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus aset.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog open={isOpen} onOpenChange={setIsOpen}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent className="bg-blue-900 text-white">
        <AlertDialogHeader>
          <AlertDialogTitle>Hapus Aset ini?</AlertDialogTitle>
          <AlertDialogDescription className="text-blue-200">
            Aset <span className="font-bold">"{assetName}"</span> akan dipindahkan ke Tempat Sampah selama 30 hari sebelum dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
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
