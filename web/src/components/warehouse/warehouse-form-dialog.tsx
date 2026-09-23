"use client";

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Loader2, Minus, ChevronUp, ChevronDown } from "lucide-react";
import { db } from "@/lib/firebase/config";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

export function WarehouseFormDialog() {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const STANDARD_DEPT_ORDER = [
    "FRIT Spare Part",
    "FRIT Packing",
    "MTc",
    "Mixer",
    "QC",
    "R&D",
    "LAB",
    "APP",
    "PPIC",
    "GA"
  ];

  const [formData, setFormData] = useState({
    materialCode: "",
    materialName: "",
    specification: "",
    unit: "",
    location: "",
    status: "Stock",
    lastStock: 0,
  });

  const [stockInHistory, setStockInHistory] = useState<{id: string, date: string, value: number, supplier: string, poNumber: string, isNew?: boolean}[]>([]);

  const [stockOutHistory, setStockOutHistory] = useState<{id: string, dept: string, value: number, date: string, pic: string}[]>(() => {
    const today = new Date().toISOString().split('T')[0];
    return [
      { id: crypto.randomUUID(), dept: "FRIT Spare Part", value: 0, date: today, pic: "" }
    ];
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const stockOutRecord: Record<string, number> = {};
      stockOutHistory.forEach(d => {
        if (d.dept.trim()) {
          stockOutRecord[d.dept.trim()] = (stockOutRecord[d.dept.trim()] || 0) + Number(d.value);
        }
      });

      const stockInTotal = stockInHistory.reduce((sum, d) => sum + (Number(d.value) || 0), 0);

      await addDoc(collection(db, "warehouse_items"), {
        ...formData,
        stockIn: stockInTotal,
        stockInHistory,
        stockOut: stockOutRecord,
        stockOutHistory,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      toast({ title: "Berhasil", description: "Data warehouse berhasil ditambahkan." });
      setOpen(false);
      
      // Reset form
      setFormData({
        materialCode: "",
        materialName: "",
        specification: "",
        unit: "",
        location: "",
        status: "Stock",
        lastStock: 0,
      });
      const today = new Date().toISOString().split('T')[0];
      setStockOutHistory([
        { id: crypto.randomUUID(), dept: "FRIT Spare Part", value: 0, date: today, pic: "" }
      ]);
      setStockInHistory([]);
    } catch (error) {
      console.error(error);
      toast({ title: "Gagal", description: "Terjadi kesalahan saat menyimpan data.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const addDeptRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();
    setStockOutHistory([...stockOutHistory, { id: newId, dept: "", value: 0, date: today, pic: "", isNew: true }]);
    
    setTimeout(() => {
      const container = document.getElementById('add-stock-out-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);

    setTimeout(() => {
      setStockOutHistory(prev => prev.map(r => r.id === newId ? { ...r, isNew: false } : r));
    }, 2000);
  };

  const removeDeptRow = (index: number) => {
    const newRows = stockOutHistory.filter((_, idx) => idx !== index);
    setStockOutHistory(newRows);
  };

  const addStockInRow = () => {
    const today = new Date().toISOString().split('T')[0];
    const newId = crypto.randomUUID();
    setStockInHistory([...stockInHistory, { id: newId, date: today, value: 0, supplier: "", poNumber: "", isNew: true }]);
    
    setTimeout(() => {
      const container = document.getElementById('add-stock-in-container');
      if (container) {
        container.scrollTop = container.scrollHeight;
      }
    }, 100);

    setTimeout(() => {
      setStockInHistory(prev => prev.map(r => r.id === newId ? { ...r, isNew: false } : r));
    }, 2000);
  };

  const removeStockInRow = (index: number) => {
    const newRows = stockInHistory.filter((_, idx) => idx !== index);
    setStockInHistory(newRows);
  };

  const stockOutTotal = stockOutHistory.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const stockInTotal = stockInHistory.reduce((sum, d) => sum + (Number(d.value) || 0), 0);
  const totalAvailable = (Number(formData.lastStock) || 0) + stockInTotal;
  const endingStock = totalAvailable - stockOutTotal;
  
  const stockPercentage = totalAvailable > 0 ? (endingStock / totalAvailable) * 100 : 0;
  
  let bgClass = "from-blue-600 to-blue-800 border-blue-900/50 text-white";
  let labelClass = "text-blue-200";
  let blinkClass = "";

  if (endingStock <= 0) {
    bgClass = "from-red-600 to-red-800 border-red-900/50 text-white";
    labelClass = "text-red-200";
    blinkClass = "animate-pulse";
  } else if (stockPercentage <= 3) {
    bgClass = "from-red-500 to-red-700 border-red-800/50 text-white";
    labelClass = "text-red-100";
  } else if (stockPercentage <= 10) {
    bgClass = "from-amber-500 to-orange-600 border-orange-700/50 text-white";
    labelClass = "text-orange-100";
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-blue-600 hover:bg-blue-700 font-bold shadow-lg shadow-blue-500/30">
          <Plus className="w-4 h-4 mr-2" />
          Tambah Barang
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-[95vw] w-[1400px] max-h-[95vh] flex flex-col p-6 overflow-hidden">
        <DialogHeader>
          <DialogTitle>Tambah Data Warehouse</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 overflow-hidden mt-2">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 overflow-y-auto pr-2 pb-4">
            
            {/* Column 1: Informasi Barang */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Material Code</Label>
                  <Input required value={formData.materialCode} onChange={e => setFormData({...formData, materialCode: e.target.value})} placeholder="Contoh: 0.01.01.001" />
                </div>
                <div className="space-y-2">
                  <Label>Material Name</Label>
                  <Input required value={formData.materialName} onChange={e => setFormData({...formData, materialName: e.target.value})} placeholder="Contoh: RANTAI" />
                </div>
              </div>
            
            <div className="space-y-2">
              <Label>Specification</Label>
              <Input value={formData.specification} onChange={e => setFormData({...formData, specification: e.target.value})} placeholder="Contoh: 100# length Standar" />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Unit</Label>
                <Input value={formData.unit} onChange={e => setFormData({...formData, unit: e.target.value})} placeholder="Pcs/Mtr" />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={formData.location} onChange={e => setFormData({...formData, location: e.target.value})} placeholder="A1" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-2">
                <Label>Status</Label>
                <Input value={formData.status} onChange={e => setFormData({...formData, status: e.target.value})} placeholder="Stock" />
              </div>
              <div className="space-y-2">
                <Label>Last Stock</Label>
                <Input type="number" required value={formData.lastStock} onChange={e => setFormData({...formData, lastStock: Number(e.target.value)})} />
              </div>
            </div>

            <div className={`mt-4 bg-gradient-to-br ${bgClass} ${blinkClass} rounded-xl p-4 shadow-inner flex flex-col justify-center items-center border`}>
              <span className={`${labelClass} text-xs font-bold uppercase tracking-widest mb-1`}>Ending Stock</span>
              <span className="text-6xl font-black tabular-nums tracking-tighter">{endingStock}</span>
            </div>
            </div>

          {/* Column 2: Stock In */}
          <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-emerald-600 font-bold">Stock In (Barang Masuk)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addStockInRow} className="h-8 border-emerald-200 text-emerald-600 hover:bg-emerald-50">
                <Plus className="w-3 h-3 mr-1" /> Tambah Stock In
              </Button>
            </div>
            
            <div id="add-stock-in-container" className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 overflow-y-auto overflow-x-hidden min-h-[250px]">
              {stockInHistory.map((row, idx) => (
                <div key={row.id} className={`flex flex-col gap-2 p-3 border rounded-md shadow-sm transition-colors duration-1000 ${row.isNew ? 'bg-blue-50 border-blue-300 animate-pulse' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <Input 
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const newRows = [...stockInHistory];
                        newRows[idx].date = e.target.value;
                        setStockInHistory(newRows);
                      }}
                      className="w-[140px] text-sm shrink-0"
                    />
                    <Input 
                      type="number"
                      placeholder="Jumlah" 
                      value={row.value || ''}
                      onChange={(e) => {
                        const newRows = [...stockInHistory];
                        newRows[idx].value = Number(e.target.value);
                        setStockInHistory(newRows);
                      }}
                      className="w-24 text-center shrink-0 font-bold text-blue-700"
                    />
                    <Input 
                      type="text"
                      placeholder="Supplier / Sumber" 
                      value={row.supplier}
                      onChange={(e) => {
                        const newRows = [...stockInHistory];
                        newRows[idx].supplier = e.target.value;
                        setStockInHistory(newRows);
                      }}
                      className="flex-1 text-sm"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input 
                      type="text"
                      placeholder="No. PO / Surat Jalan" 
                      value={row.poNumber}
                      onChange={(e) => {
                        const newRows = [...stockInHistory];
                        newRows[idx].poNumber = e.target.value;
                        setStockInHistory(newRows);
                      }}
                      className="flex-1 text-sm"
                      required
                    />
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeStockInRow(idx)}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {stockInHistory.length === 0 && (
                <p className="text-xs text-center text-slate-500 py-2">Tidak ada riwayat barang masuk.</p>
              )}
            </div>
          </div>

          {/* Column 3: Stock Out */}
          <div className="border-t lg:border-t-0 lg:border-l pt-4 lg:pt-0 lg:pl-6 flex flex-col min-h-[300px]">
            <div className="flex items-center justify-between mb-2">
              <Label className="text-blue-600 font-bold">Stock Out (Departemen)</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDeptRow} className="h-8">
                <Plus className="w-3 h-3 mr-1" /> Tambah Dept
              </Button>
            </div>
            
            <div id="add-stock-out-container" className="space-y-2 bg-slate-50 p-3 rounded-lg border border-slate-100 flex-1 overflow-y-auto overflow-x-hidden min-h-[250px]">
              {stockOutHistory.map((row, idx) => (
                <div key={row.id} className={`flex flex-col gap-2 p-3 border rounded-md shadow-sm transition-colors duration-1000 ${row.isNew ? 'bg-blue-50 border-blue-300 animate-pulse' : 'bg-white border-slate-200'}`}>
                  <div className="flex items-center gap-2">
                    <select
                      value={row.dept}
                      onChange={(e) => {
                        const newRows = [...stockOutHistory];
                        newRows[idx].dept = e.target.value;
                        setStockOutHistory(newRows);
                      }}
                      className="flex-1 bg-white border border-slate-200 rounded-md text-sm px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all shadow-sm font-medium text-slate-700 cursor-pointer"
                    >
                      <option value="" disabled>Pilih Departemen</option>
                      {STANDARD_DEPT_ORDER.map(dept => (
                        <option key={dept} value={dept}>{dept}</option>
                      ))}
                      {!STANDARD_DEPT_ORDER.includes(row.dept) && row.dept !== "" && (
                        <option value={row.dept}>{row.dept} (Lainnya)</option>
                      )}
                    </select>
                    
                    <Input 
                      type="number"
                      placeholder="Jumlah" 
                      value={row.value || ''}
                      onChange={(e) => {
                        const newRows = [...stockOutHistory];
                        newRows[idx].value = Number(e.target.value);
                        setStockOutHistory(newRows);
                      }}
                      className="w-24 text-center"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <Input 
                      type="date"
                      value={row.date}
                      onChange={(e) => {
                        const newRows = [...stockOutHistory];
                        newRows[idx].date = e.target.value;
                        setStockOutHistory(newRows);
                      }}
                      className="flex-1 text-sm"
                    />
                    <Input 
                      type="text"
                      placeholder="PIC / Penerima" 
                      value={row.pic}
                      onChange={(e) => {
                        const newRows = [...stockOutHistory];
                        newRows[idx].pic = e.target.value;
                        setStockOutHistory(newRows);
                      }}
                      className="flex-1 text-sm"
                    />
                    
                    <Button 
                      type="button" 
                      variant="outline" 
                      size="icon" 
                      onClick={() => removeDeptRow(idx)}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50 shrink-0"
                    >
                      <Minus className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
              {stockOutHistory.length === 0 && (
                <p className="text-xs text-center text-slate-500 py-2">Tidak ada riwayat pengambilan.</p>
              )}
            </div>
          </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 mt-4 border-t bg-white">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Batal</Button>
            <Button type="submit" disabled={loading} className="bg-blue-600">
              {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Simpan Data
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
