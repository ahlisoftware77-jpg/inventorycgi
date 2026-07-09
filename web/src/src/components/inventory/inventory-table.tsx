'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type InventoryItem, type InventoryType, type InventoryRequest } from '@/lib/types';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { PlusCircle, Search, FileUp, FileDown, ShoppingCart, Edit, ArrowRightLeft, ArrowUp, ArrowDown, FileText } from 'lucide-react';
import { Input } from '../ui/input';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Image from 'next/image';
import InventoryForm from './inventory-form';
import RequestItemForm from './request-item-form';
import DeleteInventoryItemDialog from './delete-inventory-item-dialog';
import UpdateStockDialog from './update-stock-dialog';
import ImportInventoryDialog from './import-inventory-dialog';
import ExportInventoryButton from './export-inventory-button';
import { Timestamp } from 'firebase/firestore';
import Link from 'next/link';

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: keyof InventoryItem | 'remainingStock';
  direction: SortDirection;
}

interface EnrichedInventoryItem extends InventoryItem {
    outgoingRequests: number;
    remainingStock: number;
}

export default function InventoryTable() {
  const [atkItems, setAtkItems] = useState<InventoryItem[]>([]);
  const [sparepartItems, setSparepartItems] = useState<InventoryItem[]>([]);
  const [alatKebersihanItems, setAlatKebersihanItems] = useState<InventoryItem[]>([]);
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<InventoryType>('ATK');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>(null);

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);

    const inventoryQuery = query(collection(db, 'inventory'));
    const requestsQuery = query(collection(db, 'inventory_requests'), where('status', '==', 'Menunggu Persetujuan HRGA'));

    const unsubInventory = onSnapshot(inventoryQuery, (snapshot) => {
      const itemsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryItem));
      setAtkItems(itemsData.filter(item => item.type === 'ATK'));
      setSparepartItems(itemsData.filter(item => item.type === 'Sparepart'));
      setAlatKebersihanItems(itemsData.filter(item => item.type === 'Alat Kebersihan'));
    }, (error) => {
      console.error("Error fetching inventory items:", error);
    });

    const unsubRequests = onSnapshot(requestsQuery, (snapshot) => {
        const requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryRequest));
        setRequests(requestsData);
    });
    
    // Set loading to false after a short delay to allow both snapshots to potentially fire
    const timer = setTimeout(() => setLoading(false), 1000);

    return () => {
      unsubInventory();
      unsubRequests();
      clearTimeout(timer);
    };
  }, [authLoading]);
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };

 const enrichedItems = useMemo(() => {
    let itemsToProcess: InventoryItem[];
    switch (activeTab) {
        case 'ATK':
            itemsToProcess = atkItems;
            break;
        case 'Sparepart':
            itemsToProcess = sparepartItems;
            break;
        case 'Alat Kebersihan':
            itemsToProcess = alatKebersihanItems;
            break;
        default:
            itemsToProcess = [];
    }

    const requestMap = new Map<string, number>();
    requests.forEach(req => {
        requestMap.set(req.inventoryId, (requestMap.get(req.inventoryId) || 0) + req.quantity);
    });

    return itemsToProcess.map(item => {
        const outgoingRequests = requestMap.get(item.id) || 0;
        return {
            ...item,
            outgoingRequests,
            remainingStock: item.stock - outgoingRequests,
        };
    });
 }, [activeTab, atkItems, sparepartItems, alatKebersihanItems, requests]);


  const filteredAndSortedItems = useMemo(() => {
    let itemsToFilter: EnrichedInventoryItem[] = enrichedItems;
    
    // Filtering
    if (searchTerm) {
      itemsToFilter = itemsToFilter.filter(item => 
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.code.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }
    
    // Sorting
    if (sortConfig !== null) {
      itemsToFilter.sort((a, b) => {
        const aValue = a[sortConfig.key as keyof EnrichedInventoryItem];
        const bValue = b[sortConfig.key as keyof EnrichedInventoryItem];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            return (aValue - bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }

        if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            return (aValue.toMillis() - bValue.toMillis()) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        
        if (typeof aValue === 'string' && typeof bValue === 'string') {
            return aValue.localeCompare(bValue) * (sortConfig.direction === 'ascending' ? 1 : -1);
        }
        
        return 0;
      });
    }

    return itemsToFilter;
  }, [enrichedItems, searchTerm, sortConfig]);
  
  const canManageInventory = user?.role === 'Admin' || user?.department === 'HR & GA';

  const renderTable = (items: EnrichedInventoryItem[]) => (
    <div className="relative w-full overflow-auto">
        <Table>
            <TableHeader className="bg-gray-100 dark:bg-gray-800 shadow-sm sticky top-0 z-10">
                <TableRow>
                    <TableHead className="w-[80px]">Foto</TableHead>
                    <TableHead onClick={() => requestSort('code')} className="cursor-pointer hover:bg-muted/80">
                        <div className="flex items-center">Kode Barang {getSortIcon('code')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('name')} className="cursor-pointer hover:bg-muted/80">
                         <div className="flex items-center">Nama Barang {getSortIcon('name')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('stock')} className="cursor-pointer hover:bg-muted/80">
                         <div className="flex items-center">Stok Awal {getSortIcon('stock')}</div>
                    </TableHead>
                    <TableHead>Barang Keluar</TableHead>
                    <TableHead onClick={() => requestSort('remainingStock')} className="cursor-pointer hover:bg-muted/80">
                         <div className="flex items-center">Sisa Stok {getSortIcon('remainingStock')}</div>
                    </TableHead>
                    <TableHead>Satuan</TableHead>
                    <TableHead onClick={() => requestSort('location')} className="cursor-pointer hover:bg-muted/80">
                        <div className="flex items-center">Lokasi {getSortIcon('location')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('department')} className="cursor-pointer hover:bg-muted/80">
                        <div className="flex items-center">Departemen {getSortIcon('department')}</div>
                    </TableHead>
                    <TableHead onClick={() => requestSort('lastUpdated')} className="cursor-pointer hover:bg-muted/80">
                        <div className="flex items-center">Tgl Update {getSortIcon('lastUpdated')}</div>
                    </TableHead>
                    <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody className="table-row-hover">
                {loading || authLoading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                        <TableRow key={i}>
                            <TableCell colSpan={11}><Skeleton className="h-10 w-full" /></TableCell>
                        </TableRow>
                    ))
                ) : items.length > 0 ? (
                    items.map((item) => (
                        <TableRow key={item.id} className="hover:bg-orange-500/10">
                            <TableCell>
                                <Image
                                    src={item.photoURL || 'https://placehold.co/64x64/E2E8F0/A0AEC0?text=Foto'}
                                    alt={item.name}
                                    width={48}
                                    height={48}
                                    className="rounded-md object-cover"
                                />
                            </TableCell>
                            <TableCell className="font-medium">{item.code}</TableCell>
                            <TableCell>{item.name}</TableCell>
                            <TableCell className="font-bold">{item.stock}</TableCell>
                            <TableCell className="text-red-600 font-semibold">{item.outgoingRequests > 0 ? item.outgoingRequests : '-'}</TableCell>
                            <TableCell className="font-bold text-blue-700">{item.remainingStock}</TableCell>
                            <TableCell>{item.unit}</TableCell>
                            <TableCell>{item.location}</TableCell>
                            <TableCell>{item.department}</TableCell>
                            <TableCell>{item.lastUpdated ? format(item.lastUpdated.toDate(), 'd MMM yyyy', { locale: id }) : '-'}</TableCell>
                            <TableCell className="text-right">
                               <div className="flex justify-end gap-2">
                                <RequestItemForm item={item}>
                                    <Button variant="outline" size="sm" className="h-8">
                                        <ShoppingCart className="mr-2 h-4 w-4" /> Minta
                                    </Button>
                                </RequestItemForm>
                                {canManageInventory && (
                                     <>
                                        <UpdateStockDialog item={item}>
                                            <Button variant="outline" size="sm" className="h-8 bg-blue-100 text-blue-800">
                                                <ArrowRightLeft className="mr-2 h-4 w-4" /> Update
                                            </Button>
                                        </UpdateStockDialog>
                                        <InventoryForm item={item} itemType={item.type}>
                                            <Button variant="outline" size="icon" className="h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Edit</span>
                                            </Button>
                                        </InventoryForm>
                                        <DeleteInventoryItemDialog itemId={item.id} itemName={item.name}>
                                            <Button variant="destructive" size="icon" className="h-8 w-8">
                                                <Edit className="h-4 w-4" />
                                                <span className="sr-only">Hapus</span>
                                            </Button>
                                        </DeleteInventoryItemDialog>
                                    </>
                                )}
                               </div>
                            </TableCell>
                        </TableRow>
                    ))
                ) : (
                    <TableRow>
                        <TableCell colSpan={11} className="h-24 text-center">
                            Tidak ada barang ditemukan.
                        </TableCell>
                    </TableRow>
                )}
            </TableBody>
        </Table>
    </div>
  );

  return (
    <Card className="shadow-lg border-2 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <CardTitle className="text-blue-900 dark:text-orange-300">Stok Inventaris</CardTitle>
            <CardDescription>Kelola stok alat tulis kantor, suku cadang, dan alat kebersihan.</CardDescription>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
                <Link href="/inventory/report">
                    <FileText className="mr-2 h-4 w-4" /> Laporan Stok
                </Link>
            </Button>
            <ImportInventoryDialog itemType={activeTab} />
            <ExportInventoryButton items={filteredAndSortedItems} itemType={activeTab} />
            {canManageInventory && (
                <InventoryForm itemType={activeTab}>
                    <Button className="bg-blue-800 hover:bg-blue-900 dark:bg-orange-500 dark:hover:bg-orange-600">
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Tambah Barang Baru
                    </Button>
                </InventoryForm>
            )}
          </div>
        </div>
        <div className="mt-4 flex flex-col sm:flex-row gap-2">
            <div className="relative flex-grow">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari nama atau kode barang..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
            {/* Filter buttons will be added here */}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as InventoryType)}>
            <TabsList className="grid w-full grid-cols-3 bg-gray-200 dark:bg-gray-900">
                <TabsTrigger value="ATK">Stok ATK</TabsTrigger>
                <TabsTrigger value="Sparepart">Stok Sparepart</TabsTrigger>
                <TabsTrigger value="Alat Kebersihan">Stok Alat Kebersihan</TabsTrigger>
            </TabsList>
            <TabsContent value="ATK" className="mt-4">
                {renderTable(filteredAndSortedItems)}
            </TabsContent>
            <TabsContent value="Sparepart" className="mt-4">
                {renderTable(filteredAndSortedItems)}
            </TabsContent>
            <TabsContent value="Alat Kebersihan" className="mt-4">
                {renderTable(filteredAndSortedItems)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
