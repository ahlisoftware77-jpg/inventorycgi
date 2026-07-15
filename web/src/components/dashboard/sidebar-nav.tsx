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
import { collection, doc, onSnapshot, query, where, Timestamp, getDoc } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut } from 'firebase/auth';
import Image from 'next/image';
import type { User, Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const itemColorMap: Record<string, { activeBg: string, shadow: string, iconColor: string }> = {
  dashboard: { activeBg: 'bg-blue-600', shadow: 'shadow-blue-600/20', iconColor: 'text-blue-400' },
  workflow: { activeBg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', iconColor: 'text-indigo-400' },
  announcements: { activeBg: 'bg-purple-600', shadow: 'shadow-purple-600/20', iconColor: 'text-purple-400' },
  assets_a: { activeBg: 'bg-emerald-600', shadow: 'shadow-emerald-600/20', iconColor: 'text-emerald-400' },
  assets_util: { activeBg: 'bg-teal-600', shadow: 'shadow-teal-600/20', iconColor: 'text-teal-400' },
  assets_report: { activeBg: 'bg-cyan-600', shadow: 'shadow-cyan-600/20', iconColor: 'text-cyan-400' },
  assets_it: { activeBg: 'bg-amber-600', shadow: 'shadow-amber-600/20', iconColor: 'text-amber-400' },
  iso: { activeBg: 'bg-sky-600', shadow: 'shadow-sky-600/20', iconColor: 'text-sky-400' },
  maintenance: { activeBg: 'bg-violet-600', shadow: 'shadow-violet-600/20', iconColor: 'text-violet-400' },
  helpdesk: { activeBg: 'bg-pink-600', shadow: 'shadow-pink-600/20', iconColor: 'text-pink-400' },
  inventory: { activeBg: 'bg-rose-600', shadow: 'shadow-rose-600/20', iconColor: 'text-rose-400' },
  inventory_requests: { activeBg: 'bg-orange-600', shadow: 'shadow-orange-600/20', iconColor: 'text-orange-400' },
  mutations: { activeBg: 'bg-amber-500', shadow: 'shadow-amber-500/20', iconColor: 'text-amber-400' },
  inventory_report: { activeBg: 'bg-lime-600', shadow: 'shadow-lime-600/20', iconColor: 'text-lime-400' },
  logs: { activeBg: 'bg-slate-750', shadow: 'shadow-slate-700/20', iconColor: 'text-slate-400' },
  
  users: { activeBg: 'bg-blue-600', shadow: 'shadow-blue-600/20', iconColor: 'text-blue-400' },
  kategori: { activeBg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', iconColor: 'text-indigo-400' },
  cost_center: { activeBg: 'bg-emerald-600', shadow: 'shadow-emerald-600/20', iconColor: 'text-emerald-400' },
  scan_qr: { activeBg: 'bg-violet-600', shadow: 'shadow-violet-600/20', iconColor: 'text-violet-400' },
  scan_nfc: { activeBg: 'bg-purple-600', shadow: 'shadow-purple-600/20', iconColor: 'text-purple-400' },
  preview_forms: { activeBg: 'bg-cyan-600', shadow: 'shadow-cyan-600/20', iconColor: 'text-cyan-400' },
  it_problem: { activeBg: 'bg-rose-600', shadow: 'shadow-rose-600/20', iconColor: 'text-rose-400' },
  compare: { activeBg: 'bg-amber-600', shadow: 'shadow-amber-600/20', iconColor: 'text-amber-400' },
  stamps: { activeBg: 'bg-orange-600', shadow: 'shadow-orange-600/20', iconColor: 'text-orange-400' },
  thermal: { activeBg: 'bg-teal-600', shadow: 'shadow-teal-600/20', iconColor: 'text-teal-400' },
  recycle: { activeBg: 'bg-red-600', shadow: 'shadow-red-600/20', iconColor: 'text-red-400' },
  settings: { activeBg: 'bg-slate-755', shadow: 'shadow-slate-700/20', iconColor: 'text-slate-400' },
  backup: { activeBg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', iconColor: 'text-indigo-400' },
  roles: { activeBg: 'bg-cyan-600', shadow: 'shadow-cyan-600/20', iconColor: 'text-cyan-400' },
  help: { activeBg: 'bg-sky-600', shadow: 'shadow-sky-600/20', iconColor: 'text-sky-400' }
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

  return (
    <>
      <SidebarHeader className="border-b border-slate-900 bg-slate-950 text-white shrink-0 shadow-lg z-10">
        <div className="flex items-center gap-3 p-3">
            <Link href="/" className="flex items-center gap-3 min-w-0">
                <div className="bg-white rounded-xl p-1.5 shadow-xl ring-2 ring-white/10 shrink-0">
                  <Image src="/cgi.png" alt="Logo" width={28} height={28} priority />
                </div>
                <div className="flex flex-col min-w-0 group-data-[collapsible=icon]:hidden text-left">
                  <span className="text-xs font-black uppercase tracking-wider leading-none truncate text-white">
                      {fullCompanyName}
                  </span>
                  <span className="text-[7.5px] font-black text-indigo-400 tracking-[0.25em] uppercase truncate mt-1">Asset Control</span>
                </div>
            </Link>
             <SidebarTrigger className="hidden md:flex rounded-full text-white hover:bg-white/10 hover:text-white ml-auto transition-transform active:scale-95" />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-slate-950 text-slate-300 selection:bg-slate-800 custom-scrollbar border-r border-slate-900">
        <div className="w-full">
          <SidebarMenu className="gap-1 px-2 py-4">
            {filteredMainItems.map((item) => {
              const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
              const colors = itemColorMap[item.id] || { activeBg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', iconColor: 'text-indigo-400' };
              return (
                <div key={item.id} className="w-full">
                  <SidebarMenuItem className="list-none">
                    <Link 
                      href={item.href}
                      className={cn(
                        "w-full px-3 py-2 rounded-xl flex items-center gap-3 transition-all duration-200 group relative",
                        isActive 
                          ? `${colors.activeBg} text-white font-extrabold shadow-lg ${colors.shadow} scale-[1.02]` 
                          : "text-slate-400 hover:text-white hover:bg-slate-900/80 font-semibold"
                      )}
                    >
                      <span className={cn(
                        "p-1.5 rounded-lg flex items-center justify-center shrink-0 transition-all duration-300",
                        isActive 
                          ? "bg-white/20 text-white" 
                          : `bg-slate-900 border border-slate-800/80 ${colors.iconColor} group-hover:scale-110 group-hover:border-slate-700`
                      )}>
                        <item.icon className="size-4 shrink-0" />
                      </span>
                      <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] uppercase tracking-wider truncate font-semibold">{item.label}</span>
                      {item.badge && <span className="h-2 w-2 rounded-full bg-rose-400 animate-pulse shadow-[0_0_10px_rgba(251,113,133,0.8)]" />}
                      {item.count && item.count > 0 ? (
                          <span className={cn(
                              "text-[9px] font-black rounded-lg h-5 min-w-[20px] px-1 flex items-center justify-center shadow-md",
                              isActive
                                ? "bg-white text-slate-900"
                                : item.urgent ? "bg-rose-600 text-white animate-bounce" : "bg-slate-900 text-slate-300 border border-slate-800"
                          )}>
                              {item.count}
                          </span>
                      ) : null}
                    </Link>
                  </SidebarMenuItem>
                </div>
              );
            })}

            {filteredSystemItems.length > 0 && (
              <div className="mt-6 border-t border-slate-900/60 pt-4">
                <Collapsible open={isSystemOpen} onOpenChange={setIsSystemOpen} className="w-full group/collapsible">
                  <SidebarMenuItem className="list-none">
                    <CollapsibleTrigger asChild>
                      <button 
                        className={cn(
                          "w-full px-3 py-2.5 rounded-xl flex items-center gap-3 transition-all duration-200 group text-slate-400 hover:text-white hover:bg-slate-900/80 font-semibold",
                          isSystemOpen && "bg-slate-900/40 text-slate-200"
                        )}
                      >
                        <span className={cn(
                          "p-1.5 rounded-lg flex items-center justify-center shrink-0 bg-slate-900 border border-slate-800 text-slate-400 group-hover:text-white",
                          isSystemOpen && "border-slate-700 text-white"
                        )}>
                          <Layers className={cn("size-4 transition-transform duration-500", isSystemOpen && "rotate-180")} />
                        </span>
                        <span className="flex-1 group-data-[collapsible=icon]:hidden text-[11px] uppercase tracking-wider text-left font-semibold">Sistem & Settings</span>
                        <ChevronRight className={cn("ml-auto h-4 w-4 transition-transform duration-500 group-data-[collapsible=icon]:hidden text-slate-500", isSystemOpen && "rotate-90 text-white")} />
                      </button>
                    </CollapsibleTrigger>
                  </SidebarMenuItem>
                  <CollapsibleContent className="animate-in fade-in slide-in-from-top-2 duration-300">
                    <SidebarMenu className="mt-1.5 gap-1 pl-4 pr-1">
                      {filteredSystemItems.map((item) => {
                        const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href.split('?')[0]));
                        const colors = itemColorMap[item.id] || { activeBg: 'bg-indigo-600', shadow: 'shadow-indigo-600/20', iconColor: 'text-indigo-400' };
                        return (
                          <SidebarMenuItem key={item.id} className="list-none">
                            <Link 
                              href={item.href}
                              className={cn(
                                "w-full px-3 py-1.5 rounded-xl flex items-center gap-2.5 transition-all duration-200 group",
                                isActive 
                                  ? `${colors.activeBg} text-white font-extrabold shadow-md ${colors.shadow} scale-[1.01]` 
                                  : "text-slate-500 hover:text-slate-200 hover:bg-slate-900/40 font-medium"
                              )}
                            >
                              <span className={cn(
                                "p-1 rounded-md flex items-center justify-center shrink-0 transition-all duration-300",
                                isActive 
                                  ? "bg-white/20 text-white" 
                                  : `bg-slate-950 border border-slate-900 ${colors.iconColor} group-hover:scale-105 group-hover:border-slate-800`
                              )}>
                                <item.icon className="size-3.5 shrink-0" />
                              </span>
                              <span className="flex-1 group-data-[collapsible=icon]:hidden text-[10px] uppercase tracking-wider truncate font-semibold">{item.label}</span>
                              {item.count && item.count > 0 ? (
                                  <span className={cn(
                                      "text-[8px] font-black rounded-full h-4 min-w-[16px] px-0.5 flex items-center justify-center shadow-sm",
                                      isActive ? "bg-white text-slate-900" : "bg-slate-950 text-slate-400"
                                  )}>
                                      {item.count}
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

      <SidebarSeparator className="bg-slate-900 h-px mx-4 opacity-50" />

      <SidebarFooter className="bg-slate-950 text-slate-400 p-3 border-t border-slate-900">
        {user && (
          <div className="mx-1 mb-3 p-3 rounded-2xl bg-slate-900/60 border border-slate-850/50 backdrop-blur-md flex items-center gap-3 group-data-[collapsible=icon]:hidden">
            <div className="h-9 w-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-blue-600 to-emerald-500 flex items-center justify-center text-white font-black text-xs uppercase shadow-md shadow-indigo-500/10">
              {userData?.name?.substring(0, 2) || user.email?.substring(0, 2) || 'AD'}
            </div>
            <div className="flex flex-col min-w-0 text-left">
              <span className="text-[10px] font-black text-white uppercase tracking-tight truncate leading-tight">{userData?.name || 'Administrator'}</span>
              <span className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mt-0.5">{userData?.role || 'Admin'}</span>
            </div>
          </div>
        )}
        
        <SidebarMenu className="gap-2">
            <SidebarMenuItem className="list-none">
                <button 
                  onClick={handleLogout} 
                  className="w-full px-3 py-2.5 rounded-xl bg-slate-900/40 border border-slate-850/30 text-rose-400 hover:text-white hover:bg-rose-600 hover:shadow-lg hover:shadow-rose-600/20 font-black text-[10px] uppercase tracking-widest flex items-center justify-center gap-2.5 transition-all duration-200 active:scale-95 group"
                >
                  <LogOut className="size-4 group-hover:translate-x-0.5 transition-transform" />
                  <span className="group-data-[collapsible=icon]:hidden font-semibold">Keluar Sistem</span>
                </button>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="p-3 text-center group-data-[collapsible=icon]:hidden">
          <div className="text-[9px] font-bold uppercase tracking-widest text-slate-600">
            Build Ver. {appVersion}
          </div>
          <div className="text-[10px] text-slate-500 font-black mt-1 uppercase tracking-widest">
            {fullCompanyName}
          </div>
        </div>
      </SidebarFooter>
    </>
  );
}
