

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query, doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type User } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '../ui/skeleton';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { UserActions } from './user-actions';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Check, Loader2, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const PERMANENT_ADMIN_EMAIL = "triyadi72@gmail.com";

export default function UserTable() {
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const { user: currentUser, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const isAdmin = currentUser?.role === 'Admin';

  useEffect(() => {
    // Redirect non-admins away
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
    if (!isAdmin) return; // Don't fetch if not admin

    setLoading(true);
    const q = query(collection(db, 'users'));
    const unsubscribe = onSnapshot(
      q,
      (querySnapshot) => {
        const usersData: User[] = [];
        querySnapshot.forEach((doc) => {
          usersData.push({ ...doc.data() } as User);
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
    const pending = allUsers.filter(u => u.role === 'Pending').sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    const approved = allUsers.filter(u => u.role !== 'Pending').sort((a,b) => (a.name || '').localeCompare(b.name || ''));
    return { pendingUsers: pending, approvedUsers: approved };
  }, [allUsers]);

  const handleRoleChange = async (userId: string, newRole: 'Admin' | 'Manager' | 'Section Head' | 'Karyawan' | 'User') => {
    if (!isAdmin) return;

    const targetUser = allUsers.find(u => u.uid === userId);

    if (userId === currentUser?.uid) {
        toast({
            variant: 'destructive',
            title: 'Gagal',
            description: 'Anda tidak dapat mengubah peran Anda sendiri.',
        });
        return;
    }
    
    if (targetUser?.email === PERMANENT_ADMIN_EMAIL) {
      toast({
          variant: 'destructive',
          title: 'Akses Ditolak',
          description: 'Peran untuk pengguna ini tidak dapat diubah.',
      });
      return;
    }

    setIsUpdating(userId);
    try {
      const userRef = doc(db, 'users', userId);
      await updateDoc(userRef, { role: newRole });
      toast({
        title: 'Berhasil',
        description: `Peran pengguna telah diubah menjadi ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal',
        description: 'Terjadi kesalahan saat mengubah peran pengguna.',
      });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const handleApproval = async (userId: string, isApproved: boolean) => {
    setIsUpdating(userId);
    try {
        if (isApproved) {
            const userRef = doc(db, 'users', userId);
            await updateDoc(userRef, { role: 'User' }); // Approve to 'User' role
            toast({ title: 'Berhasil', description: 'Pengguna telah disetujui.' });
        } else {
            // This is a hard delete. The user will have to register again.
            await deleteDoc(doc(db, 'users', userId));
            toast({ title: 'Pengguna Ditolak', description: 'Pendaftaran pengguna telah ditolak dan dihapus.' });
        }
    } catch(error) {
        console.error('Error handling user approval:', error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memproses permintaan.' });
    } finally {
        setIsUpdating(null);
    }
  };


  // Render a loading state or nothing if the user is not an admin
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

  const renderUserTable = (users: User[], isPendingList: boolean) => (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nama</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Departemen</TableHead>
          <TableHead className="text-center">Peran</TableHead>
          <TableHead className="text-right">Aksi</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {loading ? (
          Array.from({ length: 3 }).map((_, i) => (
            <TableRow key={i}>
              <TableCell colSpan={5}>
                <Skeleton className="h-10 w-full" />
              </TableCell>
            </TableRow>
          ))
        ) : users.length > 0 ? (
          users.map((user) => (
            <TableRow key={user.uid}>
              <TableCell className="font-medium">{user.name}</TableCell>
              <TableCell>{user.email}</TableCell>
              <TableCell>{user.department}</TableCell>
              <TableCell className="text-center">
                {isPendingList ? (
                    <Badge variant="secondary">Pending</Badge>
                ) : (
                    <Select
                        value={user.role}
                        onValueChange={(value) => handleRoleChange(user.uid, value as 'Admin' | 'Manager' | 'Section Head' | 'Karyawan' | 'User')}
                        disabled={!isAdmin || isUpdating === user.uid || user.uid === currentUser?.uid || user.email === PERMANENT_ADMIN_EMAIL}
                    >
                        <SelectTrigger className="w-[120px] mx-auto">
                        <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                        <SelectItem value="Admin">Admin</SelectItem>
                        <SelectItem value="Manager">Manager</SelectItem>
                        <SelectItem value="Section Head">Section Head</SelectItem>
                        <SelectItem value="Karyawan">Karyawan</SelectItem>
                        <SelectItem value="User">User</SelectItem>
                        </SelectContent>
                    </Select>
                )}
              </TableCell>
              <TableCell className="text-right">
                {isUpdating === user.uid ? (
                    <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                ) : isPendingList ? (
                    <div className="flex gap-2 justify-end">
                        <Button size="sm" variant="outline" className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground" onClick={() => handleApproval(user.uid, false)}>
                            <X className="mr-2 h-4 w-4" /> Tolak
                        </Button>
                        <Button size="sm" onClick={() => handleApproval(user.uid, true)}>
                            <Check className="mr-2 h-4 w-4" /> Setujui
                        </Button>
                    </div>
                ) : (
                    user.uid !== currentUser?.uid && user.email !== PERMANENT_ADMIN_EMAIL && <UserActions userId={user.uid} userName={user.name || user.email || 'Pengguna'} />
                )}
              </TableCell>
            </TableRow>
          ))
        ) : (
          <TableRow>
            <TableCell colSpan={5} className="h-24 text-center">
              {isPendingList ? 'Tidak ada pendaftaran yang menunggu persetujuan.' : 'Tidak ada pengguna terdaftar.'}
            </TableCell>
          </TableRow>
        )}
      </TableBody>
    </Table>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Manajemen User</CardTitle>
        <CardDescription>
          Kelola pendaftaran baru dan peran pengguna yang sudah ada.
        </CardDescription>
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
                {renderUserTable(approvedUsers, false)}
            </TabsContent>
            <TabsContent value="pending" className="mt-4">
                {renderUserTable(pendingUsers, true)}
            </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
