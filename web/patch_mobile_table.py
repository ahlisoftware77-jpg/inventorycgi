import re

with open(r'src/app/form-app/page.tsx', 'r', encoding='utf-8') as f:
    text = f.read()

target = """                    ) : (
                        <div className="border rounded-xl overflow-x-auto overflow-y-hidden bg-white shadow-sm w-full max-w-full block">
                            <table className="w-full min-w-max text-left text-[10px] sm:text-xs whitespace-nowrap">"""

# Replace the start of the table block with a wrapper and the mobile list
replacement = """                    ) : (
                        <>
                            {/* MOBILE LIST */}
                            <div className="flex sm:hidden flex-col gap-3">
                                {historyData.filter(r => {
                                    const searchLower = historySearch.toLowerCase();
                                    return (r.darNo || '').toLowerCase().includes(searchLower) || 
                                        (r.customer || '').toLowerCase().includes(searchLower) || 
                                        (r.designer || '').toLowerCase().includes(searchLower) ||
                                        (r.items && Array.isArray(r.items) && r.items.some((item: string) => (item || '').toLowerCase().includes(searchLower)));
                                }).map(report => (
                                    <div key={report.id} className="bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm relative">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col">
                                                <span className="font-black text-blue-700 text-sm">{highlightMatch(report.darNo || '', historySearch)}</span>
                                                <span className="text-slate-500 text-[10px]">
                                                    {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : report.entryDate}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5">
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
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Customer</span>
                                                <span className="font-semibold truncate">{highlightMatch(report.customer || '-', historySearch)}</span>
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designer</span>
                                                <span className="truncate">{highlightMatch(report.designer || '-', historySearch)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items</span>
                                            {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {report.items.filter(Boolean).slice(0, 6).map((item: string, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="text-[9px] font-medium bg-slate-100 text-slate-600 rounded px-1.5 py-0">
                                                            {highlightMatch(item, historySearch)}
                                                        </Badge>
                                                    ))}
                                                    {report.items.filter(Boolean).length > 6 && <span className="text-[9px] text-slate-400 bg-slate-50 px-1 rounded">+{report.items.filter(Boolean).length - 6}</span>}
                                                </div>
                                            ) : <span className="text-slate-300 text-[10px]">-</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* DESKTOP TABLE */}
                            <div className="hidden sm:block border rounded-xl overflow-x-auto overflow-y-hidden bg-white shadow-sm w-full max-w-full">
                                <table className="w-full min-w-max text-left text-[10px] sm:text-xs whitespace-nowrap">"""

text = text.replace(target, replacement)

# We also need to close the Fragment at the end
end_target = """                            </table>
                        </div>
                    )}"""

end_replacement = """                            </table>
                            </div>
                        </>
                    )}"""
text = text.replace(end_target, end_replacement)

with open(r'src/app/form-app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(text)

print("Updated table to flexible mobile layout")
