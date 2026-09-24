"use client";

import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, ClipboardList, Check, X } from "lucide-react";
import { collection, query, where, getDocs, doc, updateDoc, serverTimestamp, getDoc, orderBy } from "firebase/firestore";
import { db } from "@/lib/firebase/config";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

export function WarehouseRequestsDialog() {
  const [open, setOpen] = useState(false);
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const q = query(
        collection(db, "warehouse_requests"),
        where("status", "==", "Menunggu")
      );
      const snapshot = await getDocs(q);
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Sort in memory since requestedAt might not be indexed with status
      data.sort((a: any, b: any) => (b.requestedAt?.seconds || 0) - (a.requestedAt?.seconds || 0));
      setRequests(data);
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memuat permintaan." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) {
      fetchRequests();
    }
  }, [open]);

  const handleApprove = async (request: any) => {
    setProcessingId(request.id);
    try {
      const today = new Date().toISOString().split('T')[0];
      const executedItems: any[] = [];
      const failedItems: any[] = [];

      for (const item of request.items) {
        const itemRef = doc(db, "warehouse_items", item.id);
        const itemSnap = await getDoc(itemRef);
        
        if (itemSnap.exists()) {
          const currentData = itemSnap.data();
          const reqQty = Number(item.qty) || 0;

          if (request.requestType === "in") {
            const newHistoryItem = {
              id: crypto.randomUUID(),
              date: today,
              value: reqQty,
              supplier: request.supplier || "",
              poNumber: request.poNumber || ""
            };
            
            let currentHistory = currentData.stockInHistory || [];
            if (!Array.isArray(currentHistory)) currentHistory = [];
            if (currentHistory.length === 0 && currentData.stockIn) {
               currentHistory.push({
                 id: crypto.randomUUID(),
                 date: currentData.createdAt?.seconds ? new Date(currentData.createdAt.seconds * 1000).toISOString().split('T')[0] : today,
                 value: Number(currentData.stockIn),
                 supplier: "System (Legacy)",
                 poNumber: "-"
               });
            }

            const newHistory = [...currentHistory, newHistoryItem];
            const newStockInTotal = newHistory.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

            await updateDoc(itemRef, {
              stockInHistory: newHistory,
              stockIn: newStockInTotal,
              updatedAt: serverTimestamp()
            });
            executedItems.push(item);

          } else {
            // Stock out
            const stockOutTotal = Object.values(currentData.stockOut || {}).reduce((sum: any, val: any) => sum + (val || 0), 0) as number;
            const endingStock = (currentData.lastStock || 0) + (currentData.stockIn || 0) - stockOutTotal;

            if (reqQty > endingStock) {
              failedItems.push({ ...item, reason: `Stok tidak cukup (Sisa: ${endingStock})` });
              continue; // Skip eksekusi karena stok tidak cukup
            }

            const newHistoryItem = {
              id: crypto.randomUUID(),
              dept: request.requestDept || "",
              value: reqQty,
              date: today,
              pic: request.requesterName || ""
            };

            let currentHistory = currentData.stockOutHistory || [];
            if (!Array.isArray(currentHistory)) {
              if (currentData.stockOut) {
                 currentHistory = Object.entries(currentData.stockOut).map(([dept, value]) => ({ 
                   id: crypto.randomUUID(),
                   dept, 
                   value: Number(value),
                   date: currentData.createdAt?.seconds ? new Date(currentData.createdAt.seconds * 1000).toISOString().split('T')[0] : today,
                   pic: "System (Legacy)"
                 }));
              } else {
                 currentHistory = [];
              }
            }

            const newHistory = [...currentHistory, newHistoryItem];
            const stockOutRecord: Record<string, number> = {};
            newHistory.forEach((d: any) => {
              if (d.dept.trim()) {
                stockOutRecord[d.dept.trim()] = (stockOutRecord[d.dept.trim()] || 0) + Number(d.value);
              }
            });

            await updateDoc(itemRef, {
              stockOutHistory: newHistory,
              stockOut: stockOutRecord,
              updatedAt: serverTimestamp()
            });
            executedItems.push(item);
          }
        } else {
          failedItems.push({ ...item, reason: "Barang tidak ditemukan di database" });
        }
      }

      await updateDoc(doc(db, "warehouse_requests", request.id), {
        status: executedItems.length > 0 ? "Selesai" : "Ditolak",
        processedAt: serverTimestamp(),
        executedItems,
        failedItems
      });

      // Kirim email balasan ke peminta
      let targetEmail = request.requesterEmail;
      if (!targetEmail && request.requesterId && request.requesterId !== 'guest') {
        const userSnap = await getDoc(doc(db, "users", request.requesterId));
        if (userSnap.exists()) {
          targetEmail = userSnap.data().email;
        }
      }

      if (targetEmail) {
        const emailSnap = await getDoc(doc(db, 'settings', 'email'));
        const emailSettings = emailSnap.exists() ? emailSnap.data() : null;
        const smtp = emailSettings ? {
          host: emailSettings.smtpHost || '',
          port: emailSettings.smtpPort || 465,
          secure: emailSettings.smtpSecure !== undefined ? emailSettings.smtpSecure : true,
          user: emailSettings.smtpUser || '',
          pass: emailSettings.smtpPass || ''
        } : null;

        if (smtp && smtp.host) {
          const typeName = request.requestType === "in" ? "Stock In" : "Stock Out";
          const htmlContent = `
            <div style="font-family: sans-serif; padding: 20px;">
              <h2 style="color: #0284c7;">Tanda Terima Permintaan ${typeName}</h2>
              <p>Halo <strong>${request.requesterName}</strong>,</p>
              <p>Berikut adalah tanda terima untuk permintaan barang Anda yang telah diproses oleh Admin Gudang:</p>
              <br/>

              ${executedItems.length > 0 ? `
              <h3 style="color: #16a34a; margin-top: 10px;">✅ Barang Diterima / Diproses</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #f0fdf4;">
                    <th style="padding: 6px; border: 1px solid #bbf7d0; text-align: left;">Barang</th>
                    <th style="padding: 6px; border: 1px solid #bbf7d0; text-align: center;">Jumlah</th>
                  </tr>
                </thead>
                <tbody>
                  ${executedItems.map(item => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #bbf7d0;">${item.materialName}</td>
                      <td style="padding: 6px; border: 1px solid #bbf7d0; text-align: center; font-weight: bold;">${item.qty} ${item.unit}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              ` : ''}

              ${failedItems.length > 0 ? `
              <h3 style="color: #dc2626; margin-top: 10px;">❌ Barang Ditolak / Gagal</h3>
              <table style="width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px;">
                <thead>
                  <tr style="background-color: #fef2f2;">
                    <th style="padding: 6px; border: 1px solid #fecaca; text-align: left;">Barang</th>
                    <th style="padding: 6px; border: 1px solid #fecaca; text-align: center;">Jumlah</th>
                    <th style="padding: 6px; border: 1px solid #fecaca; text-align: left;">Alasan</th>
                  </tr>
                </thead>
                <tbody>
                  ${failedItems.map(item => `
                    <tr>
                      <td style="padding: 6px; border: 1px solid #fecaca;">${item.materialName}</td>
                      <td style="padding: 6px; border: 1px solid #fecaca; text-align: center; font-weight: bold;">${item.qty} ${item.unit}</td>
                      <td style="padding: 6px; border: 1px solid #fecaca; color: #dc2626;">${item.reason}</td>
                    </tr>
                  `).join('')}
                </tbody>
              </table>
              <p style="font-size: 12px; color: #dc2626;">Barang yang gagal kemungkinan karena stok tidak mencukupi atau barang tidak ditemukan.</p>
              ` : ''}
              
              <p style="margin-top: 24px; font-size: 12px; color: #64748b; border-top: 1px solid #e2e8f0; padding-top: 10px;">Pesan ini dihasilkan secara otomatis oleh sistem CGI Inventory.</p>
            </div>
          `;

          const getApiUrl = () => {
            if (typeof window !== 'undefined' && window.location.hostname.includes('web.app')) {
              return 'https://inventorycgi.vercel.app/api/send-email';
            }
            return '/api/send-email';
          };

          try {
            const res = await fetch(getApiUrl(), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                smtp: smtp,
                to: [targetEmail],
                subject: `[Warehouse] Tanda Terima Permintaan ${typeName}`,
                html: htmlContent,
                action: 'send'
              })
            });
            if (!res.ok) {
              console.error("Gagal kirim email tanda terima:", await res.text());
              toast({ variant: "destructive", title: "Email Gagal", description: "Tanda terima gagal dikirim ke email peminta." });
            }
          } catch (err) {
            console.error(err);
          }
        }
      } else {
        toast({ variant: "destructive", title: "Email Tidak Ditemukan", description: "Tidak dapat mengirim email tanda terima karena email peminta tidak diketahui." });
      }

      toast({ title: "Berhasil!", description: `Permintaan diproses. ${executedItems.length} berhasil, ${failedItems.length} gagal.` });
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal memproses permintaan." });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (id: string) => {
    setProcessingId(id);
    try {
      await updateDoc(doc(db, "warehouse_requests", id), {
        status: "Ditolak",
        processedAt: serverTimestamp()
      });
      toast({ title: "Permintaan Ditolak." });
      fetchRequests();
    } catch (e) {
      console.error(e);
      toast({ variant: "destructive", title: "Gagal menolak permintaan." });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-orange-200 text-orange-700 hover:bg-orange-50 relative">
          <ClipboardList className="w-4 h-4 mr-2" />
          Daftar Permintaan
          {/* We could add a live notification badge here later if needed */}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Daftar Permintaan Warehouse</DialogTitle>
        </DialogHeader>
        
        <div className="flex-1 overflow-y-auto pr-2 mt-4 space-y-4">
          {loading ? (
            <div className="flex justify-center p-8">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : requests.length === 0 ? (
            <div className="text-center p-8 text-slate-500">
              Tidak ada permintaan baru (Menunggu).
            </div>
          ) : (
            requests.map(req => (
              <div key={req.id} className="border border-slate-200 rounded-xl p-4 bg-white shadow-sm">
                <div className="flex justify-between items-start mb-3 border-b pb-3">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-bold text-lg">{req.requesterName}</h4>
                      <Badge variant="outline" className={req.requestType === 'in' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-orange-50 text-orange-700 border-orange-200'}>
                        {req.requestType === 'in' ? 'Stock In' : 'Stock Out'}
                      </Badge>
                    </div>
                    {req.requestType === 'in' ? (
                      <p className="text-sm text-slate-600">Supplier: <strong>{req.supplier}</strong> (PO: {req.poNumber || '-'})</p>
                    ) : (
                      <p className="text-sm text-slate-600">Departemen: <strong>{req.requestDept}</strong></p>
                    )}
                    <p className="text-xs text-slate-400 mt-1">
                      Waktu: {req.requestedAt?.seconds ? new Date(req.requestedAt.seconds * 1000).toLocaleString('id-ID') : '-'}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-red-200 text-red-600 hover:bg-red-50"
                      onClick={() => handleReject(req.id)}
                      disabled={processingId === req.id}
                    >
                      <X className="w-4 h-4 mr-1" /> Tolak
                    </Button>
                    <Button 
                      size="sm" 
                      className="bg-green-600 hover:bg-green-700 text-white"
                      onClick={() => handleApprove(req)}
                      disabled={processingId === req.id}
                    >
                      {processingId === req.id ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Check className="w-4 h-4 mr-1" />}
                      Eksekusi
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <h5 className="text-xs font-bold text-slate-500 uppercase">Daftar Barang:</h5>
                  <div className="bg-slate-50 rounded-lg border border-slate-100 overflow-hidden">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="bg-slate-100/50 text-left text-slate-600">
                          <th className="p-2 font-medium">Barang</th>
                          <th className="p-2 font-medium">Spesifikasi</th>
                          <th className="p-2 font-medium text-center">Jumlah</th>
                          <th className="p-2 font-medium">Catatan</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {req.items?.map((item: any, idx: number) => (
                          <tr key={idx}>
                            <td className="p-2">
                              <span className="font-medium text-slate-800">{item.materialName}</span>
                              <br/><span className="text-xs text-slate-500">{item.materialCode || '-'}</span>
                            </td>
                            <td className="p-2 text-slate-600">{item.specification || '-'}</td>
                            <td className="p-2 text-center">
                              <span className={`font-bold ${req.requestType === 'in' ? 'text-green-600' : 'text-orange-600'}`}>
                                {req.requestType === 'in' ? '+' : '-'}{item.qty} {item.unit}
                              </span>
                            </td>
                            <td className="p-2 text-slate-600 text-xs">{item.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
