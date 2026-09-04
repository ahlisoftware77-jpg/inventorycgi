import os

file_path = r"e:\yadiapp-project\inventory - Copy\web\src\app\register-design\page.tsx"
with open(file_path, "rb") as f:
    b = f.read()

b = b.replace(b"\r\n", b"\n").replace(b"\r", b"")

with open(file_path, "wb") as f:
    f.write(b)

print("Done")
