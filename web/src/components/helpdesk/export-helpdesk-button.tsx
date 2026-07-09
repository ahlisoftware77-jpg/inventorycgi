'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type HelpdeskTicket } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';
import { format } from 'date-fns';

interface ExportHelpdeskButtonProps {
  tickets: HelpdeskTicket[];
  reportMap: Record<string, string>;
}

export default function ExportHelpdeskButton({ tickets, reportMap }: ExportHelpdeskButtonProps) {
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

      const dataToExport = tickets.map((ticket) => {
        const publicStatusLink = `${window.location.origin}/public/helpdesk?id=${ticket.id}`;
        
        // Cek apakah laporan resmi (0-32-028) sudah ada untuk tiket ini
        const reportId = reportMap[ticket.id];
        
        // Jika laporan ada, gunakan link direct ID. Jika tidak, gunakan link pre-filled creation.
        const publicFormLink = reportId 
            ? `${window.location.origin}/public/it-report?id=${reportId}`
            : `${window.location.origin}/public/it-report?ticketId=${ticket.id}&problem=${encodeURIComponent(ticket.description)}&dept=${encodeURIComponent(ticket.reporterDept || '')}`;

        return {
          'No. Tiket': ticket.ticketNumber,
          'Kategori': ticket.category,
          'Urgensi': ticket.priority || 'Normal',
          'Status': ticket.status,
          'Tanggal Laporan': formatDate(ticket.reportedAt),
          'Pelapor': ticket.reporterName,
          'Departemen Pelapor': ticket.reporterDept,
          'Deskripsi Masalah': ticket.description,
          'Riwayat Progres': formatUpdates(ticket.updates),
          'Link Status Publik': publicStatusLink,
          'Link Form IT Resmi (0-32-028)': publicFormLink,
          'URL Lampiran': ticket.photoURL || '',
        };
      });

      const worksheet = XLSX.utils.json_to_sheet(dataToExport);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Helpdesk Tickets');

      // Set column widths
      worksheet['!cols'] = [
        { wch: 20 }, // No. Tiket
        { wch: 15 }, // Kategori
        { wch: 10 }, // Urgensi
        { wch: 15 }, // Status
        { wch: 20 }, // Tanggal Laporan
        { wch: 20 }, // Pelapor
        { wch: 20 }, // Departemen Pelapor
        { wch: 50 }, // Deskripsi Masalah
        { wch: 70 }, // Riwayat Progres
        { wch: 45 }, // Link Status
        { wch: 45 }, // Link Form
        { wch: 40 }, // URL Lampiran
      ];

      XLSX.writeFile(workbook, `Laporan_IT_Helpdesk_${format(new Date(), 'yyyyMMdd')}.xlsx`);

      toast({
        title: 'Ekspor Berhasil',
        description: `Data ${tickets.length} tiket telah berhasil diekspor ke format Excel.`,
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
    <Button 
      onClick={handleExport} 
      className="h-10 sm:h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-widest shadow-[0_4px_0_0_rgba(5,150,105,0.3)] active:translate-y-[2px] active:shadow-none transition-all"
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export Excel
    </Button>
  );
}
