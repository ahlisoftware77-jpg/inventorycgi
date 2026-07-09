
'use client';

import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import { LogOut, User as UserIcon, KeyRound, PanelLeft, LifeBuoy } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { signOut, sendPasswordResetEmail } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useRef } from 'react';
import { doc, getDoc, collection, query, where, onSnapshot, Timestamp } from 'firebase/firestore';
import type { User, Asset, HelpdeskTicket } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '../ui/toast';

const playNotificationSound = () => {
    const audio = document.getElementById('notification-sound') as HTMLAudioElement;
    if (audio) {
      audio.play().catch(error => console.error("Error playing sound:", error));
    }
};

export default function Header() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<Partial<User> | null>(null);
  const router = useRouter();
  const { toast } = useToast();
  
  const helpdeskTicketUpdatesCache = useRef<Map<string, number>>(new Map());

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

  // Admin notification listeners
  useEffect(() => {
    if (user?.role !== 'Admin') return;

    const unsubscribers: (() => void)[] = [];
    const listenerStartTime = Timestamp.now();

    // New user registrations
    const userQuery = query(collection(db, 'users'), where('role', '==', 'Pending'));
    const userUnsub = onSnapshot(userQuery, (snapshot) => {
         snapshot.docChanges().forEach((change) => {
            const newUser = change.doc.data() as User;
            const userCreationTime = (newUser as any).createdAt as Timestamp | undefined;
            // A crude way to check if user is new, since we don't store createdAt for users
            if (change.type === 'added' && (!userCreationTime || userCreationTime > listenerStartTime)) {
                 playNotificationSound();
                 toast({
                    title: 'Pendaftaran Baru',
                    description: `Pengguna "${newUser.name || newUser.email}" menunggu persetujuan.`,
                    action: <ToastAction altText="Lihat" onClick={() => router.push('/users')}>Lihat</ToastAction>,
                });
            }
        });
    });
    unsubscribers.push(userUnsub);


    // New asset waiting list items
    const assetQuery = query(collection(db, 'assets'), where('status', 'in', ['waiting_mutasi', 'waiting_disposal', 'karyawan_approved', 'waiting_creation', 'waiting_edit']));
    const assetUnsub = onSnapshot(assetQuery, (snapshot) => {
        snapshot.docChanges().forEach((change) => {
            if (change.type === 'added' || change.type === 'modified') {
                const asset = change.doc.data() as Asset;
                const requestedAt = asset.requestedAt;
                if (requestedAt && requestedAt > listenerStartTime) {
                    playNotificationSound();
                    toast({
                        title: 'Pengajuan Aset Baru',
                        description: `Aset "${asset.name}" (${asset.code}) menunggu persetujuan.`,
                        action: <ToastAction altText="Lihat" onClick={() => router.push('/mutations')}>Lihat</ToastAction>,
                    });
                }
            }
        });
    });
    unsubscribers.push(assetUnsub);
    
    // New helpdesk tickets and replies
    const helpdeskQuery = query(collection(db, 'helpdesk_tickets'));
    const helpdeskUnsub = onSnapshot(helpdeskQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        const ticket = change.doc.data() as HelpdeskTicket;
        
        // Notify on new ticket creation
        if (change.type === 'added' && ticket.reportedAt > listenerStartTime && ticket.status === 'Menunggu') {
          playNotificationSound();
          toast({
            title: 'Tiket Helpdesk Baru',
            description: `Tiket "${ticket.ticketNumber}" dari ${ticket.reporterName} butuh perhatian.`,
            action: <ToastAction altText="Lihat" onClick={() => router.push(`/helpdesk/${change.doc.id}`)}>Lihat</ToastAction>,
          });
        }
        
        // Notify on new reply from a non-admin
        if (change.type === 'modified') {
          const latestUpdate = ticket.updates && ticket.updates.length > 0 ? ticket.updates[ticket.updates.length - 1] : null;
          if (latestUpdate && latestUpdate.updatedBy !== user.uid && latestUpdate.updatedAt > listenerStartTime) {
             playNotificationSound();
             toast({
                title: `Balasan Baru di Tiket #${ticket.ticketNumber}`,
                description: `Oleh ${latestUpdate.updaterName}: "${latestUpdate.note.substring(0, 30)}..."`,
                action: <ToastAction altText="Lihat Tiket" onClick={() => router.push(`/helpdesk/${change.doc.id}`)}>Lihat</ToastAction>,
             });
          }
        }
      });
    });
    unsubscribers.push(helpdeskUnsub);


    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, toast, router]);

  // Karyawan & Manager notification listeners
  useEffect(() => {
    if (!user || user.role === 'Admin') return;
    
    const unsubscribers: (() => void)[] = [];
    const listenerStartTime = Timestamp.now();

    // --- 1. Listen for changes to asset requests made BY this user ---
    const submittedAssetQuery = query(collection(db, 'assets'), where('requestedBy', '==', user.uid));
    const submittedAssetUnsubscribe = onSnapshot(submittedAssetQuery, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'modified') {
          const after = change.doc.data() as Asset;
          const approvalTimestamp = after.approvedAt;

          if (approvalTimestamp && approvalTimestamp > listenerStartTime) {
             const isApproved = after.status.startsWith('approved_');
             const isRejected = after.status === 'Aktif'; // Assuming this is how rejection is marked

             let title = '', description = '';
              if (isApproved) {
                  title = 'Pengajuan Aset Disetujui';
                  description = `Pengajuan Anda untuk aset "${after.name}" telah disetujui.`;
              } else if (isRejected) {
                  title = 'Pengajuan Aset Ditolak';
                  description = `Pengajuan Anda untuk aset "${after.name}" ditolak.`;
              }

              if (title) {
                  playNotificationSound();
                  toast({
                      title: title,
                      description: description,
                      duration: 10000,
                      action: <ToastAction altText="Lihat Aset" onClick={() => router.push(`/assets/${change.doc.id}`)}>Lihat</ToastAction>,
                  });
              }
          }
        }
      });
    });
    unsubscribers.push(submittedAssetUnsubscribe);

    // --- 2. Listen for helpdesk ticket replies where the current user is the reporter ---
    const userTicketsQuery = query(collection(db, 'helpdesk_tickets'), where('reportedBy', '==', user.uid));
    const userTicketsUnsubscribe = onSnapshot(userTicketsQuery, (snapshot) => {
        snapshot.docChanges().forEach(change => {
            if (change.type === 'modified') {
                const ticket = change.doc.data() as HelpdeskTicket;
                const latestUpdate = ticket.updates?.[(ticket.updates?.length || 0) - 1];

                if (latestUpdate && latestUpdate.updatedBy !== user.uid && latestUpdate.updatedAt > listenerStartTime) {
                    playNotificationSound();
                    toast({
                        title: `Balasan Baru di Tiket #${ticket.ticketNumber}`,
                        description: `Oleh ${latestUpdate.updaterName}: "${latestUpdate.note.substring(0, 30)}..."`,
                        action: <ToastAction altText="Lihat Tiket" onClick={() => router.push(`/helpdesk/${change.doc.id}`)}>Lihat</ToastAction>,
                    });
                }
            }
        });
    });
    unsubscribers.push(userTicketsUnsubscribe);

    // --- 3. Listen for new items in THEIR asset waiting list (Managers/Karyawan) ---
    if (user.role === 'Karyawan' || user.role === 'Manager' || user.role === 'Section Head') {
      const waitingListQuery = query(collection(db, 'assets'), where('status', 'in', ['waiting_mutasi', 'waiting_disposal', 'waiting_edit', 'waiting_creation']));
      const waitingListUnsubscribe = onSnapshot(waitingListQuery, (snapshot) => {
           snapshot.docChanges().forEach((change) => {
               if (change.type === 'added' || change.type === 'modified') {
                  const asset = change.doc.data() as Asset;
                  const creationTimestamp = asset.requestedAt;
                  
                  if (creationTimestamp && creationTimestamp > listenerStartTime) {
                       let userDepartments: string[] = [];
                       if (user.department) {
                           if (['APP', 'R&D', 'APP-R&D'].includes(user.department)) userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
                           else if (user.department === 'PPIC') userDepartments = ['PPIC', 'MAINTENANCE'];
                           else userDepartments = [user.department];
                       }

                       const isRelevant = (asset.mutationTargetDepartment && userDepartments.includes(asset.mutationTargetDepartment)) || userDepartments.includes(asset.location);
                       if (isRelevant && asset.requestedBy !== user.uid) {
                            playNotificationSound();
                            toast({
                               title: `Pengajuan Baru untuk Departemen Anda`,
                               description: `Aset "${asset.name}" menunggu persetujuan Anda.`,
                               action: <ToastAction altText="Lihat" onClick={() => router.push('/mutations')}>Lihat</ToastAction>,
                           });
                       }
                  }
               }
           });
      });
      unsubscribers.push(waitingListUnsubscribe);
    }

    return () => unsubscribers.forEach(unsub => unsub());
  }, [user, toast, router]);


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

  return (
    <header className="sticky top-0 z-10 flex h-14 items-center gap-4 border-b bg-card px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 py-2">
      <SidebarTrigger className="md:hidden flex animate-pulse-blue rounded-full" />
      <div className="flex-1" />
      <div className="flex items-center gap-4">
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full">
                     <Avatar className="h-9 w-9">
                        <AvatarImage src={user?.photoURL || undefined} alt="User avatar" />
                        <AvatarFallback>{getInitials(user?.displayName, user?.email)}</AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" side="bottom" className="mb-2 w-56">
                <DropdownMenuLabel className='flex flex-col'>
                    <span className='font-bold'>{user?.displayName || user?.email}</span>
                    {userData && (
                    <>
                        <span className='text-xs text-muted-foreground font-normal'>{userData.role}</span>
                        <span className='text-xs text-muted-foreground font-normal'>{userData.department}</span>
                    </>
                    )}
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleResetPassword} className="cursor-pointer">
                    <KeyRound className="mr-2 h-4 w-4" />
                    <span>Reset Password</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleLogout} className="cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Keluar</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
