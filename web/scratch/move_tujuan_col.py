import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Move Header
content = content.replace('                <th className="p-2 border-r bg-slate-50">Tujuan</th>\n', '')
content = content.replace(
    '                <th className="p-2 border-r">Technician</th>',
    '                <th className="p-2 border-r">Technician</th>\n                <th className="p-2 border-r bg-slate-50">Tujuan</th>'
)

# 2. Move Cell
content = content.replace('                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="benefit" options={baseTujuanOptions} width="w-32" /></td>\n', '')
content = content.replace(
    '                    <td className="p-1 border-r"><CellInput row={row} field="technician" list="techOptions" width="w-28" /></td>',
    '                    <td className="p-1 border-r"><CellInput row={row} field="technician" list="techOptions" width="w-28" /></td>\n                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="benefit" options={baseTujuanOptions} width="w-32" /></td>'
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
