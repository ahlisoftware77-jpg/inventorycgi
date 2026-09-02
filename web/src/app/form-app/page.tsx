"use client";

import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "@/components/dashboard/layout";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {  Printer, Download, Save, Info, FileText, Pencil, Trash, Lock, Unlock, User, History, Share2, Loader2, X, Search, Check, Trash2, FileSpreadsheet, Upload, AlertTriangle , Plus } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import * as XLSX from 'xlsx';
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { db } from "@/lib/firebase/config";
import { doc, getDoc, collection, addDoc, getDocs, deleteDoc, query, orderBy, where, updateDoc, limit } from "firebase/firestore";
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export default function FormAppPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [previewReportId, setPreviewReportId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form States
  const [darNo, setDarNo] = useState("");
  const [latestDarNo, setLatestDarNo] = useState("");
  const [suggestedDarNo, setSuggestedDarNo] = useState("");
  const [darExists, setDarExists] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [checkingDar, setCheckingDar] = useState(false);
  const [customer, setCustomer] = useState("");
  const [entryDate, setEntryDate] = useState("");
  const [designer, setDesigner] = useState("");
  const [technician, setTechnician] = useState("");
  const [purpose, setPurpose] = useState<string[]>([]); // Customer, Internal, etc
  const [designNo, setDesignNo] = useState("");
  
  // 32 Items
  const [numColumns, setNumColumns] = useState<8 | 16 | 24 | 32>(32);
  const [items, setItems] = useState<string[]>(Array(32).fill(""));
  
  const [requiredDate, setRequiredDate] = useState("");
  const [closingDate, setClosingDate] = useState("");
  
  // Item Sections
  const [type, setType] = useState<string[]>([]);
  const [sizeChecks, setSizeChecks] = useState<string[]>([]);
  const [sizeFaces, setSizeFaces] = useState("");
  const [sizeCm1, setSizeCm1] = useState("");
  const [sizeCm2, setSizeCm2] = useState("");
  
  const [glazeChecks, setGlazeChecks] = useState<string[]>([]);
  const [glazeResidue, setGlazeResidue] = useState("");
  
  const [surfaceChecks, setSurfaceChecks] = useState<string[]>([]);
  const [surfaceTemp, setSurfaceTemp] = useState("");
  
  const [guPtv, setGuPtv] = useState(["", "", "", "", "", ""]);
  const [guPtvChecks, setGuPtvChecks] = useState<boolean[]>([false, false, false, false, false, false]);
  
  const [inkChecks, setInkChecks] = useState<string[]>([]);
  const [inkOther, setInkOther] = useState("");
  
  const [sendBy, setSendBy] = useState<string[]>([]);
  
  const [benefit, setBenefit] = useState("");
  const [lastTimeReq, setLastTimeReq] = useState("");
  const [feedback, setFeedback] = useState("");
  const [feedbackRows, setFeedbackRows] = useState<{c1: string, c2: string}[]>(Array.from({ length: 4 }, () => ({ c1: "", c2: "" })));
  const [note2Rows, setNote2Rows] = useState<{c1: string, c2: string}[]>(Array.from({ length: 3 }, () => ({ c1: "", c2: "" })));
  const [lastDesignSupp, setLastDesignSupp] = useState<{c1: string, c2: string}[]>(Array.from({ length: 6 }, () => ({ c1: "", c2: "" })));
  const [generalNote, setGeneralNote] = useState("");

  const [signatures, setSignatures] = useState({ manager: '', sectionHead: '', designer: '' });
  const [lockedSignatures, setLockedSignatures] = useState({ manager: false, sectionHead: false, designer: false });
  const [penColors, setPenColors] = useState({ manager: '#000000', sectionHead: '#000000', designer: '#000000' });
  
  const sigManager = useRef<any>(null);
  const sigSectionHead = useRef<any>(null);
  const sigDesigner = useRef<any>(null);
  
  const getRefByRole = (role: string) => {
    if (role === 'manager') return sigManager;
    if (role === 'sectionHead') return sigSectionHead;
    return sigDesigner;
  };

  const updateSignaturesState = () => {
    setSignatures(prev => ({
      ...prev,
      manager: sigManager.current?.isEmpty() ? prev.manager : sigManager.current?.getTrimmedCanvas().toDataURL('image/png') || prev.manager,
      sectionHead: sigSectionHead.current?.isEmpty() ? prev.sectionHead : sigSectionHead.current?.getTrimmedCanvas().toDataURL('image/png') || prev.sectionHead,
      designer: sigDesigner.current?.isEmpty() ? prev.designer : sigDesigner.current?.getTrimmedCanvas().toDataURL('image/png') || prev.designer,
    }));
  };

  const toggleLock = (role: 'manager' | 'sectionHead' | 'designer') => {
    const newLocks = { ...lockedSignatures, [role]: !lockedSignatures[role] };
    setLockedSignatures(newLocks);
    handleSave({ lockedSignatures: newLocks });
  };

  useEffect(() => {
    async function checkAccess() {
      if (!user) return;
      if (user.role === "Admin") {
        setHasAccess(true);
        setLoading(false);
        return;
      }
      try {
        const snap = await getDoc(doc(db, "settings", "general"));
        if (snap.exists()) {
          const formAppUsers = snap.data().formAppUsers || [];
          if (formAppUsers.includes(user.uid)) {
            setHasAccess(true);
          }
        }
      } catch (e) {
        console.error(e);
      }
      setLoading(false);
    }
    checkAccess();
  }, [user]);

  useEffect(() => {
    const draft = localStorage.getItem("formDarDraft");
    if (draft) {
      try {
        const d = JSON.parse(draft);
        if (d.darNo) setDarNo(d.darNo);
        if (d.customer) setCustomer(d.customer);
        if (d.entryDate) setEntryDate(d.entryDate);
        if (d.designer) setDesigner(d.designer);
        if (d.technician) setTechnician(d.technician);
        if (d.purpose) setPurpose(d.purpose);
        if (d.designNo) setDesignNo(d.designNo);
        if (d.items) setItems(d.items);
        if (d.numColumns) setNumColumns(d.numColumns);
        if (d.requiredDate) setRequiredDate(d.requiredDate);
        if (d.closingDate) setClosingDate(d.closingDate);
        if (d.type) setType(d.type);
        if (d.sizeChecks) setSizeChecks(d.sizeChecks);
        if (d.sizeFaces) setSizeFaces(d.sizeFaces);
        if (d.sizeCm1) setSizeCm1(d.sizeCm1);
        if (d.sizeCm2) setSizeCm2(d.sizeCm2);
        if (d.glazeChecks) setGlazeChecks(d.glazeChecks);
        if (d.glazeResidue) setGlazeResidue(d.glazeResidue);
        if (d.surfaceChecks) setSurfaceChecks(d.surfaceChecks);
        if (d.surfaceTemp) setSurfaceTemp(d.surfaceTemp);
        if (d.guPtv) setGuPtv(d.guPtv);
        if (d.guPtvChecks) setGuPtvChecks(d.guPtvChecks);
        if (d.inkChecks) setInkChecks(d.inkChecks);
        if (d.inkOther) setInkOther(d.inkOther);
        if (d.sendBy) setSendBy(d.sendBy);
        if (d.benefit) setBenefit(d.benefit);
        if (d.lastTimeReq) setLastTimeReq(d.lastTimeReq);
        if (d.feedback) setFeedback(d.feedback);
        if (d.feedbackRows) setFeedbackRows(d.feedbackRows);
        if (d.note2Rows) setNote2Rows(d.note2Rows);
        if (d.lastDesignSupp) setLastDesignSupp(d.lastDesignSupp);
        if (d.generalNote) setGeneralNote(d.generalNote);
      } catch (e) {
        console.error("Draft parse error", e);
      }
    }
  }, []);

  useEffect(() => {
    if (!darExists) return;
    const fetchLatestDar = async () => {
      try {
        const q = query(collection(db, "form_dar"), orderBy("createdAt", "desc"), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          const lastDar = snap.docs[0].data().darNo || "";
          setLatestDarNo(lastDar);
          const match = lastDar.match(/^(.*?)(\d+)$/);
          if (match) {
            const prefix = match[1];
            const numStr = match[2];
            const nextNum = (parseInt(numStr, 10) + 1).toString().padStart(numStr.length, '0');
            setSuggestedDarNo(`${prefix}${nextNum}`);
          }
        }
      } catch (e) {
        console.error(e);
      }
    };
    fetchLatestDar();
  }, [darExists]);

  useEffect(() => {
    if (!darNo || editId) {
      setDarExists(false);
      return;
    }
    if (!darNo) {
      setDarExists(false);
      return;
    }
    const checkDar = async () => {
      setCheckingDar(true);
      try {
        const q = query(collection(db, "form_dar"), where("darNo", "==", darNo));
        const snap = await getDocs(q);
        setDarExists(!snap.empty);
      } catch (e) {
        console.error("Error checking DAR:", e);
      }
      setCheckingDar(false);
    };

    const timeoutId = setTimeout(checkDar, 500); // 500ms debounce
    return () => clearTimeout(timeoutId);
  }, [darNo]);

  useEffect(() => {
    if (loading) return; // Jangan simpan draft saat masih loading
    const draft = {
      darNo, customer, entryDate, designer, technician, purpose, designNo, items, numColumns,
      requiredDate, closingDate, type, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
      glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
      benefit, lastTimeReq, feedback, feedbackRows, note2Rows, lastDesignSupp, generalNote
    };
    localStorage.setItem("formDarDraft", JSON.stringify(draft));
  }, [
    darNo, customer, entryDate, designer, technician, purpose, designNo, items, numColumns,
    requiredDate, closingDate, type, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
    glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
    benefit, lastTimeReq, feedback, feedbackRows, note2Rows, lastDesignSupp, generalNote, loading
  ]);

  const handlePrint = () => {
    updateSignaturesState();
    window.print();
  };

  const handleSave = async (overrides?: any) => {
    if (!darNo) {
      toast({ title: "Gagal", description: "Nomor DAR harus diisi", variant: "destructive" });
      return;
    }
    try {
      // Extract current signatures directly from canvas refs to ensure latest data
      const currentSignatures = {
        manager: sigManager.current?.isEmpty() ? signatures.manager : sigManager.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.manager,
        sectionHead: sigSectionHead.current?.isEmpty() ? signatures.sectionHead : sigSectionHead.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.sectionHead,
        designer: sigDesigner.current?.isEmpty() ? signatures.designer : sigDesigner.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.designer,
      };
      setSignatures(currentSignatures);
      
      const payload = {
        darNo, customer, entryDate, designer, technician, purpose, designNo, items,
        requiredDate, closingDate, type, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
        glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
        benefit, lastTimeReq, feedback, feedbackRows, lastDesignSupp, note2Rows, generalNote,
        signatures: currentSignatures, lockedSignatures, penColors, numColumns,
        createdBy: user?.uid || "unknown",
        updatedBy: user?.displayName || user?.email || user?.uid || "unknown",
        updatedAt: new Date(),
        ...(overrides || {})
      };
      
      const cleanPayload = Object.fromEntries(
        Object.entries(payload).map(([k, v]) => [k, v === undefined ? null : v])
      );

      if (editId) {
        // Update existing document
        await updateDoc(doc(db, "form_dar", editId), { ...cleanPayload, updatedAt: new Date() });
        toast({ title: "Berhasil", description: "Form DAR berhasil diperbarui!" });
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
      }

      localStorage.removeItem("formDarDraft"); // Bersihkan draft setelah sukses simpan
      setHistoryData([]); // Reset history to refetch next time
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Gagal", description: "Gagal menyimpan form DAR", variant: "destructive" });
    }
  };

  const fetchHistory = async () => {
    if (historyData.length > 0) return;
    setLoadingHistory(true);
    try {
      const q = query(collection(db, "form_dar"), orderBy("createdAt", "desc"));
      const snap = await getDocs(q);
      const data = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setHistoryData(data);
    } catch (e) {
      console.error(e);
      toast({ title: "Gagal", description: "Gagal memuat riwayat", variant: "destructive" });
    }
    setLoadingHistory(false);
  };

  useEffect(() => {
    if (isHistoryOpen) {
      fetchHistory();
    }
  }, [isHistoryOpen]);

  const loadReport = (report: any) => {
    setEditId(report.id || null);
    setDarNo(report.darNo || "");
    setCustomer(report.customer || "");
    setEntryDate(report.entryDate || "");
    setDesigner(report.designer || "");
    setTechnician(report.technician || "");
    setPurpose(report.purpose || []);
    setDesignNo(report.designNo || "");
    
    setItems(report.items || Array(32).fill(""));
    setNumColumns(report.numColumns || 32);
    setRequiredDate(report.requiredDate || "");
    setClosingDate(report.closingDate || "");
    setType(report.type || []);
    setSizeChecks(report.sizeChecks || []);
    setSizeFaces(report.sizeFaces || "");
    setSizeCm1(report.sizeCm1 || "");
    setSizeCm2(report.sizeCm2 || "");
    setGlazeChecks(report.glazeChecks || []);
    setGlazeResidue(report.glazeResidue || "");
    setSurfaceChecks(report.surfaceChecks || []);
    setSurfaceTemp(report.surfaceTemp || "");
    setGuPtv(report.guPtv || ["", "", "", "", "", ""]);
    setGuPtvChecks(report.guPtvChecks || [false, false, false, false, false, false]);
    setInkChecks(report.inkChecks || []);
    setInkOther(report.inkOther || "");
    setSendBy(report.sendBy || []);
    
    setBenefit(report.benefit || "");
    setLastTimeReq(report.lastTimeReq || "");
    setFeedback(report.feedback || "");
    setFeedbackRows(report.feedbackRows || Array.from({ length: 4 }, () => ({ c1: "", c2: "" })));
    setNote2Rows(report.note2Rows || Array.from({ length: 3 }, () => ({ c1: "", c2: "" })));
    setLastDesignSupp(report.lastDesignSupp || Array.from({ length: 6 }, () => ({ c1: "", c2: "" })));
    setGeneralNote(report.generalNote || "");
    
    setSignatures(report.signatures || { manager: '', sectionHead: '', designer: '' });
    setLockedSignatures(report.lockedSignatures || { manager: false, sectionHead: false, designer: false });
    setPenColors(report.penColors || { manager: '#000000', sectionHead: '#000000', designer: '#000000' });
    
    setIsHistoryOpen(false);
    toast({ title: "Berhasil", description: `Data DAR ${report.darNo || ''} dimuat!` });
  };

  const resetForm = () => {
    setEditId(null);
    setDarNo("");
    setCustomer("");
    setEntryDate("");
    setDesigner("");
    setTechnician("");
    setPurpose([]);
    setDesignNo("");
    
    setItems(Array(32).fill(""));
    setNumColumns(32);
    setRequiredDate("");
    setClosingDate("");
    setType([]);
    setSizeChecks([]);
    setSizeFaces("");
    setSizeCm1("");
    setSizeCm2("");
    setGlazeChecks([]);
    setGlazeResidue("");
    setSurfaceChecks([]);
    setSurfaceTemp("");
    setGuPtv(["", "", "", "", "", ""]);
    setGuPtvChecks([false, false, false, false, false, false]);
    setInkChecks([]);
    setInkOther("");
    setSendBy([]);
    
    setBenefit("");
    setLastTimeReq("");
    setFeedback("");
    setFeedbackRows(Array.from({ length: 4 }, () => ({ c1: "", c2: "" })));
    setNote2Rows(Array.from({ length: 3 }, () => ({ c1: "", c2: "" })));
    setLastDesignSupp(Array.from({ length: 6 }, () => ({ c1: "", c2: "" })));
    setGeneralNote("");
    
    setSignatures({ manager: '', sectionHead: '', designer: '' });
    setLockedSignatures({ manager: false, sectionHead: false, designer: false });
    setPenColors({ manager: '#000000', sectionHead: '#000000', designer: '#000000' });
    
    
    toast({ title: "Form Dikosongkan", description: "Siap untuk membuat form DAR baru" });
  };

  const handleDeleteReport = async (id: string) => {
    setIsDeleting(true);
    try {
      await deleteDoc(doc(db, "form_dar", id));
      setHistoryData(historyData.filter(h => h.id !== id));
      toast({ title: "Berhasil", description: "Laporan dihapus" });
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal menghapus laporan", variant: "destructive" });
    }
    setIsDeleting(false);
    setConfirmDeleteId(null);
  };

  const handleExportExcel = () => {
    if (historyData.length === 0) return;
    
    const exportData = historyData.map(r => ({
      "No. DAR": r.darNo,
      "Customer": r.customer,
      "Entry Date": r.entryDate,
      "Designer": r.designer,
      "Technician": r.technician,
      "Design No": r.designNo,
      "Required Date": r.requiredDate,
      "Closing Date": r.closingDate,
      "Purpose": (r.purpose || []).join(", "),
      "Item 1": r.items?.[0] || "",
      "Item 2": r.items?.[1] || "",
      "Benefit": r.benefit,
      "General Note": r.generalNote
    }));
    
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "DAR History");
    XLSX.writeFile(wb, `DAR_History_${new Date().toISOString().split('T')[0]}.xlsx`);
  };

  const handleImportExcel = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const bstr = evt.target?.result;
        const wb = XLSX.read(bstr, { type: 'binary' });
        const wsname = wb.SheetNames[0];
        const ws = wb.Sheets[wsname];
        const data = XLSX.utils.sheet_to_json(ws);
        
        let skipped = 0;
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
        }
        
        setHistoryData([]); // reset so it reloads
        fetchHistory();
        
      } catch (err) {
        console.error(err);
        toast({ title: "Gagal", description: "Format Excel tidak valid atau error", variant: "destructive" });
      }
    };
    reader.readAsBinaryString(file);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const toggleArray = (arr: string[], setArr: any, val: string) => {
    if (arr.includes(val)) setArr(arr.filter(v => v !== val));
    else setArr([...arr, val]);
  };

  const updateItem = (idx: number, val: string) => {
    const newItems = [...items];
    newItems[idx] = val;
    setItems(newItems);
  };

  const updateGu = (idx: number, val: string) => {
    const newGu = [...guPtv];
    newGu[idx] = val;
    setGuPtv(newGu);
  };
  const updateGuCheck = (idx: number, checked: boolean) => {
    const newChecks = [...guPtvChecks];
    newChecks[idx] = checked;
    setGuPtvChecks(newChecks);
  };
  
  const updateFeedbackRow = (idx: number, field: "c1" | "c2", val: string) => {
    const newRows = [...feedbackRows];
    newRows[idx] = { ...newRows[idx], [field]: val };
    setFeedbackRows(newRows);
  };
  
  const updateNote2Row = (idx: number, field: "c1" | "c2", val: string) => {
    const newRows = [...note2Rows];
    newRows[idx] = { ...newRows[idx], [field]: val };
    setNote2Rows(newRows);
  };
  
  const updateLds = (idx: number, field: "c1" | "c2", val: string) => {
    const newLds = [...lastDesignSupp];
    newLds[idx] = { ...newLds[idx], [field]: val };
    setLastDesignSupp(newLds);
  };

  if (loading) return <DashboardLayout><div className="p-8">Memuat halaman...</div></DashboardLayout>;
  if (!hasAccess) return <DashboardLayout><div className="p-8 text-red-500 font-bold">Akses Ditolak. Anda tidak memiliki otoritas untuk melihat form ini.</div></DashboardLayout>;

  const highlightMatch = (text: string, search: string) => {
    if (!search || !text) return text;
    const parts = text.split(new RegExp(`(${search})`, 'gi'));
    return (
        <>
            {parts.map((part, i) => 
                part.toLowerCase() === search.toLowerCase() ? 
                    <span key={i} className="bg-yellow-300 text-yellow-900 font-bold px-0.5 rounded shadow-sm">{part}</span> : 
                    part
            )}
        </>
    );
  };

  return (
    <DashboardLayout>
      <div className="flex items-center gap-3 px-1 text-left mb-6 print:hidden">
        <div className="p-3 bg-blue-600/10 rounded-2xl shadow-inner">
          <FileText className="w-6 h-6 text-blue-600" />
        </div>
        <div className="text-left">
          <h1 className="text-3xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left italic">Form APP (DAR)</h1>
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em] text-left">Design Application Request</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 pb-20 items-start">
        {/* LEFT COLUMN - INPUTS */}
        <div className="xl:col-span-4 space-y-6 print:hidden max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar">
          
          <div className="flex flex-col gap-2 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 py-2 border-b">
            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 px-1"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Buat Baru</span></Button>
              <Button onClick={handlePrint} className="flex-1 bg-slate-800 hover:bg-slate-900 text-white px-1"><Printer className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Print</span></Button>
              <Button onClick={handleSave} className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-1"><Save className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Simpan</span></Button>
            </div>
            <Button onClick={() => setIsHistoryOpen(true)} className="w-full bg-blue-600 hover:bg-blue-700 text-white"><History className="w-4 h-4 mr-2" /> Riwayat & Excel</Button>
          </div>

          <Tabs defaultValue="umum" className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4 bg-slate-100 rounded-xl p-1">
              <TabsTrigger value="umum" className="text-[10px] rounded-lg">Umum</TabsTrigger>
              <TabsTrigger value="spesifikasi" className="text-[10px] rounded-lg">Item & Spec</TabsTrigger>
              <TabsTrigger value="tambahan" className="text-[10px] rounded-lg">Info & Note</TabsTrigger>
              <TabsTrigger value="ttd" className="text-[10px] rounded-lg">Signatures</TabsTrigger>
            </TabsList>
            
            <TabsContent value="umum" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 p-4 border-b">
              <CardTitle className="text-sm font-black uppercase">Informasi Umum</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div>
                <Label className="text-xs font-bold">No. DAR</Label>
                <div className="relative">
                  <Input value={darNo} onChange={e => setDarNo(e.target.value)} disabled={!!editId} className={darExists ? "border-rose-500 bg-rose-50 pr-10" : "pr-10"} />
                  {checkingDar && <Loader2 className="h-4 w-4 absolute right-3 top-2.5 animate-spin text-slate-400" />}
                </div>
                {darExists && (
                  <div className="mt-2 p-3 bg-rose-50 border border-rose-200 rounded-xl flex flex-col gap-1.5 animate-in fade-in zoom-in duration-200">
                    <p className="text-[10px] font-bold text-rose-600 flex items-start gap-1.5">
                      <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                      <span>Nomor DAR sudah ada di database! Anda tidak dapat menimpa data yang lama.</span>
                    </p>
                    <div className="pl-5 space-y-1">
                      <p className="text-[10px] text-slate-600">Nomor terakhir dibuat: <strong className="text-slate-900">{latestDarNo || '-'}</strong></p>
                      {suggestedDarNo && (
                        <p className="text-[10px] text-slate-600">
                          Saran nomor selanjutnya: <strong className="text-blue-600 cursor-pointer hover:underline" onClick={() => setDarNo(suggestedDarNo)}>{suggestedDarNo}</strong> <span className="text-slate-400">(klik untuk memakai)</span>
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <div><Label className="text-xs font-bold">Customer (Klien)</Label><Input value={customer} onChange={e => setCustomer(e.target.value)} /></div>
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs font-bold">Entry Date</Label><Input type="date" value={entryDate} onChange={e => setEntryDate(e.target.value)} /></div>
                <div><Label className="text-xs font-bold">Designer</Label><Input value={designer} onChange={e => setDesigner(e.target.value)} /></div>
              </div>
              <div><Label className="text-xs font-bold">Technician</Label><Input value={technician} onChange={e => setTechnician(e.target.value)} /></div>
              <div>
                <Label className="text-xs font-bold mb-2 block">Tujuan</Label>
                <div className="flex flex-wrap gap-3">
                  {["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox checked={purpose.includes(p)} onCheckedChange={() => toggleArray(purpose, setPurpose, p)} /> {p}</label>
                  ))}
                </div>
              </div>
              <div><Label className="text-xs font-bold">Design / Item Number</Label><Input value={designNo} onChange={e => setDesignNo(e.target.value)} /></div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="spesifikasi" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 p-4 border-b flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase">Tabel Item</CardTitle>
              <Select value={numColumns.toString()} onValueChange={v => setNumColumns(parseInt(v) as 8 | 16 | 24 | 32)}>
                  <SelectTrigger className="w-[100px] h-7 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="8">8 Kolom</SelectItem>
                    <SelectItem value="16">16 Kolom</SelectItem>
                    <SelectItem value="24">24 Kolom</SelectItem>
                    <SelectItem value="32">32 Kolom</SelectItem>
                  </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="p-4 grid grid-cols-4 gap-2">
              {Array.from({length: numColumns}).map((_, i) => (
                <div key={i} className="flex flex-col">
                  <span className="text-[10px] font-bold text-center bg-slate-100 rounded-t border border-b-0 border-slate-200">{i+1}</span>
                  <Input className="h-8 text-xs text-center rounded-none rounded-b px-1" value={items[i] || ""} onChange={e => updateItem(i, e.target.value)} />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 p-4 border-b">
              <CardTitle className="text-sm font-black uppercase">Spesifikasi Detail</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div className="grid grid-cols-2 gap-2">
                <div><Label className="text-xs font-bold">Required Date</Label><Input type="date" value={requiredDate} onChange={e => setRequiredDate(e.target.value)} /></div>
                <div><Label className="text-xs font-bold">Closing Date</Label><Input type="date" value={closingDate} onChange={e => setClosingDate(e.target.value)} /></div>
              </div>
              
              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Type</Label>
                <div className="flex flex-wrap gap-3">
                  {["Picture", "Emboss", "Rubber", "File Image Digital", "Finish tile"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={type.includes(p)} onCheckedChange={() => toggleArray(type, setType, p)} /> {p}</label>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Size</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  {["Large size", "Cut 1:1", "jpg file"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={sizeChecks.includes(p)} onCheckedChange={() => toggleArray(sizeChecks, setSizeChecks, p)} /> {p}</label>
                  ))}
                  <div className="flex items-center gap-1 text-[11px]"><Checkbox checked={sizeChecks.includes("Faces")} onCheckedChange={() => toggleArray(sizeChecks, setSizeChecks, "Faces")} /> Faces <Input className="w-12 h-6 text-xs px-1" value={sizeFaces} onChange={e=>setSizeFaces(e.target.value)} /></div>
                  <div className="flex items-center gap-1 text-[11px]"><Checkbox checked={sizeChecks.includes("Custom")} onCheckedChange={() => toggleArray(sizeChecks, setSizeChecks, "Custom")} /> <Input className="w-10 h-6 text-xs px-1" value={sizeCm1} onChange={e=>setSizeCm1(e.target.value)} /> cm x <Input className="w-10 h-6 text-xs px-1" value={sizeCm2} onChange={e=>setSizeCm2(e.target.value)} /> cm</div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Glaze</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  {["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={glazeChecks.includes(p)} onCheckedChange={() => toggleArray(glazeChecks, setGlazeChecks, p)} /> {p}</label>
                  ))}
                  <div className="flex items-center gap-1 text-[11px]"><Checkbox checked={glazeChecks.includes("Residue")} onCheckedChange={() => toggleArray(glazeChecks, setGlazeChecks, "Residue")} /> Residue <Input className="w-20 h-6 text-xs px-1" value={glazeResidue} onChange={e=>setGlazeResidue(e.target.value)} /></div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Surface</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  {["Matt", "Glossy", "Satin", "Polished", "Anti Slip"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={surfaceChecks.includes(p)} onCheckedChange={() => toggleArray(surfaceChecks, setSurfaceChecks, p)} /> {p}</label>
                  ))}
                  <div className="flex items-center gap-1 text-[11px]"><Checkbox checked={surfaceChecks.includes("Temp")} onCheckedChange={() => toggleArray(surfaceChecks, setSurfaceChecks, "Temp")} /> Temp <Input className="w-16 h-6 text-xs px-1" value={surfaceTemp} onChange={e=>setSurfaceTemp(e.target.value)} /></div>
                </div>
              </div>
              
              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">GU / PTV</Label>
                <div className="flex flex-wrap gap-3">
                  {guPtv.map((v, i) => (
                    <div key={i} className="flex items-center gap-1">
                      <Checkbox checked={guPtvChecks[i]} onCheckedChange={(c) => updateGuCheck(i, !!c)} />
                      <Input className="w-12 h-7 text-xs px-1" value={v} onChange={e => updateGu(i, e.target.value)} />
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Ink Effect</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  {["Impression", "Transparent", "SIngking", "Antislip", "Glue"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={inkChecks.includes(p)} onCheckedChange={() => toggleArray(inkChecks, setInkChecks, p)} /> {p}</label>
                  ))}
                  <div className="flex items-center gap-1 text-[11px]"><Checkbox checked={inkChecks.includes("Other")} onCheckedChange={() => toggleArray(inkChecks, setInkChecks, "Other")} /> <Input className="w-24 h-6 text-xs px-1" value={inkOther} onChange={e=>setInkOther(e.target.value)} /></div>
                </div>
              </div>

              <div className="space-y-2 border-t pt-2 mt-2">
                <Label className="text-xs font-bold text-blue-600">Send By</Label>
                <div className="flex flex-wrap gap-3 items-center">
                  {["USB", "Wetransfer", "CD", "On Glazing Line"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-[11px]"><Checkbox checked={sendBy.includes(p)} onCheckedChange={() => toggleArray(sendBy, setSendBy, p)} /> {p}</label>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="tambahan" className="space-y-6">
          <Card className="rounded-2xl border shadow-sm">
            <CardHeader className="bg-slate-100/50 dark:bg-slate-800/50 p-4 border-b">
              <CardTitle className="text-sm font-black uppercase">Informasi Tambahan</CardTitle>
            </CardHeader>
            <CardContent className="p-4 space-y-4">
              <div><Label className="text-xs font-bold">Benefit</Label><Textarea className="min-h-16 text-xs" value={benefit} onChange={e => setBenefit(e.target.value)} /></div>
              <div><Label className="text-xs font-bold">Note 1 (General)</Label><Textarea className="min-h-16 text-xs mb-2" value={generalNote} onChange={e => setGeneralNote(e.target.value)} /></div>
              <div>
                <Label className="text-xs font-bold mb-1 block">Note 2 (6 Kolom)</Label>
                {note2Rows.map((row, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <Input className="text-xs h-7 w-[20%]" value={row.c1} onChange={e => updateNote2Row(i, "c1", e.target.value)} placeholder="8.33%" />
                    <Input className="text-xs h-7 w-[80%]" value={row.c2} onChange={e => updateNote2Row(i, "c2", e.target.value)} placeholder="66.6%" />
                  </div>
                ))}
              </div>
              <div><Label className="text-xs font-bold">Last time required</Label><Input className="text-xs" value={lastTimeReq} onChange={e => setLastTimeReq(e.target.value)} /></div>
              <div><Label className="text-xs font-bold">Provide Feedback (Row 1)</Label><Textarea className="min-h-16 text-xs" value={feedback} onChange={e => setFeedback(e.target.value)} /></div>
              <div>
                <Label className="text-xs font-bold mb-1 block">Provide Feedback (Rows 2-5)</Label>
                {feedbackRows.map((row, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <Input className="text-xs h-7 w-[20%]" value={row.c1} onChange={e => updateFeedbackRow(i, "c1", e.target.value)} placeholder="8.33%" />
                    <Input className="text-xs h-7 w-[80%]" value={row.c2} onChange={e => updateFeedbackRow(i, "c2", e.target.value)} placeholder="66.6%" />
                  </div>
                ))}
              </div>
              <div>
                <Label className="text-xs font-bold mb-1 block">Last Design Support</Label>
                {lastDesignSupp.map((row, i) => (
                  <div key={i} className="flex gap-2 mb-1">
                    <Input className="text-xs h-7 w-[40%]" value={row.c1} onChange={e => updateLds(i, "c1", e.target.value)} placeholder="10%" />
                    <Input className="text-xs h-7 w-[60%]" value={row.c2} onChange={e => updateLds(i, "c2", e.target.value)} placeholder="15%" />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="ttd" className="space-y-6">
          {/* Signatures Card */}
          <Card className="rounded-2xl border shadow-sm mt-4">
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
          </Card>
          </TabsContent>
          </Tabs>
        </div>

        {/* RIGHT COLUMN - PREVIEW (A4) */}
        <div className="xl:col-span-8 flex justify-center pb-20 print:p-0 print:m-0 print:block overflow-hidden w-full relative h-[600px] sm:h-[900px] xl:h-auto">
            <style dangerouslySetInnerHTML={{__html: `
                @media print {
                    body * { visibility: hidden; }
                    .print-section, .print-section * { visibility: visible; }
                    .print-section { 
                        position: fixed !important; 
                        left: 0 !important; 
                        top: 0 !important; 
                        width: 210mm !important; 
                        height: 297mm !important; 
                        margin: 0 !important; 
                        padding: 5mm 10mm !important; 
                        background: white !important;
                    }
                    @page { size: A4 portrait; margin: 0; }
                }
            `}} />
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 scale-[0.45] sm:scale-[0.75] md:scale-[0.9] xl:scale-100 origin-top xl:relative xl:left-auto xl:transform-none print:relative print:scale-100 print:left-auto print:transform-none w-[210mm]">
              {/* PAPER */}
              <div ref={printRef} className="print-section bg-white border shadow-lg text-black w-full min-h-[297mm] print:border-none print:shadow-none print:max-w-none print:w-[210mm] print:h-[297mm] text-[11px] leading-tight font-serif mx-auto" style={{ padding: "20px 40px" }}>
                
                {/* HEADER LOGO & TITLE */}
                <div className="text-center mb-4">
                    <div className="font-bold text-xl mb-1 tracking-widest text-[#0033A0] flex justify-center items-center gap-2">
                        <img src="/icon-512x512.png" alt="Logo" className="w-8 h-8 object-contain" />
                        PT CHINA GLAZE INDONESIA
                    </div>
                    <div className="font-bold text-[14px]">
                        <span className="text-red-600">D</span>ESIGN <span className="text-red-600">A</span>PPLICATION <span className="text-red-600">R</span>EQUEST / REQUIREMENT / RESEARCH / DEVELOPMENT
                    </div>
                    <div className="text-[12px]">設計申請需求單/研究/開發</div>
                </div>

                {/* TOP TAB & DOC NO */}
                <div className="flex justify-between items-end -mb-[2px] relative z-10">
                    <div className="border-[2px] border-black w-64 h-8 flex items-center px-2 font-bold bg-white">
                        No. 序號 : DAR - {darNo}
                    </div>
                    <div className="text-[8px] pb-1">
                        表號:0-37-001
                    </div>
                </div>

                {/* TABLE BORDER WRAPPER */}
                <div className="border-[2px] border-black w-full flex flex-col relative z-0">
                    
                    {/* ROW 2 & 3 */}
                    <div className="flex border-b border-black h-6">
                        <div className="w-1/2 border-r border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Customer 客戶名稱 :</span> {customer}
                        </div>
                        <div className="w-1/2 flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-pre">Designer 設計師 (D        ):</span> {designer}
                        </div>
                    </div>
                    <div className="flex border-b-[2px] border-black h-6">
                        <div className="w-1/2 border-r border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Entry Date 输入日期 :</span> {entryDate}
                        </div>
                        <div className="w-1/2 flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-pre">Technician 技術員 (T        ):</span> {technician}
                        </div>
                    </div>

                    {/* ROW 4 - CHECKBOXES */}
                    <div className="flex border-b-[2px] border-black h-6 items-center justify-around px-2 font-bold text-[11px]">
                        {["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"].map(p => (
                            <div key={p} className="flex items-center gap-1">
                                <span className="border border-black w-3 h-3 inline-flex items-center justify-center text-[10px] font-bold">
                                    {purpose.includes(p) ? "✓" : ""}
                                </span> {p}
                            </div>
                        ))}
                    </div>

                    {/* ROW 5 */}
                    <div className="flex border-b-[2px] border-black h-7 items-center px-2 font-bold">
                        Design/Item number 設計號 : <span className="ml-2 font-normal">{designNo}</span>
                    </div>

                    {/* MATRIX ITEMS */}
                    <div className="flex border-b-[2px] border-black">
                        {Array.from({ length: numColumns / 8 }).map((_, col) => (
                            <div key={col} className={`flex-1 flex flex-col ${col < (numColumns / 8) - 1 ? 'border-r-[2px] border-black' : ''}`}>
                                {[0,1,2,3,4,5,6,7].map(row => {
                                    const idx = col * 8 + row;
                                    return (
                                        <div key={row} className={`flex h-6 ${row < 7 ? 'border-b border-black' : ''}`}>
                                            <div className="w-8 border-r border-black flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 px-1 flex items-center justify-center overflow-hidden whitespace-nowrap text-[9px] font-medium">
                                                {items[idx]}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    {/* ROW DATES */}
                    <div className="flex border-b-[2px] border-black h-6">
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2">
                            <span className="font-bold whitespace-nowrap text-[11px]">Required date 查詢日期</span>
                        </div>
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2 font-bold">
                            {requiredDate}
                        </div>
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Closing Date 截止日期</span>
                        </div>
                        <div className="w-1/4 flex items-center px-2 font-bold">{closingDate}</div>
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="flex border-b-[2px] border-black">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold">
                            <span>Item</span>
                            <span>項 目</span>
                        </div>
                        <div className="w-[90%] flex flex-col">
                            
                            {/* Type */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Type 分類 :</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Picture圖畫", "Emboss壓花", "Rubber橡膠", "File Image Digital文件圖像數字", "Finish tile完成瓦片"].map(t => {
                                        const cleanVal = t.replace(/[^A-Za-z ]/g, "").trim();
                                        const isChecked = type.includes(cleanVal) || type.includes(t.split("圖")[0].trim());
                                        return (
                                            <div key={t} className="flex items-center gap-1">
                                                <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                    {isChecked ? "✓" : ""}
                                                </span> {t}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* Size */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Size 尺寸:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Large size 大", "Faces _______", "截圖Cut 1:1", "jpg file", "_______cm x _______cm"].map(t => {
                                        let isChecked = false;
                                        if (t.includes("Large size")) isChecked = sizeChecks.includes("Large size");
                                        if (t.includes("Faces")) isChecked = sizeChecks.includes("Faces");
                                        if (t.includes("Cut 1:1")) isChecked = sizeChecks.includes("Cut 1:1");
                                        if (t.includes("jpg file")) isChecked = sizeChecks.includes("jpg file");
                                        if (t.includes("cm x")) isChecked = sizeChecks.includes("Custom");
                                        
                                        return (
                                            <div key={t} className="flex items-center gap-1">
                                                <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                    {isChecked ? "✓" : ""}
                                                </span> 
                                                {t.includes("Faces") ? <span>Faces <span className="border-b border-black min-w-[30px] inline-block text-center">{sizeFaces}</span></span> :
                                                 t.includes("cm x") ? <span><span className="border-b border-black min-w-[20px] inline-block text-center">{sizeCm1}</span> cm x <span className="border-b border-black min-w-[20px] inline-block text-center">{sizeCm2}</span> cm</span> :
                                                 t}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Glaze */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Glaze 釉:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {glazeChecks.includes(t) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {glazeChecks.includes("Residue") ? "✓" : ""}
                                        </span> Residue <span className="border-b border-black min-w-[50px] inline-block text-center">{glazeResidue}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Surface */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Surface 表面:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Matt", "Glossy", "Satin", "Polished", "Anti Slip"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {surfaceChecks.includes(t.trim()) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {surfaceChecks.includes("Temp") ? "✓" : ""}
                                        </span> Temp <span className="border-b border-black min-w-[50px] inline-block text-center">{surfaceTemp}</span>
                                    </div>
                                </div>
                            </div>

                            {/* GU/PTV */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px]">GU/PTV :</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {guPtv.map((v, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {guPtvChecks[i] ? "✓" : ""}
                                            </span>
                                            <span className="border-b border-black min-w-[30px] inline-block text-center">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ink Effect */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px] leading-tight">Ink Effect<br/>水墨效果:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Impression", "Transparent", "SIngking", "Antislip", "Glue"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {inkChecks.includes(t) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {inkChecks.includes("Other") ? "✓" : ""}
                                        </span> <span className="border-b border-black min-w-[50px] inline-block text-center">{inkOther}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Send By */}
                            <div className="flex min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px]">Send by 發送方式:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["USB", "Wetransfer", "CD", "On Glazing Line"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {sendBy.includes(t) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Benefit */}
                    <div className="flex border-b-[2px] border-black min-h-[40px]">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[10px]">
                            <span>Benefit</span>
                            <span>效 益</span>
                        </div>
                        <div className="w-[calc(100%/3-10%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{benefit}</div>
                        <div className="w-[15%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[12px]">
                            Note
                        </div>
                        <div className="w-[calc(200%/3-15%)] p-1 whitespace-pre-wrap break-words text-[10px]">{generalNote}</div>
                    </div>

                    {/* Last time required */}
                    <div className="flex border-b-[2px] border-black h-10 relative">
                        <div className="w-[14%] flex flex-col border-r-[2px] border-black font-bold text-[10px]">
                            <div className="h-1/2 flex items-center px-1 text-[8px] leading-tight whitespace-nowrap">Last time required :</div>
                            <div className="h-1/2 flex items-center justify-between px-1"><span>上</span><span>次</span><span>查</span><span>詢</span></div>
                        </div>
                        <div className="w-[11%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastTimeReq}</div>
                        <div className="w-[15%] flex flex-col font-bold text-[10px]">
                            <div className="h-1/2 flex items-center px-1 text-[9px]">Provide feedback :</div>
                            <div className="h-1/2 flex items-center justify-between px-1"><span>提</span><span>供</span><span>意</span><span>見</span></div>
                        </div>
                        <div className="w-[60%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedback}</div>
                    </div>

                    {/* Last design support */}
                    <div className="relative border-b-[2px] border-black">
                        <div className="absolute top-0 bottom-0 left-0 w-[25%] border-r-[2px] border-black font-bold text-[10px] flex flex-col bg-white z-10">
                            <div className="flex-1 flex items-center px-1">Last design support :</div>
                            <div className="flex-1 flex items-center justify-between px-2"><span>上</span><span>次</span><span>設</span><span>計</span><span>支</span><span>持</span></div>
                        </div>
                        <div className="w-[75%] ml-[25%] flex flex-col">
                            <div className="flex border-b border-black min-h-[24px]">
                                <div className="w-[11.111%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[0]?.c1 || ""}</div>
                                <div className="w-[88.888%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[0]?.c2 || ""}</div>
                            </div>
                            <div className="flex min-h-[24px]">
                                <div className="w-[11.111%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[1]?.c1 || ""}</div>
                                <div className="w-[88.888%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[1]?.c2 || ""}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[0]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[0]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[2]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[2]?.c2 || ""}</div>
                    </div>
                    {/* Extra Row 1 */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[1]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[1]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[3]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[3]?.c2 || ""}</div>
                    </div>
                    {/* Extra Row 2 Removed */}
                    {/* Note Row */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[2]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[2]?.c2 || ""}</div>
                        <div className="w-[75%] flex items-center justify-center font-bold text-[11px]">Note</div>
                    </div>
                    {/* Extra Rows under Note */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[3]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[3]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[0]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[0]?.c2 || ""}</div>
                    </div>
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[4]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[4]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[1]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[1]?.c2 || ""}</div>
                    </div>
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[5]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[5]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[2]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[2]?.c2 || ""}</div>
                    </div>

                    {/* Remarks */}
                    <div className="flex min-h-12 text-[9px]">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[10px]">
                            <span>Remarks</span>
                            <span>備 註</span>
                        </div>
                        <div className="w-[90%] p-1">
                            The design above is listed as an important asset of the company, the person in charge must be provide feedback to the customer about the use of the design in an effective period, the validity period is 60 days, the application development department will track the list and include designs for reference<br/>
                            上述設計被列為公司重要資產，負責人必須在有效期內向客戶提供有關設計使用反饋，有效期為60天，應用研發部將與踪列表並包含設計以供參考。
                        </div>
                    </div>

                </div>

                {/* Signatures */}
                <div className="border-[2px] border-black w-full flex flex-col mt-2">
                    <div className="flex">
                        <div className="w-1/3 flex flex-col border-r-[2px] border-black">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Manager 經理</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.manager && <img src={signatures.manager} className="max-h-full max-w-full object-contain" alt="manager" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Technology Dept 技術部</div>
                        </div>
                        <div className="w-1/3 flex flex-col border-r-[2px] border-black">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Section Head 課長</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.sectionHead && <img src={signatures.sectionHead} className="max-h-full max-w-full object-contain" alt="sectionHead" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Application Dept 應用課</div>
                        </div>
                        <div className="w-1/3 flex flex-col">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Designer/Technician 設計師/技術員</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.designer && <img src={signatures.designer} className="max-h-full max-w-full object-contain" alt="designer" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Person in charge 責任人</div>
                        </div>
                    </div>
                </div>
            </div>
            </div>
        </div>

      </div>
      
      
      {/* HISTORY DIALOG */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-[95vw] h-[90vh] flex flex-col p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden bg-white text-black">
            <div className="p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-blue-600/20 rounded-2xl text-left"><History className="h-6 w-6 text-blue-400" /></div>
                    <div className="text-left">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-left">Riwayat Form DAR</DialogTitle>
                        <DialogDescription className="text-white/40 text-[9px] font-black uppercase tracking-widest text-left">Internal Document Control</DialogDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="text-black bg-white hover:bg-slate-100 rounded-xl">
                        <Upload className="h-4 w-4 mr-2" /> Import
                    </Button>
                    <Button onClick={handleExportExcel} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl">
                        <FileSpreadsheet className="h-4 w-4 mr-2" /> Export
                    </Button>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><X className="h-6 w-6" /></Button></DialogClose>
                </div>
            </div>
            
            <div className={`p-6 border-b flex items-center gap-4 transition-colors ${historySearch ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${historySearch ? 'text-blue-500' : 'text-slate-300 group-focus-within:text-blue-400'}`} />
                    <Input 
                        placeholder="Cari No DAR, Customer, Designer, atau Item..." 
                        value={historySearch} 
                        onChange={(e) => setHistorySearch(e.target.value)} 
                        className={`pl-11 h-12 rounded-xl transition-all focus-visible:ring-blue-500 ${historySearch ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-md' : 'bg-white shadow-sm border-slate-200 hover:border-slate-300'}`} 
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1 w-full">
                <div className="p-6 flex flex-col gap-4 w-full">
                    {loadingHistory ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                        </div>
                    ) : (
                        <div className="border rounded-xl overflow-x-auto bg-white shadow-sm">
                            <table className="w-full text-left text-xs whitespace-nowrap">
                                <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="p-3 pl-4">No. DAR</th>
                                        <th className="p-3">Waktu</th>
                                        <th className="p-3">Customer</th>
                                        <th className="p-3">Designer</th>
                                        <th className="p-3">Design No</th>
                                        <th className="p-3">Items</th>
                                        <th className="p-3 text-right pr-4">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {historyData.filter(r => {
                                        const searchLower = historySearch.toLowerCase();
                                        return (r.darNo || '').toLowerCase().includes(searchLower) || 
                                            (r.customer || '').toLowerCase().includes(searchLower) || 
                                            (r.designer || '').toLowerCase().includes(searchLower) ||
                                            (r.items && Array.isArray(r.items) && r.items.some((item: string) => (item || '').toLowerCase().includes(searchLower)));
                                    }).map(report => (
                                        <tr key={report.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors">
                                            <td className="p-3 pl-4 font-bold text-blue-700">{highlightMatch(report.darNo || '', historySearch)}</td>
                                            <td className="p-3 text-slate-500">
                                                {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : report.entryDate}
                                                {report.updatedAt?.seconds && <span className="ml-1.5 px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px]" title={`Diupdate oleh: ${report.updatedBy || 'Sistem'}`}>Upd</span>}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900">{highlightMatch(report.customer || '-', historySearch)}</td>
                                            <td className="p-3">{highlightMatch(report.designer || '-', historySearch)}</td>
                                            <td className="p-3">{highlightMatch(report.designNo || '-', historySearch)}</td>
                                            <td className="p-3">
                                                {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {report.items.filter(Boolean).map((item: string, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="text-[9px] font-medium bg-slate-100 text-slate-600 rounded">
                                                                {highlightMatch(item, historySearch)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-2 pr-4 text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                {confirmDeleteId === report.id ? (
                                                    <>
                                                        <Button variant="outline" size="icon" onClick={() => setConfirmDeleteId(null)} className="h-7 w-7 text-slate-400 rounded-lg" disabled={isDeleting}><X className="h-4 w-4" /></Button>
                                                        <Button onClick={() => handleDeleteReport(report.id)} className="h-7 w-7 bg-rose-600 text-white rounded-lg" disabled={isDeleting}>
                                                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                                                        </Button>
                                                    </>
                                                ) : (
                                                    <>
                                                        <Button onClick={() => setPreviewReportId(report.id)} className="h-7 text-[10px] bg-blue-600 hover:bg-blue-700 text-white px-3 rounded-lg font-bold">Preview</Button>
                                                        <Button onClick={() => loadReport(report)} className="h-7 text-[10px] bg-slate-900 hover:bg-black text-white px-3 rounded-lg font-bold">Muat</Button>
                                                        {user?.role === 'Admin' && (
                                                            <Button variant="outline" size="icon" onClick={() => setConfirmDeleteId(report.id)} className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                    {!loadingHistory && historyData.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20 text-black">
                            <History className="h-12 w-12" />
                            <p className="font-black uppercase tracking-widest text-xs">Belum ada riwayat form DAR</p>
                        </div>
                    )}
                </div>
            </ScrollArea>
        </DialogContent>
      </Dialog>
      
      {/* PREVIEW DIALOG */}
      <Dialog open={!!previewReportId} onOpenChange={(open) => !open && setPreviewReportId(null)}>
        <DialogContent className="sm:max-w-4xl max-w-[95vw] h-[95vh] p-0 border-none rounded-xl shadow-2xl overflow-hidden bg-slate-200 flex flex-col">
          <div className="flex items-center justify-between p-4 bg-white border-b shadow-sm z-10">
            <DialogTitle className="text-lg font-bold">Preview Form DAR</DialogTitle>
            <DialogClose asChild><Button variant="ghost" size="icon"><X className="h-5 w-5" /></Button></DialogClose>
          </div>
          <div className="flex-1 w-full bg-slate-200 relative overflow-hidden">
             {previewReportId && <iframe src={`/form-app/preview/${previewReportId}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
