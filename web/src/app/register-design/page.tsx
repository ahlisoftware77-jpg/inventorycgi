'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import DashboardLayout from '@/components/dashboard/layout';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { collection, getDocs, doc, setDoc, deleteDoc, updateDoc, query, orderBy, serverTimestamp, where, addDoc } from 'firebase/firestore';
import { Trash2, Plus, Save, Layers, CheckSquare, Search, ChevronDown, Check, Eye, X, Pencil, Share2, ChevronUp, BarChart2, Download, Upload, FileSpreadsheet, Lock, Unlock } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription, DialogClose } from '@/components/ui/dialog';

export interface RegisterDesignItem {
  id: string;
  darNo: string;
  entryDate: string;
  customer: string;
  itemName: string;
  designer: string;
  technician: string;
  status: string;
  designImage?: string;
  designImageName?: string;
  designImageSize?: string;
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
  guPtv: string;
  guPtv2?: string;
  guPtv3?: string;
  guPtv4?: string;
  guPtv5?: string;
  guPtv6?: string;
  guPtvChecks?: string;
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
  benefitText?: string;
  createdAt?: any;
  updatedAt?: any;
  createdBy?: string;
  isLocked?: boolean;
}


  // Advanced Spec Dropdown with inline inputs
  
// Handle navigation between table cells using arrow keys
export const handleCellNavigation = (
  e: React.KeyboardEvent<HTMLElement>, 
  enterEditMode?: () => void, 
  clearText?: () => void
) => {
  const target = e.currentTarget as HTMLElement;
  const currentTd = target.closest('td');
  const currentTr = target.closest('tr');
  if (!currentTd || !currentTr) return;
  
  const tdIndex = Array.from(currentTr.children).indexOf(currentTd);

  // F2 or Enter to Edit
  if (e.key === 'F2' || e.key === 'Enter') {
    e.preventDefault();
    if (enterEditMode) enterEditMode();
    return;
  }
  
  // Delete or Backspace to Clear
  if (e.key === 'Delete' || e.key === 'Backspace') {
    e.preventDefault();
    if (clearText) clearText();
    return;
  }
  
  let focusTarget: HTMLElement | null = null;

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    const prevTr = currentTr.previousElementSibling;
    if (prevTr) {
      const targetTd = prevTr.children[tdIndex];
      focusTarget = targetTd?.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowDown') {
    e.preventDefault();
    const nextTr = currentTr.nextElementSibling;
    if (nextTr) {
      const targetTd = nextTr.children[tdIndex];
      focusTarget = targetTd?.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowLeft') {
    e.preventDefault();
    let prevTd = currentTd.previousElementSibling;
    while(prevTd && !prevTd.querySelector('[tabindex="0"]')) {
       prevTd = prevTd.previousElementSibling;
    }
    if (prevTd) {
      focusTarget = prevTd.querySelector('[tabindex="0"]') as HTMLElement;
    }
  } else if (e.key === 'ArrowRight') {
    e.preventDefault();
    let nextTd = currentTd.nextElementSibling;
    while(nextTd && !nextTd.querySelector('[tabindex="0"]')) {
       nextTd = nextTd.nextElementSibling;
    }
    if (nextTd) {
      focusTarget = nextTd.querySelector('[tabindex="0"]') as HTMLElement;
    }
  }

  if (focusTarget) {
    focusTarget.focus();
  }
};

const handleCellKeyDown = handleCellNavigation; // Keep old name for compatibility where used directly


const CellImageUpload = ({ 
  row, 
  handleUpdateCell 
}: { 
  row: RegisterDesignItem, 
  handleUpdateCell: (id: string, field: keyof RegisterDesignItem, value: any) => void 
}) => {
  const [isUploading, setIsUploading] = useState(false);
  const [localPreviewUrl, setLocalPreviewUrl] = useState<string | null>(null);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };
  const { toast } = useToast();
  const [isHiddenByEscape, setIsHiddenByEscape] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsHiddenByEscape(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleMouseLeave = () => {
    setIsHiddenByEscape(false);
  };

  

  const getUploadApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return 'https://inventorycgi.vercel.app/api/upload-drive';
    }
    return '/api/upload-drive';
  };

  
  const handleDeleteImage = async (e: React.MouseEvent) => {
    e.preventDefault();
    if (!row.designImage) return;
    
    if (!confirm('Apakah Anda yakin ingin menghapus gambar ini dari sistem dan Google Drive?')) return;
    
    setIsUploading(true);
    try {
      const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
        ? 'https://inventorycgi.vercel.app/api/delete-drive' 
        : '/api/delete-drive';
        
      const res = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileId: row.designImage }),
      });
      
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Gagal menghapus file dari Google Drive');
      }
      
      handleUpdateCell(row.id, 'designImage', '');
      handleUpdateCell(row.id, 'designImageName', '');
      setLocalPreviewUrl(null);
      toast({ title: 'Terhapus', description: 'Gambar berhasil dihapus dari Google Drive.' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: err.message });
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    setIsUploading(true);
    setLocalPreviewUrl(URL.createObjectURL(file));
    toast({ title: 'Mempersiapkan Upload...', description: 'Membuka jalur langsung ke Google Drive.' });
    
    try {
      // 1. Minta tiket resumable upload dari Vercel
      const initRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'init', fileName: file.name, mimeType: file.type }),
      });
      
      const initData = await initRes.json();
      if (!initRes.ok) throw new Error(initData.error || 'Gagal memulai upload');
      const uploadUrl = initData.uploadUrl;

      toast({ title: 'Mengunggah File...', description: 'Mengirim file langsung ke Google Drive tanpa batas ukuran.' });

      // 2. Upload file langsung ke URL Google dari browser (Bypass Vercel)
      const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });

      if (!uploadRes.ok) throw new Error('Proses unggah ke Google gagal');
      const uploadedFile = await uploadRes.json();
      const fileId = uploadedFile.id;
      if (!fileId) throw new Error('Tidak mendapatkan ID file dari Google Drive');

      // 3. Beritahu Vercel untuk mengatur file menjadi publik (anyone with link)
      const finishRes = await fetch(getUploadApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'finish', fileId: fileId }),
      });
      
      if (!finishRes.ok) {
        const errData = await finishRes.json();
        throw new Error('Gagal mengatur privasi file: ' + (errData.error || finishRes.statusText));
      }

      handleUpdateCell(row.id, 'designImage', fileId);
      handleUpdateCell(row.id, 'designImageName', file.name);
      handleUpdateCell(row.id, 'designImageSize', formatFileSize(file.size));
      toast({ title: 'Upload Berhasil', description: 'File gambar besar berhasil disimpan langsung ke Google Drive.' });
    } catch (err: any) {
      setLocalPreviewUrl(null);
      toast({ variant: 'destructive', title: 'Upload Gagal', description: err.message });
    } finally {
      setIsUploading(false);
      e.target.value = '';
    }
  };

  if (row.designImage) {
    const imgUrl = localPreviewUrl || `https://drive.google.com/thumbnail?id=${row.designImage}&sz=s1000`;
    const viewUrl = `https://drive.google.com/file/d/${row.designImage}/view`;
    return (
      <div className="relative group flex items-center justify-center w-full h-full" onMouseLeave={handleMouseLeave}>
        <a href={viewUrl} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline flex items-center gap-1">
          <Eye className="w-3 h-3" />
          <span className="text-[10px]">Lihat</span>
        </a>
        
        {/* Hover Preview Box */}
        <div className={`absolute ${isHiddenByEscape ? "hidden" : "hidden group-hover:block"} top-full left-1/2 -translate-x-1/2 mt-2 z-50 bg-white p-3 rounded-xl shadow-2xl border border-slate-200`}>
          {row.designImageName && (
            <div className="text-xs font-bold text-slate-900 bg-slate-200 py-1.5 px-3 mb-2 w-full max-w-[256px] text-center rounded-md border border-slate-300 shadow-sm whitespace-normal break-words leading-tight">
              {row.designImageName}
            </div>
          )}
          <div className="relative w-48 h-48 sm:w-64 sm:h-64 rounded-lg overflow-hidden flex items-center justify-center bg-slate-100">
             <img 
               src={imgUrl} 
               alt="Preview" 
               className="w-full h-full object-contain"
               onError={(e) => { e.currentTarget.src = 'https://via.placeholder.com/400x400.png?text=Proses+Google+Drive...'; }}
             />
          </div>

          <div className="mt-3 text-[10px] sm:text-xs bg-slate-50 p-2 rounded-lg border border-slate-200 shadow-inner w-full space-y-1.5 text-slate-700 font-medium">
            <div className="flex justify-between items-center gap-2">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Desainer</span> 
              <span className="truncate max-w-[120px] sm:max-w-[150px]">{row.designer || '-'}</span>
            </div>
            <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Teknisi</span> 
              <span className="truncate max-w-[120px] sm:max-w-[150px]">{row.technician || '-'}</span>
            </div>
            <div className="flex justify-between items-start gap-2 border-t border-slate-100 pt-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px] mt-0.5">Spesifikasi</span> 
              <span className="text-right whitespace-normal break-words leading-tight max-w-[120px] sm:max-w-[160px]">
                {[row.typeDesign, row.sizeChecks, row.surfaceChecks].filter(Boolean).join(' | ') || '-'}
              </span>
            </div>
            {row.designImageSize && (
              <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5 pb-0.5">
                <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Ukuran File</span>
                <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-100">{row.designImageSize}</span>
              </div>
            )}
            <div className="flex justify-between items-center gap-2 border-t border-slate-100 pt-1.5 pb-0.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[8px] sm:text-[9px]">Status</span>
              <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase shadow-sm border ${
                row.status === 'IN LOCK' ? 'bg-rose-500 text-white border-rose-600' :
                row.status === 'IN USE' ? 'bg-emerald-500 text-white border-emerald-600' :
                row.status === 'FREE' ? 'bg-blue-500 text-white border-blue-600' :
                row.status === 'ARCHIVE' ? 'bg-sky-400 text-white border-sky-500' :
                'bg-slate-100 text-slate-600 border-slate-200'
              }`}>{row.status || '-'}</span>
            </div>
          </div>
          <button onClick={handleDeleteImage} disabled={isUploading} className={`absolute top-0 right-0 text-white rounded-full p-1 -mt-2 -mr-2 shadow-sm ${isUploading ? 'bg-slate-400 cursor-not-allowed' : 'bg-red-500 hover:bg-red-600'}`}>
             <X className="w-3 h-3" />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex items-center justify-center w-full h-full">
      {isUploading ? (
        <span className="text-[10px] text-slate-500 animate-pulse">Uploading...</span>
      ) : (
        <>
          <input type="file" accept="image/*" onChange={handleFileChange} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Upload Gambar" />
          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 rounded-full bg-slate-100 hover:bg-slate-200 pointer-events-none">
            <Upload className="w-3 h-3 text-slate-500" />
          </Button>
        </>
      )}
    </div>
  );
};

const CellMultiSelect = ({ 
    row, field, options, customOptions = [], width = "w-32", handleUpdateCell 
  }: { 
    row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], 
    customOptions?: { label: string, fields: { key: keyof RegisterDesignItem, placeholder: string, width?: string }[], separator?: string }[],
    width?: string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void 
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

    if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={displayVal}>{displayVal || "-"}</div>;
    }

    return (
      <Popover open={isOpen} onOpenChange={setIsOpen}>
        <PopoverTrigger asChild>
          <div onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} tabIndex={0} onKeyDown={(e) => handleCellNavigation(e, () => setIsOpen(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 border border-transparent hover:border-slate-300 rounded p-1 text-[11px] cursor-pointer flex justify-between items-center bg-transparent truncate ${width}`} title={displayVal}>
            <span className="truncate">{displayVal || "--"}</span>
            <ChevronDown className="w-3 h-3 text-slate-400 shrink-0 ml-1" />
          </div>
        </PopoverTrigger>
        <PopoverContent className="w-72 p-2 z-[9999]" align="start">
          <div className="flex flex-col gap-1 max-h-64 overflow-y-auto">
            {options.map(opt => (
              <label key={opt} className="flex items-center gap-2 p-1 hover:bg-slate-50 rounded cursor-pointer text-xs">
                <input type="checkbox" checked={selected.includes(opt)} onChange={() => toggleOption(opt)} className="w-3 h-3 cursor-pointer accent-red-600" />
                <span className="text-slate-700">{opt}</span>
              </label>
            ))}
            {customOptions.map(co => {
              const isChecked = selected.includes(co.label);
              return (
                <div key={co.label} className="flex flex-col gap-1 p-1 hover:bg-slate-50 rounded">
                  <label className="flex items-center gap-2 cursor-pointer text-xs">
                    <input type="checkbox" checked={isChecked} onChange={() => toggleOption(co.label)} className="w-3 h-3 cursor-pointer accent-red-600" />
                    <span className="text-slate-700">{co.label}</span>
                  </label>
                  {isChecked && (
                    <div className="flex items-center gap-1 pl-5 mt-1 flex-wrap">
                      {co.fields.map((f, i) => (
                        <React.Fragment key={f.key}>
                          {i > 0 && co.separator && <span className="text-xs text-slate-400">{co.separator}</span>}
                          <input type="text" placeholder={f.placeholder} value={(row[f.key] as string) || ""} onChange={(e) => handleUpdateCell(row.id, f.key, e.target.value)} className={`border border-slate-300 rounded px-1.5 py-0.5 text-xs outline-none focus:border-blue-500 ${f.width || "w-16"}`} />
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

  const CellInput = ({ row, field, list, options, width = "w-32", type = "text", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, list?: string, options?: string[], width?: string, type?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [highlightedIndex, setHighlightedIndex] = useState<number>(-1);
    const val = row[field] as string || "";

    if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }

    if (!isEditing) {
      return <div tabIndex={0} onDoubleClick={() => setIsEditing(true)} onKeyDown={(e) => handleCellNavigation(e, () => setIsEditing(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{type === 'date' && val ? val : val || "-"}</div>;
    }

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (options && options.length > 0) {
        if (e.key === 'ArrowDown') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev < options.length - 1 ? prev + 1 : prev));
          return;
        }
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          setHighlightedIndex(prev => (prev > 0 ? prev - 1 : prev));
          return;
        }
        if (e.key === 'Enter') {
          e.preventDefault();
          if (highlightedIndex >= 0 && highlightedIndex < options.length) {
            handleUpdateCell(row.id, field, options[highlightedIndex]);
          }
          setIsEditing(false);
          return;
        }
        if (e.key === 'Escape') {
          e.preventDefault();
          setIsEditing(false);
          return;
        }
      }
      
      if (e.key === 'Enter') {
        setIsEditing(false);
      }
      handleCellKeyDown(e);
    };

    return (
      <div className={`relative w-full ${width}`}>
        <input 
          autoFocus 
          onBlur={() => setTimeout(() => setIsEditing(false), 200)} 
          type={type} 
          list={list} 
          value={val} 
          onChange={(e) => {
            handleUpdateCell(row.id, field, e.target.value);
            setHighlightedIndex(-1);
          }} 
          onKeyDown={handleKeyDown} 
          className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none bg-white pr-6 ${type === 'date' ? 'uppercase' : ''}`} 
          placeholder="-" 
        />
        {val && (
          <button onMouseDown={(e) => { e.preventDefault(); handleUpdateCell(row.id, field, ""); }} className="absolute right-1 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors z-10" title="Hapus">
            <X className="w-3 h-3" />
          </button>
        )}
        
        {options && options.length > 0 && (
          <div className="absolute left-0 top-full mt-1 w-max min-w-[120px] max-w-[200px] max-h-48 overflow-y-auto bg-white border border-slate-200 rounded-md shadow-lg z-[9999] py-1">
            {options.map((opt, idx) => (
              <div 
                key={opt}
                onMouseDown={(e) => { 
                  e.preventDefault(); 
                  handleUpdateCell(row.id, field, opt); 
                  setIsEditing(false); 
                }}
                className={`px-3 py-1.5 text-[11px] cursor-pointer truncate transition-colors ${idx === highlightedIndex ? 'bg-blue-600 text-white font-medium' : 'text-slate-700 hover:bg-blue-50'}`}
                title={opt}
              >
                {opt}
              </div>
            ))}
          </div>
        )}
      </div>
    );
  };

  const CellSelect = ({ row, field, options, width = "w-32", colorFn, handleUpdateCell }: { row: RegisterDesignItem, field: keyof RegisterDesignItem, options: string[], width?: string, colorFn?: (v: string) => string, handleUpdateCell: (id: string, field: keyof RegisterDesignItem, val: string) => void }) => {
    const [isEditing, setIsEditing] = useState(false);
    const val = row[field] as string || "";

    if (row.isLocked) {
      return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className={`focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 w-full px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50 ${width}`} title={val}>{val || "-"}</div>;
    }

    if (!isEditing) {
      return <div tabIndex={0} onDoubleClick={() => setIsEditing(true)} onKeyDown={(e) => handleCellNavigation(e, () => setIsEditing(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} className={`w-full px-1.5 py-1 text-[11px] truncate cursor-pointer hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 ${colorFn ? colorFn(val) : ''} ${width}`} title={val}>{val || "-"}</div>;
    }

    return (
      <div className={`relative w-full ${width}`}>
        <select autoFocus onBlur={() => setIsEditing(false)} value={val} onChange={(e) => { handleUpdateCell(row.id, field, e.target.value); setIsEditing(false); }} onKeyDown={(e) => { if(e.key === 'Enter') setIsEditing(false); handleCellKeyDown(e); }} className={`w-full border border-blue-500 rounded p-1 text-[11px] outline-none cursor-pointer bg-white pr-6`}>
          <option value="">-</option>
          {options.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
        {val && (
          <button onMouseDown={(e) => { e.preventDefault(); handleUpdateCell(row.id, field, ""); }} className="absolute right-5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded text-slate-400 hover:text-red-500 transition-colors z-10" title="Hapus">
            <X className="w-3 h-3" />
          </button>
        )}
      </div>
    );
  };

const CellGridInput = ({ row, field, title, rowsCount, handleUpdateCell }: { row: any, field: string, title: string, rowsCount: number, handleUpdateCell: (id: string, field: string, value: any) => void }) => {
  const parseRows = (val: string) => {
    try {
      const parsed = JSON.parse(val || "[]");
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      return [];
    }
  };
  
  const [rows, setRows] = useState<{c1: string, c2: string}[]>(() => {
    const p = parseRows(row[field]);
    while(p.length < rowsCount) p.push({c1:"", c2:""});
    return p;
  });

  useEffect(() => {
    const p = parseRows(row[field]);
    while(p.length < rowsCount) p.push({c1:"", c2:""});
    setRows(p);
  }, [row[field], rowsCount]);

  const updateRow = (i: number, key: 'c1' | 'c2', val: string) => {
    const newRows = [...rows];
    newRows[i][key] = val;
    setRows(newRows);
    handleUpdateCell(row.id, field, JSON.stringify(newRows));
  };

  const [isOpen, setIsOpen] = useState(false);

  if (row.isLocked) {
    return <div tabIndex={0} onKeyDown={(e) => handleCellNavigation(e)} className="focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 w-24 px-1.5 py-1 text-[11px] truncate text-slate-500 bg-slate-50/50">{title}</div>;
  }

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button tabIndex={0} onKeyDown={(e) => handleCellNavigation(e, () => setIsOpen(true), () => { if(!row.isLocked) handleUpdateCell(row.id, field, ""); })} onDoubleClick={() => setIsOpen(true)} onClick={(e) => e.preventDefault()} variant="ghost" size="sm" className="focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-600 focus:bg-blue-100 w-24 justify-between text-[10px] h-6 px-2 border border-transparent hover:border-blue-200">
           {title} <ChevronDown className="w-3 h-3 ml-1" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-3 z-50">
        <h4 className="font-bold text-xs mb-2 text-slate-800">{title}</h4>
        <div className="space-y-1">
          {rows.map((r, i) => (
             <div key={i} className="flex gap-2">
               <Input className="text-[10px] h-6 w-1/3" value={r.c1} onChange={e => updateRow(i, 'c1', e.target.value)} placeholder="Val 1" />
               <Input className="text-[10px] h-6 w-2/3" value={r.c2} onChange={e => updateRow(i, 'c2', e.target.value)} placeholder="Val 2" />
             </div>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}


async function hashString(str: string) {
  const msgBuffer = new TextEncoder().encode(str);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export default function RegisterDesignPage() {
  const { user, loading: loadingUser } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  const [data, setData] = useState<RegisterDesignItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [isShareDashboardOpen, setIsShareDashboardOpen] = useState(false);
  const [dashboardPasscode, setDashboardPasscode] = useState("123456");

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  useEffect(() => {
    if (!loadingUser && user) {
      if (user.role !== 'Admin' && !user.permissions?.canAccessRegisterDesign) {
        toast({ title: "Akses Ditolak", description: "Anda tidak memiliki izin untuk mengakses Register Design", variant: "destructive" });
        router.push('/');
      }
    }
  }, [user, loadingUser, router, toast]);


  const handleMouseDown = (e: React.MouseEvent) => {
    if (!scrollContainerRef.current) return;
    // Don't start drag if clicking on an input or button
    const target = e.target as HTMLElement;
    if (target.tagName.toLowerCase() === 'input' || target.tagName.toLowerCase() === 'select' || target.tagName.toLowerCase() === 'button' || target.closest('button')) {
      return;
    }
    setIsDragging(true);
    setStartX(e.pageX - scrollContainerRef.current.offsetLeft);
    setScrollLeft(scrollContainerRef.current.scrollLeft);
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !scrollContainerRef.current) return;
    e.preventDefault();
    const x = e.pageX - scrollContainerRef.current.offsetLeft;
    const walk = (x - startX) * 1.5;
    scrollContainerRef.current.scrollLeft = scrollLeft - walk;
  };

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  const [previewDarNo, setPreviewDarNo] = useState<string | null>(null);
  const [signDarNo, setSignDarNo] = useState<string | null>(null);
  const [signId, setSignId] = useState<string | null>(null);
  
  // Datalist options (same as form-app)
  const [typeDesignOptions, setTypeDesignOptions] = useState<string[]>(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
  const [designSourceOptions, setDesignSourceOptions] = useState<string[]>(["MidJourney", "Shutterstock", "Create"]);
  const [designerOptions, setDesignerOptions] = useState<string[]>(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
  const [technicianOptions, setTechnicianOptions] = useState<string[]>(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
  const [customerOptions, setCustomerOptions] = useState<string[]>([]);
  
  const baseTypeOptions = ["Picture", "Emboss", "Rubber", "File Image Digital", "Finish tile"];
  const baseSizeOptions = ["Large size", "Cut 1:1", "jpg file"];
  const sizeCustomOptions = [
    { label: "Faces", fields: [{ key: "sizeFaces" as const, placeholder: "val", width: "w-12" }] },
    { label: "Custom cm", fields: [{ key: "sizeCm1" as const, placeholder: "cm", width: "w-10" }, { key: "sizeCm2" as const, placeholder: "cm", width: "w-10" }], separator: "x" }
  ];
  const baseGlazeOptions = ["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"];
  const glazeCustomOptions = [
    { label: "Residue (Input)", fields: [{ key: "glazeResidue" as const, placeholder: "val" }] }
  ];
  const baseSurfaceOptions = ["Matt", "Glossy", "Satin", "Polished", "Anti Slip"];
  const surfaceCustomOptions = [
    { label: "Temp (Input)", fields: [{ key: "surfaceTemp" as const, placeholder: "val" }] }
  ];
  const baseGuPtvOptions: string[] = [];
  const guPtvCustomOptions = [
    { label: "Checkbox", fields: [
        { key: "guPtv" as const, placeholder: "c1", width: "w-10" },
        { key: "guPtv2" as const, placeholder: "c2", width: "w-10" },
        { key: "guPtv3" as const, placeholder: "c3", width: "w-10" },
        { key: "guPtv4" as const, placeholder: "c4", width: "w-10" },
        { key: "guPtv5" as const, placeholder: "c5", width: "w-10" },
        { key: "guPtv6" as const, placeholder: "c6", width: "w-10" }
    ]}
  ];
  const baseInkOptions = ["Impression", "Transparent", "SIngking", "Antislip", "Glue"];
  const inkCustomOptions = [
    { label: "Checkbox (Input)", fields: [{ key: "inkOther" as const, placeholder: "val" }] }
  ];
  const baseSendByOptions = ["USB", "Wetransfer", "CD", "On Glazing Line"];
  const baseTujuanOptions = ["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"];

  // Grouping
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [isGroupDialogOpen, setIsGroupDialogOpen] = useState(false);
  const [targetDarNo, setTargetDarNo] = useState("");

  const fetchData = async () => {
    try {
      const q = query(collection(db, "register_design"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const items = snap.docs.map(d => ({ id: d.id, ...d.data() } as RegisterDesignItem));
      setData(items);
      
      // Update datalists dynamically
      const typeSet = new Set(["CG", "CGI", "CGI-A", "ST", "CGL", "CO"]);
      const srcSet = new Set(["MidJourney", "Shutterstock", "Create"]);
      const desSet = new Set(["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"]);
      const techSet = new Set(["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"]);
      const custSet = new Set<string>();
      
      items.forEach(i => {
        if (i.typeDesign) typeSet.add(i.typeDesign);
        if (i.designSource) srcSet.add(i.designSource);
        if (i.designer) desSet.add(i.designer);
        if (i.technician) techSet.add(i.technician);
        if (i.customer) custSet.add(i.customer);
      });
      
      setTypeDesignOptions(Array.from(typeSet).sort());
      setDesignSourceOptions(Array.from(srcSet).sort());
      setDesignerOptions(Array.from(desSet).sort());
      setTechnicianOptions(Array.from(techSet).sort());
      setCustomerOptions(Array.from(custSet).sort());

    } catch (e) {
      console.error(e);
      toast({ title: "Gagal memuat data", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleOpenSign = async (darNo: string) => {
    try {
      const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
      const snap = await getDocs(q);
      if (!snap.empty) {
        setSignId(snap.docs[0].id);
        setSignDarNo(darNo);
      } else {
        toast({ 
          title: "Gagal Membuka Tanda Tangan", 
          description: "Form DAR ini belum dibuat/disimpan di database. Silakan klik Preview Form DAR lalu Simpan terlebih dahulu di halaman Form App.", 
          variant: "destructive" 
        });
      }
    } catch(e) {
      console.error(e);
      toast({ title: "Error", description: "Gagal memeriksa form DAR.", variant: "destructive" });
    }
  };

  const [isSharing, setIsSharing] = useState(false);
  const handleSharePublicLink = async (darNo: string) => {
    setIsSharing(true);
    try {
      const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
      const snap = await getDocs(q);
      if (snap.empty) {
        toast({ title: "Gagal", description: "Form DAR ini belum dibuat/disimpan di database.", variant: "destructive" });
        setIsSharing(false);
        return;
      }
      const targetId = snap.docs[0].id;
      const publicUrl = `${window.location.origin}/public/form-dar?id=${targetId}`;
      if (navigator.share) {
        try {
          await navigator.share({
            title: `Form DAR #${darNo}`,
            text: `Mohon isi tanda tangan pada Form DAR #${darNo}`,
            url: publicUrl,
          });
        } catch (err: any) {
          if (err.name !== 'AbortError') {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: "Tersalin", description: "Link disalin ke clipboard karena share dialog gagal." });
          }
        }
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast({ title: "Tersalin", description: "Link disalin ke clipboard." });
      }
    } catch(e) {
      console.error(e);
      toast({ title: "Error", description: "Gagal membagikan link.", variant: "destructive" });
    }
    setIsSharing(false);
  };

  const logAction = async (action: string, description: string) => {
    if (!user) return;
    try {
      await addDoc(collection(db, 'system_logs'), {
        action,
        description,
        userName: user.name || user.email || 'System',
        timestamp: serverTimestamp(),
      });
    } catch (e) {
      console.error("Gagal mencatat log", e);
    }
  };

  const handleAddRow = useCallback(async () => {
    const newItem: Partial<RegisterDesignItem> = {
      darNo: "", entryDate: new Date().toISOString().split('T')[0], customer: "", itemName: "", designer: "", technician: "",
      status: "FREE", designImage: "", typeDesign: "", designSource: "", designNo: "", requiredDate: "", closingDate: "", type: "",
      sizeChecks: "", sizeFaces: "", sizeCm1: "", sizeCm2: "", glazeChecks: "", glazeResidue: "", surfaceChecks: "",
      surfaceTemp: "", guPtv: "", inkChecks: "", inkOther: "", sendBy: "", benefit: "", lastTimeReq: "",
      feedback: "", feedbackDetails: "", lastDesignSupp: "", note2: "", generalNote: "",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      createdBy: user?.name || user?.email || 'System',
      isLocked: false
    };
    try {
      const newRef = doc(collection(db, "register_design"));
      await setDoc(newRef, newItem);
      setData(prev => [{ id: newRef.id, ...newItem } as RegisterDesignItem, ...prev]);
      logAction('CREATE_DESIGN_ROW', `Membuat baris desain baru (ID: ${newRef.id})`);
      toast({ title: "Baris baru ditambahkan" });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menambah baris", variant: "destructive" });
    }
  }, [toast, user]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'F8') {
        e.preventDefault();
        handleAddRow();
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown);
  }, [handleAddRow]);

  const handleDeleteRow = async (id: string) => {
    if (!confirm("Hapus baris ini secara permanen?")) return;
    
    const currentRow = data.find(d => d.id === id);
    if (!currentRow) return;

    try {
      if (currentRow.designImage) {
        const apiUrl = typeof window !== 'undefined' && window.location.hostname !== 'localhost' 
          ? 'https://inventorycgi.vercel.app/api/delete-drive' 
          : '/api/delete-drive';
          
        await fetch(apiUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fileId: currentRow.designImage }),
        }).catch(err => console.error("Gagal menghapus gambar di drive:", err));
      }

      await deleteDoc(doc(db, "register_design", id));
      setData(data.filter(d => d.id !== id));
      const newSel = new Set(selectedIds);
      newSel.delete(id);
      setSelectedIds(newSel);

      if (currentRow.darNo) {
        const qDar = query(collection(db, "form_dar"), where("darNo", "==", currentRow.darNo));
        const snapDar = await getDocs(qDar);
        if (!snapDar.empty) {
          const updatedItemsArr = data
            .filter(d => d.darNo === currentRow.darNo && d.id !== id)
            .map(d => d.itemName)
            .filter(Boolean);
            
          await updateDoc(doc(db, "form_dar", snapDar.docs[0].id), { items: updatedItemsArr });
        }
      }
      
      logAction('DELETE_DESIGN_ROW', `Menghapus baris desain (Design No: ${currentRow.designNo || '-'}, Item: ${currentRow.itemName || '-'})`);
      toast({ title: "Baris dihapus" });
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menghapus", variant: "destructive" });
    }
  };

  const handleUpdateCell = async (id: string, field: keyof RegisterDesignItem, value: string) => {
    let updatePayload: any = { [field]: value, updatedAt: serverTimestamp() };
    let generatedDesignNo: string | undefined = undefined;
    
    const currentRow = data.find(d => d.id === id);

    if (field === "designNo" && value.trim() !== "") {
      if ((window as any).designNoTimeout) clearTimeout((window as any).designNoTimeout);
      (window as any).designNoTimeout = setTimeout(() => {
        const existingDuplicate = data.find(d => d.id !== id && d.designNo === value.trim());
        if (existingDuplicate) {
          let maxNo = 0;
          data.forEach(d => {
            const num = parseInt(d.designNo || "0", 10);
            if (!isNaN(num) && num > maxNo) {
              maxNo = num;
            }
          });
          const suggestion = (maxNo + 1).toString();
          toast({ 
            title: "Nomor Desain Duplikat!", 
            description: `Nomor ${value} sudah digunakan pada desain dengan status: ${existingDuplicate.status || 'Tidak ada status'}. Sugesti nomor selanjutnya: ${suggestion}`, 
            variant: "destructive" 
          });
        }
      }, 1500);
    } else if (field === "designNo" && value.trim() === "") {
      if ((window as any).designNoTimeout) clearTimeout((window as any).designNoTimeout);
    }

    if (field === "designer" && value.trim() !== "" && !currentRow?.designNo) {
      let maxNo = 0;
      data.forEach(d => {
        const num = parseInt(d.designNo || "0", 10);
        if (!isNaN(num) && num > maxNo) {
          maxNo = num;
        }
      });
      generatedDesignNo = (maxNo + 1).toString();
      updatePayload.designNo = generatedDesignNo;
    }

    if (field === "typeDesign" && currentRow?.typeDesign && currentRow.typeDesign !== value && currentRow?.designNo) {
      toast({
        title: "Perubahan Ditolak",
        description: "Tipe desain tidak bisa diubah karena sudah memiliki nomor urut. Silakan hapus baris ini dan buat baris baru.",
        variant: "destructive"
      });
      return;
    }

    if (field === "typeDesign" && value.trim() !== "") {
      let maxNo = 0;
      data.forEach(d => {
        if (d.typeDesign === value && d.id !== id) {
          const num = parseInt(d.designNo || "0", 10);
          if (!isNaN(num) && num > maxNo) {
            maxNo = num;
          }
        }
      });
      generatedDesignNo = (maxNo + 1).toString();
      updatePayload.designNo = generatedDesignNo;
    }

    const infoAndNoteFields = ["benefit", "generalNote", "note2", "lastTimeReq", "benefitText", "feedbackDetails", "lastDesignSupp", "requiredDate", "closingDate"];
    const shouldSync = currentRow?.darNo && infoAndNoteFields.includes(field);

    // Update local state immediately
    setData(prev => prev.map(d => {
      if (d.id === id) {
        const updated = { ...d, [field]: value };
        if (generatedDesignNo) updated.designNo = generatedDesignNo;
        return updated;
      }
      if (shouldSync && d.darNo === currentRow.darNo) {
        return { ...d, [field]: value };
      }
      return d;
    }));
    
    // Update Firebase
    try {
      const promises = [updateDoc(doc(db, "register_design", id), updatePayload)];
      
      if (shouldSync) {
        data.forEach(d => {
          if (d.id !== id && d.darNo === currentRow.darNo) {
            promises.push(updateDoc(doc(db, "register_design", d.id), { [field]: value, updatedAt: serverTimestamp() }));
          }
        });
        
        // Update form_dar if exists so it's instantly available in Form App
        const qDar = query(collection(db, "form_dar"), where("darNo", "==", currentRow.darNo));
        const snapDar = await getDocs(qDar);
        if (!snapDar.empty) {
          const formField = field === 'benefit' ? 'purpose' : field === 'feedbackDetails' ? 'feedbackRows' : field === 'note2' ? 'note2Rows' : field === 'benefitText' ? 'benefit' : field;
          
          let parsedValue: any = value;
          if (['feedbackDetails', 'note2', 'lastDesignSupp'].includes(field)) {
             try { parsedValue = JSON.parse(value || "[]"); if(!Array.isArray(parsedValue)) parsedValue = []; } catch(e) { parsedValue = []; }
          }
          if (field === 'benefit') {
             parsedValue = typeof value === 'string' ? value.split(',').map(x=>x.trim()).filter(Boolean) : [];
          }
          
          promises.push(updateDoc(doc(db, "form_dar", snapDar.docs[0].id), {
            [formField]: parsedValue,
            updatedAt: serverTimestamp()
          }));
        }
      }

      if (field === 'itemName' && currentRow?.darNo) {
        const qDar = query(collection(db, "form_dar"), where("darNo", "==", currentRow.darNo));
        const snapDar = await getDocs(qDar);
        if (!snapDar.empty) {
          // Rebuild the items array from local data (incorporating the current change)
          const updatedItemsArr = data
            .filter(d => d.darNo === currentRow.darNo)
            .map(d => d.id === id ? value : d.itemName)
            .filter(Boolean);
            
          promises.push(updateDoc(doc(db, "form_dar", snapDar.docs[0].id), { items: updatedItemsArr }));
        }
      }
      
      await Promise.all(promises);
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menyimpan perubahan", variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    const newSel = new Set(selectedIds);
    if (newSel.has(id)) newSel.delete(id);
    else newSel.add(id);
    setSelectedIds(newSel);
  };

  const handleOpenGroupDialog = () => {
    let maxNum = 0;
    const currentYearStr = new Date().getFullYear().toString().slice(-2);
    const prefix = `${currentYearStr}-`;
    
    data.forEach(d => {
      if (d.darNo && d.darNo.includes(prefix)) {
        const numPart = d.darNo.split(prefix)[1];
        if (numPart) {
          const num = parseInt(numPart, 10);
          if (!isNaN(num) && num > maxNum) {
            maxNum = num;
          }
        }
      }
    });
    
    const nextNum = (maxNum + 1).toString().padStart(3, '0');
    setTargetDarNo(`${prefix}${nextNum}`);
    setIsGroupDialogOpen(true);
  };

  const handleGroupToDar = async () => {
    if (selectedIds.size === 0) {
      toast({ title: "Pilih minimal 1 desain", variant: "destructive" });
      return;
    }
    if (!targetDarNo) {
      toast({ title: "Nomor DAR harus diisi", variant: "destructive" });
      return;
    }

    const selectedItems = sortedAndFilteredData.filter(d => selectedIds.has(d.id));
    const existingDarItems = data.filter(d => d.darNo === targetDarNo && !selectedIds.has(d.id));
    const itemsToValidate = [...selectedItems, ...existingDarItems];
    
    // VALIDATION: Check if specifications are identical
    const specFields: (keyof RegisterDesignItem)[] = [
      'customer', 'designer', 'technician', 'typeDesign', 'designSource', 'type',
      'sizeChecks', 'sizeFaces', 'sizeCm1', 'sizeCm2', 'glazeChecks', 'glazeResidue', 'surfaceChecks',
      'surfaceTemp', 'guPtvChecks', 'guPtv', 'guPtv2', 'guPtv3', 'guPtv4', 'guPtv5', 'guPtv6', 'inkChecks', 'inkOther', 'sendBy', 'benefit'
    ];

    const deps: Record<string, { parent: keyof RegisterDesignItem, keyword: string }> = {
      sizeFaces: { parent: 'sizeChecks', keyword: 'Faces' },
      sizeCm1: { parent: 'sizeChecks', keyword: 'Custom cm' },
      sizeCm2: { parent: 'sizeChecks', keyword: 'Custom cm' },
      glazeResidue: { parent: 'glazeChecks', keyword: 'Residue (Input)' },
      surfaceTemp: { parent: 'surfaceChecks', keyword: 'Temp (Input)' },
      guPtv: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      guPtv2: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      guPtv3: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      guPtv4: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      guPtv5: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      guPtv6: { parent: 'guPtvChecks', keyword: 'Checkbox' },
      inkOther: { parent: 'inkChecks', keyword: 'Checkbox (Input)' }
    };

    let isIdentical = true;
    let diffField = "";
    
    const firstItem = itemsToValidate[0];
    for (const item of itemsToValidate) {
      for (const field of specFields) {
        let val1 = (item[field] as string) || "";
        let val2 = (firstItem[field] as string) || "";
        
        const dep = deps[field as string];
        if (dep) {
          const p1 = (item[dep.parent] as string || "").includes(dep.keyword);
          const p2 = (firstItem[dep.parent] as string || "").includes(dep.keyword);
          val1 = p1 ? val1 : "";
          val2 = p2 ? val2 : "";
        }

        if (val1 !== val2) {
          isIdentical = false;
          diffField = field;
          break;
        }
      }
      if (!isIdentical) break;
    }

    if (!isIdentical) {
      toast({ 
        title: "Validasi Gagal!", 
        description: `Spesifikasi tidak sama pada kolom '${diffField}'. Semua desain yang dikelompokkan ke DAR yang sama harus memiliki spesifikasi yang identik.`, 
        variant: "destructive" 
      });
      return;
    }

    // UPDATE FIREBASE
    try {
      const promises = selectedItems.map(item => 
        updateDoc(doc(db, "register_design", item.id), { darNo: targetDarNo, updatedAt: serverTimestamp() })
      );
      await Promise.all(promises);

      // Sync with form_dar so it appears in history immediately
      const qDar = query(collection(db, "form_dar"), where("darNo", "==", targetDarNo));
      const snapDar = await getDocs(qDar);
      
      const safeSplit = (s: any) => typeof s === 'string' ? s.split(',').map(x=>x.trim()).filter(Boolean) : [];
      const gchecks = [false, false, false, false, false, false];
      if (firstItem.guPtvChecks === "Checkbox") {
          if (firstItem.guPtv) gchecks[0] = true;
          if (firstItem.guPtv2) gchecks[1] = true;
          if (firstItem.guPtv3) gchecks[2] = true;
          if (firstItem.guPtv4) gchecks[3] = true;
          if (firstItem.guPtv5) gchecks[4] = true;
          if (firstItem.guPtv6) gchecks[5] = true;
      }
      
      const parseGrid = (str: any) => {
        try { const p = JSON.parse(str || "[]"); return Array.isArray(p) ? p : []; } catch(e) { return []; }
      };
      
      const formPayload = {
        darNo: targetDarNo,
        customer: firstItem.customer || "",
        designer: firstItem.designer || "",
        technician: firstItem.technician || "",
        typeDesign: firstItem.typeDesign || "",
        designSource: firstItem.designSource || "",
        designNo: firstItem.designNo || "",
        status: firstItem.status || "FREE",
        requiredDate: firstItem.requiredDate || "",
        closingDate: firstItem.closingDate || "",
        generalNote: firstItem.generalNote || "",
        type: safeSplit(firstItem.type),
        sendBy: safeSplit(firstItem.sendBy),
        purpose: safeSplit(firstItem.benefit),
        sizeChecks: safeSplit(firstItem.sizeChecks),
        glazeChecks: safeSplit(firstItem.glazeChecks),
        surfaceChecks: safeSplit(firstItem.surfaceChecks),
        inkChecks: safeSplit(firstItem.inkChecks),
        sizeFaces: firstItem.sizeFaces || "",
        sizeCm1: firstItem.sizeCm1 || "",
        sizeCm2: firstItem.sizeCm2 || "",
        glazeResidue: firstItem.glazeResidue || "",
        surfaceTemp: firstItem.surfaceTemp || "",
        inkOther: firstItem.inkOther || "",
        guPtvChecks: gchecks,
        guPtv: [firstItem.guPtv||"", firstItem.guPtv2||"", firstItem.guPtv3||"", firstItem.guPtv4||"", firstItem.guPtv5||"", firstItem.guPtv6||""],
        lastTimeReq: firstItem.lastTimeReq || "",
        feedback: firstItem.feedback || "",
        note2Rows: parseGrid(firstItem.note2),
        feedbackRows: parseGrid(firstItem.feedbackDetails),
        lastDesignSupp: parseGrid(firstItem.lastDesignSupp)
      };

      const newItems = selectedItems.map(i => i.itemName).filter(Boolean);

      if (snapDar.empty) {
        await addDoc(collection(db, "form_dar"), {
          ...formPayload,
          items: newItems,
          entryDate: firstItem.entryDate || new Date().toISOString().split('T')[0],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      } else {
        const existingId = snapDar.docs[0].id;
        const existingData = snapDar.docs[0].data();
        const existingItems = Array.isArray(existingData.items) ? existingData.items : [];
        const mergedItems = Array.from(new Set([...existingItems, ...newItems])).filter(Boolean);
        await updateDoc(doc(db, "form_dar", existingId), {
          ...formPayload,
          items: mergedItems,
          updatedAt: serverTimestamp()
        });
      }
      
      // Update local state
      setData(prev => prev.map(d => selectedIds.has(d.id) ? { ...d, darNo: targetDarNo } : d));
      setSelectedIds(new Set());
      setIsGroupDialogOpen(false);
      setTargetDarNo("");
      toast({ title: `Berhasil mendaftarkan ${selectedItems.length} desain ke DAR ${targetDarNo}` });
      
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal menyimpan pengelompokan DAR", variant: "destructive" });
    }
  };

  const getStatusColor = (val: string) => {
    switch(val) {
      case 'IN LOCK': return 'bg-rose-500 text-white border-rose-600';
      case 'IN USE': return 'bg-emerald-500 text-white border-emerald-600';
      case 'FREE': return 'bg-blue-500 text-white border-blue-600';
      case 'ARCHIVE': return 'bg-sky-400 text-white border-sky-500';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const getTypeDesignColor = (val: string) => {
    switch(val) {
      case 'CG': return 'bg-sky-200 text-sky-900 border-sky-300';
      case 'CGI': return 'bg-yellow-200 text-yellow-900 border-yellow-300';
      case 'CGI-A': return 'bg-orange-200 text-orange-900 border-orange-300';
      case 'ST': return 'bg-emerald-200 text-emerald-900 border-emerald-300';
      case 'CGL': return 'bg-slate-200 text-slate-900 border-slate-300';
      case 'CO': return 'bg-purple-200 text-purple-900 border-purple-300';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const getDesignerColor = (val: string) => {
    switch(val) {
      case 'D1 Riki': return 'bg-blue-700 text-blue-50 border-blue-800 font-medium';
      case 'D2 Diaz': return 'bg-[#156e47] text-emerald-50 border-emerald-900 font-medium'; // Dark green
      case 'D3 Rian': return 'bg-[#7a3b00] text-amber-50 border-amber-950 font-medium'; // Dark brown
      case 'D4 Darmawan': return 'bg-[#b30000] text-red-50 border-red-900 font-medium'; // Dark red
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const getTechnicianColor = (val: string) => {
    switch(val) {
      case 'T1 Darta': return 'bg-[#cce5ff] text-blue-900 border-[#b8daff] font-medium'; // Light blue
      case 'T2 Kardani': return 'bg-[#d4edda] text-emerald-900 border-[#c3e6cb] font-medium'; // Light green
      case 'T3 Rafli': return 'bg-[#ffe8cc] text-orange-900 border-[#ffdfb3] font-medium'; // Light orange
      case 'T4 Cepi': return 'bg-[#fff3cd] text-yellow-900 border-[#ffeeba] font-medium'; // Light yellow
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const filteredData = data.filter(d => 
    !search || 
    (d.itemName || "").toLowerCase().includes(search.toLowerCase()) || 
    (d.customer || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.darNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.designNo || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.status || "").toLowerCase().includes(search.toLowerCase()) ||
    (d.typeDesign || "").toLowerCase().includes(search.toLowerCase())
  );

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const sortedAndFilteredData = React.useMemo(() => {
    let sortableItems = [...filteredData];
    if (sortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = (a as any)[sortConfig.key] || "";
        let bVal = (b as any)[sortConfig.key] || "";
        
        if (sortConfig.key === "createdAt" || sortConfig.key === "updatedAt") {
            aVal = (a as any)[sortConfig.key]?.seconds || 0;
            bVal = (b as any)[sortConfig.key]?.seconds || 0;
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return sortableItems;
  }, [filteredData, sortConfig]);

  const toggleSelectAll = () => {
    if (filteredData.length === 0) return;
    const allFilteredIds = filteredData.map(d => d.id);
    const allSelected = allFilteredIds.every(id => selectedIds.has(id));
    
    const newSel = new Set(selectedIds);
    if (allSelected) {
      allFilteredIds.forEach(id => newSel.delete(id));
    } else {
      allFilteredIds.forEach(id => newSel.add(id));
    }
    setSelectedIds(newSel);
  };


  const handleExportExcel = () => {
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
  };

  const handleDownloadTemplate = () => {
    const templateData = [{
      DAR_No: "", entryDate: "2024-01-01", itemName: "", customer: "", designer: "", technician: "",
      typeDesign: "New", designSource: "CGI", designNo: "", type: "", sizeChecks: "", sizeFaces: "",
      sizeCm1: "", sizeCm2: "", glazeChecks: "", glazeResidue: "", surfaceChecks: "", surfaceTemp: "",
      inkChecks: "", inkOther: "", guPtvChecks: "", guPtv: "", guPtv2: "", guPtv3: "", guPtv4: "", guPtv5: "", guPtv6: "",
      note2: "", sendBy: "", benefit: "", benefitText: "", lastTimeReq: "", feedback: "", feedbackDetails: "",
      lastDesignSupp: "", requiredDate: "", closingDate: "", generalNote: "", createdBy: "", status: "FREE"
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
            benefitText: rest.benefitText || "",
            lastTimeReq: rest.lastTimeReq || "",
            feedback: rest.feedback || "",
            feedbackDetails: rest.feedbackDetails || "",
            lastDesignSupp: rest.lastDesignSupp || "",
            requiredDate: rest.requiredDate || "",
            closingDate: rest.closingDate || "",
            generalNote: rest.generalNote || "",
            createdBy: rest.createdBy || "",
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

  return (
    <DashboardLayout>
      <div className="flex flex-col h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* Header */}
        <div className="flex flex-col xl:flex-row xl:items-center justify-between p-4 border-b border-slate-200 bg-slate-50 gap-4">
          <div>
            <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <Layers className="text-blue-600" />
              Register Design
            </h1>
            <p className="text-xs text-slate-500 mt-1 font-medium">Input desain individual bergaya Excel dan kelompokkan ke dalam Form DAR.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-auto">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input 
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Cari Item/Customer/Status/Tipe..."
                className="pl-9 h-9 w-full sm:w-64 text-sm"
              />
            </div>
            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-3 py-1.5 rounded-full whitespace-nowrap">
              {filteredData.length} Baris
            </div>
            
            <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto mt-2 xl:mt-0">
              <Button variant="outline" size="sm" onClick={handleOpenGroupDialog} disabled={selectedIds.size === 0} className="font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 flex-1 sm:flex-none">
                <CheckSquare className="w-4 h-4 mr-2 hidden sm:inline" />
                Group to DAR ({selectedIds.size})
              </Button>
              
              <Button variant="outline" size="sm" onClick={() => setIsShareDashboardOpen(true)} className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex-1 sm:flex-none">
                <Share2 className="w-4 h-4 mr-2 hidden sm:inline" />
                Share Dashboard
              </Button>

              <Button variant="outline" size="sm" onClick={handleDownloadTemplate} className="font-bold border-indigo-200 text-indigo-700 bg-indigo-50 hover:bg-indigo-100 flex-1 sm:flex-none">
                <Download className="w-4 h-4 mr-2 hidden sm:inline" />
                Template Excel
              </Button>
              <div className="relative flex-1 sm:flex-none">
                <input type="file" accept=".xlsx, .xls" onChange={handleImportExcel} className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" title="Import Excel" />
                <Button variant="outline" size="sm" className="font-bold border-blue-200 text-blue-700 bg-blue-50 hover:bg-blue-100 w-full pointer-events-none">
                  <Upload className="w-4 h-4 mr-2 hidden sm:inline" />
                  Import Excel
                </Button>
              </div>
              <Button variant="outline" size="sm" onClick={handleExportExcel} className="font-bold border-emerald-200 text-emerald-700 bg-emerald-50 hover:bg-emerald-100 flex-1 sm:flex-none">
                <FileSpreadsheet className="w-4 h-4 mr-2 hidden sm:inline" />
                Export Excel
              </Button>

              <Button variant="outline" size="sm" onClick={() => router.push('/register-design/dashboard')} className="font-bold border-purple-200 text-purple-700 bg-purple-50 hover:bg-purple-100 flex-1 sm:flex-none">
                <BarChart2 className="w-4 h-4 mr-2 hidden sm:inline" />
                Dashboard
              </Button>
              <Button onClick={handleAddRow} size="sm" className="font-bold bg-blue-600 hover:bg-blue-700 flex-1 sm:flex-none">
                <Plus className="w-4 h-4 mr-1 hidden sm:inline" />
                Baris Baru (F8)
              </Button>
            </div>
          </div>
        </div>

        {/* Excel Grid Container */}
        <div 
          ref={scrollContainerRef}
          className={`flex-1 overflow-auto bg-slate-50 relative ${isDragging ? 'cursor-grabbing select-none' : ''}`}
          onMouseDown={handleMouseDown}
          onMouseLeave={handleMouseLeave}
          onMouseUp={handleMouseUp}
          onMouseMove={handleMouseMove}
        >
          <table className="w-max min-w-full text-left text-[11px] border-collapse bg-white">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-sm border-b-2 border-slate-300 text-slate-700 font-bold uppercase tracking-wider">
              <tr>
                <th className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-slate-100 z-30">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 cursor-pointer accent-red-600 mx-auto block" 
                    checked={filteredData.length > 0 && filteredData.every(d => selectedIds.has(d.id))}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="p-2 border-r bg-blue-50 text-blue-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group sticky left-10 z-20 shadow-[4px_0_8px_rgba(0,0,0,0.02)]" onClick={() => handleSort("darNo")}>
                  <div className="flex items-center gap-1">
                    DAR No
                    {sortConfig?.key === "darNo" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("entryDate")}>
                  <div className="flex items-center gap-1">
                    Tgl Input
                    {sortConfig?.key === "entryDate" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("createdBy")}>
                  <div className="flex items-center gap-1 text-slate-500">
                    Dibuat Oleh
                    {sortConfig?.key === "createdBy" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("itemName")}>
                  <div className="flex items-center gap-1">
                    Nama Item
                    {sortConfig?.key === "itemName" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("customer")}>
                  <div className="flex items-center gap-1">
                    Customer
                    {sortConfig?.key === "customer" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("designer")}>
                  <div className="flex items-center gap-1">
                    Designer
                    {sortConfig?.key === "designer" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("technician")}>
                  <div className="flex items-center gap-1">
                    Technician
                    {sortConfig?.key === "technician" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("purpose")}>
                  <div className="flex items-center gap-1">
                    Tujuan
                    {sortConfig?.key === "purpose" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-center select-none w-20">
                  <div className="flex items-center justify-center gap-1"><Eye className="w-3 h-3 text-slate-400" /> Gambar</div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("status")}>
                  <div className="flex items-center gap-1">
                    Status
                    {sortConfig?.key === "status" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("typeDesign")}>
                  <div className="flex items-center gap-1">
                    Tipe Desain
                    {sortConfig?.key === "typeDesign" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("designSource")}>
                  <div className="flex items-center gap-1">
                    Sumber Desain
                    {sortConfig?.key === "designSource" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("designNo")}>
                  <div className="flex items-center gap-1">
                    Design No
                    {sortConfig?.key === "designNo" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("requiredDate")}>
                  <div className="flex items-center gap-1">
                    Req Date
                    {sortConfig?.key === "requiredDate" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("closingDate")}>
                  <div className="flex items-center gap-1">
                    Closing Date
                    {sortConfig?.key === "closingDate" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("type")}>
                  <div className="flex items-center gap-1">
                    Type (W/F/D)
                    {sortConfig?.key === "type" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("sizeChecks")}>
                  <div className="flex items-center gap-1">
                    Size
                    {sortConfig?.key === "sizeChecks" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("glazeChecks")}>
                  <div className="flex items-center gap-1">
                    Glaze
                    {sortConfig?.key === "glazeChecks" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("surfaceChecks")}>
                  <div className="flex items-center gap-1">
                    Surface
                    {sortConfig?.key === "surfaceChecks" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("guPtv")}>
                  <div className="flex items-center gap-1">
                    GU/PTV
                    {sortConfig?.key === "guPtv" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("inkChecks")}>
                  <div className="flex items-center gap-1">
                    Ink
                    {sortConfig?.key === "inkChecks" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("sendBy")}>
                  <div className="flex items-center gap-1">
                    Send By
                    {sortConfig?.key === "sendBy" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("benefitText")}>
                  <div className="flex items-center gap-1">
                    Benefit
                    {sortConfig?.key === "benefitText" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("generalNote")}>
                  <div className="flex items-center gap-1">
                    Note 1
                    {sortConfig?.key === "generalNote" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastTimeReq")}>
                  <div className="flex items-center gap-1">
                    Last Time Req
                    {sortConfig?.key === "lastTimeReq" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("feedbackDetails")}>
                  <div className="flex items-center gap-1">
                    Feedback (Rows)
                    {sortConfig?.key === "feedbackDetails" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("lastDesignSupp")}>
                  <div className="flex items-center gap-1">
                    Last Design Supp
                    {sortConfig?.key === "lastDesignSupp" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 border-r bg-slate-50 text-emerald-800 cursor-pointer hover:bg-slate-200 transition-colors select-none group" onClick={() => handleSort("note2")}>
                  <div className="flex items-center gap-1">
                    Note 2
                    {sortConfig?.key === "note2" ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                    ) : <ChevronUp className="h-3 w-3 opacity-0 group-hover:opacity-30 transition-opacity" />}
                  </div>
                </th>
                <th className="p-2 text-center sticky right-0 bg-slate-100 z-20 shadow-[-4px_0_12px_rgba(0,0,0,0.05)]">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={24} className="p-8 text-center text-slate-500 font-bold">Memuat data...</td></tr>
              ) : filteredData.length === 0 ? (
                <tr><td colSpan={24} className="p-8 text-center text-slate-500 font-bold">Tidak ada data desain.</td></tr>
              ) : (
                sortedAndFilteredData.map((row, idx) => (
                  <tr key={row.id} className="border-b border-slate-200 hover:bg-blue-50/50 group transition-colors">
                    <td className="w-10 min-w-[40px] max-w-[40px] p-0 border-r text-center sticky left-0 bg-white group-hover:bg-blue-50 z-20">
                      <input type="checkbox" checked={selectedIds.has(row.id)} onChange={() => toggleSelect(row.id)} className="w-4 h-4 cursor-pointer accent-red-600" />
                    </td>
                    <td className="p-1 border-r font-black text-blue-700 sticky left-10 bg-[#f4f8ff] group-hover:bg-blue-50 z-10 shadow-[4px_0_8px_rgba(0,0,0,0.02)]">
                      <CellInput handleUpdateCell={handleUpdateCell} row={row} field="darNo" width="w-24" />
                    </td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="entryDate" width="w-28" type="date" /></td>
                    <td className="p-1 border-r text-[10px] text-slate-500 bg-slate-50/50 text-center">{row.createdBy || '-'}</td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="itemName" width="w-40" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="customer" options={customerOptions} width="w-32" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designer" options={designerOptions} colorFn={getDesignerColor} width="w-28" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="technician" options={technicianOptions} colorFn={getTechnicianColor} width="w-28" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="benefit" options={baseTujuanOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellImageUpload handleUpdateCell={handleUpdateCell} row={row} /></td>
                    <td className="p-1 border-r">
                      <CellSelect handleUpdateCell={handleUpdateCell} row={row} field="status" options={["IN LOCK", "IN USE", "FREE", "ARCHIVE"]} colorFn={getStatusColor} width="w-24" />
                    </td>
                    <td className="p-1 border-r">
                      <CellInput handleUpdateCell={handleUpdateCell} row={row} field="typeDesign" options={typeDesignOptions} colorFn={getTypeDesignColor} width="w-20" />
                    </td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designSource" options={designSourceOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="designNo" width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="requiredDate" width="w-28" type="date" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="closingDate" width="w-28" type="date" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="type" options={baseTypeOptions} width="w-24" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="sizeChecks" options={baseSizeOptions} customOptions={sizeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="glazeChecks" options={baseGlazeOptions} customOptions={glazeCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="surfaceChecks" options={baseSurfaceOptions} customOptions={surfaceCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50">
                       <CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="guPtvChecks" options={baseGuPtvOptions} customOptions={guPtvCustomOptions} width="w-32" />
                    </td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="inkChecks" options={baseInkOptions} customOptions={inkCustomOptions} width="w-32" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellMultiSelect handleUpdateCell={handleUpdateCell} row={row} field="sendBy" options={baseSendByOptions} width="w-24" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="benefitText" width="w-40" /></td>
                    <td className="p-1 border-r bg-slate-50/50"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="generalNote" width="w-48" /></td>
                    <td className="p-1 border-r"><CellInput handleUpdateCell={handleUpdateCell} row={row} field="lastTimeReq" width="w-28" type="date" /></td>
                    <td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="feedbackDetails" title="Feedback" rowsCount={4} /></td>
                    <td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="lastDesignSupp" title="Support" rowsCount={6} /></td>
                    <td className="p-1 border-r"><CellGridInput handleUpdateCell={handleUpdateCell} row={row} field="note2" title="Note 2" rowsCount={3} /></td>
                    <td className="p-1 text-center sticky right-0 bg-white group-hover:bg-blue-50 z-10 shadow-[-4px_0_12px_rgba(0,0,0,0.02)]">
                      <div className="flex items-center justify-center gap-1">
                        {row.darNo && (
                          <>
                            <Button variant="ghost" size="icon" onClick={() => handleOpenSign(row.darNo)} className="h-6 w-6 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50" title="Isi Tanda Tangan">
                              <Pencil className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => setPreviewDarNo(row.darNo)} className="h-6 w-6 text-slate-400 hover:text-blue-600 hover:bg-blue-50" title="Preview Form DAR">
                              <Eye className="w-3.5 h-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" onClick={() => handleSharePublicLink(row.darNo)} className="h-6 w-6 text-slate-400 hover:text-purple-600 hover:bg-purple-50" title="Bagikan Link Public Form DAR" disabled={isSharing}>
                              <Share2 className="w-3.5 h-3.5" />
                            </Button>
                          </>
                        )}
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteRow(row.id)} className="h-6 w-6 text-slate-400 hover:text-red-600 hover:bg-red-50" title="Hapus Baris">
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Datalists */}
      
      
      
      
      

      <Dialog open={isGroupDialogOpen} onOpenChange={setIsGroupDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Group into DAR</DialogTitle>
            <DialogDescription>
              Anda akan mengelompokkan <b>{selectedIds.size}</b> desain ke dalam satu Nomor DAR. 
              Pastikan seluruh spesifikasi dari desain yang dipilih sudah sama.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-bold text-slate-700 block mb-2">Nomor DAR Tujuan</label>
            <Input 
              value={targetDarNo} 
              onChange={e => setTargetDarNo(e.target.value)} 
              placeholder="Contoh: DAR-2026-001" 
              className="font-bold text-lg"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsGroupDialogOpen(false)}>Batal</Button>
            <Button onClick={handleGroupToDar} className="bg-blue-600 hover:bg-blue-700">Validasi & Simpan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      <Dialog open={!!previewDarNo} onOpenChange={(open) => !open && setPreviewDarNo(null)}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] h-[95vh] p-0 border-none rounded-xl shadow-2xl overflow-hidden bg-slate-200 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
            <DialogTitle className="text-lg font-bold">Preview Form DAR: {previewDarNo}</DialogTitle>
            <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button></DialogClose>
          </div>
          <div className="flex-1 w-full bg-slate-200 relative overflow-hidden">
            {previewDarNo && <iframe src={`/form-app/preview?darNo=${previewDarNo}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
        </DialogContent>
      </Dialog>
      
      <Dialog open={!!signDarNo} onOpenChange={(open) => !open && setSignDarNo(null)}>
        <DialogContent className="sm:max-w-6xl max-w-[98vw] h-[95vh] p-0 border-none rounded-xl shadow-2xl overflow-hidden bg-slate-200 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
            <DialogTitle className="text-lg font-bold">Isi Tanda Tangan: {signDarNo}</DialogTitle>
            <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button></DialogClose>
          </div>
          <div className="flex-1 w-full bg-slate-200 relative overflow-hidden">
            {signId && <iframe src={`/public/form-dar?id=${signId}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isShareDashboardOpen} onOpenChange={setIsShareDashboardOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Share Dashboard Summary</DialogTitle>
            <DialogDescription>
              Buat passcode untuk membatasi akses pada link publik.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <label className="text-sm font-medium text-slate-700 mb-1 block">Passcode (minimal 4 karakter)</label>
            <Input 
              type="text" 
              value={dashboardPasscode} 
              onChange={e => setDashboardPasscode(e.target.value)} 
              placeholder="Contoh: Ahlisoftware77"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareDashboardOpen(false)}>Batal</Button>
            <Button 
              disabled={dashboardPasscode.length < 4}
              className="bg-blue-600 hover:bg-blue-700" 
              onClick={async () => {
                const hashed = await hashString(dashboardPasscode);
                const url = window.location.origin + '/public/dashboard-design?k=' + hashed;
                navigator.clipboard.writeText(url);
                toast({ title: "Link Dashboard Disalin!", description: "Link beserta passcode sudah dibuat." });
                setIsShareDashboardOpen(false);
              }}
            >
              Copy Link Share
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
