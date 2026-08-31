'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import QRCode from 'qrcode';
import { db } from '@/lib/firebase/config';
import { type ComputerAsset, type Software, type MaintenanceHistory } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { ArrowLeft, Edit, HardDrive, Cpu, MemoryStick, Monitor, Server, Router, ShieldCheck, Key, Ticket, PlusCircle, Laptop, Printer as PrinterIcon, Users, User as UserIcon, Cog, Wrench, Share2 } from 'lucide-react';
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
import ShareComputerQrDialog from './share-computer-qr-dialog';
import { sendRawBluetooth, compileComputerEscPos } from '@/lib/bluetooth-printer';
import html2canvas from 'html2canvas';

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
  const [mainAsset, setMainAsset] = useState<any>(null);
  const [softwareList, setSoftwareList] = useState<Software[]>([]);
  const [maintenanceHistory, setMaintenanceHistory] = useState<MaintenanceHistory[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isShareDialogOpen, setIsShareDialogOpen] = useState(false);

  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchMainAsset() {
        if (asset?.assetCode) {
            const mainQuery = query(collection(db, 'assets'), where('code', '==', asset.assetCode));
            const mainSnap = await getDocs(mainQuery);
            if (!mainSnap.empty) {
                setMainAsset({ id: mainSnap.docs[0].id, ...mainSnap.docs[0].data() });
            }
        }
    }
    if (asset) {
        fetchMainAsset();
    }
  }, [asset]);

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

  const handlePrintLabel = async () => {
    try {
      const qrData = `${window.location.origin}/public/asset?assetId=${mainAsset?.id || asset.id}`;
      const qrUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 120 });
      
      const printWindow = window.open('', '', 'width=400,height=600');
      if (!printWindow) return;

      const html = `
        <html>
          <head>
            <title>Label Workstation ${asset.computerName}</title>
            <style>
              @page { size: 58mm auto; margin: 2mm; }
              body { font-family: monospace; font-size: 8pt; margin: 0; padding: 0; color: black; background: white; text-align: center; }
              .container { width: 48mm; margin: 0 auto; box-sizing: border-box; padding: 2px; }
              .header { font-weight: bold; border-bottom: 1px dashed black; padding-bottom: 4px; margin-bottom: 6px; font-size: 7.5pt; text-transform: uppercase; }
              .title { font-weight: bold; font-size: 10pt; text-transform: uppercase; margin: 2px 0; letter-spacing: 0.5px; }
              .code { font-weight: bold; font-size: 11pt; border: 1px solid black; display: inline-block; padding: 2px 6px; margin: 4px 0; }
              
              .specs-table { width: 100%; border-collapse: collapse; margin: 6px 0; font-size: 7.5pt; text-align: left; }
              .specs-table td { padding: 1.5px 0; vertical-align: top; }
              .label { font-weight: bold; width: 32%; }
              .colon { width: 5%; text-align: center; }
              .val { width: 63%; word-break: break-all; }
              
              .qr-container { margin: 8px 0; display: flex; justify-content: center; align-items: center; flex-direction: column; }
              .qr-img { width: 35mm; height: 35mm; }
              .footer { border-top: 1px dashed black; padding-top: 4px; margin-top: 6px; font-size: 7pt; color: #555; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                PT. China Glaze Indonesia<br>IT DEPARTMENT
              </div>
              <div class="title">${asset.computerName}</div>
              <div class="code">${asset.assetCode}</div>
              
              <table class="specs-table">
                <tr><td class="label">User</td><td class="colon">:</td><td class="val">${asset.currentUser || '-'}</td></tr>
                <tr><td class="label">Dept</td><td class="colon">:</td><td class="val">${asset.department}</td></tr>
                <tr><td class="label">CPU</td><td class="colon">:</td><td class="val">${asset.cpu}</td></tr>
                <tr><td class="label">RAM</td><td class="colon">:</td><td class="val">${asset.ram}</td></tr>
                <tr><td class="label">Disk</td><td class="colon">:</td><td class="val">${asset.storage}${asset.storage2 ? ` + ${asset.storage2}` : ''}</td></tr>
                <tr><td class="label">OS</td><td class="colon">:</td><td class="val">${asset.os || '-'}</td></tr>
                <tr><td class="label">IP</td><td class="colon">:</td><td class="val">${asset.ipAddress || '-'}</td></tr>
              </table>
              
              <div class="qr-container">
                <img class="qr-img" src="${qrUrl}" />
                <div style="font-size: 6pt; margin-top: 2px;">SCAN UNTUK VERIFIKASI</div>
              </div>
              
              <div class="footer">
                ASSET LABELLING SYSTEM
              </div>
            </div>
            <script>
              window.onload = function() {
                window.focus();
                window.print();
                setTimeout(function() { window.close(); }, 500);
              };
            </script>
          </body>
        </html>
      `;

      printWindow.document.write(html);
      printWindow.document.close();

    } catch (error) {
      console.error("Error generating QR Code label:", error);
    }
  };

  const handlePrintLabelBluetooth = async () => {
    try {
      const bytes = await compileComputerEscPos(asset, mainAsset?.id || null);
      await sendRawBluetooth(bytes, toast);
    } catch (error: any) {
      console.error("Error generating label for bluetooth:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyiapkan Label', description: error.message });
    }
  };
  
  const handleShare = () => {
    if (!asset) return;
    setIsShareDialogOpen(true);
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
        <div className="flex items-center gap-2">
          <Button onClick={handleShare} className="rounded-xl h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-purple-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <Share2 className="h-3.5 w-3.5" /> Bagikan
          </Button>
          <Button onClick={handlePrintLabelBluetooth} className="rounded-xl h-9 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-indigo-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <PrinterIcon className="h-3.5 w-3.5" /> Cetak Bluetooth (58mm)
          </Button>
          <Button onClick={handlePrintLabel} className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center gap-1.5 shadow-sm">
            <PrinterIcon className="h-3.5 w-3.5" /> Cetak Browser (58mm)
          </Button>
          {isAdminOrManager && (
            <ComputerAssetForm asset={asset}>
                <Button onClick={() => setIsFormOpen(true)} className="rounded-xl h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-amber-700 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                    <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit Aset
                </Button>
            </ComputerAssetForm>
          )}
        </div>
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

      <ShareComputerQrDialog 
        asset={asset} 
        mainAssetId={mainAsset?.id}
        isOpen={isShareDialogOpen} 
        onOpenChange={setIsShareDialogOpen} 
      />
    </div>
  );
}
