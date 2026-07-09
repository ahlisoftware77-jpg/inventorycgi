'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type HelpdeskTicket } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportHelpdeskButtonProps {
  tickets: HelpdeskTicket[];
}

export default function ExportHelpdeskButton({ tickets }: ExportHelpdeskButtonProps) {
  const { toast } = useToast();

  const handleExport = () => {
    if (tickets.length === 0) {
      toast({
        variant: 'destructive',
        title: 'Tidak ada data untuk diekspor',
        description: 'Tidak ada tiket helpdesk yang dapat diekspor.',
      });
      return;
    }

    try {
      const formatDate = (timestamp: Timestamp | undefined | null) => {
        if (!timestamp) return '';
        try {
          return timestamp.toDate().toLocaleString('id-ID', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
          });
        } catch (error) {
          return '';
        }
      };
      
      const formatUpdates = (updates: HelpdeskTicket['updates']) => {
        if (!updates || updates.length === 0) return '';
        return updates.map(update => 
            `[${formatDate(update.updatedAt)}] oleh ${update.updaterName}: ${update.note}`
        ).join('\n');
      };

      const dataToExport = tickets.map((ticket) => ({
        'No. Tiket': ticket.ticketNumber,
        'Kategori': ticket.category,
        'Status': ticket.status,
        'Tanggal Laporan': formatDate(ticket.reportedAt),
        'Pelapor': ticket.reporterName,
        'Departemen Pelapor': ticket.reporterDept,
        'Deskripsi Masalah': ticket.description,
        'Riwayat Progres': formatUpdates(ticket.updates),
        'URL Foto': ticket.photoURL || '',
      }));

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Helpdesk Tickets');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // No. Tiket
        { wch: 15 }, // Kategori
        { wch: 15 }, // Status
        { wch: 20 }, // Tanggal Laporan
        { wch: 20 }, // Pelapor
        { wch: 20 }, // Departemen Pelapor
        { wch: 50 }, // Deskripsi Masalah
        { wch: 70 }, // Riwayat Progres
        { wch: 40 }, // URL Foto
      ];

      XLSX.writeFile(workbook, 'Laporan_IT_Helpdesk.xlsx');

      toast({
        title: 'Ekspor Berhasil',
        description: `Data ${tickets.length} tiket telah berhasil diekspor.`,
      });
    } catch (error) {
      console.error('Error exporting helpdesk tickets:', error);
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