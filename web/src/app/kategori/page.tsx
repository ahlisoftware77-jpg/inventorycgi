
'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { 
  Plus, 
  Trash2, 
  Edit, 
  Layers, 
  ShieldCheck, 
  Clock, 
  Loader2, 
  Search, 
  Info,
  X
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogTrigger,
  DialogClose
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface CategoryObject {
  name: string;
  lifetime: number;
  series: string;
}

const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

export default function KategoriPage() {
  const [categories, setCategories] = useState<CategoryObject[]>([]);
  const [seriesList, setSeriesList] = useState<string[]>(['Seri A', 'Seri B', 'Fasilitas']);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'Admin';

  // Management States
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [editingCat, setEditingCat] = useState<CategoryObject | null>(null);
  
  const [newCatName, setNewCatName] = useState('');
  const [newCatLifetime, setNewCatLifetime] = useState<number>(5);
  const [newCatSeries, setNewCatSeries] = useState<string>('');

  const [editLifetime, setEditLifetime] = useState<number>(5);
  const [editSeries, setEditSeries] = useState<string>('');

  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        
        if (data.seriesList) {
            setSeriesList(data.seriesList);
            if (!newCatSeries) setNewCatSeries(data.seriesList[0]);
        }

        if (data.categories) {
          const normalized = data.categories.map((c: any) => {
            if (typeof c === 'string') {
              let series = 'Seri B';
              if (c.startsWith('A')) series = 'Seri A';
              if (utilityCategories.includes(c)) series = 'Fasilitas';
              return { name: c, lifetime: 5, series };
            }
            return {
              name: c.name,
              lifetime: c.lifetime || 5,
              series: c.series || (c.name.startsWith('A') ? 'Seri A' : (utilityCategories.includes(c.name) ? 'Fasilitas' : 'Seri B'))
            } as CategoryObject;
          });
          setCategories(normalized.sort((a,b) => a.name.localeCompare(b.name)));
        }
      }
      setLoading(false);
    });
    return () => unsub();
  }, [newCatSeries]);

  const handleSave = async (isNew: boolean) => {
    if (isNew && (!newCatName.trim() || newCatLifetime < 0)) return;
    if (!isNew && !editingCat) return;

    setIsProcessing(true);
    try {
        let updatedList = [...categories];
        if (isNew) {
            if (categories.some(c => c.name.toLowerCase() === newCatName.trim().toLowerCase())) {
                toast({ variant: 'destructive', title: 'Kategori sudah ada' });
                setIsProcessing(false);
                return;
            }
            updatedList.push({ name: newCatName.trim(), lifetime: newCatLifetime, series: newCatSeries });
        } else {
            updatedList = categories.map(c => c.name === editingCat!.name ? { ...c, lifetime: editLifetime, series: editSeries } : c);
        }

        await setDoc(doc(db, 'settings', 'general'), { categories: updatedList }, { merge: true });
        toast({ title: 'Berhasil Disimpan' });
        setIsAddOpen(false);
        setIsEditOpen(false);
        setNewCatName('');
        setNewCatLifetime(5);
        setNewCatSeries(seriesList[0] || 'Seri B');
    } catch (e) {
        toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
        setIsProcessing(false);
    }
  };

  const handleDelete = async (catName: string) => {
    if (!confirm(`Hapus kategori "${catName}"?`)) return;
    setIsProcessing(true);
    try {
        const updatedList = categories.filter(c => c.name !== catName);
        await setDoc(doc(db, 'settings', 'general'), { categories: updatedList }, { merge: true });
        toast({ title: 'Dihapus', description: `Kategori ${catName} telah dihapus.` });
    } catch (e) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
        setIsProcessing(false);
    }
  };

  const getSeriesColor = (series: string) => {
    if (series === 'Fasilitas') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (series === 'Seri A') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (series === 'Seri B') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  const filteredCategories = categories.filter(c => 
    c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.series.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="space-y-8 pb-32 animate-in fade-in duration-700 text-black">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
            <div className="space-y-1">
                <div className="flex items-center gap-3 text-left">
                    <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
                        <Layers className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Katalog Klasifikasi</h1>
                        <p className="text-sm font-medium text-muted-foreground text-left uppercase tracking-widest">Manajemen Kategori & Identitas Seri Aset</p>
                    </div>
                </div>
            </div>
            {isAdmin && (
                <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
                    <DialogTrigger asChild>
                        <Button className="rounded-2xl h-12 px-8 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tighter shadow-xl shadow-primary/20">
                            <Plus className="mr-2 h-5 w-5" /> Tambah Kategori
                        </Button>
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden text-black">
                        <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                            <div className="p-3 bg-white/10 rounded-2xl mb-2"><Plus className="h-8 w-8" /></div>
                            <DialogTitle className="text-xl font-black uppercase text-white">Kategori Baru</DialogTitle>
                            <DialogDescription className="text-white/60">Daftarkan klasifikasi aset baru ke sistem.</DialogDescription>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Kategori</Label>
                                <Input placeholder="Contoh: Mesin Produksi..." value={newCatName} onChange={(e) => setNewCatName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-black" />
                            </div>
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identitas Seri</Label>
                                <Select value={newCatSeries} onValueChange={setNewCatSeries}>
                                    <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-slate-900">
                                        <SelectValue placeholder="Pilih Seri" />
                                    </SelectTrigger>
                                    <SelectContent className="rounded-xl">
                                        {seriesList.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2 text-left">
                                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Masa Ketahanan (Tahun)</Label>
                                <div className="relative">
                                    <Input type="number" placeholder="5" value={newCatLifetime} onChange={(e) => setNewCatLifetime(Number(e.target.value))} className="h-12 pl-4 pr-12 rounded-xl bg-slate-50 border-none shadow-inner font-black text-lg text-black" />
                                    <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">Thn</span>
                                </div>
                            </div>
                            <Button onClick={() => handleSave(true)} disabled={isProcessing} className="w-full h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg">
                                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Kategori"}
                            </Button>
                        </div>
                    </DialogContent>
                </Dialog>
            )}
        </div>

        <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md">
          <CardHeader className="p-8 sm:p-10 pb-6 border-b border-slate-100 dark:border-slate-800">
             <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <ShieldCheck className="h-5 w-5 text-emerald-500" />
                    <CardTitle className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Daftar Kategori Aktif</CardTitle>
                </div>
                <div className="relative w-full sm:w-80 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-primary transition-colors" />
                    <Input 
                        placeholder="Cari kategori atau seri..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="h-11 pl-11 rounded-2xl border-slate-100 shadow-inner bg-white dark:bg-slate-950 font-medium text-black"
                    />
                </div>
             </div>
          </CardHeader>
          <CardContent className="p-0">
            <ScrollArea className="h-[550px] w-full">
                <Table>
                    <TableHeader className="bg-slate-50/50 dark:bg-slate-800/50 h-14 sticky top-0 z-10">
                        <TableRow className="border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Nama Klasifikasi Aset (財產類別)</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Identitas Seri</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Ketahanan (Tahun)</TableHead>
                            {isAdmin && <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                            Array.from({ length: 8 }).map((_, i) => (
                                <TableRow key={i}><TableCell colSpan={isAdmin ? 5 : 4} className="p-6"><Skeleton className="h-12 w-full rounded-2xl" /></TableCell></TableRow>
                            ))
                        ) : filteredCategories.length > 0 ? (
                            filteredCategories.map((cat, idx) => {
                                const colorClass = getSeriesColor(cat.series);
                                return (
                                    <TableRow key={cat.name} className="h-20 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-50 dark:border-slate-800 group">
                                        <TableCell className="pl-10 text-xs font-black text-slate-400 group-hover:text-primary transition-colors">{idx + 1}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left text-black">
                                                <span className="font-black text-base text-slate-900 dark:text-white uppercase tracking-tight text-left drop-shadow-sm">{cat.name}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-left">Official System Category</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn("rounded-lg font-black text-[9px] uppercase tracking-tighter border-none ring-1 ring-inset px-4 py-1", colorClass)}>
                                                {cat.series}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge className="bg-primary/5 text-primary border-primary/20 font-black text-xs px-5 py-1.5 rounded-full shadow-inner ring-1 ring-primary/10">
                                                <Clock className="w-3 h-3 mr-1.5" /> {cat.lifetime} TAHUN
                                            </Badge>
                                        </TableCell>
                                        {isAdmin && (
                                            <TableCell className="text-right pr-10">
                                                <div className="flex justify-end gap-2">
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-amber-600 hover:bg-amber-50"
                                                        onClick={() => { 
                                                            setEditingCat(cat); 
                                                            setEditLifetime(cat.lifetime); 
                                                            setEditSeries(cat.series);
                                                            setIsEditOpen(true); 
                                                        }}
                                                    >
                                                        <Edit className="h-4 w-4" />
                                                    </Button>
                                                    <Button 
                                                        variant="ghost" 
                                                        size="icon" 
                                                        className="h-10 w-10 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                                                        onClick={() => handleDelete(cat.name)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        )}
                                    </TableRow>
                                )
                            })
                        ) : (
                            <TableRow>
                                <TableCell colSpan={isAdmin ? 5 : 4} className="h-64 text-center">
                                    <div className="flex flex-col items-center gap-3 opacity-20">
                                        <Search className="h-12 w-12" />
                                        <p className="font-black uppercase tracking-[0.3em] text-sm italic">Kategori Tidak Ditemukan</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </ScrollArea>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t flex flex-col sm:flex-row items-center justify-between gap-6 text-left">
              <div className="flex items-center gap-3 text-left">
                  <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-primary" /></div>
                  <p className="text-[10px] font-bold text-muted-foreground uppercase leading-relaxed max-w-xl text-left">
                    Klasifikasi seri dan masa ketahanan digunakan oleh sistem untuk mengestimasi penyusutan nilai buku secara otomatis melalui metode garis lurus.
                  </p>
              </div>
              <Badge variant="outline" className="font-black text-[9px] uppercase tracking-widest border-primary/20 text-primary px-4 h-8 bg-white">Audit Integrity Ready</Badge>
          </CardFooter>
        </Card>
      </div>

      {/* EDIT LIFETIME & SERIES DIALOG */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden text-black">
            <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-2xl mb-2 text-white"><Clock className="h-8 w-8 text-primary" /></div>
                <DialogTitle className="text-xl font-black uppercase text-white">Edit Klasifikasi</DialogTitle>
                <DialogDescription className="text-white/80 uppercase font-bold text-[10px] tracking-widest">{editingCat?.name}</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identitas Seri Baru</Label>
                    <Select value={editSeries} onValueChange={setEditSeries}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-slate-900">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            {seriesList.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Masa Ketahanan Baru (Tahun)</Label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={editLifetime} 
                            onChange={(e) => setEditLifetime(Number(e.target.value))} 
                            className="h-14 pl-6 pr-14 rounded-2xl bg-slate-50 border-none shadow-inner font-black text-2xl focus:ring-primary/20 text-slate-900" 
                        />
                        <span className="absolute right-5 top-1/2 -translate-y-1/2 text-xs font-black uppercase text-primary">Tahun</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <DialogClose asChild><Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold">Batal</Button></DialogClose>
                    <Button onClick={() => handleSave(false)} disabled={isProcessing} className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg">
                        {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Update Klasifikasi"}
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
