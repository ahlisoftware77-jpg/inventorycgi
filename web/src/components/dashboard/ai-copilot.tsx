'use client';

import { useState, useEffect, useRef, useMemo } from 'react';
import { usePathname } from 'next/navigation';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Loader2, Send, X, FileDown, FileText, Bot, User, Trash2, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { doc, getDoc, collection, getDocs, query, orderBy, limit, where } from 'firebase/firestore';
import { db } from '@/lib/firebase/config';

interface Message {
  role: 'user' | 'model';
  content: string;
}

export default function AICopilot() {
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isPending, setIsPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageContextText, setPageContextText] = useState<string>('');
  const [hasGeneratedInitial, setHasGeneratedInitial] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Auto-scroll to bottom of chat
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isPending]);

  // Reset chat if user switches page
  useEffect(() => {
    setMessages([]);
    setHasGeneratedInitial(false);
    setError(null);
    setPageContextText('');
  }, [pathname]);

  // Friendly page title mapper
  const pageDetails = useMemo(() => {
    if (pathname === '/') return { name: 'Dashboard', icon: Sparkles };
    if (pathname.startsWith('/assets')) {
      if (pathname.includes('/report')) return { name: 'Laporan Analisis Aset', icon: Sparkles };
      return { name: 'Aset Utama & Utilitas', icon: Sparkles };
    }
    if (pathname.startsWith('/computer-details')) return { name: 'Rincian Komputer & Aset IT', icon: Sparkles };
    if (pathname.startsWith('/iso-14064')) return { name: 'ISO 14064 Emisi & Karbon', icon: Sparkles };
    if (pathname.startsWith('/maintenance')) return { name: 'Maintenance & Audit', icon: Sparkles };
    if (pathname.startsWith('/inventory')) {
      if (pathname.includes('/requests')) return { name: 'Permintaan Barang & Inventaris', icon: Sparkles };
      if (pathname.includes('/report')) return { name: 'Laporan Stok & Transaksi', icon: Sparkles };
      return { name: 'Manajemen Inventaris', icon: Sparkles };
    }
    if (pathname.startsWith('/mutations')) return { name: 'Mutasi & Disposal Aset', icon: Sparkles };
    if (pathname.startsWith('/logs')) return { name: 'Log Aktivitas Sistem', icon: Sparkles };
    if (pathname.startsWith('/users')) return { name: 'Manajemen Pengguna', icon: Sparkles };
    if (pathname.startsWith('/kategori')) return { name: 'Manajemen Kategori Aset', icon: Sparkles };
    if (pathname.startsWith('/cost-center')) return { name: 'Manajemen Cost Center', icon: Sparkles };
    if (pathname.startsWith('/settings')) return { name: 'Pengaturan Sistem', icon: Sparkles };
    return { name: 'Asisten Umum', icon: Sparkles };
  }, [pathname]);

  // Dynamic context fetching based on pathname
  const fetchPageContext = async (): Promise<{ context: string; prompt: string }> => {
    let context = '';
    let prompt = '';

    try {
      if (pathname === '/') {
        // 1. Dashboard
        const assetsSnapshot = await getDocs(query(collection(db, 'assets'), limit(150)));
        const assetsData = assetsSnapshot.docs.map(d => ({
          code: d.data().code, name: d.data().name, category: d.data().category, status: d.data().status, condition: d.data().condition
        }));

        const logsQuery = query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(30));
        const logsSnapshot = await getDocs(logsQuery);
        const logsData = logsSnapshot.docs.map(d => ({
          action: d.data().action, description: d.data().description, userName: d.data().userName
        }));

        context = `Data Dashboard Ringkas:\n- Total Aset dalam Sampel: ${assetsData.length}\n- Kondisi Sampel: ${JSON.stringify(assetsData.slice(0, 30))}\n- Log Aktivitas Terbaru: ${JSON.stringify(logsData)}`;
        prompt = `Anda adalah Asisten Analis AI untuk Dasbor Manajemen Aset PT. China Glaze Indonesia. Berikan ringkasan cepat performa operasional, kondisi dominan aset saat ini, dan ulasan cepat atas 3 aktivitas terbaru.`;
      } 
      else if (pathname.startsWith('/assets')) {
        // 2. Assets
        const assetsSnapshot = await getDocs(collection(db, 'assets'));
        const assetsData = assetsSnapshot.docs.map(d => ({
          code: d.data().code, name: d.data().name, category: d.data().category, status: d.data().status, condition: d.data().condition, location: d.data().location
        }));
        
        // Summarize conditions
        const conditions: Record<string, number> = {};
        const categories: Record<string, number> = {};
        const locations: Record<string, number> = {};
        assetsData.forEach(a => {
          if (a.condition) conditions[a.condition] = (conditions[a.condition] || 0) + 1;
          if (a.category) categories[a.category] = (categories[a.category] || 0) + 1;
          if (a.location) locations[a.location] = (locations[a.location] || 0) + 1;
        });

        context = `Konteks Aset Utama:\n- Total Aset Terdaftar: ${assetsData.length}\n- Sebaran Kondisi: ${JSON.stringify(conditions)}\n- Sebaran Kategori: ${JSON.stringify(categories)}\n- Sebaran Lokasi Utama: ${JSON.stringify(locations)}\n- Daftar Sampel Aset Rusak/Perlu Perbaikan: ${JSON.stringify(assetsData.filter(a => a.condition !== 'Baik').slice(0, 15))}`;
        prompt = `Anda adalah Asisten Analis AI Aset untuk PT. China Glaze Indonesia. Analisis data kondisi aset saat ini. Sebutkan persentase aset yang sehat (Baik) vs rusak, lokasi mana yang paling rawan kerusakan aset, dan berikan 3 langkah taktis pemeliharaan preventif khusus untuk sebaran kategori tersebut.`;
      }
      else if (pathname.startsWith('/computer-details')) {
        // 3. IT Assets
        const itSnapshot = await getDocs(collection(db, 'it_assets'));
        const itData = itSnapshot.docs.map(d => ({
          computerName: d.data().computerName, employeeName: d.data().employeeName, department: d.data().department, ipAddress: d.data().ipAddress,
          operatingSystem: d.data().operatingSystem, cpu: d.data().cpu, ram: d.data().ram, storage: d.data().storage
        }));

        context = `Konteks Aset IT:\n- Total Komputer Terdata: ${itData.length}\n- Sebaran Sistem Operasi (OS): ${JSON.stringify(itData.reduce((acc: any, curr) => { acc[curr.operatingSystem || 'Unknown'] = (acc[curr.operatingSystem || 'Unknown'] || 0) + 1; return acc; }, {}))}\n- Sampel Spesifikasi Komputer: ${JSON.stringify(itData.slice(0, 15))}`;
        prompt = `Anda adalah IT Analis AI untuk PT. China Glaze Indonesia. Analisis spesifikasi perangkat komputer yang terdaftar. Identifikasi apakah ada komputer yang memiliki spesifikasi usang (misal OS Windows lama, RAM di bawah 8GB) dan sarankan rekomendasi upgrade siklus hidup perangkat IT perusahaan.`;
      }
      else if (pathname.startsWith('/iso-14064')) {
        // 4. ISO 14064 Emissions
        const isoCategories = ['A3-Peralatan Mesin', 'A4-Peralatan Listrik', 'A5-Peralatan Transportasi', 'Kendaraan', 'Utilitas & Kelistrikan'];
        const assetsSnapshot = await getDocs(collection(db, 'assets'));
        const assetsData = assetsSnapshot.docs
          .map(d => ({
            name: d.data().name, category: d.data().category, status: d.data().status, 
            fuelType: d.data().fuelType || '', emissionFactor: d.data().emissionFactor || 0,
            location: d.data().location || ''
          }))
          .filter(a => isoCategories.includes(a.category));

        context = `Konteks ISO 14064 Emisi:\n- Jumlah Aset Penghasil Emisi: ${assetsData.length}\n- Jenis Kategori Sumber Emisi: ${JSON.stringify(assetsData.reduce((acc: any, curr) => { acc[curr.category] = (acc[curr.category] || 0) + 1; return acc; }, {}))}\n- Sampel Aset Berbahan Bakar: ${JSON.stringify(assetsData.filter(a => a.fuelType).slice(0, 15))}`;
        prompt = `Anda adalah Analis Keberlanjutan & Emisi ISO 14064 untuk PT. China Glaze Indonesia. Berdasarkan data utilitas dan kendaraan emisi di atas, berikan penilaian emisi gas rumah kaca potensial. Berikan usulan efisiensi bahan bakar dan strategi dekarbonisasi energi listrik di area pabrik.`;
      }
      else if (pathname.startsWith('/maintenance')) {
        // 5. Maintenance
        const maintSnapshot = await getDocs(collection(db, 'maintenance_schedules'));
        const maintData = maintSnapshot.docs.map(d => ({
          assetCode: d.data().assetCode, assetName: d.data().assetName, type: d.data().type, status: d.data().status, technician: d.data().technician
        }));

        context = `Konteks Maintenance & Audit:\n- Total Tiket Pemeliharaan: ${maintData.length}\n- Sebaran Status Kerja: ${JSON.stringify(maintData.reduce((acc: any, curr) => { acc[curr.status || 'Unknown'] = (acc[curr.status || 'Unknown'] || 0) + 1; return acc; }, {}))}\n- Beban Teknisi: ${JSON.stringify(maintData.reduce((acc: any, curr) => { acc[curr.technician || 'Belum Ditunjuk'] = (acc[curr.technician || 'Belum Ditunjuk'] || 0) + 1; return acc; }, {}))}`;
        prompt = `Anda adalah Manajer Perbaikan & Perawatan Aset AI untuk PT. China Glaze Indonesia. Ulas tiket perawatan yang ada. Temukan hambatan (bottleneck) seperti penumpukan tiket pada satu teknisi atau tingginya tingkat penundaan tiket, lalu berikan saran penjadwalan pemeliharaan yang seimbang.`;
      }
      else if (pathname.startsWith('/inventory')) {
        // 6. Inventory & Stock
        const invSnapshot = await getDocs(collection(db, 'inventory'));
        const invData = invSnapshot.docs.map(d => ({
          code: d.data().code, name: d.data().name, category: d.data().category, stock: d.data().stock || 0, minStock: d.data().minStock || 0, unit: d.data().unit
        }));

        const reqSnapshot = await getDocs(collection(db, 'inventory_requests'));
        const reqData = reqSnapshot.docs.map(d => ({
          itemName: d.data().itemName, quantity: d.data().quantity, status: d.data().status, requestedBy: d.data().requestedBy
        }));

        const lowStock = invData.filter(i => i.stock <= i.minStock);

        context = `Konteks Inventaris:\n- Total Item Stok Terdaftar: ${invData.length}\n- Total Item Kritis (Stok <= Batas Min): ${lowStock.length}\n- Daftar Item Stok Kritis: ${JSON.stringify(lowStock.slice(0, 15))}\n- Permintaan Pembelian Tertunda: ${JSON.stringify(reqData.filter(r => r.status === 'Menunggu Persetujuan HRGA').slice(0, 10))}`;
        prompt = `Anda adalah Analis Gudang & Inventaris AI untuk PT. China Glaze Indonesia. Analisis stok barang habis pakai yang berada di batas kritis. Rekomendasikan daftar belanja re-order mendesak berdasarkan barang kritis yang stoknya 0 atau di bawah batas minimum, serta berikan masukan efisiensi rantai suplai.`;
      }
      else if (pathname.startsWith('/mutations')) {
        // 7. Mutations
        const assetsSnapshot = await getDocs(collection(db, 'assets'));
        const assetsData = assetsSnapshot.docs.map(d => ({
          code: d.data().code, name: d.data().name, status: d.data().status, location: d.data().location, user: d.data().user || ''
        }));
        
        const waitingMutasi = assetsData.filter(a => a.status === 'waiting_mutasi' || a.status === 'waiting_disposal');

        context = `Konteks Mutasi & Penghapusan:\n- Total Sampel Aset Dipantau: ${assetsData.length}\n- Aset Menunggu Persetujuan Mutasi/Disposal: ${JSON.stringify(waitingMutasi.slice(0, 20))}`;
        prompt = `Anda adalah Pengawas Mutasi & Logistik Internal AI untuk PT. China Glaze Indonesia. Analisis antrean mutasi dan pembuangan (disposal) aset yang sedang menunggu persetujuan. Berikan penilaian risiko perpindahan barang dan pastikan kontrol perpindahan lokasi aset tetap akurat.`;
      }
      else if (pathname.startsWith('/logs')) {
        // 8. System Logs
        const logsSnapshot = await getDocs(query(collection(db, 'system_logs'), orderBy('timestamp', 'desc'), limit(100)));
        const logsData = logsSnapshot.docs.map(d => ({
          type: d.data().type, action: d.data().action, description: d.data().description, userName: d.data().userName,
          date: d.data().timestamp && typeof d.data().timestamp.toDate === 'function' ? d.data().timestamp.toDate().toISOString().split('T')[0] : ''
        }));

        context = `Konteks Log Aktivitas:\n- Log Entri (Terbaru 100): ${JSON.stringify(logsData.slice(0, 50))}`;
        prompt = `Anda adalah Auditor Keamanan TI AI untuk PT. China Glaze Indonesia. Analisis log aktivitas pengguna terbaru. Cari pola anomali seperti penumpukan aktivitas penghapusan di waktu tertentu, aktivitas berlebih dari pengguna tertentu, atau kesalahan input, dan simpulkan laporan kepatuhan log sistem.`;
      }
      else if (pathname.startsWith('/users')) {
        // 9. Users
        const usersSnapshot = await getDocs(collection(db, 'users'));
        const usersData = usersSnapshot.docs.map(d => ({
          email: d.data().email, role: d.data().role, department: d.data().department, status: d.data().status || 'Aktif'
        }));

        context = `Konteks Pengguna Sistem:\n- Total Pengguna Terdaftar: ${usersData.length}\n- Sebaran Peran (Role): ${JSON.stringify(usersData.reduce((acc: any, curr) => { acc[curr.role || 'User'] = (acc[curr.role || 'User'] || 0) + 1; return acc; }, {}))}\n- Pengguna Pending/Menunggu Konfirmasi: ${JSON.stringify(usersData.filter(u => u.role === 'Pending'))}`;
        prompt = `Anda adalah Analis Keamanan Akses AI untuk PT. China Glaze Indonesia. Analisis sebaran peran pengguna. Berikan ulasan keamanan akses jika rasio Admin terlalu tinggi dibanding User biasa, serta ingatkan jika ada akun pendaftaran tertunda yang butuh verifikasi segera.`;
      }
      else {
        // Fallback
        const assetsSnapshot = await getDocs(query(collection(db, 'assets'), limit(30)));
        const assetsData = assetsSnapshot.docs.map(d => ({
          name: d.data().name, category: d.data().category, condition: d.data().condition
        }));
        context = `Daftar Aset Terkait:\n${JSON.stringify(assetsData)}`;
        prompt = `Anda adalah Asisten Cerdas AI untuk sistem logistik PT. China Glaze Indonesia. Bantu pengguna memberikan wawasan umum terkait halaman ini atau jawab pertanyaan seputar sistem inventaris perusahaan.`;
      }
    } catch (e) {
      console.error('Failed to load page context for AI Analysis:', e);
      context = 'Gagal memuat data spesifik dari Firestore. Analisis dilakukan dengan pengetahuan dasar.';
      prompt = `Anda adalah Asisten Cerdas AI untuk sistem logistik PT. China Glaze Indonesia. Tanyakan kepada pengguna topik apa yang ingin didiskusikan karena sistem gagal terhubung ke database.`;
    }

    return { context, prompt };
  };

  const handleGenerateInitialInsights = async () => {
    setIsPending(true);
    setError(null);

    try {
      // 1. Fetch API Key
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      let apiKey = '';
      if (docSnap.exists()) {
        apiKey = docSnap.data().geminiApiKey || '';
      }

      if (!apiKey) {
        throw new Error('Gemini API Key belum dikonfigurasi. Silakan hubungi Administrator atau buka halaman Pengaturan untuk melengkapi API Key.');
      }

      // 2. Fetch context & prompt
      const { context, prompt } = await fetchPageContext();
      setPageContextText(context);

      // 3. Call Gemini
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{
              role: 'user',
              parts: [{ text: `${prompt}\n\n[BERIKUT ADALAH KONTEKS DATA DARI FIRESTORE]:\n${context}\n\nTuliskan laporan analisis terperinci yang siap dibaca dalam format Markdown.` }]
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
        throw new Error('Respons dari Google Gemini kosong atau tidak valid.');
      }

      setMessages([{ role: 'model', content: text }]);
      setHasGeneratedInitial(true);
    } catch (err: any) {
      console.error('Error generating AI analysis:', err);
      setError(err.message || 'Terjadi kesalahan sistem saat menganalisis halaman.');
    } finally {
      setIsPending(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || isPending) return;

    const userMsg = inputMessage;
    setInputMessage('');
    setError(null);

    // Append user message
    const updatedMessages: Message[] = [...messages, { role: 'user', content: userMsg }];
    setMessages(updatedMessages);
    setIsPending(true);

    try {
      // 1. Fetch API Key
      const docRef = doc(db, 'settings', 'general');
      const docSnap = await getDoc(docRef);
      let apiKey = '';
      if (docSnap.exists()) {
        apiKey = docSnap.data().geminiApiKey || '';
      }

      if (!apiKey) {
        throw new Error('Gemini API Key belum dikonfigurasi di Pengaturan.');
      }

      // 2. Build model contents payloads
      // We prepend the data context in the very first turn to ensure Gemini keeps context
      const contentsPayload = updatedMessages.map((msg, idx) => {
        let text = msg.content;
        if (idx === 0) {
          text = `[BERIKUT ADALAH DATA DARI DATABASE FIRESTORE UNTUK HALAMAN ${pageDetails.name}]:\n${pageContextText}\n\n` + text;
        }
        return {
          role: msg.role === 'user' ? 'user' : 'model',
          parts: [{ text }]
        };
      });

      // 3. Fetch from API
      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contents: contentsPayload })
        }
      );

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}));
        throw new Error(errData.error?.message || `HTTP error! status: ${response.status}`);
      }

      const resData = await response.json();
      const text = resData.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) {
        throw new Error('Model gagal merespons obrolan Anda.');
      }

      setMessages(prev => [...prev, { role: 'model', content: text }]);
    } catch (err: any) {
      console.error('Error sending message to Gemini:', err);
      setError(err.message || 'Gagal mengirim pesan obrolan.');
    } finally {
      setIsPending(false);
    }
  };

  const handleClearChat = () => {
    setMessages([]);
    setHasGeneratedInitial(false);
    setError(null);
    setPageContextText('');
  };

  const exportToWord = () => {
    const reportText = messages.find(m => m.role === 'model')?.content;
    if (!reportText) return;
    
    const htmlContent = `
      <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
      <head>
        <title>Laporan Analisis AI Halaman: ${pageDetails.name}</title>
        <style>
          body { font-family: 'Arial', sans-serif; line-height: 1.6; color: #333; padding: 20px; }
          h2 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 5px; font-size: 16pt; margin-top: 20px; font-weight: bold; }
          h3 { color: #0f766e; border-bottom: 1px solid #5eead4; padding-bottom: 3px; font-size: 13pt; margin-top: 15px; font-weight: bold; }
          h4 { color: #0d9488; font-size: 11pt; margin-top: 10px; margin-bottom: 5px; font-weight: bold; }
          p { font-size: 10pt; margin-bottom: 10px; text-align: justify; color: #334155; }
          ul, li { font-size: 10pt; margin-left: 20px; margin-bottom: 5px; color: #334155; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #cbd5e1; padding: 8px; font-size: 9pt; text-align: left; }
          th { background-color: #f1f5f9; font-weight: bold; color: #0f766e; }
          .header-title { text-align: center; font-size: 18pt; font-weight: bold; color: #0f766e; margin-bottom: 5px; }
          .header-subtitle { text-align: center; font-size: 9pt; color: #64748b; text-transform: uppercase; letter-spacing: 2px; margin-bottom: 30px; font-weight: bold; }
          .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 10px; }
        </style>
      </head>
      <body>
        <div class="header-title">LAPORAN ANALISIS AI: ${pageDetails.name.toUpperCase()}</div>
        <div class="header-subtitle">PT. CHINA GLAZE INDONESIA</div>
        
        ${reportText.split('\n').map(line => {
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
              const isHeader = line.includes('Kode') || line.includes('Aset') || line.includes('Status') || line.includes('Kondisi');
              const cellTag = isHeader ? 'th' : 'td';
              return `<tr>${cols.map(c => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
            }
          }
          return `<p>${withBold}</p>`;
        }).join('\n')}
        
        <div class="footer">Dibuat otomatis oleh AI Copilot Aset pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
      </body>
      </html>
    `;
    
    let processedHtml = htmlContent.replace(/<\/tr>\n<tr>/g, '</tr><tr>');
    processedHtml = processedHtml.replace(/(<tr>.*?<\/tr>)+/g, (match) => `<table>${match}</table>`);
    
    const blob = new Blob(['\ufeff' + processedHtml], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Analisis_AI_${pageDetails.name.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const exportToPDF = () => {
    const reportText = messages.find(m => m.role === 'model')?.content;
    if (!reportText) return;
    
    const printWindow = window.open('', '', 'width=900,height=800');
    if (!printWindow) return;
    
    const htmlContent = `
      <html>
      <head>
        <title>Ekspor Laporan Analisis AI - ${pageDetails.name}</title>
        <style>
          body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; line-height: 1.6; color: #334155; padding: 40px; }
          h2 { color: #0f766e; border-bottom: 2px solid #0f766e; padding-bottom: 8px; font-size: 15pt; margin-top: 25px; font-weight: 800; text-transform: uppercase; }
          h3 { color: #0d9488; border-bottom: 1px solid #e2e8f0; padding-bottom: 5px; font-size: 12pt; margin-top: 20px; font-weight: 700; text-transform: uppercase; }
          h4 { color: #0f766e; font-size: 10.5pt; margin-top: 15px; margin-bottom: 5px; font-weight: 700; }
          p { font-size: 9.5pt; margin-bottom: 12px; text-align: justify; color: #475569; }
          ul, li { font-size: 9.5pt; margin-left: 20px; margin-bottom: 6px; color: #475569; }
          table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          th, td { border: 1px solid #e2e8f0; padding: 10px; font-size: 8.5pt; text-align: left; }
          th { background-color: #f8fafc; font-weight: bold; color: #0f766e; }
          .header-container { text-align: center; border-bottom: 3px double #cbd5e1; padding-bottom: 15px; margin-bottom: 30px; }
          .header-title { font-size: 18pt; font-weight: 900; color: #0f766e; }
          .header-subtitle { font-size: 8.5pt; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 2px; margin-top: 5px; }
          .footer { text-align: center; font-size: 8pt; color: #94a3b8; margin-top: 60px; border-top: 1px solid #e2e8f0; padding-top: 15px; }
          @media print { body { padding: 0; } @page { size: A4; margin: 2cm; } }
        </style>
      </head>
      <body>
        <div class="header-container">
          <div class="header-title">LAPORAN ANALISIS AI: ${pageDetails.name.toUpperCase()}</div>
          <div class="header-subtitle">PT. CHINA GLAZE INDONESIA</div>
        </div>
        
        ${reportText.split('\n').map(line => {
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
              const isHeader = line.includes('Kode') || line.includes('Aset') || line.includes('Status') || line.includes('Kondisi');
              const cellTag = isHeader ? 'th' : 'td';
              return `<tr>${cols.map(c => `<${cellTag}>${c}</${cellTag}>`).join('')}</tr>`;
            }
          }
          return `<p>${withBold}</p>`;
        }).join('\n')}
        
        <div class="footer">Dibuat otomatis oleh AI Copilot Aset pada ${new Date().toLocaleDateString('id-ID', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</div>
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

  const renderMarkdown = (text: string) => {
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
        return <h4 key={idx} className="text-xs sm:text-sm font-black uppercase tracking-wider text-amber-400 mt-4 mb-1.5 border-l-2 border-amber-400 pl-2">{trimmedLine.replace('### ', '')}</h4>;
      }
      if (trimmedLine.startsWith('## ')) {
        return <h3 key={idx} className="text-sm sm:text-base font-black uppercase tracking-widest text-white mt-5 mb-2 border-b border-white/10 pb-0.5">{trimmedLine.replace('## ', '')}</h3>;
      }
      if (trimmedLine.startsWith('# ')) {
        return <h2 key={idx} className="text-base sm:text-lg font-black uppercase tracking-widest text-teal-200 mt-6 mb-3 border-b-2 border-teal-800 pb-1">{trimmedLine.replace('# ', '')}</h2>;
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
          <div key={idx} className="flex items-start gap-2 ml-3 my-1">
            <span className="text-amber-400 shrink-0 mt-1 select-none text-[8px]">•</span>
            <p className="text-xs leading-relaxed text-slate-100">
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
            <div key={idx} className="grid grid-cols-4 gap-1.5 py-1.5 px-2.5 border-b border-white/5 bg-white/5 text-left text-[10px] font-bold rounded-lg my-1 text-slate-100">
              {columns.map((col, colIdx) => (
                <div key={colIdx} className={cn("truncate", colIdx === 0 && "font-black text-amber-300")}>
                  {col}
                </div>
              ))}
            </div>
          );
        }
      }
      
      return (
        <p key={idx} className="text-xs leading-relaxed text-slate-100 my-1">
          {lineElements}
        </p>
      );
    });
  };

  return (
    <>
      {/* 1. Floating Action Button (FAB) */}
      <div className="fixed bottom-6 right-6 z-50">
        <Button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "h-14 w-14 rounded-full shadow-2xl transition-all duration-355 active:scale-95 flex items-center justify-center relative border border-white/20",
            isOpen 
              ? "bg-slate-900 text-white rotate-90 hover:bg-slate-800" 
              : "bg-gradient-to-tr from-teal-500 via-emerald-600 to-indigo-600 hover:from-teal-650 hover:to-indigo-650 text-white animate-none hover:shadow-[0_0_20px_rgba(20,184,166,0.6)]"
          )}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <>
              {/* Outer pulsing ring */}
              <span className="absolute inset-0 rounded-full border border-teal-400 animate-ping opacity-25" />
              <Sparkles className="h-6 w-6 animate-pulse" />
            </>
          )}
        </Button>
      </div>

      {/* 2. Side Panel Backdrop Overlay */}
      {isOpen && (
        <div 
          onClick={() => setIsOpen(false)}
          className="fixed inset-0 bg-black/60 backdrop-blur-xs z-40 transition-opacity duration-300"
        />
      )}

      {/* 3. Sliding Side Panel (Copilot Drawer) */}
      <div
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-full sm:w-[480px] md:w-[520px] bg-slate-950/95 backdrop-blur-xl border-l border-teal-900/35 shadow-2xl flex flex-col text-white transition-all duration-300 ease-out transform",
          isOpen ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Panel Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-gradient-to-r from-teal-950/50 to-slate-950">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-teal-500/20 rounded-xl border border-teal-500/30">
              <Sparkles className="h-4 w-4 text-teal-300 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-black uppercase tracking-wider text-teal-300">CGI AI Copilot</h3>
                <span className="text-[7.5px] font-black uppercase tracking-[0.25em] bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full border border-indigo-500/30">PAGE CO-PILOT</span>
              </div>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Analisis Halaman: {pageDetails.name}</p>
            </div>
          </div>
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setIsOpen(false)}
            className="rounded-full h-8 w-8 hover:bg-white/15 text-slate-400 hover:text-white"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Panel Message Area */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4 custom-scrollbar bg-slate-950/40 relative">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 max-w-sm mx-auto space-y-6">
              <div className="relative">
                <div className="h-16 w-16 bg-gradient-to-tr from-teal-500 to-indigo-500 rounded-2xl flex items-center justify-center shadow-lg border border-white/10">
                  <Bot className="h-8 w-8 text-white animate-bounce" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 h-6 w-6 bg-emerald-500 rounded-full border-4 border-slate-950 flex items-center justify-center">
                  <Sparkles className="h-3 w-3 text-white" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black uppercase tracking-wider text-teal-200">Asisten Halaman Pintar</h4>
                <p className="text-[10.5px] text-slate-400 leading-relaxed font-semibold mt-1">
                  Mampu menganalisis seluruh data inventaris, mutasi, log aktivitas, emisi karbon, dan spesifikasi IT di halaman ini secara cerdas.
                </p>
              </div>

              {error && (
                <div className="p-3.5 bg-red-950/40 border border-red-500/30 rounded-2xl text-left space-y-1.5 animate-in fade-in duration-300">
                  <p className="text-xs font-black uppercase tracking-wider text-red-200">Gagal Memulai Analisis</p>
                  <p className="text-[9.5px] text-red-150 leading-relaxed font-semibold opacity-95">{error}</p>
                </div>
              )}

              <Button
                onClick={handleGenerateInitialInsights}
                disabled={isPending}
                className="h-11 w-full bg-teal-500 hover:bg-teal-600 text-slate-950 font-black uppercase tracking-widest rounded-xl transition-all active:scale-95 shadow-lg shadow-teal-500/10"
              >
                {isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Menganalisis Data...
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" /> Mulai Analisis Halaman
                  </>
                )}
              </Button>
            </div>
          ) : (
            <div className="space-y-4 pb-4">
              {messages.map((msg, idx) => (
                <div 
                  key={idx} 
                  className={cn(
                    "flex gap-3 items-start max-w-[90%] rounded-2xl p-4.5 text-left border shadow-sm",
                    msg.role === 'user'
                      ? "ml-auto bg-teal-950/30 border-teal-800/40 text-teal-100 flex-row-reverse"
                      : "bg-slate-900/60 border-white/5 text-slate-100"
                  )}
                >
                  {/* Icon Avatar */}
                  <div className={cn(
                    "h-8 w-8 rounded-lg shrink-0 flex items-center justify-center text-xs font-black uppercase tracking-wider border",
                    msg.role === 'user'
                      ? "bg-teal-600 border-teal-500 text-white"
                      : "bg-slate-950 border-white/10 text-teal-300"
                  )}>
                    {msg.role === 'user' ? <User className="h-4.5 w-4.5" /> : <Bot className="h-4.5 w-4.5" />}
                  </div>

                  {/* Message Bubble Content */}
                  <div className="flex-1 space-y-2 overflow-x-hidden">
                    {msg.role === 'user' ? (
                      <p className="text-xs font-bold leading-relaxed">{msg.content}</p>
                    ) : (
                      <div className="space-y-2.5">
                        {renderMarkdown(msg.content)}
                      </div>
                    )}
                  </div>
                </div>
              ))}

              {isPending && (
                <div className="flex gap-3 items-start max-w-[90%] bg-slate-900/40 border border-white/5 rounded-2xl p-4 text-left mr-auto">
                  <div className="h-8 w-8 rounded-lg shrink-0 flex items-center justify-center bg-slate-950 border border-white/10 text-teal-300">
                    <Loader2 className="h-4 w-4 animate-spin text-teal-400" />
                  </div>
                  <div className="flex-1 py-1">
                    <span className="text-[10px] font-bold text-teal-400 animate-pulse tracking-widest uppercase">Sedang Berpikir...</span>
                  </div>
                </div>
              )}

              {error && (
                <div className="p-3 bg-red-950/30 border border-red-500/20 rounded-xl text-left text-[10px] text-red-300 font-bold uppercase tracking-wider">
                  Gagal: {error}
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Panel Actions (Export / Reset) */}
        {hasGeneratedInitial && messages.length > 0 && (
          <div className="px-5 py-3.5 border-t border-white/10 flex items-center justify-between gap-3 bg-slate-950/80">
            <div className="flex gap-2">
              <Button
                onClick={exportToPDF}
                disabled={isPending}
                size="sm"
                variant="outline"
                className="h-8 text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border-white/10 rounded-lg text-rose-300 flex items-center gap-1"
              >
                <FileDown className="h-3 w-3" /> PDF
              </Button>
              <Button
                onClick={exportToWord}
                disabled={isPending}
                size="sm"
                variant="outline"
                className="h-8 text-[9px] font-black uppercase tracking-wider bg-white/5 hover:bg-white/10 border-white/10 rounded-lg text-blue-300 flex items-center gap-1"
              >
                <FileText className="h-3 w-3" /> Word
              </Button>
            </div>
            
            <Button
              onClick={handleClearChat}
              disabled={isPending}
              size="sm"
              variant="ghost"
              className="h-8 text-[9px] font-black uppercase tracking-wider text-slate-400 hover:text-white rounded-lg flex items-center gap-1 hover:bg-white/5"
            >
              <Trash2 className="h-3 w-3 text-slate-400" /> Bersihkan Obrolan
            </Button>
          </div>
        )}

        {/* Panel Chat Input Form */}
        {hasGeneratedInitial && (
          <div className="p-4 border-t border-white/10 bg-slate-950 bg-gradient-to-b from-transparent to-slate-950">
            <form onSubmit={handleSendMessage} className="relative flex items-center gap-2">
              <textarea
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage(e);
                  }
                }}
                placeholder="Tanyakan analisis halaman..."
                rows={1}
                className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white/5 border border-white/10 focus:border-teal-500/50 text-white placeholder-slate-500 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-teal-500/30 resize-none max-h-24 custom-scrollbar"
              />
              <Button
                type="submit"
                disabled={isPending || !inputMessage.trim()}
                className={cn(
                  "absolute right-2 h-8 w-8 rounded-xl p-0 transition-all flex items-center justify-center",
                  inputMessage.trim() 
                    ? "bg-teal-500 hover:bg-teal-600 text-slate-950 active:scale-95" 
                    : "bg-white/5 text-slate-650 cursor-not-allowed"
                )}
              >
                <Send className="h-3.5 w-3.5" />
              </Button>
            </form>
            <p className="text-[7.5px] text-slate-500 font-bold uppercase tracking-widest text-center mt-2.5">AI dapat membuat kesalahan. Harap verifikasi data aset penting.</p>
          </div>
        )}
      </div>
    </>
  );
}
