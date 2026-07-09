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
import { Loader2, Trash2 } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { recycleDocument } from '@/lib/recycle-bin-utils';

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
    if (!user) return;
    
    const canDelete = user.role === 'Admin' || user.permissions?.canDeleteInventory;
    if (!canDelete) {
        toast({ variant: 'destructive', title: 'Akses Ditolak', description: 'Anda tidak memiliki izin untuk menghapus inventaris.' });
        return;
    }
    
    setIsLoading(true);
    try {
      await recycleDocument(db, 'inventory', itemId, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({
        title: 'Berhasil',
        description: `Barang "${itemName}" telah dipindahkan ke Tempat Sampah.`,
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
      <AlertDialogContent className="bg-blue-900 text-white border-none rounded-[2rem] shadow-2xl p-8">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-white text-left">Hapus Barang Inventaris?</AlertDialogTitle>
          <AlertDialogDescription className="text-blue-100 font-medium text-left">
            Barang <span className="font-bold text-white uppercase italic">"{itemName}"</span> akan dipindahkan ke Tempat Sampah dan tetap tersimpan selama 30 hari sebelum dihapus permanen.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="mt-8 gap-3">
          <AlertDialogCancel disabled={isLoading} className="rounded-xl h-12 font-bold bg-transparent text-white border-white/20 hover:bg-white/10">Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={isLoading}
            className="rounded-xl h-12 bg-white text-blue-900 hover:bg-blue-50 font-black uppercase tracking-widest shadow-xl"
          >
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
            Ya, Hapus
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
