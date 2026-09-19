"use client";

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc, updateDoc, increment, serverTimestamp } from 'firebase/firestore';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Download, FileWarning, Loader2, CalendarClock } from 'lucide-react';

function DownloadContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [linkData, setLinkData] = useState<any>(null);
  const [designData, setDesignData] = useState<any>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  useEffect(() => {
    async function fetchLink() {
      try {
        if (!id) return;
        
        const linkRef = doc(db, 'customer_links', id);
        const linkSnap = await getDoc(linkRef);
        
        if (!linkSnap.exists()) {
          setError('Tautan Tidak Ditemukan atau Sudah Dihapus');
          setLoading(false);
          return;
        }
        
        const data = linkSnap.data();
        
        const expiresAt = data.expiresAt?.seconds ? data.expiresAt.seconds * 1000 : 0;
        if (expiresAt < Date.now()) {
          setError('Tautan telah kedaluwarsa. File original telah dihapus demi keamanan.');
          setLoading(false);
          return;
        }
        
        setLinkData(data);

        if (data.designId) {
          try {
            const designRef = doc(db, 'register_design', data.designId);
            const designSnap = await getDoc(designRef);
            if (designSnap.exists()) {
              setDesignData(designSnap.data());
            }
          } catch (e) {
            console.error("Gagal mengambil data dari register_design:", e);
          }
        }
        
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    
    fetchLink();
  }, [id]);

  if (loading) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative"
        style={{ backgroundImage: "url('/bg-download.jpeg')" }}
      >
        <div className="relative z-10 flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
          <p className="font-medium animate-pulse text-lg tracking-wide">Memuat informasi file...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 relative"
        style={{ backgroundImage: "url('/bg-download.jpeg')" }}
      >
        <Card className="w-full max-w-md shadow-2xl border-red-100 relative z-10 bg-white">
          <CardHeader className="text-center pb-2">
            <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
              <FileWarning className="w-8 h-8 text-red-600" />
            </div>
            <CardTitle className="text-xl text-red-700">Akses Ditolak</CardTitle>
          </CardHeader>
          <CardContent className="text-center text-slate-600">
            <p>{error}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen bg-cover bg-center bg-no-repeat flex items-center justify-center p-4 font-sans relative"
      style={{ backgroundImage: "url('/bg-download.jpeg')" }}
    >
      <Card className="w-full max-w-md shadow-2xl border-none overflow-hidden relative z-10 bg-white">
        <div className="bg-blue-600 h-2 w-full relative z-20" />
        
        {/* Watermark Logo */}
        <div className="absolute inset-0 z-50 flex items-center justify-center pointer-events-none opacity-[0.08]">
          <img src="/logo_cgi_transparent.png" alt="CGI Logo" className="w-64 object-contain -mt-24" />
        </div>
        
        <CardHeader className="text-center pb-6 relative z-10">
          <CardTitle className="text-2xl font-bold text-slate-800 tracking-tight">Unduh Desain</CardTitle>
          <CardDescription className="text-slate-500">File original telah disiapkan untuk Anda</CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-6 relative z-10">
          <div className="bg-white p-5 rounded-xl border shadow-sm space-y-4">
            <div className="grid grid-cols-3 gap-2 text-sm">
              <div className="text-slate-500 font-medium">No. Desain</div>
              <div className="col-span-2 font-bold text-slate-800 text-right">{designData?.designNo || linkData?.designId || '-'}</div>
              
              <div className="text-slate-500 font-medium">Nama Item</div>
              <div className="col-span-2 font-bold text-slate-800 text-right">{designData?.itemName || '-'}</div>
              
              <div className="text-slate-500 font-medium">Nama File</div>
              <div className="col-span-2 font-bold text-slate-800 text-right truncate" title={linkData?.originalFileName}>{linkData?.originalFileName || '-'}</div>
              
              <div className="col-span-3 h-px bg-slate-100 my-2" />
              
              <div className="text-slate-500 font-medium flex items-center gap-1">
                <CalendarClock className="w-4 h-4" /> Expired
              </div>
              <div className="col-span-2 font-medium text-orange-600 text-right">
                {linkData?.expiresAt ? new Date(linkData.expiresAt.seconds * 1000).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' }) : '-'}
              </div>
            </div>
          </div>
          
          <Button 
            className="w-full py-6 text-lg font-bold shadow-blue-200 shadow-lg hover:shadow-xl transition-all"
            size="lg"
            disabled={isDownloading}
            onClick={async () => {
              if (!id || !linkData?.originalFileId) return;
              setIsDownloading(true);
              try {
                // Update download count in Firestore
                const linkRef = doc(db, 'customer_links', id);
                await updateDoc(linkRef, {
                  downloadCount: increment(1),
                  downloadedAt: serverTimestamp()
                });
                
                // Redirect to Google Drive download URL
                window.location.href = `https://drive.google.com/uc?export=download&id=${linkData.originalFileId}`;
              } catch (e) {
                console.error("Gagal memulai unduhan:", e);
                alert("Terjadi kesalahan saat memulai unduhan. Silakan coba lagi.");
                setIsDownloading(false);
              }
            }}
          >
            {isDownloading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Download className="w-5 h-5 mr-2" />}
            {isDownloading ? 'Memproses...' : 'Unduh File Original'}
          </Button>
          
          <p className="text-xs text-center text-slate-400 mt-4">
            Aksi unduhan ini akan dicatat secara otomatis.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

export default function CustomerDownloadPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="flex flex-col items-center gap-4 text-blue-600">
          <Loader2 className="w-10 h-10 animate-spin" />
        </div>
      </div>
    }>
      <DownloadContent />
    </Suspense>
  );
}
