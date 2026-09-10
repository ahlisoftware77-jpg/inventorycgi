'use client';
import React, { useEffect, useState, Suspense } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useSearchParams } from 'next/navigation';

function PreviewContent() {
    const searchParams = useSearchParams();
    const id = searchParams.get('id');
    const darNoParam = searchParams.get('darNo');
    const [report, setReport] = useState<any>(null);
    const [images, setImages] = useState<{ id: string; name: string }[]>([]);
    const [imagesLoaded, setImagesLoaded] = useState(false);
    const [loading, setLoading] = useState(true);

    const shareId = searchParams.get('shareId');
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [passcode, setPasscode] = useState('');
    const [error, setError] = useState(false);
    const [isChecking, setIsChecking] = useState(false);
    const [initialCheckDone, setInitialCheckDone] = useState(false);

    useEffect(() => {
        if (!shareId) {
            setIsAuthenticated(true);
            setInitialCheckDone(true);
        } else {
            setInitialCheckDone(true);
        }
    }, [shareId]);

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!shareId) return;
        setIsChecking(true);
        setError(false);
        try {
            const docRef = doc(db, "shared_links", shareId);
            const snap = await getDoc(docRef);
            if (!snap.exists()) {
                setError(true);
                setIsChecking(false);
                return;
            }
            const data = snap.data();
            if (data.expiresAt && new Date() > new Date(data.expiresAt)) {
                alert("Link Kedaluwarsa");
                setIsChecking(false);
                return;
            }
            const msgBuffer = new TextEncoder().encode(passcode);
            const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
            const hashArray = Array.from(new Uint8Array(hashBuffer));
            const hashedInput = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
            
            if (hashedInput === data.hashedPasscode) {
                setIsAuthenticated(true);
            } else {
                setError(true);
            }
        } catch (err) {
            console.error(err);
            setError(true);
        }
        setIsChecking(false);
    };

    useEffect(() => {
        const fetchReport = async () => {
            if (!id && !darNoParam) return;
            try {
                if (id) {
                    const docRef = doc(db, 'form_dar', id as string);
                    const snap = await getDoc(docRef);
                    if (snap.exists()) {
                        setReport(snap.data());
                    }
                } else if (darNoParam) {
                    const { collection, query, where, getDocs } = await import('firebase/firestore');
                    const qDar = query(collection(db, "form_dar"), where("darNo", "==", darNoParam));
                    const snapDar = await getDocs(qDar);
                    if (!snapDar.empty) {
                        setReport(snapDar.docs[0].data());
                    }
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchReport();
    }, [id, darNoParam]);

    useEffect(() => {
        const fetchImages = async () => {
            if (!report?.darNo) return;
            try {
                const { collection, query, where, getDocs } = await import('firebase/firestore');
                const q = query(collection(db, "register_design"), where("darNo", "==", report.darNo));
                const snap = await getDocs(q);
                const fetchedImages = snap.docs.map((doc, idx) => {
                    const data = doc.data();
                    let sizeStr = "";
                    if (data.sizeChecks) {
                        sizeStr = data.sizeChecks.split(',').map((s: string) => {
                            const trimmed = s.trim();
                            if (trimmed === 'Custom cm') return `Size ${data.sizeCm1 || 0}x${data.sizeCm2 || 0}`;
                            if (trimmed === 'Faces') return `Faces ${data.sizeFaces || ''}`;
                            return trimmed;
                        }).join(', ');
                    }
                    
                    let name = data.designImageName || `Gambar ${data.designNo || idx + 1}`;
                    name = name.replace(/\.(jpg|jpeg|png)$/i, '');
                    
                    if (sizeStr) {
                        name = `${sizeStr} ${name}`;
                    }

                    return {
                        id: data.designImage,
                        name: name
                    };
                }).filter(img => img.id);
                setImages(fetchedImages);
            } catch (e) {
                console.error("Gagal memuat gambar", e);
            } finally {
                setImagesLoaded(true);
            }
        };
        fetchImages();
    }, [report?.darNo]);

    useEffect(() => {
        if (searchParams.get('print') === 'true' && report && imagesLoaded) {
            const timer = setTimeout(() => {
                window.print();
            }, 500); // Wait for DOM to paint
            return () => clearTimeout(timer);
        }
    }, [searchParams, report, imagesLoaded]);

    if (!initialCheckDone) return null;
    
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
                <div className="w-full max-w-md bg-white rounded-xl shadow-xl border border-slate-200 p-6">
                    <div className="space-y-1 text-center pb-6">
                        <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-6 h-6 text-blue-600"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
                        </div>
                        <h2 className="text-2xl font-bold tracking-tight">Preview DAR Terkunci</h2>
                        <p className="text-slate-500">Silakan masukkan passcode untuk melihat dokumen ini.</p>
                    </div>
                    <div>
                        <form onSubmit={handleLogin} className="space-y-4">
                            <div className="space-y-2">
                                <input 
                                    type="password" 
                                    placeholder="Masukkan passcode" 
                                    value={passcode}
                                    onChange={(e) => {
                                        setPasscode(e.target.value);
                                        setError(false);
                                    }}
                                    className={`flex h-10 w-full rounded-md border bg-transparent px-3 py-2 text-sm text-center text-lg tracking-widest outline-none ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 ${error ? 'border-red-500 focus-visible:ring-red-500' : 'border-input'}`}
                                />
                                {error && <p className="text-sm text-red-500 text-center font-medium">Passcode salah atau link tidak valid.</p>}
                            </div>
                            <button type="submit" disabled={isChecking || !passcode} className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 w-full bg-blue-600 hover:bg-blue-700 h-11 text-base text-white">
                                {isChecking ? <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5 animate-spin"><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="4.93" y1="4.93" x2="7.76" y2="7.76"></line><line x1="16.24" y1="16.24" x2="19.07" y2="19.07"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line><line x1="4.93" y1="19.07" x2="7.76" y2="16.24"></line><line x1="16.24" y1="7.76" x2="19.07" y2="4.93"></line></svg> : (
                                    <>Buka Preview <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 ml-2"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg></>
                                )}
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        );
    }

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100">Memuat preview...</div>;
    if (!report) return <div className="flex items-center justify-center h-screen bg-slate-100">Form tidak ditemukan</div>;

    // Destructure all required variables from the report with default values
    const {
        darNo = '', type = [], requiredDate = '', closingDate = '', sizeChecks = [], sizeFaces = '', sizeCm1 = '', sizeCm2 = '',
        glazeChecks = [], glazeResidue = '', surfaceChecks = [], surfaceTemp = '', guPtv = [], guPtvChecks = [], inkChecks = [], inkOther = '', sendBy = [],
        items = [], numColumns = 32, note2Rows = [], lastDesignSupp = [], feedbackRows = [], signatures = {},
        customer = '', entryDate = '', designer = '', technician = '', purpose = '', designNo = '',
        benefit = '', lastTimeReq = '', feedback = '', generalNote = ''
    } = report;

    return (
        <div className="min-h-screen bg-slate-200 print:bg-white py-6 sm:py-10 print:py-0 w-full">
            <style dangerouslySetInnerHTML={{__html: `
                @font-face {
                    font-family: 'CGIFont';
                    src: url('/cgi.otf') format('opentype');
                    font-weight: normal;
                    font-style: normal;
                }
                body { margin: 0; padding: 0; background: #e2e8f0; }
                .print-section { transform-origin: top left; transform: scale(1); margin: 0 auto; }
                @media (max-width: 840px) { 
                    .print-section { 
                        transform: scale(0.7); 
                        margin: 0;
                    } 
                }
                @media (max-width: 480px) { 
                    .print-section { 
                        transform: scale(0.5); 
                    } 
                }
                @media print {
                    @page { size: A4 portrait; margin: 10mm; }
                    body, html { 
                        background: white !important; 
                        margin: 0 !important; 
                        padding: 0 !important; 
                        height: auto !important; 
                        min-height: auto !important;
                        overflow: visible !important;
                        overflow-x: visible !important;
                        overflow-y: visible !important;
                    }
                    .print-section {
                        transform: none !important;
                        margin: 0 !important;
                        padding: 0 !important;
                        box-shadow: none !important;
                        width: 100% !important;
                        max-width: 100% !important;
                        min-height: auto !important;
                        height: auto !important;
                    }
                    .attachment-page {
                        page-break-before: always !important;
                        break-before: page !important;
                    }
                }
            `}} />
            
            <div className="max-w-[210mm] w-full mx-auto">
              <div className="print-section bg-white shadow-2xl text-black w-[210mm] min-h-[297mm] text-[11px] leading-tight font-serif shrink-0" style={{ padding: "0" }}>
                  {/* PAPER */}
                <div className="px-[40px] py-[20px] print:pt-0 print:pb-[20px]">
                
                {/* HEADER LOGO & TITLE */}
                <div className="text-center mb-4">
                    <div className="font-bold text-xl mb-1 tracking-widest text-[#0033A0] flex justify-center items-center gap-2" style={{ fontFamily: "'CGIFont', serif" }}>
                        <img src="/icon-512x512.png" alt="Logo" className="w-8 h-8 object-contain" />
                        PT CHINA GLAZE INDONESIA
                    </div>
                    <div className="font-bold text-[14px]">
                        <span className="text-red-600">D</span>ESIGN <span className="text-red-600">A</span>PPLICATION <span className="text-red-600">R</span>EQUEST / REQUIREMENT / RESEARCH / DEVELOPMENT
                    </div>
                    <div className="text-[12px]">設計申請需求單/研究/開發</div>
                </div>

                {/* TOP TAB & DOC NO */}
                <div className="flex justify-between items-end -mb-[2px] relative z-10">
                    <div className="border-[2px] border-black w-64 h-8 flex items-center px-2 font-bold bg-white">
                        No. 序號 : DAR - {darNo}
                    </div>
                    <div className="text-[8px] pb-1">
                        表號:0-37-001
                    </div>
                </div>

                {/* TABLE BORDER WRAPPER */}
                <div className="border-[2px] border-black w-full flex flex-col relative z-0">
                    
                    {/* ROW 2 & 3 */}
                    <div className="flex border-b border-black h-6">
                        <div className="w-1/2 border-r border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Customer 客戶名稱 :</span> {customer}
                        </div>
                        <div className="w-1/2 flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-pre">Designer 設計師 (D        ):</span> {designer}
                        </div>
                    </div>
                    <div className="flex border-b-[2px] border-black h-6">
                        <div className="w-1/2 border-r border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Entry Date 输入日期 :</span> {entryDate}
                        </div>
                        <div className="w-1/2 flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-pre">Technician 技術員 (T        ):</span> {technician}
                        </div>
                    </div>

                    {/* ROW 4 - CHECKBOXES */}
                    <div className="flex border-b-[2px] border-black h-6 items-center justify-around px-2 font-bold text-[11px]">
                        {["Customer", "Internal", "Showroom", "Support R&D", "Exhibition"].map(p => (
                            <div key={p} className="flex items-center gap-1">
                                <span className="border border-black w-3 h-3 inline-flex items-center justify-center text-[10px] font-bold">
                                    {purpose.includes(p) ? <span className="text-red-600 font-bold">✓</span> : ""}
                                </span> {p}
                            </div>
                        ))}
                    </div>

                    {/* ROW 5 */}
                    <div className="flex border-b-[2px] border-black h-7 items-center px-2 font-bold">
                        Design/Item number 設計號 : <span className="ml-2 font-normal"></span>
                    </div>

                    {/* MATRIX ITEMS */}
                    <div className="flex border-b-[2px] border-black">
                        {Array.from({ length: numColumns / 8 }).map((_, col) => (
                            <div key={col} className={`flex-1 flex flex-col ${col < (numColumns / 8) - 1 ? 'border-r-[2px] border-black' : ''}`}>
                                {[0,1,2,3,4,5,6,7].map(row => {
                                    const idx = col * 8 + row;
                                    return (
                                        <div key={row} className={`flex h-6 ${row < 7 ? 'border-b border-black' : ''}`}>
                                            <div className="w-8 border-r border-black flex items-center justify-center font-bold">
                                                {idx + 1}
                                            </div>
                                            <div className="flex-1 px-1 flex items-center justify-center overflow-hidden whitespace-nowrap text-[9px] font-medium">
                                                {items[idx]}
                                            </div>
                                        </div>
                                    )
                                })}
                            </div>
                        ))}
                    </div>

                    {/* ROW DATES */}
                    <div className="flex border-b-[2px] border-black h-6">
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2">
                            <span className="font-bold whitespace-nowrap text-[11px]">Required date 查詢日期</span>
                        </div>
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2 font-bold">
                            {requiredDate}
                        </div>
                        <div className="w-1/4 border-r-[2px] border-black flex items-center px-2">
                            <span className="font-bold mr-2 whitespace-nowrap">Closing Date 截止日期</span>
                        </div>
                        <div className="w-1/4 flex items-center px-2 font-bold">{closingDate}</div>
                    </div>

                    {/* DETAILS SECTION */}
                    <div className="flex border-b-[2px] border-black">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold">
                            <span>Item</span>
                            <span>項 目</span>
                        </div>
                        <div className="w-[90%] flex flex-col">
                            
                            {/* Type */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Type 分類 :</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Picture圖畫", "Emboss壓花", "Rubber橡膠", "File Image Digital文件圖像數字", "Finish tile完成瓦片"].map(t => {
                                        const cleanVal = t.replace(/[^A-Za-z ]/g, "").trim();
                                        const isChecked = type.includes(cleanVal) || type.includes(t.split("圖")[0].trim());
                                        return (
                                            <div key={t} className="flex items-center gap-1">
                                                <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                    {isChecked ? <span className="text-red-600 font-bold">✓</span> : ""}
                                                </span> {t}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>
                            
                            {/* Size */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Size 尺寸:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Large size 大", "Faces _______", "截圖Cut 1:1", "jpg file", "_______cm x _______cm"].map(t => {
                                        let isChecked = false;
                                        if (t.includes("Large size")) isChecked = sizeChecks.includes("Large size");
                                        if (t.includes("Faces")) isChecked = sizeChecks.includes("Faces");
                                        if (t.includes("Cut 1:1")) isChecked = sizeChecks.includes("Cut 1:1");
                                        if (t.includes("jpg file")) isChecked = sizeChecks.includes("jpg file");
                                        if (t.includes("cm x")) isChecked = sizeChecks.includes("Custom") || sizeChecks.includes("Custom cm");
                                        
                                        return (
                                            <div key={t} className="flex items-center gap-1">
                                                <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                    {isChecked ? <span className="text-red-600 font-bold">✓</span> : ""}
                                                </span> 
                                                {t.includes("Faces") ? <span>Faces <span className="border-b border-black min-w-[30px] inline-block text-center">{sizeFaces}</span></span> :
                                                 t.includes("cm x") ? <span><span className="border-b border-black min-w-[20px] inline-block text-center">{sizeCm1}</span> cm x <span className="border-b border-black min-w-[20px] inline-block text-center">{sizeCm2}</span> cm</span> :
                                                 t}
                                            </div>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* Glaze */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Glaze 釉:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Engobe", "Glaze", "Top", "Monoglaze", "Reactive"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {glazeChecks.includes(t) ? <span className="text-red-600 font-bold">✓</span> : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {glazeChecks.includes("Residue") ? <span className="text-red-600 font-bold">✓</span> : ""}
                                        </span> Residue <span className="border-b border-black min-w-[50px] inline-block text-center">{glazeResidue}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Surface */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-1/6 border-r-[2px] border-black flex items-center px-2 text-[10px]">Surface 表面:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Matt", "Glossy", "Satin", "Polished", "Anti Slip"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {surfaceChecks.includes(t.trim()) ? <span className="text-red-600 font-bold">✓</span> : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {surfaceChecks.includes("Temp") ? <span className="text-red-600 font-bold">✓</span> : ""}
                                        </span> Temp <span className="border-b border-black min-w-[50px] inline-block text-center">{surfaceTemp}</span>
                                    </div>
                                </div>
                            </div>

                            {/* GU/PTV */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px]">GU/PTV :</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {guPtv.map((v, i) => (
                                        <div key={i} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {guPtvChecks[i] ? <span className="text-red-600 font-bold">✓</span> : ""}
                                            </span>
                                            <span className="border-b border-black min-w-[30px] inline-block text-center">{v}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Ink Effect */}
                            <div className="flex border-b border-black min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px] leading-tight">Ink Effect<br/>水墨效果:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["Impression", "Transparent", "SIngking", "Antislip", "Glue"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {inkChecks.includes(t) ? <span className="text-red-600 font-bold">✓</span> : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {inkChecks.includes("Other") ? <span className="text-red-600 font-bold">✓</span> : ""}
                                        </span> <span className="border-b border-black min-w-[50px] inline-block text-center">{inkOther}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Send By */}
                            <div className="flex min-h-6 items-stretch">
                                <div className="w-[calc(100%/6)] border-r-[2px] border-black flex items-center px-2 text-[10px]">Send by 發送方式:</div>
                                <div className="flex-1 flex flex-wrap gap-x-4 gap-y-1 p-1 items-center">
                                    {["USB", "Wetransfer", "CD", "On Glazing Line"].map(t => (
                                        <div key={t} className="flex items-center gap-1">
                                            <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                {sendBy.includes(t) ? <span className="text-red-600 font-bold">✓</span> : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Benefit */}
                    <div className="flex border-b-[2px] border-black min-h-[40px]">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[10px]">
                            <span>Benefit</span>
                            <span>效 益</span>
                        </div>
                        <div className="w-[calc(100%/3-10%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{benefit}</div>
                        <div className="w-[15%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[12px]">
                            Note
                        </div>
                        <div className="w-[calc(200%/3-15%)] p-1 whitespace-pre-wrap break-words text-[10px]">{generalNote}</div>
                    </div>

                    {/* Last time required */}
                    <div className="flex border-b-[2px] border-black h-10 relative">
                        <div className="w-[14%] flex flex-col border-r-[2px] border-black font-bold text-[10px]">
                            <div className="h-1/2 flex items-center px-1 text-[8px] leading-tight whitespace-nowrap">Last time required :</div>
                            <div className="h-1/2 flex items-center justify-between px-1"><span>上</span><span>次</span><span>查</span><span>詢</span></div>
                        </div>
                        <div className="w-[11%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastTimeReq}</div>
                        <div className="w-[15%] flex flex-col font-bold text-[10px]">
                            <div className="h-1/2 flex items-center px-1 text-[9px]">Provide feedback :</div>
                            <div className="h-1/2 flex items-center justify-between px-1"><span>提</span><span>供</span><span>意</span><span>見</span></div>
                        </div>
                        <div className="w-[60%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedback}</div>
                    </div>

                    {/* Last design support */}
                    <div className="relative border-b-[2px] border-black">
                        <div className="absolute top-0 bottom-0 left-0 w-[25%] border-r-[2px] border-black font-bold text-[10px] flex flex-col bg-white z-10">
                            <div className="flex-1 flex items-center px-1">Last design support :</div>
                            <div className="flex-1 flex items-center justify-between px-2"><span>上</span><span>次</span><span>設</span><span>計</span><span>支</span><span>持</span></div>
                        </div>
                        <div className="w-[75%] ml-[25%] flex flex-col">
                            <div className="flex border-b border-black min-h-[24px]">
                                <div className="w-[11.111%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[0]?.c1 || ""}</div>
                                <div className="w-[88.888%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[0]?.c2 || ""}</div>
                            </div>
                            <div className="flex min-h-[24px]">
                                <div className="w-[11.111%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[1]?.c1 || ""}</div>
                                <div className="w-[88.888%] p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[1]?.c2 || ""}</div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[0]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[0]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[2]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[2]?.c2 || ""}</div>
                    </div>
                    {/* Extra Row 1 */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[1]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[1]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[3]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{feedbackRows[3]?.c2 || ""}</div>
                    </div>
                    {/* Extra Row 2 Removed */}
                    {/* Note Row */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[2]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[2]?.c2 || ""}</div>
                        <div className="w-[75%] flex items-center justify-center font-bold text-[11px]">Note</div>
                    </div>
                    {/* Extra Rows under Note */}
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[3]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[3]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[0]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[0]?.c2 || ""}</div>
                    </div>
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[4]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[4]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[1]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[1]?.c2 || ""}</div>
                    </div>
                    <div className="flex border-b border-black min-h-[24px]">
                        <div className="w-[10%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[5]?.c1 || ""}</div>
                        <div className="w-[15%] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{lastDesignSupp[5]?.c2 || ""}</div>
                        <div className="w-[calc(100%/3-25%)] border-r-[2px] border-black p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[2]?.c1 || ""}</div>
                        <div className="w-2/3 p-1 whitespace-pre-wrap break-words text-[10px]">{note2Rows[2]?.c2 || ""}</div>
                    </div>

                    {/* Remarks */}
                    <div className="flex min-h-12 text-[9px]">
                        <div className="w-[10%] border-r-[2px] border-black flex flex-col items-center justify-center font-bold text-[10px]">
                            <span>Remarks</span>
                            <span>備 註</span>
                        </div>
                        <div className="w-[90%] p-1">
                            The design above is listed as an important asset of the company, the person in charge must be provide feedback to the customer about the use of the design in an effective period, the validity period is 60 days, the application development department will track the list and include designs for reference<br/>
                            上述設計被列為公司重要資產，負責人必須在有效期內向客戶提供有關設計使用反饋，有效期為60天，應用研發部將與踪列表並包含設計以供參考。
                        </div>
                    </div>

                </div>

                {/* Signatures */}
                <div className="border-[2px] border-black w-full flex flex-col mt-2">
                    <div className="flex">
                        <div className="w-1/3 flex flex-col border-r-[2px] border-black">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Manager 經理</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.manager && <img src={signatures.manager} className="max-h-full max-w-full object-contain" alt="manager" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Technology Dept 技術部</div>
                        </div>
                        <div className="w-1/3 flex flex-col border-r-[2px] border-black">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Section Head 課長</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.sectionHead && <img src={signatures.sectionHead} className="max-h-full max-w-full object-contain" alt="sectionHead" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Application Dept 應用課</div>
                        </div>
                        <div className="w-1/3 flex flex-col">
                            <div className="h-6 border-b-[2px] border-black flex items-center justify-center font-bold text-[11px]">Designer/Technician 設計師/技術員</div>
                            <div className="h-12 border-b-[2px] border-black flex items-center justify-center p-1">
                                {signatures.designer && <img src={signatures.designer} className="max-h-full max-w-full object-contain" alt="designer" />}
                            </div>
                            <div className="h-6 flex items-center justify-center font-bold text-[11px]">Person in charge 責任人</div>
                        </div>
                    </div>
                </div>
            
              </div>
              {images.length > 0 && (
                <div className="attachment-page pt-10 px-[40px] pb-[20px] print:pt-0">
                    <div className="text-center mb-8">
                        <div className="font-bold text-xl tracking-widest text-[#0033A0] flex justify-center items-center gap-2" style={{ fontFamily: "'CGIFont', serif" }}>
                            LAMPIRAN GAMBAR
                        </div>
                        <div className="font-bold text-[14px]">
                            DAR - {darNo}
                        </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-8 items-start justify-items-center w-full">
                        {images.map((img, idx) => (
                            <div key={idx} className="w-full flex flex-col items-center justify-start" style={{ pageBreakInside: "avoid" }}>
                                <img 
                                    src={`https://drive.google.com/thumbnail?id=${img.id}&sz=s1000`} 
                                    alt={`Lampiran ${img.name}`} 
                                    className="max-w-full max-h-[350px] object-contain border border-slate-200 p-2 bg-white" 
                                    onError={(e) => {
                                        const target = e.target as HTMLImageElement;
                                        if (target.src.includes('thumbnail')) {
                                            target.src = `https://drive.google.com/uc?id=${img.id}`;
                                        } else {
                                            target.src = 'https://placehold.co/1000x1000/png?text=Preview+Tidak+Tersedia';
                                        }
                                    }}
                                />
                                <a href={`https://drive.google.com/file/d/${img.id}/view`} target="_blank" rel="noopener noreferrer" className="mt-2 text-[14px] font-bold text-blue-600 hover:underline hover:text-blue-800 transition-colors text-center break-words max-w-full px-2">
                                    {img.name}
                                </a>
                            </div>
                        ))}
                    </div>
                  </div>
              )}
              </div>
            </div>
        </div>
    );
}

export default function PreviewPage() {
  return (
    <Suspense fallback={<div className="flex items-center justify-center h-screen bg-slate-100">Memuat preview...</div>}>
      <PreviewContent />
    </Suspense>
  );
}
