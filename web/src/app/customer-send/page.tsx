'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc, serverTimestamp } from 'firebase/firestore';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Upload, Send, File, Clock, CheckCircle2, AlertTriangle, Trash2 } from 'lucide-react';
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
}

function CustomerSendContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const designId = searchParams.get('id') as string;

  const [design, setDesign] = useState<RegisterDesignItem | null>(null);
  const [loading, setLoading] = useState(true);
  const [links, setLinks] = useState<CustomerLink[]>([]);
  
  const [email, setEmail] = useState('');
  const [expiresIn, setExpiresIn] = useState('1'); // Days
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

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
        setDesign({ id: dDoc.id, ...dDoc.data() } as RegisterDesignItem);
      }

      // Fetch links
      const q = query(collection(db, 'customer_links'), where('designId', '==', designId));
      const snap = await getDocs(q);
      const linksData = snap.docs.map(d => ({ id: d.id, ...d.data() } as CustomerLink));
      // sort by created descending
      linksData.sort((a,b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setLinks(linksData);
    } catch (error: any) {
      console.error("Fetch Data Error:", error);
      toast({ variant: 'destructive', title: 'Error', description: 'Gagal memuat data: ' + error.message });
    }
    setLoading(false);
  };

  const uploadToDriveResumable = async (file: File): Promise<string> => {
    setUploadProgress(10);
    // Init
    const initRes = await fetch('/api/upload-drive', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
        await fetch('/api/upload-drive', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
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
      await fetch('/api/delete-drive', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
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
        originalFileId: (design as any).originalFileId,
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
      
      const downloadUrl = `${window.location.origin}/api/customer-download/${linkRef.id}`;
      
      const htmlBody = `
        <div style="font-family: Arial, sans-serif; max-w-md; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
          <h2 style="color: #2563eb;">Download Desain Original</h2>
          <p>Yth. Customer,</p>
          <p>Berikut adalah tautan untuk mengunduh file original dari desain <strong>${design.designNo}</strong> - <strong>${design.itemName}</strong>.</p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${downloadUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Download File</a>
          </div>
          <p style="color: #ef4444; font-size: 12px;">Penting: Tautan ini akan otomatis kedaluwarsa pada <strong>${expiresDate.toLocaleString('id-ID')}</strong>.</p>
          <p>Salam hangat,<br>Tim Desain</p>
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

      const emailRes = await fetch('/api/send-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          smtp,
          to: [email],
          subject: `Download Desain ${design.designNo}`,
          html: htmlBody
        })
      });

      if (!emailRes.ok) {
        const errData = await emailRes.json();
        throw new Error(errData.error || 'Gagal mengirim email.');
      }

      toast({ title: 'Terkirim', description: 'Link berhasil dikirim ke ' + email });
      setEmail('');
      fetchData(); // Refresh links
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
      <div className="p-4 sm:p-8 space-y-6 max-w-5xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" size="icon" onClick={() => router.push('/register-design')} className="rounded-full bg-slate-100 hover:bg-slate-200">
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black text-slate-800 dark:text-white">Kirim Desain Original</h1>
            <p className="text-sm font-medium text-slate-500">Desain: {design.designNo} - {design.itemName}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* BAGIAN UPLOAD FILE */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><Upload className="w-5 h-5 text-blue-500" /> 1. Upload File Original</CardTitle>
              <CardDescription>Penyimpanan file asli (.psd, .ai, .zip) max 2GB.</CardDescription>
            </CardHeader>
            <CardContent className="p-6">
              {(design as any).originalFileId ? (
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3 overflow-hidden">
                    <div className="bg-emerald-100 p-2 rounded-lg">
                      <File className="w-6 h-6 text-emerald-600" />
                    </div>
                    <div className="overflow-hidden">
                      <h4 className="font-bold text-sm text-slate-800 truncate">{(design as any).originalFileName || 'File Tersimpan'}</h4>
                      <p className="text-xs text-emerald-600 font-medium flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Siap dikirim</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="icon" onClick={handleDeleteOriginal} className="text-red-500 hover:text-red-700 hover:bg-red-50">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-200 rounded-xl p-8 text-center hover:bg-slate-50 transition-colors">
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      className="hidden" 
                      onChange={handleFileUpload} 
                      disabled={isUploading}
                    />
                    <Upload className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                    <h3 className="font-bold text-slate-700 mb-1">Pilih File Master</h3>
                    <p className="text-xs text-slate-500 mb-4">Mendukung file besar hingga 2GB.</p>
                    <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="bg-blue-600 hover:bg-blue-700 w-full sm:w-auto">
                      {isUploading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <File className="w-4 h-4 mr-2" />}
                      {isUploading ? `Mengunggah ${uploadProgress}%` : 'Cari File'}
                    </Button>
                    
                    {isUploading && (
                      <div className="mt-4 w-full bg-slate-100 rounded-full h-1.5">
                         <div className="bg-blue-500 h-1.5 rounded-full transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* BAGIAN KIRIM EMAIL */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
              <CardTitle className="text-lg flex items-center gap-2"><Send className="w-5 h-5 text-purple-500" /> 2. Kirim Link Tautan</CardTitle>
              <CardDescription>Kirim link download ke email customer.</CardDescription>
            </CardHeader>
            <CardContent className="p-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Email Customer</Label>
                <Input 
                  placeholder="contoh@perusahaan.com" 
                  value={email} 
                  onChange={e => setEmail(e.target.value)}
                  className="bg-slate-50"
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-bold text-slate-500 uppercase">Masa Aktif Tautan</Label>
                <Select value={expiresIn} onValueChange={setExpiresIn}>
                  <SelectTrigger className="bg-slate-50">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">1 Hari</SelectItem>
                    <SelectItem value="3">3 Hari</SelectItem>
                    <SelectItem value="7">7 Hari</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-[10px] text-amber-600 flex items-center gap-1 mt-1">
                  <AlertTriangle className="w-3 h-3" /> File akan terhapus otomatis setelah lewat masa aktif.
                </p>
              </div>
              
              <Button onClick={handleSendLink} disabled={isSending || !(design as any).originalFileId} className="w-full bg-purple-600 hover:bg-purple-700 mt-2 h-12">
                {isSending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                Kirim Tautan Download
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* RIWAYAT PENGIRIMAN */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="bg-slate-50/50 border-b border-slate-100 pb-4">
             <CardTitle className="text-lg flex items-center gap-2"><Clock className="w-5 h-5 text-slate-500" /> Riwayat & Status Unduhan</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
             {links.length === 0 ? (
               <div className="p-8 text-center text-slate-500 text-sm">Belum ada link yang dikirim untuk desain ini.</div>
             ) : (
               <div className="divide-y divide-slate-100">
                 {links.map(link => {
                   const isExpired = link.expiresAt?.seconds * 1000 < Date.now();
                   return (
                     <div key={link.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                       <div>
                         <div className="flex items-center gap-2 mb-1">
                           <span className="font-bold text-slate-800">{link.customerEmail}</span>
                           {isExpired ? (
                             <span className="text-[10px] bg-red-100 text-red-600 px-2 py-0.5 rounded-full font-bold">Kedaluwarsa</span>
                           ) : (
                             <span className="text-[10px] bg-emerald-100 text-emerald-600 px-2 py-0.5 rounded-full font-bold">Aktif</span>
                           )}
                         </div>
                         <div className="text-xs text-slate-500 flex flex-col sm:flex-row gap-2 sm:gap-4 mt-1.5">
                           <span><strong>Dikirim:</strong> {new Date(link.createdAt?.seconds * 1000).toLocaleString('id-ID')}</span>
                           <span><strong>Berakhir:</strong> {new Date(link.expiresAt?.seconds * 1000).toLocaleString('id-ID')}</span>
                         </div>
                       </div>
                       <div className="flex items-center gap-4 shrink-0 bg-slate-100 p-2 rounded-lg border border-slate-200">
                          <div className="text-center px-2">
                             <div className="text-[10px] font-bold text-slate-400 uppercase">Diunduh</div>
                             <div className="font-black text-slate-700">{link.downloadCount}x</div>
                          </div>
                          {link.downloadedAt ? (
                            <div className="text-left text-xs">
                               <div className="text-[10px] text-emerald-600 font-bold flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> Terakhir:</div>
                               <div className="text-slate-600">{new Date(link.downloadedAt?.seconds * 1000).toLocaleString('id-ID')}</div>
                            </div>
                          ) : (
                            <div className="text-left text-xs text-slate-400 italic">Belum diunduh</div>
                          )}
                          {!isExpired && (
                             <Button variant="ghost" size="icon" onClick={() => handleRevokeLink(link.id)} className="text-red-500 hover:text-red-700 hover:bg-red-50 ml-2" title="Cabut Link">
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
