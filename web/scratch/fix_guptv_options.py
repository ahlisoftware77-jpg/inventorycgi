import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the missing variable
content = content.replace(
    '  const guPtvCustomOptions = [',
    '  const baseGuPtvOptions: string[] = [];\n  const guPtvCustomOptions = ['
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
