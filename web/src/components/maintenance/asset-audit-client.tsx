'use client';

/**
 * @fileOverview Komponen Client untuk Audit Aset (Stock Opname).
 * Desain: Premium Corporate, Bergaya Dokumen Resmi, dan Efisien.
 * Fitur: Statistik audit, filter dinamis, tanda tangan digital, optimasi cetak, dan QR Scanner.
 * Update: Menambahkan fitur tanda tangan global untuk 2nd Checker (Admin mode ALL).
 */

import { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { type Asset, type DeptGroup } from '@/lib/types';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Popover, PopoverTrigger, PopoverContent } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  ArrowLeft, 
  Printer, 
  Eraser, 
  Loader2, 
  Search, 
  Pencil, 
  ClipboardCheck, 
  ShieldCheck, 
  Filter, 
  Calendar as CalendarIcon,
  CheckCircle2,
  AlertCircle,
  Hash,
  LayoutGrid,
  FileText,
  UserCheck,
  QrCode,
  SmartphoneNfc,
  X,
  VideoOff,
  Activity,
  User,
  MapPin,
  Share2,
  Crown,
  Zap,
  Shield,
  Eye,
  Check,
  Users2,
  Trash2,
  RotateCcw,
  Lock
} from 'lucide-react';
import Link from 'next/link';
import { format, parse, isValid, isPast, getYear, getMonth } from 'date-fns';
import { id } from 'date-fns/locale';
import { collection, query, onSnapshot, doc, setDoc, writeBatch, where, getDocs, serverTimestamp, deleteField, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { Skeleton } from '../ui/skeleton';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { useAuth } from '@/hooks/use-auth';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription, 
  DialogFooter, 
  DialogTrigger, 
  DialogClose
} from '@/components/ui/dialog';
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
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../ui/select';
import { useToast } from '@/hooks/use-toast';
import { debounce } from 'lodash';
import { Badge } from '@/components/ui/badge';
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';
import { BrowserMultiFormatReader } from '@zxing/library';
import AssetDetailDialog from '@/components/assets/asset-detail-dialog';

const allDepartmentOptions = ['ALL', 'ACCOUNTING', 'APP', 'APP-R&D', 'FRIT', 'GA', 'HR & GA', 'IT', 'LAB', 'MAINTENANCE', 'MANAGEMENT', 'MARKETING', 'MIXER', 'PPIC', 'PURCHASING', 'QC', 'R&D', 'RECEPTIONIST', 'ROOM MR.TSAI', 'ROOM MRS.TING', 'SHOWROOM', 'TINTA'];

const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

interface AuditData {
    checked1?: boolean;
    checked2?: boolean;
    remark?: string;
    signature?: string;
    checked1_date?: Date | null;
    checked2_date?: Date | null;
}

const generateAuditPeriods = (startYear: number): string[] => {
    const periods: string[] = [];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    for (let year = startYear; year <= currentYear + 1; year++) {
        periods.push(`Juni ${year}`);
        periods.push(`Desember ${year}`);
    }
    
    const currentPeriod = `${currentMonth < 6 ? 'Juni' : 'Desember'} ${currentYear}`;
    if (!periods.includes(currentPeriod)) {
        periods.push(currentPeriod);
        periods.sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');
            if (yearA !== yearB) return parseInt(yearA) - parseInt(yearB);
            return monthA === 'Juni' ? -1 : 1;
        });
    }

    return periods;
};

const getDefaultAuditPeriod = () => {
    const now = new Date();
    const month = now.getMonth();
    const year = now.getFullYear();
    if (month >= 5 && month <= 10) {
        return `Juni ${year}`;
    } else {
        return `Desember ${month < 5 ? year - 1 : year}`;
    }
};

type AuditSaveRequest = {
    assetId: string;
    data: Partial<AuditData>;
};

type SignatureRole = 'checker1' | 'checker2' | 'atasan1' | 'admin' | 'atasan2' | 'userDibuat' | 'userDiketahui1' | 'userDiketahui2' | 'userDiterima' | 'userDisetujui';

interface SignatureState {
  checker1: string;
  checker2: string;
  atasan1: string;
  admin: string;
  atasan2: string;
  department: string;
  userDibuat: string;
  userDiketahui1: string;
  userDiketahui2: string;
  userDiterima: string;
  userDisetujui: string;
}

const initialSignatureState: SignatureState = {
  checker1: '', checker2: '', atasan1: '', admin: '', atasan2: '', department: '',
  userDibuat: '', userDiketahui1: '', userDiketahui2: '', userDiterima: '', userDisetujui: ''
};

const StatCard = ({ label, value, subValue, icon: Icon, color }: { label: string, value: number, subValue?: string, icon: any, color: string }) => (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl shadow-lg", color)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {subValue && <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full">{subValue}</span>}
            </div>
            <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <div className="flex items-baseline gap-2">
                    <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left text-left">{value}</h3>
                </div>
            </div>
        </CardContent>
    </Card>
);

export default function AssetAuditClient() {
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [loading, setLoading] = useState(true);
  const { user, loading: authLoading } = useAuth();
  
  // States for filters
  const [selectedDepartments, setSelectedDepartments] = useState<string[]>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>(allDepartmentOptions);
  const [deptGroups, setDeptGroups] = useState<DeptGroup[]>([]);
  const [secondCheckerDepts, setSecondCheckerDepts] = useState<string[]>([]);
  const [seriesFilter, setSeriesFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'COMPANY' | 'PERSONAL' | 'UTILITY'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [customUpdateDate, setCustomUpdateDate] = useState<Date | undefined>(undefined);
  
  const [auditData, setAuditData] = useState<Record<string, AuditData>>({});
  const [auditPeriod, setAuditPeriod] = useState<string>(getDefaultAuditPeriod());
  const auditPeriods = useMemo(() => generateAuditPeriods(2024), []);
  
  const [isSignDialogOpen, setIsSignDialogOpen] = useState(false);
  const [currentSignRole, setCurrentSignRole] = useState<SignatureRole | null>(null);
  const [currentSignGroup, setCurrentSignGroup] = useState<{ name: string, departments: string[] } | null>(null);
  const [signaturesMap, setSignaturesMap] = useState<Record<string, SignatureState>>({});
  const [isSigning, setIsSigning] = useState(false);
  const sigPadRef = useRef<SignatureCanvas | null>(null);

  const [roleToDelete, setRoleToDelete] = useState<SignatureRole | null>(null);
  const [groupToDelete, setGroupToDelete] = useState<{ name: string, departments: string[] } | null>(null);
  const [isConfirmDeleteSigOpen, setIsConfirmDeleteSigOpen] = useState(false);
  const [isDeletingSig, setIsDeletingSig] = useState(false);
  
  // QR Scanner States
  const [isScannerOpen, setIsScannerOpen] = useState(false);
  const [hasCameraPermission, setHasCameraPermission] = useState<boolean | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [isSharing, setIsSharing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const codeReader = useRef(new BrowserMultiFormatReader());

  // Asset Detail State
  const [viewAssetId, setViewAssetId] = useState<string | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  const { toast } = useToast();
  
  const isAdmin = user?.role === 'Admin';
  const isAuthorizedForSecondCheck = useMemo(() => {
    return isAdmin || (user?.department && secondCheckerDepts.includes(user.department));
  }, [isAdmin, user?.department, secondCheckerDepts]);

  const getSelectedGroups = useCallback(() => {
    const depts = selectedDepartments.includes('ALL') 
      ? departmentOptions.filter(d => d !== 'ALL')
      : selectedDepartments;
      
    if (depts.length === 0) return [];

    const grouped: { name: string; departments: string[] }[] = [];
    const processedDepts = new Set<string>();

    // 1. Group by deptGroups config
    deptGroups.forEach(group => {
      const matchingDepts = group.departments.filter(d => depts.includes(d));
      if (matchingDepts.length > 0) {
        grouped.push({
          name: group.name,
          departments: matchingDepts
        });
        matchingDepts.forEach(d => processedDepts.add(d));
      }
    });

    // 2. Add remaining departments as individual groups
    depts.forEach(d => {
      if (!processedDepts.has(d)) {
        grouped.push({
          name: d,
          departments: [d]
        });
      }
    });

    return grouped;
  }, [selectedDepartments, departmentOptions, deptGroups]);
  
  const saveQueue = useRef<Map<string, AuditSaveRequest>>(new Map());
  const isSavingRef = useRef(false);

  // Sync general settings separately
  useEffect(() => {
      const unsubSettings = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
          if (snap.exists()) {
              const data = snap.data();
              if (data.deptGroups) setDeptGroups(data.deptGroups);
              if (data.secondCheckerDepts) setSecondCheckerDepts(data.secondCheckerDepts);
          }
      });
      return () => unsubSettings();
  }, []);

  // Set department filter options based on user role and checker authorization
    useEffect(() => {
        if (authLoading || !user) return;

        if (isAuthorizedForSecondCheck) {
            setDepartmentOptions(allDepartmentOptions);
            if (selectedDepartments.length === 0) {
                setSelectedDepartments(['ALL']);
            }
        } 
        else if (user.department) {
            let availableDepts: string[] = [];
            if (user.department === 'APP') {
                availableDepts = ['APP', 'APP-R&D'];
            } else if (['R&D', 'APP-R&D'].includes(user.department)) {
                availableDepts = ['R&D', 'APP-R&D', 'QC', 'LAB'];
            } else if (user.department === 'PPIC') {
                availableDepts = ['PPIC', 'MAINTENANCE'];
            } else if (user.department === 'MIXER') {
                availableDepts = ['MIXER', 'TINTA'];
            } else {
                availableDepts = [user.department];
            }
            setDepartmentOptions(availableDepts);
            if (selectedDepartments.length === 0) {
                setSelectedDepartments([user.department]);
            }
        }
    }, [user, authLoading, isAuthorizedForSecondCheck]);

  const processSaveQueue = useCallback(async () => {
    if (isSavingRef.current || saveQueue.current.size === 0) return;

    isSavingRef.current = true;
    const batch = writeBatch(db);
    const periodId = auditPeriod.replace(' ', '-');
    const itemsToSave = Array.from(saveQueue.current.values());
    saveQueue.current.clear();

    itemsToSave.forEach(req => {
      const auditDocRef = doc(db, 'audits', periodId, 'assets', req.assetId);
      batch.set(auditDocRef, req.data, { merge: true });
    });

    try {
      await batch.commit();
      toast({
        title: 'Perubahan Disimpan',
        description: String(itemsToSave.length) + " perubahan audit telah disimpan.",
        duration: 2000,
      });
    } catch (error) {
      console.error("Failed to save audit data batch:", error);
      toast({
        variant: "destructive",
        title: "Gagal Menyimpan",
        description: "Beberapa perubahan mungkin gagal disimpan."
      });
    } finally {
      isSavingRef.current = false;
      if(saveQueue.current.size > 0) {
        setTimeout(processSaveQueue, 500);
      }
    }
  }, [auditPeriod, toast]);

  const debouncedProcessQueue = useRef(debounce(processSaveQueue, 1500)).current;

  const saveAuditData = useCallback((assetId: string, data: Partial<AuditData>) => {
    saveQueue.current.set(assetId, { assetId, data });
    debouncedProcessQueue();
  }, [debouncedProcessQueue]);

  useEffect(() => {
    if (authLoading || !user) return;

    setLoading(true);
    const q = query(collection(db, 'assets'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
        let assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
        setAllAssets(assetsData.filter(asset => asset.status !== 'approved_disposal'));
        setLoading(false);
    }, (error) => {
        console.error("Error fetching assets:", error);
        setLoading(false);
    });

    return () => unsubscribe();
  }, [user, authLoading]);
  
  const filteredAssets = useMemo(() => {
    let assetsToFilter = allAssets;

    if (seriesFilter !== 'ALL') {
        assetsToFilter = assetsToFilter.filter(asset => {
            const isUtility = utilityCategories.includes(asset.category);
            if (seriesFilter === 'A') return asset.category.startsWith('A') && !isUtility;
            if (seriesFilter === 'B') return !asset.category.startsWith('A') && !isUtility;
            return true;
        });
    }

    if (ownershipFilter !== 'ALL') {
        assetsToFilter = assetsToFilter.filter(asset => {
            if (ownershipFilter === 'COMPANY') return asset.status !== 'Bukan_Asset_Perusahaan';
            if (ownershipFilter === 'PERSONAL') return asset.status === 'Bukan_Asset_Perusahaan';
            if (ownershipFilter === 'UTILITY') return utilityCategories.includes(asset.category);
            return true;
        });
    }

    if (selectedDepartments.length > 0 && !selectedDepartments.includes('ALL')) {
        assetsToFilter = assetsToFilter.filter(asset => selectedDepartments.includes(asset.location));
    }
    
    if (searchTerm) {
        const lowerCaseSearch = searchTerm.toLowerCase();
        assetsToFilter = assetsToFilter.filter(asset => 
            asset.name.toLowerCase().includes(lowerCaseSearch) ||
            asset.code.toLowerCase().includes(lowerCaseSearch)
        );
    }
    
    return assetsToFilter.sort((a,b) => a.code.localeCompare(b.code));
  }, [allAssets, selectedDepartments, seriesFilter, ownershipFilter, searchTerm]);

  useEffect(() => {
    if (filteredAssets.length === 0 || !auditPeriod) return;
  
    const periodId = auditPeriod.replace(' ', '-');
    const assetIds = filteredAssets.map(asset => asset.id);
  
    const chunks: string[][] = [];
    for (let i = 0; i < assetIds.length; i += 30) {
      chunks.push(assetIds.slice(i, i + 30));
    }
  
    const unsubscribers = chunks.map(chunk => {
      if (chunk.length === 0) return () => {};
      const auditDataQuery = query(
        collection(db, 'audits', periodId, 'assets'),
        where('__name__', 'in', chunk)
      );
  
      return onSnapshot(auditDataQuery, (snapshot) => {
        const newAuditDataChunk: Record<string, AuditData> = {};
        snapshot.forEach(doc => {
          const data = doc.data();
          newAuditDataChunk[doc.id] = {
            checked1: data.checked1 || false,
            checked2: data.checked2 || false,
            remark: data.remark || '',
            signature: data.signature || '',
            checked1_date: data.checked1_date?.toDate() || null,
            checked2_date: data.checked2_date?.toDate() || null,
          };
        });
        setAuditData(prev => ({ ...prev, ...newAuditDataChunk }));
      }, (error) => {
        console.error("Firestore snapshot error:", error);
      });
    });
  
    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [filteredAssets, auditPeriod]);
  
  useEffect(() => {
    if (!auditPeriod || departmentOptions.length === 0) return;
    
    const periodId = auditPeriod.replace(' ', '-');
    const deptsToListen = departmentOptions.filter(d => d !== 'ALL');
    
    const unsubscribers = deptsToListen.map(deptId => {
      const signatureDocRef = doc(db, 'audits', periodId, 'signatures', deptId);
      return onSnapshot(signatureDocRef, (docSnap) => {
        if (docSnap.exists()) {
          setSignaturesMap(prev => ({
            ...prev,
            [deptId]: docSnap.data() as SignatureState
          }));
        } else {
          setSignaturesMap(prev => ({
            ...prev,
            [deptId]: initialSignatureState
          }));
        }
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub());
    };
  }, [departmentOptions, auditPeriod]);


  const handleDepartmentChange = (departments: string[]) => {
    if (departments.includes('ALL')) {
        setSelectedDepartments(['ALL']);
    } else {
        setSelectedDepartments(departments.filter(d => d !== 'ALL'));
    }
  };

  const handleApplyGroup = (groupDepts: string[]) => {
    setSelectedDepartments(groupDepts);
  };
  
  const handleCheck = (assetId: string, isChecked: boolean, checker: 1 | 2) => {
    const newDate = isChecked ? new Date() : null;
    const key = checker === 1 ? 'checked1' : 'checked2';
    const dateKey = checker === 1 ? 'checked1_date' : 'checked2_date';

    setAuditData(prev => ({
        ...prev,
        [assetId]: { ...prev[assetId], [key]: isChecked, [dateKey]: newDate }
    }));
    saveAuditData(assetId, { [key]: isChecked, [dateKey]: newDate });
  };
  
  const handleCheckAll = (isChecked: boolean, checker: 1 | 2) => {
    const newCheckedState: Record<string, AuditData> = { ...auditData };
    const dateToSet = isChecked ? new Date() : null;
    const key = checker === 1 ? 'checked1' : 'checked2';
    const dateKey = checker === 1 ? 'checked1_date' : 'checked2_date';

    filteredAssets.forEach(asset => {
        newCheckedState[asset.id] = { ...newCheckedState[asset.id], [key]: isChecked, [dateKey]: dateToSet };
        saveQueue.current.set(asset.id, { assetId: asset.id, data: { [key]: isChecked, [dateKey]: dateToSet }});
    });
    setAuditData(newCheckedState);
    processSaveQueue();
  };
  
  const handleRemarkChange = (assetId: string, value: string) => {
    setAuditData(prev => ({ ...prev, [assetId]: { ...prev[assetId], remark: value } }));
    saveAuditData(assetId, { remark: value });
  };
  
  const openSignDialog = (role: SignatureRole, group: { name: string, departments: string[] }) => {
    const isGlobalAdminSign = isAdmin && selectedDepartments.includes('ALL') && (role === 'userDibuat' || role === 'admin' || role === 'checker2');

    if (!isGlobalAdminSign && (!group || group.departments.length === 0)) {
      toast({
        variant: "destructive",
        title: "Pilih Satu Departemen",
        description: "Tanda tangan hanya dapat disimpan jika satu departemen spesifik dipilih.",
      });
      return;
    }
    
    const deptId = group.departments[0];
    const signature = signaturesMap[deptId]?.[role] || '';

    if (!isAdmin && signature) {
      toast({
        title: "Tanda Tangan Terkunci",
        description: "Anda sudah memberikan tanda tangan. Hanya Admin yang dapat mengubahnya.",
      });
      return;
    }

    setCurrentSignRole(role);
    setCurrentSignGroup(group);
    setIsSignDialogOpen(true);
  };

  const handleSaveSignature = async () => {
    if (!sigPadRef.current || !currentSignRole || !currentSignGroup || !auditPeriod) return;

    const dataUrl = sigPadRef.current.toDataURL('image/png');
    const periodId = auditPeriod.replace(' ', '-');
    setIsSigning(true);

    try {
      const batch = writeBatch(db);
      
      const isGlobalRole = currentSignRole === 'userDibuat' || currentSignRole === 'admin' || currentSignRole === 'checker2';

      if (isAdmin && selectedDepartments.includes('ALL') && isGlobalRole) {
        const deptsToSign = departmentOptions.filter(d => d !== 'ALL');
        
        deptsToSign.forEach(deptId => {
          const sigRef = doc(db, 'audits', periodId, 'signatures', deptId);
          batch.set(sigRef, { [currentSignRole]: dataUrl }, { merge: true });
        });
        
        await batch.commit();
        
        setSignaturesMap(prev => {
          const updated = { ...prev };
          deptsToSign.forEach(deptId => {
            updated[deptId] = {
              ...(updated[deptId] || initialSignatureState),
              [currentSignRole]: dataUrl
            };
          });
          return updated;
        });

        toast({ 
            title: "Tanda Tangan Global Berhasil", 
            description: `Tanda tangan telah disalin ke ${deptsToSign.length} departemen sekaligus.` 
        });
      } 
      else {
        currentSignGroup.departments.forEach(deptId => {
          const sigRef = doc(db, 'audits', periodId, 'signatures', deptId);
          batch.set(sigRef, { [currentSignRole]: dataUrl }, { merge: true });
        });
        
        await batch.commit();

        setSignaturesMap(prev => {
          const updated = { ...prev };
          currentSignGroup.departments.forEach(deptId => {
            updated[deptId] = {
              ...(updated[deptId] || initialSignatureState),
              [currentSignRole]: dataUrl
            };
          });
          return updated;
        });

        toast({ title: "Tanda Tangan Disimpan", description: `Tanda tangan disimpan untuk unit ${currentSignGroup.name}.` });
      }
      
      setIsSignDialogOpen(false);
      setCurrentSignRole(null);
      setCurrentSignGroup(null);
    } catch (error) {
      console.error("Error saving signature:", error);
      toast({ variant: "destructive", title: "Gagal Menyimpan", description: "Terjadi kesalahan saat menyimpan tanda tangan ke database." });
    } finally {
      setIsSigning(false);
    }
  };

  const handleOpenDeleteSig = (e: React.MouseEvent, role: SignatureRole, group: { name: string, departments: string[] }) => {
    e.stopPropagation();
    if (!isAdmin) return;
    setRoleToDelete(role);
    setGroupToDelete(group);
    setIsConfirmDeleteSigOpen(true);
  };

  const handleDeleteSignature = async () => {
    if (!roleToDelete || !groupToDelete || !isAdmin || !auditPeriod) return;
    setIsDeletingSig(true);
    const periodId = auditPeriod.replace(' ', '-');

    try {
        const batch = writeBatch(db);

        const isGlobalRole = roleToDelete === 'userDibuat' || roleToDelete === 'admin' || roleToDelete === 'checker2';

        if (selectedDepartments.includes('ALL') && isGlobalRole) {
            const depts = departmentOptions.filter(d => d !== 'ALL');
            depts.forEach(deptId => {
                const sigRef = doc(db, 'audits', periodId, 'signatures', deptId);
                batch.update(sigRef, { [roleToDelete]: deleteField() });
            });
            await batch.commit();

            setSignaturesMap(prev => {
              const updated = { ...prev };
              depts.forEach(deptId => {
                if (updated[deptId]) {
                  updated[deptId] = {
                    ...updated[deptId],
                    [roleToDelete]: ''
                  };
                }
              });
              return updated;
            });
        } 
        else {
            groupToDelete.departments.forEach(deptId => {
              const sigRef = doc(db, 'audits', periodId, 'signatures', deptId);
              batch.update(sigRef, { [roleToDelete]: deleteField() });
            });
            await batch.commit();

            setSignaturesMap(prev => {
              const updated = { ...prev };
              groupToDelete.departments.forEach(deptId => {
                if (updated[deptId]) {
                  updated[deptId] = {
                    ...updated[deptId],
                    [roleToDelete]: ''
                  };
                }
              });
              return updated;
            });
        }

        toast({ title: 'Tanda Tangan Dihapus' });
        setIsConfirmDeleteSigOpen(false);
        setRoleToDelete(null);
        setGroupToDelete(null);
    } catch (error) {
        console.error("Delete signature failed:", error);
        toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
        setIsDeletingSig(false);
    }
  };

  const SignatureBox = ({ 
    role, 
    label, 
    name, 
    group 
  }: { 
    role: SignatureRole, 
    label: string, 
    name?: string, 
    group: { name: string, departments: string[] } 
  }) => {
    const deptId = group.departments[0];
    const signature = signaturesMap[deptId]?.[role] || '';
    const isSigned = !!signature;

    return (
        <div onClick={() => openSignDialog(role, group)} className="cursor-pointer group relative text-left">
          <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors text-left">{label}</p>
          <div className="h-24 mt-2 border border-dashed border-slate-300 rounded-2xl flex items-center justify-center bg-white/50 group-hover:bg-primary/5 group-hover:border-primary/30 transition-all duration-300 relative text-black">
            {isSigned ? (
              <div className="relative w-full h-full">
                <Image src={signature} alt={label} fill className="object-contain p-2" />
                {isAdmin && (
                    <button 
                        onClick={(e) => handleOpenDeleteSig(e, role, group)}
                        className="absolute -top-2 -right-2 p-1.5 bg-rose-600 text-white rounded-full shadow-lg opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-700 active:scale-90"
                    >
                        <Trash2 className="h-3.5 w-3.5" />
                    </button>
                )}
              </div>
            ) : (
              <Pencil className="w-6 h-6 text-slate-300 group-hover:scale-110 transition-transform" />
            )}
          </div>
          <p className="mt-2 text-xs font-bold text-slate-900 dark:text-white truncate uppercase tracking-tighter text-left">({name || label})</p>
        </div>
    );
  };

  const isAllChecked1 = filteredAssets.length > 0 && filteredAssets.every(asset => auditData[asset.id]?.checked1);
  const isSomeChecked1 = filteredAssets.some(asset => auditData[asset.id]?.checked1) && !isAllChecked1;

  const isAllChecked2 = filteredAssets.length > 0 && filteredAssets.every(asset => auditData[asset.id]?.checked2);
  const isSomeChecked2 = filteredAssets.some(asset => auditData[asset.id]?.checked2) && !isAllChecked2;

  const statsSummary = useMemo(() => {
    const total = filteredAssets.length;
    const checked = filteredAssets.filter(a => auditData[a.id]?.checked1 || auditData[a.id]?.checked2).length;
    const verified = filteredAssets.filter(a => auditData[a.id]?.checked1 && auditData[a.id]?.checked2).length;
    return { total, checked, verified, remaining: total - checked };
  }, [filteredAssets, auditData]);

  const generateSignatureTableHtml = () => {
    const groups = getSelectedGroups();
    
    return groups.map(group => {
      const groupSigs = signaturesMap[group.departments[0]] || initialSignatureState;
      const displayDeptName = group.name;
      
      return `
        <div style="page-break-inside: avoid; margin-top: 30px;">
          <h3 style="font-size: 10pt; font-weight: bold; margin-bottom: 5px; text-transform: uppercase; text-align: left; border-left: 3px solid #000; padding-left: 8px;">
            Pengesahan Unit: ${displayDeptName} (${group.departments.join(', ')})
          </h3>
          <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px;">
            <tr>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">Atasan Dept</td>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">Yang Merawat</td>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">1st Checker</td>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">2nd Checker</td>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">Atasan (GA Dept)</td>
                <td style="border: 1px solid black; width: 16.6%; font-weight: bold; font-size: 8pt; text-align: center; background: #f8fafc; padding: 5px;">Dibuat</td>
            </tr>
            <tr>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.atasan2 ? `<img src="${groupSigs.atasan2}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.atasan1 ? `<img src="${groupSigs.atasan1}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.checker1 ? `<img src="${groupSigs.checker1}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.checker2 ? `<img src="${groupSigs.checker2}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.admin ? `<img src="${groupSigs.admin}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
                <td style="border: 1px solid black; height: 75px; vertical-align: middle; text-align: center;">
                    ${groupSigs.userDibuat ? `<img src="${groupSigs.userDibuat}" style="max-height: 70px; max-width: 90%;" />` : ''}
                </td>
            </tr>
            <tr>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(${displayDeptName})</td>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(Custodian)</td>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(Internal Control)</td>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(Finance Dept)</td>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(GA Dept)</td>
                <td style="border: 1px solid black; font-size: 7pt; text-align: center; padding: 3px;">(Reporter)</td>
            </tr>
          </table>
        </div>
      `;
    }).join('');
  };

  const handlePrint = () => {
    const assetsToPrint = filteredAssets.filter(asset => asset.category.startsWith('A') && !utilityCategories.includes(asset.category));
    if (assetsToPrint.length === 0) {
        toast({ variant: "destructive", title: "Tidak Ada Data Seri A" });
        return;
    }
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const tableRows = assetsToPrint.map((asset, index) => {
        const data = auditData[asset.id] || {};
        const date1 = data.checked1_date ? format(data.checked1_date, 'dd/MM/yy') : '';
        const date2 = data.checked2_date ? format(data.checked2_date, 'dd/MM/yy') : '';
        const tglUpdate = customUpdateDate 
            ? format(customUpdateDate, 'dd/MM/yy') 
            : [...new Set([date1, date2].filter(Boolean))].join(' / ');
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${asset.costCenter || ''}</td>
            <td>${asset.code}</td>
            <td>${asset.name}</td>
            <td>${asset.user || ''}</td>
            <td>Unit</td>
            <td>${asset.qty}</td>
            <td>${data.checked1 ? '✓' : ''}</td>
            <td>${data.checked2 ? '✓' : ''}</td>
            <td>${tglUpdate}</td>
            <td>${data.remark || ''}</td>
        </tr>
    `}).join('');

    const html = `
        <html>
            <head>
                <title>Audit Seri A - ${auditPeriod}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 9pt; }
                    h1 { text-align: center; text-transform: uppercase; font-size: 14pt; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid black; padding: 4px; text-align: center; }
                    th { background: #f0f0f0; font-weight: bold; font-size: 8pt; }
                    .th-sub { display: block; font-weight: normal; font-size: 7pt; margin-top: 2px; }
                    @media print { @page { size: landscape; margin: 1cm; } }
                </style>
            </head>
            <body>
                <h1>Berita Acara Stock Opname Aset Seri A</h1>
                <p>Periode: <b>${auditPeriod}</b> | Dept: <b>${selectedDepartments.join(', ')}</b></p>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Cost Center<br><span class="th-sub">成本中心</span></th>
                            <th>Kode Aset<br><span class="th-sub">財產編號</span></th>
                            <th>Nama Aset<br><span class="th-sub">財產名稱</span></th>
                            <th>PIC/User<br><span class="th-sub">保管人員</span></th>
                            <th>Unit<br><span class="th-sub">單位</span></th>
                            <th>Qty</th><th>1st</th><th>2nd</th><th>Update</th><th>Remark</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                ${generateSignatureTableHtml()}
            </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
  };

  const handlePrintB = () => {
    const assetsToPrint = filteredAssets.filter(asset => !asset.category.startsWith('A') || utilityCategories.includes(asset.category));
    if (assetsToPrint.length === 0) {
        toast({ variant: "destructive", title: "Tidak Ada Data Seri B" });
        return;
    }
    const printWindow = window.open('', '', 'width=1200,height=800');
    if (!printWindow) return;

    const tableRows = assetsToPrint.map((asset, index) => {
        const data = auditData[asset.id] || {};
        const date1 = data.checked1_date ? format(data.checked1_date, 'dd/MM/yy') : '';
        const date2 = data.checked2_date ? format(data.checked2_date, 'dd/MM/yy') : '';
        const tglUpdate = customUpdateDate 
            ? format(customUpdateDate, 'dd/MM/yy') 
            : [...new Set([date1, date2].filter(Boolean))].join(' / ');
        return `
        <tr>
            <td>${index + 1}</td>
            <td>${asset.code}</td>
            <td>${asset.name}</td>
            <td>${asset.user || ''}</td>
            <td>${asset.location}</td>
            <td>${asset.qty}</td>
            <td>${data.checked1 ? '✓' : ''}</td>
            <td>${data.checked2 ? '✓' : ''}</td>
            <td>${tglUpdate}</td>
            <td>${data.remark || ''}</td>
        </tr>
    `}).join('');

    const html = `
        <html>
            <head>
                <title>Audit Seri B - ${auditPeriod}</title>
                <style>
                    body { font-family: Arial, sans-serif; padding: 20px; font-size: 9pt; }
                    h1 { text-align: center; text-transform: uppercase; font-size: 14pt; border-bottom: 2px solid #333; padding-bottom: 10px; }
                    table { width: 100%; border-collapse: collapse; margin-top: 15px; }
                    th, td { border: 1px solid black; padding: 4px; text-align: center; }
                    th { background: #f0f0f0; font-weight: bold; font-size: 8pt; }
                    .th-sub { display: block; font-weight: normal; font-size: 7pt; margin-top: 2px; }
                    @media print { @page { size: landscape; margin: 1cm; } }
                </style>
            </head>
            <body>
                <h1>Berita Acara Stock Opname Aset Seri B</h1>
                <p>Periode: <b>${auditPeriod}</b> | Dept: <b>${selectedDepartments.join(', ')}</b></p>
                <table>
                    <thead>
                        <tr>
                            <th>No</th>
                            <th>Kode Aset<br><span class="th-sub">財產編號</span></th>
                            <th>Nama Aset<br><span class="th-sub">財產名稱</span></th>
                            <th>PIC/User<br><span class="th-sub">保管人員</span></th>
                            <th>Lokasi<br><span class="th-sub">存放地點</span></th>
                            <th>Qty</th><th>1st</th><th>2nd</th><th>Update</th><th>Remark</th>
                        </tr>
                    </thead>
                    <tbody>${tableRows}</tbody>
                </table>
                ${generateSignatureTableHtml()}
            </body>
        </html>
    `;
    
    printWindow.document.write(html);
    printWindow.document.close();
    setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
  };

  const handleScanResult = useCallback(async (result: string) => {
    let assetFound: Asset | undefined;

    if (result.includes('assetId=')) {
        try {
            const url = new URL(result);
            const assetId = url.searchParams.get('assetId');
            if (assetId) {
                assetFound = allAssets.find(a => a.id === assetId);
            }
        } catch (e) { console.error("URL parse error", e); }
    }

    if (!assetFound) {
        assetFound = allAssets.find(a => a.code === result);
    }

    if (assetFound) {
        handleCheck(assetFound.id, true, 1);
        toast({
            title: "Aset Terverifikasi",
            description: "Status audit aset berhasil diperbarui."
        });
        
        const audio = document.getElementById('notification-sound') as HTMLAudioElement;
        if (audio) {
            audio.play().catch(e => console.log("Audio play blocked"));
        }
    } else {
        toast({
            variant: "destructive",
            title: "Aset Tidak Ditemukan",
            description: "Kode tersebut tidak terdaftar dalam database aset."
        });
    }
  }, [allAssets, toast]);

  useEffect(() => {
    let activeStream: MediaStream | null = null;
    let controls: any = null;

    if (isScannerOpen) {
        setIsScanning(true);
        navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
            .then(stream => {
                activeStream = stream;
                if (videoRef.current) {
                    videoRef.current.srcObject = stream;
                    
                    codeReader.current.decodeFromStream(stream, videoRef.current, (result, error) => {
                        if (result) {
                            handleScanResult(result.getText());
                        }
                    }).then(ctrls => {
                        controls = ctrls;
                    }).catch(err => {
                        console.error("Failed to start decoding", err);
                    });
                }
                setHasCameraPermission(true);
            })
            .catch((err) => {
                console.error("Error accessing camera:", err);
                setHasCameraPermission(false);
            });
    }

    return () => {
        if (controls) {
            controls.stop();
        }
        codeReader.current.reset();
        if (activeStream) {
            activeStream.getTracks().forEach(track => {
                track.stop();
                track.enabled = false;
            });
        }
        if (videoRef.current) {
            videoRef.current.srcObject = null;
        }
    };
  }, [isScannerOpen, handleScanResult]);

  const handleShareSignatureLink = async () => {
    if (selectedDepartments.length === 0 || selectedDepartments.includes('ALL')) {
        toast({ variant: 'destructive', title: 'Pilih Satu Dept' });
        return;
    }

    if (selectedDepartments.length === 1) {
        await shareSpecificDept(selectedDepartments[0]);
    }
  };

  const shareSpecificDept = async (deptId: string) => {
    setIsSharing(true);
    const periodIdShort = auditPeriod.replace(' ', '-');
    const publicUrl = window.location.origin + "/public/audit?p=" + periodIdShort + "&d=" + encodeURIComponent(deptId);
    
    try {
        if (navigator.share) {
            await navigator.share({
                title: "Tanda Tangan Audit",
                text: "Silakan berikan tanda tangan audit untuk departemen " + deptId,
                url: publicUrl
            });
            toast({ title: 'Berhasil Dibagikan' });
        } else {
            await navigator.clipboard.writeText(publicUrl);
            toast({ title: 'Link Disalin' });
        }
    } catch (e) {
        await navigator.clipboard.writeText(publicUrl);
        toast({ title: 'Link Disalin' });
    } finally {
        setIsSharing(false);
    }
  };

  const handleViewDetail = (id: string) => {
    setViewAssetId(id);
    setIsDetailOpen(true);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20 text-black">
      <div className="relative p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10 text-left">
        <div className="absolute top-0 right-0 w-1/2 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8 text-left">
            <div className="space-y-3 text-left">
                <div className="flex items-center gap-3 text-left">
                    <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5">
                        <ClipboardCheck className="h-10 w-10 text-primary animate-pulse" />
                    </div>
                    <div className="text-left">
                        <h1 className="text-4xl font-black tracking-tighter uppercase italic text-left">Audit Inventaris</h1>
                        <p className="text-primary/60 font-black text-[10px] uppercase tracking-[0.3em] mt-1 text-left">Industrial Stock Verification</p>
                    </div>
                </div>
                <p className="text-slate-400 font-medium text-sm max-w-xl text-left">Stock Opname semesteran terpadu untuk menjamin validitas dan ketersediaan aset di seluruh unit kerja PT. China Glaze Indonesia.</p>
            </div>
            
            <div className="flex flex-wrap items-center gap-2">
                <Button onClick={() => setIsScannerOpen(true)} className="rounded-2xl h-14 bg-emerald-600 hover:bg-emerald-700 font-black uppercase tracking-tighter shadow-2xl shadow-emerald-600/20 px-8 transition-all active:scale-95 text-white">
                    <QrCode className="mr-2 h-6 w-6" /> Scan QR Audit
                </Button>
                <div className="h-10 w-px bg-white/10 mx-3 hidden lg:block" />
                <div className="flex items-center bg-white/5 p-1.5 rounded-[1.5rem] border border-white/10 backdrop-blur-sm shadow-inner">
                    <div className="px-3 flex items-center border-r border-white/10" title="Ganti Tanggal Update di Laporan">
                        <CalendarIcon className="w-4 h-4 text-primary mr-2" />
                        <Input 
                            type="date" 
                            className="h-8 w-[120px] bg-transparent border-none text-white focus-visible:ring-0 px-0 text-xs font-bold [color-scheme:dark]"
                            value={customUpdateDate ? format(customUpdateDate, 'yyyy-MM-dd') : ''}
                            onChange={(e) => setCustomUpdateDate(e.target.value ? new Date(e.target.value) : undefined)}
                        />
                    </div>
                    <Button onClick={handlePrint} variant="ghost" className="rounded-xl h-11 font-bold text-white hover:bg-white/10">
                        <Printer className="mr-2 h-4 w-4 text-primary"/> Seri A
                    </Button>
                    <Button onClick={handlePrintB} variant="ghost" className="rounded-xl h-11 font-bold text-white hover:bg-white/10">
                        <Printer className="mr-2 h-4 w-4 text-primary"/> Seri B
                    </Button>
                </div>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6 text-left">
        <StatCard label="Total Item" value={statsSummary.total} icon={LayoutGrid} color="bg-slate-800" />
        <StatCard label="Sudah Dicek" value={statsSummary.checked} subValue={String(Math.round((statsSummary.checked/statsSummary.total)*100 || 0)) + "%"} icon={CheckCircle2} color="bg-blue-600" />
        <StatCard label="Terverifikasi" value={statsSummary.verified} icon={ShieldCheck} color="bg-emerald-600" />
        <StatCard label="Belum Dicek" value={statsSummary.remaining} icon={AlertCircle} color="bg-rose-600" subValue="BUTUH AKSI" />
      </div>

      <Card className="border-none shadow-xl rounded-[3rem] bg-white/80 dark:bg-slate-900/80 backdrop-blur-md overflow-hidden text-black">
        <CardContent className="p-10 text-black">
            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end">
                <div className="md:col-span-3 space-y-3 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-black">Periode Laporan</Label>
                    <Select value={auditPeriod} onValueChange={setAuditPeriod}>
                        <SelectTrigger className="h-12 rounded-2xl bg-slate-50 border-slate-200 dark:border-slate-800 shadow-inner font-bold focus:ring-primary/20 text-black">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="rounded-2xl shadow-2xl border-primary/5">
                            {auditPeriods.map(p => <SelectItem key={p} value={p} className="font-bold">{p}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>

                <div className="md:col-span-4 space-y-3 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 text-black">Departemen Unit</Label>
                    <Popover>
                        <PopoverTrigger asChild>
                            <Button variant="ghost" className="w-full h-12 justify-between px-6 rounded-2xl bg-slate-50 border border-slate-200 dark:border-slate-800 font-bold shadow-inner overflow-hidden text-black">
                                <span className="truncate">
                                    {selectedDepartments.length === 0 || selectedDepartments.includes('ALL') ? "Semua Departemen" : String(selectedDepartments.length) + " Terpilih"}
                                </span>
                                <Filter className="h-4 w-4 opacity-30 text-primary" />
                            </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-[320px] p-0 rounded-3xl shadow-2xl border-primary/10" align="start">
                            <div className="p-3 border-b bg-slate-50 flex items-center justify-between">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Pilih Lokasi Audit</span>
                                <Button variant="ghost" size="sm" onClick={() => setSelectedDepartments(['ALL'])} className="h-7 px-3 text-[9px] font-black uppercase text-primary hover:bg-primary/5">Reset</Button>
                            </div>
                            <ScrollArea className="h-80">
                                <div className="p-4 space-y-6 text-left text-black">
                                  {/* Dept Groups Section */}
                                  {deptGroups.length > 0 && (
                                    <div className="space-y-3 text-left">
                                      <p className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                                        <Users2 className="h-3 w-3" /> Grup Departemen
                                      </p>
                                      <div className="grid grid-cols-1 gap-2">
                                        {deptGroups.map(group => (
                                          <button 
                                            key={group.id} 
                                            onClick={() => handleApplyGroup(group.departments)}
                                            className="flex flex-col items-start p-2.5 rounded-xl border border-slate-100 hover:border-primary/30 hover:bg-primary/5 transition-all text-left"
                                          >
                                            <span className="text-xs font-black uppercase text-slate-900">{group.name}</span>
                                            <span className="text-[8px] font-bold text-muted-foreground uppercase truncate w-full">{group.departments.join(', ')}</span>
                                          </button>
                                        ))}
                                      </div>
                                      <Separator className="my-4" />
                                    </div>
                                  )}

                                  <div className="space-y-3 text-left">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Pilih Manual</p>
                                    {departmentOptions.map(dept => (
                                        <div key={dept} className="flex items-center space-x-3 group">
                                            <Checkbox 
                                                id={dept} 
                                                checked={selectedDepartments.includes(dept)} 
                                                onCheckedChange={(checked) => handleDepartmentChange(checked === true ? [...selectedDepartments, dept] : selectedDepartments.filter(d => d !== dept))} 
                                                className="h-5 w-5 rounded-lg border-primary/30"
                                            />
                                            <Label htmlFor={dept} className="text-xs font-bold text-slate-700 dark:text-slate-300 cursor-pointer group-hover:text-primary transition-colors">{dept}</Label>
                                        </div>
                                    ))}
                                  </div>
                                </div>
                            </ScrollArea>
                        </PopoverContent>
                    </Popover>
                </div>

                <div className="md:col-span-5 space-y-3 text-left text-black">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Klasifikasi Seri</Label>
                    <ToggleGroup 
                        type="single" 
                        value={seriesFilter} 
                        onValueChange={(v: 'ALL' | 'A' | 'B') => v && setSeriesFilter(v)}
                        className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl h-12 shadow-inner w-full flex border border-slate-200 dark:border-slate-700"
                    >
                        <ToggleGroupItem value="ALL" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">Semua</ToggleGroupItem>
                        <ToggleGroupItem value="A" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">Seri A</ToggleGroupItem>
                        <ToggleGroupItem value="B" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all">Seri B</ToggleGroupItem>
                    </ToggleGroup>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-end mt-6">
                <div className="md:col-span-7 space-y-3 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Kategori Kepemilikan & Tipe</Label>
                    <ToggleGroup 
                        type="single" 
                        value={ownershipFilter} 
                        onValueChange={(v: 'ALL' | 'COMPANY' | 'PERSONAL' | 'UTILITY') => v && setOwnershipFilter(v)}
                        className="bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl h-12 shadow-inner w-full flex border border-slate-200 dark:border-slate-700"
                    >
                        <ToggleGroupItem value="ALL" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg">
                            Semua
                        </ToggleGroupItem>
                        <ToggleGroupItem value="COMPANY" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all gap-2">
                            <Shield className="h-3 w-3" /> Perusahaan
                        </ToggleGroupItem>
                        <ToggleGroupItem value="PERSONAL" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all gap-2">
                            <Crown className="h-3 w-3" /> Personal
                        </ToggleGroupItem>
                        <ToggleGroupItem value="UTILITY" className="flex-1 rounded-xl data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg font-black text-[10px] uppercase tracking-widest transition-all gap-2">
                            <Zap className="h-3 w-3" /> Utilitas
                        </ToggleGroupItem>
                    </ToggleGroup>
                </div>
                
                <div className="md:col-span-5 relative group text-left">
                    <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1 mb-3 block text-left">Pencarian Cepat</Label>
                    <div className="relative">
                        <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="Nama atau kode aset..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 pl-16 bg-white border-slate-200 dark:border-slate-800 rounded-2xl shadow-inner font-medium text-base focus:ring-2 focus:ring-primary/10 transition-all text-black"
                        />
                    </div>
                </div>
            </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-xl rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
        {/* Desktop Header */}
        <div className="hidden md:grid md:grid-cols-[80px_180px_1fr_120px_140px_140px_1fr_100px] items-center p-4 bg-slate-50 dark:bg-slate-800/50 h-20 border-b border-slate-100 dark:border-slate-800 text-black">
            <div className="pl-10 text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">No</div>
            <div className="text-left flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Identitas</span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">財產編號</span>
            </div>
            <div className="text-left flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Nama Barang</span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">財產名稱</span>
            </div>
            <div className="text-center flex flex-col">
                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Unit / Qty</span>
                <span className="text-[8px] font-bold text-primary uppercase tracking-tighter">單位</span>
            </div>
            <div className="text-center">
                <div className="flex flex-col items-center gap-1.5">
                    <span className="text-[9px] font-black uppercase text-muted-foreground tracking-[0.2em]">1st Checker</span>
                    <Checkbox checked={isAllChecked1 ? true : isSomeChecked1 ? 'indeterminate' : false} onCheckedChange={(c) => handleCheckAll(c === true, 1)} className="h-5 w-5 rounded-lg border-primary/30" />
                </div>
            </div>
            <div className="text-center">
                <div className="flex flex-col items-center gap-1.5">
                    <div className="flex items-center gap-1">
                        <span className={cn(
                            "text-[9px] font-black uppercase tracking-[0.2em]",
                            isAuthorizedForSecondCheck ? "text-muted-foreground" : "text-slate-300"
                        )}>2nd Checker</span>
                        {!isAuthorizedForSecondCheck && <Lock className="h-2 w-2 text-slate-300" />}
                    </div>
                    <Checkbox checked={isAllChecked2 ? true : isSomeChecked2 ? 'indeterminate' : false} onCheckedChange={(c) => handleCheckAll(c === true, 2)} disabled={!isAuthorizedForSecondCheck} className="h-5 w-5 rounded-lg border-primary/30" />
                </div>
            </div>
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground text-left">Keterangan Audit</div>
            <div className="text-center pr-6 text-[10px] font-black uppercase tracking-widest text-muted-foreground">Profil</div>
        </div>
        <CardContent className="p-4 md:p-0 text-black">
            {loading ? (
                <div className="p-4 space-y-4 text-left">
                    {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24 w-full rounded-2xl" />)}
                </div>
            ) : filteredAssets.length > 0 ? (
                <div className="space-y-4 md:space-y-0 text-left">
                    {filteredAssets.map((asset, index) => {
                        const data = auditData[asset.id] || {};
                        const isCheckedBoth = data.checked1 && data.checked2;
                        return (
                            <motion.div 
                                key={asset.id} 
                                layout
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                transition={{ duration: 0.3 }}
                                className={cn("md:grid md:grid-cols-[80px_180px_1fr_120px_140px_140px_1fr_100px] items-center transition-colors md:border-t md:border-slate-100 md:dark:border-slate-800",
                                    isCheckedBoth ? "bg-emerald-50/40 dark:bg-emerald-950/20" : "bg-white dark:bg-slate-900 md:bg-transparent md:dark:bg-transparent",
                                    "p-4 rounded-2xl md:p-0 md:rounded-none md:h-24 group shadow-md md:shadow-none"
                                )}>

                                {/* Mobile View */}
                                <div className="md:hidden">
                                    <div className="flex justify-between items-start gap-4">
                                        <div className="flex-1 min-w-0 text-left">
                                            <p className="font-black text-slate-900 dark:text-white uppercase text-sm break-words text-left">{asset.name}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <Badge variant="secondary" className="font-mono text-[10px] tracking-tighter">{asset.code}</Badge>
                                                <Badge variant="outline" className="font-bold text-[10px]">{asset.location}</Badge>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-3 shrink-0">
                                            <Checkbox checked={data.checked1 || false} onCheckedChange={(c) => handleCheck(asset.id, !!c, 1)} className="h-7 w-7 rounded-xl border-primary/30 data-[state=checked]:bg-blue-600" />
                                            <Checkbox checked={data.checked2 || false} onCheckedChange={(c) => handleCheck(asset.id, !!c, 2)} disabled={!isAuthorizedForSecondCheck} className="h-7 w-7 rounded-xl border-primary/30 data-[state=checked]:bg-emerald-600" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex items-center gap-3">
                                        <div className="relative group/input flex-1">
                                            <Input
                                                value={data.remark || ''}
                                                onChange={(e) => handleRemarkChange(asset.id, e.target.value)}
                                                className="h-11 bg-slate-100/80 dark:bg-slate-800/50 border-none focus:ring-primary/20 text-xs font-bold placeholder:italic placeholder:font-medium rounded-xl shadow-inner italic text-black dark:text-white"
                                                placeholder="Catatan temuan..."
                                            />
                                            <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-0 group-hover/input:opacity-30 pointer-events-none transition-opacity" />
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="icon"
                                            onClick={() => handleViewDetail(asset.id)}
                                            className="h-11 w-11 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:bg-slate-800 dark:border-slate-700 dark:text-white transition-all shrink-0"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                                
                                {/* Desktop View */}
                                <div className="hidden md:contents text-left text-black">
                                    <div className="pl-10 text-xs font-black text-slate-400 dark:text-slate-600 text-left">{index + 1}</div>
                                    <div className="text-left">
                                        <div className="flex flex-col text-left">
                                            <span className="font-black font-mono text-xs text-primary tracking-tighter text-left">{asset.code}</span>
                                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-50 text-left">{asset.costCenter || 'No CC'}</span>
                                        </div>
                                    </div>
                                    <div className="text-left">
                                        <div className="flex flex-col text-left">
                                            <span className="font-black text-sm text-slate-900 dark:text-white uppercase truncate max-w-xs text-left">{asset.name}</span>
                                            <div className="flex items-center gap-1.5 text-[10px] font-bold text-muted-foreground uppercase opacity-60 mt-0.5 text-left">
                                                <MapPin className="h-3 w-3" />
                                                <span>{asset.location}</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-center">
                                        <Badge variant="outline" className="rounded-lg font-black text-[10px] bg-white dark:bg-slate-900 shadow-sm border-slate-200 dark:border-slate-800 px-3 py-1">
                                            {String(asset.qty)} UNIT
                                        </Badge>
                                    </div>
                                    <div className="text-center">
                                        <Checkbox checked={data.checked1 || false} onCheckedChange={(c) => handleCheck(asset.id, !!c, 1)} className="h-7 w-7 rounded-xl border-primary/30 data-[state=checked]:bg-blue-600" />
                                    </div>
                                    <div className="text-center">
                                        <Checkbox checked={data.checked2 || false} onCheckedChange={(c) => handleCheck(asset.id, !!c, 2)} disabled={!isAuthorizedForSecondCheck} className="h-7 w-7 rounded-xl border-primary/30 data-[state=checked]:bg-emerald-600" />
                                    </div>
                                    <div className="text-left">
                                        <div className="relative group/input text-left">
                                            <Input
                                                value={data.remark || ''}
                                                onChange={(e) => handleRemarkChange(asset.id, e.target.value)}
                                                className="h-11 bg-slate-50/50 dark:bg-slate-800/30 border-none focus:ring-primary/20 text-xs font-bold placeholder:italic placeholder:font-medium rounded-xl shadow-inner italic text-black dark:text-white text-left"
                                                placeholder="Catatan temuan..."
                                            />
                                            <Pencil className="absolute right-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 opacity-0 group-hover/input:opacity-20 pointer-events-none transition-opacity" />
                                        </div>
                                    </div>
                                    <div className="text-center pr-6">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => handleViewDetail(asset.id)}
                                            className="h-10 w-10 rounded-xl text-blue-600 hover:text-blue-700 hover:bg-blue-50 transition-all"
                                        >
                                            <Eye className="h-5 w-5" />
                                        </Button>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            ) : (
                 <div className="h-80 text-center flex items-center justify-center">
                    <div className="flex flex-col items-center gap-4 opacity-30">
                        <FileText className="h-20 w-20" />
                        <div className="space-y-1">
                            <p className="font-black uppercase tracking-[0.3em] text-sm italic text-left">Pilih Matrix Filter</p>
                            <p className="text-[10px] font-bold uppercase text-left">Gunakan pencarian atau filter lokasi untuk memuat data audit.</p>
                        </div>
                    </div>
                </div>
            )}
        </CardContent>
        
        <CardFooter className="flex-col items-stretch p-6 md:p-12 bg-slate-50/50 dark:bg-slate-950/50 border-t border-slate-100 dark:border-slate-800 gap-12 text-left">
            {getSelectedGroups().map(group => {
                return (
                    <div key={group.name} className="space-y-8 p-6 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 relative">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b pb-4 border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-3 text-left">
                                <div className="p-2 bg-primary/5 rounded-lg text-left"><UserCheck className="h-5 w-5 text-primary" /></div>
                                <div className="space-y-0.5 text-left">
                                    <h3 className="text-lg md:text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
                                        Pengesahan Unit: {group.name}
                                    </h3>
                                    <p className="text-[9px] md:text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 text-left">
                                        Anggota Unit: {group.departments.join(', ')}
                                    </p>
                                </div>
                            </div>
                            
                            <Button 
                                onClick={async () => {
                                    setIsSharing(true);
                                    const periodIdShort = auditPeriod.replace(' ', '-');
                                    const deptList = group.departments.join(',');
                                    const publicUrl = window.location.origin + "/public/audit?p=" + periodIdShort + "&d=" + encodeURIComponent(deptList);
                                    try {
                                        if (navigator.share) {
                                            await navigator.share({
                                                title: "Tanda Tangan Audit",
                                                text: "Silakan berikan tanda tangan audit untuk departemen " + group.name,
                                                url: publicUrl
                                            });
                                            toast({ title: 'Berhasil Dibagikan' });
                                        } else {
                                            await navigator.clipboard.writeText(publicUrl);
                                            toast({ title: 'Link Disalin' });
                                        }
                                    } catch (e) {
                                        await navigator.clipboard.writeText(publicUrl);
                                        toast({ title: 'Link Disalin' });
                                    } finally {
                                        setIsSharing(false);
                                    }
                                }} 
                                variant="outline" 
                                size="sm" 
                                className="rounded-xl border-purple-200 text-purple-700 hover:bg-purple-50 font-bold self-start sm:self-auto"
                            >
                                {isSharing ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Share2 className="mr-2 h-4 w-4" />} 
                                <span className="hidden md:inline">Bagikan Link Unit</span><span className="md:hidden">Share</span>
                            </Button>
                        </div>

                        {/* Internal Unit Grid */}
                        <div className="space-y-4">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary">Internal Unit Verification Cycle</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-8 text-center px-0">
                                <SignatureBox role="atasan2" label="Atasan Dept" name={group.name} group={group} />
                                <SignatureBox role="atasan1" label="Yang Merawat" name="Custodian" group={group} />
                                <SignatureBox role="checker1" label="1st Checker" name="Internal Control" group={group} />
                                <SignatureBox role="checker2" label="2nd Checker" name="Finance Dept" group={group} />
                                <SignatureBox role="admin" label="Atasan" name="GA Dept" group={group} />
                                <SignatureBox role="userDibuat" label="Dibuat" name="Reporter" group={group} />
                            </div>
                        </div>

                        {/* HQ Section within the Group */}
                        <div className="space-y-4 pt-4 border-t border-slate-100 dark:border-slate-800">
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Corporate Governance Approval (HQ)</p>
                            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:gap-8 text-center px-0">
                                <SignatureBox role="userDibuat" label="Dibuat Oleh" name="Logistics Staff" group={group} />
                                <SignatureBox role="userDiketahui1" label="Diketahui" name="GA Supervisor" group={group} />
                                <SignatureBox role="userDiketahui2" label="Diverifikasi" name="Accounting Mgr" group={group} />
                                <SignatureBox role="userDiterima" label="Director" group={group} />
                                <SignatureBox role="userDisetujui" label="Disetujui" name="Pres. Director" group={group} />
                            </div>
                        </div>
                    </div>
                );
            })}
        </CardFooter>
      </Card>

      <Dialog open={isScannerOpen} onOpenChange={setIsScannerOpen}>
        <DialogContent className="p-0 overflow-hidden sm:max-w-2xl border-none shadow-2xl bg-slate-950 rounded-[3rem]">
            <div className="px-8 py-8 bg-slate-900 text-white flex items-center justify-between border-b border-white/10 text-left">
                <div className="flex items-center gap-4 text-left">
                    <div className="p-3 bg-emerald-500/20 rounded-2xl border border-emerald-500/30">
                        <QrCode className="h-8 w-8 text-emerald-500" />
                    </div>
                    <div className="text-left">
                        <DialogTitle className="text-2xl font-black tracking-tight text-left text-white">Audit Scanner</DialogTitle>
                        <DialogDescription className="text-white/40 text-xs font-bold uppercase tracking-widest text-left">Rapid Checklist System</DialogDescription>
                    </div>
                </div>
                <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10 text-white"><X className="h-6 w-6 text-white"/></Button></DialogClose>
            </div>
            
            <div className="relative aspect-video bg-black flex items-center justify-center">
                {hasCameraPermission === false && (
                    <div className="flex flex-col items-center gap-6 text-center p-12 animate-in zoom-in-95">
                        <VideoOff className="h-16 w-16 text-rose-500 opacity-50" />
                        <div className="space-y-2">
                            <p className="text-xl font-black uppercase text-white">Kamera Terkunci</p>
                            <p className="text-white/40 text-xs max-w-xs mx-auto leading-relaxed text-white">Mohon izinkan akses kamera di pengaturan browser Anda untuk menggunakan fitur pemindaian cepat.</p>
                        </div>
                    </div>
                )}
                <video ref={videoRef} className="w-full h-full object-cover opacity-80" autoPlay playsInline muted />
                <div className="absolute inset-0 border-[60px] border-black/40 pointer-events-none text-left"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 border-2 border-emerald-500/50 rounded-[2.5rem] animate-pulse text-left"></div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-72 h-[2px] bg-emerald-50 shadow-[0_0_20px_emerald] animate-bounce text-left"></div>
            </div>

            <div className="p-10 bg-slate-900 flex flex-col items-center gap-6 text-center">
                <div className="flex items-center gap-3 px-6 py-2.5 bg-emerald-500/5 rounded-full border border-emerald-500/20">
                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping"></div>
                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-500/80 text-white">Sistem Siap Memindai</span>
                </div>
                <p className="text-xs text-white/30 text-center max-w-sm italic leading-relaxed text-white">
                    Dekatkan kamera ke kode QR verifikasi aset. Sistem akan otomatis memvalidasi data dan mencentang kolom 1st Checker jika aset ditemukan.
                </p>
            </div>
        </DialogContent>
      </Dialog>

      <Dialog open={isSignDialogOpen} onOpenChange={setIsSignDialogOpen}>
        <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] text-black">
          <div className="p-8 bg-slate-900 text-white border-b border-white/5 flex items-center justify-between text-left">
            <div className="flex items-center gap-3 text-left">
                <div className="p-2 bg-primary/20 rounded-xl"><Pencil className="h-5 w-5 text-primary" /></div>
                <div className="text-left">
                    <DialogTitle className="uppercase font-black tracking-tight text-xl text-left text-white">Tanda Tangan Digital</DialogTitle>
                    <DialogDescription className="text-white/40 text-xs font-bold tracking-widest uppercase text-left">E-Signature Verification</DialogDescription>
                </div>
            </div>
            <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10 text-white"><X className="h-10 w-10 text-white"/></Button></DialogClose>
          </div>
          <div className="p-8 text-black">
            <div className="border-4 border-dashed border-slate-100 rounded-3xl bg-slate-50 h-72 overflow-hidden shadow-inner relative group text-black">
                <SignatureCanvas 
                ref={sigPadRef}
                penColor="black"
                canvasProps={{ className: 'w-full h-full relative z-10' }}
                />
            </div>
            <div className="mt-8 flex gap-3">
                <Button variant="ghost" onClick={() => sigPadRef.current?.clear()} className="flex-1 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest text-rose-600 hover:bg-rose-50">Hapus</Button>
                <Button variant="outline" onClick={() => setIsSignDialogOpen(false)} className="flex-1 rounded-2xl h-12 font-bold border-slate-200 text-black">Batal</Button>
                <Button onClick={handleSaveSignature} disabled={isSigning} className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white">
                   {isSigning ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <Check className="mr-2 h-4 w-4" />} Simpan & Kunci
                </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog for Deleting Signature */}
      <AlertDialog open={isConfirmDeleteSigOpen} onOpenChange={setIsConfirmDeleteSigOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white text-black">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-4 text-left text-black">
                <Trash2 className="h-8 w-8 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-rose-600">Buka Kunci Tanda Tangan?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-left leading-relaxed text-black">
              Tindakan ini akan menghapus tanda tangan yang sudah ada dan membuka kembali kolom pengesahan. 
              {isAdmin && selectedDepartments.includes('ALL') && (roleToDelete === 'userDibuat' || roleToDelete === 'admin' || roleToDelete === 'checker2') 
                ? " Peringatan: Tanda tangan global akan dihapus dari seluruh departemen." 
                : ""}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={isDeletingSig} className="rounded-xl h-12 font-bold text-black">Batalkan</AlertDialogCancel>
            <AlertDialogAction 
                onClick={handleDeleteSignature} 
                disabled={isDeletingSig}
                className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-xl shadow-rose-600/20 text-white"
            >
                {isDeletingSig ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <X className="mr-2 h-4 w-4" />}
                Ya, Hapus
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {viewAssetId && (
        <AssetDetailDialog 
            assetId={viewAssetId} 
            isOpen={isDetailOpen} 
            onOpenChange={setIsDetailOpen} 
        />
      )}
    </div>
  );
}
