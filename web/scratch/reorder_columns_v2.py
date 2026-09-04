def main():
    with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
        text = f.read()

    # Define the precise blocks to extract using find()
    def extract_block(text, start_str, end_str=None):
        start = text.find(start_str)
        if start == -1: return ""
        if end_str:
            end = text.find(end_str, start)
            return text[start:end]
        return text[start:]

    # TH blocks
    th_designNo = extract_block(text, '<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("designNo")}>', '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("type")}>')
    th_type = extract_block(text, '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("type")}>', '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("sizeChecks")}>')
    th_sendBy = extract_block(text, '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("sendBy")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("note2")}>')
    
    th_note2 = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("note2")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastTimeReq")}>')
    th_lastTimeReq = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastTimeReq")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("benefitText")}>')
    th_benefitText = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("benefitText")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("generalNote")}>')
    th_generalNote = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("generalNote")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("feedbackDetails")}>')
    th_feedbackDetails = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("feedbackDetails")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastDesignSupp")}>')
    th_lastDesignSupp = extract_block(text, '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastDesignSupp")}>', '<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("requiredDate")}>')
    th_requiredDate = extract_block(text, '<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("requiredDate")}>', '<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("closingDate")}>')
    th_closingDate = extract_block(text, '<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("closingDate")}>', '<th className="p-2 text-center sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Aksi</th>')

    # Remove the blocks that are moving from their original location (we will reconstruct the sequence)
    # The block to reconstruct starts at `th_designNo` and ends right before `Aksi`
    start_replace = text.find('<th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("designNo")}>')
    end_replace = text.find('<th className="p-2 text-center sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Aksi</th>')
    
    # We will also need to get all the middle blocks from th_type up to th_sendBy
    th_middle_blocks = extract_block(text, '<th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("type")}>', '<th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("note2")}>')

    # Reconstruct headers
    new_headers = (
        th_designNo +
        th_requiredDate +
        th_closingDate +
        th_middle_blocks +
        th_benefitText +
        th_generalNote +
        th_lastTimeReq +
        th_feedbackDetails +
        th_lastDesignSupp +
        th_note2
    )

    text = text[:start_replace] + new_headers + text[end_replace:]

    # TD blocks
    td_designNo = extract_block(text, '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designNo" width="w-24" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="type" options={baseTypeOptions} width="w-24" /></td>')
    td_middle_blocks = extract_block(text, '<td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="type" options={baseTypeOptions} width="w-24" /></td>', '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="note2" title="Note 2" rowsCount={3} /></td>')
    
    td_note2 = extract_block(text, '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="note2" title="Note 2" rowsCount={3} /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="lastTimeReq" width="w-28" type="date" /></td>')
    td_lastTimeReq = extract_block(text, '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="lastTimeReq" width="w-28" type="date" /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="benefitText" width="w-40" /></td>')
    td_benefitText = extract_block(text, '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="benefitText" width="w-40" /></td>', '<td className="p-1 border-r bg-slate-50/50"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="generalNote" width="w-48" /></td>')
    td_generalNote = extract_block(text, '<td className="p-1 border-r bg-slate-50/50"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="generalNote" width="w-48" /></td>', '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="feedbackDetails" title="Feedback" rowsCount={4} /></td>')
    td_feedbackDetails = extract_block(text, '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="feedbackDetails" title="Feedback" rowsCount={4} /></td>', '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="lastDesignSupp" title="Support" rowsCount={6} /></td>')
    td_lastDesignSupp = extract_block(text, '<td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="lastDesignSupp" title="Support" rowsCount={6} /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-28" type="date" /></td>')
    td_requiredDate = extract_block(text, '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-28" type="date" /></td>', '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="closingDate" width="w-28" type="date" /></td>')
    td_closingDate = extract_block(text, '<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="closingDate" width="w-28" type="date" /></td>', '<td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50/50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">')
    
    start_td_replace = text.find('<td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designNo" width="w-24" /></td>')
    end_td_replace = text.find('<td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50/50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">')

    # Reconstruct cells
    new_cells = (
        td_designNo +
        td_requiredDate +
        td_closingDate +
        td_middle_blocks +
        td_benefitText +
        td_generalNote +
        td_lastTimeReq +
        td_feedbackDetails +
        td_lastDesignSupp +
        td_note2
    )
    
    text = text[:start_td_replace] + new_cells + text[end_td_replace:]
    
    with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
        f.write(text)

if __name__ == "__main__":
    main()
