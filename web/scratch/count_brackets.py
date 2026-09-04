import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

count = 0
for char in text:
    if char == '{': count += 1
    elif char == '}': count -= 1

print(f"Final bracket count: {count}")
