import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add getTypeDesignColor function
target_color = """  const getStatusColor = (val: string) => {"""
replacement_color = """  const getTypeDesignColor = (val: string) => {
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

""" + target_color
content = content.replace(target_color, replacement_color)

# 2. Update Tab Umum Tipe Desain Input
target_umum = """                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />"""
replacement_umum = """                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${getTypeDesignColor(typeDesign)}`} placeholder="Pilih / Ketik..." />"""
content = content.replace(target_umum, replacement_umum)

# 3. Update History Table Tipe Desain Input (Desktop)
target_history = """                                                <input 
                                                    list="typeDesainOptions" 
                                                    value={report.typeDesign || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'typeDesign', e.target.value)} 
                                                    className="border p-1 rounded text-[10px] w-24 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    placeholder="Tipe..." 
                                                />"""
replacement_history = """                                                <input 
                                                    list="typeDesainOptions" 
                                                    value={report.typeDesign || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'typeDesign', e.target.value)} 
                                                    className={`border p-1 rounded text-[10px] font-bold w-24 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${getTypeDesignColor(report.typeDesign || "")}`} 
                                                    placeholder="Tipe..." 
                                                />"""
content = content.replace(target_history, replacement_history)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
