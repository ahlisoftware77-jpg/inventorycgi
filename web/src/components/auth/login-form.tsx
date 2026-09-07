'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase/config';

import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Mail, Lock, ShieldCheck, ChevronRight } from 'lucide-react';
import type { User } from '@/lib/types';
import Image from 'next/image';
import { Card, CardContent, CardHeader } from '@/components/ui/card';

const formSchema = z.object({
  email: z.string().email({ message: 'Format email tidak valid.' }),
  password: z.string().min(6, { message: 'Password minimal 6 karakter.' }),
});

export function LoginForm() {
  const router = useRouter();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [companyName, setCompanyName] = useState('Sistem Aset');

  useEffect(() => {
    // Listen to general settings for company name even before login
    const generalDocRef = doc(db, 'settings', 'general');
    const unsub = onSnapshot(generalDocRef, (docSnap) => {
        if (docSnap.exists() && docSnap.data().companyName) {
            setCompanyName(docSnap.data().companyName);
        }
    });
    return () => unsub();
  }, []);

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const userCredential = await signInWithEmailAndPassword(auth, values.email, values.password);
      
      const userDocRef = doc(db, 'users', userCredential.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        const userData = userDocSnap.data() as User;
        if (userData.role === 'Pending') {
          await auth.signOut();
          toast({
            variant: 'destructive',
            title: 'Akun Belum Disetujui',
            description: 'Akun Anda sedang menunggu persetujuan dari Admin.',
          });
        } else {
          toast({
            title: 'Login Berhasil',
            description: 'Selamat datang kembali!',
          });
          router.push('/');
        }
      } else {
        await auth.signOut();
        throw new Error('Data pengguna tidak ditemukan. Hubungi administrator.');
      }

    } catch (error: any) {
      console.error('Login error:', error);
      let errorMessage = 'Email atau password salah. Silakan coba lagi.';
      if (error.message.includes('Data pengguna tidak ditemukan')) {
          errorMessage = error.message;
      }
      toast({
        variant: 'destructive',
        title: 'Login Gagal',
        description: errorMessage,
      });
    } finally {
      setIsLoading(false);
    }
  }

  const handleForgotPassword = async () => {
    const email = form.getValues('email');
    if (!email) {
      toast({
        variant: 'destructive',
        title: 'Email Kosong',
        description: 'Silakan masukkan email Anda terlebih dahulu.',
      });
      return;
    }
    try {
      await sendPasswordResetEmail(auth, email);
      toast({
        title: 'Email Terkirim',
        description: 'Tautan reset password telah dikirim ke email Anda.',
      });
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Gagal mengirim email reset password.',
      });
    }
  };

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  return (
    <Card className="w-full max-w-[400px] border-none shadow-2xl bg-white/90 dark:bg-slate-950/90 backdrop-blur-xl rounded-[2.5rem] overflow-hidden animate-in fade-in zoom-in duration-700">
      <CardHeader className="pt-10 pb-6 flex flex-col items-center space-y-4">
        <div className="bg-transparent mb-2">
          <Image src="/cgi2.png" alt="Logo" width={90} height={90} className="object-contain" />
        </div>
        <div className="text-center space-y-1">
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white uppercase line-clamp-2" style={{ fontFamily: 'CGIFont' }}>{companyName}</h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.2em]">Management Control Panel</p>
        </div>
      </CardHeader>
      
      <CardContent className="px-8 pb-10">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
            <FormField
              control={form.control}
              name="email"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500 ml-1">Email Address</FormLabel>
                  <div className="relative group">
                    <Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-cyan-600 transition-colors" />
                    <FormControl>
                      <Input
                        {...field}
                        type="email"
                        placeholder="email@company.co.id"
                        className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-cyan-600/10 transition-all"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px] font-bold text-rose-500 pl-1" />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem className="space-y-1.5">
                  <div className="flex items-center justify-between px-1">
                    <FormLabel className="text-[10px] font-black uppercase tracking-widest text-slate-500">Security Key</FormLabel>
                    <button 
                      type="button" 
                      className="text-[10px] font-black text-cyan-600 hover:text-cyan-700 uppercase tracking-widest"
                      onClick={handleForgotPassword}
                    >
                      Lupa?
                    </button>
                  </div>
                  <div className="relative group">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300 group-focus-within:text-cyan-600 transition-colors" />
                    <FormControl>
                      <Input
                        {...field}
                        type="password"
                        placeholder="••••••••"
                        className="pl-11 h-12 bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 rounded-xl font-medium focus:ring-2 focus:ring-cyan-600/10 transition-all"
                      />
                    </FormControl>
                  </div>
                  <FormMessage className="text-[10px] font-bold text-rose-500 pl-1" />
                </FormItem>
              )}
            />

            <div className="pt-2 space-y-4">
              <Button 
                type="submit" 
                className="w-full h-12 bg-cyan-600 hover:bg-cyan-700 text-white font-black uppercase tracking-[0.2em] rounded-xl shadow-xl shadow-cyan-600/20 transition-all active:scale-95 flex items-center justify-center gap-2" 
                disabled={isLoading}
              >
                {isLoading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ShieldCheck className="h-5 w-5" />}
                Masuk Sistem
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-slate-100 dark:border-slate-800" />
                </div>
                <div className="relative flex justify-center text-[10px] uppercase font-black">
                  <span className="bg-white dark:bg-slate-950 px-4 text-slate-300">Atau Akses Lain</span>
                </div>
              </div>

              <Button 
                type="button" 
                variant="ghost"
                className="w-full h-12 rounded-xl font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all flex items-center justify-center gap-2"
                onClick={() => router.push('/register')}
              >
                Daftar Akun Baru <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
      
      <div className="px-8 py-4 bg-slate-50 dark:bg-slate-900/50 border-t flex items-center justify-center gap-2 grayscale opacity-40">
        <ShieldCheck className="h-3.5 w-3.5" />
        <span className="text-[9px] font-black uppercase tracking-widest text-slate-500">Encrypted Enterprise Access</span>
      </div>
    </Card>
  );
}
