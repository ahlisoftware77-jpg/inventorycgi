import re

with open(r'src/app/form-app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

# 1. Add useSearchParams
if 'useSearchParams' not in text:
    if 'next/navigation' in text:
        text = text.replace('import {', 'import { useSearchParams,', 1) 
    else:
        text = text.replace('import * as XLSX', 'import { useSearchParams } from "next/navigation";\nimport * as XLSX')

# 2. Change signature
text = text.replace('export default function FormAppPage() {', 'export function FormAppContent({ isPublic = false }: { isPublic?: boolean }) {')

# 3. Add hooks and share logic
hooks_target = """  const { user } = useAuth();
  const { toast } = useToast();"""

hooks_replacement = """  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const publicId = searchParams.get('id');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (publicId && !editId) {
      const loadPublicReport = async () => {
        try {
          const docRef = doc(db, 'form_dar', publicId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            loadReport({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.error("Error loading public report", e);
        }
      };
      loadPublicReport();
    }
  }, [publicId]);

  const handleSharePublicLink = async (idToShare?: string) => {
    setIsSharing(true);
    const targetId = idToShare || editId;
    if (!targetId) {
        toast({ title: "Gagal", description: "Tidak ada form yang dipilih untuk dibagikan.", variant: "destructive" });
        setIsSharing(false);
        return;
    }
    const publicUrl = `${window.location.origin}/public/form-dar?id=${targetId}`;
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Form DAR - ' + customer,
            url: publicUrl,
          });
          setIsSharing(false);
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
        }
      }
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Berhasil", description: "Link berhasil disalin ke clipboard!" });
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal menyalin link.", variant: "destructive" });
    }
    setIsSharing(false);
  };"""

text = text.replace(hooks_target, hooks_replacement)


# 4. Hide Left Column if isPublic
left_col_target = """      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20 items-start">
        {/* LEFT COLUMN - INPUTS */}
        <div className="xl:col-span-4 space-y-6 print:hidden max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">"""
left_col_replacement = """      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20 items-start">
        {/* LEFT COLUMN - INPUTS */}
        <div className={`xl:col-span-4 space-y-6 print:hidden max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar ${isPublic ? 'hidden' : ''}`}>"""
text = text.replace(left_col_target, left_col_replacement)

# 5. Expand Right column if isPublic and add Toolbar
right_col_target = """        {/* RIGHT COLUMN - PREVIEW (A4) */}
        <div className="xl:col-span-8 flex justify-center pb-20 print:p-0 print:m-0 print:block overflow-hidden w-full relative h-[600px] sm:h-[900px] xl:h-auto">"""
right_col_replacement = """        {/* RIGHT COLUMN - PREVIEW (A4) */}
        <div className={`${isPublic ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col items-center pb-20 print:p-0 print:m-0 print:block overflow-hidden w-full relative h-[600px] sm:h-[900px] xl:h-auto`}>
            {/* PUBLIC TOOLBAR */}
            {isPublic && (
                <div className="w-full max-w-[210mm] flex justify-between items-center mb-4 p-4 bg-white rounded-2xl shadow-sm">
                    <h2 className="font-bold text-slate-800">Form DAR #{darNo}</h2>
                    <Button onClick={handleSave} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                        <Save className="w-4 h-4 mr-2" /> Simpan
                    </Button>
                </div>
            )}
"""
text = text.replace(right_col_target, right_col_replacement)

# 6. Add Share button to left column toolbar
toolbar_target = """            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 px-1"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Buat Baru</span></Button>
              <Button onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-1"><Printer className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Print</span></Button>
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-1"><Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Simpan</span></Button>
            </div>"""
toolbar_replacement = """            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 px-1"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Buat Baru</span></Button>
              <Button onClick={() => handleSharePublicLink()} disabled={isSharing || !editId} variant="outline" className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 px-1">
                {isSharing ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Share2 className="w-4 h-4 sm:mr-2" />} <span className="hidden sm:inline">Bagikan</span>
              </Button>
              <Button onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-1"><Printer className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Print</span></Button>
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-1"><Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Simpan</span></Button>
            </div>"""
text = text.replace(toolbar_target, toolbar_replacement)

# 7. Add Share button to History Table
history_target = """                                                        <Button onClick={() => setPreviewReportId(report.id)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-bold">Preview</Button>
                                                        <Button onClick={() => loadReport(report)} className="h-7 text-[10px] bg-slate-900 hover:bg-black text-white px-3 rounded-lg font-bold">Muat</Button>"""
history_replacement = """                                                        <Button onClick={() => setPreviewReportId(report.id)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-bold">Preview</Button>
                                                        <Button variant="outline" size="icon" onClick={() => handleSharePublicLink(report.id)} className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg">
                                                            <Share2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button onClick={() => loadReport(report)} className="h-7 text-[10px] bg-slate-900 hover:bg-black text-white px-3 rounded-lg font-bold">Muat</Button>"""
text = text.replace(history_target, history_replacement)

# 8. Ensure default export
text += "\n\nexport default function FormAppPage() {\n  return <FormAppContent />;\n}\n"

with open(r'src/app/form-app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated page.tsx successfully.")
