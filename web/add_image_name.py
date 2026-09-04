import re

with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add designImageName to Interface
content = content.replace(
    "  designImage?: string;",
    "  designImage?: string;\n  designImageName?: string;"
)

# 2. Add handleUpdateCell for designImageName
content = content.replace(
    "handleUpdateCell(row.id, 'designImage', data.fileId);",
    "handleUpdateCell(row.id, 'designImage', data.fileId);\n      handleUpdateCell(row.id, 'designImageName', file.name);"
)

# 3. Add to UI
ui_replacement = '''
        {/* Hover Preview Box */}
        <div className="absolute hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-2 rounded-xl shadow-2xl border border-slate-200">
          {row.designImageName && (
            <div className="text-[10px] font-medium text-slate-600 mb-1 px-1 max-w-[256px] truncate text-center">
              {row.designImageName}
            </div>
          )}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
             <img src={imgUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>
'''
content = content.replace('''
        {/* Hover Preview Box */}
        <div className="absolute hidden group-hover:block top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-2 rounded-xl shadow-2xl border border-slate-200">
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
             <img src={imgUrl} alt="Preview" className="w-full h-full object-contain" />
          </div>''', ui_replacement)

# Also clear the name when removing the image
content = content.replace(
    "handleUpdateCell(row.id, 'designImage', '');",
    "handleUpdateCell(row.id, 'designImage', ''); handleUpdateCell(row.id, 'designImageName', '');"
)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Added image name to preview UI")
