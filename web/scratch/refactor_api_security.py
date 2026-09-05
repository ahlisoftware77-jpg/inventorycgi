import re
import os

def update_api_file(filepath):
    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add imports if not present
    import_statement = "import { authenticateRequest, getCorsHeaders } from '@/lib/api-security';"
    if import_statement not in content:
        # insert after the first import
        content = re.sub(r'^(import .*?;?\n)', r'\1' + import_statement + '\n', content, count=1, flags=re.MULTILINE)

    # 2. Replace hardcoded corsHeaders
    content = re.sub(
        r'const corsHeaders = \{.*?\};', 
        '', 
        content, 
        flags=re.DOTALL
    )

    # 3. Replace OPTIONS to use dynamic CORS
    old_options = "export async function OPTIONS() {\n  return new NextResponse(null, { status: 200, headers: corsHeaders });\n}"
    new_options = "export async function OPTIONS(request: Request) {\n  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });\n}"
    if old_options in content:
        content = content.replace(old_options, new_options)
    else:
        # Regex replacement if exact match fails
        content = re.sub(
            r'export async function OPTIONS\(\).*?\{.*?headers:\s*corsHeaders.*?\}',
            'export async function OPTIONS(request: Request) {\n  return new NextResponse(null, { status: 200, headers: getCorsHeaders(request) });\n}',
            content,
            flags=re.DOTALL
        )

    # 4. Inject authentication and CORS headers into POST
    # We need to find `export async function POST(request: Request) {\n  try {\n`
    post_start = "export async function POST(request: Request) {\n  try {\n"
    auth_injection = "    await authenticateRequest(request);\n"
    
    if post_start in content and auth_injection not in content:
        content = content.replace(post_start, post_start + auth_injection)

    # Update responses inside POST to include dynamic headers
    content = re.sub(r'headers:\s*corsHeaders', 'headers: getCorsHeaders(request)', content)

    # Also catch `return NextResponse.json(..., { status: xxx, headers: corsHeaders })` 
    # Actually, the previous regex handles it since `headers: corsHeaders` is unique.

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

def main():
    files_to_update = [
        'src/app/api/upload-drive/route.ts',
        'src/app/api/delete-drive/route.ts',
        'src/app/api/send-email/route.ts'
    ]
    
    for filepath in files_to_update:
        update_api_file(filepath)

if __name__ == "__main__":
    main()
