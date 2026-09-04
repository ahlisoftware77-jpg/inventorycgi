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
import {  Printer, Download, Save, Info, FileText, Pencil, Trash, Lock, Unlock, User, History, Share2, Loader2, X, Search, Check, Trash2, FileSpreadsheet, Upload, AlertTriangle , Plus, ChevronUp, ChevronDown } from "lucide-react";
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import { useSearchParams } from "next/navigation";
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

export function FormAppContent({ isPublic = false }: { isPublic?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const publicId = searchParams.get('id');
  const paramDarNo = searchParams.get('darNo');
  const [isSharing, setIsSharing] = useState(false);

  useEffect(() => {
    if (publicId && !editId) {
      const loadPublicReport = async () => {
        try {
          const docRef = doc(db, 'form_dar', publicId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            loadReport({ id: snap.id, ...snap.data() });
          }
        } catch (e) {
          console.error("Error loading public report", e);
        }
      };
      loadPublicReport();
    }
  }, [publicId]);

  useEffect(() => {
    if (paramDarNo) {
      setDarNo(paramDarNo);
    }
  }, [paramDarNo]);

  const handleSharePublicLink = async (idToShare?: string) => {
    setIsSharing(true);
    const targetId = idToShare || editId;
    if (!targetId) {
        toast({ title: "Gagal", description: "Tidak ada form yang dipilih untuk dibagikan.", variant: "destructive" });
        setIsSharing(false);
        return;
    }
    const publicUrl = `${window.location.origin}/public/form-dar?id=${targetId}`;
    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Form DAR - ' + customer,
            url: publicUrl,
          });
          setIsSharing(false);
          return;
        } catch (shareError: any) {
          if (shareError.name === 'AbortError') {
            setIsSharing(false);
            return;
          }
        }
      }
      await navigator.clipboard.writeText(publicUrl);
      toast({ title: "Berhasil", description: "Link berhasil disalin ke clipboard!" });
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal menyalin link.", variant: "destructive" });
    }
    setIsSharing(false);
  };

  const [hasAccess, setHasAccess] = useState(false);
  const [loading, setLoading] = useState(true);
  const printRef = useRef<HTMLDivElement>(null);

  // History State
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyData, setHistoryData] = useState<any[]>([]);
  const [historySearch, setHistorySearch] = useState("");
  const [historySortConfig, setHistorySortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

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
  const [typeDesign, setTypeDesign] = useState("");
  const [designSource, setDesignSource] = useState("");
  const [status, setStatus] = useState("FREE");
  
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
      if (isPublic) {
        setHasAccess(true);
        setLoading(false);
        return;
      }
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
            if (first.type) setType(first.type.split(',').map((s:string)=>s.trim()).filter(Boolean));
            if (first.sendBy) setSendBy(first.sendBy.split(',').map((s:string)=>s.trim()).filter(Boolean));
            if (first.benefit) setPurpose(first.benefit.split(',').map((s:string)=>s.trim()).filter(Boolean));
            
            // Populate basic custom text inputs
            if (first.sizeFaces) setSizeFaces(first.sizeFaces);
            if (first.sizeCm1) setSizeCm1(first.sizeCm1);
            if (first.sizeCm2) setSizeCm2(first.sizeCm2);
            if (first.glazeResidue) setGlazeResidue(first.glazeResidue);
            if (first.surfaceTemp) setSurfaceTemp(first.surfaceTemp);
            if (first.inkOther) setInkOther(first.inkOther);
            
            // Populate checkbox/array fields if they exist in string form (comma separated)
            if (first.sizeChecks) setSizeChecks(first.sizeChecks.split(',').map((s:string)=>s.trim()).filter(Boolean));
            if (first.glazeChecks) setGlazeChecks(first.glazeChecks.split(',').map((s:string)=>s.trim()).filter(Boolean));
            if (first.surfaceChecks) setSurfaceChecks(first.surfaceChecks.split(',').map((s:string)=>s.trim()).filter(Boolean));
            if (first.inkChecks) setInkChecks(first.inkChecks.split(',').map((s:string)=>s.trim()).filter(Boolean));
            
            // Populate GU/PTV Arrays
            setGuPtv([
              first.guPtv || "", first.guPtv2 || "", first.guPtv3 || "",
              first.guPtv4 || "", first.guPtv5 || "", first.guPtv6 || ""
            ]);
            const gchecks = [false, false, false, false, false, false];
            if (first.guPtvChecks === "Checkbox") {
                if (first.guPtv) gchecks[0] = true;
                if (first.guPtv2) gchecks[1] = true;
                if (first.guPtv3) gchecks[2] = true;
                if (first.guPtv4) gchecks[3] = true;
                if (first.guPtv5) gchecks[4] = true;
                if (first.guPtv6) gchecks[5] = true;
            }
            setGuPtvChecks(gchecks);
            
            const parseGrid = (str: any, defaultLen: number) => {
                try {
                    const p = JSON.parse(str || "[]");
                    if (Array.isArray(p) && p.length > 0) return p;
                    return Array.from({ length: defaultLen }, () => ({ c1: "", c2: "" }));
                } catch(e) {
                    return Array.from({ length: defaultLen }, () => ({ c1: "", c2: "" }));
                }
            };

            setNote2Rows(parseGrid(first.note2, 3));
            setFeedbackRows(parseGrid(first.feedbackDetails, 4));
            setLastDesignSupp(parseGrid(first.lastDesignSupp, 6));
            
            if (first.lastTimeReq) setLastTimeReq(first.lastTimeReq);
            if (first.feedback) setFeedback(first.feedback);
            
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
    
    // Prevent React synthetic event objects from being spread into Firestore payload
    const isEvent = overrides && (overrides.nativeEvent || overrides.preventDefault);
    const validOverrides = isEvent ? {} : (overrides || {});
    
    try {
      // Extract current signatures directly from canvas refs to ensure latest data
      const currentSignatures = {
        manager: sigManager.current?.isEmpty() ? signatures.manager : sigManager.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.manager,
        sectionHead: sigSectionHead.current?.isEmpty() ? signatures.sectionHead : sigSectionHead.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.sectionHead,
        designer: sigDesigner.current?.isEmpty() ? signatures.designer : sigDesigner.current?.getTrimmedCanvas().toDataURL('image/png') || signatures.designer,
      };
      setSignatures(currentSignatures);
      
      const payload = {
        darNo, customer, entryDate, designer, technician, purpose, designNo, typeDesign, designSource, status, items,
        requiredDate, closingDate, type, sizeChecks, sizeFaces, sizeCm1, sizeCm2,
        glazeChecks, glazeResidue, surfaceChecks, surfaceTemp, guPtv, guPtvChecks, inkChecks, inkOther, sendBy,
        benefit, lastTimeReq, feedback, feedbackRows, lastDesignSupp, note2Rows, generalNote,
        signatures: currentSignatures, lockedSignatures, penColors, numColumns,
        createdBy: user?.uid || "unknown",
        updatedBy: user?.displayName || user?.email || user?.uid || "unknown",
        updatedAt: new Date(),
        ...validOverrides
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
      fetchHistory(true); // Refetch automatically to update datalists
    } catch (e) {
      console.error("Save error:", e);
      toast({ title: "Gagal", description: "Gagal menyimpan form DAR", variant: "destructive" });
    }
  };

  const fetchHistory = async (force: boolean = false) => {
    if (!force && historyData.length > 0) return;
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
    fetchHistory();
  }, []); // Fetch history immediately so autocomplete datalists are populated

  const handleSortHistory = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (historySortConfig && historySortConfig.key === key && historySortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setHistorySortConfig({ key, direction });
  };

  const sortedHistoryData = React.useMemo(() => {
    let sortableItems = [...historyData];
    if (historySortConfig !== null) {
      sortableItems.sort((a, b) => {
        let aVal = a[historySortConfig.key] || "";
        let bVal = b[historySortConfig.key] || "";
        
        if (historySortConfig.key === "createdAt") {
            aVal = a.createdAt?.seconds || 0;
            bVal = b.createdAt?.seconds || 0;
        }

        if (aVal < bVal) {
          return historySortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aVal > bVal) {
          return historySortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [historyData, historySortConfig]);

  const loadReport = (report: any) => {
    setEditId(report.id || null);
    setDarNo(report.darNo || "");
    setCustomer(report.customer || "");
    setEntryDate(report.entryDate || "");
    setDesigner(report.designer || "");
    setTechnician(report.technician || "");
    setPurpose(report.purpose || []);
    setDesignNo(report.designNo || "");
    setTypeDesign(report.typeDesign || "");
    setDesignSource(report.designSource || "");
    setStatus(report.status || "FREE");
    
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
    setTypeDesign("");
    setDesignSource("");
    setStatus("FREE");
    
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

  const getStatusColor = (val: string) => {
    switch(val) {
      case 'IN LOCK': return 'bg-rose-500 text-white border-rose-600';
      case 'IN USE': return 'bg-emerald-500 text-white border-emerald-600';
      case 'FREE': return 'bg-blue-500 text-white border-blue-600';
      case 'ARCHIVE': return 'bg-sky-400 text-white border-sky-500';
      default: return 'bg-white text-slate-900 border-slate-200';
    }
  };

  const handleUpdateHistoryField = async (id: string, field: string, value: string) => {
    try {
      await updateDoc(doc(db, "form_dar", id), { [field]: value });
      setHistoryData(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
    } catch (e) {
      toast({ title: "Gagal", description: "Gagal memperbarui data", variant: "destructive" });
    }
  };

  const handleExportExcel = () => {
    if (historyData.length === 0) return;
    
    const exportData = historyData.map(r => {
      const row: any = {
        "No. DAR": r.darNo || "",
        "Customer": r.customer || "",
        "Entry Date": r.entryDate || "",
        "Designer": r.designer || "",
        "Technician": r.technician || "",
        "Design No": r.designNo || "",
        "Required Date": r.requiredDate || "",
        "Closing Date": r.closingDate || "",
        "Purpose": (r.purpose || []).join(", "),
        "Tipe Desain": r.typeDesign || "",
        "Sumber Desain": r.designSource || "",
        "Status": r.status || "FREE",
      };

      for (let i = 0; i < 32; i++) {
        row[`Item ${i + 1}`] = r.items?.[i] || "";
      }

      row["Type"] = (r.type || []).join(", ");
      row["Size Checks"] = (r.sizeChecks || []).join(", ");
      row["Size Faces"] = r.sizeFaces || "";
      row["Size Cm 1"] = r.sizeCm1 || "";
      row["Size Cm 2"] = r.sizeCm2 || "";
      
      row["Glaze Checks"] = (r.glazeChecks || []).join(", ");
      row["Glaze Residue"] = r.glazeResidue || "";

      row["Surface Checks"] = (r.surfaceChecks || []).join(", ");
      row["Surface Temp"] = r.surfaceTemp || "";

      for (let i = 0; i < 6; i++) {
        row[`GU PTV ${i + 1}`] = r.guPtv?.[i] || "";
        row[`GU PTV Check ${i + 1}`] = r.guPtvChecks?.[i] ? "Yes" : "No";
      }

      row["Ink Checks"] = (r.inkChecks || []).join(", ");
      row["Ink Other"] = r.inkOther || "";
      row["Send By"] = (r.sendBy || []).join(", ");

      row["Benefit"] = r.benefit || "";
      row["Last Time Request"] = r.lastTimeReq || "";
      row["Feedback"] = r.feedback || "";

      for (let i = 0; i < 4; i++) {
        row[`Feedback Row ${i + 1} Col 1`] = r.feedbackRows?.[i]?.c1 || "";
        row[`Feedback Row ${i + 1} Col 2`] = r.feedbackRows?.[i]?.c2 || "";
      }

      for (let i = 0; i < 3; i++) {
        row[`Note 2 Row ${i + 1} Col 1`] = r.note2Rows?.[i]?.c1 || "";
        row[`Note 2 Row ${i + 1} Col 2`] = r.note2Rows?.[i]?.c2 || "";
      }

      for (let i = 0; i < 6; i++) {
        row[`Last Design Supp ${i + 1} Col 1`] = r.lastDesignSupp?.[i]?.c1 || "";
        row[`Last Design Supp ${i + 1} Col 2`] = r.lastDesignSupp?.[i]?.c2 || "";
      }

      row["General Note"] = r.generalNote || "";
      
      return row;
    });
    
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
        
        toast({ title: "Import Selesai", description: `${imported} data baru ditambahkan. ${updated} data diperbarui. ${skipped} data dilewati (tidak ada yang baru).` });
        
        fetchHistory(true);
        
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

  const signatureCard = (
          <Card className="rounded-2xl border shadow-sm w-full max-w-[210mm] print:hidden">
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
  );

  const defaultTypeDesign = ["CG", "CGI", "CGI-A", "ST", "CGL", "CO"];
  const dynamicTypeDesignOptions = Array.from(new Set([
    ...defaultTypeDesign,
    ...historyData.map(r => r.typeDesign).filter(Boolean)
  ])).sort();

  const defaultDesignSource = ["MidJourney", "Shutterstock", "Create"];
  const dynamicDesignSourceOptions = Array.from(new Set([
    ...defaultDesignSource,
    ...historyData.map(r => r.designSource).filter(Boolean)
  ])).sort();

  const defaultDesigner = ["D1 Riki", "D2 Diaz", "D3 Rian", "D4 Darmawan"];
  const dynamicDesignerOptions = Array.from(new Set([
    ...defaultDesigner,
    ...historyData.map(r => r.designer).filter(Boolean)
  ])).sort();

  const defaultTechnician = ["T1 Darta", "T2 Kardani", "T3 Rafli", "T4 Cepi"];
  const dynamicTechnicianOptions = Array.from(new Set([
    ...defaultTechnician,
    ...historyData.map(r => r.technician).filter(Boolean)
  ])).sort();

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
        <div className={`xl:col-span-4 space-y-6 print:hidden max-h-[85vh] overflow-y-auto pr-2 custom-scrollbar ${isPublic ? 'hidden' : ''}`}>
          
          <div className="flex flex-col gap-2 sticky top-0 bg-slate-50 dark:bg-slate-950 z-10 py-2 border-b">
            <div className="flex gap-2">
              <Button onClick={resetForm} variant="outline" className="flex-1 border-blue-600 text-blue-600 hover:bg-blue-50 px-1"><Plus className="w-4 h-4 sm:mr-2" /> <span className="hidden sm:inline">Buat Baru</span></Button>
              <Button onClick={() => handleSharePublicLink()} disabled={isSharing || !editId} variant="outline" className="flex-1 border-purple-200 text-purple-700 hover:bg-purple-50 px-1">
                {isSharing ? <Loader2 className="w-4 h-4 sm:mr-2 animate-spin" /> : <Share2 className="w-4 h-4 sm:mr-2" />} <span className="hidden sm:inline">Bagikan</span>
              </Button>
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
                <div><Label className="text-xs font-bold">Designer</Label><input list="designerOptions" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={designer} onChange={e => setDesigner(e.target.value)} placeholder="Pilih / Ketik Designer..." /></div>
              </div>
              <div><Label className="text-xs font-bold">Technician</Label><input list="technicianOptions" className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" value={technician} onChange={e => setTechnician(e.target.value)} placeholder="Pilih / Ketik Technician..." /></div>
              <div>
                <Label className="text-xs font-bold mb-2 block">Tujuan</Label>
                <div className="flex flex-wrap gap-3">
                  {["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"].map(p => (
                    <label key={p} className="flex items-center gap-1 text-xs cursor-pointer"><Checkbox checked={purpose.includes(p)} onCheckedChange={() => toggleArray(purpose, setPurpose, p)} /> {p}</label>
                  ))}
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-2 mt-4 pt-4 border-t">
                <div>
                  <Label className="text-xs font-bold text-slate-500">Status <span className="font-normal">(Internal Riwayat)</span></Label>
                  <select 
                    value={status} 
                    onChange={e => setStatus(e.target.value)} 
                    className={`flex h-10 w-full rounded-md border px-3 py-2 text-xs font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${getStatusColor(status)}`}
                  >
                    <option value="" className="bg-white text-slate-900">Pilih Status...</option>
                    <option value="IN LOCK" className="bg-rose-500 text-white">IN LOCK</option>
                    <option value="IN USE" className="bg-emerald-500 text-white">IN USE</option>
                    <option value="FREE" className="bg-blue-500 text-white">FREE</option>
                    <option value="ARCHIVE" className="bg-sky-400 text-white">ARCHIVE</option>
                  </select>
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Tipe Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="typeDesainOptions" value={typeDesign} onChange={e => setTypeDesign(e.target.value)} className={`flex h-10 w-full rounded-md border px-3 py-2 text-sm font-bold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 transition-colors ${getTypeDesignColor(typeDesign)}`} placeholder="Pilih / Ketik..." />
                </div>
                <div>
                  <Label className="text-xs font-bold text-slate-500">Sumber Desain <span className="font-normal">(Internal)</span></Label>
                  <input list="sumberDesainOptions" value={designSource} onChange={e => setDesignSource(e.target.value)} className="flex h-10 w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500" placeholder="Pilih / Ketik..." />
                </div>
              </div>

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
        <div className={`${isPublic ? 'xl:col-span-12' : 'xl:col-span-8'} flex flex-col items-center gap-6 pb-20 print:p-0 print:m-0 print:block w-full`}>
            {isPublic && (
                <div className="w-full max-w-[210mm] flex justify-between items-center p-4 bg-white rounded-2xl shadow-sm border border-slate-200 mt-2">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2"><FileText className="w-5 h-5 text-blue-600" /> Form DAR #{darNo}</h2>
                    <Button onClick={handleSave} disabled={isSharing} className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold shadow-sm">
                        {isSharing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />} Simpan Tanda Tangan
                    </Button>
                </div>
            )}
            
            {isPublic && (
                <div className="w-full flex justify-center">
                    {signatureCard}
                </div>
            )}

            <div className="overflow-visible w-full relative h-[550px] sm:h-[880px] md:h-[1050px] xl:h-auto flex justify-center pb-10">
                <style dangerouslySetInnerHTML={{__html: `
                    @font-face {
                        font-family: 'CGIFont';
                        src: url('/cgi.otf') format('opentype');
                        font-weight: normal;
                        font-style: normal;
                    }
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
                    <div className="font-bold text-xl mb-1 tracking-widest text-[#0033A0] flex justify-center items-center gap-2" style={{ fontFamily: "'CGIFont', serif" }}>
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
                        Design/Item number 設計號 : <span className="ml-2 font-normal"></span>
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
                                        if (t.includes("cm x")) isChecked = sizeChecks.includes("Custom cm") || sizeChecks.includes("Custom");
                                        
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
                                            {glazeChecks.includes("Residue") || glazeChecks.includes("Residue (Input)") ? "✓" : ""}
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
                                            {surfaceChecks.includes("Temp") || surfaceChecks.includes("Temp (Input)") ? "✓" : ""}
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
                                            {inkChecks.includes("Checkbox") || inkChecks.includes("Checkbox (Input)") ? "✓" : ""}
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
      </div>
      
      
      {/* HISTORY DIALOG */}
      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="max-w-[95vw] w-full h-[90vh] flex flex-col p-0 border-none rounded-2xl sm:rounded-[2rem] shadow-2xl overflow-hidden bg-white text-black">
            <div className="p-4 sm:p-8 bg-slate-900 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                    <div className="p-2 sm:p-3 bg-blue-600/20 rounded-xl sm:rounded-2xl text-left"><History className="h-5 w-5 sm:h-6 sm:w-6 text-blue-400" /></div>
                    <div className="text-left">
                        <DialogTitle className="text-lg sm:text-xl font-black uppercase tracking-tight text-left">Riwayat Form DAR</DialogTitle>
                        <DialogDescription className="text-white/40 text-[9px] font-black uppercase tracking-widest text-left">Internal Document Control</DialogDescription>
                    </div>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                    <input type="file" ref={fileInputRef} onChange={handleImportExcel} accept=".xlsx, .xls" className="hidden" />
                    <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 sm:flex-none text-black bg-white hover:bg-slate-100 rounded-xl px-2 sm:px-4">
                        <Upload className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Import</span>
                    </Button>
                    <Button onClick={handleExportExcel} className="flex-1 sm:flex-none bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl px-2 sm:px-4">
                        <FileSpreadsheet className="h-4 w-4 mr-1 sm:mr-2" /> <span className="hidden sm:inline">Export</span>
                    </Button>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><X className="h-5 w-5 sm:h-6 sm:w-6" /></Button></DialogClose>
                </div>
            </div>
            
            <div className={`p-4 sm:p-6 border-b flex items-center gap-4 transition-colors ${historySearch ? 'bg-blue-50/50' : 'bg-slate-50'}`}>
                <div className="relative flex-1 group">
                    <Search className={`absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 h-4 w-4 transition-colors ${historySearch ? 'text-blue-500' : 'text-slate-300 group-focus-within:text-blue-400'}`} />
                    <Input 
                        placeholder="Cari No DAR, Customer..." 
                        value={historySearch} 
                        onChange={(e) => setHistorySearch(e.target.value)} 
                        className={`pl-9 sm:pl-11 h-10 sm:h-12 text-xs sm:text-sm rounded-xl transition-all focus-visible:ring-blue-500 ${historySearch ? 'bg-white border-blue-400 ring-2 ring-blue-500/20 shadow-md' : 'bg-white shadow-sm border-slate-200 hover:border-slate-300'}`} 
                    />
                </div>
            </div>
            
            <ScrollArea className="flex-1 w-full max-w-full relative min-w-0">
                <div className="p-2 sm:p-6 flex flex-col gap-4 w-full max-w-full min-w-0">
                    {loadingHistory ? (
                        <div className="space-y-2">
                            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
                        </div>
                    ) : (
                        <>
                            {/* MOBILE LIST */}
                            <div className="flex sm:hidden flex-col gap-3 min-w-0">
                                {sortedHistoryData.filter(r => {
                                    const searchLower = historySearch.toLowerCase();
                                    return (r.darNo || '').toLowerCase().includes(searchLower) || 
                                        (r.customer || '').toLowerCase().includes(searchLower) || 
                                        (r.designer || '').toLowerCase().includes(searchLower) ||
                                        (r.items && Array.isArray(r.items) && r.items.some((item: string) => (item || '').toLowerCase().includes(searchLower)));
                                }).map(report => (
                                    <div key={report.id} className="bg-white border rounded-xl p-4 flex flex-col gap-3 shadow-sm relative">
                                        <div className="flex justify-between items-start">
                                            <div className="flex flex-col min-w-0">
                                                <span className="font-black text-blue-700 text-sm truncate">{highlightMatch(report.darNo || '', historySearch)}</span>
                                                <span className="text-slate-500 text-[10px]">
                                                    {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : report.entryDate}
                                                </span>
                                            </div>
                                            <div className="flex gap-1.5 shrink-0 ml-2">
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
                                                        <Button variant="outline" size="icon" onClick={() => handleSharePublicLink(report.id)} className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg">
                                                            <Share2 className="h-3.5 w-3.5" />
                                                        </Button>
                                                        <Button onClick={() => loadReport(report)} className="h-7 text-[10px] bg-slate-900 hover:bg-black text-white px-3 rounded-lg font-bold">Muat</Button>
                                                        {user?.role === 'Admin' && (
                                                            <Button variant="outline" size="icon" onClick={() => setConfirmDeleteId(report.id)} className="h-7 w-7 text-rose-600 hover:bg-rose-50 rounded-lg">
                                                                <Trash2 className="h-3.5 w-3.5" />
                                                            </Button>
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Customer</span>
                                                <span className="font-semibold truncate">{highlightMatch(report.customer || '-', historySearch)}</span>
                                            </div>
                                            <div className="flex flex-col min-w-0">
                                                <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Designer</span>
                                                <span className="truncate">{highlightMatch(report.designer || '-', historySearch)}</span>
                                            </div>
                                        </div>
                                        <div className="flex flex-col">
                                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-1">Items</span>
                                            {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? (
                                                <div className="flex flex-wrap gap-1">
                                                    {report.items.filter(Boolean).slice(0, 6).map((item: string, idx: number) => (
                                                        <Badge key={idx} variant="secondary" className="text-[9px] font-medium bg-slate-100 text-slate-600 rounded px-1.5 py-0 truncate max-w-full">
                                                            {highlightMatch(item, historySearch)}
                                                        </Badge>
                                                    ))}
                                                    {report.items.filter(Boolean).length > 6 && <span className="text-[9px] text-slate-400 bg-slate-50 px-1 rounded shrink-0">+{report.items.filter(Boolean).length - 6}</span>}
                                                </div>
                                            ) : <span className="text-slate-300 text-[10px]">-</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* DESKTOP TABLE */}
                            <div className="hidden sm:block border rounded-xl overflow-x-auto overflow-y-hidden bg-white shadow-sm w-full max-w-full min-w-0">
                                <table className="w-full min-w-max text-left text-[10px] sm:text-xs whitespace-nowrap">
                                <thead className="bg-slate-100 border-b text-slate-600 font-bold uppercase tracking-wider text-[10px]">
                                    <tr>
                                        <th className="p-3 pl-4 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("darNo")}>
                                            <div className="flex items-center gap-1">
                                                No. DAR
                                                {historySortConfig?.key === "darNo" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("createdAt")}>
                                            <div className="flex items-center gap-1">
                                                Waktu
                                                {historySortConfig?.key === "createdAt" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("customer")}>
                                            <div className="flex items-center gap-1">
                                                Customer
                                                {historySortConfig?.key === "customer" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("designer")}>
                                            <div className="flex items-center gap-1">
                                                Designer
                                                {historySortConfig?.key === "designer" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("designNo")}>
                                            <div className="flex items-center gap-1">
                                                Design No
                                                {historySortConfig?.key === "designNo" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3">Items</th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("status")}>
                                            <div className="flex items-center gap-1">
                                                Status
                                                {historySortConfig?.key === "status" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("typeDesign")}>
                                            <div className="flex items-center gap-1">
                                                Tipe Desain
                                                {historySortConfig?.key === "typeDesign" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 cursor-pointer hover:bg-slate-200 transition-colors select-none" onClick={() => handleSortHistory("designSource")}>
                                            <div className="flex items-center gap-1">
                                                Sumber Desain
                                                {historySortConfig?.key === "designSource" ? (
                                                    historySortConfig.direction === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                                                ) : <div className="w-3" />}
                                            </div>
                                        </th>
                                        <th className="p-3 text-right pr-4 sticky right-0 bg-slate-100 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {sortedHistoryData.filter(r => {
                                        const searchLower = historySearch.toLowerCase();
                                        return (r.darNo || '').toLowerCase().includes(searchLower) || 
                                            (r.customer || '').toLowerCase().includes(searchLower) || 
                                            (r.designer || '').toLowerCase().includes(searchLower) ||
                                            (r.items && Array.isArray(r.items) && r.items.some((item: string) => (item || '').toLowerCase().includes(searchLower)));
                                    }).map(report => (
                                        <tr key={report.id} className="border-b last:border-0 hover:bg-slate-50 transition-colors group">
                                            <td className="p-3 pl-4 font-bold text-blue-700">{highlightMatch(report.darNo || '', historySearch)}</td>
                                            <td className="p-3 text-slate-500">
                                                {report.createdAt?.seconds ? new Date(report.createdAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'short', timeStyle: 'short' }) : report.entryDate}
                                                {report.updatedAt?.seconds && <span className="ml-1.5 px-1 py-0.5 bg-amber-50 text-amber-600 rounded text-[9px]" title={`Diupdate oleh: ${report.updatedBy || 'Sistem'}`}>Upd</span>}
                                            </td>
                                            <td className="p-3 font-semibold text-slate-900 max-w-[150px] truncate">{highlightMatch(report.customer || '-', historySearch)}</td>
                                            <td className="p-3 max-w-[120px] truncate">{highlightMatch(report.designer || '-', historySearch)}</td>
                                            <td className="p-3 max-w-[120px] truncate">{highlightMatch(report.designNo || '-', historySearch)}</td>
                                            <td className="p-3 whitespace-normal min-w-[150px] max-w-[250px]">
                                                {report.items && Array.isArray(report.items) && report.items.filter(Boolean).length > 0 ? (
                                                    <div className="flex flex-wrap gap-1">
                                                        {report.items.filter(Boolean).map((item: string, idx: number) => (
                                                            <Badge key={idx} variant="secondary" className="text-[9px] font-medium bg-slate-100 text-slate-600 rounded truncate max-w-full">
                                                                {highlightMatch(item, historySearch)}
                                                            </Badge>
                                                        ))}
                                                    </div>
                                                ) : <span className="text-slate-300">-</span>}
                                            </td>
                                            <td className="p-3">
                                                <select 
                                                    value={report.status || "FREE"} 
                                                    onChange={e => handleUpdateHistoryField(report.id, 'status', e.target.value)} 
                                                    className={`flex h-8 w-20 rounded border px-2 text-[9px] font-bold outline-none transition-colors cursor-pointer ${getStatusColor(report.status || "FREE")}`}
                                                >
                                                    <option value="IN LOCK" className="bg-rose-500 text-white">IN LOCK</option>
                                                    <option value="IN USE" className="bg-emerald-500 text-white">IN USE</option>
                                                    <option value="FREE" className="bg-blue-500 text-white">FREE</option>
                                                    <option value="ARCHIVE" className="bg-sky-400 text-white">ARCHIVE</option>
                                                </select>
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    list="typeDesainOptions" 
                                                    value={report.typeDesign || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'typeDesign', e.target.value)} 
                                                    className={`border p-1 rounded text-[10px] font-bold w-24 focus:ring-2 focus:ring-blue-500 outline-none transition-colors ${getTypeDesignColor(report.typeDesign || "")}`} 
                                                    placeholder="Tipe..." 
                                                />
                                            </td>
                                            <td className="p-3">
                                                <input 
                                                    list="sumberDesainOptions" 
                                                    value={report.designSource || ""} 
                                                    onChange={(e) => handleUpdateHistoryField(report.id, 'designSource', e.target.value)} 
                                                    className="border p-1 rounded text-[10px] w-28 bg-white focus:ring-2 focus:ring-blue-500 outline-none" 
                                                    placeholder="Sumber..." 
                                                />
                                            </td>
                                            <td className="p-2 pr-4 text-right sticky right-0 bg-white group-hover:bg-slate-50 shadow-[-4px_0_12px_rgba(0,0,0,0.03)] z-10">
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
                                                        <Button variant="outline" size="icon" onClick={() => handleSharePublicLink(report.id)} className="h-7 w-7 text-purple-600 hover:bg-purple-50 rounded-lg">
                                                            <Share2 className="h-3.5 w-3.5" />
                                                        </Button>
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
                        </>
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
            {previewReportId && <iframe src={`/form-app/preview?id=${previewReportId}`} className="w-full h-full border-none absolute inset-0" />}
          </div>
        </DialogContent>
      </Dialog>

      <datalist id="typeDesainOptions">
          {dynamicTypeDesignOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      <datalist id="sumberDesainOptions">
          {dynamicDesignSourceOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      <datalist id="designerOptions">
          {dynamicDesignerOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
      <datalist id="technicianOptions">
          {dynamicTechnicianOptions.map(opt => <option key={opt} value={opt} />)}
      </datalist>
    </DashboardLayout>
  );
}

export default function FormAppPage() {
  return <FormAppContent />;
}
