import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """    const checkDar = async () => {
      setCheckingDar(true);
      try {
        const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
        const snap = await getDocs(q);
        setDarExists(!snap.empty);
      } catch (e) {
        console.error("Error checking DAR:", e);
      }
      setCheckingDar(false);
    };"""

replacement = """    const checkDar = async () => {
      setCheckingDar(true);
      try {
        const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          setDarExists(true);
        } else {
          setDarExists(false);
          // Check register_design collection for grouped items
          const rq = query(collection(db, "register_design"), where("darNo", "==", darNo));
          const rSnap = await getDocs(rq);
          if (!rSnap.empty) {
            // Found items in register design but form DAR not yet created
            const groupedItems = rSnap.docs.map(d => d.data());
            const first = groupedItems[0];
            
            // Populate basic fields
            if (first.customer) setCustomer(first.customer);
            if (first.designer) setDesigner(first.designer);
            if (first.technician) setTechnician(first.technician);
            if (first.typeDesign) setTypeDesign(first.typeDesign);
            if (first.designSource) setDesignSource(first.designSource);
            if (first.designNo) setDesignNo(first.designNo);
            if (first.requiredDate) setRequiredDate(first.requiredDate);
            if (first.closingDate) setClosingDate(first.closingDate);
            if (first.generalNote) setGeneralNote(first.generalNote);
            if (first.status) setStatus(first.status);
            if (first.type) setType([first.type]);
            
            // Populate checkbox/array fields if they exist in string form (comma separated)
            if (first.sizeChecks) setSizeChecks(first.sizeChecks.split(',').map((s:string)=>s.trim()));
            if (first.glazeChecks) setGlazeChecks(first.glazeChecks.split(',').map((s:string)=>s.trim()));
            if (first.surfaceChecks) setSurfaceChecks(first.surfaceChecks.split(',').map((s:string)=>s.trim()));
            if (first.inkChecks) setInkChecks(first.inkChecks.split(',').map((s:string)=>s.trim()));
            
            // Extract item names into the 32 slots array
            const newItems = Array(32).fill("");
            groupedItems.forEach((item, index) => {
              if (index < 32 && item.itemName) {
                newItems[index] = item.itemName;
              }
            });
            setItems(newItems);
            
            toast({ title: "Desain Ditemukan!", description: `Berhasil menarik ${groupedItems.length} desain dari Register Design untuk Nomor DAR ini.` });
          }
        }
      } catch (e) {
        console.error("Error checking DAR:", e);
      }
      setCheckingDar(false);
    };"""

content = content.replace(target, replacement)

# Update Task Checklist
task_path = r"C:\Users\00563\.gemini\antigravity-ide\brain\8b62d400-178f-4101-b637-45a41851ddf4\task.md"
with open(task_path, "r", encoding="utf-8") as f:
    task_content = f.read()

task_content = task_content.replace("- `[ ]` **5. Penyesuaian Form Utama (Form DAR)**", "- `[x]` **5. Penyesuaian Form Utama (Form DAR)**")
task_content = task_content.replace("- `[ ]` Ubah logika pencarian Nomor DAR di `form-app/page.tsx`.", "- `[x]` Ubah logika pencarian Nomor DAR di `form-app/page.tsx`.")
task_content = task_content.replace("- `[ ]` Jika Nomor DAR ditemukan, tarik data item-item dari `register_design`.", "- `[x]` Jika Nomor DAR ditemukan, tarik data item-item dari `register_design`.")
task_content = task_content.replace("- `[ ]` Ekstrak nama desain untuk dimasukkan ke daftar 32 slot *Items*.", "- `[x]` Ekstrak nama desain untuk dimasukkan ke daftar 32 slot *Items*.")
task_content = task_content.replace("- `[ ]` Centang *checkbox* spesifikasi (Size, Glaze, dll) di form", "- `[x]` Centang *checkbox* spesifikasi (Size, Glaze, dll) di form")

with open(task_path, "w", encoding="utf-8") as f:
    f.write(task_content)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Done")
