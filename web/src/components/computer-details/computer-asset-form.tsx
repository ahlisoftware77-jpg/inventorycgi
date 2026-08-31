'use client';

/**
 * @fileOverview Formulir Tambah/Edit Aset IT dengan desain korporat elegan.
 */

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
import { useToast } from '@/hooks/use-toast';
import { computerAssetSchema } from '@/lib/schemas';
import { type ComputerAsset } from '@/lib/types';
import { addDoc, collection, doc, serverTimestamp, setDoc, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, CalendarIcon, Laptop, Settings2, ShieldCheck, ShoppingCart, Info, X, CheckCircle2, PlusCircle, Network } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { cn } from '@/lib/utils';
import { format, parse, isValid } from 'date-fns';

type ComputerAssetFormValues = z.infer<typeof computerAssetSchema>;

interface ComputerAssetFormProps {
  asset?: ComputerAsset;
  children: ReactNode;
}

const departmentOptions = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];

const osOptions = [ "Windows 11 Pro", "Windows 11 Home", "Windows 10 Pro", "Windows 10 Home", "Windows 8.1 Pro", "Windows 7 Ultimate", "macOS Sonoma", "macOS Ventura", "FreeDOS" ];
const cpuOptions = [ "Intel Core i3-12100", "Intel Core i3-13100", "Intel Core i5-12400", "Intel Core i5-13400", "Intel Core i5-14400", "Intel Core i7-13700", "Intel Core i7-14700", "AMD Ryzen 5 5600G", "AMD Ryzen 7 5700G" ];
const ramOptions = [ "4 GB DDR4", "8 GB DDR4", "16 GB DDR4", "32 GB DDR4", "16 GB DDR5", "32 GB DDR5", "64 GB DDR5" ];
const storageOptions = [ "SSD SATA 240 GB", "SSD SATA 480 GB", "SSD NVMe 256 GB", "SSD NVMe 512 GB", "SSD NVMe 1 TB", "HDD 1 TB", "HDD 2 TB" ];
const gpuOptions = [ "Integrated Intel UHD", "Integrated Intel Iris Xe", "NVIDIA GeForce GTX 1650", "NVIDIA GeForce RTX 3050", "NVIDIA GeForce RTX 4060", "Integrated AMD Radeon" ];
const antivirusOptions = [ "Windows Defender", "Kaspersky Endpoint Security", "ESET NOD32", "Bitdefender Total Security", "McAfee LiveSafe" ];

const SectionHeader = ({ icon: Icon, title }: { icon: any, title: string }) => (
  <div className="flex items-center gap-2 pb-2 mb-4 border-b border-muted/50">
    <div className="p-1.5 bg-primary/10 rounded-md">
      <Icon className="w-4 h-4 text-primary" />
    </div>
    <h3 className="font-black text-[10px] uppercase tracking-[0.2em] text-foreground/70">{title}</h3>
  </div>
);

export default function ComputerAssetForm({ asset, children }: ComputerAssetFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [manualInput, setManualInput] = useState<Record<string, boolean>>({});
  const { user } = useAuth();
  const { toast } = useToast();
  const isEditMode = !!asset;

  const form = useForm<ComputerAssetFormValues>({
    resolver: zodResolver(computerAssetSchema),
  });

  useEffect(() => {
    if (isOpen) {
      const initialManual: Record<string, boolean> = {};
      if (asset) {
        if (asset.cpu && !cpuOptions.includes(asset.cpu)) initialManual.cpu = true;
        if (asset.ram && !ramOptions.includes(asset.ram)) initialManual.ram = true;
        if (asset.storage && !storageOptions.includes(asset.storage)) initialManual.storage = true;
        if (asset.storage2 && !storageOptions.includes(asset.storage2)) initialManual.storage2 = true;
        if (asset.gpu && !gpuOptions.includes(asset.gpu)) initialManual.gpu = true;
      }
      setManualInput(initialManual);

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
      const dataToSave: any = {
        ...values,
        purchaseDate: values.purchaseDate ? Timestamp.fromDate(values.purchaseDate) : null,
        updatedAt: serverTimestamp(),
      };

      if (isEditMode) {
        const assetRef = doc(db, 'it_assets', asset.id);
        await setDoc(assetRef, dataToSave, { merge: true });
        toast({ title: 'Berhasil Diperbarui' });
      } else {
        dataToSave.createdAt = serverTimestamp();
        await addDoc(collection(db, 'it_assets'), dataToSave);
        toast({ title: 'Aset IT Ditambahkan' });
      }
      setIsOpen(false);
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsLoading(false);
    }
  }

  const inputClass = "bg-background h-11 border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm rounded-xl";

  const renderSelectOrInput = (
    field: any,
    options: string[],
    placeholder: string,
    name: string
  ) => {
    const isManual = manualInput[name];

    if (isManual) {
      return (
        <div className="relative">
          <FormControl>
            <Input placeholder={`Ketik ${placeholder}...`} {...field} className={cn(inputClass, "pr-10")} />
          </FormControl>
          <Button 
            type="button" 
            variant="ghost" 
            size="sm" 
            className="absolute right-1 top-1 h-9 w-9 p-0 text-muted-foreground hover:text-foreground"
            onClick={() => {
              setManualInput(prev => ({ ...prev, [name]: false }));
              field.onChange('');
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      );
    }

    return (
      <Select 
        onValueChange={(val) => {
          if (val === 'manual') {
            setManualInput(prev => ({ ...prev, [name]: true }));
            field.onChange('');
          } else {
            field.onChange(val === 'none' ? '' : val);
          }
        }} 
        value={field.value || (name === 'storage2' ? 'none' : '')}
      >
        <FormControl><SelectTrigger className={inputClass}><SelectValue placeholder={placeholder} /></SelectTrigger></FormControl>
        <SelectContent>
          {name === 'storage2' && <SelectItem value="none">Tidak Ada</SelectItem>}
          {options.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
          <SelectItem value="manual" className="font-bold text-primary">Lainnya (Ketik Manual)...</SelectItem>
        </SelectContent>
      </Select>
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-4xl max-h-[85vh] my-8 overflow-y-auto p-0 border-none shadow-2xl bg-white dark:bg-slate-950 rounded-[2.5rem]" onPointerDownOutside={(e) => e.preventDefault()}>
        <div className={cn(
          "sticky top-0 z-50 px-8 py-6 flex items-center justify-between border-b",
          isEditMode ? "bg-slate-900 text-white" : "bg-primary text-white"
        )}>
          <div>
            <DialogTitle className="text-2xl font-black tracking-tight uppercase flex items-center gap-3">
              {isEditMode ? <Laptop className="w-7 h-7" /> : <PlusCircle className="w-7 h-7" />}
              {isEditMode ? 'Edit Spesifikasi IT' : 'Registrasi Aset IT'}
            </DialogTitle>
            <DialogDescription className="text-white/70 font-medium">
              Informasi hardware dan lisensi perangkat korporat.
            </DialogDescription>
          </div>
          <DialogClose asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10">
              <X className="w-6 h-6" />
            </Button>
          </DialogClose>
        </div>

        <div className="p-8">
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-10">
              
              <section>
                <SectionHeader icon={Laptop} title="Identitas Perangkat" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <FormField control={form.control} name="computerName" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Nama Komputer (Hostname)</FormLabel><FormControl><Input placeholder="e.g., PC-IT-ADMIN" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="assetCode" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Kode Aset Internal</FormLabel><FormControl><Input placeholder="e.g., A9-2024-001" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="department" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Departemen</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue placeholder="Pilih unit" /></SelectTrigger></FormControl><SelectContent>{departmentOptions.map(d => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="currentUser" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Pengguna (End User)</FormLabel><FormControl><Input placeholder="Nama lengkap karyawan" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="brandModel" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Merk & Model PC/Laptop</FormLabel><FormControl><Input placeholder="e.g., Lenovo ThinkPad L14" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={Settings2} title="Spesifikasi Teknis (Hardware)" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-6">
                  <FormField control={form.control} name="mainboard" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Motherboard</FormLabel><FormControl><Input placeholder="e.g., ASUS ROG" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="cpu" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Processor</FormLabel>{renderSelectOrInput(field, cpuOptions, "Pilih Processor", "cpu")}<FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="ram" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">RAM Capacity</FormLabel>{renderSelectOrInput(field, ramOptions, "Pilih RAM", "ram")}<FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="storage" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Primary Storage</FormLabel>{renderSelectOrInput(field, storageOptions, "Pilih Storage 1", "storage")}<FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="storage2" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Secondary Storage</FormLabel>{renderSelectOrInput(field, storageOptions, "Pilih (Opsional)", "storage2")}<FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="gpu" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Graphics (GPU)</FormLabel>{renderSelectOrInput(field, gpuOptions, "Pilih GPU", "gpu")}<FormMessage /></FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={ShieldCheck} title="Software & Lisensi" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  <FormField control={form.control} name="os" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Operating System</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl><SelectContent>{osOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="antivirus" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Antivirus Endpoint</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl><SelectContent>{antivirusOptions.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}</SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="windowsLicense" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Windows License Key</FormLabel><FormControl><Input placeholder="Key or Type" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="officeLicense" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Office License</FormLabel><FormControl><Input placeholder="e.g., O365 / Key" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={Network} title="Konektivitas Jaringan" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <FormField control={form.control} name="ipAddress" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">IP Address</FormLabel><FormControl><Input placeholder="e.g., 192.168.1.10" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="macAddress" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">MAC Address</FormLabel><FormControl><Input placeholder="e.g., 00:1A:2B:3C:4D:5E" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>
              </section>

              <section>
                <SectionHeader icon={ShoppingCart} title="Administrasi Pengadaan & Status" />
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-6 mb-6">
                  <FormField control={form.control} name="serialNumber" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Serial Number</FormLabel><FormControl><Input placeholder="S/N" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="purchaseDate" render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel className="text-xs font-bold uppercase text-muted-foreground">Tanggal Perolehan</FormLabel>
                      <FormControl>
                        <div className="relative flex items-center">
                          <Input 
                            type="date"
                            value={field.value ? format(field.value, "yyyy-MM-dd") : ""}
                            onChange={(e) => {
                              const val = e.target.value;
                              if (!val) field.onChange(null);
                              else {
                                const parsed = parse(val, "yyyy-MM-dd", new Date());
                                field.onChange(isValid(parsed) ? parsed : null);
                              }
                            }}
                            className={cn(inputClass, "w-full pr-10")}
                          />
                          <CalendarIcon className="absolute right-3 h-4 w-4 text-primary pointer-events-none" />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="supplier" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Vendor / Supplier</FormLabel><FormControl><Input placeholder="Nama Toko" {...field} className={inputClass} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="condition" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Kondisi Fisik</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Aktif">Aktif (Baik)</SelectItem><SelectItem value="Perlu Perbaikan">Perlu Perbaikan</SelectItem><SelectItem value="Rusak">Rusak</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Status Aset</FormLabel><Select onValueChange={field.onChange} value={field.value}><FormControl><SelectTrigger className={inputClass}><SelectValue /></SelectTrigger></FormControl><SelectContent><SelectItem value="Digunakan">Digunakan</SelectItem><SelectItem value="Dalam Service">Dalam Service</SelectItem><SelectItem value="Dihapus">Dihapus (Disposal)</SelectItem></SelectContent></Select><FormMessage /></FormItem>
                  )} />
                </div>
                <FormField control={form.control} name="notes" render={({ field }) => (
                  <FormItem><FormLabel className="text-xs font-bold uppercase text-muted-foreground">Catatan Tambahan</FormLabel><FormControl><Textarea placeholder="Keterangan tambahan terkait aset, lisensi, atau perbaikan..." {...field} className="resize-none min-h-[80px] bg-background border-slate-200 focus:border-primary focus:ring-1 focus:ring-primary shadow-sm rounded-xl" /></FormControl><FormMessage /></FormItem>
                )} />
              </section>

              <DialogFooter className="sticky bottom-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-md p-6 border-t mt-10 -mx-8 z-50">
                <div className="flex w-full items-center justify-end gap-3">
                  <DialogClose asChild><Button type="button" variant="ghost" className="rounded-xl px-8 font-bold">Batal</Button></DialogClose>
                  <Button type="submit" disabled={isLoading} className={cn("px-10 font-black rounded-xl shadow-xl transition-all h-12 uppercase tracking-tighter", isEditMode ? "bg-slate-900 hover:bg-black" : "bg-primary hover:bg-primary/90 shadow-primary/20")}>
                    {isLoading ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <CheckCircle2 className="mr-2 h-5 w-5" />}
                    {isEditMode ? 'Simpan Perubahan' : 'Daftarkan Aset IT'}
                  </Button>
                </div>
              </DialogFooter>
            </form>
          </Form>
        </div>
      </DialogContent>
    </Dialog>
  );
}