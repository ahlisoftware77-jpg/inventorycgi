
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
import { collection, writeBatch, Timestamp, serverTimestamp, doc, getDocs, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { FileUp, Loader2, Sheet, FileDown } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';

// Function to parse Excel serial date to JS Date
const excelSerialDateToJSDate = (serial: number) => {
    if (typeof serial !== 'number') return null;
    // Excel's epoch starts on 1900-01-01, but it incorrectly thinks 1900 is a leap year.
    // So, we subtract 1 for dates after Feb 28, 1900.
    const excelEpoch = new Date(Date.UTC(1899, 11, 30));
    const date = new Date(excelEpoch.getTime() + serial * 86400000);
    // Adjust for the 1900 leap year bug for dates after Feb 28, 1900 (serial > 60)
    if (serial > 60) {
        return new Date(date.getTime() + 86400000); // Add one day
    }
    return date;
};

interface SkippedRow {
  code: string;
  name: string;
  reason: string;
}

export default function ImportAssetsDialog() {
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
    const headers = [
      'Kode Aset', 'Nama Aset', 'Pusat Biaya', 'Kategori', 'Lokasi',
      'Tanggal Pembelian', 'Harga (IDR)', 'Harga (USD)', 'Qty', 'Kondisi', 'Status',
      'Masa Ketahanan Aset (Tahun)', 'Catatan', 'Brand', 'User', 'Supplier',
      'Nomor PR', 'Nomor Inspeksi', 'No. Insp Proyek', 'Tanggal Insp Proyek',
      'Tanggal Cek Aset Mid Semester', 'Tanggal Cek Aset Akhir Semester',
      'Kelengkapan 1', 'Kelengkapan 2', 'Kelengkapan 3', 'Kelengkapan 4'
    ];
    
    // Create an empty worksheet with headers
    const ws = XLSX.utils.aoa_to_sheet([headers]);

    // Set column widths
    ws['!cols'] = headers.map(header => ({ wch: header.length + 5 }));

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Template Aset');
    XLSX.writeFile(wb, 'template_impor_aset.xlsx');
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
        const assetsQuery = query(collection(db, 'assets'));
        const querySnapshot = await getDocs(assetsQuery);
        const existingAssetCodes = new Set(querySnapshot.docs.map(doc => doc.data().code));
        
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
            const requiredHeaders = ['Kode Aset', 'Nama Aset', 'Kategori', 'Lokasi', 'Tanggal Pembelian', 'Harga (IDR)', 'Qty', 'Kondisi', 'Status'];
    
            if (!requiredHeaders.every(h => headers.includes(h))) {
                 throw new Error(`File Excel harus memiliki kolom: ${requiredHeaders.join(', ')}`);
            }
    
            const batch = writeBatch(db);
            const assetsCollection = collection(db, 'assets');
            let importedCount = 0;
            const skippedRows: SkippedRow[] = [];
    
            for (let i = 1; i < json.length; i++) {
              const row = json[i] as any[];
              const assetData: any = {};
              
              let currentAssetCode = '';
              let currentAssetName = '';
              headers.forEach((header, index) => {
                let value = row[index];
                if (header === 'Kode Aset') {
                    currentAssetCode = value?.toString().trim() || '';
                }
                if (header === 'Nama Aset') {
                    currentAssetName = value?.toString().trim() || '';
                }
                switch (header) {
                    case 'Kode Aset': assetData.code = value?.toString().trim() || ''; break;
                    case 'Nama Aset': assetData.name = value?.toString().trim() || ''; break;
                    case 'Pusat Biaya': assetData.costCenter = value?.toString() || ''; break;
                    case 'Kategori': assetData.category = value?.toString() || ''; break;
                    case 'Lokasi': assetData.location = value?.toString() || ''; break;
                    case 'Tanggal Pembelian':
                        const purchaseDate = excelSerialDateToJSDate(value);
                        if (purchaseDate && !isNaN(purchaseDate.getTime())) {
                            assetData.purchaseDate = Timestamp.fromDate(purchaseDate);
                        }
                        break;
                    case 'Harga (IDR)': assetData.price = Number(value) || 0; break;
                    case 'Harga (USD)': assetData.priceUSD = Number(value) || 0; break;
                    case 'Qty': assetData.qty = Number(value) || 1; break;
                    case 'Kondisi': assetData.condition = value?.toString() || 'Baik'; break;
                    case 'Status': assetData.status = value?.toString() || 'Aktif'; break;
                    case 'Masa Ketahanan Aset (Tahun)': assetData.assetLifetime = Number(value) || 0; break;
                    case 'Catatan': assetData.notes = value?.toString() || ''; break;
                    case 'Brand': assetData.brand = value?.toString() || ''; break;
                    case 'User': assetData.user = value?.toString() || ''; break;
                    case 'Supplier': assetData.supplier = value?.toString() || ''; break;
                    case 'Nomor PR': assetData.prNumber = value?.toString() || ''; break;
                    case 'Nomor Inspeksi': assetData.inspectionNumber = value?.toString() || ''; break;
                    case 'No. Insp Proyek': assetData.projectInspectionNumber = value?.toString() || ''; break;
                    case 'Tanggal Insp Proyek':
                        const inspDate = excelSerialDateToJSDate(value);
                        if (inspDate && !isNaN(inspDate.getTime())) {
                            assetData.projectInspectionDate = Timestamp.fromDate(inspDate);
                        }
                        break;
                    case 'Tanggal Cek Aset Mid Semester':
                        const midDate = excelSerialDateToJSDate(value);
                        if (midDate && !isNaN(midDate.getTime())) {
                            assetData.midSemesterCheckDate = Timestamp.fromDate(midDate);
                        }
                        break;
                    case 'Tanggal Cek Aset Akhir Semester':
                        const endDate = excelSerialDateToJSDate(value);
                        if (endDate && !isNaN(endDate.getTime())) {
                            assetData.endSemesterCheckDate = Timestamp.fromDate(endDate);
                        }
                        break;
                    case 'Kelengkapan 1': assetData.accessory1 = value?.toString() || ''; break;
                    case 'Kelengkapan 2': assetData.accessory2 = value?.toString() || ''; break;
                    case 'Kelengkapan 3': assetData.accessory3 = value?.toString() || ''; break;
                    case 'Kelengkapan 4': assetData.accessory4 = value?.toString() || ''; break;
                }
              });
    
              if (!assetData.code || !assetData.name) {
                skippedRows.push({ code: assetData.code, name: assetData.name, reason: 'Kode atau Nama kosong' });
                continue;
              }

              if (existingAssetCodes.has(currentAssetCode)) {
                skippedRows.push({ code: currentAssetCode, name: currentAssetName, reason: 'Duplikat' });
                continue;
              }
    
              const newAssetRef = doc(assetsCollection);
              batch.set(newAssetRef, {
                ...assetData,
                borrowingHistory: [],
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
              });
              existingAssetCodes.add(currentAssetCode); // Add to set to prevent duplicates within the same file
              importedCount++;
            }
    
            if (importedCount > 0) {
                await batch.commit();
            }
    
            let description = `${importedCount} aset berhasil diimpor.`;
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
        console.error('Error fetching existing assets:', error);
        toast({
            variant: 'destructive',
            title: 'Impor Gagal',
            description: 'Gagal memverifikasi data aset yang sudah ada. Silakan coba lagi.'
        });
        setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 text-white">
          <FileUp className="mr-2 h-4 w-4" />
          Import
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Impor Aset dari Excel</DialogTitle>
          <DialogDescription>
            Pilih file .xlsx untuk mengimpor data aset baru secara massal. Data dengan "Kode Aset" yang sudah ada akan dilewati.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
            <Alert>
                <Sheet className="h-4 w-4" />
                <AlertTitle>Format File Excel</AlertTitle>
                <AlertDescription>
                    Pastikan file Anda memiliki header yang sesuai dengan template.
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
