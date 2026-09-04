import re

f = open('src/app/register-design/page.tsx', encoding='utf-8').read()

functions = '''
  const handleExportExcel = () => {
    if (data.length === 0) {
      toast({ title: "Data kosong", variant: "destructive" });
      return;
    }
    const ws = XLSX.utils.json_to_sheet(data.map(d => {
      const { id, darNo, createdAt, updatedAt, ...rest } = d;
      return { DAR_No: darNo, ...rest };
    }));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Register Design");
    XLSX.writeFile(wb, `Register_Design_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      DAR_No: "", entryDate: "2024-01-01", itemName: "", customer: "", designer: "", technician: "",
      typeDesign: "New", designSource: "CGI", designNo: "", type: "", sizeChecks: "", sizeFaces: "",
      sizeCm1: "", sizeCm2: "", glazeChecks: "", glazeResidue: "", surfaceChecks: "", surfaceTemp: "",
      inkChecks: "", inkOther: "", guPtvChecks: "", guPtv: "", guPtv2: "", guPtv3: "", guPtv4: "", guPtv5: "", guPtv6: "",
      note2: "", sendBy: "", benefit: "", lastTimeReq: "", feedback: "", feedbackDetails: "",
      lastDesignSupp: "", requiredDate: "", closingDate: "", generalNote: "", status: "FREE"
    }];
    const ws = XLSX.utils.json_to_sheet(templateData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Import_Register_Design.xlsx");
  };

  const handleImportExcel = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const importedData = XLSX.utils.sheet_to_json(ws);
        
        let successCount = 0;
        for (const row of importedData as any[]) {
          const { DAR_No, ...rest } = row;
          const payload = {
            darNo: DAR_No || "",
            entryDate: rest.entryDate || new Date().toISOString().split('T')[0],
            itemName: rest.itemName || "",
            customer: rest.customer || "",
            designer: rest.designer || "",
            technician: rest.technician || "",
            typeDesign: rest.typeDesign || "",
            designSource: rest.designSource || "",
            designNo: rest.designNo || "",
            type: rest.type || "",
            sizeChecks: rest.sizeChecks || "",
            sizeFaces: rest.sizeFaces || "",
            sizeCm1: rest.sizeCm1 || "",
            sizeCm2: rest.sizeCm2 || "",
            glazeChecks: rest.glazeChecks || "",
            glazeResidue: rest.glazeResidue || "",
            surfaceChecks: rest.surfaceChecks || "",
            surfaceTemp: rest.surfaceTemp || "",
            inkChecks: rest.inkChecks || "",
            inkOther: rest.inkOther || "",
            guPtvChecks: rest.guPtvChecks || "",
            guPtv: rest.guPtv || "", guPtv2: rest.guPtv2 || "", guPtv3: rest.guPtv3 || "", 
            guPtv4: rest.guPtv4 || "", guPtv5: rest.guPtv5 || "", guPtv6: rest.guPtv6 || "",
            note2: rest.note2 || "",
            sendBy: rest.sendBy || "",
            benefit: rest.benefit || "",
            lastTimeReq: rest.lastTimeReq || "",
            feedback: rest.feedback || "",
            feedbackDetails: rest.feedbackDetails || "",
            lastDesignSupp: rest.lastDesignSupp || "",
            requiredDate: rest.requiredDate || "",
            closingDate: rest.closingDate || "",
            generalNote: rest.generalNote || "",
            status: rest.status || "FREE",
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          };
          
          await addDoc(collection(db, "register_design"), payload);
          successCount++;
        }
        
        toast({ title: "Import Berhasil", description: `${successCount} baris data berhasil ditambahkan.` });
      } catch (err) {
        console.error(err);
        toast({ title: "Gagal Import", description: "Terjadi kesalahan saat membaca file Excel.", variant: "destructive" });
      }
      
      e.target.value = '';
    };
    reader.readAsBinaryString(file);
  };
'''

lines = f.split('\n')
return_idx = -1
for i, line in enumerate(lines):
    if line.strip() == "return (" and i > 500:
        return_idx = i
        break

if return_idx != -1 and "const handleExportExcel = () => {" not in f:
    lines.insert(return_idx, functions)
    f = '\n'.join(lines)
    with open('src/app/register-design/page.tsx', 'w', encoding='utf-8') as out:
        out.write(f)
