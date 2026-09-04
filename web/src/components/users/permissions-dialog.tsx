'use client';

import { useState, useEffect } from 'react';
import { type User, type UserPermissions } from '@/lib/types';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, ShieldCheck, UserCheck, Lock, Layout, Building } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface PermissionsDialogProps {
  user: User;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
}

const allPages = [
  { label: 'Dashboard', href: '/' },
  { label: 'Pengumuman', href: '/announcements' },
  { label: 'Aset', href: '/assets' },
  { label: 'Laporan Aset', href: '/assets/report' },
  { label: 'Aset IT', href: '/computer-details' },
  { label: 'ISO 14064 (Emisi)', href: '/iso-14064' },
  { label: 'Audit Aset Umum', href: '/audit-asset' },
  { label: 'Maintenance & Audit', href: '/maintenance' },
  { label: 'Inventaris', href: '/inventory' },
  { label: 'Permintaan Barang', href: '/inventory/requests' },
  { label: 'Mutasi & Disposal', href: '/mutations' },
  { label: 'Broadcast Email', href: '/broadcast-email' },
  { label: 'IT Helpdesk', href: '/helpdesk' },
  { label: 'Laporan Stok', href: '/inventory/report' },
  { label: 'Kategori', href: '/kategori' },
  { label: 'Cost Center', href: '/cost-center' },
  { label: 'Scan QR', href: '/scan' },
  { label: 'Pratinjau Form', href: '/preview-forms' },
  { label: 'Form IT Problem', href: '/it-problem-form' },
  { label: 'Stempel', href: '/stamps' },
  { label: 'Thermal Print', href: '/thermal-print-58' },
];

const actionPermissions: { key: keyof UserPermissions; label: string }[] = [
  { key: 'canAddAsset', label: 'Bisa Tambah Aset' },
  { key: 'canEditAsset', label: 'Bisa Edit Aset' },
  { key: 'canDeleteAsset', label: 'Bisa Hapus Aset' },
  { key: 'canRequestMutation', label: 'Bisa Ajukan Mutasi/Disposal' },
  { key: 'canApproveMutation', label: 'Bisa Menyetujui Pengajuan' },
  { key: 'canManageInventory', label: 'Bisa Kelola Stok Inventaris' },
  { key: 'canDeleteInventory', label: 'Bisa Hapus Inventaris' },
  { key: 'canManageIT', label: 'Bisa Kelola Spesifikasi IT' },
  { key: 'canManageUsers', label: 'Bisa Kelola Pengguna' },
  { key: 'canAccessSettings', label: 'Bisa Akses Pengaturan Sistem' },
  { key: 'canManageMaintenanceEvidence', label: 'Bisa Kelola Bukti Maintenance' },
  { key: 'canManageMaintenanceSignature', label: 'Bisa Tanda Tangan Maintenance' },
  { key: 'canEditMaintenance', label: 'Bisa Edit Jadwal Maintenance' },
  { key: 'canDeleteMaintenance', label: 'Bisa Hapus Jadwal Maintenance' },
  { key: 'canAccessAllAssetsInMaintenance', label: 'Akses Semua Aset (Seluruh Perusahaan) di Maintenance' },
  { key: 'canAccessPartialAssetsInMaintenance', label: 'Akses Sebagian Aset (Pilih Unit Lain) di Maintenance' },
  { key: 'canViewTimeline', label: 'Bisa Lihat Timeline Aktivitas Dashboard' },
  { key: 'canAccessRegisterDesign', label: 'Bisa Akses Register Design' },
];

export default function PermissionsDialog({ user, isOpen, onOpenChange }: PermissionsDialogProps) {
  const [selectedPages, setSelectedPages] = useState<string[]>(user.allowedPages || []);
  const [selectedDepts, setSelectedDepts] = useState<string[]>(user.allowedDepartments || []);
  const [permissions, setPermissions] = useState<UserPermissions>(user.permissions || {});
  const [isSaving, setIsUpdating] = useState(false);
  const [availableDepts, setAvailableDepts] = useState<string[]>([]);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().departments) {
            setAvailableDepts(snap.data().departments.sort());
        }
    });
    return () => unsub();
  }, []);

  const handleTogglePage = (href: string, checked: boolean) => {
    setSelectedPages(prev => 
      checked ? [...prev, href] : prev.filter(p => p !== href)
    );
  };

  const handleToggleDept = (dept: string, checked: boolean) => {
    setSelectedDepts(prev => 
      checked ? [...prev, dept] : prev.filter(d => d !== dept)
    );
  };

  const handleTogglePermission = (key: keyof UserPermissions, checked: boolean) => {
    setPermissions(prev => ({
      ...prev,
      [key]: checked
    }));
  };

  const handleSave = async () => {
    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { 
        allowedPages: selectedPages,
        allowedDepartments: selectedDepts,
        permissions: permissions
      });
      toast({
        title: 'Berhasil',
        description: `Hak akses untuk ${user.displayName || user.name} telah diperbarui.`,
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Error updating permissions:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Terjadi kesalahan saat memperbarui hak akses.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-2xl rounded-3xl text-black">
        <DialogHeader className="p-6 bg-slate-900 text-white border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/20 rounded-xl">
              <ShieldCheck className="h-6 w-6 text-primary" />
            </div>
            <div className="text-left">
              <DialogTitle className="text-xl font-black uppercase tracking-tight">Kontrol Akses Granular</DialogTitle>
              <DialogDescription className="text-white/60 font-medium">
                Sesuaikan izin halaman, unit, dan aksi untuk <b>{user.displayName || user.name}</b>.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>
        
        <Tabs defaultValue="pages" className="w-full text-black">
          <div className="px-6 pt-4">
            <TabsList className="grid w-full grid-cols-3 bg-slate-100 rounded-xl h-11 p-1">
              <TabsTrigger value="pages" className="rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Layout className="w-3.5 h-3.5" /> Halaman
              </TabsTrigger>
              <TabsTrigger value="depts" className="rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Building className="w-3.5 h-3.5" /> Akses Unit
              </TabsTrigger>
              <TabsTrigger value="actions" className="rounded-lg font-bold text-[10px] uppercase tracking-widest flex items-center gap-2">
                <Lock className="w-3.5 h-3.5" /> Aksi
              </TabsTrigger>
            </TabsList>
          </div>

          <div className="p-6">
            <TabsContent value="pages" className="mt-0 outline-none">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Akses Navigasi</span>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPages(allPages.map(p => p.href))} className="h-6 px-2 text-[9px] font-bold uppercase">Semua</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedPages(['/'])} className="h-6 px-2 text-[9px] font-bold uppercase text-rose-600">Reset</Button>
                </div>
              </div>
              <ScrollArea className="h-[350px] pr-4 border rounded-2xl bg-slate-50/50">
                <div className="p-4 grid grid-cols-1 gap-2">
                  {allPages.map((page) => (
                    <div key={page.href} className="flex items-center space-x-3 p-2 rounded-xl hover:bg-white transition-colors border border-transparent hover:border-slate-100">
                      <Checkbox
                        id={`page-${page.href}`}
                        checked={selectedPages.includes(page.href)}
                        onCheckedChange={(checked) => handleTogglePage(page.href, !!checked)}
                        className="h-5 w-5 rounded-lg border-primary/30"
                      />
                      <Label htmlFor={`page-${page.href}`} className="text-xs font-bold text-slate-700 cursor-pointer flex-1 text-left">
                        {page.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="depts" className="mt-0 outline-none">
              <div className="flex justify-between items-center mb-4 text-left">
                <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest block text-left">Visibilitas Departemen</span>
                    <p className="text-[9px] text-primary font-bold uppercase mt-1 text-left">User dapat melihat data aset di unit terpilih</p>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDepts([...availableDepts])} className="h-6 px-2 text-[9px] font-bold uppercase">Pilih Semua</Button>
                  <Button variant="ghost" size="sm" onClick={() => setSelectedDepts([])} className="h-6 px-2 text-[9px] font-bold uppercase text-rose-600">Kosongkan</Button>
                </div>
              </div>
              <ScrollArea className="h-[350px] pr-4 border rounded-2xl bg-slate-50/50 shadow-inner">
                <div className="p-4 grid grid-cols-1 gap-2">
                  {availableDepts.length > 0 ? availableDepts.map((dept) => (
                    <div key={dept} className="flex items-center space-x-3 p-2.5 rounded-xl bg-white border border-slate-100 shadow-sm transition-all hover:border-primary/30">
                      <Checkbox
                        id={`dept-${dept}`}
                        checked={selectedDepts.includes(dept)}
                        onCheckedChange={(checked) => handleToggleDept(dept, !!checked)}
                        className="h-5 w-5 rounded-lg border-primary/30"
                      />
                      <Label htmlFor={`dept-${dept}`} className="text-xs font-black text-slate-900 cursor-pointer flex-1 uppercase tracking-tight text-left">
                        {dept}
                      </Label>
                    </div>
                  )) : (
                      <div className="py-20 text-center opacity-30 italic text-xs uppercase font-bold">Memuat daftar unit...</div>
                  )}
                </div>
              </ScrollArea>
            </TabsContent>

            <TabsContent value="actions" className="mt-0 outline-none">
              <div className="flex justify-between items-center mb-4">
                <span className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Izin Pengoperasian Sistem</span>
              </div>
              <ScrollArea className="h-[350px] pr-4 border rounded-2xl bg-slate-50/50">
                <div className="p-4 grid grid-cols-1 gap-3">
                  {actionPermissions.map((action) => (
                    <div key={action.key} className="flex items-center space-x-3 p-3 rounded-xl bg-white border border-slate-100 shadow-sm">
                      <Checkbox
                        id={`perm-${action.key}`}
                        checked={!!permissions[action.key]}
                        onCheckedChange={(checked) => handleTogglePermission(action.key, !!checked)}
                        className="h-5 w-5 rounded-lg border-primary/30"
                      />
                      <Label htmlFor={`perm-${action.key}`} className="text-xs font-black text-slate-800 cursor-pointer flex-1 uppercase tracking-tight text-left">
                        {action.label}
                      </Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="p-6 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
          <DialogClose asChild>
            <Button variant="ghost" disabled={isSaving} className="rounded-xl font-bold">Batal</Button>
          </DialogClose>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl px-10 h-12 bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 font-black uppercase tracking-widest text-white">
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
            Terapkan Akses
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
