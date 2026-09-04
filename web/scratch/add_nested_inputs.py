import os
import re

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update interface
interface_old = "  guPtv: string;"
interface_new = """  guPtv: string;
  guPtv2?: string;
  guPtv3?: string;
  guPtv4?: string;
  guPtv5?: string;
  guPtv6?: string;"""
content = content.replace(interface_old, interface_new)

# 2. Add customOptions declarations right after the base options
options_old = """  const baseTujuanOptions = ["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"];"""
options_new = """  const baseTujuanOptions = ["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"];
  
  // Custom options with inline inputs
  const sizeCustomOptions = [
    { label: "Faces", fields: [{ key: "sizeFaces" as const, placeholder: "val", width: "w-12" }] },
    { label: "Custom cm", fields: [{ key: "sizeCm1" as const, placeholder: "cm", width: "w-10" }, { key: "sizeCm2" as const, placeholder: "cm", width: "w-10" }], separator: "x" }
  ];
  const glazeCustomOptions = [
    { label: "Residue (Input)", fields: [{ key: "glazeResidue" as const, placeholder: "val" }] }
  ];
  const surfaceCustomOptions = [
    { label: "Temp (Input)", fields: [{ key: "surfaceTemp" as const, placeholder: "val" }] }
  ];
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
  const inkCustomOptions = [
    { label: "Checkbox (Input)", fields: [{ key: "inkOther" as const, placeholder: "val" }] }
  ];"""
content = content.replace(options_old, options_new)

# 3. Replace CellMultiSelect logic
multi_old = """  // MultiSelect Helper (Popover Portal for z-index & overflow)
  const CellMultiSelect = ({ row, field, options, width = "w-32" }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string }) => {
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

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`}
            title={val}
          >
            <span className="truncate">{val || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-2 z-[9999]" align="start">
          <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="w-3 h-3 cursor-pointer"
                />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}
          </div>
          <div className="border-t mt-1 pt-1 flex justify-end">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setIsOpen(false)}>Tutup</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };"""

multi_new = """  // Advanced Spec Dropdown with inline inputs
  const CellMultiSelect = ({ 
    row, field, options, customOptions = [], width = "w-32" 
  }: { 
    row: RegisterDesignItem, 
    field: keyof RegisterDesignItem, 
    options: string[], 
    customOptions?: { label: string, fields: { key: keyof RegisterDesignItem, placeholder: string, width?: string }[], separator?: string }[],
    width?: string 
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
          <div 
            className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`}
            title={displayVal}
          >
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="w-3 h-3 cursor-pointer"
                />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}

            {customOptions.map(co => {
              const isChecked = selected.includes(co.label);
              return (
                <div key={co.label} className="flex flex-col gap-1 p-1 hover:bg-slate-50 rounded">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleOption(co.label)}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className="text-slate-700">{co.label}</span>
                  </label>
                  
                  {isChecked && (
                    <div className="flex items-center gap-1 pl-5 mt-1 flex-wrap">
                      {co.fields.map((f, i) => (
                        <React.Fragment key={f.key}>
                          {i > 0 && co.separator && <span className="text-xs text-slate-400">{co.separator}</span>}
                          <input
                            type="text"
                            placeholder={f.placeholder}
                            value={(row[f.key] as string) || ""}
                            onChange={(e) => handleUpdateCell(row.id, f.key, e.target.value)}
                            className={`border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500 ${f.width || "w-16"}`}
                          />
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
  };"""

content = content.replace(multi_old, multi_new)

# 4. Clean up headers
headers_old = """                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Faces</th>
                <th className="p-2 border-r bg-slate-50">Cm 1</th>
                <th className="p-2 border-r bg-slate-50">Cm 2</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Residue (Input)</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">Temp (Input)</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>
                <th className="p-2 border-r bg-slate-50">Ink (Input)</th>"""

headers_new = """                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>"""
content = content.replace(headers_old, headers_new)

content = content.replace('colSpan={29}', 'colSpan={23}')

# 5. Clean up body rows and apply customOptions
row_old = """                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sizeChecks" options={baseSizeOptions} width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeFaces" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeCm1" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeCm2" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="glazeChecks" options={baseGlazeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="glazeResidue" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="surfaceChecks" options={baseSurfaceOptions} width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="surfaceTemp" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="guPtv" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="inkChecks" options={baseInkOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="inkOther" width="w-16" /></td>"""

row_new = """                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sizeChecks" options={baseSizeOptions} customOptions={sizeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="glazeChecks" options={baseGlazeOptions} customOptions={glazeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="surfaceChecks" options={baseSurfaceOptions} customOptions={surfaceCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50">
                       {/* For GU/PTV, there are no 'base' options, only the custom one with 6 inputs */}
                       <CellMultiSelect row={row} field="guPtvChecks" options={baseGuPtvOptions} customOptions={guPtvCustomOptions} width="w-32" />
                    </td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="inkChecks" options={baseInkOptions} customOptions={inkCustomOptions} width="w-32" /></td>"""
content = content.replace(row_old, row_new)

# Oh wait, `guPtvChecks` wasn't in RegisterDesignItem. Let's make sure it's in the interface.
if "guPtvChecks: string;" not in content:
    content = content.replace("  guPtv: string;", "  guPtvChecks: string;\n  guPtv: string;")

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
