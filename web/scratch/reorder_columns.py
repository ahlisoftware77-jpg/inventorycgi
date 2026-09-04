import re

def main():
    with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # We will extract the header row and body row contents using regex, then replace them.
    # Header block: from <th ... onClick={() => handleSort("darNo")}> to </tr>
    # Actually, it's easier to find the whole chunk and replace it.
    
    # NEW Header Order Keys (mapped from sortKeys):
    # Base: darNo, entryDate, itemName, customer, designer, technician, purpose, [IMAGE_UPLOAD_TH], status, typeDesign, designSource, designNo
    # Insert: requiredDate, closingDate
    # Next: type, sizeChecks, glazeChecks, surfaceChecks, guPtv, inkChecks, sendBy
    # Insert: benefitText, generalNote, lastTimeReq, feedbackDetails, lastDesignSupp, note2
    # End: [AKSI_TH]
    
    header_keys = [
        "darNo", "entryDate", "itemName", "customer", "designer", "technician", "purpose",
        "IMAGE_UPLOAD", "status", "typeDesign", "designSource", "designNo",
        "requiredDate", "closingDate",
        "type", "sizeChecks", "glazeChecks", "surfaceChecks", "guPtv", "inkChecks", "sendBy",
        "benefitText", "generalNote", "lastTimeReq", "feedbackDetails", "lastDesignSupp", "note2",
        "AKSI"
    ]
    
    cell_keys = [
        "darNo", "entryDate", "itemName", "customer", "designer", "technician", "benefit",
        "IMAGE_UPLOAD", "status", "typeDesign", "designSource", "designNo",
        "requiredDate", "closingDate",
        "type", "sizeChecks", "glazeChecks", "surfaceChecks", "guPtvChecks", "inkChecks", "sendBy",
        "benefitText", "generalNote", "lastTimeReq", "feedbackDetails", "lastDesignSupp", "note2",
        "AKSI"
    ]

    # Extract all individual th strings
    th_blocks = {}
    for match in re.finditer(r'(<th[^>]*onClick=\{\(\) => handleSort\("([a-zA-Z0-9]+)"\)\}.*?</th>)', text, re.DOTALL):
        th_blocks[match.group(2)] = match.group(1)
        
    th_blocks["IMAGE_UPLOAD"] = '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group"><div className="flex items-center gap-1">Gambar Desain</div></th>'
    th_blocks["AKSI"] = '<th className="p-2 text-center sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Aksi</th>'

    # Extract all individual td strings
    td_blocks = {}
    for match in re.finditer(r'(<td[^>]*>\s*<Cell[^>]*field="([a-zA-Z0-9]+)".*?</td>)', text, re.DOTALL):
        td_blocks[match.group(2)] = match.group(1)
        
    # Find Image Upload TD manually
    img_td_match = re.search(r'(<td[^>]*>\s*<CellImageUpload[^>]*>\s*</td>)', text, re.DOTALL)
    if img_td_match:
        td_blocks["IMAGE_UPLOAD"] = img_td_match.group(1)
        
    # Find Aksi TD manually
    aksi_td_match = re.search(r'(<td[^>]*>\s*<div className="flex items-center justify-center gap-1">.*?</td>)', text, re.DOTALL)
    if aksi_td_match:
        td_blocks["AKSI"] = aksi_td_match.group(1)
        
    # Check if we have all blocks
    for k in header_keys:
        if k not in th_blocks: print(f"Missing TH: {k}")
    for k in cell_keys:
        if k not in td_blocks: print(f"Missing TD: {k}")
        
    # Reconstruct Header Row
    new_header_html = "\n                ".join([th_blocks[k] for k in header_keys])
    
    # Reconstruct Body Row
    new_body_html = "\n                    ".join([td_blocks[k] for k in cell_keys])
    
    # Replace in text
    # Replace between <tr> ... </tr> in thead
    text = re.sub(r'(<thead>\s*<tr>\s*<th className="p-2 border-r text-center sticky left-0 bg-slate-100 z-20 shadow-\[4px_0_12px_rgba\(0,0,0,0\.05\)\]">\s*<input[^>]*>\s*</th>).*?(</tr>\s*</thead>)', r'\1\n                ' + new_header_html.replace('\\', '\\\\') + r'\n              \2', text, flags=re.DOTALL)

    # Replace between <tr> ... </tr> in tbody
    text = re.sub(r'(<tr key=\{row\.id\}[^>]*>\s*<td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50/50 z-10">\s*<input[^>]*>\s*</td>).*?(</tr>)', r'\1\n                    ' + new_body_html.replace('\\', '\\\\') + r'\n                  \2', text, flags=re.DOTALL)

    with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)
        
    print("DONE!")

if __name__ == "__main__":
    main()
