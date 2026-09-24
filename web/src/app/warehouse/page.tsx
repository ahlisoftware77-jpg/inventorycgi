"use client";

import { useState, useEffect } from 'react';
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
import { printWarehouseOpname } from "@/components/warehouse/warehouse-print-opname";
import { Button } from '@/components/ui/button';
import { PackageSearch, Loader2, Share2, Printer } from 'lucide-react';
import { Card } from '@/components/ui/card';

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
    <div className="flex-1 space-y-4 p-2 md:p-4 pt-4 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
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

        <div className="flex flex-wrap items-center gap-3">
          {canManageMaster && <WarehouseFormDialog />}
          {canImportExport && (
            <>
              <WarehouseImportButton />
              <WarehouseExportButton items={filteredItems} />
              <Button onClick={() => printWarehouseOpname(filteredItems)} variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50">
                <Printer className="w-4 h-4 mr-2" /> Print Opname
              </Button>
            </>
          )}
          {canViewReports && (
            <>
              <WarehouseReportInDialog items={filteredItems} />
              <WarehouseReportDialog items={filteredItems} />
            </>
          )}
          {canManageMaster && <WarehouseShareDialog />}
          {(canManageMaster || canViewReports) && <WarehouseArchiveDialog />}
          <WarehouseClosingDialog items={items} />
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden bg-white/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="p-2 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              className="bg-white border border-slate-200 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium text-slate-700 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="Non Stock">Non Stock</option>
              <option value="Stock">Stock</option>
              <option value="all">Semua Status</option>
            </select>

            <select
              className="bg-white border border-slate-200 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium text-slate-700 cursor-pointer"
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
                className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
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
