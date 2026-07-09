'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { writeBatch, doc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Loader2, MapPin, ShieldAlert, X, ArrowRight } from 'lucide-react';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { type Asset } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { motion } from 'framer-motion';

interface BulkUpdateLocationPanelProps {
  selectedAssets: Asset[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const CORRECT_PIN = "7327";
const defaultDepartments = ['ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D'];

export default function BulkUpdateLocationPanel({
  selectedAssets,
  isOpen,
  onClose,
  onSuccess,
}: BulkUpdateLocationPanelProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [pin, setPin] = useState('');
  const [newLocation, setNewLocation] = useState<string>('');
  const [departments, setDepartments] = useState<string[]>(defaultDepartments);
  const { toast } = useToast();

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'settings', 'general'), (docSnap) => {
      if (docSnap.exists() && docSnap.data().departments) {
        setDepartments(docSnap.data().departments);
      }
    });
    return () => unsub();
  }, []);

  const handleUpdate = async () => {
    if (selectedAssets.length === 0 || !newLocation) return;

    if (pin !== CORRECT_PIN) {
      toast({
        variant: 'destructive',
        title: 'PIN Salah',
        description: 'PIN yang Anda masukkan salah. Pembaruan dibatalkan.',
      });
      return;
    }
    
    setIsLoading(true);
    try {
      const batch = writeBatch(db);
      
      selectedAssets.forEach((asset) => {
        const assetRef = doc(db, 'assets', asset.id);
        batch.update(assetRef, { 
          location: newLocation,
          updatedAt: serverTimestamp()
        });
      });
      
      await batch.commit();

      toast({
        title: 'Lokasi Berhasil Diperbarui',
        description: `${selectedAssets.length} aset telah dipindahkan ke ${newLocation}.`,
      });
      onSuccess();
      setPin('');
      setNewLocation('');
      onClose();
    } catch (error) {
      console.error('Error bulk updating location:', error);
      toast({
        variant: 'destructive',
        title: 'Gagal Memperbarui',
        description: 'Terjadi kesalahan saat memperbarui lokasi aset.',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const isPinValid = pin === CORRECT_PIN;
  const canSubmit = isPinValid && newLocation && !isLoading;

  if (!isOpen) return null;

  return (
    <motion.div 
      initial={{ x: '100%' }}
      animate={{ x: 0 }}
      exit={{ x: '100%' }}
      transition={{ type: 'spring', damping: 25, stiffness: 200 }}
      className="fixed top-16 right-0 h-[calc(100vh-64px)] w-full sm:w-[400px] bg-white dark:bg-slate-950 shadow-2xl z-[45] border-l border-slate-200 dark:border-slate-800 flex flex-col"
    >
      <div className="p-8 bg-slate-900 text-white flex flex-col items-center text-center gap-2 shrink-0 relative">
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full hover:bg-white/10 text-white/40 hover:text-white transition-all"
        >
          <X className="h-5 w-5" />
        </button>
        <div className="p-3 bg-primary/20 rounded-2xl mb-2">
          <MapPin className="h-8 w-8 text-primary" />
        </div>
        <h2 className="text-2xl font-black uppercase tracking-tight text-white">Pindah Lokasi</h2>
        <p className="text-white/60 font-medium text-xs">
          Memindahkan <span className="font-bold text-white">{selectedAssets.length} aset</span> ke unit baru.
        </p>
      </div>

      <div className="flex-1 p-8 space-y-8 overflow-y-auto">
        <div className="space-y-3">
          <Label htmlFor="location-select-panel" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Pilih Departemen Tujuan</Label>
          <Select value={newLocation} onValueChange={setNewLocation}>
            <SelectTrigger id="location-select-panel" className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-bold text-slate-900 dark:text-white">
              <SelectValue placeholder="Pilih departemen..." />
            </SelectTrigger>
            <SelectContent className="z-[60] rounded-2xl border-slate-100">
              <ScrollArea className="h-64">
                  {departments.sort().map((dept) => (
                  <SelectItem key={dept} value={dept} className="font-bold py-3">{dept}</SelectItem>
                  ))}
              </ScrollArea>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3">
          <Label htmlFor="pin-bulk-location-panel" className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">PIN Konfirmasi Admin</Label>
          <Input 
            id="pin-bulk-location-panel"
            type="password"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="h-14 rounded-2xl bg-slate-50 dark:bg-slate-900 border-none shadow-inner font-black text-center text-2xl tracking-[1em] focus:ring-primary/20 text-black dark:text-white"
            autoComplete="new-password"
          />
        </div>

        <div className="bg-amber-50 dark:bg-amber-950/20 p-5 rounded-[2rem] border border-amber-100 dark:border-amber-900/50 flex items-start gap-4">
          <ShieldAlert className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
              <p className="text-[10px] font-black uppercase text-amber-900 dark:text-amber-200">Kebijakan Mutasi</p>
              <p className="text-[11px] leading-relaxed text-amber-900/70 dark:text-amber-200/50 font-medium">
                Tindakan ini akan mengubah lokasi fisik aset secara langsung. Pastikan data mutasi sudah diverifikasi oleh departemen terkait.
              </p>
          </div>
        </div>
      </div>

      <div className="p-8 bg-slate-50 dark:bg-slate-900/50 border-t flex flex-row gap-3">
        <Button variant="ghost" onClick={onClose} disabled={isLoading} className="flex-1 rounded-2xl h-14 font-black uppercase text-[10px] tracking-widest text-black">Batal</Button>
        <Button
          onClick={handleUpdate}
          disabled={!canSubmit}
          className="flex-[2] rounded-2xl h-14 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest shadow-xl shadow-primary/20 text-white"
        >
          {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ArrowRight className="mr-2 h-5 w-5" />}
          Jalankan Mutasi
        </Button>
      </div>
    </motion.div>
  );
}
