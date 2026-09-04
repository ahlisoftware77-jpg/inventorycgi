import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # The problem is in CellSelect where `type` is not defined.
    # We find `type === 'date' && val ? val : val || "-"` inside CellSelect and replace it with `val || "-"`

    # Let's target the exact line in CellSelect
    old_line = "return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || \"-\"}</div>;"
    new_line = "return <div onDoubleClick={() => setIsEditing(true)} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || \"-\"}</div>;"

    # Since CellInput also has this line and type IS defined there, we should only replace the SECOND occurrence (which is in CellSelect).
    parts = content.split(old_line)
    if len(parts) == 3:
        # It means there are exactly 2 occurrences.
        content = parts[0] + old_line + parts[1] + new_line + parts[2]
        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print("Fixed ReferenceError.")
    else:
        print("Could not find exactly 2 occurrences. Found:", len(parts) - 1)

if __name__ == "__main__":
    main()
