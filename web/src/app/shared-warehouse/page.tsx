"use client";

import { Suspense, useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, orderBy, doc, getDoc } from 'firebase/firestore';
import { WarehouseTable } from '@/components/warehouse/warehouse-table';
import { WarehouseItem } from '@/app/warehouse/page';
import { Loader2, PackageSearch, AlertTriangle } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { useSearchParams } from 'next/navigation';

function SharedWarehouseContent() {
  const searchParams = useSearchParams();
  const token = searchParams.get('token') as string;
  
  const [validating, setValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  
  const [items, setItems] = useState<WarehouseItem[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [searchTerm, setSearchTerm] = useState("");
  const [searchKey, setSearchKey] = useState("all");

  // Validate Token
  useEffect(() => {
    if (!token) {
      setValidating(false);
      return;
    }

    const checkToken = async () => {
      try {
        const docRef = doc(db, "shared_links", token);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data();
          
          if (!data.active) {
            setErrorMessage("Link ini sudah tidak aktif / dicabut oleh admin.");
            setIsValid(false);
          } else if (data.expiresAt && Date.now() > data.expiresAt) {
            setErrorMessage("Link ini sudah kadaluarsa. Silakan minta link baru dari admin.");
            setIsValid(false);
          } else {
            setIsValid(true);
          }
        } else {
          setErrorMessage("Link tidak ditemukan atau tidak valid.");
          setIsValid(false);
        }
      } catch (error) {
        console.error("Error validating token:", error);
        setErrorMessage("Terjadi kesalahan sistem saat memvalidasi link.");
        setIsValid(false);
      } finally {
        setValidating(false);
      }
    };

    checkToken();
  }, [token]);

  // Fetch data if valid
  useEffect(() => {
    if (!isValid) {
      setLoading(false);
      return;
    }

    const q = query(
      collection(db, 'warehouse_items'),
      orderBy('createdAt', 'asc')
    );

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
  }, [isValid]);

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

  if (validating) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">Memvalidasi Akses Link...</p>
      </div>
    );
  }

  if (!isValid) {
    return (
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-xl text-center border border-red-100">
          <div className="w-16 h-16 bg-red-100 text-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertTriangle className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-2">Akses Ditolak</h2>
          <p className="text-slate-600">{errorMessage || "Link tidak valid."}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 space-y-4 p-2 md:p-4 pt-4 bg-slate-50/50 min-h-screen">
      <div className="flex flex-col gap-4 md:flex-row md:items-center justify-between animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-slate-800 flex items-center gap-3">
            <div className="p-2.5 bg-purple-600 rounded-xl shadow-lg shadow-purple-600/20 text-white">
              <PackageSearch className="w-6 h-6" />
            </div>
            Form Input Warehouse
          </h2>
          <p className="text-muted-foreground mt-2 font-medium flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Akses Eksternal Terverifikasi
          </p>
        </div>
      </div>

      <Card className="border-none shadow-xl shadow-slate-200/50 rounded-xl overflow-hidden bg-white/60 backdrop-blur-xl animate-in fade-in slide-in-from-bottom-8 duration-700 delay-150">
        <div className="p-2 md:p-4">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            <select
              className="bg-white border border-slate-200 rounded-xl text-sm px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm font-medium text-slate-700 cursor-pointer"
              value={searchKey}
              onChange={(e) => setSearchKey(e.target.value)}
            >
              <option value="all">Semua Kategori</option>
              <option value="materialCode">Material Code</option>
              <option value="materialName">Material Name</option>
              <option value="specification">Specification</option>
              <option value="location">Location</option>
            </select>
            
            <div className="relative flex-1">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <PackageSearch className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                placeholder="Cari barang berdasarkan nama, kode, spesifikasi, atau lokasi..."
                className="w-full bg-white border border-slate-200 rounded-xl text-sm pl-10 pr-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-purple-500/20 focus:border-purple-500 transition-all shadow-sm"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
            {loading ? (
              <div className="flex justify-center items-center h-64 text-slate-500 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-purple-600" />
                <span className="font-medium">Memuat data gudang...</span>
              </div>
            ) : (
              <WarehouseTable items={filteredItems} isShared={true} />
            )}
          </div>
        </div>
      </Card>
    </div>
  );
}

export default function SharedWarehousePage() {
  return (
    <Suspense fallback={
      <div className="flex flex-col h-screen w-full items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600 mb-4" />
        <p className="text-slate-600 font-medium animate-pulse">Memuat halaman...</p>
      </div>
    }>
      <SharedWarehouseContent />
    </Suspense>
  );
}
