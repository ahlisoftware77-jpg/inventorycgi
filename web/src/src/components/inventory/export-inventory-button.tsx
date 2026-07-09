'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type InventoryItem, type InventoryType } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportInventoryButtonProps {
  items: InventoryItem[];
  itemType: InventoryType;
}

export default function ExportInventoryButton({ items, itemType }: ExportInventoryButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (items.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengekspor',
        description: 'Tidak ada data untuk diekspor.',
      });
      return;
    }

    try {
      const dataToExport = items.map((item) => ({
        'Tipe': item.type,
        'Kode Barang': item.code,
        'Nama Barang': item.name,
        'Kategori': item.category,
        'Satuan': item.unit,
        'Stok': item.stock,
        'Lokasi': item.location,
        'Departemen': item.department,
        'Keterangan': item.notes || '',
        'URL Foto': item.photoURL || '',
        'Terakhir Diperbarui': item.lastUpdated instanceof Timestamp 
            ? item.lastUpdated.toDate().toLocaleDateString('id-ID') 
            : '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Stok ${itemType}`);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // Tipe
        { wch: 15 }, // Kode Barang
        { wch: 30 }, // Nama Barang
        { wch: 20 }, // Kategori
        { wch: 10 }, // Satuan
        { wch: 10 }, // Stok
        { wch: 20 }, // Lokasi
        { wch: 15 }, // Departemen
        { wch: 40 }, // Keterangan
        { wch: 30 }, // URL Foto
        { wch: 20 }, // Terakhir Diperbarui
      ];

      XLSX.writeFile(workbook, `Stok_${itemType}.xlsx`);

      toast({
        title: 'Ekspor Berhasil',
        description: `Data stok ${itemType} telah berhasil diekspor.`,
      });
    } catch (error) {
      console.error('Error exporting inventory:', error);
      toast({
        variant: 'destructive',
        title: 'Ekspor Gagal',
        description: 'Terjadi kesalahan saat mengekspor data.',
      });
    }
  };

  return (
    <Button onClick={handleExport} variant="outline">
      <FileDown className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  );
}
