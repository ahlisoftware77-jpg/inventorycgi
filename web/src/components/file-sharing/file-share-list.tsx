'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { FileShare, FileShareLog } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Plus, FolderSync, Edit, Trash2, FolderOpen } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileShareForm from './file-share-form';
import { Skeleton } from '@/components/ui/skeleton';
import FileBrowser from './file-browser';

export default function FileShareList({ isManager }: { isManager: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<FileShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<FileShare | null>(null);
  const [activeBrowseShare, setActiveBrowseShare] = useState<FileShare | null>(null);

  useEffect(() => {
    let q = query(collection(db, 'file_shares'));
    
    // If not manager and user is logged in, we COULD filter by allowedUsers.
    // However, since it's public now, non-managers and guests see all 'active' shares.
    if (!isManager && user) {
      // Opt-in: keep it open to all active for public, or filter if logged in but not manager
      // Actually, if it's public, everyone sees everything. So we don't need array-contains.
      // But let's leave the query open for all active shares in the snapshot filter below.
    }

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const fetchedShares: FileShare[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data() as Omit<FileShare, 'id'>;
        
        if (isManager || data.status === 'active') {
           fetchedShares.push({ id: doc.id, ...data });
        }
      });
      setShares(fetchedShares.sort((a, b) => b.createdAt - a.createdAt));
      setLoading(false);
    }, (error) => {
      console.error("Error fetching file shares:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user, isManager]);

  const handleCopyPath = async (share: FileShare) => {
    try {
      await navigator.clipboard.writeText(share.path);
      toast({ title: 'Alamat berhasil disalin! Silakan Paste di Windows Explorer.' });
      
      // Log akses
      await addDoc(collection(db, 'file_share_logs'), {
        shareId: share.id,
        shareName: share.name,
        userId: user ? user.uid : 'public-guest',
        userName: user ? ((user as any).name || user.email || 'Unknown') : 'Tamu (Publik)',
        accessedAt: Date.now()
      } as Omit<FileShareLog, 'id'>);
      
    } catch (err) {
      toast({ title: 'Gagal menyalin alamat.', variant: 'destructive' });
      console.error(err);
    }
  };

  const handleSaveShare = async (data: Partial<FileShare>) => {
    try {
      if (editingShare) {
        await updateDoc(doc(db, 'file_shares', editingShare.id), {
          ...data,
          updatedAt: Date.now()
        });
        toast({ title: 'File share berhasil diperbarui' });
      } else {
        await addDoc(collection(db, 'file_shares'), {
          ...data,
          status: 'active',
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        toast({ title: 'File share baru berhasil ditambahkan' });
      }
      setIsFormOpen(false);
      setEditingShare(null);
    } catch (error) {
      console.error(error);
      toast({ title: 'Gagal menyimpan file share', variant: 'destructive' });
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Apakah Anda yakin ingin menghapus file share ini?')) {
      try {
        await deleteDoc(doc(db, 'file_shares', id));
        toast({ title: 'Berhasil dihapus' });
      } catch (e) {
        toast({ title: 'Gagal menghapus', variant: 'destructive' });
      }
    }
  };

  const openEdit = (share: FileShare) => {
    setEditingShare(share);
    setIsFormOpen(true);
  };

  if (activeBrowseShare) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
        <FileBrowser share={activeBrowseShare} onClose={() => setActiveBrowseShare(null)} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {isManager && (
        <div className="flex justify-end">
          <Button onClick={() => { setEditingShare(null); setIsFormOpen(true); }} className="bg-teal-600 hover:bg-teal-700 text-white">
            <Plus className="h-4 w-4 mr-2" />
            Tambah File Share
          </Button>
        </div>
      )}

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : shares.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <FolderSync className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Belum ada direktori File Share yang tersedia untuk Anda.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {shares.map(share => (
            <Card key={share.id} className={`border-slate-200 transition-all hover:shadow-md ${share.status === 'inactive' ? 'opacity-70 bg-slate-50' : ''}`}>
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
                    <FolderSync className="h-5 w-5" />
                    <CardTitle className="text-lg">{share.name}</CardTitle>
                  </div>
                  {share.status === 'inactive' && (
                    <span className="text-xs font-semibold px-2 py-1 bg-slate-200 text-slate-600 rounded">Nonaktif</span>
                  )}
                </div>
                <CardDescription className="line-clamp-2 mt-1">{share.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4">
                <div className="bg-slate-100 dark:bg-slate-900 p-2 px-3 rounded text-sm font-mono text-slate-700 dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap" title={share.path}>
                  {share.path}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex flex-col gap-2">
                <Button 
                  onClick={() => setActiveBrowseShare(share)} 
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                  disabled={share.status === 'inactive'}
                >
                  <FolderOpen className="h-4 w-4 mr-2" />
                  Buka Folder di Web
                </Button>
                
                <div className="flex gap-2 w-full">
                  <Button 
                    variant="outline"
                    onClick={() => handleCopyPath(share)} 
                    className="flex-1 text-xs"
                    disabled={share.status === 'inactive'}
                  >
                    <Copy className="h-3.5 w-3.5 mr-1.5" />
                    Salin Path
                  </Button>
                  
                  {isManager && (
                    <div className="flex gap-1">
                      <Button variant="outline" size="icon" onClick={() => openEdit(share)}>
                        <Edit className="h-4 w-4 text-slate-600" />
                      </Button>
                      <Button variant="outline" size="icon" onClick={() => handleDelete(share.id)} className="hover:bg-red-50 hover:text-red-600">
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  )}
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {isFormOpen && (
        <FileShareForm 
          isOpen={isFormOpen} 
          onClose={() => setIsFormOpen(false)} 
          onSave={handleSaveShare}
          initialData={editingShare}
        />
      )}
    </div>
  );
}
