"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertTriangle, BookLock, Loader2 } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, writeBatch, doc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { WarehouseItem } from "@/app/warehouse/page";
import { useAuth } from "@/hooks/use-auth";

interface WarehouseClosingDialogProps {
  items: WarehouseItem[];
}

export function WarehouseClosingDialog({ items }: WarehouseClosingDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const { toast } = useToast();
  const { user } = useAuth();

  // Hanya tampilkan jika Admin atau punya permission canCloseWarehouse
  const canClose = user?.role === 'Admin' || user?.permissions?.canCloseWarehouse;
  
  if (!canClose) return null;

  const handleClosing = async () => {
    if (confirmText !== "TUTUP BUKU") {
      toast({
        title: "Konfirmasi Gagal",
        description: "Ketik kata 'TUTUP BUKU' dengan benar.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // 1. Buat ID Archive berdasarkan Tahun-Bulan (misal: 2026-09)
      const now = new Date();
      const year = now.getFullYear();
      const month = String(now.getMonth() + 1).padStart(2, '0');
      const archiveId = `${year}-${month}`;

      // 2. Buat referensi doc untuk event tutup buku
      const archiveEventRef = doc(db, "warehouse_archives", archiveId);

      // Kita bisa menggunakan multiple batches karena batas 1 batch = 500 operasi.
      // 1 item = 1 set (archive) + 1 update (reset) = 2 operasi.
      // Jadi maksimal per batch = 250 items.
      const CHUNK_SIZE = 250;
      const chunks = [];
      
      for (let i = 0; i < items.length; i += CHUNK_SIZE) {
        chunks.push(items.slice(i, i + CHUNK_SIZE));
      }

      for (let i = 0; i < chunks.length; i++) {
        const batch = writeBatch(db);
        const chunk = chunks[i];

        // Jika batch pertama, catat metadata event tutup buku di root doc
        if (i === 0) {
          batch.set(archiveEventRef, {
            closedAt: serverTimestamp(),
            closedBy: user?.uid,
            closedByName: user?.name || user?.email,
            itemCount: items.length
          }, { merge: true });
        }

        chunk.forEach(item => {
          // Hitung stok akhir saat ini
          const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
          const stockInTotal = Number(item.stockIn) || 0;
          const endingStock = (item.lastStock || 0) + stockInTotal - stockOutTotal;

          // Referensi ke subcollection items di dalam archive event
          const archiveItemRef = doc(collection(archiveEventRef, "items"), item.id);
          
          // Referensi ke dokumen item asli
          const itemRef = doc(db, "warehouse_items", item.id);

          // Operasi 1: Simpan riwayat lengkap (snapshot) ke archive
          batch.set(archiveItemRef, {
            ...item,
            endingStockAtClosing: endingStock,
            archivedAt: serverTimestamp()
          });

          // Operasi 2: Reset dokumen asli
          batch.update(itemRef, {
            lastStock: endingStock,
            stockIn: 0,
            stockInHistory: [],
            stockOut: {},
            stockOutHistory: [],
            updatedAt: serverTimestamp()
          });
        });

        // Eksekusi batch ini
        await batch.commit();
      }

      toast({
        title: "Tutup Buku Berhasil",
        description: `Stok akhir telah dipindahkan menjadi saldo awal untuk ${items.length} barang.`,
      });
      setOpen(false);
      setConfirmText("");
    } catch (error) {
      console.error("Error during warehouse closing: ", error);
      toast({
        title: "Tutup Buku Gagal",
        description: "Terjadi kesalahan sistem.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) setConfirmText(""); // Reset text on close
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-3 lg:px-4 text-red-600 border-red-200 hover:bg-red-50 bg-white">
          <BookLock className="w-4 h-4 lg:mr-2" />
          <span className="hidden lg:inline">Tutup Buku</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle className="text-red-600 flex items-center gap-2">
            <AlertTriangle className="w-5 h-5" />
            Tutup Buku / Stock Opname Bulanan
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 space-y-2">
            <p className="text-sm text-red-800 font-semibold uppercase tracking-wide">
              Tindakan Destruktif & Permanen!
            </p>
            <p className="text-sm text-red-700">
              Proses ini akan mereset riwayat transaksi Masuk & Keluar bulan ini menjadi 0.
            </p>
            <p className="text-sm text-red-700">
              <b>Ending Stock (Stok Akhir)</b> bulan ini akan dipindahkan secara massal menjadi <b>Last Stock (Saldo Awal)</b> untuk periode baru.
            </p>
            <p className="text-sm text-red-700">
              Riwayat lama akan di-backup ke database <i>Archive</i>.
            </p>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-700">
              Ketik <span className="font-bold text-slate-900 bg-slate-200 px-1 rounded">TUTUP BUKU</span> untuk melanjutkan:
            </label>
            <Input 
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              placeholder="TUTUP BUKU"
              className="text-center font-bold tracking-widest uppercase"
            />
          </div>

          <Button 
            disabled={loading || confirmText !== "TUTUP BUKU"}
            onClick={handleClosing}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Memproses Data...
              </>
            ) : "Proses Tutup Buku Sekarang"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
