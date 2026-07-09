'use client';

import React, { createContext, useState, useEffect, ReactNode, useRef, useCallback } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { auth, db } from '@/lib/firebase/config';
import type { User } from '@/lib/types';
import { doc, getDoc } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  loading: boolean;
}

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const logoutTimerRef = useRef<any>(null);
  const { toast } = useToast();

  // Durasi timeout: 4 Jam (4 * 60 * 60 * 1000 milidetik)
  const INACTIVITY_TIMEOUT = 4 * 60 * 60 * 1000;

  const handleAutoLogout = useCallback(async () => {
    if (auth.currentUser) {
      await signOut(auth);
      toast({
        variant: 'warning',
        title: 'Sesi Berakhir',
        description: 'Anda telah keluar otomatis karena tidak ada aktivitas selama 4 jam untuk keamanan data.',
      });
    }
  }, [toast]);

  const resetTimer = useCallback(() => {
    if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
    if (user) {
      logoutTimerRef.current = setTimeout(handleAutoLogout, INACTIVITY_TIMEOUT);
    }
  }, [user, handleAutoLogout, INACTIVITY_TIMEOUT]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setLoading(true);
      if (firebaseUser) {
        try {
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const firestoreData = userDocSnap.data() as User;
            setUser({
              ...firebaseUser,
              displayName: firestoreData.name || firebaseUser.displayName,
              role: firestoreData.role,
              department: firestoreData.department,
              allowedPages: firestoreData.allowedPages || [],
              permissions: firestoreData.permissions || {},
            } as User);
          } else {
            setUser(firebaseUser as User);
          }
        } catch (error) {
            console.error("Error fetching user data, logging out:", error);
            setUser(null);
        } finally {
            setLoading(false);
        }
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  // Listener aktivitas user (mouse, keyboard, scroll, touch)
  useEffect(() => {
    if (user) {
      const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart', 'click'];
      
      const handleActivity = () => resetTimer();
      
      // Menggunakan window listener untuk mendeteksi aktivitas di seluruh halaman
      events.forEach(event => window.addEventListener(event, handleActivity));
      resetTimer(); // Inisialisasi timer saat user login atau mount komponen

      return () => {
        events.forEach(event => window.removeEventListener(event, handleActivity));
        if (logoutTimerRef.current) clearTimeout(logoutTimerRef.current);
      };
    }
  }, [user, resetTimer]);

  if (loading) {
    return (
        <div className="flex h-screen w-full items-center justify-center bg-background">
            <div className="flex flex-col items-center gap-4">
                <svg className="pl" viewBox="0 0 240 240">
                    <circle className="pl__ring pl__ring--a" cx="120" cy="120" r="105" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 660" strokeDashoffset="-330" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--b" cx="120" cy="120" r="35" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 220" strokeDashoffset="-110" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--c" cx="85" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                    <circle className="pl__ring pl__ring--d" cx="155" cy="120" r="70" fill="none" stroke="#000" strokeWidth="20" strokeDasharray="0 440" strokeLinecap="round"></circle>
                </svg>
                <p className="text-muted-foreground animate-pulse font-bold tracking-widest uppercase text-xs">Memuat Sistem...</p>
            </div>
        </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
