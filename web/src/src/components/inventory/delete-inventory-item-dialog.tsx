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
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';

interface DeleteInventoryItemDialogProps {
  itemId: string;
  itemName: string;
  children: React.ReactNode;
}

export default function DeleteInventoryItemDialog({
  itemId,
  itemName,
  children,
}: DeleteInventoryItemDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { user } = useAuth();

  const handleDelete = async () => {
    if (user?.role !== 'Admin') {
        toast({ variant: 'destructive', title: 'Akses Ditolak' });
        return;
    }
    
    setIsLoading(true);
    try {
      await deleteDoc(doc(db, 'inventory', itemId));
      toast({
        title: 'Berhasil',
        description: `Barang "${itemName}" telah dihapus.`,
      });
      setIsOpen(false);
    } catch (error) {
      console.error('Error deleting inventory item:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Menghapus',
        description: 'Terjadi kesalahan saat menghapus barang.',
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
          <AlertDialogTitle>Apakah Anda yakin?</AlertDialogTitle>
          <AlertDialogDescription className="text-blue-200">
            Tindakan ini akan menghapus barang <span className="font-bold">"{itemName}"</span> secara permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="bg-white text-blue-900 hover:bg-blue-100"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
