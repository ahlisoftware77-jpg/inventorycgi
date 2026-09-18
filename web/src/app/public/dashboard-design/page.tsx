'use client';

import React, { useState, useEffect, Suspense } from 'react';
import DashboardDesignSummary from '@/components/dashboard-design-summary';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Lock, ArrowRight, Loader2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
async function hashString(str: string) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

function PublicDashboardContent() {
  const searchParams = useSearchParams();
  const shareId = searchParams.get('shareId');
  const k = searchParams.get('k');
  
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [passcode, setPasscode] = useState('');
  const [error, setError] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [initialCheckDone, setInitialCheckDone] = useState(false);

  // If there's neither shareId nor k, link is invalid
  const isInvalidLink = !shareId && !k;

  useEffect(() => {
    if (isInvalidLink) {
      setInitialCheckDone(true);
    } else {
      setInitialCheckDone(true);
    }
  }, [isInvalidLink]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isInvalidLink) return;
    
    setIsChecking(true);
    setError(false);
    
    try {
      if (shareId) {
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
      } else if (k) {
        // Fallback for older links with ?k=
        const hashed = await hashString(passcode);
        if (hashed === k) {
          setIsAuthenticated(true);
        } else {
          setError(true);
        }
      }
    } catch (err) {
      console.error(err);
      setError(true);
    }
    
    setIsChecking(false);
  };

  if (!initialCheckDone) return null;

  if (isInvalidLink) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-1 text-center pb-6">
            <CardTitle className="text-2xl font-bold tracking-tight text-red-600">Akses Ditolak</CardTitle>
            <CardDescription className="text-slate-500">
              Link dashboard tidak valid atau tidak memiliki kunci keamanan.
            </CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <Card className="w-full max-w-md shadow-xl border-slate-200">
          <CardHeader className="space-y-1 text-center pb-6">
            <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Lock className="w-6 h-6 text-blue-600" />
            </div>
            <CardTitle className="text-2xl font-bold tracking-tight">Dashboard Terkunci</CardTitle>
            <CardDescription className="text-slate-500">
              Silakan masukkan passcode untuk melihat ringkasan statistik desain.
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
                {error && <p className="text-sm text-red-500 text-center font-medium">Passcode salah. Silakan coba lagi.</p>}
              </div>
              <Button type="submit" disabled={isChecking || !passcode} className="w-full bg-blue-600 hover:bg-blue-700 h-11 text-base">
                {isChecking ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                  <>Buka Dashboard <ArrowRight className="w-4 h-4 ml-2" /></>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <DashboardDesignSummary />
    </div>
  );
}

export default function PublicDashboardDesignPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-600" /></div>}>
      <PublicDashboardContent />
    </Suspense>
  );
}
