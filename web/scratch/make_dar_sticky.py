import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # --- THEAD ---
    # 1. Update Checkbox TH
    # old: <th className="p-2 border-r text-center sticky left-0 bg-slate-100 z-20">
    # new: <th className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-slate-100 z-20">
    content = content.replace(
        '<th className="p-2 border-r text-center sticky left-0 bg-slate-100 z-20">',
        '<th className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-slate-100 z-30">'
    )

    # 2. Update DAR No TH
    # old: <th className="p-2 border-r bg-blue-50 text-blue-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("darNo")}>
    # new: <th className="p-2 border-r bg-blue-50 text-blue-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group sticky left-10 z-20 shadow-[4px_0_8px_rgba(0,0,0,0.02)]" onClick={() => handleSort("darNo")}>
    content = content.replace(
        '<th className="p-2 border-r bg-blue-50 text-blue-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("darNo")}>',
        '<th className="p-2 border-r bg-blue-50 text-blue-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group sticky left-10 z-20 shadow-[4px_0_8px_rgba(0,0,0,0.02)]" onClick={() => handleSort("darNo")}>'
    )

    # --- TBODY ---
    # 3. Update Checkbox TD
    # old: <td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-10">
    # new: <td className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-20">
    content = content.replace(
        '<td className="p-1 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-10">',
        '<td className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-20">'
    )

    # 4. Update DAR No TD
    # old: <td className="p-1 border-r font-black text-blue-700 bg-blue-50/30">
    # new: <td className="p-1 border-r font-black text-blue-700 sticky left-10 bg-[#f4f8ff] group-hover:bg-blue-50 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
    content = content.replace(
        '<td className="p-1 border-r font-black text-blue-700 bg-blue-50/30">',
        '<td className="p-1 border-r font-black text-blue-700 sticky left-10 bg-[#f4f8ff] group-hover:bg-blue-50 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">'
    )

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done making DAR No sticky.")

if __name__ == "__main__":
    main()
