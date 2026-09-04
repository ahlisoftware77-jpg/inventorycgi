import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

# 1. Add handleCellKeyDown
key_down_logic = '''
const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {
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
};
'''
# Insert before CellMultiSelect (if not already there)
if 'const handleCellKeyDown = (e: React.KeyboardEvent<HTMLElement>) => {' not in f:
    f = f.replace('const CellMultiSelect = ({', key_down_logic + '\nconst CellMultiSelect = ({')

# 2. Add to CellInput
cell_input_search = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className='''
cell_input_replace = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={handleCellKeyDown} className='''
if 'onKeyDown={handleCellKeyDown}' not in cell_input_search:
    f = f.replace(cell_input_search, cell_input_replace)

# 3. Add to CellSelect
cell_select_search = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className={`w-full border border-transparent'''
cell_select_replace = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={handleCellKeyDown} className={`w-full border border-transparent'''
f = f.replace(cell_select_search, cell_select_replace)

# 4. Add to CellMultiSelect
popover_div_search_1 = '''<div className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>'''
popover_div_replace_1 = '''<div tabIndex={0} onKeyDown={handleCellKeyDown} className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>'''
f = f.replace(popover_div_search_1, popover_div_replace_1)

# 5. Add to CellGridInput
popover_div_search_2 = '''<div className="border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer text-slate-500 flex justify-between items-center bg-transparent truncate w-full" title="Klik untuk edit catatan">'''
popover_div_replace_2 = '''<div tabIndex={0} onKeyDown={handleCellKeyDown} className="border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer text-slate-500 flex justify-between items-center bg-transparent truncate w-full" title="Klik untuk edit catatan">'''
f = f.replace(popover_div_search_2, popover_div_replace_2)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
