import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target1 = """import { useAuthState } from 'react-firebase-hooks/auth';
import { auth, db } from '@/lib/firebase/config';"""

replacement1 = """import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';"""

target2 = """export default function RegisterDesignPage() {
  const [user, loadingUser] = useAuthState(auth);"""

replacement2 = """export default function RegisterDesignPage() {
  const { user, loading: loadingUser } = useAuth();"""

content = content.replace(target1, replacement1)
content = content.replace(target2, replacement2)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
