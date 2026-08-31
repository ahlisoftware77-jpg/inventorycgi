'use client';

import { type EnrichedAsset } from './mutation-table';
import { motion } from 'framer-motion';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { 
  ExternalLink, 
  Printer, 
  X, 
  Loader2, 
  RotateCcw, 
  FileCheck, 
  Image as ImageIcon, 
  Eye, 
  Send, 
  Check, 
  Pencil,
  Hash,
  ArrowRightLeft,
  User,
  Calendar,
  MapPin,
  Info,
  Layers,
  FileText,
  MoreVertical,
  Share2,
  CircleDollarSign
} from 'lucide-react';
import { Timestamp } from 'firebase/firestore';
import { useAuth } from '@/hooks/use-auth';
import Image from 'next/image';
import { getPreviousLocation, getMutationQuantityDisplay } from './utils';
import { useState, useMemo } from 'react';
import AssetCardPreview from '../assets/asset-card-preview';
import AssetDetailDialog from '../assets/asset-detail-dialog';
import { DocumentViewerModal } from '@/components/maintenance/document-viewer-modal';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';

interface MutationDetailCardProps {
  asset: EnrichedAsset;
  isUpdating: boolean;
  activeTab: string;
  onApproveClick: () => void;
  onRejectClick: () => void;
  onProcessClick: () => void;
  onProcessPengajuanClick: () => void;
  onPrintClick: () => void;
  onPhotoUploadClick: () => void;
  onCancelClick: () => void;
  onEditDateClick: () => void;
  onUpdateAccountingClick: () => void;
  onEditDetailsClick: () => void;
  onPrintFixAssetClick?: () => void;
}

const DetailRow = ({ label, value, emoji, className }: { label: string; value: React.ReactNode, emoji?: string, className?: string }) => (
  <div className={cn(
    "p-3 rounded-lg border text-left transition-all duration-300 bg-slate-50 dark:bg-slate-900/20 border-slate-200 dark:border-slate-800 border-b-2 border-b-slate-300 dark:border-b-slate-800/60 shadow-sm", 
    className
  )}>
    <div className="flex items-center gap-1.5 mb-1 opacity-80 text-left">
      {emoji && <span className="text-xs select-none">{emoji}</span>}
      <p className="text-[9px] uppercase font-bold text-slate-500 tracking-wider leading-none text-left">{label}</p>
    </div>
    <p className="font-bold text-xs text-slate-800 dark:text-slate-200 truncate text-left">{value || '-'}</p>
  </div>
);

const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return '-';
    try {
        return format(timestamp.toDate(), 'd MMM yyyy, HH:mm', { locale: id });
    } catch (e) {
        return '-';
    }
};

const formatCurrency = (value: number | undefined | null) => {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
};

export default function MutationDetailCard({ 
    asset, 
    isUpdating,
    activeTab,
    onApproveClick,
    onRejectClick,
    onProcessClick,
    onProcessPengajuanClick,
    onPrintClick,
    onPhotoUploadClick,
    onCancelClick,
    onEditDateClick,
    onUpdateAccountingClick,
    onEditDetailsClick,
    onPrintFixAssetClick
}: MutationDetailCardProps) {
    const { user } = useAuth();
    const { toast } = useToast();
    const [isPreviewCardOpen, setIsPreviewCardOpen] = useState(false);
    const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false);
    const [isSharing, setIsSharing] = useState(false);
    const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
    
    const isAdmin = user?.role === 'Admin';
    const isAccounting = user?.department === 'ACCOUNTING';
    const isKaryawan = user?.role === 'Karyawan';
    const isManager = user?.role === 'Manager' || user?.role === 'Section Head';

    const previousLocation = getPreviousLocation(asset.notes);
    const quantityDisplay = getMutationQuantityDisplay(asset);

    const handleShareLink = async () => {
        setIsSharing(true);
        try {
            let publicUrl = `${window.location.origin}/public/asset?assetId=${asset.id}`;
            
            if (asset.status === 'Bukan_Asset_Perusahaan') {
                publicUrl = `${window.location.origin}/public/personal?id=${asset.id}`;
            } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(asset.category)) {
                publicUrl = `${window.location.origin}/public/utility?id=${asset.id}`;
            }

            if (navigator.share) {
                try {
                    await navigator.share({
                        title: `Verifikasi Aset: ${asset.name}`,
                        text: `Detail verifikasi aset resmi PT. CGI (${asset.code})`,
                        url: publicUrl,
                    });
                    toast({ title: 'Berhasil Dibagikan' });
                } catch (shareError: any) {
                    if (shareError.name !== 'AbortError') {
                        await navigator.clipboard.writeText(publicUrl);
                        toast({ title: 'Link Disalin', description: 'Tautan verifikasi publik telah disalin.' });
                    }
                }
            } else {
                await navigator.clipboard.writeText(publicUrl);
                toast({ title: 'Link Disalin', description: 'Tautan verifikasi publik telah disalin.' });
            }
        } catch (error) {
            console.error("Error sharing link:", error);
            toast({ variant: 'destructive', title: 'Gagal Berbagi' });
        } finally {
            setIsSharing(false);
        }
    };
    
    const renderWaitingActions = () => {
        const canApprove = isAdmin || user?.permissions?.canApproveMutation;
        if (!canApprove && !isManager && !isKaryawan) return null;

        const canProcess = (isAdmin && asset.status === 'waiting_disposal') || ((isManager || isKaryawan) && asset.status !== 'karyawan_approved');

        return (
            <div className="flex flex-wrap gap-2.5 w-full sm:w-auto">
                {isUpdating ? (
                    <div className="w-full flex justify-center py-1">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); onRejectClick(); }} className="flex-1 sm:flex-none h-8 px-4 rounded-lg bg-rose-600 text-white hover:bg-rose-700 font-bold border-b-[3px] border-b-rose-800 active:translate-y-[1px] active:border-b-[1px] border-none text-[10px] uppercase tracking-wider transition-all">
                            <X className="mr-1 h-3.5 w-3.5" /> Tolak
                        </Button>
                        <Button size="sm" onClick={(e) => { e.stopPropagation(); canProcess ? onProcessClick() : onApproveClick(); }} className="flex-1 sm:flex-none h-8 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] border-none text-[10px] uppercase tracking-wider transition-all">
                            <Check className="mr-1 h-3.5 w-3.5" /> {canProcess ? 'Proses' : 'Setujui'}
                        </Button>
                    </>
                )}
            </div>
        );
    };
    
    const renderHistoryActions = () => {
        const hasProcessed = asset.notes?.includes('Proses pusat dimulai');
        const canApproveFinal = isAdmin || user?.permissions?.canApproveMutation;

        if (asset.status === 'waiting_disposal' && canApproveFinal) {
            return (
                <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                    <Button 
                        size="sm" 
                        onClick={(e) => { e.stopPropagation(); onProcessPengajuanClick(); }} 
                        className="flex-1 sm:flex-none h-8 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] border-none text-[10px] uppercase tracking-wider transition-all"
                        disabled={isUpdating || hasProcessed}
                    >
                        {isUpdating && !hasProcessed ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Send className="mr-1 h-3.5 w-3.5" />}
                        {hasProcessed ? 'Telah Diproses' : 'Proses'}
                    </Button>
                    {hasProcessed && (
                        <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onApproveClick(); }} 
                            className="flex-1 sm:flex-none h-8 px-4 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 font-bold border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] border-none text-[10px] uppercase tracking-wider transition-all"
                            disabled={isUpdating}
                        >
                            {isUpdating ? <Loader2 className="mr-1 h-3.5 w-3.5 animate-spin" /> : <Check className="mr-1 h-3.5 w-3.5" />}
                            Approve Pusat
                        </Button>
                    )}
                </div>
            );
        }

        if (asset.status === 'approved_disposal' && asset.accountingUpdatedAt) {
            return <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950/40 dark:text-emerald-300 border-none rounded-full px-3 py-1 text-[9px] font-black tracking-widest uppercase">SIKlus AKUNTANSI SELESAI</Badge>;
        }

        if (asset.status === 'approved_disposal' && isAccounting) {
            return (
                <Button size="sm" onClick={(e) => { e.stopPropagation(); onUpdateAccountingClick(); }} className="w-full sm:w-auto h-8 px-4 rounded-lg bg-blue-600 text-white hover:bg-blue-700 font-bold border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] border-none text-[10px] uppercase tracking-wider transition-all">
                    <FileCheck className="mr-1 h-3.5 w-3.5" /> Update Akuntansi
                </Button>
            );
        }
        
        return null;
    }

  const printButtonText = useMemo(() => {
    if (activeTab === 'creation') return 'Form FixAset';
    if (asset.status.includes('disposal')) return 'Form Disposal';
    if (asset.status.includes('mutasi')) return 'Form Mutasi';
    if (asset.status.includes('edit')) return 'Form Mutasi';
    if (asset.status.includes('creation')) return 'Form FixAset';
    return 'Cetak';
  }, [activeTab, asset.status]);

  const showAdditionalActions = (activeTab.includes('History') || activeTab.includes('Riwayat') || ['creation', 'mutation', 'disposal', 'edit', 'submitted', 'waiting'].includes(activeTab));

  const isCreationTab = activeTab === 'creation';

  return (
    <>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className="mx-1 mt-1 mb-4 p-4 rounded-xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-b-[4px] border-b-slate-300 dark:border-b-slate-800/80 shadow-md text-left">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <DetailRow label="Kode Transaksi" value={asset.transactionCode || 'N/A'} emoji="🔑" />
          <DetailRow label="Tipe" value={asset.status.split('_')[1]?.toUpperCase() || 'N/A'} emoji="ℹ️" />
          <DetailRow label="Unit" value={quantityDisplay} emoji="📦" />
          {previousLocation && <DetailRow label="Asal" value={previousLocation} emoji="📍" />}
          {asset.mutationTargetDepartment && <DetailRow label="Tujuan" value={asset.mutationTargetDepartment} emoji="🎯" className="border-blue-200 dark:border-blue-800/60 bg-blue-50/30 dark:bg-blue-950/20" />}
          <DetailRow label="Pemohon" value={asset.requesterName} emoji="👤" />
          <DetailRow label="Dept." value={asset.requesterDepartment} emoji="🏢" />
          <DetailRow label="PIC" value={asset.user} emoji="🧑‍💻" />
          <DetailRow label="Waktu" value={formatDate(asset.requestedAt)} emoji="📅" />
          {asset.approvedBy && <DetailRow label="Disetujui" value={asset.approverName} emoji="✅" />}
          {asset.approvedAt && <DetailRow label="Tgl ACC" value={formatDate(asset.approvedAt)} emoji="📆" />}
          
          {asset.status.includes('disposal') && (
            <div className="col-span-full mt-2 p-4 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-950/40 bg-rose-50/10 dark:bg-rose-950/10 text-left space-y-4 shadow-sm animate-in fade-in duration-300">
              <h4 className="text-xs font-black uppercase text-rose-600 tracking-wider flex items-center gap-1.5">
                <CircleDollarSign className="w-4 h-4 text-rose-600" /> Detail Finansial & Bukti Disposal
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
                <DetailRow label="Jenis Disposal" value={asset.disposalType || 'N/A'} emoji="🏷️" className="border-rose-100 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20" />
                {asset.disposalType === 'Dijual' && (
                  <>
                    <DetailRow label="Harga Jual" value={formatCurrency(asset.disposalPrice)} emoji="💰" className="border-rose-100 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20" />
                    <DetailRow label="Pembeli" value={asset.disposalBuyer} emoji="👤" className="border-rose-100 dark:border-rose-900 bg-rose-50/20 dark:bg-rose-950/20" />
                  </>
                )}
                <DetailRow label="Harga Perolehan" value={formatCurrency(asset.disposalCost)} emoji="💳" />
                <DetailRow label="Akumulasi Depresiasi" value={formatCurrency(asset.disposalAccumulatedDepreciation)} emoji="📉" />
                <DetailRow label="Nilai Buku Sisa" value={formatCurrency(asset.disposalBookValue)} emoji="📈" />
              </div>

              {(asset.disposalPhotoURL1 || asset.disposalPhotoURL2 || asset.disposalPhotoURL3 || asset.disposalPhotoURL4) && (
                <div className="space-y-2">
                  <p className="text-[10px] font-bold uppercase text-slate-500 tracking-wider flex items-center gap-1">
                    <ImageIcon className="w-3 h-3" /> Bukti Lampiran Disposal:
                    {asset.isDisposalPhotoPublic === false && (
                      <Badge variant="outline" className="text-[8px] font-bold uppercase text-amber-600 border-amber-300 ml-1">Privat</Badge>
                    )}
                  </p>
                  {(isAdmin || asset.isDisposalPhotoPublic !== false) ? (
                    <div className="flex flex-wrap gap-2">
                      {[asset.disposalPhotoURL1, asset.disposalPhotoURL2, asset.disposalPhotoURL3, asset.disposalPhotoURL4]
                        .filter(Boolean)
                        .map((url, idx) => {
                          const isPdf = url!.toLowerCase().includes('.pdf') || url!.toLowerCase().includes('/raw/') || url!.toLowerCase().includes('/files/');
                          return (
                            <div
                              key={`proof-gallery-${idx}`}
                              onClick={() => setPreviewDoc({ title: `Bukti Disposal ${idx + 1}`, url: url! })}
                              className={cn(
                                "relative w-14 h-14 rounded-xl overflow-hidden border hover:scale-105 hover:shadow-md transition-all shrink-0 cursor-pointer flex flex-col items-center justify-center p-1 text-center group",
                                isPdf ? "border-rose-200 dark:border-rose-900/60 bg-rose-50/70 dark:bg-rose-950/30" : "border-slate-200 dark:border-slate-800"
                              )}
                              title={isPdf ? `Dokumen PDF ${idx + 1}` : `Bukti Foto ${idx + 1}`}
                            >
                              {isPdf ? (
                                <>
                                  <FileText className="w-5 h-5 text-rose-500 group-hover:scale-110 transition-transform" />
                                  <span className="text-[7px] font-black uppercase text-rose-600 tracking-tighter">PDF {idx + 1}</span>
                                </>
                              ) : (
                                <Image src={url!} alt={`Bukti Disposal ${idx + 1}`} fill className="object-cover" />
                              )}
                            </div>
                          );
                        })
                      }
                    </div>
                  ) : (
                    <p className="text-[10px] font-medium text-slate-400 italic">Visibilitas foto bukti disposal ini diatur privat oleh Admin.</p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Document Print Status Info */}
          <div className="col-span-full mt-1 p-3 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/10 space-y-2">
            <h4 className="text-[10px] font-black uppercase text-slate-500 tracking-wider flex items-center gap-1.5 select-none">
              🖨️ Status Cetak Dokumen
            </h4>
            <div className="flex flex-wrap gap-x-6 gap-y-2">
              {/* Form Mutasi Status */}
              {(asset.status.includes('mutasi') || asset.status.includes('edit')) && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    asset.isPrintedMutation ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  )} />
                  <span className="font-bold text-slate-600 dark:text-slate-400">Form Mutasi:</span>
                  <span className={cn(
                    "font-black uppercase text-[10px] tracking-wider",
                    asset.isPrintedMutation ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                  )}>
                    {asset.isPrintedMutation ? "Sudah di-print" : "Belum di-print"}
                  </span>
                </div>
              )}
              {/* Form Disposal Status */}
              {asset.status.includes('disposal') && (
                <div className="flex items-center gap-2 text-xs">
                  <span className={cn(
                    "h-2 w-2 rounded-full",
                    asset.isPrintedDisposal ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                  )} />
                  <span className="font-bold text-slate-600 dark:text-slate-400">Form Disposal:</span>
                  <span className={cn(
                    "font-black uppercase text-[10px] tracking-wider",
                    asset.isPrintedDisposal ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                  )}>
                    {asset.isPrintedDisposal ? "Sudah di-print" : "Belum di-print"}
                  </span>
                </div>
              )}
              {/* Form Fix Asset Status */}
              <div className="flex items-center gap-2 text-xs">
                <span className={cn(
                  "h-2 w-2 rounded-full",
                  asset.isPrintedFixAsset ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
                )} />
                <span className="font-bold text-slate-600 dark:text-slate-400">Form Fix Asset:</span>
                <span className={cn(
                  "font-black uppercase text-[10px] tracking-wider",
                  asset.isPrintedFixAsset ? "text-emerald-600 dark:text-emerald-400" : "text-slate-500"
                )}>
                  {asset.isPrintedFixAsset ? "Sudah di-print" : "Belum di-print"}
                </span>
              </div>
            </div>
          </div>

          <DetailBlockSimple label="Catatan Sistem" value={asset.notes?.split('---')[1]?.trim() || asset.notes} emoji="📝" className="col-span-full bg-slate-50 dark:bg-slate-900/10 italic py-2" />
        </div>
        
        <div className="mt-5 pt-4 border-t border-slate-100 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="w-full sm:w-auto">
                {activeTab === 'waiting' ? renderWaitingActions() : renderHistoryActions()}
            </div>
            
            <div className="flex flex-wrap items-center gap-2.5 w-full sm:w-auto">
                <Button size="sm" onClick={(e) => { e.stopPropagation(); handleShareLink(); }} disabled={isSharing} className="h-8 px-4 rounded-lg bg-sky-600 hover:bg-sky-700 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-sky-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex-1 sm:flex-none">
                    {isSharing ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <Share2 className="mr-1.5 h-3.5 w-3.5" />}
                    Link
                </Button>

                {showAdditionalActions && (
                    <>
                        <Button 
                            size="sm" 
                            onClick={(e) => { e.stopPropagation(); onPrintClick(); }} 
                            className={cn(
                                "h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider border-b-[3px] active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex-1 sm:flex-none",
                                isCreationTab ? "bg-blue-600 hover:bg-blue-700 text-white border-b-blue-800" : "bg-indigo-600 hover:bg-indigo-700 text-white border-b-indigo-800"
                            )}
                        >
                            <Printer className="mr-1.5 h-3.5 w-3.5" /> {printButtonText}
                        </Button>

                        {/* Button Form Fix Asset in Mutation Tab */}
                        {activeTab === 'mutation' && (
                            <Button 
                                size="sm" 
                                onClick={(e) => { e.stopPropagation(); onPrintFixAssetClick?.(); }} 
                                className="h-8 px-4 rounded-lg text-[10px] font-bold uppercase tracking-wider border-b-[3px] border-b-emerald-800 bg-emerald-600 hover:bg-emerald-700 text-white active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex-1 sm:flex-none"
                                title="Cetak Form Fix Asset"
                            >
                                <Printer className="mr-1.5 h-3.5 w-3.5" /> Form FixAsset
                            </Button>
                        )}

                        {(isAdmin || user?.permissions?.canEditAsset) && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button variant="ghost" size="sm" className="h-8 w-8 rounded-lg bg-slate-700 hover:bg-slate-800 text-white flex items-center justify-center border-b-[3px] border-b-slate-900 active:translate-y-[1px] active:border-b-[1px] border-none transition-all">
                                        <MoreVertical className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="w-48 rounded-xl">
                                    <DropdownMenuLabel className="text-[9px] font-black uppercase tracking-widest text-muted-foreground/70">Opsi Lanjutan</DropdownMenuLabel>
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onPhotoUploadClick(); }} className="cursor-pointer gap-2 text-xs">
                                        <ImageIcon className="h-3.5 w-3.5" /> Foto Serah Terima
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEditDateClick(); }} className="cursor-pointer gap-2 text-xs">
                                        <Pencil className="h-3.5 w-3.5" /> Edit Tanggal
                                    </DropdownMenuItem>
                                    <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onEditDetailsClick(); }} className="cursor-pointer gap-2 text-xs">
                                        <Pencil className="h-3.5 w-3.5" /> Edit Keterangan & Rincian
                                    </DropdownMenuItem>
                                    {(asset.status.startsWith('approved_') || asset.status === 'Aktif_creation') && isAdmin && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem onSelect={(e) => { e.preventDefault(); onCancelClick(); }} className="cursor-pointer gap-2 text-xs text-rose-600">
                                                <RotateCcw className="h-3.5 w-3.5" /> Batalkan ACC
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </>
                )}

                <Button size="sm" onClick={(e) => { e.stopPropagation(); setIsPreviewCardOpen(true); }} className="h-8 px-4 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-purple-800 active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex-1 sm:flex-none">
                    <Eye className="mr-1.5 h-3.5 w-3.5" /> Kartu
                </Button>

                <Button size="sm" onClick={(e) => { e.stopPropagation(); setIsDetailDialogOpen(true); }} className="h-8 px-4 rounded-lg bg-slate-900 hover:bg-black text-white font-bold text-[10px] uppercase tracking-wider border-b-[3px] border-b-black active:translate-y-[1px] active:border-b-[1px] border-none transition-all flex-1 sm:flex-none dark:bg-slate-800 dark:hover:bg-slate-700 dark:border-b-slate-950">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Full
                </Button>
            </div>
        </div>
      </div>
    </motion.div>
    {asset && (
        <AssetCardPreview
            assetId={asset.id}
            isOpen={isPreviewCardOpen}
            onOpenChange={setIsPreviewCardOpen}
        />
    )}
     {asset && (
        <AssetDetailDialog
            assetId={asset.id}
            isOpen={isDetailDialogOpen}
            onOpenChange={setIsDetailDialogOpen}
        />
     )}
     {previewDoc && (
        <DocumentViewerModal
            isOpen={!!previewDoc}
            onOpenChange={(open) => !open && setPreviewDoc(null)}
            title={previewDoc.title}
            url={previewDoc.url}
        />
     )}
    </>
  );
}

function DetailBlockSimple({ label, value, emoji, className }: { label: string, value: any, emoji?: string, className?: string }) {
    return (
        <div className={cn("p-3 rounded-lg border text-left bg-slate-50 dark:bg-slate-900/10 border-slate-200 dark:border-slate-800 border-b-2 border-b-slate-300 dark:border-b-slate-850 shadow-sm", className)}>
            <div className="flex items-center gap-1.5 mb-1 opacity-80 text-left">
                {emoji && <span className="text-xs select-none">{emoji}</span>}
                <p className="text-[8px] font-bold uppercase tracking-wider text-slate-500 text-left">{label}</p>
            </div>
            <div className="text-[11px] font-bold leading-normal text-slate-800 dark:text-slate-200 line-clamp-3 text-left">{value || '-'}</div>
        </div>
    );
}
