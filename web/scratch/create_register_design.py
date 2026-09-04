import os

page_path = "src/app/register-design/page.tsx"
content = """'use client';

import { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, where } from 'firebase/firestore';
import { Trash2, Plus, Save, Layers, CheckSquare, Search } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';

export interface RegisterDesignItem {
  id: string;
  darNo: string;
  entryDate: string;
  customer: string;
  itemName: string;
  designer: string;
  technician: string;
  status: string;
  typeDesign: string;
  designSource: string;
  designNo: string;
  requiredDate: string;
  closingDate: string;
  type: string;
  sizeChecks: string;
  sizeFaces: string;
  sizeCm1: string;
  sizeCm2: string;
  glazeChecks: string;
  glazeResidue: string;
  surfaceChecks: string;
  surfaceTemp: string;
  guPtv: string;
  inkChecks: string;
  inkOther: string;
  sendBy: string;
  benefit: string;
  lastTimeReq: string;
  feedback: string;
  feedbackDetails: string;
  lastDesignSupp: string;
  note2: string;
  generalNote: string;
  createdAt?: any;
  updatedAt?: any;
}

export default function RegisterDesignPage() {
  const [user, loadingUser] = useAuthState(auth);
  const { toast } = useToast();
  const [data, setData] = useState<RegisterDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  // Datalist options (same as form-app)
  const [typeDesignOptions, setTypeDesignOptions] = useState<string[]>(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
  const [designSourceOptions, setDesignSourceOptions] = useState<string[]>(["MidJourney", "Shutterstock", "Create"]);
  const [designerOptions, setDesignerOptions] = useState<string[]>(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
  const [technicianOptions, setTechnicianOptions] = useState<string[]>(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);

  // Grouping
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [targetDarNo, setTargetDarNo] = useState("");

  const fetchData = async () => {
    try {
      const q = query(collection(db, "register_design"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisterDesignItem));
      setData(items);
      
      // Update datalists dynamically
      const typeSet = new Set(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
      const srcSet = new Set(["MidJourney", "Shutterstock", "Create"]);
      const desSet = new Set(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
      const techSet = new Set(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
      
      items.forEach(i => {
        if (i.typeDesign) typeSet.add(i.typeDesign);
        if (i.designSource) srcSet.add(i.designSource);
        if (i.designer) desSet.add(i.designer);
        if (i.technician) techSet.add(i.technician);
      });
      
      setTypeDesignOptions(Array.from(typeSet).sort());
      setDesignSourceOptions(Array.from(srcSet).sort());
      setDesignerOptions(Array.from(desSet).sort());
      setTechnicianOptions(Array.from(techSet).sort());

    } catch (e) {
      console.error(e);
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAddRow = async () => {
    const newItem: Partial<RegisterDesignItem> = {
      darNo: "", entryDate: new Date().toISOString().split('T')[0], customer: "", itemName: "", designer: "", technician: "",
      status: "FREE", typeDesign: "", designSource: "", designNo: "", requiredDate: "", closingDate: "", type: "",
      sizeChecks: "", sizeFaces: "", sizeCm1: "", sizeCm2: "", glazeChecks: "", glazeResidue: "", surfaceChecks: "",
      surfaceTemp: "", guPtv: "", inkChecks: "", inkOther: "", sendBy: "", benefit: "", lastTimeReq: "",
      feedback: "", feedbackDetails: "", lastDesignSupp: "", note2: "", generalNote: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    try {
      const newRef = doc(collection(db, "register_design"));
      await setDoc(newRef, newItem);
      setData([{ id: newRef.id, ...newItem } as RegisterDesignItem, ...data]);
      toast({ title: "Baris baru ditambahkan" });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menambah baris", variant: "destructive" });
    }
  };

  const handleDeleteRow = async (id: string) => {
    if (!confirm("Hapus baris ini secara permanen?")) return;
    try {
      await deleteDoc(doc(db, "register_design", id));
      setData(data.filter(d => d.id !== id));
      const newSel = new Set(selectedIds);
      newSel.delete(id);
      setSelectedIds(newSel);
      toast({ title: "Baris dihapus" });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const handleUpdateCell = async (id: string, field: keyof RegisterDesignItem, value: string) => {
    // Update local state immediately
    setData(prev => prev.map(d => d.id === id ? { ...d, [field]: value } : d));
    
    // Update Firebase
    try {
      await updateDoc(doc(db, "register_design", id), { [field]: value, updatedAt: serverTimestamp() });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menyimpan perubahan", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
  };

  const handleGroupToDar = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Pilih minimal 1 desain", variant: "destructive" });
      return;
    }
    if (!targetDarNo) {
      toast({ title: "Nomor DAR harus diisi", variant: "destructive" });
      return;
    }

    const selectedItems = data.filter(d => selectedIds.has(d.id));
    
    // VALIDATION: Check if specifications are identical
    const specFields: (keyof RegisterDesignItem)[] = [
      'customer', 'designer', 'technician', 'typeDesign', 'designSource', 'designNo', 'type',
      'sizeChecks', 'sizeFaces', 'sizeCm1', 'sizeCm2', 'glazeChecks', 'glazeResidue', 'surfaceChecks',
      'surfaceTemp', 'guPtv', 'inkChecks', 'inkOther', 'sendBy', 'benefit'
    ];

    let isIdentical = true;
    let diffField = "";
    
    const firstItem = selectedItems[0];
    for (const item of selectedItems) {
      for (const field of specFields) {
        if (item[field] !== firstItem[field]) {
          isIdentical = false;
          diffField = field;
          break;
        }
      }
      if (!isIdentical) break;
    }

    if (!isIdentical) {
      toast({ 
        title: "Validasi Gagal!", 
        description: `Spesifikasi tidak sama pada kolom '${diffField}'. Semua desain yang dikelompokkan ke DAR yang sama harus memiliki spesifikasi yang identik.`, 
        variant: "destructive" 
      });
      return;
    }

    // UPDATE FIREBASE
    try {
      const promises = selectedItems.map(item => 
        updateDoc(doc(db, "register_design", item.id), { darNo: targetDarNo, updatedAt: serverTimestamp() })
      );
      await Promise.all(promises);
      
      // Update local state
      setData(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, darNo: targetDarNo } : d));
      setSelectedIds(new Set());
      setIsGroupDialogOpen(false);
      setTargetDarNo("");
      toast({ title: `Berhasil mendaftarkan ${selectedItems.length} desain ke DAR ${targetDarNo}` });
      
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menyimpan pengelompokan DAR", variant: "destructive" });
    }
  };

  const getStatusColor = (val: string) => {
    switch(val) {
      case 'IN LOCK': return 'bg-rose-500 text-white border-rose-600';
      case 'IN USE': return 'bg-emerald-500 text-white border-emerald-600';
      case 'FREE': return 'bg-blue-500 text-white border-blue-600';
      case 'ARCHIVE': return 'bg-sky-400 text-white border-sky-500';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const getTypeDesignColor = (val: string) => {
    switch(val) {
      case 'CG': return 'bg-sky-200 text-sky-900 border-sky-300';
      case 'CGI': return 'bg-yellow-200 text-yellow-900 border-yellow-300';
      case 'CGI-A': return 'bg-orange-200 text-orange-900 border-orange-300';
      case 'ST': return 'bg-emerald-200 text-emerald-900 border-emerald-300';
      case 'CGL': return 'bg-slate-200 text-slate-900 border-slate-300';
      case 'CO': return 'bg-purple-200 text-purple-900 border-purple-300';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  // Helper for input
  const CellInput = ({ row, field, list, width = "w-32", colorFn }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, colorFn?: (v: string) => string }) => {
    const [val, setVal] = useState(row[field] as string || "");
    
    // Sync local state if parent changes
    useEffect(() => { setVal(row[field] as string || "") }, [row[field]]);

    const handleBlur = () => {
      if (val !== row[field]) {
        handleUpdateCell(row.id, field, val);
      }
    };

    return (
      <input 
        list={list}
        value={val}
        onChange={e => setVal(e.target.value)}
        onBlur={handleBlur}
        className={`border border-transparent hover:border-slate-300 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 rounded p-1 text-[11px] outline-none transition-colors ${width} ${colorFn ? colorFn(val) : 'bg-transparent'}`}
      />
    );
  };

  const CellSelect = ({ row, field, options, width = "w-32", colorFn }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string }) => {
    const val = row[field] as string || "";
    return (
      <select 
        value={val}
        onChange={e => handleUpdateCell(row.id, field, e.target.value)}
        className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer ${width} ${colorFn ? colorFn(val) : 'bg-transparent'}`}
      >
        <option value="" className="bg-white text-slate-900">--</option>
        {options.map(opt => <option key={opt} value={opt} className="bg-white text-slate-900">{opt}</option>)}
      </select>
    );
  };

  const filteredData = data.filter(d => 
    !search || 
    (d.itemName || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.customer || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.darNo || "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200 bg-slate-50">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Layers className="text-blue-600" />
              Register Design
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Input desain individual bergaya Excel dan kelompokkan ke dalam Form DAR.</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari Item/Customer/DAR..."
                className="pl-9 h-9 w-64 text-sm"
              />
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsGroupDialogOpen(true)} disabled={selectedIds.size === 0} className="font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100">
              <CheckSquare className="w-4 h-4 mr-2" />
              Group to DAR ({selectedIds.size})
            </Button>
            <Button onClick={handleAddRow} size="sm" className="font-bold bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-1" />
              Baris Baru
            </Button>
          </div>
        </div>

        {/* Excel Grid Container */}
        <div className="flex-1 overflow-auto bg-slate-50 relative">
          <table className="w-max min-w-full text-left text-[11px] border-collapse bg-white">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b-2 border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="p-2 border-r text-center sticky left-0 bg-slate-100 z-20"><CheckSquare className="w-4 h-4 mx-auto text-slate-400" /></th>
                <th className="p-2 border-r bg-blue-50 text-blue-800">DAR No</th>
                <th className="p-2 border-r">Waktu</th>
                <th className="p-2 border-r">Nama Item</th>
                <th className="p-2 border-r">Customer</th>
                <th className="p-2 border-r">Designer</th>
                <th className="p-2 border-r">Technician</th>
                <th className="p-2 border-r">Status</th>
                <th className="p-2 border-r">Tipe Desain</th>
                <th className="p-2 border-r">Sumber Desain</th>
                <th className="p-2 border-r">Design No</th>
                <th className="p-2 border-r bg-slate-50">Type (W/F/D)</th>
                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Faces</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>
                <th className="p-2 border-r">Req Date</th>
                <th className="p-2 border-r">Closing Date</th>
                <th className="p-2 border-r">General Note</th>
                <th className="p-2 text-center sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={22} className="p-8 text-center text-slate-500 font-bold">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={22} className="p-8 text-center text-slate-500 font-bold">Tidak ada data desain.</td></tr>
              ) : (
                filteredData.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-blue-50/50 group transition-colors">
                    <td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50/50 z-10">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="w-4 h-4 cursor-pointer" />
                    </td>
                    <td className="p-1 border-r font-black text-blue-700 bg-blue-50/30">
                      <CellInput row={row} field="darNo" width="w-24" />
                    </td>
                    <td className="p-1 border-r"><CellInput row={row} field="entryDate" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="itemName" width="w-40" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="customer" width="w-32" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="designer" list="desOptions" width="w-28" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="technician" list="techOptions" width="w-28" /></td>
                    <td className="p-1 border-r">
                      <CellSelect row={row} field="status" options={["IN LOCK", "IN USE", "FREE", "ARCHIVE"]} colorFn={getStatusColor} width="w-24" />
                    </td>
                    <td className="p-1 border-r">
                      <CellInput row={row} field="typeDesign" list="typeOptions" colorFn={getTypeDesignColor} width="w-20" />
                    </td>
                    <td className="p-1 border-r"><CellInput row={row} field="designSource" list="srcOptions" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="designNo" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="type" width="w-20" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeChecks" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeFaces" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="glazeChecks" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="surfaceChecks" width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="guPtv" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="inkChecks" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="requiredDate" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="closingDate" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="generalNote" width="w-48" /></td>
                    <td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50/50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.id)} className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50">
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Datalists */}
      <datalist id="desOptions">{designerOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="techOptions">{technicianOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="typeOptions">{typeDesignOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="srcOptions">{designSourceOptions.map(o => <option key={o} value={o} />)}</datalist>

      {/* Grouping Dialog */}
      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group into DAR</DialogTitle>
            <DialogDescription>
              Anda akan mengelompokkan <b>{selectedIds.size}</b> desain ke dalam satu Nomor DAR. 
              Pastikan seluruh spesifikasi dari desain yang dipilih sudah sama.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-bold text-slate-700 block mb-2">Nomor DAR Tujuan</label>
            <Input 
              value={targetDarNo} 
              onChange={e => setTargetDarNo(e.target.value)} 
              placeholder="Contoh: DAR-2026-001" 
              className="font-bold text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Batal</Button>
            <Button onClick={handleGroupToDar} className="bg-blue-600 hover:bg-blue-700">Validasi & Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
"""

os.makedirs(os.path.dirname(page_path), exist_ok=True)
with open(page_path, "w", encoding="utf-8") as f:
    f.write(content)

# Update Task Checklist
task_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\task.md"
with open(task_path, "r", encoding="utf-8") as f:
    task_content = f.read()

task_content = task_content.replace("- `[/]` **2. Halaman Register Design (UI & Layout)**", "- `[x]` **2. Halaman Register Design (UI & Layout)**")
task_content = task_content.replace("- `[ ]` **2. Halaman Register Design (UI & Layout)**", "- `[x]` **2. Halaman Register Design (UI & Layout)**")
task_content = task_content.replace("- `[ ]` Buat file `src/app/register-design/page.tsx`.", "- `[x]` Buat file `src/app/register-design/page.tsx`.")
task_content = task_content.replace("- `[ ]` Buat kerangka halaman dengan `DashboardLayout`.", "- `[x]` Buat kerangka halaman dengan `DashboardLayout`.")
task_content = task_content.replace("- `[ ]` Buat struktur tabel Data Grid yang bisa di-scroll secara horizontal (lebar penuh).", "- `[x]` Buat struktur tabel Data Grid yang bisa di-scroll secara horizontal (lebar penuh).")
task_content = task_content.replace("- `[ ]` Buat header tabel untuk semua kolom spesifikasi", "- `[x]` Buat header tabel untuk semua kolom spesifikasi")

task_content = task_content.replace("- `[ ]` **3. Firebase & Inline Editing**", "- `[x]` **3. Firebase & Inline Editing**")
task_content = task_content.replace("- `[ ]` Buat logika _fetch_ data dari koleksi `register_design`.", "- `[x]` Buat logika _fetch_ data dari koleksi `register_design`.")
task_content = task_content.replace("- `[ ]` Fitur **Add Row**", "- `[x]` Fitur **Add Row**")
task_content = task_content.replace("- `[ ]` Fitur **Delete Row**", "- `[x]` Fitur **Delete Row**")
task_content = task_content.replace("- `[ ]` Fitur **Inline Edit**", "- `[x]` Fitur **Inline Edit**")
task_content = task_content.replace("- `[ ]` Sinkronisasi *Datalist*", "- `[x]` Sinkronisasi *Datalist*")

task_content = task_content.replace("- `[ ]` **4. Fitur Grouping & Validasi (Group to DAR)**", "- `[x]` **4. Fitur Grouping & Validasi (Group to DAR)**")
task_content = task_content.replace("- `[ ]` Tambahkan kolom *Checkbox* di setiap baris tabel.", "- `[x]` Tambahkan kolom *Checkbox* di setiap baris tabel.")
task_content = task_content.replace("- `[ ]` Buat tombol \"Group into DAR\".", "- `[x]` Buat tombol \"Group into DAR\".")
task_content = task_content.replace("- `[ ]` Buat Dialog Popup untuk memasukkan `darNo`.", "- `[x]` Buat Dialog Popup untuk memasukkan `darNo`.")
task_content = task_content.replace("- `[ ]` Buat logika **Validasi**", "- `[x]` Buat logika **Validasi**")
task_content = task_content.replace("- `[ ]` Eksekusi penyimpanan `darNo`", "- `[x]` Eksekusi penyimpanan `darNo`")

with open(task_path, "w", encoding="utf-8") as f:
    f.write(task_content)

print("Done")
