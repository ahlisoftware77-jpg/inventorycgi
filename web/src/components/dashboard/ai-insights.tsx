'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, RefreshCw, ShieldCheck, AlertCircle, FileDown, FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, getDoc, collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

export default function AIInsights() {
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);

  const exportToWord = () => {
    if (!message) return;
    
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Laporan Analisis Aset AI</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; padding: 20px; }
          h2 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 5px; font-size: 16pt; margin-top: 20px; font-weight: bold; }
          h3 { color: #1e3a8a; border-bottom: 1px solid #93c5fd; padding-bottom: 3px; font-size: 13pt; margin-top: 15px; font-weight: bold; }
          h4 { color: #2563eb; font-size: 11pt; margin-top: 10px; margin-bottom: 5px; font-weight: bold; }
          p { font-size: 10pt; margin-bottom: 10px; text-align: justify; color: #334155; }
          ul, li { font-size: 10pt; margin-left: 20px; margin-bottom: 5px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #1e3a8a; }
          .header-title { text-align: center; font-size: 20pt; font-weight: bold; color: #1e3a8a; margin-bottom: 5px; }
          .header-subtitle { text-align: center; font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; font-weight: bold; }
          .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header-title">LAPORAN ANALISIS ASET AI</div>
        <div class="header-subtitle">PT. CHINA GLAZE INDONESIA</div>
        
        ${message.split('\n').map(line => {
          const trimmed = line.trim();
          const withBold = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          
          if (trimmed.startsWith('### ')) {
            return `<h4>${trimmed.replace('### ', '')}</h4>`;
          }
          if (trimmed.startsWith('## ')) {
            return `<h3>${trimmed.replace('## ', '')}</h3>`;
          }
          if (trimmed.startsWith('# ')) {
            return `<h2>${trimmed.replace('# ', '')}</h2>`;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return `<li>${withBold.replace(/^[-*]\s+/, '')}</li>`;
          }
          if (trimmed === '') {
            return '<br/>';
          }
          if (trimmed.includes('|')) {
            const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
            if (cols.length > 0) {
              if (trimmed.includes('---')) return '';
              const isHeader = line.includes('Kode') || line.includes('Aset') || line.includes('Status');
              const cellTag = isHeader ? 'th' : 'td';
              return `<tr>${cols.map(c => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
            }
          }
          return `<p>${withBold}</p>`;
        }).join('\n')}
        
        <div class="footer">Dibuat otomatis oleh Sistem Analis AI Aset pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </body>
      </html>
    `;
    
    let processedHtml = htmlContent.replace(/<\/tr>\n<tr>/g, '</tr><tr>');
    processedHtml = processedHtml.replace(/(<tr>.*?<\/tr>)+/g, (match) => `<table>${match}</table>`);
    
    const blob = new Blob(['\ufeff' + processedHtml], {
      type: 'application/msword'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Laporan_Analisis_AI_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    if (!message) return;
    
    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;
    
    const htmlContent = `
      <html>
      <head>
        <title>Ekspor Laporan Analisis Aset AI</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; padding: 40px; }
          h2 { color: #1e3a8a; border-bottom: 2px solid #3b82f6; padding-bottom: 8px; font-size: 15pt; margin-top: 25px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; }
          h3 { color: #2563eb; border-bottom: 1px solid #cbd5e1; padding-bottom: 5px; font-size: 12pt; margin-top: 20px; font-weight: 700; text-transform: uppercase; }
          h4 { color: #1e3a8a; font-size: 10.5pt; margin-top: 15px; margin-bottom: 5px; font-weight: 700; }
          p { font-size: 9.5pt; margin-bottom: 12px; text-align: justify; color: #475569; }
          ul, li { font-size: 9.5pt; margin-left: 20px; margin-bottom: 6px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 8.5pt; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; color: #1e3a8a; }
          .header-container { text-align: center; border-bottom: 3px double #cbd5e1; padding-bottom: 15px; margin-bottom: 30px; }
          .header-title { font-size: 18pt; font-weight: 900; color: #1e3a8a; letter-spacing: 0.5px; }
          .header-subtitle { font-size: 8.5pt; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
          .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; font-weight: 500; }
          @media print {
            body { padding: 0; }
            @page { size: A4; margin: 2cm; }
          }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-title">LAPORAN ANALISIS ASET AI</div>
          <div class="header-subtitle">PT. CHINA GLAZE INDONESIA</div>
        </div>
        
        ${message.split('\n').map(line => {
          const trimmed = line.trim();
          const withBold = trimmed.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
          
          if (trimmed.startsWith('### ')) {
            return `<h4>${trimmed.replace('### ', '')}</h4>`;
          }
          if (trimmed.startsWith('## ')) {
            return `<h3>${trimmed.replace('## ', '')}</h3>`;
          }
          if (trimmed.startsWith('# ')) {
            return `<h2>${trimmed.replace('# ', '')}</h2>`;
          }
          if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
            return `<li>${withBold.replace(/^[-*]\s+/, '')}</li>`;
          }
          if (trimmed === '') {
            return '<br/>';
          }
          if (trimmed.includes('|')) {
            const cols = trimmed.split('|').map(c => c.trim()).filter(Boolean);
            if (cols.length > 0) {
              if (trimmed.includes('---')) return '';
              const isHeader = line.includes('Kode') || line.includes('Aset') || line.includes('Status');
              const cellTag = isHeader ? 'th' : 'td';
              return `<tr>${cols.map(c => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
            }
          }
          return `<p>${withBold}</p>`;
        }).join('\n')}
        
        <div class="footer">Dibuat otomatis oleh Sistem Analis AI Aset pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </body>
      </html>
    `;
    
    let processedHtml = htmlContent.replace(/<\/tr>\n<tr>/g, '</tr><tr>');
    processedHtml = processedHtml.replace(/(<tr>.*?<\/tr>)+/g, (match) => `<table>${match}</table>`);
    
    printWindow.document.write(processedHtml);
    printWindow.document.close();
    
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      printWindow.close();
    }, 500);
  };

  const renderContent = (text: string | null) => {
    if (!text) return null;
    return text.split('\n').map((line, idx) => {
      const parts = line.split(/\*\*(.*?)\*\*/g);
      const lineElements = parts.map((part, i) => {
        if (i % 2 === 1) {
          return <strong key={i} className="font-extrabold text-amber-300 drop-shadow-sm">{part}</strong>;
        }
        return part;
      });

      const trimmedLine = line.trim();

      if (trimmedLine.startsWith('### ')) {
        return <h4 key={idx} className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 mt-5 mb-2 border-l-2 border-amber-400 pl-2 text-left">{trimmedLine.replace('### ', '')}</h4>;
      }
      if (trimmedLine.startsWith('## ')) {
        return <h3 key={idx} className="text-sm sm:text-base font-black uppercase tracking-widest text-white mt-6 mb-3 border-b border-white/10 pb-1 text-left">{trimmedLine.replace('## ', '')}</h3>;
      }
      if (trimmedLine.startsWith('# ')) {
        return <h2 key={idx} className="text-base sm:text-lg font-black uppercase tracking-widest text-white mt-7 mb-4 border-b-2 border-white/20 pb-2 text-left">{trimmedLine.replace('# ', '')}</h2>;
      }
      if (trimmedLine.startsWith('- ') || trimmedLine.startsWith('* ')) {
        const contentStr = trimmedLine.replace(/^[-*]\s+/, '');
        const contentParts = contentStr.split(/\*\*(.*?)\*\*/g);
        const contentElements = contentParts.map((part, i) => {
          if (i % 2 === 1) {
            return <strong key={i} className="font-extrabold text-amber-300 drop-shadow-sm">{part}</strong>;
          }
          return part;
        });

        return (
          <div key={idx} className="flex items-start gap-2 ml-4 my-1.5 text-left">
            <span className="text-amber-400 shrink-0 mt-1 select-none text-[9px]">•</span>
            <p className="text-xs sm:text-sm font-medium leading-relaxed text-white/95">
              {contentElements}
            </p>
          </div>
        );
      }
      if (trimmedLine === '') {
        return <div key={idx} className="h-2" />;
      }
      
      if (trimmedLine.includes('|')) {
        const columns = trimmedLine.split('|').map(c => c.trim()).filter(Boolean);
        if (columns.length > 0) {
          if (trimmedLine.includes('---') || columns.every(c => c.startsWith('-'))) return null;
          
          return (
            <div key={idx} className="grid grid-cols-4 gap-2 py-2 px-3 border-b border-white/5 bg-white/5 text-left text-xs font-bold rounded-lg my-1">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className={cn("truncate text-white/95", colIdx === 0 && "font-black text-amber-300")}>
                  {col}
                </div>
              ))}
            </div>
          );
        }
      }
      
      return (
        <p key={idx} className="text-xs sm:text-sm font-medium leading-relaxed text-white/95 my-1 text-left">
          {lineElements}
        </p>
      );
    });
  };

  const handleGenerateInsights = async () => {
    setIsPending(true);
    setError(null);
    try {
      // 1. Get API Key from Firestore settings
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      let apiKey = '';
      if (docSnap.exists()) {
        apiKey = docSnap.data().geminiApiKey || '';
      }

      if (!apiKey) {
        throw new Error('Gemini API Key belum dikonfigurasi. Silakan masuk ke menu Pengaturan untuk memasukkan kunci API.');
      }

      // 2. Fetch all assets
      const assetsSnapshot = await getDocs(collection(db, 'assets'));
      const assetsList = assetsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          code: data.code || '',
          name: data.name || '',
          category: data.category || '',
          status: data.status || '',
          condition: data.condition || '',
          location: data.location || '',
          user: data.user || '',
        };
      });

      // 3. Fetch maintenance schedules
      const maintSnapshot = await getDocs(collection(db, 'maintenance_schedules'));
      const maintList = maintSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          assetCode: data.assetCode || '',
          assetName: data.assetName || '',
          type: data.type || '',
          status: data.status || '',
          technician: data.technician || '',
          notes: data.notes || '',
          date: data.scheduledDate && typeof data.scheduledDate.toDate === 'function' 
            ? data.scheduledDate.toDate().toISOString().split('T')[0] 
            : '',
        };
      });

      // 4. Fetch system logs (limit to 100)
      const logsQuery = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100));
      const logsSnapshot = await getDocs(logsQuery);
      const logsList = logsSnapshot.docs.map(doc => {
        const data = doc.data();
        return {
          type: data.type || '',
          action: data.action || '',
          description: data.description || '',
          targetCode: data.targetCode || '',
          userName: data.userName || '',
          date: data.timestamp && typeof data.timestamp.toDate === 'function'
            ? data.timestamp.toDate().toISOString().split('T')[0]
            : '',
        };
      });

      // 5. Build the context prompt
      const prompt = `Anda adalah analis AI manajemen aset profesional untuk PT. China Glaze Indonesia.
Berikut adalah data aset perusahaan, data riwayat pemeliharaan (maintenance), dan log aktivitas sistem:

--- DATA ASET ---
${JSON.stringify(assetsList, null, 2)}

--- DATA MAINTENANCE ---
${JSON.stringify(maintList, null, 2)}

--- LOG RIWAYAT & AKTIVITAS SISTEM ---
${JSON.stringify(logsList, null, 2)}

Berdasarkan data di atas, buatlah LAPORAN RINGKASAN EKSEKUTIF (SUMMARY REPORT) yang profesional dalam format Markdown. Laporan harus mencakup:
1. **Analisis Statistik Aset**: Total aset aktif, sebaran per departemen, dan sebaran kondisi aset (misalnya berapa persen yang baik, perlu perbaikan, rusak). Tampilkan dalam format tabel atau daftar terperinci yang mudah dibaca.
2. **Kesehatan & Kesiapan Operasional**: Ringkasan status pemeliharaan (Dijadwalkan, Diproses, Selesai, Ditunda) dan tren kerusakan/masalah yang sering muncul berdasarkan riwayat pemeliharaan.
3. **Analisis Riwayat & Mutasi**: Ulasan singkat mengenai perubahan terbaru dalam log sistem (misal: mutasi aset antar unit, penghapusan, atau penambahan aset baru).
4. **Temuan & Rekomendasi Strategis**: Deteksi dini jika ada aset yang kritis, bermasalah, atau sudah melewati masa pakai, serta saran perbaikan manajemen aset agar lebih efisien dan memperpanjang usia pakai aset.

Gunakan Bahasa Indonesia yang formal, taktis, analitis, dan mudah dipahami oleh manajemen puncak. Format laporan dengan Markdown yang indah (gunakan tabel, poin-poin, dan teks tebal jika perlu agar mudah dibaca).`;

      // 6. Fetch from Gemini REST API directly on the client side
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [{
              parts: [{ text: prompt }]
            }]
          })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Respons dari Gemini kosong atau tidak valid.');
      }
      
      setMessage(text);
    } catch (err: any) {
      console.error('Error generating AI insights:', err);
      setError(err.message || 'Terjadi kesalahan yang tidak diketahui.');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Card className="h-full border-none shadow-lg bg-gradient-to-br from-indigo-600 to-blue-700 text-white overflow-hidden relative group">
      <div className="absolute top-0 right-0 p-6 opacity-10 group-hover:scale-110 transition-transform duration-700">
        <Sparkles className="h-24 w-24" />
      </div>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-white/20 rounded-lg">
              <Sparkles className="h-4 w-4 text-white" />
            </div>
            <CardTitle className="text-sm font-black uppercase tracking-wider">Analis Aset AI</CardTitle>
          </div>
          <Badge variant="outline" className="border-white/30 text-[9px] text-white/80 font-black uppercase tracking-widest">Powered by Genkit</Badge>
        </div>
        <CardDescription className="text-white/60 text-[10px] font-medium uppercase tracking-widest">Analisis Inventaris Cerdas Real-time</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="h-[350px] p-5 bg-white/10 backdrop-blur-md rounded-2xl border border-white/10 shadow-inner overflow-y-auto custom-scrollbar">
          {error ? (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 text-red-200 animate-in fade-in duration-300">
              <div className="p-3 bg-red-500/20 rounded-full border border-red-500/30">
                <AlertCircle className="h-8 w-8 text-red-300" />
              </div>
              <p className="text-xs font-black uppercase tracking-wider text-red-200">Gagal Menghubungkan AI</p>
              <p className="text-[10px] font-medium leading-relaxed opacity-90 max-w-[240px] mx-auto text-red-100 bg-red-950/20 p-2 rounded-lg border border-red-500/10">
                {error}
              </p>
              <p className="text-[9px] font-bold text-amber-300 uppercase tracking-widest mt-1">Periksa kembali API Key di Pengaturan</p>
            </div>
          ) : message ? (
            <div className="space-y-3 animate-in fade-in slide-in-from-bottom-2 duration-500 text-left">
              {renderContent(message)}
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center gap-3 opacity-60">
              <ShieldCheck className="h-8 w-8 text-white/40" />
              <p className="text-[10px] font-black uppercase tracking-widest">Sistem Siap Memberikan Wawasan</p>
            </div>
          )}
        </div>
        
        {message && !isPending && (
          <div className="grid grid-cols-2 gap-3 mb-1">
            <Button
              type="button"
              onClick={exportToPDF}
              variant="outline"
              className="h-11 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <FileDown className="h-4 w-4 text-rose-300" /> Ekspor PDF
            </Button>
            <Button
              type="button"
              onClick={exportToWord}
              variant="outline"
              className="h-11 bg-white/10 hover:bg-white/20 border-white/20 text-white rounded-xl font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 transition-all active:scale-95"
            >
              <FileText className="h-4 w-4 text-blue-300" /> Ekspor Word
            </Button>
          </div>
        )}

        <Button 
          onClick={handleGenerateInsights}
          disabled={isPending}
          className="w-full h-11 bg-white text-blue-700 hover:bg-blue-50 font-black uppercase tracking-tighter shadow-xl shadow-black/10 rounded-xl transition-all active:scale-95"
        >
          {isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <RefreshCw className="mr-2 h-4 w-4" />
          )}
          {message ? 'Perbarui Wawasan' : 'Hasilkan Analisis AI'}
        </Button>
      </CardContent>
    </Card>
  );
}

function Badge({ children, className, variant = 'default' }: { children: React.ReactNode, className?: string, variant?: string }) {
  return (
    <span className={cn("px-2 py-0.5 rounded-full border text-[10px]", className)}>
      {children}
    </span>
  );
}
