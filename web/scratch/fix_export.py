import re

def main():
    filepath = 'src/app/register-design/page.tsx'
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Find handleExportExcel
    export_old = """  const handleExportExcel = () => {
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
  };"""

    export_new = """  const handleExportExcel = () => {
    if (data.length === 0) {
      toast({ title: "Data kosong", variant: "destructive" });
      return;
    }
    // Set column order explicitly to match the web view and template
    const ws = XLSX.utils.json_to_sheet(data.map(d => ({
      DAR_No: d.darNo || "",
      entryDate: d.entryDate || "",
      itemName: d.itemName || "",
      customer: d.customer || "",
      designer: d.designer || "",
      technician: d.technician || "",
      typeDesign: d.typeDesign || "",
      designSource: d.designSource || "",
      designNo: d.designNo || "",
      type: d.type || "",
      sizeChecks: d.sizeChecks || "",
      sizeFaces: d.sizeFaces || "",
      sizeCm1: d.sizeCm1 || "",
      sizeCm2: d.sizeCm2 || "",
      glazeChecks: d.glazeChecks || "",
      glazeResidue: d.glazeResidue || "",
      surfaceChecks: d.surfaceChecks || "",
      surfaceTemp: d.surfaceTemp || "",
      inkChecks: d.inkChecks || "",
      inkOther: d.inkOther || "",
      guPtvChecks: d.guPtvChecks || "",
      guPtv: d.guPtv || "",
      guPtv2: d.guPtv2 || "",
      guPtv3: d.guPtv3 || "",
      guPtv4: d.guPtv4 || "",
      guPtv5: d.guPtv5 || "",
      guPtv6: d.guPtv6 || "",
      note2: d.note2 || "",
      sendBy: d.sendBy || "",
      benefit: d.benefit || "",
      benefitText: d.benefitText || "",
      lastTimeReq: d.lastTimeReq || "",
      feedback: d.feedback || "",
      feedbackDetails: d.feedbackDetails || "",
      lastDesignSupp: d.lastDesignSupp || "",
      requiredDate: d.requiredDate || "",
      closingDate: d.closingDate || "",
      generalNote: d.generalNote || "",
      createdBy: d.createdBy || "",
      status: d.status || "",
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Register Design");
    XLSX.writeFile(wb, `Register_Design_${new Date().toISOString().split('T')[0]}.xlsx`);
  };"""

    content = content.replace(export_old, export_new)

    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(content)
    
    print("Done fixing export excel column order.")

if __name__ == "__main__":
    main()
