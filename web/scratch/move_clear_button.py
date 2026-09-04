import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Revert !isEditing
    old_not_editing = """    if (!isEditing) {
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
    
    new_not_editing = """    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || "-"}</div>;
    }"""
    content = content.replace(old_not_editing, new_not_editing)

    # Update CellInput editing mode
    input_editing_old = """    return (
      <input autoFocus onBlur={() => setIsEditing(false)} type={type} list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none bg-white ${width} ${type === 'date' ? 'uppercase' : ''}`} placeholder="-" />
    );"""
    
    input_editing_new = """    return (
      <div className={`relative w-full ${width}`}>
        <input autoFocus onBlur={() => setIsEditing(false)} type={type} list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none bg-white pr-6 ${type === 'date' ? 'uppercase' : ''}`} placeholder="-" />
        {val && (
          <button onMouseDown={(e) => { e.preventDefault(); handleUpdateCell(row.id, field, ""); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors z-10" title="Hapus">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );"""
    content = content.replace(input_editing_old, input_editing_new)

    # Update CellSelect editing mode
    select_editing_old = """    return (
      <select autoFocus onBlur={() => setIsEditing(false)} value={val} onChange={(e) => { handleUpdateCell(row.id, field, e.target.value); setIsEditing(false); }} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer bg-white ${width}`}>
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );"""
    
    select_editing_new = """    return (
      <div className={`relative w-full ${width}`}>
        <select autoFocus onBlur={() => setIsEditing(false)} value={val} onChange={(e) => { handleUpdateCell(row.id, field, e.target.value); setIsEditing(false); }} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer bg-white pr-6`}>
          <option value="">-</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {val && (
          <button onMouseDown={(e) => { e.preventDefault(); handleUpdateCell(row.id, field, ""); }} className="absolute right-5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors z-10" title="Hapus">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );"""
    # Note: right-5 for select so it doesn't overlap the chevron icon of the native select.
    content = content.replace(select_editing_old, select_editing_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done moving clear button to edit mode.")

if __name__ == "__main__":
    main()
