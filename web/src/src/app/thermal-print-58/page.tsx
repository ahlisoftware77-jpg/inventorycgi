

'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { doc, onSnapshot, Timestamp, collection, query, where, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { type Asset } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Printer, Share2, Download, RefreshCw, Type, Text, CaseSensitive, Loader2, Rows3, Columns3, MessageSquare, Eye, RotateCw, Copy, QrCode } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';
import DashboardLayout from '@/components/dashboard/layout';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Textarea } from '@/components/ui/textarea';
import JsBarcode from 'jsbarcode';
import QRCode from 'qrcode';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { Input } from '@/components/ui/input';

function ThermalPrintPageContent() {
  const { toast } = useToast();
  const printAreaRef = useRef<HTMLDivElement>(null);
  
  const searchParams = useSearchParams();
  const assetId = searchParams.get('assetId');

  const [allSearchableAssets, setAllSearchableAssets] = useState<Asset[]>([]);
  const [asset, setAsset] = useState<Asset | null>(null);
  const [asset2, setAsset2] = useState<Asset | null>(null);
  const [loadingAsset, setLoadingAsset] = useState(false);
  const [loadingAsset2, setLoadingAsset2] = useState(false);

  const [textToPrint, setTextToPrint] = useState('Pilih Aset');
  const [textToPrint2, setTextToPrint2] = useState('');

  const [suggestions, setSuggestions] = useState<Asset[]>([]);
  const [suggestions2, setSuggestions2] = useState<Asset[]>([]);
  
  // State for formatting options
  const [fontFamily, setFontFamily] = useState('Roboto Mono, monospace');
  const [fontSize, setFontSize] = useState(400);
  const [isBold, setIsBold] = useState(false);
  const [canShare, setCanShare] = useState(false);
  const [canvasUrl, setCanvasUrl] = useState<string | null>(null);
  const [canvasUrl2, setCanvasUrl2] = useState<string | null>(null);
  const [printType, setPrintType] = useState<'text' | 'barcode' | 'qrcode' | 'template' | 'custom'>('text');
  const [barcodeWidth, setBarcodeWidth] = useState(2.8);
  const [isRotated, setIsRotated] = useState(false);
  const [showBarcodeDetails, setShowBarcodeDetails] = useState(true);
  const [isSplitLayout, setIsSplitLayout] = useState(false);
  const [templateCodeFontSize, setTemplateCodeFontSize] = useState(65);
  const [templateNameFontSize, setTemplateNameFontSize] = useState(33);

  // States for Custom Layout
  const [customWidth, setCustomWidth] = useState(219); // 58mm
  const [customHeight, setCustomHeight] = useState(113); // 30mm
  const [customCodeType, setCustomCodeType] = useState<'barcode' | 'qrcode'>('barcode');
  const [customRotation, setCustomRotation] = useState(0);

  const [customElements, setCustomElements] = useState({
    name: { x: 110, y: 30, fontSize: 12, enabled: true },
    code: { x: 110, y: 50, fontSize: 20, enabled: true },
    location: { x: 110, y: 70, fontSize: 10, enabled: true },
    codeSymbol: { x: 110, y: 95, size: 50, enabled: true },
  });

  const handleCustomElementChange = (element: keyof typeof customElements, prop: string, value: number) => {
    setCustomElements(prev => ({
      ...prev,
      [element]: { ...prev[element], [prop]: value }
    }));
  };
   const handleCustomElementToggle = (element: keyof typeof customElements) => {
    setCustomElements(prev => ({
      ...prev,
      [element]: { ...prev[element], enabled: !prev[element].enabled }
    }));
  };

  // Load settings from localStorage on component mount
  useEffect(() => {
    const savedFontFamily = localStorage.getItem('thermalPrintFontFamily');
    const savedFontSize = localStorage.getItem('thermalPrintFontSize');
    const savedIsBold = localStorage.getItem('thermalPrintIsBold');
    const savedIsRotated = localStorage.getItem('thermalPrintIsRotated');
    const savedBarcodeWidth = localStorage.getItem('thermalPrintBarcodeWidth');
    const savedShowBarcodeDetails = localStorage.getItem('thermalShowBarcodeDetails');
    const savedTemplateCodeFontSize = localStorage.getItem('thermalPrintTemplateCodeFontSize');
    const savedTemplateNameFontSize = localStorage.getItem('thermalPrintTemplateNameFontSize');

    if (savedFontFamily) setFontFamily(savedFontFamily);
    if (savedFontSize) setFontSize(Number(savedFontSize));
    if (savedIsBold) setIsBold(savedIsBold === 'true');
    if (savedIsRotated) setIsRotated(savedIsRotated === 'true');
    if (savedBarcodeWidth) setBarcodeWidth(Number(savedBarcodeWidth));
    if (savedShowBarcodeDetails) setShowBarcodeDetails(savedShowBarcodeDetails === 'true');
    if (savedTemplateCodeFontSize) setTemplateCodeFontSize(Number(savedTemplateCodeFontSize));
    if (savedTemplateNameFontSize) setTemplateNameFontSize(Number(savedTemplateNameFontSize));
    
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
            console.error("Failed to fetch all assets for suggestions:", error);
        }
    };
    fetchAllAssets();

  }, []);

  // Fetch asset data if assetId is provided
  useEffect(() => {
    if (assetId) {
      setLoadingAsset(true);
      const docRef = doc(db, 'assets', assetId);
      const unsubscribe = onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
          const fetchedAsset = { id: docSnap.id, ...docSnap.data() } as Asset;
          setAsset(fetchedAsset);
          setTextToPrint(fetchedAsset.code || 'Kode Aset Kosong');
        } else {
          toast({ variant: 'destructive', title: 'Aset tidak ditemukan' });
          setAsset(null);
          setTextToPrint('Aset tidak ditemukan');
        }
        setLoadingAsset(false);
      }, (error) => {
        console.error("Error fetching asset:", error);
        toast({ variant: 'destructive', title: 'Gagal memuat aset' });
        setLoadingAsset(false);
      });
      return () => unsubscribe();
    } else {
      setTextToPrint('');
      setAsset(null);
    }
  }, [assetId, toast]);

    const handleInputChange = (value: string, inputIndex: 1 | 2) => {
        if (inputIndex === 1) {
            setTextToPrint(value);
            if (value.trim()) {
                const filtered = allSearchableAssets
                    .filter(a => a.code.toLowerCase().includes(value.toLowerCase().trim()))
                    .slice(0, 5);
                setSuggestions(filtered);
            } else {
                setSuggestions([]);
            }
            setAsset(allSearchableAssets.find(a => a.code === value.trim()) || null);
        } else {
            setTextToPrint2(value);
            if (value.trim()) {
                const filtered = allSearchableAssets
                    .filter(a => a.code.toLowerCase().includes(value.toLowerCase().trim()))
                    .slice(0, 5);
                setSuggestions2(filtered);
            } else {
                setSuggestions2([]);
            }
             setAsset2(allSearchableAssets.find(a => a.code === value.trim()) || null);
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

    // Find full asset details when textToPrint/textToPrint2 changes to an exact code
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


  // Save settings to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('thermalPrintFontFamily', fontFamily);
    localStorage.setItem('thermalPrintFontSize', String(fontSize));
    localStorage.setItem('thermalPrintIsBold', String(isBold));
    localStorage.setItem('thermalPrintIsRotated', String(isRotated));
    localStorage.setItem('thermalPrintBarcodeWidth', String(barcodeWidth));
    localStorage.setItem('thermalShowBarcodeDetails', String(showBarcodeDetails));
    localStorage.setItem('thermalPrintTemplateCodeFontSize', String(templateCodeFontSize));
    localStorage.setItem('thermalPrintTemplateNameFontSize', String(templateNameFontSize));
  }, [fontFamily, fontSize, isBold, isRotated, barcodeWidth, showBarcodeDetails, templateCodeFontSize, templateNameFontSize]);
  
  // Generate canvas with rotated text or barcode whenever settings or text changes
  useEffect(() => {
    const wrapText = (context: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth: number, lineHeight: number) => {
        const words = text.split(' ');
        let line = '';
        const lines: string[] = [];

        for(let n = 0; n < words.length; n++) {
            const testLine = line + words[n] + ' ';
            const metrics = context.measureText(testLine);
            const testWidth = metrics.width;
            if (testWidth > maxWidth && n > 0) {
                lines.push(line);
                line = words[n] + ' ';
            } else {
                line = testLine;
            }
        }
        lines.push(line);
        
        let currentY = y;
        if (lines.length > 1) {
          currentY -= (lines.length - 1) * lineHeight / 2;
        }
        
        for (let i = 0; i < lines.length; i++) {
            context.fillText(lines[i].trim(), x, currentY);
            currentY += lineHeight;
        }
    }
    
    const generateCanvas = async (text: string, assetForDetails: Asset | null, setCanvasFunc: (url: string | null) => void) => {
        setCanvasFunc(null);

        if (!text && printType !== 'template' && printType !== 'custom') return;
        if ((printType === 'template' || printType === 'custom') && !assetForDetails) return;


        try {
            let finalCanvas: HTMLCanvasElement;

            if (printType === 'custom') {
              finalCanvas = document.createElement('canvas');
              finalCanvas.width = customWidth;
              finalCanvas.height = customHeight;
              const ctx = finalCanvas.getContext('2d');
              if (!ctx || !assetForDetails) return;

              ctx.fillStyle = 'white';
              ctx.fillRect(0, 0, customWidth, customHeight);
              ctx.fillStyle = 'black';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              
              ctx.save();
              ctx.translate(customWidth / 2, customHeight / 2);
              ctx.rotate(customRotation * Math.PI / 180);
              ctx.translate(-customWidth / 2, -customHeight / 2);

              if (customElements.name.enabled) {
                ctx.font = `bold ${customElements.name.fontSize}px Arial`;
                ctx.fillText(assetForDetails.name, customElements.name.x, customElements.name.y);
              }
              if (customElements.code.enabled) {
                ctx.font = `bold ${customElements.code.fontSize}px Arial`;
                ctx.fillText(assetForDetails.code, customElements.code.x, customElements.code.y);
              }
              if (customElements.location.enabled) {
                ctx.font = `${customElements.location.fontSize}px Arial`;
                ctx.fillText(assetForDetails.location, customElements.location.x, customElements.location.y);
              }

              if (customElements.codeSymbol.enabled) {
                  const codeCanvas = document.createElement('canvas');
                  if (customCodeType === 'barcode') {
                      JsBarcode(codeCanvas, assetForDetails.code, { displayValue: false, height: 40, width: 2, margin: 0 });
                  } else {
                      const qrCodeDataUrl = await QRCode.toDataURL(JSON.stringify({ assetId: assetForDetails.id, assetCode: assetForDetails.code }), { width: customElements.codeSymbol.size, margin: 1 });
                      const img = new Image();
                      img.src = qrCodeDataUrl;
                      await img.decode();
                      codeCanvas.width = img.width;
                      codeCanvas.height = img.height;
                      codeCanvas.getContext('2d')?.drawImage(img, 0, 0);
                  }
                  // Draw code centered on its x,y coords
                  const drawX = customElements.codeSymbol.x - codeCanvas.width / 2;
                  const drawY = customElements.codeSymbol.y - codeCanvas.height / 2;
                  ctx.drawImage(codeCanvas, drawX, drawY);
              }
              
              ctx.restore();

            } else if (printType === 'barcode' || printType === 'qrcode') {
                const codeCanvas = document.createElement('canvas');
                if (printType === 'barcode') {
                    JsBarcode(codeCanvas, text, {
                        format: "CODE128", height: 60, width: barcodeWidth, displayValue: false, margin: 0,
                    });
                } else { // qrcode
                    const qrCodeDataUrl = await QRCode.toDataURL(text, { width: 120, margin: 1, errorCorrectionLevel: 'H' });
                    const img = new window.Image();
                    const promise = new Promise<void>((resolve, reject) => {
                      img.onload = () => {
                        codeCanvas.width = img.width;
                        codeCanvas.height = img.height;
                        codeCanvas.getContext('2d')?.drawImage(img, 0, 0);
                        resolve();
                      };
                      img.onerror = reject;
                    });
                    img.src = qrCodeDataUrl;
                    await promise;
                }

                if (showBarcodeDetails && assetForDetails) {
                    const tempDiv = document.createElement('div');
                    tempDiv.style.display = 'inline-block';
                    tempDiv.style.padding = '10px';
                    tempDiv.style.backgroundColor = 'white';
                    tempDiv.style.textAlign = 'center';

                    const nameP = document.createElement('p');
                    nameP.innerText = assetForDetails.name;
                    nameP.style.margin = '0';
                    nameP.style.fontWeight = 'bold';
                    nameP.style.fontSize = '20px';

                    const locationP = document.createElement('p');
                    locationP.innerText = assetForDetails.location;
                    locationP.style.margin = '0 0 5px 0';
                    locationP.style.fontSize = '18px';
                    
                    const codeDiv = document.createElement('div');
                    codeDiv.style.display = 'flex';
                    codeDiv.style.justifyContent = 'center';
                    codeDiv.appendChild(codeCanvas);

                    const codeP = document.createElement('p');
                    codeP.innerText = assetForDetails.code;
                    codeP.style.margin = '5px 0 0 0';
                    codeP.style.fontWeight = 'bold';
                    codeP.style.fontSize = '45px';

                    tempDiv.appendChild(nameP);
                    tempDiv.appendChild(locationP);
                    tempDiv.appendChild(codeDiv);
                    tempDiv.appendChild(codeP);

                    document.body.appendChild(tempDiv);
                    finalCanvas = await html2canvas(tempDiv, {backgroundColor: '#ffffff'});
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
                
                // Location (rotated)
                ctx.save();
                ctx.textAlign = 'center';
                ctx.font = 'bold 32px Arial';
                ctx.translate(55, height / 2);
                ctx.rotate(-Math.PI / 2);
                ctx.fillText(assetForDetails.location, 0, 0);
                ctx.restore();

                // Asset Name
                ctx.font = `bold ${templateNameFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                const lineXStart = 110;
                const lineXEnd = width - 165 - 10;
                const textAreaWidth = lineXEnd - lineXStart;
                wrapText(ctx, assetForDetails.name, 110 + textAreaWidth / 2, height * 0.25, textAreaWidth - 20, templateNameFontSize + 5);

                // Asset Code
                ctx.font = `bold ${templateCodeFontSize}px Arial`;
                ctx.textAlign = 'center';
                ctx.textBaseline = 'middle';
                wrapText(ctx, assetForDetails.code, 110 + textAreaWidth / 2, 165, textAreaWidth - 20, templateCodeFontSize + 5);
                
                // Draw lines
                ctx.strokeStyle = 'black';
                ctx.lineWidth = 5;
                const linePadding = 10;
                ctx.beginPath();
                ctx.moveTo(lineXStart, linePadding); // Vertical line 1
                ctx.lineTo(lineXStart, height - linePadding);
                ctx.moveTo(lineXStart, linePadding); // Top horizontal line
                ctx.lineTo(lineXEnd, linePadding);
                ctx.moveTo(lineXStart, height / 2); // Middle horizontal line
                ctx.lineTo(lineXEnd, height / 2); 
                ctx.moveTo(lineXStart, height - linePadding); // Bottom horizontal line
                ctx.lineTo(lineXEnd, height - linePadding);
                ctx.moveTo(lineXEnd, linePadding); // Vertical line 2
                ctx.lineTo(lineXEnd, height - linePadding);
                ctx.stroke();

                // QR Code
                const qrCodeSize = 155;
                const qrCodeDataUrl = await QRCode.toDataURL(assetForDetails.code, { width: qrCodeSize, margin: 1 });
                const qrImg = new Image();
                qrImg.src = qrCodeDataUrl;
                await qrImg.decode();
                ctx.drawImage(qrImg, width - 165, Math.floor((height - qrCodeSize) / 2), qrCodeSize, qrCodeSize);
                
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
            
            } else { // 'text'
                finalCanvas = document.createElement('canvas');
                const ctx = finalCanvas.getContext('2d');
                if (!ctx) return;

                const fontWeight = isBold ? 'bold' : 'normal';
                let effectiveFontSize = fontSize;
                let font = `${fontWeight} ${effectiveFontSize}px ${fontFamily}`;

                if (document.fonts) {
                    await document.fonts.load(font);
                }

                if (fontSize === 400) { // Auto-fit logic for max font size
                    const paperWidth = 219; // 58mm at 96 DPI
                    ctx.font = font;
                    let textWidth = ctx.measureText(text).width;
                    
                    while (textWidth > paperWidth - 20 && effectiveFontSize > 8) {
                        effectiveFontSize -= 2;
                        font = `${fontWeight} ${effectiveFontSize}px ${fontFamily}`;
                        ctx.font = font;
                        textWidth = ctx.measureText(text).width;
                    }
                }
                
                ctx.font = font;
                const textMetrics = ctx.measureText(text);
                const padding = 20;

                // Adjust canvas size for rotation
                finalCanvas.width = effectiveFontSize + padding;
                // Add extra padding to height (which becomes width after rotation)
                finalCanvas.height = textMetrics.width + padding + 10;

                // Reset context for drawing
                ctx.font = font;
                ctx.fillStyle = 'black';
                ctx.textBaseline = 'middle';
                ctx.textAlign = 'center';
                
                // Translate and rotate
                let yOffset = effectiveFontSize > 200 ? 5 : 0;
                if (fontFamily === 'Oswald, sans-serif') {
                  yOffset += 5; // Add an additional offset for Oswald font
                }
                ctx.translate(finalCanvas.width / 2, (finalCanvas.height / 2) + yOffset);
                ctx.rotate(Math.PI / 2);
                ctx.fillText(text, 0, 0);
            }

            // Rotation logic for all types
            if (isRotated && printType !== 'text' && printType !== 'template') { // Text and Template are pre-rotated
                const rotatedCanvas = document.createElement('canvas');
                const ctx = rotatedCanvas.getContext('2d');
                if (!ctx) return;
                
                rotatedCanvas.width = finalCanvas.height;
                rotatedCanvas.height = finalCanvas.width;
                
                ctx.translate(rotatedCanvas.width / 2, rotatedCanvas.height / 2);
                ctx.rotate(Math.PI / 2);
                ctx.drawImage(finalCanvas, -finalCanvas.width / 2, -finalCanvas.height / 2);
                
                setCanvasFunc(rotatedCanvas.toDataURL('image/png'));
            } else {
                setCanvasFunc(finalCanvas.toDataURL('image/png'));
            }

        } catch (e) {
            console.error("Canvas generation error:", e);
            if (e instanceof Error && e.name === 'InvalidInputError') {
                 setCanvasFunc(null);
            }
        }
    }
    
    generateCanvas(textToPrint, asset, setCanvasUrl);
    if(isSplitLayout) {
        generateCanvas(textToPrint2, asset2, setCanvasUrl2);
    } else {
        setCanvasUrl2(null); // Clear second canvas if not in split layout
    }

  }, [textToPrint, textToPrint2, fontSize, fontFamily, isBold, printType, barcodeWidth, isRotated, showBarcodeDetails, asset, asset2, isSplitLayout, templateCodeFontSize, templateNameFontSize, customWidth, customHeight, customElements, customCodeType, customRotation]);

  
  const resetFormatting = () => {
    setFontFamily('Roboto Mono, monospace');
    setFontSize(400);
    setIsBold(false);
    setPrintType('text');
    setBarcodeWidth(2.8);
    setIsRotated(false);
    setShowBarcodeDetails(true);
    setIsSplitLayout(false);
    setTemplateCodeFontSize(65);
    setTemplateNameFontSize(33);
    toast({ title: 'Format Direset', description: 'Pengaturan format telah dikembalikan ke default.' });
  };

  const handlePrint = async () => {
    const elementToPrint = printAreaRef.current;
    if (!elementToPrint) return;
  
    try {
      // Use scrollHeight to capture the full content height, not just the visible part
      const canvas = await html2canvas(elementToPrint, {
        backgroundColor: '#ffffff',
        scale: 3,
        width: elementToPrint.scrollWidth,
        height: elementToPrint.scrollHeight,
      });
      const imgData = canvas.toDataURL('image/png');
  
      const printWindow = window.open('', '', 'width=300,height=500');
      if (!printWindow) {
        toast({
          variant: 'destructive',
          title: 'Gagal Membuka Jendela Cetak',
          description: 'Mohon izinkan pop-up untuk situs ini.',
        });
        return;
      }
  
      printWindow.document.write('<html><head><title>Cetak Struk</title>');
      printWindow.document.write('<style>@page { size: 58mm auto; margin: 1mm; } body { margin: 0; } img { width: 100%; height: auto; }</style>');
      printWindow.document.write('</head><body>');
      printWindow.document.write(`<img src="${imgData}" />`);
      printWindow.document.write('</body></html>');
  
      printWindow.document.close();
  
      const printAndClose = () => {
        printWindow.print();
        printWindow.close();
      };
  
      // Wait for the image to load in the new window before printing
      printWindow.onload = () => {
        // A short delay can sometimes help ensure content is fully rendered
        setTimeout(printAndClose, 250);
      };
  
      // Fallback if onload doesn't fire (e.g., for data URIs in some browsers)
      if (printWindow.document.readyState === 'complete') {
        setTimeout(printAndClose, 250);
      }
  
    } catch (error) {
      console.error('Error handling print:', error);
      toast({ variant: 'destructive', title: 'Gagal Mencetak', description: 'Terjadi kesalahan saat mempersiapkan cetakan.' });
    }
  };

  const handleShare = async () => {
    const elementToShare = printAreaRef.current;
    if (!elementToShare) {
        toast({ variant: 'destructive', title: 'Gagal', description: 'Area pratinjau tidak ditemukan.' });
        return;
    }
    if (!navigator.share) {
        toast({ variant: 'destructive', title: 'Tidak Didukung', description: 'Browser Anda tidak mendukung fitur berbagi.' });
        return;
    }

    try {
        const canvas = await html2canvas(elementToShare, {
            backgroundColor: '#ffffff',
            scale: 2, // Use a good scale for quality
            width: elementToShare.scrollWidth,
            height: elementToShare.scrollHeight,
        });

        const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
        
        if (!blob) {
            throw new Error('Gagal membuat gambar untuk dibagikan.');
        }

        const file = new File([blob], 'struk-aset.png', { type: 'image/png' });
        await navigator.share({
            title: 'Struk Aset',
            text: `Kode: ${textToPrint}`,
            files: [file],
        });
    } catch (error: any) {
        if (error.name !== 'AbortError') {
             toast({ variant: 'destructive', title: 'Gagal Berbagi', description: error.message || 'Terjadi kesalahan saat mencoba berbagi.' });
        }
    }
  };
  
  const handleDownloadPdf = async () => {
    if (!printAreaRef.current) return;
    try {
      const canvas = await html2canvas(printAreaRef.current, { 
        backgroundColor: '#ffffff', 
        scale: 3,
        width: printAreaRef.current.scrollWidth,
        height: printAreaRef.current.scrollHeight
      });
      const imgData = canvas.toDataURL('image/png');
      
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: [58, canvas.height * 58 / canvas.width] // width 58mm, height is proportional
      });
      
      pdf.addImage(imgData, 'PNG', 0, 0, 58, pdf.internal.pageSize.getHeight());
      pdf.save('struk-transaksi.pdf');
    } catch (error) {
      toast({ variant: 'destructive', title: 'Gagal Mengunduh', description: 'Terjadi kesalahan saat membuat file PDF.' });
    }
  };

  const AssetDetailsView = ({ assetData, loading }: { assetData: Asset | null, loading: boolean }) => {
    if (loading) {
        return <div className="text-sm text-muted-foreground mt-2">Mencari...</div>;
    }
    if (!assetData) {
        return null;
    }
    return (
        <div className="text-sm text-muted-foreground mt-2 p-2 bg-muted rounded-md">
            <p className="font-semibold">{assetData.name}</p>
            <p>{assetData.location}</p>
        </div>
    );
  };
  
  const SuggestionsList = ({ suggestions, onClick }: { suggestions: Asset[], onClick: (asset: Asset) => void }) => {
    if (suggestions.length === 0) return null;
    return (
        <ul className="absolute z-10 w-full bg-white border border-border rounded-md mt-1 shadow-lg max-h-40 overflow-y-auto">
            {suggestions.map(asset => (
                <li 
                    key={asset.id} 
                    className="p-2 cursor-pointer hover:bg-accent text-foreground"
                    onClick={() => onClick(asset)}
                >
                    <p className="font-semibold">{asset.code}</p>
                    <p className="text-xs text-muted-foreground">{asset.name}</p>
                </li>
            ))}
        </ul>
    );
  };
  
  const CustomElementSlider = ({ label, value, onChange, min, max, step = 1 }: { label: string, value: number, onChange: (val: number) => void, min: number, max: number, step?: number }) => (
    <div className="space-y-2">
      <Label className="text-xs">{label}: {value}</Label>
      <Slider value={[value]} onValueChange={(v) => onChange(v[0])} min={min} max={max} step={step} />
    </div>
  );

  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Settings Panel */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle>Pengaturan Cetak Thermal</CardTitle>
              <CardDescription>Sesuaikan format tampilan struk sebelum dicetak atau dibagikan.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 relative">
                <Label htmlFor="manual-input" className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/>Teks untuk Dicetak</Label>
                <Textarea
                  id="manual-input"
                  value={textToPrint}
                  onChange={(e) => handleInputChange(e.target.value, 1)}
                  placeholder="Masukkan teks atau kode aset..."
                  className="min-h-[100px] text-lg"
                />
                <SuggestionsList suggestions={suggestions} onClick={(asset) => handleSuggestionClick(asset, 1)} />
                <AssetDetailsView assetData={asset} loading={loadingAsset} />
              </div>

               <div className="flex items-center space-x-2">
                  <Switch id="split-layout" checked={isSplitLayout} onCheckedChange={setIsSplitLayout} />
                  <Label htmlFor="split-layout" className="flex items-center"><Copy className="w-4 h-4 mr-2"/>Layout Terpisah (2 Kode)</Label>
              </div>
              
              {isSplitLayout && (
                 <div className="space-y-2 animate-in fade-in-50 relative">
                    <Label htmlFor="manual-input-2" className="flex items-center"><MessageSquare className="w-4 h-4 mr-2"/>Teks Kedua</Label>
                    <Textarea
                        id="manual-input-2"
                        value={textToPrint2}
                        onChange={(e) => handleInputChange(e.target.value, 2)}
                        placeholder="Masukkan teks kedua..."
                        className="min-h-[100px] text-lg"
                    />
                    <SuggestionsList suggestions={suggestions2} onClick={(asset) => handleSuggestionClick(asset, 2)} />
                    <AssetDetailsView assetData={asset2} loading={loadingAsset2} />
                </div>
              )}
              
              <Separator/>

              <Accordion type="single" collapsible defaultValue="item-1">
                <AccordionItem value="item-1">
                  <AccordionTrigger>Opsi Tipe Cetak</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                     <div className="space-y-2">
                        <Label htmlFor="print-type" className="flex items-center"><Rows3 className="w-4 h-4 mr-2"/>Tipe Cetak</Label>
                        <Select value={printType} onValueChange={(v) => setPrintType(v as 'text' | 'barcode' | 'qrcode' | 'template' | 'custom')}>
                            <SelectTrigger id="print-type"><SelectValue /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="text">Teks</SelectItem>
                                <SelectItem value="barcode">Barcode</SelectItem>
                                <SelectItem value="qrcode">QR Code</SelectItem>
                                <SelectItem value="template">Template Label Aset</SelectItem>
                                <SelectItem value="custom">Custom</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                  </AccordionContent>
                </AccordionItem>
                <AccordionItem value="item-2">
                  <AccordionTrigger>Opsi Format</AccordionTrigger>
                  <AccordionContent className="space-y-4 pt-4">
                     {printType === 'text' && (
                        <div className="space-y-6 animate-in fade-in-50">
                           <div className="space-y-2">
                              <Label htmlFor="font-family" className="flex items-center"><Type className="w-4 h-4 mr-2"/>Jenis Font</Label>
                              <Select value={fontFamily} onValueChange={setFontFamily}>
                                <SelectTrigger id="font-family"><SelectValue /></SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Roboto Mono, monospace">Roboto Mono</SelectItem>
                                  <SelectItem value="Courier Prime, monospace">Courier Prime</SelectItem>
                                  <SelectItem value="Spline Sans Mono, monospace">Spline Sans Mono</SelectItem>
                                  <SelectItem value="Source Code Pro, monospace">Source Code Pro</SelectItem>
                                  <SelectItem value="IBM Plex Mono, monospace">IBM Plex Mono</SelectItem>
                                  <SelectItem value="Oswald, sans-serif">Oswald</SelectItem>
                                  <SelectItem value="'Arial', sans-serif">Arial</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="font-size" className="flex items-center">
                                    <Text className="w-4 h-4 mr-2" />
                                    Ukuran Font: {fontSize === 400 ? 'Otomatis' : `${fontSize}px`}
                                </Label>
                                <Slider
                                    id="font-size"
                                    min={8}
                                    max={400}
                                    step={1}
                                    value={[fontSize]}
                                    onValueChange={(v) => setFontSize(v[0])}
                                />
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="font-bold" checked={isBold} onCheckedChange={setIsBold} />
                                <Label htmlFor="font-bold" className="flex items-center"><CaseSensitive className="w-4 h-4 mr-2"/>Tebal (Bold)</Label>
                            </div>
                        </div>
                      )}
                       {(printType === 'barcode' || printType === 'qrcode') && (
                        <div className="space-y-6 animate-in fade-in-50">
                            {printType === 'barcode' && (
                                <div className="space-y-2">
                                  <Label htmlFor="barcode-width" className="flex items-center"><Columns3 className="w-4 h-4 mr-2"/>Lebar Barcode: {barcodeWidth}</Label>
                                  <Slider id="barcode-width" min={1} max={4} step={0.1} value={[barcodeWidth]} onValueChange={(v) => setBarcodeWidth(v[0])} />
                                </div>
                            )}
                             <div className="flex items-center space-x-2">
                                <Switch id="barcode-details" checked={showBarcodeDetails} onCheckedChange={setShowBarcodeDetails} />
                                <Label htmlFor="barcode-details" className="flex items-center"><Eye className="w-4 h-4 mr-2"/>Tampilkan Detail</Label>
                            </div>
                            <div className="flex items-center space-x-2">
                                <Switch id="barcode-rotate" checked={isRotated} onCheckedChange={setIsRotated} />
                                <Label htmlFor="barcode-rotate" className="flex items-center"><RotateCw className="w-4 h-4 mr-2"/>Rotasi 90°</Label>
                            </div>
                        </div>
                      )}
                       {printType === 'template' && (
                        <div className="space-y-6 animate-in fade-in-50">
                            <div className="space-y-2">
                                <Label htmlFor="template-name-font-size" className="flex items-center">
                                    <Text className="w-4 h-4 mr-2" />
                                    Ukuran Font Nama Aset: {templateNameFontSize}px
                                </Label>
                                <Slider
                                    id="template-name-font-size"
                                    min={20}
                                    max={50}
                                    step={1}
                                    value={[templateNameFontSize]}
                                    onValueChange={(v) => setTemplateNameFontSize(v[0])}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="template-code-font-size" className="flex items-center">
                                    <Text className="w-4 h-4 mr-2" />
                                    Ukuran Font Kode Aset: {templateCodeFontSize}px
                                </Label>
                                <Slider
                                    id="template-code-font-size"
                                    min={20}
                                    max={100}
                                    step={1}
                                    value={[templateCodeFontSize]}
                                    onValueChange={(v) => setTemplateCodeFontSize(v[0])}
                                />
                            </div>
                        </div>
                      )}
                      {printType === 'custom' && (
                        <div className="space-y-4 animate-in fade-in-50">
                          <div className="grid grid-cols-2 gap-4">
                            <CustomElementSlider label="Lebar Kanvas" value={customWidth} onChange={setCustomWidth} min={50} max={500} />
                            <CustomElementSlider label="Tinggi Kanvas" value={customHeight} onChange={setCustomHeight} min={50} max={500} />
                          </div>
                           <div className="space-y-2">
                                <Label htmlFor="custom-rotation">Rotasi Global (°)</Label>
                                <Input
                                    id="custom-rotation"
                                    type="number"
                                    value={customRotation}
                                    onChange={(e) => setCustomRotation(Number(e.target.value))}
                                    min={-180}
                                    max={180}
                                    className="w-full"
                                />
                            </div>
                          <Separator/>
                          {Object.keys(customElements).map(key => {
                            const elKey = key as keyof typeof customElements;
                            if (elKey === 'codeSymbol') return null; // Handle symbol separately
                            return (
                              <div key={key} className="p-2 border rounded space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label className="capitalize font-semibold">{key}</Label>
                                  <Switch checked={customElements[elKey].enabled} onCheckedChange={() => handleCustomElementToggle(elKey)} />
                                </div>
                                {customElements[elKey].enabled && (
                                  <div className="grid grid-cols-2 gap-4">
                                    <CustomElementSlider label="Posisi X" value={customElements[elKey].x} onChange={(v) => handleCustomElementChange(elKey, 'x', v)} min={0} max={customWidth} />
                                    <CustomElementSlider label="Posisi Y" value={customElements[elKey].y} onChange={(v) => handleCustomElementChange(elKey, 'y', v)} min={0} max={customHeight} />
                                    <CustomElementSlider label="Ukuran Font" value={customElements[elKey].fontSize} onChange={(v) => handleCustomElementChange(elKey, 'fontSize', v)} min={8} max={100} />
                                  </div>
                                )}
                              </div>
                            )
                          })}
                          <div className="p-2 border rounded space-y-2">
                             <div className="flex items-center justify-between">
                                <Label className="capitalize font-semibold">Simbol Kode</Label>
                                <Switch checked={customElements.codeSymbol.enabled} onCheckedChange={() => handleCustomElementToggle('codeSymbol')} />
                              </div>
                              {customElements.codeSymbol.enabled && (
                                <>
                                 <Select value={customCodeType} onValueChange={(v) => setCustomCodeType(v as 'barcode' | 'qrcode')}>
                                    <SelectTrigger><SelectValue/></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="barcode">Barcode</SelectItem>
                                      <SelectItem value="qrcode">QR Code</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <div className="grid grid-cols-2 gap-4">
                                      <CustomElementSlider label="Posisi X" value={customElements.codeSymbol.x} onChange={(v) => handleCustomElementChange('codeSymbol', 'x', v)} min={0} max={customWidth} />
                                      <CustomElementSlider label="Posisi Y" value={customElements.codeSymbol.y} onChange={(v) => handleCustomElementChange('codeSymbol', 'y', v)} min={0} max={customHeight} />
                                      <CustomElementSlider label="Ukuran" value={customElements.codeSymbol.size} onChange={(v) => handleCustomElementChange('codeSymbol', 'size', v)} min={20} max={200} />
                                  </div>
                                </>
                              )}
                          </div>
                        </div>
                      )}
                  </AccordionContent>
                </AccordionItem>
              </Accordion>
              
              <Separator/>
              <Button variant="outline" onClick={resetFormatting} className="w-full">
                <RefreshCw className="w-4 h-4 mr-2"/> Reset Format
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Preview and Actions */}
        <div className="lg:col-span-2 flex flex-col gap-6">
           <Card className="flex-grow">
            <CardHeader>
                <CardTitle>Pratinjau Struk</CardTitle>
            </CardHeader>
            <CardContent className="flex justify-center items-center bg-gray-200 dark:bg-gray-800 p-6 rounded-lg min-h-[200px]">
              {(loadingAsset || loadingAsset2) && printType !== 'text' ? (
                <div className="flex items-center justify-center h-full w-[219px] bg-white text-black p-2 shadow-md">
                  <Loader2 className="w-8 h-8 animate-spin" />
                </div>
              ) : (
                <div 
                    id="print-area"
                    ref={printAreaRef}
                    className="bg-white text-black shadow-md flex items-center justify-center"
                    style={{
                      width: printType === 'custom' ? `${customWidth}px` : 'auto',
                      height: printType === 'custom' ? `${customHeight}px` : 'auto',
                      minWidth: '58mm',
                      minHeight: '50px',
                      padding: '2px',
                      flexDirection: isSplitLayout ? 'row' : 'column',
                      gap: isSplitLayout ? '4px' : '0',
                    }}
                >
                  {canvasUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img 
                        src={canvasUrl} 
                        alt={`Pratinjau untuk ${textToPrint}`}
                        style={{ maxWidth: isSplitLayout ? '50%' : '100%', height: 'auto' }}
                     />
                  ) : (
                    printType !== 'text' 
                        ? <p className="text-red-500 text-sm p-4">Input tidak valid untuk {printType}</p> 
                        : <Loader2 className="w-8 h-8 animate-spin" />
                  )}
                  {isSplitLayout && (
                    canvasUrl2 ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img 
                            src={canvasUrl2} 
                            alt={`Pratinjau untuk ${textToPrint2}`}
                            style={{ maxWidth: '50%', height: 'auto' }}
                        />
                    ) : (
                        printType !== 'text' 
                            ? <p className="text-red-500 text-sm p-4">Input kedua tidak valid</p> 
                            : <div style={{width: '50%'}}><Loader2 className="w-8 h-8 animate-spin mx-auto" /></div>
                    )
                  )}
                </div>
              )}
            </CardContent>
           </Card>
           <Card>
             <CardHeader>
                <CardTitle>Aksi</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
                <Button onClick={handlePrint}><Printer className="w-4 h-4 mr-2"/> Print Struk</Button>
                {canShare && <Button onClick={handleShare} variant="secondary" className="bg-green-600 hover:bg-green-700 text-white"><Share2 className="w-4 h-4 mr-2"/> Bagikan</Button>}
                <Button onClick={handleDownloadPdf} variant="outline"><Download className="w-4 h-4 mr-2"/> Download PDF</Button>
            </CardContent>
           </Card>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function ThermalPrintPage() {
    return (
        <Suspense>
            <ThermalPrintPageContent />
        </Suspense>
    );
}


    

    




    











    


























