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
          const focusable = targetTd.querySelector('input:not([type="hidden"]), select, textarea, button') as HTMLElement;
          if (focusable) {
            focusable.focus();
          }
        }
      }
    }
  }
};
'''
# Insert before CellMultiSelect
f = f.replace('const CellMultiSelect = ({', key_down_logic + '\nconst CellMultiSelect = ({')

# 2. Add to CellInput
cell_input_search = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className='''
cell_input_replace = '''onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} onKeyDown={handleCellKeyDown} className='''
f = f.replace(cell_input_search, cell_input_replace)

# 3. Add to CellSelect
f = f.replace(cell_input_search, cell_input_replace) # It uses the exact same string! Wait, let's verify.
# To be safe, I'll just use regex or replace it multiple times (which the above does if it's the exact string).
# Let's write the file.
with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
