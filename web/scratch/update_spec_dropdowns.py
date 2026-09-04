import os
import re

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Update base spec options
old_options = """  // Base spec options
  const baseSizeOptions = ["25x25", "25x40", "25x50", "30x30", "40x40", "50x50", "30x60", "60x60"];
  const baseGlazeOptions = ["Glossy", "Matte", "Rustic", "Lappato", "Satin"];
  const baseSurfaceOptions = ["Flat", "Emboss", "Structure", "Reactive", "Carving"];
  const baseInkOptions = ["Matt", "Glossy", "White", "Reactive", "Glue"];"""

new_options = """  // Base spec options
  const baseTypeOptions = ["Picture", "Emboss", "Rubber", "File Image Digital", "Finish tile"];
  const baseSizeOptions = ["Large size", "Cut 1:1", "jpg file", "Faces"];
  const baseGlazeOptions = ["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"];
  const baseSurfaceOptions = ["Matt", "Glossy", "Satin", "Polished", "Anti Slip"];
  const baseInkOptions = ["Impression", "Transparent", "SIngking", "Antislip", "Glue"];
  const baseSendByOptions = ["USB", "Wetransfer", "CD", "On Glazing Line"];"""

content = content.replace(old_options, new_options)

# Update Headers
old_headers = """                <th className="p-2 border-r bg-slate-50">Type (W/F/D)</th>
                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Faces</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>
                <th className="p-2 border-r">Req Date</th>"""

new_headers = """                <th className="p-2 border-r bg-slate-50">Type (W/F/D)</th>
                <th className="p-2 border-r bg-slate-50">Size</th>
                <th className="p-2 border-r bg-slate-50">Faces</th>
                <th className="p-2 border-r bg-slate-50">Cm 1</th>
                <th className="p-2 border-r bg-slate-50">Cm 2</th>
                <th className="p-2 border-r bg-slate-50">Glaze</th>
                <th className="p-2 border-r bg-slate-50">Residue (Input)</th>
                <th className="p-2 border-r bg-slate-50">Surface</th>
                <th className="p-2 border-r bg-slate-50">Temp (Input)</th>
                <th className="p-2 border-r bg-slate-50">GU/PTV</th>
                <th className="p-2 border-r bg-slate-50">Ink</th>
                <th className="p-2 border-r bg-slate-50">Ink (Input)</th>
                <th className="p-2 border-r bg-slate-50">Send By</th>
                <th className="p-2 border-r">Req Date</th>"""

content = content.replace(old_headers, new_headers)
content = content.replace('colSpan={22}', 'colSpan={28}')

# Update Body Row
old_row = """                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="type" width="w-20" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sizeChecks" options={baseSizeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeFaces" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="glazeChecks" options={baseGlazeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="surfaceChecks" options={baseSurfaceOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="guPtv" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="inkChecks" options={baseInkOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="requiredDate" width="w-24" /></td>"""

new_row = """                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="type" options={baseTypeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sizeChecks" options={baseSizeOptions} width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeFaces" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeCm1" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="sizeCm2" width="w-12" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="glazeChecks" options={baseGlazeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="glazeResidue" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="surfaceChecks" options={baseSurfaceOptions} width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="surfaceTemp" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="guPtv" width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="inkChecks" options={baseInkOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput row={row} field="inkOther" width="w-16" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect row={row} field="sendBy" options={baseSendByOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput row={row} field="requiredDate" width="w-24" /></td>"""

content = content.replace(old_row, new_row)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
