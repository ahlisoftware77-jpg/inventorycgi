'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, onSnapshot, query, addDoc, updateDoc, deleteDoc, doc, getDocs, where } from 'firebase/firestore';
import { FileShare, FileShareLog } from './types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Copy, Plus, FolderSync, Edit, Trash2, FolderOpen, ExternalLink, Pin, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import FileShareForm from './file-share-form';
import { Skeleton } from '@/components/ui/skeleton';
import FileBrowser from './file-browser';

export default function FileShareList({ isManager }: { isManager: boolean }) {
  const router = useRouter();
  const { user } = useAuth();
  const { toast } = useToast();
  const [shares, setShares] = useState<FileShare[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingShare, setEditingShare] = useState<FileShare | null>(null);
  const [activeBrowseShare, setActiveBrowseShare] = useState<FileShare | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');

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
      setShares(fetchedShares);
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

  const filteredShares = shares.filter(share => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return share.name.toLowerCase().includes(q) || share.description?.toLowerCase().includes(q) || share.path.toLowerCase().includes(q);
  }).sort((a, b) => {
    const aIsWeb = a.path.toLowerCase().startsWith('http://') || a.path.toLowerCase().startsWith('https://');
    const bIsWeb = b.path.toLowerCase().startsWith('http://') || b.path.toLowerCase().startsWith('https://');
    
    if (aIsWeb && !bIsWeb) return -1;
    if (!aIsWeb && bIsWeb) return 1;

    const timeA = a.updatedAt || a.createdAt;
    const timeB = b.updatedAt || b.createdAt;

    if (sortBy === 'newest') return timeB - timeA;
    if (sortBy === 'oldest') return timeA - timeB;
    if (sortBy === 'name') return a.name.localeCompare(b.name);
    return 0;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
        <div className="flex w-full sm:w-auto items-center gap-3 flex-1 max-w-md">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-cyan-600 dark:text-cyan-400" />
            <Input 
              placeholder="Cari direktori..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-cyan-200/50 dark:border-cyan-800/50 focus-visible:ring-cyan-500 shadow-sm"
            />
          </div>
          <Select value={sortBy} onValueChange={setSortBy}>
            <SelectTrigger className="w-[160px] bg-white/70 dark:bg-slate-900/70 backdrop-blur-md border-cyan-200/50 dark:border-cyan-800/50 focus:ring-cyan-500 shadow-sm">
              <SelectValue placeholder="Urutkan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="newest">Update Terbaru</SelectItem>
              <SelectItem value="oldest">Paling Lama</SelectItem>
              <SelectItem value="name">Sesuai Abjad</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isManager && (
          <Button onClick={() => { setEditingShare(null); setIsFormOpen(true); }} className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-[0_4px_15px_rgba(79,70,229,0.4)] hover:shadow-[0_6px_25px_rgba(79,70,229,0.6)] border-0 transition-all w-full sm:w-auto">
            <Plus className="h-4 w-4 mr-2" />
            Tambah File Share
          </Button>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : filteredShares.length === 0 ? (
        <div className="text-center py-20 bg-slate-50 dark:bg-slate-900 rounded-xl border border-dashed border-slate-300 dark:border-slate-800">
          <FolderSync className="h-10 w-10 text-slate-400 mx-auto mb-3" />
          <p className="text-slate-500 font-medium">Belum ada direktori File Share yang sesuai.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredShares.map(share => (
            <Card key={share.id} className={`bg-white/95 dark:bg-slate-800/95 backdrop-blur-xl border border-indigo-100 dark:border-indigo-900/50 transition-all duration-300 shadow-md hover:shadow-[0_12px_30px_-12px_rgba(79,70,229,0.3)] hover:-translate-y-1.5 group relative overflow-hidden ${share.status === 'inactive' ? 'opacity-70 bg-slate-50' : ''}`}>
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/0 to-purple-500/0 group-hover:from-indigo-500/5 group-hover:to-purple-500/5 transition-colors duration-500 pointer-events-none" />
              <CardHeader className="pb-3 relative z-10">
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-2">
                    {share.path.toLowerCase().startsWith('http://') || share.path.toLowerCase().startsWith('https://') ? (
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-fuchsia-500/20 to-purple-500/20 shadow-[0_0_10px_rgba(217,70,239,0.2)] group-hover:shadow-[0_0_15px_rgba(217,70,239,0.4)] transition-all">
                        <Pin className="h-5 w-5 text-fuchsia-600 dark:text-fuchsia-400" />
                      </div>
                    ) : (
                      <div className="p-1.5 rounded-lg bg-gradient-to-br from-cyan-500/20 to-blue-500/20 shadow-[0_0_10px_rgba(6,182,212,0.2)] group-hover:shadow-[0_0_15px_rgba(6,182,212,0.4)] transition-all">
                        <FolderSync className="h-5 w-5 text-cyan-600 dark:text-cyan-400" />
                      </div>
                    )}
                    <CardTitle className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-600 dark:from-slate-100 dark:to-slate-300">{share.name}</CardTitle>
                  </div>
                  {share.status === 'inactive' && (
                    <span className="text-xs font-semibold px-2 py-1 bg-rose-100/50 text-rose-700 dark:bg-rose-900/50 dark:text-rose-300 rounded border border-rose-200 dark:border-rose-800 backdrop-blur-sm">Nonaktif</span>
                  )}
                </div>
                <CardDescription className="line-clamp-2 mt-1">{share.description}</CardDescription>
              </CardHeader>
              <CardContent className="pb-4 relative z-10">
                <div className="bg-white/50 dark:bg-slate-950/50 p-2.5 px-3 rounded-lg border border-cyan-100/60 dark:border-cyan-900/50 text-sm font-mono text-slate-700 dark:text-slate-300 overflow-hidden text-ellipsis whitespace-nowrap shadow-inner" title={share.path}>
                  {share.path}
                </div>
              </CardContent>
              <CardFooter className="pt-0 flex flex-col gap-2 relative z-10">
                <Button 
                  onClick={() => {
                    // Check logic for allowedUsers (Private Share)
                    if (share.allowedUsers && share.allowedUsers.length > 0) {
                      if (!user) {
                        router.push('/login?callbackUrl=/file-sharing');
                        return;
                      }
                      const isAdmin = user.role === 'Admin';
                      if (!isAdmin && !share.allowedUsers.includes(user.uid)) {
                        toast({ 
                          title: 'Akses Ditolak', 
                          description: 'Anda tidak memiliki izin untuk membuka file sharing ini.', 
                          variant: 'destructive' 
                        });
                        return;
                      }
                    }

                    if (share.path.toLowerCase().startsWith('http://') || share.path.toLowerCase().startsWith('https://')) {
                      window.open(share.path, '_blank', 'noopener,noreferrer');
                    } else {
                      setActiveBrowseShare(share);
                    }
                  }} 
                  className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white shadow-md border-0 transition-all hover:shadow-[0_6px_20px_rgba(79,70,229,0.4)]"
                  disabled={share.status === 'inactive'}
                >
                  {(share.path.toLowerCase().startsWith('http://') || share.path.toLowerCase().startsWith('https://')) ? (
                    <>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Buka Tautan di Tab Baru
                    </>
                  ) : (
                    <>
                      <FolderOpen className="h-4 w-4 mr-2" />
                      Buka Folder di Web
                    </>
                  )}
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
