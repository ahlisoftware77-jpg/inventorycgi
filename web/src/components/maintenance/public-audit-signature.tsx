'use client';

/**
 * @fileOverview Komponen Tanda Tangan Audit Publik Terpadu.
 * Fitur: Menampilkan daftar aset per departemen, status audit, dan pengesahan digital.
 * Keamanan: Tanda tangan yang sudah ada bersifat read-only (tidak dapat diedit).
 * Sinkronisasi: Menggunakan urutan tanda tangan Internal Unit (atasan2, atasan1, checker1, checker2, admin, userDibuat).
 */

import { useState, useEffect, useRef, useMemo } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot, setDoc, collection, query, where, getDocs, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { 
  Loader2, 
  Pencil, 
  CheckCircle2, 
  ShieldCheck, 
  X, 
  MapPin, 
  Calendar, 
  AlertCircle,
  FileText,
  Hash,
  Package,
  Info,
  Shield,
  Crown,
  Zap,
  Filter,
  Eye,
  User,
  Building
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from '@/components/ui/dialog';
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { Label } from '@/components/ui/label';
import SignatureCanvas from 'react-signature-canvas';
import Image from 'next/image';
import { useToast } from '@/hooks/use-toast';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError } from '@/lib/firebase/errors';
import { cn } from '@/lib/utils';
import AssetCardPreview from '@/components/assets/asset-card-preview';

type SignatureRole = 'checker1' | 'checker2' | 'atasan1' | 'admin' | 'atasan2' | 'userDibuat';

interface AuditProgress {
    checked1?: boolean;
    checked2?: boolean;
    remark?: string;
}

const utilityCategories = ['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'];

export default function PublicAuditSignature() {
  const searchParams = useSearchParams();
  const periodId = searchParams.get('p');
  const deptId = searchParams.get('d');
  
  const depts = useMemo(() => {
    if (!deptId) return [];
    return decodeURIComponent(deptId).split(',').map(d => d.trim()).filter(Boolean);
  }, [deptId]);

  const [signaturesMap, setSignaturesMap] = useState<Record<string, any>>({});
  const [deptGroups, setDeptGroups] = useState<any[]>([]);
  const [currentGroup, setCurrentGroup] = useState<{ name: string, departments: string[] } | null>(null);
  
  const [allAssets, setAllAssets] = useState<Asset[]>([]);
  const [auditProgress, setAuditProgress] = useState<Record<string, AuditProgress>>({});
  const [loading, setLoading] = useState(true);
  const [isSignOpen, setIsSignOpen] = useState(false);
  const [currentRole, setCurrentRole] = useState<SignatureRole | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [companyName, setCompanyName] = useState('PT. CHINA GLAZE INDONESIA');
  
  // Filter States
  const [seriesFilter, setSeriesFilter] = useState<'ALL' | 'A' | 'B'>('ALL');
  const [ownershipFilter, setOwnershipFilter] = useState<'ALL' | 'COMPANY' | 'PERSONAL' | 'UTILITY'>('ALL');

  // Preview States
  const [previewAssetId, setPreviewAssetId] = useState<string | null>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const sigPadRef = useRef<SignatureCanvas | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data.companyName) setCompanyName(data.companyName);
          if (data.deptGroups) setDeptGroups(data.deptGroups);
        }
    });
    
    if (!periodId || depts.length === 0) {
        setLoading(false);
        return;
    }

    // 1. Listen to Signatures for all depts
    const unsubSignatures = depts.map(d => {
      return onSnapshot(doc(db, 'audits', periodId, 'signatures', d), (snap) => {
        if (snap.exists()) {
          setSignaturesMap(prev => ({ ...prev, [d]: snap.data() }));
        } else {
          setSignaturesMap(prev => ({ ...prev, [d]: {} }));
        }
      });
    });

    // 2. Fetch Assets for this Department
    const fetchAssets = async () => {
        try {
            const q = query(collection(db, 'assets'), where('location', 'in', depts));
            const snap = await getDocs(q);
            const data = snap.docs.map(d => ({ id: d.id, ...d.data() } as Asset));
            setAllAssets(data.sort((a, b) => a.code.localeCompare(b.code)));

            // 3. Fetch Audit Progress for these assets
            if (data.length > 0) {
                const assetIds = data.map(a => a.id);
                const chunks: string[][] = [];
                for (let i = 0; i < assetIds.length; i += 30) {
                    chunks.push(assetIds.slice(i, i + 30));
                }

                const progressMap: Record<string, AuditProgress> = {};
                await Promise.all(chunks.map(async (chunk) => {
                    const progressQ = query(collection(db, 'audits', periodId, 'assets'), where('__name__', 'in', chunk));
                    const progressSnap = await getDocs(progressQ);
                    progressSnap.forEach(d => {
                        progressMap[d.id] = d.data() as AuditProgress;
                    });
                }));
                setAuditProgress(progressMap);
            }
        } catch (error) {
            console.error("Fetch data error:", error);
        } finally {
            setLoading(false);
        }
    };

    fetchAssets();

    return () => { 
      unsubGen(); 
      unsubSignatures.forEach(unsub => unsub());
    };
  }, [periodId, depts]);

  const getSelectedGroups = () => {
    if (depts.length === 0) return [];

    const grouped: { name: string; departments: string[] }[] = [];
    const processedDepts = new Set<string>();

    deptGroups.forEach(group => {
      const matchingDepts = group.departments.filter((d: string) => depts.includes(d));
      if (matchingDepts.length > 0) {
        grouped.push({
          name: group.name,
          departments: matchingDepts
        });
        matchingDepts.forEach((d: string) => processedDepts.add(d));
      }
    });

    depts.forEach(d => {
      if (!processedDepts.has(d)) {
        grouped.push({
          name: d,
          departments: [d]
        });
      }
    });

    return grouped;
  };

  const filteredAssets = useMemo(() => {
    let result = allAssets;

    if (seriesFilter !== 'ALL') {
        result = result.filter(asset => {
            const isUtility = utilityCategories.includes(asset.category);
            if (seriesFilter === 'A') return asset.category.startsWith('A') && !isUtility;
            if (seriesFilter === 'B') return !asset.category.startsWith('A') && !isUtility;
            return true;
        });
    }

    if (ownershipFilter !== 'ALL') {
        result = result.filter(asset => {
            if (ownershipFilter === 'COMPANY') return asset.status !== 'Bukan_Asset_Perusahaan';
            if (ownershipFilter === 'PERSONAL') return asset.status === 'Bukan_Asset_Perusahaan';
            if (ownershipFilter === 'UTILITY') return utilityCategories.includes(asset.category);
            return true;
        });
    }

    return result;
  }, [allAssets, seriesFilter, ownershipFilter]);

  const handleSave = async () => {
    if (!sigPadRef.current || !currentRole || !periodId || !currentGroup) return;
    
    if (sigPadRef.current.isEmpty()) {
        toast({ variant: 'destructive', title: 'Tanda Tangan Kosong' });
        return;
    }

    setIsSaving(true);
    const dataUrl = sigPadRef.current.toDataURL('image/png');
    
    try {
      const batch = writeBatch(db);
      currentGroup.departments.forEach(d => {
        const docRef = doc(db, "audits", periodId, "signatures", d);
        batch.set(docRef, { [currentRole]: dataUrl }, { merge: true });
      });
      await batch.commit();

      setSignaturesMap(prev => {
        const updated = { ...prev };
        currentGroup.departments.forEach(d => {
          updated[d] = {
            ...(updated[d] || {}),
            [currentRole]: dataUrl
          };
        });
        return updated;
      });

      toast({ title: 'Berhasil Disimpan', description: 'Tanda tangan Anda telah dikunci ke sistem.' });
      setIsSignOpen(false);
    } catch (serverError) {
      console.error("Save signature error:", serverError);
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: 'Kendala izin akses database.' });
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreviewCard = (id: string) => {
    setPreviewAssetId(id);
    setIsPreviewOpen(true);
  };

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center min-h-screen gap-4 text-black">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-xs font-black uppercase tracking-widest text-muted-foreground animate-pulse">Menyiapkan Lembar Audit...</p>
        </div>
    );
  }

  if (!periodId || depts.length === 0) {
    return (
        <div className="p-12 text-center flex flex-col items-center justify-center min-h-screen gap-6 text-black">
            <AlertCircle className="h-16 w-16 text-rose-500 opacity-20 mx-auto" />
            <h1 className="text-2xl font-black uppercase tracking-tight">Tautan Tidak Valid</h1>
            <p className="text-muted-foreground text-sm max-w-xs">Mohon gunakan tautan resmi yang dibagikan dari sistem audit utama.</p>
        </div>
    );
  }

  const roleLabels: Record<SignatureRole, string> = {
    atasan2: 'Atasan Dept',
    atasan1: 'Yang Merawat (Custodian)',
    checker1: '1st Checker (IC)',
    checker2: '2nd Checker (Finance)',
    admin: 'Atasan (GA Dept)',
    userDibuat: 'Dibuat (Reporter)'
  };

  const roleSubLabels: Record<SignatureRole, string> = {
    atasan2: 'Dept Head',
    atasan1: 'Custodian',
    checker1: 'Internal Control',
    checker2: 'Finance Dept',
    admin: 'GA Dept',
    userDibuat: 'Reporter'
  };

  const SignatureTile = ({ role, group }: { role: SignatureRole, group: { name: string, departments: string[] } }) => {
    const deptId = group.departments[0];
    const signature = signaturesMap[deptId]?.[role] || '';
    const isSigned = !!signature;
    
    return (
        <Card 
            onClick={() => { if (!isSigned) { setCurrentRole(role); setCurrentGroup(group); setIsSignOpen(true); } }}
            className={cn(
                "transition-all duration-300 rounded-3xl overflow-hidden bg-white shadow-sm border",
                isSigned ? "cursor-default border-emerald-100 bg-emerald-50/10" : "cursor-pointer group hover:border-primary hover:shadow-md"
            )}
        >
            <CardHeader className="p-4 pb-2 bg-slate-50 border-b flex flex-row items-center justify-between">
                <div className="text-left flex flex-col">
                    <CardTitle className="text-[10px] font-black uppercase tracking-widest text-muted-foreground group-hover:text-primary transition-colors text-left">
                        {role === 'atasan2' ? `Atasan Dept (${group.name})` : roleLabels[role]}
                    </CardTitle>
                    <span className="text-[8px] font-bold text-slate-400 uppercase tracking-tighter">{roleSubLabels[role]}</span>
                </div>
                {isSigned && <CheckCircle2 className="h-3 w-3 text-emerald-500" />}
            </CardHeader>
            <CardContent className="p-6 h-32 flex items-center justify-center relative text-black">
                {isSigned ? (
                    <div className="relative w-full h-full animate-in fade-in zoom-in duration-500">
                        <Image src={signature} alt={role} fill className="object-contain" />
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-2 opacity-20 group-hover:opacity-40 transition-opacity">
                        <Pencil className="h-6 w-6" />
                        <span className="text-[8px] font-black uppercase text-black">Ketuk Untuk Tanda Tangan</span>
                    </div>
                )}
            </CardContent>
            {isSigned && (
                <div className="px-4 py-1.5 bg-emerald-500 text-white text-center">
                    <p className="text-[8px] font-black uppercase tracking-widest">TANDA TANGAN TERKUNCI</p>
                </div>
            )}
        </Card>
    );
  };

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-10 space-y-10 pb-32 text-black">
        {/* Header Identitas */}
        <div className="flex flex-col items-center text-center gap-4">
            <Image src="/cgi.png" alt="Logo" width={64} height={64} className="mb-2 shadow-sm rounded-xl p-1 bg-white" />
            <div className="space-y-1">
                <h1 className="text-3xl font-black tracking-tighter uppercase text-slate-900 dark:text-white italic">{companyName}</h1>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-primary bg-primary/5 px-6 py-1.5 rounded-full inline-block">Lembar Verifikasi & Pengesahan Audit</p>
            </div>
        </div>

        {/* Info Box */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-slate-950 text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><Calendar className="h-24 w-24" /></div>
                <CardContent className="p-6 flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 shadow-lg"><Calendar className="h-7 w-7 text-white" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1 text-left">Periode Laporan</p>
                        <p className="text-xl font-black uppercase tracking-tight text-left">{periodId.replace(/-/g, ' ')}</p>
                    </div>
                </CardContent>
            </Card>
            <Card className="rounded-[2.5rem] border-none shadow-xl bg-primary text-white overflow-hidden relative">
                <div className="absolute top-0 right-0 p-6 opacity-5 pointer-events-none"><MapPin className="h-24 w-24" /></div>
                <CardContent className="p-6 flex items-center gap-5">
                    <div className="p-4 bg-white/10 rounded-2xl border border-white/10 shadow-lg"><MapPin className="h-7 w-7 text-white" /></div>
                    <div>
                        <p className="text-[10px] font-black uppercase text-white/40 tracking-[0.2em] mb-1 text-left">Unit Departemen</p>
                        <p className="text-xl font-black uppercase tracking-normal text-left">{deptId}</p>
                    </div>
                </CardContent>
            </Card>
        </div>

        {/* Filter Section */}
        <Card className="border-none shadow-lg rounded-[2.5rem] bg-white dark:bg-slate-900 overflow-hidden">
            <CardContent className="p-8 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 text-left">
                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Klasifikasi Seri</Label>
                        <ToggleGroup 
                            type="single" 
                            value={seriesFilter} 
                            onValueChange={(v: 'ALL' | 'A' | 'B') => v && setSeriesFilter(v)}
                            className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl h-12 w-full flex border"
                        >
                            <ToggleGroupItem value="ALL" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg">Semua</ToggleGroupItem>
                            <ToggleGroupItem value="A" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg">Seri A</ToggleGroupItem>
                            <ToggleGroupItem value="B" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg">Seri B</ToggleGroupItem>
                        </ToggleGroup>
                    </div>

                    <div className="space-y-3">
                        <Label className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground ml-1">Kategori Kepemilikan & Tipe</Label>
                        <ToggleGroup 
                            type="single" 
                            value={ownershipFilter} 
                            onValueChange={(v: 'ALL' | 'COMPANY' | 'PERSONAL' | 'UTILITY') => v && setOwnershipFilter(v)}
                            className="bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl h-12 w-full flex border"
                        >
                            <ToggleGroupItem value="ALL" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg">Semua</ToggleGroupItem>
                            <ToggleGroupItem value="COMPANY" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg gap-1.5"><Shield className="h-3 w-3" /> Corp</ToggleGroupItem>
                            <ToggleGroupItem value="PERSONAL" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg gap-1.5"><Crown className="h-3 w-3" /> Pers</ToggleGroupItem>
                            <ToggleGroupItem value="UTILITY" className="flex-1 rounded-xl font-black text-[10px] uppercase tracking-widest data-[state=on]:bg-white dark:data-[state=on]:bg-slate-900 data-[state=on]:text-primary data-[state=on]:shadow-lg gap-1.5"><Zap className="h-3 w-3" /> Util</ToggleGroupItem>
                        </ToggleGroup>
                    </div>
                </div>
            </CardContent>
        </Card>

        {/* Daftar Aset Departemen */}
        <div className="space-y-6">
            <div className="flex items-center justify-between border-l-4 border-primary pl-6">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/5 rounded-lg"><FileText className="h-5 w-5 text-primary" /></div>
                    <div className="space-y-0.5 text-left">
                        <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Daftar Inventaris Terlampir</h3>
                        <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 text-left">Menampilkan {filteredAssets.length} dari {allAssets.length} aset</p>
                    </div>
                </div>
            </div>

            <Card className="border-none shadow-2xl rounded-[2.5rem] overflow-hidden bg-white/80 backdrop-blur-md">
                <CardContent className="p-0">
                    <Table>
                        <TableHeader className="bg-slate-50 h-14">
                            <TableRow className="border-none">
                                <TableHead className="pl-8 text-[10px] font-black uppercase tracking-widest">Identitas</TableHead>
                                <TableHead className="text-[10px] font-black uppercase tracking-widest">Nama Barang</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Kuantitas</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">1st Check</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">2nd Check</TableHead>
                                <TableHead className="text-center text-[10px] font-black uppercase tracking-widest">Preview</TableHead>
                                <TableHead className="pr-8 text-[10px] font-black uppercase tracking-widest">Keterangan</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {filteredAssets.length > 0 ? filteredAssets.map((asset) => {
                                const prog = auditProgress[asset.id] || {};
                                return (
                                    <TableRow key={asset.id} className="h-16 hover:bg-slate-50 transition-colors border-slate-100">
                                        <TableCell className="pl-8 font-mono font-bold text-[11px] text-primary">{asset.code}</TableCell>
                                        <TableCell>
                                            <div className="flex flex-col text-left">
                                                <span className="font-bold text-sm uppercase text-slate-900 text-left">{asset.name}</span>
                                                <span className="text-[9px] font-bold text-muted-foreground uppercase text-left">{asset.category}</span>
                                            </div>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Badge variant="outline" className="rounded-lg font-black text-[10px] bg-white border-slate-200 px-3 py-1">
                                                {String(asset.qty)} UNIT
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {prog.checked1 ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-100 mx-auto" />}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            {prog.checked2 ? <CheckCircle2 className="h-5 w-5 text-emerald-500 mx-auto" /> : <div className="h-5 w-5 rounded-full border-2 border-slate-100 mx-auto" />}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button 
                                                variant="ghost" 
                                                size="icon" 
                                                className="h-8 w-8 rounded-full text-blue-600 hover:bg-blue-50"
                                                onClick={() => handlePreviewCard(asset.id)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                        <TableCell className="pr-8 text-[10px] font-medium italic text-slate-500 truncate max-w-[150px] text-left">
                                            {prog.remark || '-'}
                                        </TableCell>
                                    </TableRow>
                                );
                            }) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground italic text-xs uppercase tracking-widest opacity-40">
                                        Tidak ada data aset terdaftar untuk filter ini.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>

        {/* Kolom Pengesahan */}
        <div className="space-y-8">
            <div className="flex items-center gap-3 border-l-4 border-emerald-500 pl-6 text-left">
                <div className="p-2 bg-emerald-50 rounded-lg"><ShieldCheck className="h-5 w-5 text-emerald-600" /></div>
                <div className="space-y-0.5 text-left">
                    <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">Kolom Pengesahan Digital</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 text-left">Ketuk kolom yang kosong untuk memberikan tanda tangan pengesahan internal unit.</p>
                </div>
            </div>

            {getSelectedGroups().map(group => (
                <div key={group.name} className="space-y-4 p-6 bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-xl text-left">
                    <p className="text-sm font-black uppercase tracking-tight text-slate-900 dark:text-white">
                        Unit Kerja: {group.name} <span className="text-[10px] font-normal text-muted-foreground">({group.departments.join(', ')})</span>
                    </p>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-6 mt-4">
                        <SignatureTile role="atasan2" group={group} />
                        <SignatureTile role="atasan1" group={group} />
                        <SignatureTile role="checker1" group={group} />
                        <SignatureTile role="checker2" group={group} />
                        <SignatureTile role="admin" group={group} />
                        <SignatureTile role="userDibuat" group={group} />
                    </div>
                </div>
            ))}
        </div>

        <div className="bg-amber-50 border border-amber-100 p-6 rounded-[2.5rem] flex items-start gap-4 shadow-sm text-left">
            <div className="p-2 bg-white rounded-xl shadow-sm"><Info className="h-5 w-5 text-amber-600" /></div>
            <div className="space-y-1">
                <p className="text-sm font-black text-slate-900 uppercase">Perhatian & Keamanan</p>
                <p className="text-xs text-slate-600 leading-relaxed font-medium">Data di atas adalah ringkasan hasil audit fisik yang tercatat di sistem. Tanda tangan yang Anda berikan bersifat permanen dan akan digunakan sebagai bukti sah dalam dokumen Berita Acara Perusahaan.</p>
            </div>
        </div>

        {/* Footer Audit */}
        <div className="text-center pt-10 opacity-30 grayscale pointer-events-none flex flex-col items-center gap-3">
            <Image src="/cgi.png" alt="Logo" width={30} height={30} />
            <p className="text-[9px] font-black uppercase tracking-[0.5em]">{companyName} - ISO 14064 COMPLIANCE</p>
        </div>

        {/* Dialog Tanda Tangan */}
        <Dialog open={isSignOpen} onOpenChange={setIsSignOpen}>
            <DialogContent className="sm:max-w-xl p-0 overflow-hidden border-none shadow-3xl bg-white rounded-[2.5rem] text-black">
                <div className="p-8 bg-slate-900 text-white border-b border-white/5 flex items-center justify-between text-left">
                    <div className="flex items-center gap-3 text-left">
                        <div className="p-2 bg-primary/20 rounded-xl"><Pencil className="h-5 w-5 text-primary" /></div>
                        <div className="text-left">
                            <DialogTitle className="uppercase font-black tracking-tight text-xl text-left text-white">Bubuhkan Tanda Tangan</DialogTitle>
                            <DialogDescription className="text-white/40 text-[9px] font-black tracking-[0.2em] uppercase text-left">{currentRole && roleLabels[currentRole]}</DialogDescription>
                        </div>
                    </div>
                    <DialogClose asChild><Button variant="ghost" size="icon" className="rounded-full hover:bg-white/10 h-10 w-10 text-white"><X className="h-5 w-5 text-white"/></Button></DialogClose>
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
                        <Button variant="ghost" onClick={() => sigPadRef.current?.clear()} className="flex-1 rounded-2xl h-12 font-black uppercase text-[10px] tracking-widest text-rose-600">Bersihkan</Button>
                        <Button onClick={handleSave} disabled={isSaving} className="flex-[2] rounded-2xl h-12 font-black uppercase tracking-widest bg-primary hover:bg-primary/90 shadow-xl shadow-primary/20 text-white">
                            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin"/> : <CheckCircle2 className="mr-2 h-4 w-4" />} Simpan Pengesahan
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>

        {previewAssetId && (
            <AssetCardPreview 
                assetId={previewAssetId} 
                isOpen={isPreviewOpen} 
                onOpenChange={setIsPreviewOpen} 
            />
        )}
    </div>
  );
}
