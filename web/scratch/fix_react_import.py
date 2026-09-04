import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Fix the missing React import
content = content.replace(
    "import { useState, useEffect, useCallback } from 'react';",
    "import React, { useState, useEffect, useCallback } from 'react';"
)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
