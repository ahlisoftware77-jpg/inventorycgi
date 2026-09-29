'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { addDoc, collection, serverTimestamp, doc, getDoc, query, where, orderBy, onSnapshot, deleteDoc, updateDoc } from 'firebase/firestore';
import DashboardLayout from '@/components/dashboard/layout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Upload, X, File, Plus, ArrowLeft, Send, Link as LinkIcon, Loader2, CheckCircle2, Copy, Trash2, Clock, Check, ExternalLink } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { formatBytes } from '@/lib/utils'; // Assuming this exists or I will write a simple formatter

// Utility to format bytes
const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function CustomerSendPreviewPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { user } = useAuth();

  const getApiUrl = (path: string) => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `https://inventorycgi.vercel.app${path}`;
    }
    return path;
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  
  interface FileItem {
    file: File;
    path: string;
  }

  const [files, setFiles] = useState<FileItem[]>([]);
  const [recipientEmail, setRecipientEmail] = useState('');
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [expiresInDays, setExpiresInDays] = useState('7');
  
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [currentFileName, setCurrentFileName] = useState('');
  const [shareLink, setShareLink] = useState('');
  const [history, setHistory] = useState<any[]>([]);

  useEffect(() => {
    if (!user) return;
    const q = query(
      collection(db, "customer_transfers"),
      where("senderId", "==", user.uid)
    );
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const docs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      docs.sort((a: any, b: any) => (b.createdAt?.toMillis() || 0) - (a.createdAt?.toMillis() || 0));
      setHistory(docs);
    });
    return () => unsubscribe();
  }, [user]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (e.dataTransfer.items) {
      const newFiles: File[] = [];
      const traverseFileTree = async (item: any, path = '') => {
        if (item.isFile) {
          return new Promise<void>((resolve) => {
            item.file((file: File) => {
              newFiles.push({ file, path: path + file.name });
              resolve();
            });
          });
        } else if (item.isDirectory) {
          const dirReader = item.createReader();
          const entries: any[] = await new Promise((resolve) => {
            dirReader.readEntries((results: any) => resolve(results));
          });
          for (let i = 0; i < entries.length; i++) {
            await traverseFileTree(entries[i], path + item.name + '/');
          }
        }
      };
      
      const promises = [];
      for (let i = 0; i < e.dataTransfer.items.length; i++) {
        const item = e.dataTransfer.items[i].webkitGetAsEntry();
        if (item) {
          promises.push(traverseFileTree(item));
        }
      }
      
      await Promise.all(promises);
      if (newFiles.length > 0) {
         setFiles(prev => [...prev, ...newFiles]);
      }
    } else if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setFiles(prev => [...prev, ...Array.from(e.dataTransfer.files).map(f => ({ file: f, path: f.webkitRelativePath || f.name }))]);
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const newFiles = Array.from(e.target.files).map(f => ({ file: f, path: f.webkitRelativePath || f.name }));
      setFiles(prev => [...prev, ...newFiles]);
    }
    // Reset input so same file/folder can be selected again
    e.target.value = '';
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleDeleteTransfer = async (id: string, folderId: string) => {
    if (!confirm('Apakah Anda yakin ingin menghapus kiriman ini? File di Google Drive juga akan dihapus permanen.')) {
      return;
    }

    try {
      if (folderId) {
        // Hapus folder di Google Drive
        await fetch(getApiUrl('/api/upload-drive'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'delete', fileId: folderId })
        });
      }

      // Hapus dokumen di Firestore
      await deleteDoc(doc(db, 'customer_transfers', id));

      toast({ title: 'Berhasil', description: 'Riwayat dan file kiriman telah dihapus.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menghapus', description: error.message });
    }
  };

  const [isApprovingId, setIsApprovingId] = useState<string | null>(null);

  const handleApproveDraft = async (transfer: any) => {
    if (!confirm('Kirim file ini sekarang ke pelanggan? Email akan dikirimkan otomatis.')) return;
    
    setIsApprovingId(transfer.id);
    try {
      const publicLink = `${window.location.origin}/public/transfer?id=${transfer.id}`;
      const totalSizeObj = transfer.files?.reduce((acc: number, item: any) => acc + (item.size || 0), 0) || 0;

      const htmlBody = `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2563eb;">File Masuk: ${transfer.subject}</h2>
          <p>Halo,</p>
          <p>Anda menerima file dari <b>${user?.displayName || 'Tim CGI'}</b> melalui CGI File Transfer.</p>
          ${transfer.message ? `<p style="padding: 15px; background: #f8fafc; border-left: 4px solid #94a3b8; font-style: italic;">"${transfer.message}"</p>` : ''}
          <p><strong>Total File:</strong> ${transfer.files?.length || 0} item (${formatFileSize(totalSizeObj)})</p>
          <p style="margin-top: 25px;">Silakan unduh file Anda melalui tautan di bawah ini:</p>
          <a href="${publicLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Lihat & Unduh File</a>
          <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0 20px 0;" />
          <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis oleh Sistem Transfer File CGI.</p>
        </div>
      `;

      const emailRes = await fetch(getApiUrl('/api/send-email'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          to: [transfer.recipientEmail],
          subject: `Ada file untuk Anda: ${transfer.subject}`,
          html: htmlBody
        })
      });

      if (!emailRes.ok) {
        throw new Error('Gagal mengirim notifikasi email');
      }

      await updateDoc(doc(db, 'customer_transfers', transfer.id), {
        status: 'active'
      });

      toast({ title: 'Berhasil Dikirim', description: 'Draft telah disetujui dan email telah dikirim.' });
    } catch (error: any) {
      toast({ variant: 'destructive', title: 'Gagal Menyetujui', description: error.message });
    } finally {
      setIsApprovingId(null);
    }
  };

  const totalSize = files.reduce((acc, item) => acc + item.file.size, 0);

  const handleTransfer = async (isDraft: boolean = false) => {
    if (files.length === 0) {
      toast({ variant: 'destructive', title: 'Pilih file terlebih dahulu' });
      return;
    }
    if (!recipientEmail || !subject) {
      toast({ variant: 'destructive', title: 'Email Penerima dan Judul wajib diisi' });
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    try {
      // 1. Dapatkan setting Folder Induk untuk WeTransfer (Gunakan general setting)
      const settingsDoc = await getDoc(doc(db, "settings", "general"));
      const settingsData = settingsDoc.data();
      const parentFolderId = settingsData?.googleDriveCustomerPreviewFolderId; // Menggunakan folder baru khusus COSTUMER PREVIEW
      
      if (!parentFolderId) throw new Error("Folder Google Drive tujuan belum dikonfigurasi di Pengaturan.");

      // 2. Buat sub-folder baru di Google Drive untuk transaksi ini
      const folderName = `Transfer: ${subject} - ${new Date().getTime()}`;
      const createFolderRes = await fetch(getApiUrl('/api/upload-drive'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'createFolder', folderName, parentFolderId })
      });
      const folderData = await createFolderRes.json();
      if (!createFolderRes.ok) throw new Error(folderData.error || "Gagal membuat folder tujuan");
      
      const targetFolderId = folderData.folderId;

      // 3. Upload file satu-satu (Resumable Upload)
      const uploadedFilesMetadata = [];
      let currentProgress = 5; // 5% for folder creation
      setUploadProgress(currentProgress);

      const folderMap = new Map<string, string>();
      folderMap.set('', targetFolderId);

      for (let i = 0; i < files.length; i++) {
        const { file, path: filePath } = files[i];
        
        // Handle folder hierarchy
        const pathParts = filePath.split('/');
        const actualFileName = pathParts.pop() || file.name;
        
        let currentParent = targetFolderId;
        let currentPath = '';
        
        for (const part of pathParts) {
          currentPath += (currentPath ? '/' : '') + part;
          if (!folderMap.has(currentPath)) {
            setCurrentFileName(`Membuat folder: ${part}...`);
            const res = await fetch(getApiUrl('/api/upload-drive'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'createFolder', folderName: part, parentFolderId: currentParent })
            });
            const data = await res.json();
            
            // Set folder permission to public reader so contents inside can be accessed if needed
            await fetch(getApiUrl('/api/upload-drive'), {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ action: 'finish', fileId: data.folderId })
            });
            
            folderMap.set(currentPath, data.folderId);
          }
          currentParent = folderMap.get(currentPath)!;
        }
        
        // Init Upload
        const initRes = await fetch(getApiUrl('/api/upload-drive'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            action: 'init', 
            fileName: actualFileName, 
            mimeType: file.type || 'application/octet-stream', 
            targetFolderId: currentParent 
          })
        });
        const initData = await initRes.json();
        if (!initRes.ok) throw new Error(`Gagal inisiasi upload untuk file ${actualFileName}`);

        // Upload chunk with XHR for progress tracking
        setCurrentFileName(file.name);
        
        const uploadResult: any = await new Promise((resolve, reject) => {
          const xhr = new XMLHttpRequest();
          xhr.open('PUT', initData.uploadUrl);
          xhr.setRequestHeader('Content-Length', file.size.toString());
          
          xhr.upload.onprogress = (event) => {
            if (event.lengthComputable) {
              const fileProgress = (event.loaded / event.total) * (90 / files.length);
              setUploadProgress(Math.round(currentProgress + fileProgress));
            }
          };

          xhr.onload = () => {
            if (xhr.status >= 200 && xhr.status < 300) {
              resolve(JSON.parse(xhr.responseText));
            } else {
              reject(new Error(`HTTP Error ${xhr.status} during upload`));
            }
          };

          xhr.onerror = () => reject(new Error('Network error during upload'));
          xhr.send(file);
        });

        // Finish upload to set permissions
        const finishRes = await fetch(getApiUrl('/api/upload-drive'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'finish', fileId: uploadResult.id })
        });
        const finishData = await finishRes.json();

        uploadedFilesMetadata.push({
          id: uploadResult.id,
          name: actualFileName, // Base file name
          path: filePath, // Full relative path
          size: file.size,
          mimeType: file.type,
          thumbnailLink: finishData.thumbnailLink || null
        });

        currentProgress += (90 / files.length); // Up to 95%
        setUploadProgress(Math.round(currentProgress));
      }

      // 4. Simpan log transaksi di Firestore
      const transferDocData: any = {
        subject,
        message,
        recipientEmail,
        files: uploadedFilesMetadata,
        folderId: targetFolderId,
        senderId: user?.uid || 'guest',
        senderName: user?.displayName || user?.email || 'Admin',
        createdAt: serverTimestamp(),
        status: isDraft ? 'draft' : 'active'
      };

      if (expiresInDays !== 'never') {
        const expiresAt = new Date();
        expiresAt.setDate(expiresAt.getDate() + parseInt(expiresInDays));
        transferDocData.expiresAt = expiresAt;
      }

      const transferDoc = await addDoc(collection(db, 'customer_transfers'), transferDocData);

      // 5. Generate Link Share
      const publicLink = `${window.location.origin}/public/transfer?id=${transferDoc.id}`;
      setShareLink(publicLink);
      setUploadProgress(98);

      // 6. Kirim Email Notifikasi ke Customer
      if (!isDraft) {
        const htmlBody = `
          <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
            <h2 style="color: #2563eb;">File Masuk: ${subject}</h2>
            <p>Halo,</p>
            <p>Anda menerima file dari <b>${user?.displayName || 'Tim CGI'}</b> melalui CGI File Transfer.</p>
            ${message ? `<p style="padding: 15px; background: #f8fafc; border-left: 4px solid #94a3b8; font-style: italic;">"${message}"</p>` : ''}
            <p><strong>Total File:</strong> ${files.length} item (${formatFileSize(totalSize)})</p>
            <p style="margin-top: 25px;">Silakan unduh file Anda melalui tautan di bawah ini:</p>
            <a href="${publicLink}" style="display: inline-block; padding: 12px 24px; background-color: #2563eb; color: #ffffff; text-decoration: none; border-radius: 5px; font-weight: bold;">Lihat & Unduh File</a>
            <hr style="border: none; border-top: 1px solid #eaeaea; margin: 30px 0 20px 0;" />
            <p style="font-size: 12px; color: #777;">Email ini dikirim secara otomatis oleh Sistem Transfer File CGI.</p>
          </div>
        `;

        const emailRes = await fetch(getApiUrl('/api/send-email'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: [recipientEmail],
            subject: `Ada file untuk Anda: ${subject}`,
            html: htmlBody
          })
        });

        if (!emailRes.ok) {
          const err = await emailRes.json().catch(() => ({}));
          console.warn("Gagal mengirim email pemberitahuan:", err);
          toast({ variant: 'destructive', title: 'Transfer Sukses, tapi Email Gagal', description: err.error || err.details || 'Gagal mengirim notifikasi email.' });
        } else {
          toast({ title: 'Transfer Selesai', description: `Berhasil mengirim ${files.length} file ke ${recipientEmail}.` });
        }
      } else {
        toast({ title: 'Draft Disimpan', description: `Berhasil menyimpan draft dengan ${files.length} file untuk ${recipientEmail}.` });
      }

      setUploadProgress(100);
      resetForm();

    } catch (error: any) {
      console.error(error);
      toast({ variant: 'destructive', title: 'Upload Gagal', description: error.message });
      setIsUploading(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareLink);
    toast({ title: 'Disalin', description: 'Link transfer berhasil disalin.' });
  };

  const resetForm = () => {
    setFiles([]);
    setRecipientEmail('');
    setSubject('');
    setMessage('');
    setIsUploading(false);
    setUploadProgress(0);
    setShareLink('');
  };

  return (
    <DashboardLayout>
      <div className="flex-1 space-y-6 md:p-8 p-4 bg-slate-50 dark:bg-slate-900 min-h-[calc(100vh-4rem)]">
        <div className="flex items-center mb-6">
          <Button variant="ghost" className="mr-4 rounded-full" onClick={() => router.back()}>
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 dark:text-white">Transfer File</h1>
            <p className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Kirim file langsung ke kustomer (Maksimal per file ditentukan dari memori client)</p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6">
          
          {/* UPLOAD FORM AREA */}
          <div className="w-full md:w-[450px] shrink-0">
            <Card 
              className="rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),_inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-2px_4px_rgba(0,0,0,0.05)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),_inset_0_2px_4px_rgba(255,255,255,0.1),_inset_0_-2px_4px_rgba(0,0,0,0.3)] overflow-hidden bg-white/90 backdrop-blur-xl dark:bg-slate-950/90 text-slate-900 isolate transform transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2),_inset_0_2px_4px_rgba(255,255,255,1),_inset_0_-2px_4px_rgba(0,0,0,0.05)]"
              style={{ maskImage: 'radial-gradient(white, black)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
              
              {!isUploading && (
                <div className="p-6 md:p-8 space-y-6 rounded-b-[2.5rem]">
                  <div 
                    className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-8 flex flex-col items-center justify-center text-center hover:bg-slate-50 hover:border-primary/50 transition-all min-h-[200px]"
                    onDragOver={handleDragOver}
                    onDrop={handleDrop}
                  >
                    <div className="bg-primary/10 w-16 h-16 rounded-full flex items-center justify-center mb-4">
                      <Plus className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="font-bold text-lg mb-2">Tambah File / Folder</h3>
                    <div className="flex gap-2">
                      <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" className="font-bold text-slate-700">Pilih File</Button>
                      <Button onClick={() => folderInputRef.current?.click()} size="sm" variant="outline" className="font-bold text-slate-700">Pilih Folder</Button>
                    </div>
                    <p className="text-xs text-muted-foreground mt-4">Atau tarik dan lepas file/folder di sini</p>
                    <input 
                      type="file" 
                      multiple 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileChange}
                    />
                    <input 
                      type="file" 
                      multiple 
                      // @ts-ignore
                      webkitdirectory=""
                      directory=""
                      className="hidden" 
                      ref={folderInputRef} 
                      onChange={handleFileChange}
                    />
                  </div>

                  {files.length > 0 && (
                    <div className="bg-slate-50 dark:bg-slate-900 rounded-2xl p-4 max-h-[200px] overflow-y-auto space-y-2">
                      <div className="flex justify-between items-center mb-2 px-1">
                        <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{files.length} File Ditambahkan</span>
                        <span className="text-xs font-bold text-primary">{formatFileSize(totalSize)}</span>
                      </div>
                      {files.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-white dark:bg-slate-950 p-2 rounded-xl border border-slate-100 dark:border-slate-800">
                          <div className="flex items-center gap-3 overflow-hidden">
                            <File className="h-4 w-4 text-slate-400 shrink-0" />
                            <span className="text-sm font-medium truncate" title={f.path}>{f.path}</span>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full text-slate-400 hover:text-rose-500" onClick={() => removeFile(i)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Email Penerima</Label>
                      <Input 
                        placeholder="customer@email.com" 
                        type="email"
                        value={recipientEmail}
                        onChange={e => setRecipientEmail(e.target.value)}
                        className="rounded-xl h-12 bg-slate-50 border-none font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Judul Transfer</Label>
                      <Input 
                        placeholder="Misal: File Design Agustus" 
                        value={subject}
                        onChange={e => setSubject(e.target.value)}
                        className="rounded-xl h-12 bg-slate-50 border-none font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Pesan (Opsional)</Label>
                      <Textarea 
                        placeholder="Tulis pesan untuk penerima..." 
                        value={message}
                        onChange={e => setMessage(e.target.value)}
                        className="rounded-xl min-h-[100px] bg-slate-50 border-none resize-none font-medium"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest ml-1">Masa Berlaku Link</Label>
                      <select 
                        value={expiresInDays}
                        onChange={e => setExpiresInDays(e.target.value)}
                        className="w-full rounded-xl h-12 px-3 bg-slate-50 border-none font-medium text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="1">1 Hari</option>
                        <option value="3">3 Hari</option>
                        <option value="7">7 Hari</option>
                        <option value="14">14 Hari</option>
                        <option value="30">30 Hari</option>
                        <option value="never">Tanpa Batas Waktu</option>
                      </select>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 mt-4">
                    <Button 
                      className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-xl shadow-blue-600/20"
                      onClick={() => handleTransfer(false)}
                    >
                      Kirim Langsung
                    </Button>
                    <Button 
                      variant="outline"
                      className="w-full h-14 rounded-2xl border-2 border-blue-600 text-blue-600 font-black uppercase tracking-widest text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20"
                      onClick={() => handleTransfer(true)}
                    >
                      Simpan Draft (Review)
                    </Button>
                  </div>
                </div>
              )}

              {isUploading && (
                <div className="p-8 h-[600px] flex flex-col items-center justify-center text-center">
                  <div className="w-24 h-24 relative mb-6">
                    <svg className="w-full h-full transform -rotate-90">
                      <circle cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" className="text-slate-100 dark:text-slate-800" />
                      <circle 
                        cx="48" cy="48" r="45" stroke="currentColor" strokeWidth="6" fill="transparent" 
                        strokeDasharray={2 * Math.PI * 45} 
                        strokeDashoffset={2 * Math.PI * 45 * (1 - uploadProgress / 100)} 
                        className="text-blue-500 transition-all duration-200 ease-out" 
                      />
                    </svg>
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-2xl font-black text-slate-900 dark:text-white">{uploadProgress}%</span>
                    </div>
                  </div>
                  <h2 className="text-2xl font-black tracking-tight mb-2">Mengirim File...</h2>
                  <p className="text-muted-foreground font-medium mb-1">Jangan tutup jendela ini. {files.length} file sedang diunggah.</p>
                  {currentFileName && (
                    <div className="bg-slate-100 dark:bg-slate-900 rounded-full px-4 py-2 mt-4 max-w-full overflow-hidden">
                      <p className="text-xs font-bold text-slate-600 dark:text-slate-300 truncate">Mengunggah: {currentFileName}</p>
                    </div>
                  )}
                </div>
              )}

            </Card>
          </div>

          {/* BEAUTIFUL BACKGROUND & HISTORY AREA */}
          <div className="hidden md:flex flex-1 flex-col gap-6">
            <div className="rounded-[2.5rem] bg-gradient-to-br from-blue-600 to-indigo-800 p-8 text-white flex-col justify-between overflow-hidden relative shadow-2xl min-h-[250px] shrink-0">
              <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] mix-blend-overlay"></div>
              
              <div className="relative z-10">
                <h2 className="text-4xl font-black tracking-tighter leading-none mb-4">CGI<br/>Transfer.</h2>
                <p className="text-sm font-medium text-blue-100 max-w-sm mb-6">Cara termudah dan teraman untuk mengirim file desain dan dokumen resolusi tinggi ke pelanggan Anda.</p>
              </div>
              
              <div className="relative z-10 flex gap-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                    <Send className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Kecepatan Penuh</h4>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 backdrop-blur flex items-center justify-center">
                    <Loader2 className="w-5 h-5 text-blue-200" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Tanpa Batas</h4>
                  </div>
                </div>
              </div>
            </div>

            {/* Draft Kiriman */}
            {history.filter(h => h.status === 'draft').length > 0 && (
              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col min-h-0">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" /> Draft (Menunggu Review)
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-thin">
                  {history.filter(h => h.status === 'draft').map((h) => (
                    <div key={h.id} className="p-4 rounded-2xl bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 flex flex-col gap-2 relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm text-slate-800 dark:text-slate-200">{h.subject}</p>
                          <p className="text-xs text-slate-500">{h.recipientEmail}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-amber-100 text-amber-700 rounded-md">
                          {h.files?.length || 0} File
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          readOnly 
                          value={`${window.location.origin}/public/transfer?id=${h.id}`} 
                          className="h-8 text-xs bg-white dark:bg-slate-950" 
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/public/transfer?id=${h.id}`);
                          toast({ title: 'Disalin', description: 'Link draft transfer disalin.' });
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 shrink-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" 
                          onClick={() => window.open(`${window.location.origin}/public/transfer?id=${h.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                          onClick={() => handleDeleteTransfer(h.id, h.folderId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          className="h-8 px-3 bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs"
                          onClick={() => handleApproveDraft(h)}
                          disabled={isApprovingId === h.id}
                        >
                          {isApprovingId === h.id ? <Loader2 className="w-3 h-3 animate-spin mr-1" /> : <Send className="w-3 h-3 mr-1" />}
                          Kirim
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Riwayat Kirim (Active) */}
            {history.filter(h => h.status !== 'draft').length > 0 && (
              <div className="bg-white dark:bg-slate-950 p-6 rounded-[2.5rem] shadow-xl border border-slate-100 dark:border-slate-800 flex-1 flex flex-col min-h-0">
                <h3 className="font-bold text-lg mb-4 text-slate-800 dark:text-white flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" /> Riwayat Kiriman Anda
                </h3>
                <div className="space-y-3 overflow-y-auto pr-2 flex-1 scrollbar-thin">
                  {history.filter(h => h.status !== 'draft').map((h) => (
                    <div key={h.id} className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 flex flex-col gap-2 relative group">
                      <div className="flex items-start justify-between">
                        <div>
                          <p className="font-bold text-sm">{h.subject}</p>
                          <p className="text-xs text-muted-foreground">{h.recipientEmail}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-1 bg-blue-100 text-blue-700 rounded-md">
                          {h.files?.length || 0} File
                        </span>
                      </div>
                      <div className="flex items-center gap-2 mt-2">
                        <Input 
                          readOnly 
                          value={`${window.location.origin}/public/transfer?id=${h.id}`} 
                          className="h-8 text-xs bg-white dark:bg-slate-950" 
                        />
                        <Button size="icon" variant="outline" className="h-8 w-8 shrink-0" onClick={() => {
                          navigator.clipboard.writeText(`${window.location.origin}/public/transfer?id=${h.id}`);
                          toast({ title: 'Disalin', description: 'Link transfer disalin.' });
                        }}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="outline" 
                          className="h-8 w-8 shrink-0 text-blue-500 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-500/10" 
                          onClick={() => window.open(`${window.location.origin}/public/transfer?id=${h.id}`, '_blank')}
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Button>
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="h-8 w-8 shrink-0 text-rose-500 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-500/10" 
                          onClick={() => handleDeleteTransfer(h.id, h.folderId)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </DashboardLayout>
  );
}
