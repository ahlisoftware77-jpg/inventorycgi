import re

# 1. Update API route
with open('src/app/api/upload-drive/route.ts', 'r', encoding='utf-8') as f:
    api_content = f.read()

# Replace NextResponse.json(...) to add corsHeaders
api_content = re.sub(r'(NextResponse\.json\([^,]+,\s*{([^}]*)})(\s*}\s*\))', lambda m: m.group(1) + (', headers: corsHeaders' if 'headers' not in m.group(2) else '') + m.group(3), api_content)
api_content = re.sub(r'(NextResponse\.json\({[^}]+})(\s*\))', r'\1, { headers: corsHeaders }\2', api_content)
# Fix overlapping replacements if any by just simple string replace
api_content = api_content.replace("{ status: 400 }", "{ status: 400, headers: corsHeaders }")
api_content = api_content.replace("{ status: 500 }", "{ status: 500, headers: corsHeaders }")
if "{ headers: corsHeaders }" not in api_content.split('NextResponse.json({')[1]: # basic check for success return
    api_content = api_content.replace(
        "webContentLink: uploadRes.data.webContentLink\n    });",
        "webContentLink: uploadRes.data.webContentLink\n    }, { headers: corsHeaders });"
    )

with open('src/app/api/upload-drive/route.ts', 'w', encoding='utf-8') as f:
    f.write(api_content)


# 2. Update register-design/page.tsx
with open('src/app/register-design/page.tsx', 'r', encoding='utf-8') as f:
    reg_content = f.read()

fetch_logic = '''
  const getUploadApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://inventorycgi.vercel.app/api/upload-drive';
    }
    return '/api/upload-drive';
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch(getUploadApiUrl(), {
'''

if "const getUploadApiUrl =" not in reg_content:
    reg_content = reg_content.replace(
        '''  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const res = await fetch('/api/upload-drive', {''',
        fetch_logic
    )

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as f:
    f.write(reg_content)

print("Updated route and register-design")
