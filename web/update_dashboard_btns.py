import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

# 1. Import BarChart2
import_lucide = "import { Trash2, Plus, Save, Layers, CheckSquare, Search, ChevronDown, Check, Eye, X, Pencil, Share2, ChevronUp } from 'lucide-react';"
import_lucide_new = "import { Trash2, Plus, Save, Layers, CheckSquare, Search, ChevronDown, Check, Eye, X, Pencil, Share2, ChevronUp, BarChart2 } from 'lucide-react';"
f = f.replace(import_lucide, import_lucide_new)

# 2. Add router import if not present
if "import { useRouter } from" not in f:
    f = f.replace("import { useAuth } from '@/hooks/use-auth';", "import { useAuth } from '@/hooks/use-auth';\nimport { useRouter } from 'next/navigation';")

# 3. Add router hook inside RegisterDesignPage
if "const router = useRouter();" not in f:
    f = f.replace("const { user } = useAuth();", "const { user } = useAuth();\n  const router = useRouter();")

# 4. Add Dashboard buttons
dashboard_buttons = '''
            <Button variant="outline" size="sm" onClick={() => {
              const url = window.location.origin + '/public/dashboard-design';
              navigator.clipboard.writeText(url);
              toast({ title: "Link Dashboard Disalin!", description: url });
            }} className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" />
              Share Dashboard
            </Button>
            <Button variant="outline" size="sm" onClick={() => router.push('/register-design/dashboard')} className="font-bold border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100">
              <BarChart2 className="w-4 h-4 mr-2" />
              Lihat Dashboard
            </Button>
'''
target_btn = '''<Button onClick={handleAddRow} size="sm" className="font-bold bg-blue-600 hover:bg-blue-700">'''
f = f.replace(target_btn, dashboard_buttons + '            ' + target_btn)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
