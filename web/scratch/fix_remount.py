import os
import re

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. We need to find the start of CellMultiSelect
start_multi = content.find("  // Advanced Spec Dropdown")
# It ends right before `  // Helper for input`
end_multi = content.find("  // Helper for input", start_multi)

# 2. We need to find the start of CellInput
start_input = content.find("  // Helper for input", start_multi)
# It ends right before `  // Helper for select`
end_input = content.find("  // Helper for select", start_input)

# 3. We need to find the start of CellSelect
start_select = content.find("  // Helper for select", start_input)
# It ends right before `  return (` (the main return of RegisterDesignPage)
end_select = content.find("  return (", start_select)

# Extract the blocks
multi_block = content[start_multi:end_multi]
input_block = content[start_input:end_input]
select_block = content[start_select:end_select]

# Remove them from inside the component
content = content[:start_multi] + content[end_select:]

# Modify the signatures to accept handleUpdateCell
multi_block = multi_block.replace(
    'width?: string \n  }) => {',
    'width?: string, \n    handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void \n  }) => {'
)

input_block = input_block.replace(
    'colorFn?: (v: string) => string }) => {',
    'colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {'
)

select_block = select_block.replace(
    'colorFn?: (v: string) => string }) => {',
    'colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {'
)

# Combine the extracted blocks
extracted_components = multi_block + "\n" + input_block + "\n" + select_block + "\n"

# Insert them BEFORE `export default function RegisterDesignPage() {`
export_idx = content.find("export default function RegisterDesignPage() {")
content = content[:export_idx] + extracted_components + content[export_idx:]

# Now, we must update all usages of CellMultiSelect, CellInput, and CellSelect to pass handleUpdateCell
content = content.replace('<CellMultiSelect ', '<CellMultiSelect handleUpdateCell={handleUpdateCell} ')
content = content.replace('<CellInput ', '<CellInput handleUpdateCell={handleUpdateCell} ')
content = content.replace('<CellSelect ', '<CellSelect handleUpdateCell={handleUpdateCell} ')

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
