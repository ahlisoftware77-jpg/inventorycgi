"use client";

import React, { useState } from "react";
import { db } from "@/lib/firebase/config";
import { collection, getDocs, addDoc, query } from "firebase/firestore";
import { Button } from "@/components/ui/button";

export default function ScratchExportPage() {
  const [log, setLog] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const addLog = (msg: string) => setLog(prev => [...prev, msg]);

  const handleExport = async () => {
    setLoading(true);
    setLog(["Mulai mengekspor data dari form_dar ke register_design..."]);
    
    try {
      // 1. Ambil data register_design existing untuk hindari duplikat
      addLog("Mengambil data register_design existing...");
      const rdSnap = await getDocs(collection(db, "register_design"));
      const existingKeys = new Set();
      rdSnap.forEach(doc => {
        const data = doc.data();
        if (data.darNo && data.itemName) {
          existingKeys.add(`${data.darNo}-${data.itemName}`);
        }
      });
      addLog(`Ditemukan ${existingKeys.size} item existing di register_design.`);

      // 2. Ambil data form_dar
      addLog("Mengambil data form_dar...");
      const darSnap = await getDocs(query(collection(db, "form_dar")));
      addLog(`Ditemukan ${darSnap.size} form DAR.`);

      let addedCount = 0;
      let skippedCount = 0;

      // 3. Loop form_dar dan buat item register_design
      for (const docSnapshot of darSnap.docs) {
        const form = docSnapshot.data();
        const darNo = form.darNo || "";
        if (!darNo) continue;

        const items: string[] = form.items || [];
        for (const itemName of items) {
          if (!itemName || itemName.trim() === "") continue;

          const key = `${darNo}-${itemName}`;
          if (existingKeys.has(key)) {
            skippedCount++;
            continue;
          }

          // Transformasi format array ke string
          const safeJoin = (arr: any) => (Array.isArray(arr) ? arr.join(", ") : arr || "");
          
          let guPtvVal = "";
          let guPtvChecks = form.guPtvChecks || [];
          if (Array.isArray(guPtvChecks) && guPtvChecks.some(c => c === true)) {
             guPtvVal = "Checkbox";
          }
          
          const gArray = Array.isArray(form.guPtv) ? form.guPtv : [];

          const newData = {
            darNo,
            itemName,
            customer: form.customer || "",
            entryDate: form.entryDate || "",
            designer: form.designer || "",
            technician: form.technician || "",
            benefit: safeJoin(form.purpose),
            status: form.status || "FREE",
            typeDesign: form.typeDesign || "",
            designSource: form.designSource || "",
            designNo: form.designNo || "",
            type: safeJoin(form.type),
            sizeChecks: safeJoin(form.sizeChecks),
            sizeFaces: form.sizeFaces || "",
            sizeCm1: form.sizeCm1 || "",
            sizeCm2: form.sizeCm2 || "",
            glazeChecks: safeJoin(form.glazeChecks),
            glazeResidue: form.glazeResidue || "",
            surfaceChecks: safeJoin(form.surfaceChecks),
            surfaceTemp: form.surfaceTemp || "",
            guPtvChecks: guPtvVal,
            guPtv: gArray[0] || "",
            guPtv2: gArray[1] || "",
            guPtv3: gArray[2] || "",
            guPtv4: gArray[3] || "",
            guPtv5: gArray[4] || "",
            guPtv6: gArray[5] || "",
            inkChecks: safeJoin(form.inkChecks),
            inkOther: form.inkOther || "",
            sendBy: safeJoin(form.sendBy),
            requiredDate: form.requiredDate || "",
            closingDate: form.closingDate || "",
            generalNote: form.generalNote || "",
            createdAt: form.createdAt || new Date()
          };

          await addDoc(collection(db, "register_design"), newData);
          addedCount++;
          existingKeys.add(key); // prevent duplicates within same loop
        }
      }

      addLog(`Selesai! Berhasil mengekspor ${addedCount} item baru. Di-skip ${skippedCount} item (duplikat).`);
    } catch (e: any) {
      addLog(`Error: ${e.message}`);
    }
    
    setLoading(false);
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Export Form DAR to Register Design</h1>
      <Button onClick={handleExport} disabled={loading}>
        {loading ? "Mengekspor..." : "Mulai Export"}
      </Button>
      
      <div className="mt-8 bg-slate-900 text-green-400 p-4 rounded h-96 overflow-y-auto font-mono text-sm">
        {log.map((l, i) => (
          <div key={i}>{l}</div>
        ))}
      </div>
    </div>
  );
}
