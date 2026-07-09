
'use client';

import { useEffect, type ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import { Loader2 } from 'lucide-react';
import Header from './header';
import SidebarNav from './sidebar-nav';
import { useToast } from '@/hooks/use-toast';
import { auth } from '@/lib/firebase/config';

export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  useEffect(() => {
    if (!loading) {
      if (!user) {
        router.push('/login');
      } else if (user.role === 'Pending') {
        toast({
          variant: 'destructive',
          title: 'Akun Belum Aktif',
          description: 'Akun Anda sedang menunggu persetujuan dari administrator.',
        });
        auth.signOut(); // Sign out the user
        router.push('/login');
      }
    }
  }, [user, loading, router, toast]);

  if (loading || !user || user.role === 'Pending') {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-transparent">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider defaultOpen={true}>
      <Sidebar side="left" variant="sidebar" collapsible="icon">
        <SidebarNav />
      </Sidebar>
      <SidebarInset>
        <div className="flex flex-col min-h-screen bg-transparent">
          <Header />
          <main className="flex-1 p-4 md:p-6">{children}</main>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}
