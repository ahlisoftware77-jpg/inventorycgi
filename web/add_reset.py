import re

with open(r'src/app/form-app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

start = text.find('const loadReport = (report: any) => {')
end = text.find('};', start)
load_func = text[start:end+2]

reset_func = load_func.replace('loadReport = (report: any)', 'resetForm = ()')
reset_func = reset_func.replace('setEditId(report.id || null);', 'setEditId(null);')

# Now strip out `report.xxx || `
reset_func = re.sub(r'report\.[a-zA-Z0-9_]+\s*\|\|\s*', '', reset_func)

# Remove setIsHistoryOpen(false)
reset_func = reset_func.replace('setIsHistoryOpen(false);', '')

# Replace the toast
reset_func = re.sub(r'toast\(\{.*?\}\);', 'toast({ title: "Form Dikosongkan", description: "Siap untuk membuat form DAR baru" });', reset_func, flags=re.DOTALL)

# Insert the reset_func right after load_func
if 'const resetForm = () =>' not in text:
    text = text[:end+2] + '\n\n  ' + reset_func + text[end+2:]

# Now add the button in the UI
button_target = """            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-4 h-4 mr-2" /> Simpan</Button>
            </div>"""

button_replacement = """            <div className="flex gap-3">
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white"><Save className="w-4 h-4 mr-2" /> Simpan</Button>
              <Button onClick={resetForm} variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50"><Plus className="w-4 h-4 mr-2" /> Buat Baru</Button>
            </div>"""

text = text.replace(button_target, button_replacement)

# Make sure `Plus` icon is imported from lucide-react
if 'Plus' not in text.split('lucide-react')[0] and 'Plus' not in text.split('lucide-react')[0].split('import {')[-1]:
    # Let's just add it to the import
    import_match = re.search(r'import\s+\{([^}]+)\}\s+from\s+[\'"]lucide-react[\'"]', text)
    if import_match:
        imports = import_match.group(1)
        if 'Plus' not in imports:
            new_imports = imports + ', Plus'
            text = text.replace(import_match.group(0), f'import {{ {new_imports} }} from "lucide-react"')

with open(r'src/app/form-app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Added resetForm and Buat Baru button.")
