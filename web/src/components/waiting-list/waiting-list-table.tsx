'use client';

import { useState, useEffect, useMemo } from 'react';
import { onSnapshot, collection, query, where, doc, updateDoc, serverTimestamp, getDoc, QueryConstraint, addDoc, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type User } from '@/lib/types';
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
import { Check, Loader2, X, Printer, Search } from 'lucide-react';
import { format } from 'date-fns';
import { id } from 'date-fns/locale';
import { Timestamp } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Input } from '../ui/input';
import { ToastAction } from '../ui/toast';

interface EnrichedAsset extends Asset {
  requesterName?: string;
  requesterDepartment?: string;
}

export default function WaitingListTable() {
  const [assets, setAssets] = useState<EnrichedAsset[]>([]);
  const [loading, setLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState<string | null>(null);
  const [selectedAsset, setSelectedAsset] = useState<EnrichedAsset | null>(null);
  const [isPrintDialogOpen, setIsPrintDialogOpen] = useState(false);
  const [printOption, setPrintOption] = useState<'fill' | 'empty'>('fill');
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const { user, loading: authLoading } = useAuth();
  const { toast } = useToast();

  const isAdmin = user?.role === 'Admin';
  const isKaryawan = user?.role === 'Karyawan';
  const canPerformActions = isAdmin || isKaryawan;


  useEffect(() => {
    if (authLoading || !user) return;
    
    setLoading(true);

    const queryConstraints: QueryConstraint[] = [
        where('status', 'in', ['waiting_mutasi', 'waiting_disposal'])
    ];
    
    if (user.role !== 'Admin' && user.department) {
        // No location filter for waiting list
    } else if (user.role !== 'Admin' && !user.department) {
        setAssets([]);
        setLoading(false);
        return;
    }
    
    const q = query(collection(db, 'assets'), ...queryConstraints);

    const unsubscribe = onSnapshot(
      q,
      async (querySnapshot) => {
        const assetsData: Asset[] = [];
        querySnapshot.forEach((doc) => {
          assetsData.push({ id: doc.id, ...doc.data() } as Asset);
        });

        const enrichedAssets = await Promise.all(
          assetsData.map(async (asset) => {
            let requesterName = 'Unknown';
            let requesterDepartment = 'Unknown';
            if (asset.requestedBy) {
              try {
                const userDoc = await getDoc(doc(db, 'users', asset.requestedBy));
                if (userDoc.exists()) {
                  const userData = userDoc.data() as User;
                  requesterName = userData.name || 'Unknown User';
                  requesterDepartment = userData.department || 'N/A';
                }
              } catch (error) {
                console.error("Error fetching requester info:", error);
              }
            }
            return { ...asset, requesterName, requesterDepartment };
          })
        );

        setAssets(enrichedAssets);
        setLoading(false);
      },
      (err) => {
        console.error('Error fetching waiting list:', err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, authLoading]);

  const filteredAssets = useMemo(() => {
    return assets.filter(asset =>
      asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      asset.location.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [assets, searchTerm]);

  const handleSelectAll = (checked: boolean | 'indeterminate') => {
    if (checked === true) {
      setSelectedAssetIds(filteredAssets.map((asset) => asset.id));
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

   const getDisposalQuantity = (notes: string | undefined): number | null => {
    if (!notes) return null;
    const match = notes.match(/Diajukan untuk disposal sebanyak (\d+) unit/);
    if (match) return parseInt(match[1], 10);
    const match2 = notes.match(/Qty:\s*(\d+)/i);
    if (match2) return parseInt(match2[1], 10);
    return null;
  };
  
  const handleAction = async (asset: Asset, action: 'approve' | 'reject') => {
    if (!user || !isAdmin) {
      toast({
        variant: 'destructive',
        title: 'Akses Ditolak',
        description: 'Anda tidak memiliki izin untuk melakukan tindakan ini.',
      });
      return;
    }
    setIsUpdating(asset.id);

    try {
        if (action === 'approve') {
            const disposalQty = getDisposalQuantity(asset.notes);
            const isPartialDisposal = disposalQty !== null && disposalQty > 0 && disposalQty < asset.qty;
            
            const handlePostApproval = () => {
                toast({
                    title: 'Pengajuan Disetujui',
                    description: `Aset "${asset.name}" telah disetujui.`,
                    action: <ToastAction altText="Cetak Berita Acara" onClick={() => handlePrintBeritaAcara([asset])}>Cetak</ToastAction>,
                });
            }

            if (isPartialDisposal) {
                // Partial disposal logic: split asset
                const batch = writeBatch(db);

                // 1. Update original asset: reduce quantity and reset status/disposal fields
                const originalAssetRef = doc(db, 'assets', asset.id);
                batch.update(originalAssetRef, {
                    qty: asset.qty - disposalQty!,
                    notes: (asset.notes || '')
                      .replace(`\nDiajukan untuk disposal sebanyak ${disposalQty} unit.`, '')
                      .replace(`Qty: ${disposalQty}`, '')
                      .trim(),
                    status: 'Aktif', // Return to active
                    requestedBy: null,
                    requestedAt: null,
                    disposalType: null,
                    disposalPrice: null,
                    disposalBuyer: null,
                    disposalCost: null,
                    disposalAccumulatedDepreciation: null,
                    disposalBookValue: null,
                    disposalPhotoURL1: null,
                    disposalPhotoURL2: null,
                    disposalPhotoURL3: null,
                    disposalPhotoURL4: null,
                });

                // 2. Create new asset for the disposed part inheriting all disposal metrics
                const newAssetData: Omit<Asset, 'id'> = {
                    ...asset,
                    qty: disposalQty!,
                    status: asset.status === 'waiting_mutasi' ? 'approved_mutasi' : 'approved_disposal',
                    code: `${asset.code}-DISPOSED-${Date.now()}`,
                    notes: `Aset ini merupakan hasil pemisahan dari ${asset.code} untuk disposal/mutasi sebanyak ${disposalQty} unit.`,
                    disposalDate: serverTimestamp(),
                    approvedBy: user.uid,
                    approvedAt: serverTimestamp(),
                    updatedAt: serverTimestamp(),
                };
                delete (newAssetData as any).id; // Ensure no ID is copied

                const newAssetRef = doc(collection(db, 'assets'));
                batch.set(newAssetRef, newAssetData);
                
                await batch.commit();
                handlePostApproval();

            } else {
                // Full disposal logic: just update status
                const newStatus = asset.status === 'waiting_mutasi' ? 'approved_mutasi' : 'approved_disposal';
                const assetRef = doc(db, 'assets', asset.id);
                await updateDoc(assetRef, {
                    status: newStatus,
                    disposalDate: serverTimestamp(),
                    approvedBy: user.uid,
                    approvedAt: serverTimestamp(),
                });
                handlePostApproval();
            }
        } else { // Reject
            const assetRef = doc(db, 'assets', asset.id);
            await updateDoc(assetRef, {
                status: 'Aktif', // Return to 'Aktif' status
                approvedBy: user.uid,
                approvedAt: serverTimestamp(), // Record rejection time
                notes: `${asset.notes || ''}\nPengajuan ditolak pada ${format(new Date(), 'PPpp', {locale: id})}`.trim()
            });
            toast({
                title: 'Pengajuan Ditolak',
                description: `Pengajuan untuk aset "${asset.name}" telah ditolak dan status dikembalikan ke Aktif.`,
            });
        }
    } catch (error) {
        console.error('Error updating asset status: ', error);
        toast({
            variant: 'destructive',
            title: 'Gagal',
            description: 'Gagal memperbarui status aset.',
        });
    } finally {
        setIsUpdating(null);
    }
  };


  const formatDate = (timestamp: any, formatStr: string = "d MMMM yyyy, HH:mm") => {
    if (!timestamp) return '-';
    const date = timestamp instanceof Timestamp ? timestamp.toDate() : new Date(timestamp);
    return format(date, formatStr, { locale: id });
  };
  
   const getStatusClass = (status: Asset['status']) => {
    switch (status) {
        case 'waiting_mutasi':
        case 'waiting_disposal':
            return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
        default:
            return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200';
    }
  }
  
  const formatCurrency = (value: number | undefined) => {
    if (typeof value !== 'number') return '-';
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value);
  };

  const openPrintDialog = (asset: EnrichedAsset) => {
    setSelectedAsset(asset);
    setIsPrintDialogOpen(true);
  };
  
  const handlePrintDisposal = () => {
    if (!selectedAsset) return;

    const asset = selectedAsset;
    const fillData = printOption === 'fill';

    const today = new Date();
    const day = today.getDate().toString();
    const month = (today.getMonth() + 1).toString();
    const year = today.getFullYear();
    
    const purchasePriceDisplay = fillData ? formatCurrency(asset.price) : '';
    const purchaseDateDisplay = fillData ? formatDate(asset.purchaseDate, 'd MMM yyyy') : '';

    const formHtml = `
  <!DOCTYPE html>
<html lang="id">
<head>
<meta charset="UTF-8">
<title>FORM DISPOSAL ASET</title>
<style>
@media print {
  @page {
    size: A4 landscape;
    margin: 10mm;
  }
  body {
    margin: 0;
    padding: 0;
    -webkit-print-color-adjust: exact;
  }
  .page {
    border: none !important;
    transform: scale(1) !important;
  }
}
body {
  font-family: 'BiauKai', Arial, sans-serif;
  font-size: 11pt;
}
.page {
  width: 297mm;
  height: 210mm;
  margin: auto;
  padding: 10mm;
  box-sizing: border-box;
  border: 1px solid #000;
}
table {
  width: 100%;
  border-collapse: collapse;
}
td, th {
  border: 1px solid #000;
  padding: 4px;
  vertical-align: top; 
  text-align: center;
}
.header {
  text-align: center;
  font-weight: bold;
  border: none;
}
.header-main {
    font-size: 16pt;
}
.header-sub {
    font-size: 14pt;
}
.no-border, .no-border td, .no-border th {
    border: none;
    padding: 0;
}
.text-center {
    text-align: center;
}
.text-right {
    text-align: right;
}
.text-left {
    text-align: left;
}
.font-sm {
    font-size: 10pt;
}
.signature-box {
    height: 80px;
}
.footer-notes {
    display: flex;
    justify-content: space-between;
    font-size: 9pt;
    margin-top: 5px;
    padding: 0 10px;
}
.footer-notes span {
  text-align: center;
  flex: 1;
}
.nested-table { width: 100%; height: 100%; }
.nested-table td { border: none; text-align: left; vertical-align: top; padding: 1px 4px; }
.nested-table td:first-child { width: auto; white-space: nowrap; }
</style>
</head>
<body>
<div class="page">
<table style="border: none; margin-bottom: 10px;">
  <tr class="no-border">
      <td class="header header-main" colspan="3">PT. CHINA GLAZE INDONESIA</td>
  </tr>
  <tr class="no-border">
      <td class="header header-sub" colspan="3">不動產/廠房及設備處理申請單</td>
  </tr>
   <tr class="no-border">
      <td class="header header-sub" colspan="3">FORM DISPOSAL ASET BANGUNAN, PABRIK, DAN MESIN</td>
  </tr>
  <tr class="no-border" style="font-size: 10pt;">
      <td style="width: 33.33%;">單位Bagian: ${asset.location || '____________________'}</td>
      <td style="width: 33.33%;" class="text-center">${day} 日/DD &nbsp;&nbsp;${month} 月/MM &nbsp;&nbsp;${year} 年/YYYY</td>
      <td style="width: 33.34%;" class="text-right">表號: 0-32-025</td>
  </tr>
</table>

<table>
  <thead>
      <tr>
          <th class="text-center" colspan="4">(保管單位填) <br> diisi Unit User</th>
          <th class="text-center" colspan="2">(財務部填) <br> diisi Unit F&A</th>
          <th class="text-center" colspan="4">(主管單位填) <br> diisi Unit Manager</th>
          <th class="text-center" colspan="2">核 准 <br> Persetujuan</th>
      </tr>
  </thead>
  <tbody>
    <tr>
      <td colspan="4" style="height: 30px; padding: 0;">
          <table class="nested-table">
              <tr><td class="text-left">名稱 Nama:</td><td class="text-left">${asset.name}</td></tr>
          </table>
      </td>
      <td colspan="2" rowspan="2" style="padding: 0;">
          <table class="nested-table">
            <tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">購入金額 Harga beli</td></tr>
            <tr><td style="text-align: center; font-weight: bold; padding-top: 4px;">${purchasePriceDisplay}</td></tr>
          </table>
      </td>
      <td colspan="4" style="height: 30px; padding: 0;">
          <table class="nested-table">
              <tr><td class="text-left" style="white-space: nowrap; text-align: left;">購入日期 Tgl pembelian:</td><td class="text-left">${purchaseDateDisplay}</td></tr>
          </table>
      </td>
      <td colspan="2" rowspan="6"></td>
    </tr>
    <tr>
      <td colspan="4" style="height: 30px; padding: 0;">
          <table class="nested-table">
              <tr><td class="text-left">編號 Nomor:</td><td class="text-left">${asset.code}</td></tr>
          </table>
      </td>
       <td colspan="4" rowspan="10" style="padding: 0;">
          <table class="nested-table">
              <tr><td class="text-left" style="text-align: left;">處理方式 Metode disposal:</td><td class="text-left">${asset.status === 'waiting_disposal' ? 'Disposal' : 'Mutasi'}</td></tr>
          </table>
      </td>
    </tr>
    <tr>
      <td colspan="4" rowspan="8" style="padding: 0;">
          <table class="nested-table">
              <tr><td class="text-left">原因 Alasan:</td><td class="text-left">${asset.condition || ''}</td></tr>
          </table>
      </td>
      <td colspan="2" style="padding: 0;">
           <table class="nested-table" style="border-collapse: collapse;">
              <tr style="border-bottom: 1px solid #000;"><td style="text-align: center;">耐用年限 Masa guna</td></tr>
              <tr><td style="text-align: center; font-weight: bold;">${asset.assetLifetime ? `${asset.assetLifetime} tahun` : ''}</td></tr>
          </table>
      </td>
    </tr>
    <tr>
      <td colspan="2" style="height: 30px; text-align: center;"></td>
    </tr>
    <tr>
      <td colspan="2" rowspan="2" style="padding: 0;">
           <table class="nested-table">
              <tr><td style="text-align: center;">已提列折舊金額<br>Nilai depresiasi</td></tr>
              <tr><td></td></tr>
          </table>
      </td>
    </tr>
    <tr>
    </tr>
    <tr>
      <td colspan="2" rowspan="2" style="height: 30px; text-align: center;"></td>
      <td rowspan="2" colspan="2">備  註<br>Keterangan</td>
    </tr>
    <tr>
    </tr>
    <tr>
      <td colspan="2" style="padding: 0;">
           <table class="nested-table">
              <tr><td style="text-align: center;">殘值 Sisa nilai aset</td></tr>
              <tr><td></td></tr>
          </table>
      </td>
      <td colspan="2" rowspan="4"></td>
    </tr>
    <tr>
      <td colspan="2" style="height: 30px; text-align: center;"></td>
    </tr>
  </tbody>
  <tfoot>
      <tr>
          <th class="text-center">副 總 <br> Vice GM</th>
          <th class="text-center">經 理 <br> Manager</th>
          <th class="text-center">課 長 <br> Sec. Head</th>
          <th class="text-center">經 辦 <br> Pelaksana</th>

          <th class="text-center">經 理 <br> Manager</th>
          <th class="text-center">經 辦 <br> Pelaksana</th>

          <th class="text-center">副 總 <br> Vice GM</th>
          <th class="text-center">經 理 <br> Manager</th>
          <th class="text-center">課 長 <br> Sec. Head</th>
          <th class="text-center">經 辦 <br> Pelaksana</th>

          <td class="signature-box" colspan="2" rowspan="2"></td>
      </tr>
      <tr>
          <td class="signature-box"></td>
          <td class="signature-box"></td>
          <td class="signature-box"></td>
          <td class="signature-box"></td>
          
          <td class="signature-box"></td>
          <td class="signature-box"></td>

          <td class="signature-box"></td>
          <td class="signature-box"></td>
          <td class="signature-box"></td>
          <td class="signature-box"></td>
      </tr>
  </tfoot>
</table>

<div class="footer-notes">
    <span>第一聯:主管單位存(白)<br>Lembar 1 disimpan unit Manager (putih),</span>
    <span>第二聯:財務部存(紅)<br>lembar 2 disimpan unit F&A (merah),</span>
    <span>第三聯:保管單位存(黃)<br>lembar 3 disimpan unit User (kuning)</span>
</div>

</div>
</body>
</html>
  `;

  const printWindow = window.open('', '', 'width=1123,height=794');
  if (printWindow) {
      printWindow.document.write(formHtml);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
          printWindow.print();
          printWindow.close();
      }, 500);
  }
  setIsPrintDialogOpen(false);
  setSelectedAsset(null);
}

const handlePrintBeritaAcara = (assetsToPrint: Asset[]) => {
  if (assetsToPrint.length === 0) {
    const selected = assets.filter(asset => selectedAssetIds.includes(asset.id));
    if (selected.length === 0) {
        toast({ variant: 'destructive', title: 'Tidak ada aset terpilih' });
        return;
    }
    assetsToPrint = selected;
  }

  const today = new Date();
  const dateStr = `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  const fromDepartment = user?.department || 'Departemen';
  const userName = user?.displayName || 'User';

  const tableRows = assetsToPrint.map(asset => `
    <tr>
      <td>${asset.code}</td>
      <td>${asset.name}</td>
      <td>${asset.qty}</td>
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
          <h2 style="text-align: center;">BERITA ACARA</h2>
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

  const isAllSelected = filteredAssets.length > 0 && selectedAssetIds.length === filteredAssets.length;
  const isIndeterminate = selectedAssetIds.length > 0 && selectedAssetIds.length < filteredAssets.length;


  return (
    <>
    <Card>
      <CardHeader>
        <CardTitle>Daftar Tunggu Aset</CardTitle>
        <CardDescription>
          Aset yang menunggu persetujuan untuk mutasi atau disposal.
        </CardDescription>
        <div className="flex justify-between items-center pt-4">
            <div className="relative flex-grow-0 sm:w-80">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                    type="search"
                    placeholder="Cari aset..."
                    className="pl-8 w-full"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                />
            </div>
             {selectedAssetIds.length > 0 && canPerformActions && (
                <Button onClick={() => handlePrintBeritaAcara([])}>
                    <Printer className="mr-2 h-4 w-4" />
                    Cetak Berita Acara ({selectedAssetIds.length})
                </Button>
            )}
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {canPerformActions && (
                <TableHead className="w-[40px]">
                  <Checkbox
                    checked={isAllSelected || isIndeterminate}
                    onCheckedChange={handleSelectAll}
                    aria-label="Pilih semua"
                  />
                </TableHead>
              )}
              <TableHead>Kode Aset</TableHead>
              <TableHead>Nama Barang</TableHead>
              <TableHead>Qty</TableHead>
              <TableHead>Lokasi</TableHead>
              <TableHead>Kondisi</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Diajukan Oleh</TableHead>
              <TableHead>Departemen</TableHead>
              <TableHead>Tanggal Pengajuan</TableHead>
              {(isAdmin || isKaryawan) && <TableHead className="text-right">Aksi</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading || authLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell colSpan={canPerformActions ? 11 : 10}>
                    <Skeleton className="h-10 w-full" />
                  </TableCell>
                </TableRow>
              ))
            ) : filteredAssets.length > 0 ? (
              filteredAssets.map((asset) => {
                const disposalQty = getDisposalQuantity(asset.notes);
                const displayQty = disposalQty !== null ? `${disposalQty} (dari ${asset.qty})` : asset.qty;

                return (
                  <TableRow key={asset.id} data-state={selectedAssetIds.includes(asset.id) && "selected"}>
                    {canPerformActions && (
                       <TableCell>
                        <Checkbox
                          checked={selectedAssetIds.includes(asset.id)}
                          onCheckedChange={(checked) => handleSelectOne(asset.id, !!checked)}
                          aria-label={`Pilih aset ${asset.name}`}
                        />
                      </TableCell>
                    )}
                    <TableCell className="font-medium">{asset.code}</TableCell>
                    <TableCell>{asset.name}</TableCell>
                    <TableCell>{displayQty}</TableCell>
                    <TableCell>{asset.location}</TableCell>
                    <TableCell>{asset.condition}</TableCell>
                    <TableCell>
                       <div className={`text-xs font-semibold py-1 px-2 rounded-full text-center inline-block capitalize ${getStatusClass(asset.status)}`}>
                          {asset.status.replace('_', ' ')}
                        </div>
                    </TableCell>
                    <TableCell>{asset.requesterName}</TableCell>
                    <TableCell>{asset.requesterDepartment}</TableCell>
                    <TableCell>{formatDate(asset.requestedAt)}</TableCell>
                    {(isAdmin || isKaryawan) && (
                      <TableCell className="text-right">
                          {isUpdating === asset.id ? (
                              <Loader2 className="h-5 w-5 animate-spin ml-auto" />
                          ) : (
                              <div className="flex gap-2 justify-end">
                                  <Button size="sm" variant="outline" onClick={() => openPrintDialog(asset)}>
                                      <Printer className="mr-2 h-4 w-4" /> Cetak Form
                                  </Button>
                                  {isAdmin && (
                                      <>
                                          <Button size="sm" variant="outline" onClick={() => handleAction(asset, 'reject')} className="text-destructive border-destructive hover:bg-destructive hover:text-destructive-foreground">
                                              <X className="mr-2 h-4 w-4" /> Tolak
                                          </Button>
                                          <Button size="sm" onClick={() => handleAction(asset, 'approve')}>
                                              <Check className="mr-2 h-4 w-4" /> Setujui
                                          </Button>
                                      </>
                                  )}
                              </div>
                          )}
                      </TableCell>
                    )}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell colSpan={canPerformActions ? 11 : 10} className="h-24 text-center">
                  Tidak ada aset dalam daftar tunggu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>

    <AlertDialog open={isPrintDialogOpen} onOpenChange={setIsPrintDialogOpen}>
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Opsi Cetak Formulir Disposal</AlertDialogTitle>
                <AlertDialogDescription>
                    Pilih apakah akan mengisi data Harga Beli dan Tanggal Pembelian secara otomatis atau mengosongkannya.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <RadioGroup defaultValue="fill" onValueChange={(value: 'fill' | 'empty') => setPrintOption(value)}>
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
                <AlertDialogAction onClick={handlePrintDisposal}>
                    <Printer className="mr-2 h-4 w-4" /> Lanjutkan Mencetak
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    </AlertDialog>
    </>
  );
}
