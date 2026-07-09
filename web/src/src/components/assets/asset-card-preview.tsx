

'use client';

import { useState, useEffect, useRef } from 'react';
import { doc, onSnapshot, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset, type AssetStatus } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '../ui/skeleton';
import { ArrowLeft, Printer, Download, Share2 } from 'lucide-react';
import Image from 'next/image';
import { format, formatDistanceToNowStrict } from 'date-fns';
import { id } from 'date-fns/locale';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import QRCode from 'qrcode';
import html2canvas from 'html2canvas';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../ui/dialog';

interface AssetCardPreviewProps {
  assetId: string;
}

const DetailItem = ({ label, value }: { label: string; value: React.ReactNode }) => (
  <div>
    <p className="text-sm text-gray-500 print:text-black">{label}</p>
    <p className="text-base font-bold text-black">{value || '-'}</p>
  </div>
);

const getStamp = (status: AssetStatus) => {
    let text = '';
    let stampColor = '';

    const isPerbaikan = status === 'Perlu Perbaikan' || status === 'Sedang Dalam Perbaikan';

    if (status === 'Aktif' || status === 'approved_creation') {
        text = 'APPROVED';
        stampColor = '#22c55e'; // green-600
    } else if (status === 'approved_disposal') {
        text = 'DISPOSAL';
        stampColor = '#ef4444'; // red-600
    } else if (status === 'approved_mutasi') {
        text = 'MUTASI';
        stampColor = '#3b82f6'; // blue-600
    } else if (isPerbaikan) {
        text = 'DALAM PERBAIKAN';
        stampColor = '#f97316'; // orange-500
    } else {
        return null;
    }

    const style = { '--stamp-color': stampColor, '--stamp-border-color': stampColor } as React.CSSProperties;

    return (
        <div className="stamp-terminator" style={style}>
            {text}
        </div>
    );
};

export default function AssetCardPreview({ assetId }: AssetCardPreviewProps) {
  const [asset, setAsset] = useState<Asset | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [canShare, setCanShare] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const backUrl = `/assets/${assetId}?${searchParams.toString()}`;

  useEffect(() => {
    setLoading(true);
    const docRef = doc(db, 'assets', assetId);
    
    if (navigator.share) {
      setCanShare(true);
    }

    const unsubscribe = onSnapshot(docRef, async (docSnap) => {
      if (docSnap.exists()) {
        const assetData = { id: docSnap.id, ...docSnap.data() } as Asset;
        setAsset(assetData);
        setError(null);
        try {
            const qrData = JSON.stringify({ assetId: assetData.id, code: assetData.code });
            const url = await QRCode.toDataURL(qrData);
            setQrCodeUrl(url);
        } catch (err) {
            console.error('Failed to generate QR Code', err);
        }
      } else {
        setError('Aset tidak ditemukan.');
        setAsset(null);
      }
      setLoading(false);
    }, (err) => {
      console.error("Error fetching asset details:", err);
      setError('Gagal memuat detail aset.');
      setLoading(false);
    });

    return () => unsubscribe();
  }, [assetId]);

  const handleDownload = async () => {
    const cardElement = cardRef.current;
    if (!cardElement || !asset) return;

    try {
      const canvas = await html2canvas(cardElement, { 
          useCORS: true, 
          scale: 2,
          onclone: (document) => {
            const clonedCard = document.querySelector('.asset-card-print-area');
            if (clonedCard) {
                clonedCard.classList.add('print-mode');
            }
          }
      });
      const link = document.createElement('a');
      link.download = `kartu-aset-${asset.code || asset.id}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error('Failed to download card:', err);
      toast({
        variant: 'destructive',
        title: 'Gagal Mengunduh',
        description: 'Terjadi kesalahan saat membuat file gambar.',
      });
    }
  };

  const handleShare = async () => {
    const cardElement = cardRef.current;
    if (!cardElement || !asset || !navigator.share) return;

    try {
      const canvas = await html2canvas(cardElement, { useCORS: true, scale: 2 });
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
      if (!blob) throw new Error('Gagal membuat gambar untuk dibagikan.');

      const file = new File([blob], `kartu-aset-${asset.code}.png`, { type: 'image/png' });

      await navigator.share({
        title: `Kartu Aset: ${asset.name}`,
        text: `Berikut adalah detail untuk aset ${asset.code}`,
        files: [file],
      });
    } catch (err: any) {
       if (err.name !== 'AbortError') {
          console.error('Failed to share card:', err);
          toast({
            variant: 'destructive',
            title: 'Gagal Berbagi',
            description: err.message || 'Terjadi kesalahan saat mencoba berbagi.',
          });
       }
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const formatDate = (timestamp: Timestamp | undefined | null) => {
    if (!timestamp) return '-';
    try {
      return format(timestamp.toDate(), "d MMM yyyy", { locale: id });
    } catch (e) {
      return '-';
    }
  };

  const calculateAssetAge = (purchaseDate: Timestamp | null | undefined) => {
    if (!purchaseDate) return null;
    return formatDistanceToNowStrict(purchaseDate.toDate(), { locale: id, unit: 'year' });
  };

  if (loading) {
    return (
      <div className="p-4 md:p-8 bg-gray-100">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="w-full h-[80vh]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        <p>{error}</p>
        <Button asChild variant="link" className="mt-4">
            <Link href="/assets">
                <ArrowLeft className="mr-2 h-4 w-4" /> Kembali ke Daftar Aset
            </Link>
        </Button>
      </div>
    );
  }

  if (!asset) return null;

  const disposalPhotos = [
    asset.disposalPhotoURL1,
    asset.disposalPhotoURL2,
    asset.disposalPhotoURL3,
    asset.disposalPhotoURL4,
  ].filter(Boolean) as string[];
  const galleryImages = [asset.photoURL, asset.photoURL2, asset.photoURL3, asset.photoURL4].filter(Boolean);

  return (
    <>
    <style jsx global>{`
        body {
            font-family: 'Poppins', sans-serif;
        }
        .stamp-terminator {
            margin-top: 1rem;
            padding: 0.5rem 1.5rem;
            font-size: 1.25rem;
            font-weight: 700;
            color: white;
            border-width: 3px;
            border-style: solid;
            border-color: var(--stamp-border-color, #ccc);
            background-color: var(--stamp-color);
            border-radius: 9999px / 50%;
            transform: rotate(-10deg);
            text-shadow: 1px 1px 3px rgba(0,0,0,0.4);
            box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1);
            display: inline-block;
        }
        @media print {
            @page {
              size: A4;
              margin: 1cm;
            }
            body {
              -webkit-print-color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
            body * {
                visibility: hidden;
            }
            .asset-card-print-area, .asset-card-print-area * {
                visibility: visible;
            }
            .asset-card-print-area {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                height: 100%;
                margin: 0;
                padding: 0;
                border: none !important;
                box-shadow: none !important;
                background-color: white !important;
            }
            .stamp-terminator {
                background-color: var(--stamp-color) !important;
            }
        }
    `}</style>
    <div className="p-4 md:p-8 bg-gray-100 print:bg-white">
        <div className="flex items-center justify-between mb-4 print:hidden">
            <Button asChild size="sm">
            <Link href={backUrl}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Kembali ke Detail
            </Link>
            </Button>
            <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handlePrint}><Printer className="mr-2 h-4 w-4"/> Print</Button>
                <Button size="sm" variant="outline" onClick={handleDownload}><Download className="mr-2 h-4 w-4"/> Unduh</Button>
                {canShare && <Button size="sm" variant="outline" onClick={handleShare}><Share2 className="mr-2 h-4 w-4"/> Bagikan</Button>}
            </div>
        </div>

        <div ref={cardRef} className="asset-card-print-area bg-white p-8 rounded-lg shadow-lg max-w-4xl mx-auto border relative overflow-hidden">
            
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center opacity-10 pointer-events-none z-0">
                <Image
                    src="https://res.cloudinary.com/dbguqcgeq/image/upload/v1759996987/logo_CGI_with_text_kozoo8.png"
                    alt="Watermark"
                    width={500}
                    height={500}
                    className="object-contain"
                />
            </div>

            {/* Content, make it relative to appear above watermark */}
            <div className="relative z-10">
                {/* Header */}
                <div className="flex justify-between items-start pb-6 border-b">
                    <div>
                        <h2 className="text-3xl font-bold text-gray-800">{asset.name}</h2>
                        <p className="text-lg text-gray-500">{asset.code}</p>
                        {getStamp(asset.status)}
                    </div>
                    <div className="flex flex-col items-center">
                        {qrCodeUrl && <Image src={qrCodeUrl} alt="QR Code" width={150} height={150} />}
                        <p className="text-[17px] font-bold text-gray-800 mt-1">PT. China Glaze Indonesia</p>
                    </div>
                </div>

                {/* Main Info Grid */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-6 mt-6">
                    <DetailItem label="Kategori" value={asset.category} />
                    <DetailItem label="Pusat Biaya" value={asset.costCenter} />
                    <DetailItem label="Lokasi" value={asset.location} />
                    <DetailItem label="User" value={asset.user} />
                    <DetailItem label="Tanggal Pembelian" value={formatDate(asset.purchaseDate)} />
                    <DetailItem label="Masa Pakai" value={calculateAssetAge(asset.purchaseDate)} />
                    <DetailItem label="Supplier" value={asset.supplier} />
                    <DetailItem label="Brand" value={asset.brand} />
                    <DetailItem label="Kondisi" value={asset.condition} />
                    <DetailItem label="Status" value={asset.status.replace(/_/g, ' ')} />
                </div>

                {/* Kelengkapan */}
                <div className="mt-6 pt-6 border-t">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Kelengkapan</h3>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-x-8 gap-y-4 text-sm">
                        {(asset.accessory1 || asset.accessory2 || asset.accessory3 || asset.accessory4) ? (
                            <>
                                {asset.accessory1 && <p>• {asset.accessory1}</p>}
                                {asset.accessory2 && <p>• {asset.accessory2}</p>}
                                {asset.accessory3 && <p>• {asset.accessory3}</p>}
                                {asset.accessory4 && <p>• {asset.accessory4}</p>}
                            </>
                        ) : <p className="text-gray-500">Tidak ada kelengkapan.</p>}
                    </div>
                </div>

                {/* Galeri, Catatan, Info Dokumen */}
                <div className="grid md:grid-cols-2 gap-8 mt-6 pt-6 border-t">
                    {(galleryImages.length > 0 || disposalPhotos.length > 0) && (
                        <div>
                            {galleryImages.length > 0 && (
                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Galeri Foto Aset</h3>
                                    <div className="flex flex-wrap gap-2">
                                        {galleryImages.map((url, index) => (
                                            <Image key={index} src={url!} alt={`Foto aset ${index + 1}`} width={100} height={100} className="rounded-md object-cover border" />
                                        ))}
                                    </div>
                                </div>
                            )}
                             {disposalPhotos.length > 0 && (
                                <div className="mt-4">
                                    <h3 className="text-lg font-semibold text-red-600 mb-2">Foto Bukti Disposal</h3>
                                     <div className="flex flex-wrap gap-2">
                                        {disposalPhotos.map((photoUrl, index) => (
                                            <Dialog key={index}>
                                                <DialogTrigger asChild>
                                                    <div className="relative group cursor-pointer">
                                                        <Image src={photoUrl} alt={`Foto bukti disposal ${index + 1}`} width={100} height={100} className="rounded-md object-cover border-2 border-red-500" />
                                                    </div>
                                                </DialogTrigger>
                                                <DialogContent className="h-[90vh] bg-transparent border-none shadow-none flex items-center justify-center">
                                                    <DialogHeader className="sr-only">
                                                        <DialogTitle>Foto Bukti Disposal: {asset.name}</DialogTitle>
                                                        <DialogDescription>Melihat foto bukti disposal untuk aset {asset.name}.</DialogDescription>
                                                    </DialogHeader>
                                                    <Image src={photoUrl} alt="Foto bukti disposal" width={800} height={800} className="object-contain max-w-full max-h-full" />
                                                </DialogContent>
                                            </Dialog>
                                        ))}
                                     </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Catatan</h3>
                        <p className="text-sm text-gray-600 whitespace-pre-wrap">{asset.notes || 'Tidak ada catatan.'}</p>
                    </div>
                    <div>
                        <h3 className="text-lg font-semibold text-gray-700 mb-2">Info Dokumen</h3>
                        <div className="space-y-3">
                            <DetailItem label="Nomor PR" value={asset.prNumber} />
                            <DetailItem label="No. Inspeksi" value={asset.inspectionNumber} />
                            <DetailItem label="No. Inspeksi Proyek" value={asset.projectInspectionNumber} />
                            <DetailItem label="Tgl Inspeksi Proyek" value={formatDate(asset.projectInspectionDate)} />
                        </div>
                    </div>
                </div>

                {/* Signature Area */}
                <div className="mt-16 pt-8 flex justify-around text-center print:mt-8">
                    <div className="w-1/3 mx-4">
                        <div className="h-20"></div>
                        <p className="border-t border-gray-400 pt-1 font-semibold text-sm">Atasan</p>
                    </div>
                    <div className="w-1/3 mx-4">
                        <div className="h-20"></div>
                        <p className="border-t border-gray-400 pt-1 font-semibold text-sm">Admin</p>
                    </div>
                    <div className="w-1/3 mx-4">
                        <div className="h-20"></div>
                        <p className="border-t border-gray-400 pt-1 font-semibold text-sm">Karyawan</p>
                    </div>
                </div>
            </div>
        </div>
    </div>
    </>
  );
}
