import os
import re

with open(r"e:\yadiapp-project\inventory - Copy\web\scratch\restored_page.txt", "r", encoding="utf-8") as f:
    content = f.read()

# Verify the file is read correctly
start_marker = 'content = """\'use client\';\n'
end_marker = '"""\n\nos.makedirs'
start_idx = content.find(start_marker)
end_idx = content.find(end_marker)
if start_idx != -1 and end_idx != -1:
    content = "'use client';\n" + content[start_idx + len(start_marker):end_idx]

# 1. Imports
content = content.replace("import { useAuthState } from 'react-firebase-hooks/auth';\nimport { auth, db } from '@/lib/firebase';", "import { useAuth } from '@/hooks/use-auth';\nimport { db } from '@/lib/firebase/config';")
content = content.replace("import { useState, useEffect, useCallback } from 'react';", "import React, { useState, useEffect, useCallback } from 'react';\nimport { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';")
content = content.replace("Search } from 'lucide-react';", "Search, ChevronDown, Check } from 'lucide-react';")

# 2. Interface
old_interface = "  guPtv: string;"
new_interface = """  guPtv: string;
  guPtv2?: string;
  guPtv3?: string;
  guPtv4?: string;
  guPtv5?: string;
  guPtv6?: string;
  guPtvChecks?: string;"""
content = content.replace(old_interface, new_interface)

# 3. Helpers injection
helpers = """
  // Advanced Spec Dropdown with inline inputs
  const CellMultiSelect = ({ 
    row, field, options, customOptions = [], width = "w-32", handleUpdateCell 
  }: { 
    row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], 
    customOptions?: { label: string, fields: { key: keyof RegisterDesignItem, placeholder: string, width?: string }[], separator?: string }[],
    width?: string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const val = row[field] as string || "";
    const selected = val.split(',').map(s => s.trim()).filter(Boolean);

    const toggleOption = (opt: string) => {
      let newSelected;
      if (selected.includes(opt)) {
        newSelected = selected.filter(s => s !== opt);
      } else {
        newSelected = [...selected, opt];
      }
      handleUpdateCell(row.id, field, newSelected.join(', '));
    };

    const getSummary = () => {
       let parts = [...selected];
       customOptions.forEach(co => {
          if (selected.includes(co.label)) {
             const vals = co.fields.map(f => row[f.key] as string || "?");
             const idx = parts.indexOf(co.label);
             if (idx !== -1) {
                if (co.separator) {
                   parts[idx] = `${co.label}(${vals.join(co.separator)})`;
                } else {
                   parts[idx] = `${co.label}(${vals.join(', ')})`;
                }
             }
          }
       });
       return parts.join(', ');
    };

    const displayVal = getSummary();

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} className="w-3 h-3 cursor-pointer" />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}
            {customOptions.map(co => {
              const isChecked = selected.includes(co.label);
              return (
                <div key={co.label} className="flex flex-col gap-1 p-1 hover:bg-slate-50 rounded">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleOption(co.label)} className="w-3 h-3 cursor-pointer" />
                    <span className="text-slate-700">{co.label}</span>
                  </label>
                  {isChecked && (
                    <div className="flex items-center gap-1 pl-5 mt-1 flex-wrap">
                      {co.fields.map((f, i) => (
                        <React.Fragment key={f.key}>
                          {i > 0 && co.separator && <span className="text-xs text-slate-400">{co.separator}</span>}
                          <input type="text" placeholder={f.placeholder} value={(row[f.key] as string) || ""} onChange={(e) => handleUpdateCell(row.id, f.key, e.target.value)} className={`border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500 ${f.width || "w-16"}`} />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="border-t mt-2 pt-2 flex justify-end">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setIsOpen(false)}>Tutup</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  const CellInput = ({ row, field, list, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <input type="text" list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`} placeholder="-" />
    );
  };

  const CellSelect = ({ row, field, options, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <select value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`}>
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  };

export default function RegisterDesignPage() {
"""
content = content.replace("export default function RegisterDesignPage() {", helpers)

# 4. Remove inner CellInput and CellSelect cleanly using regex
# Matches from '  // Helper for input' up to (but not including) '  const filteredData = data.filter('
pattern = re.compile(r"\s*// Helper for input\s+const CellInput =.*?const CellSelect =.*?(?=\s*const filteredData = data.filter)", re.DOTALL)
if pattern.search(content):
    content = pattern.sub("", content)
else:
    print("Warning: inner CellInput not found with regex")

# 5. Fix Auth usage
content = content.replace("const [user, loadingUser] = useAuthState(auth);", "const { user, loading: loadingUser } = useAuth();")

# 6. Inject updated states
state_decl = """  const [typeDesignOptions, setTypeDesignOptions] = useState<string[]>(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
  const [designSourceOptions, setDesignSourceOptions] = useState<string[]>(["MidJourney", "Shutterstock", "Create"]);
  const [designerOptions, setDesignerOptions] = useState<string[]>(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
  const [technicianOptions, setTechnicianOptions] = useState<string[]>(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  
  const baseTypeOptions = ["Picture", "Emboss", "Rubber", "File Image Digital", "Finish tile"];
  const baseSizeOptions = ["Large size", "Cut 1:1", "jpg file"];
  const sizeCustomOptions = [
    { label: "Faces", fields: [{ key: "sizeFaces" as const, placeholder: "val", width: "w-12" }] },
    { label: "Custom cm", fields: [{ key: "sizeCm1" as const, placeholder: "cm", width: "w-10" }, { key: "sizeCm2" as const, placeholder: "cm", width: "w-10" }], separator: "x" }
  ];
  const baseGlazeOptions = ["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"];
  const glazeCustomOptions = [
    { label: "Residue (Input)", fields: [{ key: "glazeResidue" as const, placeholder: "val" }] }
  ];
  const baseSurfaceOptions = ["Matt", "Glossy", "Satin", "Polished", "Anti Slip"];
  const surfaceCustomOptions = [
    { label: "Temp (Input)", fields: [{ key: "surfaceTemp" as const, placeholder: "val" }] }
  ];
  const baseGuPtvOptions: string[] = [];
  const guPtvCustomOptions = [
    { label: "Checkbox", fields: [
        { key: "guPtv" as const, placeholder: "c1", width: "w-10" },
        { key: "guPtv2" as const, placeholder: "c2", width: "w-10" },
        { key: "guPtv3" as const, placeholder: "c3", width: "w-10" },
        { key: "guPtv4" as const, placeholder: "c4", width: "w-10" },
        { key: "guPtv5" as const, placeholder: "c5", width: "w-10" },
        { key: "guPtv6" as const, placeholder: "c6", width: "w-10" }
    ]}
  ];
  const baseInkOptions = ["Impression", "Transparent", "SIngking", "Antislip", "Glue"];
  const inkCustomOptions = [
    { label: "Checkbox (Input)", fields: [{ key: "inkOther" as const, placeholder: "val" }] }
  ];
  const baseSendByOptions = ["USB", "Wetransfer", "CD", "On Glazing Line"];
  const baseTujuanOptions = ["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"];
"""
# Use re to replace the old state exactly
old_state_pattern = re.compile(r"  const \[typeDesignOptions.*?setTechnicianOptions\(.*?\]\);", re.DOTALL)
if old_state_pattern.search(content):
    content = old_state_pattern.sub(state_decl, content)
else:
    print("Warning: old state not found")

# 7. Update fetchData
fetch_old = """      const desSet = new Set(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
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
      setTechnicianOptions(Array.from(techSet).sort());"""
fetch_new = """      const desSet = new Set(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
      const techSet = new Set(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
      const custSet = new Set<string>();
      
      items.forEach(i => {
        if (i.typeDesign) typeSet.add(i.typeDesign);
        if (i.designSource) srcSet.add(i.designSource);
        if (i.designer) desSet.add(i.designer);
        if (i.technician) techSet.add(i.technician);
        if (i.customer) custSet.add(i.customer);
      });
      
      setTypeDesignOptions(Array.from(typeSet).sort());
      setDesignSourceOptions(Array.from(srcSet).sort());
      setDesignerOptions(Array.from(desSet).sort());
      setTechnicianOptions(Array.from(techSet).sort());
      setCustomerOptions(Array.from(custSet).sort());"""
content = content.replace(fetch_old, fetch_new)

# 8. Update Headers
headers_old_pattern = re.compile(r"<th.*?Customer.*?Req Date</th>", re.DOTALL)
headers_new = """<th className="p-2 border-r">Customer</th>
                <th className="p-2 border-r">Designer</th>
                <th className="p-2 border-r">Technician</th>
                <th className="p-2 border-r bg-slate-50">Tujuan</th>
                <th className="p-2 border-r">Status</th>
                <th className="p-2 border-r">Tipe Desain</th>
                <th className="p-2 border-r">Sumber Desain</th>
                <th className="p-2 border-r">Design No</th>
                <th className="p-2 border-r bg-slate-50">Type (W/F/D)</th>
                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>
                <th className="p-2 border-r bg-slate-50">Send By</th>
                <th className="p-2 border-r">Req Date</th>"""
if headers_old_pattern.search(content):
    content = headers_old_pattern.sub(headers_new, content)
else:
    print("Warning: headers not found")

# 9. Update Rows
rows_old_pattern = re.compile(r'<td className="p-1 border-r"><CellInput row=\{row\} field="customer".*?field="requiredDate" width="w-24" /></td>', re.DOTALL)
row_new = """<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="customer" list="custOptions" width="w-32" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designer" list="desOptions" width="w-28" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="technician" list="techOptions" width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="benefit" options={baseTujuanOptions} width="w-32" /></td>
                    <td className="p-1 border-r">
                      <CellSelect handleUpdateCell={handleUpdateCell} row={row} field="status" options={["IN LOCK", "IN USE", "FREE", "ARCHIVE"]} colorFn={getStatusColor} width="w-24" />
                    </td>
                    <td className="p-1 border-r">
                      <CellInput handleUpdateCell={handleUpdateCell} row={row} field="typeDesign" list="typeOptions" colorFn={getTypeDesignColor} width="w-20" />
                    </td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designSource" list="srcOptions" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designNo" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="type" options={baseTypeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="sizeChecks" options={baseSizeOptions} customOptions={sizeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="glazeChecks" options={baseGlazeOptions} customOptions={glazeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="surfaceChecks" options={baseSurfaceOptions} customOptions={surfaceCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50">
                       <CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="guPtvChecks" options={baseGuPtvOptions} customOptions={guPtvCustomOptions} width="w-32" />
                    </td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="inkChecks" options={baseInkOptions} customOptions={inkCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="sendBy" options={baseSendByOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-24" /></td>"""
if rows_old_pattern.search(content):
    content = rows_old_pattern.sub(row_new, content)
else:
    print("Warning: rows not found")

# Replace remaining un-handled CellInputs correctly
content = content.replace('colSpan={22}', 'colSpan={23}')
content = content.replace('colSpan={23}', 'colSpan={23}')
content = content.replace('<CellInput row={row}', '<CellInput handleUpdateCell={handleUpdateCell} row={row}')

# Datalists
datalists_old_pattern = re.compile(r"<datalist id=\"desOptions\">.*?</datalist>\s*<Dialog open=\{isGroupDialogOpen\}", re.DOTALL)
datalists_new = """<datalist id="desOptions">{designerOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="techOptions">{technicianOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="typeOptions">{typeDesignOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="srcOptions">{designSourceOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="custOptions">{customerOptions.map(o => <option key={o} value={o} />)}</datalist>

      <Dialog open={isGroupDialogOpen}"""
if datalists_old_pattern.search(content):
    content = datalists_old_pattern.sub(datalists_new, content)
else:
    print("Warning: datalists not found")

with open(r"e:\yadiapp-project\inventory - Copy\web\src\app\register-design\page.tsx", "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
