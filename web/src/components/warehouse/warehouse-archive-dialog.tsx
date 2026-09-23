"use client";

import { useState, useEffect } from "react";
import { collection, query, orderBy, getDocs, doc } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Archive, Search, Download, Loader2 } from "lucide-react";
import { WarehouseItem } from "@/app/warehouse/page";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import * as XLSX from "xlsx";

export function WarehouseArchiveDialog() {
  const [open, setOpen] = useState(false);
  const [periods, setPeriods] = useState<{ id: string; closedAt: any; closedByName: string }[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<string>("");
  const [loadingPeriods, setLoadingPeriods] = useState(false);
  
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

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

  useEffect(() => {
    if (open) {
      fetchPeriods();
    }
  }, [open]);

  useEffect(() => {
    if (selectedPeriod) {
      fetchItems(selectedPeriod);
    } else {
      setItems([]);
    }
  }, [selectedPeriod]);

  const fetchPeriods = async () => {
    setLoadingPeriods(true);
    try {
      const q = query(collection(db, "warehouse_archives"), orderBy("closedAt", "desc"));
      const snapshot = await getDocs(q);
      const fetched = snapshot.docs.map(doc => ({
        id: doc.id,
        closedAt: doc.data().closedAt,
        closedByName: doc.data().closedByName || 'Sistem'
      }));
      setPeriods(fetched);
      if (fetched.length > 0 && !selectedPeriod) {
        setSelectedPeriod(fetched[0].id);
      }
    } catch (error) {
      console.error("Error fetching archives:", error);
    } finally {
      setLoadingPeriods(false);
    }
  };

  const fetchItems = async (periodId: string) => {
    setLoadingItems(true);
    try {
      const itemsRef = collection(doc(db, "warehouse_archives", periodId), "items");
      const snapshot = await getDocs(itemsRef);
      const fetchedItems = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as WarehouseItem[];
      
      // Urutkan berdasarkan unit (misalnya)
      fetchedItems.sort((a, b) => a.materialName.localeCompare(b.materialName));
      setItems(fetchedItems);
    } catch (error) {
      console.error("Error fetching archive items:", error);
    } finally {
      setLoadingItems(false);
    }
  };

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;
    return (
      item.materialName.toLowerCase().includes(term) ||
      item.materialCode.toLowerCase().includes(term) ||
      item.specification?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term)
    );
  });

  const handleExport = () => {
    if (filteredItems.length === 0) return;

    const dataToExport = filteredItems.map((item, index) => {
      // Di archive, item memiliki endingStockAtClosing, tapi kita juga bisa menghitungnya jika belum ada
      const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
      const stockInTotal = Number(item.stockIn) || 0;
      const endingStock = (item as any).endingStockAtClosing ?? ((item.lastStock || 0) + stockInTotal - stockOutTotal);
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

    const allKeys = new Set<string>(STANDARD_DEPT_ORDER);
    dataToExport.forEach(row => {
      Object.keys(row).forEach(k => {
        const isStandard = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === k.toLowerCase().replace(/\s+/g, ' ').trim());
        if (!isStandard) {
          allKeys.add(k);
        }
      });
    });
    
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

    const formattedDataToExport = dataToExport.map(row => {
      const newRow: any = {};
      headers.forEach(header => {
        newRow[header] = row[header] !== undefined ? row[header] : 0;
      });
      return newRow;
    });

    const worksheet = XLSX.utils.json_to_sheet(formattedDataToExport, { header: headers });
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, `Arsip_${selectedPeriod}`);
    XLSX.writeFile(workbook, `Warehouse_Arsip_${selectedPeriod}.xlsx`);
  };

  // Kumpulkan semua kolom departemen yang ada di bulan ini untuk render tabel
  const dynamicDepts = new Set<string>();
  filteredItems.forEach(item => {
    Object.keys(item.stockOut || {}).forEach(dept => {
      const isStandard = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === dept.toLowerCase().replace(/\s+/g, ' ').trim());
      if (!isStandard) dynamicDepts.add(dept);
    });
  });

  const sortedDynamicDepts = Array.from(dynamicDepts).sort();
  const allDepartments = [...STANDARD_DEPT_ORDER, ...sortedDynamicDepts];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 border-slate-300 text-slate-700 hover:bg-slate-50">
          <Archive className="w-4 h-4" />
          <span className="hidden sm:inline">Riwayat Arsip</span>
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-[95vw] w-[1600px] h-[95vh] flex flex-col p-4 md:p-6 overflow-hidden bg-slate-50">
        <DialogHeader className="mb-4">
          <DialogTitle className="text-xl sm:text-2xl font-bold flex items-center gap-3 text-slate-800">
            <Archive className="w-6 h-6 text-slate-600" />
            Riwayat Arsip Tutup Buku
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col md:flex-row gap-4 items-center justify-between mb-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <select
              className="bg-white border border-slate-300 rounded-xl text-sm px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium text-slate-700 cursor-pointer min-w-[200px]"
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              disabled={loadingPeriods}
            >
              <option value="" disabled>Pilih Periode Arsip</option>
              {periods.map(p => (
                <option key={p.id} value={p.id}>
                  {p.id} (Tutup oleh: {p.closedByName})
                </option>
              ))}
            </select>

            {loadingPeriods && <Loader2 className="w-4 h-4 animate-spin text-slate-400" />}
          </div>

          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-80">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Search className="h-4 w-4 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari nama barang, kode..."
                className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <Button onClick={handleExport} disabled={loadingItems || items.length === 0} variant="outline" className="gap-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 bg-white">
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Export Excel</span>
            </Button>
          </div>
        </div>

        <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
          {loadingItems ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/50 backdrop-blur-sm z-10">
              <Loader2 className="w-8 h-8 animate-spin text-blue-600 mb-2" />
              <p className="text-sm text-slate-600 font-medium">Memuat data arsip...</p>
            </div>
          ) : (
            <div className="w-full h-full overflow-auto">
              <Table>
                <TableHeader className="bg-slate-100 sticky top-0 z-10 shadow-sm">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="w-12 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">No</TableHead>
                    <TableHead className="w-24 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Material Code</TableHead>
                    <TableHead className="w-48 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Material Name</TableHead>
                    <TableHead className="w-32 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Specification</TableHead>
                    <TableHead className="w-16 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Unit</TableHead>
                    <TableHead className="w-16 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Loc</TableHead>
                    <TableHead className="w-16 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs">Status</TableHead>
                    <TableHead className="w-20 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs bg-slate-200">Last Stock</TableHead>
                    <TableHead className="w-20 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs bg-emerald-100/50 text-emerald-800">Stock In</TableHead>
                    
                    {allDepartments.map(dept => (
                      <TableHead key={dept} className="min-w-16 text-center border-r font-bold text-slate-700 h-10 px-2 py-1 text-xs bg-blue-50/50">
                        {dept}
                      </TableHead>
                    ))}

                    <TableHead className="w-24 text-center border-r font-black text-slate-800 h-10 px-2 py-1 text-xs bg-amber-100/50">Ending Stock</TableHead>
                    <TableHead className="w-16 text-center font-bold text-slate-700 h-10 px-2 py-1 text-xs">Warning</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredItems.map((item, index) => {
                    const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
                    const stockInTotal = Number(item.stockIn) || 0;
                    const endingStock = (item as any).endingStockAtClosing ?? ((item.lastStock || 0) + stockInTotal - stockOutTotal);
                    const isWarning = endingStock <= 2;

                    return (
                      <TableRow key={item.id} className="hover:bg-slate-50 transition-colors">
                        <TableCell className="text-center font-medium border-r px-2 py-1 h-auto text-[11px]">{index + 1}</TableCell>
                        <TableCell className="border-r px-2 py-1 h-auto text-[11px] font-mono text-slate-600">{item.materialCode}</TableCell>
                        <TableCell className="font-semibold border-r px-2 py-1 h-auto text-[11px]">{item.materialName}</TableCell>
                        <TableCell className="text-slate-600 border-r px-2 py-1 h-auto text-[11px] truncate max-w-[150px]" title={item.specification}>{item.specification}</TableCell>
                        <TableCell className="text-center border-r px-2 py-1 h-auto text-[11px] text-slate-500">{item.unit}</TableCell>
                        <TableCell className="text-center border-r px-2 py-1 h-auto text-[11px] text-slate-500">{item.location}</TableCell>
                        <TableCell className="text-center border-r px-2 py-1 h-auto text-[11px] text-slate-500">{item.status}</TableCell>
                        <TableCell className="text-center font-bold border-r px-2 py-1 h-auto text-[11px] bg-slate-50">{item.lastStock}</TableCell>
                        <TableCell className="text-center font-bold text-emerald-600 border-r px-2 py-1 h-auto text-[11px] bg-emerald-50/30">{item.stockIn || ''}</TableCell>
                        
                        {allDepartments.map(dept => {
                          const matchKey = Object.keys(item.stockOut || {}).find(k => k.toLowerCase().replace(/\s+/g, ' ').trim() === dept.toLowerCase().replace(/\s+/g, ' ').trim());
                          return (
                            <TableCell key={dept} className="text-center border-r text-slate-600 px-2 py-1 h-auto text-[11px]">
                              {matchKey ? item.stockOut?.[matchKey] : ''}
                            </TableCell>
                          );
                        })}

                        <TableCell className="text-center font-black text-sm border-r px-2 py-1 h-auto bg-amber-50/30">{endingStock}</TableCell>
                        <TableCell className="text-center border-r font-black tracking-widest px-2 py-1 h-auto text-[11px]">
                          <span className={cn("px-2 py-0.5 rounded-full text-[9px]", isWarning ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                            {isWarning ? 'BELI' : 'AMAN'}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                  
                  {filteredItems.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={12 + allDepartments.length} className="h-32 text-center text-slate-500">
                        {selectedPeriod ? "Tidak ada data pada arsip ini." : "Silakan pilih periode arsip."}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
