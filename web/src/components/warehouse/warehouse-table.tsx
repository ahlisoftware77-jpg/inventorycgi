"use client";

import { useMemo, useState, useRef } from 'react';
import { WarehouseItem } from '@/app/warehouse/page';
import { TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Edit2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { doc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useToast } from '@/hooks/use-toast';
import { WarehouseEditDialog } from '@/components/warehouse/warehouse-edit-dialog';
import { WarehouseCart } from '@/components/warehouse/warehouse-cart';
import { useAuth } from '@/hooks/use-auth';
import { Checkbox } from '@/components/ui/checkbox';

interface WarehouseTableProps {
  items: WarehouseItem[];
  isShared?: boolean;
}

export function WarehouseTable({ items, isShared = false }: WarehouseTableProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const [highlightedRow, setHighlightedRow] = useState<string | null>(null);
  const [selectedEditItem, setSelectedEditItem] = useState<WarehouseItem | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<Set<string>>(new Set());
  const [itemsPerPage, setItemsPerPage] = useState(20);
  const [currentPage, setCurrentPage] = useState(1);

  // Reset page when items change significantly (like filtering)
  useMemo(() => {
    setCurrentPage(1);
  }, [items.length]);

  const isAdmin = user?.role === 'Admin';
  const canManageMaster = isAdmin || user?.permissions?.canManageWarehouseMaster;

  const handleToggleSelect = (id: string) => {
    setSelectedItemIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectedItemsList = useMemo(() => {
    return items.filter(item => selectedItemIds.has(item.id));
  }, [items, selectedItemIds]);

  // Dynamic Departments
  const departments = useMemo(() => {
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

    const deptSet = new Set<string>(STANDARD_DEPT_ORDER);
    items.forEach(item => {
      if (item.stockOut) {
        Object.keys(item.stockOut).forEach(k => {
          const standardMatch = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === k.toLowerCase().replace(/\s+/g, ' ').trim());
          if (!standardMatch) {
            deptSet.add(k);
          }
        });
      }
    });

    return Array.from(deptSet).sort((a, b) => {
      const cleanA = a.replace(/\s+/g, ' ').trim();
      const cleanB = b.replace(/\s+/g, ' ').trim();
      let idxA = STANDARD_DEPT_ORDER.indexOf(cleanA);
      let idxB = STANDARD_DEPT_ORDER.indexOf(cleanB);
      // If not found in standard order, put them at the end
      if (idxA === -1) idxA = 999;
      if (idxB === -1) idxB = 999;
      
      if (idxA === idxB) return a.localeCompare(b);
      return idxA - idxB;
    });
  }, [items]);

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Yakin ingin menghapus item ${name}?`)) {
      try {
        await deleteDoc(doc(db, 'warehouse_items', id));
        toast({ title: 'Berhasil', description: 'Item berhasil dihapus' });
      } catch (e) {
        toast({ title: 'Gagal', description: 'Gagal menghapus item', variant: 'destructive' });
      }
    }
  };

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setStartY(e.pageY - scrollContainerRef.current.offsetTop);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
    setScrollTop(scrollContainerRef.current.scrollTop);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const y = e.pageY - scrollContainerRef.current.offsetTop;
    const walkX = (x - startX) * 1.5;
    const walkY = (y - startY) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walkX;
    scrollContainerRef.current.scrollTop = scrollTop - walkY;
  };

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const paginatedItems = items.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  return (
    <>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-600 font-medium">Tampilkan</span>
          <select 
            className="border border-slate-300 rounded-md px-2 py-1 text-sm bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none"
            value={itemsPerPage}
            onChange={(e) => { 
              setItemsPerPage(Number(e.target.value)); 
              setCurrentPage(1); 
            }}
          >
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={500}>500</option>
          </select>
          <span className="text-sm text-slate-600 font-medium">baris</span>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="text-sm text-slate-500 mr-2">
            Menampilkan {items.length > 0 ? ((currentPage - 1) * itemsPerPage) + 1 : 0} - {Math.min(currentPage * itemsPerPage, items.length)} dari {items.length}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
            disabled={currentPage === 1}
            className="h-8"
          >
            Sebelumnya
          </Button>
          <span className="text-sm font-medium px-2">
            Halaman {currentPage} dari {totalPages || 1}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
            disabled={currentPage === totalPages || totalPages === 0}
            className="h-8"
          >
            Selanjutnya
          </Button>
        </div>
      </div>

    <div 
      ref={scrollContainerRef}
      onMouseDown={handleMouseDown}
      onMouseLeave={handleMouseLeave}
      onMouseUp={handleMouseUp}
      onMouseMove={handleMouseMove}
      className={cn(
        "overflow-auto h-[calc(100vh-220px)] rounded-xl border border-slate-200 shadow-inner relative",
        isDragging ? "cursor-grabbing select-none" : "cursor-grab"
      )}
    >
      <table className="w-full caption-bottom text-sm min-w-max border-collapse">
        <TableHeader className="sticky top-0 z-20 bg-slate-100 shadow-md">
          <TableRow className="hover:bg-slate-100">
            <TableHead className="w-10 px-2 py-0.5 text-center border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}></TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>No</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-left px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Material Code</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-left px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Material Name</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-left px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Specification</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Unit</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Location</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Status</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Last Stock</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Stock In</TableHead>
            {departments.length > 0 && (
              <TableHead className="font-black text-[10px] uppercase text-blue-900 bg-gradient-to-b from-blue-100 to-blue-300 hover:from-blue-50 hover:to-blue-200 text-center px-2 py-0.5 border-r border-blue-400 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" colSpan={departments.length}>STOCK OUT DEPT</TableHead>
            )}
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Ending Stock</TableHead>
            <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Warning</TableHead>
            {(isShared || canManageMaster) && (
              <TableHead className="font-black text-[10px] uppercase text-center px-2 py-0.5 border-r border-slate-300 bg-gradient-to-b from-slate-50 to-slate-200 hover:from-white hover:to-slate-100 border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] transition-all cursor-default" rowSpan={2}>Aksi</TableHead>
            )}
          </TableRow>
          {departments.length > 0 && (
            <TableRow className="bg-slate-100 hover:bg-slate-100">
              {departments.map((dept, idx) => {
                const DEPT_COLORS: Record<string, string> = {
                  "FRIT Spare Part": "bg-[#00a2e8] text-white",
                  "FRIT Packing": "bg-[#00a2e8] text-white",
                  "MTc": "bg-[#fff200] text-black",
                  "Mixer": "bg-[#ffc90e] text-black",
                  "QC": "bg-[#7030a0] text-white",
                  "R&D": "bg-[#7030a0] text-white",
                  "LAB": "bg-[#7030a0] text-white",
                  "APP": "bg-[#7030a0] text-white",
                  "PPIC": "bg-[#92d050] text-black",
                  "GA": "bg-[#00b050] text-white"
                };
                const cleanDept = dept.replace(/\s+/g, ' ').trim();
                const colorClass = DEPT_COLORS[cleanDept] || (
                  idx % 4 === 0 ? "bg-amber-100 text-amber-800" :
                  idx % 4 === 1 ? "bg-emerald-100 text-emerald-800" :
                  idx % 4 === 2 ? "bg-purple-100 text-purple-800" : "bg-sky-100 text-sky-800"
                );

                return (
                  <TableHead key={dept} className={cn("font-black text-[9px] uppercase text-center px-2 py-0.5 border-t border-r border-b-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.4)] brightness-105 saturate-150 relative transition-all cursor-default hover:brightness-125 hover:saturate-200", colorClass, "after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-black/20")}>
                    {cleanDept}
                  </TableHead>
                );
              })}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {paginatedItems.length === 0 ? (
             <TableRow>
               <TableCell colSpan={14 + departments.length} className="text-center py-10 text-slate-500 italic">Belum ada data</TableCell>
             </TableRow>
          ) : (
            paginatedItems.map((item, index) => {
              const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
              const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
              const isWarning = endingStock <= 2;
              
              // Calculate actual index based on page
              const actualIndex = ((currentPage - 1) * itemsPerPage) + index + 1;

              return (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "transition-all duration-200 cursor-pointer even:bg-slate-50/80 relative",
                    "hover:z-10 hover:shadow-[0_4px_15px_rgba(0,0,0,0.1)] hover:bg-gradient-to-b hover:from-white hover:to-slate-100",
                    highlightedRow === item.id ? "bg-amber-100/60" : ""
                  )}
                  onClick={() => setHighlightedRow(item.id)}
                >
                  <TableCell className="px-2 py-1 text-center border-r">
                    <Checkbox 
                      checked={selectedItemIds.has(item.id)}
                      onCheckedChange={() => handleToggleSelect(item.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="border-slate-300"
                    />
                  </TableCell>
                  <TableCell className="text-center font-medium text-slate-500 px-2 py-1 text-[11px] border-r">{actualIndex}</TableCell>
                  <TableCell className="text-left font-semibold text-slate-700 px-2 py-1 text-[11px] border-r">{item.materialCode}</TableCell>
                  <TableCell className="font-semibold text-slate-800 px-2 py-1 text-[11px] max-w-[200px] whitespace-normal break-words border-r">{item.materialName}</TableCell>
                  <TableCell className="text-slate-500 text-[11px] px-2 py-1 max-w-[200px] whitespace-normal break-words leading-relaxed border-r">{item.specification}</TableCell>
                  <TableCell className="text-center text-slate-500 px-2 py-1 text-[11px] border-r">{item.unit}</TableCell>
                  <TableCell className="text-center font-medium text-slate-600 px-2 py-1 text-[11px] border-r">{item.location}</TableCell>
                  <TableCell className="text-center px-2 py-1 text-[11px] border-r">
                    <span className={cn(
                      "px-2 py-0.5 rounded-md font-medium text-[10px]",
                      item.status === 'Stock' ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"
                    )}>{item.status}</span>
                  </TableCell>
                  <TableCell className="text-center font-semibold text-slate-700 px-2 py-1 text-[11px] border-r">{item.lastStock || 0}</TableCell>
                  <TableCell className="text-center font-semibold text-slate-700 px-2 py-1 text-[11px] border-r">{item.stockIn || 0}</TableCell>
                  
                  {departments.map(dept => {
                    const matchKey = Object.keys(item.stockOut || {}).find(k => k.toLowerCase().replace(/\s+/g, ' ').trim() === dept.toLowerCase().replace(/\s+/g, ' ').trim());
                    return (
                      <TableCell key={dept} className="text-center text-slate-600 px-2 py-1 text-[11px] border-r">
                        {matchKey ? item.stockOut?.[matchKey] : <span className="text-slate-300">-</span>}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-center font-bold text-sm text-slate-800 px-2 py-1 border-r">{endingStock}</TableCell>
                  <TableCell className="text-center font-semibold tracking-wider px-2 py-1 text-[10px] border-r">
                    <span className={cn("px-2 py-0.5 rounded-md", isWarning ? "bg-red-50 text-red-600 border border-red-100" : "text-emerald-500")}>
                      {isWarning ? 'BELI' : 'AMAN'}
                    </span>
                  </TableCell>
                  {(isShared || canManageMaster) && (
                    <TableCell className="text-center px-2 py-1 text-[11px]">
                      <div className="flex justify-center items-center gap-1">
                         {isShared ? (
                           <Button 
                             variant="outline" 
                             size="sm" 
                             className="h-8 text-blue-600 border-blue-200 hover:bg-blue-50 text-[10px]"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedEditItem(item);
                               setIsEditOpen(true);
                             }}
                           >
                             Input Form
                           </Button>
                         ) : (
                           <Button 
                             variant="ghost" 
                             size="icon" 
                             className="h-8 w-8 text-slate-400 hover:text-blue-600 hover:bg-blue-50"
                             onClick={(e) => {
                               e.stopPropagation();
                               setSelectedEditItem(item);
                               setIsEditOpen(true);
                             }}
                           >
                             <Edit2 className="w-4 h-4" />
                           </Button>
                         )}
                         {!isShared && canManageMaster && (
                           <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => {
                             e.stopPropagation();
                             handleDelete(item.id, item.materialName);
                           }}>
                             <Trash2 className="w-4 h-4" />
                           </Button>
                         )}
                      </div>
                    </TableCell>
                  )}
                </TableRow>
              );
            })
          )}
        </TableBody>
      </table>

      <WarehouseEditDialog 
        item={selectedEditItem} 
        isShared={isShared} 
        open={isEditOpen} 
        onOpenChange={setIsEditOpen} 
      />

      <WarehouseCart 
        selectedItems={selectedItemsList}
        departments={departments}
        onClear={() => setSelectedItemIds(new Set())}
        onRemoveItem={(id) => handleToggleSelect(id)}
      />
    </div>
    </>
  );
}
