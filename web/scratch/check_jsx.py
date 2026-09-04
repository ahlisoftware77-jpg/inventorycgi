import subprocess
import sys

try:
    with open('test_jsx.js', 'w') as f:
        f.write("import fs from 'fs';\nimport * as parser from '@babel/parser';\nconst code = fs.readFileSync('src/app/register-design/page.tsx', 'utf-8');\nparser.parse(code, { sourceType: 'module', plugins: ['jsx', 'typescript'] });\nconsole.log('OK');\n")
    
    subprocess.run(["npm", "install", "@babel/parser"], check=True, capture_output=True)
    res = subprocess.run(["node", "test_jsx.js"], capture_output=True, text=True)
    if "OK" in res.stdout:
        print("Babel parses it successfully!")
    else:
        print("Babel error:")
        print(res.stderr)
except Exception as e:
    print(str(e))
