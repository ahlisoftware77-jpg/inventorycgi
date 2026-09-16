'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/config';
import { FileShare } from './types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Folder, File, FileText, Image as ImageIcon, FileSpreadsheet, 
  ArrowLeft, Download, AlertCircle, RefreshCw, X, Upload, Loader2,
  Video, Trash2
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';
import { PdfThumbnail } from './pdf-thumbnail';

function formatBytes(bytes: number, decimals = 2) {
  if (!+bytes) return '0 Bytes';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

interface FileItem {
  name: string;
  isDirectory: boolean;
  size: number;
  mtime: number;
}

interface FileBrowserProps {
  share: FileShare;
  onClose: () => void;
}

export default function FileBrowser({ share, onClose }: FileBrowserProps) {
  const { user } = useAuth();
  const [currentPath, setCurrentPath] = useState('/');
  const [items, setItems] = useState<FileItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [previewFile, setPreviewFile] = useState<{name: string, url: string, ext: string} | null>(null);
  const [authToken, setAuthToken] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    if (auth.currentUser) {
      auth.currentUser.getIdToken().then(setAuthToken).catch(console.error);
    }
  }, [user]);

  const fetchFolder = async (path: string) => {
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      const headers: Record<string, string> = {};
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      const res = await fetch(`/api/file-explorer/list?shareId=${share.id}&path=${encodeURIComponent(path)}`, {
        headers
      });
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Failed to load folder');
      }
      
      setItems(data.items);
      setCurrentPath(data.currentPath || '/');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFolder('/');
  }, [share.id, user]);

  const handleNavigate = (folderName: string) => {
    const newPath = currentPath === '/' ? `/${folderName}` : `${currentPath}/${folderName}`;
    fetchFolder(newPath);
  };

  const handleBack = () => {
    if (currentPath === '/' || currentPath === '') return;
    const parts = currentPath.split('/').filter(Boolean);
    parts.pop();
    const newPath = parts.length === 0 ? '/' : `/${parts.join('/')}`;
    fetchFolder(newPath);
  };

  const handlePreview = async (fileName: string) => {
    try {
      const currentUser = auth.currentUser;
      let tokenParam = '';
      if (currentUser) {
        const token = await currentUser.getIdToken();
        tokenParam = `&token=${token}`;
      }
      
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
      const ext = fileName.split('.').pop()?.toLowerCase() || '';
      
      // Use window.location.origin to get the absolute URL for Office Viewer
      const baseUrl = window.location.origin;
      const url = `${baseUrl}/api/file-explorer/download?shareId=${share.id}&path=${encodeURIComponent(filePath)}${tokenParam}&preview=true`;
      
      setPreviewFile({ name: fileName, url, ext });
    } catch (err) {
      console.error('Preview error:', err);
      toast({ title: 'Gagal memuat preview', variant: 'destructive' });
    }
  };

  const handleDownload = async (fileName: string) => {
    try {
      const currentUser = auth.currentUser;
      let tokenParam = '';
      if (currentUser) {
        const token = await currentUser.getIdToken();
        tokenParam = `&token=${token}`;
      }
      
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
      const url = `/api/file-explorer/download?shareId=${share.id}&path=${encodeURIComponent(filePath)}${tokenParam}`;
      
      // Buka di tab baru / trigger download
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh file');
    }
  };

  const handleUploadClick = () => {
    const fileInput = document.getElementById('file-upload') as HTMLInputElement;
    if (fileInput) fileInput.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    
    const filesArray = Array.from(files);
    
    const duplicateFiles = filesArray.filter(f => items.some(item => item.name === f.name && !item.isDirectory));
    
    if (duplicateFiles.length > 0) {
      const fileNames = duplicateFiles.map(f => f.name).join(', ');
      const confirmMsg = duplicateFiles.length === 1 
        ? `File "${fileNames}" sudah ada di folder ini.\n\nKlik OK untuk MENIMPA (Overwrite) file tersebut, atau Batal untuk membatalkan unggahan.`
        : `Sebanyak ${duplicateFiles.length} file sudah ada di folder ini (contoh: ${duplicateFiles[0].name}).\n\nKlik OK untuk MENIMPA (Overwrite) file-file tersebut, atau Batal untuk membatalkan seluruh unggahan.`;
      
      const confirmOverwrite = window.confirm(confirmMsg);
      if (!confirmOverwrite) {
        e.target.value = '';
        return;
      }
    }
    
    setUploading(true);
    
    try {
      const currentUser = auth.currentUser;
      const headers: Record<string, string> = {};
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      // Upload sequentially
      for (const file of filesArray) {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('shareId', share.id);
        formData.append('path', currentPath);

        const res = await fetch('/api/file-explorer/upload', {
          method: 'POST',
          headers,
          body: formData,
        });

        const data = await res.json();
        
        if (!res.ok) {
          throw new Error(`Gagal mengunggah ${file.name}: ${data.error || 'Unknown error'}`);
        }
      }

      toast({ title: 'Berhasil', description: `${filesArray.length} file telah selesai diunggah.` });
      fetchFolder(currentPath); // Refresh the list
    } catch (err: any) {
      console.error('Upload error:', err);
      toast({ title: 'Upload Gagal', description: err.message, variant: 'destructive' });
    } finally {
      setUploading(false);
      // Reset input
      const fileInput = document.getElementById('file-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';
    }
  };

  const handleDelete = async (fileName: string) => {
    const confirmDelete = window.confirm(`Apakah Anda yakin ingin menghapus "${fileName}"? Tindakan ini tidak dapat dibatalkan.`);
    if (!confirmDelete) return;

    try {
      const currentUser = auth.currentUser;
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      
      if (currentUser) {
        const token = await currentUser.getIdToken();
        headers['Authorization'] = `Bearer ${token}`;
      }

      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;

      const res = await fetch('/api/file-explorer/delete', {
        method: 'POST',
        headers,
        body: JSON.stringify({ shareId: share.id, path: filePath }),
      });

      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Gagal menghapus file');
      }

      toast({ title: 'Berhasil', description: `"${fileName}" telah dihapus.` });
      fetchFolder(currentPath); // Refresh the list
    } catch (err: any) {
      console.error('Delete error:', err);
      toast({ title: 'Hapus Gagal', description: err.message, variant: 'destructive' });
    }
  };

  // Determine if the current user can delete
  // user might be from firebase auth directly or our user context which might have role/department
  // The backend will strictly enforce it anyway, but we should hide the button if they definitely can't.
  const isAdminOrIT = (user as any)?.role === 'Admin' || (user as any)?.department?.toUpperCase() === 'IT';
  const isDeleteAllowedForUser = share.deleteAllowedUsers?.includes(user?.uid || '');
  const canDelete = share.allowDelete && (isAdminOrIT || isDeleteAllowedForUser);


  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
    const tokenParam = authToken ? `&token=${authToken}` : '';
    const url = `/api/file-explorer/download?shareId=${share.id}&path=${encodeURIComponent(filePath)}${tokenParam}&preview=true`;

    switch (ext) {
      case 'pdf': {
        const b64path = btoa(unescape(encodeURIComponent(filePath)));
        const pdfUrl = `/api/file-explorer/download?shareId=${share.id}&b64path=${encodeURIComponent(b64path)}${tokenParam}&preview=true&ispdfjs=true`;
        return <PdfThumbnail url={pdfUrl} />;
      }
      case 'txt':
      case 'doc':
      case 'docx':
        return <FileText className="h-6 w-6 text-blue-500 shrink-0" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
      case 'webp':
        return (
          <div className="h-10 w-10 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700">
            <img src={url} alt={fileName} className="h-full w-full object-cover" loading="lazy" />
          </div>
        );
      case 'mp4':
      case 'webm':
      case 'ogg':
      case 'mov':
      case 'mkv':
      case 'avi':
        return (
          <div className="h-10 w-10 rounded-md overflow-hidden bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 relative">
            <video src={url} className="h-full w-full object-cover" preload="metadata" muted playsInline />
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
              <Video className="h-4 w-4 text-white" />
            </div>
          </div>
        );
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-6 w-6 text-green-500 shrink-0" />;
      default:
        return <File className="h-6 w-6 text-slate-500 shrink-0" />;
    }
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-xl border shadow-lg overflow-hidden flex flex-col h-[70vh]">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b bg-slate-50 dark:bg-slate-800/50">
        <div className="flex items-center gap-3 overflow-hidden">
          <Button 
            variant="outline" 
            size="icon" 
            onClick={handleBack} 
            disabled={currentPath === '/' || loading}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div className="flex flex-col overflow-hidden">
            <h3 className="font-semibold text-slate-900 dark:text-white truncate">{share.name}</h3>
            <div className="text-xs text-slate-500 truncate flex items-center gap-1">
              {share.path} <span className="font-bold text-slate-700 dark:text-slate-300">{(currentPath || '/').replace(/\//g, ' \\ ')}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {share.allowUpload !== false && (
            <>
              <input 
                type="file" 
                id="file-upload" 
                className="hidden" 
                multiple
                onChange={handleFileChange} 
              />
              <Button variant="outline" size="sm" onClick={handleUploadClick} disabled={uploading || loading} className="gap-2 hidden sm:flex border-teal-200 text-teal-700 hover:bg-teal-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                Upload File
              </Button>
              <Button variant="outline" size="icon" onClick={handleUploadClick} disabled={uploading || loading} className="sm:hidden border-teal-200 text-teal-700 hover:bg-teal-50">
                {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
              </Button>
            </>
          )}
          <Button variant="ghost" size="icon" onClick={() => fetchFolder(currentPath)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading && !uploading ? 'animate-spin' : ''}`} />
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose}>
            <X className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-0">
        {error ? (
          <div className="p-8 flex flex-col items-center justify-center text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mb-4" />
            <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-2">Gagal Memuat Folder</h3>
            <p className="text-slate-500 mb-4">{error}</p>
            <Button onClick={() => fetchFolder(currentPath)}>Coba Lagi</Button>
          </div>
        ) : (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-slate-500 uppercase bg-slate-50 dark:bg-slate-800/50 sticky top-0 z-10 shadow-sm">
              <tr>
                <th className="px-6 py-3 font-medium">Nama</th>
                <th className="px-6 py-3 font-medium w-32 hidden md:table-cell">Ukuran</th>
                <th className="px-6 py-3 font-medium w-48 hidden sm:table-cell">Diubah</th>
                <th className="px-6 py-3 font-medium w-24 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {loading && items.length === 0 ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    <td className="px-6 py-4"><Skeleton className="h-5 w-48" /></td>
                    <td className="px-6 py-4 hidden md:table-cell"><Skeleton className="h-5 w-16" /></td>
                    <td className="px-6 py-4 hidden sm:table-cell"><Skeleton className="h-5 w-24" /></td>
                    <td className="px-6 py-4"><Skeleton className="h-8 w-8 ml-auto" /></td>
                  </tr>
                ))
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-12 text-center text-slate-500">
                    Folder ini kosong.
                  </td>
                </tr>
              ) : (
                items.map((item, idx) => (
                  <tr 
                    key={idx} 
                    className="hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors group cursor-pointer"
                    onClick={() => item.isDirectory ? handleNavigate(item.name) : handlePreview(item.name)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {item.isDirectory ? (
                          <Folder className="h-6 w-6 text-amber-500 fill-amber-500/20 shrink-0" />
                        ) : (
                          getFileIcon(item.name)
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-200 line-clamp-2">
                          {item.name}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-3 text-slate-500 hidden md:table-cell">
                      {item.isDirectory ? '--' : formatBytes(item.size)}
                    </td>
                    <td className="px-6 py-3 text-slate-500 hidden sm:table-cell">
                      {item.mtime ? format(new Date(item.mtime), 'dd MMM yyyy, HH:mm', { locale: localeID }) : '--'}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {item.isDirectory ? (
                        <div className="flex justify-end gap-2">
                          {canDelete && (
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(item.name); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleNavigate(item.name); }}>
                            Buka
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          {canDelete && (
                            <Button variant="outline" size="icon" className="h-8 w-8 text-red-500 border-red-200 hover:bg-red-50" onClick={(e) => { e.stopPropagation(); handleDelete(item.name); }}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handleDownload(item.name); }}>
                            <Download className="h-4 w-4" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>

      <Dialog open={!!previewFile} onOpenChange={(open) => !open && setPreviewFile(null)}>
        <DialogContent className="sm:max-w-4xl p-0 overflow-hidden flex flex-col h-[90vh]">
          <DialogHeader className="p-4 border-b bg-white dark:bg-slate-900 shrink-0 flex flex-row items-center justify-between">
            <DialogTitle className="truncate pr-4">{previewFile?.name}</DialogTitle>
            <div className="flex gap-2 mr-8">
              <Button size="sm" onClick={() => previewFile && handleDownload(previewFile.name)}>
                <Download className="h-4 w-4 mr-2" />
                Unduh
              </Button>
            </div>
          </DialogHeader>
          <div className="flex-1 min-h-0 overflow-hidden bg-slate-100 dark:bg-slate-950 flex flex-col">
            {previewFile && (
              ['pdf'].includes(previewFile.ext) ? (
                <iframe src={previewFile.url} className="w-full h-full border-0" />
              ) : ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(previewFile.ext) ? (
                <div className="flex-1 min-h-0 flex items-center justify-center p-4">
                  <img src={previewFile.url} alt={previewFile.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : ['mp4', 'webm', 'ogg', 'mov', 'mkv', 'avi'].includes(previewFile.ext) ? (
                <div className="flex-1 min-h-0 flex items-center justify-center p-4 bg-black">
                  <video src={previewFile.url} controls className="max-w-full max-h-full object-contain" />
                </div>
              ) : ['doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx'].includes(previewFile.ext) ? (
                <iframe src={`https://view.officeapps.live.com/op/embed.aspx?src=${encodeURIComponent(previewFile.url)}`} className="w-full h-full border-0" />
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center">
                  <File className="h-16 w-16 text-slate-400 mb-4" />
                  <h3 className="font-medium text-lg mb-2">Preview tidak tersedia</h3>
                  <p className="text-sm text-slate-500 mb-6">File dengan format .{previewFile.ext.toUpperCase()} tidak dapat dipreview langsung.</p>
                  <Button onClick={() => handleDownload(previewFile.name)}>Unduh File Sekarang</Button>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
