'use client';
import React, { useEffect, useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';
import { useParams } from 'next/navigation';

export default function PreviewPage() {
    const params = useParams();
    const [report, setReport] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            if (!params.id) return;
            try {
                const docRef = doc(db, 'form_dar', params.id as string);
                const snap = await getDoc(docRef);
                if (snap.exists()) {
                    setReport(snap.data());
                }
            } catch (e) {
                console.error(e);
            }
            setLoading(false);
        };
        fetchReport();
    }, [params.id]);

    if (loading) return <div className="flex items-center justify-center h-screen bg-slate-100">Memuat preview...</div>;
    if (!report) return <div className="flex items-center justify-center h-screen bg-slate-100">Form tidak ditemukan</div>;

    // Destructure all required variables from the report with default values
    const {
        darNo = '', type = [], requiredDate = '', closingDate = '', sizeChecks = [], sizeFaces = '', sizeCm1 = '', sizeCm2 = '',
        glazeChecks = [], glazeResidue = '', surfaceChecks = [], surfaceTemp = '', guPtv = [], guPtvChecks = [], inkChecks = [], inkOther = '', sendBy = [],
        items = [], numColumns = 4, note2Rows = [], lastDesignSupp = [], feedbackRows = [], signatures = {},
        customer = '', entryDate = '', designer = '', technician = '', purpose = '', designNo = '',
        benefit = '', lastTimeReq = '', feedback = '', generalNote = ''
    } = report;

    return (
        <div className="min-h-screen bg-slate-200 flex justify-center py-10 w-full overflow-x-hidden">
            <style dangerouslySetInnerHTML={{__html: `
                body { margin: 0; padding: 0; background: #e2e8f0; }
                .print-section { transform-origin: top center; transform: scale(0.95); }
                @media (max-width: 768px) { .print-section { transform: scale(0.75); } }
                @media (max-width: 480px) { .print-section { transform: scale(0.55); } }
            `}} />
            
            <div className="print-section bg-white shadow-2xl text-black w-[210mm] min-h-[297mm] text-[11px] leading-tight font-serif shrink-0" style={{ padding: "0" }}>
                {/* PAPER */}
              <div className="" style={{ padding: "20px 40px" }}>
                
                {/* HEADER LOGO & TITLE */}
                <div className="text-center mb-4">
                    <div className="font-bold text-xl mb-1 tracking-widest text-[#0033A0] flex justify-center items-center gap-2">
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
                                    {purpose.includes(p) ? "✓" : ""}
                                </span> {p}
                            </div>
                        ))}
                    </div>

                    {/* ROW 5 */}
                    <div className="flex border-b-[2px] border-black h-7 items-center px-2 font-bold">
                        Design/Item number 設計號 : <span className="ml-2 font-normal">{designNo}</span>
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
                                                    {isChecked ? "✓" : ""}
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
                                        if (t.includes("cm x")) isChecked = sizeChecks.includes("Custom");
                                        
                                        return (
                                            <div key={t} className="flex items-center gap-1">
                                                <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                                    {isChecked ? "✓" : ""}
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
                                                {glazeChecks.includes(t) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {glazeChecks.includes("Residue") ? "✓" : ""}
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
                                                {surfaceChecks.includes(t.trim()) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {surfaceChecks.includes("Temp") ? "✓" : ""}
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
                                                {guPtvChecks[i] ? "✓" : ""}
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
                                                {inkChecks.includes(t) ? "✓" : ""}
                                            </span> {t}
                                        </div>
                                    ))}
                                    <div className="flex items-center gap-1">
                                        <span className="border border-black w-2.5 h-2.5 inline-flex items-center justify-center text-[8px] font-bold">
                                            {inkChecks.includes("Other") ? "✓" : ""}
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
                                                {sendBy.includes(t) ? "✓" : ""}
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
        </div>
        </div>
    );
}
