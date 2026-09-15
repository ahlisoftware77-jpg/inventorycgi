import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileShare } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { collection, query, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { User } from '@/lib/types';

interface FileShareFormProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: Partial<FileShare>) => void;
  initialData: FileShare | null;
}

export default function FileShareForm({ isOpen, onClose, onSave, initialData }: FileShareFormProps) {
  const [name, setName] = useState('');
  const [path, setPath] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<'active' | 'inactive'>('active');
  const [allowedUsers, setAllowedUsers] = useState<string[]>([]);
  const [allowUpload, setAllowUpload] = useState<boolean>(true);
  const [users, setUsers] = useState<User[]>([]);

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setPath(initialData?.path || '');
      setDescription(initialData?.description || '');
      setStatus(initialData?.status || 'active');
      setAllowedUsers(initialData?.allowedUsers || []);
      setAllowUpload(initialData?.allowUpload !== false); // default true if undefined
      
      // Fetch users
      const fetchUsers = async () => {
        const q = query(collection(db, 'users'));
        const snap = await getDocs(q);
        const fetchedUsers = snap.docs.map(doc => ({ uid: doc.id, ...doc.data() } as User));
        setUsers(fetchedUsers);
      };
      fetchUsers();
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, path, description, status, allowedUsers, allowUpload });
  };

  const handleToggleUser = (uid: string, checked: boolean) => {
    setAllowedUsers(prev => 
      checked ? [...prev, uid] : prev.filter(id => id !== uid)
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{initialData ? 'Edit File Share' : 'Tambah File Share Baru'}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nama Folder / Server</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required placeholder="Contoh: Server Data HRD" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="path">Alamat (Path / IP / Link Web)</Label>
            <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} required placeholder="Contoh: \\192.168.1.10\Data_HRD atau https://..." dir="ltr" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Penjelasan singkat mengenai folder ini" />
          </div>
          
          <div className="space-y-2">
            <Label>Pengguna yang Diizinkan (Pilih user)</Label>
            <ScrollArea className="h-40 border rounded-md p-3 bg-slate-50 dark:bg-slate-900/50">
              <div className="space-y-2">
                {users.length > 0 ? users.map(user => (
                  <div key={user.uid} className="flex items-center space-x-2">
                    <Checkbox
                      id={`user-${user.uid}`}
                      checked={allowedUsers.includes(user.uid)}
                      onCheckedChange={(checked) => handleToggleUser(user.uid, !!checked)}
                    />
                    <Label htmlFor={`user-${user.uid}`} className="text-sm font-medium leading-none cursor-pointer">
                      {user.name} ({user.department || 'No Dept'})
                    </Label>
                  </div>
                )) : (
                  <div className="text-xs text-muted-foreground text-center pt-10">Memuat data pengguna...</div>
                )}
              </div>
            </ScrollArea>
            <p className="text-xs text-slate-500">Kosongkan semua centang jika folder ini bisa diakses **Publik** (tanpa login).</p>
          </div>

          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v: 'active' | 'inactive') => setStatus(v)}>
              <SelectTrigger>
                <SelectValue placeholder="Pilih status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Aktif</SelectItem>
                <SelectItem value="inactive">Nonaktif (Maintenance)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex items-center space-x-2 pt-2">
            <Checkbox
              id="allow-upload"
              checked={allowUpload}
              onCheckedChange={(checked) => setAllowUpload(!!checked)}
            />
            <Label htmlFor="allow-upload" className="text-sm font-medium leading-none cursor-pointer">
              Izinkan Upload File pada Folder Ini
            </Label>
          </div>
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
