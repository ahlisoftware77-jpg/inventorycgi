import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. State
target_state = """  const [purpose, setPurpose] = useState<string[]>([]); // Customer, Internal, etc
  const [designNo, setDesignNo] = useState("");"""

replacement_state = target_state + """
  const [typeDesign, setTypeDesign] = useState("");
  const [designSource, setDesignSource] = useState("");"""

content = content.replace(target_state, replacement_state)

# 2. loadReport
target_load = """    setPurpose(report.purpose || []);
    setDesignNo(report.designNo || "");"""

replacement_load = target_load + """
    setTypeDesign(report.typeDesign || "");
    setDesignSource(report.designSource || "");"""

content = content.replace(target_load, replacement_load)

# 3. handleSave
target_save = """        darNo, customer, entryDate, designer, technician, purpose, designNo, items,"""
replacement_save = target_save.replace("designNo, items,", "designNo, typeDesign, designSource, items,")

content = content.replace(target_save, replacement_save)

# 4. Clear form
target_clear = """    setPurpose([]);
    setDesignNo("");"""

replacement_clear = target_clear + """
    setTypeDesign("");
    setDesignSource("");"""

content = content.replace(target_clear, replacement_clear)

# 5. JSX
target_jsx = """              <div><Label className="text-xs font-bold">Design / Item Number</Label><Input value={designNo} onChange={e => setDesignNo(e.target.value)} /></div>
            </CardContent>
          </Card>"""

replacement_jsx = """              <div><Label className="text-xs font-bold">Design / Item Number</Label><Input value={designNo} onChange={e => setDesignNo(e.target.value)} /></div>
              
              <div className="grid grid-cols-2 gap-2 mt-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal Riwayat)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Sumber Desain <span className="font-normal">(Internal Riwayat)</span></Label>
                  <input list="sumberDesainOptions" value={designSource} onChange={e => setDesignSource(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
              </div>

            </CardContent>
          </Card>"""

content = content.replace(target_jsx, replacement_jsx)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
