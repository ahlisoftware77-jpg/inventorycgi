'use client';

import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { WarehouseItem } from '@/app/warehouse/page';
import { Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface WarehouseExportButtonProps {
  items: WarehouseItem[];
}

export function WarehouseExportButton({ items }: WarehouseExportButtonProps) {
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
      const STANDARD_DEPT_ORDER = [
        "FRIT Spare Part",
        "FRIT Packing",
        "MTc",
        "Mixer",
        "QC",
        "R&D",
        "LAB",
        "APP",
        "PPIC",
        "GA"
      ];

      const dataToExport = items.map((item, index) => {
        const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
        const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
        const isWarning = endingStock <= 2;

        const row: any = {
          'No': index + 1,
          'Material Code': item.materialCode,
          'Material Name': item.materialName,
          'Specification': item.specification,
          'Unit': item.unit,
          'Location': item.location,
          'Status': item.status,
          'Last Stock': item.lastStock,
          'Stock In': item.stockIn,
        };

        // Add dynamic stockOut depts
        if (item.stockOut) {
          Object.entries(item.stockOut).forEach(([dept, val]) => {
            const standardMatch = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === dept.toLowerCase().replace(/\s+/g, ' ').trim());
            const keyToUse = standardMatch || dept;
            row[keyToUse] = (row[keyToUse] || 0) + val;
          });
        }

        row['Ending Stock'] = endingStock;
        row['Warning'] = isWarning ? 'BELI' : 'AMAN';

        return row;
      });



      // Get all unique columns to ensure headers are consistent
      const allKeys = new Set<string>(STANDARD_DEPT_ORDER);
      dataToExport.forEach(row => {
        Object.keys(row).forEach(k => {
          const isStandard = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === k.toLowerCase().replace(/\s+/g, ' ').trim());
          if (!isStandard) {
            allKeys.add(k);
          }
        });
      });
      
      // Ensure specific order for dynamic columns
      const headers = ['No', 'Material Code', 'Material Name', 'Specification', 'Unit', 'Location', 'Status', 'Last Stock', 'Stock In'];
      const standardCols = [...headers, 'Ending Stock', 'Warning'];
      
      const deptHeaders = Array.from(allKeys).filter(k => !standardCols.includes(k)).sort((a, b) => {
        const nameA = a.replace(/\s+/g, ' ').trim();
        const nameB = b.replace(/\s+/g, ' ').trim();
        let idxA = STANDARD_DEPT_ORDER.indexOf(nameA);
        let idxB = STANDARD_DEPT_ORDER.indexOf(nameB);
        if (idxA === -1) idxA = 999;
        if (idxB === -1) idxB = 999;
        if (idxA === idxB) return nameA.localeCompare(nameB);
        return idxA - idxB;
      });
      
      headers.push(...deptHeaders, 'Ending Stock', 'Warning');

      const worksheet = XLSX.utils.json_to_sheet(dataToExport, { header: headers });
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Warehouse Opname');

      // Set column widths roughly
      worksheet['!cols'] = [
        { wch: 5 }, // No
        { wch: 15 }, // Code
        { wch: 25 }, // Name
        { wch: 25 }, // Spec
        { wch: 8 },  // Unit
        { wch: 10 }, // Location
        { wch: 10 }, // Status
        { wch: 10 }, // Last Stock
        { wch: 10 }, // Stock In
        ...deptHeaders.map(() => ({ wch: 12 })),
        { wch: 12 }, // Ending
        { wch: 10 }, // Warning
      ];

      XLSX.writeFile(workbook, `Warehouse_Opname_${new Date().toLocaleDateString('id-ID')}.xlsx`);

      toast({
        title: 'Berhasil',
        description: 'File Excel berhasil diunduh.',
      });
    } catch (error) {
      console.error(error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Terjadi kesalahan saat mengekspor data.',
      });
    }
  };

  return (
    <Button variant="outline" className="border-slate-200 hover:bg-slate-100 font-bold" onClick={handleExport}>
      <Download className="w-4 h-4 mr-2" />
      Export Excel
    </Button>
  );
}
