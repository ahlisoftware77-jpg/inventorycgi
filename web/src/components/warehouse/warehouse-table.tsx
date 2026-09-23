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
import { useAuth } from '@/hooks/use-auth';

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

  return (
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
          <TableRow className="bg-slate-100 hover:bg-slate-100">
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>No</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Material Code</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Material Name</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Specification</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Unit</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Location</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Status</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Last Stock</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Stock In</TableHead>
            {departments.length > 0 && (
              <TableHead className="font-black text-[11px] uppercase text-center border-r bg-blue-100 text-blue-900 px-2 py-1 h-auto" colSpan={departments.length}>STOCK OUT DEPT</TableHead>
            )}
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Ending Stock</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center border-r bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Warning</TableHead>
            <TableHead className="font-black text-[11px] uppercase text-center bg-slate-100 px-2 py-1 h-auto" rowSpan={2}>Aksi</TableHead>
          </TableRow>
          {departments.length > 0 && (
            <TableRow className="hover:bg-slate-50">
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
                  <TableHead key={dept} className={cn("font-black text-[10px] uppercase text-center border-r border-t px-2 py-1 h-auto", colorClass)}>
                    {cleanDept}
                  </TableHead>
                );
              })}
            </TableRow>
          )}
        </TableHeader>
        <TableBody>
          {items.length === 0 ? (
             <TableRow>
               <TableCell colSpan={13 + departments.length} className="text-center py-10 text-slate-500 italic">Belum ada data</TableCell>
             </TableRow>
          ) : (
            items.map((item, index) => {
              const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
              const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
              const isWarning = endingStock <= 2;

              return (
                <TableRow 
                  key={item.id} 
                  className={cn(
                    "transition-colors cursor-pointer",
                    highlightedRow === item.id ? "bg-amber-100/60 hover:bg-amber-200/60" : "hover:bg-slate-50/50"
                  )}
                  onClick={() => setHighlightedRow(item.id)}
                >
                  <TableCell className="text-center font-medium border-r px-2 py-1 h-auto text-[11px]">{index + 1}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 border-r px-2 py-1 h-auto text-[11px]">{item.materialCode}</TableCell>
                  <TableCell className="font-bold text-blue-600 border-r px-2 py-1 h-auto text-[11px] max-w-[200px] whitespace-normal break-words">{item.materialName}</TableCell>
                  <TableCell className="text-slate-600 text-[11px] border-r px-2 py-1 h-auto max-w-[200px] whitespace-normal break-words">{item.specification}</TableCell>
                  <TableCell className="text-center text-slate-500 border-r px-2 py-1 h-auto text-[11px]">{item.unit}</TableCell>
                  <TableCell className="text-center font-medium border-r px-2 py-1 h-auto text-[11px]">{item.location}</TableCell>
                  <TableCell className="text-center border-r px-2 py-1 h-auto text-[11px]">{item.status}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 border-r px-2 py-1 h-auto text-[11px]">{item.lastStock || 0}</TableCell>
                  <TableCell className="text-center font-bold text-slate-700 border-r px-2 py-1 h-auto text-[11px]">{item.stockIn || 0}</TableCell>
                  
                  {departments.map(dept => {
                    const matchKey = Object.keys(item.stockOut || {}).find(k => k.toLowerCase().replace(/\s+/g, ' ').trim() === dept.toLowerCase().replace(/\s+/g, ' ').trim());
                    return (
                      <TableCell key={dept} className="text-center border-r text-slate-600 px-2 py-1 h-auto text-[11px]">
                        {matchKey ? item.stockOut?.[matchKey] : ''}
                      </TableCell>
                    );
                  })}

                  <TableCell className="text-center font-black text-sm border-r px-2 py-1 h-auto">{endingStock}</TableCell>
                  <TableCell className="text-center border-r font-black tracking-widest px-2 py-1 h-auto text-[11px]">
                    <span className={cn("px-2 py-0.5 rounded-full text-[9px]", isWarning ? "bg-red-100 text-red-600" : "bg-emerald-100 text-emerald-600")}>
                      {isWarning ? 'BELI' : 'AMAN'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center px-2 py-1 h-auto text-[11px]">
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
                       {!isShared && (user?.role === 'Admin' || user?.permissions?.canManageWarehouseMaster) && (
                         <Button variant="ghost" size="icon" className="h-8 w-8 text-slate-400 hover:text-red-600 hover:bg-red-50" onClick={(e) => {
                           e.stopPropagation();
                           handleDelete(item.id, item.materialName);
                         }}>
                           <Trash2 className="w-4 h-4" />
                         </Button>
                       )}
                    </div>
                  </TableCell>
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
    </div>
  );
}
