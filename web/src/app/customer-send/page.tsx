'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Upload, Send, File, Clock, CheckCircle2, AlertTriangle, Trash2, Users, Plus } from 'lucide-react';
import type { RegisterDesignItem } from '@/app/register-design/page';

interface CustomerLink {
  id: string;
  designId: string;
  originalFileId: string;
  customerEmail: string;
  expiresAt: any;
  createdAt: any;
  downloadedAt: any;
  downloadCount: number;
  downloadIps?: string[];
}

interface Contact {
  id: string;
  name: string;
  email: string;
  createdAt: any;
}

function CustomerSendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const designId = searchParams.get('id') as string;

  const getApiUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `https://inventorycgi.vercel.app${path}`;
    }
    return path;
  };

  const [design, setDesign] = useState<RegisterDesignItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<CustomerLink[]>([]);
  
  const [email, setEmail] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [expiresIn, setExpiresIn] = useState('1'); // Days
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  useEffect(() => {
    if (designId) {
      fetchData();
    }
  }, [designId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      // Fetch design
      const dDoc = await getDoc(doc(db, 'register_design', designId));
      if (dDoc.exists()) {
        const dData = { id: dDoc.id, ...dDoc.data() } as RegisterDesignItem;
        setDesign(dData);
        
        const fileName = (dData as any).originalFileName || `${dData.designNo} - ${dData.itemName}`;
        if (!emailSubject) setEmailSubject(`Download File: ${fileName}`);
        if (!emailBody) setEmailBody(
`Yth. Customer,

Berikut adalah tautan untuk mengunduh file ${fileName}.

Silakan klik tombol di bawah untuk memulai unduhan.

Salam hangat,
Tim Desain`);
      }

      // Fetch links
      const q = query(collection(db, 'customer_links'), where('designId', '==', designId));
      const snap = await getDocs(q);
      const linksData = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerLink));
      // sort by created descending
      linksData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLinks(linksData);

      // Fetch contacts
      const contactsSnap = await getDocs(collection(db, 'customer_contacts'));
      const contactsData = contactsSnap.docs.map(d => ({ id: d.id, ...d.data() } as Contact));
      setContacts(contactsData);
    } catch (error: any) {
      console.error("Fetch Data Error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data: ' + error.message });
    }
    setLoading(false);
  };

  const uploadToDriveResumable = async (file: File): Promise<string> => {
    setUploadProgress(10);
    // Init
    const token = await auth.currentUser?.getIdToken();
    const initRes = await fetch(getApiUrl('/api/upload-drive'), {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...(token ? { 'Authorization': `Bearer ${token}` } : {})
      },
      body: JSON.stringify({
        action: 'init',
        fileName: file.name,
        mimeType: file.type || 'application/octet-stream',
        folderType: 'original' // NEW FLAG
      })
    });
    const initData = await initRes.json();
    if (!initRes.ok) throw new Error(initData.error || 'Failed to init upload');
    
    const uploadUrl = initData.uploadUrl;
    
    // Upload bytes
    const CHUNK_SIZE = 5 * 1024 * 1024; // 5MB chunks
    const fileSize = file.size;
    let start = 0;
    
    while (start < fileSize) {
      const end = Math.min(start + CHUNK_SIZE, fileSize);
      const chunk = file.slice(start, end);
      
      const chunkRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: {
          'Content-Range': `bytes ${start}-${end - 1}/${fileSize}`
        },
        body: chunk
      });
      
      if (chunkRes.status === 308) {
        start = end;
        setUploadProgress(10 + Math.round((start / fileSize) * 80));
      } else if (chunkRes.status === 200 || chunkRes.status === 201) {
        const result = await chunkRes.json();
        setUploadProgress(90);
        // Finish permissions
        const finishToken = await auth.currentUser?.getIdToken();
        await fetch(getApiUrl('/api/upload-drive'), {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            ...(finishToken ? { 'Authorization': `Bearer ${finishToken}` } : {})
          },
          body: JSON.stringify({ action: 'finish', fileId: result.id })
        });
        setUploadProgress(100);
        return result.id;
      } else {
        throw new Error('Upload chunk failed');
      }
    }
    throw new Error('Upload failed');
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 2 * 1024 * 1024 * 1024) { // 2GB
      toast({ variant: 'destructive', title: 'File Terlalu Besar', description: 'Maksimal 2GB.' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);
    try {
      const fileId = await uploadToDriveResumable(file);
      await updateDoc(doc(db, 'register_design', designId), {
        originalFileId: fileId,
        originalFileName: file.name
      });
      setDesign(prev => prev ? { ...prev, originalFileId: fileId, originalFileName: file.name } as any : null);
      
      // Auto update subject and body when a new file is uploaded
      setEmailSubject(`Download File: ${file.name}`);
      setEmailBody(
`Yth. Customer,

Berikut adalah tautan untuk mengunduh file ${file.name}.

Silakan klik tombol di bawah untuk memulai unduhan.

Salam hangat,
Tim Desain`);

      toast({ title: 'Berhasil', description: 'File original berhasil diunggah.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Upload', description: error.message });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteOriginal = async () => {
    if (!design || !(design as any).originalFileId) return;
    if (!confirm('Hapus file original? Link yang ada akan rusak jika tidak ada file original baru.')) return;
    
    try {
      const token = await auth.currentUser?.getIdToken();
      await fetch(getApiUrl('/api/delete-drive'), {
         method: 'POST',
         headers: { 
           'Content-Type': 'application/json',
           ...(token ? { 'Authorization': `Bearer ${token}` } : {})
         },
         body: JSON.stringify({ fileId: (design as any).originalFileId })
      });
      await updateDoc(doc(db, 'register_design', designId), {
        originalFileId: null,
        originalFileName: null
      });
      setDesign(prev => prev ? { ...prev, originalFileId: undefined, originalFileName: undefined } as any : null);
      toast({ title: 'Dihapus', description: 'File original dihapus.' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal menghapus file: ' + e.message });
    }
  };

  const handleSaveContact = async () => {
    if (!newContactName || !newContactEmail) {
      toast({ variant: 'destructive', title: 'Peringatan', description: 'Nama dan Email wajib diisi' });
      return;
    }
    setIsSavingContact(true);
    try {
      const docRef = await addDoc(collection(db, 'customer_contacts'), {
        name: newContactName,
        email: newContactEmail,
        createdAt: serverTimestamp()
      });
      setContacts([...contacts, { id: docRef.id, name: newContactName, email: newContactEmail, createdAt: new Date() }]);
      setNewContactName('');
      setNewContactEmail('');
      toast({ title: 'Berhasil', description: 'Kontak berhasil disimpan' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    } finally {
      setIsSavingContact(false);
    }
  };

  const handleDeleteContact = async (id: string) => {
    if (!confirm('Hapus kontak ini?')) return;
    try {
      await deleteDoc(doc(db, 'customer_contacts', id));
      setContacts(contacts.filter(c => c.id !== id));
      toast({ title: 'Dihapus', description: 'Kontak dihapus' });
    } catch (e: any) {
      toast({ variant: 'destructive', title: 'Error', description: e.message });
    }
  };

  const handleSendLink = async () => {
    if (!email) {
      toast({ variant: 'destructive', title: 'Peringatan', description: 'Masukkan email tujuan.' });
      return;
    }
    if (!design || !(design as any).originalFileId) {
      toast({ variant: 'destructive', title: 'Peringatan', description: 'Unggah file original terlebih dahulu.' });
      return;
    }

    setIsSending(true);
    try {
      // 1. Create Link in DB
      const expiresDate = new Date();
      expiresDate.setDate(expiresDate.getDate() + parseInt(expiresIn));

      const linkRef = await addDoc(collection(db, 'customer_links'), {
        designId: designId,
        designNo: design.designNo || '',
        itemName: design.itemName || '',
        originalFileId: (design as any).originalFileId,
        originalFileName: (design as any).originalFileName || 'File Tersimpan',
        customerEmail: email,
        expiresAt: expiresDate,
        createdAt: serverTimestamp(),
        downloadCount: 0,
        downloadedAt: null
      });

      // 2. Fetch SMTP settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
      const emailSettings = settingsDoc.exists() ? settingsDoc.data() : null;
      if (!emailSettings || !emailSettings.smtpHost) {
        throw new Error('Konfigurasi SMTP email belum diatur di Pengaturan.');
      }
      
      const downloadUrl = window.location.origin + `/download?id=${linkRef.id}`;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">${emailSubject}</h2>
          <div style="color: #333; line-height: 1.5;">
            ${emailBody.replace(/\n/g, '<br>')}
          </div>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download File</a>
          </div>
          <p style="color: #ef4444; font-size: 12px;">Penting: Tautan ini akan otomatis kedaluwarsa pada <strong>${expiresDate.toLocaleString('id-ID')}</strong>.</p>
        </div>
      `;

      // 3. Send Email
      const smtp = {
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpSecure,
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPass,
        senderName: emailSettings.senderName,
        senderEmail: emailSettings.senderEmail
      };

      const token = await auth.currentUser?.getIdToken();
      const emailRes = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          smtp,
          to: [email],
          subject: emailSubject,
          html: htmlBody
        })
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        throw new Error(errData.error || 'Gagal mengirim email.');
      }

      toast({ title: 'Terkirim', description: 'Link berhasil dikirim ke ' + email });
      setEmail('');
      
      // 4. Update local links state
      const newLink: CustomerLink = {
        id: linkRef.id,
        designId: designId,
        originalFileId: (design as any).originalFileId,
        customerEmail: email,
        expiresAt: { seconds: Math.floor(expiresDate.getTime() / 1000) },
        createdAt: { seconds: Math.floor(Date.now() / 1000) },
        downloadCount: 0,
        downloadedAt: null
      };
      (newLink as any).originalFileName = (design as any).originalFileName || 'File Tersimpan';
      
      setLinks(prev => [newLink, ...prev]);

      // 5. Clear original file from design to allow new uploads
      await updateDoc(doc(db, 'register_design', designId), {
        originalFileId: null,
        originalFileName: null
      });
      setDesign(prev => prev ? { ...prev, originalFileId: undefined, originalFileName: undefined } as any : null);

    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal', description: error.message });
    } finally {
      setIsSending(false);
    }
  };

  const handleRevokeLink = async (linkId: string) => {
    if (!confirm('Cabut tautan ini? Customer tidak akan bisa mengunduh lagi.')) return;
    try {
       await deleteDoc(doc(db, 'customer_links', linkId));
       setLinks(prev => prev.filter(l => l.id !== linkId));
       toast({ title: 'Dicabut', description: 'Tautan berhasil dihapus.' });
    } catch (e: any) {
       toast({ variant: 'destructive', title: 'Error', description: 'Gagal menghapus tautan.' });
    }
  };

  if (loading) {
    return <DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div></DashboardLayout>;
  }

  if (!design) {
    return <DashboardLayout><div className="p-8 text-center text-red-500 font-bold">Desain tidak ditemukan.</div></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className="p-2 min-h-[calc(100vh-4rem)] w-full max-w-[1600px] mx-auto bg-slate-50/30 dark:bg-slate-950/30 relative">
        {/* Decorative ambient blurred orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-400/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 mb-8">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="icon" onClick={() => router.push('/register-design')} className="rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:scale-105 hover:shadow-md transition-all duration-300">
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-slate-800 to-slate-500 dark:from-white dark:to-slate-400 tracking-tight">
                Kirim Desain Original
              </h1>
              <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">{design.designNo}</span>
                {design.itemName}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* KOLOM KIRI (Upload & Send) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* BAGIAN UPLOAD FILE */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-blue-50/50 to-transparent dark:from-blue-900/10 border-b border-slate-100 dark:border-slate-800/60 pb-5">
                <CardTitle className="text-lg flex items-center gap-3 font-bold text-slate-800 dark:text-slate-100">
                  <div className="p-2 bg-blue-100 dark:bg-blue-900/50 rounded-lg text-blue-600 dark:text-blue-400">
                    <Upload className="w-5 h-5" />
                  </div>
                  1. Upload File
                </CardTitle>
                <CardDescription className="pl-12 text-xs">Penyimpanan master file (.psd, .ai, .zip) max 2GB.</CardDescription>
              </CardHeader>
              <CardContent className="p-6">
                {(design as any).originalFileId ? (
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100/50 dark:from-emerald-950/30 dark:to-emerald-900/20 border border-emerald-200 dark:border-emerald-800 rounded-xl p-4 flex items-center justify-between group transition-all duration-300 hover:shadow-md">
                    <div className="flex items-center gap-4 overflow-hidden">
                      <div className="bg-white dark:bg-emerald-900 p-2.5 rounded-xl shadow-sm border border-emerald-100 dark:border-emerald-700">
                        <File className="w-6 h-6 text-emerald-600 dark:text-emerald-400" />
                      </div>
                      <div className="overflow-hidden">
                        <h4 className="font-bold text-sm text-slate-800 dark:text-slate-200 truncate group-hover:text-emerald-700 dark:group-hover:text-emerald-300 transition-colors">{(design as any).originalFileName || 'File Tersimpan'}</h4>
                        <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1.5 mt-0.5"><CheckCircle2 className="w-3.5 h-3.5" /> Tersimpan & Siap dikirim</p>
                      </div>
                    </div>
                    <Button variant="ghost" size="icon" onClick={handleDeleteOriginal} className="text-red-500 hover:text-red-600 hover:bg-red-100 dark:hover:bg-red-900/30 opacity-70 group-hover:opacity-100 transition-opacity">
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-2xl p-8 text-center hover:bg-slate-50 dark:hover:bg-slate-800/50 hover:border-blue-400 dark:hover:border-blue-500 transition-all duration-300 group cursor-pointer" onClick={() => !isUploading && fileInputRef.current?.click()}>
                      <input
                        type="file"
                        ref={fileInputRef}
                        className="hidden"
                        onChange={handleFileUpload}
                        disabled={isUploading}
                      />
                      <div className="w-16 h-16 mx-auto bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 transition-all duration-300">
                        <Upload className="w-7 h-7 text-slate-400 group-hover:text-blue-500 transition-colors" />
                      </div>
                      <h3 className="font-bold text-slate-700 dark:text-slate-200 mb-1">Pilih File Master</h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Klik atau seret file besar hingga 2GB.</p>
                      
                      <Button disabled={isUploading} className="bg-slate-800 hover:bg-slate-900 dark:bg-white dark:text-slate-900 dark:hover:bg-slate-200 w-full rounded-xl h-11 transition-all duration-300 hover:shadow-lg">
                        {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <File className="w-4 h-4 mr-2" />}
                        {isUploading ? `Mengunggah ${uploadProgress}%` : 'Cari File Komputer'}
                      </Button>
                    </div>

                    {isUploading && (
                      <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden shadow-inner">
                        <div className="bg-gradient-to-r from-blue-500 to-indigo-500 h-full rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* BAGIAN KIRIM EMAIL */}
            <Card className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-2xl overflow-hidden hover:shadow-lg transition-all duration-300">
              <CardHeader className="bg-gradient-to-r from-purple-50/50 to-transparent dark:from-purple-900/10 border-b border-slate-100 dark:border-slate-800/60 pb-5">
                <CardTitle className="text-lg flex items-center gap-3 font-bold text-slate-800 dark:text-slate-100">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg text-purple-600 dark:text-purple-400">
                    <Send className="w-5 h-5" />
                  </div>
                  2. Kirim Link Tautan
                </CardTitle>
                <CardDescription className="pl-12 text-xs">Buat akses khusus untuk customer.</CardDescription>
              </CardHeader>
              <CardContent className="p-6 space-y-5">
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Email Customer</Label>
                    <Dialog open={isContactDialogOpen} onOpenChange={setIsContactDialogOpen}>
                      <DialogTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-7 px-3 text-xs rounded-full bg-purple-50 text-purple-600 hover:text-purple-700 hover:bg-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/40 transition-colors">
                          <Users className="w-3.5 h-3.5 mr-1.5" /> Pilih Kontak
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-md rounded-2xl p-0 overflow-hidden border-none shadow-2xl">
                        <DialogHeader className="p-6 bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                          <DialogTitle className="text-lg font-black">Buku Kontak Customer</DialogTitle>
                        </DialogHeader>
                        <div className="p-6 space-y-5 bg-white dark:bg-slate-950">
                          <div className="flex flex-col sm:flex-row gap-3">
                            <Input placeholder="Nama Klien..." value={newContactName} onChange={e => setNewContactName(e.target.value)} className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900" />
                            <Input placeholder="Email..." value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="flex-1 rounded-xl bg-slate-50 dark:bg-slate-900" />
                            <Button onClick={handleSaveContact} disabled={isSavingContact} className="px-4 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 dark:shadow-none">
                              {isSavingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                            </Button>
                          </div>
                          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                            {contacts.length === 0 ? (
                              <div className="text-sm text-center text-slate-400 py-10 italic border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-xl">Belum ada kontak tersimpan</div>
                            ) : (
                              contacts.map(c => (
                                <div key={c.id} className="flex items-center justify-between p-3.5 border border-slate-100 dark:border-slate-800 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors group">
                                  <div className="cursor-pointer flex-1" onClick={() => { setEmail(c.email); setIsContactDialogOpen(false); }}>
                                    <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">{c.name}</p>
                                    <p className="text-xs text-slate-500 mt-0.5">{c.email}</p>
                                  </div>
                                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all" onClick={() => handleDeleteContact(c.id)}>
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </div>
                  <Input 
                    placeholder="Masukkan email..." 
                    value={email} 
                    onChange={e => setEmail(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-purple-500"
                    list="contact-emails"
                  />
                  <datalist id="contact-emails">
                    {contacts.map(c => <option key={c.id} value={c.email}>{c.name}</option>)}
                  </datalist>
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Subjek Email</Label>
                  <Input 
                    value={emailSubject} 
                    onChange={e => setEmailSubject(e.target.value)}
                    className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-purple-500"
                  />
                </div>
                
                <div className="space-y-2">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Badan Email</Label>
                  <Textarea 
                    value={emailBody} 
                    onChange={e => setEmailBody(e.target.value)}
                    className="bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl resize-none focus-visible:ring-purple-500 min-h-[160px]"
                  />
                  <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-1">
                    Enter (baris baru) otomatis diubah jadi spasi ke bawah. Tombol link "Download File" akan disisipkan di paling bawah.
                  </p>
                </div>
                
                <div className="space-y-2 pb-2">
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Masa Berlaku</Label>
                  <Select value={expiresIn} onValueChange={setExpiresIn}>
                    <SelectTrigger className="h-11 bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 rounded-xl focus-visible:ring-purple-500 font-medium">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="rounded-xl border-slate-200 shadow-xl">
                      <SelectItem value="1">1 Hari (24 Jam)</SelectItem>
                      <SelectItem value="3">3 Hari</SelectItem>
                      <SelectItem value="7">7 Hari (1 Minggu)</SelectItem>
                    </SelectContent>
                  </Select>
                  <div className="flex items-start gap-1.5 mt-2 bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-500 p-2 rounded-lg border border-amber-100 dark:border-amber-900/50">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" /> 
                    <p className="text-[10px] leading-relaxed">Tautan rusak otomatis jika lewat waktu. Mengamankan file Anda dari akses publik.</p>
                  </div>
                </div>
                
                <Button onClick={handleSendLink} disabled={isSending || !(design as any).originalFileId} className="w-full h-12 text-sm font-bold rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-700 hover:to-indigo-700 text-white shadow-lg shadow-purple-200 dark:shadow-none hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5 group">
                  {isSending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Send className="w-5 h-5 mr-2 group-hover:scale-110 transition-transform" />}
                  Kirim Akses Download
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* KOLOM KANAN (Riwayat Pengiriman) */}
          <div className="lg:col-span-8">
            <Card className="h-full bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-slate-200/60 dark:border-slate-800/60 shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.2)] rounded-2xl overflow-hidden">
              <CardHeader className="bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800/60 pb-5 px-6">
                 <div className="flex items-center justify-between">
                   <CardTitle className="text-lg flex items-center gap-3 font-bold text-slate-800 dark:text-slate-100">
                     <div className="p-2 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-500 dark:text-slate-400">
                       <Clock className="w-5 h-5" />
                     </div>
                     Riwayat & Status Unduhan
                   </CardTitle>
                   <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 font-bold text-xs rounded-full border border-blue-100 dark:border-blue-800/50">
                     {links.length} Akses Diberikan
                   </div>
                 </div>
              </CardHeader>
              <CardContent className="p-0">
                 {links.length === 0 ? (
                   <div className="p-12 text-center text-slate-400 flex flex-col items-center justify-center min-h-[400px]">
                     <div className="w-24 h-24 bg-slate-50 dark:bg-slate-800/50 rounded-full flex items-center justify-center mb-4">
                       <Send className="w-10 h-10 text-slate-300 dark:text-slate-600" />
                     </div>
                     <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">Belum Ada Tautan</h3>
                     <p className="text-sm max-w-sm">Anda belum memberikan akses download kepada siapapun untuk desain ini. Mulai dengan form di sebelah kiri.</p>
                   </div>
                 ) : (
                   <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
                     {links.map(link => {
                       const isExpired = link.expiresAt?.seconds * 1000 < Date.now();
                       return (
                         <div key={link.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-5 hover:bg-blue-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                           <div className="flex-1 min-w-0">
                             <div className="flex items-center gap-3 mb-1.5">
                               <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-500 font-bold text-xs uppercase shrink-0">
                                 {link.customerEmail.charAt(0)}
                               </div>
                               <span className="font-bold text-slate-800 dark:text-slate-200 truncate text-base">{link.customerEmail}</span>
                               {isExpired ? (
                                 <span className="text-[10px] bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400 px-2.5 py-0.5 rounded-full font-bold border border-red-200 dark:border-red-800/50 shrink-0">Kedaluwarsa</span>
                               ) : (
                                 <span className="text-[10px] bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400 px-2.5 py-0.5 rounded-full font-bold border border-emerald-200 dark:border-emerald-800/50 shrink-0 flex items-center gap-1">
                                   <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div> Aktif
                                 </span>
                               )}
                             </div>
                             
                             <div className="pl-11 space-y-1.5">
                               <div className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1.5">
                                 <File className="w-3.5 h-3.5 text-blue-500" />
                                 <span className="truncate max-w-[250px] inline-block align-bottom">{(link as any).originalFileName || 'File Tersimpan'}</span>
                               </div>
                               <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                 <span className="flex items-center gap-1"><Clock className="w-3 h-3" /> Dikirim: {new Date(link.createdAt?.seconds * 1000).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                                 <span className="w-1 h-1 bg-slate-300 rounded-full hidden sm:block"></span>
                                 <span className={`flex items-center gap-1 ${isExpired ? 'text-red-400' : ''}`}>Berakhir: {new Date(link.expiresAt?.seconds * 1000).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</span>
                               </div>
                             </div>
                           </div>
                           
                           <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-900 p-3 rounded-xl border border-slate-100 dark:border-slate-800 shrink-0 self-start sm:self-auto ml-11 sm:ml-0">
                              <div className="text-center px-3 border-r border-slate-200 dark:border-slate-700">
                                 <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Diunduh</div>
                                 <div className="font-black text-lg text-slate-700 dark:text-slate-200 leading-none">{link.downloadCount}<span className="text-xs text-slate-400 font-medium ml-0.5">x</span></div>
                              </div>
                              <div className="min-w-[120px]">
                                {link.downloadedAt ? (
                                  <div className="text-left text-xs">
                                     <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1 mb-0.5"><CheckCircle2 className="w-3 h-3" /> Terakhir:</div>
                                     <div className="text-slate-600 dark:text-slate-300 font-medium">{new Date(link.downloadedAt?.seconds * 1000).toLocaleString('id-ID', {day:'2-digit', month:'short', hour:'2-digit', minute:'2-digit'})}</div>
                                     {link.downloadIps && link.downloadIps.length > 0 && (
                                       <div className="mt-2 border-t border-slate-100 dark:border-slate-800/50 pt-1.5">
                                         <div className="text-[9px] font-bold text-slate-400 dark:text-slate-500 mb-1 uppercase tracking-wider">Histori IP ({link.downloadIps.length}):</div>
                                         <div className="flex flex-wrap gap-1 max-w-[180px] max-h-[50px] overflow-y-auto custom-scrollbar pr-1">
                                           {link.downloadIps.map((ip, i) => (
                                             <span key={i} className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 text-[10px] font-mono rounded text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-700" title={`IP Pengunduh ke-${i+1}`}>
                                                {ip}
                                             </span>
                                           ))}
                                         </div>
                                       </div>
                                     )}
                                  </div>
                                ) : (
                                  <div className="text-left text-xs text-slate-400 italic flex items-center h-full">Belum pernah diunduh</div>
                                )}
                              </div>
                              {!isExpired && (
                                 <Button variant="ghost" size="icon" onClick={() => handleRevokeLink(link.id)} className="text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 ml-2 rounded-lg opacity-0 group-hover:opacity-100 transition-all focus:opacity-100" title="Cabut Tautan">
                                    <Trash2 className="w-4 h-4" />
                                 </Button>
                              )}
                           </div>
                         </div>
                       );
                     })}
                   </div>
                 )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}

export default function CustomerSendPage() {
  return (
    <Suspense fallback={<DashboardLayout><div className="flex h-screen items-center justify-center"><Loader2 className="animate-spin text-blue-500 w-8 h-8" /></div></DashboardLayout>}>
      <CustomerSendContent />
    </Suspense>
  );
}
