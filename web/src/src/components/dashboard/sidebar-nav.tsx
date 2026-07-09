
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
  Droplets,
  Database,
  Printer,
  Laptop,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/use-auth';
import { useEffect, useState } from 'react';
import { collection, doc, getDoc, onSnapshot, query, where, QueryConstraint } from 'firebase/firestore';
import { db, auth } from '@/lib/firebase/config';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import Image from 'next/image';
import type { User, Asset } from '@/lib/types';
import { useToast } from '@/hooks/use-toast';

const playNotificationSound = () => {
    const audio = document.getElementById('notification-sound') as HTMLAudioElement;
    if (audio) {
      audio.play().catch(error => console.error("Error playing sound:", error));
    }
};

export default function SidebarNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { user } = useAuth();
  const [userData, setUserData] = useState<Partial<User> | null>(null);
  const [waitingCount, setWaitingCount] = useState(0);
  const [helpdeskWaitingCount, setHelpdeskWaitingCount] = useState(0);
  const [inventoryRequestCount, setInventoryRequestCount] = useState(0);
  const [pendingUserCount, setPendingUserCount] = useState(0);
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
  }, [user]);

  // Listener for mutation waiting list count
  useEffect(() => {
    if (!user) return;

    const waitingStatuses: Asset['status'][] = ['waiting_mutasi', 'waiting_disposal', 'karyawan_approved', 'waiting_edit', 'waiting_creation'];
    const q = query(collection(db, 'assets'), where('status', 'in', waitingStatuses));

    const unsubscribe = onSnapshot(q, (snapshot) => {
        let relevantDocs = snapshot.docs;
        const isAdmin = user.role === 'Admin';
        const isAccounting = user.department === 'ACCOUNTING';
        const isManagerOrKaryawan = user.role === 'Manager' || user.role === 'Section Head' || user.role === 'Karyawan';

        if (!isAdmin && !isAccounting) {
            if(isManagerOrKaryawan && user.department) {
                let userDepartments: string[];
                 if (['APP', 'R&D', 'APP-R&D'].includes(user.department)) {
                    userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
                } else if (user.department === 'PPIC') {
                    userDepartments = ['PPIC', 'MAINTENANCE'];
                } else {
                    userDepartments = [user.department!];
                }

                relevantDocs = snapshot.docs.filter(doc => {
                    const asset = doc.data() as Asset;
                    if (asset.requestedBy === user.uid) return false;

                    const isMutationForDept = asset.status === 'waiting_mutasi' && asset.mutationTargetDepartment && userDepartments.includes(asset.mutationTargetDepartment);
                    const isOtherRequestInDept = (asset.status === 'waiting_disposal' || asset.status === 'waiting_edit' || asset.status === 'waiting_creation') && userDepartments.includes(asset.location);
                    
                    return isMutationForDept || isOtherRequestInDept;
                });
            } else {
                relevantDocs = [];
            }
        } else if (isAccounting) {
             relevantDocs = snapshot.docs.filter(doc => {
                const asset = doc.data() as Asset;
                return asset.status === 'waiting_mutasi' || asset.status === 'waiting_disposal';
             });
        }
        
        setWaitingCount(relevantDocs.length);
    });

    return () => unsubscribe();
  }, [user]);
  
  // Listener for IT Helpdesk waiting list count
  useEffect(() => {
    if (user?.role !== 'Admin') {
        setHelpdeskWaitingCount(0);
        return;
    };

    const q = query(collection(db, 'helpdesk_tickets'), where('status', '==', 'Menunggu'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setHelpdeskWaitingCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);

  // Listener for Inventory Requests waiting list count
  useEffect(() => {
    if (!user || (user.role !== 'Admin' && user.department !== 'HR & GA')) {
        setInventoryRequestCount(0);
        return;
    }

    const q = query(collection(db, 'inventory_requests'), where('status', '==', 'Menunggu Persetujuan HRGA'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        setInventoryRequestCount(snapshot.size);
    });

    return () => unsubscribe();
  }, [user]);
  
    // Listener for new user registrations
  useEffect(() => {
    if (user?.role !== 'Admin') {
      setPendingUserCount(0);
      return;
    }

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

  const handleResetPassword = async () => {
    if (user && user.email) {
      try {
        await sendPasswordResetEmail(auth, user.email);
        toast({
          title: 'Email Terkirim',
          description: `Email untuk reset password telah dikirim ke ${user.email}.`,
        });
      } catch (error) {
        console.error("Error sending password reset email:", error);
        toast({
          variant: 'destructive',
          title: 'Gagal Mengirim Email',
          description: 'Terjadi kesalahan. Silakan coba lagi nanti.',
        });
      }
    }
  };

  const getInitials = (name?: string | null, email?: string | null) => {
    if (name) return name.charAt(0).toUpperCase();
    if (email) return email.charAt(0).toUpperCase();
    return 'U';
  };
  
  const isAdmin = userData?.role === 'Admin';


  return (
    <>
      <SidebarHeader className="border-b border-sidebar-border">
        <div className="flex items-center justify-between p-2">
            <Link href="/" className="flex items-center gap-2">
                <Image src="/cgi.png" alt="CGI Logo" width={28} height={28} />
                <span className="text-xl font-bold font-headline group-data-[collapsible=icon]:hidden">
                    Asset_CGI
                </span>
            </Link>
             <SidebarTrigger className="hidden md:flex animate-pulse-blue rounded-full" />
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          <SidebarMenuItem>
            <Link href="/" passHref>
                <SidebarMenuButton
                isActive={pathname === '/'}
                tooltip="Dashboard"
                >
                <LayoutDashboard />
                <span>Dashboard</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/assets" passHref>
                <SidebarMenuButton
                isActive={pathname.startsWith('/assets')}
                tooltip="Aset"
                >
                <Package />
                <span>Aset</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/computer-details" passHref>
                <SidebarMenuButton
                isActive={pathname.startsWith('/computer-details')}
                tooltip="Aset IT"
                >
                <Laptop />
                <span>Aset IT</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/inventory" passHref>
                <SidebarMenuButton
                isActive={pathname.startsWith('/inventory')}
                tooltip="Inventaris"
                >
                <Archive />
                <span>Inventaris</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/inventory/requests" passHref>
                <SidebarMenuButton
                isActive={pathname.startsWith('/inventory/requests')}
                tooltip="Permintaan Barang"
                >
                <ShoppingCart />
                <span className="flex-1">Permintaan Barang</span>
                 {inventoryRequestCount > 0 && (
                    <>
                        <span className="ml-auto text-xs font-semibold text-destructive-foreground bg-destructive rounded-full h-5 w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                            {inventoryRequestCount}
                        </span>
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse hidden group-data-[collapsible=icon]:flex" />
                    </>
                )}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          {isAdmin && (
            <SidebarMenuItem>
              <Link href="/users" passHref>
                  <SidebarMenuButton
                  isActive={pathname === '/users'}
                  tooltip="Manajemen User"
                  >
                  <Users />
                  <span className="flex-1">Manajemen User</span>
                  {pendingUserCount > 0 && (
                    <>
                        <span className="ml-auto text-xs font-semibold text-destructive-foreground bg-destructive rounded-full h-5 w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                            {pendingUserCount}
                        </span>
                        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse hidden group-data-[collapsible=icon]:flex" />
                    </>
                  )}
                  </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <Link href="/mutations" passHref>
                <SidebarMenuButton
                isActive={pathname === '/mutations'}
                tooltip="Mutasi &amp; Disposal"
                className="relative"
                >
                <History />
                <span className="flex-1">Mutasi &amp; Disposal</span>
                
                {waitingCount > 0 && (
                  <>
                    <span className="ml-auto text-xs font-semibold text-destructive-foreground bg-destructive rounded-full h-5 w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                      {waitingCount}
                    </span>
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse hidden group-data-[collapsible=icon]:flex" />
                  </>
                )}
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/helpdesk" passHref>
              <SidebarMenuButton
                isActive={pathname.startsWith('/helpdesk')}
                tooltip="IT Helpdesk"
                className="relative"
              >
                <LifeBuoy />
                <span className="flex-1">IT Helpdesk</span>
                {helpdeskWaitingCount > 0 && (
                  <>
                    <span className="ml-auto text-xs font-semibold text-destructive-foreground bg-destructive rounded-full h-5 w-5 flex items-center justify-center group-data-[collapsible=icon]:hidden">
                      {helpdeskWaitingCount}
                    </span>
                    <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-destructive animate-pulse hidden group-data-[collapsible=icon]:flex" />
                  </>
                )}
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/inventory/report" passHref>
              <SidebarMenuButton
                isActive={pathname === '/inventory/report'}
                tooltip="Laporan Stok"
              >
                <FileText />
                <span>Laporan Stok</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/kategori" passHref>
                <SidebarMenuButton
                isActive={pathname === '/kategori'}
                tooltip="Kategori"
                >
                <Shapes />
                <span>Kategori</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/cost-center" passHref>
                <SidebarMenuButton
                isActive={pathname === '/cost-center'}
                tooltip="Cost Center"
                >
                <DollarSign />
                <span>Cost Center</span>
                </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
          <SidebarMenuItem>
            <Link href="/scan" passHref>
              <SidebarMenuButton
                isActive={pathname === '/scan'}
                tooltip="Scan QR Code"
              >
                <QrCode />
                <span>Scan QR</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/preview-forms" passHref>
              <SidebarMenuButton
                isActive={pathname === '/preview-forms'}
                tooltip="Pratinjau Form"
              >
                <ClipboardCheck />
                <span>Pratinjau Form</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           {isAdmin && (
            <SidebarMenuItem>
              <Link href="/compare-excel" passHref>
                <SidebarMenuButton
                  isActive={pathname === '/compare-excel'}
                  tooltip="Compare Data"
                >
                  <Database />
                  <span>Compare Data</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          )}
          <SidebarMenuItem>
            <Link href="/stamps" passHref>
              <SidebarMenuButton
                isActive={pathname === '/stamps'}
                tooltip="Stempel"
              >
                <FilePen />
                <span>Stempel</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
           <SidebarMenuItem>
            <Link href="/thermal-print-58" passHref>
              <SidebarMenuButton
                isActive={pathname === '/thermal-print-58'}
                tooltip="Thermal Print 58mm"
              >
                <Printer />
                <span>Thermal Print</span>
              </SidebarMenuButton>
            </Link>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarContent>
      <SidebarSeparator />
      <SidebarFooter>
        <SidebarMenu>
            {isAdmin && (
              <SidebarMenuItem>
                <Link href="/backup" passHref>
                    <SidebarMenuButton
                    isActive={pathname === '/backup'}
                    tooltip="Backup &amp; Restore"
                    >
                    <DatabaseBackup />
                    <span>Backup &amp; Restore</span>
                    </SidebarMenuButton>
                </Link>
              </SidebarMenuItem>
            )}
            <SidebarMenuItem>
                <Link href="/user-roles" passHref>
                    <SidebarMenuButton
                    isActive={pathname === '/user-roles'}
                    tooltip="Hak Akses"
                    >
                    <UserCog />
                    <span>Hak Akses</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
            <SidebarMenuItem>
                <Link href="/help" passHref>
                    <SidebarMenuButton
                    isActive={pathname === '/help'}
                    tooltip="Bantuan"
                    >
                    <HelpCircle />
                    <span>Bantuan</span>
                    </SidebarMenuButton>
                </Link>
            </SidebarMenuItem>
        </SidebarMenu>
        <div className="hidden md:flex flex-col">
            <Button onClick={handleLogout} variant="ghost" className="w-full justify-start items-center gap-3 p-2 h-auto text-left group-data-[collapsible=icon]:w-auto group-data-[collapsible=icon]:justify-center">
                <LogOut className="h-5 w-5" />
                <span className="group-data-[collapsible=icon]:hidden">Keluar</span>
            </Button>
        </div>
      </SidebarFooter>
    </>
  );
}
