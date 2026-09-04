'use client';

import { useEffect, type ReactNode, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { auth, db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import type { User } from '@/lib/types';
import { Loader2 } from 'lucide-react';

/**
 * @fileOverview Komponen Guard Tata Letak.
 * Memeriksa hak akses halaman. Spinner hanya muncul di area konten, bukan seluruh layar.
 */
export default function DashboardLayout({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  useEffect(() => {
    if (loading) return;

    const isPublicPath = pathname.startsWith('/public/') || pathname === '/login' || pathname === '/register' || pathname === '/help';

    if (!user) {
      if (!isPublicPath) {
        router.push('/login');
      }
      return;
    }

    if (user.role === 'Pending') {
      toast({
        variant: 'destructive',
        title: 'Akun Belum Aktif',
        description: 'Akun Anda sedang menunggu persetujuan dari administrator.',
      });
      auth.signOut();
      router.push('/login');
      return;
    }

    // Kontrol Akses Halaman
    if (user.role !== 'Admin') {
      const allowedPages = user.allowedPages || [];
      let isPathAllowed = allowedPages.some(page => {
        if (page === '/') return pathname === '/';
        return pathname.startsWith(page);
      });

      // Bypass untuk halaman yang mengelola izinnya sendiri
      const selfManagedPages = ['/register-design', '/form-app'];
      if (selfManagedPages.some(page => pathname.startsWith(page))) {
        isPathAllowed = true;
      }

      const isDashboard = pathname === '/';

      if (!isPathAllowed && !isPublicPath && !isDashboard) {
        toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
        });
        router.push('/');
        return;
      }
    }
  }, [user, loading, pathname, router, toast]);

  // Jika sedang memuat data otentikasi awal, tampilkan spinner ringan di area konten
  if (loading) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center min-h-[400px] gap-4 animate-in fade-in duration-500">
        <Loader2 className="h-8 w-8 animate-spin text-primary opacity-20" />
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">Memvalidasi Otoritas...</p>
      </div>
    );
  }

  // Cek akses secara sinkron saat render untuk menghindari kedipan layout
  const isPublicPath = pathname.startsWith('/public/') || pathname === '/login' || pathname === '/register' || pathname === '/help';
  if (user) {
    if (user.role === 'Pending') return null;
    if (user.role !== 'Admin') {
      const allowedPages = user.allowedPages || [];
      let isPathAllowed = allowedPages.some(page => {
        if (page === '/') return pathname === '/';
        return pathname.startsWith(page);
      });
      
      const selfManagedPages = ['/register-design', '/form-app'];
      if (selfManagedPages.some(page => pathname.startsWith(page))) {
        isPathAllowed = true;
      }

      const isDashboard = pathname === '/';
      if (!isPathAllowed && !isPublicPath && !isDashboard) return null;
    }
  }

  return <>{children}</>;
}
