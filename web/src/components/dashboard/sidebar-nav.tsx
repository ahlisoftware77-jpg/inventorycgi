'use client';

import {
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
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
  Users,
  LogOut,
  HelpCircle,
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
  GitBranch,
  Mail,
  FolderSync,
  PackageSearch
} from 'lucide-react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState, useMemo } from 'react';
import { collection, doc, onSnapshot, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import type { User, Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const itemColorMap: Record<string, { activeIconColor: string, shadow: string, iconColor: string, inactiveIconBg: string }> = {
  dashboard: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-sky-305', inactiveIconBg: 'bg-amber-950/40' },
  notes: { activeIconColor: 'text-yellow-600', shadow: 'shadow-amber-900/5', iconColor: 'text-yellow-305', inactiveIconBg: 'bg-amber-950/40' },
  workflow: { activeIconColor: 'text-indigo-700', shadow: 'shadow-amber-900/5', iconColor: 'text-indigo-305', inactiveIconBg: 'bg-amber-950/40' },
  file_sharing: { activeIconColor: 'text-blue-700', shadow: 'shadow-amber-900/5', iconColor: 'text-blue-305', inactiveIconBg: 'bg-amber-950/40' },
  announcements: { activeIconColor: 'text-purple-700', shadow: 'shadow-amber-900/5', iconColor: 'text-purple-305', inactiveIconBg: 'bg-amber-950/40' },
  assets_a: { activeIconColor: 'text-emerald-700', shadow: 'shadow-amber-900/5', iconColor: 'text-emerald-305', inactiveIconBg: 'bg-amber-950/40' },
  assets_util: { activeIconColor: 'text-amber-800', shadow: 'shadow-amber-900/5', iconColor: 'text-yellow-305', inactiveIconBg: 'bg-amber-950/40' },
  assets_report: { activeIconColor: 'text-cyan-700', shadow: 'shadow-amber-900/5', iconColor: 'text-cyan-305', inactiveIconBg: 'bg-amber-950/40' },
  assets_it: { activeIconColor: 'text-sky-750', shadow: 'shadow-amber-900/5', iconColor: 'text-sky-205', inactiveIconBg: 'bg-amber-950/40' },
  iso: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-305', inactiveIconBg: 'bg-amber-950/40' },
  maintenance: { activeIconColor: 'text-violet-700', shadow: 'shadow-amber-900/5', iconColor: 'text-violet-305', inactiveIconBg: 'bg-amber-950/40' },
  helpdesk: { activeIconColor: 'text-pink-700', shadow: 'shadow-amber-900/5', iconColor: 'text-pink-305', inactiveIconBg: 'bg-amber-950/40' },
  inventory: { activeIconColor: 'text-rose-700', shadow: 'shadow-amber-900/5', iconColor: 'text-rose-305', inactiveIconBg: 'bg-amber-950/40' },
  inventory_requests: { activeIconColor: 'text-orange-700', shadow: 'shadow-amber-900/5', iconColor: 'text-orange-305', inactiveIconBg: 'bg-amber-950/40' },
  mutations: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-305', inactiveIconBg: 'bg-amber-950/40' },
  inventory_report: { activeIconColor: 'text-lime-700', shadow: 'shadow-amber-900/5', iconColor: 'text-lime-350', inactiveIconBg: 'bg-amber-950/40' },
  warehouse: { activeIconColor: 'text-indigo-700', shadow: 'shadow-amber-900/5', iconColor: 'text-indigo-305', inactiveIconBg: 'bg-amber-950/40' },
  logs: { activeIconColor: 'text-slate-700', shadow: 'shadow-amber-900/5', iconColor: 'text-slate-305', inactiveIconBg: 'bg-amber-950/40' },
  
  users: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-sky-305', inactiveIconBg: 'bg-amber-950/40' },
  kategori: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-indigo-305', inactiveIconBg: 'bg-amber-950/40' },
  cost_center: { activeIconColor: 'text-emerald-700', shadow: 'shadow-amber-900/5', iconColor: 'text-emerald-305', inactiveIconBg: 'bg-amber-950/40' },
  scan_qr: { activeIconColor: 'text-violet-700', shadow: 'shadow-amber-900/5', iconColor: 'text-violet-305', inactiveIconBg: 'bg-amber-950/40' },
  scan_nfc: { activeIconColor: 'text-purple-700', shadow: 'shadow-amber-900/5', iconColor: 'text-purple-305', inactiveIconBg: 'bg-amber-950/40' },
  preview_forms: { activeIconColor: 'text-cyan-700', shadow: 'shadow-amber-900/5', iconColor: 'text-cyan-305', inactiveIconBg: 'bg-amber-950/40' },
  it_problem: { activeIconColor: 'text-rose-700', shadow: 'shadow-amber-900/5', iconColor: 'text-rose-305', inactiveIconBg: 'bg-amber-950/40' },
  compare: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-305', inactiveIconBg: 'bg-amber-950/40' },
  stamps: { activeIconColor: 'text-orange-700', shadow: 'shadow-amber-900/5', iconColor: 'text-orange-305', inactiveIconBg: 'bg-amber-950/40' },
  thermal: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-305', inactiveIconBg: 'bg-amber-950/40' },
  recycle: { activeIconColor: 'text-red-700', shadow: 'shadow-amber-900/5', iconColor: 'text-red-305', inactiveIconBg: 'bg-amber-950/40' },
  settings: { activeIconColor: 'text-slate-700', shadow: 'shadow-amber-900/5', iconColor: 'text-slate-305', inactiveIconBg: 'bg-amber-950/40' },
  backup: { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-indigo-305', inactiveIconBg: 'bg-amber-950/40' },
  roles: { activeIconColor: 'text-cyan-700', shadow: 'shadow-amber-900/5', iconColor: 'text-cyan-305', inactiveIconBg: 'bg-amber-950/40' },
  broadcast_email: { activeIconColor: 'text-rose-700', shadow: 'shadow-amber-900/5', iconColor: 'text-rose-305', inactiveIconBg: 'bg-amber-950/40' },
  help: { activeIconColor: 'text-sky-700', shadow: 'shadow-amber-900/5', iconColor: 'text-sky-305', inactiveIconBg: 'bg-amber-950/40' },
  form_app: { activeIconColor: 'text-blue-700', shadow: 'shadow-amber-900/5', iconColor: 'text-blue-305', inactiveIconBg: 'bg-amber-950/40' },
};

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const category = searchParams.get('category');

  // Helper to check if a menu item is active
  const isItemActive = (itemHref: string, itemId: string) => {
    const [itemPath, itemQuery] = itemHref.split('?');
    
    if (itemId === 'assets_util') {
      return pathname === '/assets' && category === 'UTILITY';
    }
    
    if (itemId === 'assets_a') {
      if (pathname === '/assets') {
        return category !== 'UTILITY';
      }
      return pathname.startsWith('/assets/') && !pathname.startsWith('/assets/report');
    }
    
    if (itemId === 'assets_report') {
      return pathname === '/assets/report';
    }
    
    if (itemHref === '/') {
      return pathname === '/';
    }
    
    return pathname === itemPath || pathname.startsWith(itemPath + '/');
  };
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
  
  const [customMainOrder, setCustomMainOrder] = useState<string[] | null>(null);
  const [customSystemOrder, setCustomSystemOrder] = useState<string[] | null>(null);
  const [formAppUsers, setFormAppUsers] = useState<string[]>([]);

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
        if (data.formAppUsers) setFormAppUsers(data.formAppUsers);
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

  useEffect(() => {
    if (!user || user.role !== 'Admin') return;
    const q = query(collection(db, 'users'), where('role', '==', 'Pending'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setPendingUserCount(snapshot.size);
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
    { id: 'notes', label: 'Catatan', icon: FileText, href: '/notes', hide: isUserRole },
    { id: 'workflow', label: 'Alur Sistem', icon: GitBranch, href: '/workflow', hide: isUserRole },
    { id: 'file_sharing', label: 'File Sharing', icon: FolderSync, href: '/file-sharing', hide: false }, 
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
    { id: 'warehouse', label: 'WAREHOUSE', icon: PackageSearch, href: '/warehouse', hide: false },
    { id: 'logs', label: 'Log Aktivitas', icon: ListTodo, href: '/logs', hide: isUserRole },
    { id: 'register_design', label: 'Register Design', icon: FileText, href: '/register-design', hide: !(isAdmin || user?.permissions?.canAccessRegisterDesign) },
    { id: 'form_app', label: 'Form APP (DAR)', icon: FileText, href: '/form-app', hide: !(isAdmin || (user && formAppUsers.includes(user.uid))) },
  ], [isUserRole, hasNewAnnouncement, helpdeskCount, inventoryRequestCount, waitingCount, isAdmin, user, formAppUsers]);

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
    { id: 'broadcast_email', label: 'Broadcast Email', icon: Mail, href: '/broadcast-email', hide: isUserRole },
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
    
    let isExplicitlyAllowed = allowedPages.includes(item.href) 
      || (item.href.startsWith('/assets?') && allowedPages.includes('/assets')) 
      || (item.href === '/workflow' && !isUserRole)
      || item.href === '/warehouse';

    if (item.href === '/register-design' && user?.permissions?.canAccessRegisterDesign) {
      isExplicitlyAllowed = true;
    }
    
    if (item.href === '/form-app' && user && formAppUsers.includes(user.uid)) {
      isExplicitlyAllowed = true;
    }

    return isExplicitlyAllowed && !item.hide;
  });

  const filteredMainItems = sortItems(filterItems(mainMenuItems), customMainOrder);
  const filteredSystemItems = sortItems(filterItems(systemMenuItems), customSystemOrder);

  return (
    <>
      <SidebarContent className="bg-amber-700 text-amber-50 selection:bg-amber-900 scrollbar-hide relative overflow-y-auto overflow-x-hidden">
        <div className="w-full">
          <SidebarMenu className="gap-1 pl-2 pr-0 group-data-[state=collapsed]:px-1 pt-4 pb-4">
            {filteredMainItems.map((item, index) => {
              const isActive = isItemActive(item.href, item.id);
              const colors = itemColorMap[item.id] || { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-355', inactiveIconBg: 'bg-amber-950/40' };
              return (
                <div key={item.id} className="w-full">
                  <SidebarMenuItem className="list-none">
                    <Link 
                      href={item.href}
                      className={cn(
                        isActive 
                          ? "btn-active-pipe flex items-center shadow-[inset_0_2px_4px_rgba(0,0,0,0.1)] gap-3 transition-all duration-200 group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:justify-center" 
                          : "w-full px-3 py-2 rounded-xl text-amber-100 hover:text-white hover:bg-amber-600/40 font-semibold flex items-center gap-3 transition-all duration-300 group relative border border-transparent hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_16px_rgba(212,175,55,0.2)] hover:border-amber-400/30 hover:z-10 group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:justify-center"
                      )}
                    >
                      <span className={cn(
                        "p-1.5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                        isActive 
                          ? "bg-amber-100/60 " + colors.activeIconColor 
                          : `${colors.inactiveIconBg} border border-amber-900/10 ${colors.iconColor} group-hover:scale-110 group-hover:border-amber-900/20`
                      )}>
                        <item.icon className="size-4 shrink-0" />
                      </span>
                      <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] uppercase tracking-wider truncate font-semibold">{item.label}</span>
                      {item.badge && (
                        <span className="h-2 w-2 rounded-full bg-rose-450 animate-pulse shadow-[0_0_10px_rgba(251,113,133,0.8)] group-data-[state=collapsed]:absolute group-data-[state=collapsed]:top-1.5 group-data-[state=collapsed]:right-1.5 group-data-[state=collapsed]:border group-data-[state=collapsed]:border-amber-700" />
                      )}
                      {item.count && item.count > 0 ? (
                          <span className={cn(
                              "text-[9px] font-black rounded-lg h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md",
                              isActive
                                ? "bg-amber-100 text-amber-900 font-extrabold"
                                : item.urgent ? "bg-rose-600 text-white animate-bounce" : "bg-amber-950/55 text-amber-200 border border-amber-900/20",
                              // Collapsed state classes for a clean pulsing red dot:
                              "group-data-[state=collapsed]:absolute group-data-[state=collapsed]:top-1.5 group-data-[state=collapsed]:right-1.5 group-data-[state=collapsed]:h-2 group-data-[state=collapsed]:w-2 group-data-[state=collapsed]:min-w-0 group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:rounded-full group-data-[state=collapsed]:bg-rose-500 group-data-[state=collapsed]:border group-data-[state=collapsed]:border-amber-700 group-data-[state=collapsed]:shadow-none group-data-[state=collapsed]:animate-pulse"
                          )}>
                              <span className="group-data-[state=collapsed]:hidden">{item.count}</span>
                          </span>
                      ) : null}
                    </Link>
                  </SidebarMenuItem>
                </div>
              );
            })}

            {filteredSystemItems.length > 0 && (
              <div className="mt-6 border-t border-amber-850/40 pt-4 mr-2">
                <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen} className="w-full group/collapsible">
                  <SidebarMenuItem className="list-none">
                    <CollapsibleTrigger asChild>
                      <button 
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-amber-100 hover:text-white hover:bg-amber-600/50 font-semibold hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_16px_rgba(212,175,55,0.2)] hover:border-amber-400/30 border border-transparent hover:z-10 group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:justify-center",
                          isSystemOpen && "bg-amber-900/35 text-white"
                        )}
                      >
                        <span className={cn(
                          "p-1.5 rounded-lg flex items-center justify-center shrink-0 bg-amber-950/40 border border-amber-900/10 text-amber-300 group-hover:text-white",
                          isSystemOpen && "border-amber-800/30 text-white bg-amber-950/60"
                        )}>
                          <Layers className={cn("size-4 transition-transform duration-500", isSystemOpen && "rotate-180")} />
                        </span>
                        <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] uppercase tracking-wider text-left font-semibold">Sistem & Settings</span>
                        <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform duration-500 group-data-[collapsible=icon]:hidden text-amber-350", isSystemOpen && "rotate-90 text-white")} />
                      </button>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <SidebarMenu className="mt-1.5 gap-1 pl-4 pr-0">
                      {filteredSystemItems.map((item) => {
                        const isActive = isItemActive(item.href, item.id);
                        const colors = itemColorMap[item.id] || { activeIconColor: 'text-amber-700', shadow: 'shadow-amber-900/5', iconColor: 'text-amber-355', inactiveIconBg: 'bg-amber-950/40' };
                        return (
                          <SidebarMenuItem key={item.id} className="list-none">
                            <Link 
                              href={item.href}
                              className={cn(
                                isActive 
                                  ? "btn-active-pipe-sub flex items-center gap-2.5 transition-all duration-200 group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:justify-center" 
                                  : "w-full px-3 py-1.5 rounded-xl text-amber-200/90 hover:text-white hover:bg-amber-600/30 font-medium flex items-center gap-2.5 transition-all duration-300 group border border-transparent hover:-translate-y-0.5 hover:scale-[1.02] hover:shadow-[0_8px_16px_rgba(212,175,55,0.15)] hover:border-amber-400/20 hover:z-10 group-data-[state=collapsed]:px-2 group-data-[state=collapsed]:justify-center"
                              )}
                            >
                              <span className={cn(
                                "p-1 rounded-md flex items-center justify-center shrink-0 transition-all duration-300",
                                isActive 
                                  ? "bg-amber-100/60 " + colors.activeIconColor 
                                  : `${colors.inactiveIconBg} border border-amber-900/10 ${colors.iconColor} group-hover:scale-105 group-hover:border-amber-900/20`
                              )}>
                                <item.icon className="size-3.5 shrink-0" />
                              </span>
                              <span className="flex-1 group-data-[collapsible=icon]:hidden text-[10px] uppercase tracking-wider truncate font-semibold">{item.label}</span>
                              {item.count && item.count > 0 ? (
                                  <span className={cn(
                                      "text-[8px] font-black rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center shadow-sm",
                                      isActive ? "bg-amber-100 text-amber-900 font-bold" : "bg-amber-950/50 text-amber-200",
                                      // Collapsed state classes:
                                      "group-data-[state=collapsed]:absolute group-data-[state=collapsed]:top-1.5 group-data-[state=collapsed]:right-1.5 group-data-[state=collapsed]:h-2 group-data-[state=collapsed]:w-2 group-data-[state=collapsed]:min-w-0 group-data-[state=collapsed]:p-0 group-data-[state=collapsed]:rounded-full group-data-[state=collapsed]:bg-rose-500 group-data-[state=collapsed]:border group-data-[state=collapsed]:border-amber-700 group-data-[state=collapsed]:shadow-none group-data-[state=collapsed]:animate-pulse"
                                  )}>
                                      <span className="group-data-[state=collapsed]:hidden">{item.count}</span>
                                  </span>
                              ) : null}
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

      <SidebarSeparator className="bg-amber-900/30 h-px mx-4 opacity-50" />

      <SidebarFooter className="bg-amber-800 text-amber-100 p-3 border-t border-amber-900/30 rounded-b-[24px] relative z-10 shrink-0">
        {user && (
          <div className="mx-1 mb-3 p-3 rounded-2xl bg-amber-900/40 border border-amber-900/20 backdrop-blur-md flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-amber-500 via-amber-600 to-yellow-500 flex items-center justify-center text-white font-black text-xs uppercase shadow-md shadow-amber-500/10">
              {userData?.name?.substring(0, 2) || user.email?.substring(0, 2) || 'AD'}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-tight">{userData?.name || 'Administrator'}</span>
              <span className="text-[8px] font-black text-amber-300 uppercase tracking-widest mt-0.5">{userData?.role || 'Admin'}</span>
            </div>
          </div>
        )}
        
        <SidebarMenu className="gap-2">
            <SidebarMenuItem className="list-none">
                <button 
                  onClick={handleLogout} 
                  className="w-full px-3 py-2.5 rounded-xl bg-amber-900/40 border border-amber-900/20 text-rose-300 hover:text-white hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-600/15 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 group"
                >
                  <LogOut className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  <span className="group-data-[collapsible=icon]:hidden font-semibold">Keluar Sistem</span>
                </button>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-3 text-center group-data-[collapsible=icon]:hidden">
          <div className="text-[9px] font-bold uppercase tracking-widest text-amber-400">
            Build Ver. {appVersion}
          </div>
          <div className="text-[10px] text-amber-300 font-black mt-1 uppercase tracking-widest">
            {fullCompanyName}
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
