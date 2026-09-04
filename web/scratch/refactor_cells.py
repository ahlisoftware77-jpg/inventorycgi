import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update RegisterDesignItem interface
    if 'isLocked?: boolean;' not in content:
        content = content.replace('createdBy?: string;\n}', 'createdBy?: string;\n  isLocked?: boolean;\n}')

    # 2. Update handleAddRow to set isLocked: false
    if 'isLocked: false' not in content:
        content = content.replace("createdBy: user?.name || user?.email || 'System'", "createdBy: user?.name || user?.email || 'System',\n      isLocked: false")

    # 3. Update CellInput
    cell_input_old = """  const CellInput = ({ row, field, list, width = "w-32", type = "text", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, type?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <input type={type} list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={handleCellKeyDown} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none ${colorFn ? colorFn(val) : 'bg-transparent'} ${width} ${type === 'date' ? 'uppercase' : ''}`} placeholder="-" />
    );
  };"""

    cell_input_new = """  const CellInput = ({ row, field, list, width = "w-32", type = "text", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, type?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const val = row[field] as string || "";

    if (row.isLocked) {
      return <div className={`w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }

    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }

    return (
      <input autoFocus onBlur={() => setIsEditing(false)} type={type} list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none bg-white ${width} ${type === 'date' ? 'uppercase' : ''}`} placeholder="-" />
    );
  };"""
    content = content.replace(cell_input_old, cell_input_new)

    # 4. Update CellSelect
    cell_select_old = """  const CellSelect = ({ row, field, options, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <select value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={handleCellKeyDown} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`}>
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  };"""

    cell_select_new = """  const CellSelect = ({ row, field, options, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const val = row[field] as string || "";

    if (row.isLocked) {
      return <div className={`w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }

    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }

    return (
      <select autoFocus onBlur={() => setIsEditing(false)} value={val} onChange={(e) => { handleUpdateCell(row.id, field, e.target.value); setIsEditing(false); }} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer bg-white ${width}`}>
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  };"""
    content = content.replace(cell_select_old, cell_select_new)

    # 5. Update CellMultiSelect
    # We replace PopoverTrigger asChild with manual condition
    cell_multi_old = """    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div tabIndex={0} onKeyDown={handleCellKeyDown} className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">"""

    cell_multi_new = """    if (row.isLocked) {
      return <div className={`w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={displayVal}>{displayVal || "-"}</div>;
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} tabIndex={0} onKeyDown={handleCellKeyDown} className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">"""
    content = content.replace(cell_multi_old, cell_multi_new)

    # 6. Update CellGridInput
    cell_grid_old = """  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="sm" className="w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">
           {title} <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50">"""

    cell_grid_new = """  const [isOpen, setIsOpen] = useState(false);

  if (row.isLocked) {
    return <div className="w-24 px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50">{title}</div>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} variant="ghost" size="sm" className="w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">
           {title} <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50">"""
    content = content.replace(cell_grid_old, cell_grid_new)

    # 7. Add Lock button to Aksi column
    aksi_old = """                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.id, row.designImage)} className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50">
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>"""
    
    # We need Lucide 'Lock' and 'Unlock' - let's make sure they are imported. Wait, Lock is probably imported, Unlock might not be. We can use Check and X or just Lock.
    # Actually, let's just use text or Lock/Unlock icons if available. 
    # The file has: import { Trash2, Plus, Save, Layers, CheckSquare, Search, ChevronDown, Check, Eye, X, Pencil, Share2, ChevronUp, BarChart2, Download, Upload, FileSpreadsheet }
    # So Lock/Unlock is NOT imported. I'll just add them to the import.
    content = content.replace('FileSpreadsheet } from \'lucide-react\'', 'FileSpreadsheet, Lock, Unlock } from \'lucide-react\'')

    aksi_new = """                      <Button variant="ghost" size="icon" onClick={() => handleUpdateCell(row.id, 'isLocked', !row.isLocked)} className={`h-6 w-6 ${row.isLocked ? 'text-amber-500 hover:bg-amber-50' : 'text-slate-400 hover:bg-slate-100'}`} title={row.isLocked ? "Buka Kunci" : "Kunci Baris"}>
                        {row.isLocked ? <Lock className="h-3 w-3" /> : <Unlock className="h-3 w-3" />}
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.id, row.designImage)} className="h-6 w-6 text-red-500 hover:text-red-700 hover:bg-red-50" disabled={row.isLocked}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>"""
    content = content.replace(aksi_old, aksi_new)

    # Also style the row if locked
    row_tr_old = """                  <tr key={row.id} className="border-b hover:bg-slate-50 transition-colors group">
                    <td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50/50 z-10">"""
    
    row_tr_new = """                  <tr key={row.id} className={`border-b hover:bg-slate-50 transition-colors group ${row.isLocked ? 'bg-slate-50 opacity-90' : ''}`}>
                    <td className={`p-1 border-r text-center sticky left-0 z-10 ${row.isLocked ? 'bg-slate-50' : 'bg-white group-hover:bg-blue-50/50'}`}>"""
    content = content.replace(row_tr_old, row_tr_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done refactoring cells for double click and lock.")

if __name__ == "__main__":
    main()
