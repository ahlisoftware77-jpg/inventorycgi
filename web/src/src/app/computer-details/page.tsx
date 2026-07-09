
'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type ComputerAsset } from '@/lib/types';
import DashboardLayout from '@/components/dashboard/layout';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown } from 'lucide-react';
import ComputerAssetForm from '@/components/computer-details/computer-asset-form';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';

export default function ComputerAssetsPage() {
    const [assets, setAssets] = useState<ComputerAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) return; // Wait for auth to be ready
        setLoading(true);

        const queryConstraints: QueryConstraint[] = [];
        
        // If user is not an Admin and has a department, filter by department
        if (user.role !== 'Admin' && user.department) {
            queryConstraints.push(where('department', '==', user.department));
        }

        const q = query(collection(db, 'it_assets'), ...queryConstraints);
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComputerAsset));
            setAssets(assetsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching IT assets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);
    
    const activeComputerCount = useMemo(() => {
        return assets.filter(asset => asset.status === 'Digunakan').length;
    }, [assets]);
    
    const handleExport = () => {
        if (assets.length === 0) {
            toast({
                variant: 'destructive',
                title: 'Tidak ada data untuk diekspor',
            });
            return;
        }

        const formatDate = (timestamp: Timestamp | undefined | null) => {
            if (!timestamp) return '';
            try {
                return timestamp.toDate().toLocaleDateString('id-ID');
            } catch (e) {
                return '';
            }
        };

        const dataToExport = assets.map(asset => ({
            'Nama Komputer': asset.computerName,
            'Kode Aset': asset.assetCode,
            'Departemen': asset.department,
            'Pengguna': asset.currentUser,
            'Merk/Model': asset.brandModel,
            'Mainboard': asset.mainboard || '',
            'CPU': asset.cpu,
            'RAM': asset.ram,
            'Storage': asset.storage,
            'Storage 2': asset.storage2 || '',
            'GPU': asset.gpu,
            'Serial Number': asset.serialNumber,
            'IP Address': asset.ipAddress || '',
            'MAC Address': asset.macAddress || '',
            'Sistem Operasi': asset.os,
            'Lisensi Windows': asset.windowsLicense || '',
            'Lisensi Office': asset.officeLicense || '',
            'Antivirus': asset.antivirus || '',
            'Tanggal Pembelian': formatDate(asset.purchaseDate),
            'Supplier': asset.supplier || '',
            'Kondisi': asset.condition,
            'Status': asset.status,
            'Catatan': asset.notes || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Aset IT');

        XLSX.writeFile(workbook, 'Daftar_Aset_IT.xlsx');

        toast({
            title: 'Ekspor Berhasil',
            description: `${assets.length} data aset IT telah diekspor.`,
        });
    };

    return (
        <DashboardLayout>
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                        <div className="flex-1">
                            <CardTitle>Daftar Aset IT</CardTitle>
                            <CardDescription>
                                Total {assets.length} aset terdaftar. {activeComputerCount} aset berstatus aktif digunakan.
                            </CardDescription>
                        </div>
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                            <Button onClick={handleExport} variant="outline" className="w-full sm:w-auto">
                                <FileDown className="mr-2 h-4 w-4" />
                                Export Excel
                            </Button>
                            <ComputerAssetForm>
                                <Button className="w-full sm:w-auto">
                                    <PlusCircle className="mr-2 h-4 w-4" />
                                    Tambah Aset IT
                                </Button>
                            </ComputerAssetForm>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Nama Komputer</TableHead>
                                    <TableHead>Kode Aset</TableHead>
                                    <TableHead>Departemen</TableHead>
                                    <TableHead>Pengguna</TableHead>
                                    <TableHead>IP Address</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {loading ? (
                                    Array.from({ length: 5 }).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell colSpan={6}><Skeleton className="h-8 w-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : assets.length > 0 ? (
                                    assets.map(asset => (
                                        <TableRow key={asset.id}>
                                            <TableCell>
                                                <Link href={`/computer-details/${asset.id}`} className="text-primary hover:underline font-medium">
                                                    {asset.computerName}
                                                </Link>
                                            </TableCell>
                                            <TableCell>{asset.assetCode}</TableCell>
                                            <TableCell>{asset.department}</TableCell>
                                            <TableCell>{asset.currentUser}</TableCell>
                                            <TableCell>{asset.ipAddress || '-'}</TableCell>
                                            <TableCell>{asset.status}</TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={6} className="text-center h-24">
                                            Tidak ada aset IT ditemukan.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </DashboardLayout>
    );
}
