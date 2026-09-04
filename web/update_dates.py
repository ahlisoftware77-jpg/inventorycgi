import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

# 1. Update CellInput definition
cell_input_old = '''  const CellInput = ({ row, field, list, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <input type="text" list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`} placeholder="-" />
    );
  };'''

cell_input_new = '''  const CellInput = ({ row, field, list, width = "w-32", type = "text", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, type?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <input type={type} list={list} value={val} onChange={(e) => handleUpdateCell(row.id, field, e.target.value)} className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none ${colorFn ? colorFn(val) : 'bg-transparent'} ${width} ${type === 'date' ? 'uppercase' : ''}`} placeholder="-" />
    );
  };'''

f = f.replace(cell_input_old, cell_input_new)

# 2. Update entryDate
f = f.replace('<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="entryDate" width="w-24" /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="entryDate" width="w-28" type="date" /></td>')

# 3. Update requiredDate
f = f.replace('<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-24" /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-28" type="date" /></td>')

# 4. Update closingDate
f = f.replace('<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="closingDate" width="w-24" /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="closingDate" width="w-28" type="date" /></td>')

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
