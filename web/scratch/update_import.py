import os

file_path = "src/app/form-app/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

target = """        let skipped = 0;
        let imported = 0;
        const skippedList: string[] = [];
        
        // Refresh to check duplicates
        const q = query(collection(db, "form_dar"));
        const snap = await getDocs(q);
        const existingDarNos = new Set(snap.docs.map(doc => doc.data().darNo));
        
        for (const row of data as any[]) {
          const rowDarNo = row["No. DAR"] || row["No DAR"] || row["darNo"];
          if (!rowDarNo) continue;
          
          if (existingDarNos.has(String(rowDarNo))) {
            skipped++;
            skippedList.push(String(rowDarNo));
            continue;
          }
          
          const payload = {
            darNo: String(rowDarNo),
            customer: row["Customer"] || "",
            entryDate: row["Entry Date"] || "",
            designer: row["Designer"] || "",
            technician: row["Technician"] || "",
            designNo: row["Design No"] || "",
            requiredDate: row["Required Date"] || "",
            closingDate: row["Closing Date"] || "",
            benefit: row["Benefit"] || "",
            generalNote: row["General Note"] || "",
            purpose: typeof row["Purpose"] === 'string' ? row["Purpose"].split(", ") : [],
            items: Array(32).fill(""),
            createdBy: user?.uid || "import",
            createdAt: new Date()
          };
          
          if (row["Item 1"]) payload.items[0] = String(row["Item 1"]);
          if (row["Item 2"]) payload.items[1] = String(row["Item 2"]);
          
          await addDoc(collection(db, "form_dar"), payload);
          imported++;
        }
        
        if (skipped > 0) {
            console.log("Skipped existing DAR Nos:", skippedList);
            toast({ title: "Import Selesai", description: `${imported} data di-import. ${skipped} data di-skip karena duplikat.` });
        } else {
            toast({ title: "Berhasil", description: `${imported} data berhasil di-import!` });
        }"""

replacement = """        let skipped = 0;
        let imported = 0;
        let updated = 0;
        
        // Get existing documents to check for merge
        const q = query(collection(db, "form_dar"));
        const snap = await getDocs(q);
        const existingMap = new Map();
        snap.docs.forEach(doc => {
           existingMap.set(String(doc.data().darNo), { id: doc.id, data: doc.data() });
        });
        
        for (const row of data as any[]) {
          const rowDarNo = String(row["No. DAR"] || row["No DAR"] || row["darNo"] || "");
          if (!rowDarNo) continue;
          
          const getVal = (key: string) => row[key] ? String(row[key]) : "";

          const newItems = Array(32).fill("");
          for (let i = 0; i < 32; i++) {
            newItems[i] = getVal(`Item ${i + 1}`);
          }
          
          const newGuPtv = Array(6).fill("");
          const newGuPtvChecks = Array(6).fill(false);
          for (let i = 0; i < 6; i++) {
            newGuPtv[i] = getVal(`GU PTV ${i + 1}`);
            newGuPtvChecks[i] = getVal(`GU PTV Check ${i + 1}`).toLowerCase() === "yes";
          }

          const newFeedbackRows = Array(4).fill(null).map((_, i) => ({
            c1: getVal(`Feedback Row ${i + 1} Col 1`),
            c2: getVal(`Feedback Row ${i + 1} Col 2`)
          }));

          const newNote2Rows = Array(3).fill(null).map((_, i) => ({
            c1: getVal(`Note 2 Row ${i + 1} Col 1`),
            c2: getVal(`Note 2 Row ${i + 1} Col 2`)
          }));

          const newLastDesignSupp = Array(6).fill(null).map((_, i) => ({
            c1: getVal(`Last Design Supp ${i + 1} Col 1`),
            c2: getVal(`Last Design Supp ${i + 1} Col 2`)
          }));

          const ext = {
            customer: getVal("Customer"),
            entryDate: getVal("Entry Date"),
            designer: getVal("Designer"),
            technician: getVal("Technician"),
            designNo: getVal("Design No"),
            requiredDate: getVal("Required Date"),
            closingDate: getVal("Closing Date"),
            purpose: getVal("Purpose") ? getVal("Purpose").split(", ") : [],
            type: getVal("Type") ? getVal("Type").split(", ") : [],
            sizeChecks: getVal("Size Checks") ? getVal("Size Checks").split(", ") : [],
            sizeFaces: getVal("Size Faces"),
            sizeCm1: getVal("Size Cm 1"),
            sizeCm2: getVal("Size Cm 2"),
            glazeChecks: getVal("Glaze Checks") ? getVal("Glaze Checks").split(", ") : [],
            glazeResidue: getVal("Glaze Residue"),
            surfaceChecks: getVal("Surface Checks") ? getVal("Surface Checks").split(", ") : [],
            surfaceTemp: getVal("Surface Temp"),
            guPtv: newGuPtv,
            guPtvChecks: newGuPtvChecks,
            inkChecks: getVal("Ink Checks") ? getVal("Ink Checks").split(", ") : [],
            inkOther: getVal("Ink Other"),
            sendBy: getVal("Send By") ? getVal("Send By").split(", ") : [],
            benefit: getVal("Benefit"),
            lastTimeReq: getVal("Last Time Request"),
            feedback: getVal("Feedback"),
            generalNote: getVal("General Note"),
            items: newItems,
            feedbackRows: newFeedbackRows,
            note2Rows: newNote2Rows,
            lastDesignSupp: newLastDesignSupp
          };

          if (existingMap.has(rowDarNo)) {
            const existing = existingMap.get(rowDarNo);
            let hasUpdates = false;
            const updatePayload: any = {};
            
            // Simple strings
            const stringFields = ["customer", "entryDate", "designer", "technician", "designNo", "requiredDate", "closingDate", "sizeFaces", "sizeCm1", "sizeCm2", "glazeResidue", "surfaceTemp", "inkOther", "benefit", "lastTimeReq", "feedback", "generalNote"];
            stringFields.forEach(field => {
                const extVal = ext[field as keyof typeof ext] as string;
                if (extVal && extVal !== existing.data[field]) {
                    updatePayload[field] = extVal;
                    hasUpdates = true;
                }
            });

            // String arrays
            const arrayFields = ["purpose", "type", "sizeChecks", "glazeChecks", "surfaceChecks", "inkChecks", "sendBy"];
            arrayFields.forEach(field => {
                const arr = ext[field as keyof typeof ext] as string[];
                if (arr.length > 0 && JSON.stringify(arr) !== JSON.stringify(existing.data[field])) {
                    updatePayload[field] = arr;
                    hasUpdates = true;
                }
            });

            // Items array
            let existingItems = existing.data.items || Array(32).fill("");
            let itemsUpdated = false;
            for (let i = 0; i < 32; i++) {
                if (ext.items[i] && ext.items[i] !== existingItems[i]) {
                    existingItems[i] = ext.items[i];
                    itemsUpdated = true;
                }
            }
            if (itemsUpdated) {
                updatePayload.items = existingItems;
                hasUpdates = true;
            }

            // GU PTV arrays
            let existingGu = existing.data.guPtv || Array(6).fill("");
            let guUpdated = false;
            for (let i = 0; i < 6; i++) {
                if (ext.guPtv[i] && ext.guPtv[i] !== existingGu[i]) {
                    existingGu[i] = ext.guPtv[i];
                    guUpdated = true;
                }
            }
            if (guUpdated) {
                updatePayload.guPtv = existingGu;
                updatePayload.guPtvChecks = ext.guPtvChecks;
                hasUpdates = true;
            }

            // Object arrays
            const complexMerge = (existingArr: any[], extArr: any[], len: number) => {
                let existingC = existingArr && Array.isArray(existingArr) && existingArr.length === len ? [...existingArr] : Array(len).fill(null).map(() => ({c1: "", c2: ""}));
                let isUpd = false;
                for (let i = 0; i < len; i++) {
                    if (extArr[i].c1 && extArr[i].c1 !== existingC[i]?.c1) { existingC[i].c1 = extArr[i].c1; isUpd = true; }
                    if (extArr[i].c2 && extArr[i].c2 !== existingC[i]?.c2) { existingC[i].c2 = extArr[i].c2; isUpd = true; }
                }
                return { isUpd, result: existingC };
            };

            const fbRes = complexMerge(existing.data.feedbackRows, ext.feedbackRows, 4);
            if (fbRes.isUpd) { updatePayload.feedbackRows = fbRes.result; hasUpdates = true; }

            const note2Res = complexMerge(existing.data.note2Rows, ext.note2Rows, 3);
            if (note2Res.isUpd) { updatePayload.note2Rows = note2Res.result; hasUpdates = true; }

            const suppRes = complexMerge(existing.data.lastDesignSupp, ext.lastDesignSupp, 6);
            if (suppRes.isUpd) { updatePayload.lastDesignSupp = suppRes.result; hasUpdates = true; }

            if (hasUpdates) {
                updatePayload.updatedAt = new Date();
                await updateDoc(doc(db, "form_dar", existing.id), updatePayload);
                updated++;
            } else {
                skipped++;
            }
          } else {
            await addDoc(collection(db, "form_dar"), {
                darNo: rowDarNo,
                ...ext,
                createdBy: user?.uid || "import",
                createdAt: new Date()
            });
            imported++;
          }
        }
        
        toast({ title: "Import Selesai", description: `${imported} data baru ditambahkan. ${updated} data diperbarui. ${skipped} data dilewati (tidak ada yang baru).` });"""

content = content.replace(target, replacement)
with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)
print("Done")
