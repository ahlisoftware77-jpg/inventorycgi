"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Share2, Copy, Check, Clock } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";

export function WarehouseShareDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [duration, setDuration] = useState("24");
  const [generatedLink, setGeneratedLink] = useState("");
  const [copied, setCopied] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const handleGenerateLink = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Calculate expiration time
      const hours = parseInt(duration, 10);
      let expiresAt = null;
      if (hours > 0) {
        expiresAt = new Date();
        expiresAt.setHours(expiresAt.getHours() + hours);
      }

      const docRef = await addDoc(collection(db, "shared_links"), {
        createdAt: serverTimestamp(),
        expiresAt: expiresAt ? expiresAt.getTime() : null,
        createdBy: user.uid,
        type: "both",
        active: true
      });

      // The document ID is the token
      const token = docRef.id;
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/shared-warehouse/${token}`;
      setGeneratedLink(link);
      setCopied(false);
    } catch (error) {
      console.error("Error generating link:", error);
      toast({
        title: "Gagal membuat link",
        description: "Terjadi kesalahan saat menyimpan ke database.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(generatedLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast({
        title: "Link disalin!",
        description: "Link berhasil disalin ke clipboard."
      });
    } catch (error) {
      toast({
        title: "Gagal menyalin",
        description: "Browser Anda tidak mendukung fitur ini.",
        variant: "destructive"
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={(o) => {
      setOpen(o);
      if (!o) {
        // Reset when closed
        setTimeout(() => setGeneratedLink(""), 300);
      }
    }}>
      <DialogTrigger asChild>
        <Button variant="outline" className="h-9 px-3 lg:px-4 text-purple-600 border-purple-200 hover:bg-purple-50">
          <Share2 className="w-4 h-4 lg:mr-2" />
          <span className="hidden lg:inline">Share Halaman</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Buat Link Eksternal (Input Form)</DialogTitle>
        </DialogHeader>

        <div className="grid gap-6 py-4">
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Buat link khusus agar orang lain bisa menginput stok masuk dan keluar tanpa perlu login. Mereka hanya bisa menginput transaksi tanpa mengubah master data barang.
            </p>
            
            <div className="space-y-2">
              <label className="text-sm font-medium flex items-center gap-2">
                <Clock className="w-4 h-4 text-slate-400" />
                Masa Berlaku Link
              </label>
              <Select value={duration} onValueChange={setDuration}>
                <SelectTrigger>
                  <SelectValue placeholder="Pilih masa berlaku" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">1 Jam</SelectItem>
                  <SelectItem value="12">12 Jam</SelectItem>
                  <SelectItem value="24">24 Jam (1 Hari)</SelectItem>
                  <SelectItem value="72">72 Jam (3 Hari)</SelectItem>
                  <SelectItem value="168">1 Minggu</SelectItem>
                  <SelectItem value="0">Tidak Ada Batas Waktu</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {!generatedLink ? (
            <Button 
              onClick={handleGenerateLink} 
              disabled={loading}
              className="w-full bg-purple-600 hover:bg-purple-700"
            >
              {loading ? "Membuat..." : "Generate Link"}
            </Button>
          ) : (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 mt-2">
              <label className="text-sm font-medium text-slate-700">Link Berhasil Dibuat:</label>
              <div className="flex items-center gap-2">
                <Input 
                  readOnly 
                  value={generatedLink}
                  className="flex-1 bg-slate-50 font-mono text-slate-600 focus-visible:ring-0 focus-visible:ring-offset-0"
                />
                <Button 
                  onClick={handleCopy}
                  variant="outline"
                  size="icon"
                  className="shrink-0 rounded-md"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-600" />}
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
