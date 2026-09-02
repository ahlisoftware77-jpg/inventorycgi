import re
import os

file_path = 'src/app/form-app/page.tsx'
with open(file_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. ADD guPtvChecks state
content = content.replace(
    'const [guPtv, setGuPtv] = useState(["", "", "", "", "", ""]);',
    'const [guPtv, setGuPtv] = useState(["", "", "", "", "", ""]);\n  const [guPtvChecks, setGuPtvChecks] = useState<boolean[]>([false, false, false, false, false, false]);'
)

# 2. Add to load draft
content = content.replace(
    'if (d.guPtv) setGuPtv(d.guPtv);',
    'if (d.guPtv) setGuPtv(d.guPtv);\n        if (d.guPtvChecks) setGuPtvChecks(d.guPtvChecks);'
)

# 3. Add to dependencies and payload
content = content.replace(
    'glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, inkChecks, inkOther, sendBy,',
    'glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,'
)

# 4. Add to loadReport
content = content.replace(
    'setGuPtv(report.guPtv || ["", "", "", "", "", ""]);',
    'setGuPtv(report.guPtv || ["", "", "", "", "", ""]);\n    setGuPtvChecks(report.guPtvChecks || [false, false, false, false, false, false]);'
)

# 5. Add updateGuCheck
content = content.replace(
    '''  const updateGu = (idx: number, val: string) => {
    const newGu = [...guPtv];
    newGu[idx] = val;
    setGuPtv(newGu);
  };''',
    '''  const updateGu = (idx: number, val: string) => {
    const newGu = [...guPtv];
    newGu[idx] = val;
    setGuPtv(newGu);
  };
  const updateGuCheck = (idx: number, checked: boolean) => {
    const newChecks = [...guPtvChecks];
    newChecks[idx] = checked;
    setGuPtvChecks(newChecks);
  };'''
)

# 6. Replace input UI
old_input = '''                <div className="flex gap-2">
                  {guPtv.map((v, i) => <Input key={i} className="h-7 text-xs px-1" value={v} onChange={e => updateGu(i, e.target.value)} />)}
                </div>'''
new_input = '''                <div className="flex flex-wrap gap-3">
                  {guPtv.map((v, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Checkbox checked={guPtvChecks[i]} onCheckedChange={(c) => updateGuCheck(i, !!c)} />
                      <Input className="w-12 h-7 text-xs px-1" value={v} onChange={e => updateGu(i, e.target.value)} />
                    </div>
                  ))}
                </div>'''
content = content.replace(old_input, new_input)

# 7. Replace print UI for checkboxes
old_print = '''                                    {guPtv.map((v, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-block" />
                                            <span className="border-b border-black min-w-[30px] inline-block text-center">{v}</span>
                                        </div>
                                    ))}'''
new_print = '''                                    {guPtv.map((v, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {guPtvChecks[i] ? "✓" : ""}
                                            </span>
                                            <span className="border-b border-black min-w-[30px] inline-block text-center">{v}</span>
                                        </div>
                                    ))}'''
content = content.replace(old_print, new_print)


# 8. PREVIEW FEATURE AND HISTORY TABLE REWRITE
# We will replace the entire Dialog block for History with our new table and preview modal.

history_block_start = '<Dialog open={isHistoryOpen}'
history_block_end = '</Dialog>\n    </DashboardLayout>'

if history_block_start in content and history_block_end in content:
    idx_start = content.index(history_block_start)
    idx_end = content.index(history_block_end) + len(history_block_end)
    
    new_history_block = """
      {/* HISTORY DIALOG */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden bg-white text-black">
            <div className="p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 rounded-2xl text-left"><History className="h-6 w-6 text-blue-400" /></div>
                    <div className="text-left">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-left">Riwayat Form DAR</DialogTitle>
                        <DialogDescription className="text-white/40 text-[9px] font-black uppercase tracking-widest text-left">Internal Document Control</DialogDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="text-black bg-white hover:bg-slate-100 rounded-xl">
                        <Upload className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Export
                    </Button>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><X className="h-6 w-6" /></Button></DialogClose>
                </div>
            </div>
            
            <div className={`p-6 border-b flex items-center gap-4 transition-colors ${historySearch ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${historySearch ? 'text-blue-500' : 'text-slate-300 group-focus-within:text-blue-400'}`} />
                    <Input 
                        placeholder="Cari No DAR, Customer, Designer, atau Item..." 
                        value={historySearch} 
                        onChange={(e) => setHistorySearch(e.target.value)} 
                        className={`pl-11 h-12 rounded-xl transition-all focus-visible:ring-blue-500 ${historySearch ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-md' : 'bg-white shadow-sm border-slate-200 hover:border-slate-300'}`} 
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1 w-full">
                <div className="p-6 flex flex-col gap-4 w-full">
                    {loadingHistory ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-x-auto bg-white shadow-sm">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="p-3 pl-4">No. DAR</th>
                                        <th className="p-3">Waktu</th>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Designer</th>
                                        <th className="p-3">Design No</th>
                                        <th className="p-3">Items</th>
                                        <th className="p-3 text-right pr-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.filter(r => {
                                        const searchLower = historySearch.toLowerCase();
                                        return (r.darNo || '').toLowerCase().includes(searchLower) || 
                                            (r.customer || '').toLowerCase().includes(searchLower) || 
                                            (r.designer || '').toLowerCase().includes(searchLower) ||
                                            (r.items && Array.isArray(r.items) && r.items.some((item: string) => (item || '').toLowerCase().includes(searchLower)));
                                    }).map(report => (
                                        <tr key={report.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="p-3 pl-4 font-bold text-blue-700">{highlightMatch(report.darNo || '', historySearch)}</td>
                                            <td className="p-3 text-slate-500">
                                                {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : report.entryDate}
                                                {report.updatedAt?.seconds && <span className="ml-1.5 px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px]" title={`Diupdate oleh: ${report.updatedBy || 'Sistem'}`}>Upd</span>}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900">{highlightMatch(report.customer || '-', historySearch)}</td>
                                            <td className="p-3">{highlightMatch(report.designer || '-', historySearch)}</td>
                                            <td className="p-3">{highlightMatch(report.designNo || '-', historySearch)}</td>
                                            <td className="p-3">
                                                {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {report.items.filter(Boolean).map((item: string, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="text-[9px] font-medium bg-slate-100 text-slate-600 rounded">
                                                                {highlightMatch(item, historySearch)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-2 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                {confirmDeleteId === report.id ? (
                                                    <>
                                                        <Button variant="outline" size="icon" onClick={() => setConfirmDeleteId(null)} className="h-7 w-7 text-slate-400 rounded-lg" disabled={isDeleting}><X className="h-4 w-4" /></Button>
                                                        <Button onClick={() => handleDeleteReport(report.id)} className="h-7 w-7 bg-rose-600 text-white rounded-lg" disabled={isDeleting}>
                                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button onClick={() => setPreviewReportId(report.id)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-bold">Preview</Button>
                                                        <Button onClick={() => loadReport(report)} className="h-7 text-[10px] bg-slate-900 hover:bg-black text-white px-3 rounded-lg font-bold">Muat</Button>
                                                        {user?.role === 'Admin' && (
                                                            <Button variant="outline" size="icon" onClick={() => setConfirmDeleteId(report.id)} className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingHistory && historyData.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20 text-black">
                            <History className="h-12 w-12" />
                            <p className="font-black uppercase tracking-widest text-xs">Belum ada riwayat form DAR</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewReportId} onOpenChange={(open) => !open && setPreviewReportId(null)}>
        <DialogContent className="sm:max-w-4xl h-[90vh] p-0 border-none rounded-xl shadow-2xl overflow-hidden bg-slate-100 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm">
            <DialogTitle className="text-lg font-bold">Preview Form DAR</DialogTitle>
            <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button></DialogClose>
          </div>
          <div className="flex-1 overflow-auto p-4 flex justify-center">
             {previewReportId && <iframe src={`/form-app/preview/${previewReportId}`} className="w-full h-[1500px] border-none shadow-xl bg-white max-w-[210mm] overflow-hidden" />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>"""
    
    content = content[:idx_start] + new_history_block

# Add previewReportId state
content = content.replace('const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);', 'const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);\n  const [previewReportId, setPreviewReportId] = useState<string | null>(null);')

# Add highlightMatch helper right before return
content = content.replace(
    '  if (!hasAccess) return <DashboardLayout><div className="p-8 text-red-500 font-bold">Akses Ditolak. Anda tidak memiliki otoritas untuk melihat form ini.</div></DashboardLayout>;',
    '''  if (!hasAccess) return <DashboardLayout><div className="p-8 text-red-500 font-bold">Akses Ditolak. Anda tidak memiliki otoritas untuk melihat form ini.</div></DashboardLayout>;

  const highlightMatch = (text: string, search: string) => {
    if (!search || !text) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return (
        <>
            {parts.map((part, i) => 
                part.toLowerCase() === search.toLowerCase() ? 
                    <span key={i} className="bg-yellow-300 text-yellow-900 font-bold px-0.5 rounded shadow-sm">{part}</span> : 
                    part
            )}
        </>
    );
  };'''
)

with open(file_path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Rebuilt page.tsx with all features successfully!")
