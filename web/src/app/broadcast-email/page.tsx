'use client';

import { useState, useEffect, useRef } from 'react';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { doc, getDoc, updateDoc, collection, getDocs } from 'firebase/firestore';
import { db, storage } from '@/lib/firebase/config';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Loader2, Mail, Send, CheckCircle2, X, Upload, Download, FileText, Trash2, Eye, ShieldCheck, Activity } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { cn } from '@/lib/utils';
import * as XLSX from 'xlsx';

export default function BroadcastEmailPage() {
  const [smtpProvider, setSmtpProvider] = useState<'gmail' | 'custom'>('gmail');
  const [gmailUser, setGmailUser] = useState('');
  const [gmailPass, setGmailPass] = useState('');
  const [gmailSenderName, setGmailSenderName] = useState('');
  const [gmailBcc, setGmailBcc] = useState('');
  
  const [customHost, setCustomHost] = useState('');
  const [customPort, setCustomPort] = useState('');
  const [customUser, setCustomUser] = useState('');
  const [customSenderEmail, setCustomSenderEmail] = useState('');
  const [customPass, setCustomPass] = useState('');
  const [customSenderName, setCustomSenderName] = useState('');
  const [customBcc, setCustomBcc] = useState('');
  const [customSecure, setCustomSecure] = useState(false);

  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [isSaving, setIsUpdating] = useState(false);
  
  // Broadcast States
  const [recipientMode, setRecipientMode] = useState('all');
  const [manualEmails, setManualEmails] = useState('');
  const [excelEmails, setExcelEmails] = useState<string[]>([]);
  const [excelFileName, setExcelFileName] = useState('');
  const [validatedEmails, setValidatedEmails] = useState<string[]>([]);
  const [selectedEmails, setSelectedEmails] = useState<string[]>([]);
  const [validationResult, setValidationResult] = useState<{valid: number, invalid: number, fixed: number} | null>(null);
  
  const [broadcastSubject, setBroadcastSubject] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastDelay, setBroadcastDelay] = useState(3);
  const [attachments, setAttachments] = useState<File[]>([]);
  
  const [isBroadcasting, setIsBroadcasting] = useState(false);
  const [broadcastLogs, setBroadcastLogs] = useState<{time: string, msg: string, type: 'info'|'success'|'error'}[]>([]);
  
  const broadcastRef = useRef<boolean>(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchData = async () => {
      const snap = await getDoc(doc(db, 'settings', 'general'));
      if (snap.exists()) {
        const data = snap.data();
        setSmtpProvider(data.smtpProvider || 'gmail');
        setGmailUser(data.gmailUser || '');
        setGmailPass(data.gmailPass || '');
        setGmailSenderName(data.gmailSenderName || '');
        setGmailBcc(data.gmailBcc || '');
        setCustomHost(data.customHost || '');
        setCustomPort(data.customPort || '');
        setCustomUser(data.customUser || '');
        setCustomSenderEmail(data.customSenderEmail || '');
        setCustomPass(data.customPass || '');
        setCustomSenderName(data.customSenderName || '');
        setCustomBcc(data.customBcc || '');
        setCustomSecure(data.customSecure === true);
      }
    };
    fetchData();
  }, []);

  const handleSaveSmtp = async () => {
    setIsUpdating(true);
    try {
      await updateDoc(doc(db, 'settings', 'general'), {
        smtpProvider,
        gmailUser,
        gmailPass,
        gmailSenderName,
        gmailBcc,
        customHost,
        customPort,
        customUser,
        customSenderEmail,
        customPass,
        customSenderName,
        customBcc,
        customSecure
      });
      toast({ title: 'Tersimpan', description: 'Konfigurasi SMTP berhasil disimpan.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyimpan', description: error.message });
    } finally {
      setIsUpdating(false);
    }
  };

  const getApiUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname.includes('web.app')) {
      return 'https://inventorycgi.vercel.app/web/api/send-email';
    }
    return '/api/send-email';
  };

  const handleTestConnection = async () => {
    setIsTestingConnection(true);
    try {
      const currentSmtp = smtpProvider === 'gmail' 
        ? { host: 'smtp.gmail.com', port: 465, user: gmailUser, senderEmail: gmailUser, pass: gmailPass, senderName: gmailSenderName, secure: true, bcc: gmailBcc }
        : { host: customHost, port: Number(customPort), user: customUser, senderEmail: customSenderEmail, pass: customPass, senderName: customSenderName, secure: customSecure, bcc: customBcc };
      
      const res = await fetch(getApiUrl(), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'testConnection', smtp: currentSmtp })
      });
      
      if (!res.ok) throw new Error(await res.text());
      toast({ title: 'Koneksi Berhasil', description: 'Pengaturan SMTP Anda valid dan terhubung!' });
    } catch (err: any) {
      toast({ variant: 'destructive', title: 'Koneksi Gagal', description: err.message });
    } finally {
      setIsTestingConnection(false);
    }
  };

  const handleExcelUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setExcelFileName(file.name);
    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const wsname = wb.SheetNames[0];
      const ws = wb.Sheets[wsname];
      const data = XLSX.utils.sheet_to_json(ws, { header: 1 });
      const emails: string[] = [];
      data.forEach((row: any) => {
        if (row[0] && typeof row[0] === 'string' && row[0].includes('@')) {
          emails.push(row[0].trim());
        }
      });
      setExcelEmails(emails);
    };
    reader.readAsBinaryString(file);
  };

  const downloadExcelTemplate = () => {
    const ws = XLSX.utils.aoa_to_sheet([['Email']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "Template_Email.xlsx");
  };

  const handlePaste = async (e: React.ClipboardEvent<HTMLTextAreaElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (!file) continue;
        
        e.preventDefault();
        
        const target = e.target as HTMLTextAreaElement;
        const start = target.selectionStart;
        const end = target.selectionEnd;
        
        toast({ title: 'Menyiapkan Gambar...', description: 'Mohon tunggu sebentar...' });
        
        try {
          const reader = new FileReader();
          reader.onload = (event) => {
            const base64Url = event.target?.result as string;
            const imgTag = `\n<br><img src="${base64Url}" alt="Pasted Image" style="max-width: 100%; height: auto; border-radius: 8px; margin: 10px 0;" /><br>\n`;
            setBroadcastMessage(prev => prev.substring(0, start) + imgTag + prev.substring(end));
            toast({ title: 'Berhasil', description: 'Gambar berhasil disisipkan ke dalam pesan.' });
          };
          reader.onerror = () => {
            toast({ variant: 'destructive', title: 'Gagal', description: 'Gagal memproses gambar.' });
          };
          reader.readAsDataURL(file);
        } catch (error: any) {
          console.error("Paste error:", error);
          toast({ variant: 'destructive', title: 'Gagal', description: 'Terjadi kesalahan sistem: ' + error.message });
        }
      }
    }
  };

  const handleValidateEmails = async () => {
    let rawList: string[] = [];
    if (recipientMode === 'all') {
      try {
        const querySnapshot = await getDocs(collection(db, 'users'));
        querySnapshot.forEach((doc) => {
          const userData = doc.data();
          if (userData.email) {
            rawList.push(userData.email);
          }
        });
      } catch (error) {
        toast({ variant: 'destructive', title: 'Gagal Memuat User', description: 'Tidak dapat mengambil daftar user dari database.' });
        return;
      }
    } else if (recipientMode === 'manual') {
      rawList = manualEmails.split(/[\n,]+/).map(e => e.trim()).filter(e => e);
    } else {
      rawList = excelEmails;
    }

    let validCount = 0;
    let fixedCount = 0;
    let invalidCount = 0;
    const result: string[] = [];

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    rawList.forEach(email => {
      let e = email.toLowerCase().replace(/\s/g, '');
      if (email !== e) fixedCount++;
      if (emailRegex.test(e)) {
        result.push(e);
        validCount++;
      } else {
        invalidCount++;
      }
    });

    setValidatedEmails(result);
    setSelectedEmails(result);
    setValidationResult({ valid: validCount, fixed: fixedCount, invalid: invalidCount });
  };

  const cancelBroadcast = () => {
    broadcastRef.current = false;
    setIsBroadcasting(false);
    setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Pengiriman dihentikan oleh pengguna.', type: 'error' }]);
  };

  const handleSendBroadcast = async () => {
    if (selectedEmails.length === 0) return toast({ variant: 'destructive', title: 'Tidak ada penerima', description: 'Harap pilih minimal satu email tujuan.' });
    setIsBroadcasting(true);
    broadcastRef.current = true;
    setBroadcastLogs([{ time: new Date().toLocaleTimeString(), msg: `Memulai pengiriman ke ${selectedEmails.length} email...`, type: 'info' }]);

    const currentSmtp = smtpProvider === 'gmail' 
      ? { host: 'smtp.gmail.com', port: 465, user: gmailUser, senderEmail: gmailUser, pass: gmailPass, senderName: gmailSenderName, secure: true, bcc: gmailBcc }
      : { host: customHost, port: Number(customPort), user: customUser, senderEmail: customSenderEmail, pass: customPass, senderName: customSenderName, secure: customSecure, bcc: customBcc };

    for (let i = 0; i < selectedEmails.length; i++) {
      if (!broadcastRef.current) break;
      const email = selectedEmails[i];
      try {
        const res = await fetch(getApiUrl(), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'send',
            smtp: currentSmtp,
            to: [email],
            subject: broadcastSubject,
            html: broadcastMessage
          })
        });
        if (!res.ok) throw new Error('Gagal');
        setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Terkirim: ${email}`, type: 'success' }]);
      } catch (err) {
        setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: `Gagal: ${email}`, type: 'error' }]);
      }
      if (i < selectedEmails.length - 1 && broadcastRef.current) {
        await new Promise(r => setTimeout(r, broadcastDelay * 1000));
      }
    }
    setIsBroadcasting(false);
    setBroadcastLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), msg: 'Proses pengiriman selesai.', type: 'info' }]);
  };

  return (
    <DashboardLayout>
      <div className="max-w-[95%] mx-auto space-y-4 pb-10 text-black">
        <div className="flex items-center gap-3 px-1 text-left">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-2xl shadow-inner border border-rose-200">
            <Mail className="w-8 h-8" />
          </div>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Broadcast Email</h1>
            <h1 className="text-sm font-bold text-muted-foreground uppercase tracking-widest mt-1">
              Kirim email masal ke karyawan dan pengguna aplikasi.
            </h1>
          </div>
        </div>

        <Tabs defaultValue="broadcast" className="w-full">
          <TabsList className="w-full grid grid-cols-2 bg-slate-100 dark:bg-slate-800 rounded-3xl h-10 p-1 mb-4">
            <TabsTrigger value="broadcast" className="rounded-2xl font-bold h-full uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-sm">Kirim & Antrean Email</TabsTrigger>
            <TabsTrigger value="smtp" className="rounded-2xl font-bold h-full uppercase tracking-widest text-[11px] data-[state=active]:bg-primary data-[state=active]:text-white transition-all shadow-sm">Pengaturan SMTP</TabsTrigger>
          </TabsList>
          
          <TabsContent value="smtp" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4">
            <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black">
          <CardHeader className="p-5 pb-3 bg-slate-50/50 dark:bg-slate-800/50 border-b text-left">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-slate-900 dark:text-white text-left">
              <Mail className="w-6 h-6 text-primary" /> Pengaturan SMTP Email
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Konfigurasi akun pengirim email untuk sistem broadcast.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <Tabs value={smtpProvider} onValueChange={(v) => setSmtpProvider(v as 'gmail' | 'custom')} className="w-full">
              <TabsList className="w-full grid grid-cols-2 bg-slate-100 dark:bg-slate-800 rounded-2xl h-14 p-1">
                <TabsTrigger value="gmail" className="rounded-xl font-bold h-full">Gmail (Disarankan)</TabsTrigger>
                <TabsTrigger value="custom" className="rounded-xl font-bold h-full">Custom Domain SMTP</TabsTrigger>
              </TabsList>
              
              <TabsContent value="gmail" className="pt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alamat Akun Gmail</Label>
                    <Input value={gmailUser} onChange={(e) => setGmailUser(e.target.value)} placeholder="email@gmail.com" type="email" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Google App Password (16 digit)</Label>
                    <Input value={gmailPass} onChange={(e) => setGmailPass(e.target.value)} placeholder="••••••••••••••••" type="password" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left sm:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Pengirim (Sender Name)</Label>
                    <Input value={gmailSenderName} onChange={(e) => setGmailSenderName(e.target.value)} placeholder="e.g., HR YadiApp" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left sm:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">BCC Default (Tembusan Tersembunyi)</Label>
                    <Input value={gmailBcc} onChange={(e) => setGmailBcc(e.target.value)} placeholder="e.g., admin@domain.com" type="email" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                </div>
              </TabsContent>

              <TabsContent value="custom" className="pt-6 space-y-6 animate-in fade-in slide-in-from-top-2">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">SMTP Host</Label>
                    <Input value={customHost} onChange={(e) => setCustomHost(e.target.value)} placeholder="e.g., mail.domain.com" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">SMTP Port</Label>
                    <Input value={customPort} onChange={(e) => setCustomPort(e.target.value)} placeholder="e.g., 465" type="number" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Username Login (Auth)</Label>
                    <Input value={customUser} onChange={(e) => setCustomUser(e.target.value)} placeholder="e.g., domain\user atau admin@perusahaan.com" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Alamat Email Pengirim</Label>
                    <Input value={customSenderEmail} onChange={(e) => setCustomSenderEmail(e.target.value)} placeholder="Kosongkan jika sama dengan Username Login" type="email" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Password SMTP</Label>
                    <Input value={customPass} onChange={(e) => setCustomPass(e.target.value)} placeholder="••••••••••••" type="password" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left sm:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Nama Pengirim (Sender Name)</Label>
                    <Input value={customSenderName} onChange={(e) => setCustomSenderName(e.target.value)} placeholder="e.g., Admin YadiApp" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left sm:col-span-1">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">BCC Default (Tembusan Tersembunyi)</Label>
                    <Input value={customBcc} onChange={(e) => setCustomBcc(e.target.value)} placeholder="e.g., admin@domain.com" type="email" className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                  </div>
                  <div className="space-y-2 text-left sm:col-span-2 pt-2">
                    <div className="flex items-center space-x-3 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-100 dark:border-slate-800">
                      <Checkbox id="ssl-checkbox" checked={customSecure} onCheckedChange={(checked) => setCustomSecure(checked === true)} className="data-[state=checked]:bg-primary data-[state=checked]:text-white" />
                      <div className="space-y-1">
                        <Label htmlFor="ssl-checkbox" className="text-[11px] font-bold cursor-pointer text-slate-700 dark:text-slate-300">Gunakan SSL/TLS (Secure Connection)</Label>
                        <p className="text-[10px] text-muted-foreground">Aktifkan jika Mail Server mewajibkan koneksi SSL yang aman.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
            
            <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/50 mt-4 gap-3">
              <Button onClick={handleTestConnection} disabled={isTestingConnection} variant="outline" className="rounded-full h-9 px-4 font-black uppercase tracking-widest text-[10px] border-primary/20 text-primary hover:bg-primary/5">
                {isTestingConnection ? <><Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" /> Menghubungkan...</> : <><Activity className="w-3.5 h-3.5 mr-2" /> Test Koneksi {smtpProvider === 'gmail' ? 'Gmail' : 'SMTP'}</>}
              </Button>
              <Button onClick={handleSaveSmtp} disabled={isSaving} className="rounded-full px-6 h-9 bg-slate-900 hover:bg-black text-white font-black uppercase tracking-widest shadow-lg shadow-slate-900/30 active:scale-95 transition-all">
                  {isSaving ? <Loader2 className="mr-3 h-5 w-5 animate-spin" /> : <ShieldCheck className="mr-3 h-5 w-5 text-primary" />}
                  Simpan Konfigurasi SMTP
              </Button>
            </div>
          </CardContent>
        </Card>
        </TabsContent>

        <TabsContent value="broadcast" className="focus-visible:outline-none focus-visible:ring-0 animate-in fade-in slide-in-from-bottom-4">
        <Card className="rounded-[2.5rem] border-none shadow-2xl overflow-hidden bg-white dark:bg-slate-900 text-black border-2 border-primary/20">
          <CardHeader className="p-5 pb-3 bg-primary/5 text-left">
            <CardTitle className="flex items-center gap-2 text-lg font-black uppercase tracking-tight text-primary text-left">
              <Send className="w-6 h-6" /> Broadcast Email (Kirim ke Semua User)
            </CardTitle>
            <CardDescription className="text-[10px] font-black uppercase tracking-widest text-left">Kirim pesan massal ke seluruh pengguna yang terdaftar di sistem. Pesan dikirim menggunakan opsi BCC untuk privasi.</CardDescription>
          </CardHeader>
          <CardContent className="p-5 space-y-6">
            <div className="grid lg:grid-cols-2 gap-6 text-left">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Target Penerima</Label>
                  <Select value={recipientMode} onValueChange={(val: any) => setRecipientMode(val)}>
                    <SelectTrigger className="w-full rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm">
                      <SelectValue placeholder="Pilih Mode Pengiriman" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Kirim ke Seluruh User Terdaftar</SelectItem>
                      <SelectItem value="manual">Input Email Manual (Koma/Baris Baru)</SelectItem>
                      <SelectItem value="excel">Import dari File Excel (.xlsx)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {recipientMode === 'manual' && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Daftar Email (Manual)</Label>
                    <Textarea value={manualEmails} onChange={(e) => setManualEmails(e.target.value)} placeholder="johndoe@email.com, janedoe@email.com" className="min-h-[60px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner resize-none font-medium text-sm leading-relaxed" />
                  </div>
                )}

                {recipientMode === 'excel' && (
                  <div className="space-y-4 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex gap-2 items-center">
                      <Button variant="outline" size="sm" onClick={downloadExcelTemplate} className="rounded-full text-[11px] font-bold border-primary/20 text-primary hover:bg-primary/5">
                        <Download className="w-3 h-3 mr-2" /> Download Template
                      </Button>
                      <div className="relative overflow-hidden inline-block">
                        <Button variant="default" size="sm" className="rounded-full text-[11px] font-bold pointer-events-none">
                          <Upload className="w-3 h-3 mr-2" /> Upload File Excel
                        </Button>
                        <input type="file" accept=".xlsx, .xls" onChange={handleExcelUpload} className="absolute left-0 top-0 w-full h-full opacity-0 cursor-pointer" />
                      </div>
                    </div>
                    {excelFileName && (
                      <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex items-center gap-3">
                        <FileText className="w-5 h-5 text-green-600" />
                        <div className="flex-grow overflow-hidden">
                          <p className="text-sm font-bold truncate">{excelFileName}</p>
                          <p className="text-[10px] font-bold text-muted-foreground">{excelEmails.length} Email terekstrak</p>
                        </div>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0 rounded-full text-red-500" onClick={() => { setExcelFileName(''); setExcelEmails([]); }}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="pt-2">
                  <Button variant="secondary" onClick={handleValidateEmails} className="rounded-xl w-full h-9 font-bold bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100 dark:hover:bg-indigo-900/50">
                    <CheckCircle2 className="w-4 h-4 mr-2" /> Validasi & Muat Daftar Penerima
                  </Button>
                </div>

                {validationResult && (
                  <div className="space-y-2 animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex gap-2">
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">{validationResult.valid} Valid</Badge>
                      <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">{validationResult.fixed} Diperbaiki</Badge>
                      <Badge variant="outline" className="bg-red-50 text-red-700 border-red-200">{validationResult.invalid} Dibuang</Badge>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 rounded-xl p-3 border border-slate-100 dark:border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground block">Siap Kirim ({selectedEmails.length}/{validatedEmails.length})</Label>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 font-bold" onClick={() => setSelectedEmails(validatedEmails)}>Pilih Semua</Button>
                          <Button variant="ghost" size="sm" className="h-6 text-[10px] px-2 font-bold text-red-500" onClick={() => setSelectedEmails([])}>Kosongkan</Button>
                        </div>
                      </div>
                      <ScrollArea className="h-24 w-full rounded-md border bg-white dark:bg-slate-900 p-2">
                        <div className="flex flex-col gap-1">
                          {validatedEmails.length > 0 ? validatedEmails.map((email, idx) => {
                            const isSelected = selectedEmails.includes(email);
                            return (
                              <label key={idx} className={cn("flex items-center space-x-3 p-2 rounded-lg cursor-pointer transition-colors border", isSelected ? "bg-primary/5 border-primary/20" : "bg-slate-50 dark:bg-slate-800 border-transparent opacity-60 hover:opacity-100")}>
                                <Checkbox checked={isSelected} onCheckedChange={(checked) => {
                                  if (checked) setSelectedEmails([...selectedEmails, email]);
                                  else setSelectedEmails(selectedEmails.filter(e => e !== email));
                                }} />
                                <span className="text-sm font-medium">{email}</span>
                              </label>
                            );
                          }) : <span className="text-[11px] text-muted-foreground italic p-2">Tidak ada email yang valid.</span>}
                        </div>
                      </ScrollArea>
                    </div>
                  </div>
                )}
                
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Jeda Antar Pengiriman (Detik)</Label>
                  <Input type="number" min="0" value={broadcastDelay} onChange={(e) => setBroadcastDelay(parseInt(e.target.value) || 0)} className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                </div>

                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Subjek Email</Label>
                  <Input value={broadcastSubject} onChange={(e) => setBroadcastSubject(e.target.value)} placeholder="Judul atau Subjek Pesan..." className="rounded-xl h-9 bg-slate-50 dark:bg-slate-800 border-none shadow-inner font-bold text-sm" />
                </div>
                <div className="space-y-2">
                  <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Isi Pesan (Mendukung HTML)</Label>
                  <Textarea value={broadcastMessage} onChange={(e) => setBroadcastMessage(e.target.value)} onPaste={handlePaste} placeholder="Tulis pesan... (Bisa Paste Gambar langsung di sini)" className="min-h-[120px] rounded-2xl bg-slate-50 dark:bg-slate-800 border-none shadow-inner resize-none font-medium text-sm leading-relaxed" />
                </div>
                
                <div className="flex justify-start gap-3 pt-4">
                  {isBroadcasting ? (
                    <Button onClick={cancelBroadcast} variant="destructive" className="rounded-full h-9 px-5 font-black uppercase tracking-widest shadow-lg shadow-red-500/30 w-full lg:w-auto">
                      <X className="w-4 h-4 mr-2" /> Hentikan Antrean
                    </Button>
                  ) : (
                    <Button onClick={handleSendBroadcast} disabled={!broadcastSubject || !broadcastMessage || selectedEmails.length === 0} className="rounded-full h-9 px-5 bg-primary hover:bg-primary/90 text-white font-black uppercase tracking-widest shadow-lg shadow-primary/30 w-full lg:w-auto">
                      <Send className="w-4 h-4 mr-2" /> Mulai Antrean Kirim
                    </Button>
                  )}
                </div>
                
                {broadcastLogs.length > 0 && (
                  <div className="space-y-2 pt-4">
                    <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1">Log Pengiriman</Label>
                    <div className="bg-slate-900 dark:bg-black rounded-2xl p-4 h-48 overflow-y-auto font-mono text-[11px] shadow-inner border-2 border-slate-800">
                      {broadcastLogs.map((log, idx) => (
                        <div key={idx} className={cn("mb-1 flex gap-2", log.type === 'error' ? "text-red-400" : log.type === 'success' ? "text-green-400" : "text-slate-300")}>
                          <span className="opacity-50 shrink-0">[{log.time}]</span>
                          <span>{log.msg}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="space-y-2 lg:border-l lg:border-slate-100 lg:dark:border-slate-800 lg:pl-6">
                <Label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-1 flex items-center gap-2"><Eye className="w-3.5 h-3.5"/> Live Preview Email</Label>
                <div className="rounded-2xl border-2 border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-950 overflow-hidden shadow-sm flex flex-col h-full min-h-[200px]">
                  <div className="bg-slate-50 dark:bg-slate-900 p-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-lg">
                        {(smtpProvider === 'gmail' ? gmailSenderName : customSenderName) ? (smtpProvider === 'gmail' ? gmailSenderName : customSenderName).charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-900 dark:text-white">{(smtpProvider === 'gmail' ? gmailSenderName : customSenderName) || 'Admin YadiApp'}</div>
                        <div className="text-[11px] text-muted-foreground">ke Karyawan (BCC)</div>
                      </div>
                    </div>
                    <div className="font-black text-lg text-slate-900 dark:text-white leading-tight break-words">
                      {broadcastSubject || 'Subjek Email...'}
                    </div>
                  </div>
                  <div className="p-5 flex-grow bg-white dark:bg-slate-950">
                    {broadcastMessage ? (
                      <div className="text-sm prose dark:prose-invert max-w-none text-slate-700 dark:text-slate-300 break-words" dangerouslySetInnerHTML={{ __html: broadcastMessage.replace(/\n/g, '<br>') }} />
                    ) : (
                      <div className="h-full flex items-center justify-center text-muted-foreground/50 text-sm italic">
                        Tampilan isi pesan akan muncul di sini...
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
        </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
