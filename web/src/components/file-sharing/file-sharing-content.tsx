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
  
  if (!user) return null;

  // Dalam AuthProvider, data dari firestore (role, department, allowedPages) dimasukkan ke dalam objek user.
  const isITorAdmin = (user as any).role === 'Admin' || 
                      (user as any).department?.toUpperCase() === 'IT' ||
                      ((user as any).allowedPages || []).includes('/file-sharing');

  return (
    <div className="p-4 md:p-8 space-y-8 min-h-screen">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Portal File Sharing</h1>
          <p className="text-slate-500">Akses direktori server lokal dan pantau log penggunaannya. (Debug: Role Anda = {(user as any).role || 'Kosong'})</p>
        </div>
      </div>

      <Alert className="bg-blue-50 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-900/50">
        <Share2 className="h-4 w-4 text-blue-600 dark:text-blue-400" />
        <AlertTitle>Informasi Akses File Sharing</AlertTitle>
        <AlertDescription>
          Karena alasan keamanan pada peramban web (browser), Anda tidak bisa membuka folder lokal (seperti \\192.168.x.x) langsung dari klik tautan.
          Silakan tekan tombol <strong>Copy Path (Salin Alamat)</strong> pada kartu di bawah ini, lalu tempel (Paste) di <strong>Windows Explorer</strong>.
        </AlertDescription>
      </Alert>

      {isITorAdmin ? (
        <Tabs defaultValue="list" className="w-full">
          <TabsList className="mb-4">
            <TabsTrigger value="list" className="flex items-center gap-2">
              <Share2 className="h-4 w-4" />
              Daftar File Sharing
            </TabsTrigger>
            <TabsTrigger value="logs" className="flex items-center gap-2">
              <FileClock className="h-4 w-4" />
              Log Akses
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="list" className="mt-0">
            <FileShareList isManager={true} />
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
