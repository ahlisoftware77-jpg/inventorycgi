"use client";

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, where } from 'firebase/firestore';
import { WarehouseTable } from '@/components/warehouse/warehouse-table';
import { WarehouseFormDialog } from '@/components/warehouse/warehouse-form-dialog';
import { WarehouseExportButton } from "@/components/warehouse/warehouse-export-button";
import { WarehouseImportButton } from "@/components/warehouse/warehouse-import-button";
import { WarehouseReportDialog } from "@/components/warehouse/warehouse-report-dialog";
import { WarehouseReportInDialog } from "@/components/warehouse/warehouse-report-in-dialog";
import { WarehouseShareDialog } from "@/components/warehouse/warehouse-share-dialog";
import { WarehouseClosingDialog } from "@/components/warehouse/warehouse-closing-dialog";
import { WarehouseArchiveDialog } from "@/components/warehouse/warehouse-archive-dialog";
import { WarehouseRequestsDialog } from "@/components/warehouse/warehouse-requests-dialog";
import { printWarehouseOpname } from "@/components/warehouse/warehouse-print-opname";
import { Button } from '@/components/ui/button';
import { PackageSearch, Loader2, Share2, Printer, ChevronDown, ListPlus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export interface WarehouseItem {
  id: string;
  materialCode: string;
  materialName: string;
  specification: string;
  unit: string;
  location: string;
  status: string;
  lastStock: number;
  stockIn: number;
  stockInHistory?: {
    id: string;
    date: string;
    value: number;
    supplier: string;
    poNumber: string;
  }[];
  stockOut: Record<string, number>;
  stockOutHistory?: {
    id: string;
    dept: string;
    value: number;
    date: string;
    pic: string;
  }[];
  createdAt?: any;
  updatedAt?: any;
}

export default function WarehousePage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('warehouseSearchTerm') || '';
    }
    return '';
  });
  
  const [searchKey, setSearchKey] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('warehouseSearchKey') || 'all';
    }
    return 'all';
  });

  const [statusFilter, setStatusFilter] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('warehouseStatusFilter') || 'Non Stock';
    }
    return 'Non Stock';
  });

  useEffect(() => {
    if (!authLoading && !user) {
      router.push('/login');
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    localStorage.setItem('warehouseSearchTerm', searchTerm);
  }, [searchTerm]);

  useEffect(() => {
    localStorage.setItem('warehouseSearchKey', searchKey);
  }, [searchKey]);

  useEffect(() => {
    localStorage.setItem('warehouseStatusFilter', statusFilter);
  }, [statusFilter]);

  useEffect(() => {
    let q;
    if (statusFilter === 'all') {
      q = query(
        collection(db, 'warehouse_items'),
        orderBy('createdAt', 'asc')
      );
    } else {
      q = query(
        collection(db, 'warehouse_items'),
        where('status', '==', statusFilter),
        orderBy('createdAt', 'asc')
      );
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedItems: WarehouseItem[] = [];
      snapshot.forEach((doc) => {
        fetchedItems.push({ id: doc.id, ...doc.data() } as WarehouseItem);
      });
      setItems(fetchedItems);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching warehouse items: ", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [statusFilter]);

  const isAdmin = user?.role === 'Admin';
  const canManageMaster = isAdmin || user?.permissions?.canManageWarehouseMaster;
  const canImportExport = isAdmin || user?.permissions?.canImportExportWarehouse;
  const canViewReports = isAdmin || user?.permissions?.canViewWarehouseReports;

  const filteredItems = items.filter(item => {
    const term = searchTerm.toLowerCase();
    if (!term) return true;

    if (searchKey === 'all') {
      return (
        item.materialCode?.toLowerCase().includes(term) ||
        item.materialName?.toLowerCase().includes(term) ||
        item.specification?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term)
      );
    }

    const value = item[searchKey as keyof WarehouseItem];
    return value?.toString().toLowerCase().includes(term) ?? false;
  });

  if (authLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-2 p-0 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500 px-0">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-blue-600 rounded-xl shadow-lg shadow-blue-600/20 text-white">
              <PackageSearch className="w-6 h-6" />
            </div>
            Warehouse Opname
          </h2>
          <p className="text-muted-foreground mt-2 font-medium">
            General & Spare Part Report Opname
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden bg-white/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="p-0.5">
          <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2 mb-2 px-1 pt-1">
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                className={cn(
                  "border border-transparent rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 transition-all shadow-sm font-semibold cursor-pointer h-[42px]",
                  statusFilter === 'Non Stock' ? "bg-red-100 text-red-700 hover:bg-red-200 focus:ring-red-500/20" :
                  statusFilter === 'Stock' ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200 focus:ring-emerald-500/20" :
                  "bg-slate-100 text-slate-700 hover:bg-slate-200 focus:ring-slate-500/20"
                )}
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
              >
                <option value="Non Stock">Non Stock</option>
                <option value="Stock">Stock</option>
                <option value="all">Semua Status</option>
              </select>

              <select
                className="bg-slate-100 hover:bg-slate-200 border border-transparent hover:border-slate-300 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-semibold text-slate-700 cursor-pointer h-[42px]"
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
              >
                <option value="all">Semua Kategori</option>
                <option value="materialCode">Material Code</option>
                <option value="materialName">Material Name</option>
                <option value="specification">Specification</option>
                <option value="location">Location</option>
              </select>

              <div className="relative w-full max-w-sm">
                <PackageSearch className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                <input 
                  type="text"
                  placeholder={`Cari ${searchKey === 'all' ? 'semua kategori' : searchKey}...`}
                  className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm h-[42px]"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>

            {/* Action Buttons Grouped into Dropdown Menu and Primary Buttons */}
            <div className="flex flex-wrap items-center gap-2 relative justify-start xl:justify-end">
              {/* Primary Buttons outside of dropdown */}
              {canManageMaster && (
                <>
                  <WarehouseFormDialog />
                  <WarehouseRequestsDialog />
                </>
              )}
              <WarehouseClosingDialog items={items} />

              <div className="relative" ref={menuRef}>
                <Button onClick={() => setIsMenuOpen(!isMenuOpen)} className="h-[42px] bg-slate-800 hover:bg-slate-900 text-white rounded-xl shadow-md px-4 font-semibold transition-all w-full sm:w-auto">
                  <ListPlus className="w-4 h-4 mr-2" /> Aksi Lainnya <ChevronDown className={cn("ml-2 w-4 h-4 transition-transform duration-200", isMenuOpen ? "rotate-180" : "")} />
                </Button>
                
                {isMenuOpen && (
                  <div className="absolute top-12 right-0 bg-white border border-slate-200 shadow-2xl rounded-2xl p-3 z-50 w-[300px] flex flex-col gap-3 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                    
                    {canImportExport && (
                      <div className="flex flex-col gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Import & Export</p>
                        <div className="flex flex-col gap-1">
                          <WarehouseImportButton />
                          <WarehouseExportButton items={filteredItems} />
                          <Button onClick={() => printWarehouseOpname(filteredItems)} variant="outline" size="sm" className="border-slate-200 text-slate-700 hover:bg-slate-100 w-full justify-center font-bold text-xs h-9">
                            <Printer className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Print Opname
                          </Button>
                        </div>
                      </div>
                    )}

                    {canViewReports && (
                      <div className="flex flex-col gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Pelaporan</p>
                        <div className="flex flex-col gap-1">
                          <WarehouseReportInDialog items={filteredItems} />
                          <WarehouseReportDialog items={filteredItems} />
                        </div>
                      </div>
                    )}

                    <div className="flex flex-col gap-2 p-2.5 bg-slate-50 border border-slate-100 rounded-xl">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-1">Opsi Lainnya</p>
                      <div className="flex flex-col gap-1">
                        {canManageMaster && <WarehouseShareDialog />}
                        {(canManageMaster || canViewReports) && <WarehouseArchiveDialog />}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <div className="flex flex-col items-center justify-center py-32 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-blue-500" />
              <p className="font-bold tracking-widest uppercase text-xs">Memuat Data Warehouse...</p>
            </div>
          ) : (
            <WarehouseTable items={filteredItems} />
          )}
        </div>
      </Card>
    </div>
  );
}
