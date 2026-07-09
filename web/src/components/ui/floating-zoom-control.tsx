
'use client';

import React, { useEffect, useState } from 'react';
import { useFontSize } from '@/components/providers/font-size-provider';
import { Button } from './button';
import { Minus, Plus, RotateCcw, Maximize2, Minimize2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * @fileOverview Komponen kontrol zoom melayang di pojok kanan bawah.
 * Memungkinkan user mengubah skala font (REM) secara global.
 * Ditambahkan fitur minimize untuk menghemat ruang layar.
 * Status minimized kini tersimpan di localStorage agar tetap persisten setelah refresh.
 */
export default function FloatingZoomControl() {
  const { fontScale, setFontScale } = useFontSize();
  const [mounted, setMounted] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);

  // Load status minimized dari localStorage saat mount
  useEffect(() => {
    const savedMinimized = localStorage.getItem('app-zoom-minimized');
    if (savedMinimized === 'true') {
      setIsMinimized(true);
    }
    setMounted(true);
  }, []);

  const handleToggleMinimize = (min: boolean) => {
    setIsMinimized(min);
    localStorage.setItem('app-zoom-minimized', String(min));
  };

  if (!mounted) return null;

  const handleZoomIn = () => {
    setFontScale(Math.min(fontScale + 0.05, 1.5));
  };

  const handleZoomOut = () => {
    setFontScale(Math.max(fontScale - 0.05, 0.8));
  };

  const handleReset = () => {
    setFontScale(1);
  };

  return (
    <div className="fixed bottom-8 right-24 z-[100] flex items-center print:hidden">
      <motion.div 
        layout
        className={cn(
          "flex items-center gap-1 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl transition-all duration-500 hover:shadow-primary/10",
          isMinimized ? "rounded-full w-12 h-12 justify-center" : "rounded-2xl"
        )}
      >
        <AnimatePresence mode="wait">
          {isMinimized ? (
            <motion.button
              key="minimized"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={() => handleToggleMinimize(false)}
              className="flex flex-col items-center justify-center w-full h-full text-primary"
              title="Buka Kontrol Zoom"
            >
              <p className="text-[9px] font-black leading-none">{Math.round(fontScale * 100)}%</p>
              <Maximize2 className="h-3 w-3 mt-0.5" />
            </motion.button>
          ) : (
            <motion.div
              key="expanded"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
              className="flex items-center gap-1"
            >
              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomOut}
                disabled={fontScale <= 0.8}
                className="h-9 w-9 rounded-xl hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-900/20 text-slate-500 transition-colors"
                title="Perkecil Tampilan"
              >
                <Minus className="h-4 w-4" />
              </Button>
              
              <button 
                onClick={handleReset}
                className="px-3 py-1 min-w-[70px] flex flex-col items-center justify-center hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all group"
                title="Klik untuk Reset ke 100%"
              >
                <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase leading-none tracking-tighter">
                    {Math.round(fontScale * 100)}%
                </p>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity mt-0.5">
                    <RotateCcw className="h-2 w-2 text-primary" />
                    <span className="text-[7px] font-black text-primary uppercase tracking-tighter">Reset</span>
                </div>
              </button>

              <Button
                variant="ghost"
                size="icon"
                onClick={handleZoomIn}
                disabled={fontScale >= 1.5}
                className="h-9 w-9 rounded-xl hover:bg-emerald-50 hover:text-emerald-600 dark:hover:bg-emerald-900/20 text-slate-500 transition-colors"
                title="Perbesar Tampilan"
              >
                <Plus className="h-4 w-4" />
              </Button>

              <div className="h-6 w-px bg-slate-200 dark:bg-slate-700 mx-1" />

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleToggleMinimize(true)}
                className="h-9 w-9 rounded-xl hover:bg-slate-100 text-slate-400"
                title="Sembunyikan"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  );
}
