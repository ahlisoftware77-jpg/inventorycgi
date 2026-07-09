'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportAssetsButtonProps {
  assetsToExport: Asset[];
}

export default function ExportAssetsButton({ assetsToExport = [] }: ExportAssetsButtonProps) {
  const { toast } = useToast();
  
  const handleExport = () => {
    if (assetsToExport.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengekspor',
        description: 'Tidak ada data aset untuk diekspor.',
      });
      return;
    }

    try {
      const dataToExport = assetsToExport.map((asset) => ({
        'Kode Aset': asset.code,
        'Nama Aset': asset.name,
        'Pusat Biaya': asset.costCenter || '',
        Kategori: asset.category,
        Lokasi: asset.location,
        'Tanggal Pembelian': asset.purchaseDate instanceof Timestamp 
            ? asset.purchaseDate.toDate().toLocaleDateString('id-ID') 
            : '',
        'Harga (IDR)': asset.price,
        'Harga (USD)': asset.priceUSD || 0,
        Qty: asset.qty,
        Kondisi: asset.condition,
        Status: asset.status,
        'Masa Ketahanan Aset (Tahun)': asset.assetLifetime || 0,
        Catatan: asset.notes || '',
        Brand: asset.brand || '',
        User: asset.user || '',
        Supplier: asset.supplier || '',
        'Nomor PR': asset.prNumber || '',
        'Nomor Inspeksi': asset.inspectionNumber || '',
        'No. Insp Proyek': asset.projectInspectionNumber || '',
        'Tanggal Insp Proyek': asset.projectInspectionDate instanceof Timestamp
            ? asset.projectInspectionDate.toDate().toLocaleDateString('id-ID')
            : '',
        'Tanggal Cek Aset Mid Semester': asset.midSemesterCheckDate instanceof Timestamp
            ? asset.midSemesterCheckDate.toDate().toLocaleDateString('id-ID')
            : '',
        'Tanggal Cek Aset Akhir Semester': asset.endSemesterCheckDate instanceof Timestamp
            ? asset.endSemesterCheckDate.toDate().toLocaleDateString('id-ID')
            : '',
        'Kelengkapan 1': asset.accessory1 || '',
        'Kelengkapan 2': asset.accessory2 || '',
        'Kelengkapan 3': asset.accessory3 || '',
        'Kelengkapan 4': asset.accessory4 || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Aset');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // Kode Aset
        { wch: 30 }, // Nama Aset
        { wch: 15 }, // Pusat Biaya
        { wch: 20 }, // Kategori
        { wch: 20 }, // Lokasi
        { wch: 15 }, // Tanggal Pembelian
        { wch: 15 }, // Harga (IDR)
        { wch: 15 }, // Harga (USD)
        { wch: 10 }, // Qty
        { wch: 15 }, // Kondisi
        { wch: 15 }, // Status
        { wch: 20 }, // Masa Ketahanan Aset (Tahun)
        { wch: 40 }, // Catatan
        { wch: 15 }, // Brand
        { wch: 15 }, // User
        { wch: 15 }, // Supplier
        { wch: 15 }, // Nomor PR
        { wch: 15 }, // Nomor Inspeksi
        { wch: 20 }, // No. Insp Proyek
        { wch: 20 }, // Tanggal Insp Proyek
        { wch: 25 }, // Tanggal Cek Aset Mid Semester
        { wch: 25 }, // Tanggal Cek Aset Akhir Semester
        { wch: 20 }, // Kelengkapan 1
        { wch: 20 }, // Kelengkapan 2
        { wch: 20 }, // Kelengkapan 3
        { wch: 20 }, // Kelengkapan 4
      ];

      XLSX.writeFile(workbook, 'Daftar_Aset.xlsx');

      toast({
        title: 'Ekspor Berhasil',
        description: `Data ${assetsToExport.length} aset telah berhasil diekspor.`,
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
      className="bg-green-600 hover:bg-green-700 text-white"
    >
      <FileDown className="mr-2 h-4 w-4" />
      {assetsToExport.length > 0 ? `Export (${assetsToExport.length})` : 'Export Hasil Filter'}
    </Button>
  );
}
