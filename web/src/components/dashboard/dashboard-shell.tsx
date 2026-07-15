'use client';

import { useEffect, useState, ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { SidebarProvider, Sidebar, SidebarInset } from '@/components/ui/sidebar';
import Header from './header';
import SidebarNav from './sidebar-nav';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { ArrowUp, Loader2 } from 'lucide-react';

/**
 * @fileOverview Komponen Shell Utama Aplikasi.
 * Menjamin persistensi Sidebar dan Header dengan memisahkan loader dari struktur navigasi.
 */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);

  // Daftar halaman publik
  const isPublicPage = pathname.startsWith('/public/') || pathname === '/login' || pathname === '/register';
  
  // Sidebar ditampilan jika bukan halaman publik (dan user login ATAU masih loading di halaman privat)
  const showSidebar = !isPublicPage && (user !== null || loading);

  useEffect(() => {
    const toggleVisibility = () => {
      if (window.pageYOffset > 300) setIsVisible(true);
      else setIsVisible(false);
    };
    window.addEventListener('scroll', toggleVisibility);
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <SidebarProvider defaultOpen={showSidebar}>
      <div className="flex flex-col h-screen w-full overflow-hidden bg-background">
        {/* Header hanya muncul jika bukan halaman publik */}
        {!isPublicPage && <Header />}

        <div className="flex flex-1 overflow-hidden">
          {/* Sidebar tetap dirender jika showSidebar true. 
              PENTING: Jangan letakkan loading check di atas block ini agar sidebar tidak hilang saat navigasi. */}
          {showSidebar && (
            <Sidebar side="left" variant="sidebar" collapsible="icon">
              <SidebarNav />
            </Sidebar>
          )}

          <SidebarInset className={cn(
            "flex-1 flex flex-col overflow-hidden bg-slate-50 dark:bg-slate-900 transition-colors duration-300 relative",
            !isPublicPage && "bg-teal-700 dark:bg-teal-900"
          )}>
            <div className={cn(
              "flex-1 overflow-y-auto relative custom-scrollbar",
              !isPublicPage && "m-3 ml-0 bg-slate-50 dark:bg-slate-900 rounded-r-[24px] rounded-l-none border-y border-r border-slate-200/20 shadow-[0_10px_40px_rgba(0,0,0,0.06)]"
            )}>
              {/* Loader diletakkan di dalam area konten utama agar tidak menutup menu/header */}
              {loading ? (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/50 backdrop-blur-sm z-50 gap-4">
                  <svg className="pl" viewBox="0 0 240 240">
                      <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
                      <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
                      <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                      <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                  </svg>
                  <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-[10px]">Sinkronisasi Identitas...</p>
                </div>
              ) : (
                <div className={cn(
                  "p-4 md:p-10 lg:p-12 min-h-full pb-40 transition-all duration-500",
                  isPublicPage && "p-0 md:p-0 lg:p-0"
                )}>
                  {children}
                </div>
              )}
            </div>
            
            {!isPublicPage && (
              <Button
                variant="default"
                size="icon"
                onClick={scrollToTop}
                className={cn(
                  'fixed bottom-8 right-8 z-50 rounded-full shadow-2xl transition-all duration-500 bg-primary hover:bg-primary/90 text-white hover:scale-110 active:scale-95 border-4 border-white dark:border-slate-800',
                  isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-10 scale-50 pointer-events-none'
                )}
              >
                <ArrowUp className="h-6 w-6" />
              </Button>
            )}
          </SidebarInset>
        </div>
      </div>
    </SidebarProvider>
  );
}
