'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { auth } from '@/lib/firebase/config';
import { FileShare } from './types';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Folder, File, FileText, Image as ImageIcon, FileSpreadsheet, 
  ArrowLeft, Download, AlertCircle, RefreshCw, X
} from 'lucide-react';
import { format } from 'date-fns';
import { id as localeID } from 'date-fns/locale';

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
  const [error, setError] = useState<string | null>(null);

  const fetchFolder = async (path: string) => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      const token = await currentUser.getIdToken();
      const res = await fetch(`/api/file-explorer/list?shareId=${share.id}&path=${encodeURIComponent(path)}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
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

  const handleDownload = async (fileName: string) => {
    if (!user) return;
    try {
      const currentUser = auth.currentUser;
      if (!currentUser) throw new Error('User not authenticated');
      const token = await currentUser.getIdToken();
      const filePath = currentPath === '/' ? `/${fileName}` : `${currentPath}/${fileName}`;
      const url = `/api/file-explorer/download?shareId=${share.id}&path=${encodeURIComponent(filePath)}&token=${token}`;
      
      // Buka di tab baru / trigger download
      window.open(url, '_blank');
    } catch (err) {
      console.error('Download error:', err);
      alert('Gagal mengunduh file');
    }
  };

  const getFileIcon = (fileName: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'pdf':
      case 'txt':
      case 'doc':
      case 'docx':
        return <FileText className="h-5 w-5 text-blue-500" />;
      case 'png':
      case 'jpg':
      case 'jpeg':
      case 'gif':
        return <ImageIcon className="h-5 w-5 text-purple-500" />;
      case 'xls':
      case 'xlsx':
      case 'csv':
        return <FileSpreadsheet className="h-5 w-5 text-green-500" />;
      default:
        return <File className="h-5 w-5 text-slate-500" />;
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
          <Button variant="ghost" size="icon" onClick={() => fetchFolder(currentPath)} disabled={loading}>
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
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
                    onClick={() => item.isDirectory ? handleNavigate(item.name) : handleDownload(item.name)}
                  >
                    <td className="px-6 py-3">
                      <div className="flex items-center gap-3">
                        {item.isDirectory ? (
                          <Folder className="h-5 w-5 text-amber-500 fill-amber-500/20" />
                        ) : (
                          getFileIcon(item.name)
                        )}
                        <span className="font-medium text-slate-900 dark:text-slate-200">
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
                        <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); handleNavigate(item.name); }}>
                          Buka
                        </Button>
                      ) : (
                        <Button variant="outline" size="icon" className="h-8 w-8 text-blue-600 border-blue-200 hover:bg-blue-50" onClick={(e) => { e.stopPropagation(); handleDownload(item.name); }}>
                          <Download className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
