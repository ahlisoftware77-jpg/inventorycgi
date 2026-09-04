import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Update CellInput signature and implementation
    # Find CellInput
    cell_input_start = content.find("const CellInput = ({ row, field, list,")
    # CellSelect is the next component
    cell_select_start = content.find("const CellSelect = ({ row, field, options,")
    
    if cell_input_start != -1 and cell_select_start != -1:
        old_cell_input = content[cell_input_start:cell_select_start]
        
        new_cell_input = """const CellInput = ({ row, field, list, options, width = "w-32", type = "text", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, options?: string[], width?: string, type?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const val = row[field] as string || "";

    if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }

    if (!isEditing) {
      return <div tabIndex={0} onDoubleClick={() => setIsEditing(true)} onKeyDown={(e) => handleCellNavigation(e, () => setIsEditing(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || "-"}</div>;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (options && options.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleUpdateCell(row.id, field, options[highlightedIndex]);
          }
          setIsEditing(false);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditing(false);
          return;
        }
      }
      
      if (e.key === 'Enter') {
        setIsEditing(false);
      }
      handleCellKeyDown(e);
    };

    return (
      <div className={`relative w-full ${width}`}>
        <input 
          autoFocus 
          onBlur={() => setTimeout(() => setIsEditing(false), 200)} 
          type={type} 
          list={list} 
          value={val} 
          onChange={(e) => {
            handleUpdateCell(row.id, field, e.target.value);
            setHighlightedIndex(-1);
          }} 
          onKeyDown={handleKeyDown} 
          className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none bg-white pr-6 ${type === 'date' ? 'uppercase' : ''}`} 
          placeholder="-" 
        />
        {val && (
          <button onMouseDown={(e) => { e.preventDefault(); handleUpdateCell(row.id, field, ""); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors z-10" title="Hapus">
            <X className="w-3 h-3" />
          </button>
        )}
        
        {options && options.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-max min-w-[120px] max-w-[200px] max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-[9999] py-1">
            {options.map((opt, idx) => (
              <div 
                key={opt}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  handleUpdateCell(row.id, field, opt); 
                  setIsEditing(false); 
                }}
                className={`px-3 py-1.5 text-[11px] cursor-pointer truncate transition-colors ${idx === highlightedIndex ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-blue-50'}`}
                title={opt}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  """
        content = content.replace(old_cell_input, new_cell_input)

    # 2. Update table rendering to use options instead of list for specific columns
    content = content.replace(
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="customer" list="custOptions" width="w-32" /></td>',
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="customer" options={customerOptions} width="w-32" /></td>'
    )
    content = content.replace(
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designer" list="desOptions" colorFn={getDesignerColor} width="w-28" /></td>',
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designer" options={designerOptions} colorFn={getDesignerColor} width="w-28" /></td>'
    )
    content = content.replace(
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="technician" list="techOptions" colorFn={getTechnicianColor} width="w-28" /></td>',
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="technician" options={technicianOptions} colorFn={getTechnicianColor} width="w-28" /></td>'
    )
    content = content.replace(
        '<CellInput handleUpdateCell={handleUpdateCell} row={row} field="typeDesign" list="typeOptions" colorFn={getTypeDesignColor} width="w-20" />',
        '<CellInput handleUpdateCell={handleUpdateCell} row={row} field="typeDesign" options={typeDesignOptions} colorFn={getTypeDesignColor} width="w-20" />'
    )
    content = content.replace(
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designSource" list="srcOptions" width="w-24" /></td>',
        '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designSource" options={designSourceOptions} width="w-24" /></td>'
    )

    # 3. Remove old datalists
    # <datalist id="custOptions">{customerOptions.map(o => <option key={o} value={o} />)}</datalist>
    # <datalist id="desOptions">{designerOptions.map(o => <option key={o} value={o} />)}</datalist>
    # <datalist id="techOptions">{technicianOptions.map(o => <option key={o} value={o} />)}</datalist>
    # <datalist id="typeOptions">{typeDesignOptions.map(o => <option key={o} value={o} />)}</datalist>
    # <datalist id="srcOptions">{designSourceOptions.map(o => <option key={o} value={o} />)}</datalist>
    
    datalists = [
        '<datalist id="custOptions">{customerOptions.map(o => <option key={o} value={o} />)}</datalist>',
        '<datalist id="desOptions">{designerOptions.map(o => <option key={o} value={o} />)}</datalist>',
        '<datalist id="techOptions">{technicianOptions.map(o => <option key={o} value={o} />)}</datalist>',
        '<datalist id="typeOptions">{typeDesignOptions.map(o => <option key={o} value={o} />)}</datalist>',
        '<datalist id="srcOptions">{designSourceOptions.map(o => <option key={o} value={o} />)}</datalist>'
    ]
    for dl in datalists:
        content = content.replace(dl, '')

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done refactoring CellInput and options.")

if __name__ == "__main__":
    main()
