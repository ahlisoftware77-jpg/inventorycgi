import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Add import Popover
import_line = "import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';"
if import_line not in content:
    content = content.replace("import { Dialog, DialogContent,", import_line + "\nimport { Dialog, DialogContent,")

# Replace CellMultiSelect
old_cell_multi = """  // MultiSelect Helper
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
  };"""

new_cell_multi = """  // MultiSelect Helper (Popover Portal for z-index & overflow)
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

if old_cell_multi in content:
    content = content.replace(old_cell_multi, new_cell_multi)
    with open(file_path, "w", encoding="utf-8") as f:
        f.write(content)
    print("Done")
else:
    print("Old CellMultiSelect not found!")
