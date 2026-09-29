import React, { useState, useEffect } from 'react';
import { db } from '@/lib/firebase/config';
import { collection, query, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Send, Clock, CheckCircle2, Copy, ExternalLink, Trash2, Layers } from 'lucide-react';

export default function CustomerSendHistoryModal() {
  const { toast } = useToast();
  const [transfers, setTransfers] = useState<any[]>([]);
  const [links, setLinks] = useState<any[]>([]);
  const history = [...transfers, ...links].sort((a,b) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const q1 = query(collection(db, "customer_transfers"));
    const unsub1 = onSnapshot(q1, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const d = doc.data();
        return { id: doc.id, type: 'transfer', ...d };
      });
      setTransfers(docs);
    });

    const q2 = query(collection(db, "customer_links"));
    const unsub2 = onSnapshot(q2, (snapshot) => {
      const docs = snapshot.docs.map(doc => {
        const d = doc.data();
        return {
          id: doc.id,
          type: 'link',
          subject: 'Link: ' + (d.itemName || d.designNo),
          recipientEmail: d.customerEmail,
          senderName: d.senderName,
          status: 'sent',
          files: [d.originalFileId],
          createdAt: d.createdAt
        };
      });
      setLinks(docs);
    });

    return () => { unsub1(); unsub2(); };
  }, [isOpen]);

  const handleDeleteTransfer = async (id: string, type: string = "transfer") => {
    if (!confirm('Apakah Anda yakin ingin menghapus history transfer ini?')) return;
    try {
      if (type === 'link') {
        await deleteDoc(doc(db, 'customer_links', id));
      } else {
        await deleteDoc(doc(db, 'customer_transfers', id));
      }
      toast({ title: 'Berhasil', description: 'Riwayat transfer dihapus.' });
    } catch (e: any) {
      toast({ title: 'Gagal', description: e.message, variant: 'destructive' });
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="flex items-center gap-2 border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 hover:text-blue-800 font-bold h-9">
          <Send className="w-4 h-4" />
          Riwayat Transfer
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col rounded-3xl p-0 gap-0">
        <DialogHeader className="px-6 py-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <DialogTitle className="text-xl font-black flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-500" /> Riwayat Customer Send
          </DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin bg-white dark:bg-slate-950">
          {history.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-slate-400">
              <Send className="w-12 h-12 mb-4 opacity-20" />
              <p className="font-medium">Belum ada riwayat transfer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {history.map((h) => (
                <div key={h.id} className={`p-4 rounded-2xl border flex flex-col gap-2 relative group ${h.status === 'draft' ? 'bg-amber-50/50 dark:bg-amber-900/10 border-amber-100 dark:border-amber-900/30' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800'}`}>
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        {h.status === 'draft' ? (
                          <Clock className="w-4 h-4 text-amber-500" />
                        ) : (
                          <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        )}
                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{h.subject}</p>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">{h.recipientEmail} &middot; {h.senderName || 'Admin'}</p>
                    </div>
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md ${h.status === 'draft' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}`}>
                      {h.files?.length || 0} File
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <Input 
                      readOnly 
                      value={h.type === 'link' ? `${window.location.origin}/download?id=${h.id}` : `${window.location.origin}/public/transfer?id=${h.id}`} 
                      className="h-8 text-xs bg-white dark:bg-slate-950" 
                    />
                    <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                      navigator.clipboard.writeText(h.type === 'link' ? `${window.location.origin}/download?id=${h.id}` : `${window.location.origin}/public/transfer?id=${h.id}`);
                      toast({ title: 'Disalin', description: 'Link transfer disalin.' });
                    }}>
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="outline" 
                      className="h-8 w-8 shrink-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" 
                      onClick={() => window.open(h.type === 'link' ? `${window.location.origin}/download?id=${h.id}` : `${window.location.origin}/public/transfer?id=${h.id}`, "_blank")}
                    >
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                    <Button 
                      size="icon" 
                      variant="ghost" 
                      className="h-8 w-8 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                      onClick={() => handleDeleteTransfer(h.id, h.type)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
