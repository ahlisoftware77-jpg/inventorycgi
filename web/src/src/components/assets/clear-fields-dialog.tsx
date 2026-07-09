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
import { Loader2, Eraser } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { type Asset } from '@/lib/types';
import { Alert, AlertTitle, AlertDescription } from '../ui/alert';
import { Checkbox } from '../ui/checkbox';

interface ClearFieldsDialogProps {
  selectedAssets: Asset[];
  onSuccess: () => void;
  children: React.ReactNode;
}

// Defines which fields can be cleared.
const clearableFields = [
    { id: 'purchaseDate', label: 'Tanggal Pembelian'},
    { id: 'brand', label: 'Brand' },
    { id: 'user', label: 'User' },
    { id: 'supplier', label: 'Supplier' },
    { id: 'prNumber', label: 'Nomor PR' },
    { id: 'inspectionNumber', label: 'Nomor Inspeksi' },
    { id: 'projectInspectionNumber', label: 'No. Insp Proyek' },
    { id: 'notes', label: 'Catatan' },
] as const; // `as const` makes the array readonly and its elements literals

type ClearableField = typeof clearableFields[number]['id'];

const CORRECT_PIN = "7327";

export default function ClearFieldsDialog({
  selectedAssets,
  onSuccess,
  children,
}: ClearFieldsDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [fieldsToClear, setFieldsToClear] = useState<ClearableField[]>([]);
  const { toast } = useToast();

  const handleOpenChange = (open: boolean) => {
    if (!open) {
        setPin('');
        setFieldsToClear([]);
    }
    setIsOpen(open);
  }

  const handleCheckboxChange = (fieldId: ClearableField, checked: boolean) => {
    setFieldsToClear(prev => 
        checked ? [...prev, fieldId] : prev.filter(id => id !== fieldId)
    );
  };

  const handleUpdate = async () => {
    if (selectedAssets.length === 0 || fieldsToClear.length === 0) {
        toast({
            variant: 'destructive',
            title: 'Tidak Ada Tindakan',
            description: 'Pilih setidaknya satu aset dan satu kolom untuk dikosongkan.',
        });
        return;
    }

    if (pin !== CORRECT_PIN) {
        toast({
            variant: 'destructive',
            title: 'PIN Salah',
            description: 'PIN yang Anda masukkan salah. Pembaruan dibatalkan.',
        });
        return;
    }
    
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      const updateData: { [key: string]: any } = {};
      fieldsToClear.forEach(field => {
        if (field.toLowerCase().includes('date')) {
            updateData[field] = null;
        } else {
            updateData[field] = '';
        }
      });

      selectedAssets.forEach((asset) => {
        const assetRef = doc(db, 'assets', asset.id);
        batch.update(assetRef, updateData);
      });
      
      await batch.commit();

      toast({
        title: 'Berhasil',
        description: `Kolom yang dipilih telah dikosongkan untuk ${selectedAssets.length} aset.`,
      });
      onSuccess();
      setIsOpen(false);
    } catch (error) {
      console.error('Error clearing fields:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui',
        description: 'Terjadi kesalahan saat mengosongkan data aset.',
      });
    } finally {
      setIsLoading(false);
      setPin('');
      setFieldsToClear([]);
    }
  };

  const isPinValid = pin === CORRECT_PIN;
  const isActionDisabled = isLoading || !isPinValid || fieldsToClear.length === 0 || selectedAssets.length === 0;

  return (
    <AlertDialog open={isOpen} onOpenChange={handleOpenChange}>
      <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Kosongkan Kolom yang Dipilih</AlertDialogTitle>
          <AlertDialogDescription>
            Pilih kolom yang ingin Anda kosongkan isinya untuk{' '}
            <span className="font-bold">{selectedAssets.length} aset</span> yang dipilih. Tindakan ini tidak dapat dibatalkan.
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <div className="space-y-4">
            <div className="space-y-2">
                <Label>Pilih Kolom untuk Dikosongkan:</Label>
                <div className="grid grid-cols-2 gap-2 rounded-md border p-4">
                    {clearableFields.map(field => (
                        <div key={field.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={`clear-${field.id}`}
                                onCheckedChange={(checked) => handleCheckboxChange(field.id, !!checked)}
                            />
                            <Label htmlFor={`clear-${field.id}`} className="font-normal">
                                {field.label}
                            </Label>
                        </div>
                    ))}
                </div>
            </div>

            <div className="space-y-2">
                <Label htmlFor="pin-clear-fields">PIN Konfirmasi</Label>
                <Input 
                    id="pin-clear-fields"
                    type="password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    placeholder="Masukkan PIN"
                    autoComplete='off'
                />
            </div>
        </div>

        <AlertDialogFooter>
          <AlertDialogCancel disabled={isLoading}>Batal</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleUpdate}
            disabled={isActionDisabled}
          >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Jalankan
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
