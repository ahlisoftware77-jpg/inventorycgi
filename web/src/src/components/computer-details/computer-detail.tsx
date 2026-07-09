
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type ComputerAsset, type Software, type MaintenanceHistory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { ArrowLeft, Edit, HardDrive, Cpu, MemoryStick, Monitor, Server, Router, ShieldCheck, Key, Ticket, PlusCircle, Laptop, Printer as PrinterIcon, Users, User as UserIcon, Cog, Wrench } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Link from 'next/link';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import ComputerAssetForm from './computer-asset-form';
import SoftwareForm from './software-form';
import MaintenanceForm from './maintenance-form';

interface ComputerDetailProps {
  assetId: string;
}

const DetailItem = ({ icon, label, value }: { icon?: React.ElementType, label: string; value: React.ReactNode }) => {
    const Icon = icon;
    return (
        <div className="flex items-start gap-3">
            {Icon && <Icon className="h-5 w-5 text-primary mt-1" />}
            <div>
                <p className="text-sm font-medium text-muted-foreground">{label}</p>
                <p className="text-base font-semibold">{value || '-'}</p>
            </div>
        </div>
    );
};

export default function ComputerDetail({ assetId }: ComputerDetailProps) {
  const [asset, setAsset] = useState<ComputerAsset | null>(null);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    setLoading(true);
    const assetRef = doc(db, 'it_assets', assetId);

    const unsubAsset = onSnapshot(assetRef, (docSnap) => {
      if (docSnap.exists()) {
        setAsset({ id: docSnap.id, ...docSnap.data() } as ComputerAsset);
      } else {
        setError('Aset IT tidak ditemukan.');
        setAsset(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching asset:", err);
      setError('Gagal memuat detail aset.');
      setLoading(false);
    });

    const softwareRef = collection(db, 'it_assets', assetId, 'software_list');
    const unsubSoftware = onSnapshot(softwareRef, (snapshot) => {
      setSoftwareList(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Software)));
    });

    const maintenanceRef = collection(db, 'it_assets', assetId, 'maintenance_history');
    const unsubMaintenance = onSnapshot(maintenanceRef, (snapshot) => {
      setMaintenanceHistory(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as MaintenanceHistory)));
    });

    return () => {
      unsubAsset();
      unsubSoftware();
      unsubMaintenance();
    };
  }, [assetId]);

  const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return '-';
    try {
      return format(timestamp.toDate(), "d MMMM yyyy", { locale: id });
    } catch (e) {
      return '-';
    }
  };
  
  if (loading) {
    return (
      <div>
        <Skeleton className="h-8 w-48 mb-4" />
        <Card><CardHeader><Skeleton className="h-8 w-3/4" /></CardHeader><CardContent><Skeleton className="h-96 w-full" /></CardContent></Card>
      </div>
    );
  }

  if (error) {
    return <div className="text-center text-destructive p-8">{error}</div>;
  }
  
  if (!asset) return null;

  const isAdminOrManager = user?.role === 'Admin' || user?.role === 'Manager' || user?.role === 'Section Head';

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <Button asChild variant="outline" className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700">
          <Link href="/computer-details">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Kembali ke Daftar Aset
          </Link>
        </Button>
        {isAdminOrManager && (
          <ComputerAssetForm asset={asset}>
              <Button variant="outline" onClick={() => setIsFormOpen(true)} className="bg-white dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700"><Edit className="mr-2 h-4 w-4" /> Edit Aset</Button>
          </ComputerAssetForm>
        )}
      </div>

      <Card className="bg-yellow-400 dark:bg-yellow-800/50">
        <CardHeader>
          <CardTitle className="text-2xl md:text-3xl font-bold flex items-center gap-3">
             <Laptop className="h-8 w-8 text-primary" />
            {asset.computerName}
          </CardTitle>
          <CardDescription>Detail Komputer / IT Asset Detail</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="specs">
            <TabsList className="mb-4">
              <TabsTrigger value="specs">Spesifikasi Teknis</TabsTrigger>
              <TabsTrigger value="software">Software & Lisensi</TabsTrigger>
              <TabsTrigger value="history">Riwayat & Pemeliharaan</TabsTrigger>
            </TabsList>
            <TabsContent value="specs">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                    <DetailItem icon={Laptop} label="Nama Komputer" value={asset.computerName} />
                    <DetailItem icon={Server} label="Kode Aset" value={asset.assetCode} />
                    <DetailItem icon={Users} label="Departemen" value={asset.department} />
                    <DetailItem icon={UserIcon} label="Pengguna" value={asset.currentUser} />
                    <DetailItem icon={Monitor} label="Merk / Model" value={asset.brandModel} />
                    <DetailItem icon={Cog} label="Mainboard" value={asset.mainboard} />
                    <DetailItem icon={Cpu} label="CPU" value={asset.cpu} />
                    <DetailItem icon={MemoryStick} label="RAM" value={asset.ram} />
                    <DetailItem icon={HardDrive} label="Storage" value={asset.storage} />
                    <DetailItem icon={HardDrive} label="Storage 2" value={asset.storage2} />
                    <DetailItem icon={Cpu} label="GPU" value={asset.gpu} />
                    <DetailItem label="Serial Number" value={asset.serialNumber} />
                    <DetailItem icon={Router} label="IP Address" value={asset.ipAddress} />
                    <DetailItem label="MAC Address" value={asset.macAddress} />
                </div>
            </TabsContent>
             <TabsContent value="software">
                <div className="flex justify-end mb-4">
                   {isAdminOrManager && (
                        <SoftwareForm assetId={asset.id}>
                            <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Software</Button>
                        </SoftwareForm>
                   )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                    <DetailItem icon={Monitor} label="Sistem Operasi" value={asset.os} />
                    <DetailItem icon={Key} label="Lisensi Windows" value={asset.windowsLicense} />
                    <DetailItem icon={Key} label="Lisensi Office" value={asset.officeLicense} />
                    <DetailItem icon={ShieldCheck} label="Antivirus" value={asset.antivirus} />
                </div>
                <h4 className="mt-6 mb-2 font-semibold text-lg">Aplikasi Terinstal</h4>
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nama Software</TableHead>
                                <TableHead>Kunci Lisensi</TableHead>
                                <TableHead>Tanggal Kedaluwarsa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {softwareList.length > 0 ? softwareList.map(sw => (
                                <TableRow key={sw.id}>
                                    <TableCell>{sw.name}</TableCell>
                                    <TableCell>{sw.licenseKey || '-'}</TableCell>
                                    <TableCell>{formatDate(sw.expiryDate)}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="text-center">Tidak ada software terinstal.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
            <TabsContent value="history">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-6 gap-y-8">
                    <DetailItem label="Tanggal Pembelian" value={formatDate(asset.purchaseDate)} />
                    <DetailItem label="Vendor / Supplier" value={asset.supplier} />
                </div>

                <div className="mt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-2 gap-4">
                        <h4 className="font-semibold text-lg">Riwayat Service</h4>
                        {isAdminOrManager && (
                            <MaintenanceForm assetId={asset.id}>
                                <Button><PlusCircle className="mr-2 h-4 w-4" /> Tambah Riwayat</Button>
                            </MaintenanceForm>
                        )}
                    </div>
                     <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Tanggal</TableHead>
                                    <TableHead>Jenis</TableHead>
                                    <TableHead>Deskripsi</TableHead>
                                    <TableHead>Teknisi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maintenanceHistory.length > 0 ? maintenanceHistory.map(item => (
                                    <TableRow key={item.id}>
                                        <TableCell>{formatDate(item.date)}</TableCell>
                                        <TableCell>{item.type}</TableCell>
                                        <TableCell>{item.description}</TableCell>
                                        <TableCell>{item.technician}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center">Tidak ada riwayat perawatan.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                 <div className="mt-6">
                    <h4 className="font-semibold text-lg">Catatan IT</h4>
                    <p className="text-muted-foreground whitespace-pre-wrap mt-2">{asset.notes || 'Tidak ada catatan.'}</p>
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
