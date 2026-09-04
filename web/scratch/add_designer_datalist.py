import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add dynamic arrays
target_arrays = """  const defaultDesignSource = ["MidJourney", "Shutterstock", "Create"];
  const dynamicDesignSourceOptions = Array.from(new Set([
    ...defaultDesignSource,
    ...historyData.map(r => r.designSource).filter(Boolean)
  ])).sort();"""

replacement_arrays = target_arrays + """

  const defaultDesigner = ["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan", "T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"];
  const dynamicDesignerOptions = Array.from(new Set([
    ...defaultDesigner,
    ...historyData.map(r => r.designer).filter(Boolean)
  ])).sort();"""

content = content.replace(target_arrays, replacement_arrays)


# 2. Add datalist element
target_datalists = """      <datalist id="sumberDesainOptions">
          {dynamicDesignSourceOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>"""

replacement_datalists = target_datalists + """
      <datalist id="designerOptions">
          {dynamicDesignerOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>"""

content = content.replace(target_datalists, replacement_datalists)


# 3. Update Input in Tab Umum
target_input = """<div><Label className="text-xs font-bold">Designer</Label><Input value={designer} onChange={e => setDesigner(e.target.value)} /></div>"""

replacement_input = """<div><Label className="text-xs font-bold">Designer</Label><input list="designerOptions" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={designer} onChange={e => setDesigner(e.target.value)} placeholder="Pilih / Ketik Designer..." /></div>"""

content = content.replace(target_input, replacement_input)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
