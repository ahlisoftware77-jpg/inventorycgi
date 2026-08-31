'use client';

import { Button } from '@/components/ui/button';
import { LogOut, KeyRound, Menu, LogIn, ShieldCheck, Cpu, Sparkles, Bell } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { auth, db } from '@/lib/firebase/config';
import { useRouter } from 'next/navigation';
import { useEffect, useState, useMemo } from 'react';
import { doc, onSnapshot } from 'firebase/firestore';
import { sendPasswordResetEmail, signOut } from 'firebase/auth';
import type { User } from '@/lib/types';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useSidebar } from '@/components/ui/sidebar';
import { useToast } from '@/hooks/use-toast';
import { ThemeToggle } from './theme-toggle';
import { cn } from '@/lib/utils';
import Image from 'next/image';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';

export default function Header() {
  const { user } = useAuth();
  const [userData, setUserData] = useState<Partial<User> | null>(null);
  const [companyName, setCompanyName] = useState('SISTEM ASET');
  const [marqueeText, setMarqueeText] = useState('Selamat Datang di Sistem Manajemen Aset.');
  const [marqueeEffect, setMarqueeEffect] = useState('classic');
  const [marqueeBehavior, setMarqueeBehavior] = useState('scroll');
  const [marqueeSpeed, setMarqueeSpeed] = useState('normal');
  
  const [currentLineIndex, setCurrentLineIndex] = useState(0);
  
  const router = useRouter();
  const { toast } = useToast();
  const { toggleSidebar, state } = useSidebar();

  useEffect(() => {
    const generalDocRef = doc(db, 'settings', 'general');
    const unsubGeneral = onSnapshot(generalDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().companyName) {
            setCompanyName(docSnap.data().companyName);
        }
    });

    const marqueeDocRef = doc(db, 'settings', 'marquee');
    const unsubMarquee = onSnapshot(marqueeDocRef, (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();
            if (data.text) setMarqueeText(data.text);
            if (data.effect) setMarqueeEffect(data.effect);
            if (data.behavior) setMarqueeBehavior(data.behavior);
            if (data.speed) setMarqueeSpeed(data.speed);
        }
    });

    return () => {
        unsubGeneral();
        unsubMarquee();
    };
  }, []);

  useEffect(() => {
    if (user) {
      const unsubUser = onSnapshot(doc(db, 'users', user.uid), (docSnap) => {
        if (docSnap.exists()) {
          setUserData(docSnap.data());
        }
      });
      return () => unsubUser();
    }
  }, [user]);

  const lines = useMemo(() => {
    return marqueeText.split('\n').filter(line => line.trim() !== '');
  }, [marqueeText]);

  const isContinuous = ['scroll', 'blink'].includes(marqueeBehavior);

  useEffect(() => {
    if (lines.length <= 1 || isContinuous) {
      setCurrentLineIndex(0);
      return;
    }

    const interval = setInterval(() => {
      setCurrentLineIndex((prev) => (prev + 1) % lines.length);
    }, 6000);

    return () => clearInterval(interval);
  }, [lines.length, isContinuous]);

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

  const getMarqueeEffectClass = () => {
    switch (marqueeEffect) {
      case 'gradient': return 'marquee-effect-gradient';
      case 'neon': return 'marquee-effect-neon';
      case 'glass': return 'marquee-effect-glass';
      case 'cyber': return 'marquee-effect-cyber';
      default: return 'text-white';
    }
  };

  const getBehaviorClasses = () => {
    let classes = '';
    
    switch (marqueeBehavior) {
      case 'fixed': classes = ''; break;
      case 'bounce': classes = 'animate-bounce-text'; break;
      case 'fade': classes = 'animate-fade-in-out'; break;
      case 'slide': classes = 'animate-slide-in-out'; break;
      case 'typewriter': classes = 'animate-typewriter overflow-hidden whitespace-nowrap border-r-2 border-white/50 w-fit mx-auto'; break;
      case 'blink': classes = 'animate-blink'; break;
      default:
        switch (marqueeSpeed) {
          case 'slow': classes = 'animate-marquee-slow'; break;
          case 'fast': classes = 'animate-marquee-fast'; break;
          default: classes = 'animate-marquee-normal'; break;
        }
    }

    return classes;
  };

  const displayContent = isContinuous 
    ? lines.join(' \u00A0\u00A0\u00A0\u00A0\u2022\u00A0\u00A0\u00A0\u00A0 ') 
    : (lines[currentLineIndex] || '');

  return (
    <header className="z-50 sticky top-0 flex h-16 shrink-0 items-center justify-between gap-2 sm:gap-4 border-b border-teal-800 bg-teal-700 dark:bg-teal-950 pl-3 pr-2 sm:pl-3 sm:pr-6 shadow-xl transition-all duration-300">
      <div className="flex items-center gap-1 sm:gap-4 min-w-0">
        {user ? (
          <div className="flex items-center gap-1 sm:gap-2 min-w-0">
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={toggleSidebar}
              className="rounded-xl hover:bg-white/10 h-10 w-10 shrink-0 text-white transition-all active:scale-95"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 sm:gap-3 ml-1 sm:ml-2 min-w-0">
                <Image src="/icon-512x512.png" alt="Logo" width={24} height={24} className="opacity-90 shrink-0 drop-shadow-lg sm:w-7 sm:h-7" />
                <span className="hidden sm:inline-block text-white font-black uppercase tracking-tight text-[11px] sm:text-base truncate max-w-[100px] sm:max-w-[450px] italic">{companyName}</span>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <Link href="/" className="flex items-center gap-2 sm:gap-3 min-w-0">
              <Image src="/icon-512x512.png" alt="Logo" width={28} height={28} className="shrink-0 drop-shadow-lg sm:w-8 sm:h-8" />
              <span className="hidden sm:inline-block text-white font-black uppercase tracking-tight text-xs sm:text-base truncate max-w-[150px] sm:max-w-500 italic">{companyName}</span>
            </Link>
          </div>
        )}
      </div>
      
      <div className="flex flex-1 min-w-0 h-8 sm:h-9 relative bg-black/15 dark:bg-black/40 rounded-full border border-white/10 overflow-hidden mx-1 sm:mx-6">
        <div className={cn(
            "absolute inset-0 flex items-center whitespace-nowrap",
            isContinuous ? "" : "justify-center"
        )}>
            <div className={cn(
                "flex w-max",
                getBehaviorClasses()
            )} key={isContinuous ? `continuous-${marqueeText}-${marqueeBehavior}-${marqueeSpeed}-${marqueeEffect}` : `${currentLineIndex}-${marqueeBehavior}-${marqueeSpeed}-${marqueeEffect}`}>
                <p className={cn(
                    "text-[10px] sm:text-[12px] font-black uppercase tracking-widest",
                    marqueeBehavior === 'typewriter' ? "px-0" : "px-6 sm:px-16",
                    getMarqueeEffectClass()
                )}>
                    {displayContent}
                </p>
                {isContinuous && (
                    <p className={cn(
                        "text-[10px] sm:text-[12px] font-black px-6 sm:px-16 uppercase tracking-widest",
                        getMarqueeEffectClass()
                    )} aria-hidden="true">
                        {displayContent}
                    </p>
                )}
            </div>
        </div>
      </div>
      
      <div className="flex items-center gap-1 sm:gap-4 shrink-0">
        {/* Quick AI Assistant Trigger in Header */}
        <button
          onClick={() => {
            const fab = document.getElementById('ai-copilot-fab');
            if (fab) fab.click();
          }}
          className="relative hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-500/20 via-indigo-500/20 to-purple-500/20 border border-teal-400/40 text-teal-200 hover:border-teal-300 transition-all hover:scale-105 active:scale-95 group shadow-md cursor-pointer select-none"
          title="Buka Asisten AI Copilot"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-teal-400 opacity-80"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-teal-400"></span>
          </span>
          <Sparkles className="w-3.5 h-3.5 text-teal-300 animate-pulse group-hover:rotate-12 transition-transform" />
          <span className="text-[10px] font-black uppercase tracking-wider text-teal-100 group-hover:text-white">AI Copilot</span>
          <span className="text-[7.5px] font-black uppercase px-1.5 py-0.2 rounded-full bg-indigo-500/40 text-indigo-200 border border-indigo-400/30">PRO</span>
        </button>

        <div className="hidden sm:block">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => {
              if (typeof window !== 'undefined' && 'Notification' in window) {
                Notification.requestPermission().then(permission => {
                  if (permission === 'granted') {
                    toast({ title: "Notifikasi Aktif", description: "Sistem notifikasi OS sudah diaktifkan." });
                  } else {
                    toast({ title: "Akses Ditolak", description: "Anda memblokir akses notifikasi pada browser.", variant: "destructive" });
                  }
                });
              }
            }}
            title="Aktifkan Notifikasi Windows"
            className="text-white hover:bg-white/20 hover:text-white rounded-full h-9 w-9"
          >
            <Bell className="h-4 w-4" />
          </Button>
        </div>
        <div className="hidden sm:block">
          <ThemeToggle />
        </div>
        <div className="h-8 w-px bg-white/10 hidden sm:block" />
        {user ? (
          <DropdownMenu>
              <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-9 w-9 sm:h-10 sm:w-10 rounded-xl p-0 border-2 border-white/20 hover:border-white/40 transition-all active:scale-95 shadow-lg overflow-hidden">
                       <Avatar className="h-full w-full rounded-none">
                          <AvatarImage src={user?.photoURL || undefined} alt="User avatar" />
                          <AvatarFallback className="bg-teal-800 text-white font-black text-[10px] sm:text-xs">{getInitials(user?.displayName, user?.email)}</AvatarFallback>
                      </Avatar>
                  </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64 rounded-[1.5rem] p-2 shadow-2xl border-slate-100 dark:border-slate-800 text-black">
                  <DropdownMenuLabel className='flex flex-col gap-1 p-4 text-left'>
                      <span className='font-black text-slate-900 dark:text-white uppercase tracking-tight text-sm text-left'>{user?.displayName || user?.email}</span>
                      {userData && (
                      <div className="mt-2 flex flex-col gap-1.5 items-start">
                          <Badge variant="outline" className='text-[8px] font-black uppercase tracking-[0.2em] bg-emerald-500/10 text-emerald-600 border-emerald-500/20 px-3 py-0.5 rounded-full'>
                            <ShieldCheck className="h-2.5 w-2.5 mr-1" /> {userData.role}
                          </Badge>
                          <span className='text-[10px] text-muted-foreground font-black uppercase tracking-widest pl-1'>{userData.department}</span>
                      </div>
                      )}
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem onClick={handleResetPassword} className="cursor-pointer gap-3 py-3 rounded-xl hover:bg-blue-50 transition-colors">
                      <KeyRound className="h-4 w-4 text-blue-500" />
                      <span className="font-black text-[10px] uppercase tracking-widest text-slate-700 dark:text-slate-200">Keamanan & Sandi</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800" />
                  <DropdownMenuItem onClick={handleLogout} className="cursor-pointer gap-3 py-3 rounded-xl text-rose-600 focus:text-rose-600 focus:bg-rose-50 transition-colors">
                      <LogOut className="h-4 w-4" />
                      <span className="font-black text-[10px] uppercase tracking-widest">Keluar Sistem</span>
                  </DropdownMenuItem>
              </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <Button asChild className="rounded-xl bg-white text-teal-900 hover:bg-teal-50 font-black uppercase text-[9px] sm:text-[10px] tracking-widest px-4 sm:px-6 h-9 sm:h-10 shadow-xl active:scale-95 transition-all">
            <Link href="/login">
              <LogIn className="mr-1 sm:mr-2 h-3.5 w-3.5 sm:h-4 sm:w-4" /> Masuk
            </Link>
          </Button>
        )}
      </div>
    </header>
  );
}