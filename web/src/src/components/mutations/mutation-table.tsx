
'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { onSnapshot, collection, query, where, doc, updateDoc, serverTimestamp, getDoc, QueryConstraint, addDoc, writeBatch, or, deleteDoc, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type User, type AssetStatus, type AssetCondition } from '@/lib/types';
import { useAuth } from '@/hooks/use-auth';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Check, Loader2, X, Printer, Search, Send, FileCheck, Calendar as CalendarIcon, CheckCircle2, RotateCcw, Image as ImageIcon, Camera, UploadCloud, Pencil } from 'lucide-react';
import { format, parse } from 'date-fns';
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
import Link from 'next/link';
import { Popover, PopoverContent, PopoverTrigger } from '../ui/popover';
import { Calendar } from '../ui/calendar';
import { cn } from '@/lib/utils';
import ExportMutationsButton from './export-mutations-button';
import Image from 'next/image';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';


interface EnrichedAsset extends Asset {
  requesterName?: string;
  requesterDepartment?: string;
  approverName?: string;
  accountingUpdaterName?: string;
}

const CLOUDINARY_CLOUD_NAME = 'dbguqcgeq';
const CLOUDINARY_UPLOAD_PRESET = 'UNSIGNED';


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

// Map Department to Section Head
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

const getPreviousLocation = (notes: string | undefined): string | null => {
  if (!notes) return null;
  // Look for the most reliable pattern first (from approval note)
  const approvalMatch = notes.match(/Mutasi \d+ unit dari: (.*?) ke/);
  if (approvalMatch && approvalMatch[1]) {
    return approvalMatch[1].trim();
  }
  // Fallback to the request note
  const requestMatch = notes.match(/Lokasi Sebelumnya: (.*?)\n/);
  if (requestMatch && requestMatch[1]) {
    return requestMatch[1].trim();
  }
  return null;
};

const getAllDisposalPhotoUrls = (asset: Asset): string[] => {
    return [
        asset.disposalPhotoURL1,
        asset.disposalPhotoURL2,
        asset.disposalPhotoURL3,
        asset.disposalPhotoURL4,
    ].filter((url): url is string => !!url);
};


const getMutationQuantityDisplay = (asset: EnrichedAsset): string => {
    const notes = asset.notes || '';
    const mutationQtyMatch = notes.match(/Jumlah: (\d+)/);
    if (mutationQtyMatch) {
        const mutatedQty = parseInt(mutationQtyMatch[1], 10);
        return `${mutatedQty}`;
    }

    const disposalQtyMatch = notes.match(/Diajukan untuk disposal sebanyak (\d+) unit/);
    if (disposalQtyMatch) {
         const disposedQty = parseInt(disposalQtyMatch[1], 10);
         return `${disposedQty}`;
    }

    const approvedDisposalMatch = notes.match(/Disposal (\d+) unit disetujui/);
    if(approvedDisposalMatch) {
        return approvedDisposalMatch[1];
    }
    
    const approvedMutationMatch = notes.match(/Mutasi (\d+) unit dari/);
    if(approvedMutationMatch) {
        return approvedMutationMatch[1];
    }

    return asset.qty.toString();
};

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
        if (asset.requestedBy) userIds.add(asset.requestedBy);
        if (asset.approvedBy) userIds.add(asset.approvedBy);
        if (asset.accountingUpdatedBy) userIds.add(asset.accountingUpdatedBy);
    });

    await Promise.all(Array.from(userIds).map(id => fetchUser(id)));
    
    return assetsToEnrich.map(asset => {
        const requester = asset.requestedBy ? userCache.get(asset.requestedBy) : undefined;
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

  // Group by prefix
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
  const [searchTerm, setSearchTerm] = useState('');
  const [beritaAcaraCodes, setBeritaAcaraCodes] = useState('');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [activeTab, setActiveTab] = useState('waiting');
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

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
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isCameraOpen, setIsCameraOpen] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [assetToEditDate, setAssetToEditDate] = useState<EnrichedAsset | null>(null);
  const [isEditDateDialogOpen, setIsEditDateDialogOpen] = useState(false);
  const [newApprovalDate, setNewApprovalDate] = useState<Date | undefined>();


  const isAdmin = user?.role === 'Admin';
  const isAccounting = user?.department === 'ACCOUNTING';
  const isKaryawan = user?.role === 'Karyawan';
  const isManager = user?.role === 'Manager' || user?.role === 'Section Head';
  const isHRGA = user?.department === 'HR & GA';


  useEffect(() => {
    if (authLoading || !user) return;

    let isMounted = true;
    setLoading(true);

    const relevantStatuses = [
        'waiting_mutasi', 'waiting_disposal', 'waiting_edit', 'waiting_creation',
        'karyawan_approved',
        'approved_mutasi', 'approved_disposal', 'approved_edit', 'Aktif_creation',
        'Aktif' // To catch rejected requests in 'submitted' tab
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
    
    // "Daftar Tunggu" tab logic
    let allWaiting = allAssets.filter(a => a.status === 'waiting_mutasi' || a.status === 'waiting_disposal' || a.status === 'karyawan_approved' || a.status === 'waiting_edit' || a.status === 'waiting_creation');
    if (isKaryawan || isManager) {
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
            const isOtherRequestInDept = (a.status === 'waiting_disposal' || a.status === 'waiting_edit' || a.status === 'waiting_creation') && userDepartments.includes(a.location);
            
            return isMutationForDept || isOtherRequestInDept;
        });
    } else if (isAccounting) {
        allWaiting = allAssets.filter(a => a.status === 'waiting_mutasi' || a.status === 'waiting_disposal');
    } else if (!isAdmin && !isHRGA) { // HR & GA will now see all, same as admin
        allWaiting = [];
    }

    // "Diajukan" tab logic
    let allSubmitted = allAssets.filter(a => a.requestedBy === user?.uid);
    if (isAdmin) {
        allSubmitted = allAssets.filter(a => a.requestedBy); // Admin sees all submitted
    }
    
    let allMutations = allAssets.filter(a => a.status === 'approved_mutasi');
    let allDisposals = allAssets.filter(a => a.status === 'approved_disposal');
    let allEdits = allAssets.filter(a => a.status === 'approved_edit');
    let allCreations = allAssets.filter(a => a.status === 'Aktif_creation');

    if (isAccounting) {
      allMutations = allMutations.filter(a => a.category.startsWith('A'));
      allDisposals = allDisposals.filter(a => a.category.startsWith('A'));
    } else if (!isAdmin && user?.department) {
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
      
      allMutations = allMutations.filter(isRelevantForUser);
      allDisposals = allDisposals.filter(isRelevantForUser);
      allEdits = allEdits.filter(isRelevantForUser);
      allCreations = allCreations.filter(a => userDepartments.includes(a.location));
    }
    
    const sortByRequestedAt = (a: Asset, b: Asset) => (getPlannedDateFromNotes(b.notes)?.getTime() || b.requestedAt?.toMillis() || 0) - (getPlannedDateFromNotes(a.notes)?.getTime() || a.requestedAt?.toMillis() || 0);
    const sortByApprovedAt = (a: Asset, b: Asset) => (b.approvedAt?.toMillis() || 0) - (a.approvedAt?.toMillis() || 0);
    const sortByTransactionCode = (a: Asset, b: Asset) => (b.transactionCode || '').localeCompare(a.transactionCode || '');


    return { 
        waitingAssets: applySearchFilter(allWaiting).sort(sortByRequestedAt), 
        submittedHistory: applySearchFilter(allSubmitted).sort(sortByRequestedAt),
        creationHistory: applySearchFilter(allCreations).sort(sortByApprovedAt),
        mutationHistory: applySearchFilter(allMutations).sort(sortByApprovedAt),
        disposalHistory: applySearchFilter(allDisposals).sort(sortByTransactionCode),
        editHistory: applySearchFilter(allEdits).sort(sortByApprovedAt),
    };
  }, [allAssets, searchTerm, isAdmin, isKaryawan, isManager, isAccounting, isHRGA, user]);

  const generateTransactionCode = async (type: 'MUT' | 'DIS' | 'EDT' | 'CRT', location?: string): Promise<string> => {
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');
    
    const locationPrefix = location ? `${location}-` : '';
    const prefix = `${locationPrefix}${type}-${year}${month}${day}-`;

    const assetsRef = collection(db, 'assets');
    const q = query(assetsRef, where('transactionCode', '>=', prefix), where('transactionCode', '<', prefix + 'z'));
    const querySnapshot = await getDocs(q);

    const sequence = querySnapshot.size + 1;
    return `${prefix}${sequence.toString().padStart(3, '0')}`;
};

  const handleAction = async (asset: EnrichedAsset, action: 'approve' | 'reject', approvalDate?: Date) => {
    if (!user) return;

    const isManagerOrHigher = user?.role === 'Manager' || user?.role === 'Section Head' || user?.role === 'Admin' || user?.role === 'Karyawan';
    
    if (!isManagerOrHigher) return;
    
    if ((user.role === 'Manager' || user.role === 'Section Head' || user?.role === 'Karyawan') && action === 'approve' && asset.status !== 'waiting_creation') {
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

    if (action === 'approve') {
        const approvalTimestamp = approvalDate ? Timestamp.fromDate(approvalDate) : serverTimestamp();
        const approverInfo = await fetchUser(user.uid);
        const approverName = approverInfo.name || approverInfo.email || 'Approver';
        const approverRole = user.role;

        const originalRequesterInfo = await fetchUser(asset.requestedBy || '');
        const originalRequesterName = (isAdmin && asset.requesterName === 'Budi Admin') ? (sectionHeadMapping[asset.requesterDepartment || ''] || asset.requesterName) : asset.requesterName;

        if (asset.status === 'waiting_creation') {
            const transactionCode = await generateTransactionCode('CRT', asset.location);
            batch.update(assetRef, {
                status: 'Aktif_creation',
                approvedBy: user.uid,
                approvedAt: approvalTimestamp,
                transactionCode: transactionCode,
            });
            toast({ title: 'Aset Disetujui', description: `Aset "${asset.name}" telah aktif.` });
            
            batch.commit().catch(async (serverError) => {
                const permissionError = new FirestorePermissionError({
                    path: assetRef.path,
                    operation: 'update',
                    requestResourceData: { status: 'Aktif_creation' },
                });
                errorEmitter.emit('permission-error', permissionError);
            }).finally(() => {
                setIsUpdating(null);
                setAssetToApprove(null);
                setIsApprovalDialogOpen(false);
            });
            return;
        }

        if (asset.status === 'waiting_mutasi' || asset.status === 'karyawan_approved') {
            
            const notes = asset.notes || '';
            const locationMatch = notes.match(/Lokasi Baru: (.*)/);
            const userMatch = notes.match(/Pengguna Baru: (.*)/);
            const quantityMatch = notes.match(/Jumlah: (\d+)/);

            const newLocation = locationMatch ? locationMatch[1].trim() : asset.location;
            const newUser = userMatch ? userMatch[1].trim() : '';
            const mutationQuantity = quantityMatch ? parseInt(quantityMatch[1], 10) : asset.qty;
            const isPartialMutation = mutationQuantity < asset.qty;
            const transactionCode = await generateTransactionCode('MUT', newLocation);

            const approvalNote = `Mutasi ${mutationQuantity} unit dari: ${asset.location} ke ${newLocation} disetujui oleh ${approverRole} (${approverName}). Diajukan oleh: ${originalRequesterName}`;
            const cleanedNotes = notes.split('--- MUTASI DIAJUKAN ---')[0].trim();
            const newNotes = `${cleanedNotes}\n${approvalNote}`.trim();
            
            const newCostCenter = costCenterMapping[newLocation];

            if (isPartialMutation) {
                // 1. Update original asset
                batch.update(assetRef, {
                    qty: asset.qty - mutationQuantity,
                    notes: `${asset.notes}\n\n--- SEBAGIAN DIMUTASI ---\n${mutationQuantity} unit dimutasi ke ${newLocation}.`.trim(),
                    status: 'Aktif', // Return original asset to active
                    requestedBy: null,
                    requestedAt: null,
                    mutationTargetDepartment: null,
                });

                // 2. Create new asset for the mutated part
                const newAssetData: Omit<Asset, 'id'> = {
                    ...asset,
                    qty: mutationQuantity,
                    location: newLocation,
                    user: newUser === '(tidak ada)' ? '' : newUser,
                    costCenter: newCostCenter || asset.costCenter,
                    status: 'approved_mutasi',
                    notes: newNotes,
                    code: `${asset.code}-M${Date.now()}`,
                    approvedBy: user.uid,
                    approvedAt: approvalTimestamp,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    transactionCode: transactionCode,
                };
                delete (newAssetData as any).id;
                delete (newAssetData as any).karyawanApproverId;

                const newAssetRef = doc(collection(db, 'assets'));
                batch.set(newAssetRef, newAssetData);
            } else {
                // Full mutation
                const updateData: any = {
                    status: 'approved_mutasi',
                    location: newLocation,
                    user: newUser === '(tidak ada)' ? '' : newUser,
                    notes: newNotes,
                    approvedBy: user.uid,
                    approvedAt: approvalTimestamp,
                    transactionCode: transactionCode,
                };
                if (newCostCenter) {
                    updateData.costCenter = newCostCenter;
                }
                batch.update(assetRef, updateData);
            }
        } else if (asset.status === 'waiting_edit') {
             const transactionCode = await generateTransactionCode('EDT', asset.location);
             const notes = asset.notes || '';
             const conditionMatch = notes.match(/Kondisi Baru: (.*)/);
             const newCondition = conditionMatch ? conditionMatch[1].trim() as AssetCondition : asset.condition;
             const cleanedNotes = notes.split('--- PERUBAHAN KONDISI DIAJUKAN ---')[0].trim();
             const approvalNote = `Perubahan kondisi menjadi "${newCondition}" disetujui oleh ${approverRole} (${approverName}).`;
             
             batch.update(assetRef, {
                status: 'approved_edit',
                condition: newCondition,
                notes: `${cleanedNotes}\n${approvalNote}`.trim(),
                approvedBy: user.uid,
                approvedAt: approvalTimestamp,
                transactionCode: transactionCode,
             });
        } else { // waiting_disposal
            const transactionCode = await generateTransactionCode('DIS', asset.location);
            const notes = asset.notes || '';
            const disposalQtyMatch = notes.match(/Diajukan untuk disposal sebanyak (\d+) unit\./);
            const disposalQuantity = disposalQtyMatch ? parseInt(disposalQtyMatch[1], 10) : asset.qty;
            const isPartialDisposal = disposalQuantity < asset.qty;
            const approvalNote = `Disposal ${disposalQuantity} unit disetujui oleh ${approverRole} (${approverName}). Diajukan oleh: ${originalRequesterName}`;
            const cleanedNotes = notes.split('--- DISPOSAL DIAJUKAN ---')[0].trim();
            const newNotes = `${cleanedNotes}\n${approvalNote}`.trim();

            if (isPartialDisposal) {
                 // 1. Update original asset
                batch.update(assetRef, {
                    qty: asset.qty - disposalQuantity,
                    notes: `${asset.notes?.replace(disposalQtyMatch![0], '')}\n\n--- SEBAGIAN DI-DISPOSAL ---\n${disposalQuantity} unit telah di-disposal.`.trim(),
                    status: 'Aktif', // Return original asset to active
                    requestedBy: null,
                    requestedAt: null,
                });

                // 2. Create new asset for the disposed part
                const newAssetData: Omit<Asset, 'id'> = {
                    ...asset,
                    qty: disposalQuantity,
                    status: 'approved_disposal',
                    notes: newNotes,
                    code: `${asset.code}-D${Date.now()}`,
                    approvedBy: user.uid,
                    approvedAt: approvalTimestamp,
                    createdAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                    transactionCode: transactionCode,
                };
                delete (newAssetData as any).id;
                const newAssetRef = doc(collection(db, 'assets'));
                batch.set(newAssetRef, newAssetData);
            } else {
                // Full disposal
                batch.update(assetRef, {
                    status: 'approved_disposal',
                    notes: newNotes,
                    approvedBy: user.uid,
                    approvedAt: approvalTimestamp,
                    transactionCode: transactionCode,
                });
            }
        }
        
        batch.commit().then(() => {
            toast({
                title: 'Pengajuan Disetujui',
                description: `Aset "${asset.name}" telah disetujui.`,
                action: <ToastAction altText="Cetak" onClick={() => openPrintDialog(asset as EnrichedAsset)}>Cetak</ToastAction>,
            });
        }).catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: assetRef.path,
                operation: 'write',
                requestResourceData: { status: 'approved' },
            });
            errorEmitter.emit('permission-error', permissionError);
        }).finally(() => {
            setIsUpdating(null);
            setAssetToApprove(null);
            setIsApprovalDialogOpen(false);
        });

    } else { // Reject action
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
        
        const updateData: any = {
            status: 'Aktif',
            notes: (assetToCancel.notes || '') + cancelNote,
            approvedAt: null,
            approvedBy: null,
            accountingUpdatedAt: null,
            accountingUpdatedBy: null,
        };

        if (assetToCancel.status === 'approved_mutasi' && previousLocation) {
            updateData.location = previousLocation;
            updateData.costCenter = costCenterMapping[previousLocation] || assetToCancel.costCenter;
        }

        await updateDoc(assetRef, updateData);

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
    handleAction(assetToApprove, 'approve', approvalDate);
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

  const handlePhotoUpload = async (fileToUpload: File | null) => {
    if (!fileToUpload || !assetForPhotoUpload) return;
    
    setIsUploadingPhoto(true);
    const formData = new FormData();
    formData.append('file', fileToUpload);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    try {
      const response = await fetch(`https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/image/upload`, {
        method: 'POST',
        body: formData,
      });
      const data = await response.json();

      if (response.ok) {
        const photoURL = data.secure_url;
        const assetRef = doc(db, 'assets', assetForPhotoUpload.id);
        
        const updateData: { [key: string]: any } = {};
        const photoFields: ('disposalPhotoURL1' | 'disposalPhotoURL2' | 'disposalPhotoURL3' | 'disposalPhotoURL4')[] = ['disposalPhotoURL1', 'disposalPhotoURL2', 'disposalPhotoURL3', 'disposalPhotoURL4'];
        
        // Use a fresh snapshot of the asset to check for empty fields
        const currentAssetSnap = await getDoc(assetRef);
        const currentAssetData = currentAssetSnap.data() as Asset;

        let fieldToUpdate: string | null = null;
        for (const field of photoFields) {
          if (!currentAssetData[field]) {
            fieldToUpdate = field;
            break;
          }
        }
        if (fieldToUpdate) {
            updateData[fieldToUpdate] = photoURL;
        } else {
            // Overwrite the first one if all are full
            updateData.disposalPhotoURL1 = photoURL;
        }

        await updateDoc(assetRef, updateData);
        
        toast({ title: 'Upload Berhasil', description: 'Foto bukti telah ditambahkan.' });
        // Don't close dialog, just reset file state
        setSelectedFile(null);
        setPreviewUrl(null);
      } else {
        throw new Error(data.error.message || 'Gagal mengunggah gambar.');
      }
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
    } finally {
      setIsUploadingPhoto(false);
    }
  };


  const formatDate = (timestamp: any, formatStr: string = "d MMM yyyy, HH:mm") => {
    if (!timestamp) return '-';
    let date;
    if (timestamp instanceof Timestamp) {
      date = timestamp.toDate();
    } else if (timestamp instanceof Date) {
      date = timestamp;
    } else {
      return '-';
    }
    return format(date, formatStr, { locale: id });
  };
  
   const getStatusClass = (status: AssetStatus) => {
    switch (status) {
        case 'waiting_mutasi':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        case 'waiting_disposal':
            return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
        case 'waiting_edit':
            return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
        case 'waiting_creation':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'karyawan_approved':
            return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
        case 'approved_mutasi':
        case 'approved_edit':
        case 'Aktif_creation':
            return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
        case 'approved_disposal':
             return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        case 'Aktif': // This represents a rejected request in the context of the "Diajukan" tab
            return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }

  const openPrintDialog = (asset: EnrichedAsset) => {
    setSelectedAsset(asset);
    setIsPrintDialogOpen(true);
  };
  
  const handlePrintForm = () => {
    if (!selectedAsset) return;
    
    if(selectedAsset.status.includes('disposal')) {
        handlePrintDisposal();
    } else if (selectedAsset.status.includes('mutasi') || selectedAsset.status.includes('approved') || selectedAsset.status.includes('edit')) {
        handlePrintMutation();
    }
    
    setIsPrintDialogOpen(false);
    setSelectedAsset(null);
  };
  
  const handlePrintDisposal = () => {
    if (!selectedAsset) return;

    const asset = selectedAsset;
    
    const printDate = asset.requestedAt?.toDate() || new Date();
    const day = printDate.getDate().toString();
    const month = (printDate.getMonth() + 1).toString();
    const year = printDate.getFullYear().toString();
    
    const purchasePriceDisplay = (printOption === 'empty') ? '' : new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(asset.price);
    const purchaseDateDisplay = (printOption === 'empty' || !asset.purchaseDate) ? '' : format(asset.purchaseDate.toDate(), 'd MMM yyyy', {locale: id});
    
    const assetName = asset.name;
    const assetCode = asset.code;
    const assetLocation = asset.location;
    const assetCondition = asset.condition; // 'Alasan' is filled by condition
    const assetLifetime = asset.assetLifetime ? `${asset.assetLifetime} tahun` : '';


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
            <td colspan="4" rowspan="10" style="text-align: left; padding: 5px;">處理方式 Metode disposal: Disposal</td>
          </tr>
          <tr>
            <td colspan="4" rowspan="8" style="text-align: left; padding: 5px;">原因 Alasan: ${assetCondition}</td>
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

  const handlePrintMutation = () => {
    if (!selectedAsset) return;
    const asset = selectedAsset;
    const fillData = printOption === 'fill';

    // Default to today's date, but try to get planned date from notes
    let mutationPrintDate = getPlannedDateFromNotes(asset.notes) || new Date();

    const day = fillData ? mutationPrintDate.getDate().toString() : '____';
    const month = fillData ? (mutationPrintDate.getMonth() + 1).toString() : '____';
    const year = fillData ? mutationPrintDate.getFullYear().toString() : '____';
    
    const assetName = fillData ? asset.name : '';
    const assetCode = fillData ? asset.code : '';
    
    let previousLocation = '';
    let newLocation = '';
    let reason = '';
    
    if (asset.status === 'waiting_mutasi') {
        const match = asset.notes?.match(/Lokasi Baru: (.*?)\n.*Alasan: (.*)/s);
        previousLocation = asset.location;
        newLocation = match ? match[1].trim() : asset.mutationTargetDepartment || '';
        reason = match ? match[2].trim() : '';
    } else if (asset.status === 'waiting_edit' || asset.status === 'approved_edit') {
        const match = asset.notes?.match(/Kondisi Baru: (.*?)\n.*Alasan: (.*)/s);
        previousLocation = asset.location;
        newLocation = asset.location; // Location doesn't change
        reason = `Perubahan kondisi menjadi ${match ? match[1].trim() : 'N/A'}. Alasan: ${match ? match[2].trim() : ''}`;
    } else { // approved_mutasi or other states
        previousLocation = getPreviousLocation(asset.notes) || '';
        newLocation = asset.location;
        reason = asset.notes || '';
    }
    
    const assetQty = fillData && asset.qty ? `${asset.qty} Unit` : '';

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
                        <div style="display:inline-flex; align-items:center;"><div class="checkbox"></div> 기타 Lain __________</div>
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
                    <td class="th-center">主管 Atasan</td><td class="th-center">保管人 Yg merawat</td>
                    <td class="th-center">主管 Atasan</td><td class="th-center">保管人 Yg merawat</td>
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

  // Sort assets by code before printing
  assetsToPrint.sort((a, b) => (a.code || '').localeCompare(b.code || ''));

  const today = new Date();
  const dateStr = format(today, 'd-MMMM-yyyy', { locale: id });
  const fromDepartment = user?.department || 'Departemen';
  const userName = user?.displayName || 'User';

  const transactionCodeText = summarizeTransactionCodes(
    assetsToPrint.map(a => a.transactionCode).filter((c): c is string => !!c)
  );

  const tableRows = assetsToPrint.map(asset => `
    <tr>
      <td>${asset.code}</td>
      <td>${asset.name}</td>
      <td></td>
      <td>${asset.qty}</td>
      <td>${asset.condition}</td>
    </tr>
  `).join('');

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
            .signature-box { height: 80px; }
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

          <p style="margin-top: 20px;">Berdasarkan data di atas mohon Dept. Accounting, supaya melakukan adjustment out.<br>
          Demikian permohonan adjustment ini kami sampaikan, atas perhatian dan kerjasamanya kami ucapkan terimakasih.<br>
          <i>Based on the above data please Dept. Accounting, in order to make adjustments out.<br>
          Thus we convey this adjustment request, we thank you for your attention and cooperation.</i></p>

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
    switch (activeTab) {
      case 'waiting':
        return waitingAssets;
      case 'submitted':
        return submittedHistory;
      case 'creation':
        return creationHistory;
      case 'mutation':
        return mutationHistory;
      case 'disposal':
        return disposalHistory;
      case 'edit':
        return editHistory;
      default:
        return [];
    }
  }, [activeTab, waitingAssets, submittedHistory, creationHistory, mutationHistory, disposalHistory, editHistory]);

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


  const isAllSelected = currentTabAssets.length > 0 && selectedAssetIds.length === currentTabAssets.length;
  const isIndeterminate = selectedAssetIds.length > 0 && selectedAssetIds.length < currentTabAssets.length;

  const onTabChange = (value: string) => {
    setActiveTab(value);
    setSelectedAssetIds([]); // Reset selection when changing tabs
  };

  const assetLink = (asset: EnrichedAsset) => {
    const params = new URLSearchParams();
    params.set('from', '/mutations');
    return `/assets/${asset.id}?${params.toString()}`;
  };

  const openPhotoUploadDialog = (asset: EnrichedAsset) => {
    setAssetForPhotoUpload(asset);
    setIsPhotoUploadOpen(true);
    setPreviewUrl(null);
    setSelectedFile(null);
  };
  
  useEffect(() => {
    let stream: MediaStream;
    const startCamera = async () => {
        if (isCameraOpen && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            try {
                stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                }
            } catch (err) {
                toast({ variant: 'destructive', title: 'Kamera Gagal', description: 'Tidak bisa mengakses kamera.' });
                setIsCameraOpen(false);
            }
        }
    };
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isCameraOpen, toast]);

  const handleCaptureAndUpload = () => {
    if (videoRef.current && canvasRef.current) {
        const video = videoRef.current;
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const context = canvas.getContext('2d');
        context?.drawImage(video, 0, 0, video.videoWidth, video.videoHeight);
        canvas.toBlob((blob) => {
            if (blob) {
                const capturedFile = new File([blob], `capture-${Date.now()}.jpg`, { type: 'image/jpeg' });
                setSelectedFile(capturedFile);
                setPreviewUrl(URL.createObjectURL(capturedFile));
                handlePhotoUpload(capturedFile);
            }
        }, 'image/jpeg');
    }
  };

  const handleEditDate = async () => {
    if (!assetToEditDate || !newApprovalDate || !isAdmin) return;
    setIsUpdating(assetToEditDate.id);
    const assetRef = doc(db, 'assets', assetToEditDate.id);
    try {
        await updateDoc(assetRef, {
            approvedAt: Timestamp.fromDate(newApprovalDate),
        });
        toast({
            title: 'Berhasil',
            description: 'Tanggal persetujuan mutasi telah diperbarui.',
        });
    } catch (error) {
        console.error("Error updating approval date:", error);
        toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memperbarui tanggal.' });
    } finally {
        setIsUpdating(null);
        setIsEditDateDialogOpen(false);
        setAssetToEditDate(null);
    }
  };

  const openEditDateDialog = (asset: EnrichedAsset) => {
    setAssetToEditDate(asset);
    setNewApprovalDate(asset.approvedAt?.toDate() || new Date());
    setIsEditDateDialogOpen(true);
  };

  return (
    <>
    <Card className="h-full flex flex-col">
      <CardHeader>
        <CardTitle>Mutasi &amp; Disposal</CardTitle>
        <CardDescription>
          Kelola alur persetujuan untuk pemindahan, penghapusan, atau perubahan aset.
        </CardDescription>
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 pt-4">
          <div className="relative flex-grow sm:flex-grow-0 sm:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Cari aset..."
              className="pl-8 w-full"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex items-center gap-2">
            <ExportMutationsButton assets={currentTabAssets} activeTab={activeTab} />
            {selectedAssetIds.length > 0 && (activeTab === 'mutation' || activeTab === 'disposal') && (
              <Button onClick={() => handlePrintBeritaAcara([])}>
                <Printer className="mr-2 h-4 w-4" />
                Cetak Berita Acara ({selectedAssetIds.length})
              </Button>
            )}
          </div>
        </div>
        <Tabs value={activeTab} onValueChange={onTabChange} className="w-full pt-4">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-6 mt-4">
            <TabsTrigger value="waiting">Daftar Tunggu ({waitingAssets.length})</TabsTrigger>
            <TabsTrigger value="submitted">Diajukan ({submittedHistory.length})</TabsTrigger>
            <TabsTrigger value="creation">Riwayat Penambahan ({creationHistory.length})</TabsTrigger>
            <TabsTrigger value="mutation">Riwayat Mutasi ({mutationHistory.length})</TabsTrigger>
            <TabsTrigger value="disposal">Riwayat Disposal ({disposalHistory.length})</TabsTrigger>
            <TabsTrigger value="edit">Riwayat Edit ({editHistory.length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </CardHeader>
      <CardContent className="flex-grow flex flex-col h-0">
        <div className="relative w-full overflow-auto flex-grow">
          <Tabs value={activeTab} onValueChange={onTabChange}>
            <TabsContent value="waiting" className="mt-0">
                <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Lokasi Sebelumnya</TableHead>
                            <TableHead>Lokasi/Target</TableHead>
                            <TableHead>Status</TableHead>
                            <TableHead>Diajukan Oleh</TableHead>
                            <TableHead>Tanggal Pengajuan</TableHead>
                            {(isAdmin || isManager || isKaryawan) && <TableHead className="text-right">Aksi</TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {loading || authLoading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={9}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : waitingAssets.length > 0 ? (
                            waitingAssets.map((asset) => {
                                const requesterDisplay = isAdmin && asset.requesterName === 'Budi Admin' 
                                    ? sectionHeadMapping[asset.requesterDepartment || ''] || asset.requesterName 
                                    : asset.requesterName;
                                const targetLocation = asset.status === 'waiting_mutasi' ? asset.mutationTargetDepartment : asset.location;
                                const disposalPhotos = getAllDisposalPhotoUrls(asset);
                                const hasDisposalPhoto = disposalPhotos.length > 0;
                                return (
                                <TableRow key={asset.id}>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{getMutationQuantityDisplay(asset)}</TableCell>
                                    <TableCell>{asset.location}</TableCell>
                                    <TableCell>{targetLocation}</TableCell>
                                    <TableCell><div className={`text-xs font-semibold py-1 px-2 rounded-full text-center inline-block capitalize ${getStatusClass(asset.status)}`}>{asset.status.replace(/_/g, ' ')}</div></TableCell>
                                    <TableCell>{requesterDisplay}</TableCell>
                                    <TableCell>{formatDate(getPlannedDateFromNotes(asset.notes) || asset.requestedAt, 'd MMM yyyy')}</TableCell>
                                    {(isAdmin || isManager || isKaryawan) && (
                                        <TableCell className="text-right">
                                            {isUpdating === asset.id ? <Loader2 className="h-5 w-5 animate-spin ml-auto" /> : (
                                                <div className="flex gap-2 justify-end">
                                                    {asset.status === 'waiting_disposal' && (
                                                        <Button size="sm" variant="secondary" onClick={() => openPhotoUploadDialog(asset)}>
                                                            <ImageIcon className="mr-2 h-4 w-4"/> {hasDisposalPhoto ? 'Ganti Foto' : 'Foto'}
                                                        </Button>
                                                    )}
                                                    <Button size="sm" variant="outline" onClick={() => handleAction(asset, 'reject')} className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground"><X className="mr-2 h-4 w-4" /> Batalkan</Button>
                                                    <Button size="sm" onClick={() => openApprovalDialog(asset)} className="bg-green-600 text-white hover:bg-green-700"><Check className="mr-2 h-4 w-4" /> Proses</Button>
                                                </div>
                                            )}
                                        </TableCell>
                                    )}
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={9} className="h-24 text-center">Tidak ada aset dalam daftar tunggu.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
            {/* Other Tabs Content */}
             <TabsContent value="submitted" className="mt-0">
                 <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Status Pengajuan</TableHead>
                            <TableHead>Tanggal Diajukan</TableHead>
                            <TableHead>Tanggal Disetujui/Ditolak</TableHead>
                            <TableHead>Disetujui/Ditolak Oleh</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                       {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : submittedHistory.length > 0 ? (
                            submittedHistory.map((asset) => {
                                const isWaiting = asset.status.startsWith('waiting_') || asset.status === 'karyawan_approved';
                                return (
                                <TableRow key={asset.id}>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{getMutationQuantityDisplay(asset)}</TableCell>
                                    <TableCell><div className={`text-xs font-semibold py-1 px-2 rounded-full text-center inline-block capitalize ${getStatusClass(asset.status)}`}>{asset.status.replace(/_/g, ' ')}</div></TableCell>
                                    <TableCell>{formatDate(asset.requestedAt)}</TableCell>
                                    <TableCell>{!isWaiting ? formatDate(asset.approvedAt) : '-'}</TableCell>
                                    <TableCell>{!isWaiting ? asset.approverName || '-' : '-'}</TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">Anda belum pernah mengajukan mutasi/disposal.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="creation" className="mt-0">
                 <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode Transaksi</TableHead>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead>Dibuat Oleh</TableHead>
                            <TableHead>Disetujui Oleh</TableHead>
                            <TableHead>Tanggal Disetujui</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={7}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : creationHistory.length > 0 ? (
                            creationHistory.map((asset) => {
                                const requesterDisplay = isAdmin && asset.requesterName === 'Budi Admin' 
                                    ? sectionHeadMapping[asset.requesterDepartment || ''] || asset.requesterName 
                                    : asset.requesterName;
                                return (
                                <TableRow key={asset.id}>
                                    <TableCell>{asset.transactionCode}</TableCell>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{asset.location}</TableCell>
                                    <TableCell>{requesterDisplay}</TableCell>
                                    <TableCell>{asset.approverName}</TableCell>
                                    <TableCell>{formatDate(asset.approvedAt)}</TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={7} className="h-24 text-center">Tidak ada riwayat penambahan aset.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="mutation" className="mt-0">
                 <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                           <TableHead><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                            <TableHead>Kode Transaksi</TableHead>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Lokasi Sebelumnya</TableHead>
                            <TableHead>Lokasi Baru</TableHead>
                            <TableHead>Tanggal Mutasi</TableHead>
                            <TableHead>Diajukan Oleh</TableHead>
                            <TableHead>Disetujui Oleh</TableHead>
                            <TableHead>Akuntansi Update</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : mutationHistory.length > 0 ? (
                            mutationHistory.map((asset) => {
                                const previousLocation = getPreviousLocation(asset.notes);
                                const requesterDisplay = isAdmin && asset.requesterName === 'Budi Admin' 
                                    ? sectionHeadMapping[previousLocation || ''] || asset.requesterName 
                                    : asset.requesterName;
                                return (
                                <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"}>
                                    <TableCell><Checkbox checked={selectedAssetIds.includes(asset.id)} onCheckedChange={(c) => handleSelectOne(asset.id, !!c)} /></TableCell>
                                    <TableCell>{asset.transactionCode}</TableCell>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{getMutationQuantityDisplay(asset)}</TableCell>
                                    <TableCell>{previousLocation}</TableCell>
                                    <TableCell>{asset.location}</TableCell>
                                    <TableCell>{formatDate(asset.approvedAt)}</TableCell>
                                    <TableCell>{requesterDisplay}</TableCell>
                                    <TableCell>{asset.approverName}</TableCell>
                                    <TableCell>
                                        {asset.accountingUpdatedAt ? (
                                            <div className='flex items-center gap-2 text-xs'>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Updated
                                                    </span>
                                                    <span>by {asset.accountingUpdaterName}</span>
                                                    <span>{formatDate(asset.accountingUpdatedAt, 'd MMM, HH:mm')}</span>
                                                </div>
                                            </div>
                                        ) : isAccounting ? (
                                             <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => openAccountingUpdateDialog(asset)} disabled={isUpdating === asset.id}>
                                                {isUpdating === asset.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileCheck className="h-4 w-4"/>}
                                            </Button>
                                        ) : (
                                            'Pending'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className='flex gap-2 justify-end'>
                                        {isAdmin && (
                                            <Button size="sm" variant="secondary" onClick={() => openEditDateDialog(asset)}><Pencil className="mr-2 h-4 w-4"/> Edit Tgl</Button>
                                        )}
                                        {isAdmin && (
                                            <Button size="sm" variant="destructive" onClick={() => { setAssetToCancel(asset); setIsCancelDialogOpen(true); }}>
                                                <RotateCcw className="mr-2 h-4 w-4" /> Batalkan
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => openPrintDialog(asset)}>
                                            <Printer className="mr-2 h-4 w-4" /> Cetak Form
                                        </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={12} className="h-24 text-center">Tidak ada riwayat mutasi.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
             <TabsContent value="disposal" className="mt-0">
                <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                           <TableHead><Checkbox checked={isAllSelected} onCheckedChange={handleSelectAll} /></TableHead>
                            <TableHead>Kode Transaksi</TableHead>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Qty</TableHead>
                            <TableHead>Lokasi</TableHead>
                            <TableHead>Kondisi saat Disposal</TableHead>
                             <TableHead>Foto Bukti</TableHead>
                            <TableHead>Tanggal Disposal</TableHead>
                            <TableHead>Dibuat Oleh</TableHead>
                            <TableHead>Akuntansi Update</TableHead>
                            <TableHead className="text-right">Aksi</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={12}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : disposalHistory.length > 0 ? (
                            disposalHistory.map((asset) => {
                                const requesterDisplay = isAdmin && asset.requesterName === 'Budi Admin' 
                                    ? sectionHeadMapping[asset.location] || asset.requesterName 
                                    : asset.requesterName;
                                const disposalPhotos = getAllDisposalPhotoUrls(asset);
                                return (
                                <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"}>
                                    <TableCell><Checkbox checked={selectedAssetIds.includes(asset.id)} onCheckedChange={(c) => handleSelectOne(asset.id, !!c)} /></TableCell>
                                    <TableCell>{asset.transactionCode}</TableCell>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell>{getMutationQuantityDisplay(asset)}</TableCell>
                                    <TableCell>{asset.location}</TableCell>
                                    <TableCell>{asset.condition}</TableCell>
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {disposalPhotos.length > 0 ? (
                                                disposalPhotos.map((photoUrl, index) => (
                                                    <Dialog key={index}>
                                                        <DialogTrigger asChild>
                                                            <Image
                                                                src={photoUrl}
                                                                alt={`Bukti disposal ${index + 1}`}
                                                                width={40}
                                                                height={40}
                                                                className="rounded-md object-cover cursor-pointer hover:scale-105 transition-transform"
                                                            />
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl h-auto bg-slate-900/80 backdrop-blur-sm border-slate-700">
                                                          <DialogHeader>
                                                            <DialogTitle className="text-white">Foto Bukti Disposal</DialogTitle>
                                                          </DialogHeader>
                                                          <div className="flex justify-center p-4">
                                                              <Image
                                                                  src={photoUrl}
                                                                  alt={`Bukti disposal ${index + 1}`}
                                                                  width={600}
                                                                  height={450}
                                                                  className="rounded-lg object-contain max-h-[70vh]"
                                                              />
                                                          </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                ))
                                            ) : '-'}
                                        </div>
                                    </TableCell>
                                    <TableCell>{formatDate(asset.approvedAt)}</TableCell>
                                    <TableCell>{requesterDisplay}</TableCell>
                                    <TableCell>
                                        {asset.accountingUpdatedAt ? (
                                            <div className='flex items-center gap-2 text-xs'>
                                                <div className="flex flex-col">
                                                    <span className="font-semibold flex items-center gap-1">
                                                        <CheckCircle2 className="h-4 w-4 text-green-500" /> Updated
                                                    </span>
                                                    <span>by {asset.accountingUpdaterName}</span>
                                                    <span>{formatDate(asset.accountingUpdatedAt, 'd MMM, HH:mm')}</span>
                                                </div>
                                            </div>
                                        ) : isAccounting ? (
                                             <Button size="sm" className="bg-green-600 text-white hover:bg-green-700" onClick={() => openAccountingUpdateDialog(asset)} disabled={isUpdating === asset.id}>
                                                {isUpdating === asset.id ? <Loader2 className="h-4 w-4 animate-spin"/> : <FileCheck className="h-4 w-4"/>}
                                            </Button>
                                        ) : (
                                            'Pending'
                                        )}
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <div className='flex gap-2 justify-end'>
                                        {isAdmin && (
                                            <Button size="sm" variant="secondary" onClick={() => openPhotoUploadDialog(asset)}>
                                                <ImageIcon className="mr-2 h-4 w-4" /> Foto
                                            </Button>
                                        )}
                                        {isAdmin && (
                                            <Button size="sm" variant="destructive" onClick={() => { setAssetToCancel(asset); setIsCancelDialogOpen(true); }}>
                                                <RotateCcw className="mr-2 h-4 w-4" /> Batalkan
                                            </Button>
                                        )}
                                        <Button size="sm" variant="outline" onClick={() => openPrintDialog(asset)}>
                                            <Printer className="mr-2 h-4 w-4" /> Cetak Form
                                        </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            )})
                        ) : (
                            <TableRow><TableCell colSpan={12} className="h-24 text-center">Tidak ada riwayat disposal.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
            <TabsContent value="edit" className="mt-0">
                 <Table className="table-row-hover">
                    <TableHeader>
                        <TableRow>
                            <TableHead>Kode Transaksi</TableHead>
                            <TableHead>Kode Aset</TableHead>
                            <TableHead>Nama Barang</TableHead>
                            <TableHead>Detail Perubahan</TableHead>
                            <TableHead>Tanggal Disetujui</TableHead>
                            <TableHead>Diajukan Oleh</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading ? (
                          Array.from({ length: 3 }).map((_, i) => (
                            <TableRow key={i}><TableCell colSpan={6}><Skeleton className="h-10 w-full" /></TableCell></TableRow>
                          ))
                        ) : editHistory.length > 0 ? (
                            editHistory.map((asset) => {
                                const approvalNoteMatch = asset.notes?.match(/Perubahan kondisi menjadi "(.*?)" disetujui oleh/);
                                const detail = approvalNoteMatch ? `Kondisi diubah menjadi "${approvalNoteMatch[1]}"` : 'Lihat catatan aset untuk detail';
                                const requesterDisplay = isAdmin && asset.requesterName === 'Budi Admin' 
                                    ? sectionHeadMapping[asset.location] || asset.requesterName 
                                    : asset.requesterName;
                                return (
                                <TableRow key={asset.id}>
                                    <TableCell>{asset.transactionCode}</TableCell>
                                    <TableCell>{asset.code}</TableCell>
                                    <TableCell>
                                        <Link href={assetLink(asset)} className="hover:underline">
                                            {asset.name}
                                        </Link>
                                    </TableCell>
                                    <TableCell className="max-w-xs truncate">{detail}</TableCell>
                                    <TableCell>{formatDate(asset.approvedAt)}</TableCell>
                                    <TableCell>{requesterDisplay}</TableCell>
                                </TableRow>
                                )
                            })
                        ) : (
                            <TableRow><TableCell colSpan={6} className="h-24 text-center">Tidak ada riwayat perubahan.</TableCell></TableRow>
                        )}
                    </TableBody>
                </Table>
            </TabsContent>
          </Tabs>
        </div>
      </CardContent>
    </Card>

    <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent className="bg-slate-900 text-slate-50">
            <AlertDialogHeader>
                <AlertDialogTitle>Opsi Cetak Formulir Disposal</AlertDialogTitle>
                <AlertDialogDescription>
                    Pilih apakah akan mengisi data Harga Beli dan Tanggal Pembelian secara otomatis atau mengosongkannya.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup defaultValue="fill" value={printOption} onValueChange={(value: 'fill' | 'empty') => setPrintOption(value)}>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="fill" id="r-fill" />
                    <Label htmlFor="r-fill">Isi sesuai data</Label>
                </div>
                <div className="flex items-center space-x-2">
                    <RadioGroupItem value="empty" id="r-empty" />
                    <Label htmlFor="r-empty">Kosongkan</Label>
                </div>
            </RadioGroup>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handlePrintForm}>
                    <Printer className="mr-2 h-4 w-4" /> Lanjutkan Mencetak
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <AlertDialog open={isApprovalDialogOpen} onOpenChange={setIsApprovalDialogOpen}>
        <AlertDialogContent className="bg-slate-900 text-slate-50">
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Tanggal Persetujuan</AlertDialogTitle>
                <AlertDialogDescription>
                    Pilih tanggal yang akan digunakan sebagai tanggal efektif persetujuan untuk aset "{assetToApprove?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !approvalDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {approvalDate ? format(approvalDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={approvalDate}
                        onSelect={setApprovalDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={confirmApproval}>
                    <Check className="mr-2 h-4 w-4" /> Konfirmasi Persetujuan
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
     <AlertDialog open={isAccountingUpdateDialogOpen} onOpenChange={setIsAccountingUpdateDialogOpen}>
        <AlertDialogContent className="bg-slate-900 text-slate-50">
            <AlertDialogHeader>
                <AlertDialogTitle>Konfirmasi Tanggal Update Akuntansi</AlertDialogTitle>
                <AlertDialogDescription>
                    Pilih tanggal update untuk aset "{assetToUpdateAccounting?.name}".
                </AlertDialogDescription>
            </AlertDialogHeader>
             <Popover>
                <PopoverTrigger asChild>
                    <Button
                        variant={"outline"}
                        className={cn("w-full justify-start text-left font-normal", !accountingUpdateDate && "text-muted-foreground")}
                    >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {accountingUpdateDate ? format(accountingUpdateDate, "PPP", { locale: id }) : <span>Pilih tanggal</span>}
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                    <Calendar
                        mode="single"
                        selected={accountingUpdateDate}
                        onSelect={setAccountingUpdateDate}
                        initialFocus
                    />
                </PopoverContent>
            </Popover>
            <AlertDialogFooter>
                <AlertDialogCancel>Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleAccountingUpdate}>
                    <Check className="mr-2 h-4 w-4" /> Ya
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <AlertDialog open={isCancelDialogOpen} onOpenChange={setIsCancelDialogOpen}>
        <AlertDialogContent className="bg-destructive text-destructive-foreground">
            <AlertDialogHeader>
                <AlertDialogTitle>Batalkan Persetujuan?</AlertDialogTitle>
                <AlertDialogDescription className="text-destructive-foreground/90">
                    Anda akan membatalkan persetujuan untuk aset <span className='font-bold'>"{assetToCancel?.name}"</span>. Statusnya akan dikembalikan ke 'Aktif'. Tindakan ini tidak dapat diurungkan.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="space-y-2">
                <Label htmlFor="cancellation-reason" className="text-destructive-foreground/90">Alasan Pembatalan</Label>
                <Textarea
                    id="cancellation-reason"
                    value={cancellationReason}
                    onChange={(e) => setCancellationReason(e.target.value)}
                    placeholder="Tuliskan alasan pembatalan di sini..."
                    className="bg-white/10 text-destructive-foreground placeholder:text-destructive-foreground/70"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel onClick={() => { setAssetToCancel(null); setCancellationReason(''); }} className="bg-destructive-foreground text-destructive hover:bg-destructive-foreground/90">Batal</AlertDialogCancel>
                <AlertDialogAction onClick={handleCancelApproval} disabled={isUpdating === assetToCancel?.id || !cancellationReason} className="bg-white text-destructive hover:bg-gray-200">
                     {isUpdating === assetToCancel?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Ya, Batalkan
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    <Dialog open={isPhotoUploadOpen} onOpenChange={setIsPhotoUploadOpen}>
        <DialogContent className="bg-slate-900 text-slate-50">
            <DialogHeader>
                <DialogTitle>Tambah Foto Bukti Disposal</DialogTitle>
                <DialogDescription>Lampirkan foto untuk aset "{assetForPhotoUpload?.name}".</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
                <div className="flex items-center gap-2">
                    <Button type="button" onClick={() => fileInputRef.current?.click()}><ImageIcon className="mr-2 h-4 w-4" /> Pilih File</Button>
                    <Button type="button" onClick={() => setIsCameraOpen(true)}><Camera className="mr-2 h-4 w-4" /> Ambil Foto</Button>
                    <Input ref={fileInputRef} type="file" className="hidden" accept="image/*" onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                            setSelectedFile(file);
                            setPreviewUrl(URL.createObjectURL(file));
                        }
                    }} />
                </div>
                {previewUrl && (
                    <div className="flex items-center gap-2 p-2 border rounded-md bg-slate-800">
                        <Image src={previewUrl} alt="Preview" width={48} height={48} className="rounded-md object-cover" />
                        <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                    </div>
                )}
            </div>
            <DialogFooter>
                <Button variant="outline" onClick={() => { setIsPhotoUploadOpen(false); setAssetForPhotoUpload(null); }}>Batal</Button>
                <Button onClick={() => handlePhotoUpload(selectedFile)} disabled={!selectedFile || isUploadingPhoto}>
                    {isUploadingPhoto && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upload & Simpan
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <Dialog open={isCameraOpen} onOpenChange={setIsCameraOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Ambil Foto Bukti</DialogTitle>
            </DialogHeader>
            <div className="relative mb-2">
                <video ref={videoRef} autoPlay playsInline className="w-full h-auto rounded-md" />
                <canvas ref={canvasRef} className="hidden" />
            </div>
             {previewUrl && (
                <div className="flex items-center justify-center gap-2 p-2 border rounded-md bg-muted">
                    <Image src={previewUrl} alt="Preview" width={60} height={60} className="rounded-md object-cover" />
                    <span className="text-sm truncate max-w-40">{selectedFile?.name}</span>
                </div>
            )}
            <DialogFooter>
                 <Button variant="secondary" onClick={() => setIsCameraOpen(false)}>Tutup</Button>
                <Button onClick={handleCaptureAndUpload}>
                    <Camera className="mr-2 h-4 w-4" /> Ambil & Upload
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    <AlertDialog open={isEditDateDialogOpen} onOpenChange={setIsEditDateDialogOpen}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Edit Tanggal Persetujuan Mutasi</AlertDialogTitle>
          <AlertDialogDescription>
            Pilih tanggal persetujuan yang baru untuk aset "{assetToEditDate?.name}".
          </AlertDialogDescription>
        </AlertDialogHeader>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !newApprovalDate && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {newApprovalDate ? format(newApprovalDate, 'PPP', { locale: id }) : <span>Pilih tanggal</span>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0">
            <Calendar mode="single" selected={newApprovalDate} onSelect={setNewApprovalDate} initialFocus />
          </PopoverContent>
        </Popover>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => setIsEditDateDialogOpen(false)}>Batal</AlertDialogCancel>
          <AlertDialogAction onClick={handleEditDate} disabled={isUpdating === assetToEditDate?.id}>
            {isUpdating === assetToEditDate?.id && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Simpan Tanggal
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
