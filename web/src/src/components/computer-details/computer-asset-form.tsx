

'use client';

import { useState, useEffect, type ReactNode } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { useToast } from '@/hooks/use-toast';
import { computerAssetSchema } from '@/lib/schemas';
import { type ComputerAsset } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CalendarIcon } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

type ComputerAssetFormValues = z.infer<typeof computerAssetSchema>;

interface ComputerAssetFormProps {
  asset?: ComputerAsset;
  children: ReactNode;
}

const departmentOptions = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];
const conditionOptions: ComputerAsset['condition'][] = ['Aktif', 'Perlu Perbaikan', 'Rusak'];
const statusOptions: ComputerAsset['status'][] = ['Digunakan', 'Dalam Service', 'Dihapus'];

const osOptions = [ "Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home", "Windows 8.1 Pro", "Windows 7 Ultimate", "Ubuntu 22.04 LTS", "Ubuntu 20.04 LTS", "Linux Mint 21", "Debian 12", "Fedora 39 Workstation", "macOS Sonoma", "macOS Ventura", "macOS Monterey", "Chrome OS", "FreeDOS" ];
const cpuOptions = [ "Intel Core i3-530","Intel Core i3-540","Intel Core i3-550","Intel Core i3-560", "Intel Core i3-2100","Intel Core i3-2120","Intel Core i3-2130","Intel Core i3-2105", "Intel Core i3-3220","Intel Core i3-3240","Intel Core i3-3250","Intel Core i3-3225", "Intel Core i3-4130","Intel Core i3-4150","Intel Core i3-4160","Intel Core i3-4170","Intel Core i3-4350", "Intel Core i3-5005U","Intel Core i3-5010U","Intel Core i3-5157U","Intel Core i3-5300U", "Intel Core i3-6100","Intel Core i3-6300","Intel Core i3-6320","Intel Core i3-6100T","Intel Core i3-6098P", "Intel Core i3-7100","Intel Core i3-7300","Intel Core i3-7320","Intel Core i3-7350K", "Intel Core i3-8100","Intel Core i3-8300","Intel Core i3-8350K","Intel Core i3-8100T", "Intel Core i3-9100","Intel Core i3-9100F","Intel Core i3-9300","Intel Core i3-9320", "Intel Core i3-10100","Intel Core i3-10100F","Intel Core i3-10300","Intel Core i3-10320", "Intel Core i3-11100","Intel Core i3-11100B","Intel Core i3-11100T","Intel Core i3-1115G4","Intel Core i3-1125G4", "Intel Core i3-12100","Intel Core i3-12100F","Intel Core i3-12300","Intel Core i3-12300T","Intel Core i3-1220P","Intel Core i3-1220U", "Intel Core i3-13100","Intel Core i3-13100F","Intel Core i3-13300","Intel Core i3-13300T","Intel Core i3-1315U","Intel Core i3-1320P", "Intel Core i3-14100","Intel Core i3-14100F","Intel Core i3-14300","Intel Core i3-14300T","Intel Core i3-1415U","Intel Core i3-1420P", "Intel Core i5-2400", "Intel Core i5-2500", "Intel Core i5-3470", "Intel Core i5-3570", "Intel Core i5-4460", "Intel Core i5-4590", "Intel Core i5-6400", "Intel Core i5-6500", "Intel Core i5-7400", "Intel Core i5-7500", "Intel Core i5-8400", "Intel Core i5-8500", "Intel Core i5-9400", "Intel Core i5-9500", "Intel Core i5-10400", "Intel Core i5-10500", "Intel Core i5-11400", "Intel Core i5-11500", "Intel Core i5-12400", "Intel Core i5-12500", "Intel Core i5-13400", "Intel Core i5-13500", "Intel Core i5-14400", "Intel Core i5-14500", "Intel Core i7-2600", "Intel Core i7-3770", "Intel Core i7-4770", "Intel Core i7-4790", "Intel Core i7-6700", "Intel Core i7-7700", "Intel Core i7-8700", "Intel Core i7-9700", "Intel Core i7-10700", "Intel Core i7-11700", "Intel Core i7-12700", "Intel Core i7-13700", "Intel Core i7-13700K", "Intel Core i7-14700", "Intel Core i7-14700K" ];
const ramOptions = [ "2 GB DDR3", "4 GB DDR3", "8 GB DDR3", "8 GB DDR4", "16 GB DDR3", "16 GB DDR4", "32 GB DDR4", "32 GB DDR5", "64 GB DDR4", "64 GB DDR5" ];
const storageOptions = [ "HDD 500 GB", "HDD 1 TB", "HDD 2 TB", "SSD SATA 120 GB", "SSD SATA 240 GB", "SSD SATA 480 GB", "SSD SATA 1 TB", "SSD NVMe 256 GB", "SSD NVMe 512 GB", "SSD NVMe 1 TB", "SSD NVMe 2 TB", "Hybrid SSHD 1 TB" ];
const gpuOptions = [ "Intel HD Graphics 2000", "Intel HD Graphics 2500", "Intel HD Graphics 3000", "Intel HD Graphics 4000", "Intel HD Graphics 4400", "Intel HD Graphics 4600", "Intel HD Graphics 5000", "Intel HD Graphics 510", "Intel HD Graphics 515", "Intel HD Graphics 520", "Intel HD Graphics 530", "Intel HD Graphics 550", "Intel HD Graphics 600", "Intel HD Graphics 610", "Intel HD Graphics 615", "Intel UHD Graphics 600", "Intel UHD Graphics 605", "Intel UHD Graphics 610", "Intel UHD Graphics 620", "Intel UHD Graphics 630", "Intel UHD Graphics 710", "Intel UHD Graphics 730", "Intel UHD Graphics 750", "Intel UHD Graphics 770", "Intel UHD Graphics 780", "Intel UHD Graphics 785", "Intel UHD Graphics Xe", "Intel Iris Graphics 540", "Intel Iris Graphics 550", "Intel Iris Plus 640", "Intel Iris Plus 650", "Intel Iris Xe Graphics", "Intel Iris Xe MAX", "Intel Arc A310", "Intel Arc A380", "Intel Arc A580", "Intel Arc A750", "Intel Arc A770", "Intel Arc B580 (Mobile)", "Intel Arc B770 (Mobile)" ];
const antivirusOptions = [ "Windows Defender", "Kaspersky Endpoint Security", "Avast Business Antivirus", "Avira Antivirus Pro", "ESET NOD32", "Bitdefender Total Security", "McAfee LiveSafe", "Sophos Intercept X", "Norton Security Deluxe", "Trend Micro OfficeScan", "Panda Dome Essential" ];
const mainboardOptions = [ "ASRock H61M-VG3", "ASRock H81M-VG4 R2.0", "ASRock H110M-DVS R3.0", "ASRock H310M-HDV", "ASRock B250M-HDV", "ASRock B360M-HDV", "ASRock B365M Pro4", "ASRock H370M Pro4", "ASRock H410M-HDV/M.2", "ASRock H470M-HDV", "ASRock B460M Pro4", "ASRock H510M-HVS", "ASRock B560M Pro4", "ASRock H610M-HDV/M.2", "ASRock H610M-HVS", "ASRock H610M-HDV/M.2+", "ASRock B660M Pro RS", "ASRock B660M-HDV", "ASRock B760M Pro RS", "ASRock B760M-HDV", "ASRock Z370 Extreme4", "ASRock Z390 Phantom Gaming 4", "ASRock Z490 Phantom Gaming 4", "ASRock Z590 Pro4", "ASRock Z690 Steel Legend", "ASRock Z690 Phantom Gaming 4", "ASRock Z790 PG Lightning", "ASRock Z790 Steel Legend", "ASRock Z790 LiveMixer", "ASRock Z790 Taichi", "ASRock Z790 Taichi Lite", "ASRock Q670M vPro", "ASRock H670 PG Riptide", "ASRock B760M PG Riptide" ];

const MANUAL_INPUT_VALUE = "manual-input";

const ManualInputSelect = ({
    field,
    placeholder,
    options,
    className
}: {
    field: any;
    placeholder: string;
    options: string[];
    className?: string;
}) => {
    const [isManual, setIsManual] = useState(!options.includes(field.value) && field.value !== '');
    
    useEffect(() => {
        setIsManual(!options.includes(field.value) && field.value !== '');
    }, [field.value, options]);

    const handleSelectChange = (value: string) => {
        if (value === MANUAL_INPUT_VALUE) {
            setIsManual(true);
            field.onChange('');
        } else {
            setIsManual(false);
            field.onChange(value);
        }
    };

    return (
        <div className="space-y-2">
            {isManual ? (
                <Input
                    placeholder={`Masukkan ${placeholder} manual...`}
                    value={field.value}
                    onChange={field.onChange}
                    className={className}
                />
            ) : (
                <Select onValueChange={handleSelectChange} value={field.value}>
                    <FormControl>
                        <SelectTrigger className={className}>
                            <SelectValue placeholder={placeholder} />
                        </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                        {options.map((o) => (
                            <SelectItem key={o} value={o}>
                                {o}
                            </SelectItem>
                        ))}
                        <SelectItem value={MANUAL_INPUT_VALUE}>
                            Isi Manual...
                        </SelectItem>
                    </SelectContent>
                </Select>
            )}
        </div>
    );
};

export default function ComputerAssetForm({ asset, children }: ComputerAssetFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!asset;

  const form = useForm<ComputerAssetFormValues>({
    resolver: zodResolver(computerAssetSchema),
  });

  useEffect(() => {
    if (isOpen) {
      form.reset({
        computerName: asset?.computerName || '',
        assetCode: asset?.assetCode || '',
        department: asset?.department || '',
        currentUser: asset?.currentUser || '',
        brandModel: asset?.brandModel || '',
        mainboard: asset?.mainboard || '',
        cpu: asset?.cpu || '',
        ram: asset?.ram || '',
        storage: asset?.storage || '',
        storage2: asset?.storage2 || '',
        gpu: asset?.gpu || '',
        serialNumber: asset?.serialNumber || '',
        ipAddress: asset?.ipAddress || '',
        macAddress: asset?.macAddress || '',
        os: asset?.os || '',
        windowsLicense: asset?.windowsLicense || '',
        officeLicense: asset?.officeLicense || '',
        antivirus: asset?.antivirus || '',
        purchaseDate: asset?.purchaseDate ? asset.purchaseDate.toDate() : undefined,
        supplier: asset?.supplier || '',
        notes: asset?.notes || '',
        condition: asset?.condition || 'Aktif',
        status: asset?.status || 'Digunakan',
      });
    }
  }, [isOpen, asset, form]);

  async function onSubmit(values: ComputerAssetFormValues) {
    if (!user) return;
    setIsLoading(true);

    try {
      // Check for duplicate computer name
      const q = query(collection(db, 'it_assets'), where('computerName', '==', values.computerName));
      const querySnapshot = await getDocs(q);
      
      let isDuplicate = false;
      if (!querySnapshot.empty) {
        if (isEditMode) {
          // In edit mode, a duplicate is only an issue if it's a different document
          if (querySnapshot.docs.some(doc => doc.id !== asset.id)) {
            isDuplicate = true;
          }
        } else {
          // In add mode, any result is a duplicate
          isDuplicate = true;
        }
      }

      if (isDuplicate) {
        toast({
          variant: 'destructive',
          title: 'Nama Komputer Duplikat',
          description: `Aset IT dengan nama "${values.computerName}" sudah ada. Silakan gunakan nama lain.`,
        });
        setIsLoading(false);
        return;
      }

      const dataToSave: any = {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(values.purchaseDate) : null,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        const assetRef = doc(db, 'it_assets', asset.id);
        await setDoc(assetRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil', description: 'Aset IT berhasil diperbarui.' });
      } else {
        dataToSave.createdAt = serverTimestamp();
        await addDoc(collection(db, 'it_assets'), dataToSave);
        toast({ title: 'Berhasil', description: 'Aset IT baru berhasil ditambahkan.' });
      }
      setIsOpen(false);
    } catch (error) {
      console.error('Error saving IT asset:', error);
      toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal menyimpan data aset IT.' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "bg-gray-100 dark:bg-gray-700";

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent
        className="sm:max-w-3xl max-h-[90vh] overflow-y-auto bg-yellow-400 dark:bg-yellow-800/50"
        onPointerDownOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>{isEditMode ? 'Edit Aset IT' : 'Tambah Aset IT Baru'}</DialogTitle>
          <DialogDescription>Isi detail aset komputer atau perangkat IT.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Fields go here */}
              <FormField control={form.control} name="computerName" render={({ field }) => (
                  <FormItem><FormLabel>Nama Komputer</FormLabel><FormControl><Input placeholder="e.g., PC-Finance-01" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="assetCode" render={({ field }) => (
                  <FormItem><FormLabel>Kode Aset</FormLabel><FormControl><Input placeholder="e.g., A9-202401-001" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="department" render={({ field }) => (
                  <FormItem><FormLabel>Departemen</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih Departemen" /></SelectTrigger></FormControl><SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
              )} />
              <FormField control={form.control} name="currentUser" render={({ field }) => (
                  <FormItem><FormLabel>Pengguna</FormLabel><FormControl><Input placeholder="e.g., John Doe" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="brandModel" render={({ field }) => (
                  <FormItem><FormLabel>Merk / Model</FormLabel><FormControl><Input placeholder="e.g., Dell Optiplex 3080" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
              )} />
               <FormField control={form.control} name="mainboard" render={({ field }) => (
                <FormItem>
                  <FormLabel>Mainboard</FormLabel>
                  <ManualInputSelect field={field} placeholder="Pilih Mainboard" options={mainboardOptions} className={inputClass} />
                  <FormMessage />
                </FormItem>
              )} />
              <FormField control={form.control} name="os" render={({ field }) => (
                <FormItem>
                  <FormLabel>Sistem Operasi</FormLabel>
                   <ManualInputSelect field={field} placeholder="Pilih Sistem Operasi" options={osOptions} className={inputClass} />
                  <FormMessage />
                </FormItem>
              )} />
            </div>

            <h3 className="font-semibold text-lg border-b pt-4">Spesifikasi Teknis</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                 <FormField control={form.control} name="cpu" render={({ field }) => (
                  <FormItem>
                    <FormLabel>CPU</FormLabel>
                     <ManualInputSelect field={field} placeholder="Pilih CPU" options={cpuOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="ram" render={({ field }) => (
                  <FormItem>
                    <FormLabel>RAM</FormLabel>
                    <ManualInputSelect field={field} placeholder="Pilih RAM" options={ramOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="storage" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage</FormLabel>
                    <ManualInputSelect field={field} placeholder="Pilih Storage" options={storageOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="storage2" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Storage 2 (Opsional)</FormLabel>
                    <ManualInputSelect field={field} placeholder="Pilih Storage 2" options={storageOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                 <FormField control={form.control} name="gpu" render={({ field }) => (
                  <FormItem>
                    <FormLabel>GPU</FormLabel>
                    <ManualInputSelect field={field} placeholder="Pilih GPU" options={gpuOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="ipAddress" render={({ field }) => (
                  <FormItem><FormLabel>IP Address</FormLabel><FormControl><Input placeholder="e.g., 192.168.1.100" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="macAddress" render={({ field }) => (
                  <FormItem><FormLabel>MAC Address</FormLabel><FormControl><Input placeholder="e.g., 00:1B:44:11:3A:B7" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
            </div>
             <h3 className="font-semibold text-lg border-b pt-4">Lisensi & Lainnya</h3>
             <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 <FormField control={form.control} name="windowsLicense" render={({ field }) => (
                  <FormItem><FormLabel>Lisensi Windows</FormLabel><FormControl><Input placeholder="Kunci lisensi atau jenisnya" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="officeLicense" render={({ field }) => (
                  <FormItem><FormLabel>Lisensi Office</FormLabel><FormControl><Input placeholder="Kunci lisensi atau jenisnya" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="antivirus" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Antivirus</FormLabel>
                    <ManualInputSelect field={field} placeholder="Pilih Antivirus" options={antivirusOptions} className={inputClass} />
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="serialNumber" render={({ field }) => (
                  <FormItem><FormLabel>Serial Number</FormLabel><FormControl><Input placeholder="S/N Perangkat" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                  <FormItem className="flex flex-col"><FormLabel>Tanggal Pembelian</FormLabel><Popover><PopoverTrigger asChild><FormControl><Button variant={"outline"} className={cn("pl-3 text-left font-normal", inputClass, !field.value && "text-muted-foreground")}><CalendarIcon className="mr-2 h-4 w-4" />{field.value ? format(field.value, "PPP", { locale: id }) : <span>Pilih tanggal</span>}</Button></FormControl></PopoverTrigger><PopoverContent className="w-auto p-0"><Calendar mode="single" selected={field.value || undefined} onSelect={field.onChange} initialFocus /></PopoverContent></Popover><FormMessage /></FormItem>
                )} />
                 <FormField control={form.control} name="supplier" render={({ field }) => (
                  <FormItem><FormLabel>Supplier</FormLabel><FormControl><Input placeholder="Nama vendor atau supplier" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                )} />
             </div>
             <div className="grid grid-cols-2 gap-4">
                <FormField control={form.control} name="condition" render={({ field }) => (
                  <FormItem><FormLabel>Kondisi</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue/></SelectTrigger></FormControl><SelectContent>{conditionOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
                <FormField control={form.control} name="status" render={({ field }) => (
                  <FormItem><FormLabel>Status</FormLabel><Select onValueChange={field.onChange} defaultValue={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue/></SelectTrigger></FormControl><SelectContent>{statusOptions.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                )} />
             </div>
             <FormField control={form.control} name="notes" render={({ field }) => (
                <FormItem><FormLabel>Catatan</FormLabel><FormControl><Textarea placeholder="Catatan tambahan..." {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
            )} />

            <DialogFooter>
              <DialogClose asChild>
                <Button type="button" variant="secondary" disabled={isLoading}>Batal</Button>
              </DialogClose>
              <Button type="submit" disabled={isLoading}>
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {isEditMode ? 'Simpan Perubahan' : 'Simpan Aset'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
