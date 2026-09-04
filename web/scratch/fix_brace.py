import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# find the last '}'
last_brace = text.rfind('}')
if last_brace != -1:
    text = text[:last_brace] + text[last_brace+1:]

with open(file_path, "w", encoding="utf-8") as f:
    f.write(text)

print("Done")
