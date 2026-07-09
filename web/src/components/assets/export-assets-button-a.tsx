'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { type Asset } from '@/lib/types';
import { FileDown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Timestamp } from 'firebase/firestore';

interface ExportAssetsButtonAProps {
  assetsToExport: Asset[];
}

export default function ExportAssetsButtonA({ assetsToExport }: ExportAssetsButtonAProps) {
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
          return timestamp.toDate().toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
        } catch (error) {
          console.error("Error formatting date:", error);
          return '';
        }
      };
      
      const sortedAssets = [...assetsToExport].sort((a, b) => (a.code || '').localeCompare(b.code || ''));
      const uniqueLocations = Array.from(new Set(sortedAssets.map(asset => asset.location))).join(', ');
      const deptTitle = `LIST ASSET A SERIES "${uniqueLocations || 'Dept'}"`;

      const dataToExport = sortedAssets.map((asset, index) => {
        const midDate = formatDate(asset.midSemesterCheckDate);
        const endDate = formatDate(asset.endSemesterCheckDate);
        const updateDate = [midDate, endDate].filter(Boolean).join(' / ');

        return {
          'NO.': index + 1,
          'COST CENTER': asset.costCenter || '',
          'FIXED ASSET NO.': asset.code || '',
          'NAME': asset.name || '',
          'Unit': asset.qty ? 'Unit' : '', // Assuming 'Unit' if qty exists
          'Qty': asset.qty || '',
          '1st Checker': '',
          '2nd Checker': '',
          'Tgl Update': updateDate,
          'Remark': asset.notes || '',
        };
      });

      // Add empty rows to reach 40 data rows
      while(dataToExport.length < 40) {
        dataToExport.push({
          'NO.': dataToExport.length + 1,
          'COST CENTER': '', 'FIXED ASSET NO.': '', 'NAME': '', 'Unit': '', 'Qty': '',
          '1st Checker': '', '2nd Checker': '', 'Tgl Update': '', 'Remark': '',
        });
      }
      
      const worksheet = XLSX.utils.json_to_sheet([]);

      // Add titles
      XLSX.utils.sheet_add_aoa(worksheet, [['PT. China Glaze Indonesia']], { origin: 'A1' });
      XLSX.utils.sheet_add_aoa(worksheet, [[deptTitle]], { origin: 'A2' });

      // Merge cells for titles
      worksheet['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 9 } }, // Merge A1 to J1
        { s: { r: 1, c: 0 }, e: { r: 1, c: 9 } }  // Merge A2 to J2
      ];

      // Add main headers
      XLSX.utils.sheet_add_aoa(worksheet, [[
          "NO.", "COST CENTER", "FIXED ASSET NO.", "NAME", "Unit", "Qty", 
          "1st Checker", "2nd Checker", "Tgl Update", "Remark"
      ]], { origin: 'A4' });

      // Add sub-headers
      XLSX.utils.sheet_add_aoa(worksheet, [
        ['', '', '財產編號', '名 稱', '單位', '', '', '', '', '']
      ], { origin: 'A5' });
      
      // Add data starting from row 6
      XLSX.utils.sheet_add_json(worksheet, dataToExport, {
          origin: "A6",
          skipHeader: true,
      });
      
      // Add signature section
      const signatureRowStart = 6 + dataToExport.length + 2; // 2 rows gap
      XLSX.utils.sheet_add_aoa(worksheet, [
          ['Atasan', 'Yg Merawat', '1st', '2nd', 'Atasan', 'Dibuat']
      ], { origin: { r: signatureRowStart, c: 0 } });
      
       // Add empty boxes for signatures
      XLSX.utils.sheet_add_aoa(worksheet, [
          ['', '', '', '', '', ''] 
      ], { origin: { r: signatureRowStart + 1, c: 0 } });
       
       // Apply styles (basic example, xlsx-style is needed for more)
       // This part is for layout, not complex styling
        worksheet['A1'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' }};
        worksheet['A2'].s = { font: { bold: true, sz: 12 }, alignment: { horizontal: 'center' }};
        ['A4', 'B4', 'C4', 'D4', 'E4', 'F4', 'G4', 'H4', 'I4', 'J4'].forEach(cell => {
             if(worksheet[cell]) worksheet[cell].s = { font: { bold: true }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true } };
        });
         ['A5', 'B5', 'C5', 'D5', 'E5', 'F5', 'G5', 'H5', 'I5', 'J5'].forEach(cell => {
             if(worksheet[cell]) worksheet[cell].s = { alignment: { horizontal: 'center', vertical: 'center' } };
        });


      // Set column widths
      worksheet['!cols'] = [
        { wch: 5 },  // NO.
        { wch: 15 }, // COST CENTER
        { wch: 20 }, // FIXED ASSET NO.
        { wch: 35 }, // NAME
        { wch: 10 }, // Unit
        { wch: 5 },  // Qty
        { wch: 12 }, // 1st Checker
        { wch: 12 }, // 2nd Checker
        { wch: 15 }, // Tgl Update
        { wch: 30 }, // Remark
      ];

      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Daftar Inventaris A');

      XLSX.writeFile(workbook, 'Daftar_Aset_A_Series.xlsx');

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
      className="bg-teal-600 hover:bg-teal-700 text-white"
    >
      <FileDown className="mr-2 h-4 w-4" />
      Export Tabel A
    </Button>
  );
}
