'use client';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarFooter,
  SidebarSeparator,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { 
  LayoutDashboard, 
  Package, 
  DollarSign, 
  Shapes, 
  QrCode, 
  FileText, 
  Trash2, 
  Clock, 
  Users,
  LogOut,
  HelpCircle,
  KeyRound,
  FilePen,
  History,
  UserCog,
  ClipboardCheck,
  DatabaseBackup,
  LifeBuoy,
  Archive,
  ShoppingCart,
  Database,
  Printer,
  Laptop,
  Settings,
  Megaphone,
  Wrench,
  Cloud,
  ChevronRight,
  SmartphoneNfc,
  BarChart3,
  Lightbulb,
  ListTodo,
  AlertTriangle,
  Layers,
  GitBranch
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useMemo } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where, Timestamp } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import type { User, Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

const itemColorMap: Record<string, { activeBg: string, activeBorder: string, iconBg: string, iconBorder: string, iconText: string }> = {
  dashboard: { activeBg: '!bg-blue-600', activeBorder: '!border-b-blue-800', iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconBorder: 'border-blue-500/30', iconText: 'text-blue-400' },
  workflow: { activeBg: '!bg-indigo-600', activeBorder: '!border-b-indigo-800', iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20', iconBorder: 'border-indigo-500/30', iconText: 'text-indigo-400' },
  announcements: { activeBg: '!bg-purple-600', activeBorder: '!border-b-purple-800', iconBg: 'bg-purple-500/10 dark:bg-purple-500/20', iconBorder: 'border-purple-500/30', iconText: 'text-purple-400' },
  assets_a: { activeBg: '!bg-emerald-600', activeBorder: '!border-b-emerald-800', iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', iconBorder: 'border-emerald-500/30', iconText: 'text-emerald-400' },
  assets_util: { activeBg: '!bg-teal-600', activeBorder: '!border-b-teal-800', iconBg: 'bg-teal-500/10 dark:bg-teal-500/20', iconBorder: 'border-teal-500/30', iconText: 'text-teal-400' },
  assets_report: { activeBg: '!bg-cyan-600', activeBorder: '!border-b-cyan-800', iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20', iconBorder: 'border-cyan-500/30', iconText: 'text-cyan-400' },
  assets_it: { activeBg: '!bg-amber-600', activeBorder: '!border-b-amber-800', iconBg: 'bg-amber-500/10 dark:bg-amber-500/20', iconBorder: 'border-amber-500/30', iconText: 'text-amber-400' },
  iso: { activeBg: '!bg-sky-600', activeBorder: '!border-b-sky-800', iconBg: 'bg-sky-500/10 dark:bg-sky-500/20', iconBorder: 'border-sky-500/30', iconText: 'text-sky-400' },
  maintenance: { activeBg: '!bg-violet-600', activeBorder: '!border-b-violet-800', iconBg: 'bg-violet-500/10 dark:bg-violet-500/20', iconBorder: 'border-violet-500/30', iconText: 'text-violet-400' },
  helpdesk: { activeBg: '!bg-pink-600', activeBorder: '!border-b-pink-800', iconBg: 'bg-pink-500/10 dark:bg-pink-500/20', iconBorder: 'border-pink-500/30', iconText: 'text-pink-400' },
  inventory: { activeBg: '!bg-rose-600', activeBorder: '!border-b-rose-800', iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconBorder: 'border-rose-500/30', iconText: 'text-rose-400' },
  inventory_requests: { activeBg: '!bg-orange-600', activeBorder: '!border-b-orange-800', iconBg: 'bg-orange-500/10 dark:bg-orange-500/20', iconBorder: 'border-orange-500/30', iconText: 'text-orange-400' },
  mutations: { activeBg: '!bg-yellow-600', activeBorder: '!border-b-yellow-800', iconBg: 'bg-yellow-500/10 dark:bg-yellow-500/20', iconBorder: 'border-yellow-500/30', iconText: 'text-yellow-400' },
  inventory_report: { activeBg: '!bg-lime-600', activeBorder: '!border-b-lime-800', iconBg: 'bg-lime-500/10 dark:bg-lime-500/20', iconBorder: 'border-lime-500/30', iconText: 'text-lime-400' },
  logs: { activeBg: '!bg-slate-600', activeBorder: '!border-b-slate-800', iconBg: 'bg-slate-500/10 dark:bg-slate-500/20', iconBorder: 'border-slate-500/30', iconText: 'text-slate-400' },
  
  users: { activeBg: '!bg-blue-600', activeBorder: '!border-b-blue-800', iconBg: 'bg-blue-500/10 dark:bg-blue-500/20', iconBorder: 'border-blue-500/30', iconText: 'text-blue-400' },
  kategori: { activeBg: '!bg-indigo-600', activeBorder: '!border-b-indigo-800', iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20', iconBorder: 'border-indigo-500/30', iconText: 'text-indigo-400' },
  cost_center: { activeBg: '!bg-emerald-600', activeBorder: '!border-b-emerald-800', iconBg: 'bg-emerald-500/10 dark:bg-emerald-500/20', iconBorder: 'border-emerald-500/30', iconText: 'text-emerald-400' },
  scan_qr: { activeBg: '!bg-violet-600', activeBorder: '!border-b-violet-800', iconBg: 'bg-violet-500/10 dark:bg-violet-500/20', iconBorder: 'border-violet-500/30', iconText: 'text-violet-400' },
  scan_nfc: { activeBg: '!bg-purple-600', activeBorder: '!border-b-purple-800', iconBg: 'bg-purple-500/10 dark:bg-purple-500/20', iconBorder: 'border-purple-500/30', iconText: 'text-purple-400' },
  preview_forms: { activeBg: '!bg-cyan-600', activeBorder: '!border-b-cyan-800', iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20', iconBorder: 'border-cyan-500/30', iconText: 'text-cyan-400' },
  it_problem: { activeBg: '!bg-rose-600', activeBorder: '!border-b-rose-800', iconBg: 'bg-rose-500/10 dark:bg-rose-500/20', iconBorder: 'border-rose-500/30', iconText: 'text-rose-400' },
  compare: { activeBg: '!bg-amber-600', activeBorder: '!border-b-amber-800', iconBg: 'bg-amber-500/10 dark:bg-amber-500/20', iconBorder: 'border-amber-500/30', iconText: 'text-amber-400' },
  stamps: { activeBg: '!bg-orange-600', activeBorder: '!border-b-orange-800', iconBg: 'bg-orange-500/10 dark:bg-orange-500/20', iconBorder: 'border-orange-500/30', iconText: 'text-orange-400' },
  thermal: { activeBg: '!bg-teal-600', activeBorder: '!border-b-teal-800', iconBg: 'bg-teal-500/10 dark:bg-teal-500/20', iconBorder: 'border-teal-500/30', iconText: 'text-teal-400' },
  recycle: { activeBg: '!bg-red-650', activeBorder: '!border-b-red-850', iconBg: 'bg-red-500/10 dark:bg-red-500/20', iconBorder: 'border-red-500/30', iconText: 'text-red-400' },
  settings: { activeBg: '!bg-slate-600', activeBorder: '!border-b-slate-800', iconBg: 'bg-slate-500/10 dark:bg-slate-500/20', iconBorder: 'border-slate-500/30', iconText: 'text-slate-400' },
  backup: { activeBg: '!bg-indigo-600', activeBorder: '!border-b-indigo-800', iconBg: 'bg-indigo-500/10 dark:bg-indigo-500/20', iconBorder: 'border-indigo-500/30', iconText: 'text-indigo-400' },
  roles: { activeBg: '!bg-cyan-600', activeBorder: '!border-b-cyan-800', iconBg: 'bg-cyan-500/10 dark:bg-cyan-500/20', iconBorder: 'border-cyan-500/30', iconText: 'text-cyan-400' },
  help: { activeBg: '!bg-sky-600', activeBorder: '!border-b-sky-800', iconBg: 'bg-sky-500/10 dark:bg-sky-500/20', iconBorder: 'border-sky-500/30', iconText: 'text-sky-400' }
};

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<Partial<User> | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [helpdeskCount, setHelpdeskCount] = useState(0);
  const [inventoryRequestCount, setInventoryRequestCount] = useState(0);
  const [pendingUserCount, setPendingUserCount] = useState(0);
  const [hasNewAnnouncement, setHasNewAnnouncement] = useState(false);
  const [isSystemOpen, setIsSystemOpen] = useState(false);
  const [appVersion, setAppVersion] = useState('1.0');
  const [fullCompanyName, setFullCompanyName] = useState('SISTEM ASET');
  
  // Custom Order States
  const [customMainOrder, setCustomMainOrder] = useState<string[] | null>(null);
  const [customSystemOrder, setCustomSystemOrder] = useState<string[] | null>(null);

  const { toast } = useToast();

  useEffect(() => {
    async function fetchUserData() {
      if (user) {
        try {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists()) {
            setUserData(userDoc.data());
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      }
    }
    fetchUserData();

    const generalSnap = onSnapshot(doc(db, 'settings', 'general'), (doc) => {
      if (doc.exists()) {
        const data = doc.data();
        setAppVersion(data.appVersion || '1.0');
        setFullCompanyName(data.companyName || 'SISTEM ASET');
        if (data.mainMenuOrder) setCustomMainOrder(data.mainMenuOrder);
        if (data.systemMenuOrder) setCustomSystemOrder(data.systemMenuOrder);
      }
    });

    return () => generalSnap();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const announcementsQuery = query(collection(db, 'announcements'), where('createdAt', '>', Timestamp.now()));
    const unsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added' && change.doc.data().authorId !== user.uid) {
          setHasNewAnnouncement(true);
        }
      });
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const waitingStatuses: Asset['status'][] = ['waiting_mutasi', 'waiting_disposal', 'karyawan_approved', 'waiting_edit', 'waiting_creation'];
    const q = query(collection(db, 'assets'), where('status', 'in', waitingStatuses));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let relevantDocs = snapshot.docs;
        if (user.role !== 'Admin' && user.department !== 'ACCOUNTING') {
            relevantDocs = snapshot.docs.filter(doc => {
                const asset = doc.data() as Asset;
                return asset.requestedBy !== user.uid && (asset.location === user.department || asset.mutationTargetDepartment === user.department);
            });
        }
        setWaitingCount(relevantDocs.length);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    
    let q;
    if (user.role === 'Admin') {
      q = query(collection(db, 'helpdesk_tickets'), where('status', 'in', ['Menunggu', 'Diproses']));
    } else {
      q = query(collection(db, 'helpdesk_tickets'), where('status', 'in', ['Menunggu', 'Diproses']), where('reportedBy', '==', user.uid));
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      setHelpdeskCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'inventory_requests'), where('status', '==', 'Menunggu Persetujuan HRGA'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setInventoryRequestCount(snapshot.size);
    });
    return () => unsubscribe();
  }, [user]);

  const handleLogout = async () => {
    await signOut(auth);
    router.push('/login');
  };

  const isAdmin = userData?.role === 'Admin';
  const isUserRole = userData?.role === 'User';
  const allowedPages = userData?.allowedPages || [];

  const mainMenuItems = useMemo(() => [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, href: '/', hide: isUserRole },
    { id: 'workflow', label: 'Alur Sistem', icon: GitBranch, href: '/workflow', hide: isUserRole },
    { id: 'announcements', label: 'Pengumuman', icon: Megaphone, href: '/announcements', badge: hasNewAnnouncement },
    { id: 'assets_a', label: 'Aset Utama', icon: Package, href: '/assets', hide: isUserRole },
    { id: 'assets_util', label: 'Utilitas & Fasilitas', icon: Lightbulb, href: '/assets?category=UTILITY', hide: isUserRole },
    { id: 'assets_report', label: 'Laporan Aset', icon: BarChart3, href: '/assets/report', hide: isUserRole },
    { id: 'assets_it', label: 'Aset IT', icon: Laptop, href: '/computer-details', hide: isUserRole },
    { id: 'iso', label: 'ISO 14064 (Emisi)', icon: Cloud, href: '/iso-14064', hide: isUserRole },
    { id: 'maintenance', label: 'Maintenance & Audit', icon: Wrench, href: '/maintenance', hide: isUserRole },
    { id: 'helpdesk', label: 'IT Helpdesk', icon: LifeBuoy, href: '/helpdesk', hide: isUserRole, count: helpdeskCount },
    { id: 'inventory', label: 'Inventaris', icon: Archive, href: '/inventory', hide: isUserRole },
    { id: 'inventory_requests', label: 'Permintaan Barang', icon: ShoppingCart, href: '/inventory/requests', hide: isUserRole, count: inventoryRequestCount, urgent: true },
    { id: 'mutations', label: 'Mutasi & Disposal', icon: History, href: '/mutations', hide: isUserRole, count: waitingCount },
    { id: 'inventory_report', label: 'Laporan Stok', icon: FileText, href: '/inventory/report', hide: isUserRole },
    { id: 'logs', label: 'Log Aktivitas', icon: ListTodo, href: '/logs', hide: isUserRole },
  ], [isUserRole, hasNewAnnouncement, helpdeskCount, inventoryRequestCount, waitingCount]);

  const systemMenuItems = useMemo(() => [
    { id: 'users', label: 'Manajemen User', icon: Users, href: '/users', hide: !isAdmin, count: pendingUserCount },
    { id: 'kategori', label: 'Kategori', icon: Shapes, href: '/kategori', hide: isUserRole },
    { id: 'cost_center', label: 'Cost Center', icon: DollarSign, href: '/cost-center', hide: isUserRole },
    { id: 'scan_qr', label: 'Scan QR', icon: QrCode, href: '/scan', hide: isUserRole },
    { id: 'scan_nfc', label: 'Scan NFC', icon: SmartphoneNfc, href: '/scan-nfc', hide: isUserRole },
    { id: 'preview_forms', label: 'Pratinjau Form', icon: ClipboardCheck, href: '/preview-forms', hide: isUserRole },
    { id: 'it_problem', label: 'Form IT Problem', icon: AlertTriangle, href: '/it-problem-form', hide: false },
    { id: 'compare', label: 'Compare Data', icon: Database, href: '/compare-excel', hide: !isAdmin },
    { id: 'stamps', label: 'Stempel', icon: FilePen, href: '/stamps', hide: isUserRole },
    { id: 'thermal', label: 'Thermal Print', icon: Printer, href: '/thermal-print-58', hide: isUserRole },
    { id: 'recycle', label: 'Tempat Sampah', icon: Trash2, href: '/recycle-bin', hide: !isAdmin },
    { id: 'settings', label: 'Pengaturan', icon: Settings, href: '/settings', hide: !isAdmin },
    { id: 'backup', label: 'Backup & Restore', icon: DatabaseBackup, href: '/backup', hide: !isAdmin },
    { id: 'roles', label: 'Hak Akses', icon: UserCog, href: '/user-roles', hide: isUserRole },
    { id: 'help', label: 'Bantuan', icon: HelpCircle, href: '/help' },
  ], [isAdmin, isUserRole, pendingUserCount]);

  const sortItems = (items: any[], order: string[] | null) => {
    if (!order) return items;
    return [...items].sort((a, b) => {
      const indexA = order.indexOf(a.id);
      const indexB = order.indexOf(b.id);
      if (indexA === -1 && indexB === -1) return 0;
      if (indexA === -1) return 1;
      if (indexB === -1) return -1;
      return indexA - indexB;
    });
  };

  const filterItems = (items: any[]) => items.filter(item => {
    if (isAdmin) return !item.hide;
    const isExplicitlyAllowed = allowedPages.includes(item.href) || (item.href.startsWith('/assets?') && allowedPages.includes('/assets')) || (item.href === '/workflow' && !isUserRole);
    return isExplicitlyAllowed && !item.hide;
  });

  const filteredMainItems = sortItems(filterItems(mainMenuItems), customMainOrder);
  const filteredSystemItems = sortItems(filterItems(systemMenuItems), customSystemOrder);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.05 },
    },
  };

  const itemVariants = {
    hidden: { x: -20, opacity: 0 },
    visible: { x: 0, opacity: 1 },
  };

  return (
    <>
      <SidebarHeader className="border-b border-cyan-800 bg-cyan-800 text-white shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3 p-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
                <div className="bg-white rounded-xl p-1.5 shadow-xl ring-2 ring-white/10 shrink-0">
                  <Image src="/cgi.png" alt="Logo" width={28} height={28} priority />
                </div>
                <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden">
                  <span className="text-sm font-black font-headline uppercase tracking-tight leading-none truncate text-white">
                      {fullCompanyName}
                  </span>
                  <span className="text-[8px] font-bold opacity-50 tracking-[0.3em] uppercase truncate mt-1">Asset Control</span>
                </div>
            </Link>
             <SidebarTrigger className="hidden md:flex rounded-full text-white hover:bg-white/10 ml-auto transition-transform active:scale-95" />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-cyan-700 text-white selection:bg-cyan-500 custom-scrollbar">
        <div className="w-full">
          <SidebarMenu className="gap-0.5 px-2 py-6">
            {filteredMainItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
              const colors = itemColorMap[item.id] || { activeBg: 'bg-rose-600', activeBorder: 'border-b-rose-800', iconBg: 'bg-cyan-800/30', iconBorder: 'border-cyan-900/40', iconText: 'text-white/60' };
              return (
                <div key={item.id}>
                  <SidebarMenuItem>
                    <Link 
                      href={item.href}
                      className={cn(
                        "btn-tactical",
                        isActive && "btn-tactical-active"
                      )}
                    >
                      <span className={cn(
                        "btn-tactical_lg transition-all duration-200 border-none",
                        isActive 
                          ? `${colors.activeBg} border-b-[3.5px] ${colors.activeBorder} active:translate-y-[1px] active:border-b-[1px]` 
                          : "!bg-cyan-900/40"
                      )}>
                        <span className="btn-tactical_sl" />
                        <span className="btn-tactical_text flex items-center gap-2.5">
                          <span className={cn(
                            "p-1.5 rounded-lg border-2 border-b-[3.5px] shadow-sm flex items-center justify-center shrink-0 transition-all duration-300",
                            isActive 
                              ? "bg-white/20 border-white/30 border-b-white/40 text-white" 
                              : `bg-cyan-950/40 border-cyan-850/50 border-b-cyan-900/60 ${colors.iconText}`
                          )}>
                            <item.icon className="size-3.5 shrink-0" />
                          </span>
                          <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] font-black uppercase tracking-tight">{item.label}</span>
                          {item.badge && <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_10px_rgba(251,113,133,0.8)]" />}
                          {item.count && item.count > 0 ? (
                              <span className={cn(
                                  "text-[9px] font-black rounded-lg h-5 min-w-[20px] px-1 flex items-center justify-center shadow-lg",
                                  item.urgent ? "bg-rose-600 text-white animate-bounce" : "bg-white text-cyan-900"
                              )}>
                                  {item.count}
                              </span>
                          ) : null}
                        </span>
                      </span>
                    </Link>
                  </SidebarMenuItem>
                </div>
              );
            })}

            {filteredSystemItems.length > 0 && (
              <div className="mt-8">
                <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen} className="w-full group/collapsible">
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <button 
                        className={cn(
                          "btn-tactical mb-2",
                          isSystemOpen && "btn-tactical-active"
                        )}
                      >
                        <span className="btn-tactical_lg !bg-cyan-900/40">
                          <span className="btn-tactical_sl" />
                          <span className="btn-tactical_text">
                            <Layers className={cn("size-4 transition-transform duration-500", isSystemOpen && "rotate-180 text-white")} />
                            <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] font-black uppercase tracking-tight">Sistem & Settings</span>
                            <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform duration-500 group-data-[collapsible=icon]:hidden", isSystemOpen && "rotate-90")} />
                          </span>
                        </span>
                      </button>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <SidebarMenu className="mt-2 gap-0.5 pl-4 pr-1">
                      {filteredSystemItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
                        const colors = itemColorMap[item.id] || { activeBg: 'bg-rose-650', activeBorder: 'border-b-rose-850', iconBg: 'bg-cyan-800/30', iconBorder: 'border-cyan-900/40', iconText: 'text-white/60' };
                        return (
                          <SidebarMenuItem key={item.id}>
                            <Link 
                              href={item.href}
                              className={cn(
                                "btn-tactical",
                                isActive && "btn-tactical-active"
                              )}
                            >
                              <span className={cn(
                                "btn-tactical_lg !py-1.5 !px-3 transition-all duration-200 border-none",
                                isActive 
                                  ? `${colors.activeBg} border-b-[3.5px] ${colors.activeBorder} active:translate-y-[1px] active:border-b-[1px]` 
                                  : "!bg-cyan-800/30"
                              )}>
                                <span className="btn-tactical_sl" />
                                <span className="btn-tactical_text !text-[9px] flex items-center gap-2">
                                  <span className={cn(
                                    "p-1 rounded-md border-2 border-b-[3.5px] shadow-sm flex items-center justify-center shrink-0 transition-all duration-300",
                                    isActive 
                                      ? "bg-white/20 border-white/30 border-b-white/40 text-white" 
                                      : `bg-cyan-950/40 border-cyan-850/50 border-b-cyan-900/60 ${colors.iconText}`
                                  )}>
                                    <item.icon className="size-3 shrink-0" />
                                  </span>
                                  <span className="flex-1 group-data-[collapsible=icon]:hidden font-bold uppercase tracking-tight">{item.label}</span>
                                  {item.count && item.count > 0 ? (
                                      <span className="text-[8px] font-black text-cyan-900 bg-white rounded-full h-4 w-4 flex items-center justify-center">
                                          {item.count}
                                      </span>
                                  ) : null}
                                </span>
                              </span>
                            </Link>
                          </SidebarMenuItem>
                        );
                      })}
                    </SidebarMenu>
                  </CollapsibleContent>
                </Collapsible>
              </div>
            )}
          </SidebarMenu>
        </div>
      </SidebarContent>

      <SidebarSeparator className="bg-cyan-800 h-px mx-4 opacity-30" />

      <SidebarFooter className="bg-cyan-800 text-white p-3">
        <SidebarMenu className="gap-2">
            <SidebarMenuItem>
                <button 
                  onClick={handleLogout} 
                  className="btn-tactical"
                >
                  <span className="btn-tactical_lg !bg-cyan-900/60 hover:!bg-rose-600 transition-colors">
                    <span className="btn-tactical_sl !bg-rose-50" />
                    <span className="btn-tactical_text">
                      <LogOut className="size-4" />
                      <span className="group-data-[collapsible=icon]:hidden uppercase text-[10px] tracking-[0.2em] ml-1 font-black">Keluar Sistem</span>
                    </span>
                  </span>
                </button>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-4 text-center group-data-[collapsible=icon]:hidden">
          <div className="text-[9px] font-black uppercase tracking-tighter text-white/30">
            Build Ver. {appVersion}
          </div>
          <div className="text-[10px] text-cyan-300 font-black mt-1 uppercase tracking-widest drop-shadow-md">
            {fullCompanyName}
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
