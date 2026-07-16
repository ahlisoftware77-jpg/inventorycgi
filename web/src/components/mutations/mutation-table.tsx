'use client';

/**
 * @fileOverview Tabel Manajemen Mutasi & Disposal.
 * Dioptimalkan untuk responsivitas mobile (Horizontal scroll pada tabs).
 * Menggunakan Native Date Picker untuk konsistensi input tanggal.
 * Logic: Memisahkan item 'waiting_disposal' yang sudah diproses Admin ke tab Disposal History.
 * Penambahan: Indikator bulatan merah (Notif) pada tab jika ada data pending.
 */

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { onSnapshot, collection, query, where, doc, updateDoc, serverTimestamp, getDoc, QueryConstraint, addDoc, writeBatch, deleteDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type User, type AssetStatus, type AssetCondition } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import {
    AlertDialog,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogCancel,
    AlertDialogAction,
  } from '@/components/ui/alert-dialog';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { Check, Loader2, X, Printer, Search, Send, FileCheck, Calendar as CalendarIcon, CheckCircle2, RotateCcw, Image as ImageIcon, Camera, UploadCloud, Pencil, MoreVertical, ArrowUp, ArrowDown, Share2 } from 'lucide-react';
import { format, parse, getYear, isValid } from 'date-fns';
import { id } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { ToastAction } from '../ui/toast';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from '../ui/textarea';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { cn } from '@/lib/utils';
import ExportMutationsButton from './export-mutations-button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { AnimatePresence } from 'framer-motion';
import MutationItem from './mutation-item';
import MutationDetailCard from './mutation-detail-card';
import PhotoUploadDialog from './photo-upload-dialog';
import { getPreviousLocation, getMutationQuantityDisplay, generateTransactionCode } from './utils';
import QRCode from 'qrcode';

export interface EnrichedAsset extends Asset {
  requesterName?: string;
  requesterDepartment?: string;
  approverName?: string;
  accountingUpdaterName?: string;
}

type SortDirection = 'ascending' | 'descending';

interface SortConfig {
  key: keyof EnrichedAsset | 'relevantDate';
  direction: SortDirection;
}

const costCenterMapping: Record<string, string> = {
  'MIXER': 'F1313',
  'PPIC': 'F1323',
  'FRIT': 'F1312',
  'GA': 'F0210',
  'APP-R&D': 'F1325',
  'LAB': 'F1324',
  'QC': 'F1321',
  'MAINTENANCE': 'F1322',
  'ACCOUNTING': 'F0220',
  'TINTA': 'F1314',
  'IT': 'F0100',
};

const sectionHeadMapping: Record<string, string> = {
  'MIXER': 'M Suparman Nurjaya',
  'PPIC': 'Warsito',
  'FRIT': 'Agus Gito',
  'GA': 'Eko Prasetyo',
  'APP-R&D': 'Darmawan, Lai Fu Ming',
  'LAB': 'Lai Fu Ming',
  'QC': 'Lai Fu Ming',
  'MAINTENANCE': 'Warsito',
  'ACCOUNTING': 'Mr. Wu',
  'TINTA': 'M Suparman Nurjaya',
  'PURCHASING': 'Elna',
  'APP': 'Darmawan',
  'R&D': 'Lai Fu Ming',
  'IT': 'Admin',
};

const userCache = new Map<string, Partial<User>>();

const getPlannedDateFromNotes = (notes: string | undefined): Date | null => {
  if (!notes) return null;
  const dateMatch = notes.match(/Tanggal Rencana: (\d+ \w+ \d{4})/);
  if (dateMatch && dateMatch[1]) {
    try {
      const parsedDate = parse(dateMatch[1], 'd MMM yyyy', new Date(), { locale: id });
      if (!isNaN(parsedDate.getTime())) {
        return parsedDate;
      }
    } catch (e) {
      console.error("Could not parse date from notes:", e);
      return null;
    }
  }
  return null;
};

async function fetchUser(userId: string): Promise<Partial<User>> {
    if (!userId) {
        return { name: 'N/A', department: 'N/A' };
    }
    if (userCache.has(userId)) {
        return userCache.get(userId)!;
    }
    try {
        const userDoc = await getDoc(doc(db, 'users', userId));
        if (userDoc.exists()) {
            const userData = userDoc.data() as User;
            const partialUserData = { name: userData.name, email: userData.email, department: userData.department };
            userCache.set(userId, partialUserData);
            return partialUserData;
        } else {
            const notFoundUser = { name: 'Unknown User', department: 'N/A' };
            userCache.set(userId, notFoundUser);
            return notFoundUser;
        }
    } catch (e) {
        console.error("Error fetching user info:", e);
    }
    const errorUser = { name: 'Error Fetching User', department: 'N/A' };
    userCache.set(userId, errorUser);
    return errorUser;
}

const enrichAssets = async (assetsToEnrich: Asset[]): Promise<EnrichedAsset[]> => {
    const userIds = new Set<string>();
    assetsToEnrich.forEach(asset => {
        const reqId = asset.requestedBy || asset.approvedBy;
        if (reqId) userIds.add(reqId);
        if (asset.approvedBy) userIds.add(asset.approvedBy);
        if (asset.accountingUpdatedBy) userIds.add(asset.accountingUpdatedBy);
    });

    await Promise.all(Array.from(userIds).map(id => fetchUser(id)));
    
    return assetsToEnrich.map(asset => {
        const reqId = asset.requestedBy || asset.approvedBy;
        const requester = reqId ? userCache.get(reqId) : undefined;
        const approver = asset.approvedBy ? userCache.get(asset.approvedBy) : undefined;
        const accountingUpdater = asset.accountingUpdatedBy ? userCache.get(asset.accountingUpdatedBy) : undefined;
        return {
            ...asset,
            requesterName: requester?.name || 'Unknown',
            requesterDepartment: requester?.department || 'N/A',
            approverName: approver?.name || 'Unknown',
            accountingUpdaterName: accountingUpdater?.name || 'Unknown'
        };
    });
};

const summarizeTransactionCodes = (codes: string[]): string => {
  if (codes.length === 0) return 'Multiple';
  if (codes.length === 1) return codes[0];

  const parsedCodes = codes
    .map(code => {
      const parts = code.split('-');
      if (parts.length < 3) return null;
      const seq = parseInt(parts[parts.length - 1], 10);
      const prefix = parts.slice(0, -1).join('-');
      return { prefix, seq };
    })
    .filter((c): c is { prefix: string; seq: number } => c !== null && !isNaN(c.seq));

  if (parsedCodes.length === 0) return 'Multiple';

  const groups = new Map<string, number[]>();
  parsedCodes.forEach(({ prefix, seq }) => {
    if (!groups.has(prefix)) {
      groups.set(prefix, []);
    }
    groups.get(prefix)!.push(seq);
  });

  const summaryParts: string[] = [];

  for (const [prefix, seqs] of groups.entries()) {
    seqs.sort((a, b) => a - b);
    
    let result = '';
    if (seqs.length > 0) {
        let start = seqs[0];
        let end = seqs[0];
        
        for (let i = 1; i < seqs.length; i++) {
            if (seqs[i] === end + 1) {
                end = seqs[i];
            } else {
                if (start === end) {
                    result += `${String(start).padStart(3, '0')},`;
                } else {
                    result += `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')},`;
                }
                start = seqs[i];
                end = seqs[i];
            }
        }
        
        if (start === end) {
            result += `${String(start).padStart(3, '0')}`;
        } else {
            result += `${String(start).padStart(3, '0')}-${String(end).padStart(3, '0')}`;
        }
    }
    
    summaryParts.push(`${prefix}-${result.replace(/,$/, '')}`);
  }

  return summaryParts.join('; ');
};

export default function MutationTable() {
  const [allAssets, setAllAssets] = useState<EnrichedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnrichedAsset | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printOption, setPrintOption] = useState<'fill' | 'empty'>('fill');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState('waiting');
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();
  
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'relevantDate', direction: 'descending' });

  const [assetToApprove, setAssetToApprove] = useState<EnrichedAsset | null>(null);
  const [isApprovalDialogOpen, setIsApprovalDialogOpen] = useState(false);
  const [approvalDate, setApprovalDate] = useState<Date | undefined>();
  
  const [assetToUpdateAccounting, setAssetToUpdateAccounting] = useState<EnrichedAsset | null>(null);
  const [isAccountingUpdateDialogOpen, setIsAccountingUpdateDialogOpen] = useState(false);
  const [accountingUpdateDate, setAccountingUpdateDate] = useState<Date | undefined>(new Date());

  const [assetToCancel, setAssetToCancel] = useState<EnrichedAsset | null>(null);
  const [isCancelDialogOpen, setIsCancelDialogOpen] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');

  const [assetForPhotoUpload, setAssetForPhotoUpload] = useState<EnrichedAsset | null>(null);
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);

  const [assetToEditDate, setAssetToEditDate] = useState<EnrichedAsset | null>(null);
  const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false);
  const [newApprovalDate, setNewApprovalDate] = useState<Date | undefined>();
  
  const [selectedYear, setSelectedYear] = useState<number>(new Date().getFullYear());

  const isAdmin = user?.role === 'Admin';
  const isAccounting = user?.department === 'ACCOUNTING';
  const isKaryawan = user?.role === 'Karyawan';
  const isManager = user?.role === 'Manager' || user?.role === 'Section Head';
  const isHRGA = user?.department === 'HR & GA';
  const canApprove = isAdmin || user?.permissions?.canApproveMutation;

  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;
    setLoading(true);

    const relevantStatuses = [
        'waiting_mutasi', 'waiting_disposal', 'waiting_edit', 'waiting_creation',
        'karyawan_approved',
        'approved_mutasi', 'approved_disposal', 'approved_edit', 'Aktif_creation',
        'Aktif'
    ];
    
    const q = query(collection(db, 'assets'), where('status', 'in', relevantStatuses));
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
        if (!isMounted) return;

        let assetsData: Asset[] = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        
        const enriched = await enrichAssets(assetsData);
        if (isMounted) {
            setAllAssets(enriched);
            setLoading(false);
        }
    }, (err) => {
        console.error("Snapshot Error:", err);
        if (isMounted) {
            toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data mutasi.' });
            setLoading(false);
        }
    });

    return () => {
        isMounted = false;
        unsubscribe();
    };
  }, [user, authLoading, isAdmin, toast]);

  const { waitingAssets, submittedHistory, creationHistory, mutationHistory, disposalHistory, editHistory } = useMemo(() => {
    const applySearchFilter = (assets: EnrichedAsset[]) => {
        if (!searchTerm) return assets;
        const lowerCaseSearchTerm = searchTerm.toLowerCase();
        return assets.filter(asset =>
            asset.name.toLowerCase().includes(lowerCaseSearchTerm) ||
            asset.code.toLowerCase().includes(lowerCaseSearchTerm) ||
            (asset.transactionCode && asset.transactionCode.toLowerCase().includes(lowerCaseSearchTerm))
        );
    }

    const sortAssets = (assets: EnrichedAsset[]) => {
      if (!sortConfig) return assets;
      return [...assets].sort((a, b) => {
        const aValue = sortConfig.key === 'relevantDate' 
            ? (a.approvedAt || a.requestedAt)?.toMillis() || 0
            : a[sortConfig.key as keyof Asset];
        const bValue = sortConfig.key === 'relevantDate'
            ? (b.approvedAt || b.requestedAt)?.toMillis() || 0
            : b[sortConfig.key as keyof Asset];

        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        let comparison = 0;
        if (typeof aValue === 'number' && typeof bValue === 'number') {
            comparison = aValue - bValue;
        } else if (aValue instanceof Timestamp && bValue instanceof Timestamp) {
            comparison = aValue.toMillis() - bValue.toMillis();
        } else if (typeof aValue === 'string' && typeof bValue === 'string') {
            comparison = aValue.localeCompare(bValue);
        }
        
        return comparison * (sortConfig.direction === 'ascending' ? 1 : -1);
      });
    };
    
    let allWaiting = allAssets.filter(a => {
        // PENTING: Jika disposal sudah memiliki transactionCode, berarti sudah diproses Admin dan harus pindah ke Riwayat.
        if (a.status === 'waiting_disposal' && a.transactionCode) return false;
        return a.status === 'waiting_mutasi' || a.status === 'karyawan_approved' || a.status === 'waiting_edit' || a.status === 'waiting_creation' || a.status === 'waiting_disposal';
    });

    if (!isAdmin && !isAccounting && !isHRGA && !canApprove && (isKaryawan || isManager)) {
        let userDepartments: string[];
        if (['APP', 'R&D', 'APP-R&D'].includes(user.department || '')) {
            userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
        } else if (user.department === 'PPIC') {
            userDepartments = ['PPIC', 'MAINTENANCE'];
        } else {
            userDepartments = [user.department!];
        }
        
        allWaiting = allWaiting.filter(a => {
            if (a.requestedBy === user.uid) return false;
            const isMutationForDept = a.status === 'waiting_mutasi' && a.mutationTargetDepartment && userDepartments.includes(a.mutationTargetDepartment);
            const isDisposalOrEditInDept = (a.status === 'waiting_disposal' || a.status === 'waiting_edit' || a.status === 'waiting_creation') && userDepartments.includes(a.location);
            
            return isMutationForDept || isDisposalOrEditInDept;
        });
    } else if (isAccounting && !isAdmin) {
        allWaiting = allAssets.filter(a => a.status === 'waiting_mutasi' || a.status === 'waiting_disposal');
    } else if (!isAdmin && !isHRGA && !canApprove) { 
        allWaiting = [];
    }

    let allSubmitted = allAssets.filter(a => a.requestedBy === user?.uid);
    if (isAdmin) {
        allSubmitted = allAssets.filter(a => a.requestedBy); 
    }
    
    let allMutations = allAssets.filter(a => a.status === 'approved_mutasi');
    let allDisposals = allAssets.filter(a => a.status === 'approved_disposal' || a.status === 'waiting_disposal');
    let allEdits = allAssets.filter(a => a.status === 'approved_edit');
    let allCreations = allAssets.filter(a => a.status === 'Aktif_creation');

    if (!isAdmin && user?.department) {
        if (isAccounting) {
        } else {
            const userDepartments: string[] = [];
            if (['APP', 'R&D', 'APP-R&D'].includes(user.department)) {
                userDepartments.push('APP', 'R&D', 'APP-R&D', 'QC', 'LAB');
            } else if (user.department === 'HR & GA') {
                userDepartments.push('GA', 'Receptionist', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'OFFICE', 'HR & GA');
            } else if (user.department === 'PPIC') {
                userDepartments.push('PPIC', 'MAINTENANCE');
            } else {
                userDepartments.push(user.department);
            }
            
            const isRelevantForUser = (asset: EnrichedAsset) => {
                const prevLocation = getPreviousLocation(asset.notes);
                return userDepartments.includes(asset.location) || (prevLocation !== null && userDepartments.includes(prevLocation));
            };
            
            const isRequester = (asset: EnrichedAsset) => asset.requestedBy === user?.uid;

            allMutations = allMutations.filter(asset => isRelevantForUser(asset) || isRequester(asset));
            allDisposals = allDisposals.filter(asset => isRelevantForUser(asset) || isRequester(asset));
            allEdits = allEdits.filter(asset => isRelevantForUser(asset) || isRequester(asset));
            allCreations = allCreations.filter(a => userDepartments.includes(a.location) || a.requestedBy === user?.uid);
        }
    }
    
    const dateFilter = (asset: EnrichedAsset) => {
        const relevantDate = asset.approvedAt?.toDate() || asset.requestedAt?.toDate();
        return relevantDate ? getYear(relevantDate) === selectedYear : false;
    };
    
    return { 
        waitingAssets: sortAssets(applySearchFilter(allWaiting)), 
        submittedHistory: sortAssets(applySearchFilter(allSubmitted)).filter(dateFilter),
        creationHistory: sortAssets(applySearchFilter(allCreations)).filter(dateFilter),
        mutationHistory: sortAssets(applySearchFilter(allMutations)).filter(dateFilter),
        disposalHistory: sortAssets(applySearchFilter(allDisposals)).filter(dateFilter),
        editHistory: sortAssets(applySearchFilter(allEdits)).filter(dateFilter),
    };
  }, [allAssets, searchTerm, isAdmin, isKaryawan, isManager, isAccounting, isHRGA, canApprove, user, sortConfig, selectedYear]);

  const handleProcessWaitingItem = async (asset: EnrichedAsset) => {
    if (!user || (!isAdmin && !isManager && !isKaryawan && !canApprove)) return;

    setIsUpdating(asset.id);
    const assetRef = doc(db, 'assets', asset.id);

    if (asset.status === 'waiting_disposal' && isAdmin) {
        try {
            const transactionCode = await generateTransactionCode('DIS', asset.location);
            const reviewNote = `Pengajuan disposal direview oleh Admin (${user.displayName}) pada ${format(new Date(), 'PPpp', { locale: id })}. Kode Transaksi: ${transactionCode}`;
            
            await updateDoc(assetRef, {
                notes: `${asset.notes}\n\n${reviewNote}`.trim(),
                transactionCode: transactionCode,
                updatedAt: serverTimestamp()
            });

            // Log review
            await addDoc(collection(db, 'system_logs'), {
              type: 'ASSET',
              action: 'PROCESS_DISPOSAL',
              description: `Mereview pengajuan disposal aset "${asset.name}" dengan kode ${transactionCode}`,
              targetId: asset.id,
              targetCode: asset.code,
              targetName: asset.name,
              userId: user.uid,
              userName: user.displayName || user.email,
              userDept: user.department || 'N/A',
              timestamp: serverTimestamp(),
            });

            toast({ title: 'Diproses', description: `Pengajuan disposal untuk "${asset.name}" telah dipindahkan ke tab Disposal untuk persetujuan pusat.` });
        } catch (error) {
            console.error("Error processing disposal item:", error);
            toast({ variant: 'destructive', title: 'Gagal Memproses', description: 'Terjadi kesalahan.' });
        } finally {
            setIsUpdating(null);
        }
    } else {
        openApprovalDialog(asset);
    }
  };

  const handleProcessPengajuan = async (asset: EnrichedAsset) => {
    if (!isAdmin) return;
    setIsUpdating(asset.id);
    const assetRef = doc(db, 'assets', asset.id);
    try {
        const transactionCode = await generateTransactionCode('DIS', asset.location);
        const updateNote = `Proses pusat dimulai pada ${format(new Date(), 'PPpp', { locale: id })} oleh ${user?.displayName}. Kode Transaksi: ${transactionCode}`;
        await updateDoc(assetRef, {
            notes: `${asset.notes}\n\n${updateNote}`.trim(),
            transactionCode: transactionCode,
            updatedAt: serverTimestamp()
        });

        // Log process start
        await addDoc(collection(db, 'system_logs'), {
          type: 'ASSET',
          action: 'START_PROCESS',
          description: `Memulai pengerjaan proses pusat untuk aset "${asset.name}" dengan kode ${transactionCode}`,
          targetId: asset.id,
          targetCode: asset.code,
          targetName: asset.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Proses Dimulai', description: 'Tanggal mulai proses dan kode transaksi telah dicatat.' });
    } catch (error) {
        console.error("Error updating process start:", error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mencatat tanggal proses.' });
    } finally {
        setIsUpdating(null);
    }
  };

  const handleAction = async (asset: Asset, action: 'approve' | 'reject' | 'approve_pusat', approvalDate?: Date) => {
    if (!user) return;

    const isAuthorized = isAdmin || canApprove || isManager || isKaryawan;
    
    if (!isAuthorized) return;
    
    if (!isAdmin && !canApprove && (user.role === 'Manager' || user.role === 'Section Head' || user?.role === 'Karyawan') && action === 'approve' && asset.status !== 'waiting_creation') {
       let userDepartments: string[];
        if (['APP', 'R&D', 'APP-R&D'].includes(user.department || '')) {
            userDepartments = ['APP', 'R&D', 'APP-R&D', 'QC', 'LAB'];
        } else if (user.department === 'PPIC') {
            userDepartments = ['PPIC', 'MAINTENANCE'];
        } else {
            userDepartments = [user.department!];
        }

       const isMutationForDept = asset.mutationTargetDepartment && userDepartments.includes(asset.mutationTargetDepartment);
       const isDisposalOrEditInDept = (asset.status === 'waiting_disposal' || asset.status === 'waiting_edit') && userDepartments.includes(asset.location);

       if (!isMutationForDept && !isDisposalOrEditInDept) {
            toast({
                variant: 'destructive',
                title: 'Akses Ditolak',
                description: 'Anda hanya dapat menyetujui pengajuan untuk departemen Anda.',
            });
            return;
       }
    }

    setIsUpdating(asset.id);

    const assetRef = doc(db, 'assets', asset.id);
    const batch = writeBatch(db);
    const logCollection = collection(db, 'system_logs');

    if (action === 'approve') {
        const approverInfo = await fetchUser(user.uid);
        const approverName = approverInfo.name || approverInfo.email || 'Approver';
        const approverRole = user.role;

        const originalRequesterName = (isAdmin && asset.requesterName === 'Budi Admin') ? (sectionHeadMapping[asset.requesterDepartment || ''] || asset.requesterName) : asset.requesterName;

        if (asset.status === 'waiting_creation') {
            const transactionCode = await generateTransactionCode('CRT', asset.location);
            const notesWithCode = `Aset dibuat dan disetujui oleh ${user.displayName}. Kode Transaksi: ${transactionCode}\n${asset.notes || ''}`.trim();
            batch.update(assetRef, {
                status: 'Aktif_creation',
                approvedBy: user.uid,
                approvedAt: serverTimestamp(),
                transactionCode: transactionCode,
                notes: notesWithCode
            });
            
            batch.set(doc(logCollection), {
              type: 'ASSET',
              action: 'APPROVE_CREATE',
              description: `Menyetujui pendaftaran aset baru "${asset.name}"`,
              targetId: asset.id,
              targetCode: asset.code,
              targetName: asset.name,
              userId: user.uid,
              userName: user.displayName || user.email,
              userDept: user.department || 'N/A',
              timestamp: serverTimestamp(),
            });
        }

        if (asset.status === 'waiting_mutasi' || asset.status === 'karyawan_approved') {
            const notes = asset.notes || '';
            const locationMatch = notes.match(/Lokasi Baru: (.*)/);
            const userMatch = notes.match(/Pengguna Baru: (.*)/);
            const quantityMatch = notes.match(/Jumlah: (\d+)/);

            const newLocation = locationMatch ? locationMatch[1].trim() : asset.mutationTargetDepartment || asset.location;
            const newUser = userMatch ? userMatch[1].trim() : '';
            const mutationQuantity = quantityMatch ? parseInt(quantityMatch[1], 10) : asset.qty;
            const isPartialMutation = mutationQuantity < asset.qty;
            const transactionCode = await generateTransactionCode('MUT', newLocation);

            const approvalNote = `Mutasi ${mutationQuantity} unit dari: ${asset.location} ke ${newLocation} disetujui oleh ${approverRole} (${approverName}). Diajukan oleh: ${originalRequesterName}. Kode Transaksi: ${transactionCode}`;
            const cleanedNotes = notes.split('--- MUTASI DIAJUKAN ---')[0].trim();
            const newNotes = `${cleanedNotes}\n${approvalNote}`.trim();
            
            const newCostCenter = costCenterMapping[newLocation];

            if (isPartialMutation) {
                batch.update(assetRef, {
                    qty: asset.qty - mutationQuantity,
                    notes: `${asset.notes}\n\n--- SEBAGIAN DIMUTASI ---\n${mutationQuantity} unit dimutasi ke ${newLocation}.`.trim(),
                    status: 'Aktif', requestedBy: null, requestedAt: null, mutationTargetDepartment: null,
                });
                const newAssetData: Omit<Asset, 'id'> = {
                    ...asset, qty: mutationQuantity, location: newLocation,
                    user: newUser === '(tidak ada)' ? '' : newUser,
                    costCenter: newCostCenter || asset.costCenter, status: 'approved_mutasi',
                    notes: newNotes, code: `${asset.code}-M${Date.now()}`,
                    approvedBy: user.uid, approvedAt: approvalDate ? Timestamp.fromDate(approvalDate) : serverTimestamp(),
                    createdAt: serverTimestamp(), updatedAt: serverTimestamp(), transactionCode: transactionCode,
                };
                delete (newAssetData as any).id;
                delete (newAssetData as any).karyawanApproverId;
                const newAssetRef = doc(collection(db, 'assets'));
                batch.set(newAssetRef, newAssetData);
            } else {
                const updateData: any = {
                    status: 'approved_mutasi', location: newLocation,
                    user: newUser === '(tidak ada)' ? '' : newUser,
                    notes: newNotes, approvedBy: user.uid, approvedAt: approvalDate ? Timestamp.fromDate(approvalDate) : serverTimestamp(), transactionCode: transactionCode,
                };
                if (newCostCenter) updateData.costCenter = newCostCenter;
                batch.update(assetRef, updateData);
            }
            
            batch.set(doc(logCollection), {
              type: 'ASSET',
              action: 'APPROVE_MUTATION',
              description: `Menyetujui mutasi aset "${asset.name}" ke ${newLocation}`,
              targetId: asset.id,
              targetCode: asset.code,
              targetName: asset.name,
              userId: user.uid,
              userName: user.displayName || user.email,
              userDept: user.department || 'N/A',
              timestamp: serverTimestamp(),
            });
        } else if (asset.status === 'waiting_edit') {
             const transactionCode = await generateTransactionCode('EDT', asset.location);
             const notes = asset.notes || '';
             const conditionMatch = notes.match(/Kondisi Baru: (.*)/);
             const newCondition = conditionMatch ? conditionMatch[1].trim() as AssetCondition : asset.condition;
             const cleanedNotes = notes.split('--- PERUBAHAN KONDISI DIAJUKAN ---')[0].trim();
             const approvalNote = `Perubahan kondisi menjadi "${newCondition}" disetujui oleh ${approverRole} (${approverName}). Kode Transaksi: ${transactionCode}`;
             
             batch.update(assetRef, {
                status: 'approved_edit', condition: newCondition,
                notes: `${cleanedNotes}\n${approvalNote}`.trim(),
                approvedBy: user.uid, approvedAt: approvalDate ? Timestamp.fromDate(approvalDate) : serverTimestamp(), transactionCode: transactionCode,
             });
             
             batch.set(doc(logCollection), {
              type: 'ASSET',
              action: 'APPROVE_CONDITION',
              description: `Menyetujui perubahan kondisi aset "${asset.name}" menjadi ${newCondition}`,
              targetId: asset.id,
              targetCode: asset.code,
              targetName: asset.name,
              userId: user.uid,
              userName: user.displayName || user.email,
              userDept: user.department || 'N/A',
              timestamp: serverTimestamp(),
            });
        }
        
        batch.commit().then(() => {
            toast({
                title: 'Pengajuan Disetujui', description: `Aset "${asset.name}" telah disetujui.`,
                action: <ToastAction altText="Cetak" onClick={() => handlePrintRequest(asset as EnrichedAsset)}>Cetak</ToastAction>,
            });
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: assetRef.path, operation: 'write', requestResourceData: { status: 'approved' },
            });
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => {
            setIsUpdating(null);
            setAssetToApprove(null);
            setIsApprovalDialogOpen(false);
        });

    } else if (action === 'approve_pusat') { 
        const finalNote = `${asset.notes}\n\nPersetujuan akhir oleh Pusat (CGC) pada ${format(approvalDate || new Date(), 'd MMM yyyy, HH:mm', { locale: id })}. Kode Transaksi: ${asset.transactionCode}`;

        batch.update(assetRef, {
            status: 'approved_disposal',
            approvedBy: user.uid,
            approvedAt: approvalDate ? Timestamp.fromDate(approvalDate) : serverTimestamp(),
            notes: finalNote.trim(),
        });
        
        batch.set(doc(logCollection), {
          type: 'ASSET',
          action: 'APPROVE_DISPOSAL',
          description: `Menyetujui penghapusan (disposal) aset "${asset.name}"`,
          targetId: asset.id,
          targetCode: asset.code,
          targetName: asset.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });
        
        await batch.commit();
        toast({ title: 'Disposal Disetujui', description: `Aset "${asset.name}" telah disetujui for disposal.` });
        setIsUpdating(null);
        setAssetToApprove(null);
        setIsApprovalDialogOpen(false);

    } else { 
        const approverInfo = await fetchUser(user.uid);
        const approverName = approverInfo.name || approverInfo.email || 'Approver';
        const approverRole = user.role;

        let rejectionNoteType = 'PENGAJUAN';
        if (asset.status === 'waiting_edit') rejectionNoteType = 'PERUBAHAN KONDISI';
        if (asset.status === 'waiting_mutasi') rejectionNoteType = 'MUTASI';
        if (asset.status === 'waiting_disposal') rejectionNoteType = 'DISPOSAL';
        
        if (asset.status === 'waiting_creation') {
            deleteDoc(assetRef).then(() => {
                toast({ title: 'Pengajuan Ditolak', description: `Pengajuan aset "${asset.name}" ditolak dan data dihapus.` });
            }).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: assetRef.path,
                    operation: 'delete',
                });
                errorEmitter.emit('permission-error', permissionError);
            }).finally(() => {
                setIsUpdating(null);
            });
        } else {
            const updateData = {
                status: 'Aktif',
                approvedBy: user.uid,
                approvedAt: serverTimestamp(),
                notes: `${asset.notes?.split(`--- ${rejectionNoteType} DIAJUKAN ---`)[0].trim() || ''}\n\n--- PENGAJUAN DITOLAK ---\nPengajuan ditolak oleh ${approverRole} (${approverName}) pada ${format(new Date(), 'PPpp', {locale: id})}`.trim(),
                requestedBy: null,
                requestedAt: null,
                mutationTargetDepartment: null,
            };
            updateDoc(assetRef, updateData).then(() => {
                toast({
                    title: 'Pengajuan Ditolak',
                    description: `Pengajuan untuk aset "${asset.name}" telah ditolak.`,
                });
            }).catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: assetRef.path,
                    operation: 'update',
                    requestResourceData: updateData,
                });
                errorEmitter.emit('permission-error', permissionError);
            }).finally(() => {
                setIsUpdating(null);
            });
        }
        
        await addDoc(logCollection, {
          type: 'ASSET',
          action: 'REJECT_REQUEST',
          description: `Menolak pengajuan ${rejectionNoteType.toLowerCase()} aset "${asset.name}"`,
          targetId: asset.id,
          targetCode: asset.code,
          targetName: asset.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });
    }
  };

  const handleCancelApproval = async () => {
    if (!assetToCancel || !isAdmin) return;
    if (!cancellationReason) {
        toast({
            variant: 'destructive',
            title: 'Alasan Dibutuhkan',
            description: 'Mohon isi alasan pembatalan persetujuan.',
        });
        return;
    }

    setIsUpdating(assetToCancel.id);
    const assetRef = doc(db, 'assets', assetToCancel.id);

    try {
        const cancelNote = `\n\n--- PEMBATALAN ---
Persetujuan untuk ${assetToCancel.status.replace('approved_', '')} dibatalkan oleh ${user?.displayName} pada ${format(new Date(), 'PPpp', { locale: id })}.
Alasan: ${cancellationReason}`;

        const previousLocation = getPreviousLocation(assetToCancel.notes);
        
        const crtCodeMatch = assetToCancel.notes?.match(/Kode Transaksi: (CRT-.*?)\n/);
        const originalTransactionCode = crtCodeMatch ? crtCodeMatch[1] : assetToCancel.transactionCode;
        
        const updateData: any = {
            status: 'Aktif',
            notes: (assetToCancel.notes || '') + cancelNote,
            approvedAt: null,
            approvedBy: null,
            accountingUpdatedAt: null,
            accountingUpdatedBy: null,
            transactionCode: originalTransactionCode, 
        };

        if (assetToCancel.status === 'approved_mutasi' && previousLocation) {
            updateData.location = previousLocation;
            updateData.costCenter = costCenterMapping[previousLocation] || assetToCancel.costCenter;
        }

        await updateDoc(assetRef, updateData);
        
        await addDoc(collection(db, 'system_logs'), {
          type: 'ASSET',
          action: 'CANCEL_APPROVAL',
          description: `Membatalkan persetujuan aset "${assetToCancel.name}". Alasan: ${cancellationReason}`,
          targetId: assetToCancel.id,
          targetCode: assetToCancel.code,
          targetName: assetToCancel.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({
            title: 'Berhasil Dibatalkan',
            description: `Status aset "${assetToCancel.name}" telah dikembalikan menjadi Aktif.`,
        });
    } catch (error) {
        console.error('Error cancelling approval:', error);
        toast({
            variant: 'destructive',
            title: 'Gagal Membatalkan',
            description: 'Terjadi kesalahan saat membatalkan persetujuan.',
        });
    } finally {
        setIsUpdating(null);
        setIsCancelDialogOpen(false);
        setAssetToCancel(null);
        setCancellationReason('');
    }
};

  const openApprovalDialog = (asset: EnrichedAsset) => {
    setAssetToApprove(asset);
    setApprovalDate(new Date());
    setIsApprovalDialogOpen(true);
  };

  const confirmApproval = () => {
    if (!assetToApprove) return;
    const action = assetToApprove.status === 'waiting_disposal' ? 'approve_pusat' : 'approve';
    handleAction(assetToApprove, action, approvalDate);
  };

  const openAccountingUpdateDialog = (asset: EnrichedAsset) => {
    setAssetToUpdateAccounting(asset);
    setAccountingUpdateDate(new Date());
    setIsAccountingUpdateDialogOpen(true);
  };
  
  const handleAccountingUpdate = async () => {
    if (!user || !assetToUpdateAccounting || !accountingUpdateDate) return;
    setIsUpdating(assetToUpdateAccounting.id);
    try {
        const assetRef = doc(db, 'assets', assetToUpdateAccounting.id);
        await updateDoc(assetRef, {
            accountingUpdatedBy: user.uid,
            accountingUpdatedAt: Timestamp.fromDate(accountingUpdateDate),
        });
        
        await addDoc(collection(db, 'system_logs'), {
          type: 'ASSET',
          action: 'ACCOUNTING_SYNC',
          description: `Update siklus akuntansi untuk disposal aset "${assetToUpdateAccounting.name}"`,
          targetId: assetToUpdateAccounting.id,
          targetCode: assetToUpdateAccounting.code,
          targetName: assetToUpdateAccounting.name,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({
            title: 'Berhasil',
            description: 'Status update akuntansi telah dicatat.',
        });
    } catch (error) {
        console.error("Error updating accounting status:", error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal mencatat status update.' });
    } finally {
        setIsUpdating(null);
        setIsAccountingUpdateDialogOpen(false);
    }
  };

  const openPrintDialog = (asset: EnrichedAsset) => {
    setSelectedAsset(asset);
    setIsPrintDialogOpen(true);
  };

  const handlePrintRequest = (asset: EnrichedAsset) => {
    if (asset.status.includes('creation') || activeTab === 'creation') {
        handlePrintFixAssetForm(asset);
    } else {
        openPrintDialog(asset);
    }
  };
  
  const handlePrintForm = () => {
    if (!selectedAsset) return;
    
    if (selectedAsset.status.includes('creation')) {
        handlePrintFixAssetForm(selectedAsset);
    } else if(selectedAsset.status.includes('disposal')) {
        handlePrintDisposal();
    } else {
        handlePrintMutation();
    }
    
    setIsPrintDialogOpen(false);
    setSelectedAsset(null);
  };

  const handlePrintDisposal = async () => {
    if (!selectedAsset) return;

    const asset = selectedAsset;
    const fillData = printOption === 'fill';

    const printDate = asset.requestedAt?.toDate() || new Date();
    const day = printDate.getDate().toString();
    const month = (printDate.getMonth() + 1).toString();
    const year = printDate.getFullYear().toString();
    
    const purchasePriceDisplay = (printOption === 'empty') ? '' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);
    const purchaseDateDisplay = (printOption === 'empty' || !asset.purchaseDate) ? '' : format(asset.purchaseDate.toDate(), 'd MMM yyyy', {locale: id});
    
    const assetName = asset.name;
    const assetCode = asset.code;
    const assetLocation = asset.location;
    const assetLifetime = asset.assetLifetime ? `${asset.assetLifetime} tahun` : '';

    const notes = asset.notes || '';
    const reasonMatch = notes.match(/Alasan: (.*)/s);
    const reason = reasonMatch ? reasonMatch[1].trim().split('\n')[0] : (asset.condition || '');

    let publicUrl = `${window.location.origin}/public/asset?assetId=${asset.id}`;
    if (asset.status === 'Bukan_Asset_Perusahaan') {
        publicUrl = `${window.location.origin}/public/personal?id=${asset.id}`;
    } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
        publicUrl = `${window.location.origin}/public/utility?id=${asset.id}`;
    }
    const qrCodeUrl = await QRCode.toDataURL(publicUrl, { margin: 1, width: 250 });

    const formHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>FORM DISPOSAL ASET</title>
    <style>
    @media print {
      @page { size: A4 landscape; margin: 10mm; }
      body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
      .page { border: none !important; }
    }
    body { font-family: 'BiauKai', Arial, sans-serif; font-size: 11pt; }
    .page { width: 297mm; height: 210mm; margin: auto; padding: 10mm; box-sizing: border-box; border: 1px solid #000; }
    table { width: 100%; border-collapse: collapse; }
    td, th { border: 1px solid #000; padding: 4px; vertical-align: top; text-align: center; }
    .header-main { font-size: 16pt; font-weight: bold; }
    .header-sub { font-size: 14pt; font-weight: bold; }
    .no-border, .no-border td, .no-border th { border: none; padding: 0; }
    .text-right { text-align: right; }
    .signature-box { height: 80px; }
    .footer-notes { display: flex; justify-content: space-between; font-size: 9pt; margin-top: 5px; padding: 0 10px; }
    .footer-notes span { text-align: center; flex: 1; }
    .nested-table { width: 100%; height: 100%; }
    .nested-table td { border: none; text-align: left; vertical-align: top; padding: 1px 4px; }
    .nested-table td:first-child { width: auto; white-space: nowrap; }
    </style>
    </head>
    <body>
    <div class="page">
      <table class="no-border" style="margin-bottom: 10px;">
        <tr class="no-border"><td class="header-main" colspan="12">PT. CHINA GLAZE INDONESIA</td></tr>
        <tr class="no-border"><td class="header-sub" colspan="12">不動產/廠房及設備處理申請單</td></tr>
        <tr class="no-border"><td class="header-sub" colspan="12">FORM DISPOSAL ASET BANGUNAN, PABRIK, DAN MESIN</td></tr>
        <tr class="no-border" style="font-size: 10pt;">
            <td colspan="4" style="text-align: left; padding-left: 0;">單位Bagian: ${assetLocation || '____________________'}</td>
            <td colspan="4" style="text-align: center;">${day} 日/DD &nbsp;&nbsp;${month} 月/MM &nbsp;&nbsp;${year} 年/YYYY</td>
            <td colspan="4" style="text-align: right;">表號: 0-32-025</td>
        </tr>
      </table>
      <table>
        <thead>
            <tr>
                <th colspan="4">(保管單位填) <br> diisi Unit User</th>
                <th colspan="2">(財務部填) <br> diisi Unit F&A</th>
                <th colspan="4">(主管單位填) <br> diisi Unit Manager</th>
                <th colspan="2">核 准 <br> Persetujuan</th>
            </tr>
        </thead>
        <tbody>
          <tr>
            <td colspan="4" style="height: 30px; text-align: left; padding: 5px;">名稱 Nama: ${assetName}</td>
            <td colspan="2" rowspan="2" style="padding: 0;">
              <table class="nested-table"><tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">購入金額 Harga beli</td></tr><tr><td style="text-align: center; font-weight: bold; padding-top: 4px;">${purchasePriceDisplay}</td></tr></table>
            </td>
            <td colspan="4" style="height: 30px; text-align: left; padding: 5px;">購入日期 Tgl pembelian: ${purchaseDateDisplay}</td>
            <td colspan="2" rowspan="6"></td>
          </tr>
          <tr>
            <td colspan="4" style="height: 30px; text-align: left; padding: 5px;">編號 Nomor: ${assetCode}</td>
            <td colspan="4" rowspan="10" style="padding: 0;">
                <table class="nested-table">
                    <tr><td style="text-align: left; padding: 5px;">處理方式 Metode disposal: Disposal</td></tr>
                    <tr>
                        <td style="text-align: center; vertical-align: middle; height: 200px;">
                            <img src="${qrCodeUrl}" style="width: 180px; height: 180px;" />
                            <div style="font-size: 7pt; color: #666; margin-top: 2px;">Verification Link</div>
                        </td>
                    </tr>
                </table>
            </td>
          </tr>
          <tr>
            <td colspan="4" rowspan="8" style="text-align: left; padding: 5px; vertical-align: top;">原因 Alasan: ${reason}</td>
            <td colspan="2" style="padding: 0;">
              <table class="nested-table"><tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">耐用年限 Masa guna</td></tr><tr><td style="text-align: center; font-weight: bold;">${assetLifetime}</td></tr></table>
            </td>
          </tr>
          <tr><td colspan="2" style="height: 30px;"></td></tr>
          <tr><td colspan="2" rowspan="2" style="padding: 0;"><table class="nested-table"><tr><td style="text-align: center;">已提列折舊金額<br>Nilai depresiasi</td></tr><tr><td></td></tr></table></td></tr>
          <tr></tr>
          <tr><td colspan="2" rowspan="2" style="height: 30px;"></td><td rowspan="2" colspan="2">備  註<br>Keterangan</td></tr>
          <tr></tr>
          <tr><td colspan="2" style="padding: 0;"><table class="nested-table"><tr><td style="text-align: center;">殘值 Sisa nilai aset</td></tr><tr><td></td></tr></table></td><td colspan="2" rowspan="4"></td></tr>
          <tr><td colspan="2" style="height: 30px;"></td></tr>
        </tbody>
        <tfoot>
            <tr>
                <th>副 總 <br> Vice GM</th><th>經 理 <br> Manager</th><th>課 長 <br> Sec. Head</th><th>經 辦 <br> Pelaksana</th>
                <th>經 理 <br> Manager</th><th>經 辦 <br> Pelaksana</th>
                <th>副 總 <br> Vice GM</th><th>經 理 <br> Manager</th><th>課 長 <br> Sec. Head</th><th>經 辦 <br> Pelaksana</th>
                <td class="signature-box" colspan="2" rowspan="2"></td>
            </tr>
            <tr>
                <td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td>
                <td class="signature-box"></td><td class="signature-box"></td>
                <td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td>
            </tr>
        </tfoot>
      </table>
      <div style="display: flex; justify-content: space-between; font-size:10pt; margin-top:5px;">
        <span>Kode Transaksi: ${asset.transactionCode || '____________________'}</span>
      </div>
      <div class="footer-notes">
        <span>第一聯:主管單位存(白)<br>Lembar 1 disimpan unit Manager (putih),</span>
        <span>第二聯:財務部存(紅)<br>lembar 2 disimpan unit F&A (merah),</span>
        <span>第三聯:保管單位存(黃)<br>lembar 3 disimpan unit User (kuning)</span>
      </div>
    </div>
    </body>
    </html>`;
    const printWindow = window.open('', '', 'width=1123,height=794');
    if (printWindow) {
        printWindow.document.write(formHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };
  
    const handlePrintFixAssetForm = async (asset: EnrichedAsset) => {
    if (!asset) return;
    const purchaseDate = asset.purchaseDate ? format(asset.purchaseDate.toDate(), 'dd-MM-yyyy') : '';
    const projectDate = asset.projectInspectionDate ? asset.projectInspectionDate.toDate() : null;
    const inspProyekDate = projectDate ? format(projectDate, 'dd-MM-yyyy') : '';
    const createdAtDate = asset.createdAt ? asset.createdAt.toDate() : new Date();

    const tglInput = format(createdAtDate, 'dd');
    const bulanInput = format(createdAtDate, 'MM');
    const tahunInput = format(createdAtDate, 'yyyy');

    const formattedPrice = (asset.priceUSD ?? 0) > 0 
      ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(asset.priceUSD!)
      : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);
    
    const qrData = `${window.location.origin}/public/asset?assetId=${asset.id}`;
    const qrCodeUrl = await QRCode.toDataURL(qrData, { margin: 1, width: 250 });

    const formHtml = `
<!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>Form FIX ASSET - ${asset.code}</title>
<style>
  @media print {
    @page { size: 215.9mm 139.7mm; margin: 2mm; }
    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
    .page { border: none !important; page-break-after: always; }
  }
  body { font-family: 'BiauKai', Arial, sans-serif; margin: 0; padding: 0; }
  .page { width: 215.9mm; height: 139.7mm; margin: auto; padding: 8mm; box-sizing: border-box; border: 1px solid #000; }
  table { width: 100%; border-collapse: collapse; table-layout: fixed; }
  td { border: 1px solid #000; vertical-align: middle; font-size: 11px; padding: 2px 4px; text-align: center; height: 15px; }
  .title { text-align: center; font-weight: bold; font-size: 16px; }
  .subtitle { text-align: center; font-size: 12px; }
  .formtitle { text-align: center; font-weight: bold; font-size: 14px; }
  .input { text-align: center; font-size: 11px; vertical-align: middle; font-weight: bold; }
  .no-border td { border: none !important; }
  .label-cell { border: none; text-align: left; vertical-align: bottom; }
  .qr-container { width: 115px; height: 115px; margin: 0 auto; display: flex; align-items: center; justify-content: center; }
  .qr-container img { width: 100%; height: 100%; object-fit: contain; display: block; }
</style>
</head>
<body>
<div class="page">
  <table class="no-border" style="width:100%; margin-bottom:4px;">
    <tr><td class="title">PT. CHINA GLAZE INDONESIA</td></tr>
    <tr><td style="text-align:center; font-size:12px;">不動產、廠房及設備保管卡 <span style="font-weight:bold; font-size:14px;">FORM FIX ASSET</span></td></tr>
  </table>
  <table>
    <tr class="no-border">
      <td class="label-cell">財產類別<br>Item Fix Asset</td>
      <td colspan="2" class="input" style="font-weight: normal; text-align:left; padding-left: 5px;">${asset.category || ''}</td>
      <td class="label-cell">建卡日期<br>Tgl Input</td>
      <td class="label-cell" style="font-weight:bold;">日 Tgl: ${tglInput}</td>
      <td class="label-cell" style="font-weight:bold;">月 Bln: ${bulanInput}</td>
      <td class="label-cell" style="font-weight:bold;">年 Thn: ${tahunInput}</td>
      <td colspan="2" class="input" style="border-bottom: none !important; font-size:10px; vertical-align: bottom;">
        □ 正本 / Asli &nbsp;&nbsp; □ 副本 / Copy <br>
        □ 列帳 / FixA &nbsp;&nbsp; □ 列管 / FixB
      </td>
    </tr>
    <tr>
      <td>財產編號<br><br>No. Fix Asset</td>
      <td class="input" style="font-size: 10px;">${asset.code || ''}</td>
      <td>財產名稱<br><br>Nama Barang</td>
      <td colspan="2" class="input">${asset.name || ''}</td>
      <td>單位<br><br>Satuan</td>
      <td class="input">${asset.qty ? `${asset.qty} Unit` : ''}</td>
      <td>耐用年限<br><br>Ketahanan</td>
      <td class="input">${asset.assetLifetime ? `${asset.assetLifetime} Tahun` : ''}</td>
    </tr>
    <tr>
      <td rowspan="3">規格<br><br>Spec Barang</td>
      <td rowspan="3" colspan="3" class="input" style="text-align: center; vertical-align: middle;">
        <div class="qr-container">
            <img src="${qrCodeUrl}" alt="QR Code" />
        </div>
      </td>
      <td colspan="5">憑單編號 No. Dokument</td>
    </tr>
    <tr>
      <td>工程單號<br><br><span style="font-size:10px;">No.Insp Proyek</span></td>
      <td class="input">${asset.projectInspectionNumber || ''}</td>
      <td>工程驗送單<br><br><span style="font-size:9px;">Tgl Insp Proyek</span></td>
      <td colspan="2" class="input">${inspProyekDate}</td>
    </tr>
    <tr>
      <td>請購單號<br><br><span style="font-size:10px;">No.PR</span></td>
      <td class="input">${asset.prNumber || ''}</td>
      <td>物料驗送單<br><br><span style="font-size:10px;">No.Insp</span></td>
      <td colspan="2" class="input">${asset.inspectionNumber || ''}</td>
    </tr>
    <tr>
      <td>購入金額<br><br>Harga Barang</td>
      <td class="input">${formattedPrice}</td>
      <td>購入日期<br><br>Tgl Diterima</td>
      <td class="input">${purchaseDate}</td>
      <td>供應商<br><br>Supplier</td>
      <td class="input" style="font-size: 8px;">${asset.supplier || ''}</td>
      <td>存放地點<br><br>Ditempatkan</td>
      <td colspan="2" class="input">${asset.location || ''}</td>
    </tr>
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">附屬設備</td>
      <td colspan="4" class="input">${asset.accessory1 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td style="text-align: center; vertical-align: middle; height: 25px;">Kelengkapan</td>
      <td colspan="4" class="input">${asset.accessory2 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td>Barang</td>
      <td colspan="4" class="input">${asset.accessory3 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td>Lainnya</td>
      <td colspan="4" class="input">${asset.accessory4 || ''}</td>
      <td colspan="4" class="input"></td>
    </tr>
    <tr>
      <td>主管<br><br>Atasan</td>
      <td colspan="2" class="input"></td>
      <td>保管人<br><br>Yg Merawat</td>
      <td class="input"></td>
      <td>主管<br><br>Atasan</td>
      <td class="input"></td>
      <td>建卡人<br><br>Dibuat</td>
      <td class="input"></td>
    </tr>
  </table>
  <div style="display: flex; justify-content: space-between; align-items: center; font-size:10px; margin-top:2mm;">
    <span style="font-weight: bold;">Kode Transaksi: ${asset.transactionCode || ''}</span>
    <span>表號:0-32-024</span>
  </div>
</div>
</body>
</html>
          `;
    
    const printWindow = window.open('', '', 'width=815,height=528'); 
    if (printWindow) {
      printWindow.document.write(formHtml);
      printWindow.document.close();
      setTimeout(() => {
        printWindow.focus();
        printWindow.print();
        printWindow.close();
      }, 500);
    } else {
        toast({
            variant: "destructive",
            title: "Gagal Mencetak",
            description: "Tidak dapat membuka jendela cetak. Pastikan pop-up diizinkan.",
        });
    }
  };

  const handlePrintMutation = () => {
    if (!selectedAsset) return;
    const asset = selectedAsset;
    const fillData = printOption === 'fill';

    let mutationPrintDate = getPlannedDateFromNotes(asset.notes) || asset.approvedAt?.toDate() || new Date();

    const day = fillData ? format(mutationPrintDate, 'd') : '____';
    const month = fillData ? format(mutationPrintDate, 'MM') : '____';
    const year = fillData ? format(mutationPrintDate, 'yyyy') : '____';
    
    const assetName = fillData ? asset.name : '';
    const assetCode = fillData ? asset.code : '';
    
    const notes = asset.notes || '';
    const approvalNoteMatch = notes.match(/Mutasi \d+ unit dari: (.*?) ke (.*?)\sdisetujui/);
    const requestNoteMatch = notes.match(/Lokasi Baru: (.*?)\n.*Alasan: (.*)/s);
    
    const previousLocation = approvalNoteMatch ? approvalNoteMatch[1].trim() : (getPreviousLocation(notes) || asset.location);
    const newLocation = approvalNoteMatch ? approvalNoteMatch[2].trim() : (requestNoteMatch ? requestNoteMatch[1].trim() : (asset.mutationTargetDepartment || ''));
    
    let reason = '';
    if(asset.status.includes('edit')) {
        const conditionMatch = notes.match(/Kondisi Baru: (.*?)\n.*Alasan: (.*)/s);
        reason = `Perubahan kondisi menjadi ${conditionMatch ? conditionMatch[1].trim() : 'N/A'}. Alasan: ${conditionMatch ? conditionMatch[2].trim() : (notes.split('---').pop() || '').trim()}`;
    } else {
        reason = requestNoteMatch ? requestNoteMatch[2].trim() : (notes.split('---').pop() || '').trim();
    }
    
    const assetQty = fillData && asset.qty ? `${getMutationQuantityDisplay(asset)} Unit` : '';

    const formHtml = `
    <!DOCTYPE html>
    <html lang="id">
    <head>
    <meta charset="UTF-8">
    <title>FORM PEMBERITAHUAN MUTASI DAN ASSET</title>
    <style>
      @media print {
        @page { size: A4 landscape; margin: 10mm; }
        body { margin: 0; padding: 0; -webkit-print-color-adjust: exact; }
        .page { border: none !important; }
        
      }
      body { font-family: 'BiauKai', Arial, sans-serif; font-size: 11pt; }
      .page { width: 297mm; height: 210mm; margin: auto; padding: 15mm; box-sizing: border-box; border: 1px solid #000; }
      table { width: 100%; border-collapse: collapse; table-layout: fixed; }
      td, th { border: 1px solid #000; padding: 6px; vertical-align: middle; text-align: left; }
      .header-table { border: none; margin-bottom: 10px; }
      .header-table td { border: none; padding: 0; }
      .header-main { text-align: center; font-size: 16pt; font-weight: bold; }
      .header-sub { text-align: center; font-size: 14pt; font-weight: bold; }
      .text-right { text-align: right; }
      .checkbox { width: 16px; height: 16px; border: 1px solid #000; display: inline-block; margin-right: 5px; }
      .signature-box { height: 60px; border-top:none; border-bottom:none; border-left: 1px solid #000; border-right: 1px solid #000;}
      .th-center { text-align: center; font-weight: bold; }
    </style>
    </head>
    <body>
    <div class="page">
        <table class="header-table">
            <tr><td class="header-main">PT. CHINA GLAZE INDONESIA</td></tr>
            <tr><td class="header-sub">不動產、廠房及設備異動單</td></tr>
            <tr><td class="header-sub" style="padding-bottom: 10px;">FORM PEMBERITAHUAN MUTASI DAN ASSET</td></tr>
        </table>
        <table class="header-table" style="margin-bottom: 10px;">
            <tr>
                <td>單位 Satuan : ${fillData ? previousLocation : '___________'}</td>
                <td class="text-right">Tgl ${day} Bulan ${month} Tahun ${year}</td>
            </tr>
        </table>
        <table>
            <thead>
                <tr>
                    <td style="width: 18%; vertical-align: middle; text-align: center;">原因 Alasan</td>
                    <td colspan="4" style="text-align: center;">
                        <div style="display:inline-flex; align-items:center; margin-right:15px;"><div class="checkbox"></div> 合併 Gabung</div>
                        <div style="display:inline-flex; align-items:center; margin-right:15px;"><div class="checkbox"></div> 分割 Split</div>
                        <div style="display:inline-flex; align-items:center;"><div class="checkbox"></div> 其他 Lain __________</div>
                    </td>
                </tr>
                <tr>
                    <th class="th-center" style="width: 18%;">項目 Item</th>
                    <th class="th-center" colspan="2" style="width: 41%;">異動前 Sebelum Mutasi</th>
                    <th class="th-center" colspan="2" style="width: 41%;">異動後 Sesudah Mutasi</th>
                </tr>
            </thead>
            <tbody>
                <tr><td style="text-align: center;">財產名稱 Nama Barang</td><td colspan="2">${assetName}</td><td colspan="2">${assetName}</td></tr>
                <tr><td style="text-align: center;">財產編號 No.Fix Asset</td><td colspan="2">${assetCode}</td><td colspan="2">${assetCode}</td></tr>
                <tr><td style="text-align: center;">保管單位 Satuan</td><td colspan="2">${assetQty}</td><td colspan="2">${assetQty}</td></tr>
                <tr><td style="text-align: center;">存放地點 Ditempatkan</td><td colspan="2">${fillData ? previousLocation : ''}</td><td colspan="2">${fillData ? newLocation : ''}</td></tr>
                <tr><td style="height: 80px; text-align: center; vertical-align: middle;">備註 Keterangan</td><td colspan="4">${fillData ? reason : ''}</td></tr>
                <tr>
                    <td rowspan="2" class="th-center" style="vertical-align: middle;">單位保管人<br>Kustodian Satuan</td>
                    <td class="text-center">主管 Atasan</td><td class="text-center">保管人 Yg merawat</td>
                    <td class="text-center">主管 Atasan</td><td class="text-center">保管人 Yg merawat</td>
                </tr>
                <tr> <td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td><td class="signature-box"></td> </tr>
                <tr><td style="text-align: center; vertical-align: middle;">主管單位簽核<br>Pihak berwenang menandatangani</td><td colspan="4"></td></tr>
            </tbody>
        </table>
      <div style="display: flex; justify-content: space-between; font-size:10pt; margin-top:5px;">
        <span>Kode Transaksi: ${asset.transactionCode || '____________________'}</span>
        <span style="text-align:right;">表號: 0-32-026</span>
      </div>
    </div>
    </body>
    </html>`;
    const printWindow = window.open('', '', 'width=1123,height=794');
    if (printWindow) {
        printWindow.document.write(formHtml);
        printWindow.document.close();
        printWindow.focus();
        setTimeout(() => { printWindow.print(); printWindow.close(); }, 500);
    }
  };

  const handlePrintBeritaAcara = (assetsToPrint: Asset[]) => {
  if (assetsToPrint.length === 0) {
    const selected = allAssets.filter(asset => selectedAssetIds.includes(asset.id));
    if (selected.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada aset terpilih' });
      return;
    }
    assetsToPrint = selected;
  }

  assetsToPrint.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  const today = new Date();
  const dateStr = format(today, 'd-MMMM-yyyy', { locale: id });
  const fromDepartment = user?.department || 'Departemen';
  const userName = user?.displayName || 'User';

  const transactionCodeText = summarizeTransactionCodes(
    assetsToPrint.map(a => a.transactionCode).filter((c): c is string => !!c)
  );

  const tableRows = assetsToPrint.map(asset => {
    const disposalQtyMatch = asset.notes?.match(/Diajukan untuk disposal sebanyak (\d+) unit/);
    const disposalQty = disposalQtyMatch ? parseInt(disposalQtyMatch[1], 10) : asset.qty;
    
    return `
    <tr>
      <td>${asset.code}</td>
      <td>${asset.name}</td>
      <td>${asset.qty}</td>
      <td>${disposalQty}</td>
      <td>${asset.condition}</td>
    </tr>
  `}).join('');

  const printWindow = window.open('', '', 'width=800,height=1000');
  if (printWindow) {
    printWindow.document.write(`
      <html>
        <head>
          <title>Berita Acara</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 11pt; margin: 40px; }
            .header-container { margin-bottom: 10px; }
            .header-table, .content-table, .signature-table { width: 100%; border-collapse: collapse; }
            .header-table td { border: 1px solid black; padding: 5px; }
            .content-table th, .content-table td { border: 1px solid black; padding: 5px; text-align: center; }
            .checkbox-section { margin: 20px 0; }
            .checkbox-section span { margin-right: 20px; }
            .signature-section { margin-top: 50px; }
            .signature-table td { border: none; text-align: center; padding-top: 5px; padding-bottom: 5px; }
            .signature-box { height: 60px; }
            .underline { text-decoration: underline; }
          </style>
        </head>
        <body>
          <div class="header-container">
            <h2 style="text-align: center; margin: 0;">BERITA ACARA</h2>
            <div style="text-align: left; margin-top: 5px;">Nomor : ${transactionCodeText}</div>
          </div>
          <table class="header-table">
            <tr>
              <td style="width: 15%;">Kepada/To</td>
              <td style="width: 45%;">: Dept. Accounting</td>
              <td style="width: 10%;">Attn</td>
              <td style="width: 30%;">: Mr. WU</td>
            </tr>
            <tr>
              <td>Dari/From</td>
              <td>: ${fromDepartment}</td>
              <td>Tanggal/Date</td>
              <td>: ${dateStr}</td>
            </tr>
            <tr>
              <td>Subject</td>
              <td colspan="3">: Penyesuaian Stock / Adjustment</td>
            </tr>
             <tr>
              <td>Cc</td>
              <td colspan="3">:</td>
            </tr>
          </table>

          <div class="checkbox-section">
            <p><strong>Jenis Barang */Types of goods *</strong></p>
            <span>&#9744; Sparepart</span>
            <span>&#9744; Supporting Material</span>
            <span>&#9744; Goods in Process</span>
            <span>&#9746; Asset</span>
            <br>
            <span>&#9744; Raw Material</span>
            <span>&#9744; Finish Goods</span>
            <p style="font-size: 9pt;">* Beri tanda &#9746; pada item yang dipilih/ Put a mark on the select item</p>
          </div>
          
          <p>Dengan Hormat,</p>
          <p>Dengan ini kami akan Menghapus Nomer Kode Asset, mohon untuk dilakukan Adjustment Penghapusan dengan kode Asset sbb:<br>
          <i>With this we will delete the Asset Code Number, please do the Deletion Adjustment with the Asset code as follows:</i></p>

          <table class="content-table">
            <thead>
              <tr>
                <th>KODE ASSET</th>
                <th>NAMA INVENTORY</th>
                <th>QTY ADJ IN</th>
                <th>QTY ADJ OUT</th>
                <th>KETERANGAN</th>
              </tr>
            </thead>
            <tbody>
              ${tableRows}
            </tbody>
          </table>

          <p style="margin-top: 20px;">Based on the data above, please the Dept. Accounting do the adjustment out.</p>

          <div class="signature-section">
            <div style="float: right; text-align: center;">
              Karawang, ${dateStr}
            </div>
            <br><br>
            <table class="signature-table">
              <tr>
                <td>Dibuat Oleh,</td>
                <td>Mengetahui,</td>
                <td>Mengetahui,</td>
                <td>Mengetahui,</td>
                <td>Disetujui,</td>
              </tr>
              <tr>
                <td><i>Made By,</i></td>
                <td><i>Acknowledge,</i></td>
                <td><i>Acknowledge,</i></td>
                <td><i>Acknowledge</i></td>
                <td><i>Approved,</i></td>
              </tr>
               <tr>
                <td class="underline">${fromDepartment}</td>
                <td class="underline">GA</td>
                <td class="underline">Acc. Dept</td>
                <td class="underline">Director</td>
                <td class="underline">President Director</td>
              </tr>
              <tr>
                <td class="signature-box"></td>
                <td class="signature-box"></td>
                <td class="signature-box"></td>
                <td class="signature-box"></td>
                <td class="signature-box"></td>
              </tr>
              <tr>
                <td>${userName}</td>
                <td>Eko Prasetyo</td>
                <td>Mr.WU</td>
                <td>Tsai Chang Ken</td>
                <td>Tsai Hsien Lung</td>
              </tr>
            </table>
          </div>

        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    setTimeout(() => {
        printWindow.print();
        printWindow.close();
    }, 500);
  }
};
  
  const currentTabAssets = useMemo(() => {
    let assetsToDisplay: EnrichedAsset[] = [];
    const dateFilter = (asset: EnrichedAsset) => {
        const relevantDate = asset.approvedAt || asset.requestedAt;
        return relevantDate ? getYear(relevantDate.toDate()) === selectedYear : false;
    };

    switch (activeTab) {
      case 'waiting':
        assetsToDisplay = waitingAssets;
        break;
      case 'submitted':
        assetsToDisplay = submittedHistory.filter(dateFilter);
        break;
      case 'creation':
        assetsToDisplay = creationHistory.filter(dateFilter);
        break;
      case 'mutation':
        assetsToDisplay = mutationHistory.filter(dateFilter);
        break;
      case 'disposal':
        assetsToDisplay = disposalHistory.filter(dateFilter);
        break;
      case 'edit':
        assetsToDisplay = editHistory.filter(dateFilter);
        break;
      default:
        assetsToDisplay = [];
    }
    return assetsToDisplay;
  }, [activeTab, waitingAssets, submittedHistory, creationHistory, mutationHistory, disposalHistory, editHistory, selectedYear]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
        setSelectedAssetIds(currentTabAssets.map((asset) => asset.id));
    } else {
        setSelectedAssetIds([]);
    }
  };
  
  const handleSelectOne = (assetId: string, checked: boolean) => {
    if (checked) {
        setSelectedAssetIds((prev) => [...prev, assetId]);
    } else {
        setSelectedAssetIds((prev) => prev.filter((id) => id !== assetId));
    }
  };

  const onTabChange = (value: string) => {
    setActiveTab(value);
    setExpandedId(null);
    setSelectedAssetIds([]); 
  };

  const handleToggle = (id: string) => {
    setExpandedId(prevId => (prevId === id ? null : id));
  };
  
  const handleEditDate = async () => {
    if (!assetToEditDate || !newApprovalDate || !isAdmin) return;
    setIsUpdating(assetToEditDate.id);
    const assetRef = doc(db, 'assets', assetToEditDate.id);
    try {
        await updateDoc(assetRef, {
            approvedAt: Timestamp.fromDate(newApprovalDate),
        });
        toast({ title: 'Berhasil', description: 'Tanggal persetujuan telah diperbarui.' });
    } catch (error) {
        console.error("Error updating approval date:", error);
        toast({ variant: 'destructive', title: 'Gagal' });
    } finally {
        setIsUpdating(null);
        setIsEditDateDialogOpen(false);
        setAssetToEditDate(null);
    }
  };

  const openEditDateDialog = (asset: EnrichedAsset) => {
    setAssetToEditDate(asset);
    setNewApprovalDate(asset.approvedAt?.toDate() || new Date());
    setTimeout(() => setIsEditDateDialogOpen(true), 100);
  };
  
  const requestSort = (key: SortConfig['key']) => {
    let direction: SortDirection = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };
  
  const getSortIcon = (key: SortConfig['key']) => {
    if (sortConfig?.key !== key) return null;
    return sortConfig.direction === 'ascending' ? <ArrowUp className="ml-2 h-3 w-3" /> : <ArrowDown className="ml-2 h-3 w-3" />;
  };
  
  const handleAnnualReportPrint = () => {
    const assetsForReport = currentTabAssets;
    if (assetsForReport.length === 0) {
        toast({ variant: "destructive", title: "Tidak ada data" });
        return;
    }

    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const isCreation = activeTab === 'creation';

    const tableRows = assetsForReport.map(asset => {
        const relevantDate = asset.approvedAt || asset.requestedAt;
        const prevLocation = isCreation ? asset.location : (getPreviousLocation(asset.notes) || (asset.status === 'approved_mutasi' ? asset.location_from : asset.location));
        const newLocation = asset.status === 'approved_mutasi' ? asset.location : '-';
        return `
            <tr>
                <td>${asset.code}</td>
                <td>${asset.name}</td>
                <td>${asset.status.replace(/_/g, ' ')}</td>
                <td>${relevantDate ? format(relevantDate.toDate(), 'd MMM yyyy') : '-'}</td>
                <td>${asset.requesterName || '-'}</td>
                <td>${prevLocation}</td>
                ${isCreation ? '' : `<td>${newLocation}</td>`}
            </tr>
        `;
    }).join('');

    const content = `
        <html>
            <head>
                <title>Laporan ${activeTab} ${selectedYear}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 10pt; }
                    h1 { text-align: center; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                    th, td { border: 1px solid black; padding: 6px; text-align: left; }
                    th { background-color: #f2f2f2; font-weight: bold; }
                    @media print { @page { size: A4 landscape; margin: 1cm; } }
                </style>
            </head>
            <body>
                <h1>Laporan ${activeTab.toUpperCase()} - Tahun ${selectedYear}</h1>
                <table>
                    <thead>
                        <tr>
                            <th>Kode Aset</th>
                            <th>Nama Aset</th>
                            <th>Status</th>
                            <th>Tanggal</th>
                            <th>Pemohon</th>
                            <th>${isCreation ? 'Lokasi' : 'Awal'}</th>
                            ${isCreation ? '' : '<th>Baru</th>'}
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
            </body>
        </html>
    `;
    
    printWindow.document.write(content);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
  };

  const handleShareReport = async () => {
    if (currentTabAssets.length === 0) {
      toast({ variant: "destructive", title: "Tidak Ada Data" });
      return;
    }
    setIsUpdating('share');
    try {
      const reportData = {
        title: `Laporan ${activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} - Tahun ${selectedYear}`,
        assets: currentTabAssets.map(a => ({
          code: a.code,
          name: a.name,
          status: a.status.replace(/_/g, ' '),
          date: a.approvedAt?.toMillis() || a.requestedAt?.toMillis() || null,
          requester: a.requesterName || '-',
          prevLocation: activeTab === 'creation' ? a.location : (getPreviousLocation(a.notes) || (a.status === 'approved_mutasi' ? a.location_from : a.location)),
          newLocation: activeTab === 'creation' ? '-' : (a.status === 'approved_mutasi' ? a.location : '-')
        })),
        createdAt: serverTimestamp(),
      };

      const reportRef = await addDoc(collection(db, 'public_reports'), reportData);
      const publicUrl = `${window.location.origin}/public/report?s=${reportRef.id}`;
      
      if (navigator.share) {
        try {
          await navigator.share({ title: reportData.title, text: `Lihat laporan ${activeTab}:`, url: publicUrl });
          toast({ title: 'Berhasil Dibagikan' });
        } catch (shareError: any) {
          if (shareError.name !== 'AbortError') {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
          }
        }
      } else {
        await navigator.clipboard.writeText(publicUrl);
        toast({ title: 'Link Disalin' });
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Berbagi' });
    } finally {
      setIsUpdating(null);
    }
  };
  
  const yearOptions = useMemo(() => {
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let i = currentYear + 2; i >= 2020; i--) years.push(i);
    return years;
  }, []);

  const renderAssetList = (assets: EnrichedAsset[]) => {
    if (loading || authLoading) {
      return (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => <Skeleton key={`skeleton-${i}`} className="h-20 w-full rounded-xl" />)}
        </div>
      );
    }
    
    if (assets.length === 0) {
      return <p className="text-center text-muted-foreground py-12 italic text-sm">Tidak ada data untuk ditampilkan.</p>;
    }
    
    return (
      <div className="space-y-3 pb-32">
        {assets.map((asset) => (
          <div key={asset.id}>
            <MutationItem
              asset={asset}
              isExpanded={expandedId === asset.id}
              onToggle={() => handleToggle(asset.id)}
              isSelected={selectedAssetIds.includes(asset.id)}
              onSelect={(checked) => handleSelectOne(asset.id, checked)}
              canSelect={activeTab === 'mutation' || activeTab === 'disposal'}
            />
            <AnimatePresence>
              {expandedId === asset.id && (
                <MutationDetailCard 
                    asset={asset}
                    isUpdating={isUpdating === asset.id}
                    activeTab={activeTab}
                    onApproveClick={() => openApprovalDialog(asset)}
                    onRejectClick={() => handleAction(asset, 'reject')}
                    onProcessClick={() => handleProcessWaitingItem(asset)}
                    onProcessPengajuanClick={() => handleProcessPengajuan(asset)}
                    onPrintClick={() => handlePrintRequest(asset)}
                    onPhotoUploadClick={() => { setAssetForPhotoUpload(asset); setTimeout(() => setIsPhotoUploadOpen(true), 100); }}
                    onCancelClick={() => { setAssetToCancel(asset); setTimeout(() => setIsCancelDialogOpen(true), 100); }}
                    onEditDateClick={() => openEditDateDialog(asset)}
                    onUpdateAccountingClick={() => { setAssetToUpdateAccounting(asset); setTimeout(() => setIsAccountingUpdateDialogOpen(true), 100); }}
                />
              )}
            </AnimatePresence>
          </div>
        ))}
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 px-1">
            <div className="text-left">
                <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white uppercase">Mutasi & Disposal</h1>
                <p className="text-sm text-slate-500 font-medium text-left">Pusat kendali persetujuan pemindahan dan penghapusan aset.</p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
                <div className="uiverse-search-container w-full md:w-80">
                    <div className="relative w-full px-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input
                            placeholder="Cari aset..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="uiverse-search-input pl-10"
                        />
                    </div>
                </div>
            </div>
        </div>

        <Card className="border-none shadow-2xl bg-white/60 dark:bg-slate-900/60 backdrop-blur-md rounded-[2.5rem] overflow-hidden">
            <CardHeader className="p-6 sm:p-8 pb-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div className="flex items-center gap-2 text-left">
                        <Label className="text-[10px] font-black uppercase text-muted-foreground text-left">Tahun Laporan</Label>
                        <Select value={String(selectedYear)} onValueChange={(v) => setSelectedYear(Number(v))}>
                            <SelectTrigger className="w-[100px] h-9 rounded-xl border-slate-200 font-bold bg-background">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent className="rounded-xl">
                                {yearOptions.map(y => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="flex flex-wrap gap-2.5">
                        <Button onClick={handleShareReport} className="rounded-xl h-9 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-purple-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                            {isUpdating === 'share' ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />} Bagikan
                        </Button>
                        <Button onClick={handleAnnualReportPrint} className="rounded-xl h-9 bg-slate-700 hover:bg-slate-800 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> PDF
                        </Button>
                        <ExportMutationsButton assets={currentTabAssets} activeTab={activeTab} />
                        {selectedAssetIds.length > 0 && (activeTab === 'mutation' || activeTab === 'disposal') && (
                            <Button onClick={() => handlePrintBeritaAcara([])} className="rounded-xl h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider px-4 border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex items-center justify-center">
                                <Printer className="mr-1.5 h-3.5 w-3.5" /> Berita Acara ({selectedAssetIds.length})
                            </Button>
                        )}
                    </div>
                </div>

                <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
                    <div className="w-full overflow-x-auto scrollbar-hide mb-6">
                        <TabsList className="bg-slate-100 dark:bg-slate-800/50 p-1 rounded-2xl h-auto flex min-w-max w-full sm:w-fit shadow-inner border border-slate-200 dark:border-slate-700">
                            {[
                                { val: 'waiting', label: 'Daftar Tunggu', count: waitingAssets.length, warn: waitingAssets.length > 0 },
                                { val: 'submitted', label: 'Diajukan', count: submittedHistory.length },
                                { val: 'creation', label: 'Penambahan', count: creationHistory.length },
                                { val: 'mutation', label: 'Mutasi', count: mutationHistory.length },
                                { val: 'disposal', label: 'Disposal', count: disposalHistory.length, warn: disposalHistory.some(a => a.status === 'waiting_disposal' && !a.transactionCode) },
                                { val: 'edit', label: 'Edit Kondisi', count: editHistory.length }
                            ].map(tab => (
                                <TabsTrigger 
                                    key={tab.val} 
                                    value={tab.val} 
                                    className={cn(
                                        "rounded-xl px-6 font-black text-[10px] uppercase tracking-widest py-3 data-[state=active]:bg-white dark:data-[state=active]:bg-slate-900 data-[state=active]:text-primary data-[state=active]:shadow-lg transition-all relative",
                                        tab.warn && "after:absolute after:top-1.5 after:right-1.5 after:h-2 after:w-2 after:bg-rose-600 after:rounded-full after:animate-pulse"
                                    )}
                                >
                                    <div className="flex items-center gap-2">
                                        {tab.label}
                                        <span className="opacity-40 font-mono text-[9px]">{tab.count}</span>
                                        {tab.warn && (
                                            <span className="absolute -top-1 -right-1 flex h-3 w-3">
                                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-rose-400 opacity-75"></span>
                                                <span className="relative inline-flex rounded-full h-3 w-3 bg-rose-600 border-2 border-white dark:border-slate-800"></span>
                                            </span>
                                        )}
                                    </div>
                                </TabsTrigger>
                            ))}
                        </TabsList>
                    </div>
                    
                    <div className="flex items-center gap-4 text-[10px] uppercase tracking-[0.2em] font-black text-muted-foreground/50 mb-6 overflow-x-auto whitespace-nowrap scrollbar-hide px-2">
                        <div onClick={() => requestSort('relevantDate')} className={cn("flex items-center cursor-pointer transition-colors", sortConfig?.key === 'relevantDate' ? "text-primary" : "hover:text-primary")}>
                            Tanggal {getSortIcon('relevantDate')}
                        </div>
                        <div onClick={() => requestSort('location')} className={cn("flex items-center cursor-pointer transition-colors", sortConfig?.key === 'location' ? "text-primary" : "hover:text-primary")}>
                            Lokasi {getSortIcon('location')}
                        </div>
                        <div onClick={() => requestSort('code')} className={cn("flex items-center cursor-pointer transition-colors", sortConfig?.key === 'code' ? "text-primary" : "hover:text-primary")}>
                            Kode {getSortIcon('code')}
                        </div>
                    </div>

                    <TabsContent value="waiting" className="mt-0 focus-visible:ring-0">{renderAssetList(waitingAssets)}</TabsContent>
                    <TabsContent value="submitted" className="mt-0 focus-visible:ring-0">{renderAssetList(submittedHistory)}</TabsContent>
                    <TabsContent value="creation" className="mt-0 focus-visible:ring-0">{renderAssetList(creationHistory)}</TabsContent>
                    <TabsContent value="mutation" className="mt-0 focus-visible:ring-0">{renderAssetList(mutationHistory)}</TabsContent>
                    <TabsContent value="disposal" className="mt-0 focus-visible:ring-0">{renderAssetList(disposalHistory)}</TabsContent>
                    <TabsContent value="edit" className="mt-0 focus-visible:ring-0">{renderAssetList(editHistory)}</TabsContent>
                </Tabs>
            </CardHeader>
        </Card>
      </div>
      
      {assetForPhotoUpload && (
          <PhotoUploadDialog 
              asset={assetForPhotoUpload}
              isOpen={isPhotoUploadOpen}
              onOpenChange={setIsPhotoUploadOpen}
          />
      )}

      <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8">
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-left">Opsi Cetak Formulir</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-left">
                    Pilih apakah akan mengisi data formulir secara otomatis atau mencetak formulir kosong.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup defaultValue="fill" onValueChange={(value: 'fill' | 'empty') => setPrintOption(value)} className="py-4">
                <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left">
                    <RadioGroupItem value="fill" id="r-fill" />
                    <Label htmlFor="r-fill" className="font-bold text-sm text-black">Isi Sesuai Data Sistem</Label>
                </div>
                <div className="flex items-center space-x-3 p-3 rounded-xl hover:bg-slate-50 transition-colors cursor-pointer text-left">
                    <RadioGroupItem value="empty" id="r-empty" />
                    <Label htmlFor="r-empty" className="font-bold text-sm text-black">Cetak Formulir Kosong</Label>
                </div>
            </RadioGroup>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel className="rounded-xl font-bold h-11 text-black">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handlePrintForm} className="rounded-xl h-11 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-white"><Printer className="mr-2 h-4 w-4" /> Cetak Sekarang</AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8" onPointerDownOutside={(e) => e.preventDefault()}>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-left">Konfirmasi Persetujuan</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-left">
                  {(assetToApprove?.status === 'waiting_disposal')
                    ? "Apakah proses pusat sudah selesai? Jika sudah, tekan lanjutkan untuk menyetujui penghapusan aset secara permanen."
                    : "Pilih tanggal efektif persetujuan. Tanggal hari ini akan digunakan secara default jika tidak diubah."
                  }
                </AlertDialogDescription>
            </AlertDialogHeader>
            {assetToApprove?.status !== 'waiting_disposal' && (
              <div className="py-6 flex justify-center text-left">
                  <div className="relative flex items-center w-full max-w-[300px]">
                      <Input 
                          type="date"
                          value={approvalDate ? format(approvalDate, "yyyy-MM-dd") : ""}
                          onChange={(e) => {
                              const val = e.target.value;
                              if (!val) setApprovalDate(undefined);
                              else {
                                  const parsed = parse(val, "yyyy-MM-dd", new Date());
                                  setApprovalDate(isValid(parsed) ? parsed : undefined);
                              }
                          }}
                          className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold px-4 pr-10 focus:ring-primary/20 text-black"
                      />
                      <CalendarIcon className="absolute right-3 h-5 w-5 text-primary pointer-events-none" />
                  </div>
              </div>
            )}
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel onClick={() => setAssetToApprove(null)} className="rounded-xl h-11 font-bold text-black">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmApproval} className="rounded-xl h-11 bg-green-600 hover:bg-green-700 font-black uppercase tracking-widest text-white">
                     {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4"/>}
                    Lanjutkan Approve
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <AlertDialog open={isAccountingUpdateDialogOpen} onOpenChange={setIsAccountingUpdateDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8" onPointerDownOutside={(e) => e.preventDefault()}>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-left">Siklus Akuntansi Selesai</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-left">
                    Konfirmasi bahwa proses penyesuaian nilai buku akuntansi untuk aset <span className="font-bold text-primary">{assetToUpdateAccounting?.name}</span> telah dirampungkan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-6 flex justify-center text-left">
                <div className="relative flex items-center w-full max-w-[300px]">
                    <Input 
                        type="date"
                        value={accountingUpdateDate ? format(accountingUpdateDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) setAccountingUpdateDate(undefined);
                            else {
                                const parsed = parse(val, "yyyy-MM-dd", new Date());
                                setAccountingUpdateDate(isValid(parsed) ? parsed : undefined);
                            }
                        }}
                        className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold px-4 pr-10 text-black"
                    />
                    <CalendarIcon className="absolute right-3 h-5 w-5 text-blue-600 pointer-events-none" />
                </div>
            </div>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel onClick={() => setAssetToUpdateAccounting(null)} className="rounded-xl h-11 font-bold text-black">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleAccountingUpdate} className="rounded-xl h-11 bg-blue-600 hover:bg-blue-700 font-black uppercase tracking-widest text-white">
                     {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <FileCheck className="mr-2 h-4 w-4"/>}
                    Konfirmasi Update
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8" onPointerDownOutside={(e) => e.preventDefault()}>
            <AlertDialogHeader>
                <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-2 text-left"><RotateCcw className="h-8 w-8 text-rose-600" /></div>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-rose-600 text-left">Batalkan Persetujuan</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-left">
                    Status aset <span className="font-bold text-foreground">{assetToCancel?.name}</span> akan dikembalikan menjadi AKTIF. Riwayat persetujuan sebelumnya akan dianulir.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4 text-left">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 mb-2 block text-left">Alasan Pembatalan</Label>
                <Textarea
                    placeholder="Wajib diisi..."
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    className="min-h-[100px] rounded-xl bg-slate-50 border-none shadow-inner resize-none font-medium text-sm leading-relaxed text-black"
                />
            </div>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel onClick={() => setAssetToCancel(null)} className="rounded-xl h-11 font-bold text-black">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelApproval} disabled={isUpdating === assetToCancel?.id || !cancellationReason} className="rounded-xl h-11 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-white">
                     {isUpdating === assetToCancel?.id ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4"/>}
                    Batalkan Sekarang
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8" onPointerDownOutside={(e) => e.preventDefault()}>
            <AlertDialogHeader>
                <AlertDialogTitle className="text-xl font-black uppercase tracking-tight text-left text-black">Edit Tanggal Persetujuan</AlertDialogTitle>
                <AlertDialogDescription className="text-sm font-medium text-left text-black">
                    Sesuaikan rekaman tanggal persetujuan untuk aset <span className="font-bold text-primary">{assetToEditDate?.name}</span>.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-6 flex justify-center text-left">
                <div className="relative flex items-center w-full max-w-[300px]">
                    <Input 
                        type="date"
                        value={newApprovalDate ? format(newApprovalDate, "yyyy-MM-dd") : ""}
                        onChange={(e) => {
                            const val = e.target.value;
                            if (!val) setNewApprovalDate(undefined);
                            else {
                                const parsed = parse(val, "yyyy-MM-dd", new Date());
                                setNewApprovalDate(isValid(parsed) ? parsed : undefined);
                            }
                        }}
                        className="h-12 bg-slate-50 border-slate-200 rounded-xl font-bold px-4 pr-10 text-black"
                    />
                    <CalendarIcon className="absolute right-3 h-5 w-5 text-primary pointer-events-none" />
                </div>
            </div>
            <AlertDialogFooter className="gap-2">
                <AlertDialogCancel onClick={() => setAssetToEditDate(null)} className="rounded-xl h-11 font-bold text-black">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleEditDate} className="rounded-xl h-11 bg-primary hover:bg-primary/90 font-black uppercase tracking-widest text-white">
                     {isUpdating ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Pencil className="mr-2 h-4 w-4"/>}
                    Simpan Tanggal
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
