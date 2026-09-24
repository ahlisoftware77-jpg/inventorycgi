"use client";

import { useState, useEffect } from "react";
import { WarehouseItem } from "@/app/warehouse/page";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ShoppingCart, Send, X, Loader2, Minus, Plus } from "lucide-react";
import { addDoc, collection, doc, getDoc, serverTimestamp } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface WarehouseCartProps {
  selectedItems: WarehouseItem[];
  departments: string[];
  onClear: () => void;
  onRemoveItem: (id: string) => void;
}

export function WarehouseCart({ selectedItems, departments, onClear, onRemoveItem }: WarehouseCartProps) {
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [quantities, setQuantities] = useState<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [requestDept, setRequestDept] = useState("");
  const { user } = useAuth();
  const { toast } = useToast();

  if (selectedItems.length === 0) return null;

  const handleUpdateQty = (id: string, delta: number) => {
    setQuantities(prev => ({
      ...prev,
      [id]: Math.max(1, (prev[id] || 1) + delta)
    }));
  };

  const handleUpdateNote = (id: string, note: string) => {
    setNotes(prev => ({ ...prev, [id]: note }));
  };

  const handleSubmit = async () => {
    if (!requestDept.trim()) {
      toast({ variant: "destructive", title: "Departemen Wajib Diisi", description: "Mohon isi nama departemen yang meminta." });
      return;
    }

    setLoading(true);
    try {
      // 1. Dapatkan setting email tujuan dari Firestore
      const generalSnap = await getDoc(doc(db, 'settings', 'general'));
      const emails = generalSnap.exists() ? generalSnap.data().warehouseRequestEmails || [] : [];
      const emailSnap = await getDoc(doc(db, 'settings', 'email'));
      const emailSettings = emailSnap.exists() ? emailSnap.data() : null;
      
      const smtp = emailSettings ? {
        host: emailSettings.smtpHost || '',
        port: emailSettings.smtpPort || 465,
        secure: emailSettings.smtpSecure !== undefined ? emailSettings.smtpSecure : true,
        user: emailSettings.smtpUser || '',
        pass: emailSettings.smtpPass || ''
      } : { host: '', port: 465, user: '', pass: '' };

      const finalRequesterName = user?.displayName || (user as any)?.name || (user?.email ? user.email.split('@')[0] : 'Guest');

      // 2. Simpan request ke Firestore
      const requestData = {
        requesterId: user?.uid || 'guest',
        requesterName: finalRequesterName,
        requestDept: requestDept,
        requestedAt: serverTimestamp(),
        status: 'Menunggu',
        items: selectedItems.map(item => {
          const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
          const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
          const reqQty = quantities[item.id] || 1;
          return {
            id: item.id,
            materialCode: item.materialCode,
            materialName: item.materialName,
            specification: item.specification,
            unit: item.unit,
            qty: reqQty,
            note: notes[item.id] || '',
            endingStock: endingStock,
            exceedsStock: reqQty > endingStock
          };
        })
      };

      const docRef = await addDoc(collection(db, 'warehouse_requests'), requestData);

      // 3. Kirim Email (jika ada penerima)
      if (emails.length > 0 && smtp.host) {
        const htmlContent = `
          <div style="font-family: sans-serif; padding: 20px;">
            <h2 style="color: #ea580c;">Permintaan Barang Baru (Warehouse)</h2>
            <p><strong>Peminta:</strong> ${requestData.requesterName}</p>
            <p><strong>Departemen:</strong> ${requestData.requestDept}</p>
            <p><strong>Waktu:</strong> ${new Date().toLocaleString('id-ID')}</p>
            <br/>
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background-color: #f1f5f9;">
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Kode</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Nama Barang</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Spesifikasi</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Qty Diminta</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Sisa Stok Gudang</th>
                  <th style="padding: 8px; border: 1px solid #cbd5e1;">Catatan</th>
                </tr>
              </thead>
              <tbody>
                ${requestData.items.map(i => `
                  <tr style="${i.exceedsStock ? 'background-color: #fff1f2;' : ''}">
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i.materialCode || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">
                      ${i.materialName}
                      ${i.exceedsStock ? '<br/><span style="color: #e11d48; font-size: 12px; font-weight: bold;">⚠️ Permintaan melebihi stok!</span>' : ''}
                    </td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${i.specification || '-'}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center; font-weight: bold; ${i.exceedsStock ? 'color: #e11d48;' : ''}">${i.qty} ${i.unit}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1; text-align: center;">${i.endingStock} ${i.unit}</td>
                    <td style="padding: 8px; border: 1px solid #cbd5e1;">${i.note || '-'}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
            <br/>
            ${requestData.items.some(i => i.exceedsStock) ? `
            <div style="background-color: #fff1f2; border-left: 4px solid #e11d48; padding: 12px; margin-bottom: 16px;">
              <p style="color: #be123c; margin: 0; font-weight: bold;">⚠️ Perhatian: Terdapat Permintaan Melebihi Stok</p>
              <p style="color: #9f1239; margin: 4px 0 0 0; font-size: 14px;">Beberapa barang yang diminta saat ini sedang kosong atau jumlah permintaannya melebihi ketersediaan fisik di gudang. Mohon untuk segera menindaklanjuti dengan melakukan pemesanan ulang (Restock) atau konfirmasi kembali kepada departemen peminta.</p>
            </div>
            ` : ''}
            <p>Mohon segera ditindaklanjuti.</p>
          </div>
        `;

        await fetch('/api/send-email', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            smtp: smtp,
            to: emails,
            subject: `[Warehouse Request] Permintaan Barang dari ${requestData.requestDept}`,
            html: htmlContent,
            action: 'send'
          })
        });
      }

      toast({ title: "Berhasil!", description: "Permintaan berhasil dikirim." });
      onClear();
      setIsOpen(false);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Error", description: "Gagal mengirim permintaan." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      {isOpen && (
        <Card className="mb-4 w-[400px] shadow-2xl border-orange-200 overflow-hidden bg-white">
          <div className="bg-orange-500 text-white p-3 flex justify-between items-center">
            <h3 className="font-bold flex items-center gap-2">
              <ShoppingCart className="w-4 h-4" /> Keranjang Permintaan
            </h3>
            <button onClick={() => setIsOpen(false)} className="hover:bg-orange-600 p-1 rounded">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-4 max-h-[50vh] overflow-y-auto space-y-4">
            <div className="space-y-1">
              <Label className="text-xs font-bold text-slate-500 uppercase tracking-wider">Departemen Peminta</Label>
              <Select value={requestDept} onValueChange={setRequestDept}>
                <SelectTrigger className="border-orange-200 focus:ring-orange-500">
                  <SelectValue placeholder="Pilih Departemen..." />
                </SelectTrigger>
                <SelectContent>
                  {departments.map((dept) => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-3 mt-4">
              {selectedItems.map((item) => {
                const stockOutTotal = Object.values(item.stockOut || {}).reduce((sum, val) => sum + (val || 0), 0);
                const endingStock = (item.lastStock || 0) + (item.stockIn || 0) - stockOutTotal;
                
                return (
                  <div key={item.id} className="border border-slate-200 rounded-lg p-3 bg-slate-50 relative group">
                    <button 
                      onClick={() => onRemoveItem(item.id)}
                      className="absolute -top-2 -right-2 bg-red-100 text-red-600 p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-3 h-3" />
                    </button>
                    <p className="font-bold text-sm text-slate-800 pr-4">{item.materialName}</p>
                    <div className="flex justify-between items-center mt-1">
                      <p className="text-[10px] text-slate-500">{item.materialCode} • {item.specification}</p>
                      <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                        Sisa Stok: {endingStock} {item.unit}
                      </Badge>
                    </div>
                    
                    <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center border rounded-md bg-white">
                      <button onClick={() => handleUpdateQty(item.id, -1)} className="p-1 text-slate-400 hover:text-slate-600"><Minus className="w-3 h-3" /></button>
                      <span className="w-8 text-center text-xs font-bold">{quantities[item.id] || 1}</span>
                      <button onClick={() => handleUpdateQty(item.id, 1)} className="p-1 text-slate-400 hover:text-slate-600"><Plus className="w-3 h-3" /></button>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">{item.unit}</span>
                  </div>
                  
                    <Input 
                      placeholder="Catatan / Keperluan..." 
                      value={notes[item.id] || ''}
                      onChange={e => handleUpdateNote(item.id, e.target.value)}
                      className="h-7 text-xs mt-2"
                    />
                  </div>
                );
              })}
            </div>
          </div>
          <div className="p-3 bg-slate-50 border-t flex gap-2">
            <Button variant="outline" className="flex-1" onClick={onClear}>Kosongkan</Button>
            <Button className="flex-1 bg-orange-600 hover:bg-orange-700" onClick={handleSubmit} disabled={loading}>
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Send className="w-4 h-4 mr-2" />}
              Kirim Request
            </Button>
          </div>
        </Card>
      )}

      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="bg-orange-600 hover:bg-orange-700 text-white p-4 rounded-full shadow-2xl flex items-center justify-center relative transition-transform hover:scale-105 active:scale-95"
        >
          <ShoppingCart className="w-6 h-6" />
          <Badge className="absolute -top-2 -right-2 bg-white text-orange-600 border-2 border-orange-600 px-1.5 py-0 min-w-[24px] flex justify-center">
            {selectedItems.length}
          </Badge>
        </button>
      )}
    </div>
  );
}
