"use client";

import { useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import { Button } from '@/components/ui/button';
import { Upload, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { collection, writeBatch, doc, serverTimestamp, Timestamp } from 'firebase/firestore';

export function WarehouseImportButton() {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isImporting, setIsImporting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsImporting(true);
    const reader = new FileReader();

    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        
        const data: any[] = XLSX.utils.sheet_to_json(ws);
        
        if (data.length === 0) {
          throw new Error("File Excel kosong.");
        }

        const batch = writeBatch(db);
        const warehouseRef = collection(db, 'warehouse_items');

        const STANDARD_DEPT_ORDER = [
          "FRIT Spare Part",
          "FRIT Packing",
          "MTc",
          "Mixer",
          "QC",
          "R&D",
          "LAB",
          "APP",
          "PPIC",
          "GA"
        ];

        data.forEach((row, index) => {
          const standardCols = ['No', 'Material Code', 'Material Name', 'Specification', 'Unit', 'Location', 'Status', 'Last Stock', 'Stock In', 'Ending Stock', 'Warning'];
          const stockOut: Record<string, number> = {};
          
          Object.keys(row).forEach(key => {
            if (!standardCols.includes(key)) {
              let cleanKey = key.replace('Out: ', '').trim();
              
              const standardMatch = STANDARD_DEPT_ORDER.find(d => d.toLowerCase() === cleanKey.toLowerCase().replace(/\s+/g, ' ').trim());
              if (standardMatch) {
                cleanKey = standardMatch;
              }
              
              stockOut[cleanKey] = Number(row[key]) || 0;
            }
          });

          const newDocRef = doc(warehouseRef);
          const today = new Date().toISOString().split('T')[0];
          const stockOutHistory = Object.entries(stockOut).map(([dept, value]) => ({
            id: crypto.randomUUID(),
            dept,
            value: Number(value),
            date: today,
            pic: "System Import"
          }));

          const stockInHistory = [{
            id: crypto.randomUUID(),
            date: today,
            value: Number(row['Stock In']) || 0,
            supplier: "System Import",
            poNumber: "-"
          }];

          batch.set(newDocRef, {
            materialCode: row['Material Code']?.toString() || '',
            materialName: row['Material Name']?.toString() || '',
            specification: row['Specification']?.toString() || '',
            unit: row['Unit']?.toString() || '',
            location: row['Location']?.toString() || '',
            status: row['Status']?.toString() || 'Stock',
            lastStock: Number(row['Last Stock']) || 0,
            stockIn: Number(row['Stock In']) || 0,
            stockInHistory,
            stockOut,
            stockOutHistory,
            createdAt: Timestamp.fromMillis(Date.now() + index),
            updatedAt: serverTimestamp()
          });
        });

        await batch.commit();
        
        toast({ title: 'Berhasil', description: `${data.length} data berhasil diimpor.` });
      } catch (error: any) {
        console.error(error);
        toast({ variant: 'destructive', title: 'Gagal Impor', description: error.message || 'Terjadi kesalahan format.' });
      } finally {
        setIsImporting(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };

    reader.readAsBinaryString(file);
  };

  return (
    <>
      <input 
        type="file" 
        accept=".xlsx, .xls" 
        className="hidden" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
      />
      <Button 
        variant="outline" 
        className="border-slate-200 hover:bg-slate-100 font-bold" 
        onClick={() => fileInputRef.current?.click()}
        disabled={isImporting}
      >
        {isImporting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
        Import Excel
      </Button>
    </>
  );
}
