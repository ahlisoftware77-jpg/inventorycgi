import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add state
target_state = """  const [typeDesign, setTypeDesign] = useState("");
  const [designSource, setDesignSource] = useState("");"""
replacement_state = target_state + """\n  const [status, setStatus] = useState("FREE");"""
content = content.replace(target_state, replacement_state)

# 2. Add to loadReport
target_load = """    setTypeDesign(report.typeDesign || "");
    setDesignSource(report.designSource || "");"""
replacement_load = target_load + """\n    setStatus(report.status || "FREE");"""
content = content.replace(target_load, replacement_load)

# 3. Add to handleSave
target_save = """        darNo, customer, entryDate, designer, technician, purpose, designNo, typeDesign, designSource, items,"""
replacement_save = """        darNo, customer, entryDate, designer, technician, purpose, designNo, typeDesign, designSource, status, items,"""
content = content.replace(target_save, replacement_save)

# 3.b Add to clear form
target_clear = """    setTypeDesign("");
    setDesignSource("");"""
replacement_clear = target_clear + """\n    setStatus("FREE");"""
content = content.replace(target_clear, replacement_clear)

# 4. Add to export Excel
target_export = """        "Tipe Desain": r.typeDesign || "",
        "Sumber Desain": r.designSource || "","""
replacement_export = target_export + """\n        "Status": r.status || "FREE","""
content = content.replace(target_export, replacement_export)

# 5. Add getStatusColor function
target_helper = """  const handleUpdateHistoryField = async (id: string, field: string, value: string) => {"""
replacement_helper = """  const getStatusColor = (val: string) => {
    switch(val) {
      case 'IN LOCK': return 'bg-rose-500 text-white border-rose-600';
      case 'IN USE': return 'bg-emerald-500 text-white border-emerald-600';
      case 'FREE': return 'bg-blue-500 text-white border-blue-600';
      case 'ARCHIVE': return 'bg-sky-400 text-white border-sky-500';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

""" + target_helper
content = content.replace(target_helper, replacement_helper)

# 6. Tab Umum UI
target_umum = """              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal Riwayat)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Sumber Desain <span className="font-normal">(Internal Riwayat)</span></Label>
                  <input list="sumberDesainOptions" value={designSource} onChange={e => setDesignSource(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
              </div>"""
replacement_umum = """              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-bold text-slate-500">Status <span className="font-normal">(Internal Riwayat)</span></Label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${getStatusColor(status)}`}
                  >
                    <option value="" className="bg-white text-slate-900">Pilih Status...</option>
                    <option value="IN LOCK" className="bg-rose-500 text-white">IN LOCK</option>
                    <option value="IN USE" className="bg-emerald-500 text-white">IN USE</option>
                    <option value="FREE" className="bg-blue-500 text-white">FREE</option>
                    <option value="ARCHIVE" className="bg-sky-400 text-white">ARCHIVE</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Sumber Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="sumberDesainOptions" value={designSource} onChange={e => setDesignSource(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
              </div>"""
content = content.replace(target_umum, replacement_umum)

# 7. Mobile History Table
target_mobile = """                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipe & Sumber</span>"""
replacement_mobile = """                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Status, Tipe & Sumber</span>
                                                <div className="flex gap-2 mt-1">
                                                    <select 
                                                        value={report.status || "FREE"} 
                                                        onChange={e => handleUpdateHistoryField(report.id, 'status', e.target.value)} 
                                                        className={`flex h-8 w-24 rounded border px-2 text-[9px] font-bold outline-none transition-colors ${getStatusColor(report.status || "FREE")}`}
                                                    >
                                                        <option value="IN LOCK" className="bg-rose-500 text-white">IN LOCK</option>
                                                        <option value="IN USE" className="bg-emerald-500 text-white">IN USE</option>
                                                        <option value="FREE" className="bg-blue-500 text-white">FREE</option>
                                                        <option value="ARCHIVE" className="bg-sky-400 text-white">ARCHIVE</option>
                                                    </select>
                                                </div>"""
content = content.replace(target_mobile, replacement_mobile)

# 8. Desktop History Table Header
target_desktop_header = """                                        <th className="p-3">Tipe Desain</th>
                                        <th className="p-3">Sumber Desain</th>"""
replacement_desktop_header = """                                        <th className="p-3">Status</th>
                                        <th className="p-3">Tipe Desain</th>
                                        <th className="p-3">Sumber Desain</th>"""
content = content.replace(target_desktop_header, replacement_desktop_header)

# 9. Desktop History Table Body
target_desktop_body = """                                            <td className="p-3">
                                                <input 
                                                    list="typeDesainOptions" """
replacement_desktop_body = """                                            <td className="p-3">
                                                <select 
                                                    value={report.status || "FREE"} 
                                                    onChange={e => handleUpdateHistoryField(report.id, 'status', e.target.value)} 
                                                    className={`flex h-8 w-20 rounded border px-2 text-[9px] font-bold outline-none transition-colors cursor-pointer ${getStatusColor(report.status || "FREE")}`}
                                                >
                                                    <option value="IN LOCK" className="bg-rose-500 text-white">IN LOCK</option>
                                                    <option value="IN USE" className="bg-emerald-500 text-white">IN USE</option>
                                                    <option value="FREE" className="bg-blue-500 text-white">FREE</option>
                                                    <option value="ARCHIVE" className="bg-sky-400 text-white">ARCHIVE</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    list="typeDesainOptions" """
content = content.replace(target_desktop_body, replacement_desktop_body)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
