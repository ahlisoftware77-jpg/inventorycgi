'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportAssetsButtonB9Props {
  assetsToExport: Asset[];
}

export default function ExportAssetsButtonB9({ assetsToExport }: ExportAssetsButtonB9Props) {
  const { toast } = useToast();

  const handleExport = () => {
    if (assetsToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengekspor',
        description: 'Tidak ada aset yang ditampilkan untuk diekspor.',
      });
      return;
    }

    try {
      const formatDate = (timestamp: Timestamp | undefined | null) => {
        if (!timestamp) return '';
        try {
          return timestamp.toDate().toLocaleDateString('id-ID');
        } catch (error) {
          console.error("Error formatting date:", error);
          return '';
        }
      };

      const sortedAssets = [...assetsToExport].sort((a, b) => (a.code || '').localeCompare(b.code || ''));

      const dataToExport = sortedAssets.map((asset, index) => ({
        'NO': index + 1,
        'Kategori': asset.category || '',
        'Nama Aset': asset.name || '',
        'Brand': asset.brand || '',
        'Qty': asset.qty || '',
        'Kondisi': asset.condition || '',
        'ACCOUNTING SERIES NO.': '', // Placeholder
        'Kode Aset': asset.code || '',
        'Nomor Peralihan asset management 2024': '', // Placeholder
        'USER': asset.user || '',
        'Tanggal Pembelian': formatDate(asset.purchaseDate),
        'REMARK': asset.notes || '',
      }));
      
      // Fill empty rows to reach 39 data rows
      while(dataToExport.length < 39) {
        dataToExport.push({
            'NO': dataToExport.length + 1,
            'Kategori': '', 'Nama Aset': '', 'Brand': '', 'Qty': '', 'Kondisi': '',
            'ACCOUNTING SERIES NO.': '', 'Kode Aset': '', 'Nomor Peralihan asset management 2024': '',
            'USER': '', 'Tanggal Pembelian': '', 'REMARK': ''
        });
      }


      const worksheet = XLSX.utils.json_to_sheet([], {
        header: [
            'NO', 'Kategori', 'Nama Aset', 'Brand', 'Qty', 'Kondisi', 
            'ACCOUNTING SERIES NO.', 'Kode Aset', 'Nomor Peralihan asset management 2024',
            'USER', 'Tanggal Pembelian', 'REMARK'
        ]
      });

      // Add main headers
      XLSX.utils.sheet_add_aoa(worksheet, [
          ['PT. CHINA GLAZE INDONESIA'],
          ['LIST ASSET']
      ], { origin: 'A1' });

      // Merge cells for titles
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 11 } }, // Merge A1 to L1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 11 } }, // Merge A2 to L2
      ];

       // Re-apply headers starting from A4
       XLSX.utils.sheet_add_aoa(worksheet, [
        [
            'NO', 'Kategori', 'Nama Aset', 'Brand', 'Qty', 'Kondisi', 
            'ACCOUNTING SERIES NO.', 'Kode Aset', 'Nomor Peralihan asset management 2024',
            'USER', 'Tanggal Pembelian', 'REMARK'
        ]
      ], { origin: 'A4' });

       // Add data starting from row 5
       XLSX.utils.sheet_add_json(worksheet, dataToExport, {
        origin: 'A5',
        skipHeader: true
       });


      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // NO
        { wch: 15 }, // Kategori
        { wch: 30 }, // Nama Aset
        { wch: 15 }, // Brand
        { wch: 5 },  // Qty
        { wch: 15 }, // Kondisi
        { wch: 20 }, // ACCOUNTING SERIES NO.
        { wch: 20 }, // Kode Aset
        { wch: 30 }, // Nomor Peralihan
        { wch: 15 }, // USER
        { wch: 15 }, // Tanggal Pembelian
        { wch: 30 }, // REMARK
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Inventaris');

      XLSX.writeFile(workbook, 'Daftar_Aset_B9.xlsx');

      toast({
        title: 'Ekspor Berhasil',
        description: `Data ${assetsToExport.length} aset telah berhasil diekspor ke Excel.`,
      });
    } catch (error) {
      console.error('Error exporting assets:', error);
      toast({
        variant: 'destructive',
        title: 'Ekspor Gagal',
        description: 'Terjadi kesalahan saat mengekspor data aset.',
      });
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={assetsToExport.length === 0}
      variant="secondary"
      className="bg-sky-600 hover:bg-sky-700 text-white"
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export Tabel B9
    </Button>
  );
}
