'use client';

import { useEffect, useRef, useState } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { FileText } from 'lucide-react';

// Configure worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface PdfThumbnailProps {
  url: string;
}

export function PdfThumbnail({ url }: PdfThumbnailProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    let renderTask: any;
    let isMounted = true;
    let loadingTask: any;

    const renderPage = async () => {
      try {
        loadingTask = pdfjsLib.getDocument({ url });
        const pdf = await loadingTask.promise;
        const page = await pdf.getPage(1);
        
        if (!isMounted) return;

        const viewport = page.getViewport({ scale: 0.5 }); // Thumbnail scale
        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        canvas.height = viewport.height;
        canvas.width = viewport.width;

        const renderContext = {
          canvasContext: context,
          viewport: viewport
        };
        renderTask = page.render(renderContext);
        await renderTask.promise;
        if (isMounted) setLoaded(true);
      } catch (err: any) {
        if (err?.name === 'RenderingCancelledException' || err?.message?.includes('aborted')) {
          return; // Ignore intentional cancellation
        }
        console.error("Error rendering PDF thumbnail", err);
        if (isMounted) setError(true);
      }
    };

    renderPage();

    return () => {
      isMounted = false;
      if (renderTask) {
        try { renderTask.cancel(); } catch (e) {}
      }
      if (loadingTask) {
        try { loadingTask.destroy(); } catch (e) {}
      }
    };
  }, [url]);

  if (error) {
    return <FileText className="h-6 w-6 text-blue-500 shrink-0" />;
  }

  return (
    <div className="h-10 w-10 rounded-md overflow-hidden bg-white flex items-center justify-center shrink-0 border border-slate-200 dark:border-slate-700 relative">
      <canvas 
        ref={canvasRef} 
        className={`w-full h-full object-cover transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`} 
      />
      {!loaded && <FileText className="h-4 w-4 text-slate-300 absolute" />}
    </div>
  );
}
