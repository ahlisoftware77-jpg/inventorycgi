'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { db } from '@/lib/firebase/config';
import { doc, getDoc } from 'firebase/firestore';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, File, Loader2, AlertTriangle, Eye, Folder, ChevronDown, LayoutGrid, List } from 'lucide-react';
import { formatBytes } from '@/lib/utils'; // Optional formatting
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import ElectricLogo from '@/components/ui/ElectricLogo';
import GlowCursor from '@/components/ui/GlowCursor';

const formatFileSize = (bytes: number) => {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

export default function TransferDownloadPage() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');

  const [transfer, setTransfer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [previewImage, setPreviewImage] = useState<any>(null);
  const [showFilesList, setShowFilesList] = useState(false);
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('grid');
  const [collapsedFolders, setCollapsedFolders] = useState<Record<string, boolean>>({});
  const [isZippingFolder, setIsZippingFolder] = useState<string | null>(null);

  const toggleFolder = (folderName: string) => {
    setCollapsedFolders(prev => ({
      ...prev,
      [folderName]: !prev[folderName]
    }));
  };

  // Group files by folder
  const groupedFiles = React.useMemo(() => {
    if (!transfer?.files) return {};
    const groups: Record<string, any[]> = {};
    transfer.files.forEach((file: any) => {
      const fullPath = file.path || file.name;
      const parts = fullPath.split('/');
      let folderName = '';
      if (parts.length > 1) {
        parts.pop();
        folderName = parts.join('/');
      }
      if (!groups[folderName]) groups[folderName] = [];
      groups[folderName].push(file);
    });
    return groups;
  }, [transfer]);

  useEffect(() => {
    if (!id) {
      setError("Link tidak valid (ID tidak ditemukan).");
      setLoading(false);
      return;
    }

    const fetchTransfer = async () => {
      try {
        const docRef = doc(db, 'customer_transfers', id);
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data.expiresAt && data.expiresAt.toDate() < new Date()) {
            setError("Masa berlaku link ini sudah habis (kedaluwarsa). Silakan minta pengirim untuk membagikan ulang.");
          } else {
            setTransfer({ id: docSnap.id, ...data });
          }
        } else {
          setError("File transfer tidak ditemukan atau sudah dihapus.");
        }
      } catch (err: any) {
        setError("Gagal memuat data transfer: " + err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchTransfer();
  }, [id]);

  const handleDownload = (file: any) => {
    window.open(`https://drive.google.com/uc?export=download&id=${file.id}`, '_blank');
  };

  const handleDownloadFolder = async (e: React.MouseEvent | null, folderName: string, filesInFolder: any[], skipConfirm: boolean = false) => {
    if (e) e.stopPropagation();
    if (!skipConfirm && !confirm(`Unduh seluruh folder "${folderName}" sebagai file ZIP? (Proses ini membutuhkan waktu tergantung ukuran file)`)) return;

    try {
      setIsZippingFolder(folderName);
      const JSZip = (await import('jszip')).default;
      const fileSaver = await import('file-saver');
      const saveAs = fileSaver.saveAs || fileSaver.default;

      const zip = new JSZip();

      for (const file of filesInFolder) {
        const response = await fetch(`/api/proxy-download?id=${file.id}`);
        if (!response.ok) throw new Error(`Gagal memuat ${file.name}`);
        const blob = await response.blob();
        
        const displayFileName = (file.path || file.name).split('/').pop();
        zip.file(displayFileName, blob);
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      saveAs(zipBlob, `${folderName || 'Berkas'}.zip`);

    } catch (err: any) {
      console.error(err);
      alert(`Gagal membuat ZIP: ${err.message}`);
    } finally {
      setIsZippingFolder(null);
    }
  };

  const handleDownloadAll = async () => {
    if (!confirm("Unduh semua file? (Folder akan diunduh sebagai file ZIP)")) return;

    for (const [folderName, filesInFolder] of Object.entries(groupedFiles)) {
      if (folderName) {
        // Jika ini folder, download sebagai zip (tanpa confirm tiap folder)
        await handleDownloadFolder(null, folderName, filesInFolder as any[], true);
      } else {
        // Jika file satuan (root), download normal satu per satu
        (filesInFolder as any[]).forEach(f => handleDownload(f));
      }
    }
  };

  const handlePreview = (file: any) => {
    setPreviewImage(file);
  };

  const totalSize = transfer?.files?.reduce((acc: number, file: any) => acc + file.size, 0) || 0;

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
      </div>
    );
  }

  if (error || !transfer) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
        <Card className="max-w-md w-full p-8 text-center rounded-[2.5rem] border-none shadow-2xl">
          <AlertTriangle className="w-16 h-16 text-rose-500 mx-auto mb-4" />
          <h2 className="text-2xl font-black text-slate-900 mb-2">Ops! Link Tidak Valid</h2>
          <p className="text-slate-500 font-medium mb-6">{error}</p>
        </Card>
      </div>
    );
  }

  return (
    <div 
      className="min-h-screen h-screen relative overflow-hidden"
      style={{ backgroundImage: 'url(/bg-filetransfer.jpeg)', backgroundSize: 'cover', backgroundPosition: 'center' }}
    >
      <GlowCursor
        color="#ecc7ff"
        secondaryColor="#ad6dff"
        trailLength={40}
        trailWidth={8}
        trailTaper={0.8}
        followSpeed={0.16}
        glowIntensity={1.9}
        glowSpread={1.2}
        hotspot={0.65}
        brightness={1.25}
        opacity={1}
        pulseSpeed={1.1}
        noiseStrength={0.035}
        idleFade={true}
        idleTimeout={700}
        fadeDuration={900}
        blendMode="screen"
        className="w-full h-full"
      >
      {/* Overlay to ensure readability */}
      <div className="absolute inset-0 bg-slate-900/60 z-0"></div>

      <div className="w-full h-full z-10 overflow-hidden relative flex flex-col justify-center p-4 md:p-8">
        <div 
          className={`flex-1 w-full h-full relative flex md:w-[150%] md:flex-row transition-transform ease-[cubic-bezier(0.22,1,0.36,1)] items-center ${
            !showFilesList ? 'md:translate-x-[16.666%]' : previewImage ? 'md:-translate-x-1/3' : 'md:translate-x-0'
          }`}
          style={{ transitionDuration: '1200ms' }}
        >
          {/* Panel 1: Info (Left) */}
          <div 
            className={`absolute inset-0 md:relative md:inset-auto w-full md:w-1/3 px-4 flex flex-col justify-center items-center text-center space-y-4 transition-all duration-700 ${
              showFilesList ? 'opacity-0 scale-95 pointer-events-none md:opacity-100 md:scale-100 md:pointer-events-auto' : 'opacity-100 scale-100 pointer-events-auto'
            } ${
              previewImage ? 'md:opacity-0 md:pointer-events-none' : 'md:opacity-100'
            }`}
            style={{ transitionDuration: '1200ms' }}
          >
            <div 
              className="w-full h-80 md:w-full md:h-[450px] mx-auto relative dark:mix-blend-screen flex items-center justify-center z-0"
              style={{ maskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, transparent 0%, black 15%, black 85%, transparent 100%)' }}
            >
              <ElectricLogo 
                src="/logo_cgi_transparent.png"
                color="#ecc7ff" 
                glowColor="#ad6dff" 
                scale={0.95} 
                interactive={true} 
              />
            </div>
            
            <div className="relative z-10 flex flex-col items-center space-y-2 md:space-y-3 -mt-12 md:-mt-20 w-full">
              <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-white leading-none drop-shadow-lg">
                CGI<br className="hidden md:block"/>Transfer.
              </h1>
            <div className="space-y-1">
              <h2 className="text-lg font-bold text-white drop-shadow-md">Anda menerima file dari {transfer.senderName}</h2>
              <p className="text-sm text-white/80 font-medium drop-shadow-md">{transfer.files.length} item • {formatFileSize(totalSize)}</p>
            </div>
            {transfer.message && (
              <div className="p-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 shadow-lg relative max-w-xs md:max-w-md w-full max-h-[120px] overflow-y-auto scrollbar-thin">
                <div className="absolute top-0 left-0 w-1 h-full bg-blue-400 rounded-l-2xl"></div>
                <p className="text-white italic text-sm">"{transfer.message}"</p>
              </div>
            )}
            
            {!showFilesList && (
              <button 
                onClick={() => setShowFilesList(true)}
                className="mt-4 md:mt-6 rounded-full bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 text-base font-bold shadow-[0_0_30px_rgba(37,99,235,0.6)] transition-all duration-500 hover:scale-105 hover:shadow-[0_0_50px_rgba(37,99,235,0.8)]"
              >
                Lihat File
              </button>
            )}
            </div>
          </div>

          {/* Panel 2: Files (Center) */}
          <div 
            className={`absolute inset-0 md:relative md:inset-auto flex flex-col justify-center items-center w-full md:w-1/3 px-4 max-h-[100vh] md:max-h-[85vh] transition-all ease-[cubic-bezier(0.22,1,0.36,1)] ${
              !showFilesList ? 'opacity-0 scale-75 pointer-events-none translate-x-12 md:translate-x-32 rotate-6 md:rotate-[12deg]' : 'opacity-100 scale-100 translate-x-0 rotate-0'
            }`}
            style={{ transitionDuration: '1200ms', height: '100%' }}
          >
            <Card 
              className="w-full rounded-[2.5rem] border border-white/60 dark:border-white/10 shadow-[0_40px_80px_-20px_rgba(0,0,0,0.15),_inset_0_2px_4px_rgba(255,255,255,0.9),_inset_0_-2px_4px_rgba(0,0,0,0.05)] dark:shadow-[0_40px_80px_-20px_rgba(0,0,0,0.6),_inset_0_2px_4px_rgba(255,255,255,0.1),_inset_0_-2px_4px_rgba(0,0,0,0.3)] overflow-hidden bg-white/90 backdrop-blur-xl dark:bg-slate-950/90 flex flex-col h-full isolate transform transition-transform duration-500 hover:-translate-y-1 hover:shadow-[0_50px_100px_-20px_rgba(0,0,0,0.2),_inset_0_2px_4px_rgba(255,255,255,1),_inset_0_-2px_4px_rgba(0,0,0,0.05)]"
              style={{ maskImage: 'radial-gradient(white, black)', WebkitMaskImage: '-webkit-radial-gradient(white, black)' }}
            >
              <div className="p-6 border-b border-slate-100/80 dark:border-slate-800/80 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/50 rounded-t-[2.5rem]">
                <div className="flex items-center gap-3">
                  <button 
                    onClick={() => {
                      setShowFilesList(false);
                      setPreviewImage(null);
                    }}
                    className="w-10 h-10 rounded-full flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-500 transition-colors shadow-sm"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6"/></svg>
                  </button>
                  <div>
                    <h3 className="font-black text-xl text-slate-900 dark:text-white uppercase tracking-tight">{transfer.subject}</h3>
                    <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mt-1">Siap Diunduh</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center bg-white dark:bg-slate-800 rounded-full p-1 shadow-sm border border-slate-200 dark:border-slate-700">
                    <button onClick={() => setViewMode('list')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'list' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                      <List className="w-4 h-4" />
                    </button>
                    <button onClick={() => setViewMode('grid')} className={`p-1.5 rounded-full transition-colors ${viewMode === 'grid' ? 'bg-slate-100 dark:bg-slate-700 text-blue-600' : 'text-slate-400 hover:text-slate-600'}`}>
                      <LayoutGrid className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                    <Download className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>
              
              <div className="p-4 overflow-y-auto flex-1 space-y-4">
                {Object.entries(groupedFiles).map(([folderName, filesInFolder]: [string, any], folderIdx: number) => (
                  <div key={folderIdx} className="space-y-2">
                    {folderName && (
                      <div 
                        className="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] group"
                        onClick={() => toggleFolder(folderName)}
                      >
                        <Folder className="w-4 h-4 text-blue-500 fill-blue-500/20" />
                        <span className="text-xs font-black text-slate-500 uppercase tracking-widest flex-1">{folderName}</span>
                        <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsedFolders[folderName] ? '-rotate-90' : 'rotate-0'}`} />
                        <Button 
                          size="icon" 
                          variant="ghost" 
                          className="w-8 h-8 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-blue-600 hover:bg-blue-50 ml-1"
                          onClick={(e) => handleDownloadFolder(e, folderName, filesInFolder)}
                          title="Unduh folder sebagai ZIP"
                          disabled={isZippingFolder === folderName}
                        >
                          {isZippingFolder === folderName ? <Loader2 className="w-4 h-4 animate-spin text-blue-600" /> : <Download className="w-4 h-4" />}
                        </Button>
                      </div>
                    )}
                    <div className={`${viewMode === 'grid' ? 'grid grid-cols-2 md:grid-cols-3 gap-3' : 'space-y-2'} overflow-hidden transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsedFolders[folderName] ? 'max-h-0 opacity-0' : 'max-h-[5000px] opacity-100 pb-1'}`}>
                      {filesInFolder.map((file: any, i: number) => {
                        const displayFileName = (file.path || file.name).split('/').pop();
                        const isImageOrDesign = (file.mimeType?.startsWith('image/') || file.mimeType === 'application/pdf' || file.mimeType?.startsWith('video/') || file.name?.toLowerCase().endsWith('.psd') || file.name?.toLowerCase().endsWith('.psb') || file.name?.toLowerCase().endsWith('.ai') || file.name?.toLowerCase().endsWith('.eps') || file.name?.toLowerCase().endsWith('.cdr'));

                        if (viewMode === 'grid') {
                          return (
                            <div 
                              key={i}
                              style={{ transitionDelay: collapsedFolders[folderName] ? '0ms' : `${i * 50}ms` }}
                              onClick={() => isImageOrDesign ? handlePreview(file) : handleDownload(file)}
                              className={`relative aspect-square rounded-2xl overflow-hidden group cursor-pointer border border-slate-200 dark:border-slate-800 shadow-sm transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${collapsedFolders[folderName] ? 'opacity-0 scale-50' : 'opacity-100 scale-100'}`}
                            >
                              {previewImage?.id === file.id && (
                                <div className="absolute inset-0 border-4 border-blue-500 rounded-2xl z-20 pointer-events-none"></div>
                              )}
                              {isImageOrDesign ? (
                                <img 
                                  src={file.thumbnailLink || `/api/thumbnail?id=${file.id}`} 
                                  alt={displayFileName}
                                  className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110 bg-white"
                                  onError={(e) => {
                                    (e.target as HTMLImageElement).src = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="%2394a3b8" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/></svg>';
                                    (e.target as HTMLImageElement).className = "w-full h-full object-cover p-8 bg-slate-50 dark:bg-slate-900 opacity-50";
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center p-4 group-hover:bg-slate-100 transition-colors">
                                  <File className="w-8 h-8 text-slate-400 mb-2 group-hover:text-blue-500 transition-colors" />
                                </div>
                              )}
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-3">
                                <p className="text-white text-xs font-bold truncate">{displayFileName}</p>
                                <p className="text-white/80 text-[10px] mt-0.5">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                          );
                        }

                        return (
                          <div 
                            key={i} 
                            style={{ transitionDelay: collapsedFolders[folderName] ? '0ms' : `${i * 120}ms` }}
                            className={`flex items-center justify-between p-4 rounded-2xl transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] border border-transparent hover:bg-white dark:hover:bg-slate-900 hover:border-slate-100 dark:hover:border-slate-800 hover:shadow-[0_8px_30px_rgb(0,0,0,0.08)] dark:hover:shadow-[0_8px_30px_rgb(0,0,0,0.3)] group ${previewImage?.id === file.id ? 'bg-white shadow-[0_8px_30px_rgb(0,0,0,0.08)] border-slate-200' : ''} ${collapsedFolders[folderName] ? 'opacity-0 translate-x-12 scale-95' : 'opacity-100 translate-x-0 scale-100'}`}
                          >
                            <div className="flex items-center gap-4 overflow-hidden">
                              <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center shrink-0">
                                <File className="w-5 h-5 text-slate-500" />
                              </div>
                              <div className="overflow-hidden">
                                <p className="font-bold text-sm text-slate-900 dark:text-white truncate" title={displayFileName}>{displayFileName}</p>
                                <p className="text-xs text-slate-500 font-medium mt-0.5">{formatFileSize(file.size)}</p>
                              </div>
                            </div>
                            <div className="flex gap-2 shrink-0">
                              {isImageOrDesign && (
                                <Button 
                                  size="icon" 
                                  variant="outline" 
                                  className={`rounded-xl h-10 w-10 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 ${previewImage?.id === file.id ? 'text-blue-600 border-blue-200 bg-blue-50' : ''}`}
                                  onClick={() => handlePreview(file)}
                                >
                                  <Eye className="w-4 h-4" />
                                </Button>
                              )}
                              <Button 
                                size="icon" 
                                variant="outline" 
                                className="rounded-xl h-10 w-10 text-slate-400 hover:text-blue-600 hover:border-blue-200 hover:bg-blue-50 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => handleDownload(file)}
                              >
                                <Download className="w-4 h-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>

              <div className="p-6 border-t border-slate-100/50 dark:border-slate-800/50 bg-transparent rounded-b-[2.5rem]">
                <Button 
                  className="w-full h-14 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-widest text-sm shadow-[0_10px_20px_-10px_rgba(37,99,235,0.5)]"
                  disabled={isDownloading || isZippingFolder !== null}
                  onClick={handleDownloadAll}
                >
                  Unduh Semua
                </Button>
                <p className="text-center text-xs text-slate-400 mt-4 font-medium">Link ini mungkin akan kadaluarsa sesuai kebijakan Admin.</p>
              </div>
            </Card>
          </div>

          {/* Panel 3: Preview (Right) */}
          <div className={`absolute inset-0 md:relative md:inset-auto flex flex-col justify-center items-center w-full md:w-1/3 px-4 h-full max-h-[100vh] md:max-h-[85vh] transition-all duration-700 ease-[cubic-bezier(0.22,1,0.36,1)] ${
            previewImage ? 'opacity-100 scale-100 pointer-events-auto translate-x-0' : 'opacity-0 scale-90 pointer-events-none translate-x-12 md:-translate-x-32'
          }`}>
            {previewImage && (
              <div className="w-full flex flex-col h-full bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-[2.5rem] p-4 relative overflow-hidden shadow-2xl">
                <div className="flex items-center justify-between mb-4 px-2">
                  <h3 className="font-bold text-white truncate pr-4 drop-shadow-md">{previewImage.name}</h3>
                  <Button size="sm" variant="ghost" className="rounded-full shrink-0 text-white hover:bg-white/20" onClick={() => setPreviewImage(null)}>
                    Tutup Preview
                  </Button>
                </div>
                <div className="flex-1 w-full bg-black/60 rounded-[1.5rem] overflow-hidden shadow-inner relative border border-white/5">
                  {(previewImage.name?.toLowerCase().endsWith('.psd') || previewImage.name?.toLowerCase().endsWith('.psb')) ? (
                    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-4 bg-transparent overflow-y-auto">
                      <img 
                        src={`https://drive.google.com/thumbnail?id=${previewImage.id}&sz=w2000`} 
                        alt="Thumbnail"
                        className="max-w-full h-auto rounded-lg shadow-lg"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                          const parent = (e.target as HTMLImageElement).parentElement;
                          if (parent) {
                            const div = document.createElement('div');
                            div.className = "flex flex-col items-center justify-center space-y-4 text-center mt-4 p-6";
                            div.innerHTML = `
                              <div class="w-16 h-16 rounded-full bg-white/10 flex items-center justify-center mb-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-white/60"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="12" y1="18" x2="12" y2="12"/><line x1="9" y1="15" x2="15" y2="15"/></svg>
                              </div>
                              <p class="text-white/80 font-medium max-w-xs drop-shadow">Pratinjau tidak tersedia. File berukuran terlalu besar untuk ditampilkan secara langsung.</p>
                            `;
                            const btn = document.createElement('button');
                            btn.className = "mt-4 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold text-sm transition-colors shadow-lg";
                            btn.innerText = "Unduh File Asli";
                            btn.onclick = () => window.open(`https://drive.google.com/uc?export=download&id=${previewImage.id}`, '_blank');
                            div.appendChild(btn);
                            parent.appendChild(div);
                          }
                        }}
                      />
                    </div>
                  ) : (
                    <iframe 
                      src={`https://drive.google.com/file/d/${previewImage.id}/preview`} 
                      title={previewImage.name}
                      className="absolute inset-0 w-full h-full border-0"
                      allow="autoplay"
                    />
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      </GlowCursor>
    </div>
  );
}
