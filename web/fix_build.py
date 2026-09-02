import os

# Fix preview page
preview_path = 'src/app/form-app/preview/[id]/page.tsx'
with open(preview_path, 'r', encoding='utf-8') as f:
    content = f.read()

# Replace double braces with single braces recursively
content = content.replace('{{', '{').replace('}}', '}')
# The dangerouslySetInnerHTML might need double braces {{ __html: ... }}, so let's fix it if it became single
content = content.replace('dangerouslySetInnerHTML={__html:', 'dangerouslySetInnerHTML={{__html:')
content = content.replace('padding: "20px 40px" }', 'padding: "20px 40px" }}')

with open(preview_path, 'w', encoding='utf-8') as f:
    f.write(content)

# Fix page.tsx EOF
page_path = 'src/app/form-app/page.tsx'
with open(page_path, 'r', encoding='utf-8') as f:
    content = f.read()

if not content.strip().endswith('}'):
    content = content + '\n  );\n}\n'
    
with open(page_path, 'w', encoding='utf-8') as f:
    f.write(content)
