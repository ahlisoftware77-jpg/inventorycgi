'use client';

/**
 * @fileOverview Kartu Detail Maintenance.
 * Respects granular permissions for managing evidence, signature, edit, and delete.
 * Includes ticket and problem report synchronization logic.
 * Penambahan: Fitur hapus lampiran email (.msg).
 */

import { type MaintenanceSchedule, type Asset } from '@/lib/types';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { 
  Edit, 
  Trash2, 
  Image as ImageIcon, 
  FileSignature,
  User, 
  Building, 
  Info, 
  Wrench, 
  Calendar, 
  Hash, 
  ClipboardCheck,
  History,
  Tag,
  ExternalLink,
  AlertCircle,
  Pencil,
  Play,
  Check,
  Clock,
  Loader2,
  Package,
  Mail,
  Download,
  X,
  CircleDollarSign,
  FileText
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import MaintenanceScheduleForm from './maintenance-schedule-form';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { doc, deleteDoc, getDoc, serverTimestamp, writeBatch, arrayUnion, Timestamp, addDoc, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { recycleDocument } from '@/lib/recycle-bin-utils';
import { db } from '@/lib/firebase/config';
import MaintenancePhotoDialog from './maintenance-photo-dialog';
import ItemReplacementDialog from './item-replacement-dialog';
import AssetDetailDialog from '@/components/assets/asset-detail-dialog';
import { DocumentViewerModal } from './document-viewer-modal';

// Fungsi helper untuk memaksa PDF dibuka sebagai tipe JPG langsung dari Cloudinary (menghindari plugin Adobe)
const openDocumentPreview = (url: string) => {
  const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/') || url.toLowerCase().includes('/files/');
  
  if (url.toLowerCase().includes('/image/upload/')) {
    // Menghapus query params jika ada
    const cleanUrl = url.split('?')[0];
    let imageUrl = cleanUrl;
    if (cleanUrl.toLowerCase().endsWith('.pdf')) {
      imageUrl = cleanUrl.replace(/\.pdf$/i, '.jpg');
    } else {
      imageUrl = cleanUrl + '.jpg';
    }
    window.open(imageUrl, '_blank');
  } else if (isPdf) {
    // Fallback ke Google Docs Viewer jika berupa raw upload
    const viewerUrl = `https://docs.google.com/viewer?url=${encodeURIComponent(url)}&embedded=true`;
    window.open(viewerUrl, '_blank');
  } else {
    window.open(url, '_blank');
  }
};
import Image from 'next/image';
import { cn } from '@/lib/utils';
import Link from 'next/link';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { errorEmitter } from '@/lib/firebase/error-emitter';
import { FirestorePermissionError, type SecurityRuleContext } from '@/lib/firebase/errors';
import { Badge } from '@/components/ui/badge';

interface MaintenanceDetailCardProps {
  schedule: MaintenanceSchedule;
}

const DetailTile = ({ label, value, emoji, className }: { label: string; value: React.ReactNode, emoji?: string, className?: string }) => (
  <div className={cn(
    "p-3 rounded-xl bg-slate-50 dark:bg-slate-900/20 border border-slate-200 dark:border-slate-800 border-b-2 border-b-slate-300 dark:border-b-slate-800/60 shadow-sm transition-all duration-300", 
    className
  )}>
    <div className="flex items-center gap-1.5 mb-1 opacity-60">
      {emoji && <span className="text-xs select-none">{emoji}</span>}
      <div className="text-[9px] uppercase font-bold text-muted-foreground tracking-wider leading-none text-left">{label}</div>
    </div>
    <div className="font-bold text-xs text-slate-800 dark:text-slate-200 break-words leading-normal text-left">{value || '-'}</div>
  </div>
);

const SectionLabel = ({ title, emoji }: { title: string, emoji: string }) => (
    <div className="col-span-full mt-4 mb-1.5 first:mt-0 flex items-center gap-1.5">
        <span className="text-xs select-none">{emoji}</span>
        <p className="text-[9px] font-black text-slate-500 uppercase tracking-wider">{title}</p>
        <div className="h-[1px] flex-1 bg-slate-100 dark:bg-slate-800 ml-2" />
    </div>
);

export default function MaintenanceDetailCard({ schedule }: MaintenanceDetailCardProps) {
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [isConfirmDeleteEmailOpen, setIsConfirmDeleteEmailOpen] = useState(false);
  const [isDeletingSignature, setIsDeletingSignature] = useState(false);
  const [isConfirmDeleteSigOpen, setIsConfirmDeleteSigOpen] = useState(false);

  const handleDeleteSignature = async () => {
    if (!schedule || !user) return;
    setIsDeletingSignature(true);
    const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
    
    try {
        await updateDoc(scheduleRef, {
            completionPhotoURL: null,
            updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'system_logs'), {
          type: 'MAINTENANCE',
          action: 'DELETE_SIGNATURE',
          description: `Menghapus bukti tanda tangan dari pengerjaan "${schedule.type}" aset ${schedule.assetCode}`,
          targetId: schedule.id,
          targetCode: schedule.assetCode,
          targetName: schedule.assetName,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Tanda Tangan Dihapus', description: 'Tanda tangan penyelesaian telah dihapus dan dibuka kembali.' });
        setIsConfirmDeleteSigOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus Tanda Tangan' });
    } finally {
        setIsDeletingSignature(false);
    }
  };
  
  const [isDeleting, setIsDeleting] = useState(false);
  const [isDeletingEmail, setIsDeletingEmail] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);
  const [isPhotoUploadOpen, setIsPhotoUploadOpen] = useState(false);
  const [isItemReplacementOpen, setIsItemReplacementOpen] = useState(false);
  const [photoUploadType, setPhotoUploadType] = useState<'progress' | 'completion' | 'email'>('progress');
  const [previewDoc, setPreviewDoc] = useState<{ title: string; url: string } | null>(null);
  const [isAssetDetailOpen, setIsAssetDetailOpen] = useState(false);
  const [assetDetails, setAssetDetails] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(true);
  const { user } = useAuth();
  const { toast } = useToast();

  useEffect(() => {
    async function fetchAssetDetails() {
      if (!schedule.assetId) {
        setLoadingAsset(false);
        return;
      }
      setLoadingAsset(true);
      try {
        const assetRef = doc(db, 'assets', schedule.assetId);
        const docSnap = await getDoc(assetRef);
        if (docSnap.exists()) {
          setAssetDetails(docSnap.data() as Asset);
        }
      } catch (error) {
        console.error("Failed to fetch asset details:", error);
      } finally {
        setLoadingAsset(false);
      }
    }
    fetchAssetDetails();
  }, [schedule.assetId]);

  const isAdmin = user?.role === 'Admin';
  
  // Granular Permissions
  const canManageEvidence = isAdmin || user?.permissions?.canManageMaintenanceEvidence;
  const canManageSignature = isAdmin || user?.permissions?.canManageMaintenanceSignature;
  const canEditMaintenance = isAdmin || user?.permissions?.canEditMaintenance;
  const canDeleteMaintenance = isAdmin || user?.permissions?.canDeleteMaintenance;
  
  const handleUpdateStatus = async (newStatus: MaintenanceSchedule['status']) => {
    setIsUpdatingStatus(true);
    const batch = writeBatch(db);
    
    const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
    batch.update(scheduleRef, {
        status: newStatus,
        updatedAt: serverTimestamp()
    });

    if (schedule.ticketId) {
        const ticketRef = doc(db, 'helpdesk_tickets', schedule.ticketId);
        
        let helpdeskStatus: 'Menunggu' | 'Diproses' | 'Selesai' = 'Menunggu';
        if (newStatus === 'Diproses') helpdeskStatus = 'Diproses';
        if (newStatus === 'Selesai') helpdeskStatus = 'Selesai';
        
        batch.update(ticketRef, {
            status: helpdeskStatus,
            updates: arrayUnion({
                note: `[SISTEM] Status pengerjaan pemeliharaan aset telah diubah menjadi "${newStatus.toUpperCase()}".`,
                updatedBy: user?.uid || 'SYSTEM',
                updaterName: 'MODUL MAINTENANCE',
                updatedAt: Timestamp.now(),
            })
        });

        // GENERATE EMAIL FOR OUTLOOK (WHEN STARTING WORK)
        if (newStatus === 'Diproses') {
            try {
                const ticketSnap = await getDoc(ticketRef);
                if (ticketSnap.exists()) {
                    const ticketData = ticketSnap.data();
                    const ticketDept = ticketData.reporterDept || 'IT';
                    const ticketDesc = ticketData.description || 'Blocked Login';
                    const adminName = user?.displayName || user?.email?.split('@')[0] || 'Yadi';

                    const qReports = query(collection(db, 'it_problem_reports'), where('ticketId', '==', schedule.ticketId));
                    const reportSnap = await getDocs(qReports);
                    let reportId = '';
                    if (!reportSnap.empty) {
                        reportId = reportSnap.docs[0].id;
                    }

                    const reportLink = reportId 
                        ? `${window.location.origin}/public/it-report?id=${reportId}`
                        : `${window.location.origin}/public/it-report?ticketId=${schedule.ticketId}&problem=${encodeURIComponent(ticketDesc)}&dept=${encodeURIComponent(ticketDept)}`;

                    const subject = `Update Data Glaze System ${ticketDept}`;
                    const body = `Dear Mr. Kiros,
 
Please correct this PO with the following details:

1.	${reportLink} (${ticketDesc})


Thank you,
 
Rgds,
${adminName}`;

                    const mailtoUrl = `mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
                    window.location.href = mailtoUrl;
                }
            } catch (err) {
                console.error("Failed to generate Outlook email:", err);
            }
        }

        // REAKSI SINKRONISASI TANGGAL SELESAI PADA FORM 0-32-028
        if (newStatus === 'Selesai') {
          const qReports = query(collection(db, 'it_problem_reports'), where('ticketId', '==', schedule.ticketId));
          const reportSnap = await getDocs(qReports);
          if (!reportSnap.empty) {
              const todayFmt = format(new Date(), 'yyyy-MM-dd');
              reportSnap.forEach(reportDoc => {
                  updateDoc(doc(db, 'it_problem_reports', reportDoc.id), {
                      solutionDate: todayFmt
                  });
              });
          }
        }
    }
    
    // Log Activity
    batch.set(doc(collection(db, 'system_logs')), {
        type: 'MAINTENANCE',
        action: 'UPDATE_STATUS',
        description: `Mengubah status maintenance "${schedule.type}" menjadi ${newStatus.toUpperCase()} untuk aset ${schedule.assetCode}`,
        targetId: schedule.id,
        targetCode: schedule.assetCode,
        targetName: schedule.assetName,
        userId: user?.uid,
        userName: user?.displayName || user?.email,
        userDept: user?.department || 'N/A',
        timestamp: serverTimestamp(),
    });

    batch.commit()
        .then(() => {
            toast({ title: 'Status Diperbarui', description: `Jadwal dan Tiket IT kini berstatus ${newStatus}.` });
        })
        .catch(async (serverError) => {
            const permissionError = new FirestorePermissionError({
                path: scheduleRef.path,
                operation: 'update',
                requestResourceData: { status: newStatus },
            } satisfies SecurityRuleContext);
            errorEmitter.emit('permission-error', permissionError);
        })
        .finally(() => {
            setIsUpdatingStatus(false);
        });
  };

  const handleDeleteSchedule = async () => {
    if (!user) return;
    setIsDeleting(true);
    try {
      await recycleDocument(
        db,
        'maintenance_schedules',
        schedule.id,
        user.uid,
        user.displayName || user.email || 'Admin',
        user.department || 'N/A'
      );
      toast({ title: 'Berhasil Dihapus', description: `Jadwal maintenance "${schedule.assetName}" telah dipindahkan ke Tempat Sampah.` });
      setIsConfirmOpen(false);
    } catch (error) {
      console.error("Error deleting schedule:", error);
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: 'Terjadi kesalahan saat memindahkan ke Tempat Sampah.' });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteEmailProof = async () => {
    if (!schedule || !user) return;
    setIsDeletingEmail(true);
    const scheduleRef = doc(db, 'maintenance_schedules', schedule.id);
    
    try {
        await updateDoc(scheduleRef, {
            emailProofURL: null,
            emailProofName: null,
            updatedAt: serverTimestamp()
        });

        await addDoc(collection(db, 'system_logs'), {
          type: 'MAINTENANCE',
          action: 'DELETE_EMAIL_PROOF',
          description: `Menghapus lampiran diskusi email dari pengerjaan "${schedule.type}" aset ${schedule.assetCode}`,
          targetId: schedule.id,
          targetCode: schedule.assetCode,
          targetName: schedule.assetName,
          userId: user.uid,
          userName: user.displayName || user.email,
          userDept: user.department || 'N/A',
          timestamp: serverTimestamp(),
        });

        toast({ title: 'Lampiran Dihapus' });
        setIsConfirmDeleteEmailOpen(false);
    } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Menghapus' });
    } finally {
        setIsDeletingEmail(false);
    }
  };

  return (
    <>
    <motion.div
      initial={{ height: 0, opacity: 0 }}
      animate={{ height: 'auto', opacity: 1 }}
      exit={{ height: 0, opacity: 0 }}
      transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
      className="overflow-hidden"
    >
      <div className="mx-1 mt-2 mb-8 p-5 sm:p-6 rounded-2xl bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 border-b-[5px] border-b-slate-300 dark:border-b-slate-800/80 shadow-md relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
            <Wrench className="w-64 h-64 rotate-12" />
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4 relative z-10 text-black">
          <SectionLabel title="Rincian Pengerjaan" emoji="⚙️" />
          <DetailTile label="No. Maintenance" value={schedule.code || (`MNT-${schedule.id.slice(0, 6).toUpperCase()}`)} emoji="🔖" className="font-mono text-emerald-700 dark:text-emerald-400 font-bold bg-emerald-50/50 dark:bg-emerald-950/20" />
          <DetailTile label="Tipe Maintenance" value={schedule.type} emoji="🔧" className="col-span-2 bg-primary/[0.02]" />
          <DetailTile label="Teknisi Penanggung Jawab" value={schedule.technician} emoji="👤" className="col-span-2" />
          <DetailTile label="Status Akhir" value={schedule.status} emoji="📊" />

          <SectionLabel title="Identitas Barang" emoji="🏷️" />
          <DetailTile label="Nama Aset" value={schedule.assetName} emoji="📦" className="col-span-2" />
          <DetailTile label="Kode Aset" value={schedule.assetCode} emoji="🔑" className="font-mono text-primary" />
          <DetailTile label="User Aktif" value={schedule.assetUser || assetDetails?.user || '-'} emoji="👤" />
          <DetailTile label="Departemen" value={schedule.department || '-'} emoji="🏢" />
          <DetailTile label="Lokasi Fisik" value={assetDetails?.location || '-'} emoji="📍" />
          <DetailTile label="Tanggal Jadwal" value={format(schedule.scheduledDate.toDate(), 'd MMMM yyyy', { locale: id })} emoji="📅" />

          <SectionLabel title="Instruksi & Catatan" emoji="📝" />
          <DetailTile label="Keterangan Tambahan" value={schedule.notes} className="col-span-full border-dashed bg-muted/20 italic" />

          {schedule.partsUsed && schedule.partsUsed.length > 0 && (
            <>
                <SectionLabel title="Barang / Part Diganti" emoji="🔄" />
                <div className="col-span-full space-y-2">
                    {schedule.partsUsed.map((part, idx) => (
                        <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-sm animate-in fade-in slide-in-from-left-2 duration-300">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-emerald-50 rounded-lg"><Package className="h-4 w-4 text-emerald-600" /></div>
                                <div className="flex flex-col">
                                    <span className="text-xs font-black uppercase text-slate-900 dark:text-white">{part.name}</span>
                                    <span className="text-[9px] font-bold text-muted-foreground uppercase">{part.code}</span>
                                </div>
                            </div>
                            <div className="flex items-center gap-4">
                                <div className="text-right">
                                    <span className="text-[9px] font-black uppercase text-muted-foreground block">Jumlah</span>
                                    <Badge className="bg-primary/10 text-primary border-none text-[10px] font-black">{part.quantity} {part.unit}</Badge>
                                </div>
                                <span className="text-[9px] font-bold text-slate-400 uppercase hidden sm:block">{format(part.addedAt.toDate(), 'HH:mm')}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </>
          )}

          {/* Biaya & Keabsahan Servis Section */}
          {((schedule.repairCost !== undefined && schedule.repairCost !== null && schedule.repairCost > 0) || schedule.vendorName) && (
            <>
              <SectionLabel title="Rincian Biaya & Pelaksana" emoji="💰" />
              <div className="col-span-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                <DetailTile 
                  label="Vendor / Pelaksana" 
                  value={schedule.vendorName || '-'} 
                  emoji="🏢" 
                />
                <DetailTile 
                  label="Biaya Perbaikan" 
                  value={schedule.repairCost ? new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(schedule.repairCost) : '-'} 
                  emoji="💵" 
                  className="text-emerald-700 dark:text-emerald-400 font-bold"
                />
              </div>
            </>
          )}

          <SectionLabel title="Dokumentasi & Komunikasi" emoji="📷" />

          {/* Dokumen Keabsahan Servis: Invoice, SPK, BAST */}
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-4 mb-3">
            {/* Kuitansi / Invoice */}
            {schedule.repairInvoicePhotoURL ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 border border-emerald-200 dark:border-emerald-800 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">Kuitansi / Invoice</p>
                    <span className="text-xs font-black text-emerald-600 dark:text-emerald-400 text-left">Ada Dokumen</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl font-bold text-xs text-emerald-600 hover:bg-emerald-50 shrink-0" onClick={() => setPreviewDoc({ title: 'Kuitansi / Invoice', url: schedule.repairInvoicePhotoURL! })}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Lihat
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">Kuitansi / Invoice</p>
                    <span className="text-xs font-bold text-slate-400 text-left">Belum Ada</span>
                  </div>
                </div>
              </div>
            )}

            {/* Surat Perintah Kerja (SPK) */}
            {schedule.spkPhotoURL ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 border border-blue-200 dark:border-blue-800 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">Surat Perintah Kerja (SPK)</p>
                    <span className="text-xs font-black text-blue-600 dark:text-blue-400 text-left">Ada Dokumen</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl font-bold text-xs text-blue-600 hover:bg-blue-50 shrink-0" onClick={() => setPreviewDoc({ title: 'Surat Perintah Kerja (SPK)', url: schedule.spkPhotoURL! })}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Lihat
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">Surat Perintah Kerja (SPK)</p>
                    <span className="text-xs font-bold text-slate-400 text-left">Belum Ada</span>
                  </div>
                </div>
              </div>
            )}

            {/* BAST Perbaikan */}
            {schedule.bastPhotoURL ? (
              <div className="p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex items-center justify-between group">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 border border-indigo-200 dark:border-indigo-800 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">BAST Perbaikan</p>
                    <span className="text-xs font-black text-indigo-600 dark:text-indigo-400 text-left">Ada Dokumen</span>
                  </div>
                </div>
                <Button size="sm" variant="ghost" className="h-8 px-3 rounded-xl font-bold text-xs text-indigo-600 hover:bg-indigo-50 shrink-0" onClick={() => setPreviewDoc({ title: 'BAST Perbaikan', url: schedule.bastPhotoURL! })}>
                  <ExternalLink className="h-3.5 w-3.5 mr-1" /> Lihat
                </Button>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-900/30 border border-slate-200 dark:border-slate-800/60 shadow-sm flex items-center justify-between opacity-60">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 shrink-0">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 text-left">
                    <p className="text-[9px] uppercase font-bold text-muted-foreground leading-none mb-1 text-left">BAST Perbaikan</p>
                    <span className="text-xs font-bold text-slate-400 text-left">Belum Ada</span>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="col-span-full grid grid-cols-1 sm:grid-cols-3 gap-6 mt-2">
            <div className="space-y-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 text-left">
                    <div className="h-1.5 w-1.5 rounded-full bg-blue-500" /> Bukti Pengerjaan
                </div>
                {schedule.progressPhotoURLs && schedule.progressPhotoURLs.length > 0 ? (
                    <div className="grid grid-cols-2 gap-2">
                        {schedule.progressPhotoURLs.map((url, idx) => {
                          const isPdf = url.toLowerCase().includes('.pdf') || url.toLowerCase().includes('/raw/');
                          return isPdf ? (
                            <div
                              key={idx}
                              className="relative aspect-video rounded-xl overflow-hidden border shadow-sm bg-white group cursor-pointer flex flex-col items-center justify-center gap-1 hover:bg-slate-50 transition-colors"
                              onClick={() => setPreviewDoc({ title: `Bukti Pengerjaan ${idx + 1}`, url })}
                            >
                              <FileText className="h-8 w-8 text-rose-500" />
                              <span className="text-[9px] font-black uppercase text-slate-500">PDF</span>
                              <span className="text-[8px] text-slate-400">Bukti {idx + 1}</span>
                              <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 text-rose-600">
                                  <ExternalLink className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div key={idx} className="relative aspect-video rounded-xl overflow-hidden border shadow-sm bg-white group cursor-pointer" onClick={() => setPreviewDoc({ title: `Bukti Pengerjaan ${idx + 1}`, url })}>
                                <Image src={url} alt={`Bukti Pengerjaan ${idx + 1}`} fill className="object-cover transition-transform group-hover:scale-105" />
                                <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                    <Button variant="secondary" size="icon" className="rounded-full h-8 w-8 text-black">
                                        <ExternalLink className="h-4 w-4" />
                                    </Button>
                                </div>
                            </div>
                          );
                        })}
                    </div>
                ) : schedule.progressPhotoURL ? (
                    (() => {
                      const isPdf = schedule.progressPhotoURL.toLowerCase().includes('.pdf') || schedule.progressPhotoURL.toLowerCase().includes('/raw/');
                      return isPdf ? (
                        <div
                          className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white group cursor-pointer flex flex-col items-center justify-center gap-2 hover:bg-slate-50 transition-colors"
                          onClick={() => setPreviewDoc({ title: 'Bukti Pengerjaan', url: schedule.progressPhotoURL })}
                        >
                          <FileText className="h-10 w-10 text-rose-500" />
                          <span className="text-[10px] font-black uppercase text-slate-500">Dokumen PDF</span>
                          <div className="absolute inset-0 bg-rose-500/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="rounded-full font-black text-[10px] uppercase text-rose-700">Buka PDF</Button>
                          </div>
                        </div>
                      ) : (
                        <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white group cursor-pointer" onClick={() => setPreviewDoc({ title: 'Bukti Pengerjaan', url: schedule.progressPhotoURL })}>
                          <Image src={schedule.progressPhotoURL} alt="Bukti Pengerjaan" fill className="object-cover transition-transform group-hover:scale-105" />
                          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="rounded-full font-black text-[10px] uppercase text-black">Buka Foto</Button>
                          </div>
                        </div>
                      );
                    })()
                ) : (
                    <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-50">
                        <ImageIcon className="h-8 w-8" />
                        <p className="text-[9px] font-black uppercase">Belum Ada Foto</p>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 text-left">
                    <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" /> Tanda Tangan Digital
                </div>
                {schedule.completionPhotoURL ? (
                    <div className="relative aspect-video rounded-2xl overflow-hidden border-2 border-white shadow-lg bg-white group cursor-pointer" onClick={() => setPreviewDoc({ title: 'Bukti Tanda Tangan', url: schedule.completionPhotoURL })}>
                        {canManageEvidence && (
                            <Button 
                                onClick={(e) => { e.stopPropagation(); setIsConfirmDeleteSigOpen(true); }}
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 rounded-full bg-white/90 text-rose-500 hover:text-rose-700 hover:bg-rose-100 shadow-md transition-all z-20"
                                title="Hapus Tanda Tangan"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <Image src={schedule.completionPhotoURL} alt="Bukti Tanda Tangan" fill className="object-contain p-4" />
                        <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                            <Button variant="secondary" size="sm" className="rounded-full font-black text-[10px] uppercase text-black">Buka Detail</Button>
                        </div>
                    </div>
                ) : (
                    <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-50">
                        <FileSignature className="h-8 w-8" />
                        <p className="text-[9px] font-black uppercase">Menunggu Pengesahan</p>
                    </div>
                )}
            </div>

            <div className="space-y-3">
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest flex items-center gap-2 text-left">
                    <div className="h-1.5 w-1.5 rounded-full bg-slate-900" /> Diskusi Email (.msg)
                </div>
                {schedule.emailProofURL ? (
                    <div className="relative p-5 aspect-video rounded-2xl bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center justify-center gap-3 text-center shadow-lg group hover:border-primary transition-all">
                        {canManageEvidence && (
                            <Button 
                                onClick={(e) => { e.stopPropagation(); setIsConfirmDeleteEmailOpen(true); }}
                                variant="ghost" 
                                size="icon" 
                                className="absolute top-2 right-2 h-8 w-8 rounded-full text-slate-300 hover:text-rose-600 hover:bg-rose-50 transition-all opacity-0 group-hover:opacity-100"
                            >
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        )}
                        <div className="p-3 bg-primary/10 rounded-2xl group-hover:scale-110 transition-transform">
                            <Mail className="h-8 w-8 text-primary" />
                        </div>
                        <div className="min-w-0 w-full px-4">
                            <p className="text-[10px] font-black uppercase text-slate-900 dark:text-white truncate">{schedule.emailProofName || 'Outlook_Mail.msg'}</p>
                            <p className="text-[8px] font-bold text-muted-foreground mt-0.5 uppercase">Tersimpan di Cloud</p>
                        </div>
                        <Button asChild size="sm" variant="secondary" className="rounded-full h-8 px-5 font-black text-[9px] uppercase tracking-widest shadow-sm">
                            <a href={schedule.emailProofURL} target="_blank" rel="noopener noreferrer">
                                <Download className="h-3 w-3 mr-1.5" /> Unduh Dokumen
                            </a>
                        </Button>
                    </div>
                ) : (
                    <div className="aspect-video rounded-2xl bg-slate-100 dark:bg-slate-800 border-2 border-dashed flex flex-col items-center justify-center gap-2 opacity-50">
                        <Mail className="h-8 w-8" />
                        <p className="text-[9px] font-black uppercase">Belum Ada Email</p>
                    </div>
                )}
            </div>
          </div>
        </div>

        <div className="mt-8 pt-6 border-t border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="flex flex-wrap gap-2.5">
                {canManageSignature && schedule.status === 'Dijadwalkan' && (
                    <Button 
                        size="sm" 
                        onClick={() => handleUpdateStatus('Diproses')} 
                        disabled={isUpdatingStatus}
                        className="rounded-xl h-9 bg-amber-500 hover:bg-amber-600 text-white font-bold px-4 border-b-[3px] border-b-amber-700 active:translate-y-[1px] active:border-b-[1px] transition-all"
                    >
                        {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Play className="mr-1.5 h-3.5 w-3.5" />}
                        Mulai Pengerjaan
                    </Button>
                )}

                {canManageSignature && schedule.status === 'Diproses' && (
                    <>
                        <Button 
                            size="sm" 
                            onClick={() => setIsItemReplacementOpen(true)}
                            className="rounded-xl h-9 bg-blue-600 hover:bg-blue-700 text-white font-bold px-4 border-b-[3px] border-b-blue-800 active:translate-y-[1px] active:border-b-[1px] transition-all"
                        >
                            <Package className="mr-1.5 h-3.5 w-3.5" /> Ganti Barang / Part
                        </Button>
                        <Button 
                            size="sm" 
                            onClick={() => { setPhotoUploadType('completion'); setIsPhotoUploadOpen(true); }} 
                            disabled={isUpdatingStatus}
                            className="rounded-xl h-9 bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 border-b-[3px] border-b-emerald-800 active:translate-y-[1px] active:border-b-[1px] transition-all"
                        >
                            {isUpdatingStatus ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-1.5 h-3.5 w-3.5" />}
                            Selesaikan Tugas
                        </Button>
                    </>
                )}

                {canManageEvidence && (
                  <>
                    <Button size="sm" onClick={() => { setPhotoUploadType('progress'); setIsPhotoUploadOpen(true); }} className="rounded-xl h-9 bg-sky-600 hover:bg-sky-700 text-white font-bold px-4 border-b-[3px] border-b-sky-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                        <ImageIcon className="mr-1.5 h-3.5 w-3.5" /> Bukti Pengerjaan
                    </Button>
                    <Button size="sm" onClick={() => { setPhotoUploadType('email'); setIsPhotoUploadOpen(true); }} className="rounded-xl h-9 bg-violet-600 hover:bg-violet-700 text-white font-bold px-4 border-b-[3px] border-b-violet-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                        <Mail className="mr-1.5 h-3.5 w-3.5" /> Upload Email (.msg)
                    </Button>
                  </>
                )}
                
                {canManageSignature && (
                  <Button size="sm" onClick={() => { setPhotoUploadType('completion'); setIsPhotoUploadOpen(true); }} className={cn("rounded-xl h-9 bg-teal-600 hover:bg-teal-700 text-white font-bold px-4 border-b-[3px] border-b-teal-800 active:translate-y-[1px] active:border-b-[1px] transition-all", schedule.status === 'Diproses' && "animate-pulse")}>
                      <Pencil className="mr-1.5 h-3.5 w-3.5" /> {schedule.status === 'Selesai' ? 'Edit Dokumen & TTD' : 'Selesaikan & Tanda Tangan'}
                  </Button>
                )}
            </div>

            <div className="flex flex-wrap items-center gap-2.5">
                {canEditMaintenance && (
                    <MaintenanceScheduleForm schedule={schedule}>
                        <Button size="sm" className="rounded-xl h-9 bg-amber-600 hover:bg-amber-700 text-white font-bold px-4 border-b-[3px] border-b-amber-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                            <Edit className="mr-1.5 h-3.5 w-3.5" /> Edit
                        </Button>
                    </MaintenanceScheduleForm>
                )}
                
                {canDeleteMaintenance && (
                    <Button size="sm" onClick={() => setIsConfirmOpen(true)} className="rounded-xl h-9 bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 border-b-[3px] border-b-rose-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                        <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Hapus
                    </Button>
                )}
                
                <Button size="sm" onClick={() => setIsAssetDetailOpen(true)} className="rounded-xl h-9 bg-primary hover:bg-primary/90 font-bold px-4 text-white border-b-[3px] border-b-indigo-800 active:translate-y-[1px] active:border-b-[1px] transition-all">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5" /> Detail Lengkap Aset
                </Button>
            </div>
        </div>
      </div>
    </motion.div>
    
    <AlertDialog open={isConfirmOpen} onOpenChange={setIsConfirmOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white dark:bg-slate-950">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-4 text-left text-black">
                <AlertCircle className="h-8 w-8 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-black">Hapus Jadwal?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-left">
              Tindakan ini akan menghapus catatan jadwal pemeliharaan secara permanen. Data histori tidak dapat dikembalikan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={isDeleting} className="rounded-xl h-12 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSchedule} disabled={isDeleting} className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest shadow-xl shadow-rose-600/20">
              {isDeleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Hapus Permanen
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmDeleteEmailOpen} onOpenChange={setIsConfirmDeleteEmailOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white dark:bg-slate-950">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-4 text-left text-black">
                <Mail className="h-8 w-8 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-black">Hapus Lampiran Email?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-left">
              Apakah Anda yakin ingin menghapus lampiran diskusi email dari pengerjaan ini? Tindakan ini tidak dapat dibatalkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={isDeletingEmail} className="rounded-xl h-12 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEmailProof} disabled={isDeletingEmail} className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-white shadow-xl shadow-rose-600/20">
              {isDeletingEmail ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Ya, Hapus File
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={isConfirmDeleteSigOpen} onOpenChange={setIsConfirmDeleteSigOpen}>
        <AlertDialogContent className="rounded-[2rem] border-none shadow-2xl p-8 bg-white dark:bg-slate-950">
          <AlertDialogHeader>
            <div className="p-3 bg-rose-50 rounded-2xl w-fit mb-4 text-left text-black">
                <FileSignature className="h-8 w-8 text-rose-600" />
            </div>
            <AlertDialogTitle className="text-2xl font-black uppercase tracking-tight text-left text-black">Hapus Tanda Tangan Terkunci?</AlertDialogTitle>
            <AlertDialogDescription className="text-slate-500 font-medium text-left">
              Apakah Anda yakin ingin menghapus bukti tanda tangan penyelesaian ini? Setelah dihapus, status pengesahan akan dibuka kembali agar tanda tangan baru dapat dibubuhkan.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="mt-8 gap-3">
            <AlertDialogCancel disabled={isDeletingSignature} className="rounded-xl h-12 font-bold">Batal</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteSignature} disabled={isDeletingSignature} className="rounded-xl h-12 bg-rose-600 hover:bg-rose-700 font-black uppercase tracking-widest text-white shadow-xl shadow-rose-600/20">
              {isDeletingSignature ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
              Ya, Hapus Tanda Tangan
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <MaintenancePhotoDialog
        schedule={schedule}
        photoType={photoUploadType}
        isOpen={isPhotoUploadOpen}
        onOpenChange={setIsPhotoUploadOpen}
      />

      <ItemReplacementDialog
        schedule={schedule}
        isOpen={isItemReplacementOpen}
        onOpenChange={setIsItemReplacementOpen}
      />

      <AssetDetailDialog 
        assetId={schedule.assetId}
        isOpen={isAssetDetailOpen}
        onOpenChange={setIsAssetDetailOpen}
      />

      <DocumentViewerModal
        isOpen={!!previewDoc}
        onOpenChange={(open) => !open && setPreviewDoc(null)}
        title={previewDoc?.title || ''}
        url={previewDoc?.url || ''}
      />
    </>
  );
}

function DetailBlockSimple({ label, value, icon: Icon, className }: { label: string, value: any, icon?: any, className?: string }) {
    return (
        <div className={cn("p-2 rounded-xl border text-left", className)}>
            <div className="flex items-center gap-1.5 mb-0.5 opacity-60">
                {Icon && <Icon className="w-3 h-3 text-primary" />}
                <p className="text-[8px] font-black uppercase tracking-widest text-left">{label}</p>
            </div>
            <div className="text-[11px] font-bold leading-tight line-clamp-2 text-left">{value || '-'}</div>
        </div>
    );
}
