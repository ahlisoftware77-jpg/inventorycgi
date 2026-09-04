import os

file_path = "src/app/register-design/page.tsx"
with open(file_path, "r", encoding="utf-8") as f:
    text = f.read()

# The file is completely jumbled. Let's rebuild it by extracting parts.
# 1. Imports
imports = """'use client';
import React, { useState, useEffect, useCallback } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/hooks/use-auth';
import { db } from '@/lib/firebase/config';
import { collection, query, orderBy, getDocs, doc, setDoc, deleteDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { Trash2, Plus, CheckSquare, Search, ChevronDown, Check } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
"""

# 2. Interface
interface = """
export interface RegisterDesignItem {
  id: string;
  darNo: string;
  entryDate: string;
  customer: string;
  itemName: string;
  designer: string;
  technician: string;
  status: string;
  typeDesign: string;
  designSource: string;
  designNo: string;
  requiredDate: string;
  closingDate: string;
  type: string;
  sizeChecks: string;
  sizeFaces: string;
  sizeCm1: string;
  sizeCm2: string;
  glazeChecks: string;
  glazeResidue: string;
  surfaceChecks: string;
  surfaceTemp: string;
  guPtvChecks: string;
  guPtv: string;
  guPtv2?: string;
  guPtv3?: string;
  guPtv4?: string;
  guPtv5?: string;
  guPtv6?: string;
  inkChecks: string;
  inkOther: string;
  sendBy: string;
  benefit: string;
  lastTimeReq: string;
  feedback: string;
  feedbackDetails: string;
  lastDesignSupp: string;
  note2: string;
  generalNote: string;
  createdAt?: any;
  updatedAt?: any;
}
"""

# 3. Helper components (Outside)
helpers = """
  // Advanced Spec Dropdown with inline inputs
  const CellMultiSelect = ({ 
    row, field, options, customOptions = [], width = "w-32",
    handleUpdateCell 
  }: { 
    row: RegisterDesignItem, 
    field: keyof RegisterDesignItem, 
    options: string[], 
    customOptions?: { label: string, fields: { key: keyof RegisterDesignItem, placeholder: string, width?: string }[], separator?: string }[],
    width?: string,
    handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void 
  }) => {
    const [isOpen, setIsOpen] = useState(false);
    const val = row[field] as string || "";
    const selected = val.split(',').map(s => s.trim()).filter(Boolean);

    const toggleOption = (opt: string) => {
      let newSelected;
      if (selected.includes(opt)) {
        newSelected = selected.filter(s => s !== opt);
      } else {
        newSelected = [...selected, opt];
      }
      handleUpdateCell(row.id, field, newSelected.join(', '));
    };

    const getSummary = () => {
       let parts = [...selected];
       customOptions.forEach(co => {
          if (selected.includes(co.label)) {
             const vals = co.fields.map(f => row[f.key] as string || "?");
             const idx = parts.indexOf(co.label);
             if (idx !== -1) {
                if (co.separator) {
                   parts[idx] = `${co.label}(${vals.join(co.separator)})`;
                } else {
                   parts[idx] = `${co.label}(${vals.join(', ')})`;
                }
             }
          }
       });
       return parts.join(', ');
    };

    const displayVal = getSummary();

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div 
            className={`border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`}
            title={displayVal}
          >
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                <input 
                  type="checkbox" 
                  checked={selected.includes(opt)}
                  onChange={() => toggleOption(opt)}
                  className="w-3 h-3 cursor-pointer"
                />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}

            {customOptions.map(co => {
              const isChecked = selected.includes(co.label);
              return (
                <div key={co.label} className="flex flex-col gap-1 p-1 hover:bg-slate-50 rounded">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input 
                      type="checkbox" 
                      checked={isChecked}
                      onChange={() => toggleOption(co.label)}
                      className="w-3 h-3 cursor-pointer"
                    />
                    <span className="text-slate-700">{co.label}</span>
                  </label>
                  
                  {isChecked && (
                    <div className="flex items-center gap-1 pl-5 mt-1 flex-wrap">
                      {co.fields.map((f, i) => (
                        <React.Fragment key={f.key}>
                          {i > 0 && co.separator && <span className="text-xs text-slate-400">{co.separator}</span>}
                          <input
                            type="text"
                            placeholder={f.placeholder}
                            value={(row[f.key] as string) || ""}
                            onChange={(e) => handleUpdateCell(row.id, f.key, e.target.value)}
                            className={`border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500 ${f.width || "w-16"}`}
                          />
                        </React.Fragment>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
          <div className="border-t mt-2 pt-2 flex justify-end">
            <Button size="sm" variant="ghost" className="h-6 text-[10px] px-2" onClick={() => setIsOpen(false)}>Tutup</Button>
          </div>
        </PopoverContent>
      </Popover>
    );
  };

  // Helper for input
  const CellInput = ({ row, field, list, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <input
        type="text"
        list={list}
        value={val}
        onChange={(e) => handleUpdateCell(row.id, field, e.target.value)}
        className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`}
        placeholder="-"
      />
    );
  };

  // Helper for select
  const CellSelect = ({ row, field, options, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const val = row[field] as string || "";
    return (
      <select
        value={val}
        onChange={(e) => handleUpdateCell(row.id, field, e.target.value)}
        className={`w-full border border-transparent hover:border-slate-300 focus:border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer ${colorFn ? colorFn(val) : 'bg-transparent'} ${width}`}
      >
        <option value="">-</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  };
"""

# Extract the rest from the original file safely
# Find `export default function RegisterDesignPage() {`
idx = text.find("export default function RegisterDesignPage() {")
main_func = text[idx:]

# wait, main_func contains the whole end of the file. But since my last script messed it up, let's just extract the body of main_func safely.
# Let's find where it actually ends. It ends at the last `}`.
# But wait, `main_func` in the current file might have been injected below the JSX!
# Let's just reconstruct `RegisterDesignPage` cleanly using regex or explicit text.

# Actually, my last script `fix_remount.py` extracted multi_block, input_block, select_block, and did:
# `content = content[:export_idx] + extracted_components + content[export_idx:]`
# But wait, `start_multi` was at line ~264 which is inside the JSX `<tbody>`! NO it's not. `CellMultiSelect` was defined BEFORE `return (`!
# Wait, let's look at `scratch/restored_page.txt` or `rebuild_page.py`. `CellMultiSelect` was defined INSIDE `RegisterDesignPage` just before `return (`.
# If I deleted it from there and put it BEFORE `export default`, that's fine!
# Why did `cat` show `</DashboardLayout> ); } export default function RegisterDesignPage() {`?
# BECAUSE `export_idx` was the FIRST instance of `export default function RegisterDesignPage() {`.
# Wait, why was there `</DashboardLayout> ); }` BEFORE `export default function RegisterDesignPage() {`??
# Ah! Look at `fix_react_import.py`. Did it mess up? No.
# Look at `cat` output:
# ```
# 367:     </DashboardLayout>
# 368:   );
# 369: }
# 370: 
# 371: export default function RegisterDesignPage() {
# ```
# That means `export default function RegisterDesignPage() {` is at line 371.
# What is on line 1?
# Let's write a script that just reads `rebuild_page.py` logic, applies the nested inputs logic, AND applies the external helper logic cleanly.
