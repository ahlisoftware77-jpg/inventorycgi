'use client';

/**
 * @fileOverview Halaman optimasi pencetakan label thermal 58mm.
 * Sekarang diatur untuk menggunakan Tautan Verifikasi Publik sebagai data QR Code.
 */

import { useState, useEffect, useRef, useMemo, useCallback, Suspense } from 'react';
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
import { Printer, Share2, Download, RefreshCw, Type, Text, CaseSensitive, Loader2, Rows3, Columns3, MessageSquare, Eye, RotateCw, Copy, QrCode, User, MapPin, Bold, Bluetooth, BluetoothSearching, Trash2, FileText, Layers, Grid, FileCheck } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/dashboard/layout';
import { 
  printCanvasBluetooth, 
  sendRawBluetooth, 
  compileAssetEscPos, 
  pairAndSaveDefaultPrinter, 
  forgetDefaultPrinter, 
  getSavedBluetoothPrinter, 
  setAutoConnectMode,
  SavedBluetoothPrinter
} from '@/lib/bluetooth-printer';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

function ThermalPrintPageContent() {
  const { toast } = useToast();
  const router = useRouter();
  const printAreaRef = useRef<HTMLDivElement>(null);
  const a4PrintRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');

  const [allSearchableAssets, setAllSearchableAssets] = useState<Asset[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [asset2, setAsset2] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);

  const [textToPrint, setTextToPrint] = useState('');
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
  const [printType, setPrintType] = useState<'text' | 'barcode' | 'qrcode' | 'template' | 'card'>('card');
  const [barcodeWidth, setBarcodeWidth] = useState(2.8);
  const [isRotated, setIsRotated] = useState(false);
  const [showBarcodeDetails, setShowBarcodeDetails] = useState(true);
  const [isSplitLayout, setIsSplitLayout] = useState(false);
  const [templateCodeFontSize, setTemplateCodeFontSize] = useState(65);
  const [templateNameFontSize, setTemplateNameFontSize] = useState(33);
  const [templateQrSize, setTemplateQrSize] = useState(155);
  const [isDottedQr, setIsDottedQr] = useState(true);
  const [cardCompanyName, setCardCompanyName] = useState('PT CHINA GLAZE INDONESIA');
  const [cardAddress, setCardAddress] = useState('Kawasan Industri Surya Cipta\nJl. Surya Lestari Kav. I-17C\nCiampel, Karawang 41363');
  const [savedPrinterInfo, setSavedPrinterInfo] = useState<SavedBluetoothPrinter>({ id: null, name: null, autoConnect: true });

  // State untuk Cetak Massal A4, Departemen, & Filter Kategori A/B
  const [a4Department, setA4Department] = useState<string>('ALL');
  const [a4CategorySeries, setA4CategorySeries] = useState<'ALL' | 'SERI_A' | 'SERI_B'>('ALL');
  const [a4GridCols, setA4GridCols] = useState<1 | 2 | 3>(2);
  const [previewMode, setPreviewMode] = useState<'thermal' | 'a4'>('thermal');
  const [a4BatchCards, setA4BatchCards] = useState<{ asset: Asset; canvasUrl: string }[]>([]);
  const [isGeneratingA4, setIsGeneratingA4] = useState(false);
  const [a4Progress, setA4Progress] = useState({ current: 0, total: 0 });
  const [isLoadingAssets, setIsLoadingAssets] = useState(true);

  // Daftar departemen unik dari seluruh aset
  const allDepartments = useMemo(() => {
    const depts = new Set<string>();
    allSearchableAssets.forEach(a => {
      if (a.location?.trim()) depts.add(a.location.trim());
      if ((a as any).department?.trim()) depts.add((a as any).department.trim());
    });
    return Array.from(depts).sort();
  }, [allSearchableAssets]);

  // Filter aset berdasarkan Departemen & Kategori A/B (Seri A & Seri B) secara spesifik
  const filteredA4Assets = useMemo(() => {
    let list = allSearchableAssets;

    // Filter berdasarkan Departemen jika dipilih
    if (a4Department && a4Department !== 'ALL') {
      const targetDept = a4Department.trim().toLowerCase();
      list = list.filter(a => 
        (a.location && a.location.trim().toLowerCase() === targetDept) ||
        ((a as any).department && (a as any).department.trim().toLowerCase() === targetDept)
      );
    }

    // Filter khusus Seri Kategori (Aset Seri A / Aset Seri B / Semua A & B)
    if (a4CategorySeries === 'SERI_A') {
      list = list.filter(a => {
        const cat = (a.category || '').trim().toUpperCase();
        const code = (a.code || '').trim().toUpperCase();
        return cat.startsWith('A') || code.startsWith('A') || cat.includes('SERI A');
      });
    } else if (a4CategorySeries === 'SERI_B') {
      list = list.filter(a => {
        const cat = (a.category || '').trim().toUpperCase();
        const code = (a.code || '').trim().toUpperCase();
        return cat.startsWith('B') || code.startsWith('B') || cat.includes('SERI B');
      });
    } else {
      // Default: Secara spesifik hanya menampilkan kategori/kode berawalan A dan B
      list = list.filter(a => {
        const cat = (a.category || '').trim().toUpperCase();
        const code = (a.code || '').trim().toUpperCase();
        return cat.startsWith('A') || cat.startsWith('B') || code.startsWith('A') || code.startsWith('B') || cat.includes('SERI A') || cat.includes('SERI B');
      });
    }

    return list;
  }, [allSearchableAssets, a4Department, a4CategorySeries]);

  useEffect(() => {
    setSavedPrinterInfo(getSavedBluetoothPrinter());
    const unsubGen = onSnapshot(doc(db, 'settings', 'general'), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        if (data.companyName) setCardCompanyName(data.companyName);
        if (data.companyAddress) setCardAddress(data.companyAddress);
      }
    });
    return () => unsubGen();
  }, []);

  const handlePairDefault = async () => {
    const success = await pairAndSaveDefaultPrinter(toast);
    if (success) {
      setSavedPrinterInfo(getSavedBluetoothPrinter());
    }
  };

  const handleForgetDefault = () => {
    forgetDefaultPrinter(toast);
    setSavedPrinterInfo(getSavedBluetoothPrinter());
  };

  const handleToggleAutoConnect = (checked: boolean) => {
    setAutoConnectMode(checked);
    setSavedPrinterInfo(getSavedBluetoothPrinter());
  };

  useEffect(() => {
    if (navigator.share) {
      setCanShare(true);
    }

    setIsLoadingAssets(true);
    const unsubAssets = onSnapshot(collection(db, 'assets'), (snapshot) => {
      const assetsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Asset));
      setAllSearchableAssets(assetsData);
      setIsLoadingAssets(false);
    }, (error) => {
      console.error("Failed to fetch assets for search:", error);
      setIsLoadingAssets(false);
    });

    return () => unsubAssets();
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
    await new Promise<void>((resolve) => {
      logoImg.onload = () => {
        try { ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize); } catch (e) {}
        resolve();
      };
      logoImg.onerror = () => resolve();
      if (logoImg.complete && logoImg.naturalWidth > 0) {
        try { ctx.drawImage(logoImg, logoX, logoY, logoSize, logoSize); } catch (e) {}
        resolve();
      }
    });
  };

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
  };
  
  const buildAssetCanvas = useCallback(async (targetAsset: Asset | null, fallbackText: string): Promise<string> => {
      const text = targetAsset ? targetAsset.code : (fallbackText && fallbackText.trim() !== '' ? fallbackText : 'Pilih Aset');

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
                  let qrData = targetAsset ? `${window.location.origin}/public/asset?assetId=${targetAsset.id}` : text;
                  if (targetAsset) {
                      if (targetAsset.status === 'Bukan_Asset_Perusahaan') {
                          qrData = `${window.location.origin}/public/personal?id=${targetAsset.id}`;
                      } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(targetAsset.category)) {
                          qrData = `${window.location.origin}/public/utility?id=${targetAsset.id}`;
                      }
                  }
                  await drawQRCodeOnCtx(ctxCode, qrData, 0, 0, qrSize, isDottedQr);
              }
          }

          if (showBarcodeDetails && targetAsset) {
              const canvas = document.createElement('canvas');
              const width = 438;
              const height = 500;
              canvas.width = width;
              canvas.height = height;
              const ctx = canvas.getContext('2d');
              if (ctx) {
                  ctx.fillStyle = 'white';
                  ctx.fillRect(0, 0, width, height);

                  ctx.strokeStyle = '#e2e8f0';
                  ctx.lineWidth = 2;
                  ctx.strokeRect(4, 4, width - 8, height - 8);

                  let verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/asset?id=${targetAsset.id.slice(0, 6)}...`;
                  if (targetAsset.status === 'Bukan_Asset_Perusahaan') {
                      verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/personal?id=${targetAsset.id.slice(0, 6)}...`;
                  } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(targetAsset.category)) {
                      verifyUrlText = `${window.location.origin.replace(/^https?:\/\//, '')}/public/utility?id=${targetAsset.id.slice(0, 6)}...`;
                  }

                  let y = 30;
                  ctx.font = '18px monospace';
                  ctx.fillStyle = '#64748b';
                  ctx.textAlign = 'center';
                  ctx.fillText(verifyUrlText, width / 2, y);
                  y += 35;

                  ctx.font = 'bold 28px sans-serif';
                  ctx.fillStyle = '#0f172a';
                  ctx.fillText(targetAsset.name, width / 2, y);
                  y += 30;

                  ctx.font = '24px sans-serif';
                  ctx.fillStyle = '#475569';
                  ctx.fillText(targetAsset.location || '', width / 2, y);
                  y += 30;

                  const codeW = codeCanvas.width;
                  const codeH = codeCanvas.height;
                  const drawW = Math.min(codeW * 1.5, width - 40);
                  const drawH = (codeH / codeW) * drawW;
                  ctx.drawImage(codeCanvas, (width - drawW) / 2, y, drawW, drawH);
                  y += drawH + 35;

                  ctx.font = 'bold 40px sans-serif';
                  ctx.fillStyle = '#000000';
                  ctx.fillText(targetAsset.code, width / 2, y);

                  return canvas.toDataURL('image/png');
              } else {
                  return codeCanvas.toDataURL('image/png');
              }
          } else {
              return codeCanvas.toDataURL('image/png');
          }
      } else if (printType === 'template') {
          const width = 970;
          const height = 230;
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = width;
          finalCanvas.height = height;
          const ctx = finalCanvas.getContext('2d');
          if (!ctx) return '';

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);
          ctx.fillStyle = 'black';
          
          ctx.save();
          ctx.textAlign = 'center';
          ctx.font = 'bold 32px Arial';
          ctx.translate(85, height / 2);
          ctx.rotate(-Math.PI / 2);
          ctx.fillText(targetAsset ? targetAsset.location : 'LOKASI', 0, 0);
          ctx.restore();

          ctx.font = `bold ${templateNameFontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const lineXStart = 110;
          const lineXEnd = width - templateQrSize - 30;
          const textAreaWidth = lineXEnd - lineXStart;
          wrapText(ctx, targetAsset ? targetAsset.name : text, 110 + textAreaWidth / 2, height * 0.25, textAreaWidth - 20, templateNameFontSize + 5);

          ctx.font = `bold ${templateCodeFontSize}px Arial`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          wrapText(ctx, targetAsset ? targetAsset.code : text, 110 + textAreaWidth / 2, 165, textAreaWidth - 20, templateCodeFontSize + 5);
          
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
          let shareUrl = targetAsset ? `${window.location.origin}/public/asset?assetId=${targetAsset.id}` : text;
          if (targetAsset) {
              if (targetAsset.status === 'Bukan_Asset_Perusahaan') {
                  shareUrl = `${window.location.origin}/public/personal?id=${targetAsset.id}`;
              } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(targetAsset.category)) {
                  shareUrl = `${window.location.origin}/public/utility?id=${targetAsset.id}`;
              }
          }
          await drawQRCodeOnCtx(ctx, shareUrl, width - qrSize - 10, (height - qrSize) / 2, qrSize, isDottedQr);
          return finalCanvas.toDataURL('image/png');
      } else if (printType === 'card') {
          const width = 850;
          const height = 480;
          const finalCanvas = document.createElement('canvas');
          finalCanvas.width = width;
          finalCanvas.height = height;
          const ctx = finalCanvas.getContext('2d');
          if (!ctx) return '';

          ctx.fillStyle = 'white';
          ctx.fillRect(0, 0, width, height);

          ctx.strokeStyle = 'black';
          ctx.lineWidth = 5;
          ctx.strokeRect(6, 6, width - 12, height - 12);

          ctx.fillStyle = 'black';
          ctx.fillRect(6, 6, 22, height - 12);

          ctx.font = 'bold 38px Arial, sans-serif';
          const compName = cardCompanyName || 'PT CHINA GLAZE INDONESIA';
          const compNameUpper = compName.toUpperCase();
          const textWidth = ctx.measureText(compNameUpper).width;

          const logoSize = 48;
          const logoGap = 15;
          const totalHeaderWidth = logoSize + logoGap + textWidth;
          
          const logoX = (width / 2) - (totalHeaderWidth / 2);
          const logoY = 24;

          const cgiLogo = new Image();
          cgiLogo.src = '/cgi.png';
          await new Promise<void>((resolve) => {
            cgiLogo.onload = () => {
              try { ctx.drawImage(cgiLogo, logoX, logoY, logoSize, logoSize); } catch (e) {}
              resolve();
            };
            cgiLogo.onerror = () => resolve();
            if (cgiLogo.complete && cgiLogo.naturalWidth > 0) {
              try { ctx.drawImage(cgiLogo, logoX, logoY, logoSize, logoSize); } catch (e) {}
              resolve();
            }
          });

          ctx.fillStyle = 'black';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'middle';
          ctx.fillText(compNameUpper, logoX + logoSize + logoGap, logoY + (logoSize / 2));

          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.moveTo(40, 88);
          ctx.lineTo(width - 25, 88);
          ctx.stroke();

          const qrX = 45;
          const qrY = 102;
          const qrSize = 210;

          let shareUrl = targetAsset ? `${window.location.origin}/public/asset?assetId=${targetAsset.id}` : (fallbackText && fallbackText.trim() !== '' ? fallbackText : `${window.location.origin}/public/asset`);
          if (targetAsset) {
              if (targetAsset.status === 'Bukan_Asset_Perusahaan') {
                  shareUrl = `${window.location.origin}/public/personal?id=${targetAsset.id}`;
              } else if (['APAR', 'CCTV', 'Utilitas & Kelistrikan', 'Infrastruktur Gedung'].includes(targetAsset.category)) {
                  shareUrl = `${window.location.origin}/public/utility?id=${targetAsset.id}`;
              }
          }
          await drawQRCodeOnCtx(ctx, shareUrl, qrX, qrY, qrSize, isDottedQr);

          ctx.font = 'bold 13px Arial, sans-serif';
          ctx.fillStyle = 'black';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';
          const defaultAddr = 'Kawasan Industri Surya Cipta\nJl. Surya Lestari Kav. I-17C\nCiampel, Karawang 41363';
          const addrText = cardAddress || defaultAddr;
          const addrLines = addrText.split('\n');
          let addrY = qrY + qrSize + 14;
          addrLines.forEach(line => {
              ctx.fillText(line, qrX, addrY);
              addrY += 18;
          });

          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.moveTo(280, 100);
          ctx.lineTo(280, height - 20);
          ctx.stroke();

          const rightX = 305;
          const maxRightWidth = width - 30 - rightX;
          let currentRightY = 100;

          const titleText = targetAsset ? targetAsset.name : (fallbackText && fallbackText.trim() !== '' ? fallbackText : 'Radetyo Eko Prastomo');
          const subtitleText = targetAsset ? `${targetAsset.category || 'Asset'} • ${targetAsset.location || ''}` : 'Purchasing Specialist';

          let mainFontSize = 40;
          ctx.font = `bold ${mainFontSize}px Arial, sans-serif`;
          ctx.fillStyle = 'black';
          ctx.textAlign = 'left';
          ctx.textBaseline = 'top';

          const words = titleText.trim().split(/\s+/);
          let line1 = '';
          let line2 = '';

          for (let i = 0; i < words.length; i++) {
              const testLine = line1 ? `${line1} ${words[i]}` : words[i];
              if (ctx.measureText(testLine).width <= maxRightWidth) {
                  line1 = testLine;
              } else {
                  line2 = words.slice(i).join(' ');
                  break;
              }
          }

          if (line2) {
              while (ctx.measureText(line2).width > maxRightWidth && mainFontSize > 20) {
                  mainFontSize -= 1;
                  ctx.font = `bold ${mainFontSize}px Arial, sans-serif`;
              }
          } else {
              while (ctx.measureText(line1).width > maxRightWidth && mainFontSize > 20) {
                  mainFontSize -= 1;
                  ctx.font = `bold ${mainFontSize}px Arial, sans-serif`;
              }
          }

          ctx.fillText(line1, rightX, currentRightY);
          currentRightY += mainFontSize + 4;

          if (line2) {
              ctx.fillText(line2, rightX, currentRightY);
              currentRightY += mainFontSize + 4;
          }

          let subFontSize = 29;
          ctx.font = `italic ${subFontSize}px Arial, sans-serif`;
          ctx.fillStyle = '#222222';
          while (ctx.measureText(subtitleText).width > maxRightWidth && subFontSize > 16) {
              subFontSize -= 1;
              ctx.font = `italic ${subFontSize}px Arial, sans-serif`;
          }
          ctx.fillText(subtitleText, rightX, currentRightY);
          currentRightY += subFontSize + 8;

          ctx.lineWidth = 3;
          ctx.strokeStyle = 'black';
          ctx.beginPath();
          ctx.moveTo(rightX, currentRightY);
          ctx.lineTo(width - 30, currentRightY);
          ctx.stroke();
          currentRightY += 14;

          const infoItems = targetAsset ? [
              { key: 'Kode', val: targetAsset.code },
              { key: 'PIC', val: targetAsset.user || '-' },
              { key: 'Lokasi', val: targetAsset.location || '-' },
              { key: 'Dept', val: targetAsset.costCenter || '-' },
              { key: 'Status', val: targetAsset.status || 'Baik' },
          ] : [
              { key: 'Tel.', val: '+62 267 440 938 (Ext. 155)' },
              { key: 'Fax.', val: '+62 267 440 889' },
              { key: 'HP.', val: '+62 898 7144 166' },
              { key: 'E-Mail', val: '00535@china-glaze.co.id' },
          ];

          const labelColWidth = 120;
          infoItems.forEach(item => {
              ctx.font = 'bold 32px Arial, sans-serif';
              ctx.fillStyle = 'black';
              ctx.fillText(item.key, rightX, currentRightY);
              ctx.fillText(':', rightX + labelColWidth, currentRightY);
              ctx.font = 'bold 34px Arial, sans-serif';
              ctx.fillText(item.val.toString(), rightX + labelColWidth + 20, currentRightY);
              currentRightY += 46;
          });

          if (isRotated) {
              const rotatedCanvas = document.createElement('canvas');
              rotatedCanvas.width = height;
              rotatedCanvas.height = width;
              const rCtx = rotatedCanvas.getContext('2d');
              if (rCtx) {
                  rCtx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
                  rCtx.rotate(Math.PI / 2);
                  rCtx.drawImage(finalCanvas, -width / 2, -height / 2);
                  return rotatedCanvas.toDataURL('image/png');
              }
          }

          return finalCanvas.toDataURL('image/png');
      } else {
          const finalCanvas = document.createElement('canvas');
          const ctx = finalCanvas.getContext('2d');
          if (!ctx) return '';

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

          return finalCanvas.toDataURL('image/png');
      }
  }, [printType, barcodeWidth, showBarcodeDetails, isDottedQr, templateNameFontSize, templateCodeFontSize, templateQrSize, cardCompanyName, cardAddress, isBold, fontSize, fontFamily, isRotated]);

  useEffect(() => {
    const generateCanvas = async (text: string, assetForDetails: Asset | null, setCanvasFunc: (url: string | null) => void) => {
        setCanvasFunc(null);
        if (!text && printType !== 'template') return;

        try {
            const dataUrl = await buildAssetCanvas(assetForDetails, text);
            setCanvasFunc(dataUrl);
        } catch (e) { console.error("Generation error:", e); }
    };
    
    generateCanvas(textToPrint, asset, setCanvasUrl);
    if(isSplitLayout) generateCanvas(textToPrint2, asset2, setCanvasUrl2);

  }, [textToPrint, textToPrint2, asset, asset2, isSplitLayout, buildAssetCanvas]);

  // Generate batch cards for A4 print secara bertahap & responsif (non-blocking)
  useEffect(() => {
    let isCancelled = false;
    async function generateA4Batch() {
      if (filteredA4Assets.length === 0) {
        setA4BatchCards([]);
        setA4Progress({ current: 0, total: 0 });
        return;
      }
      setIsGeneratingA4(true);
      setA4Progress({ current: 0, total: filteredA4Assets.length });
      try {
        const cards: { asset: Asset; canvasUrl: string }[] = [];
        let completed = 0;
        for (const item of filteredA4Assets) {
          if (isCancelled) break;
          try {
            const url = await buildAssetCanvas(item, item.code);
            if (url) {
              cards.push({ asset: item, canvasUrl: url });
            }
          } catch (itemErr) {
            console.error(`Error generating canvas for asset ${item.code}:`, itemErr);
          }
          completed++;
          setA4Progress({ current: completed, total: filteredA4Assets.length });
          if (completed % 3 === 0) {
            await new Promise(r => setTimeout(r, 0));
          }
        }
        if (!isCancelled) {
          setA4BatchCards(cards);
        }
      } catch (err) {
        console.error("Error generating A4 batch:", err);
      } finally {
        if (!isCancelled) {
          setIsGeneratingA4(false);
        }
      }
    }
    generateA4Batch();
    return () => { isCancelled = true; };
  }, [filteredA4Assets, buildAssetCanvas]);

  const handlePrintA4 = async () => {
    if (a4BatchCards.length === 0) {
      toast({ variant: 'destructive', title: 'Tidak ada tag untuk dicetak' });
      return;
    }
    try {
      const printWindow = window.open('', '', 'width=900,height=1000');
      if (printWindow) {
        const cardsHtml = a4BatchCards.map(item => `
          <div style="break-inside: avoid; page-break-inside: avoid;">
            <img src="${item.canvasUrl}" style="width: 100%; border-radius: 4px; display: block; border: 1px solid #ddd;" />
          </div>
        `).join('');

        printWindow.document.write(`
          <!DOCTYPE html>
          <html>
            <head>
              <title>Cetak A4 - ${a4Department === 'ALL' ? 'Semua Departemen' : a4Department}</title>
              <style>
                @page { size: A4 portrait; margin: 8mm; }
                body { margin: 0; padding: 0; font-family: sans-serif; background: white; }
                .a4-grid {
                  display: grid;
                  grid-template-columns: repeat(${a4GridCols}, 1fr);
                  gap: 4mm;
                }
              </style>
            </head>
            <body>
              <div class="a4-grid">
                ${cardsHtml}
              </div>
            </body>
          </html>
        `);
        printWindow.document.close();
        setTimeout(() => {
          printWindow.focus();
          printWindow.print();
          printWindow.close();
        }, 700);
      }
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Cetak A4' });
    }
  };

  const handleDownloadA4Pdf = async () => {
    if (a4BatchCards.length === 0) return;
    try {
      toast({ title: 'Menyiapkan PDF A4...', description: 'Mohon tunggu sejenak.' });
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
      const pdfWidth = 210;
      const pdfHeight = 297;
      const margin = 8;
      const cols = a4GridCols;
      const gap = 4;
      
      const cardWidth = (pdfWidth - (margin * 2) - (gap * (cols - 1))) / cols;
      const cardHeight = cardWidth * (480 / 850);
      
      let col = 0;
      let rowY = margin;

      for (let i = 0; i < a4BatchCards.length; i++) {
        if (i > 0 && col === 0 && rowY + cardHeight > pdfHeight - margin) {
          pdf.addPage();
          rowY = margin;
        }

        const posX = margin + col * (cardWidth + gap);
        pdf.addImage(a4BatchCards[i].canvasUrl, 'PNG', posX, rowY, cardWidth, cardHeight);

        col++;
        if (col >= cols) {
          col = 0;
          rowY += cardHeight + gap;
        }
      }

      const fileName = `Label_A4_${a4Department.replace(/\s+/g, '_')}_${format(new Date(), 'yyyyMMdd')}.pdf`;
      pdf.save(fileName);
      toast({ title: 'PDF A4 Berhasil Diunduh' });
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Mengunduh PDF A4' });
    }
  };

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
  const handleBluetoothPrintDirect = async (forceSelectModal: boolean = false) => {
    try {
      if (asset) {
        const bytes = await compileAssetEscPos(asset);
        await sendRawBluetooth(bytes, toast, forceSelectModal);
      } else if (printAreaRef.current) {
        const canvas = await html2canvas(printAreaRef.current, { backgroundColor: '#ffffff', scale: 2 });
        await printCanvasBluetooth(canvas, toast, forceSelectModal);
      }
      setSavedPrinterInfo(getSavedBluetoothPrinter());
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
        <div className="lg:col-span-4 space-y-6">
          <Card className="border-indigo-200 dark:border-indigo-900/40 bg-slate-900 text-white shadow-xl">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Bluetooth className="w-5 h-5 text-indigo-400" />
                  <CardTitle className="text-sm font-bold uppercase tracking-wider text-white">Printer Bluetooth Default</CardTitle>
                </div>
                {savedPrinterInfo.name ? (
                  <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-500/30 text-[10px] font-black uppercase">
                    Tersimpan
                  </Badge>
                ) : (
                  <Badge variant="outline" className="text-slate-400 border-slate-700 text-[10px] uppercase">
                    Belum Ada
                  </Badge>
                )}
              </div>
              <CardDescription className="text-slate-400 text-xs mt-1">
                Sandingkan printer sekali saja untuk cetak otomatis tanpa perlu memilih lagi.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0">
              <div className="bg-slate-800/80 p-3 rounded-xl border border-slate-700/60 flex items-center justify-between">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Printer Saved</p>
                  <p className="text-xs font-bold text-white mt-0.5">{savedPrinterInfo.name || 'Belum Ada Printer Saved'}</p>
                </div>
                {savedPrinterInfo.name && (
                  <Button variant="ghost" size="icon" onClick={handleForgetDefault} title="Hapus Printer Tersimpan" className="h-8 w-8 text-rose-400 hover:text-rose-300 hover:bg-rose-500/20 rounded-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <Label htmlFor="auto-connect-toggle" className="text-xs font-bold text-slate-300 cursor-pointer">
                  Koneksi Otomatis ke Printer Default
                </Label>
                <Switch 
                  id="auto-connect-toggle" 
                  checked={savedPrinterInfo.autoConnect} 
                  onCheckedChange={handleToggleAutoConnect} 
                />
              </div>

              <div className="flex flex-col gap-2 pt-2">
                <Button 
                  onClick={handlePairDefault} 
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold h-10 rounded-xl text-xs uppercase tracking-wider shadow-md shadow-indigo-600/30"
                >
                  <BluetoothSearching className="w-4 h-4 mr-2" /> Sandingkan Printer Default
                </Button>
                {savedPrinterInfo.name && (
                  <Button 
                    onClick={() => handleBluetoothPrintDirect(true)} 
                    variant="outline"
                    className="border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white font-bold h-9 rounded-xl text-[11px] uppercase"
                  >
                    <RefreshCw className="w-3.5 h-3.5 mr-2 text-indigo-400" /> Pilih Printer Lain
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

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
                                <SelectItem value="card">Kartu ID / Tag Thermal (PT China Glaze)</SelectItem>
                                <SelectItem value="qrcode">QR Code Verifikasi</SelectItem>
                                <SelectItem value="barcode">Barcode Standar</SelectItem>
                                <SelectItem value="template">Template ISO</SelectItem>
                                <SelectItem value="text">Hanya Teks</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    {printType === 'card' && (
                      <div className="space-y-4 pt-2 border-t mt-4 text-left">
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-primary">Nama Perusahaan</Label>
                          <Input 
                            value={cardCompanyName} 
                            onChange={(e) => setCardCompanyName(e.target.value)} 
                            placeholder="PT CHINA GLAZE INDONESIA" 
                            className="font-bold text-xs"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label className="text-[10px] font-black uppercase text-muted-foreground">Alamat Perusahaan</Label>
                          <Textarea 
                            value={cardAddress} 
                            onChange={(e) => setCardAddress(e.target.value)} 
                            placeholder="Kawasan Industri Surya Cipta..." 
                            rows={3} 
                            className="text-xs font-medium resize-none"
                          />
                        </div>
                      </div>
                    )}

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

          {/* Card Grup Baru Cetak Massal A4 per Departemen & Kategori A/B */}
          <Card className="border-indigo-200 dark:border-indigo-900/40 bg-white dark:bg-slate-900 shadow-xl">
            <CardHeader className="pb-3 text-left">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
                <CardTitle className="text-sm font-bold uppercase tracking-wider">Cetak Massal A4 & Filter Kategori</CardTitle>
              </div>
              <CardDescription className="text-xs mt-1">
                Filter aset Seri A & Seri B secara spesifik untuk cetak lembar A4 secara massal.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4 pt-0 text-left">
              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Pilih Kategori Aset</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant={a4CategorySeries === 'ALL' ? 'default' : 'outline'}
                    onClick={() => {
                      setA4CategorySeries('ALL');
                      setPreviewMode('a4');
                    }}
                    className="h-9 text-xs font-bold px-1.5"
                  >
                    Semua (A & B)
                  </Button>
                  <Button
                    type="button"
                    variant={a4CategorySeries === 'SERI_A' ? 'default' : 'outline'}
                    onClick={() => {
                      setA4CategorySeries('SERI_A');
                      setPreviewMode('a4');
                    }}
                    className="h-9 text-xs font-bold px-1.5"
                  >
                    Aset Seri A
                  </Button>
                  <Button
                    type="button"
                    variant={a4CategorySeries === 'SERI_B' ? 'default' : 'outline'}
                    onClick={() => {
                      setA4CategorySeries('SERI_B');
                      setPreviewMode('a4');
                    }}
                    className="h-9 text-xs font-bold px-1.5"
                  >
                    Aset Seri B
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Pilih Departemen Aset</Label>
                <Select value={a4Department} onValueChange={(val) => {
                  setA4Department(val);
                  setPreviewMode('a4');
                }}>
                  <SelectTrigger className="font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ALL" className="font-bold text-xs">Semua Departemen (Seluruh Aset)</SelectItem>
                    {allDepartments.map(dept => (
                      <SelectItem key={dept} value={dept} className="font-bold text-xs">{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Pilih Tipe Label Cetak A4</Label>
                <Select value={printType} onValueChange={(v) => {
                  setPrintType(v as any);
                  setPreviewMode('a4');
                }}>
                  <SelectTrigger className="font-bold text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="card" className="font-bold text-xs">Kartu ID / Tag Thermal (PT China Glaze)</SelectItem>
                    <SelectItem value="qrcode" className="font-bold text-xs">QR Code Verifikasi</SelectItem>
                    <SelectItem value="barcode" className="font-bold text-xs">Barcode Standar</SelectItem>
                    <SelectItem value="template" className="font-bold text-xs">Template ISO</SelectItem>
                    <SelectItem value="text" className="font-bold text-xs">Hanya Teks</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-3 bg-indigo-50/50 dark:bg-indigo-950/20 rounded-xl border border-indigo-100 dark:border-indigo-900/50">
                <div>
                  <p className="text-[10px] font-black uppercase text-indigo-600 dark:text-indigo-400">Total Aset Ditemukan</p>
                  <p className="text-sm font-black text-slate-900 dark:text-white">{filteredA4Assets.length} Barang / Tag</p>
                </div>
                <Badge variant="outline" className="bg-white dark:bg-slate-900 text-[10px] font-bold">
                  {a4CategorySeries === 'ALL' ? 'Seri A & B' : a4CategorySeries === 'SERI_A' ? 'Seri A' : 'Seri B'} • {a4Department === 'ALL' ? 'Semua Dept' : a4Department}
                </Badge>
              </div>

              <div className="space-y-2">
                <Label className="text-[10px] font-black uppercase text-muted-foreground">Jumlah Kolom Grid A4</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    variant={a4GridCols === 1 ? 'default' : 'outline'}
                    onClick={() => setA4GridCols(1)}
                    className="h-9 text-xs font-bold px-2"
                  >
                    1 Kolom
                  </Button>
                  <Button
                    type="button"
                    variant={a4GridCols === 2 ? 'default' : 'outline'}
                    onClick={() => setA4GridCols(2)}
                    className="h-9 text-xs font-bold px-2"
                  >
                    2 Kolom
                  </Button>
                  <Button
                    type="button"
                    variant={a4GridCols === 3 ? 'default' : 'outline'}
                    onClick={() => setA4GridCols(3)}
                    className="h-9 text-xs font-bold px-2"
                  >
                    3 Kolom
                  </Button>
                </div>
              </div>

              <Button
                onClick={() => {
                  setPreviewMode('a4');
                  toast({ title: 'Mode Pratinjau A4 Aktif', description: `Menampilkan ${filteredA4Assets.length} aset dalam format lembar A4.` });
                }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black text-xs uppercase tracking-wider h-11 rounded-xl shadow-md"
              >
                <Layers className="w-4 h-4 mr-2" /> Buka Lembar Pratinjau A4
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-8 space-y-6">
           <Card className="min-h-[500px]">
            <CardHeader className="border-b bg-muted/20 p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === 'thermal' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('thermal')}
                    className="rounded-xl text-xs font-bold h-9 px-4"
                  >
                    <Printer className="w-3.5 h-3.5 mr-1.5" /> Thermal 58mm
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={previewMode === 'a4' ? 'default' : 'outline'}
                    onClick={() => setPreviewMode('a4')}
                    className="rounded-xl text-xs font-bold h-9 px-4"
                  >
                    <FileText className="w-3.5 h-3.5 mr-1.5" /> Lembar A4 ({filteredA4Assets.length} Tag)
                  </Button>
                </div>
                <Badge variant="secondary" className="font-bold text-[10px] uppercase">
                  {previewMode === 'thermal' ? 'Pratinjau Kertas 58mm' : `Grid ${a4GridCols} Kolom A4`}
                </Badge>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col items-center bg-slate-200 dark:bg-slate-800 p-6 rounded-b-lg min-h-[450px] overflow-x-auto">
                {previewMode === 'thermal' ? (
                  <div 
                      ref={printAreaRef}
                      className="bg-white text-black shadow-2xl flex items-center justify-center p-1 my-auto"
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
                ) : (
                  <div className="w-full flex flex-col items-center gap-4">
                    <div className="w-full flex items-center justify-between px-2 text-slate-700 dark:text-slate-300">
                      <p className="text-xs font-bold uppercase tracking-wider">
                        Departemen: <span className="text-indigo-600 dark:text-indigo-400 font-black">{a4Department === 'ALL' ? 'Semua Departemen' : a4Department}</span> ({a4BatchCards.length} Tag)
                      </p>
                      <Badge className="bg-indigo-600 text-white font-bold text-[10px]">A4 Portrait (210mm x 297mm)</Badge>
                    </div>

                    {isLoadingAssets ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-muted-foreground animate-pulse">Memuat Data Aset Database...</p>
                      </div>
                    ) : isGeneratingA4 ? (
                      <div className="py-20 flex flex-col items-center justify-center gap-3 w-full max-w-xs">
                        <Loader2 className="h-10 w-10 animate-spin text-indigo-600" />
                        <p className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-300 animate-pulse text-center">
                          Menyiapkan Kartu Aset A4 ({a4Progress.current} / {a4Progress.total})...
                        </p>
                        <div className="w-full bg-slate-300 dark:bg-slate-700 h-2.5 rounded-full overflow-hidden shadow-inner">
                          <div 
                            className="bg-indigo-600 h-full transition-all duration-150 rounded-full"
                            style={{ width: `${a4Progress.total > 0 ? (a4Progress.current / a4Progress.total) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ) : a4BatchCards.length === 0 ? (
                      <div className="py-20 text-center text-muted-foreground">
                        <FileText className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p className="text-xs font-bold">Tidak ada aset ditemukan untuk filter kategori/departemen ini.</p>
                      </div>
                    ) : (
                      <div 
                        ref={a4PrintRef}
                        className="w-full max-w-[720px] bg-white text-black p-6 shadow-2xl rounded-sm border border-slate-300 min-h-[900px] transition-all"
                        style={{ aspectRatio: '1 / 1.414' }}
                      >
                        <div 
                          className="w-full"
                          style={{ 
                            display: 'grid', 
                            gridTemplateColumns: `repeat(${a4GridCols}, minmax(0, 1fr))`, 
                            gap: '12px' 
                          }}
                        >
                          {a4BatchCards.map((item, idx) => (
                            <div key={idx} className="border border-slate-200 rounded p-1 bg-white shadow-sm hover:shadow-md transition-all flex items-center justify-center">
                              <img src={item.canvasUrl} alt={item.asset.name} className="w-full h-auto rounded-sm block" />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
            </CardContent>
           </Card>

           <Card>
            <CardContent className="p-6 flex flex-wrap gap-3">
              {previewMode === 'thermal' ? (
                <>
                  <Button onClick={handleBluetoothPrintDirect} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg font-black h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> CETAK BLUETOOTH</Button>
                  <Button onClick={handlePrint} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg font-black h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> CETAK BROWSER</Button>
                  {canShare && <Button onClick={handleShare} variant="outline" className="border-purple-500 text-purple-600 hover:bg-purple-50 h-12 px-8 rounded-xl"><Share2 className="w-4 h-4 mr-2"/> BAGIKAN</Button>}
                  <Button onClick={handleDownloadPdf} variant="secondary" className="font-bold h-12 px-8 rounded-xl"><Download className="w-4 h-4 mr-2"/> PDF</Button>
                </>
              ) : (
                <>
                  <Button onClick={handlePrintA4} className="bg-indigo-600 hover:bg-indigo-700 shadow-lg font-black h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> CETAK A4 (BROWSER)</Button>
                  <Button onClick={handleDownloadA4Pdf} className="bg-emerald-600 hover:bg-emerald-700 shadow-lg font-black h-12 px-8 rounded-xl"><Download className="w-4 h-4 mr-2"/> UNDUH PDF A4</Button>
                  <Button onClick={() => setPreviewMode('thermal')} variant="outline" className="font-bold h-12 px-8 rounded-xl"><Printer className="w-4 h-4 mr-2"/> KEMBALI KE THERMAL 58mm</Button>
                </>
              )}
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
