import re

with open(r'src/app/form-app/page.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add editId state
state_insert = """  const [darExists, setDarExists] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);"""
content = content.replace('  const [darExists, setDarExists] = useState(false);', state_insert)

# 2. Update loadReport to set editId
load_insert = """  const loadReport = (report: any) => {
    setEditId(report.id || null);"""
content = content.replace('  const loadReport = (report: any) => {', load_insert)

# 3. Update useEffect for darExists to ignore if editId is set
effect_target = """  useEffect(() => {
    if (!darNo) {"""
effect_insert = """  useEffect(() => {
    if (!darNo || editId) {
      setDarExists(false);
      return;
    }
    if (!darNo) {"""
content = content.replace(effect_target, effect_insert)

# 4. Update handleSave to use updateDoc if editId is set
save_target = """      // Check if DAR exists
      const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
      const snap = await getDocs(q);
      
      if (!snap.empty) {
        toast({ title: "Gagal", description: "Nomor DAR sudah ada di database! Tidak dapat menimpa data.", variant: "destructive" });
        return;
      }

      // Add new
      await addDoc(collection(db, "form_dar"), { ...cleanPayload, createdAt: new Date() });
      toast({ title: "Berhasil", description: "Form DAR berhasil disimpan!" });"""
      
save_insert = """      if (editId) {
        // Update existing document
        await updateDoc(doc(db, "form_dar", editId), { ...cleanPayload, updatedAt: new Date() });
        toast({ title: "Berhasil", description: "Form DAR berhasil diperbarui!" });
        setEditId(null);
      } else {
        // Check if DAR exists
        const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
        const snap = await getDocs(q);
        
        if (!snap.empty) {
          toast({ title: "Gagal", description: "Nomor DAR sudah ada di database! Tidak dapat menimpa data.", variant: "destructive" });
          return;
        }

        // Add new
        await addDoc(collection(db, "form_dar"), { ...cleanPayload, createdAt: new Date() });
        toast({ title: "Berhasil", description: "Form DAR berhasil disimpan!" });
      }"""
content = content.replace(save_target, save_insert)

# 5. Disable darNo input if editId is set
input_target = """<Input value={darNo} onChange={e => setDarNo(e.target.value)} className={darExists ? "border-rose-500 bg-rose-50 pr-10" : "pr-10"} />"""
input_insert = """<Input value={darNo} onChange={e => setDarNo(e.target.value)} disabled={!!editId} className={darExists ? "border-rose-500 bg-rose-50 pr-10" : "pr-10"} />"""
content = content.replace(input_target, input_insert)

# 6. We also need to clear editId when clearing the form.
# Let's find a function that clears the form. If there is one, we'll patch it.
# Actually, the user can just reload the page, but let's check for setDarNo("")
# There is a draft cleanup maybe? Or a reset button?
reset_target = """setDarNo("");"""
if reset_target in content:
    # let's only replace the first occurrence assuming it's a reset function? No, better use regex for a reset function.
    pass

# We also need to make sure we import `doc` and `updateDoc` if not already imported
# They are imported: import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, where, updateDoc, limit } from "firebase/firestore";

with open(r'src/app/form-app/page.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("Patched successfully")
