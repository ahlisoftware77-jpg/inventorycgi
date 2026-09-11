'use client';

import { FormAppContent } from '@/app/form-app/page';
import DashboardLayout from '@/components/dashboard/layout';
import React, { Suspense, useState, useEffect } from 'react';
import { Loader2, Lock, ArrowRight } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

async function hashString(str: string) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function PublicFormDarContent() {
  const searchParams = useSearchParams();
  const shareId = searchParams.get('shareId');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // Jika tidak ada shareId, langsung tampilkan DAR form asalkan dia tau id-nya (sesuai behavior lama)
  // Atau kita bisa mengunci akses sepenuhnya tanpa shareId. Namun, untuk menjaga kompatibilitas link yang mungkin sudah dibagikan tanpa passcode sebelumnya,
  // kita tetap mengizinkan akses jika shareId tidak ada (opsional).
  // Di sini kita cek, jika ada shareId, maka Wajib login passcode.
  useEffect(() => {
    if (!shareId) {
      setIsAuthenticated(true);
      setInitialCheckDone(true);
    } else {
      setInitialCheckDone(true);
    }
  }, [shareId]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!shareId) return;
    
    setIsChecking(true);
    setError(false);
    
    try {
      const docRef = doc(db, "shared_links", shareId);
      const snap = await getDoc(docRef);
      
      if (!snap.exists()) {
        setError(true);
        setIsChecking(false);
        return;
      }
      
      const data = snap.data();
      
      if (data.expiresAt) {
        const expiresAt = new Date(data.expiresAt);
        if (new Date() > expiresAt) {
          alert("Link Kedaluwarsa");
          setIsChecking(false);
          return;
        }
      }
      
      const hashedInput = await hashString(passcode);
      if (hashedInput === data.hashedPasscode) {
        setIsAuthenticated(true);
      } else {
        setError(true);
      }
    } catch (err) {
      console.error(err);
      setError(true);
    }
    
    setIsChecking(false);
  };

  if (!initialCheckDone) return null;

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Form DAR Terkunci</CardTitle>
            <CardDescription className="text-slate-500">
              Silakan masukkan passcode untuk melihat dokumen ini.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Input 
                  type="password" 
                  placeholder="Masukkan passcode" 
                  value={passcode}
                  onChange={(e) => {
                    setPasscode(e.target.value);
                    setError(false);
                  }}
                  className={`text-center text-lg tracking-widest ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
                />
                {error && <p className="text-sm text-red-500 text-center font-medium">Passcode salah atau link tidak valid.</p>}
              </div>
              <Button type="submit" disabled={isChecking || !passcode} className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base">
                {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Buka Form DAR <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <FormAppContent isPublic={true} />
  );
}

/**
 * @fileOverview Halaman publik untuk Form DAR.
 * Memungkinkan pihak eksternal untuk mengisi tanda tangan tanpa login (dilengkapi dengan proteksi passcode).
 */
import TurnstileGate from '@/components/auth/turnstile-gate';

export default function PublicFormDarPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={
        <div className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
            <Loader2 className="h-10 h-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Form DAR...</p>
        </div>
      }>
        <TurnstileGate>
          <PublicFormDarContent />
        </TurnstileGate>
      </Suspense>
    </DashboardLayout>
  );
}
