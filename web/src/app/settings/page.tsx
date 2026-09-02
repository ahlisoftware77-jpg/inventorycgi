
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc, setDoc, onSnapshot, getDocs, collection } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { 
  Loader2, Save, Settings2, AppWindow, FileText, Sparkles, Activity, Zap, 
  Building2, Plus, Trash2, CheckCircle2, X, Layers, Hash, Info, 
  ShieldCheck, Tags, Clock, Shield, Crown, Edit, ListTree, Coins,
  ClipboardList, Stethoscope, AlertTriangle, Maximize, GripVertical,
  LayoutGrid, Settings, Menu, Users2, ShieldAlert
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import { Slider } from '@/components/ui/slider';
import { useFontSize } from '@/components/providers/font-size-provider';
import { Reorder } from 'framer-motion';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { DeptGroup } from '@/lib/types';

interface CategoryObject {
  name: string;
  lifetime: number;
  series: string;
}

interface CostCenterObject {
  code: string;
  department: string;
  sectionHead?: string;
  manager?: string;
}

interface MenuItem {
  id: string;
  label: string;
}

const defaultAssetStatuses = ['Aktif', 'Dipinjam', 'Rusak', 'Dihapus', 'Dipindah-Aktif', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Other', 'Bukan_Asset_Perusahaan'];
const defaultAssetConditions = ['Baru', 'Baik', 'Perlu Perbaikan', 'Sedang Dalam Perbaikan', 'Rusak', 'Tidak Terpakai', 'Upgrade', 'Sold'];

const ALL_MAIN_MENU_ITEMS: MenuItem[] = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'workflow', label: 'Alur Sistem' },
  { id: 'announcements', label: 'Pengumuman' },
  { id: 'assets_a', label: 'Aset Utama' },
  { id: 'assets_util', label: 'Utilitas & Fasilitas' },
  { id: 'assets_report', label: 'Laporan Aset' },
  { id: 'assets_it', label: 'Aset IT' },
  { id: 'iso', label: 'ISO 14064 (Emisi)' },
  { id: 'maintenance', label: 'Maintenance & Audit' },
  { id: 'helpdesk', label: 'IT Helpdesk' },
  { id: 'inventory', label: 'Inventaris' },
  { id: 'inventory_requests', label: 'Permintaan Barang' },
  { id: 'mutations', label: 'Mutasi & Disposal' },
  { id: 'inventory_report', label: 'Laporan Stok' },
  { id: 'logs', label: 'Log Aktivitas' },
  { id: 'form_app', label: 'Form APP (DAR)' },
];

const ALL_SYSTEM_MENU_ITEMS: MenuItem[] = [
  { id: 'users', label: 'Manajemen User' },
  { id: 'kategori', label: 'Kategori' },
  { id: 'cost_center', label: 'Cost Center' },
  { id: 'scan_qr', label: 'Scan QR' },
  { id: 'scan_nfc', label: 'Scan NFC' },
  { id: 'preview_forms', label: 'Pratinjau Form' },
  { id: 'it_problem', label: 'Form IT Problem' },
  { id: 'compare', label: 'Compare Data' },
  { id: 'stamps', label: 'Stempel' },
  { id: 'thermal', label: 'Thermal Print' },
  { id: 'recycle', label: 'Tempat Sampah' },
  { id: 'settings', label: 'Pengaturan' },
  { id: 'backup', label: 'Backup & Restore' },
  { id: 'roles', label: 'Hak Akses' },
  { id: 'help', label: 'Bantuan' },
];

export default function SettingsPage() {
  const { fontScale, setFontScale } = useFontSize();
  const [marqueeText, setMarqueeText] = useState('');
  const [marqueeEffect, setMarqueeEffect] = useState('classic');
  const [marqueeBehavior, setMarqueeBehavior] = useState('scroll');
  const [marqueeSpeed, setMarqueeSpeed] = useState('normal');
  
  const [appVersion, setAppVersion] = useState('1.0');
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  const [publicFooter, setPublicFooter] = useState('© 2026 PT. China Glaze Indonesia. Seluruh hak cipta dilindungi undang-undang.');
  const [geminiApiKey, setGeminiApiKey] = useState('');
  
  const [departments, setDepartments] = useState<string[]>([]);
  const [categories, setCategories] = useState<CategoryObject[]>([]);
  const [seriesList, setSeriesList] = useState<string[]>(['Seri A', 'Seri B', 'Fasilitas']);
  const [costCenters, setCostCenters] = useState<CostCenterObject[]>([]);
  const [deptGroups, setDeptGroups] = useState<DeptGroup[]>([]);
  const [secondCheckerDepts, setSecondCheckerDepts] = useState<string[]>([]);
  const [formAppUsers, setFormAppUsers] = useState<string[]>([]);
  const [allUsersList, setAllUsersList] = useState<{uid: string, name: string}[]>([]);
  const [assetStatuses, setAssetStatuses] = useState<string[]>(defaultAssetStatuses);
  const [assetConditions, setAssetConditions] = useState<string[]>(defaultAssetConditions);
  
  const [mainMenuOrder, setMainMenuOrder] = useState<MenuItem[]>(ALL_MAIN_MENU_ITEMS);
  const [systemMenuOrder, setSystemMenuOrder] = useState<MenuItem[]>(ALL_SYSTEM_MENU_ITEMS);

  const [categoryLabels, setCategoryLabels] = useState<Record<string, string[]>>({});
  const [selectedCategoryForLabels, setSelectedCategoryForLabels] = useState<string>('');
  const [tempLabels, setTempLabels] = useState<string[]>(['', '', '', '']);

  const [newDept, setNewDept] = useState('');
  const [newSeries, setNewSeriesName] = useState('');
  const [newCatName, setNewCatName] = useState('');
  const [newCatLifetime, setNewCatLifetime] = useState<number>(5);
  const [newCatSeries, setNewCatSeries] = useState<string>('Seri B');

  const [newCCCode, setNewCCCode] = useState('');
  const [newCCDept, setNewCCDept] = useState('');
  
  const [newStatus, setNewStatus] = useState('');
  const [newCondition, setNewCondition] = useState('');

  // Dept Group Dialog States
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<DeptGroup | null>(null);
  const [groupName, setGroupName] = useState('');
  const [groupDepts, setGroupDepts] = useState<string[]>([]);

  const [editingCat, setEditingCat] = useState<CategoryObject | null>(null);
  const [editLifetime, setEditLifetime] = useState<number>(5);
  const [editSeries, setEditSeries] = useState<string>('');

  const [editingCC, setEditingCC] = useState<CostCenterObject | null>(null);
  const [editCCCode, setEditCCCode] = useState('');
  const [editCCDept, setEditCCDept] = useState('');

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const defaultDepts = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];

  useEffect(() => {
    if (!authLoading && user?.role !== 'Admin') {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
      });
      router.push('/');
    }
  }, [user, authLoading, router, toast]);

  useEffect(() => {
    if (user?.role === 'Admin') {
      const fetchSettings = async () => {
        setIsLoading(true);
        try {
          const marqueeSnap = await getDoc(doc(db, 'settings', 'marquee'));
          if (marqueeSnap.exists()) {
            const data = marqueeSnap.data();
            setMarqueeText(data.text || '');
            setMarqueeEffect(data.effect || 'classic');
            setMarqueeBehavior(data.behavior || 'scroll');
            setMarqueeSpeed(data.speed || 'normal');
          }

          const generalSnap = await getDoc(doc(db, 'settings', 'general'));
          
          try {
            const usersSnap = await getDocs(collection(db, 'users'));
            const uList = usersSnap.docs.map(d => ({ uid: d.id, name: d.data().name || d.data().email }));
            setAllUsersList(uList);
          } catch(e) {}

          if (generalSnap.exists()) {
            const data = generalSnap.data();
            setAppVersion(data.appVersion || '1.0');
            setCompanyName(data.companyName || 'PT. CHINA GLAZE INDONESIA');
            setPublicFooter(data.publicFooter || '© 2026 PT. China Glaze Indonesia. Seluruh hak cipta dilindungi undang-undang.');
            setGeminiApiKey(data.geminiApiKey || '');
            setDepartments(data.departments || defaultDepts);
            setSeriesList(data.seriesList || ['Seri A', 'Seri B', 'Fasilitas']);
            setCostCenters(data.costCenters || []);
            setDeptGroups(data.deptGroups || []);
            setSecondCheckerDepts(data.secondCheckerDepts || []);
            setFormAppUsers(data.formAppUsers || []);
            setAssetStatuses(data.assetStatuses || defaultAssetStatuses);
            setAssetConditions(data.assetConditions || defaultAssetConditions);
            
            if (data.categories) {
                const normalized = data.categories.map((c: any) => {
                    if (typeof c === 'string') {
                      let series = 'Seri B';
                      if (c.startsWith('A')) series = 'Seri A';
                      return { name: c, lifetime: 5, series };
                    }
                    return {
                      name: c.name,
                      lifetime: c.lifetime || 5,
                      series: c.series || (c.name.startsWith('A') ? 'Seri A' : 'Seri B')
                    } as CategoryObject;
                });
                setCategories(normalized);
            }
            
            if (data.mainMenuOrder && Array.isArray(data.mainMenuOrder)) {
              const existingOrder = data.mainMenuOrder as string[];
              const ordered = ALL_MAIN_MENU_ITEMS
                .filter(item => existingOrder.includes(item.id))
                .sort((a, b) => existingOrder.indexOf(a.id) - existingOrder.indexOf(b.id));
              
              const newItems = ALL_MAIN_MENU_ITEMS.filter(item => !existingOrder.includes(item.id));
              setMainMenuOrder([...ordered, ...newItems]);
            }

            if (data.systemMenuOrder && Array.isArray(data.systemMenuOrder)) {
              const existingOrder = data.systemMenuOrder as string[];
              const ordered = ALL_SYSTEM_MENU_ITEMS
                .filter(item => existingOrder.includes(item.id))
                .sort((a, b) => existingOrder.indexOf(a.id) - existingOrder.indexOf(b.id));
              
              const newItems = ALL_SYSTEM_MENU_ITEMS.filter(item => !existingOrder.includes(item.id));
              setSystemMenuOrder([...ordered, ...newItems]);
            }

            setCategoryLabels(data.categoryLabels || {});
          } else {
            setDepartments(defaultDepts);
            setAssetStatuses(defaultAssetStatuses);
            setAssetConditions(defaultAssetConditions);
          }
        } catch (error) {
          console.error("Error fetching settings:", error);
        } finally {
          setIsLoading(false);
        }
      };
      fetchSettings();
    }
  }, [user]);

  useEffect(() => {
    if (selectedCategoryForLabels) {
        setTempLabels(categoryLabels[selectedCategoryForLabels] || ['', '', '', '']);
    }
  }, [selectedCategoryForLabels, categoryLabels]);

  const handleSaveMarquee = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'marquee'), { 
        text: marqueeText,
        effect: marqueeEffect,
        behavior: marqueeBehavior,
        speed: marqueeSpeed
      }, { merge: true });
      toast({ title: 'Berhasil Disimpan', description: 'Pengaturan teks berjalan telah diperbarui.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveGeneral = async () => {
    setIsSaving(true);
    try {
      await setDoc(doc(db, 'settings', 'general'), { 
        appVersion, 
        companyName,
        publicFooter,
        departments,
        categories,
        seriesList,
        costCenters,
        deptGroups,
        secondCheckerDepts,
        categoryLabels,
        assetStatuses,
        assetConditions,
        formAppUsers,
        geminiApiKey,
        mainMenuOrder: mainMenuOrder.map(m => m.id),
        systemMenuOrder: systemMenuOrder.map(m => m.id),
      }, { merge: true });
      toast({ title: 'Berhasil Disimpan', description: 'Seluruh konfigurasi database telah diperbarui.' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveCategoryLabels = () => {
    if (!selectedCategoryForLabels) return;
    setCategoryLabels(prev => ({
        ...prev,
        [selectedCategoryForLabels]: tempLabels
    }));
    toast({ title: 'Label Diperbarui', description: `Label teknis kategori ${selectedCategoryForLabels} telah disiapkan.` });
  };

  const handleAddDept = () => {
    const trimmed = newDept.trim().toUpperCase();
    if (!trimmed || departments.includes(trimmed)) return;
    setDepartments([...departments, trimmed]);
    setNewDept('');
  };

  const handleRemoveDept = (deptToRemove: string) => {
    setDepartments(departments.filter(d => d !== deptToRemove));
  };

  const handleAddSeries = () => {
    const trimmed = newSeries.trim();
    if (!trimmed || seriesList.includes(trimmed)) return;
    setSeriesList([...seriesList, trimmed]);
    setNewSeriesName('');
  };

  const handleRemoveSeries = (seriesToRemove: string) => {
    if (['Seri A', 'Seri B', 'Fasilitas'].includes(seriesToRemove)) {
        toast({ variant: 'destructive', title: 'Proteksi Sistem', description: 'Seri standar tidak dapat dihapus.' });
        return;
    }
    setSeriesList(seriesList.filter(s => s !== seriesToRemove));
  };

  const handleAddCat = () => {
    const trimmed = newCatName.trim();
    if (!trimmed || categories.some(c => c.name === trimmed)) return;
    setCategories([...categories, { name: trimmed, lifetime: newCatLifetime, series: newCatSeries }]);
    setNewCatName('');
    setNewCatLifetime(5);
  };

  const handleRemoveCat = (catName: string) => {
    setCategories(categories.filter(c => c.name !== catName));
  };

  const handleAddCC = () => {
    const trimmedCode = newCCCode.trim().toUpperCase();
    if (!trimmedCode || !newCCDept || costCenters.some(c => c.code === trimmedCode)) return;
    setCostCenters([...costCenters, { code: trimmedCode, department: newCCDept }]);
    setNewCCCode('');
    setNewCCDept('');
  };

  const handleRemoveCC = (codeToRemove: string) => {
    setCostCenters(costCenters.filter(c => c.code !== codeToRemove));
  };

  // Group Management Functions
  const handleOpenGroupDialog = (group?: DeptGroup) => {
    if (group) {
      setEditingGroup(group);
      setGroupName(group.name);
      setGroupDepts(group.departments);
    } else {
      setEditingGroup(null);
      setGroupName('');
      setGroupDepts([]);
    }
    setIsGroupDialogOpen(true);
  };

  const handleSaveGroup = () => {
    if (!groupName.trim() || groupDepts.length === 0) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap', description: 'Nama grup dan departemen wajib diisi.' });
      return;
    }

    if (editingGroup) {
      setDeptGroups(prev => prev.map(g => g.id === editingGroup.id ? { ...g, name: groupName, departments: groupDepts } : g));
    } else {
      const newGroup: DeptGroup = {
        id: `group-${Date.now()}`,
        name: groupName,
        departments: groupDepts
      };
      setDeptGroups(prev => [...prev, newGroup]);
    }
    setIsGroupDialogOpen(false);
  };

  const handleRemoveGroup = (groupId: string) => {
    setDeptGroups(prev => prev.filter(g => g.id !== groupId));
  };

  const handleAddStatus = () => {
    const trimmed = newStatus.trim();
    if (!trimmed || assetStatuses.includes(trimmed)) return;
    setAssetStatuses([...assetStatuses, trimmed]);
    setNewStatus('');
  };

  const handleRemoveStatus = (statusToRemove: string) => {
    if (statusToRemove.startsWith('waiting_') || statusToRemove.startsWith('approved_')) {
        toast({ variant: 'destructive', title: 'Status Sistem', description: 'Status ini penting untuk alur kerja dan tidak boleh dihapus.' });
        return;
    }
    setAssetStatuses(assetStatuses.filter(s => s !== statusToRemove));
  };

  const handleAddCondition = () => {
    const trimmed = newCondition.trim();
    if (!trimmed || assetConditions.includes(trimmed)) return;
    setAssetConditions([...assetConditions, trimmed]);
    setNewCondition('');
  };

  const handleRemoveCondition = (conditionToRemove: string) => {
    setAssetConditions(assetConditions.filter(c => c !== conditionToRemove));
  };

  const openEditCat = (cat: CategoryObject) => {
    setEditingCat(cat);
    setEditLifetime(cat.lifetime);
    setEditSeries(cat.series);
  };

  const handleSaveEditCat = () => {
    if (!editingCat) return;
    setCategories(prev => prev.map(c => 
      c.name === editingCat.name ? { ...c, lifetime: editLifetime, series: editSeries } : c
    ));
    setEditingCat(null);
  };

  const openEditCC = (cc: CostCenterObject) => {
    setEditingCC(cc);
    setEditCCCode(cc.code);
    setEditCCDept(cc.department);
  };

  const handleSaveEditCC = () => {
    if (!editingCC) return;
    setCostCenters(prev => prev.map(c => 
      c.code === editingCC.code ? { ...c, code: editCCCode, department: editCCDept } : c
    ));
    setEditingCC(null);
  };

  const getSeriesColor = (series: string) => {
    if (series === 'Fasilitas') return 'bg-cyan-50 text-cyan-700 border-cyan-200';
    if (series === 'Seri A') return 'bg-blue-50 text-blue-700 border-blue-200';
    if (series === 'Seri B') return 'bg-amber-50 text-amber-700 border-amber-200';
    return 'bg-purple-50 text-purple-700 border-purple-200';
  };

  if (authLoading || isLoading) {
    return (
        <div className="flex justify-center items-center h-full">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
    );
  }

  return (
    <DashboardLayout>
      <div className="max-w-5xl mx-auto space-y-10 pb-32 text-black">
        <div className="flex items-center gap-3 px-1 text-left">
          <div className="p-3 bg-primary/10 rounded-2xl shadow-inner">
            <Settings2 className="w-6 h-6 text-primary" />
          </div>
          <div className="text-left">
            <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left italic">Pusat Konfigurasi</h1>
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] text-left">Internal Governance & System Parameters</p>
          </div>
        </div>

        
        <Tabs defaultValue="umum" className="w-full space-y-6">
          <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 h-auto p-2 bg-slate-100 dark:bg-slate-800/50 rounded-2xl gap-2">
            <TabsTrigger value="umum" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Umum</TabsTrigger>
            <TabsTrigger value="aset" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Aset & Kategori</TabsTrigger>
            <TabsTrigger value="organisasi" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Organisasi</TabsTrigger>
            <TabsTrigger value="integrasi" className="rounded-xl py-3 text-xs font-black uppercase tracking-widest data-[state=active]:bg-white data-[state=active]:text-primary data-[state=active]:shadow-sm">Integrasi AI</TabsTrigger>
          </TabsList>

          <TabsContent value="umum" className="space-y-10 mt-6">
{/* VIEW ACCESSIBILITY & ZOOM */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/20">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary text-left">
              <Maximize className="w-6 h-6" /> Aksesibilitas & Skala Tampilan
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Sesuaikan ukuran font dan elemen visual untuk kenyamanan pembacaan.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="space-y-6 max-w-xl text-left">
                <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">Zoom Antarmuka</Label>
                    <div className="flex items-center gap-2">
                        <Badge variant="outline" className="font-black text-primary border-primary/20 bg-primary/5">{Math.round(fontScale * 100)}%</Badge>
                        <Button variant="ghost" size="sm" onClick={() => setFontScale(1)} className="h-6 px-2 text-[9px] font-black uppercase text-rose-600">Reset</Button>
                    </div>
                </div>
                <div className="flex items-center gap-6">
                    <span className="text-xs font-bold text-slate-400">80%</span>
                    <Slider 
                        value={[fontScale * 100]} 
                        onValueChange={(val) => setFontScale(val[0] / 100)}
                        min={80}
                        max={150}
                        step={5}
                        className="flex-1"
                    />
                    <span className="text-xs font-bold text-slate-400">150%</span>
                </div>
                <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 flex items-start gap-3">
                    <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                    <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200 font-medium text-left">
                        Pengaturan ini akan memengaruhi ukuran seluruh teks dan komponen di aplikasi. Gunakan zoom lebih besar jika Anda merasa teks terlalu kecil, atau kecilkan untuk melihat lebih banyak data dalam satu layar.
                    </p>
                </div>
            </div>
          </CardContent>
        </Card>

        {/* SIDEBAR MENU MANAGEMENT */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-emerald-500/20">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-emerald-500/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-emerald-600 text-left">
              <Menu className="w-6 h-6" /> Tata Letak Sidebar (Drag & Drop)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Sesuaikan urutan menu navigasi. Tekan dan tahan ikon garis untuk menggeser.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-12">
             <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="p-1.5 bg-emerald-500/10 rounded-lg"><LayoutGrid className="w-4 h-4 text-emerald-600" /></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white">Menu Navigasi Utama</h3>
                    </div>
                    <Reorder.Group 
                        axis="y" 
                        values={mainMenuOrder} 
                        onReorder={setMainMenuOrder}
                        className="space-y-2"
                    >
                        {mainMenuOrder.map((item) => (
                            <Reorder.Item 
                                key={item.id} 
                                value={item}
                                className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing"
                            >
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">{item.label}</span>
                                <Badge variant="outline" className="ml-auto text-[8px] opacity-40 font-mono">{item.id}</Badge>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </div>

                <div className="space-y-6">
                    <div className="flex items-center gap-2 mb-2 px-1">
                        <div className="p-1.5 bg-slate-900 text-white rounded-lg"><Settings className="w-4 h-4" /></div>
                        <h3 className="font-black text-xs uppercase tracking-widest text-slate-900 dark:text-white">Menu Sistem & Tooling</h3>
                    </div>
                    <Reorder.Group 
                        axis="y" 
                        values={systemMenuOrder} 
                        onReorder={setSystemMenuOrder}
                        className="space-y-2"
                    >
                        {systemMenuOrder.map((item) => (
                            <Reorder.Item 
                                key={item.id} 
                                value={item}
                                className="flex items-center gap-3 p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm hover:shadow-md active:scale-[0.98] transition-all cursor-grab active:cursor-grabbing"
                            >
                                <GripVertical className="w-4 h-4 text-slate-300" />
                                <span className="text-[10px] font-black uppercase tracking-tight text-slate-700 dark:text-slate-200">{item.label}</span>
                                <Badge variant="outline" className="ml-auto text-[8px] opacity-40 font-mono">{item.id}</Badge>
                            </Reorder.Item>
                        ))}
                    </Reorder.Group>
                </div>
             </div>
          </CardContent>
        </Card>

        {/* GENERAL SETTINGS */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <AppWindow className="w-6 h-6 text-primary" /> Identitas Aplikasi
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Informasi dasar entitas korporat dan versi perangkat lunak.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="grid gap-8 sm:grid-cols-2">
              <div className="space-y-2 text-left">
                <Label htmlFor="company-name" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Perusahaan Resmi</Label>
                <Input
                  id="company-name"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g., PT. Nama Perusahaan"
                  className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-base"
                />
              </div>
              <div className="space-y-2 text-left">
                <Label htmlFor="app-version" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Versi Sistem</Label>
                <Input
                  id="app-version"
                  value={appVersion}
                  onChange={(e) => setAppVersion(e.target.value)}
                  placeholder="e.g., 1.0.5"
                  className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-base"
                />
              </div>
            </div>
            <div className="space-y-2 text-left">
              <Label htmlFor="public-footer" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">Footer Dokumen Publik (Copyright)</Label>
              <Textarea
                id="public-footer"
                value={publicFooter}
                onChange={(e) => setPublicFooter(e.target.value)}
                placeholder="Teks footer untuk halaman verifikasi..."
                className="min-h-[100px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner resize-none font-medium text-sm leading-relaxed"
              />
            </div>
          </CardContent>
        </Card>

        {/* MARQUEE SETTINGS */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 pb-4 bg-slate-900 text-white border-b text-left">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-left">
              <FileText className="w-6 h-6 text-primary" /> Pengumuman Berjalan (Marquee)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-white/40 text-left">Visualisasi informasi digital pada bagian atas layar.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="space-y-2 text-left">
              <Label htmlFor="marquee-text" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pesan Pengumuman</Label>
              <Textarea
                id="marquee-text"
                placeholder="Masukkan pesan pengumuman..."
                value={marqueeText}
                onChange={(e) => setMarqueeText(e.target.value)}
                className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm leading-relaxed text-black"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="space-y-3 text-left">
                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        <Zap className="w-3.5 h-3.5 text-primary" /> Gaya Visual
                    </Label>
                    <Select value={marqueeEffect} onValueChange={setMarqueeEffect}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-sm font-bold text-black text-left">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="classic">Modern Classic</SelectItem>
                            <SelectItem value="gradient">Vibrant Gradient</SelectItem>
                            <SelectItem value="neon">Neon Glow</SelectItem>
                            <SelectItem value="glass">Glass Reflection</SelectItem>
                            <SelectItem value="cyber">Cyberpunk</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3 text-left">
                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">
                        <Activity className="w-3.5 h-3.5 text-primary" /> Tipe Pergerakan
                    </Label>
                    <Select value={marqueeBehavior} onValueChange={setMarqueeBehavior}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-sm font-bold text-black text-left">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="scroll">Scroll (Linear)</SelectItem>
                            <SelectItem value="fixed">Fixed (Statis)</SelectItem>
                            <SelectItem value="bounce">Bounce (Memantul)</SelectItem>
                            <SelectItem value="fade">Fade In-Out</SelectItem>
                            <SelectItem value="typewriter">Typewriter</SelectItem>
                            <SelectItem value="blink">Blinking</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="space-y-3 text-left">
                    <Label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 text-left">
                        <Activity className="w-3.5 h-3.5 text-primary" /> Kecepatan
                    </Label>
                    <Select value={marqueeSpeed} onValueChange={setMarqueeSpeed} disabled={['fixed', 'typewriter'].includes(marqueeBehavior)}>
                        <SelectTrigger className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-sm font-bold text-black text-left">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl">
                            <SelectItem value="slow">Slow</SelectItem>
                            <SelectItem value="normal">Normal</SelectItem>
                            <SelectItem value="fast">Fast</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
                <Button onClick={handleSaveMarquee} disabled={isSaving} className="rounded-xl px-12 h-14 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-2xl transition-all active:scale-95">
                {isSaving ? <Loader2 className="mr-2 h-5 w-5 animate-spin" /> : <Sparkles className="mr-2 h-5 w-5 text-primary" />}
                Terapkan Visual
                </Button>
            </div>
          </CardContent>
        </Card>
      
          </TabsContent>

          <TabsContent value="aset" className="space-y-10 mt-6">
{/* SERIES MANAGEMENT */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <ListTree className="w-6 h-6 text-primary" /> Manajemen Identitas Seri
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Definisikan grup klasifikasi utama (Seri A, B, dsb) secara dinamis.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Identitas Seri Baru</p>
                <div className="flex gap-4">
                    <Input 
                        placeholder="e.g., Seri C, Peralatan IT, Asset Proyek..." 
                        value={newSeries} 
                        onChange={(e) => setNewSeriesName(e.target.value)}
                        className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold text-base"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddSeries()}
                    />
                    <Button onClick={handleAddSeries} className="h-12 w-12 rounded-xl bg-primary shadow-lg shadow-primary/20 p-0 text-white">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest w-[80px]">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Label Identitas Seri</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {seriesList.sort().map((s, idx) => (
                            <TableRow key={s} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 text-xs font-black text-slate-400">{idx + 1}</TableCell>
                                <TableCell className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight drop-shadow-sm text-left">{s}</TableCell>
                                <TableCell className="text-right pr-10">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleRemoveSeries(s)}
                                        className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* CATEGORY & SERIES CLASSIFICATION TABLE */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-6 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <div className="flex items-center justify-between gap-4">
                <div className="text-left">
                    <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
                    <Layers className="w-6 h-6 text-primary" /> Klasifikasi Seri & Kategori
                    </CardTitle>
                    <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Manajemen pengelompokan aset dan standar durasi masa manfaat.</CardDescription>
                </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Klasifikasi Baru</p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 text-left">
                        <Input 
                            placeholder="Nama Kategori (contoh: A3-Peralatan Mesin)..." 
                            value={newCatName} 
                            onChange={(e) => setNewCatName(e.target.value)}
                            className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold"
                            onKeyDown={(e) => e.key === 'Enter' && handleAddCat()}
                        />
                    </div>
                    <div className="md:col-span-3 text-left">
                        <Select value={newCatSeries} onValueChange={setNewCatSeries}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-bold text-black">
                                <SelectValue placeholder="Pilih Seri" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {seriesList.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2 text-left">
                        <div className="relative">
                            <Input 
                                type="number"
                                placeholder="Ketahanan..." 
                                value={newCatLifetime} 
                                onChange={(e) => setNewCatLifetime(Number(e.target.value))}
                                className="h-12 pl-4 pr-12 rounded-xl bg-white dark:bg-slate-950 border-slate-200 shadow-sm font-black text-center text-black"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[9px] font-black uppercase text-muted-foreground">Thn</span>
                        </div>
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleAddCat} className="h-12 w-full rounded-xl bg-slate-900 hover:bg-black shadow-lg text-white font-black uppercase text-xs">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border rounded-[2rem] overflow-hidden shadow-inner bg-white dark:bg-slate-950">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest w-[80px]">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Nama Klasifikasi (Kategori)</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Identitas Seri</TableHead>
                            <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Masa Pakai</TableHead>
                            <TableHead className="text-right pr-8 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {categories.sort((a,b) => a.name.localeCompare(b.name)).map((cat, idx) => {
                            const colorClass = getSeriesColor(cat.series);
                            return (
                                <TableRow key={cat.name} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors border-slate-50 dark:border-slate-800 group">
                                    <TableCell className="pl-8 text-xs font-black text-slate-400">{idx + 1}</TableCell>
                                    <TableCell className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight truncate max-w-[250px] drop-shadow-sm text-left">{cat.name}</TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="outline" className={cn("rounded-lg font-black text-[9px] uppercase tracking-tighter border-none ring-1 ring-inset px-4", colorClass)}>
                                            {cat.series}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-center">
                                        <Badge variant="secondary" className="font-black text-[10px] bg-slate-100 text-slate-600 border-none px-3">
                                            {cat.lifetime} TAHUN
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right pr-8">
                                        <div className="flex justify-end gap-2">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                onClick={() => openEditCat(cat)}
                                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100"
                                            >
                                                <Edit className="h-4 w-4" />
                                            </Button>
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-lg text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                                onClick={() => handleRemoveCat(cat.name)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* STATUS ASET MANAGEMENT */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <Activity className="w-6 h-6 text-primary" /> Manajemen Status Aset
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Kelola label status operasional aset dalam sistem.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Status Baru</p>
                <div className="flex gap-4">
                    <Input 
                        placeholder="e.g., Aktif, Dipinjam, Maintenance..." 
                        value={newStatus} 
                        onChange={(e) => setNewStatus(e.target.value)}
                        className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold text-base"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddStatus()}
                    />
                    <Button onClick={handleAddStatus} className="h-12 w-12 rounded-xl bg-primary shadow-lg shadow-primary/20 p-0 text-white">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest w-[80px]">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Label Status Aset</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assetStatuses.map((s, idx) => (
                            <TableRow key={s} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 text-xs font-black text-slate-400">{idx + 1}</TableCell>
                                <TableCell className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight drop-shadow-sm text-left">{s.replace(/_/g, ' ')}</TableCell>
                                <TableCell className="text-right pr-10">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleRemoveStatus(s)}
                                        className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
            <div className="bg-amber-50 p-4 rounded-2xl border border-amber-100 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-[10px] font-bold text-amber-800 uppercase leading-relaxed text-left">
                    Hati-hati: Menghapus status sistem (seperti status "waiting_") dapat mengganggu fungsionalitas persetujuan mutasi dan disposal.
                </p>
            </div>
          </CardContent>
        </Card>

        {/* PHYSICAL CONDITION MANAGEMENT */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <Stethoscope className="w-6 h-6 text-primary" /> Manajemen Kondisi Fisik
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Tentukan skala kondisi fisik aset hasil audit lapangan.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Kondisi Baru</p>
                <div className="flex gap-4">
                    <Input 
                        placeholder="e.g., Baru, Baik, Rusak, Butuh Servis..." 
                        value={newCondition} 
                        onChange={(e) => setNewCondition(e.target.value)}
                        className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold text-base"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddCondition()}
                    />
                    <Button onClick={handleAddCondition} className="h-12 w-12 rounded-xl bg-primary shadow-lg shadow-primary/20 p-0 text-white">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest w-[80px]">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Label Kondisi Fisik</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {assetConditions.map((c, idx) => (
                            <TableRow key={c} className="h-16 hover:bg-slate-50 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 text-xs font-black text-slate-400">{idx + 1}</TableCell>
                                <TableCell className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight drop-shadow-sm text-left">{c}</TableCell>
                                <TableCell className="text-right pr-10">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleRemoveCondition(c)}
                                        className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* TECHNICAL LABELS CUSTOMIZATION */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/20">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary text-left">
              <Tags className="w-6 h-6" /> Kustomisasi Label per Kategori
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Tentukan nama label spesifikasi teknis untuk setiap kategori unik.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 pt-8 space-y-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-start">
                <div className="space-y-4 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">1. Pilih Kategori Aset</Label>
                    <Select value={selectedCategoryForLabels} onValueChange={setSelectedCategoryForLabels}>
                        <SelectTrigger className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-black text-sm text-primary uppercase">
                            <SelectValue placeholder="Pilih kategori untuk diedit..." />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl">
                            {categories.sort((a,b) => a.name.localeCompare(b.name)).map(cat => <SelectItem key={cat.name} value={cat.name} className="font-bold text-xs">{cat.name}</SelectItem>)}
                        </SelectContent>
                    </Select>
                    <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 flex items-start gap-3">
                        <Info className="h-5 w-5 text-blue-600 mt-0.5" />
                        <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200 font-medium text-left">Label ini akan otomatis muncul pada Formulir Input, Profil Aset, dan Cetakan Identitas untuk kategori yang Anda pilih.</p>
                    </div>
                </div>

                <div className={cn("space-y-4 transition-all duration-500", !selectedCategoryForLabels ? "opacity-20 pointer-events-none" : "opacity-100")}>
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">2. Tentukan 4 Nama Label Spesifik</Label>
                    <div className="grid grid-cols-1 gap-3">
                        {tempLabels.map((label, idx) => (
                            <div key={idx} className="space-y-1 text-left">
                                <Label className="text-[8px] font-black uppercase text-slate-400 ml-3">Kolom Teknis {idx + 1}</Label>
                                <Input 
                                    placeholder={`e.g., ${idx === 0 ? 'Model' : (idx === 1 ? 'Volume' : 'S/N')}`}
                                    value={label}
                                    onChange={(e) => {
                                        const next = [...tempLabels];
                                        next[idx] = e.target.value;
                                        setTempLabels(next);
                                    }}
                                    className="h-11 rounded-xl bg-slate-50 dark:bg-slate-950 border-none shadow-inner font-bold text-black"
                                />
                            </div>
                        ))}
                    </div>
                    <Button onClick={handleSaveCategoryLabels} className="w-full h-11 bg-slate-900 hover:bg-black text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg mt-2">
                        Terapkan Label Sementara
                    </Button>
                </div>
            </div>
          </CardContent>
        </Card>

        
          </TabsContent>

          <TabsContent value="organisasi" className="space-y-10 mt-6">
{/* DEPARTMENT MANAGEMENT TABLE */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <Building2 className="w-6 h-6 text-primary" /> Manajemen Departemen (Bagian)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Daftar unit kerja yang diizinkan untuk memiliki dan memindahkan aset.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Departemen</p>
                <div className="flex gap-4">
                    <Input 
                        placeholder="Ketik Nama Departemen..." 
                        value={newDept} 
                        onChange={(e) => setNewDept(e.target.value)}
                        className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold text-base text-black"
                        onKeyDown={(e) => e.key === 'Enter' && handleAddDept()}
                    />
                    <Button onClick={handleAddDept} className="h-12 w-12 rounded-xl bg-primary shadow-lg shadow-primary/20 p-0 text-white">
                        <Plus className="h-6 w-6" />
                    </Button>
                </div>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest w-[80px]">No</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Identitas Unit / Departemen</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {departments.sort().map((dept, idx) => (
                            <TableRow key={dept} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 text-xs font-black text-slate-400">{idx + 1}</TableCell>
                                <TableCell className="font-black text-sm text-slate-900 dark:text-white uppercase tracking-tight drop-shadow-sm text-left">{dept}</TableCell>
                                <TableCell className="text-right pr-10">
                                    <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        onClick={() => handleRemoveDept(dept)}
                                        className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                    >
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* COST CENTER MANAGEMENT TABLE */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <Coins className="w-6 h-6 text-primary" /> Manajemen Master Cost Center
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Daftar pemetaan kode akuntansi pusat biaya per departemen.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-8">
            <div className="p-6 bg-primary/5 dark:bg-primary/10 rounded-[2rem] border-2 border-dashed border-primary/20">
                <p className="text-[10px] font-black uppercase tracking-widest text-primary mb-4 ml-1 text-left">Tambah Kode Cost Center</p>
                <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
                    <div className="md:col-span-5 text-left">
                        <Input 
                            placeholder="Kode (e.g., F1313)..." 
                            value={newCCCode} 
                            onChange={(e) => setNewCCCode(e.target.value.toUpperCase())}
                            className="h-12 rounded-xl bg-white dark:bg-slate-900 border-slate-200 shadow-sm font-bold uppercase"
                        />
                    </div>
                    <div className="md:col-span-5 text-left">
                        <Select value={newCCDept} onValueChange={setNewCCDept}>
                            <SelectTrigger className="h-12 rounded-xl bg-white border-slate-200 font-bold text-black">
                                <SelectValue placeholder="Pilih Departemen Terkait" />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl max-h-[300px]">
                                {departments.sort().map(d => <SelectItem key={d} value={d} className="font-bold text-xs">{d}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="md:col-span-2">
                        <Button onClick={handleAddCC} className="h-12 w-full rounded-xl bg-slate-900 hover:bg-black shadow-lg text-white font-black uppercase text-xs">
                            <Plus className="h-5 w-5" />
                        </Button>
                    </div>
                </div>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest w-[120px]">Kode CC</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Departemen Terkait</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {costCenters.sort((a,b) => a.code.localeCompare(b.code)).map((cc, idx) => (
                            <TableRow key={cc.code} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 font-black text-sm text-primary uppercase tracking-tight">{cc.code}</TableCell>
                                <TableCell className="font-bold text-sm text-slate-700 dark:text-slate-300 uppercase text-left">{cc.department}</TableCell>
                                <TableCell className="text-right pr-10">
                                    <div className="flex justify-end gap-2">
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            onClick={() => openEditCC(cc)}
                                            className="h-9 w-9 rounded-xl text-slate-300 hover:text-amber-600 hover:bg-amber-50 transition-all opacity-0 group-hover:opacity-100"
                                        >
                                            <Edit className="h-4 w-4" />
                                        </Button>
                                        <Button 
                                            variant="ghost" 
                                            size="icon" 
                                            className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                                            onClick={() => handleRemoveCC(cc.code)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

                {/* FORM APP AUTHORIZATION */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/20 mt-10">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary text-left">
              <ShieldAlert className="w-6 h-6 text-primary" /> Otoritas Akses Form APP (DAR)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Pilih user mana saja yang berhak melihat dan membuat form DAR (Design Application Request).</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 flex items-start gap-4 mb-6">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200 font-medium text-left">
                User yang tercentang di bawah ini akan dapat melihat menu Form APP di bilah navigasi (Sidebar) dan menggunakan fitur pembuatan dokumen DAR.
              </p>
            </div>
            
            <ScrollArea className="h-64 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border shadow-inner p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {allUsersList.sort((a,b) => a.name.localeCompare(b.name)).map(u => (
                    <div key={u.uid} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Checkbox 
                        id={`form-app-user-${u.uid}`}
                        checked={formAppUsers.includes(u.uid)}
                        onCheckedChange={(checked) => {
                          if (checked) setFormAppUsers(prev => [...prev, u.uid]);
                          else setFormAppUsers(prev => prev.filter(uid => uid !== u.uid));
                        }}
                      />
                      <Label htmlFor={`form-app-user-${u.uid}`} className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer truncate">{u.name}</Label>
                    </div>
                  ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>

        {/* DEPARTMENT GROUPING */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/10">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary text-left">
              <Users2 className="w-6 h-6 text-primary" /> Pengelompokan Unit (Dept Groups)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Kelola grup departemen untuk mempermudah pemilihan unit saat audit fisik.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="flex justify-end">
              <Button onClick={() => handleOpenGroupDialog()} className="rounded-xl h-11 bg-primary hover:bg-primary/90 text-white font-black uppercase text-[10px] tracking-widest shadow-lg shadow-primary/20">
                <Plus className="mr-2 h-4 w-4" /> Tambah Grup Unit
              </Button>
            </div>

            <div className="border rounded-[2.5rem] overflow-hidden bg-white dark:bg-slate-950 shadow-inner">
                <Table>
                    <TableHeader className="bg-slate-50 dark:bg-slate-800/50">
                        <TableRow className="h-14 border-none">
                            <TableHead className="pl-10 text-[10px] font-black uppercase tracking-widest">Nama Grup</TableHead>
                            <TableHead className="text-[10px] font-black uppercase tracking-widest text-left">Daftar Unit Terkait</TableHead>
                            <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-widest">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {deptGroups.length > 0 ? deptGroups.map((group) => (
                            <TableRow key={group.id} className="h-16 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors border-slate-50 dark:border-slate-800 group">
                                <TableCell className="pl-10 font-black text-sm text-primary uppercase tracking-tight text-left">{group.name}</TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1.5 py-2">
                                        {group.departments.map(d => (
                                          <Badge key={d} variant="secondary" className="text-[9px] font-black uppercase bg-slate-100 text-slate-600 border-none px-2.5">{d}</Badge>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell className="text-right pr-10">
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => handleOpenGroupDialog(group)} className="h-9 w-9 rounded-xl text-slate-300 hover:text-amber-600 hover:bg-amber-50 opacity-0 group-hover:opacity-100 transition-all"><Edit className="h-4 w-4" /></Button>
                                        <Button variant="ghost" size="icon" onClick={() => handleRemoveGroup(group.id)} className="h-9 w-9 rounded-xl text-slate-300 hover:text-rose-600 hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-all"><Trash2 className="h-4 w-4" /></Button>
                                    </div>
                                </TableCell>
                            </TableRow>
                        )) : (
                            <TableRow><TableCell colSpan={3} className="h-32 text-center text-[10px] font-black uppercase opacity-20 italic">Belum ada grup unit kerja.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
          </CardContent>
        </Card>

        {/* 2ND CHECKER AUTHORIZATION */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/20">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-primary text-left">
              <ShieldAlert className="w-6 h-6 text-primary" /> Otoritas Verifikasi Audit (2nd Checker)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Pilih departemen yang berhak melakukan checklist verifikasi tingkat kedua.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="p-5 rounded-3xl bg-blue-50 dark:bg-blue-900/20 border border-blue-100 flex items-start gap-4 mb-6">
              <Info className="h-5 w-5 text-blue-600 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-blue-800 dark:text-blue-200 font-medium text-left">
                User yang berada di departemen terpilih di bawah ini akan memiliki akses untuk mencentang kolom <b>2nd Checker</b> di halaman Audit Aset. Departemen yang tidak terpilih hanya bisa melakukan pengisian 1st Checker.
              </p>
            </div>
            
            <ScrollArea className="h-64 rounded-2xl bg-slate-50 dark:bg-slate-950/50 border shadow-inner p-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {departments.sort().map(dept => (
                    <div key={dept} className="flex items-center space-x-3 p-2 hover:bg-white dark:hover:bg-slate-800 rounded-lg transition-colors">
                      <Checkbox 
                        id={`2nd-checker-dept-${dept}`}
                        checked={secondCheckerDepts.includes(dept)}
                        onCheckedChange={(checked) => {
                          if (checked) setSecondCheckerDepts(prev => [...prev, dept]);
                          else setSecondCheckerDepts(prev => prev.filter(d => d !== dept));
                        }}
                      />
                      <Label htmlFor={`2nd-checker-dept-${dept}`} className="text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer uppercase truncate">{dept}</Label>
                    </div>
                  ))}
                </div>
            </ScrollArea>
          </CardContent>
        </Card>

        
          </TabsContent>

          <TabsContent value="integrasi" className="space-y-10 mt-6">
{/* GEMINI AI CONFIGURATION */}
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-indigo-500/20">
          <CardHeader className="p-8 sm:p-10 pb-4 bg-indigo-500/5 text-left">
            <CardTitle className="flex items-center gap-2 text-xl font-black uppercase tracking-tight text-indigo-600 text-left">
              <Sparkles className="w-6 h-6 text-indigo-600 animate-pulse" /> Integrasi Kecerdasan Buatan (Gemini AI)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Konfigurasi API Key Google Gemini untuk fitur Analis Aset Pintar.</CardDescription>
          </CardHeader>
          <CardContent className="p-8 sm:p-10 space-y-6">
            <div className="p-5 rounded-3xl bg-indigo-50 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-800/20 flex items-start gap-4 mb-6">
              <Info className="h-5 w-5 text-indigo-600 mt-0.5" />
              <p className="text-[11px] leading-relaxed text-indigo-800 dark:text-indigo-200 font-medium text-left">
                Gunakan API Key dari Google AI Studio (Gemini) agar sistem dapat menghasilkan wawasan otomatis, mendeteksi tren kerusakan barang, dan memberikan rekomendasi preventif bagi tim manajemen.
              </p>
            </div>
            
            <div className="space-y-2 text-left">
              <Label htmlFor="gemini-api-key" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Gemini API Key</Label>
              <div className="relative">
                <Input
                  id="gemini-api-key"
                  type="password"
                  value={geminiApiKey}
                  onChange={(e) => setGeminiApiKey(e.target.value)}
                  placeholder="AIzaSy..."
                  className="rounded-xl h-12 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-mono text-sm pr-10 text-black dark:text-white"
                />
                <Sparkles className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-indigo-400" />
              </div>
              <p className="text-[9px] text-muted-foreground italic px-1 text-left">
                Kunci API ini disimpan secara aman di database dan hanya digunakan di server internal untuk pemrosesan data wawasan.
              </p>
            </div>
          </CardContent>
        </Card>

        
          </TabsContent>
        </Tabs>

{/* SAVE STICKY BUTTON */}
        <div className="sticky bottom-10 z-[60] flex justify-center">
            <Button onClick={handleSaveGeneral} disabled={isSaving} className="rounded-full px-20 h-16 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-[0.2em] shadow-3xl shadow-primary/30 active:scale-95 transition-all border-4 border-white dark:border-slate-800">
                {isSaving ? <Loader2 className="mr-3 h-6 w-6 animate-spin" /> : <ShieldCheck className="mr-3 h-6 w-6 text-primary" />}
                Simpan Perubahan Database
            </Button>
        </div>

        </div>

      {/* EDIT CATEGORY DIALOG */}
      <Dialog open={!!editingCat} onOpenChange={(o) => !o && setEditingCat(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden text-black">
            <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/20 rounded-2xl mb-2"><Edit className="h-8 w-8 text-primary" /></div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Klasifikasi</DialogTitle>
                <DialogDescription className="text-white/60 font-black text-[10px] tracking-widest uppercase">{editingCat?.name}</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Identitas Seri</Label>
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
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Masa Ketahanan (Tahun)</Label>
                    <div className="relative">
                        <Input 
                            type="number" 
                            value={editLifetime} 
                            onChange={(e) => setEditLifetime(Number(e.target.value))} 
                            className="h-12 pl-4 pr-12 rounded-xl bg-slate-50 border-none shadow-inner font-black text-lg focus:ring-primary/20 text-slate-900" 
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] font-black uppercase text-muted-foreground">Thn</span>
                    </div>
                </div>
                <div className="flex gap-3">
                    <DialogClose asChild><Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold">Batal</Button></DialogClose>
                    <Button onClick={handleSaveEditCat} className="flex-[2] h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-lg">
                        Update Data
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* EDIT COST CENTER DIALOG */}
      <Dialog open={!!editingCC} onOpenChange={(o) => !o && setEditingCC(null)}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden text-black">
            <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
                <div className="p-3 bg-white/10 rounded-2xl mb-2"><Edit className="h-8 w-8 text-primary" /></div>
                <DialogTitle className="text-xl font-black uppercase tracking-tight">Edit Cost Center</DialogTitle>
                <DialogDescription className="text-white/60 font-black text-[10px] tracking-widest uppercase">{editingCC?.code}</DialogDescription>
            </div>
            <div className="p-8 space-y-6">
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Kode Akuntansi</Label>
                    <Input 
                        value={editCCCode} 
                        onChange={(e) => setEditCCCode(e.target.value.toUpperCase())} 
                        className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-black uppercase" 
                    />
                </div>
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Departemen Terkait</Label>
                    <Select value={editCCDept} onValueChange={setEditCCDept}>
                        <SelectTrigger className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-slate-900">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-xl max-h-[300px]">
                             {departments.sort().map(d => <SelectItem key={d} value={d} className="font-bold text-xs">{d}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                <div className="flex gap-3">
                    <DialogClose asChild><Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold text-black">Batal</Button></DialogClose>
                    <Button onClick={handleSaveEditCC} className="flex-[2] h-12 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest rounded-xl shadow-lg">
                        Simpan Pembaruan
                    </Button>
                </div>
            </div>
        </DialogContent>
      </Dialog>

      {/* DEPT GROUP DIALOG */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="sm:max-w-md rounded-[2.5rem] border-none shadow-3xl bg-white p-0 overflow-hidden text-black">
          <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2">
            <div className="p-3 bg-white/10 rounded-2xl mb-2"><Users2 className="h-8 w-8 text-primary" /></div>
            <DialogTitle className="text-xl font-black uppercase tracking-tight">{editingGroup ? 'Edit Grup Unit' : 'Grup Unit Baru'}</DialogTitle>
            <DialogDescription className="text-white/60">Gabungkan beberapa departemen untuk audit massal.</DialogDescription>
          </div>
          <div className="p-8 space-y-6">
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Grup</Label>
              <Input placeholder="Contoh: Produksi Group..." value={groupName} onChange={(e) => setGroupName(e.target.value)} className="h-12 rounded-xl bg-slate-50 border-none shadow-inner font-bold text-black" />
            </div>
            <div className="space-y-2 text-left">
              <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Daftar Departemen</Label>
              <ScrollArea className="h-48 rounded-xl bg-slate-50 border-none shadow-inner p-4">
                <div className="grid grid-cols-1 gap-3">
                  {departments.sort().map(dept => (
                    <div key={dept} className="flex items-center space-x-3 group">
                      <Checkbox 
                        id={`group-dept-${dept}`}
                        checked={groupDepts.includes(dept)}
                        onCheckedChange={(checked) => {
                          if (checked) setGroupDepts(prev => [...prev, dept]);
                          else setGroupDepts(prev => prev.filter(d => d !== dept));
                        }}
                      />
                      <Label htmlFor={`group-dept-${dept}`} className="text-xs font-bold text-slate-700 cursor-pointer">{dept}</Label>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
            <div className="flex gap-3">
              <DialogClose asChild><Button variant="ghost" className="flex-1 h-12 rounded-xl font-bold">Batal</Button></DialogClose>
              <Button onClick={handleSaveGroup} className="flex-[2] h-12 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl shadow-lg">Simpan Grup</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
