
'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AnimatePresence } from 'framer-motion';
import React from 'react';
import UserItem from './user-item';
import UserDetailCard from './user-detail-card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Printer, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export default function UserTable() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk mengakses halaman ini.',
      });
      router.push('/');
    }
  }, [currentUser, authLoading, router, toast, isAdmin]);


  useEffect(() => {
    if (!isAdmin) return;

    setLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
          usersData.push({ uid: doc.id, ...doc.data() } as User);
        });
        setAllUsers(usersData);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching users:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [isAdmin]);

  const { pendingUsers, approvedUsers } = useMemo(() => {
    const term = searchTerm.toLowerCase();
    const filteredUsers = allUsers.filter(u => {
      if (!term) return true;
      return (u.name?.toLowerCase().includes(term) ||
              u.email?.toLowerCase().includes(term) ||
              u.department?.toLowerCase().includes(term));
    });

    const pending = filteredUsers.filter(u => u.role === 'Pending').sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    const approved = filteredUsers.filter(u => u.role !== 'Pending').sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    return { pendingUsers: pending, approvedUsers: approved };
  }, [allUsers, searchTerm]);

  const handleToggle = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };

  const handlePrintReport = () => {
    if (approvedUsers.length === 0) {
      toast({
        variant: "destructive",
        title: "Tidak ada data",
        description: "Tidak ada pengguna aktif untuk dicetak.",
      });
      return;
    }

    const printWindow = window.open('', '', 'height=800,width=1200');
    if (!printWindow) {
      toast({
        variant: "destructive",
        title: "Gagal Membuka Jendela Cetak",
        description: "Mohon izinkan pop-up untuk situs ini.",
      });
      return;
    }

    const tableRows = approvedUsers.map((user, index) => `
      <tr>
        <td>${index + 1}</td>
        <td>${user.name || user.displayName || 'N/A'}</td>
        <td>${user.email}</td>
        <td>${user.department || 'N/A'}</td>
        <td>${user.role}</td>
      </tr>
    `).join('');

    const printContent = `
      <html>
        <head>
          <title>Laporan Pengguna Terdaftar</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
            th { background-color: #f2f2f2; }
            @media print {
              @page { size: A4; margin: 1in; }
            }
          </style>
        </head>
        <body>
          <h1>Laporan Pengguna Terdaftar</h1>
          <p>Tanggal Cetak: ${format(new Date(), 'd MMMM yyyy HH:mm', { locale: id })}</p>
          <table>
            <thead>
              <tr>
                <th>No</th>
                <th>Nama</th>
                <th>Email</th>
                <th>Departemen</th>
                <th>Peran</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>
        </body>
      </html>
    `;

    printWindow.document.write(printContent);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };


  if (authLoading || !isAdmin) {
    return (
        <Card>
            <CardHeader>
                <CardTitle>Manajemen User</CardTitle>
                <CardDescription>Memuat data pengguna dan verifikasi hak akses...</CardDescription>
            </CardHeader>
            <CardContent>
                <Skeleton className="h-48 w-full" />
            </CardContent>
        </Card>
    );
  }

  const renderUserList = (users: User[]) => (
    <div className="space-y-3 pb-20">
        {loading ? (
             Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)
        ) : users.length > 0 ? (
            users.map(user => (
                <React.Fragment key={user.uid}>
                    <UserItem
                        user={user}
                        isExpanded={expandedId === user.uid}
                        onToggle={() => handleToggle(user.uid)}
                    />
                    <AnimatePresence>
                        {expandedId === user.uid && (
                            <UserDetailCard user={user} currentUser={currentUser} />
                        )}
                    </AnimatePresence>
                </React.Fragment>
            ))
        ) : (
             <p className="text-center text-muted-foreground py-8">
                Tidak ada pengguna dalam kategori ini.
            </p>
        )}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
          <div>
            <CardTitle>Manajemen User</CardTitle>
            <CardDescription>
              Kelola pendaftaran baru dan peran pengguna yang sudah ada.
            </CardDescription>
          </div>
          <Button onClick={handlePrintReport} variant="outline">
            <Printer className="mr-2 h-4 w-4" />
            Cetak Laporan
          </Button>
        </div>
        <div className="pt-4 relative max-w-md">
          <Search className="absolute left-3 top-[26px] h-4 w-4 text-muted-foreground pointer-events-none" />
          <Input 
            placeholder="Cari nama, email, atau departemen..." 
            className="pl-9 h-10 w-full"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
         <Tabs defaultValue="approved">
            <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="approved">Pengguna Aktif ({approvedUsers.length})</TabsTrigger>
                <TabsTrigger value="pending">
                    Menunggu Persetujuan ({pendingUsers.length})
                    {pendingUsers.length > 0 && <span className="ml-2 h-2 w-2 rounded-full bg-destructive animate-pulse"></span>}
                </TabsTrigger>
            </TabsList>
            <TabsContent value="approved" className="mt-4">
                {renderUserList(approvedUsers)}
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
                {renderUserList(pendingUsers)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
