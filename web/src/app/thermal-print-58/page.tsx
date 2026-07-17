'use client';

/**
 * @fileOverview Halaman optimasi pencetakan label thermal 58mm.
 * Sekarang diatur untuk menggunakan Tautan Verifikasi Publik sebagai data QR Code.
 */

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { doc, onSnapshot, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Printer, Share2, Download, RefreshCw, Type, Text, CaseSensitive, Loader2, Rows3, Columns3, MessageSquare, Eye, RotateCw, Copy, QrCode, User, MapPin, Bold } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/dashboard/layout';
import { printCanvasBluetooth } from '@/lib/bluetooth-printer';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

function ThermalPrintPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');

  const [allSearchableAssets, setAllSearchableAssets] = useState<Asset[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [asset2, setAsset2] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  const [textToPrint, setTextToPrint] = useState('Pilih Aset');
  const [textToPrint2, setTextToPrint2] = useState('');

  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const [suggestions2, setSuggestions2] = useState<Asset[]>([]);
  
  // State formatting
  const [fontFamily, setFontFamily] = useState('Roboto Mono, monospace');
  const [fontSize, setFontSize] = useState(100);
  const [isBold, setIsBold] = useState(true);
  const [canShare, setCanShare] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [canvasUrl2, setCanvasUrl2] = useState<string | null>(null);
  const [printType, setPrintType] = useState<'text' | 'barcode' | 'qrcode' | 'template'>('text');
  const [barcodeWidth, setBarcodeWidth] = useState(2.8);
  const [isRotated, setIsRotated] = useState(false);
  const [showBarcodeDetails, setShowBarcodeDetails] = useState(true);
  const [isSplitLayout, setIsSplitLayout] = useState(false);
  const [templateCodeFontSize, setTemplateCodeFontSize] = useState(65);
  const [templateNameFontSize, setTemplateNameFontSize] = useState(33);
  const [templateQrSize, setTemplateQrSize] = useState(155);
  const [isDottedQr, setIsDottedQr] = useState(true);

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }

    const fetchAllAssets = async () => {
        try {
            const q = query(collection(db, 'assets'));
            const snapshot = await getDocs(q);
            const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
            setAllSearchableAssets(assetsData);
        } catch (error) {
            console.error("Failed to fetch assets for search:", error);
        }
    };
    fetchAllAssets();
  }, []);

  useEffect(() => {
    if (assetId) {
      setLoadingAsset(true);
      const docRef = doc(db, 'assets', assetId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const fetchedAsset = { id: docSnap.id, ...docSnap.data() } as Asset;
          setAsset(fetchedAsset);
          setTextToPrint(fetchedAsset.code);
          setPrintType('qrcode'); // Default to QR Code for assets
        } else {
          setAsset(null);
          setTextToPrint('Aset tidak ditemukan');
        }
        setLoadingAsset(false);
      });
      return () => unsubscribe();
    }
  }, [assetId]);

    const handleInputChange = (value: string, inputIndex: 1 | 2) => {
        if (inputIndex === 1) {
            setTextToPrint(value);
            if (value.trim()) {
                const filtered = allSearchableAssets
                    .filter(a => 
                        a.code.toLowerCase().includes(value.toLowerCase().trim()) ||
                        a.name.toLowerCase().includes(value.toLowerCase().trim())
                    )
                    .slice(0, 10);
                setSuggestions(filtered);
            } else {
                setSuggestions([]);
            }
        } else {
            setTextToPrint2(value);
            if (value.trim()) {
                const filtered = allSearchableAssets
                    .filter(a => 
                        a.code.toLowerCase().includes(value.toLowerCase().trim()) ||
                        a.name.toLowerCase().includes(value.toLowerCase().trim())
                    )
                    .slice(0, 10);
                setSuggestions2(filtered);
            } else {
                setSuggestions2([]);
            }
        }
    };

    const handleSuggestionClick = (selectedAsset: Asset, inputIndex: 1 | 2) => {
        if (inputIndex === 1) {
            setTextToPrint(selectedAsset.code);
            setAsset(selectedAsset);
            setSuggestions([]);
        } else {
            setTextToPrint2(selectedAsset.code);
            setAsset2(selectedAsset);
            setSuggestions2([]);
        }
    };

    useEffect(() => {
        if (!textToPrint) { setAsset(null); return; }
        const found = allSearchableAssets.find(a => a.code === textToPrint);
        setAsset(found || null);
    }, [textToPrint, allSearchableAssets]);

    useEffect(() => {
        if (!textToPrint2) { setAsset2(null); return; }
        const found = allSearchableAssets.find(a => a.code === textToPrint2);
        setAsset2(found || null);
    }, [textToPrint2, allSearchableAssets]);

  const drawQRCodeOnCtx = async (ctx: CanvasRenderingContext2D, text: string, x: number, y: number, size: number, dotted: boolean) => {
    const qr = QRCode.create(text, { errorCorrectionLevel: 'H' });
    const modules = qr.modules;
    const moduleCount = modules.size;
    const cellSize = size / moduleCount;

    ctx.fillStyle = 'black';

    for (let row = 0; row < moduleCount; row++) {
        for (let col = 0; col < moduleCount; col++) {
            if (modules.get(row, col)) {
                const centerStart = Math.floor(moduleCount / 2) - 2;
                const centerEnd = Math.ceil(moduleCount / 2) + 1;
                if (row >= centerStart && row <= centerEnd && col >= centerStart && col <= centerEnd) {
                    continue;
                }

                const isTopLeftEye = row < 7 && col < 7;
                const isTopRightEye = row < 7 && col >= moduleCount - 7;
                const isBottomLeftEye = row >= moduleCount - 7 && col < 7;

                if (dotted && !isTopLeftEye && !isTopRightEye && !isBottomLeftEye) {
                    const dotRadius = cellSize * 0.48;
                    ctx.beginPath();
                    ctx.arc(
                        x + col * cellSize + cellSize / 2,
                        y + row * cellSize + cellSize / 2,
                        dotRadius,
                        0,
                        Math.PI * 2
                    );
                    ctx.fill();
                } else {
                    const cornerRadius = (isTopLeftEye || isTopRightEye || isBottomLeftEye) ? cellSize * 0.2 : 0;
                    const mx = x + col * cellSize;
                    const my = y + row * cellSize;
                    
                    if (cornerRadius > 0) {
                        ctx.beginPath();
                        ctx.moveTo(mx + cornerRadius, my);
                        ctx.lineTo(mx + cellSize - cornerRadius, my);
                        ctx.quadraticCurveTo(mx + cellSize, my, mx + cellSize, my + cornerRadius);
                        ctx.lineTo(mx + cellSize, my + cellSize - cornerRadius);
                        ctx.quadraticCurveTo(mx + cellSize, my + cellSize, mx + cellSize - cornerRadius, my + cellSize);
                        ctx.lineTo(mx + cornerRadius, my + cellSize);
                        ctx.quadraticCurveTo(mx, my + cellSize, mx, my + cellSize - cornerRadius);
                        ctx.lineTo(mx, my + cornerRadius);
                        ctx.quadraticCurveTo(mx, my, mx + cornerRadius, my);
                        ctx.fill();
                    } else {
                        ctx.fillRect(mx, my, cellSize, cellSize);
                    }
                }
            }
        }
    }

    const logoSize = size * 0.22;
    const logoX = x + (size - logoSize) / 2;
    const logoY = y + (size - logoSize) / 2;

    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.arc(x + size / 2, y + size / 2, (logoSize / 2) + 2, 0, Math.PI * 2);
    ctx.fill();

    const logoImg = new Image();
    logoImg.src = '/cgi.png';
    try {
        await logoImg.decode();
        ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize);
    } catch (e) { console.error("Logo error", e); }
  };

  useEffect(() => {
    const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines: string[] = [];

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            if (metrics.width > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        let currentY = y - ((lines.length - 1) * lineHeight / 2);
        for (let i = 0; i < lines.length; i++) {
            context.fillText(lines[i].trim(), x, currentY);
            currentY += lineHeight;
        }
    }
    
    const generateCanvas = async (text: string, assetForDetails: Asset | null, setCanvasFunc: (url: string | null) => void) => {
        setCanvasFunc(null);
        if (!text && printType !== 'template') return;

        try {
            let finalCanvas: HTMLCanvasElement;

            if (printType === 'barcode' || printType === 'qrcode') {
                const codeCanvas = document.createElement('canvas');
                const ctxCode = codeCanvas.getContext('2d');
                
                if (printType === 'barcode') {
                    JsBarcode(codeCanvas, text, { format: "CODE128", height: 60, width: barcodeWidth, displayValue: false, margin: 0 });
                } else {
                    const qrSize = 210;
                    codeCanvas.width = qrSize;
                    codeCanvas.height = qrSize;
                    if (ctxCode) {
                        ctxCode.fillStyle = 'white';
                        ctxCode.fillRect(0, 0, qrSize, qrSize);
                        let qrData = assetForDetails ? `${window.location.origin}/public/asset?assetId=${assetForDetails.id}` : text;
                        if (assetForDetails) {
                            if (assetForDetails.status === 'Bukan_Asset_Perusahaan') {
                                qrData = `${window.location.origin}/public/personal?id=${assetForDetails.id}`;
                            } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(assetForDetails.category)) {
                                qrData = `${window.location.origin}/public/utility?id=${assetForDetails.id}`;
                            }
                        }
                        await drawQRCodeOnCtx(ctxCode, qrData, 0, 0, qrSize, isDottedQr);
                    }
                }

                if (showBarcodeDetails && assetForDetails) {
                    const tempDiv = document.createElement('div');
                    tempDiv.style.cssText = 'display:inline-block; padding:10px; background:white; text-align:center; width:219px;';

                    let verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/asset?id=${assetForDetails.id.slice(0, 6)}...`;
                    if (assetForDetails.status === 'Bukan_Asset_Perusahaan') {
                        verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/personal?id=${assetForDetails.id.slice(0, 6)}...`;
                    } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(assetForDetails.category)) {
                        verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/utility?id=${assetForDetails.id.slice(0, 6)}...`;
                    }

                    const headerP = document.createElement('p');
                    headerP.innerText = verifyUrlText;
                    headerP.style.cssText = 'margin:0 0 10px 0; font-size:9px; word-break:break-all; font-family:monospace; color:#666;';
                    tempDiv.appendChild(headerP);

                    const nameP = document.createElement('p');
                    nameP.innerText = assetForDetails.name;
                    nameP.style.cssText = 'margin:0; font-weight:bold; font-size:14px;';
                    tempDiv.appendChild(nameP);

                    const locationP = document.createElement('p');
                    locationP.innerText = assetForDetails.location;
                    locationP.style.cssText = 'margin:0 0 10px 0; font-size:12px;';
                    tempDiv.appendChild(locationP);
                    
                    const codeDiv = document.createElement('div');
                    codeDiv.style.display = 'flex';
                    codeDiv.style.justifyContent = 'center';
                    codeDiv.appendChild(codeCanvas);
                    tempDiv.appendChild(codeDiv);

                    const codeP = document.createElement('p');
                    codeP.innerText = assetForDetails.code;
                    codeP.style.cssText = 'margin:10px 0 0 0; font-weight:bold; font-size:22px;';
                    tempDiv.appendChild(codeP);

                    document.body.appendChild(tempDiv);
                    finalCanvas = await html2canvas(tempDiv, {backgroundColor: '#ffffff', scale: 2});
                    document.body.removeChild(tempDiv);
                } else {
                    finalCanvas = codeCanvas;
                }
            } else if (printType === 'template') {
                const width = 970;
                const height = 230;
                finalCanvas = document.createElement('canvas');
                finalCanvas.width = width;
                finalCanvas.height = height;
                const ctx = finalCanvas.getContext('2d');
                if (!ctx || !assetForDetails) return;

                ctx.fillStyle = 'white';
                ctx.fillRect(0, 0, width, height);
                ctx.fillStyle = 'black';
                
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 32px Arial';
                // Adjust department text position to be closer to the line
                ctx.translate(85, height / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(assetForDetails.location, 0, 0);
                ctx.restore();

                ctx.font = `bold ${templateNameFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lineXStart = 110;
                // Add padding between line and QR code
                const lineXEnd = width - templateQrSize - 30;
                const textAreaWidth = lineXEnd - lineXStart;
                wrapText(ctx, assetForDetails.name, 110 + textAreaWidth / 2, height * 0.25, textAreaWidth - 20, templateNameFontSize + 5);

                ctx.font = `bold ${templateCodeFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                wrapText(ctx, assetForDetails.code, 110 + textAreaWidth / 2, 165, textAreaWidth - 20, templateCodeFontSize + 5);
                
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 5;
                ctx.beginPath();
                ctx.moveTo(lineXStart, 10); ctx.lineTo(lineXStart, height - 10);
                ctx.moveTo(lineXStart, 10); ctx.lineTo(lineXEnd, 10);
                ctx.moveTo(lineXStart, height / 2); ctx.lineTo(lineXEnd, height / 2); 
                ctx.moveTo(lineXStart, height - 10); ctx.lineTo(lineXEnd, height - 10);
                ctx.moveTo(lineXEnd, 10); ctx.lineTo(lineXEnd, height - 10);
                ctx.stroke();

                const qrSize = templateQrSize;
                let shareUrl = `${window.location.origin}/public/asset?assetId=${assetForDetails.id}`;
                if (assetForDetails.status === 'Bukan_Asset_Perusahaan') {
                    shareUrl = `${window.location.origin}/public/personal?id=${assetForDetails.id}`;
                } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(assetForDetails.category)) {
                    shareUrl = `${window.location.origin}/public/utility?id=${assetForDetails.id}`;
                }
                await drawQRCodeOnCtx(ctx, shareUrl, width - qrSize - 10, (height - qrSize) / 2, qrSize, isDottedQr);
                
                const rotatedCanvas = document.createElement('canvas');
                const rotCtx = rotatedCanvas.getContext('2d');
                if (!rotCtx) return;
                rotatedCanvas.width = height;
                rotatedCanvas.height = width;
                rotCtx.translate(height / 2, width / 2);
                rotCtx.rotate(Math.PI / 2);
                rotCtx.drawImage(finalCanvas, -width / 2, -height / 2);
                setCanvasFunc(rotatedCanvas.toDataURL('image/png'));
                return;
            
            } else {
                finalCanvas = document.createElement('canvas');
                const ctx = finalCanvas.getContext('2d');
                if (!ctx) return;

                const fontWeight = isBold ? 'bold' : 'normal';
                let effectiveFontSize = fontSize;
                ctx.font = `${fontWeight} ${effectiveFontSize}px ${fontFamily}`;
                const textMetrics = ctx.measureText(text);
                
                finalCanvas.width = effectiveFontSize + 20;
                finalCanvas.height = textMetrics.width + 30;

                ctx.font = `${fontWeight} ${effectiveFontSize}px ${fontFamily}`;
                ctx.fillStyle = 'black';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                ctx.translate(finalCanvas.width / 2, finalCanvas.height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(text, 0, 0);
            }

            if (isRotated && printType !== 'text' && printType !== 'template') {
                const rotatedCanvas = document.createElement('canvas');
                const ctx = rotatedCanvas.getContext('2d');
                if (ctx) {
                    rotatedCanvas.width = finalCanvas.height;
                    rotatedCanvas.height = finalCanvas.width;
                    ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
                    ctx.rotate(Math.PI / 2);
                    ctx.drawImage(finalCanvas, -finalCanvas.width / 2, -finalCanvas.height / 2);
                    setCanvasFunc(rotatedCanvas.toDataURL('image/png'));
                }
            } else {
                setCanvasFunc(finalCanvas.toDataURL('image/png'));
            }

        } catch (e) { console.error("Generation error:", e); }
    }
    
    generateCanvas(textToPrint, asset, setCanvasUrl);
    if(isSplitLayout) generateCanvas(textToPrint2, asset2, setCanvasUrl2);

  }, [textToPrint, textToPrint2, fontSize, fontFamily, isBold, printType, barcodeWidth, isRotated, showBarcodeDetails, asset, asset2, isSplitLayout, templateCodeFontSize, templateNameFontSize, templateQrSize, isDottedQr]);

  const handlePrint = async () => {
    if (!printAreaRef.current) return;
    try {
      const canvas = await html2canvas(printAreaRef.current, { backgroundColor: '#ffffff', scale: 3 });
      const imgData = canvas.toDataURL('image/png');
      const printWindow = window.open('', '', 'width=300,height=500');
      if (printWindow) {
        printWindow.document.write(`<html><head><style>@page { size: 58mm auto; margin: 1mm; } body { margin: 0; } img { width: 100%; }</style></head><body><img src="${imgData}" /></body></html>`);
        printWindow.document.close();
        setTimeout(() => { printWindow.focus(); printWindow.print(); printWindow.close(); }, 500);
      }
    } catch (error) { toast({ variant: 'destructive', title: 'Gagal Mencetak' }); }
  };
  const handleBluetoothPrintDirect = async () => {
    if (!printAreaRef.current) return;
    try {
      const canvas = await html2canvas(printAreaRef.current, { backgroundColor: '#ffffff', scale: 1.5 });
      await printCanvasBluetooth(canvas, toast);
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyiapkan Cetakan Bluetooth', description: error.message });
    }
  };

  const handleShare = async () => {
    if (!printAreaRef.current || !navigator.share) return;
    try {
        const canvas = await html2canvas(printAreaRef.current, { backgroundColor: '#ffffff', scale: 2 });
        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        if (blob) {
            const file = new File([blob], 'label-aset.png', { type: 'image/png' });
            await navigator.share({ title: 'Label Aset', text: `Kode: ${textToPrint}`, files: [file] });
        }
    } catch (error: any) { if (error.name !== 'AbortError') toast({ variant: 'destructive', title: 'Gagal Berbagi' }); }
  };
  
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      const canvas = await html2canvas(printAreaRef.current, { backgroundColor: '#ffffff', scale: 3 });
      const pdf = new jsPDF({ unit: 'mm', format: [58, canvas.height * 58 / canvas.width] });
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, 58, pdf.internal.pageSize.getHeight());
      pdf.save('label-thermal.pdf');
    } catch (error) { toast({ variant: 'destructive', title: 'Gagal Mengunduh' }); }
  };

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start pb-20">
        <div className="lg:col-span-4">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Cetak Label</CardTitle>
              <CardDescription>Format label verifikasi untuk printer thermal 58mm.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 text-slate-900 dark:text-slate-100">
              <div className="space-y-2 relative">
                <Label className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/>Kode Aset Utama</Label>
                <Input value={textToPrint} onChange={(e) => handleInputChange(e.target.value, 1)} placeholder="Ketik kode atau nama aset..." className="h-11" />
                {suggestions.length > 0 && (
                    <ul className="absolute z-50 w-full bg-white border border-border rounded-md mt-1 shadow-xl max-h-80 overflow-y-auto">
                        {suggestions.map(a => (
                            <li key={a.id} className="p-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 transition-colors" onClick={() => handleSuggestionClick(a, 1)}>
                                <div className="flex justify-between items-center mb-1">
                                    <p className="font-black text-xs text-primary tracking-tighter">{a.code}</p>
                                    <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 bg-slate-50">{a.location}</Badge>
                                </div>
                                <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">{a.name}</p>
                                <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                    <User className="w-2.5 h-2.5" /> {a.user || 'Tanpa User'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
              </div>

               <div className="flex items-center space-x-2 py-2">
                  <Switch id="split-layout" checked={isSplitLayout} onCheckedChange={setIsSplitLayout} />
                  <Label htmlFor="split-layout" className="text-xs font-bold">Mode 2 Label (Split)</Label>
              </div>
              
              {isSplitLayout && (
                 <div className="space-y-2 relative">
                    <Label className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/>Kode Aset Kedua</Label>
                    <Input value={textToPrint2} onChange={(e) => handleInputChange(e.target.value, 2)} placeholder="Ketik kode atau nama kedua..." />
                    {suggestions2.length > 0 && (
                        <ul className="absolute z-50 w-full bg-white border border-border rounded-md mt-1 shadow-xl max-h-80 overflow-y-auto">
                            {suggestions2.map(a => (
                                <li key={a.id} className="p-3 cursor-pointer hover:bg-slate-50 border-b last:border-0 transition-colors" onClick={() => handleSuggestionClick(a, 2)}>
                                    <div className="flex justify-between items-center mb-1">
                                        <p className="font-black text-xs text-primary tracking-tighter">{a.code}</p>
                                        <Badge variant="outline" className="text-[9px] font-bold h-5 px-2 bg-slate-50 border-slate-200">{a.location}</Badge>
                                    </div>
                                    <p className="text-xs font-bold text-slate-900 dark:text-white leading-tight mb-1">{a.name}</p>
                                    <p className="text-[10px] text-muted-foreground font-medium flex items-center gap-1">
                                        <User className="w-2.5 h-2.5" /> {a.user || 'Tanpa User'}
                                    </p>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>
              )}
              
              <Separator/>

              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger className="text-xs font-black uppercase">Tipe & Mode Visual</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                     <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase text-muted-foreground">Tipe Label</Label>
                        <Select value={printType} onValueChange={(v) => setPrintType(v as any)}>
                            <SelectTrigger><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="qrcode">QR Code Verifikasi</SelectItem>
                                <SelectItem value="barcode">Barcode Standar</SelectItem>
                                <SelectItem value="template">Template ISO</SelectItem>
                                <SelectItem value="text">Hanya Teks</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {printType === 'text' && (
                      <div className="space-y-4 pt-2 border-t mt-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary">Gaya Font (Tipografi)</Label>
                          <Select value={fontFamily} onValueChange={setFontFamily}>
                            <SelectTrigger className="font-bold">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Inter, sans-serif" className="font-sans">Inter (Modern Sans)</SelectItem>
                              <SelectItem value="'Poppins', sans-serif">Poppins (Elegant)</SelectItem>
                              <SelectItem value="'Space Grotesk', sans-serif">Space Grotesk (Tech)</SelectItem>
                              <SelectItem value="'Roboto Mono', monospace" className="font-mono">Roboto Mono (Clean)</SelectItem>
                              <SelectItem value="'Courier Prime', serif">Courier Prime (Typewriter)</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between items-center">
                            <Label className="text-[10px] font-black uppercase text-muted-foreground">Ukuran Font ({fontSize}px)</Label>
                            <div className="flex items-center gap-2">
                              <Switch id="bold-toggle" checked={isBold} onCheckedChange={setIsBold} />
                              <Label htmlFor="bold-toggle" className="text-[10px] font-black uppercase"><Bold className="w-3 h-3"/></Label>
                            </div>
                          </div>
                          <Slider
                            value={[fontSize]}
                            onValueChange={(v) => setFontSize(v[0])}
                            min={10}
                            max={200}
                            step={1}
                          />
                        </div>
                      </div>
                    )}

                    {printType === 'template' && (
                      <div className="space-y-4 pt-2 border-t mt-4">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary">Ukuran QR Code ({templateQrSize}px)</Label>
                          <Slider
                            value={[templateQrSize]}
                            onValueChange={(v) => setTemplateQrSize(v[0])}
                            min={80}
                            max={210}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Ukuran Font Nama ({templateNameFontSize}px)</Label>
                          <Slider
                            value={[templateNameFontSize]}
                            onValueChange={(v) => setTemplateNameFontSize(v[0])}
                            min={10}
                            max={60}
                            step={1}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Ukuran Font Kode ({templateCodeFontSize}px)</Label>
                          <Slider
                            value={[templateCodeFontSize]}
                            onValueChange={(v) => setTemplateCodeFontSize(v[0])}
                            min={20}
                            max={120}
                            step={1}
                          />
                        </div>
                      </div>
                    )}
                    {(printType === 'qrcode' || printType === 'template') && (
                        <div className="flex items-center space-x-2 pt-2">
                            <Switch id="dotted-qr" checked={isDottedQr} onCheckedChange={setIsDottedQr} />
                            <Label htmlFor="dotted-qr" className="text-[10px] font-black text-primary uppercase">Gunakan Pola Titik (Premium)</Label>
                        </div>
                    )}
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger className="text-xs font-black uppercase">Detail & Orientasi</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                     <div className="flex items-center space-x-2">
                        <Switch id="barcode-details" checked={showBarcodeDetails} onCheckedChange={setShowBarcodeDetails} />
                        <Label htmlFor="barcode-details" className="text-xs">Tampilkan Nama & URL Verifikasi</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                        <Switch id="barcode-rotate" checked={isRotated} onCheckedChange={setIsRotated} />
                        <Label htmlFor="barcode-rotate" className="text-xs">Rotasi Vertikal (90°)</Label>
                    </div>
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <Card className="min-h-[400px]">
            <CardHeader className="border-b bg-muted/20">
                <CardTitle className="text-sm font-bold uppercase tracking-widest">Pratinjau Kertas 58mm</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center bg-slate-200 dark:bg-slate-800 p-8 rounded-b-lg">
                <div 
                    ref={printAreaRef}
                    className="bg-white text-black shadow-2xl flex items-center justify-center p-1"
                    style={{
                      width: '219px',
                      height: 'auto',
                      minHeight: '100px',
                      flexDirection: isSplitLayout ? 'row' : 'column',
                      gap: isSplitLayout ? '4px' : '0',
                    }}
                >
                  {canvasUrl ? (
                    <img src={canvasUrl} alt="Preview 1" style={{ maxWidth: isSplitLayout ? '48%' : '100%', height: 'auto' }} />
                  ) : <Loader2 className="w-8 h-8 animate-spin opacity-20" />}
                  {isSplitLayout && (
                    canvasUrl2 ? (
                        <img src={canvasUrl2} alt="Preview 2" style={{ maxWidth: '48%', height: 'auto' }} />
                    ) : <Loader2 className="w-8 h-8 animate-spin opacity-20" />
                  )}
                </div>
            </CardContent>
           </Card>
           <Card>
            <CardContent className="p-6 flex flex-wrap gap-3">
                 <Button onClick={handleBluetoothPrintDirect} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg font-black h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> CETAK BLUETOOTH</Button>
                 <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg font-black h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> CETAK BROWSER</Button>
                {canShare && <Button onClick={handleShare} variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 h-12 px-8 rounded-xl"><Share2 className="w-4 h-4 mr-2"/> BAGIKAN</Button>}
                <Button onClick={handleDownloadPdf} variant="secondary" className="font-bold h-12 px-8 rounded-xl"><Download className="w-4 h-4 mr-2"/> PDF</Button>
            </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ThermalPrintPage() {
    return <Suspense><ThermalPrintPageContent /></Suspense>;
}
