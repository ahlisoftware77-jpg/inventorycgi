'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, onSnapshot, query, where, QueryConstraint, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type ComputerAsset } from '@/lib/types';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { PlusCircle, FileDown, Search, Laptop, Monitor, ShieldCheck, Activity, AlertCircle, Cpu, Layers, X, Share2 } from 'lucide-react';
import ComputerAssetForm from '@/components/computer-details/computer-asset-form';
import * as XLSX from 'xlsx';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/use-auth';
import { AnimatePresence, motion } from 'framer-motion';
import React from 'react';
import ComputerAssetItem from '@/components/computer-details/computer-asset-item';
import ComputerAssetDetailCard from '@/components/computer-details/computer-asset-detail-card';
import { cn } from '@/lib/utils';

const StatCard = ({ label, value, icon: Icon, color, subText }: { label: string, value: number, icon: any, color: string, subText?: string }) => (
    <Card className="border-none shadow-xl bg-white dark:bg-slate-900 rounded-[2rem] overflow-hidden group hover:shadow-2xl transition-all duration-500">
        <CardContent className="p-6">
            <div className="flex items-center justify-between">
                <div className={cn("p-3 rounded-2xl shadow-lg", color)}>
                    <Icon className="h-6 w-6 text-white" />
                </div>
                {subText && <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full">{subText}</span>}
            </div>
            <div className="mt-5">
                <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <h3 className="text-3xl font-black text-slate-900 dark:text-white mt-1 group-hover:scale-105 transition-transform origin-left">{value}</h3>
            </div>
        </CardContent>
    </Card>
);

export default function ComputerAssetsPage() {
    const [assets, setAssets] = useState<ComputerAsset[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedId, setExpandedId] = useState<string | null>(null);
    const { toast } = useToast();
    const { user, loading: authLoading } = useAuth();

    useEffect(() => {
        if (authLoading || !user) return;
        setLoading(true);

        const queryConstraints: QueryConstraint[] = [];
        if (user.role !== 'Admin' && user.department) {
            queryConstraints.push(where('department', '==', user.department));
        }

        const q = query(collection(db, 'it_assets'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ComputerAsset));
            const filteredByAuth = user.role === 'Admin' 
                ? assetsData 
                : assetsData.filter(a => a.department === user.department);
            setAssets(filteredByAuth);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching IT assets:", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);
    
    const handleToggle = (id: string) => {
        setExpandedId(prevId => (prevId === id ? null : id));
    };

    const filteredAssets = useMemo(() => {
        return assets.filter(asset =>
            (asset.computerName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (asset.assetCode?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (asset.currentUser?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (asset.department?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
            (asset.ipAddress?.toLowerCase() || '').includes(searchTerm.toLowerCase())
        ).sort((a, b) => a.computerName.localeCompare(b.computerName));
    }, [assets, searchTerm]);
    
    const stats = useMemo(() => {
        return {
            total: assets.length,
            active: assets.filter(a => a.status === 'Digunakan').length,
            maintenance: assets.filter(a => a.status === 'Dalam Service').length,
            damaged: assets.filter(a => a.condition === 'Rusak').length
        };
    }, [assets]);
    
    const handleExport = () => {
        if (filteredAssets.length === 0) {
            toast({ variant: 'destructive', title: 'Tidak ada data untuk diekspor' });
            return;
        }

        const dataToExport = filteredAssets.map(asset => ({
            'Nama Komputer': asset.computerName, 'Kode Aset': asset.assetCode, 'Departemen': asset.department, 'Pengguna': asset.currentUser,
            'Merk/Model': asset.brandModel, 'Mainboard': asset.mainboard || '', 'CPU': asset.cpu, 'RAM': asset.ram, 'Storage': asset.storage,
            'Storage 2': asset.storage2 || '', 'GPU': asset.gpu, 'Serial Number': asset.serialNumber, 'IP Address': asset.ipAddress || '',
            'MAC Address': asset.macAddress || '', 'Sistem Operasi': asset.os, 'Lisensi Windows': asset.windowsLicense || '',
            'Lisensi Office': asset.officeLicense || '', 'Antivirus': asset.antivirus || '', 'Tanggal Pembelian': asset.purchaseDate ? asset.purchaseDate.toDate().toLocaleDateString('id-ID') : '',
            'Supplier': asset.supplier || '', 'Kondisi': asset.condition, 'Status': asset.status, 'Catatan': asset.notes || '',
        }));

        const worksheet = XLSX.utils.json_to_sheet(dataToExport);
        const workbook = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(workbook, worksheet, 'Aset IT');
        XLSX.writeFile(workbook, 'Daftar_Aset_IT.xlsx');
        toast({ title: 'Ekspor Berhasil', description: `${filteredAssets.length} data aset IT telah diekspor.` });
    };

    if (authLoading || loading) {
        return (
            <DashboardLayout>
                <div className="space-y-10">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-[2rem]" />)}
                    </div>
                    <Skeleton className="h-16 w-full rounded-[1.5rem]" />
                    <Skeleton className="h-96 w-full rounded-[3rem]" />
                </div>
            </DashboardLayout>
        );
    }

    const handleSharePage = async () => {
        const shareUrl = window.location.href;
        const shareText = `💻 Database Inventaris Aset IT - PT. China Glaze Indonesia\nTotal Unit: ${stats.total} (Aktif: ${stats.active}, Service: ${stats.maintenance}, Rusak: ${stats.damaged})\n🔗 Tautan: ${shareUrl}`;

        if (navigator.share) {
            try {
                await navigator.share({
                    title: 'Database Inventaris Aset IT PT. CGI',
                    text: shareText,
                    url: shareUrl,
                });
                toast({ title: 'Berhasil Dibagikan' });
            } catch (err: any) {
                if (err.name !== 'AbortError') {
                    await navigator.clipboard.writeText(shareUrl);
                    toast({ title: 'Tautan Disalin', description: 'Tautan halaman inventaris IT telah disalin.' });
                }
            }
        } else {
            await navigator.clipboard.writeText(shareUrl);
            toast({ title: 'Tautan Disalin', description: 'Tautan halaman inventaris IT telah disalin.' });
        }
    };

    return (
        <DashboardLayout>
            <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700 pb-20">
                {/* Hero Header */}
                <div className="relative p-10 rounded-[3rem] bg-slate-950 text-white overflow-hidden shadow-2xl ring-1 ring-white/10">
                    <div className="absolute top-0 right-0 w-1/3 h-full bg-gradient-to-l from-primary/20 to-transparent opacity-50" />
                    <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
                        <div className="space-y-3">
                            <div className="flex items-center gap-3">
                                <div className="p-4 bg-white/10 rounded-2xl backdrop-blur-md shadow-xl border border-white/5">
                                    <Laptop className="h-10 w-10 text-primary" />
                                </div>
                                <div>
                                    <h1 className="text-4xl font-black tracking-tighter uppercase italic">IT Asset Inventory</h1>
                                    <p className="text-primary/60 font-black text-[10px] uppercase tracking-[0.3em] mt-1">Digital Infrastructure Management</p>
                                </div>
                            </div>
                            <p className="text-slate-400 font-medium text-sm max-w-xl">Database pusat untuk perangkat komputer, workstation, dan lisensi digital korporat PT. China Glaze Indonesia.</p>
                        </div>
                        
                        <div className="flex flex-wrap items-center gap-3">
                            <Button onClick={handleSharePage} variant="outline" className="rounded-2xl h-14 bg-white/5 border-white/10 hover:bg-white/10 font-bold text-white px-6">
                                <Share2 className="mr-2 h-5 w-5 text-purple-400" /> Bagikan
                            </Button>
                            <Button onClick={handleExport} variant="outline" className="rounded-2xl h-14 bg-white/5 border-white/10 hover:bg-white/10 font-bold text-white px-8">
                                <FileDown className="mr-2 h-5 w-5 text-primary" /> Export Excel
                            </Button>
                            <ComputerAssetForm>
                                <Button className="rounded-2xl h-14 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-tighter shadow-2xl shadow-primary/20 px-10 transition-all active:scale-95">
                                    <PlusCircle className="mr-2 h-5 w-5" /> Tambah Aset IT
                                </Button>
                            </ComputerAssetForm>
                        </div>
                    </div>
                </div>

                {/* Stat Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <StatCard label="Total Perangkat" value={stats.total} icon={Laptop} color="bg-slate-800" subText="Unit" />
                    <StatCard label="Unit Aktif" value={stats.active} icon={Activity} color="bg-emerald-600" subText="Live" />
                    <StatCard label="Dalam Service" value={stats.maintenance} icon={ShieldCheck} color="bg-amber-500" subText="Ops" />
                    <StatCard label="Kondisi Rusak" value={stats.damaged} icon={AlertCircle} color="bg-rose-600" subText="Alert" />
                </div>

                {/* Table Area */}
                <Card className="border-none shadow-2xl rounded-[3rem] overflow-hidden bg-white/80 dark:bg-slate-900/80 backdrop-blur-md">
                    <CardHeader className="p-10 pb-0 border-b border-slate-100 dark:border-slate-800">
                        <div className="flex items-center gap-3 mb-8">
                            <Layers className="h-5 w-5 text-primary" />
                            <h3 className="text-xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Daftar Inventaris IT</h3>
                        </div>
                        <div className="uiverse-search-container max-w-2xl mb-10">
                            <div className="relative w-full px-1 flex items-center">
                                <Search className="absolute left-6 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-300 group-focus-within:text-primary transition-colors" />
                                <input
                                    placeholder="Cari berdasarkan nama komputer, kode, pengguna, departemen, atau IP..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="uiverse-search-input pl-16 pr-12 h-14 bg-white dark:bg-slate-950 font-medium text-base shadow-inner border-none rounded-[1.5rem]"
                                />
                                {searchTerm && (
                                    <button 
                                        onClick={() => setSearchTerm('')}
                                        className="absolute right-6 top-1/2 -translate-y-1/2 h-8 w-8 flex items-center justify-center rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-300 hover:text-rose-500 transition-all"
                                        title="Bersihkan Pencarian"
                                    >
                                        <X className="h-5 w-5" />
                                    </button>
                                )}
                            </div>
                        </div>
                    </CardHeader>
                    <CardContent className="p-10">
                        <div className="space-y-4">
                            {filteredAssets.length > 0 ? (
                                filteredAssets.map(asset => (
                                    <React.Fragment key={asset.id}>
                                        <div className="animate-in fade-in slide-in-from-top-2 duration-500">
                                            <ComputerAssetItem
                                                asset={asset}
                                                isExpanded={expandedId === asset.id}
                                                onToggle={() => handleToggle(asset.id)}
                                            />
                                            <AnimatePresence>
                                                {expandedId === asset.id && (
                                                    <ComputerAssetDetailCard asset={asset} />
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </React.Fragment>
                                ))
                            ) : (
                                <div className="text-center py-24 bg-slate-50/50 dark:bg-slate-800/20 rounded-[3rem] border-4 border-dashed border-slate-100 dark:border-slate-800">
                                    <Monitor className="h-16 w-16 text-slate-200 mx-auto mb-6" />
                                    <h3 className="text-xl font-black text-slate-400 uppercase tracking-[0.3em]">Tidak Ada Aset IT</h3>
                                    <p className="text-sm text-slate-400 font-medium italic mt-2">Coba ubah kata kunci pencarian Anda untuk menemukan perangkat.</p>
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </DashboardLayout>
    );
}
