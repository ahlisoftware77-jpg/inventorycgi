import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Replace handleCellKeyDown with handleCellNavigation
    # The old handleCellKeyDown:
    old_handle_key_down = """const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const target = e.target as HTMLElement;
    const currentTd = target.closest('td');
    const currentTr = target.closest('tr');
    
    if (currentTd && currentTr) {
      const tdIndex = Array.from(currentTr.children).indexOf(currentTd);
      const targetTr = e.shiftKey ? currentTr.previousElementSibling : currentTr.nextElementSibling;
      
      if (targetTr) {
        const targetTd = targetTr.children[tdIndex];
        if (targetTd) {
          const focusable = targetTd.querySelector('input:not([type="hidden"]), select, textarea, button, [tabindex="0"]') as HTMLElement;
          if (focusable) {
            focusable.focus();
          }
        }
      }
    }
  }
};"""

    new_handle_cell_navigation = """// Handle navigation between table cells using arrow keys
export const handleCellNavigation = (
  e: React.KeyboardEvent<HTMLElement>, 
  enterEditMode?: () => void, 
  clearText?: () => void
) => {
  const target = e.currentTarget as HTMLElement;
  const currentTd = target.closest('td');
  const currentTr = target.closest('tr');
  if (!currentTd || !currentTr) return;
  
  const tdIndex = Array.from(currentTr.children).indexOf(currentTd);

  // F2 or Enter to Edit
  if (e.key === 'F2' || e.key === 'Enter') {
    e.preventDefault();
    if (enterEditMode) enterEditMode();
    return;
  }
  
  // Delete or Backspace to Clear
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (clearText) clearText();
    return;
  }
  
  let focusTarget: HTMLElement | null = null;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevTr = currentTr.previousElementSibling;
    if (prevTr) {
      const targetTd = prevTr.children[tdIndex];
      focusTarget = targetTd?.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextTr = currentTr.nextElementSibling;
    if (nextTr) {
      const targetTd = nextTr.children[tdIndex];
      focusTarget = targetTd?.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    let prevTd = currentTd.previousElementSibling;
    while(prevTd && !prevTd.querySelector('[tabindex="0"]')) {
       prevTd = prevTd.previousElementSibling;
    }
    if (prevTd) {
      focusTarget = prevTd.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    let nextTd = currentTd.nextElementSibling;
    while(nextTd && !nextTd.querySelector('[tabindex="0"]')) {
       nextTd = nextTd.nextElementSibling;
    }
    if (nextTd) {
      focusTarget = nextTd.querySelector('[tabindex="0"]') as HTMLElement;
    }
  }

  if (focusTarget) {
    focusTarget.focus();
  }
};

const handleCellKeyDown = handleCellNavigation; // Keep old name for compatibility where used directly"""

    content = content.replace(old_handle_key_down, new_handle_cell_navigation)

    # 2. Update CellInput read-only mode
    cell_input_old = """    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || "-"}</div>;
    }"""
    
    cell_input_new = """    if (!isEditing) {
      return <div tabIndex={0} onDoubleClick={() => setIsEditing(true)} onKeyDown={(e) => handleCellNavigation(e, () => setIsEditing(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || "-"}</div>;
    }"""
    content = content.replace(cell_input_old, cell_input_new)

    # 3. Update CellSelect read-only mode
    cell_select_old = """    if (!isEditing) {
      return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }"""
    
    cell_select_new = """    if (!isEditing) {
      return <div tabIndex={0} onDoubleClick={() => setIsEditing(true)} onKeyDown={(e) => handleCellNavigation(e, () => setIsEditing(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }"""
    content = content.replace(cell_select_old, cell_select_new)

    # 4. Update CellMultiSelect read-only mode (the Trigger div)
    # The current one:
    # <div onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} tabIndex={0} onKeyDown={handleCellKeyDown} className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>
    cell_multi_old = """<div onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} tabIndex={0} onKeyDown={handleCellKeyDown} className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>"""
    
    cell_multi_new = """<div onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} tabIndex={0} onKeyDown={(e) => handleCellNavigation(e, () => setIsOpen(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30 border border-transparent hover:border-slate-300 rounded p-1 text-[11px] cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>"""
    content = content.replace(cell_multi_old, cell_multi_new)

    # 5. Update CellGridInput read-only mode (the Trigger Button)
    # The current one:
    # <Button onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} variant="ghost" size="sm" className="w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">
    cell_grid_old = """<Button onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} variant="ghost" size="sm" className="w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">"""
    
    cell_grid_new = """<Button tabIndex={0} onKeyDown={(e) => handleCellNavigation(e, () => setIsOpen(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} variant="ghost" size="sm" className="focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50/30 w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">"""
    content = content.replace(cell_grid_old, cell_grid_new)
    
    # 6. We also have isLocked divs for CellInput and CellSelect that shouldn't be focusable? Or should they be focusable to navigate OVER them, but they just don't have enterEditMode and clearText functions. 
    # Yes! We should make them focusable so Arrow keys don't get stuck!
    
    # CellInput Locked:
    cell_in_locked_old = """if (row.isLocked) {
      return <div className={`w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }"""
    cell_in_locked_new = """if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }"""
    # this will match BOTH CellInput and CellSelect because they are identical!
    content = content.replace(cell_in_locked_old, cell_in_locked_new)

    # CellMultiSelect Locked:
    cell_multi_locked_old = """    if (row.isLocked) {
      return <div className={`w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={displayVal}>{displayVal || "-"}</div>;
    }"""
    cell_multi_locked_new = """    if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={displayVal}>{displayVal || "-"}</div>;
    }"""
    content = content.replace(cell_multi_locked_old, cell_multi_locked_new)

    # CellGridInput Locked:
    cell_grid_locked_old = """  if (row.isLocked) {
    return <div className="w-24 px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50">{title}</div>;
  }"""
    cell_grid_locked_new = """  if (row.isLocked) {
    return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className="focus:outline-none focus:ring-1 focus:ring-inset focus:ring-blue-500 focus:bg-blue-50 w-24 px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50">{title}</div>;
  }"""
    content = content.replace(cell_grid_locked_old, cell_grid_locked_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done refactoring cell navigation.")

if __name__ == "__main__":
    main()
