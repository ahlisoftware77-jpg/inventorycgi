'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, doc, writeBatch, increment, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useAuth } from '@/hooks/use-auth';
import { type InventoryRequest, type InventoryItem } from '@/lib/types';
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Loader2, Check, X, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { Input } from '../ui/input';

export default function InventoryRequestsTable() {
  const [requests, setRequests] = useState<InventoryRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const isAuthorized = user?.department === 'HR & GA' || user?.role === 'Admin';

  useEffect(() => {
    if (authLoading) return;
    setLoading(true);

    const q = query(collection(db, 'inventory_requests'));
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      let requestsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as InventoryRequest));
      if (!isAuthorized) {
        requestsData = requestsData.filter(req => req.requestingUserId === user?.uid);
      }
      setRequests(requestsData.sort((a, b) => (b.requestedAt?.toMillis() || 0) - (a.requestedAt?.toMillis() || 0)));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching inventory requests:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading, isAuthorized]);

  const handleAction = async (request: InventoryRequest, action: 'approve' | 'reject') => {
    if (!isAuthorized || !user) return;
    setUpdatingId(request.id);

    const requestRef = doc(db, 'inventory_requests', request.id);
    const itemRef = doc(db, 'inventory', request.inventoryId);
    
    try {
        const batch = writeBatch(db);

        if (action === 'approve') {
            batch.update(requestRef, {
                status: 'Disetujui',
                processedByUserId: user.uid,
                processedByUserName: user.displayName,
                processedAt: serverTimestamp(),
            });
            
            batch.update(itemRef, {
                stock: increment(-request.quantity),
                lastUpdated: serverTimestamp()
            });

            const transactionRef = doc(collection(db, 'inventory_transactions'));
            batch.set(transactionRef, {
                inventoryId: request.inventoryId,
                inventoryCode: request.inventoryCode,
                inventoryName: request.inventoryName,
                action: 'out',
                quantity: request.quantity,
                notes: `Permintaan oleh ${request.requestingUserName} (Dept: ${request.requestingDept})`,
                userId: user.uid,
                userName: user.displayName,
                createdAt: serverTimestamp(),
            });

             toast({ title: 'Permintaan Disetujui' });

        } else { // Reject
             batch.update(requestRef, {
                status: 'Ditolak',
                processedByUserId: user.uid,
                processedByUserName: user.displayName,
                processedAt: serverTimestamp(),
             });
             toast({ title: 'Permintaan Ditolak', variant: 'destructive' });
        }
        
        await batch.commit();

    } catch (error) {
        console.error("Error processing request:", error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memproses permintaan.' });
    } finally {
        setUpdatingId(null);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter(req => 
      req.inventoryName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.inventoryCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      req.requestingUserName.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [requests, searchTerm]);

  const getStatusVariant = (status: InventoryRequest['status']) => {
    switch (status) {
      case 'Menunggu Persetujuan HRGA': return 'secondary';
      case 'Disetujui': return 'default';
      case 'Ditolak': return 'destructive';
      case 'Selesai': return 'outline';
      default: return 'secondary';
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Permintaan Barang ATK &amp; Sparepart</CardTitle>
        <CardDescription>
          {isAuthorized ? 'Review, setujui, atau tolak permintaan barang.' : 'Riwayat permintaan barang Anda.'}
        </CardDescription>
        <div className="mt-4">
            <Input 
                placeholder="Cari nama barang, kode, atau peminta..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="max-w-sm"
            />
        </div>
      </CardHeader>
      <CardContent>
        <div className="relative w-full overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nama Barang</TableHead>
                <TableHead>Kode</TableHead>
                <TableHead>Jumlah</TableHead>
                <TableHead>Peminta</TableHead>
                <TableHead>Departemen</TableHead>
                <TableHead>Tgl Minta</TableHead>
                <TableHead>Status</TableHead>
                {isAuthorized && <TableHead className="text-right">Aksi</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading || authLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}><TableCell colSpan={isAuthorized ? 8 : 7}><Skeleton className="h-8 w-full" /></TableCell></TableRow>
                ))
              ) : filteredRequests.length > 0 ? (
                filteredRequests.map((req) => (
                  <TableRow key={req.id}>
                    <TableCell className="font-medium">{req.inventoryName}</TableCell>
                    <TableCell>{req.inventoryCode}</TableCell>
                    <TableCell>{req.quantity}</TableCell>
                    <TableCell>{req.requestingUserName}</TableCell>
                    <TableCell>{req.requestingDept}</TableCell>
                    <TableCell>{req.requestedAt ? format(req.requestedAt.toDate(), 'd MMM yyyy', { locale: id }) : '-'}</TableCell>
                    <TableCell><Badge variant={getStatusVariant(req.status)}>{req.status}</Badge></TableCell>
                    {isAuthorized && (
                      <TableCell className="text-right">
                        {req.status === 'Menunggu Persetujuan HRGA' ? (
                           updatingId === req.id ? <Loader2 className="h-5 w-5 animate-spin ml-auto" /> : (
                            <div className="flex gap-2 justify-end">
                                <Button size="icon" variant="outline" className="text-red-500" onClick={() => handleAction(req, 'reject')}><X className="h-4 w-4" /></Button>
                                <Button size="icon" variant="outline" className="text-green-500" onClick={() => handleAction(req, 'approve')}><Check className="h-4 w-4" /></Button>
                            </div>
                           )
                        ) : (
                          <span className="text-xs text-muted-foreground">Diproses oleh {req.processedByUserName}</span>
                        )}
                      </TableCell>
                    )}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={isAuthorized ? 8 : 7} className="h-24 text-center">
                    Tidak ada permintaan ditemukan.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
