'use client';

import { useState, useRef, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Printer, 
  Save, 
  Loader2, 
  Pencil, 
  Trash, 
  History, 
  Search, 
  Eye, 
  Lock, 
  Unlock, 
  ShieldCheck, 
  User, 
  Share2, 
  Check,
  Type,
  Info,
  X,
  ExternalLink,
  Hash,
  AlertCircle,
  Ticket,
  Trash2
} from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase/config';
import { collection, addDoc, serverTimestamp, query, orderBy, onSnapshot, doc, updateDoc, getDoc, deleteDoc, where } from 'firebase/firestore';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import SignatureCanvas from 'react-signature-canvas';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import Image from 'next/image';
import Link from 'next/link';
import { recycleDocument } from '@/lib/recycle-bin-utils';

interface RowData {
  poNo: string;
  before: string;
  after: string;
  note: string;
}

interface Signatures {
  manager: string;
  deputyManager: string;
  sectionHead: string;
  madeBy: string;
  solutionSectionHead: string;
  solver: string;
}

interface LockedState {
  manager: boolean;
  deputyManager: boolean;
  sectionHead: boolean;
  madeBy: boolean;
  solutionSectionHead: boolean;
  solver: boolean;
}

interface PenColors {
  manager: string;
  deputyManager: string;
  sectionHead: string;
  madeBy: string;
  solutionSectionHead: string;
  solver: string;
}

export function ITProblemFormContent({ isPublic = false }: { isPublic?: boolean }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const searchParams = useSearchParams();
  
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [hasSavedCurrent, setHasSavedCurrent] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [historyReports, setHistoryReports] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [historySearch, setHistorySearch] = useState('');
  const [isSharing, setIsSharing] = useState(false);
  const [pendingLockRole, setPendingLockRole] = useState<keyof LockedState | null>(null);
  const [pendingUnlockRole, setPendingUnlockRole] = useState<keyof LockedState | null>(null);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  
  // State for inline deletion confirmation
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [isConfirmingMainDelete, setIsConfirmingMainDelete] = useState(false);
  
  const [currentReportId, setCurrentReportId] = useState<string | null>(null);
  const [reportCreatorId, setReportCreatorId] = useState<string | null>(null);
  const [linkedTicketId, setLinkedTicketId] = useState<string | null>(null);
  const [readableTicketNumber, setReadableTicketNumber] = useState<string | null>(null);

  const [department, setDepartment] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [solutionDate, setSolutionDate] = useState('');
  const [problem, setProblem] = useState('');
  const [rows, setRows] = useState<RowData[]>(
    Array.from({ length: 20 }).map(() => ({ poNo: '', before: '', after: '', note: '' }))
  );

  const [penColors, setPenColors] = useState<PenColors>({
    manager: '#000000',
    deputyManager: '#000000',
    sectionHead: '#000000',
    madeBy: '#000000',
    solutionSectionHead: '#000000',
    solver: '#000000',
  });

  const [textMode, setTextMode] = useState<Record<string, boolean>>({
    solutionSectionHead: false,
    solver: false
  });

  const sigManager = useRef<SignatureCanvas>(null);
  const sigDeputyManager = useRef<SignatureCanvas>(null);
  const sigSectionHead = useRef<SignatureCanvas>(null);
  const sigMadeBy = useRef<SignatureCanvas>(null);
  const sigSolutionSectionHead = useRef<SignatureCanvas>(null);
  const sigSolver = useRef<SignatureCanvas>(null);

  const [signatures, setSignatures] = useState<Signatures>({
    manager: '',
    deputyManager: '',
    sectionHead: '',
    madeBy: '',
    solutionSectionHead: '',
    solver: '',
  });

  const [lockedSignatures, setLockedSignatures] = useState<LockedState>({
    manager: false,
    deputyManager: false,
    sectionHead: false,
    madeBy: false,
    solutionSectionHead: false,
    solver: false,
  });

  const isSpecialDept = ['FRIT', 'PPIC', 'MAINTENANCE', 'MIXER'].includes(department.toUpperCase());
  const labelManager = isSpecialDept ? '經(副)理 / Manager dan Deputy Manager' : '經理 / Manager';
  const isAdmin = user?.role === 'Admin';

  useEffect(() => {
    // Listen to company name settings
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists() && snap.data().companyName) setCompanyName(snap.data().companyName);
    });

    const reportId = searchParams.get('id');
    const prefilledProblem = searchParams.get('problem');
    const prefilledDept = searchParams.get('dept');
    const ticketId = searchParams.get('ticketId');

    if (reportId) {
      const fetchReport = async () => {
        try {
          const docRef = doc(db, 'it_problem_reports', reportId);
          const snap = await getDoc(docRef);
          if (snap.exists()) {
            const data = snap.data();
            loadReport({ id: snap.id, ...data });
            if (data.ticketId) {
                setLinkedTicketId(data.ticketId);
                if (!data.ticketNumber) {
                   const tDoc = await getDoc(doc(db, 'helpdesk_tickets', data.ticketId));
                   if (tDoc.exists()) setReadableTicketNumber(tDoc.data().ticketNumber);
                } else {
                   setReadableTicketNumber(data.ticketNumber);
                }
            }
          }
        } catch (e) {
          console.error("Error loading shared report:", e);
        }
      };
      fetchReport();
    } else {
      if (prefilledProblem) setProblem(decodeURIComponent(prefilledProblem));
      if (prefilledDept) setDepartment(decodeURIComponent(prefilledDept));
      else if (user?.department && !prefilledDept) setDepartment(user.department);
      if (ticketId) {
        setLinkedTicketId(ticketId);
        const fetchTicketDetails = async () => {
          try {
            const tDoc = await getDoc(doc(db, 'helpdesk_tickets', ticketId));
            if (tDoc.exists()) {
              const tData = tDoc.data();
              setReadableTicketNumber(tData.ticketNumber);
              // REAKSI: Jika tiket sudah selesai, prefill tanggal selesai dengan hari ini
              if (tData.status === 'Selesai') {
                setSolutionDate(new Date().toISOString().split('T')[0]);
              }
            }
          } catch (e) { console.error(e); }
        };
        fetchTicketDetails();
      }
    }
    return () => unsubGen();
  }, [searchParams, user]);

  useEffect(() => {
    if (!isPublic) {
      setHasSavedCurrent(false);
    }
  }, [department, date, solutionDate, problem, rows, isPublic]);

  const handleRowChange = (index: number, field: keyof RowData, value: string) => {
    const updatedRows = [...rows];
    updatedRows[index] = { ...updatedRows[index], [field]: value };
    setRows(updatedRows);
  };

  const updateSignaturesState = () => {
    const currentSigs = {
      manager: sigManager.current && !sigManager.current.isEmpty() ? sigManager.current.toDataURL('image/png') : signatures.manager,
      deputyManager: sigDeputyManager.current && !sigDeputyManager.current.isEmpty() ? sigDeputyManager.current.toDataURL('image/png') : signatures.deputyManager,
      sectionHead: sigSectionHead.current && !sigSectionHead.current.isEmpty() ? sigSectionHead.current.toDataURL('image/png') : signatures.sectionHead,
      madeBy: sigMadeBy.current && !sigMadeBy.current.isEmpty() ? sigMadeBy.current.toDataURL('image/png') : signatures.madeBy,
      solutionSectionHead: textMode.solutionSectionHead ? (signatures.solutionSectionHead) : (sigSolutionSectionHead.current && !sigSolutionSectionHead.current.isEmpty() ? sigSolutionSectionHead.current.toDataURL('image/png') : signatures.solutionSectionHead),
      solver: textMode.solver ? (signatures.solver) : (sigSolver.current && !sigSolver.current.isEmpty() ? sigSolver.current.toDataURL('image/png') : signatures.solver),
    };
    setSignatures(currentSigs);
    return currentSigs;
  };

  const toggleLock = (role: keyof LockedState) => {
    const isModeText = textMode[role];
    const isSigEmpty = isModeText ? !signatures[role] : getRefByRole(role).current?.isEmpty();
    const hasExistingData = !!signatures[role];

    if (lockedSignatures[role]) {
      if (user?.role === 'Admin') {
        setPendingUnlockRole(role);
      }
      return;
    }

    if (isSigEmpty && !hasExistingData) {
      toast({ variant: 'destructive', title: 'Data Kosong' });
      return;
    }

    setPendingLockRole(role);
  };

  const confirmLockAndSave = async () => {
    if (!pendingLockRole) return;
    const currentSignatures = updateSignaturesState();
    const nextLockedState = { ...lockedSignatures, [pendingLockRole]: true };
    const success = await handleSaveToFirestore(true, nextLockedState, currentSignatures);
    if (success) {
      setLockedSignatures(nextLockedState);
      setPendingLockRole(null);
    }
  };

  const confirmUnlockAndSave = async () => {
    if (!pendingUnlockRole) return;
    const nextLockedState = { ...lockedSignatures, [pendingUnlockRole]: false };
    const success = await handleSaveToFirestore(true, nextLockedState);
    if (success) {
      setLockedSignatures(nextLockedState);
      setPendingUnlockRole(null);
      toast({ title: 'Kunci Dibuka' });
    }
  };

  const getRefByRole = (role: keyof LockedState) => {
    switch(role) {
      case 'manager': return sigManager;
      case 'deputyManager': return sigDeputyManager;
      case 'sectionHead': return sigSectionHead;
      case 'madeBy': return sigMadeBy;
      case 'solutionSectionHead': return sigSolutionSectionHead;
      case 'solver': return sigSolver;
    }
  };

  const handleSaveToFirestore = async (force: boolean = false, overrideLocked?: LockedState, overrideSigs?: Signatures): Promise<boolean> => {
    if (hasSavedCurrent && !force && !isPublic) return true;
    if (!user && !isPublic) {
      toast({ variant: 'destructive', title: 'Login Diperlukan' });
      return false;
    }
    if (!department || !problem) {
      toast({ variant: 'destructive', title: 'Data Tidak Lengkap' });
      return false;
    }

    setIsSaving(true);
    try {
      const filteredRows = rows.filter(r => r.poNo || r.before || r.after || r.note);
      const currentSignatures = overrideSigs || updateSignaturesState();
      const currentLockedState = overrideLocked || lockedSignatures;

      const reportData = {
        company: companyName,
        department,
        date,
        solutionDate,
        problem,
        ticketId: linkedTicketId || null,
        ticketNumber: readableTicketNumber || null,
        rows: filteredRows,
        signatures: currentSignatures,
        lockedSignatures: currentLockedState,
        penColors,
        textMode,
        updatedAt: serverTimestamp(),
      };

      if (currentReportId) {
        await updateDoc(doc(db, 'it_problem_reports', currentReportId), reportData);
        toast({ title: 'Laporan Diperbarui' });
      } else {
        const newDoc = await addDoc(collection(db, 'it_problem_reports'), {
          ...reportData,
          createdBy: user?.uid || 'PUBLIC_USER',
          creatorName: user?.displayName || user?.email || 'Public Guest',
          createdAt: serverTimestamp(),
        });
        setCurrentReportId(newDoc.id);
        setReportCreatorId(user?.uid || 'PUBLIC_USER');
        toast({ title: 'Berhasil Disimpan' });
      }

      setHasSavedCurrent(true);
      return true;
    } catch (error: any) {
      console.error("Error saving report:", error);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan' });
      return false;
    } finally {
      setIsSaving(false);
    }
  };

  const loadReport = (report: any) => {
    setCurrentReportId(report.id);
    setLinkedTicketId(report.ticketId || null);
    setReadableTicketNumber(report.ticketNumber || null);
    setReportCreatorId(report.createdBy || null);
    setDepartment(report.department || '');
    setDate(report.date || '');
    setSolutionDate(report.solutionDate || '');
    setProblem(report.problem || '');
    
    const paddedRows = (report.rows || []).map((r: any) => ({
        poNo: r.poNo || '',
        before: r.before || '',
        after: r.after || '',
        note: r.note || ''
    }));
    while (paddedRows.length < 20) {
        paddedRows.push({ poNo: '', before: '', after: '', note: '' });
    }
    setRows(paddedRows);
    
    setSignatures({
        manager: report.signatures?.manager || '',
        deputyManager: report.signatures?.deputyManager || '',
        sectionHead: report.signatures?.sectionHead || '',
        madeBy: report.signatures?.madeBy || '',
        solutionSectionHead: report.signatures?.solutionSectionHead || '',
        solver: report.signatures?.solver || '',
    });

    setLockedSignatures(report.lockedSignatures || {
      manager: !!report.signatures?.manager,
      deputyManager: !!report.signatures?.deputyManager,
      sectionHead: !!report.signatures?.sectionHead,
      madeBy: !!report.signatures?.madeBy,
      solutionSectionHead: !!report.signatures?.solutionSectionHead,
      solver: !!report.signatures?.solver,
    });

    if (report.penColors) {
      setPenColors({
          manager: report.penColors.manager || '#000000',
          deputyManager: report.penColors.deputyManager || '#000000',
          sectionHead: report.penColors.sectionHead || '#000000',
          madeBy: report.penColors.madeBy || '#000000',
          solutionSectionHead: report.penColors.solutionSectionHead || '#000000',
          solver: report.penColors.solver || '#000000',
      });
    }

    if (report.textMode) setTextMode(report.textMode);
    
    sigManager.current?.clear();
    sigDeputyManager.current?.clear();
    sigSectionHead.current?.clear();
    sigMadeBy.current?.clear();
    sigSolutionSectionHead.current?.clear();
    sigSolver.current?.clear();

    setIsHistoryOpen(false);
    setHasSavedCurrent(true);
  };

  const handleSharePublicLink = async (idToShare?: string) => {
    setIsSharing(true);
    const targetId = idToShare || currentReportId;
    const publicUrl = targetId 
        ? `${window.location.origin}/public/it-report?id=${targetId}`
        : `${window.location.origin}/public/it-report`;

    try {
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'Laporan Masalah IT - ' + companyName,
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
      toast({ title: 'Link Disalin' });
    } catch (e) {
      toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
      setIsSharing(false);
    }
  };

  const handleDeleteReport = async (id: string) => {
    if (!user || !isAdmin) return; // Only admin can delete as requested
    setIsDeleting(true);
    try {
      await recycleDocument(db, 'it_problem_reports', id, user.uid, user.displayName || user.email || 'Admin', user.department || 'N/A');
      toast({ title: 'Laporan Dihapus', description: 'Laporan telah dipindahkan ke Tempat Sampah.' });
      
      if (currentReportId === id) {
        setCurrentReportId(null);
        setHasSavedCurrent(false);
      }
      
      setConfirmDeleteId(null);
    } catch (error) {
      console.error("Error deleting report:", error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (isHistoryOpen && user) {
        setLoadingHistory(true);
        
        // Filter history by department for non-admins
        let qHistory;
        const reportsRef = collection(db, 'it_problem_reports');
        
        if (user.role !== 'Admin' && user.department) {
          qHistory = query(
            reportsRef, 
            where('department', '==', user.department),
            orderBy('createdAt', 'desc')
          );
        } else {
          qHistory = query(reportsRef, orderBy('createdAt', 'desc'));
        }

        const unsub = onSnapshot(qHistory, (snap) => {
            setHistoryReports(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingHistory(false);
        }, (err) => {
            console.error("History fetch error:", err);
            setLoadingHistory(false);
        });
        return () => unsub();
    }
  }, [isHistoryOpen, user]);

  const filteredHistory = historyReports.filter(r => 
    (r.department || '').toLowerCase().includes(historySearch.toLowerCase()) ||
    (r.problem || '').toLowerCase().includes(historySearch.toLowerCase())
  );

  const renderSignatureContent = (content: string) => {
    if (!content) return '';
    if (content.startsWith('data:image')) {
      return `<img src="${content}" style="max-height: 45px; max-width: 100px; display: block; margin: 2px auto 0;" />`;
    }
    return `<div style="font-size: 10pt; font-weight: bold; margin-top: 5px; border-bottom: 1px solid black; display: inline-block; min-width: 100px;">${content}</div>`;
  };

  const isAllowedToEdit = !currentReportId || (user?.role === 'Admin') || (user?.uid && reportCreatorId && user.uid === reportCreatorId);

  const ticketLinkHtml = readableTicketNumber && linkedTicketId 
    ? `(<a href="/public/helpdesk?id=${linkedTicketId}" target="_blank" style="color: #2563eb; text-decoration: underline; font-weight: bold;">${readableTicketNumber}</a>)` 
    : (readableTicketNumber ? `(${readableTicketNumber})` : '');

  const formHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<style>
  @media print {
    @page { size: A4 portrait; margin: 10mm; }
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
    .page { border: none !important; transform: scale(1) !important; box-shadow: none !important; }
    .no-print { display: none !important; }
  }
  body { font-family: 'Times New Roman', serif; font-size: 10pt; color: #000; }
  .page { width: 210mm; min-height: 297mm; margin: auto; padding: 10mm; box-sizing: border-box; background: white; }
  .header { text-align: center; margin-bottom: 25px; }
  .header h1 { font-size: 16pt; margin: 0; font-weight: bold; }
  .header h2 { font-size: 13pt; margin: 4px 0; font-weight: bold; }
  .header h3 { font-size: 15pt; margin: 0; font-weight: bold; }
  .meta-info { width: 100%; margin-bottom: 20px; border-collapse: collapse; }
  .meta-info td { padding: 2px 0; vertical-align: top; }
  .meta-label { width: 45%; text-align: left; padding-left: 5mm; font-weight: normal; }
  .meta-colon { width: 5%; text-align: center; font-weight: normal; }
  .meta-value { width: 50%; text-align: left; padding-left: 5px; font-weight: normal; }
  table.main-table { width: 100%; border-collapse: collapse; margin-top: 10px; }
  table.main-table th, table.main-table td { border: 1px solid #000; padding: 2px; text-align: center; height: 5mm; }
  table.main-table th { background-color: #f2f2f2; font-weight: bold; font-size: 9pt; }
  .footer-sig { width: 100%; margin-top: 20px; border-collapse: collapse; }
  .footer-sig td { width: 33.33%; text-align: center; padding: 5px; vertical-align: top; }
  .sig-block { display: flex; flex-direction: column; align-items: center; margin-top: 5px; text-align: center; width: 100%; }
  .sig-img-container { height: 45px; display: flex; align-items: center; justify-content: center; margin-top: 2px; }
  .sig-text { font-size: 9pt; font-weight: normal; text-decoration: underline; line-height: 1.4; display: block; }
  .form-id { text-align: right; font-size: 8pt; margin-top: 10px; }
</style>
</head>
<body>
<div class="page">
  <div class="header">
    <h1><b>${companyName}</b></h1>
    <h2><b>Masalah - Masalah Perangkat Keras & Lunak</b></h2>
    <h3><b>軟硬體問題單</b></h3>
  </div>

  <table class="meta-info">
    <tr><td class="meta-label">提報公司 / Nama Perusahaan</td><td class="meta-colon">:</td><td class="meta-value">${companyName}</td></tr>
    <tr><td class="meta-label">提報單位 / Departement</td><td class="meta-colon">:</td><td class="meta-value">${department}</td></tr>
    <tr><td class="meta-label">提報日期 / Date</td><td class="meta-colon">:</td><td class="meta-value">${date ? format(new Date(date), 'dd/MM/yyyy') : ''}</td></tr>
    <tr><td class="meta-label">問題 / Permasalahan</td><td class="meta-colon">:</td><td class="meta-value">${problem} ${ticketLinkHtml}</td></tr>
  </table>

  <table class="main-table">
    <thead><tr><th style="width: 40px;">NO</th><th style="width: 150px;">PO. NO</th><th>BEFORE CHANGE</th><th>AFTER CHANGE</th><th style="width: 150px;">NOTE</th></tr></thead>
    <tbody>
      ${rows.map((row, i) => `<tr><td>${i + 1}</td><td>${row.poNo || ''}</td><td>${row.before || ''}</td><td>${row.after || ''}</td><td>${row.note || ''}</td></tr>`).join('')}
    </tbody>
  </table>

  <div class="form-id">表號:0-32-028</div>

  <table class="footer-sig">
    <tr>
      <td>
        <div class="sig-block">
          <span class="sig-text">${labelManager}</span>
          <div style="display: flex; justify-content: center; gap: 5px; width: 100%;">
            <div class="sig-img-container" style="width: 50%;">${renderSignatureContent(signatures.manager)}</div>
            ${isSpecialDept ? `<div class="sig-img-container" style="width: 50%;">${renderSignatureContent(signatures.deputyManager)}</div>` : ''}
          </div>
        </div>
      </td>
      <td>
        <div class="sig-block">
          <span class="sig-text">單位主管 / Section Head</span>
          <div class="sig-img-container">${renderSignatureContent(signatures.sectionHead)}</div>
        </div>
      </td>
      <td>
        <div class="sig-block">
          <span class="sig-text">申請人 / Made by</span>
          <div class="sig-img-container">${renderSignatureContent(signatures.madeBy)}</div>
        </div>
      </td>
    </tr>
    <tr>
      <td>
        <div class="sig-block">
          <span class="sig-text">承辦主管 / Solusi Section Head</span>
          <div class="sig-img-container">${renderSignatureContent(signatures.solutionSectionHead)}</div>
        </div>
      </td>
      <td>
        <div class="sig-block">
          <span class="sig-text">承辦人 / Bagian Penyelesaian</span>
          <div class="sig-img-container">${renderSignatureContent(signatures.solver)}</div>
        </div>
      </td>
      <td>
        <div class="sig-block">
          <span class="sig-text">完成日期 / Tanggal Penyelesaian</span>
          <div class="sig-img-container"><span style="font-size: 10pt; font-weight: bold; margin-top: 10px;">${solutionDate ? format(new Date(solutionDate), 'dd/MM/yyyy') : ''}</span></div>
        </div>
      </td>
    </tr>
  </table>
</div>
</body>
</html>
    `;

  const handlePrint = () => {
    updateSignaturesState();
    const printWindow = window.open('', '', 'width=800,height=1000');
    if (printWindow) {
      printWindow.document.write(formHtml);
      printWindow.document.close();
      setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const handleMainDelete = async () => {
    if (!currentReportId) return;
    await handleDeleteReport(currentReportId);
    setIsConfirmingMainDelete(false);
  };

  return (
    <div className="space-y-6 pb-20">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-1">
        <div className="flex items-center gap-3">
          {currentReportId && <Badge className="bg-primary text-white font-black px-3 py-1 rounded-full uppercase text-[10px]">ID: {currentReportId.slice(0, 8)}...</Badge>}
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Form Laporan IT</h1>
            <p className="text-sm text-muted-foreground font-medium uppercase tracking-widest">Input & Desain Dokumen Kontrol (0-32-028)</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {!isPublic && (
            <>
              <Button variant="outline" onClick={() => handleSharePublicLink()} disabled={isSharing} className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50">
                {isSharing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="mr-2 h-4 w-4" />} Bagikan
              </Button>
              <Button variant="outline" onClick={() => setIsHistoryOpen(true)} className="rounded-xl border-primary/20 text-primary hover:bg-primary/5 font-bold">
                <History className="mr-2 h-4 w-4" /> Lihat Riwayat
              </Button>
            </>
          )}
          {currentReportId && !isPublic && isAdmin && (
            <Button variant="outline" onClick={() => setIsConfirmingMainDelete(true)} className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50">
                <Trash2 className="mr-2 h-4 w-4" /> Hapus Laporan
            </Button>
          )}
          {(!isPublic || (isPublic && !currentReportId)) && (
            <Button onClick={() => handleSaveToFirestore()} disabled={isSaving || (hasSavedCurrent && !isPublic)} className={cn("font-black uppercase tracking-widest rounded-xl transition-all", (hasSavedCurrent && !isPublic) ? "bg-slate-100 text-slate-400" : "bg-emerald-600 hover:bg-emerald-700 text-white")}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} Simpan
            </Button>
          )}
          <Button onClick={handlePrint} className="bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest rounded-xl shadow-xl shadow-primary/20">
            <Printer className="mr-2 h-4 w-4" /> Cetak
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        <div className="lg:col-span-4 space-y-6">
          <Card className="rounded-3xl border-none shadow-lg">
            <CardHeader><CardTitle className="text-sm font-black uppercase tracking-widest">Identitas</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Departemen</Label>
                <Input placeholder="Contoh: IT, GA, Produksi..." value={department} onChange={(e) => setDepartment(e.target.value)} className="rounded-xl" disabled={!isAllowedToEdit} />
              </div>
              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tanggal Laporan</Label>
                  <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="rounded-xl" disabled={!isAllowedToEdit} />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Tanggal Selesai</Label>
                  <Input type="date" value={solutionDate} onChange={(e) => setSolutionDate(e.target.value)} className="rounded-xl" disabled={user?.role !== 'Admin'} />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <Label className="text-[10px] font-black uppercase tracking-widest ml-1">Permasalahan Utama</Label>
                  {linkedTicketId && (
                    <Link 
                      href={`/helpdesk/id?ticketId=${linkedTicketId}`} 
                      target="_blank"
                      className="flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md border border-blue-100 hover:bg-blue-100 transition-colors"
                    >
                      <Ticket className="h-3 w-3" />
                      <span className="text-[9px] font-black uppercase tracking-tighter">Buka Tiket: {readableTicketNumber}</span>
                      <ExternalLink className="h-2.5 w-2.5" />
                    </Link>
                  )}
                </div>
                <Input placeholder="Contoh: Printer rusak, Ganti RAM..." value={problem} onChange={(e) => setProblem(e.target.value)} className="rounded-xl" disabled={!isAllowedToEdit} />
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-50 border-b"><CardTitle className="text-sm font-black uppercase tracking-widest">Input Tabel (20 Baris)</CardTitle></CardHeader>
            <CardContent className="p-0">
              <ScrollArea className="h-[400px]">
                <div className="p-4 space-y-6">
                  {rows.map((row, i) => (
                    <div key={i} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 space-y-3 relative">
                       <div className="absolute -top-2 -left-2 flex items-center gap-1.5 z-10">
                        <Badge variant="outline" className="bg-white font-black text-[9px] shadow-sm">{i + 1}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase opacity-50">PO. NO</Label>
                          <Input value={row.poNo || ''} onChange={(e) => handleRowChange(i, 'poNo', e.target.value)} className="h-8 text-xs rounded-lg" disabled={!isAllowedToEdit} />
                        </div>
                        <div className="space-y-1">
                          <Label className="text-[9px] font-black uppercase opacity-50">NOTE</Label>
                          <Input value={row.note || ''} onChange={(e) => handleRowChange(i, 'note', e.target.value)} className="h-8 text-xs rounded-lg" disabled={!isAllowedToEdit} />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-50">BEFORE CHANGE</Label>
                        <Input value={row.before || ''} onChange={(e) => handleRowChange(i, 'before', e.target.value)} className="h-8 text-xs rounded-lg" disabled={!isAllowedToEdit} />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-[9px] font-black uppercase opacity-50">AFTER CHANGE</Label>
                        <Input value={row.after || ''} onChange={(e) => handleRowChange(i, 'after', e.target.value)} className="h-8 text-xs rounded-lg" disabled={!isAllowedToEdit} />
                      </div>
                    </div>
                  ))}
                </div>
                <ScrollBar orientation="vertical" />
              </ScrollArea>
            </CardContent>
          </Card>

          <Card className="rounded-3xl border-none shadow-lg overflow-hidden">
            <CardHeader className="bg-slate-900 text-white flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-black uppercase tracking-widest flex items-center gap-2"><Pencil className="h-4 w-4" /> Tanda Tangan</CardTitle>
            </CardHeader>
            <CardContent className="p-6 space-y-8">
              {[
                { id: 'manager', label: isSpecialDept ? 'Manager Unit' : 'Manager Unit', ref: sigManager },
                ...(isSpecialDept ? [{ id: 'deputyManager', label: 'Deputy Manager Unit', ref: sigDeputyManager }] : []),
                { id: 'sectionHead', label: 'Section Head Unit', ref: sigSectionHead },
                { id: 'madeBy', label: 'Pemohon (Made By)', ref: sigMadeBy },
                { id: 'solutionSectionHead', label: 'Solusi Section Head (IT)', ref: sigSolutionSectionHead, hasTextMode: true },
                { id: 'solver', label: 'Penyelesai (Solver IT)', ref: sigSolver, hasTextMode: true },
              ].map((sig) => (
                <div key={sig.id} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground flex items-center gap-2 text-left">
                      {lockedSignatures[sig.id as keyof LockedState] ? <Lock className="h-3 w-3 text-amber-500" /> : <User className="h-3 w-3" />}
                      {sig.label}
                    </Label>
                    <div className="flex items-center gap-1">
                      {!lockedSignatures[sig.id as keyof LockedState] && (
                        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-50 rounded-full border border-slate-100">
                          {['#000000', '#0000ff', '#ff0000'].map(hex => (
                            <button key={hex} type="button" onClick={() => setPenColors(p => ({ ...p, [sig.id]: hex }))} className={cn("w-3 h-3 rounded-full", hex === penColors[sig.id as keyof PenColors] ? "ring-2 ring-primary" : "")} style={{ backgroundColor: hex }} />
                          ))}
                        </div>
                      )}
                      <div className="flex items-center gap-1">
                        {!lockedSignatures[sig.id as keyof LockedState] && !textMode[sig.id] && (
                          <button 
                            type="button" 
                            className="h-6 w-6 text-rose-500" 
                            onClick={() => { 
                                const ref = getRefByRole(sig.id as any);
                                if (ref.current) ref.current.clear(); 
                                setSignatures(prev => ({ ...prev, [sig.id]: '' })); 
                            }}
                          >
                            <Trash className="h-3 w-3" />
                          </button>
                        )}
                        <button type="button" className={cn("h-6 w-6 rounded-full", lockedSignatures[sig.id as keyof LockedState] ? "text-amber-600" : "text-slate-400")} onClick={() => toggleLock(sig.id as keyof LockedState)} disabled={lockedSignatures[sig.id as keyof LockedState] && user?.role !== 'Admin'}>
                          {lockedSignatures[sig.id as keyof LockedState] ? <Lock className="h-3.5 w-3.5" /> : <Unlock className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className={cn("border-2 border-dashed rounded-xl bg-slate-50 h-32 overflow-hidden shadow-inner relative", lockedSignatures[sig.id as keyof LockedState] && "border-amber-200")}>
                    {textMode[sig.id] ? (
                      <Input placeholder="Nama..." value={signatures[sig.id as keyof Signatures] || ''} onChange={(e) => setSignatures(s => ({ ...s, [sig.id]: e.target.value }))} disabled={lockedSignatures[sig.id as keyof LockedState]} className="bg-transparent border-none text-center font-bold text-lg h-full" />
                    ) : (
                      <>
                        {signatures[sig.id as keyof Signatures] && (getRefByRole(sig.id as any).current?.isEmpty() || lockedSignatures[sig.id as keyof LockedState]) && (
                          <div className="absolute inset-0 flex items-center justify-center p-4">
                              <Image src={signatures[sig.id as keyof Signatures]} alt="Sig" width={150} height={60} className="object-contain" />
                          </div>
                        )}
                        <div className={cn("w-full h-full relative z-10", lockedSignatures[sig.id as keyof LockedState] && "pointer-events-none")}>
                          <SignatureCanvas ref={getRefByRole(sig.id as any)} onEnd={updateSignaturesState} penColor={penColors[sig.id as keyof PenColors]} canvasProps={{ className: 'w-full h-full' }} />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 w-full overflow-hidden text-black">
          <Card className="border-none shadow-2xl rounded-[2.5rem] bg-slate-100 p-2 sm:p-10 flex justify-center items-start overflow-hidden h-[450px] sm:h-[750px] md:h-[900px] lg:h-auto lg:min-h-[1150px]">
            <div className="bg-white text-black shadow-inner overflow-hidden scale-[0.35] sm:scale-[0.5] md:scale-[0.7] lg:scale-100 origin-top transform-gpu shrink-0" style={{ width: '210mm', minHeight: '297mm' }}>
              <div dangerouslySetInnerHTML={{ __html: formHtml.replace('<body>', '').replace('</body>', '').replace('</html>', '').replace('<!DOCTYPE html>', '').replace('<html lang="id">', '').replace('<head>', '').replace('</head>', '') }} />
            </div>
          </Card>
        </div>
      </div>

      <Dialog open={isHistoryOpen} onOpenChange={setIsHistoryOpen}>
        <DialogContent className="sm:max-w-4xl h-[90vh] flex flex-col p-0 border-none rounded-[2rem] shadow-2xl overflow-hidden bg-white text-black">
            <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-3 bg-primary/20 rounded-2xl text-left"><History className="h-6 w-6 text-primary" /></div>
                    <div className="text-left">
                        <DialogTitle className="text-xl font-black uppercase tracking-tight text-left">Riwayat Laporan IT</DialogTitle>
                        <DialogDescription className="text-white/40 text-[9px] font-black uppercase tracking-widest text-left">Internal Document Control</DialogDescription>
                    </div>
                </div>
                <DialogClose asChild><Button variant="ghost" size="icon" className="text-white/40 hover:text-white"><X className="h-6 w-6" /></Button></DialogClose>
            </div>
            <div className="p-6 border-b bg-slate-50 flex items-center gap-4">
                <div className="relative flex-1 group">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-300" />
                    <Input placeholder="Cari..." value={historySearch} onChange={(e) => setHistorySearch(e.target.value)} className="pl-11 h-12 bg-white rounded-xl shadow-sm border-slate-200" />
                </div>
            </div>
            <ScrollArea className="flex-1 w-full">
                <div className="p-6 flex flex-col gap-4 w-full">
                    {loadingHistory ? Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />) : filteredHistory.map((report) => (
                        <div key={report.id} className="p-5 rounded-2xl border hover:border-primary/30 hover:bg-slate-50 transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 text-black text-left w-full">
                            <div className="flex-1 text-left min-w-0">
                                <div className="flex items-center gap-2 mb-1">
                                    <Badge variant="outline" className="text-[10px] uppercase font-black">{report.department}</Badge>
                                    <span className="text-[10px] font-bold text-muted-foreground">{report.date}</span>
                                </div>
                                <h4 className="font-black text-slate-900 uppercase tracking-tight text-left break-words leading-snug">{report.problem}</h4>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              {confirmDeleteId === report.id ? (
                                <div className="flex items-center gap-1.5 animate-in fade-in zoom-in duration-200">
                                  <Button 
                                    variant="outline" 
                                    size="icon" 
                                    onClick={() => setConfirmDeleteId(null)}
                                    className="h-11 w-11 rounded-xl text-slate-400 border-slate-200 hover:bg-slate-50"
                                    disabled={isDeleting}
                                  >
                                    <X className="h-5 w-5" />
                                  </Button>
                                  <Button 
                                    onClick={() => handleDeleteReport(report.id)}
                                    className="h-11 w-11 rounded-xl bg-rose-600 text-white hover:bg-rose-700 shadow-lg shadow-rose-600/20"
                                    disabled={isDeleting}
                                  >
                                    {isDeleting ? <Loader2 className="h-5 w-5 animate-spin" /> : <Check className="h-5 w-5" />}
                                  </Button>
                                </div>
                              ) : (
                                <>
                                  <Button onClick={() => loadReport(report)} className="h-11 px-6 bg-slate-900 text-white uppercase text-[10px] font-black rounded-xl hover:bg-black shadow-md">Lihat & Muat</Button>
                                  {isAdmin && (
                                    <Button 
                                      variant="outline" 
                                      size="icon" 
                                      onClick={() => setConfirmDeleteId(report.id)}
                                      className="h-11 w-11 rounded-xl text-rose-600 border-rose-100 hover:bg-rose-50"
                                    >
                                      <Trash2 className="h-5 w-5" />
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                        </div>
                    ))}
                    {!loadingHistory && filteredHistory.length === 0 && (
                        <div className="py-20 text-center flex flex-col items-center gap-3 opacity-20 text-black">
                            <History className="h-12 w-12" />
                            <p className="font-black uppercase tracking-widest text-xs">Belum ada riwayat laporan</p>
                        </div>
                    )}
                </div>
                <ScrollBar orientation="vertical" />
            </ScrollArea>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isConfirmingMainDelete} onOpenChange={setIsConfirmingMainDelete}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white text-black">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-2 text-left text-black"><Trash2 className="h-8 w-8 text-rose-600" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-rose-600 text-left">Hapus Laporan Ini?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-left text-black">Tindakan ini akan memindahkan laporan ini ke Tempat Sampah.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleMainDelete} className="rounded-xl bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest">Ya, Hapus Laporan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingLockRole} onOpenChange={(open) => !open && setPendingLockRole(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white text-black">
          <AlertDialogHeader>
            <div className="p-3 bg-amber-50 rounded-2xl w-fit mb-2 text-left text-black"><Lock className="h-8 w-8 text-amber-600" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-left text-black">Kunci Tanda Tangan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-left text-black">Tanda tangan yang dikunci tidak dapat diubah kembali kecuali oleh Admin.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-xl font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={confirmLockAndSave} className="rounded-xl bg-primary hover:bg-primary/90 font-black uppercase tracking-widest">Kunci & Simpan</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!pendingUnlockRole} onOpenChange={(open) => !open && setPendingUnlockRole(null)}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white text-black">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-2 text-left text-black"><Unlock className="h-8 w-8 text-rose-600" /></div>
            <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-rose-600 text-left">Buka Kunci Tanda Tangan?</AlertDialogTitle>
            <AlertDialogDescription className="text-sm font-medium text-left text-black">Anda akan membuka kunci tanda tangan ini. Setelah dibuka, data dapat diubah atau dihapus kembali.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-6 gap-2">
            <AlertDialogCancel className="rounded-xl font-bold text-black">Batalkan</AlertDialogCancel>
            <AlertDialogAction onClick={confirmUnlockAndSave} className="rounded-xl bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest">Ya, Buka Kunci</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ITProblemFormPage() {
  return (
    <DashboardLayout>
      <Suspense fallback={<div className="flex justify-center items-center h-full"><Loader2 className="animate-spin" /></div>}>
        <ITProblemFormContent isPublic={false} />
      </Suspense>
    </DashboardLayout>
  );
}
