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

const DetailItem = ({ emoji, label, value }: { emoji?: string, label: string; value: React.ReactNode }) => {
    return (
        <div className="p-3.5 rounded-xl border text-left bg-slate-50 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800 border-b-[3px] border-b-slate-300 dark:border-b-slate-800/80 shadow-sm transition-all duration-300">
            <div className="flex items-center gap-2 mb-1.5 opacity-80">
                {emoji && <span className="text-sm select-none">{emoji}</span>}
                <p className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider leading-none">{label}</p>
            </div>
            <div className="font-extrabold text-sm text-slate-800 dark:text-slate-200">{value || '-'}</div>
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
        <Button asChild className="rounded-xl h-9 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
          <Link href="/computer-details">
            <ArrowLeft className="mr-1.5 h-3.5 w-3.5 text-white" />
            Kembali ke Daftar Aset
          </Link>
        </Button>
        {isAdminOrManager && (
          <ComputerAssetForm asset={asset}>
              <Button onClick={() => setIsFormOpen(true)} className="rounded-xl h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-amber-700 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                  <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Aset
              </Button>
          </ComputerAssetForm>
        )}
      </div>

      <Card className="border border-slate-200 dark:border-slate-800 border-b-[5px] border-b-slate-300 dark:border-b-slate-850 rounded-2xl bg-white dark:bg-slate-950 shadow-md overflow-hidden text-left">
        <CardHeader className="border-b border-slate-100 dark:border-slate-800 p-6">
          <CardTitle className="text-xl font-black flex items-center gap-2.5">
             <Laptop className="h-6 w-6 text-primary" />
            {asset.computerName}
          </CardTitle>
          <CardDescription className="text-xs uppercase tracking-wider font-bold text-muted-foreground mt-1">Detail Komputer / IT Asset Detail</CardDescription>
        </CardHeader>
        <CardContent className="p-6">
          <Tabs defaultValue="specs">
            <TabsList className="bg-slate-100 dark:bg-slate-800/60 p-1 rounded-xl h-auto flex w-fit shadow-inner border border-slate-200 dark:border-slate-800 mb-6">
              <TabsTrigger value="specs" className="rounded-lg px-5 font-black text-[10px] uppercase tracking-widest py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow transition-all">Spesifikasi Teknis</TabsTrigger>
              <TabsTrigger value="software" className="rounded-lg px-5 font-black text-[10px] uppercase tracking-widest py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow transition-all">Software & Lisensi</TabsTrigger>
              <TabsTrigger value="history" className="rounded-lg px-5 font-black text-[10px] uppercase tracking-widest py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow transition-all">Riwayat & Pemeliharaan</TabsTrigger>
            </TabsList>
            <TabsContent value="specs">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <DetailItem emoji="💻" label="Nama Komputer" value={asset.computerName} />
                    <DetailItem emoji="🏷️" label="Kode Aset" value={asset.assetCode} />
                    <DetailItem emoji="🏢" label="Departemen" value={asset.department} />
                    <DetailItem emoji="👤" label="Pengguna" value={asset.currentUser} />
                    <DetailItem emoji="🖥️" label="Merk / Model" value={asset.brandModel} />
                    <DetailItem emoji="⚙️" label="Mainboard" value={asset.mainboard} />
                    <DetailItem emoji="🧠" label="CPU" value={asset.cpu} />
                    <DetailItem emoji="💾" label="RAM" value={asset.ram} />
                    <DetailItem emoji="💽" label="Storage" value={asset.storage} />
                    <DetailItem emoji="💽" label="Storage 2" value={asset.storage2} />
                    <DetailItem emoji="🧠" label="GPU" value={asset.gpu} />
                    <DetailItem emoji="🔢" label="Serial Number" value={asset.serialNumber} />
                    <DetailItem emoji="🌐" label="IP Address" value={asset.ipAddress} />
                    <DetailItem emoji="🧬" label="MAC Address" value={asset.macAddress} />
                </div>
            </TabsContent>
             <TabsContent value="software">
                <div className="flex justify-end mb-4">
                   {isAdminOrManager && (
                        <SoftwareForm assetId={asset.id}>
                            <Button className="rounded-xl h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                                <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Software
                            </Button>
                        </SoftwareForm>
                   )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <DetailItem emoji="🖥️" label="Sistem Operasi" value={asset.os} />
                    <DetailItem emoji="🔑" label="Lisensi Windows" value={asset.windowsLicense} />
                    <DetailItem emoji="🔑" label="Lisensi Office" value={asset.officeLicense} />
                    <DetailItem emoji="🛡️" label="Antivirus" value={asset.antivirus} />
                </div>
                <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 mb-3 text-left">Aplikasi Terinstal</h4>
                <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                    <Table>
                        <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                            <TableRow>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Nama Software</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Kunci Lisensi</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-wider">Tanggal Kedaluwarsa</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {softwareList.length > 0 ? softwareList.map(sw => (
                                <TableRow key={sw.id} className="border-b border-slate-100 dark:border-slate-800/80">
                                    <TableCell className="font-bold text-xs">{sw.name}</TableCell>
                                    <TableCell className="font-mono text-xs">{sw.licenseKey || '-'}</TableCell>
                                    <TableCell className="text-xs text-muted-foreground">{formatDate(sw.expiryDate)}</TableCell>
                                </TableRow>
                            )) : <TableRow><TableCell colSpan={3} className="text-center text-xs py-8 text-muted-foreground">Tidak ada software terinstal.</TableCell></TableRow>}
                        </TableBody>
                    </Table>
                </div>
            </TabsContent>
            <TabsContent value="history">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                    <DetailItem emoji="📅" label="Tanggal Pembelian" value={formatDate(asset.purchaseDate)} />
                    <DetailItem emoji="🏢" label="Vendor / Supplier" value={asset.supplier} />
                </div>

                <div className="mt-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-4 gap-4">
                        <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 text-left">Riwayat Service</h4>
                        {isAdminOrManager && (
                            <MaintenanceForm assetId={asset.id}>
                                <Button className="rounded-xl h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                                    <PlusCircle className="mr-1.5 h-3.5 w-3.5" /> Tambah Riwayat
                                </Button>
                            </MaintenanceForm>
                        )}
                    </div>
                     <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-800">
                        <Table>
                            <TableHeader className="bg-slate-50 dark:bg-slate-900/50">
                                <TableRow>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Tanggal</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Jenis</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Deskripsi</TableHead>
                                    <TableHead className="text-[10px] font-black uppercase tracking-wider">Teknisi</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {maintenanceHistory.length > 0 ? maintenanceHistory.map(item => (
                                    <TableRow key={item.id} className="border-b border-slate-100 dark:border-slate-800/80">
                                        <TableCell className="text-xs">{formatDate(item.date)}</TableCell>
                                        <TableCell className="font-bold text-xs">{item.type}</TableCell>
                                        <TableCell className="text-xs">{item.description}</TableCell>
                                        <TableCell className="text-xs text-muted-foreground">{item.technician}</TableCell>
                                    </TableRow>
                                )) : <TableRow><TableCell colSpan={4} className="text-center text-xs py-8 text-muted-foreground">Tidak ada riwayat perawatan.</TableCell></TableRow>}
                            </TableBody>
                        </Table>
                    </div>
                </div>

                 <div className="mt-6 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800">
                    <h4 className="font-black text-xs uppercase tracking-wider text-slate-500 text-left">Catatan IT</h4>
                    <p className="text-xs text-slate-750 dark:text-slate-350 whitespace-pre-wrap mt-2 text-left">{asset.notes || 'Tidak ada catatan.'}</p>
                </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
