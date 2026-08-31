'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Cloud, Factory, Zap, Leaf, CheckCircle2, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { Button } from '../ui/button';

const ISO_TIPS = [
  {
    title: 'Akurasi Scope 1 (Emisi Langsung)',
    content: 'Pastikan seluruh sumber emisi langsung dari operasional pabrik, seperti pembakaran bahan bakar genset, boiler, dan kendaraan operasional (forklift/truk), tercatat dengan presisi dan didukung bukti yang valid.',
    icon: Factory,
    color: 'text-rose-500',
    bg: 'bg-rose-50 dark:bg-rose-950/30'
  },
  {
    title: 'Pemantauan Scope 2 (Emisi Tidak Langsung)',
    content: 'Pantau tagihan dan konsumsi listrik secara berkala. Penggunaan energi efisien tidak hanya menekan biaya operasional, namun juga menurunkan jejak karbon (carbon footprint) dari emisi Scope 2.',
    icon: Zap,
    color: 'text-amber-500',
    bg: 'bg-amber-50 dark:bg-amber-950/30'
  },
  {
    title: 'Verifikasi & Ketertelusuran Data',
    content: 'Dokumen pendukung seperti log book, struk pembelian bahan bakar, dan rekening listrik adalah bukti esensial untuk audit ISO 14064-1. Jaga arsip data tersebut agar mudah ditelusuri oleh auditor.',
    icon: CheckCircle2,
    color: 'text-blue-500',
    bg: 'bg-blue-50 dark:bg-blue-950/30'
  },
  {
    title: 'Pengurangan Gas Rumah Kaca (GRK)',
    content: 'Identifikasi peluang dekarbonisasi seperti beralih ke lampu LED, optimalisasi rute kendaraan, atau perbaikan kebocoran refrigeran (AC/Chiller) sebagai bagian dari target komitmen lingkungan.',
    icon: Cloud,
    color: 'text-indigo-500',
    bg: 'bg-indigo-50 dark:bg-indigo-950/30'
  },
  {
    title: 'Budaya Sadar Lingkungan',
    content: 'Kepatuhan ISO 14064 bukan hanya tanggung jawab tim HSE. Budayakan hemat energi, seperti mematikan komputer dan AC saat tidak digunakan, untuk berkontribusi secara nyata.',
    icon: Leaf,
    color: 'text-emerald-500',
    bg: 'bg-emerald-50 dark:bg-emerald-950/30'
  }
];

export default function Iso14064Tip() {
  const [tipIndex, setTipIndex] = useState<number>(0);
  const [mounted, setMounted] = useState(false);
  const [refreshCount, setRefreshCount] = useState<number>(0);

  useEffect(() => {
    // Check localStorage for today's refresh count
    const today = new Date().toLocaleDateString('en-CA');
    const storedDate = localStorage.getItem('iso_tip_date');
    const storedCount = localStorage.getItem('iso_tip_count');

    if (storedDate === today && storedCount) {
      setRefreshCount(parseInt(storedCount, 10));
    } else {
      localStorage.setItem('iso_tip_date', today);
      localStorage.setItem('iso_tip_count', '0');
    }

    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    // Add refreshCount to shift the tip index
    setTipIndex((daysSinceEpoch + (storedDate === today && storedCount ? parseInt(storedCount, 10) : 0)) % ISO_TIPS.length);
    setMounted(true);
  }, []);

  const handleRefresh = () => {
    const newCount = refreshCount + 1;
    setRefreshCount(newCount);
    
    const today = new Date().toLocaleDateString('en-CA');
    localStorage.setItem('iso_tip_date', today);
    localStorage.setItem('iso_tip_count', newCount.toString());
    
    const daysSinceEpoch = Math.floor(Date.now() / 86400000);
    setTipIndex((daysSinceEpoch + newCount) % ISO_TIPS.length);
  };

  if (!mounted) return null;

  const tip = ISO_TIPS[tipIndex];
  const Icon = tip.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <Card className={cn("overflow-hidden border-none shadow-lg relative rounded-[2rem]", tip.bg)}>
        {/* Background glow */}
        <div className={cn(
          "absolute -right-6 -top-6 w-24 h-24 rounded-full blur-2xl opacity-20", 
          tip.color.replace('text-', 'bg-')
        )} />
        
        <CardContent className="p-5 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-5 items-start sm:items-center">
          <div className="flex gap-4 sm:gap-5 flex-1">
            <div className="shrink-0 pt-1">
              <div className={cn(
                "w-10 h-10 sm:w-12 sm:h-12 rounded-2xl flex items-center justify-center bg-white dark:bg-slate-900 shadow-sm",
                tip.color
              )}>
                <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
              </div>
            </div>
            <div className="space-y-1.5 flex-1 relative z-10 text-left">
              <div className="flex items-center gap-2 text-left">
                <span className={cn(
                  "text-[9px] sm:text-[10px] font-black uppercase tracking-widest text-left",
                  tip.color
                )}>
                  Pojok ISO 14064 & Keberlanjutan
                </span>
              </div>
              <AnimatePresence mode="wait">
                <motion.div
                  key={tipIndex}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 10 }}
                  transition={{ duration: 0.3 }}
                >
                  <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white leading-tight text-left">
                    {tip.title}
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed font-medium text-left mt-1">
                    {tip.content}
                  </p>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
          
          {/* Refresh Button */}
          <div className="shrink-0 self-end sm:self-center">
            <Button
              variant="outline"
              size="sm"
              onClick={handleRefresh}
              className={cn(
                "h-8 px-3 rounded-xl border-none shadow-sm font-black uppercase text-[9px] tracking-wider transition-all",
                tip.color.replace('text-', 'bg-').replace('500', '100'),
                tip.color,
                "hover:scale-105 active:scale-95"
              )}
            >
              <RefreshCw className="w-3 h-3 mr-1.5" />
              Next Tip
            </Button>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
