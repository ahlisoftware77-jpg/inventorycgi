import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Designer arrays and add Technician arrays
target_arrays = """  const defaultDesigner = ["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan", "T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"];
  const dynamicDesignerOptions = Array.from(new Set([
    ...defaultDesigner,
    ...historyData.map(r => r.designer).filter(Boolean)
  ])).sort();"""

replacement_arrays = """  const defaultDesigner = ["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"];
  const dynamicDesignerOptions = Array.from(new Set([
    ...defaultDesigner,
    ...historyData.map(r => r.designer).filter(Boolean)
  ])).sort();

  const defaultTechnician = ["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"];
  const dynamicTechnicianOptions = Array.from(new Set([
    ...defaultTechnician,
    ...historyData.map(r => r.technician).filter(Boolean)
  ])).sort();"""

content = content.replace(target_arrays, replacement_arrays)


# 2. Add technicianOptions datalist
target_datalists = """      <datalist id="designerOptions">
          {dynamicDesignerOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>"""

replacement_datalists = target_datalists + """
      <datalist id="technicianOptions">
          {dynamicTechnicianOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>"""

content = content.replace(target_datalists, replacement_datalists)


# 3. Update Technician Input in Tab Umum
target_input = """<div><Label className="text-xs font-bold">Technician</Label><Input value={technician} onChange={e => setTechnician(e.target.value)} /></div>"""

replacement_input = """<div><Label className="text-xs font-bold">Technician</Label><input list="technicianOptions" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={technician} onChange={e => setTechnician(e.target.value)} placeholder="Pilih / Ketik Technician..." /></div>"""

content = content.replace(target_input, replacement_input)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
