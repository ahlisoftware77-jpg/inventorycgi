import re
f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

# 1. Add hashString function before RegisterDesignPage
hash_func = '''
async function hashString(str: string) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}
'''
if "async function hashString" not in f:
    f = f.replace("export default function RegisterDesignPage() {", hash_func + "\nexport default function RegisterDesignPage() {")

# 2. Add state inside RegisterDesignPage
states = '''
  const [isShareDashboardOpen, setIsShareDashboardOpen] = useState(false);
  const [dashboardPasscode, setDashboardPasscode] = useState("123456");
'''
if "const [isShareDashboardOpen, setIsShareDashboardOpen]" not in f:
    f = f.replace('  const [search, setSearch] = useState("");', '  const [search, setSearch] = useState("");\n' + states)

# 3. Add Dialog markup inside the return statement (at the end of other dialogs)
dialog_markup = '''
      <Dialog open={isShareDashboardOpen} onOpenChange={setIsShareDashboardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Dashboard Summary</DialogTitle>
            <DialogDescription>
              Buat passcode untuk membatasi akses pada link publik.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Passcode (minimal 4 karakter)</label>
            <Input 
              type="text" 
              value={dashboardPasscode} 
              onChange={e => setDashboardPasscode(e.target.value)} 
              placeholder="Contoh: Ahlisoftware77"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDashboardOpen(false)}>Batal</Button>
            <Button 
              disabled={dashboardPasscode.length < 4}
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={async () => {
                const hashed = await hashString(dashboardPasscode);
                const url = window.location.origin + '/public/dashboard-design?k=' + hashed;
                navigator.clipboard.writeText(url);
                toast({ title: "Link Dashboard Disalin!", description: "Link beserta passcode sudah dibuat." });
                setIsShareDashboardOpen(false);
              }}
            >
              Copy Link Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
'''
if "Share Dashboard Summary" not in f:
    f = f.replace("    </DashboardLayout>", dialog_markup + "    </DashboardLayout>")

# 4. Modify Share Dashboard button onClick
old_btn = '''<Button variant="outline" size="sm" onClick={() => {
              const url = window.location.origin + '/public/dashboard-design';
              navigator.clipboard.writeText(url);
              toast({ title: "Link Dashboard Disalin!", description: url });
            }} className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" />
              Share Dashboard
            </Button>'''
new_btn = '''<Button variant="outline" size="sm" onClick={() => setIsShareDashboardOpen(true)} className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 hidden sm:flex">
              <Share2 className="w-4 h-4 mr-2" />
              Share Dashboard
            </Button>'''
f = f.replace(old_btn, new_btn)

with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
    out.write(f)
