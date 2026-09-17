'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Share2, FileClock } from 'lucide-react';
import FileShareList from './file-share-list';
import FileShareLogs from './file-share-logs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

export default function FileSharingContent() {
  const { user } = useAuth();
  
  // Dalam AuthProvider, data dari firestore (role, department, allowedPages) dimasukkan ke dalam objek user.
  const isAdmin = user ? (user as any).role === 'Admin' : false;
  const isITorAdmin = user ? (
    (user as any).role === 'Admin' || 
    (user as any).department?.toUpperCase() === 'IT'
  ) : false;

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-[calc(100vh-77px)] bg-gradient-to-br from-slate-50 via-white to-cyan-50 dark:from-slate-950 dark:via-slate-900 dark:to-cyan-950/30 relative overflow-hidden">
      {/* Decorative background blur */}
      <div className="absolute top-[-10%] right-[-5%] w-96 h-96 bg-cyan-400/10 dark:bg-cyan-600/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-5%] w-[30rem] h-[30rem] bg-blue-400/10 dark:bg-blue-600/10 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl md:text-4xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-cyan-600 to-blue-600 dark:from-cyan-400 dark:to-blue-500 drop-shadow-sm mb-1">
            Portal File Sharing
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium">
            Akses direktori server lokal dan pantau log penggunaannya. 
            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-cyan-100 text-cyan-800 dark:bg-cyan-900/50 dark:text-cyan-300 border border-cyan-200 dark:border-cyan-800">
              Akses: {user ? (user as any).role || 'Terdaftar' : 'Tamu / Publik'}
            </span>
          </p>
        </div>
      </div>

      <Alert className="relative z-10 overflow-hidden bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border border-cyan-200/50 dark:border-cyan-800/50 shadow-[0_4px_24px_-8px_rgba(6,182,212,0.15)] dark:shadow-[0_4px_24px_-8px_rgba(6,182,212,0.3)]">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-blue-500/5 pointer-events-none" />
        <Share2 className="h-5 w-5 text-cyan-600 dark:text-cyan-400 mt-0.5" />
        <AlertTitle className="font-bold text-cyan-800 dark:text-cyan-300">Informasi Akses Direktori Lokal</AlertTitle>
        <AlertDescription className="text-slate-600 dark:text-slate-300 leading-relaxed mt-1">
          Karena alasan keamanan peramban web (*browser*), Anda tidak bisa membuka folder lokal (seperti <code className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 rounded text-xs font-mono text-cyan-700 dark:text-cyan-300">\\192.168.x.x</code>) langsung melalui klik tautan.
          Silakan tekan tombol <strong className="text-cyan-700 dark:text-cyan-400">Copy Path (Salin Alamat)</strong> pada kartu di bawah ini, lalu *Paste* di <strong>Windows Explorer</strong>.
        </AlertDescription>
      </Alert>

      {isITorAdmin ? (
        <Tabs defaultValue="list" className="w-full relative z-10">
          <TabsList className="mb-6 bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-1 rounded-lg border border-slate-200/50 dark:border-slate-700/50 shadow-sm inline-flex h-auto">
            <TabsTrigger value="list" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm rounded-md transition-all font-semibold">
              <Share2 className="h-4 w-4" />
              Daftar File Sharing
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2 px-4 py-2 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-cyan-700 dark:data-[state=active]:text-cyan-400 data-[state=active]:shadow-sm rounded-md transition-all font-semibold">
              <FileClock className="h-4 w-4" />
              Log Akses
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-0">
            <FileShareList isManager={isAdmin} />
          </TabsContent>
          
          <TabsContent value="logs" className="mt-0">
            <FileShareLogs />
          </TabsContent>
        </Tabs>
      ) : (
        <FileShareList isManager={false} />
      )}
    </div>
  );
}
