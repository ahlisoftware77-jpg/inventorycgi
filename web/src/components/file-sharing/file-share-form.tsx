import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { FileShare } from './types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

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
  const [allowedUsersStr, setAllowedUsersStr] = useState(''); // Comma separated user IDs

  useEffect(() => {
    if (isOpen) {
      setName(initialData?.name || '');
      setPath(initialData?.path || '');
      setDescription(initialData?.description || '');
      setStatus(initialData?.status || 'active');
      setAllowedUsersStr(initialData?.allowedUsers?.join(', ') || '');
    }
  }, [isOpen, initialData]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const allowedUsers = allowedUsersStr.split(',').map(s => s.trim()).filter(Boolean);
    onSave({ name, path, description, status, allowedUsers });
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
            <Label htmlFor="path">Alamat (Path / IP)</Label>
            <Input id="path" value={path} onChange={(e) => setPath(e.target.value)} required placeholder="Contoh: \\192.168.1.10\Data_HRD" dir="ltr" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="description">Deskripsi</Label>
            <Textarea id="description" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Penjelasan singkat mengenai folder ini" />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="allowedUsers">ID Pengguna yang Diizinkan (Koma terpisah)</Label>
            <Input id="allowedUsers" value={allowedUsersStr} onChange={(e) => setAllowedUsersStr(e.target.value)} placeholder="Contoh: user123, user456 (Kosongkan jika hanya IT)" />
            <p className="text-xs text-slate-500">Selain IT dan Admin, pengguna dengan ID ini akan bisa melihat dan menyalin path ini.</p>
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
          
          <div className="flex justify-end gap-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>Batal</Button>
            <Button type="submit" className="bg-teal-600 hover:bg-teal-700 text-white">Simpan</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
