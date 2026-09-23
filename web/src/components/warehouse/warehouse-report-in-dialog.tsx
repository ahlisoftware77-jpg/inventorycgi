"use client";

import { useState, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { WarehouseItem } from "@/app/warehouse/page";
import { PackageOpen, Printer } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WarehouseReportInDialogProps {
  items: WarehouseItem[];
}

export function WarehouseReportInDialog({ items }: WarehouseReportInDialogProps) {
  const [open, setOpen] = useState(false);
  const [filterPeriod, setFilterPeriod] = useState("today");
  const [filterMaterial, setFilterMaterial] = useState("all");

  const baseData = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());

    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

    const data: {
      materialCode: string;
      materialName: string;
      date: string;
      supplier: string;
      poNumber: string;
      value: number;
    }[] = [];

    items.forEach(item => {
      if (!item.stockInHistory) return;

      item.stockInHistory.forEach(record => {
        if (!record.date) return;
        
        const recordDate = new Date(record.date);
        recordDate.setHours(0, 0, 0, 0);

        let include = false;
        if (filterPeriod === "today") {
          include = recordDate.getTime() === today.getTime();
        } else if (filterPeriod === "week") {
          include = recordDate >= startOfWeek;
        } else if (filterPeriod === "month") {
          include = recordDate >= startOfMonth;
        } else if (filterPeriod === "all") {
          include = true;
        }

        if (include && record.value > 0) {
          data.push({
            materialCode: item.materialCode,
            materialName: item.materialName,
            date: record.date,
            supplier: record.supplier,
            poNumber: record.poNumber,
            value: record.value
          });
        }
      });
    });

    // Sort by date descending
    data.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return data;
  }, [items, filterPeriod]);

  const uniqueMaterials = useMemo(() => {
    const names = new Set<string>();
    baseData.forEach(r => names.add(r.materialName));
    return Array.from(names).sort();
  }, [baseData]);

  const reportData = useMemo(() => {
    if (filterMaterial === "all") return baseData;
    return baseData.filter(r => r.materialName === filterMaterial);
  }, [baseData, filterMaterial]);

  const totalMasuk = reportData.reduce((sum, r) => sum + r.value, 0);

  const handlePrint = () => {
    const printContent = document.getElementById("stock-in-print-area");
    if (!printContent) return;

    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    const today = new Date();
    const formatDate = (d: Date) => d.toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });

    let dateDetail = "";
    if (filterPeriod === 'today') {
      dateDetail = `(${formatDate(today)})`;
    } else if (filterPeriod === 'week') {
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      dateDetail = `(${formatDate(startOfWeek)} - ${formatDate(today)})`;
    } else if (filterPeriod === 'month') {
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      dateDetail = `(${formatDate(startOfMonth)} - ${formatDate(today)})`;
    } else {
      dateDetail = "(Semua Data)";
    }

    const periodLabel = 
      (filterPeriod === 'today' ? 'Hari Ini ' : 
      filterPeriod === 'week' ? 'Minggu Ini ' : 
      filterPeriod === 'month' ? 'Bulan Ini ' : 'Semua Waktu ') + dateDetail;
      
    const materialLabel = filterMaterial === 'all' ? 'Semua Material' : filterMaterial;

    printWindow.document.write(`
      <html>
        <head>
          <title>Laporan Stock In - ${periodLabel}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; font-size: 12px; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
            th { background-color: #f3f4f6; }
            .header { margin-bottom: 20px; }
            .header h1 { margin: 0 0 10px 0; font-size: 20px; }
            .summary { font-weight: bold; margin-bottom: 20px; padding: 10px; background-color: #f8fafc; border: 1px solid #e2e8f0; display: inline-block; }
            .text-right { text-align: right; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Laporan Penerimaan Barang (Stock In)</h1>
            <p>Periode: <strong>${periodLabel}</strong><br>Material: <strong>${materialLabel}</strong></p>
          </div>
          <div class="summary">
            Total Item Masuk: ${totalMasuk}
          </div>
          ${printContent.outerHTML}
        </body>
      </html>
    `);

    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 250);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-3 lg:px-4 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
          <PackageOpen className="w-4 h-4 mr-2" />
          <span className="hidden lg:inline">Laporan Stock In</span>
          <span className="lg:hidden">Laporan Masuk</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Laporan Barang Masuk (Stock In)</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4 py-4 flex-1 overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Periode:</span>
              <Select value={filterPeriod} onValueChange={(v) => { setFilterPeriod(v); setFilterMaterial("all"); }}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Pilih Periode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hari Ini</SelectItem>
                  <SelectItem value="week">Minggu Ini</SelectItem>
                  <SelectItem value="month">Bulan Ini</SelectItem>
                  <SelectItem value="all">Semua Waktu</SelectItem>
                </SelectContent>
              </Select>
              
              <span className="text-sm font-medium ml-2 hidden sm:inline">Material:</span>
              <Select value={filterMaterial} onValueChange={setFilterMaterial}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Semua Material" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Material</SelectItem>
                  {uniqueMaterials.map(name => (
                    <SelectItem key={name} value={name}>{name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="bg-emerald-50 px-4 py-2 rounded-lg border border-emerald-100 flex items-center gap-3">
                <span className="text-sm text-emerald-600 font-medium">Total Masuk:</span>
                <span className="text-lg font-black text-emerald-700">{totalMasuk}</span>
              </div>
              <Button onClick={handlePrint} className="bg-slate-800 hover:bg-slate-900 text-white">
                <Printer className="w-4 h-4 mr-2" /> Print
              </Button>
            </div>
          </div>

          <div className="border rounded-lg overflow-auto flex-1 bg-white">
            <table id="stock-in-print-area" className="w-full text-sm text-left">
              <thead className="bg-slate-50 sticky top-0 border-b">
                <tr>
                  <th className="px-4 py-3 font-semibold text-slate-600">Tanggal</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Material Code</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Nama Barang</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">Supplier/Sumber</th>
                  <th className="px-4 py-3 font-semibold text-slate-600">No. PO</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-right">Jumlah</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map((row, idx) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-slate-50/50">
                    <td className="px-4 py-3 whitespace-nowrap">{row.date}</td>
                    <td className="px-4 py-3 font-medium text-slate-900">{row.materialCode}</td>
                    <td className="px-4 py-3 text-slate-600">{row.materialName}</td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-1 bg-emerald-100 text-emerald-700 rounded-md text-xs font-semibold">
                        {row.supplier || "-"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.poNumber || "-"}</td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-600">+{row.value}</td>
                  </tr>
                ))}
                {reportData.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                      Tidak ada data barang masuk pada periode ini.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
