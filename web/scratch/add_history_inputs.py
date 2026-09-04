import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add handleUpdateHistoryField
target_delete = """  const handleDeleteReport = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "form_dar", id));
      setHistoryData(historyData.filter(h => h.id !== id));
      toast({ title: "Berhasil", description: "Laporan dihapus" });
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal menghapus laporan", variant: "destructive" });
    }
    setIsDeleting(false);
    setConfirmDeleteId(null);
  };"""

replacement_delete = target_delete + """

  const handleUpdateHistoryField = async (id: string, field: string, value: string) => {
    try {
      await updateDoc(doc(db, "form_dar", id), { [field]: value });
      setHistoryData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal memperbarui data", variant: "destructive" });
    }
  };"""

content = content.replace(target_delete, replacement_delete)

# Add Headers to Desktop Table
target_header = """                                        <th className="p-3">Designer</th>
                                        <th className="p-3">Design No</th>
                                        <th className="p-3">Items</th>"""

replacement_header = """                                        <th className="p-3">Designer</th>
                                        <th className="p-3">Design No</th>
                                        <th className="p-3">Items</th>
                                        <th className="p-3">Tipe Desain</th>
                                        <th className="p-3">Sumber Desain</th>"""

content = content.replace(target_header, replacement_header)

# Add Columns to Desktop Table Body
target_body = """                                            <td className="p-3">
                                                {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? ("""

replacement_body = """                                            <td className="p-3">
                                                {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? ("""

target_body_end = """                                            </td>
                                            <td className="p-2 pr-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">"""

replacement_body_end = """                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    list="typeDesainOptions" 
                                                    value={report.typeDesign || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'typeDesign', e.target.value)} 
                                                    className="border p-1 rounded text-[10px] w-24 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    placeholder="Tipe..." 
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    list="sumberDesainOptions" 
                                                    value={report.designSource || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'designSource', e.target.value)} 
                                                    className="border p-1 rounded text-[10px] w-28 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    placeholder="Sumber..." 
                                                />
                                            </td>
                                            <td className="p-2 pr-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">"""

content = content.replace(target_body_end, replacement_body_end)

# Add to Mobile View
target_mobile = """                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items</span>"""

replacement_mobile = """                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Tipe & Sumber</span>
                                                <div className="flex gap-2 mt-1">
                                                    <input 
                                                        list="typeDesainOptions" 
                                                        value={report.typeDesign || ""} 
                                                        onChange={(e) => handleUpdateHistoryField(report.id, 'typeDesign', e.target.value)} 
                                                        className="border p-1 rounded text-[10px] w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                        placeholder="Tipe..." 
                                                    />
                                                    <input 
                                                        list="sumberDesainOptions" 
                                                        value={report.designSource || ""} 
                                                        onChange={(e) => handleUpdateHistoryField(report.id, 'designSource', e.target.value)} 
                                                        className="border p-1 rounded text-[10px] w-full bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                        placeholder="Sumber..." 
                                                    />
                                                </div>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items</span>"""

content = content.replace(target_mobile, replacement_mobile)

# Add datalists
target_datalists = """          <div className="flex-1 w-full bg-slate-200 relative overflow-hidden">
            {previewReportId && <iframe src={`/form-app/preview?id=${previewReportId}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>"""

replacement_datalists = """          <div className="flex-1 w-full bg-slate-200 relative overflow-hidden">
            {previewReportId && <iframe src={`/form-app/preview?id=${previewReportId}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
          
          <datalist id="typeDesainOptions">
              <option value="CG" />
              <option value="CGI" />
              <option value="CGI-A" />
              <option value="ST" />
              <option value="CGL" />
              <option value="CO" />
          </datalist>
          <datalist id="sumberDesainOptions">
              <option value="MidJourney" />
              <option value="Shutterstock" />
              <option value="Create" />
          </datalist>
          
        </DialogContent>
      </Dialog>
    </DashboardLayout>"""

content = content.replace(target_datalists, replacement_datalists)

# Finally, ensure they are also exported!
target_export = """        "Closing Date": r.closingDate || "",
        "Purpose": (r.purpose || []).join(", "),
      };"""

replacement_export = """        "Closing Date": r.closingDate || "",
        "Purpose": (r.purpose || []).join(", "),
        "Tipe Desain": r.typeDesign || "",
        "Sumber Desain": r.designSource || "",
      };"""

content = content.replace(target_export, replacement_export)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
