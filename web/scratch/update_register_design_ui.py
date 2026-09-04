import os
import re

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add lucide-react icons for MultiSelect (ChevronDown)
content = content.replace("Search } from 'lucide-react';", "Search, ChevronDown, Check } from 'lucide-react';")

# 2. Add MultiSelect Component
multi_select_component = """
  // MultiSelect Helper
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
      <div className={`relative ${width}`}>
        <div 
          onClick={() => setIsOpen(!isOpen)}
          className="border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate"
          title={val}
        >
          <span className="truncate">{val || "--"}</span>
          <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
        </div>
        
        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-48 bg-white border border-slate-200 shadow-xl rounded-md z-50 p-2 flex flex-col gap-1 max-h-48 overflow-y-auto">
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
            <div className="border-t mt-1 pt-1 flex justify-end">
              <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setIsOpen(false)}>Tutup</Button>
            </div>
          </div>
        )}
      </div>
    );
  };
"""
# Insert before CellInput
content = content.replace("  // Helper for input\n  const CellInput", multi_select_component + "\n  // Helper for input\n  const CellInput")

# 3. Add dynamic state for Customer options and preset specs
state_declarations = """  const [typeDesignOptions, setTypeDesignOptions] = useState<string[]>(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
  const [designSourceOptions, setDesignSourceOptions] = useState<string[]>(["MidJourney", "Shutterstock", "Create"]);
  const [designerOptions, setDesignerOptions] = useState<string[]>(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
  const [technicianOptions, setTechnicianOptions] = useState<string[]>(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  
  // Base spec options
  const baseSizeOptions = ["25x25", "25x40", "25x50", "30x30", "40x40", "50x50", "30x60", "60x60"];
  const baseGlazeOptions = ["Glossy", "Matte", "Rustic", "Lappato", "Satin"];
  const baseSurfaceOptions = ["Flat", "Emboss", "Structure", "Reactive", "Carving"];
  const baseInkOptions = ["Matt", "Glossy", "White", "Reactive", "Glue"];"""

content = re.sub(r"  const \[typeDesignOptions.*setTechnicianOptions.*\]\);\n", state_declarations + "\n", content, flags=re.DOTALL)

# 4. Extract unique customer values in fetchData
fetch_logic = """      const desSet = new Set(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
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
content = re.sub(r"      const desSet = new Set\(\[\"D1 Riki\".*setTechnicianOptions\(Array\.from\(techSet\)\.sort\(\)\);", fetch_logic, content, flags=re.DOTALL)

# 5. Add datalist for customer at the bottom
datalists = """      <datalist id="desOptions">{designerOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="techOptions">{technicianOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="typeOptions">{typeDesignOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="srcOptions">{designSourceOptions.map(o => <option key={o} value={o} />)}</datalist>
      <datalist id="custOptions">{customerOptions.map(o => <option key={o} value={o} />)}</datalist>"""
content = re.sub(r"      <datalist id=\"desOptions\">.*<datalist id=\"srcOptions\">[^<]*</datalist>", datalists, content, flags=re.DOTALL)

# 6. Apply datalist to Customer in table
content = content.replace("""<td className="p-1 border-r"><CellInput row={row} field="customer" width="w-32" /></td>""", """<td className="p-1 border-r"><CellInput row={row} field="customer" list="custOptions" width="w-32" /></td>""")

# 7. Apply CellMultiSelect to specs
spec_replaces = [
    ('<td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeChecks" width="w-24" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sizeChecks" options={baseSizeOptions} width="w-24" /></td>'),
    ('<td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="glazeChecks" width="w-24" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="glazeChecks" options={baseGlazeOptions} width="w-24" /></td>'),
    ('<td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="surfaceChecks" width="w-32" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="surfaceChecks" options={baseSurfaceOptions} width="w-32" /></td>'),
    ('<td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="inkChecks" width="w-24" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="inkChecks" options={baseInkOptions} width="w-24" /></td>')
]

for old, new in spec_replaces:
    content = content.replace(old, new)


with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
