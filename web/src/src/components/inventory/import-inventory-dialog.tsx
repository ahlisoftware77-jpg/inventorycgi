'use client';

import { useState } from 'react';
import * as XLSX from 'xlsx';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { collection, writeBatch, serverTimestamp, doc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FileUp, Loader2, Sheet } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { type InventoryType } from '@/lib/types';

interface ImportInventoryDialogProps {
  itemType: InventoryType;
}

interface SkippedRow {
  code: string;
  name: string;
  reason: string;
}

export default function ImportInventoryDialog({ itemType }: ImportInventoryDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleImport = async () => {
    if (!file) {
      toast({
        variant: 'destructive',
        title: 'Tidak Ada File',
        description: 'Silakan pilih file Excel untuk diimpor.',
      });
      return;
    }
    setIsLoading(true);

    try {
        const inventoryQuery = query(collection(db, 'inventory'));
        const querySnapshot = await getDocs(inventoryQuery);
        const existingItemCodes = new Set(querySnapshot.docs.map(doc => doc.data().code));
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array' });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    
            if (json.length < 2) {
              throw new Error('File Excel kosong atau tidak memiliki data.');
            }
    
            const headers = (json[0] as string[]).map(h => h.trim());
            const requiredHeaders = ['Kode Barang', 'Nama Barang', 'Kategori', 'Satuan', 'Stok', 'Lokasi', 'Departemen'];
    
            if (!requiredHeaders.every(h => headers.includes(h))) {
                 throw new Error(`File Excel harus memiliki kolom: ${requiredHeaders.join(', ')}`);
            }
    
            const batch = writeBatch(db);
            const inventoryCollection = collection(db, 'inventory');
            let importedCount = 0;
            const skippedRows: SkippedRow[] = [];
    
            for (let i = 1; i < json.length; i++) {
              const row = json[i] as any[];
              const itemData: any = { type: itemType }; // Set the type based on the active tab
              
              let currentItemCode = '';
              let currentItemName = '';
              headers.forEach((header, index) => {
                const value = row[index];
                if (header === 'Kode Barang') currentItemCode = value?.toString().trim() || '';
                if (header === 'Nama Barang') currentItemName = value?.toString().trim() || '';

                switch (header) {
                    case 'Kode Barang': itemData.code = value?.toString().trim() || ''; break;
                    case 'Nama Barang': itemData.name = value?.toString().trim() || ''; break;
                    case 'Kategori': itemData.category = value?.toString() || ''; break;
                    case 'Satuan': itemData.unit = value?.toString() || ''; break;
                    case 'Stok': itemData.stock = Number(value) || 0; break;
                    case 'Lokasi': itemData.location = value?.toString() || ''; break;
                    case 'Departemen': itemData.department = value?.toString() || ''; break;
                    case 'Keterangan': itemData.notes = value?.toString() || ''; break;
                    case 'URL Foto': itemData.photoURL = value?.toString() || ''; break;
                }
              });
    
              if (!itemData.code || !itemData.name) {
                skippedRows.push({ code: itemData.code, name: itemData.name, reason: 'Kode atau Nama kosong' });
                continue;
              }

              if (existingItemCodes.has(currentItemCode)) {
                skippedRows.push({ code: currentItemCode, name: currentItemName, reason: 'Duplikat' });
                continue;
              }
    
              const newItemRef = doc(inventoryCollection);
              batch.set(newItemRef, {
                ...itemData,
                lastUpdated: serverTimestamp(),
              });
              existingItemCodes.add(currentItemCode);
              importedCount++;
            }
    
            if (importedCount > 0) {
                await batch.commit();
            }
    
            let description = `${importedCount} barang berhasil diimpor.`;
            if (skippedRows.length > 0) {
                description += ` ${skippedRows.length} data dilewati.`;
            }

            toast({
              title: 'Impor Selesai',
              description: description,
            });

            if (skippedRows.length > 0) {
                const skippedDetails = skippedRows.map(row => `- ${row.code || 'Tanpa Kode'}: ${row.reason}`).join('\n');
                toast({
                    variant: 'destructive',
                    title: `Rincian Data yang Dilewati (${skippedRows.length})`,
                    description: <pre className="whitespace-pre-wrap text-xs">{skippedDetails}</pre>,
                    duration: 15000,
                })
            }

            setIsOpen(false);
            setFile(null);
          } catch (error: any) {
            console.error('Error processing file:', error);
            toast({
              variant: 'destructive',
              title: 'Impor Gagal',
              description: error.message || 'Terjadi kesalahan saat memproses file Excel.',
            });
          } finally {
            setIsLoading(false);
          }
        };
        reader.readAsArrayBuffer(file);
    } catch (error: any) {
        console.error('Error fetching existing items:', error);
        toast({
            variant: 'destructive',
            title: 'Impor Gagal',
            description: 'Gagal memverifikasi data yang sudah ada. Silakan coba lagi.'
        });
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <FileUp className="mr-2 h-4 w-4" />
          Import Excel
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impor Stok dari Excel</DialogTitle>
          <DialogDescription>
            Pilih file .xlsx untuk mengimpor data stok {itemType} baru.
            Data dengan "Kode Barang" yang sudah ada akan dilewati.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Alert>
                <Sheet className="h-4 w-4" />
                <AlertTitle>Format File Excel</AlertTitle>
                <AlertDescription>
                    Pastikan file Anda memiliki header: Kode Barang, Nama Barang, Kategori, Satuan, Stok, Lokasi, dan Departemen. Kolom lain bersifat opsional.
                </AlertDescription>
            </Alert>
          <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} />
          {file && <p className="text-sm text-muted-foreground">File dipilih: {file.name}</p>}
        </div>
        <DialogFooter>
          <DialogClose asChild>
            <Button variant="outline" disabled={isLoading}>Batal</Button>
          </DialogClose>
          <Button onClick={handleImport} disabled={isLoading || !file}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Impor Data
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
