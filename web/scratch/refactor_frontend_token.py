import re

def update_register_design():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # 1. Add `auth` to firebase config import
    content = re.sub(
        r"import \{ db \} from '@/lib/firebase/config';",
        "import { db, auth } from '@/lib/firebase/config';",
        content
    )

    # 2. Add Authorization header to handleFileChange initRes
    init_fetch = """      const initRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', fileName: file.name, mimeType: file.type }),
      });"""
    init_fetch_new = """      const token = await auth.currentUser?.getIdToken();
      const initRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'init', fileName: file.name, mimeType: file.type }),
      });"""
    content = content.replace(init_fetch, init_fetch_new)

    # 3. Add Authorization header to handleFileChange finishRes
    finish_fetch = """      const finishRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', fileId: fileId }),
      });"""
    finish_fetch_new = """      const finishRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ action: 'finish', fileId: fileId }),
      });"""
    content = content.replace(finish_fetch, finish_fetch_new)

    # 4. Add Authorization header to handleDeleteImage
    del_fetch = """      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: row.designImage }),
      });"""
    del_fetch_new = """      const token = await auth.currentUser?.getIdToken();
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ fileId: row.designImage }),
      });"""
    content = content.replace(del_fetch, del_fetch_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Updated {filepath}")

def update_broadcast_email():
    filepath = 'src/app/broadcast-email/page.tsx'
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()

        # Add auth to import if not present
        if 'auth' not in content and '@/lib/firebase/config' in content:
            content = re.sub(
                r"import \{([^}]*)\} from '@/lib/firebase/config';",
                lambda m: f"import {{{m.group(1)}, auth}} from '@/lib/firebase/config';" if 'auth' not in m.group(1) else m.group(0),
                content
            )

        # Add Token to fetch
        email_fetch = """      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },"""
        email_fetch_new = """      const token = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },"""
        if email_fetch in content:
            content = content.replace(email_fetch, email_fetch_new)

        with open(filepath, 'w', encoding='utf-8') as f:
            f.write(content)
        print(f"Updated {filepath}")
    except Exception as e:
        print(f"Could not update {filepath}: {e}")

def main():
    update_register_design()
    update_broadcast_email()

if __name__ == "__main__":
    main()
