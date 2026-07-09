
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
import { collection, writeBatch, Timestamp, serverTimestamp, doc, getDocs, query, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FileUp, Loader2, Sheet, Upload, FileDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// Function to parse various date formats, including Excel serial date
const parseDate = (dateValue: any): Date | null => {
    if (dateValue === null || dateValue === undefined) return null;

    // 1. If it's already a Date object
    if (dateValue instanceof Date && !isNaN(dateValue.getTime())) {
        return dateValue;
    }

    // 2. If it's a number (likely Excel serial date)
    if (typeof dateValue === 'number' && dateValue > 0) {
        // Excel's epoch starts on 1900-01-01, but it incorrectly thinks 1900 is a leap year.
        const excelEpoch = new Date(Date.UTC(1899, 11, 30));
        const date = new Date(excelEpoch.getTime() + dateValue * 86400000);
        if (dateValue > 59) { // Adjust for the 1900 leap year bug
            date.setDate(date.getDate() + 1);
        }
        return date;
    }
    
    // 3. If it's a string, try parsing common formats
    if (typeof dateValue === 'string') {
        // Try to parse formats like YYYY-MM-DD, DD/MM/YYYY, MM/DD/YYYY
        const date = new Date(dateValue.replace(/(\d{2})\/(\d{2})\/(\d{4})/, '$3-$2-$1')); // Handle DD/MM/YYYY
        if (!isNaN(date.getTime())) {
            return date;
        }
    }
    
    return null;
};

interface SkippedRow {
  code: string;
  name: string;
  reason: string;
}

export default function ImportFixAssetDialog() {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleDownloadTemplate = () => {
    const headers = ['kode_aset', 'nama_aset', 'jumlah', 'harga', 'tanggal_perolehan', 'penyusutan'];
    const exampleData = [
      {
        kode_aset: 'A2-SAMPLE-001',
        nama_aset: 'Contoh Gedung Kantor',
        jumlah: 1,
        harga: 500000000,
        tanggal_perolehan: '01/01/2024',
        penyusutan: 10000000,
      }
    ];

    const worksheet = XLSX.utils.json_to_sheet(exampleData, { header: headers });

    // Custom headers with better names
    const headerRow = [
      "kode_aset",
      "nama_aset",
      "jumlah",
      "harga",
      "tanggal_perolehan",
      "penyusutan"
    ];
    XLSX.utils.sheet_add_aoa(worksheet, [headerRow], { origin: 'A1' });

    worksheet['!cols'] = [
        { wch: 20 }, { wch: 30 }, { wch: 10 }, { wch: 15 }, { wch: 20 }, { wch: 20 }
    ];
    
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Data Akuntansi');
    XLSX.writeFile(workbook, 'Template_Aset_Akuntansi.xlsx');
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
        // Fetch existing asset codes to check for duplicates
        const collectionRef = collection(db, 'data_fix_asset_accounting');
        const existingDocs = await getDocs(query(collectionRef));
        const existingAssetCodes = new Set(existingDocs.docs.map(doc => doc.data().kode_aset?.toString().trim().toLowerCase()));
        
        const reader = new FileReader();
        reader.onload = async (event) => {
          try {
            const data = new Uint8Array(event.target?.result as ArrayBuffer);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[sheetName];
            const json: any[] = XLSX.utils.sheet_to_json(worksheet);
    
            if (json.length < 1) {
              throw new Error('File Excel kosong atau tidak memiliki data.');
            }
    
            const uploadBatch = writeBatch(db);
            let importedCount = 0;
            const skippedRows: SkippedRow[] = [];
    
            for (const row of json) {
              
              const getVal = (keyVariations: string[]) => {
                  for (const key of keyVariations) {
                      if (row[key] !== undefined) return row[key];
                  }
                  return undefined;
              };

              const kode_aset = getVal(['kode_aset', 'Kode Aset']);
              const nama_aset = getVal(['nama_aset', 'Nama Aset']);
              const jumlah = getVal(['jumlah', 'Jumlah']);
              const harga = getVal(['harga', 'Harga']);
              const tanggal_perolehan = getVal(['tanggal_perolehan', 'Tanggal Perolehan']);
              const penyusutan = getVal(['penyusutan', 'Nilai Penyusutan']);

              if (!kode_aset || !nama_aset) {
                skippedRows.push({ code: kode_aset || 'N/A', name: nama_aset || 'N/A', reason: 'Kode atau Nama kosong' });
                continue;
              }

              const trimmedCode = String(kode_aset).trim().toLowerCase();
              if (existingAssetCodes.has(trimmedCode)) {
                skippedRows.push({ code: String(kode_aset), name: String(nama_aset), reason: 'Duplikat' });
                continue;
              }

              const assetData: any = {
                  kode_aset: String(kode_aset).trim(),
                  nama_aset: String(nama_aset).trim(),
                  jumlah: Number(jumlah) || 0,
                  harga: Number(harga) || 0,
                  penyusutan: Number(penyusutan) || 0,
              };

              const purchaseDate = parseDate(tanggal_perolehan);
              if (purchaseDate) {
                  assetData.tanggal_perolehan = Timestamp.fromDate(purchaseDate);
              } else {
                  skippedRows.push({ code: assetData.kode_aset, name: assetData.nama_aset, reason: 'Format tanggal perolehan tidak valid' });
                  continue;
              }
    
              const newAssetRef = doc(collectionRef);
              uploadBatch.set(newAssetRef, assetData);
              existingAssetCodes.add(trimmedCode); // Add to set to prevent duplicates from the same file
              importedCount++;
            }
    
            if (importedCount > 0) {
                await uploadBatch.commit();
            }
    
            let description = `${importedCount} data aset akuntansi berhasil ditambahkan.`;
            if (skippedRows.length > 0) {
                description += ` ${skippedRows.length} data dilewati.`;
            }

            toast({
              title: 'Impor Selesai',
              description: description,
            });

            if (skippedRows.length > 0) {
                const skippedDetails = skippedRows.map(row => `- ${row.code || 'Tanpa Kode'}: ${row.reason}`).join('\\n');
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
        console.error('Error preparing for import:', error);
        toast({
            variant: 'destructive',
            title: 'Impor Gagal',
            description: 'Gagal memverifikasi data lama sebelum impor. Silakan coba lagi.'
        });
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline"><Upload className="mr-2 h-4 w-4" /> Upload Excel (Akuntansi)</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impor Data Aset Akuntansi</DialogTitle>
          <DialogDescription>
            Pilih file .xlsx untuk menambahkan data aset akuntansi baru. Data dengan `kode_aset` yang sudah ada akan dilewati.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Alert variant="default">
                <Sheet className="h-4 w-4" />
                <AlertTitle>Format File Excel</AlertTitle>
                <AlertDescription>
                    Gunakan template yang disediakan. Pastikan file Anda memiliki header yang sesuai.
                </AlertDescription>
            </Alert>
          <div className="flex flex-col sm:flex-row gap-2">
            <Input type="file" accept=".xlsx, .xls" onChange={handleFileChange} className="flex-grow"/>
            <Button variant="secondary" onClick={handleDownloadTemplate} type="button">
                <FileDown className="mr-2 h-4 w-4" />
                Unduh Template
            </Button>
          </div>
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
