'use client';

import { useState, useEffect } from 'react';
import { type User } from '@/lib/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { UserActions } from './user-actions';
import { Check, X, Loader2, ShieldCheck, Building } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '../ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, updateDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import PermissionsDialog from './permissions-dialog';

const PERMANENT_ADMIN_EMAIL = "triyadi72@gmail.com";
const defaultDepartments = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];

interface UserDetailCardProps {
  user: User;
  currentUser: User | null;
}

export default function UserDetailCard({ user, currentUser }: UserDetailCardProps) {
  const { toast } = useToast();
  const [isUpdating, setIsUpdating] = useState(false);
  const [isPermissionsOpen, setIsPermissionsOpen] = useState(false);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(defaultDepartments);
  
  const canPerformAction = currentUser?.role === 'Admin' && currentUser.uid !== user.uid && user.email !== PERMANENT_ADMIN_EMAIL;

  useEffect(() => {
    // Ambil daftar departemen dari settings agar sinkron dengan database utama
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        if (data.departments) {
          setDepartmentOptions(data.departments.sort());
        }
      }
    });
    return () => unsub();
  }, []);

  const handleRoleChange = async (newRole: User['role']) => {
    if (!canPerformAction || !newRole) return;

    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { role: newRole });
      toast({
        title: 'Peran Diperbarui',
        description: `Hak akses pengguna telah diubah menjadi ${newRole}.`,
      });
    } catch (error) {
      console.error('Error updating role:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Update',
        description: 'Terjadi kesalahan saat mengubah peran.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDepartmentChange = async (newDept: string) => {
    if (!canPerformAction || !newDept) return;

    setIsUpdating(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, { department: newDept });
      toast({
        title: 'Unit Diperbarui',
        description: `Departemen pengguna kini disetel ke ${newDept}.`,
      });
    } catch (error) {
      console.error('Error updating department:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Update',
        description: 'Terjadi kesalahan saat mengubah departemen.',
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleApproval = async (isApproved: boolean) => {
    if (!canPerformAction) return;

    setIsUpdating(true);
    try {
        if (isApproved) {
            const userRef = doc(db, 'users', user.uid);
            await updateDoc(userRef, { 
              role: 'User',
              allowedPages: ['/', '/announcements', '/helpdesk', '/help', '/it-problem-form'] // Default pages for new user
            });
            toast({ title: 'Akun Disetujui', description: 'Pengguna kini dapat mengakses sistem dengan peran User.' });
        } else {
            await deleteDoc(doc(db, 'users', user.uid));
            toast({ title: 'Pendaftaran Ditolak', description: 'Data pendaftaran telah dihapus dari sistem.' });
        }
    } catch(error) {
        console.error('Error handling user approval:', error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memproses permintaan.' });
    } finally {
        setIsUpdating(false);
    }
  };

  return (
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      className="overflow-hidden"
    >
      <div className="border-l-4 border-primary bg-primary/10 dark:bg-primary/5 p-6 my-2 rounded-r-[1.5rem] shadow-inner">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                {/* Role Selector */}
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Otoritas Akses</Label>
                    <div className="flex items-center gap-2">
                      {isUpdating ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
                          <Select
                              value={user.role}
                              onValueChange={(value) => handleRoleChange(value as User['role'])}
                              disabled={!canPerformAction || user.role === 'Pending'}
                          >
                              <SelectTrigger className="w-[180px] bg-background rounded-xl border-slate-200 font-bold h-11">
                                  <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-xl">
                                  <SelectItem value="Admin" className="font-bold">Admin</SelectItem>
                                  <SelectItem value="Manager" className="font-bold text-emerald-600">Manager</SelectItem>
                                  <SelectItem value="Section Head" className="font-bold text-emerald-600">Section Head</SelectItem>
                                  <SelectItem value="Karyawan" className="font-bold text-blue-600">Karyawan</SelectItem>
                                  <SelectItem value="User" className="font-bold">User</SelectItem>
                              </SelectContent>
                          </Select>
                      )}
                    </div>
                </div>

                {/* Department Selector */}
                <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Penempatan Unit</Label>
                    <div className="flex items-center gap-2">
                        {isUpdating ? <Loader2 className="h-5 w-5 animate-spin text-primary" /> : (
                            <Select
                                value={user.department || ''}
                                onValueChange={handleDepartmentChange}
                                disabled={!canPerformAction || user.role === 'Pending'}
                            >
                                <SelectTrigger className="w-[200px] bg-background rounded-xl border-slate-200 font-bold h-11">
                                    <div className="flex items-center gap-2 truncate">
                                        <Building className="h-3.5 w-3.5 text-primary/40 shrink-0" />
                                        <SelectValue placeholder="Pilih Unit" />
                                    </div>
                                </SelectTrigger>
                                <SelectContent className="rounded-xl max-h-[300px]">
                                    {departmentOptions.map(dept => (
                                        <SelectItem key={dept} value={dept} className="font-bold text-xs">
                                            {dept}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    </div>
                </div>

                <div className="flex items-end h-full pt-6">
                  {user.role !== 'Pending' && currentUser?.role === 'Admin' && (
                    <Button variant="outline" size="sm" onClick={() => setIsPermissionsOpen(true)} className="rounded-xl h-11 border-primary/20 bg-white font-bold hover:bg-primary/5 text-primary transition-all">
                      <ShieldCheck className="mr-2 h-4 w-4" /> Izin Halaman
                    </Button>
                  )}
                </div>
            </div>
            
             <div className="flex justify-end gap-2 items-center">
                {user.role === 'Pending' && canPerformAction ? (
                    <div className="flex items-center gap-2 bg-white/50 p-2 rounded-2xl border shadow-sm">
                        <Button size="sm" variant="destructive" onClick={() => handleApproval(false)} disabled={isUpdating} className="rounded-xl h-10 font-bold px-6">
                            <X className="mr-2 h-4 w-4" /> Tolak
                        </Button>
                        <Button size="sm" onClick={() => handleApproval(true)} disabled={isUpdating} className="rounded-xl h-10 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-6">
                            <Check className="mr-2 h-4 w-4" /> Setujui Akun
                        </Button>
                    </div>
                ) : (
                    <UserActions userId={user.uid} userName={user.displayName || 'Pengguna'} />
                )}
            </div>
        </div>
      </div>
      
      {isPermissionsOpen && (
        <PermissionsDialog 
          user={user} 
          isOpen={isPermissionsOpen} 
          onOpenChange={setIsPermissionsOpen} 
        />
      )}
    </motion.div>
  );
}