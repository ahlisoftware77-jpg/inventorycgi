import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Make sure X is imported
    if ' X,' not in content and ' X }' not in content:
        content = content.replace("Lock, Unlock } from 'lucide-react'", "Lock, Unlock, X } from 'lucide-react'")

    # Update CellInput and CellSelect
    cell_input_old = """    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }"""

    cell_input_new = """    if (!isEditing) {
      return (
        <div className={`group/cell relative w-full ${width}`}>
          <div onDoubleClick={() => setIsEditing(true)} className={`w-full h-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''}`} title={val}>{val || "-"}</div>
          {val && (
            <button onClick={(e) => { e.stopPropagation(); handleUpdateCell(row.id, field, ""); }} className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 p-0.5 hover:bg-slate-200 rounded text-slate-400 hover:text-red-500 transition-opacity z-10" title="Hapus">
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      );
    }"""
    
    content = content.replace(cell_input_old, cell_input_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done adding clear button.")

if __name__ == "__main__":
    main()
