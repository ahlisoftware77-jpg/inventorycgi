'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportMutationsButtonProps {
  assets: Asset[];
  activeTab: string;
}

export default function ExportMutationsButton({ assets, activeTab }: ExportMutationsButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (assets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Gagal Mengekspor',
        description: 'Tidak ada data untuk diekspor pada tab ini.',
      });
      return;
    }

    try {
      const formatDate = (timestamp: any) => {
        if (!timestamp) return '';
        const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('id-ID');
      };

      const dataToExport = assets.map((asset) => ({
        'Kode Transaksi': asset.transactionCode || '',
        'Kode Aset': asset.code,
        'Nama Aset': asset.name,
        'Kategori': asset.category,
        'Qty': asset.qty,
        'Lokasi Sebelumnya': asset.status === 'approved_mutasi' ? (asset.notes?.match(/Mutasi \d+ unit dari: (.*?) ke/)?.[1]?.trim() || '') : asset.location,
        'Lokasi Baru': asset.status === 'approved_mutasi' ? asset.location : '',
        'Status': asset.status.replace(/_/g, ' '),
        'Kondisi': asset.condition,
        'Diajukan Oleh': (asset as any).requesterName || '',
        'Disetujui Oleh': (asset as any).approverName || '',
        'Tanggal Diajukan': formatDate(asset.requestedAt),
        'Tanggal Disetujui': formatDate(asset.approvedAt),
        'Catatan': asset.notes || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, `Laporan ${activeTab}`);

      // Set column widths
      worksheet['!cols'] = [
        { wch: 15 }, // Kode Transaksi
        { wch: 20 }, // Kode Aset
        { wch: 30 }, // Nama Aset
        { wch: 15 }, // Kategori
        { wch: 5 },  // Qty
        { wch: 20 }, // Lokasi Sebelumnya
        { wch: 20 }, // Lokasi Baru
        { wch: 15 }, // Status
        { wch: 15 }, // Kondisi
        { wch: 20 }, // Diajukan Oleh
        { wch: 20 }, // Disetujui Oleh
        { wch: 15 }, // Tanggal Diajukan
        { wch: 15 }, // Tanggal Disetujui
        { wch: 50 }, // Catatan
      ];

      XLSX.writeFile(workbook, `Laporan_${activeTab}.xlsx`);

      toast({
        title: 'Ekspor Berhasil',
        description: `Data dari tab "${activeTab}" telah berhasil diekspor.`,
      });
    } catch (error) {
      console.error('Error exporting mutations:', error);
      toast({
        variant: 'destructive',
        title: 'Ekspor Gagal',
        description: 'Terjadi kesalahan saat mengekspor data.',
      });
    }
  };

  return (
    <Button
      onClick={handleExport}
      disabled={assets.length === 0}
      variant="outline"
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  );
}
