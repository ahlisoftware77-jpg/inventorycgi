import re

path = 'e:/yadiapp-project/inventory - Copy/web/src/app/settings/page.tsx'

with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# Add imports
if 'import { Tabs,' not in content:
    content = content.replace("import { Checkbox } from '@/components/ui/checkbox';", "import { Checkbox } from '@/components/ui/checkbox';\nimport { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';")

# Extract the header
header_match = re.search(r'(<div className="flex items-center gap-3 px-1 text-left">.*?</div>)', content, re.DOTALL)
header = header_match.group(1)

# Extract blocks based on comments
def extract_block(name):
    # Regex to find from the comment to the next comment or end of main div
    pattern = r'({/\* ' + name + r' \*/}.*?)(?=\n\s*{/\* |</div>\n\s*{/\* EDIT CATEGORY DIALOG)'
    match = re.search(pattern, content, re.DOTALL)
    if match:
        return match.group(1)
    return ""

blocks = {
    "VIEW ACCESSIBILITY & ZOOM": extract_block("VIEW ACCESSIBILITY & ZOOM"),
    "SIDEBAR MENU MANAGEMENT": extract_block("SIDEBAR MENU MANAGEMENT"),
    "GENERAL SETTINGS": extract_block("GENERAL SETTINGS"),
    "GEMINI AI CONFIGURATION": extract_block("GEMINI AI CONFIGURATION"),
    "2ND CHECKER AUTHORIZATION": extract_block("2ND CHECKER AUTHORIZATION"),
    "DEPARTMENT GROUPING": extract_block("DEPARTMENT GROUPING"),
    "SERIES MANAGEMENT": extract_block("SERIES MANAGEMENT"),
    "CATEGORY & SERIES CLASSIFICATION TABLE": extract_block("CATEGORY & SERIES CLASSIFICATION TABLE"),
    "STATUS ASET MANAGEMENT": extract_block("STATUS ASET MANAGEMENT"),
    "PHYSICAL CONDITION MANAGEMENT": extract_block("PHYSICAL CONDITION MANAGEMENT"),
    "INVENTORY TYPE MANAGEMENT": extract_block("INVENTORY TYPE MANAGEMENT"),
    "COST CENTER MANAGEMENT TABLE": extract_block("COST CENTER MANAGEMENT TABLE"),
    "TECHNICAL LABELS CUSTOMIZATION": extract_block("TECHNICAL LABELS CUSTOMIZATION"),
    "DEPARTMENT MANAGEMENT TABLE": extract_block("DEPARTMENT MANAGEMENT TABLE"),
    "SAVE STICKY BUTTON": extract_block("SAVE STICKY BUTTON"),
    "MARQUEE SETTINGS": extract_block("MARQUEE SETTINGS"),
}

tab_groups = {
    "general": [
        "GENERAL SETTINGS",
        "VIEW ACCESSIBILITY & ZOOM",
        "MARQUEE SETTINGS"
    ],
    "menu": [
        "SIDEBAR MENU MANAGEMENT",
        "2ND CHECKER AUTHORIZATION"
    ],
    "master": [
        "DEPARTMENT MANAGEMENT TABLE",
        "DEPARTMENT GROUPING",
        "COST CENTER MANAGEMENT TABLE"
    ],
    "asset": [
        "SERIES MANAGEMENT",
        "CATEGORY & SERIES CLASSIFICATION TABLE",
        "TECHNICAL LABELS CUSTOMIZATION",
        "STATUS ASET MANAGEMENT",
        "PHYSICAL CONDITION MANAGEMENT",
        "INVENTORY TYPE MANAGEMENT"
    ],
    "integration": [
        "GEMINI AI CONFIGURATION"
    ]
}

new_layout = f"""{header}

        <Tabs defaultValue="general" className="w-full">
          <TabsList className="flex flex-wrap h-auto gap-2 justify-start bg-transparent mb-6 p-0 border-b pb-4 rounded-none">
            <TabsTrigger value="general" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 bg-slate-100 dark:bg-slate-800">Umum & Tampilan</TabsTrigger>
            <TabsTrigger value="menu" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 bg-slate-100 dark:bg-slate-800">Menu & Akses</TabsTrigger>
            <TabsTrigger value="master" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 bg-slate-100 dark:bg-slate-800">Data Master</TabsTrigger>
            <TabsTrigger value="asset" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 bg-slate-100 dark:bg-slate-800">Kategori & Aset</TabsTrigger>
            <TabsTrigger value="integration" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-full px-6 py-2 bg-slate-100 dark:bg-slate-800">Integrasi AI</TabsTrigger>
          </TabsList>

"""

for tab, block_names in tab_groups.items():
    new_layout += f'          <TabsContent value="{tab}" className="space-y-10 focus-visible:outline-none focus-visible:ring-0">\n'
    for name in block_names:
        new_layout += blocks[name] + "\n"
    new_layout += '          </TabsContent>\n\n'

new_layout += "        </Tabs>\n\n"
new_layout += blocks["SAVE STICKY BUTTON"] + "\n"

# Replace old layout with new layout
main_div_pattern = r'(<div className="max-w-5xl mx-auto space-y-10 pb-32 text-black">).*?(?=</div>\n\s*{/\* EDIT CATEGORY DIALOG)'
content = re.sub(main_div_pattern, r'\1\n' + new_layout, content, flags=re.DOTALL)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)

print("Done")
