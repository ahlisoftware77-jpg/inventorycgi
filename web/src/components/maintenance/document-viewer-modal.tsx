'use client';

/**
 * @fileOverview Modal dialog pratinjau dokumen inline.
 * Untuk PDF Cloudinary: Menggunakan transformasi halaman Cloudinary (pg_N, f_jpg).
 * Fitur: zoom in/out dengan tombol & scroll mouse, navigasi halaman, unduh halaman aktif.
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { FileText, Download, Loader2, AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';

interface DocumentViewerModalProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  url: string;
}

function getCloudinaryPageUrl(pdfUrl: string, pageNumber: number): string {
  const uploadMarker = '/upload/';
  const idx = pdfUrl.indexOf(uploadMarker);
  if (idx === -1) return pdfUrl;
  const base = pdfUrl.substring(0, idx + uploadMarker.length);
  const rest = pdfUrl.substring(idx + uploadMarker.length);
  return `${base}pg_${pageNumber},f_jpg,q_90/${rest}`;
}

const ZOOM_STEP = 0.2;
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 3.0;

interface CloudinaryPdfViewerProps {
  url: string;
  onPageChange?: (page: number, total: number) => void;
}

function CloudinaryPdfViewer({ url, onPageChange }: CloudinaryPdfViewerProps) {
  const [pages, setPages] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [zoom, setZoom] = useState(1.0);
  const viewportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setIsLoading(true);
    setPages([]);
    setCurrentPage(1);
    setZoom(1.0);

    async function discoverPages() {
      const found: string[] = [];
      let pageNum = 1;
      const MAX_PAGES = 50;
      while (pageNum <= MAX_PAGES) {
        const pageUrl = getCloudinaryPageUrl(url, pageNum);
        const ok = await new Promise<boolean>((resolve) => {
          const img = new Image();
          img.onload = () => resolve(true);
          img.onerror = () => resolve(false);
          img.src = pageUrl;
        });
        if (!ok) break;
        found.push(pageUrl);
        pageNum++;
      }
      setPages(found);
      setIsLoading(false);
      onPageChange?.(1, found.length);
    }

    discoverPages();
  }, [url]);

  const changePage = (newPage: number) => {
    setCurrentPage(newPage);
    onPageChange?.(newPage, pages.length);
  };

  const zoomIn = () => setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(1))));
  const zoomOut = () => setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(1))));
  const zoomReset = () => setZoom(1.0);

  // Scroll to zoom
  const handleWheel = useCallback((e: WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
      e.preventDefault();
      if (e.deltaY < 0) {
        setZoom((z) => Math.min(ZOOM_MAX, parseFloat((z + ZOOM_STEP).toFixed(1))));
      } else {
        setZoom((z) => Math.max(ZOOM_MIN, parseFloat((z - ZOOM_STEP).toFixed(1))));
      }
    }
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    el.addEventListener('wheel', handleWheel, { passive: false });
    return () => el.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[50vh] gap-4">
        <Loader2 className="w-10 h-10 animate-spin text-emerald-600" />
        <p className="text-xs font-black uppercase tracking-widest text-slate-500">
          Memuat halaman PDF...
        </p>
      </div>
    );
  }

  if (pages.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[50vh] gap-4 text-center px-8">
        <AlertCircle className="w-10 h-10 text-amber-500" />
        <p className="text-sm font-bold text-slate-600">
          Tidak dapat memuat pratinjau PDF.
        </p>
      </div>
    );
  }

  // Tinggi toolbar yang pasti (px) — digunakan untuk calc() viewport
  const TOOLBAR_H = 40;

  return (
    <div style={{ display: 'flex', width: '100%', height: '100%' }}>
      {/* Thumbnail strip kiri */}
      {pages.length > 1 && (
        <div
          style={{
            width: '72px',
            flexShrink: 0,
            overflowY: 'auto',
            borderRight: '1px solid #e2e8f0',
            background: '#f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '8px',
          }}
        >
          {pages.map((pageUrl, i) => (
            <button
              key={i}
              onClick={() => changePage(i + 1)}
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '3/4',
                borderRadius: '8px',
                overflow: 'hidden',
                border: currentPage === i + 1 ? '2px solid #10b981' : '2px solid #cbd5e1',
                opacity: currentPage === i + 1 ? 1 : 0.65,
                transition: 'all 0.15s',
                flexShrink: 0,
              }}
            >
              <img src={pageUrl} alt={`hal. ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, background: 'rgba(0,0,0,0.6)', color: '#fff', fontSize: '8px', fontWeight: 700, textAlign: 'center', padding: '1px 0' }}>
                {i + 1}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Area utama — tinggi eksplisit 100% */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0, height: '100%' }}>
        {/* Toolbar navigasi + zoom */}
        <div
          style={{
            flexShrink: 0,
            height: `${TOOLBAR_H}px`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            background: 'rgba(255,255,255,0.95)',
            borderBottom: '1px solid #f1f5f9',
            gap: '8px',
          }}
        >
          {/* Navigasi halaman */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button variant="ghost" size="sm" onClick={() => changePage(Math.max(1, currentPage - 1))} disabled={currentPage <= 1} className="rounded-lg h-7 w-7 p-0">
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <span style={{ fontSize: '11px', fontWeight: 900, color: '#475569', minWidth: '52px', textAlign: 'center', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              {currentPage}/{pages.length}
            </span>
            <Button variant="ghost" size="sm" onClick={() => changePage(Math.min(pages.length, currentPage + 1))} disabled={currentPage >= pages.length} className="rounded-lg h-7 w-7 p-0">
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>

          {/* Kontrol zoom */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <Button variant="ghost" size="sm" onClick={zoomOut} disabled={zoom <= ZOOM_MIN} className="rounded-lg h-7 w-7 p-0 text-slate-600" title="Zoom Out (Ctrl+Scroll)">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <button onClick={zoomReset} style={{ fontSize: '11px', fontWeight: 900, color: '#475569', minWidth: '46px', textAlign: 'center' }} title="Reset zoom">
              {Math.round(zoom * 100)}%
            </button>
            <Button variant="ghost" size="sm" onClick={zoomIn} disabled={zoom >= ZOOM_MAX} className="rounded-lg h-7 w-7 p-0 text-slate-600" title="Zoom In (Ctrl+Scroll)">
              <ZoomIn className="w-4 h-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={zoomReset} className="rounded-lg h-7 w-7 p-0 text-slate-500" title="Reset zoom">
              <Maximize2 className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>

        {/* ===== SCROLL CONTAINER — tinggi eksplisit = 100% parent − toolbar ===== */}
        <div
          ref={viewportRef}
          style={{
            height: `calc(100% - ${TOOLBAR_H}px)`,
            overflow: 'auto',
            background: '#f1f5f9',
            cursor: zoom > 1 ? 'grab' : 'default',
          }}
        >
          {/* Inner wrapper melebar sesuai zoom → memaksa overflow horizontal & vertikal */}
          <div
            style={{
              minWidth: `${zoom * 100}%`,
              padding: '16px',
              boxSizing: 'border-box',
            }}
          >
            <img
              key={currentPage}
              src={pages[currentPage - 1]}
              alt={`Halaman ${currentPage}`}
              draggable={false}
              style={{
                display: 'block',
                width: '100%',
                height: 'auto',
                borderRadius: '12px',
                boxShadow: '0 4px 24px rgba(0,0,0,0.12)',
                border: '1px solid #e2e8f0',
                background: '#fff',
                userSelect: 'none',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export function DocumentViewerModal({ isOpen, onOpenChange, title, url }: DocumentViewerModalProps) {
  if (!url) return null;

  const isCloudinaryPdf =
    url.toLowerCase().includes('/image/upload/') && url.toLowerCase().includes('.pdf');

  const isPdfRaw =
    !isCloudinaryPdf &&
    (url.toLowerCase().includes('.pdf') ||
      url.toLowerCase().includes('/raw/') ||
      url.toLowerCase().includes('/files/'));

  const isImage =
    !isCloudinaryPdf &&
    !isPdfRaw &&
    (url.toLowerCase().includes('/image/upload/') ||
      !!url.match(/\.(jpg|jpeg|png|webp|gif)$/i));

  const [activePage, setActivePage] = useState(1);

  useEffect(() => {
    if (isOpen) setActivePage(1);
  }, [isOpen, url]);

  const handleDownloadPage = async () => {
    try {
      if (isCloudinaryPdf) {
        const pageUrl = getCloudinaryPageUrl(url, activePage);
        const res = await fetch(pageUrl);
        if (!res.ok) throw new Error('fetch gagal');
        const blob = await res.blob();
        const blobUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = blobUrl;
        a.download = `${title || 'dokumen'}-halaman${activePage}.jpg`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(blobUrl);
        return;
      }
      window.open(url, '_blank');
    } catch {
      window.open(url, '_blank');
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent hideCloseButton className="sm:max-w-5xl w-[95vw] max-h-[95vh] rounded-[2rem] p-5 border-none shadow-2xl bg-white dark:bg-slate-950 text-black dark:text-white overflow-hidden flex flex-col gap-0">
        {/* Header */}
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800 shrink-0">
          <div className="text-left min-w-0 mr-3">
            <DialogTitle className="text-base font-black uppercase tracking-tight flex items-center gap-2 truncate">
              <FileText className="w-4 h-4 text-emerald-600 shrink-0" />
              <span className="truncate">{title}</span>
            </DialogTitle>
            <DialogDescription className="text-[11px] font-medium text-slate-500">
              Pratinjau · Gunakan Ctrl+Scroll untuk zoom
            </DialogDescription>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleDownloadPage}
            className="rounded-xl text-xs font-bold gap-1 border-slate-200 dark:border-slate-800 shrink-0"
          >
            <Download className="w-3.5 h-3.5" />
            {isCloudinaryPdf ? `Unduh Hal. ${activePage}` : 'Unduh'}
          </Button>
        </DialogHeader>

        {/* Viewport dokumen — tinggi eksplisit agar scroll container bekerja */}
        <div
          className="rounded-2xl border border-slate-200 dark:border-slate-800 mt-3 overflow-hidden"
          style={{ height: 'calc(95vh - 120px)', background: '#f8fafc' }}
        >
          {isCloudinaryPdf ? (
            <CloudinaryPdfViewer
              key={isOpen ? url : ''}
              url={url}
              onPageChange={(page) => setActivePage(page)}
            />
          ) : isImage ? (
            <div className="flex items-center justify-center p-4 w-full overflow-auto">
              <img
                src={url}
                alt={title}
                className="max-h-[80vh] w-auto object-contain rounded-xl shadow-md border border-slate-200 dark:border-slate-800"
              />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center my-auto gap-4 text-center p-10 w-full">
              <AlertCircle className="w-10 h-10 text-amber-500" />
              <p className="text-sm font-bold text-slate-600">
                Dokumen tidak dapat dipratinjau secara langsung.
              </p>
              <Button onClick={() => window.open(url, '_blank')} className="rounded-xl font-bold gap-2">
                <Download className="w-4 h-4" /> Unduh Dokumen
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
