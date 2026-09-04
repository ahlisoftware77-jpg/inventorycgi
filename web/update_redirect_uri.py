import re

with open('src/app/settings/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

content = content.replace(
    "const redirectUri = window.location.hostname === 'localhost' ? `${window.location.origin}/api/oauth2callback` : 'https://inventorycgi.vercel.app/api/oauth2callback';",
    "const redirectUri = window.location.origin + '/oauth-callback';"
)

content = content.replace(
    "<b>{typeof window !== 'undefined' && window.location.hostname === 'localhost' ? 'http://localhost:3000/api/oauth2callback' : 'https://inventorycgi.vercel.app/api/oauth2callback'}</b>",
    "<b>{typeof window !== 'undefined' ? window.location.origin + '/oauth-callback' : ''}</b>"
)

with open('src/app/settings/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Updated settings redirect URI")
