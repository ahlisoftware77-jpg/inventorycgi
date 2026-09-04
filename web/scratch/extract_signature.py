import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

sig_card_target = """          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="bg-slate-900 text-white rounded-t-xl p-4 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Pencil className="h-4 w-4" /> Tanda Tangan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-6">
              {[
                { id: 'manager', label: 'Manager 經理', ref: sigManager },
                { id: 'sectionHead', label: 'Section Head 課長', ref: sigSectionHead },
                { id: 'designer', label: 'Designer/Technician 設計師/技術員', ref: sigDesigner },
              ].map((sig) => (
                <div key={sig.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                      {lockedSignatures[sig.id as keyof typeof lockedSignatures] ? <Lock className="h-3 w-3 text-amber-500" /> : <User className="h-3 w-3" />}
                      {sig.label}
                    </Label>
                    <div className="flex items-center gap-1">
                      {!lockedSignatures[sig.id as keyof typeof lockedSignatures] && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
                          {['#000000', '#0000ff', '#ff0000'].map(hex => (
                            <button key={hex} type="button" onClick={() => setPenColors(p => ({ ...p, [sig.id]: hex }))} className={cn("w-3 h-3 rounded-full", hex === penColors[sig.id as keyof typeof penColors] ? "ring-2 ring-primary" : "")} style={{ backgroundColor: hex }} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {!lockedSignatures[sig.id as keyof typeof lockedSignatures] && (
                          <button 
                            type="button" 
                            className="h-6 w-6 text-rose-500 flex items-center justify-center hover:bg-rose-50 rounded" 
                            onClick={() => { 
                                const ref = getRefByRole(sig.id);
                                if (ref.current) ref.current.clear(); 
                                setSignatures(prev => ({ ...prev, [sig.id]: '' })); 
                            }}
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" className={cn("h-6 w-6 rounded-full flex items-center justify-center hover:bg-slate-50", lockedSignatures[sig.id as keyof typeof lockedSignatures] ? "text-amber-600" : "text-slate-400")} onClick={() => toggleLock(sig.id as 'manager' | 'sectionHead' | 'designer')}>
                          {lockedSignatures[sig.id as keyof typeof lockedSignatures] ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={cn("border-2 border-dashed rounded-xl bg-slate-50 h-32 overflow-hidden shadow-inner relative", lockedSignatures[sig.id as keyof typeof lockedSignatures] && "border-amber-200")}>
                    {signatures[sig.id as keyof typeof signatures] && (getRefByRole(sig.id).current?.isEmpty() || lockedSignatures[sig.id as keyof typeof lockedSignatures]) && (
                      <div className="absolute inset-0 flex items-center justify-center p-4 z-20">
                          <Image src={signatures[sig.id as keyof typeof signatures]} alt="Sig" width={150} height={60} className="object-contain" />
                      </div>
                    )}
                    <div className={cn("w-full h-full relative z-10", lockedSignatures[sig.id as keyof typeof lockedSignatures] && "pointer-events-none")}>
                      <SignatureCanvas ref={getRefByRole(sig.id)} onEnd={updateSignaturesState} penColor={penColors[sig.id as keyof typeof penColors]} canvasProps={{ className: 'w-full h-full' }} />
                    </div>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>"""

# Replace in-place with variable reference
content = content.replace(sig_card_target, "{signatureCard}")

# Create the signatureCard variable just before return (
return_target = """  return (
    <DashboardLayout>"""

sig_card_def = f"""  const signatureCard = (
{sig_card_target.replace('className="rounded-2xl border shadow-sm"', 'className="rounded-2xl border shadow-sm w-full max-w-[210mm] print:hidden"')}
  );

  return (
    <DashboardLayout>"""

content = content.replace(return_target, sig_card_def)

# Now modify Right Column Wrapper
right_col_target = """        {/* RIGHT COLUMN - PREVIEW (A4) */}
        <div className={`${isPublic ? 'xl:col-span-12' : 'xl:col-span-8'} flex justify-center pb-20 print:p-0 print:m-0 print:block overflow-hidden w-full relative h-[600px] sm:h-[900px] xl:h-auto`}>"""

right_col_replacement = """        {/* RIGHT COLUMN - PREVIEW (A4) */}
        <div className={`${isPublic ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col items-center gap-6 pb-20 print:p-0 print:m-0 print:block overflow-hidden w-full relative h-[600px] sm:h-[900px] xl:h-auto`}>
            {isPublic && (
                <div className="w-full max-w-[210mm] flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Form DAR #{darNo}</h2>
                    <Button onClick={handleSave} disabled={isSharing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm">
                        {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Tanda Tangan
                    </Button>
                </div>
            )}"""

content = content.replace(right_col_target, right_col_replacement)

# Now inject {isPublic && signatureCard} at the end of the Right Column
paper_end_target = """                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>"""

paper_end_replacement = """                        </div>
                    </div>
                </div>
            </div>
            </div>
            {isPublic && signatureCard}
        </div>"""

content = content.replace(paper_end_target, paper_end_replacement)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
