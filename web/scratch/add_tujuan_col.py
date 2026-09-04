import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Add baseTujuanOptions
old_options = """  const baseSendByOptions = ["USB", "Wetransfer", "CD", "On Glazing Line"];"""
new_options = """  const baseSendByOptions = ["USB", "Wetransfer", "CD", "On Glazing Line"];
  const baseTujuanOptions = ["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"];"""
content = content.replace(old_options, new_options)

# 2. Add Tujuan header
old_headers = """                <th className="p-2 border-r bg-slate-50">Send By</th>
                <th className="p-2 border-r">Req Date</th>"""
new_headers = """                <th className="p-2 border-r bg-slate-50">Send By</th>
                <th className="p-2 border-r bg-slate-50">Tujuan</th>
                <th className="p-2 border-r">Req Date</th>"""
content = content.replace(old_headers, new_headers)

# 3. Increase colSpan
content = content.replace('colSpan={28}', 'colSpan={29}')

# 4. Add Tujuan cell
old_row = """                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sendBy" options={baseSendByOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="requiredDate" width="w-24" /></td>"""
new_row = """                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sendBy" options={baseSendByOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="benefit" options={baseTujuanOptions} width="w-32" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="requiredDate" width="w-24" /></td>"""
content = content.replace(old_row, new_row)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
