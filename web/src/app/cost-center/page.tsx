'use client';

import { useState, useEffect } from 'react';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Coins, Info, ShieldCheck, Pencil, Loader2, UserCheck, Briefcase } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/hooks/use-auth';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';

const defaultCostCenters = [
  { code: 'F1325', department: 'APP-R&D', sectionHead: 'Darmawan, Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1325-A', department: 'APP', sectionHead: 'Darmawan', manager: 'Mr. Dai' },
  { code: 'F1325-R', department: 'R&D', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1324', department: 'LAB', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1321', department: 'QC', sectionHead: 'Lai Fu Ming', manager: 'Mr. Dai' },
  { code: 'F1313', department: 'MIXER', sectionHead: 'M Suparman Nurjaya', manager: 'Mr. Li Deyi' },
  { code: 'F1323', department: 'PPIC', sectionHead: 'Warsito', manager: 'Mr. Li Deyi' },
  { code: 'F1312', department: 'FRIT', sectionHead: 'Agus Gito', manager: 'Mr. Li Deyi' },
  { code: 'F1322', department: 'MAINTENANCE', sectionHead: 'Warsito', manager: 'Mr. Li Deyi' },
  { code: 'F1314', department: 'TINTA', sectionHead: 'M Suparman Nurjaya', manager: 'Mr. Li Deyi' },
  { code: 'F0230', department: 'MARKETING', sectionHead: 'Kirwan', manager: 'Mrs.Ting' },
  { code: 'F0210', department: 'GA', sectionHead: 'Eko Prasetyo', manager: 'Mrs.Ting' },
  { code: 'F0220', department: 'ACCOUNTING', sectionHead: 'Mr. Wu', manager: 'Mrs.Ting' },
  { code: 'F0100', department: 'IT', sectionHead: 'Admin', manager: 'Mrs.Ting' },
  { code: 'F0300', department: 'PURCHASING', sectionHead: 'Elna', manager: 'Mrs.Ting' },
];

export default function CostCenterPage() {
  const [costCenters, setCostCenters] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();
  const isAdmin = user?.role === 'Admin';

  // Edit State
  const [editingItem, setEditingItem] = useState<any | null>(null);
  const [editSectionHead, setEditSectionHead] = useState('');
  const [editManager, setEditManager] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.costCenters && data.costCenters.length > 0) {
          // Normalize data to ensure all fields exist
          const normalized = data.costCenters.map((cc: any) => {
            const existingMeta = defaultCostCenters.find(d => d.code === cc.code);
            return {
              code: cc.code,
              department: cc.department,
              sectionHead: cc.sectionHead || existingMeta?.sectionHead || '-',
              manager: cc.manager || existingMeta?.manager || '-',
              isCustom: !existingMeta
            };
          });
          setCostCenters(normalized.sort((a: any, b: any) => a.code.localeCompare(b.code)));
        } else {
          setCostCenters(defaultCostCenters);
        }
      } else {
        setCostCenters(defaultCostCenters);
      }
      setLoading(false);
    });

    return () => unsub();
  }, []);

  const handleOpenEdit = (item: any) => {
    setEditingItem(item);
    setEditSectionHead(item.sectionHead === '-' ? '' : item.sectionHead);
    setEditManager(item.manager === '-' ? '' : item.manager);
  };

  const handleSaveEdit = async () => {
    if (!editingItem) return;
    setIsSaving(true);

    try {
      const settingsRef = doc(db, 'settings', 'general');
      // Create a copy of current list to update
      const updatedList = costCenters.map(cc => 
        cc.code === editingItem.code 
          ? { ...cc, sectionHead: editSectionHead, manager: editManager } 
          : { code: cc.code, department: cc.department, sectionHead: cc.sectionHead, manager: cc.manager }
      );

      await updateDoc(settingsRef, { costCenters: updatedList });
      toast({ title: 'Berhasil Diperbarui', description: `Penanggung jawab untuk ${editingItem.code} telah diupdate.` });
      setEditingItem(null);
    } catch (error) {
      console.error("Error saving metadata:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 pb-24 animate-in fade-in duration-700">
        <div className="flex items-center gap-3 px-1">
          <div className="p-3 bg-primary/10 rounded-2xl">
            <Coins className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight">Pusat Biaya (Cost Center)</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Daftar pemetaan kode akuntansi per departemen.</p>
          </div>
        </div>

        <Card className="rounded-[2rem] border-none shadow-xl overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
          <CardHeader className="p-8 pb-4">
            <CardTitle className="text-lg font-black uppercase tracking-tight flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-500" />
              Data Terverifikasi Sistem
            </CardTitle>
            <CardDescription className="text-xs font-medium uppercase tracking-widest">
              Gunakan kode-kode di bawah ini untuk pengisian kolom Cost Center pada formulir aset.
            </CardDescription>
          </CardHeader>
          <CardContent className="p-0 sm:p-8 sm:pt-4">
            <div className="border rounded-2xl overflow-hidden shadow-inner bg-white dark:bg-slate-950">
              <Table>
                <TableHeader className="bg-slate-50 dark:bg-slate-900">
                  <TableRow className="h-14">
                    <TableHead className="w-[120px] text-center uppercase text-[10px] font-black tracking-widest">Kode</TableHead>
                    <TableHead className="text-center uppercase text-[10px] font-black tracking-widest">Departemen</TableHead>
                    <TableHead className="text-center uppercase text-[10px] font-black tracking-widest">Section Head</TableHead>
                    <TableHead className="text-center uppercase text-[10px] font-black tracking-widest">Manager</TableHead>
                    {isAdmin && <TableHead className="w-[80px] text-center uppercase text-[10px] font-black tracking-widest">Aksi</TableHead>}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    Array.from({ length: 10 }).map((_, i) => (
                      <TableRow key={i}>
                        <TableCell colSpan={isAdmin ? 5 : 4} className="p-4"><Skeleton className="h-8 w-full rounded-xl" /></TableCell>
                      </TableRow>
                    ))
                  ) : costCenters.map((item) => (
                    <TableRow key={item.code} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                      <TableCell className="font-black font-mono text-center text-primary text-sm">
                        <div className="flex flex-col items-center gap-1">
                          {item.code}
                          {item.isCustom && <Badge variant="outline" className="text-[7px] h-3 px-1.5 font-black uppercase">Custom</Badge>}
                        </div>
                      </TableCell>
                      <TableCell className="text-center font-bold text-slate-700 dark:text-slate-300 uppercase text-xs">{item.department}</TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground text-xs">{item.sectionHead}</TableCell>
                      <TableCell className="text-center font-medium text-muted-foreground text-xs">{item.manager}</TableCell>
                      {isAdmin && (
                        <TableCell className="text-center">
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            className="h-8 w-8 rounded-lg text-slate-400 hover:text-primary hover:bg-primary/5 opacity-0 group-hover:opacity-100 transition-all"
                            onClick={() => handleOpenEdit(item)}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
          <CardFooter className="p-8 bg-slate-50/50 dark:bg-slate-900/50 border-t flex items-center gap-2">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Data ini disinkronkan langsung dari menu Pengaturan Sistem oleh Administrator.</p>
          </CardFooter>
        </Card>
      </div>

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingItem} onOpenChange={(open) => !open && setEditingItem(null)}>
        <DialogContent className="sm:max-w-md rounded-[2rem] border-none shadow-2xl p-0 overflow-hidden">
          <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-primary/20 rounded-2xl mb-2">
              <UserCheck className="h-8 w-8 text-primary" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">Edit Penanggung Jawab</DialogTitle>
            <DialogDescription className="text-white/60 font-medium">
              Update Section Head dan Manager untuk Cost Center <b>{editingItem?.code}</b>
            </DialogDescription>
          </div>
          
          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <UserCheck className="h-3 w-3" /> Section Head
              </Label>
              <Input 
                value={editSectionHead}
                onChange={(e) => setEditSectionHead(e.target.value)}
                placeholder="Masukkan nama Section Head..."
                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
              />
            </div>

            <div className="space-y-2">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2">
                <Briefcase className="h-3 w-3" /> Manager
              </Label>
              <Input 
                value={editManager}
                onChange={(e) => setEditManager(e.target.value)}
                placeholder="Masukkan nama Manager..."
                className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold"
              />
            </div>
          </div>

          <DialogFooter className="p-6 bg-slate-50 dark:bg-slate-900/50 border-t flex gap-2">
            <DialogClose asChild>
              <Button variant="ghost" disabled={isSaving} className="rounded-xl h-12 font-bold">Batal</Button>
            </DialogClose>
            <Button 
              onClick={handleSaveEdit} 
              disabled={isSaving}
              className="flex-1 rounded-xl h-12 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl shadow-primary/20"
            >
              {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Simpan Perubahan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
