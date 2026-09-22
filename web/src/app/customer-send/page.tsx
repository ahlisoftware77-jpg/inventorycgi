'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { db, auth } from '@/lib/firebase/config';
import { doc, getDoc, collection, query, where, getDocs, updateDoc, addDoc, deleteDoc, serverTimestamp, orderBy } from 'firebase/firestore';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ArrowLeft, Upload, Send, File, Clock, CheckCircle2, AlertTriangle, Trash2, Users, Plus, Layers, ChevronLeft, ChevronRight, Eye } from 'lucide-react';

const parseFeedback = (text: string | null | undefined) => {
  if (!text) return '-';
  try {
    if (text.trim().startsWith('[') && text.trim().endsWith(']')) {
      const parsed = JSON.parse(text);
      if (Array.isArray(parsed)) {
        return parsed.map((item: any) => item.c2).filter(Boolean).join(' | ');
      }
    }
  } catch(e) {}
  return text;
};

import type { RegisterDesignItem } from '@/app/register-design/page';
import { useAuth } from '@/hooks/use-auth';

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
  senderName?: string;
  senderId?: string;
}

const getStatusColor = (val: string) => {
  switch(val) {
    case 'IN LOCK': return 'bg-rose-500 text-white border-rose-600';
    case 'IN USE': return 'bg-emerald-500 text-white border-emerald-600';
    case 'FREE': return 'bg-blue-500 text-white border-blue-600';
    case 'ARCHIVE': return 'bg-sky-400 text-white border-sky-500';
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const getTypeDesignColor = (val: string) => {
  switch(val) {
    case 'CG': return 'bg-sky-200 text-sky-900 border-sky-300';
    case 'CGI': return 'bg-yellow-200 text-yellow-900 border-yellow-300';
    case 'CGI-A': return 'bg-orange-200 text-orange-900 border-orange-300';
    case 'ST': return 'bg-emerald-200 text-emerald-900 border-emerald-300';
    case 'CGL': return 'bg-slate-200 dark:bg-slate-950 text-slate-900 dark:text-slate-100 border-slate-300 dark:border-slate-600';
    case 'CO': return 'bg-purple-200 text-purple-900 border-purple-300';
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const getDesignerColor = (val: string) => {
  switch(val) {
    case 'D1 Riki': return 'bg-blue-700 text-blue-50 border-blue-800 font-medium';
    case 'D2 Diaz': return 'bg-[#156e47] text-emerald-50 border-emerald-900 font-medium';
    case 'D3 Rian': return 'bg-[#7a3b00] text-amber-50 border-amber-950 font-medium';
    case 'D4 Darmawan': return 'bg-[#b30000] text-red-50 border-red-900 font-medium';
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

const getTechnicianColor = (val: string) => {
  switch(val) {
    case 'T1 Darta': return 'bg-[#cce5ff] text-blue-900 border-[#b8daff] font-medium';
    case 'T2 Kardani': return 'bg-[#d4edda] text-emerald-900 border-[#c3e6cb] font-medium';
    case 'T3 Rafli': return 'bg-[#ffe8cc] text-orange-900 border-[#ffdfb3] font-medium';
    case 'T4 Cepi': return 'bg-[#fff3cd] text-yellow-900 border-[#ffeeba] font-medium';
    default: return 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';
  }
};

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
  const { user } = useAuth();

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
  const [customSenderName, setCustomSenderName] = useState('');
  const [emailSubject, setEmailSubject] = useState('');
  const [emailBody, setEmailBody] = useState('');
  const [expiresIn, setExpiresIn] = useState('1'); // Days
  const [isUploading, setIsUploading] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [allIds, setAllIds] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const [contacts, setContacts] = useState<Contact[]>([]);
  const [isContactDialogOpen, setIsContactDialogOpen] = useState(false);
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [newContactName, setNewContactName] = useState('');
  const [newContactEmail, setNewContactEmail] = useState('');
  const [isSavingContact, setIsSavingContact] = useState(false);

  useEffect(() => {
    if (designId) {
      fetchData();
    }
  }, [designId]);

  useEffect(() => {
    const fetchAllIds = async () => {
      try {
        const q = query(collection(db, 'register_design'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        const ids = snap.docs.map(doc => doc.id);
        setAllIds(ids);
      } catch (e) {
        console.error("Gagal memuat list ID", e);
      }
    };
    fetchAllIds();
  }, []);

  const getPreviewHtml = () => {
    const previewDate = new Date();
    previewDate.setDate(previewDate.getDate() + parseInt(expiresIn));
    const downloadUrl = '#';
    const logoUrl = typeof window !== 'undefined' ? window.location.origin + '/logo_cgi_transparent.png' : '';
    
    return `
      <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center; color: #1e293b; max-height: 80vh; overflow-y: auto;">
        <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden;">
          <!-- Watermark -->
          <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.15; pointer-events: none; z-index: 0; user-select: none; width: 80%; max-width: 400px;">
            <img src="${logoUrl}" alt="Watermark" style="width: 100%; height: auto; opacity: 1;" />
          </div>
          
          <div style="position: relative; z-index: 1;">
            <h2 style="color: #4f46e5; margin-bottom: 24px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${emailSubject || 'Subjek Email'}</h2>
            
            <div style="color: #475569; line-height: 1.8; font-size: 16px; margin-bottom: 32px; text-align: center;">
              ${(emailBody || 'Badan email akan muncul di sini').replace(/\n/g, '<br>')}
            </div>
            
            <div style="margin: 40px 0;">
              <!--[if mso]>
              <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${downloadUrl}" style="height:54px;v-text-anchor:middle;width:240px;" arcsize="23%" stroke="f" fillcolor="#6366f1">
                <w:anchorlock/>
                <center>
              <![endif]-->
              <a href="${downloadUrl}" style="background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); color: white; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); display: inline-block;">
                UNDUH FILE SEKARANG
              </a>
              <!--[if mso]>
                </center>
              </v:roundrect>
              <![endif]-->
            </div>
            
            <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; margin-top: 32px;">
              <p style="color: #ef4444; font-size: 14px; margin: 0; line-height: 1.5;">
                <strong>Penting:</strong> Tautan unduhan ini akan otomatis kedaluwarsa pada<br>
                <strong style="font-size: 16px; display: block; margin-top: 4px;">${previewDate.toLocaleString('id-ID')}</strong>
              </p>
            </div>
          </div>
        </div>
        <div style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
          Email ini dikirim otomatis oleh sistem Inventory CGI.<br>
          Mohon tidak membalas email ini secara langsung.
        </div>
      </div>
    `;
  };

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

      // Fetch default sender name
      const settingsDoc = await getDoc(doc(db, 'settings', 'general'));
      if (settingsDoc.exists() && !customSenderName) {
        setCustomSenderName(settingsDoc.data().senderName || '');
      }

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

    // Upload bytes (Bypass Vercel, directly to Google Drive)
    setUploadProgress(10);
    const uploadRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'Content-Type': file.type },
      body: file
    });

    if (!uploadRes.ok) {
      throw new Error('Gagal mengunggah file. Status: ' + uploadRes.status);
    }
    
    setUploadProgress(90);
    const result = await uploadRes.json();
    
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
        downloadedAt: null,
        senderName: user?.displayName || (user as any)?.name || user?.email || 'Unknown',
        senderId: user?.uid || ''
      });

      // 2. Fetch SMTP settings
      const settingsDoc = await getDoc(doc(db, 'settings', 'email'));
      const emailSettings = settingsDoc.exists() ? settingsDoc.data() : null;
      if (!emailSettings || !emailSettings.smtpHost) {
        throw new Error('Konfigurasi SMTP email belum diatur di Pengaturan.');
      }
      
      const downloadUrl = window.location.origin + `/download?id=${linkRef.id}`;
      const logoUrl = window.location.origin + '/logo_cgi_transparent.png';

      const htmlBody = `
        <div style="font-family: 'Inter', Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 40px 20px; text-align: center; color: #1e293b;">
          <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px 30px; border-radius: 24px; box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.05); position: relative; overflow: hidden;">
            <!-- Watermark -->
            <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); opacity: 0.15; pointer-events: none; z-index: 0; user-select: none; width: 80%; max-width: 400px;">
              <img src="${logoUrl}" alt="Watermark" style="width: 100%; height: auto; opacity: 1;" />
            </div>
            
            <div style="position: relative; z-index: 1;">
              <h2 style="color: #4f46e5; margin-bottom: 24px; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">${emailSubject}</h2>
              
              <div style="color: #475569; line-height: 1.8; font-size: 16px; margin-bottom: 32px; text-align: center;">
                ${emailBody.replace(/\n/g, '<br>')}
              </div>
              
              <div style="margin: 40px 0;">
                <!--[if mso]>
                <v:roundrect xmlns:v="urn:schemas-microsoft-com:vml" xmlns:w="urn:schemas-microsoft-com:office:word" href="${downloadUrl}" style="height:54px;v-text-anchor:middle;width:240px;" arcsize="23%" stroke="f" fillcolor="#6366f1">
                  <w:anchorlock/>
                  <center>
                <![endif]-->
                <a href="${downloadUrl}" style="background-color: #6366f1; background: linear-gradient(135deg, #6366f1, #8b5cf6, #d946ef); color: white; padding: 16px 36px; text-decoration: none; border-radius: 12px; font-weight: 700; font-size: 16px; box-shadow: 0 4px 14px 0 rgba(99, 102, 241, 0.39); display: inline-block;">
                  UNDUH FILE SEKARANG
                </a>
                <!--[if mso]>
                  </center>
                </v:roundrect>
                <![endif]-->
              </div>
              
              <div style="background-color: #fef2f2; border: 1px solid #fee2e2; border-radius: 12px; padding: 16px; margin-top: 32px;">
                <p style="color: #ef4444; font-size: 14px; margin: 0; line-height: 1.5;">
                  <strong>Penting:</strong> Tautan unduhan ini akan otomatis kedaluwarsa pada<br>
                  <strong style="font-size: 16px; display: block; margin-top: 4px;">${expiresDate.toLocaleString('id-ID')}</strong>
                </p>
              </div>
            </div>
          </div>
          <div style="margin-top: 24px; font-size: 12px; color: #94a3b8;">
            Email ini dikirim otomatis oleh sistem Inventory CGI.<br>
            Mohon tidak membalas email ini secara langsung.
          </div>
        </div>
      `;

      // 3. Send Email
      const smtp = {
        host: emailSettings.smtpHost,
        port: emailSettings.smtpPort,
        secure: emailSettings.smtpSecure,
        user: emailSettings.smtpUser,
        pass: emailSettings.smtpPass,
        senderName: customSenderName || emailSettings.senderName,
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
        downloadedAt: null,
        senderName: user?.displayName || (user as any)?.name || user?.email || 'Unknown',
        senderId: user?.uid || ''
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
      <div className="p-2 min-h-[calc(100vh-4rem)] w-full max-w-[1600px] mx-auto bg-gradient-to-br from-indigo-50/60 via-purple-50/40 to-pink-50/50 dark:from-indigo-950/30 dark:via-purple-950/20 dark:to-pink-950/30 relative overflow-hidden">
        {/* Decorative ambient blurred orbs */}
        <div className="absolute top-[-10%] left-[-5%] w-[500px] h-[500px] bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-[100px] pointer-events-none animate-pulse" style={{ animationDuration: '8s' }}></div>
        <div className="absolute top-[20%] right-[-10%] w-[600px] h-[600px] bg-purple-400/20 dark:bg-purple-600/10 rounded-full blur-[120px] pointer-events-none animate-pulse" style={{ animationDuration: '12s' }}></div>
        <div className="absolute bottom-[-10%] left-[20%] w-[700px] h-[700px] bg-pink-400/20 dark:bg-pink-600/10 rounded-full blur-[130px] pointer-events-none animate-pulse" style={{ animationDuration: '10s' }}></div>
        
        <div className="relative z-10 mb-8 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="icon" onClick={() => router.push('/register-design')} className="rounded-xl bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm border-slate-200 dark:border-slate-700 hover:scale-105 hover:shadow-md transition-all duration-300">
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-black bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 dark:from-indigo-400 dark:via-purple-400 dark:to-pink-400 tracking-tight">
                  Kirim Desain Original
                </h1>
                <p className="text-sm font-medium text-slate-500 mt-1 flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded-md bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-800">{design.designNo}</span>
                  {design.itemName}
                </p>
              </div>
            </div>
            
            {/* NEXT / PREV ITEM */}
            {allIds.length > 0 && (
              <div className="flex items-center gap-2 bg-white/60 dark:bg-slate-800/60 p-1.5 rounded-2xl backdrop-blur-md border border-slate-200 dark:border-slate-700 shadow-sm">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => {
                    const idx = allIds.indexOf(designId || '');
                    if (idx > 0) router.push(`/customer-send?id=${allIds[idx - 1]}`);
                  }}
                  disabled={allIds.indexOf(designId || '') <= 0}
                  className="h-9 px-3 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-xl transition-colors disabled:opacity-30"
                >
                  <ChevronLeft className="w-4 h-4 mr-1" /> Prev
                </Button>
                <div className="w-px h-5 bg-slate-200 dark:bg-slate-700"></div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => {
                    const idx = allIds.indexOf(designId || '');
                    if (idx !== -1 && idx < allIds.length - 1) router.push(`/customer-send?id=${allIds[idx + 1]}`);
                  }}
                  disabled={allIds.indexOf(designId || '') === -1 || allIds.indexOf(designId || '') === allIds.length - 1}
                  className="h-9 px-3 hover:bg-pink-50 dark:hover:bg-pink-900/30 hover:text-pink-600 dark:hover:text-pink-400 rounded-xl transition-colors disabled:opacity-30"
                >
                  Next <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </div>
            )}
          </div>
          
          {/* INFORMASI DESAIN DETAIL */}
          <div className="relative">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-2xl border border-white/40 dark:border-slate-700/40 p-4 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.06)] dark:shadow-[0_8px_30px_rgb(0,0,0,0.3)] transition-all duration-500">
                  <div className="bg-gradient-to-br from-blue-50/80 to-blue-100/50 dark:from-blue-900/20 dark:to-blue-800/10 p-3.5 rounded-2xl border border-blue-100/50 dark:border-blue-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-blue-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-blue-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> Sumber Desain</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{design.designSource || '-'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-purple-50/80 to-purple-100/50 dark:from-purple-900/20 dark:to-purple-800/10 p-3.5 rounded-2xl border border-purple-100/50 dark:border-purple-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-purple-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-purple-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> Cust / Designer</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate flex items-center gap-1" title={`${design.customer || '-'} / ${design.designer || '-'}`}>
                      {design.customer || '-'} <span className="text-purple-300 dark:text-purple-700 mx-1">/</span> 
                      {design.designer ? (
                        <span className={`px-2 py-0.5 rounded-md border text-xs shadow-sm ${getDesignerColor(design.designer)}`}>
                          {design.designer}
                        </span>
                      ) : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50/80 to-amber-100/50 dark:from-amber-900/20 dark:to-amber-800/10 p-3.5 rounded-2xl border border-amber-100/50 dark:border-amber-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-amber-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-amber-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span> Teknisi</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center">
                      {design.technician ? (
                        <span className={`px-2 py-0.5 rounded-md border text-xs shadow-sm ${getTechnicianColor(design.technician)}`}>
                          {design.technician}
                        </span>
                      ) : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50/80 to-emerald-100/50 dark:from-emerald-900/20 dark:to-emerald-800/10 p-3.5 rounded-2xl border border-emerald-100/50 dark:border-emerald-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-emerald-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-emerald-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> Tujuan</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1" title={design.benefitText || design.benefit || '-'}>
                      {design.benefitText || design.benefit || '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-rose-50/80 to-rose-100/50 dark:from-rose-900/20 dark:to-rose-800/10 p-3.5 rounded-2xl border border-rose-100/50 dark:border-rose-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-rose-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-rose-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span> Spesifikasi</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1 flex items-center" title={`${design.typeDesign || ''} ${design.sizeChecks === 'Custom cm' && design.sizeCm1 && design.sizeCm2 ? design.sizeCm1 + 'x' + design.sizeCm2 + 'cm' : (design.sizeChecks || '')}`}>
                      {design.typeDesign ? (
                        <span className={`px-2 py-0.5 rounded-md border text-xs shadow-sm mr-1.5 ${getTypeDesignColor(design.typeDesign)}`}>
                          {design.typeDesign}
                        </span>
                      ) : '-'} 
                      <span className="text-rose-400 font-medium">{design.sizeChecks ? `(${design.sizeChecks === 'Custom cm' && design.sizeCm1 && design.sizeCm2 ? `${design.sizeCm1}x${design.sizeCm2}cm` : design.sizeChecks})` : ''}</span>
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-cyan-50/80 to-cyan-100/50 dark:from-cyan-900/20 dark:to-cyan-800/10 p-3.5 rounded-2xl border border-cyan-100/50 dark:border-cyan-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-cyan-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-cyan-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-cyan-500"></span> Status</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 flex items-center">
                      {design.status ? (
                        <span className={`px-2 py-0.5 rounded-md border text-xs shadow-sm ${getStatusColor(design.status)}`}>
                          {design.status}
                        </span>
                      ) : '-'}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-fuchsia-50/80 to-fuchsia-100/50 dark:from-fuchsia-900/20 dark:to-fuchsia-800/10 p-3.5 rounded-2xl border border-fuchsia-100/50 dark:border-fuchsia-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-fuchsia-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-fuchsia-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500"></span> Mesin / Tipe</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{design.type || '-'}</p>
                  </div>
                  <div className="bg-gradient-to-br from-lime-50/80 to-lime-100/50 dark:from-lime-900/20 dark:to-lime-800/10 p-3.5 rounded-2xl border border-lime-100/50 dark:border-lime-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-lime-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-lime-600 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-lime-500"></span> Material Glaze</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1" title={`${design.glazeChecks || ''} ${design.glazeResidue || ''}`}>
                      {design.glazeChecks || '-'} {design.glazeResidue ? <span className="text-lime-500 font-medium ml-1">({design.glazeResidue})</span> : ''}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-orange-50/80 to-orange-100/50 dark:from-orange-900/20 dark:to-orange-800/10 p-3.5 rounded-2xl border border-orange-100/50 dark:border-orange-800/30 hover:-translate-y-0.5 hover:shadow-md hover:shadow-orange-100 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-orange-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-orange-500"></span> Efek Permukaan</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-1" title={`${design.surfaceChecks || ''} ${design.surfaceTemp || ''}`}>
                      {design.surfaceChecks || '-'} {design.surfaceTemp ? <span className="text-orange-400 font-medium ml-1">({design.surfaceTemp})</span> : ''}
                    </p>
                  </div>
                  <div className="bg-gradient-to-br from-slate-100/80 to-slate-200/50 dark:from-slate-800/40 dark:to-slate-700/20 p-3.5 rounded-2xl border border-slate-200/50 dark:border-slate-700/50 hover:-translate-y-0.5 hover:shadow-md hover:shadow-slate-200 dark:hover:shadow-none transition-all duration-300">
                    <p className="text-[10px] uppercase font-black text-slate-500 mb-1 tracking-wider flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span> Keterangan</p>
                    <p className="text-sm font-bold text-slate-700 dark:text-slate-300 line-clamp-1" title={parseFeedback(design.feedback || design.feedbackDetails)}>
                      {parseFeedback(design.feedback || design.feedbackDetails)}
                    </p>
                  </div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative z-10">
          
          {/* KOLOM KIRI (Upload & Send) */}
          <div className="lg:col-span-4 space-y-6">
            
            {/* BAGIAN UPLOAD FILE */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border-blue-100/60 dark:border-blue-900/40 shadow-xl shadow-blue-900/5 dark:shadow-blue-900/20 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-blue-900/10 transition-all duration-500 relative group">
              <CardHeader className="bg-gradient-to-br from-blue-100/50 via-white/50 to-transparent dark:from-blue-900/20 dark:via-slate-900/20 border-b border-blue-100/50 dark:border-blue-900/30 pb-5 relative z-10">
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

            {/* BAGIAN KIRIM LINK */}
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border-purple-100/60 dark:border-purple-900/40 shadow-xl shadow-purple-900/5 dark:shadow-purple-900/20 rounded-3xl overflow-hidden hover:shadow-2xl hover:shadow-purple-900/10 transition-all duration-500 relative group">
              <CardHeader className="bg-gradient-to-br from-purple-100/50 via-white/50 to-transparent dark:from-purple-900/20 dark:via-slate-900/20 border-b border-purple-100/50 dark:border-purple-900/30 pb-5 relative z-10">
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
                      <DialogContent className="max-w-md rounded-3xl p-0 overflow-hidden border border-purple-100/50 dark:border-purple-900/30 shadow-2xl shadow-purple-900/10 dark:shadow-purple-900/50">
                        <DialogHeader className="p-6 bg-gradient-to-r from-purple-600 to-indigo-600 text-white">
                          <DialogTitle className="text-xl font-black flex items-center gap-2">
                            <Users className="w-5 h-5 text-purple-200" /> Buku Kontak Klien
                          </DialogTitle>
                          <p className="text-xs text-purple-200 font-medium opacity-90 mt-1">Simpan email klien untuk pengiriman yang lebih cepat dan bebas typo.</p>
                        </DialogHeader>
                        <div className="p-6 space-y-6 bg-white dark:bg-slate-950">
                          {/* Form Tambah Kontak */}
                          <div className="p-4 bg-purple-50/50 dark:bg-purple-900/10 rounded-2xl border border-purple-100 dark:border-purple-900/30 space-y-3">
                            <p className="text-xs font-bold text-purple-700 dark:text-purple-400 uppercase tracking-wider">Tambah Baru</p>
                            <div className="flex flex-col sm:flex-row gap-2">
                              <Input placeholder="Nama..." value={newContactName} onChange={e => setNewContactName(e.target.value)} className="flex-1 h-9 rounded-xl bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 focus-visible:ring-purple-500 shadow-sm text-sm" />
                              <Input placeholder="Email..." value={newContactEmail} onChange={e => setNewContactEmail(e.target.value)} className="flex-1 h-9 rounded-xl bg-white dark:bg-slate-900 border-purple-200 dark:border-purple-800 focus-visible:ring-purple-500 shadow-sm text-sm" />
                              <Button onClick={handleSaveContact} disabled={isSavingContact} className="px-3 h-9 rounded-xl bg-purple-600 hover:bg-purple-700 text-white shadow-md shadow-purple-200 dark:shadow-none hover:scale-105 transition-all">
                                {isSavingContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                              </Button>
                            </div>
                          </div>
                          
                          {/* Daftar Kontak */}
                          <div className="space-y-3">
                            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider px-1">Daftar Tersimpan ({contacts.length})</p>
                            <div className="max-h-[260px] overflow-y-auto space-y-2 pr-1 custom-scrollbar">
                              {contacts.length === 0 ? (
                                <div className="flex flex-col items-center justify-center text-center py-10 bg-slate-50 dark:bg-slate-900/50 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                                  <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mb-2">
                                    <Users className="w-5 h-5 text-slate-400" />
                                  </div>
                                  <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Belum ada kontak</p>
                                  <p className="text-xs text-slate-400 mt-1 max-w-[200px]">Mulai simpan klien agar lebih mudah saat mengirim desain.</p>
                                </div>
                              ) : (
                                contacts.map(c => (
                                  <div key={c.id} className="flex items-center justify-between p-3 border border-slate-100 dark:border-slate-800 rounded-2xl hover:bg-white dark:hover:bg-slate-900 hover:shadow-md hover:border-purple-200 dark:hover:border-purple-800/50 hover:-translate-y-0.5 transition-all group bg-slate-50/50 dark:bg-slate-900/30 cursor-pointer" onClick={() => { setEmail(c.email); setIsContactDialogOpen(false); }}>
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-100 to-indigo-100 dark:from-purple-900/40 dark:to-indigo-900/40 text-purple-600 dark:text-purple-300 flex items-center justify-center font-bold text-sm shadow-sm border border-purple-200/50 dark:border-purple-800/50">
                                        {c.name.charAt(0).toUpperCase()}
                                      </div>
                                      <div>
                                        <p className="font-bold text-sm text-slate-800 dark:text-slate-200 group-hover:text-purple-700 dark:group-hover:text-purple-400 transition-colors">{c.name}</p>
                                        <p className="text-[11px] text-slate-500 mt-0.5 font-medium">{c.email}</p>
                                      </div>
                                    </div>
                                    <Button variant="ghost" size="icon" className="h-8 w-8 rounded-xl text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 opacity-0 group-hover:opacity-100 transition-all" onClick={(e) => { e.stopPropagation(); handleDeleteContact(c.id); }} title="Hapus Kontak">
                                      <Trash2 className="w-4 h-4" />
                                    </Button>
                                  </div>
                                ))
                              )}
                            </div>
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
                  <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Nama Pengirim</Label>
                  <Input
                    value={customSenderName}
                    onChange={e => setCustomSenderName(e.target.value)}
                    placeholder="Contoh: Tim Desain YadiApp"
                    className="h-11 rounded-xl bg-slate-50/50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 focus-visible:ring-purple-500"
                  />
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
                  <div className="flex items-center justify-between">
                    <Label className="text-xs font-bold text-slate-500 dark:text-slate-400 tracking-wider">Badan Email</Label>
                    <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
                      <DialogTrigger asChild>
                        <Button type="button" variant="outline" size="sm" className="h-7 text-[10px] rounded-lg px-2 flex items-center gap-1 border-purple-200 text-purple-600 hover:bg-purple-50 dark:border-purple-800 dark:text-purple-400 dark:hover:bg-purple-900/30">
                          <Eye className="w-3 h-3" /> Preview
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl w-[90vw] p-0 border-none bg-transparent shadow-2xl">
                        <div className="w-full bg-slate-100 rounded-3xl overflow-hidden" dangerouslySetInnerHTML={{ __html: getPreviewHtml() }} />
                      </DialogContent>
                    </Dialog>
                  </div>
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

          {/* KOLOM KANAN (Riwayat & Log) */}
          <div className="lg:col-span-8">
            <Card className="bg-white/60 dark:bg-slate-900/60 backdrop-blur-3xl border-indigo-100/60 dark:border-indigo-900/40 shadow-xl shadow-indigo-900/5 dark:shadow-indigo-900/20 rounded-3xl overflow-hidden h-full flex flex-col hover:shadow-2xl hover:shadow-indigo-900/10 transition-all duration-500 relative group">
              <CardHeader className="bg-gradient-to-br from-indigo-100/50 via-white/50 to-transparent dark:from-indigo-900/20 dark:via-slate-900/20 border-b border-indigo-100/50 dark:border-indigo-900/30 pb-5 px-6 relative z-10">
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
                               <div className="flex items-center gap-3 text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                                 <span className="flex items-center gap-1"><Users className="w-3 h-3" /> Oleh: <span className="font-bold text-slate-600 dark:text-slate-300">{(link as any).senderName || 'Sistem / Tidak Diketahui'}</span></span>
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
